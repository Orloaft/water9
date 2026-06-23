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
let port = Number(args.get('port') ?? 5194);
const limit = Number(args.get('limit') ?? 20);
const manifestPath = String(args.get('manifest') ?? 'public/review/content-review-cockpit/manifest.json');
const requiredWarning = 'Prototype evidence is not acceptance';

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
let checkedPages = 0;
let checkedImages = 0;

try {
  const manifest = await readJson(manifestPath);
  if (manifest.schema !== 'water9/content-review-cockpit@1') {
    failures.push(`unexpected cockpit schema ${manifest.schema ?? 'missing'}`);
  }
  const pages = (manifest.pages ?? []).slice(0, limit);
  if (!pages.length) failures.push('cockpit manifest has no pages');

  child = await startServer();
  baseUrl = `http://${host}:${port}`;

  const indexUrl = `${baseUrl}/review/content-review-cockpit/index.html`;
  const indexResponse = await fetch(indexUrl);
  if (!indexResponse.ok) {
    failures.push(`cockpit index HTTP ${indexResponse.status}`);
  } else {
    const indexHtml = await indexResponse.text();
    if (!indexHtml.includes('Water 9 Review Cockpit')) failures.push('cockpit index missing title');
    if (!indexHtml.includes(requiredWarning)) failures.push('cockpit index missing prototype warning');
    if (!indexHtml.includes('accepted threats')) failures.push('cockpit index missing accepted-threat count');
  }

  for (const page of pages) {
    const pagePath = `/review/content-review-cockpit/${page.href}`;
    const pageUrl = `${baseUrl}${pagePath}`;
    const response = await fetch(pageUrl);
    if (!response.ok) {
      failures.push(`${page.id}: page HTTP ${response.status}`);
      continue;
    }
    checkedPages += 1;
    const html = await response.text();
    for (const expected of [
      page.id,
      page.species,
      requiredWarning,
      'Back to cockpit index',
      'source quick review',
      'source packet',
      'acceptance packet',
      'Commands',
      'npm run content:review-cockpit',
      'npm run content:review-cockpit-check',
    ]) {
      if (!html.includes(expected)) failures.push(`${page.id}: missing ${expected}`);
    }

    const imgSrcs = attrValues(html, 'src').filter((src) => src.endsWith('.png') || src.endsWith('.jpg') || src.endsWith('.jpeg') || src.endsWith('.webp'));
    if (imgSrcs.length !== page.mediaCount) {
      failures.push(`${page.id}: page image count ${imgSrcs.length} does not match manifest mediaCount ${page.mediaCount}`);
    }
    for (const label of page.mediaLabels ?? []) {
      if (!html.includes(`alt="${label}"`) && !html.includes(`>${label}</span>`)) failures.push(`${page.id}: missing media label ${label}`);
    }
    for (const src of imgSrcs) {
      const result = await fetchOk(absoluteUrl(pageUrl, src), 256);
      checkedImages += 1;
      if (!result.ok) failures.push(`${page.id}: evidence image ${src} returned ${result.status} with ${result.bytes} bytes`);
    }

    const hrefs = attrValues(html, 'href');
    const expectedQuickReview = `/review/source-candidates/quick-reviews/${page.id}.html`;
    const expectedSourceSandbox = `/?entity=source-${page.id}&companion=diver`;
    if (!hrefs.includes(expectedQuickReview)) failures.push(`${page.id}: missing exact quick review link ${expectedQuickReview}`);
    if (!hrefs.includes(expectedSourceSandbox)) failures.push(`${page.id}: missing exact source sandbox link ${expectedSourceSandbox}`);
    if (!Array.isArray(page.media) || !page.media.length) failures.push(`${page.id}: manifest missing detailed media entries`);
    for (const media of page.media ?? []) {
      if (media.present && !media.url) failures.push(`${page.id}: present manifest media ${media.label ?? 'unknown'} missing URL`);
      if (media.url && !html.includes(media.url.replaceAll('&', '&amp;')) && !html.includes(media.url)) {
        failures.push(`${page.id}: page missing manifest media URL ${media.url}`);
      }
    }

    if ((page.mediaLabels ?? []).includes('sandbox idle')) {
      const runtimeId = page.links?.sideBySideSandbox?.match(/sandbox=([^&]+)/)?.[1] ?? page.id;
      const expectedSideBySide = `/?sandbox=${runtimeId}&companion=diver`;
      if (!hrefs.includes(expectedSideBySide)) failures.push(`${page.id}: missing exact side-by-side sandbox link ${expectedSideBySide}`);
      if (!html.includes(`npm run sandbox:preview -- --id ${runtimeId} --with diver`)) {
        failures.push(`${page.id}: missing paired sandbox preview command for ${runtimeId}`);
      }
      if (!html.includes(`npm run sandbox:visual -- --ids ${runtimeId}`) || !html.includes('--with diver')) {
        failures.push(`${page.id}: missing paired sandbox visual command for ${runtimeId}`);
      }
    }
  }
} catch (error) {
  failures.push(error.message);
} finally {
  await stop(child);
}

const summary = {
  schema: 'water9/content-review-cockpit-preview-smoke@1',
  baseUrl,
  manifest: manifestPath,
  checkedPages,
  checkedImages,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
