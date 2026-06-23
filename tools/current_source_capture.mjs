import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

const nextActionPath = String(args.get('next-action') ?? 'public/review/content-next-action.json');
const workstationPath = String(args.get('workstation') ?? 'public/review/source-candidates/source-workstation.json');
const queuePath = String(args.get('queue') ?? 'public/review/source-candidates/source-generation-queue.json');
const host = String(args.get('host') ?? '127.0.0.1');
const port = String(args.get('port') ?? '5188');
const jsonOnly = args.has('json');
const serve = args.has('serve') || args.has('open');
const open = args.has('open');

const nextAction = await readJson(nextActionPath, { nextAction: {} });
const workstation = await readJson(workstationPath, { target: null });
const queue = await readJson(queuePath, { candidates: [] });
const workstationTarget = typeof workstation.target === 'string'
  ? workstation.target
  : workstation.target?.id;
const queueIds = new Set((Array.isArray(queue.candidates) ? queue.candidates : []).map((candidate) => candidate.id).filter(Boolean));
const requestedId = String(args.get('id') ?? '').trim();
const nextActionTarget = nextAction.nextAction?.targetId ?? null;
const targetId = String(
  requestedId
    || (nextActionTarget && queueIds.has(nextActionTarget) ? nextActionTarget : null)
    || (workstationTarget && queueIds.has(workstationTarget) ? workstationTarget : null)
    || queue.candidates?.[0]?.id
    || nextActionTarget
    || workstationTarget
    || '',
).trim();
if (!targetId) {
  console.error('No current source capture target found. Run npm run content:next or npm run source:generation-queue first.');
  process.exit(1);
}

const command = [
  'node',
  'tools/source_inbox_capture_server.mjs',
  '--id',
  targetId,
  '--host',
  host,
  '--port',
  port,
  ...(open ? ['--open'] : []),
];
const report = {
  schema: 'water9/current-source-capture@1',
  targetId,
  url: `http://${host}:${port}/?id=${encodeURIComponent(targetId)}`,
  inboxTarget: `tools/source-inbox/${targetId}.png`,
  command: `node tools/source_inbox_capture_server.mjs --id ${targetId} --host ${host} --port ${port}${open ? ' --open' : ''}`,
  npmCommand: `npm run source:current-capture${open ? ':open' : ''}`,
  next: [
    `npm run source:inbox-check -- --dir tools/source-inbox --strict --ids ${targetId}`,
    `npm run source:ingest-current -- --id ${targetId} --dry-run`,
    `npm run source:ingest-current -- --id ${targetId} --apply`,
    'npm run source:check',
  ],
};

console.log(JSON.stringify(report, null, 2));
if (!serve || jsonOnly) process.exit(0);

const child = spawn(command[0], command.slice(1), {
  cwd: process.cwd(),
  stdio: 'inherit',
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
