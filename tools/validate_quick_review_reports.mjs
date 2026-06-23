import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = String(args.get('id') ?? '').trim();
const reportDir = resolve(String(args.get('dir') ?? 'public/review/quick-reviews'));
const minScreenshotBytes = Number(args.get('min-screenshot-bytes') ?? 4096);
const requireReady = args.has('require-ready') || args.has('requireReady');

async function readJson(path, failures, label = path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function fileOk(path, minSize = 128) {
  try {
    const info = await stat(resolve(path));
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

async function listReportPaths() {
  if (id) return [resolve(reportDir, `${id}.json`)];
  let entries = [];
  try {
    entries = await readdir(reportDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => resolve(reportDir, entry.name))
    .sort();
}

function stepOk(report, labelPrefix) {
  return (report.steps ?? []).some((step) => step.ok === true && String(step.label ?? '').startsWith(labelPrefix));
}

async function validateVisualArtifacts(report, failures) {
  const visualReportPath = report.artifacts?.visualReport;
  if (!visualReportPath) return;
  const visualReport = await readJson(resolve(visualReportPath), failures, `${report.id} visual report`);
  if (visualReport?.schema !== 'water9/sandbox-visual-check@1') {
    failures.push(`${report.id}: visual report schema is ${visualReport?.schema ?? 'missing'}`);
    return;
  }
  const result = (visualReport.results ?? []).find((candidate) => candidate.id === report.id);
  if (!result) {
    failures.push(`${report.id}: visual report is missing matching result`);
    return;
  }
  if ((result.failures ?? []).length) failures.push(`${report.id}: visual report has failures: ${result.failures.join('; ')}`);
  if (!result.screenshotPath || !(await fileOk(result.screenshotPath, minScreenshotBytes))) {
    failures.push(`${report.id}: visual screenshot is missing or too small`);
  }
  const states = Array.isArray(result.states) ? result.states : [];
  if (report.preview?.kind === 'articulated') {
    for (const stateName of ['idle', 'lunge', 'stunned']) {
      const state = states.find((candidate) => candidate.state === stateName);
      if (!state) {
        failures.push(`${report.id}: visual report missing ${stateName} state`);
        continue;
      }
      if ((state.failures ?? []).length) failures.push(`${report.id}: ${stateName} state failures: ${state.failures.join('; ')}`);
      if (!state.screenshotPath || !(await fileOk(state.screenshotPath, minScreenshotBytes))) {
        failures.push(`${report.id}: ${stateName} screenshot is missing or too small`);
      }
    }
  }
}

async function validateReport(path) {
  const failures = [];
  const report = await readJson(path, failures, path);
  if (!report) return { path, id: null, failures };
  if (report.schema !== 'water9/content-quick-review@1') failures.push(`${path}: schema is ${report.schema ?? 'missing'}`);
  if (!report.id) failures.push(`${path}: missing id`);
  if (!report.preview?.found) failures.push(`${report.id}: preview did not resolve an entity`);
  if (report.preview?.id !== report.id) failures.push(`${report.id}: preview id mismatch (${report.preview?.id ?? 'missing'})`);
  if (!report.preview?.url) failures.push(`${report.id}: preview URL is missing`);
  if (!Array.isArray(report.steps) || report.steps.length < 3) failures.push(`${report.id}: expected at least 3 quick-review steps`);
  for (const step of report.steps ?? []) {
    if (step.ok !== true || step.exitCode !== 0) failures.push(`${report.id}: step failed: ${step.label ?? 'unknown'}`);
  }
  if (!stepOk(report, 'npm run sandbox:index')) failures.push(`${report.id}: missing sandbox:index step`);
  if (!stepOk(report, 'npm run sandbox:preview')) failures.push(`${report.id}: missing sandbox:preview step`);
  if (report.artifacts?.visualReport && !stepOk(report, 'npm run sandbox:visual')) failures.push(`${report.id}: visual artifact exists without sandbox:visual step`);
  await validateVisualArtifacts(report, failures);

  if (report.preview?.kind === 'articulated') {
    if (!stepOk(report, 'npm run content:acceptance-audit')) failures.push(`${report.id}: articulated review missing acceptance audit step`);
    if (!stepOk(report, 'npm run content:exemplar-pack')) failures.push(`${report.id}: articulated review missing exemplar pack step`);
    if (!report.artifacts?.acceptanceAudit || !(await fileOk(report.artifacts.acceptanceAudit, 256))) {
      failures.push(`${report.id}: acceptance audit artifact is missing or too small`);
    }
    if (!report.artifacts?.exemplarPack || !(await fileOk(report.artifacts.exemplarPack, 256))) {
      failures.push(`${report.id}: exemplar pack artifact is missing or too small`);
    }
    if (!report.exemplarSummary) {
      failures.push(`${report.id}: missing exemplar summary`);
    } else if (requireReady && report.exemplarSummary.readyForStrictGate !== true) {
      failures.push(`${report.id}: exemplar is not ready for strict gate`);
    }
  }

  const markdownPath = path.replace(/\.json$/, '.md');
  if (!(await fileOk(markdownPath, 128))) failures.push(`${report.id}: markdown quick-review report is missing`);
  return { path, id: report.id ?? null, kind: report.preview?.kind ?? null, failures };
}

const paths = await listReportPaths();
const failures = [];
if (!paths.length) failures.push(id ? `quick-review report not found for ${id}` : `no quick-review reports found in ${reportDir}`);
const reports = [];
for (const path of paths) {
  const result = await validateReport(path);
  reports.push(result);
  failures.push(...result.failures);
}

const summary = {
  reportDir,
  reports: reports.length,
  ids: reports.map((report) => report.id).filter(Boolean),
  requireReady,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
