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
  signoff: resolve(String(args.get('signoff') ?? 'public/review/content-human-signoff-queue.json')),
  candidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  sandboxRoster: resolve(String(args.get('sandbox-roster') ?? 'public/review/content-sandbox-roster.json')),
  riggingPackIndex: resolve(String(args.get('rigging-pack-index') ?? 'public/review/rigging-packs/index.json')),
  visualCohesion: resolve(String(args.get('visual-cohesion') ?? 'tools/scratch/articulated-visual-cohesion.json')),
  outJson: resolve(String(args.get('out-json') ?? 'public/review/content-articulation-roster.json')),
  outMarkdown: resolve(String(args.get('out-md') ?? 'public/review/content-articulation-roster.md')),
  outHtml: resolve(String(args.get('out-html') ?? 'public/review/content-articulation-roster.html')),
};

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function artifact(path) {
  if (!path) return { path: null, exists: false, bytes: 0 };
  try {
    const info = await stat(path);
    return { path, exists: info.isFile(), bytes: info.size };
  } catch {
    return { path, exists: false, bytes: 0 };
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

function publicPath(path) {
  if (!path) return null;
  if (path.startsWith('public/')) return `/${path.slice('public/'.length)}`;
  return path;
}

function shellAnd(commands) {
  return commands.filter(Boolean).join(' && ');
}

const signoff = await readJson(paths.signoff);
const candidates = await readJson(paths.candidates);
const planCoverage = await readJson(paths.planCoverage);
const sandboxRoster = await readJson(paths.sandboxRoster);
const riggingPackIndex = await readJson(paths.riggingPackIndex);
const visualCohesion = await readJson(paths.visualCohesion, { creatures: [] });

if (signoff?.schema !== 'water9/content-human-signoff-queue@1') throw new Error(`unexpected sign-off schema ${signoff?.schema ?? 'missing'}`);
if (candidates?.schema !== 'water9/source-candidates@1') throw new Error(`unexpected source candidates schema ${candidates?.schema ?? 'missing'}`);
if (planCoverage?.schema !== 'water9/content-plan-coverage@1') throw new Error(`unexpected plan coverage schema ${planCoverage?.schema ?? 'missing'}`);
if (sandboxRoster?.schema !== 'water9/content-sandbox-roster@1') throw new Error(`unexpected sandbox roster schema ${sandboxRoster?.schema ?? 'missing'}`);
if (riggingPackIndex?.schema !== 'water9/rigging-focus-pack-index@1') throw new Error(`unexpected rigging pack index schema ${riggingPackIndex?.schema ?? 'missing'}`);

const candidateById = new Map((candidates.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const planById = new Map((planCoverage.items ?? []).map((item) => [item.id, item]));
const sandboxById = new Map((sandboxRoster.items ?? []).map((item) => [item.id, item]));
const riggingPackById = new Map((riggingPackIndex.packs ?? []).map((pack) => [pack.id, pack]));
const cohesionById = new Map((visualCohesion.creatures ?? []).map((creature) => [creature.id, creature]));

const items = await Promise.all((signoff.items ?? []).map(async (signoffItem) => {
  const candidate = candidateById.get(signoffItem.id) ?? null;
  const plan = planById.get(signoffItem.id) ?? null;
  const sandbox = sandboxById.get(signoffItem.id) ?? null;
  const riggingPack = riggingPackById.get(signoffItem.id) ?? null;
  const cohesion = cohesionById.get(signoffItem.id) ?? null;
  const keyPreview = signoffItem.evidence?.keyPreview ?? `/review/source-candidates/key-previews/${signoffItem.id}-key-preview.png`;
  const sourceParity = signoffItem.evidence?.sourceParity ?? `/review/articulated/source-parity/${signoffItem.id}-source-parity.png`;
  const contactSheet = signoffItem.evidence?.contactSheet ?? `/review/articulated/${signoffItem.id}-contact.png`;
  const phaseStrip = signoffItem.evidence?.phaseStrip ?? `/review/articulated/${signoffItem.id}-phase.png`;
  const artContractJson = `public/review/source-candidates/art-contracts/${signoffItem.id}.json`;
  const sourceArtifact = await artifact(candidate?.source ?? plan?.source ?? null);
  const keyArtifact = await artifact(`public${keyPreview}`);
  const planArtifact = await artifact(plan?.plan ?? null);
  const planPreviewArtifact = await artifact(plan?.planPreview ?? null);
  const sourceParityArtifact = await artifact(`public${sourceParity}`);
  const contactArtifact = await artifact(`public${contactSheet}`);
  const phaseArtifact = await artifact(`public${phaseStrip}`);
  const artContractArtifact = await artifact(artContractJson);
  const commands = {
    sourceContracts: 'npm run source:contracts && npm run source:contracts-check',
    sourceReview: plan?.commands?.sourceReview ?? `npm run source:review-queue:preview -- --id ${signoffItem.id}`,
    mechanicalPrepare: plan?.commands?.mechanicalPrepare ?? `npm run articulated:prepare-plan -- --id ${signoffItem.id} --plan tools/scratch/${signoffItem.id}-starter-plan.json --preview public/review/articulated/${signoffItem.id}-plan-preview.png --allow-unapproved`,
    planCheck: plan?.commands?.planCheck ?? `npm run articulated:plan-check -- --plan tools/scratch/${signoffItem.id}-starter-plan.json`,
    planPreview: plan?.commands?.planPreview ?? `npm run articulated:plan-preview -- --plan tools/scratch/${signoffItem.id}-starter-plan.json --out public/review/articulated/${signoffItem.id}-plan-preview.png`,
    extractDryRun: plan?.commands?.extractDryRun ?? `npm run articulated:extract-plan -- --plan tools/scratch/${signoffItem.id}-starter-plan.json --dry-run`,
    sourceParity: 'npm run articulated:source-parity',
    visualCohesion: 'npm run articulated:visual-cohesion',
    pairedSandboxPreview: sandbox?.runtime?.pairedPreviewCommand ?? `npm run sandbox:preview -- --id ${signoffItem.id} --with diver --serve --open --visual`,
    pairedSandboxVisual: sandbox?.runtime?.pairedVisualCheckCommand ?? `npm run sandbox:visual -- --ids ${signoffItem.id} --states idle,lunge,stunned --with diver`,
    sourceSandboxPreview: sandbox?.source?.pairedPreviewCommand ?? `npm run sandbox:preview -- --id source-${signoffItem.id} --with diver --serve --open --visual`,
    sourceApprovalDryRun: riggingPack ? (await readJson(riggingPack.json, { commands: {} }))?.commands?.sourceApprovalDryRun : null,
    threatAcceptanceDryRun: riggingPack ? (await readJson(riggingPack.json, { commands: {} }))?.commands?.threatAcceptanceDryRun : null,
  };
  const checks = {
    sourcePresent: sourceArtifact.exists,
    magentaKeyDeclared: candidate?.backgroundKey === 'magenta',
    keyPreviewPresent: keyArtifact.exists,
    artContractPresent: artContractArtifact.exists,
    starterPlanPresent: planArtifact.exists,
    planPreviewPresent: planPreviewArtifact.exists,
    extractDryRunAvailable: Boolean(commands.extractDryRun?.includes('--dry-run')),
    runtimeRegistered: plan?.runtimeRegistered === true,
    riggingPackPresent: Boolean(riggingPack),
    sourceParityPresent: sourceParityArtifact.exists,
    visualCohesionPassed: cohesion?.status === 'pass',
    contactSheetPresent: contactArtifact.exists,
    phaseStripPresent: phaseArtifact.exists,
    pairedRuntimeSandboxPresent: Boolean(sandbox?.runtime?.pairedPreviewCommand?.includes('--with diver')),
    pairedSourceSandboxPresent: Boolean(sandbox?.source?.pairedPreviewCommand?.includes('--with diver')),
    humanSourceSignoffPending: signoffItem.sourceApproved !== true,
    humanThreatSignoffPending: signoffItem.threatAccepted !== true,
  };
  const mechanicallyReady = [
    checks.sourcePresent,
    checks.magentaKeyDeclared,
    checks.keyPreviewPresent,
    checks.artContractPresent,
    checks.starterPlanPresent,
    checks.planPreviewPresent,
    checks.extractDryRunAvailable,
    checks.runtimeRegistered,
    checks.riggingPackPresent,
    checks.sourceParityPresent,
    checks.visualCohesionPassed,
    checks.contactSheetPresent,
    checks.phaseStripPresent,
    checks.pairedRuntimeSandboxPresent,
    checks.pairedSourceSandboxPresent,
  ].every(Boolean);
  return {
    id: signoffItem.id,
    species: signoffItem.species,
    stage: signoffItem.stage,
    sourceApproved: Boolean(signoffItem.sourceApproved),
    threatAccepted: Boolean(signoffItem.threatAccepted),
    mechanicallyReady,
    nextGate: signoffItem.routeState,
    source: {
      path: candidate?.source ?? plan?.source ?? null,
      url: publicPath(candidate?.source ?? plan?.source ?? null),
      backgroundKey: candidate?.backgroundKey ?? null,
      keyPreview,
      artContract: publicPath(artContractJson),
    },
    artifacts: {
      source: sourceArtifact,
      keyPreview: keyArtifact,
      artContract: artContractArtifact,
      plan: planArtifact,
      planPreview: planPreviewArtifact,
      sourceParity: sourceParityArtifact,
      contactSheet: contactArtifact,
      phaseStrip: phaseArtifact,
    },
    review: {
      sourceChecks: signoffItem.sourceChecks ?? [],
      threatChecks: signoffItem.threatChecks ?? [],
      visualCohesionStatus: cohesion?.status ?? null,
      visualCohesionWarnings: cohesion?.warnings?.length ?? 0,
      visualCohesionFailures: cohesion?.failures?.length ?? 0,
    },
    sandbox: {
      runtimeUrl: sandbox?.runtime?.pairedUrl ?? null,
      sourceUrl: sandbox?.source?.pairedUrl ?? null,
    },
    checks,
    commands,
  };
}));

const summary = {
  targetThreats: signoff.summary?.targetThreats ?? 20,
  items: items.length,
  mechanicallyReady: items.filter((item) => item.mechanicallyReady).length,
  magentaSourceImages: items.filter((item) => item.checks.magentaKeyDeclared).length,
  keyPreviews: items.filter((item) => item.checks.keyPreviewPresent).length,
  artContracts: items.filter((item) => item.checks.artContractPresent).length,
  starterPlans: items.filter((item) => item.checks.starterPlanPresent).length,
  planPreviews: items.filter((item) => item.checks.planPreviewPresent).length,
  sourceParity: items.filter((item) => item.checks.sourceParityPresent).length,
  visualCohesionPasses: items.filter((item) => item.checks.visualCohesionPassed).length,
  pairedRuntimeSandbox: items.filter((item) => item.checks.pairedRuntimeSandboxPresent).length,
  pairedSourceSandbox: items.filter((item) => item.checks.pairedSourceSandboxPresent).length,
  sourceApproved: items.filter((item) => item.sourceApproved).length,
  acceptedThreats: items.filter((item) => item.threatAccepted).length,
  nextGate: signoff.summary?.nextGate ?? null,
};

const report = {
  schema: 'water9/content-articulation-roster@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    signoff: 'public/review/content-human-signoff-queue.json',
    candidates: 'public/review/source-candidates/source-candidates.json',
    planCoverage: 'public/review/content-plan-coverage.json',
    sandboxRoster: 'public/review/content-sandbox-roster.json',
    riggingPackIndex: 'public/review/rigging-packs/index.json',
    visualCohesion: 'tools/scratch/articulated-visual-cohesion.json',
  },
  commands: [
    'npm run source:contracts && npm run source:contracts-check',
    'npm run content:plan-coverage && npm run content:plan-coverage-check',
    'npm run content:rigging-pack && npm run content:rigging-pack-check',
    'npm run articulated:extract-plan -- --plan <plan.json> --dry-run',
    'npm run articulated:source-parity',
    'npm run articulated:visual-cohesion',
    'npm run sandbox:preview -- --id <entity-id> --with diver --serve --open --visual',
    'npm run content:articulation-roster && npm run content:articulation-roster-check',
  ],
  summary,
  items,
};

function renderMarkdown() {
  const lines = [
    '# Water9 Content Articulation Roster',
    '',
    'Source-to-articulation quality path for the 20-threat gate. This proves each target has a reviewable magenta-key source, starter plan, plan preview, extract dry-run command, parity/cohesion evidence, and paired-diver sandbox route.',
    '',
    'Previewable and extractable still does not mean accepted. Human source approval and human threat acceptance remain required.',
    '',
    `- Target threats: ${summary.targetThreats}`,
    `- Mechanically ready: ${summary.mechanicallyReady}/${summary.items}`,
    `- Magenta-key source images: ${summary.magentaSourceImages}`,
    `- Key previews: ${summary.keyPreviews}`,
    `- Art contracts: ${summary.artContracts}`,
    `- Starter plans: ${summary.starterPlans}`,
    `- Plan previews: ${summary.planPreviews}`,
    `- Source parity overlays: ${summary.sourceParity}`,
    `- Visual cohesion passes: ${summary.visualCohesionPasses}`,
    `- Paired runtime sandbox routes: ${summary.pairedRuntimeSandbox}`,
    `- Paired source sandbox routes: ${summary.pairedSourceSandbox}`,
    '',
    '## Commands',
    '',
    ...report.commands.map((command) => `- \`${command}\``),
    '',
    '## Targets',
    '',
  ];
  for (const item of items) {
    lines.push(`### \`${item.id}\` ${item.species}`);
    lines.push('');
    lines.push(`- mechanicallyReady: ${item.mechanicallyReady ? 'yes' : 'no'}`);
    lines.push(`- source: \`${item.source.path ?? 'missing'}\``);
    lines.push(`- background key: \`${item.source.backgroundKey ?? 'missing'}\``);
    lines.push(`- plan: \`${item.artifacts.plan.path ?? 'missing'}\``);
    lines.push(`- plan preview: \`${item.artifacts.planPreview.path ?? 'missing'}\``);
    lines.push(`- source parity: \`${item.artifacts.sourceParity.path ?? 'missing'}\``);
    lines.push(`- source review: \`${item.commands.sourceReview}\``);
    lines.push(`- prepare: \`${item.commands.mechanicalPrepare}\``);
    lines.push(`- plan check: \`${item.commands.planCheck}\``);
    lines.push(`- plan preview: \`${item.commands.planPreview}\``);
    lines.push(`- extract dry-run: \`${item.commands.extractDryRun}\``);
    lines.push(`- runtime sandbox: \`${item.commands.pairedSandboxPreview}\``);
    lines.push(`- source sandbox: \`${item.commands.sourceSandboxPreview}\``);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function renderHtml() {
  const rows = items.map((item) => `
        <tr data-articulation-roster="${htmlEscape(item.id)}" data-ready="${item.mechanicallyReady ? 'yes' : 'no'}">
          <td><code>${htmlEscape(item.id)}</code><br>${htmlEscape(item.species)}</td>
          <td>${item.mechanicallyReady ? 'yes' : 'no'}</td>
          <td>${htmlEscape(item.source.backgroundKey ?? 'missing')}<br><a href="${htmlEscape(item.source.url ?? '#')}">source</a><br><code>${htmlEscape(item.source.path ?? 'missing')}</code><br><a href="${htmlEscape(item.source.keyPreview)}">key preview</a></td>
          <td><a href="${htmlEscape(publicPath(item.artifacts.planPreview.path) ?? '#')}">plan preview</a><br><a href="${htmlEscape(publicPath(item.artifacts.sourceParity.path) ?? '#')}">source parity</a></td>
          <td>${item.review.visualCohesionStatus ?? 'missing'}</td>
          <td><a href="${htmlEscape(item.sandbox.runtimeUrl ?? '#')}">runtime with diver</a><br><a href="${htmlEscape(item.sandbox.sourceUrl ?? '#')}">source with diver</a></td>
          <td>${commandBlock([item.commands.mechanicalPrepare, item.commands.planCheck, item.commands.planPreview, item.commands.extractDryRun])}</td>
          <td>${commandBlock([item.commands.sourceParity, item.commands.visualCohesion, item.commands.pairedSandboxPreview, item.commands.sourceSandboxPreview, item.commands.pairedSandboxVisual])}</td>
        </tr>`).join('');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Water9 Content Articulation Roster</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#061014; color:#e5f6f8; }
      body { margin:0; background:#061014; }
      main { max-width:1320px; margin:0 auto; padding:28px 18px 48px; }
      h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4.2rem); letter-spacing:0; }
      p { color:#9db7c2; line-height:1.5; }
      .summary { display:flex; flex-wrap:wrap; gap:10px; margin:18px 0; }
      .summary span { border:1px solid #294653; border-radius:6px; background:#0b1d24; padding:8px 10px; color:#bdd6df; }
      .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:#f0d9aa; padding:10px 12px; margin:16px 0; }
      table { width:100%; border-collapse:collapse; border:1px solid #203b46; background:#081920; }
      th, td { border-bottom:1px solid #18303a; padding:9px 10px; text-align:left; vertical-align:top; }
      th { position:sticky; top:0; background:#10242c; z-index:1; }
      code, pre { color:#cfeef6; overflow-wrap:anywhere; font-family:"SFMono-Regular", Consolas, monospace; }
      pre { white-space:pre-wrap; margin:0; }
      a { color:#7ee8ff; text-decoration:none; }
      a:hover { text-decoration:underline; }
      @media (max-width:760px) { main { padding:18px 10px 32px; } table { font-size:.82rem; } th,td { padding:7px 6px; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Content Articulation Roster</h1>
      <p>Source-to-articulation quality path for all 20 target threats: magenta-key source, art contract, plan, extract dry-run, parity/cohesion evidence, and paired-diver sandbox review.</p>
      <div class="notice">Previewable and extractable still does not mean accepted. Human source approval and final threat acceptance remain separate gates.</div>
      <div class="summary">
        <span>${summary.mechanicallyReady}/${summary.items} mechanically ready</span>
        <span>${summary.magentaSourceImages} magenta-key sources</span>
        <span>${summary.starterPlans} starter plans</span>
        <span>${summary.planPreviews} plan previews</span>
        <span>${summary.sourceParity} source parity overlays</span>
        <span>${summary.visualCohesionPasses} visual cohesion passes</span>
        <span>${summary.acceptedThreats} accepted threats</span>
      </div>
      <h2>Batch Command</h2>
      ${commandBlock([shellAnd(report.commands)])}
      <table>
        <thead><tr><th>Target</th><th>Ready</th><th>Source</th><th>Plan Evidence</th><th>Cohesion</th><th>Sandbox</th><th>Plan Commands</th><th>Review Commands</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </main>
  </body>
</html>
`;
}

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, renderMarkdown());
await writeFile(paths.outHtml, renderHtml());

console.log(JSON.stringify({
  schema: report.schema,
  items: summary.items,
  mechanicallyReady: summary.mechanicallyReady,
  nextGate: summary.nextGate,
  outJson: paths.outJson,
  outMarkdown: paths.outMarkdown,
  outHtml: paths.outHtml,
}, null, 2));
