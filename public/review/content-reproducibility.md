# Water 9 Content Reproducibility

This report proves the current 20 target threats have a repeatable path from magenta source image to articulated runtime preview. It does not approve source art or accept threats.

## Summary

- Target threats: 20
- Reproducible targets: 20
- Magenta sources: 20
- Art contracts: 20
- Starter plans: 20
- Plan previews: 20
- Runtime registered: 20

## Commands

```bash
npm run content:reproducibility
npm run content:reproducibility-check
npm run source:contracts && npm run source:contracts-check
npm run articulated:extract-plan -- --plan tools/scratch/<id>-starter-plan.json --dry-run
npm run sandbox:preview -- --id <id> --with diver --serve --open --visual
```

## Targets

| Target | Reproducible | Source key | Contract | Plan | Plan preview | Runtime | Blockers |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| abyssal-lantern-mantis | yes | magenta | yes | yes | yes | yes | none |
| black-coral-gate | yes | magenta | yes | yes | yes | yes | none |
| brine-crown | yes | magenta | yes | yes | yes | yes | none |
| brine-mycelium-shelf | yes | magenta | yes | yes | yes | yes | none |
| chain-vein-siphonophore | yes | magenta | yes | yes | yes | yes | none |
| coronate-sting-crown | yes | magenta | yes | yes | yes | yes | none |
| glass-sponge-sentinel | yes | magenta | yes | yes | yes | yes | none |
| gulper-eel-maw | yes | magenta | yes | yes | yes | yes | none |
| hadal-trencher-isopod | yes | magenta | yes | yes | yes | yes | none |
| lantern-anemone-pit | yes | magenta | yes | yes | yes | yes | none |
| predatory-tunicate-maw | yes | magenta | yes | yes | yes | yes | none |
| razor-kelp-harp | yes | magenta | yes | yes | yes | yes | none |
| reef-lion-moray | yes | magenta | yes | yes | yes | yes | none |
| reliquary-siphonophore | yes | magenta | yes | yes | yes | yes | none |
| saber-viperfish | yes | magenta | yes | yes | yes | yes | none |
| thorn-fan-coralline | yes | magenta | yes | yes | yes | yes | none |
| trench-harvest-sea-spider | yes | magenta | yes | yes | yes | yes | none |
| tripod-stilt-stalker | yes | magenta | yes | yes | yes | yes | none |
| vampire-cloak-squid | yes | magenta | yes | yes | yes | yes | none |
| vent-claw-yeti | yes | magenta | yes | yes | yes | yes | none |
