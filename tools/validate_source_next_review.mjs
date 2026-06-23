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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-next-review.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-next-review.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-next-review.html')),
  dossier: resolve(String(args.get('dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
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

async function fileOk(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

function textIncludesHtml(text, needle) {
  const htmlNeedle = String(needle ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return text.includes(String(needle ?? '')) || text.includes(htmlNeedle);
}

const report = await readJson('source next review report', paths.json);
const dossier = await readJson('source review dossier', paths.dossier);
const approvalRunway = await readJson('source approval runway', paths.approvalRunway);
const markdown = await readText('source next review markdown', paths.markdown);
const html = await readText('source next review html', paths.html);
await fileOk('source next review markdown', paths.markdown, 1024);
await fileOk('source next review html', paths.html, 4096);

if (report?.schema !== 'water9/source-next-review@1') failures.push(`unexpected schema ${report?.schema ?? 'missing'}`);
if (dossier?.schema !== 'water9/source-review-dossier@1') failures.push(`unexpected dossier schema ${dossier?.schema ?? 'missing'}`);
if (approvalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`unexpected approval runway schema ${approvalRunway?.schema ?? 'missing'}`);
if ((report?.summary?.candidates ?? -1) !== (dossier?.summary?.candidateCount ?? -2)) failures.push('candidate count mismatch with dossier');
if ((report?.summary?.mechanicallyReadyForHumanReview ?? -1) !== (approvalRunway?.summary?.mechanicallyReadyForHumanReview ?? -2)) failures.push('mechanicallyReadyForHumanReview mismatch with approval runway');
if ((report?.summary?.criticRegenerationRequired ?? -1) !== (approvalRunway?.summary?.criticRegenerationRequired ?? -2)) failures.push('criticRegenerationRequired mismatch with approval runway');
if ((report?.summary?.readyForHumanReview ?? -1) !== (approvalRunway?.summary?.readyForHumanReview ?? -2)) failures.push('readyForHumanReview mismatch with approval runway');
if ((report?.summary?.humanApproved ?? -1) !== (approvalRunway?.summary?.humanApproved ?? -2)) failures.push('humanApproved mismatch with approval runway');
if (report?.summary?.nextGate !== 'human source approval') failures.push('nextGate must be human source approval');

const target = report?.target ?? null;
const readyRunwayItems = (approvalRunway?.items ?? []).filter((item) => item.readyForHumanReview === true && item.humanApproved !== true);
const expectedTarget = readyRunwayItems[0] ?? null;
if ((report?.summary?.readyForHumanReview ?? 0) > 0 && !target) failures.push('target missing while ready sources exist');
if (target && expectedTarget && target.id !== expectedTarget.id) failures.push(`target should match first approval-ready runway item ${expectedTarget.id}, got ${target.id}`);
if (target) {
  const runwayItem = (approvalRunway?.items ?? []).find((item) => item.id === target.id);
  const recommended = (dossier?.items ?? []).find((item) => item.id === target.id) ?? null;
  if (!runwayItem) failures.push(`${target.id}: missing from approval runway`);
  if (runwayItem?.criticRegenerationRequired) failures.push(`${target.id}: target must not require critic regeneration`);
  if (target.species !== (runwayItem?.species ?? recommended?.species)) failures.push(`${target.id}: species mismatch`);
  if (target.readyForHumanReview !== true) failures.push(`${target.id}: target must be readyForHumanReview`);
  if (target.humanApproved !== false && (report?.summary?.humanApproved ?? 0) < (report?.summary?.candidates ?? 20)) failures.push(`${target.id}: target should not be humanApproved before gate completion`);
  if (!String(target.reviewWarning ?? '').includes('Not approved')) failures.push(`${target.id}: missing explicit not-approved warning`);
  for (const key of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview']) {
    if (!target.media?.[key]) failures.push(`${target.id}: missing media.${key}`);
    if (target.media?.[key] && !markdown.includes(target.media[key]) && !textIncludesHtml(html, target.media[key])) failures.push(`${target.id}: rendered output missing media.${key}`);
  }
  for (const [key, expected] of Object.entries({
    approvalRunway: '/review/source-approval-runway.html',
    visualBoard: '/review/source-visual-board.html',
    dossier: '/review/source-candidates/source-review-dossier.html',
    batchDecisionWorkspace: '/review/source-candidates/source-cohesion-decision-template.html',
    quickReview: `/review/source-candidates/quick-reviews/${target.id}.html`,
    sandboxLab: `/review/sandbox/lab.html?id=source-${target.id}&with=diver`,
    sourceSandboxLive: `/?entity=source-${target.id}&companion=diver`,
    runtimeSandboxLive: `/?sandbox=${target.id}&companion=diver`,
  })) {
    if (target.links?.[key] !== expected) failures.push(`${target.id}: links.${key} must be ${expected}`);
  }
  for (const key of ['reviewPacket', 'contractMarkdown']) {
    if (!target.links?.[key]) failures.push(`${target.id}: missing links.${key}`);
  }
  for (const key of ['sourcePreview', 'runtimePreview', 'approvalRunway', 'batchWorkspace', 'batchApplyStrict', 'acceptDryRun', 'rejectDryRun']) {
    if (!target.commands?.[key]) failures.push(`${target.id}: missing commands.${key}`);
    if (target.commands?.[key] && !markdown.includes(target.commands[key]) && !textIncludesHtml(html, target.commands[key])) failures.push(`${target.id}: rendered output missing commands.${key}`);
  }
  for (const key of ['acceptDryRun', 'rejectDryRun']) {
    const command = String(target.commands?.[key] ?? '');
    if (!command.includes('--dry-run')) failures.push(`${target.id}: ${key} must be dry-run only`);
    if (!command.includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${target.id}: ${key} must require source visual board evidence`);
  }
  if (!String(target.commands?.batchApplyStrict ?? '').includes('water9-source-cohesion-reviewed-decisions.json')) {
    failures.push(`${target.id}: batchApplyStrict must use reviewed decision filename`);
  }
  if (!Array.isArray(target.requiredRead) || target.requiredRead.length < 3) failures.push(`${target.id}: requiredRead incomplete`);
  if (!Array.isArray(target.contractReviewChecklist) || target.contractReviewChecklist.length < 2) failures.push(`${target.id}: contractReviewChecklist incomplete`);
  const starter = target.focusedDecisionStarter;
  const starterDecision = starter?.decisions?.[0];
  if (starter?.schema !== 'water9/source-cohesion-decisions@1') failures.push(`${target.id}: focused decision starter schema mismatch`);
  if (starter?.reviewer !== '<human-reviewer>') failures.push(`${target.id}: focused decision starter missing reviewer placeholder`);
  if (starter?.reviewedAt !== '<YYYY-MM-DD>') failures.push(`${target.id}: focused decision starter missing reviewedAt placeholder`);
  if (starter?.policy?.humanAuthored !== true) failures.push(`${target.id}: focused decision starter must preserve humanAuthored policy`);
  if (starter?.policy?.automationCannotApproveCohesion !== true) failures.push(`${target.id}: focused decision starter must preserve automation boundary policy`);
  if (starter?.policy?.inspectSourceKeySandboxAndPlan !== true) failures.push(`${target.id}: focused decision starter must preserve inspection policy`);
  if (!Array.isArray(starter?.instructions) || starter.instructions.length < 3) failures.push(`${target.id}: focused decision starter missing instructions`);
  if (!Array.isArray(starter?.decisions) || starter.decisions.length !== 1) failures.push(`${target.id}: focused decision starter must contain exactly one decision`);
  if (starterDecision?.id !== target.id) failures.push(`${target.id}: focused decision starter decision id mismatch`);
  if (starterDecision?.species !== target.species) failures.push(`${target.id}: focused decision starter species mismatch`);
  if (starterDecision?.reviewer !== '<human-reviewer>') failures.push(`${target.id}: focused decision starter decision missing reviewer placeholder`);
  if (starterDecision?.reviewedAt !== '<YYYY-MM-DD>') failures.push(`${target.id}: focused decision starter decision missing reviewedAt placeholder`);
  if (starterDecision?.status !== 'needs-review') failures.push(`${target.id}: focused decision starter must default to needs-review`);
  if (starterDecision?.overallNote !== '') failures.push(`${target.id}: focused decision starter must default to empty overallNote`);
  if (!Array.isArray(starterDecision?.failedChecks) || starterDecision.failedChecks.length !== 0) failures.push(`${target.id}: focused decision starter failedChecks must default empty`);
  if (starterDecision?.evidenceFingerprint?.schema !== 'water9/source-cohesion-evidence-fingerprint@1') failures.push(`${target.id}: focused decision starter missing evidence fingerprint schema`);
  if (!starterDecision?.evidenceFingerprint?.digest) failures.push(`${target.id}: focused decision starter missing evidence fingerprint digest`);
  for (const key of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview']) {
    const media = starterDecision?.evidenceFingerprint?.files?.[key];
    if (media?.exists !== true || !media?.sha256 || !media?.size) failures.push(`${target.id}: focused decision starter missing valid ${key} evidence fingerprint`);
  }
  const visualChecks = Object.keys(starterDecision?.visualChecks ?? {});
  if (visualChecks.length < 10) failures.push(`${target.id}: focused decision starter visual checks incomplete`);
  for (const check of visualChecks) {
    const value = starterDecision.visualChecks[check];
    if (value?.score !== null) failures.push(`${target.id}: focused decision starter ${check} score must default null`);
    if (value?.note !== '') failures.push(`${target.id}: focused decision starter ${check} note must default empty`);
  }
  for (const required of [
    'Water9 Next Source Review',
    'Focused review packet',
    'does not approve anything',
    'Gate truth:',
    'not approved yet',
    'Dry-Run Commands',
    'Focused Decision JSON Starter',
    'data-source-next-review-decision-json',
    '"schema": "water9/source-cohesion-decisions@1"',
    '"reviewer": "<human-reviewer>"',
    '"status": "needs-review"',
    '"failedChecks": []',
    `data-source-next-review-target="${target.id}"`,
  ]) {
    if (!markdown.includes(required) && !textIncludesHtml(html, required)) failures.push(`rendered output missing ${required}`);
  }
}

const summary = {
  schema: 'water9/source-next-review-check@1',
  target: target?.id ?? null,
  readyForHumanReview: report?.summary?.readyForHumanReview ?? 0,
  humanApproved: report?.summary?.humanApproved ?? 0,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
