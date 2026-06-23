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
  board: resolve(String(args.get('board') ?? 'public/review/source-candidates/research-dispatch-board.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/source-candidates/research-dispatch-board.md')),
  html: resolve(String(args.get('html') ?? 'public/review/source-candidates/research-dispatch-board.html')),
  research: resolve(String(args.get('research') ?? 'public/review/source-candidates/research-briefs.json')),
  sourceCandidates: resolve(String(args.get('source-candidates') ?? 'public/review/source-candidates/source-candidates.json')),
  trace: resolve(String(args.get('trace') ?? 'public/review/source-candidates/research-source-trace.json')),
};
const minCandidates = Number(args.get('min-candidates') ?? 20);
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

function includesRendered(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

function requireCommand(owner, commands, key, needle) {
  const value = commands?.[key];
  if (!value) {
    failures.push(`${owner}: missing command ${key}`);
    return;
  }
  if (!String(value).includes(needle)) failures.push(`${owner}: command ${key} missing ${needle}`);
}

const board = await readJson('research dispatch board', paths.board);
const research = await readJson('research briefs', paths.research);
const sourceCandidates = await readJson('source candidates', paths.sourceCandidates);
const trace = await readJson('research source trace', paths.trace);
const markdown = await readText('research dispatch markdown', paths.markdown);
const html = await readText('research dispatch html', paths.html);
await fileOk('research dispatch json', paths.board, 1024);
await fileOk('research dispatch markdown', paths.markdown, 1024);
await fileOk('research dispatch html', paths.html, 4096);

if (board?.schema !== 'water9/research-dispatch-board@1') failures.push(`unexpected board schema ${board?.schema ?? 'missing'}`);
if (research?.schema !== 'water9/threat-research-briefs@1') failures.push(`unexpected research schema ${research?.schema ?? 'missing'}`);
if (sourceCandidates?.schema !== 'water9/source-candidates@1') failures.push(`unexpected source candidates schema ${sourceCandidates?.schema ?? 'missing'}`);
if (trace?.schema !== 'water9/research-source-trace@1') failures.push(`unexpected trace schema ${trace?.schema ?? 'missing'}`);

const dispatches = Array.isArray(board?.dispatches) ? board.dispatches : [];
const researchIds = new Set((research?.briefs ?? []).map((brief) => brief.id));
const sourceIds = new Set((sourceCandidates?.candidates ?? []).map((candidate) => candidate.id));
const traceById = new Map((trace?.records ?? []).map((record) => [record.id, record]));
const seen = new Set();

if (dispatches.length < minCandidates) failures.push(`only ${dispatches.length}/${minCandidates} dispatches`);
if ((board?.summary?.candidates ?? -1) !== dispatches.length) failures.push('summary candidates mismatch');
if ((board?.summary?.dispatchPackets ?? -1) !== dispatches.length) failures.push('summary dispatchPackets mismatch');
if ((board?.summary?.assignedToLanes ?? -1) !== dispatches.filter((item) => item.lane).length) failures.push('summary assignedToLanes mismatch');
if ((board?.summary?.auditedCandidates ?? -1) !== dispatches.filter((item) => item.auditFile).length) failures.push('summary auditedCandidates mismatch');
if ((board?.summary?.hasSource ?? -1) !== dispatches.filter((item) => item.hasSource).length) failures.push('summary hasSource mismatch');

for (const item of dispatches) {
  const owner = item.id ?? 'unknown-dispatch';
  if (!item.id) failures.push(`${owner}: missing id`);
  if (item.id && seen.has(item.id)) failures.push(`${owner}: duplicate dispatch`);
  if (item.id) seen.add(item.id);
  if (item.id && !researchIds.has(item.id)) failures.push(`${owner}: not backed by research brief`);
  if (item.id && !sourceIds.has(item.id)) failures.push(`${owner}: not backed by source candidate`);
  if (!item.species) failures.push(`${owner}: missing species`);
  if (!item.lane) failures.push(`${owner}: missing research lane`);
  if (!item.auditFile) failures.push(`${owner}: missing audit file`);
  if (!String(item.gameplayVerb ?? '').trim()) failures.push(`${owner}: missing gameplay verb`);
  if (!Array.isArray(item.biologicalAnchors) || item.biologicalAnchors.length < 4) failures.push(`${owner}: biological anchors are incomplete`);
  if (!Array.isArray(item.requiredRead) || item.requiredRead.length < 4) failures.push(`${owner}: required read is incomplete`);
  if (!Array.isArray(item.articulatableParts) || item.articulatableParts.length < 6) failures.push(`${owner}: articulatable parts are incomplete`);
  if (!Array.isArray(item.promptRisks) || item.promptRisks.length < 3) failures.push(`${owner}: prompt risks are incomplete`);
  if (!Array.isArray(item.referenceSearchTerms) || item.referenceSearchTerms.length < 2) failures.push(`${owner}: reference search terms are incomplete`);
  if (!String(item.prompt ?? '').includes('You are a Water 9 underwater-threat research subagent')) failures.push(`${owner}: prompt missing role`);
  if (!String(item.prompt ?? '').includes('"schema": "water9/subagent-research-audit@1"')) failures.push(`${owner}: prompt missing output schema`);
  if (!String(item.prompt ?? '').includes(item.id)) failures.push(`${owner}: prompt does not include candidate id`);
  requireCommand(owner, item.commands, 'researchPack', 'research:subagent-pack');
  requireCommand(owner, item.commands, 'sourceTrace', 'research:source-trace');
  requireCommand(owner, item.commands, 'sandboxLab', `sandbox:lab -- --id source-${item.id} --with diver`);
  requireCommand(owner, item.commands, 'sourcePreview', `sandbox:preview -- --id ${item.id} --kind source --serve --open --visual`);
  requireCommand(owner, item.commands, 'sourceApprovalRunway', `source:approval-runway:preview -- --id ${item.id}`);
  requireCommand(owner, item.commands, 'nextPrompt', `source:next-prompt -- --id ${item.id}`);
  requireCommand(owner, item.commands, 'sourceAcceptDryRun', `source:accept -- --id ${item.id}`);
  if (!String(item.commands?.sourceAcceptDryRun ?? '').includes('--dry-run')) failures.push(`${owner}: sourceAcceptDryRun must include --dry-run`);
  if (!item.packet?.file || !item.packet?.href) failures.push(`${owner}: missing packet path`);
  if (item.packet?.file) {
    const packetText = await readText(`${owner}: packet`, resolve(item.packet.file));
    await fileOk(`${owner}: packet`, resolve(item.packet.file), 1024);
    for (const expected of [
      `Research Dispatch: ${item.species}`,
      item.id,
      'Mission Prompt',
      'Return only JSON matching this schema',
      item.commands.sandboxLab,
      item.commands.sourceApprovalRunway,
    ]) {
      if (!packetText.includes(expected)) failures.push(`${owner}: packet missing ${expected}`);
    }
  }
  const traceRecord = traceById.get(item.id);
  if (!traceRecord) failures.push(`${owner}: missing trace record`);
  if (traceRecord && item.lane !== traceRecord.lane) failures.push(`${owner}: lane mismatch with trace`);
}

for (const id of researchIds) {
  if (!seen.has(id)) failures.push(`${id}: missing dispatch packet`);
}

for (const expected of [
  'Water 9 Research Dispatch Board',
  'Per-candidate subagent packets',
  'npm run research:dispatch',
  'npm run research:dispatch-check',
  'npm run sandbox:lab -- --id abyssal-gulper --with diver',
  'source:approval-runway:preview',
]) {
  if (!markdown.includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesRendered(html, expected)) failures.push(`html missing ${expected}`);
}

const result = {
  schema: 'water9/research-dispatch-board-check@1',
  candidates: dispatches.length,
  lanes: board?.summary?.lanes ?? null,
  dispatchPackets: board?.summary?.dispatchPackets ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
