# Research Dispatch: Razor Kelp Harp (razor-kelp-harp)

Lane: `sessile-ambush-hazards`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/02-sessile-ambush-hazards.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Razor Kelp Harp (razor-kelp-harp)
Lane: sessile-ambush-hazards
Current source status: needs-review
Has source image: true

Gameplay verb:
Rooted snare hazard that fans blade-fronds into lanes, waits for the diver to cross, then snaps a cutting curtain inward.

Biological anchors:
- Bull kelp and giant kelp holdfast anatomy for a rooted base, gas bladders, and long blade-like fronds.
- Ribbon kelp motion logic for flexible straps that sway, curl, and whip without becoming tentacles.
- Sawgrass and serrated algae silhouettes for readable cutting edges at game scale.
- Seaweed camouflage behavior: passive drifting posture hides attack lanes until the telegraph.
- Epiphytic crust and small encrusting organisms for age, toughness, and reef attachment.

Required visual read:
- One cohesive kelp-like ambusher, not a loose pile of seaweed strips.
- Root holdfast and central crown are visible so the entity reads as anchored and sessile.
- Five to seven broad serrated blade-fronds create clear danger lanes at sprite scale.
- Gas bladders, hinge knots, and curled blade tips remain crop-safe for later articulation.
- No water column, sand floor, bubbles, shadows, or detached plant debris baked into the source.

Articulatable parts:
- single organic bull-kelp holdfast tissue pad
- central crown node
- left outer blade-frond
- left inner blade-frond
- front cutting blade-frond
- right inner blade-frond
- right outer blade-frond
- gas bladder cluster
- integrated serrated blade edges
- curling tip hooks
- root tendril skirt

Known prompt risks:
- Avoid thin spaghetti seaweed that cannot be cropped or rigged.
- Avoid a generic plant clump; the holdfast, crown, and blade lanes must define one creature.
- Avoid magenta, hot pink, or purple body colors that may key out with the background.
- Avoid loose detached strips or floating debris that look like separate props.
- Keep slash trails, bubbles, and water distortion as separate VFX rather than baked art.

Reference search terms:
- bull kelp holdfast anatomy
- giant kelp gas bladder pneumatocyst
- ribbon kelp blade morphology
- serrated algae edge
- kelp forest holdfast fronds

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id razor-kelp-harp --kind source --serve --open --visual
npm run sandbox:lab -- --id source-razor-kelp-harp --with diver
npm run source:approval-runway:preview -- --id razor-kelp-harp

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "sessile-ambush-hazards",
  "findings": [
    {
      "id": "razor-kelp-harp",
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
npm run sandbox:lab -- --id source-razor-kelp-harp --with diver
npm run sandbox:preview -- --id razor-kelp-harp --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id razor-kelp-harp
npm run source:next-prompt -- --id razor-kelp-harp
npm run source:accept -- --id razor-kelp-harp --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Bull kelp and giant kelp holdfast anatomy for a rooted base, gas bladders, and long blade-like fronds.
- Ribbon kelp motion logic for flexible straps that sway, curl, and whip without becoming tentacles.
- Sawgrass and serrated algae silhouettes for readable cutting edges at game scale.
- Seaweed camouflage behavior: passive drifting posture hides attack lanes until the telegraph.
- Epiphytic crust and small encrusting organisms for age, toughness, and reef attachment.

## Required Read

- One cohesive kelp-like ambusher, not a loose pile of seaweed strips.
- Root holdfast and central crown are visible so the entity reads as anchored and sessile.
- Five to seven broad serrated blade-fronds create clear danger lanes at sprite scale.
- Gas bladders, hinge knots, and curled blade tips remain crop-safe for later articulation.
- No water column, sand floor, bubbles, shadows, or detached plant debris baked into the source.

## Articulatable Parts

- single organic bull-kelp holdfast tissue pad
- central crown node
- left outer blade-frond
- left inner blade-frond
- front cutting blade-frond
- right inner blade-frond
- right outer blade-frond
- gas bladder cluster
- integrated serrated blade edges
- curling tip hooks
- root tendril skirt

## Prompt Risks

- Avoid thin spaghetti seaweed that cannot be cropped or rigged.
- Avoid a generic plant clump; the holdfast, crown, and blade lanes must define one creature.
- Avoid magenta, hot pink, or purple body colors that may key out with the background.
- Avoid loose detached strips or floating debris that look like separate props.
- Keep slash trails, bubbles, and water distortion as separate VFX rather than baked art.

## Reference Search Terms

- bull kelp holdfast anatomy
- giant kelp gas bladder pneumatocyst
- ribbon kelp blade morphology
- serrated algae edge
- kelp forest holdfast fronds
