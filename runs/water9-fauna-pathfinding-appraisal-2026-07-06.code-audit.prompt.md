# Worker Prompt: Water9 Fauna Pathfinding Code Audit

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are a codex-dev worker for Water9 only. Repo pin: `/mnt/nxt-dev/water9`.

Goal: perform a read-only code audit of current fauna movement/pathfinding/terrain avoidance, focused on Alex's symptom: neutral fauna sometimes get stuck between rocks and move back and forth.

Context:
- Current manager preflight HEAD is `166b689`.
- Recent first-slice behavior work added `sessileAttached`, `verticalAnchored`, and `benthicWalker` in/around `src/fauna-behavior.ts` and `src/scene-entities.ts`.
- Most active small fauna may still be `legacySwimmer`.
- Existing unrelated dirty state is present in viperfish assets, `src/content.ts`, `src/helpers.ts`, and older run files. Preserve it.

Scope:
- Read code only, except create/update your report at `runs/water9-fauna-pathfinding-appraisal-2026-07-06/code-audit.md`.
- Do not commit.
- Do not modify source files.
- Do not stage anything.

Audit targets:
- `src/scene-entities.ts`: `steerFish`, `keepFishInWater`, new behavior update methods, collision/terrain handling.
- Spawn/home/behavior assignment sites for fish/fauna.
- Terrain mask helpers used for water/solid detection, surface anchors, and validation.
- Playtest/debug command surfaces that could measure fish position, collision, or terrain proximity.
- Tests/tools that already cover fish behavior.

Questions to answer:
1. Which fauna classes can currently get wedged or oscillate near terrain, and why?
2. Is the issue mostly `legacySwimmer` steering, `keepFishInWater`, spawn/home selection, lack of obstacle memory, or something else?
3. Are `benthicWalker` and anchored behaviors exposed to the same failure mode, or a different one?
4. What local APIs already exist for terrain queries, nearest reachable water, anchors, or path validation?
5. What is the smallest plausible implementation slice to improve this without introducing heavy full-map pathfinding?

Return artifact:
- Write `runs/water9-fauna-pathfinding-appraisal-2026-07-06/code-audit.md`.
- Include: HEAD, dirty-state classification, findings ranked by severity, file/line evidence, likely root causes, local APIs to reuse, and a recommended first implementation slice.

Return block in final message:
- status
- report path
- key findings
- caveats/blockers
