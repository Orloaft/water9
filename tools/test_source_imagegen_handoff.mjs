import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const handoffScript = resolve('tools/source_imagegen_handoff.mjs');
const fixtureImage = resolve('public/assets/generated/fauna-brine-crown-whole-source.png');
const invalidFixtureImage = resolve('assets/upgradeassets.png');
const sourceManifest = resolve('public/review/source-candidates/source-candidates.json');
const sourceQueue = resolve('public/review/source-candidates/source-generation-queue.json');
const queuePayload = JSON.parse(await readFile(sourceQueue, 'utf8'));
const targetId = queuePayload.candidates?.[0]?.id;
const mismatchId = queuePayload.candidates?.[1]?.id ?? 'saber-viperfish';
if (!targetId) {
  console.log(JSON.stringify({
    schema: 'water9/source-imagegen-handoff-smoke@1',
    tests: [],
    skipped: true,
    reason: 'source generation queue has no active target ids',
    failures: [],
  }, null, 2));
  process.exit(0);
}

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [handoffScript, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  const expectFailure = options.expectFailure === true;
  if (expectFailure) {
    if (result.status === 0) {
      throw new Error(`Expected command to fail: ${args.join(' ')}
stdout:
${result.stdout}`);
    }
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
  const dir = await mkdtemp(join(tmpdir(), 'water9-imagegen-handoff-'));
  const generatedDir = join(dir, 'generated');
  const projectGeneratedDir = join(dir, 'project-generated');
  const marker = join(dir, 'marker.json');
  const manifest = join(dir, 'source-candidates.json');
  const rejections = join(dir, 'rejected-attempts.json');
  await mkdir(generatedDir, { recursive: true });
  await writeFile(rejections, `${JSON.stringify({ schema: 'water9/source-rejected-attempts@1', attempts: [] }, null, 2)}\n`);
  await copyFile(sourceManifest, manifest);
  await rm(projectGeneratedDir, { recursive: true, force: true });
  await writeFile(manifest, await readFile(sourceManifest, 'utf8'));
  return { dir, generatedDir, projectGeneratedDir, marker, manifest, rejections };
}

async function withFixture(fn) {
  const fixture = await makeFixture();
  try {
    return await fn(fixture);
  } finally {
    await rm(fixture.dir, { recursive: true, force: true });
  }
}

async function mark(fixture, id = 'gulper-eel-maw') {
  run([
    '--mark',
    '--id', id,
    '--marker', fixture.marker,
    '--generated-dir', fixture.generatedDir,
  ]);
}

async function testZeroFileIngestFails() {
  await withFixture(async (fixture) => {
    await mark(fixture, targetId);
    const result = run([
      '--status',
      '--ingest',
      '--dry-run',
      '--id', targetId,
      '--marker', fixture.marker,
      '--generated-dir', fixture.generatedDir,
      '--manifest', fixture.manifest,
      '--rejections', fixture.rejections,
      '--project-generated-dir', fixture.projectGeneratedDir,
    ], { expectFailure: true });
    if (!result.stderr.includes('no handoff files')) {
      throw new Error(`Zero-file ingest failed for the wrong reason:
${result.stderr}`);
    }
  });
}

async function testRejectMissingDryRun() {
  await withFixture(async (fixture) => {
    await mark(fixture, targetId);
    const data = parseStdout(run([
      '--status',
      '--reject-missing',
      '--dry-run',
      '--id', targetId,
      '--marker', fixture.marker,
      '--generated-dir', fixture.generatedDir,
      '--manifest', fixture.manifest,
      '--rejections', fixture.rejections,
    ]));
    if (!data.rejectedMissingArtifact || data.missingRejection?.candidateId !== targetId) {
      throw new Error(`reject-missing dry-run did not report a ${targetId} missing-artifact rejection`);
    }
    if (!data.manualInbox?.target?.endsWith(`tools/source-inbox/${targetId}.png`)) {
      throw new Error(`reject-missing status did not include the manual inbox target:
${JSON.stringify(data.manualInbox, null, 2)}`);
    }
    if (data.captureUrl !== `http://127.0.0.1:5188/?id=${targetId}`
      || data.manualInbox?.captureUrl !== `http://127.0.0.1:5188/?id=${targetId}`) {
      throw new Error(`reject-missing status did not include the direct capture URL:
${JSON.stringify(data, null, 2)}`);
    }
    if (!data.manualInbox?.commands?.some((command) => command === `npm run source:inbox-capture -- --id ${targetId} --open`)) {
      throw new Error(`reject-missing status did not include the capture-open command:
${JSON.stringify(data.manualInbox, null, 2)}`);
    }
    if (!data.manualInbox?.commands?.some((command) => command.includes('source:recover-inline') && command.includes('--copy --validate'))) {
      throw new Error(`reject-missing status did not include a recover-inline copy/validate command:
${JSON.stringify(data.manualInbox, null, 2)}`);
    }
    if (data.manualInbox?.commands?.some((command) => command.includes('source:ingest-batch'))) {
      throw new Error(`manual inbox commands should not advertise batch ingest for one target:
${JSON.stringify(data.manualInbox, null, 2)}`);
    }
    if (!data.manualInbox?.commands?.includes(`npm run source:ingest-current -- --id ${targetId} --dry-run`)
      || !data.manualInbox?.commands?.includes(`npm run source:ingest-current -- --id ${targetId} --apply`)) {
      throw new Error(`manual inbox commands did not include the single-target ingest-current lane:
${JSON.stringify(data.manualInbox, null, 2)}`);
    }
  });
}

async function testCaptureFirstHardStopAfterThreshold() {
  await withFixture(async (fixture) => {
    await mark(fixture, targetId);
    const attempts = Array.from({ length: 5 }, (_unused, index) => ({
      id: `${targetId}-missing-${index}`,
      candidateId: targetId,
      species: 'Fixture Species',
      rejectedAt: `2026-06-17T00:00:0${index}.000Z`,
      reason: 'No new image file appeared under generated_images after image generation.',
      originalImage: null,
      copiedImage: null,
      sourceImagegenMarker: {
        createdAt: `2026-06-17T00:00:0${index}.000Z`,
        generatedDir: fixture.generatedDir,
      },
    }));
    await writeFile(fixture.rejections, `${JSON.stringify({ schema: 'water9/source-rejected-attempts@1', attempts }, null, 2)}\n`);
    const data = parseStdout(run([
      '--status',
      '--reject-missing',
      '--dry-run',
      '--id', targetId,
      '--marker', fixture.marker,
      '--generated-dir', fixture.generatedDir,
      '--manifest', fixture.manifest,
      '--rejections', fixture.rejections,
    ]));
    if (data.captureFirstHardStop !== true || data.manualInbox?.noMoreInlineRetries !== true) {
      throw new Error(`capture-first hard stop was not reported after threshold:
${JSON.stringify(data, null, 2)}`);
    }
    if (!String(data.manualInbox?.note ?? '').includes('Capture-first hard stop')) {
      throw new Error(`manual inbox note did not explain capture-first hard stop:
${JSON.stringify(data.manualInbox, null, 2)}`);
    }
    if (data.manualInbox?.commands?.some((command) => command === `npm run source:recover-inline -- --id ${targetId} --copy --validate`)) {
      throw new Error(`hard-stop commands should not include generic recover-inline scan:
${JSON.stringify(data.manualInbox, null, 2)}`);
    }
    if (data.manualInbox?.commands?.some((command) => command.includes('source:ingest-batch'))) {
      throw new Error(`hard-stop commands should not include single-target batch ingest:
${JSON.stringify(data.manualInbox, null, 2)}`);
    }
    const result = run([
      '--status',
      '--ingest',
      '--dry-run',
      '--id', targetId,
      '--marker', fixture.marker,
      '--generated-dir', fixture.generatedDir,
      '--manifest', fixture.manifest,
      '--rejections', fixture.rejections,
      '--project-generated-dir', fixture.projectGeneratedDir,
    ], { expectFailure: true });
    if (!result.stderr.includes('Capture-first hard stop is active')) {
      throw new Error(`threshold ingest failure did not explain capture-first hard stop:
${result.stderr}`);
    }
  });
}

async function testStatusIdMismatchFails() {
  await withFixture(async (fixture) => {
    await mark(fixture, targetId);
    const result = run([
      '--status',
      '--id', mismatchId,
      '--marker', fixture.marker,
      '--generated-dir', fixture.generatedDir,
      '--manifest', fixture.manifest,
      '--rejections', fixture.rejections,
    ], { expectFailure: true });
    if (!result.stderr.includes(`does not match marker candidateId ${targetId}`)) {
      throw new Error(`status id mismatch failed for the wrong reason:
${result.stderr}`);
    }
  });
}

async function testSingleFileIngestDryRun() {
  await withFixture(async (fixture) => {
    await mark(fixture, targetId);
    const image = join(fixture.generatedDir, 'gulper-test.png');
    await copyFile(fixtureImage, image);
    const data = parseStdout(run([
      '--status',
      '--ingest',
      '--dry-run',
      '--id', targetId,
      '--marker', fixture.marker,
      '--generated-dir', fixture.generatedDir,
      '--manifest', fixture.manifest,
      '--rejections', fixture.rejections,
      '--project-generated-dir', fixture.projectGeneratedDir,
    ]));
    if (!data.autoIngest?.performed || data.ingested?.id !== targetId) {
      throw new Error('single-file dry-run did not perform auto-ingest');
    }
    if (data.ingested.source !== `public/assets/generated/fauna-${targetId}-whole-source.png`
      && !data.ingested.source.endsWith(`fauna-${targetId}-whole-source.png`)) {
      throw new Error(`unexpected dry-run source path ${data.ingested.source}`);
    }
  });
}

async function testMultipleFilesRefused() {
  await withFixture(async (fixture) => {
    await mark(fixture, targetId);
    await copyFile(fixtureImage, join(fixture.generatedDir, 'one.png'));
    await copyFile(fixtureImage, join(fixture.generatedDir, 'two.png'));
    const result = run([
      '--status',
      '--ingest',
      '--dry-run',
      '--id', targetId,
      '--marker', fixture.marker,
      '--generated-dir', fixture.generatedDir,
      '--manifest', fixture.manifest,
      '--rejections', fixture.rejections,
      '--project-generated-dir', fixture.projectGeneratedDir,
    ], { expectFailure: true });
    if (!result.stderr.includes('2 handoff files')) {
      throw new Error(`multiple-file ingest failed for the wrong reason:
${result.stderr}`);
    }
  });
}

async function testInvalidSourceImageRefused() {
  await withFixture(async (fixture) => {
    await mark(fixture, targetId);
    await copyFile(invalidFixtureImage, join(fixture.generatedDir, 'invalid-source.png'));
    const result = run([
      '--status',
      '--ingest',
      '--dry-run',
      '--id', targetId,
      '--marker', fixture.marker,
      '--generated-dir', fixture.generatedDir,
      '--manifest', fixture.manifest,
      '--rejections', fixture.rejections,
      '--project-generated-dir', fixture.projectGeneratedDir,
    ], { expectFailure: true });
    if (!result.stderr.includes('mechanical source validation')) {
      throw new Error(`invalid source image failed for the wrong reason:
${result.stderr}`);
    }
  });
}

async function testExistingSourceRefused() {
  await withFixture(async (fixture) => {
    await mark(fixture, 'brine-crown');
    await copyFile(fixtureImage, join(fixture.generatedDir, 'brine.png'));
    const result = run([
      '--status',
      '--ingest',
      '--dry-run',
      '--id', 'brine-crown',
      '--marker', fixture.marker,
      '--generated-dir', fixture.generatedDir,
      '--manifest', fixture.manifest,
      '--rejections', fixture.rejections,
      '--project-generated-dir', fixture.projectGeneratedDir,
    ], { expectFailure: true });
    if (!result.stderr.includes('existing source')) {
      throw new Error(`existing-source guard failed for the wrong reason:
${result.stderr}`);
    }
  });
}

const tests = [
  testZeroFileIngestFails,
  testRejectMissingDryRun,
  testCaptureFirstHardStopAfterThreshold,
  testStatusIdMismatchFails,
  testSingleFileIngestDryRun,
  testMultipleFilesRefused,
  testInvalidSourceImageRefused,
  testExistingSourceRefused,
];

for (const test of tests) {
  await test();
}

console.log(JSON.stringify({
  schema: 'water9/source-imagegen-handoff-smoke@1',
  tests: tests.map((test) => test.name),
  failures: [],
}, null, 2));
