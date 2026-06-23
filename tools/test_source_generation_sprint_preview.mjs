import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

async function readSprint() {
  return JSON.parse(await readFile('public/review/source-candidates/source-generation-sprint.json', 'utf8'));
}

function readUrl(child) {
  let buffer = '';
  return new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('timed out waiting for source generation sprint URL')), 15000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/URL:\s+(http:\/\/127\.0\.0\.1:\d+\/review\/source-candidates\/source-generation-sprint\.html)/);
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
        rejectUrl(new Error(`source generation sprint preview exited early with code ${code}\n${buffer}`));
      }
    });
  });
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolveStop) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolveStop();
    }, 1500);
    child.once('exit', () => {
      clearTimeout(timer);
      resolveStop();
    });
  });
}

const failures = [];
const child = spawn(process.execPath, [
  'tools/preview_source_generation_sprint.mjs',
  '--serve',
  '--no-build',
  '--port',
  '5189',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  const sprint = await readSprint();
  const first = sprint.candidates?.[0] ?? {};
  const url = await readUrl(child);
  const response = await fetch(url);
  if (!response.ok) failures.push(`served sprint returned HTTP ${response.status}`);
  const html = await response.text();
  for (const expected of [
    'Source Generation Sprint',
    first.species,
    first.id,
    sprint.commands?.autoIngestFirstSession,
    sprint.commands?.inboxIngest,
    first.inboxTarget,
    '#ff00ff',
  ].filter(Boolean)) {
    if (!html.includes(expected)) failures.push(`served sprint HTML is missing: ${expected}`);
  }
  for (const id of sprint.ids ?? []) {
    if (!html.includes(id)) failures.push(`served sprint HTML is missing sprint id: ${id}`);
  }
  console.log(JSON.stringify({
    schema: 'water9/source-generation-sprint-preview-smoke@1',
    url,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/source-generation-sprint-preview-smoke@1',
    url: null,
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await stop(child);
}

if (failures.length) process.exitCode = 1;
