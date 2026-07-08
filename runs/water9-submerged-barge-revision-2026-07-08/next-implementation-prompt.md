# Worker Prompt: Water9 Submerged Barge First Slice

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working only in repo `/mnt/nxt-dev/water9`.

Goal: implement only the first submerged-only barge slice. Replace the current runtime barge sprite with an underwater/underside docking station read. The game should show the submerged underside infrastructure of a support barge or compact underwater docking station, not a surface deck/platform.

Approved direction:

- Visible object: submerged underside of the barge/docking station.
- No sky expansion, no above-water deck hero read, no surface-platform composition, no tall deck clutter.
- Center the read on underside pontoons/hull mass, a lit moon-pool/docking throat, guide rails, hanging cable/winch hardware, ballast tanks, repair/refit machinery, utility lights, hazard strips, mooring chains, and underwater silhouettes.
- Keep the existing `600x72` RGBA runtime footprint.
- Preserve the central transparent/open docking gap and current collision assumptions.
- Optimize for normal gameplay scale and grayscale readability.

Context:

- Revised proposal: `/mnt/nxt-dev/water9/runs/water9-submerged-barge-revision-2026-07-08/submerged-barge-revision.md`
- Previous proposal pack: `/mnt/nxt-dev/water9/runs/water9-barge-docking-station-proposal-2026-07-08/`
- Current runtime asset: `public/assets/generated/barge-platform.png`
- Current source/review assets that may help as raw material:
  - `assets/bargeplatformasset.png`
  - `assets/bargeassets.png`
  - `assets/bargeshopassets.png`
  - `tools/source-inbox/barge-platform-polish-imagegen-2026-06-28*.png`
- Runtime references:
  - `src/constants.ts` for platform/grid/gap constants
  - `src/scene.ts` for `bargeSprite`
  - `src/scene-rendering.ts` for `drawBoat`
  - `src/helpers.ts` for `loadGeneratedAssets`, `bargeSolidAtWorld`, `bargeSolidCell`
  - `src/hud.ts` for current barge menu functions
  - `tools/test_barge_visual_smoke.mjs`

Scope:

- Prefer touching only `public/assets/generated/barge-platform.png` and new run-folder proof files.
- Do not edit gameplay, collision, HUD, worldgen, or surface rendering unless an unavoidable issue is found. If unavoidable, stop and report the mismatch before changing those systems.
- Do not add deck/sky/surface expansion.
- Do not add a large above-water crane, deck shop, mast cluster, or top-deck platform read.
- If a small generator/source script is necessary for repeatability, add it only if the repo already has a matching asset-generation pattern and keep it narrowly scoped.
- Do not stage or commit. Preserve unrelated dirty worktree changes.

Files likely touched:

- `public/assets/generated/barge-platform.png`
- Optional, only if justified: a narrowly scoped asset generation/helper file under `tools/`
- Run proof outputs under `/mnt/nxt-dev/water9/runs/water9-submerged-barge-first-slice-2026-07-08/`

Visual requirements:

- Exact texture size remains `600x72`.
- Central docking gap remains transparent/open and aligned with the current player entry.
- The sprite reads as submerged underside infrastructure, not a surface deck.
- The central throat is the brightest functional cue, with guide rails/lights/cable that do not visually close the gap.
- Hull/pontoon mass, ballast/repair machinery, winch hardware, utility lights, hazard marks, and mooring chains survive at gameplay scale.
- No magenta/green matte fringe.
- Grayscale proof still shows the bay, hull/pontoon separation, and machinery clusters.

Verification:

- Run the existing barge visual smoke safely:
  - Start Vite yourself on an open port in `5180-5199` with `--strictPort`.
  - Pass `PLAYTEST_URL` to the smoke so the script does not probe outside `5180-5199`.
  - Write smoke JSON and screenshot into the run proof directory.
- Capture a live normal-play `#game canvas` proof near the docked barge.
- Capture a grayscale companion of the same proof.
- Build a before/after asset review sheet comparing the old barge and new submerged barge.
- Verify proof PNGs exist and have nonzero dimensions.
- Verify any JSON parses.
- Run `npm run build` or the repo's TypeScript/build check if available and reasonable for this asset-only slice.

Return block:

- Status
- HEAD observed from preflight
- Files changed
- Proof paths
- Verification
- Caveats/blockers
