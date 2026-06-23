import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const outPath = resolve(String(args.get('out') ?? 'public/review/source-candidates/imagen-prompts.jsonl'));
const statusFilter = String(args.get('status') ?? 'draft,needs-review')
  .split(',')
  .map((status) => status.trim())
  .filter(Boolean);
const includeExistingSource = args.has('include-existing-source');

function hasMagentaPrompt(prompt) {
  const text = String(prompt ?? '').toLowerCase();
  return text.includes('#ff00ff') && text.includes('magenta');
}

function hasWholeSourceLanguage(prompt) {
  const text = String(prompt ?? '').toLowerCase();
  return text.includes('whole') || text.includes('full-body') || text.includes('full body');
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest.schema ?? 'missing'}`);
}
const queue = JSON.parse(await readFile(queuePath, 'utf8').catch(() => '{"candidates":[]}'));
const queueById = new Map((queue.candidates ?? []).map((candidate) => [candidate.id, candidate]));

const failures = [];
const prompts = [];
for (const candidate of manifest.candidates ?? []) {
  if (!statusFilter.includes(candidate.status)) continue;
  if (candidate.source && !includeExistingSource) continue;
  const queueItem = queueById.get(candidate.id);
  const hardenedPrompt = queueItem?.promptFile
    ? await readFile(resolve(queueItem.promptFile), 'utf8').catch(() => null)
    : null;
  const prompt = hardenedPrompt?.trim() || queueItem?.prompt || candidate.prompt;
  const owner = candidate.id ?? 'unknown-candidate';
  if (!prompt) failures.push(`${owner}: missing prompt`);
  if (!hasMagentaPrompt(prompt)) failures.push(`${owner}: prompt must request #ff00ff magenta background`);
  if (!hasWholeSourceLanguage(prompt)) failures.push(`${owner}: prompt must request whole/full-body source art`);
  if (String(prompt ?? '').length < 160) failures.push(`${owner}: prompt is too short for reliable source generation`);
  prompts.push({
    id: candidate.id,
    species: candidate.species,
    status: candidate.status,
    rank: queueItem?.rank ?? null,
    promptFile: queueItem?.promptFile ?? null,
    depthBand: candidate.depthBand,
    gameplayVerb: candidate.gameplayVerb,
    researchBriefId: candidate.researchBriefId ?? null,
    outputSuggestion: `public/assets/generated/fauna-${candidate.id}-whole-source.png`,
    prompt,
    basePrompt: candidate.prompt,
    requiredRead: queueItem?.requiredRead ?? candidate.requiredRead ?? [],
    articulatableParts: queueItem?.articulatableParts ?? candidate.articulatableParts ?? [],
    promptRisks: queueItem?.promptRisks ?? candidate.promptRisks ?? [],
    auditGuidance: queueItem?.auditGuidance ?? null,
  });
}

prompts.sort((left, right) => (left.rank ?? Number.POSITIVE_INFINITY) - (right.rank ?? Number.POSITIVE_INFINITY) || left.id.localeCompare(right.id));

if (failures.length) {
  console.error(JSON.stringify({ manifest: manifestPath, outPath, prompts: prompts.length, failures }, null, 2));
  process.exit(1);
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${prompts.map((prompt) => JSON.stringify(prompt)).join('\n')}${prompts.length ? '\n' : ''}`);
console.log(JSON.stringify({ manifest: manifestPath, outPath, statuses: statusFilter, prompts: prompts.length, failures }, null, 2));
