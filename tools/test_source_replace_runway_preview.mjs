import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

async function readRunway() {
  return JSON.parse(await readFile('public/review/source-candidates/source-replace-runway.json', 'utf8'));
}

function readUrl(child) {
  let buffer = '';
  return new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('timed out waiting for source replace runway URL')), 15000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/URL:\s+(http:\/\/127\.0\.0\.1:\d+\/review\/source-candidates\/source-replace-runway\.html)/);
      if (!match) return;
      clearTimeout(timer);
      resolveUrl(match[1]);
    });
    child.stderr.on('data', (chunk) => { buffer += chunk.toString(); });
    child.once('error', (error) => {
      clearTimeout(timer);
      rejectUrl(error);
    });
    child.once('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timer);
        rejectUrl(new Error(`source replace runway preview exited early with code ${code}\n${buffer}`));
      }
    });
  });
}

async function stop(child) {
  if (child.exitCode !== null) return;
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

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function includesHtml(html, value) {
  return html.includes(value) || html.includes(htmlEscape(value));
}

const failures = [];
const runway = await readRunway();
const first = runway.recommended ?? runway.items?.find((item) => item.replaceable) ?? runway.items?.[0] ?? {};
const child = spawn(process.execPath, [
  'tools/preview_source_replace_runway.mjs',
  '--serve',
  '--no-build',
  '--port',
  '5198',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});

try {
  const url = await readUrl(child);
  const response = await fetch(url);
  if (!response.ok) failures.push(`served source replace runway returned HTTP ${response.status}`);
  const html = await response.text();
  for (const expected of [
    'Water 9 Source Replace Runway',
    'intentional overwrite',
    'rejects byte-identical no-op replacements',
    'does not approve source art',
    'Replacement Boundary',
    'data-source-replace-candidate',
    first.id,
    first.species,
    first.promptFile,
    first.links?.source,
    first.links?.keyPreview,
    first.links?.sandboxScreenshot,
    first.links?.planPreview,
    first.commands?.captureReplacement,
    first.commands?.validateInbox,
    first.commands?.dryRunReplace,
    first.commands?.applyReplace,
    first.commands?.imageCheck,
    first.commands?.sourcePreview,
    '--overwrite',
    '--allow-identical-overwrite',
    '--dry-run',
    '/review/source-approval-runway.html',
    '/review/source-visual-board.html',
  ].filter(Boolean)) {
    if (!includesHtml(html, expected)) failures.push(`served source replace runway HTML is missing: ${expected}`);
  }
  if (html.includes('npm run source:accept')) failures.push('replace runway preview must not render source acceptance commands');
  console.log(JSON.stringify({
    schema: 'water9/source-replace-runway-preview-smoke@1',
    url,
    first: first.id ?? null,
    candidates: runway.items?.length ?? 0,
    replaceable: runway.summary?.replaceable ?? 0,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/source-replace-runway-preview-smoke@1',
    url: null,
    first: first.id ?? null,
    candidates: runway.items?.length ?? 0,
    replaceable: runway.summary?.replaceable ?? 0,
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await stop(child);
}

if (failures.length) process.exitCode = 1;
