import { copyFile, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const script = resolve('tools/source_inbox_capture_server.mjs');
const fixtureImage = resolve('public/assets/generated/fauna-brine-crown-whole-source.png');
const runbookPath = resolve('public/review/source-candidates/source-acquisition-runbook.json');

async function readFirstJsonLine(child) {
  let buffer = '';
  return new Promise((resolveLine, rejectLine) => {
    const timer = setTimeout(() => rejectLine(new Error('timed out waiting for server JSON line')), 8000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      clearTimeout(timer);
      const line = buffer.slice(0, newline).trim();
      try {
        resolveLine(JSON.parse(line));
      } catch (error) {
        rejectLine(new Error(`could not parse server JSON line: ${error.message}: ${line}`));
      }
    });
    child.once('error', rejectLine);
    child.once('exit', (code) => {
      if (code !== null && code !== 0) rejectLine(new Error(`server exited early with code ${code}`));
    });
  });
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolveStop) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolveStop();
    }, 1500);
    child.once('exit', () => {
      clearTimeout(timer);
      resolveStop();
    });
  });
}

async function main() {
  const runbook = JSON.parse(await readFile(runbookPath, 'utf8'));
  const ids = Array.isArray(runbook.ids) ? runbook.ids.slice(0, 2) : [];
  if (ids.length < 1) {
    console.log(JSON.stringify({
      schema: 'water9/source-inbox-capture-smoke@1',
      uploaded: null,
      skipped: true,
      reason: 'source acquisition runbook has no active target ids',
      failures: [],
    }, null, 2));
    return;
  }
  const [selectedId, companionId] = ids;
  const batchIds = ids.join(',');
  const firstRunbookCandidate = runbook.candidates?.find((candidate) => candidate.id === selectedId);
  if (!firstRunbookCandidate?.promptFile || !firstRunbookCandidate?.contract) {
    throw new Error(`runbook candidate is missing prompt/contract paths: ${JSON.stringify(firstRunbookCandidate, null, 2)}`);
  }
  const dir = await mkdtemp(join(tmpdir(), 'water9-source-capture-'));
  const inbox = join(dir, 'source-inbox');
  const scratch = join(dir, 'scratch');
  const child = spawn(process.execPath, [
    script,
    '--port', '0',
    '--json',
    '--id', selectedId,
    '--ids', batchIds,
    '--target-dir', inbox,
    '--scratch-dir', scratch,
  ], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    const server = await readFirstJsonLine(child);
    if (!server.selectedUrl?.includes(`?id=${selectedId}`)) {
      throw new Error(`capture server selectedUrl did not preserve initial id: ${JSON.stringify(server, null, 2)}`);
    }
    if (!server.selectedUrl?.includes(`ids=${encodeURIComponent(batchIds)}`)) {
      throw new Error(`capture server selectedUrl did not preserve batch ids: ${JSON.stringify(server, null, 2)}`);
    }
    if (server.initialIds?.join(',') !== batchIds) {
      throw new Error(`capture server did not report batch ids: ${JSON.stringify(server, null, 2)}`);
    }
    const candidatePayload = await fetch(`${server.url}api/candidates?ids=${encodeURIComponent(batchIds)}`).then((response) => response.json());
    if (candidatePayload.candidates?.length !== ids.length || candidatePayload.ids?.join(',') !== batchIds) {
      throw new Error(`candidate API did not filter to batch ids: ${JSON.stringify(candidatePayload, null, 2)}`);
    }
    const selectedCandidate = candidatePayload.candidates.find((candidate) => candidate.id === selectedId);
    if (!selectedCandidate?.promptText?.includes('Source pose contract')) {
      throw new Error(`candidate API did not include full prompt text: ${JSON.stringify(selectedCandidate, null, 2)}`);
    }
    if (!selectedCandidate?.contractText?.includes('Non-negotiable pass/fail requirements')) {
      throw new Error(`candidate API did not include full contract text: ${JSON.stringify(selectedCandidate, null, 2)}`);
    }
    if (selectedCandidate.captureEscalation?.schema !== 'water9/source-capture-escalation@1') {
      throw new Error(`candidate API did not include capture escalation metadata: ${JSON.stringify(selectedCandidate, null, 2)}`);
    }
    const fixture = join(dir, 'source.png');
    await copyFile(fixtureImage, fixture);
    const data = await readFile(fixture);
    const response = await fetch(`${server.url}api/upload`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: selectedId,
        filename: 'source.png',
        dataUrl: `data:image/png;base64,${data.toString('base64')}`,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(`capture upload failed: ${JSON.stringify(payload, null, 2)}`);
    }
    const target = join(inbox, `${selectedId}.png`);
    const targetInfo = await stat(target);
    if (targetInfo.size !== data.length) throw new Error('captured inbox file size does not match uploaded image');
    if (!payload.next?.some((command) => command.includes('source:inbox-check'))) {
      throw new Error(`capture response did not include inbox-check command: ${JSON.stringify(payload, null, 2)}`);
    }
    if (!payload.next?.includes(`npm run source:ingest-current -- --id ${selectedId} --dry-run`)) {
      throw new Error(`capture response did not include single-target ingest-current dry run: ${JSON.stringify(payload, null, 2)}`);
    }
    if (!payload.next?.includes(`npm run source:ingest-current -- --id ${selectedId} --apply`)) {
      throw new Error(`capture response did not include single-target ingest-current apply: ${JSON.stringify(payload, null, 2)}`);
    }
    if (payload.next?.some((command) => command.includes('source:ingest-batch'))) {
      throw new Error(`capture response should not advertise batch ingest for one uploaded source: ${JSON.stringify(payload, null, 2)}`);
    }
    const page = await fetch(`${server.url}?id=${selectedId}&ids=${encodeURIComponent(batchIds)}`).then((response) => response.text());
    const expectedTexts = [
      firstRunbookCandidate.promptFile,
      firstRunbookCandidate.contract,
      `tools/source-inbox/${selectedId}.png`,
      'Sprint Targets',
      'Copy the inline generated image, then paste here.',
      'missing artifacts',
      'inline retries',
      'Generation Prompt',
      'Art Contract',
      'Non-negotiable pass/fail requirements',
    ].filter(Boolean);
    if (companionId) expectedTexts.push(companionId);
    for (const expected of expectedTexts) {
      if (!page.includes(expected)) {
        throw new Error(`capture page did not include expected text: ${expected}`);
      }
    }
    console.log(JSON.stringify({
      schema: 'water9/source-inbox-capture-smoke@1',
      uploaded: payload.target,
      bytes: targetInfo.size,
      failures: [],
    }, null, 2));
  } finally {
    await stop(child);
    await rm(dir, { recursive: true, force: true });
  }
}

await main();
