import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const script = resolve('tools/ingest_source_candidate_batch.mjs');
const existingSource = 'public/assets/generated/fauna-black-coral-gate-whole-source.png';

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function runBatch(args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'water9-source-batch-ingest-'));
  const manifest = join(dir, 'source-candidates.json');
  const queue = join(dir, 'source-generation-queue.json');
  const report = join(dir, 'source-ingest-batch-report.json');
  const allowedReport = join(dir, 'source-ingest-batch-allowed-report.json');
  const inboxImage = join(dir, 'fauna-black-coral-gate-whole-source.png');
  await copyFile(existingSource, inboxImage);

  await writeJson(manifest, {
    schema: 'water9/source-candidates@1',
    candidates: [
      {
        id: 'black-coral-gate',
        species: 'Black Coral Gate',
        status: 'needs-review',
        source: existingSource,
      },
    ],
  });
  await writeJson(queue, {
    schema: 'water9/source-generation-queue@1',
    candidates: [
      {
        id: 'black-coral-gate',
        rank: 1,
      },
    ],
  });

  try {
    const result = runBatch([
      '--dir', dir,
      '--ids', 'black-coral-gate',
      '--manifest', manifest,
      '--queue', queue,
      '--report', report,
      '--overwrite',
      '--dry-run',
      '--strict',
    ]);
    const output = `${result.stdout}\n${result.stderr}`;

    const allowedResult = runBatch([
      '--dir', dir,
      '--ids', 'black-coral-gate',
      '--manifest', manifest,
      '--queue', queue,
      '--report', allowedReport,
      '--overwrite',
      '--allow-identical-overwrite',
      '--dry-run',
      '--strict',
    ]);
    const allowedOutput = `${allowedResult.stdout}\n${allowedResult.stderr}`;
    let allowedPayload = null;
    try {
      allowedPayload = JSON.parse(allowedResult.stdout);
    } catch {
      allowedPayload = null;
    }

    const failures = [];
    if (result.status === 0) failures.push('batch ingest unexpectedly accepted a byte-identical overwrite');
    if (!output.includes('Refusing byte-identical overwrite')) {
      failures.push('batch ingest failure did not cite the distinct replacement guard');
    }
    if (allowedResult.status !== 0) failures.push('batch ingest did not allow explicit identical-overwrite metadata repair');
    if (allowedPayload?.allowIdenticalOverwrite !== true) failures.push('batch ingest report did not record allowIdenticalOverwrite');
    if (!allowedPayload?.ingested?.some((item) => item.id === 'black-coral-gate' && item.identicalToPreviousSource === true && item.identicalOverwriteAllowed === true)) {
      failures.push('batch ingest report did not record identical replacement evidence on the ingested item');
    }

    const summary = {
      schema: 'water9/source-batch-ingest-validation-smoke@1',
      failures,
    };
    if (failures.length) {
      console.error(JSON.stringify({ ...summary, output, allowedOutput }, null, 2));
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
