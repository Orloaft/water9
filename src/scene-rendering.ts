import Phaser from 'phaser';
import type { Fish,Flora,TerrainBrushPlacement,TerrainVisualChunk,Tile } from './types';
import { BARGE_DOCKING_ZONE_Y,BARGE_DOCK_Y,BARGE_DRAW_SCALE,BARGE_PLATFORM_HEIGHT,BARGE_PLATFORM_WIDTH,BOBBIT_ESCAPE_SECONDS,ENTITY_SCALE,FLARE_LIGHT_RADIUS,PLAYER_DRAW_SCALE,SONAR_ATTRACT_RADIUS,SONAR_REVEAL_RADIUS_TILES,SUB_BOARD_SECONDS,TILE,WORLD_H,WORLD_W } from './constants';
import { tiles,upgrades } from './content';
import { state,ui } from './state';
import { rng } from './rng';
import { ambientDarknessOpacity,animatedFrame,darknessAtDepth,darknessOpacity,depthColor,diverAnimation,diverDisplayWidth,diverFrame,diverOrigin,diverPose,fishFrameCount,fitImageHeight,fitImageWidth,hash,isArtifactTile,isOreTile,lightBeamHalfWidth,lightBeamLength,lightRadius,mineCooldown,parallaxProfileFor,scaledEntity,sonarKey,sonarTileColor,specialRoomEffectCenter,spriteManifests,subDef,swimPose,swimTopSpeed,terrainBodyColorForTile,terrainLookForBiome } from './helpers';
import type { DeepdiveScene } from './scene';
import { DIVER_ARTICULATED_PART_SPECS } from './diver-articulated';
import { hideSubmarinePartSprites,renderSubmarineParts } from './submarine-parts';
import { ensureTerrainMask,TERRAIN_MASK_CELL,TERRAIN_MASK_HEIGHT,TERRAIN_MASK_RES,TERRAIN_MASK_SOLID_THRESHOLD,TERRAIN_MASK_WIDTH,terrainBoundarySupported,terrainLocalSolidSupport,terrainMaskBoundaryCell,terrainMaskDensityAt,terrainMaskExposureVector,terrainMaskInteriorFillCell,terrainMaskSolid } from './terrain-mask';
import { measurePerf } from './perf';

const TERRAIN_VISIBILITY_WASH_ALPHA = 0.034;
const TERRAIN_VISIBILITY_GLOW_ALPHA = 0.052;

export function draw(this: DeepdiveScene, ) {
    const camera = this.cameras.main;
    this.articulatedBridges.clear();
    this.actors.clear();
    this.darkness.clear();
    this.lampGloom.clear();
    this.overlay.clear();
    this.parallaxBackdrop.clear();
    camera.setBackgroundColor(depthColor(state.depth));
	    this.drawParallax(camera);
	    measurePerf(this, 'draw.world', () => this.drawWorld(camera), { dirty: this.terrainDirty, chunks: this.terrainVisualDirtyChunks.size });
	    measurePerf(this, 'draw.props', () => this.drawEnvironmentProps(camera), { count: this.environmentProps.length });
    this.drawBobbitBurrows(camera);
	    this.drawTerrainBreakEffects(camera);
	    this.drawSpecialRooms(camera);
    this.drawBoat();
    this.drawLooseItems(camera);
    this.drawHazards();
    this.drawNestEggs(camera);
    this.drawLarvae(camera);
    this.drawFlora(camera);
    measurePerf(this, 'draw.fish', () => this.drawFish(camera), { count: this.fish.length });
    measurePerf(this, 'draw.articulated', () => this.drawArticulatedCreatures(camera), { count: this.articulatedCreatures.length, parts: this.articulatedCreatures.reduce((sum, creature) => sum + creature.parts.length, 0) });
    measurePerf(this, 'draw.sub', () => this.drawSub(), { active: Boolean(state.activeSub), parts: this.subPartSprites ? Object.keys(this.subPartSprites).length : 0 });
    this.drawPlayer();
    this.drawFlares(camera);
    this.drawForwardOutpost(camera);
    this.drawBiomeVisibilityCues(camera);
    this.drawSonarPings();
    this.drawDarkness(camera);
    this.drawGameOver(camera);
  }

export function drawForwardOutpost(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const outpost = state.forwardOutpost;
    if (!outpost.active || outpost.biome !== state.biome) return;
    const view = camera.worldView;
    if (outpost.x < view.x - outpost.oxygenRadius || outpost.x > view.right + outpost.oxygenRadius || outpost.y < view.y - outpost.oxygenRadius || outpost.y > view.bottom + outpost.oxygenRadius) return;
    const chargePct = outpost.maxCharge > 0 ? Phaser.Math.Clamp(outpost.charge / outpost.maxCharge, 0, 1) : 0;
    this.overlay.lineStyle(1, 0x8ee7f4, 0.14 + chargePct * 0.18);
    this.overlay.strokeCircle(outpost.x, outpost.y, outpost.oxygenRadius);
    this.overlay.fillStyle(0x8ee7f4, 0.04 + chargePct * 0.06);
    this.overlay.fillCircle(outpost.x, outpost.y, outpost.oxygenRadius);
    this.actors.lineStyle(2, 0xd6fff8, 0.9);
    this.actors.fillStyle(0x132d35, 0.88);
    this.actors.fillCircle(outpost.x, outpost.y, 13);
    this.actors.strokeCircle(outpost.x, outpost.y, 13);
    this.actors.lineStyle(2, 0x73fbd3, 0.72);
    this.actors.lineBetween(outpost.x - 9, outpost.y + 5, outpost.x + 9, outpost.y + 5);
    this.actors.lineBetween(outpost.x, outpost.y - 11, outpost.x, outpost.y + 11);
  }

export function drawParallax(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    const profile = parallaxProfileFor(state.biome, state.depth);
    const padding = 24;
    for (let i = 0; i < this.parallaxLayers.length; i += 1) {
      const layer = this.parallaxLayers[i];
      const layerProfile = profile.layers[i] ?? profile.layers[profile.layers.length - 1];
      const key = this.textures.exists(`${layerProfile.texturePrefix}-${i}`)
        ? `${layerProfile.texturePrefix}-${i}`
        : `${layerProfile.fallbackPrefix}-${i}`;
      if (layer.texture.key !== key) layer.setTexture(key);
      const source = this.textures.get(key).getSourceImage();
      const sourceWidth = Math.max(1, source.width);
      const sourceHeight = Math.max(1, source.height);
      const coverScale = Math.max((view.width + padding * 2) / sourceWidth, (view.height + padding * 2) / sourceHeight, 1) * layerProfile.scale;
      layer
        .setPosition(view.x - padding, view.y - padding)
        .setSize(view.width + padding * 2, view.height + padding * 2)
        .setAlpha(layerProfile.alpha)
        .setTint(layerProfile.tint);
      layer.tilePositionX = camera.scrollX * layerProfile.horizontalSpeed + layerProfile.phaseX;
      layer.tilePositionY = camera.scrollY * layerProfile.verticalSpeed + layerProfile.phaseY;
      layer.tileScaleX = coverScale;
      layer.tileScaleY = coverScale;
    }
    drawSurfaceAtmosphere(this, camera);
    drawParallaxOverlay(this, camera, profile);
  }

function drawSurfaceAtmosphere(scene: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
  const view = camera.worldView;
  const waterlineY = BARGE_DOCK_Y + 4;
  if (view.bottom < 0 || view.y > waterlineY + 260) return;

  const left = view.x;
  const width = view.width;
  const skyTop = Math.max(view.y, 0);
  const skyBottom = Math.min(view.bottom, waterlineY);
  if (skyBottom > skyTop) {
    scene.parallaxBackdrop.fillGradientStyle(
      0x8fcbdc,
      0x8fcbdc,
      0x356f82,
      0x356f82,
      0.86,
      0.86,
      0.72,
      0.72,
    );
    scene.parallaxBackdrop.fillRect(left, skyTop, width, skyBottom - skyTop);
    const sunX = WORLD_W * TILE * 0.5 - 230;
    scene.parallaxBackdrop.fillStyle(0xffe7a8, 0.08);
    scene.parallaxBackdrop.fillEllipse(sunX, 22, 210, 52);
    scene.parallaxBackdrop.fillStyle(0xf5ffff, 0.045);
    scene.parallaxBackdrop.fillRect(left, waterlineY - 16, width, 11);
  }

  const waterTop = Math.max(view.y, waterlineY);
  const waterBottom = Math.min(view.bottom, waterlineY + 260);
  if (waterBottom > waterTop) {
    scene.parallaxBackdrop.fillGradientStyle(
      0x0e6170,
      0x0e6170,
      0x062b3a,
      0x062b3a,
      0.5,
      0.5,
      0.62,
      0.62,
    );
    scene.parallaxBackdrop.fillRect(left, waterTop, width, waterBottom - waterTop);
  }

  scene.parallaxBackdrop.fillStyle(0xdffcff, 0.24);
  scene.parallaxBackdrop.fillRect(left, waterlineY - 2, width, 2);
  scene.parallaxBackdrop.fillStyle(0x7ee6ef, 0.14);
  scene.parallaxBackdrop.fillRect(left, waterlineY, width, 4);
  scene.parallaxBackdrop.fillStyle(0x052234, 0.08);
  scene.parallaxBackdrop.fillRect(left, waterlineY + 4, width, 9);
}

function drawParallaxOverlay(scene: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera, profile: ReturnType<typeof parallaxProfileFor>) {
  const view = camera.worldView;
  const bandAlpha = state.biome === 1
    ? 0.06
    : state.biome === 2
      ? 0.08
      : 0.12;
  scene.parallaxBackdrop.fillGradientStyle(
    0x052234,
    0x073047,
    0x020813,
    0x020813,
    bandAlpha * 0.55,
    bandAlpha * 0.44,
    bandAlpha,
    bandAlpha * 1.18,
  );
  scene.parallaxBackdrop.fillRect(view.x, view.y, view.width, view.height);
  const mistStep = state.biome >= 3 ? 168 : 220;
  const mistStart = Math.floor(view.y / mistStep) * mistStep - mistStep;
  for (let y = mistStart; y <= view.bottom + mistStep; y += mistStep) {
    const roll = hash(Math.floor(view.x / 512), Math.floor(y / mistStep), rng.seed + 2447 + state.biome * 97);
    const alpha = bandAlpha * Phaser.Math.Linear(0.32, 0.78, roll);
    scene.parallaxBackdrop.fillStyle(profile.overlay.color, alpha);
    scene.parallaxBackdrop.fillEllipse(
      view.centerX + Math.sin(roll * 12.4 + scene.time.now * 0.00012) * view.width * 0.28,
      y + roll * mistStep,
      view.width * Phaser.Math.Linear(0.72, 1.18, roll),
      Phaser.Math.Linear(54, 96, roll),
    );
  }
  const cellSize = 256;
  const startX = Math.floor(view.x / cellSize) - 1;
  const endX = Math.ceil(view.right / cellSize) + 1;
  const startY = Math.floor(view.y / cellSize) - 1;
  const endY = Math.ceil(view.bottom / cellSize) + 1;
  const time = scene.time.now * 0.001;
  const seed = rng.seed + profile.biome * 1009;
  for (let cy = startY; cy <= endY; cy += 1) {
    for (let cx = startX; cx <= endX; cx += 1) {
      const roll = hash(cx, cy, seed);
      if (roll > profile.overlay.density) continue;
      const rollB = hash(cx + 19, cy - 23, seed + 41);
      const rollC = hash(cx - 31, cy + 7, seed + 97);
      const x = cx * cellSize + rollB * cellSize + Math.sin(time * 0.17 + roll * 9) * profile.overlay.drift;
      const y = cy * cellSize + rollC * cellSize + Math.cos(time * 0.13 + rollB * 11) * profile.overlay.drift;
      const alpha = profile.overlay.alpha * Phaser.Math.Linear(0.45, 1, rollC);
      const streakLength = Phaser.Math.Linear(26, 74, rollB);
      const slope = Phaser.Math.Linear(-0.38, 0.26, roll);
      scene.parallaxBackdrop.lineStyle(1, profile.overlay.color, alpha);
      scene.parallaxBackdrop.lineBetween(x - streakLength * 0.5, y - streakLength * slope * 0.5, x + streakLength * 0.5, y + streakLength * slope * 0.5);
      if (rollB > 0.72) {
        scene.parallaxBackdrop.fillStyle(profile.overlay.color, alpha * 0.58);
        scene.parallaxBackdrop.fillCircle(x + 18, y - 9, Phaser.Math.Linear(1.1, 2.4, roll));
      }
    }
  }
}

export function drawGameOver(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    if (!state.lost) return;
    const view = camera.worldView;
    const cx = this.player.x;
    const cy = this.player.y;
    this.overlay.fillStyle(0x05070d, 0.62);
    this.overlay.fillRect(view.x, view.y, view.width, view.height);
    this.actors.lineStyle(3, 0xff6f7f, 0.75);
    this.actors.strokeCircle(cx, cy, scaledEntity(28 + Math.sin(performance.now() * 0.006) * 4));
    this.actors.fillStyle(0xff6f7f, 0.25);
    this.actors.fillCircle(cx, cy, scaledEntity(34));
    this.actors.lineStyle(2, 0xfff7df, 0.55);
    this.actors.lineBetween(cx - scaledEntity(16), cy - scaledEntity(14), cx + scaledEntity(16), cy + scaledEntity(14));
    this.actors.lineBetween(cx + scaledEntity(16), cy - scaledEntity(14), cx - scaledEntity(16), cy + scaledEntity(14));
  }

export function drawWorld(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    const startX = Math.max(0, Math.floor(view.x / TILE) - 1);
    const endX = Math.min(WORLD_W - 1, Math.ceil(view.right / TILE) + 1);
    const startY = Math.max(0, Math.floor(view.y / TILE) - 1);
    const endY = Math.min(WORLD_H - 1, Math.ceil(view.bottom / TILE) + 1);
    const boundsKey = `${startX}:${endX}:${startY}:${endY}`;
    if (!this.terrainDirty && boundsKey === this.terrainBoundsKey) return;

    this.terrainDirty = false;
    this.terrainBoundsKey = boundsKey;
    this.terrain.clear();
    this.terrainEdges.clear();

    const activeTerrainBrushKeys = new Set<string>();
    drawTerrainMaskBody(this, startX, endX, startY, endY);
    drawTerrainVisualBrushes(this, startX, endX, startY, endY, activeTerrainBrushKeys);
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = this.getTile(x, y);
        if (tile === 'water') {
          continue;
        }
        const def = tiles[tile];
        const wx = x * TILE;
        const wy = y * TILE;
        const fracture = this.damage[y][x] / def.hp;
        const exposed = maskTileExposed(this, x, y);
        if (isOreTile(tile)) {
          drawEmbeddedOre(this, x, y, tile, exposed);
        }
        if (tile === 'anchorstone') {
          this.terrainEdges.lineStyle(1, 0xb9c2d0, 0.1);
          this.terrainEdges.strokeRect(wx + 1, wy + 1, TILE - 2, TILE - 2);
        }
        if (fracture > 0) {
          drawFractureMarks(this, x, y, tile, fracture);
        }
        if (isArtifactTile(tile)) {
          const pulse = 0.48 + Math.sin(performance.now() * 0.004 + x * 0.9 + y * 0.2) * 0.12;
          this.terrain.lineStyle(1, 0xfff7df, pulse);
          this.terrain.strokeCircle(wx + 12, wy + 12, 5);
          this.terrain.lineBetween(wx + 12, wy + 5, wx + 17, wy + 12);
          this.terrain.lineBetween(wx + 17, wy + 12, wx + 12, wy + 19);
          this.terrain.lineBetween(wx + 12, wy + 19, wx + 7, wy + 12);
          this.terrain.lineBetween(wx + 7, wy + 12, wx + 12, wy + 5);
        }
      }
    }
	    for (let i = 0; i < this.tileSprites.length; i += 1) {
	      this.tileSprites[i].setVisible(false);
	    }
	    for (let i = 0; i < this.terrainBrushSprites.length; i += 1) {
	      this.terrainBrushSprites[i].setVisible(false);
	    }
      for (const [key, sprite] of this.terrainBrushSpritesByKey) {
        if (!activeTerrainBrushKeys.has(key)) sprite.setVisible(false);
      }
	  }

export function drawTerrainBreakEffects(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const effect of this.terrainBreakEffects) {
      if (effect.x < view.x - 60 || effect.x > view.right + 60 || effect.y < view.y - 60 || effect.y > view.bottom + 60) continue;
      const t = Phaser.Math.Clamp(effect.age / effect.life, 0, 1);
      const alpha = (1 - t) * 0.72;
      const radius = TILE * (0.44 + t * 0.72);
      const palette = terrainAccentPalette();
      this.actors.fillStyle(palette.glow, alpha * 0.12);
      this.actors.fillCircle(effect.x, effect.y, radius);
      this.actors.lineStyle(2, palette.rim, alpha * 0.36);
      this.actors.strokeCircle(effect.x, effect.y, radius * 0.92);
      for (let i = 0; i < 13; i += 1) {
        const angle = effect.seed * Math.PI * 2 + i * 1.137;
        const travel = TILE * (0.12 + t * (0.72 + (i % 4) * 0.1));
        const chipX = effect.x + Math.cos(angle) * travel;
        const chipY = effect.y + Math.sin(angle) * travel;
        this.actors.fillStyle(i % 4 === 0 ? palette.rim : 0x050b10, alpha * (i % 4 === 0 ? 0.42 : 0.58));
        this.actors.fillRect(Math.floor(chipX), Math.floor(chipY), i % 4 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
      }
    }
  }

export function drawEnvironmentProps(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    let spriteIndex = 0;
    for (const prop of this.environmentProps) {
      if (prop.x < view.x - 90 || prop.x > view.right + 90 || prop.y < view.y - 90 || prop.y > view.bottom + 90) continue;
      if (prop.tile && this.getTile(prop.tileX, prop.tileY) !== prop.tile) continue;
      const sprite = this.environmentSpriteAt(spriteIndex, prop.assetKey);
      sprite
        .setTexture(prop.assetKey)
        .setVisible(true)
        .setPosition(prop.x, prop.y)
        .setOrigin(prop.originX ?? 0.5, prop.originY ?? 0.5)
        .setDisplaySize(prop.width, prop.height)
        .setRotation(prop.rotation)
        .setAlpha(prop.alpha)
        .setDepth(prop.depth)
        .setFlipX(Boolean(prop.flipX))
        .setFlipY(Boolean(prop.flipY));
      spriteIndex += 1;
    }
    for (let i = spriteIndex; i < this.environmentSprites.length; i += 1) {
      this.environmentSprites[i].setVisible(false);
    }
  }

function exposedToWater(scene: DeepdiveScene, x: number, y: number) {
    return scene.getTile(x, y - 1) === 'water'
      || scene.getTile(x, y + 1) === 'water'
      || scene.getTile(x - 1, y) === 'water'
      || scene.getTile(x + 1, y) === 'water';
  }

function drawTerrainMaskBody(scene: DeepdiveScene, startX: number, endX: number, startY: number, endY: number) {
    ensureTerrainMask(scene);
    const minSx = Math.max(0, startX * TERRAIN_MASK_RES - 2);
    const maxSx = Math.min(TERRAIN_MASK_WIDTH - 1, (endX + 1) * TERRAIN_MASK_RES + 2);
    const minSy = Math.max(0, startY * TERRAIN_MASK_RES - 2);
    const maxSy = Math.min(TERRAIN_MASK_HEIGHT - 1, (endY + 1) * TERRAIN_MASK_RES + 2);
    const boundaryCells: Array<{ sx: number; sy: number; color: number }> = [];

    collectTerrainBoundaryCells(scene, minSx, maxSx, minSy, maxSy, boundaryCells);
    drawTerrainContinuousMaskFill(scene, minSx, maxSx, minSy, maxSy);
    drawTerrainOrganicBoundary(scene, boundaryCells);
    drawTerrainEcologyFringe(scene, boundaryCells);
    drawTerrainMaskEdgeFray(scene, minSx, maxSx, minSy, maxSy);
  }

function drawTerrainContinuousMaskFill(scene: DeepdiveScene, minSx: number, maxSx: number, minSy: number, maxSy: number) {
    for (let sy = minSy; sy <= maxSy; sy += 1) {
      let runStart = -1;
      let runColor = 0;
      const flush = (sx: number) => {
        if (runStart < 0) return;
        const width = sx - runStart;
        if (width > 0) {
          scene.terrain.fillStyle(runColor, 1);
          scene.terrain.fillRect(
            runStart * TERRAIN_MASK_CELL,
            sy * TERRAIN_MASK_CELL,
            width * TERRAIN_MASK_CELL + 0.65,
            TERRAIN_MASK_CELL + 0.65,
          );
        }
        runStart = -1;
      };

      for (let sx = minSx; sx <= maxSx + 1; sx += 1) {
        const solid = sx <= maxSx && terrainMaskSolid(scene, sx, sy) && terrainMaskInteriorFillCell(scene, sx, sy);
        if (!solid) {
          flush(sx);
          continue;
        }
        const tx = Math.floor(sx / TERRAIN_MASK_RES);
        const ty = Math.floor(sy / TERRAIN_MASK_RES);
        const color = terrainBodyColor(scene.getTile(tx, ty), ty);
        if (runStart < 0) {
          runStart = sx;
          runColor = color;
        } else if (color !== runColor) {
          flush(sx);
          runStart = sx;
          runColor = color;
        }
      }
    }
  }

function collectTerrainBoundaryCells(
  scene: DeepdiveScene,
  minSx: number,
  maxSx: number,
  minSy: number,
  maxSy: number,
  boundaryCells: Array<{ sx: number; sy: number; color: number }>,
) {
    for (let sy = minSy; sy <= maxSy; sy += 1) {
      for (let sx = minSx; sx <= maxSx; sx += 1) {
        if (!terrainMaskSolid(scene, sx, sy) || !terrainMaskBoundaryCell(scene, sx, sy)) continue;
        if (!terrainBoundarySupported(scene, sx, sy)) continue;
        const tx = Math.floor(sx / TERRAIN_MASK_RES);
        const ty = Math.floor(sy / TERRAIN_MASK_RES);
        boundaryCells.push({ sx, sy, color: terrainBodyColor(scene.getTile(tx, ty), ty) });
      }
    }
  }

function drawTerrainOrganicBoundary(
  scene: DeepdiveScene,
  cells: Array<{ sx: number; sy: number; color: number }>,
) {
    const cellMap = new Map<string, { sx: number; sy: number; color: number }>();
    for (const cell of cells) cellMap.set(`${cell.sx}:${cell.sy}`, cell);
    for (const cell of cells) {
      const cx = (cell.sx + 0.5) * TERRAIN_MASK_CELL;
      const cy = (cell.sy + 0.5) * TERRAIN_MASK_CELL;
      const neighbors = [
        cellMap.get(`${cell.sx + 1}:${cell.sy}`),
        cellMap.get(`${cell.sx}:${cell.sy + 1}`),
        cellMap.get(`${cell.sx + 1}:${cell.sy + 1}`),
        cellMap.get(`${cell.sx - 1}:${cell.sy + 1}`),
      ].filter(Boolean) as Array<{ sx: number; sy: number; color: number }>;
      for (const neighbor of neighbors) {
        const nx = (neighbor.sx + 0.5) * TERRAIN_MASK_CELL;
        const ny = (neighbor.sy + 0.5) * TERRAIN_MASK_CELL;
        scene.terrain.lineStyle(TERRAIN_MASK_CELL * 3.2, cell.color, 1);
        scene.terrain.lineBetween(cx, cy, nx, ny);
      }
    }
    for (const cell of cells) {
      const cx = (cell.sx + 0.5) * TERRAIN_MASK_CELL;
      const cy = (cell.sy + 0.5) * TERRAIN_MASK_CELL;
      const seed = hash(cell.sx * 131, cell.sy * 137, rng.seed + 5321);
      const radiusX = TERRAIN_MASK_CELL * (1.92 + seed * 0.46);
      const radiusY = TERRAIN_MASK_CELL * (1.78 + hash(cell.sy, cell.sx, rng.seed + 5323) * 0.5);
      scene.terrain.fillStyle(cell.color, 0.9);
      scene.terrain.fillEllipse(cx, cy, radiusX * 1.7, radiusY * 1.62);
      if (seed > 0.86) {
        scene.terrain.fillStyle(cell.color, 0.56);
        scene.terrain.fillEllipse(
          cx + (hash(cell.sx, cell.sy, rng.seed + 5327) - 0.5) * TERRAIN_MASK_CELL * 0.7,
          cy + (hash(cell.sy, cell.sx, rng.seed + 5329) - 0.5) * TERRAIN_MASK_CELL * 0.7,
          radiusX * 1.45,
          radiusY * 1.18,
        );
      }
    }
  }

function drawTerrainEcologyFringe(
  scene: DeepdiveScene,
  cells: Array<{ sx: number; sy: number; color: number }>,
) {
    const palette = terrainAccentPalette();
    const cellMap = new Map<string, { sx: number; sy: number; color: number }>();
    for (const cell of cells) cellMap.set(`${cell.sx}:${cell.sy}`, cell);

    for (const cell of cells) {
      const support = terrainLocalSolidSupport(scene, cell.sx, cell.sy, 3);
      if (support < 14) continue;
      const seed = hash(cell.sx * 269, cell.sy * 271, rng.seed + 6201);
      if (seed < 0.44) continue;
      const jitterX = (hash(cell.sx, cell.sy, rng.seed + 6251) - 0.5) * TERRAIN_MASK_CELL * 1.4;
      const jitterY = (hash(cell.sy, cell.sx, rng.seed + 6253) - 0.5) * TERRAIN_MASK_CELL * 1.4;
      const cx = (cell.sx + 0.5) * TERRAIN_MASK_CELL + jitterX;
      const cy = (cell.sy + 0.5) * TERRAIN_MASK_CELL + jitterY;
      const matColor = fringeMatColor(palette, seed);
      const neighbors = [
        cellMap.get(`${cell.sx + 1}:${cell.sy}`),
        cellMap.get(`${cell.sx}:${cell.sy + 1}`),
        cellMap.get(`${cell.sx + 1}:${cell.sy + 1}`),
        cellMap.get(`${cell.sx - 1}:${cell.sy + 1}`),
      ].filter(Boolean) as Array<{ sx: number; sy: number; color: number }>;
      for (const neighbor of neighbors) {
        if (terrainLocalSolidSupport(scene, neighbor.sx, neighbor.sy, 3) < 14) continue;
        if (hash(cell.sx * 313 + neighbor.sx, cell.sy * 317 + neighbor.sy, rng.seed + 6257) < 0.42) continue;
        const nx = (neighbor.sx + 0.5) * TERRAIN_MASK_CELL
          + (hash(neighbor.sx, neighbor.sy, rng.seed + 6261) - 0.5) * TERRAIN_MASK_CELL * 1.4;
        const ny = (neighbor.sy + 0.5) * TERRAIN_MASK_CELL
          + (hash(neighbor.sy, neighbor.sx, rng.seed + 6263) - 0.5) * TERRAIN_MASK_CELL * 1.4;
        scene.terrainEdges.lineStyle(TERRAIN_MASK_CELL * 4.4, palette.shadow, 0.08 * terrainLookForBiome().proceduralFringeAlpha);
        scene.terrainEdges.lineBetween(cx, cy, nx, ny);
        scene.terrainEdges.lineStyle(TERRAIN_MASK_CELL * 2.6, matColor, 0.105 * terrainLookForBiome().proceduralFringeAlpha);
        scene.terrainEdges.lineBetween(cx, cy, nx, ny);
      }
    }

    for (const cell of cells) {
      const exposed = terrainMaskExposureVector(scene, cell.sx, cell.sy);
      if (exposed.count === 0) continue;
      const support = terrainLocalSolidSupport(scene, cell.sx, cell.sy, 3);
      if (support < 18) continue;
      const cx = (cell.sx + 0.5) * TERRAIN_MASK_CELL;
      const cy = (cell.sy + 0.5) * TERRAIN_MASK_CELL;
      const seed = hash(cell.sx * 269, cell.sy * 271, rng.seed + 6201);
      if (seed < 0.86) continue;
      const outwardX = exposed.x / Math.max(1, Math.abs(exposed.x) + Math.abs(exposed.y));
      const outwardY = exposed.y / Math.max(1, Math.abs(exposed.x) + Math.abs(exposed.y));
      const matColor = fringeMatColor(palette, seed);
      const shadowColor = palette.shadow;
      const fringeX = cx + outwardX * TERRAIN_MASK_CELL * (0.58 + seed * 0.35);
      const fringeY = cy + outwardY * TERRAIN_MASK_CELL * (0.58 + hash(cell.sy, cell.sx, rng.seed + 6203) * 0.35);
      const wide = TERRAIN_MASK_CELL * (4.8 + seed * 3.0);
      const tall = TERRAIN_MASK_CELL * (1.7 + hash(cell.sx, cell.sy, rng.seed + 6207) * 1.1);
      const horizontal = Math.abs(outwardY) >= Math.abs(outwardX);

      scene.terrainEdges.fillStyle(shadowColor, 0.045 * terrainLookForBiome().proceduralFringeAlpha);
      scene.terrainEdges.fillEllipse(fringeX, fringeY, horizontal ? wide : tall, horizontal ? tall : wide);
      scene.terrainEdges.fillStyle(matColor, 0.092 * terrainLookForBiome().proceduralFringeAlpha);
      scene.terrainEdges.fillEllipse(
        fringeX + (hash(cell.sx, cell.sy, rng.seed + 6211) - 0.5) * TERRAIN_MASK_CELL * 1.5,
        fringeY + (hash(cell.sy, cell.sx, rng.seed + 6217) - 0.5) * TERRAIN_MASK_CELL * 1.5,
        horizontal ? wide * 0.78 : tall * 0.9,
        horizontal ? tall * 0.82 : wide * 0.78,
      );
      if (seed > 0.9) {
        scene.terrainEdges.fillStyle(seed > 0.965 ? palette.glow : palette.rim, (seed > 0.965 ? 0.16 : 0.1) * terrainLookForBiome().proceduralFringeAlpha);
        scene.terrainEdges.fillEllipse(fringeX, fringeY, horizontal ? wide * 0.34 : tall * 0.72, horizontal ? tall * 0.38 : wide * 0.34);
      }

    }
  }

function fringeMatColor(palette: ReturnType<typeof terrainAccentPalette>, seed: number) {
    if (seed > 0.92) return palette.glow;
    if (seed > 0.68) return palette.growth;
    if (seed > 0.42) return palette.rim;
    return palette.moss;
  }

function drawTerrainMaskEdgeFray(scene: DeepdiveScene, minSx: number, maxSx: number, minSy: number, maxSy: number) {
    for (let sy = minSy; sy <= maxSy; sy += 1) {
      for (let sx = minSx; sx <= maxSx; sx += 1) {
        if (terrainMaskDensityAt(scene, sx, sy) < TERRAIN_MASK_SOLID_THRESHOLD) continue;
        const north = terrainMaskDensityAt(scene, sx, sy - 1) < TERRAIN_MASK_SOLID_THRESHOLD;
        const south = terrainMaskDensityAt(scene, sx, sy + 1) < TERRAIN_MASK_SOLID_THRESHOLD;
        const west = terrainMaskDensityAt(scene, sx - 1, sy) < TERRAIN_MASK_SOLID_THRESHOLD;
        const east = terrainMaskDensityAt(scene, sx + 1, sy) < TERRAIN_MASK_SOLID_THRESHOLD;
        if (!north && !south && !west && !east) continue;
        const wx = sx * TERRAIN_MASK_CELL;
        const wy = sy * TERRAIN_MASK_CELL;
        const tx = Math.floor(sx / TERRAIN_MASK_RES);
        const ty = Math.floor(sy / TERRAIN_MASK_RES);
        const tile = scene.getTile(tx, ty);
        const palette = terrainAccentPalette();
        const rimColor = tile === 'sand' ? palette.sandRim : palette.rim;
        const seed = hash(sx * 83, sy * 89, rng.seed + 5303);
        if (seed > 0.975) {
          const highlight = seed > 0.9 ? palette.glow : rimColor;
          scene.terrainEdges.lineStyle(1, highlight, 0.07);
          const px = wx + TERRAIN_MASK_CELL * (0.24 + hash(sx, sy, rng.seed + 5329) * 0.52);
          const py = wy + TERRAIN_MASK_CELL * (0.24 + hash(sy, sx, rng.seed + 5339) * 0.52);
          scene.terrainEdges.lineBetween(
            px - (north || south ? TERRAIN_MASK_CELL * 0.32 : 0),
            py - (west || east ? TERRAIN_MASK_CELL * 0.32 : 0),
            px + (north || south ? TERRAIN_MASK_CELL * 0.32 : 0),
            py + (west || east ? TERRAIN_MASK_CELL * 0.32 : 0),
          );
        }
        if (seed > 0.76 && (north || south || west || east)) {
          const horizontal = north || south;
          scene.terrainEdges.fillStyle(seed > 0.94 ? palette.glow : palette.growth, seed > 0.94 ? TERRAIN_VISIBILITY_GLOW_ALPHA : TERRAIN_VISIBILITY_WASH_ALPHA);
          scene.terrainEdges.fillEllipse(
            horizontal
              ? wx + TERRAIN_MASK_CELL * (0.38 + hash(sx, sy, rng.seed + 5311) * 0.24)
              : wx + (west ? TERRAIN_MASK_CELL * 0.18 : TERRAIN_MASK_CELL * 0.82),
            horizontal
              ? wy + (north ? TERRAIN_MASK_CELL * 0.18 : TERRAIN_MASK_CELL * 0.82)
              : wy + TERRAIN_MASK_CELL * (0.38 + hash(sy, sx, rng.seed + 5313) * 0.24),
            horizontal
              ? TERRAIN_MASK_CELL * (0.72 + hash(sy, sx, rng.seed + 5317) * 0.54)
              : TERRAIN_MASK_CELL * 0.34,
            horizontal
              ? TERRAIN_MASK_CELL * 0.34
              : TERRAIN_MASK_CELL * (0.72 + hash(sx, sy, rng.seed + 5319) * 0.54),
          );
        }
      }
    }
  }

function terrainAccentPalette() {
    return terrainLookForBiome().palette;
  }

function maskTileExposed(scene: DeepdiveScene, x: number, y: number) {
    const startX = x * TERRAIN_MASK_RES;
    const startY = y * TERRAIN_MASK_RES;
    for (let sy = startY; sy < startY + TERRAIN_MASK_RES; sy += 1) {
      for (let sx = startX; sx < startX + TERRAIN_MASK_RES; sx += 1) {
        if (terrainMaskDensityAt(scene, sx, sy) < TERRAIN_MASK_SOLID_THRESHOLD) continue;
        if (terrainMaskDensityAt(scene, sx - 1, sy) < TERRAIN_MASK_SOLID_THRESHOLD) return true;
        if (terrainMaskDensityAt(scene, sx + 1, sy) < TERRAIN_MASK_SOLID_THRESHOLD) return true;
        if (terrainMaskDensityAt(scene, sx, sy - 1) < TERRAIN_MASK_SOLID_THRESHOLD) return true;
        if (terrainMaskDensityAt(scene, sx, sy + 1) < TERRAIN_MASK_SOLID_THRESHOLD) return true;
      }
    }
    return false;
  }

function maskTileSolidRatio(scene: DeepdiveScene, x: number, y: number) {
    const startX = x * TERRAIN_MASK_RES;
    const startY = y * TERRAIN_MASK_RES;
    let solid = 0;
    for (let sy = startY; sy < startY + TERRAIN_MASK_RES; sy += 1) {
      for (let sx = startX; sx < startX + TERRAIN_MASK_RES; sx += 1) {
        if (terrainMaskDensityAt(scene, sx, sy) >= TERRAIN_MASK_SOLID_THRESHOLD) solid += 1;
      }
    }
    return solid / (TERRAIN_MASK_RES * TERRAIN_MASK_RES);
  }

function drawTerrainInteriorRuns(scene: DeepdiveScene, startX: number, endX: number, startY: number, endY: number) {
    for (let y = startY; y <= endY; y += 1) {
      let runStart = -1;
      let runColor = 0;
      const flush = (x: number) => {
        if (runStart < 0) return;
        scene.terrain.fillStyle(runColor, 1);
        scene.terrain.fillRect(runStart * TILE, y * TILE, (x - runStart) * TILE, TILE);
        runStart = -1;
      };
      for (let x = startX; x <= endX + 1; x += 1) {
        const tile = x <= endX ? scene.getTile(x, y) : 'water';
        const interior = tile !== 'water' && maskTileDeepInterior(scene, x, y);
        if (!interior) {
          flush(x);
          continue;
        }
        const color = terrainBodyColor(tile, y);
        if (runStart < 0) {
          runStart = x;
          runColor = color;
        } else if (color !== runColor) {
          flush(x);
          runStart = x;
          runColor = color;
        }
      }
    }
  }

function maskTileDeepInterior(scene: DeepdiveScene, x: number, y: number) {
    const startSx = x * TERRAIN_MASK_RES;
    const startSy = y * TERRAIN_MASK_RES;
    for (let sy = startSy - 3; sy < startSy + TERRAIN_MASK_RES + 3; sy += 1) {
      for (let sx = startSx - 3; sx < startSx + TERRAIN_MASK_RES + 3; sx += 1) {
        if (terrainMaskDensityAt(scene, sx, sy) < TERRAIN_MASK_SOLID_THRESHOLD) return false;
      }
    }
    return true;
  }

function drawTerrainSilhouetteCell(scene: DeepdiveScene, x: number, y: number, tile: Tile) {
    const wx = x * TILE;
    const wy = y * TILE;
    const northWater = scene.getTile(x, y - 1) === 'water';
    const southWater = scene.getTile(x, y + 1) === 'water';
    const westWater = scene.getTile(x - 1, y) === 'water';
    const eastWater = scene.getTile(x + 1, y) === 'water';
    const color = terrainBodyColor(tile, y);
    const n0 = northWater ? terrainEdgeInset(x, y, 'n') : 0;
    const n1 = northWater ? terrainEdgeInset(x + 1, y, 'n') : 0;
    const s0 = southWater ? terrainEdgeInset(x, y + 1, 's') : 0;
    const s1 = southWater ? terrainEdgeInset(x + 1, y + 1, 's') : 0;
    const w0 = westWater ? terrainEdgeInset(x, y, 'w') : 0;
    const w1 = westWater ? terrainEdgeInset(x, y + 1, 'w') : 0;
    const e0 = eastWater ? terrainEdgeInset(x + 1, y, 'e') : 0;
    const e1 = eastWater ? terrainEdgeInset(x + 1, y + 1, 'e') : 0;

    scene.terrain.fillStyle(color, 0.97);
    scene.terrain.beginPath();
    scene.terrain.moveTo(wx + w0, wy + n0);
    if (northWater) {
      scene.terrain.lineTo(
        wx + TILE * 0.5 + terrainEdgeMidJitter(x, y, 'n'),
        wy + terrainEdgeMidInset(x, y, 'n'),
      );
    }
    scene.terrain.lineTo(wx + TILE - e0, wy + n1);
    if (eastWater) {
      scene.terrain.lineTo(
        wx + TILE - terrainEdgeMidInset(x, y, 'e'),
        wy + TILE * 0.5 + terrainEdgeMidJitter(x, y, 'e'),
      );
    }
    scene.terrain.lineTo(wx + TILE - e1, wy + TILE - s1);
    if (southWater) {
      scene.terrain.lineTo(
        wx + TILE * 0.5 + terrainEdgeMidJitter(x, y, 's'),
        wy + TILE - terrainEdgeMidInset(x, y, 's'),
      );
    }
    scene.terrain.lineTo(wx + w1, wy + TILE - s0);
    if (westWater) {
      scene.terrain.lineTo(
        wx + terrainEdgeMidInset(x, y, 'w'),
        wy + TILE * 0.5 + terrainEdgeMidJitter(x, y, 'w'),
      );
    }
    scene.terrain.closePath();
    scene.terrain.fillPath();
  }

function terrainEdgeInset(x: number, y: number, side: 'n' | 's' | 'w' | 'e') {
    const salt = side === 'n' ? 911 : side === 's' ? 913 : side === 'w' ? 917 : 919;
    return 2.5 + hash(x * 41 + salt, y * 43 - salt, rng.seed + salt) * 5.5;
  }

function terrainEdgeMidInset(x: number, y: number, side: 'n' | 's' | 'w' | 'e') {
    const salt = side === 'n' ? 941 : side === 's' ? 943 : side === 'w' ? 947 : 953;
    return 2 + hash(x * 53 + salt, y * 59 - salt, rng.seed + salt) * 8.5;
  }

function terrainEdgeMidJitter(x: number, y: number, side: 'n' | 's' | 'w' | 'e') {
    const salt = side === 'n' ? 967 : side === 's' ? 971 : side === 'w' ? 977 : 983;
    return (hash(x * 61 + salt, y * 67 - salt, rng.seed + salt) - 0.5) * 6;
  }

function terrainWaterColor() {
    if (state.biome === 4) return state.depth < 440 ? 0x12242b : state.depth < 1120 ? 0x101923 : 0x06070d;
    if (state.biome === 3) return state.depth < 440 ? 0x161d32 : state.depth < 1120 ? 0x111424 : 0x090913;
    if (state.biome === 2) return state.depth < 440 ? 0x18313a : state.depth < 1120 ? 0x171f2b : 0x110f18;
    return state.depth < 440 ? 0x0b3741 : state.depth < 1040 ? 0x092430 : 0x06111d;
  }

const TERRAIN_VISUAL_CHUNK_SIZE = 12;
const TERRAIN_VISUAL_MARGIN_TILES = 6;
const TERRAIN_EDGE_SEGMENT_TILES = 5;

function drawTerrainVisualBrushes(
  scene: DeepdiveScene,
  startX: number,
  endX: number,
  startY: number,
  endY: number,
  activeKeys: Set<string>,
) {
    const chunk = TERRAIN_VISUAL_CHUNK_SIZE;
    const chunkStartX = Math.floor((startX - TERRAIN_VISUAL_MARGIN_TILES) / chunk);
    const chunkEndX = Math.floor((endX + TERRAIN_VISUAL_MARGIN_TILES) / chunk);
    const chunkStartY = Math.floor((startY - TERRAIN_VISUAL_MARGIN_TILES) / chunk);
    const chunkEndY = Math.floor((endY + TERRAIN_VISUAL_MARGIN_TILES) / chunk);
    const minPxX = (startX - TERRAIN_VISUAL_MARGIN_TILES) * TILE;
    const maxPxX = (endX + TERRAIN_VISUAL_MARGIN_TILES + 1) * TILE;
    const minPxY = (startY - TERRAIN_VISUAL_MARGIN_TILES) * TILE;
    const maxPxY = (endY + TERRAIN_VISUAL_MARGIN_TILES + 1) * TILE;

    for (let cy = chunkStartY; cy <= chunkEndY; cy += 1) {
      for (let cx = chunkStartX; cx <= chunkEndX; cx += 1) {
        const visualChunk = terrainVisualChunk(scene, cx, cy);
        for (const placement of visualChunk.placements) {
          if (!placementIntersects(placement, minPxX, maxPxX, minPxY, maxPxY)) continue;
          drawTerrainPlacement(scene, placement, activeKeys);
        }
      }
    }
  }

function terrainVisualChunk(scene: DeepdiveScene, chunkX: number, chunkY: number): TerrainVisualChunk {
    const key = `${chunkX}:${chunkY}`;
    const cached = scene.terrainVisualChunks.get(key);
    if (cached && !scene.terrainVisualDirtyChunks.has(key)) return cached;
    const chunk = buildTerrainVisualChunk(scene, chunkX, chunkY);
    scene.terrainVisualChunks.set(key, chunk);
    scene.terrainVisualDirtyChunks.delete(key);
    return chunk;
  }

function buildTerrainVisualChunk(scene: DeepdiveScene, chunkX: number, chunkY: number): TerrainVisualChunk {
    const key = `${chunkX}:${chunkY}`;
    const placements: TerrainBrushPlacement[] = [];
    const size = TERRAIN_VISUAL_CHUNK_SIZE;
    const startX = chunkX * size;
    const startY = chunkY * size;
    appendFillPlacement(scene, placements, chunkX, chunkY, startX, startY, size);

    for (let y = startY; y < startY + size; y += 1) {
      for (let x = startX; x < startX + size; x += 1) {
        appendFloraPlacements(scene, placements, x, y);
      }
    }

    placements.sort((a, b) => a.depth - b.depth || a.key.localeCompare(b.key));
    return { key, chunkX, chunkY, placements };
  }

function appendFillPlacement(
  scene: DeepdiveScene,
  placements: TerrainBrushPlacement[],
  chunkX: number,
  chunkY: number,
  startX: number,
  startY: number,
  size: number,
) {
    // Deepdive-style terrain reads as a dark silhouette; interior rock plates made square backing visible.
    void scene;
    void placements;
    void chunkX;
    void chunkY;
    void startX;
    void startY;
    void size;
  }

function anchorBelongsToChunk(x: number, y: number, chunkX: number, chunkY: number) {
    return Math.floor(x / TERRAIN_VISUAL_CHUNK_SIZE) === chunkX
      && Math.floor(y / TERRAIN_VISUAL_CHUNK_SIZE) === chunkY;
  }

function placementIntersects(placement: TerrainBrushPlacement, minX: number, maxX: number, minY: number, maxY: number) {
    const halfW = placement.width * Math.max(placement.originX, 1 - placement.originX);
    const halfH = placement.height * Math.max(placement.originY, 1 - placement.originY);
    return placement.x + halfW >= minX
      && placement.x - halfW <= maxX
      && placement.y + halfH >= minY
      && placement.y - halfH <= maxY;
  }

function drawTerrainPlacement(scene: DeepdiveScene, placement: TerrainBrushPlacement, activeKeys: Set<string>) {
    activeKeys.add(placement.key);
    const sprite = scene.terrainBrushSpriteForKey(placement.key, placement.textureKey);
    sprite
      .setTexture(placement.textureKey)
      .setVisible(true)
      .setPosition(placement.x, placement.y)
      .setOrigin(placement.originX, placement.originY)
      .setDisplaySize(placement.width, placement.height)
      .setFlipX(placement.flipX)
      .setFlipY(placement.flipY)
      .setRotation(placement.rotation ?? 0)
      .setAlpha(placement.alpha)
      .setDepth(placement.depth);
  }

function solidChunkScore(scene: DeepdiveScene, startX: number, startY: number, size: number) {
    let solid = 0;
    let edge = 0;
    let cells = 0;
    for (let y = startY; y < startY + size; y += 1) {
      for (let x = startX; x < startX + size; x += 1) {
        if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) continue;
        cells += 1;
        const tile = scene.getTile(x, y);
        if (tile === 'water') continue;
        solid += 1;
        if (exposedToWater(scene, x, y)) edge += 1;
      }
    }
    return {
      solidRatio: cells > 0 ? solid / cells : 0,
      edgeRatio: solid > 0 ? edge / solid : 1,
    };
  }

function horizontalSegmentExposed(scene: DeepdiveScene, sx: number, y: number, north: boolean) {
    let exposed = 0;
    for (let x = sx; x < sx + TERRAIN_EDGE_SEGMENT_TILES; x += 1) {
      const tile = scene.getTile(x, y);
      if (tile === 'water') continue;
      if ((north ? scene.getTile(x, y - 1) : scene.getTile(x, y + 1)) === 'water') exposed += 1;
    }
    return exposed >= 3 && horizontalSegmentOpenWater(scene, sx, y, north);
  }

function verticalSegmentExposed(scene: DeepdiveScene, x: number, sy: number, west: boolean) {
    let exposed = 0;
    for (let y = sy; y < sy + TERRAIN_EDGE_SEGMENT_TILES; y += 1) {
      const tile = scene.getTile(x, y);
      if (tile === 'water') continue;
      if ((west ? scene.getTile(x - 1, y) : scene.getTile(x + 1, y)) === 'water') exposed += 1;
    }
    return exposed >= 4 && verticalSegmentOpenWater(scene, x, sy, west);
  }

function horizontalSegmentOpenWater(scene: DeepdiveScene, sx: number, y: number, north: boolean) {
    let open = 0;
    let broadColumns = 0;
    const dy = north ? -1 : 1;
    for (let x = sx; x < sx + TERRAIN_EDGE_SEGMENT_TILES; x += 1) {
      let columnOpen = 0;
      for (let oy = 1; oy <= 4; oy += 1) {
        if (scene.getTile(x, y + dy * oy) === 'water') open += 1;
        if (scene.getTile(x, y + dy * oy) === 'water') columnOpen += 1;
      }
      if (columnOpen >= 4) broadColumns += 1;
    }
    return open >= 16 && broadColumns >= 4;
  }

function verticalSegmentOpenWater(scene: DeepdiveScene, x: number, sy: number, west: boolean) {
    let open = 0;
    let broadRows = 0;
    const dx = west ? -1 : 1;
    for (let y = sy; y < sy + TERRAIN_EDGE_SEGMENT_TILES; y += 1) {
      let rowOpen = 0;
      for (let ox = 1; ox <= 4; ox += 1) {
        if (scene.getTile(x + dx * ox, y) === 'water') open += 1;
        if (scene.getTile(x + dx * ox, y) === 'water') rowOpen += 1;
      }
      if (rowOpen >= 4) broadRows += 1;
    }
    return open >= 16 && broadRows >= 4;
  }

function ledgePlacement(sx: number, y: number, north: boolean): TerrainBrushPlacement {
    const variant = Math.floor(hash(sx * 11, y * 13 + (north ? 0 : 101), rng.seed) * 4) % 4;
    const width = 86 + hash(sx, y, rng.seed + 401) * 18;
    const height = 24 + hash(y, sx, rng.seed + 403) * 8;
    const x = (sx + TERRAIN_EDGE_SEGMENT_TILES * 0.5) * TILE + (hash(sx * 5, y * 7, rng.seed + 405) - 0.5) * 8;
    const yPos = north ? y * TILE + 4 : (y + 1) * TILE - 4;
    return {
      key: `terrain:ledge:${sx}:${y}:${north ? 'n' : 's'}`,
      textureKey: `terrain-brush-ledge-${variant}`,
      x,
      y: yPos,
      width,
      height,
      originX: 0.5,
      originY: north ? 0.2 : 0.8,
      flipX: hash(sx, y, rng.seed + 101) > 0.5,
      flipY: !north,
      alpha: 0.035,
      depth: 0.78,
    };
  }

function wallPlacement(x: number, sy: number, west: boolean): TerrainBrushPlacement {
    const variant = Math.floor(hash(x * 17, sy * 19 + (west ? 0 : 103), rng.seed) * 4) % 4;
    const height = 86 + hash(x, sy, rng.seed + 411) * 22;
    const width = 28 + hash(sy, x, rng.seed + 413) * 12;
    const xPos = west ? x * TILE + 3 : (x + 1) * TILE - 3;
    const y = (sy + TERRAIN_EDGE_SEGMENT_TILES * 0.5) * TILE + (hash(x * 7, sy * 5, rng.seed + 415) - 0.5) * 8;
    return {
      key: `terrain:wall:${x}:${sy}:${west ? 'w' : 'e'}`,
      textureKey: `terrain-brush-wall-${variant}`,
      x: xPos,
      y,
      width,
      height,
      originX: west ? 0.24 : 0.76,
      originY: 0.5,
      flipX: !west,
      flipY: hash(x, sy, rng.seed + 103) > 0.5,
      alpha: 0.03,
      depth: 0.72,
    };
  }

function appendCornerPlacements(scene: DeepdiveScene, placements: TerrainBrushPlacement[], x: number, y: number) {
    if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H || scene.getTile(x, y) === 'water') return;
    const northWater = scene.getTile(x, y - 1) === 'water';
    const southWater = scene.getTile(x, y + 1) === 'water';
    const westWater = scene.getTile(x - 1, y) === 'water';
    const eastWater = scene.getTile(x + 1, y) === 'water';
    if (hash(x * 61, y * 67, rng.seed + 641) < 0.38) return;
    if (northWater && westWater && scene.getTile(x - 1, y - 1) === 'water') placements.push(cornerPlacement(x, y, 'nw'));
    if (northWater && eastWater && scene.getTile(x + 1, y - 1) === 'water') placements.push(cornerPlacement(x, y, 'ne'));
    if (southWater && westWater && scene.getTile(x - 1, y + 1) === 'water') placements.push(cornerPlacement(x, y, 'sw'));
    if (southWater && eastWater && scene.getTile(x + 1, y + 1) === 'water') placements.push(cornerPlacement(x, y, 'se'));
  }

function appendFloraPlacements(scene: DeepdiveScene, placements: TerrainBrushPlacement[], x: number, y: number) {
    if (x < 1 || y < 8 || x >= WORLD_W - 1 || y >= WORLD_H - 2 || scene.getTile(x, y) === 'water') return;
    const seed = hash(x * 97, y * 101, rng.seed + 1201);
    if (scene.getTile(x, y - 1) === 'water' && topLedgeFloraClearance(scene, x, y) && seed > 0.9) {
      placements.push(floraPlacement(x, y, 'top'));
      return;
    }
    if (seed > 0.975 && sideWallFloraClearance(scene, x, y, true)) placements.push(floraPlacement(x, y, 'west'));
    if (seed < 0.025 && sideWallFloraClearance(scene, x, y, false)) placements.push(floraPlacement(x, y, 'east'));
  }

function topLedgeFloraClearance(scene: DeepdiveScene, x: number, y: number) {
    let open = 0;
    let support = 0;
    for (let dx = -3; dx <= 3; dx += 1) {
      if (scene.getTile(x + dx, y) !== 'water') support += 1;
      for (let oy = 1; oy <= 6; oy += 1) {
        if (scene.getTile(x + dx, y - oy) === 'water') open += 1;
      }
    }
    return support >= 5 && open >= 38;
  }

function sideWallFloraClearance(scene: DeepdiveScene, x: number, y: number, west: boolean) {
    if ((west ? scene.getTile(x - 1, y) : scene.getTile(x + 1, y)) !== 'water') return false;
    const dx = west ? -1 : 1;
    let open = 0;
    let verticalRock = 0;
    for (let oy = -2; oy <= 2; oy += 1) {
      if (scene.getTile(x, y + oy) !== 'water') verticalRock += 1;
      for (let ox = 1; ox <= 4; ox += 1) {
        if (scene.getTile(x + dx * ox, y + oy) === 'water') open += 1;
      }
    }
    return verticalRock >= 4 && open >= 18;
  }

function floraPlacement(x: number, y: number, anchor: 'top' | 'west' | 'east'): TerrainBrushPlacement {
    const seed = hash(x * 109, y * 113 + anchor.length, rng.seed + 1217);
    const variants = anchor === 'top' ? [1, 4, 6, 7] : [1, 6, 7];
    const variant = variants[Math.floor(seed * variants.length) % variants.length];
    const size = anchor === 'top'
      ? 14 + hash(x, y, rng.seed + 1219) * 12
      : 11 + hash(y, x, rng.seed + 1223) * 10;
    const tall = variant === 1 || variant === 4 || variant === 6 || variant === 7;
    const height = anchor === 'top' ? size * (tall ? 1.28 : 1.02) : size * 1.12;
    const xJitter = (hash(x, y, rng.seed + 1229) - 0.5) * 10;
    const yJitter = (hash(y, x, rng.seed + 1231) - 0.5) * 5;
    const sideSign = anchor === 'west' ? -1 : 1;
    return {
      key: `terrain:flora:${x}:${y}:${anchor}`,
      textureKey: `terrain-brush-flora-${variant}`,
      x: anchor === 'top' ? x * TILE + TILE * 0.5 + xJitter : x * TILE + TILE * 0.5 + sideSign * 8,
      y: anchor === 'top' ? y * TILE + 2 + yJitter : y * TILE + TILE * 0.54 + yJitter,
      width: size,
      height,
      originX: 0.5,
      originY: anchor === 'top' ? 0.92 : 0.74,
      flipX: anchor === 'west' || hash(x, y, rng.seed + 1237) > 0.5,
      flipY: false,
      alpha: anchor === 'top' ? 0.62 : 0.34,
      depth: anchor === 'top' ? 0.9 : 0.84,
      rotation: anchor === 'top'
        ? (hash(x, y, rng.seed + 1241) - 0.5) * 0.18
        : sideSign * (0.28 + hash(x, y, rng.seed + 1243) * 0.18),
    };
  }

function cornerPlacement(x: number, y: number, corner: 'nw' | 'ne' | 'sw' | 'se'): TerrainBrushPlacement {
    const variant = Math.floor(hash(x * 43 + corner.charCodeAt(0), y * 47 + corner.charCodeAt(1), rng.seed + 601) * 6) % 6;
    const size = 34 + hash(x * 53, y * 59, rng.seed + 603) * 10;
    const west = corner === 'nw' || corner === 'sw';
    const north = corner === 'nw' || corner === 'ne';
    return {
      key: `terrain:corner:${x}:${y}:${corner}`,
      textureKey: `terrain-brush-corner-${variant}`,
      x: x * TILE + (west ? 2 : TILE - 2),
      y: y * TILE + (north ? 2 : TILE - 2),
      width: size,
      height: size,
      originX: west ? 0.18 : 0.82,
      originY: north ? 0.18 : 0.82,
      flipX: !west,
      flipY: !north,
      alpha: 0.035,
      depth: 0.8,
    };
  }

function drawTerrainDetail(scene: DeepdiveScene, x: number, y: number, tile: Tile, fracture: number) {
    const wx = x * TILE;
    const wy = y * TILE;
    const exposed = exposedToWater(scene, x, y);
    const patch = hash(Math.floor(x / 3) * 17, Math.floor(y / 3) * 19, rng.seed);
    const fleck = hash(x * 29, y * 31, rng.seed);
    if ((exposed ? fleck > 0.68 : fleck > 0.92) && fracture <= 0) {
      const tone = patch > 0.6 ? 0x314650 : 0x0b1820;
      const alpha = exposed ? (patch > 0.6 ? 0.025 : 0.04) : 0.018;
      const px = wx + 3 + hash(x, y, rng.seed + 3) * 16;
      const py = wy + 3 + hash(y, x, rng.seed + 5) * 16;
      scene.terrain.fillStyle(tone, alpha);
      scene.terrain.fillRect(Math.floor(px), Math.floor(py), fleck > 0.78 ? 8 : 4, fleck > 0.82 ? 2 : 3);
    }
    if (fracture > 0) {
      const cx = wx + TILE * (0.48 + (hash(x, y, rng.seed + 29) - 0.5) * 0.16);
      const cy = wy + TILE * (0.52 + (hash(y, x, rng.seed + 31) - 0.5) * 0.16);
      scene.terrain.fillStyle(0x050b10, 0.18 + fracture * 0.24);
      scene.terrain.fillEllipse(cx, cy, TILE * (0.38 + fracture * 0.42), TILE * (0.22 + fracture * 0.26));
      scene.terrain.lineStyle(2, 0xbbe8e3, 0.14 + fracture * 0.28);
      for (let i = 0; i < 4; i += 1) {
        const angle = hash(x * 17 + i, y * 19 - i, rng.seed + 33) * Math.PI * 2;
        const inner = TILE * (0.08 + fracture * 0.06);
        const outer = TILE * (0.22 + fracture * (0.28 + i * 0.03));
        scene.terrain.lineBetween(
          cx + Math.cos(angle) * inner,
          cy + Math.sin(angle) * inner,
          cx + Math.cos(angle) * outer,
          cy + Math.sin(angle) * outer,
        );
      }
    }
  }

function terrainBodyColor(tile: Tile, y: number) {
    return terrainBodyColorForTile(tile, y);
  }

function drawOrganicEdgeFeather(scene: DeepdiveScene, x: number, y: number, tile: Tile) {
    const wx = x * TILE;
    const wy = y * TILE;
    const northWater = scene.getTile(x, y - 1) === 'water';
    const southWater = scene.getTile(x, y + 1) === 'water';
    const westWater = scene.getTile(x - 1, y) === 'water';
    const eastWater = scene.getTile(x + 1, y) === 'water';
    const palette = terrainAccentPalette();
    const color = tile === 'sand' ? terrainBodyColor(tile, y) : palette.shadow;
    const glow = tile === 'sand' ? palette.sandRim : palette.rim;
    const seed = hash(x * 73, y * 79, rng.seed + 733);
    scene.terrainEdges.fillStyle(color, 0.08);
    if (northWater) {
      scene.terrainEdges.fillEllipse(wx + TILE * (0.5 + (seed - 0.5) * 0.18), wy + 1, TILE * 0.82, TILE * 0.22);
    }
    if (southWater) {
      scene.terrainEdges.fillEllipse(wx + TILE * (0.5 - (seed - 0.5) * 0.18), wy + TILE - 1, TILE * 0.82, TILE * 0.22);
    }
    if (westWater) {
      scene.terrainEdges.fillEllipse(wx + 1, wy + TILE * (0.5 + (seed - 0.5) * 0.18), TILE * 0.22, TILE * 0.82);
    }
    if (eastWater) {
      scene.terrainEdges.fillEllipse(wx + TILE - 1, wy + TILE * (0.5 - (seed - 0.5) * 0.18), TILE * 0.22, TILE * 0.82);
    }
    if (northWater) drawEdgeFuzz(scene, x, y, tile, 'north');
    if (southWater) drawEdgeFuzz(scene, x, y, tile, 'south');
    if (westWater) drawEdgeFuzz(scene, x, y, tile, 'west');
    if (eastWater) drawEdgeFuzz(scene, x, y, tile, 'east');
    if (seed > 0.7 && (northWater || southWater || westWater || eastWater)) {
      scene.terrainEdges.fillStyle(glow, 0.06);
      scene.terrainEdges.fillCircle(
        wx + TILE * (0.3 + hash(x, y, rng.seed + 735) * 0.4),
        wy + TILE * (0.3 + hash(y, x, rng.seed + 737) * 0.4),
        TILE * (0.12 + hash(x + y, y - x, rng.seed + 739) * 0.1),
      );
    }
  }

function drawEdgeFuzz(scene: DeepdiveScene, x: number, y: number, tile: Tile, side: 'north' | 'south' | 'west' | 'east') {
    const wx = x * TILE;
    const wy = y * TILE;
    const seedSalt = side === 'north' ? 1301 : side === 'south' ? 1303 : side === 'west' ? 1307 : 1309;
    const palette = terrainAccentPalette();
    const dark = palette.shadow;
    const rim = tile === 'sand' ? palette.sandRim : palette.rim;
    const growth = palette.growth;
    const count = 5 + Math.floor(hash(x * 7 + seedSalt, y * 11 - seedSalt, rng.seed) * 5);
    for (let i = 0; i < count; i += 1) {
      const t = (i + hash(x * 17 + i, y * 19, rng.seed + seedSalt)) / count;
      const jitter = (hash(x * 23 - i, y * 29 + i, rng.seed + seedSalt) - 0.5) * 9;
      const depth = hash(x * 31 + i, y * 37 - i, rng.seed + seedSalt);
      const length = 2 + depth * 7;
      let px = wx;
      let py = wy;
      let sx = 0;
      let sy = 0;
      if (side === 'north') {
        px = wx + t * TILE + jitter * 0.35;
        py = wy + terrainEdgeInset(x, y, 'n') - length * 0.45;
        sy = -length;
      } else if (side === 'south') {
        px = wx + t * TILE + jitter * 0.35;
        py = wy + TILE - terrainEdgeInset(x, y + 1, 's') + length * 0.2;
        sy = length;
      } else if (side === 'west') {
        px = wx + terrainEdgeInset(x, y, 'w') - length * 0.35;
        py = wy + t * TILE + jitter * 0.35;
        sx = -length;
      } else {
        px = wx + TILE - terrainEdgeInset(x + 1, y, 'e') + length * 0.2;
        py = wy + t * TILE + jitter * 0.35;
        sx = length;
      }

      if (depth > 0.62) {
        scene.terrainEdges.fillStyle(depth > 0.8 ? rim : dark, depth > 0.8 ? 0.055 : 0.07);
        scene.terrainEdges.fillEllipse(px, py, depth > 0.82 ? 3.2 : 2.1, depth > 0.86 ? 2.2 : 1.6);
      }
      if (depth > 0.82) {
        scene.terrainEdges.lineStyle(1, depth > 0.92 ? growth : dark, depth > 0.92 ? 0.07 : 0.05);
        scene.terrainEdges.lineBetween(px, py, px + sx * 0.42, py + sy * 0.42);
      }
    }
  }

function drawTerrainContour(scene: DeepdiveScene, x: number, y: number, tile: Tile) {
    const wx = x * TILE;
    const wy = y * TILE;
    const northWater = scene.getTile(x, y - 1) === 'water';
    const southWater = scene.getTile(x, y + 1) === 'water';
    const westWater = scene.getTile(x - 1, y) === 'water';
    const eastWater = scene.getTile(x + 1, y) === 'water';
    const palette = terrainAccentPalette();
    const edgeColor = tile === 'sand' ? palette.sandRim : palette.rim;
    const shadowColor = palette.shadow;

    scene.terrainEdges.lineStyle(7, shadowColor, 0.34);
    drawContourLines(scene.terrainEdges, wx, wy, x, y, northWater, southWater, westWater, eastWater, 0);
    scene.terrainEdges.lineStyle(2, edgeColor, 0.14);
    drawContourLines(scene.terrainEdges, wx, wy, x, y, northWater, southWater, westWater, eastWater, -1.5);
  }

function drawContourLines(
  graphics: Phaser.GameObjects.Graphics,
  wx: number,
  wy: number,
  x: number,
  y: number,
  north: boolean,
  south: boolean,
  west: boolean,
  east: boolean,
  inset: number,
) {
    if (north) {
      graphics.beginPath();
      graphics.moveTo(wx, wy + terrainEdgeInset(x, y, 'n') + inset);
      graphics.lineTo(
        wx + TILE * 0.5 + terrainEdgeMidJitter(x, y, 'n'),
        wy + terrainEdgeMidInset(x, y, 'n') + inset,
      );
      graphics.lineTo(wx + TILE, wy + terrainEdgeInset(x + 1, y, 'n') + inset);
      graphics.strokePath();
    }
    if (south) {
      graphics.beginPath();
      graphics.moveTo(wx, wy + TILE - terrainEdgeInset(x, y + 1, 's') - inset);
      graphics.lineTo(
        wx + TILE * 0.5 + terrainEdgeMidJitter(x, y, 's'),
        wy + TILE - terrainEdgeMidInset(x, y, 's') - inset,
      );
      graphics.lineTo(wx + TILE, wy + TILE - terrainEdgeInset(x + 1, y + 1, 's') - inset);
      graphics.strokePath();
    }
    if (west) {
      graphics.beginPath();
      graphics.moveTo(wx + terrainEdgeInset(x, y, 'w') + inset, wy);
      graphics.lineTo(
        wx + terrainEdgeMidInset(x, y, 'w') + inset,
        wy + TILE * 0.5 + terrainEdgeMidJitter(x, y, 'w'),
      );
      graphics.lineTo(wx + terrainEdgeInset(x, y + 1, 'w') + inset, wy + TILE);
      graphics.strokePath();
    }
    if (east) {
      graphics.beginPath();
      graphics.moveTo(wx + TILE - terrainEdgeInset(x + 1, y, 'e') - inset, wy);
      graphics.lineTo(
        wx + TILE - terrainEdgeMidInset(x, y, 'e') - inset,
        wy + TILE * 0.5 + terrainEdgeMidJitter(x, y, 'e'),
      );
      graphics.lineTo(wx + TILE - terrainEdgeInset(x + 1, y + 1, 'e') - inset, wy + TILE);
      graphics.strokePath();
    }
  }

function drawEmbeddedOre(scene: DeepdiveScene, x: number, y: number, tile: Tile, exposed: boolean) {
    if (maskTileSolidRatio(scene, x, y) < 0.42) return;
    if (!exposed && hash(x * 13, y * 17, rng.seed) < 0.72) return;
    const wx = x * TILE;
    const wy = y * TILE;
    const color = orePixelColor(tile);
    const glow = oreGlowColor(tile);
    const cx = wx + TILE * (0.45 + (hash(x, y, rng.seed + 71) - 0.5) * 0.24);
    const cy = wy + TILE * (0.48 + (hash(y, x, rng.seed + 73) - 0.5) * 0.24);
    const veinAngle = hash(x * 97, y * 101, rng.seed + 1103) * Math.PI - Math.PI * 0.5;
    const veinLength = exposed ? TILE * 0.5 : TILE * 0.32;
    const veinWidth = 1;
    scene.terrainEdges.lineStyle(3, 0x010306, exposed ? 0.3 : 0.18);
    scene.terrainEdges.lineBetween(
      cx - Math.cos(veinAngle) * veinLength * 0.5,
      cy - Math.sin(veinAngle) * veinLength * 0.5,
      cx + Math.cos(veinAngle) * veinLength * 0.5,
      cy + Math.sin(veinAngle) * veinLength * 0.5,
    );
    scene.terrainEdges.lineStyle(veinWidth, glow, exposed ? 0.38 : 0.18);
    scene.terrainEdges.lineBetween(
      cx - Math.cos(veinAngle) * veinLength * 0.42,
      cy - Math.sin(veinAngle) * veinLength * 0.42,
      cx + Math.cos(veinAngle) * veinLength * 0.42,
      cy + Math.sin(veinAngle) * veinLength * 0.42,
    );
    if (exposed) {
      for (let branch = -1; branch <= 1; branch += 2) {
        const branchAngle = veinAngle + branch * (0.65 + hash(x + branch, y - branch, rng.seed + 1113) * 0.4);
        const bx = cx + Math.cos(veinAngle) * veinLength * (branch > 0 ? 0.12 : -0.18);
        const by = cy + Math.sin(veinAngle) * veinLength * (branch > 0 ? 0.12 : -0.18);
        const branchLength = TILE * (0.12 + hash(y + branch, x, rng.seed + 1117) * 0.13);
        scene.terrainEdges.lineStyle(1, glow, 0.24);
        scene.terrainEdges.lineBetween(bx, by, bx + Math.cos(branchAngle) * branchLength, by + Math.sin(branchAngle) * branchLength);
      }
    }
    scene.terrainEdges.fillStyle(0x041019, exposed ? 0.42 : 0.22);
    scene.terrainEdges.fillEllipse(cx, cy, exposed ? 9 : 5, exposed ? 6 : 3);
    scene.terrainEdges.fillStyle(glow, exposed ? 0.115 : 0.055);
    scene.terrainEdges.fillEllipse(cx, cy, exposed ? 13 : 7, exposed ? 8 : 4);
    for (let i = 0; i < 8; i += 1) {
      const angle = hash(x * 23 + i, y * 29, rng.seed) * Math.PI * 2;
      const radius = hash(y * 31, x * 37 + i, rng.seed) * (exposed ? 4.8 : 2.9);
      const size = i === 0 ? 2.4 : 1.1 + hash(i, x + y, rng.seed) * 1.5;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      scene.terrainEdges.fillStyle(i === 0 ? 0xf4ffff : color, i === 0 ? 0.72 : exposed ? 0.58 : 0.38);
      scene.terrainEdges.fillCircle(px, py, Math.max(0.75, size * 0.42));
    }
  }

function drawOreBrush(scene: DeepdiveScene, x: number, y: number, tile: Tile, activeKeys: Set<string>) {
    const variant = oreBrushVariant(tile);
    const key = `terrain-brush-ore-${variant}`;
    const stableKey = `terrain:ore:${x}:${y}:${tile}`;
    activeKeys.add(stableKey);
    const sprite = scene.terrainBrushSpriteForKey(stableKey, key);
    const size = tile === 'ruinCore' || tile === 'abyssalCrown' ? 34 : 28;
    const offsetX = (hash(x * 31, y * 37, rng.seed) - 0.5) * 7;
    const offsetY = (hash(y * 41, x * 43, rng.seed) - 0.5) * 7;
    sprite
      .setTexture(key)
      .setVisible(true)
      .setPosition(x * TILE + TILE * 0.5 + offsetX, y * TILE + TILE * 0.5 + offsetY)
      .setOrigin(0.5)
      .setDisplaySize(size * 1.25, size)
      .setFlipX(hash(x, y, rng.seed + 211) > 0.5)
      .setFlipY(false)
      .setAlpha(0.92)
      .setDepth(0.86);
  }

function oreBrushVariant(tile: Tile) {
    if (tile === 'copper') return 0;
    if (tile === 'quartz') return 1;
    if (tile === 'ruby') return 2;
    if (tile === 'cobalt') return 3;
    if (tile === 'sunstone') return 4;
    return 5;
  }

function orePixelColor(tile: Tile) {
    if (tile === 'copper') return 0xe18446;
    if (tile === 'quartz') return 0xeefffb;
    if (tile === 'ruby') return 0xff4766;
    if (tile === 'cobalt') return 0x6fa0ff;
    if (tile === 'sunstone') return 0xffd76a;
    if (tile === 'alienAlloy') return 0x80ffd4;
    if (tile === 'ruinCore') return 0xd397ff;
    return 0xb9f27c;
  }

function oreGlowColor(tile: Tile) {
    if (tile === 'copper') return 0xffa35f;
    if (tile === 'quartz') return 0xf6fffd;
    if (tile === 'ruby') return 0xff5e78;
    if (tile === 'cobalt') return 0x82d9ff;
    if (tile === 'sunstone') return 0xffdd74;
    if (tile === 'alienAlloy') return 0x80ffd4;
    if (tile === 'ruinCore') return 0xe084ff;
    return orePixelColor(tile);
  }

function drawFractureMarks(scene: DeepdiveScene, x: number, y: number, tile: Tile, fracture: number) {
    const wx = x * TILE;
    const wy = y * TILE;
    const seedA = hash(x * 151, y * 157, rng.seed + 7601);
    const seedB = hash(y * 163, x * 167, rng.seed + 7603);
    const cx = wx + TILE * (0.42 + seedA * 0.16);
    const cy = wy + TILE * (0.42 + seedB * 0.16);
    const tint = tile === 'sand' ? 0x2b352f : 0x10282a;
    scene.terrain.fillStyle(0x010306, 0.08 + fracture * 0.1);
    scene.terrain.fillEllipse(cx, cy, TILE * (0.42 + fracture * 0.42), TILE * (0.24 + fracture * 0.24));
    scene.terrain.fillStyle(tint, 0.035 + fracture * 0.055);
    scene.terrain.fillEllipse(
      cx + (seedA - 0.5) * TILE * 0.18,
      cy + (seedB - 0.5) * TILE * 0.18,
      TILE * (0.3 + fracture * 0.28),
      TILE * (0.16 + fracture * 0.16),
    );
  }

export function drawBoat(this: DeepdiveScene, ) {
    const x = WORLD_W * TILE * 0.5;
    const s = BARGE_DRAW_SCALE;
    const waterlineY = BARGE_DOCK_Y + 4;
    const halfWidth = BARGE_PLATFORM_WIDTH * 0.5;
    this.bargeSprite
      .setVisible(true)
      .setAlpha(1)
      .setPosition(x, 0)
      .setDisplaySize(BARGE_PLATFORM_WIDTH, BARGE_PLATFORM_HEIGHT);

    this.actors.fillStyle(0x0a4252, 0.2);
    this.actors.fillRect(x - halfWidth - 18 * s, waterlineY + 3 * s, BARGE_PLATFORM_WIDTH + 36 * s, 12 * s);
    this.actors.fillStyle(0xcdfcff, state.atBoat ? 0.34 : 0.2);
    this.actors.fillEllipse(x - 138 * s, waterlineY + 2 * s, 130 * s, 11 * s);
    this.actors.fillEllipse(x + 130 * s, waterlineY + 2 * s, 118 * s, 10 * s);
    this.actors.fillStyle(0x55d7e6, state.atBoat ? 0.18 : 0.09);
    this.actors.fillEllipse(x, waterlineY + 8 * s, 210 * s, 20 * s);
    this.actors.lineStyle(2, 0xe8ffff, state.atBoat ? 0.72 : 0.42);
    this.actors.lineBetween(x - halfWidth - 10 * s, waterlineY, x + halfWidth + 10 * s, waterlineY);
    this.actors.lineStyle(1, 0x7ee6ef, state.atBoat ? 0.55 : 0.3);
    for (let i = 0; i < 10; i += 1) {
      const t = i / 9;
      const rippleX = x - halfWidth + BARGE_PLATFORM_WIDTH * t;
      const rippleW = (18 + (i % 3) * 10) * s;
      const rippleY = waterlineY + (i % 2 === 0 ? 5 : 9) * s;
      this.actors.lineBetween(rippleX - rippleW, rippleY, rippleX + rippleW, rippleY + (i % 2 === 0 ? 1 : -1) * s);
    }
    this.actors.lineStyle(1, 0xb8edf0, state.atBoat ? 0.62 : 0.28);
    this.actors.lineBetween(x - 28 * s, BARGE_DOCK_Y, x + 28 * s, BARGE_DOCK_Y);
    this.actors.lineBetween(x, BARGE_DOCK_Y, x, BARGE_DOCKING_ZONE_Y);
  }

export function drawSpecialRooms(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const room of this.specialRooms) {
      if (room.x + room.rx < view.x || room.x - room.rx > view.right || room.y + room.ry < view.y || room.y - room.ry > view.bottom) continue;
      if (room.kind === 'biolume') {
        const center = specialRoomEffectCenter(room);
        const pulse = 0.58 + Math.sin(performance.now() * 0.0024 + room.x * 0.01) * 0.12;
        this.actors.fillStyle(0x1bcbd8, 0.07 * pulse);
        this.actors.fillEllipse(center.x, center.y, room.rx * 1.82, room.ry * 1.72);
        this.actors.lineStyle(2, 0x73fbd3, 0.18 * pulse);
        this.actors.strokeEllipse(center.x, center.y, room.rx * 1.62, room.ry * 1.45);
        for (let i = 0; i < 9; i += 1) {
          const angle = (i / 9) * Math.PI * 2 + performance.now() * 0.0004;
          const x = center.x + Math.cos(angle) * room.rx * (0.26 + (i % 3) * 0.18);
          const y = center.y + Math.sin(angle) * room.ry * (0.28 + (i % 2) * 0.18);
          this.actors.fillStyle(i % 2 === 0 ? 0x73fbd3 : 0xf48cff, 0.22);
          this.actors.fillCircle(x, y, scaledEntity(3 + (i % 3)));
        }
      } else {
        this.actors.fillStyle(0x2a0710, 0.12);
        this.actors.fillEllipse(room.x, room.y, room.rx * 1.45, room.ry * 1.2);
        this.actors.lineStyle(1, 0xff4f64, room.rewardClaimed ? 0.12 : 0.28);
        this.actors.strokeEllipse(room.x, room.y, room.rx * 1.36, room.ry * 1.08);
      }
    }
  }

export function drawHazards(this: DeepdiveScene, ) {
    const s = ENTITY_SCALE;
    for (const hazard of this.hazards) {
      const pulse = (Math.sin(hazard.phase * 1.8) + 1) * 0.5;
      const frame = Math.floor((hazard.phase * 7) % 4);
      const normalX = hazard.surface?.normalX ?? 0;
      const normalY = hazard.surface?.normalY ?? -1;
      const rotation = Math.atan2(normalY, normalX) + Math.PI / 2;
      const plumeX = hazard.x + normalX * 4 * s;
      const plumeY = hazard.y + normalY * 4 * s;
      hazard.sprite
        ?.setTexture(`vent-steam-${frame}`)
        .setVisible(true)
        .setAlpha(0.62 + pulse * 0.25)
        .setPosition(plumeX, plumeY)
        .setRotation(rotation);
      fitImageHeight(hazard.sprite, hazard.radius * 3.2);
      if (pulse > 0.45) {
        this.actors.lineStyle(1, 0xff8a5c, pulse * 0.32);
        this.actors.strokeEllipse(plumeX, plumeY, hazard.radius * 1.25, hazard.radius * 0.34);
      }
    }
  }

export function drawNestEggs(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const egg of this.nestEggs) {
      if (egg.state === 'destroyed') {
        egg.sprite?.setVisible(false);
        continue;
      }
      if (egg.x < view.x - 80 || egg.x > view.right + 80 || egg.y < view.y - 80 || egg.y > view.bottom + 80) {
        egg.sprite?.setVisible(false);
        continue;
      }
      const frame = egg.state === 'hatched'
        ? 'nest-egg-hatched'
        : egg.state === 'hatching'
          ? 'nest-egg-hatching'
          : `nest-egg-${Math.floor(egg.phase * 1.4) % 4}`;
      const shake = egg.state === 'hatching' ? Math.sin(egg.phase * 42) * scaledEntity(2) : 0;
      const flash = egg.state === 'hatching' ? 0.72 + Math.sin(egg.phase * 24) * 0.24 : 0.92;
      egg.sprite
        ?.setTexture(frame)
        .setVisible(true)
        .setAlpha(flash)
        .setPosition(egg.x + shake, egg.y)
        .setRotation(egg.state === 'hatching' ? Math.sin(egg.phase * 38) * 0.08 : 0);
      fitImageWidth(egg.sprite, egg.radius * 4.2);
      if (egg.state === 'hatching') {
        this.actors.lineStyle(2, 0xff4f64, 0.68);
        this.actors.strokeCircle(egg.x, egg.y - scaledEntity(4), egg.radius + scaledEntity(7 + Math.sin(egg.phase * 18) * 3));
      }
    }
  }

export function drawLarvae(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const larva of this.larvae) {
      if (larva.x < view.x - 60 || larva.x > view.right + 60 || larva.y < view.y - 60 || larva.y > view.bottom + 60) {
        larva.sprite?.setVisible(false);
        continue;
      }
      const frame = Math.floor(larva.phase * 9) % 3;
      larva.sprite
        ?.setTexture(`nest-larva-${frame}`)
        .setVisible(true)
        .setAlpha(larva.latched ? 1 : 0.88)
        .setPosition(larva.x, larva.y)
        .setRotation(Math.atan2(larva.vy, larva.vx));
      fitImageWidth(larva.sprite, larva.radius * (larva.latched ? 7.2 : 6));
      if (larva.latched) {
        this.actors.lineStyle(1, 0xff4f64, 0.45);
        this.actors.strokeCircle(larva.x, larva.y, larva.radius + scaledEntity(4));
      }
    }
  }

export function drawBobbits(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const bobbit of this.bobbits) {
      if (bobbit.x < view.x - 100 || bobbit.x > view.right + 100 || bobbit.y < view.y - 120 || bobbit.y > view.bottom + 120) {
        bobbit.sprite?.setVisible(false);
        continue;
      }
      const frame =
        bobbit.state === 'hidden' ? 0 :
          bobbit.state === 'emerging' ? 1 :
            bobbit.state === 'latched' || bobbit.state === 'lunging' ? 3 :
              0;
      const displayWidth = bobbit.state === 'hidden' || bobbit.state === 'cooldown'
        ? scaledEntity(42)
        : bobbit.state === 'emerging'
          ? scaledEntity(50)
          : scaledEntity(70);
      bobbit.sprite
        ?.setTexture(`bobbit-${frame}`)
        .setVisible(true)
        .setAlpha(bobbit.state === 'cooldown' ? 0.45 : 0.95)
        .setPosition(bobbit.x, bobbit.y)
        .setFlipX(bobbit.facingSign < 0);
      fitImageWidth(bobbit.sprite, displayWidth);
      if (bobbit.state === 'latched') {
        const progress = Phaser.Math.Clamp(bobbit.escapeRemaining / BOBBIT_ESCAPE_SECONDS, 0, 1);
        this.actors.lineStyle(2, 0xff8a6b, 0.72);
        this.actors.strokeCircle(this.player.x, this.player.y, scaledEntity(26 + progress * 14));
      }
    }
  }

export function drawBobbitBurrows(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const burrow of this.bobbitBurrows) {
      if (burrow.x < view.x - 140 || burrow.x > view.right + 140 || burrow.y < view.y - 180 || burrow.y > view.bottom + 280) continue;
      const creature = this.articulatedCreatures.find((candidate) => candidate.bobbitBurrow?.burrowId === burrow.id);
      const runtime = creature?.bobbitBurrow;
      const pulse = runtime && (runtime.phase === 'telegraph' || runtime.phase === 'emerge' || runtime.phase === 'lunge')
        ? 0.5 + Math.sin((creature?.phase ?? 0) * 10) * 0.22
        : 0;
      this.terrainEdges.fillStyle(0x03070d, 0.58);
      this.terrainEdges.fillEllipse(burrow.x, burrow.y + 4, TILE * 3.8, TILE * 1.15);
      this.terrainEdges.lineStyle(2, 0x68584f, 0.58);
      this.terrainEdges.strokeEllipse(burrow.x, burrow.y + 2, TILE * 4.2, TILE * 1.35);
      this.terrainEdges.lineStyle(1, 0xa981ff, 0.18 + pulse * 0.38);
      this.terrainEdges.strokeEllipse(burrow.x, burrow.y - 1, TILE * (4.8 + pulse * 0.9), TILE * (1.75 + pulse * 0.35));
      if (pulse > 0) {
        this.actors.fillStyle(0x7e6b5a, 0.16 + pulse * 0.18);
        for (let i = 0; i < 5; i += 1) {
          const seed = hash(burrow.tileX * 401 + i * 13, burrow.tileY * 409, rng.seed + 17001);
          const angle = -Math.PI + seed * Math.PI;
          const radius = TILE * (1.1 + seed * 2.1 + pulse * 0.8);
          this.actors.fillCircle(
            burrow.x + Math.cos(angle) * radius,
            burrow.y - 4 + Math.sin(angle) * TILE * 0.42,
            2 + seed * 3,
          );
        }
      }
      if (runtime?.phase === 'drag' && runtime.captured) {
        const target = runtime.captured === 'sub' && state.activeSub ? state.activeSub : this.player;
        const progress = Phaser.Math.Clamp(runtime.escapeRemaining / BOBBIT_ESCAPE_SECONDS, 0, 1);
        this.actors.lineStyle(5, 0xff4f64, 0.38);
        this.actors.lineBetween(burrow.x, burrow.y, target.x, target.y);
        this.actors.lineStyle(2, 0xfff7df, 0.5);
        this.actors.lineBetween(target.x, target.y, target.x + (target.x - burrow.x) * 0.42, target.y + (target.y - burrow.y) * 0.42);
        this.actors.fillStyle(0xfff7df, 0.72);
        this.actors.fillTriangle(
          target.x + (target.x - burrow.x) * 0.5,
          target.y + (target.y - burrow.y) * 0.5,
          target.x + (target.x - burrow.x) * 0.39 - 6,
          target.y + (target.y - burrow.y) * 0.39,
          target.x + (target.x - burrow.x) * 0.39 + 6,
          target.y + (target.y - burrow.y) * 0.39,
        );
        this.actors.lineStyle(2, 0xffd166, 0.74);
        this.actors.strokeCircle(target.x, target.y, scaledEntity(26 + progress * 16));
        this.actors.lineStyle(1, 0xfff7df, 0.42);
        this.actors.lineBetween(target.x - 18, target.y, target.x + 18, target.y);
        this.actors.fillStyle(0x05070d, 0.58);
        this.actors.fillRoundedRect(target.x - 78, target.y - scaledEntity(58), 156, 20, 4);
        this.actors.fillStyle(0xfff7df, 0.9);
        this.actors.fillRect(target.x - 68, target.y - scaledEntity(50), 136 * (1 - progress), 4);
      }
    }
  }

export function drawFish(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    for (const fish of this.fish) {
      if (fish.dead) {
        fish.sprite?.setVisible(false);
        continue;
      }
      const alpha = this.fishVisibilityAlpha(fish, camera);
      if (alpha <= 0) {
        fish.sprite?.setVisible(false);
        continue;
      }
      const angle = fish.visualAngle ?? Math.atan2(fish.vy, fish.vx);
      const bodyAlpha = fish.scanned ? Math.max(alpha, 0.9) : alpha;
      const threatDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      const cue = Phaser.Math.Clamp(fish.aggroCue, 0, 1);
      const threat = cue * (1 - Phaser.Math.Clamp((threatDistance - 52) / 168, 0, 0.45));
      const desiredWidth = fish.radius * (fish.hostile ? 3.8 : fish.pattern === 'circle' || fish.pattern === 'glide' ? 3.4 : 3);
      const pose = swimPose(angle, fish.visualFacingSign ?? fish.facingSign);
      const frameSpeed = fish.stunned > 0 ? 8 : Math.hypot(fish.vx, fish.vy);
      const frame = animatedFrame(fish.phase, frameSpeed, fishFrameCount(fish.assetKey), fish.hostile ? 3.3 : 4.2);
      if (fish.sprite) {
        if (spriteManifests[fish.assetKey]) fish.sprite.setTexture(fish.assetKey).setFrame(frame);
        else fish.sprite.setTexture(`${fish.assetKey}-${frame}`);
      }
      fish.sprite
        ?.setVisible(true)
        .setAlpha(fish.stunned > 0 ? bodyAlpha * 0.72 : bodyAlpha)
        .setPosition(fish.x, fish.y)
        .setFlipX(pose.flipX)
        .setRotation(pose.rotation);
      fitImageWidth(fish.sprite, desiredWidth);
      if (fish.hurtFlash > 0) {
        this.actors.lineStyle(2, 0xfff7df, fish.hurtFlash * bodyAlpha);
        this.actors.strokeCircle(fish.x, fish.y, fish.radius + scaledEntity(5));
      }
      if (fish.stunned > 0) {
        const pulse = 0.5 + Math.sin(fish.phase * 9) * 0.18;
        this.actors.lineStyle(2, 0x8ee7f4, bodyAlpha * pulse);
        this.actors.strokeCircle(fish.x, fish.y, fish.radius + scaledEntity(7));
      }
      if (cue > 0) {
        const markerAlpha = cue * alpha;
        const markerY = fish.y - fish.radius - scaledEntity(18) - Math.sin(fish.phase * 4.6) * scaledEntity(1.5);
        this.actors.lineStyle(2, 0xff4f64, markerAlpha * 0.7);
        this.actors.strokeCircle(fish.x, fish.y, fish.radius + scaledEntity(12 + threat * 10));
        this.actors.fillStyle(0xff4f64, markerAlpha);
        this.actors.fillTriangle(fish.x, markerY, fish.x - scaledEntity(6), markerY - scaledEntity(12), fish.x + scaledEntity(6), markerY - scaledEntity(12));
        this.actors.fillRect(fish.x - scaledEntity(2), markerY - scaledEntity(9), scaledEntity(4), scaledEntity(8));
        this.actors.fillCircle(fish.x, markerY + scaledEntity(1), scaledEntity(2));
        if (threat > 0) {
          this.actors.lineStyle(2, 0xff4f64, threat * 0.72);
          this.actors.strokeCircle(fish.x, fish.y, fish.radius + scaledEntity(11 + (1 - cue) * 10));
        }
      }
      if (fish.scan > 0 && !fish.scanned) {
        this.actors.lineStyle(3, 0xb9f27c, 0.35 + fish.scan * 0.5);
        this.actors.beginPath();
        this.actors.arc(fish.x, fish.y, fish.radius + scaledEntity(9), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fish.scan);
        this.actors.strokePath();
      }
      if (fish.scanPulse > 0) {
        this.actors.lineStyle(2, 0xb9f27c, fish.scanPulse * 0.75);
        this.actors.strokeCircle(fish.x, fish.y, fish.radius + scaledEntity(7 + (1 - fish.scanPulse) * 14));
      }
    }
  }

export function drawFlora(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const flora of this.flora) {
      if (flora.dead) {
        flora.sprite?.setVisible(false);
        continue;
      }
      if (flora.x < view.x - 60 || flora.x > view.right + 60 || flora.y < view.y - 60 || flora.y > view.bottom + 60) {
        flora.sprite?.setVisible(false);
        continue;
      }
      const alpha = state.depth < 180 || Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y) < lightRadius() + 120
        ? 0.98
        : flora.scanned ? 0.72 : 0.42;
      const sway = Math.sin(flora.phase * 2.1) * scaledEntity(4);
      const anchor = flora.anchor ?? 'floor';
      const surface = flora.surface;
      const anchorRotation = surface ? Math.atan2(surface.normalY, surface.normalX) + Math.PI / 2 : floraAnchorRotation(anchor);
      const swayX = surface ? surface.tangentX * sway : anchor === 'floor' || anchor === 'ceiling' ? sway : 0;
      const swayY = surface ? surface.tangentY * sway : anchor === 'leftWall' || anchor === 'rightWall' ? sway : 0;
      const origin = floraSpriteOrigin(anchor);
      fitImageHeight(flora.sprite, flora.radius * (flora.rare ? 4.7 : 4));
      flora.sprite
        ?.setTexture(flora.assetKey)
        .setVisible(true)
        .setAlpha(alpha)
        .setPosition(flora.x + swayX, flora.y + swayY)
        .setRotation(anchorRotation + Math.sin(flora.phase * 1.4) * 0.035)
        .setOrigin(origin.x, origin.y);
      if (flora.hurtFlash > 0) {
        this.actors.lineStyle(2, 0xfff7df, flora.hurtFlash * alpha);
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + scaledEntity(5));
      }
      if (flora.aggroCue > 0) {
        const cue = Phaser.Math.Clamp(flora.aggroCue, 0, 1);
        this.actors.lineStyle(2, 0xff4f64, cue * alpha * (flora.rare ? 0.75 : 0.58));
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + scaledEntity(6 + (1 - cue) * 12));
      }
      if (flora.scan > 0 && !flora.scanned) {
        this.actors.lineStyle(3, 0xb9f27c, 0.35 + flora.scan * 0.5);
        this.actors.beginPath();
        this.actors.arc(flora.x, flora.y, flora.radius + scaledEntity(9), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * flora.scan);
        this.actors.strokePath();
      }
      if (flora.scanPulse > 0) {
        this.actors.lineStyle(2, 0xb9f27c, flora.scanPulse * 0.75);
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + scaledEntity(7 + (1 - flora.scanPulse) * 14));
      }
    }
  }

function floraAnchorRotation(anchor: Flora['anchor']) {
    if (anchor === 'ceiling') return Math.PI;
    if (anchor === 'leftWall') return Math.PI / 2;
    if (anchor === 'rightWall') return -Math.PI / 2;
    return 0;
  }

function floraSpriteOrigin(anchor: Flora['anchor']) {
    if (anchor === 'ceiling') return { x: 0.5, y: 0.18 };
    if (anchor === 'leftWall') return { x: 0.78, y: 0.5 };
    if (anchor === 'rightWall') return { x: 0.22, y: 0.5 };
    return { x: 0.5, y: 0.82 };
  }

export function fishVisibilityAlpha(this: DeepdiveScene, fish: Fish, camera: Phaser.Cameras.Scene2D.Camera) {
    const margin = 80;
    const view = camera.worldView;
    const onCamera =
      fish.x > view.x - margin &&
      fish.x < view.right + margin &&
      fish.y > view.y - margin &&
      fish.y < view.bottom + margin;
    if (!onCamera) return fish.scanned ? 0.34 : 0;
    if (state.depth < 180) return fish.scanned ? 1 : 0.96;

    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
    const fullyVisibleAt = lightRadius() * 0.92;
    const goneAt = lightRadius() + 210;
    if (distance <= fullyVisibleAt) return fish.scanned ? 1 : 0.94;
    if (fish.scanned) return 0.7;
    const fade = 1 - Phaser.Math.Clamp((distance - fullyVisibleAt) / (goneAt - fullyVisibleAt), 0, 1);
    return fade * 0.84;
  }

export function drawPlayer(this: DeepdiveScene, ) {
    if (state.pilotingSub && state.activeSub) {
      this.playerSprite.setVisible(false);
      for (const sprite of Object.values(this.diverPartSprites)) sprite.setVisible(false);
      return;
    }
    const p = this.player;
    const angle = p.facing.angle();
    const swimSpeed = Math.hypot(p.vx, p.vy);
    const animation = diverAnimation(p.vx, p.vy, swimSpeed, p.mineCooldown, state.lost);
    for (const sprite of Object.values(this.diverPartSprites)) sprite.setVisible(false);
    this.drawLegacyDiver(animation, angle, swimSpeed);
  }

export function drawLegacyDiver(this: DeepdiveScene, animation: ReturnType<typeof diverAnimation>, angle: number, swimSpeed: number) {
    const p = this.player;
    const time = performance.now() * 0.001;
    const pose = diverPose(animation, angle, p.facingSign);
    const frame = diverFrame(animation, time, swimSpeed, p.mineCooldown);
    const origin = diverOrigin(animation, p.facingSign);
    const width = diverDisplayWidth(animation) * PLAYER_DRAW_SCALE;
    this.playerSprite
      .setTexture(`diver-${animation}-${frame}`)
      .setVisible(true)
      .setPosition(p.x, p.y + (state.lost ? scaledEntity(8) : 0))
      .setOrigin(origin.x, origin.y)
      .setFlipX(pose.flipX)
      .setRotation(state.lost ? pose.rotation + 1.1 * (pose.flipX ? -1 : 1) : pose.rotation)
      .setAlpha(state.lost ? 0.45 : 1)
      .setDepth(2.08);
    fitImageWidth(this.playerSprite, width);
    const danger = this.activeBobbitDrag() || this.articulatedCreatures.some((creature) => !creature.dead && (creature.state === 'lunge' || creature.state === 'grab') && Phaser.Math.Distance.Between(creature.x, creature.y, p.x, p.y) < creature.radius + 180);
    if (danger) {
      const alpha = danger ? 0.74 : 0.46;
      const pulse = Math.sin(time * 9) * 3;
      this.actors.lineStyle(2, 0xffd166, alpha);
      this.actors.strokeCircle(p.x, p.y, scaledEntity(24 + pulse));
      this.actors.lineStyle(1, 0xfff7df, alpha * 0.5);
      this.actors.strokeCircle(p.x, p.y, scaledEntity(31 - pulse * 0.35));
    }
  }

export function drawArticulatedDiver(this: DeepdiveScene, animation: ReturnType<typeof diverAnimation>, angle: number, swimSpeed: number) {
    const p = this.player;
    const time = performance.now() * 0.001;
    const pose = diverPose(animation, angle, p.facingSign);
    const flip = pose.flipX;
    const facing = flip ? -1 : 1;
    const speedBlend = Phaser.Math.Clamp(swimSpeed / Math.max(1, swimTopSpeed()), 0, 1);
    const mineBlend = animation === 'mine' ? Phaser.Math.Clamp(p.mineCooldown / Math.max(0.01, mineCooldown()), 0, 1) : 0;
    const kick = Math.sin(time * Phaser.Math.Linear(2.4, 8.5, Math.max(speedBlend, mineBlend * 0.55)));
    const bob = Math.sin(time * 2.3) * Phaser.Math.Linear(0.7, 2.1, speedBlend);
    const rootRotation = state.lost ? pose.rotation + 1.1 * facing : pose.rotation;
    const scale = PLAYER_DRAW_SCALE * Phaser.Math.Linear(0.176, 0.19, animation === 'boost' ? 1 : speedBlend);
    const alpha = state.lost ? 0.45 : 1;
    const rootOffsetX = animation === 'mine' ? 2 * facing : 0;
    const rootOffsetY = bob + (state.lost ? 8 : 0);

    for (const part of DIVER_ARTICULATED_PART_SPECS) {
      const sprite = this.diverPartSprites[part.id];
      if (!sprite) continue;
      const local = articulatedDiverPartPose(part.role, part.id, animation, kick, speedBlend, mineBlend, facing);
      const localX = (part.offset[0] + local.x) * scale * facing;
      const localY = (part.offset[1] + local.y) * scale;
      const cos = Math.cos(rootRotation);
      const sin = Math.sin(rootRotation);
      const x = p.x + rootOffsetX + localX * cos - localY * sin;
      const y = p.y + rootOffsetY + localX * sin + localY * cos;
      sprite
        .setTexture(part.textureKey)
        .setVisible(true)
        .setPosition(x, y)
        .setOrigin(part.origin[0], part.origin[1])
        .setFlipX(flip)
        .setRotation(rootRotation + local.rotation * facing)
        .setScale(scale)
        .setAlpha(alpha)
        .setDepth(2 + part.depth);
    }
  }

function articulatedDiverPartPose(
  role: (typeof DIVER_ARTICULATED_PART_SPECS)[number]['role'],
  id: string,
  animation: ReturnType<typeof diverAnimation>,
  kick: number,
  speedBlend: number,
  mineBlend: number,
  facing: number,
) {
  let x = 0;
  let y = 0;
  let rotation = 0;
  if (role === 'head') {
    rotation += kick * 0.035 * speedBlend - mineBlend * 0.05;
    x += mineBlend * 10;
  } else if (role === 'pack') {
    y += kick * 2.5 * speedBlend;
    rotation -= kick * 0.035 * speedBlend;
  } else if (role === 'arm' || role === 'tool') {
    const armSwing = animation === 'mine' ? 1 - mineBlend : speedBlend;
    x += mineBlend * 22;
    y += Math.sin(kick) * 2 * speedBlend;
    rotation += (animation === 'mine' ? -0.36 + mineBlend * 0.42 : kick * 0.11) * armSwing;
    if (id === 'forearm') rotation += animation === 'mine' ? 0.22 + mineBlend * 0.38 : kick * 0.08;
    if (id === 'hand' || id === 'tool') {
      x += mineBlend * 8;
      rotation += animation === 'mine' ? 0.16 + mineBlend * 0.32 : 0;
    }
  } else if (role === 'frontLeg') {
    y += kick * 8 * speedBlend;
    x += -kick * 7 * speedBlend;
    rotation += kick * 0.24 * speedBlend;
    if (id.includes('shin')) rotation += kick * 0.18 * speedBlend;
  } else if (role === 'rearLeg') {
    y -= kick * 7 * speedBlend;
    x += kick * 8 * speedBlend;
    rotation -= kick * 0.22 * speedBlend;
    if (id.includes('shin')) rotation -= kick * 0.16 * speedBlend;
  } else if (role === 'body') {
    rotation += kick * 0.025 * speedBlend;
  }
  if (animation === 'idle') {
    rotation *= 0.25;
    x *= 0.2;
    y *= 0.2;
  }
  if (animation === 'die') {
    rotation += 0.55 * facing;
    y += 12;
  }
  return { x, y, rotation };
}

export function drawSub(this: DeepdiveScene, ) {
    const sub = state.activeSub;
    if (!sub || state.lost) {
      this.subSprite?.setVisible(false);
      this.auxSub?.sprite?.setVisible(false);
      hideSubmarinePartSprites(this.subPartSprites);
      hideSubmarinePartSprites(this.carrierSubPartSprites);
      this.cutterBeamSprite?.setVisible(false);
      return;
    }
    const carrier = state.carrierSub;
    if (carrier && this.auxSub?.sprite) {
      const renderedCarrierParts = renderSubmarineParts(this, this.carrierSubPartSprites, carrier, { carrier: true });
      this.auxSub.sprite
        .setTexture(`sub-tier${carrier.tier}`)
        .setVisible(!renderedCarrierParts)
        .setPosition(carrier.x, carrier.y)
        .setFlipX(carrier.facingSign < 0)
        .setRotation(Phaser.Math.Clamp(carrier.vy / Math.max(1, subDef(carrier.tier).speed), -0.28, 0.28) * (carrier.facingSign < 0 ? -1 : 1))
        .setAlpha(0.92);
      if (!renderedCarrierParts) fitImageWidth(this.auxSub.sprite, scaledEntity(118));
    } else {
      this.auxSub?.sprite?.setVisible(false);
      hideSubmarinePartSprites(this.carrierSubPartSprites);
    }
    const def = subDef(sub.tier);
    const speed = Math.hypot(sub.vx, sub.vy);
    const renderedSubParts = renderSubmarineParts(this, this.subPartSprites, sub);
    this.subSprite
      ?.setTexture(`sub-tier${sub.tier}`)
      .setVisible(!renderedSubParts)
      .setPosition(sub.x, sub.y)
      .setFlipX(sub.facingSign < 0)
      .setRotation(Phaser.Math.Clamp(sub.vy / Math.max(1, def.speed), -0.38, 0.38) * (sub.facingSign < 0 ? -1 : 1))
      .setAlpha(sub.hull <= def.hull * 0.18 ? 0.72 + Math.sin(performance.now() * 0.018) * 0.16 : 1);
    if (!renderedSubParts) fitImageWidth(this.subSprite, scaledEntity(sub.tier === 3 ? 118 : sub.tier === 2 ? 92 : 72));
    if (sub.boardProgress > 0) {
      const progress = sub.boardProgress / SUB_BOARD_SECONDS;
      this.actors.lineStyle(3, 0x73fbd3, 0.88);
      this.actors.beginPath();
      this.actors.arc(sub.x, sub.y - scaledEntity(34), scaledEntity(18), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      this.actors.strokePath();
    }
    if (speed > 14) {
      this.actors.fillStyle(0x49d8ff, 0.18);
      this.actors.fillEllipse(sub.x - sub.facingSign * scaledEntity(42), sub.y + scaledEntity(8), scaledEntity(28), scaledEntity(10));
    }
    if (state.pilotingSub && sub.tier >= 2 && this.drillingThisFrame) {
      const frame = Math.floor(performance.now() * 0.018) % 4;
      const reach = scaledEntity(112);
      const offset = scaledEntity(sub.tier === 3 ? 44 : 36);
      this.cutterBeamSprite
        ?.setTexture(`sub-cutter-beam-${frame}`)
        .setVisible(true)
        .setPosition(sub.x + this.player.facing.x * offset, sub.y + this.player.facing.y * offset)
        .setRotation(this.player.facing.angle())
        .setAlpha(0.86);
      if (this.cutterBeamSprite) {
        this.cutterBeamSprite.displayWidth = reach;
        this.cutterBeamSprite.displayHeight = scaledEntity(18);
      }
    } else {
      this.cutterBeamSprite?.setVisible(false);
    }
  }

export function drawDarkness(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const darkness = darknessAtDepth();
    if (darkness <= 0) return;
    const view = camera.worldView;
    const left = view.x;
    const right = view.right;
    const top = view.y;
    const bottom = view.bottom;
    const cx = this.player.x;
    const cy = this.player.y;
    const dir = this.player.facing.clone().normalize();
    const normal = new Phaser.Math.Vector2(-dir.y, dir.x);
    const length = lightBeamLength();
    const nearWidth = 16;
    const farWidth = lightBeamHalfWidth();
    const haloRadius = 23;
    const beam = [
      new Phaser.Math.Vector2(cx + normal.x * nearWidth, cy + normal.y * nearWidth),
      new Phaser.Math.Vector2(cx + dir.x * length + normal.x * farWidth, cy + dir.y * length + normal.y * farWidth),
      new Phaser.Math.Vector2(cx + dir.x * length - normal.x * farWidth, cy + dir.y * length - normal.y * farWidth),
      new Phaser.Math.Vector2(cx - normal.x * nearWidth, cy - normal.y * nearWidth),
    ];

    this.darkness.fillStyle(0x000205, ambientDarknessOpacity(darkness));
    this.darkness.fillRect(left, top, view.width, view.height);

    const occlusion = darknessOpacity(darkness);
    this.darkness.fillStyle(0x000205, occlusion);
    const stripHeight = 4;
    for (let y = top; y < bottom; y += stripHeight) {
      const nextY = Math.min(y + stripHeight, bottom);
      const sampleY = (y + nextY) * 0.5;
      const litIntervals = this.lampIntervalsAtY(sampleY, beam, haloRadius, left, right);
      let cursor = left;
      for (const interval of litIntervals) {
        if (interval.left > cursor) this.darkness.fillRect(cursor, y, interval.left - cursor, nextY - y);
        cursor = Math.max(cursor, interval.right);
      }
      if (cursor < right) this.darkness.fillRect(cursor, y, right - cursor, nextY - y);
    }

    const edgeAlpha = Math.min(0.5, darkness * 0.34);
    this.lampGloom.lineStyle(8, 0x020509, edgeAlpha);
    this.lampGloom.lineBetween(beam[0].x, beam[0].y, beam[1].x, beam[1].y);
    this.lampGloom.lineBetween(beam[3].x, beam[3].y, beam[2].x, beam[2].y);
    this.lampGloom.lineStyle(2, 0x9fb3b8, 0.03 + state.upgrades.lamp * 0.008);
    this.lampGloom.lineBetween(beam[0].x, beam[0].y, beam[1].x, beam[1].y);
    this.lampGloom.lineBetween(beam[3].x, beam[3].y, beam[2].x, beam[2].y);
    this.lampGloom.lineStyle(4, 0x020509, Math.min(0.3, darkness * 0.18));
    this.lampGloom.strokeCircle(cx, cy, haloRadius);
  }

export function drawBiomeVisibilityCues(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const darkness = darknessAtDepth();
    if (darkness <= 0.08 || state.biome < 2) return;
    const view = camera.worldView;
    const palette = terrainAccentPalette();
    const profile = biomeVisibilityProfile();
    const depthFade = Phaser.Math.Clamp((state.depth - 120) / 1280, 0, 1);
    const ambient = Phaser.Math.Clamp(profile.ambientBase + darkness * profile.ambientScale - depthFade * 0.025, 0, profile.ambientMax);
    const cx = this.player.x;
    const cy = this.player.y;
    const radius = lightRadius() + profile.silhouetteReach;
    const startX = Math.max(0, Math.floor((view.x - 12) / TILE));
    const endX = Math.min(WORLD_W - 1, Math.ceil((view.right + 12) / TILE));
    const startY = Math.max(0, Math.floor((view.y - 12) / TILE));
    const endY = Math.min(WORLD_H - 1, Math.ceil((view.bottom + 12) / TILE));
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = this.getTile(x, y);
        if (tile === 'water') continue;
        const exposed =
          this.getTile(x, y - 1) === 'water'
          || this.getTile(x, y + 1) === 'water'
          || this.getTile(x - 1, y) === 'water'
          || this.getTile(x + 1, y) === 'water';
        if (!exposed) continue;
        const wx = x * TILE + TILE * 0.5;
        const wy = y * TILE + TILE * 0.5;
        const distance = Phaser.Math.Distance.Between(cx, cy, wx, wy);
        if (distance > radius) continue;
        const proximity = 1 - Phaser.Math.Clamp((distance - lightRadius() * 0.65) / Math.max(1, radius - lightRadius() * 0.65), 0, 1);
        const alpha = ambient * Phaser.Math.Linear(0.36, 1, proximity);
        const pulse = 0.75 + Math.sin(this.time.now * 0.0016 + x * 0.47 + y * 0.31) * 0.25;
        const sparkleSeed = hash(x * 19, y * 23, rng.seed + state.biome * 1801);
        if (sparkleSeed > profile.accentThreshold) {
          const accentAlpha = profile.accentAlpha * pulse * Phaser.Math.Linear(0.35, 1, proximity);
          this.lampGloom.fillStyle(sparkleSeed > 0.985 ? palette.glow : profile.accent, accentAlpha);
          this.lampGloom.fillCircle(
            wx + (hash(x, y, rng.seed + 1807) - 0.5) * TILE * 0.52,
            wy + (hash(y, x, rng.seed + 1811) - 0.5) * TILE * 0.52,
            Phaser.Math.Linear(1.2, 2.7, sparkleSeed),
          );
        } else if (sparkleSeed > profile.accentThreshold - 0.035 && alpha > 0.018) {
          this.lampGloom.fillStyle(profile.silhouette, alpha * 0.12);
          this.lampGloom.fillCircle(
            wx + (hash(x, y, rng.seed + 1877) - 0.5) * TILE * 0.56,
            wy + (hash(y, x, rng.seed + 1879) - 0.5) * TILE * 0.56,
            Phaser.Math.Linear(0.8, 1.8, sparkleSeed),
          );
        }
      }
    }

    for (const prop of this.environmentProps) {
      if (prop.x < view.x - 80 || prop.x > view.right + 80 || prop.y < view.y - 80 || prop.y > view.bottom + 80) continue;
      const distance = Phaser.Math.Distance.Between(cx, cy, prop.x, prop.y);
      if (distance > radius + 80) continue;
      const seed = hash(Math.round(prop.x), Math.round(prop.y), rng.seed + state.biome * 2111);
      if (seed < 0.72) continue;
      const pulse = 0.55 + Math.sin(this.time.now * 0.0018 + seed * 9) * 0.2;
      this.lampGloom.lineStyle(1, profile.accent, profile.propAlpha * pulse);
      this.lampGloom.strokeEllipse(prop.x, prop.y, Math.min(prop.width * 0.72, 52), Math.min(prop.height * 0.38, 24));
    }
  }

function biomeVisibilityProfile() {
    if (state.biome === 2) {
      return {
        ambientBase: 0.026,
        ambientScale: 0.11,
        ambientMax: 0.13,
        silhouetteReach: 152,
        silhouette: 0x8a6f58,
        accent: 0xff9f52,
        accentAlpha: 0.06,
        accentThreshold: 0.958,
        propAlpha: 0.055,
      };
    }
    if (state.biome === 3) {
      return {
        ambientBase: 0.02,
        ambientScale: 0.095,
        ambientMax: 0.115,
        silhouetteReach: 136,
        silhouette: 0x7668a8,
        accent: 0xa981ff,
        accentAlpha: 0.052,
        accentThreshold: 0.964,
        propAlpha: 0.048,
      };
    }
    return {
      ambientBase: 0.016,
      ambientScale: 0.082,
      ambientMax: 0.098,
      silhouetteReach: 122,
      silhouette: 0x7895b8,
      accent: 0x9ec7ff,
      accentAlpha: 0.044,
      accentThreshold: 0.97,
      propAlpha: 0.041,
    };
  }

export function lampIntervalsAtY(this: DeepdiveScene, 
    sampleY: number,
    beam: Phaser.Math.Vector2[],
    haloRadius: number,
    left: number,
    right: number,
  ): Array<{ left: number; right: number }> {
    const intervals: Array<{ left: number; right: number }> = [];
    const haloDy = sampleY - this.player.y;
    if (Math.abs(haloDy) < haloRadius) {
      const halfWidth = Math.sqrt(haloRadius * haloRadius - haloDy * haloDy);
      intervals.push({
        left: Phaser.Math.Clamp(this.player.x - halfWidth, left, right),
        right: Phaser.Math.Clamp(this.player.x + halfWidth, left, right),
      });
    }

    for (const flare of this.flares) {
      const flareDy = sampleY - flare.y;
      const t = Phaser.Math.Clamp(flare.age / flare.life, 0, 1);
      const radius = FLARE_LIGHT_RADIUS * (1 - Phaser.Math.SmoothStep(t, 0.72, 1));
      if (radius <= 8 || Math.abs(flareDy) >= radius) continue;
      const halfWidth = Math.sqrt(radius * radius - flareDy * flareDy);
      intervals.push({
        left: Phaser.Math.Clamp(flare.x - halfWidth, left, right),
        right: Phaser.Math.Clamp(flare.x + halfWidth, left, right),
      });
    }

    for (const item of this.looseItems) {
      if (item.utility !== 'flare' || item.landed) continue;
      const flareDy = sampleY - item.y;
      const radius = FLARE_LIGHT_RADIUS * 0.62;
      if (Math.abs(flareDy) >= radius) continue;
      const halfWidth = Math.sqrt(radius * radius - flareDy * flareDy);
      intervals.push({
        left: Phaser.Math.Clamp(item.x - halfWidth, left, right),
        right: Phaser.Math.Clamp(item.x + halfWidth, left, right),
      });
    }

    for (const room of this.specialRooms) {
      if (room.kind !== 'biolume') continue;
      const center = specialRoomEffectCenter(room);
      const dy = (sampleY - center.y) / room.ry;
      if (Math.abs(dy) >= 1) continue;
      const halfWidth = room.rx * Math.sqrt(1 - dy * dy) * 1.04;
      intervals.push({
        left: Phaser.Math.Clamp(center.x - halfWidth, left, right),
        right: Phaser.Math.Clamp(center.x + halfWidth, left, right),
      });
    }

    const intersections: number[] = [];
    for (let i = 0; i < beam.length; i += 1) {
      const a = beam[i];
      const b = beam[(i + 1) % beam.length];
      if (a.y === b.y) continue;
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      if (sampleY < minY || sampleY >= maxY) continue;
      const t = (sampleY - a.y) / (b.y - a.y);
      intersections.push(Phaser.Math.Linear(a.x, b.x, t));
    }

    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length - 1; i += 2) {
      const intervalLeft = Phaser.Math.Clamp(intersections[i], left, right);
      const intervalRight = Phaser.Math.Clamp(intersections[i + 1], left, right);
      if (intervalRight > intervalLeft) intervals.push({ left: intervalLeft, right: intervalRight });
    }

    intervals.sort((a, b) => a.left - b.left);
    const merged: Array<{ left: number; right: number }> = [];
    for (const interval of intervals) {
      const previous = merged[merged.length - 1];
      if (previous && interval.left <= previous.right) {
        previous.right = Math.max(previous.right, interval.right);
      } else {
        merged.push(interval);
      }
    }
    return merged;
  }

export function drawSonarPings(this: DeepdiveScene, ) {
    for (const ping of this.sonarPings) {
      const t = Phaser.Math.Clamp(ping.age / ping.life, 0, 1);
      const alpha = 1 - t;
      this.actors.lineStyle(2, 0x73fbd3, alpha * 0.72);
      this.actors.strokeCircle(ping.x, ping.y, Phaser.Math.Linear(16, SONAR_REVEAL_RADIUS_TILES * TILE, t));
      this.actors.lineStyle(1, 0x8ee7f4, alpha * 0.28);
      this.actors.strokeCircle(ping.x, ping.y, Phaser.Math.Linear(8, SONAR_ATTRACT_RADIUS, t));
    }
  }

export function drawFlares(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const flare of this.flares) {
      if (flare.x < view.x - FLARE_LIGHT_RADIUS || flare.x > view.right + FLARE_LIGHT_RADIUS || flare.y < view.y - FLARE_LIGHT_RADIUS || flare.y > view.bottom + FLARE_LIGHT_RADIUS) continue;
      const t = Phaser.Math.Clamp(flare.age / flare.life, 0, 1);
      const alpha = (1 - Phaser.Math.SmoothStep(t, 0.72, 1)) * 0.9;
      const pulse = 1 + Math.sin(flare.age * 11) * 0.05;
      this.actors.fillStyle(0xff8a5c, alpha * 0.18);
      this.actors.fillCircle(flare.x, flare.y, FLARE_LIGHT_RADIUS * pulse);
      this.actors.fillStyle(0xffd166, alpha * 0.72);
      this.actors.fillCircle(flare.x, flare.y, 4);
      this.actors.lineStyle(1, 0xffd166, alpha * 0.48);
      this.actors.strokeCircle(flare.x, flare.y, 8 + Math.sin(flare.age * 8) * 2);
    }
  }

export function drawSonarMap(this: DeepdiveScene, ) {
    const canvas = document.querySelector<HTMLCanvasElement>('#sonar-map');
    if (!this.world.length) return;
    drawBigSonarMap.call(this);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 224;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#01070d';
    ctx.fillRect(0, 0, size, size);
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(15, 75, 94, 0.22)');
    gradient.addColorStop(0.62, 'rgba(4, 28, 42, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.64)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const centerX = Math.floor(this.player.x / TILE);
    const centerY = Math.floor(this.player.y / TILE);
    const viewRadius = 26;
    const cell = size / (viewRadius * 2 + 1);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    for (let y = centerY - viewRadius; y <= centerY + viewRadius; y += 1) {
      for (let x = centerX - viewRadius; x <= centerX + viewRadius; x += 1) {
        if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) continue;
        if (!state.sonarRevealed.has(sonarKey(x, y))) continue;
        const tile = this.getTile(x, y);
        const px = Math.floor((x - centerX + viewRadius) * cell);
        const py = Math.floor((y - centerY + viewRadius) * cell);
        const drawSize = Math.max(2, Math.ceil(cell) + 1);
        const solid = tiles[tile].solid;
        if (!solid) {
          ctx.fillStyle = 'rgba(12, 88, 111, 0.42)';
          ctx.fillRect(px, py, drawSize, drawSize);
          continue;
        }
        const north = y <= 0 || !tiles[this.getTile(x, y - 1)].solid;
        const south = y >= WORLD_H - 1 || !tiles[this.getTile(x, y + 1)].solid;
        const west = x <= 0 || !tiles[this.getTile(x - 1, y)].solid;
        const east = x >= WORLD_W - 1 || !tiles[this.getTile(x + 1, y)].solid;
        const isEdge = north || south || west || east;
        if (isEdge) {
          ctx.fillStyle = sonarTileColor(tile, true);
          ctx.fillRect(px, py, drawSize, drawSize);
        } else if (tile === 'stone' || tile === 'sand' || tile === 'bedrock' || tile === 'anchorstone') {
          ctx.fillStyle = sonarTileColor(tile, false);
          ctx.fillRect(px, py, drawSize, drawSize);
        } else if (tiles[tile].value > 0 || isArtifactTile(tile)) {
          ctx.fillStyle = sonarTileColor(tile, false);
          ctx.fillRect(px, py, drawSize, drawSize);
        }
      }
    }
    for (const ping of this.sonarPings) {
      const t = Phaser.Math.Clamp(ping.age / ping.life, 0, 1);
      const radius = Phaser.Math.Linear(8, (SONAR_REVEAL_RADIUS_TILES / viewRadius) * (size / 2), t);
      ctx.strokeStyle = `rgba(115, 251, 211, ${0.72 * (1 - t)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const contact of state.sonarContacts) {
      const tx = Math.floor(contact.x / TILE);
      const ty = Math.floor(contact.y / TILE);
      if (tx < centerX - viewRadius || tx > centerX + viewRadius || ty < centerY - viewRadius || ty > centerY + viewRadius) continue;
      const px = (tx - centerX + viewRadius + 0.5) * cell;
      const py = (ty - centerY + viewRadius + 0.5) * cell;
      const alpha = Phaser.Math.Clamp(1 - contact.age / 14, 0.22, 1);
      if (contact.kind === 'barge') {
        const width = Math.max(22, cell * 10);
        const height = Math.max(5, cell * 2.2);
        ctx.fillStyle = `rgba(242, 211, 155, ${alpha * 0.9})`;
        ctx.fillRect(px - width * 0.5, py - height * 0.5, width, height);
        ctx.strokeStyle = `rgba(142, 231, 244, ${alpha * 0.72})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px - width * 0.5, py - height * 0.5, width, height);
        ctx.beginPath();
        ctx.moveTo(px - width * 0.18, py - height * 0.5);
        ctx.lineTo(px, py - height * 1.9);
        ctx.lineTo(px + width * 0.18, py - height * 0.5);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = contact.hostile
        ? `rgba(255, 79, 100, ${alpha})`
        : contact.kind === 'flora'
          ? `rgba(115, 251, 211, ${alpha * 0.82})`
          : `rgba(142, 231, 244, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, contact.kind === 'predator' ? 6.8 : contact.hostile ? 4.7 : 3.4, 0, Math.PI * 2);
      ctx.fill();
      if (contact.hostile) {
        ctx.strokeStyle = `rgba(255, 79, 100, ${alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, contact.kind === 'predator' ? 11.5 : 7.4, 0, Math.PI * 2);
        ctx.stroke();
        if (contact.kind === 'predator') {
          ctx.strokeStyle = `rgba(255, 209, 102, ${alpha * 0.52})`;
          ctx.beginPath();
          ctx.arc(px, py, 15.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    const nestRoom = this.hasActiveNestLocator() ? this.nearestOpenNestRoom() : null;
    if (nestRoom) {
      const dx = nestRoom.x - this.player.x;
      const dy = nestRoom.y - this.player.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      const rawX = size / 2 + (dx / TILE) * cell;
      const rawY = size / 2 + (dy / TILE) * cell;
      const edgeRadius = size * 0.42;
      const markerX = Phaser.Math.Clamp(rawX, size / 2 - edgeRadius, size / 2 + edgeRadius);
      const markerY = Phaser.Math.Clamp(rawY, size / 2 - edgeRadius, size / 2 + edgeRadius);
      const onMap = Math.abs(dx / TILE) <= viewRadius && Math.abs(dy / TILE) <= viewRadius;
      const px = onMap ? rawX : size / 2 + Math.cos(angle) * edgeRadius;
      const py = onMap ? rawY : size / 2 + Math.sin(angle) * edgeRadius;
      ctx.save();
      ctx.translate(onMap ? markerX : px, onMap ? markerY : py);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(255, 209, 102, 0.94)';
      ctx.strokeStyle = 'rgba(255, 79, 100, 0.72)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(255, 209, 102, 0.82)';
      ctx.font = '700 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(distance / 6)}m`, size / 2, size - 12);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(115, 251, 211, 0.28)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, (size / 2) * (i / 4), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(142, 231, 244, 0.62)';
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    ctx.fillStyle = '#fff7df';
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2 - 6);
    ctx.lineTo(size / 2 + 5, size / 2 + 5);
    ctx.lineTo(size / 2 - 5, size / 2 + 5);
    ctx.closePath();
    ctx.fill();
  }

function drawBigSonarMap(this: DeepdiveScene) {
    const canvas = document.querySelector<HTMLCanvasElement>('#big-sonar-map');
    if (!canvas || !this.world.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(640, Math.round(rect.width || 960));
    const height = Math.max(360, Math.round(rect.height || 560));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#01070d';
    ctx.fillRect(0, 0, width, height);
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.46, 20, width * 0.5, height * 0.5, Math.max(width, height) * 0.58);
    gradient.addColorStop(0, 'rgba(20, 84, 101, 0.2)');
    gradient.addColorStop(0.68, 'rgba(3, 24, 36, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.78)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const zoom = Phaser.Math.Clamp(state.sonarMapZoom || 1, 0.62, 2.6);
    const worldAspect = WORLD_W / WORLD_H;
    const canvasAspect = width / height;
    const baseCell = canvasAspect > worldAspect ? height / WORLD_H : width / WORLD_W;
    const cell = baseCell * zoom;
    const centerTileX = Phaser.Math.Clamp(this.player.x / TILE + state.sonarMapPanX, 0, WORLD_W);
    const centerTileY = Phaser.Math.Clamp(this.player.y / TILE + state.sonarMapPanY, 0, WORLD_H);
    const originX = width * 0.5 - centerTileX * cell;
    const originY = height * 0.5 - centerTileY * cell;
    const minX = Math.max(0, Math.floor(-originX / cell) - 2);
    const maxX = Math.min(WORLD_W - 1, Math.ceil((width - originX) / cell) + 2);
    const minY = Math.max(0, Math.floor(-originY / cell) - 2);
    const maxY = Math.min(WORLD_H - 1, Math.ceil((height - originY) / cell) + 2);
    const drawSize = Math.max(1, Math.ceil(cell) + 1);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    ctx.fillStyle = 'rgba(115, 251, 211, 0.06)';
    for (let x = 0; x <= WORLD_W; x += 20) {
      const px = originX + x * cell;
      if (px < -1 || px > width + 1) continue;
      ctx.fillRect(px, 0, 1, height);
    }
    for (let y = 0; y <= WORLD_H; y += 20) {
      const py = originY + y * cell;
      if (py < -1 || py > height + 1) continue;
      ctx.fillRect(0, py, width, 1);
    }

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (!state.sonarRevealed.has(sonarKey(x, y))) continue;
        const tile = this.getTile(x, y);
        const px = Math.floor(originX + x * cell);
        const py = Math.floor(originY + y * cell);
        const solid = tiles[tile].solid;
        if (!solid) {
          ctx.fillStyle = 'rgba(12, 88, 111, 0.46)';
          ctx.fillRect(px, py, drawSize, drawSize);
          continue;
        }
        const north = y <= 0 || !tiles[this.getTile(x, y - 1)].solid;
        const south = y >= WORLD_H - 1 || !tiles[this.getTile(x, y + 1)].solid;
        const west = x <= 0 || !tiles[this.getTile(x - 1, y)].solid;
        const east = x >= WORLD_W - 1 || !tiles[this.getTile(x + 1, y)].solid;
        const edge = north || south || west || east;
        if (edge || tile === 'stone' || tile === 'sand' || tile === 'bedrock' || tile === 'anchorstone' || tiles[tile].value > 0 || isArtifactTile(tile)) {
          ctx.fillStyle = sonarTileColor(tile, edge);
          ctx.fillRect(px, py, drawSize, drawSize);
        }
      }
    }

    const drawContact = (x: number, y: number, color: string, radius: number, stroke = '') => {
      const px = originX + (x / TILE) * cell;
      const py = originY + (y / TILE) * cell;
      if (px < -20 || px > width + 20 || py < -20 || py > height + 20) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    const bargeX = WORLD_W * TILE * 0.5;
    const bargeY = BARGE_DOCK_Y;
    if (state.sonarRevealed.has(sonarKey(Math.floor(bargeX / TILE), Math.floor(bargeY / TILE)))) {
      const px = originX + (bargeX / TILE) * cell;
      const py = originY + (bargeY / TILE) * cell;
      const bw = Math.max(32, cell * 14);
      const bh = Math.max(7, cell * 2.6);
      ctx.fillStyle = 'rgba(242, 211, 155, 0.9)';
      ctx.fillRect(px - bw * 0.5, py - bh * 0.5, bw, bh);
      ctx.strokeStyle = 'rgba(142, 231, 244, 0.78)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px - bw * 0.5, py - bh * 0.5, bw, bh);
    }

    for (const contact of state.sonarContacts) {
      const tx = Math.floor(contact.x / TILE);
      const ty = Math.floor(contact.y / TILE);
      if (!state.sonarRevealed.has(sonarKey(tx, ty))) continue;
      const alpha = Phaser.Math.Clamp(1 - contact.age / 14, 0.22, 1);
      const color = contact.hostile
        ? `rgba(255, 79, 100, ${alpha})`
        : contact.kind === 'flora'
          ? `rgba(115, 251, 211, ${alpha * 0.85})`
          : `rgba(142, 231, 244, ${alpha})`;
      drawContact(contact.x, contact.y, color, contact.kind === 'predator' ? 6.8 : 4.2, contact.hostile ? `rgba(255, 209, 102, ${alpha * 0.45})` : '');
    }

    const playerX = originX + (this.player.x / TILE) * cell;
    const playerY = originY + (this.player.y / TILE) * cell;
    ctx.save();
    ctx.translate(playerX, playerY);
    ctx.rotate(this.player.facing.angle() + Math.PI / 2);
    ctx.fillStyle = '#fff7df';
    ctx.strokeStyle = 'rgba(115, 251, 211, 0.92)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 5);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(115, 251, 211, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    ctx.restore();
  }

export function drawLooseItems(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const item of this.looseItems) {
      if (item.x < view.x - 40 || item.x > view.right + 40 || item.y < view.y - 40 || item.y > view.bottom + 40) continue;
      if (item.utility) {
        const flash = item.utility === 'dynamite' && item.landed ? 0.65 + Math.sin(this.time.now * 0.045) * 0.25 : 0.9;
        if (item.utility === 'flare' && !item.landed) {
          this.actors.fillStyle(0xff8a5c, 0.1);
          this.actors.fillCircle(item.x, item.y, FLARE_LIGHT_RADIUS * 0.62);
        }
        this.actors.fillStyle(item.color, flash);
        this.actors.fillCircle(item.x, item.y, item.radius + (item.landed ? 0.8 : 0));
        this.actors.lineStyle(1, item.utility === 'flare' ? 0xffd166 : 0xfff7df, 0.62);
        this.actors.strokeCircle(item.x, item.y, item.radius + 2);
        if (item.utility === 'flare') {
          this.actors.lineStyle(1, 0xffd166, 0.22);
          this.actors.strokeCircle(item.x, item.y, item.radius + 6 + Math.sin(this.time.now * 0.012) * 1.5);
        }
        continue;
      }
      const alpha = item.value > 0 ? 0.95 : Phaser.Math.Clamp(item.life / 4, 0, 0.46);
      this.actors.fillStyle(item.color, alpha);
      this.actors.fillCircle(item.x, item.y, item.radius);
      if (item.value > 0) {
        this.actors.lineStyle(1, 0xfff7df, 0.55);
        this.actors.strokeCircle(item.x, item.y, item.radius + 2);
      }
    }
  }
