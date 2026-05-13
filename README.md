# Abyss Miner

A browser MVP for a spiritual successor to vfqd's **Deepdive** and classic mining-loop games like **Motherload**.

## Stack

- Vite for fast browser iteration and static builds.
- TypeScript for world, resource, fish, and upgrade state.
- Phaser 3 for camera, input, procedural terrain rendering, and the game loop.
- DOM/CSS for the boat HUD and upgrade panel.

## MVP Feature Parity

- Procedurally generated underwater world.
- Fully destructible terrain tiles.
- Rubble and loose minerals, so full cargo never prevents tunneling out of danger.
- Minerals with depth-scaled value.
- Oxygen, hull, cargo, credits, and max-depth pressure.
- Return-to-boat loop for selling cargo, refilling oxygen, and repairing.
- Dock-only upgrade shop for O2, cargo, laser, lamp, scanner, pressure suit, and diver jets.
- Fish species with swim patterns, bump reactions, and hold-to-scan research payouts.
- Scannable underwater flora, including rare hazardous types.
- Hostile deep creatures and darkness by depth.
- 5,000-credit barge retrofit with confirmation before traveling to the Brine Vent Shelf.
- Second biome prototype with richer ores, new fauna, thermal vents, raised upgrade caps, and Thermal Plating.
- Third biome prototype with tougher fauna, hazardous flora, stronger vents, and unmineable Anchorstone bands that constrain tunnel widening.
- Tighter camera framing and laser upgrades that mine faster and cut multiple nearby blocks.
- Simple end goal: reach the deep zone and scan the abyss signal.

## Run

```bash
npm install
npm run dev
```

Controls: WASD/arrows to swim, mouse or Space to cut terrain, hold E to scan fish, R to restart.
