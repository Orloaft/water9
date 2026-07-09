const DEFAULT_THRESHOLDS = {
  minFrames: 180,
  rafP95Ms: 20,
  rafP99Ms: 33.34,
  rafMaxMs: 50,
  rafOver33Pct: 1,
  rafOver50Count: 0,
  longTaskMs: 50,
  outerFrameP95Ms: 12,
  outerFrameMaxMs: 20,
  drawTotalP95Ms: 5,
  drawTotalMaxMs: 8,
};

export async function installBrowserPerfObservers(page) {
  await page.addInitScript(() => {
    window.__water9ObservedLongTasks = [];
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__water9ObservedLongTasks.push({
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration,
            });
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {
        // Long Task API is browser-dependent; the assertion layer also reads exported telemetry.
      }
    }
  });
}

export async function startCadenceProbe(page, label = 'steady-gameplay') {
  await page.evaluate((probeLabel) => {
    window.__water9ObservedLongTasks ??= [];
    const token = `${probeLabel}:${performance.now()}:${Math.random()}`;
    window.__water9CadenceProbe = {
      token,
      label: probeLabel,
      frames: [],
      startedAt: performance.now(),
      longTaskStartIndex: window.__water9ObservedLongTasks.length,
      running: true,
    };
    let last = performance.now();
    const tick = (now) => {
      const probe = window.__water9CadenceProbe;
      if (!probe || probe.token !== token || !probe.running) return;
      probe.frames.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, label);
}

export async function finishCadenceProbe(page) {
  return page.evaluate(() => {
    const probe = window.__water9CadenceProbe;
    if (!probe) return null;
    probe.running = false;
    const frames = probe.frames.filter((value) => Number.isFinite(value) && value >= 0);
    const longTasks = (window.__water9ObservedLongTasks ?? []).slice(probe.longTaskStartIndex);
    return {
      label: probe.label,
      durationMs: Math.round((performance.now() - probe.startedAt) * 100) / 100,
      frames,
      independentRaf: summarizeFrames(frames),
      longTasks,
    };

    function summarizeFrames(values) {
      const sorted = [...values].sort((a, b) => a - b);
      const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return {
        samples: values.length,
        avg: round(avg),
        p50: round(percentile(sorted, 0.5)),
        p95: round(percentile(sorted, 0.95)),
        p99: round(percentile(sorted, 0.99)),
        max: round(values.length ? Math.max(...values) : 0),
        over20: countOver(values, 20),
        over33_34: countOver(values, 33.34),
        over50: countOver(values, 50),
      };
    }

    function percentile(sorted, rank) {
      return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * rank))] : 0;
    }

    function countOver(values, threshold) {
      const count = values.filter((value) => value > threshold).length;
      return { count, pct: values.length ? round((count / values.length) * 100) : 0 };
    }

    function round(value) {
      return Math.round(value * 100) / 100;
    }
  });
}

export function summarizeValues(values) {
  const finite = values.filter((value) => Number.isFinite(value) && value >= 0);
  const sorted = [...finite].sort((a, b) => a - b);
  const avg = finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
  return {
    samples: finite.length,
    avg: round(avg),
    p50: round(percentile(sorted, 0.5)),
    p95: round(percentile(sorted, 0.95)),
    p99: round(percentile(sorted, 0.99)),
    max: round(finite.length ? Math.max(...finite) : 0),
    over20: countOver(finite, 20),
    over33_34: countOver(finite, 33.34),
    over50: countOver(finite, 50),
  };
}

export function summarizeMetric(metric) {
  if (!metric) return null;
  return {
    samples: metric.samples ?? 0,
    avgMs: metric.avgMs ?? 0,
    maxMs: metric.maxMs ?? 0,
    trueMaxMs: metric.trueMaxMs ?? metric.maxMs ?? 0,
    p95Ms: metric.p95Ms ?? 0,
    p99Ms: metric.p99Ms ?? 0,
    windowMaxMs: metric.windowMaxMs ?? metric.maxMs ?? 0,
    context: metric.context ?? {},
  };
}

export function assertSteadyGameplayCadence({
  label,
  independentRaf,
  perf,
  metrics,
  longTasks,
  errors,
  minFrames = DEFAULT_THRESHOLDS.minFrames,
  thresholds = {},
}) {
  const limit = { ...DEFAULT_THRESHOLDS, ...thresholds, minFrames };
  const sink = errors ?? [];
  const prefix = label ? `${label}: ` : '';
  const raf = independentRaf ?? null;
  const metricBag = metrics ?? perf?.metrics ?? {};
  const outerRaf = metricBag?.['outer.rafDelta'] ?? metricBag?.outerRafDelta ?? null;
  const outerFrame = metricBag?.['outer.frameTotal'] ?? metricBag?.outerFrameTotal ?? null;
  const drawTotal = metricBag?.['draw.total'] ?? metricBag?.drawTotal ?? null;
  const taskList = [
    ...(longTasks ?? []),
    ...((perf?.longTasks ?? []).filter((task) => task.duration >= limit.longTaskMs)),
  ];

  if (!raf || !Number.isFinite(raf.samples)) {
    sink.push(assertion(`${prefix}independent rAF summary is missing`));
  } else {
    if (raf.samples < limit.minFrames) sink.push(assertion(`${prefix}independent rAF samples ${raf.samples} below ${limit.minFrames}`));
    if ((raf.p95 ?? 0) > limit.rafP95Ms) sink.push(assertion(`${prefix}rAF p95 ${raf.p95}ms exceeds ${limit.rafP95Ms}ms`));
    if ((raf.p99 ?? 0) > limit.rafP99Ms) sink.push(assertion(`${prefix}rAF p99 ${raf.p99}ms exceeds ${limit.rafP99Ms}ms`));
    if ((raf.max ?? 0) > limit.rafMaxMs) sink.push(assertion(`${prefix}rAF max ${raf.max}ms exceeds ${limit.rafMaxMs}ms`));
    if ((raf.over33_34?.pct ?? 0) > limit.rafOver33Pct) sink.push(assertion(`${prefix}rAF frames over 33.34ms ${raf.over33_34?.pct}% exceeds ${limit.rafOver33Pct}%`));
    if ((raf.over50?.count ?? 0) > limit.rafOver50Count) sink.push(assertion(`${prefix}rAF frames over 50ms ${raf.over50?.count} exceeds ${limit.rafOver50Count}`));
  }

  if (!outerRaf?.samples) sink.push(assertion(`${prefix}outer.rafDelta metric is missing`));
  if (outerFrame?.samples) {
    if ((outerFrame.p95Ms ?? 0) > limit.outerFrameP95Ms) sink.push(assertion(`${prefix}outer.frameTotal p95 ${outerFrame.p95Ms}ms exceeds ${limit.outerFrameP95Ms}ms`));
    const outerMax = outerFrame.trueMaxMs ?? outerFrame.windowMaxMs ?? outerFrame.maxMs ?? 0;
    if (outerMax > limit.outerFrameMaxMs) sink.push(assertion(`${prefix}outer.frameTotal max ${outerMax}ms exceeds ${limit.outerFrameMaxMs}ms`));
  } else {
    sink.push(assertion(`${prefix}outer.frameTotal metric is missing`));
  }
  if (drawTotal?.samples) {
    if ((drawTotal.p95Ms ?? 0) > limit.drawTotalP95Ms) sink.push(assertion(`${prefix}draw.total p95 ${drawTotal.p95Ms}ms exceeds ${limit.drawTotalP95Ms}ms`));
    const drawMax = drawTotal.trueMaxMs ?? drawTotal.windowMaxMs ?? drawTotal.maxMs ?? 0;
    if (drawMax > limit.drawTotalMaxMs) sink.push(assertion(`${prefix}draw.total max ${drawMax}ms exceeds ${limit.drawTotalMaxMs}ms`));
  } else {
    sink.push(assertion(`${prefix}draw.total metric is missing`));
  }
  const longOver = taskList.filter((task) => (task.duration ?? 0) >= limit.longTaskMs);
  if (longOver.length) {
    const max = round(Math.max(...longOver.map((task) => task.duration ?? 0)));
    sink.push(assertion(`${prefix}${longOver.length} settled Long Task(s) >= ${limit.longTaskMs}ms, max ${max}ms`));
  }
  return sink;
}

function assertion(text) {
  return { type: 'assertion', text };
}

function percentile(sorted, rank) {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * rank))] : 0;
}

function countOver(values, threshold) {
  const count = values.filter((value) => value > threshold).length;
  return { count, pct: values.length ? round((count / values.length) * 100) : 0 };
}

function round(value) {
  return Math.round(value * 100) / 100;
}
