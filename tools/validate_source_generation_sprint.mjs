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

const sprintPath = resolve(String(args.get('sprint') ?? 'public/review/source-candidates/source-generation-sprint.json'));
const markdownPath = resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-generation-sprint.md'));
const htmlPath = resolve(String(args.get('html') ?? 'public/review/source-candidates/source-generation-sprint.html'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const rejectionPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const limit = Number(args.get('limit') ?? 5);

async function readJson(label, path, failures) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function fileOk(path, minSize = 128) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'unclassified';
}

const failures = [];
const sprint = await readJson('source generation sprint', sprintPath, failures);
const queue = await readJson('source generation queue', queuePath, failures);
const rejections = await readJson('source rejected attempts', rejectionPath, failures);
const markdown = await readFile(markdownPath, 'utf8').catch(() => '');
const html = await readFile(htmlPath, 'utf8').catch(() => '');

if (sprint?.schema !== 'water9/source-generation-sprint@1') {
  failures.push(`sprint schema is ${sprint?.schema ?? 'missing'}`);
}
if (queue?.schema !== 'water9/source-generation-queue@1') {
  failures.push(`queue schema is ${queue?.schema ?? 'missing'}`);
}

const queued = Array.isArray(queue?.candidates) ? queue.candidates : [];
const expectedIds = queued.slice(0, Math.min(limit, queued.length)).map((candidate) => candidate.id);
const sprintIds = Array.isArray(sprint?.ids) ? sprint.ids : [];
if (expectedIds.length && !sprintIds.length) failures.push('sprint ids are missing');
if (expectedIds.length && sprintIds.join(',') !== expectedIds.join(',')) {
  failures.push(`sprint ids ${sprintIds.join(',')} do not match queue top ${expectedIds.join(',')}`);
}

const candidates = Array.isArray(sprint?.candidates) ? sprint.candidates : [];
const missingArtifactsById = new Map();
for (const attempt of Array.isArray(rejections?.attempts) ? rejections.attempts : []) {
  if (rejectionKind(attempt) !== 'missing-artifact') continue;
  const candidateId = attempt.candidateId ?? 'unknown';
  missingArtifactsById.set(candidateId, (missingArtifactsById.get(candidateId) ?? 0) + 1);
}
if (candidates.length !== sprintIds.length) failures.push('sprint candidates length does not match ids length');
for (const id of sprintIds) {
  const card = candidates.find((candidate) => candidate.id === id);
  if (!card) {
    failures.push(`${id}: missing sprint candidate card`);
    continue;
  }
  if (!card.prompt || card.prompt.length < 120) failures.push(`${id}: prompt is missing or too short`);
  if (!card.inboxTarget?.endsWith(`${id}.png`)) failures.push(`${id}: inbox target must end with ${id}.png`);
  if (!card.expectedOutput?.includes(`fauna-${id}-whole-source`)) failures.push(`${id}: expected output does not include fauna-${id}-whole-source`);
  if (!Array.isArray(card.requiredRead) || card.requiredRead.length < 3) failures.push(`${id}: requiredRead is incomplete`);
  if (!Array.isArray(card.qualityChecks) || card.qualityChecks.length < 7) failures.push(`${id}: qualityChecks are incomplete`);
  if (!card.qualityChecks?.includes('part-continuity-cohesion')) failures.push(`${id}: qualityChecks missing part-continuity-cohesion`);
  if (!Array.isArray(card.cohesionLock) || card.cohesionLock.length < 5) failures.push(`${id}: cohesionLock is incomplete`);
  const expectedMissingArtifacts = missingArtifactsById.get(id) ?? 0;
  if ((card.missingArtifactAttempts ?? 0) !== expectedMissingArtifacts) failures.push(`${id}: missingArtifactAttempts ${card.missingArtifactAttempts ?? 'missing'} does not match rejection ledger ${expectedMissingArtifacts}`);
  if (expectedMissingArtifacts >= 3 && card.captureFirst !== true) failures.push(`${id}: must be capture-first after ${expectedMissingArtifacts} missing-artifact attempts`);
  if (card.captureFirst && !String(card.captureReason ?? '').includes('missing-artifact attempts')) failures.push(`${id}: capture-first card missing reason`);
  const commands = card.commands ?? sprint?.commandsById?.[id] ?? {};
  const requiredCommandKeys = card.captureFirst
    ? ['captureInbox', 'recoveryScout', 'recoverSavedFile', 'recoverDataUrl', 'recoverBase64', 'inboxCheck', 'ingestDryRun', 'ingest', 'printPrompt', 'startSession', 'checkSession']
    : ['startSession', 'checkSession', 'autoIngestSession', 'printPrompt', 'captureInbox', 'recoveryScout', 'recoverInline', 'recoverSavedFile', 'recoverDataUrl', 'recoverBase64', 'inboxCheck', 'ingestDryRun', 'ingest'];
  for (const key of requiredCommandKeys) {
    const command = commands[key];
    if (!command) {
      failures.push(`${id}: missing per-candidate command ${key}`);
      continue;
    }
    if (!command.includes(id)) failures.push(`${id}: per-candidate command ${key} does not include candidate id`);
    if (key === 'captureInbox' && !command.includes('--open')) failures.push(`${id}: captureInbox command must open the capture page`);
    if (!markdown.includes(command)) failures.push(`${id}: markdown is missing per-candidate command ${key}`);
    if (!html.includes(htmlEscape(command))) failures.push(`${id}: html is missing per-candidate command ${key}`);
  }
  if (card.captureFirst && commands.autoIngestSession) failures.push(`${id}: capture-first card must not advertise autoIngestSession`);
  if (card.captureFirst && commands.recoverInline) failures.push(`${id}: capture-first card must not advertise generic recoverInline scan`);
  if (card.captureFirst && !commands.ingestDryRun?.includes('source:ingest-current')) failures.push(`${id}: capture-first dry run must use source:ingest-current`);
  if (card.captureFirst && !commands.ingest?.includes('source:ingest-current')) failures.push(`${id}: capture-first ingest must use source:ingest-current`);
  if (card.captureFirst && Object.keys(commands)[0] !== 'captureInbox') failures.push(`${id}: capture-first command order must start with captureInbox`);
  if (!markdown.includes(card.prompt)) failures.push(`${id}: markdown is missing prompt text`);
  if (!markdown.includes('Cohesion lock:')) failures.push(`${id}: markdown is missing cohesion lock section`);
  if (!markdown.includes('Candidate commands:')) failures.push(`${id}: markdown is missing candidate commands section`);
  if (!html.includes(card.id)) failures.push(`${id}: html is missing candidate id`);
  if (!html.includes(card.inboxTarget)) failures.push(`${id}: html is missing inbox target`);
  if (!html.includes(card.prompt.slice(0, 120))) failures.push(`${id}: html is missing prompt text`);
  if (!html.includes('Cohesion Lock')) failures.push(`${id}: html is missing cohesion lock section`);
  if (!html.includes('Candidate Commands')) failures.push(`${id}: html is missing candidate commands section`);
  if (card.captureFirst) {
    if (!markdown.includes('Capture-first warning:')) failures.push(`${id}: markdown is missing capture-first warning`);
    if (!html.includes('Capture First')) failures.push(`${id}: html is missing capture-first section`);
    if (!markdown.includes(card.captureReason)) failures.push(`${id}: markdown is missing capture-first reason`);
    if (!html.includes(htmlEscape(card.captureReason))) failures.push(`${id}: html is missing capture-first reason`);
  }
  if (!markdown.includes(card.inboxTarget)) failures.push(`${id}: markdown is missing inbox target`);
}
if (candidates.some((card) => card.captureFirst) && !markdown.includes('Capture-first mode is active')) {
  failures.push('markdown is missing capture-first mode notice');
}

const requiredGlobalCommands = sprintIds.length
  ? ['inboxCheck', 'inboxIngestDryRun', 'inboxIngest', 'sourceCheck', 'sourceGallery']
  : ['sourceCheck', 'sourceGallery'];
for (const key of requiredGlobalCommands) {
  const command = sprint?.commands?.[key];
  if (!command) failures.push(`missing command ${key}`);
  else if (!markdown.includes(command)) failures.push(`markdown is missing command ${key}`);
  else if (!html.includes(command)) failures.push(`html is missing command ${key}`);
}
if (sprintIds.length) {
  for (const key of ['startFirstSession', 'checkFirstSession']) {
    const command = sprint?.commands?.[key];
    if (!command) failures.push(`missing command ${key}`);
    else if (!markdown.includes(command)) failures.push(`markdown is missing command ${key}`);
    else if (!html.includes(command)) failures.push(`html is missing command ${key}`);
  }
} else {
  if (!markdown.includes('No queued source candidates remain')) failures.push('idle sprint markdown is missing no-candidates notice');
  if (!html.includes('No queued source candidates remain')) failures.push('idle sprint html is missing no-candidates notice');
}
const firstId = sprintIds[0];
if (firstId) {
  const firstCard = candidates.find((candidate) => candidate.id === firstId);
  const expectedAutoIngest = `npm run source:imagegen-status -- --id ${firstId} --ingest`;
  if (firstCard?.captureFirst) {
    if (sprint?.commands?.autoIngestFirstSession) failures.push('capture-first sprint must not advertise autoIngestFirstSession');
    for (const key of ['firstRecommended', 'firstFallback', 'firstRecoveryScout', 'firstDataUrlRecovery', 'firstBase64Recovery']) {
      const command = sprint?.commands?.[key];
      if (!command) failures.push(`capture-first sprint missing command ${key}`);
      else if (!markdown.includes(command)) failures.push(`markdown is missing command ${key}`);
      else if (!html.includes(htmlEscape(command))) failures.push(`html is missing command ${key}`);
    }
  } else if (sprint?.commands?.autoIngestFirstSession !== expectedAutoIngest) {
    failures.push(`autoIngestFirstSession is stale; expected ${expectedAutoIngest}`);
  }
}
const minMarkdownSize = sprintIds.length ? 1024 : 512;
const minHtmlSize = sprintIds.length ? 2048 : 1024;
if (!(await fileOk(markdownPath, minMarkdownSize))) failures.push('sprint markdown is missing or too small');
if (!(await fileOk(htmlPath, minHtmlSize))) failures.push('sprint html is missing or too small');
if (!html.includes('Source Generation Sprint')) failures.push('sprint html is missing title');
if (!html.includes('#ff00ff')) failures.push('sprint html is missing magenta-background instruction');

const summary = {
  sprint: sprintPath,
  markdown: markdownPath,
  html: htmlPath,
  checked: sprintIds.length,
  ids: sprintIds,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
