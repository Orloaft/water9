# Sessile Ambush Hazards

Lane: `sessile-ambush-hazards`

Focus:
Audit fixed flora/fauna hazards for a strong rooted silhouette, clear danger mouth/spine/lure read, and separation between body and environment.

Rules:
- Do not edit files directly from a research assignment.
- Keep output factual, compact, and candidate-id keyed.
- Preserve the game design verb; propose patches only when they improve source generation or articulation.
- Flag anything that risks collage-like source art, weak silhouette, or non-riggable anatomy.
- Use the candidate command blocks to turn accepted research into source art capture, validation, and sandbox preview work.

Lane source handoff:
```bash
npm run source:next-prompt -- --id brine-crown
npm run source:session -- --id brine-crown
npm run source:inbox-capture -- --id brine-crown --open
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids brine-crown,coronate-sting-crown,predatory-tunicate-maw,razor-kelp-harp,lantern-anemone-pit
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids brine-crown,coronate-sting-crown,predatory-tunicate-maw,razor-kelp-harp,lantern-anemone-pit --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids brine-crown,coronate-sting-crown,predatory-tunicate-maw,razor-kelp-harp,lantern-anemone-pit
```

Expected JSON shape:
```json
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "sessile-ambush-hazards",
  "findings": [
    {
      "id": "<candidate-id>",
      "strengths": [
        "<specific strong read>"
      ],
      "sourceGenerationRisks": [
        "<specific risk>"
      ],
      "suggestedResearchPatch": {
        "biologicalAnchors": [
          "<optional replacement/addition>"
        ],
        "requiredRead": [
          "<optional replacement/addition>"
        ],
        "promptRisks": [
          "<optional replacement/addition>"
        ],
        "motionPhases": [
          "<optional replacement/addition>"
        ]
      },
      "referenceSearchTerms": [
        "<stable biological reference keywords>"
      ]
    }
  ]
}
```

Candidates:

## Brine Crown (brine-crown)

Status: `candidate-queued`; source candidate: `needs-review`; has source: `true`
Depth band: abyssal vents / biome 3+

Gameplay verb:
Stationary area-control hazard that swells, raises spines, and grows corrosive brine patches instead of chasing the diver.

Biological anchors:
- Vent-associated chemosynthetic mats and mineral crusts for a rooted abyssal footprint.
- Starfish-like radial arm logic for readable uneven rays and outward danger lanes.
- Toxic coral and brine-pool blister cues for corrosive sacs and warning colors.
- Hydrothermal chimney forms for a central crown cup and dark toxic throat.

Required read:
- One rooted radial organism, not a collage of coral, starfish, and vent tubes.
- Central crown or toxic throat is the first read.
- Low anchored basal mat with uneven rays/fronds and visible hinge/root zones.
- Readable toxic blisters, spine halo, and corrosive danger cues at game scale.
- No loose detached parts, environmental shadows, haze, floor plane, or particles baked into the source.

Articulatable parts:
- basal mat torso
- central crown cup head
- dark throat pore
- front radial frond
- left radial frond
- right radial frond
- rear radial fronds
- brine blister bank
- spine halo cluster
- root tendril skirt

Prompt risks:
- Avoid a decorative reef; the source must read as a dangerous organism.
- Avoid perfect radial ornament symmetry that feels like a logo.
- Avoid magenta or hot pink body colors that will key out.
- Avoid loose vent tubes or starfish arms that do not grow from the same mat.
- Keep toxic clouds, bubbles, and brine puddles as separate VFX rather than baked source art.

Source handoff commands:
```bash
npm run source:next-prompt -- --id brine-crown
npm run source:session -- --id brine-crown
npm run source:inbox-capture -- --id brine-crown --open
npm run source:recover-inline -- --id brine-crown --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids brine-crown
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids brine-crown --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids brine-crown
npm run sandbox:preview -- --id brine-crown --kind source --serve --open --visual
```

## Coronate Sting Crown (coronate-sting-crown)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: mesopelagic to bathypelagic / open water ambush lanes

Gameplay verb:
Pulsing cnidarian hazard that expands its crown, sweeps thick oral arms, and releases a radial sting burst after a readable bell contraction.

Biological anchors:
- Coronate jellyfish bell anatomy with a deep groove separating the domed top from the lappet crown.
- Atolla-like deep-sea warning read: compact red-black bell, rim lappets, and bioluminescent alarm accents.
- Scyphozoan oral arms and trailing tentacles for sweeping contact damage and follow-through animation.
- Cnidocyte sting logic expressed through glowing bead tips and armed tentacle edges rather than weapons.
- Jetting bell contraction for short burst movement and recoil windows.

Required read:
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

Prompt risks:
- Avoid a generic umbrella jellyfish; crown lappets and deep bell groove must be obvious.
- Avoid hair-thin tentacle noise that cannot be cut or rigged.
- Avoid magenta, pink, or purple body colors that conflict with chroma keying.
- Avoid multiple jellyfish or a decorative swarm.
- Keep sting flashes, shock rings, and bubbles as separate VFX rather than baked source art.

Source handoff commands:
```bash
npm run source:next-prompt -- --id coronate-sting-crown
npm run source:session -- --id coronate-sting-crown
npm run source:inbox-capture -- --id coronate-sting-crown --open
npm run source:recover-inline -- --id coronate-sting-crown --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids coronate-sting-crown
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids coronate-sting-crown --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids coronate-sting-crown
npm run sandbox:preview -- --id coronate-sting-crown --kind source --serve --open --visual
```

## Predatory Tunicate Maw (predatory-tunicate-maw)

Status: `candidate-queued`; source candidate: `needs-review`; has source: `true`
Depth band: bathyal canyon walls / cold hardground

Gameplay verb:
Sessile soft-bodied snap trap that poses as a harmless stalk, opens a translucent mouth, and clamps shut when the diver crosses its bite lane.

Biological anchors:
- Megalodicopia-like predatory tunicate with a soft stalk and large paired siphon mouth.
- Ascidiacean tunic texture: translucent gelatin body, ridged lips, and internal filtering folds.
- Sessile hardground anchoring with a flexible stalk instead of active swimming.
- Siphon feeding behavior exaggerated into a clamp-trap read.
- Deep-sea soft-bodied translucency with visible internal organs for vulnerability cues.

Required read:
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

Prompt risks:
- Avoid making it a clam, venus flytrap plant, or fantasy mouth monster; preserve tunicate softness and siphon anatomy.
- Avoid hard teeth, bones, metal jaws, or mechanical hinges.
- Avoid transparency so faint that the silhouette disappears at game scale.
- Avoid magenta, hot pink, or purple body tones that interfere with chroma keying.
- Keep mucus strands, bite impacts, and prey silhouettes as separate VFX.

Source handoff commands:
```bash
npm run source:next-prompt -- --id predatory-tunicate-maw
npm run source:session -- --id predatory-tunicate-maw
npm run source:inbox-capture -- --id predatory-tunicate-maw --open
npm run source:recover-inline -- --id predatory-tunicate-maw --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids predatory-tunicate-maw
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids predatory-tunicate-maw --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids predatory-tunicate-maw
npm run sandbox:preview -- --id predatory-tunicate-maw --kind source --serve --open --visual
```

## Razor Kelp Harp (razor-kelp-harp)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: sunless kelp trench / biome 2+

Gameplay verb:
Rooted snare hazard that fans blade-fronds into lanes, waits for the diver to cross, then snaps a cutting curtain inward.

Biological anchors:
- Bull kelp and giant kelp holdfast anatomy for a rooted base, gas bladders, and long blade-like fronds.
- Ribbon kelp motion logic for flexible straps that sway, curl, and whip without becoming tentacles.
- Sawgrass and serrated algae silhouettes for readable cutting edges at game scale.
- Seaweed camouflage behavior: passive drifting posture hides attack lanes until the telegraph.
- Epiphytic crust and small encrusting organisms for age, toughness, and reef attachment.

Required read:
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

Prompt risks:
- Avoid thin spaghetti seaweed that cannot be cropped or rigged.
- Avoid a generic plant clump; the holdfast, crown, and blade lanes must define one creature.
- Avoid magenta, hot pink, or purple body colors that may key out with the background.
- Avoid loose detached strips or floating debris that look like separate props.
- Keep slash trails, bubbles, and water distortion as separate VFX rather than baked art.

Source handoff commands:
```bash
npm run source:next-prompt -- --id razor-kelp-harp
npm run source:session -- --id razor-kelp-harp
npm run source:inbox-capture -- --id razor-kelp-harp --open
npm run source:recover-inline -- --id razor-kelp-harp --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids razor-kelp-harp
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids razor-kelp-harp --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids razor-kelp-harp
npm run sandbox:preview -- --id razor-kelp-harp --kind source --serve --open --visual
```

## Lantern Anemone Pit (lantern-anemone-pit)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: mesophotic reef caves / biome 2-3

Gameplay verb:
Sessile lure ambusher that opens as a harmless flower, flashes lure polyps, then clamps a ring of stinging petals around nearby prey.

Biological anchors:
- Sea anemone oral disc anatomy for a central mouth, radial tentacles, and soft column base.
- Tube anemone and cerianthid cues for retractable petal rings and burrow-like anchoring.
- Bioluminescent lure organs inspired by deep reef predators for a readable bait signal.
- Cnidarian stinging tentacles for contact danger without mechanical teeth.
- Corallimorph mushroom-anemone forms for a wide deceptive flower silhouette.

Required read:
- One anchored anemone organism, not a decorative coral flower cluster.
- Central mouth pit is the first danger read when open.
- Two rings of thick petal-tentacles are broad enough for sprite-scale articulation.
- Lure bulbs, mouth rim, column base, and outer petals are visually connected.
- Danger is communicated through clamp posture, stinging bulbs, and mouth depth rather than gore or particles.

Articulatable parts:
- buried column base
- outer pedal disc skirt
- central mouth pit
- upper lip ring
- left outer petal-tentacle
- right outer petal-tentacle
- front inner petal-tentacle
- rear inner petal-tentacle
- lure bulb cluster
- stinging bead tips
- mouth shadow insert
- retraction fold overlays

Prompt risks:
- Avoid a cute decorative flower; it must read as a dangerous sessile predator.
- Avoid making the tentacles hair-thin or too numerous for articulation.
- Avoid literal teeth, metal jaws, or land-plant leaves.
- Avoid magenta or pink glow that conflicts with the chroma key background.
- Keep lure halos, sting sparks, and digestive clouds separate from the base source.

Source handoff commands:
```bash
npm run source:next-prompt -- --id lantern-anemone-pit
npm run source:session -- --id lantern-anemone-pit
npm run source:inbox-capture -- --id lantern-anemone-pit --open
npm run source:recover-inline -- --id lantern-anemone-pit --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids lantern-anemone-pit
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids lantern-anemone-pit --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids lantern-anemone-pit
npm run sandbox:preview -- --id lantern-anemone-pit --kind source --serve --open --visual
```

