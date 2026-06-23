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
  sourceNextReview: resolve(String(args.get('source-next-review') ?? 'public/review/source-candidates/source-next-review.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-next-decision-draft.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-next-decision-draft.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-next-decision-draft.html')),
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

function markdown(report) {
  return `# Water 9 Next Source Decision Draft

Generated: \`${report.generatedAt}\`

This focused draft does not approve source art. It extracts the current next source-review target into a one-decision file that a human reviewer can edit after inspecting the source, key preview, sandbox preview, and plan preview.

## Target

- id: \`${report.target.id}\`
- species: ${report.target.species}
- status: \`${report.decisionFile.decisions[0].status}\`
- reviewed-only filename: \`${report.reviewedDecisionFilename}\`

## Evidence

- source: ${report.target.media.source}
- magenta key: ${report.target.media.keyPreview}
- sandbox preview: ${report.target.media.sandboxScreenshot}
- plan preview: ${report.target.media.planPreview}

## Decision File Draft

\`\`\`json
${JSON.stringify(report.decisionFile, null, 2)}
\`\`\`

## Commands

\`\`\`bash
${report.commands.rebuild}
${report.commands.check}
${report.commands.strictDryRun}
${report.commands.strictApply}
\`\`\`
`;
}

function html(report) {
  const decisionJson = JSON.stringify(report.decisionFile, null, 2);
  const target = report.target;
  const media = [
    ['source', target.media.source],
    ['magenta key', target.media.keyPreview],
    ['sandbox preview', target.media.sandboxScreenshot],
    ['plan preview', target.media.planPreview],
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Next Source Decision Draft</title>
  <style>
    :root { color-scheme: dark; background:#061115; color:#e4f2f3; font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    body { margin:0; padding:24px; background:#061115; }
    main { max-width:1280px; margin:0 auto; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    h2 { margin:22px 0 10px; }
    p, li { color:#bdd2d6; }
    code, pre, textarea { font-family:"SFMono-Regular",Consolas,monospace; }
    pre, textarea { border:1px solid #25434b; background:#041014; color:#dff8ff; border-radius:6px; padding:10px; }
    textarea { width:100%; min-height:520px; resize:vertical; }
    .notice { border:1px solid #715a2c; background:#20190e; color:#f4d89b; border-radius:6px; padding:12px; margin:14px 0; }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:8px; margin:16px 0; }
    .summary span { border:1px solid #243f47; background:#091a1f; border-radius:5px; padding:8px; }
    .media { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
    .media a { display:block; border:1px solid #243f47; border-radius:6px; overflow:hidden; background:#07151a; color:#d8f6ff; text-decoration:none; }
    .media img { display:block; width:100%; aspect-ratio:16/10; object-fit:contain; background:#02090b; }
    .media span { display:block; padding:8px; font-weight:700; }
  </style>
</head>
<body>
  <main data-source-next-decision-draft data-source-next-decision-target="${htmlEscape(target.id)}">
    <h1>Next Source Decision Draft</h1>
    <p>Focused reviewed-only decision draft for ${htmlEscape(target.species)}.</p>
    <div class="notice">This focused draft does not approve source art. The JSON must be completed by a human reviewer before strict dry-run or apply.</div>
    <section class="summary">
      <span>target <b>${htmlEscape(target.id)}</b></span>
      <span>species <b>${htmlEscape(target.species)}</b></span>
      <span>status <b>${htmlEscape(report.decisionFile.decisions[0].status)}</b></span>
      <span>filename <b>${htmlEscape(report.reviewedDecisionFilename)}</b></span>
    </section>
    <h2>Evidence</h2>
    <section class="media">${media.map(([label, href]) => `<a href="${htmlEscape(href)}"><img src="${htmlEscape(href)}" alt="${htmlEscape(`${target.species} ${label}`)}"><span>${htmlEscape(label)}</span></a>`).join('')}</section>
    <h2>Decision JSON Draft</h2>
    <textarea readonly spellcheck="false" data-source-next-decision-json>${htmlEscape(decisionJson)}</textarea>
    <h2>Commands</h2>
    <pre>${htmlEscape(Object.values(report.commands).join('\n'))}</pre>
  </main>
</body>
</html>
`;
}

const sourceNextReview = await readJson(paths.sourceNextReview);
if (sourceNextReview.schema !== 'water9/source-next-review@1') {
  throw new Error(`unexpected source next review schema ${sourceNextReview.schema ?? 'missing'}`);
}
const target = sourceNextReview.target;
if (!target?.id) throw new Error('source next review target missing');
const decisionFile = target.focusedDecisionStarter;
if (decisionFile?.schema !== 'water9/source-cohesion-decisions@1') {
  throw new Error('source next review target is missing focusedDecisionStarter');
}

const report = {
  schema: 'water9/source-next-decision-draft@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    sourceNextReview: 'public/review/source-candidates/source-next-review.json',
  },
  policy: {
    draftDoesNotApproveSource: true,
    humanAuthoredDecisionRequired: true,
    reviewedOnlyDecisionFileRequired: true,
    strictApplyStillRequired: true,
  },
  target: {
    id: target.id,
    species: target.species,
    media: target.media,
    links: target.links,
  },
  reviewedDecisionFilename: 'water9-source-cohesion-reviewed-decisions.json',
  decisionFile,
  commands: {
    rebuild: 'npm run source:next-decision-draft',
    check: 'npm run source:next-decision-draft-check',
    serveSmoke: 'npm run source:next-decision-draft:serve-smoke',
    strictDryRun: 'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
    strictApply: 'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict --apply',
  },
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  target: target.id,
  status: decisionFile.decisions?.[0]?.status,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));
