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
  json: resolve(String(args.get('json') ?? 'public/review/content-review-session.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-review-session.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-review-session.html')),
  board: resolve(String(args.get('board') ?? 'public/review/content-human-adjudication-board.json')),
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

async function fileOk(label, path, minSize = 128) {
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

function textIncludes(text, value) {
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

const session = await readJson('content review session', paths.json);
const board = await readJson('human adjudication board', paths.board);
const markdown = await readText('content review session markdown', paths.markdown);
const html = await readText('content review session html', paths.html);
await fileOk('content review session markdown', paths.markdown, 1024);
await fileOk('content review session html', paths.html, 4096);

if (session?.schema !== 'water9/content-review-session@1') failures.push(`unexpected session schema ${session?.schema ?? 'missing'}`);
if (board?.schema !== 'water9/content-human-adjudication-board@1') failures.push(`unexpected board schema ${board?.schema ?? 'missing'}`);

const items = Array.isArray(session?.items) ? session.items : [];
const boardItems = Array.isArray(board?.items) ? board.items : [];
const boardById = new Map(boardItems.map((item) => [item.id, item]));
if (items.length < minThreats) failures.push(`session has ${items.length} items, expected at least ${minThreats}`);
if (items.length !== boardItems.length) failures.push(`session item count ${items.length} does not match board ${boardItems.length}`);
if ((session?.summary?.items ?? -1) !== items.length) failures.push('summary items mismatch');
if ((session?.summary?.targetThreats ?? -1) !== (board?.summary?.targetThreats ?? minThreats)) failures.push('summary targetThreats mismatch');
if ((session?.summary?.sourceReady ?? -1) !== items.filter((item) => item.sourceReady).length) failures.push('summary sourceReady mismatch');
if ((session?.summary?.sourceApprovalReady ?? -1) !== items.filter((item) => item.sourceApprovalReady && !item.sourceApproved).length) failures.push('summary sourceApprovalReady mismatch');
if ((session?.summary?.sourceCriticRegenerationRequired ?? -1) !== items.filter((item) => item.sourceCriticRegenerationRequired && !item.sourceApproved).length) failures.push('summary sourceCriticRegenerationRequired mismatch');
if ((session?.summary?.threatReady ?? -1) !== items.filter((item) => item.threatReady).length) failures.push('summary threatReady mismatch');
if ((session?.summary?.allMediaPresent ?? -1) !== items.filter((item) => item.media?.every((entry) => entry.present)).length) failures.push('summary allMediaPresent mismatch');
if ((session?.summary?.sourceApproved ?? -1) !== items.filter((item) => item.sourceApproved).length) failures.push('summary sourceApproved mismatch');
if ((session?.summary?.acceptedThreats ?? -1) !== items.filter((item) => item.threatAccepted).length) failures.push('summary acceptedThreats mismatch');
if ((session?.summary?.sourcePreviewBoundaries ?? -1) !== items.filter((item) => item.previewBoundaries?.source?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length) failures.push('summary sourcePreviewBoundaries mismatch');
if ((session?.summary?.runtimePreviewBoundaries ?? -1) !== items.filter((item) => item.previewBoundaries?.runtime?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length) failures.push('summary runtimePreviewBoundaries mismatch');
if ((session?.summary?.previewOnlySources ?? -1) !== items.filter((item) => item.previewBoundaries?.source?.previewOnly === true).length) failures.push('summary previewOnlySources mismatch');
if ((session?.summary?.previewOnlyRuntimes ?? -1) !== items.filter((item) => item.previewBoundaries?.runtime?.previewOnly === true).length) failures.push('summary previewOnlyRuntimes mismatch');

if (session?.sourceDecisionFileTemplate?.schema !== 'water9/source-cohesion-decisions@1') failures.push('source decision template schema mismatch');
if (session?.workspace?.editableDecisionJson !== true) failures.push('workspace must expose editable decision JSON');
if (session?.workspace?.perTargetDecisionControls !== true) failures.push('workspace must expose per-target decision controls');
if (session?.workspace?.reviewedOnlyDecisionJson !== true) failures.push('workspace must expose reviewed-only decision JSON');
if (session?.workspace?.strictValidatorsRemainRequired !== true) failures.push('workspace must require strict validators after export');
if (session?.sourceDecisionFileTemplate?.policy?.humanAuthored !== true) failures.push('source decision template must require humanAuthored');
if (session?.sourceDecisionFileTemplate?.policy?.automationCannotApproveCohesion !== true) failures.push('source decision template must block automation approval');
if ((session?.sourceDecisionFileTemplate?.decisions ?? []).length !== items.length) failures.push('source decision template item count mismatch');
if (session?.threatDecisionFileTemplate?.schema !== 'water9/content-threat-acceptance-decisions@1') failures.push('threat decision template schema mismatch');
if (session?.threatDecisionFileTemplate?.policy?.humanAuthored !== true) failures.push('threat decision template must require humanAuthored');
if (session?.threatDecisionFileTemplate?.policy?.automationCannotAcceptThreats !== true) failures.push('threat decision template must block automation acceptance');
if ((session?.threatDecisionFileTemplate?.decisions ?? []).length !== items.length) failures.push('threat decision template item count mismatch');

for (const item of items) {
  const boardItem = boardById.get(item.id);
  if (!boardItem) failures.push(`${item.id}: missing board row`);
  if (boardItem && item.species !== boardItem.species) failures.push(`${item.id}: species mismatch`);
  if (boardItem && item.sourceReady !== boardItem.sourceReady) failures.push(`${item.id}: sourceReady mismatch`);
  if (boardItem && item.sourceApprovalReady !== boardItem.sourceApprovalReady) failures.push(`${item.id}: sourceApprovalReady mismatch`);
  if (boardItem && item.sourceCriticRegenerationRequired !== boardItem.sourceCriticRegenerationRequired) failures.push(`${item.id}: sourceCriticRegenerationRequired mismatch`);
  if (boardItem && item.threatReady !== boardItem.threatReady) failures.push(`${item.id}: threatReady mismatch`);
  if (!item.media?.every((entry) => entry.present)) failures.push(`${item.id}: all media should be present`);
	  if (!item.sourceDecision?.evidenceFingerprint?.digest) failures.push(`${item.id}: source decision must include current evidence fingerprint`);
	  if (!item.threatDecision?.evidenceFingerprint?.digest) failures.push(`${item.id}: threat decision must include current evidence fingerprint`);
	  if (item.threatDecision?.sourceCandidateId !== item.id) failures.push(`${item.id}: threat decision sourceCandidateId should default to target id`);
  for (const [label, boundary] of [
    ['source', item.previewBoundaries?.source],
    ['runtime', item.previewBoundaries?.runtime],
  ]) {
    if (boundary?.productionBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${item.id}: missing ${label} sandbox production boundary`);
    if (boundary?.acceptedForContentGate !== boundary?.productionBoundary?.acceptedForContentGate) failures.push(`${item.id}: ${label} boundary acceptedForContentGate mismatch`);
    if (boundary?.productionBoundary?.productionReady !== boundary?.acceptedForContentGate) failures.push(`${item.id}: ${label} boundary productionReady mismatch`);
    if (boundary?.acceptedForContentGate !== true && boundary?.previewOnly !== true) failures.push(`${item.id}: ${label} non-accepted preview must be preview-only`);
    if (!String(boundary?.claim ?? '').trim()) failures.push(`${item.id}: ${label} preview boundary missing claim`);
    if (!String(boundary?.manualReviewRequired ?? '').trim()) failures.push(`${item.id}: ${label} preview boundary missing manualReviewRequired`);
  }
  for (const check of session.sourceDecisionFileTemplate.decisions.find((decision) => decision.id === item.id)?.visualChecks ? Object.keys(session.sourceDecisionFileTemplate.decisions.find((decision) => decision.id === item.id).visualChecks) : []) {
    if (!item.sourceChecks.includes(check)) failures.push(`${item.id}: source check ${check} missing from item`);
  }
  for (const check of session.threatDecisionFileTemplate.decisions.find((decision) => decision.id === item.id)?.visualChecks ? Object.keys(session.threatDecisionFileTemplate.decisions.find((decision) => decision.id === item.id).visualChecks) : []) {
    if (!item.threatChecks.includes(check)) failures.push(`${item.id}: threat check ${check} missing from item`);
  }
  for (const [label, command, expected] of [
    ['source apply', item.commands?.sourceApplyDryRun, 'npm run source:cohesion-decisions-apply'],
    ['threat apply', item.commands?.threatApplyDryRun, 'npm run content:threat-decisions-apply'],
    ['source approval', item.commands?.sourceApprovalDryRun, `npm run source:accept -- --id ${item.id}`],
    ['threat acceptance', item.commands?.threatAcceptanceDryRun, `npm run content:accept -- --id ${item.id}`],
  ]) {
    if (!String(command ?? '').includes(expected)) failures.push(`${item.id}: ${label} command must include ${expected}`);
    if (label.includes('approval') || label.includes('acceptance')) {
      if (!String(command ?? '').includes('--dry-run')) failures.push(`${item.id}: ${label} command must be dry-run`);
    }
  }
  for (const value of [
    item.id,
    item.species,
    item.commands?.sourcePreview,
    item.commands?.runtimePreview,
    item.commands?.sourceApprovalDryRun,
    item.commands?.threatAcceptanceDryRun,
    `data-review-session-target="${item.id}"`,
    `data-decision-controls="${item.id}"`,
    `data-source-status="${item.id}"`,
    `data-threat-status="${item.id}"`,
    `data-source-note="${item.id}"`,
	    `data-threat-note="${item.id}"`,
	    `data-source-check=`,
	    `data-threat-check=`,
	    `${item.sourceApproved ? 'approved' : 'not approved'}`,
	    `${item.threatAccepted ? 'accepted' : 'not accepted'}`,
	    item.previewBoundaries?.source?.claim,
	    item.previewBoundaries?.runtime?.claim,
	  ]) {
    if (value && !markdown.includes(String(value)) && !textIncludes(html, value)) failures.push(`${item.id}: rendered outputs missing ${value}`);
  }
}

for (const required of [
  'Water9 Content Review Session',
  'Single-session workspace for human review of the 20-threat gate',
  'Human Approval Boundary',
  'Download source decisions',
  'Download reviewed-only source decisions',
  'Download threat decisions',
  'Download reviewed-only threat decisions',
	  'Regenerate decision JSON from controls',
	  'Gate truth:',
	  'not accepted yet. Ready means reviewable, not approved or accepted.',
	  'Human-approved sources:',
	  'Approval-ready sources:',
	  'Critic-regeneration sources:',
	  'Accepted threats:',
	  'Source preview boundaries:',
	  'Runtime preview boundaries:',
	  'source preview boundary',
	  'runtime preview boundary',
	  'preview-only runtimes',
	  'data-reviewer',
  'data-reviewed-at',
  'data-regenerate-decisions',
  'data-source-decision-output',
  'data-threat-decision-output',
  'data-source-reviewed-decision-output',
  'data-threat-reviewed-decision-output',
  'data-decision-controls',
  'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
  'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-decisions.json --strict',
  'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-reviewed-decisions.json --strict',
  'data-review-session-target',
]) {
  if (!markdown.includes(required) && !textIncludes(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const summary = {
  schema: 'water9/content-review-session-check@1',
  items: items.length,
  sourceReady: session?.summary?.sourceReady ?? null,
  threatReady: session?.summary?.threatReady ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
