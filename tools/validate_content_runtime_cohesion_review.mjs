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
  json: resolve(String(args.get('json') ?? 'public/review/content-runtime-cohesion-review.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-runtime-cohesion-review.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-runtime-cohesion-review.html')),
  qualityGateNext: resolve(String(args.get('quality-gate-next') ?? 'public/review/content-quality-gate-next.json')),
  reviewSession: resolve(String(args.get('review-session') ?? 'public/review/content-review-session.json')),
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

const report = await readJson('runtime cohesion review', paths.json);
const qualityGateNext = await readJson('content quality gate next', paths.qualityGateNext);
const reviewSession = await readJson('content review session', paths.reviewSession);
const markdown = await readText('runtime cohesion review markdown', paths.markdown);
const html = await readText('runtime cohesion review html', paths.html);
await fileOk('runtime cohesion review markdown', paths.markdown, 1024);
await fileOk('runtime cohesion review html', paths.html, 4096);

if (report?.schema !== 'water9/content-runtime-cohesion-review@1') failures.push(`unexpected runtime cohesion schema ${report?.schema ?? 'missing'}`);
if (qualityGateNext?.schema !== 'water9/content-quality-gate-next@1') failures.push(`unexpected quality gate next schema ${qualityGateNext?.schema ?? 'missing'}`);
if (reviewSession?.schema !== 'water9/content-review-session@1') failures.push(`unexpected review session schema ${reviewSession?.schema ?? 'missing'}`);
if (report?.policy?.humanReviewerRequired !== true) failures.push('runtime cohesion review must require human reviewer');
if (report?.policy?.automationCannotApprove !== true) failures.push('runtime cohesion review must state automation cannot approve');
if (report?.policy?.inGameAssemblyEvidenceRequired !== true) failures.push('runtime cohesion review must require in-game assembly evidence');
if (report?.policy?.screenshotAloneIsNotCapabilityProof !== true) failures.push('runtime cohesion review must reject screenshot-only proof');

const target = report?.target;
const expectedTarget = qualityGateNext?.target;
const sessionItem = (reviewSession?.items ?? []).find((item) => item.id === target?.id);
if (target?.id !== expectedTarget?.id) failures.push('runtime cohesion target must match content quality gate next target');
if (target?.species !== expectedTarget?.species) failures.push('runtime cohesion species must match content quality gate next target');
if (target?.nextGate !== expectedTarget?.nextGate) failures.push('runtime cohesion nextGate must match quality gate next');
if (target?.sourceApproved !== Boolean(expectedTarget?.sourceApproved)) failures.push('runtime cohesion sourceApproved mismatch');
if (target?.threatAccepted !== Boolean(expectedTarget?.threatAccepted)) failures.push('runtime cohesion threatAccepted mismatch');
if (!sessionItem) failures.push('runtime cohesion target missing from content review session');

const media = Array.isArray(report?.media) ? report.media : [];
for (const label of ['source art', 'magenta key preview', 'source sandbox preview', 'articulation plan preview', 'source parity overlay', 'contact sheet', 'phase strip', 'sandbox idle', 'sandbox lunge', 'sandbox stunned']) {
  const item = media.find((entry) => entry.label === label);
  if (!item) failures.push(`runtime cohesion missing media ${label}`);
  else if (item.present !== true || !item.url) failures.push(`runtime cohesion media ${label} must be present`);
}
const requiredChecks = report?.requiredChecks ?? [];
for (const check of ['single-source-cohesion', 'readable-silhouette', 'anatomy-cohesion', 'production-visual-cohesion', 'socket-seams', 'motion-stability', 'sandbox-behavior']) {
  if (!requiredChecks.includes(check)) failures.push(`runtime cohesion missing required check ${check}`);
}

const decisionFile = report?.decisionFile;
const decision = decisionFile?.decisions?.[0];
if (decisionFile?.schema !== 'water9/content-threat-acceptance-decisions@1') failures.push('runtime cohesion decision file schema mismatch');
if (decisionFile?.policy?.humanAuthored !== true) failures.push('runtime cohesion decision file must be human-authored');
if (decisionFile?.policy?.automationCannotAcceptThreats !== true) failures.push('runtime cohesion decision file must reject automated acceptance');
if (!Array.isArray(decisionFile?.decisions) || decisionFile.decisions.length !== 1) failures.push('runtime cohesion decision file must contain exactly one decision');
if (decision?.id !== target?.id) failures.push('runtime cohesion decision target mismatch');
if (decision?.status !== 'needs-review') failures.push('runtime cohesion decision must default needs-review');
if (decision?.reviewer !== '<human-reviewer>') failures.push('runtime cohesion decision reviewer placeholder missing');
if (!decision?.evidenceFingerprint?.digest) failures.push('runtime cohesion decision missing evidence fingerprint digest');
for (const check of requiredChecks) {
  if (!decision?.visualChecks?.[check]) failures.push(`runtime cohesion decision missing visual check ${check}`);
  if (decision?.visualChecks?.[check]?.score !== null) failures.push(`${check}: runtime cohesion score must default null`);
  if (decision?.visualChecks?.[check]?.note !== '') failures.push(`${check}: runtime cohesion note must default empty`);
}

for (const command of ['rebuild', 'check', 'serveSmoke', 'sourcePreview', 'runtimePreview', 'sandboxVisual', 'strictDryRun']) {
  if (!report?.commands?.[command]) failures.push(`runtime cohesion missing command ${command}`);
}
if (!String(report?.commands?.strictDryRun ?? '').includes('water9-threat-acceptance-reviewed-decisions.json')) failures.push('runtime cohesion strict dry-run must use reviewed-only threat decision file');

for (const required of [
  'Water 9 Runtime Cohesion Review',
  'This page does not approve content automatically',
  'not capability proof',
  'data-runtime-cohesion-review',
  'data-runtime-cohesion-decision-json',
  `data-runtime-cohesion-target="${target?.id}"`,
  '"schema": "water9/content-threat-acceptance-decisions@1"',
  '"status": "needs-review"',
  'production-visual-cohesion',
  'sandbox-behavior',
  target?.id,
  target?.species,
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`runtime cohesion output missing ${required}`);
}

const result = {
  schema: 'water9/content-runtime-cohesion-review-check@1',
  target: target?.id ?? null,
  nextGate: target?.nextGate ?? null,
  media: media.length,
  checks: requiredChecks.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
