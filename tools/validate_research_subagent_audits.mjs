import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const packPath = resolve(String(args.get('pack') ?? 'public/review/source-candidates/research-subagent-pack.json'));
const auditDir = resolve(String(args.get('audit-dir') ?? 'public/review/source-candidates/research-subagent-audits'));
const jsonOut = resolve(String(args.get('json-out') ?? 'public/review/source-candidates/research-subagent-audits-summary.json'));
const markdownOut = resolve(String(args.get('out') ?? 'public/review/source-candidates/research-subagent-audits-summary.md'));
const requireAllLanes = args.has('require-all-lanes') || args.has('requireAllLanes');
const requireFindings = args.has('require-findings') || args.has('requireFindings');

async function readJson(path, failures, label = path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readAuditFiles() {
  let entries = [];
  try {
    entries = await readdir(auditDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => resolve(auditDir, entry.name))
    .sort();
}

function stringArrayOk(value, min = 1) {
  return Array.isArray(value) && value.length >= min && value.every((item) => String(item ?? '').trim().length >= 3);
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None.';
}

const failures = [];
const pack = await readJson(packPath, failures, 'research subagent pack');
if (pack?.schema !== 'water9/research-subagent-pack@1') {
  failures.push(`research subagent pack schema is ${pack?.schema ?? 'missing'}`);
}

const assignments = Array.isArray(pack?.assignments) ? pack.assignments : [];
const lanes = new Map(assignments.map((assignment) => [assignment.id, assignment]));
const candidateToLane = new Map();
for (const assignment of assignments) {
  for (const candidate of assignment.candidates ?? []) {
    candidateToLane.set(candidate.id, assignment.id);
  }
}

const files = await readAuditFiles();
const audits = [];
const seenFiles = new Set();
const auditedCandidates = new Set();
const auditedLanes = new Set();

for (const file of files) {
  if (seenFiles.has(file)) failures.push(`${file}: duplicate audit file path`);
  seenFiles.add(file);
  const audit = await readJson(file, failures, file);
  if (!audit) continue;
  const owner = `${file}`;
  if (audit.schema !== 'water9/subagent-research-audit@1') {
    failures.push(`${owner}: schema is ${audit.schema ?? 'missing'}`);
  }
  if (!audit.lane || !lanes.has(audit.lane)) {
    failures.push(`${owner}: lane ${audit.lane ?? 'missing'} is not in ${packPath}`);
  } else {
    auditedLanes.add(audit.lane);
  }
  if (!Array.isArray(audit.findings)) {
    failures.push(`${owner}: findings must be an array`);
    continue;
  }
  if (requireFindings && audit.findings.length === 0) {
    failures.push(`${owner}: requires at least one finding`);
  }
  const findingIds = new Set();
  for (const finding of audit.findings) {
    const candidateId = finding.id;
    const findingOwner = `${owner}:${candidateId ?? 'unknown-candidate'}`;
    if (!candidateId) {
      failures.push(`${findingOwner}: missing id`);
      continue;
    }
    if (findingIds.has(candidateId)) failures.push(`${findingOwner}: duplicate finding id in audit`);
    findingIds.add(candidateId);
    const expectedLane = candidateToLane.get(candidateId);
    if (!expectedLane) {
      failures.push(`${findingOwner}: candidate is not present in the research subagent pack`);
    } else if (audit.lane && expectedLane !== audit.lane) {
      failures.push(`${findingOwner}: expected lane ${expectedLane}, got ${audit.lane}`);
    }
    if (!stringArrayOk(finding.strengths)) failures.push(`${findingOwner}: strengths must contain specific entries`);
    if (!stringArrayOk(finding.sourceGenerationRisks)) failures.push(`${findingOwner}: sourceGenerationRisks must contain specific entries`);
    const patch = finding.suggestedResearchPatch ?? {};
    for (const key of ['biologicalAnchors', 'requiredRead', 'promptRisks', 'motionPhases']) {
      if (patch[key] !== undefined && !stringArrayOk(patch[key], 0)) {
        failures.push(`${findingOwner}: suggestedResearchPatch.${key} must be an array of useful strings`);
      }
    }
    if (finding.referenceSearchTerms !== undefined && !stringArrayOk(finding.referenceSearchTerms, 0)) {
      failures.push(`${findingOwner}: referenceSearchTerms must be an array of useful strings`);
    }
    auditedCandidates.add(candidateId);
  }
  audits.push({
    file,
    lane: audit.lane ?? null,
    findings: audit.findings.length,
    candidates: [...findingIds].sort(),
  });
}

if (requireAllLanes) {
  for (const lane of lanes.keys()) {
    if (!auditedLanes.has(lane)) failures.push(`missing required audit for lane ${lane}`);
  }
}

const summary = {
  schema: 'water9/research-subagent-audits-summary@1',
  pack: packPath,
  auditDir,
  lanes: lanes.size,
  auditFiles: audits.length,
  auditedLanes: [...auditedLanes].sort(),
  auditedCandidates: [...auditedCandidates].sort(),
  missingLanes: [...lanes.keys()].filter((lane) => !auditedLanes.has(lane)).sort(),
  missingCandidates: [...candidateToLane.keys()].filter((candidate) => !auditedCandidates.has(candidate)).sort(),
  audits,
  failures,
};

const markdown = [
  '# Research Subagent Audits',
  '',
  `Audit files: \`${summary.auditFiles}\``,
  `Audited lanes: \`${summary.auditedLanes.length}/${summary.lanes}\``,
  `Audited candidates: \`${summary.auditedCandidates.length}/${candidateToLane.size}\``,
  '',
  'Audited lanes:',
  markdownList(summary.auditedLanes),
  '',
  'Missing lanes:',
  markdownList(summary.missingLanes),
  '',
  'Missing candidates:',
  markdownList(summary.missingCandidates),
  '',
  'Failures:',
  markdownList(summary.failures),
  '',
].join('\n');

await mkdir(dirname(jsonOut), { recursive: true });
await mkdir(dirname(markdownOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(markdownOut, `${markdown}\n`);

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
