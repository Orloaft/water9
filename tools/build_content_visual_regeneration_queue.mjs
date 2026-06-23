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
  feedbackLedger: resolve(String(args.get('feedback-ledger') ?? 'public/review/content-visual-feedback-ledger.json')),
  sandboxManifest: resolve(String(args.get('sandbox-manifest') ?? 'public/review/sandbox/manifest.json')),
  articulatedManifest: resolve(String(args.get('articulated-manifest') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  promptDir: resolve(String(args.get('prompt-dir') ?? 'public/review/content-visual-regeneration-prompts')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/content-visual-regeneration-queue.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/content-visual-regeneration-queue.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/content-visual-regeneration-queue.html')),
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

function slug(value) {
  return String(value ?? 'target').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'target';
}

function promptFor(item, sandboxEntry, runtimeEntry) {
  const species = sandboxEntry?.name ?? runtimeEntry?.species ?? item.targetId;
  return [
    `Visual regeneration target: ${species} (${item.targetId})`,
    '',
    'Reason for regeneration:',
    item.summary,
    '',
    'Create one cohesive full-source underwater threat on a flat pure #ff00ff magenta background.',
    'Do not create a parts sheet, animation strip, screenshot, UI icon, environmental prop, or collage.',
    'The output must be one intact organism first; articulated parts are extracted only after the full source concept passes human cohesion review.',
    'Treat the current runtime preview as a mechanical rig test only. It is not art direction, not a salvage target, and not evidence that the final creature design works.',
    '',
    'Failed checks to fix:',
    ...(item.failedChecks ?? []).map((check) => `- ${check}`),
    '',
    'Review notes:',
    ...(item.notes ?? []).map((note) => `- ${note}`),
    '',
    'Design requirements:',
    '- One readable silhouette with a clear head/body/tail or equivalent anatomy hierarchy.',
    '- Connected anatomy with visible tissue, membrane, shell, tendon, hinge, or socket transitions between future moving parts.',
    '- Consistent lighting, palette, texture scale, and material language across the whole organism.',
    '- A clear gameplay attack lane that can be read beside the diver at sandbox scale.',
    '- Neutral riggable pose with crop-safe margins and no hidden roots for future limbs or jaws.',
    '- No baked water, particles, prey, UI text, duplicated creatures, decorative frame, or environmental background.',
    '- No magenta, hot pink, or near-key body colors that will be removed during chroma extraction.',
    '',
    'Forbidden shortcuts:',
    '- Do not merely repaint, upscale, re-time, socket-tune, or crop the rejected prototype.',
    '- Do not assemble unrelated body parts into a collage, even if the parts animate cleanly.',
    '- Do not rely on sandbox motion, effects, darkness, or scale to hide weak creature design.',
    '- Do not produce a design that only works as a still image but lacks clear articulation logic.',
    '',
    'Required action from feedback ledger:',
    item.requiredAction,
    '',
    'Acceptance bar before rigging:',
    '- Human reviewer must approve the intact source as a cohesive creature before parts are cut.',
    '- Source must pass magenta-key cleanup without halos or lost anatomy.',
    '- Sandbox preview must remain labeled preview-only until source, rig, motion, paired-diver, and final threat acceptance all pass.',
  ].join('\n');
}

function markdown(report) {
  const lines = [
    '# Water 9 Visual Regeneration Queue',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    'This queue converts blocked runtime prototype feedback into source-first regeneration briefs. It does not approve art, does not create accepted threats, and does not count toward the strict 20-threat gate.',
    '',
    '## Summary',
    '',
    `- Queue items: \`${report.summary.items}\``,
    `- Blocking items: \`${report.summary.blockingItems}\``,
    `- Unmapped prototype items: \`${report.summary.unmappedPrototypeItems}\``,
    `- Counts toward strict gate: \`${report.summary.countsTowardStrictGate}\``,
    '',
  ];
  for (const item of report.items) {
    lines.push(
      `## ${item.species}`,
      '',
      `- Target: \`${item.targetId}\``,
      `- Status: \`${item.status}\``,
      `- Prompt file: \`${item.promptFile}\``,
      `- Sandbox preview-only: \`${item.sandboxPreviewOnly}\``,
      `- Target gate candidate: \`${item.targetGateCandidate}\``,
      `- Counts toward strict gate: \`${item.countsTowardStrictGate}\``,
      '',
      '**Failed checks**',
      '',
      ...(item.failedChecks.length ? item.failedChecks.map((check) => `- ${check}`) : ['- none']),
      '',
      '**Commands**',
      '',
      '```bash',
      item.commands.openPrompt,
      item.commands.previewPrototype,
      item.commands.previewWithDiver,
      item.commands.rebuildFeedback,
      item.commands.rebuildQueue,
      '```',
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

function html(report) {
  const cards = report.items.map((item) => `<article class="card" data-visual-regeneration-target="${htmlEscape(item.targetId)}">
    <header>
      <div><h2>${htmlEscape(item.species)}</h2><code>${htmlEscape(item.targetId)}</code></div>
      <strong>${htmlEscape(item.status)}</strong>
    </header>
    <p>${htmlEscape(item.summary)}</p>
    <dl>
      <dt>prompt</dt><dd><code>${htmlEscape(item.promptFile)}</code></dd>
      <dt>preview-only</dt><dd>${item.sandboxPreviewOnly ? 'yes' : 'no'}</dd>
      <dt>target gate candidate</dt><dd>${item.targetGateCandidate ? 'yes' : 'no'}</dd>
      <dt>strict gate</dt><dd>${item.countsTowardStrictGate ? 'counts' : 'does not count'}</dd>
    </dl>
    <h3>Failed Checks</h3>
    <ul>${item.failedChecks.map((check) => `<li>${htmlEscape(check)}</li>`).join('')}</ul>
    <h3>Commands</h3>
    <pre><code>${htmlEscape(Object.values(item.commands).join('\n'))}</code></pre>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Visual Regeneration Queue</title>
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
  </style>
</head>
<body>
  <main data-content-visual-regeneration-queue>
    <h1>Visual Regeneration Queue</h1>
    <p>Source-first regeneration briefs for blocked runtime prototypes.</p>
    <div class="notice">These prompts do not approve art. They restart the creature at the full-source concept stage.</div>
    <section class="summary">
      <span>items <strong>${report.summary.items}</strong></span>
      <span>blocking <strong>${report.summary.blockingItems}</strong></span>
      <span>unmapped prototypes <strong>${report.summary.unmappedPrototypeItems}</strong></span>
      <span>strict gate credit <strong>${report.summary.countsTowardStrictGate}</strong></span>
    </section>
    ${cards}
  </main>
</body>
</html>
`;
}

const feedbackLedger = await readJson(paths.feedbackLedger);
if (feedbackLedger?.schema !== 'water9/content-visual-feedback-ledger@1') {
  throw new Error(`Unexpected visual feedback ledger schema ${feedbackLedger?.schema ?? 'missing'}`);
}
const sandboxManifest = await readJson(paths.sandboxManifest, { entries: [] });
const articulatedManifest = await readJson(paths.articulatedManifest, { creatures: [] });
const sandboxById = new Map((sandboxManifest.entries ?? []).map((entry) => [entry.id, entry]));
const runtimeById = new Map((articulatedManifest.creatures ?? []).map((entry) => [entry.id, entry]));

const feedbackItems = (feedbackLedger.items ?? [])
  .filter((item) => item.open && item.severity === 'blocking')
  .sort((a, b) => String(a.targetId).localeCompare(String(b.targetId)));

await mkdir(paths.promptDir, { recursive: true });

const items = [];
for (const [index, item] of feedbackItems.entries()) {
  const sandboxEntry = sandboxById.get(item.targetId);
  const runtimeEntry = runtimeById.get(item.targetId);
  const species = sandboxEntry?.name ?? runtimeEntry?.species ?? item.targetId;
  const promptFile = `public/review/content-visual-regeneration-prompts/${String(index + 1).padStart(2, '0')}-${slug(item.targetId)}.txt`;
  const prompt = promptFor(item, sandboxEntry, runtimeEntry);
  await writeFile(resolve(promptFile), `${prompt}\n`);
  items.push({
    rank: index + 1,
    targetId: item.targetId,
    species,
    status: item.status,
    severity: item.severity,
    summary: item.summary,
    failedChecks: item.failedChecks ?? [],
    requiredAction: item.requiredAction,
    promptFile,
    prompt,
    sandboxRegistered: Boolean(sandboxEntry),
    sandboxPreviewOnly: sandboxEntry?.productionBoundary?.previewOnly === true,
    targetGateCandidate: item.targetGateCandidate === true,
    countsTowardStrictGate: false,
    commands: {
      openPrompt: `sed -n '1,260p' ${promptFile}`,
      previewPrototype: sandboxEntry?.previewCommand ?? `npm run sandbox:preview -- --id ${item.targetId} --serve --open --visual`,
      previewWithDiver: sandboxEntry?.pairedPreviewCommand ?? `npm run sandbox:preview -- --id ${item.targetId} --with diver --serve --open --visual`,
      rebuildFeedback: 'npm run content:visual-feedback && npm run content:visual-feedback-check',
      rebuildQueue: 'npm run content:visual-regeneration && npm run content:visual-regeneration-check',
    },
  });
}

const report = {
  schema: 'water9/content-visual-regeneration-queue@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    feedbackLedger: 'public/review/content-visual-feedback-ledger.json',
    sandboxManifest: 'public/review/sandbox/manifest.json',
    articulatedManifest: 'public/assets/generated/articulated-creatures.parts.json',
  },
  policy: {
    sourceFirstRegenerationRequired: true,
    promptDoesNotApproveArt: true,
    blockedPrototypeCannotCountTowardStrictGate: true,
    mechanicalRigPrototypeIsNotArtDirection: true,
    cohesionFailureRequiresNewSource: true,
  },
  summary: {
    items: items.length,
    blockingItems: items.filter((item) => item.severity === 'blocking').length,
    unmappedPrototypeItems: items.filter((item) => item.sandboxPreviewOnly && !item.targetGateCandidate).length,
    countsTowardStrictGate: items.filter((item) => item.countsTowardStrictGate).length,
    nextTargetId: items[0]?.targetId ?? null,
    nextPromptFile: items[0]?.promptFile ?? null,
  },
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  items: report.summary.items,
  blockingItems: report.summary.blockingItems,
  nextTargetId: report.summary.nextTargetId,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));
