# Research Dispatch: Predatory Tunicate Maw (predatory-tunicate-maw)

Lane: `sessile-ambush-hazards`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/02-sessile-ambush-hazards.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Predatory Tunicate Maw (predatory-tunicate-maw)
Lane: sessile-ambush-hazards
Current source status: needs-review
Has source image: true

Gameplay verb:
Sessile soft-bodied snap trap that poses as a harmless stalk, opens a translucent mouth, and clamps shut when the diver crosses its bite lane.

Biological anchors:
- Megalodicopia-like predatory tunicate with a soft stalk and large paired siphon mouth.
- Ascidiacean tunic texture: translucent gelatin body, ridged lips, and internal filtering folds.
- Sessile hardground anchoring with a flexible stalk instead of active swimming.
- Siphon feeding behavior exaggerated into a clamp-trap read.
- Deep-sea soft-bodied translucency with visible internal organs for vulnerability cues.

Required visual read:
- One rooted soft-bodied tunicate creature, not a plant, clam, or anemone.
- Large open siphon mouth is the first danger read.
- Upper and lower mouth lobes are thick and separated for hinge animation.
- Stalk, anchor foot, tunic body, and internal folds remain connected as one organism.
- No surrounding rock wall, sediment, prey fish, particles, or shadows baked into the source.

Articulatable parts:
- anchor foot pad
- flexible stalk
- main translucent tunic body
- upper siphon jaw lobe
- lower siphon jaw lobe
- left lip ridge
- right lip ridge
- inner filter fold fan
- internal organ sac
- small side siphon
- rim toothlike papillae
- soft siphon lip membrane

Known prompt risks:
- Avoid making it a clam, venus flytrap plant, or fantasy mouth monster; preserve tunicate softness and siphon anatomy.
- Avoid hard teeth, bones, metal jaws, or mechanical hinges.
- Avoid transparency so faint that the silhouette disappears at game scale.
- Avoid magenta, hot pink, or purple body tones that interfere with chroma keying.
- Keep mucus strands, bite impacts, and prey silhouettes as separate VFX.

Reference search terms:
- Megalodicopia predatory tunicate
- ascidian siphon anatomy
- tunicate gelatinous tunic
- deep sea predatory tunicate stalk
- sea squirt internal folds

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id predatory-tunicate-maw --kind source --serve --open --visual
npm run sandbox:lab -- --id source-predatory-tunicate-maw --with diver
npm run source:approval-runway:preview -- --id predatory-tunicate-maw

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "sessile-ambush-hazards",
  "findings": [
    {
      "id": "predatory-tunicate-maw",
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
npm run sandbox:lab -- --id source-predatory-tunicate-maw --with diver
npm run sandbox:preview -- --id predatory-tunicate-maw --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id predatory-tunicate-maw
npm run source:next-prompt -- --id predatory-tunicate-maw
npm run source:accept -- --id predatory-tunicate-maw --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Megalodicopia-like predatory tunicate with a soft stalk and large paired siphon mouth.
- Ascidiacean tunic texture: translucent gelatin body, ridged lips, and internal filtering folds.
- Sessile hardground anchoring with a flexible stalk instead of active swimming.
- Siphon feeding behavior exaggerated into a clamp-trap read.
- Deep-sea soft-bodied translucency with visible internal organs for vulnerability cues.

## Required Read

- One rooted soft-bodied tunicate creature, not a plant, clam, or anemone.
- Large open siphon mouth is the first danger read.
- Upper and lower mouth lobes are thick and separated for hinge animation.
- Stalk, anchor foot, tunic body, and internal folds remain connected as one organism.
- No surrounding rock wall, sediment, prey fish, particles, or shadows baked into the source.

## Articulatable Parts

- anchor foot pad
- flexible stalk
- main translucent tunic body
- upper siphon jaw lobe
- lower siphon jaw lobe
- left lip ridge
- right lip ridge
- inner filter fold fan
- internal organ sac
- small side siphon
- rim toothlike papillae
- soft siphon lip membrane

## Prompt Risks

- Avoid making it a clam, venus flytrap plant, or fantasy mouth monster; preserve tunicate softness and siphon anatomy.
- Avoid hard teeth, bones, metal jaws, or mechanical hinges.
- Avoid transparency so faint that the silhouette disappears at game scale.
- Avoid magenta, hot pink, or purple body tones that interfere with chroma keying.
- Keep mucus strands, bite impacts, and prey silhouettes as separate VFX.

## Reference Search Terms

- Megalodicopia predatory tunicate
- ascidian siphon anatomy
- tunicate gelatinous tunic
- deep sea predatory tunicate stalk
- sea squirt internal folds
