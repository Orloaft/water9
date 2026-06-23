import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

const nextAction = await readJson('public/review/content-next-action.json', { nextAction: {} });
const sourceQueue = await readJson('public/review/source-candidates/source-generation-queue.json', { candidates: [] });
const queueIds = new Set((sourceQueue.candidates ?? []).map((candidate) => candidate.id).filter(Boolean));
const nextActionTarget = nextAction.nextAction?.targetId ?? null;
const expectedId = (nextActionTarget && queueIds.has(nextActionTarget) ? nextActionTarget : null)
  ?? sourceQueue.candidates?.[0]?.id
  ?? nextActionTarget
  ?? null;
const failures = [];
if (!expectedId) failures.push('no current source capture target is available');

const result = spawnSync(process.execPath, ['tools/current_source_capture.mjs', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});
let report = null;
try {
  report = JSON.parse(result.stdout);
} catch (error) {
  failures.push(`could not parse current source capture JSON: ${error.message}`);
}
if (result.status !== 0) failures.push(`current source capture exited ${result.status}: ${result.stderr || result.stdout}`);
if (report?.schema !== 'water9/current-source-capture@1') failures.push(`unexpected schema ${report?.schema ?? 'missing'}`);
if (expectedId && report?.targetId !== expectedId) failures.push(`targetId ${report?.targetId ?? 'missing'} did not match expected ${expectedId}`);
if (expectedId && !String(report?.url ?? '').includes(`id=${encodeURIComponent(expectedId)}`)) failures.push('capture URL is not target-aware');
if (expectedId && report?.inboxTarget !== `tools/source-inbox/${expectedId}.png`) failures.push('inbox target is not target-aware');
if (expectedId && !String(report?.command ?? '').includes(`--id ${expectedId}`)) failures.push('server command is not target-aware');
if (!Array.isArray(report?.next) || !report.next.some((command) => String(command).includes('source:ingest-current'))) {
  failures.push('next commands must include current-source ingest');
}

const summary = {
  schema: 'water9/current-source-capture-smoke@1',
  targetId: report?.targetId ?? null,
  expectedId,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
