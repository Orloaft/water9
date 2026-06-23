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

const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/source-candidates.json'));
const outDir = resolve(String(args.get('out-dir') ?? 'public/review/source-candidates/art-contracts'));
const indexPath = resolve(String(args.get('index') ?? 'public/review/source-candidates/art-contracts.md'));
const MIN_REQUIRED_READ = 3;
const MIN_ARTICULATABLE_PARTS = 5;
const MIN_PROMPT_RISKS = 3;
const MIN_CONTRACT_REVIEW_CHECKS = 3;
const REQUIRED_COHESION_LOCK_TEXT = [
  'One-source proof:',
  'Connection proof:',
  'Style proof:',
  'Proportion proof:',
  'Production proof:',
];

async function readJson(label, path, failures) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readText(label, path, failures) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${label}: could not read file: ${error.message}`);
    return '';
  }
}

async function fileOk(path, minSize = 128) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

function commandFor(id, command, extra = '') {
  return `npm run ${command} -- --id ${id}${extra}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const failures = [];
const manifest = await readJson('source candidate manifest', manifestPath, failures);
const indexMarkdown = await readText('source art contract index', indexPath, failures);

if (manifest?.schema !== 'water9/source-candidates@1') {
  failures.push(`source candidate schema is ${manifest?.schema ?? 'missing'}`);
}

const candidates = Array.isArray(manifest?.candidates) ? manifest.candidates : [];
for (const candidate of candidates) {
  const id = candidate.id;
  const fileBase = safeFileName(id);
  const jsonPath = resolve(outDir, `${fileBase}.json`);
  const markdownPath = resolve(outDir, `${fileBase}.md`);
  const contract = await readJson(`${id} contract`, jsonPath, failures);
  const markdown = await readText(`${id} contract markdown`, markdownPath, failures);
  const expectedAutoIngest = commandFor(id, 'source:imagegen-status', ' --ingest');
  const expectedStatus = commandFor(id, 'source:imagegen-status');
  const expectedManualIngest = commandFor(id, 'source:ingest', ' --image <image-path> --copy');
  const requiredRead = asArray(candidate.requiredRead);
  const articulatableParts = asArray(candidate.articulatableParts);
  const promptRisks = asArray(candidate.promptRisks);
  const contractReviewChecklist = asArray(candidate.contractReviewChecklist);

  if (!(await fileOk(jsonPath, 512))) failures.push(`${id}: contract JSON is missing or too small`);
  if (!(await fileOk(markdownPath, 1024))) failures.push(`${id}: contract markdown is missing or too small`);
  if (contract?.schema !== 'water9/source-art-contract@1') failures.push(`${id}: contract schema is ${contract?.schema ?? 'missing'}`);
  if (contract?.id !== id) failures.push(`${id}: contract id is ${contract?.id ?? 'missing'}`);
  if (requiredRead.length < MIN_REQUIRED_READ) failures.push(`${id}: candidate requiredRead needs at least ${MIN_REQUIRED_READ} concrete pass/fail reads`);
  if (articulatableParts.length < MIN_ARTICULATABLE_PARTS) failures.push(`${id}: candidate articulatableParts needs at least ${MIN_ARTICULATABLE_PARTS} riggable parts`);
  if (promptRisks.length < MIN_PROMPT_RISKS) failures.push(`${id}: candidate promptRisks needs at least ${MIN_PROMPT_RISKS} visual rejection risks`);
  if (contractReviewChecklist.length < MIN_CONTRACT_REVIEW_CHECKS) {
    failures.push(`${id}: candidate contractReviewChecklist needs at least ${MIN_CONTRACT_REVIEW_CHECKS} candidate-specific review checks`);
  }
  if (contract?.expectedOutput !== `public/assets/generated/fauna-${id}-whole-source.png`) {
    failures.push(`${id}: expectedOutput is stale or missing`);
  }
  if (asArray(contract?.requiredRead).length < requiredRead.length) {
    failures.push(`${id}: contract JSON is missing candidate requiredRead entries`);
  }
  if (asArray(contract?.articulatableParts).length < articulatableParts.length) {
    failures.push(`${id}: contract JSON is missing candidate articulatableParts entries`);
  }
  if (asArray(contract?.promptRisks).length < promptRisks.length) {
    failures.push(`${id}: contract JSON is missing candidate promptRisks entries`);
  }
  if (asArray(contract?.contractReviewChecklist).length < contractReviewChecklist.length) {
    failures.push(`${id}: contract JSON is missing candidate contractReviewChecklist entries`);
  }
  if (contract?.commands?.checkGeneratedFile !== expectedStatus) {
    failures.push(`${id}: contract checkGeneratedFile command is stale`);
  }
  if (contract?.commands?.autoIngestGeneratedFile !== expectedAutoIngest) {
    failures.push(`${id}: contract autoIngestGeneratedFile command is missing or stale`);
  }
  if (contract?.commands?.ingestGeneratedFile !== expectedManualIngest) {
    failures.push(`${id}: contract manual ingest command is stale`);
  }
  if (!markdown.includes(expectedAutoIngest)) {
    failures.push(`${id}: contract markdown is missing validated auto-ingest command`);
  }
  if (!markdown.includes('if exactly one generated file appears')) {
    failures.push(`${id}: contract markdown is missing safe auto-ingest guidance`);
  }
  if (!Array.isArray(contract?.cohesionLock) || contract.cohesionLock.length < REQUIRED_COHESION_LOCK_TEXT.length) {
    failures.push(`${id}: contract JSON is missing cohesionLock rules`);
  }
  for (const text of REQUIRED_COHESION_LOCK_TEXT) {
    if (!String(contract?.generationPrompt ?? '').includes(text)) {
      failures.push(`${id}: generation prompt is missing cohesion lock text ${text}`);
    }
    if (!markdown.includes(text)) {
      failures.push(`${id}: contract markdown is missing cohesion lock text ${text}`);
    }
  }
  for (const text of contractReviewChecklist) {
    if (!String(contract?.generationPrompt ?? '').includes(text)) {
      failures.push(`${id}: generation prompt is missing candidate contract check: ${text}`);
    }
    if (!markdown.includes(text)) {
      failures.push(`${id}: contract markdown is missing candidate contract check: ${text}`);
    }
  }
  for (const text of requiredRead) {
    if (!String(contract?.generationPrompt ?? '').includes(text)) {
      failures.push(`${id}: generation prompt is missing required read: ${text}`);
    }
    if (!markdown.includes(text)) {
      failures.push(`${id}: contract markdown is missing required read: ${text}`);
    }
  }
  if (candidate.auditGuidance) {
    if (!contract?.auditGuidance) failures.push(`${id}: contract JSON is missing auditGuidance`);
    if (!String(contract?.generationPrompt ?? '').includes('Research audit hardening:')) {
      failures.push(`${id}: generation prompt is missing research audit hardening`);
    }
    if (!markdown.includes('Research Audit Hardening')) {
      failures.push(`${id}: contract markdown is missing research audit hardening`);
    }
  }
  if (!indexMarkdown.includes(`${fileBase}.md`)) {
    failures.push(`${id}: contract index is missing contract link`);
  }
}

const summary = {
  manifest: manifestPath,
  outDir,
  index: indexPath,
  contracts: candidates.length,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
