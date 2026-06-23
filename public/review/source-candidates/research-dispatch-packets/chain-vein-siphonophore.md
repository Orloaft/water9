# Research Dispatch: Chain Vein Siphonophore (chain-vein-siphonophore)

Lane: `complex-colonial-forms`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/03-complex-colonial-forms.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Chain Vein Siphonophore (chain-vein-siphonophore)
Lane: complex-colonial-forms
Current source status: needs-review
Has source image: true

Gameplay verb:
Living tripwire colony that unfolds from a compact soft colony curl, stretches stinging lines across a lane, then contracts its feeding polyps inward toward the player.

Biological anchors:
- Siphonophore colony body plan made of specialized zooids rather than a single jelly bell.
- Nectophore swimming bells arranged along a central stem for segmented propulsion.
- Feeding polyps and bracts clustered beneath the stem for a visible predatory center.
- Long tentilla with cnidocyte batteries represented as bead-like sting nodes.
- Praya and Apolemia-like open-water chain silhouette with flexible colony articulation.

Required visual read:
- One continuous colonial organism, not separate beads or loose jellyfish pieces.
- Continuous soft colony stem, swimming bells, feeding cluster, and stinging lines are all visible.
- Tripwire tendrils are few, broad, and separated enough to rig.
- The safe gap between hanging lines remains readable at sprite scale.
- All anatomy stays isolated on pure magenta with no water haze, shadows, plankton, or baked glow clouds.

Articulatable parts:
- front float bract
- continuous soft colony stem
- upper nectophore bell pair
- middle nectophore bell pair
- lower nectophore bell pair
- left shield bract
- right shield bract
- feeding polyp cluster
- four broad stinging tendrils
- tentilla bead nodes
- terminal lure bulb
- sting bead tissue accents

Known prompt risks:
- Avoid making it a single jellyfish umbrella; it must read as a siphonophore colony.
- Avoid detached beads or pearls that do not connect to the central stem.
- Avoid literal chains, wires, hooks, or mechanical trip mines.
- Avoid overly thin tendrils that disappear at 64px.
- Keep pure magenta only in the background and avoid magenta internal glow.
- Keep electric arcs and contact sparks separate from the base sprite.

Reference search terms:
- Praya dubia siphonophore colony
- Apolemia uvaria siphonophore chain
- siphonophore nectophore stem zooids
- siphonophore tentilla cnidocyte batteries

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id chain-vein-siphonophore --kind source --serve --open --visual
npm run sandbox:lab -- --id source-chain-vein-siphonophore --with diver
npm run source:approval-runway:preview -- --id chain-vein-siphonophore

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "complex-colonial-forms",
  "findings": [
    {
      "id": "chain-vein-siphonophore",
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
npm run sandbox:lab -- --id source-chain-vein-siphonophore --with diver
npm run sandbox:preview -- --id chain-vein-siphonophore --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id chain-vein-siphonophore
npm run source:next-prompt -- --id chain-vein-siphonophore
npm run source:accept -- --id chain-vein-siphonophore --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Siphonophore colony body plan made of specialized zooids rather than a single jelly bell.
- Nectophore swimming bells arranged along a central stem for segmented propulsion.
- Feeding polyps and bracts clustered beneath the stem for a visible predatory center.
- Long tentilla with cnidocyte batteries represented as bead-like sting nodes.
- Praya and Apolemia-like open-water chain silhouette with flexible colony articulation.

## Required Read

- One continuous colonial organism, not separate beads or loose jellyfish pieces.
- Continuous soft colony stem, swimming bells, feeding cluster, and stinging lines are all visible.
- Tripwire tendrils are few, broad, and separated enough to rig.
- The safe gap between hanging lines remains readable at sprite scale.
- All anatomy stays isolated on pure magenta with no water haze, shadows, plankton, or baked glow clouds.

## Articulatable Parts

- front float bract
- continuous soft colony stem
- upper nectophore bell pair
- middle nectophore bell pair
- lower nectophore bell pair
- left shield bract
- right shield bract
- feeding polyp cluster
- four broad stinging tendrils
- tentilla bead nodes
- terminal lure bulb
- sting bead tissue accents

## Prompt Risks

- Avoid making it a single jellyfish umbrella; it must read as a siphonophore colony.
- Avoid detached beads or pearls that do not connect to the central stem.
- Avoid literal chains, wires, hooks, or mechanical trip mines.
- Avoid overly thin tendrils that disappear at 64px.
- Keep pure magenta only in the background and avoid magenta internal glow.
- Keep electric arcs and contact sparks separate from the base sprite.

## Reference Search Terms

- Praya dubia siphonophore colony
- Apolemia uvaria siphonophore chain
- siphonophore nectophore stem zooids
- siphonophore tentilla cnidocyte batteries
