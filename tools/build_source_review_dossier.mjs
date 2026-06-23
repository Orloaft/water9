import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  reviewManifest: resolve(String(args.get('review-manifest') ?? 'public/review/source-candidates/review-manifest.json')),
  imageReport: resolve(String(args.get('image-report') ?? 'tools/scratch/source-candidate-images-report.json')),
  previewReport: resolve(String(args.get('preview-report') ?? 'tools/scratch/source-preview-visuals-report.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-review-dossier.json')),
  outMd: resolve(String(args.get('md-out') ?? 'public/review/source-candidates/source-review-dossier.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-review-dossier.html')),
  packetDir: resolve(String(args.get('packet-dir') ?? 'public/review/source-candidates/source-review-packets')),
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

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function publicUrl(source) {
  if (!source) return null;
  if (source.startsWith('public/')) return `/${source.slice('public/'.length)}`;
  if (source.startsWith('/')) return source;
  return null;
}

function localReviewHref(file) {
  return file ? file : null;
}

function relativePathFromOut(path) {
  if (!path) return null;
  const absolute = resolve(path);
  const rel = relative(dirname(paths.outHtml), absolute);
  return rel.startsWith('..') ? path : rel;
}

function previewResultFor(previewReport, id) {
  const previewId = `source-${id}`;
  return (previewReport.results ?? []).find((result) => result.id === previewId) ?? null;
}

function compactPreview(result) {
  if (!result) return null;
  return {
    id: result.id,
    failures: Array.isArray(result.failures) ? result.failures : [],
    screenshotPath: result.screenshotPath ?? null,
    screenshotHref: relativePathFromOut(result.screenshotPath),
    canvas: result.canvas ?? null,
    previewTexture: result.snapshot?.previewTexture ?? null,
    hasPreviewSprite: result.snapshot?.hasPreviewSprite === true,
  };
}

function compactMetric(metric) {
  if (!metric) return null;
  return {
    id: metric.id,
    source: metric.source,
    checked: metric.checked === true,
    failures: Array.isArray(metric.failures) ? metric.failures : [],
    size: metric.size ?? null,
    subjectSize: metric.subjectSize ?? null,
    backgroundRatio: metric.backgroundRatio ?? null,
    innerMagentaRatio: metric.innerMagentaRatio ?? null,
    detail: metric.detail ?? null,
    connectivity: metric.connectivity ?? null,
    sourceFingerprint: metric.sourceFingerprint ?? null,
  };
}

function approvalBlockers({ candidate, reviewItem, metric, preview }) {
  const blockers = [];
  if (!candidate.source) {
    blockers.push('source image is missing');
    return blockers;
  }
  if (!reviewItem?.sourceThumbFile) blockers.push('source thumbnail is missing; run npm run source:gallery');
  if (!reviewItem?.keyPreviewFile) blockers.push('chroma key preview is missing; run npm run source:gallery');
  if (!metric) blockers.push('source image validation metric is missing; run npm run source:image-check');
  else {
    if (metric.checked !== true) blockers.push('source image validation has not checked this image');
    if ((metric.failures ?? []).length) blockers.push(`source image validation failures: ${metric.failures.join('; ')}`);
  }
  if (!preview) blockers.push('source sandbox preview result is missing; run npm run source:preview-check');
  else {
    if ((preview.failures ?? []).length) blockers.push(`source preview failures: ${preview.failures.join('; ')}`);
    if (preview.snapshot?.hasPreviewSprite !== true) blockers.push('source preview did not render a preview sprite');
    if (!preview.screenshotPath) blockers.push('source preview screenshot is missing');
  }
  if (!reviewItem?.approved) blockers.push('human source approval is still missing');
  return blockers;
}

function sourceAcceptCommand(item) {
  return item.reviewItem?.acceptCommand
    ?? `npm run source:accept -- --id ${item.id} --status approved --reviewed-by <human-reviewer> --note '<specific approval note>' --source-reviewed`;
}

function reviewReadiness(item) {
  if (!item.hasSource) return 'missing-source';
  if (item.approved) return 'approved';
  if (item.evidence?.imageValidationPassed === true && item.evidence?.sourcePreviewPassed === true) return 'ready-for-human-review';
  return 'blocked';
}

function recommendedReviewFor(items) {
  const item = items.find((candidate) => reviewReadiness(candidate) === 'ready-for-human-review')
    ?? items.find((candidate) => reviewReadiness(candidate) === 'blocked')
    ?? items.find((candidate) => candidate.hasSource && !candidate.approved)
    ?? null;
  if (!item) return null;
  return {
    id: item.id,
    species: item.species,
    status: reviewReadiness(item),
    source: item.source,
    sourceThumbFile: item.sourceThumbFile,
    keyPreviewFile: item.keyPreviewFile,
    previewScreenshot: item.sourcePreview?.screenshotPath ?? null,
    blockers: item.blockers,
    evidence: item.evidence,
    acceptCommand: item.acceptCommand,
    rejectCommand: item.rejectCommand,
    contractMarkdown: item.contract?.contractMarkdown ?? null,
  };
}

function readyReviewQueueFor(items) {
  return items
    .filter((item) => reviewReadiness(item) === 'ready-for-human-review')
    .map((item, index) => ({
      rank: index + 1,
      id: item.id,
      species: item.species,
      status: reviewReadiness(item),
      source: item.source,
      packet: item.reviewPacket?.file ?? null,
      sourcePreviewCommand: item.reviewPacket?.commands?.sourcePreview ?? null,
      acceptCommand: item.acceptCommand,
      rejectCommand: item.rejectCommand,
      blockers: item.blockers,
      evidence: item.evidence,
    }));
}

function contractSnapshot(candidate) {
  const fileBase = safeFileName(candidate.id);
  return {
    contractMarkdown: `public/review/source-candidates/art-contracts/${fileBase}.md`,
    contractJson: `public/review/source-candidates/art-contracts/${fileBase}.json`,
    requiredRead: asArray(candidate.requiredRead),
    articulatableParts: asArray(candidate.articulatableParts),
    promptRisks: asArray(candidate.promptRisks),
    contractReviewChecklist: asArray(candidate.contractReviewChecklist),
  };
}

function reviewPacketFor(item) {
  const file = `public/review/source-candidates/source-review-packets/${safeFileName(item.id)}.md`;
  return {
    file,
    status: reviewReadiness(item),
    evidenceSummary: [
      item.evidence.hasThumbnail ? 'thumbnail available' : 'thumbnail missing',
      item.evidence.hasKeyPreview ? 'magenta key preview available' : 'magenta key preview missing',
      item.evidence.imageValidationPassed ? 'image validation passed' : 'image validation missing/failing',
      item.evidence.sourcePreviewPassed ? 'source sandbox render check passed (not approval)' : 'source sandbox preview missing/failing',
      item.approved ? 'human approved' : 'human approval missing',
    ],
    commands: {
      sourcePreview: `npm run sandbox:preview -- --id ${item.id} --kind source --serve --open --visual`,
      imageCheck: 'npm run source:image-check',
      previewCheck: 'npm run source:preview-check',
      rebuildDossier: 'npm run source:review-dossier && npm run source:review-dossier-check',
      accept: item.acceptCommand,
      reject: item.rejectCommand,
    },
    links: {
      source: item.source ?? null,
      sourceUrl: item.sourceUrl ?? null,
      thumbnail: item.sourceThumbFile ?? null,
      keyPreview: item.keyPreviewFile ?? null,
      sandboxScreenshot: item.sourcePreview?.screenshotPath ?? null,
      contractMarkdown: item.contract?.contractMarkdown ?? null,
    },
  };
}

function renderReviewPacket(item) {
  return `# Source Review Packet: ${item.species} (${item.id})

Status: \`${item.reviewPacket.status}\`

This packet is for human approval of the whole source image before extraction or rigging. Passing automation is not approval.

## Evidence

${markdownList(item.reviewPacket.evidenceSummary)}

## Links

- Source: ${item.source ? `\`${item.source}\`` : 'missing'}
- Thumbnail: ${item.sourceThumbFile ? `\`${item.sourceThumbFile}\`` : 'missing'}
- Magenta key preview: ${item.keyPreviewFile ? `\`${item.keyPreviewFile}\`` : 'missing'}
- Sandbox screenshot: ${item.sourcePreview?.screenshotPath ? `\`${item.sourcePreview.screenshotPath}\`` : 'missing'}
- Contract: \`${item.contract.contractMarkdown}\`

## Blockers

${markdownList(item.blockers)}

## Required Read

${markdownList(item.contract.requiredRead)}

## Candidate Checks

${markdownList(item.contract.contractReviewChecklist)}

## Riggable Parts

${markdownList(item.contract.articulatableParts)}

## Reject Risks

${markdownList(item.contract.promptRisks)}

## Commands

\`\`\`bash
${item.reviewPacket.commands.sourcePreview}
${item.reviewPacket.commands.imageCheck}
${item.reviewPacket.commands.previewCheck}
${item.reviewPacket.commands.rebuildDossier}
${item.reviewPacket.commands.accept}
${item.reviewPacket.commands.reject}
\`\`\`
`;
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
}

function htmlList(items) {
  return `<ul>${items.length ? items.map((item) => `<li>${htmlEscape(item)}</li>`).join('') : '<li>None recorded.</li>'}</ul>`;
}

function renderMarkdown(dossier) {
  const queueRows = dossier.readyReviewQueue
    .map((item) => `| ${item.rank} | ${mdEscape(item.id)} | ${mdEscape(item.species)} | ${mdEscape(item.packet)} | \`${mdEscape(item.sourcePreviewCommand)}\` | \`${mdEscape(item.acceptCommand)}\` |`)
    .join('\n');
  const rows = dossier.items
    .filter((item) => item.hasSource)
    .map((item) => `| ${mdEscape(item.id)} | ${mdEscape(item.species)} | ${mdEscape(item.status)} | ${item.approved ? 'yes' : 'no'} | ${item.evidence.imageValidationPassed ? 'pass' : 'missing/fail'} | ${item.evidence.sourcePreviewPassed ? 'pass' : 'missing/fail'} | ${mdEscape(item.blockers.join('; '))} |`)
    .join('\n');
  const contractSections = dossier.items
    .filter((item) => item.hasSource)
    .map((item) => `### ${item.species} (${item.id})

Contract: \`${item.contract.contractMarkdown}\`
Packet: \`${item.reviewPacket.file}\`

Required read:

${markdownList(item.contract.requiredRead)}

Candidate-specific review checks:

${markdownList(item.contract.contractReviewChecklist)}

Riggable parts:

${markdownList(item.contract.articulatableParts)}

Reject risks:

${markdownList(item.contract.promptRisks)}
`)
    .join('\n');
  const commands = [
    'npm run source:gallery',
    'npm run source:image-check',
    'npm run source:preview-check',
    'npm run source:review-dossier && npm run source:review-dossier-check',
    'npm run source:accept -- --id <candidate-id> --status approved --reviewed-by <human-reviewer> ...',
  ].join('\n');
  return `# Water 9 Source Review Dossier

Generated evidence bundle for human source-art approval. A source image is not production-approved just because automated image checks pass.

## Summary

- Candidates: ${dossier.summary.candidateCount}
- Source images: ${dossier.summary.sourceImages}
- Approved sources: ${dossier.summary.approvedSources}
- Pending human review: ${dossier.summary.pendingReview}
- Missing source images: ${dossier.summary.missingSourceImages}

## Recommended Review

${dossier.recommendedReview ? `- Candidate: ${dossier.recommendedReview.species} (${dossier.recommendedReview.id})
- Status: ${dossier.recommendedReview.status}
- Source: \`${dossier.recommendedReview.source}\`
- Contract: \`${dossier.recommendedReview.contractMarkdown}\`
- Accept command: \`${dossier.recommendedReview.acceptCommand}\`
- Reject command: \`${dossier.recommendedReview.rejectCommand}\`
- Blockers: ${dossier.recommendedReview.blockers.join('; ') || 'none'}` : 'No pending source image is ready for review.'}

## Ready Review Queue

${dossier.readyReviewQueue.length ? `| Rank | ID | Species | Packet | Source Preview | Accept |
| ---: | --- | --- | --- | --- | --- |
${queueRows}` : 'No source images are ready for human review.'}

## Commands

\`\`\`sh
${commands}
\`\`\`

## Source Images Awaiting Review

| ID | Species | Status | Approved | Image Check | Preview Check | Blockers |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

## Contract Snapshots

${contractSections}
`;
}

function evidenceList(item) {
  const parts = [
    item.evidence.hasThumbnail ? 'thumbnail' : 'missing thumbnail',
    item.evidence.hasKeyPreview ? 'key preview' : 'missing key preview',
    item.evidence.imageValidationPassed ? 'image validation passed' : 'image validation missing/failing',
    item.evidence.sourcePreviewPassed ? 'source preview rendered (not approval)' : 'source preview missing/failing',
    item.approved ? 'approved' : 'not approved',
  ];
  return parts.map((part) => `<span>${htmlEscape(part)}</span>`).join('');
}

function imageBlock(label, href, alt) {
  if (!href) return `<div class="missing">${htmlEscape(label)} missing</div>`;
  return `<figure><img src="${htmlEscape(href)}" alt="${htmlEscape(alt)}"><figcaption>${htmlEscape(label)}</figcaption></figure>`;
}

function contractBlock(contract) {
  return `<section class="contract">
    <h3>Contract Snapshot</h3>
    <p><a href="${htmlEscape(relativePathFromOut(contract.contractMarkdown))}">${htmlEscape(contract.contractMarkdown)}</a></p>
    <div class="contract-grid">
      <div><h4>Required Read</h4>${htmlList(contract.requiredRead)}</div>
      <div><h4>Candidate Checks</h4>${htmlList(contract.contractReviewChecklist)}</div>
      <div><h4>Riggable Parts</h4>${htmlList(contract.articulatableParts)}</div>
      <div><h4>Reject Risks</h4>${htmlList(contract.promptRisks)}</div>
    </div>
  </section>`;
}

function renderHtml(dossier) {
  const missingSourceRows = dossier.items.filter((item) => !item.hasSource).map((item) => `<li><code>${htmlEscape(item.id)}</code> ${htmlEscape(item.species)} <span>${htmlEscape(item.status)}</span></li>`).join('\n');
  const recommendedReview = dossier.recommendedReview;
  const queueRows = dossier.readyReviewQueue.map((item) => `<tr>
        <td>${item.rank}</td>
        <td><code>${htmlEscape(item.id)}</code><br>${htmlEscape(item.species)}</td>
        <td>${item.packet ? `<a href="${htmlEscape(relativePathFromOut(item.packet))}">${htmlEscape(item.packet)}</a>` : 'missing'}</td>
        <td><pre><code>${htmlEscape(item.sourcePreviewCommand)}</code></pre></td>
        <td><pre><code>${htmlEscape(item.acceptCommand)}</code></pre></td>
      </tr>`).join('');
  const recommendedReviewBlock = recommendedReview
    ? `<section class="candidate">
      <header><div><h2>Recommended Review</h2><p>Next source image to review before rigging.</p></div><strong>${htmlEscape(recommendedReview.status)}</strong></header>
      <dl>
        <dt>candidate</dt><dd><code>${htmlEscape(recommendedReview.id)}</code> ${htmlEscape(recommendedReview.species)}</dd>
        <dt>source</dt><dd>${htmlEscape(recommendedReview.source)}</dd>
        <dt>contract</dt><dd><a href="${htmlEscape(relativePathFromOut(recommendedReview.contractMarkdown))}">${htmlEscape(recommendedReview.contractMarkdown)}</a></dd>
      </dl>
      <h3>Blockers</h3>
      <ul>${recommendedReview.blockers.length ? recommendedReview.blockers.map((blocker) => `<li>${htmlEscape(blocker)}</li>`).join('') : '<li>none</li>'}</ul>
      <h3>Accept Command</h3>
      <pre><code>${htmlEscape(recommendedReview.acceptCommand)}</code></pre>
      <h3>Reject Command</h3>
      <pre><code>${htmlEscape(recommendedReview.rejectCommand)}</code></pre>
    </section>`
    : `<section class="candidate"><header><div><h2>Recommended Review</h2><p>No pending source image is ready for review.</p></div><strong>none</strong></header></section>`;
  const itemCards = dossier.items.filter((item) => item.hasSource).map((item) => {
    const blockers = item.blockers.map((blocker) => `<li>${htmlEscape(blocker)}</li>`).join('');
    const metric = item.imageValidationMetric;
    const preview = item.sourcePreview;
    return `<article class="candidate ${item.approved ? 'approved' : 'pending'}">
      <header>
        <div>
          <h2>${htmlEscape(item.species)}</h2>
          <code>${htmlEscape(item.id)}</code>
        </div>
        <strong>${item.approved ? 'approved' : 'needs human review'}</strong>
      </header>
      <div class="images">
        ${imageBlock('whole source thumbnail', item.sourceThumbHref, `${item.species} source thumbnail`)}
        ${imageBlock('magenta key preview', item.keyPreviewHref, `${item.species} key preview`)}
        ${imageBlock('sandbox screenshot', item.sourcePreview?.screenshotHref, `${item.species} source sandbox preview`)}
      </div>
      <div class="evidence">${evidenceList(item)}</div>
      <dl>
        <dt>source</dt><dd>${item.sourceUrl ? `<a href="${htmlEscape(item.sourceUrl)}">${htmlEscape(item.source)}</a>` : htmlEscape(item.source)}</dd>
        <dt>review packet</dt><dd><a href="${htmlEscape(relativePathFromOut(item.reviewPacket.file))}">${htmlEscape(item.reviewPacket.file)}</a></dd>
        <dt>image metrics</dt><dd>${metric ? htmlEscape(`${metric.size?.join('x') ?? 'unknown size'}, subject ${metric.subjectSize?.join('x') ?? 'unknown'}, background ${metric.backgroundRatio ?? 'n/a'}, inner magenta ${metric.innerMagentaRatio ?? 'n/a'}`) : 'missing'}</dd>
        <dt>detail metrics</dt><dd>${metric?.detail ? htmlEscape(`entropy ${metric.detail.colorEntropy}, color bins ${metric.detail.quantizedColorBins}, edge density ${metric.detail.edgeDensity}, local contrast ${metric.detail.averageLocalContrast}`) : 'missing'}</dd>
        <dt>connectivity</dt><dd>${metric?.connectivity ? htmlEscape(`largest component ${metric.connectivity.largestComponentRatio}, significant components ${metric.connectivity.significantComponents}`) : 'missing'}</dd>
        <dt>preview canvas</dt><dd>${preview?.canvas ? htmlEscape(`${preview.canvas.width}x${preview.canvas.height}, varied ${preview.canvas.variedSamples}, luma ${preview.canvas.lumaRange}`) : 'missing'}</dd>
      </dl>
      <h3>Blockers</h3>
      <ul>${blockers || '<li>none</li>'}</ul>
      ${contractBlock(item.contract)}
      <h3>Approval Command</h3>
      <pre><code>${htmlEscape(item.acceptCommand)}</code></pre>
      <h3>Reject Command</h3>
      <pre><code>${htmlEscape(item.rejectCommand)}</code></pre>
      <h3>Source Preview Command</h3>
      <pre><code>${htmlEscape(item.reviewPacket.commands.sourcePreview)}</code></pre>
    </article>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Review Dossier</title>
  <style>
    :root { color-scheme: dark; --bg:#061012; --panel:#0d1b20; --line:#29444b; --text:#e6f5f5; --muted:#91a9ae; --accent:#7adff6; --warn:#f0bd6b; --bad:#f07878; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2, h3 { margin:0 0 8px; }
    h2 { font-size:20px; }
    h3 { margin-top:14px; font-size:14px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
    p { color:var(--muted); margin:0 0 14px; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:8px 0 0; padding:10px; border:1px solid var(--line); background:#050b0d; overflow:auto; white-space:pre-wrap; }
    .summary { display:flex; flex-wrap:wrap; gap:9px; margin:18px 0 24px; }
    .summary span, .evidence span { border:1px solid var(--line); background:#09171b; border-radius:5px; padding:7px 9px; color:var(--muted); }
    .summary strong { color:var(--text); margin-left:4px; }
    .commands { margin-bottom:24px; }
    .grid { display:grid; gap:16px; }
    .candidate { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:16px; }
    .candidate header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:14px; }
    .candidate header strong { color:var(--warn); }
    .candidate.approved header strong { color:var(--accent); }
    .images { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:12px; margin-bottom:12px; }
    figure { margin:0; border:1px solid var(--line); background:#050b0d; border-radius:5px; overflow:hidden; }
    img { display:block; width:100%; max-height:300px; object-fit:contain; background:#050b0d; }
    figcaption { color:var(--muted); padding:8px 10px; border-top:1px solid var(--line); }
    .missing { display:flex; min-height:180px; align-items:center; justify-content:center; border:1px dashed var(--line); color:var(--muted); border-radius:5px; }
    .evidence { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0 14px; }
    dl { display:grid; grid-template-columns:130px 1fr; gap:6px 10px; margin:0; }
    dt { color:var(--muted); }
    dd { margin:0; min-width:0; overflow-wrap:anywhere; }
    table { width:100%; border-collapse:collapse; }
    th, td { border-top:1px solid var(--line); padding:8px; text-align:left; vertical-align:top; }
    th { color:var(--muted); }
    .contract { margin-top:14px; padding:12px; border:1px solid var(--line); border-radius:5px; background:#09171b; }
    .contract-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
    .contract h4 { margin:0 0 6px; color:var(--accent); font-size:13px; }
    .contract ul { margin:0; padding-left:18px; }
    li { margin-bottom:4px; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Review Dossier</h1>
    <p>Human-facing evidence for approving source art before extraction or rigging. Automated checks prove technical readiness only; approval still requires a cohesive whole-creature visual review.</p>
    <div class="summary">
      <span>candidates <strong>${dossier.summary.candidateCount}</strong></span>
      <span>source images <strong>${dossier.summary.sourceImages}</strong></span>
      <span>approved sources <strong>${dossier.summary.approvedSources}</strong></span>
      <span>pending review <strong>${dossier.summary.pendingReview}</strong></span>
      <span>missing source images <strong>${dossier.summary.missingSourceImages}</strong></span>
      <span>clean image checks <strong>${dossier.summary.imageValidationPassed}</strong></span>
      <span>clean source previews <strong>${dossier.summary.sourcePreviewPassed}</strong></span>
    </div>
    <section class="commands">
      <pre><code>${htmlEscape([
        'npm run source:gallery',
        'npm run source:image-check',
        'npm run source:preview-check',
        'npm run source:review-dossier && npm run source:review-dossier-check',
        'npm run source:accept -- --id <candidate-id> --status approved --reviewed-by <human-reviewer> ...',
      ].join('\n'))}</code></pre>
    </section>
    ${recommendedReviewBlock}
    <section class="candidate">
      <header><div><h2>Ready Review Queue</h2><p>All source images that have passed technical checks and need human approval.</p></div><strong>${dossier.readyReviewQueue.length}</strong></header>
      <table>
        <thead><tr><th>Rank</th><th>Candidate</th><th>Packet</th><th>Source Preview</th><th>Accept</th></tr></thead>
        <tbody>${queueRows || '<tr><td colspan="5">No source images are ready for human review.</td></tr>'}</tbody>
      </table>
    </section>
    <section class="candidate">
      <header><div><h2>Missing Source Images</h2><p>These candidates still need recoverable magenta-background source art before human visual review.</p></div><strong>${dossier.summary.missingSourceImages}</strong></header>
      <ul>${missingSourceRows || '<li>none</li>'}</ul>
    </section>
    <section class="grid">${itemCards}</section>
  </main>
</body>
</html>
`;
}

const sourceCandidates = await readJson(paths.sourceCandidates, { candidates: [] });
const reviewManifest = await readJson(paths.reviewManifest, { candidates: [] });
const imageReport = await readJson(paths.imageReport, { metrics: [] });
const previewReport = await readJson(paths.previewReport, { results: [] });

const candidates = Array.isArray(sourceCandidates.candidates) ? sourceCandidates.candidates : [];
const reviewById = new Map((reviewManifest.candidates ?? []).map((item) => [item.id, item]));
const metricById = new Map((imageReport.metrics ?? []).map((metric) => [metric.id, metric]));

const items = candidates.map((candidate) => {
  const reviewItem = reviewById.get(candidate.id) ?? null;
  const metric = metricById.get(candidate.id) ?? null;
  const preview = previewResultFor(previewReport, candidate.id);
  const blockers = approvalBlockers({ candidate, reviewItem, metric, preview });
  const sourceThumbHref = localReviewHref(reviewItem?.sourceThumbFile);
  const keyPreviewHref = localReviewHref(reviewItem?.keyPreviewFile);
  const item = {
    id: candidate.id,
    species: candidate.species,
    status: candidate.status ?? 'draft',
    hasSource: Boolean(candidate.source),
    source: candidate.source ?? null,
    sourceUrl: publicUrl(candidate.source),
    approved: reviewItem?.approved === true,
    sourceThumbFile: reviewItem?.sourceThumbFile ?? null,
    sourceThumbHref,
    keyPreviewFile: reviewItem?.keyPreviewFile ?? null,
    keyPreviewHref,
    imageValidationMetric: compactMetric(metric),
    sourcePreview: compactPreview(preview),
    contract: contractSnapshot(candidate),
    blockers,
    evidence: {
      hasThumbnail: Boolean(reviewItem?.sourceThumbFile),
      hasKeyPreview: Boolean(reviewItem?.keyPreviewFile),
      imageValidationPassed: metric?.checked === true && (metric.failures ?? []).length === 0,
      sourcePreviewPassed: Boolean(preview) && (preview.failures ?? []).length === 0 && preview.snapshot?.hasPreviewSprite === true,
      humanApproved: reviewItem?.approved === true,
    },
    reviewItem: reviewItem ? {
      inputFingerprint: reviewItem.inputFingerprint ?? null,
      requiredApprovalFlags: reviewItem.requiredApprovalFlags ?? [],
      acceptCommand: reviewItem.acceptCommand ?? null,
      rejectCommand: reviewItem.rejectCommand ?? null,
    } : null,
    acceptCommand: null,
    rejectCommand: reviewItem?.rejectCommand ?? `npm run source:accept -- --id ${candidate.id} --status rejected --reviewed-by <human-reviewer> --note '<specific rejection reason after inspecting source, key, sandbox preview, visual board, and plan preview>' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json`,
  };
  item.acceptCommand = sourceAcceptCommand(item);
  item.reviewPacket = reviewPacketFor(item);
  return item;
});

const sourceItems = items.filter((item) => item.hasSource);
const recommendedReview = recommendedReviewFor(items);
const readyReviewQueue = readyReviewQueueFor(items);
const dossier = {
  schema: 'water9/source-review-dossier@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: Object.fromEntries(await Promise.all(Object.entries(paths)
    .filter(([key]) => !key.startsWith('out'))
    .map(async ([key, path]) => [key, await fileSummary(path)]))),
  summary: {
    candidateCount: items.length,
    sourceImages: sourceItems.length,
    approvedSources: sourceItems.filter((item) => item.approved).length,
    pendingReview: sourceItems.filter((item) => !item.approved).length,
    missingSourceImages: items.filter((item) => !item.hasSource).length,
    imageValidationPassed: sourceItems.filter((item) => item.evidence.imageValidationPassed).length,
    sourcePreviewPassed: sourceItems.filter((item) => item.evidence.sourcePreviewPassed).length,
    readyForHumanReview: sourceItems.filter((item) => reviewReadiness(item) === 'ready-for-human-review').length,
    reviewBlocked: sourceItems.filter((item) => reviewReadiness(item) === 'blocked').length,
  },
  recommendedReview,
  readyReviewQueue,
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await mkdir(paths.packetDir, { recursive: true });
for (const item of items.filter((candidate) => candidate.hasSource)) {
  await writeFile(resolve(item.reviewPacket.file), renderReviewPacket(item));
}
await writeFile(paths.outJson, `${JSON.stringify(dossier, null, 2)}\n`);
await writeFile(paths.outMd, renderMarkdown(dossier));
await writeFile(paths.outHtml, renderHtml(dossier));

console.log(JSON.stringify({
  schema: dossier.schema,
  jsonOut: paths.outJson,
  mdOut: paths.outMd,
  htmlOut: paths.outHtml,
  summary: dossier.summary,
}, null, 2));
