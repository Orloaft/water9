import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
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
  candidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  runtimeCoverage: resolve(String(args.get('runtime-coverage') ?? 'public/review/content-runtime-coverage.json')),
  acceptanceRunway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
  jsonOut: resolve(String(args.get('json-out') ?? 'public/review/content-plan-coverage.json')),
  mdOut: resolve(String(args.get('md-out') ?? 'public/review/content-plan-coverage.md')),
  htmlOut: resolve(String(args.get('html-out') ?? 'public/review/content-plan-coverage.html')),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fileArtifact(path) {
  try {
    const info = await stat(path);
    return { path, exists: info.isFile(), bytes: info.size, mtimeMs: Math.round(info.mtimeMs) };
  } catch {
    return { path, exists: false, bytes: 0, mtimeMs: 0 };
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function planPath(id) {
  return `tools/scratch/${id}-starter-plan.json`;
}

function planPreviewPath(id) {
  return `public/review/articulated/${id}-plan-preview.png`;
}

function commandsFor(candidate) {
  const plan = planPath(candidate.id);
  const preview = planPreviewPath(candidate.id);
  return {
    sourceReview: `npm run source:review-queue:preview -- --id ${candidate.id}`,
    mechanicalPrepare: `npm run articulated:prepare-plan -- --id ${candidate.id} --plan ${plan} --preview ${preview} --allow-unapproved`,
    productionPrepare: `npm run articulated:prepare-plan -- --id ${candidate.id} --plan ${plan} --preview ${preview}`,
    planCheck: `npm run articulated:plan-check -- --plan ${plan}`,
    planPreview: `npm run articulated:plan-preview -- --plan ${plan} --out ${preview}`,
    extractDryRun: `npm run articulated:extract-plan -- --plan ${plan} --dry-run`,
    runtimePreview: `npm run sandbox:preview -- --id ${candidate.id} --with diver --serve --open --visual`,
  };
}

function shellJoin(commands) {
  return commands.filter(Boolean).join(' && ');
}

function markdownFor(report) {
  const rows = report.items.map((item) => `| ${item.id} | ${item.species} | ${item.hasSource ? 'yes' : 'no'} | ${item.sourceApproved ? 'yes' : 'no'} | ${item.artifacts.plan.exists ? 'yes' : 'no'} | ${item.artifacts.planPreview.exists ? 'yes' : 'no'} | ${item.runtimeRegistered ? item.runtimeId : 'missing'} | ${item.accepted ? 'yes' : 'no'} | \`${item.commands.mechanicalPrepare}\` |`).join('\n');
  return `# Water 9 Plan Coverage

Generated: \`${report.generatedAt}\`

This report tracks whether each source candidate has tangible articulation staging artifacts. Mechanical staging is not production acceptance; plans created with \`--allow-unapproved\` are staging evidence only and do not approve source art, runtime quality, or threat acceptance.

## Summary

- Candidates: ${report.summary.candidates}
- Source images: ${report.summary.sourceImages}
- Approved sources: ${report.summary.approvedSources}
- Starter plans: ${report.summary.planArtifacts}
- Plan previews: ${report.summary.planPreviews}
- Missing starter plans: ${report.summary.missingPlanArtifacts}
- Missing plan previews: ${report.summary.missingPlanPreviews}
- Runtime registered: ${report.summary.runtimeRegistered}
- Accepted threats: ${report.summary.acceptedThreats}

## Batch Commands

Mechanical staging for candidates missing a plan or preview:

\`\`\`bash
${report.commands.mechanicalPrepareMissing || '# all candidates already have starter plans and previews'}
\`\`\`

Validate every existing starter plan:

\`\`\`bash
${report.commands.planCheckExisting || '# no starter plans exist yet'}
\`\`\`

Production plan prep for human-approved sources only:

\`\`\`bash
${report.commands.productionPrepareApproved || '# no source candidates are approved yet'}
\`\`\`

## Candidates

| Candidate | Species | Source | Approved source | Plan | Preview | Runtime | Accepted | Mechanical staging command |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
${rows}
`;
}

function htmlFor(report) {
  const cards = report.items.map((item) => `<article class="card" id="${htmlEscape(item.id)}" data-plan-coverage-candidate="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${item.runtimeRegistered ? 'runtime' : 'missing runtime'}</strong>
    </header>
    <div class="badges">
      <span>source <strong>${item.hasSource ? 'present' : 'missing'}</strong></span>
      <span>approved source <strong>${item.sourceApproved}</strong></span>
      <span>starter plan <strong>${item.artifacts.plan.exists ? 'present' : 'missing'}</strong></span>
      <span>plan preview <strong>${item.artifacts.planPreview.exists ? 'present' : 'missing'}</strong></span>
      <span>accepted <strong>${item.accepted}</strong></span>
    </div>
    <h3>Commands</h3>
    ${commandBlock([
      item.commands.sourceReview,
      item.commands.mechanicalPrepare,
      item.commands.planCheck,
      item.commands.planPreview,
      item.commands.extractDryRun,
      item.commands.runtimePreview,
    ])}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Plan Coverage</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1340px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:14px 0 8px; color:var(--muted); font-size:13px; text-transform:uppercase; }
    p { color:var(--muted); }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .summary, .badges { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span, .badges span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    strong { color:var(--text); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:14px; align-items:start; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; }
    .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Plan Coverage</h1>
    <p>Articulation staging coverage for source candidates. Mechanical staging is not production acceptance.</p>
    <div class="summary">
      <span>candidates <strong>${report.summary.candidates}</strong></span>
      <span>starter plans <strong>${report.summary.planArtifacts}</strong></span>
      <span>plan previews <strong>${report.summary.planPreviews}</strong></span>
      <span>runtime registered <strong>${report.summary.runtimeRegistered}</strong></span>
      <span>accepted threats <strong>${report.summary.acceptedThreats}</strong></span>
    </div>
    <section class="card">
      <h2>Batch Commands</h2>
      <h3>Mechanical staging for candidates missing a plan or preview</h3>
      ${commandBlock([report.commands.mechanicalPrepareMissing || '# all candidates already have starter plans and previews'])}
      <h3>Validate Existing Plans</h3>
      ${commandBlock([report.commands.planCheckExisting || '# no starter plans exist yet'])}
      <h3>Production Prep Approved Sources</h3>
      ${commandBlock([report.commands.productionPrepareApproved || '# no source candidates are approved yet'])}
    </section>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

const candidatesFile = await readJson(paths.candidates);
const runtimeCoverage = await readJson(paths.runtimeCoverage);
const runway = await readJson(paths.acceptanceRunway);
if (candidatesFile.schema !== 'water9/source-candidates@1') throw new Error(`Unexpected source candidates schema ${candidatesFile.schema ?? 'missing'}`);
if (runtimeCoverage.schema !== 'water9/content-runtime-coverage@1') throw new Error(`Unexpected runtime coverage schema ${runtimeCoverage.schema ?? 'missing'}`);
if (runway.schema !== 'water9/content-acceptance-runway@1') throw new Error(`Unexpected acceptance runway schema ${runway.schema ?? 'missing'}`);

const runtimeById = new Map((runtimeCoverage.items ?? []).map((item) => [item.id, item]));
const runwayById = new Map((runway.items ?? []).map((item) => [item.id, item]));
const candidates = candidatesFile.candidates ?? [];
const items = await Promise.all(candidates.map(async (candidate) => {
  const plan = planPath(candidate.id);
  const planPreview = planPreviewPath(candidate.id);
  const runtime = runtimeById.get(candidate.id);
  const runwayItem = runwayById.get(candidate.id);
  return {
    id: candidate.id,
    species: candidate.species,
    hasSource: Boolean(candidate.source),
    source: candidate.source ?? null,
    sourceApproved: runwayItem?.sourceApproved === true,
    runtimeRegistered: runtime?.runtimeRegistered === true,
    runtimeId: runtime?.runtimeId ?? null,
    accepted: runwayItem?.threatAccepted === true,
    stage: runwayItem?.stage ?? null,
    plan,
    planPreview,
    artifacts: {
      plan: await fileArtifact(plan),
      planPreview: await fileArtifact(planPreview),
    },
    commands: commandsFor(candidate),
  };
}));

const missingArtifacts = items.filter((item) => !item.artifacts.plan.exists || !item.artifacts.planPreview.exists);
const existingPlans = items.filter((item) => item.artifacts.plan.exists);
const approvedSources = items.filter((item) => item.sourceApproved);
const report = {
  schema: 'water9/content-plan-coverage@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    candidates: paths.candidates,
    runtimeCoverage: paths.runtimeCoverage,
    acceptanceRunway: paths.acceptanceRunway,
  },
  summary: {
    candidates: items.length,
    sourceImages: items.filter((item) => item.hasSource).length,
    approvedSources: approvedSources.length,
    planArtifacts: items.filter((item) => item.artifacts.plan.exists).length,
    planPreviews: items.filter((item) => item.artifacts.planPreview.exists).length,
    missingPlanArtifacts: items.filter((item) => !item.artifacts.plan.exists).length,
    missingPlanPreviews: items.filter((item) => !item.artifacts.planPreview.exists).length,
    runtimeRegistered: items.filter((item) => item.runtimeRegistered).length,
    acceptedThreats: items.filter((item) => item.accepted).length,
  },
  commands: {
    mechanicalPrepareMissing: shellJoin(missingArtifacts.map((item) => item.commands.mechanicalPrepare)),
    planCheckExisting: shellJoin(existingPlans.map((item) => item.commands.planCheck)),
    productionPrepareApproved: shellJoin(approvedSources.map((item) => item.commands.productionPrepare)),
  },
  missingPlanIds: items.filter((item) => !item.artifacts.plan.exists).map((item) => item.id),
  missingPlanPreviewIds: items.filter((item) => !item.artifacts.planPreview.exists).map((item) => item.id),
  items,
};

await mkdir(dirname(paths.jsonOut), { recursive: true });
await writeFile(paths.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.mdOut, markdownFor(report));
await writeFile(paths.htmlOut, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  candidates: report.summary.candidates,
  planArtifacts: report.summary.planArtifacts,
  planPreviews: report.summary.planPreviews,
  missingPlanArtifacts: report.summary.missingPlanArtifacts,
  missingPlanPreviews: report.summary.missingPlanPreviews,
  json: paths.jsonOut,
  markdown: paths.mdOut,
  html: paths.htmlOut,
}, null, 2));
