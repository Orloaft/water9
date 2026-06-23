# Research Dispatch: Abyssal Lantern Mantis (abyssal-lantern-mantis)

Lane: `mobile-predator-motion`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/01-mobile-predator-motion.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Abyssal Lantern Mantis (abyssal-lantern-mantis)
Lane: mobile-predator-motion
Current source status: needs-review
Has source image: true

Gameplay verb:
Burst striker that locks on with lantern eye spots, coils its raptorial arms, then releases a fast straight-line punch.

Biological anchors:
- Mantis shrimp raptorial appendages for spring-loaded striking arms and saddle-like joints.
- Stomatopod segmented thorax and plated abdomen for a colorful but armored arthropod read.
- Deep reef and cave predator cues with reduced color saturation, luminous eye spots, and tactile antennae.
- Spearer and smasher mantis shrimp behaviors blended into one readable attack telegraph.
- Compound eye stalk anatomy for a rotating aim signal without adding machinery.

Required visual read:
- One full-body mantis-shrimp-like predator with clear head, torso, abdomen, and tail fan.
- Coiled raptorial arms are the first danger read and must show punch direction.
- Eye stalks, antennae, strike arms, walking limbs, and tail fan need crop-safe separation.
- The creature should feel biological and crustacean, not a robot, gun, or armored fish.
- No punch streaks, shock rings, cave wall, bubbles, shadows, or light cones baked into the source.

Articulatable parts:
- plated forward head carapace
- left raised compound eye stalk
- right raised compound eye stalk
- left long antenna whip
- right long antenna whip
- compressed thorax torso plates
- left folded raptorial strike arm
- right folded raptorial strike arm
- small underside walking limb cluster
- rear segmented abdomen chain
- broad stabilizing tail fan
- cyan lantern eye glow overlays

Known prompt risks:
- Avoid robotic boxing gloves, cannons, drills, or mechanical pistons.
- Avoid tropical rainbow saturation that fights the abyssal threat tone.
- Avoid fish-like fins replacing the crustacean legs and plated abdomen.
- Avoid making the eye glow magenta or hot pink.
- Keep punch trails, shock rings, and aim beams as separate VFX.

Reference search terms:
- mantis shrimp raptorial appendage folded
- stomatopod meral saddle anatomy
- mantis shrimp eye stalks
- mantis shrimp tail fan side view

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id abyssal-lantern-mantis --kind source --serve --open --visual
npm run sandbox:lab -- --id source-abyssal-lantern-mantis --with diver
npm run source:approval-runway:preview -- --id abyssal-lantern-mantis

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
  "findings": [
    {
      "id": "abyssal-lantern-mantis",
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
npm run sandbox:lab -- --id source-abyssal-lantern-mantis --with diver
npm run sandbox:preview -- --id abyssal-lantern-mantis --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id abyssal-lantern-mantis
npm run source:next-prompt -- --id abyssal-lantern-mantis
npm run source:accept -- --id abyssal-lantern-mantis --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Mantis shrimp raptorial appendages for spring-loaded striking arms and saddle-like joints.
- Stomatopod segmented thorax and plated abdomen for a colorful but armored arthropod read.
- Deep reef and cave predator cues with reduced color saturation, luminous eye spots, and tactile antennae.
- Spearer and smasher mantis shrimp behaviors blended into one readable attack telegraph.
- Compound eye stalk anatomy for a rotating aim signal without adding machinery.

## Required Read

- One full-body mantis-shrimp-like predator with clear head, torso, abdomen, and tail fan.
- Coiled raptorial arms are the first danger read and must show punch direction.
- Eye stalks, antennae, strike arms, walking limbs, and tail fan need crop-safe separation.
- The creature should feel biological and crustacean, not a robot, gun, or armored fish.
- No punch streaks, shock rings, cave wall, bubbles, shadows, or light cones baked into the source.

## Articulatable Parts

- plated forward head carapace
- left raised compound eye stalk
- right raised compound eye stalk
- left long antenna whip
- right long antenna whip
- compressed thorax torso plates
- left folded raptorial strike arm
- right folded raptorial strike arm
- small underside walking limb cluster
- rear segmented abdomen chain
- broad stabilizing tail fan
- cyan lantern eye glow overlays

## Prompt Risks

- Avoid robotic boxing gloves, cannons, drills, or mechanical pistons.
- Avoid tropical rainbow saturation that fights the abyssal threat tone.
- Avoid fish-like fins replacing the crustacean legs and plated abdomen.
- Avoid making the eye glow magenta or hot pink.
- Keep punch trails, shock rings, and aim beams as separate VFX.

## Reference Search Terms

- mantis shrimp raptorial appendage folded
- stomatopod meral saddle anatomy
- mantis shrimp eye stalks
- mantis shrimp tail fan side view
