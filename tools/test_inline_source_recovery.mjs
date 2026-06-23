import { copyFile, mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const script = resolve('tools/recover_inline_source_image.mjs');
const fixtureImage = resolve('public/assets/generated/fauna-brine-crown-whole-source.png');

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    input: options.input ?? undefined,
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
  const dir = await mkdtemp(join(tmpdir(), 'water9-inline-recovery-'));
  const downloads = join(dir, 'downloads');
  const inbox = join(dir, 'source-inbox');
  const marker = join(dir, 'marker.json');
  await mkdir(downloads, { recursive: true });
  await mkdir(inbox, { recursive: true });
  const createdAt = new Date(Date.now() - 60_000);
  await writeFile(marker, `${JSON.stringify({
    schema: 'water9/source-imagegen-handoff-marker@1',
    candidateId: 'gulper-eel-maw',
    generatedDir: join(dir, 'generated'),
    markerPath: marker,
    createdAt: createdAt.toISOString(),
    createdAtMs: createdAt.getTime(),
    fileCount: 0,
    newestBefore: null,
    knownFiles: [],
    knownSignatures: {},
  }, null, 2)}\n`);
  return { dir, downloads, inbox, marker };
}

async function withFixture(fn) {
  const fixture = await makeFixture();
  try {
    return await fn(fixture);
  } finally {
    await rm(fixture.dir, { recursive: true, force: true });
  }
}

async function copyRecentImage(path) {
  await copyFile(fixtureImage, path);
  const now = new Date();
  await utimes(path, now, now);
}

async function testNoImageAllowedForStatusOnly() {
  await withFixture(async (fixture) => {
    const data = parseStdout(run([
      '--id', 'gulper-eel-maw',
      '--marker', fixture.marker,
      '--dir', fixture.downloads,
      '--target-dir', fixture.inbox,
      '--allow-empty',
    ]));
    if (data.schema !== 'water9/source-inline-recovery@1') throw new Error(`unexpected schema ${data.schema}`);
    if (data.copied !== false) throw new Error('empty recovery should not copy');
    if (!data.failures?.[0]?.includes('no candidate image')) throw new Error('empty recovery did not report missing image');
  });
}

async function testExplicitImageDryRunDoesNotCopy() {
  await withFixture(async (fixture) => {
    const image = join(fixture.downloads, 'downloaded.png');
    await copyRecentImage(image);
    const data = parseStdout(run([
      '--id', 'gulper-eel-maw',
      '--marker', fixture.marker,
      '--image', image,
      '--target-dir', fixture.inbox,
    ]));
    if (data.selected.path !== image) throw new Error('explicit image was not selected');
    if (data.copied !== false) throw new Error('dry-run explicit recovery should not copy');
    const target = join(fixture.inbox, 'gulper-eel-maw.png');
    const targetInfo = await stat(target).catch(() => null);
    if (targetInfo) throw new Error('dry-run recovery unexpectedly wrote target file');
  });
}

async function testExplicitImageValidateDryRun() {
  await withFixture(async (fixture) => {
    const image = join(fixture.downloads, 'downloaded.png');
    await copyRecentImage(image);
    const data = parseStdout(run([
      '--id', 'gulper-eel-maw',
      '--marker', fixture.marker,
      '--image', image,
      '--target-dir', fixture.inbox,
      '--validate',
    ]));
    if (data.copied !== false) throw new Error('validated dry-run should not copy');
    if (data.imageCheck?.checked !== true) throw new Error('validated dry-run did not run image validation');
    if (data.imageCheck.failures?.length) {
      throw new Error(`fixture image unexpectedly failed validation:
${JSON.stringify(data.imageCheck.failures, null, 2)}`);
    }
  });
}

async function testExplicitImageCopy() {
  await withFixture(async (fixture) => {
    const image = join(fixture.downloads, 'downloaded.png');
    await copyRecentImage(image);
    const data = parseStdout(run([
      '--id', 'gulper-eel-maw',
      '--marker', fixture.marker,
      '--image', image,
      '--target-dir', fixture.inbox,
      '--copy',
      '--validate',
    ]));
    if (data.copied !== true) throw new Error('explicit recovery did not copy');
    if (data.imageCheck?.checked !== true) throw new Error('copy recovery did not run image validation');
    const target = join(fixture.inbox, 'gulper-eel-maw.png');
    const targetInfo = await stat(target);
    const sourceInfo = await stat(image);
    if (targetInfo.size !== sourceInfo.size) throw new Error('copied target size does not match source');
  });
}

async function testExistingTargetRefusedWithoutOverwrite() {
  await withFixture(async (fixture) => {
    const image = join(fixture.downloads, 'downloaded.png');
    const target = join(fixture.inbox, 'gulper-eel-maw.png');
    await copyRecentImage(image);
    await copyRecentImage(target);
    const result = run([
      '--id', 'gulper-eel-maw',
      '--marker', fixture.marker,
      '--image', image,
      '--target-dir', fixture.inbox,
      '--copy',
    ], { expectFailure: true });
    if (!result.stderr.includes('already exists')) {
      throw new Error(`overwrite guard failed for wrong reason:
${result.stderr}`);
    }
  });
}

async function testMultipleDownloadsRequireExplicitImage() {
  await withFixture(async (fixture) => {
    await copyRecentImage(join(fixture.downloads, 'one.png'));
    await copyRecentImage(join(fixture.downloads, 'two.png'));
    const result = run([
      '--id', 'gulper-eel-maw',
      '--marker', fixture.marker,
      '--dir', fixture.downloads,
      '--target-dir', fixture.inbox,
      '--copy',
    ], { expectFailure: true });
    if (!result.stderr.includes('pass --image <path>')) {
      throw new Error(`multiple-download guard failed for wrong reason:
${result.stderr}`);
    }
  });
}

async function testDataUrlStdinCopy() {
  await withFixture(async (fixture) => {
    const imageBytes = await readFile(fixtureImage);
    const dataUrl = `data:image/png;base64,${imageBytes.toString('base64')}`;
    const data = parseStdout(run([
      '--id', 'gulper-eel-maw',
      '--marker', fixture.marker,
      '--target-dir', fixture.inbox,
      '--scratch-dir', join(fixture.dir, 'scratch'),
      '--data-url-stdin',
      '--copy',
      '--validate',
    ], { input: dataUrl }));
    if (data.copied !== true) throw new Error('data URL stdin recovery did not copy');
    if (data.stdinMode !== 'data-url') throw new Error(`unexpected stdin mode ${data.stdinMode}`);
    if (data.selected?.source !== 'stdin') throw new Error('data URL recovery did not select stdin source');
    if (data.imageCheck?.checked !== true) throw new Error('data URL recovery did not validate source image');
    if (data.imageCheck.failures?.length) {
      throw new Error(`data URL recovery fixture unexpectedly failed validation:
${JSON.stringify(data.imageCheck.failures, null, 2)}`);
    }
    const target = join(fixture.inbox, 'gulper-eel-maw.png');
    const targetInfo = await stat(target);
    if (targetInfo.size !== imageBytes.length) throw new Error('data URL copied target size does not match source');
  });
}

async function testBase64StdinCopy() {
  await withFixture(async (fixture) => {
    const imageBytes = await readFile(fixtureImage);
    const data = parseStdout(run([
      '--id', 'gulper-eel-maw',
      '--marker', fixture.marker,
      '--target-dir', fixture.inbox,
      '--scratch-dir', join(fixture.dir, 'scratch'),
      '--stdin-base64',
      '--stdin-filename', 'recovered-source.png',
      '--copy',
      '--validate',
    ], { input: imageBytes.toString('base64') }));
    if (data.copied !== true) throw new Error('base64 stdin recovery did not copy');
    if (data.stdinMode !== 'base64') throw new Error(`unexpected stdin mode ${data.stdinMode}`);
    if (data.selected?.source !== 'stdin') throw new Error('base64 recovery did not select stdin source');
    if (data.selected?.file !== 'recovered-source.png') throw new Error(`unexpected stdin filename ${data.selected?.file}`);
    if (data.imageCheck?.checked !== true) throw new Error('base64 recovery did not validate source image');
    if (data.imageCheck.failures?.length) {
      throw new Error(`base64 recovery fixture unexpectedly failed validation:
${JSON.stringify(data.imageCheck.failures, null, 2)}`);
    }
    const target = join(fixture.inbox, 'gulper-eel-maw.png');
    const targetInfo = await stat(target);
    if (targetInfo.size !== imageBytes.length) throw new Error('base64 copied target size does not match source');
  });
}

async function testEmptyDataUrlStdinFails() {
  await withFixture(async (fixture) => {
    const result = run([
      '--id', 'gulper-eel-maw',
      '--marker', fixture.marker,
      '--target-dir', fixture.inbox,
      '--scratch-dir', join(fixture.dir, 'scratch'),
      '--data-url-stdin',
      '--copy',
    ], { input: '', expectFailure: true });
    if (!result.stderr.includes('data URL')) {
      throw new Error(`empty data URL stdin failed for wrong reason:
${result.stderr}`);
    }
  });
}

const tests = [
  testNoImageAllowedForStatusOnly,
  testExplicitImageDryRunDoesNotCopy,
  testExplicitImageValidateDryRun,
  testExplicitImageCopy,
  testExistingTargetRefusedWithoutOverwrite,
  testMultipleDownloadsRequireExplicitImage,
  testDataUrlStdinCopy,
  testBase64StdinCopy,
  testEmptyDataUrlStdinFails,
];

for (const test of tests) await test();

console.log(JSON.stringify({
  schema: 'water9/source-inline-recovery-smoke@1',
  tests: tests.map((test) => test.name),
  failures: [],
}, null, 2));
