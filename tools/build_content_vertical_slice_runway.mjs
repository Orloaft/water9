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
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-vertical-slice-runway.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-vertical-slice-runway.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-vertical-slice-runway.html')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  sourceVisualBoard: resolve(String(args.get('source-visual-board') ?? 'public/review/source-visual-board.json')),
  sourceReviewDossier: resolve(String(args.get('source-review-dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  sandboxQuickstart: resolve(String(args.get('sandbox-quickstart') ?? 'public/review/sandbox/quickstart.json')),
  runtimeVisualReport: resolve(String(args.get('runtime-visual-report') ?? 'tools/scratch/content-candidate-paired-visuals-report.json')),
  acceptanceAuditIndex: resolve(String(args.get('acceptance-audit-index') ?? 'public/review/content-acceptance-audits/index.json')),
  articulatedReview: resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json')),
  visualCohesion: resolve(String(args.get('visual-cohesion') ?? 'tools/scratch/articulated-visual-cohesion.json')),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fileEvidence(path) {
  const absolute = resolve(path);
  try {
    const info = await stat(absolute);
    return { path, absolute, exists: info.isFile(), bytes: info.size, mtimeMs: Math.round(info.mtimeMs) };
  } catch {
    return { path, absolute, exists: false, bytes: 0, mtimeMs: 0 };
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function publicUrl(path) {
  if (!path) return null;
  const text = String(path);
  if (text.startsWith('/')) return text;
  return `/${text.replace(/^public\//, '')}`;
}

function articulatedReviewPath(path) {
  return path ? `public/review/articulated/${path}` : null;
}

async function articulatedEvidence(path) {
  return path ? fileEvidence(articulatedReviewPath(path)) : { exists: false, bytes: 0 };
}

function dryRunCommand(command) {
  const text = String(command ?? '').trim();
  if (!text) return null;
  if (!text.includes('npm run source:accept ') && !text.includes('npm run content:accept ')) return text;
  return text.includes('--dry-run') ? text : `${text} --dry-run`;
}

function commandBlock(commands) {
  return commands.filter(Boolean).join('\n');
}

function routeState(item) {
  if (!item.contract.ready) return 'contract-blocked';
  if (!item.source.ready) return 'source-blocked';
  if (!item.sourceReview.readyForHumanReview) return 'review-evidence-blocked';
  if (!item.plan.ready) return 'plan-blocked';
  if (!item.rigQuality.ready) return 'rig-quality-blocked';
  if (!item.runtime.ready) return 'runtime-blocked';
  if (!item.runtimeVisual.ready) return 'runtime-visual-blocked';
  if (!item.audit.ready) return 'audit-blocked';
  if (!item.sourceReview.humanApproved) return 'awaiting-human-source-approval';
  if (!item.acceptance.accepted) return 'awaiting-human-threat-acceptance';
  return 'accepted';
}

function renderMarkdown(report) {
  const lines = [
    '# Water9 Content Vertical Slice Runway',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    'This is the per-creature route from source contract to magenta-key evidence, articulation plan, paired sandbox preview, and final human acceptance. Prototype screenshots do not count as accepted content.',
    '',
    `Threats: \`${report.summary.threats}\``,
    `Mechanically reviewable routes: \`${report.summary.mechanicallyReviewable}/${report.summary.threats}\``,
    `Accepted threats: \`${report.summary.acceptedThreats}/${report.summary.targetThreats}\``,
    `Next blocker: \`${report.summary.nextBlocker}\``,
    '',
    '## Commands',
    '',
    '```bash',
    ...report.commands,
    '```',
    '',
    '## Routes',
    '',
    '| Rank | Candidate | State | Contract | Source/Key | Plan | Rig Quality | Runtime Sandbox | Runtime Visuals | Audit | Blockers |',
    '| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const item of report.items) {
    lines.push(`| ${item.rank} | \`${item.id}\` ${item.species} | \`${item.routeState}\` | ${item.contract.ready ? 'yes' : 'no'} | ${item.source.ready ? 'yes' : 'no'} | ${item.plan.ready ? 'yes' : 'no'} | ${item.rigQuality.ready ? 'yes' : 'no'} | ${item.runtime.ready ? 'yes' : 'no'} | ${item.runtimeVisual.ready ? 'yes' : 'no'} | ${item.audit.ready ? 'yes' : 'no'} | ${item.blockers.join('<br>') || 'none'} |`);
  }
  lines.push('', '## Route Commands', '');
  for (const item of report.items) {
    lines.push(`### ${item.species}`, '', `Candidate: \`${item.id}\``, '', '```bash', ...item.commands, '```', '');
  }
  return `${lines.join('\n')}\n`;
}

function renderHtml(report) {
  const rows = report.items.map((item) => `<article class="route" data-vertical-slice-route="${htmlEscape(item.id)}">
    <header>
      <div><strong>${htmlEscape(item.species)}</strong><code>${htmlEscape(item.id)}</code></div>
      <span>${htmlEscape(item.routeState)}</span>
    </header>
    <div class="media">
      ${item.source.media.source ? `<img src="${htmlEscape(item.source.media.source)}" alt="${htmlEscape(item.species)} source">` : ''}
      ${item.source.media.keyPreview ? `<img src="${htmlEscape(item.source.media.keyPreview)}" alt="${htmlEscape(item.species)} key preview">` : ''}
      ${item.source.media.planPreview ? `<img src="${htmlEscape(item.source.media.planPreview)}" alt="${htmlEscape(item.species)} articulation plan">` : ''}
      ${item.rigQuality.media.contactThumb ? `<img src="${htmlEscape(item.rigQuality.media.contactThumb)}" alt="${htmlEscape(item.species)} contact sheet">` : ''}
      ${item.rigQuality.media.phaseThumb ? `<img src="${htmlEscape(item.rigQuality.media.phaseThumb)}" alt="${htmlEscape(item.species)} phase strip">` : ''}
      ${item.rigQuality.media.sourceParityThumb ? `<img src="${htmlEscape(item.rigQuality.media.sourceParityThumb)}" alt="${htmlEscape(item.species)} source parity">` : ''}
    </div>
    <dl>
      <dt>Contract</dt><dd>${item.contract.ready ? 'ready' : 'missing'} · <a href="${htmlEscape(item.contract.markdownUrl)}">md</a></dd>
      <dt>Source Review</dt><dd>${item.sourceReview.readyForHumanReview ? 'ready for human review' : 'blocked'} · ${item.sourceReview.humanApproved ? 'approved' : 'not approved'}</dd>
      <dt>Plan</dt><dd>${item.plan.ready ? 'ready' : 'blocked'} · ${htmlEscape(item.plan.plan ?? 'missing')}</dd>
      <dt>Rig Quality</dt><dd>${item.rigQuality.ready ? 'contact, phase, parity, and cohesion ready' : 'missing'} · ${item.rigQuality.humanReviewRequired ? 'human production approval still required' : 'no human review flag'}</dd>
      <dt>Runtime</dt><dd>${item.runtime.ready ? 'registered' : 'missing'} · ${htmlEscape(item.runtime.runtimeId ?? 'none')}</dd>
      <dt>Runtime Visuals</dt><dd>${item.runtimeVisual.ready ? `${htmlEscape(item.runtimeVisual.states.join(', '))} with diver` : 'missing'} · ${htmlEscape(item.runtimeVisual.screenshotPath ?? 'no screenshot')}</dd>
      <dt>Acceptance Audit</dt><dd>${item.audit.ready ? 'ready' : 'missing'} · ${item.audit.htmlHref ? `<a href="${htmlEscape(item.audit.htmlHref)}">html</a>` : 'no audit page'}</dd>
      <dt>Blockers</dt><dd>${htmlEscape(item.blockers.join('; ') || 'none')}</dd>
    </dl>
    <pre><code>${htmlEscape(commandBlock(item.commands))}</code></pre>
  </article>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water9 Content Vertical Slice Runway</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#24424b; --text:#e6f5f5; --muted:#9bb0b5; --accent:#7dd7e8; --warn:#e7bd6d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1420px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    p { color:var(--muted); max-width:880px; }
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
    .media { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:10px; }
    .media img { width:100%; height:128px; object-fit:contain; border:1px solid var(--line); background:#050b0d; }
    dl { display:grid; grid-template-columns:110px 1fr; gap:4px 10px; margin:0; }
    dt { color:var(--muted); }
    dd { margin:0; }
  </style>
</head>
<body>
  <main>
    <h1>Water9 Content Vertical Slice Runway</h1>
    <p>Per-threat proof chain for rapid content iteration. Every route must preserve the human approval boundary before it can count toward the 20-threat gate.</p>
    <pre><code>${htmlEscape(commandBlock(report.commands))}</code></pre>
    <div class="summary">
      <span>routes <strong>${report.summary.threats}</strong></span>
      <span>mechanically reviewable <strong>${report.summary.mechanicallyReviewable}/${report.summary.threats}</strong></span>
      <span>accepted <strong>${report.summary.acceptedThreats}/${report.summary.targetThreats}</strong></span>
      <span>next blocker <strong>${htmlEscape(report.summary.nextBlocker)}</strong></span>
    </div>
    <section class="grid">${rows}</section>
  </main>
</body>
</html>
`;
}

const sourceCandidates = await readJson(paths.sourceCandidates);
const stageBoard = await readJson(paths.stageBoard);
const sourceVisualBoard = await readJson(paths.sourceVisualBoard);
const sourceReviewDossier = await readJson(paths.sourceReviewDossier);
const planCoverage = await readJson(paths.planCoverage);
const sandboxQuickstart = await readJson(paths.sandboxQuickstart);
const runtimeVisualReport = await readJson(paths.runtimeVisualReport);
const acceptanceAuditIndex = await readJson(paths.acceptanceAuditIndex);
const articulatedReview = await readJson(paths.articulatedReview);
const visualCohesion = await readJson(paths.visualCohesion);

const visualById = new Map((sourceVisualBoard.items ?? []).map((item) => [item.id, item]));
const reviewById = new Map((sourceReviewDossier.readyReviewQueue ?? []).map((item) => [item.id, item]));
const planById = new Map((planCoverage.items ?? []).map((item) => [item.id, item]));
const sandboxById = new Map((sandboxQuickstart.entries ?? []).map((item) => [item.id, item]));
const candidateById = new Map((sourceCandidates.candidates ?? []).map((item) => [item.id, item]));
const runtimeVisualById = new Map((runtimeVisualReport.results ?? []).map((item) => [item.id, item]));
const acceptanceAuditById = new Map((acceptanceAuditIndex.items ?? []).map((item) => [item.id, item]));
const articulatedById = new Map((articulatedReview.creatures ?? []).map((item) => [item.id, item]));
const cohesionById = new Map((visualCohesion.creatures ?? []).map((item) => [item.id, item]));

const items = [];
for (const target of stageBoard.targets ?? []) {
  const candidate = candidateById.get(target.id) ?? {};
  const visual = visualById.get(target.id) ?? {};
  const review = reviewById.get(target.id) ?? {};
  const plan = planById.get(target.id) ?? {};
  const runtimeEntry = sandboxById.get(target.rigId ?? target.id) ?? {};
  const sourceEntry = sandboxById.get(`source-${target.id}`) ?? {};
  const runtimeVisual = runtimeVisualById.get(target.rigId ?? target.id) ?? {};
  const acceptanceAudit = acceptanceAuditById.get(target.id) ?? acceptanceAuditById.get(target.rigId ?? target.id) ?? {};
  const rig = articulatedById.get(target.rigId ?? target.id) ?? {};
  const cohesion = cohesionById.get(target.rigId ?? target.id) ?? {};
  const contractMd = `public/review/source-candidates/art-contracts/${target.id}.md`;
  const contractJson = `public/review/source-candidates/art-contracts/${target.id}.json`;
  const contractMdEvidence = await fileEvidence(contractMd);
  const contractJsonEvidence = await fileEvidence(contractJson);
  const sourceEvidence = visual.mediaEvidence?.source ?? await fileEvidence(candidate.source ?? `public/assets/generated/fauna-${target.id}-whole-source.png`);
  const keyEvidence = visual.mediaEvidence?.keyPreview ?? { exists: false, size: 0 };
  const sandboxEvidence = visual.mediaEvidence?.sandboxScreenshot ?? { exists: false, size: 0 };
  const planPreviewEvidence = visual.mediaEvidence?.planPreview ?? plan.artifacts?.planPreview ?? { exists: false, size: 0 };
  const runtimeStateEvidence = await Promise.all((runtimeVisual.states ?? []).map(async (state) => ({
    state: state.state,
    screenshotPath: state.screenshotPath,
    evidence: await fileEvidence(state.screenshotPath),
  })));
  const requiredRuntimeStates = ['idle', 'lunge', 'stunned'];
  const runtimeVisualStates = runtimeStateEvidence.map((state) => state.state).filter(Boolean);
  const runtimeVisualReady = runtimeVisual.companion === 'diver'
    && requiredRuntimeStates.every((state) => runtimeVisualStates.includes(state))
    && runtimeStateEvidence.every((state) => state.evidence.exists && state.evidence.bytes >= 512);
  const auditJsonEvidence = acceptanceAudit.auditJson ? await fileEvidence(acceptanceAudit.auditJson) : { exists: false, bytes: 0 };
  const auditMarkdownEvidence = acceptanceAudit.auditMarkdown ? await fileEvidence(acceptanceAudit.auditMarkdown) : { exists: false, bytes: 0 };
  const auditHtmlEvidence = acceptanceAudit.auditHtml ? await fileEvidence(acceptanceAudit.auditHtml) : { exists: false, bytes: 0 };
  const auditReady = Boolean(acceptanceAudit.id && auditJsonEvidence.exists && auditMarkdownEvidence.exists && auditHtmlEvidence.exists);
  const contactEvidence = await articulatedEvidence(rig.contactFile);
  const contactThumbEvidence = await articulatedEvidence(rig.contactThumbFile);
  const phaseEvidence = await articulatedEvidence(rig.phaseFile);
  const phaseThumbEvidence = await articulatedEvidence(rig.phaseThumbFile);
  const sourceParityEvidence = await articulatedEvidence(rig.sourceParityDebugFile);
  const sourceParityThumbEvidence = await articulatedEvidence(rig.sourceParityThumbFile);
  const requiredAcceptanceFlags = rig.requiredAcceptanceFlags ?? [];
  const requiredReviewFlags = ['--source-reviewed', '--contact-reviewed', '--phase-reviewed', '--parity-reviewed', '--sandbox-reviewed'];
  const requiredVisualChecks = [
    '--visual-check single-source-cohesion',
    '--visual-check readable-silhouette',
    '--visual-check anatomy-cohesion',
    '--visual-check production-visual-cohesion',
    '--visual-check socket-seams',
    '--visual-check motion-stability',
    '--visual-check sandbox-behavior',
  ];
  const rigQualityReady = Boolean(
    rig.id
      && contactEvidence.exists
      && contactThumbEvidence.exists
      && phaseEvidence.exists
      && phaseThumbEvidence.exists
      && sourceParityEvidence.exists
      && sourceParityThumbEvidence.exists
      && rig.sourceParity?.failures?.length === 0
      && (rig.autoVisualCohesion?.status ?? cohesion.status) === 'pass'
      && requiredReviewFlags.every((flag) => requiredAcceptanceFlags.includes(flag))
      && requiredVisualChecks.every((flag) => requiredAcceptanceFlags.includes(flag))
  );

  const blockers = [];
  if (!contractMdEvidence.exists || !contractJsonEvidence.exists) blockers.push('source art contract missing');
  if (!sourceEvidence.exists) blockers.push('source image missing');
  if (!keyEvidence.exists) blockers.push('magenta key preview missing');
  if (!sandboxEvidence.exists) blockers.push('source sandbox screenshot missing');
  if (!review.status) blockers.push('source review dossier entry missing');
  if (!plan.artifacts?.plan?.exists || !planPreviewEvidence.exists) blockers.push('articulation plan or preview missing');
  if (!runtimeEntry.id) blockers.push('paired runtime sandbox entry missing');
  if (!runtimeVisualReady) blockers.push('paired runtime visual evidence missing');
  if (!auditReady) blockers.push('acceptance audit evidence missing');
  if (!rigQualityReady) blockers.push('rig contact/phase/parity/cohesion evidence missing');
  if (!target.sourceApproved) blockers.push('human source approval missing');
  if (!target.accepted) blockers.push('human threat acceptance missing');

  const item = {
    rank: target.rank ?? items.length + 1,
    id: target.id,
    species: target.species,
    stage: target.stage,
    contract: {
      ready: contractMdEvidence.exists && contractJsonEvidence.exists,
      markdown: contractMd,
      json: contractJson,
      markdownUrl: publicUrl(contractMd),
      jsonUrl: publicUrl(contractJson),
      evidence: { markdown: contractMdEvidence, json: contractJsonEvidence },
    },
    source: {
      ready: Boolean(sourceEvidence.exists && keyEvidence.exists && sandboxEvidence.exists),
      status: candidate.status ?? target.sourceStatus ?? null,
      media: {
        source: visual.media?.source ?? publicUrl(candidate.source),
        keyPreview: visual.media?.keyPreview ?? null,
        sandboxScreenshot: visual.media?.sandboxScreenshot ?? null,
        planPreview: visual.media?.planPreview ?? publicUrl(plan.planPreview),
      },
      evidence: {
        source: sourceEvidence,
        keyPreview: keyEvidence,
        sandboxScreenshot: sandboxEvidence,
      },
    },
    sourceReview: {
      readyForHumanReview: Boolean(review.status === 'ready-for-human-review' || visual.readyForHumanReview),
      humanApproved: Boolean(target.sourceApproved || visual.humanApproved),
      quickReview: visual.links?.quickReview ?? null,
      acceptCommandDryRun: dryRunCommand(review.acceptCommand ?? target.nextCommands?.find((command) => command.includes('npm run source:accept'))),
      rejectCommandDryRun: dryRunCommand(review.rejectCommand),
    },
    plan: {
      ready: Boolean(plan.artifacts?.plan?.exists && planPreviewEvidence.exists),
      plan: plan.plan ?? null,
      planPreview: plan.planPreview ?? null,
      evidence: {
        plan: plan.artifacts?.plan ?? { exists: false, bytes: 0 },
        planPreview: planPreviewEvidence,
      },
      commands: plan.commands ?? {},
    },
    rigQuality: {
      ready: rigQualityReady,
      status: rig.quality?.status ?? null,
      sourceCohesion: rig.quality?.sourceCohesion ?? null,
      backgroundKey: rig.quality?.backgroundKey ?? null,
      humanReviewRequired: Boolean(rig.autoVisualCohesion?.productionStatus === 'requires-human-review' || cohesion.productionStatus === 'requires-human-review'),
      autoVisualCohesion: {
        status: rig.autoVisualCohesion?.status ?? cohesion.status ?? null,
        productionStatus: rig.autoVisualCohesion?.productionStatus ?? cohesion.productionStatus ?? null,
        failures: rig.autoVisualCohesion?.failures ?? cohesion.failures ?? [],
        warnings: rig.autoVisualCohesion?.warnings ?? cohesion.warnings ?? [],
      },
      sourceParity: {
        failures: rig.sourceParity?.failures ?? [],
        metrics: rig.sourceParity?.metrics ?? null,
      },
      reviewEvidenceChecklist: rig.reviewEvidenceChecklist ?? [],
      requiredAcceptanceFlags,
      media: {
        contactSheet: publicUrl(articulatedReviewPath(rig.contactFile)),
        contactThumb: publicUrl(articulatedReviewPath(rig.contactThumbFile)),
        phaseStrip: publicUrl(articulatedReviewPath(rig.phaseFile)),
        phaseThumb: publicUrl(articulatedReviewPath(rig.phaseThumbFile)),
        sourceParity: publicUrl(articulatedReviewPath(rig.sourceParityDebugFile)),
        sourceParityThumb: publicUrl(articulatedReviewPath(rig.sourceParityThumbFile)),
      },
      evidence: {
        contactSheet: contactEvidence,
        contactThumb: contactThumbEvidence,
        phaseStrip: phaseEvidence,
        phaseThumb: phaseThumbEvidence,
        sourceParity: sourceParityEvidence,
        sourceParityThumb: sourceParityThumbEvidence,
      },
    },
    runtime: {
      ready: Boolean(runtimeEntry.id && target.rigId),
      runtimeId: target.rigId ?? null,
      reviewStage: runtimeEntry.reviewStage ?? target.rigStatus ?? null,
      pairedPreviewCommand: runtimeEntry.pairedPreviewCommand ?? null,
      pairedVisualCheckCommand: runtimeEntry.pairedVisualCheckCommand ?? null,
      pairedUrl: runtimeEntry.pairedUrl ?? null,
    },
    runtimeVisual: {
      ready: runtimeVisualReady,
      report: paths.runtimeVisualReport,
      companion: runtimeVisual.companion ?? null,
      url: runtimeVisual.url ?? null,
      screenshotPath: runtimeVisual.screenshotPath ?? null,
      states: runtimeVisualStates,
      evidence: runtimeStateEvidence,
      acceptanceNotice: runtimeVisual.acceptanceNotice ?? null,
    },
    audit: {
      ready: auditReady,
      stage: acceptanceAudit.stage ?? null,
      countsTowardGate: Boolean(acceptanceAudit.countsTowardGate),
      auditJson: acceptanceAudit.auditJson ?? null,
      auditMarkdown: acceptanceAudit.auditMarkdown ?? null,
      auditHtml: acceptanceAudit.auditHtml ?? null,
      auditJsonHref: acceptanceAudit.auditJsonHref ?? null,
      auditMarkdownHref: acceptanceAudit.auditMarkdownHref ?? null,
      auditHtmlHref: acceptanceAudit.auditHtmlHref ?? null,
      evidence: {
        json: auditJsonEvidence,
        markdown: auditMarkdownEvidence,
        html: auditHtmlEvidence,
      },
    },
    acceptance: {
      accepted: Boolean(target.accepted),
      countsTowardGate: Boolean(target.accepted),
      acceptanceAuditCommand: `npm run content:acceptance-audit -- --id ${target.rigId ?? target.id}`,
      finalGateCommand: 'npm run content:goal-gate',
    },
    commands: [
      `npm run source:contracts && npm run source:contracts-check`,
      `npm run source:image-check -- --id ${target.id}`,
      sourceEntry.pairedPreviewCommand,
      plan.commands?.planCheck,
      plan.commands?.planPreview,
      plan.commands?.extractDryRun,
      'npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview',
      runtimeEntry.pairedPreviewCommand,
      runtimeEntry.pairedVisualCheckCommand,
      'npm run sandbox:visual -- --ids ' + (target.rigId ?? target.id) + ' --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json',
      dryRunCommand(review.acceptCommand ?? target.nextCommands?.find((command) => command.includes('npm run source:accept'))),
      `npm run content:acceptance-audit -- --id ${target.rigId ?? target.id}`,
      'npm run content:goal-gate',
    ].filter(Boolean),
    blockers,
  };
  item.routeState = routeState(item);
  item.mechanicallyReviewable = item.contract.ready && item.source.ready && item.sourceReview.readyForHumanReview && item.plan.ready && item.rigQuality.ready && item.runtime.ready && item.runtimeVisual.ready && item.audit.ready;
  items.push(item);
}

const mechanicallyReviewable = items.filter((item) => item.mechanicallyReviewable).length;
const acceptedThreats = items.filter((item) => item.acceptance.accepted).length;
const summary = {
  targetThreats: stageBoard.summary?.targetThreats ?? 20,
  threats: items.length,
  mechanicallyReviewable,
  acceptedThreats,
  sourceApproved: items.filter((item) => item.sourceReview.humanApproved).length,
  nextBlocker: items.find((item) => !item.acceptance.accepted)?.routeState ?? 'complete',
  allRoutesHaveContract: items.every((item) => item.contract.ready),
  allRoutesHaveSourceEvidence: items.every((item) => item.source.ready),
  allRoutesHavePlans: items.every((item) => item.plan.ready),
  allRoutesHaveRigQualityEvidence: items.every((item) => item.rigQuality.ready),
  allRoutesHaveSandbox: items.every((item) => item.runtime.ready),
  allRoutesHaveRuntimeVisualEvidence: items.every((item) => item.runtimeVisual.ready),
  allRoutesHaveAcceptanceAudits: items.every((item) => item.audit.ready),
};

const report = {
  schema: 'water9/content-vertical-slice-runway@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    sourceCandidates: paths.sourceCandidates,
    stageBoard: paths.stageBoard,
    sourceVisualBoard: paths.sourceVisualBoard,
    sourceReviewDossier: paths.sourceReviewDossier,
    planCoverage: paths.planCoverage,
    sandboxQuickstart: paths.sandboxQuickstart,
    runtimeVisualReport: paths.runtimeVisualReport,
    acceptanceAuditIndex: paths.acceptanceAuditIndex,
    articulatedReview: paths.articulatedReview,
    visualCohesion: paths.visualCohesion,
  },
  summary,
  commands: [
    'npm run content:vertical-slice',
    'npm run content:vertical-slice-check',
    'npm run source:contracts && npm run source:contracts-check',
    'npm run source:visual-board && npm run source:visual-board-check',
    'npm run content:plan-coverage && npm run content:plan-coverage-check',
    'npm run articulated:source-parity && npm run articulated:visual-cohesion && npm run articulated:preview',
    'npm run sandbox:quickstart && npm run sandbox:quickstart-check',
    'npm run sandbox:visual -- --ids <runtime-id> --states idle,lunge,stunned --with diver --out-dir tools/scratch/content-candidate-paired-visuals --report tools/scratch/content-candidate-paired-visuals-report.json',
    'npm run content:acceptance-audit-index && npm run content:acceptance-audit-index-check',
    'npm run content:goal-gate',
  ],
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, renderMarkdown(report));
await writeFile(paths.outHtml, renderHtml(report));
console.log(JSON.stringify({
  schema: 'water9/content-vertical-slice-runway-build@1',
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
  summary,
}, null, 2));
