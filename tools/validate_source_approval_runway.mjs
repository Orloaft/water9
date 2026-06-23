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
  runway: resolve(String(args.get('json') ?? 'public/review/source-approval-runway.json')),
  checklist: resolve(String(args.get('checklist') ?? 'public/review/source-approval-checklist.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/source-approval-runway.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-approval-runway.html')),
  quickReviews: resolve(String(args.get('quick-reviews') ?? 'public/review/source-candidates/quick-reviews/index.json')),
  dossier: resolve(String(args.get('dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  criticRegeneration: resolve(String(args.get('critic-regeneration') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
  criticHealth: resolve(String(args.get('critic-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
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

function pathForPublicUrl(url) {
  if (!url) return null;
  const cleanUrl = String(url).split(/[?#]/)[0];
  if (cleanUrl.startsWith('/review/')) return resolve('public', cleanUrl.slice(1));
  if (cleanUrl.startsWith('/assets/')) return resolve('public', cleanUrl.slice(1));
  if (cleanUrl.startsWith('public/')) return resolve(cleanUrl);
  return null;
}

const runway = await readJson('source approval runway', paths.runway);
const checklist = await readJson('source approval checklist', paths.checklist);
const quickReviews = await readJson('quick reviews', paths.quickReviews);
const dossier = await readJson('source review dossier', paths.dossier);
const planCoverage = await readJson('plan coverage', paths.planCoverage);
const criticRegeneration = await readJson('source critic regeneration queue', paths.criticRegeneration);
const criticHealth = await readJson('source critic regeneration health', paths.criticHealth);
const markdown = await readText('source approval runway markdown', paths.markdown);
const html = await readText('source approval runway html', paths.html);
await fileOk('source approval runway json', paths.runway, 1024);
await fileOk('source approval checklist json', paths.checklist, 1024);
await fileOk('source approval runway markdown', paths.markdown, 1024);
await fileOk('source approval runway html', paths.html, 2048);

if (runway?.schema !== 'water9/source-approval-runway@1') failures.push(`runway schema is ${runway?.schema ?? 'missing'}`);
if (checklist?.schema !== 'water9/source-approval-checklist@1') failures.push(`checklist schema is ${checklist?.schema ?? 'missing'}`);
if (quickReviews?.schema !== 'water9/source-quick-review-index@1') failures.push(`quick reviews schema is ${quickReviews?.schema ?? 'missing'}`);
if (dossier?.schema !== 'water9/source-review-dossier@1') failures.push(`dossier schema is ${dossier?.schema ?? 'missing'}`);
if (planCoverage?.schema !== 'water9/content-plan-coverage@1') failures.push(`plan coverage schema is ${planCoverage?.schema ?? 'missing'}`);
if (criticRegeneration?.schema !== 'water9/source-critic-regeneration-queue@1') failures.push(`critic regeneration schema is ${criticRegeneration?.schema ?? 'missing'}`);
if (criticHealth?.schema !== 'water9/source-critic-regeneration-health@1') failures.push(`critic health schema is ${criticHealth?.schema ?? 'missing'}`);

const items = Array.isArray(runway?.items) ? runway.items : [];
const checklistItems = Array.isArray(checklist?.items) ? checklist.items : [];
const reviewById = new Map((quickReviews?.reviews ?? []).map((item) => [item.id, item]));
const dossierById = new Map((dossier?.items ?? []).map((item) => [item.id, item]));
const planById = new Map((planCoverage?.items ?? []).map((item) => [item.id, item]));
const checklistById = new Map(checklistItems.map((item) => [item.id, item]));
const regenerationById = new Map((criticRegeneration?.candidates ?? []).map((item) => [item.id, item]));
const criticHealthById = new Map((criticHealth?.items ?? []).map((item) => [item.id, item]));
if (items.length !== (quickReviews?.reviews ?? []).length) failures.push('runway item count does not match quick reviews');
if (checklistItems.length !== items.length) failures.push('checklist item count does not match runway items');

const requiredVisualChecks = [
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

for (const item of items) {
  const review = reviewById.get(item.id);
  const dossierItem = dossierById.get(item.id);
  const plan = planById.get(item.id);
  const checklistItem = checklistById.get(item.id);
  const healthItem = criticHealthById.get(item.id) ?? null;
  const regenerationItem = healthItem?.status === 'replacement-applied'
    ? null
    : regenerationById.get(item.id);
  const mechanicallyReady = review?.readyForHumanReview === true && plan?.artifacts?.planPreview?.exists === true;
  const criticRegenerationRequired = Boolean(regenerationItem);
  if (!review) failures.push(`${item.id}: missing matching quick review`);
  if (!dossierItem) failures.push(`${item.id}: missing matching source review dossier item`);
  if (!plan) failures.push(`${item.id}: missing matching plan coverage`);
  if (!checklistItem) failures.push(`${item.id}: missing matching checklist item`);
  if (item.species !== review?.species) failures.push(`${item.id}: species mismatch`);
  if (item.planPreviewPresent !== (plan?.artifacts?.planPreview?.exists === true)) failures.push(`${item.id}: planPreviewPresent mismatch`);
  if (item.mechanicallyReadyForHumanReview !== mechanicallyReady) failures.push(`${item.id}: mechanicallyReadyForHumanReview mismatch`);
  if (item.criticRegenerationRequired !== criticRegenerationRequired) failures.push(`${item.id}: criticRegenerationRequired mismatch`);
  if ((item.criticRegenerationHealthStatus ?? null) !== (healthItem?.status ?? null)) failures.push(`${item.id}: criticRegenerationHealthStatus mismatch`);
  if (item.readyForHumanReview !== (mechanicallyReady && !criticRegenerationRequired)) failures.push(`${item.id}: readyForHumanReview mismatch`);
  if (criticRegenerationRequired) {
    if (!item.criticRegeneration) failures.push(`${item.id}: missing criticRegeneration blocker`);
    if (item.criticRegeneration?.recommendation !== 'regenerate') failures.push(`${item.id}: criticRegeneration recommendation must be regenerate`);
    if (!String(item.criticRegeneration?.reason ?? '').includes('regeneration before approval')) failures.push(`${item.id}: criticRegeneration reason missing approval blocker`);
    if (item.criticRegeneration?.promptFile !== regenerationItem?.promptFile) failures.push(`${item.id}: criticRegeneration promptFile mismatch`);
    if (item.criticRegeneration?.regenerationQueue !== '/review/source-candidates/source-critic-regeneration-queue.html') failures.push(`${item.id}: criticRegeneration queue link mismatch`);
    if (!String(item.criticRegeneration?.commands?.generateOpenAiDryRun ?? '').includes('--queue public/review/source-candidates/source-critic-regeneration-queue.json')) failures.push(`${item.id}: criticRegeneration missing OpenAI dry-run command`);
    if (!String(item.criticRegeneration?.commands?.sourcePreview ?? '').includes('--with diver')) failures.push(`${item.id}: criticRegeneration missing source preview command`);
  } else if (item.criticRegeneration) {
    failures.push(`${item.id}: criticRegeneration blocker present without queue item`);
  }
  if (item.humanApproved !== (review?.evidence?.humanApproved === true || dossierItem?.approved === true)) failures.push(`${item.id}: humanApproved mismatch`);
  if (!item.links?.source) failures.push(`${item.id}: missing source link`);
  if (!item.links?.keyPreview) failures.push(`${item.id}: missing key preview link`);
  if (!item.links?.sandboxScreenshot) failures.push(`${item.id}: missing sandbox screenshot link`);
  const expectedSandboxLab = `/review/sandbox/lab.html?id=source-${item.id}&with=diver`;
  const expectedSourceSandboxLive = `/?entity=source-${item.id}&companion=diver`;
  const expectedRuntimeSandboxLive = `/?sandbox=${item.id}&companion=diver`;
  if (item.links?.sandboxLab !== expectedSandboxLab) failures.push(`${item.id}: sandbox lab link must be ${expectedSandboxLab}`);
  if (item.links?.sourceSandboxLive !== expectedSourceSandboxLive) failures.push(`${item.id}: source sandbox live link must be ${expectedSourceSandboxLive}`);
  if (item.links?.runtimeSandboxLive !== expectedRuntimeSandboxLive) failures.push(`${item.id}: runtime sandbox live link must be ${expectedRuntimeSandboxLive}`);
  if (!item.links?.planPreview) failures.push(`${item.id}: missing plan preview link`);
  for (const [label, url] of Object.entries(item.links ?? {})) {
    const path = pathForPublicUrl(url);
    if (path) await fileOk(`${item.id}: linked artifact ${label}`, path, label === 'reviewPacket' ? 128 : 512);
  }
  if (!String(item.acceptCommand ?? '').includes(`--id ${item.id}`)) failures.push(`${item.id}: accept command must target id`);
  if (!String(item.acceptCommand ?? '').includes('--source-reviewed')) failures.push(`${item.id}: accept command must require --source-reviewed`);
  if (!String(item.acceptCommand ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${item.id}: accept command must require source visual board evidence`);
  if (!String(item.acceptCommandDryRun ?? '').includes(`--id ${item.id}`)) failures.push(`${item.id}: dry-run accept command must target id`);
  if (!String(item.acceptCommandDryRun ?? '').includes('--dry-run')) failures.push(`${item.id}: dry-run accept command must include --dry-run`);
  if (!String(item.rejectCommandDryRun ?? '').includes(`--id ${item.id}`)) failures.push(`${item.id}: dry-run reject command must target id`);
  if (!String(item.rejectCommandDryRun ?? '').includes('--dry-run')) failures.push(`${item.id}: dry-run reject command must include --dry-run`);
  if (!String(item.rejectCommand ?? '').includes('--source-rejected')) failures.push(`${item.id}: reject command must require --source-rejected`);
  if (!String(item.rejectCommand ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${item.id}: reject command must require source visual board evidence`);
  if (!String(item.rejectCommand ?? '').includes('--failed-check ')) failures.push(`${item.id}: reject command must include a failed visual check`);
  if (!String(item.rejectCommand ?? '').includes('--visual-note ')) failures.push(`${item.id}: reject command must include failed-check visual evidence note`);
  if (!String(item.rejectCommandDryRun ?? '').includes('--source-rejected')) failures.push(`${item.id}: dry-run reject command must require --source-rejected`);
  if (!String(item.rejectCommandDryRun ?? '').includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${item.id}: dry-run reject command must require source visual board evidence`);
  if (!String(item.rejectCommandDryRun ?? '').includes('--failed-check ')) failures.push(`${item.id}: dry-run reject command must include a failed visual check`);
  for (const check of requiredVisualChecks) {
    if (!String(item.acceptCommand ?? '').includes(`--visual-check ${check}`)) failures.push(`${item.id}: accept command missing --visual-check ${check}`);
    if (!String(item.acceptCommand ?? '').includes(`--score ${check}=`)) failures.push(`${item.id}: accept command missing --score ${check}`);
    if (!String(item.acceptCommand ?? '').includes(`--visual-note ${check}=`) && !String(item.acceptCommand ?? '').includes(`--visual-note ${check}='<`)) {
      failures.push(`${item.id}: accept command missing --visual-note ${check}`);
    }
  }
  if (!String(item.rejectCommand ?? '').includes(`--id ${item.id}`)) failures.push(`${item.id}: reject command must target id`);
  if (!String(item.commands?.productionPrepare ?? '').includes(`--id ${item.id}`)) failures.push(`${item.id}: production prepare command must target id`);
  if (String(item.commands?.productionPrepare ?? '').includes('--allow-unapproved')) failures.push(`${item.id}: production prepare must not include --allow-unapproved`);
  const expectedSourcePreviewCommand = `npm run sandbox:preview -- --id source-${item.id} --with diver --serve --open --visual`;
  const expectedRuntimePreviewCommand = `npm run sandbox:preview -- --id ${item.id} --with diver --serve --open --visual`;
  if (item.commands?.sandboxLab !== expectedSourcePreviewCommand) failures.push(`${item.id}: sandboxLab command must be ${expectedSourcePreviewCommand}`);
  if (item.commands?.sourceSandboxLive !== expectedSourcePreviewCommand) failures.push(`${item.id}: sourceSandboxLive command must be ${expectedSourcePreviewCommand}`);
  if (item.commands?.runtimeSandboxLive !== expectedRuntimePreviewCommand) failures.push(`${item.id}: runtimeSandboxLive command must be ${expectedRuntimePreviewCommand}`);
  if (!String(item.reviewWarning ?? '').includes(item.humanApproved ? 'Approved source' : 'Not approved')) failures.push(`${item.id}: review warning missing approval boundary`);
  if (checklistItem) {
    if (checklistItem.species !== item.species) failures.push(`${item.id}: checklist species mismatch`);
    if (checklistItem.readyForHumanReview !== item.readyForHumanReview) failures.push(`${item.id}: checklist readyForHumanReview mismatch`);
    if (checklistItem.mechanicallyReadyForHumanReview !== item.mechanicallyReadyForHumanReview) failures.push(`${item.id}: checklist mechanicallyReadyForHumanReview mismatch`);
    if (checklistItem.criticRegenerationRequired !== item.criticRegenerationRequired) failures.push(`${item.id}: checklist criticRegenerationRequired mismatch`);
    if (JSON.stringify(checklistItem.criticRegeneration ?? null) !== JSON.stringify(item.criticRegeneration ?? null)) failures.push(`${item.id}: checklist criticRegeneration mismatch`);
    if (checklistItem.humanApproved !== item.humanApproved) failures.push(`${item.id}: checklist humanApproved mismatch`);
    const expectedState = item.humanApproved ? 'approved' : item.readyForHumanReview ? 'awaiting-human-source-approval' : 'blocked-before-human-review';
    if (checklistItem.state !== expectedState) failures.push(`${item.id}: checklist state ${checklistItem.state ?? 'missing'} expected ${expectedState}`);
    const evidence = Array.isArray(checklistItem.requiredEvidence) ? checklistItem.requiredEvidence : [];
    const evidenceLabels = evidence.map((entry) => entry.label);
    for (const requiredLabel of ['source image', 'magenta key preview', 'sandbox source preview', 'live sandbox lab', 'live source sandbox', 'live runtime sandbox', 'articulation plan preview', 'quick review packet']) {
      if (!evidenceLabels.includes(requiredLabel)) failures.push(`${item.id}: checklist missing evidence label ${requiredLabel}`);
      if (!Array.isArray(checklistItem.requiredEvidenceLabels) || !checklistItem.requiredEvidenceLabels.includes(requiredLabel)) {
        failures.push(`${item.id}: checklist requiredEvidenceLabels missing ${requiredLabel}`);
      }
    }
    if (!evidence.every((entry) => entry.present === true && String(entry.url ?? '').trim())) failures.push(`${item.id}: checklist evidence must all be present with URLs`);
    for (const check of requiredVisualChecks) {
      if (!Array.isArray(checklistItem.requiredVisualChecks) || !checklistItem.requiredVisualChecks.includes(check)) failures.push(`${item.id}: checklist missing visual check ${check}`);
    }
    if (!Array.isArray(checklistItem.blockers) || (!item.humanApproved && !checklistItem.blockers.includes('human source approval missing'))) {
      failures.push(`${item.id}: checklist blockers must preserve missing human approval`);
    }
    if (criticRegenerationRequired && !checklistItem.blockers.includes('critic regeneration required before human approval')) {
      failures.push(`${item.id}: checklist missing critic regeneration blocker`);
    }
    if (!checklistItem.contract?.contractMarkdown || !checklistItem.contract?.contractJson) failures.push(`${item.id}: checklist missing contract paths`);
    if (!Array.isArray(checklistItem.contract?.requiredRead) || checklistItem.contract.requiredRead.length < 3) failures.push(`${item.id}: checklist missing contract requiredRead`);
    if (!Array.isArray(checklistItem.contract?.articulatableParts) || checklistItem.contract.articulatableParts.length < 3) failures.push(`${item.id}: checklist missing articulatableParts`);
    if (!Array.isArray(checklistItem.contract?.promptRisks) || checklistItem.contract.promptRisks.length < 3) failures.push(`${item.id}: checklist missing promptRisks`);
    if (!Array.isArray(checklistItem.contract?.contractReviewChecklist) || checklistItem.contract.contractReviewChecklist.length < 1) failures.push(`${item.id}: checklist missing contractReviewChecklist`);
    if (checklistItem.contract?.contractMarkdown !== dossierItem?.contract?.contractMarkdown) failures.push(`${item.id}: checklist contractMarkdown mismatch`);
    if (checklistItem.diagnostics?.inputFingerprint !== dossierItem?.reviewItem?.inputFingerprint) failures.push(`${item.id}: checklist inputFingerprint mismatch`);
    if (!checklistItem.diagnostics?.imageValidationMetric?.sourceFingerprint?.sha256) failures.push(`${item.id}: checklist missing source fingerprint sha256`);
    if (checklistItem.diagnostics?.imageValidationMetric?.checked !== true) failures.push(`${item.id}: checklist image validation metric is not checked`);
    if (Array.isArray(checklistItem.diagnostics?.imageValidationMetric?.failures) && checklistItem.diagnostics.imageValidationMetric.failures.length) failures.push(`${item.id}: checklist image validation contains failures`);
    if (checklistItem.diagnostics?.sourcePreview?.hasPreviewSprite !== true) failures.push(`${item.id}: checklist source preview missing sprite proof`);
    if (!checklistItem.diagnostics?.sourcePreview?.canvas || checklistItem.diagnostics.sourcePreview.canvas.variedSamples < 8) failures.push(`${item.id}: checklist source preview canvas evidence is weak`);
    for (const flag of dossierItem?.reviewItem?.requiredApprovalFlags ?? []) {
      if (!Array.isArray(checklistItem.diagnostics?.requiredApprovalFlags) || !checklistItem.diagnostics.requiredApprovalFlags.includes(flag)) {
        failures.push(`${item.id}: checklist missing required approval flag ${flag}`);
      }
    }
    if (checklistItem.commands?.accept !== item.acceptCommand) failures.push(`${item.id}: checklist accept command mismatch`);
    if (checklistItem.commands?.acceptDryRun !== item.acceptCommandDryRun) failures.push(`${item.id}: checklist accept dry-run command mismatch`);
    if (checklistItem.commands?.reject !== item.rejectCommand) failures.push(`${item.id}: checklist reject command mismatch`);
    if (checklistItem.commands?.rejectDryRun !== item.rejectCommandDryRun) failures.push(`${item.id}: checklist reject dry-run command mismatch`);
    if (checklistItem.commands?.sandboxLab !== item.commands?.sandboxLab) failures.push(`${item.id}: checklist sandboxLab command mismatch`);
    if (checklistItem.commands?.sourceSandboxLive !== item.commands?.sourceSandboxLive) failures.push(`${item.id}: checklist sourceSandboxLive command mismatch`);
    if (checklistItem.commands?.runtimeSandboxLive !== item.commands?.runtimeSandboxLive) failures.push(`${item.id}: checklist runtimeSandboxLive command mismatch`);
  }
  if (!markdown.includes(item.acceptCommandDryRun)) failures.push(`${item.id}: markdown missing dry-run accept command`);
  for (const expected of [
    item.id,
    item.species,
    item.acceptCommand,
    item.links?.sandboxLab,
    item.links?.sourceSandboxLive,
    item.links?.runtimeSandboxLive,
    item.commands?.sourceSandboxLive,
    item.commands?.runtimeSandboxLive,
    `data-source-approval-candidate="${item.id}"`,
  ]) {
    if (!markdown.includes(item.id)) failures.push(`${item.id}: markdown missing id`);
    if (!includesHtml(html, expected)) failures.push(`${item.id}: html missing ${expected}`);
  }
}

if ((runway?.summary?.candidates ?? -1) !== items.length) failures.push('summary candidates mismatch');
if ((runway?.summary?.mechanicallyReadyForHumanReview ?? -1) !== items.filter((item) => item.mechanicallyReadyForHumanReview && !item.humanApproved).length) failures.push('summary mechanicallyReadyForHumanReview mismatch');
if ((runway?.summary?.criticRegenerationRequired ?? -1) !== items.filter((item) => item.criticRegenerationRequired && !item.humanApproved).length) failures.push('summary criticRegenerationRequired mismatch');
if ((runway?.summary?.readyForHumanReview ?? -1) !== items.filter((item) => item.readyForHumanReview && !item.humanApproved).length) failures.push('summary readyForHumanReview mismatch');
if ((runway?.summary?.humanApproved ?? -1) !== items.filter((item) => item.humanApproved).length) failures.push('summary humanApproved mismatch');
if ((runway?.summary?.planPreviewsPresent ?? -1) !== items.filter((item) => item.planPreviewPresent).length) failures.push('summary planPreviewsPresent mismatch');
if ((runway?.summary?.missingPlanPreviews ?? -1) !== items.filter((item) => !item.planPreviewPresent).length) failures.push('summary missingPlanPreviews mismatch');
if ((checklist?.summary?.candidates ?? -1) !== items.length) failures.push('checklist summary candidates mismatch');
if ((checklist?.summary?.mechanicallyReadyForHumanReview ?? -1) !== items.filter((item) => item.mechanicallyReadyForHumanReview && !item.humanApproved).length) failures.push('checklist summary mechanicallyReadyForHumanReview mismatch');
if ((checklist?.summary?.criticRegenerationRequired ?? -1) !== items.filter((item) => item.criticRegenerationRequired && !item.humanApproved).length) failures.push('checklist summary criticRegenerationRequired mismatch');
if ((checklist?.summary?.pendingHumanApproval ?? -1) !== items.filter((item) => item.readyForHumanReview && !item.humanApproved).length) failures.push('checklist summary pendingHumanApproval mismatch');
for (const check of requiredVisualChecks) {
  if (!Array.isArray(checklist?.requiredVisualChecks) || !checklist.requiredVisualChecks.includes(check)) failures.push(`checklist root missing visual check ${check}`);
}
if (runway?.recommended && !items.some((item) => item.id === runway.recommended.id)) failures.push('recommended candidate not in items');
for (const expected of [
  'Water 9 Source Approval Runway',
  'Automation can prove readiness; it cannot approve the art',
  'Human review queue for source images',
  'Human Approval Boundary',
  'Recommended Dry-Run Command',
  'Live Sandbox Review',
  'Critic Regeneration Blockers',
  'Approval-ready after critic blockers',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}

for (const expected of [
  'Human Approval Command Builder',
  'data-source-approval-command-builder',
  'data-build-command',
  'data-copy-command',
  'data-command-output',
  'source-approval-checklist.json',
  'source-visual-board.html',
]) {
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}
if (!markdown.includes('source:visual-board')) failures.push('markdown missing source visual board command');

if (markdown.includes('Human Approval Command Builder')) failures.push('markdown should not include browser-only command builder controls');

const summary = {
  schema: 'water9/source-approval-runway-check@1',
  candidates: runway?.summary?.candidates ?? null,
  readyForHumanReview: runway?.summary?.readyForHumanReview ?? null,
  humanApproved: runway?.summary?.humanApproved ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
