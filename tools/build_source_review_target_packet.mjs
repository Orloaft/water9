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
  sequencer: resolve(String(args.get('sequencer') ?? 'public/review/source-candidates/source-review-sequencer.json')),
  criticHealth: resolve(String(args.get('critic-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-review-target-packet.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-review-target-packet.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-review-target-packet.html')),
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

function imageCard(label, url) {
  if (!url) return `<article class="media missing"><span>${htmlEscape(label)}</span><strong>missing</strong></article>`;
  return `<a class="media" href="${htmlEscape(url)}"><span>${htmlEscape(label)}</span><img src="${htmlEscape(url)}" alt="${htmlEscape(label)}"></a>`;
}

function commandBoundary(lane) {
  if (lane === 'regenerate-distinct-ready') {
    return 'A distinct replacement is ready for dry-run ingest. Apply overwrite only after previewing the replacement and rebuilding source evidence.';
  }
  if (lane?.startsWith('regenerate-')) {
    return 'This regeneration lane must not expose overwrite ingest commands until the health report marks a distinct replacement ready.';
  }
  if (lane === 'approval-ready') {
    return 'This approval lane may expose dry-run source approval commands only. Real approval requires human inspection.';
  }
  return 'This packet routes source-review work only; it does not approve source art or accept threats.';
}

function markdown(report) {
  const target = report.target;
  return `# Water 9 Source Review Target Packet

Generated: \`${report.generatedAt}\`

Focused packet for the current source-review sequencer target. This packet does not approve source art, does not accept threats, and does not count preview-only work toward the 20-threat gate.

## Target

- Candidate: \`${target.id}\` ${target.species}
- Lane: \`${target.lane}\`
- Status: \`${target.status}\`
- Health status: \`${target.healthStatus ?? 'none'}\`
- Counts toward gate: \`${target.countsTowardGate}\`
- Recommended first: \`${target.recommendedFirst ?? 'none'}\`

## Command Boundary

${report.commandBoundary}

## Evidence

| Item | Link |
| --- | --- |
| Sequencer | ${target.links.sequencer} |
| Source image | ${target.links.source ?? 'missing'} |
| Thumbnail | ${target.links.thumbnail ?? 'missing'} |
| Key preview | ${target.links.keyPreview ?? 'missing'} |
| Source preview | ${target.links.sourcePreview ?? 'missing'} |
| Quick review | ${target.links.quickReview ?? 'missing'} |
| Review packet | ${target.links.reviewPacket ?? 'missing'} |
| Plan preview | ${target.links.planPreview ?? 'missing'} |
| Critic health | ${target.links.criticRegenerationHealth ?? 'missing'} |
| Approval runway | ${target.links.sourceApprovalRunway ?? 'missing'} |

## Critic Prompt

Prompt file: \`${target.promptFile ?? 'none'}\`

\`\`\`text
${target.promptText ?? 'No critic-regeneration prompt is attached to this lane.'}
\`\`\`

## Commands

\`\`\`bash
${target.nextCommands.length ? target.nextCommands.join('\n') : '# no commands available'}
\`\`\`

## Quality Gate Boundary

- Human-approved sources: \`${report.summary.approved}\`
- Accepted threats: \`${report.summary.countsTowardGate}\`
- Approval-ready sources: \`${report.summary.approvalReady}\`
- Critic regeneration required: \`${report.summary.criticRegenerationRequired}\`
`;
}

function html(report) {
  const target = report.target;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Review Target Packet</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#061014; color:#e6f7fb; }
    body { margin:0; background:#061014; }
    main { max-width:1360px; margin:0 auto; padding:28px 18px 48px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    h2 { margin:22px 0 10px; color:#d9eef3; }
    p, li, td { color:#bdd4dc; line-height:1.45; }
    a { color:#8fe5ff; }
    code, pre { color:#d8f5fb; overflow-wrap:anywhere; font-family:"SFMono-Regular", Consolas, monospace; }
    pre { border:1px solid #203b46; border-radius:6px; background:#041014; padding:12px; white-space:pre-wrap; }
    .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:#f0d9aa; padding:10px 12px; margin:16px 0; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; }
    .summary span { border:1px solid #294653; border-radius:6px; background:#0b1d24; padding:8px 10px; color:#bdd6df; }
    .media-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
    .media { display:flex; min-height:180px; flex-direction:column; justify-content:space-between; border:1px solid #203b46; border-radius:6px; background:#081920; padding:10px; text-decoration:none; }
    .media span { color:#bcd8df; }
    .media img { width:100%; max-height:260px; object-fit:contain; image-rendering:auto; background:#02070a; }
    .missing { align-items:center; justify-content:center; color:#d9adad; }
    table { width:100%; border-collapse:collapse; border:1px solid #203b46; background:#081920; }
    th, td { padding:8px 9px; border-bottom:1px solid #18303a; text-align:left; vertical-align:top; }
    th { background:#10242c; color:#e7f7fb; }
  </style>
</head>
<body>
  <main data-source-review-target-packet data-source-review-target="${htmlEscape(target.id)}">
    <h1>Source Review Target Packet</h1>
    <p>Focused packet for the current source-review sequencer target.</p>
    <div class="notice">This packet does not approve source art, does not accept threats, and does not count preview-only work toward the 20-threat gate.</div>
    <div class="summary">
      <span>${htmlEscape(target.id)}</span>
      <span>${htmlEscape(target.species)}</span>
      <span>lane ${htmlEscape(target.lane)}</span>
      <span>status ${htmlEscape(target.status)}</span>
      <span>health ${htmlEscape(target.healthStatus ?? 'none')}</span>
      <span>gate count ${target.countsTowardGate ? 'yes' : 'no'}</span>
    </div>
    <h2>Command Boundary</h2>
    <p>${htmlEscape(report.commandBoundary)}</p>
    <h2>Evidence</h2>
    <div class="media-grid">
      ${imageCard('Source image', target.links.source)}
      ${imageCard('Thumbnail', target.links.thumbnail)}
      ${imageCard('Key preview', target.links.keyPreview)}
      ${imageCard('Source preview', target.links.sourcePreview)}
      ${imageCard('Plan preview', target.links.planPreview)}
    </div>
    <table>
      <tbody>
        <tr><th>Sequencer</th><td><a href="${htmlEscape(target.links.sequencer)}">${htmlEscape(target.links.sequencer)}</a></td></tr>
        <tr><th>Quick review</th><td>${target.links.quickReview ? `<a href="${htmlEscape(target.links.quickReview)}">${htmlEscape(target.links.quickReview)}</a>` : 'missing'}</td></tr>
        <tr><th>Review packet</th><td>${htmlEscape(target.links.reviewPacket ?? 'missing')}</td></tr>
        <tr><th>Critic health</th><td>${target.links.criticRegenerationHealth ? `<a href="${htmlEscape(target.links.criticRegenerationHealth)}">${htmlEscape(target.links.criticRegenerationHealth)}</a>` : 'missing'}</td></tr>
        <tr><th>Approval runway</th><td>${target.links.sourceApprovalRunway ? `<a href="${htmlEscape(target.links.sourceApprovalRunway)}">${htmlEscape(target.links.sourceApprovalRunway)}</a>` : 'missing'}</td></tr>
      </tbody>
    </table>
    <h2>Critic Prompt</h2>
    <p>Prompt file: <code>${htmlEscape(target.promptFile ?? 'none')}</code></p>
    <pre><code>${htmlEscape(target.promptText ?? 'No critic-regeneration prompt is attached to this lane.')}</code></pre>
    <h2>Commands</h2>
    <pre><code>${htmlEscape(target.nextCommands.join('\n') || '# no commands available')}</code></pre>
    <h2>Quality Gate Boundary</h2>
    <ul>
      <li>Human-approved sources: <code>${report.summary.approved}</code></li>
      <li>Accepted threats: <code>${report.summary.countsTowardGate}</code></li>
      <li>Approval-ready sources: <code>${report.summary.approvalReady}</code></li>
      <li>Critic regeneration required: <code>${report.summary.criticRegenerationRequired}</code></li>
    </ul>
  </main>
</body>
</html>
`;
}

const sequencer = await readJson(paths.sequencer, { summary: {}, items: [] });
const criticHealth = await readJson(paths.criticHealth, { items: [] });
const approvalRunway = await readJson(paths.approvalRunway, { items: [], summary: {} });
if (sequencer?.schema !== 'water9/source-review-sequencer@1') throw new Error(`Unexpected sequencer schema ${sequencer?.schema ?? 'missing'}`);
if (criticHealth?.schema !== 'water9/source-critic-regeneration-health@1') throw new Error(`Unexpected critic health schema ${criticHealth?.schema ?? 'missing'}`);
if (approvalRunway?.schema !== 'water9/source-approval-runway@1') throw new Error(`Unexpected approval runway schema ${approvalRunway?.schema ?? 'missing'}`);

const targetId = String(args.get('id') ?? sequencer.summary?.nextTarget ?? '');
const sequencerItem = (sequencer.items ?? []).find((item) => item.id === targetId);
if (!sequencerItem) throw new Error(`No sequencer item found for ${targetId || 'next target'}`);
const healthItem = (criticHealth.items ?? []).find((item) => item.id === targetId) ?? null;
const approvalItem = (approvalRunway.items ?? []).find((item) => item.id === targetId) ?? null;
const promptFile = healthItem?.promptFile ?? null;
const promptText = promptFile ? await readTextOptional(promptFile) : null;
const report = {
  schema: 'water9/source-review-target-packet@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    sequencer: repoRelative(paths.sequencer),
    criticHealth: repoRelative(paths.criticHealth),
    approvalRunway: repoRelative(paths.approvalRunway),
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
    overwriteIngestOnlyWhenDistinctReplacementReady: true,
  },
  summary: {
    totalCandidates: sequencer.summary?.totalCandidates ?? 0,
    approvalReady: sequencer.summary?.approvalReady ?? 0,
    criticRegenerationRequired: sequencer.summary?.criticRegenerationRequired ?? 0,
    distinctReplacementReady: sequencer.summary?.distinctReplacementReady ?? 0,
    validNoopReplacements: sequencer.summary?.validNoopReplacements ?? 0,
    missingReplacements: sequencer.summary?.missingReplacements ?? 0,
    invalidReplacements: sequencer.summary?.invalidReplacements ?? 0,
    approved: sequencer.summary?.approved ?? 0,
    countsTowardGate: sequencer.summary?.countsTowardGate ?? 0,
    sequencerNextTarget: sequencer.summary?.nextTarget ?? null,
    sequencerNextLane: sequencer.summary?.nextLane ?? null,
  },
  commandBoundary: commandBoundary(sequencerItem.lane),
  target: {
    id: sequencerItem.id,
    species: sequencerItem.species,
    lane: sequencerItem.lane,
    status: sequencerItem.status,
    healthStatus: sequencerItem.healthStatus ?? null,
    readyForHumanReview: Boolean(sequencerItem.readyForHumanReview),
    humanApproved: Boolean(sequencerItem.humanApproved),
    countsTowardGate: Boolean(sequencerItem.countsTowardGate),
    recommendedFirst: sequencerItem.recommendedFirst ?? sequencerItem.nextCommands?.[0] ?? null,
    nextCommands: sequencerItem.nextCommands ?? [],
    promptFile,
    promptText,
    links: {
      sequencer: '/review/source-candidates/source-review-sequencer.html',
      ...sequencerItem.links,
      criticRegenerationHealth: sequencerItem.links?.criticRegenerationHealth ?? (healthItem ? '/review/source-candidates/source-critic-regeneration-health.html' : null),
      sourceApprovalRunway: sequencerItem.links?.sourceApprovalRunway ?? '/review/source-approval-runway.html',
      quickReview: sequencerItem.links?.quickReview ?? approvalItem?.links?.quickReview ?? null,
      reviewPacket: sequencerItem.links?.reviewPacket ?? approvalItem?.links?.reviewPacket ?? null,
      source: sequencerItem.links?.source ?? approvalItem?.links?.source ?? null,
      thumbnail: sequencerItem.links?.thumbnail ?? approvalItem?.links?.thumbnail ?? null,
      keyPreview: sequencerItem.links?.keyPreview ?? approvalItem?.links?.keyPreview ?? null,
      sourcePreview: sequencerItem.links?.sourcePreview ?? approvalItem?.links?.sandboxScreenshot ?? null,
      planPreview: sequencerItem.links?.planPreview ?? approvalItem?.links?.planPreview ?? null,
    },
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
  status: report.target.status,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));
