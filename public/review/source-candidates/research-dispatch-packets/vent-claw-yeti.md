# Research Dispatch: Vent-Claw Yeti (vent-claw-yeti)

Lane: `mobile-predator-motion`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/01-mobile-predator-motion.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Vent-Claw Yeti (vent-claw-yeti)
Lane: mobile-predator-motion
Current source status: needs-review
Has source image: true

Gameplay verb:
Thermal grappler that guards vent lanes, fans its bristled claws, then hooks and drags the diver toward a hot zone.

Biological anchors:
- Yeti crab / Kiwaidae inspiration with long bristled claws used for bacterial farming.
- Hydrothermal vent ecology cues: mineral staining, pale shell, and chemosynthetic filament growth.
- Squat lobster posture for a compact body with oversized articulated forelimbs.
- Crab defensive display behavior for raised claws and readable lateral threat poses.
- Deep-sea reduced-eye anatomy with tactile antennae and sensory setae.

Required visual read:
- One whole crab-like arthropod, not a furry mammal, lobster, or humanoid monster.
- Oversized bristled claws are the first read and clearly indicate grab range.
- Main carapace, abdomen tuck, legs, claws, and antennae stay connected as one riggable body.
- Bristles read as clustered biological setae, not smoke, fur clouds, or flame.
- No vent chimney, lava plume, bubbles, floor plane, cast shadow, or environmental lighting baked in.

Articulatable parts:
- main carapace torso
- abdomen tuck
- left upper claw arm
- left bristled claw hand
- right upper claw arm
- right bristled claw hand
- front walking leg pair
- middle walking leg pair
- rear walking leg pair
- left antenna
- right antenna
- setae glow overlay clusters

Known prompt risks:
- Avoid mammal-like fur; the bristles are crab setae and bacterial mats.
- Avoid a normal beach crab silhouette; emphasize deep-sea squat posture and huge farming claws.
- Avoid making the vent heat or smoke part of the body silhouette.
- Avoid thin bristles that turn into noise; use readable grouped tufts.
- Avoid magenta or pink glows inside the creature that could key out.

Reference search terms:
- Kiwa hirsuta yeti crab claws
- yeti crab setae closeup
- squat lobster lateral posture
- hydrothermal vent crab anatomy

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id vent-claw-yeti --kind source --serve --open --visual
npm run sandbox:lab -- --id source-vent-claw-yeti --with diver
npm run source:approval-runway:preview -- --id vent-claw-yeti

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
  "findings": [
    {
      "id": "vent-claw-yeti",
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
npm run sandbox:lab -- --id source-vent-claw-yeti --with diver
npm run sandbox:preview -- --id vent-claw-yeti --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id vent-claw-yeti
npm run source:next-prompt -- --id vent-claw-yeti
npm run source:accept -- --id vent-claw-yeti --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Yeti crab / Kiwaidae inspiration with long bristled claws used for bacterial farming.
- Hydrothermal vent ecology cues: mineral staining, pale shell, and chemosynthetic filament growth.
- Squat lobster posture for a compact body with oversized articulated forelimbs.
- Crab defensive display behavior for raised claws and readable lateral threat poses.
- Deep-sea reduced-eye anatomy with tactile antennae and sensory setae.

## Required Read

- One whole crab-like arthropod, not a furry mammal, lobster, or humanoid monster.
- Oversized bristled claws are the first read and clearly indicate grab range.
- Main carapace, abdomen tuck, legs, claws, and antennae stay connected as one riggable body.
- Bristles read as clustered biological setae, not smoke, fur clouds, or flame.
- No vent chimney, lava plume, bubbles, floor plane, cast shadow, or environmental lighting baked in.

## Articulatable Parts

- main carapace torso
- abdomen tuck
- left upper claw arm
- left bristled claw hand
- right upper claw arm
- right bristled claw hand
- front walking leg pair
- middle walking leg pair
- rear walking leg pair
- left antenna
- right antenna
- setae glow overlay clusters

## Prompt Risks

- Avoid mammal-like fur; the bristles are crab setae and bacterial mats.
- Avoid a normal beach crab silhouette; emphasize deep-sea squat posture and huge farming claws.
- Avoid making the vent heat or smoke part of the body silhouette.
- Avoid thin bristles that turn into noise; use readable grouped tufts.
- Avoid magenta or pink glows inside the creature that could key out.

## Reference Search Terms

- Kiwa hirsuta yeti crab claws
- yeti crab setae closeup
- squat lobster lateral posture
- hydrothermal vent crab anatomy
