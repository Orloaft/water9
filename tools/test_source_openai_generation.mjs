import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const fixture = resolve('public/assets/generated/fauna-brine-crown-whole-source.png');
const script = 'tools/generate_source_image_openai.mjs';
const runbook = JSON.parse(await readFile(resolve('public/review/source-candidates/source-acquisition-runbook.json'), 'utf8'));
const targetId = runbook.ids?.[0];
if (!targetId) {
  console.log(JSON.stringify({
    schema: 'water9/source-openai-generation-smoke@1',
    id: null,
    skipped: true,
    reason: 'source acquisition runbook has no active target ids',
    failures: [],
  }, null, 2));
  process.exit(0);
}

const dir = await mkdtemp(join(tmpdir(), 'water9-openai-source-'));
try {
  const dry = spawnSync(process.execPath, [
    script,
    '--id', targetId,
    '--inbox-dir', join(dir, 'inbox'),
    '--report', join(dir, 'dry-report.json'),
  ], {
    cwd: root,
    encoding: 'utf8',
  });
  if (dry.status !== 0) throw new Error(`dry-run failed: ${dry.stderr || dry.stdout}`);
  const dryPayload = JSON.parse(dry.stdout);
  if (dryPayload.status !== 'dry-run') throw new Error(`dry-run status mismatch: ${dry.stdout}`);
  if (dryPayload.requestPreview?.body?.model !== 'gpt-image-2') throw new Error('dry-run did not expose gpt-image-2 request preview');

  const mock = spawnSync(process.execPath, [
    script,
    '--id', targetId,
    '--inbox-dir', join(dir, 'inbox'),
    '--report', join(dir, 'mock-report.json'),
    '--mock-image', fixture,
    '--apply',
  ], {
    cwd: root,
    encoding: 'utf8',
  });
  if (mock.status !== 0) throw new Error(`mock generation failed: ${mock.stderr || mock.stdout}`);
  const payload = JSON.parse(mock.stdout);
  if (payload.status !== 'generated') throw new Error(`mock generation status mismatch: ${mock.stdout}`);
  if (!payload.next?.some((command) => command.includes('source:ingest-batch'))) throw new Error('mock generation did not include ingest next command');
  const target = join(dir, 'inbox', `${targetId}.png`);
  const info = await stat(target);
  if (info.size < 512) throw new Error('mock target image was not written');

  console.log(JSON.stringify({
    schema: 'water9/source-openai-generation-smoke@1',
    id: targetId,
    target,
    bytes: info.size,
    failures: [],
  }, null, 2));
} finally {
  await rm(dir, { recursive: true, force: true });
}
