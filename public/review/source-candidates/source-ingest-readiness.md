# Water 9 Source Ingest Readiness

Generated: `2026-06-18T04:13:04.053Z`
Batch ready: `false`
Ready: `0`; missing: `0`; blocked: `0`

## Batch Commands

```bash
npm run source:acquisition-runbook
npm run source:ingest-readiness
npm run source:ingest-readiness-check
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids 
npm run source:advance-inbox -- --ids 
npm run source:advance-inbox -- --ids  --apply
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids  --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids 
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier
```

## Targets

| Rank | Candidate | Status | Present File | Validation | Next |
| ---: | --- | --- | --- | --- | --- |

## Target Commands

