import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, relative, resolve } from 'node:path';

const artifactBase = resolve(process.env.WATER9_SLICE4_ARTIFACT_BASE
  ?? '/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13');
const output = resolve(process.env.WATER9_SLICE4_MANIFEST
  ?? 'runs/swimming-backgrounds-full-implementation-2026-07-13/slice4-artifacts.json');
const roots = ['slice4', 'slice4-recovery'].map((name) => ({ name, path: resolve(artifactBase, name) }));
const files = [];

async function walk(root, directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(root, path);
    else files.push({ root, path });
  }
}

function evidenceConditions(relativePath) {
  const match = relativePath.match(/b([1-4])-s(\d+)-(\d+)m/);
  return match ? { biome: Number(match[1]), seed: Number(match[2]), depthMeters: Number(match[3]) } : null;
}

function classify(root, path) {
  const relativePath = relative(root.path, path);
  const lower = relativePath.toLowerCase();
  const conditions = evidenceConditions(relativePath);
  if (root.name === 'slice4') return {
    role: 'manager-rejected-original-slice4-evidence',
    acceptedEvidence: false,
    status: 'REJECTED_MANAGER_VISUAL_2026-07-13',
    conditions,
  };
  if (lower.startsWith('visual-matrix/visual-matrix/')) return {
    role: 'superseded-recovery-capture-attempt',
    acceptedEvidence: false,
    status: 'SUPERSEDED_RECOVERY_ATTEMPT',
    conditions,
  };
  if (lower.endsWith('b4-canvas-25s-trace.json') || lower.endsWith('b4-canvas-traced-25s.json')) return {
    role: 'trace-directed-recovery-diagnostic',
    acceptedEvidence: false,
    status: 'SUPERSEDED_TRACE_DIRECTED_DIAGNOSTIC',
    conditions: { biome: 4, renderer: 'canvas', warmupMs: 5000, observationMs: 25000 },
  };
  if (/performance-authoritative\/b4-canvas-.*25s\.json$/.test(lower) && !lower.endsWith('b4-canvas-strict-alive-25s.json')) return {
    role: 'superseded-recovery-performance-attempt',
    acceptedEvidence: false,
    status: 'SUPERSEDED_RECOVERY_ATTEMPT',
    conditions: { biome: 4, renderer: 'canvas', observationMs: 25000 },
  };
  if (lower.includes('performance-authoritative')) return {
    role: lower.endsWith('.json') ? 'recovery-strict-performance-report' : 'recovery-strict-performance-capture',
    acceptedEvidence: true,
    status: 'WORKER_EVIDENCE_STRICT_GATE_FAIL_MANAGER_ACCEPTANCE_OPEN',
    conditions: { biome: 4, requestedDepthMeters: 1650, renderer: 'canvas', warmupMs: 3000, observationMs: 25000 },
  };
  if (lower.includes('/recognition/') || lower.startsWith('visual-matrix/recognition/')) return {
    role: 'recovery-hud-free-label-free-recognition-card',
    acceptedEvidence: true,
    status: 'DECK_ONLY_HUMAN_GATE_OPEN',
    conditions,
  };
  if (lower.includes('recognition')) return {
    role: 'recovery-recognition-deck-metadata',
    acceptedEvidence: true,
    status: 'DECK_ONLY_HUMAN_GATE_OPEN',
    conditions,
  };
  if (lower.includes('/adversarial/') || lower.includes('visual-matrix/adversarial')) return {
    role: 'recovery-normal-play-adversarial-threat-prompt-proof',
    acceptedEvidence: true,
    status: 'WORKER_EVIDENCE_MANAGER_ACCEPTANCE_OPEN',
    conditions,
  };
  if (lower.includes('/normal-play/') || lower.includes('visual-matrix/normal-play')) return {
    role: 'recovery-normal-play-seeded-traversal-proof',
    acceptedEvidence: true,
    status: 'WORKER_EVIDENCE_MANAGER_ACCEPTANCE_OPEN',
    conditions,
  };
  if (lower.includes('verification/')) return {
    role: 'recovery-focused-verification',
    acceptedEvidence: true,
    status: 'WORKER_VERIFICATION',
    conditions,
  };
  if (lower.endsWith('.json')) return {
    role: 'recovery-measurement-or-provenance-report',
    acceptedEvidence: true,
    status: 'WORKER_EVIDENCE_MANAGER_ACCEPTANCE_OPEN',
    conditions,
  };
  return { role: 'recovery-supporting-evidence', acceptedEvidence: true, status: 'WORKER_EVIDENCE_MANAGER_ACCEPTANCE_OPEN', conditions };
}

for (const root of roots) await walk(root, root.path);
const artifacts = [];
for (const { root, path } of files.sort((a, b) => a.path.localeCompare(b.path))) {
  const bytes = (await stat(path)).size;
  const sha256 = createHash('sha256').update(await readFile(path)).digest('hex');
  artifacts.push({
    path,
    relativePath: relative(artifactBase, path),
    evidenceRoot: root.name,
    bytes,
    sha256,
    ...classify(root, path),
  });
}
const manifest = {
  schema: 'water9/swimming-backgrounds-slice4-artifacts@2',
  generatedAt: new Date().toISOString(),
  artifactBase,
  artifactRoots: roots.map((root) => ({ name: root.name, path: root.path })),
  provenance: 'Original manager-rejected Slice 4 evidence and post-rejection recovery evidence from Water9 #game Canvas, off-canvas ROI measurements, browser performance probes, and focused verification on branch swimming-backgrounds.',
  limitations: [
    'The original slice4 root is preserved with explicit manager-rejected status.',
    'Recovery artifacts are worker evidence and do not claim manager visual acceptance.',
    'The anonymous recognition deck has zero human reviews; no recognition score is claimed.',
    'The final strict performance report preserves its honest cadence failure.',
    'Actual requested/observed biome, depth, gameplay continuity, and timing metrics are authoritative in each JSON report rather than inferred from filenames.',
  ],
  countsByRoot: Object.fromEntries(roots.map((root) => [root.name, artifacts.filter((artifact) => artifact.evidenceRoot === root.name).length])),
  count: artifacts.length,
  totalBytes: artifacts.reduce((sum, artifact) => sum + artifact.bytes, 0),
  artifacts,
};
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, output, count: manifest.count, countsByRoot: manifest.countsByRoot, totalBytes: manifest.totalBytes, roots: roots.map((root) => basename(root.path)) }, null, 2));
