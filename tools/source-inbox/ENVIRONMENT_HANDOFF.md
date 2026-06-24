# Environment Imagegen Handoff

Target inbox file:

`tools/source-inbox/environment-cave-wall-source.png`

Generate or paste a 5-column by 6-row source sheet on a perfectly flat `#ff00ff`
background. Each cell should contain one isolated, cutout-ready painted asset in
the order listed by `public/assets/source/environment-cave-wall-source-manifest.json`.

Prompt:

Use case: stylized-concept
Asset type: 2D underwater cave environment source sheet for Water9
Primary request: Create an original source sheet of dark painted cave wall
fragments, embedded ore clusters, wall-rooted alien flora, and one sharp cave
hazard for a side-scrolling underwater survival-horror game. Use Barotrauma only
as general inspiration for mood: continuous cave rock, diver-scale darkness,
minerals fused into rock faces, and harvestable flora growing from cavern walls.
Do not copy Barotrauma assets.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: 5 columns by 6 rows, one isolated asset per cell, generous padding,
no labels, no text, no shadows on the background.
Style: high-quality hand-painted 2D sprite art, muted cyan/green/grey rock,
gloomy survival-horror lighting, restrained bioluminescent accents, dense
texture, readable silhouettes.
Avoid: square tiles, checkerboard terrain, clean vector icons, sticker-like
props, bright candy colors, duplicated cells, UI frames, watermarks, screenshots.

After placing the image at the target path, run:

`npm run assets:environment-rework`

If Codex Imagegen returns the sheet inline through CLI auth, recover the latest
matching generated PNG directly from the Codex session log:

`npm run environment:recover-codex-imagegen -- --dry-run`

`npm run environment:recover-codex-imagegen`

Then rebuild the sliced assets:

`npm run assets:environment-rework`
