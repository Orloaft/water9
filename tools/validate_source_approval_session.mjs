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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-approval-session.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-approval-session.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-approval-session.html')),
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
  cohesionDecisions: resolve(String(args.get('cohesion-decisions') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
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
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

const session = await readJson('source approval session', paths.json);
const approvalRunway = await readJson('source approval runway', paths.approvalRunway);
const cohesionDecisions = await readJson('source cohesion decisions', paths.cohesionDecisions);
const markdown = await readText('source approval session markdown', paths.markdown);
const html = await readText('source approval session html', paths.html);

await fileOk('source approval session json', paths.json, 1024);
await fileOk('source approval session markdown', paths.markdown, 1024);
await fileOk('source approval session html', paths.html, 2048);

if (session?.schema !== 'water9/source-approval-session@1') failures.push(`unexpected session schema ${session?.schema ?? 'missing'}`);
if (approvalRunway?.schema !== 'water9/source-approval-runway@1') failures.push(`unexpected source approval runway schema ${approvalRunway?.schema ?? 'missing'}`);
if (cohesionDecisions?.schema !== 'water9/source-cohesion-decision-template@1') failures.push(`unexpected source cohesion decision template schema ${cohesionDecisions?.schema ?? 'missing'}`);
if (session?.policy?.humanAuthoredDecisionsRequired !== true) failures.push('session policy must require human-authored decisions');
if (session?.policy?.automationCannotApproveSourceArt !== true) failures.push('session policy must state automation cannot approve source art');
if (session?.policy?.wrapsExistingStrictApplyGate !== true) failures.push('session policy must wrap the existing strict apply gate');
if (session?.policy?.keepsAcceptSourceCandidateAsFinalGate !== true) failures.push('session policy must preserve accept_source_candidate final gate');

const readyItems = (approvalRunway?.items ?? []).filter((item) => item.readyForHumanReview && !item.humanApproved);
const approvedItems = (approvalRunway?.items ?? []).filter((item) => item.humanApproved);
const blockedItems = (approvalRunway?.items ?? []).filter((item) => !item.readyForHumanReview && !item.humanApproved);
if ((session?.summary?.readyForHumanReview ?? -1) !== readyItems.length) failures.push('readyForHumanReview mismatch with source approval runway');
if ((session?.summary?.humanApproved ?? -1) !== approvedItems.length) failures.push('humanApproved mismatch with source approval runway');
if ((session?.summary?.blockedBeforeHumanReview ?? -1) !== blockedItems.length) failures.push('blockedBeforeHumanReview mismatch with source approval runway');
if ((session?.summary?.templateDecisions ?? -1) !== (cohesionDecisions?.decisionFileTemplate?.decisions?.length ?? -2)) failures.push('templateDecisions mismatch with source cohesion decision template');
if ((session?.summary?.requiredChecks ?? -1) !== (cohesionDecisions?.requiredCohesionChecks?.length ?? -2)) failures.push('requiredChecks mismatch with source cohesion decision template');

if (!String(session?.decisionOutput?.strictApplyCommand ?? '').includes('source:cohesion-decisions-apply')) failures.push('strict apply command must use source:cohesion-decisions-apply');
if (!String(session?.decisionOutput?.strictApplyCommand ?? '').includes('--strict')) failures.push('strict apply command must include --strict');
if (String(session?.decisionOutput?.strictApplyCommand ?? '').includes('--apply')) failures.push('strict dry-run command must not include --apply');
if (!String(session?.decisionOutput?.strictApplyCommandWithApply ?? '').includes('--apply')) failures.push('strict apply command with apply must include --apply');

const stepIds = new Set((session?.reviewSteps ?? []).map((step) => step.id));
for (const id of ['open-session', 'review-focused-target', 'prepare-focused-decision-draft', 'review-evidence', 'fill-decisions', 'strict-dry-run', 'apply-reviewed-decisions']) {
  if (!stepIds.has(id)) failures.push(`missing review step ${id}`);
}
if (!String(session?.commands?.focusedNextReview ?? '').includes('source:next-review')) failures.push('focused next review command must rebuild source:next-review');
if (!String(session?.commands?.focusedNextReview ?? '').includes('source:next-review-check')) failures.push('focused next review command must validate source:next-review');
if (!String(session?.commands?.focusedNextReview ?? '').includes('source:next-review:serve-smoke')) failures.push('focused next review command must serve-smoke source:next-review');
if (!String(session?.commands?.focusedDecisionDraft ?? '').includes('source:next-decision-draft')) failures.push('focused decision draft command must rebuild source:next-decision-draft');
if (!String(session?.commands?.focusedDecisionDraft ?? '').includes('source:next-decision-draft-check')) failures.push('focused decision draft command must validate source:next-decision-draft');
if (!String(session?.commands?.focusedDecisionDraft ?? '').includes('source:next-decision-draft:serve-smoke')) failures.push('focused decision draft command must serve-smoke source:next-decision-draft');
if (readyItems.length > 0) {
  const expected = readyItems[0];
  if (session?.summary?.nextTarget !== expected.id) failures.push('nextTarget should match first ready source approval runway item');
  if (!session?.nextTarget?.evidenceFingerprintDigest) failures.push('next target must expose an evidence fingerprint digest');
  if (session?.nextTarget?.links?.focusedNextReview !== '/review/source-candidates/source-next-review.html') failures.push('next target must link to focused next review page');
  if (!String(session?.nextTarget?.commands?.focusedNextReview ?? '').includes('source:next-review')) failures.push('next target must expose focused next review command');
  if (session?.nextTarget?.links?.focusedDecisionDraft !== '/review/source-candidates/source-next-decision-draft.html') failures.push('next target must link to focused decision draft page');
  if (!String(session?.nextTarget?.commands?.focusedDecisionDraft ?? '').includes('source:next-decision-draft')) failures.push('next target must expose focused decision draft command');
}

for (const required of [
  'Water 9 Source Approval Session',
  'This page does not approve content automatically',
  'human reviewer must inspect evidence',
  'focused next review',
  'source-next-review.html',
  'npm run source:next-review && npm run source:next-review-check && npm run source:next-review:serve-smoke',
  'focused decision draft',
  'source-next-decision-draft.html',
  'npm run source:next-decision-draft && npm run source:next-decision-draft-check && npm run source:next-decision-draft:serve-smoke',
  'batch decision workspace',
  'source-cohesion-decision-template.html',
  'water9-source-cohesion-reviewed-decisions.json',
  'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
  'data-source-approval-session',
  'data-source-approval-step',
]) {
  if (!markdown.includes(required) && !includesHtml(html, required)) failures.push(`outputs missing ${required}`);
}

const result = {
  schema: 'water9/source-approval-session-check@1',
  readyForHumanReview: session?.summary?.readyForHumanReview ?? null,
  humanApproved: session?.summary?.humanApproved ?? null,
  nextTarget: session?.summary?.nextTarget ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
