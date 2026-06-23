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
  json: resolve(String(args.get('json') ?? 'public/review/content-goal-readiness.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-goal-readiness.md')),
  articulatedManifest: resolve(String(args.get('articulated-manifest') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  sourceCriticRegenerationHealth: resolve(String(args.get('source-critic-regeneration-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  sourceReviewSequencer: resolve(String(args.get('source-review-sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json')),
  sourceRegenerationWorkspace: resolve(String(args.get('source-regeneration-workspace') ?? 'public/review/source-candidates/source-regeneration-workspace.json')),
};
const strict = args.has('strict');
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

const report = await readJson('content goal readiness', paths.json);
const markdown = await readText('content goal readiness markdown', paths.markdown);
const articulatedManifest = await readJson('articulated manifest', paths.articulatedManifest);
const sourceCriticRegenerationHealth = await readJson('source critic regeneration health', paths.sourceCriticRegenerationHealth);
const sourceReviewSequencer = await readJson('source review sequencer', paths.sourceReviewSequencer);
const sourceRegenerationWorkspace = await readJson('source regeneration workspace', paths.sourceRegenerationWorkspace);
await fileOk('content goal readiness markdown', paths.markdown, 512);
const manifestPrototypeCount = Array.isArray(articulatedManifest?.creatures)
  ? articulatedManifest.creatures.filter((creature) => creature?.quality?.status === 'prototype').length
  : 0;

if (report?.schema !== 'water9/content-goal-readiness@1') failures.push(`unexpected schema ${report?.schema ?? 'missing'}`);
if (sourceCriticRegenerationHealth?.schema !== 'water9/source-critic-regeneration-health@1') failures.push(`unexpected source critic regeneration health schema ${sourceCriticRegenerationHealth?.schema ?? 'missing'}`);
if (sourceReviewSequencer?.schema !== 'water9/source-review-sequencer@1') failures.push(`unexpected source review sequencer schema ${sourceReviewSequencer?.schema ?? 'missing'}`);
if (sourceRegenerationWorkspace?.schema !== 'water9/source-regeneration-workspace@1') failures.push(`unexpected source regeneration workspace schema ${sourceRegenerationWorkspace?.schema ?? 'missing'}`);
if ((report?.targetThreats ?? 0) < minThreats) failures.push(`targetThreats ${report?.targetThreats ?? 'missing'} below ${minThreats}`);
if (!Array.isArray(report?.milestones) || report.milestones.length < 6) failures.push('milestones are missing or incomplete');
const milestoneIds = new Set((report?.milestones ?? []).map((item) => item.id));
for (const id of ['research', 'source-images', 'source-review', 'rigging', 'sandbox', 'acceptance']) {
  if (!milestoneIds.has(id)) failures.push(`missing milestone ${id}`);
}
const incompleteMilestone = (report?.milestones ?? []).find((item) => item.complete !== true);
if (report?.strictGoalComplete !== !incompleteMilestone) failures.push('strictGoalComplete does not match milestone completion');
if (incompleteMilestone && report?.nextAction?.stage !== incompleteMilestone.id) {
  failures.push(`nextAction stage ${report?.nextAction?.stage ?? 'missing'} does not match first incomplete milestone ${incompleteMilestone.id}`);
}
if (!Array.isArray(report?.nextAction?.commands) || report.nextAction.commands.length < 1) failures.push('nextAction commands are missing');
if (report?.nextAction?.stage === 'source-images') {
  const commands = report.nextAction.commands ?? [];
  if (!commands.some((command) => String(command).includes('source:generate-openai-batch'))) {
    failures.push('source-images nextAction must expose source:generate-openai-batch');
  }
  if (!commands.some((command) => String(command).includes('source:inbox-capture') && String(command).includes('--ids'))) {
    failures.push('source-images nextAction must expose batch source:inbox-capture --ids');
  }
  if (!commands.some((command) => String(command).includes('source:ingest-batch') && String(command).includes('--dry-run'))) {
    failures.push('source-images nextAction must expose batch ingest dry-run');
  }
  if (!commands.some((command) => String(command).includes('source:advance-inbox'))) {
    failures.push('source-images nextAction must expose source:advance-inbox');
  }
}
if (report?.nextAction?.stage === 'source-review') {
  const commands = report.nextAction.commands ?? [];
  for (const expected of [
    'npm run source:critic-regeneration',
    'npm run source:critic-regeneration-check',
    'npm run source:critic-regeneration:serve-smoke',
    'npm run source:critic-regeneration-openai-smoke',
    'npm run source:critic-regeneration-health',
    'npm run source:critic-regeneration-health-check',
    'npm run source:critic-regeneration-health:serve-smoke',
    'npm run source:review-sequencer',
    'npm run source:review-sequencer-check',
    'npm run source:review-sequencer:serve-smoke',
    'npm run source:regeneration-workspace',
    'npm run source:regeneration-workspace-check',
    'npm run source:regeneration-workspace:serve-smoke',
    'npm run source:approval-runway',
    'npm run source:approval-runway-check',
    'npm run source:approval-runway:preview',
    'npm run source:approval-session',
    'npm run source:approval-session-check',
    'npm run source:approval-session:serve-smoke',
    'npm run source:visual-board',
    'npm run source:visual-board-check',
    'npm run source:review-dossier',
    'npm run source:review-dossier-check',
    'npm run content:review-session',
    'npm run content:review-session-check',
    'npm run content:review-session:serve-smoke',
    'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
  ]) {
    if (!commands.includes(expected)) failures.push(`source-review nextAction must expose ${expected}`);
  }
  for (const command of commands.filter((entry) => String(entry).includes('npm run source:accept'))) {
    if (!String(command).includes('--dry-run')) failures.push('source-review nextAction source:accept commands must be dry-run only');
  }
  if ((report?.sourceReview?.criticRegenerationRequired ?? 0) > 0) {
    const health = report?.sourceReview?.criticRegenerationHealth ?? {};
    if ((health.distinctReplacementReady ?? null) !== (sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? null)) failures.push('sourceReview criticRegenerationHealth distinctReplacementReady mismatch');
    if ((health.validNoopReplacements ?? null) !== (sourceCriticRegenerationHealth?.summary?.validNoopReplacements ?? null)) failures.push('sourceReview criticRegenerationHealth validNoopReplacements mismatch');
    if ((health.missingReplacements ?? null) !== (sourceCriticRegenerationHealth?.summary?.missingReplacements ?? null)) failures.push('sourceReview criticRegenerationHealth missingReplacements mismatch');
    if ((health.invalidReplacements ?? null) !== (sourceCriticRegenerationHealth?.summary?.invalidReplacements ?? null)) failures.push('sourceReview criticRegenerationHealth invalidReplacements mismatch');
    if ((health.nextActionStatus ?? null) !== (sourceCriticRegenerationHealth?.summary?.nextActionStatus ?? null)) failures.push('sourceReview criticRegenerationHealth nextActionStatus mismatch');
    const sequencer = report?.sourceReview?.sequencer ?? {};
    if ((sequencer.nextLane ?? null) !== (sourceReviewSequencer?.summary?.nextLane ?? null)) failures.push('sourceReview sequencer nextLane mismatch');
    if ((sequencer.nextTarget ?? null) !== (sourceReviewSequencer?.summary?.nextTarget ?? null)) failures.push('sourceReview sequencer nextTarget mismatch');
    if ((sequencer.approvalReady ?? null) !== (sourceReviewSequencer?.summary?.approvalReady ?? null)) failures.push('sourceReview sequencer approvalReady mismatch');
    if ((sequencer.criticRegenerationRequired ?? null) !== (sourceReviewSequencer?.summary?.criticRegenerationRequired ?? null)) failures.push('sourceReview sequencer criticRegenerationRequired mismatch');
    if ((sequencer.distinctReplacementReady ?? null) !== (sourceReviewSequencer?.summary?.distinctReplacementReady ?? null)) failures.push('sourceReview sequencer distinctReplacementReady mismatch');
    if ((sequencer.validNoopReplacements ?? null) !== (sourceReviewSequencer?.summary?.validNoopReplacements ?? null)) failures.push('sourceReview sequencer validNoopReplacements mismatch');
    if ((sequencer.missingReplacements ?? null) !== (sourceReviewSequencer?.summary?.missingReplacements ?? null)) failures.push('sourceReview sequencer missingReplacements mismatch');
    if ((sequencer.invalidReplacements ?? null) !== (sourceReviewSequencer?.summary?.invalidReplacements ?? null)) failures.push('sourceReview sequencer invalidReplacements mismatch');
    const regenerationWorkspace = report?.sourceReview?.regenerationWorkspace ?? {};
    const expectedWorkspace = sourceRegenerationWorkspace?.target ?? {};
    if ((regenerationWorkspace.target ?? null) !== (expectedWorkspace.id ?? null)) failures.push('sourceReview regenerationWorkspace target mismatch');
    if ((regenerationWorkspace.lane ?? null) !== (expectedWorkspace.lane ?? null)) failures.push('sourceReview regenerationWorkspace lane mismatch');
    if ((regenerationWorkspace.healthStatus ?? null) !== (expectedWorkspace.healthStatus ?? null)) failures.push('sourceReview regenerationWorkspace healthStatus mismatch');
    if (Boolean(regenerationWorkspace.replacementMatchesCurrentSource) !== Boolean(expectedWorkspace.replacementMatchesCurrentSource)) failures.push('sourceReview regenerationWorkspace no-op flag mismatch');
    if (Boolean(regenerationWorkspace.distinctReplacementReady) !== Boolean(expectedWorkspace.distinctReplacementReady)) failures.push('sourceReview regenerationWorkspace distinct-ready flag mismatch');
    if ((regenerationWorkspace.sourceSha256 ?? null) !== (expectedWorkspace.source?.sha256 ?? null)) failures.push('sourceReview regenerationWorkspace sourceSha256 mismatch');
    if ((regenerationWorkspace.inboxSha256 ?? null) !== (expectedWorkspace.inbox?.sha256 ?? null)) failures.push('sourceReview regenerationWorkspace inboxSha256 mismatch');
    if ((regenerationWorkspace.page ?? null) !== '/review/source-candidates/source-regeneration-workspace.html') failures.push('sourceReview regenerationWorkspace page mismatch');
    if (!commands.some((command) => String(command).includes('source:critic-regeneration-health'))) {
      failures.push('source-review nextAction must expose critic regeneration health command');
    }
    if (!commands.some((command) => String(command).includes('source:review-sequencer'))) {
      failures.push('source-review nextAction must expose source review sequencer command');
    }
    if (!commands.some((command) => String(command).includes('source:regeneration-workspace'))) {
      failures.push('source-review nextAction must expose source regeneration workspace command');
    }
    if ((sourceCriticRegenerationHealth?.summary?.distinctReplacementReady ?? 0) > 0) {
      if (!commands.some((command) => String(command).includes('source:ingest') && String(command).includes('--overwrite --dry-run'))) {
        failures.push('source-review nextAction must expose critic regeneration dry-run replace command when a distinct replacement is ready');
      }
    } else {
      if (commands.some((command) => String(command).includes('source:ingest') && String(command).includes('--overwrite'))) {
        failures.push('source-review nextAction must not expose overwrite ingest while no distinct critic replacement is ready');
      }
      if (!commands.some((command) => String(command).includes('source:generate-openai') && String(command).includes('source-critic-regeneration-queue.json'))
        && !commands.some((command) => String(command).includes('source:inbox-capture'))
        && !commands.some((command) => String(command).includes('source:recover-inline'))) {
        failures.push('source-review nextAction must expose regeneration or capture commands while no distinct replacement is ready');
      }
    }
    if (!String(report?.nextAction?.title ?? '').includes('critic regeneration')) {
      failures.push('source-review nextAction title must mention critic regeneration blockers');
    }
  }
}
for (const command of report?.nextAction?.commands ?? []) {
  if (!markdown.includes(command)) failures.push(`markdown missing next command ${command}`);
}
for (const required of [
  'Water9 Content Goal Readiness',
  'Strict goal complete',
  'Next stage',
  'Human Approval Boundary',
  'reviewed-only decision exports',
  'critic regeneration',
  'Critic Regeneration Health',
  'Source Review Sequencer',
  'Source Regeneration Workspace',
  'Valid no-op replacements',
  'Replacement matches current source',
  'Workspace page',
  'Next Commands',
  'Milestones',
  'npm run content:goal-readiness-strict',
  'npm run content:gate',
]) {
  if (!markdown.includes(required)) failures.push(`markdown missing ${required}`);
}
if ((report?.readyReviewQueue ?? []).length > 0) {
  const first = report.readyReviewQueue[0];
  if (first.approvalRunwayPreviewCommand !== 'npm run source:approval-runway:preview') {
    failures.push(`${first.id}: readyReviewQueue missing approval runway preview command`);
  }
  if (first.visualBoardCommand !== 'npm run source:visual-board') {
    failures.push(`${first.id}: readyReviewQueue missing visual board command`);
  }
  if (!String(first.sourcePreviewCommand ?? '').includes(`npm run sandbox:preview -- --id ${first.id} --kind source`)) {
    failures.push(`${first.id}: readyReviewQueue missing source preview command`);
  }
  if (!String(first.acceptCommand ?? '').includes(`npm run source:accept -- --id ${first.id}`)) {
    failures.push(`${first.id}: readyReviewQueue missing accept command`);
  }
  if (!String(first.acceptCommandDryRun ?? '').includes(`npm run source:accept -- --id ${first.id}`) || !String(first.acceptCommandDryRun ?? '').includes('--dry-run')) {
    failures.push(`${first.id}: readyReviewQueue missing dry-run accept command`);
  }
}
if (!report?.prototypeQuarantine || typeof report.prototypeQuarantine !== 'object') {
  failures.push('prototypeQuarantine section is missing');
} else {
  const quarantine = report.prototypeQuarantine;
  if (!String(quarantine.policy ?? '').includes('do not count toward the 20-threat goal')) {
    failures.push('prototypeQuarantine policy must explicitly state prototypes do not count toward the goal');
  }
  if (!Number.isInteger(quarantine.count) || quarantine.count < 0) {
    failures.push('prototypeQuarantine count is invalid');
  }
  if (quarantine.count !== manifestPrototypeCount) {
    failures.push(`prototypeQuarantine count ${quarantine.count} does not match manifest prototype count ${manifestPrototypeCount}`);
  }
  if (quarantine.notCountedTowardGoal !== quarantine.count) {
    failures.push('prototypeQuarantine notCountedTowardGoal must match count');
  }
  if (!Array.isArray(quarantine.ids) || quarantine.ids.length !== quarantine.count) {
    failures.push('prototypeQuarantine ids must match count');
  }
  if (quarantine.count > 0 && (!Array.isArray(quarantine.samples) || quarantine.samples.length < 1)) {
    failures.push('prototypeQuarantine samples are missing');
  }
  for (const item of quarantine.samples ?? []) {
    if (item.notCountedTowardGoal !== true) failures.push(`${item.id ?? 'prototype'}: notCountedTowardGoal must be true`);
    if (item.status !== 'prototype') failures.push(`${item.id ?? 'prototype'}: sample status must be prototype`);
    if (!String(item.blocker ?? '').includes('strict human rig acceptance')) {
      failures.push(`${item.id ?? 'prototype'}: blocker must mention strict human rig acceptance`);
    }
    if (!String(item.previewCommand ?? '').includes(`npm run sandbox:preview -- --id ${item.id}`)) {
      failures.push(`${item.id ?? 'prototype'}: missing sandbox preview command`);
    }
    if (!String(item.auditCommand ?? '').includes(`npm run content:acceptance-audit -- --id ${item.id}`)) {
      failures.push(`${item.id ?? 'prototype'}: missing acceptance audit command`);
    }
  }
  if (!markdown.includes('Prototype Quarantine')) failures.push('markdown missing Prototype Quarantine section');
  for (const item of quarantine.samples ?? []) {
    if (!markdown.includes(item.previewCommand)) failures.push(`markdown missing prototype preview command for ${item.id}`);
    if (!markdown.includes(item.auditCommand)) failures.push(`markdown missing prototype audit command for ${item.id}`);
  }
}
if (strict && report?.strictGoalComplete !== true) {
  failures.push(`strict content goal incomplete at ${report?.nextAction?.stage ?? 'unknown'}: ${report?.nextAction?.title ?? 'missing next action'}`);
}

const summary = {
  schema: 'water9/content-goal-readiness-check@1',
  strict,
  strictGoalComplete: report?.strictGoalComplete ?? null,
  nextStage: report?.nextAction?.stage ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
