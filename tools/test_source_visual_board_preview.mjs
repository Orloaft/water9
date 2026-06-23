import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const host = String(args.get('host') ?? '127.0.0.1');
let port = Number(args.get('port') ?? 5197);
const boardPath = String(args.get('board') ?? 'public/review/source-visual-board.json');
const limit = Number(args.get('limit') ?? 20);

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

async function waitForServer(baseUrl, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 180));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function startServer() {
  port = await findOpenPort(port);
  const child = spawn('node_modules/.bin/vite', ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  try {
    await waitForServer(`http://${host}:${port}`);
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(`${error.message}\nVite output:\n${output}`);
  }
  return child;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    const killGroup = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {
        try { child.kill(signal); } catch { /* Already stopped. */ }
      }
    };
    const timer = setTimeout(() => {
      if (child.exitCode === null) killGroup('SIGKILL');
      resolveStop();
    }, 1500);
    child.once('exit', () => {
      clearTimeout(timer);
      resolveStop();
    });
    killGroup('SIGTERM');
  });
}

function attrValues(html, attrName) {
  const values = [];
  const pattern = new RegExp(`${attrName}="([^"]+)"`, 'gu');
  let match = pattern.exec(html);
  while (match) {
    values.push(match[1].replaceAll('&amp;', '&'));
    match = pattern.exec(html);
  }
  return values;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function includesHtml(html, value) {
  return html.includes(String(value ?? '')) || html.includes(htmlEscape(value));
}

function absoluteUrl(baseUrl, maybeRelative) {
  return new URL(maybeRelative, baseUrl).toString();
}

async function fetchOk(url, minBytes = 128) {
  const response = await fetch(url);
  if (!response.ok) return { ok: false, status: response.status, bytes: 0 };
  const buffer = await response.arrayBuffer();
  return { ok: buffer.byteLength >= minBytes, status: response.status, bytes: buffer.byteLength };
}

const failures = [];
let child = null;
let baseUrl = null;
let checkedImages = 0;

try {
  const board = await readJson(boardPath);
  if (board.schema !== 'water9/source-visual-board@1') {
    failures.push(`unexpected board schema ${board.schema ?? 'missing'}`);
  }
  const items = (board.items ?? []).slice(0, limit);
  if (!items.length) failures.push('source visual board has no items');

  child = await startServer();
  baseUrl = `http://${host}:${port}`;
  const pageUrl = `${baseUrl}/review/source-visual-board.html`;
  const response = await fetch(pageUrl);
  if (!response.ok) {
    failures.push(`source visual board HTTP ${response.status}`);
  } else {
    const html = await response.text();
    for (const expected of [
      'Water 9 Source Visual Board',
      'visual review evidence, not production acceptance',
      'source',
      'magenta key',
      'sandbox source preview',
      'articulation plan preview',
      'human source approval',
    ]) {
      if (!includesHtml(html, expected)) failures.push(`visual board HTML missing ${expected}`);
    }

    const imageSrcs = attrValues(html, 'src').filter((src) => /\.(png|jpg|jpeg|webp)$/iu.test(src));
    const hrefs = attrValues(html, 'href');
    if (hrefs.some((href) => href.includes('/sandbox.html'))) {
      failures.push('visual board must not link to stale /sandbox.html preview routes');
    }
    if (imageSrcs.length < items.length * 4) {
      failures.push(`visual board image count ${imageSrcs.length} expected at least ${items.length * 4}`);
    }
    for (const item of items) {
      const expectedSourceSandbox = `/?entity=source-${item.id}&companion=diver`;
      if (item.links?.sourceSandbox !== expectedSourceSandbox) {
        failures.push(`${item.id}: source sandbox link ${item.links?.sourceSandbox ?? 'missing'} expected ${expectedSourceSandbox}`);
      }
      if (item.links?.runtimeSandbox && !String(item.links.runtimeSandbox).includes(`/?sandbox=${item.id}`)) {
        failures.push(`${item.id}: runtime sandbox link ${item.links.runtimeSandbox} must target app root sandbox route`);
      }
      for (const expected of [
        item.id,
        item.species,
        `data-source-visual-board-candidate="${item.id}"`,
        item.media?.source,
        item.media?.keyPreview,
        item.media?.sandboxScreenshot,
        item.media?.planPreview,
        item.links?.quickReview,
        item.links?.sourceSandbox,
        item.links?.runtimeSandbox,
      ].filter(Boolean)) {
        if (!includesHtml(html, expected)) failures.push(`${item.id}: visual board HTML missing ${expected}`);
      }
    }
    for (const src of imageSrcs) {
      const result = await fetchOk(absoluteUrl(pageUrl, src), 256);
      checkedImages += 1;
      if (!result.ok) failures.push(`visual board image ${src} returned ${result.status} with ${result.bytes} bytes`);
    }
  }
} catch (error) {
  failures.push(error.message);
} finally {
  await stop(child);
}

const summary = {
  schema: 'water9/source-visual-board-preview-smoke@1',
  baseUrl,
  board: boardPath,
  checkedImages,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
