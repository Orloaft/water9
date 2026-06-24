import { createReadStream } from 'node:fs';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  if (args.has(key)) {
    const existing = args.get(key);
    args.set(key, Array.isArray(existing) ? [...existing, value] : [existing, value]);
  } else {
    args.set(key, value);
  }
}

function valuesFor(key) {
  const value = args.get(key);
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const sessionsDir = resolve(String(args.get('sessions-dir') ?? args.get('sessionsDir') ?? `${homedir()}/.codex/sessions`));
const target = resolve(String(args.get('target') ?? 'tools/source-inbox/recovered-imagegen.png'));
const reportPath = resolve(String(args.get('report') ?? 'tools/scratch/codex-imagegen-recovery-report.json'));
const explicitId = String(args.get('id') ?? '').trim();
const dryRun = args.has('dry-run') || args.has('dryRun');
const minBytes = Number(args.get('min-bytes') ?? args.get('minBytes') ?? 4096);
const queryTerms = valuesFor('query')
  .flatMap((value) => String(value).split(','))
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

async function walkJsonl(dir) {
  const files = [];
  async function walk(path) {
    let entries = [];
    try {
      entries = await readdir(path, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile() && extname(entry.name).toLowerCase() === '.jsonl') {
        const info = await stat(child);
        files.push({ path: child, mtimeMs: info.mtimeMs });
      }
    }
  }
  await walk(dir);
  return files.sort((left, right) => right.mtimeMs - left.mtimeMs);
}

function extractPayload(entry) {
  const payload = entry?.payload;
  if (!payload || payload.type !== 'image_generation_call' || typeof payload.result !== 'string') return null;
  const prompt = String(payload.revised_prompt ?? payload.prompt ?? '');
  const haystack = `${payload.id ?? ''}\n${prompt}`.toLowerCase();
  const score = queryTerms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
  if (explicitId && payload.id !== explicitId) return null;
  if (!explicitId && queryTerms.length && score === 0) return null;
  return {
    id: payload.id ?? null,
    status: payload.status ?? null,
    revisedPrompt: payload.revised_prompt ?? null,
    result: payload.result,
    score,
  };
}

function decodeImage(result) {
  const compact = result.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) throw new Error('image_generation_call.result is not valid base64 text');
  const buffer = Buffer.from(compact, 'base64');
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!isPng) throw new Error('decoded image_generation_call.result is not a PNG');
  if (buffer.length < minBytes) throw new Error(`decoded image is ${buffer.length} bytes, below --min-bytes ${minBytes}`);
  return buffer;
}

async function writeReport(report) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

const files = await walkJsonl(sessionsDir);
const candidates = [];
for (const file of files) {
  let lineIndex = 0;
  const lines = createInterface({
    input: createReadStream(file.path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const rawLine of lines) {
    lineIndex += 1;
    const line = rawLine.trim();
    if (!line.includes('image_generation_call') || !line.includes('"result"')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = extractPayload(entry);
    if (!payload) continue;
    candidates.push({
      ...payload,
      timestamp: entry.timestamp ?? null,
      session: file.path,
      line: lineIndex,
    });
  }
}

candidates.sort((left, right) => (
  right.score - left.score
  || String(right.timestamp ?? '').localeCompare(String(left.timestamp ?? ''))
  || right.session.localeCompare(left.session)
  || right.line - left.line
));

if (!candidates.length) {
  const report = {
    found: false,
    sessionsDir,
    explicitId: explicitId || null,
    queryTerms,
    scannedFiles: files.length,
    failures: ['no matching Codex image_generation_call result found'],
  };
  await writeReport(report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

const selected = candidates[0];
let buffer;
try {
  buffer = decodeImage(selected.result);
} catch (error) {
  const report = {
    found: false,
    selected: {
      id: selected.id,
      session: selected.session,
      line: selected.line,
      timestamp: selected.timestamp,
    },
    failures: [error.message],
  };
  await writeReport(report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

if (!dryRun) {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
}

const report = {
  found: true,
  dryRun,
  target: asRepoRelative(target),
  bytes: buffer.length,
  selected: {
    id: selected.id,
    status: selected.status,
    score: selected.score,
    timestamp: selected.timestamp,
    session: selected.session,
    line: selected.line,
  },
  candidates: candidates.slice(0, 8).map((candidate) => ({
    id: candidate.id,
    score: candidate.score,
    timestamp: candidate.timestamp,
    session: candidate.session,
    line: candidate.line,
  })),
};

await writeReport(report);
console.log(JSON.stringify(report, null, 2));
