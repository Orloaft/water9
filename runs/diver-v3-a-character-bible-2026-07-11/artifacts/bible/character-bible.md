# Water9 Diver V3 — Concept A Character Bible

Status: **pre-animation registration gate**. This document and its linked images define the selected Heritage pressure-suit identity. They do not authorize animation or runtime integration.

## Canonical authority

1. `canonical-neutral-side-master.png` is the primary right-facing visual authority.
2. `orthographic-turnaround.png` governs cross-view construction. Its left side is an exact geometric mirror of the canonical master; its front/back views are authored construction evidence.
3. The original selected `concept-a.png` remains the ancestry authority where a detail is obscured in the refined master.
4. Concepts B and C are not blend targets. No cable drum, salvage clamp, ceramic shoulder shield, visor cage, sensor pod, or other B/C idea may enter this design.

## Immutable visual identity

- Compact human-operated heritage pressure suit in a horizontal working-diver silhouette, not an astronaut, robot, marine, superhero, or mascot.
- Oversized rounded **silvered-brass helmet** with a projecting brass brow and one thick-rimmed rounded-rectangular cyan faceplate. The cyan glass is the face/identity beacon.
- Broad rounded brass pressure cuirass, deep black ribbed neck seal, and a mechanically supported helmet-to-chest connection.
- Paired battered copper/brass pressure cylinders mounted high along the back. In strict side profile their depth overlap can read as one dominant cylinder plus the second edge/hardware; the back construction view resolves the pair explicitly.
- Short heavy limbs made from continuous black rubber bellows volumes with circular brass joint housings and protective cuffs.
- Two articulated brass work gloves, weighted boots, and two separate short dark practical fins.
- Warm brass/copper body against cool cyan glass, with localized oxidation and irregular service wear.
- Restrained upper-left screen-space cool light, warm brass bounce, localized cyan glass emission.

## Proportions and volume lock

The inspected canonical silhouette occupies approximately `1272 × 550 px` inside the 1747 × 900 master: a **2.31:1 horizontal length-to-height ratio**. Use normalized values for re-rendering; do not trace pixels mechanically.

| Landmark | Locked relationship |
|---|---|
| Total length | 1.000 |
| Total silhouette height | 0.433 of length |
| Helmet outer diameter | about 0.24 of total length; never smaller than the upper torso depth |
| Faceplate | about 0.58 helmet width × 0.58 helmet height; rounded rectangle, not circular |
| Cuirass | broadest continuous body mass; roughly 0.35 of total length |
| Cylinder pack | high dorsal mass, about 0.39 total length; never a small generic backpack |
| Upper/lower arm | short and thick; bellows diameter about 0.45 helmet height |
| Thigh/calf | heavy and pressure-rated; never thin human wetsuit limbs |
| Glove | large enough to read as articulated work hardware at 43 px actor height |
| Fin | short, dark, mechanically attached; each fin remains distinct from the other and the torso |

Silhouette landmarks from left to right in the right-facing master: twin separated fin tips; compressed ankle/boot hardware; circular knee housing; rounded hip/thigh mass; low belly rail; broad cuirass; high cylinder pack; nested black neck; silver-brass helmet dome and projecting brow; cyan faceplate; short forward glove. The lower near arm forms a second readable diagonal below the cuirass and must not merge into a disconnected floating hand.

## Helmet and faceplate

- Helmet is a rounded pressure dome with an aged silvered/brass shell, not a sphere pasted onto the torso.
- Brow projects slightly beyond the glass and keeps the forward direction readable in silhouette.
- Faceplate remains one cyan rounded rectangle wrapped around the front quadrant. No circular porthole substitution, cage, split goggles, eyes, face, HUD text, or extra lamps.
- Visor value order: near-black blue-green edge, saturated cyan interior, restrained pale glint. Glow must not wash over the whole helmet or erase the rim.
- Helmet diameter, brow length, side service port, neck depth, and faceplate proportions remain constant in every frame and view.

## Backpack and cylinder mass

- Two cylinders are physically mounted to one integrated load-bearing back frame above the cuirass.
- Copper shells carry dark steel bands, small brass valves, irregular abrasion, and localized verdigris. Bands and fasteners must not become a repeated grid.
- Back view must show both cylinders and their shared lower manifold/hoses. Side view may occlude the far cylinder but may not shrink the pack or turn it into one unrelated tank.
- The pack is a major silhouette mass. It cannot wander, bob independently of the torso, change cylinder count, or become a thruster block.

## Suit materials, wear, and palette hierarchy

The palette is hierarchical, not a literal flat swatch limit for the high-resolution master. Animation reduction should consolidate toward these anchors:

| Role | Anchor | Use |
|---|---|---|
| Outline / rubber | `#121b1d` | deepest separations, bellows, fin cores |
| Brass shadow | `#4c3823` | lower-facing plates and recesses |
| Brass mid | `#916730` | dominant body read |
| Brass light | `#d3ab5d` | upper-left plane accents |
| Copper tank | `#914526` | dorsal pack identity |
| Oxidation | `#3d6e63` | sparse seams and exposed edges |
| Visor shadow | `#053946` | glass volume boundary |
| Visor beacon | `#30d3e5` | localized focal signal |

Brass is battered, rubbed, salt-marked, and oil-darkened. Copper has localized oxidation and scraped bands. Rubber is matte and ribbed. Glass is scratched but remains optically distinct. Wear follows exposed edges, work surfaces, and seams; it must never become uniform noise, procedural speckle, repeating rivets, or a generic grunge overlay.

## Fixed light direction

The authored key is **upper-left in screen space** in every facing and view. Warm brass bounce rises from lower body planes; cyan emission remains inside the faceplate. Mirroring geometry does not authorize mirroring light, highlights, oxidation, gauges, decals, or one-sided hardware. Production left-facing art must receive a short repaint pass to restore the same screen-space light direction.

## Limb, glove, boot, and fin construction

- Every limb is a connected pressure volume: cuirass/hip mount → circular housing → bellows → cuff → glove or boot.
- Shoulder, elbow, hip, knee, and ankle centers must remain stable across frames. Bellows compress and bend; housings do not change diameter.
- Near and far limbs may overlap but must never create extra joints, missing limbs, floating gloves, or fused fins.
- Gloves have a brass dorsal shell, dark palm, short articulated digits, and a readable wrist collar. Do not reduce them to balls or clamp claws.
- Boots are weighted transition housings. Fins are separate dark blades attached at the ankle/boot, not organic feet, flippers sprouting from calves, or long fantasy fins.

## Registration, pivots, and production coordinate contract

These coordinates are a proposed registration contract for a later sprite-production stage, expressed in a 128 × 96 body cell. They are not runtime changes in this gate.

- Body cell: `128 × 96`; right-facing authored orientation.
- Body/root pivot: `(64, 52)`, centered through the cuirass/hip load axis. Helmet, cuirass, and pack register to this root in every side-view frame.
- Upright construction ground pivot: midpoint between fin contact extents at `(64, 90)` when a front/back standing construction is normalized into the same cell.
- Safe body bounds: `(6, 8)–(122, 90)`. Tools/effects that exceed them belong in separate attachment/effect cells.
- Front/lead-hand anchor: `(112, 57)` in canonical neutral side view.
- Lower/support-hand anchor: `(96, 72)` in canonical neutral side view.
- Backpack/effect origin: `(43, 30)`. Exhaust, bubbles, or wake are separate effects.
- Chest/sonar origin: `(86, 51)`, on the forward cuirass plate; sonar rings remain separate effects.
- Belt/sample stow: `(73, 67)`.

Per-frame sockets may move with the authored hands, but each remains attached to the same anatomical hand and must be recorded as integer coordinates. The body pivot does not move to compensate for action.

## Tool sockets and hand rules

| Tool | Primary socket | Support/contact rule |
|---|---|---|
| Scanner | lead hand `(112,57)` | wrist rail aligns with forearm; support hand may brace at `(96,72)`; cone/arc starts from attachment, not body art |
| Sampler | lead hand `(112,57)` | probe axis continues through wrist; support hand stabilizes vial; sample stows at `(73,67)` |
| Sonar | chest origin `(86,51)` | lead hand presses the chest module; emitted ring is separate and uses chest origin |
| Mining cutter/drill | lead hand `(112,57)` | support hand must visibly connect to the rear grip; beam/sparks/contact decal are separate effects |

No tool may float, change hands between frames, intersect the faceplate, replace a glove, or hide the hand/tool connection. Empty-neutral master remains tool-free.

## Mirroring rules

1. Geometry may be mirrored for left-facing registration only; the included left side proves exact silhouette registration.
2. Repaint directional highlights so the key remains upper-left in screen space.
3. Do not mirror text, gauges, decals, valve markings, corrosion stories, or asymmetric repair marks. Omit them from body art or provide a left-facing overlay.
4. Tool handedness remains lead-hand consistent relative to facing. Scanner/sampler/cutter geometry mirrors; readable labels never do.
5. Chest sonar effect stays centered on its socket and is facing-independent.
6. Cylinder count, pack mount, hose routes, helmet ports, and fin lengths may not switch or mutate under mirroring.

## Forbidden drift

- No Concept B/C borrowing and no generic sci-fi modernization.
- No smaller helmet, circular visor, split visor, exposed face, luminous eyes, visor cage, or extra head lamp.
- No cable drum, pouches, giant tool clamp, ceramic shield, sensor pod, shoulder cannon, weapon, or thruster pack.
- No changing cylinder count, shrinking/wandering pack, repeated modular blocks, uniform outlines, repeated rivet grid, synthetic symmetry, or vector-clean surfaces.
- No skinny limbs, lengthened heroic anatomy, chibi proportions, disconnected puppet joints, floating hands, fused legs/fins, or changing joint diameters.
- No painterly micro-noise that becomes flicker at gameplay scale; no family-specific redesigns or moving camera/viewpoint.
- No baked beam, sonar ring, scanner arc, sampler progress, wake, bubbles, exhaust, sparks, or HUD marks in the body master.
- No mirrored screen-space light, value collapse between visor/helmet/torso, or cyan glow flooding the brass silhouette.

## Gate assessment

- Right-facing canonical side master: accepted for identity and silhouette registration.
- Left-facing side: accepted as an exact geometric registration mirror, subject to the required light/asymmetry repaint during production.
- Front/back: accepted as construction views. They keep Concept A's helmet, faceplate, cuirass, bellows, glove, fin, and paired-cylinder vocabulary, but are not animation frames and should not be traced directly into gameplay sprites.
- Animation generation remains blocked until Alex reviews this gate.
