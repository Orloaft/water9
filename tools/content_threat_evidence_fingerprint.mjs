import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

export const THREAT_EVIDENCE_FINGERPRINT_SCHEMA = 'water9/content-threat-acceptance-evidence-fingerprint@1';
export const REQUIRED_THREAT_ACCEPTANCE_MEDIA_KEYS = [
  'contact',
  'phase',
  'sourceParity',
  'sandbox-idle-screenshot',
  'sandbox-lunge-screenshot',
  'sandbox-stunned-screenshot',
];

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function optionalStat(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

async function sha256File(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

export async function fileShaFingerprint(path) {
  const absolutePath = resolve(path);
  const info = await optionalStat(absolutePath);
  if (!info?.isFile()) return { path: absolutePath, exists: false };
  return {
    path: absolutePath,
    exists: true,
    size: info.size,
    sha256: await sha256File(absolutePath),
  };
}

function textureNamesFor(creature) {
  const names = new Set();
  for (const part of creature?.parts ?? []) {
    for (const key of ['texture', 'damagedTexture', 'detachedTexture']) {
      if (part[key]) names.add(part[key]);
    }
  }
  for (const overlay of creature?.socketOverlays ?? []) {
    for (const key of ['texture', 'severedTexture']) {
      if (overlay[key]) names.add(overlay[key]);
    }
  }
  return [...names].sort();
}

export async function loadSourceManifests(generatedDir = resolve('public/assets/generated')) {
  const manifests = new Map();
  let files = [];
  try {
    files = await readdir(generatedDir);
  } catch {
    return manifests;
  }
  for (const file of files.filter((candidate) => candidate.endsWith('.articulated.json'))) {
    const path = resolve(generatedDir, file);
    const data = JSON.parse(await readFile(path, 'utf8'));
    if (data.runtimeCreatureId) manifests.set(data.runtimeCreatureId, { ...data, _file: file });
  }
  return manifests;
}

export async function loadSandboxReports({
  sandboxReportPath = resolve('tools/scratch/sandbox-visuals-report.json'),
  sourcePreviewReportPath = resolve('tools/scratch/source-preview-visuals-report.json'),
  sandboxReportDir = resolve('tools/scratch'),
} = {}) {
  const pathsByName = new Map([
    [resolve(sandboxReportPath), resolve(sandboxReportPath)],
    [resolve(sourcePreviewReportPath), resolve(sourcePreviewReportPath)],
  ]);
  let entries = [];
  try {
    entries = await readdir(sandboxReportDir, { withFileTypes: true });
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (
      !/^sandbox.*report.*\.json$/.test(entry.name)
      && !/^sandbox-visuals.*report.*\.json$/.test(entry.name)
      && !/^[a-z0-9_-]+-visuals-report\.json$/.test(entry.name)
    ) continue;
    const path = resolve(sandboxReportDir, entry.name);
    pathsByName.set(path, path);
  }

  const reports = [];
  for (const path of [...pathsByName.values()].sort()) {
    try {
      const data = JSON.parse(await readFile(path, 'utf8'));
      if (data?.schema !== 'water9/sandbox-visual-check@1') continue;
      const info = await optionalStat(path);
      reports.push({ path, data, mtimeMs: info?.mtimeMs ?? 0 });
    } catch {
      // Missing optional reports are represented by an absent sandbox result.
    }
  }
  return reports;
}

export function latestSandboxResultFor(id, reports, { requireDiver = true } = {}) {
  const results = reports
    .flatMap(({ path, data, mtimeMs }) => (data.results ?? []).map((result) => ({ ...result, reportPath: path, reportMtimeMs: mtimeMs })))
    .filter((result) => result.id === id)
    .filter((result) => !requireDiver || result.companion === 'diver')
    .sort((left, right) => right.reportMtimeMs - left.reportMtimeMs);
  return results[0] ?? null;
}

function reviewMediaPaths(reviewItem, reviewDir) {
  const entries = {
    contact: reviewItem?.contactFile,
    phase: reviewItem?.phaseFile,
    sourceParity: reviewItem?.sourceParityDebugFile,
    contactThumb: reviewItem?.contactThumbFile,
    phaseThumb: reviewItem?.phaseThumbFile,
    sourceParityThumb: reviewItem?.sourceParityThumbFile,
    sourceThumb: reviewItem?.sourceThumbFile,
  };
  return Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, value ? resolve(reviewDir, value) : null]));
}

function sandboxMediaPaths(sandboxResult) {
  const files = {};
  if (sandboxResult?.screenshotPath) files.sandboxScreenshot = resolve(sandboxResult.screenshotPath);
  for (const state of sandboxResult?.states ?? []) {
    const name = String(state.state ?? 'state').replace(/[^a-z0-9_-]+/gi, '-');
    if (state.screenshotPath) files[`sandbox-${name}-screenshot`] = resolve(state.screenshotPath);
    if (state.sidecarPath) files[`sandbox-${name}-sidecar`] = resolve(state.sidecarPath);
  }
  return files;
}

function sanitizeSandboxResult(result) {
  if (!result) return null;
  return {
    id: result.id,
    species: result.species,
    kind: result.kind,
    reviewStage: result.reviewStage,
    qualityStatus: result.qualityStatus,
    companion: result.companion,
    assetFingerprint: result.assetFingerprint,
    failures: result.failures ?? [],
    states: (result.states ?? []).map((state) => ({
      state: state.state,
      failures: state.failures ?? [],
      framing: state.framing ?? null,
      canvas: state.canvas ?? null,
      snapshot: state.snapshot ?? null,
    })),
  };
}

function sanitizeRuntimeCreature(creature) {
  if (!creature || typeof creature !== 'object') return creature ?? null;
  const { quality: _quality, ...stableCreature } = creature;
  return stableCreature;
}

function sanitizeSourceManifest(sourceManifest) {
  if (!sourceManifest || typeof sourceManifest !== 'object') return sourceManifest ?? null;
  const {
    quality: _quality,
    sourceCandidateId: _sourceCandidateId,
    ...stableSourceManifest
  } = sourceManifest;
  return stableSourceManifest;
}

function sanitizeSourceCandidate(sourceCandidate) {
  if (!sourceCandidate || typeof sourceCandidate !== 'object') return sourceCandidate ?? null;
  const {
    status: _status,
    riggedAt: _riggedAt,
    riggedCreatureId: _riggedCreatureId,
    ...stableSourceCandidate
  } = sourceCandidate;
  return stableSourceCandidate;
}

export async function buildThreatEvidenceFingerprint({
  id,
  creature,
  sourceManifest,
  sourceCandidate,
  reviewItem,
  sandboxResult,
  runtimeManifestPath = resolve('public/assets/generated/articulated-creatures.parts.json'),
  sourceCandidateManifestPath = resolve('public/review/source-candidates/source-candidates.json'),
  reviewManifestPath = resolve('public/review/articulated/review-manifest.json'),
  generatedDir = resolve('public/assets/generated'),
  reviewDir = resolve('public/review/articulated'),
} = {}) {
  const mediaPaths = {
    runtimeManifest: resolve(runtimeManifestPath),
    sourceCandidateManifest: resolve(sourceCandidateManifestPath),
    reviewManifest: resolve(reviewManifestPath),
    sourceManifest: sourceManifest?._file ? resolve(generatedDir, sourceManifest._file) : null,
    sourceImage: sourceManifest?.source ? resolve(sourceManifest.source) : null,
    sourceCandidateImage: sourceCandidate?.source ? resolve(sourceCandidate.source) : null,
    ...reviewMediaPaths(reviewItem, reviewDir),
    ...sandboxMediaPaths(sandboxResult),
  };
  for (const texture of textureNamesFor(creature)) {
    mediaPaths[`texture:${texture}`] = resolve(generatedDir, texture);
  }
  const files = {};
  for (const [key, path] of Object.entries(mediaPaths)) {
    files[key] = path ? await fileShaFingerprint(path) : { path: null, exists: false };
  }
  const payload = {
    schema: THREAT_EVIDENCE_FINGERPRINT_SCHEMA,
    id: id ?? creature?.id ?? reviewItem?.id,
    creature: sanitizeRuntimeCreature(creature),
    sourceManifest: sanitizeSourceManifest(sourceManifest),
    sourceCandidate: sanitizeSourceCandidate(sourceCandidate),
    reviewItem,
    sandboxResult: sanitizeSandboxResult(sandboxResult),
    files,
  };
  return {
    schema: THREAT_EVIDENCE_FINGERPRINT_SCHEMA,
    digest: createHash('sha256').update(stableJson(payload)).digest('hex'),
    files,
  };
}
