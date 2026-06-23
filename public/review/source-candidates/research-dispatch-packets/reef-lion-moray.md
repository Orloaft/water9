# Research Dispatch: Reef Lion Moray (reef-lion-moray)

Lane: `mobile-predator-motion`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/01-mobile-predator-motion.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Reef Lion Moray (reef-lion-moray)
Lane: mobile-predator-motion
Current source status: needs-review
Has source image: true

Gameplay verb:
Hybrid reef ambusher that flares venom fins to block escape lanes, lunges with a moray bite, then exposes its folded spine fan during recovery.

Biological anchors:
- Moray eel anatomy: elongated muscular body, blunt predatory head, hinged jaws, and gill pore rhythm.
- Lionfish and scorpionfish danger cues: venomous dorsal spines, broad pectoral fans, and striped warning pattern.
- Reef cave ambush behavior translated into a full-body source without adding a cave or rock.
- Flexible eel locomotion for coil, lunge, and recoil animation phases.
- Venomous fin display logic: expanded fins are the warning and lane-control shape, not loose decoration.

Required visual read:
- One cohesive vertebrate hybrid, not a separate eel wrapped in decorative lionfish fins.
- Moray head and flared venom spine fan are the first reads at game scale.
- Eel torso, jaws, pectoral fans, dorsal spines, tail coil, and cheek frills remain visibly connected.
- Spines and fin membranes are broad enough to crop and animate without becoming noisy feathers.
- No reef wall, cave hole, coral scenery, sand plume, shadow, bubbles, or poison cloud baked into the source.

Articulatable parts:
- blunt moray head plate
- upper hooked jaw plate
- lower hinged jaw plate
- inner bite mouth plate
- throat gill pouch
- sinuous eel torso coil
- folding dorsal venom spine fan
- left striped pectoral fan
- right striped pectoral fan
- cheek frill whisker cluster
- banded tail coil segment
- tail blade fin

Known prompt risks:
- Avoid a collage of eel plus loose lionfish fins; the hybrid must read as one continuous vertebrate.
- Avoid thin hairlike spines that disappear at sprite scale; use broad crop-safe venom rays.
- Avoid including reef scenery, cave darkness, or coral props in the isolated source.
- Avoid making the fins look like decorative wings instead of biological pectoral and dorsal fins.
- Avoid magenta, hot pink, or purple warning stripes that could interfere with keying.

Reference search terms:
- moray eel side view open mouth
- lionfish pectoral fin fan anatomy
- scorpionfish venom dorsal spines
- moray eel gill pores

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id reef-lion-moray --kind source --serve --open --visual
npm run sandbox:lab -- --id source-reef-lion-moray --with diver
npm run source:approval-runway:preview -- --id reef-lion-moray

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
  "findings": [
    {
      "id": "reef-lion-moray",
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
npm run sandbox:lab -- --id source-reef-lion-moray --with diver
npm run sandbox:preview -- --id reef-lion-moray --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id reef-lion-moray
npm run source:next-prompt -- --id reef-lion-moray
npm run source:accept -- --id reef-lion-moray --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Moray eel anatomy: elongated muscular body, blunt predatory head, hinged jaws, and gill pore rhythm.
- Lionfish and scorpionfish danger cues: venomous dorsal spines, broad pectoral fans, and striped warning pattern.
- Reef cave ambush behavior translated into a full-body source without adding a cave or rock.
- Flexible eel locomotion for coil, lunge, and recoil animation phases.
- Venomous fin display logic: expanded fins are the warning and lane-control shape, not loose decoration.

## Required Read

- One cohesive vertebrate hybrid, not a separate eel wrapped in decorative lionfish fins.
- Moray head and flared venom spine fan are the first reads at game scale.
- Eel torso, jaws, pectoral fans, dorsal spines, tail coil, and cheek frills remain visibly connected.
- Spines and fin membranes are broad enough to crop and animate without becoming noisy feathers.
- No reef wall, cave hole, coral scenery, sand plume, shadow, bubbles, or poison cloud baked into the source.

## Articulatable Parts

- blunt moray head plate
- upper hooked jaw plate
- lower hinged jaw plate
- inner bite mouth plate
- throat gill pouch
- sinuous eel torso coil
- folding dorsal venom spine fan
- left striped pectoral fan
- right striped pectoral fan
- cheek frill whisker cluster
- banded tail coil segment
- tail blade fin

## Prompt Risks

- Avoid a collage of eel plus loose lionfish fins; the hybrid must read as one continuous vertebrate.
- Avoid thin hairlike spines that disappear at sprite scale; use broad crop-safe venom rays.
- Avoid including reef scenery, cave darkness, or coral props in the isolated source.
- Avoid making the fins look like decorative wings instead of biological pectoral and dorsal fins.
- Avoid magenta, hot pink, or purple warning stripes that could interfere with keying.

## Reference Search Terms

- moray eel side view open mouth
- lionfish pectoral fin fan anatomy
- scorpionfish venom dorsal spines
- moray eel gill pores
