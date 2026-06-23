import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const script = resolve('tools/ingest_source_candidate_image.mjs');

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'water9-source-direct-ingest-'));
  const image = join(dir, 'bad.png');
  const manifest = join(dir, 'source-candidates.json');
  const identicalManifest = join(dir, 'source-candidates-identical.json');
  const existingSource = 'public/assets/generated/fauna-black-coral-gate-whole-source.png';
  await writeFile(image, Buffer.alloc(2048, 0));
  await writeFile(manifest, `${JSON.stringify({
    schema: 'water9/source-candidates@1',
    candidates: [
      {
        id: 'gulper-eel-maw',
        species: 'Gulper Eel Maw',
        status: 'draft',
        source: null,
      },
    ],
  }, null, 2)}\n`);
  await writeFile(identicalManifest, `${JSON.stringify({
    schema: 'water9/source-candidates@1',
    candidates: [
      {
        id: 'black-coral-gate',
        species: 'Black Coral Gate',
        status: 'needs-review',
        source: existingSource,
      },
    ],
  }, null, 2)}\n`);

  try {
    const result = spawnSync(process.execPath, [
      script,
      '--id', 'gulper-eel-maw',
      '--image', image,
      '--manifest', manifest,
      '--copy',
      '--dry-run',
    ], {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const output = `${result.stdout}\n${result.stderr}`;
    const identicalResult = spawnSync(process.execPath, [
      script,
      '--id', 'black-coral-gate',
      '--image', existingSource,
      '--manifest', identicalManifest,
      '--copy',
      '--overwrite',
      '--dry-run',
    ], {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const identicalOutput = `${identicalResult.stdout}\n${identicalResult.stderr}`;
    const failures = [];
    if (result.status === 0) failures.push('direct ingest unexpectedly accepted an invalid source image');
    if (!output.includes('mechanical magenta/background validation')) {
      failures.push('direct ingest failure did not cite mechanical source-image validation');
    }
    if (identicalResult.status === 0) failures.push('direct ingest unexpectedly accepted a byte-identical overwrite');
    if (!identicalOutput.includes('Refusing byte-identical overwrite')) {
      failures.push('byte-identical overwrite failure did not cite the distinct replacement guard');
    }
    const summary = {
      schema: 'water9/source-direct-ingest-validation-smoke@1',
      failures,
    };
    if (failures.length) {
      console.error(JSON.stringify({ ...summary, output, identicalOutput }, null, 2));
      process.exitCode = 1;
    } else {
      console.log(JSON.stringify(summary, null, 2));
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
