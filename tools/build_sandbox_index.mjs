import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { threatAcceptedForContentGate } from './content_quality_predicates.mjs';

const root = process.cwd();
const outDir = resolve(root, 'public/review/sandbox');
const contentPath = resolve(root, 'src/content.ts');
const reviewManifestPath = resolve(root, 'public/review/articulated/review-manifest.json');
const runtimeManifestPath = resolve(root, 'public/assets/generated/articulated-creatures.parts.json');
const sourceCandidatePath = resolve(root, 'public/review/source-candidates/source-candidates.json');
const contentRuntimeCoveragePath = resolve(root, 'public/review/content-runtime-coverage.json');
const contentStageBoardPath = resolve(root, 'public/review/content-stage-board.json');

const schema = 'water9/sandbox-index@1';

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function sectionBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) return '';
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return source.slice(start, end < 0 ? undefined : end);
}

function biomeAt(section, index) {
  const headers = [...section.matchAll(/\n\s*(\d+):\s*\[/g)];
  let biome = null;
  for (const match of headers) {
    if ((match.index ?? 0) > index) break;
    biome = Number(match[1]);
  }
  return biome;
}

function property(block, name) {
  return block.match(new RegExp(`${name}:\\s*'([^']+)'`))?.[1] ?? null;
}

function booleanProperty(block, name) {
  const value = block.match(new RegExp(`${name}:\\s*(true|false)`))?.[1];
  return value === 'true';
}

function numberProperty(block, name) {
  const value = block.match(new RegExp(`${name}:\\s*(\\d+)`))?.[1];
  return value ? Number(value) : null;
}

function rarityForHostile(hostile) {
  return hostile ? 'rare' : 'common';
}

function addEntry(entries, seen, entry) {
  if (!entry.id || seen.has(entry.id)) return;
  seen.add(entry.id);
  entries.push(entry);
}

function withCompanion(url, companion = 'diver') {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}companion=${encodeURIComponent(companion)}`;
}

function acceptedForContentGate(entry) {
  return entry.kind === 'articulated' && entry.acceptedForContentGate === true;
}

function acceptanceNotice(entry) {
  if (acceptedForContentGate(entry)) return 'accepted articulated threat; still subject to final content gate count';
  if (entry.kind === 'articulated') return 'preview-only prototype; render/visual pass is not human acceptance';
  if (entry.kind === 'source') return 'source-art preview only; source approval and rig acceptance are separate gates';
  return 'reference preview; not counted by the 20-threat content gate';
}

function manualReviewRequired(entry) {
  if (acceptedForContentGate(entry)) return null;
  if (entry.kind === 'articulated') return 'approved source art plus strict human rig and sandbox acceptance';
  if (entry.kind === 'source') return 'human source image approval before rigging';
  return 'reference preview; not part of the 20-threat production gate';
}

function productionBoundary(entry) {
  const accepted = acceptedForContentGate(entry);
  return {
    schema: 'water9/sandbox-production-boundary@1',
    reviewStage: entry.reviewStage ?? 'reference',
    qualityStatus: entry.qualityStatus ?? null,
    productionReady: accepted,
    acceptedForContentGate: accepted,
    previewOnly: !accepted,
    manualReviewRequired: manualReviewRequired(entry),
    claim: accepted
      ? 'accepted articulated threat with strict review evidence'
      : acceptanceNotice(entry),
  };
}

function reviewGateLabel(entry) {
  if (entry.acceptedForContentGate !== true && entry.kind === 'articulated') {
    return `PREVIEW ONLY PROTOTYPE - NOT ACCEPTED / quality: ${entry.qualityStatus ?? 'prototype'} / needs human source, contact, phase, and sandbox review`;
  }
  if (entry.acceptedForContentGate !== true && entry.kind === 'source') {
    return `SOURCE REVIEW NEEDED / PREVIEW ONLY SOURCE ART - NOT ACCEPTED / quality: ${entry.qualityStatus ?? 'unknown'} / needs human full-source concept approval before rigging`;
  }
  if (entry.kind === 'articulated') return 'ACCEPTED THREAT / strict gate evidence required';
  if (entry.kind === 'source') return 'SOURCE APPROVED / eligible for rigging';
  return 'REFERENCE PREVIEW / not part of the 20-threat production gate';
}

function reviewGateSeverity(entry) {
  if (entry.acceptedForContentGate === true || entry.reviewStage === 'source-approved') return 'accepted';
  if (entry.kind === 'articulated' || entry.kind === 'source') return 'preview-only';
  return 'reference';
}

function previewCommand(entry, companion = '') {
  const companionFlag = companion ? ` --with ${companion}` : '';
  return `npm run sandbox:preview -- --id ${entry.id}${companionFlag} --serve --open --visual`;
}

function visualCheckCommand(entry, companion = '') {
  const companionFlag = companion ? ` --with ${companion}` : '';
  if (entry.kind === 'articulated') {
    return `npm run sandbox:visual -- --ids ${entry.id} --states idle,lunge,stunned${companionFlag}`;
  }
  return `npm run sandbox:visual -- --ids ${entry.id}${companionFlag}`;
}

function candidateIdForEntry(entry) {
  if (entry.kind === 'source' && entry.id.startsWith('source-')) return entry.id.slice('source-'.length);
  return entry.sourceCandidateId ?? entry.id;
}

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function loadArticulatedEntries() {
  const review = await readJsonIfPresent(reviewManifestPath);
  const runtime = await readJsonIfPresent(runtimeManifestPath);
  const sourceCandidates = await readJsonIfPresent(sourceCandidatePath);
  const sourceById = new Map((sourceCandidates?.candidates ?? []).map((candidate) => [candidate.id, candidate]));
  const runtimeById = new Map((runtime?.creatures ?? []).map((creature) => [creature.id, creature]));
  const reviewCreatures = review?.creatures ?? [];
  const entries = [];
  const seen = new Set();

  function entryFromCreature(creature, source, reviewCreature = null) {
    const runtimeCreature = runtimeById.get(creature.id) ?? null;
    const sourceCandidateId = runtimeCreature?.quality?.sourceCandidateId ?? reviewCreature?.quality?.sourceCandidateId ?? creature.quality?.sourceCandidateId ?? null;
    const sourceCandidate = sourceById.get(sourceCandidateId) ?? null;
    const accepted = threatAcceptedForContentGate(sourceCandidate, runtimeCreature, reviewCreature ?? creature);
    const qualityStatus = runtimeCreature?.quality?.status ?? reviewCreature?.quality?.status ?? creature.quality?.status ?? 'prototype';
    const partCount = runtimeCreature?.parts?.length ?? creature.parts?.length ?? 0;
    const sourceSuffix = sourceCandidateId ? `; source candidate: ${sourceCandidateId}` : '';
    return {
      qualityStatus,
      reviewStage: accepted ? 'accepted' : 'prototype',
      acceptedForContentGate: accepted,
      sourceCandidateId,
      id: creature.id,
      name: creature.species ?? creature.id,
      kind: 'articulated',
      rarity: creature.rarity ?? qualityStatus ?? 'prototype',
      hostile: true,
      source,
      url: creature.sandboxUrl || `/?sandbox=${encodeURIComponent(creature.id)}`,
      notes: `quality: ${qualityStatus}; ${partCount} parts${sourceSuffix}`,
    };
  }

  for (const creature of reviewCreatures) {
    entries.push(entryFromCreature(creature, 'public/review/articulated/review-manifest.json', creature));
    seen.add(creature.id);
  }

  for (const creature of runtime?.creatures ?? []) {
    if (seen.has(creature.id)) continue;
    entries.push(entryFromCreature(creature, 'public/assets/generated/articulated-creatures.parts.json'));
  }

  return entries;
}

async function loadSourceCandidateEntries() {
  const manifest = await readJsonIfPresent(sourceCandidatePath);
  if (manifest?.schema !== 'water9/source-candidates@1') return [];
  return (manifest.candidates ?? [])
    .filter((candidate) => candidate?.source)
    .map((candidate) => ({
      qualityStatus: candidate.status ?? 'unknown',
      reviewStage: candidate.status === 'approved' || candidate.status === 'rigged' ? 'source-approved' : 'source-review',
      id: `source-${candidate.id}`,
      name: `${candidate.species ?? candidate.id} Source`,
      kind: 'source',
      rarity: candidate.status === 'approved' ? 'legendary' : candidate.status === 'needs-review' ? 'rare' : 'common',
      hostile: true,
      textureKey: `source-${candidate.id}`,
      source: 'public/review/source-candidates/source-candidates.json',
      url: `/?entity=${encodeURIComponent(`source-${candidate.id}`)}`,
      notes: `${candidate.status}; ${candidate.source}`,
    }));
}

function parseFishEntries(content) {
  const section = sectionBetween(content, 'export const biomeFish', 'export const biomeFlora');
  const entries = [];
  for (const match of section.matchAll(/\{[^{}]*species:\s*'[^']+'[^{}]*assetKey:\s*'[^']+'[^{}]*\}/g)) {
    const block = match[0];
    const name = property(block, 'species');
    const textureKey = property(block, 'assetKey');
    const hostile = booleanProperty(block, 'hostile');
    if (!name || !textureKey) continue;
    entries.push({
      id: textureKey,
      name,
      kind: 'fish',
      biome: biomeAt(section, match.index ?? 0),
      rarity: rarityForHostile(hostile),
      hostile,
      radius: numberProperty(block, 'radius'),
      textureKey,
      source: 'src/content.ts:biomeFish',
      url: `/?entity=${encodeURIComponent(textureKey)}`,
      notes: hostile ? 'hostile fauna' : 'neutral fauna',
    });
  }
  return entries;
}

function parseFloraEntries(content) {
  const section = sectionBetween(content, 'export const biomeFlora', null);
  const entries = [];
  for (const match of section.matchAll(/\{[^{}]*species:\s*'[^']+'[^{}]*radius:\s*\d+[^{}]*\}/g)) {
    const block = match[0];
    const name = property(block, 'species');
    if (!name) continue;
    const hostile = booleanProperty(block, 'hazardous');
    const rare = booleanProperty(block, 'rare');
    entries.push({
      id: `flora-${slug(name)}`,
      name,
      kind: 'flora',
      biome: biomeAt(section, match.index ?? 0),
      rarity: rare ? 'rare' : hostile ? 'uncommon' : 'common',
      hostile,
      radius: numberProperty(block, 'radius'),
      source: 'src/content.ts:biomeFlora',
      url: `/?entity=${encodeURIComponent(`flora-${slug(name)}`)}`,
      notes: hostile ? 'hazardous scannable flora' : 'scannable flora',
    });
  }
  return entries;
}

function parseShopEntries(content) {
  const section = sectionBetween(content, 'export const shopItems', 'export const biomeFish');
  const entries = [];
  for (const match of section.matchAll(/id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?icon:\s*'([^']+)'/g)) {
    entries.push({
      id: match[1],
      name: match[2],
      kind: 'item',
      rarity: match[1] === 'injector-knife' ? 'rare' : 'uncommon',
      textureKey: match[3],
      source: 'src/content.ts:shopItems',
      url: `/?entity=${encodeURIComponent(match[1])}`,
      notes: `icon: ${match[3]}`,
    });
  }
  return entries;
}

function parseSubEntries(content) {
  const section = sectionBetween(content, 'export const subDefs', 'export const shopItems');
  const entries = [];
  for (const match of section.matchAll(/tier:\s*(\d+)[\s\S]*?name:\s*'([^']+)'/g)) {
    const tier = Number(match[1]);
    entries.push({
      id: `sub-tier${tier}`,
      name: `${match[2]} Sub`,
      kind: 'object',
      rarity: tier === 3 ? 'legendary' : tier === 2 ? 'epic' : 'rare',
      textureKey: `sub-tier${tier}`,
      source: 'src/content.ts:subDefs',
      url: `/?entity=sub-tier${tier}`,
      notes: `tier ${tier} vehicle`,
    });
  }
  return entries;
}

function parseOreEntries(content) {
  const section = sectionBetween(content, 'export const tiles', 'export const upgrades');
  const oreTiles = ['copper', 'quartz', 'ruby', 'cobalt', 'sunstone', 'relic', 'alienAlloy', 'ruinCore'];
  return oreTiles.map((tile) => {
    const escapedTile = tile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const block = section.match(new RegExp(`${escapedTile}:\\s*\\{([^}]+)\\}`))?.[1] ?? '';
    const name = property(block, 'name') ?? tile;
    const value = numberProperty(block, 'value') ?? 0;
    return {
      id: `ore-${tile}`,
      name,
      kind: 'ore',
      rarity: value > 1000 ? 'legendary' : value > 250 ? 'epic' : 'uncommon',
      source: 'src/content.ts:tiles',
      url: `/?entity=${encodeURIComponent(`ore-${tile}`)}`,
      notes: `${value} credits`,
    };
  });
}

function coreEntries() {
  return [
    { id: 'diver', name: 'Diver', kind: 'diver', rarity: 'common', url: '/?entity=diver', source: 'src/scene-sandbox.ts', notes: 'player animation preview' },
    { id: 'barge-platform', name: 'Barge Platform', kind: 'object', rarity: 'rare', textureKey: 'barge-platform', url: '/?entity=barge-platform', source: 'src/scene-sandbox.ts', notes: 'dock object' },
    { id: 'vent-base', name: 'Steam Vent', kind: 'object', rarity: 'uncommon', textureKey: 'vent-base', url: '/?entity=vent-base', source: 'src/scene-sandbox.ts', notes: 'hazard object' },
    { id: 'bobbit', name: 'Bobbit Ambusher', kind: 'object', rarity: 'rare', hostile: true, textureKey: 'bobbit-0', url: '/?entity=bobbit', source: 'src/scene-sandbox.ts', notes: 'latch enemy frames' },
    { id: 'nest-egg', name: 'Predator Nest Egg', kind: 'object', rarity: 'epic', hostile: true, textureKey: 'nest-egg-0', url: '/?entity=nest-egg', source: 'src/scene-sandbox.ts', notes: 'nest hatch trigger' },
  ];
}

function renderHtml(manifest) {
  const rows = manifest.entries.map((entry) => `
          <tr data-kind="${htmlEscape(entry.kind)}" data-stage="${htmlEscape(entry.reviewStage ?? 'reference')}" data-query="${htmlEscape(`${entry.id} ${entry.name} ${entry.kind} ${entry.reviewStage ?? ''} ${entry.biome ?? ''} ${entry.notes ?? ''}`.toLowerCase())}">
            <td><a href="${htmlEscape(entry.url)}">${htmlEscape(entry.id)}</a></td>
            <td>${htmlEscape(entry.name)}</td>
            <td>${htmlEscape(entry.kind)}</td>
            <td>${htmlEscape(entry.reviewStage ?? 'reference')}</td>
            <td>${entry.acceptedForContentGate ? 'yes' : 'no'}</td>
            <td>${htmlEscape(entry.reviewGateLabel ?? reviewGateLabel(entry))}</td>
            <td>${htmlEscape(entry.productionBoundary?.claim ?? acceptanceNotice(entry))}</td>
            <td>${htmlEscape(entry.biome ?? '')}</td>
            <td>${htmlEscape(entry.rarity ?? '')}</td>
            <td>${entry.hostile ? 'yes' : ''}</td>
            <td><a href="${htmlEscape(entry.url)}">open</a>${entry.id === 'diver' ? '' : ` / <a href="${htmlEscape(entry.pairedUrl ?? withCompanion(entry.url))}">with diver</a>`}</td>
            <td><code>${htmlEscape(entry.previewCommand ?? previewCommand(entry))}</code></td>
            <td><code>${htmlEscape(entry.pairedVisualCheckCommand ?? visualCheckCommand(entry, 'diver'))}</code></td>
            <td>${htmlEscape(entry.notes ?? '')}</td>
          </tr>`).join('');

  const kindButtons = ['all', ...Object.keys(manifest.counts.byKind).sort()]
    .map((kind) => `<button type="button" data-kind-filter="${htmlEscape(kind)}">${htmlEscape(kind)}</button>`)
    .join('');
  const stageButtons = ['all', ...Object.keys(manifest.counts.byReviewStage ?? {}).sort()]
    .map((stage) => `<button type="button" data-stage-filter="${htmlEscape(stage)}">${htmlEscape(stage)}</button>`)
    .join('');
  const stageSummary = Object.entries(manifest.counts.byReviewStage ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([stage, count]) => `<span>${htmlEscape(stage)} <strong>${count}</strong></span>`)
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Water 9 Sandbox Index</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #081318; color: #dbeaf0; }
      body { margin: 0; min-height: 100vh; background: linear-gradient(#081318, #051014); }
      main { max-width: 1180px; margin: 0 auto; padding: 28px 18px 48px; }
      h1 { margin: 0 0 8px; font-size: clamp(2rem, 5vw, 4.5rem); letter-spacing: 0; }
      p { margin: 0 0 18px; color: #9fb7c1; line-height: 1.5; }
      .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 18px 0; }
      input { flex: 1 1 260px; min-width: 0; border: 1px solid #294653; border-radius: 6px; background: #0d2028; color: #e7f7fb; padding: 10px 12px; font: inherit; }
      button { border: 1px solid #315262; border-radius: 6px; background: #102934; color: #dbeaf0; padding: 9px 12px; font: inherit; cursor: pointer; }
      button[aria-pressed="true"] { background: #1a5667; border-color: #55aec3; }
	      .summary { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0 20px; }
	      .summary span { border: 1px solid #243f4a; border-radius: 6px; padding: 8px 10px; background: #0c1d24; color: #b8d4dd; }
	      .notice { border: 1px solid #6a5230; border-radius: 6px; background: #1d1710; color: #f0d9aa; padding: 10px 12px; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; background: #09191f; border: 1px solid #223c47; }
      th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #18303a; vertical-align: top; }
      th { position: sticky; top: 0; background: #10242c; color: #e7f7fb; z-index: 1; }
      td { color: #c7dbe2; }
      code { font-family: "SFMono-Regular", Consolas, monospace; color: #cfeef6; overflow-wrap: anywhere; }
      a { color: #7ee8ff; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .muted { color: #79939d; font-size: 0.92rem; }
      @media (max-width: 760px) {
        main { padding: 18px 10px 32px; }
        table { font-size: 0.82rem; }
        th, td { padding: 7px 6px; }
      }
    </style>
  </head>
  <body>
    <main>
	      <h1>Sandbox Index</h1>
	      <p>Open any registered preview entity in the Water 9 sandbox. Run the dev server, then use these links to inspect scale, textures, frame alignment, and articulated motion without a full dive.</p>
	      <div class="notice">Previewable does not mean accepted. Prototype and source-review rows are review aids only; only rows marked Gate Accepted count toward the strict content gate.</div>
	      <p class="muted">Generated from ${htmlEscape(manifest.generatedFrom.join(', '))}.</p>
      <div class="summary">
        <span>${manifest.entries.length} entries</span>
        <span>${manifest.counts.articulated} articulated threats</span>
        <span>${manifest.counts.hostile} hostile previews</span>
        ${stageSummary}
      </div>
      <div class="toolbar">
        <input id="search" type="search" placeholder="Filter by id, name, kind, biome, notes">
        ${kindButtons}
      </div>
      <div class="toolbar" aria-label="Gate stage filters">
        ${stageButtons}
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Kind</th>
	            <th>Review Stage</th>
            <th>Gate Accepted</th>
            <th>Review Banner</th>
            <th>Production Boundary</th>
            <th>Biome</th>
            <th>Rarity</th>
            <th>Hostile</th>
            <th>Open</th>
            <th>Preview Command</th>
            <th>Paired Visual Check</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </main>
    <script>
      const search = document.querySelector('#search');
      const kindButtons = [...document.querySelectorAll('[data-kind-filter]')];
      const stageButtons = [...document.querySelectorAll('[data-stage-filter]')];
      const rows = [...document.querySelectorAll('tbody tr')];
      let kind = 'all';
      let stage = 'all';

      function update() {
        const query = search.value.trim().toLowerCase();
        for (const row of rows) {
          const kindMatches = kind === 'all' || row.dataset.kind === kind;
          const stageMatches = stage === 'all' || row.dataset.stage === stage;
          const queryMatches = !query || row.dataset.query.includes(query);
          row.hidden = !(kindMatches && stageMatches && queryMatches);
        }
        for (const button of kindButtons) button.setAttribute('aria-pressed', button.dataset.kindFilter === kind ? 'true' : 'false');
        for (const button of stageButtons) button.setAttribute('aria-pressed', button.dataset.stageFilter === stage ? 'true' : 'false');
      }

      search.addEventListener('input', update);
      for (const button of kindButtons) button.addEventListener('click', () => {
        kind = button.dataset.kindFilter;
        update();
      });
      for (const button of stageButtons) button.addEventListener('click', () => {
        stage = button.dataset.stageFilter;
        update();
      });
      update();
    </script>
  </body>
</html>
`;
}

function renderLabHtml(manifest) {
  const data = JSON.stringify({
    generatedAt: manifest.generatedAt,
    counts: manifest.counts,
    contentPipeline: manifest.contentPipeline,
    entries: manifest.entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      reviewStage: entry.reviewStage ?? 'reference',
      qualityStatus: entry.qualityStatus ?? null,
      acceptedForContentGate: Boolean(entry.acceptedForContentGate),
      url: entry.url,
      pairedUrl: entry.pairedUrl ?? withCompanion(entry.url),
      previewCommand: entry.previewCommand,
      pairedPreviewCommand: entry.pairedPreviewCommand,
      visualCheckCommand: entry.visualCheckCommand,
      pairedVisualCheckCommand: entry.pairedVisualCheckCommand,
      acceptanceNotice: entry.acceptanceNotice,
      productionBoundary: entry.productionBoundary,
      pipeline: entry.pipeline ?? null,
      notes: entry.notes ?? '',
      reviewGateLabel: entry.reviewGateLabel,
      reviewGateSeverity: entry.reviewGateSeverity,
    })),
  })
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  const options = manifest.entries.map((entry) => `<option value="${htmlEscape(entry.id)}">${htmlEscape(entry.name)} (${htmlEscape(entry.id)})</option>`).join('\n');
  const kindButtons = ['all', ...Object.keys(manifest.counts.byKind).sort()]
    .map((kind) => `<button type="button" data-kind-filter="${htmlEscape(kind)}">${htmlEscape(kind)}</button>`)
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Water 9 Sandbox Lab</title>
    <style>
      :root { color-scheme: dark; --bg:#061014; --panel:#0c1d24; --line:#294653; --text:#e5f6f8; --muted:#96aeb8; --accent:#7ee8ff; --warn:#f0d9aa; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-height:100vh; background:#061014; color:var(--text); }
      main { display:grid; grid-template-columns:minmax(320px,420px) 1fr; min-height:100vh; }
      aside { border-right:1px solid var(--line); background:#081920; padding:18px; overflow:auto; }
      section { min-width:0; display:grid; grid-template-rows:auto 1fr; }
      h1 { margin:0 0 8px; font-size:28px; letter-spacing:0; }
      h2 { margin:0; font-size:18px; }
      p { color:var(--muted); line-height:1.45; }
      label { display:grid; gap:6px; margin:12px 0; color:var(--muted); }
      select, input, textarea { width:100%; border:1px solid var(--line); border-radius:6px; background:#051014; color:var(--text); padding:9px 10px; font:inherit; }
      textarea { min-height:84px; resize:vertical; font-family:"SFMono-Regular",Consolas,monospace; }
      button, a.button { border:1px solid #315262; border-radius:6px; background:#102934; color:var(--text); padding:8px 10px; font:inherit; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
      button[aria-pressed="true"] { background:#1a5667; border-color:#55aec3; }
      .filters, .actions, .stats { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0; }
      .stats span { border:1px solid var(--line); border-radius:6px; background:#0b1b22; padding:7px 9px; color:var(--muted); }
      .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:var(--warn); padding:10px 12px; margin:12px 0; }
      .meta { border:1px solid var(--line); border-radius:6px; background:var(--panel); padding:12px; margin:12px 0; }
      .meta dl { display:grid; grid-template-columns:110px 1fr; gap:6px 8px; margin:0; }
      .meta dt { color:var(--muted); }
      .meta dd { margin:0; overflow-wrap:anywhere; }
      .pipeline { border:1px solid #315262; border-radius:6px; background:#07161c; padding:12px; margin:12px 0; }
      .pipeline h2 { margin-bottom:8px; }
      .pipeline-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin:8px 0; }
      .pipeline-grid span { border:1px solid var(--line); border-radius:5px; padding:7px; background:#0b1b22; color:var(--muted); }
      .pipeline-grid strong { color:var(--text); display:block; }
      .stagebar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; border-bottom:1px solid var(--line); padding:12px 14px; background:#07161c; }
      .stagebar code { color:var(--accent); }
      iframe { width:100%; height:100%; min-height:620px; border:0; background:#02080b; }
      .hidden { display:none; }
      @media (max-width:920px) { main { grid-template-columns:1fr; } aside { border-right:0; border-bottom:1px solid var(--line); } iframe { min-height:520px; } }
    </style>
  </head>
  <body>
    <main data-sandbox-lab>
      <aside>
        <h1>Sandbox Lab</h1>
        <p>Single-page preview station for any registered Water 9 sandbox entity. Use paired mode to keep the diver in-frame for scale and behavior review.</p>
        <div class="notice" data-acceptance-notice>Previewable does not mean accepted.</div>
        <div class="stats">
          <span>${manifest.entries.length} entries</span>
          <span>${manifest.counts.articulated} articulated</span>
          <span>${manifest.counts.hostile} hostile</span>
          <span>${manifest.counts.previewOnly} preview-only</span>
        </div>
        <label>Search
          <input data-search type="search" placeholder="Filter entities">
        </label>
        <div class="filters">${kindButtons}</div>
        <label>Entity
          <select data-entity-select>${options}</select>
        </label>
        <label>
          <input data-with-diver type="checkbox">
          with diver companion
        </label>
        <div class="actions">
          <a class="button" data-open-preview href="/">Open Preview</a>
          <button type="button" data-copy-preview>Copy Preview Command</button>
          <button type="button" data-copy-visual>Copy Visual Check</button>
        </div>
        <div class="meta">
          <h2 data-entity-title>Entity</h2>
          <dl>
            <dt>id</dt><dd><code data-entity-id></code></dd>
            <dt>kind</dt><dd data-entity-kind></dd>
            <dt>stage</dt><dd data-entity-stage></dd>
            <dt>quality</dt><dd data-entity-quality></dd>
            <dt>gate</dt><dd data-entity-gate></dd>
            <dt>banner</dt><dd data-entity-banner></dd>
            <dt>boundary</dt><dd data-entity-boundary></dd>
            <dt>notes</dt><dd data-entity-notes></dd>
          </dl>
        </div>
        <div class="pipeline" data-new-threat-pipeline>
          <h2>New Threat Pipeline</h2>
          <div class="pipeline-grid">
            <span>accepted<strong data-pipeline-accepted>${manifest.contentPipeline?.summary?.acceptedThreats ?? 0}/${manifest.contentPipeline?.summary?.targetThreats ?? 20}</strong></span>
            <span>runtime missing<strong data-pipeline-missing>${manifest.contentPipeline?.summary?.missingRuntime ?? 0}</strong></span>
            <span>source approved<strong data-pipeline-approved>${manifest.contentPipeline?.summary?.approvedSources ?? 0}</strong></span>
            <span>next blocker<strong data-pipeline-bottleneck>${htmlEscape(manifest.contentPipeline?.summary?.nextBottleneck ?? 'unknown')}</strong></span>
          </div>
          <dl>
            <dt>candidate</dt><dd><code data-pipeline-candidate></code></dd>
            <dt>stage</dt><dd data-pipeline-stage></dd>
            <dt>runtime</dt><dd data-pipeline-runtime></dd>
            <dt>source</dt><dd data-pipeline-source></dd>
          </dl>
          <label>Next action
            <textarea data-pipeline-next-action readonly></textarea>
          </label>
        </div>
        <label>Preview command
          <textarea data-preview-command readonly></textarea>
        </label>
        <label>Visual check command
          <textarea data-visual-command readonly></textarea>
        </label>
      </aside>
      <section>
        <div class="stagebar">
          <strong data-stage-title>Sandbox Preview</strong>
          <code data-stage-url></code>
        </div>
        <iframe data-preview-frame title="Water 9 sandbox entity preview"></iframe>
      </section>
      <script type="application/json" data-sandbox-lab-data>${data}</script>
    </main>
    <script>
      (() => {
        const root = document.querySelector('[data-sandbox-lab]');
        const data = JSON.parse(root.querySelector('[data-sandbox-lab-data]').textContent);
        let entries = data.entries;
        let kind = 'all';
        const byId = new Map(entries.map((entry) => [entry.id, entry]));
        const select = root.querySelector('[data-entity-select]');
        const withDiver = root.querySelector('[data-with-diver]');
        const search = root.querySelector('[data-search]');
        const frame = root.querySelector('[data-preview-frame]');
        const openPreview = root.querySelector('[data-open-preview]');
        const previewCommand = root.querySelector('[data-preview-command]');
        const visualCommand = root.querySelector('[data-visual-command]');

        const params = new URLSearchParams(location.search);
        const requested = params.get('id') || params.get('entity') || params.get('sandbox');
        if (requested && byId.has(requested)) select.value = requested;
        else if (byId.has('abyssal-gulper')) select.value = 'abyssal-gulper';
        withDiver.checked = params.get('with') === 'diver' || params.get('companion') === 'diver';

        function currentEntry() {
          return byId.get(select.value) || entries[0];
        }
        function filteredEntries() {
          const query = search.value.trim().toLowerCase();
          return entries.filter((entry) => {
            const kindMatches = kind === 'all' || entry.kind === kind;
            const haystack = [entry.id, entry.name, entry.kind, entry.reviewStage, entry.notes].join(' ').toLowerCase();
            const queryMatches = !query || haystack.includes(query);
            return kindMatches && queryMatches;
          });
        }
        function refreshOptions() {
          const active = select.value;
          const filtered = filteredEntries();
          select.innerHTML = filtered.map((entry) => '<option value="' + entry.id + '">' + entry.name + ' (' + entry.id + ')</option>').join('');
          select.value = filtered.some((entry) => entry.id === active) ? active : filtered[0]?.id || entries[0].id;
        }
        function render() {
          const entry = currentEntry();
          const paired = withDiver.checked && entry.id !== 'diver';
          const url = paired ? entry.pairedUrl : entry.url;
          const command = paired ? entry.pairedPreviewCommand : entry.previewCommand;
          const visual = paired ? entry.pairedVisualCheckCommand : entry.visualCheckCommand;
          frame.src = url;
          openPreview.href = url;
          previewCommand.value = command;
          visualCommand.value = visual;
          root.querySelector('[data-stage-url]').textContent = url;
          root.querySelector('[data-stage-title]').textContent = entry.name;
          root.querySelector('[data-entity-title]').textContent = entry.name;
          root.querySelector('[data-entity-id]').textContent = entry.id;
          root.querySelector('[data-entity-kind]').textContent = entry.kind;
          root.querySelector('[data-entity-stage]').textContent = entry.reviewStage;
          root.querySelector('[data-entity-quality]').textContent = entry.qualityStatus || 'n/a';
          root.querySelector('[data-entity-gate]').textContent = entry.acceptedForContentGate ? 'counts toward gate' : 'not accepted';
          root.querySelector('[data-entity-banner]').textContent = entry.reviewGateLabel || 'Review banner missing.';
          root.querySelector('[data-entity-boundary]').textContent = entry.productionBoundary?.claim || entry.acceptanceNotice || 'Preview boundary missing.';
          root.querySelector('[data-entity-notes]').textContent = entry.notes || 'none';
          root.querySelector('[data-acceptance-notice]').textContent = entry.acceptanceNotice || 'Previewable does not mean accepted.';
          const pipeline = entry.pipeline || {};
          root.querySelector('[data-pipeline-candidate]').textContent = pipeline.id || 'not a 20-threat candidate';
          root.querySelector('[data-pipeline-stage]').textContent = pipeline.stage || 'reference';
          root.querySelector('[data-pipeline-runtime]').textContent = pipeline.runtimeRegistered === true ? 'registered' : pipeline.runtimeRegistered === false ? 'missing' : 'n/a';
          root.querySelector('[data-pipeline-source]').textContent = pipeline.sourceApproved === true ? 'approved' : pipeline.sourceApproved === false ? 'needs review' : 'n/a';
          root.querySelector('[data-pipeline-next-action]').value = pipeline.nextAction || 'No strict content-pipeline action for this reference entry.';
          history.replaceState(null, '', 'lab.html?id=' + encodeURIComponent(entry.id) + (paired ? '&with=diver' : ''));
        }
        function update() {
          refreshOptions();
          render();
          for (const button of root.querySelectorAll('[data-kind-filter]')) {
            button.setAttribute('aria-pressed', button.dataset.kindFilter === kind ? 'true' : 'false');
          }
        }
        for (const button of root.querySelectorAll('[data-kind-filter]')) {
          button.addEventListener('click', () => { kind = button.dataset.kindFilter; update(); });
        }
        search.addEventListener('input', update);
        select.addEventListener('change', render);
        withDiver.addEventListener('change', render);
        root.querySelector('[data-copy-preview]').addEventListener('click', async () => navigator.clipboard?.writeText(previewCommand.value));
        root.querySelector('[data-copy-visual]').addEventListener('click', async () => navigator.clipboard?.writeText(visualCommand.value));
        update();
      })();
    </script>
  </body>
</html>
`;
}

const content = await readFile(contentPath, 'utf8');
const runtimeCoverage = await readJsonIfPresent(contentRuntimeCoveragePath);
const stageBoard = await readJsonIfPresent(contentStageBoardPath);
const entries = [];
const seen = new Set();

for (const group of [
  await loadArticulatedEntries(),
  await loadSourceCandidateEntries(),
  coreEntries(),
  parseFishEntries(content),
  parseFloraEntries(content),
  parseShopEntries(content),
  parseSubEntries(content),
  parseOreEntries(content),
]) {
  for (const entry of group) addEntry(entries, seen, entry);
}

for (const entry of entries) {
  if (entry.id !== 'diver') entry.pairedUrl = withCompanion(entry.url);
  entry.reviewStage = entry.reviewStage ?? 'reference';
  const candidateId = candidateIdForEntry(entry);
  const runtimeItem = (runtimeCoverage?.items ?? []).find((item) => item.id === candidateId || item.runtimeId === entry.id);
  const stageTarget = (stageBoard?.targets ?? []).find((target) => target.id === candidateId || target.rigId === entry.id);
  if (runtimeItem || stageTarget) {
    entry.sourceCandidateId = candidateId;
    entry.pipeline = {
      id: candidateId,
      species: runtimeItem?.species ?? stageTarget?.species ?? entry.name,
      stage: stageTarget?.stage ?? runtimeItem?.stage ?? 'unknown',
      sourceApproved: Boolean(runtimeItem?.sourceApproved ?? stageTarget?.sourceApproved),
      runtimeRegistered: Boolean(runtimeItem?.runtimeRegistered ?? stageTarget?.sandboxComplete),
      runtimeId: runtimeItem?.runtimeId ?? stageTarget?.rigId ?? null,
      accepted: Boolean(runtimeItem?.accepted ?? stageTarget?.accepted),
      nextAction: runtimeItem?.nextAction ?? stageTarget?.nextCommands?.[0] ?? null,
      riggingCommand: runtimeItem?.riggingCommand ?? null,
    };
  }
  entry.acceptedForContentGate = acceptedForContentGate(entry);
  entry.acceptanceNotice = acceptanceNotice(entry);
  entry.productionBoundary = productionBoundary(entry);
  entry.reviewGateLabel = reviewGateLabel(entry);
  entry.reviewGateSeverity = reviewGateSeverity(entry);
  entry.previewCommand = previewCommand(entry);
  entry.pairedPreviewCommand = previewCommand(entry, 'diver');
  entry.visualCheckCommand = visualCheckCommand(entry);
  entry.pairedVisualCheckCommand = visualCheckCommand(entry, 'diver');
}

entries.sort((a, b) => `${a.kind}:${a.name}`.localeCompare(`${b.kind}:${b.name}`));

const countsByKind = {};
for (const entry of entries) countsByKind[entry.kind] = (countsByKind[entry.kind] ?? 0) + 1;
const countsByReviewStage = {};
for (const entry of entries) {
  const stage = entry.reviewStage ?? 'reference';
  countsByReviewStage[stage] = (countsByReviewStage[stage] ?? 0) + 1;
}

const manifest = {
  schema,
  generatedAt: new Date().toISOString(),
  generatedFrom: [
    'src/content.ts',
    'src/scene-sandbox.ts',
    'public/review/articulated/review-manifest.json',
    'public/assets/generated/articulated-creatures.parts.json',
    'public/review/source-candidates/source-candidates.json',
    'public/review/content-runtime-coverage.json',
    'public/review/content-stage-board.json',
  ],
  counts: {
    total: entries.length,
    byKind: countsByKind,
    byReviewStage: countsByReviewStage,
    articulated: countsByKind.articulated ?? 0,
    hostile: entries.filter((entry) => entry.hostile).length,
    previewOnly: entries.filter((entry) => entry.productionBoundary?.previewOnly === true).length,
  },
  contentPipeline: {
    schema: 'water9/sandbox-content-pipeline-summary@1',
    summary: {
      targetThreats: stageBoard?.summary?.targetThreats ?? runtimeCoverage?.summary?.candidates ?? 20,
      acceptedThreats: stageBoard?.summary?.acceptedThreats ?? runtimeCoverage?.summary?.acceptedThreats ?? 0,
      approvedSources: runtimeCoverage?.summary?.approvedSources ?? 0,
      runtimeRegistered: runtimeCoverage?.summary?.runtimeRegistered ?? 0,
      missingRuntime: runtimeCoverage?.summary?.missingRuntime ?? 0,
      nextBottleneck: stageBoard?.summary?.nextBottleneck ?? runtimeCoverage?.summary?.nextBottleneck ?? 'unknown',
    },
    stages: stageBoard?.summary?.stageCounts ?? {},
    targetCount: stageBoard?.targets?.length ?? runtimeCoverage?.items?.length ?? 0,
  },
  entries,
};

await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(resolve(outDir, 'index.html'), renderHtml(manifest));
await writeFile(resolve(outDir, 'lab.html'), renderLabHtml(manifest));

console.log(JSON.stringify({
  outDir,
  entries: manifest.counts.total,
  byKind: manifest.counts.byKind,
}, null, 2));
