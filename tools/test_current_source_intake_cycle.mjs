import { copyFile, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const captureScript = resolve('tools/source_inbox_capture_server.mjs');
const fixtureImage = resolve('public/assets/generated/fauna-brine-crown-whole-source.png');

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readFirstJsonLine(child) {
  let buffer = '';
  return new Promise((resolveLine, rejectLine) => {
    const timer = setTimeout(() => rejectLine(new Error('timed out waiting for current capture server JSON line')), 8000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      clearTimeout(timer);
      const line = buffer.slice(0, newline).trim();
      try {
        resolveLine(JSON.parse(line));
      } catch (error) {
        rejectLine(new Error(`could not parse current capture server JSON line: ${error.message}: ${line}`));
      }
    });
    child.once('error', rejectLine);
    child.once('exit', (code) => {
      if (code !== null && code !== 0) rejectLine(new Error(`current capture server exited early with code ${code}`));
    });
  });
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
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

const nextAction = await readJson('public/review/content-next-action.json', { nextAction: {} });
const sourceQueue = await readJson('public/review/source-candidates/source-generation-queue.json', { candidates: [] });
const queueIds = new Set((sourceQueue.candidates ?? []).map((candidate) => candidate.id).filter(Boolean));
const nextActionTarget = nextAction.nextAction?.targetId ?? null;
const targetId = (nextActionTarget && queueIds.has(nextActionTarget) ? nextActionTarget : null)
  ?? sourceQueue.candidates?.[0]?.id
  ?? null;
const failures = [];
if (!targetId) {
  console.log(JSON.stringify({
    schema: 'water9/current-source-intake-cycle-smoke@1',
    targetId: null,
    skipped: true,
    reason: 'source generation queue has no active target ids',
    failures: [],
  }, null, 2));
  process.exit(0);
}

const dir = await mkdtemp(join(tmpdir(), 'water9-current-source-cycle-'));
const inbox = join(dir, 'source-inbox');
const scratch = join(dir, 'scratch');
const reportPath = join(dir, 'current-ingest-report.json');
let child = null;
try {
  if (!failures.length) {
    child = spawn(process.execPath, [
      captureScript,
      '--port', '0',
      '--json',
      '--id', targetId,
      '--target-dir', inbox,
      '--scratch-dir', scratch,
    ], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const server = await readFirstJsonLine(child);
    if (!server.selectedUrl?.includes(`id=${encodeURIComponent(targetId)}`)) {
      failures.push(`capture server did not select current target ${targetId}`);
    }

    const fixture = join(dir, `${targetId}.png`);
    await copyFile(fixtureImage, fixture);
    const data = await readFile(fixture);
    const response = await fetch(`${server.url}api/upload`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: targetId,
        filename: `${targetId}.png`,
        dataUrl: `data:image/png;base64,${data.toString('base64')}`,
      }),
    });
    const upload = await response.json();
    if (!response.ok || !upload.ok) {
      failures.push(`capture upload failed: ${JSON.stringify(upload)}`);
    }
    const inboxFile = join(inbox, `${targetId}.png`);
    const info = await stat(inboxFile).catch(() => null);
    if (!info?.isFile() || info.size !== data.length) failures.push('capture upload did not write expected inbox file');

    const ingest = spawnSync(process.execPath, [
      'tools/ingest_current_source_target.mjs',
      '--id', targetId,
      '--dir', inbox,
      '--report', reportPath,
      '--dry-run',
    ], {
      cwd: root,
      encoding: 'utf8',
    });
    const ingestReport = JSON.parse(await readFile(reportPath, 'utf8'));
    if (ingest.status !== 0) failures.push(`current ingest dry-run exited ${ingest.status}: ${ingest.stderr || ingest.stdout}`);
    if (ingestReport.schema !== 'water9/current-source-ingest@1') failures.push(`unexpected ingest schema ${ingestReport.schema ?? 'missing'}`);
    if (ingestReport.targetId !== targetId) failures.push(`ingest target ${ingestReport.targetId ?? 'missing'} did not match ${targetId}`);
    if (ingestReport.status !== 'ready-to-ingest') failures.push(`ingest status ${ingestReport.status ?? 'missing'} was not ready-to-ingest`);
    if (!ingestReport.batchReport?.ingested?.some((item) => item.id === targetId)) {
      failures.push('batch report did not include current target in dry-run ingest list');
    }
  }

  const summary = {
    schema: 'water9/current-source-intake-cycle-smoke@1',
    targetId,
    failures,
  };
  if (failures.length) {
    console.error(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
} finally {
  await stop(child);
  await rm(dir, { recursive: true, force: true });
}
