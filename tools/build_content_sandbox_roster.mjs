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
  sandbox: resolve(String(args.get('sandbox') ?? 'public/review/sandbox/manifest.json')),
  signoff: resolve(String(args.get('signoff') ?? 'public/review/content-human-signoff-queue.json')),
  outJson: resolve(String(args.get('out-json') ?? 'public/review/content-sandbox-roster.json')),
  outMarkdown: resolve(String(args.get('out-md') ?? 'public/review/content-sandbox-roster.md')),
  outHtml: resolve(String(args.get('out-html') ?? 'public/review/content-sandbox-roster.html')),
};

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function commandFor(entry, companion = '') {
  const companionFlag = companion ? ` --with ${companion}` : '';
  return `npm run sandbox:preview -- --id ${entry.id}${companionFlag} --serve --open --visual`;
}

function visualCommandFor(entry, companion = '') {
  const companionFlag = companion ? ` --with ${companion}` : '';
  if (entry.kind === 'articulated') {
    return `npm run sandbox:visual -- --ids ${entry.id} --states idle,lunge,stunned${companionFlag}`;
  }
  return `npm run sandbox:visual -- --ids ${entry.id}${companionFlag}`;
}

const sandbox = JSON.parse(await readFile(paths.sandbox, 'utf8'));
const signoff = JSON.parse(await readFile(paths.signoff, 'utf8'));
if (sandbox.schema !== 'water9/sandbox-index@1') throw new Error(`unexpected sandbox schema ${sandbox.schema ?? 'missing'}`);
if (signoff.schema !== 'water9/content-human-signoff-queue@1') throw new Error(`unexpected sign-off schema ${signoff.schema ?? 'missing'}`);

const entriesById = new Map((sandbox.entries ?? []).map((entry) => [entry.id, entry]));

const items = (signoff.items ?? []).map((item) => {
  const runtimeEntry = entriesById.get(item.id) ?? null;
  const sourceEntry = entriesById.get(`source-${item.id}`) ?? null;
  const runtimePreview = runtimeEntry?.previewCommand ?? (runtimeEntry ? commandFor(runtimeEntry) : null);
  const runtimePairedPreview = runtimeEntry?.pairedPreviewCommand ?? (runtimeEntry ? commandFor(runtimeEntry, 'diver') : null);
  const runtimeVisual = runtimeEntry?.visualCheckCommand ?? (runtimeEntry ? visualCommandFor(runtimeEntry) : null);
  const runtimePairedVisual = runtimeEntry?.pairedVisualCheckCommand ?? (runtimeEntry ? visualCommandFor(runtimeEntry, 'diver') : null);
  const sourcePreview = sourceEntry?.previewCommand ?? (sourceEntry ? commandFor(sourceEntry) : null);
  const sourcePairedPreview = sourceEntry?.pairedPreviewCommand ?? (sourceEntry ? commandFor(sourceEntry, 'diver') : null);
  const sourceVisual = sourceEntry?.visualCheckCommand ?? (sourceEntry ? visualCommandFor(sourceEntry) : null);
  const sourcePairedVisual = sourceEntry?.pairedVisualCheckCommand ?? (sourceEntry ? visualCommandFor(sourceEntry, 'diver') : null);
  const ready = Boolean(runtimeEntry && sourceEntry && runtimePreview && runtimePairedPreview && runtimeVisual && runtimePairedVisual && sourcePreview && sourcePairedPreview && sourceVisual && sourcePairedVisual);
  return {
    id: item.id,
    species: item.species,
    stage: item.stage,
    sourceApproved: Boolean(item.sourceApproved),
    threatAccepted: Boolean(item.threatAccepted),
    mechanicallyReviewable: Boolean(item.mechanicallyReviewable),
    sandboxReady: ready,
    runtime: runtimeEntry ? {
      id: runtimeEntry.id,
      name: runtimeEntry.name,
      reviewStage: runtimeEntry.reviewStage ?? null,
      qualityStatus: runtimeEntry.qualityStatus ?? null,
      acceptedForContentGate: Boolean(runtimeEntry.acceptedForContentGate),
      url: runtimeEntry.url,
      pairedUrl: runtimeEntry.pairedUrl ?? null,
      previewCommand: runtimePreview,
      pairedPreviewCommand: runtimePairedPreview,
      visualCheckCommand: runtimeVisual,
      pairedVisualCheckCommand: runtimePairedVisual,
    } : null,
    source: sourceEntry ? {
      id: sourceEntry.id,
      name: sourceEntry.name,
      reviewStage: sourceEntry.reviewStage ?? null,
      qualityStatus: sourceEntry.qualityStatus ?? null,
      url: sourceEntry.url,
      pairedUrl: sourceEntry.pairedUrl ?? null,
      previewCommand: sourcePreview,
      pairedPreviewCommand: sourcePairedPreview,
      visualCheckCommand: sourceVisual,
      pairedVisualCheckCommand: sourcePairedVisual,
    } : null,
    evidence: {
      signoff: `/review/content-human-signoff-queue.html#${item.id}`,
      sourceQuickReview: item.evidence?.sourceQuickReview ?? null,
      auditHtml: item.evidence?.auditHtml ?? null,
    },
  };
});

const summary = {
  targetThreats: signoff.summary?.targetThreats ?? 20,
  items: items.length,
  sandboxReady: items.filter((item) => item.sandboxReady).length,
  runtimePreviews: items.filter((item) => item.runtime?.previewCommand).length,
  sourcePreviews: items.filter((item) => item.source?.previewCommand).length,
  pairedRuntimePreviews: items.filter((item) => item.runtime?.pairedPreviewCommand?.includes('--with diver')).length,
  pairedSourcePreviews: items.filter((item) => item.source?.pairedPreviewCommand?.includes('--with diver')).length,
  acceptedThreats: items.filter((item) => item.threatAccepted).length,
  nextGate: signoff.summary?.nextGate ?? null,
};

const report = {
  schema: 'water9/content-sandbox-roster@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    sandbox: 'public/review/sandbox/manifest.json',
    signoff: 'public/review/content-human-signoff-queue.json',
  },
  commands: [
    'npm run sandbox:index',
    'npm run content:sandbox-roster',
    'npm run content:sandbox-roster-check',
    'npm run sandbox:preview -- --id <entity-id> --with diver --serve --open --visual',
    'npm run sandbox:visual -- --ids <entity-id> --with diver',
  ],
  summary,
  items,
};

function renderMarkdown() {
  const lines = [
    '# Water9 Content Sandbox Roster',
    '',
    'Focused quick-preview roster for the 20-threat gate. This page proves each target can be opened as source art, as a rigged runtime threat, and paired with the diver for scale/behavior review.',
    '',
    `- Target threats: ${summary.targetThreats}`,
    `- Sandbox-ready routes: ${summary.sandboxReady}/${summary.items}`,
    `- Runtime previews: ${summary.runtimePreviews}`,
    `- Source previews: ${summary.sourcePreviews}`,
    `- Paired runtime previews: ${summary.pairedRuntimePreviews}`,
    `- Paired source previews: ${summary.pairedSourcePreviews}`,
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
    lines.push(`- sandboxReady: ${item.sandboxReady ? 'yes' : 'no'}`);
    lines.push(`- stage: ${item.stage}`);
    lines.push(`- source approval: ${item.sourceApproved ? 'approved' : 'pending'}`);
    lines.push(`- threat accepted: ${item.threatAccepted ? 'yes' : 'no'}`);
    lines.push(`- runtime preview: \`${item.runtime?.previewCommand ?? 'missing'}\``);
    lines.push(`- runtime paired preview: \`${item.runtime?.pairedPreviewCommand ?? 'missing'}\``);
    lines.push(`- runtime paired visual: \`${item.runtime?.pairedVisualCheckCommand ?? 'missing'}\``);
    lines.push(`- source preview: \`${item.source?.previewCommand ?? 'missing'}\``);
    lines.push(`- source paired preview: \`${item.source?.pairedPreviewCommand ?? 'missing'}\``);
    lines.push(`- source paired visual: \`${item.source?.pairedVisualCheckCommand ?? 'missing'}\``);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function renderHtml() {
  const rows = items.map((item) => `
        <tr data-sandbox-roster="${htmlEscape(item.id)}" data-ready="${item.sandboxReady ? 'yes' : 'no'}">
          <td><code>${htmlEscape(item.id)}</code><br>${htmlEscape(item.species)}</td>
          <td>${item.sandboxReady ? 'yes' : 'no'}</td>
          <td>${htmlEscape(item.stage)}</td>
          <td><a href="${htmlEscape(item.runtime?.url ?? '#')}">runtime</a><br><a href="${htmlEscape(item.runtime?.pairedUrl ?? '#')}">with diver</a></td>
          <td><a href="${htmlEscape(item.source?.url ?? '#')}">source</a><br><a href="${htmlEscape(item.source?.pairedUrl ?? '#')}">with diver</a></td>
          <td><code>${htmlEscape(item.runtime?.previewCommand ?? 'missing')}</code><br><code>${htmlEscape(item.runtime?.pairedPreviewCommand ?? 'missing')}</code></td>
          <td><code>${htmlEscape(item.runtime?.pairedVisualCheckCommand ?? 'missing')}</code></td>
          <td><code>${htmlEscape(item.source?.previewCommand ?? 'missing')}</code><br><code>${htmlEscape(item.source?.pairedPreviewCommand ?? 'missing')}</code></td>
          <td><code>${htmlEscape(item.source?.pairedVisualCheckCommand ?? 'missing')}</code></td>
        </tr>`).join('');
  const commandRows = report.commands
    .map((command) => `<li><code>${htmlEscape(command)}</code></li>`)
    .join('');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Water9 Content Sandbox Roster</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#061014; color:#e5f6f8; }
      body { margin:0; background:#061014; }
      main { max-width:1220px; margin:0 auto; padding:28px 18px 48px; }
      h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4.2rem); letter-spacing:0; }
      p { color:#9db7c2; line-height:1.5; }
      .summary { display:flex; flex-wrap:wrap; gap:10px; margin:18px 0; }
      .summary span { border:1px solid #294653; border-radius:6px; background:#0b1d24; padding:8px 10px; color:#bdd6df; }
      .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:#f0d9aa; padding:10px 12px; margin:16px 0; }
      table { width:100%; border-collapse:collapse; border:1px solid #203b46; background:#081920; }
      th, td { border-bottom:1px solid #18303a; padding:9px 10px; text-align:left; vertical-align:top; }
      th { position:sticky; top:0; background:#10242c; z-index:1; }
      code { color:#cfeef6; overflow-wrap:anywhere; font-family:"SFMono-Regular", Consolas, monospace; }
      a { color:#7ee8ff; text-decoration:none; }
      a:hover { text-decoration:underline; }
      @media (max-width:760px) { main { padding:18px 10px 32px; } table { font-size:.82rem; } th,td { padding:7px 6px; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Content Sandbox Roster</h1>
      <p>Quick launch surface for all 20 target threats. Each row must provide source, runtime, paired-diver preview, and visual-check commands before the content route can be considered mechanically reviewable.</p>
      <div class="notice">Previewable does not mean accepted. Human source approval and threat acceptance remain separate gates.</div>
      <div class="summary">
        <span>${summary.sandboxReady}/${summary.items} sandbox-ready</span>
        <span>${summary.runtimePreviews} runtime previews</span>
        <span>${summary.sourcePreviews} source previews</span>
        <span>${summary.pairedRuntimePreviews} paired runtime</span>
        <span>${summary.pairedSourcePreviews} paired source</span>
        <span>${summary.acceptedThreats} accepted threats</span>
      </div>
      <h2>Commands</h2>
      <ul>${commandRows}</ul>
      <table>
        <thead><tr><th>Target</th><th>Ready</th><th>Stage</th><th>Runtime</th><th>Source</th><th>Runtime Paired Preview</th><th>Runtime Paired Visual</th><th>Source Paired Preview</th><th>Source Paired Visual</th></tr></thead>
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
  schema: 'water9/content-sandbox-roster-build@1',
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
  summary,
}, null, 2));
