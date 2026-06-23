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

const reviewPath = resolve(String(args.get('review') ?? 'public/review/source-inbox/manifest.json'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const htmlPath = resolve(String(args.get('html') ?? 'public/review/source-inbox/index.html'));
const requireReady = args.has('require-ready');
const failures = [];

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function requireFile(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

const review = await readJson('source inbox review', reviewPath);
const queue = await readJson('source generation queue', queuePath);
const html = await readFile(htmlPath, 'utf8').catch((error) => {
  failures.push(`source inbox review html: could not read file: ${error.message}`);
  return '';
});
await requireFile('source inbox review html', htmlPath);

if (review?.schema !== 'water9/source-inbox-review@1') failures.push(`unexpected review schema ${review?.schema ?? 'missing'}`);
if (queue?.schema !== 'water9/source-generation-queue@1') failures.push(`unexpected queue schema ${queue?.schema ?? 'missing'}`);
if (review?.captureCommand !== 'npm run source:inbox-capture') failures.push(`unexpected captureCommand ${review?.captureCommand ?? 'missing'}`);

const reviewCandidates = Array.isArray(review?.candidates) ? review.candidates : [];
const queueCandidates = Array.isArray(queue?.candidates) ? queue.candidates : [];
const firstMissing = reviewCandidates.find((candidate) => !candidate.inboxImage) ?? null;
const firstReady = reviewCandidates.find((candidate) => candidate.ready) ?? null;
const expectedRecommendedTarget = firstMissing ?? firstReady ?? reviewCandidates[0] ?? null;
const reviewIds = reviewCandidates.map((candidate) => candidate.id);
const queueIds = queueCandidates.map((candidate) => candidate.id);
const duplicates = reviewIds.filter((id, index) => reviewIds.indexOf(id) !== index);
if (duplicates.length) failures.push(`duplicate inbox review candidate ids: ${[...new Set(duplicates)].join(', ')}`);
for (const id of queueIds) {
  if (!reviewIds.includes(id)) failures.push(`${id}: queued candidate missing from inbox review`);
}
for (const id of reviewIds) {
  if (!queueIds.includes(id)) failures.push(`${id}: inbox review candidate is not in queue`);
}
for (const candidate of reviewCandidates) {
  if (!candidate.id) failures.push('candidate missing id');
  if (!candidate.candidate?.species) failures.push(`${candidate.id}: missing species`);
  if (!candidate.candidate?.gameplayVerb) failures.push(`${candidate.id}: missing gameplay verb`);
  if (!candidate.candidate?.prompt) failures.push(`${candidate.id}: missing prompt`);
  if (!Array.isArray(candidate.candidate?.requiredRead) || candidate.candidate.requiredRead.length < 3) {
    failures.push(`${candidate.id}: missing requiredRead context`);
  }
  if (candidate.ready && !candidate.inboxImage) failures.push(`${candidate.id}: ready without inbox image`);
  if (candidate.ready && candidate.validationFailures?.length) failures.push(`${candidate.id}: ready with validation failures`);
  for (const expected of [
    `npm run source:inbox-capture -- --id ${candidate.id} --open`,
    `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${candidate.id}`,
    `npm run source:ingest-current -- --id ${candidate.id} --dry-run`,
    `npm run source:ingest-current -- --id ${candidate.id} --apply`,
  ]) {
    if (!html.includes(expected)) failures.push(`${candidate.id}: inbox review html missing target-scoped command ${expected}`);
  }
}
if (expectedRecommendedTarget) {
  const expectedCapture = `npm run source:inbox-capture -- --id ${expectedRecommendedTarget.id} --open`;
  const expectedCheck = `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${expectedRecommendedTarget.id}`;
  const expectedDryRun = `npm run source:ingest-current -- --id ${expectedRecommendedTarget.id} --dry-run`;
  const expectedApply = `npm run source:ingest-current -- --id ${expectedRecommendedTarget.id} --apply`;
  if (review?.recommendedTargetId !== expectedRecommendedTarget.id) {
    failures.push(`recommendedTargetId should be ${expectedRecommendedTarget.id}, got ${review?.recommendedTargetId ?? 'missing'}`);
  }
  if (review?.recommendedCaptureCommand !== expectedCapture) {
    failures.push(`recommendedCaptureCommand should be target-aware: ${review?.recommendedCaptureCommand ?? 'missing'}`);
  }
  if (review?.recommendedCommands?.capture !== expectedCapture) failures.push('recommendedCommands.capture mismatch');
  if (review?.recommendedCommands?.check !== expectedCheck) failures.push('recommendedCommands.check mismatch');
  if (review?.recommendedCommands?.dryRun !== expectedDryRun) failures.push('recommendedCommands.dryRun mismatch');
  if (review?.recommendedCommands?.apply !== expectedApply) failures.push('recommendedCommands.apply mismatch');
  for (const expected of [expectedCapture, expectedCheck, expectedDryRun, expectedApply, 'Recommended next capture']) {
    if (!html.includes(expected)) failures.push(`source inbox review html missing recommended detail ${expected}`);
  }
}
if ((review?.ready ?? 0) !== reviewCandidates.filter((candidate) => candidate.ready).length) failures.push('ready count mismatch');
if ((review?.missing ?? 0) !== reviewCandidates.filter((candidate) => !candidate.inboxImage).length) failures.push('missing count mismatch');
if (requireReady && (review?.ready ?? 0) < 1) failures.push('expected at least one ready source inbox image');
if (Array.isArray(review?.failures) && review.failures.length) failures.push(...review.failures.map((failure) => `review failure: ${failure}`));

const summary = {
  review: reviewPath,
  html: htmlPath,
  candidates: reviewCandidates.length,
  ready: review?.ready ?? 0,
  blocked: review?.blocked ?? 0,
  missing: review?.missing ?? 0,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
