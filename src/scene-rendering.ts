import Phaser from 'phaser';
import type { Fish,Flora,Tile } from './types';
import { BARGE_DOCKING_ZONE_Y,BARGE_DOCK_Y,BARGE_DRAW_SCALE,BARGE_PLATFORM_HEIGHT,BARGE_PLATFORM_WIDTH,BOBBIT_ESCAPE_SECONDS,ENTITY_SCALE,FLARE_LIGHT_RADIUS,PLAYER_DRAW_SCALE,SONAR_ATTRACT_RADIUS,SONAR_REVEAL_RADIUS_TILES,SUB_BOARD_SECONDS,SURFACE_Y,TILE,WORLD_H,WORLD_W } from './constants';
import { tiles,upgrades } from './content';
import { state,ui } from './state';
import { rng } from './rng';
import { ambientDarknessOpacity,animatedFrame,darknessAtDepth,darknessOpacity,depthColor,diverAnimation,diverPose,fishFrameCount,fitImageHeight,fitImageWidth,hash,isArtifactTile,isOreTile,lightBeamHalfWidth,lightBeamLength,lightRadius,mineCooldown,parallaxAlphas,parallaxPrefix,parallaxSpeeds,scaledEntity,sonarKey,sonarTileColor,spriteManifests,subDef,swimPose,swimTopSpeed } from './helpers';
import type { DeepdiveScene } from './scene';
import { DIVER_ARTICULATED_PART_SPECS } from './diver-articulated';

export function draw(this: DeepdiveScene, ) {
    const camera = this.cameras.main;
    this.articulatedBridges.clear();
    this.actors.clear();
    this.darkness.clear();
    this.lampGloom.clear();
    this.overlay.clear();
    camera.setBackgroundColor(depthColor(state.depth));
	    this.drawParallax(camera);
	    this.drawWorld(camera);
	    this.drawEnvironmentProps(camera);
	    this.drawTerrainBreakEffects(camera);
	    this.drawSpecialRooms(camera);
    this.drawBoat();
    this.drawLooseItems(camera);
    this.drawHazards();
    this.drawBobbits(camera);
    this.drawNestEggs(camera);
    this.drawLarvae(camera);
    this.drawFlora(camera);
    this.drawFish(camera);
    this.drawArticulatedCreatures(camera);
    this.drawSub();
    this.drawPlayer();
    this.drawFlares(camera);
    this.drawSonarPings();
    this.drawDarkness(camera);
    this.drawGameOver(camera);
  }

export function drawParallax(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    const prefix = parallaxPrefix();
    const speeds = parallaxSpeeds();
    const alphas = parallaxAlphas();
    const padding = 24;
    for (let i = 0; i < this.parallaxLayers.length; i += 1) {
      const layer = this.parallaxLayers[i];
      const key = `${prefix}-${i}`;
      if (layer.texture.key !== key) layer.setTexture(key);
      const source = this.textures.get(key).getSourceImage();
      const sourceWidth = Math.max(1, source.width);
      const sourceHeight = Math.max(1, source.height);
      const coverScale = Math.max((view.width + padding * 2) / sourceWidth, (view.height + padding * 2) / sourceHeight, 1);
      layer
        .setPosition(view.x - padding, view.y - padding)
        .setSize(view.width + padding * 2, view.height + padding * 2)
        .setAlpha(alphas[i]);
      layer.tilePositionX = camera.scrollX * speeds[i];
      layer.tilePositionY = camera.scrollY * (0.06 + i * 0.02);
      layer.tileScaleX = coverScale;
      layer.tileScaleY = coverScale;
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

    drawTerrainRuns(this, startX, endX, startY, endY);
    drawVisualMaskSmoothing(this, startX, endX, startY, endY);
    let terrainBrushIndex = drawTerrainFillPlates(this, startX, endX, startY, endY, 0);
    terrainBrushIndex = drawTerrainBrushLayer(this, startX, endX, startY, endY, terrainBrushIndex);
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = this.getTile(x, y);
        if (tile === 'water') {
          if (hash(x, y, rng.seed) > 0.985) {
            this.terrainEdges.lineStyle(1, 0x84dce6, 0.22);
            this.terrainEdges.strokeCircle(x * TILE + 8, y * TILE + 8, 2 + hash(y, x, rng.seed) * 4);
          }
          continue;
        }
        const def = tiles[tile];
        const wx = x * TILE;
        const wy = y * TILE;
        const fracture = this.damage[y][x] / def.hp;
        const exposed = exposedToWater(this, x, y);
        drawTerrainDetail(this, x, y, tile, fracture);
        if (exposed) drawTerrainContour(this, x, y, tile);
        if (isOreTile(tile)) {
          drawEmbeddedOre(this, x, y, tile, exposed);
          if (exposed) terrainBrushIndex = drawOreBrush(this, x, y, tile, terrainBrushIndex);
        }
        if (tile === 'anchorstone') {
          this.terrainEdges.lineStyle(1, 0xb9c2d0, 0.18);
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
	    for (let i = terrainBrushIndex; i < this.terrainBrushSprites.length; i += 1) {
	      this.terrainBrushSprites[i].setVisible(false);
	    }
	  }

export function drawTerrainBreakEffects(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const effect of this.terrainBreakEffects) {
      if (effect.x < view.x - 60 || effect.x > view.right + 60 || effect.y < view.y - 60 || effect.y > view.bottom + 60) continue;
      const t = Phaser.Math.Clamp(effect.age / effect.life, 0, 1);
      const alpha = (1 - t) * 0.72;
      const radius = TILE * (0.44 + t * 0.72);
      this.actors.fillStyle(effect.color, alpha * 0.16);
      this.actors.fillCircle(effect.x, effect.y, radius);
      this.actors.lineStyle(2, 0xd7f6f0, alpha * 0.42);
      this.actors.strokeCircle(effect.x, effect.y, radius * 0.92);
      for (let i = 0; i < 7; i += 1) {
        const angle = effect.seed * Math.PI * 2 + i * 1.63;
        const travel = TILE * (0.18 + t * (0.64 + (i % 3) * 0.13));
        const chipX = effect.x + Math.cos(angle) * travel;
        const chipY = effect.y + Math.sin(angle) * travel;
        this.actors.fillStyle(i % 3 === 0 ? 0xe4f3ee : effect.color, alpha * 0.56);
        this.actors.fillCircle(chipX, chipY, 1.6 + (i % 2) * 0.7);
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
        .setDisplaySize(prop.width, prop.height)
        .setRotation(prop.rotation)
        .setAlpha(prop.alpha)
        .setDepth(prop.depth)
        .setFlipX(Boolean(prop.flipX));
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

function drawTerrainRuns(scene: DeepdiveScene, startX: number, endX: number, startY: number, endY: number) {
    for (let y = startY; y <= endY; y += 1) {
      let runStart = -1;
      let runColor = 0;
      for (let x = startX; x <= endX + 1; x += 1) {
        const tile = x <= endX ? scene.getTile(x, y) : 'water';
        const solid = tile !== 'water';
        const color = solid ? terrainBodyColor(tile, y) : -1;
        if (solid && runStart < 0) {
          runStart = x;
          runColor = color;
          continue;
        }
        if (solid && color === runColor) continue;
        if (runStart >= 0) {
          scene.terrain.fillStyle(runColor, 1);
          scene.terrain.fillRect(runStart * TILE, y * TILE, (x - runStart) * TILE, TILE);
        }
        runStart = solid ? x : -1;
        runColor = color;
      }
    }
  }

function drawVisualMaskSmoothing(scene: DeepdiveScene, startX: number, endX: number, startY: number, endY: number) {
    const water = terrainWaterColor();
    scene.terrain.fillStyle(water, 0.92);
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        if (scene.getTile(x, y) !== 'water') continue;
        const wx = x * TILE;
        const wy = y * TILE;
        const north = scene.getTile(x, y - 1) !== 'water';
        const south = scene.getTile(x, y + 1) !== 'water';
        const west = scene.getTile(x - 1, y) !== 'water';
        const east = scene.getTile(x + 1, y) !== 'water';
        if (north && west) scene.terrain.fillCircle(wx, wy, 9);
        if (north && east) scene.terrain.fillCircle(wx + TILE, wy, 9);
        if (south && west) scene.terrain.fillCircle(wx, wy + TILE, 9);
        if (south && east) scene.terrain.fillCircle(wx + TILE, wy + TILE, 9);
        if (north) scene.terrain.fillEllipse(wx + TILE * 0.5, wy, TILE * 0.7, 5);
        if (south) scene.terrain.fillEllipse(wx + TILE * 0.5, wy + TILE, TILE * 0.7, 5);
        if (west) scene.terrain.fillEllipse(wx, wy + TILE * 0.5, 5, TILE * 0.7);
        if (east) scene.terrain.fillEllipse(wx + TILE, wy + TILE * 0.5, 5, TILE * 0.7);
      }
    }
  }

function terrainWaterColor() {
    if (state.biome === 4) return state.depth < 440 ? 0x12242b : state.depth < 1120 ? 0x101923 : 0x06070d;
    if (state.biome === 3) return state.depth < 440 ? 0x161d32 : state.depth < 1120 ? 0x111424 : 0x090913;
    if (state.biome === 2) return state.depth < 440 ? 0x18313a : state.depth < 1120 ? 0x171f2b : 0x110f18;
    return state.depth < 440 ? 0x0b3741 : state.depth < 1040 ? 0x092430 : 0x06111d;
  }

function drawTerrainBrushLayer(scene: DeepdiveScene, startX: number, endX: number, startY: number, endY: number, spriteIndex: number) {
    let index = spriteIndex;
    const segmentStartX = Math.floor((startX - 4) / 3) * 3;
    const segmentEndX = Math.ceil((endX + 4) / 3) * 3;
    const segmentStartY = Math.floor((startY - 4) / 3) * 3;
    const segmentEndY = Math.ceil((endY + 4) / 3) * 3;
    for (let y = startY - 1; y <= endY + 1; y += 1) {
      for (let sx = segmentStartX; sx <= segmentEndX; sx += 3) {
        if (horizontalSegmentExposed(scene, sx, y, true)) index = stampLedgeSegment(scene, sx, y, true, index);
        if (horizontalSegmentExposed(scene, sx, y, false)) index = stampLedgeSegment(scene, sx, y, false, index);
      }
    }
    for (let x = startX - 1; x <= endX + 1; x += 1) {
      for (let sy = segmentStartY; sy <= segmentEndY; sy += 3) {
        if (verticalSegmentExposed(scene, x, sy, true)) index = stampWallSegment(scene, x, sy, true, index);
        if (verticalSegmentExposed(scene, x, sy, false)) index = stampWallSegment(scene, x, sy, false, index);
      }
    }
    return index;
  }

function drawTerrainFillPlates(scene: DeepdiveScene, startX: number, endX: number, startY: number, endY: number, spriteIndex: number) {
    let index = spriteIndex;
    const chunk = 8;
    const chunkStartX = Math.floor((startX - 2) / chunk) * chunk;
    const chunkEndX = Math.ceil((endX + 2) / chunk) * chunk;
    const chunkStartY = Math.floor((startY - 2) / chunk) * chunk;
    const chunkEndY = Math.ceil((endY + 2) / chunk) * chunk;
    for (let cy = chunkStartY; cy <= chunkEndY; cy += chunk) {
      for (let cx = chunkStartX; cx <= chunkEndX; cx += chunk) {
        const score = solidChunkScore(scene, cx, cy, chunk);
        if (score.solidRatio < 0.78 || score.edgeRatio > 0.22) continue;
        const variant = Math.floor(hash(cx * 23, cy * 29, rng.seed) * 4) % 4;
        const key = `terrain-brush-fill-${variant}`;
        const sprite = scene.terrainBrushSpriteAt(index, key);
        const width = chunk * TILE * (1.08 + hash(cx, cy, rng.seed + 501) * 0.16);
        const height = chunk * TILE * (0.96 + hash(cy, cx, rng.seed + 503) * 0.16);
        sprite
          .setTexture(key)
          .setVisible(true)
          .setPosition((cx + chunk * 0.5) * TILE, (cy + chunk * 0.5) * TILE)
          .setOrigin(0.5)
          .setDisplaySize(width, height)
          .setFlipX(hash(cx, cy, rng.seed + 505) > 0.5)
          .setFlipY(hash(cy, cx, rng.seed + 507) > 0.5)
          .setAlpha(0.2)
          .setDepth(0.35);
        index += 1;
      }
    }
    return index;
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
    for (let x = sx; x < sx + 3; x += 1) {
      const tile = scene.getTile(x, y);
      if (tile === 'water') continue;
      if ((north ? scene.getTile(x, y - 1) : scene.getTile(x, y + 1)) === 'water') exposed += 1;
    }
    return exposed >= 2;
  }

function verticalSegmentExposed(scene: DeepdiveScene, x: number, sy: number, west: boolean) {
    let exposed = 0;
    for (let y = sy; y < sy + 3; y += 1) {
      const tile = scene.getTile(x, y);
      if (tile === 'water') continue;
      if ((west ? scene.getTile(x - 1, y) : scene.getTile(x + 1, y)) === 'water') exposed += 1;
    }
    return exposed >= 2;
  }

function stampLedgeSegment(scene: DeepdiveScene, sx: number, y: number, north: boolean, spriteIndex: number) {
    const variant = Math.floor(hash(sx * 11, y * 13 + (north ? 0 : 101), rng.seed) * 4) % 4;
    const sprite = scene.terrainBrushSpriteAt(spriteIndex, `terrain-brush-ledge-${variant}`);
    const width = 108 + hash(sx, y, rng.seed + 401) * 18;
    const height = 44 + hash(y, sx, rng.seed + 403) * 12;
    const x = (sx + 1.5) * TILE + (hash(sx * 5, y * 7, rng.seed + 405) - 0.5) * 10;
    const yPos = north ? y * TILE + 4 : (y + 1) * TILE - 4;
    sprite
      .setTexture(`terrain-brush-ledge-${variant}`)
      .setVisible(true)
      .setPosition(x, yPos)
      .setOrigin(0.5, north ? 0.2 : 0.8)
      .setDisplaySize(width, height)
      .setFlipX(hash(sx, y, rng.seed + 101) > 0.5)
      .setFlipY(!north)
      .setAlpha(0.86)
      .setDepth(0.78);
    return spriteIndex + 1;
  }

function stampWallSegment(scene: DeepdiveScene, x: number, sy: number, west: boolean, spriteIndex: number) {
    const variant = Math.floor(hash(x * 17, sy * 19 + (west ? 0 : 103), rng.seed) * 4) % 4;
    const sprite = scene.terrainBrushSpriteAt(spriteIndex, `terrain-brush-wall-${variant}`);
    const height = 104 + hash(x, sy, rng.seed + 411) * 20;
    const width = 52 + hash(sy, x, rng.seed + 413) * 14;
    const xPos = west ? x * TILE + 3 : (x + 1) * TILE - 3;
    const y = (sy + 1.5) * TILE + (hash(x * 7, sy * 5, rng.seed + 415) - 0.5) * 10;
    sprite
      .setTexture(`terrain-brush-wall-${variant}`)
      .setVisible(true)
      .setPosition(xPos, y)
      .setOrigin(west ? 0.24 : 0.76, 0.5)
      .setDisplaySize(width, height)
      .setFlipX(!west)
      .setFlipY(hash(x, sy, rng.seed + 103) > 0.5)
      .setAlpha(0.76)
      .setDepth(0.77);
    return spriteIndex + 1;
  }

function drawTerrainDetail(scene: DeepdiveScene, x: number, y: number, tile: Tile, fracture: number) {
    const wx = x * TILE;
    const wy = y * TILE;
    const patch = hash(Math.floor(x / 3) * 17, Math.floor(y / 3) * 19, rng.seed);
    const fleck = hash(x * 29, y * 31, rng.seed);
    if (fleck > 0.42) {
      const tone = patch > 0.6 ? 0x314650 : 0x0b1820;
      const alpha = patch > 0.6 ? 0.05 : 0.08;
      const px = wx + 3 + hash(x, y, rng.seed + 3) * 16;
      const py = wy + 3 + hash(y, x, rng.seed + 5) * 16;
      scene.terrain.fillStyle(tone, alpha);
      scene.terrain.fillRect(Math.floor(px), Math.floor(py), fleck > 0.78 ? 8 : 4, fleck > 0.82 ? 2 : 3);
    }
    if (fracture > 0) {
      scene.terrain.fillStyle(0x98b8bc, 0.05 + fracture * 0.08);
      scene.terrain.fillCircle(wx + TILE * 0.5, wy + TILE * 0.5, TILE * (0.18 + fracture * 0.14));
    }
  }

function terrainBodyColor(tile: Tile, y: number) {
    if (tile === 'anchorstone') return 0x18202d;
    if (tile === 'bedrock') return 0x0d151e;
    if (tile === 'sand') return y < WORLD_H * 0.34 ? 0x203139 : 0x17242d;
    return y < WORLD_H * 0.58 ? 0x142632 : 0x101b26;
  }

function drawTerrainContour(scene: DeepdiveScene, x: number, y: number, tile: Tile) {
    const wx = x * TILE;
    const wy = y * TILE;
    const northWater = scene.getTile(x, y - 1) === 'water';
    const southWater = scene.getTile(x, y + 1) === 'water';
    const westWater = scene.getTile(x - 1, y) === 'water';
    const eastWater = scene.getTile(x + 1, y) === 'water';
    const edgeColor = tile === 'sand' ? 0x57716d : 0x435f68;
    const shadowColor = 0x071018;

    scene.terrainEdges.lineStyle(2, shadowColor, 0.22);
    drawContourLines(scene.terrainEdges, wx, wy, northWater, southWater, westWater, eastWater, 0);
    scene.terrainEdges.lineStyle(1, edgeColor, 0.22);
    drawContourLines(scene.terrainEdges, wx, wy, northWater, southWater, westWater, eastWater, -1);
  }

function drawContourLines(graphics: Phaser.GameObjects.Graphics, wx: number, wy: number, north: boolean, south: boolean, west: boolean, east: boolean, inset: number) {
    if (north) graphics.lineBetween(wx, wy + inset, wx + TILE, wy + inset);
    if (south) graphics.lineBetween(wx, wy + TILE - inset, wx + TILE, wy + TILE - inset);
    if (west) graphics.lineBetween(wx + inset, wy, wx + inset, wy + TILE);
    if (east) graphics.lineBetween(wx + TILE - inset, wy, wx + TILE - inset, wy + TILE);
  }

function drawEmbeddedOre(scene: DeepdiveScene, x: number, y: number, tile: Tile, exposed: boolean) {
    if (!exposed && hash(x * 13, y * 17, rng.seed) < 0.84) return;
    const wx = x * TILE;
    const wy = y * TILE;
    const color = orePixelColor(tile);
    const glow = oreGlowColor(tile);
    const cx = wx + TILE * (0.45 + (hash(x, y, rng.seed + 71) - 0.5) * 0.24);
    const cy = wy + TILE * (0.48 + (hash(y, x, rng.seed + 73) - 0.5) * 0.24);
    scene.terrainEdges.fillStyle(0x041019, exposed ? 0.6 : 0.34);
    scene.terrainEdges.fillCircle(cx, cy, exposed ? 8 : 5);
    scene.terrainEdges.fillStyle(glow, exposed ? 0.2 : 0.1);
    scene.terrainEdges.fillCircle(cx, cy, exposed ? 11 : 7);
    for (let i = 0; i < 5; i += 1) {
      const angle = hash(x * 23 + i, y * 29, rng.seed) * Math.PI * 2;
      const radius = hash(y * 31, x * 37 + i, rng.seed) * (exposed ? 7 : 4);
      const size = i === 0 ? 4 : 2 + hash(i, x + y, rng.seed) * 2;
      scene.terrainEdges.fillStyle(i === 0 ? 0xe6fbff : color, i === 0 ? 0.86 : 0.72);
      scene.terrainEdges.fillRect(Math.floor(cx + Math.cos(angle) * radius), Math.floor(cy + Math.sin(angle) * radius), size, size);
    }
  }

function drawOreBrush(scene: DeepdiveScene, x: number, y: number, tile: Tile, spriteIndex: number) {
    const variant = oreBrushVariant(tile);
    const key = `terrain-brush-ore-${variant}`;
    const sprite = scene.terrainBrushSpriteAt(spriteIndex, key);
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
    return spriteIndex + 1;
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
    if (tile === 'copper') return 0xc47a42;
    if (tile === 'quartz') return 0xd7f6f0;
    if (tile === 'ruby') return 0xd94b68;
    if (tile === 'cobalt') return 0x5f95ff;
    if (tile === 'sunstone') return 0xffc857;
    if (tile === 'alienAlloy') return 0x73fbd3;
    if (tile === 'ruinCore') return 0xb48cff;
    return 0xb9f27c;
  }

function oreGlowColor(tile: Tile) {
    if (tile === 'ruby') return 0xff4f64;
    if (tile === 'cobalt') return 0x6dd6ff;
    if (tile === 'sunstone') return 0xffd166;
    if (tile === 'alienAlloy') return 0x73fbd3;
    if (tile === 'ruinCore') return 0xd06bff;
    return orePixelColor(tile);
  }

function drawFractureMarks(scene: DeepdiveScene, x: number, y: number, tile: Tile, fracture: number) {
    const wx = x * TILE;
    const wy = y * TILE;
    const count = fracture > 0.65 ? 4 : fracture > 0.32 ? 3 : 2;
    scene.terrain.fillStyle(0xe9f4ef, 0.04 + fracture * 0.06);
    scene.terrain.fillCircle(wx + TILE * 0.5, wy + TILE * 0.5, TILE * (0.18 + fracture * 0.16));
    for (let i = 0; i < count; i += 1) {
      const seedA = hash(x + i * 13, y - i * 7, rng.seed);
      const seedB = hash(y + i * 17, x + i * 5, rng.seed);
      const sx = wx + 5 + seedA * 14;
      const sy = wy + 5 + seedB * 14;
      const length = 6 + fracture * 11 + (i % 2) * 4;
      const angle = seedA * Math.PI * 1.6 + i * 0.7;
      scene.terrain.lineStyle(i === 0 ? 2 : 1, tile === 'sand' ? 0xfff2cc : 0xeef9f7, 0.18 + fracture * 0.34);
      scene.terrain.lineBetween(sx, sy, sx + Math.cos(angle) * length, sy + Math.sin(angle) * length);
      if (fracture > 0.5) {
        scene.terrain.lineStyle(1, 0x071018, 0.28);
        scene.terrain.lineBetween(sx + 1, sy + 1, sx + Math.cos(angle) * length + 1, sy + Math.sin(angle) * length + 1);
      }
    }
  }

export function drawBoat(this: DeepdiveScene, ) {
    const x = WORLD_W * TILE * 0.5;
    const s = BARGE_DRAW_SCALE;
    this.bargeSprite
      .setVisible(true)
      .setAlpha(1)
      .setPosition(x, 0)
      .setDisplaySize(BARGE_PLATFORM_WIDTH, BARGE_PLATFORM_HEIGHT);
    this.actors.fillStyle(0x55d7e6, state.atBoat ? 0.14 : 0.06);
    this.actors.fillEllipse(x, SURFACE_Y + 8 * s, 150 * s, 18 * s);
    this.actors.lineStyle(1, 0xb8edf0, state.atBoat ? 0.62 : 0.28);
    this.actors.lineBetween(x - 28 * s, BARGE_DOCK_Y, x + 28 * s, BARGE_DOCK_Y);
    this.actors.lineBetween(x, BARGE_DOCK_Y, x, BARGE_DOCKING_ZONE_Y);
  }

export function drawSpecialRooms(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const room of this.specialRooms) {
      if (room.x + room.rx < view.x || room.x - room.rx > view.right || room.y + room.ry < view.y || room.y - room.ry > view.bottom) continue;
      if (room.kind === 'biolume') {
        const pulse = 0.58 + Math.sin(performance.now() * 0.0024 + room.x * 0.01) * 0.12;
        this.actors.fillStyle(0x1bcbd8, 0.07 * pulse);
        this.actors.fillEllipse(room.x, room.y, room.rx * 1.82, room.ry * 1.72);
        this.actors.lineStyle(2, 0x73fbd3, 0.18 * pulse);
        this.actors.strokeEllipse(room.x, room.y, room.rx * 1.62, room.ry * 1.45);
        for (let i = 0; i < 9; i += 1) {
          const angle = (i / 9) * Math.PI * 2 + performance.now() * 0.0004;
          const x = room.x + Math.cos(angle) * room.rx * (0.26 + (i % 3) * 0.18);
          const y = room.y + Math.sin(angle) * room.ry * (0.28 + (i % 2) * 0.18);
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
      hazard.sprite
        ?.setTexture(`vent-steam-${frame}`)
        .setVisible(true)
        .setAlpha(0.62 + pulse * 0.25)
        .setPosition(hazard.x, hazard.y + 4 * s);
      fitImageHeight(hazard.sprite, hazard.radius * 3.2);
      if (pulse > 0.45) {
        this.actors.lineStyle(1, 0xff8a5c, pulse * 0.32);
        this.actors.strokeEllipse(hazard.x, hazard.y + 4 * s, hazard.radius * 1.25, hazard.radius * 0.34);
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
      const angle = Math.atan2(fish.vy, fish.vx);
      const bodyAlpha = fish.scanned ? Math.max(alpha, 0.9) : alpha;
      const threatDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      const movingTowardPlayer = (fish.vx * (this.player.x - fish.x) + fish.vy * (this.player.y - fish.y)) > 0;
      const attacking = fish.hostile && fish.aggro > 0 && movingTowardPlayer && threatDistance < 220;
      const threat = attacking ? 1 - Phaser.Math.Clamp((threatDistance - 52) / 118, 0, 1) : 0;
      const desiredWidth = fish.radius * (fish.hostile ? 3.8 : fish.pattern === 'circle' || fish.pattern === 'glide' ? 3.4 : 3);
      const pose = swimPose(angle, fish.facingSign);
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
      if (attacking) {
        const markerAlpha = Math.max(0.35, threat) * alpha;
        const markerY = fish.y - fish.radius - scaledEntity(18) - Math.sin(fish.phase * 7) * scaledEntity(2);
        this.actors.fillStyle(0xff4f64, markerAlpha);
        this.actors.fillTriangle(fish.x, markerY, fish.x - scaledEntity(6), markerY - scaledEntity(12), fish.x + scaledEntity(6), markerY - scaledEntity(12));
        this.actors.fillRect(fish.x - scaledEntity(2), markerY - scaledEntity(9), scaledEntity(4), scaledEntity(8));
        this.actors.fillCircle(fish.x, markerY + scaledEntity(1), scaledEntity(2));
        if (threat > 0) {
          this.actors.lineStyle(2, 0xff4f64, threat * 0.72);
          this.actors.strokeCircle(fish.x, fish.y, fish.radius + scaledEntity(11) + Math.sin(fish.phase * 8) * scaledEntity(3));
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
      const anchorRotation = floraAnchorRotation(anchor);
      const swayX = anchor === 'floor' || anchor === 'ceiling' ? sway : 0;
      const swayY = anchor === 'leftWall' || anchor === 'rightWall' ? sway : 0;
      fitImageHeight(flora.sprite, flora.radius * (flora.rare ? 4.7 : 4));
      flora.sprite
        ?.setTexture(flora.assetKey)
        .setVisible(true)
        .setAlpha(alpha)
        .setPosition(flora.x + swayX, flora.y + swayY)
        .setRotation(anchorRotation + Math.sin(flora.phase * 1.4) * 0.035)
        .setOrigin(0.5, 0.82);
      if (flora.hurtFlash > 0) {
        this.actors.lineStyle(2, 0xfff7df, flora.hurtFlash * alpha);
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + scaledEntity(5));
      }
      if (flora.hazardous) {
        this.actors.lineStyle(1, 0xff4f64, 0.35 + (flora.rare ? 0.25 : 0));
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + scaledEntity(5) + Math.sin(flora.phase * 5) * scaledEntity(2));
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
    this.playerSprite.setVisible(false);
    this.drawArticulatedDiver(animation, angle, swimSpeed);
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
      this.cutterBeamSprite?.setVisible(false);
      return;
    }
    const carrier = state.carrierSub;
    if (carrier && this.auxSub?.sprite) {
      this.auxSub.sprite
        .setTexture(`sub-tier${carrier.tier}`)
        .setVisible(true)
        .setPosition(carrier.x, carrier.y)
        .setFlipX(carrier.facingSign < 0)
        .setRotation(Phaser.Math.Clamp(carrier.vy / Math.max(1, subDef(carrier.tier).speed), -0.28, 0.28) * (carrier.facingSign < 0 ? -1 : 1))
        .setAlpha(0.92);
      fitImageWidth(this.auxSub.sprite, scaledEntity(118));
    } else {
      this.auxSub?.sprite?.setVisible(false);
    }
    const def = subDef(sub.tier);
    const speed = Math.hypot(sub.vx, sub.vy);
    this.subSprite
      ?.setTexture(`sub-tier${sub.tier}`)
      .setVisible(true)
      .setPosition(sub.x, sub.y)
      .setFlipX(sub.facingSign < 0)
      .setRotation(Phaser.Math.Clamp(sub.vy / Math.max(1, def.speed), -0.38, 0.38) * (sub.facingSign < 0 ? -1 : 1))
      .setAlpha(sub.hull <= def.hull * 0.18 ? 0.72 + Math.sin(performance.now() * 0.018) * 0.16 : 1);
    fitImageWidth(this.subSprite, scaledEntity(sub.tier === 3 ? 118 : sub.tier === 2 ? 92 : 72));
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
      const dy = (sampleY - room.y) / room.ry;
      if (Math.abs(dy) >= 1) continue;
      const halfWidth = room.rx * Math.sqrt(1 - dy * dy) * 1.04;
      intervals.push({
        left: Phaser.Math.Clamp(room.x - halfWidth, left, right),
        right: Phaser.Math.Clamp(room.x + halfWidth, left, right),
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
    if (!canvas || !this.world.length) return;
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
