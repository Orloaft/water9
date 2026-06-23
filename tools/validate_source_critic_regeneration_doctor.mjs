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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-critic-regeneration-doctor.html')),
  queue: resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-critic-regeneration-queue.json')),
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

async function fileOk(label, path, minSize = 128) {
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

const doctor = await readJson('critic regeneration doctor', paths.json);
const queue = await readJson('critic regeneration queue', paths.queue);
const markdown = await readText('critic regeneration doctor markdown', paths.markdown);
const html = await readText('critic regeneration doctor html', paths.html);

await fileOk('critic regeneration doctor markdown', paths.markdown, 1024);
await fileOk('critic regeneration doctor html', paths.html, 2048);

if (doctor?.schema !== 'water9/source-critic-regeneration-doctor@1') failures.push(`doctor schema is ${doctor?.schema ?? 'missing'}`);
if (queue?.schema !== 'water9/source-critic-regeneration-queue@1') failures.push(`queue schema is ${queue?.schema ?? 'missing'}`);
if (doctor?.policy?.doesNotApproveSources !== true) failures.push('doctor must not approve sources');
if (doctor?.policy?.doesNotAcceptThreats !== true) failures.push('doctor must not accept threats');
if (doctor?.policy?.replacementMustReturnToSourceReview !== true) failures.push('doctor must require replacement return to source review');

const expected = queue?.nextCandidate ?? (Array.isArray(queue?.candidates) ? queue.candidates[0] : null) ?? null;
const target = doctor?.target ?? {};
if ((doctor?.summary?.regenerateCandidates ?? -1) !== (queue?.summary?.regenerateCandidates ?? -2)) failures.push('doctor regenerateCandidates does not match queue');
if ((doctor?.summary?.nextCandidateId ?? null) !== (expected?.id ?? null)) failures.push('doctor nextCandidateId does not match queue');
if ((doctor?.summary?.nextCandidateSpecies ?? null) !== (expected?.species ?? null)) failures.push('doctor nextCandidateSpecies does not match queue');
if (target.id !== (expected?.id ?? null)) failures.push('doctor target id does not match queue next candidate');
if (!['replacement-needed', 'replacement-inbox-blocked', 'replacement-ready-to-ingest', 'replacement-matches-current-source', 'no-regeneration-needed'].includes(target.status)) {
  failures.push(`doctor target status is invalid: ${target.status}`);
}
if (doctor?.summary?.status !== target.status) failures.push('doctor summary status does not match target status');
if (doctor?.summary?.readyForReplacementIngest !== Boolean(target.readyForReplacementIngest)) failures.push('doctor summary readyForReplacementIngest mismatch');
if (doctor?.summary?.replacementMatchesCurrentSource !== Boolean(target.replacementMatchesCurrentSource)) failures.push('doctor summary replacementMatchesCurrentSource mismatch');
if ((doctor?.summary?.inboxFiles ?? -1) !== (target.inboxFiles ?? []).length) failures.push('doctor summary inboxFiles mismatch');
if ((doctor?.summary?.validInboxFiles ?? -1) !== (target.inboxFiles ?? []).filter((file) => file.imageCheck?.passed).length) failures.push('doctor summary validInboxFiles mismatch');

if (expected) {
  if (!Array.isArray(target.expectedInboxFiles) || !target.expectedInboxFiles.includes(`tools/source-inbox/${expected.id}.png`)) {
    failures.push('doctor target missing primary expected inbox file');
  }
  if (!target.expectedInboxFiles?.includes(`tools/source-inbox/fauna-${expected.id}-whole-source.png`)) {
    failures.push('doctor target missing alternate expected inbox file');
  }
  if (!Array.isArray(target.commands) || target.commands.length < 1) failures.push('doctor target commands are missing');
  const expectedCommandSets = {
    'replacement-needed': [
      expected.commands?.openPrompt,
      expected.commands?.markImagegen,
      expected.commands?.checkImagegen,
      expected.commands?.ingestImagegen,
      expected.commands?.captureManual,
      expected.commands?.recoverSavedImage,
      expected.commands?.generateOpenAiDryRun,
      expected.commands?.generateOpenAiApply,
    ],
    'replacement-inbox-blocked': [
      expected.commands?.validateInbox,
      expected.commands?.captureManual,
      expected.commands?.recoverSavedImage,
      expected.commands?.markImagegen,
      expected.commands?.checkImagegen,
      expected.commands?.generateOpenAiDryRun,
    ],
    'replacement-ready-to-ingest': [
      expected.commands?.validateInbox,
      expected.commands?.dryRunReplace,
      expected.commands?.applyReplace,
      expected.commands?.imageCheck,
      expected.commands?.sourcePreview,
      expected.commands?.rebuildEvidence,
    ],
    'replacement-matches-current-source': [
      expected.commands?.openPrompt,
      expected.commands?.markImagegen,
      expected.commands?.checkImagegen,
      expected.commands?.ingestImagegen,
      expected.commands?.captureManual,
      expected.commands?.recoverSavedImage,
      expected.commands?.generateOpenAiDryRun,
      expected.commands?.generateOpenAiApply,
    ],
  };
  for (const command of (expectedCommandSets[target.status] ?? []).filter(Boolean)) {
    if (!target.commands.includes(command)) failures.push(`doctor target commands missing ${command}`);
  }
}

for (const required of [
  'Water 9 Critic Regeneration Doctor',
  'does not approve source art',
  target.id,
  target.status,
  'tools/source-inbox',
  '/review/source-candidates/source-critic-regeneration-queue.html#next-regeneration-target',
]) {
  if (required && !markdown.includes(required)) failures.push(`markdown missing ${required}`);
  if (required && !includesHtml(html, required)) failures.push(`html missing ${required}`);
}
if (!includesHtml(html, `data-critic-regeneration-doctor="${target.id ?? 'none'}"`)) {
  failures.push('html missing critic regeneration doctor marker');
}
for (const command of target.commands ?? []) {
  if (!markdown.includes(command)) failures.push(`markdown missing command ${command}`);
  if (!includesHtml(html, command)) failures.push(`html missing command ${command}`);
}

const result = {
  schema: 'water9/source-critic-regeneration-doctor-check@1',
  target: target.id ?? null,
  status: target.status ?? null,
  readyForReplacementIngest: Boolean(target.readyForReplacementIngest),
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
