# Worker Prompt: Water9 Fauna Pathfinding Proposal

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are a codex-dev worker for Water9 only. Repo pin: `/mnt/nxt-dev/water9`.

Goal: produce a design proposal for improving fauna pathfinding/terrain avoidance so neutral fauna do not look stuck between rocks and do not jitter back and forth.

Context:
- Current manager preflight HEAD is `166b689`.
- Recent first-slice behavior classes exist: `sessileAttached`, `verticalAnchored`, `benthicWalker`.
- Most swimming fauna likely still use legacy swimmer steering.
- Alex wants an appraisal/proposal before implementation.
- Existing unrelated dirty state is present. Preserve it.

Scope:
- Read-only except create/update `runs/water9-fauna-pathfinding-appraisal-2026-07-06/proposal.md`.
- Do not modify source files.
- Do not commit.
- Do not stage anything.

Proposal requirements:
- Ground recommendations in current Water9 code, not generic game-AI advice.
- Favor a small, testable first slice over full A* or global navmesh unless local evidence proves that is necessary.
- Consider these candidate approaches and accept/reject them with reasons:
  - spawn/home validation so neutral swimmers start with reachable clear-water corridors
  - short horizon terrain feelers/raycast-style avoidance around the current target vector
  - stuck detector with target reseeding and cooldown
  - local waypoint sampling around obstacle edges
  - per-behavior movement envelopes for schools, gliders, stalkers, and benthic fauna
  - full grid pathfinding/navmesh
- Include verification: TypeScript/build, focused metric smoke, and normal-play `#game canvas` proof in multiple biomes/depths.

Return artifact:
- Write `runs/water9-fauna-pathfinding-appraisal-2026-07-06/proposal.md`.
- Include: recommendation first, alternatives rejected, first implementation slice, risks, exact verification plan, and a ready-to-dispatch implementation prompt.

Return block in final message:
- status
- report path
- recommendation
- caveats/blockers
