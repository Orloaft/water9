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
  json: resolve(String(args.get('json') ?? 'public/review/content-vertical-slice-runway.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-vertical-slice-runway.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-vertical-slice-runway.html')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  sourceVisualBoard: resolve(String(args.get('source-visual-board') ?? 'public/review/source-visual-board.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  sandboxQuickstart: resolve(String(args.get('sandbox-quickstart') ?? 'public/review/sandbox/quickstart.json')),
  runtimeVisualReport: resolve(String(args.get('runtime-visual-report') ?? 'tools/scratch/content-candidate-paired-visuals-report.json')),
  acceptanceAuditIndex: resolve(String(args.get('acceptance-audit-index') ?? 'public/review/content-acceptance-audits/index.json')),
  articulatedReview: resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json')),
  visualCohesion: resolve(String(args.get('visual-cohesion') ?? 'tools/scratch/articulated-visual-cohesion.json')),
};
const minThreats = Number(args.get('min-threats') ?? 20);
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

async function fileOk(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

async function evidenceOk(owner, evidence, minSize = 128) {
  if (!evidence?.exists) {
    failures.push(`${owner}: evidence missing`);
    return;
  }
  if ((evidence.bytes ?? evidence.size ?? 0) < minSize) failures.push(`${owner}: evidence too small`);
  const path = evidence.path ?? evidence.absolute;
  if (path) await fileOk(owner, path, minSize);
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function htmlIncludes(html, value) {
  return html.includes(value) || html.includes(htmlEscape(value));
}

const report = await readJson('vertical slice runway', paths.json);
const markdown = await readText('vertical slice runway markdown', paths.markdown);
const html = await readText('vertical slice runway html', paths.html);
const stageBoard = await readJson('content stage board', paths.stageBoard);
const sourceVisualBoard = await readJson('source visual board', paths.sourceVisualBoard);
const planCoverage = await readJson('plan coverage', paths.planCoverage);
const sandboxQuickstart = await readJson('sandbox quickstart', paths.sandboxQuickstart);
const runtimeVisualReport = await readJson('runtime visual report', paths.runtimeVisualReport);
const acceptanceAuditIndex = await readJson('acceptance audit index', paths.acceptanceAuditIndex);
const articulatedReview = await readJson('articulated review manifest', paths.articulatedReview);
const visualCohesion = await readJson('articulated visual cohesion report', paths.visualCohesion);
await fileOk('vertical slice runway markdown', paths.markdown, 512);
await fileOk('vertical slice runway html', paths.html, 4096);

if (report?.schema !== 'water9/content-vertical-slice-runway@1') failures.push(`unexpected schema ${report?.schema ?? 'missing'}`);
if (stageBoard?.schema !== 'water9/content-stage-board@1') failures.push(`unexpected stage board schema ${stageBoard?.schema ?? 'missing'}`);
if (sourceVisualBoard?.schema !== 'water9/source-visual-board@1') failures.push(`unexpected source visual board schema ${sourceVisualBoard?.schema ?? 'missing'}`);
if (planCoverage?.schema !== 'water9/content-plan-coverage@1') failures.push(`unexpected plan coverage schema ${planCoverage?.schema ?? 'missing'}`);
if (sandboxQuickstart?.schema !== 'water9/sandbox-quickstart@1') failures.push(`unexpected sandbox quickstart schema ${sandboxQuickstart?.schema ?? 'missing'}`);
if (runtimeVisualReport?.schema !== 'water9/sandbox-visual-check@1') failures.push(`unexpected runtime visual report schema ${runtimeVisualReport?.schema ?? 'missing'}`);
if (acceptanceAuditIndex?.schema !== 'water9/content-acceptance-audit-index@1') failures.push(`unexpected acceptance audit index schema ${acceptanceAuditIndex?.schema ?? 'missing'}`);
if (articulatedReview?.schema !== 'water9/articulated-review@1') failures.push(`unexpected articulated review schema ${articulatedReview?.schema ?? 'missing'}`);
if (visualCohesion?.schema !== 'water9/articulated-visual-cohesion@1') failures.push(`unexpected visual cohesion schema ${visualCohesion?.schema ?? 'missing'}`);

const items = Array.isArray(report?.items) ? report.items : [];
const stageTargets = Array.isArray(stageBoard?.targets) ? stageBoard.targets : [];
if (items.length < minThreats) failures.push(`runway has ${items.length} items, expected at least ${minThreats}`);
if (items.length !== stageTargets.length) failures.push(`runway item count ${items.length} does not match stage target count ${stageTargets.length}`);
if ((report?.summary?.targetThreats ?? 0) !== (stageBoard?.summary?.targetThreats ?? 0)) failures.push('targetThreats mismatch');
if ((report?.summary?.acceptedThreats ?? -1) !== (stageBoard?.summary?.acceptedThreats ?? -2)) failures.push('acceptedThreats mismatch with stage board');
if ((report?.summary?.mechanicallyReviewable ?? -1) !== items.filter((item) => item.mechanicallyReviewable).length) failures.push('mechanicallyReviewable summary mismatch');
if (report?.summary?.allRoutesHaveContract !== items.every((item) => item.contract?.ready)) failures.push('allRoutesHaveContract summary mismatch');
if (report?.summary?.allRoutesHaveSourceEvidence !== items.every((item) => item.source?.ready)) failures.push('allRoutesHaveSourceEvidence summary mismatch');
if (report?.summary?.allRoutesHavePlans !== items.every((item) => item.plan?.ready)) failures.push('allRoutesHavePlans summary mismatch');
if (report?.summary?.allRoutesHaveRigQualityEvidence !== items.every((item) => item.rigQuality?.ready)) failures.push('allRoutesHaveRigQualityEvidence summary mismatch');
if (report?.summary?.allRoutesHaveSandbox !== items.every((item) => item.runtime?.ready)) failures.push('allRoutesHaveSandbox summary mismatch');
if (report?.summary?.allRoutesHaveRuntimeVisualEvidence !== items.every((item) => item.runtimeVisual?.ready)) failures.push('allRoutesHaveRuntimeVisualEvidence summary mismatch');
if (report?.summary?.allRoutesHaveAcceptanceAudits !== items.every((item) => item.audit?.ready)) failures.push('allRoutesHaveAcceptanceAudits summary mismatch');

const visualById = new Map((sourceVisualBoard?.items ?? []).map((item) => [item.id, item]));
const planById = new Map((planCoverage?.items ?? []).map((item) => [item.id, item]));
const sandboxById = new Map((sandboxQuickstart?.entries ?? []).map((item) => [item.id, item]));
const runtimeVisualById = new Map((runtimeVisualReport?.results ?? []).map((item) => [item.id, item]));
const acceptanceAuditById = new Map((acceptanceAuditIndex?.items ?? []).map((item) => [item.id, item]));
const articulatedById = new Map((articulatedReview?.creatures ?? []).map((item) => [item.id, item]));
const cohesionById = new Map((visualCohesion?.creatures ?? []).map((item) => [item.id, item]));
const requiredReviewFlags = ['--source-reviewed', '--contact-reviewed', '--phase-reviewed', '--parity-reviewed', '--sandbox-reviewed'];
const requiredVisualChecks = [
  '--visual-check single-source-cohesion',
  '--visual-check readable-silhouette',
  '--visual-check anatomy-cohesion',
  '--visual-check production-visual-cohesion',
  '--visual-check socket-seams',
  '--visual-check motion-stability',
  '--visual-check sandbox-behavior',
];

for (const target of stageTargets) {
  const item = items.find((candidate) => candidate.id === target.id);
  if (!item) {
    failures.push(`${target.id}: missing vertical slice route`);
    continue;
  }
  const visual = visualById.get(target.id);
  const plan = planById.get(target.id);
  const runtimeEntry = sandboxById.get(target.rigId ?? target.id);
  const sourceEntry = sandboxById.get(`source-${target.id}`);
  const runtimeVisual = runtimeVisualById.get(target.rigId ?? target.id);
  const acceptanceAudit = acceptanceAuditById.get(target.id) ?? acceptanceAuditById.get(target.rigId ?? target.id);
  const rig = articulatedById.get(target.rigId ?? target.id);
  const cohesion = cohesionById.get(target.rigId ?? target.id);
  if (!visual) failures.push(`${target.id}: missing source visual board item`);
  if (!plan) failures.push(`${target.id}: missing plan coverage item`);
  if (!runtimeEntry) failures.push(`${target.id}: missing runtime sandbox quickstart entry`);
  if (!sourceEntry) failures.push(`${target.id}: missing source sandbox quickstart entry`);
  if (!runtimeVisual) failures.push(`${target.id}: missing paired runtime visual report entry`);
  if (!acceptanceAudit) failures.push(`${target.id}: missing acceptance audit index entry`);
  if (!rig) failures.push(`${target.id}: missing articulated review manifest entry`);
  if (!cohesion) failures.push(`${target.id}: missing automated visual cohesion entry`);
  if (item.rank !== target.rank) failures.push(`${target.id}: rank mismatch`);
  if (item.species !== target.species) failures.push(`${target.id}: species mismatch`);
  if (item.stage !== target.stage) failures.push(`${target.id}: stage mismatch`);
  if (item.acceptance?.accepted !== Boolean(target.accepted)) failures.push(`${target.id}: accepted mismatch`);
  if (item.sourceReview?.humanApproved !== Boolean(target.sourceApproved || visual?.humanApproved)) failures.push(`${target.id}: source approval mismatch`);
  if (item.runtime?.runtimeId !== (target.rigId ?? null)) failures.push(`${target.id}: runtime id mismatch`);
  if (!item.contract?.ready) failures.push(`${target.id}: contract not ready`);
  if (!item.source?.ready) failures.push(`${target.id}: source evidence not ready`);
  if (!item.sourceReview?.readyForHumanReview) failures.push(`${target.id}: source review is not ready`);
  if (!item.plan?.ready) failures.push(`${target.id}: plan not ready`);
  if (!item.rigQuality?.ready) failures.push(`${target.id}: rig quality evidence not ready`);
  if (!item.runtime?.ready) failures.push(`${target.id}: runtime sandbox not ready`);
  if (!item.runtimeVisual?.ready) failures.push(`${target.id}: runtime visual evidence not ready`);
  if (!item.audit?.ready) failures.push(`${target.id}: acceptance audit evidence not ready`);
  if (item.runtimeVisual?.companion !== 'diver') failures.push(`${target.id}: runtime visual evidence must be paired with diver`);
  for (const state of ['idle', 'lunge', 'stunned']) {
    if (!(item.runtimeVisual?.states ?? []).includes(state)) failures.push(`${target.id}: runtime visual evidence missing ${state} state`);
  }
  if (item.audit?.countsTowardGate !== Boolean(target.accepted)) failures.push(`${target.id}: audit countsTowardGate mismatch`);
  if (item.rigQuality?.status !== rig?.quality?.status) failures.push(`${target.id}: rig quality status mismatch`);
  if (item.rigQuality?.autoVisualCohesion?.status !== (rig?.autoVisualCohesion?.status ?? cohesion?.status)) failures.push(`${target.id}: automated visual cohesion status mismatch`);
  if (item.rigQuality?.autoVisualCohesion?.status !== 'pass') failures.push(`${target.id}: automated visual cohesion must pass before route is mechanically reviewable`);
  if (item.rigQuality?.autoVisualCohesion?.productionStatus !== 'requires-human-review') failures.push(`${target.id}: automated visual cohesion must preserve human production-review boundary`);
  if (!item.rigQuality?.humanReviewRequired) failures.push(`${target.id}: rig quality must explicitly require human production review`);
  if ((item.rigQuality?.sourceParity?.failures ?? []).length) failures.push(`${target.id}: source parity has failures`);
  for (const flag of requiredReviewFlags) {
    if (!(item.rigQuality?.requiredAcceptanceFlags ?? []).includes(flag)) failures.push(`${target.id}: rig quality acceptance flags missing ${flag}`);
  }
  for (const flag of requiredVisualChecks) {
    if (!(item.rigQuality?.requiredAcceptanceFlags ?? []).includes(flag)) failures.push(`${target.id}: rig quality visual checks missing ${flag}`);
  }
  if (!String(item.runtime?.pairedPreviewCommand ?? '').includes(`npm run sandbox:preview -- --id ${item.runtime.runtimeId} --with diver`)) {
    failures.push(`${target.id}: runtime paired preview command missing`);
  }
  if (!String(item.runtime?.pairedVisualCheckCommand ?? '').includes(`npm run sandbox:visual -- --ids ${item.runtime.runtimeId}`) || !String(item.runtime?.pairedVisualCheckCommand ?? '').includes('--with diver')) {
    failures.push(`${target.id}: runtime paired visual command missing`);
  }
  if (!(item.commands ?? []).includes(sourceEntry?.pairedPreviewCommand)) failures.push(`${target.id}: commands missing source paired preview`);
  if (!(item.commands ?? []).includes(runtimeEntry?.pairedPreviewCommand)) failures.push(`${target.id}: commands missing runtime paired preview`);
  if (!(item.commands ?? []).includes(runtimeEntry?.pairedVisualCheckCommand)) failures.push(`${target.id}: commands missing runtime paired visual check`);
  if (!(item.commands ?? []).some((command) => String(command).includes('content-candidate-paired-visuals-report.json'))) failures.push(`${target.id}: commands missing content candidate paired visual report refresh`);
  if (!(item.commands ?? []).some((command) => String(command).includes('npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview'))) {
    failures.push(`${target.id}: commands missing articulated rig quality refresh`);
  }
  if (!(item.commands ?? []).some((command) => String(command).includes('npm run content:acceptance-audit'))) failures.push(`${target.id}: commands missing acceptance audit`);
  for (const command of item.commands ?? []) {
    if ((String(command).includes('npm run source:accept ') || String(command).includes('npm run content:accept ')) && !String(command).includes('--dry-run')) {
      failures.push(`${target.id}: decision command must be dry-run in runway`);
    }
    if (!markdown.includes(command)) failures.push(`markdown missing route command for ${target.id}: ${command}`);
  }
  await evidenceOk(`${target.id}: contract markdown`, item.contract?.evidence?.markdown, 512);
  await evidenceOk(`${target.id}: contract json`, item.contract?.evidence?.json, 512);
  await evidenceOk(`${target.id}: source image`, item.source?.evidence?.source, 512);
  await evidenceOk(`${target.id}: key preview`, item.source?.evidence?.keyPreview, 512);
  await evidenceOk(`${target.id}: source sandbox screenshot`, item.source?.evidence?.sandboxScreenshot, 512);
  await evidenceOk(`${target.id}: articulation plan`, item.plan?.evidence?.plan, 512);
  await evidenceOk(`${target.id}: articulation plan preview`, item.plan?.evidence?.planPreview, 512);
  await evidenceOk(`${target.id}: rig contact sheet`, item.rigQuality?.evidence?.contactSheet, 512);
  await evidenceOk(`${target.id}: rig contact thumbnail`, item.rigQuality?.evidence?.contactThumb, 512);
  await evidenceOk(`${target.id}: rig phase strip`, item.rigQuality?.evidence?.phaseStrip, 512);
  await evidenceOk(`${target.id}: rig phase thumbnail`, item.rigQuality?.evidence?.phaseThumb, 512);
  await evidenceOk(`${target.id}: rig source parity`, item.rigQuality?.evidence?.sourceParity, 512);
  await evidenceOk(`${target.id}: rig source parity thumbnail`, item.rigQuality?.evidence?.sourceParityThumb, 512);
  for (const state of item.runtimeVisual?.evidence ?? []) {
    await evidenceOk(`${target.id}: runtime visual ${state.state}`, state.evidence, 512);
  }
  await evidenceOk(`${target.id}: acceptance audit json`, item.audit?.evidence?.json, 512);
  await evidenceOk(`${target.id}: acceptance audit markdown`, item.audit?.evidence?.markdown, 512);
  await evidenceOk(`${target.id}: acceptance audit html`, item.audit?.evidence?.html, 512);
  if (!markdown.includes(`\`${target.id}\``)) failures.push(`markdown missing ${target.id}`);
  if (!html.includes(`data-vertical-slice-route="${target.id}"`)) failures.push(`html missing route marker for ${target.id}`);
  if (!htmlIncludes(html, item.runtime?.pairedPreviewCommand)) failures.push(`html missing paired runtime preview command for ${target.id}`);
  if (!htmlIncludes(html, item.runtimeVisual?.screenshotPath)) failures.push(`html missing runtime visual screenshot path for ${target.id}`);
  for (const rigMedia of [
    item.rigQuality?.media?.contactThumb,
    item.rigQuality?.media?.phaseThumb,
    item.rigQuality?.media?.sourceParityThumb,
  ]) {
    if (rigMedia && !htmlIncludes(html, rigMedia)) failures.push(`html missing rig quality media for ${target.id}: ${rigMedia}`);
  }
  if (item.audit?.htmlHref && !htmlIncludes(html, item.audit.htmlHref)) failures.push(`html missing audit link for ${target.id}`);
}

for (const required of [
  'Water9 Content Vertical Slice Runway',
  'Mechanically reviewable routes',
  'Accepted threats',
  'Prototype screenshots do not count as accepted content',
  'Runtime Visuals',
  'Rig Quality',
  'human production approval still required',
  'Acceptance Audit',
  'npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview',
  'npm run content:vertical-slice',
  'npm run content:vertical-slice-check',
  'npm run content:goal-gate',
]) {
  if (!markdown.includes(required) && !htmlIncludes(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const summary = {
  schema: 'water9/content-vertical-slice-runway-check@1',
  items: items.length,
  acceptedThreats: report?.summary?.acceptedThreats ?? null,
  nextBlocker: report?.summary?.nextBlocker ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
