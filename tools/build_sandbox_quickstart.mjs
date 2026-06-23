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
  manifest: resolve(String(args.get('manifest') ?? 'public/review/sandbox/manifest.json')),
  jsonOut: resolve(String(args.get('json-out') ?? 'public/review/sandbox/quickstart.json')),
  markdownOut: resolve(String(args.get('md-out') ?? 'public/review/sandbox/quickstart.md')),
  htmlOut: resolve(String(args.get('html-out') ?? 'public/review/sandbox/quickstart.html')),
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

function withDiver(url) {
  if (!url) return null;
  if (url.includes('companion=')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}companion=diver`;
}

function previewCommand(entry, withDiverCompanion = false) {
  const companion = withDiverCompanion ? ' --with diver' : '';
  return `npm run sandbox:preview -- --id ${entry.id}${companion} --serve --open --visual`;
}

function visualCommand(entry, withDiverCompanion = false) {
  const companion = withDiverCompanion ? ' --with diver' : '';
  if (entry.kind === 'articulated') return `npm run sandbox:visual -- --ids ${entry.id} --states idle,lunge,stunned${companion}`;
  return `npm run sandbox:visual -- --ids ${entry.id}${companion}`;
}

function acceptanceNotice(entry) {
  if (entry.acceptanceNotice) return entry.acceptanceNotice;
  if (entry.acceptedForContentGate) return 'accepted articulated threat; still subject to final content gate count';
  if (entry.kind === 'articulated') return 'preview-only prototype; render/visual pass is not human acceptance';
  if (entry.kind === 'source') return 'source-art preview only; source approval and rig acceptance are separate gates';
  return 'reference preview; not counted by the 20-threat content gate';
}

function manualReviewRequired(entry) {
  if (entry.acceptedForContentGate) return null;
  if (entry.kind === 'articulated') return 'approved source art plus strict human rig and sandbox acceptance';
  if (entry.kind === 'source') return 'human source image approval before rigging';
  return 'reference preview; not part of the 20-threat production gate';
}

function productionBoundary(entry) {
  if (entry.productionBoundary?.schema === 'water9/sandbox-production-boundary@1') return entry.productionBoundary;
  const accepted = Boolean(entry.acceptedForContentGate);
  return {
    schema: 'water9/sandbox-production-boundary@1',
    reviewStage: entry.reviewStage ?? 'reference',
    qualityStatus: entry.qualityStatus ?? null,
    productionReady: accepted,
    acceptedForContentGate: accepted,
    previewOnly: !accepted,
    manualReviewRequired: manualReviewRequired(entry),
    claim: accepted
      ? 'accepted articulated threat with strict review evidence'
      : acceptanceNotice(entry),
  };
}

function markdownFor(report) {
  const rows = report.entries.map((entry) => `| \`${entry.id}\` | ${entry.kind} | ${entry.reviewStage} | ${entry.acceptedForContentGate ? 'yes' : 'no'} | ${entry.productionBoundary.previewOnly ? 'preview-only' : 'accepted'} | \`${entry.previewCommand}\` | \`${entry.pairedPreviewCommand}\` |`).join('\n');
  return `# Water 9 Sandbox Quickstart

Generated: \`${report.generatedAt}\`

Canonical launch commands for every registered Water 9 sandbox entity. Use the paired commands when scale, silhouette, collision, or predator behavior needs to be reviewed against the diver.

Previewable does not mean accepted. Source-review and prototype rows are review aids only.

## Canonical Commands

\`\`\`bash
npm run sandbox:index
npm run sandbox:quickstart && npm run sandbox:quickstart-check
npm run sandbox:preview -- --id abyssal-gulper --with diver --serve --open --visual
npm run sandbox:preview -- --id gulper-eel-maw --with diver --serve --open --visual
\`\`\`

## Counts

- Entries: ${report.summary.entries}
- Articulated: ${report.summary.articulated}
- Source previews: ${report.summary.source}
- Hostile: ${report.summary.hostile}
- Gate accepted: ${report.summary.acceptedForContentGate}
- Preview-only: ${report.summary.previewOnly}

## Entries

| ID | Kind | Stage | Gate Accepted | Production Boundary | Direct Preview | Paired Diver Preview |
| --- | --- | --- | ---: | --- | --- | --- |
${rows}
`;
}

function htmlFor(report) {
  const rows = report.entries.map((entry) => `<tr data-sandbox-quickstart-entry="${htmlEscape(entry.id)}" data-kind="${htmlEscape(entry.kind)}" data-stage="${htmlEscape(entry.reviewStage)}" data-query="${htmlEscape(`${entry.id} ${entry.name} ${entry.kind} ${entry.reviewStage} ${entry.notes}`.toLowerCase())}">
    <td><a href="${htmlEscape(entry.url)}">${htmlEscape(entry.id)}</a></td>
    <td>${htmlEscape(entry.name)}</td>
    <td>${htmlEscape(entry.kind)}</td>
    <td>${htmlEscape(entry.reviewStage)}</td>
    <td>${entry.acceptedForContentGate ? 'yes' : 'no'}</td>
    <td>${htmlEscape(entry.productionBoundary.claim)}</td>
    <td><a href="${htmlEscape(entry.url)}">open</a></td>
    <td><a href="${htmlEscape(entry.pairedUrl)}">with diver</a></td>
    <td><code>${htmlEscape(entry.previewCommand)}</code></td>
    <td><code>${htmlEscape(entry.pairedPreviewCommand)}</code></td>
    <td><code>${htmlEscape(entry.pairedVisualCheckCommand)}</code></td>
    <td>${htmlEscape(entry.acceptanceNotice)}</td>
  </tr>`).join('\n');
  const kindFilters = ['all', ...Object.keys(report.summary.byKind).sort()]
    .map((kind) => `<button type="button" data-kind-filter="${htmlEscape(kind)}">${htmlEscape(kind)}</button>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Sandbox Quickstart</title>
  <style>
    :root { color-scheme: dark; --bg:#061014; --panel:#0c1d24; --line:#294653; --text:#e5f6f8; --muted:#96aeb8; --accent:#7ee8ff; --warn:#f0d9aa; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); }
    main { max-width:1380px; margin:0 auto; padding:28px 18px 48px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,4vw,4rem); letter-spacing:0; }
    p { color:var(--muted); line-height:1.45; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code { font-family:"SFMono-Regular",Consolas,monospace; overflow-wrap:anywhere; }
    pre { border:1px solid var(--line); border-radius:6px; background:#050d11; padding:10px; overflow:auto; white-space:pre-wrap; }
    .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:var(--warn); padding:10px 12px; margin:14px 0; }
    .summary, .toolbar { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span { border:1px solid var(--line); border-radius:6px; background:var(--panel); padding:8px 10px; color:var(--muted); }
    input, button { border:1px solid var(--line); border-radius:6px; background:#081920; color:var(--text); padding:9px 10px; font:inherit; }
    input { flex:1 1 260px; min-width:0; }
    button[aria-pressed="true"] { background:#1a5667; border-color:#55aec3; }
    table { width:100%; border-collapse:collapse; border:1px solid var(--line); background:#081920; }
    th, td { border-bottom:1px solid #18303a; padding:8px 9px; text-align:left; vertical-align:top; }
    th { position:sticky; top:0; background:#10242c; z-index:1; }
    td { color:#c7dbe2; }
  </style>
</head>
<body>
  <main data-sandbox-quickstart>
    <h1>Sandbox Quickstart</h1>
    <p>Canonical launch commands for every registered Water 9 sandbox entity. The paired diver preview is the default review path for scale and behavior.</p>
    <div class="notice">Previewable does not mean accepted. Source-review and prototype rows are review aids only.</div>
    <pre><code>npm run sandbox:index
npm run sandbox:quickstart && npm run sandbox:quickstart-check
npm run sandbox:preview -- --id abyssal-gulper --with diver --serve --open --visual
npm run sandbox:preview -- --id gulper-eel-maw --with diver --serve --open --visual</code></pre>
    <div class="summary">
      <span>entries <strong>${report.summary.entries}</strong></span>
      <span>articulated <strong>${report.summary.articulated}</strong></span>
      <span>source <strong>${report.summary.source}</strong></span>
      <span>hostile <strong>${report.summary.hostile}</strong></span>
      <span>gate accepted <strong>${report.summary.acceptedForContentGate}</strong></span>
      <span>Preview-only: <strong>${report.summary.previewOnly}</strong></span>
    </div>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Filter by id, name, kind, stage, notes">
      ${kindFilters}
    </div>
    <table>
      <thead><tr><th>ID</th><th>Name</th><th>Kind</th><th>Stage</th><th>Gate</th><th>Production Boundary</th><th>Open</th><th>With Diver</th><th>Direct Command</th><th>Paired Command</th><th>Paired Visual</th><th>Notice</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
  <script>
    const search = document.querySelector('#search');
    const buttons = [...document.querySelectorAll('[data-kind-filter]')];
    const rows = [...document.querySelectorAll('[data-sandbox-quickstart-entry]')];
    let kind = 'all';
    function update() {
      const query = search.value.trim().toLowerCase();
      for (const row of rows) {
        row.hidden = !((kind === 'all' || row.dataset.kind === kind) && (!query || row.dataset.query.includes(query)));
      }
      for (const button of buttons) button.setAttribute('aria-pressed', button.dataset.kindFilter === kind ? 'true' : 'false');
    }
    search.addEventListener('input', update);
    for (const button of buttons) button.addEventListener('click', () => { kind = button.dataset.kindFilter; update(); });
    update();
  </script>
</body>
</html>
`;
}

const manifest = await readJson(paths.manifest);
if (manifest.schema !== 'water9/sandbox-index@1') throw new Error(`Unexpected sandbox schema ${manifest.schema ?? 'missing'}`);
const entries = (manifest.entries ?? []).map((entry) => ({
  id: entry.id,
  name: entry.name,
  kind: entry.kind,
  reviewStage: entry.reviewStage ?? 'reference',
  qualityStatus: entry.qualityStatus ?? null,
  acceptedForContentGate: Boolean(entry.acceptedForContentGate),
  hostile: Boolean(entry.hostile),
  url: entry.url,
  pairedUrl: entry.pairedUrl ?? withDiver(entry.url),
  previewCommand: entry.previewCommand ?? previewCommand(entry),
  pairedPreviewCommand: entry.pairedPreviewCommand ?? previewCommand(entry, true),
  visualCheckCommand: entry.visualCheckCommand ?? visualCommand(entry),
  pairedVisualCheckCommand: entry.pairedVisualCheckCommand ?? visualCommand(entry, true),
  acceptanceNotice: acceptanceNotice(entry),
  productionBoundary: productionBoundary(entry),
  notes: entry.notes ?? '',
}));

const byKind = {};
for (const entry of entries) byKind[entry.kind] = (byKind[entry.kind] ?? 0) + 1;
const report = {
  schema: 'water9/sandbox-quickstart@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: paths.manifest,
  summary: {
    entries: entries.length,
    articulated: byKind.articulated ?? 0,
    source: byKind.source ?? 0,
    hostile: entries.filter((entry) => entry.hostile).length,
    acceptedForContentGate: entries.filter((entry) => entry.acceptedForContentGate).length,
    previewOnly: entries.filter((entry) => entry.productionBoundary.previewOnly).length,
    byKind,
  },
  canonicalCommands: {
    rebuildIndex: 'npm run sandbox:index',
    rebuildQuickstart: 'npm run sandbox:quickstart && npm run sandbox:quickstart-check',
    gulperWithDiver: 'npm run sandbox:preview -- --id abyssal-gulper --with diver --serve --open --visual',
    newGulperWithDiver: 'npm run sandbox:preview -- --id gulper-eel-maw --with diver --serve --open --visual',
  },
  entries,
};

await mkdir(dirname(paths.jsonOut), { recursive: true });
await writeFile(paths.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.markdownOut, markdownFor(report));
await writeFile(paths.htmlOut, htmlFor(report));

console.log(JSON.stringify({
  schema: report.schema,
  entries: report.summary.entries,
  articulated: report.summary.articulated,
  source: report.summary.source,
  json: paths.jsonOut,
  markdown: paths.markdownOut,
  html: paths.htmlOut,
}, null, 2));
