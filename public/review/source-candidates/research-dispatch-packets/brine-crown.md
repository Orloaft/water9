# Research Dispatch: Brine Crown (brine-crown)

Lane: `sessile-ambush-hazards`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/02-sessile-ambush-hazards.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Brine Crown (brine-crown)
Lane: sessile-ambush-hazards
Current source status: needs-review
Has source image: true

Gameplay verb:
Stationary area-control hazard that swells, raises spines, and grows corrosive brine patches instead of chasing the diver.

Biological anchors:
- Vent-associated chemosynthetic mats and mineral crusts for a rooted abyssal footprint.
- Starfish-like radial arm logic for readable uneven rays and outward danger lanes.
- Toxic coral and brine-pool blister cues for corrosive sacs and warning colors.
- Hydrothermal chimney forms for a central crown cup and dark toxic throat.

Required visual read:
- One rooted radial organism, not a collage of coral, starfish, and vent tubes.
- Central crown or toxic throat is the first read.
- Low anchored basal mat with uneven rays/fronds and visible hinge/root zones.
- Readable toxic blisters, spine halo, and corrosive danger cues at game scale.
- No loose detached parts, environmental shadows, haze, floor plane, or particles baked into the source.

Articulatable parts:
- basal mat torso
- central crown cup head
- dark throat pore
- front radial frond
- left radial frond
- right radial frond
- rear radial fronds
- brine blister bank
- spine halo cluster
- root tendril skirt

Known prompt risks:
- Avoid a decorative reef; the source must read as a dangerous organism.
- Avoid perfect radial ornament symmetry that feels like a logo.
- Avoid magenta or hot pink body colors that will key out.
- Avoid loose vent tubes or starfish arms that do not grow from the same mat.
- Keep toxic clouds, bubbles, and brine puddles as separate VFX rather than baked source art.

Reference search terms:
- hydrothermal vent microbial mat mineral crust
- deep sea brine pool edge
- toxic coral polyps
- starfish radial anatomy
- hydrothermal chimney black smoker

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id brine-crown --kind source --serve --open --visual
npm run sandbox:lab -- --id source-brine-crown --with diver
npm run source:approval-runway:preview -- --id brine-crown

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "sessile-ambush-hazards",
  "findings": [
    {
      "id": "brine-crown",
      "strengths": ["specific source/articulation strength"],
      "sourceGenerationRisks": ["specific risk that could produce incohesive art"],
      "suggestedResearchPatch": {
        "biologicalAnchors": ["optional replacement/addition"],
        "requiredRead": ["optional replacement/addition"],
        "promptRisks": ["optional replacement/addition"],
        "motionPhases": ["optional replacement/addition"]
      },
      "referenceSearchTerms": ["stable biological reference keywords"]
    }
  ]
}
```

## Commands

```bash
npm run research:subagent-pack && npm run research:subagent-pack-check
npm run research:source-trace && npm run research:source-trace-check
npm run sandbox:lab -- --id source-brine-crown --with diver
npm run sandbox:preview -- --id brine-crown --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id brine-crown
npm run source:next-prompt -- --id brine-crown
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Vent-associated chemosynthetic mats and mineral crusts for a rooted abyssal footprint.
- Starfish-like radial arm logic for readable uneven rays and outward danger lanes.
- Toxic coral and brine-pool blister cues for corrosive sacs and warning colors.
- Hydrothermal chimney forms for a central crown cup and dark toxic throat.

## Required Read

- One rooted radial organism, not a collage of coral, starfish, and vent tubes.
- Central crown or toxic throat is the first read.
- Low anchored basal mat with uneven rays/fronds and visible hinge/root zones.
- Readable toxic blisters, spine halo, and corrosive danger cues at game scale.
- No loose detached parts, environmental shadows, haze, floor plane, or particles baked into the source.

## Articulatable Parts

- basal mat torso
- central crown cup head
- dark throat pore
- front radial frond
- left radial frond
- right radial frond
- rear radial fronds
- brine blister bank
- spine halo cluster
- root tendril skirt

## Prompt Risks

- Avoid a decorative reef; the source must read as a dangerous organism.
- Avoid perfect radial ornament symmetry that feels like a logo.
- Avoid magenta or hot pink body colors that will key out.
- Avoid loose vent tubes or starfish arms that do not grow from the same mat.
- Keep toxic clouds, bubbles, and brine puddles as separate VFX rather than baked source art.

## Reference Search Terms

- hydrothermal vent microbial mat mineral crust
- deep sea brine pool edge
- toxic coral polyps
- starfish radial anatomy
- hydrothermal chimney black smoker
