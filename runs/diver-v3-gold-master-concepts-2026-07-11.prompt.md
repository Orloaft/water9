You are producing a narrowly scoped visual concept stage for Water9, the underwater diving/mining game.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repository: `/mnt/nxt-dev/water9`
Expected starting HEAD: `72f2bae` (record actual HEAD; do not fail merely because unrelated work has advanced it).

Goal: create three genuinely authored, high-resolution gold-master diver concepts for Alex to choose between. This is a concept-selection gate only. Do not create an animation sheet, integrate anything into runtime, or modify game source.

First inspect and use as references:
- `runs/current-diver-sprite-audit-2026-07-11/report.md` and its live `#game canvas` captures.
- The current diver assets actually referenced by the runtime; verify the live path rather than guessing.
- Representative accepted Water9 surface/mid/deep runtime captures already in the repo, choosing evidence that unmistakably belongs to Water9.
- `runs/diver-v2-asset-production-2026-07-11/report.md` and review sheets as a rejected negative reference. Alex's verdict is that v2 looks like procedural placeholder art. Do not decorate or iterate that construction.

Create `runs/diver-v3-gold-master-concepts-2026-07-11/report.md` immediately as an early stub, then update it throughout.

Art direction shared by all concepts:
- Preserve the recognizable brass pressure-suit premise, cyan faceplate, backpack mass, warm/cool separation, and strong horizontal-swim ancestry of the current diver.
- Match Water9's painterly, corroded, industrial underwater world: purposeful wear, material breakup, asymmetric authored detail, clear mass, and a memorable silhouette.
- The diver must feel compact, heavy, pressure-rated, mechanically plausible, and human-operated—not a generic astronaut, superhero, clean vector mascot, chibi robot, or kitbashed sci-fi marine.
- Show a side-facing neutral/hover pose suitable to become the canonical model sheet. Anatomy, helmet/chest/pack relationships, gloves, boots/fins, and attachment points must read clearly.
- Avoid procedural placeholder signatures: repeated primitive geometry, uniform outlines, flat fills, perfectly repeated rivets, palette-swapped sameness, puppet-like disconnected limbs, synthetic symmetry, and code-drawn pixel art.
- Generate/paint at high resolution first. Do not claim hand-authored pixel art if it is automatic tracing or shape assembly.

The three directions must be meaningfully distinct—not palette variants:
A. Heritage pressure suit: strongest continuity with the existing brass/cyan diver, richly authored and production-practical.
B. Salvager/miner: heavier working-diver mass, field repairs, tool-ready forearms/harness, more asymmetry, still unmistakably the same game.
C. Abyssal explorer: slightly stranger deep-pressure silhouette and protective engineering, while remaining grounded and readable.

Use a real image-generation or painterly asset workflow available to you; do not synthesize the concepts with programmatic drawing, SVG primitives, PIL/canvas shape assembly, or procedural sprite scripts. Curate each result critically. If a generated candidate has broken anatomy, floating equipment, text/watermarks, inconsistent lighting, or generic styling, reject and regenerate rather than presenting it. Manual compositing/cropping and carefully documented paint correction are allowed, but never misrepresent lineage.

Required outputs:
- Three individual lossless PNG concepts at useful review resolution under `runs/diver-v3-gold-master-concepts-2026-07-11/artifacts/concepts/`, named `concept-a.png`, `concept-b.png`, `concept-c.png`.
- One Telegram-ready comparison board at `artifacts/review/gold-master-comparison.png`, labeling A/B/C outside the artwork without covering it.
- A grayscale comparison and gameplay-scale previews approximating the live diver's on-canvas footprint, clearly marked as scale previews rather than runtime proof.
- Generation lineage: exact prompts, model/tool/settings where exposed, source references used, rejected-candidate rationale, and hashes/manifest.
- A report explaining each direction, strengths, risks, and a blunt recommendation. Do not declare final acceptance; Alex selects the direction.

Visual verification:
- Inspect every final image yourself at full size and gameplay-preview size.
- Compare side-by-side against the current live diver and at least one accepted Water9 biome capture.
- Explicitly test for the rejected procedural-placeholder read and state concrete evidence why each submitted concept escapes it.
- Do not fabricate actual runtime captures; runtime integration is out of scope.

Repo safety:
- Preserve all pre-existing dirty state. Write only within `runs/diver-v3-gold-master-concepts-2026-07-11/`.
- Do not alter or delete rejected v2 assets; they remain audit evidence.
- Do not commit.

Return:
- Status: COMPLETE, PARTIAL, or BLOCKED.
- Actual HEAD.
- Report path and exact image paths.
- Image-generation lineage and verification performed.
- Rejected-candidate count and why they were rejected.
- Caveats/blockers and recommendation for Alex's selection gate.
