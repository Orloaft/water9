# Water9 Flora Slice + Scannability Followup - 2026-07-06

Goal: replace the first B1/B2 old static scannable flora slice with terrain-integrated visuals, then audit/close the unscannable-flora gap without creating scanner or reward spam.

Current verified repo HEAD: `03b2dad`

Existing dirty state before this run:
- scan reward rebalance implementation/report dirt from the prior accepted pass
- flora style-guide audit run artifacts

Checklist:
- [x] implementation lane — `flora_slice_scannability_impl` — run `ec9eb6de-451f-4396-897a-8e367518f16b`, child `agent:mgr-water9:subagent:dbdc10b8-8bb7-4121-9ca4-c7705880ec50` — expected artifacts: REPORTED 2026-07-06
  - `runs/water9-flora-slice-scannability-2026-07-06/worker-report.md`
  - live `#game canvas` color/grayscale/HUD proof for Moon Sponge, Sting Anemone, Vent Coral, Ember Bloom
  - scannability followup report proving active flora are scannable and classifying any remaining decorative terrain growth

Manager verification:
- Worker report exists and lists implementation, scannability audit, runtime proof, and verification commands.
- Inspected `flora-slice-runtime-contact-sheet.png` and the four replacement PNGs. Accepted visual direction: replacement sprites are terrain-rooted, smaller, darker at base, and use glow as tips/nodes rather than full-body brightness. Vent Coral proof is partially under the player, but runtime scan evidence confirms the live target and asset mapping.
- `flora-slice-runtime-proof.json` has scan evidence for Moon Sponge, Sting Anemone, Vent Coral, and Ember Bloom with `scanTargetDuringHold`, `scanTargetAfterHold`, and `selectedScannedAfterHold: true`.
- `flora-scannability-audit.json` passes. Named gameplay flora remain `this.flora`; decorative edge props are `terrainFlora`; brush flora and procedural fringe remain terrain texture/paint, not scan targets.
- No commit made because repo already had unrelated dirty scan-reward/progression files and this slice overlaps `src/helpers.ts`.

Acceptance rule:
- Manager must inspect live runtime `#game canvas` captures at gameplay scale before accepting.
- Required proof: B1 Moon Sponge, B1 Sting Anemone, B2 Vent Coral, B2 Ember Bloom, at least one adjacent decorative terrain-flora comparison, grayscale variants, HUD/context viewports, and scan-target evidence for the four species.
- The old static/catalog-read failure mode is rejected if the replacement still looks like a centered specimen, a freestanding token, a bright full-body sticker, or a non-rooted foreground pickup.
- Followup scannability pass must distinguish named/scannable flora from ambient terrain fringe/brush. Any discrete runtime plant categorized as flora but not scannable must either be made scannable with controlled rewards/scan behavior, reclassified as non-flora terrain texture, or called out as a deliberate remaining caveat with rationale.
