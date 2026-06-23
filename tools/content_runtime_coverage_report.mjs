import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  candidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  runway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
  jsonOut: resolve(String(args.get('json-out') ?? 'public/review/content-runtime-coverage.json')),
  mdOut: resolve(String(args.get('md-out') ?? 'public/review/content-runtime-coverage.md')),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function runtimeForCandidate(runtime, candidate) {
  return (runtime.creatures ?? []).find((creature) => (
    creature.quality?.sourceCandidateId === candidate.id
    || candidate.riggedCreatureId === creature.id
    || creature.id === candidate.id
  )) ?? null;
}

function commandFor(candidate) {
  return `npm run articulated:prepare-plan -- --id ${candidate.id} --plan tools/scratch/${candidate.id}-starter-plan.json --preview public/review/articulated/${candidate.id}-plan-preview.png`;
}

const candidatesFile = await readJson(paths.candidates);
const runtime = await readJson(paths.runtime);
const runway = await readJson(paths.runway);
if (candidatesFile.schema !== 'water9/source-candidates@1') throw new Error(`Unexpected source candidates schema ${candidatesFile.schema ?? 'missing'}`);
if (!Array.isArray(runtime.creatures)) throw new Error('Runtime manifest is missing creatures[]');
if (runway.schema !== 'water9/content-acceptance-runway@1') throw new Error(`Unexpected acceptance runway schema ${runway.schema ?? 'missing'}`);

const runwayById = new Map((runway.items ?? []).map((item) => [item.id, item]));
const candidates = candidatesFile.candidates ?? [];
const items = candidates.map((candidate) => {
  const runtimeCreature = runtimeForCandidate(runtime, candidate);
  const runwayItem = runwayById.get(candidate.id);
  return {
    id: candidate.id,
    species: candidate.species,
    source: candidate.source ?? null,
    sourceApproved: runwayItem?.sourceApproved === true,
    runtimeRegistered: Boolean(runtimeCreature),
    runtimeId: runtimeCreature?.id ?? null,
    runtimeQualityStatus: runtimeCreature?.quality?.status ?? null,
    accepted: runwayItem?.threatAccepted === true,
    stage: runwayItem?.stage ?? null,
    nextAction: runwayItem?.nextAction ?? null,
    riggingCommand: commandFor(candidate),
  };
});

const missingRuntime = items.filter((item) => !item.runtimeRegistered);
const registered = items.filter((item) => item.runtimeRegistered);
const report = {
  schema: 'water9/content-runtime-coverage@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    candidates: paths.candidates,
    runtime: paths.runtime,
    runway: paths.runway,
  },
  summary: {
    candidates: items.length,
    sourceImages: items.filter((item) => item.source).length,
    approvedSources: items.filter((item) => item.sourceApproved).length,
    runtimeRegistered: registered.length,
    missingRuntime: missingRuntime.length,
    acceptedThreats: items.filter((item) => item.accepted).length,
    nextBottleneck: missingRuntime.length ? 'register articulated runtime threats' : 'human rig acceptance',
  },
  items,
  missingRuntimeIds: missingRuntime.map((item) => item.id),
  registeredRuntimeIds: registered.map((item) => item.id),
};

const rows = items.map((item) => `| ${item.id} | ${item.species} | ${item.runtimeRegistered ? item.runtimeId : 'missing'} | ${item.runtimeQualityStatus ?? 'none'} | ${item.stage ?? 'unknown'} | \`${item.riggingCommand}\` |`).join('\n');
const markdown = `# Water 9 Runtime Coverage

Generated: \`${report.generatedAt}\`

This report tracks whether each source candidate has a registered articulated runtime threat. It does not approve source art or rig quality.

## Summary

- Candidates: ${report.summary.candidates}
- Source images: ${report.summary.sourceImages}
- Approved sources: ${report.summary.approvedSources}
- Runtime registered: ${report.summary.runtimeRegistered}
- Missing runtime: ${report.summary.missingRuntime}
- Accepted threats: ${report.summary.acceptedThreats}
- Next bottleneck: ${report.summary.nextBottleneck}

## Missing Runtime

${missingRuntime.length ? missingRuntime.map((item) => `- ${item.id}: \`${item.riggingCommand}\``).join('\n') : '- None.'}

## Candidates

| Candidate | Species | Runtime | Runtime quality | Stage | Rigging command |
| --- | --- | --- | --- | --- | --- |
${rows}
`;

await writeFile(paths.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.mdOut, markdown);

console.log(JSON.stringify({
  schema: report.schema,
  candidates: report.summary.candidates,
  runtimeRegistered: report.summary.runtimeRegistered,
  missingRuntime: report.summary.missingRuntime,
  acceptedThreats: report.summary.acceptedThreats,
  json: paths.jsonOut,
  markdown: paths.mdOut,
}, null, 2));
