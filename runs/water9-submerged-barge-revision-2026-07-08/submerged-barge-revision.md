# Water9 Submerged Barge Revision

## Recommendation

Revise the barge from a surface deck/platform into a submerged-only docking underside: the player should see the industrial belly of a support barge or compact underwater docking station, not the top deck.

Smallest approved first slice: replace the existing `600x72` `barge-platform` runtime sprite with a new underwater underside sprite that keeps the current transparent central docking gap, current collision assumptions, and current normal-play placement. Do not expand rendering toward sky, deck, or surface-platform presentation.

The visual read should be:

- "This is the underside of the base."
- "The lit center throat is where I dock."
- "The rails, cable, winch, tanks, and lights make it a refit/recovery station."
- "It belongs underwater and does not need a surface scene."

## What Changes From The Previous Proposal

The previous proposal aimed at a compact salvage-dive support platform with a protected moon-pool entry, but it still leaned on above-water deck language: deck zones, A-frame/gantry silhouette, shop deck, antenna/mast clutter, and surface-platform composition.

This revision keeps the useful functional ideas and moves them below the waterline:

- Deck/readable platform -> underside pontoon and hull mass.
- A-frame hero silhouette -> hanging winch carriage, cable, guide rollers, and dock throat hardware under the hull.
- Shop/refit deck props -> compact underside repair pods, utility housings, hose reels, battery boxes, and lit service machinery.
- Surface hazard striping -> underwater rim markings around the docking throat and side rails.
- Above-water base fantasy -> submerged industrial docking infrastructure.

The old direction tried to make the barge read as a small working deck. The new direction makes it read as the part of that vessel Water9 actually needs to render: the underside where divers and subs enter.

## Why Submerged-Only Is Better Scope Now

- It honors Alex's scope concern: no sky expansion, no above-water deck hero, no surface composition work.
- It fits Water9's strongest view: the game is about underwater play, so the hub should sell underwater function at gameplay scale.
- It preserves the current runtime contract: `600x72`, central transparent bay, existing collision grid, and normal docked canvas proof.
- It avoids solving nonessential questions like what is on the deck, how the sky/surface should render, and how tall equipment interacts with the HUD.
- It gives the player stronger wayfinding: a lit underside throat can be clearer than a dark rectangular hole under a deck.

## Proposed Visual Composition

Use a "submerged industrial docking underside" composition inside the current `600x72` footprint.

Core silhouette:

- Dark, chunky underside pontoons or hull sponsons on left and right.
- Slightly heavier mass at both ends, with a lighter open center.
- No readable top deck, no tall mast, no surface crane, no sky-facing architecture.

Central docking throat:

- Keep the current central transparent/open gap aligned with the existing bay.
- Ring the gap with cool-white/amber utility lights, small hazard ticks, and darker interior water.
- Add side guide rails or vertical guide posts that point the player into the bay without blocking it.
- Hang one cable/winch line down the middle or just behind the throat, readable but not collision-changing.

Underside machinery:

- Left side: repair/refit pod, ballast tank, hose loop, small service light.
- Right side: winch drum, battery/cable box, route/sonar machinery, small beacon light.
- Add mooring chains or short dangling cables at the outer thirds for underwater weight.
- Use 2-3 high-contrast utility lights rather than lots of tiny pipe detail.

Palette/readability:

- Hull mass: dark blue-green steel and muted rust.
- Functional lights: warm amber and pale cyan.
- Hazard accents: limited yellow/white only around the docking throat and guide rails.
- Grayscale priority: the throat, side pontoons, cable, and utility pods must remain distinguishable without color.

## First Implementation Slice

Touch the smallest possible surface area:

- Replace `public/assets/generated/barge-platform.png` only.
- Produce run proof files under a new implementation run directory, for example `runs/water9-submerged-barge-first-slice-2026-07-08/`.
- Do not change `src/constants.ts`, `src/helpers.ts`, `src/scene.ts`, `src/scene-rendering.ts`, or `src/hud.ts` unless the worker finds an unavoidable mismatch and reports it before editing.
- Do not introduce a surface/deck scene, new sky work, new waterline composition, or taller above-water overlay sprites.

Files likely touched:

- `public/assets/generated/barge-platform.png`
- Optional only if the repo pattern clearly supports it: a narrowly scoped asset generation/helper file under `tools/`
- Proof artifacts in the implementation run directory

The first slice should prove that the same runtime object can read as submerged infrastructure. Later slices can add animated utility lights, cable sway, or bay glow only after the static sprite lands.

## Visual Acceptance Bar

The implementation is not accepted from asset-sheet inspection alone. It needs live runtime proof:

- Normal-play `#game canvas` proof at gameplay scale, docked or near the barge, showing the underwater underside in context.
- Grayscale companion proof from the same normal-play capture, showing the docking throat and machinery still readable.
- Before/after asset sheet comparing the existing barge sprite against the new submerged underside sprite.
- Smoke JSON from the existing barge visual smoke, with `600x72` texture size, open docking gap, low matte fringe, and no failed assertions.

Existing baseline evidence from the previous pack may be reused for comparison:

- `/mnt/nxt-dev/water9/runs/water9-barge-docking-station-proposal-2026-07-08/current-barge-canvas.png`
- `/mnt/nxt-dev/water9/runs/water9-barge-docking-station-proposal-2026-07-08/current-barge-canvas-gray.png`
- `/mnt/nxt-dev/water9/runs/water9-barge-docking-station-proposal-2026-07-08/current-barge-asset-review.png`
- `/mnt/nxt-dev/water9/runs/water9-barge-docking-station-proposal-2026-07-08/current-barge-smoke.json`

## Risks And Caveats

- The current sprite is still positioned at the surface zone, so the art has to sell "underside" without requiring runtime placement changes.
- Overloading the `600x72` sprite with tiny rails, pipes, and chains could collapse into noise at gameplay scale.
- If the center lights are too bright or too solid, they may visually close the transparent gap.
- If machinery rises into a deck-like silhouette, the work will drift back toward the discarded surface-platform direction.
- The existing HUD may still cover parts of the barge, so the central and lower-middle read matter most.
- Any dimension or gap change risks invalidating current collision and docking assumptions.

## Deck/A-Frame/Shop-Deck Decision

Discard the old deck/A-frame/shop-deck idea for the current runtime barge slice. Save it only as future concept material for a docked menu illustration, a later surface scene, or a separate story beat if Water9 intentionally expands above the waterline. It should not drive the first implementation.
