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
  json: resolve(String(args.get('json') ?? 'public/review/content-cohort-cohesion-board.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-cohort-cohesion-board.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-cohort-cohesion-board.html')),
  matrix: resolve(String(args.get('matrix') ?? 'public/review/content-quality-gate-matrix.json')),
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

const report = await readJson('content cohort cohesion board', paths.json);
const matrix = await readJson('content quality gate matrix', paths.matrix);
const reviewSession = await readJson('content review session', paths.reviewSession);
const markdown = await readText('content cohort cohesion markdown', paths.markdown);
const html = await readText('content cohort cohesion html', paths.html);

await fileOk('content cohort cohesion markdown', paths.markdown, 2048);
await fileOk('content cohort cohesion html', paths.html, 8192);

if (report?.schema !== 'water9/content-cohort-cohesion-board@1') failures.push(`unexpected cohort board schema ${report?.schema ?? 'missing'}`);
if (matrix?.schema !== 'water9/content-quality-gate-matrix@1') failures.push(`unexpected matrix schema ${matrix?.schema ?? 'missing'}`);
if (reviewSession?.schema !== 'water9/content-review-session@1') failures.push(`unexpected review session schema ${reviewSession?.schema ?? 'missing'}`);
if (report?.policy?.humanReviewerRequired !== true) failures.push('cohort board must require human reviewer');
if (report?.policy?.automationCannotApprove !== true) failures.push('cohort board must state automation cannot approve');
if (report?.policy?.allTargetsVisibleTogether !== true) failures.push('cohort board must keep all targets visible together');
if (report?.policy?.sourceAndRuntimeEvidenceTogether !== true) failures.push('cohort board must pair source and runtime evidence');
if (report?.policy?.previewOnlyCannotCountTowardGate !== true) failures.push('cohort board must prevent preview-only gate credit');

const items = Array.isArray(report?.items) ? report.items : [];
const rows = Array.isArray(matrix?.rows) ? matrix.rows : [];
if ((report?.summary?.targetThreats ?? -1) !== (matrix?.summary?.targetThreats ?? -2)) failures.push('targetThreats mismatch with matrix');
if ((report?.summary?.items ?? -1) !== items.length) failures.push('summary items mismatch');
if (items.length !== rows.length) failures.push('cohort item count must match quality gate matrix rows');
if (items.length < 20) failures.push('cohort board must include at least 20 target threats');
if ((report?.summary?.acceptedThreats ?? -1) !== (matrix?.summary?.acceptedThreats ?? -2)) failures.push('acceptedThreats mismatch with matrix');
if ((report?.summary?.sourceApproved ?? -1) !== (matrix?.summary?.sourceApproved ?? -2)) failures.push('sourceApproved mismatch with matrix');
if ((report?.summary?.previewOnlyRows ?? -1) !== (matrix?.summary?.previewOnlyRows ?? -2)) failures.push('previewOnlyRows mismatch with matrix');
for (const level of ['high', 'medium', 'low', 'clear']) {
  const key = `risk${level[0].toUpperCase()}${level.slice(1)}`;
  if ((report?.summary?.[key] ?? -1) !== items.filter((item) => item.riskLevel === level).length) failures.push(`${key} mismatch with cohort items`);
}
const flagCounts = {};
for (const item of items) {
  for (const flag of item.riskFlags ?? []) flagCounts[flag.id] = (flagCounts[flag.id] ?? 0) + 1;
}
for (const [flag, count] of Object.entries(flagCounts)) {
  if (report?.summary?.riskFlags?.[flag] !== count) failures.push(`risk flag count mismatch for ${flag}`);
}

const requiredSourceLabels = ['source art', 'magenta key preview', 'source sandbox preview', 'articulation plan preview'];
const requiredRuntimeLabels = ['source parity overlay', 'contact sheet', 'phase strip', 'sandbox idle', 'sandbox lunge', 'sandbox stunned'];
for (const row of rows) {
  const item = items.find((candidate) => candidate.id === row.id);
  if (!item) {
    failures.push(`missing cohort item ${row.id}`);
    continue;
  }
  if (item.species !== row.species) failures.push(`${row.id}: species mismatch`);
  if (item.sourceApproved !== Boolean(row.sourceApproved)) failures.push(`${row.id}: sourceApproved mismatch`);
  if (item.threatAccepted !== Boolean(row.threatAccepted)) failures.push(`${row.id}: threatAccepted mismatch`);
  if (item.countsTowardGate !== Boolean(row.countsTowardGate)) failures.push(`${row.id}: countsTowardGate mismatch`);
  if (!item.sourceMetrics || typeof item.sourceMetrics !== 'object') failures.push(`${row.id}: missing sourceMetrics`);
  for (const metric of ['subjectWidthRatio', 'subjectHeightRatio', 'backgroundRatio', 'innerMagentaRatio']) {
    if (item.sourceMetrics?.[metric] !== null && !Number.isFinite(item.sourceMetrics?.[metric])) failures.push(`${row.id}: invalid source metric ${metric}`);
  }
  if (!['high', 'medium', 'low', 'clear'].includes(item.riskLevel)) failures.push(`${row.id}: invalid riskLevel ${item.riskLevel}`);
  if (!Array.isArray(item.riskFlags)) failures.push(`${row.id}: riskFlags must be an array`);
  for (const flag of item.riskFlags ?? []) {
    if (!flag.id || !['high', 'medium', 'low'].includes(flag.severity) || !flag.text) failures.push(`${row.id}: invalid risk flag ${flag.id ?? 'missing'}`);
  }
  for (const label of requiredSourceLabels) {
    const media = item.sourceMedia?.find((entry) => entry.label === label);
    if (!media?.present || !media.url) failures.push(`${row.id}: missing source media ${label}`);
  }
  for (const label of requiredRuntimeLabels) {
    const media = item.runtimeMedia?.find((entry) => entry.label === label);
    if (!media?.present || !media.url) failures.push(`${row.id}: missing runtime media ${label}`);
  }
  for (const command of ['sourcePreview', 'runtimePreview', 'sandboxVisual']) {
    if (!String(item.commands?.[command] ?? '').includes('npm run')) failures.push(`${row.id}: missing command ${command}`);
  }
}

for (const check of ['whole-creature-cohesion', 'part-continuity-cohesion', 'readable-silhouette', 'non-placeholder-art-direction']) {
  if (!report?.requiredChecks?.includes(check)) failures.push(`cohort board missing source required check ${check}`);
}
for (const check of ['single-source-cohesion', 'production-visual-cohesion', 'sandbox-behavior']) {
  if (!report?.runtimeRequiredChecks?.includes(check)) failures.push(`cohort board missing runtime required check ${check}`);
}

for (const command of ['rebuild', 'check', 'serveSmoke', 'reviewSession', 'sourceVisualBoard', 'strictSourceApply', 'strictThreatApply']) {
  if (!report?.commands?.[command]) failures.push(`cohort board missing command ${command}`);
}

for (const required of [
  'Water 9 Cohort Cohesion Board',
  'This cohort board shows all 20 target threats',
  'This board does not approve content automatically',
  'Preview-only rows cannot count toward the 20-threat gate',
  'Cohort Risk Triage',
  'Mechanical Triage',
  'data-risk-flag',
  'data-content-cohort-cohesion-board',
  'data-cohort-target',
  'Source Evidence',
  'Runtime Evidence',
  'source parity overlay',
  'sandbox stunned',
  'npm run content:cohort-cohesion-board',
  'npm run content:cohort-cohesion-board-check',
]) {
  if (!markdown.includes(required) && !includesRendered(html, required)) failures.push(`cohort outputs missing ${required}`);
}

const result = {
  schema: 'water9/content-cohort-cohesion-board-check@1',
  items: report?.summary?.items ?? null,
  targetThreats: report?.summary?.targetThreats ?? null,
  acceptedThreats: report?.summary?.acceptedThreats ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
