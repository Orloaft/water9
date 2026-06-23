import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const queuePath = resolve('public/review/source-candidates/source-critic-regeneration-queue.json');
const script = 'tools/generate_source_image_openai.mjs';
const queue = JSON.parse(await readFile(queuePath, 'utf8'));
const candidates = Array.isArray(queue.candidates) ? queue.candidates : [];
const failures = [];
const results = [];

if (queue.schema !== 'water9/source-critic-regeneration-queue@1') {
  failures.push(`unexpected queue schema ${queue.schema ?? 'missing'}`);
}
if (candidates.length < 1) {
  failures.push('critic regeneration queue has no candidates');
}

const dir = await mkdtemp(join(tmpdir(), 'water9-critic-regeneration-openai-'));
try {
  for (const candidate of candidates) {
    const report = join(dir, `${candidate.id}-dry-run.json`);
    const run = spawnSync(process.execPath, [
      script,
      '--id', candidate.id,
      '--queue', queuePath,
      '--inbox-dir', join(dir, 'inbox'),
      '--report', report,
      '--overwrite',
    ], {
      cwd: root,
      encoding: 'utf8',
    });

    if (run.status !== 0) {
      failures.push(`${candidate.id}: dry-run failed: ${run.stderr || run.stdout}`);
      continue;
    }

    let payload = null;
    try {
      payload = JSON.parse(run.stdout);
    } catch {
      failures.push(`${candidate.id}: dry-run did not emit JSON`);
      continue;
    }

    const prompt = payload.requestPreview?.body?.prompt ?? '';
    if (payload.schema !== 'water9/source-openai-generation@1') failures.push(`${candidate.id}: unexpected generation schema ${payload.schema ?? 'missing'}`);
    if (payload.status !== 'dry-run') failures.push(`${candidate.id}: dry-run status mismatch ${payload.status ?? 'missing'}`);
    if (payload.queued !== true) failures.push(`${candidate.id}: generation command did not read critic queue`);
    if (payload.apply !== false || payload.copied !== false) failures.push(`${candidate.id}: dry-run must not apply or copy files`);
    if (payload.requestPreview?.body?.model !== 'gpt-image-2') failures.push(`${candidate.id}: dry-run did not use gpt-image-2 request preview`);
    if (!prompt.includes('Critic regeneration target')) failures.push(`${candidate.id}: prompt missing critic regeneration target`);
    if (!prompt.includes('Subagent cohesion failures to fix')) failures.push(`${candidate.id}: prompt missing subagent critique section`);
    if (!prompt.includes('Hard acceptance bar')) failures.push(`${candidate.id}: prompt missing hard acceptance bar`);
    if (prompt.length < 500) failures.push(`${candidate.id}: prompt too short for regeneration`);
    if (!String(payload.target ?? '').endsWith(`${candidate.id}.png`)) failures.push(`${candidate.id}: target path does not point to candidate png`);

    results.push({
      id: candidate.id,
      status: payload.status,
      queued: payload.queued,
      promptLength: prompt.length,
      target: payload.target,
    });
  }

  const result = {
    schema: 'water9/source-critic-regeneration-openai-dryrun-smoke@1',
    candidates: candidates.length,
    dryRuns: results.length,
    ids: results.map((item) => item.id),
    failures,
  };

  if (failures.length) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
