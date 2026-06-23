# Water 9 Source Intake Doctor

Generated: `2026-06-18T17:06:57.946Z`

## Current Target

- Candidate: `brine-crown` Brine Crown
- Status: `source-present`
- Source: `public/assets/generated/fauna-brine-crown-whole-source.png`
- Ready for ingest: `true`

### Expected Inbox Files

- `tools/source-inbox/brine-crown.png`
- `tools/source-inbox/fauna-brine-crown-whole-source.png`

### Commands

```bash
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids brine-crown --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids brine-crown
npm run source:check
npm run source:gallery
```

### Intake Utilities

```bash
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids brine-crown
npm run source:inbox-capture -- --id brine-crown --open
npm run source:ingest-current -- --id brine-crown --dry-run
npm run source:ingest-current -- --id brine-crown --apply
```

## Queue Snapshot

| Rank | Candidate | Status | Source | Inbox |
| ---: | --- | --- | --- | --- |
