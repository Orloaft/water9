import { createHash } from 'node:crypto';
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
  sequencer: resolve(String(args.get('sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json')),
  targetPacket: resolve(String(args.get('target-packet') ?? 'public/review/source-candidates/source-review-target-packet.json')),
  criticHealth: resolve(String(args.get('critic-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  inboxPreviewDir: resolve(String(args.get('inbox-preview-dir') ?? 'public/review/source-candidates/regeneration-inbox')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-regeneration-workspace.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-regeneration-workspace.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-regeneration-workspace.html')),
};

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readTextOptional(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

async function fileFingerprint(path) {
  try {
    const bytes = await readFile(path);
    const info = await stat(path);
    return {
      exists: info.isFile(),
      path: repoRelative(path),
      size: info.size,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  } catch {
    return {
      exists: false,
      path: repoRelative(path),
      size: 0,
      sha256: null,
    };
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function repoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function publicUrl(path) {
  const relative = repoRelative(path);
  return relative.startsWith('public/') ? `/${relative.slice('public/'.length)}` : relative;
}

function commandBoundaryFor(lane) {
  if (lane === 'approval-ready') {
    return 'The replacement is already applied and mechanically ready for source review. Do not regenerate or overwrite source art from this workspace; inspect the approval runway and visual board next.';
  }
  if (lane === 'regenerate-distinct-ready') {
    return 'A distinct replacement is ready. Run replacement ingest only as a dry run first, then apply after previewing rebuilt evidence.';
  }
  if (lane?.startsWith('regenerate-')) {
    return 'No source overwrite ingest commands are allowed from this workspace until the critic health report says distinct-replacement-ready.';
  }
  return 'This workspace is only for regeneration lanes. It does not approve source art or accept threats.';
}

function commandsFor(target, healthItem) {
  const commands = {
    openPrompt: target.recommendedFirst ?? healthItem?.commands?.openPrompt ?? null,
    markImagegen: healthItem?.commands?.markImagegen ?? `npm run source:imagegen-mark -- --id ${target.id}`,
    checkImagegen: healthItem?.commands?.checkImagegen ?? `npm run source:imagegen-status -- --id ${target.id}`,
    captureManual: healthItem?.commands?.captureManual ?? `npm run source:inbox-capture -- --id ${target.id} --open`,
    recoverSavedImage: healthItem?.commands?.recoverSavedImage ?? `npm run source:recover-inline -- --id ${target.id} --image <saved-image-path> --copy --validate`,
    generateOpenAiDryRun: healthItem?.commands?.generateOpenAiDryRun ?? `npm run source:generate-openai -- --id ${target.id} --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite`,
    generateOpenAiApply: healthItem?.commands?.generateOpenAiApply ?? `npm run source:generate-openai -- --id ${target.id} --queue public/review/source-candidates/source-critic-regeneration-queue.json --apply --overwrite`,
    validateInbox: healthItem?.commands?.validateInbox ?? `python3 tools/validate_source_candidate_images.py --id ${target.id} --image tools/source-inbox/${target.id}.png`,
    rebuildHealth: 'npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check',
    rebuildSequencer: 'npm run source:review-sequencer && npm run source:review-sequencer-check',
    rebuildTargetPacket: 'npm run source:review-target-packet && npm run source:review-target-packet-check',
    sourcePreview: healthItem?.commands?.sourcePreview ?? `npm run sandbox:preview -- --id source-${target.id} --with diver --serve --open --visual`,
    dryRunReplace: healthItem?.commands?.dryRunReplace ?? `npm run source:ingest -- --id ${target.id} --image tools/source-inbox/${target.id}.png --copy --overwrite --dry-run`,
    applyReplace: healthItem?.commands?.applyReplace ?? `npm run source:ingest -- --id ${target.id} --image tools/source-inbox/${target.id}.png --copy --overwrite`,
    rebuildApprovalRunway: 'npm run source:approval-runway && npm run source:approval-runway-check',
    rebuildVisualBoard: 'npm run source:visual-board && npm run source:visual-board-check',
    rebuildReviewSession: 'npm run content:review-session && npm run content:review-session-check',
  };
  const approvalCommands = [
    commands.rebuildHealth,
    commands.rebuildApprovalRunway,
    commands.rebuildSequencer,
    commands.rebuildTargetPacket,
    commands.rebuildVisualBoard,
    commands.rebuildReviewSession,
    commands.sourcePreview,
  ].filter(Boolean);
  const replacementCommands = [
    commands.openPrompt,
    commands.markImagegen,
    commands.checkImagegen,
    commands.captureManual,
    commands.recoverSavedImage,
    commands.generateOpenAiDryRun,
    commands.generateOpenAiApply,
    commands.validateInbox,
    commands.rebuildHealth,
    commands.rebuildSequencer,
    commands.rebuildTargetPacket,
  ].filter(Boolean);
  const distinctCommands = [
    commands.validateInbox,
    commands.dryRunReplace,
    commands.sourcePreview,
    commands.applyReplace,
    commands.rebuildHealth,
    commands.rebuildSequencer,
    commands.rebuildTargetPacket,
  ].filter(Boolean);
  return {
    ...commands,
    safeNext: target.lane === 'approval-ready'
      ? approvalCommands
      : target.lane === 'regenerate-distinct-ready'
        ? distinctCommands
        : replacementCommands,
  };
}

function markdown(report) {
  const target = report.target;
  return `# Water 9 Source Regeneration Workspace

Generated: \`${report.generatedAt}\`

Focused regeneration workspace for the current source-review sequencer target. This workspace does not approve source art, does not accept threats, and does not count preview-only work toward the 20-threat gate.

## Target

- Candidate: \`${target.id}\` ${target.species}
- Lane: \`${target.lane}\`
- Status: \`${target.status}\`
- Health status: \`${target.healthStatus ?? 'none'}\`
- Replacement matches current source: \`${target.replacementMatchesCurrentSource}\`
- Distinct replacement ready: \`${target.distinctReplacementReady}\`
- Replacement applied: \`${target.replacementApplied}\`

## Command Boundary

${report.commandBoundary}

## Source / Inbox Fingerprints

| File | Exists | Size | SHA-256 |
| --- | --- | ---: | --- |
| \`${target.source.path}\` | \`${target.source.exists}\` | \`${target.source.size}\` | \`${target.source.sha256 ?? 'missing'}\` |
| \`${target.inbox.path}\` | \`${target.inbox.exists}\` | \`${target.inbox.size}\` | \`${target.inbox.sha256 ?? 'missing'}\` |
| \`${target.inboxPreview.path}\` | \`${target.inboxPreview.exists}\` | \`${target.inboxPreview.size}\` | \`${target.inboxPreview.sha256 ?? 'missing'}\` |

## Replacement Workspace

- Expected inbox replacement: \`${target.expectedInbox}\`
- Inbox replacement preview: ${target.links.inboxReplacementPreview ?? 'missing'}
- Replacement scratch directory: \`${target.scratchDirectory}\`
- Capture UI: \`${target.captureUrl}\`
- Current source preview: ${target.links.source ?? 'missing'}
- Source sandbox: ${target.links.sourcePreview ?? 'missing'}
- Critic health: ${target.links.criticRegenerationHealth ?? 'missing'}
- Source approval runway: ${target.links.sourceApprovalRunway ?? 'missing'}
- Sequencer: ${target.links.sequencer ?? 'missing'}

## Safe Next Commands

\`\`\`bash
${target.commands.safeNext.join('\n') || '# no commands available'}
\`\`\`

## Distinct Replacement Gate

- Validate inbox image: \`${target.commands.validateInbox}\`
- Rebuild health: \`${target.commands.rebuildHealth}\`
- Rebuild sequencer: \`${target.commands.rebuildSequencer}\`
- Rebuild target packet: \`${target.commands.rebuildTargetPacket}\`
- Dry-run replacement ingest is only exposed when lane is \`regenerate-distinct-ready\`.

## Prompt

Prompt file: \`${target.promptFile ?? 'none'}\`

\`\`\`text
${target.promptText ?? 'No regeneration prompt attached.'}
\`\`\`
`;
}

function imageCard(label, href) {
  if (!href) return `<article class="media missing"><span>${htmlEscape(label)}</span><strong>missing</strong></article>`;
  return `<a class="media" href="${htmlEscape(href)}"><span>${htmlEscape(label)}</span><img src="${htmlEscape(href)}" alt="${htmlEscape(label)}"></a>`;
}

function html(report) {
  const target = report.target;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Regeneration Workspace</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#061014; color:#e5f7fb; }
    body { margin:0; background:#061014; }
    main { max-width:1360px; margin:0 auto; padding:28px 18px 48px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    h2 { margin:24px 0 10px; color:#dff4f8; }
    p, li, td { color:#bdd4dc; line-height:1.45; }
    a { color:#91eaff; }
    code, pre { color:#d8f5fb; overflow-wrap:anywhere; font-family:"SFMono-Regular", Consolas, monospace; }
    pre { border:1px solid #203b46; border-radius:6px; background:#041014; padding:12px; white-space:pre-wrap; }
    table { width:100%; border-collapse:collapse; border:1px solid #203b46; background:#081920; }
    th, td { padding:8px 9px; border-bottom:1px solid #18303a; text-align:left; vertical-align:top; }
    th { background:#10242c; color:#e7f7fb; }
    .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:#f0d9aa; padding:10px 12px; margin:16px 0; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; }
    .summary span { border:1px solid #294653; border-radius:6px; background:#0b1d24; padding:8px 10px; color:#bdd6df; }
    .media-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; }
    .media { display:flex; min-height:180px; flex-direction:column; justify-content:space-between; border:1px solid #203b46; border-radius:6px; background:#081920; padding:10px; text-decoration:none; }
    .media span { color:#bcd8df; }
    .media img { width:100%; max-height:280px; object-fit:contain; background:#02070a; }
    .missing { align-items:center; justify-content:center; color:#d9adad; }
  </style>
</head>
<body>
  <main data-source-regeneration-workspace data-source-regeneration-target="${htmlEscape(target.id)}">
    <h1>Source Regeneration Workspace</h1>
    <p>Focused workspace for replacing the current source-review sequencer target with distinct, cohesive art.</p>
    <p>This workspace does not approve source art, does not accept threats, and does not count preview-only work toward the 20-threat gate.</p>
    <h2>Command Boundary</h2>
    <div class="notice">${htmlEscape(report.commandBoundary)}</div>
    <div class="summary">
      <span>${htmlEscape(target.id)}</span>
      <span>${htmlEscape(target.species)}</span>
      <span>lane ${htmlEscape(target.lane)}</span>
      <span>status ${htmlEscape(target.status)}</span>
      <span>health ${htmlEscape(target.healthStatus ?? 'none')}</span>
      <span>matches current ${target.replacementMatchesCurrentSource ? 'yes' : 'no'}</span>
      <span>distinct ready ${target.distinctReplacementReady ? 'yes' : 'no'}</span>
      <span>applied ${target.replacementApplied ? 'yes' : 'no'}</span>
    </div>
    <h2>Visual Evidence</h2>
    <div class="media-grid">
      ${imageCard('Current Source', target.links.source)}
      ${imageCard('Inbox Replacement', target.links.inboxReplacementPreview)}
      ${imageCard('Thumbnail', target.links.thumbnail)}
      ${imageCard('Key Preview', target.links.keyPreview)}
      ${imageCard('Plan Preview', target.links.planPreview)}
    </div>
    <h2>Source / Inbox Fingerprints</h2>
    <table>
      <thead><tr><th>File</th><th>Exists</th><th>Size</th><th>SHA-256</th></tr></thead>
      <tbody>
        <tr><td><code>${htmlEscape(target.source.path)}</code></td><td>${target.source.exists ? 'yes' : 'no'}</td><td>${target.source.size}</td><td><code>${htmlEscape(target.source.sha256 ?? 'missing')}</code></td></tr>
        <tr><td><code>${htmlEscape(target.inbox.path)}</code></td><td>${target.inbox.exists ? 'yes' : 'no'}</td><td>${target.inbox.size}</td><td><code>${htmlEscape(target.inbox.sha256 ?? 'missing')}</code></td></tr>
        <tr><td><code>${htmlEscape(target.inboxPreview.path)}</code></td><td>${target.inboxPreview.exists ? 'yes' : 'no'}</td><td>${target.inboxPreview.size}</td><td><code>${htmlEscape(target.inboxPreview.sha256 ?? 'missing')}</code></td></tr>
      </tbody>
    </table>
    <h2>Workspace</h2>
    <ul>
      <li>Expected inbox replacement: <code>${htmlEscape(target.expectedInbox)}</code></li>
      <li>Replacement scratch directory: <code>${htmlEscape(target.scratchDirectory)}</code></li>
      <li>Capture UI: <code>${htmlEscape(target.captureUrl)}</code></li>
      <li>Source sandbox: <code>${htmlEscape(target.links.sourcePreview ?? 'missing')}</code></li>
      <li>Source approval runway: <code>${htmlEscape(target.links.sourceApprovalRunway ?? 'missing')}</code></li>
    </ul>
    <h2>Safe Next Commands</h2>
    <pre><code>${htmlEscape(target.commands.safeNext.join('\n') || '# no commands available')}</code></pre>
    <h2>Distinct Replacement Gate</h2>
    <p>Dry-run replacement ingest is only exposed when lane is <code>regenerate-distinct-ready</code>. Rebuild critic health and the sequencer after every candidate replacement.</p>
    <pre><code>${htmlEscape([
      target.commands.validateInbox,
      target.commands.rebuildHealth,
      target.commands.rebuildSequencer,
      target.commands.rebuildTargetPacket,
    ].filter(Boolean).join('\n'))}</code></pre>
    <h2>Prompt</h2>
    <p>Prompt file: <code>${htmlEscape(target.promptFile ?? 'none')}</code></p>
    <pre><code>${htmlEscape(target.promptText ?? 'No regeneration prompt attached.')}</code></pre>
  </main>
</body>
</html>
`;
}

const sequencer = await readJson(paths.sequencer, { summary: {}, items: [] });
const targetPacket = await readJson(paths.targetPacket, { target: {} });
const criticHealth = await readJson(paths.criticHealth, { summary: {}, items: [] });
if (sequencer?.schema !== 'water9/source-review-sequencer@1') throw new Error(`Unexpected sequencer schema ${sequencer?.schema ?? 'missing'}`);
if (targetPacket?.schema !== 'water9/source-review-target-packet@1') throw new Error(`Unexpected target packet schema ${targetPacket?.schema ?? 'missing'}`);
if (criticHealth?.schema !== 'water9/source-critic-regeneration-health@1') throw new Error(`Unexpected critic health schema ${criticHealth?.schema ?? 'missing'}`);

const targetId = String(args.get('id') ?? sequencer.summary?.nextTarget ?? targetPacket.target?.id ?? '');
const sequencerItem = (sequencer.items ?? []).find((item) => item.id === targetId);
if (!sequencerItem) throw new Error(`No sequencer item found for ${targetId || 'next target'}`);
const target = targetPacket.target?.id === targetId ? targetPacket.target : sequencerItem;
const healthItem = (criticHealth.items ?? []).find((item) => item.id === targetId) ?? null;
const promptFile = target.promptFile ?? healthItem?.promptFile ?? null;
const promptText = target.promptText ?? (promptFile ? await readTextOptional(promptFile) : null);
const sourcePath = healthItem?.source?.path ?? `public/assets/generated/fauna-${targetId}-whole-source.png`;
const inboxPath = healthItem?.inbox?.path ?? `tools/source-inbox/${targetId}.png`;
const source = healthItem?.source ?? await fileFingerprint(sourcePath);
const inbox = healthItem?.inbox ?? await fileFingerprint(inboxPath);
const inboxPreviewPath = resolve(paths.inboxPreviewDir, `${targetId}-inbox.png`);
if (inbox.exists) {
  await mkdir(paths.inboxPreviewDir, { recursive: true });
  await writeFile(inboxPreviewPath, await readFile(resolve(inbox.path)));
}
const inboxPreview = await fileFingerprint(inboxPreviewPath);
const replacementMatchesCurrentSource = Boolean(
  inbox.exists
  && source.exists
  && inbox.sha256
  && source.sha256
  && inbox.sha256 === source.sha256,
);
const distinctReplacementReady = Boolean(healthItem?.distinctReplacementReady ?? (inbox.exists && !replacementMatchesCurrentSource));
const commands = commandsFor(target, healthItem);
const commandBoundary = commandBoundaryFor(sequencerItem.lane);
const report = {
  schema: 'water9/source-regeneration-workspace@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    sequencer: repoRelative(paths.sequencer),
    targetPacket: repoRelative(paths.targetPacket),
    criticHealth: repoRelative(paths.criticHealth),
  },
  artifacts: {
    json: repoRelative(paths.outJson),
    markdown: repoRelative(paths.outMarkdown),
    html: repoRelative(paths.outHtml),
  },
  policy: {
    doesNotApproveSources: true,
    doesNotAcceptThreats: true,
    previewOnlyDoesNotCountTowardGate: true,
    followsSourceReviewSequencer: true,
    distinctReplacementRequiredBeforeOverwriteIngest: true,
    noOverwriteIngestOutsideDistinctReady: true,
  },
  commandBoundary,
  summary: {
    sequencerNextTarget: sequencer.summary?.nextTarget ?? null,
    sequencerNextLane: sequencer.summary?.nextLane ?? null,
    target: targetId,
    lane: sequencerItem.lane,
    healthStatus: healthItem?.status ?? target.healthStatus ?? null,
    replacementMatchesCurrentSource,
    distinctReplacementReady,
    replacementApplied: Boolean(healthItem?.replacementApplied),
    validNoopReplacements: criticHealth.summary?.validNoopReplacements ?? 0,
    appliedReplacements: criticHealth.summary?.appliedReplacements ?? 0,
    missingReplacements: criticHealth.summary?.missingReplacements ?? 0,
    invalidReplacements: criticHealth.summary?.invalidReplacements ?? 0,
  },
  target: {
    id: targetId,
    species: target.species ?? sequencerItem.species,
    lane: sequencerItem.lane,
    status: sequencerItem.status,
    healthStatus: healthItem?.status ?? target.healthStatus ?? null,
    promptFile,
    promptText,
    expectedInbox: inbox.path,
    scratchDirectory: `tools/source-inbox/regeneration-workspace/${targetId}`,
    captureUrl: `http://127.0.0.1:5188/?id=${encodeURIComponent(targetId)}`,
    source,
    inbox,
    inboxPreview,
    replacementMatchesCurrentSource,
    distinctReplacementReady,
    replacementApplied: Boolean(healthItem?.replacementApplied),
    links: {
      sequencer: '/review/source-candidates/source-review-sequencer.html',
      targetPacket: '/review/source-candidates/source-review-target-packet.html',
      criticRegenerationHealth: '/review/source-candidates/source-critic-regeneration-health.html',
      regenerationWorkspace: '/review/source-candidates/source-regeneration-workspace.html',
      sourceApprovalRunway: '/review/source-approval-runway.html',
      inboxReplacementPreview: inboxPreview.exists ? publicUrl(inboxPreviewPath) : null,
      ...target.links,
    },
    commands,
  },
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  target: report.target.id,
  lane: report.target.lane,
  healthStatus: report.target.healthStatus,
  replacementMatchesCurrentSource: report.target.replacementMatchesCurrentSource,
  distinctReplacementReady: report.target.distinctReplacementReady,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));
