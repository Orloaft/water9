# water9 mining FPS/B2 follow-up report

Status: accepted-candidate

Preflight:

```text
$ git -C /mnt/nxt-dev/water9 rev-parse --short HEAD
7776913

$ pwd
/mnt/nxt-dev/water9

$ git rev-parse --show-toplevel
/mnt/nxt-dev/water9
```

Changed files in this pass:

- `src/helpers.ts`
- `src/main.ts`
- `src/scene-combat.ts`
- `src/scene-playtest.ts`
- `src/scene-rendering.ts`
- `runs/water9-mining-fps-b2-followup-2026-07-04/report.md`
- `runs/water9-mining-fps-b2-followup-2026-07-04/followup-playwright-proof.mjs`
- `runs/water9-mining-fps-b2-followup-2026-07-04/playwright-proof/*`

Source summary:

- Removed the B2 surface-band brine shelf route so the near-barge/surface view no longer gets the full-alpha shelf plate.
- Disabled/reduced B2 mid/lower water-column mask and post-darkness veil paths that were creating gray panes/wash.
- Preserved B1 organic landmark readability while keeping the scaled/softened treatment instead of washed-out full-screen sheets.
- Removed B3 upper/surface generated painterly band plates and biome landmark fallback sheets from normal seam/perf play, which eliminated the oversized foreground occluder in `repeated-mining-seam-perf`.
- Kept Canvas as the default renderer and left WebGL behind the explicit `?renderer=webgl` option after the proof attempt showed WebGL framebuffer failures in this environment.
- Corrected playtest depth staging to match runtime depth math, and let the guardrail review cleanup its temporary visual actors before the normal repeated-mining capture.
- Made valuable ore release once its mask core is visibly opened by the cutter, and clear that released ore tile's terrain mask so pickup proof cannot strand a hollow ore tile without a loose nugget.
- Updated the proof runner to execute `npm run build`, populate `buildResult`, `proofResult`, and `acceptance`, hide the debug perf HUD, and fail on any visual, browser, build, or FPS blocker.

Proof artifacts:

- JSON: `runs/water9-mining-fps-b2-followup-2026-07-04/playwright-proof/water9-mining-fps-b2-followup-playwright-proof.json`
- Contact sheet PNG: `runs/water9-mining-fps-b2-followup-2026-07-04/playwright-proof/water9-mining-fps-b2-followup-contact-sheet.png`
- Contact sheet HTML: `runs/water9-mining-fps-b2-followup-2026-07-04/playwright-proof/water9-mining-fps-b2-followup-contact-sheet.html`
- Individual color/grayscale PNGs are in the same `playwright-proof/` directory.

Acceptance result from proof JSON:

```json
{
  "status": "accepted-candidate",
  "accepted": true,
  "buildPass": true,
  "visualFailureCount": 0,
  "fpsFailureCount": 0,
  "browserErrorCount": 0,
  "fpsPassCount": 11,
  "captureCount": 11
}
```

Visual result:

- B1 surface/shallow and B1 upper captures show readable distant organic landmarks without restored full-screen sheets or banding.
- B2 near-barge/surface has the brine shelf floor plate gone; B2 upper/mid/deep retain readable distant brine landmarks without gray pane/wash failures.
- Mining lifecycle is intact: drilling particles render, the exposed ore capture contains an infinite-life pickupable copper nugget, pickup changes cargo/value from `0/0` to `1/14`, and the collected item is gone after pickup.
- `repeated-mining-seam-perf-color.png` now shows normal gameplay with the Marlin unobstructed; the oversized generated foreground sheet is gone.

Frame cadence:

| Capture | Avg FPS | p95 frame | Longest dip | Pass |
| --- | ---: | ---: | ---: | --- |
| b1-surface-shallow-119 | 60 | 16.7ms | 0ms | yes |
| b1-upper-180 | 60 | 16.7ms | 0ms | yes |
| b2-near-barge-surface | 60 | 16.8ms | 0ms | yes |
| b2-upper-good-landmark-260 | 60 | 16.7ms | 0ms | yes |
| b2-mid-650 | 60 | 16.7ms | 0ms | yes |
| b2-deep-760 | 60 | 16.8ms | 0ms | yes |
| mining-before | 60 | 16.8ms | 0ms | yes |
| mining-drilling-particles | 60 | 16.7ms | 0ms | yes |
| mining-exposed-ore | 60 | 16.8ms | 0ms | yes |
| mining-after-pickup | 60 | 16.8ms | 0ms | yes |
| repeated-mining-seam-perf | 60 | 16.7ms | 0ms | yes |

Repeated seam telemetry:

- rAF selected window: `avgFrameMs=16.67`, `p95=16.7ms`, `p99=16.8ms`, `max=16.8ms`, `framesOver20ms=0`, `longestSustainedDipMs=0`.
- In-game telemetry during the same capture remained low: `frame.total avg=1.17ms`, `draw.total avg=0.46ms`, `draw.world avg=0.10ms`, `draw.darkness avg=0.11ms`.
- Visual inspection of the contact sheet and `repeated-mining-seam-perf-color.png` confirms no foreground occluder.

Verification:

```text
$ npx tsc --noEmit --pretty false
exit 0

$ git diff --check
exit 0

$ node runs/water9-mining-fps-b2-followup-2026-07-04/followup-playwright-proof.mjs
exit 0
buildResult.ok: true
proofResult.ok: true
acceptance.status: accepted-candidate
visualFailures: []
fpsFailures: []

$ ss -ltnp | awk '$4 ~ /:(518[0-9]|519[0-9])$/ {print}'
no output
```

Build notes:

- `npm run build` was executed by the focused proof runner and returned exit `0`.
- Existing generated-asset URL warnings remain.
- Existing Vite large chunk warning remains.
