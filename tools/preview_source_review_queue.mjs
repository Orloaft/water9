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
let port = Number(args.get('port') ?? 5192);
const json = args.has('json');
const serve = args.has('serve');
const openBrowser = args.has('open');
const noBuild = args.has('no-build');
const dossierMode = args.has('dossier');
const explicitId = String(args.get('id') ?? args.get('candidate') ?? '').trim();
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/quick-reviews/index.json'));
const dossierPath = resolve(String(args.get('review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json'));

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function baseUrl() {
  return `http://${host}:${port}`;
}

function relativeUrlFor(item) {
  if (dossierMode) return '/review/source-candidates/source-review-dossier.html';
  if (item) return `/review/source-candidates/quick-reviews/${safeFileName(item.id)}.html`;
  return '/review/source-candidates/quick-reviews/index.html';
}

function runStep(label, command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, BROWSER: 'none' },
  });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(`${label} failed${output ? `:\n${output}` : ''}`);
  }
}

function runBuild() {
  runStep('source review dossier build', 'npm', ['run', 'source:review-dossier']);
  runStep('source quick review queue build', 'npm', ['run', 'source:quick-review-all', '--', '--no-build']);
  runStep('source quick review queue validation', 'npm', ['run', 'source:quick-review-all-check']);
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
const queue = await readJson(queuePath);
if (queue.schema !== 'water9/source-quick-review-index@1') {
  throw new Error(`Unexpected source quick review queue schema ${queue.schema ?? 'missing'}`);
}
const dossier = await readJson(dossierPath);
if (dossier.schema !== 'water9/source-review-dossier@1') {
  throw new Error(`Unexpected source review dossier schema ${dossier.schema ?? 'missing'}`);
}

const reviews = Array.isArray(queue.reviews) ? queue.reviews : [];
const target = explicitId ? reviews.find((review) => review.id === explicitId) : null;
if (explicitId && !target) throw new Error(`No source quick review found for ${explicitId}`);

const ready = reviews.filter((review) => review.readyForHumanReview);
const relativeUrl = relativeUrlFor(target);
const payload = {
  found: true,
  schema: queue.schema,
  queue: queuePath,
  dossier: dossierPath,
  relativeUrl,
  url: `${baseUrl()}${relativeUrl}`,
  selectedId: target?.id ?? null,
  selectedSpecies: target?.species ?? null,
  recommendedId: dossier.recommendedReview?.id ?? ready[0]?.id ?? null,
  summary: {
    reviews: reviews.length,
    readyForHumanReview: ready.length,
    approved: queue.summary?.approved ?? reviews.filter((review) => review.reviewStatus === 'approved').length,
    blocked: queue.summary?.blocked ?? reviews.filter((review) => review.reviewStatus === 'blocked').length,
    dossierPendingReview: dossier.summary?.pendingReview ?? null,
    dossierApprovedSources: dossier.summary?.approvedSources ?? null,
  },
  commands: {
    rebuild: 'npm run source:review-queue',
    validate: 'npm run source:review-queue-check',
    previewQueue: 'npm run source:review-queue:preview',
    previewRecommended: `npm run source:review-queue:preview -- --id ${dossier.recommendedReview?.id ?? ready[0]?.id ?? '<candidate-id>'}`,
    openDossier: 'npm run source:review-queue:preview -- --dossier',
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
  console.log('Water 9 source review queue');
  console.log(`URL: ${payload.url}`);
  console.log(`Reviews: ${payload.summary.reviews}`);
  console.log(`Ready for human review: ${payload.summary.readyForHumanReview}`);
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
