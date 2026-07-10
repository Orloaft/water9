import Phaser from 'phaser';
import type { DeepdiveScene } from './scene';
import { TILE,WORLD_H,WORLD_W } from './constants';
import { state } from './state';

type PerfMetric = {
  key: string;
  samples: number;
  avgMs: number;
  maxMs: number;
  trueMaxMs: number;
  lastMs: number;
  windowSamples: number[];
  context?: Record<string, number | string | boolean | null>;
};

type PerfFrameSample = {
  frame: number;
  at: number;
  frameStartAt: number;
  postRenderAt: number;
  rafDeltaMs: number;
  independentRafDeltaMs: number;
  postRenderToRafMs: number;
  updateMs: number;
  drawMs: number;
  camera: { x: number; y: number; width: number; height: number };
  player: { x: number; y: number; vx: number; vy: number };
  worldView: { startX: number; endX: number; startY: number; endY: number };
  chunks: { dirty: number; cached: number };
  entities: { fish: number; articulated: number; articulatedParts: number; flora: number };
  visible: { fish: number; articulated: number; articulatedParts: number };
  fishTiers: { full: number; throttled: number; skipped: number };
  articulatedTiers: { full: number; near: number; far: number; offscreen: number; fullSteps: number; skippedSteps: number; terrainPasses: number };
  terrain: { dirty: boolean; dirtyChunks: number; dirtyTiles: number; reason: string; contactSamples: number; contactSamplesDelta: number };
  sonar: { open: boolean; zoom: number; revealed: number; contacts: number; cache?: Record<string, number | string | boolean | null> };
  outer: { frameTotalMs: number; stepMs: number; renderMs: number; postStepToRenderMs: number; telemetryMs: number; renderer: string };
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number; deltaUsedJSHeapSize: number };
  longTasks: Array<{ startTime: number; duration: number; name: string }>;
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
  frames: PerfFrameSample[];
  frameCapacity: number;
  longTasks: Array<{ startTime: number; duration: number; name: string }>;
  longTaskObserver?: PerformanceObserver;
  frame: number;
  lastLogAt: number;
  lastHudAt: number;
  terrainDirtyReason: string;
  terrainMaskMutations: number;
  terrainContactSamples: number;
  lastTerrainContactSamples: number;
  lastLongTaskCursor: number;
  lastUsedJSHeapSize: number;
  outerFrame: {
    installed: boolean;
    stepStartAt: number;
    postStepAt: number;
    preRenderAt: number;
    postRenderAt: number;
    rafDeltaMs: number;
    independentRafDeltaMs: number;
    lastIndependentRafAt: number;
    telemetryMs: number;
    renderer: string;
  };
  fishTiers: {
    full: number;
    throttled: number;
    skipped: number;
  };
  articulatedTiers: {
    full: number;
    near: number;
    far: number;
    offscreen: number;
    fullSteps: number;
    skippedSteps: number;
    terrainPasses: number;
  };
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
  const telemetry: PerfTelemetry = {
    enabled: perfEnabled(),
    metrics: {},
    frames: [],
    frameCapacity: 720,
    longTasks: [],
    frame: 0,
    lastLogAt: 0,
    lastHudAt: 0,
    terrainDirtyReason: 'boot',
    terrainMaskMutations: 0,
    terrainContactSamples: 0,
    lastTerrainContactSamples: 0,
    lastLongTaskCursor: 0,
    lastUsedJSHeapSize: 0,
    outerFrame: {
      installed: false,
      stepStartAt: 0,
      postStepAt: 0,
      preRenderAt: 0,
      postRenderAt: 0,
      rafDeltaMs: 0,
      independentRafDeltaMs: 0,
      lastIndependentRafAt: 0,
      telemetryMs: 0,
      renderer: 'unknown',
    },
    fishTiers: {
      full: 0,
      throttled: 0,
      skipped: 0,
    },
    articulatedTiers: {
      full: 0,
      near: 0,
      far: 0,
      offscreen: 0,
      fullSteps: 0,
      skippedSteps: 0,
      terrainPasses: 0,
    },
    propRefresh: {
      fullScans: 0,
      queued: 0,
      processed: 0,
      removed: 0,
      added: 0,
      lastReason: 'none',
    },
  };
  if (telemetry.enabled && typeof PerformanceObserver !== 'undefined') {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          telemetry.longTasks.push({
            startTime: Math.round(entry.startTime * 100) / 100,
            duration: Math.round(entry.duration * 100) / 100,
            name: entry.name || 'longtask',
          });
        }
        if (telemetry.longTasks.length > 80) telemetry.longTasks.splice(0, telemetry.longTasks.length - 80);
      });
      observer.observe({ type: 'longtask', buffered: true });
      telemetry.longTaskObserver = observer;
    } catch {
      // Long Task API is browser-dependent; perf mode keeps working without it.
    }
  }
  return telemetry;
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
    trueMaxMs: 0,
    lastMs: 0,
    windowSamples: [],
  };
  metric.samples += 1;
  metric.lastMs = ms;
  metric.avgMs += (ms - metric.avgMs) * Math.min(1, 2 / Math.max(2, metric.samples));
  metric.maxMs = Math.max(metric.maxMs * 0.995, ms);
  metric.trueMaxMs = Math.max(metric.trueMaxMs, ms);
  metric.windowSamples.push(ms);
  if (metric.windowSamples.length > 720) metric.windowSamples.splice(0, metric.windowSamples.length - 720);
  if (context) metric.context = context;
  perf.metrics[key] = metric;
}

export function installOuterPerfTelemetry(game: Phaser.Game, sceneForMetrics: () => DeepdiveScene | null | undefined) {
  if (!perfEnabled()) return;
  const observePresentationCadence = (at: number) => {
    const scene = sceneForMetrics();
    const perf = scene?.perfTelemetry;
    if (scene && perf?.enabled) {
      const previousAt = perf.outerFrame.lastIndependentRafAt;
      perf.outerFrame.lastIndependentRafAt = at;
      if (previousAt > 0) {
        const delta = at - previousAt;
        perf.outerFrame.independentRafDeltaMs = delta;
        recordPerf(scene, 'presentation.rafDelta', delta, { renderer: perf.outerFrame.renderer });
        const sample = perf.frames[perf.frames.length - 1];
        if (sample && sample.independentRafDeltaMs === 0) {
          sample.independentRafDeltaMs = round(delta);
          sample.postRenderToRafMs = round(Math.max(0, at - sample.postRenderAt));
        }
      }
    }
    requestAnimationFrame(observePresentationCadence);
  };
  requestAnimationFrame(observePresentationCadence);
  const events = Phaser.Core.Events;
  game.events.on(events.PRE_STEP, (_time: number, delta: number) => {
    const scene = sceneForMetrics();
    const perf = scene?.perfTelemetry;
    if (!scene || !perf?.enabled) return;
    perf.outerFrame.installed = true;
    perf.outerFrame.stepStartAt = performance.now();
    perf.outerFrame.rafDeltaMs = delta;
    perf.outerFrame.renderer = rendererName(game);
    recordPerf(scene, 'outer.rafDelta', delta, { renderer: perf.outerFrame.renderer });
  });
  game.events.on(events.POST_STEP, () => {
    const scene = sceneForMetrics();
    const perf = scene?.perfTelemetry;
    if (!scene || !perf?.enabled || !perf.outerFrame.stepStartAt) return;
    perf.outerFrame.postStepAt = performance.now();
    recordPerf(scene, 'outer.step', perf.outerFrame.postStepAt - perf.outerFrame.stepStartAt);
  });
  game.events.on(events.PRE_RENDER, () => {
    const scene = sceneForMetrics();
    const perf = scene?.perfTelemetry;
    if (!scene || !perf?.enabled) return;
    perf.outerFrame.preRenderAt = performance.now();
    if (perf.outerFrame.postStepAt) {
      recordPerf(scene, 'outer.postStepToRender', perf.outerFrame.preRenderAt - perf.outerFrame.postStepAt);
    }
  });
  game.events.on(events.POST_RENDER, () => {
    const scene = sceneForMetrics();
    const perf = scene?.perfTelemetry;
    if (!scene || !perf?.enabled) return;
    perf.outerFrame.postRenderAt = performance.now();
    if (perf.outerFrame.preRenderAt) {
      recordPerf(scene, 'outer.render', perf.outerFrame.postRenderAt - perf.outerFrame.preRenderAt, { renderer: perf.outerFrame.renderer });
    }
    if (perf.outerFrame.stepStartAt) {
      recordPerf(scene, 'outer.frameTotal', perf.outerFrame.postRenderAt - perf.outerFrame.stepStartAt, { renderer: perf.outerFrame.renderer });
    }
    const telemetryStartedAt = performance.now();
    const sample = recordPerfFrame(scene, perf.outerFrame.rafDeltaMs || 0);
    const telemetryMs = performance.now() - telemetryStartedAt;
    perf.outerFrame.telemetryMs = telemetryMs;
    if (sample) sample.outer.telemetryMs = round(telemetryMs);
    recordPerf(scene, 'outer.postRenderTelemetry', telemetryMs, { renderer: perf.outerFrame.renderer });
    perf.frame += 1;
  });
}

export function markTerrainDirty(scene: DeepdiveScene, reason: string) {
  if (!scene.perfTelemetry?.enabled) return;
  scene.perfTelemetry.terrainDirtyReason = reason;
}

export function recordPerfFrame(scene: DeepdiveScene, rafDeltaMs: number): PerfFrameSample | undefined {
  const perf = scene.perfTelemetry;
  if (!perf?.enabled) return;
  const camera = scene.cameras.main;
  const view = camera.worldView;
  const startX = Math.max(0, Math.floor(view.x / TILE) - 1);
  const endX = Math.min(WORLD_W - 1, Math.ceil(view.right / TILE) + 1);
  const startY = Math.max(0, Math.floor(view.y / TILE) - 1);
  const endY = Math.min(WORLD_H - 1, Math.ceil(view.bottom / TILE) + 1);
  const intersects = (x: number, y: number, radius = 40) => x >= view.x - radius && x <= view.right + radius && y >= view.y - radius && y <= view.bottom + radius;
  let visibleFish = 0;
  for (const fish of scene.fish) {
    if (!fish.dead && intersects(fish.x, fish.y, fish.radius + 24)) visibleFish += 1;
  }
  let articulatedParts = 0;
  let visibleArticulated = 0;
  let visibleParts = 0;
  for (const creature of scene.articulatedCreatures) {
    articulatedParts += creature.parts.length;
    if (!creature.dead && intersects(creature.x, creature.y, creature.radius + 80)) {
      visibleArticulated += 1;
      visibleParts += creature.parts.length;
    }
  }
  const now = performance.now();
  const recentLongTasks = perf.longTasks.slice(perf.lastLongTaskCursor);
  perf.lastLongTaskCursor = perf.longTasks.length;
  const sonarCache = {
    hudHit: scene.hudSonarMapCacheStats?.hit ?? false,
    hudBuildMs: scene.hudSonarMapCacheStats?.buildMs ?? 0,
    fullChartHit: scene.bigSonarMapCacheStats?.hit ?? false,
    fullChartBuildMs: scene.bigSonarMapCacheStats?.buildMs ?? 0,
    fullChartZoomBucket: scene.bigSonarMapCacheStats?.zoomBucket ?? 0,
  };
  const contactSamplesDelta = perf.terrainContactSamples - perf.lastTerrainContactSamples;
  perf.lastTerrainContactSamples = perf.terrainContactSamples;
  // Heap reads are diagnostic sampling, not frame-critical work.
  const memory = perf.frame % 30 === 0 ? memorySnapshot(perf) : undefined;
  const sample: PerfFrameSample = {
    frame: perf.frame,
    at: Math.round(now * 100) / 100,
    frameStartAt: round(perf.outerFrame.stepStartAt),
    postRenderAt: round(perf.outerFrame.postRenderAt || now),
    rafDeltaMs: round(rafDeltaMs),
    independentRafDeltaMs: 0,
    postRenderToRafMs: 0,
    updateMs: round(perf.metrics['update.total']?.lastMs ?? 0),
    drawMs: round(perf.metrics['draw.total']?.lastMs ?? 0),
    camera: { x: round(view.x), y: round(view.y), width: round(view.width), height: round(view.height) },
    player: { x: round(scene.player.x), y: round(scene.player.y), vx: round(scene.player.vx), vy: round(scene.player.vy) },
    worldView: { startX, endX, startY, endY },
    chunks: { dirty: scene.terrainVisualDirtyChunks.size, cached: scene.terrainVisualChunks.size },
    entities: {
      fish: scene.fish.length,
      articulated: scene.articulatedCreatures.length,
      articulatedParts,
      flora: scene.flora.length,
    },
    visible: { fish: visibleFish, articulated: visibleArticulated, articulatedParts: visibleParts },
    fishTiers: { ...perf.fishTiers },
    articulatedTiers: { ...perf.articulatedTiers },
    terrain: {
      dirty: scene.terrainDirty,
      dirtyChunks: scene.terrainVisualDirtyChunks.size || scene.terrainLastMutationStats?.dirtyChunks || 0,
      dirtyTiles: scene.terrainDirtyTiles?.size || scene.terrainLastMutationStats?.dirtyTiles || 0,
      reason: scene.terrainMutationReason ?? scene.terrainLastMutationStats?.reason ?? perf.terrainDirtyReason,
      contactSamples: perf.terrainContactSamples,
      contactSamplesDelta,
    },
    sonar: {
      open: state.sonarMapOpen,
      zoom: round(state.sonarMapZoom || 1),
      revealed: state.sonarRevealed.size,
      contacts: state.sonarContacts.length,
      cache: sonarCache,
    },
    outer: {
      frameTotalMs: round(perf.metrics['outer.frameTotal']?.lastMs ?? 0),
      stepMs: round(perf.metrics['outer.step']?.lastMs ?? 0),
      renderMs: round(perf.metrics['outer.render']?.lastMs ?? 0),
      postStepToRenderMs: round(perf.metrics['outer.postStepToRender']?.lastMs ?? 0),
      telemetryMs: round(perf.outerFrame.telemetryMs),
      renderer: perf.outerFrame.renderer,
    },
    memory,
    longTasks: recentLongTasks,
  };
  perf.frames.push(sample);
  if (perf.frames.length > perf.frameCapacity) perf.frames.splice(0, perf.frames.length - perf.frameCapacity);
  return sample;
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
    frames: perf.frames.slice(-perf.frameCapacity),
    longTasks: perf.longTasks.slice(-40),
    metrics: Object.fromEntries(Object.entries(perf.metrics).map(([key, metric]) => [
      key,
      {
        samples: metric.samples,
        avgMs: round(metric.avgMs),
        maxMs: round(metric.maxMs),
        trueMaxMs: round(metric.trueMaxMs),
        windowMaxMs: round(max(metric.windowSamples)),
        p50Ms: round(percentile(metric.windowSamples, 0.5)),
        p95Ms: round(percentile(metric.windowSamples, 0.95)),
        p99Ms: round(percentile(metric.windowSamples, 0.99)),
        over20: countOver(metric.windowSamples, 20),
        over33_34: countOver(metric.windowSamples, 33.34),
        over50: countOver(metric.windowSamples, 50),
        lastMs: round(metric.lastMs),
        context: metric.context ?? {},
      },
    ])),
  };
}

export function updatePerfHud(scene: DeepdiveScene, rafDeltaMs = 0) {
  const perf = scene.perfTelemetry;
  if (!perf?.enabled) return;
  if (!perf.outerFrame.installed) {
    recordPerfFrame(scene, rafDeltaMs);
    perf.frame += 1;
  }
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
  const metricLine = (key: string, label = key) => {
    const metric = perf.metrics[key];
    if (!metric) return `${label}: --`;
    return `${label}: ${round(percentile(metric.windowSamples, 0.95))} p95 ${round(percentile(metric.windowSamples, 0.99))} p99 ${round(max(metric.windowSamples))} max`;
  };
  const counts = `fish ${scene.fish.length} art ${scene.articulatedCreatures.length}/${scene.articulatedCreatures.reduce((sum, creature) => sum + creature.parts.length, 0)} sub ${scene.subPartSprites ? Object.keys(scene.subPartSprites).length : 0} props ${scene.environmentProps.length}`;
  hud.body.textContent = [
    'perf',
    metricLine('presentation.rafDelta', 'present cadence'),
    metricLine('outer.frameTotal', 'CPU step+render'),
    metricLine('outer.render'),
    metricLine('outer.postRenderTelemetry', 'post-render telemetry'),
    metricLine('frame.total', 'scene.update callback'),
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

function max(values: number[]) {
  return values.length ? Math.max(...values) : 0;
}

function percentile(values: number[], percentileRank: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * percentileRank));
  return sorted[index] ?? 0;
}

function countOver(values: number[], threshold: number) {
  const count = values.filter((value) => value > threshold).length;
  return { count, pct: values.length ? round((count / values.length) * 100) : 0 };
}

function rendererName(game: Phaser.Game) {
  if (game.renderer?.type === Phaser.CANVAS) return 'canvas';
  if (game.renderer?.type === Phaser.WEBGL) return 'webgl';
  return String(game.renderer?.type ?? 'unknown');
}

function memorySnapshot(perf: PerfTelemetry) {
  const perfWithMemory = performance as Performance & {
    memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  };
  if (!perfWithMemory.memory) return undefined;
  const used = perfWithMemory.memory.usedJSHeapSize;
  const delta = perf.lastUsedJSHeapSize ? used - perf.lastUsedJSHeapSize : 0;
  perf.lastUsedJSHeapSize = used;
  return {
    usedJSHeapSize: used,
    totalJSHeapSize: perfWithMemory.memory.totalJSHeapSize,
    jsHeapSizeLimit: perfWithMemory.memory.jsHeapSizeLimit,
    deltaUsedJSHeapSize: delta,
  };
}
