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
  input: resolve(String(args.get('input') ?? 'tools/audit/content-visual-feedback-input.json')),
  sandboxManifest: resolve(String(args.get('sandbox-manifest') ?? 'public/review/sandbox/manifest.json')),
  articulatedManifest: resolve(String(args.get('articulated-manifest') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  acceptanceRunway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-visual-feedback-ledger.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-visual-feedback-ledger.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-visual-feedback-ledger.html')),
};

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function list(items) {
  return (items ?? []).map((item) => `- ${item}`).join('\n') || '- none';
}

function markdown(report) {
  const lines = [
    '# Water 9 Visual Feedback Ledger',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    'This ledger records negative art-direction feedback. A blocked prototype cannot be used as proof for the strict 20-threat gate, even if it renders in the sandbox.',
    '',
    '## Summary',
    '',
    `- Records: \`${report.summary.records}\``,
    `- Blocking records: \`${report.summary.blockingRecords}\``,
    `- Open records: \`${report.summary.openRecords}\``,
    `- Unmapped prototype blockers: \`${report.summary.unmappedPrototypeBlockers}\``,
    '',
  ];
  for (const item of report.items) {
    lines.push(
      `## ${item.targetId}`,
      '',
      `- Status: \`${item.status}\``,
      `- Severity: \`${item.severity}\``,
      `- Sandbox registered: \`${item.sandboxRegistered}\``,
      `- Sandbox gate: \`${item.sandboxReviewGateLabel ?? 'missing'}\``,
      `- Runtime prototype: \`${item.runtimePrototype}\``,
      `- Target gate candidate: \`${item.targetGateCandidate}\``,
      `- Counts toward strict gate: \`${item.countsTowardStrictGate}\``,
      '',
      item.summary,
      '',
      '**Failed checks**',
      '',
      list(item.failedChecks),
      '',
      '**Required action**',
      '',
      item.requiredAction,
      '',
      '**Notes**',
      '',
      list(item.notes),
      '',
      '**Commands**',
      '',
      '```bash',
      item.commands.preview,
      item.commands.pairedPreview,
      item.commands.visualCheck,
      '```',
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

function html(report) {
  const cards = report.items.map((item) => `<article class="card" data-visual-feedback="${htmlEscape(item.id)}">
    <header>
      <div><h2>${htmlEscape(item.targetId)}</h2><code>${htmlEscape(item.id)}</code></div>
      <strong>${htmlEscape(item.status)}</strong>
    </header>
    <p class="warning">${htmlEscape(item.summary)}</p>
    <dl>
      <dt>severity</dt><dd>${htmlEscape(item.severity)}</dd>
      <dt>sandbox</dt><dd>${item.sandboxRegistered ? 'registered' : 'missing'}</dd>
      <dt>review gate</dt><dd>${htmlEscape(item.sandboxReviewGateLabel ?? 'missing')}</dd>
      <dt>runtime prototype</dt><dd>${item.runtimePrototype ? 'yes' : 'no'}</dd>
      <dt>target gate candidate</dt><dd>${item.targetGateCandidate ? 'yes' : 'no'}</dd>
      <dt>strict gate</dt><dd>${item.countsTowardStrictGate ? 'counts' : 'does not count'}</dd>
    </dl>
    <h3>Failed Checks</h3>
    <ul>${item.failedChecks.map((check) => `<li>${htmlEscape(check)}</li>`).join('')}</ul>
    <h3>Required Action</h3>
    <p>${htmlEscape(item.requiredAction)}</p>
    <h3>Commands</h3>
    <pre><code>${htmlEscape([item.commands.preview, item.commands.pairedPreview, item.commands.visualCheck].join('\n'))}</code></pre>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Visual Feedback Ledger</title>
  <style>
    :root { color-scheme: dark; background:#061014; color:#d9edf0; font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    body { margin:0; padding:28px; background:#061014; }
    main { max-width:1120px; margin:0 auto; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    h2 { margin:0; font-size:1.1rem; }
    h3 { margin:14px 0 8px; color:#9fb4b9; font-size:.8rem; text-transform:uppercase; }
    p, li, dd { color:#c3d9de; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { border:1px solid #294653; background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .notice, .card, .summary { border:1px solid #294653; background:#0b1d24; border-radius:6px; padding:14px; }
    .notice { border-color:#704747; background:#1d1012; color:#f0b5aa; margin:14px 0; }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:8px; margin:18px 0; }
    .summary span { border:1px solid #203b46; background:#07171d; border-radius:5px; padding:8px 10px; }
    .card { margin:12px 0; }
    .card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }
    dl { display:grid; grid-template-columns:150px 1fr; gap:5px 10px; margin:12px 0; }
    dt { color:#8fa8ae; }
    dd { margin:0; }
    .warning { color:#f0b5aa; }
  </style>
</head>
<body>
  <main data-content-visual-feedback-ledger>
    <h1>Visual Feedback Ledger</h1>
    <p>Negative art-direction feedback for source art and runtime prototypes.</p>
    <div class="notice">A blocked prototype cannot be used as proof for the strict 20-threat gate, even if it renders in the sandbox.</div>
    <section class="summary">
      <span>records <strong>${report.summary.records}</strong></span>
      <span>blocking <strong>${report.summary.blockingRecords}</strong></span>
      <span>open <strong>${report.summary.openRecords}</strong></span>
      <span>unmapped prototype blockers <strong>${report.summary.unmappedPrototypeBlockers}</strong></span>
    </section>
    ${cards}
  </main>
</body>
</html>
`;
}

const input = await readJson(paths.input);
if (input?.schema !== 'water9/content-visual-feedback-input@1') {
  throw new Error(`Unexpected visual feedback input schema ${input?.schema ?? 'missing'}`);
}
const sandboxManifest = await readJson(paths.sandboxManifest, { entries: [] });
const articulatedManifest = await readJson(paths.articulatedManifest, { creatures: [] });
const acceptanceRunway = await readJson(paths.acceptanceRunway, { items: [] });

const sandboxById = new Map((sandboxManifest.entries ?? []).map((entry) => [entry.id, entry]));
const runtimeById = new Map((articulatedManifest.creatures ?? []).map((entry) => [entry.id, entry]));
const acceptanceById = new Map((acceptanceRunway.items ?? []).map((entry) => [entry.id, entry]));

const items = (input.feedback ?? []).map((record) => {
  const sandbox = sandboxById.get(record.targetId);
  const runtime = runtimeById.get(record.targetId);
  const acceptance = acceptanceById.get(record.targetId);
  const blocking = record.severity === 'blocking' && !String(record.status ?? '').startsWith('resolved');
  return {
    ...record,
    sandboxRegistered: Boolean(sandbox),
    sandboxReviewStage: sandbox?.reviewStage ?? null,
    sandboxReviewGateLabel: sandbox?.reviewGateLabel ?? null,
    sandboxPreviewOnly: sandbox?.productionBoundary?.previewOnly === true,
    runtimePrototype: Boolean(runtime && sandbox?.acceptedForContentGate !== true),
    targetGateCandidate: Boolean(acceptance),
    countsTowardStrictGate: acceptance?.accepted === true && blocking !== true,
    open: blocking,
    gateImpact: blocking
      ? 'Blocks prototype promotion until a regenerated source and human cohesion approval exist.'
      : 'No active gate impact.',
    commands: {
      preview: sandbox?.previewCommand ?? `npm run sandbox:preview -- --id ${record.targetId} --serve --open --visual`,
      pairedPreview: sandbox?.pairedPreviewCommand ?? `npm run sandbox:preview -- --id ${record.targetId} --with diver --serve --open --visual`,
      visualCheck: sandbox?.visualCheckCommand ?? `npm run sandbox:visual -- --ids ${record.targetId} --states idle,lunge,stunned`,
    },
  };
});

const report = {
  schema: 'water9/content-visual-feedback-ledger@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    input: 'tools/audit/content-visual-feedback-input.json',
    sandboxManifest: 'public/review/sandbox/manifest.json',
    articulatedManifest: 'public/assets/generated/articulated-creatures.parts.json',
    acceptanceRunway: 'public/review/content-acceptance-runway.json',
  },
  policy: {
    ...input.policy,
    visualFeedbackCanBlockPrototypePromotion: true,
    blockedPrototypeCannotCountTowardStrictGate: true,
    prototypeScreenshotIsNotCapabilityProof: true,
  },
  summary: {
    records: items.length,
    blockingRecords: items.filter((item) => item.severity === 'blocking').length,
    openRecords: items.filter((item) => item.open).length,
    sandboxRegistered: items.filter((item) => item.sandboxRegistered).length,
    runtimePrototypes: items.filter((item) => item.runtimePrototype).length,
    targetGateCandidates: items.filter((item) => item.targetGateCandidate).length,
    unmappedPrototypeBlockers: items.filter((item) => item.open && item.runtimePrototype && !item.targetGateCandidate).length,
    countsTowardStrictGate: items.filter((item) => item.countsTowardStrictGate).length,
  },
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  records: report.summary.records,
  blockingRecords: report.summary.blockingRecords,
  unmappedPrototypeBlockers: report.summary.unmappedPrototypeBlockers,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));
