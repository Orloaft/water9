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

const minThreats = Number(args.get('min-threats') ?? 20);
const paths = {
  json: resolve(String(args.get('json') ?? 'public/review/content-goal-audit.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-goal-audit.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-goal-audit.html')),
  contentGoalReadiness: resolve('public/review/content-goal-readiness.json'),
  contentReadiness: resolve('public/review/content-readiness.json'),
  contentVisualFeedback: resolve('public/review/content-visual-feedback-ledger.json'),
  contentVisualRegeneration: resolve('public/review/content-visual-regeneration-queue.json'),
  packageJson: resolve('package.json'),
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

function includesRendered(text, value) {
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

const audit = await readJson('content goal audit', paths.json);
const markdown = await readText('content goal audit markdown', paths.markdown);
const html = await readText('content goal audit html', paths.html);
const goalReadiness = await readJson('content goal readiness', paths.contentGoalReadiness);
const contentReadiness = await readJson('content readiness', paths.contentReadiness);
const contentVisualFeedback = await readJson('content visual feedback', paths.contentVisualFeedback);
const contentVisualRegeneration = await readJson('content visual regeneration', paths.contentVisualRegeneration);
const packageJson = await readJson('package', paths.packageJson);
await fileOk('content goal audit markdown', paths.markdown, 1024);
await fileOk('content goal audit html', paths.html, 2048);

if (audit?.schema !== 'water9/content-goal-audit@1') failures.push(`unexpected audit schema ${audit?.schema ?? 'missing'}`);
if (contentVisualFeedback?.schema !== 'water9/content-visual-feedback-ledger@1') failures.push(`unexpected visual feedback schema ${contentVisualFeedback?.schema ?? 'missing'}`);
if (contentVisualRegeneration?.schema !== 'water9/content-visual-regeneration-queue@1') failures.push(`unexpected visual regeneration schema ${contentVisualRegeneration?.schema ?? 'missing'}`);
if ((audit?.summary?.targetThreats ?? 0) < minThreats) failures.push(`targetThreats ${audit?.summary?.targetThreats ?? 'missing'} below ${minThreats}`);
if ((audit?.summary?.acceptedThreats ?? null) !== (contentReadiness?.summary?.acceptedThreats ?? null)) failures.push('accepted threat count mismatch with content readiness');
if (audit?.strictGoalComplete !== goalReadiness?.strictGoalComplete) failures.push('strictGoalComplete mismatch with goal readiness');
if (audit?.complete === true && ((audit?.summary?.acceptedThreats ?? 0) < minThreats || audit?.strictGoalComplete !== true)) {
  failures.push('audit must not report complete before strict goal readiness and accepted threat count pass');
}
if ((audit?.summary?.acceptedThreats ?? 0) < minThreats && audit?.complete === true) {
  failures.push('audit complete must remain false while fewer than 20 threats are accepted');
}
if (!String(audit?.hardStop ?? '').includes('Do not mark the goal complete') && audit?.complete !== true) {
  failures.push('incomplete audit must include explicit hard stop language');
}

const requirements = audit?.requirements ?? [];
const requirementById = new Map(requirements.map((item) => [item.id, item]));
for (const id of [
  'quick-sandbox-preview',
  'subagent-research',
  'imagen-magenta-source',
  'magenta-to-articulation',
  'visual-rejection-regeneration',
  'rigorous-20-threat-gate',
]) {
  if (!requirementById.has(id)) failures.push(`missing requirement ${id}`);
}
for (const item of requirements) {
  if (!['passed', 'partial', 'incomplete'].includes(item.status)) failures.push(`${item.id}: unexpected status ${item.status}`);
  if (item.passed !== (item.status === 'passed')) failures.push(`${item.id}: passed flag must mirror status`);
  if (!Array.isArray(item.evidence) || item.evidence.length < 2) failures.push(`${item.id}: evidence is incomplete`);
  if (!Array.isArray(item.commands) || item.commands.length < 1) failures.push(`${item.id}: commands are missing`);
}
const sandbox = requirementById.get('quick-sandbox-preview');
if (sandbox && sandbox.status !== 'passed') failures.push('quick sandbox preview requirement should pass when manifest and quick smoke tooling are present');
const research = requirementById.get('subagent-research');
if (research && research.status !== 'passed') failures.push('subagent research requirement should pass when 20 candidates have audited coverage');
const imagen = requirementById.get('imagen-magenta-source');
if ((audit?.summary?.sourceCriticRegenerationRequired ?? 0) > 0 && imagen?.status === 'passed') {
  failures.push('imagen/magenta source requirement must not pass while critic regeneration is still required');
}
const articulation = requirementById.get('magenta-to-articulation');
if ((audit?.summary?.acceptedThreats ?? 0) < minThreats && articulation?.status === 'passed') {
  failures.push('magenta-to-articulation requirement must not pass before accepted threats reach the target');
}
const feedbackItems = contentVisualFeedback?.items ?? [];
const regenerationItems = contentVisualRegeneration?.items ?? [];
const blockingFeedback = feedbackItems.filter((item) => item.severity === 'blocking' || String(item.status ?? '').includes('rejected')).length;
const blockingRegeneration = regenerationItems.filter((item) => item.severity === 'blocking' || String(item.status ?? '').includes('rejected')).length;
const regenerationGateCredit = contentVisualRegeneration?.summary?.countsTowardStrictGate ?? regenerationItems.filter((item) => item.countsTowardStrictGate).length;
if ((audit?.summary?.visualFeedbackItems ?? null) !== feedbackItems.length) failures.push('visualFeedbackItems mismatch with visual feedback ledger');
if ((audit?.summary?.visualFeedbackBlockingItems ?? null) !== blockingFeedback) failures.push('visualFeedbackBlockingItems mismatch with visual feedback ledger');
if ((audit?.summary?.visualRegenerationItems ?? null) !== regenerationItems.length) failures.push('visualRegenerationItems mismatch with visual regeneration queue');
if ((audit?.summary?.visualRegenerationBlockingItems ?? null) !== blockingRegeneration) failures.push('visualRegenerationBlockingItems mismatch with visual regeneration queue');
if ((audit?.summary?.visualRegenerationGateCredit ?? null) !== regenerationGateCredit) failures.push('visualRegenerationGateCredit mismatch with visual regeneration queue');
if (regenerationGateCredit !== 0) failures.push('visual regeneration queue must give zero strict gate credit');
const visualRejection = requirementById.get('visual-rejection-regeneration');
if (blockingFeedback > 0 && regenerationItems.length > 0 && regenerationGateCredit === 0 && visualRejection?.status !== 'passed') {
  failures.push('visual rejection regeneration requirement should pass when blocking feedback is routed to zero-credit regeneration');
}
const gate = requirementById.get('rigorous-20-threat-gate');
if ((audit?.summary?.acceptedThreats ?? 0) < minThreats && gate?.status !== 'incomplete') {
  failures.push('20-threat gate requirement must be incomplete while accepted threats are below target');
}

const packageScripts = packageJson?.scripts ?? {};
for (const script of ['content:goal-audit', 'content:goal-audit-check', 'content:goal-audit:serve-smoke']) {
  if (!packageScripts[script]) failures.push(`package missing ${script}`);
}
if (!String(packageScripts['content:goal-readiness'] ?? '').includes('content:goal-audit')) failures.push('content:goal-readiness must rebuild content goal audit');
if (!String(packageScripts['content:goal-readiness-check'] ?? '').includes('content:goal-audit-check')) failures.push('content:goal-readiness-check must validate content goal audit');

for (const required of [
  'Water 9 Content Goal Audit',
  'Passing preview checks or mechanical image checks is not content acceptance',
  'Quick sandbox preview for any entity',
  'Subagent research coverage for underwater fauna and flora',
  'Imagen/OpenAI source generation and magenta-key intake',
  'Magenta extraction into articulated in-game entities',
  'Rejected preview art is quarantined and routed to regeneration',
  '20 new underwater threats pass rigorous quality gate',
  'Do not mark the goal complete',
  'regeneration strict gate credit',
  'data-content-goal-audit',
  'data-accepted-threats',
  'npm run content:goal-readiness-strict',
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const summary = {
  schema: 'water9/content-goal-audit-check@1',
  complete: audit?.complete ?? null,
  acceptedThreats: audit?.summary?.acceptedThreats ?? null,
  targetThreats: audit?.summary?.targetThreats ?? null,
  requirements: requirements.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
