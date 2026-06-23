import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const host = String(args.get('host') ?? '127.0.0.1');
let port = Number(args.get('port') ?? 5194);
const json = args.has('json');
const serve = args.has('serve');
const openBrowser = args.has('open');
const noBuild = args.has('no-build');
const explicitId = String(args.get('id') ?? args.get('candidate') ?? '').trim();
const sprintPath = resolve(String(args.get('sprint') ?? 'public/review/content-rigging-sprint.json'));

function baseUrl() {
  return `http://${host}:${port}`;
}

function relativeUrlFor(id) {
  return `/review/content-rigging-sprint.html${id ? `#${encodeURIComponent(id)}` : ''}`;
}

function runBuild() {
  const result = spawnSync('npm', ['run', 'content:rigging-sprint'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, BROWSER: 'none' },
  });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(`Failed to build content rigging sprint${output ? `:\n${output}` : ''}`);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
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
const sprint = await readJson(sprintPath);
if (sprint.schema !== 'water9/content-rigging-sprint@1') {
  throw new Error(`Unexpected content rigging sprint schema ${sprint.schema ?? 'missing'}`);
}

const target = explicitId ? sprint.items.find((item) => item.id === explicitId) : null;
if (explicitId && !target) throw new Error(`No rigging sprint target found for ${explicitId}`);
const selectedId = target?.id ?? null;
const relativeUrl = relativeUrlFor(selectedId);
const payload = {
  found: true,
  schema: sprint.schema,
  sprint: sprintPath,
  relativeUrl,
  url: `${baseUrl()}${relativeUrl}`,
  selectedId,
  selectedSpecies: target?.species ?? null,
  recommendedId: sprint.items?.[0]?.id ?? null,
  summary: sprint.summary,
  commands: {
    rebuild: 'npm run content:rigging-sprint',
    validate: 'npm run content:rigging-sprint-check',
    previewSprint: 'npm run content:rigging-sprint:preview',
    previewRecommended: `npm run content:rigging-sprint:preview -- --id ${sprint.items?.[0]?.id ?? '<candidate-id>'}`,
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
  console.log('Water 9 content rigging sprint');
  console.log(`URL: ${payload.url}`);
  console.log(`Missing runtime: ${payload.summary?.missingRuntimeTotal ?? 0}`);
  console.log(`Sprint size: ${payload.summary?.sprintSize ?? 0}`);
  console.log(`Recommended: ${payload.recommendedId ?? 'none'}`);
  if (payload.selectedId) console.log(`Selected: ${payload.selectedId} ${payload.selectedSpecies ?? ''}`.trim());
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
