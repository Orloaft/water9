import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, dirname, extname, resolve } from 'node:path';
import { sourceImageMetadata } from './source_image_metadata.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  manifest: resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json')),
  assetsDir: resolve(String(args.get('assets-dir') ?? args.get('assetsDir') ?? 'public/assets/generated')),
  jsonOut: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-asset-opportunities.json')),
  markdownOut: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-asset-opportunities.md')),
  htmlOut: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-asset-opportunities.html')),
};

const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const assetMarkers = ['whole-source', 'whole-painted', 'whole', 'chroma'];
const ignoredTokens = new Set([
  'fauna',
  'whole',
  'source',
  'painted',
  'uncropped',
  'chroma',
  'socket',
  'damaged',
  'wound',
  'v2',
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

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

function imageLike(path) {
  return allowedExtensions.has(extname(path).toLowerCase());
}

function sourceLike(name) {
  return assetMarkers.some((marker) => name.includes(marker));
}

async function walkImages(dir) {
  const results = [];
  async function walk(path) {
    let entries = [];
    try {
      entries = await readdir(path, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) {
        await walk(child);
      } else if (entry.isFile() && imageLike(child) && sourceLike(entry.name)) {
        const info = await stat(child);
        results.push({
          path: child,
          file: entry.name,
          bytes: info.size,
          mtime: info.mtime.toISOString(),
        });
      }
    }
  }
  await walk(dir);
  return results.sort((left, right) => left.path.localeCompare(right.path));
}

function tokensFor(value) {
  return String(value)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token && !ignoredTokens.has(token));
}

function similarity(candidateId, assetFile) {
  const candidateTokens = new Set(tokensFor(candidateId));
  const assetTokens = new Set(tokensFor(assetFile));
  const intersection = [...candidateTokens].filter((token) => assetTokens.has(token)).length;
  const union = new Set([...candidateTokens, ...assetTokens]).size;
  return union ? intersection / union : 0;
}

function exactExpectedFiles(id) {
  return [
    `fauna-${id}-whole-source.png`,
    `fauna-${id}-whole-painted.png`,
    `fauna-${id}-whole.png`,
    `fauna-${id}-chroma.png`,
  ];
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
  if (result.status !== 0 && !failures.length) {
    failures.push(`${id}: source image validation failed without JSON output${output ? `: ${output.trim()}` : ''}`);
  }
  return {
    checked: true,
    metrics: parsed?.metrics?.[0] ?? null,
    failures,
  };
}

async function assetSummary(asset, id = null) {
  const metadata = await sourceImageMetadata(asset.path);
  return {
    path: repoRelative(asset.path),
    file: asset.file,
    bytes: asset.bytes,
    width: metadata.width,
    height: metadata.height,
    sha256: metadata.sha256,
    imageCheck: id ? validateSourceImage(id, asset.path) : { checked: false, failures: [] },
  };
}

function commandsFor(id, assetPath) {
  return {
    dryRun: `npm run source:ingest -- --id ${id} --image ${assetPath} --copy --dry-run`,
    apply: `npm run source:ingest -- --id ${id} --image ${assetPath} --copy`,
    imageCheck: `python3 tools/validate_source_candidate_images.py --id ${id} --image ${assetPath}`,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Water 9 Source Asset Opportunities',
    '',
    `Generated: \`${report.generatedAt}\``,
    `Missing source candidates: \`${report.summary.missingSourceCandidates}\``,
    `Exact candidate asset matches: \`${report.summary.exactMatches}\``,
    `Near matches requiring review: \`${report.summary.nearMatches}\``,
    '',
    'This report is conservative. Only exact slug matches are candidates for focused `source:ingest` dry-run validation. Near matches are explicitly not auto-ingestable because they may be prototype art, a different creature, or an unrelated generated asset.',
    '',
    '## Candidates',
    '',
    '| Candidate | Exact Assets | Near Assets | Next |',
    '| --- | ---: | ---: | --- |',
  ];
  for (const item of report.candidates) {
    lines.push(`| ${item.species} (\`${item.id}\`) | ${item.exactAssets.length} | ${item.nearAssets.length} | \`${item.nextAction}\` |`);
  }
  lines.push('', '## Exact Matches', '');
  for (const item of report.candidates.filter((candidate) => candidate.exactAssets.length)) {
    lines.push(`### ${item.species} (${item.id})`, '');
    for (const asset of item.exactAssets) {
      lines.push(
        `- \`${asset.path}\` (${asset.width}x${asset.height}, ${asset.bytes} bytes)`,
        `  - validation failures: ${asset.imageCheck.failures.length ? asset.imageCheck.failures.join('; ') : 'none'}`,
        '  - commands:',
        '```bash',
        asset.commands.imageCheck,
        asset.commands.dryRun,
        asset.commands.apply,
        '```',
        '',
      );
    }
  }
  if (!report.summary.exactMatches) lines.push('No exact slug-matched assets found for missing source candidates.', '');
  lines.push('## Near Matches', '');
  for (const item of report.candidates.filter((candidate) => candidate.nearAssets.length)) {
    lines.push(`### ${item.species} (${item.id})`, '');
    for (const asset of item.nearAssets) {
      lines.push(`- \`${asset.path}\` similarity \`${asset.similarity.toFixed(2)}\`: ${asset.reasonNotAutoIngest}`);
    }
    lines.push('');
  }
  if (!report.summary.nearMatches) lines.push('No near matches found for missing source candidates.', '');
  return `${lines.join('\n')}\n`;
}

function renderHtml(report) {
  const rows = report.candidates.map((item) => `<tr>
    <td><strong>${htmlEscape(item.species)}</strong><code>${htmlEscape(item.id)}</code></td>
    <td>${item.exactAssets.length}</td>
    <td>${item.nearAssets.length}</td>
    <td><code>${htmlEscape(item.nextAction)}</code></td>
  </tr>`).join('\n');
  const cards = report.candidates.map((item) => `<section class="card" id="${htmlEscape(item.id)}">
    <h2>${htmlEscape(item.species)}</h2>
    <p><code>${htmlEscape(item.id)}</code> · exact ${item.exactAssets.length} · near ${item.nearAssets.length}</p>
    <h3>Exact Assets</h3>
    ${item.exactAssets.length ? item.exactAssets.map((asset) => `<pre><code>${htmlEscape([
      asset.path,
      `validation failures: ${asset.imageCheck.failures.length ? asset.imageCheck.failures.join('; ') : 'none'}`,
      asset.commands.imageCheck,
      asset.commands.dryRun,
      asset.commands.apply,
    ].join('\n'))}</code></pre>`).join('\n') : '<p>None.</p>'}
    <h3>Near Assets</h3>
    ${item.nearAssets.length ? `<ul>${item.nearAssets.map((asset) => `<li><code>${htmlEscape(asset.path)}</code> similarity ${asset.similarity.toFixed(2)}. ${htmlEscape(asset.reasonNotAutoIngest)}</li>`).join('')}</ul>` : '<p>None.</p>'}
  </section>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Asset Opportunities</title>
  <style>
    :root { color-scheme: dark; --bg:#061114; --panel:#0d1e24; --line:#294751; --text:#e7f7f8; --muted:#9eb7bd; --accent:#83e8ff; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1280px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:32px; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:14px 0 6px; font-size:13px; color:var(--muted); text-transform:uppercase; }
    p { color:var(--muted); }
    table { width:100%; border-collapse:collapse; margin:18px 0 24px; border:1px solid var(--line); background:var(--panel); }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:8px 10px; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; }
    code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
    pre { border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; white-space:pre-wrap; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(380px,1fr)); gap:14px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:14px; }
    .note { color:var(--muted); }
  </style>
</head>
<body>
  <main>
    <h1>Water 9 Source Asset Opportunities</h1>
    <p class="note">Conservative report for finding source-image opportunities without bypassing validation or human review. Exact Matches may proceed to <code>source:ingest</code> dry-run validation; Near Matches are not auto-ingestable.</p>
    <h2>Exact Matches</h2>
    <p class="note">Exact slug matches only. Empty means no existing generated asset can safely unblock missing source candidates.</p>
    <h2>Near Matches</h2>
    <p class="note">Reference-only fuzzy matches. These are not auto-ingestable without explicit human confirmation and validation.</p>
    <table>
      <thead><tr><th>Candidate</th><th>Exact</th><th>Near</th><th>Next</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <section class="cards">${cards}</section>
  </main>
</body>
</html>
`;
}

const manifest = await readJson(paths.manifest);
if (manifest.schema !== 'water9/source-candidates@1') {
  throw new Error(`Unexpected source candidate schema ${manifest.schema ?? 'missing'}`);
}
const assets = await walkImages(paths.assetsDir);
const assetsByFile = new Map(assets.map((asset) => [asset.file, asset]));
const missingCandidates = (manifest.candidates ?? []).filter((candidate) => !candidate.source);
const candidates = [];

for (const candidate of missingCandidates) {
  const exactAssets = [];
  for (const file of exactExpectedFiles(candidate.id)) {
    const asset = assetsByFile.get(file);
    if (!asset) continue;
    const summary = await assetSummary(asset, candidate.id);
    exactAssets.push({
      ...summary,
      autoIngestEligible: summary.imageCheck.failures.length === 0,
      reasonNotAutoIngest: summary.imageCheck.failures.length ? 'mechanical source-image validation failed' : null,
      commands: commandsFor(candidate.id, summary.path),
    });
  }

  const exactFiles = new Set(exactAssets.map((asset) => asset.file));
  const nearAssets = assets
    .filter((asset) => !exactFiles.has(asset.file))
    .map((asset) => ({ asset, similarity: similarity(candidate.id, asset.file) }))
    .filter((item) => item.similarity >= 0.34)
    .sort((left, right) => right.similarity - left.similarity || left.asset.file.localeCompare(right.asset.file))
    .slice(0, 5)
    .map((item) => ({
      path: repoRelative(item.asset.path),
      file: item.asset.file,
      bytes: item.asset.bytes,
      similarity: Number(item.similarity.toFixed(3)),
      autoIngestEligible: false,
      reasonNotAutoIngest: 'asset slug does not exactly match the source candidate id; treat as reference only until a human confirms it is the same intended creature and it passes source validation',
    }));

  candidates.push({
    id: candidate.id,
    species: candidate.species,
    status: candidate.status,
    source: null,
    expectedFiles: exactExpectedFiles(candidate.id).map((file) => repoRelative(resolve(paths.assetsDir, file))),
    exactAssets,
    nearAssets,
    nextAction: exactAssets.length
      ? `run exact asset imageCheck and source:ingest dry-run for ${candidate.id}`
      : `generate or capture a new magenta source image for ${candidate.id}`,
  });
}

const report = {
  schema: 'water9/source-asset-opportunities@1',
  generatedAt: new Date().toISOString(),
  manifest: repoRelative(paths.manifest),
  assetsDir: repoRelative(paths.assetsDir),
  summary: {
    sourceCandidates: manifest.candidates?.length ?? 0,
    missingSourceCandidates: missingCandidates.length,
    scannedSourceLikeAssets: assets.length,
    exactMatches: candidates.reduce((total, candidate) => total + candidate.exactAssets.length, 0),
    exactMatchesPassingValidation: candidates.reduce((total, candidate) => total + candidate.exactAssets.filter((asset) => asset.autoIngestEligible).length, 0),
    nearMatches: candidates.reduce((total, candidate) => total + candidate.nearAssets.length, 0),
  },
  candidates,
};

await mkdir(dirname(paths.jsonOut), { recursive: true });
await mkdir(dirname(paths.markdownOut), { recursive: true });
await mkdir(dirname(paths.htmlOut), { recursive: true });
await writeFile(paths.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.markdownOut, renderMarkdown(report));
await writeFile(paths.htmlOut, renderHtml(report));

console.log(JSON.stringify({
  schema: report.schema,
  jsonOut: repoRelative(paths.jsonOut),
  markdownOut: repoRelative(paths.markdownOut),
  htmlOut: repoRelative(paths.htmlOut),
  summary: report.summary,
}, null, 2));
