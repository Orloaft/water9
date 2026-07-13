# Water9 Diver V3 Gold-Master Concepts

- Status: **COMPLETE — awaiting Alex's selection**
- Starting/actual HEAD: `72f2bae`
- Scope: concept-selection gate only
- Runtime/source integration: **not performed**
- Final acceptance: **not claimed**

## Outcome

Three distinct, high-resolution, painterly diver directions are ready for Alex to choose between. They retain the live diver's brass pressure-suit identity, cyan faceplate, backpack mass, warm/cool split, and horizontal-swim ancestry without extending the rejected v2 construction. The final PNGs are direct model-generated raster concepts; they are not procedural drawing, programmatic pixel art, traced sprites, or assembled vector primitives.

### Selection images

- A — Heritage pressure suit: `artifacts/concepts/concept-a.png` (1748×900)
- B — Salvager/miner: `artifacts/concepts/concept-b.png` (1586×992)
- C — Abyssal explorer: `artifacts/concepts/concept-c.png` (1587×991)
- Telegram-ready color board: `artifacts/review/gold-master-comparison.png` (1800×640)
- Grayscale board: `artifacts/review/grayscale-comparison.png` (1800×640)
- Gameplay-footprint study: `artifacts/review/gameplay-scale-previews.png` (1800×760)
- Full exact prompts and reference lineage: `artifacts/generation-lineage.md`
- Dimensions and SHA-256 manifest: `artifacts/manifest.json`

## Verified live identity and reference evidence

The live path was verified from source, not inferred from filenames:

1. `src/helpers.ts` defines `assetPath(name)` as `/assets/generated/${name}.png` and loads each configured key `diver-${animation}-${i}`.
2. `src/scene.ts` creates the normal player with `diver-swim-0`.
3. `src/scene-rendering.ts` hides the articulated prototype and calls `drawLegacyDiver()` for normal play.
4. The corresponding live files exist at `public/assets/generated/diver-swim-0.png` and `public/assets/generated/diver-idle-0.png`.

Positive visual references inspected before generation:

- Audit and live captures: `runs/current-diver-sprite-audit-2026-07-11/report.md`, including audited surface idle, mid swim, and deep boost `#game canvas` PNGs.
- Runtime diver sources: live `diver-swim-0.png` and `diver-idle-0.png` above.
- Water9-specific runtime context: the surface/mid/deep/abyss band captures in `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/`, plus the accepted painterly landmark proof contact sheet in `runs/water9-painterly-bitmap-landmark-final-proof2-2026-07-04/`.
- Negative reference: `runs/diver-v2-asset-production-2026-07-11/report.md` and `artifacts/review/contact-sheet-color-2x.png`. Its front-facing block construction, repeated rectangles, flat ramps, uniform outlines, repeated rivets, and disconnected puppet-joint read were explicitly prohibited in every prompt.

The gameplay-scale review board places the concepts beside the audited current mid-swim canvas and the actual live sprite. Separate full-size inspection used the Water9 biome-2 and abyss/hadal runtime captures to test material/value fit in unmistakably Water9 contexts.

## Direction A — Heritage pressure suit

**Design.** The most direct evolution of the current identity: a broad brass pressure shell, cyan glass, integrated twin-cylinder pack, short articulated limbs, weighted boots/fins, and restrained asymmetry. It reads as inherited maritime equipment that has stayed in service through many repairs.

**Strengths.** Best continuity and clearest production base. The helmet/chest/pack relationship is immediately legible, the faceplate stays the focal point in color and grayscale, and the silhouette remains compact without collapsing into the v2 box-man. The cylinders, neck lock, elbows, knees, gloves, and fins all have understandable physical connections.

**Risks.** Least differentiated narratively. The upper pack is visually dominant and would need simplification for a small sprite. The neutral pose reveals depth with a mild three-quarter bias rather than behaving like a perfectly flat orthographic blueprint.

**Why it escapes the procedural-placeholder read.** Plate contours vary with function; fasteners are irregular; wear follows exposed edges; brass, rubber, glass, and oxidized seams break differently; the torso/limbs form continuous volumes rather than separate blocks. The surface treatment is painterly and non-repeating, not a palette swap or uniform outline pass.

## Direction B — Salvager/miner

**Design.** A work-first pressure suit with a cable-drum pack, battered bottles, asymmetrical salvage harness, repaired armor, pouches, one armored glove, and an empty quick-change forearm clamp. It is deliberately heavier and more field-modified than A.

**Strengths.** Strongest gameplay-role story and clearest tool-readiness. The cable drum and clamp produce a memorable working-diver silhouette; unequal pack modules and concentrated work wear make the history feel authored. The broad mass still preserves the cyan/brass identity.

**Risks.** Highest detail density and largest silhouette. At the approximate 43 px study, the faceplate survives but harness/pouch/tool details merge into a dark working mass. Production would require aggressive hierarchy and simplification. The clamp must remain an attachment socket rather than becoming a permanently baked tool.

**Why it escapes the procedural-placeholder read.** The pack is organized around a specific cable-handling function, field repairs are localized, harness loads connect across the torso, forearms have unequal jobs, and the fasteners/material damage do not repeat on a grid. The anatomy is continuous and weight-bearing instead of v2's interchangeable puppet pieces.

## Direction C — Abyssal explorer

**Design.** A hadal evolution with a caged cyan faceplate, deep neck isolation, ribbed pack, broad fins, a sacrificial ceramic shoulder shield, guarded hoses, and one offset sensor pod. It is stranger at the helmet/shoulder silhouette but remains credible pressure engineering.

**Strengths.** Most iconic deep-zone read. The visor cage, ceramic shield, and sensor pod create a distinct silhouette without losing the live diver's face beacon or warm/cool split. Grayscale retains strong helmet, shoulder, torso, and fin separation.

**Risks.** Furthest from the current sprite and closest to a broader premium-diving-concept vocabulary. The honeycomb ceramic texture and cage would need careful reduction to avoid noise at runtime scale. It could imply a later-game suit upgrade more naturally than the universal starting diver.

**Why it escapes the procedural-placeholder read.** The visor cage has a protective pressure function, the ceramic shield interrupts symmetry, the sensor is genuinely offset, and the pack/hoses visibly connect into the suit. Mineral accretion, chipped coatings, brass, ceramic, rubber, and glass each have distinct, irregular surface behavior rather than flat modular fills.

## Visual verification performed

Every submitted PNG was inspected at original resolution and again through the ~43 px footprint study. Checks performed:

- Exactly one diver, two connected arms, two connected legs, readable hands/gloves, boots/fins, helmet/chest/pack relationships, and physically attached equipment.
- No text, watermark, logo, floating gear, giant weapon, or inconsistent secondary light source inside any final concept.
- Side-facing horizontal neutral/hover pose and a clear rightward facing direction in all three.
- Cyan faceplate remains the identity beacon in color; grayscale board tests value grouping independently of hue.
- All three survive thumbnail reduction as different silhouettes: A's compact cylinders, B's cable drum/tool clamp and heavy harness, C's cage/ceramic shoulder/sensor and broad stabilizing fins.
- Direct comparison against the actual live swim sprite and audited live Water9 mid canvas is captured in `gameplay-scale-previews.png`.
- Full-size material/value comparison was performed against audited surface/mid/deep captures and unmistakable Water9 biome-2 and abyss/hadal runtime evidence.
- Procedural-placeholder audit looked specifically for repeated primitives, uniform outlines, flat fills, repeated rivets, synthetic symmetry, disconnected limbs, and palette-swapped sameness; none is a governing construction in the submitted finals.

The ~43 px samples are deliberately labeled **preview only, not runtime proof**. They are downscaled review crops on neutral backdrops; no concept was injected into Phaser and no fabricated runtime capture was made.

## Generation and curation record

- Workflow: Codex built-in `image_gen`, new raster generation with local reference images, one independent call per direction.
- Exposed settings: the tool did not expose model name, seed, sampler, steps, or quality controls. This is recorded rather than guessed.
- Candidate count: 3.
- Rejected-candidate count: **0**.
- Rejected-candidate rationale: none. All three first returns passed anatomy, attachment, text/watermark, lighting, pose, and non-generic-style inspection. No fake rejection/regeneration count was introduced.
- Exact prompts, ordered source inputs, tool disclosure, and compositing disclosure are in `artifacts/generation-lineage.md`.
- Review assembly used FFmpeg for cropping/scaling, grayscale conversion, stacking, and exterior labels only. It did not redraw or trace the concepts.

## Blunt recommendation

**Select A as the canonical gold-master direction.** It has the best balance of existing-player recognition, authored material character, readable mass, and practical reducibility into a coherent production package. It is the safest base for later action sheets without feeling safe or generic.

If Alex wants the player fantasy to emphasize labor over heritage, select B—but budget a deliberate simplification pass before sprite production. Treat C as the strongest later-game/deep-pressure upgrade direction; it is excellent worldbuilding but a riskier universal protagonist reset.

## Caveats and gate boundary

- These are concept paintings on opaque dark backdrops, not transparent runtime-ready assets.
- The poses are side-facing horizontal model views with enough three-quarter depth to show both limb chains; a selected direction still needs a strict orthographic turnaround and registration drawing before animation production.
- Gameplay-scale studies test silhouette/value only. They do not prove animation, collision, pivot, alpha edge quality, mirroring, attachment sockets, or in-engine lighting.
- No animation sheet, frame package, manifest for runtime playback, source integration, or game capture was created.
- Alex must select A, B, or C before any production pass begins.
