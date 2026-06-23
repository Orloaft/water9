import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, distinctReviewNotes, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import {
  rigAcceptedStrict,
  sourceApprovedStrict,
  sourceArtContractRecorded as strictSourceArtContractRecorded,
  sourceImageValidationRecorded as strictSourceImageValidationRecorded,
  threatAcceptedForContentGate,
} from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const minThreats = Number(args.get('min-threats') ?? 20);
const jsonOut = resolve(String(args.get('json-out') ?? 'public/review/content-stage-board.json'));
const markdownOut = resolve(String(args.get('out') ?? 'public/review/content-stage-board.md'));
const htmlOut = resolve(String(args.get('html-out') ?? 'public/review/content-stage-board.html'));
const MIN_RIG_VISUAL_SCORE = 4;
const paths = {
  research: resolve(String(args.get('research') ?? 'public/review/source-candidates/research-briefs.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  sourceQueue: resolve(String(args.get('source-queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  sourceRejections: resolve(String(args.get('source-rejections') ?? 'public/review/source-candidates/rejected-attempts.json')),
  runtime: resolve(String(args.get('runtime') ?? 'public/assets/generated/articulated-creatures.parts.json')),
  articulatedReview: resolve(String(args.get('articulated-review') ?? 'public/review/articulated/review-manifest.json')),
  sandboxDir: resolve(String(args.get('sandbox-report-dir') ?? 'tools/scratch')),
  sourcePreviewReport: resolve(String(args.get('source-preview-report') ?? 'tools/scratch/source-preview-visuals-report.json')),
};

const REQUIRED_SOURCE_CHECKS = [
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
const MIN_SOURCE_VISUAL_SCORE = 4;
const REQUIRED_RIG_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
const REQUIRED_RIG_EVIDENCE = ['whole-source', 'contact-sheet', 'phase-strip', 'source-parity', 'sandbox-preview'];
const REQUIRED_SANDBOX_STATES = ['idle', 'lunge', 'stunned'];
const DISALLOWED_REVIEWERS = new Set(['codex', 'assistant', 'ai', 'agent', 'automation', 'bot', 'model']);
const SOURCE_VISUAL_NOTE_TERMS = {
  'whole-creature-cohesion': ['whole', 'source', 'organism', 'creature', 'cohesion', 'single'],
  'part-continuity-cohesion': ['part', 'continuity', 'joint', 'anatomy', 'proportion', 'lighting'],
  'readable-silhouette': ['silhouette', 'outline', 'readable', 'scale', 'shape'],
  'no-collage-artifacts': ['collage', 'artifact', 'lighting', 'material', 'palette', 'stitched'],
  'non-placeholder-art-direction': ['production', 'placeholder', 'art direction', 'design', 'finished'],
  'crop-safe-anatomy': ['crop', 'margin', 'joint', 'appendage', 'pivot', 'anatomy'],
  'clean-magenta-key': ['magenta', 'key', 'background', 'border', 'pink'],
  'gameplay-read': ['gameplay', 'danger', 'verb', 'attack', 'hazard', 'read'],
  'neutral-riggable-pose': ['neutral', 'pose', 'riggable', 'pivot', 'attack frame'],
  'visible-attack-lane': ['attack', 'lane', 'direction', 'mouth', 'spine', 'strike'],
};
const RIG_VISUAL_NOTE_TERMS = {
  'single-source-cohesion': ['source', 'cohesion', 'parity', 'whole', 'same creature'],
  'readable-silhouette': ['silhouette', 'outline', 'scale', 'readable', 'shape'],
  'anatomy-cohesion': ['anatomy', 'orientation', 'part', 'jaw', 'body', 'tail', 'limb'],
  'production-visual-cohesion': ['production', 'placeholder', 'palette', 'lighting', 'material', 'cohesion'],
  'socket-seams': ['socket', 'seam', 'joint', 'overlay', 'connection'],
  'motion-stability': ['phase', 'motion', 'jitter', 'popping', 'frame', 'animation'],
  'sandbox-behavior': ['sandbox', 'idle', 'lunge', 'stunned', 'diver', 'behavior', 'motion'],
};

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fileOk(path, minSize = 512) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

async function loadSandboxReports() {
  let entries = [];
  const pathsByName = new Map([[paths.sourcePreviewReport, paths.sourcePreviewReport]]);
  try {
    entries = await readdir(paths.sandboxDir, { withFileTypes: true });
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (
      !/^sandbox.*report.*\.json$/.test(entry.name)
      && !/^sandbox-visuals.*report.*\.json$/.test(entry.name)
      && !/^[a-z0-9_-]+-visuals-report\.json$/.test(entry.name)
    ) continue;
    pathsByName.set(resolve(paths.sandboxDir, entry.name), resolve(paths.sandboxDir, entry.name));
  }
  const reports = [];
  for (const path of [...pathsByName.values()].sort()) {
    const report = await readJson(path, null);
    if (report?.schema !== 'water9/sandbox-visual-check@1') continue;
    const info = await stat(path).catch(() => null);
    reports.push({ path, report, mtimeMs: info?.mtimeMs ?? 0 });
  }
  return reports;
}

function reviewerAllowed(name) {
  const normalized = String(name ?? '').trim().toLowerCase();
  return Boolean(normalized) && !DISALLOWED_REVIEWERS.has(normalized);
}

function safeFileName(value) {
  return String(value ?? '').replace(/[^a-z0-9_-]/gi, '-');
}

function sourceApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function sourceImageValidationRecorded(candidate) {
  return strictSourceImageValidationRecorded(candidate);
}

function sourceArtContractRecorded(candidate) {
  return strictSourceArtContractRecorded(candidate);
}

function rigAccepted(creature) {
  return rigAcceptedStrict(creature);
}

function threatAccepted(candidate, runtimeCreature, reviewItem) {
  return threatAcceptedForContentGate(candidate, runtimeCreature, reviewItem);
}

function latestSandboxById(reports) {
  const byId = new Map();
  for (const { path, report, mtimeMs } of reports) {
    for (const result of report.results ?? []) {
      if (!result.id) continue;
      const current = byId.get(result.id);
      if (!current || mtimeMs > current.mtimeMs) byId.set(result.id, { ...result, reportPath: path, mtimeMs });
    }
  }
  return byId;
}

function sandboxComplete(result) {
  if (!result || (result.failures ?? []).length) return false;
  const stateNames = new Set((result.states ?? []).map((state) => state.state));
  return REQUIRED_SANDBOX_STATES.every((state) => stateNames.has(state));
}

function sourcePreviewComplete(result) {
  const canvas = result?.canvas ?? {};
  return Boolean(result)
    && (result.failures ?? []).length === 0
    && result.snapshot?.entryId === result.id
    && result.snapshot?.previewTexture === result.id
    && result.snapshot?.hasPreviewSprite === true
    && canvas.exists === true
    && Number(canvas.width) > 0
    && Number(canvas.height) > 0
    && Number(canvas.opaqueSamples ?? 0) >= 120
    && Number(canvas.variedSamples ?? 0) >= 8
    && Number(canvas.lumaRange ?? 0) >= 12
    && Boolean(result.screenshotPath);
}

function latestRejectionsByCandidate(rejections) {
  const byId = new Map();
  for (const rejection of rejections) {
    if (!rejection.candidateId) continue;
    const current = byId.get(rejection.candidateId);
    if (!current || String(rejection.rejectedAt ?? '') > String(current.rejectedAt ?? '')) byId.set(rejection.candidateId, rejection);
  }
  return byId;
}

function stageFor(target) {
  if (target.accepted) return 'accepted';
  if (target.rigId && !target.sourceApproved) return 'prototype-needs-approved-source';
  if (target.rigId && !target.sandboxComplete) return 'sandbox-review-needed';
  if (target.rigId) return 'rig-acceptance-needed';
  if (target.sourceApproved) return 'rigging-needed';
  if (target.hasSourceImage && !target.sourcePreviewComplete) return 'source-preview-needed';
  if (target.hasSourceImage) return 'source-review-needed';
  return 'source-image-needed';
}

function nextCommandsFor(target) {
  if (target.accepted) return [];
  if (!target.hasSourceImage) {
    return [
      'npm run source:contracts',
      'npm run source:inbox-pack',
      `npm run source:session -- --id ${target.id}`,
      `npm run source:imagegen-status -- --id ${target.id}`,
      `npm run source:imagegen-status -- --id ${target.id} --ingest`,
      `npm run source:next-prompt -- --id ${target.id}`,
      '# use the capture UI for pasted, dropped, downloaded, or manually saved output:',
      'npm run source:inbox-capture',
      `# if the output appears inline only, recover it into tools/source-inbox/${target.id}.png:`,
      `npm run source:recover-inline -- --id ${target.id} --copy --validate`,
      `npm run source:recover-inline -- --id ${target.id} --image <saved-image-path> --copy --validate`,
      'npm run source:inbox-check -- --dir tools/source-inbox --strict',
      'npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run',
      'npm run source:ingest-batch -- --dir tools/source-inbox --strict',
      'npm run source:check',
      'npm run source:gallery',
    ];
  }
  if (!target.sourceApproved) {
    return [
      `npm run source:image-check -- --id ${target.id}`,
      'npm run source:preview-check',
      'npm run source:gallery',
      `npm run source:accept -- --id ${target.id} --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' ${REQUIRED_SOURCE_CHECKS.map((check) => `--visual-check ${check}`).join(' ')} ${REQUIRED_SOURCE_CHECKS.map((check) => `--score ${check}=<4-5>`).join(' ')} ${REQUIRED_SOURCE_CHECKS.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')} --source-reviewed --dry-run`,
    ];
  }
  if (!target.rigId) {
    return [
      `npm run articulated:prepare-plan -- --id ${target.id} --overwrite`,
      `npm run articulated:extract-plan -- --plan tools/scratch/${target.id}-starter-plan.json --dry-run`,
    ];
  }
  return [
    `npm run review:articulated:quick`,
    `npm run sandbox:preview -- --id ${target.rigId} --with diver --visual`,
    `npm run sandbox:visual -- --ids ${target.rigId} --states idle,lunge,stunned --with diver`,
    `npm run content:accept -- --id ${target.rigId} --status accepted --reviewed-by <human-reviewer> --source-candidate ${target.id} --note '<specific rig approval note>' --visual-check single-source-cohesion --visual-check readable-silhouette --visual-check anatomy-cohesion --visual-check production-visual-cohesion --visual-check socket-seams --visual-check motion-stability --visual-check sandbox-behavior --score single-source-cohesion=<4-5> --score readable-silhouette=<4-5> --score anatomy-cohesion=<4-5> --score production-visual-cohesion=<4-5> --score socket-seams=<4-5> --score motion-stability=<4-5> --score sandbox-behavior=<4-5> --visual-note single-source-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note anatomy-cohesion='<specific rationale>' --visual-note production-visual-cohesion='<specific rationale>' --visual-note socket-seams='<specific rationale>' --visual-note motion-stability='<specific rationale>' --visual-note sandbox-behavior='<specific rationale>' --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run`,
  ];
}

function markdownTable(rows) {
  const lines = [
    '| # | Candidate | Stage | Source | Approved | Rig | Sandbox | Accepted |',
    '| ---: | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    lines.push(`| ${row.rank} | \`${row.id}\` ${row.species} | \`${row.stage}\` | ${row.hasSourceImage ? (row.sourcePreviewComplete ? 'yes+preview' : 'yes') : 'no'} | ${row.sourceApproved ? 'yes' : 'no'} | ${row.rigId ? `\`${row.rigId}\`` : 'no'} | ${row.sandboxComplete ? 'yes' : 'no'} | ${row.accepted ? 'yes' : 'no'} |`);
  }
  return lines.join('\n');
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownFor(board) {
  const rows = board.targets;
  const detail = rows.map((row) => [
    `### ${row.rank}. ${row.species} (${row.id})`,
    '',
    `Stage: \`${row.stage}\``,
    row.rigId ? `Rig: \`${row.rigId}\`` : 'Rig: none',
    row.latestRejection ? `Latest rejection: ${row.latestRejection.reason}` : null,
    '',
    'Next commands:',
    '```bash',
    row.nextCommands.join('\n') || '# no commands; accepted',
    '```',
  ].filter(Boolean).join('\n')).join('\n\n');
  return `${[
    '# Water 9 Content Stage Board',
    '',
    `Target accepted threats: \`${board.summary.targetThreats}\``,
    `Accepted threats: \`${board.summary.acceptedThreats}/${board.summary.targetThreats}\``,
    `Next bottleneck: **${board.summary.nextBottleneck}**`,
    '',
    'Stage counts:',
    ...Object.entries(board.summary.stageCounts).map(([stage, count]) => `- \`${stage}\`: ${count}`),
    '',
    markdownTable(rows),
    '',
    '## Details',
    '',
    detail,
    '',
  ].join('\n')}\n`;
}

function htmlFor(board) {
  const stageCounts = Object.entries(board.summary.stageCounts)
    .map(([stage, count]) => `<span class="pill">${htmlEscape(stage)} <strong>${count}</strong></span>`)
    .join('');
  const rows = board.targets.map((row) => {
    const contract = `source-candidates/art-contracts/${row.id}.md`;
    const sourcePreview = row.hasSourceImage ? `/?sandbox=source-${encodeURIComponent(row.id)}` : null;
    const sandboxPreview = row.rigId ? `/?sandbox=${encodeURIComponent(row.rigId)}` : null;
    const links = [
      `<a href="${htmlEscape(contract)}">contract</a>`,
      sourcePreview ? `<a href="${htmlEscape(sourcePreview)}">source preview</a>` : null,
      sandboxPreview ? `<a href="${htmlEscape(sandboxPreview)}">rig sandbox</a>` : null,
    ].filter(Boolean).join(' ');
    return `<tr>
      <td>${row.rank}</td>
      <td><strong>${htmlEscape(row.species)}</strong><code>${htmlEscape(row.id)}</code></td>
      <td><span class="stage">${htmlEscape(row.stage)}</span></td>
      <td>${row.hasSourceImage ? (row.sourcePreviewComplete ? 'yes + preview' : 'yes') : 'no'}</td>
      <td>${row.sourceApproved ? 'yes' : 'no'}</td>
      <td>${row.rigId ? `<code>${htmlEscape(row.rigId)}</code>` : 'no'}</td>
      <td>${row.accepted ? 'yes' : 'no'}</td>
      <td>${links}</td>
    </tr>`;
  }).join('\n');
  const cards = board.targets.map((row) => {
    const commands = row.nextCommands.length ? row.nextCommands.join('\n') : '# no commands; accepted';
    return `<section class="card" id="${htmlEscape(row.id)}">
      <header>
        <span class="rank">${row.rank}</span>
        <div><h2>${htmlEscape(row.species)}</h2><code>${htmlEscape(row.id)}</code></div>
        <span class="stage">${htmlEscape(row.stage)}</span>
      </header>
      <dl>
        <div><dt>source</dt><dd>${row.hasSourceImage ? (row.sourcePreviewComplete ? 'yes + preview' : 'yes') : 'no'}</dd></div>
        <div><dt>approved</dt><dd>${row.sourceApproved ? 'yes' : 'no'}</dd></div>
        <div><dt>rig</dt><dd>${row.rigId ? htmlEscape(row.rigId) : 'none'}</dd></div>
        <div><dt>accepted</dt><dd>${row.accepted ? 'yes' : 'no'}</dd></div>
      </dl>
      ${row.latestRejection ? `<p class="rejection">Latest rejection: ${htmlEscape(row.latestRejection.reason)}</p>` : ''}
      <pre><code>${htmlEscape(commands)}</code></pre>
    </section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Content Stage Board</title>
  <style>
    :root { color-scheme: dark; --bg:#071012; --panel:#0d191d; --line:#244147; --text:#d9f3f4; --muted:#8fa8ad; --good:#7ff0ba; --warn:#f0c36a; }
    * { box-sizing:border-box; }
    body { margin:0; font:14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--text); }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:28px; }
    h2 { margin:0; font-size:17px; }
    code, pre { font-family:"SFMono-Regular", Consolas, monospace; }
    code { display:block; color:var(--muted); font-size:12px; margin-top:3px; }
    .summary { color:var(--muted); margin:0 0 18px; }
    .pills { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0 24px; }
    .pill, .stage { border:1px solid var(--line); background:#0a1417; border-radius:4px; padding:4px 7px; color:var(--muted); }
    .pill strong { color:var(--text); margin-left:5px; }
    table { width:100%; border-collapse:collapse; margin:0 0 24px; background:var(--panel); border:1px solid var(--line); }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:9px 10px; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
    a { color:#7fd8ff; text-decoration:none; margin-right:8px; }
    a:hover { text-decoration:underline; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:14px; }
    .card { border:1px solid var(--line); background:var(--panel); padding:14px; border-radius:6px; }
    .card header { display:flex; align-items:flex-start; gap:10px; justify-content:space-between; }
    .rank { flex:0 0 auto; min-width:28px; height:28px; border:1px solid var(--line); display:grid; place-items:center; color:var(--warn); }
    dl { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:12px 0; }
    dt { color:var(--muted); font-size:11px; text-transform:uppercase; }
    dd { margin:0; }
    .rejection { color:var(--warn); }
    pre { overflow:auto; white-space:pre-wrap; border:1px solid var(--line); background:#050b0d; padding:10px; margin:0; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Content Stage Board</h1>
    <p class="summary">Accepted threats: ${board.summary.acceptedThreats}/${board.summary.targetThreats}. Next bottleneck: ${htmlEscape(board.summary.nextBottleneck)}.</p>
    <div class="pills">${stageCounts}</div>
    <table>
      <thead><tr><th>#</th><th>Candidate</th><th>Stage</th><th>Source</th><th>Approved</th><th>Rig</th><th>Accepted</th><th>Links</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="cards">${cards}</div>
  </main>
</body>
</html>
`;
}

const research = await readJson(paths.research, { briefs: [] });
const sourceCandidates = await readJson(paths.sourceCandidates, { candidates: [] });
const sourceQueue = await readJson(paths.sourceQueue, { candidates: [] });
const sourceRejections = await readJson(paths.sourceRejections, { attempts: [] });
const runtime = await readJson(paths.runtime, { creatures: [] });
const review = await readJson(paths.articulatedReview, { creatures: [] });
const sandboxReports = await loadSandboxReports();
const sandboxById = latestSandboxById(sandboxReports);
const latestRejection = latestRejectionsByCandidate(sourceRejections.attempts ?? []);

const candidates = sourceCandidates.candidates ?? [];
const queueRank = new Map((sourceQueue.candidates ?? []).map((item) => [item.id, item.rank ?? 9999]));
const briefsById = new Map((research.briefs ?? []).map((brief) => [brief.id, brief]));
const rigBySourceCandidate = new Map();
for (const creature of runtime.creatures ?? []) {
  const sourceCandidateId = creature.quality?.sourceCandidateId;
  if (sourceCandidateId) rigBySourceCandidate.set(sourceCandidateId, creature);
}
for (const candidate of candidates) {
  if (candidate.riggedCreatureId && !rigBySourceCandidate.has(candidate.id)) {
    const creature = (runtime.creatures ?? []).find((item) => item.id === candidate.riggedCreatureId);
    if (creature) rigBySourceCandidate.set(candidate.id, creature);
  }
}
for (const creature of runtime.creatures ?? []) {
  if (rigBySourceCandidate.has(creature.id)) continue;
}
const reviewById = new Map((review.creatures ?? []).map((item) => [item.id, item]));

const targets = [];
for (const candidate of candidates) {
  const sourcePath = candidate.source ? resolve(candidate.source) : null;
  const rig = rigBySourceCandidate.get(candidate.id);
  const sandbox = rig ? sandboxById.get(rig.id) : null;
  const sourcePreview = sandboxById.get(`source-${candidate.id}`);
  const target = {
    rank: queueRank.get(candidate.id) ?? 9999,
    id: candidate.id,
    species: candidate.species,
    researchBrief: Boolean(briefsById.get(candidate.researchBriefId ?? candidate.id)),
    sourceStatus: candidate.status,
    hasSourceImage: Boolean(candidate.source) && await fileOk(sourcePath),
    sourcePreviewComplete: sourcePreviewComplete(sourcePreview),
    sourcePreviewReport: sourcePreview?.reportPath ?? null,
    sourceApproved: sourceApproved(candidate),
    rigId: rig?.id ?? candidate.riggedCreatureId ?? null,
    rigStatus: rig?.quality?.status ?? null,
    reviewItem: rig ? Boolean(reviewById.get(rig.id)) : false,
    sandboxComplete: sandboxComplete(sandbox),
    accepted: threatAccepted(candidate, rig, rig ? reviewById.get(rig.id) : null),
    latestRejection: latestRejection.get(candidate.id) ?? null,
  };
  target.stage = stageFor(target);
  target.nextCommands = nextCommandsFor(target);
  targets.push(target);
}

targets.sort((left, right) => {
  const stageOrder = {
    'source-image-needed': 1,
    'source-preview-needed': 2,
    'source-review-needed': 3,
    'prototype-needs-approved-source': 4,
    'rigging-needed': 5,
    'sandbox-review-needed': 6,
    'rig-acceptance-needed': 7,
    accepted: 8,
  };
  return (stageOrder[left.stage] ?? 99) - (stageOrder[right.stage] ?? 99)
    || left.rank - right.rank
    || left.id.localeCompare(right.id);
});
targets.forEach((target, index) => { target.rank = index + 1; });

const stageCounts = {};
for (const target of targets) stageCounts[target.stage] = (stageCounts[target.stage] ?? 0) + 1;
const acceptedThreats = targets.filter((target) => target.accepted).length;
const summary = {
  targetThreats: minThreats,
  candidates: targets.length,
  acceptedThreats,
  stageCounts,
  nextBottleneck: acceptedThreats >= minThreats
    ? 'strict content gate target reached'
    : targets.find((target) => !target.accepted)?.stage ?? 'unknown',
};

const board = {
  schema: 'water9/content-stage-board@1',
  summary,
  generatedFrom: {
    research: paths.research,
    sourceCandidates: paths.sourceCandidates,
    sourceQueue: paths.sourceQueue,
    sourcePreviewReport: paths.sourcePreviewReport,
    runtime: paths.runtime,
    articulatedReview: paths.articulatedReview,
    sandboxReportDir: paths.sandboxDir,
  },
  targets,
};

await mkdir(dirname(jsonOut), { recursive: true });
await mkdir(dirname(markdownOut), { recursive: true });
await mkdir(dirname(htmlOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(board, null, 2)}\n`);
await writeFile(markdownOut, markdownFor(board));
await writeFile(htmlOut, htmlFor(board));

console.log(JSON.stringify({
  schema: board.schema,
  jsonOut,
  markdownOut,
  htmlOut,
  summary,
}, null, 2));
