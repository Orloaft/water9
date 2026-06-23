import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = String(args.get('id') ?? '').trim();
const validateAll = args.has('all');
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const packDir = resolve(String(args.get('dir') ?? 'public/review/source-candidates/focus-packs'));

async function readJson(path, failures, label = path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readText(path, failures, label = path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${label}: could not read file: ${error.message}`);
    return '';
  }
}

async function fileOk(path, minSize = 128) {
  try {
    const info = await stat(resolve(path));
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function expectEqual(label, actual, expected, failures) {
  if (stableJson(actual) !== stableJson(expected)) failures.push(label);
}

function requireIncludes(label, text, needle, failures) {
  if (!String(text ?? '').includes(String(needle ?? ''))) failures.push(label);
}

const failures = [];
const queue = await readJson(queuePath, failures, 'source generation queue');
if (queue?.schema !== 'water9/source-generation-queue@1') failures.push(`queue schema is ${queue?.schema ?? 'missing'}`);
const queued = Array.isArray(queue?.candidates) ? queue.candidates : [];
const candidates = validateAll ? queued : [id ? queued.find((entry) => entry.id === id) : queued[0]].filter(Boolean);
if (!candidates.length && !validateAll) failures.push(id ? `${id}: candidate is not queued` : 'source generation queue is empty');

for (const candidate of candidates) {
  const packId = candidate.id;
  const packPath = resolve(packDir, `${packId}.json`);
  const markdownPath = resolve(packDir, `${packId}.md`);
  const pack = await readJson(packPath, failures, `${candidate.id} source focus pack`);
  const markdown = await readText(markdownPath, failures, `${candidate.id} source focus markdown`);

  if (pack?.schema !== 'water9/source-focus-pack@1') failures.push(`${candidate.id}: focus pack schema is ${pack?.schema ?? 'missing'}`);
  if (pack) {
  const prompt = candidate.promptFile ? (await readText(resolve(candidate.promptFile), failures, `${candidate.id} prompt file`)).trim() : candidate.prompt;
  expectEqual(`${candidate.id}: pack id mismatch`, pack.id, candidate.id, failures);
  expectEqual(`${candidate.id}: pack rank mismatch`, pack.rank, candidate.rank ?? null, failures);
  expectEqual(`${candidate.id}: pack prompt does not match queue prompt file`, pack.prompt, prompt, failures);
  expectEqual(`${candidate.id}: pack requiredRead mismatch`, pack.requiredRead ?? [], candidate.requiredRead ?? [], failures);
  expectEqual(`${candidate.id}: pack sourcePoseRules mismatch`, pack.sourcePoseRules ?? [], candidate.sourcePoseRules ?? [], failures);
  expectEqual(`${candidate.id}: pack qualityChecks mismatch`, pack.qualityChecks ?? [], candidate.qualityChecks ?? [], failures);
  expectEqual(`${candidate.id}: pack expectedOutput mismatch`, pack.expectedOutput, candidate.expectedOutput, failures);
  requireIncludes(`${candidate.id}: markdown missing prompt`, markdown, prompt, failures);
  requireIncludes(`${candidate.id}: markdown missing inbox target`, markdown, pack.inboxTarget, failures);
  requireIncludes(`${candidate.id}: markdown missing source session command`, markdown, `npm run source:session -- --id ${candidate.id}`, failures);
  requireIncludes(`${candidate.id}: markdown missing source approval command`, markdown, `npm run source:accept -- --id ${candidate.id}`, failures);
  if (candidate.auditGuidance) {
    requireIncludes(`${candidate.id}: markdown missing research audit hardening`, markdown, 'Research Audit Hardening', failures);
  }
  }
  if (!(await fileOk(markdownPath, 256))) failures.push(`${candidate.id}: source focus markdown is missing or too small`);
}

if (validateAll) {
  const index = await readJson(resolve(packDir, 'index.json'), failures, 'source focus index');
  if (index?.schema !== 'water9/source-focus-pack-index@1') failures.push(`source focus index schema is ${index?.schema ?? 'missing'}`);
  if ((index?.packs ?? []).length !== queued.length) failures.push(`source focus index has ${(index?.packs ?? []).length} packs, expected ${queued.length}`);
  if (!(await fileOk(resolve(packDir, 'index.md'), queued.length ? 256 : 128))) failures.push('source focus index markdown is missing or too small');
}

const summary = {
  packDir,
  checked: candidates.length,
  ids: candidates.map((candidate) => candidate.id),
  all: validateAll,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
