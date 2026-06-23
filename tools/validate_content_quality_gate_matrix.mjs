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
  json: resolve(String(args.get('json') ?? 'public/review/content-quality-gate-matrix.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-quality-gate-matrix.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-quality-gate-matrix.html')),
  signoff: resolve(String(args.get('signoff') ?? 'public/review/content-human-signoff-queue.json')),
  reviewSession: resolve(String(args.get('review-session') ?? 'public/review/content-review-session.json')),
};
const minThreats = Number(args.get('min-threats') ?? 20);
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

function includesRendered(text, value) {
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

const matrix = await readJson('content quality gate matrix', paths.json);
const signoff = await readJson('content human signoff queue', paths.signoff);
const reviewSession = await readJson('content review session', paths.reviewSession);
const markdown = await readText('content quality gate matrix markdown', paths.markdown);
const html = await readText('content quality gate matrix html', paths.html);
await fileOk('content quality gate matrix markdown', paths.markdown, 1024);
await fileOk('content quality gate matrix html', paths.html, 4096);

if (matrix?.schema !== 'water9/content-quality-gate-matrix@1') failures.push(`unexpected matrix schema ${matrix?.schema ?? 'missing'}`);
if (signoff?.schema !== 'water9/content-human-signoff-queue@1') failures.push(`unexpected signoff schema ${signoff?.schema ?? 'missing'}`);
if (reviewSession?.schema !== 'water9/content-review-session@1') failures.push(`unexpected review session schema ${reviewSession?.schema ?? 'missing'}`);
if (matrix?.policy?.humanSourceApprovalRequired !== true) failures.push('matrix must require human source approval');
if (matrix?.policy?.humanThreatAcceptanceRequired !== true) failures.push('matrix must require human threat acceptance');
if (matrix?.policy?.previewOnlyEvidenceCannotCountTowardStrictGate !== true) failures.push('matrix must prevent preview-only strict gate credit');
if (matrix?.policy?.automationCannotApproveContent !== true) failures.push('matrix must state automation cannot approve content');

const rows = Array.isArray(matrix?.rows) ? matrix.rows : [];
const signoffItems = Array.isArray(signoff?.items) ? signoff.items : [];
const sessionItems = Array.isArray(reviewSession?.items) ? reviewSession.items : [];
const signoffById = new Map(signoffItems.map((item) => [item.id, item]));
const sessionById = new Map(sessionItems.map((item) => [item.id, item]));
if (rows.length < minThreats) failures.push(`matrix has ${rows.length} rows, expected at least ${minThreats}`);
if (rows.length !== signoffItems.length) failures.push('matrix row count must match signoff queue');
if ((matrix?.summary?.rows ?? -1) !== rows.length) failures.push('summary rows mismatch');
if ((matrix?.summary?.targetThreats ?? -1) !== (signoff?.summary?.targetThreats ?? minThreats)) failures.push('targetThreats mismatch with signoff');
if ((matrix?.summary?.acceptedThreats ?? -1) !== (signoff?.summary?.acceptedThreats ?? 0)) failures.push('acceptedThreats mismatch with signoff');
if ((matrix?.summary?.sourceEvidenceComplete ?? -1) !== rows.filter((row) => row.sourceEvidenceComplete).length) failures.push('sourceEvidenceComplete summary mismatch');
if ((matrix?.summary?.runtimeEvidenceComplete ?? -1) !== rows.filter((row) => row.runtimeEvidenceComplete).length) failures.push('runtimeEvidenceComplete summary mismatch');
if ((matrix?.summary?.allEvidenceComplete ?? -1) !== rows.filter((row) => row.allEvidenceComplete).length) failures.push('allEvidenceComplete summary mismatch');
if ((matrix?.summary?.sourceApproved ?? -1) !== rows.filter((row) => row.sourceApproved).length) failures.push('sourceApproved summary mismatch');
if ((matrix?.summary?.threatAccepted ?? -1) !== rows.filter((row) => row.threatAccepted).length) failures.push('threatAccepted summary mismatch');
if ((matrix?.summary?.strictGateEligible ?? -1) !== rows.filter((row) => row.strictGateEligible).length) failures.push('strictGateEligible summary mismatch');

for (const row of rows) {
  const signoffItem = signoffById.get(row.id);
  const sessionItem = sessionById.get(row.id);
  if (!signoffItem) failures.push(`${row.id}: missing from signoff queue`);
  if (!sessionItem) failures.push(`${row.id}: missing from review session`);
  if (signoffItem && row.species !== signoffItem.species) failures.push(`${row.id}: species mismatch`);
  if (row.sourceApproved !== Boolean(signoffItem?.sourceApproved)) failures.push(`${row.id}: sourceApproved mismatch`);
  if (row.threatAccepted !== Boolean(signoffItem?.threatAccepted)) failures.push(`${row.id}: threatAccepted mismatch`);
  if (row.countsTowardGate !== Boolean(signoffItem?.countsTowardGate)) failures.push(`${row.id}: countsTowardGate mismatch`);
  if (row.strictGateEligible !== (row.sourceApproved && row.threatAccepted && row.countsTowardGate)) failures.push(`${row.id}: strictGateEligible must require source approval and threat acceptance`);
  if (!row.sourceApproved && row.nextGate !== 'human-source-approval' && !row.sourceCriticRegenerationRequired) failures.push(`${row.id}: nextGate should be human-source-approval before source approval`);
  if (row.sourceApproved && !row.threatAccepted && row.nextGate !== 'human-threat-acceptance') failures.push(`${row.id}: nextGate should be human-threat-acceptance after source approval`);
  for (const key of ['sourceArt', 'magentaKeyPreview', 'sourceSandboxPreview', 'articulationPlanPreview']) {
    if (row.sourceEvidence?.[key] !== true) failures.push(`${row.id}: source evidence missing ${key}`);
  }
  for (const key of ['sourceParityOverlay', 'contactSheet', 'phaseStrip', 'sandboxIdle', 'sandboxLunge', 'sandboxStunned']) {
    if (row.runtimeEvidence?.[key] !== true) failures.push(`${row.id}: runtime evidence missing ${key}`);
  }
  if (row.sourcePreviewBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${row.id}: source preview boundary missing schema`);
  if (row.runtimePreviewBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${row.id}: runtime preview boundary missing schema`);
  if (!String(row.commands?.sourcePreview ?? '').includes(`source-${row.id}`)) failures.push(`${row.id}: source preview command missing source id`);
  if (!String(row.commands?.runtimePreview ?? '').includes(row.id)) failures.push(`${row.id}: runtime preview command missing id`);
  if (!String(row.commands?.sourceApprovalDryRun ?? '').includes(`npm run source:accept -- --id ${row.id}`) || !String(row.commands?.sourceApprovalDryRun ?? '').includes('--dry-run')) {
    failures.push(`${row.id}: source approval command must be dry-run for this id`);
  }
  if (!String(row.commands?.threatAcceptanceDryRun ?? '').includes(`npm run content:accept -- --id ${row.id}`) || !String(row.commands?.threatAcceptanceDryRun ?? '').includes('--dry-run')) {
    failures.push(`${row.id}: threat acceptance command must be dry-run for this id`);
  }
  for (const value of [
    row.id,
    row.species,
    row.nextGate,
    row.links?.sourceQuickReview,
    row.links?.cockpit,
    `data-quality-gate-row="${row.id}"`,
  ]) {
    if (value && !markdown.includes(String(value)) && !includesRendered(html, value)) failures.push(`${row.id}: rendered outputs missing ${value}`);
  }
}

for (const required of [
  'Water 9 Quality Gate Matrix',
  'This matrix is a human-review execution surface',
  'does not approve source art',
  'does not accept threats',
  'preview-only evidence',
  'Strict gate eligible',
  'human-source-approval',
  'data-content-quality-gate-matrix',
  'data-strict-goal-complete',
  'data-accepted-threats',
  'npm run content:quality-gate-matrix',
  'npm run content:quality-gate-matrix-check',
  'npm run content:goal-readiness-strict',
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const result = {
  schema: 'water9/content-quality-gate-matrix-check@1',
  rows: matrix?.summary?.rows ?? null,
  sourceEvidenceComplete: matrix?.summary?.sourceEvidenceComplete ?? null,
  runtimeEvidenceComplete: matrix?.summary?.runtimeEvidenceComplete ?? null,
  acceptedThreats: matrix?.summary?.acceptedThreats ?? null,
  strictGateEligible: matrix?.summary?.strictGateEligible ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
