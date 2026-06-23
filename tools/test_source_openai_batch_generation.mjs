import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const fixture = resolve('public/assets/generated/fauna-brine-crown-whole-source.png');
const script = 'tools/generate_source_batch_openai.mjs';
const runbook = JSON.parse(await readFile(resolve('public/review/source-candidates/source-acquisition-runbook.json'), 'utf8'));
const ids = (runbook.ids ?? []).slice(0, 2);
if (ids.length < 1) {
  console.log(JSON.stringify({
    schema: 'water9/source-openai-batch-generation-smoke@1',
    generated: 0,
    ids: [],
    skipped: true,
    reason: 'source acquisition runbook has no active target ids',
    failures: [],
  }, null, 2));
  process.exit(0);
}
const idArg = ids.join(',');

const dir = await mkdtemp(join(tmpdir(), 'water9-openai-batch-'));
try {
  const dry = spawnSync(process.execPath, [
    script,
    '--ids', idArg,
    '--inbox-dir', join(dir, 'inbox'),
    '--report', join(dir, 'dry-report.json'),
  ], {
    cwd: root,
    encoding: 'utf8',
  });
  if (dry.status !== 0) throw new Error(`batch dry-run failed: ${dry.stderr || dry.stdout}`);
  const dryPayload = JSON.parse(dry.stdout);
  if (dryPayload.readyToApply !== true || dryPayload.results?.length !== ids.length) throw new Error(`batch dry-run payload mismatch: ${dry.stdout}`);

  const mock = spawnSync(process.execPath, [
    script,
    '--ids', idArg,
    '--inbox-dir', join(dir, 'inbox'),
    '--report', join(dir, 'mock-report.json'),
    '--mock-image', fixture,
    '--apply',
  ], {
    cwd: root,
    encoding: 'utf8',
  });
  if (mock.status !== 0) throw new Error(`batch mock generation failed: ${mock.stderr || mock.stdout}`);
  const payload = JSON.parse(mock.stdout);
  if (payload.generated !== ids.length) throw new Error(`batch mock generated count mismatch: ${mock.stdout}`);
  for (const id of ids) {
    const target = join(dir, 'inbox', `${id}.png`);
    const info = await stat(target);
    if (info.size < 512) throw new Error(`${id}: batch mock target image was not written`);
  }
  console.log(JSON.stringify({
    schema: 'water9/source-openai-batch-generation-smoke@1',
    generated: payload.generated,
    ids,
    failures: [],
  }, null, 2));
} finally {
  await rm(dir, { recursive: true, force: true });
}
