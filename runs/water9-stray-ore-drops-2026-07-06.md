# Water9 Stray Ore Drops - 2026-07-06

## Goal

Fix the bug where drilling ordinary destructible terrain can spawn collectible ore pickups. Ore pickups should spawn only when an actual ore/artifact tile node is mined.

## Context

- Repo: `/mnt/nxt-dev/water9`
- Manager preflight HEAD: `a70c88c`
- User symptom: after ore-cluster drillability work, drilling through regular destructible wall terrain sometimes spawns multiple different floating ores that can be picked up later.
- Suspected area from manager read: `src/scene-combat.ts`, especially `mineAt`, `breakTile`, `spawnLoose`, and `releaseOpenedOreTiles`.
- Current code calls `releaseOpenedOreTiles(this, impact)` after every tunnel carve; that scans a 7x7 area for opened ore tiles and may release nearby hidden ore even when the actual mining target was plain stone/sand.
- Existing dirty state before dispatch includes fauna art assets, `src/content.ts`, and an unstaged `src/helpers.ts` spritesheet-loader hunk. Worker must classify and preserve unrelated dirt.

## Checklist

- [x] Reproduce and fix stray ore drops — session key: `agent:mgr-water9:subagent:2b776881-84a4-4cd2-9b70-e94068f29838`, run id: `becf90be-fa84-4547-a02f-6657e63d93fb`, label: `water9-stray-ore-drops-v1` — expected artifacts: `runs/water9-stray-ore-drops-2026-07-06/report.md`, focused regression test/smoke, committed fix — VERIFIED at `539c6b8`; REPORTED 2026-07-06

## Acceptance Rule

Accept only after disk verification shows:

- Root cause is identified in the report, with before/after evidence.
- Drilling plain `stone`/`sand` terrain with nearby or hidden ore produces zero collectible ore/artifact loose items.
- Mining an actual visible/targeted ore node produces exactly one collectible ore/artifact pickup for that mined node.
- The fix does not remove harmless rubble/chip VFX unless they were incorrectly collectible ore.
- Focused regression test/smoke passes, plus `npx tsc --noEmit --pretty false` and `npm run build`.
- No dev server remains listening on ports `5180-5199`.
