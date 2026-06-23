import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  runbook: resolve(String(args.get('runbook') ?? 'public/review/source-candidates/source-acquisition-runbook.json')),
  inboxDir: resolve(String(args.get('inbox-dir') ?? args.get('dir') ?? 'tools/source-inbox')),
  manifest: resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json')),
  queue: resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  generatedDir: resolve(String(args.get('generated-dir') ?? 'public/assets/generated')),
  report: resolve(String(args.get('report') ?? 'tools/scratch/source-advance-inbox-report.json')),
};
const apply = args.has('apply');
const overwrite = args.has('overwrite');
const skipRefresh = args.has('skip-refresh');
const skipImageCheck = args.has('skip-image-check');
const requestedIds = String(args.get('ids') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`${label}: could not read JSON: ${error.message}`);
  }
}

async function activeIds() {
  if (requestedIds.length) return requestedIds;
  const runbook = await readJson('source acquisition runbook', paths.runbook);
  const ids = Array.isArray(runbook.ids) ? runbook.ids : [];
  if (!ids.length) throw new Error('source acquisition runbook does not contain active sprint ids; pass --ids');
  return ids;
}

function commandLabel(command) {
  if (command[0] === process.execPath) return `node ${command.slice(1).join(' ')}`;
  return command.join(' ');
}

function runStep(name, command, options = {}) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return {
    name,
    required: options.required !== false,
    command: commandLabel(command),
    status: result.status,
    ok: result.status === 0,
    stdout: String(result.stdout ?? '').trim(),
    stderr: String(result.stderr ?? '').trim(),
  };
}

async function writeReport(report) {
  await mkdir(dirname(paths.report), { recursive: true });
  await writeFile(paths.report, `${JSON.stringify(report, null, 2)}\n`);
}

const failures = [];
const ids = await activeIds().catch((error) => {
  failures.push(error.message);
  return [];
});
const idArg = ids.join(',');
const baseIngestArgs = [
  '--dir', asRepoRelative(paths.inboxDir),
  '--manifest', asRepoRelative(paths.manifest),
  '--queue', asRepoRelative(paths.queue),
  '--generated-dir', asRepoRelative(paths.generatedDir),
  '--strict',
  '--ids', idArg,
];
if (overwrite) baseIngestArgs.push('--overwrite');
if (skipImageCheck) baseIngestArgs.push('--skip-image-check');

const steps = [];
if (!failures.length) {
  steps.push(runStep('inbox-check', [
    process.execPath,
    'tools/validate_source_inbox.mjs',
    '--dir', asRepoRelative(paths.inboxDir),
    '--manifest', asRepoRelative(paths.manifest),
    '--queue', asRepoRelative(paths.queue),
    '--strict',
    '--ids', idArg,
    ...(overwrite ? ['--overwrite'] : []),
    ...(skipImageCheck ? ['--skip-image-check'] : []),
  ]));

  if (steps.every((step) => step.ok || !step.required)) {
    steps.push(runStep('ingest-dry-run', [
      process.execPath,
      'tools/ingest_source_candidate_batch.mjs',
      ...baseIngestArgs,
      '--dry-run',
      '--report', 'tools/scratch/source-ingest-batch-dry-run-report.json',
    ]));
  }

  if (apply && steps.every((step) => step.ok || !step.required)) {
    steps.push(runStep('ingest-apply', [
      process.execPath,
      'tools/ingest_source_candidate_batch.mjs',
      ...baseIngestArgs,
      '--report', 'tools/scratch/source-ingest-batch-apply-report.json',
    ]));
  }

  if (apply && !skipRefresh && steps.every((step) => step.ok || !step.required)) {
    for (const [name, command] of [
      ['source-image-check', ['python3', 'tools/validate_source_candidate_images.py', '--report', 'tools/scratch/source-candidate-images-report.json']],
      ['source-preview-check', [process.execPath, 'tools/check_sandbox_visuals.mjs', '--kind', 'source', '--out-dir', 'tools/scratch/source-preview-visuals', '--report', 'tools/scratch/source-preview-visuals-report.json']],
      ['source-review-dossier', [process.execPath, 'tools/build_source_review_dossier.mjs']],
      ['source-review-dossier-check', [process.execPath, 'tools/validate_source_review_dossier.mjs']],
      ['content-goal-readiness', [process.execPath, 'tools/build_content_goal_readiness.mjs']],
      ['content-goal-readiness-check', [process.execPath, 'tools/validate_content_goal_readiness.mjs']],
    ]) {
      steps.push(runStep(name, command));
      if (!steps.at(-1).ok) break;
    }
  }
}

const failedStep = steps.find((step) => step.required && !step.ok);
const status = failures.length
  ? 'blocked'
  : failedStep
    ? 'blocked'
    : apply
      ? 'applied'
      : 'ready-to-apply';
const report = {
  schema: 'water9/source-advance-inbox@1',
  generatedAt: new Date().toISOString(),
  mode: apply ? 'apply' : 'dry-run',
  status,
  ids,
  inboxDir: asRepoRelative(paths.inboxDir),
  manifest: asRepoRelative(paths.manifest),
  queue: asRepoRelative(paths.queue),
  generatedDir: asRepoRelative(paths.generatedDir),
  overwrite,
  skipRefresh,
  skipImageCheck,
  steps,
  failures: [
    ...failures,
    ...(failedStep ? [`${failedStep.name} failed with exit ${failedStep.status}`] : []),
  ],
  next: status === 'ready-to-apply'
    ? [`npm run source:advance-inbox -- --ids ${idArg} --apply`]
    : status === 'applied'
      ? ['inspect public/review/source-candidates/source-review-dossier.html and approve/reject each source image']
      : ['fix inbox validation failures, then rerun npm run source:advance-inbox'],
  report: asRepoRelative(paths.report),
};

await writeReport(report);
const text = JSON.stringify(report, null, 2);
if (status === 'blocked') {
  console.error(text);
  process.exitCode = 1;
} else {
  console.log(text);
}
