# Water9 Distant Landmark Background Audit - 2026-07-04

## Preflight

- Required preflight command: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- Current HEAD: `7776913` (matches manager preflight HEAD)
- Active repo verified with `pwd` and `git rev-parse --show-toplevel`: `/mnt/nxt-dev/water9`
- Scope followed: static/read-only audit of current dirty working tree and existing proof artifacts. No source/assets/proofs were edited; only this requested report directory/file was created.

## Git Status Summary

Pre-report `git status --short` showed a dirty working tree:

- Modified tracked files: `package.json`, `src/helpers.ts`, `src/hud.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/styles.css`, `src/types.ts`
- Untracked generated background assets: `public/assets/generated/background-phase3/`
- Untracked proof/run folders: many `runs/water9-*landmark*`, `runs/water9-*background*`, `runs/water9-*painterly*`, and related July 3/4 folders
- Untracked tools/source inputs include `tools/build_*background*`, `tools/review_*background*`, `tools/review_*landmark*`, and `tools/source-inbox/water9-phase11-*.png`

## Verdict

**Partially implemented.**

Runtime wiring is substantially in place: the dirty tree imports the Phase 3 manifest, loads every `ready` generated/painterly asset, chooses biome-specific authored landmarks for biomes 1-4, and renders them as Phaser image sprites in the normal `drawParallax` path. Existing proof also shows actual `#game canvas` runtime captures with generated texture keys for all four biomes.

However, visual acceptance is not fully clean. The strongest latest proof, `runs/water9-painterly-landmark-visual-recovery-2026-07-04/`, makes biomes 2-4 look like authored generated bitmap landmarks, but biome 1 still reads like a flat/simple constructed landmark rather than the same painterly generated-art bar. Older manager notes also explicitly rejected an earlier final contact sheet as too faint/edge-cropped. I would not call the complete biomes 1-4 set "properly implemented" until biome 1 is upgraded or explicitly accepted as adequate.

## Runtime Code Path

- Asset manifest import: `src/helpers.ts:11` imports `../public/assets/generated/background-phase3/background-phase3.manifest.json`.
- Runtime loading: `src/helpers.ts:409`-`411` loads each `painterlyBackgroundManifest` entry whose status maps to `availableInRuntime`.
- Manifest normalization: `src/helpers.ts:682`-`702` converts manifest paths like `public/assets/...` to runtime paths like `/assets/...`, derives `textureKey`, role, band, crop, opacity, scale, parallax, and availability.
- Biome landmark pools: `src/helpers.ts:566`-`655` maps biomes 1-4 and bands to intended landmark ids.
- Anchor selection: `src/helpers.ts:1058`-`1368` builds `EnvironmentAnchorSilhouette` entries, including `textureKey`, `assetId`, crop, dimensions, alpha, and authored placement. Surface/first-water biome landmarks are immediately returned at `src/helpers.ts:1099`-`1125`.
- Environment profile exposure: `src/helpers.ts:1474`-`1479` exposes anchor assets in `environmentVisualProfileFor`.
- Normal render path: `src/scene-rendering.ts:24`-`35` calls `drawParallax` before world/entity rendering. `drawParallax` calls `drawBackgroundAnchors` at `src/scene-rendering.ts:128`.
- Live sprite rendering: `src/scene-rendering.ts:131`-`177` calls `environmentAnchorSilhouettesFor`, checks `scene.textures.exists(anchor.textureKey)`, creates/reuses Phaser image sprites, applies crop/alpha, and sets `displayWidth`/`displayHeight`.

## Intended Assets

All four intended biome landmark assets are present on disk and marked `status: "ready"` in `public/assets/generated/background-phase3/background-phase3.manifest.json`.

| Biome | Intended id | Asset path | Manifest lines | Notes |
| --- | --- | --- | --- | --- |
| 1 | `biome-shallows-shell-survey-terrace` | `public/assets/generated/background-phase3/water9-biome-landmark-shallows-shell-survey-terrace.png` | `background-phase3.manifest.json:391`, `:396` | Actual PNG exists, 960x520 RGBA. First-pass soft shell/survey asset, not GPT-source-level painterly detail. |
| 2 | `biome-brine-vertical-chimney-gpt` | `public/assets/generated/background-phase3/water9-biome-landmark-brine-vertical-chimney-gpt.png` | `background-phase3.manifest.json:423`, `:428` | Actual PNG exists, 960x520 RGBA. Manifest says real GPT bitmap with magenta matte converted to alpha. |
| 3 | `biome-midnight-black-coral-ribs` | `public/assets/generated/background-phase3/water9-biome-landmark-midnight-black-coral-ribs.png` | `background-phase3.manifest.json:463`, `:468` | Actual PNG exists, 1392x989 RGBA. Manifest says restored to use Phase 11 real GPT collapsed gantry/brine reef bitmap. |
| 4 | `biome-ruins-vault-causeway-lattice` | `public/assets/generated/background-phase3/water9-biome-landmark-ruins-vault-causeway-lattice.png` | `background-phase3.manifest.json:496`, `:501` | Actual PNG exists, 1389x958 RGBA. Manifest says restored to use Phase 11 real GPT drowned signal station bitmap. |

## Per-Biome Appraisal

| Biome | Code implemented | Asset backed | Normal gameplay proof | Visual acceptance |
| --- | --- | --- | --- | --- |
| 1 - The Shallows | Yes. Pool includes `biome-shallows-shell-survey-terrace` for surface/upper/mid (`src/helpers.ts:567`-`581`), surface immediate path returns authored bitmap anchor (`src/helpers.ts:1099`-`1125`). | Yes, ready PNG and manifest entry. | Yes. `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome1-normal-gameplay-landmark.png`; metadata says `sourceSelector: "#game canvas"`, `landmarkId: biome-shallows-shell-survey-terrace`, `generatedBackgroundTexture: true`, pass true. | **Not fully accepted.** Readable and loaded, but visually looks like simple flat/vector-like shapes rather than rich generated/painterly distant art. It is the weak link. |
| 2 - Brine Chimney Cluster Field | Yes. Pool uses `biome-brine-vertical-chimney-gpt` across surface/upper/mid/lower (`src/helpers.ts:593`-`606`), and render path has special mid-biome de-duplication at `src/scene-rendering.ts:134`-`145`. | Yes, ready GPT-derived PNG and manifest entry. | Yes. `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome2-normal-gameplay-landmark.png` and grayscale pair. Metadata records live texture `water9-biome-landmark-brine-vertical-chimney-gpt`. | Accepted from existing proof. Strong authored vertical bitmap; readable in color and grayscale. |
| 3 - Midnight Trench | Yes. Pool uses `biome-midnight-black-coral-ribs` across surface/upper/mid/lower (`src/helpers.ts:614`-`627`). | Yes, ready GPT-derived/restored PNG and manifest entry. | Yes. `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome3-normal-gameplay-landmark.png` and grayscale pair. Metadata records live texture `water9-biome-landmark-midnight-black-coral-ribs`. | Accepted from existing proof. Reads as a large painterly authored gantry/reef structure, not a procedural placeholder. |
| 4 - Ancient Ruins | Yes. Pool uses `biome-ruins-vault-causeway-lattice` across surface/upper/mid/lower/transition (`src/helpers.ts:635`-`650`). | Yes, ready GPT-derived/restored PNG and manifest entry. | Yes. `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome4-normal-gameplay-landmark.png` and grayscale pair. Metadata records live texture `water9-biome-landmark-ruins-vault-causeway-lattice`. | Accepted from existing proof. Strong authored drowned structure with good grayscale readability. |

## Proof Evidence

Most relevant proof set:

- `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-painterly-landmark-visual-recovery.json`
  - `schema: water9/painterly-landmark-visual-recovery@1`
  - `timestamp: 2026-07-04T18:09:09.192Z`
  - `head: 7776913`
  - `sourceSelector: "#game canvas"`
  - Includes captures for biomes 1-4 at depth 24m / surface, with `renderedBitmap.generatedBackgroundTexture: true`
- `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-painterly-landmark-visual-recovery-contact-sheet.png`
- `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-painterly-landmark-visual-recovery-grayscale-contact-sheet.png`
- Per-biome normal gameplay captures and grayscale captures:
  - `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome1-normal-gameplay-landmark.png`
  - `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome1-normal-gameplay-landmark-grayscale.png`
  - `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome2-normal-gameplay-landmark.png`
  - `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome2-normal-gameplay-landmark-grayscale.png`
  - `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome3-normal-gameplay-landmark.png`
  - `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome3-normal-gameplay-landmark-grayscale.png`
  - `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome4-normal-gameplay-landmark.png`
  - `runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-biome4-normal-gameplay-landmark-grayscale.png`

Other useful proof/history:

- Manager immediate proof note: `/home/orlovboros/projects/managers/water9/runs/water9-immediate-biome-landmark-proof-2026-07-04.md`
- Manager painterly restoration note: `/home/orlovboros/projects/managers/water9/runs/water9-painterly-landmark-restoration-2026-07-04.md`
- Earlier immediate proof: `runs/water9-immediate-biome-landmark-proof-2026-07-04/water9-immediate-biome-landmark-proof.json`, contact sheet and per-biome `water9-biome*-first-water-landmark.png`
- Later immediate-style proof sets: `runs/water9-painterly-bitmap-landmark-final-proof4-2026-07-04/` and `runs/water9-painterly-runtime-restoration-2026-07-04-final3/`
- Manager caveat from painterly restoration note: earlier `runs/water9-painterly-landmark-restoration-2026-07-04-final/water9-immediate-biome-landmark-contact-sheet.png` was visually rejected as too faint/edge-cropped despite metadata PASS.

## Highest-Risk Gaps

1. **Biome 1 quality gap.** It is loaded and visible in real gameplay, but the asset itself does not match the richer generated/painterly bar shown by biomes 2-4. If the acceptance bar is "authored/painterly landmark rather than procedural placeholder or faint/cropped shape," biome 1 remains borderline-to-fail.
2. **Proof is all from dirty, untracked state.** The implementation depends on untracked `public/assets/generated/background-phase3/` plus modified source files. A clean checkout of `7776913` alone will not have the assets/code.
3. **Visual proof is strongest only in one latest folder.** Earlier proof folders include failed or superseded visual states, so workers should not cite metadata PASS from older folders without opening the actual `#game canvas` images.
4. **Biome 1/2/3/4 first-water captures are at surface/depth 24m.** That satisfies immediate in-water proof, but it does not prove every deeper band placement is equally strong. Code has band pools for deeper water, but this audit did not generate new deep traversal proof.

## Recommended Next Worker Prompt

You are fixing Water9 distant landmark backgrounds in `/mnt/nxt-dev/water9`. First run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`; if it fails, report `MOUNT_DOWN`. Work in the current dirty tree. Do not disturb existing proof folders except to add a new dated run.

Goal: make the biome 1 distant landmark meet the same generated/painterly authored-place quality bar as biomes 2-4 while preserving the current working runtime integration. Biomes 2-4 already have acceptable live `#game canvas` proof in `runs/water9-painterly-landmark-visual-recovery-2026-07-04/`; avoid regressing them.

Tasks:
- Inspect `src/helpers.ts`, `src/scene-rendering.ts`, and `public/assets/generated/background-phase3/background-phase3.manifest.json`.
- Replace or substantially improve `biome-shallows-shell-survey-terrace` so it is an actual painterly/bitmap distant landmark, not a flat/procedural-looking shell/survey shape.
- Keep the manifest id/texture path stable if possible, or update all runtime references directly.
- Run `npm run build`.
- Capture new actual `#game canvas` normal-play proof for biomes 1-4, including color and grayscale contact sheets. The biome 1 proof must be readable immediately in water and must look like authored painterly generated art.
- In the report, cite the live rendered texture key and screenshot paths, and explicitly compare biome 1 against the 2026-07-04 visual-recovery proof.

## Caveat

This audit did not start a server or capture new screenshots. Visual acceptance is based on existing artifacts, with actual `#game canvas` proof prioritized over scripts/metadata/self-verdicts. From those artifacts, biomes 2-4 pass visual acceptance; biome 1 is implemented but not fully accepted.
