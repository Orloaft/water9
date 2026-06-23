import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, extname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = String(args.get('id') ?? args.get('candidate') ?? '').trim();
const apply = args.has('apply');
const dryRun = args.has('dry-run') || args.has('dryRun') || !apply;
const overwrite = args.has('overwrite');
const mockImage = args.get('mock-image') ?? args.get('mockImage');
const model = String(args.get('model') ?? 'gpt-image-2');
const size = String(args.get('size') ?? '1536x1024');
const quality = String(args.get('quality') ?? 'medium');
const outputFormat = String(args.get('output-format') ?? args.get('outputFormat') ?? 'png');
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const inboxDir = resolve(String(args.get('inbox-dir') ?? args.get('inboxDir') ?? 'tools/source-inbox'));
const reportPath = resolve(String(args.get('report') ?? 'tools/scratch/source-openai-generation-report.json'));

function usage() {
  console.error('Usage: node tools/generate_source_image_openai.mjs --id <candidate-id> [--apply] [--model gpt-image-2]');
  console.error('Dry-run is default. Use --apply to call the API and write tools/source-inbox/<id>.png.');
  console.error('Use --mock-image <path> --apply for deterministic local smoke tests without network.');
}

if (!id) {
  usage();
  process.exit(1);
}

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fileExists(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? info : null;
  } catch {
    return null;
  }
}

function validateSourceImage(candidateId, path) {
  const result = spawnSync('python3', [
    'tools/validate_source_candidate_images.py',
    '--id',
    candidateId,
    '--image',
    path,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const output = result.stdout || result.stderr || '';
  let parsed = null;
  try {
    parsed = JSON.parse(output);
  } catch {
    parsed = null;
  }
  const failures = Array.isArray(parsed?.failures) ? [...parsed.failures] : [];
  if (result.status !== 0 && failures.length === 0) {
    failures.push(`${candidateId}: source image validation failed without JSON output${output ? `: ${output.trim()}` : ''}`);
  }
  return {
    checked: true,
    metrics: parsed?.metrics?.[0] ?? null,
    failures,
  };
}

async function writeReport(report) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function promptFor(candidate, queueItem) {
  return String(queueItem?.prompt ?? candidate?.prompt ?? '').trim();
}

async function generateImage(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for direct OpenAI source generation');
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      output_format: outputFormat,
      n: 1,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`OpenAI image generation failed ${response.status}: ${JSON.stringify(body)}`);
  }
  const image = body?.data?.[0];
  const b64 = image?.b64_json;
  if (!b64) throw new Error('OpenAI image generation response did not contain data[0].b64_json');
  return Buffer.from(b64, 'base64');
}

const manifest = await readJson(manifestPath);
if (manifest?.schema !== 'water9/source-candidates@1') throw new Error(`Unexpected source candidate schema ${manifest?.schema ?? 'missing'}`);
const queue = await readJson(queuePath, { schema: null, candidates: [] });
const candidate = (manifest.candidates ?? []).find((entry) => entry.id === id);
if (!candidate) throw new Error(`No source candidate found with id ${id}`);
const queueItem = (queue.candidates ?? []).find((entry) => entry.id === id);
const prompt = promptFor(candidate, queueItem);
if (prompt.length < 120) throw new Error(`${id}: prompt is missing or too short for source generation`);

const target = resolve(inboxDir, `${id}.${outputFormat}`);
const existing = await fileExists(target);
const failures = [];
if (existing && !overwrite) failures.push(`${asRepoRelative(target)} already exists; pass --overwrite only intentionally`);

const baseReport = {
  schema: 'water9/source-openai-generation@1',
  id,
  species: candidate.species,
  dryRun,
  apply,
  mock: Boolean(mockImage),
  model,
  size,
  quality,
  outputFormat,
  promptLength: prompt.length,
  target: asRepoRelative(target),
  openaiApiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
  queued: Boolean(queueItem),
  command: `npm run source:generate-openai -- --id ${id} --apply`,
  next: [
    `npm run source:inbox-check -- --dir ${asRepoRelative(inboxDir)} --strict --ids ${id}`,
    `npm run source:ingest-batch -- --dir ${asRepoRelative(inboxDir)} --strict --ids ${id} --dry-run`,
    `npm run source:ingest-batch -- --dir ${asRepoRelative(inboxDir)} --strict --ids ${id}`,
    `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
  ],
};

if (failures.length) {
  const report = { ...baseReport, status: 'blocked', copied: false, imageCheck: null, failures };
  await writeReport(report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

if (dryRun) {
  const report = {
    ...baseReport,
    status: 'dry-run',
    copied: false,
    imageCheck: null,
    failures: [],
    requestPreview: {
      url: 'https://api.openai.com/v1/images/generations',
      body: { model, size, quality, output_format: outputFormat, n: 1, prompt },
    },
  };
  await writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

await mkdir(inboxDir, { recursive: true });
let sourcePath = null;
if (mockImage) {
  sourcePath = resolve(String(mockImage));
  const info = await fileExists(sourcePath);
  if (!info || info.size < 512) throw new Error(`mock image ${sourcePath} is missing or too small`);
  const extension = extname(sourcePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) throw new Error(`mock image ${sourcePath} is not a supported image type`);
  await copyFile(sourcePath, target);
} else {
  const buffer = await generateImage(prompt);
  await writeFile(target, buffer);
}

const targetInfo = await stat(target);
const imageCheck = validateSourceImage(id, target);
const report = {
  ...baseReport,
  status: imageCheck.failures.length ? 'generated-invalid' : 'generated',
  copied: true,
  sourcePath: sourcePath ? asRepoRelative(sourcePath) : null,
  bytes: targetInfo.size,
  imageCheck,
  failures: imageCheck.failures,
};
await writeReport(report);

if (report.failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
