# Water9 Fauna Animation Upgrade - 2026-07-05

## Goal

Bring the 100 newly added `fauna-exp-*` runtime fauna up to the established neutral-fauna animation bar set by Nautilus, cuttlefish, and squid: no more static-painting/tail-twitch reads, and proof that the improved frames load through normal gameplay.

## Source Evidence

- Prior appraisal directory: `runs/water9-fauna-animation-appraisal-2026-07-05/`
- Runtime inventory: `runs/water9-fauna-animation-appraisal-2026-07-05/inventory-runtime-report.md`
- Static frame audit: `runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-report.md`
- Live canvas lane stub/proof directory: `runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-captures/`
- Articulated audit: `runs/water9-fauna-animation-appraisal-2026-07-05/articulated-motion-report.md`

## Checklist

- [x] Read-only triage and imagegen plan - session key `water9-fauna-upgrade-triage`, agent `Hume` / `019f341a-4695-75f0-8130-35c9c2b4acb8` - expected artifacts: `runs/water9-fauna-animation-upgrade-2026-07-05/triage-imagegen-plan.md`, `runs/water9-fauna-animation-upgrade-2026-07-05/triage-queue.json` - verified artifacts on disk; REPORTED 2026-07-05
- [x] Commit-capable implementation owner - session key `water9-fauna-upgrade-implementation`, agent `Gauss` / `019f341a-d0b2-78a3-939d-a4c6f2937f6c` - expected artifacts: upgraded `public/assets/generated/fauna-exp-*` runtime sheets/manifests, `runs/water9-fauna-animation-upgrade-2026-07-05/implementation-report.md`, static proof sheets, grayscale proof, live normal-play `#game canvas` captures - verified artifacts on disk; REPORTED 2026-07-05
- [x] Manager visual inspection - expected artifacts: inspected static and live proof, explicit accept/reject notes in this ledger - ACCEPTED 2026-07-05
- [ ] Follow-up iteration if rejected - session key TBD - expected artifacts: rejection-specific fix and proof

## Acceptance Rule

Manager acceptance requires all of the following:

1. The 100 `fauna-exp-*` entries are still normal-gameplay runtime assets with manifests and packed PNGs at `public/assets/generated/`.
2. Weak morphotypes named in the audit (`Nacre Thorn Clam`, `Saffron Paddle Cuttle`, `Prism Bell Jelly`, `Snowcap Snailfish`, `Lumen Brow Barreleye`, `Glass Helm Nautilus`, plus similar fish-body twitch entries) no longer read as locked static paintings.
3. Newly generated or rebuilt fauna use a benchmark-level loop, preferably 4 frames at 8 fps unless a justified morphotype-specific exception is documented.
4. Proof includes side-by-side static frame sheets against Nautilus/squid/cuttlefish benchmarks, a grayscale readability pass, and actual normal-play `#game canvas` captures across representative depth bands including surface, mid, deep, and around biome cutoffs.
5. Generated/bitmap art, if any, is saved in the workspace and proven loaded by the live runtime. No project-referenced asset may remain only under `$CODEX_HOME/generated_images`.
6. Metrics and worker self-verdicts are supporting evidence only. Final acceptance requires manager visual inspection of the proof images.

## Dispatch Notes

- Repo HEAD at manager preflight: `d7aed9a`
- Existing dirty state is dominated by prior generated fauna/source files. Workers must classify dirt, preserve unrelated edits, and stage by explicit path only if staging is needed.

## Manager Notes

- 2026-07-05: Triage lane verified. It queued 20 fresh-source/imagegen candidates and 80 local frame rebuilds, with the top failures led by `fauna-exp-nacre-thorn-clam`, `fauna-exp-saffron-paddle-cuttle`, `fauna-exp-prism-bell-jelly`, `fauna-exp-snowcap-snailfish`, `fauna-exp-lumen-brow-barreleye`, and `fauna-exp-glass-helm-nautilus`.
- 2026-07-05: Static proof from the implementation lane is present and visually promising: named-failure color and grayscale contact sheets no longer read as locked single-painting frames. Acceptance remains pending because the implementation report is still a stub and no normal-play `#game canvas` captures are present in the run directory yet.
- 2026-07-05: Implementation lane verified. `implementation-report.md`, `changed-files-implementation.txt`, static/grayscale proof, live canvas contact sheets, and 96 normal-play `#game canvas` captures are present. Checked all 100 `fauna-exp-*` frame manifests: 4 frames, swim frameRate 8, no exceptions. Visual inspection accepts the upgrade: named failures now show morphotype-specific silhouette/appendage motion comparable to Nautilus/squid/cuttle benchmarks, grayscale still reads, and live proof covers B1/B2/B3/B4 depth routes with 0 runtime errors. Caveat: live visible sample only catches 7 unique experimental asset keys, but browser resource proof shows generated fauna-exp assets loaded by the runtime in each route.
