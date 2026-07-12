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

`artifacts/delivery/diver-v3-swim-and-mine.gif` is a phone-readable recut made only from the accepted normal-play direct-canvas frames. A stable 480×360 crop follows the centered diver across both source scenes and is enlarged to 640×480; there are no camera jumps within either segment. The two-second swim receives a modest whole-frame lift (`brightness=0.035`, `gamma=1.15`, `saturation=1.08`) so the suit and limb motion survive phone playback without erasing the underwater mood. A clean hard cut leads into three seconds of ungraded live mining, containing repeated anticipation/contact/recoil poses, the live guide and target ring, and terrain impact feedback. It contains no browser or debug chrome.

- Dimensions: **640×480**
- Duration: **5.000 s**
- Frames / rate: **60 frames at 12 fps**
- Loop behavior: **infinite** (`loop=0`)
- Byte size: **1,745,776 bytes**
- SHA-256: `07ff114dea82c144bf8f5cfa32f6a03521bf31486a21c3e6409db0069e0101a1`

Tight delivery PNGs, derived only by the same crop/scale and swim-wide grading from the direct `#game canvas` frames: `swim-readable.png`, `mining-anticipation.png`, `mining-contact.png`, and `mining-recoil.png`.

## Review evidence and blunt verdict

- Gameplay-scale direction/color review: `artifacts/review/swim-mine-color.png`
- Gameplay-scale grayscale review: `artifacts/review/swim-mine-grayscale.png`
- Direct live-canvas color comparison: `artifacts/review/canvas-swim-mine-color.png`
- Direct live-canvas grayscale comparison: `artifacts/review/canvas-swim-mine-grayscale.png`
- Six-frame final-GIF contact sheet: `artifacts/review/diver-v3-delivery-contact-sheet.png`
- Surface/mid/deep and mining canvas captures plus HUD/project companions: `artifacts/canvas/`

**Verdict:** pass after delivery recut. The original 720×450 full-canvas GIF was not acceptable for phone review: the diver was too small and the opening swim was near-black. In the corrected 640×480 crop, the diver is roughly 2.7× larger than the full-canvas source presentation, the swim limbs remain readable, and the cutter's raised/contact/lowered arc is unmistakable across multiple honest gameplay cycles. The target ring, cyan live guide, ore wall, and debris preserve enough context to prove that this is gameplay rather than an isolated sprite reel.

The honest caveat is that the swim-to-mining transition remains an intentional hard cut between two accepted normal-play capture locations, and the circular drill target partially overlaps the ore face. Neither obscures the diver or tool motion at phone size. The cutter remains slightly more graphic and higher-contrast than the painterly suit, but that contrast is functional against dark rock.

## Lineage

The mining drawings are deterministic registered edits derived from accepted refined scanner-hold bitmap index 8. The build script preserves the accepted body pixels and repaints connected arms, cutter, relighting, and port-side detail. No external/generated concept output replaces the accepted diver identity. Source and output lineage is reproducible from `build_mining_assets.py`, with frame contract in `artifacts/spec/frame-plan.md`.
