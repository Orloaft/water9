# Water 9 Critic Regeneration Doctor

Generated: `2026-06-18T17:07:19.287Z`

This doctor focuses on the next critic-blocked source replacement. It does not approve source art or accept threats.

## Target

- Candidate: `black-coral-gate` Black Coral Gate
- Status: `replacement-matches-current-source`
- Ready for replacement ingest: `false`
- Replacement matches current source: `true`
- Prompt file: `public/review/source-candidates/critic-regeneration-prompts/01-black-coral-gate.txt`

## Expected Replacement Files

- `tools/source-inbox/black-coral-gate.png`
- `tools/source-inbox/fauna-black-coral-gate-whole-source.png`

## Inbox Files

- `tools/source-inbox/black-coral-gate.png` pass (matches current source)

## Next Commands

```bash
sed -n '1,280p' public/review/source-candidates/critic-regeneration-prompts/01-black-coral-gate.txt
npm run source:imagegen-mark -- --id black-coral-gate
npm run source:imagegen-status -- --id black-coral-gate
npm run source:imagegen-status -- --id black-coral-gate --ingest
npm run source:inbox-capture -- --id black-coral-gate --open
npm run source:recover-inline -- --id black-coral-gate --image <saved-image-path> --copy --validate
npm run source:generate-openai -- --id black-coral-gate --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite
npm run source:generate-openai -- --id black-coral-gate --queue public/review/source-candidates/source-critic-regeneration-queue.json --apply --overwrite
```

## Evidence Links

- Queue: `/review/source-candidates/source-critic-regeneration-queue.html#next-regeneration-target`
- Critic board: `/review/source-candidates/source-critic-board.html#black-coral-gate`
- Replace runway: `/review/source-candidates/source-replace-runway.html#black-coral-gate`
- Quick review: `/review/source-candidates/quick-reviews/black-coral-gate.html`
- Live source sandbox: `/?entity=source-black-coral-gate&companion=diver`

