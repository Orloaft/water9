# Water9 Small Gulper Readability / Facing Fix

Goal: pinpoint the smaller non-articulated gulper-like hostile that reads poorly
and appears to face the wrong direction while chasing the player, then fix it
with runtime proof.

Checklist:

- [x] small-gulper-readability-facing-fix - session key `agent:mgr-water9:subagent:af386443-c4cb-41b3-afb0-cf2d0e4f167b`, run id `d0f4ffe4-fa1d-47a7-bd4e-61edaf41be18` - expected artifacts: `runs/water9-small-gulper-readability-facing-fix-2026-07-07/small-gulper-fix-report.md`, `small-gulper-fix.json`, before/after normal `#game canvas` and grayscale captures, source/runtime contact sheets, committed asset changes - verified at `8a04ef5` - REPORTED 2026-07-07

Acceptance rule:

- Runtime target must be identified from normal gameplay evidence, not guessed
  from filename alone.
- Fix must preserve correct runtime flip behavior or explain why code changes
  are required.
- Normal `#game canvas` before/after and grayscale proof must exist in the run
  directory.
- Build and focused motion smoke must pass before reporting complete.

Manager verification:

- Confirmed repo head `8a04ef5`.
- Confirmed commit only changes `fauna-exp-cobalt-gulper-fry` generated sprite
  files plus run proof artifacts.
- Inspected `cobalt-gulper-before-after-contact.png` and
  `runtime-before-after-crop-contact.png`; the repaired sprite has a brighter
  readable head/mouth cue and quieter tail.
- Worker verification recorded `npm run small-enemy:motion-smoke` and
  `npm run build` passing, with only existing Vite warnings.
