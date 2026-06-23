import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

async function readRunway() {
  return JSON.parse(await readFile('public/review/content-acceptance-runway.json', 'utf8'));
}

function readUrl(child) {
  let buffer = '';
  return new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('timed out waiting for acceptance runway URL')), 15000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/URL:\s+(http:\/\/127\.0\.0\.1:\d+\/review\/content-acceptance-runway\.html(?:#[^\s]+)?)/);
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
        rejectUrl(new Error(`acceptance runway preview exited early with code ${code}\n${buffer}`));
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
const child = spawn(process.execPath, [
  'tools/preview_content_acceptance_runway.mjs',
  '--serve',
  '--no-build',
  '--port',
  '5193',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});

try {
  const runway = await readRunway();
  const recommended = runway.recommendedByStage?.[runway.summary?.nextBottleneck] ?? Object.values(runway.recommendedByStage ?? {})[0] ?? runway.items?.[0] ?? {};
  const recommendedItem = runway.items?.find((item) => item.id === recommended.id) ?? recommended;
  const runtimeId = recommendedItem.runtimeId ?? recommendedItem.id;
  const expectedPreviewCommand = `npm run sandbox:preview -- --id ${runtimeId} --with diver --serve --open --visual`;
  const expectedVisualCommand = `npm run sandbox:visual -- --ids ${runtimeId} --states idle,lunge,stunned --with diver`;
  const expectedAcceptCommandPrefix = `npm run content:accept -- --id ${runtimeId}`;
  const url = await readUrl(child);
  const response = await fetch(url);
  if (!response.ok) failures.push(`served acceptance runway returned HTTP ${response.status}`);
  const html = await response.text();
  for (const expected of [
    'Water 9 Acceptance Runway',
    'Recommended By Stage',
    'Unmapped Prototype Migration',
    'npm run content:acceptance-runway',
    'npm run content:acceptance-runway-check',
    'npm run content:gate',
    'npm run sandbox:preview',
    'npm run content:accept',
    recommended.id,
    recommended.species,
    `id="${recommended.id}"`,
    `data-acceptance-candidate="${recommended.id}"`,
    htmlEscape(recommended.nextAction),
    recommendedItem.sandboxUrl,
    expectedPreviewCommand,
    expectedVisualCommand,
    expectedAcceptCommandPrefix,
    '--sandbox-reviewed',
    '--parity-reviewed',
  ].filter(Boolean)) {
    if (!includesHtml(html, expected)) failures.push(`served acceptance runway HTML is missing: ${expected}`);
  }
  console.log(JSON.stringify({
    schema: 'water9/content-acceptance-runway-preview-smoke@1',
    url,
    recommended: recommended.id ?? null,
    candidates: runway.items?.length ?? 0,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/content-acceptance-runway-preview-smoke@1',
    url: null,
    recommended: null,
    candidates: 0,
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await stop(child);
}

if (failures.length) process.exitCode = 1;
