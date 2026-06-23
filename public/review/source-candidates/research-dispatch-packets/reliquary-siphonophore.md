# Research Dispatch: Reliquary Siphonophore (reliquary-siphonophore)

Lane: `complex-colonial-forms`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/03-complex-colonial-forms.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Reliquary Siphonophore (reliquary-siphonophore)
Lane: complex-colonial-forms
Current source status: needs-review
Has source image: true

Gameplay verb:
Vertical tripwire colony: thread the safe gap, avoid the stinging curtain pulse, then punish the dim reload window.

Biological anchors:
- Siphonophore colony logic: one animal-like colony made from specialized zooids, not a swarm of unrelated jellyfish.
- Portuguese man-of-war and deep siphonophore cues: float/crest, nectophore bells, feeding polyps, and long stinging tentilla.
- Chandelier silhouette: a clear upper float, central living chain, hanging bead organs, and three to five broad readable tripwire tendrils.
- Bioluminescent lure organs and pulsing zooid beads for telegraph clarity.
- Cnidocyte sting behavior: fine biological harpoons implied through glowing tentilla tips, not metal hooks or wires.

Required visual read:
- One cohesive whole-source organism on pure #ff00ff magenta, centered with generous crop margin.
- Vertical chandelier or reliquary colony with a clear top, spine, bell clusters, and dangling hazard zone.
- Tripwire tendrils are broad enough to crop, rig, and see at 64px; avoid hair-thin jelly threads.
- Safe gap is visually plausible: tendrils hang in separate arcs rather than one opaque curtain.
- Ruin/reliquary flavor stays organic shell, glass, and pearl shapes, not a literal lantern, cage, or metal object.

Articulatable parts:
- top gas float / crest
- central colony spine torso
- stacked nectophore bell clusters
- left lateral bell fin
- right lateral bell fin
- connected zooid/bract chain with visible membranes
- front feeding polyp cluster
- rear feeding polyp cluster
- four broad tripwire tendrils with bulb tips
- anatomical lure bead
- sting-tip bead anatomy
- separate tripwire pulse / contact spark VFX

Known prompt risks:
- Avoid a generic jellyfish umbrella; require siphonophore colony structure with float, bells, zooids, and tendrils.
- Avoid loose collage parts; all visible anatomy must belong to one continuous whole-source organism.
- Avoid hair-thin tentacles that cannot be cropped or socketed; use a few broad readable tripwire tendrils.
- Avoid literal metal chandeliers, cages, church relics, candles, or jewelry.
- Keep glow, sting pulses, and contact sparks as separate VFX so they do not cover the base anatomy.
- Keep pure magenta only in the background; avoid magenta internal glow that breaks chroma keying.

Reference search terms:
- deep sea siphonophore nectophore colony
- Marrus orthocanna siphonophore
- Apolemia siphonophore chain
- Portuguese man o war tentilla cnidocytes

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id reliquary-siphonophore --kind source --serve --open --visual
npm run sandbox:lab -- --id source-reliquary-siphonophore --with diver
npm run source:approval-runway:preview -- --id reliquary-siphonophore

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "complex-colonial-forms",
  "findings": [
    {
      "id": "reliquary-siphonophore",
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
npm run sandbox:lab -- --id source-reliquary-siphonophore --with diver
npm run sandbox:preview -- --id reliquary-siphonophore --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id reliquary-siphonophore
npm run source:next-prompt -- --id reliquary-siphonophore
npm run source:accept -- --id reliquary-siphonophore --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Siphonophore colony logic: one animal-like colony made from specialized zooids, not a swarm of unrelated jellyfish.
- Portuguese man-of-war and deep siphonophore cues: float/crest, nectophore bells, feeding polyps, and long stinging tentilla.
- Chandelier silhouette: a clear upper float, central living chain, hanging bead organs, and three to five broad readable tripwire tendrils.
- Bioluminescent lure organs and pulsing zooid beads for telegraph clarity.
- Cnidocyte sting behavior: fine biological harpoons implied through glowing tentilla tips, not metal hooks or wires.

## Required Read

- One cohesive whole-source organism on pure #ff00ff magenta, centered with generous crop margin.
- Vertical chandelier or reliquary colony with a clear top, spine, bell clusters, and dangling hazard zone.
- Tripwire tendrils are broad enough to crop, rig, and see at 64px; avoid hair-thin jelly threads.
- Safe gap is visually plausible: tendrils hang in separate arcs rather than one opaque curtain.
- Ruin/reliquary flavor stays organic shell, glass, and pearl shapes, not a literal lantern, cage, or metal object.

## Articulatable Parts

- top gas float / crest
- central colony spine torso
- stacked nectophore bell clusters
- left lateral bell fin
- right lateral bell fin
- connected zooid/bract chain with visible membranes
- front feeding polyp cluster
- rear feeding polyp cluster
- four broad tripwire tendrils with bulb tips
- anatomical lure bead
- sting-tip bead anatomy
- separate tripwire pulse / contact spark VFX

## Prompt Risks

- Avoid a generic jellyfish umbrella; require siphonophore colony structure with float, bells, zooids, and tendrils.
- Avoid loose collage parts; all visible anatomy must belong to one continuous whole-source organism.
- Avoid hair-thin tentacles that cannot be cropped or socketed; use a few broad readable tripwire tendrils.
- Avoid literal metal chandeliers, cages, church relics, candles, or jewelry.
- Keep glow, sting pulses, and contact sparks as separate VFX so they do not cover the base anatomy.
- Keep pure magenta only in the background; avoid magenta internal glow that breaks chroma keying.

## Reference Search Terms

- deep sea siphonophore nectophore colony
- Marrus orthocanna siphonophore
- Apolemia siphonophore chain
- Portuguese man o war tentilla cnidocytes
