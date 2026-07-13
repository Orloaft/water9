# Generation and edit lineage

## Tool disclosure

- Generation/edit tool: Codex built-in `image_gen`.
- Mode: reference-guided raster identity-preserving edit/generation.
- Model identifier, seed, sampler, steps, quality, and input-fidelity controls: **not exposed by the built-in tool**; none are guessed here.
- Generation calls: **2**.
- Model outputs discarded: **0**. Both raw generated outputs are retained in this run or represented as the final canonical file.
- No procedural/vector diver art was made. Pillow is used only to crop, scale, mirror the accepted side geometry, add exterior labels/guides, assemble review boards, and compute presentation grayscale.

## Inspected source evidence

All paths are relative to the repository root.

| Source | Role |
|---|---|
| `runs/diver-v3-gold-master-concepts-2026-07-11/artifacts/concepts/concept-a.png` | Sole selected identity source and ancestry authority |
| `runs/diver-v3-gold-master-concepts-2026-07-11/report.md` | Concept assessment, immutable traits, and stated A risks |
| `runs/diver-v3-gold-master-concepts-2026-07-11/artifacts/generation-lineage.md` | Concept A prompt and source lineage |
| `runs/current-diver-sprite-audit-2026-07-11/report.md` | Live diver visual/runtime audit and replacement constraints |
| `runs/current-diver-sprite-audit-2026-07-11/artifacts/current-diver-all-frames-color.png` | Existing live identity, family drift, and animation failure evidence |
| `runs/current-diver-sprite-audit-2026-07-11/artifacts/runtime-mid-swim-hud.png` | Accepted live mid-depth gameplay scale/value reference |
| `runs/current-diver-sprite-audit-2026-07-11/artifacts/runtime-surface-idle-hud.png` | Accepted live shallow context reference |
| `runs/current-diver-sprite-audit-2026-07-11/artifacts/runtime-deep-diagonal-boost-hud.png` | Accepted live deep context reference |
| `runs/diver-v2-asset-production-2026-07-11/report.md` | Rejected v2 rationale and correction history |
| `runs/diver-v2-asset-production-2026-07-11/artifacts/review/contact-sheet-color-2x.png` | Negative reference: repeated rectangles, front-facing block/puppet construction |
| `runs/diver-v2-asset-production-2026-07-11/artifacts/spec/visual-inspection.md` | v2 visual failure/validation record |
| `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/runtime-band-mid-biome2-canvas.png` | Representative accepted Water9 mid-biome material/value context |
| `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/runtime-band-abyss-hadal-biome4-canvas.png` | Representative accepted abyss/hadal context |

Concepts B and C were not supplied to either generation call and were not used as references or blend targets.

## Output 01 — canonical neutral side master

- Built-in generated source: `/home/orlovboros/.openclaw/agents/codex-dev/agent/codex-home/generated_images/019f52ac-d80e-7831-b321-df9918b03dfc/exec-3c6f2034-9202-4c64-8042-a064bee6df3f.png`
- Project-retained final: `artifacts/bible/canonical-neutral-side-master.png`
- Dimensions/mode: 1747 × 900 RGB PNG.
- Decision: **accepted**. It preserves A's helmet, faceplate, broad cuirass, high copper pack, short bellows limbs, gloves, fins, horizontal ratio, materials, and upper-left/cyan hierarchy while clarifying connections and reducing three-quarter ambiguity.
- Honest construction note: the paired cylinders overlap in the strict side read and appear as one dominant long cylinder mass. The paired construction is made explicit in the accepted back view and bible; this is occlusion, not authorization to change cylinder count.

Exact prompt:

```text
Use case: identity-preserve
Asset type: Water9 production character bible canonical neutral side-view master
Input image: Image 1 is the sole selected gold-master identity source, Concept A. It is the edit target and absolute identity authority. Do not use or infer Concepts B or C.
Primary request: Refine Image 1 into one high-resolution canonical RIGHT-FACING neutral horizontal side-view master for animation registration. Preserve the exact Heritage pressure-suit identity, silhouette character, proportions, material language, and worn maritime personality. Correct only contradictions that prevent repeatable animation registration: remove the mild three-quarter camera bias, clarify the nearer and farther limb chains as connected coherent volumes, normalize joint placement, and make the tool-free hands readable. Keep the same compact swimming pose and the same overall length/height relationship.
Subject invariants: oversized silvered-brass rounded helmet; one rectangular rounded cyan glass faceplate with thick brass brow/rim; cyan glow localized inside glass; broad rounded brass cuirass; deep black ribbed neck seal; two horizontal battered copper/brass pressure cylinders stacked high along the back with dark central bands and attached valves; one substantial integrated backpack/torso mass; short heavy arms and legs with black rubber bellows; circular brass shoulder/elbow/knee housings; articulated brass work gloves; weighted boots transitioning into two separate practical short dark fins; all anatomy and equipment physically connected.
Composition: exactly one full-body diver, strict orthographic side profile facing right, horizontal neutral hover, centered with generous clear padding, entire silhouette visible. Plain uniform very dark desaturated teal studio background. No floor, no shadow, no labels, no diagrams, no extra views.
Lighting: fixed restrained cool key from upper-left in screen space, warm brass bounce, no competing light. Preserve a simple readable value hierarchy.
Style: authored high-resolution hand-painted industrial game character master, controlled crisp production rendering with painterly material texture only where it survives reduction. No procedural assembly, no vector primitives, no pixel art.
Constraints: preserve Concept A silhouette and identity aggressively. Keep helmet, faceplate, cylinder pack, torso, glove, limb, and fin volumes consistent and mechanically plausible. No tool in hand. No floating/disconnected parts. Two arms, two legs, two hands, two fins only.
Avoid: redesign; generic astronaut; generic sci-fi marine; superhero; chibi; clean futuristic suit; new cages, shields, cable drums, pouches, weapons or sensor pods; perfect symmetry; repeated rivet grids; noisy microdetail; text; letters; logo; watermark; multiple views; perspective; three-quarter view; environment.
```

## Output 02 — turnaround candidate 01

- Built-in generated source: `/home/orlovboros/.openclaw/agents/codex-dev/agent/codex-home/generated_images/019f52ac-d80e-7831-b321-df9918b03dfc/exec-ff174a90-7ee3-4a0e-b37d-fd086093ae17.png`
- Project-retained raw output: `artifacts/generated/turnaround-candidate-01.png`
- Dimensions/mode: 1746 × 901 RGB PNG.
- Decision: **partially accepted with explicit scope**. Front/back construction views are accepted: helmet/faceplate, cuirass, bellows, gloves, fins, and paired cylinders remain coherent. The generated left/right poses are retained as evidence but rejected for exact side registration because they are more upright and not tightly pose-registered to the canonical horizontal master. The final orthographic board replaces them with the canonical side and its exact geometric mirror.

Exact prompt:

```text
Use case: stylized-concept
Asset type: Water9 orthographic character turnaround registration sheet
Input images: Image 1 is the canonical refined right-facing master and controls exact proportions, material hierarchy, silhouette, joint volumes and render finish. Image 2 is the original selected Concept A and controls immutable identity and authentic wear. Neither is a general style reference; they depict the same exact character.
Primary request: Produce one high-resolution clean four-view orthographic construction sheet of this exact same Water9 Heritage pressure-suit diver. Show, from left to right: strict LEFT-facing horizontal side profile, strict RIGHT-facing horizontal side profile, exact FRONT construction view, exact BACK construction view. All four views must depict the same physical suit with identical helmet diameter, faceplate dimensions, torso depth, backpack/cylinder dimensions, limb thickness, glove size, knee housings, boot/fin length, and material placement. Side views use the same neutral horizontal hover pose and are exact registered opposites in geometry. Front and back views are neutral upright construction views with arms slightly separated from torso and feet/fins separated, solely to reveal construction; maintain the same character proportions and masses.
Immutable design: oversized rounded silvered-brass helmet; one rounded-rectangular cyan faceplate with thick brass rim and projecting brow; broad rounded brass pressure cuirass; deep black ribbed neck seal; paired horizontal copper/brass pressure cylinders integrated high on the back, one behind the other in side profile and both clearly resolved in back view, with dark steel bands and attached valves; heavy short bellows limbs; circular brass joint housings; articulated brass gloves; weighted boots with paired short dark fins; localized irregular maritime wear. No tool.
Sheet layout: four isolated full figures evenly spaced on one uniform very dark desaturated teal background, abundant padding, no overlap, no floor, no cast shadows. Keep side silhouettes entirely visible. No text or labels inside the generated art.
Lighting: construction-neutral but still fixed upper-left screen-space cool key on every view, warm brass bounce, localized cyan glass glow. Do not mirror the light direction.
Style: controlled authored hand-painted production model sheet, crisp contours and coherent volumes, restrained surface detail, not a diagram overlay, not a vector drawing, not procedural assembly.
Constraints: exactly four views of one character; exactly two arms and two legs per view; all hands/limbs attached; coherent joint and tool-socket anatomy; preserve Concept A, do not redesign. The front helmet faceplate must be the same window wrapped around the front, not a new circular visor. Back view must hide the faceplate and clearly show the integrated paired cylinder/backpack structure and shoulder attachments.
Avoid: three-quarter views; perspective; action poses; extra figures; missing limbs; duplicated fins; inconsistent cylinder count; changing helmet or faceplate shape; generic sci-fi styling; astronaut redesign; shields; sensor pods; pouches; weapons; floating gear; labels; letters; numbers; watermark; diagram arrows; procedural primitives; painterly noise.
```

## Manual cleanup and board assembly

- `assemble_review_boards.py` uses Pillow only.
- The canonical is cropped with padding for presentation; no contour repainting, tracing, sharpening, procedural texture, or generated-part assembly occurs.
- The left registration view is an exact horizontal mirror of the accepted canonical crop. This is disclosed on the board and in the bible; production must repaint screen-space light/asymmetry.
- Front and back views are losslessly cropped from turnaround candidate 01. No labels cover the art.
- Boards use a dark flat presentation field, exterior typography, center guides, palette swatches, Lanczos reduction for native gameplay-size samples, nearest-neighbor enlargement, and a grayscale conversion for value review.
- No checkerboard, runtime injection, fake gameplay capture, animation frame, game source change, or runtime asset change was made.
