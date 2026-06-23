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
let port = Number(args.get('port') ?? 5196);
const json = args.has('json');
const serve = args.has('serve');
const openBrowser = args.has('open');
const noBuild = args.has('no-build');
const explicitId = String(args.get('id') ?? args.get('candidate') ?? '').trim();
const runwayPath = resolve(String(args.get('runway') ?? 'public/review/source-approval-runway.json'));
const checklistPath = resolve(String(args.get('checklist') ?? 'public/review/source-approval-checklist.json'));
const relativeUrl = '/review/source-approval-runway.html';

function baseUrl() {
  return `http://${host}:${port}`;
}

function relativeUrlFor(item) {
  return item ? `${relativeUrl}#${encodeURIComponent(item.id)}` : relativeUrl;
}

function runBuild() {
  const result = spawnSync('npm', ['run', 'source:approval-runway'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, BROWSER: 'none' },
  });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(`Failed to build source approval runway${output ? `:\n${output}` : ''}`);
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
const runway = await readJson(runwayPath);
if (runway.schema !== 'water9/source-approval-runway@1') {
  throw new Error(`Unexpected source approval runway schema ${runway.schema ?? 'missing'}`);
}
const checklist = await readJson(checklistPath);
if (checklist.schema !== 'water9/source-approval-checklist@1') {
  throw new Error(`Unexpected source approval checklist schema ${checklist.schema ?? 'missing'}`);
}

const items = Array.isArray(runway.items) ? runway.items : [];
const recommended = runway.recommended ?? items.find((item) => item.readyForHumanReview && !item.humanApproved) ?? items[0] ?? null;
const target = explicitId ? items.find((item) => item.id === explicitId) : recommended;
if (explicitId && !target) throw new Error(`No source approval runway candidate found for ${explicitId}`);

const selectedRelativeUrl = relativeUrlFor(target);
const payload = {
  found: true,
  schema: runway.schema,
  runway: runwayPath,
  checklist: checklistPath,
  checklistSchema: checklist.schema,
  relativeUrl: selectedRelativeUrl,
  url: `${baseUrl()}${selectedRelativeUrl}`,
  selectedId: target?.id ?? null,
  selectedSpecies: target?.species ?? null,
  recommendedId: recommended?.id ?? null,
  summary: runway.summary,
  commands: {
    rebuild: 'npm run source:approval-runway',
    validate: 'npm run source:approval-runway-check',
    preview: 'npm run source:approval-runway:preview',
    previewRecommended: `npm run source:approval-runway:preview -- --id ${recommended?.id ?? '<candidate-id>'}`,
    quickReview: target?.commands?.quickReview ?? null,
    accept: target?.acceptCommand ?? null,
    reject: target?.rejectCommand ?? null,
  },
  devServerCommand: `npm run dev -- --port ${port}`,
};

let server = null;
if (serve) {
  server = await startPreviewServer();
  payload.url = `${baseUrl()}${selectedRelativeUrl}`;
  payload.devServerCommand = `running on ${baseUrl()} (Ctrl-C to stop)`;
  if (openBrowser) openUrl(payload.url);
}

if (json) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log('Water 9 source approval runway');
  console.log(`URL: ${payload.url}`);
  console.log(`Candidates: ${payload.summary?.candidates ?? 0}`);
  console.log(`Ready for human review: ${payload.summary?.readyForHumanReview ?? 0}`);
  console.log(`Human approved: ${payload.summary?.humanApproved ?? 0}`);
  if (payload.selectedId) console.log(`Selected: ${payload.selectedId} ${payload.selectedSpecies ?? ''}`.trim());
  console.log(`Recommended: ${payload.recommendedId ?? 'none'}`);
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
