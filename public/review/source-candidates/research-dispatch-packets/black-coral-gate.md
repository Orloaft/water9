# Research Dispatch: Black Coral Gate (black-coral-gate)

Lane: `complex-colonial-forms`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/03-complex-colonial-forms.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Black Coral Gate (black-coral-gate)
Lane: complex-colonial-forms
Current source status: needs-review
Has source image: true

Gameplay verb:
Passage-control ambusher that holds an open arch, telegraphs with glowing hinge polyps, then drops and clamps a living portcullis around the diver.

Biological anchors:
- Black coral / antipatharian branching skeletons: dark thorny axial rods with living polyps on the surface.
- Gorgonian sea fans and whip corals for a gate-like lattice that still reads as one colony.
- Coral polyp retraction and synchronized pulsing as the visual telegraph before closure.
- Basket-star or brittle-star hinge logic for flexible branching arms that fold inward without becoming mechanical.
- Encrusting ruin fauna cues: the organism may mimic an archway, but the body must remain biological, rooted, and alive.

Required visual read:
- One cohesive whole-source organism on pure magenta, not separate coral chunks glued onto stone ruins.
- Open arch / portcullis silhouette is the first read, with the bite line clearly visible at game scale.
- Left and right rooted pillars share one material language and connect through a living crown bridge.
- Crop-safe thick bars, hinge knots, root mats, and latch jaws have visible margins for later cutting.
- Danger read comes from closing thorn-bars, glowing hinge polyps, and clamp teeth, not baked-in particles or scenery.

Articulatable parts:
- left root mat
- right root mat
- left pillar trunk
- right pillar trunk
- upper crown bridge torso
- central descending portcullis bar cluster
- near folding thorn gate arm
- far folding thorn gate arm
- left hinge polyp knot
- right hinge polyp knot
- lower clamp teeth / latch spines
- glow-polyp warning overlay

Known prompt risks:
- Avoid a literal stone ruin gate with coral decoration; the gate must be the organism.
- Avoid detached bars or symmetrical prop pieces that feel assembled instead of grown.
- Avoid thin hairlike coral branches that cannot be cropped or read at game scale.
- Avoid magenta, hot pink, or purple body values that will conflict with the chroma key.
- Keep bubbles, slam VFX, rubble, sand, and lighting effects separate from the base source.

Reference search terms:
- Antipatharia black coral thorny skeleton
- black coral polyps close up
- gorgonian sea fan branching colony
- brittle star arm curling motion

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id black-coral-gate --kind source --serve --open --visual
npm run sandbox:lab -- --id source-black-coral-gate --with diver
npm run source:approval-runway:preview -- --id black-coral-gate

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "complex-colonial-forms",
  "findings": [
    {
      "id": "black-coral-gate",
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
npm run sandbox:lab -- --id source-black-coral-gate --with diver
npm run sandbox:preview -- --id black-coral-gate --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id black-coral-gate
npm run source:next-prompt -- --id black-coral-gate
npm run source:accept -- --id black-coral-gate --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Black coral / antipatharian branching skeletons: dark thorny axial rods with living polyps on the surface.
- Gorgonian sea fans and whip corals for a gate-like lattice that still reads as one colony.
- Coral polyp retraction and synchronized pulsing as the visual telegraph before closure.
- Basket-star or brittle-star hinge logic for flexible branching arms that fold inward without becoming mechanical.
- Encrusting ruin fauna cues: the organism may mimic an archway, but the body must remain biological, rooted, and alive.

## Required Read

- One cohesive whole-source organism on pure magenta, not separate coral chunks glued onto stone ruins.
- Open arch / portcullis silhouette is the first read, with the bite line clearly visible at game scale.
- Left and right rooted pillars share one material language and connect through a living crown bridge.
- Crop-safe thick bars, hinge knots, root mats, and latch jaws have visible margins for later cutting.
- Danger read comes from closing thorn-bars, glowing hinge polyps, and clamp teeth, not baked-in particles or scenery.

## Articulatable Parts

- left root mat
- right root mat
- left pillar trunk
- right pillar trunk
- upper crown bridge torso
- central descending portcullis bar cluster
- near folding thorn gate arm
- far folding thorn gate arm
- left hinge polyp knot
- right hinge polyp knot
- lower clamp teeth / latch spines
- glow-polyp warning overlay

## Prompt Risks

- Avoid a literal stone ruin gate with coral decoration; the gate must be the organism.
- Avoid detached bars or symmetrical prop pieces that feel assembled instead of grown.
- Avoid thin hairlike coral branches that cannot be cropped or read at game scale.
- Avoid magenta, hot pink, or purple body values that will conflict with the chroma key.
- Keep bubbles, slam VFX, rubble, sand, and lighting effects separate from the base source.

## Reference Search Terms

- Antipatharia black coral thorny skeleton
- black coral polyps close up
- gorgonian sea fan branching colony
- brittle star arm curling motion
