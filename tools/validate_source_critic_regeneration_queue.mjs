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

const paths = {
  queue: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/source-candidates/source-critic-regeneration-queue.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-critic-regeneration-queue.html')),
  criticBoard: resolve(String(args.get('critic-board') ?? 'public/review/source-candidates/source-critic-board.json')),
};

const failures = [];

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readText(label, path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${label}: could not read file: ${error.message}`);
    return '';
  }
}

async function fileOk(label, path, minSize) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function includesHtml(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

const queue = await readJson('critic regeneration queue', paths.queue);
const criticBoard = await readJson('source critic board', paths.criticBoard);
const markdown = await readText('critic regeneration markdown', paths.markdown);
const html = await readText('critic regeneration html', paths.html);

await fileOk('critic regeneration queue json', paths.queue, 1024);
await fileOk('critic regeneration queue markdown', paths.markdown, 1024);
await fileOk('critic regeneration queue html', paths.html, 4096);

if (queue?.schema !== 'water9/source-critic-regeneration-queue@1') failures.push(`critic regeneration queue schema is ${queue?.schema ?? 'missing'}`);
if (criticBoard?.schema !== 'water9/source-critic-board@1') failures.push(`source critic board schema is ${criticBoard?.schema ?? 'missing'}`);
if (queue?.policy?.advisoryOnly !== true) failures.push('critic regeneration queue must be advisory-only');
if (queue?.policy?.doesNotApproveSources !== true) failures.push('critic regeneration queue must not approve sources');
if (queue?.policy?.doesNotAcceptThreats !== true) failures.push('critic regeneration queue must not accept threats');
if (queue?.policy?.humanApprovalStillRequired !== true) failures.push('critic regeneration queue must require human approval');
if (queue?.policy?.replacementMustReturnToSourceReview !== true) failures.push('critic regeneration queue must return replacements to source review');

const candidates = Array.isArray(queue?.candidates) ? queue.candidates : [];
const criticItems = Array.isArray(criticBoard?.items) ? criticBoard.items : [];
const regenerateItems = criticItems.filter((item) => item.subagentCritique?.recommendation === 'regenerate');
const regenerateIds = regenerateItems.map((item) => item.id);
const queueIds = candidates.map((item) => item.id);

if ((queue?.summary?.regenerateCandidates ?? -1) !== candidates.length) failures.push('summary regenerateCandidates mismatch');
if ((queue?.summary?.regenerateCandidates ?? -1) !== regenerateItems.length) failures.push('queue must include exactly the critic-board regenerate candidates');
if ((queue?.summary?.lanes ?? -1) !== new Set(candidates.map((item) => item.lane)).size) failures.push('summary lanes mismatch');
if ((queue?.summary?.promptFiles ?? -1) !== candidates.length) failures.push('summary promptFiles mismatch');
const expectedNext = candidates[0] ?? null;
if ((queue?.summary?.nextCandidateId ?? null) !== (expectedNext?.id ?? null)) failures.push('summary nextCandidateId must match first regeneration candidate');
if ((queue?.summary?.nextCandidateSpecies ?? null) !== (expectedNext?.species ?? null)) failures.push('summary nextCandidateSpecies must match first regeneration candidate');
if ((queue?.summary?.nextPromptFile ?? null) !== (expectedNext?.promptFile ?? null)) failures.push('summary nextPromptFile must match first regeneration candidate');
if ((queue?.nextCandidate?.id ?? null) !== (expectedNext?.id ?? null)) failures.push('nextCandidate must match first regeneration candidate');
if (expectedNext) {
  if (!includesHtml(html, 'Next Regeneration Target')) failures.push('html missing next regeneration target section');
  if (!markdown.includes('## Next Regeneration Target')) failures.push('markdown missing next regeneration target section');
  if (!includesHtml(html, 'id="next-regeneration-target"')) failures.push('html missing next regeneration target anchor');
  for (const command of Object.values(expectedNext.commands ?? {})) {
    if (!command) continue;
    if (!markdown.includes(command) && !includesHtml(html, command)) failures.push(`next target rendered output missing command ${command}`);
  }
}

for (const id of regenerateIds) {
  if (!queueIds.includes(id)) failures.push(`${id}: missing from critic regeneration queue`);
}
for (const item of candidates) {
  const criticItem = regenerateItems.find((entry) => entry.id === item.id);
  if (!criticItem) failures.push(`${item.id}: queue item is not a critic-board regenerate item`);
  if (item.recommendation !== 'regenerate') failures.push(`${item.id}: recommendation must be regenerate`);
  if (!item.species || !item.lane) failures.push(`${item.id}: missing species or lane`);
  if (!String(item.prompt ?? '').includes('Critic regeneration target')) failures.push(`${item.id}: prompt missing critic regeneration target`);
  if (!String(item.prompt ?? '').includes('Subagent cohesion failures to fix')) failures.push(`${item.id}: prompt missing subagent cohesion failures`);
  if (String(item.prompt ?? '').length < 500) failures.push(`${item.id}: prompt is too short for regeneration`);
  if (!String(item.promptFile ?? '').startsWith('public/review/source-candidates/critic-regeneration-prompts/')) failures.push(`${item.id}: prompt file is outside critic regeneration prompt dir`);
  if (!Array.isArray(item.critic?.cohesionRisks) || item.critic.cohesionRisks.length < 2) failures.push(`${item.id}: missing critic cohesion risks`);
  if (!String(item.critic?.animationRisk ?? '').trim()) failures.push(`${item.id}: missing critic animation risk`);
  if (item.critic?.advisoryState !== 'critic-recommends-regenerate') failures.push(`${item.id}: advisory state must be critic-recommends-regenerate`);
  if (!String(item.commands?.markImagegen ?? '').includes('source:imagegen-mark')) failures.push(`${item.id}: imagegen mark command missing`);
  if (!String(item.commands?.checkImagegen ?? '').includes('source:imagegen-status')) failures.push(`${item.id}: imagegen status command missing`);
  if (!String(item.commands?.ingestImagegen ?? '').includes('--ingest')) failures.push(`${item.id}: imagegen ingest command missing`);
  if (!String(item.commands?.captureManual ?? '').includes('source:inbox-capture')) failures.push(`${item.id}: manual capture command missing`);
  if (!String(item.commands?.recoverSavedImage ?? '').includes('source:recover-inline')) failures.push(`${item.id}: saved-image recovery command missing`);
  if (!String(item.commands?.generateOpenAiDryRun ?? '').includes('--queue public/review/source-candidates/source-critic-regeneration-queue.json')) failures.push(`${item.id}: OpenAI dry-run command must use critic regeneration queue`);
  if (!String(item.commands?.generateOpenAiApply ?? '').includes('--apply --overwrite')) failures.push(`${item.id}: OpenAI apply command must be explicit apply overwrite`);
  if (!String(item.commands?.dryRunReplace ?? '').includes('--overwrite --dry-run')) failures.push(`${item.id}: dry-run replace command must use overwrite dry-run`);
  if (!String(item.commands?.applyReplace ?? '').includes('--copy --overwrite')) failures.push(`${item.id}: apply replace command must copy overwrite`);
  if (!String(item.commands?.sourcePreview ?? '').includes('--with diver')) failures.push(`${item.id}: source preview must include diver`);
  for (const required of ['source:gallery', 'source:preview-check', 'content:plan-coverage', 'content:plan-coverage-check', 'source:review-dossier', 'source:review-dossier-check', 'source:approval-runway', 'source:approval-runway-check', 'source:visual-board', 'source:visual-board-check', 'source:critic-board', 'source:critic-regeneration', 'source:critic-regeneration-check']) {
    if (!String(item.commands?.rebuildEvidence ?? '').includes(required)) failures.push(`${item.id}: rebuildEvidence missing ${required}`);
  }
  if (!includesHtml(html, `data-critic-regeneration="${item.id}"`)) failures.push(`${item.id}: html missing critic regeneration marker`);
  if (!markdown.includes(item.id)) failures.push(`${item.id}: markdown missing id`);
  const promptText = await readText(`${item.id} prompt`, resolve(item.promptFile));
  if (!promptText.includes(item.id) || !promptText.includes('Hard acceptance bar')) failures.push(`${item.id}: prompt file missing required content`);
}

for (const required of [
  'Water 9 Critic Regeneration Queue',
  'source candidates that a lane critic marked',
  'npm run source:critic-regeneration',
  'npm run source:critic-regeneration-check',
  'source:generate-openai',
  'source:imagegen-mark',
  'source:recover-inline',
  'content:plan-coverage',
  'source-critic-regeneration-queue.json',
  'Next Regeneration Target',
]) {
  if (!markdown.includes(required) && !includesHtml(html, required)) failures.push(`rendered output missing ${required}`);
}

const result = {
  schema: 'water9/source-critic-regeneration-queue-check@1',
  regenerateCandidates: queue?.summary?.regenerateCandidates ?? null,
  lanes: queue?.summary?.lanes ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
