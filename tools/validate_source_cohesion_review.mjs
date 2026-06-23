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
  cohesion: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-cohesion-review.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/source-candidates/source-cohesion-review.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-cohesion-review.html')),
  quickReviews: resolve(String(args.get('quick-reviews') ?? 'public/review/source-candidates/quick-reviews/index.json')),
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
};

const failures = [];
const REQUIRED_CHECKS = [
  'whole-creature-cohesion',
  'part-continuity-cohesion',
  'readable-silhouette',
  'no-collage-artifacts',
  'non-placeholder-art-direction',
  'clean-magenta-key',
  'neutral-riggable-pose',
];

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

const cohesion = await readJson('source cohesion review', paths.cohesion);
const quickReviews = await readJson('quick reviews', paths.quickReviews);
const approvalRunway = await readJson('approval runway', paths.approvalRunway);
const planCoverage = await readJson('plan coverage', paths.planCoverage);
const markdown = await readText('source cohesion markdown', paths.markdown);
const html = await readText('source cohesion html', paths.html);

await fileOk('source cohesion json', paths.cohesion, 1024);
await fileOk('source cohesion markdown', paths.markdown, 1024);
await fileOk('source cohesion html', paths.html, 2048);

if (cohesion?.schema !== 'water9/source-cohesion-review@1') failures.push(`cohesion schema is ${cohesion?.schema ?? 'missing'}`);
if (quickReviews?.schema !== 'water9/source-quick-review-index@1') failures.push(`quick reviews schema is ${quickReviews?.schema ?? 'missing'}`);
if (approvalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`approval runway schema is ${approvalRunway?.schema ?? 'missing'}`);
if (planCoverage?.schema !== 'water9/content-plan-coverage@1') failures.push(`plan coverage schema is ${planCoverage?.schema ?? 'missing'}`);

if (cohesion?.policy?.prototypeScreenshotsDoNotCount !== true) failures.push('policy.prototypeScreenshotsDoNotCount must be true');
if (cohesion?.policy?.automationCannotApproveCohesion !== true) failures.push('policy.automationCannotApproveCohesion must be true');
if (cohesion?.policy?.acceptedThreatRequiresHumanSourceApproval !== true) failures.push('policy.acceptedThreatRequiresHumanSourceApproval must be true');
if (cohesion?.policy?.sourceApprovalRequiresSpecificVisualNotes !== true) failures.push('policy.sourceApprovalRequiresSpecificVisualNotes must be true');
if (cohesion?.policy?.cohesiveSourceBeforeRigging !== true) failures.push('policy.cohesiveSourceBeforeRigging must be true');
if (cohesion?.policy?.mechanicalRigPreviewCannotSubstituteForArtApproval !== true) failures.push('policy.mechanicalRigPreviewCannotSubstituteForArtApproval must be true');

const principleIds = new Set((cohesion?.cohesionFirstPrinciples ?? []).map((item) => item.id));
for (const principle of [
  'full-source-concept-first',
  'mechanical-preview-is-not-art-approval',
  'reject-placeholder-cohesion',
]) {
  if (!principleIds.has(principle)) failures.push(`cohesionFirstPrinciples missing ${principle}`);
  if (!markdown.includes(principle)) failures.push(`markdown missing principle ${principle}`);
  if (!includesHtml(html, principle)) failures.push(`html missing principle ${principle}`);
}

const checks = Array.isArray(cohesion?.requiredCohesionChecks) ? cohesion.requiredCohesionChecks : [];
for (const check of REQUIRED_CHECKS) {
  const item = checks.find((entry) => entry.id === check);
  if (!item) failures.push(`required cohesion check missing ${check}`);
  if (item && !String(item.evidence ?? '').trim()) failures.push(`required cohesion check ${check} missing evidence text`);
  if (!markdown.includes(check)) failures.push(`markdown missing check ${check}`);
  if (!includesHtml(html, check)) failures.push(`html missing check ${check}`);
}

const items = Array.isArray(cohesion?.items) ? cohesion.items : [];
const reviews = Array.isArray(quickReviews?.reviews) ? quickReviews.reviews : [];
const approvalItems = Array.isArray(approvalRunway?.items) ? approvalRunway.items : [];
const planItems = Array.isArray(planCoverage?.items) ? planCoverage.items : [];
const reviewById = new Map(reviews.map((item) => [item.id, item]));
const approvalById = new Map(approvalItems.map((item) => [item.id, item]));
const planById = new Map(planItems.map((item) => [item.id, item]));

if (items.length !== reviews.length) failures.push('cohesion item count does not match quick reviews');

for (const item of items) {
  const review = reviewById.get(item.id);
  const approval = approvalById.get(item.id);
  const plan = planById.get(item.id);
  if (!review) failures.push(`${item.id}: missing quick review match`);
  if (!approval) failures.push(`${item.id}: missing approval runway match`);
  if (!plan) failures.push(`${item.id}: missing plan coverage match`);
  if (item.species !== review?.species) failures.push(`${item.id}: species mismatch`);
  const evidenceComplete = Boolean(
    item.links?.source
    && item.links?.keyPreview
    && item.links?.sandboxScreenshot
    && item.links?.planPreview
    && review?.evidence?.imageValidationPassed === true
    && review?.evidence?.sourcePreviewPassed === true,
  );
  const ready = Boolean(review?.readyForHumanReview && approval?.planPreviewPresent && evidenceComplete);
  const humanApproved = Boolean(approval?.humanApproved || review?.evidence?.humanApproved === true);
  if (item.evidenceComplete !== evidenceComplete) failures.push(`${item.id}: evidenceComplete mismatch`);
  if (item.readyForCohesionReview !== ready) failures.push(`${item.id}: readyForCohesionReview mismatch`);
  if (item.humanCohesionApproved !== humanApproved) failures.push(`${item.id}: humanCohesionApproved mismatch`);
  if (item.productionEligible !== humanApproved) failures.push(`${item.id}: productionEligible must mirror human source approval`);
  if (!Array.isArray(item.requiredCohesionChecks)) failures.push(`${item.id}: requiredCohesionChecks missing`);
  for (const check of REQUIRED_CHECKS) {
    if (!item.requiredCohesionChecks?.includes(check)) failures.push(`${item.id}: missing item check ${check}`);
    if (!String(item.commands?.accept ?? '').includes(`--visual-check ${check}`)) failures.push(`${item.id}: accept command missing --visual-check ${check}`);
    if (!String(item.commands?.accept ?? '').includes(`--visual-note ${check}=`)) failures.push(`${item.id}: accept command missing --visual-note ${check}=`);
  }
  if (!String(item.commands?.accept ?? '').includes('--source-reviewed')) failures.push(`${item.id}: accept command missing --source-reviewed`);
  if (!String(item.commands?.quickReview ?? '').includes(`--id ${item.id}`)) failures.push(`${item.id}: quick review command must target id`);
  if (!String(item.commands?.sourceApproval ?? '').includes(`--id ${item.id}`)) failures.push(`${item.id}: source approval command must target id`);
  if (!String(item.commands?.sandboxSource ?? '').includes(`--id ${item.id}`) || !String(item.commands?.sandboxSource ?? '').includes('--kind source')) {
    failures.push(`${item.id}: sandbox source command must target source preview`);
  }
  if (!humanApproved && !item.blockers?.includes('human source cohesion approval is still missing')) {
    failures.push(`${item.id}: unapproved item must retain human approval blocker`);
  }
  if (!String(item.reviewBoundary ?? '').includes(humanApproved ? 'Human-approved source' : 'Prototype/source preview only')) {
    failures.push(`${item.id}: review boundary missing prototype/production label`);
  }
  for (const expected of [
    item.id,
    item.species,
    item.reviewBoundary,
    item.commands?.accept,
    `data-source-cohesion-candidate="${item.id}"`,
  ]) {
    if (expected && !markdown.includes(item.id)) failures.push(`${item.id}: markdown missing id`);
    if (expected && !includesHtml(html, expected)) failures.push(`${item.id}: html missing ${expected}`);
  }
}

if ((cohesion?.summary?.candidates ?? -1) !== items.length) failures.push('summary candidates mismatch');
if ((cohesion?.summary?.readyForCohesionReview ?? -1) !== items.filter((item) => item.readyForCohesionReview && !item.humanCohesionApproved).length) failures.push('summary readyForCohesionReview mismatch');
if ((cohesion?.summary?.humanCohesionApproved ?? -1) !== items.filter((item) => item.humanCohesionApproved).length) failures.push('summary humanCohesionApproved mismatch');
if ((cohesion?.summary?.prototypeLocked ?? -1) !== items.filter((item) => !item.humanCohesionApproved).length) failures.push('summary prototypeLocked mismatch');
if ((cohesion?.summary?.reviewEvidenceComplete ?? -1) !== items.filter((item) => item.evidenceComplete).length) failures.push('summary reviewEvidenceComplete mismatch');
if ((cohesion?.summary?.productionEligible ?? -1) !== items.filter((item) => item.productionEligible).length) failures.push('summary productionEligible mismatch');

for (const expected of [
  'Water 9 Source Cohesion Review',
  'Prototype screenshots do not count toward the strict 20-threat gate',
  'Automation packages evidence; only a human can approve cohesion',
  'Cohesion-First Principles',
  'Full-source concept first',
  'Mechanical rig preview is not art approval',
  'Reject placeholder cohesion',
  'npm run source:cohesion-review && npm run source:cohesion-review-check',
  'npm run source:approval-runway && npm run source:approval-runway-check',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}

const result = {
  schema: 'water9/source-cohesion-review-check@1',
  candidates: cohesion?.summary?.candidates ?? null,
  readyForCohesionReview: cohesion?.summary?.readyForCohesionReview ?? null,
  humanCohesionApproved: cohesion?.summary?.humanCohesionApproved ?? null,
  prototypeLocked: cohesion?.summary?.prototypeLocked ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
