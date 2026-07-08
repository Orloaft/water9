# Water9 Flora Style Guide Audit - 2026-07-06

Goal: analyze current scannable flora versus the later decorative non-scannable flora, identify which decorative assets visually fit the game better, and turn those findings into a style guide for replacing the older static scannable flora.

Current repo preflight: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` returned `03b2dad`.

Dirty-state note: the repo already has intentional uncommitted scan-reward implementation/report changes from the prior approved pass. This audit is read-only against source; worker outputs should be limited to `runs/water9-flora-style-guide-audit-2026-07-06/` and prompt/ledger files.

Acceptance rule:
- Identify all active scannable flora and their runtime asset keys.
- Identify decorative/non-scannable flora assets and the code paths that place them.
- Produce live normal-play `#game canvas` captures, not review-harness-only proof.
- Cover representative depth bands: surface/B1, mid/B2, deep/B3, abyss/B4, with adjacent captures where flora style shifts at biome cutoffs.
- Include grayscale readability variants for visual claims.
- Compare scannable and decorative flora side by side and name the concrete style traits to preserve.
- End with a concise style guide and a ready implementation prompt for the first replacement slice.

Checklist:
- [x] Inventory scannable and decorative flora - session `flora-inventory`, run `ee5132cd-1f14-427e-837d-acc34617f0bf`, child `agent:mgr-water9:subagent:ed5728a0-faa1-43b8-8ca8-c29b5d9dd774` - expected artifact `runs/water9-flora-style-guide-audit-2026-07-06/inventory.md` - REPORTED 2026-07-06
- [x] Asset/style appraisal of generated flora families - session `flora-style-appraisal`, run `48bbea64-e37d-4b3f-8772-51d89e2455ab`, child `agent:mgr-water9:subagent:5d2c5e6d-4c63-4eab-9f03-603df6666f54` - expected artifact `runs/water9-flora-style-guide-audit-2026-07-06/style-appraisal.md` - REPORTED 2026-07-06
- [x] Runtime canvas proof and visual comparison - session `flora-runtime-proof`, run `d0739ec8-030d-47b5-8c40-3737f7c4ce29`, child `agent:mgr-water9:subagent:843a1072-06c5-4098-8293-ce7be47a4f1e` - expected artifact `runs/water9-flora-style-guide-audit-2026-07-06/runtime-proof.md` - REPORTED 2026-07-06
- [x] Manager synthesis after artifacts land - expected artifact `runs/water9-flora-style-guide-audit-2026-07-06/manager-synthesis.md` - REPORTED 2026-07-06

Outstanding sessions:
- none
