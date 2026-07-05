# Water9 Water Effects Feasibility Scout

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are a read-only feasibility scout. Do not edit Water9 source code and do not commit. You may write only this report:
`/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/effects-feasibility-scout.md`

Goal:
Propose Water9-feasible water texture/effect techniques that fit Phaser/Vite/TypeScript and the existing runtime.

Scope:
- Evaluate options like animated caustic overlay, surface shimmer gradient, drifting particulate layers, depth fog bands, refractive/wavy distortion, noise texture overlays, parallax sediment clouds, foreground micro-bubbles, and lamp-volume scattering.
- For each option, estimate implementation complexity, performance risk, and likely visual payoff.
- Prefer techniques that can be proven with normal gameplay `#game canvas` captures and grayscale readability.

Report format:
- Status: OK, BLOCKED, or MOUNT_DOWN.
- Ranked table/list of candidate effects.
- Recommended first two effects to prototype and why.
- Risk notes: mobile/browser performance, readability, conflict with HUD/terrain/ore/landmarks.
- Likely files touched and proof plan.
