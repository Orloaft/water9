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

const id = String(args.get('id') ?? '').trim();
const packDir = resolve(String(args.get('dir') ?? 'public/review/rigging-packs'));

async function readJson(path, failures, label = path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function fileOk(path, minSize = 128) {
  try {
    const info = await stat(resolve(path));
    return info.isFile() && info.size >= minSize;
  } catch {
    return false;
  }
}

function requireIncludes(label, text, needle, failures) {
  if (!String(text ?? '').includes(String(needle ?? ''))) failures.push(label);
}

const failures = [];
const index = await readJson(resolve(packDir, 'index.json'), failures, 'rigging focus index');
if (index?.schema !== 'water9/rigging-focus-pack-index@1') failures.push(`rigging focus index schema is ${index?.schema ?? 'missing'}`);
const entries = id ? (index?.packs ?? []).filter((pack) => pack.id === id) : (index?.packs ?? []);
if (!entries.length) failures.push(id ? `${id}: rigging focus pack is not indexed` : 'rigging focus index has no packs');

for (const entry of entries) {
  const packPath = resolve(packDir, `${entry.id}.json`);
  const markdownPath = resolve(packDir, `${entry.id}.md`);
  const pack = await readJson(packPath, failures, `${entry.id} rigging pack`);
  const markdown = await readFile(markdownPath, 'utf8').catch(() => '');
  if (pack?.schema !== 'water9/rigging-focus-pack@1') failures.push(`${entry.id}: pack schema is ${pack?.schema ?? 'missing'}`);
  if (pack) {
    for (const key of ['sourceGallery', 'sourcePreview', 'sourceApprovalDryRun', 'preparePlan', 'extractDryRun', 'extract', 'articulatedCheck', 'reviewGallery', 'runtimePreview', 'sandboxVisual', 'quickReview', 'acceptanceAudit', 'threatAcceptanceDryRun']) {
      if (!pack.commands?.[key]) failures.push(`${entry.id}: missing command ${key}`);
      else requireIncludes(`${entry.id}: markdown missing command ${key}`, markdown, pack.commands[key], failures);
    }
    const expectedSourcePreview = `npm run sandbox:preview -- --id ${entry.id} --kind source --best --serve --open --visual`;
    if (pack.commands?.sourcePreview !== expectedSourcePreview) {
      failures.push(`${entry.id}: sourcePreview command must be ${expectedSourcePreview}`);
    }
    const runtimeId = pack.runtimeCreatureId ?? entry.id;
    const expectedRuntimePreview = `npm run sandbox:preview -- --id ${runtimeId} --with diver --serve --open --visual`;
    if (pack.commands?.runtimePreview !== expectedRuntimePreview) {
      failures.push(`${entry.id}: runtimePreview command must be ${expectedRuntimePreview}`);
    }
    if (pack.commands?.sandboxVisual && (!pack.commands.sandboxVisual.includes('--with diver') || !pack.commands.sandboxVisual.includes('--states idle,lunge,stunned'))) {
      failures.push(`${entry.id}: sandboxVisual command must include idle/lunge/stunned with diver`);
    }
    if (pack.commands?.threatAcceptanceDryRun && !pack.commands.threatAcceptanceDryRun.includes('--parity-reviewed')) {
      failures.push(`${entry.id}: threatAcceptanceDryRun command must include --parity-reviewed`);
    }
    if (pack.stage === 'accepted' && pack.blockers?.length) failures.push(`${entry.id}: accepted pack has blockers`);
  }
  if (!(await fileOk(markdownPath, 256))) failures.push(`${entry.id}: rigging markdown is missing or too small`);
}
if (!(await fileOk(resolve(packDir, 'index.md'), 128))) failures.push('rigging focus index markdown is missing or too small');

const summary = {
  packDir,
  checked: entries.length,
  ids: entries.map((entry) => entry.id),
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
