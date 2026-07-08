# Water9 Barge Docking Station Proposal

## Recommendation

Make the barge read as a compact salvage-dive support platform with a protected moon-pool entry, not a generic flat cargo barge. Keep the first implementation to one improved `600x72` `barge-platform` sprite that preserves the current collision/gap contract, but repaint the silhouette so the player immediately sees: "enter here, get winched back here, refit/shop here, launch subs here."

## Current Barge Critique

Evidence created in this run:

- Live proof: `current-barge-canvas.png`
- Grayscale proof: `current-barge-canvas-gray.png`
- Asset review sheet: `current-barge-asset-review.png`
- Smoke report: `current-barge-smoke.json`

What looks out of place at gameplay scale:

- It reads as a flat strip first. In the live proof, the visible barge is mostly one long horizontal deck band behind the HUD and waterline. The crane/winch detail exists, but the dominant shape is a thin rectangle rather than a base.
- The docking gap is technically open but not staged. Smoke reports `dockGapTransparent: 1342 / 1464` samples, so the alpha gap exists. In the grayscale proof, though, the gap reads like a dark rectangular absence under the deck, not a lit moon-pool or deliberate player entrance.
- The silhouette has weak vertical hierarchy. The asset has lots of pixel detail in `current-barge-asset-review.png`, but at normal play scale only the crane bump and deck rail survive; refit/shop/sub/quest functions do not.
- Material language is split. The HUD says `Refit and resupply`, `Submersible bay`, route charting, and contracts, but the world sprite mostly says rusted cargo deck.
- The waterline overlays help, but they do not solve the base read. The player is placed at the bay and the wake line is visible, yet the barge still feels like background trim rather than the player's hub.

Source constraints behind that evidence:

- Runtime texture is `public/assets/generated/barge-platform.png`, currently `600x72` RGBA.
- `src/helpers.ts:540` loads it as `barge-platform`.
- `src/scene.ts:152` creates `this.bargeSprite` from `barge-platform`.
- `src/scene-rendering.ts:3113` draws the boat into the world and sets the sprite display size to `BARGE_PLATFORM_WIDTH x BARGE_PLATFORM_HEIGHT`.
- `src/constants.ts:20-30` defines the `25 x 3` tile platform and central entry/docking gap.
- `src/helpers.ts:3113-3138` defines barge solidity from that grid, including the open bay.
- `src/hud.ts:1088-1105` gives the barge menu five base functions: Barge, Items, Upgrades, Subs, Quests.

## Reference-Informed Design Principles

- Dive support vessels and ROV systems use winches, A-frames/cranes, and moon pools to make deployment controlled and repeatable. References: NOAA ROV overview, Schmidt Ocean launch/recovery systems, Marine Technology News LARS overview.
- A moon pool is an intentional protected launch opening, so the Water9 gap needs rim lights, guide rails, cable, and darker interior water, not just transparency. Reference: Supreme Integrated Technology MLARS.
- Work barges communicate danger and utility through edge guards, winches, lines, machinery zones, and high-visibility markings. Reference: OSHA deck barge safety.
- Underwater base games make docking and upgrading spatially connected. Water9 should not copy Subnautica, but its barge sprite should visually agree with the existing `Subs` and `Upgrades` tabs.

Reference board: `barge-reference-board.md`

## Proposed Visual Direction

Use "small industrial salvage moon-pool outpost."

The barge should have:

- A central moon-pool bay aligned to the existing gap, with lit rim, hanging winch cable, and side guide posts.
- A compact A-frame or gantry over/near the gap, more readable than the current small crane arm.
- Left-side refit/shop deck: compressor tanks, console glow, stacked crates, hose reel.
- Right-side sub bay/route machinery: winch drum, antenna mast, battery/cable box, small beacon.
- Dark pontoon mass below the deck, lighter worn deck above, and a clear waterline cut.
- Sparse hazard markings around the entry only, so the playable gap is the brightest functional accent.
- Asymmetry in equipment but symmetry in the actual collision footprint.

The interaction read should be:

- "Swim up through the lit center gap."
- "The winch/A-frame can recover me."
- "The deck is a refit shop, not just scenery."
- "Future subs launch from the same bay."
- "This base can chart deeper routes because it has machinery and antennas."

## Implementation Approach

Best first approach: one improved `600x72` sprite.

Why:

- It preserves the existing smoke contract and collision math.
- It avoids touching the HUD and gameplay flow.
- It lets Alex judge the art direction fast in the actual canvas.
- It is the smallest change that can eliminate the current failure modes: flat strip, unclear docking gap, weak silhouette, and disconnected function language.

First slice:

- Replace only `public/assets/generated/barge-platform.png` with a new `600x72` RGBA sprite.
- Preserve the central transparent docking gap at the current sample region.
- Keep the 25x3 platform footprint and open bay.
- Push readability at 1x gameplay scale and in grayscale.
- Prove with the existing barge visual smoke, a live color canvas, a grayscale canvas, and an asset review sheet.

Later slices:

- Add one or two optional overlay sprites for animated bay lights, cable sway, or beacon blink if the static sprite lands.
- Consider UI/world separation only if the barge menu keeps hiding the most important visual cues.
- Add a larger first-screen/docked composition only if Alex wants the base to feel like a major narrative hub, not just a gameplay station.

Risks:

- A taller/more detailed gantry can collide visually with HUD panels at the surface.
- Too many small pipes/rails will collapse in grayscale.
- Reusing old source attempts without a fresh matte cleanup can reintroduce magenta/green edge artifacts.
- If the first slice changes dimensions or gap location, `bargeSolidAtWorld`, the smoke, and player docking could drift.

Proof required for the slice:

- `current-barge-canvas.png` equivalent shows the barge in normal docked play with HUD/world context.
- Grayscale equivalent still shows the bay, winch/gantry, and deck/pontoon separation.
- Smoke passes with `600x72`, open gap, low fringe, and enough contrast/detail pixels.
- A before/after asset sheet shows the old strip versus the approved new platform.

## Alternatives

- Layered sprites immediately: reject for first slice because it expands loading/rendering/smoke scope before the art direction is approved.
- Larger first-screen dock composition: reject for first slice because it solves presentation but not the in-world gameplay-scale read.
- Procedural deck overlays: reject for first slice because deterministic details are harder to art-direct than one approved sprite.

## Open Questions For Alex

- Should the barge feel scrappy and dangerous, or more reliable and expedition-grade?
- Should the central bay imply diver-only entry now, or should it visibly foreshadow sub docking from day one?
- Is the barge allowed to look taller above the waterline if the HUD still overlaps part of it?
