You are a codex-dev worker on Water9. This is a read-only triage/planning lane for improving the new fauna animation frames.

Before any work, run
  `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
  report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
  else.

Repo pin: `/mnt/nxt-dev/water9`. Work only in this repo.

Goal: produce a complete upgrade queue and image-generation plan for the 100 newly added normal-gameplay `fauna-exp-*` runtime fauna, using the prior appraisal evidence. Do not modify source code or runtime assets in this lane. You may write only run artifacts under `runs/water9-fauna-animation-upgrade-2026-07-05/`.

Context to read first:
- `runs/water9-fauna-animation-appraisal-2026-07-05/inventory-runtime-report.md`
- `runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-report.md`
- `runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-metrics.json`
- `runs/water9-fauna-animation-appraisal-2026-07-05/articulated-motion-report.md`
- `tools/build_exploration_fauna_runtime_assets.py`
- `public/assets/generated/exploration-life-2026-07-04/manifest.json`

Deliverables:
1. `runs/water9-fauna-animation-upgrade-2026-07-05/triage-imagegen-plan.md`
2. `runs/water9-fauna-animation-upgrade-2026-07-05/triage-queue.json`

Plan requirements:
- Inventory all 100 `fauna-exp-*` entries and group them by morphotype: ordinary fish, long eel/ribbon/needle, cephalopod/cuttle/squid, nautilus/shell, jelly/pulse, crustacean, seahorse/garden-eel, flat/ray/flounder, and odd/sessile.
- Rank entries by urgency using both metric evidence and visual-risk reasoning. Start with the known failures: `fauna-exp-nacre-thorn-clam`, `fauna-exp-saffron-paddle-cuttle`, `fauna-exp-prism-bell-jelly`, `fauna-exp-snowcap-snailfish`, `fauna-exp-lumen-brow-barreleye`, `fauna-exp-glass-helm-nautilus`, `fauna-exp-ashveil-butterflyfish`, `fauna-exp-rustjaw-blenny`, `fauna-exp-pearl-eye-flounder`, `fauna-exp-aurora-fin-damselfish`, `fauna-exp-cinder-vent-clingfish`, and `fauna-exp-moonspot-drumfish`.
- For each morphotype, specify the required animation read: what should move, what should stay coherent, what constitutes failure, and what benchmark it should be compared against.
- Decide which assets can be improved from the existing alpha source by stronger frame construction, and which likely need fresh source art/imagegen because the source silhouette is too locked.
- For imagegen-needed entries, write production prompts using a flat chroma-key background and a project-bound save plan. Use built-in image generation by default if a later worker generates art. Do not require CLI fallback or `OPENAI_API_KEY`.
- Define the proof matrix for the implementation owner: static contact sheets, grayscale, metric recomputation, live normal-play `#game canvas` captures at representative depth bands, and runtime asset-loading proof.

Return block:
- Status
- Report paths
- Top 10 highest-risk entries
- Which entries need imagegen versus local frame rebuild
- Caveats/blockers

Do not commit. Do not stage. Do not edit source/assets.
