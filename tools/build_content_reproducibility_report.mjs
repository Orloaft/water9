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
  articulationRoster: resolve(String(args.get('articulation-roster') ?? 'public/review/content-articulation-roster.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-reproducibility.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/content-reproducibility.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-reproducibility.html')),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fileEvidence(path, minBytes = 128) {
  if (!path) return { path: null, exists: false, bytes: 0, ok: false };
  try {
    const info = await stat(resolve(path));
    return { path, exists: info.isFile(), bytes: info.size, ok: info.isFile() && info.size >= minBytes };
  } catch {
    return { path, exists: false, bytes: 0, ok: false };
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

function extractApplyCommand(command) {
  return String(command ?? '').replace(/\s+--dry-run\b/u, '').trim();
}

function requiredCommandsFor(item) {
  return {
    sourceContracts: item.commands?.sourceContracts ?? 'npm run source:contracts && npm run source:contracts-check',
    sourcePreview: item.commands?.sourceSandboxPreview,
    mechanicalPrepare: item.commands?.mechanicalPrepare,
    planCheck: item.commands?.planCheck,
    planPreview: item.commands?.planPreview,
    extractDryRun: item.commands?.extractDryRun,
    extractApply: extractApplyCommand(item.commands?.extractDryRun),
    sourceParity: item.commands?.sourceParity,
    visualCohesion: item.commands?.visualCohesion,
    pairedSandboxPreview: item.commands?.pairedSandboxPreview,
    pairedSandboxVisual: item.commands?.pairedSandboxVisual,
  };
}

function markdownFor(report) {
  const rows = report.items.map((item) => `| ${item.id} | ${item.reproducible ? 'yes' : 'no'} | ${item.source.backgroundKey ?? 'missing'} | ${item.evidence.artContract.ok ? 'yes' : 'no'} | ${item.evidence.starterPlan.ok ? 'yes' : 'no'} | ${item.evidence.planPreview.ok ? 'yes' : 'no'} | ${item.runtime.registered ? 'yes' : 'no'} | ${item.blockers.join('; ') || 'none'} |`).join('\n');
  return `# Water 9 Content Reproducibility

This report proves the current 20 target threats have a repeatable path from magenta source image to articulated runtime preview. It does not approve source art or accept threats.

## Summary

- Target threats: ${report.summary.targetThreats}
- Reproducible targets: ${report.summary.reproducibleTargets}
- Magenta sources: ${report.summary.magentaSources}
- Art contracts: ${report.summary.artContracts}
- Starter plans: ${report.summary.starterPlans}
- Plan previews: ${report.summary.planPreviews}
- Runtime registered: ${report.summary.runtimeRegistered}

## Commands

\`\`\`bash
npm run content:reproducibility
npm run content:reproducibility-check
npm run source:contracts && npm run source:contracts-check
npm run articulated:extract-plan -- --plan tools/scratch/<id>-starter-plan.json --dry-run
npm run sandbox:preview -- --id <id> --with diver --serve --open --visual
\`\`\`

## Targets

| Target | Reproducible | Source key | Contract | Plan | Plan preview | Runtime | Blockers |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
${rows}
`;
}

function htmlFor(report) {
  const cards = report.items.map((item) => `<article data-reproducibility-target="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${item.reproducible ? 'reproducible' : 'blocked'}</strong>
    </header>
    <div class="grid">
      <span>source key <strong>${htmlEscape(item.source.backgroundKey ?? 'missing')}</strong></span>
      <span>contract <strong>${item.evidence.artContract.ok ? 'yes' : 'no'}</strong></span>
      <span>starter plan <strong>${item.evidence.starterPlan.ok ? 'yes' : 'no'}</strong></span>
      <span>runtime <strong>${item.runtime.registered ? 'yes' : 'no'}</strong></span>
    </div>
    <h3>Evidence</h3>
    <ul>
      ${Object.entries(item.evidence).map(([key, value]) => `<li><code>${htmlEscape(key)}</code>: ${value.ok ? 'ok' : 'missing'} ${value.path ? `<code>${htmlEscape(value.path)}</code>` : ''}</li>`).join('')}
    </ul>
    <h3>Commands</h3>
    ${commandBlock(Object.values(item.commands))}
    ${item.blockers.length ? `<h3>Blockers</h3><ul>${item.blockers.map((blocker) => `<li>${htmlEscape(blocker)}</li>`).join('')}</ul>` : ''}
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Content Reproducibility</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:14px 0 8px; color:var(--muted); font-size:13px; text-transform:uppercase; }
    p { color:var(--muted); }
    article { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; margin:12px 0; }
    article header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .summary, .grid { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span, .grid span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    strong { color:var(--text); }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Content Reproducibility</h1>
    <p>Target-scoped audit for regenerating magenta source art into articulated runtime previews. This page does not approve source art or accept threats.</p>
    ${commandBlock([
      'npm run content:reproducibility',
      'npm run content:reproducibility-check',
      'npm run articulated:extract-plan -- --plan tools/scratch/<id>-starter-plan.json --dry-run',
      'npm run sandbox:preview -- --id <id> --with diver --serve --open --visual',
    ])}
    <div class="summary">
      <span>target threats <strong>${report.summary.targetThreats}</strong></span>
      <span>reproducible <strong>${report.summary.reproducibleTargets}</strong></span>
      <span>magenta sources <strong>${report.summary.magentaSources}</strong></span>
      <span>runtime registered <strong>${report.summary.runtimeRegistered}</strong></span>
    </div>
    ${cards}
  </main>
</body>
</html>
`;
}

const articulationRoster = await readJson(paths.articulationRoster);
if (articulationRoster.schema !== 'water9/content-articulation-roster@1') {
  throw new Error(`Unexpected content articulation roster schema ${articulationRoster.schema ?? 'missing'}`);
}
const sourceCandidates = await readJson(paths.sourceCandidates);
if (sourceCandidates.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidates schema ${sourceCandidates.schema ?? 'missing'}`);
}
const sourceById = new Map((sourceCandidates.candidates ?? []).map((candidate) => [candidate.id, candidate]));

const items = [];
for (const item of articulationRoster.items ?? []) {
  const sourceCandidate = sourceById.get(item.id);
  const commands = requiredCommandsFor(item);
  const evidence = {
    source: await fileEvidence(item.artifacts?.source?.path, 512),
    keyPreview: await fileEvidence(item.artifacts?.keyPreview?.path, 512),
    artContract: await fileEvidence(item.artifacts?.artContract?.path, 512),
    starterPlan: await fileEvidence(item.artifacts?.plan?.path, 512),
    planPreview: await fileEvidence(item.artifacts?.planPreview?.path, 512),
    sourceParity: await fileEvidence(item.artifacts?.sourceParity?.path, 512),
    contactSheet: await fileEvidence(item.artifacts?.contactSheet?.path, 512),
    phaseStrip: await fileEvidence(item.artifacts?.phaseStrip?.path, 512),
  };
  const commandValues = Object.values(commands).map((command) => String(command ?? '').trim());
  const blockers = [];
  if (item.source?.backgroundKey !== 'magenta') blockers.push('source background key is not magenta');
  for (const [key, value] of Object.entries(evidence)) {
    if (!value.ok) blockers.push(`${key} evidence is missing`);
  }
  for (const [key, command] of Object.entries(commands)) {
    if (!String(command ?? '').trim()) blockers.push(`${key} command is missing`);
  }
  if (!commands.extractDryRun?.includes('--dry-run')) blockers.push('extract dry-run command must include --dry-run');
  if (commands.extractApply?.includes('--dry-run')) blockers.push('extract apply command must not include --dry-run');
  if (!commands.pairedSandboxPreview?.includes('--with diver')) blockers.push('paired sandbox preview must include diver');
  if (!commands.pairedSandboxVisual?.includes('--states idle,lunge,stunned') || !commands.pairedSandboxVisual?.includes('--with diver')) {
    blockers.push('paired sandbox visual must include idle/lunge/stunned with diver');
  }
  const runtimeRegistered = Boolean(item.runtimeRegistered ?? item.checks?.runtimeRegistered);
  if (!runtimeRegistered) blockers.push('runtime creature is not registered');
  if (!sourceCandidate?.source) blockers.push('source candidate manifest is missing source');
  const reproducible = blockers.length === 0;
  items.push({
    id: item.id,
    species: item.species,
    reproducible,
    source: {
      path: sourceCandidate?.source ?? item.source?.path ?? null,
      backgroundKey: item.source?.backgroundKey ?? sourceCandidate?.backgroundKey ?? null,
      approved: Boolean(item.sourceApproved),
    },
    runtime: {
      id: item.id,
      registered: runtimeRegistered,
      accepted: Boolean(item.threatAccepted),
    },
    evidence,
    commands: Object.fromEntries(Object.entries(commands).filter(([, command]) => String(command ?? '').trim())),
    commandCount: commandValues.filter(Boolean).length,
    blockers,
  });
}

const report = {
  schema: 'water9/content-reproducibility@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    articulationRoster: paths.articulationRoster,
    sourceCandidates: paths.sourceCandidates,
  },
  policy: {
    reportDoesNotApproveSources: true,
    reportDoesNotAcceptThreats: true,
    humanApprovalStillRequired: true,
  },
  summary: {
    targetThreats: articulationRoster.summary?.targetThreats ?? items.length,
    items: items.length,
    reproducibleTargets: items.filter((item) => item.reproducible).length,
    magentaSources: items.filter((item) => item.source.backgroundKey === 'magenta').length,
    artContracts: items.filter((item) => item.evidence.artContract.ok).length,
    starterPlans: items.filter((item) => item.evidence.starterPlan.ok).length,
    planPreviews: items.filter((item) => item.evidence.planPreview.ok).length,
    runtimeRegistered: items.filter((item) => item.runtime.registered).length,
    sourceApproved: items.filter((item) => item.source.approved).length,
    acceptedThreats: items.filter((item) => item.runtime.accepted).length,
  },
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMd, markdownFor(report));
await writeFile(paths.outHtml, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  targetThreats: report.summary.targetThreats,
  reproducibleTargets: report.summary.reproducibleTargets,
  json: paths.outJson,
  markdown: paths.outMd,
  html: paths.outHtml,
}, null, 2));
