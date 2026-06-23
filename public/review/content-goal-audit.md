# Water 9 Content Goal Audit

Generated: `2026-06-18T17:21:10.154Z`
Goal complete: `false`
Strict goal complete: `false`
Accepted threats: `0/20`

This audit maps the active goal to current evidence. Passing preview checks or mechanical image checks is not content acceptance.

## Requirements

| Requirement | Status | Evidence | Blockers |
| --- | --- | --- | --- |
| Quick sandbox preview for any entity | `passed` | sandbox manifest entries: 125<br>diver entry: true<br>abyssal-gulper entry: true<br>source preview entries: 20<br>goal preview smoke uses quick paired target preview: true | none |
| Subagent research coverage for underwater fauna and flora | `passed` | research assignments: 3<br>audited candidates: 20<br>audit failures: 0 | none |
| Imagen/OpenAI source generation and magenta-key intake | `passed` | source images present: 20/20<br>mechanically checked source images: 20<br>source image validation failures: 0<br>critic regeneration required: 0<br>current regeneration target: brine-crown<br>current replacement distinct-ready: false | none |
| Magenta extraction into articulated in-game entities | `partial` | stage-board runtime targets: 20/20<br>articulated manifest creatures: 33<br>prototype creatures: 33<br>accepted threats: 0/20 | 20 articulated threats still need strict human acceptance |
| Rejected preview art is quarantined and routed to regeneration | `passed` | visual feedback items: 1<br>blocking visual feedback items: 1<br>visual regeneration items: 1<br>visual regeneration blocking items: 1<br>regeneration strict gate credit: 0<br>rejected feedback missing regeneration route: 0 | none |
| 20 new underwater threats pass rigorous quality gate | `incomplete` | strict goal complete: false<br>accepted threats: 0/20<br>source approval-ready: 20<br>source critic regeneration required: 0<br>source sequencer next lane: approval-ready | 20 threats still do not count toward the goal<br>20 source images still need human approval |

## Commands

### Quick sandbox preview for any entity

- `npm run sandbox:preview -- --id abyssal-gulper --with diver --serve --open --visual`
- `npm run sandbox:lab -- --id abyssal-gulper --with diver`
- `npm run sandbox:visual:paired:targets:quick`
- `npm run content:goal-preview-smoke`

### Subagent research coverage for underwater fauna and flora

- `npm run research:subagent-pack`
- `npm run research:dispatch`
- `npm run research:audits`
- `npm run research:regeneration-handoff`

### Imagen/OpenAI source generation and magenta-key intake

- `npm run source:generate-openai -- --id <candidate-id> --queue public/review/source-candidates/source-critic-regeneration-queue.json --overwrite`
- `npm run source:inbox-capture -- --id <candidate-id> --open`
- `npm run source:regeneration-workspace`
- `npm run source:regeneration-workspace-check`
- `python3 tools/validate_source_candidate_images.py --report tools/scratch/source-candidate-images-report.json`

### Magenta extraction into articulated in-game entities

- `npm run articulated:source-parity`
- `npm run articulated:visual-cohesion`
- `npm run content:acceptance-audit -- --id <runtime-id>`
- `npm run content:review-session`

### Rejected preview art is quarantined and routed to regeneration

- `npm run content:visual-feedback`
- `npm run content:visual-feedback-check`
- `npm run content:visual-regeneration`
- `npm run content:visual-regeneration-check`
- `npm run content:visual-regeneration:serve-smoke`

### 20 new underwater threats pass rigorous quality gate

- `npm run content:goal-readiness-strict`
- `npm run content:gate`
- `npm run content:review-session`
- `npm run content:production-proof`

## Hard Stop

Do not mark the goal complete: preview/research/source/rigging infrastructure exists, but strict human source approval and threat acceptance are not complete.

```bash
npm run content:goal-audit
npm run content:goal-audit-check
npm run content:goal-readiness-strict
npm run content:gate
```

