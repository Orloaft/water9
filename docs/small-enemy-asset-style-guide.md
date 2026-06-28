# Small Enemy Asset Style Guide

Use this guide for small non-articulated enemies and similar whole-sprite creatures, especially Mantis Shrimp, Vampire Squid, Goblin Shark, Viperfish, Blue-ring Octopus, Anglerfish, Black Swallower, and Sea Spider replacements.

## Canvas And Framing

- Keep the existing asset key, frame count, and frame dimensions unless the manifest/code change is intentional.
- Final sprites must be transparent PNGs. If generation cannot produce clean alpha, generate on perfectly flat `#ff00ff` and key it out locally; never use magenta, hot pink, or near-key colors inside the creature.
- Leave 8-12% transparent margin on all sides, with 12-16% extra in front of jaws, snouts, claws, arms, or lures.
- Keep each frame centered on the same gameplay anchor. Long predators should center body mass near the collision center, not at the extreme jaw tip.

## Silhouette

- The first read at runtime width must identify the species or threat role. Hostile fish render around `radius * 3.8`, often only 45-95 px wide.
- Use 2-4 large silhouette beats: weapon or maw, head, body, tail, legs, arms, or cloak. Avoid hairline detail clusters.
- Fish, sharks, and eels need exaggerated species-specific heads and jaws. Cephalopods need grouped arms or cloak membranes, not loose tentacle noise. Crustaceans need thick raptorial arms and tail fans.

## Palette And Shading

- Use dark abyssal body colors with 2-3 midtone ramps and one highlight ramp.
- Add small deliberate non-magenta biolume accents: cyan, teal, pale yellow, or green for eyes, lures, photophores, claw tips, or blue rings.
- Do not bake water glow, bubbles, sonar rings, attack trails, shadows, scenery, prey, or UI particles into the base sprite.
- Use a readable dark outside edge or high-contrast rim without a detached cartoon border. Keep lighting direction consistent across frames.

## Animation Frames

- Swim frames should change pose, not just jitter pixels.
- Predators need a subtle attack-read frame: jaw open, lure lifted, arms cocked, cloak flared, or body arched.
- Preserve canvas size, anchor, and approximate body volume across frames.
- Whole-sprite runtime rotation expects side/profile-compatible frames unless a top-down creature is explicitly planned.

## Validation Checks

- Review a contact sheet with raw frames, alpha-cropped frames, runtime-width previews, and runtime previews scaled 3x.
- Check alpha bounding boxes across frames; ordinary swim frames should not jump more than a few pixels.
- Test in a dark-biome screenshot with scan pulse, attack marker, hurt flash, and stunned alpha. The creature should remain recognizable without labels.
- Reject sprites that only read when enlarged, have cropped appendages, drift anchors, or collapse into a smear at hostile runtime width.

## References

Good small-sprite references:
- `fauna-abyss-black-swallower`: chunky predator mass and mouth read.
- `fauna-abyss-anglerfish`: lure and head read at small size.
- `fauna-deep-sea-spider`: distinct radial silhouette.
- `fauna-shallow-mantis-shrimp`: acceptable short-term color and crustacean profile.

High-bar source references:
- `fauna-abyssal-lantern-mantis-whole-source`
- `fauna-vampire-cloak-squid-whole-source`
- `fauna-abyssal-mandible-bobbit-topdown-whole-painted`
- `fauna-saber-viperfish-whole-source`

Do not copy:
- `fauna-abyss-viperfish`: too generic for a named hostile predator.
- `fauna-abyss-goblin-shark`: snout and jaw are too soft for late-game readability.
- `fauna-abyss-snipe-eel` when displayed as Viperfish: label/asset identity mismatch.
- `fauna-shallow-blue-ring-octopus`: noisy silhouette and weak blue-ring read.
- `fauna-abyss-hatchet-school`, `fauna-abyss-lantern-swarm`, `fauna-abyss-static-fry`, and `fauna-abyss-microfish`: not enemy-style references.

## First Regeneration Slice

Start with the abyss small-predator identity slice:

- `fauna-abyss-viperfish` / Abyssal Viperfish: long thin fish, oversized hinged jaw, needle teeth, dark body, small lure or eye glow.
- `fauna-abyss-goblin-shark` / Goblin Shark: pale grey-pink abyss shark, long flattened snout, protrusible underslung jaw, ragged fins, narrow tail.
- `fauna-abyss-snipe-eel` / Viperfish label mismatch: either rename/display as Snipe Eel or replace with a true viperfish silhouette.

This slice improves the darkest late-game hostile reads first and covers the repeated Goblin Shark entries in biomes 3 and 4.
