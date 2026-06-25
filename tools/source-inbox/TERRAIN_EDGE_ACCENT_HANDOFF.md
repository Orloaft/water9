# Terrain Edge Accent Imagegen Handoff

Target inbox file:

`tools/source-inbox/terrain-edge-accent-source.png`

Generate or paste a 4-column by 4-row source sheet on a perfectly flat `#ff00ff`
background. Each cell should contain one isolated cutout-ready terrain edge
accent in the order listed by `public/assets/source/terrain-edge-accent-source-manifest.json`.

Prompt:

Use case: stylized-concept
Asset type: 2D underwater destructible terrain edge accent source sheet for Water9
Primary request: Create an original source sheet of small dark underwater cave
edge accents: embedded ore chips, mineral seams, fossil-like inclusions, and
edge-rooted alien flora tufts for destructible rock terrain. These are not
standalone props; they must look physically fused into jagged cave edges and
partially buried in host rock.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: 4 columns by 4 rows, one isolated asset per cell, generous padding,
no labels, no text, no shadows on the background.
Style: high-quality hand-painted 2D game sprite art, gloomy underwater
survival-horror lighting, muted cyan/green/grey rock, restrained
bioluminescent accents, crisp silhouettes, dense texture, readable at small
gameplay scale.
Avoid: square tiles, checkerboard terrain, clean vector icons, sticker-like
props, large standalone plants, bright candy colors, repeated duplicate cells,
UI frames, watermarks, screenshots.

If Codex Imagegen returns the sheet inline through CLI auth, recover it directly
from the Codex session log:

`npm run terrain:edge-accent-recover-codex-imagegen -- --dry-run`

`npm run terrain:edge-accent-recover-codex-imagegen`

Then rebuild the sliced assets:

`npm run assets:terrain-edge-accent`
