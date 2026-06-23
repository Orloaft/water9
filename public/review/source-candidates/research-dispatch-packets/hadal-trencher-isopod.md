# Research Dispatch: Hadal Trencher Isopod (hadal-trencher-isopod)

Lane: `mobile-predator-motion`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/01-mobile-predator-motion.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Hadal Trencher Isopod (hadal-trencher-isopod)
Lane: mobile-predator-motion
Current source status: needs-review
Has source image: true

Gameplay verb:
Armored burrow ambusher that braces into the sediment, raises shield plates, then lunges in a short crushing shove.

Biological anchors:
- Giant isopod body plan with overlapping armored tergites and a curled defensive posture.
- Deep-sea scavenger cues: heavy antennae, compact legs, and blunt crushing mouthparts.
- Bathynomus-style domed carapace for a readable shield-first silhouette.
- Burrowing amphipod and isopod behavior for sudden sandline emergence without becoming a worm.
- Abyssal pressure adaptation cues through pale chitin, dark seams, and reduced eye spots.

Required visual read:
- One cohesive full-body isopod-like threat, not a generic beetle, trilobite, or crab.
- Segmented armored back is the first read, with the head and shove direction clearly visible.
- Legs, antennae, plates, and mouthparts are thick enough to crop and rig at sprite scale.
- Defensive curl and forward lunge shapes must be visually plausible from the same anatomy.
- No sand clouds, seafloor, burrow hole, shadows, haze, or loose debris baked into the source.

Articulatable parts:
- broad forward head shield
- central overlapping thorax plate stack
- rear curled abdomen plate stack
- left heavy sensory antenna
- right heavy sensory antenna
- left blunt mandible plate
- right blunt mandible plate
- front compact walking leg pair
- middle compact walking leg pair
- rear anchoring walking leg pair
- left and right side shield flanges
- rear curled tail fan plate

Known prompt risks:
- Avoid making it look like a land beetle; keep marine isopod proportions and flattened body logic.
- Avoid overly tiny legs hidden under the shell; they need to rig clearly.
- Avoid perfect trilobite symmetry or fossil styling that reads as extinct decoration.
- Avoid magenta, hot pink, or purple body colors that conflict with the chroma key.
- Keep sand burst, impact dust, and burrow opening as separate VFX rather than source art.

Reference search terms:
- Bathynomus giganteus side view
- giant isopod curled posture
- deep sea isopod pereopods
- isopod pleotelson anatomy

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id hadal-trencher-isopod --kind source --serve --open --visual
npm run sandbox:lab -- --id source-hadal-trencher-isopod --with diver
npm run source:approval-runway:preview -- --id hadal-trencher-isopod

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
  "findings": [
    {
      "id": "hadal-trencher-isopod",
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
npm run sandbox:lab -- --id source-hadal-trencher-isopod --with diver
npm run sandbox:preview -- --id hadal-trencher-isopod --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id hadal-trencher-isopod
npm run source:next-prompt -- --id hadal-trencher-isopod
npm run source:accept -- --id hadal-trencher-isopod --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Giant isopod body plan with overlapping armored tergites and a curled defensive posture.
- Deep-sea scavenger cues: heavy antennae, compact legs, and blunt crushing mouthparts.
- Bathynomus-style domed carapace for a readable shield-first silhouette.
- Burrowing amphipod and isopod behavior for sudden sandline emergence without becoming a worm.
- Abyssal pressure adaptation cues through pale chitin, dark seams, and reduced eye spots.

## Required Read

- One cohesive full-body isopod-like threat, not a generic beetle, trilobite, or crab.
- Segmented armored back is the first read, with the head and shove direction clearly visible.
- Legs, antennae, plates, and mouthparts are thick enough to crop and rig at sprite scale.
- Defensive curl and forward lunge shapes must be visually plausible from the same anatomy.
- No sand clouds, seafloor, burrow hole, shadows, haze, or loose debris baked into the source.

## Articulatable Parts

- broad forward head shield
- central overlapping thorax plate stack
- rear curled abdomen plate stack
- left heavy sensory antenna
- right heavy sensory antenna
- left blunt mandible plate
- right blunt mandible plate
- front compact walking leg pair
- middle compact walking leg pair
- rear anchoring walking leg pair
- left and right side shield flanges
- rear curled tail fan plate

## Prompt Risks

- Avoid making it look like a land beetle; keep marine isopod proportions and flattened body logic.
- Avoid overly tiny legs hidden under the shell; they need to rig clearly.
- Avoid perfect trilobite symmetry or fossil styling that reads as extinct decoration.
- Avoid magenta, hot pink, or purple body colors that conflict with the chroma key.
- Keep sand burst, impact dust, and burrow opening as separate VFX rather than source art.

## Reference Search Terms

- Bathynomus giganteus side view
- giant isopod curled posture
- deep sea isopod pereopods
- isopod pleotelson anatomy
