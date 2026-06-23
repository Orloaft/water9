import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function fakePng(width, height, fill) {
  const buffer = Buffer.alloc(1024, fill);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  Buffer.from('IHDR', 'ascii').copy(buffer, 12);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

const root = process.cwd();
const dir = await mkdtemp(join(tmpdir(), 'water9-source-replacement-archive-'));
try {
  const oldImage = join(dir, 'old.png');
  const newImage = join(dir, 'new.png');
  const generatedDir = join(dir, 'generated');
  const archiveDir = join(dir, 'archive');
  const manifestPath = join(dir, 'source-candidates.json');
  const oldBuffer = fakePng(64, 32, 17);
  const newBuffer = fakePng(96, 48, 29);
  await writeFile(oldImage, oldBuffer);
  await writeFile(newImage, newBuffer);
  await writeFile(manifestPath, `${JSON.stringify({
    schema: 'water9/source-candidates@1',
    candidates: [
      {
        id: 'gulper-eel-maw',
        species: 'Gulper Eel Maw',
        status: 'needs-review',
        source: oldImage,
        review: { status: 'rejected' },
      },
    ],
  }, null, 2)}\n`);

  const result = spawnSync(process.execPath, [
    'tools/ingest_source_candidate_image.mjs',
    '--id', 'gulper-eel-maw',
    '--image', newImage,
    '--manifest', manifestPath,
    '--generated-dir', generatedDir,
    '--replacement-archive-dir', archiveDir,
    '--copy',
    '--overwrite',
    '--skip-image-check',
  ], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  const failures = [];
  if (result.status !== 0) failures.push(`replacement ingest failed: ${result.stderr || result.stdout}`);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const candidate = manifest.candidates[0];
  const archive = candidate.sourceIngest?.replacementArchive;
  if (archive?.schema !== 'water9/source-replacement-archive@1') failures.push(`unexpected archive schema ${archive?.schema ?? 'missing'}`);
  if (archive?.archived !== true) failures.push('archive record must be marked archived');
  if (archive?.previous?.sha256 !== sha256(oldBuffer)) failures.push('archive previous sha256 does not match old source');
  if (archive?.replacementInput?.sha256 !== sha256(newBuffer)) failures.push('archive replacement sha256 does not match new source');
  if (!archive?.archivedImage || !existsSync(resolve(archive.archivedImage))) failures.push('archived image file missing');
  if (!archive?.archivedMetadata || !existsSync(resolve(archive.archivedMetadata))) failures.push('archived metadata file missing');
  if (candidate.review !== null) failures.push('replacement ingest must reset previous source review');
  if (!String(candidate.source ?? '').includes('fauna-gulper-eel-maw-whole-source.png')) failures.push('candidate source was not replaced with generated source path');

  const summary = {
    schema: 'water9/source-replacement-archive-smoke@1',
    archivedImage: archive?.archivedImage ?? null,
    failures,
  };
  if (failures.length) {
    console.error(JSON.stringify({
      ...summary,
      stdout: result.stdout,
      stderr: result.stderr,
    }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
