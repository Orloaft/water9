import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const explicitId = String(args.get('id') ?? args.get('candidate') ?? '').trim();
const all = args.has('all');
const noBuild = args.has('no-build') || args.has('noBuild');
const outDir = resolve(String(args.get('out-dir') ?? args.get('outDir') ?? 'public/review/source-candidates/quick-reviews'));
const dossierPath = resolve(String(args.get('dossier') ?? 'public/review/source-candidates/source-review-dossier.json'));
const planCoveragePath = resolve(String(args.get('plan-coverage') ?? 'public/review/content-plan-coverage.json'));

const REQUIRED_VISUAL_CHECKS = [
  'whole-creature-cohesion',
  'part-continuity-cohesion',
  'readable-silhouette',
  'no-collage-artifacts',
  'non-placeholder-art-direction',
  'crop-safe-anatomy',
  'clean-magenta-key',
  'gameplay-read',
  'neutral-riggable-pose',
  'visible-attack-lane',
];

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function publicHref(path) {
  if (!path) return null;
  const text = String(path);
  if (text.startsWith('/')) {
    const marker = '/public/';
    const index = text.indexOf(marker);
    if (index >= 0) return `/${text.slice(index + marker.length)}`;
    return null;
  }
  if (text.startsWith('public/')) return `/${text.slice('public/'.length)}`;
  return null;
}

function sourceReviewHref(relativePath) {
  if (!relativePath) return null;
  return `/review/source-candidates/${relativePath}`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fileExists(path, minBytes = 128) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minBytes;
  } catch {
    return false;
  }
}

function npmCommand(script, extraArgs = []) {
  return {
    label: `npm run ${script}${extraArgs.length ? ` -- ${extraArgs.join(' ')}` : ''}`,
    command: 'npm',
    args: ['run', script, ...(extraArgs.length ? ['--', ...extraArgs] : [])],
  };
}

async function runStep(step) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const child = spawn(step.command, step.args, {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const exitCode = await new Promise((resolveExit) => child.once('exit', (code) => resolveExit(code ?? 1)));
  return {
    label: step.label,
    startedAt,
    durationMs: Date.now() - startedMs,
    exitCode,
    ok: exitCode === 0,
    stdoutTail: stdout.trim().slice(-3000),
    stderrTail: stderr.trim().slice(-3000),
  };
}

async function rebuildEvidence() {
  if (noBuild) return [];
  const steps = [
    npmCommand('source:gallery'),
    npmCommand('source:image-check'),
    npmCommand('source:preview-check'),
    npmCommand('source:review-dossier'),
    npmCommand('source:review-dossier-check'),
  ];
  const results = [];
  for (const step of steps) {
    const result = await runStep(step);
    results.push(result);
    if (!result.ok) break;
  }
  return results;
}

function chooseItem(dossier) {
  const items = Array.isArray(dossier.items) ? dossier.items : [];
  if (explicitId) return items.find((item) => item.id === explicitId) ?? null;
  const recommended = dossier.recommendedReview?.id;
  return (recommended ? items.find((item) => item.id === recommended) : null)
    ?? items.find((item) => item.hasSource && !item.approved && item.evidence?.imageValidationPassed && item.evidence?.sourcePreviewPassed)
    ?? items.find((item) => item.hasSource && !item.approved)
    ?? null;
}

function chooseItems(dossier) {
  const items = Array.isArray(dossier.items) ? dossier.items : [];
  if (!all) return [chooseItem(dossier)].filter(Boolean);
  const queuedIds = new Set((dossier.readyReviewQueue ?? []).map((item) => item.id));
  const readyItems = items.filter((item) => queuedIds.has(item.id));
  return readyItems.length
    ? readyItems
    : items.filter((item) => item.hasSource && !item.approved && item.evidence?.imageValidationPassed && item.evidence?.sourcePreviewPassed);
}

async function copyScreenshot(item, id) {
  const source = item.sourcePreview?.screenshotPath;
  if (!source || !(await fileExists(resolve(source), 512))) return { path: null, href: null, copied: false };
  const targetName = `${safeFileName(id)}-source-preview${source.endsWith('.jpg') ? '.jpg' : '.png'}`;
  const target = resolve(outDir, targetName);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(source), target);
  return {
    path: `public/review/source-candidates/quick-reviews/${targetName}`,
    href: `/review/source-candidates/quick-reviews/${targetName}`,
    copied: true,
  };
}

function checklistRows(item) {
  const flags = new Set(item.reviewItem?.requiredApprovalFlags ?? []);
  return REQUIRED_VISUAL_CHECKS.map((check) => ({
    check,
    requiredVisualCheck: flags.has(`--visual-check ${check}`),
    requiredScore: flags.has(`--score ${check}=<4-5>`),
    requiredVisualNote: flags.has(`--visual-note ${check}='<specific rationale>'`),
    scorePlaceholder: `--score ${check}=<4-5>`,
    notePlaceholder: `--visual-note ${check}='<specific rationale citing source evidence>'`,
  }));
}

function markdownFor(report) {
  const item = report.item;
  const lines = [
    `# Source Quick Review: ${item.species} (${item.id})`,
    '',
    `Generated: \`${report.generatedAt}\``,
    `Review status: \`${report.reviewStatus}\``,
    `Ready for human source review: \`${report.readyForHumanReview}\``,
    '',
    'This page consolidates source-review evidence only. It does not approve the source; a human still has to run `npm run source:accept` with specific scores and notes.',
    '',
    '## Evidence',
    '',
    `- Source: \`${item.source ?? 'missing'}\``,
    `- Source image: ${report.links.source ? report.links.source : 'missing'}`,
    `- Thumbnail: ${report.links.thumbnail ? report.links.thumbnail : 'missing'}`,
    `- Magenta key preview: ${report.links.keyPreview ? report.links.keyPreview : 'missing'}`,
    `- Sandbox screenshot: ${report.links.sandboxScreenshot ? report.links.sandboxScreenshot : 'missing'}`,
    `- Articulation plan preview: ${report.links.planPreview ? report.links.planPreview : 'missing'}`,
    `- Contract: \`${item.contract?.contractMarkdown ?? 'missing'}\``,
    '',
    '## Metrics',
    '',
    `- Image validation failures: ${item.imageValidationMetric?.failures?.length ? item.imageValidationMetric.failures.join('; ') : 'none'}`,
    `- Source size: ${item.imageValidationMetric?.size?.join('x') ?? 'unknown'}`,
    `- Subject size: ${item.imageValidationMetric?.subjectSize?.join('x') ?? 'unknown'}`,
    `- Background ratio: ${item.imageValidationMetric?.backgroundRatio ?? 'unknown'}`,
    `- Inner magenta ratio: ${item.imageValidationMetric?.innerMagentaRatio ?? 'unknown'}`,
    `- Preview failures: ${item.sourcePreview?.failures?.length ? item.sourcePreview.failures.join('; ') : 'none'}`,
    '',
    '## Blockers',
    '',
    ...(item.blockers?.length ? item.blockers.map((blocker) => `- ${blocker}`) : ['- none']),
    '',
    '## Approval Checklist',
    '',
    '| Check | Visual flag | Score flag | Note flag |',
    '| --- | --- | --- | --- |',
    ...report.checklist.map((row) => `| ${row.check} | ${row.requiredVisualCheck ? 'yes' : 'missing'} | ${row.requiredScore ? 'yes' : 'missing'} | ${row.requiredVisualNote ? 'yes' : 'missing'} |`),
    '',
    '## Candidate Contract Checks',
    '',
    ...(item.contract?.contractReviewChecklist?.length ? item.contract.contractReviewChecklist.map((check) => `- ${check}`) : ['- none']),
    '',
    '## Reject Risks',
    '',
    ...(item.contract?.promptRisks?.length ? item.contract.promptRisks.map((risk) => `- ${risk}`) : ['- none']),
    '',
    '## Commands',
    '',
    '```bash',
    item.reviewPacket?.commands?.sourcePreview ?? `npm run sandbox:preview -- --id ${item.id} --kind source --serve --open --visual`,
    item.reviewPacket?.commands?.imageCheck ?? 'npm run source:image-check',
    item.reviewPacket?.commands?.previewCheck ?? 'npm run source:preview-check',
    item.acceptCommand,
    item.rejectCommand,
    '```',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function imageFigure(label, href, alt) {
  if (!href) return `<div class="missing">${htmlEscape(label)} missing</div>`;
  return `<figure><img src="${htmlEscape(href)}" alt="${htmlEscape(alt)}"><figcaption>${htmlEscape(label)}</figcaption></figure>`;
}

function list(items) {
  return `<ul>${items?.length ? items.map((item) => `<li>${htmlEscape(item)}</li>`).join('') : '<li>none</li>'}</ul>`;
}

function reviewCommandBuilder(report) {
  const item = report.item;
  const checks = report.checklist.map((row) => row.check);
  const data = JSON.stringify({ id: item.id, checks })
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  const scoreRows = checks.map((check) => `<div class="builder-check" data-check="${htmlEscape(check)}">
        <label>${htmlEscape(check)} score
          <select data-score="${htmlEscape(check)}">
            <option value="4">4 - passes</option>
            <option value="5">5 - strong pass</option>
          </select>
        </label>
        <label>${htmlEscape(check)} failed for rejection
          <input data-failed-check="${htmlEscape(check)}" type="checkbox">
        </label>
        <label>${htmlEscape(check)} evidence note
          <textarea data-note="${htmlEscape(check)}" rows="2" placeholder="Specific visual evidence from the source art."></textarea>
        </label>
      </div>`).join('\n');
  return `<section class="review-builder" data-review-command-builder>
      <h2>Human Review Command Builder</h2>
      <p>Fill this out after inspecting the source, key preview, sandbox screenshot, articulation plan preview, and source visual board. The page generates a command only; source approval still requires a human to run it.</p>
      <div class="builder-grid">
        <label>Reviewer
          <input data-reviewer type="text" placeholder="human reviewer name">
        </label>
        <label>Status
          <select data-status>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="needs-review">needs-review</option>
          </select>
        </label>
      </div>
      <label>Overall note
        <textarea data-overall-note rows="3" placeholder="Specific source-level rationale."></textarea>
      </label>
      <div class="builder-checks">${scoreRows}</div>
      <div class="builder-actions">
        <button type="button" data-build-command>Build Command</button>
        <button type="button" data-copy-command>Copy Command</button>
      </div>
      <textarea data-command-output rows="8" spellcheck="false" aria-label="Generated source review command"></textarea>
      <p class="builder-warning" data-builder-warning></p>
      <script type="application/json" data-review-command-data>${data}</script>
    </section>`;
}

function renderHtml(report) {
  const item = report.item;
  const checklist = report.checklist.map((row) => `<tr>
    <td>${htmlEscape(row.check)}</td>
    <td>${row.requiredVisualCheck ? 'yes' : 'missing'}</td>
    <td><code>${htmlEscape(row.scorePlaceholder)}</code></td>
    <td><code>${htmlEscape(row.notePlaceholder)}</code></td>
  </tr>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Source Quick Review: ${htmlEscape(item.species)}</title>
  <style>
    :root { color-scheme: dark; --bg:#061114; --panel:#0d1e24; --line:#294751; --text:#e7f7f8; --muted:#9eb7bd; --accent:#83e8ff; --warn:#f0c66e; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 6px; font-size:32px; }
    h2 { margin:24px 0 8px; font-size:18px; }
    p { color:var(--muted); }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    button, input, select, textarea { font:inherit; }
    input, select, textarea { width:100%; border:1px solid var(--line); border-radius:5px; background:#050b0d; color:var(--text); padding:8px; }
    textarea { resize:vertical; }
    button { border:1px solid var(--line); border-radius:5px; background:#12313a; color:var(--text); padding:9px 12px; cursor:pointer; }
    button:hover { border-color:var(--accent); }
    .status { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; }
    .status span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .status strong { color:var(--text); margin-left:5px; }
    .images { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; margin:18px 0; }
    figure { margin:0; border:1px solid var(--line); background:#050b0d; border-radius:5px; overflow:hidden; }
    img { display:block; width:100%; max-height:360px; object-fit:contain; background:#050b0d; }
    figcaption { color:var(--muted); padding:8px 10px; border-top:1px solid var(--line); }
    .missing { display:flex; min-height:180px; align-items:center; justify-content:center; border:1px dashed var(--line); color:var(--muted); border-radius:5px; }
    section { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; margin:14px 0; }
    dl { display:grid; grid-template-columns:160px 1fr; gap:7px 10px; }
    dt { color:var(--muted); }
    dd { margin:0; overflow-wrap:anywhere; }
    table { width:100%; border-collapse:collapse; }
    th, td { border-top:1px solid var(--line); padding:8px; text-align:left; vertical-align:top; }
    th { color:var(--muted); }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .review-builder p { margin-top:0; }
    .builder-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
    .builder-checks { display:grid; gap:10px; margin:12px 0; }
    .builder-check { display:grid; grid-template-columns:minmax(180px,240px) minmax(160px,200px) 1fr; gap:10px; align-items:start; border-top:1px solid var(--line); padding-top:10px; }
    label { display:grid; gap:5px; color:var(--muted); }
    label input, label select, label textarea { color:var(--text); }
    .builder-actions { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; }
    .builder-warning { color:var(--warn); min-height:1.4em; }
    [data-command-output] { font-family:"SFMono-Regular",Consolas,monospace; }
    @media (max-width: 720px) { .builder-check { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>${htmlEscape(item.species)}</h1>
    <p><code>${htmlEscape(item.id)}</code> source quick review. This page is evidence for a human reviewer; it does not approve the source.</p>
    <div class="status">
      <span>review status <strong>${htmlEscape(report.reviewStatus)}</strong></span>
      <span>ready for human review <strong>${report.readyForHumanReview}</strong></span>
      <span>approved <strong>${item.approved === true}</strong></span>
      <span>generated <strong>${htmlEscape(report.generatedAt)}</strong></span>
    </div>
    <div class="images">
      ${imageFigure('whole source', report.links.source, `${item.species} whole source`)}
      ${imageFigure('source thumbnail', report.links.thumbnail, `${item.species} source thumbnail`)}
      ${imageFigure('magenta key preview', report.links.keyPreview, `${item.species} key preview`)}
      ${imageFigure('sandbox screenshot', report.links.sandboxScreenshot, `${item.species} sandbox screenshot`)}
      ${imageFigure('articulation plan preview', report.links.planPreview, `${item.species} articulation plan preview`)}
    </div>
    <section>
      <h2>Evidence</h2>
      <dl>
        <dt>source</dt><dd><code>${htmlEscape(item.source ?? 'missing')}</code></dd>
        <dt>contract</dt><dd><code>${htmlEscape(item.contract?.contractMarkdown ?? 'missing')}</code></dd>
        <dt>image validation</dt><dd>${item.imageValidationMetric?.failures?.length ? htmlEscape(item.imageValidationMetric.failures.join('; ')) : 'pass'}</dd>
        <dt>source preview</dt><dd>${item.sourcePreview?.failures?.length ? htmlEscape(item.sourcePreview.failures.join('; ')) : 'pass'}</dd>
        <dt>source size</dt><dd>${htmlEscape(item.imageValidationMetric?.size?.join('x') ?? 'unknown')}</dd>
        <dt>subject size</dt><dd>${htmlEscape(item.imageValidationMetric?.subjectSize?.join('x') ?? 'unknown')}</dd>
        <dt>background ratio</dt><dd>${htmlEscape(item.imageValidationMetric?.backgroundRatio ?? 'unknown')}</dd>
      </dl>
    </section>
    <section>
      <h2>Blockers</h2>
      ${list(item.blockers)}
    </section>
    <section>
      <h2>Approval Checklist</h2>
      <table>
        <thead><tr><th>Check</th><th>Visual Flag</th><th>Score</th><th>Visual Note</th></tr></thead>
        <tbody>${checklist}</tbody>
      </table>
    </section>
    ${reviewCommandBuilder(report)}
    <section>
      <h2>Candidate Contract Checks</h2>
      ${list(item.contract?.contractReviewChecklist)}
      <h2>Reject Risks</h2>
      ${list(item.contract?.promptRisks)}
    </section>
    <section>
      <h2>Commands</h2>
      <pre><code>${htmlEscape([
        item.reviewPacket?.commands?.sourcePreview ?? `npm run sandbox:preview -- --id ${item.id} --kind source --serve --open --visual`,
        item.reviewPacket?.commands?.imageCheck ?? 'npm run source:image-check',
        item.reviewPacket?.commands?.previewCheck ?? 'npm run source:preview-check',
        item.acceptCommand,
        item.rejectCommand,
      ].filter(Boolean).join('\n'))}</code></pre>
    </section>
  </main>
  <script>
    (() => {
      const root = document.querySelector('[data-review-command-builder]');
      if (!root) return;
      const dataNode = root.querySelector('[data-review-command-data]');
      const data = JSON.parse(dataNode.textContent);
      const output = root.querySelector('[data-command-output]');
      const warning = root.querySelector('[data-builder-warning]');
      const shellQuote = (value) => "'" + String(value ?? '').replaceAll("'", "'\\\\''") + "'";
      const build = () => {
        const reviewer = root.querySelector('[data-reviewer]').value.trim();
        const status = root.querySelector('[data-status]').value;
        const note = root.querySelector('[data-overall-note]').value.trim();
        const missing = [];
        if (!reviewer) missing.push('reviewer');
        if (!note) missing.push('overall note');
        const command = [
          'npm run source:accept --',
          '--id', data.id,
          '--status', status,
          '--reviewed-by', shellQuote(reviewer || '<human-reviewer>'),
          '--note', shellQuote(note || '<specific source approval note>'),
        ];
        if (status === 'approved') {
          for (const check of data.checks) {
            const score = root.querySelector(\`[data-score="\${check}"]\`)?.value || '4';
            const visualNote = root.querySelector(\`[data-note="\${check}"]\`)?.value.trim() || '';
            if (!visualNote) missing.push(\`\${check} note\`);
            command.push('--visual-check', check);
            command.push('--score', \`\${check}=\${score}\`);
            command.push('--visual-note', shellQuote(\`\${check}=\${visualNote || '<specific rationale citing source evidence>'}\`));
          }
          command.push('--source-reviewed');
          command.push('--source-visual-board', 'public/review/source-visual-board.json');
        } else if (status === 'rejected') {
          let failedCount = 0;
          for (const check of data.checks) {
            const failed = root.querySelector(\`[data-failed-check="\${check}"]\`)?.checked === true;
            if (!failed) continue;
            failedCount += 1;
            const visualNote = root.querySelector(\`[data-note="\${check}"]\`)?.value.trim() || '';
            if (!visualNote) missing.push(\`\${check} failure note\`);
            command.push('--failed-check', check);
            command.push('--visual-note', shellQuote(\`\${check}=\${visualNote || '<specific failure rationale citing source evidence>'}\`));
          }
          if (!failedCount) missing.push('at least one failed check');
          command.push('--source-rejected');
          command.push('--source-visual-board', 'public/review/source-visual-board.json');
        }
        output.value = command.join(' ');
        warning.textContent = missing.length ? \`Missing: \${missing.join(', ')}\` : 'Command ready. Run it in a terminal after completing the review.';
      };
      root.querySelector('[data-build-command]').addEventListener('click', build);
      root.querySelector('[data-copy-command]').addEventListener('click', async () => {
        if (!output.value.trim()) build();
        await navigator.clipboard?.writeText(output.value);
        warning.textContent = 'Command copied.';
      });
      build();
    })();
  </script>
</body>
</html>
`;
}

function indexMarkdown(index) {
  const lines = [
    '# Water 9 Source Quick Reviews',
    '',
    `Generated: \`${index.generatedAt}\``,
    `Reviews: \`${index.summary.reviews}\``,
    `Ready for human source review: \`${index.summary.readyForHumanReview}\``,
    '',
    'These pages consolidate human source-approval evidence. They do not approve any source candidate.',
    '',
    '| Rank | Candidate | Status | Evidence | HTML | Accept Command |',
    '| ---: | --- | --- | --- | --- | --- |',
  ];
  for (const item of index.reviews) {
    const evidence = [
      item.evidence?.imageValidationPassed ? 'image pass' : 'image missing/fail',
      item.evidence?.sourcePreviewPassed ? 'preview pass' : 'preview missing/fail',
      item.links?.thumbnail ? 'thumb' : 'no thumb',
      item.links?.keyPreview ? 'key' : 'no key',
      item.links?.sandboxScreenshot ? 'sandbox' : 'no sandbox',
      item.links?.planPreview ? 'plan' : 'no plan',
    ].join(', ');
    lines.push(`| ${item.rank} | ${item.species} (\`${item.id}\`) | \`${item.reviewStatus}\` | ${evidence} | \`${item.html}\` | \`${item.acceptCommand}\` |`);
  }
  return `${lines.join('\n')}\n`;
}

function indexHtmlFor(index) {
  const cards = index.reviews.map((item) => `<article class="card">
    <header>
      <span class="rank">${item.rank}</span>
      <div>
        <h2>${htmlEscape(item.species)}</h2>
        <code>${htmlEscape(item.id)}</code>
      </div>
    </header>
    <div class="badges">
      <span>${htmlEscape(item.reviewStatus)}</span>
      <span>${item.evidence?.imageValidationPassed ? 'image pass' : 'image missing/fail'}</span>
      <span>${item.evidence?.sourcePreviewPassed ? 'preview pass' : 'preview missing/fail'}</span>
      <span>${item.blockers?.length ?? 0} blockers</span>
    </div>
    <div class="thumbs">
      ${imageFigure('source', item.links?.source, `${item.species} source`)}
      ${imageFigure('key', item.links?.keyPreview, `${item.species} key preview`)}
      ${imageFigure('sandbox', item.links?.sandboxScreenshot, `${item.species} sandbox preview`)}
      ${imageFigure('plan', item.links?.planPreview, `${item.species} articulation plan preview`)}
    </div>
    <dl>
      <dt>source</dt><dd><code>${htmlEscape(item.source ?? 'missing')}</code></dd>
      <dt>subject</dt><dd>${htmlEscape(item.metrics?.subjectSize?.join('x') ?? 'unknown')}</dd>
      <dt>background</dt><dd>${htmlEscape(item.metrics?.backgroundRatio ?? 'unknown')}</dd>
      <dt>inner key</dt><dd>${htmlEscape(item.metrics?.innerMagentaRatio ?? 'unknown')}</dd>
    </dl>
    <div class="actions">
      <a href="${htmlEscape(item.href)}">Open Review</a>
      <code>${htmlEscape(item.html)}</code>
    </div>
    <details>
      <summary>Accept command</summary>
      <pre><code>${htmlEscape(item.acceptCommand)}</code></pre>
    </details>
    <details>
      <summary>Reject command</summary>
      <pre><code>${htmlEscape(item.rejectCommand)}</code></pre>
    </details>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Quick Reviews</title>
  <style>
    :root { color-scheme: dark; --bg:#061114; --panel:#0d1e24; --line:#294751; --text:#e7f7f8; --muted:#9eb7bd; --accent:#83e8ff; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 6px; font-size:32px; }
    p { color:var(--muted); }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    code { overflow-wrap:anywhere; }
    pre { margin:0; white-space:pre-wrap; overflow:auto; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; }
    .summary span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); margin-left:5px; }
    .queue { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:14px; align-items:start; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:14px; }
    .card header { display:grid; grid-template-columns:auto 1fr; gap:10px; align-items:center; }
    .rank { display:grid; place-items:center; width:32px; height:32px; border:1px solid var(--line); border-radius:5px; color:var(--muted); }
    h2 { margin:0; font-size:18px; }
    .badges { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0; }
    .badges span { border:1px solid var(--line); border-radius:5px; padding:5px 7px; color:var(--muted); background:#09171b; }
    .thumbs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:12px 0; }
    figure { margin:0; border:1px solid var(--line); background:#050b0d; border-radius:5px; overflow:hidden; }
    img { display:block; width:100%; aspect-ratio:1.15; object-fit:contain; background:#050b0d; }
    figcaption { padding:5px 7px; color:var(--muted); border-top:1px solid var(--line); font-size:12px; }
    .missing { display:grid; place-items:center; min-height:90px; border:1px dashed var(--line); border-radius:5px; color:var(--muted); }
    dl { display:grid; grid-template-columns:92px 1fr; gap:5px 8px; margin:10px 0; }
    dt { color:var(--muted); }
    dd { margin:0; overflow-wrap:anywhere; }
    .actions { display:grid; gap:5px; margin:12px 0; }
    details { border-top:1px solid var(--line); padding-top:8px; margin-top:8px; }
    summary { cursor:pointer; color:var(--accent); }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Quick Reviews</h1>
    <p>Human source-approval review index. These pages consolidate evidence; they do not approve source candidates.</p>
    <div class="summary">
      <span>reviews <strong>${index.summary.reviews}</strong></span>
      <span>ready <strong>${index.summary.readyForHumanReview}</strong></span>
      <span>approved <strong>${index.summary.approved}</strong></span>
    </div>
    <section class="queue">${cards}</section>
  </main>
</body>
</html>
`;
}

async function writeQuickReview(item, steps) {
  await mkdir(outDir, { recursive: true });
  const screenshot = await copyScreenshot(item, item.id);
  const sourceHref = item.sourceUrl ?? publicHref(item.source);
  const report = {
    schema: 'water9/source-quick-review@1',
    generatedAt: new Date().toISOString(),
    id: item.id,
    species: item.species,
    reviewStatus: item.approved ? 'approved' : item.evidence?.imageValidationPassed && item.evidence?.sourcePreviewPassed ? 'ready-for-human-review' : 'blocked',
    readyForHumanReview: Boolean(!item.approved && item.evidence?.imageValidationPassed && item.evidence?.sourcePreviewPassed && item.planPreviewHref),
    links: {
      source: sourceHref,
      thumbnail: sourceReviewHref(item.sourceThumbFile),
      keyPreview: sourceReviewHref(item.keyPreviewFile),
      sandboxScreenshot: screenshot.href,
      planPreview: item.planPreviewHref ?? null,
    },
    copiedArtifacts: {
      sandboxScreenshot: screenshot.path,
    },
    checklist: checklistRows(item),
    item,
    steps,
    commands: {
      sourcePreview: item.reviewPacket?.commands?.sourcePreview ?? `npm run sandbox:preview -- --id ${item.id} --kind source --serve --open --visual`,
      accept: item.acceptCommand,
      reject: item.rejectCommand,
    },
    ok: true,
  };

  const fileBase = safeFileName(item.id);
  const jsonOut = resolve(outDir, `${fileBase}.json`);
  const markdownOut = resolve(outDir, `${fileBase}.md`);
  const htmlOut = resolve(outDir, `${fileBase}.html`);

  await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownOut, markdownFor(report));
  await writeFile(htmlOut, renderHtml(report));

  return {
    id: item.id,
    species: item.species,
    reviewStatus: report.reviewStatus,
    readyForHumanReview: report.readyForHumanReview,
    source: item.source ?? null,
    links: report.links,
    evidence: item.evidence ?? {},
    metrics: {
      size: item.imageValidationMetric?.size ?? null,
      subjectSize: item.imageValidationMetric?.subjectSize ?? null,
      backgroundRatio: item.imageValidationMetric?.backgroundRatio ?? null,
      innerMagentaRatio: item.imageValidationMetric?.innerMagentaRatio ?? null,
    },
    blockers: item.blockers ?? [],
    jsonOut,
    markdownOut,
    htmlOut,
    href: `/review/source-candidates/quick-reviews/${fileBase}.html`,
    screenshotCopied: screenshot.copied,
    acceptCommand: item.acceptCommand,
    rejectCommand: item.rejectCommand,
  };
}

const steps = await rebuildEvidence();
if (steps.some((step) => !step.ok)) {
  console.error(JSON.stringify({
    schema: 'water9/source-quick-review@1',
    generatedAt: new Date().toISOString(),
    ok: false,
    failures: steps.filter((step) => !step.ok).map((step) => `${step.label} failed`),
    steps,
  }, null, 2));
  process.exit(1);
}

const dossier = await readJson(dossierPath);
if (dossier.schema !== 'water9/source-review-dossier@1') {
  throw new Error(`Unexpected source review dossier schema ${dossier.schema ?? 'missing'}`);
}
const planCoverage = await readJson(planCoveragePath);
if (planCoverage.schema !== 'water9/content-plan-coverage@1') {
  throw new Error(`Unexpected plan coverage schema ${planCoverage.schema ?? 'missing'}`);
}
const planCoverageById = new Map((planCoverage.items ?? []).map((item) => [item.id, item]));
const items = chooseItems(dossier).map((item) => {
  const planItem = planCoverageById.get(item.id);
  return {
    ...item,
    planPreviewHref: publicHref(planItem?.planPreview),
    planPreviewPresent: planItem?.artifacts?.planPreview?.exists === true,
  };
});
if (!items.length) {
  throw new Error(explicitId ? `No source review candidate found for ${explicitId}` : 'No source review candidates are available');
}

const reviews = [];
for (const item of items) reviews.push(await writeQuickReview(item, steps));

const index = {
  schema: 'water9/source-quick-review-index@1',
  generatedAt: new Date().toISOString(),
  all,
  reviews: reviews.map((review, index) => ({
    rank: index + 1,
    id: review.id,
    species: review.species,
    reviewStatus: review.reviewStatus,
    readyForHumanReview: review.readyForHumanReview,
    json: `public/review/source-candidates/quick-reviews/${safeFileName(review.id)}.json`,
    markdown: `public/review/source-candidates/quick-reviews/${safeFileName(review.id)}.md`,
    html: `public/review/source-candidates/quick-reviews/${safeFileName(review.id)}.html`,
    href: review.href,
    source: review.source,
    links: review.links,
    evidence: review.evidence,
    metrics: review.metrics,
    blockers: review.blockers,
    acceptCommand: review.acceptCommand,
    rejectCommand: review.rejectCommand,
  })),
  summary: {
    reviews: reviews.length,
    readyForHumanReview: reviews.filter((review) => review.readyForHumanReview).length,
    approved: reviews.filter((review) => review.reviewStatus === 'approved').length,
    blocked: reviews.filter((review) => review.reviewStatus === 'blocked').length,
  },
};

const indexJson = resolve(outDir, 'index.json');
const indexMd = resolve(outDir, 'index.md');
const indexHtmlOut = resolve(outDir, 'index.html');
await writeFile(indexJson, `${JSON.stringify(index, null, 2)}\n`);
await writeFile(indexMd, indexMarkdown(index));
await writeFile(indexHtmlOut, indexHtmlFor(index));

console.log(JSON.stringify({
  schema: all ? index.schema : 'water9/source-quick-review@1',
  mode: all ? 'all' : 'single',
  reviews: reviews.length,
  ids: reviews.map((review) => review.id),
  readyForHumanReview: index.summary.readyForHumanReview,
  indexJson,
  indexMd,
  indexHtml: indexHtmlOut,
  first: reviews[0] ?? null,
  steps: steps.length,
}, null, 2));
