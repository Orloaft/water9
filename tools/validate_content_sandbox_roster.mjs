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
  json: resolve(String(args.get('json') ?? 'public/review/content-sandbox-roster.json')),
  markdown: resolve(String(args.get('markdown') ?? 'public/review/content-sandbox-roster.md')),
  html: resolve(String(args.get('html') ?? 'public/review/content-sandbox-roster.html')),
  sandbox: resolve(String(args.get('sandbox') ?? 'public/review/sandbox/manifest.json')),
  signoff: resolve(String(args.get('signoff') ?? 'public/review/content-human-signoff-queue.json')),
};
const minThreats = Number(args.get('min-threats') ?? 20);
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

function textIncludes(text, value) {
  return text.includes(String(value ?? '')) || text.includes(htmlEscape(value));
}

const roster = await readJson('content sandbox roster', paths.json);
const sandbox = await readJson('sandbox manifest', paths.sandbox);
const signoff = await readJson('human sign-off queue', paths.signoff);
const markdown = await readText('content sandbox roster markdown', paths.markdown);
const html = await readText('content sandbox roster html', paths.html);
await fileOk('content sandbox roster markdown', paths.markdown, 1024);
await fileOk('content sandbox roster html', paths.html, 4096);

if (roster?.schema !== 'water9/content-sandbox-roster@1') failures.push(`unexpected roster schema ${roster?.schema ?? 'missing'}`);
if (sandbox?.schema !== 'water9/sandbox-index@1') failures.push(`unexpected sandbox schema ${sandbox?.schema ?? 'missing'}`);
if (signoff?.schema !== 'water9/content-human-signoff-queue@1') failures.push(`unexpected sign-off schema ${signoff?.schema ?? 'missing'}`);

const items = Array.isArray(roster?.items) ? roster.items : [];
const signoffItems = Array.isArray(signoff?.items) ? signoff.items : [];
const sandboxEntries = Array.isArray(sandbox?.entries) ? sandbox.entries : [];
if (items.length < minThreats) failures.push(`roster has ${items.length} items, expected at least ${minThreats}`);
if (items.length !== signoffItems.length) failures.push(`roster item count ${items.length} does not match sign-off ${signoffItems.length}`);
if ((roster?.summary?.items ?? -1) !== items.length) failures.push('summary items mismatch');
if ((roster?.summary?.targetThreats ?? -1) !== (signoff?.summary?.targetThreats ?? minThreats)) failures.push('target threat summary mismatch');
if ((roster?.summary?.sandboxReady ?? -1) !== items.filter((item) => item.sandboxReady).length) failures.push('sandboxReady summary mismatch');
if ((roster?.summary?.runtimePreviews ?? -1) !== items.filter((item) => item.runtime?.previewCommand).length) failures.push('runtimePreviews summary mismatch');
if ((roster?.summary?.sourcePreviews ?? -1) !== items.filter((item) => item.source?.previewCommand).length) failures.push('sourcePreviews summary mismatch');

const signoffById = new Map(signoffItems.map((item) => [item.id, item]));
const sandboxById = new Map(sandboxEntries.map((entry) => [entry.id, entry]));

for (const item of items) {
  const signoffItem = signoffById.get(item.id);
  if (!signoffItem) failures.push(`${item.id}: missing sign-off item`);
  if (signoffItem && item.species !== signoffItem.species) failures.push(`${item.id}: species mismatch`);
  if (signoffItem && item.stage !== signoffItem.stage) failures.push(`${item.id}: stage mismatch`);
  if (!sandboxById.has(item.id)) failures.push(`${item.id}: missing runtime sandbox entry`);
  if (!sandboxById.has(`source-${item.id}`)) failures.push(`${item.id}: missing source sandbox entry`);
  if (item.sandboxReady !== Boolean(item.runtime && item.source)) failures.push(`${item.id}: sandboxReady does not match runtime/source presence`);

  const requiredCommands = [
    ['runtime preview', item.runtime?.previewCommand, `npm run sandbox:preview -- --id ${item.id}`],
    ['runtime paired preview', item.runtime?.pairedPreviewCommand, `npm run sandbox:preview -- --id ${item.id} --with diver`],
    ['runtime visual', item.runtime?.visualCheckCommand, `npm run sandbox:visual -- --ids ${item.id}`],
    ['runtime paired visual', item.runtime?.pairedVisualCheckCommand, `npm run sandbox:visual -- --ids ${item.id}`],
    ['source preview', item.source?.previewCommand, `npm run sandbox:preview -- --id source-${item.id}`],
    ['source paired preview', item.source?.pairedPreviewCommand, `npm run sandbox:preview -- --id source-${item.id} --with diver`],
    ['source visual', item.source?.visualCheckCommand, `npm run sandbox:visual -- --ids source-${item.id}`],
    ['source paired visual', item.source?.pairedVisualCheckCommand, `npm run sandbox:visual -- --ids source-${item.id}`],
  ];
  for (const [label, command, expected] of requiredCommands) {
    if (!String(command ?? '').includes(expected)) failures.push(`${item.id}: ${label} command must include ${expected}`);
    if (label.includes('paired') && !String(command ?? '').includes('--with diver')) failures.push(`${item.id}: ${label} command must include --with diver`);
    if (command && !markdown.includes(command)) failures.push(`${item.id}: markdown missing ${label} command`);
    if (command && !textIncludes(html, command)) failures.push(`${item.id}: html missing ${label} command`);
  }

  for (const value of [item.runtime?.url, item.runtime?.pairedUrl, item.source?.url, item.source?.pairedUrl]) {
    if (!String(value ?? '').includes('?sandbox=') && !String(value ?? '').includes('?entity=')) failures.push(`${item.id}: invalid preview url ${value ?? 'missing'}`);
    if (value && !textIncludes(html, value)) failures.push(`${item.id}: html missing preview url ${value}`);
  }
  if (!textIncludes(html, `data-sandbox-roster="${item.id}"`)) failures.push(`${item.id}: html missing row marker`);
}

for (const required of [
  'Water9 Content Sandbox Roster',
  'Quick launch surface for all 20 target threats',
  'Previewable does not mean accepted',
  'npm run content:sandbox-roster',
  'npm run content:sandbox-roster-check',
  'npm run sandbox:preview -- --id <entity-id> --with diver --serve --open --visual',
]) {
  if (!markdown.includes(required) && !textIncludes(html, required)) failures.push(`rendered outputs missing ${required}`);
}

const summary = {
  schema: 'water9/content-sandbox-roster-check@1',
  items: items.length,
  sandboxReady: roster?.summary?.sandboxReady ?? null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
