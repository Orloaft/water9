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
  report: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-critic-board.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/source-candidates/source-critic-board.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-critic-board.html')),
  dispatch: resolve(String(args.get('dispatch') ?? 'public/review/source-candidates/research-dispatch-board.json')),
  visualBoard: resolve(String(args.get('visual-board') ?? 'public/review/source-visual-board.json')),
  criticFindings: resolve(String(args.get('critic-findings') ?? 'public/review/source-candidates/source-critic-findings.json')),
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

const report = await readJson('source critic board', paths.report);
const dispatch = await readJson('research dispatch board', paths.dispatch);
const visualBoard = await readJson('source visual board', paths.visualBoard);
const criticFindings = await readJson('source critic findings', paths.criticFindings);
const markdown = await readText('source critic board markdown', paths.markdown);
const html = await readText('source critic board html', paths.html);

await fileOk('source critic board json', paths.report, 1024);
await fileOk('source critic board markdown', paths.markdown, 1024);
await fileOk('source critic board html', paths.html, 4096);

if (report?.schema !== 'water9/source-critic-board@1') failures.push(`source critic board schema is ${report?.schema ?? 'missing'}`);
if (dispatch?.schema !== 'water9/research-dispatch-board@1') failures.push(`research dispatch schema is ${dispatch?.schema ?? 'missing'}`);
if (visualBoard?.schema !== 'water9/source-visual-board@1') failures.push(`source visual board schema is ${visualBoard?.schema ?? 'missing'}`);
if (criticFindings?.schema !== 'water9/source-critic-findings@1') failures.push(`source critic findings schema is ${criticFindings?.schema ?? 'missing'}`);
if (report?.policy?.advisoryOnly !== true) failures.push('source critic board must be advisory-only');
if (report?.policy?.doesNotApproveSources !== true) failures.push('source critic board must not approve sources');
if (report?.policy?.doesNotAcceptThreats !== true) failures.push('source critic board must not accept threats');
if (report?.policy?.humanApprovalStillRequired !== true) failures.push('source critic board must require human approval');

const items = Array.isArray(report?.items) ? report.items : [];
const dispatches = Array.isArray(dispatch?.dispatches) ? dispatch.dispatches : [];
const findings = Array.isArray(criticFindings?.items) ? criticFindings.items : [];
if ((report?.summary?.candidates ?? -1) !== items.length) failures.push('summary candidates mismatch');
if (items.length !== dispatches.length) failures.push('item count must match research dispatches');
if (items.length !== findings.length) failures.push('item count must match source critic findings');
if ((report?.summary?.lanes ?? -1) !== new Set(items.map((item) => item.lane)).size) failures.push('summary lanes mismatch');
if ((report?.summary?.readyForHumanReview ?? -1) !== items.filter((item) => item.advisory?.readyForHumanReview).length) failures.push('readyForHumanReview summary mismatch');
if ((report?.summary?.humanApproved ?? -1) !== items.filter((item) => item.evidence?.humanApproved).length) failures.push('humanApproved summary mismatch');
if ((report?.summary?.advisoryOnly ?? -1) !== items.filter((item) => String(item.advisory?.approvalBoundary ?? '').includes('Advisory')).length) failures.push('advisoryOnly summary mismatch');
if ((report?.summary?.subagentFindings ?? -1) !== items.filter((item) => item.subagentCritique?.present).length) failures.push('subagentFindings summary mismatch');
if ((report?.summary?.regenerateRecommendations ?? -1) !== items.filter((item) => item.subagentCritique?.recommendation === 'regenerate').length) failures.push('regenerateRecommendations summary mismatch');
if ((report?.summary?.readyWithCautionRecommendations ?? -1) !== items.filter((item) => item.subagentCritique?.recommendation === 'ready-with-caution').length) failures.push('readyWithCautionRecommendations summary mismatch');
if ((report?.summary?.readyRecommendations ?? -1) !== items.filter((item) => item.subagentCritique?.recommendation === 'ready').length) failures.push('readyRecommendations summary mismatch');

const dispatchById = new Map(dispatches.map((item) => [item.id, item]));
const visualById = new Map((visualBoard?.items ?? []).map((item) => [item.id, item]));
const findingById = new Map(findings.map((item) => [item.id, item]));
const allowedRecommendations = new Set(['ready', 'ready-with-caution', 'regenerate']);
for (const item of items) {
  const dispatchItem = dispatchById.get(item.id);
  const visualItem = visualById.get(item.id);
  const finding = findingById.get(item.id);
  if (!dispatchItem) failures.push(`${item.id}: missing matching research dispatch`);
  if (!visualItem) failures.push(`${item.id}: missing matching source visual board row`);
  if (!finding) failures.push(`${item.id}: missing matching source critic finding`);
  if (!item.species) failures.push(`${item.id}: missing species`);
  if (!item.lane || !item.laneTitle) failures.push(`${item.id}: missing lane metadata`);
  if (!item.media?.source || !item.media?.quickReview) failures.push(`${item.id}: missing source or quick-review media`);
  if (item.evidence?.researchAudited !== true) failures.push(`${item.id}: research audit evidence missing`);
  if (item.evidence?.imageValidationPassed !== true) failures.push(`${item.id}: image validation must pass before critic board`);
  if (item.evidence?.sourcePreviewPassed !== true) failures.push(`${item.id}: source preview must pass before critic board`);
  if (item.evidence?.planPreviewPresent !== true) failures.push(`${item.id}: plan preview must be present before critic board`);
  if (!Array.isArray(item.advisory?.shouldRegenerateIfObserved) || item.advisory.shouldRegenerateIfObserved.length < 2) failures.push(`${item.id}: must include at least two regeneration risks`);
  if (!Array.isArray(item.advisory?.reviewQuestions) || item.advisory.reviewQuestions.length < 4) failures.push(`${item.id}: must include at least four review questions`);
  if (!String(item.advisory?.animationRisk ?? '').trim()) failures.push(`${item.id}: missing animation risk`);
  if (!String(item.advisory?.approvalBoundary ?? '').includes('does not approve source art')) failures.push(`${item.id}: approval boundary must be explicit`);
  if (item.subagentCritique?.present !== true) failures.push(`${item.id}: subagent critique must be present`);
  if (!allowedRecommendations.has(item.subagentCritique?.recommendation)) failures.push(`${item.id}: invalid subagent recommendation ${item.subagentCritique?.recommendation ?? 'missing'}`);
  if (finding && item.subagentCritique?.recommendation !== finding.recommendation) failures.push(`${item.id}: subagent recommendation does not match findings`);
  if (finding && item.subagentCritique?.lane !== finding.lane) failures.push(`${item.id}: subagent lane does not match findings`);
  if (!Array.isArray(item.subagentCritique?.cohesionRisks) || item.subagentCritique.cohesionRisks.length < 2) failures.push(`${item.id}: subagent critique must include at least two cohesion risks`);
  if (!String(item.subagentCritique?.animationRisk ?? '').trim()) failures.push(`${item.id}: subagent critique missing animation risk`);
  if (item.subagentCritique?.recommendation === 'regenerate' && item.advisory?.advisoryState !== 'critic-recommends-regenerate') failures.push(`${item.id}: regenerate finding must set critic-recommends-regenerate advisory state`);
  if (item.subagentCritique?.recommendation === 'ready-with-caution' && item.advisory?.advisoryState !== 'ready-with-caution') failures.push(`${item.id}: caution finding must set ready-with-caution advisory state`);
  if (item.subagentCritique?.recommendation === 'ready' && item.advisory?.advisoryState !== 'ready-for-human-consideration') failures.push(`${item.id}: ready finding must set ready-for-human-consideration advisory state`);
  for (const key of ['rebuild', 'sandboxLab', 'sourcePreview', 'quickReview', 'sourceApprovalRunway']) {
    if (!String(item.commands?.[key] ?? '').trim()) failures.push(`${item.id}: command ${key} missing`);
  }
  if (!String(item.commands?.sourcePreview ?? '').includes('--kind source')) failures.push(`${item.id}: source preview command must use source kind`);
  if (!String(item.commands?.sandboxLab ?? '').includes('--with diver')) failures.push(`${item.id}: sandbox lab command must include diver`);
  if (!includesHtml(html, `data-source-critic="${item.id}"`)) failures.push(`${item.id}: html missing source critic marker`);
  if (!markdown.includes(item.id)) failures.push(`${item.id}: markdown missing id`);
}

for (const expected of [
  'Water 9 Source Critic Board',
  'Advisory board for pre-approval critique',
  'does not approve source art or accept threats',
  'npm run source:critic-board',
  'npm run source:critic-board-check',
  'npm run source:critic-board:serve-smoke',
  'Regenerate If Observed',
  'Review Questions',
  'Animation Risk',
  'Subagent Critique',
  'Regenerate recommendations',
  'Ready with caution recommendations',
]) {
  if (!markdown.includes(expected) && !includesHtml(html, expected)) failures.push(`rendered output missing ${expected}`);
}

const result = {
  schema: 'water9/source-critic-board-check@1',
  candidates: report?.summary?.candidates ?? null,
  lanes: report?.summary?.lanes ?? null,
  subagentFindings: report?.summary?.subagentFindings ?? null,
  regenerateRecommendations: report?.summary?.regenerateRecommendations ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
