# Diver V3 Concept A Motion Test — 2026-07-11

- Status: **PASS — manager-reviewable motion-test gate**
- Starting/actual pre-commit HEAD: `72f2bae`
- Scope: seven authored Concept A motion keys plus an explicitly gated live integration proof; **not** the complete diver replacement
- Runtime gate: `?playtest=1&diverMotionTest=v3a`

## Outcome

Seven high-resolution Concept A masters were individually generated from the approved canonical master: two hover/settle keys, propulsion and cruise, and scanner deploy/hold/recover. The scanner is visibly operated with both hands; its cone remains modular. Chroma extraction produced transparent high-resolution masters, and a documented local reduction created 128×96 binary-alpha runtime cells with fixed `(64,52)` pivots, clean transparent RGB, 32-color local palettes, and machine-readable timing/socket metadata.

The slice is integrated behind one query flag. Without the flag Water9 continues to use the existing diver. With it, normal play loads the seven bitmap files, loops hover/swim, and selects scanner deploy/hold/recover from actual scan-target state. No v2 pixels, procedural diver, old atlas, or articulated stand-in is used by this path.

## Dirty-start classification and repo safety

The required HEAD check returned `72f2bae`. The worktree already contained two modified historical run reports and numerous untracked run/prompt/performance artifacts, including the prerequisite audit/bible/v2 runs. At stub creation no assigned runtime or public motion-test path was dirty. The four runtime source files and seven new public PNG paths were clean/nonexistent, so narrow integration was safe. Unrelated dirt was neither edited nor staged.

## Authored frame plan

| Frame | Intent | Runtime behavior |
|---|---|---|
| `hover-settle-a` | buoyant rise, relaxed connected limbs | hover loop A, 180 ms |
| `hover-settle-b` | weighted settle and restrained pack lag | hover loop B, 180 ms |
| `swim-propulsion` | asymmetrical kick/pull extreme | swim loop propulsion, 125 ms |
| `swim-cruise` | streamlined recovery/cruise | swim loop recovery, 145 ms |
| `scanner-deploy` | both hands bring scanner forward | deploy key, 130 ms |
| `scanner-hold` | braced two-hand operated scanner | held while valid target is scanned |
| `scanner-recover` | two-hand retraction to hover | readable 650 ms recover window |

Full pivots/sockets/timing are in `artifacts/spec/frame-plan.md` and `artifacts/runtime/diver-v3-motion.json`.

## Runtime paths inspected and changed

Inspected: `src/helpers.ts` asset loader and legacy frame contracts; `src/scene-rendering.ts` player selection/render path; `src/scene.ts` control and scan-target state; `src/scene-combat.ts` selected-tool dispatch; `src/scene-entities.ts` scan target lifecycle; `src/scene-playtest.ts` normal-play staging/snapshot path; `src/constants.ts` display scale/frame counts; `src/types.ts` animation/tool contracts; `public/assets/generated/` asset destination.

Changed runtime/source:

- `src/helpers.ts` — preloads seven V3 motion-test bitmap keys.
- `src/scene.ts` — stores bounded scanner transition timestamps and declares the renderer method.
- `src/scene-rendering.ts` — selects/render the seven keys only under `diverMotionTest=v3a`.
- `src/scene-playtest.ts` — exposes active texture key/gate in dev snapshot for proof.
- `public/assets/generated/diver-v3-motion-0.png` through `-6.png` — runtime frames.

## Checks and live smoke

- `npm run build`: **PASS** (Vite 8.0.12; normal unresolved-public-asset and chunk-size warnings only).
- `npx tsc --noEmit --pretty false`: **baseline FAIL**, with existing unrelated story/save/playtest/articulated typing errors. No diagnostic named the new motion-test renderer/properties/assets.
- Focused Playwright normal-play smoke on allowed port `5187`: **PASS**; entered play, captured upper/mid/lower depth bands, moved normally, selected scanner, held primary on a live target, and captured recover. Console errors: 0. Page errors: 0.
- Export validation: every runtime PNG is 128×96 RGBA; alpha values exactly `{0,255}`; transparent corners/RGB are zero; occupied bounds remain within `(6,8)–(122,88)`.
- `git diff --check`: **PASS**.

## Exact bitmap-loading evidence

`artifacts/canvas/runtime-capture-metadata.json` records:

- surface hover: `diver-v3-motion-1`, upper band, depth 36;
- mid swim: `diver-v3-motion-3`, mid band, depth 1050;
- deep swim: `diver-v3-motion-3`, lower band, depth 2262;
- scanner hold: `diver-v3-motion-5`, valid live target and scanner primary;
- scanner recover: `diver-v3-motion-6`.

The browser fetched `/assets/generated/diver-v3-motion-5.png` with HTTP 200 and 6,474 bytes. Browser SHA-256 and local file SHA-256 both equal `e39796a37ebf1f8a0e8f2aaa086872bd27216be92671c37bad59ede1d4fea8bb`; `exactMatch` is true. This proves the active scanner texture is the newly authored bitmap asset, not a procedural stand-in, old atlas entry, or stale cache.

## Key review and canvas evidence

- Canonical comparison: `artifacts/review/canonical-motion-comparison.png`
- Motion/contact color: `artifacts/review/motion-color-native-enlarged.png`
- Motion grayscale: `artifacts/review/motion-grayscale-native-enlarged.png`
- Live bands color: `artifacts/review/canvas-bands-color.png`
- Live bands grayscale: `artifacts/review/canvas-bands-grayscale.png`
- Live native/enlarged: `artifacts/review/canvas-native-enlarged.png`
- Surface canvas/HUD: `artifacts/canvas/surface-hover-canvas.png`, `surface-hover-hud.png`
- Mid canvas/HUD: `artifacts/canvas/mid-swim-canvas.png`, `mid-swim-hud.png`
- Deep canvas/HUD: `artifacts/canvas/deep-swim-canvas.png`, `deep-swim-hud.png`
- Scanner canvas/HUD: `artifacts/canvas/scanner-hold-canvas.png`, `scanner-hold-hud.png`

## Ruthless visual critique and next gate

The result clears the procedural-placeholder, disconnected-anatomy, silhouette, alpha-halo, grayscale, and scanner-interaction gates. Helmet, cyan faceplate, dorsal copper mass, brass cuirass, black bellows, gloves, and split fins survive live scale in all three bands.

It does not clear final animation production. The two-frame locomotion clips are authored key alternations rather than fluid loops. Individually painted texture stories create some frame-to-frame material shimmer, and propulsion/cruise retain slight shoulder/helmet registration breathing. The modular scanner cone overlaps the new sensor head more than ideal. Left-facing light/asymmetry remains a mirror. These are visible, disclosed, and appropriate blockers for full-package promotion—not blockers for this motion gate.

Recommended next gate: manager selects/notes these seven poses, then a focused shared-material/onion-skin repaint adds locomotion in-betweens, locks helmet/pack registration, tunes the scanner effect socket, and produces authored left-facing light correction before any bulk clip expansion.

## Lineage and manifest

- Exact generation/edit lineage: `artifacts/lineage/generation-lineage.md`
- SHA-256 manifest: `artifacts/manifest.sha256`
- No blockers remain for manager review. The full diver replacement remains explicitly unfinished.
