# Water9 Fauna Rarity Balance - 2026-07-06

Status: implemented and verified.

Scope: rebalanced active `biomeFish` scan/log rarity from encounter commonness, kept rewards tied to labels, and added a focused audit/regression check. Flora was left unchanged because the inflated-legendary bug was isolated to fish rarity.

## Model

`fishRarity` now scores each species against the species in its own biome:

- Relative population count is the primary signal.
- Depth-band availability nudges the encounter score, so narrow deep specialists are rarer than broad-band species at the same count.
- Hostility, large size, scarce threats, and late-depth specialist placement can promote a creature by one tier.
- Legendary is reserved for apex-sized small fauna: radius `>= 29`, or hostile radius `>= 27` with count `<= 5`.
- High-count schools are capped at uncommon, and ordinary non-hostile filler fish are capped below epic.

## Legendary Counts

| Biome | Species | Before legendary | After legendary |
| --- | ---: | ---: | ---: |
| 1 | 41 | 26 | 0 |
| 2 | 38 | 26 | 0 |
| 3 | 32 | 22 | 1 |
| 4 | 27 | 17 | 1 |
| Total | 138 | 91 | 2 |

Full after distribution: common 13, uncommon 25, rare 77, epic 21, legendary 2.

## Representative Scan Labels

- `Cataloged Lantern Fry (Common). Research paid 320 credits.`
- `Cataloged Opal Fan Shrimp (Rare). Research paid 1150 credits.`
- `Cataloged Glimmer Spine Urchin (Epic). Research paid 2280 credits.`
- `Cataloged Moonmask Lionfish (Epic). Research paid 2280 credits.`
- `Cataloged Blueglass Anthias (Uncommon). Research paid 620 credits.`
- `Cataloged Black Swallower (Legendary). Research paid 3780 credits.`
- `Cataloged Abyssal Thread Eel (Rare). Research paid 1150 credits.`
- `Cataloged Cinder Maw Dragonfish (Epic). Research paid 2280 credits.`

## Artifacts

- `runs/water9-fauna-rarity-balance-2026-07-06/fauna-rarity-audit.json`
- `tools/check_fauna_rarity_balance.mjs`

## Verification

- `npm run water9:fauna-rarity-check`: passed.
- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed. Vite emitted existing unresolved-runtime-asset/chunk-size warnings only.
- Ports 5180-5199: no listeners.
