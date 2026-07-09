# Water9 startup/save perf enforcement worker report

- Start: 2026-07-09
- Starting HEAD: 44dc5c0
- Status: implemented, verification has enforced failures remaining

## Notes

- Preflight passed: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `44dc5c0`.
- Added staged startup/restore generation so loading work yields between terrain, mask, fauna, flora, room, and articulated phases.
- Save/load restore now restores a valid saved terrain world once, populates gameplay systems on top of it, and completes pending load without reapplying the world.
- Added shared browser cadence/Long Task assertion helper and wired it into B4, deep diagonal, mining, sonar tool, loading settled gameplay, perf guardrails, and a new save/load perf smoke.

## Before / after headline metrics

- Startup baseline from this run: `worldgen.total` 5577.1ms, startup rAF max 5599.8ms.
- Startup final: startup rAF max 966.7ms; first settled swim rAF p95/p99/max 16.7/16.8/16.8ms; still FAILS on `draw.total trueMaxMs` 11.6ms > 8ms.
- Save/load review baseline: restore rAF p95 116.6ms, p99/max 16882.7ms, Long Task max 16888ms.
- Save/load final: restore transition rAF p95/p99/max 549.9/1166.6/1166.6ms; saved-world restore phase 16.9ms; after-restore settled rAF p95/p99/max 16.7/16.8/16.8ms. The restore transition still FAILS the temporary unbounded-gap check at >1000ms, and the post-restore settled harness still misses `draw.total` because it remains on a UI draw path.

## Verification

- PASS: `npm run build` (`npm-run-build-8.log`; earlier build logs also passed after intermediate edits).
- FAIL: `npm run water9:loading-swim-perf-smoke` with run env under `loading-final/`: startup improved, settled rAF passed, `draw.total` max 11.6ms exceeded 8ms.
- PASS: `npm run water9:save-load-smoke` with run env under `save-load-functional/`.
- FAIL: `npm run water9:save-load-perf-smoke` with run env under `save-load-perf-5/`: restore rAF max 1166.6ms and Long Task max 1169ms; after-restore settled rAF passed but `draw.total` missing.
- B4 canvas repeats:
  - PASS repeat 1: rAF p95/p99/max 16.8/16.8/16.8ms.
  - FAIL repeat 2: rAF p95/p99/max 33.4/33.4/33.4ms; 6.28% over 33.34ms.
  - FAIL repeat 3: rAF passed, `draw.total` max 8.4ms > 8ms.
- FAIL: deep diagonal swim perf: all depth-band rAF intervals passed, but `draw.total` max was 10.3-11.2ms in each band.
- PASS: mining perf: rAF p95/p99/max 16.8/16.8/33.3ms; `draw.world trueMaxMs` 5.1ms.
- FAIL: sonar tool perf: normal and sonar-use rAF passed; sonar-use `draw.total` missing on the current UI draw path.
- FAIL: `npm run water9:perf-guardrails-smoke`: now fails cadence evidence too (`rAF p95 200ms`, max 1349.9ms) plus `articulated mask-aware terrain contact did not register`. The previously known submarine collision assertion passed in this run.

## Artifacts

- Main report: `/mnt/nxt-dev/water9/runs/water9-startup-save-perf-enforcement-2026-07-09/worker-report.md`
- Logs, JSON, and screenshots are under `/mnt/nxt-dev/water9/runs/water9-startup-save-perf-enforcement-2026-07-09/`.
- Required visual proof captures include:
  - `loading-final/loading-first-settled-gameplay-canvas.png`
  - `loading-final/loading-first-settled-gameplay-canvas-gray.png`
  - `save-load-perf-5/save-load-after-restore-canvas.png`
  - `save-load-perf-5/save-load-after-restore-canvas-gray.png`
  - B4/deep/mining/sonar smoke directories each include live `#game canvas` color/grayscale captures.

## Caveats / next target

- The shared rAF/Long Task helper now fails bad browser evidence automatically; B4 repeat 2 and perf guardrails prove this.
- Startup and save/load are improved but not fully accepted: remaining transition chunks are under ~1.2s instead of multi-second/16s, but still over a strict no-stall bar.
- The next target should be breaking terrain-mask and flora-room placement into smaller worker-like chunks or precomputed caches, then fixing UI-path smokes that miss `draw.total` while rAF is clean.
