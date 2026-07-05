Status: IN_PROGRESS

Session:
- `agent:codex-dev:mgr-water9-distant-landmark-asset-runtime-restore`
- Preflight: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `7776913`

Implementation before capture:
- Added deterministic rebuild script `tools/build_distant_landmark_runtime_restore_assets.py`.
- Rebuilt `water9-biome-landmark-brine-shelf-gpt.png` from `tools/source-inbox/water9-biome2-brine-shelf-gpt-source.png` using source crop `[80, 420, 1600, 852]` to keep the wide lower sulfide shelf and crop out the upper chimney field.
- Rebuilt `water9-biome-landmark-midnight-black-coral-ribs.png` and `water9-biome-landmark-ruins-vault-causeway-lattice.png` from Phase 11 source images with hard magenta matte removal, transparent RGB decontamination, and feathered texture edges.
- Updated `background-phase3.manifest.json` for B2/B3/B4 source paths, source crops, sizes, alpha stats, notes, and removed the failed `trimCrop` windows.
- Updated B2 normal-biome landmark framing in `src/helpers.ts` so the shelf renders as a wide background anchor instead of being squeezed into a near-square/vertical read.

Verification:
- `npm run build`: pending.
- Normal gameplay `#game canvas` proof: pending.
- Proof directory: `runs/water9-distant-landmark-known-fix-2026-07-04/asset-runtime-restore-proof/`

Caveats before capture:
- Worker visual inspection of rebuilt B3/B4 PNGs shows the rectangular source bounds are removed at the asset level.
- Fine cable/edge fringe remains in the source art, but the broad rectangular matte failure is not present in the rebuilt PNGs.
