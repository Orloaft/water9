# Research Dispatch: Coronate Sting Crown (coronate-sting-crown)

Lane: `sessile-ambush-hazards`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/02-sessile-ambush-hazards.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Coronate Sting Crown (coronate-sting-crown)
Lane: sessile-ambush-hazards
Current source status: needs-review
Has source image: true

Gameplay verb:
Pulsing cnidarian hazard that expands its crown, sweeps thick oral arms, and releases a radial sting burst after a readable bell contraction.

Biological anchors:
- Coronate jellyfish bell anatomy with a deep groove separating the domed top from the lappet crown.
- Atolla-like deep-sea warning read: compact red-black bell, rim lappets, and bioluminescent alarm accents.
- Scyphozoan oral arms and trailing tentacles for sweeping contact damage and follow-through animation.
- Cnidocyte sting logic expressed through glowing bead tips and armed tentacle edges rather than weapons.
- Jetting bell contraction for short burst movement and recoil windows.

Required visual read:
- One cohesive jellyfish organism, not a swarm or decorative cluster.
- Crown-shaped lappet rim and domed bell are the first read at game scale.
- Oral arms are thick, separated, and crop-safe for articulation.
- Tentacle danger zone is visible without becoming a hair-thin curtain.
- Bioluminescent sting cues stay on anatomy, with no baked bubbles, haze, water column, or impact particles.

Articulatable parts:
- domed bell cap
- lower bell skirt
- segmented crown lappets
- central oral trunk
- front oral arm
- left oral arm
- right oral arm
- rear oral arms
- four thick trailing tentacles
- sting bead tip cluster
- subtle translucent bell rim anatomy

Known prompt risks:
- Avoid a generic umbrella jellyfish; crown lappets and deep bell groove must be obvious.
- Avoid hair-thin tentacle noise that cannot be cut or rigged.
- Avoid magenta, pink, or purple body colors that conflict with chroma keying.
- Avoid multiple jellyfish or a decorative swarm.
- Keep sting flashes, shock rings, and bubbles as separate VFX rather than baked source art.

Reference search terms:
- coronate jellyfish lappets
- Atolla jellyfish alarm bioluminescence
- scyphozoan oral arms
- jellyfish bell contraction jet propulsion
- cnidocyte tentacle anatomy

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id coronate-sting-crown --kind source --serve --open --visual
npm run sandbox:lab -- --id source-coronate-sting-crown --with diver
npm run source:approval-runway:preview -- --id coronate-sting-crown

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "sessile-ambush-hazards",
  "findings": [
    {
      "id": "coronate-sting-crown",
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
npm run sandbox:lab -- --id source-coronate-sting-crown --with diver
npm run sandbox:preview -- --id coronate-sting-crown --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id coronate-sting-crown
npm run source:next-prompt -- --id coronate-sting-crown
npm run source:accept -- --id coronate-sting-crown --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Coronate jellyfish bell anatomy with a deep groove separating the domed top from the lappet crown.
- Atolla-like deep-sea warning read: compact red-black bell, rim lappets, and bioluminescent alarm accents.
- Scyphozoan oral arms and trailing tentacles for sweeping contact damage and follow-through animation.
- Cnidocyte sting logic expressed through glowing bead tips and armed tentacle edges rather than weapons.
- Jetting bell contraction for short burst movement and recoil windows.

## Required Read

- One cohesive jellyfish organism, not a swarm or decorative cluster.
- Crown-shaped lappet rim and domed bell are the first read at game scale.
- Oral arms are thick, separated, and crop-safe for articulation.
- Tentacle danger zone is visible without becoming a hair-thin curtain.
- Bioluminescent sting cues stay on anatomy, with no baked bubbles, haze, water column, or impact particles.

## Articulatable Parts

- domed bell cap
- lower bell skirt
- segmented crown lappets
- central oral trunk
- front oral arm
- left oral arm
- right oral arm
- rear oral arms
- four thick trailing tentacles
- sting bead tip cluster
- subtle translucent bell rim anatomy

## Prompt Risks

- Avoid a generic umbrella jellyfish; crown lappets and deep bell groove must be obvious.
- Avoid hair-thin tentacle noise that cannot be cut or rigged.
- Avoid magenta, pink, or purple body colors that conflict with chroma keying.
- Avoid multiple jellyfish or a decorative swarm.
- Keep sting flashes, shock rings, and bubbles as separate VFX rather than baked source art.

## Reference Search Terms

- coronate jellyfish lappets
- Atolla jellyfish alarm bioluminescence
- scyphozoan oral arms
- jellyfish bell contraction jet propulsion
- cnidocyte tentacle anatomy
