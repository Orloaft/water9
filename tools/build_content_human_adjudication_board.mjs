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
  cockpit: resolve(String(args.get('cockpit') ?? 'public/review/content-review-cockpit/manifest.json')),
  articulationRoster: resolve(String(args.get('articulation-roster') ?? 'public/review/content-articulation-roster.json')),
  sourceVisualBoard: resolve(String(args.get('source-visual-board') ?? 'public/review/source-visual-board.json')),
  sandboxManifest: resolve(String(args.get('sandbox-manifest') ?? 'public/review/sandbox/manifest.json')),
  outJson: resolve(String(args.get('out-json') ?? 'public/review/content-human-adjudication-board.json')),
  outMarkdown: resolve(String(args.get('out-md') ?? 'public/review/content-human-adjudication-board.md')),
  outHtml: resolve(String(args.get('out-html') ?? 'public/review/content-human-adjudication-board.html')),
};

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function mediaPresent(url) {
  if (!url || !url.startsWith('/')) return false;
  try {
    const path = resolve('public', url.slice(1));
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
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

function decisionCommand(commands, needle) {
  return (commands ?? []).find((command) => command.includes(needle) && command.includes('--dry-run')) ?? null;
}

function mediaUrlFromCockpit(cockpitItem, label) {
  return (cockpitItem?.media ?? []).find((media) => media.label === label)?.url ?? null;
}

function mediaTile(label, url, present) {
  if (!url) return '';
  return `<a class="tile" href="${htmlEscape(url)}" data-present="${present ? 'yes' : 'no'}">
      <span>${htmlEscape(label)}</span>
      <img src="${htmlEscape(url)}" alt="${htmlEscape(label)}">
    </a>`;
}

const signoff = await readJson(paths.signoff);
const cockpit = await readJson(paths.cockpit);
const articulationRoster = await readJson(paths.articulationRoster);
const sourceVisualBoard = await readJson(paths.sourceVisualBoard);
const sandboxManifest = await readJson(paths.sandboxManifest);

if (signoff?.schema !== 'water9/content-human-signoff-queue@1') throw new Error(`unexpected sign-off schema ${signoff?.schema ?? 'missing'}`);
if (cockpit?.schema !== 'water9/content-review-cockpit@1') throw new Error(`unexpected cockpit schema ${cockpit?.schema ?? 'missing'}`);
if (articulationRoster?.schema !== 'water9/content-articulation-roster@1') throw new Error(`unexpected articulation roster schema ${articulationRoster?.schema ?? 'missing'}`);
if (sourceVisualBoard?.schema !== 'water9/source-visual-board@1') throw new Error(`unexpected source visual board schema ${sourceVisualBoard?.schema ?? 'missing'}`);
if (sandboxManifest?.schema !== 'water9/sandbox-index@1') throw new Error(`unexpected sandbox manifest schema ${sandboxManifest?.schema ?? 'missing'}`);

const cockpitById = new Map((cockpit.pages ?? []).map((item) => [item.id, item]));
const articulationById = new Map((articulationRoster.items ?? []).map((item) => [item.id, item]));
const sourceVisualById = new Map((sourceVisualBoard.items ?? []).map((item) => [item.id, item]));
const sandboxById = new Map((sandboxManifest.entries ?? []).map((item) => [item.id, item]));

function sandboxBoundary(id) {
  const entry = sandboxById.get(id);
  return entry ? {
    id,
    reviewStage: entry.reviewStage ?? 'reference',
    qualityStatus: entry.qualityStatus ?? null,
    productionBoundary: entry.productionBoundary ?? null,
    acceptedForContentGate: Boolean(entry.acceptedForContentGate),
    previewOnly: entry.productionBoundary?.previewOnly === true,
    claim: entry.productionBoundary?.claim ?? null,
    manualReviewRequired: entry.productionBoundary?.manualReviewRequired ?? null,
    previewCommand: entry.previewCommand ?? null,
    pairedPreviewCommand: entry.pairedPreviewCommand ?? null,
  } : null;
}

const items = await Promise.all((signoff.items ?? []).map(async (signoffItem) => {
  const cockpitItem = cockpitById.get(signoffItem.id) ?? null;
  const articulationItem = articulationById.get(signoffItem.id) ?? null;
  const sourceVisualItem = sourceVisualById.get(signoffItem.id) ?? null;
  const evidence = signoffItem.evidence ?? {};
  const media = [
    { label: 'source art', url: evidence.sourceImage ?? articulationItem?.source?.url ?? sourceVisualItem?.media?.source ?? null },
    { label: 'magenta key preview', url: evidence.keyPreview ?? sourceVisualItem?.media?.keyPreview ?? null },
    { label: 'source sandbox preview', url: evidence.sourceSandboxScreenshot ?? mediaUrlFromCockpit(cockpitItem, 'source sandbox preview') },
    { label: 'articulation plan preview', url: evidence.planPreview ?? mediaUrlFromCockpit(cockpitItem, 'articulation plan preview') },
    { label: 'source parity overlay', url: evidence.sourceParity ?? mediaUrlFromCockpit(cockpitItem, 'source parity overlay') },
    { label: 'contact sheet', url: evidence.contactSheet ?? null },
    { label: 'phase strip', url: evidence.phaseStrip ?? null },
    { label: 'sandbox idle', url: mediaUrlFromCockpit(cockpitItem, 'sandbox idle') },
    { label: 'sandbox lunge', url: mediaUrlFromCockpit(cockpitItem, 'sandbox lunge') },
    { label: 'sandbox stunned', url: mediaUrlFromCockpit(cockpitItem, 'sandbox stunned') },
  ];
  const mediaWithPresence = await Promise.all(media.map(async (entry) => ({
    ...entry,
    present: await mediaPresent(entry.url),
  })));
  const sourceApprovalDryRun = decisionCommand(signoffItem.commands, 'npm run source:accept');
  const threatAcceptanceDryRun = decisionCommand(signoffItem.commands, 'npm run content:accept');
  const sourceReady = signoffItem.sourceApprovalReady === true
    && mediaWithPresence.slice(0, 4).every((entry) => entry.present)
    && Boolean(sourceApprovalDryRun);
  const threatReady = sourceReady
    && signoffItem.sourceApproved === true
    && signoffItem.rigEvidenceReady === true
    && mediaWithPresence.every((entry) => entry.present)
    && Boolean(threatAcceptanceDryRun);
  return {
    id: signoffItem.id,
    species: signoffItem.species,
    rank: signoffItem.rank,
    stage: signoffItem.stage,
    routeState: signoffItem.routeState,
    sourceApproved: Boolean(signoffItem.sourceApproved),
    sourceApprovalReady: Boolean(signoffItem.sourceApprovalReady),
    sourceMechanicallyReady: Boolean(signoffItem.sourceMechanicallyReady),
    sourceCriticRegenerationRequired: Boolean(signoffItem.sourceCriticRegenerationRequired),
    sourceApprovalRunwayState: signoffItem.sourceApprovalRunwayState ?? null,
    threatAccepted: Boolean(signoffItem.threatAccepted),
    countsTowardGate: Boolean(signoffItem.countsTowardGate),
    sourceReady,
    threatReady,
    media: mediaWithPresence,
    requiredRead: sourceVisualItem?.requiredRead ?? [],
    contractReviewChecklist: sourceVisualItem?.contractReviewChecklist ?? [],
    sourceChecks: signoffItem.sourceChecks ?? [],
    threatChecks: signoffItem.threatChecks ?? [],
    previewBoundaries: {
      source: sandboxBoundary(`source-${signoffItem.id}`),
      runtime: sandboxBoundary(signoffItem.id),
    },
    links: {
      cockpit: cockpitItem ? `/review/content-review-cockpit/${cockpitItem.href}` : null,
      sourceQuickReview: evidence.sourceQuickReview ?? null,
      sourceSandbox: articulationItem?.sandbox?.sourceUrl ?? cockpitItem?.links?.sourceSandbox ?? null,
      runtimeSandbox: evidence.sandboxPreview ?? cockpitItem?.links?.sideBySideSandbox ?? null,
      audit: evidence.auditHtml ?? null,
    },
    commands: {
      rebuild: 'npm run content:human-adjudication-board && npm run content:human-adjudication-board-check',
      cockpit: 'npm run content:review-cockpit && npm run content:review-cockpit-check',
      sourcePreview: articulationItem?.commands?.sourceSandboxPreview ?? `npm run sandbox:preview -- --id source-${signoffItem.id} --with diver --serve --open --visual`,
      runtimePreview: articulationItem?.commands?.pairedSandboxPreview ?? `npm run sandbox:preview -- --id ${signoffItem.id} --with diver --serve --open --visual`,
      sourceApprovalDryRun,
      threatAcceptanceDryRun,
    },
  };
}));

const summary = {
  targetThreats: signoff.summary?.targetThreats ?? 20,
  items: items.length,
  sourceReady: items.filter((item) => item.sourceReady).length,
  sourceApprovalReady: items.filter((item) => item.sourceApprovalReady && !item.sourceApproved).length,
  sourceCriticRegenerationRequired: items.filter((item) => item.sourceCriticRegenerationRequired && !item.sourceApproved).length,
  threatReady: items.filter((item) => item.threatReady).length,
  sourceApproved: items.filter((item) => item.sourceApproved).length,
  acceptedThreats: items.filter((item) => item.threatAccepted).length,
  allMediaPresent: items.filter((item) => item.media.every((entry) => entry.present)).length,
  sourceApprovalCommands: items.filter((item) => item.commands.sourceApprovalDryRun?.includes('--dry-run')).length,
  threatAcceptanceCommands: items.filter((item) => item.commands.threatAcceptanceDryRun?.includes('--dry-run')).length,
  sourcePreviewBoundaries: items.filter((item) => item.previewBoundaries.source?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length,
  runtimePreviewBoundaries: items.filter((item) => item.previewBoundaries.runtime?.productionBoundary?.schema === 'water9/sandbox-production-boundary@1').length,
  previewOnlySources: items.filter((item) => item.previewBoundaries.source?.previewOnly === true).length,
  previewOnlyRuntimes: items.filter((item) => item.previewBoundaries.runtime?.previewOnly === true).length,
  nextGate: signoff.summary?.nextGate ?? null,
};

const report = {
  schema: 'water9/content-human-adjudication-board@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    signoff: 'public/review/content-human-signoff-queue.json',
    cockpit: 'public/review/content-review-cockpit/manifest.json',
    articulationRoster: 'public/review/content-articulation-roster.json',
    sourceVisualBoard: 'public/review/source-visual-board.json',
  },
  policy: {
    humanReviewerRequired: true,
    automationCannotApprove: true,
    decisionCommandsAreDryRunOnly: true,
    sourceApprovalRequiredBeforeThreatAcceptance: true,
  },
  commands: [
    'npm run content:human-adjudication-board',
    'npm run content:human-adjudication-board-check',
    'npm run content:review-cockpit && npm run content:review-cockpit-check',
    'npm run content:goal-gate',
  ],
  summary,
  items,
};

function renderMarkdown() {
  const lines = [
    '# Water9 Human Adjudication Board',
    '',
    'Dense human review board for the 20-threat gate. It puts source art, magenta key, source sandbox, plan preview, source parity, contact sheet, phase strip, sandbox states, rubric checks, and dry-run decision commands in one place.',
    '',
    'Automation can gather evidence and produce dry-run commands; it cannot approve source art or accept threats.',
    '',
    `- Target threats: ${summary.targetThreats}`,
    `- Source-ready rows: ${summary.sourceReady}/${summary.items}`,
    `- Approval-ready sources: ${summary.sourceApprovalReady}/${summary.items}`,
    `- Critic-regeneration sources: ${summary.sourceCriticRegenerationRequired}/${summary.items}`,
    `- Threat-ready rows: ${summary.threatReady}/${summary.items}`,
    `- Rows with all media present: ${summary.allMediaPresent}/${summary.items}`,
    `- Source approvals: ${summary.sourceApproved}`,
    `- Accepted threats: ${summary.acceptedThreats}`,
    `- Source preview boundaries: ${summary.sourcePreviewBoundaries}/${summary.items}`,
    `- Runtime preview boundaries: ${summary.runtimePreviewBoundaries}/${summary.items}`,
    `- Preview-only sources: ${summary.previewOnlySources}/${summary.items}`,
    `- Preview-only runtimes: ${summary.previewOnlyRuntimes}/${summary.items}`,
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
    lines.push(`- sourceReady: ${item.sourceReady ? 'yes' : 'no'}`);
    lines.push(`- threatReady: ${item.threatReady ? 'yes' : 'no'}`);
    lines.push(`- media: ${item.media.filter((entry) => entry.present).length}/${item.media.length}`);
    lines.push(`- cockpit: ${item.links.cockpit ?? 'missing'}`);
    lines.push(`- source preview boundary: ${item.previewBoundaries.source?.claim ?? 'missing'}`);
    lines.push(`- runtime preview boundary: ${item.previewBoundaries.runtime?.claim ?? 'missing'}`);
    lines.push(`- source approval dry-run: \`${item.commands.sourceApprovalDryRun ?? 'missing'}\``);
    lines.push(`- threat acceptance dry-run: \`${item.commands.threatAcceptanceDryRun ?? 'missing'}\``);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function renderHtml() {
  const cards = items.map((item) => {
    const mediaTiles = item.media.map((entry) => mediaTile(entry.label, entry.url, entry.present)).join('');
    const requiredRead = item.requiredRead.map((text) => `<li>${htmlEscape(text)}</li>`).join('');
    const checklist = item.contractReviewChecklist.map((text) => `<li>${htmlEscape(text)}</li>`).join('');
    return `<article class="card" id="${htmlEscape(item.id)}" data-human-adjudication="${htmlEscape(item.id)}" data-source-ready="${item.sourceReady ? 'yes' : 'no'}" data-threat-ready="${item.threatReady ? 'yes' : 'no'}">
      <header>
        <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.id)}</code></div>
        <strong>${htmlEscape(item.routeState)}</strong>
      </header>
      <div class="badges">
        <span>source ready <strong>${item.sourceReady ? 'yes' : 'no'}</strong></span>
        <span>approval ready <strong>${item.sourceApprovalReady ? 'yes' : 'no'}</strong></span>
        <span>critic regeneration <strong>${item.sourceCriticRegenerationRequired ? 'yes' : 'no'}</strong></span>
        <span>threat ready <strong>${item.threatReady ? 'yes' : 'no'}</strong></span>
        <span>media <strong>${item.media.filter((entry) => entry.present).length}/${item.media.length}</strong></span>
        <span>accepted <strong>${item.threatAccepted ? 'yes' : 'no'}</strong></span>
      </div>
      <div class="boundary">
        <span>source preview boundary <strong>${htmlEscape(item.previewBoundaries.source?.claim ?? 'missing')}</strong></span>
        <span>runtime preview boundary <strong>${htmlEscape(item.previewBoundaries.runtime?.claim ?? 'missing')}</strong></span>
      </div>
      <div class="media">${mediaTiles}</div>
      <section class="notes">
        <div><h3>Required Read</h3><ul>${requiredRead}</ul></div>
        <div><h3>Contract Checks</h3><ul>${checklist}</ul></div>
      </section>
      <div class="links">
        <a href="${htmlEscape(item.links.cockpit ?? '#')}">cockpit</a>
        <a href="${htmlEscape(item.links.sourceQuickReview ?? '#')}">source review</a>
        <a href="${htmlEscape(item.links.sourceSandbox ?? '#')}">source sandbox</a>
        <a href="${htmlEscape(item.links.runtimeSandbox ?? '#')}">runtime sandbox</a>
        <a href="${htmlEscape(item.links.audit ?? '#')}">audit</a>
      </div>
      <h3>Preview Commands</h3>
      ${commandBlock([item.commands.sourcePreview, item.commands.runtimePreview])}
      <h3>Dry-Run Decision Commands</h3>
      ${commandBlock([item.commands.sourceApprovalDryRun, item.commands.threatAcceptanceDryRun])}
    </article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Water9 Human Adjudication Board</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#061014; color:#e5f6f8; }
      body { margin:0; background:#061014; }
      main { max-width:1440px; margin:0 auto; padding:28px 18px 48px; }
      h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4.2rem); letter-spacing:0; }
      h2 { margin:0; font-size:1.15rem; }
      h3 { margin:14px 0 8px; color:#9db7c2; font-size:.82rem; text-transform:uppercase; }
      p, li { color:#aec3ca; line-height:1.45; }
      code, pre { color:#cfeef6; overflow-wrap:anywhere; font-family:"SFMono-Regular", Consolas, monospace; }
      pre { margin:0; border:1px solid #203b46; background:#041014; padding:10px; white-space:pre-wrap; }
      .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:#f0d9aa; padding:10px 12px; margin:16px 0; }
      .summary, .badges, .links, .boundary { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0; }
      .summary span, .badges span, .boundary span { border:1px solid #294653; border-radius:6px; background:#0b1d24; padding:8px 10px; color:#bdd6df; }
      .boundary span { border-color:#6a5230; background:#1d1710; color:#f0d9aa; }
      .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(560px,1fr)); gap:14px; align-items:start; }
      .card { border:1px solid #203b46; background:#081920; border-radius:8px; padding:14px; }
      .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
      .media { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; margin:12px 0; }
      .tile { display:block; min-height:112px; border:1px solid #1f3a45; background:#030a0d; text-decoration:none; overflow:hidden; }
      .tile[data-present="no"] { opacity:.35; }
      .tile span { display:block; padding:5px 6px; color:#9db7c2; font-size:.72rem; }
      .tile img { display:block; width:100%; height:96px; object-fit:contain; background:#050b0e; }
      .notes { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      .links a { color:#7ee8ff; text-decoration:none; border:1px solid #244551; border-radius:5px; padding:6px 8px; }
      .links a:hover { text-decoration:underline; }
      @media (max-width:760px) { main { padding:18px 10px 32px; } .grid { grid-template-columns:1fr; } .media { grid-template-columns:repeat(2,minmax(0,1fr)); } .notes { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Human Adjudication Board</h1>
      <p>Dense human review board for the 20-threat gate: source art, magenta key, source sandbox, plan preview, parity, contact, phase, sandbox states, rubric checks, and dry-run decision commands.</p>
      <div class="notice">Human Approval Boundary: automation can assemble evidence and dry-run commands; only a human can approve source art or accept threats.</div>
      <div class="notice">Automation can gather evidence and produce dry-run commands; it cannot approve source art or accept threats.</div>
      <div class="summary">
        <span>${summary.sourceReady}/${summary.items} source-ready</span>
        <span>${summary.sourceApprovalReady}/${summary.items} approval-ready</span>
        <span>${summary.sourceCriticRegenerationRequired}/${summary.items} critic-regeneration</span>
        <span>${summary.threatReady}/${summary.items} threat-ready</span>
        <span>${summary.allMediaPresent}/${summary.items} all media present</span>
        <span>${summary.sourceApprovalCommands} source dry-runs</span>
        <span>${summary.threatAcceptanceCommands} threat dry-runs</span>
        <span>${summary.acceptedThreats} accepted threats</span>
        <span>${summary.sourcePreviewBoundaries}/${summary.items} source boundaries</span>
        <span>${summary.runtimePreviewBoundaries}/${summary.items} runtime boundaries</span>
        <span>${summary.previewOnlyRuntimes}/${summary.items} preview-only runtimes</span>
      </div>
      <h2>Commands</h2>
      ${commandBlock(report.commands)}
      <section class="grid">${cards}</section>
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
      sourceReady: summary.sourceReady,
      sourceApprovalReady: summary.sourceApprovalReady,
      sourceCriticRegenerationRequired: summary.sourceCriticRegenerationRequired,
      threatReady: summary.threatReady,
  allMediaPresent: summary.allMediaPresent,
  outJson: paths.outJson,
  outMarkdown: paths.outMarkdown,
  outHtml: paths.outHtml,
}, null, 2));
