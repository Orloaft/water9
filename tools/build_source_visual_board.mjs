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
  runway: resolve(String(args.get('runway') ?? 'public/review/source-approval-runway.json')),
  checklist: resolve(String(args.get('checklist') ?? 'public/review/source-approval-checklist.json')),
  dossier: resolve(String(args.get('dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  planCoverage: resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-visual-board.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/source-visual-board.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-visual-board.html')),
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

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function publicUrl(path) {
  if (!path) return null;
  if (String(path).startsWith('/')) return path;
  if (String(path).startsWith('public/')) return `/${String(path).slice('public/'.length)}`;
  return path;
}

function imageTile(label, url) {
  if (!url) {
    return `<div class="image missing"><span>${htmlEscape(label)}</span><strong>missing</strong></div>`;
  }
  return `<a class="image" href="${htmlEscape(url)}" data-board-media="${htmlEscape(label)}">
    <img src="${htmlEscape(url)}" alt="${htmlEscape(label)}">
    <span>${htmlEscape(label)}</span>
  </a>`;
}

function pathForPublicUrl(url) {
  if (!url) return null;
  if (String(url).startsWith('/review/')) return resolve('public', String(url).slice(1));
  if (String(url).startsWith('/assets/')) return resolve('public', String(url).slice(1));
  if (String(url).startsWith('public/')) return resolve(String(url));
  return null;
}

async function fileFingerprintForUrl(url) {
  const path = pathForPublicUrl(url);
  if (!path) return { url, path: null, exists: false, size: 0, sha256: null };
  try {
    const [info, buffer] = await Promise.all([stat(path), readFile(path)]);
    return {
      url,
      path,
      exists: info.isFile(),
      size: info.size,
      mtimeMs: Math.round(info.mtimeMs),
      sha256: createHash('sha256').update(buffer).digest('hex'),
    };
  } catch {
    return { url, path, exists: false, size: 0, sha256: null };
  }
}

function renderHtml(board) {
  const rows = board.items.map((item) => {
    const blockers = item.blockers.length
      ? item.blockers.map((blocker) => `<li>${htmlEscape(blocker)}</li>`).join('')
      : '<li>No blockers recorded.</li>';
    const contract = item.contractReviewChecklist.length
      ? item.contractReviewChecklist.map((entry) => `<li>${htmlEscape(entry)}</li>`).join('')
      : '<li>No contract checklist recorded.</li>';
    const reads = item.requiredRead.length
      ? item.requiredRead.map((entry) => `<li>${htmlEscape(entry)}</li>`).join('')
      : '<li>No required read recorded.</li>';
    return `<article class="candidate" id="${htmlEscape(item.id)}" data-source-visual-board-candidate="${htmlEscape(item.id)}">
      <header>
        <div>
          <h2>${htmlEscape(item.species)}</h2>
          <code>${htmlEscape(item.id)}</code>
        </div>
        <strong>${htmlEscape(item.state)}</strong>
      </header>
      <div class="media">
        ${imageTile('source', item.media.source)}
        ${imageTile('magenta key', item.media.keyPreview)}
        ${imageTile('sandbox source preview', item.media.sandboxScreenshot)}
        ${imageTile('articulation plan preview', item.media.planPreview)}
      </div>
      <div class="metrics">
        <span>subject ${htmlEscape(item.metrics.subjectSize?.join(' x ') ?? 'unknown')}</span>
        <span>background ${htmlEscape(item.metrics.backgroundRatio ?? 'unknown')}</span>
        <span>inner key ${htmlEscape(item.metrics.innerMagentaRatio ?? 'unknown')}</span>
        <span>plan ${item.planPreviewPresent ? 'present' : 'missing'}</span>
      </div>
      <section class="notes">
        <div>
          <h3>Contract Checks</h3>
          <ul>${contract}</ul>
        </div>
        <div>
          <h3>Required Read</h3>
          <ul>${reads}</ul>
        </div>
        <div>
          <h3>Blockers</h3>
          <ul>${blockers}</ul>
        </div>
      </section>
      <div class="links">
        <a href="${htmlEscape(item.links.quickReview)}">quick review</a>
        <a href="${htmlEscape(item.links.sourceRunway)}#${htmlEscape(item.id)}">approval runway</a>
        ${item.links.sourceSandbox ? `<a href="${htmlEscape(item.links.sourceSandbox)}">source sandbox</a>` : ''}
        ${item.links.runtimeSandbox ? `<a href="${htmlEscape(item.links.runtimeSandbox)}">runtime sandbox</a>` : ''}
      </div>
    </article>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Visual Board</title>
  <style>
    :root { color-scheme: dark; --bg:#050b0d; --panel:#0c181c; --line:#2a444d; --text:#e8f6f6; --muted:#90a8ad; --accent:#7adff6; --warn:#e5bd70; --bad:#ff8585; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { width:min(1840px,100%); margin:0 auto; padding:24px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:19px; }
    h3 { margin:0 0 8px; color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
    p, li, code { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .summary, .metrics, .links { display:flex; flex-wrap:wrap; gap:8px; }
    .summary { margin:16px 0 22px; }
    .summary span, .metrics span { border:1px solid var(--line); background:#081316; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); margin-left:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(640px,1fr)); gap:14px; align-items:start; }
    .candidate { border:1px solid var(--line); border-radius:7px; background:var(--panel); padding:14px; }
    .candidate header { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:12px; }
    .candidate header strong { color:var(--warn); text-align:right; }
    .media { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
    .image { min-height:240px; border:1px solid var(--line); background:#020607; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; }
    .image img { width:100%; height:220px; object-fit:contain; image-rendering:auto; background:#020607; }
    .image span, .image strong { display:block; padding:7px; color:var(--muted); font-size:12px; }
    .missing { align-items:center; justify-content:center; color:var(--bad); }
    .metrics { margin:10px 0; }
    .notes { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin:12px 0; }
    .notes div { border:1px solid var(--line); border-radius:5px; background:#071114; padding:10px; }
    ul { margin:0; padding-left:18px; }
    .links { border-top:1px solid var(--line); padding-top:10px; }
    .warning { color:var(--warn); max-width:900px; }
    @media (max-width:900px) {
      main { padding:14px; }
      .grid { grid-template-columns:1fr; }
      .media { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .notes { grid-template-columns:1fr; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Visual Board</h1>
    <p class="warning">This board exists to expose weak cohesion before approval. It is visual review evidence, not production acceptance.</p>
    <div class="summary">
      <span>candidates <strong>${board.summary.candidates}</strong></span>
      <span>ready for human source review <strong>${board.summary.readyForHumanReview}</strong></span>
      <span>human approved <strong>${board.summary.humanApproved}</strong></span>
      <span>accepted threats <strong>${board.summary.acceptedThreats}</strong></span>
      <span>next gate <strong>${htmlEscape(board.summary.nextGate)}</strong></span>
    </div>
    <section class="grid">${rows}</section>
  </main>
</body>
</html>
`;
}

function renderMarkdown(board) {
  const rows = board.items.map((item) => `| \`${mdEscape(item.id)}\` | ${mdEscape(item.species)} | ${mdEscape(item.state)} | ${item.requiredRead.length} | ${item.contractReviewChecklist.length} | ${item.blockers.length} | ${mdEscape(item.links.quickReview)} |`).join('\n');
  return `# Water 9 Source Visual Board

This board is for fast visual review of source cohesion. It does not approve production content.

| Candidate | Species | State | Required Read | Contract Checks | Blockers | Quick Review |
| --- | --- | --- | ---: | ---: | ---: | --- |
${rows}
`;
}

const [runway, checklist, dossier, planCoverage] = await Promise.all([
  readJson(paths.runway),
  readJson(paths.checklist),
  readJson(paths.dossier),
  readJson(paths.planCoverage),
]);

if (runway.schema !== 'water9/source-approval-runway@1') throw new Error(`Unexpected runway schema ${runway.schema ?? 'missing'}`);
if (checklist.schema !== 'water9/source-approval-checklist@1') throw new Error(`Unexpected checklist schema ${checklist.schema ?? 'missing'}`);
if (dossier.schema !== 'water9/source-review-dossier@1') throw new Error(`Unexpected dossier schema ${dossier.schema ?? 'missing'}`);
if (planCoverage.schema !== 'water9/content-plan-coverage@1') throw new Error(`Unexpected plan coverage schema ${planCoverage.schema ?? 'missing'}`);

const checklistById = new Map(asArray(checklist.items).map((item) => [item.id, item]));
const dossierById = new Map(asArray(dossier.items).map((item) => [item.id, item]));
const planById = new Map(asArray(planCoverage.items).map((item) => [item.id, item]));
const items = await Promise.all(asArray(runway.items).map(async (item) => {
  const check = checklistById.get(item.id) ?? {};
  const dossierItem = dossierById.get(item.id) ?? {};
  const plan = planById.get(item.id) ?? {};
  const state = item.humanApproved ? 'approved-source' : item.readyForHumanReview ? 'awaiting-human-source-approval' : 'blocked-before-source-review';
  const sourceSandbox = `/?entity=source-${encodeURIComponent(item.id)}&companion=diver`;
  const runtimeSandbox = plan.runtimeRegistered ? `/?sandbox=${encodeURIComponent(plan.runtimeId ?? item.id)}&companion=diver` : null;
  const media = {
    source: item.links?.source ?? null,
    keyPreview: item.links?.keyPreview ?? null,
    sandboxScreenshot: item.links?.sandboxScreenshot ?? null,
    planPreview: item.links?.planPreview ?? null,
  };
  const mediaEvidence = Object.fromEntries(await Promise.all(Object.entries(media).map(async ([label, url]) => [
    label,
    await fileFingerprintForUrl(url),
  ])));
  return {
    rank: item.rank,
    id: item.id,
    species: item.species,
    state,
    readyForHumanReview: item.readyForHumanReview === true,
    humanApproved: item.humanApproved === true,
    planPreviewPresent: item.planPreviewPresent === true,
    media,
    mediaEvidence,
    metrics: item.metrics ?? {},
    requiredRead: asArray(check.contract?.requiredRead ?? dossierItem.contract?.requiredRead).filter(Boolean),
    contractReviewChecklist: asArray(check.contract?.contractReviewChecklist ?? dossierItem.contract?.contractReviewChecklist).filter(Boolean),
    blockers: asArray(check.blockers ?? item.blockers),
    links: {
      quickReview: item.links?.quickReview ?? null,
      sourceRunway: '/review/source-approval-runway.html',
      sourceSandbox,
      runtimeSandbox,
    },
  };
}));

const board = {
  schema: 'water9/source-visual-board@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    runway: paths.runway,
    checklist: paths.checklist,
    dossier: paths.dossier,
    planCoverage: paths.planCoverage,
  },
  summary: {
    candidates: items.length,
    readyForHumanReview: items.filter((item) => item.readyForHumanReview && !item.humanApproved).length,
    humanApproved: items.filter((item) => item.humanApproved).length,
    acceptedThreats: planCoverage.summary?.acceptedThreats ?? 0,
    nextGate: items.some((item) => !item.humanApproved) ? 'human source approval' : 'rig acceptance',
  },
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(board, null, 2)}\n`);
await writeFile(paths.outMd, renderMarkdown(board));
await writeFile(paths.outHtml, renderHtml(board));

console.log(JSON.stringify({
  schema: board.schema,
  candidates: board.summary.candidates,
  readyForHumanReview: board.summary.readyForHumanReview,
  humanApproved: board.summary.humanApproved,
  acceptedThreats: board.summary.acceptedThreats,
  json: paths.outJson,
  markdown: paths.outMd,
  html: paths.outHtml,
}, null, 2));
