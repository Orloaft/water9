import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const runbookPath = resolve(String(args.get('runbook') ?? 'public/review/source-candidates/source-acquisition-runbook.json'));
const reportPath = resolve(String(args.get('report') ?? 'tools/scratch/source-openai-batch-report.json'));
const inboxDir = String(args.get('inbox-dir') ?? args.get('inboxDir') ?? 'tools/source-inbox');
const apply = args.has('apply');
const dryRun = args.has('dry-run') || args.has('dryRun') || !apply;
const overwrite = args.has('overwrite');
const mockImage = args.get('mock-image') ?? args.get('mockImage');
const explicitIds = String(args.get('ids') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

async function writeReport(report) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function runOne(id, index) {
  const childReport = resolve(`tools/scratch/source-openai-generation-${id}.json`);
  const commandArgs = [
    'tools/generate_source_image_openai.mjs',
    '--id', id,
    '--inbox-dir', inboxDir,
    '--report', childReport,
  ];
  if (apply) commandArgs.push('--apply');
  if (overwrite) commandArgs.push('--overwrite');
  if (mockImage) commandArgs.push('--mock-image', String(mockImage));
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  let payload = null;
  try {
    payload = JSON.parse(result.stdout || result.stderr || '{}');
  } catch {
    payload = null;
  }
  return {
    rank: index + 1,
    id,
    status: result.status,
    ok: result.status === 0,
    command: `node ${commandArgs.join(' ')}`,
    report: asRepoRelative(childReport),
    payload,
    stderr: result.status === 0 ? null : result.stderr,
  };
}

const runbook = await readJson(runbookPath);
if (runbook.schema !== 'water9/source-acquisition-runbook@1') {
  throw new Error(`Unexpected source acquisition runbook schema ${runbook.schema ?? 'missing'}`);
}
const ids = explicitIds.length ? explicitIds : runbook.ids ?? [];
if (!ids.length) throw new Error('No ids supplied and acquisition runbook has no ids');
const missingIds = ids.filter((id) => !(runbook.ids ?? []).includes(id));
if (missingIds.length) throw new Error(`Requested ids are not in the acquisition runbook: ${missingIds.join(', ')}`);

const results = ids.map(runOne);
const failures = results
  .filter((item) => !item.ok)
  .flatMap((item) => item.payload?.failures?.length ? item.payload.failures : [`${item.id}: generation command failed`]);
const report = {
  schema: 'water9/source-openai-batch-generation@1',
  generatedAt: new Date().toISOString(),
  runbook: asRepoRelative(runbookPath),
  dryRun,
  apply,
  mock: Boolean(mockImage),
  inboxDir,
  ids,
  openaiApiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
  readyToApply: dryRun && results.every((item) => item.ok),
  generated: apply ? results.filter((item) => item.ok && item.payload?.status === 'generated').length : 0,
  results,
  failures,
  next: failures.length
    ? ['fix generation failures before inbox validation']
    : [
      `npm run source:inbox-check -- --dir ${inboxDir} --strict --ids ${ids.join(',')}`,
      `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${ids.join(',')} --dry-run`,
      `npm run source:ingest-batch -- --dir ${inboxDir} --strict --ids ${ids.join(',')}`,
      'npm run source:preview-check',
      'npm run source:review-dossier',
    ],
};
await writeReport(report);

if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
