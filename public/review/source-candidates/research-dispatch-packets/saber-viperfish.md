# Research Dispatch: Saber Viperfish (saber-viperfish)

Lane: `mobile-predator-motion`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/01-mobile-predator-motion.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Saber Viperfish (saber-viperfish)
Lane: mobile-predator-motion
Current source status: needs-review
Has source image: true

Gameplay verb:
Lock-on dash striker that flashes its photophore chain, unhinges saber jaws, then commits to a fast straight impale that can be dodged and punished.

Biological anchors:
- Deep-sea viperfish anatomy: oversized recurved teeth, hinged jaws, narrow head, and long predatory body.
- Photophore rows along the belly for a sequential lock-on telegraph visible at small scale.
- Dorsal lure spine cues from bathypelagic predators, kept biological rather than mechanical.
- Needlelike fang silhouette and reflective eyes for a readable danger front.
- Fast vertical and diagonal ambush behavior from mesopelagic predators translated into a dash attack.

Required visual read:
- One whole viperfish-like vertebrate, not a barracuda, dragon, or metal spear device.
- Oversized saber teeth and unhinged jaw are the first danger read.
- Photophore belly chain, dorsal lure spine, fins, tail, and skull share one biological material language.
- Teeth are large readable fang shapes rather than many tiny noisy needles.
- No motion streaks, target reticle, bubbles, prey fish, lighting beams, or shadow baked into the source.

Articulatable parts:
- armored skull wedge
- upper saber tooth row
- lower hinged jaw plate
- dark throat cavity plate
- left reflective eye plate
- right reflective eye plate
- dorsal lure spine
- photophore belly chain
- segmented body trunk
- left pectoral fin blade
- right pectoral fin blade
- forked tail fin

Known prompt risks:
- Avoid a generic toothy fish; the jaw hinge, saber teeth, photophore chain, and dorsal lure must define it.
- Avoid too many tiny teeth that become visual noise; use fewer large crop-safe fangs.
- Avoid metal blades, harpoons, armor plating, or sci-fi weapon cues.
- Avoid baked dash trails or impact sparks that should be generated separately.
- Avoid magenta or hot pink light sources inside the creature.

Reference search terms:
- deep sea viperfish side view
- Chauliodus sloani jaw teeth
- viperfish photophores
- viperfish dorsal lure

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id saber-viperfish --kind source --serve --open --visual
npm run sandbox:lab -- --id source-saber-viperfish --with diver
npm run source:approval-runway:preview -- --id saber-viperfish

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
  "findings": [
    {
      "id": "saber-viperfish",
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
npm run sandbox:lab -- --id source-saber-viperfish --with diver
npm run sandbox:preview -- --id saber-viperfish --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id saber-viperfish
npm run source:next-prompt -- --id saber-viperfish
npm run source:accept -- --id saber-viperfish --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Deep-sea viperfish anatomy: oversized recurved teeth, hinged jaws, narrow head, and long predatory body.
- Photophore rows along the belly for a sequential lock-on telegraph visible at small scale.
- Dorsal lure spine cues from bathypelagic predators, kept biological rather than mechanical.
- Needlelike fang silhouette and reflective eyes for a readable danger front.
- Fast vertical and diagonal ambush behavior from mesopelagic predators translated into a dash attack.

## Required Read

- One whole viperfish-like vertebrate, not a barracuda, dragon, or metal spear device.
- Oversized saber teeth and unhinged jaw are the first danger read.
- Photophore belly chain, dorsal lure spine, fins, tail, and skull share one biological material language.
- Teeth are large readable fang shapes rather than many tiny noisy needles.
- No motion streaks, target reticle, bubbles, prey fish, lighting beams, or shadow baked into the source.

## Articulatable Parts

- armored skull wedge
- upper saber tooth row
- lower hinged jaw plate
- dark throat cavity plate
- left reflective eye plate
- right reflective eye plate
- dorsal lure spine
- photophore belly chain
- segmented body trunk
- left pectoral fin blade
- right pectoral fin blade
- forked tail fin

## Prompt Risks

- Avoid a generic toothy fish; the jaw hinge, saber teeth, photophore chain, and dorsal lure must define it.
- Avoid too many tiny teeth that become visual noise; use fewer large crop-safe fangs.
- Avoid metal blades, harpoons, armor plating, or sci-fi weapon cues.
- Avoid baked dash trails or impact sparks that should be generated separately.
- Avoid magenta or hot pink light sources inside the creature.

## Reference Search Terms

- deep sea viperfish side view
- Chauliodus sloani jaw teeth
- viperfish photophores
- viperfish dorsal lure
