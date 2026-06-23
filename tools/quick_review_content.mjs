import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = String(args.get('id') ?? args.get('entity') ?? '').trim();
const states = String(args.get('states') ?? 'idle,lunge,stunned');
const outDir = resolve(String(args.get('out-dir') ?? 'public/review/quick-reviews'));
const jsonOut = resolve(String(args.get('json-out') ?? `${outDir}/${id || 'entity'}.json`));
const markdownOut = resolve(String(args.get('out') ?? `${outDir}/${id || 'entity'}.md`));
const skipVisual = args.has('skip-visual') || args.has('skipVisual');
const skipGalleries = args.has('skip-galleries') || args.has('skipGalleries');

function usage() {
  console.error('Usage: node tools/quick_review_content.mjs --id <sandbox-entity-id> [--skip-visual] [--skip-galleries]');
}

function npmCommand(script, extraArgs = []) {
  return {
    label: `npm run ${script}${extraArgs.length ? ` -- ${extraArgs.join(' ')}` : ''}`,
    command: 'npm',
    args: ['run', script, ...(extraArgs.length ? ['--', ...extraArgs] : [])],
  };
}

async function runStep(step) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const child = spawn(step.command, step.args, {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const exitCode = await new Promise((resolveExit) => child.once('exit', (code) => resolveExit(code ?? 1)));
  return {
    label: step.label,
    startedAt,
    durationMs: Date.now() - startedMs,
    exitCode,
    ok: exitCode === 0,
    stdout,
    stderr,
  };
}

function parseLastJsonObject(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return null;
  const starts = [];
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] === '{') starts.push(index);
  }
  for (const start of starts.reverse()) {
    try {
      return JSON.parse(trimmed.slice(start));
    } catch {
      // Try the next possible JSON object start.
    }
  }
  return null;
}

function commandBlock(command) {
  return ['```bash', command, '```'].join('\n');
}

function markdownFor(report) {
  const lines = [
    `# Quick Review: ${report.id}`,
    '',
    `Generated: \`${report.generatedAt}\``,
    `Sandbox kind: \`${report.preview?.kind ?? 'unknown'}\``,
    `Sandbox URL: ${report.preview?.url ?? 'unresolved'}`,
    `Overall status: \`${report.ok ? 'passed' : 'failed'}\``,
    '',
    '## Artifacts',
    '',
    `- Visual report: \`${report.artifacts.visualReport ?? 'not generated'}\``,
    `- Visual screenshots: \`${report.artifacts.visualOutDir ?? 'not generated'}\``,
    `- Acceptance audit: \`${report.artifacts.acceptanceAudit ?? 'not generated'}\``,
    `- Exemplar pack: \`${report.artifacts.exemplarPack ?? 'not generated'}\``,
    '',
    '## Commands',
    '',
    ...report.steps.map((step) => [
      `### ${step.ok ? 'OK' : 'FAIL'}: ${step.label}`,
      '',
      `- Exit code: \`${step.exitCode}\``,
      `- Duration: \`${step.durationMs}ms\``,
      '',
    ].join('\n')),
    '## Manual Follow-Up',
    '',
    commandBlock(report.id === 'diver'
      ? `npm run sandbox:preview -- --id ${report.id} --serve --open --visual`
      : `npm run sandbox:preview -- --id ${report.id} --with diver --serve --open --visual`),
    '',
  ];
  if (report.preview?.kind === 'articulated') {
    lines.push(commandBlock(`npm run content:exemplar-pack -- --id ${report.id}`));
    lines.push('');
    lines.push(commandBlock(`npm run content:acceptance-audit -- --id ${report.id}`));
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

if (!id) {
  usage();
  process.exit(1);
}

const commands = [];
commands.push(npmCommand('sandbox:index'));
commands.push(npmCommand('sandbox:preview', ['--id', id, '--json']));

const results = [];
for (const command of commands) {
  const result = await runStep(command);
  results.push(result);
  if (!result.ok) break;
}

const previewResult = results.find((result) => result.label.startsWith('npm run sandbox:preview'));
const preview = parseLastJsonObject(previewResult?.stdout) ?? null;
const kind = preview?.kind ?? null;
const visualReport = `tools/scratch/quick-review-${id}-visual-report.json`;
const visualOutDir = `tools/scratch/quick-review-${id}-visuals`;

if (results.every((result) => result.ok) && !skipVisual) {
  const visualArgs = ['--ids', id, '--report', visualReport, '--out-dir', visualOutDir];
  if (kind === 'articulated') visualArgs.push('--states', states);
  results.push(await runStep(npmCommand('sandbox:visual', visualArgs)));
}

if (results.every((result) => result.ok) && kind === 'articulated') {
  if (!skipGalleries) {
    results.push(await runStep(npmCommand('review:articulated:quick')));
    if (results.every((result) => result.ok)) results.push(await runStep(npmCommand('source:gallery')));
  }
  if (results.every((result) => result.ok)) results.push(await runStep(npmCommand('content:acceptance-audit', ['--id', id])));
  if (results.every((result) => result.ok)) results.push(await runStep(npmCommand('content:exemplar-pack', ['--id', id])));
}

const exemplarPackPath = `public/review/exemplar-packs/${id}.md`;
const acceptanceAuditPath = 'public/review/content-acceptance-audit.md';
const exemplar = await readJson(`public/review/exemplar-packs/${id}.json`, null);
const report = {
  schema: 'water9/content-quick-review@1',
  generatedAt: new Date().toISOString(),
  id,
  preview,
  steps: results.map((result) => ({
    label: result.label,
    startedAt: result.startedAt,
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    ok: result.ok,
    stdoutTail: result.stdout.trim().slice(-4000),
    stderrTail: result.stderr.trim().slice(-4000),
  })),
  artifacts: {
    visualReport: skipVisual ? null : visualReport,
    visualOutDir: skipVisual ? null : visualOutDir,
    acceptanceAudit: kind === 'articulated' ? acceptanceAuditPath : null,
    exemplarPack: kind === 'articulated' ? exemplarPackPath : null,
  },
  exemplarSummary: exemplar ? {
    readyForStrictGate: exemplar.readyForStrictGate,
    blockers: exemplar.blockers ?? [],
    sourceApproved: exemplar.sourceCandidate?.approved ?? false,
    threatAccepted: exemplar.threat?.accepted ?? false,
  } : null,
  ok: results.every((result) => result.ok),
};

await mkdir(dirname(jsonOut), { recursive: true });
await mkdir(dirname(markdownOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownOut, markdownFor(report));

console.log(JSON.stringify({
  id,
  kind,
  jsonOut,
  markdownOut,
  ok: report.ok,
  steps: report.steps.length,
  failedSteps: report.steps.filter((step) => !step.ok).map((step) => step.label),
  readyForStrictGate: report.exemplarSummary?.readyForStrictGate ?? null,
  blockers: report.exemplarSummary?.blockers?.length ?? null,
}, null, 2));

if (!report.ok) process.exitCode = 1;
