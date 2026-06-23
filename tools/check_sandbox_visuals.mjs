import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const outputDir = resolve(String(args.get('out-dir') ?? 'tools/scratch/sandbox-visuals'));
const reportPath = resolve(String(args.get('report') ?? 'tools/scratch/sandbox-visuals-report.json'));
const noArtifacts = args.has('no-artifacts') || args.has('noArtifacts');
const writeScreenshots = !noArtifacts && !(args.has('no-screenshots') || args.has('noScreenshots'));
const writeSidecars = writeScreenshots && !(args.has('no-sidecars') || args.has('noSidecars'));
const writeReportFile = !noArtifacts && !(args.has('no-report') || args.has('noReport'));
const requestedIds = String(args.get('ids') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const requestedKinds = String(args.get('kinds') ?? args.get('kind') ?? '')
  .split(',')
  .map((kind) => kind.trim())
  .filter(Boolean);
const checkAllCatalog = args.has('all-catalog') || args.has('all');
const limit = Number(args.get('limit') ?? 0);
const baseUrlArg = args.get('base-url') || args.get('baseUrl');
const companion = String(args.get('with') ?? args.get('companion') ?? '').trim();
const viewport = { width: Number(args.get('width') ?? 960), height: Number(args.get('height') ?? 640) };
const disableFramingCheck = args.has('no-framing-check') || args.has('noFramingCheck');
const entryTimeoutMs = Number(args.get('entry-timeout-ms') ?? args.get('entryTimeoutMs') ?? 20000);
const operationTimeoutMs = Number(args.get('operation-timeout-ms') ?? args.get('operationTimeoutMs') ?? 7000);
const showProgress = args.has('progress') || checkAllCatalog;
const generatedDir = resolve('public/assets/generated');
const requestedStates = String(args.get('states') ?? 'idle,lunge,stunned')
  .split(',')
  .map((state) => state.trim())
  .filter(Boolean);
const VALID_STATES = new Set(['idle', 'lunge', 'stunned']);
for (const state of requestedStates) {
  if (!VALID_STATES.has(state)) throw new Error(`Unknown sandbox visual state ${state}`);
}

async function findOpenPort(start = 5177) {
  for (let port = start; port < start + 100; port += 1) {
    const available = await new Promise((resolveAvailable) => {
      const server = createServer();
      server.once('error', () => resolveAvailable(false));
      server.once('listening', () => server.close(() => resolveAvailable(true)));
      server.listen(port, '127.0.0.1');
    });
    if (available) return port;
  }
  throw new Error('No open local port found for sandbox visual check.');
}

async function waitForServer(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still warming up.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 180));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function findBrowserExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Try the next system browser candidate.
    }
  }
  return null;
}

async function launchBrowser() {
  const executablePath = await findBrowserExecutable();
  const options = { headless: true };
  if (executablePath) {
    options.executablePath = executablePath;
    options.args = ['--no-sandbox', '--disable-dev-shm-usage'];
  }
  return chromium.launch(options);
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function startServer() {
  if (baseUrlArg) return { baseUrl: String(baseUrlArg).replace(/\/$/, ''), close: async () => {} };
  const port = await findOpenPort(Number(args.get('port') ?? 5177));
  const viteBin = resolve('node_modules/.bin/vite');
  const child = spawn(viteBin, ['--host', '0.0.0.0', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(baseUrl);
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(`${error.message}
Vite output:
${output}`);
  }
  return {
    baseUrl,
    close: async () => {
      if (child.exitCode !== null) return;
      await new Promise((resolveClose) => {
        const killGroup = (signal) => {
          try {
            process.kill(-child.pid, signal);
          } catch {
            try { child.kill(signal); } catch { /* Already gone. */ }
          }
        };
        const timer = setTimeout(() => {
          if (child.exitCode === null) killGroup('SIGKILL');
          resolveClose();
        }, 1500);
        child.once('exit', () => {
          clearTimeout(timer);
          resolveClose();
        });
        killGroup('SIGTERM');
      });
    },
  };
}

const CORE_SANDBOX_ENTRIES = [
  { id: 'diver', species: 'Diver', kind: 'diver', url: '/?entity=diver' },
  { id: 'sub-tier1', species: 'Tier 1 Sub', kind: 'object', url: '/?entity=sub-tier1' },
  { id: 'sub-tier2', species: 'Tier 2 Sub', kind: 'object', url: '/?entity=sub-tier2' },
  { id: 'sub-tier3', species: 'Tier 3 Sub', kind: 'object', url: '/?entity=sub-tier3' },
  { id: 'barge-platform', species: 'Barge Platform', kind: 'object', url: '/?entity=barge-platform' },
  { id: 'vent-base', species: 'Steam Vent', kind: 'object', url: '/?entity=vent-base' },
  { id: 'bobbit', species: 'Bobbit Ambusher', kind: 'object', url: '/?entity=bobbit' },
  { id: 'nest-egg', species: 'Predator Nest Egg', kind: 'object', url: '/?entity=nest-egg' },
];

async function loadSandboxIndexEntries() {
  const manifestPath = resolve('public/review/sandbox/manifest.json');
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    return (manifest.entries ?? []).map((entry) => ({
      ...entry,
      species: entry.species ?? entry.name ?? entry.id,
      kind: entry.kind ?? 'unknown',
      url: entry.url,
    }));
  } catch {
    return [];
  }
}

function mergeEntries(...groups) {
  const entries = [];
  const seen = new Set();
  for (const group of groups) {
    for (const entry of group) {
      if (!entry?.id || seen.has(entry.id)) continue;
      seen.add(entry.id);
      entries.push(entry);
    }
  }
  return entries;
}

async function loadArticulatedEntries() {
  const reviewPath = resolve('public/review/articulated/review-manifest.json');
  try {
    const review = JSON.parse(await readFile(reviewPath, 'utf8'));
    const entries = (review.creatures ?? []).map((creature) => ({
      id: creature.id,
      species: creature.species,
      kind: 'articulated',
      qualityStatus: creature.quality?.status ?? 'prototype',
      reviewStage: 'prototype',
      acceptedForContentGate: false,
      url: creature.sandboxUrl || `/?sandbox=${encodeURIComponent(creature.id)}`,
    }));
    if (entries.length) return entries;
  } catch {
    // Fall back to runtime manifest below.
  }
  const runtime = JSON.parse(await readFile(resolve('public/assets/generated/articulated-creatures.parts.json'), 'utf8'));
  return (runtime.creatures ?? []).map((creature) => ({
    id: creature.id,
    species: creature.species,
    kind: 'articulated',
    qualityStatus: creature.quality?.status ?? 'prototype',
    reviewStage: 'prototype',
    acceptedForContentGate: false,
    url: `/?sandbox=${encodeURIComponent(creature.id)}`,
  }));
}

async function loadEntries() {
  const standardEntries = mergeEntries(await loadArticulatedEntries(), CORE_SANDBOX_ENTRIES);
  if (checkAllCatalog || requestedIds.length || requestedKinds.length) {
    return mergeEntries(await loadSandboxIndexEntries(), standardEntries);
  }
  return standardEntries;
}

async function optionalStat(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function fileFingerprint(path) {
  const info = await optionalStat(path);
  if (!info?.isFile()) return { path, exists: false };
  return { path, exists: true, size: info.size, mtimeMs: Math.round(info.mtimeMs) };
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

async function loadRuntimeManifest() {
  const runtime = JSON.parse(await readFile(resolve(generatedDir, 'articulated-creatures.parts.json'), 'utf8'));
  return runtime;
}

async function loadSourceManifests() {
  const runtimeFiles = await readdir(generatedDir);
  const manifests = new Map();
  for (const file of runtimeFiles.filter((candidate) => candidate.endsWith('.articulated.json'))) {
    const path = resolve(generatedDir, file);
    const data = JSON.parse(await readFile(path, 'utf8'));
    if (data.runtimeCreatureId) manifests.set(data.runtimeCreatureId, { ...data, _file: file });
  }
  return manifests;
}

async function articulatedAssetFingerprint(creature, sourceManifest) {
  const textureFiles = await Promise.all(textureNamesFor(creature).map((file) => fileFingerprint(resolve(generatedDir, file))));
  const sourceFile = sourceManifest?.source ? await fileFingerprint(resolve(sourceManifest.source)) : null;
  const sourceManifestFile = sourceManifest?._file ? await fileFingerprint(resolve(generatedDir, sourceManifest._file)) : null;
  const payload = {
    tool: 'water9-sandbox-visual@2',
    creature,
    sourceManifest,
    sourceFile,
    sourceManifestFile,
    textureFiles,
  };
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

function paethPredictor(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function readPngRgba(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) throw new Error('not a PNG file');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`unsupported PNG format bitDepth=${bitDepth} colorType=${colorType}; expected 8-bit RGB/RGBA`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const decoded = Buffer.alloc(width * height * channels);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const rowStart = y * stride;
    const previousRowStart = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[inputOffset + x];
      const left = x >= channels ? decoded[rowStart + x - channels] : 0;
      const up = y > 0 ? decoded[previousRowStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? decoded[previousRowStart + x - channels] : 0;
      let value = raw;
      if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paethPredictor(left, up, upLeft);
      else if (filter !== 0) throw new Error(`unsupported PNG filter ${filter}`);
      decoded[rowStart + x] = value & 255;
    }
    inputOffset += stride;
  }
  if (channels === 4) return { width, height, rgba: decoded };
  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    rgba[index * 4] = decoded[index * 3];
    rgba[index * 4 + 1] = decoded[index * 3 + 1];
    rgba[index * 4 + 2] = decoded[index * 3 + 2];
    rgba[index * 4 + 3] = 255;
  }
  return { width, height, rgba };
}

function pixelMetrics(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
  return { saturation, luma };
}

function screenshotFramingFromBuffer(buffer) {
  const image = readPngRgba(buffer);
  const ignoreTop = Math.round(image.height * 0.17);
  const ignoreBottom = Math.round(image.height * 0.18);
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let foregroundPixels = 0;
  const sampleStep = 2;
  for (let y = ignoreTop; y < image.height - ignoreBottom; y += sampleStep) {
    for (let x = 0; x < image.width; x += sampleStep) {
      const offset = (y * image.width + x) * 4;
      const a = image.rgba[offset + 3];
      if (a < 32) continue;
      const { saturation, luma } = pixelMetrics(image.rgba[offset], image.rgba[offset + 1], image.rgba[offset + 2]);
      const foreground = saturation >= 45 && luma >= 36;
      if (!foreground) continue;
      foregroundPixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const sampledPixels = Math.max(1, Math.ceil((image.height - ignoreTop - ignoreBottom) / sampleStep) * Math.ceil(image.width / sampleStep));
  const hasSubject = maxX >= minX && maxY >= minY;
  const bbox = hasSubject ? [minX, minY, maxX, maxY] : null;
  const widthRatio = hasSubject ? (maxX - minX + 1) / image.width : 0;
  const heightRatio = hasSubject ? (maxY - minY + 1) / image.height : 0;
  const areaRatio = widthRatio * heightRatio;
  const foregroundRatio = foregroundPixels / sampledPixels;
  return {
    width: image.width,
    height: image.height,
    ignoredTop: ignoreTop,
    ignoredBottom: ignoreBottom,
    bbox,
    widthRatio: Number(widthRatio.toFixed(4)),
    heightRatio: Number(heightRatio.toFixed(4)),
    areaRatio: Number(areaRatio.toFixed(4)),
    foregroundRatio: Number(foregroundRatio.toFixed(4)),
  };
}

async function screenshotFraming(path) {
  return screenshotFramingFromBuffer(await readFile(path));
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { exists: false, width: 0, height: 0, variedSamples: 0, opaqueSamples: 0, lumaRange: 0 };
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    if (!context || canvas.width <= 0 || canvas.height <= 0 || rect.width <= 0 || rect.height <= 0) {
      return { exists: true, width: canvas.width, height: canvas.height, variedSamples: 0, opaqueSamples: 0, lumaRange: 0 };
    }
    let minLuma = 255;
    let maxLuma = 0;
    let opaqueSamples = 0;
    const colors = new Set();
    const columns = 24;
    const rows = 16;
    for (let yIndex = 0; yIndex < rows; yIndex += 1) {
      for (let xIndex = 0; xIndex < columns; xIndex += 1) {
        const x = Math.min(canvas.width - 1, Math.max(0, Math.round(((xIndex + 0.5) / columns) * canvas.width)));
        const y = Math.min(canvas.height - 1, Math.max(0, Math.round(((yIndex + 0.5) / rows) * canvas.height)));
        const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
        if (a > 0) opaqueSamples += 1;
        const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
        minLuma = Math.min(minLuma, luma);
        maxLuma = Math.max(maxLuma, luma);
        colors.add(`${r >> 4},${g >> 4},${b >> 4},${a >> 6}`);
      }
    }
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      variedSamples: colors.size,
      opaqueSamples,
      lumaRange: Number((maxLuma - minLuma).toFixed(2)),
    };
  });
}

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'sandbox';
}

function reviewStage(entry) {
  if (entry.reviewStage) return entry.reviewStage;
  if (entry.kind === 'articulated') return entry.acceptedForContentGate === true ? 'accepted' : 'prototype';
  if (entry.kind === 'source') return entry.qualityStatus === 'approved' || entry.qualityStatus === 'rigged' ? 'source-approved' : 'source-review';
  return 'reference';
}

function acceptedForContentGate(entry) {
  return entry.kind === 'articulated' && entry.acceptedForContentGate === true;
}

function acceptanceNotice(entry) {
  if (acceptedForContentGate(entry)) return 'accepted articulated threat; still subject to final content gate count';
  if (entry.kind === 'articulated') return 'preview-only prototype; render/visual pass is not human acceptance';
  if (entry.kind === 'source') return 'source-art preview only; source approval and rig acceptance are separate gates';
  return 'reference preview; not counted by the 20-threat content gate';
}

function screenshotBaseName(entry, state) {
  const stage = safeName(reviewStage(entry));
  const companionLabel = companion ? `__with-${safeName(companion)}` : '';
  return `${safeName(entry.id)}__${stage}${companionLabel}__${safeName(state)}`;
}

function statesForEntry(entry) {
  return entry.kind === 'articulated' ? requestedStates : ['idle'];
}

function duplicateIds(ids) {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => `${id} x${count}`);
}

function sortedIds(ids) {
  return [...ids].sort((left, right) => String(left).localeCompare(String(right)));
}

function entryUrl(entry) {
  const basePath = entry.url.startsWith('/') ? entry.url : `/${entry.url}`;
  if (!companion) return basePath;
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}companion=${encodeURIComponent(companion)}`;
}

function validateStateResult(entry, stateResult) {
  const failures = [];
  const snapshot = stateResult.snapshot;
  const stats = stateResult.canvas ?? {};
  if (!snapshot) failures.push(`${stateResult.state}: missing sandbox snapshot hook`);
  if (snapshot?.entryId !== entry.id) failures.push(`${stateResult.state}: snapshot entryId ${snapshot?.entryId ?? 'missing'} did not match ${entry.id}`);
  if (snapshot?.unresolvedRequest) failures.push(`${stateResult.state}: sandbox reported unresolved request ${snapshot.unresolvedRequest}`);
  if (entry.reviewStage && snapshot?.reviewStage !== entry.reviewStage) {
    failures.push(`${stateResult.state}: snapshot reviewStage ${snapshot?.reviewStage ?? 'missing'} did not match ${entry.reviewStage}`);
  }
  if (entry.qualityStatus && snapshot?.qualityStatus !== entry.qualityStatus) {
    failures.push(`${stateResult.state}: snapshot qualityStatus ${snapshot?.qualityStatus ?? 'missing'} did not match ${entry.qualityStatus}`);
  }
  if (snapshot && snapshot.acceptedForContentGate !== acceptedForContentGate(entry)) {
    failures.push(`${stateResult.state}: snapshot acceptedForContentGate ${snapshot.acceptedForContentGate ?? 'missing'} did not match ${acceptedForContentGate(entry)}`);
  }
  if ((entry.kind === 'articulated' || entry.kind === 'source') && snapshot?.productionBoundary?.schema !== 'water9/sandbox-production-boundary@1') {
    failures.push(`${stateResult.state}: snapshot missing sandbox production boundary`);
  }
  if (snapshot?.productionBoundary?.reviewStage && entry.reviewStage && snapshot.productionBoundary.reviewStage !== entry.reviewStage) {
    failures.push(`${stateResult.state}: snapshot production boundary reviewStage ${snapshot.productionBoundary.reviewStage} did not match ${entry.reviewStage}`);
  }
  if (acceptedForContentGate(entry) === false && (entry.kind === 'articulated' || entry.kind === 'source') && snapshot?.productionBoundary?.previewOnly !== true) {
    failures.push(`${stateResult.state}: snapshot production boundary did not mark non-accepted preview as preview-only`);
  }
  if (entry.sourceCandidateId && snapshot?.sourceCandidateId !== entry.sourceCandidateId) {
    failures.push(`${stateResult.state}: snapshot sourceCandidateId ${snapshot?.sourceCandidateId ?? 'missing'} did not match ${entry.sourceCandidateId}`);
  }
  const labels = Array.isArray(snapshot?.labels) ? snapshot.labels : [];
  if (entry.kind === 'articulated' && entry.reviewStage === 'prototype') {
    if (!labels.some((label) => String(label).includes('PROTOTYPE - NOT ACCEPTED'))) {
      failures.push(`${stateResult.state}: prototype articulated preview did not visibly disclose PROTOTYPE - NOT ACCEPTED`);
    }
    if (!labels.some((label) => String(label).includes('PREVIEW ONLY'))) {
      failures.push(`${stateResult.state}: prototype articulated preview did not visibly disclose PREVIEW ONLY`);
    }
  }
  if (entry.kind === 'source' && entry.reviewStage === 'source-review') {
    if (!labels.some((label) => String(label).includes('SOURCE REVIEW NEEDED'))) {
      failures.push(`${stateResult.state}: source-review preview did not visibly disclose SOURCE REVIEW NEEDED`);
    }
    if (!labels.some((label) => String(label).includes('PREVIEW ONLY'))) {
      failures.push(`${stateResult.state}: source-review preview did not visibly disclose PREVIEW ONLY`);
    }
  }
  if (snapshot?.catalogIds && sandboxIndexIds.length) {
    const liveIds = Array.isArray(snapshot.catalogIds) ? snapshot.catalogIds : [];
    const duplicates = duplicateIds(liveIds);
    const liveUniqueIds = sortedIds(new Set(liveIds));
    const indexIds = sortedIds(sandboxIndexIds);
    const missingFromIndex = liveUniqueIds.filter((id) => !indexIds.includes(id));
    const missingFromRuntime = indexIds.filter((id) => !liveUniqueIds.includes(id));
    if (
      duplicates.length
      || liveIds.length !== liveUniqueIds.length
      || liveUniqueIds.length !== indexIds.length
      || missingFromIndex.length
      || missingFromRuntime.length
    ) {
      failures.push(`${stateResult.state}: runtime sandbox catalog does not match generated index: ${JSON.stringify({
        runtimeEntries: liveIds.length,
        runtimeUniqueEntries: liveUniqueIds.length,
        indexedEntries: indexIds.length,
        duplicates,
        missingFromIndex,
        missingFromRuntime,
      })}`);
    }
  }
  if (entry.kind === 'articulated' && snapshot?.mode !== stateResult.state) {
    failures.push(`${stateResult.state}: snapshot mode ${snapshot?.mode ?? 'missing'} did not match requested state`);
  }
  if (companion) {
    if (snapshot?.companion !== companion) failures.push(`${stateResult.state}: snapshot companion ${snapshot?.companion ?? 'missing'} did not match ${companion}`);
    if (companion === 'diver' && snapshot?.hasDiver !== true) failures.push(`${stateResult.state}: paired diver companion was not rendered`);
  }
  if (entry.kind === 'source') {
    if (!snapshot?.hasPreviewSprite) failures.push(`${stateResult.state}: source preview did not create a preview sprite`);
    const expectedTexture = entry.textureKey ?? entry.id;
    if (snapshot?.previewTexture !== expectedTexture) {
      failures.push(`${stateResult.state}: source preview texture ${snapshot?.previewTexture ?? 'missing'} did not match ${expectedTexture}`);
    }
  }
  if (!stats.exists || stats.width <= 0 || stats.height <= 0) failures.push(`${stateResult.state}: canvas missing or zero-sized`);
  if (stats.opaqueSamples < 120 || stats.variedSamples < 8 || stats.lumaRange < 12) {
    failures.push(`${stateResult.state}: canvas appears blank or underdrawn: ${JSON.stringify(stats)}`);
  }
  const framing = stateResult.framing ?? {};
  if (!disableFramingCheck && entry.kind === 'articulated') {
    if (!framing.bbox) failures.push(`${stateResult.state}: screenshot framing could not find a visible subject`);
    if (framing.widthRatio > 0.92) failures.push(`${stateResult.state}: sandbox subject is too wide for review framing (${framing.widthRatio}); reduce preview scale or creature radius`);
    if (framing.heightRatio > 0.84) failures.push(`${stateResult.state}: sandbox subject is too tall for review framing (${framing.heightRatio}); reduce preview scale or creature radius`);
    if (framing.areaRatio > 0.68) failures.push(`${stateResult.state}: sandbox subject fills too much viewport area (${framing.areaRatio}); preview cannot prove readable silhouette`);
  }
  return failures;
}

const generatedAt = new Date().toISOString();
if (writeScreenshots || writeReportFile) await mkdir(outputDir, { recursive: true });
const runtimeManifest = await loadRuntimeManifest();
const runtimeCreaturesById = new Map((runtimeManifest.creatures ?? []).map((creature) => [creature.id, creature]));
const sourceManifestsById = await loadSourceManifests();
const sandboxIndexIds = (await loadSandboxIndexEntries()).map((entry) => entry.id);
let entries = await loadEntries();
const availableEntries = entries.length;
if (requestedIds.length) {
  const wanted = new Set(requestedIds);
  entries = entries.filter((entry) => wanted.has(entry.id));
  const found = new Set(entries.map((entry) => entry.id));
  const missing = requestedIds.filter((id) => !found.has(id));
  if (missing.length) throw new Error(`Unknown sandbox id(s): ${missing.join(', ')}`);
}
if (requestedKinds.length) {
  const wantedKinds = new Set(requestedKinds);
  entries = entries.filter((entry) => wantedKinds.has(entry.kind));
  const foundKinds = new Set(entries.map((entry) => entry.kind));
  const missingKinds = requestedKinds.filter((kind) => !foundKinds.has(kind));
  if (missingKinds.length) throw new Error(`Unknown sandbox kind(s): ${missingKinds.join(', ')}`);
}
if (limit > 0) entries = entries.slice(0, limit);
if (!entries.length) throw new Error('No sandbox entries to check.');

const server = await startServer();
let browser;
const results = [];
const failures = [];
try {
  browser = await launchBrowser();
  for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
    const entry = entries[entryIndex];
    if (showProgress) {
      console.error(`[sandbox:visual] ${entryIndex + 1}/${entries.length} ${entry.id} (${entry.kind ?? 'unknown'})`);
    }
    const url = `${server.baseUrl}${entryUrl(entry)}`;
    const screenshotPath = writeScreenshots ? resolve(outputDir, `${screenshotBaseName(entry, 'idle')}.png`) : null;
	    const result = {
	      id: entry.id,
	      species: entry.species,
	      kind: entry.kind ?? 'unknown',
	      reviewStage: reviewStage(entry),
	      qualityStatus: entry.qualityStatus ?? null,
	      acceptedForContentGate: acceptedForContentGate(entry),
	      acceptanceNotice: acceptanceNotice(entry),
	      url,
	      companion: companion || null,
	      screenshotPath,
        artifactsWritten: writeScreenshots,
	      states: [],
	      failures: [],
	    };
    let entryPage = null;
    try {
      await withTimeout((async () => {
        if (entry.kind === 'articulated') {
          const runtimeCreature = runtimeCreaturesById.get(entry.id);
          const sourceManifest = sourceManifestsById.get(entry.id);
          result.assetFingerprint = runtimeCreature
            ? await articulatedAssetFingerprint(runtimeCreature, sourceManifest)
            : null;
          if (!runtimeCreature) result.failures.push('missing runtime creature for asset fingerprint');
        }
        entryPage = await browser.newPage({ viewport });
        entryPage.setDefaultTimeout(Math.min(operationTimeoutMs, 10000));
        entryPage.setDefaultNavigationTimeout(Math.max(operationTimeoutMs, 10000));
        await withTimeout(entryPage.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.max(operationTimeoutMs, 10000) }), operationTimeoutMs + 5000, `${entry.id} navigation`);
        await withTimeout(entryPage.waitForSelector('canvas', { state: 'attached', timeout: operationTimeoutMs }), operationTimeoutMs + 1000, `${entry.id} canvas wait`);
        await withTimeout(entryPage.waitForFunction(() => window.__AQUA_SANDBOX__?.snapshot?.()?.entryId, null, { timeout: operationTimeoutMs }), operationTimeoutMs + 1000, `${entry.id} sandbox hook wait`);
        for (const state of statesForEntry(entry)) {
          await withTimeout(entryPage.evaluate((nextState) => window.__AQUA_SANDBOX__?.setMode?.(nextState), state), operationTimeoutMs, `${entry.id} ${state} setMode`);
          await entryPage.waitForTimeout(260);
          await withTimeout(entryPage.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)))), operationTimeoutMs, `${entry.id} ${state} animation frame`);
          const snapshot = await withTimeout(entryPage.evaluate(() => window.__AQUA_SANDBOX__?.snapshot?.() ?? null), operationTimeoutMs, `${entry.id} ${state} snapshot`);
          const stats = await withTimeout(canvasStats(entryPage), operationTimeoutMs, `${entry.id} ${state} canvas stats`);
          const stateScreenshotPath = writeScreenshots
            ? state === 'idle' ? screenshotPath : resolve(outputDir, `${screenshotBaseName(entry, state)}.png`)
            : null;
          const stateResult = { state, screenshotPath: stateScreenshotPath, snapshot, canvas: stats, failures: [] };
          const screenshotBuffer = await withTimeout(
            writeScreenshots
              ? entryPage.screenshot({ path: stateScreenshotPath, timeout: operationTimeoutMs })
              : entryPage.screenshot({ timeout: operationTimeoutMs }),
            operationTimeoutMs + 1000,
            `${entry.id} ${state} screenshot`,
          );
          if (writeSidecars) {
            const sidecarPath = stateScreenshotPath.replace(/\.png$/i, '.json');
            stateResult.sidecarPath = sidecarPath;
            await writeFile(sidecarPath, `${JSON.stringify({
              schema: 'water9/sandbox-screenshot-sidecar@1',
              generatedAt,
              id: entry.id,
              species: entry.species,
              kind: entry.kind ?? 'unknown',
              state,
	            reviewStage: reviewStage(entry),
	            qualityStatus: entry.qualityStatus ?? null,
	            acceptedForContentGate: acceptedForContentGate(entry),
	            acceptanceNotice: acceptanceNotice(entry),
	            companion: companion || null,
              url,
              screenshotPath: stateScreenshotPath,
              assetFingerprint: result.assetFingerprint ?? null,
            }, null, 2)}\n`);
          }
          try {
            stateResult.framing = writeScreenshots
              ? await screenshotFraming(stateScreenshotPath)
              : screenshotFramingFromBuffer(screenshotBuffer);
          } catch (error) {
            stateResult.framing = { error: error.message };
          }
          stateResult.failures = validateStateResult(entry, stateResult);
          result.states.push(stateResult);
          result.failures.push(...stateResult.failures);
          if (state === 'idle') {
            result.snapshot = snapshot;
            result.canvas = stats;
          }
        }
      })(), entryTimeoutMs, `${entry.id} sandbox visual check`);
    } catch (error) {
      result.failures.push(error.message);
    } finally {
      if (entryPage) {
        try {
          await entryPage.close({ runBeforeUnload: false });
        } catch {
          // The page may already be torn down after a timeout.
        }
      }
    }
    if (result.failures.length) failures.push(`${entry.id}: ${result.failures.join('; ')}`);
    results.push(result);
  }
} finally {
  if (browser) await browser.close();
  await server.close();
}

const report = {
  schema: 'water9/sandbox-visual-check@1',
  generatedAt,
  acceptanceMode: 'render-check-only-not-approval',
  baseUrl: server.baseUrl,
  checked: results.length,
  availableEntries,
  selection: {
    ids: requestedIds,
    kinds: requestedKinds,
    allCatalog: checkAllCatalog,
    limit,
    companion: companion || null,
  },
  artifacts: {
    screenshots: writeScreenshots,
    sidecars: writeSidecars,
    report: writeReportFile,
  },
  outputDir: writeScreenshots || writeReportFile ? outputDir : null,
  viewport,
  entryTimeoutMs,
  operationTimeoutMs,
  states: requestedStates,
  results,
  failures,
};
if (writeReportFile) {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}
`);
}
if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    checked: results.length,
    generatedAt: report.generatedAt,
    outputDir: report.outputDir,
    reportPath: writeReportFile ? reportPath : null,
    artifacts: report.artifacts,
    failures,
  }, null, 2));
}
