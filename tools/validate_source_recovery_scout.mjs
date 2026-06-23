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
  json: resolve(String(args.get('json') ?? 'public/review/source-candidates/source-recovery-scout.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/source-recovery-scout.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/source-recovery-scout.html')),
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

const report = await readJson('source recovery scout', paths.json);
const markdown = await readText('source recovery scout markdown', paths.markdown);
const html = await readText('source recovery scout html', paths.html);
await fileOk('source recovery scout json', paths.json, 512);
await fileOk('source recovery scout markdown', paths.markdown, 512);
await fileOk('source recovery scout html', paths.html, 1024);

if (report?.schema !== 'water9/source-recovery-scout@1') failures.push(`schema is ${report?.schema ?? 'missing'}`);
if (!String(report?.targetId ?? '').trim()) failures.push('targetId is missing');
if (!String(report?.status ?? '').trim()) failures.push('status is missing');
if (!Array.isArray(report?.scanRoots) || report.scanRoots.length < 1) failures.push('scanRoots are missing');
if (typeof report?.afterMarkerCount !== 'number') failures.push('afterMarkerCount must be numeric');
if (typeof report?.scannedImages !== 'number') failures.push('scannedImages must be numeric');
if (typeof report?.manualCaptureRequired !== 'boolean') failures.push('manualCaptureRequired must be boolean');
if (!String(report?.manualCaptureReason ?? '').trim()) failures.push('manualCaptureReason is missing');

const commands = report?.commands ?? {};
for (const [key, expected] of Object.entries({
  captureInbox: `npm run source:inbox-capture -- --id ${report?.targetId} --open`,
  recoverSavedFile: `npm run source:recover-inline -- --id ${report?.targetId} --image <saved-image-path> --copy --validate`,
  recoverDataUrl: `npm run source:recover-inline -- --id ${report?.targetId} --data-url-stdin --copy --validate`,
  recoverBase64: `npm run source:recover-inline -- --id ${report?.targetId} --stdin-base64 --stdin-filename ${report?.targetId}.png --copy --validate`,
  inboxCheck: `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${report?.targetId}`,
  ingestDryRun: `npm run source:ingest-current -- --id ${report?.targetId} --dry-run`,
  ingestApply: `npm run source:ingest-current -- --id ${report?.targetId} --apply`,
})) {
  if (commands[key] !== expected) failures.push(`commands.${key} must be ${expected}`);
  if (!markdown.includes(expected)) failures.push(`markdown missing command ${expected}`);
  if (!textIncludesHtml(html, expected)) failures.push(`html missing command ${expected}`);
}

for (const expected of [
  'Water 9 Source Recovery Scout',
  report?.targetId,
  report?.status,
  'Candidate Files',
]) {
  if (expected && !markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (expected && !textIncludesHtml(html, expected)) failures.push(`html missing ${expected}`);
}
if (!markdown.includes('Manual capture required')) failures.push('markdown missing Manual capture required');
if (!/manual capture required/i.test(html)) failures.push('html missing Manual capture required');

const candidates = Array.isArray(report?.candidates) ? report.candidates : [];
for (const item of candidates) {
  if (!item.path) failures.push('candidate is missing path');
  if (!item.recoveryCommand?.includes(`--id ${report.targetId}`)) failures.push(`${item.path ?? 'candidate'}: recovery command is not target-aware`);
  if (!item.validation || !Array.isArray(item.validation.failures)) failures.push(`${item.path ?? 'candidate'}: validation result is missing`);
}
if (report?.status === 'recoverable-candidate-found' && !candidates.some((item) => item.afterMarker && item.validation?.failures?.length === 0)) {
  failures.push('recoverable-candidate-found status requires an after-marker candidate with passing validation');
}
if (report?.status === 'no-after-marker-artifact' && report?.afterMarkerCount !== 0) {
  failures.push('no-after-marker-artifact status requires afterMarkerCount 0');
}

const summary = {
  schema: 'water9/source-recovery-scout-check@1',
  targetId: report?.targetId ?? null,
  status: report?.status ?? null,
  afterMarkerCount: report?.afterMarkerCount ?? null,
  candidates: candidates.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
