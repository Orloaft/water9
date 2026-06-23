import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveSandboxEntry } from './sandbox_entity_resolver.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const host = String(args.get('host') ?? '127.0.0.1');
let port = Number(args.get('port') ?? 5179);
const json = args.has('json');
const serve = args.has('serve');
const openBrowser = args.has('open');
const noBuild = args.has('no-build');
const id = String(args.get('id') ?? args.get('entity') ?? 'abyssal-gulper').trim();
const companion = String(args.get('with') ?? args.get('companion') ?? 'diver').trim();
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/sandbox/manifest.json'));
const best = args.has('best') || args.has('first') || args.has('resolve-best');

function baseUrl() {
  return `http://${host}:${port}`;
}

function relativeUrlFor(entry) {
  const query = new URLSearchParams();
  if (entry?.id) query.set('id', entry.id);
  if (companion && entry?.id !== 'diver') query.set('with', companion);
  return `/review/sandbox/lab.html${query.toString() ? `?${query}` : ''}`;
}

function suggestionPayload(item) {
  return {
    id: item.entry.id,
    name: item.entry.name,
    kind: item.entry.kind,
    score: item.score,
    previewLabCommand: `npm run sandbox:lab -- --id ${item.entry.id}${companion && item.entry.id !== 'diver' ? ` --with ${companion}` : ''}`,
    previewEntityCommand: item.entry.pairedPreviewCommand ?? item.entry.previewCommand ?? `npm run sandbox:preview -- --id ${item.entry.id} --serve --open --visual`,
  };
}

function runBuild() {
  const result = spawnSync('npm', ['run', 'sandbox:index'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, BROWSER: 'none' },
  });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(`Failed to build sandbox index${output ? `:\n${output}` : ''}`);
  }
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

if (!noBuild) runBuild();
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema !== 'water9/sandbox-index@1') throw new Error(`Unexpected sandbox manifest schema ${manifest.schema ?? 'missing'}`);
const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
const resolution = resolveSandboxEntry(entries, id, { best, limit: 8 });
const entry = resolution.entry ?? null;
if (!entry || !resolution.found) {
  const payload = {
    found: false,
    schema: 'water9/sandbox-lab-preview@1',
    manifest: manifestPath,
    requestedId: resolution.requestedId,
    reason: resolution.reason,
    availableEntries: entries.length,
    suggestions: resolution.suggestions.map(suggestionPayload),
    next: [
      'npm run sandbox:index',
      'npm run sandbox:preview -- --list',
      `npm run sandbox:lab -- --id ${id} --best${companion ? ` --with ${companion}` : ''}`,
    ],
  };
  const text = JSON.stringify(payload, null, 2);
  if (json) console.error(text);
  else {
    console.error(`No sandbox lab entity matched "${id}" (${payload.reason ?? 'unknown-id'}).`);
    if (payload.suggestions.length) {
      console.error(`Suggestions: ${payload.suggestions.map((suggestion) => suggestion.id).join(', ')}`);
    }
    console.error(text);
  }
  process.exit(1);
}
const relativeUrl = relativeUrlFor(entry);
const payload = {
  found: true,
  schema: 'water9/sandbox-lab-preview@1',
  manifest: manifestPath,
  requestedId: id,
  resolutionMethod: resolution.method,
  resolvedByBestMatch: resolution.method === 'best-match',
  resolvedByAlias: resolution.method === 'curated-alias' || resolution.method === 'source-alias',
  selectedId: entry.id,
  selectedKind: entry.kind,
  selectedName: entry.name,
  companion: companion && entry.id !== 'diver' ? companion : null,
  relativeUrl,
  url: `${baseUrl()}${relativeUrl}`,
  summary: manifest.counts,
  commands: {
    rebuild: 'npm run sandbox:index',
    validate: 'npm run sandbox:index:check',
    previewLab: `npm run sandbox:lab -- --id ${entry.id}${companion && entry.id !== 'diver' ? ` --with ${companion}` : ''}`,
    previewEntity: entry.previewCommand,
    pairedPreviewEntity: entry.pairedPreviewCommand,
    visualCheck: entry.visualCheckCommand,
    pairedVisualCheck: entry.pairedVisualCheckCommand,
  },
  devServerCommand: `npm run dev -- --port ${port}`,
};

let server = null;
if (serve) {
  server = await startPreviewServer();
  payload.url = `${baseUrl()}${relativeUrl}`;
  payload.devServerCommand = `running on ${baseUrl()} (Ctrl-C to stop)`;
  if (openBrowser) openUrl(payload.url);
}

if (json) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log('Water 9 sandbox lab');
  console.log(`URL: ${payload.url}`);
  console.log(`Selected: ${payload.selectedId} ${payload.selectedName}`);
  console.log(`Entries: ${payload.summary?.total ?? entries.length}`);
  console.log(`Dev server: ${payload.devServerCommand}`);
  console.log(`Rebuild: ${payload.commands.rebuild}`);
  console.log(`Validate: ${payload.commands.validate}`);
  if (serve && openBrowser) console.log('Browser: open requested');
  if (serve) console.log('Press Ctrl-C to stop the preview server.');
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
