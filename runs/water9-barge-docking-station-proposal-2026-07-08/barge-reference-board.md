# Water9 Barge Reference Board

Short version: Water9 should borrow the readable function language of a small dive-support work barge, not the exact shape of a real ship or another game base.

## Real-World References

- NOAA Ocean Exploration, ROV overview: https://oceanexplorer.noaa.gov/technology/subs-rovs/
  - Contributes: heavy ROVs need winches plus an A-frame or crane.
  - Usable in Water9: a simple A-frame/winch silhouette over the entry gap instantly explains recovery.

- Schmidt Ocean Institute, launch and recovery systems: https://schmidtocean.org/launch-recovery-systems/
  - Contributes: working decks combine moon pool access, winches, frames, and open deployment space.
  - Usable in Water9: split the 600x72 sprite into deck zones: refit/shopping deck, moon-pool gap, machinery deck.

- Marine Technology News, ROV launch and recovery systems: https://www.marinetechnologynews.com/blogs/understanding-rov-launch-and-recovery-systems-e28093-part-1-700531
  - Contributes: LARS can be A-frame, crane, stern/side deployment, or moon pool.
  - Usable in Water9: a compact A-frame plus cable can read at pixel scale better than a detailed crane arm.

- Supreme Integrated Technology, moon pool launch and recovery systems: https://supremeintegratedtechnology.com/blog/custom-moon-pool-launch-recovery-systems
  - Contributes: moon pools are controlled deployment/retrieval openings, not just holes.
  - Usable in Water9: mark the central gap with guide rails, lit rim, cable, and a shadowed shaft.

- OSHA deck barge safety PDF: https://www.osha.gov/sites/default/files/publications/3358DECK-BARGE-SAFETY.pdf
  - Contributes: deck-barge work areas are defined by winches, lines, guarded edges, and hazard awareness.
  - Usable in Water9: yellow/white hazard ticks around the bay and machinery clarify danger/function without extra UI text.

## Game Treatment References

- Subnautica Moonpool: https://subnautica.fandom.com/wiki/Moonpool_%28Subnautica%29
  - Contributes: the docking module is also a charging/upgrading station.
  - Usable in Water9: the world barge should visually agree with HUD tabs like `Subs`, `Upgrades`, and `Refit`.

- Subnautica Vehicle Upgrade Console: https://subnautica.fandom.com/wiki/Vehicle_Upgrade_Console_%28Subnautica%29
  - Contributes: upgrade function is spatially attached to the dock.
  - Usable in Water9: a small console/glow cluster near the bay can sell "refit here" without copying the base design.

## Best Borrowable Details

- Readable A-frame or compact gantry over the entry gap.
- Cable/winch line dropping into the bay.
- Bright bay rim lights and asymmetric work lights.
- Hazard ticks around only the playable entry, not across the whole deck.
- Darker pontoons/waterline below a lighter deck plane.
- A few chunky silhouettes: tank crate, hose reel, compressor box, route antenna.

## Details To Avoid

- Full offshore ship proportions; Water9 needs a compact base, not a long vessel.
- Tiny rail/pipe detail as the main read; it collapses in grayscale.
- Magenta/green matte workflows from old attempts unless fully stripped.
- Copying another game's moonpool geometry; use the function, not the design.
