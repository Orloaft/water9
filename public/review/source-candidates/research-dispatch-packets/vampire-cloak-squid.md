# Research Dispatch: Vampire Cloak Squid (vampire-cloak-squid)

Lane: `mobile-predator-motion`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/01-mobile-predator-motion.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Vampire Cloak Squid (vampire-cloak-squid)
Lane: mobile-predator-motion
Current source status: needs-review
Has source image: true

Gameplay verb:
Cephalopod feint attacker that cloaks into a spined umbrella, flashes photophores, then snaps its arms outward for a short-range grab.

Biological anchors:
- Vampire squid cloak webbing connecting the arms into an umbrella-like defensive mantle.
- Eight arm structure with cirri and soft spines for a threatening but organic silhouette.
- Large blue eyes and compact mantle for immediate cephalopod recognition.
- Photophores on arm tips and mantle as readable telegraph lights.
- Inside-out pineapple posture for a defensive phase that changes silhouette before attack.

Required visual read:
- One whole cephalopod with mantle, eyes, arms, and webbing clearly connected.
- Cloak web and arm crown are the main gameplay read, not loose tentacles.
- Eight arms are grouped into riggable clusters without becoming a tangled mass.
- Photophore spots are visible but do not cover the anatomy.
- No ink cloud, particles, water background, shadows, or cropped-off arms baked into the source.

Articulatable parts:
- compact dark mantle body
- large pale left eye
- large pale right eye
- broad cloak web membrane
- front webbed arm pair
- left webbed arm pair
- right webbed arm pair
- rear webbed arm pair
- soft arm spine and cirri fringe
- cyan photophore tip lights
- small mantle fin pair
- central mouth and beak shadow

Known prompt risks:
- Avoid bat wings, fangs, capes, or humanoid vampire styling; keep it biological.
- Avoid squid tentacle tangles that obscure the eight-arm cloak structure.
- Avoid magenta or pink photophores that conflict with the background.
- Avoid a giant octopus silhouette; compact mantle and webbed arms should identify vampire squid.
- Keep ink, flash bursts, and stun effects separate from the base anatomy.

Reference search terms:
- Vampyroteuthis infernalis webbed arms
- vampire squid pineapple posture
- vampire squid cirri photophores
- vampire squid side view

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id vampire-cloak-squid --kind source --serve --open --visual
npm run sandbox:lab -- --id source-vampire-cloak-squid --with diver
npm run source:approval-runway:preview -- --id vampire-cloak-squid

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
  "findings": [
    {
      "id": "vampire-cloak-squid",
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
npm run sandbox:lab -- --id source-vampire-cloak-squid --with diver
npm run sandbox:preview -- --id vampire-cloak-squid --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id vampire-cloak-squid
npm run source:next-prompt -- --id vampire-cloak-squid
npm run source:accept -- --id vampire-cloak-squid --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Vampire squid cloak webbing connecting the arms into an umbrella-like defensive mantle.
- Eight arm structure with cirri and soft spines for a threatening but organic silhouette.
- Large blue eyes and compact mantle for immediate cephalopod recognition.
- Photophores on arm tips and mantle as readable telegraph lights.
- Inside-out pineapple posture for a defensive phase that changes silhouette before attack.

## Required Read

- One whole cephalopod with mantle, eyes, arms, and webbing clearly connected.
- Cloak web and arm crown are the main gameplay read, not loose tentacles.
- Eight arms are grouped into riggable clusters without becoming a tangled mass.
- Photophore spots are visible but do not cover the anatomy.
- No ink cloud, particles, water background, shadows, or cropped-off arms baked into the source.

## Articulatable Parts

- compact dark mantle body
- large pale left eye
- large pale right eye
- broad cloak web membrane
- front webbed arm pair
- left webbed arm pair
- right webbed arm pair
- rear webbed arm pair
- soft arm spine and cirri fringe
- cyan photophore tip lights
- small mantle fin pair
- central mouth and beak shadow

## Prompt Risks

- Avoid bat wings, fangs, capes, or humanoid vampire styling; keep it biological.
- Avoid squid tentacle tangles that obscure the eight-arm cloak structure.
- Avoid magenta or pink photophores that conflict with the background.
- Avoid a giant octopus silhouette; compact mantle and webbed arms should identify vampire squid.
- Keep ink, flash bursts, and stun effects separate from the base anatomy.

## Reference Search Terms

- Vampyroteuthis infernalis webbed arms
- vampire squid pineapple posture
- vampire squid cirri photophores
- vampire squid side view
