import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const jsonlPath = resolve(String(args.get('jsonl') ?? 'public/review/source-candidates/imagen-prompts.jsonl'));
const handoffPath = resolve(String(args.get('handoff') ?? 'public/review/source-candidates/source-handoff-pack.json'));
const markdownPath = resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-handoff-pack.md'));

async function readJson(label, path, failures) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readText(label, path, failures) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${label}: could not read file: ${error.message}`);
    return '';
  }
}

function parseJsonl(text, failures) {
  const records = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch (error) {
      failures.push(`imagen JSONL line ${index + 1}: could not parse JSON: ${error.message}`);
    }
  }
  return records;
}

async function expectedPromptFor(candidate, failures) {
  if (!candidate.promptFile) {
    failures.push(`${candidate.id}: queue packet is missing promptFile`);
    return '';
  }
  return (await readText(`${candidate.id} prompt file`, resolve(candidate.promptFile), failures)).trim();
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
  if (!String(text ?? '').includes(needle)) failures.push(label);
}

function autoIngestCommand(id) {
  return `npm run source:imagegen-status -- --id ${id} --ingest`;
}

const failures = [];
const queue = await readJson('source generation queue', queuePath, failures);
const handoff = await readJson('source handoff pack', handoffPath, failures);
const jsonlText = await readText('imagen prompts JSONL', jsonlPath, failures);
const markdown = await readText('source handoff markdown', markdownPath, failures);
const jsonlRecords = parseJsonl(jsonlText, failures);

if (queue?.schema !== 'water9/source-generation-queue@1') failures.push(`queue schema is ${queue?.schema ?? 'missing'}`);
if (handoff?.schema !== 'water9/source-handoff-pack@1') failures.push(`handoff schema is ${handoff?.schema ?? 'missing'}`);

const queueCandidates = Array.isArray(queue?.candidates) ? queue.candidates : [];
const jsonlById = new Map(jsonlRecords.map((record) => [record.id, record]));
const handoffCandidates = Array.isArray(handoff?.candidates) ? handoff.candidates : [];
const handoffById = new Map(handoffCandidates.map((record) => [record.id, record]));

if (jsonlRecords.length !== queueCandidates.length) {
  failures.push(`imagen JSONL has ${jsonlRecords.length} records, expected ${queueCandidates.length}`);
}
if (handoffCandidates.length !== queueCandidates.length) {
  failures.push(`handoff pack has ${handoffCandidates.length} candidates, expected ${queueCandidates.length}`);
}

const queueIds = queueCandidates.map((record) => record.id).join(',');
const jsonlIds = jsonlRecords.map((record) => record.id).join(',');
const handoffIds = handoffCandidates.map((record) => record.id).join(',');
if (jsonlIds !== queueIds) failures.push(`imagen JSONL order is stale; expected ${queueIds}, got ${jsonlIds}`);
if (handoffIds !== queueIds) failures.push(`handoff pack order is stale; expected ${queueIds}, got ${handoffIds}`);

for (const candidate of queueCandidates) {
  const owner = candidate.id ?? 'unknown-candidate';
  const expectedPrompt = await expectedPromptFor(candidate, failures);
  const jsonlRecord = jsonlById.get(candidate.id);
  const handoffRecord = handoffById.get(candidate.id);

  if (!jsonlRecord) failures.push(`${owner}: missing from imagen JSONL`);
  if (!handoffRecord) failures.push(`${owner}: missing from handoff pack`);
  if (!expectedPrompt) continue;

  if (candidate.auditGuidance) {
    requireIncludes(`${owner}: prompt file is missing research audit hardening`, expectedPrompt, 'Research audit hardening:', failures);
    requireIncludes(`${owner}: imagen JSONL prompt is missing research audit hardening`, jsonlRecord?.prompt, 'Research audit hardening:', failures);
    requireIncludes(`${owner}: handoff prompt is missing research audit hardening`, handoffRecord?.prompt, 'Research audit hardening:', failures);
    if (candidate.auditGuidance.lane) {
      requireIncludes(`${owner}: imagen JSONL prompt is missing audit lane`, jsonlRecord?.prompt, `Lane: ${candidate.auditGuidance.lane}`, failures);
      requireIncludes(`${owner}: handoff prompt is missing audit lane`, handoffRecord?.prompt, `Lane: ${candidate.auditGuidance.lane}`, failures);
    }
  }

  expectEqual(`${owner}: imagen JSONL prompt does not match prompt file`, jsonlRecord?.prompt?.trim(), expectedPrompt, failures);
  expectEqual(`${owner}: handoff prompt does not match prompt file`, handoffRecord?.prompt?.trim(), expectedPrompt, failures);
  expectEqual(`${owner}: imagen JSONL auditGuidance does not match queue`, jsonlRecord?.auditGuidance ?? null, candidate.auditGuidance ?? null, failures);
  expectEqual(`${owner}: handoff auditGuidance does not match queue`, handoffRecord?.auditGuidance ?? null, candidate.auditGuidance ?? null, failures);
  expectEqual(`${owner}: handoff qualityChecks do not match queue`, handoffRecord?.qualityChecks ?? [], candidate.qualityChecks ?? [], failures);
  expectEqual(`${owner}: handoff sourcePoseRules do not match queue`, handoffRecord?.sourcePoseRules ?? [], candidate.sourcePoseRules ?? [], failures);
  expectEqual(`${owner}: imagen JSONL requiredRead does not match queue`, jsonlRecord?.requiredRead ?? [], candidate.requiredRead ?? [], failures);
  expectEqual(`${owner}: handoff requiredRead does not match queue`, handoffRecord?.requiredRead ?? [], candidate.requiredRead ?? [], failures);
  expectEqual(`${owner}: handoff auto-ingest command is missing or stale`, handoffRecord?.commands?.autoIngestGeneratedFile, autoIngestCommand(owner), failures);

  requireIncludes(`${owner}: handoff markdown is missing candidate id`, markdown, owner, failures);
  requireIncludes(`${owner}: handoff markdown is missing prompt file path`, markdown, candidate.promptFile, failures);
  requireIncludes(`${owner}: handoff markdown prompt does not match prompt file`, markdown, expectedPrompt, failures);
  requireIncludes(`${owner}: handoff markdown is missing validated auto-ingest command`, markdown, autoIngestCommand(owner), failures);
  if (candidate.auditGuidance) {
    requireIncludes(`${owner}: handoff markdown is missing research audit hardening section`, markdown, '### Research Audit Hardening', failures);
  }
}

const summary = {
  queue: queuePath,
  jsonl: jsonlPath,
  handoff: handoffPath,
  candidates: queueCandidates.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
