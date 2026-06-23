import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const minThreats = Number(args.get('min-threats') ?? 20);
const failures = [];

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

function parseGateOutput(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return null;
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

const matrix = await readJson('content quality gate matrix', 'public/review/content-quality-gate-matrix.json');
if (matrix?.schema !== 'water9/content-quality-gate-matrix@1') failures.push(`unexpected matrix schema ${matrix?.schema ?? 'missing'}`);
if (matrix?.policy?.previewOnlyEvidenceCannotCountTowardStrictGate !== true) failures.push('matrix must state preview-only evidence cannot count toward strict gate');
if (matrix?.policy?.humanSourceApprovalRequired !== true) failures.push('matrix must require human source approval');
if (matrix?.policy?.humanThreatAcceptanceRequired !== true) failures.push('matrix must require human threat acceptance');
if ((matrix?.summary?.rows ?? 0) < minThreats) failures.push(`matrix has ${matrix?.summary?.rows ?? 0}/${minThreats} rows`);
if ((matrix?.summary?.allEvidenceComplete ?? 0) < minThreats) failures.push(`matrix has ${matrix?.summary?.allEvidenceComplete ?? 0}/${minThreats} all-evidence-complete rows`);
if ((matrix?.summary?.previewOnlyRows ?? 0) < minThreats) failures.push(`matrix has ${matrix?.summary?.previewOnlyRows ?? 0}/${minThreats} preview-only rows`);

let tempDir = null;
let gateSummary = null;
try {
  tempDir = await mkdtemp(join(tmpdir(), 'water9-strict-gate-negative-'));
  const emptyLedger = join(tempDir, 'empty-content-acceptance-ledger.json');
  await writeFile(emptyLedger, `${JSON.stringify({
    schema: 'water9/content-acceptance-ledger@1',
    targetThreats: minThreats,
    entries: [],
  }, null, 2)}\n`);

  const result = spawnSync(process.execPath, [
    'tools/validate_content_gate.mjs',
    '--min-threats',
    String(minThreats),
    '--acceptance-ledger',
    emptyLedger,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  gateSummary = parseGateOutput(combined);
  if (result.status === 0) failures.push('strict gate unexpectedly passed with an empty human acceptance ledger');
  if (!gateSummary) {
    failures.push('strict gate did not emit parseable JSON');
  } else {
    if (gateSummary.allowPrototypes !== false) failures.push('strict gate negative smoke must run without allowPrototypes');
    if ((gateSummary.acceptanceLedgerEntries ?? -1) !== 0) failures.push(`strict gate used ${gateSummary.acceptanceLedgerEntries} ledger entries, expected 0`);
    if ((gateSummary.acceptedThreats ?? -1) !== 0) failures.push(`strict gate accepted ${gateSummary.acceptedThreats} threats with an empty ledger, expected 0`);
    const expectedFailure = `only 0/${minThreats} articulated threats are accepted`;
    if (!(gateSummary.failures ?? []).includes(expectedFailure)) failures.push(`strict gate missing expected failure: ${expectedFailure}`);
  }
} finally {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
}

const report = {
  schema: 'water9/content-strict-gate-negative-smoke@1',
  targetThreats: minThreats,
  matrixRows: matrix?.summary?.rows ?? null,
  allEvidenceComplete: matrix?.summary?.allEvidenceComplete ?? null,
  previewOnlyRows: matrix?.summary?.previewOnlyRows ?? null,
  gateAcceptedThreats: gateSummary?.acceptedThreats ?? null,
  gateAcceptanceLedgerEntries: gateSummary?.acceptanceLedgerEntries ?? null,
  gateFailedAsExpected: Boolean(gateSummary) && (gateSummary.acceptedThreats ?? -1) === 0 && (gateSummary.failures ?? []).includes(`only 0/${minThreats} articulated threats are accepted`),
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(report, null, 2));
}
