# Diver V3 Concept A — Character Bible Gate

- Status: **COMPLETE — ready for Alex's bible/registration review**
- Starting/actual HEAD: `72f2bae`
- Scope: art/asset evidence only; no animation frames, gameplay integration, runtime assets, package configuration, staging, or commit
- Selected identity source: `runs/diver-v3-gold-master-concepts-2026-07-11/artifacts/concepts/concept-a.png`
- Concepts B/C: excluded from inputs and blend targets

## Outcome

Concept A is now represented by a refined high-resolution right-facing neutral side master, an exact left/right geometry registration pair, authored front/back construction views, a production character bible, and Telegram-readable review boards. The canonical raster remains a hand-authored model-generated bitmap refinement; it is not procedural drawing, vector assembly, traced pixel art, or a v2 derivative.

The refined master keeps A's compact horizontal Heritage pressure-suit identity: oversized silvered-brass helmet, cyan rounded-rectangular faceplate, broad rounded cuirass, high copper cylinder pack, black bellows joints, large connected work gloves, short heavy limbs, and separated dark fins. Cleanup is limited to clearer side registration and connected limb/tool-anchor anatomy.

## Immutable identity lock

- Oversized rounded silvered-brass helmet and projecting brow.
- One thick-rimmed cyan rounded-rectangular faceplate as the focal beacon.
- Broad rounded brass pressure cuirass and deep black ribbed neck seal.
- Paired battered copper/brass cylinders integrated high on the back.
- Short heavy continuous bellows limbs with circular brass housings.
- Articulated brass work gloves, weighted boots, and two short separate dark fins.
- Compact 2.31:1 horizontal silhouette, worn maritime materials, warm/cool split, and fixed upper-left screen-space cool key.
- No B/C features, generic sci-fi restyling, repeated primitive construction, or disconnected puppet parts.

## Final artifacts

- Canonical master: `artifacts/bible/canonical-neutral-side-master.png` (1747 × 900 RGB)
- Character bible: `artifacts/bible/character-bible.md`
- Final orthographic turnaround/registration: `artifacts/bible/orthographic-turnaround.png` (1800 × 1120 RGB)
- Character-bible review board: `artifacts/review/character-bible-board.png` (1800 × 1200 RGB)
- Orthographic registration review board: `artifacts/review/orthographic-registration.png` (1800 × 1120 RGB)
- Gameplay scale/grayscale review board: `artifacts/review/gameplay-scale-and-grayscale.png` (1800 × 1060 RGB)
- Raw retained turnaround generation: `artifacts/generated/turnaround-candidate-01.png` (1746 × 901 RGB)
- Full prompts, inputs, decisions, tool disclosure, and manual assembly record: `artifacts/lineage/generation-lineage.md`
- SHA-256 manifest: `artifacts/manifest.sha256`

## Generation/edit lineage summary

Two Codex built-in `image_gen` reference-guided calls were made. The tool did not expose model ID, seed, sampler, steps, quality, or input-fidelity controls, and this report does not invent them.

1. Concept A alone was used to create the canonical identity-preserving neutral side master. The first output was accepted and retained as the canonical file.
2. The canonical master plus Concept A were used to create a four-view turnaround candidate. Its front/back construction views were accepted; its generated side poses were retained but rejected for exact registration because they were more upright than the canonical horizontal pose. The final side pair therefore uses the canonical side and an exact geometric mirror.

Pillow performed only presentation crop/scale, exact mirroring, exterior typography/guides, palette swatches, grayscale conversion, and board assembly. It did not synthesize, trace, repaint, or procedurally assemble diver art.

## Visual review and validation

Inspected at original resolution and on all three final boards:

- **Identity drift:** pass. Helmet, faceplate, cuirass, pack, bellows, gloves, and fins retain A; no B/C parts entered.
- **Helmet/faceplate continuity:** pass. Same rounded dome/brow and cyan rectangular glass vocabulary across accepted views.
- **Backpack continuity:** pass with disclosed side occlusion. Side view reads one dominant long cylinder mass; back view explicitly resolves the paired cylinders and shared manifold.
- **Limb/glove/fin volume:** pass. Two connected arms, two connected legs, readable attached hands, and two distinct fins. No floating tool or disconnected socket is present.
- **Tool sockets:** pass as a documented production contract. Scanner, sampler, sonar, and mining sockets/hand rules are specified; the neutral art remains tool-free.
- **Generic/procedural drift:** pass. No geometric v2 block-man construction, vector-clean mascot style, repeated rivet grid, or generic sci-fi marine additions.
- **Gameplay scale:** pass as a visual preview, not runtime proof. Native 30/43/60 px studies and nearest-neighbor enlargements retain the high pack, helmet, cyan beacon, torso, gloves, and fins. Fine material wear intentionally merges at 43 px and must be simplified during future sprite authoring rather than preserved as noise.
- **Grayscale:** pass. Visor remains a distinct focal patch; helmet/pack/body/fins maintain separable masses. Small internal brass detail collapses, as expected, without silhouette collapse.
- **Board legibility:** pass. 1800 px-wide PNGs, no checkerboard, and labels/guides remain outside silhouettes.
- **File integrity:** all final PNGs open as RGB and have the reported dimensions; SHA-256 manifest generated after final board assembly.

## Caveats and gate boundary

- Front/back views are coherent construction views, not sprite frames. Their upright presentation is intentional for resolving the helmet, limbs, and paired back cylinders; they must not be treated as animation output.
- The left side is an exact geometric mirror for registration. Production left-facing art still needs a repaint pass so screen-space upper-left light, wear, gauges, and asymmetric hardware do not mirror incorrectly.
- The raw turnaround candidate's generated side poses did **not** maintain the canonical horizontal registration closely enough. They remain preserved for lineage but are excluded from the final side authority.
- The canonical and boards have opaque dark studio backgrounds. This gate does not claim transparent runtime-ready assets, alpha-edge quality, palette lock, final pixel clusters, in-engine scale, collision/pivot integration, or animation continuity.
- No animation frame generation should begin until Alex accepts this bible/registration gate.
