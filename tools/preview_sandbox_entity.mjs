import { readFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import {
  resolveSandboxEntry,
  sandboxReviewStage,
} from './sandbox_entity_resolver.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const defaultManifestPath = resolve('public/review/sandbox/manifest.json');
const manifestPath = resolve(String(args.get('manifest') ?? defaultManifestPath));
const autoRebuild = args.has('rebuild') && !args.has('no-rebuild') && manifestPath === defaultManifestPath;
const id = String(args.get('id') ?? args.get('entity') ?? '').trim();
const kindFilter = String(args.get('kind') ?? '')
  .split(',')
  .map((kind) => kind.trim())
  .filter(Boolean);
const host = String(args.get('host') ?? '127.0.0.1');
let port = Number(args.get('port') ?? 5177);
const list = args.has('list');
const json = args.has('json');
const best = args.has('best') || args.has('first') || args.has('resolve-best');
const limit = Number(args.get('limit') ?? 40);
const visual = args.has('visual');
const serve = args.has('serve');
const openBrowser = args.has('open');
const states = String(args.get('states') ?? 'idle,lunge,stunned');
const companion = String(args.get('with') ?? args.get('companion') ?? '').trim();

function usage() {
  console.error('Usage: node tools/preview_sandbox_entity.mjs --id <sandbox-id> [--with diver|none] [--port 5177] [--json] [--visual] [--serve] [--open] [--rebuild] [--best]');
  console.error('       node tools/preview_sandbox_entity.mjs --list [--kind articulated,fish] [--limit 40] [--rebuild]');
}

function baseUrl() {
  return `http://${host}:${port}`;
}

function withCompanion(url) {
  if (!companion) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}companion=${encodeURIComponent(companion)}`;
}

function withSpecificCompanion(url, requestedCompanion) {
  if (!requestedCompanion) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}companion=${encodeURIComponent(requestedCompanion)}`;
}

function absoluteUrl(entry) {
  return `${baseUrl()}${withCompanion(entry.url)}`;
}

function absoluteUrlWithCompanion(entry, requestedCompanion) {
  return `${baseUrl()}${withSpecificCompanion(entry.url, requestedCompanion)}`;
}

function visualCheckCommand(entry, requestedCompanion = companion) {
  const companionFlag = requestedCompanion ? ` --with ${requestedCompanion}` : '';
  if (entry.kind === 'articulated') {
    return `npm run sandbox:visual -- --ids ${entry.id} --states ${states}${companionFlag} --base-url ${baseUrl()}`;
  }
  return `npm run sandbox:visual -- --ids ${entry.id}${companionFlag} --base-url ${baseUrl()}`;
}

function reviewStage(entry) {
  return sandboxReviewStage(entry);
}

function productionReady(entry) {
  return entry.kind === 'articulated' && entry.acceptedForContentGate === true;
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

function manualReviewRequired(entry) {
  const stage = reviewStage(entry);
  if (stage === 'prototype') return 'source/contact/phase/sandbox human acceptance required';
  if (stage === 'source-review') return 'source image human approval required before rigging';
  if (stage === 'source-approved') return 'rigging and sandbox acceptance required';
  return productionReady(entry) ? null : 'reference preview; not counted by threat gate';
}

function productionBoundary(entry) {
  if (entry.productionBoundary?.schema === 'water9/sandbox-production-boundary@1') return entry.productionBoundary;
  const accepted = acceptedForContentGate(entry);
  return {
    schema: 'water9/sandbox-production-boundary@1',
    reviewStage: reviewStage(entry),
    qualityStatus: entry.qualityStatus ?? null,
    productionReady: accepted,
    acceptedForContentGate: accepted,
    previewOnly: !accepted,
    manualReviewRequired: manualReviewRequired(entry),
    claim: accepted
      ? 'accepted articulated threat with strict review evidence'
      : acceptanceNotice(entry),
  };
}

function reviewGateLabel(entry) {
  if (entry.reviewGateLabel) return entry.reviewGateLabel;
  if (entry.kind === 'articulated' && !acceptedForContentGate(entry)) {
    return `PREVIEW ONLY PROTOTYPE - NOT ACCEPTED / quality: ${entry.qualityStatus ?? 'prototype'} / needs human source, contact, phase, and sandbox review`;
  }
  if (entry.kind === 'source' && !acceptedForContentGate(entry)) {
    return `SOURCE REVIEW NEEDED / PREVIEW ONLY SOURCE ART - NOT ACCEPTED / quality: ${entry.qualityStatus ?? 'unknown'} / needs human source image and full-source concept approval before rigging`;
  }
  if (entry.kind === 'articulated') return 'ACCEPTED THREAT / strict gate evidence required';
  if (entry.kind === 'source') return 'SOURCE APPROVED / eligible for rigging';
  return 'REFERENCE PREVIEW / not part of the 20-threat production gate';
}

function reviewGateSeverity(entry) {
  if (entry.reviewGateSeverity) return entry.reviewGateSeverity;
  if (acceptedForContentGate(entry) || reviewStage(entry) === 'source-approved') return 'accepted';
  if (entry.kind === 'articulated' || entry.kind === 'source') return 'preview-only';
  return 'reference';
}

async function portAvailable(candidatePort) {
  return new Promise((resolveAvailable) => {
    const server = createServer();
    server.once('error', () => resolveAvailable(false));
    server.once('listening', () => server.close(() => resolveAvailable(true)));
    server.listen(candidatePort, host);
  });
}

async function findOpenPort(start) {
  for (let candidate = start; candidate < start + 100; candidate += 1) {
    if (await portAvailable(candidate)) return candidate;
  }
  throw new Error(`No open port found from ${start} to ${start + 99}`);
}

async function waitForServer(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 180));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function openUrl(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const commandArgs = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, commandArgs, { detached: true, stdio: 'ignore' });
  child.unref();
}

async function startPreviewServer() {
  port = await findOpenPort(port);
  const viteBin = resolve('node_modules/.bin/vite');
  const child = spawn(viteBin, ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  try {
    await waitForServer(baseUrl());
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(`${error.message}\nVite output:\n${output}`);
  }
  return {
    close: async () => {
      if (child.exitCode !== null) return;
      await new Promise((resolveClose) => {
        const killGroup = (signal) => {
          try {
            process.kill(-child.pid, signal);
          } catch {
            try { child.kill(signal); } catch { /* Already stopped. */ }
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

function filterEntries(entries) {
  return kindFilter.length ? entries.filter((entry) => kindFilter.includes(entry.kind)) : entries;
}

function buildSandboxIndex() {
  const result = spawnSync(process.execPath, ['tools/build_sandbox_index.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(`Failed to rebuild sandbox index${output ? `:\n${output}` : ''}`);
  }
}

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

function validateManifest(manifest) {
  if (manifest.schema !== 'water9/sandbox-index@1') {
    throw new Error(`Unexpected sandbox manifest schema ${manifest.schema ?? 'missing'}`);
  }
}

async function loadManifest() {
  if (autoRebuild) {
    buildSandboxIndex();
    return { manifest: await readManifest(), rebuilt: true };
  }
  try {
    return { manifest: await readManifest(), rebuilt: false };
  } catch (error) {
    throw error;
  }
}

let { manifest, rebuilt } = await loadManifest();
validateManifest(manifest);
let entries = filterEntries(Array.isArray(manifest.entries) ? manifest.entries : []);

if (list) {
  const rows = entries.slice(0, limit).map((entry) => ({
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    reviewStage: reviewStage(entry),
	    qualityStatus: entry.qualityStatus ?? null,
	    productionReady: productionReady(entry),
	    acceptedForContentGate: acceptedForContentGate(entry),
	    acceptanceNotice: acceptanceNotice(entry),
	    productionBoundary: productionBoundary(entry),
	    reviewGateLabel: reviewGateLabel(entry),
	    reviewGateSeverity: reviewGateSeverity(entry),
	    url: absoluteUrl(entry),
	    pairedUrl: absoluteUrlWithCompanion(entry, 'diver'),
	    previewCommand: entry.previewCommand ?? `npm run sandbox:preview -- --id ${entry.id} --serve --open --visual`,
	    pairedPreviewCommand: entry.pairedPreviewCommand ?? `npm run sandbox:preview -- --id ${entry.id} --with diver --serve --open --visual`,
	    visualCheckCommand: entry.visualCheckCommand ?? visualCheckCommand(entry, ''),
	    pairedVisualCheckCommand: entry.pairedVisualCheckCommand ?? visualCheckCommand(entry, 'diver'),
    notes: entry.notes ?? '',
  }));
  if (json) {
    console.log(JSON.stringify({ manifest: manifestPath, rebuiltIndex: rebuilt, count: entries.length, rows }, null, 2));
  } else {
    console.log(`Sandbox entries: ${entries.length}`);
    for (const row of rows) {
	      console.log(`${row.id.padEnd(32)} ${String(row.kind).padEnd(12)} ${String(row.reviewStage).padEnd(16)} accepted:${row.acceptedForContentGate ? 'yes' : 'no'} ${row.url}`);
    }
    if (entries.length > rows.length) console.log(`... ${entries.length - rows.length} more. Increase --limit to list more.`);
  }
  process.exit(0);
}

if (!id) {
  usage();
  process.exit(1);
}

function suggestionPayload(item) {
  return {
    id: item.entry.id,
    name: item.entry.name,
    kind: item.entry.kind,
    reviewStage: reviewStage(item.entry),
	    qualityStatus: item.entry.qualityStatus ?? null,
	    productionReady: productionReady(item.entry),
	    acceptedForContentGate: acceptedForContentGate(item.entry),
	    acceptanceNotice: acceptanceNotice(item.entry),
	    productionBoundary: productionBoundary(item.entry),
	    reviewGateLabel: reviewGateLabel(item.entry),
	    reviewGateSeverity: reviewGateSeverity(item.entry),
	    url: absoluteUrl(item.entry),
    previewCommand: `npm run sandbox:preview -- --id ${item.entry.id}${item.entry.kind === 'articulated' ? ' --with diver' : ''} --serve --open --visual`,
  };
}

const resolution = resolveSandboxEntry(entries, id, { best, limit: 8 });
let entry = resolution.entry ?? null;
if (!resolution.found || !entry) {
  const suggestions = resolution.suggestions.map(suggestionPayload);
  const payload = {
    found: false,
    id,
    requestedId: resolution.requestedId,
    reason: resolution.reason,
    manifest: manifestPath,
    rebuiltIndex: rebuilt,
    availableEntries: entries.length,
    suggestions,
    next: [
      'npm run sandbox:index',
      'npm run sandbox:preview -- --list',
      'npm run sandbox:preview -- --list --rebuild',
      kindFilter.length
        ? `npm run sandbox:preview -- --id ${id} --kind ${kindFilter.join(',')} --best --with diver --serve --open --visual`
        : `npm run sandbox:preview -- --id ${id} --best --with diver --serve --open --visual`,
    ],
  };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const payload = {
  found: true,
  resolvedByBestMatch: resolution.method === 'best-match',
  resolvedByAlias: resolution.method === 'curated-alias' || resolution.method === 'source-alias',
  resolutionMethod: resolution.method,
  requestedId: id,
  id: entry.id,
  name: entry.name,
  kind: entry.kind,
  rarity: entry.rarity ?? null,
  hostile: Boolean(entry.hostile),
  reviewStage: reviewStage(entry),
	  qualityStatus: entry.qualityStatus ?? null,
	  productionReady: productionReady(entry),
	  acceptedForContentGate: acceptedForContentGate(entry),
	  acceptanceNotice: acceptanceNotice(entry),
	  productionBoundary: productionBoundary(entry),
	  reviewGateLabel: reviewGateLabel(entry),
	  reviewGateSeverity: reviewGateSeverity(entry),
	  manualReviewRequired: manualReviewRequired(entry),
  companion: companion || null,
  source: entry.source ?? null,
  notes: entry.notes ?? null,
  rebuiltIndex: rebuilt,
  relativeUrl: withCompanion(entry.url),
  url: absoluteUrl(entry),
  pairedRelativeUrl: withSpecificCompanion(entry.url, 'diver'),
  pairedUrl: absoluteUrlWithCompanion(entry, 'diver'),
  devServerCommand: `npm run dev -- --port ${port}`,
  visualCheckCommand: visual ? visualCheckCommand(entry) : null,
  pairedVisualCheckCommand: visual ? visualCheckCommand(entry, 'diver') : null,
};

let server = null;
if (serve) {
  server = await startPreviewServer();
  payload.url = absoluteUrl(entry);
  payload.pairedUrl = absoluteUrlWithCompanion(entry, 'diver');
  payload.devServerCommand = `running on ${baseUrl()} (Ctrl-C to stop)`;
  payload.visualCheckCommand = visual ? visualCheckCommand(entry) : null;
  payload.pairedVisualCheckCommand = visual ? visualCheckCommand(entry, 'diver') : null;
  if (openBrowser) openUrl(payload.url);
}

if (json && !serve) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  if (json) console.log(JSON.stringify(payload, null, 2));
  else {
    console.log(`Sandbox preview: ${payload.name} (${payload.id})`);
    console.log(`Kind: ${payload.kind}`);
    console.log(`Gate stage: ${payload.reviewStage}`);
	    console.log(`Production ready: ${payload.productionReady ? 'yes' : 'no'}`);
	    console.log(`Content gate accepted: ${payload.acceptedForContentGate ? 'yes' : 'no'}`);
	    console.log(`Review banner: ${payload.reviewGateLabel}`);
	    console.log(`Acceptance note: ${payload.acceptanceNotice}`);
    if (payload.manualReviewRequired) console.log(`Manual review: ${payload.manualReviewRequired}`);
    console.log(`URL: ${payload.url}`);
    console.log(`Paired URL: ${payload.pairedUrl}`);
    console.log(`Dev server: ${payload.devServerCommand}`);
    if (payload.visualCheckCommand) console.log(`Visual check: ${payload.visualCheckCommand}`);
    if (payload.pairedVisualCheckCommand) console.log(`Paired visual check: ${payload.pairedVisualCheckCommand}`);
    if (serve && openBrowser) console.log('Browser: open requested');
    if (serve) console.log('Press Ctrl-C to stop the preview server.');
  }
}

if (serve && server) {
  const stop = async () => {
    await server.close();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  await new Promise(() => {});
}
