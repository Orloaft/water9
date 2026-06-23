import { spawnSync } from 'node:child_process';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
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
  nextAction: resolve(String(args.get('next-action') ?? 'public/review/content-next-action.json')),
  inboxDir: resolve(String(args.get('dir') ?? 'tools/source-inbox')),
  report: resolve(String(args.get('report') ?? 'tools/scratch/source-current-ingest-report.json')),
};
const dryRun = args.has('dry-run') || args.has('dryRun');
const apply = args.has('apply');
const strict = !args.has('no-strict');

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fileExists(path) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= 512;
  } catch {
    return false;
  }
}

async function writeReport(report) {
  await mkdir(dirname(paths.report), { recursive: true });
  await writeFile(paths.report, `${JSON.stringify(report, null, 2)}\n`);
}

const nextAction = await readJson(paths.nextAction);
const targetId = String(args.get('id') ?? nextAction.nextAction?.targetId ?? '').trim();
if (!targetId) throw new Error('No target id supplied and content-next-action has no nextAction.targetId');

const expectedInboxFiles = [
  resolve(paths.inboxDir, `${targetId}.png`),
  resolve(paths.inboxDir, `fauna-${targetId}-whole-source.png`),
];
const presentInboxFiles = [];
for (const path of expectedInboxFiles) {
  if (await fileExists(path)) presentInboxFiles.push(path);
}

const baseReport = {
  schema: 'water9/current-source-ingest@1',
  targetId,
  stage: nextAction.nextAction?.stage ?? null,
  kind: nextAction.nextAction?.kind ?? null,
  inboxDir: asRepoRelative(paths.inboxDir),
  expectedInboxFiles: expectedInboxFiles.map(asRepoRelative),
  presentInboxFiles: presentInboxFiles.map(asRepoRelative),
  dryRun,
  apply,
};

if (presentInboxFiles.length === 0) {
  const report = {
    ...baseReport,
    status: 'missing-inbox-image',
    failures: [`${targetId}: missing inbox image`],
    next: [
      `npm run source:inbox-capture -- --id ${targetId} --open`,
      `npm run source:inbox-check -- --dir ${asRepoRelative(paths.inboxDir)} --strict --ids ${targetId}`,
      `npm run source:ingest-current -- --id ${targetId} --dry-run`,
      `npm run source:ingest-current -- --id ${targetId} --apply`,
    ],
  };
  await writeReport(report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

const batchArgs = [
  'tools/ingest_source_candidate_batch.mjs',
  '--dir',
  asRepoRelative(paths.inboxDir),
  '--ids',
  targetId,
];
if (strict) batchArgs.push('--strict');
if (dryRun || !apply) batchArgs.push('--dry-run');

const batch = spawnSync(process.execPath, batchArgs, {
  cwd: process.cwd(),
  encoding: 'utf8',
});
let batchReport = null;
try {
  batchReport = JSON.parse(batch.stdout || batch.stderr || '{}');
} catch {
  batchReport = null;
}
const failures = [];
if (batch.status !== 0) failures.push(`${targetId}: batch ingest failed`);
if (batchReport?.failures?.length) failures.push(...batchReport.failures);

const report = {
  ...baseReport,
  status: failures.length ? 'failed' : apply && !dryRun ? 'ingested' : 'ready-to-ingest',
  batchCommand: `node ${batchArgs.join(' ')}`,
  batchStatus: batch.status,
  batchReport,
  failures,
  next: failures.length
    ? [
      `npm run source:inbox-check -- --dir ${asRepoRelative(paths.inboxDir)} --strict --ids ${targetId}`,
      `npm run source:ingest-current -- --id ${targetId} --dry-run`,
    ]
    : apply && !dryRun
      ? [
        'npm run source:check',
        'npm run source:gallery',
        'npm run source:review-dossier',
      ]
      : [
        `npm run source:ingest-current -- --id ${targetId} --apply`,
      ],
};
await writeReport(report);

if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
