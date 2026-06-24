import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const host = String(args.get('host') ?? '127.0.0.1');
const port = Number(args.get('port') ?? 5199);
const target = resolve(String(args.get('target') ?? 'tools/source-inbox/environment-cave-wall-source.png'));
const maxBytes = Number(args.get('max-bytes') ?? args.get('maxBytes') ?? 18 * 1024 * 1024);
const json = args.has('json');
const allowedMimeTypes = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
]);

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendHtml(response, html) {
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(html);
}

async function readRequestJson(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes * 1.4) throw new Error(`request body exceeds max size ${maxBytes}`);
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl ?? '').match(/^data:([^;,]+);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) throw new Error('dataUrl must be a base64 image data URL');
  const mimeType = match[1].toLowerCase();
  if (!allowedMimeTypes.has(mimeType)) throw new Error(`unsupported image MIME type ${mimeType}`);
  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (buffer.length < 4096) throw new Error('image payload is too small');
  if (buffer.length > maxBytes) throw new Error(`image payload ${buffer.length} bytes exceeds max ${maxBytes}`);
  return { mimeType, buffer };
}

async function existingTarget() {
  try {
    const info = await stat(target);
    return info.isFile() ? { exists: true, bytes: info.size, mtime: info.mtime.toISOString() } : { exists: false };
  } catch {
    return { exists: false };
  }
}

function validateCapture(path) {
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
    if w < 700 or h < 800:
        failures.append(f"expected a 5x6 source sheet at least 700x800px, got {w}x{h}")
    if w / max(1, h) < 0.55 or w / max(1, h) > 1.45:
        failures.append(f"source sheet aspect looks wrong: {w}x{h}")
    corners = [im.getpixel((2, 2)), im.getpixel((w - 3, 2)), im.getpixel((2, h - 3)), im.getpixel((w - 3, h - 3))]
    magenta = 0
    for r, g, b, a in corners:
        if r > 210 and b > 210 and g < 70:
            magenta += 1
    if magenta < 3:
        failures.append("at least 3 corners should be flat #ff00ff-ish chroma key")
    # Sample grid lines lightly to catch screenshots with dark borders instead of chroma key.
    border_samples = []
    for x in range(0, w, max(1, w // 12)):
        border_samples.append(im.getpixel((x, 1)))
        border_samples.append(im.getpixel((x, h - 2)))
    for y in range(0, h, max(1, h // 12)):
        border_samples.append(im.getpixel((1, y)))
        border_samples.append(im.getpixel((w - 2, y)))
    keyed = sum(1 for r, g, b, a in border_samples if r > 210 and b > 210 and g < 70)
    if keyed < len(border_samples) * 0.7:
        failures.append("outer border is not mostly magenta chroma key")
    print(json.dumps({"width": w, "height": h, "failures": failures}, indent=2))
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
    ok: result.status === 0,
    ...parsed,
  };
}

async function handleUpload(payload) {
  const overwrite = payload.overwrite === true;
  const { mimeType, buffer } = parseDataUrl(payload.dataUrl);
  const existing = await existingTarget();
  if (existing.exists && !overwrite) {
    throw new Error(`${asRepoRelative(target)} already exists; enable overwrite only intentionally`);
  }
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, buffer);
  const validation = validateCapture(target);
  return {
    ok: validation.ok,
    target: asRepoRelative(target),
    mimeType,
    bytes: buffer.length,
    validation,
    next: validation.ok
      ? [
          'npm run assets:environment-rework',
          'npx tsc --noEmit --pretty false',
          'npm run build',
        ]
      : ['replace the captured sheet with a full 5x6 magenta-background source sheet'],
  };
}

async function page() {
  const existing = await existingTarget();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Water9 Environment Source Capture</title>
  <style>
    html, body { margin: 0; min-height: 100%; background: #061017; color: #d9f1f4; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    main { max-width: 980px; margin: 0 auto; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 24px; letter-spacing: 0; }
    p { color: #aac8cc; line-height: 1.45; }
    code { color: #f2fdff; background: rgba(255,255,255,0.08); padding: 2px 5px; border-radius: 4px; }
    .drop { margin-top: 18px; min-height: 330px; border: 1px dashed rgba(127,229,236,0.54); border-radius: 8px; background: rgba(2,9,14,0.74); display: grid; place-items: center; text-align: center; padding: 22px; }
    .drop.drag { background: rgba(28, 103, 116, 0.24); border-color: rgba(170,246,250,0.9); }
    .preview { max-width: 100%; max-height: 520px; margin-top: 20px; border: 1px solid rgba(127,229,236,0.25); background: #ff00ff; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 16px; }
    button, label.button { border: 1px solid rgba(127,229,236,0.42); background: rgba(10,47,57,0.88); color: #ecfdff; border-radius: 6px; padding: 9px 12px; cursor: pointer; font: inherit; }
    input[type=file] { display: none; }
    button:disabled { opacity: 0.45; cursor: default; }
    textarea { width: 100%; min-height: 130px; margin-top: 16px; box-sizing: border-box; background: #02070a; color: #d9f1f4; border: 1px solid rgba(127,229,236,0.26); border-radius: 6px; padding: 12px; }
    .status { margin-top: 16px; white-space: pre-wrap; color: #b9d6d9; }
  </style>
</head>
<body>
  <main>
    <h1>Water9 Environment Source Capture</h1>
    <p>Paste, drag/drop, or select the inline Imagegen 5x6 source sheet. The server writes exactly <code>${asRepoRelative(target)}</code>.</p>
    <p>Existing target: <code>${existing.exists ? `${existing.bytes} bytes, ${existing.mtime}` : 'none'}</code></p>
    <div class="drop" id="drop">
      <div>
        <p>Paste image from clipboard here, drop a file, or choose a file.</p>
        <div class="row">
          <label class="button">Choose Image<input id="file" type="file" accept="image/png,image/jpeg,image/webp"></label>
          <button id="save" type="button" disabled>Save Capture</button>
          <label><input id="overwrite" type="checkbox" ${existing.exists ? '' : 'checked'}> overwrite target</label>
        </div>
        <img id="preview" class="preview" alt="" hidden>
      </div>
    </div>
    <textarea id="dataurl" placeholder="Or paste an image data URL here"></textarea>
    <div class="status" id="status"></div>
  </main>
  <script>
    const drop = document.getElementById('drop');
    const fileInput = document.getElementById('file');
    const preview = document.getElementById('preview');
    const save = document.getElementById('save');
    const overwrite = document.getElementById('overwrite');
    const dataUrlInput = document.getElementById('dataurl');
    const status = document.getElementById('status');
    let dataUrl = '';

    function setDataUrl(value) {
      dataUrl = value;
      dataUrlInput.value = value.startsWith('data:') ? value.slice(0, 180) + '...' : '';
      preview.src = value;
      preview.hidden = false;
      save.disabled = false;
      status.textContent = 'Image staged. Click Save Capture.';
    }
    function readFile(file) {
      const reader = new FileReader();
      reader.onload = () => setDataUrl(String(reader.result || ''));
      reader.readAsDataURL(file);
    }
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) readFile(file);
    });
    document.addEventListener('paste', (event) => {
      const item = [...(event.clipboardData?.items || [])].find((candidate) => candidate.type.startsWith('image/'));
      if (!item) return;
      const file = item.getAsFile();
      if (file) readFile(file);
    });
    drop.addEventListener('dragover', (event) => {
      event.preventDefault();
      drop.classList.add('drag');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', (event) => {
      event.preventDefault();
      drop.classList.remove('drag');
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) readFile(file);
    });
    dataUrlInput.addEventListener('input', () => {
      const value = dataUrlInput.value.trim();
      if (value.startsWith('data:image/')) setDataUrl(value);
    });
    save.addEventListener('click', async () => {
      save.disabled = true;
      status.textContent = 'Saving...';
      try {
        const response = await fetch('/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ dataUrl, overwrite: overwrite.checked }),
        });
        const payload = await response.json();
        status.textContent = JSON.stringify(payload, null, 2);
      } catch (error) {
        status.textContent = String(error && error.message || error);
      } finally {
        save.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, { ok: true, target: asRepoRelative(target), existing: await existingTarget() });
      return;
    }
    if (request.method === 'POST' && request.url === '/upload') {
      const payload = await readRequestJson(request);
      const result = await handleUpload(payload);
      sendJson(response, result.ok ? 200 : 422, result);
      return;
    }
    if (request.method === 'GET') {
      sendHtml(response, await page());
      return;
    }
    sendJson(response, 405, { ok: false, error: 'method not allowed' });
  } catch (error) {
    sendJson(response, 400, { ok: false, error: String(error?.message ?? error) });
  }
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}/`;
  const payload = { ok: true, url, target: asRepoRelative(target), maxBytes };
  if (json) console.log(JSON.stringify(payload, null, 2));
  else {
    console.log(`Environment source capture: ${url}`);
    console.log(`Target: ${asRepoRelative(target)}`);
  }
});
