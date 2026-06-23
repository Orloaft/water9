import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function run(args, expectStatus = 0) {
  const result = spawnSync(process.execPath, ['tools/preview_sandbox_entity.mjs', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== expectStatus) {
    throw new Error(`preview command ${args.join(' ')} exited ${result.status}, expected ${expectStatus}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return result;
}

function parseJsonOutput(result) {
  const text = (result.stdout || result.stderr || '').trim();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`could not parse JSON output: ${error.message}\n${text}`);
  }
}

const failures = [];
const allEntryKinds = new Map();

function readSandboxManifest() {
  try {
    const manifest = JSON.parse(readFileSync('public/review/sandbox/manifest.json', 'utf8'));
    if (manifest.schema !== 'water9/sandbox-index@1') {
      failures.push(`sandbox manifest schema was ${manifest.schema ?? 'missing'}`);
    }
    if (!Array.isArray(manifest.entries) || !manifest.entries.length) {
      failures.push('sandbox manifest has no entries');
      return [];
    }
    return manifest.entries;
  } catch (error) {
    failures.push(`could not read sandbox manifest: ${error.message}`);
    return [];
  }
}

function assertPreviewPayload(entry, payload, label) {
  if (!payload.found) failures.push(`${label}: preview was not found`);
  if (payload.id !== entry.id) failures.push(`${label}: returned id ${payload.id}, expected ${entry.id}`);
  if (payload.kind !== entry.kind) failures.push(`${label}: returned kind ${payload.kind}, expected ${entry.kind}`);
  if (!String(payload.url ?? '').startsWith('http://127.0.0.1:')) failures.push(`${label}: preview URL is not local: ${payload.url}`);
  if (!String(payload.relativeUrl ?? '').includes('?')) failures.push(`${label}: relative URL is missing query parameters: ${payload.relativeUrl}`);
  if (typeof payload.productionReady !== 'boolean') failures.push(`${label}: missing productionReady boolean`);
  if (typeof payload.acceptedForContentGate !== 'boolean') failures.push(`${label}: missing acceptedForContentGate boolean`);
  if (!String(payload.acceptanceNotice ?? '').trim()) failures.push(`${label}: missing acceptance notice`);
  if (!String(payload.reviewGateLabel ?? '').trim()) failures.push(`${label}: missing reviewGateLabel`);
  if (!['accepted', 'preview-only', 'reference'].includes(payload.reviewGateSeverity ?? '')) failures.push(`${label}: invalid reviewGateSeverity ${payload.reviewGateSeverity ?? 'missing'}`);
  if (payload.productionBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${label}: missing production boundary`);
  if (payload.productionBoundary?.productionReady !== payload.acceptedForContentGate) failures.push(`${label}: production boundary readiness mismatch`);
  if (payload.acceptedForContentGate === false && payload.productionBoundary?.previewOnly !== true) failures.push(`${label}: non-accepted preview must be marked preview-only`);
  if (payload.productionBoundary?.reviewStage !== payload.reviewStage) failures.push(`${label}: production boundary reviewStage mismatch`);
  if (entry.kind === 'articulated' && !String(payload.manualReviewRequired ?? '').includes('human acceptance')) {
    failures.push(`${label}: articulated preview must flag human acceptance requirement`);
  }
  if (entry.kind === 'articulated' && entry.acceptedForContentGate !== true && !String(payload.reviewGateLabel).includes('PREVIEW ONLY PROTOTYPE - NOT ACCEPTED')) {
    failures.push(`${label}: articulated preview must visibly flag preview-only prototype status`);
  }
  if (entry.kind === 'source' && !String(payload.manualReviewRequired ?? '').includes('source image human approval')) {
    failures.push(`${label}: source preview must flag human source approval requirement`);
  }
  if (entry.kind === 'source' && entry.acceptedForContentGate !== true && !String(payload.reviewGateLabel).includes('SOURCE REVIEW NEEDED')) {
    failures.push(`${label}: source preview must visibly flag source review need`);
  }
}

try {
  const payload = parseJsonOutput(run(['--id', 'diver', '--json']));
  if (!payload.found) failures.push('diver preview was not found');
  if (payload.id !== 'diver') failures.push(`diver preview returned id ${payload.id}`);
  if (payload.kind !== 'diver') failures.push(`diver preview kind was ${payload.kind}`);
  if (payload.reviewStage !== 'reference') failures.push(`diver preview reviewStage was ${payload.reviewStage}`);
  if (payload.productionReady !== false) failures.push('diver preview should not report productionReady');
  if (!String(payload.url ?? '').includes('?entity=diver')) failures.push(`diver preview URL is wrong: ${payload.url}`);
  if (typeof payload.rebuiltIndex !== 'boolean') failures.push('diver preview did not report rebuiltIndex boolean');
  if (payload.rebuiltIndex !== false) failures.push('diver preview should be read-only by default');
} catch (error) {
  failures.push(error.message);
}

try {
  const payload = parseJsonOutput(run(['--list', '--kind', 'diver', '--limit', '1', '--json', '--rebuild']));
  if (payload.rebuiltIndex !== true) failures.push('explicit --rebuild did not report rebuiltIndex true');
  if (!Array.isArray(payload.rows) || payload.rows.length !== 1 || payload.rows[0].id !== 'diver') {
    failures.push('explicit rebuild list did not return the diver row');
  }
} catch (error) {
  failures.push(error.message);
}

try {
  const payload = parseJsonOutput(run(['--id', 'abyssal-gulper', '--with', 'diver', '--json']));
  if (!payload.found) failures.push('paired gulper preview was not found');
  if (payload.id !== 'abyssal-gulper') failures.push(`paired gulper preview returned id ${payload.id}`);
  if (payload.companion !== 'diver') failures.push(`paired gulper companion was ${payload.companion}`);
  if (payload.reviewStage !== 'prototype') failures.push(`paired gulper reviewStage was ${payload.reviewStage}`);
  if (payload.qualityStatus !== 'prototype') failures.push(`paired gulper qualityStatus was ${payload.qualityStatus}`);
  if (payload.productionReady !== false) failures.push('paired gulper should not report productionReady');
  if (!String(payload.manualReviewRequired ?? '').includes('human acceptance')) failures.push(`paired gulper manualReviewRequired was ${payload.manualReviewRequired}`);
  if (!String(payload.url ?? '').includes('?sandbox=abyssal-gulper&companion=diver')) {
    failures.push(`paired gulper preview URL is wrong: ${payload.url}`);
  }
  if (!String(payload.pairedUrl ?? '').includes('?sandbox=abyssal-gulper&companion=diver')) {
    failures.push(`paired gulper paired URL is wrong: ${payload.pairedUrl}`);
  }
} catch (error) {
  failures.push(error.message);
}

try {
  const payload = parseJsonOutput(run(['--id', 'abyssal-gulper', '--with', 'diver', '--visual', '--json']));
  if (!String(payload.visualCheckCommand ?? '').includes('--with diver')) {
    failures.push(`paired gulper visual command dropped companion: ${payload.visualCheckCommand}`);
  }
  if (!String(payload.pairedVisualCheckCommand ?? '').includes('--with diver')) {
    failures.push(`paired gulper paired visual command is wrong: ${payload.pairedVisualCheckCommand}`);
  }
  if (!String(payload.pairedVisualCheckCommand ?? '').includes('--states idle,lunge,stunned')) {
    failures.push(`paired articulated visual command dropped states: ${payload.pairedVisualCheckCommand}`);
  }
} catch (error) {
  failures.push(error.message);
}

try {
  const payload = parseJsonOutput(run(['--list', '--kind', 'articulated', '--limit', '3', '--json']));
  if (payload.count < 1) failures.push('articulated list returned no entries');
  if (!Array.isArray(payload.rows) || payload.rows.length !== 3) failures.push(`articulated list returned ${payload.rows?.length ?? 'non-array'} rows`);
  if (!payload.rows.every((row) => row.kind === 'articulated')) failures.push('articulated list included a non-articulated row');
  if (!payload.rows.every((row) => row.reviewStage === 'prototype' || row.reviewStage === 'accepted')) failures.push('articulated list row missing accepted/prototype reviewStage');
  if (!payload.rows.every((row) => typeof row.productionReady === 'boolean')) failures.push('articulated list row missing productionReady boolean');
  if (!payload.rows.every((row) => row.productionBoundary?.schema === 'water9/sandbox-production-boundary@1')) failures.push('articulated list row missing productionBoundary');
  if (!payload.rows.every((row) => String(row.reviewGateLabel ?? '').includes(row.acceptedForContentGate ? 'ACCEPTED' : 'PREVIEW ONLY'))) failures.push('articulated list row missing reviewGateLabel');
  if (!payload.rows.every((row) => row.reviewGateSeverity === (row.acceptedForContentGate ? 'accepted' : 'preview-only'))) failures.push('articulated list row missing reviewGateSeverity');
  if (!payload.rows.every((row) => row.acceptedForContentGate || row.productionBoundary?.previewOnly === true)) failures.push('articulated list non-accepted row must be preview-only');
  if (!payload.rows.every((row) => String(row.previewCommand ?? '').includes(`--id ${row.id}`))) failures.push('articulated list row missing target-aware previewCommand');
  if (!payload.rows.every((row) => String(row.pairedPreviewCommand ?? '').includes(`--id ${row.id} --with diver`))) failures.push('articulated list row missing pairedPreviewCommand');
  if (!payload.rows.every((row) => String(row.pairedVisualCheckCommand ?? '').includes(`--ids ${row.id}`) && String(row.pairedVisualCheckCommand ?? '').includes('--with diver'))) {
    failures.push('articulated list row missing paired visual check command');
  }
} catch (error) {
  failures.push(error.message);
}

try {
  const payload = parseJsonOutput(run(['--id', 'gulper', '--kind', 'articulated', '--with', 'diver', '--json']));
  if (!payload.found) failures.push('alias gulper preview was not found');
  if (payload.id !== 'abyssal-gulper') failures.push(`alias gulper returned id ${payload.id}`);
  if (payload.requestedId !== 'gulper') failures.push(`alias gulper requestedId was ${payload.requestedId}`);
  if (payload.resolvedByAlias !== true) failures.push('alias gulper should report resolvedByAlias true');
  if (payload.resolutionMethod !== 'curated-alias') failures.push(`alias gulper resolutionMethod was ${payload.resolutionMethod}`);
  if (payload.resolvedByBestMatch !== false) failures.push('alias gulper should not report resolvedByBestMatch true');
  if (payload.kind !== 'articulated') failures.push(`alias gulper kind was ${payload.kind}`);
  if (payload.companion !== 'diver') failures.push(`alias gulper companion was ${payload.companion}`);
  if (!String(payload.url ?? '').includes('?sandbox=abyssal-gulper&companion=diver')) {
    failures.push(`alias gulper URL is wrong: ${payload.url}`);
  }
} catch (error) {
  failures.push(error.message);
}

try {
  const payload = parseJsonOutput(run(['--id', 'hadal-trencher-isopod', '--kind', 'source', '--json']));
  if (!payload.found) failures.push('source alias hadal-trencher-isopod preview was not found');
  if (payload.id !== 'source-hadal-trencher-isopod') failures.push(`source alias returned id ${payload.id}`);
  if (payload.kind !== 'source') failures.push(`source alias kind was ${payload.kind}`);
  if (!['source-review', 'source-approved'].includes(payload.reviewStage)) failures.push(`source alias reviewStage was ${payload.reviewStage}`);
  if (!String(payload.url ?? '').includes('?entity=source-hadal-trencher-isopod')) failures.push(`source alias URL is wrong: ${payload.url}`);
  if (!String(payload.pairedUrl ?? '').includes('?entity=source-hadal-trencher-isopod&companion=diver')) failures.push(`source alias paired URL is wrong: ${payload.pairedUrl}`);
} catch (error) {
  failures.push(error.message);
}

try {
  const payload = parseJsonOutput(run(['--id', 'gulperzz', '--json'], 1));
  if (payload.found !== false) failures.push('unknown query should not resolve exactly');
  if (!Array.isArray(payload.suggestions) || !payload.suggestions.length) failures.push('unknown query did not provide suggestions');
  if (!payload.suggestions.every((suggestion) => String(suggestion.previewCommand ?? '').startsWith('npm run sandbox:preview -- --id '))) {
    failures.push('unknown query suggestions should include preview commands');
  }
  if (!payload.next?.includes('npm run sandbox:index')) failures.push('unknown query did not include sandbox:index recovery command');
  if (!payload.next?.includes('npm run sandbox:preview -- --list --rebuild')) failures.push('unknown query did not include explicit rebuild preview command');
  if (!payload.next?.some((command) => command.includes('--best'))) failures.push('unknown query did not suggest --best resolution');
} catch (error) {
  failures.push(error.message);
}

try {
  const entries = readSandboxManifest();
  for (const entry of entries) {
    allEntryKinds.set(entry.kind, (allEntryKinds.get(entry.kind) ?? 0) + 1);
    const payload = parseJsonOutput(run(['--id', entry.id, '--json']));
    assertPreviewPayload(entry, payload, entry.id);
    if (entry.kind === 'articulated') {
      const paired = parseJsonOutput(run(['--id', entry.id, '--with', 'diver', '--visual', '--json']));
      assertPreviewPayload(entry, paired, `${entry.id} paired`);
      if (paired.companion !== 'diver') failures.push(`${entry.id}: paired preview dropped diver companion`);
      if (!String(paired.url ?? '').includes('&companion=diver')) failures.push(`${entry.id}: paired URL dropped diver companion`);
      if (!String(paired.pairedVisualCheckCommand ?? '').includes(`--ids ${entry.id}`)) {
        failures.push(`${entry.id}: paired visual command does not target this entity`);
      }
      if (!String(paired.pairedVisualCheckCommand ?? '').includes('--with diver')) {
        failures.push(`${entry.id}: paired visual command dropped diver companion`);
      }
      if (!String(paired.pairedVisualCheckCommand ?? '').includes('--states idle,lunge,stunned')) {
        failures.push(`${entry.id}: paired visual command dropped articulated states`);
      }
    }
  }
} catch (error) {
  failures.push(error.message);
}

const summary = {
  schema: 'water9/sandbox-preview-smoke@1',
  tests: [
    'id-json',
    'explicit-rebuild-json',
    'paired-companion-json',
    'paired-visual-command-json',
    'list-kind-json',
    'curated-alias-json',
    'source-alias-json',
    'unknown-suggestions',
    'all-manifest-entry-preview-json',
    'all-articulated-paired-preview-json',
  ],
  allEntryKinds: Object.fromEntries([...allEntryKinds.entries()].sort(([left], [right]) => left.localeCompare(right))),
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
