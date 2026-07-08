# Worker Prompt: Water9 Blue Ring Octopus Animation V1

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo pin: `/mnt/nxt-dev/water9`

Goal: Improve `fauna-shallow-blue-ring-octopus` so it no longer reads like a static octopus in normal gameplay. Alex specifically wants at least a couple of readable animation frames and wants it closer to the better-looking mollusks.

Context:
- Blue Ring Octopus spawn config is in `src/content.ts` around biome 1: `Blue-ring Octopus`, count 5, minY 980, maxY 1860, hostile, pattern `circle`, radius 14, assetKey `fauna-shallow-blue-ring-octopus`.
- Existing assets are under `public/assets/generated/`:
  - `fauna-shallow-blue-ring-octopus.png`
  - `fauna-shallow-blue-ring-octopus-0.png` through `-3.png`
  - `fauna-shallow-blue-ring-octopus.frames.json`
- The existing manifest already declares 4 frames, so do not assume “add a manifest” is enough. The issue is visual: the runtime read is too static.
- Compare against `fauna-shallow-octopus` and other better mollusk/fauna assets for motion/readability, but do not widen scope to unrelated fauna.
- Current repo is dirty from other Water9 work. Preserve unrelated changes. Do not clean, revert, or broad-stage anything.

Scope:
- Touch only files needed for the Blue Ring Octopus visual animation and focused proof/smoke/report.
- You may update generated Blue Ring Octopus frame assets, the source/regeneration pipeline only if necessary, and a focused smoke/proof script if needed.
- Do not change spawn counts, combat behavior, movement AI, economy, sonar, barge, or unrelated fauna.
- Do not commit.

Visual direction:
- Keep the species identity: compact warm/yellow octopus with vivid cobalt-blue rings.
- Make the animation obvious at small gameplay scale: at least two frames should visibly differ through arm curl/pulse, mantle squash/breathing, slight crawling/swimming posture, or blue-ring shimmer.
- Avoid full-body jitter, scale popping, anchor drift, teleporting arms, a generic blob, loss of rings, unreadable over-detail, or a “flashing sticker” look.
- Keep transparency clean and runtime asset loading real. No procedural stand-ins or review-only proof.

Implementation hints:
- Inspect the current frame sheet and individual frames first; determine why it reads static.
- Prefer the existing asset-generation/editing pattern already used in the repo. If you regenerate assets with Python/Pillow scripts, keep the output deterministic and document it.
- If the source image is too static, it is acceptable to derive stronger per-frame deformations from the current source/frames rather than generating brand-new art, as long as the result reads better in-game.
- Check that `loadGeneratedAssets`, `spriteManifests`, and `scene-rendering` still animate `fauna-shallow-blue-ring-octopus` via the manifest path.

Verification required:
- Run `npm run build`.
- Run or create a focused Playwright/canvas smoke that captures actual normal-play `#game canvas` proof with Blue Ring Octopus visible in biome 1 spawn depths.
- Save proof artifacts under `/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-animation-2026-07-08/`, including:
  - a before/after or frame comparison sheet
  - normal-play live canvas screenshots showing the octopus at gameplay scale
  - a grayscale readability proof
  - any JSON metrics from the smoke
- Inspect the proof yourself and report a clear visual verdict. Do not call it accepted based only on build/smoke PASS.

Staging rule:
"Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage."

Return:
- Status
- Preflight HEAD
- Changed files
- Verification commands/results
- Proof/report folder
- Visual verdict and caveats
- Whether any unrelated dirty files were present and preserved
