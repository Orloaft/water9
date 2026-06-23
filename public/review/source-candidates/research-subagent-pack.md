# Water 9 Research Subagent Pack

Use this pack to split underwater threat research across multiple subagents. Each assignment is read-only and returns candidate-keyed findings or patch suggestions that can be reviewed before touching the source-candidate manifests.

Assignments: `3`

| Assignment | Candidates | File |
| --- | ---: | --- |
| Mobile Predator Motion | 9 | [public/review/source-candidates/research-subagent-assignments/01-mobile-predator-motion.md](public/review/source-candidates/research-subagent-assignments/01-mobile-predator-motion.md) |
| Sessile Ambush Hazards | 5 | [public/review/source-candidates/research-subagent-assignments/02-sessile-ambush-hazards.md](public/review/source-candidates/research-subagent-assignments/02-sessile-ambush-hazards.md) |
| Complex Colonial Forms | 6 | [public/review/source-candidates/research-subagent-assignments/03-complex-colonial-forms.md](public/review/source-candidates/research-subagent-assignments/03-complex-colonial-forms.md) |

Validation loop after applying any accepted research patches:

```bash
npm run research:check
npm run research:import -- --all
npm run source:generation-queue
npm run source:contracts
npm run source:inbox-pack
npm run source:check
npm run sandbox:preview -- --id <candidate-id> --kind source --serve --open --visual
```

