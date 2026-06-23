import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, extname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  if (args.has(key)) {
    const existing = args.get(key);
    args.set(key, Array.isArray(existing) ? [...existing, value] : [existing, value]);
  } else {
    args.set(key, value);
  }
}

function valuesFor(key) {
  const value = args.get(key);
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const markerPath = resolve(String(args.get('marker') ?? 'tools/scratch/source-imagegen-handoff-marker.json'));
const nextActionPath = resolve(String(args.get('next-action') ?? 'public/review/content-next-action.json'));
const workstationPath = resolve(String(args.get('workstation') ?? 'public/review/source-candidates/source-workstation.json'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const rejectionsPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const jsonOut = resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-recovery-scout.json'));
const markdownOut = resolve(String(args.get('out') ?? 'public/review/source-candidates/source-recovery-scout.md'));
const htmlOut = resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-recovery-scout.html'));
const explicitId = String(args.get('id') ?? '').trim();
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const maxCandidates = Number(args.get('max-candidates') ?? args.get('maxCandidates') ?? 12);
const maxThumbBytes = Number(args.get('max-thumb-bytes') ?? args.get('maxThumbBytes') ?? 4 * 1024 * 1024);
const dirsFromArgs = valuesFor('dir').flatMap((value) => String(value).split(',').map((item) => item.trim()).filter(Boolean));
const MANUAL_CAPTURE_THRESHOLD = 5;

function repoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function imageMime(path) {
  const extension = extname(path).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  return 'image/png';
}

async function sha256File(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function imageDataUrl(path, bytes) {
  if (bytes > maxThumbBytes) return null;
  try {
    return `data:${imageMime(path)};base64,${(await readFile(path)).toString('base64')}`;
  } catch {
    return null;
  }
}

async function walkImages(dir) {
  const results = [];
  async function walk(path) {
    let entries = [];
    try {
      entries = await readdir(path, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) {
        await walk(child);
      } else if (entry.isFile() && allowedExtensions.has(extname(entry.name).toLowerCase())) {
        const info = await stat(child).catch(() => null);
        if (!info?.isFile()) continue;
        results.push({
          path: child,
          repoPath: repoRelative(child),
          bytes: info.size,
          mtimeMs: Math.round(info.mtimeMs),
          mtime: info.mtime.toISOString(),
          sha256: await sha256File(child),
        });
      }
    }
  }
  await walk(resolve(dir));
  return results;
}

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'other';
}

function validateSourceImage(id, path) {
  const result = spawnSync('python3', [
    'tools/validate_source_candidate_images.py',
    '--id',
    id,
    '--image',
    path,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const output = result.stdout || result.stderr || '';
  let parsed = null;
  try {
    parsed = JSON.parse(output);
  } catch {
    parsed = null;
  }
  const failures = Array.isArray(parsed?.failures) ? [...parsed.failures] : [];
  if (result.status !== 0 && failures.length === 0) {
    failures.push(`${id}: validation failed without JSON output${output ? `: ${output.trim()}` : ''}`);
  }
  return {
    checked: true,
    failures,
    metric: parsed?.metrics?.[0] ?? null,
  };
}

function markdownFor(report) {
  const lines = [
    '# Water 9 Source Recovery Scout',
    '',
    `Generated: \`${report.generatedAt}\``,
    `Target: \`${report.targetId}\``,
    `Status: \`${report.status}\``,
    `Manual capture required: \`${report.manualCaptureRequired}\``,
    '',
    '## Commands',
    '',
    '```bash',
    ...Object.values(report.commands).filter(Boolean),
    '```',
    '',
    '## Scan Roots',
    '',
    ...report.scanRoots.map((root) => `- \`${root}\``),
    '',
    '## Candidate Files',
    '',
  ];
  if (!report.candidates.length) {
    lines.push('- None found after the active source marker.');
  } else {
    lines.push('| Rank | File | After Marker | Validation | Recovery Command |', '| ---: | --- | --- | --- | --- |');
    for (const item of report.candidates) {
      lines.push(`| ${item.rank} | \`${item.path}\` | \`${item.afterMarker}\` | ${item.validation.failures.length ? item.validation.failures.join('<br>') : 'pass'} | \`${item.recoveryCommand}\` |`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function htmlFor(report) {
  const rows = report.candidates.map((item) => `<tr>
    <td>${htmlEscape(item.rank)}</td>
    <td>${item.thumbnail ? `<img src="${item.thumbnail}" alt="">` : '<span class="no-thumb">no embedded thumb</span>'}</td>
    <td><code>${htmlEscape(item.path)}</code><small>${htmlEscape(`${item.bytes} bytes · ${item.mtime}`)}</small></td>
    <td><code>${htmlEscape(String(item.afterMarker))}</code></td>
    <td>${item.validation.failures.length ? item.validation.failures.map((failure) => `<div>${htmlEscape(failure)}</div>`).join('') : 'pass'}</td>
    <td><code>${htmlEscape(item.recoveryCommand)}</code></td>
  </tr>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Recovery Scout</title>
  <style>
    :root { color-scheme: dark; --bg:#061114; --panel:#0d1e24; --line:#294751; --text:#e7f7f8; --muted:#9eb7bd; --warn:#f0c66e; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1320px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    p, small { color:var(--muted); }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .status { display:flex; flex-wrap:wrap; gap:10px; margin:16px 0; }
    .status span { border:1px solid var(--line); border-radius:6px; background:var(--panel); padding:8px 10px; }
    .warn { border-color:#6a5230; background:#1d1710; padding:12px; border-radius:6px; color:var(--warn); }
    table { width:100%; border-collapse:collapse; margin-top:18px; border:1px solid var(--line); background:var(--panel); }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:8px 10px; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; }
    img { width:140px; height:100px; object-fit:contain; background:#270027; border:1px solid #6e2c6e; }
    td small { display:block; margin-top:4px; }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Recovery Scout</h1>
    <p>Scans known image output locations for source images that can be recovered into the project inbox.</p>
    <div class="status">
      <span>target: <strong>${htmlEscape(report.targetId)}</strong></span>
      <span>status: <strong>${htmlEscape(report.status)}</strong></span>
      <span>manual capture required: <strong>${htmlEscape(String(report.manualCaptureRequired))}</strong></span>
      <span>after-marker candidates: <strong>${htmlEscape(String(report.afterMarkerCount))}</strong></span>
    </div>
    ${report.manualCaptureRequired ? `<p class="warn">${htmlEscape(report.manualCaptureReason)}</p>` : ''}
    <h2>Commands</h2>
    <pre><code>${htmlEscape(Object.values(report.commands).filter(Boolean).join('\n'))}</code></pre>
    <h2>Candidate Files</h2>
    ${report.candidates.length ? `<table><thead><tr><th>Rank</th><th>Preview</th><th>File</th><th>After Marker</th><th>Validation</th><th>Recover</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>No recoverable image files were found after the active marker.</p>'}
  </main>
</body>
</html>
`;
}

const marker = await readJson(markerPath, null);
const nextAction = await readJson(nextActionPath, { nextAction: {} });
const workstation = await readJson(workstationPath, { target: null });
const queue = await readJson(queuePath, { candidates: [] });
const rejections = await readJson(rejectionsPath, { attempts: [] });
const queueIds = (queue.candidates ?? []).map((item) => item.id).filter(Boolean);
const queueIdSet = new Set(queueIds);
const nextActionTarget = nextAction.nextAction?.targetId ?? null;
const workstationTarget = typeof workstation.target === 'string'
  ? workstation.target
  : workstation.target?.id;
const targetId = explicitId
  || (nextActionTarget && queueIdSet.has(nextActionTarget) ? nextActionTarget : '')
  || (workstationTarget && queueIdSet.has(workstationTarget) ? workstationTarget : '')
  || queueIds[0]
  || marker?.candidateId
  || nextActionTarget
  || workstationTarget
  || '';
if (!targetId) throw new Error('No target id found; pass --id <candidate-id>');

const activeMarker = marker?.candidateId === targetId ? marker : null;
const markerTime = activeMarker
  ? Date.parse(activeMarker.createdAt ?? '') || Number(activeMarker.createdAtMs ?? 0) || 0
  : Date.now();
const generatedDir = marker?.generatedDir ?? `${homedir()}/.codex/generated_images`;
const scanRoots = [...new Set([
  ...dirsFromArgs,
  generatedDir,
  `${homedir()}/Downloads`,
].filter(Boolean).map((dir) => repoRelative(dir)))];
const attempts = (rejections.attempts ?? []).filter((attempt) => attempt.candidateId === targetId && rejectionKind(attempt) === 'missing-artifact');
const manualCaptureRequired = attempts.length >= MANUAL_CAPTURE_THRESHOLD;
const files = (await Promise.all(scanRoots.map((dir) => walkImages(dir)))).flat()
  .sort((left, right) => right.mtimeMs - left.mtimeMs || left.path.localeCompare(right.path));
const recentFiles = files.filter((file) => file.mtimeMs >= markerTime);
const candidateFiles = (recentFiles.length ? recentFiles : files).slice(0, Math.max(1, maxCandidates));
const candidates = [];
for (const [index, file] of candidateFiles.entries()) {
  const validation = validateSourceImage(targetId, file.path);
  candidates.push({
    rank: index + 1,
    path: file.repoPath,
    absolutePath: file.path,
    bytes: file.bytes,
    mtime: file.mtime,
    mtimeMs: file.mtimeMs,
    sha256: file.sha256,
    afterMarker: file.mtimeMs >= markerTime,
    validation,
    thumbnail: await imageDataUrl(file.path, file.bytes),
    recoveryCommand: `npm run source:recover-inline -- --id ${targetId} --image ${file.repoPath} --copy --validate`,
  });
}

const status = recentFiles.length
  ? candidates.some((item) => item.afterMarker && item.validation.failures.length === 0) ? 'recoverable-candidate-found' : 'after-marker-candidates-need-review'
  : 'no-after-marker-artifact';
const commands = {
  captureInbox: `npm run source:inbox-capture -- --id ${targetId} --open`,
  recoverSavedFile: `npm run source:recover-inline -- --id ${targetId} --image <saved-image-path> --copy --validate`,
  recoverDataUrl: `npm run source:recover-inline -- --id ${targetId} --data-url-stdin --copy --validate`,
  recoverBase64: `npm run source:recover-inline -- --id ${targetId} --stdin-base64 --stdin-filename ${targetId}.png --copy --validate`,
  inboxCheck: `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${targetId}`,
  ingestDryRun: `npm run source:ingest-current -- --id ${targetId} --dry-run`,
  ingestApply: `npm run source:ingest-current -- --id ${targetId} --apply`,
};
const report = {
  schema: 'water9/source-recovery-scout@1',
  generatedAt: new Date().toISOString(),
  targetId,
  marker: activeMarker ? {
    path: repoRelative(markerPath),
    createdAt: activeMarker.createdAt ?? null,
    markerTimeMs: markerTime,
    generatedDir: repoRelative(generatedDir),
  } : null,
  scanRoots,
  status,
  afterMarkerCount: recentFiles.length,
  scannedImages: files.length,
  manualCaptureRequired,
  manualCaptureReason: manualCaptureRequired
    ? `Built-in image generation has ${attempts.length} missing-artifact attempts for ${targetId}; use capture/manual save before ingest.`
    : `Manual capture escalation starts at ${MANUAL_CAPTURE_THRESHOLD} missing-artifact attempts.`,
  commands,
  candidates,
};

await mkdir(dirname(jsonOut), { recursive: true });
await mkdir(dirname(markdownOut), { recursive: true });
await mkdir(dirname(htmlOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownOut, markdownFor(report));
await writeFile(htmlOut, htmlFor(report));
console.log(JSON.stringify({
  schema: report.schema,
  targetId,
  status,
  afterMarkerCount: report.afterMarkerCount,
  scannedImages: report.scannedImages,
  candidates: report.candidates.length,
  manualCaptureRequired,
  json: repoRelative(jsonOut),
  markdown: repoRelative(markdownOut),
  html: repoRelative(htmlOut),
}, null, 2));
