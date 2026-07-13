# Generation lineage

## Tool and exposed settings

- Tool: Codex built-in `image_gen`, one independent generation call per direction.
- Mode: new raster generation using local images as visual references.
- Model identifier, seed, sampler, step count, and quality setting: not exposed by the built-in tool.
- The three selected outputs are the first returned candidates. Rejected-candidate count: **0**. Each passed the requested anatomy, equipment attachment, lighting, text/watermark, and style checks, so no candidate was rejected merely to manufacture an iteration count.
- Review composites used FFmpeg only for lossless PNG scaling, cropping, stacking, grayscale conversion, and labels outside the art. No drawing, tracing, vector assembly, procedural sprite construction, or source-art repainting was performed.

## Reference roles

- `public/assets/generated/diver-swim-0.png`: live runtime-loaded horizontal identity and footprint reference.
- `public/assets/generated/diver-idle-0.png`: live runtime-loaded brass/cyan pressure-suit identity reference.
- `runs/current-diver-sprite-audit-2026-07-11/artifacts/runtime-surface-idle-hud.png`: audited live Water9 `#game canvas`, shallow value context.
- `runs/current-diver-sprite-audit-2026-07-11/artifacts/runtime-mid-swim-hud.png`: audited live Water9 `#game canvas`, horizontal pose and mid-depth scale context.
- `runs/current-diver-sprite-audit-2026-07-11/artifacts/runtime-deep-diagonal-boost-hud.png`: audited live Water9 `#game canvas`, deep value context and motion ancestry.
- `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/runtime-band-mid-biome2-canvas.png`: unmistakable Water9 mid-biome runtime context.
- `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/runtime-band-abyss-hadal-biome4-canvas.png`: unmistakable Water9 abyss/hadal runtime context.
- `runs/diver-v2-asset-production-2026-07-11/artifacts/review/contact-sheet-color-2x.png`: rejected negative reference only; prompts explicitly prohibit its geometric puppet construction.

## Exact prompt — A

```text
Use case: stylized-concept
Asset type: Water9 gold-master diver concept selection, Direction A — Heritage pressure suit
Input images: Images 1–2 are the actual live Water9 diver and define identity ancestry; Images 3–4 are actual Water9 canvas captures and define world mood/value context; Image 5 is rejected v2 placeholder art and must be treated only as a negative example.
Primary request: Create one genuinely authored, high-resolution painterly character concept of the Water9 diver in a strict side-facing neutral horizontal hover/swim pose, facing right. Strongest continuity with the existing brass/cyan diver, but redesigned as a credible production model.
Subject: A compact, heavy, human-operated heritage pressure suit. Oversized but mechanically supported brass/copper helmet with one luminous cyan faceplate, dense chest pressure shell, believable neck lock, substantial backpack/twin pressure cylinders integrated into the torso mass, articulated short heavy arms, readable gloves, weighted boots transitioning into practical short swim fins, clear shoulder/elbow/wrist/hip/knee/ankle attachment points. Pose anatomy must be coherent: head, ribcage, pelvis, arms and both legs connected and readable.
Style/medium: richly hand-painted game concept art, painterly industrial realism with deliberate brush texture and shape design, corroded maritime materials, readable production concept, not pixel art.
Composition/framing: single full-body side profile, horizontal silhouette, entire diver visible with generous padding, centered on a plain very dark desaturated teal studio backdrop; no environment scene, no frame, no callouts, no labels.
Lighting/mood: restrained upper-left cold underwater key light, warm brass bounce, cyan faceplate glow kept localized; dramatic but clear material separation.
Materials/textures: battered brass plates, dark rubberized pressure joints, oxidized copper-green seams, scratched glass, uneven salt bloom, oil-dark creases, a few irregular repair marks and non-repeating fasteners. Authored asymmetry without clutter.
Constraints: preserve the recognizable brass pressure-suit premise, cyan faceplate, backpack mass, warm/cool separation, strong horizontal-swim ancestry. Feel compact, heavy, pressure-rated, mechanically plausible, and human-operated. Clear silhouette at thumbnail size. No tool in hand.
Avoid: the rejected Image 5 construction; repeated primitive geometry; uniform outlines; flat fills; perfect repeated rivets; synthetic symmetry; disconnected puppet limbs; procedural or code-drawn pixel art; generic astronaut; superhero; clean vector mascot; chibi robot; sci-fi marine; kitbash; text; letters; logo; watermark; multiple views; extra limbs; floating equipment.
```

References supplied to A, in order: live swim frame; live idle frame; audited surface canvas; audited deep boost canvas; rejected v2 contact sheet.

## Exact prompt — B

```text
Use case: stylized-concept
Asset type: Water9 gold-master diver concept selection, Direction B — Salvager/miner
Input images: Images 1–2 are the actual live Water9 diver and define identity ancestry; Images 3–4 are actual Water9 canvas captures and define scale/world mood; Image 5 is rejected v2 procedural-placeholder art and must be treated only as a negative example.
Primary request: Create one genuinely authored, high-resolution painterly character concept of the Water9 diver in a strict side-facing neutral horizontal hover/swim pose, facing right. This direction is a heavier working salvager/miner with field repairs and tool-ready engineering, yet unmistakably the same brass/cyan Water9 diver.
Subject: A compact human-operated pressure suit built around a broad load-bearing chest and low center of mass. Brass pressure helmet with one cyan faceplate, reinforced brow and neck lock; large irregular backpack mass with battered pressure bottles and a cable drum; thick shoulder yoke; heavy articulated forearms with one empty quick-change tool clamp/rail and one armored work glove; asymmetrical salvage harness, ore sample pouches, one patched hip plate, stout legs, weighted boots with short rugged fins. All equipment physically attached. Two arms and two legs only, anatomy coherent and joints readable.
Style/medium: premium hand-painted game concept art, painterly industrial realism, purposeful design drawing with rich surface breakup, not pixel art.
Composition/framing: single full-body side profile, horizontal silhouette, entire diver visible with generous padding, centered on a plain very dark desaturated teal studio backdrop; no environment scene, no frame, no callouts, no labels.
Lighting/mood: restrained cold upper-left underwater light, warm copper/brass material response, localized cyan faceplate glow; clear silhouette and value grouping.
Materials/textures: hammered brass, welded steel repairs, dark rubber bellows, oxidized seams, scratched face glass, salt bloom, tarred cloth straps, mismatched but plausible fasteners, hand-painted wear concentrated at work surfaces. Strong asymmetry with one repaired shoulder/hip and unequal pack modules.
Constraints: preserve brass pressure suit, cyan faceplate, backpack mass, warm/cool separation, horizontal swim ancestry. Must feel heavy, pressure-rated, mechanically plausible, human-operated, tool-ready but no large tool obscuring the model. Clear hands, boots/fins, harness and attachment sockets.
Avoid: Image 5's geometric puppet construction; repeated primitive blocks; uniform outlines; flat fills; perfect repeated rivets; synthetic symmetry; disconnected limbs; code-drawn pixel art; generic astronaut; superhero; vector mascot; chibi robot; sci-fi marine; kitbash; text; letters; logo; watermark; extra limbs; floating gear; giant weapon; multiple views.
```

References supplied to B, in order: live swim frame; live idle frame; audited mid canvas; Water9 biome-2 runtime canvas; rejected v2 contact sheet.

## Exact prompt — C

```text
Use case: stylized-concept
Asset type: Water9 gold-master diver concept selection, Direction C — Abyssal explorer
Input images: Images 1–2 are the actual live Water9 diver and define identity ancestry; Images 3–4 are actual deep Water9 canvas captures and define hostile abyss context/value requirements; Image 5 is rejected v2 procedural-placeholder art and must be treated only as a negative example.
Primary request: Create one genuinely authored, high-resolution painterly character concept of the Water9 diver in a strict side-facing neutral horizontal hover/swim pose, facing right. This direction explores a slightly stranger deep-pressure silhouette and protective engineering while remaining grounded, readable, human-operated, and unmistakably related to the brass/cyan Water9 diver.
Subject: A compact hadal pressure suit with a deep rounded helmet nested inside an external protective brass cage/brow, one large cyan faceplate still clearly visible, thick neck isolation ring, segmented pressure cuirass, broad shoulder protection, integrated dorsal pressure pack with crush-resistant ribbing and small trim tanks, guarded hoses, short heavy articulated arms with readable gloves, compact pelvis, stout legs and broad stabilizing fins. Add one restrained asymmetric abyss feature such as a sacrificial ceramic shoulder shield and a single offset sensor pod, both physically mounted. Two arms and two legs only; all joints and attachment points coherent.
Style/medium: premium hand-painted game concept art, painterly corroded maritime industrial realism with slightly uncanny deep-ocean engineering, deliberate shape design, not pixel art.
Composition/framing: single full-body side profile, horizontal silhouette, entire diver visible with generous padding, centered on a plain near-black blue-green studio backdrop; no environment scene, no frame, no callouts, no labels.
Lighting/mood: sparse cold upper-left hadal light, localized cyan faceplate glow as the main identity beacon, subdued warm brass edges; strong readable value hierarchy even in near-black surroundings.
Materials/textures: aged naval brass, blackened steel, ceramic pressure tiles, dark rubber bellows, mineral accretion, scratched thick glass, oxidized seams, chipped protective coating, irregular non-repeating service marks. Purposeful wear, no random greeble carpet.
Constraints: preserve brass pressure-suit premise, cyan faceplate, backpack mass, warm/cool separation, strong horizontal-swim ancestry. Slightly stranger silhouette but compact, heavy, pressure-rated, mechanically plausible and suitable as a canonical model-sheet base. Human scale and operator space must make sense.
Avoid: Image 5's blocky puppet construction; repeated primitive geometry; uniform outlines; flat fills; perfect rivet repetition; synthetic symmetry; disconnected limbs; procedural pixel art; alien creature suit; generic astronaut; superhero; vector mascot; chibi robot; sci-fi marine; fantasy armor; kitbash; text; letters; logo; watermark; extra limbs; floating equipment; multiple views.
```

References supplied to C, in order: live swim frame; live idle frame; audited deep boost canvas; Water9 abyss/hadal runtime canvas; rejected v2 contact sheet.
