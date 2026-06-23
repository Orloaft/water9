import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { MIN_VISUAL_NOTE_LENGTH, distinctReviewNotes, meaningfulReviewText, reviewNoteHasEvidenceTerms } from './review_text_quality.mjs';
import { rigAcceptedStrict, sourceApprovedStrict } from './content_quality_predicates.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = String(args.get('id') ?? '').trim();
const jsonOut = resolve(String(args.get('json-out') ?? 'public/review/content-acceptance-audit.json'));
const markdownOut = resolve(String(args.get('out') ?? 'public/review/content-acceptance-audit.md'));
const htmlOut = resolve(String(args.get('html-out') ?? 'public/review/content-acceptance-audit.html'));
const generatedDir = resolve('public/assets/generated');
const sandboxReportDir = resolve(String(args.get('sandbox-report-dir') ?? 'tools/scratch'));
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
const REQUIRED_THREAT_CHECKS = [
  'single-source-cohesion',
  'readable-silhouette',
  'anatomy-cohesion',
  'production-visual-cohesion',
  'socket-seams',
  'motion-stability',
  'sandbox-behavior',
];
const MIN_VISUAL_SCORE = 4;
const REQUIRED_THREAT_EVIDENCE = ['whole-source', 'contact-sheet', 'phase-strip', 'source-parity', 'sandbox-preview'];
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

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fileOk(path, minSize = 128) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

async function fileFingerprint(path) {
  try {
    const info = await stat(path);
    if (!info.isFile()) return { path, exists: false };
    return { path, exists: true, size: info.size, mtimeMs: Math.round(info.mtimeMs) };
  } catch {
    return { path, exists: false };
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sourceCandidateFingerprint(candidate) {
  const sourceFile = candidate?.source ? await fileFingerprint(resolve(candidate.source)) : null;
  return createHash('sha256').update(stableJson({
    tool: 'water9-source-candidate-review@2',
    candidate,
    sourceFile,
  })).digest('hex');
}

function textureNamesFor(creature) {
  const names = new Set();
  for (const part of creature?.parts ?? []) {
    for (const key of ['texture', 'damagedTexture', 'detachedTexture']) {
      if (part[key]) names.add(part[key]);
    }
  }
  for (const overlay of creature?.socketOverlays ?? []) {
    for (const key of ['texture', 'severedTexture']) {
      if (overlay[key]) names.add(overlay[key]);
    }
  }
  return [...names].sort();
}

async function creatureFingerprint(tool, creature, sourceManifest) {
  const textureFiles = await Promise.all(textureNamesFor(creature).map((file) => fileFingerprint(resolve(generatedDir, file))));
  const sourceFile = sourceManifest?.source ? await fileFingerprint(resolve(sourceManifest.source)) : null;
  const sourceManifestFile = sourceManifest?._file ? await fileFingerprint(resolve(generatedDir, sourceManifest._file)) : null;
  return createHash('sha256').update(stableJson({
    tool,
    creature,
    sourceManifest,
    sourceFile,
    sourceManifestFile,
    textureFiles,
  })).digest('hex');
}

async function loadSourceManifests() {
  const manifests = new Map();
  let files = [];
  try {
    files = await readdir(generatedDir);
  } catch {
    return manifests;
  }
  for (const file of files.filter((candidate) => candidate.endsWith('.articulated.json'))) {
    const path = resolve(generatedDir, file);
    const data = await readJson(path);
    if (data?.runtimeCreatureId) manifests.set(data.runtimeCreatureId, { ...data, _file: file });
  }
  return manifests;
}

async function loadSandboxResults() {
  const results = [];
  let entries = [];
  try {
    entries = await readdir(sandboxReportDir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (
      !/^sandbox.*report.*\.json$/.test(entry.name)
      && !/^sandbox-visuals.*report.*\.json$/.test(entry.name)
      && !/^[a-z0-9_-]+-visuals-report\.json$/.test(entry.name)
    ) continue;
    const path = resolve(sandboxReportDir, entry.name);
    const report = await readJson(path);
    if (report?.schema !== 'water9/sandbox-visual-check@1') continue;
    const info = await stat(path).catch(() => null);
    for (const result of report.results ?? []) results.push({ ...result, reportPath: path, reportMtimeMs: info?.mtimeMs ?? 0 });
  }
  return results;
}

function sourceApproved(candidate) {
  return sourceApprovedStrict(candidate);
}

function acceptedThreat(creature) {
  return rigAcceptedStrict(creature);
}

function qualityRecordsAgree(runtimeQuality, reviewQuality) {
  if (!runtimeQuality || !reviewQuality) return false;
  for (const key of ['status', 'sourceCohesion', 'backgroundKey', 'reviewedBy', 'reviewedAt', 'acceptanceNote', 'sourceCandidateId']) {
    if (String(runtimeQuality[key] ?? '') !== String(reviewQuality[key] ?? '')) return false;
  }
  return REQUIRED_THREAT_CHECKS.every((check) => runtimeQuality.visualChecklist?.[check] === reviewQuality.visualChecklist?.[check])
    && REQUIRED_THREAT_CHECKS.every((check) => String(runtimeQuality.visualScores?.[check] ?? '') === String(reviewQuality.visualScores?.[check] ?? ''))
    && REQUIRED_THREAT_CHECKS.every((check) => String(runtimeQuality.visualNotes?.[check] ?? '') === String(reviewQuality.visualNotes?.[check] ?? ''))
    && REQUIRED_THREAT_EVIDENCE.every((check) => runtimeQuality.reviewEvidence?.[check] === reviewQuality.reviewEvidence?.[check]);
}

function sandboxFramingOk(framing) {
  return Boolean(framing?.bbox)
    && Number(framing.widthRatio) <= 0.92
    && Number(framing.heightRatio) <= 0.84
    && Number(framing.areaRatio) <= 0.68;
}

function sourcePreviewOk(result) {
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

function sourceApprovalCommand(candidate) {
  return [
    `npm run source:accept -- --id ${candidate.id} --status approved --reviewed-by <human-reviewer> \\`,
    `  --note '<specific source approval note>' \\`,
    `  ${REQUIRED_SOURCE_CHECKS.map((check) => `--visual-check ${check}`).join(' ')} \\`,
    `  ${REQUIRED_SOURCE_CHECKS.map((check) => `--score ${check}=<4-5>`).join(' ')} \\`,
    `  ${REQUIRED_SOURCE_CHECKS.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')} \\`,
    '  --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run',
  ].join('\n');
}

function threatAcceptanceCommand(creature, sourceCandidateId) {
  return [
    `npm run content:accept -- --id ${creature.id} --status accepted --reviewed-by <human-reviewer> \\`,
    `  --source-candidate ${sourceCandidateId ?? '<approved-source-candidate-id>'} \\`,
    `  --note '<specific rig approval note>' \\`,
    `  ${REQUIRED_THREAT_CHECKS.map((check) => `--visual-check ${check}`).join(' ')} \\`,
    `  ${REQUIRED_THREAT_CHECKS.map((check) => `--score ${check}=<4-5>`).join(' ')} \\`,
    `  ${REQUIRED_THREAT_CHECKS.map((check) => `--visual-note ${check}='<specific rationale>'`).join(' ')} \\`,
    '  --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run',
  ].join('\n');
}

function sourceEvidenceClassification(source) {
  if (!source.exists) return 'missing-source-candidate';
  if (!source.mechanicalReady) return 'mechanical-source-evidence-incomplete';
  if (!source.approved) return 'source-preview-only-human-review-required';
  return 'human-approved-source';
}

function threatEvidenceClassification(threat) {
  if (!threat.exists) return 'missing-articulated-threat';
  if (!threat.mechanicalReady) return 'mechanical-threat-evidence-incomplete';
  if (!threat.accepted) return 'prototype-preview-only-human-acceptance-required';
  return 'accepted-gate-counted-threat';
}

function reviewDisclosure(report) {
  const countsTowardGate = report.source.approved === true && report.threat.accepted === true;
  if (countsTowardGate) {
    return {
      countsTowardGate,
      sourceClassification: sourceEvidenceClassification(report.source),
      threatClassification: threatEvidenceClassification(report.threat),
      label: 'Accepted Threat',
      warning: 'This content can count toward the 20-threat gate after aggregate verification.',
    };
  }
  return {
    countsTowardGate,
    sourceClassification: sourceEvidenceClassification(report.source),
    threatClassification: threatEvidenceClassification(report.threat),
    label: 'Not Accepted',
    warning: 'Preview-only or incomplete evidence. Do not treat screenshots, sandbox motion, or prototype rigs as production-quality accepted content.',
  };
}

function publicHref(path) {
  if (!path) return null;
  const value = String(path);
  if (value.startsWith('/')) return value;
  if (value.startsWith('public/')) return `/${value.slice('public/'.length)}`;
  return value;
}

function articulatedReviewHref(path) {
  if (!path) return null;
  const value = String(path);
  if (value.startsWith('/')) return value;
  if (value.startsWith('public/')) return publicHref(value);
  return `/review/articulated/${value}`;
}

function sourceReviewLinks(candidate, approvalItem) {
  if (!candidate) return {};
  const links = approvalItem?.links ?? {};
  return {
    approvalRunway: '/review/source-approval-runway.html',
    approvalChecklist: '/review/source-approval-checklist.json',
    visualBoard: '/review/source-visual-board.html',
    reviewDossier: '/review/source-candidates/source-review-dossier.html',
    reviewQueue: '/review/source-candidates/quick-reviews/index.html',
    quickReview: links.quickReview ?? `/review/source-candidates/quick-reviews/${candidate.id}.html`,
    source: links.source ?? publicHref(candidate.source),
    thumbnail: links.thumbnail ?? `/review/source-candidates/thumbs/${candidate.id}-source-thumb.png`,
    keyPreview: links.keyPreview ?? `/review/source-candidates/key-previews/${candidate.id}-key-preview.png`,
    sandboxScreenshot: links.sandboxScreenshot ?? `/review/source-candidates/quick-reviews/${candidate.id}-source-preview.png`,
    planPreview: links.planPreview ?? `/review/articulated/${candidate.id}-plan-preview.png`,
    reviewPacket: links.reviewPacket ?? `public/review/source-candidates/source-review-packets/${candidate.id}.md`,
    artContract: approvalItem?.contract?.contractMarkdown ?? `public/review/source-candidates/art-contracts/${candidate.id}.md`,
  };
}

function threatReviewLinks(creature, reviewItem, sandboxResult) {
  if (!creature) return {};
  return {
    reviewGallery: '/review/articulated/index.html',
    sandboxPreview: `/?sandbox=${encodeURIComponent(creature.id)}&with=diver`,
    source: reviewItem?.sourceUrl ?? null,
    sourceThumb: articulatedReviewHref(reviewItem?.sourceThumbFile),
    planPreview: articulatedReviewHref(reviewItem?.planPreviewFile),
    contactSheet: articulatedReviewHref(reviewItem?.contactFile),
    phaseStrip: articulatedReviewHref(reviewItem?.phaseFile),
    sourceParity: articulatedReviewHref(reviewItem?.sourceParityDebugFile),
    sourceParityThumb: articulatedReviewHref(reviewItem?.sourceParityThumbFile),
    pairedSandboxReport: sandboxResult?.reportPath ?? null,
    pairedSandboxScreenshot: sandboxResult?.screenshotPath ?? sandboxResult?.states?.[0]?.screenshotPath ?? null,
  };
}

async function auditSource(candidate, sourceReviewItem, sourcePreviewResult, sourceApprovalItem) {
  const blockers = [];
  const warnings = [];
  const sourcePath = candidate?.source ? resolve(candidate.source) : null;
  if (!candidate) blockers.push('source candidate is missing');
  if (candidate && !candidate.source) blockers.push('source candidate has no whole-source image');
  if (sourcePath && !(await fileOk(sourcePath, 512))) blockers.push(`whole-source image is missing or too small: ${candidate.source}`);
  if (candidate && candidate.sourceCohesion !== 'single-source') blockers.push('sourceCohesion is not single-source');
  if (candidate && candidate.backgroundKey !== 'magenta') blockers.push('backgroundKey is not magenta');
  if (!sourceReviewItem) blockers.push('source gallery review item is missing; run npm run source:gallery');
  if (candidate && sourceReviewItem) {
    const expected = await sourceCandidateFingerprint(candidate);
    if (sourceReviewItem.inputFingerprint !== expected) blockers.push('source gallery review item has stale inputFingerprint; run npm run source:gallery');
    if (sourceReviewItem.source !== candidate.source) blockers.push('source gallery review item source path does not match candidate source');
    if (!sourceReviewItem.sourceThumbFile || !(await fileOk(resolve('public/review/source-candidates', sourceReviewItem.sourceThumbFile), 512))) blockers.push('source thumbnail is missing or too small');
    if (!sourceReviewItem.keyPreviewFile || !(await fileOk(resolve('public/review/source-candidates', sourceReviewItem.keyPreviewFile), 1024))) blockers.push('source chroma-key preview is missing or too small');
  }
  if (candidate && !sourcePreviewResult) {
    blockers.push('source sandbox preview evidence is missing; run npm run source:preview-check');
  } else if (candidate && !sourcePreviewOk(sourcePreviewResult)) {
    blockers.push('source sandbox preview evidence is failed, blank, or stale; run npm run source:preview-check');
  } else if (candidate && sourcePreviewResult?.screenshotPath && !(await fileOk(resolve(sourcePreviewResult.screenshotPath), 1024))) {
    blockers.push('source sandbox preview screenshot is missing or too small');
  }
  if (candidate && !sourceApproved(candidate)) warnings.push('human source approval has not been recorded');
  return {
    exists: Boolean(candidate),
    id: candidate?.id ?? null,
    species: candidate?.species ?? null,
    status: candidate?.status ?? null,
    hasSource: Boolean(candidate?.source),
    approved: sourceApproved(candidate),
    mechanicalReady: blockers.length === 0,
    blockers,
    warnings,
    sourcePreviewReport: sourcePreviewResult?.reportPath ?? null,
    reviewLinks: sourceReviewLinks(candidate, sourceApprovalItem),
    approvalCommandDryRun: candidate ? sourceApprovalCommand(candidate) : null,
  };
}

async function auditThreat(creature, sourceManifest, sourceCandidate, reviewItem, sandboxResult) {
  const blockers = [];
  const warnings = [];
  if (!creature) blockers.push('articulated runtime creature is missing');
  if (!sourceManifest) blockers.push('articulated source manifest is missing');
  if (!reviewItem) blockers.push('articulated review item is missing; run npm run review:articulated:quick');
  if (creature && sourceManifest && reviewItem) {
    const expectedReview = await creatureFingerprint('water9-review-gallery@2', creature, sourceManifest);
    if (reviewItem.inputFingerprint !== expectedReview) blockers.push('articulated review inputFingerprint is stale; run npm run review:articulated:quick');
    if ((reviewItem.sourceParity?.failures ?? []).length) blockers.push(`source parity failures: ${reviewItem.sourceParity.failures.join('; ')}`);
  }
  if (!sandboxResult) blockers.push('paired diver sandbox visual result is missing; run npm run sandbox:visual -- --ids <id> --states idle,lunge,stunned --with diver');
  if (creature && sourceManifest && sandboxResult) {
    if (sandboxResult.companion !== 'diver') blockers.push('sandbox visual result was not captured with diver companion');
    const expectedSandbox = await creatureFingerprint('water9-sandbox-visual@2', creature, sourceManifest);
    if (sandboxResult.assetFingerprint !== expectedSandbox) blockers.push('sandbox assetFingerprint is stale; run npm run sandbox:visual -- --ids <id> --states idle,lunge,stunned --with diver');
    if ((sandboxResult.failures ?? []).length) blockers.push(`sandbox report failures: ${sandboxResult.failures.join('; ')}`);
    const statesByName = new Map((sandboxResult.states ?? []).map((state) => [state.state, state]));
    for (const stateName of REQUIRED_SANDBOX_STATES) {
      const state = statesByName.get(stateName);
      if (!state) {
        blockers.push(`sandbox ${stateName} state is missing`);
        continue;
      }
      if ((state.failures ?? []).length) blockers.push(`sandbox ${stateName} failures: ${state.failures.join('; ')}`);
      if (!sandboxFramingOk(state.framing)) blockers.push(`sandbox ${stateName} framing is not reviewable`);
    }
  }
  if (!sourceCandidate) blockers.push('linked source candidate is missing');
  else if (!sourceApproved(sourceCandidate)) blockers.push('linked source candidate is not human-approved');
  if (creature?.quality?.status === 'accepted') {
    for (const check of REQUIRED_THREAT_CHECKS) {
      const score = creature.quality?.visualScores?.[check];
      if (!Number.isFinite(score) || score < MIN_VISUAL_SCORE || score > 5) {
        blockers.push(`accepted visual score ${check} is missing or below ${MIN_VISUAL_SCORE}`);
      }
      if (!meaningfulReviewText(creature.quality?.visualNotes?.[check], MIN_VISUAL_NOTE_LENGTH)) {
        blockers.push(`accepted visual note ${check} is missing or too vague`);
      }
    }
  }
  if (creature && !acceptedThreat(creature)) warnings.push(`quality.status is ${creature.quality?.status ?? 'missing'}, not accepted`);
  if (creature && reviewItem?.quality && !qualityRecordsAgree(creature.quality, reviewItem.quality)) blockers.push('runtime/review quality metadata mismatch');
  return {
    exists: Boolean(creature),
    id: creature?.id ?? null,
    species: creature?.species ?? null,
    qualityStatus: creature?.quality?.status ?? null,
    accepted: acceptedThreat(creature) && blockers.length === 0,
    mechanicalReady: blockers.filter((blocker) => blocker !== 'linked source candidate is not human-approved').length === 0,
    blockers,
    warnings,
    sandboxReport: sandboxResult?.reportPath ?? null,
    reviewLinks: threatReviewLinks(creature, reviewItem, sandboxResult),
    sandboxFraming: Object.fromEntries((sandboxResult?.states ?? []).map((state) => [state.state, state.framing ?? null])),
    acceptanceCommandDryRun: creature ? threatAcceptanceCommand(creature, creature.quality?.sourceCandidateId ?? sourceManifest?.sourceCandidateId) : null,
  };
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None.';
}

function markdownLinks(links) {
  const entries = Object.entries(links ?? {}).filter((entry) => entry[1]);
  return entries.length ? entries.map(([key, value]) => `- ${key}: \`${value}\``).join('\n') : '- None.';
}

function markdownFor(report) {
  return `${[
    `# Content Acceptance Audit: ${report.id}`,
    '',
    `Generated: \`${report.generatedAt}\``,
    `Overall stage: \`${report.stage}\``,
    `Gate disclosure: \`${report.reviewDisclosure.label}\`; counts toward 20-threat gate: \`${report.reviewDisclosure.countsTowardGate}\``,
    '',
    report.reviewDisclosure.warning,
    '',
    `Source classification: \`${report.reviewDisclosure.sourceClassification}\``,
    `Threat classification: \`${report.reviewDisclosure.threatClassification}\``,
    '',
    '## Source Candidate',
    '',
    `Status: \`${report.source.status ?? 'missing'}\`; mechanical ready: \`${report.source.mechanicalReady}\`; approved: \`${report.source.approved}\``,
    `Source preview report: \`${report.source.sourcePreviewReport ?? 'missing'}\``,
    '',
    'Review links:',
    markdownLinks(report.source.reviewLinks),
    '',
    'Blockers:',
    markdownList(report.source.blockers),
    '',
    'Warnings:',
    markdownList(report.source.warnings),
    '',
    'Source approval dry-run command:',
    '```bash',
    report.source.approvalCommandDryRun ?? '# no source candidate',
    '```',
    '',
    '## Articulated Threat',
    '',
    `Quality: \`${report.threat.qualityStatus ?? 'missing'}\`; mechanical ready: \`${report.threat.mechanicalReady}\`; accepted: \`${report.threat.accepted}\``,
    '',
    'Review links:',
    markdownLinks(report.threat.reviewLinks),
    '',
    'Blockers:',
    markdownList(report.threat.blockers),
    '',
    'Warnings:',
    markdownList(report.threat.warnings),
    '',
    'Sandbox framing:',
    '```json',
    JSON.stringify(report.threat.sandboxFraming, null, 2),
    '```',
    '',
    'Threat acceptance dry-run command:',
    '```bash',
    report.threat.acceptanceCommandDryRun ?? '# no articulated creature',
    '```',
    '',
    '## Next Action',
    '',
    report.nextAction,
    '',
  ].join('\n')}\n`;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function htmlList(items) {
  return `<ul>${items.length ? items.map((item) => `<li>${htmlEscape(item)}</li>`).join('') : '<li>None.</li>'}</ul>`;
}

function htmlLinks(links) {
  const entries = Object.entries(links ?? {}).filter((entry) => entry[1]);
  return `<ul>${entries.length ? entries.map(([key, value]) => `<li>${htmlEscape(key)}: <code>${htmlEscape(value)}</code></li>`).join('') : '<li>None.</li>'}</ul>`;
}

function commandBlock(command) {
  return `<pre><code>${htmlEscape(command ?? '# no command available')}</code></pre>`;
}

function renderHtml(report) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Acceptance Audit: ${htmlEscape(report.id)}</title>
  <style>
    :root { color-scheme: dark; --bg:#061114; --panel:#0d1e24; --line:#294751; --text:#e7f7f8; --muted:#9eb7bd; --accent:#83e8ff; --warn:#f0c66e; --danger:#ff8a7a; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1280px; margin:0 auto; padding:26px 18px 52px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); }
    h2 { margin:0 0 10px; font-size:18px; }
    p, li, dt { color:var(--muted); }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { margin:0; padding:12px; border:1px solid var(--line); border-radius:6px; background:#050b0d; color:var(--text); overflow:auto; white-space:pre-wrap; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:14px; margin:18px 0; }
    .panel { border:1px solid var(--line); border-radius:7px; background:var(--panel); padding:15px; }
    .status { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .status span { border:1px solid var(--line); border-radius:5px; padding:7px 9px; color:var(--muted); background:#09171b; }
    .status strong { color:var(--text); margin-left:4px; }
    .next { border-color:#6a5230; background:#1d1710; }
    .disclosure { border-color:${report.reviewDisclosure.countsTowardGate ? '#2f7357' : '#7a413a'}; background:${report.reviewDisclosure.countsTowardGate ? '#0d261d' : '#26120f'}; }
    .disclosure h2 { color:${report.reviewDisclosure.countsTowardGate ? '#9dffd4' : '#ffc4bd'}; }
    .blockers { border-color:#6e3a35; }
    .blockers h2 { color:#ffc4bd; }
    dl { display:grid; grid-template-columns:150px 1fr; gap:7px 10px; margin:0; }
    dd { margin:0; overflow-wrap:anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Acceptance Audit</h1>
    <p><code>${htmlEscape(report.id)}</code> evidence audit for the strict 20-threat gate. This report does not approve content.</p>
    <div class="status">
      <span>stage <strong>${htmlEscape(report.stage)}</strong></span>
      <span>gate <strong>${htmlEscape(report.reviewDisclosure.label)}</strong></span>
      <span>counts toward gate <strong>${htmlEscape(String(report.reviewDisclosure.countsTowardGate))}</strong></span>
      <span>source ready <strong>${htmlEscape(String(report.source.mechanicalReady))}</strong></span>
      <span>source approved <strong>${htmlEscape(String(report.source.approved))}</strong></span>
      <span>threat ready <strong>${htmlEscape(String(report.threat.mechanicalReady))}</strong></span>
      <span>threat accepted <strong>${htmlEscape(String(report.threat.accepted))}</strong></span>
    </div>
    <section class="panel disclosure">
      <h2>Gate Disclosure</h2>
      <p>${htmlEscape(report.reviewDisclosure.warning)}</p>
      <dl>
        <dt>source</dt><dd><code>${htmlEscape(report.reviewDisclosure.sourceClassification)}</code></dd>
        <dt>threat</dt><dd><code>${htmlEscape(report.reviewDisclosure.threatClassification)}</code></dd>
      </dl>
    </section>
    <section class="panel next">
      <h2>Next Action</h2>
      <p>${htmlEscape(report.nextAction)}</p>
    </section>
    <section class="grid">
      <article class="panel">
        <h2>Source Candidate</h2>
        <dl>
          <dt>status</dt><dd><code>${htmlEscape(report.source.status ?? 'missing')}</code></dd>
          <dt>species</dt><dd>${htmlEscape(report.source.species ?? 'missing')}</dd>
          <dt>preview report</dt><dd><code>${htmlEscape(report.source.sourcePreviewReport ?? 'missing')}</code></dd>
        </dl>
        <h2>Source Review Links</h2>
        ${htmlLinks(report.source.reviewLinks)}
      </article>
      <article class="panel">
        <h2>Articulated Threat</h2>
        <dl>
          <dt>quality</dt><dd><code>${htmlEscape(report.threat.qualityStatus ?? 'missing')}</code></dd>
          <dt>species</dt><dd>${htmlEscape(report.threat.species ?? 'missing')}</dd>
          <dt>sandbox report</dt><dd><code>${htmlEscape(report.threat.sandboxReport ?? 'missing')}</code></dd>
        </dl>
        <h2>Threat Review Links</h2>
        ${htmlLinks(report.threat.reviewLinks)}
      </article>
    </section>
    <section class="grid">
      <article class="panel blockers">
        <h2>Source Blockers</h2>
        ${htmlList(report.source.blockers)}
        <h2>Source Warnings</h2>
        ${htmlList(report.source.warnings)}
      </article>
      <article class="panel blockers">
        <h2>Threat Blockers</h2>
        ${htmlList(report.threat.blockers)}
        <h2>Threat Warnings</h2>
        ${htmlList(report.threat.warnings)}
      </article>
    </section>
    <section class="grid">
      <article class="panel">
        <h2>Source Approval Dry Run</h2>
        ${commandBlock(report.source.approvalCommandDryRun)}
      </article>
      <article class="panel">
        <h2>Threat Acceptance Dry Run</h2>
        ${commandBlock(report.threat.acceptanceCommandDryRun)}
      </article>
    </section>
    <section class="panel">
      <h2>Sandbox Framing</h2>
      ${commandBlock(JSON.stringify(report.threat.sandboxFraming, null, 2))}
    </section>
  </main>
</body>
</html>
`;
}

const sourceCandidates = await readJson('public/review/source-candidates/source-candidates.json', { candidates: [] });
const sourceReview = await readJson('public/review/source-candidates/review-manifest.json', { candidates: [] });
const sourceApprovalRunway = await readJson('public/review/source-approval-runway.json', { items: [] });
const runtime = await readJson('public/assets/generated/articulated-creatures.parts.json', { creatures: [] });
const articulatedReview = await readJson('public/review/articulated/review-manifest.json', { creatures: [] });
const sourceManifests = await loadSourceManifests();
const sandboxResults = await loadSandboxResults();
const candidates = sourceCandidates.candidates ?? [];
const creatures = runtime.creatures ?? [];
const sourceReviewById = new Map((sourceReview.candidates ?? []).map((item) => [item.id, item]));
const sourceApprovalById = new Map((sourceApprovalRunway.items ?? []).map((item) => [item.id, item]));
const threatReviewById = new Map((articulatedReview.creatures ?? []).map((item) => [item.id, item]));
const latestSandboxById = new Map();
for (const result of sandboxResults) {
  if (result.kind === 'articulated' && result.companion !== 'diver') continue;
  const current = latestSandboxById.get(result.id);
  if (!current || result.reportMtimeMs > current.reportMtimeMs) latestSandboxById.set(result.id, result);
}

const candidate = candidates.find((item) => item.id === id) ?? candidates.find((item) => item.riggedCreatureId === id);
const creature = creatures.find((item) => item.id === id) ?? creatures.find((item) => item.quality?.sourceCandidateId === id);
const auditId = id || candidate?.id || creature?.id;
if (!auditId) {
  console.error('Usage: npm run content:acceptance-audit -- --id <candidate-or-creature-id>');
  process.exit(1);
}

const linkedCandidate = candidate ?? candidates.find((item) => item.id === creature?.quality?.sourceCandidateId);
const linkedCreature = creature ?? creatures.find((item) => item.quality?.sourceCandidateId === linkedCandidate?.id);
const source = await auditSource(
  linkedCandidate,
  sourceReviewById.get(linkedCandidate?.id),
  linkedCandidate ? latestSandboxById.get(`source-${linkedCandidate.id}`) : null,
  sourceApprovalById.get(linkedCandidate?.id),
);
const threat = await auditThreat(
  linkedCreature,
  linkedCreature ? sourceManifests.get(linkedCreature.id) : null,
  linkedCandidate,
  linkedCreature ? threatReviewById.get(linkedCreature.id) : null,
  linkedCreature ? latestSandboxById.get(linkedCreature.id) : null,
);

let stage = 'missing-content';
let nextAction = 'Create or import the source candidate before auditing acceptance.';
if (source.exists && !source.mechanicalReady) {
  stage = 'source-evidence-needed';
  nextAction = 'Refresh source gallery/checks until source mechanical blockers are gone.';
} else if (source.exists && !source.approved) {
  stage = 'human-source-review-needed';
  nextAction = 'A human reviewer must inspect the source gallery and run the source approval dry-run command without --dry-run when satisfied.';
} else if (!threat.exists) {
  stage = 'rigging-needed';
  nextAction = 'Prepare and extract the articulated rig from the approved source candidate.';
} else if (!threat.mechanicalReady) {
  stage = 'threat-evidence-needed';
  nextAction = 'Refresh articulated review and sandbox visual evidence until mechanical blockers are gone.';
} else if (!threat.accepted) {
  stage = 'human-threat-review-needed';
  nextAction = 'A human reviewer must inspect source, contact sheet, phase strip, and sandbox behavior before running the threat acceptance dry-run command without --dry-run.';
} else {
  stage = 'accepted';
  nextAction = 'This threat appears accepted; run npm run content:gate for aggregate verification.';
}

const report = {
  schema: 'water9/content-acceptance-audit@1',
  generatedAt: new Date().toISOString(),
  id: auditId,
  stage,
  source,
  threat,
  nextAction,
};
report.reviewDisclosure = reviewDisclosure(report);

await mkdir(dirname(jsonOut), { recursive: true });
await mkdir(dirname(markdownOut), { recursive: true });
await mkdir(dirname(htmlOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownOut, markdownFor(report));
await writeFile(htmlOut, renderHtml(report));
console.log(JSON.stringify({
  id: auditId,
  stage,
  jsonOut,
  markdownOut,
  htmlOut,
  sourceBlockers: source.blockers.length,
  threatBlockers: threat.blockers.length,
  sourceWarnings: source.warnings.length,
  threatWarnings: threat.warnings.length,
}, null, 2));
