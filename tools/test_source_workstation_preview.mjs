import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

async function readWorkstation() {
  return JSON.parse(await readFile('public/review/source-candidates/source-workstation.json', 'utf8'));
}

function readUrl(child) {
  let buffer = '';
  return new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('timed out waiting for source workstation URL')), 15000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/URL:\s+(http:\/\/127\.0\.0\.1:\d+\/review\/source-candidates\/source-workstation\.html)/);
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
        rejectUrl(new Error(`source workstation preview exited early with code ${code}\n${buffer}`));
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
  'tools/preview_source_workstation.mjs',
  '--serve',
  '--no-build',
  '--port',
  '5191',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  const workstation = await readWorkstation();
  const target = workstation.target ?? {};
  const url = await readUrl(child);
  const response = await fetch(url);
  if (!response.ok) failures.push(`served workstation returned HTTP ${response.status}`);
  const html = await response.text();
  for (const expected of [
    'Source Workstation',
    target.species,
    target.id,
    target.doctorStatus,
    `tools/source-inbox/${target.id}.png`,
    `tools/source-inbox/fauna-${target.id}-whole-source.png`,
    'Generation Prompt',
    'Required Read',
    'Recent Rejections',
    'Manual Capture Escalation',
    'manual capture',
    'no more inline retries',
    'npm run source:inbox-capture',
    `npm run source:inbox-capture -- --id ${target.id} --open`,
    `npm run source:recover-inline -- --id ${target.id} --image &lt;saved-image-path&gt; --copy --validate`,
    `http://127.0.0.1:5188/?id=${target.id}`,
    `npm run source:ingest-current -- --id ${target.id} --dry-run`,
    `npm run source:ingest-current -- --id ${target.id} --apply`,
    `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${target.id}`,
    '#ff00ff',
  ].filter(Boolean)) {
    if (!html.includes(expected)) failures.push(`served workstation HTML is missing: ${expected}`);
  }
  console.log(JSON.stringify({
    schema: 'water9/source-workstation-preview-smoke@1',
    url,
    target: target.id ?? null,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/source-workstation-preview-smoke@1',
    url: null,
    target: null,
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await stop(child);
}

if (failures.length) process.exitCode = 1;
