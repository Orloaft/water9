# Research Dispatch: Thorn Fan Coralline (thorn-fan-coralline)

Lane: `complex-colonial-forms`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/03-complex-colonial-forms.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Thorn Fan Coralline (thorn-fan-coralline)
Lane: complex-colonial-forms
Current source status: needs-review
Has source image: true

Gameplay verb:
Reef-like fan ambusher that disguises itself as cover, rotates into the current, then lashes thorn ribs to create a temporary damage wall.

Biological anchors:
- Gorgonian sea fan structure for a flattened branching lattice with a rooted stalk.
- Fire coral and hydroid sting cues for contact-danger polyps along the ribs.
- Crustose coralline algae for armored pink-free plating and reef-integrated growth.
- Feather star arm flexibility for fan ribs that can fold, rake, and reopen organically.
- Sea fan current-feeding posture for a believable rotate-and-spread telegraph.

Required visual read:
- One rooted fan-shaped reef organism, not background coral decoration.
- Thick thorn ribs and central stalk define the first silhouette at game scale.
- Left and right fan lobes have separable branch groups for folding and lashing.
- Stinging polyp beads sit on the ribs without becoming noisy dotted texture.
- No reef wall, seabed, lighting shaft, fish, bubbles, or baked current lines in the source.

Articulatable parts:
- rooted reef foot
- central stalk spine
- left fan lobe
- right fan lobe
- upper rib cluster
- lower rib cluster
- front thorn rake
- rear support ribs
- stinging polyp bead rows
- armored coralline plates
- fold hinge knots
- integrated warning-color wall tissue

Known prompt risks:
- Avoid background reef scenery; the fan must read as an enemy entity.
- Avoid thin lace branches that disappear at small sprite size.
- Avoid perfect ornamental symmetry that feels like a decorative logo.
- Avoid detached coral chunks or separate fan colonies.
- Keep current streaks, sting flashes, and impact sparks as separate VFX assets.

Reference search terms:
- gorgonian sea fan thick branches
- fire coral stinging polyps
- hydroid colony stinging polyps
- crustose coralline algae reef plating

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id thorn-fan-coralline --kind source --serve --open --visual
npm run sandbox:lab -- --id source-thorn-fan-coralline --with diver
npm run source:approval-runway:preview -- --id thorn-fan-coralline

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "complex-colonial-forms",
  "findings": [
    {
      "id": "thorn-fan-coralline",
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
npm run sandbox:lab -- --id source-thorn-fan-coralline --with diver
npm run sandbox:preview -- --id thorn-fan-coralline --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id thorn-fan-coralline
npm run source:next-prompt -- --id thorn-fan-coralline
npm run source:accept -- --id thorn-fan-coralline --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Gorgonian sea fan structure for a flattened branching lattice with a rooted stalk.
- Fire coral and hydroid sting cues for contact-danger polyps along the ribs.
- Crustose coralline algae for armored pink-free plating and reef-integrated growth.
- Feather star arm flexibility for fan ribs that can fold, rake, and reopen organically.
- Sea fan current-feeding posture for a believable rotate-and-spread telegraph.

## Required Read

- One rooted fan-shaped reef organism, not background coral decoration.
- Thick thorn ribs and central stalk define the first silhouette at game scale.
- Left and right fan lobes have separable branch groups for folding and lashing.
- Stinging polyp beads sit on the ribs without becoming noisy dotted texture.
- No reef wall, seabed, lighting shaft, fish, bubbles, or baked current lines in the source.

## Articulatable Parts

- rooted reef foot
- central stalk spine
- left fan lobe
- right fan lobe
- upper rib cluster
- lower rib cluster
- front thorn rake
- rear support ribs
- stinging polyp bead rows
- armored coralline plates
- fold hinge knots
- integrated warning-color wall tissue

## Prompt Risks

- Avoid background reef scenery; the fan must read as an enemy entity.
- Avoid thin lace branches that disappear at small sprite size.
- Avoid perfect ornamental symmetry that feels like a decorative logo.
- Avoid detached coral chunks or separate fan colonies.
- Keep current streaks, sting flashes, and impact sparks as separate VFX assets.

## Reference Search Terms

- gorgonian sea fan thick branches
- fire coral stinging polyps
- hydroid colony stinging polyps
- crustose coralline algae reef plating
