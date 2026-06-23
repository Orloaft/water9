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
  acceptanceRunway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
  readiness: resolve(String(args.get('readiness') ?? 'public/review/content-readiness.json')),
  runtimeCoverage: resolve(String(args.get('runtime-coverage') ?? 'public/review/content-runtime-coverage.json')),
  stageBoard: resolve(String(args.get('stage-board') ?? 'public/review/content-stage-board.json')),
  sourceCohesionDecisionRun: resolve(String(args.get('source-cohesion-decision-run') ?? 'public/review/source-candidates/source-cohesion-decision-run-report.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-acceptance-doctor.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/content-acceptance-doctor.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-acceptance-doctor.html')),
};

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fileSummary(path) {
  try {
    const info = await stat(path);
    return { path, exists: info.isFile(), bytes: info.size, mtimeMs: Math.round(info.mtimeMs) };
  } catch {
    return { path, exists: false, bytes: 0, mtimeMs: 0 };
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function sourceBlockersFor(item) {
  const blockers = [];
  if (!item.hasSourceImage) blockers.push('source image missing');
  if (item.hasSourceImage && !item.sourceApproved) blockers.push('strict human source approval missing');
  if (item.hasSourceImage && item.sourceDossierApproved !== true) blockers.push('source dossier not approved');
  return blockers;
}

function runtimeBlockersFor(item) {
  const blockers = [];
  if (item.sourceApproved && !item.runtimeRegistered) blockers.push('articulated runtime creature missing');
  if (!item.runtimeRegistered && item.stage !== 'source-review-needed' && item.stage !== 'source-image-needed') blockers.push('sandbox runtime preview unavailable');
  return blockers;
}

function acceptanceBlockersFor(item) {
  const blockers = [];
  if (item.runtimeRegistered && !item.threatAccepted) blockers.push('strict human rig acceptance missing');
  if (!item.accepted) blockers.push('does not count toward 20-threat gate');
  return blockers;
}

function severityFor(item) {
  if (item.accepted) return 'accepted';
  if (item.sourceBlockers.length) return 'source';
  if (item.runtimeBlockers.length) return 'runtime';
  if (item.acceptanceBlockers.length) return 'acceptance';
  return 'unknown';
}

function doctorItems(runway) {
  return (runway.items ?? []).map((item) => {
    const sourceBlockers = sourceBlockersFor(item);
    const runtimeBlockers = runtimeBlockersFor(item);
    const acceptanceBlockers = acceptanceBlockersFor(item);
    const nextCommand = item.nextAction ?? item.acceptancePacket?.commands?.nextAction ?? item.commands?.source?.[0] ?? item.commands?.rigging?.[0] ?? 'npm run content:workbench';
    return {
      id: item.id,
      species: item.species,
      stage: item.stage,
      runtimeId: item.runtimeId ?? null,
      accepted: Boolean(item.accepted),
      hasSourceImage: Boolean(item.hasSourceImage),
      sourceApproved: Boolean(item.sourceApproved),
      runtimeRegistered: Boolean(item.runtimeRegistered),
      threatAccepted: Boolean(item.threatAccepted),
      sourceBlockers,
      runtimeBlockers,
      acceptanceBlockers,
      allBlockers: [...sourceBlockers, ...runtimeBlockers, ...acceptanceBlockers],
      severity: null,
      nextCommand,
      links: {
        acceptancePacket: item.acceptancePacket?.file ?? null,
        sourceReview: item.sourceReviewHref ?? null,
        riggingPack: item.riggingPackHref ?? null,
        sandbox: item.sandboxUrl ?? null,
      },
    };
  }).map((item) => ({ ...item, severity: severityFor(item) }));
}

function markdownFor(report) {
  const rows = report.items.map((item) => `| ${mdEscape(item.id)} | ${mdEscape(item.species)} | ${mdEscape(item.stage)} | ${mdEscape(item.severity)} | ${mdEscape(item.sourceBlockers.join('; ') || 'none')} | ${mdEscape(item.runtimeBlockers.join('; ') || 'none')} | ${mdEscape(item.acceptanceBlockers.join('; ') || 'none')} | \`${mdEscape(item.nextCommand)}\` |`).join('\n');
  return `# Water 9 Acceptance Doctor

Read-only compact diagnostic report for the strict 20-threat content gate.

## Summary

- Target threats: ${report.summary.targetThreats}
- Accepted threats: ${report.summary.acceptedThreats}
- Candidates: ${report.summary.candidates}
- Source blocker rows: ${report.summary.sourceBlocked}
- Runtime blocker rows: ${report.summary.runtimeBlocked}
- Acceptance blocker rows: ${report.summary.acceptanceBlocked}
- Next bottleneck: ${report.summary.nextBottleneck}
- Decision dry-run pending: ${report.summary.sourceDecisionPending}

## Commands

\`\`\`bash
npm run content:acceptance-doctor
npm run content:acceptance-doctor-check
npm run content:workbench
npm run content:goal-readiness-check
\`\`\`

## Candidate Matrix

| Candidate | Species | Stage | Severity | Source Blockers | Runtime Blockers | Acceptance Blockers | Next Command |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function htmlFor(report) {
  const rows = report.items.map((item) => `<tr data-acceptance-doctor-candidate="${htmlEscape(item.id)}" data-severity="${htmlEscape(item.severity)}">
    <td><code>${htmlEscape(item.id)}</code></td>
    <td>${htmlEscape(item.species)}</td>
    <td>${htmlEscape(item.stage)}</td>
    <td>${htmlEscape(item.severity)}</td>
    <td>${htmlEscape(item.sourceBlockers.join('; ') || 'none')}</td>
    <td>${htmlEscape(item.runtimeBlockers.join('; ') || 'none')}</td>
    <td>${htmlEscape(item.acceptanceBlockers.join('; ') || 'none')}</td>
    <td>${[
      item.links.acceptancePacket ? `<a href="${htmlEscape(item.links.acceptancePacket.replace('public/review/', ''))}">packet</a>` : '',
      item.links.sourceReview ? `<a href="${htmlEscape(item.links.sourceReview)}">source</a>` : '',
      item.links.riggingPack ? `<a href="${htmlEscape(item.links.riggingPack)}">rig</a>` : '',
      item.links.sandbox ? `<a href="${htmlEscape(item.links.sandbox)}">sandbox</a>` : '',
    ].filter(Boolean).join(' ')}</td>
    <td><pre><code>${htmlEscape(item.nextCommand)}</code></pre></td>
  </tr>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Acceptance Doctor</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; --warn:#e7bd6d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1500px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    p { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; white-space:pre-wrap; overflow:auto; }
    .summary { display:flex; flex-wrap:wrap; gap:9px; margin:18px 0 24px; }
    .summary span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); margin-left:4px; }
    .commands { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:12px; margin-bottom:18px; }
    table { width:100%; border-collapse:collapse; border:1px solid var(--line); background:#08181e; }
    th, td { border-bottom:1px solid #18303a; padding:9px; text-align:left; vertical-align:top; }
    th { position:sticky; top:0; background:#10242c; z-index:1; }
    tr[data-severity="source"] td:nth-child(4) { color:#f0c477; }
    tr[data-severity="runtime"] td:nth-child(4) { color:#78d5ff; }
    tr[data-severity="acceptance"] td:nth-child(4) { color:#f09b9b; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Acceptance Doctor</h1>
    <p>Read-only compact diagnostic report for the strict 20-threat gate. This report diagnoses; it does not approve content.</p>
    <div class="summary">
      <span>accepted <strong>${report.summary.acceptedThreats}/${report.summary.targetThreats}</strong></span>
      <span>candidates <strong>${report.summary.candidates}</strong></span>
      <span>source blocked <strong>${report.summary.sourceBlocked}</strong></span>
      <span>runtime blocked <strong>${report.summary.runtimeBlocked}</strong></span>
      <span>acceptance blocked <strong>${report.summary.acceptanceBlocked}</strong></span>
      <span>decision pending <strong>${report.summary.sourceDecisionPending}</strong></span>
      <span>next bottleneck <strong>${htmlEscape(report.summary.nextBottleneck)}</strong></span>
    </div>
    <section class="commands">
      ${commandBlock(['npm run content:acceptance-doctor', 'npm run content:acceptance-doctor-check', 'npm run content:workbench', 'npm run content:goal-readiness-check'])}
    </section>
    <table>
      <thead>
        <tr>
          <th>Candidate</th>
          <th>Species</th>
          <th>Stage</th>
          <th>Severity</th>
          <th>Source Blockers</th>
          <th>Runtime Blockers</th>
          <th>Acceptance Blockers</th>
          <th>Links</th>
          <th>Next Command</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

const acceptanceRunway = await readJson(paths.acceptanceRunway, { summary: {}, items: [] });
const readiness = await readJson(paths.readiness, { summary: {} });
const runtimeCoverage = await readJson(paths.runtimeCoverage, { summary: {} });
const stageBoard = await readJson(paths.stageBoard, { summary: {} });
const sourceCohesionDecisionRun = await readJson(paths.sourceCohesionDecisionRun, { pending: 0, approved: 0, rejected: 0, failures: [] });

if (acceptanceRunway.schema !== 'water9/content-acceptance-runway@1') {
  throw new Error(`Unexpected acceptance runway schema ${acceptanceRunway.schema ?? 'missing'}`);
}

const items = doctorItems(acceptanceRunway);
const report = {
  schema: 'water9/content-acceptance-doctor@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: Object.fromEntries(await Promise.all(Object.entries(paths)
    .filter(([key]) => !key.startsWith('out'))
    .map(async ([key, path]) => [key, await fileSummary(path)]))),
  summary: {
    targetThreats: acceptanceRunway.summary?.targetThreats ?? 20,
    acceptedThreats: acceptanceRunway.summary?.acceptedThreats ?? 0,
    candidates: items.length,
    sourceImages: acceptanceRunway.summary?.sourceImages ?? readiness.summary?.sourceImages ?? 0,
    approvedSources: acceptanceRunway.summary?.approvedSources ?? readiness.summary?.approvedSources ?? 0,
    runtimeRegistered: acceptanceRunway.summary?.runtimeRegistered ?? runtimeCoverage.summary?.runtimeRegistered ?? 0,
    missingRuntime: runtimeCoverage.summary?.missingRuntime ?? 0,
    sourceBlocked: items.filter((item) => item.sourceBlockers.length > 0).length,
    runtimeBlocked: items.filter((item) => item.runtimeBlockers.length > 0).length,
    acceptanceBlocked: items.filter((item) => item.acceptanceBlockers.length > 0).length,
    nextBottleneck: stageBoard.summary?.nextBottleneck ?? acceptanceRunway.summary?.nextBottleneck ?? readiness.summary?.nextBottleneck ?? 'unknown',
    sourceDecisionPending: sourceCohesionDecisionRun.pending ?? 0,
    sourceDecisionApproved: sourceCohesionDecisionRun.approved ?? 0,
    sourceDecisionRejected: sourceCohesionDecisionRun.rejected ?? 0,
    sourceDecisionFailures: sourceCohesionDecisionRun.failures?.length ?? 0,
  },
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMd, markdownFor(report));
await writeFile(paths.outHtml, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  jsonOut: paths.outJson,
  mdOut: paths.outMd,
  htmlOut: paths.outHtml,
  summary: report.summary,
}, null, 2));
