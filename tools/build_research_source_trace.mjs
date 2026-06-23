import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
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
  research: resolve(String(args.get('research') ?? 'public/review/source-candidates/research-briefs.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  pack: resolve(String(args.get('pack') ?? 'public/review/source-candidates/research-subagent-pack.json')),
  auditsDir: resolve(String(args.get('audits-dir') ?? 'public/review/source-candidates/research-subagent-audits')),
  auditsSummary: resolve(String(args.get('audits-summary') ?? 'public/review/source-candidates/research-subagent-audits-summary.json')),
  queue: resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json')),
  sprint: resolve(String(args.get('sprint') ?? 'public/review/source-candidates/source-generation-sprint.json')),
  jsonOut: resolve(String(args.get('json-out') ?? 'public/review/source-candidates/research-source-trace.json')),
  markdownOut: resolve(String(args.get('out') ?? 'public/review/source-candidates/research-source-trace.md')),
  htmlOut: resolve(String(args.get('html-out') ?? 'public/review/source-candidates/research-source-trace.html')),
};

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readText(path, fallback = '') {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return fallback;
  }
}

async function readAuditFindings(dir) {
  const byCandidate = new Map();
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return byCandidate;
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const audit = await readJson(resolve(dir, entry.name));
    if (audit?.schema !== 'water9/subagent-research-audit@1') continue;
    for (const finding of audit.findings ?? []) {
      if (!finding?.id) continue;
      byCandidate.set(finding.id, {
        lane: audit.lane,
        file: `public/review/source-candidates/research-subagent-audits/${entry.name}`,
        strengths: finding.strengths ?? [],
        sourceGenerationRisks: finding.sourceGenerationRisks ?? [],
        suggestedResearchPatch: finding.suggestedResearchPatch ?? null,
        referenceSearchTerms: finding.referenceSearchTerms ?? [],
      });
    }
  }
  return byCandidate;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None.';
}

function publicRel(path) {
  const value = String(path ?? '');
  return value.startsWith('/mnt/nxt-dev/water9/') ? value.slice('/mnt/nxt-dev/water9/'.length) : value;
}

const research = await readJson(paths.research, { briefs: [] });
const sourceCandidates = await readJson(paths.sourceCandidates, { candidates: [] });
const pack = await readJson(paths.pack, { assignments: [] });
const auditsSummary = await readJson(paths.auditsSummary, {});
const queue = await readJson(paths.queue, { candidates: [] });
const sprint = await readJson(paths.sprint, { ids: [] });
const auditFindings = await readAuditFindings(paths.auditsDir);

const briefsById = new Map((research.briefs ?? []).map((brief) => [brief.id, brief]));
const sourceById = new Map((sourceCandidates.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const queueById = new Map((queue.candidates ?? []).map((candidate) => [candidate.id, candidate]));
const sprintIds = new Set(sprint.ids ?? []);
const laneByCandidate = new Map();
for (const assignment of pack.assignments ?? []) {
  for (const candidate of assignment.candidates ?? []) {
    laneByCandidate.set(candidate.id, assignment.id);
  }
}

const allIds = [...new Set([
  ...(research.briefs ?? []).map((brief) => brief.id),
  ...(sourceCandidates.candidates ?? []).map((candidate) => candidate.id),
])].sort();

const records = [];
for (const id of allIds) {
  const brief = briefsById.get(id) ?? {};
  const candidate = sourceById.get(id) ?? {};
  const queueItem = queueById.get(id) ?? null;
  const audit = auditFindings.get(id) ?? null;
  const promptFile = queueItem?.promptFile ?? null;
  const promptText = promptFile ? await readText(resolve(promptFile)) : '';
  records.push({
    id,
    species: candidate.species ?? brief.species ?? id,
    status: candidate.status ?? brief.status ?? 'missing',
    hasSource: Boolean(candidate.source),
    source: candidate.source ?? null,
    lane: laneByCandidate.get(id) ?? null,
    audited: Boolean(audit),
    auditFile: audit?.file ?? null,
    auditStrengths: audit?.strengths?.length ?? 0,
    auditRisks: audit?.sourceGenerationRisks?.length ?? 0,
    auditPatchKeys: audit?.suggestedResearchPatch ? Object.keys(audit.suggestedResearchPatch).sort() : [],
    referenceSearchTerms: audit?.referenceSearchTerms ?? [],
    inQueue: Boolean(queueItem),
    queueRank: queueItem?.rank ?? null,
    inSprint: sprintIds.has(id),
    promptFile,
    promptExists: Boolean(promptFile && promptText),
    promptHasAuditHardening: promptText.includes('Research audit hardening:'),
    promptHasSourcePoseRules: promptText.includes('Source pose contract:'),
    promptHasCohesionLock: promptText.includes('Cohesion lock:'),
    queueHasAuditGuidance: Boolean(queueItem?.auditGuidance),
    qualityChecks: queueItem?.qualityChecks ?? [],
    nextCommand: queueItem?.commands?.markBeforeGeneration ?? null,
  });
}

const queued = records.filter((record) => record.inQueue);
const missingSource = records.filter((record) => !record.hasSource);
const report = {
  schema: 'water9/research-source-trace@1',
  generatedAt: new Date().toISOString(),
  generatedFrom: {
    research: publicRel(paths.research),
    sourceCandidates: publicRel(paths.sourceCandidates),
    pack: publicRel(paths.pack),
    auditsDir: publicRel(paths.auditsDir),
    auditsSummary: publicRel(paths.auditsSummary),
    queue: publicRel(paths.queue),
    sprint: publicRel(paths.sprint),
  },
  summary: {
    candidates: records.length,
    sourceCandidates: sourceCandidates.candidates?.length ?? 0,
    researchBriefs: research.briefs?.length ?? 0,
    assignedToSubagents: records.filter((record) => record.lane).length,
    auditedCandidates: records.filter((record) => record.audited).length,
    missingSource: missingSource.length,
    queued: queued.length,
    queuedWithAuditGuidance: queued.filter((record) => record.queueHasAuditGuidance).length,
    queuedPromptFiles: queued.filter((record) => record.promptExists).length,
    queuedPromptAuditHardening: queued.filter((record) => record.promptHasAuditHardening).length,
    sprint: sprintIds.size,
    auditedLanes: auditsSummary.auditedLanes ?? [],
  },
  records,
};

function markdown(report) {
  const lines = [
    '# Research Source Trace',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    '## Summary',
    '',
    `- Candidates: \`${report.summary.candidates}\``,
    `- Assigned to subagents: \`${report.summary.assignedToSubagents}/${report.summary.candidates}\``,
    `- Audited candidates: \`${report.summary.auditedCandidates}/${report.summary.candidates}\``,
    `- Missing source images: \`${report.summary.missingSource}\``,
    `- Queued for generation: \`${report.summary.queued}\``,
    `- Queued with audit guidance: \`${report.summary.queuedWithAuditGuidance}/${report.summary.queued}\``,
    `- Queued prompt files: \`${report.summary.queuedPromptFiles}/${report.summary.queued}\``,
    `- Queued prompts with audit hardening: \`${report.summary.queuedPromptAuditHardening}/${report.summary.queued}\``,
    '',
    '## Commands',
    '',
    '```bash',
    'npm run research:subagent-pack',
    'npm run research:audits',
    'npm run source:generation-queue',
    'npm run research:source-trace',
    'npm run research:source-trace-check',
    '```',
    '',
    '## Queue Trace',
    '',
    '| Rank | Candidate | Lane | Audit | Prompt | Sprint |',
    '| ---: | --- | --- | --- | --- | --- |',
  ];
  for (const record of report.records.filter((item) => item.inQueue).sort((a, b) => a.queueRank - b.queueRank)) {
    lines.push(`| ${record.queueRank} | \`${record.id}\` ${record.species} | \`${record.lane ?? 'missing'}\` | ${record.audited ? 'yes' : 'no'} | ${record.promptHasAuditHardening ? 'hardened' : 'missing'} | ${record.inSprint ? 'yes' : 'no'} |`);
  }
  lines.push('', '## Reference Search Terms', '');
  for (const record of report.records.filter((item) => item.referenceSearchTerms.length)) {
    lines.push(`### ${record.species} (${record.id})`, '', markdownList(record.referenceSearchTerms), '');
  }
  return `${lines.join('\n')}\n`;
}

function html(report) {
  const rows = report.records.map((record) => `<tr class="${record.hasSource ? 'sourced' : 'missing-source'}">
    <td><code>${htmlEscape(record.id)}</code><strong>${htmlEscape(record.species)}</strong></td>
    <td>${htmlEscape(record.lane ?? 'missing')}</td>
    <td>${record.audited ? 'yes' : 'no'}${record.auditFile ? `<small>${htmlEscape(record.auditFile)}</small>` : ''}</td>
    <td>${record.inQueue ? `rank ${htmlEscape(record.queueRank)}` : 'no'}</td>
    <td>${record.promptHasAuditHardening ? 'hardened' : record.inQueue ? 'missing hardening' : 'n/a'}${record.promptFile ? `<small>${htmlEscape(record.promptFile)}</small>` : ''}</td>
    <td>${record.inSprint ? 'yes' : 'no'}</td>
  </tr>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water 9 Research Source Trace</title>
  <style>
    :root { color-scheme: dark; --bg:#061013; --panel:#0c1b20; --line:#24424b; --text:#e2f5f6; --muted:#91aab0; --accent:#7ce5ff; --good:#7ee29c; --warn:#e7bd6d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1280px; margin:0 auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:30px; }
    p { color:var(--muted); }
    .metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin:18px 0; }
    .metrics div { border:1px solid var(--line); background:var(--panel); padding:10px; }
    .metrics strong { display:block; font-size:22px; }
    table { width:100%; border-collapse:collapse; border:1px solid var(--line); background:var(--panel); }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:8px 10px; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; }
    code, small { display:block; color:var(--muted); }
    td strong { display:block; }
    .sourced td:first-child { border-left:3px solid var(--good); }
    .missing-source td:first-child { border-left:3px solid var(--warn); }
    pre { border:1px solid var(--line); background:#050b0d; padding:10px; overflow:auto; }
  </style>
</head>
<body>
  <main>
    <h1>Research Source Trace</h1>
    <p>Candidate-level trace from research brief to subagent audit to source-generation prompt.</p>
    <section class="metrics">
      <div><span>Candidates</span><strong>${report.summary.candidates}</strong></div>
      <div><span>Audited</span><strong>${report.summary.auditedCandidates}/${report.summary.candidates}</strong></div>
      <div><span>Queued</span><strong>${report.summary.queued}</strong></div>
      <div><span>Hardened prompts</span><strong>${report.summary.queuedPromptAuditHardening}/${report.summary.queued}</strong></div>
    </section>
    <pre><code>npm run research:source-trace
npm run research:source-trace-check
npm run source:generation-queue</code></pre>
    <table>
      <thead><tr><th>Candidate</th><th>Lane</th><th>Audit</th><th>Queue</th><th>Prompt</th><th>Sprint</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

await mkdir(dirname(paths.jsonOut), { recursive: true });
await writeFile(paths.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(paths.markdownOut, markdown(report));
await writeFile(paths.htmlOut, html(report));

console.log(JSON.stringify({
  schema: report.schema,
  jsonOut: publicRel(paths.jsonOut),
  markdownOut: publicRel(paths.markdownOut),
  htmlOut: publicRel(paths.htmlOut),
  summary: report.summary,
}, null, 2));
