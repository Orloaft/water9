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

const limit = Number(args.get('limit') ?? 6);
const paths = {
  runtimeCoverage: resolve(String(args.get('runtime-coverage') ?? 'public/review/content-runtime-coverage.json')),
  riggingPacks: resolve(String(args.get('rigging-packs') ?? 'public/review/rigging-packs/index.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-rigging-sprint.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/content-rigging-sprint.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-rigging-sprint.html')),
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

function commandsFor(item) {
  const plan = planPath(item.id);
  const preview = planPreviewPath(item.id);
  return {
    sourceReview: `npm run source:review-queue:preview -- --id ${item.id}`,
    focusPack: `npm run content:rigging-pack -- --id ${item.id}`,
    productionPreparePlan: `npm run articulated:prepare-plan -- --id ${item.id} --plan ${plan} --preview ${preview}`,
    mechanicalDryRunPreparePlan: `npm run articulated:prepare-plan -- --id ${item.id} --plan ${plan} --preview ${preview} --allow-unapproved`,
    planPreview: `npm run articulated:plan-preview -- --plan ${plan} --out ${preview}`,
    planCheck: `npm run articulated:plan-check -- --plan ${plan}`,
    extractDryRun: `npm run articulated:extract-plan -- --plan ${plan} --dry-run`,
    extractAndRegister: `npm run articulated:extract-plan -- --plan ${plan}`,
    postRegisterChecks: 'npm run articulated:check && npm run sandbox:index && npm run content:runtime-coverage && npm run content:runtime-coverage-check',
    runtimePreview: `npm run sandbox:preview -- --id ${item.id} --with diver --serve --open --visual`,
    runtimeVisual: `npm run sandbox:visual -- --ids ${item.id} --states idle,lunge,stunned --with diver`,
    acceptanceRunway: `npm run content:acceptance-runway:preview -- --id ${item.id}`,
  };
}

function shellJoin(commands) {
  return commands.filter(Boolean).join(' && ');
}

function emptyCommand(label) {
  return `# ${label}: no missing-runtime candidates; rerun npm run content:rigging-sprint after source approval or new source intake --allow-unapproved`;
}

function markdownFor(report) {
  const rows = report.items.map((item) => `| ${item.id} | ${item.species} | ${item.sourceApproved ? 'yes' : 'no'} | ${item.stage ?? 'unknown'} | \`${item.commands.productionPreparePlan}\` |`).join('\n');
  const cards = report.items.map((item) => `## ${item.species} (${item.id})

- Source approved: \`${item.sourceApproved}\`
- Stage: \`${item.stage ?? 'unknown'}\`
- Plan: \`${item.plan}\`
- Preview: \`${item.planPreview}\`
- Plan artifact: \`${item.artifacts?.plan?.exists ? 'present' : 'missing'}\`
- Preview artifact: \`${item.artifacts?.planPreview?.exists ? 'present' : 'missing'}\`

\`\`\`bash
${[
  item.commands.sourceReview,
  item.commands.focusPack,
  item.commands.productionPreparePlan,
  item.commands.planPreview,
  item.commands.planCheck,
  item.commands.extractDryRun,
  item.commands.extractAndRegister,
  item.commands.postRegisterChecks,
  item.commands.runtimePreview,
  item.commands.runtimeVisual,
  item.commands.acceptanceRunway,
].join('\n')}
\`\`\`

Mechanical dry-run before source approval:

\`\`\`bash
${item.commands.mechanicalDryRunPreparePlan}
\`\`\`
`).join('\n');

  return `# Water 9 Rigging Sprint

Generated: \`${report.generatedAt}\`

This sprint turns missing runtime registrations into concrete rigging commands. Production extraction is still gated by human source approval.

## Summary

- Missing runtime total: ${report.summary.missingRuntimeTotal}
- Sprint size: ${report.summary.sprintSize}
- Source approved in sprint: ${report.summary.sourceApprovedInSprint}
- Production ready for plan prep: ${report.summary.productionReadyForPlanPrep}
- Plan artifacts staged: ${report.summary.planArtifactsStagedInSprint}
- Plan previews staged: ${report.summary.planPreviewsStagedInSprint}

## Sprint Commands

Review every source in this sprint:

\`\`\`bash
${report.commands.sourceReviewAll}
\`\`\`

Mechanical plan-prep smoke for the sprint. This is intentionally not production acceptance:

\`\`\`bash
${report.commands.mechanicalDryRunAll}
\`\`\`

Production plan prep for human-approved sources only:

\`\`\`bash
${report.commands.productionPrepareApproved || '# no sprint sources are approved yet'}
\`\`\`

Post-registration coverage check:

\`\`\`bash
${report.commands.postRegisterCoverage}
\`\`\`

## Sprint Table

| Candidate | Species | Source approved | Stage | Production plan command |
| --- | --- | ---: | --- | --- |
${rows}

${cards}
`;
}

function htmlFor(report) {
  const cards = report.items.map((item) => `<article class="card" id="${htmlEscape(item.id)}" data-rigging-sprint-candidate="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${htmlEscape(item.stage ?? 'unknown')}</strong>
    </header>
    <div class="badges">
      <span>source approved <strong>${item.sourceApproved}</strong></span>
      <span>plan <strong>${htmlEscape(item.plan)}</strong></span>
      <span>plan artifact <strong>${item.artifacts?.plan?.exists ? 'present' : 'missing'}</strong></span>
      <span>preview artifact <strong>${item.artifacts?.planPreview?.exists ? 'present' : 'missing'}</strong></span>
    </div>
    <h3>Required Review First</h3>
    ${commandBlock([item.commands.sourceReview])}
    <h3>Production Rigging Path</h3>
    ${commandBlock([
      item.commands.focusPack,
      item.commands.productionPreparePlan,
      item.commands.planPreview,
      item.commands.planCheck,
      item.commands.extractDryRun,
      item.commands.extractAndRegister,
      item.commands.postRegisterChecks,
      item.commands.runtimePreview,
      item.commands.runtimeVisual,
      item.commands.acceptanceRunway,
    ])}
    <h3>Mechanical Dry Run Only</h3>
    ${commandBlock([item.commands.mechanicalDryRunPreparePlan])}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Rigging Sprint</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
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
    <h1>Water 9 Rigging Sprint</h1>
    <p>Missing runtime registration handoff. Production extraction remains gated by human source approval.</p>
    <div class="summary">
      <span>missing runtime <strong>${report.summary.missingRuntimeTotal}</strong></span>
      <span>sprint size <strong>${report.summary.sprintSize}</strong></span>
      <span>source approved in sprint <strong>${report.summary.sourceApprovedInSprint}</strong></span>
      <span>plan artifacts staged <strong>${report.summary.planArtifactsStagedInSprint}</strong></span>
      <span>plan previews staged <strong>${report.summary.planPreviewsStagedInSprint}</strong></span>
    </div>
    <section class="card">
      <h2>Sprint Commands</h2>
      <h3>Review Every Source</h3>
      ${commandBlock([report.commands.sourceReviewAll])}
      <h3>Mechanical Dry Run Only</h3>
      ${commandBlock([report.commands.mechanicalDryRunAll])}
      <h3>Production Plan Prep For Approved Sources</h3>
      ${commandBlock([report.commands.productionPrepareApproved || '# no sprint sources are approved yet'])}
      <h3>Post-Registration Coverage</h3>
      ${commandBlock([report.commands.postRegisterCoverage])}
    </section>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

const runtimeCoverage = await readJson(paths.runtimeCoverage);
const riggingPacks = await readJson(paths.riggingPacks);
if (runtimeCoverage.schema !== 'water9/content-runtime-coverage@1') throw new Error(`Unexpected runtime coverage schema ${runtimeCoverage.schema ?? 'missing'}`);
if (riggingPacks.schema !== 'water9/rigging-focus-pack-index@1') throw new Error(`Unexpected rigging pack schema ${riggingPacks.schema ?? 'missing'}`);

const packById = new Map((riggingPacks.packs ?? []).map((pack) => [pack.id, pack]));
const missing = (runtimeCoverage.items ?? []).filter((item) => !item.runtimeRegistered);
const selected = missing.slice(0, Math.max(1, limit));
const selectedWithCommands = await Promise.all(selected.map(async (item) => {
  const plan = planPath(item.id);
  const planPreview = planPreviewPath(item.id);
  return {
    id: item.id,
    species: item.species,
    stage: packById.get(item.id)?.stage ?? item.stage,
    sourceApproved: item.sourceApproved,
    plan,
    planPreview,
    riggingPack: packById.get(item.id)?.markdown ?? `public/review/rigging-packs/${item.id}.md`,
    artifacts: {
      plan: await fileArtifact(plan),
      planPreview: await fileArtifact(planPreview),
    },
    commands: commandsFor(item),
  };
}));
const report = {
  schema: 'water9/content-rigging-sprint@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    runtimeCoverage: paths.runtimeCoverage,
    riggingPacks: paths.riggingPacks,
  },
  summary: {
    missingRuntimeTotal: missing.length,
    sprintSize: selected.length,
    sourceApprovedInSprint: selected.filter((item) => item.sourceApproved).length,
    productionReadyForPlanPrep: selected.filter((item) => item.sourceApproved).length,
    planArtifactsStagedInSprint: selectedWithCommands.filter((item) => item.artifacts.plan.exists).length,
    planPreviewsStagedInSprint: selectedWithCommands.filter((item) => item.artifacts.planPreview.exists).length,
  },
  commands: {
    sourceReviewAll: shellJoin(selectedWithCommands.map((item) => item.commands.sourceReview)) || emptyCommand('source review queue'),
    mechanicalDryRunAll: shellJoin(selectedWithCommands.map((item) => item.commands.mechanicalDryRunPreparePlan)) || emptyCommand('mechanical dry-run queue'),
    productionPrepareApproved: shellJoin(selectedWithCommands.filter((item) => item.sourceApproved).map((item) => item.commands.productionPreparePlan)),
    postRegisterCoverage: 'npm run articulated:check && npm run sandbox:index && npm run content:runtime-coverage && npm run content:runtime-coverage-check && npm run content:rigging-sprint && npm run content:rigging-sprint-check',
  },
  items: selectedWithCommands,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMd, markdownFor(report));
await writeFile(paths.outHtml, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  missingRuntimeTotal: report.summary.missingRuntimeTotal,
  sprintSize: report.summary.sprintSize,
  ids: report.items.map((item) => item.id),
  json: paths.outJson,
  markdown: paths.outMd,
  html: paths.outHtml,
}, null, 2));
