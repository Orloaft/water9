# Water 9 Critic Regeneration Queue

Generated: `2026-06-18T17:06:59.900Z`

This queue is only for source candidates that a lane critic marked `regenerate`. It does not approve replacement art. It produces focused prompts and commands for replacing weak source images, then sends the result back through the normal source review gate.

## Summary

- Regeneration candidates: 9
- Lanes: 3
- Prompt files: `public/review/source-candidates/critic-regeneration-prompts`
- Next target: black-coral-gate
- Human approval still required: true

## Next Regeneration Target

Species: **Black Coral Gate** (`black-coral-gate`)

Lane: `complex-colonial-forms`

Execute this target first so critic-blocked source review can make measurable progress.

```bash
sed -n '1,280p' public/review/source-candidates/critic-regeneration-prompts/01-black-coral-gate.txt
# Imagegen/manual branch:
npm run source:imagegen-mark -- --id black-coral-gate
npm run source:imagegen-status -- --id black-coral-gate
npm run source:imagegen-status -- --id black-coral-gate --ingest
npm run source:inbox-capture -- --id black-coral-gate --open
npm run source:recover-inline -- --id black-coral-gate --image <saved-image-path> --copy --validate
# OpenAI branch:
npm run source:generate-openai -- --id black-coral-gate --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite
npm run source:generate-openai -- --id black-coral-gate --queue public/review/source-candidates/source-critic-regeneration-queue.json --apply --overwrite
# Shared replacement/evidence branch:
python3 tools/validate_source_candidate_images.py --id black-coral-gate --image tools/source-inbox/black-coral-gate.png
npm run source:ingest -- --id black-coral-gate --image tools/source-inbox/black-coral-gate.png --copy --overwrite --dry-run
npm run source:ingest -- --id black-coral-gate --image tools/source-inbox/black-coral-gate.png --copy --overwrite
npm run source:image-check -- --id black-coral-gate
npm run sandbox:preview -- --id source-black-coral-gate --with diver --serve --open --visual
npm run source:gallery && npm run source:preview-check && npm run content:plan-coverage && npm run content:plan-coverage-check && npm run source:review-dossier && npm run source:review-dossier-check && npm run source:approval-runway && npm run source:approval-runway-check && npm run source:visual-board && npm run source:visual-board-check && npm run source:critic-board && npm run source:critic-regeneration && npm run source:critic-regeneration-check
```

## Standard Loop

```bash
npm run source:critic-regeneration
npm run source:critic-regeneration-check
npm run source:imagegen-mark -- --id <candidate-id>
npm run source:imagegen-status -- --id <candidate-id>
npm run source:imagegen-status -- --id <candidate-id> --ingest
npm run source:inbox-capture -- --id <candidate-id> --open
npm run source:recover-inline -- --id <candidate-id> --image <saved-image-path> --copy --validate
npm run source:generate-openai -- --id <candidate-id> --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite
npm run source:generate-openai -- --id <candidate-id> --queue public/review/source-candidates/source-critic-regeneration-queue.json --apply --overwrite
python3 tools/validate_source_candidate_images.py --id <candidate-id> --image tools/source-inbox/<candidate-id>.png
npm run source:ingest -- --id <candidate-id> --image tools/source-inbox/<candidate-id>.png --copy --overwrite --dry-run
npm run source:ingest -- --id <candidate-id> --image tools/source-inbox/<candidate-id>.png --copy --overwrite
npm run source:image-check -- --id <candidate-id>
npm run sandbox:preview -- --id source-<candidate-id> --with diver --serve --open --visual
npm run source:gallery && npm run source:preview-check && npm run content:plan-coverage && npm run content:plan-coverage-check && npm run source:review-dossier && npm run source:review-dossier-check && npm run source:approval-runway && npm run source:approval-runway-check && npm run source:visual-board && npm run source:visual-board-check && npm run source:critic-board && npm run source:critic-regeneration && npm run source:critic-regeneration-check
```

## Candidates

| Candidate | Species | Lane | Critic risks | Dry run |
| --- | --- | --- | ---: | --- |
| black-coral-gate | Black Coral Gate | complex-colonial-forms | 2 | `npm run source:generate-openai -- --id black-coral-gate --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite` |
| chain-vein-siphonophore | Chain Vein Siphonophore | complex-colonial-forms | 2 | `npm run source:generate-openai -- --id chain-vein-siphonophore --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite` |
| gulper-eel-maw | Gulper Eel Maw | mobile-predator-motion | 2 | `npm run source:generate-openai -- --id gulper-eel-maw --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite` |
| trench-harvest-sea-spider | Trench Harvest Sea Spider | mobile-predator-motion | 2 | `npm run source:generate-openai -- --id trench-harvest-sea-spider --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite` |
| vampire-cloak-squid | Vampire Cloak Squid | mobile-predator-motion | 2 | `npm run source:generate-openai -- --id vampire-cloak-squid --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite` |
| vent-claw-yeti | Vent-Claw Yeti | mobile-predator-motion | 2 | `npm run source:generate-openai -- --id vent-claw-yeti --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite` |
| brine-crown | Brine Crown | sessile-ambush-hazards | 2 | `npm run source:generate-openai -- --id brine-crown --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite` |
| lantern-anemone-pit | Lantern Anemone Pit | sessile-ambush-hazards | 2 | `npm run source:generate-openai -- --id lantern-anemone-pit --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite` |
| predatory-tunicate-maw | Predatory Tunicate Maw | sessile-ambush-hazards | 2 | `npm run source:generate-openai -- --id predatory-tunicate-maw --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite` |
