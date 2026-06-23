import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const decisionArtifacts = [
  {
    id: 'source-approval-marathon-workspace',
    path: 'tools/scratch/source-approval-marathon-workspace-reviewed-decisions.json',
    schema: 'water9/source-cohesion-decisions@1',
    minDecisions: 1,
    guardReport: 'tools/scratch/source-approval-marathon-workspace-apply-guard-report.json',
    guardSchema: 'water9/source-cohesion-decision-run@1',
  },
  {
    id: 'source-approval-marathon-full-batch',
    path: 'tools/scratch/source-approval-marathon-full-batch-reviewed-decisions.json',
    schema: 'water9/source-cohesion-decisions@1',
    minDecisions: 20,
    guardReport: 'tools/scratch/source-approval-marathon-full-batch-apply-guard-report.json',
    guardSchema: 'water9/source-cohesion-decision-run@1',
  },
  {
    id: 'content-review-session-source-roundtrip',
    path: 'tools/scratch/content-review-session-source-roundtrip.json',
    schema: 'water9/source-cohesion-decisions@1',
    minDecisions: 1,
    guardReport: 'tools/scratch/content-review-session-source-roundtrip-apply-guard-report.json',
    guardSchema: 'water9/source-cohesion-decision-run@1',
  },
  {
    id: 'content-review-session-threat-roundtrip',
    path: 'tools/scratch/content-review-session-threat-roundtrip.json',
    schema: 'water9/content-threat-acceptance-decisions@1',
    minDecisions: 1,
    guardReport: 'tools/scratch/content-review-session-threat-roundtrip-apply-guard-report.json',
    guardSchema: 'water9/content-threat-acceptance-decision-run@1',
  },
  {
    id: 'content-threat-acceptance-apply-smoke',
    path: 'tools/scratch/content-threat-acceptance-decisions-apply-smoke.json',
    schema: 'water9/content-threat-acceptance-decisions@1',
    minDecisions: 1,
    guardReport: 'tools/scratch/content-threat-acceptance-decisions-apply-guard-report.json',
    guardSchema: 'water9/content-threat-acceptance-decision-run@1',
  },
];

const failures = [];

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(resolve(path), 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read ${path}: ${error.message}`);
    return null;
  }
}

for (const artifact of decisionArtifacts) {
  const decisionFile = await readJson(`${artifact.id} decision file`, artifact.path);
  if (decisionFile?.schema !== artifact.schema) failures.push(`${artifact.id}: decision schema was ${decisionFile?.schema ?? 'missing'}, expected ${artifact.schema}`);
  if ((decisionFile?.decisions ?? []).length < artifact.minDecisions) failures.push(`${artifact.id}: decision count below ${artifact.minDecisions}`);
  if (decisionFile?.policy?.dryRunOnly !== true) failures.push(`${artifact.id}: synthetic decision file missing policy.dryRunOnly`);
  if (decisionFile?.policy?.smokeTestArtifact !== true) failures.push(`${artifact.id}: synthetic decision file missing policy.smokeTestArtifact`);

  const guardReport = await readJson(`${artifact.id} guard report`, artifact.guardReport);
  if (guardReport?.schema !== artifact.guardSchema) failures.push(`${artifact.id}: guard report schema was ${guardReport?.schema ?? 'missing'}, expected ${artifact.guardSchema}`);
  if (guardReport?.applyRequested !== true) failures.push(`${artifact.id}: guard report must record applyRequested true`);
  if (guardReport?.applied !== false) failures.push(`${artifact.id}: guard report must not be applied`);
  if (!String((guardReport?.failures ?? []).join('\n')).includes('decision file policy.dryRunOnly forbids --apply')) {
    failures.push(`${artifact.id}: guard report missing dryRunOnly failure`);
  }
  if ((guardReport?.results ?? []).some((result) => result.applied === true)) failures.push(`${artifact.id}: guard report contains applied result`);
}

const result = {
  schema: 'water9/synthetic-decision-guards-check@1',
  artifacts: decisionArtifacts.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
