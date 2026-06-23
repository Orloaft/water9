import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  approvalRunway: resolve(String(args.get('approval-runway') ?? 'public/review/source-approval-runway.json')),
  criticHealth: resolve(String(args.get('critic-health') ?? 'public/review/source-candidates/source-critic-regeneration-health.json')),
  contentReviewSession: resolve(String(args.get('content-review-session') ?? 'public/review/content-review-session.json')),
  outJson: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/source-review-sequencer.json')),
  outMarkdown: resolve(String(args.get('out') ?? 'public/review/source-candidates/source-review-sequencer.md')),
  outHtml: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/source-review-sequencer.html')),
};

const LANE_ORDER = [
  'regenerate-distinct-ready',
  'regenerate-noop',
  'regenerate-missing',
  'regenerate-invalid',
  'approval-ready',
  'approved',
];

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function repoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function commandValues(commands) {
  return Object.values(commands ?? {}).filter(Boolean);
}

function firstDefined(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== '') ?? null;
}

function laneFor({ approval, health }) {
  if (approval.humanApproved) return 'approved';
  if (health?.status === 'distinct-replacement-ready') return 'regenerate-distinct-ready';
  if (health?.status === 'replacement-applied') return 'approval-ready';
  if (health?.status === 'valid-noop-replacement') return 'regenerate-noop';
  if (health?.status === 'replacement-missing') return 'regenerate-missing';
  if (health?.status === 'replacement-invalid') return 'regenerate-invalid';
  return 'approval-ready';
}

function actionForLane({ lane, approval, health }) {
  if (lane === 'regenerate-distinct-ready') {
    return {
      status: 'distinct replacement ready for dry-run ingest',
      recommendedFirst: health.commands?.validateInbox ?? health.nextCommands?.[0] ?? null,
      nextCommands: [
        health.commands?.validateInbox,
        health.commands?.dryRunReplace,
        health.commands?.sourcePreview,
        health.commands?.applyReplace,
        health.commands?.rebuildEvidence,
      ].filter(Boolean),
    };
  }
  if (lane === 'regenerate-noop') {
    return {
      status: 'replacement is byte-identical to current source; generate distinct art',
      recommendedFirst: health.commands?.openPrompt ?? health.nextCommands?.[0] ?? null,
      nextCommands: [
        health.commands?.openPrompt,
        health.commands?.markImagegen,
        health.commands?.checkImagegen,
        health.commands?.ingestImagegen,
        health.commands?.captureManual,
        health.commands?.recoverSavedImage,
        health.commands?.generateOpenAiDryRun,
        health.commands?.generateOpenAiApply,
      ].filter(Boolean),
    };
  }
  if (lane === 'regenerate-missing') {
    return {
      status: 'replacement missing; generate or capture source art',
      recommendedFirst: health.commands?.openPrompt ?? health.nextCommands?.[0] ?? null,
      nextCommands: [
        health.commands?.openPrompt,
        health.commands?.captureManual,
        health.commands?.recoverSavedImage,
        health.commands?.markImagegen,
        health.commands?.checkImagegen,
        health.commands?.generateOpenAiDryRun,
      ].filter(Boolean),
    };
  }
  if (lane === 'regenerate-invalid') {
    return {
      status: 'replacement invalid; fix image before any ingest',
      recommendedFirst: health.commands?.validateInbox ?? health.nextCommands?.[0] ?? null,
      nextCommands: [
        health.commands?.validateInbox,
        health.commands?.openPrompt,
        health.commands?.captureManual,
        health.commands?.recoverSavedImage,
        health.commands?.generateOpenAiDryRun,
      ].filter(Boolean),
    };
  }
  if (lane === 'approved') {
    return {
      status: 'source approved; no source-review action needed',
      recommendedFirst: approval.commands?.runtimeSandboxLive ?? approval.commands?.sourceSandboxLive ?? null,
      nextCommands: [
        approval.commands?.sourceSandboxLive,
        approval.commands?.runtimeSandboxLive,
        approval.commands?.planCheck,
      ].filter(Boolean),
    };
  }
  return {
    status: 'approval-ready; human source review required',
    recommendedFirst: approval.commands?.quickReview ?? approval.commands?.sourceSandboxLive ?? null,
    nextCommands: [
      approval.commands?.quickReview,
      approval.commands?.sourceSandboxLive,
      approval.commands?.runtimeSandboxLive,
      approval.commands?.planCheck,
      approval.acceptCommandDryRun,
    ].filter(Boolean),
  };
}

function publicSourcePreview(approval, health) {
  return firstDefined(
    approval.links?.sourceSandboxLive,
    approval.links?.sandboxLab,
    health?.links?.liveSourceSandbox,
    health?.links?.sandboxPreview,
    approval.links?.sandboxScreenshot,
  );
}

function markdown(report) {
  const laneCounts = LANE_ORDER.map((lane) => `- ${lane}: ${report.summary.lanes[lane] ?? 0}`).join('\n');
  const rows = report.items.map((item) => `| \`${item.id}\` | ${item.species} | ${item.lane} | ${item.healthStatus ?? 'none'} | ${item.countsTowardGate ? 'yes' : 'no'} | \`${item.recommendedFirst ?? '# none'}\` |`).join('\n');
  const commands = report.nextCommands.length ? report.nextCommands : ['# no source-review sequencing commands available'];
  return `# Water 9 Source Review Sequencer

Generated: \`${report.generatedAt}\`

Deterministic routing for source-review work. This page coordinates approval-ready candidates with critic-regeneration health so the pipeline does not confuse placeholder, no-op, or unreviewed art with production progress.

This sequencer does not approve source art, does not accept threats, and never counts preview-only work toward the 20-threat quality gate.

## Summary

- Candidates: ${report.summary.totalCandidates}
- Approval-ready: ${report.summary.approvalReady}
- Critic regeneration required: ${report.summary.criticRegenerationRequired}
- Distinct replacements ready: ${report.summary.distinctReplacementReady}
- No-op replacements: ${report.summary.validNoopReplacements}
- Missing replacements: ${report.summary.missingReplacements}
- Invalid replacements: ${report.summary.invalidReplacements}
- Approved sources: ${report.summary.approved}
- Counts toward gate: ${report.summary.countsTowardGate}
- Next lane: \`${report.summary.nextLane ?? 'none'}\`
- Next target: \`${report.summary.nextTarget ?? 'none'}\`

## Lane Counts

${laneCounts}

## Next Commands

\`\`\`bash
${commands.join('\n')}
\`\`\`

## Candidates

| ID | Species | Lane | Health | Counts toward gate | Recommended first command |
| --- | --- | --- | --- | ---: | --- |
${rows}
`;
}

function html(report) {
  const laneCards = LANE_ORDER.map((lane) => `<span data-source-review-sequencer-lane="${htmlEscape(lane)}">${htmlEscape(lane)} ${report.summary.lanes[lane] ?? 0}</span>`).join('\n');
  const rows = report.items.map((item) => `<tr data-source-review-sequencer-row="${htmlEscape(item.id)}" data-lane="${htmlEscape(item.lane)}">
    <td><code>${htmlEscape(item.id)}</code></td>
    <td>${htmlEscape(item.species)}</td>
    <td>${htmlEscape(item.lane)}</td>
    <td>${htmlEscape(item.status)}</td>
    <td>${htmlEscape(item.healthStatus ?? 'none')}</td>
    <td>${item.countsTowardGate ? 'yes' : 'no'}</td>
    <td>${item.links.sourcePreview ? `<a href="${htmlEscape(item.links.sourcePreview)}">source preview</a>` : 'missing'}</td>
    <td>${item.links.reviewPacket ? `<code>${htmlEscape(item.links.reviewPacket)}</code>` : 'missing'}</td>
    <td><pre><code>${htmlEscape(item.nextCommands.join('\n') || '# none')}</code></pre></td>
  </tr>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Source Review Sequencer</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#061014; color:#e6f7fb; }
    body { margin:0; background:#061014; }
    main { max-width:1360px; margin:0 auto; padding:28px 18px 48px; }
    h1 { margin:0 0 8px; font-size:clamp(2rem,5vw,4rem); letter-spacing:0; }
    p, td { color:#bdd4dc; line-height:1.45; }
    code, pre { color:#cfeef6; overflow-wrap:anywhere; font-family:"SFMono-Regular", Consolas, monospace; }
    pre { border:1px solid #203b46; background:#041014; padding:10px; white-space:pre-wrap; }
    .notice { border:1px solid #6a5230; border-radius:6px; background:#1d1710; color:#f0d9aa; padding:10px 12px; margin:16px 0; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; }
    .summary span { border:1px solid #294653; border-radius:6px; background:#0b1d24; padding:8px 10px; color:#bdd6df; }
    table { width:100%; border-collapse:collapse; border:1px solid #203b46; background:#081920; }
    th, td { padding:8px 9px; border-bottom:1px solid #18303a; text-align:left; vertical-align:top; }
    th { background:#10242c; color:#e7f7fb; }
    a { color:#8fe5ff; }
  </style>
</head>
<body>
  <main data-source-review-sequencer>
    <h1>Source Review Sequencer</h1>
    <p>Deterministic routing for source-review work across approval-ready candidates and critic-regeneration health.</p>
    <p>Evidence JSON: <code>${htmlEscape(report.artifacts.json)}</code></p>
    <div class="notice">This sequencer does not approve source art and does not accept threats. Preview-only rows do not count toward the 20-threat gate.</div>
    <div class="summary">
      <span>${report.summary.totalCandidates} candidates</span>
      <span>${report.summary.approvalReady} approval-ready</span>
      <span>${report.summary.criticRegenerationRequired} critic regeneration required</span>
      <span>${report.summary.distinctReplacementReady} distinct replacements ready</span>
      <span>${report.summary.validNoopReplacements} no-op replacements</span>
      <span>${report.summary.missingReplacements} missing replacements</span>
      <span>${report.summary.invalidReplacements} invalid replacements</span>
      <span>next ${htmlEscape(report.summary.nextTarget ?? 'none')}</span>
    </div>
    <h2>Lanes</h2>
    <div class="summary">${laneCards}</div>
    <h2>Next Commands</h2>
    <pre><code>${htmlEscape(report.nextCommands.join('\n') || '# no commands')}</code></pre>
    <table>
      <thead><tr><th>ID</th><th>Species</th><th>Lane</th><th>Status</th><th>Health</th><th>Counts</th><th>Preview</th><th>Review Packet</th><th>Commands</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

const approvalRunway = await readJson(paths.approvalRunway);
const criticHealth = await readJson(paths.criticHealth);
const contentReviewSession = await readJson(paths.contentReviewSession);
if (approvalRunway.schema !== 'water9/source-approval-runway@1') throw new Error(`Unexpected approval runway schema ${approvalRunway.schema ?? 'missing'}`);
if (criticHealth.schema !== 'water9/source-critic-regeneration-health@1') throw new Error(`Unexpected critic health schema ${criticHealth.schema ?? 'missing'}`);

const healthById = new Map((criticHealth.items ?? []).map((item) => [item.id, item]));
const sessionById = new Map((contentReviewSession.items ?? []).map((item) => [item.id, item]));
const items = (approvalRunway.items ?? []).map((approval, index) => {
  const health = healthById.get(approval.id) ?? null;
  const lane = laneFor({ approval, health });
  const action = actionForLane({ lane, approval, health });
  const sourcePreview = publicSourcePreview(approval, health);
  return {
    rank: index + 1,
    id: approval.id,
    species: approval.species,
    lane,
    status: action.status,
    healthStatus: health?.status ?? null,
    readyForHumanReview: Boolean(approval.readyForHumanReview),
    mechanicallyReadyForHumanReview: Boolean(approval.mechanicallyReadyForHumanReview),
    criticRegenerationRequired: Boolean(approval.criticRegenerationRequired),
    humanApproved: Boolean(approval.humanApproved),
    countsTowardGate: Boolean(approval.humanApproved && sessionById.get(approval.id)?.threatReady),
    recommendedFirst: action.recommendedFirst,
    nextCommands: action.nextCommands,
    links: {
      source: approval.links?.source ?? health?.links?.source ?? null,
      thumbnail: approval.links?.thumbnail ?? null,
      keyPreview: approval.links?.keyPreview ?? null,
      sourcePreview,
      quickReview: approval.links?.quickReview ?? health?.links?.quickReview ?? null,
      reviewPacket: approval.links?.reviewPacket ?? null,
      planPreview: approval.links?.planPreview ?? health?.links?.planPreview ?? null,
      sourceApprovalRunway: '/review/source-approval-runway.html',
      criticRegenerationHealth: health ? '/review/source-candidates/source-critic-regeneration-health.html' : null,
      contentReviewSession: '/review/content-review-session.html',
    },
    commands: {
      approvalDryRun: approval.acceptCommandDryRun ?? null,
      ...approval.commands,
      criticHealth: health ? 'npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check' : null,
      ...health?.commands,
    },
  };
});

const lanes = Object.fromEntries(LANE_ORDER.map((lane) => [lane, items.filter((item) => item.lane === lane).length]));
const nextItem = items.find((item) => item.lane === 'regenerate-distinct-ready')
  ?? items.find((item) => item.lane === 'regenerate-noop')
  ?? items.find((item) => item.lane === 'regenerate-missing')
  ?? items.find((item) => item.lane === 'regenerate-invalid')
  ?? items.find((item) => item.lane === 'approval-ready')
  ?? null;
const report = {
  schema: 'water9/source-review-sequencer@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    approvalRunway: repoRelative(paths.approvalRunway),
    criticHealth: repoRelative(paths.criticHealth),
    contentReviewSession: repoRelative(paths.contentReviewSession),
  },
  artifacts: {
    json: repoRelative(paths.outJson),
    markdown: repoRelative(paths.outMarkdown),
    html: repoRelative(paths.outHtml),
  },
  policy: {
    doesNotApproveSources: true,
    doesNotAcceptThreats: true,
    previewOnlyDoesNotCountTowardGate: true,
    distinctReplacementRequiredBeforeIngest: true,
    dryRunOnlyApprovalCommands: true,
  },
  summary: {
    totalCandidates: items.length,
    approvalReady: items.filter((item) => item.lane === 'approval-ready').length,
    criticRegenerationRequired: items.filter((item) => item.criticRegenerationRequired).length,
    distinctReplacementReady: lanes['regenerate-distinct-ready'],
    validNoopReplacements: lanes['regenerate-noop'],
    missingReplacements: lanes['regenerate-missing'],
    invalidReplacements: lanes['regenerate-invalid'],
    approved: lanes.approved,
    countsTowardGate: items.filter((item) => item.countsTowardGate).length,
    lanes,
    nextLane: nextItem?.lane ?? null,
    nextTarget: nextItem?.id ?? null,
    nextTargetSpecies: nextItem?.species ?? null,
  },
  nextCommands: nextItem?.nextCommands ?? [],
  items,
};

await mkdir(dirname(paths.outJson), { recursive: true });
await writeFile(paths.outJson, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.outMarkdown, markdown(report));
await writeFile(paths.outHtml, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  candidates: report.summary.totalCandidates,
  nextLane: report.summary.nextLane,
  nextTarget: report.summary.nextTarget,
  approvalReady: report.summary.approvalReady,
  criticRegenerationRequired: report.summary.criticRegenerationRequired,
  json: paths.outJson,
  markdown: paths.outMarkdown,
  html: paths.outHtml,
}, null, 2));
