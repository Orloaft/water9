import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

async function readSprint() {
  return JSON.parse(await readFile('public/review/content-rigging-sprint.json', 'utf8'));
}

function readUrl(child) {
  let buffer = '';
  return new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('timed out waiting for rigging sprint URL')), 15000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/URL:\s+(http:\/\/127\.0\.0\.1:\d+\/review\/content-rigging-sprint\.html(?:#[^\s]+)?)/);
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
        rejectUrl(new Error(`rigging sprint preview exited early with code ${code}\n${buffer}`));
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

const failures = [];
const child = spawn(process.execPath, [
  'tools/preview_content_rigging_sprint.mjs',
  '--serve',
  '--no-build',
  '--port',
  '5194',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});

try {
  const sprint = await readSprint();
  const first = sprint.items?.[0] ?? {};
  const url = await readUrl(child);
  const response = await fetch(url);
  if (!response.ok) failures.push(`served rigging sprint returned HTTP ${response.status}`);
  const html = await response.text();
  for (const expected of [
    'Water 9 Rigging Sprint',
    'Missing runtime registration handoff',
    'Production Rigging Path',
    'Mechanical Dry Run Only',
    first.id,
    first.species,
    `id="${first.id}"`,
    `data-rigging-sprint-candidate="${first.id}"`,
    htmlEscape(first.commands?.productionPreparePlan),
    htmlEscape(first.commands?.mechanicalDryRunPreparePlan),
    htmlEscape(first.commands?.runtimeVisual),
  ].filter(Boolean)) {
    if (!html.includes(expected)) failures.push(`served rigging sprint HTML is missing: ${expected}`);
  }
  console.log(JSON.stringify({
    schema: 'water9/content-rigging-sprint-preview-smoke@1',
    url,
    first: first.id ?? null,
    sprintSize: sprint.items?.length ?? 0,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/content-rigging-sprint-preview-smoke@1',
    url: null,
    first: null,
    sprintSize: 0,
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await stop(child);
}

if (failures.length) process.exitCode = 1;
