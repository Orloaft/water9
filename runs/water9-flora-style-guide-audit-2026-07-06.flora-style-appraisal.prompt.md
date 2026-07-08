# Worker Prompt: Flora Asset/Style Appraisal

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are the read-only asset/style appraisal lane for Water9, repo `/mnt/nxt-dev/water9`. Current known HEAD from manager preflight is `03b2dad`.

Goal: compare the visual qualities of current scannable flora assets against decorative non-scannable flora assets and distill a concrete style guide for future replacement assets.

Context:
- Older scannable flora may be good static images but not good in gameplay.
- Decorative non-scannable flora seems to fit the game much better.
- We need a style guide before creating new replacement assets.
- The repo starts dirty from a prior approved scan-reward implementation; do not edit source and do not stage/commit.

Scope:
- Read assets and generate review artifacts only.
- Do not alter source code, manifests, or assets.
- You may create/update only files under `runs/water9-flora-style-guide-audit-2026-07-06/`.

Tasks:
1. Inventory image dimensions and basic visual traits for active scannable flora assets (`env-flora-*`, `flora-*`, oxygen/biolume flora).
2. Inventory dimensions and visual traits for decorative flora candidates (`terrain-edge-flora-*`, `terrain-stamp-plant-*`, `terrain-brush-flora-*`).
3. Build one or more contact sheets comparing scannable versus decorative families at gameplay-like scale.
4. Build grayscale variants/contact sheets for readability comparison.
5. Identify concrete visual traits that make decorative flora fit better: silhouette attachment to terrain, smaller/no isolated object framing, color/value integration, scale, texture density, shape language, edge lighting, negative space, etc.
6. Identify traits to avoid in replacement scannables: sticker-like isolated specimens, oversized single-object sprites, flat catalog-card composition, mismatched shadows/lighting, static front-on forms, excessive detail that collapses at gameplay scale.
7. Produce a proposed style guide: canvas target size ranges, silhouette rules, palette/value rules, terrain anchoring rules, scan readability rules, and prompt language for generated assets.

Suggested artifact names:
- `runs/water9-flora-style-guide-audit-2026-07-06/style-appraisal.md`
- `runs/water9-flora-style-guide-audit-2026-07-06/flora-asset-comparison.png`
- `runs/water9-flora-style-guide-audit-2026-07-06/flora-asset-comparison-grayscale.png`

Verification:
- Report generated artifact paths.
- Report `git status --short` and confirm only run artifacts were created/modified.

Return block:
- Status
- Report path
- Contact sheet paths
- Style guide bullets
- Caveats/blockers

