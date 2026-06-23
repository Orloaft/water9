import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const host = String(args.get('host') ?? '127.0.0.1');
const port = Number(args.get('port') ?? 5188);
const targetDir = resolve(String(args.get('target-dir') ?? args.get('targetDir') ?? 'tools/source-inbox'));
const scratchDir = resolve(String(args.get('scratch-dir') ?? args.get('scratchDir') ?? 'tools/scratch/source-inbox-capture'));
const queuePath = resolve(String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json'));
const rejectionPath = resolve(String(args.get('rejections') ?? 'public/review/source-candidates/rejected-attempts.json'));
const jsonOut = args.has('json');
const openBrowser = args.has('open');
const initialId = String(args.get('id') ?? '').trim();
const initialIds = String(args.get('ids') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const maxBytes = Number(args.get('max-bytes') ?? args.get('maxBytes') ?? 12 * 1024 * 1024);
const allowedMimeTypes = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
]);
const MANUAL_CAPTURE_THRESHOLD = 5;

function asRepoRelative(path) {
  const absolute = resolve(path);
  const cwd = `${process.cwd()}/`;
  return absolute.startsWith(cwd) ? absolute.slice(cwd.length) : path;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'candidate';
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readText(path, fallback = '') {
  try {
    return await readFile(resolve(path), 'utf8');
  } catch {
    return fallback;
  }
}

async function loadQueue(filterIds = []) {
  const queue = await readJson(queuePath, { schema: null, candidates: [] });
  const rejected = await readJson(rejectionPath, { schema: 'water9/source-rejected-attempts@1', attempts: [] });
  const candidates = Array.isArray(queue.candidates) ? queue.candidates : [];
  const attempts = Array.isArray(rejected.attempts) ? rejected.attempts : [];
  const filter = new Set(filterIds.filter(Boolean));
  return Promise.all(candidates
    .filter((candidate) => filter.size === 0 || filter.has(candidate.id))
    .map(async (candidate) => {
      const contract = `public/review/source-candidates/art-contracts/${safeFileName(candidate.id)}.md`;
      return {
        id: candidate.id,
        species: candidate.species,
        rank: candidate.rank,
        score: candidate.score,
        promptFile: candidate.promptFile,
        promptText: candidate.promptFile ? await readText(candidate.promptFile) : '',
        contract,
        contractText: await readText(contract),
        inboxFile: `tools/source-inbox/${candidate.id}.png`,
        gameplayVerb: candidate.gameplayVerb ?? '',
        captureEscalation: captureEscalationFor(candidate.id, attempts),
      };
    }));
}

function rejectionKind(attempt) {
  if (attempt.copiedImage) return 'visual-rejection';
  if (attempt.sourceImagegenMarker || /no (new |recoverable |accessible )?(saved |source )?(image )?file|did not create an accessible source image file|no project-bound artifact|inline/i.test(String(attempt.reason ?? ''))) {
    return 'missing-artifact';
  }
  return 'other';
}

function captureEscalationFor(id, attempts) {
  const missingArtifactAttempts = attempts.filter((attempt) => attempt.candidateId === id && rejectionKind(attempt) === 'missing-artifact').length;
  const manualCaptureRequired = missingArtifactAttempts >= MANUAL_CAPTURE_THRESHOLD;
  return {
    schema: 'water9/source-capture-escalation@1',
    candidateId: id,
    threshold: MANUAL_CAPTURE_THRESHOLD,
    missingArtifactAttempts,
    manualCaptureRequired,
    noMoreInlineRetries: manualCaptureRequired,
    reason: manualCaptureRequired
      ? `Built-in inline generation has produced ${missingArtifactAttempts} missing-artifact attempts for ${id}; capture/save the rendered image here before any ingest step.`
      : `Manual capture escalation starts at ${MANUAL_CAPTURE_THRESHOLD} missing-artifact attempts.`,
    primaryCommand: `npm run source:inbox-capture -- --id ${id} --open`,
    expectedInboxFile: `tools/source-inbox/${id}.png`,
  };
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
  if (!match) throw new Error('dataUrl must be a base64 data URL');
  const mimeType = match[1].toLowerCase();
  const extension = allowedMimeTypes.get(mimeType);
  if (!extension) throw new Error(`unsupported image MIME type ${mimeType}`);
  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (buffer.length < 512) throw new Error('image payload is too small');
  if (buffer.length > maxBytes) throw new Error(`image payload ${buffer.length} bytes exceeds max ${maxBytes}`);
  return { mimeType, extension, buffer };
}

function validateSourceImage(id, path) {
  const result = spawnSync('python3', [
    'tools/validate_source_candidate_images.py',
    '--id',
    id,
    '--image',
    path,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const output = result.stdout || result.stderr || '';
  try {
    const parsed = JSON.parse(output);
    return {
      checked: true,
      metrics: parsed.metrics?.[0] ?? null,
      failures: parsed.failures ?? [],
    };
  } catch {
    return {
      checked: true,
      metrics: null,
      failures: [`image validation did not return JSON${output ? `: ${output.trim()}` : ''}`],
    };
  }
}

async function existingFile(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? info : null;
  } catch {
    return null;
  }
}

async function handleUpload(payload) {
  const id = String(payload.id ?? '').trim();
  const overwrite = payload.overwrite === true;
  if (!id) throw new Error('candidate id is required');
  const candidates = await loadQueue();
  const candidate = candidates.find((item) => item.id === id);
  if (!candidate) throw new Error(`${id} is not in the current source-generation queue`);
  const { mimeType, extension, buffer } = parseDataUrl(payload.dataUrl);
  const target = resolve(targetDir, `${id}${extension}`);
  const existing = await existingFile(target);
  if (existing && !overwrite) throw new Error(`${asRepoRelative(target)} already exists; enable overwrite only intentionally`);

  await mkdir(scratchDir, { recursive: true });
  await mkdir(targetDir, { recursive: true });
  const temp = resolve(scratchDir, `${id}-${Date.now()}${extension}`);
  await writeFile(temp, buffer);
  const imageCheck = validateSourceImage(id, temp);
  if (imageCheck.failures.length) {
    await rm(temp, { force: true });
    return {
      ok: false,
      id,
      species: candidate.species,
      copied: false,
      target: asRepoRelative(target),
      mimeType,
      imageCheck,
      failures: imageCheck.failures,
    };
  }
  await rename(temp, target);
  return {
    ok: true,
    id,
    species: candidate.species,
    copied: true,
    target: asRepoRelative(target),
    file: basename(target),
    bytes: buffer.length,
    mimeType,
    imageCheck,
    next: [
      `npm run source:inbox-check -- --dir ${asRepoRelative(targetDir)} --strict --ids ${id}`,
      `npm run source:ingest-current -- --id ${id} --dry-run`,
      `npm run source:ingest-current -- --id ${id} --apply`,
      `npm run sandbox:preview -- --id ${id} --kind source --serve --open --visual`,
      'npm run source:review-dossier && npm run source:review-dossier-check',
      'npm run source:check',
    ],
  };
}

function renderPage(candidates, selectedId = '', batchIds = []) {
  const options = candidates.map((candidate) => (
    `<option value="${htmlEscape(candidate.id)}" ${candidate.id === selectedId ? 'selected' : ''}>${htmlEscape(String(candidate.rank ?? '').padStart(2, '0'))} ${htmlEscape(candidate.id)} - ${htmlEscape(candidate.species)}</option>`
  )).join('');
  const batchSet = new Set(batchIds);
  const batchCandidates = batchSet.size
    ? candidates.filter((candidate) => batchSet.has(candidate.id))
    : candidates.slice(0, 5);
  const batchLinks = batchCandidates.map((candidate) => (
    `<button class="target" type="button" data-id="${htmlEscape(candidate.id)}"><span>${htmlEscape(candidate.id)}</span><small>${htmlEscape(candidate.species)}</small></button>`
  )).join('');
  const candidatePayload = JSON.stringify(candidates).replaceAll('<', '\\u003c');
  const batchPayload = JSON.stringify(batchCandidates.map((candidate) => candidate.id)).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Water 9 Source Inbox Capture</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #071316; color: #e4f2f5; }
      body { margin: 0; min-height: 100vh; background: #071316; }
      main { max-width: 1180px; margin: 0 auto; padding: 28px 16px 48px; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 4rem); letter-spacing: 0; }
      p { color: #a8c1c8; line-height: 1.45; }
      label { display: block; margin: 14px 0 6px; color: #d5edf2; }
      select, input, button { width: 100%; box-sizing: border-box; border: 1px solid #2d4b55; border-radius: 6px; background: #0d2026; color: #e4f2f5; padding: 10px 12px; font: inherit; }
      button { margin-top: 12px; cursor: pointer; background: #145566; border-color: #3ea8bd; }
      .warning { margin: 14px 0; padding: 12px; border: 1px solid #d4a953; border-radius: 6px; background: #211907; color: #ffe7ad; }
      .warning strong { color: #fff2cf; }
      .layout { display: grid; grid-template-columns: minmax(230px, 320px) 1fr; gap: 18px; align-items: start; }
      .tray { position: sticky; top: 16px; border: 1px solid #203943; border-radius: 8px; background: #08181d; padding: 12px; }
      .tray h2 { margin: 0 0 8px; font-size: 1rem; }
      .target { display: grid; gap: 3px; text-align: left; margin: 8px 0 0; background: #0d2026; }
      .target.active { border-color: #7ee8ff; background: #11313a; }
      .target.saved { border-color: #5dc58f; }
      .target small { color: #8faab2; }
      .drop { display: grid; place-items: center; min-height: 260px; margin: 16px 0; border: 2px dashed #365b66; border-radius: 8px; background: #091b20; color: #8faab2; text-align: center; padding: 20px; }
      .drop.active { border-color: #7ee8ff; color: #d7fbff; }
      .meta { margin: 14px 0; padding: 12px; border: 1px solid #203943; border-radius: 6px; background: #08181d; }
      .meta dl { display: grid; grid-template-columns: minmax(96px, max-content) 1fr; gap: 8px 12px; margin: 0; }
      .meta dt { color: #8faab2; }
      .meta dd { margin: 0; overflow-wrap: anywhere; }
      details { margin: 12px 0; border: 1px solid #203943; border-radius: 6px; background: #071316; }
      summary { cursor: pointer; padding: 10px 12px; color: #d5edf2; }
      details pre { margin: 0; border-width: 1px 0 0; border-radius: 0 0 6px 6px; max-height: 280px; }
      img { max-width: 100%; max-height: 360px; object-fit: contain; image-rendering: auto; }
      pre { white-space: pre-wrap; background: #040b0d; border: 1px solid #203943; border-radius: 6px; padding: 12px; overflow: auto; }
      .row { display: flex; gap: 12px; align-items: center; }
      .row input { width: auto; }
      .row label { margin: 0; }
      @media (max-width: 820px) { .layout { grid-template-columns: 1fr; } .tray { position: static; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Source Inbox Capture</h1>
      <p>Paste, drop, or select a generated whole-source creature image. The server validates the magenta source image and writes it into <code>${htmlEscape(asRepoRelative(targetDir))}</code>.</p>
      <section class="layout">
        <aside class="tray">
          <h2>Sprint Targets</h2>
          <p>Use these buttons to switch target without reopening the capture server.</p>
          <div id="batchTargets">${batchLinks}</div>
        </aside>
        <section>
          <label for="candidate">Candidate</label>
          <select id="candidate">${options}</select>
          <div class="meta" id="candidateMeta"></div>
          <div class="drop" id="drop">Copy the inline generated image, then paste here. You can also drop an image or choose a file below.</div>
          <input id="file" type="file" accept="image/png,image/jpeg,image/webp">
          <div class="row">
            <input id="overwrite" type="checkbox">
            <label for="overwrite">Overwrite existing inbox file</label>
          </div>
          <button id="upload" disabled>Validate And Copy To Inbox</button>
          <h2>Preview</h2>
          <div id="preview"></div>
          <h2>Result</h2>
          <pre id="result">No image selected.</pre>
        </section>
      </section>
    </main>
    <script>
      const candidate = document.querySelector('#candidate');
      const candidateMeta = document.querySelector('#candidateMeta');
      const batchTargets = document.querySelector('#batchTargets');
      const fileInput = document.querySelector('#file');
      const drop = document.querySelector('#drop');
      const upload = document.querySelector('#upload');
      const overwrite = document.querySelector('#overwrite');
      const preview = document.querySelector('#preview');
      const result = document.querySelector('#result');
      let selected = null;
      const candidates = ${candidatePayload};
      const batchIds = ${batchPayload};
      const savedIds = new Set();

      function setResult(value) {
        result.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      }

      function selectFile(file) {
        if (!file) return;
        selected = file;
        upload.disabled = false;
        preview.innerHTML = '';
        const image = document.createElement('img');
        image.src = URL.createObjectURL(file);
        preview.appendChild(image);
        setResult({ selected: file.name, bytes: file.size, type: file.type });
      }

      function renderCandidateMeta() {
        const item = candidates.find((entry) => entry.id === candidate.value);
        if (!item) {
          candidateMeta.textContent = 'No candidate selected.';
          return;
        }
        const escalation = item.captureEscalation || {};
        const warning = escalation.manualCaptureRequired
          ? '<div class="warning"><strong>Manual capture required.</strong> ' + escapeHtml(escalation.reason) + '<br><code>' + escapeHtml(escalation.expectedInboxFile) + '</code></div>'
          : '';
        candidateMeta.innerHTML = warning + '<dl>'
          + '<dt>species</dt><dd>' + escapeHtml(item.species) + '</dd>'
          + '<dt>prompt</dt><dd><code>' + escapeHtml(item.promptFile) + '</code></dd>'
          + '<dt>contract</dt><dd><code>' + escapeHtml(item.contract) + '</code></dd>'
          + '<dt>target</dt><dd><code>' + escapeHtml(item.inboxFile) + '</code></dd>'
          + '<dt>verb</dt><dd>' + escapeHtml(item.gameplayVerb || 'not recorded') + '</dd>'
          + '<dt>missing artifacts</dt><dd>' + escapeHtml(String(escalation.missingArtifactAttempts ?? 0)) + '/' + escapeHtml(String(escalation.threshold ?? 5)) + '</dd>'
          + '<dt>inline retries</dt><dd>' + escapeHtml(escalation.noMoreInlineRetries ? 'stopped' : 'allowed') + '</dd>'
          + '</dl>'
          + '<details open><summary>Generation Prompt</summary><pre>' + escapeHtml(item.promptText || 'No prompt text loaded.') + '</pre></details>'
          + '<details><summary>Art Contract</summary><pre>' + escapeHtml(item.contractText || 'No contract text loaded.') + '</pre></details>';
        renderBatchTargets();
      }

      function renderBatchTargets() {
        for (const button of batchTargets.querySelectorAll('.target')) {
          button.classList.toggle('active', button.dataset.id === candidate.value);
          button.classList.toggle('saved', savedIds.has(button.dataset.id));
        }
      }

      function escapeHtml(value) {
        return String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;');
      }

      fileInput.addEventListener('change', () => selectFile(fileInput.files[0]));
      candidate.addEventListener('change', renderCandidateMeta);
      batchTargets.addEventListener('click', (event) => {
        const button = event.target.closest('.target');
        if (!button) return;
        candidate.value = button.dataset.id;
        renderCandidateMeta();
      });
      drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('active'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('active'));
      drop.addEventListener('drop', (event) => {
        event.preventDefault();
        drop.classList.remove('active');
        selectFile(event.dataTransfer.files[0]);
      });
      window.addEventListener('paste', (event) => {
        const file = [...event.clipboardData.files].find((item) => item.type.startsWith('image/'))
          || [...event.clipboardData.items].find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile();
        if (file) selectFile(file);
      });
      upload.addEventListener('click', async () => {
        if (!selected) return;
        upload.disabled = true;
        setResult('Reading image...');
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(selected);
        });
        setResult('Uploading...');
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: candidate.value, filename: selected.name, dataUrl, overwrite: overwrite.checked }),
        });
        const payload = await response.json();
        setResult(payload);
        if (payload.ok && payload.id) savedIds.add(payload.id);
        renderBatchTargets();
        upload.disabled = false;
      });
      renderCandidateMeta();
    </script>
  </body>
</html>`;
}

function openUrl(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const commandArgs = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, commandArgs, { detached: true, stdio: 'ignore' });
  child.unref();
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${host}`);
    const queryIds = String(url.searchParams.get('ids') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const activeIds = queryIds.length ? queryIds : initialIds;
    if (request.method === 'GET' && url.pathname === '/') {
      const candidates = await loadQueue(activeIds);
      const selectedId = url.searchParams.get('id') ?? initialId;
      sendHtml(response, renderPage(candidates, candidates.some((candidate) => candidate.id === selectedId) ? selectedId : candidates[0]?.id ?? '', activeIds));
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/candidates') {
      sendJson(response, 200, { candidates: await loadQueue(activeIds), ids: activeIds });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/upload') {
      const payload = await readRequestJson(request);
      const result = await handleUpload(payload);
      sendJson(response, result.ok ? 200 : 422, result);
      return;
    }
    sendJson(response, 404, { ok: false, failures: [`unknown route ${request.method} ${url.pathname}`] });
  } catch (error) {
    sendJson(response, 500, { ok: false, failures: [error.message] });
  }
});

server.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const url = `http://${host}:${actualPort}/`;
  const selectedParams = new URLSearchParams();
  if (initialId) selectedParams.set('id', initialId);
  if (initialIds.length) selectedParams.set('ids', initialIds.join(','));
  const selectedQuery = selectedParams.toString();
  const payload = {
    schema: 'water9/source-inbox-capture-server@1',
    url,
    selectedUrl: selectedQuery ? `${url}?${selectedQuery}` : url,
    initialId: initialId || null,
    initialIds,
    targetDir: asRepoRelative(targetDir),
    queue: asRepoRelative(queuePath),
    rejections: asRepoRelative(rejectionPath),
    maxBytes,
  };
  console.log(JSON.stringify(payload));
  if (!jsonOut) {
    console.log(`Source inbox capture server: ${url}`);
    console.log('Paste, drop, or select an image, then validate and copy it to the inbox.');
    console.log('Press Ctrl-C to stop.');
  }
  if (openBrowser) openUrl(payload.selectedUrl);
});

const stop = () => server.close(() => process.exit(0));
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
