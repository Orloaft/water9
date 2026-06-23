# Water 9 Source Approval Session

Generated: `2026-06-18T17:21:09.538Z`

First-class wrapper for the human source approval bottleneck. This page does not approve source art; it points reviewers into the existing batch decision workspace and the existing strict apply gate.

## Summary

- Candidates: 20
- Ready for human review: 20
- Human approved: 0
- Blocked before human review: 0
- Required checks per approved source: 10
- Next target: Brine Crown (brine-crown)

## Policy

- Decisions must be human-authored.
- Automation cannot approve source art.
- This session wraps the existing strict apply gate.
- `tools/accept_source_candidate.mjs` remains the final source approval enforcement point.

## Review Steps

### Open this session

- Evidence: `/review/source-candidates/source-approval-session.html`
- Command: `npm run source:approval-session:serve-smoke`

### Review the focused next target

- Evidence: `/review/source-candidates/source-next-review.html`
- Command: `npm run source:next-review && npm run source:next-review-check && npm run source:next-review:serve-smoke`

### Prepare the focused decision draft

- Evidence: `/review/source-candidates/source-next-decision-draft.html`
- Command: `npm run source:next-decision-draft && npm run source:next-decision-draft-check && npm run source:next-decision-draft:serve-smoke`

### Inspect source evidence

- Evidence: `/review/source-candidates/source-cohesion-decision-template.html`
- Command: `npm run source:cohesion-decisions && npm run source:cohesion-decisions-check`

### Fill reviewer-authored decisions

- Evidence: `water9-source-cohesion-reviewed-decisions.json`

### Run strict apply dry-run

- Evidence: `public/review/source-candidates/source-cohesion-decision-run-report.json`
- Command: `npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict`

### Apply only after dry-run succeeds

- Evidence: `source candidate approval metadata`
- Command: `npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict --apply`

## Commands

- `npm run source:approval-session && npm run source:approval-session-check`
- `npm run source:approval-session:serve-smoke`
- `npm run source:next-review && npm run source:next-review-check && npm run source:next-review:serve-smoke`
- `npm run source:next-decision-draft && npm run source:next-decision-draft-check && npm run source:next-decision-draft:serve-smoke`
- `npm run source:cohesion-decisions && npm run source:cohesion-decisions-check`
- `npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual`
- `npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual`
- `npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict`
- `npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict --apply`

## Decision Output

- File: `water9-source-cohesion-reviewed-decisions.json`
- Schema: `water9/source-cohesion-decisions@1`
- Strict dry-run: `npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict`
- Strict apply: `npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict --apply`

