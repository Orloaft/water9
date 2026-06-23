# Predatory Tunicate Maw

Candidate: `predatory-tunicate-maw`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-predatory-tunicate-maw-whole-source.png`
Depth band: bathyal canyon walls / cold hardground

## Gameplay Read

Sessile soft-bodied snap trap that poses as a harmless stalk, opens a translucent mouth, and clamps shut when the diver crosses its bite lane.

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

## Source Pose Rules

- Generate a neutral riggable source pose, not the peak attack impact frame.
- Attack direction must still be obvious from species-appropriate anatomy: jaws, oral disc, osculum, spines, fins, lures, eyes, claws, or body aim.
- Primary pivots and crop zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, rim folds, throat valves, or equivalent anatomy.
- Major appendages, valves, rims, plates, or tentacles must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.
- Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.

## Cohesion Lock

- One-source proof: render one continuous organism in one neutral source pose, not a parts board, variants sheet, or disconnected thumbnails.
- Connection proof: every crop-intended appendage must visibly grow from or overlap the same body with a readable hinge, socket, root, or skin transition.
- Style proof: all body regions and crop-intended organs must share one palette, line weight, lighting direction, material language, and shadow logic.
- Proportion proof: body parts must look like they belong to the same animal when articulated; reject mismatched copied fragments or arbitrary size jumps.
- Production proof: reject outputs that read as placeholder shapes, collage kitbash, props, UI icons, environmental rocks, duplicate creatures, or loose weapons.

## Research Audit Hardening

- Lane: sessile-ambush-hazards
- Biological anchor: Keep paired siphon lobes, gelatin tunic, and flexible stalk as the primary anatomy; use papillae instead of teeth.
- Extra required read: Open siphon maw must be thick-lipped, soft, and connected to stalk and tunic body in one continuous organism.
- Avoid: The mouth-trap prompt may drift into clam, venus flytrap, or fantasy jaw anatomy, losing tunicate softness.
- Avoid: Translucency and internal organs can weaken the outer silhouette if rendered too faint.
- Avoid: Mucus strands, prey, or wall context could be baked into the source and interfere with cropping.
- Avoid: Avoid hard teeth, plant leaves, clam shells, rock wall context, and faint transparent edges.
- Preserve motion phase readability: closed harmless stalk pose
- Preserve motion phase readability: mouth opening telegraph
- Preserve motion phase readability: siphon clamp snap
- Preserve motion phase readability: soft recoil reopen
- Reference search term: Megalodicopia predatory tunicate
- Reference search term: ascidian siphon anatomy
- Reference search term: tunicate gelatinous tunic
- Reference search term: deep sea predatory tunicate stalk
- Reference search term: sea squirt internal folds

## Reject If

- Avoid making it a clam, venus flytrap plant, or fantasy mouth monster; preserve tunicate softness and siphon anatomy.
- Avoid hard teeth, bones, metal jaws, or mechanical hinges.
- Avoid transparency so faint that the silhouette disappears at game scale.
- Avoid magenta, hot pink, or purple body tones that interfere with chroma keying.
- Keep mucus strands, bite impacts, and prey silhouettes as separate VFX.
- Reject teeth, angler lures, tentacles, plant petals, clam shells, and pink or magenta tissue near the key color.
- collage of unrelated animal parts instead of one physically coherent creature
- detached mouth, detached limbs, duplicate bodies, loose props, bubbles, prey, water vortex, floor plane, cast shadow, or text
- black, white, transparent, textured, gradient, or shadowed background instead of flat #ff00ff magenta
- silhouette that fails to communicate the gameplay verb at small sprite scale
- parts too thin, overlapped, hidden, or ambiguous to crop into articulated sprites
- lighting, palette, or rendering style that changes between body regions
- full attack impact pose, motion smear, or VFX-heavy action frame that hides the neutral riggable anatomy

## Review Checklist

- Single creature: every visible part belongs to one connected anatomy.
- Part continuity: all crop-intended appendages have compatible proportions, visible connection zones, and one lighting/material treatment.
- Design read: the silhouette and largest features match the gameplay verb.
- Extraction read: required articulated parts are visible, separated, and thick enough for clean crops.
- Pose read: neutral source pose preserves visible pivots, attack direction, and crop-safe appendages.
- Source hygiene: flat #ff00ff background, no baked environment, no cast shadow, no text.
- Style cohesion: one palette, one lighting model, one rendering style across the full creature.
- Small-sprite read: the creature remains recognizable when scaled down in the sandbox.
- The mouth reads as soft paired siphon lips with rounded rim papillae, not hard jaws, teeth, beak, clam shell, or flytrap petals.
- Flexible stalk, anchor foot, tunic body, mouth lips, side siphon, and organ sac remain one soft tunicate organism.
- Translucency preserves a readable silhouette at game scale and avoids pink or magenta tissue near the chroma key.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater enemy called Predatory Tunicate Maw, deep-sea predatory tunicate inspired soft-bodied sessile threat, flexible stalk rising from anchor foot pad, translucent gelatin tunic body, huge paired siphon mouth with thick soft upper and lower siphon lips, ridged gelatin rim folds, rounded rim papillae, visible inner filter fold fan and muted organ sac, small side siphon, pale ghost ivory amber olive and cold blue palette, side-facing three-quarter view, crop-friendly separated stalk anchor body mouth lobes lip ridges folds organ sac and side siphon, crisp painterly browser-game sprite, centered with generous margin, no environment, no rock, no shadow, no haze, no bubbles, no text

Research audit hardening:
- Lane: sessile-ambush-hazards
- Biological anchor: Keep paired siphon lobes, gelatin tunic, and flexible stalk as the primary anatomy; use papillae instead of teeth.
- Extra required read: Open siphon maw must be thick-lipped, soft, and connected to stalk and tunic body in one continuous organism.
- Avoid: The mouth-trap prompt may drift into clam, venus flytrap, or fantasy jaw anatomy, losing tunicate softness.
- Avoid: Translucency and internal organs can weaken the outer silhouette if rendered too faint.
- Avoid: Mucus strands, prey, or wall context could be baked into the source and interfere with cropping.
- Avoid: Avoid hard teeth, plant leaves, clam shells, rock wall context, and faint transparent edges.
- Preserve motion phase readability: closed harmless stalk pose
- Preserve motion phase readability: mouth opening telegraph
- Preserve motion phase readability: siphon clamp snap
- Preserve motion phase readability: soft recoil reopen
- Reference search term: Megalodicopia predatory tunicate
- Reference search term: ascidian siphon anatomy
- Reference search term: tunicate gelatinous tunic
- Reference search term: deep sea predatory tunicate stalk
- Reference search term: sea squirt internal folds

Source pose contract:
- Generate a neutral riggable source pose, not the peak attack impact frame.
- Attack direction must still be obvious from species-appropriate anatomy: jaws, oral disc, osculum, spines, fins, lures, eyes, claws, or body aim.
- Primary pivots and crop zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, rim folds, throat valves, or equivalent anatomy.
- Major appendages, valves, rims, plates, or tentacles must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.
- Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.

Cohesion lock:
- One-source proof: render one continuous organism in one neutral source pose, not a parts board, variants sheet, or disconnected thumbnails.
- Connection proof: every crop-intended appendage must visibly grow from or overlap the same body with a readable hinge, socket, root, or skin transition.
- Style proof: all body regions and crop-intended organs must share one palette, line weight, lighting direction, material language, and shadow logic.
- Proportion proof: body parts must look like they belong to the same animal when articulated; reject mismatched copied fragments or arbitrary size jumps.
- Production proof: reject outputs that read as placeholder shapes, collage kitbash, props, UI icons, environmental rocks, duplicate creatures, or loose weapons.

Non-negotiable pass/fail requirements:
- One rooted soft-bodied tunicate creature, not a plant, clam, or anemone.
- Large open siphon mouth is the first danger read.
- Upper and lower mouth lobes are thick and separated for hinge animation.
- Stalk, anchor foot, tunic body, and internal folds remain connected as one organism.
- No surrounding rock wall, sediment, prey fish, particles, or shadows baked into the source.

Candidate-specific contract checks:
- The mouth reads as soft paired siphon lips with rounded rim papillae, not hard jaws, teeth, beak, clam shell, or flytrap petals.
- Flexible stalk, anchor foot, tunic body, mouth lips, side siphon, and organ sac remain one soft tunicate organism.
- Translucency preserves a readable silhouette at game scale and avoids pink or magenta tissue near the chroma key.

Reject immediately if:
- Avoid making it a clam, venus flytrap plant, or fantasy mouth monster; preserve tunicate softness and siphon anatomy.
- Avoid hard teeth, bones, metal jaws, or mechanical hinges.
- Avoid transparency so faint that the silhouette disappears at game scale.
- Avoid magenta, hot pink, or purple body tones that interfere with chroma keying.
- Keep mucus strands, bite impacts, and prey silhouettes as separate VFX.
- Reject teeth, angler lures, tentacles, plant petals, clam shells, and pink or magenta tissue near the key color.
- collage of unrelated animal parts instead of one physically coherent creature
- detached mouth, detached limbs, duplicate bodies, loose props, bubbles, prey, water vortex, floor plane, cast shadow, or text
- black, white, transparent, textured, gradient, or shadowed background instead of flat #ff00ff magenta
- silhouette that fails to communicate the gameplay verb at small sprite scale
- parts too thin, overlapped, hidden, or ambiguous to crop into articulated sprites
- lighting, palette, or rendering style that changes between body regions
- full attack impact pose, motion smear, or VFX-heavy action frame that hides the neutral riggable anatomy
```

## Commands

```bash
npm run source:imagegen-mark -- --id predatory-tunicate-maw
# run image generation from the prompt above
npm run source:imagegen-status -- --id predatory-tunicate-maw
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id predatory-tunicate-maw --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id predatory-tunicate-maw --image <image-path> --copy
npm run source:image-check -- --id predatory-tunicate-maw
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id predatory-tunicate-maw --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

