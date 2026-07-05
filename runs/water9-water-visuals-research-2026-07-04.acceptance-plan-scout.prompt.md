# Water9 Water Visuals Acceptance Plan Scout

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are a read-only acceptance scout. Do not edit Water9 source code and do not commit. You may write only this report:
`/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/acceptance-plan-scout.md`

Goal:
Design a visual acceptance loop for a water/background improvement pass so we do not repeat the distant-landmark failure pattern.

Scope:
- Inspect current proof/capture tooling and previous visual proof directories under `/mnt/nxt-dev/water9/runs/`.
- Define representative capture bands and failure modes for water texture/effects.
- Include normal gameplay `#game canvas` proof requirements, grayscale pass, and before/after comparisons.
- Keep this proposal-only.

Report format:
- Status: OK, BLOCKED, or MOUNT_DOWN.
- Recommended capture depths/biomes and why.
- Required artifacts for the first prototype.
- Visual failure modes that should trigger rejection.
- Suggested manager acceptance checklist.
