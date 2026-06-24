import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const apply = args.has('apply');
const dryRun = args.has('dry-run') || args.has('dryRun') || !apply;
const overwrite = args.has('overwrite');
const model = String(args.get('model') ?? 'gpt-image-2');
const size = String(args.get('size') ?? '1536x1024');
const quality = String(args.get('quality') ?? 'high');
const outputFormat = String(args.get('output-format') ?? args.get('outputFormat') ?? 'png');
const target = resolve(String(args.get('target') ?? 'tools/source-inbox/environment-cave-wall-source.png'));
const reportPath = resolve(String(args.get('report') ?? 'tools/scratch/environment-openai-generation-report.json'));
const promptPath = resolve(String(args.get('prompt-file') ?? args.get('promptFile') ?? 'tools/source-inbox/ENVIRONMENT_HANDOFF.md'));

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

async function fileExists(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? info : null;
  } catch {
    return null;
  }
}

async function promptFromHandoff() {
  const text = await readFile(promptPath, 'utf8');
  const marker = 'Prompt:';
  const index = text.indexOf(marker);
  const prompt = index >= 0 ? text.slice(index + marker.length) : text;
  const commandIndex = prompt.indexOf('After placing the image');
  return (commandIndex >= 0 ? prompt.slice(0, commandIndex) : prompt).trim();
}

async function writeReport(report) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function validateEnvironmentSource(path) {
  const script = `
import json
import sys
from pathlib import Path
from PIL import Image

path = Path(sys.argv[1])
failures = []
with Image.open(path) as im:
    im = im.convert("RGBA")
    w, h = im.size
    if w < 900 or h < 600:
        failures.append(f"expected source sheet at least 900x600px, got {w}x{h}")
    aspect = w / max(1, h)
    if aspect < 1.1 or aspect > 1.9:
        failures.append(f"expected landscape-ish 5x6 sheet aspect, got {w}x{h}")
    corners = [im.getpixel((2, 2)), im.getpixel((w - 3, 2)), im.getpixel((2, h - 3)), im.getpixel((w - 3, h - 3))]
    keyed_corners = sum(1 for r, g, b, a in corners if r > 205 and b > 205 and g < 90)
    if keyed_corners < 3:
        failures.append("at least 3 corners should be flat #ff00ff-ish chroma key")
    border_samples = []
    for x in range(0, w, max(1, w // 18)):
        border_samples.append(im.getpixel((x, 1)))
        border_samples.append(im.getpixel((x, h - 2)))
    for y in range(0, h, max(1, h // 18)):
        border_samples.append(im.getpixel((1, y)))
        border_samples.append(im.getpixel((w - 2, y)))
    keyed = sum(1 for r, g, b, a in border_samples if r > 205 and b > 205 and g < 90)
    border_key_ratio = keyed / max(1, len(border_samples))
    if border_key_ratio < 0.68:
        failures.append(f"outer border is not mostly magenta chroma key: {border_key_ratio:.3f}")
    print(json.dumps({
        "width": w,
        "height": h,
        "borderKeyRatio": round(border_key_ratio, 4),
        "keyedCorners": keyed_corners,
        "failures": failures,
    }, indent=2))
    sys.exit(1 if failures else 0)
`;
  const result = spawnSync('python3', ['-c', script, path], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout || result.stderr || '{}');
  } catch {
    parsed = { failures: [`validation did not return JSON: ${(result.stdout || result.stderr || '').trim()}`] };
  }
  return {
    checked: true,
    ok: result.status === 0,
    ...parsed,
  };
}

async function generateImage(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for direct environment source generation');
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      output_format: outputFormat,
      n: 1,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`OpenAI image generation failed ${response.status}: ${JSON.stringify(body)}`);
  }
  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI image generation response did not contain data[0].b64_json');
  return Buffer.from(b64, 'base64');
}

const prompt = await promptFromHandoff();
if (prompt.length < 300) throw new Error(`${asRepoRelative(promptPath)} did not contain a usable environment prompt`);

const existing = await fileExists(target);
const failures = [];
if (existing && !overwrite) failures.push(`${asRepoRelative(target)} already exists; pass --overwrite only intentionally`);

const baseReport = {
  schema: 'water9/environment-openai-generation@1',
  dryRun,
  apply,
  model,
  size,
  quality,
  outputFormat,
  promptFile: asRepoRelative(promptPath),
  promptLength: prompt.length,
  target: asRepoRelative(target),
  openaiApiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
  command: 'npm run environment:generate-openai -- --apply --overwrite',
  next: [
    'npm run assets:environment-rework',
    'npx tsc --noEmit --pretty false',
    'npm run build',
  ],
};

if (failures.length) {
  const report = { ...baseReport, status: 'blocked', copied: false, imageCheck: null, failures };
  await writeReport(report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

if (dryRun) {
  const report = {
    ...baseReport,
    status: 'dry-run',
    copied: false,
    imageCheck: null,
    failures: [],
    requestPreview: {
      url: 'https://api.openai.com/v1/images/generations',
      body: { model, prompt, size, quality, output_format: outputFormat, n: 1 },
    },
  };
  await writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

await mkdir(dirname(target), { recursive: true });
let buffer;
try {
  buffer = await generateImage(prompt);
} catch (error) {
  const report = {
    ...baseReport,
    status: 'blocked',
    copied: false,
    imageCheck: null,
    failures: [String(error?.message ?? error)],
  };
  await writeReport(report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
await writeFile(target, buffer);
const targetInfo = await stat(target);
const imageCheck = validateEnvironmentSource(target);
const report = {
  ...baseReport,
  status: imageCheck.ok ? 'generated' : 'generated-invalid',
  copied: true,
  bytes: targetInfo.size,
  imageCheck,
  failures: imageCheck.failures ?? [],
};
await writeReport(report);

if (report.failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
