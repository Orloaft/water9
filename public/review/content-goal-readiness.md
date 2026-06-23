# Water9 Content Goal Readiness

Generated: `2026-06-18T17:21:09.429Z`

Strict goal complete: `false`
Next stage: `source-review`
Next action: 20 source images still need human approval; 20 are approval-ready; 0 require critic regeneration first

## Human Approval Boundary

Top-level readiness only exposes source approval dry-runs and reviewed-only decision exports. A real approval must be run by a human after inspecting the source approval runway, visual board, sandbox source preview, magenta key, and articulation plan preview.

## Critic Regeneration Health

- Distinct replacements ready: `0`
- Applied replacements: `9`
- Valid no-op replacements: `0`
- Missing replacements: `0`
- Invalid replacements: `0`
- Next health target: `none`
- Next health status: `unknown`

## Source Review Sequencer

- Next lane: `approval-ready`
- Next target: `brine-crown`
- Approval-ready: `20`
- Critic regeneration required: `0`
- Valid no-op replacements: `0`
- Missing replacements: `0`

## Source Regeneration Workspace

- Target: `brine-crown`
- Lane: `approval-ready`
- Health status: `replacement-applied`
- Replacement matches current source: `true`
- Distinct replacement ready: `false`
- Source SHA-256: `96acc19e0fbeca2427b173239e821100f0d7f6b977c43a55b1ef3d733ce94825`
- Inbox SHA-256: `96acc19e0fbeca2427b173239e821100f0d7f6b977c43a55b1ef3d733ce94825`
- Workspace page: `/review/source-candidates/source-regeneration-workspace.html`

## Next Commands

```bash
npm run source:review-sequencer
npm run source:review-sequencer-check
npm run source:review-sequencer:serve-smoke
npm run source:quick-review -- --id brine-crown
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/brine-crown-starter-plan.json
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run source:regeneration-workspace
npm run source:regeneration-workspace-check
npm run source:regeneration-workspace:serve-smoke
npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check
npm run source:approval-runway && npm run source:approval-runway-check
npm run source:review-sequencer && npm run source:review-sequencer-check
npm run source:review-target-packet && npm run source:review-target-packet-check
npm run source:visual-board && npm run source:visual-board-check
npm run content:review-session && npm run content:review-session-check
npm run source:critic-regeneration
npm run source:critic-regeneration-check
npm run source:critic-regeneration:serve-smoke
npm run source:critic-regeneration-openai-smoke
npm run source:critic-regeneration-health
npm run source:critic-regeneration-health-check
npm run source:critic-regeneration-health:serve-smoke
npm run source:approval-runway
npm run source:approval-runway-check
npm run source:approval-runway:preview
npm run source:approval-session
npm run source:approval-session-check
npm run source:approval-session:serve-smoke
npm run source:visual-board
npm run source:visual-board-check
npm run content:review-session
npm run content:review-session-check
npm run content:review-session:serve-smoke
npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict
npm run sandbox:preview -- --id brine-crown --kind source --with diver --serve --open --visual
npm run source:review-dossier
npm run source:review-dossier-check
```

## Milestones

| Stage | Current | Target | Complete | Blockers |
| --- | ---: | ---: | --- | --- |
| Research and subagent audits | 20 | 20 | yes | none |
| Recoverable source images | 20 | 20 | yes | none |
| Human-approved source images | 0 | 20 | no | 20 source images still need human approval; 20 are approval-ready; 0 require critic regeneration first |
| Registered articulated threats | 33 | 20 | yes | none |
| Sandbox preview coverage | 125 | 125 | yes | none |
| Accepted threats | 0 | 20 | no | 20 threats still need strict human acceptance |

## Prototype Quarantine

Prototype rigs are sandbox-only evidence. They do not count toward the 20-threat goal until strict source approval and strict rig acceptance are recorded by a human reviewer.

Quarantined prototypes: `33`

| Prototype | Source Candidate | Preview | Audit |
| --- | --- | --- | --- |
| `abyssal-crownmaw` Abyssal Crownmaw | missing | `npm run sandbox:preview -- --id abyssal-crownmaw --with diver --serve --open --visual` | `npm run content:acceptance-audit -- --id abyssal-crownmaw` |
| `abyssal-gulper` Abyssal Gulper | missing | `npm run sandbox:preview -- --id abyssal-gulper --with diver --serve --open --visual` | `npm run content:acceptance-audit -- --id abyssal-gulper` |
| `abyssal-lantern-mantis` Abyssal Lantern Mantis | `abyssal-lantern-mantis` | `npm run sandbox:preview -- --id abyssal-lantern-mantis --with diver --serve --open --visual` | `npm run content:acceptance-audit -- --id abyssal-lantern-mantis` |
| `abyssal-serpent` Abyssal Serpent | missing | `npm run sandbox:preview -- --id abyssal-serpent --with diver --serve --open --visual` | `npm run content:acceptance-audit -- --id abyssal-serpent` |
| `black-coral-gate` Black Coral Gate | `black-coral-gate` | `npm run sandbox:preview -- --id black-coral-gate --with diver --serve --open --visual` | `npm run content:acceptance-audit -- --id black-coral-gate` |
| `brine-crown` Brine Crown | `brine-crown` | `npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual` | `npm run content:acceptance-audit -- --id brine-crown` |
| `brine-mycelium-shelf` Brine Mycelium Shelf | `brine-mycelium-shelf` | `npm run sandbox:preview -- --id brine-mycelium-shelf --with diver --serve --open --visual` | `npm run content:acceptance-audit -- --id brine-mycelium-shelf` |
| `cavitation-boxer` Cavitation Boxer | missing | `npm run sandbox:preview -- --id cavitation-boxer --with diver --serve --open --visual` | `npm run content:acceptance-audit -- --id cavitation-boxer` |

## Verification

```bash
npm run content:goal-readiness
npm run content:goal-readiness-check
npm run content:goal-readiness-strict
npm run content:gate
```

