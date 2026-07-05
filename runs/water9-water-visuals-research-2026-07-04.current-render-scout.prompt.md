# Water9 Water Visuals Current Render Scout

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are a read-only repo scout. Do not edit Water9 source code and do not commit. You may write only this report:
`/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/current-render-scout.md`

Goal:
Inspect the current Water9 water/background rendering stack and explain where a water-visual improvement slice should attach.

Scope:
- Read `/mnt/nxt-dev/water9/src/helpers.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/scene-playtest.ts`, relevant asset manifests under `public/assets/generated/background-phase3/`, and relevant tools.
- Identify existing systems for environment visual profiles, depth bands, background layers, world-space noise, caustics, particles, overlays, parallax, lighting/darkness, and proof capture.
- Do not get distracted by distant landmark acceptance except where it shares the rendering path.

Report format:
- Status: OK, BLOCKED, or MOUNT_DOWN.
- Current pipeline summary with file/function references.
- Existing knobs that can be tuned safely.
- Gaps that make the water feel visually weak.
- Suggested first implementation slice, with likely files and risk.
- Suggested proof captures and build/smoke commands.
