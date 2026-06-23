import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const script = resolve('tools/start_source_generation_session.mjs');
const sourceManifest = resolve('public/review/source-candidates/source-candidates.json');
const sourceQueue = resolve('public/review/source-candidates/source-generation-queue.json');
const sourceRejections = resolve('public/review/source-candidates/rejected-attempts.json');
const liveQueuePayload = JSON.parse(await readFile(sourceQueue, 'utf8'));
if (!liveQueuePayload.candidates?.[0]?.id) {
  console.log(JSON.stringify({
    schema: 'water9/source-generation-session-smoke@1',
    tests: [],
    skipped: true,
    reason: 'source generation queue has no active target ids',
    failures: [],
  }, null, 2));
  process.exit(0);
}

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  if (options.expectFailure) {
    if (result.status === 0) throw new Error(`Expected failure for ${args.join(' ')}\n${result.stdout}`);
    return result;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: ${args.join(' ')}
stdout:
${result.stdout}
stderr:
${result.stderr}`);
  }
  return result;
}

function parseStdout(result) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Could not parse JSON stdout: ${error.message}
stdout:
${result.stdout}
stderr:
${result.stderr}`);
  }
}

async function makeFixture() {
  const dir = await mkdtemp(join(tmpdir(), 'water9-source-session-'));
  const generatedDir = join(dir, 'generated');
  const marker = join(dir, 'marker.json');
  const session = join(dir, 'session.json');
  const manifest = join(dir, 'source-candidates.json');
  const queue = join(dir, 'source-generation-queue.json');
  const rejections = join(dir, 'rejected-attempts.json');
  await mkdir(generatedDir, { recursive: true });
  await copyFile(sourceManifest, manifest);
  await copyFile(sourceQueue, queue);
  await copyFile(sourceRejections, rejections);
  return { dir, generatedDir, marker, session, manifest, queue, rejections };
}

async function withFixture(fn) {
  const fixture = await makeFixture();
  try {
    return await fn(fixture);
  } finally {
    await rm(fixture.dir, { recursive: true, force: true });
  }
}

async function testSessionMarksAndPrintsInboxTarget() {
  await withFixture(async (fixture) => {
    const queuePayload = JSON.parse(await readFile(fixture.queue, 'utf8'));
    const targetId = queuePayload.candidates?.[0]?.id;
    if (!targetId) throw new Error('source generation queue has no target id for session smoke');
    const data = parseStdout(run([
      '--id', targetId,
      '--json',
      '--manifest', fixture.manifest,
      '--queue', fixture.queue,
      '--rejections', fixture.rejections,
      '--marker', fixture.marker,
      '--out', fixture.session,
      '--generated-dir', fixture.generatedDir,
    ]));
    if (data.schema !== 'water9/source-generation-session@1') throw new Error(`unexpected schema ${data.schema}`);
    if (data.candidateId !== targetId) throw new Error(`unexpected candidate ${data.candidateId}`);
    if (data.manualInboxTarget !== `tools/source-inbox/${targetId}.png`) {
      throw new Error(`unexpected manual inbox target ${data.manualInboxTarget}`);
    }
    if (!data.commands?.autoIngestIfFileAppears?.includes('--ingest')) {
      throw new Error('session is missing auto-ingest command');
    }
    const expectedOpenCapture = `npm run source:inbox-capture -- --id ${targetId} --open`;
    if (data.captureFirst && data.commands.recommendedFirst !== expectedOpenCapture) {
      throw new Error(`capture-first session recommendedFirst is not target scoped: ${data.commands.recommendedFirst}`);
    }
    if (data.captureFirst && !data.commands.recommendedFallback?.includes('--image <saved-image-path>')) {
      throw new Error(`session recommendedFallback should be explicit saved-file recovery: ${data.commands.recommendedFallback}`);
    }
    if (data.commands.openInboxCapture !== expectedOpenCapture) {
      throw new Error(`session openInboxCapture is not target scoped: ${data.commands.openInboxCapture}`);
    }
    if (data.commands.inboxCheck !== `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${targetId}`) {
      throw new Error(`session inboxCheck is not target scoped: ${data.commands.inboxCheck}`);
    }
    if (data.commands.inboxIngestDryRun !== `npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids ${targetId} --dry-run`) {
      throw new Error(`session inboxIngestDryRun is not target scoped: ${data.commands.inboxIngestDryRun}`);
    }
    if (data.commands.ingestCurrentApply !== `npm run source:ingest-current -- --id ${targetId} --apply`) {
      throw new Error(`session ingestCurrentApply is missing: ${data.commands.ingestCurrentApply}`);
    }
    if (!data.auditGuidance?.lane) {
      throw new Error('session is missing subagent audit guidance');
    }
    if (!String(data.prompt ?? '').includes('Research audit hardening:')) {
      throw new Error('session prompt does not include research audit hardening');
    }
    if (!String(data.basePrompt ?? '').includes(data.species ?? '')) {
      throw new Error('session is missing the original base prompt');
    }
    const marker = JSON.parse(await readFile(fixture.marker, 'utf8'));
    if (marker.candidateId !== targetId) throw new Error(`marker was not written for ${targetId}`);
    const session = JSON.parse(await readFile(fixture.session, 'utf8'));
    if (session.candidateId !== data.candidateId) throw new Error('session file does not match stdout');
  });
}

async function testExistingSourceRequiresExplicitFlag() {
  await withFixture(async (fixture) => {
    const result = run([
      '--id', 'brine-crown',
      '--json',
      '--manifest', fixture.manifest,
      '--queue', fixture.queue,
      '--rejections', fixture.rejections,
      '--marker', fixture.marker,
      '--out', fixture.session,
      '--generated-dir', fixture.generatedDir,
    ], { expectFailure: true });
    if (!result.stderr.includes('already has source')) {
      throw new Error(`existing-source failure used wrong message:
${result.stderr}`);
    }
  });
}

const tests = [
  testSessionMarksAndPrintsInboxTarget,
  testExistingSourceRequiresExplicitFlag,
];

for (const test of tests) await test();

console.log(JSON.stringify({
  schema: 'water9/source-generation-session-smoke@1',
  tests: tests.map((test) => test.name),
  failures: [],
}, null, 2));
