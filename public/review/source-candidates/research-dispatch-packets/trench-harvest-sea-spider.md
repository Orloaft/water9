# Research Dispatch: Trench Harvest Sea Spider (trench-harvest-sea-spider)

Lane: `mobile-predator-motion`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/01-mobile-predator-motion.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Trench Harvest Sea Spider (trench-harvest-sea-spider)
Lane: mobile-predator-motion
Current source status: needs-review
Has source image: true

Gameplay verb:
Long-legged pinning hunter that steps over obstacles, plants barbed legs around the diver, then siphons during a brief hold.

Biological anchors:
- Pycnogonid sea spider anatomy with tiny central body and very long jointed legs.
- Deep-sea gigantism cues for oversized limb span and sparse, alien proportions.
- Proboscis feeding behavior for a forward siphon mouth rather than jaws or teeth.
- Carcass-fall scavenger ecology with grasping claws and slow deliberate stepping.
- Arthropod joint logic with visible coxae, knees, and hooked terminal claws.

Required visual read:
- One cohesive sea-spider-inspired arthropod, not a land spider or insect.
- Tiny central body with long articulated legs is the first silhouette read.
- Forward proboscis must read as a biological siphon and not a weapon barrel.
- Legs are separated enough for rigging, with thick joints and clear contact claws.
- No webbing, carcass, seafloor, drifting particles, shadows, blood clouds, or environmental props baked in.

Articulatable parts:
- tiny knuckled central body
- small forward head nub
- soft forward proboscis siphon
- left long front stepping leg
- right long front stepping leg
- left long middle pinning leg
- right long middle pinning leg
- left long rear bracing leg
- right long rear bracing leg
- hooked terminal claw cluster
- dorsal rounded egg-sac lump
- cold siphon glow overlay

Known prompt risks:
- Avoid a terrestrial spider read; keep pycnogonid tiny-body and marine proboscis anatomy.
- Avoid making legs hair-thin; every limb needs usable thickness for articulation.
- Avoid web strands, silk, or horror-web language because sea spiders do not use webs.
- Avoid a gun-like proboscis; it should be soft biological feeding anatomy.
- Avoid magenta highlights on joints, eyes, or siphon effects.

Reference search terms:
- deep sea pycnogonid giant sea spider
- sea spider proboscis anatomy
- pycnogonid long legs side view
- sea spider ovigers

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id trench-harvest-sea-spider --kind source --serve --open --visual
npm run sandbox:lab -- --id source-trench-harvest-sea-spider --with diver
npm run source:approval-runway:preview -- --id trench-harvest-sea-spider

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
  "findings": [
    {
      "id": "trench-harvest-sea-spider",
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
npm run sandbox:lab -- --id source-trench-harvest-sea-spider --with diver
npm run sandbox:preview -- --id trench-harvest-sea-spider --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id trench-harvest-sea-spider
npm run source:next-prompt -- --id trench-harvest-sea-spider
npm run source:accept -- --id trench-harvest-sea-spider --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Pycnogonid sea spider anatomy with tiny central body and very long jointed legs.
- Deep-sea gigantism cues for oversized limb span and sparse, alien proportions.
- Proboscis feeding behavior for a forward siphon mouth rather than jaws or teeth.
- Carcass-fall scavenger ecology with grasping claws and slow deliberate stepping.
- Arthropod joint logic with visible coxae, knees, and hooked terminal claws.

## Required Read

- One cohesive sea-spider-inspired arthropod, not a land spider or insect.
- Tiny central body with long articulated legs is the first silhouette read.
- Forward proboscis must read as a biological siphon and not a weapon barrel.
- Legs are separated enough for rigging, with thick joints and clear contact claws.
- No webbing, carcass, seafloor, drifting particles, shadows, blood clouds, or environmental props baked in.

## Articulatable Parts

- tiny knuckled central body
- small forward head nub
- soft forward proboscis siphon
- left long front stepping leg
- right long front stepping leg
- left long middle pinning leg
- right long middle pinning leg
- left long rear bracing leg
- right long rear bracing leg
- hooked terminal claw cluster
- dorsal rounded egg-sac lump
- cold siphon glow overlay

## Prompt Risks

- Avoid a terrestrial spider read; keep pycnogonid tiny-body and marine proboscis anatomy.
- Avoid making legs hair-thin; every limb needs usable thickness for articulation.
- Avoid web strands, silk, or horror-web language because sea spiders do not use webs.
- Avoid a gun-like proboscis; it should be soft biological feeding anatomy.
- Avoid magenta highlights on joints, eyes, or siphon effects.

## Reference Search Terms

- deep sea pycnogonid giant sea spider
- sea spider proboscis anatomy
- pycnogonid long legs side view
- sea spider ovigers
