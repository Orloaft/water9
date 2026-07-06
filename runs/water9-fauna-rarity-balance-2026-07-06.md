# Water9 Fauna Rarity Balance - 2026-07-06

## Goal

Rebalance scan/log rarity for the current fauna roster so each creature's displayed rarity reflects how common it is to encounter in its biome, instead of marking most low-count experimental fauna as legendary.

## Context

- Repo: `/mnt/nxt-dev/water9`
- Manager preflight HEAD: `7ede770`
- Current observed issue: `fishRarity` in `src/helpers.ts` marks `count <= 4` or `radius >= 29` as `legendary`, which over-labels many active fauna entries in `src/content.ts`.
- Existing fauna context: `runs/water9-fauna-behavior-classes-2026-07-05/behavior-class-proposal.md` counted 138 active `biomeFish` entries.
- Existing dirty state before dispatch includes fauna animation/content files; worker must classify and preserve unrelated dirt.

## Checklist

- [x] Implement rarity rebalance — session key: `agent:mgr-water9:subagent:232e3f1f-18de-4059-9756-5c076465fcfd`, run id: `4ed4db4c-3bff-49be-9a2b-970d956979fe`, label: `water9-fauna-rarity-balance-v1` — expected artifacts: `runs/water9-fauna-rarity-balance-2026-07-06/report.md`, `runs/water9-fauna-rarity-balance-2026-07-06/fauna-rarity-audit.json`, committed code/test changes — VERIFIED at `a70c88c`; REPORTED 2026-07-06

## Acceptance Rule

Accept only after disk verification shows:

- Every active `biomeFish` species is assigned a rarity by an encounter-frequency model tied to its per-biome population/availability, not just low absolute count.
- The before/after audit explicitly lists rarity counts by biome and flags formerly over-marked legendary species that moved down.
- Common roster-fillers and school fish are not legendary; true apex/one-off articulated threats may remain legendary.
- Representative scan/log labels prove the displayed `Cataloged <species> (<rarity>)` text uses the new model.
- `npx tsc --noEmit --pretty false`, `npm run build`, and the focused rarity audit/check pass.
- No dev server remains listening on ports 5180-5199.
