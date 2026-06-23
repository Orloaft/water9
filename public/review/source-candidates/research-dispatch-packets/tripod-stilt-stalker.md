# Research Dispatch: Tripod Stilt Stalker (tripod-stilt-stalker)

Lane: `mobile-predator-motion`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/01-mobile-predator-motion.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Tripod Stilt Stalker (tripod-stilt-stalker)
Lane: mobile-predator-motion
Current source status: needs-review
Has source image: true

Gameplay verb:
Stilted trap sentinel that plants three long fin rays, sweeps a sensory tripline, then hop-stabs across the safe gap with a brittle spear motion.

Biological anchors:
- Tripodfish body plan: elongated pelvic and caudal fin rays used as stilts above the seafloor.
- Abyssal benthic sit-and-wait behavior with upward-facing mouth and reduced swimming effort.
- Long pectoral sensory rays for detecting movement without needing eyes as the main read.
- Slender deep-sea fish proportions: narrow head, soft body trunk, and sparse translucent fins.
- Soft-sediment predator logic translated into a perched trap without including the seabed.

Required visual read:
- One whole tripodfish-like vertebrate, not a crab, spider, or walking machine.
- Three long stilt fin rays are the first silhouette read and clearly support the body.
- Upturned head, sensory pectoral rays, dorsal fin, body trunk, and tail stilt connect as one fish.
- Stilts and sensory rays are thick and separated enough for crop-safe articulation.
- No seabed, sand cloud, planted shadow, bubbles, particles, or floor contact marks baked into the source.

Articulatable parts:
- narrow head capsule
- upturned mouth plate
- left glassy eye spot
- right glassy eye spot
- slender body torso
- small dorsal sail fin
- left pectoral sensory ray
- right pectoral sensory ray
- left pelvic tripod stilt
- right pelvic tripod stilt
- rear caudal tripod stilt
- thin tail membrane flag

Known prompt risks:
- Avoid making the stilts look like insect legs or metal rods; they are elongated fish fin rays.
- Avoid including a floor plane or sediment mound because the source must remain isolated.
- Avoid hair-thin rays that cannot be selected, cropped, or animated cleanly.
- Avoid turning the fish into a spider silhouette; keep the head, trunk, fins, and tail readable.
- Avoid magenta, hot pink, or purple tissue near the background key color.

Reference search terms:
- tripodfish Bathypterois side view
- tripodfish fin rays
- Bathypterois grallator anatomy
- tripod fish perched posture

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id tripod-stilt-stalker --kind source --serve --open --visual
npm run sandbox:lab -- --id source-tripod-stilt-stalker --with diver
npm run source:approval-runway:preview -- --id tripod-stilt-stalker

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
  "findings": [
    {
      "id": "tripod-stilt-stalker",
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
npm run sandbox:lab -- --id source-tripod-stilt-stalker --with diver
npm run sandbox:preview -- --id tripod-stilt-stalker --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id tripod-stilt-stalker
npm run source:next-prompt -- --id tripod-stilt-stalker
npm run source:accept -- --id tripod-stilt-stalker --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Tripodfish body plan: elongated pelvic and caudal fin rays used as stilts above the seafloor.
- Abyssal benthic sit-and-wait behavior with upward-facing mouth and reduced swimming effort.
- Long pectoral sensory rays for detecting movement without needing eyes as the main read.
- Slender deep-sea fish proportions: narrow head, soft body trunk, and sparse translucent fins.
- Soft-sediment predator logic translated into a perched trap without including the seabed.

## Required Read

- One whole tripodfish-like vertebrate, not a crab, spider, or walking machine.
- Three long stilt fin rays are the first silhouette read and clearly support the body.
- Upturned head, sensory pectoral rays, dorsal fin, body trunk, and tail stilt connect as one fish.
- Stilts and sensory rays are thick and separated enough for crop-safe articulation.
- No seabed, sand cloud, planted shadow, bubbles, particles, or floor contact marks baked into the source.

## Articulatable Parts

- narrow head capsule
- upturned mouth plate
- left glassy eye spot
- right glassy eye spot
- slender body torso
- small dorsal sail fin
- left pectoral sensory ray
- right pectoral sensory ray
- left pelvic tripod stilt
- right pelvic tripod stilt
- rear caudal tripod stilt
- thin tail membrane flag

## Prompt Risks

- Avoid making the stilts look like insect legs or metal rods; they are elongated fish fin rays.
- Avoid including a floor plane or sediment mound because the source must remain isolated.
- Avoid hair-thin rays that cannot be selected, cropped, or animated cleanly.
- Avoid turning the fish into a spider silhouette; keep the head, trunk, fins, and tail readable.
- Avoid magenta, hot pink, or purple tissue near the background key color.

## Reference Search Terms

- tripodfish Bathypterois side view
- tripodfish fin rays
- Bathypterois grallator anatomy
- tripod fish perched posture
