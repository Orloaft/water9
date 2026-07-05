# Water9 Water Visuals Reference Scout

Status: OK

Preflight: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `7776913`

Read-only scope: no Water9 source edits, no commits. I used official/store pages, press/developer pages, and store screenshots where available.

## Reference Takeaways

1. Aquaria - painterly depth layering and friendly foreground detail
   - Sources: Bit Blot/Derek Yu media page and Steam page describe a massive underwater world with caves, sunlit oases, life, and ancient secrets; official screenshots show hand-painted reefs with crisp foreground coral, medium-detail creatures, and very soft distant silhouettes.
   - Borrow for Water9: keep the gameplay layer sharp, but make the water behind it painterly and soft. Use 2-3 broad background value layers per depth band: distant silhouettes with blurred edges, mid silhouettes with muted color, and foreground habitat clumps only where they frame play. Surface/shallow bands can afford coral color accents, but the playable path should stay cleaner than the screenshot art.

2. Dave the Diver - readable 2D/3D mix, bright shallow water, and depth haze
   - Sources: Mintrocket press kit says Dave uses a combination of pixel and 3D graphics for underwater scenery; Unity's Dave article notes the blend of 2D pixels and 3D art; Steam/store screenshots show high-key blue water, soft distant cliffs, caustic-like bloom, and many small fish/particles.
   - Borrow for Water9: use layered parallax planes and atmospheric haze to make the level feel deep without rewriting gameplay. Give the surface and first biome a brighter cyan volume, white/teal shafts from above, and tiny moving particles/fish as scale cues. Let distant structures be large simple shapes with low local contrast; reserve saturated pixels for player, ore, hazards, and pickups.

3. SILT - silhouette-first readability and extreme value discipline
   - Sources: Fireshine's Silt page and mobile store copy describe a surreal underwater abyss, ruins, ancient machinery, and an unsettling monochrome world constructed from sketches; screenshots lean on black shapes against gray light fields.
   - Borrow for Water9: design deep-biome landmarks as immediately readable black or near-black silhouettes with one secondary rim or interior glow, then test them in grayscale. For ruins/industrial structures, start from silhouette thumbnails, not texture detail. Use a few big shapes that cross the frame, not many mid-sized decorations.

4. Barotrauma - light cones, industrial interiors, and abyss restraint
   - Sources: Barotrauma's official site and Steam page emphasize a 2D submarine sim in Europa's dark ocean, operating machinery, exploring alien ruins and wrecked submarines; screenshots show a bright, hard-lit vessel floating inside near-black water with particulate murk.
   - Borrow for Water9: industrial habitats should be readable because they emit light, not because the whole background is bright. Add cone/halo lights around player tools, machinery, vents, beacon stations, and habitats. Keep the surrounding abyss low-detail and noisy only at very low opacity. This is especially useful for mining/industrial biomes.

5. Song of the Deep - vertical shafts and "tiny explorer in a huge place"
   - Sources: Steam describes a fantastic non-linear underwater world; PlayStation Blog describes a huge undersea world with free-diving/submarine exploration; Wired notes the game uses a panoramic 2D perspective and makes the player feel small among giant sea creatures/obstacles.
   - Borrow for Water9: add scale by putting one or two oversized background forms behind normal play: hanging roots/cables, rib-like rocks, wreck ribs, giant kelp strings, or ruined arches. Use vertical light shafts and bubble trails to connect top-to-bottom space. The player sprite should look small because the environment is huge, not because the camera zooms out.

6. Pronty - natural/artificial habitat blends
   - Sources: Steam frames Pronty around the city of Royla/new Atlantis, mutant sea creatures, and deep-sea secrets; review/announcement material repeatedly describes an underwater city, marine debris, pollution, and natural/artificial blends.
   - Borrow for Water9: give each Water9 biome a small prop grammar that mixes habitat and civilization: reef on concrete, kelp over pipe, vents beside broken gantries, cables draped over rock, brine staining old panels. This can be added as background/foreground dressing without changing mining controls. Avoid generic "underwater rocks everywhere"; make the world imply past use.

7. Shinsekai: Into the Depths - pressure/depth progression and chunky 2.5D forms
   - Sources: Capcom/Nintendo describe a fresh undersea exploration game with unique visual/audio experiences and an aquanaut descending through an expansive undersea world; Nintendo listing screenshots show strong depth shifts and big 2.5D forms; reviews call out a memorable underwater setting, weighty movement, exploration focus, and some UI legibility issues.
   - Borrow for Water9: make depth bands feel like different pressure zones, not just color grades. Shallow: open cyan and sunlight. Mid: greener, denser haze, more particulates. Deep: indigo/black, narrower light, isolated warm beacons. If Water9 uses 2D assets, fake the 2.5D mass with chunky foreground occluders and slower/faster parallax layers.

8. In Other Waters / ABZU - palette discipline and living motion
   - Sources: Game Developer's In Other Waters interview says each region uses carefully selected two-color palettes and a focused icon/shape language; ABZU's Steam/GDC material emphasizes vibrant color/life, vast fish movement, kelp forests, lighting, and atmospherics.
   - Borrow for Water9: use In Other Waters' palette discipline, not its abstract UI. Assign each Water9 depth band two dominant water colors plus one accent family. Then borrow ABZU's "life in motion" idea at Water9 scale: tiny fish specks, marine snow, drifting weeds, suspended bubbles, faint caustic shimmer, and moving silhouettes in far planes.

## What Not To Borrow For Water9

- Do not copy SILT's full monochrome/horror treatment globally. It is useful for deep silhouettes, but Water9 still needs ore, HUD, hazards, and biome differences to stay legible.
- Do not chase ABZU-style full 3D worlds, dense fish schools, or dynamic kelp simulation. Water9 can borrow color/life cues through cheap 2D particles, masks, and parallax.
- Do not import Dave the Diver's full cheerful aquarium density into mining areas. Too many saturated fish/coral props will fight ore readability.
- Do not use Barotrauma-level darkness everywhere. The lesson is contrast control and light sources, not making the normal playfield black.
- Do not make background detail as sharp as interactive terrain. Most references keep the player/interactive layer clearer than the scenic layer.
- Do not let UI/diagnostic text inherit Shinsekai-style opacity or alien ambiguity. Reviews specifically flag UI legibility; Water9 should keep HUD text plain and high-contrast.
- Do not change core movement, oxygen/pressure rules, combat, or mining loops just to imitate a reference. The first pass should be visual rendering and assets only.

## Ranked Short List: Most Promising Directions

1. Depth-band water/color bible plus parallax planes
   - Highest leverage. Define shallow/mid/deep water palettes, haze amount, caustic intensity, particle density, and background value limits. Then implement per-band layered planes so the game finally feels like it is descending through different water, not scrolling over one blue backdrop.

2. Silhouette-led habitat landmarks
   - Make every biome readable from one screenshot: reef dome/shell field, brine vent/industrial gantry, black coral/rib forms, deep ruins/vault/causeway. Start with grayscale silhouettes and only then add color/texture. This directly borrows Aquaria/SILT/Song of the Deep/Pronty without touching gameplay.

3. Runtime atmosphere stack
   - Add subtle moving caustics near the surface, marine snow in mid/deep bands, soft vertical shafts, local light cones around player/tools/habitats, and faint far-plane creature/structure silhouettes. Keep every effect low opacity and verify on live `#game canvas` captures plus grayscale passes.

## Links / Sources Used

- Aquaria media page: https://www.derekyu.com/aquaria/media.html
- Aquaria on Steam: https://store.steampowered.com/app/24420/Aquaria/
- Dave the Diver official Mintrocket page: https://www.mintrock.et/
- Dave the Diver press kit: https://pressmintrocket.oopy.io/dave_the_diver
- Unity case study on Dave the Diver 2D/3D blend: https://unity.com/resources/dave-diver
- Dave the Diver on Steam: https://store.steampowered.com/app/1868140/DAVE_THE_DIVER/
- SILT - Fireshine Games: https://fireshinegames.co.uk/games/silt/
- SILT on Steam: https://store.steampowered.com/app/1325890/SILT/
- SILT on App Store: https://apps.apple.com/sa/app/silt/id6477457763
- Barotrauma official site: https://barotraumagame.com/
- Barotrauma on Steam: https://store.steampowered.com/app/602960/Barotrauma/
- Song of the Deep on Steam: https://store.steampowered.com/app/460700/Song_of_the_Deep/
- Song of the Deep PlayStation Blog: https://blog.playstation.com/2016/01/28/underwater-adventure-song-of-the-deep-coming-to-ps4-this-summer/
- Wired on Song of the Deep scale/feel: https://www.wired.com/2016/01/song-deep-insonmiac
- Pronty on Steam: https://store.steampowered.com/app/1286280/Pronty_Mystres_des_Profondeurs/
- Pronty Switch announcement/context: https://www.cgmagonline.com/news/pronty-swims-onto-switch-in-march/
- Shinsekai: Into the Depths - Capcom: https://www.capcom-games.com/shinsekai-itd/en/
- Shinsekai: Into the Depths - Nintendo: https://www.nintendo.com/us/store/products/shinsekai-into-the-depths-switch/
- Nintendo Life review of Shinsekai: https://www.nintendolife.com/reviews/switch-eshop/shinsekai_into_the_depths
- In Other Waters developer interview: https://www.gamedeveloper.com/game-platforms/how-ecological-adventure-i-in-other-waters-i-s-planet-wide-mystery-gives-players-hope
- In Other Waters official publisher page: https://www.fellowtraveller.games/in-other-waters
- ABZU on Steam: https://store.steampowered.com/app/384190/ABZU/
- Game Developer / GDC note on ABZU art: https://www.gamedeveloper.com/art/video-creating-the-striking-underwater-seascapes-of-i-abzu-i-
- NVIDIA GPU Gems water caustics chapter: https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-2-rendering-water-caustics
