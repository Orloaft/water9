# Worker Prompt: Water9 Barge First Implementation Slice

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working only in repo `/mnt/nxt-dev/water9`.

Goal: implement the approved first slice for the Water9 barge docking station. Replace the current flat/outlier barge with a better `600x72` runtime sprite that reads as a compact industrial salvage dive-support platform with a protected moon-pool entry.

Approved direction:

- Small industrial salvage moon-pool outpost.
- Keep the existing `600x72` RGBA runtime footprint.
- Preserve the central transparent docking gap and collision assumptions.
- Communicate entry gap, winch/A-frame recovery, refit/shop deck, sub bay, route machinery, lights, hazard markings, waterline, and deck/pontoon separation.
- Optimize for gameplay-scale readability and grayscale readability.

Context:

- Proposal pack: `/mnt/nxt-dev/water9/runs/water9-barge-docking-station-proposal-2026-07-08/`
- Current runtime asset: `public/assets/generated/barge-platform.png`
- Current source/review assets:
  - `assets/bargeplatformasset.png`
  - `assets/bargeassets.png`
  - `assets/bargeshopassets.png`
  - `tools/source-inbox/barge-platform-polish-imagegen-2026-06-28*.png`
- Runtime references:
  - `src/constants.ts` for platform/grid/gap constants
  - `src/scene.ts` for `bargeSprite`
  - `src/scene-rendering.ts` for `drawBoat`
  - `src/helpers.ts` for `loadGeneratedAssets`, `bargeSolidAtWorld`, `bargeSolidCell`
  - `src/hud.ts` for barge menu functions
  - `tools/test_barge_visual_smoke.mjs`

Scope:

- Prefer touching only `public/assets/generated/barge-platform.png` and any new run-folder proof files.
- If a small generator/source script is necessary for repeatability, add it only if the repo already has a matching asset-generation pattern and keep it narrowly scoped.
- Do not change gameplay/collision constants unless the current gap cannot be preserved, and escalate before doing so.
- Do not stage or commit.
- Preserve unrelated dirty worktree changes.

Files likely touched:

- `public/assets/generated/barge-platform.png`
- Optional, only if justified: a narrowly scoped asset generation script under `tools/`
- Run proof outputs under a new `/mnt/nxt-dev/water9/runs/water9-barge-first-slice-YYYY-MM-DD/`

Visual requirements:

- Exact texture size remains `600x72`.
- Central docking gap remains clearly open and aligned with the current player entry.
- No magenta/green matte fringe.
- The barge reads in grayscale as more than a flat strip.
- At normal docked play scale, the player can identify the entry gap and recovery machinery.
- The HUD/menu may overlap the barge, so the most important cues must survive in the visible center/right area too.

Verification:

- Run `npm run water9:barge-visual-smoke` safely:
  - Start Vite yourself on an open port in `5180-5199` with `--strictPort`.
  - Pass `PLAYTEST_URL` to the smoke so the script does not probe outside `5180-5199`.
  - Write smoke JSON and screenshot into the run proof dir.
- Capture a live normal-play `#game canvas`/viewport proof near the docked barge.
- Capture a grayscale companion of the same proof.
- Build a before/after asset review sheet.
- Verify PNGs exist and have nonzero dimensions.
- Verify any JSON parses.

Return block:

- Status
- HEAD observed from preflight
- Files changed
- Proof image paths
- Smoke JSON path and result
- What visual failure modes were eliminated
- Remaining risks/caveats
