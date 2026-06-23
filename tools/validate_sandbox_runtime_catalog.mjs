import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/sandbox/manifest.json'));
const baseUrlArg = args.get('base-url') || args.get('baseUrl');
const viewport = { width: Number(args.get('width') ?? 960), height: Number(args.get('height') ?? 640) };

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
  throw new Error('No open local port found for sandbox runtime catalog check.');
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
    throw new Error(`${error.message}\nVite output:\n${output}`);
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
      // Try next candidate.
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

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function duplicateIds(ids) {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id, count]) => ({ id, count }));
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const manifestIds = sorted((manifest.entries ?? []).map((entry) => entry.id));
const failures = [];

const server = await startServer();
let browser;
try {
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport });
  await page.goto(`${server.baseUrl}/?entity=diver`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { state: 'attached', timeout: 5000 });
  await page.waitForFunction(() => window.__AQUA_SANDBOX__?.snapshot?.()?.catalogIds?.length, null, { timeout: 5000 });
  const snapshot = await page.evaluate(() => window.__AQUA_SANDBOX__?.snapshot?.() ?? null);
  const runtimeIds = Array.isArray(snapshot?.catalogIds) ? snapshot.catalogIds : [];
  const runtimeUniqueIds = sorted(new Set(runtimeIds));
  const duplicates = duplicateIds(runtimeIds);
  const missingFromRuntime = manifestIds.filter((id) => !runtimeUniqueIds.includes(id));
  const missingFromManifest = runtimeUniqueIds.filter((id) => !manifestIds.includes(id));

  if (!snapshot) failures.push('missing sandbox snapshot');
  if (snapshot?.unresolvedRequest) failures.push(`sandbox reported unresolved request ${snapshot.unresolvedRequest}`);
  if (duplicates.length) failures.push(`runtime catalog contains duplicate ids: ${duplicates.map((item) => `${item.id} x${item.count}`).join(', ')}`);
  if (!sameArray(runtimeUniqueIds, manifestIds)) {
    failures.push(`runtime catalog ids do not match generated sandbox manifest: ${JSON.stringify({ missingFromRuntime, missingFromManifest })}`);
  }
  if (snapshot?.catalogSize !== manifestIds.length) {
    failures.push(`runtime catalogSize ${snapshot?.catalogSize ?? 'missing'} does not match manifest entries ${manifestIds.length}`);
  }

  const summary = {
    manifest: manifestPath,
    baseUrl: server.baseUrl,
    manifestEntries: manifestIds.length,
    runtimeEntries: runtimeIds.length,
    runtimeUniqueEntries: runtimeUniqueIds.length,
    catalogByKind: snapshot?.catalogByKind ?? null,
    duplicates,
    missingFromRuntime,
    missingFromManifest,
    failures,
  };
  if (failures.length) {
    console.error(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
} finally {
  if (browser) await browser.close();
  await server.close();
}
