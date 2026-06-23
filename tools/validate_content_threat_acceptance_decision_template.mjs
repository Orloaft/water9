import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { threatAcceptedForContentGate } from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  template: resolve(String(args.get('json') ?? 'public/review/content-threat-acceptance-decision-template.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/content-threat-acceptance-decision-template.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-threat-acceptance-decision-template.html')),
  review: resolve(String(args.get('review') ?? 'public/review/articulated/review-manifest.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
};
const REQUIRED_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
const REQUIRED_FLAGS = [
  '--evidence-fingerprint',
  '--source-reviewed',
  '--contact-reviewed',
  '--phase-reviewed',
  '--parity-reviewed',
  '--sandbox-reviewed',
  '--dry-run',
];
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

const template = await readJson('threat acceptance decision template', paths.template);
const review = await readJson('articulated review manifest', paths.review);
const runtime = await readJson('runtime manifest', paths.runtime);
const sourceCandidates = await readJson('source candidates', paths.sourceCandidates);
const stageBoard = await readJson('content stage board', paths.stageBoard);
const markdown = await readText('threat acceptance decision template markdown', paths.markdown);
const html = await readText('threat acceptance decision template html', paths.html);

await fileOk('threat acceptance decision template json', paths.template, 1024);
await fileOk('threat acceptance decision template markdown', paths.markdown, 512);
await fileOk('threat acceptance decision template html', paths.html, 2048);

if (template?.schema !== 'water9/content-threat-acceptance-decision-template@1') failures.push(`template schema is ${template?.schema ?? 'missing'}`);
if (review?.schema !== 'water9/articulated-review@1') failures.push(`articulated review schema is ${review?.schema ?? 'missing'}`);
if (runtime?.schema !== 'asset-forge/sprite-parts@1') failures.push(`runtime schema is ${runtime?.schema ?? 'missing'}`);
if (sourceCandidates?.schema !== 'water9/source-candidates@1') failures.push(`source candidates schema is ${sourceCandidates?.schema ?? 'missing'}`);
if (stageBoard?.schema !== 'water9/content-stage-board@1') failures.push(`content stage board schema is ${stageBoard?.schema ?? 'missing'}`);
if (template?.decisionFileTemplate?.schema !== 'water9/content-threat-acceptance-decisions@1') failures.push('decisionFileTemplate schema mismatch');
if (template?.decisionFileTemplate?.policy?.humanAuthored !== true) failures.push('decisionFileTemplate policy.humanAuthored must be true');
if (template?.decisionFileTemplate?.policy?.automationCannotAcceptThreats !== true) failures.push('decisionFileTemplate policy.automationCannotAcceptThreats must be true');
if (template?.decisionFileTemplate?.policy?.inspectSourceContactPhaseParityAndSandbox !== true) failures.push('decisionFileTemplate policy.inspectSourceContactPhaseParityAndSandbox must be true');

const reviewCreatures = Array.isArray(review?.creatures) ? review.creatures : [];
const stageTargets = Array.isArray(stageBoard?.targets) ? stageBoard.targets : [];
const targetIds = stageTargets.map((target) => target.rigId ?? target.id).filter(Boolean);
const scopedReviewCreatures = template?.scope?.mode === 'all-registered'
  ? reviewCreatures
  : reviewCreatures.filter((creature) => targetIds.includes(creature.id));
const decisions = Array.isArray(template?.decisions) ? template.decisions : [];
const fileDecisions = Array.isArray(template?.decisionFileTemplate?.decisions) ? template.decisionFileTemplate.decisions : [];
const requiredChecks = Array.isArray(template?.requiredChecks) ? template.requiredChecks : [];
const runtimeById = new Map((runtime?.creatures ?? []).map((creature) => [creature.id, creature]));
const sourceById = new Map((sourceCandidates?.candidates ?? []).map((candidate) => [candidate.id, candidate]));
if (!['target-threats', 'all-registered'].includes(template?.scope?.mode)) failures.push(`template scope mode is ${template?.scope?.mode ?? 'missing'}`);
const expectedScopeDescription = template?.scope?.mode === 'all-registered'
  ? 'all registered articulated rigs'
  : 'the 20 target threats required by the strict content gate';
if (template?.scope?.mode === 'target-threats') {
  if ((template?.scope?.targetThreats ?? -1) !== (stageBoard?.summary?.targetThreats ?? targetIds.length)) failures.push('target-threats scope targetThreats mismatch');
  if ((template?.scope?.includedIds ?? []).length !== targetIds.length) failures.push('target-threats scope includedIds count mismatch');
  for (const id of targetIds) {
    if (!(template?.scope?.includedIds ?? []).includes(id)) failures.push(`target-threats scope missing ${id}`);
  }
  if (!Array.isArray(template?.scope?.excludedRegisteredRigs)) failures.push('target-threats scope missing excludedRegisteredRigs');
}
if (template?.scope?.mode === 'all-registered' && (template?.scope?.includedIds ?? []).length !== reviewCreatures.length) {
  failures.push('all-registered scope includedIds count mismatch');
}
if (decisions.length !== scopedReviewCreatures.length) failures.push('decision handoff count does not match scoped articulated review');
if (fileDecisions.length !== scopedReviewCreatures.length) failures.push('decisionFileTemplate count does not match scoped articulated review');
for (const check of REQUIRED_CHECKS) {
  if (!requiredChecks.includes(check)) failures.push(`template required checks missing ${check}`);
  if (!markdown.includes(check)) failures.push(`markdown missing required check ${check}`);
  if (!includesHtml(html, check)) failures.push(`html missing required check ${check}`);
}

const decisionById = new Map(decisions.map((decision) => [decision.id, decision]));
const fileDecisionById = new Map(fileDecisions.map((decision) => [decision.id, decision]));
for (const creature of scopedReviewCreatures) {
  const decision = decisionById.get(creature.id);
  const fileDecision = fileDecisionById.get(creature.id);
  if (!decision) {
    failures.push(`${creature.id}: missing decision handoff`);
    continue;
  }
  if (!fileDecision) failures.push(`${creature.id}: missing decisionFileTemplate entry`);
  if (decision.species !== creature.species) failures.push(`${creature.id}: species mismatch`);
  const runtimeCreature = runtimeById.get(creature.id) ?? null;
  const sourceCandidateId = runtimeCreature?.quality?.sourceCandidateId ?? creature.quality?.sourceCandidateId ?? creature.sourceCandidateId ?? null;
  const accepted = threatAcceptedForContentGate(sourceById.get(sourceCandidateId), runtimeCreature, creature);
  if (decision.status !== (accepted ? 'already-accepted' : 'needs-review')) failures.push(`${creature.id}: default status mismatch`);
  if (decision.sourceCandidateId !== sourceCandidateId) failures.push(`${creature.id}: source candidate mismatch`);
  if (decision.status === 'already-accepted' && decision.blockers?.length) failures.push(`${creature.id}: already-accepted decision should not have blockers`);
  if (decision.status !== 'already-accepted' && !String(decision.blockers?.join(' ') ?? '').includes('source approval')) failures.push(`${creature.id}: pending decision blocker must mention source approval`);
	  if (fileDecision?.status !== 'needs-review') failures.push(`${creature.id}: decisionFileTemplate status should default to needs-review`);
	  if (!String(fileDecision?.sourceCandidateId ?? '').trim()) failures.push(`${creature.id}: decisionFileTemplate missing source candidate`);
	  if (decision.evidenceFingerprint?.schema !== 'water9/content-threat-acceptance-evidence-fingerprint@1') failures.push(`${creature.id}: decision missing threat evidence fingerprint schema`);
	  if (!decision.evidenceFingerprint?.digest) failures.push(`${creature.id}: decision missing threat evidence fingerprint digest`);
	  if (fileDecision?.evidenceFingerprint?.digest !== decision.evidenceFingerprint?.digest) failures.push(`${creature.id}: decisionFileTemplate evidence fingerprint mismatch`);
	  for (const key of ['contact', 'phase', 'sourceParity']) {
	    const media = decision.evidenceFingerprint?.files?.[key];
	    if (media?.exists !== true || !media.sha256 || !media.size) failures.push(`${creature.id}: evidence fingerprint missing valid ${key}`);
	  }
	  if (decision.evidenceFingerprint?.digest && !includesHtml(html, decision.evidenceFingerprint.digest)) failures.push(`${creature.id}: html missing evidence fingerprint digest`);
	  for (const check of REQUIRED_CHECKS) {
    if (!Object.hasOwn(decision.visualChecks ?? {}, check)) failures.push(`${creature.id}: decision missing visual check ${check}`);
    if (!Object.hasOwn(fileDecision?.visualChecks ?? {}, check)) failures.push(`${creature.id}: decisionFileTemplate missing visual check ${check}`);
    if (!String(decision.commands?.acceptDryRun ?? '').includes(`--visual-check ${check}`)) failures.push(`${creature.id}: accept dry-run missing visual check ${check}`);
    if (!String(decision.commands?.acceptDryRun ?? '').includes(`--score ${check}=<4-5>`)) failures.push(`${creature.id}: accept dry-run missing score ${check}`);
    if (!String(decision.commands?.acceptDryRun ?? '').includes(`--visual-note ${check}=`)) failures.push(`${creature.id}: accept dry-run missing visual note ${check}`);
  }
  for (const flag of REQUIRED_FLAGS) {
    if (!String(decision.commands?.acceptDryRun ?? '').includes(flag)) failures.push(`${creature.id}: accept dry-run missing ${flag}`);
  }
  if (!String(decision.commands?.review ?? '').includes('npm run review:articulated:quick')) failures.push(`${creature.id}: missing articulated review command`);
  if (!String(decision.commands?.sandbox ?? '').includes(`--id ${creature.id}`) || !String(decision.commands?.sandbox ?? '').includes('--with diver')) failures.push(`${creature.id}: missing paired sandbox preview command`);
  if (!String(decision.commands?.visual ?? '').includes(`--ids ${creature.id}`) || !String(decision.commands?.visual ?? '').includes('--states idle,lunge,stunned') || !String(decision.commands?.visual ?? '').includes('--with diver')) {
    failures.push(`${creature.id}: missing paired sandbox visual command`);
  }
  if (!String(decision.commands?.audit ?? '').includes(`npm run content:acceptance-audit -- --id ${creature.id}`)) failures.push(`${creature.id}: missing acceptance audit command`);
  if (!String(decision.commands?.acceptDryRun ?? '').includes(`--id ${creature.id}`)) failures.push(`${creature.id}: accept dry-run must target id`);
  if (!String(decision.commands?.acceptDryRun ?? '').includes('npm run content:accept')) failures.push(`${creature.id}: accept dry-run must use content:accept`);
  for (const key of ['source', 'contact', 'phase', 'sourceParity', 'sandbox']) {
    if (!Object.hasOwn(decision.evidence ?? {}, key)) failures.push(`${creature.id}: missing evidence key ${key}`);
    if (decision.evidence?.[key] && !includesHtml(html, decision.evidence[key])) failures.push(`${creature.id}: html missing evidence ${key}`);
  }
  if (!includesHtml(html, `data-threat-decision-form="${creature.id}"`)) failures.push(`${creature.id}: html missing batch decision form`);
  if (!markdown.includes(creature.id)) failures.push(`${creature.id}: markdown missing id`);
}

if ((template?.summary?.registeredRigs ?? -1) !== decisions.length) failures.push('summary registeredRigs mismatch');
if ((template?.summary?.availableRegisteredRigs ?? -1) !== reviewCreatures.length) failures.push('summary availableRegisteredRigs mismatch');
if ((template?.summary?.accepted ?? -1) !== decisions.filter((decision) => decision.status === 'already-accepted').length) failures.push('summary accepted mismatch');
if ((template?.summary?.needsReview ?? -1) !== decisions.filter((decision) => decision.status !== 'already-accepted').length) failures.push('summary needsReview mismatch');

for (const expected of [
  'Water 9 Threat Acceptance Batch Decision Template',
  'Water 9 Threat Acceptance Batch Decisions',
  'This page does not approve content automatically',
  expectedScopeDescription,
  'Batch Threat Decision Workspace',
  'data-threat-decision-workspace',
  'data-threat-decision-output',
  'Download decision file',
  'npm run content:threat-decisions',
  'npm run content:threat-decisions -- --all-registered',
  'npm run content:threat-decisions-check',
  'npm run content:acceptance-audit -- --id <threat-id>',
  'npm run content:threat-decisions-apply -- --decisions water9-threat-acceptance-decisions.json --strict',
]) {
  if (!['Batch Threat Decision Workspace', 'data-threat-decision-workspace', 'data-threat-decision-output', 'Download decision file'].includes(expected) && !markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}

const result = {
  schema: 'water9/content-threat-acceptance-decision-template-check@1',
  registeredRigs: template?.summary?.registeredRigs ?? null,
  needsReview: template?.summary?.needsReview ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
