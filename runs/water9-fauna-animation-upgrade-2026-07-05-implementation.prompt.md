You are the commit-capable implementation owner for Water9's new-fauna animation upgrade. You are the only writer lane for this repo in this pass; assume read-only lanes may run concurrently and do not revert or overwrite unrelated work.

Before any work, run
  `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
  report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
  else.

Repo pin: `/mnt/nxt-dev/water9`. Work only in this repo.

Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Do not commit unless the manager explicitly asks in a later turn. Leave a precise changed-file list and verification report.

Goal: upgrade the 100 `fauna-exp-*` normal-gameplay fauna from three-frame static-source warps into benchmark-level runtime animation loops. The established bar is Nautilus and squid/cuttlefish: visible whole-body/silhouette motion, believable appendage/fin/tentacle motion, and no locked-painting read at gameplay scale.

Assigned write scope:
- `tools/build_exploration_fauna_runtime_assets.py`
- `public/assets/generated/fauna-exp-*.png`
- `public/assets/generated/fauna-exp-*-0.png`
- `public/assets/generated/fauna-exp-*-1.png`
- `public/assets/generated/fauna-exp-*-2.png`
- `public/assets/generated/fauna-exp-*-3.png` or additional generated frame files if justified
- `public/assets/generated/fauna-exp-*.frames.json`
- `public/assets/generated/small-life.manifest.json` only if regenerated frame metadata requires it
- project-bound imagegen source/alpha files under a dated `public/assets/generated/exploration-life-2026-07-05/` subdirectory if fresh source art is needed
- proof/report artifacts under `runs/water9-fauna-animation-upgrade-2026-07-05/`

Avoid touching `src/content.ts`, `src/helpers.ts`, and the tracked `fauna-abyss-viperfish*` files unless you find that the existing builder would otherwise overwrite them; if so, refactor the builder to support a new-fauna-only rebuild and document the decision. Preserve unrelated dirty files.

Read first:
- `runs/water9-fauna-animation-appraisal-2026-07-05/inventory-runtime-report.md`
- `runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-report.md`
- `runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-metrics.json`
- `tools/build_exploration_fauna_runtime_assets.py`
- `public/assets/generated/exploration-life-2026-07-04/manifest.json`
- benchmark frame manifests/images for `fauna-shallow-nautilus`, `fauna-shallow-squid`, `fauna-deep-glass-squid`, `fauna-abyss-bigfin-squid`, and `fauna-abyss-vampire-squid`

Implementation requirements:
- Create an early report stub at `runs/water9-fauna-animation-upgrade-2026-07-05/implementation-report.md` before long generation/proof loops.
- Upgrade the builder so the new `fauna-exp-*` set gets morphotype-specific, benchmark-level loops, preferably 4 frames at 8 fps. Any exception must be justified in the report.
- Improve the motion, not just frame count. Required reads:
  - Fish: head/body counter-motion, tail beat, fin/body silhouette changes, no body-locked tail-only twitch.
  - Eel/ribbon/needle: whole-spine wave with head/tail phase offset and readable lateral curve.
  - Cuttle/squid: mantle breathing plus arm/tentacle fan/sweep; compare to squid/cuttle benchmarks.
  - Nautilus/shell/clam: shell may remain coherent, but living body/tentacles/opening must visibly animate.
  - Jelly: bell pulse/squash plus tentacle drag; not just tentacle jitter.
  - Crustacean: abdomen/body sway plus leg/claw/antenna cadence.
  - Seahorse/garden eel: vertical curl and dorsal/fin shimmer; avoid locked torso.
  - Flat/ray/flounder: wing/body undulation, not a simple translation.
- Prioritize the named failures from the audit: `fauna-exp-nacre-thorn-clam`, `fauna-exp-saffron-paddle-cuttle`, `fauna-exp-prism-bell-jelly`, `fauna-exp-snowcap-snailfish`, `fauna-exp-lumen-brow-barreleye`, `fauna-exp-glass-helm-nautilus`, `fauna-exp-ashveil-butterflyfish`, `fauna-exp-rustjaw-blenny`, `fauna-exp-pearl-eye-flounder`, `fauna-exp-aurora-fin-damselfish`, `fauna-exp-cinder-vent-clingfish`, and `fauna-exp-moonspot-drumfish`.
- Use the imagegen workflow only where existing source art is too locked for a credible loop. Use built-in image generation by default; ask no one to provide API keys. Generate on a flat chroma-key background, remove chroma locally, save the chosen project-bound source/alpha into the workspace, and never leave a runtime asset referenced only from `$CODEX_HOME/generated_images`.
- If the imagegen tool is unavailable in your session, do not fake it. Continue with local frame construction where credible, write the exact prompts and save plan for needed regenerations in the report, and mark those entries as still blocked on generation.

Validation/proof requirements:
- Rebuild the new-fauna runtime sheets/manifests.
- Regenerate `small-life.manifest.json` if frame counts/rates are part of that manifest.
- Run `npm run small-life:validate`.
- Run `npx tsc --noEmit --pretty false`.
- Run `npm run build`.
- Produce static proof sheets under `runs/water9-fauna-animation-upgrade-2026-07-05/proof/`:
  - before/after or after-vs-benchmark frame contact sheets for the named worst failures
  - representative morphotype sheets covering all 100 new entries
  - grayscale readability equivalents
  - a metrics JSON comparable to the prior `frame-quality-metrics.json`
- Produce live normal-play `#game canvas` proof under `runs/water9-fauna-animation-upgrade-2026-07-05/live-canvas/` across representative depth bands including surface, mid, deep, and straddling biome cutoffs. Use a dev server only in ports 5180-5199; if a port is busy, pick another in range and do not kill processes outside it. The screenshots must be actual gameplay canvas captures, not a review-only harness, and must prove generated assets are loaded by the live runtime.

Return block:
- Status
- Changed files
- Verification commands and outputs
- Proof paths
- Which entries were fully upgraded, which remain blocked on source/imagegen, and why
- Caveats/blockers

Do not report visual acceptance yourself. The manager will inspect the proof and decide accept/reject.
