# Research Dispatch: Lantern Anemone Pit (lantern-anemone-pit)

Lane: `sessile-ambush-hazards`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/02-sessile-ambush-hazards.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Lantern Anemone Pit (lantern-anemone-pit)
Lane: sessile-ambush-hazards
Current source status: needs-review
Has source image: true

Gameplay verb:
Sessile lure ambusher that opens as a harmless flower, flashes lure polyps, then clamps a ring of stinging petals around nearby prey.

Biological anchors:
- Sea anemone oral disc anatomy for a central mouth, radial tentacles, and soft column base.
- Tube anemone and cerianthid cues for retractable petal rings and burrow-like anchoring.
- Bioluminescent lure organs inspired by deep reef predators for a readable bait signal.
- Cnidarian stinging tentacles for contact danger without mechanical teeth.
- Corallimorph mushroom-anemone forms for a wide deceptive flower silhouette.

Required visual read:
- One anchored anemone organism, not a decorative coral flower cluster.
- Central mouth pit is the first danger read when open.
- Two rings of thick petal-tentacles are broad enough for sprite-scale articulation.
- Lure bulbs, mouth rim, column base, and outer petals are visually connected.
- Danger is communicated through clamp posture, stinging bulbs, and mouth depth rather than gore or particles.

Articulatable parts:
- buried column base
- outer pedal disc skirt
- central mouth pit
- upper lip ring
- left outer petal-tentacle
- right outer petal-tentacle
- front inner petal-tentacle
- rear inner petal-tentacle
- lure bulb cluster
- stinging bead tips
- mouth shadow insert
- retraction fold overlays

Known prompt risks:
- Avoid a cute decorative flower; it must read as a dangerous sessile predator.
- Avoid making the tentacles hair-thin or too numerous for articulation.
- Avoid literal teeth, metal jaws, or land-plant leaves.
- Avoid magenta or pink glow that conflicts with the chroma key background.
- Keep lure halos, sting sparks, and digestive clouds separate from the base source.

Reference search terms:
- sea anemone oral disc anatomy
- tube anemone cerianthid retraction
- corallimorph mushroom anemone
- cnidarian stinging tentacles
- bioluminescent anemone lure

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id lantern-anemone-pit --kind source --serve --open --visual
npm run sandbox:lab -- --id source-lantern-anemone-pit --with diver
npm run source:approval-runway:preview -- --id lantern-anemone-pit

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "sessile-ambush-hazards",
  "findings": [
    {
      "id": "lantern-anemone-pit",
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
npm run sandbox:lab -- --id source-lantern-anemone-pit --with diver
npm run sandbox:preview -- --id lantern-anemone-pit --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id lantern-anemone-pit
npm run source:next-prompt -- --id lantern-anemone-pit
npm run source:accept -- --id lantern-anemone-pit --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Sea anemone oral disc anatomy for a central mouth, radial tentacles, and soft column base.
- Tube anemone and cerianthid cues for retractable petal rings and burrow-like anchoring.
- Bioluminescent lure organs inspired by deep reef predators for a readable bait signal.
- Cnidarian stinging tentacles for contact danger without mechanical teeth.
- Corallimorph mushroom-anemone forms for a wide deceptive flower silhouette.

## Required Read

- One anchored anemone organism, not a decorative coral flower cluster.
- Central mouth pit is the first danger read when open.
- Two rings of thick petal-tentacles are broad enough for sprite-scale articulation.
- Lure bulbs, mouth rim, column base, and outer petals are visually connected.
- Danger is communicated through clamp posture, stinging bulbs, and mouth depth rather than gore or particles.

## Articulatable Parts

- buried column base
- outer pedal disc skirt
- central mouth pit
- upper lip ring
- left outer petal-tentacle
- right outer petal-tentacle
- front inner petal-tentacle
- rear inner petal-tentacle
- lure bulb cluster
- stinging bead tips
- mouth shadow insert
- retraction fold overlays

## Prompt Risks

- Avoid a cute decorative flower; it must read as a dangerous sessile predator.
- Avoid making the tentacles hair-thin or too numerous for articulation.
- Avoid literal teeth, metal jaws, or land-plant leaves.
- Avoid magenta or pink glow that conflicts with the chroma key background.
- Keep lure halos, sting sparks, and digestive clouds separate from the base source.

## Reference Search Terms

- sea anemone oral disc anatomy
- tube anemone cerianthid retraction
- corallimorph mushroom anemone
- cnidarian stinging tentacles
- bioluminescent anemone lure
