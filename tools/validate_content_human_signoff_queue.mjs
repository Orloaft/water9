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
  json: resolve(String(args.get('json') ?? 'public/review/content-human-signoff-queue.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-human-signoff-queue.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-human-signoff-queue.html')),
  verticalSlice: resolve(String(args.get('vertical-slice') ?? 'public/review/content-vertical-slice-runway.json')),
  sourceApprovalRunway: resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json')),
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

function htmlIncludes(html, value) {
  return html.includes(value) || html.includes(htmlEscape(value));
}

function localPathForUrl(url) {
  if (!url) return null;
  const text = String(url);
  if (text.startsWith('/review/')) return resolve(`public${text}`);
  if (text.startsWith('/assets/')) return resolve(`public${text}`);
  if (text.startsWith('public/')) return resolve(text);
  return null;
}

function commandIsDryRunSafe(command) {
  const text = String(command ?? '');
  return !(text.includes('npm run source:accept ') || text.includes('npm run content:accept ')) || text.includes('--dry-run');
}

const queue = await readJson('human sign-off queue', paths.json);
const markdown = await readText('human sign-off markdown', paths.markdown);
const html = await readText('human sign-off html', paths.html);
const verticalSlice = await readJson('vertical slice runway', paths.verticalSlice);
const sourceApprovalRunway = await readJson('source approval runway', paths.sourceApprovalRunway);
await fileOk('human sign-off markdown', paths.markdown, 1024);
await fileOk('human sign-off html', paths.html, 4096);

if (queue?.schema !== 'water9/content-human-signoff-queue@1') failures.push(`unexpected sign-off queue schema ${queue?.schema ?? 'missing'}`);
if (verticalSlice?.schema !== 'water9/content-vertical-slice-runway@1') failures.push(`unexpected vertical slice schema ${verticalSlice?.schema ?? 'missing'}`);
if (sourceApprovalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`unexpected source approval runway schema ${sourceApprovalRunway?.schema ?? 'missing'}`);

const items = Array.isArray(queue?.items) ? queue.items : [];
const verticalItems = Array.isArray(verticalSlice?.items) ? verticalSlice.items : [];
const sourceApprovalItems = Array.isArray(sourceApprovalRunway?.items) ? sourceApprovalRunway.items : [];
if (items.length < minThreats) failures.push(`sign-off queue has ${items.length} items, expected at least ${minThreats}`);
if (items.length !== verticalItems.length) failures.push(`sign-off queue item count ${items.length} does not match vertical slice ${verticalItems.length}`);
if ((queue?.summary?.items ?? -1) !== items.length) failures.push('summary items mismatch');
if ((queue?.summary?.targetThreats ?? -1) !== (verticalSlice?.summary?.targetThreats ?? 20)) failures.push('targetThreats mismatch');
if ((queue?.summary?.acceptedThreats ?? -1) !== items.filter((item) => item.threatAccepted).length) failures.push('acceptedThreats summary mismatch');
if ((queue?.summary?.sourceApproved ?? -1) !== items.filter((item) => item.sourceApproved).length) failures.push('sourceApproved summary mismatch');
if ((queue?.summary?.readyForSourceSignoff ?? -1) !== items.filter((item) => item.sourceApprovalReady && !item.sourceApproved).length) failures.push('readyForSourceSignoff summary mismatch');
if ((queue?.summary?.sourceRegenerationRequired ?? -1) !== items.filter((item) => item.sourceCriticRegenerationRequired && !item.sourceApproved).length) failures.push('sourceRegenerationRequired summary mismatch');
if ((queue?.summary?.sourceBlockedBeforeSignoff ?? -1) !== items.filter((item) => !item.sourceApprovalReady && !item.sourceApproved).length) failures.push('sourceBlockedBeforeSignoff summary mismatch');
if ((queue?.summary?.readyForThreatSignoff ?? -1) !== items.filter((item) => item.sourceApproved && !item.threatAccepted).length) failures.push('readyForThreatSignoff summary mismatch');
if (queue?.summary?.allItemsHaveDryRunCommands !== items.every((item) => (item.commands ?? []).every(commandIsDryRunSafe))) failures.push('allItemsHaveDryRunCommands summary mismatch');
if (queue?.summary?.allItemsHaveEvidenceLinks !== items.every((item) => item.evidence?.sourceQuickReview && item.evidence?.contactSheet && item.evidence?.phaseStrip && item.evidence?.sourceParity && item.evidence?.auditHtml)) failures.push('allItemsHaveEvidenceLinks summary mismatch');

const verticalById = new Map(verticalItems.map((item) => [item.id, item]));
const sourceApprovalById = new Map(sourceApprovalItems.map((item) => [item.id, item]));
const requiredSourceChecks = [
  'whole-creature-cohesion',
  'part-continuity-cohesion',
  'readable-silhouette',
  'no-collage-artifacts',
  'non-placeholder-art-direction',
  'crop-safe-anatomy',
  'clean-magenta-key',
  'gameplay-read',
  'neutral-riggable-pose',
  'visible-attack-lane',
];
const requiredThreatChecks = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];

for (const item of items) {
  const vertical = verticalById.get(item.id);
  const sourceApproval = sourceApprovalById.get(item.id);
  if (!vertical) {
    failures.push(`${item.id}: missing matching vertical slice item`);
    continue;
  }
  if (!sourceApproval) failures.push(`${item.id}: missing matching source approval runway item`);
  if (item.rank !== vertical.rank) failures.push(`${item.id}: rank mismatch`);
  if (item.species !== vertical.species) failures.push(`${item.id}: species mismatch`);
  if (item.routeState !== vertical.routeState) failures.push(`${item.id}: route state mismatch`);
  if (item.mechanicallyReviewable !== Boolean(vertical.mechanicallyReviewable)) failures.push(`${item.id}: mechanicallyReviewable mismatch`);
  if (item.sourceApproved !== Boolean(vertical.sourceReview?.humanApproved)) failures.push(`${item.id}: source approval mismatch`);
  if (item.sourceApprovalReady !== Boolean(item.sourceApproved || sourceApproval?.readyForHumanReview)) failures.push(`${item.id}: sourceApprovalReady mismatch`);
  if (item.sourceMechanicallyReady !== Boolean(sourceApproval?.mechanicallyReadyForHumanReview)) failures.push(`${item.id}: sourceMechanicallyReady mismatch`);
  if (item.sourceCriticRegenerationRequired !== Boolean(sourceApproval?.criticRegenerationRequired)) failures.push(`${item.id}: sourceCriticRegenerationRequired mismatch`);
  if (item.sourceApprovalRunwayState?.readyForHumanReview !== Boolean(sourceApproval?.readyForHumanReview)) failures.push(`${item.id}: sourceApprovalRunwayState ready mismatch`);
  if (item.sourceApprovalRunwayState?.criticRegenerationRequired !== Boolean(sourceApproval?.criticRegenerationRequired)) failures.push(`${item.id}: sourceApprovalRunwayState critic mismatch`);
  if (item.threatAccepted !== Boolean(vertical.acceptance?.accepted)) failures.push(`${item.id}: threat acceptance mismatch`);
  if (item.countsTowardGate !== Boolean(vertical.acceptance?.countsTowardGate)) failures.push(`${item.id}: countsTowardGate mismatch`);
  if (item.rigEvidenceReady !== Boolean(vertical.rigQuality?.ready && vertical.runtimeVisual?.ready && vertical.audit?.ready)) failures.push(`${item.id}: rigEvidenceReady mismatch`);
  if (item.policy?.humanReviewerRequired !== true) failures.push(`${item.id}: policy must require human reviewer`);
  if (item.policy?.automationCannotApprove !== true) failures.push(`${item.id}: policy must state automation cannot approve`);
  if (item.policy?.commandsAreDryRunOnly !== true) failures.push(`${item.id}: policy must require dry-run-only commands`);
  if (item.stage === 'accepted' && !item.threatAccepted) failures.push(`${item.id}: accepted stage without accepted threat`);
  if (item.stage === 'source-signoff' && (item.sourceApproved || !item.sourceApprovalReady)) failures.push(`${item.id}: source-signoff stage with inconsistent approval readiness`);
  if (item.stage === 'source-regeneration' && !item.sourceCriticRegenerationRequired) failures.push(`${item.id}: source-regeneration stage without critic regeneration requirement`);
  if (item.stage === 'source-blocked' && (item.sourceApprovalReady || item.sourceCriticRegenerationRequired)) failures.push(`${item.id}: source-blocked stage with inconsistent source state`);
  if (item.stage === 'threat-signoff' && (!item.sourceApproved || item.threatAccepted)) failures.push(`${item.id}: threat-signoff stage has inconsistent approvals`);
  for (const check of requiredSourceChecks) {
    if (!(item.sourceChecks ?? []).includes(check)) failures.push(`${item.id}: missing source check ${check}`);
  }
  for (const check of requiredThreatChecks) {
    if (!(item.threatChecks ?? []).includes(check)) failures.push(`${item.id}: missing threat check ${check}`);
  }
  for (const command of item.commands ?? []) {
    if (!commandIsDryRunSafe(command)) failures.push(`${item.id}: decision command is not dry-run safe`);
    if (!markdown.includes(command)) failures.push(`${item.id}: markdown missing command ${command}`);
  }
  if (!(item.commands ?? []).some((command) => String(command).includes('npm run source:accept ') && String(command).includes('--dry-run'))) failures.push(`${item.id}: missing source approval dry-run command`);
  if (!(item.commands ?? []).some((command) => String(command).includes('npm run content:accept ') && String(command).includes('--dry-run'))) failures.push(`${item.id}: missing threat acceptance dry-run command`);
  if (!(item.commands ?? []).some((command) => String(command).includes('npm run content:acceptance-audit'))) failures.push(`${item.id}: missing acceptance audit command`);
  for (const evidenceKey of ['sourceQuickReview', 'sourceApprovalRunway', 'sourceImage', 'keyPreview', 'contactSheet', 'contactThumb', 'phaseStrip', 'phaseThumb', 'sourceParity', 'sourceParityThumb', 'auditHtml']) {
    const value = item.evidence?.[evidenceKey];
    if (!value) {
      failures.push(`${item.id}: missing evidence link ${evidenceKey}`);
      continue;
    }
    const localPath = localPathForUrl(value);
    if (localPath) await fileOk(`${item.id}: evidence ${evidenceKey}`, localPath, 512);
  }
  if (!markdown.includes(`\`${item.id}\``)) failures.push(`markdown missing ${item.id}`);
  if (!html.includes(`data-human-signoff-route="${item.id}"`)) failures.push(`html missing sign-off route marker for ${item.id}`);
  for (const value of [item.evidence?.sourceQuickReview, item.evidence?.contactThumb, item.evidence?.phaseThumb, item.evidence?.sourceParityThumb, item.evidence?.auditHtml]) {
    if (value && !htmlIncludes(html, value)) failures.push(`html missing evidence link for ${item.id}: ${value}`);
  }
  if (item.sourceCriticRegenerationRequired) {
    if (!item.blockers?.includes('critic regeneration required before human source approval')) failures.push(`${item.id}: missing critic regeneration blocker`);
    if (!item.evidence?.sourceCriticRegenerationQueue) failures.push(`${item.id}: missing critic regeneration queue link`);
    if (!(item.commands ?? []).some((command) => String(command).includes('source-critic-regeneration-queue.json'))) failures.push(`${item.id}: missing critic regeneration command`);
  }
}

for (const required of [
  'Water9 Human Content Sign-Off Queue',
  'human-only sign-off surface',
  'Automation can package evidence and run dry-runs; it cannot approve source art or accept threats.',
  'human reviewer required; dry-run commands only',
  'npm run content:human-signoff',
  'npm run content:human-signoff-check',
  'source approval runway',
  'critic regeneration',
  'npm run content:goal-gate',
]) {
  if (!markdown.includes(required) && !htmlIncludes(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const summary = {
  schema: 'water9/content-human-signoff-queue-check@1',
  items: items.length,
  acceptedThreats: queue?.summary?.acceptedThreats ?? null,
  nextGate: queue?.summary?.nextGate ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
