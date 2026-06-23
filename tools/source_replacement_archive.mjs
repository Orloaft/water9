import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { sourceImageMetadata } from './source_image_metadata.mjs';

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function safeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export async function archiveExistingSource({
  candidate,
  candidateId = candidate?.id,
  replacementInputPath,
  archiveDir = 'public/review/source-candidates/replacement-archive',
  dryRun = false,
  reason = 'source replacement overwrite',
}) {
  if (!candidate?.source) return null;
  const previousSourcePath = resolve(candidate.source);
  const archivedAt = new Date();
  const stamp = safeTimestamp(archivedAt);
  const archiveImagePath = resolve(archiveDir, String(candidateId), `${stamp}-${basename(candidate.source)}`);
  const archiveMetadataPath = `${archiveImagePath}.json`;
  let previousMetadata = null;
  let replacementMetadata = null;
  try {
    previousMetadata = await sourceImageMetadata(previousSourcePath);
  } catch (error) {
    return {
      schema: 'water9/source-replacement-archive@1',
      candidateId,
      archivedAt: archivedAt.toISOString(),
      dryRun,
      archived: false,
      reason,
      previousSource: asRepoRelative(previousSourcePath),
      failure: `previous source could not be archived: ${error.message}`,
    };
  }
  try {
    replacementMetadata = replacementInputPath ? await sourceImageMetadata(resolve(replacementInputPath)) : null;
  } catch {
    replacementMetadata = null;
  }

  const archiveRecord = {
    schema: 'water9/source-replacement-archive@1',
    candidateId,
    species: candidate.species ?? null,
    archivedAt: archivedAt.toISOString(),
    dryRun,
    archived: !dryRun,
    reason,
    previousSource: asRepoRelative(previousSourcePath),
    archivedImage: asRepoRelative(archiveImagePath),
    archivedMetadata: asRepoRelative(archiveMetadataPath),
    previous: previousMetadata ? {
      bytes: previousMetadata.bytes,
      sha256: previousMetadata.sha256,
      width: previousMetadata.width,
      height: previousMetadata.height,
      extension: previousMetadata.extension,
    } : null,
    replacementInput: replacementMetadata ? {
      path: asRepoRelative(resolve(replacementInputPath)),
      bytes: replacementMetadata.bytes,
      sha256: replacementMetadata.sha256,
      width: replacementMetadata.width,
      height: replacementMetadata.height,
      extension: replacementMetadata.extension,
    } : replacementInputPath ? {
      path: asRepoRelative(resolve(replacementInputPath)),
      bytes: null,
      sha256: null,
      width: null,
      height: null,
      extension: null,
    } : null,
  };

  if (!dryRun) {
    await mkdir(dirname(archiveImagePath), { recursive: true });
    await copyFile(previousSourcePath, archiveImagePath);
    await writeFile(archiveMetadataPath, `${JSON.stringify(archiveRecord, null, 2)}\n`);
  }

  return archiveRecord;
}
