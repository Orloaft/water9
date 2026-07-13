You are producing the next art-directed stage for Water9's diver replacement.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9`
Expected starting HEAD: `72f2bae` (report drift if different; do not reset).
Selected source concept: `/mnt/nxt-dev/water9/runs/diver-v3-gold-master-concepts-2026-07-11/artifacts/concepts/concept-a.png`
Prior concept report and lineage live beside it. The user explicitly selected A. Concepts B and C are not blend targets.

Goal: turn Concept A into a tightly registered, production-ready character bible before any animation frames are made. This is an art/asset evidence stage only. Do not change game source, runtime assets, package configuration, or existing concept files. Do not integrate anything into gameplay. Write only under `runs/diver-v3-a-character-bible-2026-07-11/` and preserve all unrelated dirty state.

Create the report stub at `runs/diver-v3-a-character-bible-2026-07-11/report.md` immediately, before long generation or review loops.

Required work:

1. Inspect Concept A at full resolution, its lineage, the diver audit, the rejected v2 report/images, and representative accepted live Water9 gameplay captures. State exactly which visual identity traits are immutable.
2. Produce a refined high-resolution canonical neutral side-view master derived from A. Preserve A's silhouette and identity; clean only contradictions that would make animation registration impossible. Do not mechanically redraw it from primitives and do not substitute procedural/vector placeholder art.
3. Produce a coherent orthographic/turnaround registration set sufficient for animation production. At minimum show clean left/right side registration plus front and back construction views. If generation cannot honestly maintain continuity in a view, flag it and iterate; do not hide errors behind labels or diagram overlays.
4. Write `artifacts/bible/character-bible.md` specifying proportions, silhouette landmarks, helmet/faceplate, backpack mass, suit materials and wear, palette hierarchy, fixed light direction, limb volume, glove/fins, ground/body pivot, hand anchors, scanner/sampler/sonar/mining tool sockets, mirroring rules, and forbidden drift.
5. Produce Telegram-readable review boards:
   - `artifacts/review/character-bible-board.png`
   - `artifacts/review/orthographic-registration.png`
   - `artifacts/review/gameplay-scale-and-grayscale.png`
   The last board must show the canonical side master reduced to representative in-game sizes including roughly 43 px height, at native and enlarged nearest-neighbor scale, plus grayscale. Avoid checkerboard or labels obscuring silhouettes.
6. Record exact generation lineage: source inputs, prompts, model/tool/settings if available, every generated output retained or rejected, and any manual cleanup. Create a SHA-256 manifest covering all final artifacts.
7. Visually inspect the results yourself. Specifically look for identity drift from A, inconsistent helmet/backpack/limb volumes across views, disconnected hands/tool sockets, generic sci-fi styling, procedural assembly, painterly noise at gameplay scale, and grayscale silhouette collapse. Iterate on failures rather than declaring them acceptable.

Use image generation/editing tools where needed; do not fake authored bitmap assets with programmatic drawing. Scripts may assemble review boards or calculate hashes, but they must not synthesize the diver art.

Do not create animation frames yet. This stage ends at a reviewable bible/registration gate for Alex.

No commit is requested. Do not stage or commit anything.

Return:
- status
- report path
- exact final artifact paths
- generation/edit lineage summary
- validation and visual-review results
- git status summary confirming no game/runtime files changed
- caveats/blockers, especially any view that could not retain Concept A consistently
