import { spawn } from 'node:child_process';

function readUrl(child) {
  let buffer = '';
  return new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('timed out waiting for content workbench URL')), 15000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/URL:\s+(http:\/\/127\.0\.0\.1:\d+\/review\/content-workbench\.html)/);
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
        rejectUrl(new Error(`content workbench preview exited early with code ${code}\n${buffer}`));
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
  'tools/preview_content_workbench.mjs',
  '--serve',
  '--no-build',
  '--port',
  '5188',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  const url = await readUrl(child);
  const response = await fetch(url);
  if (!response.ok) failures.push(`served workbench returned HTTP ${response.status}`);
  const html = await response.text();
  for (const expected of [
    'Water 9 Content Workbench',
    'npm run sandbox:preview -- --id diver --serve --open --visual',
    'npm run sandbox:preview -- --id abyssal-gulper --with diver --serve --open --visual',
    '/?sandbox=abyssal-gulper&amp;companion=diver',
    'npm run content:gate',
    'source-review-needed',
    'content-rigging-sprint.html',
    'source-inbox/index.html',
  ]) {
    if (!html.includes(expected)) failures.push(`served workbench HTML is missing: ${expected}`);
  }
  console.log(JSON.stringify({
    schema: 'water9/content-workbench-preview-smoke@1',
    url,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/content-workbench-preview-smoke@1',
    url: null,
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await stop(child);
}

if (failures.length) process.exitCode = 1;
