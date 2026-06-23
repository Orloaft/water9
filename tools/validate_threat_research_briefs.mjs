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

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/research-briefs.json'));
const sourceCandidatePath = resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json'));
const failures = [];
const STATUSES = new Set(['draft', 'ready', 'candidate-queued', 'rejected']);
const ARRAY_REQUIREMENTS = [
  ['biologicalAnchors', 4, 8],
  ['requiredRead', 4, 8],
  ['articulatableParts', 6, 14],
  ['motionPhases', 4, 8],
  ['promptRisks', 3, 8],
];

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function fileExists(path) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= 128;
  } catch {
    return false;
  }
}

function hasMagentaPrompt(prompt) {
  const text = String(prompt ?? '').toLowerCase();
  return text.includes('#ff00ff') && text.includes('magenta');
}

function hasWholeSourceLanguage(prompt) {
  const text = String(prompt ?? '').toLowerCase();
  return text.includes('whole') || text.includes('full-body') || text.includes('full body');
}

const manifest = await readJson('research brief manifest', manifestPath);
const sourceCandidates = await readJson('source candidate manifest', sourceCandidatePath);
const candidateIds = new Set((sourceCandidates?.candidates ?? []).map((candidate) => candidate.id));
const briefs = Array.isArray(manifest?.briefs) ? manifest.briefs : [];
const ids = new Set();

if (manifest?.schema !== 'water9/threat-research-briefs@1') failures.push(`research brief manifest schema is ${manifest?.schema ?? 'missing'}`);

for (const brief of briefs) {
  const owner = brief.id ?? 'unknown-brief';
  if (!brief.id) failures.push(`${owner}: missing id`);
  if (brief.id && ids.has(brief.id)) failures.push(`${owner}: duplicate id`);
  if (brief.id) ids.add(brief.id);
  if (!brief.species) failures.push(`${owner}: missing species`);
  if (!STATUSES.has(brief.status)) failures.push(`${owner}: invalid status ${brief.status ?? 'missing'}`);
  if (!brief.depthBand) failures.push(`${owner}: missing depthBand`);
  if (!brief.gameplayVerb || String(brief.gameplayVerb).trim().length < 40) failures.push(`${owner}: gameplayVerb needs a concrete design sentence`);
  for (const [key, min, max] of ARRAY_REQUIREMENTS) {
    const value = brief[key];
    if (!Array.isArray(value) || value.length < min || value.length > max) {
      failures.push(`${owner}: ${key} must have ${min}-${max} entries`);
    } else if (value.some((entry) => String(entry).trim().length < 12)) {
      failures.push(`${owner}: ${key} entries should be specific phrases, not stubs`);
    }
  }
  if (!hasMagentaPrompt(brief.promptSeed)) failures.push(`${owner}: promptSeed must explicitly request #ff00ff magenta background`);
  if (!hasWholeSourceLanguage(brief.promptSeed)) failures.push(`${owner}: promptSeed must request whole/full-body source art`);
  if (String(brief.promptSeed ?? '').length < 160) failures.push(`${owner}: promptSeed is too short for reliable source generation`);
  if (brief.status === 'candidate-queued') {
    if (!brief.sourceCandidateId) failures.push(`${owner}: candidate-queued brief needs sourceCandidateId`);
    if (brief.sourceCandidateId && !candidateIds.has(brief.sourceCandidateId)) failures.push(`${owner}: sourceCandidateId ${brief.sourceCandidateId} is missing from source candidate manifest`);
  }
  if (brief.referenceImage && !(await fileExists(resolve(brief.referenceImage)))) failures.push(`${owner}: referenceImage ${brief.referenceImage} is missing`);
}

const summary = {
  briefs: briefs.length,
  readyBriefs: briefs.filter((brief) => brief.status === 'ready').length,
  queuedBriefs: briefs.filter((brief) => brief.status === 'candidate-queued').length,
  sourceCandidates: candidateIds.size,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
