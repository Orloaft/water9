# Water9 Content Next Action

Generated: `2026-06-18T18:20:03.205Z`

## Summary

- Accepted threats: `0/20`
- Source images: `20/20`
- Next bottleneck: `prototype-needs-approved-source`
- Active source imagegen missing artifacts: `0`
- Historical source imagegen missing artifacts: `18`
- OpenAI API key available for CLI fallback: `false`
- Source reviews pending: `20`
- Source reviews ready for human review: `20`
- Source reviews mechanically ready: `20`
- Source reviews requiring critic regeneration: `0`
- Next critic regeneration target: `black-coral-gate`
- Source review sequencer next lane: `approval-ready`
- Source review sequencer next target: `brine-crown`

## Next Action

- Type: `source-review`
- Target: `brine-crown`
- Stage: `prototype-needs-approved-source`
- Title: Human-review source art for Brine Crown
- Blocker: Source image exists but is not approved by the source-first gate.
- Gate truth: Not accepted: this target is not production content and cannot count toward the 20-threat goal until source review, rig evidence, paired diver sandbox evidence, and human acceptance all pass.

### Command Boundary

Source review commands in this report are preview/check commands or dry-run templates. Real approval must be run by a human after inspecting the source approval runway and visual board.

### Commands

```bash
npm run source:approval-runway
npm run source:approval-runway-check
npm run source:approval-runway:preview
npm run source:approval-session
npm run source:approval-session-check
npm run source:approval-session:serve-smoke
npm run source:approval-marathon
npm run source:approval-marathon-check
npm run source:approval-marathon-workspace-smoke
npm run source:approval-marathon-full-batch-smoke
npm run content:synthetic-decision-guards-check
npm run source:visual-board
npm run source:visual-board-check
npm run source:cohesion-decisions
npm run source:cohesion-decisions-check
npm run content:review-session
npm run content:review-session-check
npm run content:review-session:serve-smoke
npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual
npm run source:image-check -- --id brine-crown
npm run source:preview-check
npm run source:gallery
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --dry-run --source-visual-board public/review/source-visual-board.json
```

### Acceptance Criteria

- human reviewer starts from the source approval session, then inspects source approval runway and source visual board
- human reviewer can run the 20-candidate source approval marathon smoke and full-batch dry-run guard before trusting exported decisions
- human reviewer can use the source cohesion batch decision workspace or content review session to produce strict decision files
- human reviewer can export reviewed-only source decisions for incremental strict approval without pending rows
- human reviewer opens live diver-paired source and runtime sandbox previews for scale and motion context
- source approval command is run by a human reviewer, not automation
- source review includes scores 4-5 and check-specific notes
- source preview and source-image validation evidence are current

## Parallel Source Review Sequencer

- Target: `brine-crown`
- Lane: `approval-ready`
- Status: `approval-ready; human source review required`
- Health status: `replacement-applied`
- Title: Route source-review work through Brine Crown
- Recommended first: `npm run source:quick-review -- --id brine-crown`

### Source Review Sequencer Evidence

- Sequencer: `/review/source-candidates/source-review-sequencer.html`
- Approval runway: `/review/source-approval-runway.html`
- Critic regeneration health: `/review/source-candidates/source-critic-regeneration-health.html`
- Content review session: `/review/content-review-session.html`
- Source preview: `/?entity=source-brine-crown&companion=diver`
- Quick review: `/review/source-candidates/quick-reviews/brine-crown.html`
- Review packet: `public/review/source-candidates/source-review-packets/brine-crown.md`
- Plan preview: `/review/articulated/brine-crown-plan-preview.png`

### Source Review Sequencer Counts

- Total candidates: `20`
- Approval-ready: `20`
- Critic regeneration required: `0`
- Distinct replacements ready: `0`
- Valid no-op replacements: `0`
- Missing replacements: `0`
- Invalid replacements: `0`
- Counts toward gate: `0`

### Source Review Sequencer Command Boundary

The sequencer chooses the safest next source-review lane. It does not approve source art or accept threats.

### Source Review Sequencer Commands

```bash
npm run source:review-sequencer
npm run source:review-sequencer-check
npm run source:review-sequencer:serve-smoke
npm run source:quick-review -- --id brine-crown
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/brine-crown-starter-plan.json
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
```

### Source Review Sequencer Acceptance Criteria

- the sequencer lane matches critic-regeneration health and source approval state
- non-distinct replacement lanes do not expose overwrite ingest commands
- approval-ready rows expose dry-run source acceptance only
- the next target is reviewed in source-review-sequencer.html before any lower-level command is applied
- the sequencer does not approve source art or accept threats; it only routes the next safe review action

## Parallel: Source Regeneration Workspace

- Target: `brine-crown`
- Lane: `approval-ready`
- Status: `approval-ready; human source review required`
- Health status: `replacement-applied`
- Replacement matches current source: `true`
- Distinct replacement ready: `false`
- Title: Regenerate distinct source art for Brine Crown
- Recommended first: `npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check`

### Regeneration Workspace Evidence

- Workspace: `/review/source-candidates/source-regeneration-workspace.html`
- Target packet: `/review/source-candidates/source-review-target-packet.html`
- Sequencer: `/review/source-candidates/source-review-sequencer.html`
- Critic regeneration health: `/review/source-candidates/source-critic-regeneration-health.html`
- Source preview: `/?entity=source-brine-crown&companion=diver`
- Source image: `/assets/generated/fauna-brine-crown-whole-source.png`
- Quick review: `/review/source-candidates/quick-reviews/brine-crown.html`
- Plan preview: `/review/articulated/brine-crown-plan-preview.png`

### Regeneration Workspace Fingerprints

- Source path: `public/assets/generated/fauna-brine-crown-whole-source.png`
- Source SHA-256: `96acc19e0fbeca2427b173239e821100f0d7f6b977c43a55b1ef3d733ce94825`
- Inbox path: `tools/source-inbox/brine-crown.png`
- Inbox SHA-256: `96acc19e0fbeca2427b173239e821100f0d7f6b977c43a55b1ef3d733ce94825`

### Regeneration Workspace Commands

```bash
npm run source:regeneration-workspace
npm run source:regeneration-workspace-check
npm run source:regeneration-workspace:serve-smoke
npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check
npm run source:approval-runway && npm run source:approval-runway-check
npm run source:review-sequencer && npm run source:review-sequencer-check
npm run source:review-target-packet && npm run source:review-target-packet-check
npm run source:visual-board && npm run source:visual-board-check
npm run content:review-session && npm run content:review-session-check
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
```

### Regeneration Workspace Acceptance Criteria

- the replacement candidate is visually distinct from the current source before overwrite ingest appears
- the workspace source and inbox fingerprints prove whether the candidate is a no-op
- safe commands do not expose overwrite ingest outside regenerate-distinct-ready
- critic health, sequencer, target packet, and workspace are rebuilt after every replacement attempt
- regeneration returns to source review; it does not approve source art or accept threats

## Parallel Source Review

- Target: `brine-crown`
- Status: `ready-for-human-review`
- Title: Human-review source art for Brine Crown
- Blocker: human source approval is still missing
- Recommended first: `npm run source:approval-session:serve-smoke`

### Source Review Evidence

- Approval runway: `/review/source-approval-runway.html`
- Approval checklist: `/review/source-approval-checklist.json`
- Visual board: `/review/source-visual-board.html`
- Batch decision workspace: `/review/source-candidates/source-cohesion-decision-template.html`
- Batch decision template: `/review/source-candidates/source-cohesion-decision-template.json`
- Content review session: `/review/content-review-session.html`
- Review dossier: `/review/source-candidates/source-review-dossier.html`
- Review queue: `/review/source-candidates/quick-reviews/index.html`
- Sandbox lab: `/review/sandbox/lab.html?id=source-brine-crown&with=diver`
- Live source sandbox: `/?entity=source-brine-crown&companion=diver`
- Live runtime sandbox: `/?sandbox=brine-crown&companion=diver`
- Quick review: `/review/source-candidates/quick-reviews/brine-crown.html`
- Source image: `/assets/generated/fauna-brine-crown-whole-source.png`
- Key preview: `/review/source-candidates/key-previews/brine-crown-key-preview.png`
- Sandbox screenshot: `/review/source-candidates/quick-reviews/brine-crown-source-preview.png`
- Plan preview: `/review/articulated/brine-crown-plan-preview.png`
- Art contract: `public/review/source-candidates/art-contracts/brine-crown.md`

### Source Review Counts

- Approval runway ready: `20`
- Visual board ready: `20`
- Dossier ready: `20`
- Human approved: `0`

### Source Review Command Boundary

The listed source review decision commands are dry-runs. Use the source approval runway command builder for the final human approval command after review.

### Source Review Commands

```bash
npm run source:approval-runway
npm run source:approval-runway-check
npm run source:approval-runway:preview
npm run source:approval-session
npm run source:approval-session-check
npm run source:approval-session:serve-smoke
npm run source:approval-marathon
npm run source:approval-marathon-check
npm run source:approval-marathon-workspace-smoke
npm run source:approval-marathon-full-batch-smoke
npm run content:synthetic-decision-guards-check
npm run source:visual-board
npm run source:visual-board-check
npm run source:cohesion-decisions
npm run source:cohesion-decisions-check
npm run content:review-session
npm run content:review-session-check
npm run content:review-session:serve-smoke
npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict
npm run source:review-dossier
npm run source:review-dossier-check
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run source:accept -- --id brine-crown --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json --dry-run
```

### Source Review Acceptance Criteria

- human reviewer starts from the source approval session, then inspects source approval runway and source visual board
- human reviewer can run the 20-candidate source approval marathon smoke and full-batch dry-run guard before trusting exported decisions
- human reviewer can fill the batch decision workspace or content review session and run the strict source cohesion decision dry-run before applying approvals
- human reviewer can export reviewed-only source decisions for incremental strict approval without pending rows
- human reviewer opens the sandbox lab and live diver-paired source/runtime previews for scale and motion context
- human reviewer inspects whole source thumbnail, magenta key preview, source sandbox screenshot, plan preview, and art contract
- approval uses required 4-5 visual scores and specific notes for every source review check
- automation, assistant, bot, or model reviewer names are rejected by source:accept

## Parallel Critic Regeneration

- Target: `black-coral-gate`
- Status: `replacement-applied`
- Lane: `complex-colonial-forms`
- Title: Regenerate critic-blocked source art for Black Coral Gate
- Blocker: Lane critic marked this source below the approval bar; replacement must be fixed before ingest.
- Recommended first: `npm run source:gallery`
- Prompt file: `public/review/source-candidates/critic-regeneration-prompts/01-black-coral-gate.txt`

### Critic Regeneration Evidence

- Queue: `/review/source-candidates/source-critic-regeneration-queue.html#next-regeneration-target`
- Health: `/review/source-candidates/source-critic-regeneration-health.html`
- Critic board: `/review/source-candidates/source-critic-board.html#black-coral-gate`
- Replace runway: `/review/source-candidates/source-replace-runway.html#black-coral-gate`
- Quick review: `/review/source-candidates/quick-reviews/black-coral-gate.html`
- Source image: `/assets/generated/fauna-black-coral-gate-whole-source.png`
- Sandbox preview: `/review/source-candidates/quick-reviews/black-coral-gate-source-preview.png`
- Plan preview: `/review/articulated/black-coral-gate-plan-preview.png`
- Live source sandbox: `/?entity=source-black-coral-gate&companion=diver`

### Critic Regeneration Counts

- Regenerate candidates: `9`
- Lanes: `3`
- Prompt files: `9`
- Distinct replacements ready: `0`
- Valid no-op replacements: `0`
- Missing replacements: `0`
- Invalid replacements: `0`
- Next health status: `replacement-applied`

### Critic Regeneration Command Boundary

Regeneration commands can replace source files, but they do not approve source art or accept threats. Rebuilt replacements must return to human source approval.

### Critic Regeneration Commands

```bash
npm run source:gallery
npm run source:preview-check
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:approval-runway && npm run source:approval-runway-check
npm run source:visual-board && npm run source:visual-board-check
```

### Critic Regeneration Acceptance Criteria

- replacement source is generated from the critic-regeneration prompt, not the stale rejected prompt
- replacement image must be distinct from the current source before any overwrite ingest is recommended
- replacement image is ingested with overwrite only after the health report marks it distinct-replacement-ready and dry-run replacement passes
- source image check, source preview, approval runway, visual board, critic board, and regeneration queue are rebuilt after replacement
- replacement returns to human source approval; critic regeneration never approves content by itself

## Parallel Visual Regeneration

- Target: `abyssal-serpent`
- Status: `rejected-needs-cohesion-regeneration`
- Severity: `blocking`
- Title: Regenerate cohesive source-first art for Abyssal Serpent
- Blocker: Runtime prototype failed art-direction review and must restart from a cohesive full-source concept.
- Prompt file: `public/review/content-visual-regeneration-prompts/01-abyssal-serpent.txt`
- Sandbox preview-only: `true`
- Target gate candidate: `false`
- Counts toward strict gate: `false`
- Recommended first: `sed -n '1,260p' public/review/content-visual-regeneration-prompts/01-abyssal-serpent.txt`

### Visual Regeneration Evidence

- Queue: `/review/content-visual-regeneration-queue.html`
- Feedback ledger: `/review/content-visual-feedback-ledger.html`
- Prompt file: `public/review/content-visual-regeneration-prompts/01-abyssal-serpent.txt`
- Prototype sandbox: `/?sandbox=abyssal-serpent`
- Paired prototype sandbox: `/?sandbox=abyssal-serpent&companion=diver`

### Visual Regeneration Counts

- Queue items: `1`
- Blocking items: `1`
- Unmapped prototype items: `1`
- Strict gate credit: `0`

### Visual Regeneration Failed Checks

- whole-creature-cohesion
- part-continuity-cohesion
- non-placeholder-art-direction

### Visual Regeneration Command Boundary

Visual regeneration restarts failed runtime prototypes at the full-source concept stage. It does not approve art or accept threats.

### Visual Regeneration Commands

```bash
sed -n '1,260p' public/review/content-visual-regeneration-prompts/01-abyssal-serpent.txt
npm run sandbox:preview -- --id abyssal-serpent --serve --open --visual
npm run sandbox:preview -- --id abyssal-serpent --with diver --serve --open --visual
npm run content:visual-feedback && npm run content:visual-feedback-check
npm run content:visual-regeneration && npm run content:visual-regeneration-check
npm run content:visual-regeneration:serve-smoke
```

### Visual Regeneration Acceptance Criteria

- new art starts as a full-source concept on pure #ff00ff magenta, not as a parts sheet or assembled prototype
- human reviewer confirms whole-creature cohesion, part-continuity cohesion, and non-placeholder art direction before extraction
- regenerated source returns through magenta-key cleanup, source approval, articulation, paired-diver sandbox preview, and final threat acceptance
- blocked runtime prototype remains preview-only and contributes zero strict-gate credit until all gates pass

## Top Queue

| Rank | Candidate | Stage | Source | Rig | Accepted |
| ---: | --- | --- | --- | --- | --- |
| 1 | `abyssal-lantern-mantis` Abyssal Lantern Mantis | `prototype-needs-approved-source` | yes | `abyssal-lantern-mantis` | no |
| 2 | `black-coral-gate` Black Coral Gate | `prototype-needs-approved-source` | yes | `black-coral-gate` | no |
| 3 | `brine-crown` Brine Crown | `prototype-needs-approved-source` | yes | `brine-crown` | no |
| 4 | `brine-mycelium-shelf` Brine Mycelium Shelf | `prototype-needs-approved-source` | yes | `brine-mycelium-shelf` | no |
| 5 | `chain-vein-siphonophore` Chain Vein Siphonophore | `prototype-needs-approved-source` | yes | `chain-vein-siphonophore` | no |
| 6 | `coronate-sting-crown` Coronate Sting Crown | `prototype-needs-approved-source` | yes | `coronate-sting-crown` | no |
| 7 | `glass-sponge-sentinel` Glass Sponge Sentinel | `prototype-needs-approved-source` | yes | `glass-sponge-sentinel` | no |
| 8 | `gulper-eel-maw` Gulper Eel Maw | `prototype-needs-approved-source` | yes | `gulper-eel-maw` | no |
