# Research Dispatch: Gulper Eel Maw (gulper-eel-maw)

Lane: `mobile-predator-motion`

Status: `needs-review`
Has source: `true`
Audit file: `public/review/source-candidates/research-subagent-audits/01-mobile-predator-motion.json`

## Mission Prompt

```text
You are a Water 9 underwater-threat research subagent.

Work read-only. Do not edit files. Review this candidate's biological inspiration, gameplay verb, source-art risks, and articulation needs.

Candidate: Gulper Eel Maw (gulper-eel-maw)
Lane: mobile-predator-motion
Current source status: needs-review
Has source image: true

Gameplay verb:
Inhale ambusher that blooms a huge mouth pouch, pulls the diver into a short suction cone, then snaps shut before a deflated recovery window.

Biological anchors:
- Pelican eel and gulper eel anatomy: oversized hinged jaws, loose expandable throat pouch, tiny skull, and long whip body.
- Deep pelagic predator posture: sparse fins, black flexible skin, and a silhouette dominated by the mouth rather than armor.
- Bioluminescent tail lure behavior for a readable bait phase before the suction attack.
- Expandable buccal cavity mechanics: pouch inflates as a volume hazard, then collapses after the snap.
- Abyssal reduced-detail anatomy: small eyes, visible gill seams, and fragile ribbonlike body proportions.

Required visual read:
- One cohesive whole eel-like vertebrate, not a worm, snake, or loose floating mouth.
- Huge hinged mouth pouch is the first read and clearly indicates the inhale direction.
- Long whip tail, tiny head hinges, throat membrane, and lure tip remain connected as one riggable body.
- Jaw hoops and pouch membrane are thick enough to crop and animate at sprite scale.
- No water vortex, prey fish, bubbles, blackwater haze, floor plane, or cast shadow baked into the source.

Articulatable parts:
- upper hinged jaw hoop
- lower hinged jaw hoop
- expandable throat pouch membrane
- small skull hinge collar
- dark inner mouth plate
- narrow eel neck segment
- front ribbon body segment
- rear whip tail segment
- tail-tip lure bulb
- left tiny pectoral fin
- right tiny pectoral fin
- gill slit seam plates

Known prompt risks:
- Avoid a generic snake or leech; keep the tiny skull, huge mouth pouch, and long eel body visible.
- Avoid a detached monster mouth; all jaw and pouch structures must connect to the body.
- Avoid making suction currents part of the base sprite; pull effects should be separate VFX.
- Avoid bright magenta, hot pink, or purple anatomy that conflicts with chroma keying.
- Avoid over-detailing the black body so the hinge zones and lure remain readable.

Reference search terms:
- pelican eel mouth open
- gulper eel buccal cavity
- Eurypharynx pelecanoides anatomy
- pelican eel tail lure

Preview/review commands available to the human operator:
npm run sandbox:preview -- --id gulper-eel-maw --kind source --serve --open --visual
npm run sandbox:lab -- --id source-gulper-eel-maw --with diver
npm run source:approval-runway:preview -- --id gulper-eel-maw

Return only JSON matching this schema:
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
  "findings": [
    {
      "id": "gulper-eel-maw",
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
npm run sandbox:lab -- --id source-gulper-eel-maw --with diver
npm run sandbox:preview -- --id gulper-eel-maw --kind source --serve --open --visual
npm run source:approval-runway:preview -- --id gulper-eel-maw
npm run source:next-prompt -- --id gulper-eel-maw
npm run source:accept -- --id gulper-eel-maw --status approved --reviewed-by <human-reviewer> --note '<specific source approval note>' --source-reviewed --dry-run
```

## Biological Anchors

- Pelican eel and gulper eel anatomy: oversized hinged jaws, loose expandable throat pouch, tiny skull, and long whip body.
- Deep pelagic predator posture: sparse fins, black flexible skin, and a silhouette dominated by the mouth rather than armor.
- Bioluminescent tail lure behavior for a readable bait phase before the suction attack.
- Expandable buccal cavity mechanics: pouch inflates as a volume hazard, then collapses after the snap.
- Abyssal reduced-detail anatomy: small eyes, visible gill seams, and fragile ribbonlike body proportions.

## Required Read

- One cohesive whole eel-like vertebrate, not a worm, snake, or loose floating mouth.
- Huge hinged mouth pouch is the first read and clearly indicates the inhale direction.
- Long whip tail, tiny head hinges, throat membrane, and lure tip remain connected as one riggable body.
- Jaw hoops and pouch membrane are thick enough to crop and animate at sprite scale.
- No water vortex, prey fish, bubbles, blackwater haze, floor plane, or cast shadow baked into the source.

## Articulatable Parts

- upper hinged jaw hoop
- lower hinged jaw hoop
- expandable throat pouch membrane
- small skull hinge collar
- dark inner mouth plate
- narrow eel neck segment
- front ribbon body segment
- rear whip tail segment
- tail-tip lure bulb
- left tiny pectoral fin
- right tiny pectoral fin
- gill slit seam plates

## Prompt Risks

- Avoid a generic snake or leech; keep the tiny skull, huge mouth pouch, and long eel body visible.
- Avoid a detached monster mouth; all jaw and pouch structures must connect to the body.
- Avoid making suction currents part of the base sprite; pull effects should be separate VFX.
- Avoid bright magenta, hot pink, or purple anatomy that conflicts with chroma keying.
- Avoid over-detailing the black body so the hinge zones and lure remain readable.

## Reference Search Terms

- pelican eel mouth open
- gulper eel buccal cavity
- Eurypharynx pelecanoides anatomy
- pelican eel tail lure
