# Small Gulper Readability / Facing Fix

Session: `small-gulper-readability-facing-fix`
Initial HEAD: `971e654`
Repo: `/mnt/nxt-dev/water9`

## Preflight

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`: `971e654`
- `pwd`: `/mnt/nxt-dev/water9`
- `git rev-parse --show-toplevel`: `/mnt/nxt-dev/water9`

## Initial Dirty Worktree

Captured before this task started. Existing modified files included `package.json`,
multiple `src/*` files, goblin shark generated assets, tools, and several run
artifacts. None of the expected suspect files had been edited yet at preflight:
`src/content.ts` was clean, and the `fauna-exp-cobalt-gulper-fry` generated asset
files were clean/untracked absent at that point.

## Identification

The runtime target is `fauna-exp-cobalt-gulper-fry`, species `Cobalt Gulper Fry`.

Evidence:

- `src/content.ts` defines `Cobalt Gulper Fry` as hostile, `pattern: 'stalk'`,
  `radius: 10`, and `assetKey: 'fauna-exp-cobalt-gulper-fry'`.
- Runtime proof in `before-cobalt-gulper-runtime.json` captured the same asset in
  normal gameplay with `species: "Cobalt Gulper Fry"`, `behaviorClass:
  "legacySwimmer"`, `hostile: true`, `pattern: "stalk"`, scaled `radius: 7.2`,
  `aggro: 2`, and chase velocity.
- In the biome-4 capture, the other named gulper/eel suspects `fauna-exp-starless-lantern-eel`,
  `fauna-exp-knifecrest-snipe-eel`, and `fauna-deep-gulper-eel` had runtime count
  `0`; `fauna-exp-anchorfin-eel` was present but is a larger radius-12 eel and not
  the small gulper-like species Alex described.

## Root Cause

The runtime flip logic is correct for a right-facing canonical sprite: positive
chase velocity renders the source unflipped, and negative chase velocity flips it
left. The bad read came from the `Cobalt Gulper Fry` pixels themselves at runtime
scale. The front third of the source was low-contrast gray/brown against deep
water, while the cobalt dorsal/tail line stayed brighter, so the tail/back half
could read as the leading end during a chase.

## Fix

No image generation was used. I repaired only the current local sprite pixels for
`fauna-exp-cobalt-gulper-fry`:

- lifted cobalt body contrast,
- added a small bright eye/front cue,
- added an ivory jaw arc at the right-facing source front,
- added a restrained cool rim around the head/body,
- dimmed the far tail so it no longer out-signals the mouth/head after downscale.

The canonical source orientation remains right-facing; Phaser's existing flip
logic now makes the repaired head face the player/travel direction in chase.

## Changed Files

- `public/assets/generated/fauna-exp-cobalt-gulper-fry.png`
- `public/assets/generated/fauna-exp-cobalt-gulper-fry-0.png`
- `public/assets/generated/fauna-exp-cobalt-gulper-fry-1.png`
- `public/assets/generated/fauna-exp-cobalt-gulper-fry-2.png`
- `public/assets/generated/fauna-exp-cobalt-gulper-fry-3.png`
- `runs/water9-small-gulper-readability-facing-fix-2026-07-07/`

`src/content.ts` stayed unchanged.

## Proof Artifacts

- Before canvas: `before-cobalt-gulper-game-canvas.png`
- Before grayscale: `before-cobalt-gulper-game-canvas-grayscale.png`
- After canvas: `after-cobalt-gulper-game-canvas.png`
- After grayscale: `after-cobalt-gulper-game-canvas-grayscale.png`
- Runtime JSON before/after: `before-cobalt-gulper-runtime.json`,
  `after-cobalt-gulper-runtime.json`
- Source contact sheet: `cobalt-gulper-before-after-contact.png`
- Runtime crop support sheet: `runtime-before-after-crop-contact.png`
- Capture script: `capture-small-gulper-proof.mjs`

## Verification

- `node runs/water9-small-gulper-readability-facing-fix-2026-07-07/capture-small-gulper-proof.mjs --before --index=1 --distance=112 --settle-ms=120 --polls=2`: passed and wrote before proof.
- `node runs/water9-small-gulper-readability-facing-fix-2026-07-07/capture-small-gulper-proof.mjs --after --index=1 --distance=112 --settle-ms=120 --polls=2`: passed and wrote after proof.
- `npm run small-enemy:motion-smoke`: passed.
- `npm run build`: passed. Vite emitted the existing unresolved public asset URL
  and large chunk/plugin timing warnings, then completed successfully.

## Dirty Worktree Safety

I staged only the five `fauna-exp-cobalt-gulper-fry` asset files and this run
directory. The many pre-existing modified/untracked files listed in the initial
status were not staged or edited for this task.
