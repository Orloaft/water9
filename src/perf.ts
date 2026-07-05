import type { DeepdiveScene } from './scene';

type PerfMetric = {
  key: string;
  samples: number;
  avgMs: number;
  maxMs: number;
  lastMs: number;
  context?: Record<string, number | string | boolean | null>;
};

type PerfHudElements = {
  root: HTMLElement;
  toggle: HTMLButtonElement;
  body: HTMLElement;
};

let perfHudCollapsed = false;

export type PerfTelemetry = {
  enabled: boolean;
  metrics: Record<string, PerfMetric>;
  frame: number;
  lastLogAt: number;
  lastHudAt: number;
  terrainDirtyReason: string;
  terrainMaskMutations: number;
  terrainContactSamples: number;
  propRefresh: {
    fullScans: number;
    queued: number;
    processed: number;
    removed: number;
    added: number;
    lastReason: string;
  };
};

export function perfEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('perf') || params.has('debug') || window.localStorage?.getItem('water9:debug') === '1';
}

export function createPerfTelemetry(): PerfTelemetry {
  return {
    enabled: perfEnabled(),
    metrics: {},
    frame: 0,
    lastLogAt: 0,
    lastHudAt: 0,
    terrainDirtyReason: 'boot',
    terrainMaskMutations: 0,
    terrainContactSamples: 0,
    propRefresh: {
      fullScans: 0,
      queued: 0,
      processed: 0,
      removed: 0,
      added: 0,
      lastReason: 'none',
    },
  };
}

export function measurePerf<T>(
  scene: DeepdiveScene,
  key: string,
  fn: () => T,
  context?: Record<string, number | string | boolean | null>,
): T {
  const perf = scene.perfTelemetry;
  if (!perf?.enabled) return fn();
  const start = performance.now();
  try {
    return fn();
  } finally {
    recordPerf(scene, key, performance.now() - start, context);
  }
}

export function recordPerf(
  scene: DeepdiveScene,
  key: string,
  ms: number,
  context?: Record<string, number | string | boolean | null>,
) {
  const perf = scene.perfTelemetry;
  if (!perf?.enabled || !Number.isFinite(ms)) return;
  const metric = perf.metrics[key] ?? {
    key,
    samples: 0,
    avgMs: 0,
    maxMs: 0,
    lastMs: 0,
  };
  metric.samples += 1;
  metric.lastMs = ms;
  metric.avgMs += (ms - metric.avgMs) * Math.min(1, 2 / Math.max(2, metric.samples));
  metric.maxMs = Math.max(metric.maxMs * 0.995, ms);
  if (context) metric.context = context;
  perf.metrics[key] = metric;
}

export function markTerrainDirty(scene: DeepdiveScene, reason: string) {
  if (!scene.perfTelemetry?.enabled) return;
  scene.perfTelemetry.terrainDirtyReason = reason;
}

export function perfSnapshot(scene: DeepdiveScene) {
  const perf = scene.perfTelemetry;
  if (!perf?.enabled) return { enabled: false };
  return {
    enabled: true,
    frame: perf.frame,
    terrainDirtyReason: perf.terrainDirtyReason,
    terrainMaskMutations: perf.terrainMaskMutations,
    terrainContactSamples: perf.terrainContactSamples,
    propRefresh: { ...perf.propRefresh },
    metrics: Object.fromEntries(Object.entries(perf.metrics).map(([key, metric]) => [
      key,
      {
        samples: metric.samples,
        avgMs: round(metric.avgMs),
        maxMs: round(metric.maxMs),
        lastMs: round(metric.lastMs),
        context: metric.context ?? {},
      },
    ])),
  };
}

export function updatePerfHud(scene: DeepdiveScene) {
  const perf = scene.perfTelemetry;
  if (!perf?.enabled) return;
  perf.frame += 1;
  if (perfHudDisabled()) {
    document.querySelector<HTMLElement>('#perf-hud')?.remove();
    return;
  }
  const now = performance.now();
  if (now - perf.lastHudAt < 250) return;
  perf.lastHudAt = now;
  const hud = ensurePerfHud();
  if (!hud) return;
  hud.root.dataset.collapsed = perfHudCollapsed ? 'true' : 'false';
  hud.toggle.textContent = perfHudCollapsed ? 'Perf +' : 'Perf -';
  hud.toggle.setAttribute('aria-expanded', String(!perfHudCollapsed));
  hud.body.hidden = perfHudCollapsed;
  if (perfHudCollapsed) {
    hud.root.setAttribute('aria-label', 'Perf HUD collapsed');
    return;
  }
  const metricLine = (key: string) => {
    const metric = perf.metrics[key];
    if (!metric) return `${key}: --`;
    return `${key}: ${round(metric.avgMs)} avg ${round(metric.maxMs)} max`;
  };
  const counts = `fish ${scene.fish.length} art ${scene.articulatedCreatures.length}/${scene.articulatedCreatures.reduce((sum, creature) => sum + creature.parts.length, 0)} sub ${scene.subPartSprites ? Object.keys(scene.subPartSprites).length : 0} props ${scene.environmentProps.length}`;
  hud.body.textContent = [
    'perf',
    metricLine('frame.total'),
    metricLine('update.total'),
    metricLine('draw.total'),
    metricLine('draw.world'),
    metricLine('update.fish'),
    metricLine('update.articulated'),
    metricLine('update.sub'),
    metricLine('draw.sub'),
    `mask ${perf.terrainMaskMutations} contact ${perf.terrainContactSamples}`,
    `props q${perf.propRefresh.queued} p${perf.propRefresh.processed} -${perf.propRefresh.removed} +${perf.propRefresh.added}`,
    `${counts} dirty ${perf.terrainDirtyReason}`,
  ].join('\n');
}

function perfHudDisabled() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('perfHud') === '0';
}

function ensurePerfHud(): PerfHudElements | null {
  let root = document.querySelector<HTMLElement>('#perf-hud');
  if (root) {
    const toggle = root.querySelector<HTMLButtonElement>('[data-perf-hud-toggle]');
    const body = root.querySelector<HTMLElement>('[data-perf-hud-body]');
    return toggle && body ? { root, toggle, body } : null;
  }
  const shell = document.querySelector<HTMLElement>('.shell') ?? document.querySelector<HTMLElement>('#app');
  if (!shell) return null;
  root = document.createElement('aside');
  root.id = 'perf-hud';
  root.setAttribute('style', [
    'position:fixed',
    'right:8px',
    'bottom:8px',
    'z-index:50',
    'font:11px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace',
    'color:#d8fff5',
    'background:rgba(2,8,12,0.72)',
    'border:1px solid rgba(142,231,244,0.35)',
    'border-radius:6px',
    'padding:4px',
    'pointer-events:auto',
    'max-width:360px',
  ].join(';'));
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.setAttribute('data-perf-hud-toggle', 'true');
  toggle.setAttribute('aria-controls', 'perf-hud-body');
  toggle.setAttribute('style', [
    'min-height:24px',
    'width:100%',
    'border:0',
    'padding:0 6px',
    'background:rgba(115,251,211,0.12)',
    'color:#73fbd3',
    'font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace',
    'text-align:left',
    'cursor:pointer',
  ].join(';'));
  toggle.addEventListener('click', () => {
    perfHudCollapsed = !perfHudCollapsed;
  });
  const body = document.createElement('pre');
  body.id = 'perf-hud-body';
  body.setAttribute('data-perf-hud-body', 'true');
  body.setAttribute('style', [
    'margin:5px 3px 2px',
    'white-space:pre',
    'pointer-events:none',
  ].join(';'));
  root.append(toggle, body);
  shell.appendChild(root);
  return { root, toggle, body };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
