# Water9 Distant Landmark Known Fix Manager Report

Status: NOT_ACCEPTED

What happened:
- Dispatched `agent:codex-dev:mgr-water9-distant-landmark-known-fix`; cancelled after wrapper/task inconsistency, but partial proof landed.
- Dispatched recovery and mechanic/micro correction lanes; cancelled stalled or visually failed lanes before commit.
- Manager applied two tiny local experiments after worker stalls:
  - B2 terrain visibility + B3/B4 additive bitmap compositing.
  - B2 manifest pointer swap from `water9-biome-landmark-brine-shelf-gpt.png` to `water9-biome-landmark-brine-vent-sulfide-shelf.png`.

Verification:
- `npm run build` passed after the local micro mechanic patch.
- `npm run build` passed after the B2 manifest pointer experiment.

Proofs inspected:
- Rejected recovery proof: `runs/water9-distant-landmark-known-fix-2026-07-04/proof/water9-distant-landmark-known-fix-contact-sheet.png`
  - B2 still vertical spotlight/shaft.
  - B3/B4 show hard rectangular bitmap windows.
- Rejected local micro proof: `runs/water9-distant-landmark-known-fix-2026-07-04/local-micro-proof/water9-distant-landmark-local-micro-contact-sheet.png`
  - B2 vertical shaft persisted.
  - B3/B4 rectangular windows persisted.
- Rejected asset-restore proof: `runs/water9-distant-landmark-known-fix-2026-07-04/asset-restore-proof/water9-distant-landmark-asset-restore-contact-sheet.png`
  - `water9-biome-landmark-brine-vent-sulfide-shelf.png` itself is procedural-looking vertical curtain/chimney geometry, not the desired horizontal painterly shelf.
  - B3/B4 still rectangular/pasted.

Important finding:
- The B2 asset id `biome-brine-vent-sulfide-shelf` is not enough. The current candidate files are misleading:
  - `water9-biome-landmark-brine-shelf-gpt.png` is painterly/horizontal, but current runtime crops/scales it into a narrow vertical-ish read.
  - `water9-biome-landmark-brine-vent-sulfide-shelf.png` is the procedural vertical curtain asset and should not be used as the accepted fix.
- B3/B4 are not solved by alpha/blend-mode tuning; their source images/cutouts still produce hard rectangular windows in normal gameplay.

Current acceptance:
- No accepted fix.
- No commit.
- Do not accept yet; manager visual inspection required.

Next required move:
- A focused asset/runtime restoration pass, not another tuning pass: recover or regenerate the actual horizontal B2 shelf cutout/runtime framing and feather/replace B3/B4 cutouts so their rectangular source bounds are gone before recapturing the standard color + grayscale normal gameplay proof.
