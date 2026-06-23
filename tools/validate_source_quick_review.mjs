import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const id = String(args.get('id') ?? args.get('candidate') ?? '').trim();
const all = args.has('all');
const outDir = resolve(String(args.get('out-dir') ?? args.get('outDir') ?? 'public/review/source-candidates/quick-reviews'));
const fileBase = id || 'brine-crown';
const paths = {
  json: resolve(String(args.get('json') ?? `${outDir}/${all ? 'index' : fileBase}.json`)),
  markdown: resolve(String(args.get('markdown') ?? `${outDir}/${all ? 'index' : fileBase}.md`)),
  html: resolve(String(args.get('html') ?? `${outDir}/${all ? 'index' : fileBase}.html`)),
  dossier: resolve(String(args.get('dossier') ?? 'public/review/source-candidates/source-review-dossier.json')),
};
const failures = [];

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

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readText(label, path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${label}: could not read file: ${error.message}`);
    return '';
  }
}

async function fileOk(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function textIncludesHtml(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

const report = await readJson('source quick review', paths.json);
const dossier = await readJson('source review dossier', paths.dossier);
const markdown = await readText('source quick review markdown', paths.markdown);
const html = await readText('source quick review html', paths.html);
await fileOk('source quick review markdown', paths.markdown, 1024);
await fileOk('source quick review html', paths.html, 2048);

if (dossier?.schema !== 'water9/source-review-dossier@1') failures.push(`dossier schema is ${dossier?.schema ?? 'missing'}`);

async function validateSingleReview(singleReport, singleMarkdownPath, singleHtmlPath, singleMarkdown, singleHtml) {
  if (singleReport?.schema !== 'water9/source-quick-review@1') failures.push(`${singleMarkdownPath}: report schema is ${singleReport?.schema ?? 'missing'}`);
  if (id && singleReport?.id !== id) failures.push(`report id ${singleReport?.id ?? 'missing'} does not match ${id}`);

  const dossierItem = (dossier?.items ?? []).find((item) => item.id === singleReport?.id);
  if (!dossierItem) {
    failures.push(`${singleReport?.id ?? 'unknown'}: quick review target is missing from source review dossier`);
  } else {
    if (singleReport.item?.source !== dossierItem.source) failures.push(`${singleReport.id}: source mismatch with dossier`);
    if (singleReport.item?.acceptCommand !== dossierItem.acceptCommand) failures.push(`${singleReport.id}: accept command mismatch with dossier`);
    if (singleReport.item?.rejectCommand !== dossierItem.rejectCommand) failures.push(`${singleReport.id}: reject command mismatch with dossier`);
  }

  if (!singleReport?.item?.hasSource) failures.push(`${singleReport?.id ?? 'unknown'}: quick review target must have a source image`);
  if (!singleReport?.links?.source) failures.push(`${singleReport?.id ?? 'unknown'}: quick review must expose source image link`);
  if (!singleReport?.links?.thumbnail) failures.push(`${singleReport?.id ?? 'unknown'}: quick review must expose source thumbnail link`);
  if (!singleReport?.links?.keyPreview) failures.push(`${singleReport?.id ?? 'unknown'}: quick review must expose key preview link`);
  if (!singleReport?.links?.sandboxScreenshot) failures.push(`${singleReport?.id ?? 'unknown'}: quick review must expose copied sandbox screenshot link`);
  if (!singleReport?.links?.planPreview) failures.push(`${singleReport?.id ?? 'unknown'}: quick review must expose articulation plan preview link`);
  if (singleReport?.copiedArtifacts?.sandboxScreenshot) await fileOk(`${singleReport.id} copied sandbox screenshot`, resolve(singleReport.copiedArtifacts.sandboxScreenshot), 512);

  const expectedReady = Boolean(!singleReport?.item?.approved && singleReport?.item?.evidence?.imageValidationPassed && singleReport?.item?.evidence?.sourcePreviewPassed && singleReport?.links?.planPreview);
  if (singleReport?.readyForHumanReview !== expectedReady) failures.push(`${singleReport?.id ?? 'unknown'}: readyForHumanReview does not match evidence`);

  for (const required of [
    'Source Quick Review',
    'Approval Checklist',
    'Candidate Contract Checks',
    'Reject Risks',
    'plan preview',
    'npm run source:accept',
    'npm run sandbox:preview',
  ]) {
    if (!singleMarkdown.includes(required)) failures.push(`${singleReport?.id ?? 'unknown'}: markdown missing ${required}`);
    if (!textIncludesHtml(singleHtml, required)) failures.push(`${singleReport?.id ?? 'unknown'}: html missing ${required}`);
  }
  for (const required of [
    'Human Review Command Builder',
    'data-review-command-builder',
    'data-build-command',
    'data-copy-command',
    'data-command-output',
    'source approval still requires a human to run it',
    'articulation plan preview',
    'source visual board',
    'npm run source:accept --',
    '--source-reviewed',
    '--source-visual-board',
  ]) {
    if (!textIncludesHtml(singleHtml, required)) failures.push(`${singleReport?.id ?? 'unknown'}: html missing review command builder ${required}`);
  }

  const checklist = Array.isArray(singleReport?.checklist) ? singleReport.checklist : [];
  if (checklist.length !== REQUIRED_VISUAL_CHECKS.length) failures.push(`${singleReport?.id ?? 'unknown'}: checklist length ${checklist.length} does not match required ${REQUIRED_VISUAL_CHECKS.length}`);
  for (const check of REQUIRED_VISUAL_CHECKS) {
    const row = checklist.find((item) => item.check === check);
    if (!row) {
      failures.push(`${singleReport?.id ?? 'unknown'}: missing checklist row ${check}`);
      continue;
    }
    if (row.requiredVisualCheck !== true) failures.push(`${singleReport.id}: ${check}: visual-check flag missing from quick review`);
    if (row.requiredScore !== true) failures.push(`${singleReport.id}: ${check}: score flag missing from quick review`);
    if (row.requiredVisualNote !== true) failures.push(`${singleReport.id}: ${check}: visual-note flag missing from quick review`);
    if (!singleMarkdown.includes(check)) failures.push(`${singleReport.id}: markdown missing checklist item ${check}`);
    if (!textIncludesHtml(singleHtml, check)) failures.push(`${singleReport.id}: html missing checklist item ${check}`);
  }

  for (const command of [
    singleReport?.commands?.sourcePreview,
    singleReport?.commands?.accept,
    singleReport?.commands?.reject,
  ]) {
    if (!command) {
      failures.push(`${singleReport?.id ?? 'unknown'}: quick review command missing`);
      continue;
    }
    if (!singleMarkdown.includes(command)) failures.push(`${singleReport.id}: markdown missing command ${command}`);
    if (!textIncludesHtml(singleHtml, command)) failures.push(`${singleReport.id}: html missing command ${command}`);
  }
  const rejectCommand = String(singleReport?.commands?.reject ?? '');
  for (const required of ['--source-rejected', '--source-visual-board public/review/source-visual-board.json', '--failed-check ', '--visual-note ']) {
    if (!rejectCommand.includes(required)) failures.push(`${singleReport?.id ?? 'unknown'}: reject command missing ${required}`);
    if (!textIncludesHtml(singleHtml, required)) failures.push(`${singleReport?.id ?? 'unknown'}: html missing rejection evidence marker ${required}`);
  }
}

if (all) {
  if (report?.schema !== 'water9/source-quick-review-index@1') failures.push(`index schema is ${report?.schema ?? 'missing'}`);
  const readyIds = (dossier?.readyReviewQueue ?? []).map((item) => item.id);
  const reviews = Array.isArray(report?.reviews) ? report.reviews : [];
  if (reviews.length !== readyIds.length) failures.push(`index review count ${reviews.length} does not match ready queue ${readyIds.length}`);
  if (report?.summary?.reviews !== reviews.length) failures.push('index summary reviews mismatch');
  if (report?.summary?.readyForHumanReview !== reviews.filter((item) => item.readyForHumanReview).length) failures.push('index summary readyForHumanReview mismatch');
  for (const [index, review] of reviews.entries()) {
    if (review.rank !== index + 1) failures.push(`${review.id}: index rank mismatch`);
    if (!readyIds.includes(review.id)) failures.push(`${review.id}: index review not present in ready review queue`);
    for (const required of [review.id, review.html, review.acceptCommand]) {
      if (required && !markdown.includes(required)) failures.push(`index markdown missing ${required}`);
      if (required && !textIncludesHtml(html, required)) failures.push(`index html missing ${required}`);
    }
    for (const field of ['source', 'links', 'evidence', 'metrics', 'blockers']) {
      if (!(field in review)) failures.push(`${review.id}: index review missing ${field}`);
    }
    for (const required of ['--source-rejected', '--source-visual-board public/review/source-visual-board.json', '--failed-check ', '--visual-note ']) {
      if (!String(review.rejectCommand ?? '').includes(required)) failures.push(`${review.id}: index reject command missing ${required}`);
    }
    if (!review.links?.source) failures.push(`${review.id}: index review missing source link`);
    if (!review.links?.keyPreview) failures.push(`${review.id}: index review missing key preview link`);
    if (!review.links?.sandboxScreenshot) failures.push(`${review.id}: index review missing sandbox screenshot link`);
    if (!review.links?.planPreview) failures.push(`${review.id}: index review missing plan preview link`);
    if (review.evidence?.imageValidationPassed !== true) failures.push(`${review.id}: index review image validation evidence is not passing`);
    if (review.evidence?.sourcePreviewPassed !== true) failures.push(`${review.id}: index review source preview evidence is not passing`);
    for (const expected of [
      review.links?.source,
      review.links?.keyPreview,
      review.links?.sandboxScreenshot,
      review.links?.planPreview,
      'Open Review',
      'Accept command',
      'Reject command',
      'image pass',
      'preview pass',
      'plan',
    ]) {
      if (expected && !textIncludesHtml(html, expected)) failures.push(`index html missing visual queue evidence ${expected}`);
    }
    const reviewJson = resolve(review.json);
    const reviewMarkdownPath = resolve(review.markdown);
    const reviewHtmlPath = resolve(review.html);
    await fileOk(`${review.id} quick review json`, reviewJson, 1024);
    await fileOk(`${review.id} quick review markdown`, reviewMarkdownPath, 1024);
    await fileOk(`${review.id} quick review html`, reviewHtmlPath, 2048);
    const singleReport = await readJson(`${review.id} quick review`, reviewJson);
    const singleMarkdown = await readText(`${review.id} quick review markdown`, reviewMarkdownPath);
    const singleHtml = await readText(`${review.id} quick review html`, reviewHtmlPath);
    await validateSingleReview(singleReport, reviewMarkdownPath, reviewHtmlPath, singleMarkdown, singleHtml);
  }
} else {
  await validateSingleReview(report, paths.markdown, paths.html, markdown, html);
}

const summary = {
  schema: 'water9/source-quick-review-check@1',
  mode: all ? 'all' : 'single',
  id: all ? null : report?.id ?? null,
  reviews: all ? report?.reviews?.length ?? 0 : 1,
  readyForHumanReview: all ? report?.summary?.readyForHumanReview ?? null : report?.readyForHumanReview ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
