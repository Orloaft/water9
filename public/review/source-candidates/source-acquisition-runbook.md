# Water 9 Source Acquisition Runbook

Generated: `2026-06-18T04:12:38.345Z`
Sprint ids: ``
OpenAI API key available: `false`

This is the batch execution sheet for turning the active source-generation sprint into recoverable project-bound source images. It favors capture/manual-save for candidates with repeated missing-artifact attempts.

## Batch Procedure

1. Open the first target workstation or capture URL.
2. Generate one cohesive whole-creature image on pure `#ff00ff` magenta.
3. Save or capture it to one of the listed inbox filenames.
4. Run focused inbox validation before ingesting.
5. Run the batch dry-run, then apply only when every selected image passes.
6. Rebuild source previews and review dossiers after ingestion.

## Batch Commands

```bash
npm run source:sprint
npm run source:inbox-review
npm run source:imagegen-health

npm run source:recovery-scout-check
npm run source:inbox-capture -- --ids  --open
npm run source:generate-openai-batch -- --ids 
npm run source:generate-openai-batch -- --ids  --apply
npm run source:advance-inbox -- --ids 
npm run source:advance-inbox -- --ids  --apply



npm run source:inbox-capture


npm run source:inbox-check -- --dir tools/source-inbox --strict --ids 
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids  --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids 
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier
npm run content:goal-readiness
```

## Acquisition Targets
