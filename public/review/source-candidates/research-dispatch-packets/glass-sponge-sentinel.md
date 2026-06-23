# Research Dispatch: Glass Sponge Sentinel (glass-sponge-sentinel)

Lane: `complex-colonial-forms`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/03-complex-colonial-forms.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Glass Sponge Sentinel (glass-sponge-sentinel)
Lane: complex-colonial-forms
Current source status: needs-review
Has source image: true

Gameplay verb:
Sessile lane-control sentinel: bait the aim, dodge the brittle needle cone, then punish the exposed recharge window.

Biological anchors:
- Glass sponges / Hexactinellida: rigid silica lattice body, vase or barrel silhouette, deep-water filter-feeder posture.
- Venus flower basket cues: woven cage ribs, cross-braced spicule grid, translucent mineral-white skeleton.
- Osculum and pump anatomy: a large central throat that visibly inhales, compresses, then vents the attack direction.
- Siliceous spicules as defense: brittle needle bundles, star-like spicule clusters, and glassy spear cones that feel organic, not metallic.
- Deep sponge reef habitat logic: sessile sentinel anchored to rock, dangerous because it controls approach lanes rather than chasing.

Required visual read:
- One vase-like glass sponge organism, not a generic coral fan or separate sponge colony.
- Large central osculum throat is the first danger read.
- Bold cross-braced lattice ribs remain readable at game scale rather than dissolving into lace noise.
- Needle-cone petals and rim spicules are thick enough to crop and articulate.
- Anchored base, throat, rim, and needle petals share one lighting and material language.

Articulatable parts:
- root rock/base anchor
- lower stalk or foot collar
- main vase body torso
- front lattice rib group
- rear lattice rib group
- left rim plate
- right rim plate
- central osculum/throat valve head
- three brittle needle-cone petals
- outer spicule crown
- small fracture shard overlays
- separate needle-cone projectile / pressure-ring VFX

Known prompt risks:
- Avoid a generic coral fan or sea plant; it must read as one vase-like glass sponge organism.
- Avoid metal turrets, guns, cannons, crystals, or sci-fi machinery; needles are biological silica spicules.
- Avoid dense lace detail that becomes noise at sprite scale; use bold crop-safe ribs and a few large needle petals.
- Avoid multiple separate sponge colonies; generate one cohesive whole-source creature with one clear silhouette.
- Keep pure magenta only in the background and keep all anatomy fully inside the crop.

Reference search terms:
- Euplectella aspergillum glass sponge
- Hexactinellida osculum vase sponge
- deep sea glass sponge reef spicules
- Venus flower basket silica lattice

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id glass-sponge-sentinel --kind source --serve --open --visual
npm run sandbox:lab -- --id source-glass-sponge-sentinel --with diver
npm run source:approval-runway:preview -- --id glass-sponge-sentinel

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "complex-colonial-forms",
  "findings": [
    {
      "id": "glass-sponge-sentinel",
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
npm run sandbox:lab -- --id source-glass-sponge-sentinel --with diver
npm run sandbox:preview -- --id glass-sponge-sentinel --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id glass-sponge-sentinel
npm run source:next-prompt -- --id glass-sponge-sentinel
npm run source:accept -- --id glass-sponge-sentinel --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Glass sponges / Hexactinellida: rigid silica lattice body, vase or barrel silhouette, deep-water filter-feeder posture.
- Venus flower basket cues: woven cage ribs, cross-braced spicule grid, translucent mineral-white skeleton.
- Osculum and pump anatomy: a large central throat that visibly inhales, compresses, then vents the attack direction.
- Siliceous spicules as defense: brittle needle bundles, star-like spicule clusters, and glassy spear cones that feel organic, not metallic.
- Deep sponge reef habitat logic: sessile sentinel anchored to rock, dangerous because it controls approach lanes rather than chasing.

## Required Read

- One vase-like glass sponge organism, not a generic coral fan or separate sponge colony.
- Large central osculum throat is the first danger read.
- Bold cross-braced lattice ribs remain readable at game scale rather than dissolving into lace noise.
- Needle-cone petals and rim spicules are thick enough to crop and articulate.
- Anchored base, throat, rim, and needle petals share one lighting and material language.

## Articulatable Parts

- root rock/base anchor
- lower stalk or foot collar
- main vase body torso
- front lattice rib group
- rear lattice rib group
- left rim plate
- right rim plate
- central osculum/throat valve head
- three brittle needle-cone petals
- outer spicule crown
- small fracture shard overlays
- separate needle-cone projectile / pressure-ring VFX

## Prompt Risks

- Avoid a generic coral fan or sea plant; it must read as one vase-like glass sponge organism.
- Avoid metal turrets, guns, cannons, crystals, or sci-fi machinery; needles are biological silica spicules.
- Avoid dense lace detail that becomes noise at sprite scale; use bold crop-safe ribs and a few large needle petals.
- Avoid multiple separate sponge colonies; generate one cohesive whole-source creature with one clear silhouette.
- Keep pure magenta only in the background and keep all anatomy fully inside the crop.

## Reference Search Terms

- Euplectella aspergillum glass sponge
- Hexactinellida osculum vase sponge
- deep sea glass sponge reef spicules
- Venus flower basket silica lattice
