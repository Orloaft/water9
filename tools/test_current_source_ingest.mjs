import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

const queue = await readJson('public/review/source-candidates/source-generation-queue.json', { candidates: [] });
const targetId = queue.candidates?.[0]?.id ?? 'glass-sponge-sentinel';
const dir = await mkdtemp(join(tmpdir(), 'water9-current-ingest-'));
try {
  const reportPath = join(dir, 'report.json');
  const result = spawnSync(process.execPath, [
    'tools/ingest_current_source_target.mjs',
    '--id',
    targetId,
    '--dir',
    join(dir, 'empty-inbox'),
    '--report',
    reportPath,
    '--dry-run',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (result.status === 0) throw new Error('current source ingest unexpectedly passed with an empty inbox');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const failures = [];
  if (report.schema !== 'water9/current-source-ingest@1') failures.push(`unexpected schema ${report.schema ?? 'missing'}`);
  if (report.targetId !== targetId) failures.push(`unexpected target ${report.targetId ?? 'missing'}`);
  if (report.status !== 'missing-inbox-image') failures.push(`unexpected status ${report.status ?? 'missing'}`);
  if (!report.expectedInboxFiles?.some((file) => file.endsWith(`${targetId}.png`))) failures.push('missing primary inbox filename');
  if (!report.next?.includes(`npm run source:inbox-capture -- --id ${targetId} --open`)) failures.push('missing target-aware capture next command');
  if (!report.next?.includes(`npm run source:ingest-current -- --id ${targetId} --apply`)) failures.push('missing apply next command');
  if (failures.length) {
    console.error(JSON.stringify({
      schema: 'water9/current-source-ingest-smoke@1',
      report: resolve(reportPath),
      failures,
    }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({
    schema: 'water9/current-source-ingest-smoke@1',
    target: report.targetId,
    status: report.status,
    failures: [],
  }, null, 2));
} finally {
  await rm(dir, { recursive: true, force: true });
}
