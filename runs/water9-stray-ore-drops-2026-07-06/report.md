# Water9 Stray Ore Drops - 2026-07-06

Initial state:
- Repo: `/mnt/nxt-dev/water9`
- Starting HEAD: `a70c88c`
- Preserved pre-existing dirty fauna/content/helper work.

Root cause:
- `releaseOpenedOreTiles()` scanned a 7x7 area around every drill impact and broke any ore whose terrain mask looked opened.
- A normal cutter pass through nearby stone/sand can open adjacent hidden ore masks, so that scan spawned ore pickups even though the mined target was plain terrain.
- The nearby ore target helper could also select an adjacent ore when the aimed tile was solid plain terrain.

Fix:
- `mineAt()` now disables the nearby visible-ore target assist when the player aims at a solid non-ore tile.
- `releaseOpenedOreTiles()` now considers only the tiles selected for this mining action.
- Targeted ore can still release when it has been substantially drilled and the terrain mask would otherwise prevent a final break.

Proof:
- Before JSON: `runs/water9-stray-ore-drops-2026-07-06/stray-ore-drops-before.json`
- After JSON: `runs/water9-stray-ore-drops-2026-07-06/stray-ore-drops-proof.json`

Before fix, the focused smoke reported:
- Plain stone drilled near ore: 2 collectible ore pickups (`copper`, `quartz`)
- Plain sand drilled near ore: 2 collectible ore pickups (`copper`, `quartz`)
- Actual copper node mined: 3 collectible ore pickups (`quartz`, `copper`, `ruby`)

After fix, the focused smoke reported:
- Plain stone drilled near ore: 0 collectible ore/artifact pickups
- Plain sand drilled near ore: 0 collectible ore/artifact pickups
- Actual copper node mined: exactly 1 collectible ore pickup (`copper`)

Verification:
- `node tools/test_stray_ore_drops.mjs` - passed
- `npx tsc --noEmit --pretty false` - passed
- `npm run build` - passed, with existing unresolved asset/chunk-size Vite warnings
- Port check `5180-5199` - no listeners
