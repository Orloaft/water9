# Source Inbox Handoff

Queue: `public/review/source-candidates/source-generation-queue.json`
Sprint: `public/review/source-candidates/source-generation-sprint.json`
Contract index: `public/review/source-candidates/art-contracts.md`
Inbox: `tools/source-inbox`
Scope: `active-sprint`
Scoped ids: ``
Candidates in this handoff: `0`

Purpose: generated source art must land as a real project-readable image before extraction, rigging, or acceptance. Review the contract first, generate one whole creature on a flat `#ff00ff` background, then place the selected image output in the exact inbox filename below. Inbox ingest is not source approval; it resets candidates to human-review state before `source:accept` can be used.

Batch validation loop:

```bash
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids 
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids  --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids 
npm run source:check
npm run source:gallery
npm run source:approval-runway
npm run source:visual-board
npm run source:approval-runway:preview
```

After ingest: inspect the source approval runway and visual board before any `source:accept` approval command. Do not treat an inbox-selected image as approved content.

Inbox files outside this handoff scope:

- `tools/source-inbox/abyssal-lantern-mantis.png` maps to `abyssal-lantern-mantis`; ignored by scoped batch commands.
- `tools/source-inbox/black-coral-gate.png` maps to `black-coral-gate`; ignored by scoped batch commands.
- `tools/source-inbox/brine-mycelium-shelf.png` maps to `brine-mycelium-shelf`; ignored by scoped batch commands.
- `tools/source-inbox/chain-vein-siphonophore.png` maps to `chain-vein-siphonophore`; ignored by scoped batch commands.
- `tools/source-inbox/coronate-sting-crown.png` maps to `coronate-sting-crown`; ignored by scoped batch commands.
- `tools/source-inbox/glass-sponge-sentinel.png` maps to `glass-sponge-sentinel`; ignored by scoped batch commands.
- `tools/source-inbox/gulper-eel-maw.png` maps to `gulper-eel-maw`; ignored by scoped batch commands.
- `tools/source-inbox/lantern-anemone-pit.png` maps to `lantern-anemone-pit`; ignored by scoped batch commands.
- `tools/source-inbox/razor-kelp-harp.png` maps to `razor-kelp-harp`; ignored by scoped batch commands.
- `tools/source-inbox/reef-lion-moray.png` maps to `reef-lion-moray`; ignored by scoped batch commands.
- `tools/source-inbox/reliquary-siphonophore.png` maps to `reliquary-siphonophore`; ignored by scoped batch commands.
- `tools/source-inbox/thorn-fan-coralline.png` maps to `thorn-fan-coralline`; ignored by scoped batch commands.
- `tools/source-inbox/trench-harvest-sea-spider.png` maps to `trench-harvest-sea-spider`; ignored by scoped batch commands.
- `tools/source-inbox/tripod-stilt-stalker.png` maps to `tripod-stilt-stalker`; ignored by scoped batch commands.
- `tools/source-inbox/vent-claw-yeti.png` maps to `vent-claw-yeti`; ignored by scoped batch commands.

| Rank | Candidate | Contract | Inbox filename | Expected project output |
| ---: | --- | --- | --- | --- |

## Queue Summary

- Schema: `water9/source-generation-queue@1`
- Total queued candidates: `0`
- Handoff candidates listed: `0`

