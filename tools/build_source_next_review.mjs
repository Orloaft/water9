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
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-next-review.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-next-review.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-next-review.html')),
  dossier: resolve(String(args.get('dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
  visualBoard: resolve(String(args.get('visual-board') ?? 'public/review/source-visual-board.json')),
  cohesionDecisions: resolve(String(args.get('cohesion-decisions') ?? 'public/review/source-candidates/source-cohesion-decision-template.json')),
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function publicPathToUrl(path) {
  const text = String(path ?? '');
  if (!text) return null;
  if (text.startsWith('/')) return text;
  return text.startsWith('public/') ? `/${text.slice('public/'.length)}` : text;
}

function addDryRun(command) {
  const text = String(command ?? '').trim();
  if (!text) return null;
  return text.includes('--dry-run') ? text : `${text} --dry-run`;
}

function commandBlock(commands) {
  return `<pre><code>${htmlEscape(commands.filter(Boolean).join('\n'))}</code></pre>`;
}

function jsonBlock(value) {
  return JSON.stringify(value, null, 2);
}

function list(items) {
  return items?.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
}

function htmlList(items) {
  return `<ul>${items?.length ? items.map((item) => `<li>${htmlEscape(item)}</li>`).join('') : '<li>None recorded.</li>'}</ul>`;
}

function mediaCard(label, url) {
  if (!url) return `<article class="media missing"><span>${htmlEscape(label)}</span><strong>missing</strong></article>`;
  return `<a class="media" href="${htmlEscape(url)}"><span>${htmlEscape(label)}</span><img src="${htmlEscape(url)}" alt="${htmlEscape(label)}"></a>`;
}

function buildFocusedDecisionStarter(target, cohesionDecisions) {
  if (!target?.id) return null;
  const template = cohesionDecisions?.decisionFileTemplate ?? null;
  const templateDecision = (template?.decisions ?? cohesionDecisions?.decisions ?? []).find((decision) => decision.id === target.id);
  if (!template || !templateDecision) return null;
  const decision = {
    ...templateDecision,
    reviewer: '<human-reviewer>',
    reviewedAt: '<YYYY-MM-DD>',
    status: 'needs-review',
    overallNote: '',
    failedChecks: [],
    visualChecks: Object.fromEntries(Object.entries(templateDecision.visualChecks ?? {}).map(([check, value]) => [
      check,
      {
        score: value?.score ?? null,
        note: value?.note ?? '',
      },
    ])),
  };
  return {
    schema: template.schema,
    reviewer: '<human-reviewer>',
    reviewedAt: '<YYYY-MM-DD>',
    policy: template.policy,
    instructions: [
      'Keep status as needs-review until a real human reviewer has inspected source, key preview, sandbox screenshot, and articulation plan.',
      'For approval, set status to approved, fill reviewer/reviewedAt/overallNote, and give every visual check a score of 4 or 5 with evidence-based notes.',
      'For rejection, set status to rejected, fill reviewer/reviewedAt/overallNote, and list failedChecks with evidence-based notes.',
      'Run strict apply against the edited decision file; this starter is not an approval.',
    ],
    decisions: [decision],
  };
}

function buildReport({ dossier, approvalRunway, visualBoard, cohesionDecisions }) {
  const readyRunwayItems = (approvalRunway?.items ?? []).filter((item) => item.readyForHumanReview === true && item.humanApproved !== true);
  const runwayItem = readyRunwayItems[0] ?? null;
  const recommended = runwayItem
    ? (dossier?.items ?? []).find((item) => item.id === runwayItem.id) ?? null
    : null;
  const visualItem = (visualBoard?.candidates ?? visualBoard?.items ?? []).find((item) => item.id === runwayItem?.id) ?? null;
  const target = runwayItem ?? recommended;
  const id = target?.id ?? null;
  const species = target?.species ?? recommended?.species ?? null;
  const sourceSandboxId = id ? `source-${id}` : null;
  const sourceUrl = runwayItem?.links?.source ?? publicPathToUrl(recommended?.source);
  const media = {
    source: sourceUrl,
    thumbnail: runwayItem?.links?.thumbnail ?? publicPathToUrl(recommended?.sourceThumbFile),
    keyPreview: runwayItem?.links?.keyPreview ?? publicPathToUrl(recommended?.keyPreviewFile),
    sandboxScreenshot: runwayItem?.links?.sandboxScreenshot ?? publicPathToUrl(recommended?.previewScreenshot),
    planPreview: runwayItem?.links?.planPreview ?? null,
  };
  const links = {
    approvalRunway: '/review/source-approval-runway.html',
    visualBoard: '/review/source-visual-board.html',
    dossier: '/review/source-candidates/source-review-dossier.html',
    batchDecisionWorkspace: '/review/source-candidates/source-cohesion-decision-template.html',
    quickReview: runwayItem?.links?.quickReview ?? `/review/source-candidates/quick-reviews/${id}.html`,
    reviewPacket: runwayItem?.links?.reviewPacket ?? recommended?.reviewPacket?.file ?? null,
    contractMarkdown: runwayItem?.contract?.contractMarkdown ?? recommended?.contractMarkdown ?? null,
    sandboxLab: sourceSandboxId ? `/review/sandbox/lab.html?id=${sourceSandboxId}&with=diver` : null,
    sourceSandboxLive: sourceSandboxId ? `/?entity=${sourceSandboxId}&companion=diver` : null,
    runtimeSandboxLive: id ? `/?sandbox=${id}&companion=diver` : null,
  };
  const acceptCommand = addDryRun(runwayItem?.acceptCommand ?? recommended?.acceptCommand);
  const rejectCommand = addDryRun(runwayItem?.rejectCommand ?? recommended?.rejectCommand);
  const commands = {
    rebuild: 'npm run source:review-dossier && npm run source:next-review && npm run source:next-review-check',
    sourcePreview: sourceSandboxId ? `npm run sandbox:preview -- --id ${sourceSandboxId} --with diver --serve --open --visual` : null,
    runtimePreview: id ? `npm run sandbox:preview -- --id ${id} --with diver --serve --open --visual` : null,
    approvalRunway: 'npm run source:approval-runway:preview',
    batchWorkspace: 'npm run source:cohesion-decisions && npm run source:cohesion-decisions-check',
    batchApplyStrict: 'npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict',
    acceptDryRun: acceptCommand,
    rejectDryRun: rejectCommand,
  };
  const focusedDecisionStarter = buildFocusedDecisionStarter(target, cohesionDecisions);
  return {
    schema: 'water9/source-next-review@1',
    generatedAt: new Date().toISOString(),
    summary: {
      candidates: dossier?.summary?.candidateCount ?? 0,
      mechanicallyReadyForHumanReview: approvalRunway?.summary?.mechanicallyReadyForHumanReview ?? dossier?.summary?.readyForHumanReview ?? 0,
      criticRegenerationRequired: approvalRunway?.summary?.criticRegenerationRequired ?? 0,
      readyForHumanReview: approvalRunway?.summary?.readyForHumanReview ?? readyRunwayItems.length,
      humanApproved: approvalRunway?.summary?.humanApproved ?? dossier?.summary?.approvedSources ?? 0,
      nextGate: 'human source approval',
      hasRecommendedReview: Boolean(runwayItem),
    },
    target: target ? {
      id,
      species,
      status: runwayItem?.status ?? recommended?.status ?? null,
      readyForHumanReview: Boolean(runwayItem?.readyForHumanReview ?? recommended?.status === 'ready-for-human-review'),
      humanApproved: Boolean(runwayItem?.humanApproved ?? false),
      reviewWarning: runwayItem?.reviewWarning ?? 'Not approved: human reviewer must inspect source, key, sandbox preview, and plan preview before running approval.',
      source: recommended?.source ?? null,
      media,
      links,
      metrics: runwayItem?.metrics ?? visualItem?.metrics ?? null,
      requiredRead: runwayItem?.contract?.requiredRead ?? [],
      contractReviewChecklist: runwayItem?.contract?.contractReviewChecklist ?? [],
      promptRisks: runwayItem?.contract?.promptRisks ?? [],
      blockers: runwayItem?.blockers ?? recommended?.blockers ?? [],
      commands,
      focusedDecisionStarter,
    } : null,
  };
}

function renderMarkdown(report) {
  const target = report.target;
  return `# Water9 Next Source Review

Focused review packet for the current human source-approval bottleneck. This page does not approve anything; decision commands are dry-run only.

${target ? `## Target

- Candidate: ${target.species} (\`${target.id}\`)
- Status: \`${target.status}\`
- Gate truth: ${target.humanApproved ? 'human approved' : 'not approved yet'}
- Warning: ${target.reviewWarning}

## Evidence

| Item | Link |
| --- | --- |
| Source | ${target.media.source ?? 'missing'} |
| Magenta key preview | ${target.media.keyPreview ?? 'missing'} |
| Sandbox screenshot | ${target.media.sandboxScreenshot ?? 'missing'} |
| Articulation plan preview | ${target.media.planPreview ?? 'missing'} |
| Quick review | ${target.links.quickReview ?? 'missing'} |
| Review packet | ${target.links.reviewPacket ?? 'missing'} |
| Contract | ${target.links.contractMarkdown ?? 'missing'} |
| Sandbox lab | ${target.links.sandboxLab ?? 'missing'} |

## Required Read

${list(target.requiredRead)}

## Contract Checks

${list(target.contractReviewChecklist)}

## Reject Risks

${list(target.promptRisks)}

## Commands

\`\`\`bash
${Object.values(target.commands).filter(Boolean).join('\n')}
\`\`\`

## Focused Decision JSON Starter

This is a one-candidate starter copied from the strict batch decision schema. It defaults to \`needs-review\`; edit it only after human inspection.

\`\`\`json
${jsonBlock(target.focusedDecisionStarter)}
\`\`\`
` : 'No source review target is currently ready.'}
`;
}

function renderHtml(report) {
  const target = report.target;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Water9 Next Source Review</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#061014; color:#e6f7fa; }
      body { margin:0; background:#061014; }
      main { max-width:1320px; margin:0 auto; padding:28px 18px 48px; }
      h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
      h2 { margin:0 0 10px; color:#d6edf2; }
      p, li { color:#b8cbd2; line-height:1.45; }
      code, pre { color:#d8f5fb; overflow-wrap:anywhere; font-family:"SFMono-Regular", Consolas, monospace; }
      pre { border:1px solid #203b46; border-radius:6px; background:#041014; padding:12px; white-space:pre-wrap; }
      textarea { box-sizing:border-box; width:100%; min-height:520px; border:1px solid #203b46; border-radius:6px; background:#030a0d; color:#d8f5fb; padding:12px; font:12px/1.45 "SFMono-Regular", Consolas, monospace; resize:vertical; }
      a { color:#7ee8ff; text-decoration:none; }
      .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:#f0d9aa; padding:10px 12px; margin:14px 0; }
      .summary, .links { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0; }
      .summary span, .links a { border:1px solid #294653; border-radius:6px; background:#0b1d24; padding:8px 10px; color:#bdd6df; }
      .grid { display:grid; grid-template-columns:1.15fr .85fr; gap:14px; align-items:start; }
      .panel { border:1px solid #203b46; background:#081920; border-radius:8px; padding:14px; }
      .media-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
      .media { display:block; min-height:220px; border:1px solid #1f3a45; background:#030a0d; overflow:hidden; }
      .media span { display:block; padding:7px 8px; color:#9db7c2; font-size:.78rem; text-transform:uppercase; }
      .media img { display:block; width:100%; height:210px; object-fit:contain; background:#050b0e; }
      .missing { padding:12px; color:#9db7c2; }
      @media (max-width:880px) { main { padding:18px 10px 32px; } .grid,.media-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <main data-source-next-review>
      <h1>Next Source Review</h1>
      <p>Focused source-approval packet for the current 20-threat gate bottleneck. This page does not approve content; it only gathers evidence and dry-run decision commands.</p>
      <div class="summary">
        <span>${report.summary.readyForHumanReview}/${report.summary.candidates} ready for review</span>
        <span>${report.summary.humanApproved} human approved</span>
        <span>${htmlEscape(report.summary.nextGate)}</span>
      </div>
      ${target ? `<section class="grid" data-source-next-review-target="${htmlEscape(target.id)}">
        <article class="panel">
          <h2>${htmlEscape(target.species)} <code>${htmlEscape(target.id)}</code></h2>
          <div class="notice">Gate truth: ${target.humanApproved ? 'human approved' : 'not approved yet. A human reviewer must inspect the source, key preview, sandbox preview, and plan preview before approval.'}</div>
          <div class="media-grid">
            ${mediaCard('source', target.media.source)}
            ${mediaCard('magenta key preview', target.media.keyPreview)}
            ${mediaCard('sandbox screenshot', target.media.sandboxScreenshot)}
            ${mediaCard('articulation plan preview', target.media.planPreview)}
          </div>
          <h2>Review Links</h2>
          <div class="links">
            ${Object.entries(target.links).map(([key, value]) => value ? `<a data-source-next-review-link="${htmlEscape(key)}" href="${htmlEscape(publicPathToUrl(value))}">${htmlEscape(key)}</a>` : '').join('')}
          </div>
        </article>
        <aside class="panel">
          <h2>Required Read</h2>
          ${htmlList(target.requiredRead)}
          <h2>Contract Checks</h2>
          ${htmlList(target.contractReviewChecklist)}
          <h2>Reject Risks</h2>
          ${htmlList(target.promptRisks)}
        </aside>
      </section>
      <section class="panel">
        <h2>Dry-Run Commands</h2>
        ${commandBlock(Object.values(target.commands))}
      </section>
      <section class="panel" data-focused-decision-starter="${htmlEscape(target.id)}">
        <h2>Focused Decision JSON Starter</h2>
        <p>Single-candidate starter copied from the strict batch decision schema. It defaults to <code>needs-review</code>; approval still requires a real human reviewer, evidence-based notes, and strict apply.</p>
        <textarea spellcheck="false" data-source-next-review-decision-json>${htmlEscape(jsonBlock(target.focusedDecisionStarter))}</textarea>
      </section>` : '<section class="panel"><h2>No ready target</h2><p>No source review target is currently ready.</p></section>'}
    </main>
  </body>
</html>`;
}

const report = buildReport({
  dossier: await readJson(paths.dossier, {}),
  approvalRunway: await readJson(paths.approvalRunway, {}),
  visualBoard: await readJson(paths.visualBoard, {}),
  cohesionDecisions: await readJson(paths.cohesionDecisions, {}),
});

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, renderMarkdown(report));
await writeFile(paths.outHtml, renderHtml(report));

console.log(JSON.stringify({
  schema: 'water9/source-next-review-build@1',
  target: report.target?.id ?? null,
  readyForHumanReview: report.summary.readyForHumanReview,
  humanApproved: report.summary.humanApproved,
  outJson: paths.outJson,
  outMarkdown: paths.outMarkdown,
  outHtml: paths.outHtml,
}, null, 2));
