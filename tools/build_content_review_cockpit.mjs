import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  matrix: resolve(String(args.get('matrix') ?? 'public/review/content-review-evidence-matrix.json')),
  quickReviews: resolve(String(args.get('quick-reviews') ?? 'public/review/source-candidates/quick-reviews/index.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  acceptanceRunway: resolve(String(args.get('acceptance-runway') ?? 'public/review/content-acceptance-runway.json')),
  sandboxVisualReport: resolve(String(args.get('sandbox-visual-report') ?? 'tools/scratch/sandbox-visuals-report.json')),
  sourceParity: resolve(String(args.get('source-parity') ?? 'tools/scratch/articulated-source-parity.json')),
  outDir: resolve(String(args.get('out-dir') ?? 'public/review/content-review-cockpit')),
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

async function fileExists(path) {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
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

function safeFileName(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function publicUrl(path) {
  if (!path) return null;
  if (path.startsWith('/review/') || path.startsWith('/assets/')) return path;
  if (path.startsWith('public/')) return `/${path.slice('public/'.length)}`;
  return null;
}

async function evidenceUrl(sourcePath, candidateId, label, evidenceDir) {
  if (!sourcePath) return null;
  const publicPath = publicUrl(sourcePath);
  if (publicPath) return publicPath;
  const absolute = resolve(sourcePath);
  if (!(await fileExists(absolute))) return null;
  const ext = extname(absolute) || extname(basename(absolute)) || '.png';
  const outName = `${safeFileName(candidateId)}__${safeFileName(label)}${ext}`;
  const outPath = resolve(evidenceDir, outName);
  await copyFile(absolute, outPath);
  return `/review/content-review-cockpit/evidence/${outName}`;
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function dryRunDecisionCommand(command) {
  if (!command) return null;
  const text = String(command);
  const isDecisionCommand = text.includes('npm run source:accept') || text.includes('npm run content:accept');
  if (!isDecisionCommand || text.includes('--dry-run')) return text;
  return `${text} --dry-run`;
}

function mediaTile(item) {
  if (!item?.url) {
    return `<div class="tile missing"><span>${htmlEscape(item?.label ?? 'missing evidence')}</span><strong>missing</strong></div>`;
  }
  return `<a class="tile" href="${htmlEscape(item.url)}">
    <img src="${htmlEscape(item.url)}" alt="${htmlEscape(item.label)}">
    <span>${htmlEscape(item.label)}</span>
  </a>`;
}

function renderCandidatePage(page) {
  const media = page.media.map(mediaTile).join('\n');
  const blockers = page.blockers.length ? page.blockers.map((blocker) => `<li>${htmlEscape(blocker)}</li>`).join('') : '<li>None recorded.</li>';
  const statePills = page.statuses.map(([label, value]) => `<span>${htmlEscape(label)} <strong>${htmlEscape(value)}</strong></span>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(page.species)} Review Cockpit</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1a1e; --line:#29454c; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; --warn:#f0c36b; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1500px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 4px; font-size:30px; }
    h2 { margin:24px 0 10px; font-size:18px; }
    p { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .warning { color:var(--warn); }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0 20px; }
    .summary span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); margin-left:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
    .tile { min-height:210px; border:1px solid var(--line); background:#050b0d; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; }
    .tile img { width:100%; height:190px; object-fit:contain; background:#050b0d; }
    .tile span, .tile strong { display:block; padding:8px; color:var(--muted); }
    .missing { align-items:center; justify-content:center; color:var(--warn); }
    .panel { border:1px solid var(--line); border-radius:7px; background:var(--panel); padding:14px; margin-top:14px; }
    .links { display:flex; flex-wrap:wrap; gap:12px; margin-top:8px; }
  </style>
</head>
<body>
  <main>
    <p><a href="index.html">Back to cockpit index</a></p>
    <h1>${htmlEscape(page.species)}</h1>
    <code>${htmlEscape(page.id)}</code>
    <p class="warning">Prototype evidence is not acceptance. This page is for review speed only; the strict gate still requires human source approval and human rig acceptance.</p>
    <p class="warning">Human Approval Boundary: cockpit decision commands are dry-runs only. Run final approval from the dedicated source approval or threat acceptance runway after direct human review.</p>
    <div class="summary">${statePills}</div>
    <div class="links">
      ${page.links.quickReview ? `<a href="${htmlEscape(page.links.quickReview)}">source quick review</a>` : ''}
      ${page.links.sourcePacket ? `<a href="${htmlEscape(page.links.sourcePacket)}">source packet</a>` : ''}
      ${page.links.acceptancePacket ? `<a href="${htmlEscape(page.links.acceptancePacket)}">acceptance packet</a>` : ''}
      ${page.links.sourceSandbox ? `<a href="${htmlEscape(page.links.sourceSandbox)}">source sandbox</a>` : ''}
      ${page.links.sandbox ? `<a href="${htmlEscape(page.links.sandbox)}">live sandbox</a>` : ''}
      ${page.links.sideBySideSandbox ? `<a href="${htmlEscape(page.links.sideBySideSandbox)}">side-by-side sandbox</a>` : ''}
    </div>
    <h2>Evidence</h2>
    <section class="grid">${media}</section>
    <section class="panel">
      <h2>Blockers</h2>
      <ul>${blockers}</ul>
    </section>
    <section class="panel">
      <h2>Commands</h2>
      ${commandBlock(page.commands)}
    </section>
  </main>
</body>
</html>
`;
}

function renderIndex(manifest) {
  const cards = manifest.pages.map((page) => `<article class="card">
    <header>
      <div><h2><a href="${htmlEscape(page.href)}">${htmlEscape(page.species)}</a></h2><code>${htmlEscape(page.id)}</code></div>
      <strong>${htmlEscape(page.nextHumanGate)}</strong>
    </header>
    <div class="thumbs">
      ${page.media?.slice(0, 4).map((item) => item.url
        ? `<a href="${htmlEscape(item.url)}" title="${htmlEscape(item.label)}"><img src="${htmlEscape(item.url)}" alt="${htmlEscape(item.label)}"></a>`
        : `<span title="${htmlEscape(item.label)}">missing</span>`).join('') ?? ''}
    </div>
    <p>${htmlEscape(page.blockers.join('; ') || 'No blockers recorded.')}</p>
    <div class="badges">
      <span>source ${htmlEscape(page.sourceReviewStatus)}</span>
      <span>rig ${htmlEscape(page.rigReviewStatus)}</span>
      <span>media ${page.mediaCount}</span>
    </div>
    <div class="links">
      ${page.links.quickReview ? `<a href="${htmlEscape(page.links.quickReview)}">quick review</a>` : ''}
      ${page.links.sourceSandbox ? `<a href="${htmlEscape(page.links.sourceSandbox)}">source sandbox</a>` : ''}
      ${page.links.sideBySideSandbox ? `<a href="${htmlEscape(page.links.sideBySideSandbox)}">side by side</a>` : ''}
    </div>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Review Cockpit</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1a1e; --line:#29454c; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; --warn:#f0c36b; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1420px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    p { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    code { color:var(--muted); }
    .summary, .badges { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span, .badges span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); margin-left:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:14px; }
    .card { border:1px solid var(--line); border-radius:7px; background:var(--panel); padding:14px; }
    .card header { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; }
    .card header strong { color:var(--warn); text-align:right; }
    .thumbs { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; margin:12px 0; }
    .thumbs a, .thumbs span { border:1px solid var(--line); min-height:72px; background:#050b0d; display:grid; place-items:center; color:var(--muted); overflow:hidden; }
    .thumbs img { width:100%; height:72px; object-fit:contain; }
    .links { display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Review Cockpit</h1>
    <p>One page per threat candidate with source, key, plan, parity, and sandbox evidence. Prototype evidence is not acceptance. Human Approval Boundary: cockpit decision commands are dry-runs only.</p>
    <div class="summary">
      <span>candidates <strong>${manifest.summary.candidates}</strong></span>
      <span>mapped runtime <strong>${manifest.summary.runtimeMappedCandidates}</strong></span>
      <span>unmapped prototypes <strong>${manifest.summary.unmappedPrototypeThreats}</strong></span>
      <span>accepted threats <strong>${manifest.summary.acceptedThreats}/${manifest.summary.targetThreats}</strong></span>
      <span>next human gate <strong>${htmlEscape(manifest.summary.nextHumanGate)}</strong></span>
    </div>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;
}

function renderMarkdown(manifest) {
  const rows = manifest.pages.map((page) => `| \`${mdEscape(page.id)}\` | ${mdEscape(page.species)} | ${mdEscape(page.sourceReviewStatus)} | ${mdEscape(page.rigReviewStatus)} | ${page.mediaCount} | ${mdEscape(page.href)} |`).join('\n');
  return `# Water 9 Review Cockpit

Prototype evidence is not acceptance. Use these pages to inspect one candidate at a time.

| Candidate | Species | Source | Rig | Media | Page |
| --- | --- | --- | --- | ---: | --- |
${rows}
`;
}

const [
  matrix,
  quickReviews,
  planCoverage,
  acceptanceRunway,
  sandboxVisualReport,
  sourceParity,
] = await Promise.all([
  readJson(paths.matrix, { rows: [], summary: {} }),
  readJson(paths.quickReviews, { reviews: [] }),
  readJson(paths.planCoverage, { items: [] }),
  readJson(paths.acceptanceRunway, { items: [] }),
  readJson(paths.sandboxVisualReport, { results: [] }),
  readJson(paths.sourceParity, { creatures: [] }),
]);

const evidenceDir = resolve(paths.outDir, 'evidence');
await mkdir(evidenceDir, { recursive: true });

const quickById = new Map(asArray(quickReviews.reviews).map((item) => [item.id, item]));
const planById = new Map(asArray(planCoverage.items).map((item) => [item.id, item]));
const acceptanceById = new Map(asArray(acceptanceRunway.items).map((item) => [item.id, item]));
const sandboxById = new Map(asArray(sandboxVisualReport.results).map((item) => [item.id, item]));
const parityById = new Map(asArray(sourceParity.creatures).map((item) => [item.id, item]));

const pages = [];
for (const row of asArray(matrix.rows)) {
  const quick = quickById.get(row.id) ?? {};
  const plan = planById.get(row.id) ?? {};
  const acceptance = acceptanceById.get(row.id) ?? {};
  const sandbox = row.runtimeId ? sandboxById.get(row.runtimeId) : null;
  const parity = row.runtimeId ? parityById.get(row.runtimeId) : null;
  const media = [
    { label: 'source art', url: await evidenceUrl(quick.links?.source ?? quick.source ?? row.sourcePath, row.id, 'source', evidenceDir) },
    { label: 'magenta key preview', url: await evidenceUrl(quick.links?.keyPreview, row.id, 'key-preview', evidenceDir) },
    { label: 'source sandbox preview', url: await evidenceUrl(quick.links?.sandboxScreenshot, row.id, 'source-sandbox-preview', evidenceDir) },
    { label: 'articulation plan preview', url: await evidenceUrl(plan.planPreview, row.id, 'plan-preview', evidenceDir) },
    { label: 'source parity overlay', url: await evidenceUrl(parity?.debugImage ?? row.sourceParityDebugImage, row.id, 'source-parity', evidenceDir) },
    ...asArray(sandbox?.states).map((state) => ({
      label: `sandbox ${state.state}`,
      sourcePath: state.screenshotPath,
    })),
  ];
  for (const item of media) {
    if (!item.url && item.sourcePath) item.url = await evidenceUrl(item.sourcePath, row.id, item.label, evidenceDir);
  }
  const presentMedia = media.filter((item) => item.url);
  const page = {
    id: row.id,
    species: row.species,
    href: `${safeFileName(row.id)}.html`,
    file: resolve(paths.outDir, `${safeFileName(row.id)}.html`),
    sourceReviewStatus: row.sourceReviewStatus,
    rigReviewStatus: row.rigReviewStatus,
    nextHumanGate: row.nextHumanGate,
    media,
    mediaCount: presentMedia.length,
    blockers: asArray(row.blockers),
    statuses: [
      ['source', row.sourceReviewStatus],
      ['rig', row.rigReviewStatus],
      ['runtime', row.runtimeId ?? 'none'],
      ['accepted', row.threatAccepted ? 'yes' : 'no'],
      ['media', presentMedia.length],
    ],
    links: {
      quickReview: quick.href ?? null,
      sourcePacket: row.sourceReviewPacket ? publicUrl(row.sourceReviewPacket) : null,
      acceptancePacket: acceptance.acceptancePacket?.file ? publicUrl(acceptance.acceptancePacket.file) : null,
      sourceSandbox: `/?entity=source-${encodeURIComponent(row.id)}&companion=diver`,
      sandbox: row.sandboxUrl ?? null,
      sideBySideSandbox: row.runtimeId ? `/?sandbox=${encodeURIComponent(row.runtimeId)}&companion=diver` : null,
    },
    commands: [
      'npm run content:review-cockpit',
      'npm run content:review-cockpit-check',
      `npm run sandbox:preview -- --id source-${row.id} --with diver --serve --open --visual`,
      dryRunDecisionCommand(quick.acceptCommand),
      dryRunDecisionCommand(quick.rejectCommand),
      plan.commands?.runtimePreview,
      row.runtimeId ? `npm run sandbox:preview -- --id ${row.runtimeId} --with diver --serve --open --visual` : null,
      row.runtimeId ? `npm run sandbox:visual -- --ids ${row.runtimeId} --states idle,lunge,stunned --with diver` : null,
      dryRunDecisionCommand(acceptance.nextAction),
    ],
  };
  await writeFile(page.file, renderCandidatePage(page));
  pages.push({
    id: page.id,
    species: page.species,
    href: page.href,
    file: page.file,
    sourceReviewStatus: page.sourceReviewStatus,
    rigReviewStatus: page.rigReviewStatus,
    nextHumanGate: page.nextHumanGate,
    blockers: page.blockers,
    mediaCount: page.mediaCount,
    mediaLabels: presentMedia.map((item) => item.label),
    media: page.media.map((item) => ({
      label: item.label,
      url: item.url ?? null,
      present: Boolean(item.url),
    })),
    links: page.links,
    commands: page.commands.filter(Boolean),
  });
}

const manifest = {
  schema: 'water9/content-review-cockpit@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: Object.fromEntries(await Promise.all(Object.entries(paths)
    .filter(([key]) => key !== 'outDir')
    .map(async ([key, path]) => [key, await fileSummary(path)]))),
  summary: {
    targetThreats: matrix.summary?.targetThreats ?? 20,
    candidates: pages.length,
    runtimeMappedCandidates: matrix.summary?.runtimeMappedCandidates ?? 0,
    unmappedPrototypeThreats: matrix.summary?.unmappedPrototypeThreats ?? 0,
    acceptedThreats: matrix.summary?.acceptedThreats ?? 0,
    nextHumanGate: matrix.summary?.nextHumanGate ?? 'unknown',
  },
  pages,
};

await mkdir(paths.outDir, { recursive: true });
await writeFile(resolve(paths.outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(resolve(paths.outDir, 'index.html'), renderIndex(manifest));
await writeFile(resolve(paths.outDir, 'index.md'), renderMarkdown(manifest));

console.log(JSON.stringify({
  schema: manifest.schema,
  outDir: paths.outDir,
  candidates: manifest.summary.candidates,
  runtimeMappedCandidates: manifest.summary.runtimeMappedCandidates,
  acceptedThreats: manifest.summary.acceptedThreats,
}, null, 2));
