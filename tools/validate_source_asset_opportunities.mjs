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
  report: resolve(String(args.get('report') ?? 'public/review/source-candidates/source-asset-opportunities.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-asset-opportunities.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-asset-opportunities.html')),
  manifest: resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json')),
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

async function fileOk(label, path, minSize = 256) {
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

const report = await readJson('source asset opportunities', paths.report);
const manifest = await readJson('source candidates', paths.manifest);
const markdown = await readText('source asset opportunities markdown', paths.markdown);
const html = await readText('source asset opportunities html', paths.html);
// The report shrinks as source candidates are completed. Keep this as a
// truncation guard while letting the final small queue remain valid.
await fileOk('source asset opportunities markdown', paths.markdown, 512);
await fileOk('source asset opportunities html', paths.html, 2048);

if (report?.schema !== 'water9/source-asset-opportunities@1') failures.push(`report schema is ${report?.schema ?? 'missing'}`);
if (manifest?.schema !== 'water9/source-candidates@1') failures.push(`manifest schema is ${manifest?.schema ?? 'missing'}`);

const missingCandidates = (manifest?.candidates ?? []).filter((candidate) => !candidate.source);
const reportCandidates = Array.isArray(report?.candidates) ? report.candidates : [];
if (reportCandidates.length !== missingCandidates.length) {
  failures.push(`report candidate count ${reportCandidates.length} does not match missing-source candidate count ${missingCandidates.length}`);
}

const computedSummary = {
  sourceCandidates: manifest?.candidates?.length ?? 0,
  missingSourceCandidates: missingCandidates.length,
  exactMatches: reportCandidates.reduce((total, candidate) => total + (candidate.exactAssets?.length ?? 0), 0),
  exactMatchesPassingValidation: reportCandidates.reduce((total, candidate) => total + (candidate.exactAssets ?? []).filter((asset) => asset.autoIngestEligible === true).length, 0),
  nearMatches: reportCandidates.reduce((total, candidate) => total + (candidate.nearAssets?.length ?? 0), 0),
};
for (const [key, value] of Object.entries(computedSummary)) {
  if (report?.summary?.[key] !== value) failures.push(`summary.${key} expected ${value}, got ${report?.summary?.[key] ?? 'missing'}`);
}
if (!Number.isFinite(report?.summary?.scannedSourceLikeAssets) || report.summary.scannedSourceLikeAssets < 0) {
  failures.push('summary.scannedSourceLikeAssets must be a non-negative number');
}

for (const required of [
  'Water 9 Source Asset Opportunities',
  'Exact Matches',
  'Near Matches',
  'not auto-ingestable',
  'source:ingest',
]) {
  if (!markdown.includes(required)) failures.push(`markdown missing ${required}`);
  if (!textIncludesHtml(html, required)) failures.push(`html missing ${required}`);
}

const missingById = new Map(missingCandidates.map((candidate) => [candidate.id, candidate]));
for (const item of reportCandidates) {
  const owner = item?.id ?? 'unknown';
  if (!missingById.has(owner)) failures.push(`${owner}: report candidate is not a missing-source manifest candidate`);
  if (item.source !== null) failures.push(`${owner}: source must be null in opportunity report`);
  if (!Array.isArray(item.expectedFiles) || !item.expectedFiles.some((file) => file.endsWith(`fauna-${owner}-whole-source.png`))) {
    failures.push(`${owner}: expectedFiles must include fauna-${owner}-whole-source.png`);
  }
  if (!Array.isArray(item.exactAssets)) failures.push(`${owner}: exactAssets must be an array`);
  if (!Array.isArray(item.nearAssets)) failures.push(`${owner}: nearAssets must be an array`);
  for (const asset of item.exactAssets ?? []) {
    if (!asset.path || !asset.file) failures.push(`${owner}: exact asset missing path or file`);
    if (!String(asset.file).startsWith(`fauna-${owner}-`)) failures.push(`${owner}: exact asset ${asset.file} does not start with fauna-${owner}-`);
    if (!asset.commands?.dryRun?.includes(`--id ${owner}`) || !asset.commands?.dryRun?.includes('--dry-run')) {
      failures.push(`${owner}: exact asset dryRun command must be target-aware and dry-run`);
    }
    if (!asset.commands?.apply?.includes(`--id ${owner}`) || !asset.commands?.apply?.includes('source:ingest')) {
      failures.push(`${owner}: exact asset apply command must use source:ingest for the candidate`);
    }
    if (asset.autoIngestEligible === true && asset.imageCheck?.failures?.length) {
      failures.push(`${owner}: exact asset cannot be autoIngestEligible with validation failures`);
    }
  }
  for (const asset of item.nearAssets ?? []) {
    if (asset.autoIngestEligible !== false) failures.push(`${owner}: near asset must not be auto-ingestable`);
    if (!String(asset.reasonNotAutoIngest ?? '').includes('slug does not exactly match')) {
      failures.push(`${owner}: near asset reject reason must mention exact slug mismatch`);
    }
  }
}

const summary = {
  schema: 'water9/source-asset-opportunities-check@1',
  candidates: reportCandidates.length,
  exactMatches: computedSummary.exactMatches,
  nearMatches: computedSummary.nearMatches,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
