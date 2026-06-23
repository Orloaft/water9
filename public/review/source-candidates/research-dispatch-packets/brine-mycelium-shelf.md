# Research Dispatch: Brine Mycelium Shelf (brine-mycelium-shelf)

Lane: `complex-colonial-forms`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/03-complex-colonial-forms.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Brine Mycelium Shelf (brine-mycelium-shelf)
Lane: complex-colonial-forms
Current source status: needs-review
Has source image: true

Gameplay verb:
Creeping sessile fungal shelf that blocks ledges, exhales spore bursts, and extends brittle feeding plates to punish close movement.

Biological anchors:
- Marine fungal mycelium and biofilm mats for a spreading, rooted decomposer footprint.
- Bracket fungus and shelf mushroom silhouettes translated into underwater encrusting plates.
- Sulfur bacterial mats for pale filament networks and hypoxic warning coloration.
- Sponge and tunicate encrustation cues for a plausible submerged colony texture.
- Puffball spore-release logic for a clear inhale, swell, and burst attack cycle.

Required visual read:
- One living encrusting shelf organism, not a pile of land mushrooms dropped underwater.
- Layered shelf plates and central spore pores are readable before surface texture detail.
- Mycelial root web visibly ties the plates into one anchored threat.
- Several large plates have clear hinge zones for extension and recoil animation.
- No wreck wall, cave surface, fog, spore cloud, or environmental substrate baked into the source.

Articulatable parts:
- mycelial root mat
- central swollen spore sac
- upper shelf plate
- lower shelf plate
- left feeding plate
- right feeding plate
- front brittle plate lip
- spore pore cluster
- filament whisker fringe
- cracked crust overlays
- integrated warning-color tissue patches

Known prompt risks:
- Avoid terrestrial mushroom caps with stems; keep the form encrusting and underwater-adapted.
- Avoid making the source look like an inert rock or coral slab.
- Avoid dense fuzzy texture that hides the main plates and hinge zones.
- Avoid baked spore clouds or fog covering the anatomy.
- Avoid magenta, hot pink, or purple fungal tissue near the key color.

Reference search terms:
- marine fungal mycelium biofilm
- underwater biofilm mat sulfur bacteria
- bracket fungus shelf morphology
- encrusting sponge tunicate colony

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id brine-mycelium-shelf --kind source --serve --open --visual
npm run sandbox:lab -- --id source-brine-mycelium-shelf --with diver
npm run source:approval-runway:preview -- --id brine-mycelium-shelf

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "complex-colonial-forms",
  "findings": [
    {
      "id": "brine-mycelium-shelf",
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
npm run sandbox:lab -- --id source-brine-mycelium-shelf --with diver
npm run sandbox:preview -- --id brine-mycelium-shelf --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id brine-mycelium-shelf
npm run source:next-prompt -- --id brine-mycelium-shelf
npm run source:accept -- --id brine-mycelium-shelf --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Marine fungal mycelium and biofilm mats for a spreading, rooted decomposer footprint.
- Bracket fungus and shelf mushroom silhouettes translated into underwater encrusting plates.
- Sulfur bacterial mats for pale filament networks and hypoxic warning coloration.
- Sponge and tunicate encrustation cues for a plausible submerged colony texture.
- Puffball spore-release logic for a clear inhale, swell, and burst attack cycle.

## Required Read

- One living encrusting shelf organism, not a pile of land mushrooms dropped underwater.
- Layered shelf plates and central spore pores are readable before surface texture detail.
- Mycelial root web visibly ties the plates into one anchored threat.
- Several large plates have clear hinge zones for extension and recoil animation.
- No wreck wall, cave surface, fog, spore cloud, or environmental substrate baked into the source.

## Articulatable Parts

- mycelial root mat
- central swollen spore sac
- upper shelf plate
- lower shelf plate
- left feeding plate
- right feeding plate
- front brittle plate lip
- spore pore cluster
- filament whisker fringe
- cracked crust overlays
- integrated warning-color tissue patches

## Prompt Risks

- Avoid terrestrial mushroom caps with stems; keep the form encrusting and underwater-adapted.
- Avoid making the source look like an inert rock or coral slab.
- Avoid dense fuzzy texture that hides the main plates and hinge zones.
- Avoid baked spore clouds or fog covering the anatomy.
- Avoid magenta, hot pink, or purple fungal tissue near the key color.

## Reference Search Terms

- marine fungal mycelium biofilm
- underwater biofilm mat sulfur bacteria
- bracket fungus shelf morphology
- encrusting sponge tunicate colony
