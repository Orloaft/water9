# Water9 B1 Single Glasshook Skulk Worker Report

- Preflight HEAD: 8a04ef5
- Status: done

## Changed files

- `src/scene-worldgen.ts`
  - Added a Biome 1-only Glasshook reservation in the lower/deep B1 band.
  - Placement scans lower B1 water pockets first, carves a small spawn pocket, and falls back to a deterministic lower open-water pocket if needed.
  - Existing Biome 3/4 side-tunnel reservation path is unchanged and still owns those biomes.
- `src/scene-articulated.ts`
  - Added a Biome 1-only spawn eligibility/count override for `abyssal-glasshook-skulk`.
  - Count override is exactly 1 only when `state.biome === 1`; manifest `minBiome: 3` and `spawn.count: 2` remain unchanged for Biome 3/4 behavior.
- `tools/test_b1_single_glasshook_skulk_smoke.mjs`
  - New focused Playwright smoke for Glasshook counts and B1 proof capture.
- `runs/water9-b1-single-glasshook-skulk-2026-07-08/*`
  - Worker report, smoke JSON, color canvas proof, grayscale canvas proof.

## Implementation summary

- Did not change generated manifest data or art assets.
- Biome 1 now creates one `side_tunnel_ambush` reservation for `abyssal-glasshook-skulk` in the lower B1 water-pocket band.
- Articulated population admits `abyssal-glasshook-skulk` below its manifest `minBiome` only for Biome 1, and caps that special-case spawn count to 1.
- Biome 2 is not special-cased, so it still does not admit Glasshook.
- Biome 3/4 keep normal manifest semantics: `minBiome: 3`, `spawn.count: 2`, side-tunnel reservations.

## Spawn/count results

From `b1-single-glasshook-skulk-smoke.json`:

- Biome 1: 1 Glasshook, reservation depth 602m in lower/deep B1, PASS.
- Biome 2: 0 Glasshook, PASS.
- Biome 3: 2 Glasshook, side-tunnel reservations, PASS.
- Biome 4: 2 Glasshook, side-tunnel reservations, PASS.

## Verification

- `npm run build`: PASS.
- `node tools/test_b1_single_glasshook_skulk_smoke.mjs`: PASS.

Proof artifacts:

- `/mnt/nxt-dev/water9/runs/water9-b1-single-glasshook-skulk-2026-07-08/b1-glasshook-canvas.png`
- `/mnt/nxt-dev/water9/runs/water9-b1-single-glasshook-skulk-2026-07-08/b1-glasshook-canvas-grayscale.png`
- `/mnt/nxt-dev/water9/runs/water9-b1-single-glasshook-skulk-2026-07-08/b1-single-glasshook-skulk-smoke.json`

Visual inspection: color and grayscale canvas captures show normal play HUD/canvas with the B1 Glasshook visible beside the diver in the lower B1 environment.

## Git status / commit safety

- No commit made.
- Repo was already heavily dirty before this task, including `src/scene-articulated.ts`, `src/scene-worldgen.ts`, `package.json`, many `src/*`, generated assets, and run artifacts.
- Because files touched by this task already contained unrelated dirty work, committing would require careful explicit-path staging and diff splitting. I left changes unstaged.

## Caveats

- The B1 reservation reports `role: side_tunnel_ambush` to reuse the existing Glasshook reservation/spawn behavior. Its source is `biome1_lower_water_pocket` unless the deterministic fallback is used.
- The proof smoke uses Playwright/playtest control to enter normal runtime, teleport near the naturally spawned B1 Glasshook, focus the camera, and capture the live `#game canvas`.
