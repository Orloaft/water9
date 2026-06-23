import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const stageBoardPath = resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json'));
const reportPath = String(args.get('report') ?? 'tools/scratch/sandbox-target-paired-visuals-report.json');
const outDir = String(args.get('out-dir') ?? 'tools/scratch/sandbox-target-paired-visuals');
const states = String(args.get('states') ?? 'idle,lunge,stunned');
const entryTimeoutMs = String(args.get('entry-timeout-ms') ?? 12000);
const operationTimeoutMs = String(args.get('operation-timeout-ms') ?? 4000);
const limit = Number(args.get('limit') ?? 0);
const includeSources = args.has('include-sources') || args.has('includeSources');
const noArtifacts = args.has('no-artifacts') || args.has('noArtifacts');

function run(command, commandArgs) {
  return new Promise((resolveRun) => {
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BROWSER: 'none' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (status) => resolveRun({ status, stdout, stderr }));
  });
}

const stageBoard = JSON.parse(await readFile(stageBoardPath, 'utf8'));
const allIds = (stageBoard.targets ?? [])
  .map((target) => target.rigId ?? target.id)
  .filter(Boolean);
const selectedTargets = limit > 0 ? (stageBoard.targets ?? []).slice(0, limit) : (stageBoard.targets ?? []);
const selectedEntries = [];
for (const target of selectedTargets) {
  const runtimeId = target.rigId ?? target.id;
  if (runtimeId) selectedEntries.push({ id: runtimeId, kind: 'runtime' });
  if (includeSources && target.id) selectedEntries.push({ id: `source-${target.id}`, kind: 'source' });
}
const ids = selectedEntries.map((entry) => entry.id);
const failures = [];

if (stageBoard.schema !== 'water9/content-stage-board@1') failures.push(`unexpected stage board schema ${stageBoard.schema ?? 'missing'}`);
if (allIds.length < 20) failures.push(`expected at least 20 target ids, found ${allIds.length}`);
if (!ids.length) failures.push('no target ids selected for paired visual smoke');

let report = null;
if (!failures.length) {
  const commandArgs = [
    'tools/check_sandbox_visuals.mjs',
    '--ids', ids.join(','),
    '--with', 'diver',
    '--states', states,
    '--entry-timeout-ms', entryTimeoutMs,
    '--operation-timeout-ms', operationTimeoutMs,
  ];
  if (noArtifacts) {
    commandArgs.push('--no-artifacts');
  } else {
    commandArgs.push('--out-dir', outDir, '--report', reportPath);
  }
  const result = await run('node', commandArgs);
  if (result.status !== 0) {
    failures.push(`check_sandbox_visuals exited ${result.status}`);
    if (result.stderr.trim()) failures.push(result.stderr.trim().slice(0, 2000));
  }
  if (noArtifacts) {
    try {
      report = JSON.parse(result.stdout);
    } catch (error) {
      failures.push(`could not parse no-artifact visual summary: ${error.message}`);
    }
    if (report?.artifacts?.screenshots !== false || report?.artifacts?.report !== false) {
      failures.push('no-artifact visual summary must report screenshots=false and report=false');
    }
  }
}

if (!noArtifacts) {
  try {
    report = JSON.parse(await readFile(reportPath, 'utf8'));
  } catch (error) {
    failures.push(`could not read paired target visual report: ${error.message}`);
  }
}

if (report) {
  if (!String(report.generatedAt ?? '').trim()) failures.push('paired visual report missing generatedAt timestamp');
  if (noArtifacts) {
    if (report.checked !== ids.length) failures.push(`no-artifact visual summary checked ${report.checked ?? 'missing'} entries; expected ${ids.length}`);
    if (Array.isArray(report.failures) && report.failures.length) failures.push(...report.failures);
  } else {
    if (report.schema !== 'water9/sandbox-visual-check@1') failures.push(`unexpected report schema ${report.schema ?? 'missing'}`);
    if (report.selection?.companion !== 'diver') failures.push('paired visual report must use diver companion');
    const checkedIds = new Set((report.results ?? []).map((entry) => entry.id));
    for (const id of ids) {
      if (!checkedIds.has(id)) failures.push(`paired visual report missing ${id}`);
    }
    const expectedById = new Map(selectedEntries.map((entry) => [
      entry.id,
      entry.kind === 'source' ? ['idle'] : states.split(',').filter(Boolean),
    ]));
    for (const result of report.results ?? []) {
      const checkedStates = new Set((result.states ?? []).map((entry) => entry.state));
      for (const state of expectedById.get(result.id) ?? states.split(',').filter(Boolean)) {
        if (!checkedStates.has(state)) failures.push(`${result.id}: missing ${state} paired state`);
      }
      if (result.failures?.length) failures.push(`${result.id}: ${result.failures.join('; ')}`);
    }
    if (report.failures?.length) failures.push(...report.failures);
  }
}

const summary = {
  schema: 'water9/sandbox-target-paired-visuals-smoke@1',
  selectedTargets: selectedTargets.length,
  selectedEntries: ids.length,
  includeSources,
  noArtifacts,
  checked: report?.checked ?? 0,
  reportPath: noArtifacts ? null : reportPath,
  outDir: noArtifacts ? null : outDir,
  states,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
