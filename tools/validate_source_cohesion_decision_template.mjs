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
  template: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/source-candidates/source-cohesion-decision-template.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-cohesion-decision-template.html')),
  cohesionReview: resolve(String(args.get('cohesion-review') ?? 'public/review/source-candidates/source-cohesion-review.json')),
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

const template = await readJson('source cohesion decision template', paths.template);
const cohesionReview = await readJson('source cohesion review', paths.cohesionReview);
const markdown = await readText('source cohesion decision template markdown', paths.markdown);
const html = await readText('source cohesion decision template html', paths.html);

await fileOk('source cohesion decision template json', paths.template, 1024);
await fileOk('source cohesion decision template markdown', paths.markdown, 1024);
await fileOk('source cohesion decision template html', paths.html, 2048);

if (template?.schema !== 'water9/source-cohesion-decision-template@1') failures.push(`template schema is ${template?.schema ?? 'missing'}`);
if (cohesionReview?.schema !== 'water9/source-cohesion-review@1') failures.push(`cohesion review schema is ${cohesionReview?.schema ?? 'missing'}`);
if (template?.decisionFileTemplate?.schema !== 'water9/source-cohesion-decisions@1') failures.push('decisionFileTemplate schema mismatch');
if (template?.decisionFileTemplate?.policy?.humanAuthored !== true) failures.push('decisionFileTemplate policy.humanAuthored must be true');
if (template?.decisionFileTemplate?.policy?.automationCannotApproveCohesion !== true) failures.push('decisionFileTemplate policy.automationCannotApproveCohesion must be true');
if (template?.decisionFileTemplate?.policy?.inspectSourceKeySandboxAndPlan !== true) failures.push('decisionFileTemplate policy.inspectSourceKeySandboxAndPlan must be true');

const reviewItems = Array.isArray(cohesionReview?.items) ? cohesionReview.items : [];
const decisions = Array.isArray(template?.decisions) ? template.decisions : [];
const decisionFileDecisions = Array.isArray(template?.decisionFileTemplate?.decisions) ? template.decisionFileTemplate.decisions : [];
const requiredChecks = Array.isArray(template?.requiredCohesionChecks) ? template.requiredCohesionChecks : [];
const reviewRequiredChecks = (cohesionReview?.requiredCohesionChecks ?? []).map((check) => check.id);
if (decisions.length !== reviewItems.length) failures.push('decision handoff count does not match cohesion review');
if (decisionFileDecisions.length !== reviewItems.length) failures.push('decisionFileTemplate count does not match cohesion review');
for (const check of reviewRequiredChecks) {
  if (!requiredChecks.includes(check)) failures.push(`template required checks missing ${check}`);
  if (!markdown.includes(check)) failures.push(`markdown missing required check ${check}`);
  if (!includesHtml(html, check)) failures.push(`html missing required check ${check}`);
}

const decisionById = new Map(decisions.map((decision) => [decision.id, decision]));
const decisionFileById = new Map(decisionFileDecisions.map((decision) => [decision.id, decision]));
for (const review of reviewItems) {
  const decision = decisionById.get(review.id);
  const fileDecision = decisionFileById.get(review.id);
  if (!decision) {
    failures.push(`${review.id}: missing decision handoff`);
    continue;
  }
  if (!fileDecision) failures.push(`${review.id}: missing decisionFileTemplate entry`);
  if (decision.species !== review.species) failures.push(`${review.id}: species mismatch`);
  if (decision.readyForCohesionReview !== review.readyForCohesionReview) failures.push(`${review.id}: readiness mismatch`);
  if (decision.humanCohesionApproved !== review.humanCohesionApproved) failures.push(`${review.id}: approval mismatch`);
  for (const key of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview', 'cohesionReview']) {
    if (!decision.evidence?.[key]) failures.push(`${review.id}: missing evidence ${key}`);
    if (decision.evidence?.[key] && !includesHtml(html, decision.evidence[key])) failures.push(`${review.id}: html missing evidence ${key}`);
  }
  if (decision.evidenceFingerprint?.schema !== 'water9/source-cohesion-evidence-fingerprint@1') failures.push(`${review.id}: missing source cohesion evidence fingerprint schema`);
  if (!decision.evidenceFingerprint?.digest) failures.push(`${review.id}: missing source cohesion evidence fingerprint digest`);
  if (fileDecision?.evidenceFingerprint?.digest !== decision.evidenceFingerprint?.digest) failures.push(`${review.id}: decisionFileTemplate evidence fingerprint mismatch`);
  for (const key of ['source', 'keyPreview', 'sandboxScreenshot', 'planPreview']) {
    const fileEvidence = decision.evidenceFingerprint?.files?.[key];
    if (fileEvidence?.exists !== true) failures.push(`${review.id}: evidence fingerprint missing existing file ${key}`);
    if (!fileEvidence?.sha256) failures.push(`${review.id}: evidence fingerprint missing sha256 for ${key}`);
    if (!fileEvidence?.size) failures.push(`${review.id}: evidence fingerprint missing size for ${key}`);
  }
  for (const check of requiredChecks) {
    if (!Object.hasOwn(decision.visualChecks ?? {}, check)) failures.push(`${review.id}: decision missing visual check ${check}`);
    if (!Object.hasOwn(fileDecision?.visualChecks ?? {}, check)) failures.push(`${review.id}: decisionFileTemplate missing visual check ${check}`);
  }
  if (fileDecision?.status !== 'needs-review') failures.push(`${review.id}: decisionFileTemplate status should default to needs-review`);
  if (!Array.isArray(fileDecision?.failedChecks)) failures.push(`${review.id}: decisionFileTemplate missing failedChecks array`);
  if (!String(decision.commands?.accept ?? '').includes(`--id ${review.id}`)) failures.push(`${review.id}: accept command must target id`);
  if (!String(decision.commands?.accept ?? '').includes('--source-reviewed')) failures.push(`${review.id}: accept command must require --source-reviewed`);
  if (!String(decision.commands?.reject ?? '').includes(`--id ${review.id}`)) failures.push(`${review.id}: reject command must target id`);
  if (!includesHtml(html, `data-source-cohesion-decision="${review.id}"`)) failures.push(`${review.id}: html missing decision marker`);
  if (!includesHtml(html, `${review.species} source`)) failures.push(`${review.id}: html missing source evidence image alt text`);
  if (!includesHtml(html, `${review.species} sandbox`)) failures.push(`${review.id}: html missing sandbox evidence image alt text`);
  if (!includesHtml(html, '"reviewer": "<human-reviewer>"')) failures.push(`${review.id}: html missing decision JSON starter reviewer placeholder`);
  if (!includesHtml(html, '"failedChecks": []')) failures.push(`${review.id}: html missing decision JSON starter failedChecks array`);
  if (decision.evidenceFingerprint?.digest && !includesHtml(html, decision.evidenceFingerprint.digest)) failures.push(`${review.id}: html missing evidence fingerprint digest`);
	  if (!includesHtml(html, 'failed on rejection')) failures.push(`${review.id}: html missing rejection failed-check controls`);
	  if (!includesHtml(html, `data-decision-form="${review.id}"`)) failures.push(`${review.id}: html missing batch decision form`);
	  if (!markdown.includes(review.id)) failures.push(`${review.id}: markdown missing id`);
	}

if ((template?.summary?.candidates ?? -1) !== decisions.length) failures.push('summary candidates mismatch');
if ((template?.summary?.readyForCohesionReview ?? -1) !== decisions.filter((decision) => decision.readyForCohesionReview && !decision.humanCohesionApproved).length) {
  failures.push('summary readyForCohesionReview mismatch');
}
if ((template?.summary?.humanCohesionApproved ?? -1) !== decisions.filter((decision) => decision.humanCohesionApproved).length) {
  failures.push('summary humanCohesionApproved mismatch');
}
if ((template?.summary?.prototypeLocked ?? -1) !== decisions.filter((decision) => !decision.humanCohesionApproved).length) {
  failures.push('summary prototypeLocked mismatch');
}

for (const expected of [
  'Water 9 Source Cohesion Batch Decision Template',
  'Water 9 Source Cohesion Batch Decisions',
  'This page does not approve content automatically',
  'Evidence Preview',
  'Decision JSON Starter',
  'Batch Decision Workspace',
  'data-decision-workspace',
	  'data-decision-output',
	  'data-review-progress',
	  'data-review-filter',
	  'data-clear-review-draft',
	  'water9.sourceCohesionDecisionWorkspace.v1',
  'Download reviewed decision file',
  'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
  'npm run source:cohesion-decisions && npm run source:cohesion-decisions-check',
  'npm run source:cohesion-decisions-apply',
  'npm run source:cohesion-review && npm run source:cohesion-review-check',
]) {
	  if (!['Batch Decision Workspace', 'data-decision-workspace', 'data-decision-output', 'data-review-progress', 'data-review-filter', 'data-clear-review-draft', 'water9.sourceCohesionDecisionWorkspace.v1', 'Download reviewed decision file', 'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict'].includes(expected) && !markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}

const result = {
  schema: 'water9/source-cohesion-decision-template-check@1',
  candidates: template?.summary?.candidates ?? null,
  readyForCohesionReview: template?.summary?.readyForCohesionReview ?? null,
  prototypeLocked: template?.summary?.prototypeLocked ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
