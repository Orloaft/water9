# Mobile Predator Motion

Lane: `mobile-predator-motion`

Focus:
Audit fish/eel/squid/crustacean threats for believable swimming, attack telegraph, readable side profile, and crop-safe articulated anatomy.

Rules:
- Do not edit files directly from a research assignment.
- Keep output factual, compact, and candidate-id keyed.
- Preserve the game design verb; propose patches only when they improve source generation or articulation.
- Flag anything that risks collage-like source art, weak silhouette, or non-riggable anatomy.
- Use the candidate command blocks to turn accepted research into source art capture, validation, and sandbox preview work.

Lane source handoff:
```bash
npm run source:next-prompt -- --id hadal-trencher-isopod
npm run source:session -- --id hadal-trencher-isopod
npm run source:inbox-capture -- --id hadal-trencher-isopod --open
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids hadal-trencher-isopod,vent-claw-yeti,abyssal-lantern-mantis,trench-harvest-sea-spider,vampire-cloak-squid,gulper-eel-maw,saber-viperfish,tripod-stilt-stalker,reef-lion-moray
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids hadal-trencher-isopod,vent-claw-yeti,abyssal-lantern-mantis,trench-harvest-sea-spider,vampire-cloak-squid,gulper-eel-maw,saber-viperfish,tripod-stilt-stalker,reef-lion-moray --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids hadal-trencher-isopod,vent-claw-yeti,abyssal-lantern-mantis,trench-harvest-sea-spider,vampire-cloak-squid,gulper-eel-maw,saber-viperfish,tripod-stilt-stalker,reef-lion-moray
```

Expected JSON shape:
```json
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
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

## Hadal Trencher Isopod (hadal-trencher-isopod)

Status: `candidate-queued`; source candidate: `needs-review`; has source: `true`
Depth band: hadal trench floor / abyssal scavenger lanes

Gameplay verb:
Armored burrow ambusher that braces into the sediment, raises shield plates, then lunges in a short crushing shove.

Biological anchors:
- Giant isopod body plan with overlapping armored tergites and a curled defensive posture.
- Deep-sea scavenger cues: heavy antennae, compact legs, and blunt crushing mouthparts.
- Bathynomus-style domed carapace for a readable shield-first silhouette.
- Burrowing amphipod and isopod behavior for sudden sandline emergence without becoming a worm.
- Abyssal pressure adaptation cues through pale chitin, dark seams, and reduced eye spots.

Required read:
- One cohesive full-body isopod-like threat, not a generic beetle, trilobite, or crab.
- Segmented armored back is the first read, with the head and shove direction clearly visible.
- Legs, antennae, plates, and mouthparts are thick enough to crop and rig at sprite scale.
- Defensive curl and forward lunge shapes must be visually plausible from the same anatomy.
- No sand clouds, seafloor, burrow hole, shadows, haze, or loose debris baked into the source.

Articulatable parts:
- broad forward head shield
- central overlapping thorax plate stack
- rear curled abdomen plate stack
- left heavy sensory antenna
- right heavy sensory antenna
- left blunt mandible plate
- right blunt mandible plate
- front compact walking leg pair
- middle compact walking leg pair
- rear anchoring walking leg pair
- left and right side shield flanges
- rear curled tail fan plate

Prompt risks:
- Avoid making it look like a land beetle; keep marine isopod proportions and flattened body logic.
- Avoid overly tiny legs hidden under the shell; they need to rig clearly.
- Avoid perfect trilobite symmetry or fossil styling that reads as extinct decoration.
- Avoid magenta, hot pink, or purple body colors that conflict with the chroma key.
- Keep sand burst, impact dust, and burrow opening as separate VFX rather than source art.

Source handoff commands:
```bash
npm run source:next-prompt -- --id hadal-trencher-isopod
npm run source:session -- --id hadal-trencher-isopod
npm run source:inbox-capture -- --id hadal-trencher-isopod --open
npm run source:recover-inline -- --id hadal-trencher-isopod --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids hadal-trencher-isopod
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids hadal-trencher-isopod --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids hadal-trencher-isopod
npm run sandbox:preview -- --id hadal-trencher-isopod --kind source --serve --open --visual
```

## Vent-Claw Yeti (vent-claw-yeti)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: abyssal hydrothermal vent fields

Gameplay verb:
Thermal grappler that guards vent lanes, fans its bristled claws, then hooks and drags the diver toward a hot zone.

Biological anchors:
- Yeti crab / Kiwaidae inspiration with long bristled claws used for bacterial farming.
- Hydrothermal vent ecology cues: mineral staining, pale shell, and chemosynthetic filament growth.
- Squat lobster posture for a compact body with oversized articulated forelimbs.
- Crab defensive display behavior for raised claws and readable lateral threat poses.
- Deep-sea reduced-eye anatomy with tactile antennae and sensory setae.

Required read:
- One whole crab-like arthropod, not a furry mammal, lobster, or humanoid monster.
- Oversized bristled claws are the first read and clearly indicate grab range.
- Main carapace, abdomen tuck, legs, claws, and antennae stay connected as one riggable body.
- Bristles read as clustered biological setae, not smoke, fur clouds, or flame.
- No vent chimney, lava plume, bubbles, floor plane, cast shadow, or environmental lighting baked in.

Articulatable parts:
- main carapace torso
- abdomen tuck
- left upper claw arm
- left bristled claw hand
- right upper claw arm
- right bristled claw hand
- front walking leg pair
- middle walking leg pair
- rear walking leg pair
- left antenna
- right antenna
- setae glow overlay clusters

Prompt risks:
- Avoid mammal-like fur; the bristles are crab setae and bacterial mats.
- Avoid a normal beach crab silhouette; emphasize deep-sea squat posture and huge farming claws.
- Avoid making the vent heat or smoke part of the body silhouette.
- Avoid thin bristles that turn into noise; use readable grouped tufts.
- Avoid magenta or pink glows inside the creature that could key out.

Source handoff commands:
```bash
npm run source:next-prompt -- --id vent-claw-yeti
npm run source:session -- --id vent-claw-yeti
npm run source:inbox-capture -- --id vent-claw-yeti --open
npm run source:recover-inline -- --id vent-claw-yeti --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids vent-claw-yeti
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids vent-claw-yeti --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids vent-claw-yeti
npm run sandbox:preview -- --id vent-claw-yeti --kind source --serve --open --visual
```

## Abyssal Lantern Mantis (abyssal-lantern-mantis)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: lower bathyal caves / abyssal reef breaks

Gameplay verb:
Burst striker that locks on with lantern eye spots, coils its raptorial arms, then releases a fast straight-line punch.

Biological anchors:
- Mantis shrimp raptorial appendages for spring-loaded striking arms and saddle-like joints.
- Stomatopod segmented thorax and plated abdomen for a colorful but armored arthropod read.
- Deep reef and cave predator cues with reduced color saturation, luminous eye spots, and tactile antennae.
- Spearer and smasher mantis shrimp behaviors blended into one readable attack telegraph.
- Compound eye stalk anatomy for a rotating aim signal without adding machinery.

Required read:
- One full-body mantis-shrimp-like predator with clear head, torso, abdomen, and tail fan.
- Coiled raptorial arms are the first danger read and must show punch direction.
- Eye stalks, antennae, strike arms, walking limbs, and tail fan need crop-safe separation.
- The creature should feel biological and crustacean, not a robot, gun, or armored fish.
- No punch streaks, shock rings, cave wall, bubbles, shadows, or light cones baked into the source.

Articulatable parts:
- plated forward head carapace
- left raised compound eye stalk
- right raised compound eye stalk
- left long antenna whip
- right long antenna whip
- compressed thorax torso plates
- left folded raptorial strike arm
- right folded raptorial strike arm
- small underside walking limb cluster
- rear segmented abdomen chain
- broad stabilizing tail fan
- cyan lantern eye glow overlays

Prompt risks:
- Avoid robotic boxing gloves, cannons, drills, or mechanical pistons.
- Avoid tropical rainbow saturation that fights the abyssal threat tone.
- Avoid fish-like fins replacing the crustacean legs and plated abdomen.
- Avoid making the eye glow magenta or hot pink.
- Keep punch trails, shock rings, and aim beams as separate VFX.

Source handoff commands:
```bash
npm run source:next-prompt -- --id abyssal-lantern-mantis
npm run source:session -- --id abyssal-lantern-mantis
npm run source:inbox-capture -- --id abyssal-lantern-mantis --open
npm run source:recover-inline -- --id abyssal-lantern-mantis --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids abyssal-lantern-mantis
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids abyssal-lantern-mantis --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids abyssal-lantern-mantis
npm run sandbox:preview -- --id abyssal-lantern-mantis --kind source --serve --open --visual
```

## Trench Harvest Sea Spider (trench-harvest-sea-spider)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: abyssal soft-bottom plains / carcass falls

Gameplay verb:
Long-legged pinning hunter that steps over obstacles, plants barbed legs around the diver, then siphons during a brief hold.

Biological anchors:
- Pycnogonid sea spider anatomy with tiny central body and very long jointed legs.
- Deep-sea gigantism cues for oversized limb span and sparse, alien proportions.
- Proboscis feeding behavior for a forward siphon mouth rather than jaws or teeth.
- Carcass-fall scavenger ecology with grasping claws and slow deliberate stepping.
- Arthropod joint logic with visible coxae, knees, and hooked terminal claws.

Required read:
- One cohesive sea-spider-inspired arthropod, not a land spider or insect.
- Tiny central body with long articulated legs is the first silhouette read.
- Forward proboscis must read as a biological siphon and not a weapon barrel.
- Legs are separated enough for rigging, with thick joints and clear contact claws.
- No webbing, carcass, seafloor, drifting particles, shadows, blood clouds, or environmental props baked in.

Articulatable parts:
- tiny knuckled central body
- small forward head nub
- soft forward proboscis siphon
- left long front stepping leg
- right long front stepping leg
- left long middle pinning leg
- right long middle pinning leg
- left long rear bracing leg
- right long rear bracing leg
- hooked terminal claw cluster
- dorsal rounded egg-sac lump
- cold siphon glow overlay

Prompt risks:
- Avoid a terrestrial spider read; keep pycnogonid tiny-body and marine proboscis anatomy.
- Avoid making legs hair-thin; every limb needs usable thickness for articulation.
- Avoid web strands, silk, or horror-web language because sea spiders do not use webs.
- Avoid a gun-like proboscis; it should be soft biological feeding anatomy.
- Avoid magenta highlights on joints, eyes, or siphon effects.

Source handoff commands:
```bash
npm run source:next-prompt -- --id trench-harvest-sea-spider
npm run source:session -- --id trench-harvest-sea-spider
npm run source:inbox-capture -- --id trench-harvest-sea-spider --open
npm run source:recover-inline -- --id trench-harvest-sea-spider --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids trench-harvest-sea-spider
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids trench-harvest-sea-spider --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids trench-harvest-sea-spider
npm run sandbox:preview -- --id trench-harvest-sea-spider --kind source --serve --open --visual
```

## Vampire Cloak Squid (vampire-cloak-squid)

Status: `candidate-queued`; source candidate: `needs-review`; has source: `true`
Depth band: oxygen-minimum mesopelagic / dark open water

Gameplay verb:
Cephalopod feint attacker that cloaks into a spined umbrella, flashes photophores, then snaps its arms outward for a short-range grab.

Biological anchors:
- Vampire squid cloak webbing connecting the arms into an umbrella-like defensive mantle.
- Eight arm structure with cirri and soft spines for a threatening but organic silhouette.
- Large blue eyes and compact mantle for immediate cephalopod recognition.
- Photophores on arm tips and mantle as readable telegraph lights.
- Inside-out pineapple posture for a defensive phase that changes silhouette before attack.

Required read:
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

Prompt risks:
- Avoid bat wings, fangs, capes, or humanoid vampire styling; keep it biological.
- Avoid squid tentacle tangles that obscure the eight-arm cloak structure.
- Avoid magenta or pink photophores that conflict with the background.
- Avoid a giant octopus silhouette; compact mantle and webbed arms should identify vampire squid.
- Keep ink, flash bursts, and stun effects separate from the base anatomy.

Source handoff commands:
```bash
npm run source:next-prompt -- --id vampire-cloak-squid
npm run source:session -- --id vampire-cloak-squid
npm run source:inbox-capture -- --id vampire-cloak-squid --open
npm run source:recover-inline -- --id vampire-cloak-squid --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids vampire-cloak-squid
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids vampire-cloak-squid --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids vampire-cloak-squid
npm run sandbox:preview -- --id vampire-cloak-squid --kind source --serve --open --visual
```

## Gulper Eel Maw (gulper-eel-maw)

Status: `candidate-queued`; source candidate: `needs-review`; has source: `true`
Depth band: bathypelagic abyss / open blackwater lanes

Gameplay verb:
Inhale ambusher that blooms a huge mouth pouch, pulls the diver into a short suction cone, then snaps shut before a deflated recovery window.

Biological anchors:
- Pelican eel and gulper eel anatomy: oversized hinged jaws, loose expandable throat pouch, tiny skull, and long whip body.
- Deep pelagic predator posture: sparse fins, black flexible skin, and a silhouette dominated by the mouth rather than armor.
- Bioluminescent tail lure behavior for a readable bait phase before the suction attack.
- Expandable buccal cavity mechanics: pouch inflates as a volume hazard, then collapses after the snap.
- Abyssal reduced-detail anatomy: small eyes, visible gill seams, and fragile ribbonlike body proportions.

Required read:
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

Prompt risks:
- Avoid a generic snake or leech; keep the tiny skull, huge mouth pouch, and long eel body visible.
- Avoid a detached monster mouth; all jaw and pouch structures must connect to the body.
- Avoid making suction currents part of the base sprite; pull effects should be separate VFX.
- Avoid bright magenta, hot pink, or purple anatomy that conflicts with chroma keying.
- Avoid over-detailing the black body so the hinge zones and lure remain readable.

Source handoff commands:
```bash
npm run source:next-prompt -- --id gulper-eel-maw
npm run source:session -- --id gulper-eel-maw
npm run source:inbox-capture -- --id gulper-eel-maw --open
npm run source:recover-inline -- --id gulper-eel-maw --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids gulper-eel-maw
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids gulper-eel-maw --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids gulper-eel-maw
npm run sandbox:preview -- --id gulper-eel-maw --kind source --serve --open --visual
```

## Saber Viperfish (saber-viperfish)

Status: `candidate-queued`; source candidate: `needs-review`; has source: `true`
Depth band: bathypelagic hunting layer / abyssal descent routes

Gameplay verb:
Lock-on dash striker that flashes its photophore chain, unhinges saber jaws, then commits to a fast straight impale that can be dodged and punished.

Biological anchors:
- Deep-sea viperfish anatomy: oversized recurved teeth, hinged jaws, narrow head, and long predatory body.
- Photophore rows along the belly for a sequential lock-on telegraph visible at small scale.
- Dorsal lure spine cues from bathypelagic predators, kept biological rather than mechanical.
- Needlelike fang silhouette and reflective eyes for a readable danger front.
- Fast vertical and diagonal ambush behavior from mesopelagic predators translated into a dash attack.

Required read:
- One whole viperfish-like vertebrate, not a barracuda, dragon, or metal spear device.
- Oversized saber teeth and unhinged jaw are the first danger read.
- Photophore belly chain, dorsal lure spine, fins, tail, and skull share one biological material language.
- Teeth are large readable fang shapes rather than many tiny noisy needles.
- No motion streaks, target reticle, bubbles, prey fish, lighting beams, or shadow baked into the source.

Articulatable parts:
- armored skull wedge
- upper saber tooth row
- lower hinged jaw plate
- dark throat cavity plate
- left reflective eye plate
- right reflective eye plate
- dorsal lure spine
- photophore belly chain
- segmented body trunk
- left pectoral fin blade
- right pectoral fin blade
- forked tail fin

Prompt risks:
- Avoid a generic toothy fish; the jaw hinge, saber teeth, photophore chain, and dorsal lure must define it.
- Avoid too many tiny teeth that become visual noise; use fewer large crop-safe fangs.
- Avoid metal blades, harpoons, armor plating, or sci-fi weapon cues.
- Avoid baked dash trails or impact sparks that should be generated separately.
- Avoid magenta or hot pink light sources inside the creature.

Source handoff commands:
```bash
npm run source:next-prompt -- --id saber-viperfish
npm run source:session -- --id saber-viperfish
npm run source:inbox-capture -- --id saber-viperfish --open
npm run source:recover-inline -- --id saber-viperfish --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids saber-viperfish
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids saber-viperfish --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids saber-viperfish
npm run sandbox:preview -- --id saber-viperfish --kind source --serve --open --visual
```

## Tripod Stilt Stalker (tripod-stilt-stalker)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: abyssal plain / soft-sediment ambush fields

Gameplay verb:
Stilted trap sentinel that plants three long fin rays, sweeps a sensory tripline, then hop-stabs across the safe gap with a brittle spear motion.

Biological anchors:
- Tripodfish body plan: elongated pelvic and caudal fin rays used as stilts above the seafloor.
- Abyssal benthic sit-and-wait behavior with upward-facing mouth and reduced swimming effort.
- Long pectoral sensory rays for detecting movement without needing eyes as the main read.
- Slender deep-sea fish proportions: narrow head, soft body trunk, and sparse translucent fins.
- Soft-sediment predator logic translated into a perched trap without including the seabed.

Required read:
- One whole tripodfish-like vertebrate, not a crab, spider, or walking machine.
- Three long stilt fin rays are the first silhouette read and clearly support the body.
- Upturned head, sensory pectoral rays, dorsal fin, body trunk, and tail stilt connect as one fish.
- Stilts and sensory rays are thick and separated enough for crop-safe articulation.
- No seabed, sand cloud, planted shadow, bubbles, particles, or floor contact marks baked into the source.

Articulatable parts:
- narrow head capsule
- upturned mouth plate
- left glassy eye spot
- right glassy eye spot
- slender body torso
- small dorsal sail fin
- left pectoral sensory ray
- right pectoral sensory ray
- left pelvic tripod stilt
- right pelvic tripod stilt
- rear caudal tripod stilt
- thin tail membrane flag

Prompt risks:
- Avoid making the stilts look like insect legs or metal rods; they are elongated fish fin rays.
- Avoid including a floor plane or sediment mound because the source must remain isolated.
- Avoid hair-thin rays that cannot be selected, cropped, or animated cleanly.
- Avoid turning the fish into a spider silhouette; keep the head, trunk, fins, and tail readable.
- Avoid magenta, hot pink, or purple tissue near the background key color.

Source handoff commands:
```bash
npm run source:next-prompt -- --id tripod-stilt-stalker
npm run source:session -- --id tripod-stilt-stalker
npm run source:inbox-capture -- --id tripod-stilt-stalker --open
npm run source:recover-inline -- --id tripod-stilt-stalker --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids tripod-stilt-stalker
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids tripod-stilt-stalker --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids tripod-stilt-stalker
npm run sandbox:preview -- --id tripod-stilt-stalker --kind source --serve --open --visual
```

## Reef Lion Moray (reef-lion-moray)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: twilight reef caves / predator corridors

Gameplay verb:
Hybrid reef ambusher that flares venom fins to block escape lanes, lunges with a moray bite, then exposes its folded spine fan during recovery.

Biological anchors:
- Moray eel anatomy: elongated muscular body, blunt predatory head, hinged jaws, and gill pore rhythm.
- Lionfish and scorpionfish danger cues: venomous dorsal spines, broad pectoral fans, and striped warning pattern.
- Reef cave ambush behavior translated into a full-body source without adding a cave or rock.
- Flexible eel locomotion for coil, lunge, and recoil animation phases.
- Venomous fin display logic: expanded fins are the warning and lane-control shape, not loose decoration.

Required read:
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

Prompt risks:
- Avoid a collage of eel plus loose lionfish fins; the hybrid must read as one continuous vertebrate.
- Avoid thin hairlike spines that disappear at sprite scale; use broad crop-safe venom rays.
- Avoid including reef scenery, cave darkness, or coral props in the isolated source.
- Avoid making the fins look like decorative wings instead of biological pectoral and dorsal fins.
- Avoid magenta, hot pink, or purple warning stripes that could interfere with keying.

Source handoff commands:
```bash
npm run source:next-prompt -- --id reef-lion-moray
npm run source:session -- --id reef-lion-moray
npm run source:inbox-capture -- --id reef-lion-moray --open
npm run source:recover-inline -- --id reef-lion-moray --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids reef-lion-moray
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids reef-lion-moray --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids reef-lion-moray
npm run sandbox:preview -- --id reef-lion-moray --kind source --serve --open --visual
```

