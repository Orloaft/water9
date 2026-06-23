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

const packPath = resolve(String(args.get('pack') ?? 'public/review/source-candidates/research-subagent-pack.json'));
const markdownPath = resolve(String(args.get('markdown') ?? 'public/review/source-candidates/research-subagent-pack.md'));
const htmlPath = resolve(String(args.get('html') ?? 'public/review/source-candidates/research-subagent-pack.html'));
const minAssignments = Number(args.get('min-assignments') ?? 3);
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

const pack = await readJson('research subagent pack', packPath);
const markdown = await readText('research subagent pack markdown', markdownPath);
const html = await readText('research subagent pack html', htmlPath);
await fileOk('research subagent pack markdown', markdownPath, 512);
await fileOk('research subagent pack html', htmlPath, 4096);

if (pack?.schema !== 'water9/research-subagent-pack@1') failures.push(`unexpected pack schema ${pack?.schema ?? 'missing'}`);
const assignments = Array.isArray(pack?.assignments) ? pack.assignments : [];
if (assignments.length < minAssignments) failures.push(`only ${assignments.length} assignments, expected at least ${minAssignments}`);
const allCandidates = assignments.flatMap((assignment) => assignment.candidates ?? []);
if (allCandidates.length < minCandidates) failures.push(`only ${allCandidates.length} assigned candidates, expected at least ${minCandidates}`);

const assignmentIds = new Set();
const candidateIds = new Set();
function requireCommand(owner, commands, key, needle) {
  const value = commands?.[key];
  if (!value) {
    failures.push(`${owner}: missing command ${key}`);
    return;
  }
  if (!String(value).includes(needle)) failures.push(`${owner}: command ${key} is missing ${needle}`);
}

for (const assignment of assignments) {
  const owner = assignment.id ?? 'unknown-assignment';
  if (!assignment.id) failures.push(`${owner}: missing id`);
  if (assignmentIds.has(assignment.id)) failures.push(`${owner}: duplicate assignment id`);
  assignmentIds.add(assignment.id);
  if (!assignment.title) failures.push(`${owner}: missing title`);
  if (!assignment.focus || String(assignment.focus).length < 40) failures.push(`${owner}: focus is too short`);
  requireCommand(owner, assignment.commands, 'firstPrompt', 'source:next-prompt -- --id ');
  requireCommand(owner, assignment.commands, 'firstSession', 'source:session -- --id ');
  requireCommand(owner, assignment.commands, 'firstCapture', 'source:inbox-capture -- --id ');
  requireCommand(owner, assignment.commands, 'firstCapture', '--open');
  requireCommand(owner, assignment.commands, 'checkAllInbox', 'source:inbox-check -- --dir tools/source-inbox --strict --ids ');
  requireCommand(owner, assignment.commands, 'ingestAllDryRun', 'source:ingest-batch -- --dir tools/source-inbox --strict --ids ');
  requireCommand(owner, assignment.commands, 'ingestAllApply', 'source:ingest-batch -- --dir tools/source-inbox --strict --ids ');
  if (!String(assignment.commands?.ingestAllDryRun ?? '').includes('--dry-run')) failures.push(`${owner}: ingestAllDryRun must be a dry run`);
  if (!assignment.file) failures.push(`${owner}: missing assignment file`);
  else {
    const assignmentPath = resolve(assignment.file);
    await fileOk(`${owner}: assignment file`, assignmentPath, 1024);
    const assignmentMarkdown = await readText(`${owner}: assignment file`, assignmentPath);
    if (!assignmentMarkdown.includes('Expected JSON shape')) failures.push(`${owner}: assignment file is missing expected JSON shape`);
    if (!assignmentMarkdown.includes('Do not edit files directly')) failures.push(`${owner}: assignment file is missing read-only instruction`);
    if (!assignmentMarkdown.includes('Lane source handoff')) failures.push(`${owner}: assignment file is missing lane source handoff`);
    for (const candidate of assignment.candidates ?? []) {
      if (!assignmentMarkdown.includes(candidate.id)) failures.push(`${owner}: assignment file is missing ${candidate.id}`);
      if (!assignmentMarkdown.includes(`npm run source:inbox-capture -- --id ${candidate.id} --open`)) failures.push(`${owner}: assignment file is missing ${candidate.id} capture command`);
      if (!assignmentMarkdown.includes(`npm run sandbox:preview -- --id ${candidate.id} --kind source --serve --open --visual`)) failures.push(`${owner}: assignment file is missing ${candidate.id} source preview command`);
    }
  }
  if (!Array.isArray(assignment.candidates) || assignment.candidates.length < 1) failures.push(`${owner}: candidates are missing`);
  for (const candidate of assignment.candidates ?? []) {
    const candidateOwner = `${owner}:${candidate.id ?? 'unknown-candidate'}`;
    if (!candidate.id) failures.push(`${candidateOwner}: missing id`);
    if (candidate.id && candidateIds.has(candidate.id)) failures.push(`${candidateOwner}: duplicate candidate assignment`);
    if (candidate.id) candidateIds.add(candidate.id);
    if (!candidate.species) failures.push(`${candidateOwner}: missing species`);
    if (!candidate.gameplayVerb || String(candidate.gameplayVerb).length < 40) failures.push(`${candidateOwner}: gameplayVerb is too short`);
    if (!Array.isArray(candidate.requiredRead) || candidate.requiredRead.length < 4) failures.push(`${candidateOwner}: requiredRead is incomplete`);
    if (!Array.isArray(candidate.articulatableParts) || candidate.articulatableParts.length < 6) failures.push(`${candidateOwner}: articulatableParts are incomplete`);
    if (!Array.isArray(candidate.promptRisks) || candidate.promptRisks.length < 3) failures.push(`${candidateOwner}: promptRisks are incomplete`);
    requireCommand(candidateOwner, candidate.commands, 'prompt', `source:next-prompt -- --id ${candidate.id}`);
    requireCommand(candidateOwner, candidate.commands, 'generationSession', `source:session -- --id ${candidate.id}`);
    requireCommand(candidateOwner, candidate.commands, 'capture', `source:inbox-capture -- --id ${candidate.id} --open`);
    requireCommand(candidateOwner, candidate.commands, 'recoverSavedFile', `source:recover-inline -- --id ${candidate.id}`);
    requireCommand(candidateOwner, candidate.commands, 'inboxCheck', `source:inbox-check -- --dir tools/source-inbox --strict --ids ${candidate.id}`);
    requireCommand(candidateOwner, candidate.commands, 'ingestDryRun', `source:ingest-batch -- --dir tools/source-inbox --strict --ids ${candidate.id}`);
    requireCommand(candidateOwner, candidate.commands, 'ingestApply', `source:ingest-batch -- --dir tools/source-inbox --strict --ids ${candidate.id}`);
    requireCommand(candidateOwner, candidate.commands, 'sourcePreview', `sandbox:preview -- --id ${candidate.id} --kind source --serve --open --visual`);
    if (!String(candidate.commands?.recoverSavedFile ?? '').includes('--image <saved-image-path> --copy --validate')) {
      failures.push(`${candidateOwner}: recoverSavedFile must include saved image path, copy, and validate flags`);
    }
    if (!String(candidate.commands?.ingestDryRun ?? '').includes('--dry-run')) failures.push(`${candidateOwner}: ingestDryRun must be a dry run`);
  }
}

for (const required of [
  'Research Subagent Pack',
  'npm run research:subagent-pack',
  'npm run research:subagent-pack-check',
  'npm run research:check',
  'npm run research:import -- --all',
  'npm run source:generation-queue',
  'npm run source:check',
  'npm run sandbox:preview -- --id <candidate-id> --kind source --serve --open --visual',
  'source:inbox-capture',
  'source:recover-inline',
  'source:ingest-batch',
]) {
  const htmlNeedle = required.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  if (!html.includes(htmlNeedle)) failures.push(`html is missing required content: ${required}`);
}

for (const assignment of assignments) {
  if (assignment.id && !html.includes(assignment.id)) failures.push(`${assignment.id}: html is missing assignment id`);
  if (assignment.file) {
    const relativeFile = assignment.file.replace('public/review/source-candidates/', '');
    if (!html.includes(relativeFile)) failures.push(`${assignment.id}: html is missing assignment link`);
  }
  if (assignment.id && !markdown.includes(assignment.id)) failures.push(`${assignment.id}: markdown is missing assignment id`);
}

const summary = {
  pack: packPath,
  markdown: markdownPath,
  html: htmlPath,
  assignments: assignments.length,
  candidates: candidateIds.size,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
