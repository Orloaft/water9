import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const fixtureImage = resolve('public/assets/generated/fauna-brine-crown-whole-source.png');
const runbook = JSON.parse(await readFile(resolve('public/review/source-candidates/source-acquisition-runbook.json'), 'utf8'));
const targetId = runbook.ids?.[0];
if (!targetId) {
  console.log(JSON.stringify({
    schema: 'water9/source-advance-inbox-smoke@1',
    ok: true,
    skipped: true,
    reason: 'source acquisition runbook has no active target ids',
  }, null, 2));
  process.exit(0);
}

async function withFixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'water9-source-advance-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function run(command) {
  return spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

function parseJson(output) {
  const start = output.indexOf('{');
  if (start < 0) throw new Error(`No JSON object in output:\n${output}`);
  return JSON.parse(output.slice(start));
}

await withFixture(async (dir) => {
  const inbox = join(dir, 'inbox');
  const reportPath = join(dir, 'advance-report.json');
  await copyFile(fixtureImage, join(dir, `${targetId}.png`));
  await rm(inbox, { recursive: true, force: true }).catch(() => {});
  await copyFile(fixtureImage, join(dir, `${targetId}.png`));

  const result = run([
    process.execPath,
    'tools/advance_source_sprint_inbox.mjs',
    '--ids', targetId,
    '--inbox-dir', dir,
    '--report', reportPath,
  ]);
  if (result.status !== 0) {
    throw new Error(`source advance inbox smoke failed:\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  const summary = parseJson(result.stdout);
  if (summary.schema !== 'water9/source-advance-inbox@1') throw new Error(`Unexpected schema ${summary.schema}`);
  if (summary.status !== 'ready-to-apply') throw new Error(`Expected ready-to-apply status, got ${summary.status}`);
  if (!summary.steps.some((step) => step.name === 'inbox-check' && step.ok)) throw new Error('Missing successful inbox-check step');
  if (!summary.steps.some((step) => step.name === 'ingest-dry-run' && step.ok)) throw new Error('Missing successful ingest-dry-run step');
  if (!summary.next.some((command) => command.includes('source:advance-inbox') && command.includes('--apply'))) {
    throw new Error('Missing apply next command');
  }
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  if (report.status !== 'ready-to-apply') throw new Error(`Report status mismatch ${report.status}`);
});

await withFixture(async (dir) => {
  const reportPath = join(dir, 'missing-report.json');
  const result = run([
    process.execPath,
    'tools/advance_source_sprint_inbox.mjs',
    '--ids', targetId,
    '--inbox-dir', dir,
    '--report', reportPath,
  ]);
  if (result.status === 0) throw new Error('Missing inbox image should block advance command');
  const summary = parseJson(result.stderr);
  if (summary.status !== 'blocked') throw new Error(`Expected blocked status, got ${summary.status}`);
  if (!summary.failures.some((failure) => failure.includes('inbox-check failed'))) {
    throw new Error(`Missing inbox-check failure in ${JSON.stringify(summary.failures)}`);
  }
});

console.log(JSON.stringify({
  schema: 'water9/source-advance-inbox-smoke@1',
  ok: true,
}, null, 2));
