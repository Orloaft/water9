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

const paths = {
  dossier: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-review-dossier.json')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-review-dossier.html')),
  markdown: resolve(String(args.get('md') ?? 'public/review/source-candidates/source-review-dossier.md')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  reviewManifest: resolve(String(args.get('review-manifest') ?? 'public/review/source-candidates/review-manifest.json')),
  imageReport: resolve(String(args.get('image-report') ?? 'tools/scratch/source-candidate-images-report.json')),
  previewReport: resolve(String(args.get('preview-report') ?? 'tools/scratch/source-preview-visuals-report.json')),
  packetDir: resolve(String(args.get('packet-dir') ?? 'public/review/source-candidates/source-review-packets')),
};

const failures = [];

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

function uniqueValues(values) {
  return [...new Set(values)];
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textIncludes(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const dossier = await readJson('source review dossier', paths.dossier);
const sourceCandidates = await readJson('source candidates', paths.sourceCandidates);
const reviewManifest = await readJson('source review manifest', paths.reviewManifest);
const imageReport = await readJson('source image report', paths.imageReport);
const previewReport = await readJson('source preview report', paths.previewReport);
const html = await readText('source review dossier html', paths.html);
const markdown = await readText('source review dossier markdown', paths.markdown);

await fileOk('source review dossier html', paths.html, 4096);
await fileOk('source review dossier markdown', paths.markdown, 1024);

if (dossier?.schema !== 'water9/source-review-dossier@1') failures.push(`dossier schema is ${dossier?.schema ?? 'missing'}`);
if (sourceCandidates?.schema !== 'water9/source-candidates@1') failures.push(`source candidates schema is ${sourceCandidates?.schema ?? 'missing'}`);
if (reviewManifest?.schema !== 'water9/source-candidate-review@1') failures.push(`source review manifest schema is ${reviewManifest?.schema ?? 'missing'}`);
if (imageReport?.schema !== 'water9/source-image-validation@1') failures.push(`source image report schema is ${imageReport?.schema ?? 'missing'}`);
if (previewReport?.schema !== 'water9/sandbox-visual-check@1') failures.push(`source preview report schema is ${previewReport?.schema ?? 'missing'}`);

const candidates = Array.isArray(sourceCandidates?.candidates) ? sourceCandidates.candidates : [];
const sourceCandidatesWithImages = candidates.filter((candidate) => candidate.source);
const items = Array.isArray(dossier?.items) ? dossier.items : [];
const itemById = new Map(items.map((item) => [item.id, item]));
const reviewById = new Map((reviewManifest?.candidates ?? []).map((item) => [item.id, item]));
const metricById = new Map((imageReport?.metrics ?? []).map((metric) => [metric.id, metric]));
const previewById = new Map((previewReport?.results ?? []).map((result) => [result.id, result]));

if (items.length !== candidates.length) failures.push(`dossier item count ${items.length} does not match candidate count ${candidates.length}`);
const itemIds = items.map((item) => item.id).filter(Boolean);
if (itemIds.length !== uniqueValues(itemIds).length) failures.push('dossier has duplicate item ids');

if ((dossier?.summary?.candidateCount ?? -1) !== candidates.length) failures.push('summary candidateCount mismatch');
if ((dossier?.summary?.sourceImages ?? -1) !== sourceCandidatesWithImages.length) failures.push('summary sourceImages mismatch');
if ((dossier?.summary?.missingSourceImages ?? -1) !== candidates.length - sourceCandidatesWithImages.length) failures.push('summary missingSourceImages mismatch');

const approvedCount = sourceCandidatesWithImages.filter((candidate) => reviewById.get(candidate.id)?.approved === true).length;
if ((dossier?.summary?.approvedSources ?? -1) !== approvedCount) failures.push('summary approvedSources mismatch');
if ((dossier?.summary?.pendingReview ?? -1) !== sourceCandidatesWithImages.length - approvedCount) failures.push('summary pendingReview mismatch');
const expectedReadyForHumanReview = items.filter((item) => item.hasSource && !item.approved && item.evidence?.imageValidationPassed === true && item.evidence?.sourcePreviewPassed === true).length;
const expectedReviewBlocked = items.filter((item) => item.hasSource && !item.approved && !(item.evidence?.imageValidationPassed === true && item.evidence?.sourcePreviewPassed === true)).length;
if ((dossier?.summary?.readyForHumanReview ?? -1) !== expectedReadyForHumanReview) failures.push('summary readyForHumanReview mismatch');
if ((dossier?.summary?.reviewBlocked ?? -1) !== expectedReviewBlocked) failures.push('summary reviewBlocked mismatch');
const readyItems = items.filter((item) => item.hasSource && !item.approved && item.evidence?.imageValidationPassed === true && item.evidence?.sourcePreviewPassed === true);
const readyReviewQueue = Array.isArray(dossier?.readyReviewQueue) ? dossier.readyReviewQueue : [];
if (readyReviewQueue.length !== readyItems.length) failures.push(`readyReviewQueue length ${readyReviewQueue.length} does not match ready items ${readyItems.length}`);
for (const [index, item] of readyItems.entries()) {
  const queueItem = readyReviewQueue[index];
  if (!queueItem) continue;
  if (queueItem.rank !== index + 1) failures.push(`${item.id}: readyReviewQueue rank mismatch`);
  if (queueItem.id !== item.id) failures.push(`${item.id}: readyReviewQueue order/id mismatch, got ${queueItem.id}`);
  if (queueItem.species !== item.species) failures.push(`${item.id}: readyReviewQueue species mismatch`);
  if (queueItem.status !== 'ready-for-human-review') failures.push(`${item.id}: readyReviewQueue status mismatch`);
  if (queueItem.packet !== item.reviewPacket?.file) failures.push(`${item.id}: readyReviewQueue packet mismatch`);
  if (queueItem.sourcePreviewCommand !== item.reviewPacket?.commands?.sourcePreview) failures.push(`${item.id}: readyReviewQueue sourcePreviewCommand mismatch`);
  if (queueItem.acceptCommand !== item.acceptCommand) failures.push(`${item.id}: readyReviewQueue acceptCommand mismatch`);
  if (queueItem.rejectCommand !== item.rejectCommand) failures.push(`${item.id}: readyReviewQueue rejectCommand mismatch`);
  for (const expected of [
    'Ready Review Queue',
    item.id,
    item.reviewPacket?.file,
    item.reviewPacket?.commands?.sourcePreview,
    item.acceptCommand,
  ]) {
    if (expected && !textIncludes(html, expected)) failures.push(`${item.id}: html missing ready review queue detail ${expected}`);
    if (expected && !markdown.includes(expected)) failures.push(`${item.id}: markdown missing ready review queue detail ${expected}`);
  }
}
const expectedRecommendedReview = items.find((item) => item.hasSource && !item.approved && item.evidence?.imageValidationPassed === true && item.evidence?.sourcePreviewPassed === true)
  ?? items.find((item) => item.hasSource && !item.approved)
  ?? null;
if (expectedRecommendedReview) {
  const recommended = dossier?.recommendedReview;
  if (!recommended) failures.push('dossier missing recommendedReview');
  if (recommended?.id !== expectedRecommendedReview.id) failures.push(`recommendedReview id should be ${expectedRecommendedReview.id}, got ${recommended?.id ?? 'missing'}`);
  if (recommended?.status !== (expectedRecommendedReview.evidence?.imageValidationPassed === true && expectedRecommendedReview.evidence?.sourcePreviewPassed === true ? 'ready-for-human-review' : 'blocked')) {
    failures.push(`recommendedReview status mismatch: ${recommended?.status ?? 'missing'}`);
  }
  if (recommended?.source !== expectedRecommendedReview.source) failures.push('recommendedReview source mismatch');
  if (recommended?.acceptCommand !== expectedRecommendedReview.acceptCommand) failures.push('recommendedReview acceptCommand mismatch');
  if (recommended?.rejectCommand !== expectedRecommendedReview.rejectCommand) failures.push('recommendedReview rejectCommand mismatch');
  if (recommended?.contractMarkdown !== expectedRecommendedReview.contract?.contractMarkdown) failures.push('recommendedReview contractMarkdown mismatch');
  for (const expected of [
    'Recommended Review',
    expectedRecommendedReview.id,
    expectedRecommendedReview.acceptCommand,
    expectedRecommendedReview.rejectCommand,
  ]) {
    if (!textIncludes(html, expected)) failures.push(`html is missing recommended review detail: ${expected}`);
    if (!markdown.includes(expected)) failures.push(`markdown is missing recommended review detail: ${expected}`);
  }
}

for (const candidate of candidates) {
  const item = itemById.get(candidate.id);
  if (!item) {
    failures.push(`${candidate.id}: missing from source review dossier`);
    continue;
  }
  if (item.species !== candidate.species) failures.push(`${candidate.id}: species mismatch`);
  if (Boolean(item.hasSource) !== Boolean(candidate.source)) failures.push(`${candidate.id}: hasSource mismatch`);
  if (item.source !== (candidate.source ?? null)) failures.push(`${candidate.id}: source mismatch`);
  if (!textIncludes(html, candidate.id)) failures.push(`${candidate.id}: html is missing candidate id`);

  const expectedContractMarkdown = `public/review/source-candidates/art-contracts/${safeFileName(candidate.id)}.md`;
  const expectedContractJson = `public/review/source-candidates/art-contracts/${safeFileName(candidate.id)}.json`;
  const contract = item.contract;
  if (!contract) failures.push(`${candidate.id}: missing contract snapshot`);
  if (contract?.contractMarkdown !== expectedContractMarkdown) failures.push(`${candidate.id}: contract markdown path mismatch`);
  if (contract?.contractJson !== expectedContractJson) failures.push(`${candidate.id}: contract JSON path mismatch`);
  await fileOk(`${candidate.id} source art contract markdown`, resolve(expectedContractMarkdown), 1024);
  await fileOk(`${candidate.id} source art contract JSON`, resolve(expectedContractJson), 512);
  for (const [field, minimum] of [
    ['requiredRead', 3],
    ['articulatableParts', 5],
    ['promptRisks', 3],
    ['contractReviewChecklist', 3],
  ]) {
    const expected = asArray(candidate[field]);
    const actual = asArray(contract?.[field]);
    if (actual.length < Math.max(minimum, expected.length)) {
      failures.push(`${candidate.id}: contract snapshot ${field} is incomplete`);
    }
    for (const value of expected) {
      if (!actual.includes(value)) failures.push(`${candidate.id}: contract snapshot ${field} missing ${value}`);
    }
  }

  if (!candidate.source) continue;

  const review = reviewById.get(candidate.id);
  const metric = metricById.get(candidate.id);
  const preview = previewById.get(`source-${candidate.id}`);

  if (!review) failures.push(`${candidate.id}: missing review manifest item`);
  if (item.approved !== (review?.approved === true)) failures.push(`${candidate.id}: approved mismatch`);
  if (!item.sourceThumbFile || item.sourceThumbFile !== review?.sourceThumbFile) failures.push(`${candidate.id}: source thumbnail mismatch or missing`);
  if (!item.keyPreviewFile || item.keyPreviewFile !== review?.keyPreviewFile) failures.push(`${candidate.id}: key preview mismatch or missing`);
  if (item.sourceThumbFile) await fileOk(`${candidate.id} source thumbnail`, resolve('public/review/source-candidates', item.sourceThumbFile), 512);
  if (item.keyPreviewFile) await fileOk(`${candidate.id} key preview`, resolve('public/review/source-candidates', item.keyPreviewFile), 1024);

  if (!metric) failures.push(`${candidate.id}: missing image validation metric`);
  if (metric && item.imageValidationMetric?.id !== metric.id) failures.push(`${candidate.id}: image validation metric mismatch`);
  if (metric?.checked !== true) failures.push(`${candidate.id}: image validation is not checked`);
  if ((metric?.failures ?? []).length) failures.push(`${candidate.id}: image validation failures are not surfaced as a clean review item`);
  if (item.evidence?.imageValidationPassed !== (metric?.checked === true && (metric.failures ?? []).length === 0)) {
    failures.push(`${candidate.id}: image validation evidence flag mismatch`);
  }

  if (!preview) failures.push(`${candidate.id}: missing source preview visual result`);
  if (preview && item.sourcePreview?.id !== preview.id) failures.push(`${candidate.id}: source preview id mismatch`);
  if (preview && (preview.failures ?? []).length) failures.push(`${candidate.id}: source preview failures are not clean`);
  if (preview && !preview.screenshotPath) failures.push(`${candidate.id}: source preview missing screenshot path`);
  if (preview?.screenshotPath) await fileOk(`${candidate.id} source preview screenshot`, resolve(preview.screenshotPath), 1024);
  const previewPassed = Boolean(preview) && (preview.failures ?? []).length === 0 && preview.snapshot?.hasPreviewSprite === true;
  if (item.evidence?.sourcePreviewPassed !== previewPassed) failures.push(`${candidate.id}: source preview evidence flag mismatch`);

  if (!Array.isArray(item.blockers)) failures.push(`${candidate.id}: blockers must be an array`);
  if (review?.approved !== true && !item.blockers?.includes('human source approval is still missing')) {
    failures.push(`${candidate.id}: pending source must list missing human approval as blocker`);
  }
  if (!item.acceptCommand?.includes(`npm run source:accept -- --id ${candidate.id}`)) failures.push(`${candidate.id}: accept command is missing or wrong`);
  if (!item.acceptCommand?.includes('--source-visual-board public/review/source-visual-board.json')) failures.push(`${candidate.id}: accept command missing source visual board evidence`);
  if (!item.rejectCommand?.includes(`npm run source:accept -- --id ${candidate.id} --status rejected`)) failures.push(`${candidate.id}: reject command is missing or wrong`);
  for (const required of ['--source-rejected', '--source-visual-board public/review/source-visual-board.json', '--failed-check ', '--visual-note ']) {
    if (!item.rejectCommand?.includes(required)) failures.push(`${candidate.id}: reject command missing ${required}`);
  }
  const expectedPacketFile = `public/review/source-candidates/source-review-packets/${safeFileName(candidate.id)}.md`;
  if (item.reviewPacket?.file !== expectedPacketFile) failures.push(`${candidate.id}: review packet file path mismatch`);
  const expectedPacketStatus = item.approved
    ? 'approved'
    : item.evidence?.imageValidationPassed === true && item.evidence?.sourcePreviewPassed === true
      ? 'ready-for-human-review'
      : 'blocked';
  if (item.reviewPacket?.status !== expectedPacketStatus) failures.push(`${candidate.id}: review packet status mismatch`);
  if (!Array.isArray(item.reviewPacket?.evidenceSummary) || item.reviewPacket.evidenceSummary.length < 5) failures.push(`${candidate.id}: review packet evidence summary is incomplete`);
  for (const [key, expected] of [
    ['sourcePreview', `npm run sandbox:preview -- --id ${candidate.id} --kind source --serve --open --visual`],
    ['imageCheck', 'npm run source:image-check'],
    ['previewCheck', 'npm run source:preview-check'],
    ['rebuildDossier', 'npm run source:review-dossier && npm run source:review-dossier-check'],
    ['accept', item.acceptCommand],
    ['reject', item.rejectCommand],
  ]) {
    if (item.reviewPacket?.commands?.[key] !== expected) failures.push(`${candidate.id}: review packet command ${key} mismatch`);
  }
  await fileOk(`${candidate.id} source review packet`, resolve(expectedPacketFile), 1024);
  const packetMarkdown = await readText(`${candidate.id} source review packet`, resolve(expectedPacketFile));
  for (const expected of [
    `Source Review Packet: ${candidate.species} (${candidate.id})`,
    'Passing automation is not approval.',
    item.reviewPacket?.commands?.sourcePreview,
    item.acceptCommand,
    item.rejectCommand,
    expectedContractMarkdown,
  ]) {
    if (expected && !packetMarkdown.includes(expected)) failures.push(`${candidate.id}: review packet missing ${expected}`);
  }
  if (!textIncludes(html, item.acceptCommand)) failures.push(`${candidate.id}: html is missing accept command`);
  if (!textIncludes(html, item.rejectCommand)) failures.push(`${candidate.id}: html is missing reject command`);
  if (!textIncludes(html, expectedPacketFile)) failures.push(`${candidate.id}: html is missing review packet link`);
  if (!markdown.includes(expectedPacketFile)) failures.push(`${candidate.id}: markdown is missing review packet link`);
  if (!textIncludes(html, 'Contract Snapshot')) failures.push(`${candidate.id}: html is missing contract snapshot section`);
  if (!textIncludes(html, expectedContractMarkdown)) failures.push(`${candidate.id}: html is missing contract link`);
  if (!markdown.includes('Contract Snapshots')) failures.push(`${candidate.id}: markdown is missing contract snapshot section`);
  if (!markdown.includes(expectedContractMarkdown)) failures.push(`${candidate.id}: markdown is missing contract link`);
  for (const value of [
    ...asArray(candidate.requiredRead),
    ...asArray(candidate.contractReviewChecklist),
  ]) {
    if (!textIncludes(html, value)) failures.push(`${candidate.id}: html is missing contract review text: ${value}`);
    if (!markdown.includes(value)) failures.push(`${candidate.id}: markdown is missing contract review text: ${value}`);
  }
}

for (const needle of [
  'Water 9 Source Review Dossier',
  'Human-facing evidence',
  'npm run source:gallery',
  'npm run source:image-check',
  'npm run source:preview-check',
  'npm run source:review-dossier && npm run source:review-dossier-check',
  'npm run source:accept -- --id <candidate-id>',
  'whole source thumbnail',
  'magenta key preview',
  'sandbox screenshot',
  'Contract Snapshot',
  'Required Read',
  'Candidate Checks',
  'Riggable Parts',
  'Reject Risks',
]) {
  if (!textIncludes(html, needle)) failures.push(`html is missing required content: ${needle}`);
}
for (const needle of [
  'Water 9 Source Review Dossier',
  'npm run source:gallery',
  'npm run source:image-check',
  'npm run source:preview-check',
  'Source Images Awaiting Review',
  'Contract Snapshots',
]) {
  if (!markdown.includes(needle)) failures.push(`markdown is missing required content: ${needle}`);
}

const result = {
  json: paths.dossier,
  html: paths.html,
  markdown: paths.markdown,
  sourceImages: sourceCandidatesWithImages.length,
  pendingReview: dossier?.summary?.pendingReview ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
