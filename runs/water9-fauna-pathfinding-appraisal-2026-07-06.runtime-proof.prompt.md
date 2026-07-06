# Worker Prompt: Water9 Fauna Pathfinding Runtime Proof

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are a codex-dev worker for Water9 only. Repo pin: `/mnt/nxt-dev/water9`.

Goal: gather runtime evidence for Alex's symptom: neutral fauna sometimes get wedged between rocks and oscillate back and forth. This is an appraisal/proof lane, not an implementation lane.

Context:
- Current manager preflight HEAD is `166b689`.
- Use dev server ports only in `5180-5199`; if one is busy, choose another in range. Do not kill processes outside that range.
- Visual acceptance in Water9 requires actual normal-play `#game canvas` captures, not review-harness-only contact sheets.
- Existing unrelated dirty state is present. Preserve it.

Scope:
- You may create scripts and artifacts only under `runs/water9-fauna-pathfinding-appraisal-2026-07-06/`.
- Do not modify `src/`, `tools/`, content files, assets, or tests.
- Do not commit.
- Do not stage anything.

Runtime task:
- Inspect existing playtest commands first. Reuse them if possible.
- Try to observe neutral legacy-swimmer fauna near terrain/rock boundaries across representative biomes/depths.
- Capture metrics over time for multiple neutral fauna if feasible: position, velocity, facing flips, target/home distance, terrain proximity, and repeated direction reversals with low net displacement.
- Capture actual `#game canvas` screenshots for any reproduced stuck/oscillation case. Include grayscale versions if you make a contact sheet.
- If you cannot reproduce quickly, create a concrete reproduction/instrumentation plan and explain exactly what was missing.

Suggested stuckness metric:
- suspicious if a neutral fish has repeated x/y velocity sign flips or facing flips, remains within a small bounding box for several seconds, stays close to solid terrain, and does not settle into a believable idle pattern.
- Distinguish normal school/sway pattern reversal from terrain-caused wall-bounce oscillation.

Return artifact:
- Write `runs/water9-fauna-pathfinding-appraisal-2026-07-06/runtime-proof.md`.
- Write any JSON metrics/screenshots under the same run directory.
- Include: HEAD, port used if any, commands run, whether reproduced, evidence paths, observed species/biome/depth, and recommended proof harness for the implementation worker.

Return block in final message:
- status
- report path and evidence paths
- reproduction result
- caveats/blockers
