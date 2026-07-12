# Diver V3 Concept A — Swim and Mining Delivery

- Status: **PASS — delivery-ready bounded playtest gate**
- Starting HEAD: `abe3aad`
- Runtime gate: `?playtest=1&diverMotionTest=v3a-refined-mining`
- Parent gate: `?playtest=1&diverMotionTest=v3a-refined`

## Outcome

The accepted refined Concept A diver now has a four-drawing mining cycle driven by the real normalized drill cooldown: anticipation, strike/contact, recoil, and recover. The same gated identity handles the accepted hover/swim/scanner frames and the new mining frames. The brass/copper/black/cyan material hierarchy, 128×96 cell, `(64,52)` pivot, helmet, faceplate, and backpack registration remain fixed.

The old ambiguous/static mining read is gone. At native gameplay scale the new cutter makes a strong front-heavy silhouette; the raised/contact/recoil arc is visible in both color and grayscale; both hands remain connected to the cutter; and the cyan tip/live world-space guide terminates at the actual stored terrain impact. Right and authored-left mining bitmaps exist for every phase. Left alpha registration is the exact counterpart of right, followed by a screen-space relight and repainted port-side cyan pressure detail; authored-left differs from raw mirrored RGB by 1,665–1,773 subject pixels.

## Mining frame, timing, and socket plan

The normal diver drill sets `mineCooldown()` to 480 ms at base upgrades and 240 ms at maximum laser upgrade. The gated clip uses four registered drawings selected from normalized live cooldown, not a free-running loop:

| Index | Drawing | Progress | Read |
|---:|---|---:|---|
| 10 | mining-anticipation | 0–22% | cutter raised; hands drawn in |
| 11 | mining-contact | 22–48% | full extension and contact star |
| 12 | mining-recoil | 48–73% | low compressed recoil |
| 13 | mining-recover | 73–100% | rising recovery into retrigger |

A held valid target naturally retriggers this cycle at the gameplay cadence, so no artificial hold frame is used. Each bitmap carries the cutter-tip socket at its real pose. During valid contact the renderer draws only a short guide from the tip direction to `diverV3MiningImpact`, the exact live impact stored by `mineAt`; the existing terrain contact/glint particles remain authoritative.

## Runtime integration and gate isolation

- `src/helpers.ts` preloads eight new generated mining bitmaps.
- `src/scene-combat.ts` records the exact transient mining contact point alongside existing valid-contact feedback.
- `src/scene.ts` declares the bounded renderer and transient impact state.
- `src/scene-rendering.ts` selects the new renderer only for exact gate value `v3a-refined-mining`; non-mining states delegate to the accepted refined renderer, while mining uses indices 10–13 and authored direction textures without Phaser mirroring.
- Runtime residency paths are `public/assets/generated/diver-v3-refined-mining-{r,l}-{10..13}.png`.

Default gameplay, `diverMotionTest=v3a`, and `diverMotionTest=v3a-refined` condition branches and texture selection are unchanged. The extension is not authorized for ungating.

## Live normal-play capture and bitmap proof

Focused Playwright normal-play smoke passed on allowed port 5192 at:

`http://127.0.0.1:5192/?playtest=1&diverMotionTest=v3a-refined-mining`

The run started and dived normally, captured `#game canvas` directly at 1440×900, exercised right swim, authored-left swim, and pointer-held mining against a live staged ore face through the normal `mineAt` path. All four mining texture keys were observed across the capture sequence. Console errors: **0**. Page errors: **0**.

Browser HTTP/local exact proofs:

- Right contact index 11: HTTP 200; 4,952 bytes; browser/local SHA-256 both `379b48c1927dcca8478ecc982b4be34be1b1abdc6f55d1c4a111a379d8d394c5`.
- Authored-left recoil index 12: HTTP 200; 5,502 bytes; browser/local SHA-256 both `f2c600d96cef187e41314ca74ef8fe2e01e3192b754b48bd748a87f2ca9a267d`.

These exact matches prove the live server loaded the generated bitmaps rather than stale files or procedural stand-ins. Compact evidence is in `artifacts/canvas/runtime-capture-metadata.json`.

## Export and code verification

- `npm run build`: **PASS** (Vite 8.0.12; only existing public-asset and chunk-size warnings).
- `npx tsc --noEmit --pretty false`: **baseline FAIL** with the same existing story/save/playtest/articulated/resetOxygenWarnings diagnostics documented by the parent refinement. No diagnostic names the new renderer, new scene state, mining bitmap keys, or new assets. The new loader shifts later `helpers.ts` baseline line numbers only.
- `git diff --check`: **PASS**.
- Export validation: **PASS** for all eight runtime PNGs — 128×96 RGBA, alpha exactly `{0,255}`, transparent RGB zero, fixed pivot `(64,52)`, exact public/run bytes, identical mirrored alpha registration, and genuinely authored-left RGB.
- Adjacent mining frames are pixel-distinct; no static duplicate drawing remains.
- Vite watch exclusions already include `**/.desktop-build/**`.

Machine evidence: `artifacts/spec/export-validation.json`; durable hash list: `artifacts/manifest.sha256`.

## Delivery

`artifacts/delivery/diver-v3-swim-and-mine.gif` is a direct-canvas loop with a readable right-swim segment, a clean hard cut, then repeated live mining cycles and impact feedback. It contains no browser or debug chrome.

- Dimensions: **720×450**
- Duration: **5.000 s**
- Frames / rate: **60 frames at 12 fps**
- Loop behavior: **infinite** (`loop=0`)
- Byte size: **939,288 bytes**
- SHA-256: `9bbc3bd2dd9ff92ab509a7db654cbe31b847ca0c8e9c82ef4197c9da186159a6`

Best delivery PNGs (all direct `#game canvas` captures): `mid-swim-right.png`, `deep-swim-left.png`, `mine-contact-right.png`, and `mine-recoil-right.png`.

## Review evidence and blunt verdict

- Gameplay-scale direction/color review: `artifacts/review/swim-mine-color.png`
- Gameplay-scale grayscale review: `artifacts/review/swim-mine-grayscale.png`
- Direct live-canvas color comparison: `artifacts/review/canvas-swim-mine-color.png`
- Direct live-canvas grayscale comparison: `artifacts/review/canvas-swim-mine-grayscale.png`
- Surface/mid/deep and mining canvas captures plus HUD/project companions: `artifacts/canvas/`

**Verdict:** pass. Mining is no longer a static forward reach; the cutter has an unmistakable silhouette and the impact reads immediately. The strongest frame is full contact, where the cyan/copper barrel, gold impact, live guide, and existing debris rings converge without obscuring the diver. The recoil is visibly lower and shorter, so cadence remains legible even in grayscale.

The honest caveat is stylistic: the cutter is slightly more graphic and higher-contrast than the painterly suit, and tiny brass dents still collapse at gameplay scale. That contrast is currently functional rather than discordant—it is why the tool remains readable against dark rock. The deep swim capture also demonstrates that the accepted diver is intentionally small relative to the environment. Neither issue warrants another iteration for this bounded delivery.

## Lineage

The mining drawings are deterministic registered edits derived from accepted refined scanner-hold bitmap index 8. The build script preserves the accepted body pixels and repaints connected arms, cutter, relighting, and port-side detail. No external/generated concept output replaces the accepted diver identity. Source and output lineage is reproducible from `build_mining_assets.py`, with frame contract in `artifacts/spec/frame-plan.md`.
