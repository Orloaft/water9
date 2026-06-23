import { spawn } from 'node:child_process';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const entryTimeoutMs = String(args.get('entry-timeout-ms') ?? args.get('entryTimeoutMs') ?? 12000);
const operationTimeoutMs = String(args.get('operation-timeout-ms') ?? args.get('operationTimeoutMs') ?? 4000);
const visualIds = String(args.get('ids') ?? 'abyssal-gulper,gulper-eel-maw,source-gulper-eel-maw')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const failures = [];
const checks = [];

function runNode(label, commandArgs) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, commandArgs, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BROWSER: 'none' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (status) => {
      const result = { label, status, stdout, stderr };
      checks.push({
        label,
        status,
        passed: status === 0,
      });
      if (status !== 0) {
        failures.push(`${label} exited ${status}`);
        const detail = `${stderr}\n${stdout}`.trim();
        if (detail) failures.push(`${label}: ${detail.slice(0, 2000)}`);
      }
      resolveRun(result);
    });
  });
}

function parseJson(label, text) {
  try {
    return JSON.parse(String(text ?? '').trim());
  } catch (error) {
    failures.push(`${label}: could not parse JSON stdout: ${error.message}`);
    return null;
  }
}

async function runJsonCheck(label, commandArgs) {
  const result = await runNode(label, commandArgs);
  if (result.status !== 0) return null;
  return parseJson(label, result.stdout);
}

await runNode('sandbox index check', ['tools/validate_sandbox_index.mjs']);
await runNode('sandbox quickstart check', ['tools/validate_sandbox_quickstart.mjs']);
const lab = await runJsonCheck('sandbox lab check', ['tools/preview_sandbox_lab.mjs', '--json', '--no-build']);
await runNode('sandbox runtime catalog check', ['tools/validate_sandbox_runtime_catalog.mjs']);
const gulperPreview = await runJsonCheck('gulper paired preview resolution', [
  'tools/preview_sandbox_entity.mjs',
  '--id', 'gulper',
  '--kind', 'articulated',
  '--with', 'diver',
  '--visual',
  '--json',
]);
const sourceGulperPreview = await runJsonCheck('source gulper paired preview resolution', [
  'tools/preview_sandbox_entity.mjs',
  '--id', 'source-gulper-eel-maw',
  '--with', 'diver',
  '--visual',
  '--json',
]);
const visual = await runJsonCheck('representative paired visual no-artifact check', [
  'tools/check_sandbox_visuals.mjs',
  '--ids', visualIds.join(','),
  '--with', 'diver',
  '--states', 'idle,lunge,stunned',
  '--no-artifacts',
  '--entry-timeout-ms', entryTimeoutMs,
  '--operation-timeout-ms', operationTimeoutMs,
]);

if (lab && lab.selectedId !== 'abyssal-gulper') failures.push(`sandbox lab default entity is ${lab.selectedId ?? 'missing'}, expected abyssal-gulper`);
if (lab && lab.companion !== 'diver') failures.push(`sandbox lab companion is ${lab.companion ?? 'missing'}, expected diver`);
if (gulperPreview && gulperPreview.id !== 'abyssal-gulper') failures.push(`gulper alias resolved to ${gulperPreview.id ?? 'missing'}, expected abyssal-gulper`);
if (gulperPreview && gulperPreview.companion !== 'diver') failures.push(`gulper paired preview companion is ${gulperPreview.companion ?? 'missing'}, expected diver`);
if (gulperPreview && !String(gulperPreview.pairedRelativeUrl ?? '').includes('companion=diver')) failures.push('gulper paired preview URL must include diver');
if (gulperPreview && !String(gulperPreview.pairedVisualCheckCommand ?? '').includes('--with diver')) failures.push('gulper paired visual command must include diver');
if (sourceGulperPreview && sourceGulperPreview.id !== 'source-gulper-eel-maw') failures.push(`source gulper resolved to ${sourceGulperPreview.id ?? 'missing'}, expected source-gulper-eel-maw`);
if (sourceGulperPreview && sourceGulperPreview.companion !== 'diver') failures.push(`source gulper paired preview companion is ${sourceGulperPreview.companion ?? 'missing'}, expected diver`);
if (sourceGulperPreview && !String(sourceGulperPreview.pairedRelativeUrl ?? '').includes('companion=diver')) failures.push('source gulper paired preview URL must include diver');
if (visual) {
  if (visual.artifacts?.screenshots !== false || visual.artifacts?.report !== false) failures.push('representative visual audit must run with screenshots=false and report=false');
  if ((visual.failures ?? []).length) failures.push(...visual.failures);
  if (visual.checked !== visualIds.length) failures.push(`representative visual audit checked ${visual.checked ?? 'missing'} ids, expected ${visualIds.length}`);
}

const report = {
  schema: 'water9/sandbox-preview-audit@1',
  readOnly: true,
  structuralChecks: 4,
  representativeVisualIds: visualIds,
  checkedRepresentativeVisuals: visual?.checked ?? null,
  gulperResolvedId: gulperPreview?.id ?? null,
  sourceGulperResolvedId: sourceGulperPreview?.id ?? null,
  labEntity: lab?.selectedId ?? null,
  labCompanion: lab?.companion ?? null,
  checks,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(report, null, 2));
}
