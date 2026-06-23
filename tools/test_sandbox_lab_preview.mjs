import { spawn, spawnSync } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright';

function readUrl(child) {
  let buffer = '';
  return new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('timed out waiting for sandbox lab URL')), 15000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/URL:\s+(http:\/\/127\.0\.0\.1:\d+\/review\/sandbox\/lab\.html[^\s]*)/);
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
        rejectUrl(new Error(`sandbox lab preview exited early with code ${code}\n${buffer}`));
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
      // Try the next system browser candidate.
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

const failures = [];

function runLabJson(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, ['tools/preview_sandbox_lab.mjs', '--json', '--no-build', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== expectedStatus) {
    failures.push(`sandbox lab json ${args.join(' ')} exited ${result.status}, expected ${expectedStatus}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    return null;
  }
  try {
    return JSON.parse((result.stdout || result.stderr || '').trim());
  } catch (error) {
    failures.push(`sandbox lab json ${args.join(' ')} did not return JSON: ${error.message}`);
    return null;
  }
}

const aliasPayload = runLabJson(['--id', 'gulper', '--with', 'diver']);
if (aliasPayload) {
  if (aliasPayload.selectedId !== 'abyssal-gulper') failures.push(`lab alias selected ${aliasPayload.selectedId}, expected abyssal-gulper`);
  if (aliasPayload.resolutionMethod !== 'curated-alias') failures.push(`lab alias resolutionMethod was ${aliasPayload.resolutionMethod}`);
  if (aliasPayload.resolvedByAlias !== true) failures.push('lab alias should report resolvedByAlias true');
  if (!String(aliasPayload.relativeUrl ?? '').includes('?id=abyssal-gulper&with=diver')) failures.push(`lab alias relativeUrl was ${aliasPayload.relativeUrl}`);
}

const badPayload = runLabJson(['--id', 'gulperzz'], 1);
if (badPayload) {
  if (badPayload.found !== false) failures.push('lab bad id should report found false');
  if (!Array.isArray(badPayload.suggestions) || !badPayload.suggestions.length) failures.push('lab bad id should report suggestions');
  if (badPayload.selectedId === 'abyssal-gulper') failures.push('lab bad id silently fell back to abyssal-gulper');
}

const child = spawn(process.execPath, [
  'tools/preview_sandbox_lab.mjs',
  '--serve',
  '--no-build',
  '--port',
  '5179',
  '--id',
  'abyssal-gulper',
  '--with',
  'diver',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});

try {
  const url = await readUrl(child);
  const response = await fetch(url);
  if (!response.ok) failures.push(`served sandbox lab returned HTTP ${response.status}`);
  const html = await response.text();
  for (const expected of [
    'Water 9 Sandbox Lab',
    'data-sandbox-lab',
    'data-entity-select',
    'data-with-diver',
    'data-preview-frame',
    'data-new-threat-pipeline',
    'New Threat Pipeline',
    'runtime missing',
    'data-pipeline-next-action',
    'abyssal-gulper',
    'npm run sandbox:preview -- --id abyssal-gulper --with diver',
  ]) {
    if (!html.includes(expected)) failures.push(`served sandbox lab HTML is missing: ${expected}`);
  }

  let browser = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-preview-frame]');
    const frameSrc = await page.getAttribute('[data-preview-frame]', 'src');
    if (!String(frameSrc ?? '').includes('?sandbox=abyssal-gulper&companion=diver')) {
      failures.push(`initial lab iframe src is wrong: ${frameSrc ?? 'missing'}`);
    }
    const previewCommand = await page.inputValue('[data-preview-command]');
    if (!previewCommand.includes('npm run sandbox:preview -- --id abyssal-gulper --with diver')) {
      failures.push(`initial preview command is wrong: ${previewCommand}`);
    }
    const visualCommand = await page.inputValue('[data-visual-command]');
    if (!visualCommand.includes('npm run sandbox:visual -- --ids abyssal-gulper --states idle,lunge,stunned --with diver')) {
      failures.push(`initial visual command is wrong: ${visualCommand}`);
    }
    const pipelineNextAction = await page.inputValue('[data-pipeline-next-action]');
    if (!pipelineNextAction.includes('No strict content-pipeline action') && !pipelineNextAction.includes('npm run')) {
      failures.push(`initial pipeline next action is wrong: ${pipelineNextAction}`);
    }
    await page.selectOption('[data-entity-select]', 'source-hadal-trencher-isopod');
    const sourcePipelineStage = await page.textContent('[data-pipeline-stage]');
    if (!String(sourcePipelineStage ?? '').includes('prototype-needs-approved-source')) {
      failures.push(`source candidate pipeline stage is wrong: ${sourcePipelineStage ?? 'missing'}`);
    }
    const sourcePipelineRuntime = await page.textContent('[data-pipeline-runtime]');
    if (!String(sourcePipelineRuntime ?? '').includes('registered')) {
      failures.push(`source candidate runtime status is wrong: ${sourcePipelineRuntime ?? 'missing'}`);
    }
    const sourcePipelineSource = await page.textContent('[data-pipeline-source]');
    if (!String(sourcePipelineSource ?? '').includes('needs review')) {
      failures.push(`source candidate source status is wrong: ${sourcePipelineSource ?? 'missing'}`);
    }
    await page.selectOption('[data-entity-select]', 'diver');
    const diverFrameSrc = await page.getAttribute('[data-preview-frame]', 'src');
    if (!String(diverFrameSrc ?? '').includes('?entity=diver')) failures.push(`diver iframe src is wrong: ${diverFrameSrc ?? 'missing'}`);
    if (String(diverFrameSrc ?? '').includes('companion=diver')) failures.push(`diver iframe should not pair itself: ${diverFrameSrc}`);
  } catch (error) {
    failures.push(`sandbox lab browser smoke failed: ${error.message}`);
  } finally {
    await browser?.close();
  }

  console.log(JSON.stringify({
    schema: 'water9/sandbox-lab-preview-smoke@1',
    url,
    failures,
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  console.error(JSON.stringify({
    schema: 'water9/sandbox-lab-preview-smoke@1',
    url: null,
    failures,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await stop(child);
}

if (failures.length) process.exitCode = 1;
