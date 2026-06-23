import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
  verticalSlice: resolve(String(args.get('vertical-slice') ?? 'public/review/content-vertical-slice-runway.json')),
  sourceApprovalRunway: resolve(String(args.get('source-approval-runway') ?? 'public/review/source-approval-runway.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-human-signoff-queue.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-human-signoff-queue.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-human-signoff-queue.html')),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function commandBlock(commands) {
  return commands.filter(Boolean).join('\n');
}

function queueStage(item, sourceApproval) {
  if (item.acceptance?.accepted) return 'accepted';
  if (!item.sourceReview?.humanApproved && !sourceApproval?.readyForHumanReview && sourceApproval?.criticRegenerationRequired) return 'source-regeneration';
  if (!item.sourceReview?.humanApproved && !sourceApproval?.readyForHumanReview) return 'source-blocked';
  if (!item.sourceReview?.humanApproved) return 'source-signoff';
  return 'threat-signoff';
}

function itemBlockers(item, sourceApproval) {
  const blockers = [];
  if (!item.mechanicallyReviewable) blockers.push('mechanical evidence route is incomplete');
  if (!item.sourceReview?.humanApproved && sourceApproval?.criticRegenerationRequired) blockers.push('critic regeneration required before human source approval');
  if (!item.sourceReview?.humanApproved && !sourceApproval?.readyForHumanReview && !sourceApproval?.criticRegenerationRequired) blockers.push('source approval runway evidence is incomplete');
  if (!item.sourceReview?.humanApproved) blockers.push('human source approval missing');
  if (!item.acceptance?.accepted) blockers.push('human threat acceptance missing');
  return blockers;
}

function renderMarkdown(report) {
  const lines = [
    '# Water9 Human Content Sign-Off Queue',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    'This queue is the human-only sign-off surface for the 20-threat content gate. Automation can package evidence and run dry-runs; it cannot approve source art or accept threats.',
    '',
    `Items: \`${report.summary.items}\``,
    `Ready for source sign-off: \`${report.summary.readyForSourceSignoff}\``,
    `Source regeneration required: \`${report.summary.sourceRegenerationRequired}\``,
    `Source blocked before sign-off: \`${report.summary.sourceBlockedBeforeSignoff}\``,
    `Ready for threat sign-off: \`${report.summary.readyForThreatSignoff}\``,
    `Accepted threats: \`${report.summary.acceptedThreats}/${report.summary.targetThreats}\``,
    `Next gate: \`${report.summary.nextGate}\``,
    '',
    '## Commands',
    '',
    '```bash',
    ...report.commands,
    '```',
    '',
    '## Queue',
    '',
    '| Rank | Candidate | Stage | Source Review | Rig Evidence | Audit | Blockers |',
    '| ---: | --- | --- | --- | --- | --- | --- |',
  ];
  for (const item of report.items) {
    lines.push(`| ${item.rank} | \`${item.id}\` ${item.species} | \`${item.stage}\` | ${item.evidence.sourceQuickReview ? `[review](${item.evidence.sourceQuickReview})` : 'missing'} | ${item.rigEvidenceReady ? 'ready' : 'missing'} | ${item.evidence.auditHtml ? `[audit](${item.evidence.auditHtml})` : 'missing'} | ${item.blockers.join('<br>') || 'none'} |`);
  }
  lines.push('', '## Per-Candidate Dry Runs', '');
  for (const item of report.items) {
    lines.push(`### ${item.species}`, '', `Candidate: \`${item.id}\``, '', '```bash', ...item.commands, '```', '');
  }
  return `${lines.join('\n')}\n`;
}

function renderHtml(report) {
  const cards = report.items.map((item) => `<article class="route" data-human-signoff-route="${htmlEscape(item.id)}">
    <header>
      <div><strong>${htmlEscape(item.species)}</strong><code>${htmlEscape(item.id)}</code></div>
      <span>${htmlEscape(item.stage)}</span>
    </header>
    <div class="media">
      ${item.evidence.sourceImage ? `<img src="${htmlEscape(item.evidence.sourceImage)}" alt="${htmlEscape(item.species)} source">` : ''}
      ${item.evidence.keyPreview ? `<img src="${htmlEscape(item.evidence.keyPreview)}" alt="${htmlEscape(item.species)} key preview">` : ''}
      ${item.evidence.contactThumb ? `<img src="${htmlEscape(item.evidence.contactThumb)}" alt="${htmlEscape(item.species)} contact sheet">` : ''}
      ${item.evidence.phaseThumb ? `<img src="${htmlEscape(item.evidence.phaseThumb)}" alt="${htmlEscape(item.species)} phase strip">` : ''}
      ${item.evidence.sourceParityThumb ? `<img src="${htmlEscape(item.evidence.sourceParityThumb)}" alt="${htmlEscape(item.species)} source parity">` : ''}
    </div>
    <dl>
      <dt>Policy</dt><dd>human reviewer required; dry-run commands only</dd>
      <dt>Source</dt><dd>${item.sourceApproved ? 'approved' : item.sourceApprovalReady ? 'approval-ready' : item.sourceCriticRegenerationRequired ? 'critic regeneration required' : 'blocked'} · ${item.evidence.sourceQuickReview ? `<a href="${htmlEscape(item.evidence.sourceQuickReview)}">quick review</a>` : 'missing'} · <a href="${htmlEscape(item.evidence.sourceApprovalRunway)}">source approval runway</a>${item.evidence.sourceCriticRegenerationQueue ? ` · <a href="${htmlEscape(item.evidence.sourceCriticRegenerationQueue)}">regeneration queue</a>` : ''}</dd>
      <dt>Rig</dt><dd>${item.rigEvidenceReady ? 'contact, phase, parity, sandbox ready' : 'blocked'} · ${item.evidence.sandboxPreview ? `<a href="${htmlEscape(item.evidence.sandboxPreview)}">sandbox</a>` : 'missing'}</dd>
      <dt>Audit</dt><dd>${item.evidence.auditHtml ? `<a href="${htmlEscape(item.evidence.auditHtml)}">audit</a>` : 'missing'} · ${item.countsTowardGate ? 'counts toward gate' : 'does not count yet'}</dd>
      <dt>Blockers</dt><dd>${htmlEscape(item.blockers.join('; ') || 'none')}</dd>
    </dl>
    <pre><code>${htmlEscape(commandBlock(item.commands))}</code></pre>
  </article>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water9 Human Content Sign-Off Queue</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#92aab0; --accent:#7adff6; --warn:#e6bd70; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1420px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    p { max-width:900px; color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:12px 0 0; padding:10px; border:1px solid var(--line); background:#050b0d; overflow:auto; white-space:pre-wrap; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:18px 0 24px; }
    .summary span { border:1px solid var(--line); background:#09161a; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:14px; }
    .route { border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:14px; }
    .route header { display:flex; justify-content:space-between; gap:12px; margin-bottom:10px; }
    .route header code { display:block; color:var(--muted); margin-top:2px; }
    .route header span { color:var(--warn); }
    .media { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-bottom:10px; }
    .media img { width:100%; height:108px; object-fit:contain; border:1px solid var(--line); background:#050b0d; }
    dl { display:grid; grid-template-columns:100px 1fr; gap:4px 10px; margin:0; }
    dt { color:var(--muted); }
    dd { margin:0; }
  </style>
</head>
<body>
  <main>
    <h1>Water9 Human Content Sign-Off Queue</h1>
    <p>Human-only approval surface for the 20-threat gate. This page packages source art, rig-quality evidence, sandbox review, audits, and dry-run approval commands without granting acceptance automatically.</p>
    <pre><code>${htmlEscape(commandBlock(report.commands))}</code></pre>
    <div class="summary">
      <span>items <strong>${report.summary.items}</strong></span>
      <span>source sign-off <strong>${report.summary.readyForSourceSignoff}</strong></span>
      <span>critic regeneration <strong>${report.summary.sourceRegenerationRequired}</strong></span>
      <span>source blocked <strong>${report.summary.sourceBlockedBeforeSignoff}</strong></span>
      <span>threat sign-off <strong>${report.summary.readyForThreatSignoff}</strong></span>
      <span>accepted <strong>${report.summary.acceptedThreats}/${report.summary.targetThreats}</strong></span>
      <span>next gate <strong>${htmlEscape(report.summary.nextGate)}</strong></span>
    </div>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

const verticalSlice = await readJson(paths.verticalSlice);
const sourceApprovalRunway = await readJson(paths.sourceApprovalRunway);
if (verticalSlice.schema !== 'water9/content-vertical-slice-runway@1') {
  throw new Error(`Unexpected vertical slice schema ${verticalSlice.schema ?? 'missing'}`);
}
if (sourceApprovalRunway.schema !== 'water9/source-approval-runway@1') {
  throw new Error(`Unexpected source approval runway schema ${sourceApprovalRunway.schema ?? 'missing'}`);
}

const sourceApprovalById = new Map((sourceApprovalRunway.items ?? []).map((item) => [item.id, item]));

const items = await Promise.all((verticalSlice.items ?? []).map(async (item) => {
  const sourceApproval = sourceApprovalById.get(item.id) ?? {};
  const sourceApproved = Boolean(item.sourceReview?.humanApproved);
  const sourceApprovalReady = sourceApproved || sourceApproval.readyForHumanReview === true;
  const stage = queueStage(item, sourceApproval);
  let threatAcceptDryRun = null;
  if (item.audit?.auditJson) {
    try {
      const audit = await readJson(resolve(item.audit.auditJson));
      threatAcceptDryRun = audit.threat?.acceptanceCommandDryRun ?? null;
    } catch {
      threatAcceptDryRun = null;
    }
  }
  return {
    rank: item.rank,
    id: item.id,
    species: item.species,
    stage,
    routeState: item.routeState,
    sourceApproved,
    sourceApprovalReady,
    sourceMechanicallyReady: Boolean(sourceApproval.mechanicallyReadyForHumanReview),
    sourceCriticRegenerationRequired: Boolean(sourceApproval.criticRegenerationRequired),
    sourceApprovalRunwayState: {
      readyForHumanReview: Boolean(sourceApproval.readyForHumanReview),
      mechanicallyReadyForHumanReview: Boolean(sourceApproval.mechanicallyReadyForHumanReview),
      criticRegenerationRequired: Boolean(sourceApproval.criticRegenerationRequired),
      reviewWarning: sourceApproval.reviewWarning ?? null,
      criticRegeneration: sourceApproval.criticRegeneration ?? null,
    },
    threatAccepted: Boolean(item.acceptance?.accepted),
    countsTowardGate: Boolean(item.acceptance?.countsTowardGate),
    mechanicallyReviewable: Boolean(item.mechanicallyReviewable),
    rigEvidenceReady: Boolean(item.rigQuality?.ready && item.runtimeVisual?.ready && item.audit?.ready),
    policy: {
      humanReviewerRequired: true,
      automationCannotApprove: true,
      commandsAreDryRunOnly: true,
      requiresSourceBeforeThreatAcceptance: true,
    },
    evidence: {
      sourceQuickReview: item.sourceReview?.quickReview ?? null,
      sourceApprovalRunway: '/review/source-approval-runway.html',
      sourceCriticRegenerationQueue: sourceApproval.criticRegenerationRequired ? '/review/source-candidates/source-critic-regeneration-queue.html' : null,
      sourceImage: item.source?.media?.source ?? null,
      keyPreview: item.source?.media?.keyPreview ?? null,
      sourceSandboxScreenshot: item.source?.media?.sandboxScreenshot ?? null,
      planPreview: item.source?.media?.planPreview ?? null,
      contactSheet: item.rigQuality?.media?.contactSheet ?? null,
      contactThumb: item.rigQuality?.media?.contactThumb ?? null,
      phaseStrip: item.rigQuality?.media?.phaseStrip ?? null,
      phaseThumb: item.rigQuality?.media?.phaseThumb ?? null,
      sourceParity: item.rigQuality?.media?.sourceParity ?? null,
      sourceParityThumb: item.rigQuality?.media?.sourceParityThumb ?? null,
      sandboxPreview: item.runtime?.pairedUrl ?? null,
      runtimeVisualScreenshot: item.runtimeVisual?.screenshotPath ?? null,
      auditHtml: item.audit?.auditHtmlHref ?? null,
      auditMarkdown: item.audit?.auditMarkdownHref ?? null,
    },
    sourceChecks: [
      'whole-creature-cohesion',
      'part-continuity-cohesion',
      'readable-silhouette',
      'no-collage-artifacts',
      'non-placeholder-art-direction',
      'crop-safe-anatomy',
      'clean-magenta-key',
      'gameplay-read',
      'neutral-riggable-pose',
      'visible-attack-lane',
    ],
    threatChecks: [
      'single-source-cohesion',
      'readable-silhouette',
      'anatomy-cohesion',
      'production-visual-cohesion',
      'socket-seams',
      'motion-stability',
      'sandbox-behavior',
    ],
    commands: [
      'npm run content:human-signoff && npm run content:human-signoff-check',
      item.commands?.find((command) => String(command).startsWith('npm run source:image-check')) ?? null,
      item.commands?.find((command) => String(command).includes('source-') && String(command).includes('sandbox:preview')) ?? null,
      item.commands?.find((command) => String(command).includes('articulated:source-parity')) ?? null,
      item.runtime?.pairedPreviewCommand ?? null,
      item.runtime?.pairedVisualCheckCommand ?? null,
      item.sourceReview?.acceptCommandDryRun ?? null,
      item.sourceReview?.rejectCommandDryRun ?? null,
      sourceApproval.criticRegeneration?.commands?.generateOpenAiDryRun ?? null,
      sourceApproval.criticRegeneration?.commands?.dryRunReplace ?? null,
      sourceApproval.criticRegeneration?.commands?.sourcePreview ?? null,
      threatAcceptDryRun,
      `npm run content:acceptance-audit -- --id ${item.runtime?.runtimeId ?? item.id}`,
      item.acceptance?.finalGateCommand ?? 'npm run content:goal-gate',
    ].filter(Boolean),
    blockers: itemBlockers(item, sourceApproval),
  };
}));

for (const item of items) {
  for (const command of item.commands) {
    if ((command.includes('npm run source:accept ') || command.includes('npm run content:accept ')) && !command.includes('--dry-run')) {
      throw new Error(`${item.id}: human sign-off queue can only render dry-run decision commands`);
    }
  }
}

const acceptedThreats = items.filter((item) => item.threatAccepted).length;
const sourceApproved = items.filter((item) => item.sourceApproved).length;
const summary = {
  targetThreats: verticalSlice.summary?.targetThreats ?? 20,
  items: items.length,
  readyForSourceSignoff: items.filter((item) => item.sourceApprovalReady && !item.sourceApproved).length,
  sourceRegenerationRequired: items.filter((item) => item.sourceCriticRegenerationRequired && !item.sourceApproved).length,
  sourceBlockedBeforeSignoff: items.filter((item) => !item.sourceApprovalReady && !item.sourceApproved).length,
  sourceApproved,
  readyForThreatSignoff: items.filter((item) => item.sourceApproved && !item.threatAccepted).length,
  acceptedThreats,
  nextGate: acceptedThreats >= (verticalSlice.summary?.targetThreats ?? 20)
    ? 'complete'
    : (items.some((item) => item.sourceCriticRegenerationRequired && !item.sourceApproved) ? 'critic-source-regeneration' : sourceApproved < items.length ? 'human-source-signoff' : 'human-threat-signoff'),
  allItemsHaveDryRunCommands: items.every((item) => item.commands.every((command) => !command.includes('npm run source:accept ') && !command.includes('npm run content:accept ') || command.includes('--dry-run'))),
  allItemsHaveEvidenceLinks: items.every((item) => item.evidence.sourceQuickReview && item.evidence.contactSheet && item.evidence.phaseStrip && item.evidence.sourceParity && item.evidence.auditHtml),
};

const report = {
  schema: 'water9/content-human-signoff-queue@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: { verticalSlice: paths.verticalSlice, sourceApprovalRunway: paths.sourceApprovalRunway },
  summary,
  commands: [
    'npm run content:human-signoff',
    'npm run content:human-signoff-check',
    'npm run content:vertical-slice && npm run content:vertical-slice-check',
    'npm run source:approval-runway && npm run source:approval-runway-check',
    'npm run source:critic-regeneration && npm run source:critic-regeneration-check',
    'npm run content:goal-gate',
  ],
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, renderMarkdown(report));
await writeFile(paths.outHtml, renderHtml(report));
console.log(JSON.stringify({
  schema: 'water9/content-human-signoff-queue-build@1',
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
  summary,
}, null, 2));
