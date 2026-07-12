# Diver V3 Concept A Refinement Review Gate — 2026-07-11

- Status: **PASS — manager-reviewable refinement gate**
- Starting HEAD: `283794a`
- Scope: registration-locked repaint/refinement of the accepted seven-frame Concept A slice plus three minimum locomotion in-betweens; **not** the complete action-set replacement
- Runtime gate: `?playtest=1&diverMotionTest=v3a-refined`

## Outcome

The accepted two-key hover/swim prototype is now a three-drawing hover loop and four-drawing swim loop. One shared opaque-subject palette, one fixed master-to-runtime scale, a connected-component visor anchor, fixed `(64,52)` pivots, and adjacent onion-skin review reduce core breathing and material shimmer without suppressing purposeful limbs/fins. The accepted scanner deploy/hold/recover poses remain two-handed; a modular cone now starts at the registered sensor socket and is drawn only from live non-null scan-target state.

Ten right-facing and ten authored-left transparent runtime bitmaps are integrated behind the new refinement-specific gate. Left alpha registration is identical to right, while screen-space lighting and port-side details are deliberately repainted after orientation reversal. Default gameplay and the accepted `diverMotionTest=v3a` path remain unchanged.

## Dirty-start safety

The required mount check returned actual HEAD `283794a`, matching the expected value. At start, the assigned source files and intended new public/runtime paths were clean. Pre-existing dirt consisted of two modified historical July 4 reports plus numerous untracked audit, prompt, diver-production, performance, and restoration runs. None was edited or staged. The pre-existing untracked top-level refinement prompt/report request files (`runs/diver-v3-a-refinement-2026-07-11.md` and `.prompt.md`) are also unrelated orchestration inputs and were not staged.

## Frame/timing plan

- Hover: indices `0,1,2`, 120 ms each; `hover-inbetween` is new.
- Swim: indices `3,4,5,6`, 82/82/92/82 ms; `swim-transition-a` and `swim-transition-b` are new.
- Scanner: deploy index 7 for 220 ms, live-state hold index 8, recover index 9 for a readable 650 ms window.
- Both directions have all ten bitmaps; cell 128×96, pivot `(64,52)`.

Full names, texture keys, sockets, and behavior are in `artifacts/spec/frame-plan.md` and `artifacts/runtime/diver-v3-refined.json`.

## Runtime integration

- `src/helpers.ts` preloads 20 refinement bitmaps.
- `src/scene.ts` declares the bounded renderer method.
- `src/scene-rendering.ts` selects the new 3/4/3 timing only for `v3a-refined`, uses authored direction textures without Phaser mirroring, and draws the live-target scanner cone from the socket.
- `public/assets/generated/diver-v3-refined-{r,l}-{0..9}.png` are the live bitmap residency paths.

No old sprite, procedural stand-in, prior motion bitmap, or stale atlas is selected by the refined gate.

## Verification

- `npm run build`: **PASS** (Vite 8.0.12; only existing unresolved-public-asset and chunk-size warnings).
- `npx tsc --noEmit --pretty false`: **baseline FAIL** with the existing story/save/playtest/articulated/resetOxygenWarnings diagnostics. No diagnostic names the new renderer, scene declaration, texture keys, or refinement assets. The only touched file with diagnostics is `helpers.ts`, at unrelated lines 2916–3360; this lane changes its loader near line 500.
- Focused Playwright normal-play smoke: **PASS** on allowed port 5191; 11 canvas captures; console errors 0; page errors 0.
- Export validation: **PASS** for all 20 runtime PNGs (128×96 RGBA, alpha exactly `{0,255}`, zero transparent RGB, public/run pixel identity, fixed pivot).
- Visor registration: right centroid range x `97.08–100.42`, y `40.67–42.79`; authored-left x `26.60–29.92`, y `40.67–42.44`.
- Authored-left proof: every left bitmap preserves mirrored alpha registration but differs from its raw RGB mirror by `1,141–1,578` pixels.
- `git diff --check`: **PASS**.

## Browser/local bitmap proof

- New hover in-between `diver-v3-refined-r-1.png`: browser HTTP 200, 4,421 bytes; browser/local SHA-256 both `988bb75cbaba8c8595b2e0d48e45b291f41406867884986f8fe954e926500158`.
- Authored-left swim bitmap `diver-v3-refined-l-5.png`: browser HTTP 200, 5,121 bytes; browser/local SHA-256 both `5a907af2a6ab31dbc82e3e41fe6f47dd930ca012910c9ce5c2e63a8b3d026bde`.

Both exact matches are recorded in `artifacts/canvas/runtime-capture-metadata.json`. The same metadata observes right hover indices 0/1/2 at depth 36, right swim indices 3/4/5/6 at depth 1050, authored-left at depth 2250, and scanner indices 7/8/9 against a live Lantern Fry at depth 90.

## Review evidence

- Live color/grayscale board: `artifacts/review/canvas-bands-color.png`, `canvas-bands-grayscale.png`
- Live native/enlarged inspection: `artifacts/review/canvas-native-enlarged.png`
- Runtime directions/color/grayscale: `artifacts/review/frames-color.png`, `frames-grayscale.png`
- Registration onion skins: `artifacts/review/adjacent-onion-registration.png`
- Accepted prototype comparison: `artifacts/review/prior-refined-comparison.png`
- Exact raw `#game canvas` progression: `artifacts/canvas/surface-hover-{a,inbetween,b}-canvas.png`, `mid-swim-{propulsion,transition-a,cruise,transition-b}-canvas.png`, `deep-swim-authored-left-canvas.png`, and `scanner-{deploy,hold,recover}-canvas.png`
- HUD/project identity companions use the same stems with `-hud.png`.

## Blunt gate judgment

The slice passes this refinement review: locomotion no longer reads as two-key alternation; the common core does not visibly breathe in onion skins; brass/copper/black/cyan hierarchy is coherent; the scanner remains two-hand operated and its modular cone begins at the painted socket; authored-left light does not read as a raw mirror; anatomy/silhouette remain connected; grayscale gameplay readability does not regress.

Remaining caveats are bounded: fine dents collapse at gameplay size, the close live target makes the scanner cone short, and the broad propulsion-to-transition limb arc could receive more breakdowns only after manager selection. This result must remain gated. It is explicitly **not** the full action-set replacement and does not authorize ungating.

## Lineage and manifest

- Generation/edit lineage: `artifacts/lineage/generation-lineage.md`
- Machine validation: `artifacts/spec/export-validation.json`
- SHA-256 manifest: `artifacts/manifest.sha256`
