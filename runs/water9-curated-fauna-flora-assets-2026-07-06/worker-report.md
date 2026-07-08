Status: PASS

Preflight HEAD: 03b2dad

Dirty-start classification:
- Worktree was already dirty before this lane. Existing dirty paths included `package.json`, many shared `src/*` files, existing Goblin Shark generated files, progression/fauna-rarity run outputs, and untracked overlapping flora/style/audit run folders.
- This lane worked in the pinned repo only: `/mnt/nxt-dev/water9`.
- No commit made. Isolated staging is unsafe because this lane touched shared dirty files (`src/helpers.ts`, `src/scene-worldgen.ts`) and previously dirty Goblin Shark generated assets. Explicit-path staging would still mix with other-lane edits in the same files.

Changed / added by this lane:
- `src/helpers.ts`
  - Preloads the Goblin Shark manifest and includes `fauna-abyss-mantle-crawler` in runtime spritesheet loading.
- `src/scene-worldgen.ts`
  - Replaces the special-room Mantle Crawler adult from `fish-abyss-predator` to `fauna-abyss-mantle-crawler`.
- `src/scene-sandbox.ts`
  - Points flora previews at the same curated terrain-edge/env bitmap keys used by gameplay instead of `flora-shallow-*` / `flora-deep-*`.
- `tools/audit_curated_fauna_flora_assets.mjs`
  - Focused audit that fails if normal gameplay fauna/flora outliers still use generic fallback keys.
- `tools/build_curated_fauna_pass_assets.py`
  - Reproducible builder for this pass' derived bitmap spritesheets/contact sheet.
- Rebuilt Goblin Shark runtime files:
  - `public/assets/generated/fauna-abyss-goblin-shark.png`
  - `public/assets/generated/fauna-abyss-goblin-shark-0.png`
  - `public/assets/generated/fauna-abyss-goblin-shark-1.png`
  - `public/assets/generated/fauna-abyss-goblin-shark-2.png`
  - `public/assets/generated/fauna-abyss-goblin-shark.frames.json`
- Added Mantle Crawler runtime files:
  - `public/assets/generated/fauna-abyss-mantle-crawler.png`
  - `public/assets/generated/fauna-abyss-mantle-crawler-0.png`
  - `public/assets/generated/fauna-abyss-mantle-crawler-1.png`
  - `public/assets/generated/fauna-abyss-mantle-crawler-2.png`
  - `public/assets/generated/fauna-abyss-mantle-crawler-3.png`
  - `public/assets/generated/fauna-abyss-mantle-crawler.frames.json`
- Proof artifacts under `runs/water9-curated-fauna-flora-assets-2026-07-06/`.

Inventory / proof paths:
- Inventory: `runs/water9-curated-fauna-flora-assets-2026-07-06/procedural-asset-inventory.json`
- Runtime proof metadata: `runs/water9-curated-fauna-flora-assets-2026-07-06/normal-play-proof.json`
- Proof runner: `runs/water9-curated-fauna-flora-assets-2026-07-06/capture-curated-fauna-flora-proof.mjs`
- Contact sheet: `runs/water9-curated-fauna-flora-assets-2026-07-06/curated-asset-contact-sheet.png`
- Contact sheet grayscale: `runs/water9-curated-fauna-flora-assets-2026-07-06/curated-asset-contact-sheet-grayscale.png`
- Normal-play canvas proofs:
  - `canvas-surface-fauna-lantern-fry.png` and grayscale
  - `canvas-mid-fauna-gulper-eel.png` and grayscale
  - `canvas-deep-fauna-goblin-shark.png` and grayscale
  - `canvas-abyss-fauna-mantle-crawler.png` and grayscale
  - `canvas-surface-flora-sting-anemone.png` and grayscale
  - `canvas-mid-flora-vent-coral.png` and grayscale
  - `canvas-deep-flora-crown-polyp.png` and grayscale
  - `canvas-abyss-flora-oracle-polyp.png` and grayscale
- Scan HUD proof: `runs/water9-curated-fauna-flora-assets-2026-07-06/viewport-scan-hud-vent-coral.png`

Replacements:
- Goblin Shark: rebuilt `fauna-abyss-goblin-shark` from the existing painted alpha bitmap source at `runs/water9-asset-behavior-recovery-2026-07-06/generated-source/fauna-abyss-goblin-shark-source-alpha.png`.
  - Old runtime sheet: 3 frames at 60x34.
  - New runtime sheet: 3 frames at 120x64, same runtime key, manifest updated with source notes.
  - Purpose: fixes the "shape-built/procedural read" complaint even though the old texture technically loaded.
- Mantle Crawler special-room adult: `fish-abyss-predator` -> `fauna-abyss-mantle-crawler`.
  - New runtime sheet: 4 frames at 112x76.
  - Derived from existing curated bitmap `public/assets/generated/fauna-velvet-lantern-cuttle-whole-painted.png`.
- Sandbox flora previews: generic `flora-shallow-kelp`, `flora-shallow-anemone`, `flora-deep-coral`, `flora-deep-tube` -> curated terrain-edge/env keys matching gameplay species.

Verification results:
- `npx tsc --noEmit --pretty false`: PASS.
- `npm run build`: PASS. Vite emitted existing static asset URL and chunk-size/plugin-timing warnings only.
- `node tools/audit_curated_fauna_flora_assets.mjs`: PASS, 153 inventory rows.
- `node runs/water9-curated-fauna-flora-assets-2026-07-06/capture-curated-fauna-flora-proof.mjs`: PASS, 8 captures, 0 failures.
- Port cleanup: checked 5180-5199 with `ss`; no listeners remained.

Visual inspection:
- Goblin Shark is now clearly visible at gameplay scale in `canvas-deep-fauna-goblin-shark.png`, with painted body texture and a readable shark silhouette instead of a simple constructed shape read.
- Mantle Crawler is visible in normal special-room gameplay with `fauna-abyss-mantle-crawler`.
- Vent Coral scan HUD proof shows the promoted runtime flora being scanned and rewarded.
- Deep/abyss screenshots are intentionally dark because they are normal gameplay captures with lighting/fog active; grayscale versions are present for readability checks.

Rejected / debug-only notes:
- Generic fallback keys are still preloaded/retained for legacy package/debug compatibility, but the focused audit found no normal gameplay fauna/flora reliance on them after this pass.
- `src/articulated.ts` still has procedural missing-part `generateTexture` fallbacks; inventory marks them `DEBUG_ONLY`. They are not the normal small fauna/flora runtime path.

BLOCKED_ASSET_QUEUE: none.

Commit: not committed, because the lane started on a heavily dirty overlapping worktree and several touched files already contained unrelated changes.
