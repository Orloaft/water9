# Abyssal Gulper Source Prompt Pack

This is the corrected source-art direction for replacing the current duplicated-pod Abyssal Gulper body. Generate one coherent whole-body source first, inspect it in `/review/gulper-eel-live-preview.html` using `Whole Source`, then cut parts from the approved source.

## Primary Prompt

Use case: stylized-concept

Asset type: 2D game creature source art for later sprite-part cutting.

Primary request: Create a high-quality side-view abyssal gulper eel leviathan concept on a perfectly flat solid `#00ff00` chroma-key background for background removal.

Scene/backdrop: perfectly flat uniform `#00ff00` background only; no shadows, gradients, texture, floor, water, particles, text, border, or watermark. Do not use `#00ff00` anywhere in the creature.

Subject: one single coherent monstrous deep-sea gulper eel creature, facing right, full body visible, horizontal side profile, generous padding around the whole creature.

Anatomy: oversized terrifying gulper head with huge hinged lower jaw and needle teeth; one continuous elastic throat/gullet sac behind the jaw; one distinct chest/throat base; one abdomen; long tapering eel tail that narrows smoothly to a whip tip; small dorsal ridge and one pectoral fin pair as secondary accents.

Art direction: dark abyssal blue-black skin, wet bioluminescent cyan edge details, subtle purple undertones, high-quality painterly game sprite art, readable silhouette, Barotrauma-inspired horror mood without copying any exact creature.

Rigging constraints: the body must read as one animal, not multiple stacked creatures. Avoid repeated duplicate body pods, avoid identical segment shapes, avoid multiple heads, avoid separate mini-creatures, avoid complete circular body chunks. Surface markings and scale rows should flow continuously from head to tail. Keep joints visually sliceable into head, lower jaw, gullet sac, torso, abdomen, tail base, tail tip, dorsal fin, and pectoral fin.

Composition: clean orthographic side view, no perspective foreshortening, no curled body, no occluding limbs, no cropped parts, centered in frame.

## Reject If

- The torso is made from repeated bulb/body pods.
- Any body segment looks like a standalone miniature gulper.
- The head/jaw repeats in the torso silhouette.
- The tail is a chain of identical capsules instead of a continuous taper.
- Fins dominate the silhouette more than the head, gullet, and tail.
- The image has environmental lighting/shadow that prevents clean chroma-key removal.

## Approval Checklist

- Single-animal read at thumbnail scale.
- One clear oversized head and one clear jaw.
- Continuous throat sac and abdomen, not stacked bodies.
- Tail tapers smoothly and uniquely.
- High enough detail for sprite use.
- Easy to imagine cut lines for: head, lower jaw, gullet sac, torso, abdomen, tail base, tail tip, dorsal fin, pectoral fin.

## Expected Output Path

Save the approved candidate as:

`public/assets/generated/fauna-abyssal-gulper-coherent-v1.png`

The live preview page already checks this path in `Whole Source` mode:

`/review/gulper-eel-live-preview.html`
