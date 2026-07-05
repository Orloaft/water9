# Water9 Water Visuals Research - 2026-07-04

Goal: fan out read-only research lanes and synthesize a proposal for better Water9 water texture / holistic underwater effects.

Repo preflight required for every worker:
"Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else."

Context:
- Alex's current concern is broader than distant landmarks: the overall water/background presentation does not feel visually appealing enough.
- This pass is proposal-only. Do not implement, generate new art, commit, or modify game source.
- Repo pin: `/mnt/nxt-dev/water9`.

Checklist:
- [x] External 2D underwater reference scout — native Codex agent Pascal `019f2f22-baec-7fd3-b8d9-55f91cee2617` — expected artifact `runs/water9-water-visuals-research-2026-07-04/reference-scout.md`
- [x] Water9 render/current-state scout — native Codex agent Cicero `019f2f22-c760-75f0-93f7-2daa93857b8c` — expected artifact `runs/water9-water-visuals-research-2026-07-04/current-render-scout.md`
- [x] Effects feasibility scout — native Codex agent Peirce `019f2f22-d3b3-7e63-b79f-e9b8bebf6da1` — expected artifact `runs/water9-water-visuals-research-2026-07-04/effects-feasibility-scout.md`
- [x] Acceptance/proof plan scout — native Codex agent Gibbs `019f2f22-e00b-7501-ad46-bb3c2dd271a6` — expected artifact `runs/water9-water-visuals-research-2026-07-04/acceptance-plan-scout.md`
- [x] Manager synthesis — expected artifact `runs/water9-water-visuals-research-2026-07-04/proposal.md`

Acceptance rule:
Proposal must recommend a small first implementation slice and a broader art direction, with specific Water9 files/systems likely involved, runtime proof requirements, and visual failure modes. It must be based on external reference patterns plus current repo constraints, not generic "make water prettier" advice.

Progress log:
- 2026-07-04 17:54 manager: Alex requested a gaggle of agents to research 2D underwater games and propose better water texture / holistic effects.
- 2026-07-04 17:58 manager: spawned four native Codex read-only scouts.
- 2026-07-04 18:03 manager: Peirce completed feasibility scout; top picks are drifting particulate layers and lamp-volume scattering.
- 2026-07-04 18:04 manager: Gibbs completed acceptance/proof plan scout.
- 2026-07-04 18:10 manager: Cicero completed current-render scout; key finding is atmospheric assets/profiles exist but the water-column path is mostly inert (`worldSpaceNoise` alpha 0, unused `parallaxBackdrop`, haze/sediment/caustics mainly metadata).
- 2026-07-04 18:13 manager: Pascal completed external reference scout; top directions are depth-band water/color bible with parallax, silhouette-led habitat landmarks, and subtle runtime atmosphere stack.
- 2026-07-04 18:15 manager: synthesized proposal at `runs/water9-water-visuals-research-2026-07-04/proposal.md`. Recommendation: implement live water-column atmosphere v1 using existing texture masks/depth metadata before adding new art.
