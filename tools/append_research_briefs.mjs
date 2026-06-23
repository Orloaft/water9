import { readFile, writeFile } from 'node:fs/promises';
import { stdin } from 'node:process';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const inputPath = String(args.get('input') ?? '-');
const manifestPath = resolve(String(args.get('manifest') ?? 'public/review/source-candidates/research-briefs.json'));
const dryRun = args.has('dry-run') || args.has('dryRun');
const overwrite = args.has('overwrite');

async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.briefs)) return payload.briefs;
  throw new Error('Input must be a JSON array of briefs or an object with a briefs array');
}

const inputText = inputPath === '-' ? await readStdin() : await readFile(resolve(inputPath), 'utf8');
const incoming = normalizePayload(JSON.parse(inputText));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema !== 'water9/threat-research-briefs@1') {
  throw new Error(`Unexpected research schema ${manifest.schema ?? 'missing'}`);
}
if (!Array.isArray(manifest.briefs)) manifest.briefs = [];

const existingById = new Map(manifest.briefs.map((brief, index) => [brief.id, { brief, index }]));
const appended = [];
const overwritten = [];
const skipped = [];
const failures = [];

for (const brief of incoming) {
  if (!brief?.id) {
    failures.push('incoming brief is missing id');
    continue;
  }
  const existing = existingById.get(brief.id);
  if (existing && !overwrite) {
    skipped.push(brief.id);
    continue;
  }
  if (existing && overwrite) {
    manifest.briefs[existing.index] = { ...existing.brief, ...brief };
    overwritten.push(brief.id);
    continue;
  }
  manifest.briefs.push(brief);
  existingById.set(brief.id, { brief, index: manifest.briefs.length - 1 });
  appended.push(brief.id);
}

if (failures.length) {
  console.error(JSON.stringify({ manifest: manifestPath, incoming: incoming.length, appended, overwritten, skipped, failures }, null, 2));
  process.exit(1);
}

if (!dryRun) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: manifestPath, dryRun, incoming: incoming.length, appended, overwritten, skipped }, null, 2));
