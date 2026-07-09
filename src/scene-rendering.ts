import Phaser from 'phaser';
import type { Fish,Flora,TerrainBrushPlacement,TerrainVisualChunk,Tile } from './types';
import { BARGE_DOCKING_HALF_WIDTH,BARGE_DOCKING_ZONE_Y,BARGE_DOCK_Y,BARGE_DRAW_SCALE,BARGE_PLATFORM_HEIGHT,BARGE_PLATFORM_WIDTH,BOBBIT_ESCAPE_SECONDS,ENTITY_SCALE,FLARE_LIGHT_RADIUS,PLAYER_DRAW_SCALE,SONAR_ATTRACT_RADIUS,SONAR_REVEAL_RADIUS_TILES,SUB_BOARD_SECONDS,SURFACE_Y,TILE,WORLD_H,WORLD_W } from './constants';
import { tiles,upgrades } from './content';
import { state,ui } from './state';
import { rng } from './rng';
import { ambientDarknessOpacity,animatedFrame,darknessAtDepth,darknessOpacity,depthColor,diverAnimation,diverDisplayWidth,diverFrame,diverOrigin,diverPose,environmentAnchorSilhouettesFor,environmentVisualProfileFor,fishFrameCount,fitImageHeight,fitImageWidth,hash,isArtifactTile,isOreTile,lightBeamHalfWidth,lightBeamLength,lightRadius,mineCooldown,scaledEntity,sonarKey,sonarTileColor,specialRoomEffectCenter,spriteManifests,subDef,swimPose,swimTopSpeed,terrainBodyColorForTile,terrainLookForBiome } from './helpers';
import type { DeepdiveScene } from './scene';
import { DIVER_ARTICULATED_PART_SPECS } from './diver-articulated';
import { hideSubmarinePartSprites,renderSubmarineParts } from './submarine-parts';
import { ensureTerrainMask,TERRAIN_MASK_CELL,TERRAIN_MASK_HEIGHT,TERRAIN_MASK_RES,TERRAIN_MASK_SOLID_THRESHOLD,TERRAIN_MASK_WIDTH,terrainBoundarySupported,terrainLocalSolidSupport,terrainMaskBoundaryCell,terrainMaskDensityAt,terrainMaskExposureVector,terrainMaskInteriorFillCell,terrainMaskSolid } from './terrain-mask';
import { measurePerf } from './perf';
import { ACTUAL_GPT_ORE_STAMPS,type ActualGptOreTile } from './ore-actual-gpt-stamps';

const TERRAIN_VISIBILITY_WASH_ALPHA = 0.034;
const TERRAIN_VISIBILITY_GLOW_ALPHA = 0.052;
const TRANSITION_DEEP_TERRAIN_ALPHA = 0.48;
const TRANSITION_DEEP_TERRAIN_EDGE_ALPHA = 0.24;
const TRANSITION_DEEP_ORE_OVERBURDEN_ALPHA = 0.48;

export function draw(this: DeepdiveScene, ) {
    const camera = this.cameras.main;
    const environmentProfile = environmentVisualProfileFor(state.biome, state.depth);
    this.articulatedBridges.clear();
    this.actors.clear();
    this.darkness.clear();
    this.lampGloom.clear();
    this.overlay.clear();
    this.parallaxBackdrop.clear();
    camera.setBackgroundColor(depthColor(state.depth));
	    this.updateForegroundTerrainPresentation(environmentProfile);
	    measurePerf(this, 'draw.parallax', () => this.drawParallax(camera, environmentProfile));
    measurePerf(this, 'draw.waterColumn', () => this.drawWaterColumn(camera, environmentProfile));
	    measurePerf(this, 'draw.world', () => this.drawWorld(camera), { dirty: this.terrainDirty, chunks: this.terrainVisualDirtyChunks.size });
	    measurePerf(this, 'draw.props', () => this.drawEnvironmentProps(camera), { count: this.environmentProps.length });
    this.drawBobbitBurrows(camera);
	    measurePerf(this, 'draw.terrainBreakEffects', () => this.drawTerrainBreakEffects(camera), { count: this.terrainBreakEffects.length });
	    measurePerf(this, 'draw.specialRooms', () => this.drawSpecialRooms(camera), { count: this.specialRooms.length });
    this.drawBoat();
    this.drawBargeDockingIndicator();
    measurePerf(this, 'draw.looseItems', () => this.drawLooseItems(camera), { count: this.looseItems.length });
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
    measurePerf(this, 'draw.darkness', () => this.drawDarkness(camera));
    this.drawGameOver(camera);
  }

export function updateForegroundTerrainPresentation(this: DeepdiveScene, profile = environmentVisualProfileFor(state.biome, state.depth)) {
    const transitionDeepBlend = profile.activeBandBlend.from === 'lower' && profile.activeBandBlend.to === 'transitionDeep'
      ? profile.activeBandBlend.progress
      : profile.depthBand === 'transitionDeep' ? 1 : 0;
    this.terrain.setAlpha(Phaser.Math.Linear(1, TRANSITION_DEEP_TERRAIN_ALPHA, transitionDeepBlend));
    this.terrainEdges.setAlpha(Phaser.Math.Linear(1, TRANSITION_DEEP_TERRAIN_EDGE_ALPHA, transitionDeepBlend));
    this.oreOverburden.setAlpha(Phaser.Math.Linear(1, TRANSITION_DEEP_ORE_OVERBURDEN_ALPHA, transitionDeepBlend));
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

export function drawParallax(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera, profile = environmentVisualProfileFor(state.biome, state.depth)) {
    const view = camera.worldView;
    const padding = 24;
    for (let i = 0; i < this.parallaxLayers.length; i += 1) {
      const layer = this.parallaxLayers[i];
      const layerProfile = profile.background.layers[i] ?? profile.background.layers[profile.background.layers.length - 1];
      const key = this.textures.exists(layerProfile.texturePrefix) ? layerProfile.texturePrefix : '';
      if (!key) {
        layer.setVisible(false);
        continue;
      }
      layer.setVisible(true);
      if (layer.texture.key !== key) layer.setTexture(key);
      const source = this.textures.get(key).getSourceImage();
      const sourceWidth = Math.max(1, source.width);
      const sourceHeight = Math.max(1, source.height);
      const coverScale = Math.max((view.width + padding * 2) / sourceWidth, (view.height + padding * 2) / sourceHeight, 1) * layerProfile.scale;
      const band = profile.bands.find((candidate) => candidate.id === layerProfile.band);
      const bandTop = band ? SURFACE_Y + band.startDepth * 6 - band.blendPx : view.y - padding;
      const bandBottom = band ? SURFACE_Y + band.endDepth * 6 + band.blendPx : view.bottom + padding;
      const bandFade = band
        ? Phaser.Math.Clamp((view.bottom - bandTop) / Math.max(1, band.blendPx), 0, 1)
          * Phaser.Math.Clamp((bandBottom - view.y) / Math.max(1, band.blendPx), 0, 1)
        : 1;
      const displayAlpha = layerProfile.alpha * bandFade;
      if (displayAlpha <= 0.04) {
        layer.setVisible(false);
        continue;
      }
      const targetWidth = view.width + padding * 2;
      const targetHeight = view.height + padding * 2;
      const displayWidth = sourceWidth * coverScale;
      const displayHeight = sourceHeight * coverScale;
      const overflowX = Math.max(0, displayWidth - targetWidth);
      const overflowY = Math.max(0, displayHeight - targetHeight);
      layer
        .setPosition(view.x - padding - overflowX * 0.5, view.y - padding - overflowY * 0.5)
        .setAlpha(displayAlpha)
        .setTint(layerProfile.tint);
      setImageDisplaySizeIfChanged(layer, displayWidth, displayHeight);
    }
    measurePerf(this, 'draw.backgroundAnchors', () => drawBackgroundAnchors(this, camera, profile));
  }

function waterColumnAlphaTextureKey(scene: DeepdiveScene, textureKey: string) {
  const alphaKey = `${textureKey}-water-column-alpha`;
  if (scene.textures.exists(alphaKey)) return alphaKey;
  if (!scene.textures.exists(textureKey)) return '';
  const sourceImage = scene.textures.get(textureKey).getSourceImage() as CanvasImageSource & { width: number; height: number };
  const width = Math.max(1, sourceImage.width);
  const height = Math.max(1, sourceImage.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return textureKey;
  context.drawImage(sourceImage, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    const luma = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
    data[index + 3] = Phaser.Math.Clamp((luma - 6) * 1.58, 0, 255);
  }
  context.putImageData(image, 0, 0);
  scene.textures.addCanvas(alphaKey, canvas);
  return alphaKey;
}

function backgroundAnchorSoftEdgeTextureKey(scene: DeepdiveScene, textureKey: string, fadePx: number) {
  const softKey = `${textureKey}-soft-edge-${Math.round(fadePx)}`;
  if (scene.textures.exists(softKey)) return softKey;
  if (!scene.textures.exists(textureKey)) return '';
  const sourceImage = scene.textures.get(textureKey).getSourceImage() as CanvasImageSource & { width: number; height: number };
  const width = Math.max(1, sourceImage.width);
  const height = Math.max(1, sourceImage.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return textureKey;
  context.drawImage(sourceImage, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const edgeFadePx = Math.max(1, fadePx);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y);
      const edgeT = Phaser.Math.Clamp(edgeDistance / edgeFadePx, 0, 1);
      data[index + 3] = Math.round(data[index + 3] * Phaser.Math.SmoothStep(edgeT, 0, 1));
    }
  }
  context.putImageData(image, 0, 0);
  scene.textures.addCanvas(softKey, canvas);
  return softKey;
}

function waterColumnBlendMode(blendMode: 'normal' | 'add') {
  return blendMode === 'normal' ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD;
}

function setTileSpriteSizeIfChanged(sprite: Phaser.GameObjects.TileSprite, width: number, height: number) {
  if (Math.abs(sprite.width - width) > 0.5 || Math.abs(sprite.height - height) > 0.5) {
    sprite.setSize(width, height);
  }
}

function setImageDisplaySizeIfChanged(image: Phaser.GameObjects.Image, width: number, height: number) {
  if (Math.abs(image.displayWidth - width) > 0.5 || Math.abs(image.displayHeight - height) > 0.5) {
    image.setDisplaySize(width, height);
  }
}

function waterColumnPassDisabled() {
  if (typeof window === 'undefined') return false;
  const runtimeWindow = window as typeof window & { __WATER_COLUMN_DISABLED__?: boolean };
  if (runtimeWindow.__WATER_COLUMN_DISABLED__) return true;
  return new URLSearchParams(window.location.search).get('waterColumn') === '0';
}

function waterColumnVisibleSpriteBudget() {
  return 1;
}

function drawGuardedHorizontalBand(
  graphics: Phaser.GameObjects.Graphics,
  view: Phaser.Geom.Rectangle,
  y: number,
  width: number,
  color: number,
  alpha: number,
  guardX: number,
  guardY: number,
  guardRadius: number,
) {
  const left = view.x - 56;
  const right = view.right + 56;
  graphics.lineStyle(width, color, alpha);
  const verticalGap = Math.abs(y - guardY);
  const protectedRadius = guardRadius + width * 0.46;
  if (protectedRadius > 0 && verticalGap < protectedRadius) {
    const horizontalGap = Math.sqrt(Math.max(0, protectedRadius * protectedRadius - verticalGap * verticalGap));
    const leftEnd = Math.max(left, guardX - horizontalGap);
    const rightStart = Math.min(right, guardX + horizontalGap);
    if (leftEnd - left > 1) graphics.lineBetween(left, y, leftEnd, y);
    if (right - rightStart > 1) graphics.lineBetween(rightStart, y, right, y);
    return;
  }
  graphics.lineBetween(left, y, right, y);
}

function drawGuardedScreenVeil(
  graphics: Phaser.GameObjects.Graphics,
  view: Phaser.Geom.Rectangle,
  color: number,
  alpha: number,
  guardX: number,
  guardY: number,
  guardRadius: number,
) {
  const left = view.x - 56;
  const right = view.right + 56;
  const top = view.y - 56;
  const bottom = view.bottom + 56;
  const stripHeight = 6;
  graphics.fillStyle(color, alpha);
  for (let y = top; y < bottom; y += stripHeight) {
    const h = Math.min(stripHeight, bottom - y);
    const sampleY = y + h * 0.5;
    const verticalGap = Math.abs(sampleY - guardY);
    if (guardRadius > 0 && verticalGap < guardRadius) {
      const horizontalGap = Math.sqrt(Math.max(0, guardRadius * guardRadius - verticalGap * verticalGap));
      const leftEnd = Math.max(left, guardX - horizontalGap);
      const rightStart = Math.min(right, guardX + horizontalGap);
      if (leftEnd - left > 1) graphics.fillRect(left, y, leftEnd - left, h);
      if (right - rightStart > 1) graphics.fillRect(rightStart, y, right - rightStart, h);
    } else {
      graphics.fillRect(left, y, right - left, h);
    }
  }
}

export function drawWaterColumn(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera, profile = environmentVisualProfileFor(state.biome, state.depth)) {
  if (waterColumnPassDisabled()) {
    for (const layer of this.waterColumnLayers) layer.setVisible(false);
    return;
  }
  const view = camera.worldView;
  const padding = 32;
  const driftTime = this.time.now / 1000;
  this.parallaxBackdrop.setDepth(-6.79);
  drawWaterColumnVolumeGraphics(this, camera, profile, driftTime);
  let spriteIndex = 0;
  const activeLayerProfiles = profile.background.worldSpaceNoise.layers
    .map((layerProfile) => ({
      layerProfile,
      displayAlpha: Phaser.Math.Clamp(layerProfile.alpha, 0, 0.04),
    }))
    .filter(({ layerProfile, displayAlpha }) => this.textures.exists(layerProfile.textureKey) && displayAlpha > 0.03)
    .sort((a, b) => b.displayAlpha - a.displayAlpha)
    .slice(0, waterColumnVisibleSpriteBudget());
  for (const { layerProfile, displayAlpha } of activeLayerProfiles) {
    const textureKey = waterColumnAlphaTextureKey(this, layerProfile.textureKey);
    if (!textureKey) continue;
    const cached = this.waterColumnLayers[spriteIndex];
    const layer = cached?.scene
      ? cached
      : this.add.tileSprite(0, 0, 1, 1, textureKey)
        .setOrigin(0)
        .setDepth(-6.85 + spriteIndex * 0.03)
        .setBlendMode(waterColumnBlendMode(layerProfile.blendMode))
        .setScrollFactor(1);
    this.waterColumnLayers[spriteIndex] = layer;
    if (layer.texture.key !== textureKey) layer.setTexture(textureKey);
    layer.setData('waterColumnSourceTextureKey', layerProfile.textureKey);
    layer.setData('waterColumnRuntimeTextureKey', textureKey);
    layer.setData('waterColumnBlendMode', layerProfile.blendMode);
    layer
      .setVisible(true)
      .setDepth(-6.76 + spriteIndex * 0.03)
      .setPosition(view.x - padding, view.y - padding)
      .setAlpha(displayAlpha)
      .setTint(layerProfile.color)
      .setBlendMode(waterColumnBlendMode(layerProfile.blendMode));
    setTileSpriteSizeIfChanged(layer, view.width + padding * 2, view.height + padding * 2);
    layer.tileScaleX = layerProfile.scale * layerProfile.tileScaleX;
    layer.tileScaleY = layerProfile.scale * layerProfile.tileScaleY;
    const steppedDriftTime = Math.floor(driftTime * 8) / 8;
    layer.tilePositionX = camera.scrollX * layerProfile.parallaxX + steppedDriftTime * layerProfile.driftX + layerProfile.phaseX;
    layer.tilePositionY = camera.scrollY * layerProfile.parallaxY + steppedDriftTime * layerProfile.driftY + layerProfile.phaseY;
    spriteIndex += 1;
  }
  for (let i = spriteIndex; i < this.waterColumnLayers.length; i += 1) {
    this.waterColumnLayers[i].setVisible(false);
  }
}

function drawWaterColumnVolumeGraphics(scene: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera, profile: ReturnType<typeof environmentVisualProfileFor>, driftTime: number) {
  const view = camera.worldView;
  const band = profile.activeBand.id;
  const biome = profile.biome;
  const columnAlpha = profile.background.worldSpaceNoise.alpha;
  if (columnAlpha <= 0.003) return;

  const graphics = scene.parallaxBackdrop;
  const shallow = band === 'surface' || band === 'upper';
  const brineMid = biome === 2 && band === 'mid';
  const ruinLower = biome === 4 && band === 'lower';
  const quietDeep = biome === 3 && band === 'lower';
  const lineCount = brineMid ? 2 : ruinLower ? 4 : shallow ? 1 : quietDeep ? 1 : 1;
  const particleCount = brineMid ? 8 : ruinLower ? 12 : shallow ? 6 : quietDeep ? 4 : 6;
  const ribbonColor = brineMid ? 0x83b8a6 : ruinLower ? 0x9db7c8 : profile.activeBand.hazeColor;
  const particleColor = brineMid ? 0xb5d0b2 : ruinLower ? 0xc5d9e5 : 0xd8fff3;
  const baseLineAlpha = brineMid ? 0.01 : ruinLower ? 0.026 : shallow ? 0.013 : 0.007;
  const baseParticleAlpha = brineMid ? 0.006 : ruinLower ? 0.01 : shallow ? 0.009 : 0.005;

  if (shallow) {
    const mottleCount = 1;
    for (let i = 0; i < mottleCount; i += 1) {
      const roll = hash(i + 601, biome * 59 + profile.activeBand.startDepth, rng.seed + 2519);
      const x = view.x + Phaser.Math.Wrap(roll + driftTime * 0.01 * (i % 2 === 0 ? 1 : -0.45), 0, 1) * view.width;
      const yRoll = hash(i + 619, profile.activeBand.endDepth, rng.seed + 2521);
      const y = view.y + Phaser.Math.Wrap(yRoll + driftTime * 0.006 * (i % 3 - 1), 0, 1) * view.height;
      const width = Phaser.Math.Linear(230, 560, hash(i + 631, biome, rng.seed + 2531));
      const height = Phaser.Math.Linear(64, 148, hash(i + 641, biome, rng.seed + 2539));
      const lightMottle = i % 3 !== 0;
      const color = lightMottle ? (i % 2 === 0 ? profile.activeBand.hazeColor : 0x64cfc7) : 0x062f3a;
      const alpha = (lightMottle ? 0.012 : 0.018) * Phaser.Math.Linear(0.46, 1, hash(i + 653, biome, rng.seed + 2543));
      graphics.fillStyle(color, alpha);
      graphics.fillEllipse(x, y, width, height);
    }

    const ribbonCount = 1;
    for (let i = 0; i < ribbonCount; i += 1) {
      const roll = hash(i + 677, profile.activeBand.startDepth + biome * 83, rng.seed + 2551);
      const y = view.y + Phaser.Math.Wrap(roll + driftTime * 0.018 * (i % 2 === 0 ? 1 : -0.62), 0, 1) * view.height;
      const slope = Phaser.Math.Linear(-0.22, 0.16, hash(i + 691, biome, rng.seed + 2557));
      const width = Phaser.Math.Linear(14, 38, hash(i + 701, profile.activeBand.endDepth, rng.seed + 2579));
      const alpha = Phaser.Math.Linear(0.006, 0.014, hash(i + 719, biome, rng.seed + 2591));
      graphics.lineStyle(width, i % 2 === 0 ? 0x8fe9df : 0x0a5361, alpha);
      graphics.lineBetween(view.x - 120, y, view.right + 120, y + slope * (view.width + 240));
    }
  }

  if (brineMid) {
    for (let i = 0; i < 2; i += 1) {
      const roll = hash(i + 739, profile.activeBand.startDepth + biome * 97, rng.seed + 2609);
      const y = view.y + Phaser.Math.Wrap(roll + driftTime * 0.012 * (i % 2 === 0 ? 1 : -0.75), 0, 1) * view.height;
      const slope = Phaser.Math.Linear(-0.035, 0.028, hash(i + 743, biome, rng.seed + 2617));
      const width = Phaser.Math.Linear(18, 42, hash(i + 751, profile.activeBand.endDepth, rng.seed + 2621));
      const alpha = Phaser.Math.Linear(0.005, 0.011, hash(i + 757, biome, rng.seed + 2633));
      graphics.lineStyle(width, i % 2 === 0 ? 0x20483f : 0x6ca491, alpha);
      graphics.lineBetween(view.x - 140, y, view.right + 140, y + slope * (view.width + 280));
    }
  }

  if (ruinLower) {
    graphics.fillStyle(0x06141c, 0.68);
    graphics.fillRect(view.x - 24, view.y - 24, view.width + 48, view.height + 48);
    for (let i = 0; i < 4; i += 1) {
      const x = view.x + view.width * (0.12 + i * 0.22);
      const width = 62 + i * 22;
      graphics.lineStyle(width, 0x06151d, 0.14 + i * 0.018);
      graphics.lineBetween(x, view.y - 140, x + view.width * 0.42, view.bottom + 140);
    }
    for (let i = 0; i < 6; i += 1) {
      const roll = hash(i + 773, profile.activeBand.endDepth, rng.seed + 2647);
      const y = view.y + Phaser.Math.Wrap(roll + driftTime * 0.005 * (i % 2 === 0 ? 1 : -0.5), 0, 1) * view.height;
      graphics.lineStyle(Phaser.Math.Linear(28, 82, roll), i % 2 === 0 ? 0x88aebf : 0x173b4d, Phaser.Math.Linear(0.018, 0.05, hash(i + 787, biome, rng.seed + 2659)));
      graphics.lineBetween(view.x - 120, y, view.right + 120, y + Phaser.Math.Linear(-0.03, 0.045, roll) * (view.width + 240));
    }
  }

  for (let i = 0; i < lineCount; i += 1) {
    const roll = hash(i + 17, biome * 101 + profile.activeBand.startDepth, rng.seed + 2237);
    const speed = brineMid ? 0.018 : shallow ? 0.024 : 0.01;
    const yT = Phaser.Math.Wrap(roll + driftTime * speed * (i % 2 === 0 ? 1 : -0.55), 0, 1);
    const y = view.y + yT * view.height;
    const slope = brineMid ? Phaser.Math.Linear(-0.018, 0.018, roll) : shallow ? Phaser.Math.Linear(-0.11, 0.07, roll) : Phaser.Math.Linear(-0.035, 0.035, roll);
    const width = Phaser.Math.Linear(brineMid ? 10 : ruinLower ? 22 : 16, brineMid ? 28 : ruinLower ? 56 : 40, hash(i + 53, biome, rng.seed + 2249));
    const alpha = baseLineAlpha * Phaser.Math.Linear(0.44, 1, hash(i + 71, profile.activeBand.endDepth, rng.seed + 2267));
    graphics.lineStyle(width, ribbonColor, alpha);
    graphics.lineBetween(view.x - 96, y, view.right + 96, y + slope * (view.width + 192));
  }

  for (let i = 0; i < particleCount; i += 1) {
    const xRoll = hash(i + 101, biome * 19 + profile.activeBand.endDepth, rng.seed + 2309);
    const yRoll = hash(i + 149, biome * 23 + profile.activeBand.startDepth, rng.seed + 2311);
    const x = view.x + Phaser.Math.Wrap(xRoll + driftTime * 0.003 * (i % 3 - 1), 0, 1) * view.width;
    const y = view.y + Phaser.Math.Wrap(yRoll + driftTime * 0.006 * (i % 2 === 0 ? 1 : -0.4), 0, 1) * view.height;
    const radius = Phaser.Math.Linear(0.65, shallow ? 1.65 : 1.25, hash(i + 181, biome, rng.seed + 2333));
    const alpha = baseParticleAlpha * Phaser.Math.Linear(0.35, 1, hash(i + 211, profile.activeBand.startDepth, rng.seed + 2347));
    graphics.fillStyle(particleColor, alpha);
    graphics.fillCircle(x, y, radius);
  }
}

function drawBackgroundAnchors(scene: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera, profile: ReturnType<typeof environmentVisualProfileFor>) {
  const view = camera.worldView;
  const anchors = environmentAnchorSilhouettesFor(profile, view.x, view.right, view.y, view.bottom);
  let spriteIndex = 0;
  for (const anchor of anchors) {
    const parallaxX = anchor.x + view.x * (1 - anchor.parallaxFactor);
    const parallaxY = anchor.y + view.y * (1 - Phaser.Math.Clamp(anchor.parallaxFactor + 0.08, 0.06, 0.32));
    if (parallaxY + anchor.height * 0.5 < view.y - 80 || parallaxY - anchor.height * 0.5 > view.bottom + 80) continue;
    if (anchor.textureKey && scene.textures.exists(anchor.textureKey)) {
      const ruinVaultAnchor = profile.biome === 4 && anchor.assetId === 'biome-ruins-vault-causeway-lattice';
      const biome1OrganicAnchor = profile.biome === 1 && anchor.assetId === 'biome-shallows-organic-reef-shelf';
      const textureKey = ruinVaultAnchor
        ? backgroundAnchorSoftEdgeTextureKey(scene, anchor.textureKey, 540)
        : biome1OrganicAnchor
          ? backgroundAnchorSoftEdgeTextureKey(scene, anchor.textureKey, 220)
          : anchor.textureKey;
      if (!textureKey) continue;
      const cached = scene.backgroundAnchorSprites[spriteIndex];
      const sprite = cached?.scene ? cached : scene.add.image(parallaxX, parallaxY, textureKey).setDepth(-8.4).setOrigin(0.5);
      scene.backgroundAnchorSprites[spriteIndex] = sprite;
      const crop = anchor.textureCrop;
      sprite
        .setTexture(textureKey)
        .setDepth(biome1OrganicAnchor ? -6.77 : -7.3)
        .setVisible(true)
        .setPosition(parallaxX, parallaxY)
        .setAlpha(Phaser.Math.Clamp(anchor.alpha * (ruinVaultAnchor ? (profile.activeBand.id === 'lower' ? 0.06 : 0.2) : 1), 0, 1))
        .setTint(ruinVaultAnchor ? 0x718fa2 : 0xffffff)
        .setBlendMode(Phaser.BlendModes.NORMAL);
      if (crop) {
        sprite.setCrop(crop[0], crop[1], crop[2], crop[3]);
      } else {
        sprite.setCrop();
      }
      sprite.displayWidth = anchor.width;
      sprite.displayHeight = anchor.height;
      spriteIndex += 1;
    }
  }
  for (let i = spriteIndex; i < scene.backgroundAnchorSprites.length; i += 1) {
    scene.backgroundAnchorSprites[i].setVisible(false);
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
    this.oreOverburden.clear();

    const activeTerrainBrushKeys = new Set<string>();
    const activeActualGptOreKeys = new Set<string>();
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
          drawEmbeddedOre(this, x, y, tile, exposed, activeActualGptOreKeys);
        }
        if (tile === 'anchorstone') {
          this.terrainEdges.lineStyle(1, 0xb9c2d0, 0.1);
          this.terrainEdges.strokeRect(wx + 1, wy + 1, TILE - 2, TILE - 2);
        }
        if (fracture > 0) {
          drawFractureMarks(this, x, y, tile, fracture);
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
      for (const [key, sprite] of this.actualGptOreSpritesByKey) {
        if (!activeActualGptOreKeys.has(key)) {
          sprite.setVisible(false);
          this.actualGptOreMasksByKey.get(key)?.graphics.clear();
        }
      }
	  }

export function drawTerrainBreakEffects(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const effect of this.terrainBreakEffects) {
      if (effect.x < view.x - 60 || effect.x > view.right + 60 || effect.y < view.y - 60 || effect.y > view.bottom + 60) continue;
      const t = Phaser.Math.Clamp(effect.age / effect.life, 0, 1);
      const contact = effect.kind === 'contact' || effect.kind === 'oreGlint';
      const oreGlint = effect.kind === 'oreGlint';
      const alpha = (1 - t) * (contact ? 0.58 : 0.72);
      const radius = contact ? TILE * (0.16 + t * 0.36) : TILE * (0.44 + t * 0.72);
      const palette = terrainAccentPalette();
      this.actors.fillStyle(oreGlint ? effect.color : palette.glow, alpha * (contact ? 0.09 : 0.12));
      this.actors.fillCircle(effect.x, effect.y, radius);
      this.actors.lineStyle(contact ? 1 : 2, oreGlint ? 0xfff7df : palette.rim, alpha * (contact ? 0.5 : 0.36));
      this.actors.strokeCircle(effect.x, effect.y, radius * 0.92);
      const chipCount = contact ? 8 : 13;
      for (let i = 0; i < chipCount; i += 1) {
        const angle = effect.seed * Math.PI * 2 + i * 1.137;
        const travel = TILE * (contact ? 0.08 + t * (0.34 + (i % 4) * 0.07) : 0.12 + t * (0.72 + (i % 4) * 0.1));
        const chipX = effect.x + Math.cos(angle) * travel;
        const chipY = effect.y + Math.sin(angle) * travel;
        const brightChip = oreGlint && i % 3 === 0;
        this.actors.fillStyle(brightChip ? 0xfff7df : i % 4 === 0 ? effect.color : 0x050b10, alpha * (brightChip ? 0.72 : i % 4 === 0 ? 0.42 : 0.58));
        this.actors.fillRect(Math.floor(chipX), Math.floor(chipY), brightChip || i % 4 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
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
      if (((cell.sx + cell.sy) & 1) === 1) continue;
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
      if (((cell.sx + cell.sy) & 1) === 1) continue;
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
      if ((cell.sx + cell.sy) % 3 !== 0) continue;
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
      if ((cell.sx + cell.sy) % 3 !== 0) continue;
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
        if (((sx + sy) & 1) === 1) continue;
        const wx = sx * TERRAIN_MASK_CELL;
        const wy = sy * TERRAIN_MASK_CELL;
        const tx = Math.floor(sx / TERRAIN_MASK_RES);
        const ty = Math.floor(sy / TERRAIN_MASK_RES);
        const tile = scene.getTile(tx, ty);
        const palette = terrainAccentPalette();
        const rimColor = tile === 'sand' ? palette.sandRim : palette.rim;
        const seed = hash(sx * 83, sy * 89, rng.seed + 5303);
        if (state.biome === 2) {
          const contourAlpha = tile === 'sand' ? 0.16 : 0.19;
          const contourJitter = (hash(sx, sy, rng.seed + 5347) - 0.5) * TERRAIN_MASK_CELL * 0.18;
          scene.terrainEdges.lineStyle(2, rimColor, contourAlpha);
          if (north) {
            const y = wy + TERRAIN_MASK_CELL * 0.12 + contourJitter;
            scene.terrainEdges.lineBetween(wx + TERRAIN_MASK_CELL * 0.12, y, wx + TERRAIN_MASK_CELL * 0.88, y);
          }
          if (south) {
            const y = wy + TERRAIN_MASK_CELL * 0.88 + contourJitter;
            scene.terrainEdges.lineBetween(wx + TERRAIN_MASK_CELL * 0.12, y, wx + TERRAIN_MASK_CELL * 0.88, y);
          }
          if (west) {
            const x = wx + TERRAIN_MASK_CELL * 0.12 + contourJitter;
            scene.terrainEdges.lineBetween(x, wy + TERRAIN_MASK_CELL * 0.12, x, wy + TERRAIN_MASK_CELL * 0.88);
          }
          if (east) {
            const x = wx + TERRAIN_MASK_CELL * 0.88 + contourJitter;
            scene.terrainEdges.lineBetween(x, wy + TERRAIN_MASK_CELL * 0.12, x, wy + TERRAIN_MASK_CELL * 0.88);
          }
          if (seed > 0.93) {
            const horizontal = north || south;
            scene.terrainEdges.fillStyle(seed > 0.982 ? palette.glow : rimColor, seed > 0.982 ? 0.11 : 0.075);
            scene.terrainEdges.fillEllipse(
              horizontal
                ? wx + TERRAIN_MASK_CELL * (0.34 + hash(sx, sy, rng.seed + 5351) * 0.32)
                : wx + (west ? TERRAIN_MASK_CELL * 0.14 : TERRAIN_MASK_CELL * 0.86),
              horizontal
                ? wy + (north ? TERRAIN_MASK_CELL * 0.14 : TERRAIN_MASK_CELL * 0.86)
                : wy + TERRAIN_MASK_CELL * (0.34 + hash(sy, sx, rng.seed + 5353) * 0.32),
              horizontal ? TERRAIN_MASK_CELL * 0.58 : TERRAIN_MASK_CELL * 0.24,
              horizontal ? TERRAIN_MASK_CELL * 0.24 : TERRAIN_MASK_CELL * 0.58,
            );
          }
        }
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
      const placement = floraPlacement(x, y, 'top');
      if (!brushFloraPlacementCoveredByGameplayFlora(scene, placement)) placements.push(placement);
      return;
    }
    if (seed > 0.975 && sideWallFloraClearance(scene, x, y, true)) {
      const placement = floraPlacement(x, y, 'west');
      if (!brushFloraPlacementCoveredByGameplayFlora(scene, placement)) placements.push(placement);
    }
    if (seed < 0.025 && sideWallFloraClearance(scene, x, y, false)) {
      const placement = floraPlacement(x, y, 'east');
      if (!brushFloraPlacementCoveredByGameplayFlora(scene, placement)) placements.push(placement);
    }
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
    const variants = anchor === 'top' ? [0, 1, 4, 6, 7] : [2, 3, 5, 6, 7];
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

function brushFloraPlacementCoveredByGameplayFlora(scene: DeepdiveScene, placement: TerrainBrushPlacement) {
    return scene.flora.some((flora) => flora.source === 'brush' && flora.propId === placement.key);
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
    const brine = state.biome === 2;
    const patch = hash(Math.floor(x / 3) * 17, Math.floor(y / 3) * 19, rng.seed);
    const fleck = hash(x * 29, y * 31, rng.seed);
    if ((exposed ? fleck > 0.68 : fleck > 0.92) && fracture <= 0) {
      const tone = brine ? (patch > 0.6 ? 0x3f3328 : 0x120d0a) : (patch > 0.6 ? 0x314650 : 0x0b1820);
      const alpha = (exposed ? (patch > 0.6 ? 0.025 : 0.04) : 0.018) * (brine ? 0.72 : 1);
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
      scene.terrain.lineStyle(2, brine ? 0xf2b06d : 0xbbe8e3, brine ? 0.12 + fracture * 0.18 : 0.14 + fracture * 0.28);
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

function drawEmbeddedOre(scene: DeepdiveScene, x: number, y: number, tile: Tile, _exposed: boolean, activeActualGptOreKeys: Set<string>) {
    const deposit = oreDepositComponent(scene, x, y, tile);
    if (deposit.rootX !== x || deposit.rootY !== y) return;
    const shapeFirstSliceTile = isShapeFirstSliceOreTile(tile);

    const color = orePixelColor(tile);
    const glow = oreGlowColor(tile);
    const dark = oreShadowColor(tile);
    const facet = oreFacetColor(tile);
    const width = (deposit.maxX - deposit.minX + 1) * TILE;
    const height = (deposit.maxY - deposit.minY + 1) * TILE;
    const cx = (deposit.minX + deposit.maxX + 1) * TILE * 0.5 + (hash(x, y, rng.seed + 71) - 0.5) * TILE * 0.34;
    const cy = (deposit.minY + deposit.maxY + 1) * TILE * 0.5 + (hash(y, x, rng.seed + 73) - 0.5) * TILE * 0.28;
    const angle = shapeFirstSliceTile ? shapeFirstOreClusterAngle(tile, deposit) : oreDepositAngle(deposit, x, y);
    const rawLongRadius = Math.max(TILE * 0.33, width * 0.39 + deposit.cells.length * 0.7);
    const rawShortRadius = Math.max(TILE * 0.18, Math.min(TILE * 0.58, height * 0.32 + TILE * 0.04));
    const { longRadius, shortRadius } = oreDepositVisualRadii(tile, deposit, rawLongRadius, rawShortRadius);
    const points = orePocketPoints(cx, cy, longRadius, shortRadius, angle, x, y, tile);

    drawOreStain(scene, tile, deposit, cx, cy, longRadius, shortRadius, angle, dark, glow);
    if (isActualGptOreTile(tile) && !shapeFirstSliceTile) {
      drawEmbeddedAssetCavity(scene, tile, deposit, cx, cy, longRadius, shortRadius, angle, dark, glow);
    } else {
      drawPocketShape(scene.terrainEdges, points, 0x010306, 0.36, 1.7, 2.1);
      drawPocketShape(scene.terrainEdges, points, dark, 0.34, 0, 0);
    }

    if (shapeFirstSliceTile) {
      drawShapeFirstEmbeddedOre(scene, tile, deposit, cx, cy, longRadius, shortRadius, angle, color, facet, glow, dark);
    } else if (isActualGptOreTile(tile)) {
      drawGptStampIntegratedOre(scene, tile, deposit, cx, cy, longRadius, shortRadius, angle, color, facet, glow, dark, activeActualGptOreKeys);
    } else {
      drawCommonStrataOre(scene, tile, cx, cy, longRadius, shortRadius, angle, color, facet, glow, dark);
    }

    if (!shapeFirstSliceTile) {
      drawHostRockOcclusion(scene, deposit, cx, cy, longRadius, shortRadius, angle, tile);
      drawOreDepositGlint(scene, deposit, cx, cy, longRadius, shortRadius, angle, glow);
    }
  }

function oreDepositComponent(scene: DeepdiveScene, startX: number, startY: number, tile: Tile) {
    const stack = [{ x: startX, y: startY }];
    const seen = new Set<string>();
    const cells: Array<{ x: number; y: number }> = [];
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;
    while (stack.length && cells.length < 48) {
      const current = stack.pop();
      if (!current) break;
      const key = `${current.x}:${current.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (scene.getTile(current.x, current.y) !== tile) continue;
      cells.push(current);
      minX = Math.min(minX, current.x);
      maxX = Math.max(maxX, current.x);
      minY = Math.min(minY, current.y);
      maxY = Math.max(maxY, current.y);
      stack.push(
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      );
    }
    const root = cells.reduce((best, cell) => (
      cell.y < best.y || (cell.y === best.y && cell.x < best.x) ? cell : best
    ), { x: startX, y: startY });
    return { cells, minX, maxX, minY, maxY, rootX: root.x, rootY: root.y };
  }

function oreDepositAngle(deposit: ReturnType<typeof oreDepositComponent>, x: number, y: number) {
    const width = deposit.maxX - deposit.minX + 1;
    const height = deposit.maxY - deposit.minY + 1;
    const base = width >= height ? -0.18 : Math.PI * 0.5 - 0.2;
    return base + (hash(x * 97, y * 101, rng.seed + 1103) - 0.5) * 0.82;
  }

function shapeFirstOreClusterAngle(tile: Tile, deposit: ReturnType<typeof oreDepositComponent>) {
    const base =
      tile === 'ruby' ? -0.86 :
      tile === 'cobalt' ? 0.72 :
      tile === 'quartz' ? 0.38 :
      tile === 'sunstone' ? -0.34 :
      tile === 'relic' ? 0.95 :
      tile === 'alienAlloy' ? -1.08 :
      tile === 'drownedIdol' ? 0.18 :
      tile === 'precursorEngine' ? -0.52 :
      tile === 'abyssalCrown' ? 0.62 :
      tile === 'ruinCore' ? -0.12 :
      -0.62;
    return base + (hash(deposit.rootX * 89, deposit.rootY * 97, rng.seed + 3881) - 0.5) * 0.5;
  }

function oreDepositVisualRadii(tile: Tile, deposit: ReturnType<typeof oreDepositComponent>, longRadius: number, shortRadius: number) {
    if (isShapeFirstSliceOreTile(tile)) {
      const cellScale = Math.sqrt(Math.max(1, deposit.cells.length));
      return {
        longRadius: Phaser.Math.Clamp(TILE * 0.31 + cellScale * 0.62, TILE * 0.34, TILE * 0.5),
        shortRadius: Phaser.Math.Clamp(TILE * 0.21 + cellScale * 0.54, TILE * 0.22, TILE * 0.34),
      };
    }
    if (!isActualGptOreTile(tile)) return { longRadius, shortRadius };
    const cellScale = Math.sqrt(Math.max(1, deposit.cells.length));
    const profile = actualGptEmbeddingProfile(tile);
    const compactLong = TILE * profile.radiusLong + cellScale * profile.cellLong;
    const compactShort = TILE * profile.radiusShort + cellScale * profile.cellShort;
    return {
      longRadius: Phaser.Math.Clamp(compactLong, TILE * profile.minLong, TILE * profile.maxLong),
      shortRadius: Phaser.Math.Clamp(compactShort, TILE * profile.minShort, TILE * profile.maxShort),
    };
  }

function actualGptEmbeddingProfile(tile: ActualGptOreTile) {
    switch (tile) {
      case 'abyssalCrown':
        return { radiusLong: 0.86, radiusShort: 0.3, cellLong: 1.55, cellShort: 0.46, minLong: 0.78, maxLong: 1.26, minShort: 0.26, maxShort: 0.46, widthScale: 1.5, minWidth: 1.02, maxWidth: 1.62, maskX: 0.4, maskY: 0.28, capCount: 8, capReach: 0.66, contact: 0.6 };
      case 'drownedIdol':
        return { radiusLong: 0.62, radiusShort: 0.38, cellLong: 1.28, cellShort: 0.58, minLong: 0.58, maxLong: 1.0, minShort: 0.32, maxShort: 0.56, widthScale: 1.2, minWidth: 0.82, maxWidth: 1.25, maskX: 0.32, maskY: 0.36, capCount: 7, capReach: 0.7, contact: 0.62 };
      case 'ruinCore':
        return { radiusLong: 0.58, radiusShort: 0.42, cellLong: 1.18, cellShort: 0.62, minLong: 0.55, maxLong: 0.95, minShort: 0.34, maxShort: 0.58, widthScale: 1.08, minWidth: 0.78, maxWidth: 1.18, maskX: 0.31, maskY: 0.34, capCount: 7, capReach: 0.72, contact: 0.58 };
      case 'precursorEngine':
        return { radiusLong: 0.78, radiusShort: 0.36, cellLong: 1.6, cellShort: 0.58, minLong: 0.7, maxLong: 1.2, minShort: 0.3, maxShort: 0.56, widthScale: 1.42, minWidth: 0.96, maxWidth: 1.55, maskX: 0.38, maskY: 0.34, capCount: 8, capReach: 0.68, contact: 0.58 };
      case 'alienAlloy':
        return { radiusLong: 0.72, radiusShort: 0.34, cellLong: 1.44, cellShort: 0.54, minLong: 0.66, maxLong: 1.1, minShort: 0.28, maxShort: 0.52, widthScale: 1.34, minWidth: 0.9, maxWidth: 1.42, maskX: 0.36, maskY: 0.3, capCount: 7, capReach: 0.64, contact: 0.54 };
      case 'relic':
        return { radiusLong: 0.58, radiusShort: 0.3, cellLong: 1.22, cellShort: 0.48, minLong: 0.54, maxLong: 0.96, minShort: 0.25, maxShort: 0.46, widthScale: 1.16, minWidth: 0.76, maxWidth: 1.16, maskX: 0.32, maskY: 0.28, capCount: 6, capReach: 0.68, contact: 0.56 };
      default:
        return { radiusLong: 0.58, radiusShort: 0.28, cellLong: 1.28, cellShort: 0.58, minLong: 0.52, maxLong: 0.9, minShort: 0.24, maxShort: 0.42, widthScale: tile === 'ruby' ? 1.22 : 1.18, minWidth: 0.72, maxWidth: 1.12, maskX: tile === 'ruby' ? 0.44 : 0.42, maskY: tile === 'ruby' ? 0.28 : 0.32, capCount: tile === 'copper' || tile === 'cobalt' ? 6 : 5, capReach: 0.56, contact: 0.46 };
    }
  }

function orePocketPoints(cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, x: number, y: number, tile: Tile) {
    const points: Array<{ x: number; y: number }> = [];
    const count = 12;
    for (let i = 0; i < count; i += 1) {
      const theta = (i / count) * Math.PI * 2;
      const wobble = 0.76 + hash(x * 157 + i * 17, y * 163 - i * 19, rng.seed + oreBrushVariant(tile) * 37) * 0.38;
      const lx = Math.cos(theta) * longRadius * wobble;
      const ly = Math.sin(theta) * shortRadius * (0.82 + hash(y * 173 + i, x * 179 - i, rng.seed + 1601) * 0.3);
      points.push({
        x: cx + Math.cos(angle) * lx - Math.sin(angle) * ly,
        y: cy + Math.sin(angle) * lx + Math.cos(angle) * ly,
      });
    }
    return points;
  }

function drawPocketShape(graphics: Phaser.GameObjects.Graphics, points: Array<{ x: number; y: number }>, color: number, alpha: number, dx: number, dy: number) {
    if (!points.length) return;
    graphics.fillStyle(color, alpha);
    graphics.beginPath();
    graphics.moveTo(points[0].x + dx, points[0].y + dy);
    for (const point of points.slice(1)) graphics.lineTo(point.x + dx, point.y + dy);
    graphics.closePath();
    graphics.fillPath();
  }

function drawOreStain(scene: DeepdiveScene, tile: Tile, deposit: ReturnType<typeof oreDepositComponent>, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, dark: number, glow: number) {
    const actualGptTile = isActualGptOreTile(tile);
    if (isShapeFirstSliceOreTile(tile)) {
      const socket = orePocketPoints(cx, cy, longRadius * 1.42, shortRadius * 1.36, angle, deposit.rootX - 17, deposit.rootY + 29, tile);
      drawPocketShape(scene.terrainEdges, socket, 0x010306, 0.34, 1.2, 1.5);
      drawPocketShape(scene.terrainEdges, socket, dark, 0.18, 0, 0);
      scene.terrainEdges.lineStyle(1.1, glow, 0.12);
      for (let i = 0; i < 3; i += 1) {
        const t = (hash(i * 17, deposit.rootX, rng.seed + 3861) - 0.5) * 1.25;
        const s = (hash(deposit.rootY, i * 19, rng.seed + 3863) - 0.5) * 1.08;
        const start = stampLocalPoint(cx, cy, angle, t * longRadius, s * shortRadius);
        const end = stampLocalPoint(start.x, start.y, angle + (hash(i, deposit.rootX, rng.seed + 3865) - 0.5) * 1.8, longRadius * 0.28, 0);
        scene.terrainEdges.lineBetween(start.x, start.y, end.x, end.y);
      }
      return;
    }
    if (actualGptTile) {
      const profile = actualGptEmbeddingProfile(tile);
      const jagged = orePocketPoints(cx, cy, longRadius * 0.94, shortRadius * 0.82, angle, deposit.rootX - 17, deposit.rootY + 29, tile);
      drawPocketShape(scene.terrainEdges, jagged, 0x010306, 0.18 + profile.contact * 0.12, 1.1, 1.4);
      drawPocketShape(scene.terrainEdges, jagged, dark, 0.08 + profile.contact * 0.08, 0, 0);
      scene.terrainEdges.lineStyle(1.5, 0x010306, 0.26);
      scene.terrainEdges.lineBetween(
        cx - Math.cos(angle) * longRadius * 0.76,
        cy - Math.sin(angle) * longRadius * 0.76,
        cx + Math.cos(angle) * longRadius * 0.72,
        cy + Math.sin(angle) * longRadius * 0.72,
      );
      scene.terrainEdges.lineStyle(0.8, glow, tile === 'ruinCore' || tile === 'alienAlloy' ? 0.2 : 0.1);
      scene.terrainEdges.lineBetween(
        cx - Math.cos(angle) * longRadius * 0.48,
        cy - Math.sin(angle) * longRadius * 0.48,
        cx + Math.cos(angle) * longRadius * 0.34,
        cy + Math.sin(angle) * longRadius * 0.34,
      );
      return;
    }
    const stainScale = actualGptTile ? 0.76 : Phaser.Math.Clamp(0.9 + deposit.cells.length * 0.08, 0.95, 1.34);
    scene.terrainEdges.fillStyle(0x010306, 0.2);
    scene.terrainEdges.fillEllipse(
      cx + (actualGptTile ? 1.2 : 2.5),
      cy + (actualGptTile ? 1.5 : 3),
      longRadius * (actualGptTile ? 1.18 : 2.25) * stainScale,
      shortRadius * (actualGptTile ? 1.08 : 2.05) * stainScale,
    );
    scene.terrainEdges.fillStyle(dark, actualGptTile ? 0.12 : 0.16);
    scene.terrainEdges.fillEllipse(cx, cy, longRadius * (actualGptTile ? 1.22 : 2.35) * stainScale, shortRadius * (actualGptTile ? 0.95 : 1.88) * stainScale);
    scene.terrainEdges.lineStyle(actualGptTile ? 2.2 : Math.max(4, shortRadius * 0.48), dark, actualGptTile ? 0.1 : 0.13);
    scene.terrainEdges.lineBetween(
      cx - Math.cos(angle) * longRadius * 1.05,
      cy - Math.sin(angle) * longRadius * 1.05,
      cx + Math.cos(angle) * longRadius * 1.05,
      cy + Math.sin(angle) * longRadius * 1.05,
    );
    scene.terrainEdges.lineStyle(actualGptTile ? 0.9 : Math.max(1.4, shortRadius * 0.15), glow, actualGptTile ? 0.16 : 0.12);
    scene.terrainEdges.lineBetween(
      cx - Math.cos(angle) * longRadius * 0.85,
      cy - Math.sin(angle) * longRadius * 0.85,
      cx + Math.cos(angle) * longRadius * 0.85,
      cy + Math.sin(angle) * longRadius * 0.85,
    );
  }

function drawEmbeddedAssetCavity(scene: DeepdiveScene, tile: ActualGptOreTile, deposit: ReturnType<typeof oreDepositComponent>, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, dark: number, glow: number) {
    const jagged = orePocketPoints(cx, cy, longRadius * 1.1, shortRadius * 1.05, angle, deposit.rootX + 19, deposit.rootY - 23, tile)
      .map((point, index) => {
        const bias = hash(deposit.rootX * 401 + index, deposit.rootY * 409 - index, rng.seed + 3401) - 0.5;
        return {
          x: point.x + Math.cos(angle + Math.PI * 0.5) * bias * shortRadius * 0.22,
          y: point.y + Math.sin(angle + Math.PI * 0.5) * bias * shortRadius * 0.22,
        };
      });
    drawPocketShape(scene.terrainEdges, jagged, 0x010306, 0.28, 1.1, 1.5);
    drawPocketShape(scene.terrainEdges, jagged, dark, 0.16, 0, 0);
    drawActualGptMaterialStaining(scene.terrainEdges, tile, deposit, cx, cy, longRadius, shortRadius, angle, dark, glow);
  }

function drawActualGptMaterialStaining(graphics: Phaser.GameObjects.Graphics, tile: ActualGptOreTile, deposit: ReturnType<typeof oreDepositComponent>, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, dark: number, glow: number) {
    const stainColor = tile === 'copper' ? 0x315f45
      : tile === 'cobalt' ? 0x1d5387
        : tile === 'sunstone' ? 0x8e5930
          : tile === 'quartz' ? 0xb9c7c2
            : tile === 'ruby' ? 0x6c1418
              : tile === 'alienAlloy' || tile === 'ruinCore' ? 0x1bbfc3
                : glow;
    const crackCount = tile === 'ruby' ? 7 : tile === 'quartz' ? 8 : tile === 'cobalt' ? 7 : tile === 'copper' ? 9 : 5;
    for (let i = 0; i < crackCount; i += 1) {
      const t = hash(deposit.rootX * 421 + i * 17, deposit.rootY, rng.seed + 3411) - 0.5;
      const s = hash(deposit.rootY * 431, deposit.rootX + i * 19, rng.seed + 3413) - 0.5;
      const start = stampLocalPoint(cx, cy, angle, t * longRadius * 0.92, s * shortRadius * 0.72);
      const spread = longRadius * (0.22 + hash(i, deposit.rootX, rng.seed + 3415) * 0.38);
      const branchAngle = angle + (hash(i * 23, deposit.rootY, rng.seed + 3417) - 0.5) * (tile === 'cobalt' ? 1.7 : 1.15);
      graphics.lineStyle(tile === 'quartz' ? 1.2 : 0.9, 0x010306, 0.22);
      graphics.lineBetween(start.x + 0.8, start.y + 1, start.x + Math.cos(branchAngle) * spread + 0.8, start.y + Math.sin(branchAngle) * spread + 1);
      graphics.lineStyle(tile === 'copper' ? 1.3 : 0.8, stainColor, tile === 'ruby' ? 0.2 : tile === 'cobalt' ? 0.24 : 0.17);
      graphics.lineBetween(start.x, start.y, start.x + Math.cos(branchAngle) * spread, start.y + Math.sin(branchAngle) * spread);
    }
    if (tile === 'cobalt' || tile === 'alienAlloy' || tile === 'ruinCore') {
      graphics.fillStyle(stainColor, tile === 'cobalt' ? 0.1 : 0.08);
      graphics.fillEllipse(cx, cy, longRadius * 1.32, shortRadius * 1.2);
    }
  }

function drawGptStampIntegratedOre(
  scene: DeepdiveScene,
  tile: Tile,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  color: number,
  facet: number,
  glow: number,
  dark: number,
  activeActualGptOreKeys: Set<string>,
) {
    if (!isActualGptOreTile(tile)) return;
    drawActualGptSourceStamp(scene, tile, deposit, cx, cy, longRadius, shortRadius, angle, color, facet, glow, dark, activeActualGptOreKeys);
  }

function stampLocalPoint(cx: number, cy: number, angle: number, localX: number, localY: number) {
    return {
      x: cx + Math.cos(angle) * localX - Math.sin(angle) * localY,
      y: cy + Math.sin(angle) * localX + Math.cos(angle) * localY,
    };
  }

function isActualGptOreTile(tile: Tile): tile is ActualGptOreTile {
    return tile in ACTUAL_GPT_ORE_STAMPS;
  }

function isShapeFirstSliceOreTile(tile: Tile) {
    return isOreTile(tile);
  }

function drawActualGptSourceStamp(
  scene: DeepdiveScene,
  tile: ActualGptOreTile,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  _color: number,
  facet: number,
  glow: number,
  dark: number,
  activeActualGptOreKeys: Set<string>,
) {
    const stamps = ACTUAL_GPT_ORE_STAMPS[tile];
    const stampIndex = Math.min(stamps.length - 1, Math.floor(hash(deposit.rootX * 313, deposit.rootY * 317, rng.seed + 3311) * stamps.length));
    const stamp = stamps[stampIndex];
    const isArtifact = tile === 'precursorEngine'
      || tile === 'relic'
      || tile === 'drownedIdol'
      || tile === 'abyssalCrown'
      || tile === 'alienAlloy'
      || tile === 'ruinCore';
    const profile = actualGptEmbeddingProfile(tile);
    const sourceTwist = (hash(deposit.rootX * 331, deposit.rootY * 337, rng.seed + 3313) - 0.5) * (tile === 'ruby' || tile === 'abyssalCrown' ? 0.34 : 0.22);
    const stampAngle = angle + sourceTwist;
    const targetWidth = Phaser.Math.Clamp(
      longRadius * profile.widthScale,
      TILE * profile.minWidth,
      TILE * profile.maxWidth,
    );
    const aspect = stamp.height / Math.max(1, stamp.width);
    const targetHeight = Phaser.Math.Clamp(
      targetWidth * aspect,
      TILE * (tile === 'ruby' ? 0.32 : 0.28),
      TILE * (isArtifact ? 0.92 : 0.72),
    );
    const xScale = targetWidth / 200;
    const yScale = targetHeight / 200;
    const sampleScale = Phaser.Math.Clamp((targetWidth + targetHeight) / 112, 0.18, isArtifact ? 0.34 : 0.28);
    const sampleW = tile === 'ruby' ? 1.38 : isArtifact ? 1.1 : 1.18;
    const sampleH = tile === 'ruby' ? 0.5 : isArtifact ? 0.82 : 0.62;
    const stampCx = cx + (hash(deposit.rootX, deposit.rootY, rng.seed + 3315) - 0.5) * longRadius * 0.18;
    const stampCy = cy + (hash(deposit.rootY, deposit.rootX, rng.seed + 3317) - 0.5) * shortRadius * 0.2;

    const backing = orePocketPoints(stampCx, stampCy, targetWidth * 0.46, Math.max(shortRadius * 0.52, targetHeight * 0.34), stampAngle, deposit.rootX + 37, deposit.rootY - 31, tile);
    drawPocketShape(scene.terrainEdges, backing, 0x010306, isArtifact ? 0.26 : 0.2, 1, 1.3);
    drawPocketShape(scene.terrainEdges, backing, dark, isArtifact ? 0.14 : 0.1, 0, 0);

    const spriteKey = `actual-gpt-ore:${deposit.rootX}:${deposit.rootY}`;
    activeActualGptOreKeys.add(spriteKey);
    let sprite = scene.actualGptOreSpritesByKey.get(spriteKey);
    if (!sprite) {
      sprite = scene.add.image(stampCx, stampCy, stamp.assetKey).setOrigin(0.5).setDepth(0.825);
      scene.actualGptOreSpritesByKey.set(spriteKey, sprite);
    }
    sprite
      .setTexture(stamp.assetKey)
      .setVisible(true)
      .setPosition(stampCx, stampCy)
      .setDisplaySize(targetWidth, targetHeight)
      .setRotation(stampAngle)
      .setAlpha(tile === 'ruby' || tile === 'abyssalCrown' ? 1 : isArtifact ? 0.98 : 0.99)
      .clearTint();
    updateActualGptOreMask(scene, spriteKey, tile, deposit, stampCx, stampCy, targetWidth, targetHeight, stampAngle);

    drawActualGptStampOverburden(scene, tile, deposit, stampCx, stampCy, targetWidth, targetHeight, stampAngle, longRadius, shortRadius, facet, glow, dark);

    for (const [sourceX, sourceY, sourceSize, sourceColor, sourceAlpha] of stamp.samples) {
      if (sourceAlpha < 180 || hash(sourceX + deposit.rootX, sourceY + deposit.rootY, rng.seed + 3327) < 0.72) continue;
      const point = stampLocalPoint(stampCx, stampCy, stampAngle, sourceX * xScale, sourceY * yScale);
      const alpha = Phaser.Math.Clamp((sourceAlpha / 255) * 0.38, 0.06, 0.42);
      const width = Math.max(1.2, sourceSize * sampleScale * sampleW);
      const height = Math.max(0.9, sourceSize * sampleScale * sampleH);
      const dotAngle = stampAngle + (hash(sourceX + deposit.rootX, sourceY + deposit.rootY, rng.seed + 3321) - 0.5) * 0.34;
      if (tile !== 'copper' || sourceAlpha > 210 || hash(sourceX, sourceY, rng.seed + 3331) > 0.58) {
        scene.terrainEdges.lineStyle(0.75, glow, alpha * (tile === 'ruby' || tile === 'abyssalCrown' ? 0.42 : 0.3));
        scene.terrainEdges.lineBetween(
          point.x - Math.cos(dotAngle) * width * 0.28,
          point.y - Math.sin(dotAngle) * width * 0.28,
          point.x + Math.cos(dotAngle) * width * 0.32,
          point.y + Math.sin(dotAngle) * width * 0.32,
        );
      }
    }

    if (isArtifact) {
      scene.terrainEdges.lineStyle(1.25, glow, 0.2);
      scene.terrainEdges.lineBetween(
        stampCx - Math.cos(stampAngle) * longRadius * 0.64,
        stampCy - Math.sin(stampAngle) * longRadius * 0.64,
        stampCx + Math.cos(stampAngle) * longRadius * 0.58,
        stampCy + Math.sin(stampAngle) * longRadius * 0.58,
      );
    }
    scene.terrainEdges.fillStyle(facet, tile === 'ruby' || tile === 'abyssalCrown' ? 0.16 : 0.11);
    scene.terrainEdges.fillCircle(
      stampCx + Math.cos(stampAngle) * longRadius * 0.2,
      stampCy + Math.sin(stampAngle) * longRadius * 0.2,
      isArtifact ? 1.7 : 1.2,
    );
  }

function updateActualGptOreMask(
  scene: DeepdiveScene,
  spriteKey: string,
  tile: ActualGptOreTile,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  targetWidth: number,
  targetHeight: number,
  angle: number,
) {
    let entry = scene.actualGptOreMasksByKey.get(spriteKey);
    if (!entry) {
      const graphics = scene.add.graphics().setDepth(0.835).setVisible(false);
      const mask = graphics.createGeometryMask();
      entry = { graphics, mask };
      scene.actualGptOreMasksByKey.set(spriteKey, entry);
    }
    const artifact = tile === 'precursorEngine'
      || tile === 'relic'
      || tile === 'drownedIdol'
      || tile === 'abyssalCrown'
      || tile === 'alienAlloy'
      || tile === 'ruinCore';
    const profile = actualGptEmbeddingProfile(tile);
    const count = artifact ? 13 : tile === 'ruby' ? 9 : 10;
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i += 1) {
      const theta = (i / count) * Math.PI * 2;
      const chip = 0.66 + hash(deposit.rootX * 491 + i * 17, deposit.rootY * 499 - i * 19, rng.seed + 3451) * (artifact ? 0.26 : 0.24);
      const notch = hash(i * 503, deposit.rootX, rng.seed + 3453) > (artifact ? 0.68 : 0.76) ? 0.42 : 1;
      const bury = Math.sin(theta) > 0.22 ? 0.64 : Math.sin(theta) < -0.35 ? 0.82 : 1;
      const sx = Math.cos(theta) * targetWidth * profile.maskX * chip * notch;
      const sy = Math.sin(theta) * targetHeight * profile.maskY * (0.78 + hash(deposit.rootY, i * 509, rng.seed + 3455) * 0.28) * notch * bury;
      points.push(stampLocalPoint(cx, cy, angle, sx, sy));
    }
    entry.graphics.clear();
    entry.graphics.fillStyle(0xffffff, 1);
    entry.graphics.beginPath();
    entry.graphics.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) entry.graphics.lineTo(point.x, point.y);
    entry.graphics.closePath();
    entry.graphics.fillPath();

    const sprite = scene.actualGptOreSpritesByKey.get(spriteKey);
    sprite?.setMask(entry.mask);
  }

function drawActualGptStampOverburden(
  scene: DeepdiveScene,
  tile: ActualGptOreTile,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  targetWidth: number,
  targetHeight: number,
  angle: number,
  longRadius: number,
  shortRadius: number,
  facet: number,
  glow: number,
  dark: number,
) {
    const graphics = scene.oreOverburden;
    const isArtifact = tile === 'precursorEngine'
      || tile === 'relic'
      || tile === 'drownedIdol'
      || tile === 'abyssalCrown'
      || tile === 'alienAlloy'
      || tile === 'ruinCore';
    const profile = actualGptEmbeddingProfile(tile);
    const lips = isArtifact ? 12 : tile === 'copper' || tile === 'cobalt' ? 10 : 8;
    const host = hostRockPaletteForDeposit(scene, deposit, tile);
    const contactAlpha = profile.contact;

    drawActualGptContactSlot(graphics, tile, deposit, cx, cy, targetWidth, targetHeight, angle, host.shadow, dark);
    drawActualGptTerrainCaps(graphics, tile, deposit, cx, cy, targetWidth, targetHeight, angle, host.mid, host.dark, host.rim);
    drawActualGptCrossBites(graphics, tile, deposit, cx, cy, targetWidth, targetHeight, angle, host.mid, host.dark, host.rim);
    drawActualGptTargetedEmbedding(graphics, tile, deposit, cx, cy, targetWidth, targetHeight, angle, host.mid, host.dark, host.rim, glow);

    for (let i = 0; i < lips; i += 1) {
      const edge = hash(i * 443, deposit.rootX, rng.seed + 3421) > 0.5 ? -1 : 1;
      const t = hash(deposit.rootX * 449 + i, deposit.rootY * 457, rng.seed + 3423) - 0.5;
      const localX = t * targetWidth * 0.72;
      const localY = edge * targetHeight * (0.22 + hash(i, deposit.rootY, rng.seed + 3425) * 0.34);
      const center = stampLocalPoint(cx, cy, angle, localX, localY);
      const lipAngle = angle + (edge < 0 ? -0.1 : 0.1) + (hash(i * 461, deposit.rootX, rng.seed + 3427) - 0.5) * 1.25;
      const lipLength = targetWidth * (0.22 + hash(deposit.rootY, i * 463, rng.seed + 3429) * (isArtifact ? 0.34 : 0.28));
      graphics.lineStyle(isArtifact ? 8.8 : 6.2, 0x010306, contactAlpha);
      graphics.lineBetween(
        center.x - Math.cos(lipAngle) * lipLength * 0.48 + 1.1,
        center.y - Math.sin(lipAngle) * lipLength * 0.48 + 1.2,
        center.x + Math.cos(lipAngle) * lipLength * 0.52 + 1.1,
        center.y + Math.sin(lipAngle) * lipLength * 0.52 + 1.2,
      );
      graphics.lineStyle(isArtifact ? 4.1 : 2.65, i % 3 === 0 ? host.rim : host.mid, 0.9);
      graphics.lineBetween(
        center.x - Math.cos(lipAngle) * lipLength * 0.4,
        center.y - Math.sin(lipAngle) * lipLength * 0.4,
        center.x + Math.cos(lipAngle) * lipLength * 0.42,
        center.y + Math.sin(lipAngle) * lipLength * 0.42,
      );
    }

    const chips = isArtifact ? 9 : 7;
    for (let i = 0; i < chips; i += 1) {
      const theta = hash(i * 467, deposit.rootX, rng.seed + 3431) * Math.PI * 2;
      const rx = targetWidth * (0.32 + hash(deposit.rootY, i, rng.seed + 3433) * 0.28);
      const ry = targetHeight * (0.28 + hash(i, deposit.rootY, rng.seed + 3435) * 0.34);
      const center = stampLocalPoint(cx, cy, angle, Math.cos(theta) * rx, Math.sin(theta) * ry);
      const chipAngle = angle + theta * 0.35 + (hash(i, deposit.rootX, rng.seed + 3437) - 0.5) * 0.9;
      const chipLong = 2.2 + hash(i * 479, deposit.rootY, rng.seed + 3439) * (isArtifact ? 5.6 : 4.2);
      const chipShort = 1.4 + hash(deposit.rootX, i * 487, rng.seed + 3441) * (isArtifact ? 3 : 2.2);
      drawOrePlate(graphics, center.x, center.y, chipLong, chipShort, chipAngle, i % 2 ? host.mid : host.dark, facet, isArtifact ? 0.68 : 0.58);
    }

    const upper = stampLocalPoint(cx, cy, angle, -targetWidth * 0.08, -targetHeight * 0.42);
    drawJaggedRockCap(graphics, upper.x, upper.y, targetWidth * 0.36, Math.max(3, targetHeight * 0.16), angle + 0.05, deposit.rootX + 23, deposit.rootY + 29, host.dark, host.rim, -1);
    graphics.lineStyle(1.1, glow, tile === 'ruinCore' || tile === 'alienAlloy' ? 0.2 : 0.1);
    graphics.lineBetween(
      cx - Math.cos(angle) * longRadius * 0.72,
      cy - Math.sin(angle) * longRadius * 0.72,
      cx + Math.cos(angle) * longRadius * 0.46,
      cy + Math.sin(angle) * longRadius * 0.46,
    );
    const lower = stampLocalPoint(cx, cy, angle, targetWidth * 0.08, targetHeight * 0.46);
    drawJaggedRockCap(graphics, lower.x, lower.y, targetWidth * 0.42, Math.max(3.4, targetHeight * 0.2), angle - 0.08, deposit.rootX - 19, deposit.rootY + 31, host.mid, host.rim, 1);
  }

function hostRockPaletteForDeposit(scene: DeepdiveScene, deposit: ReturnType<typeof oreDepositComponent>, tile: Tile) {
    const candidates = [
      { x: deposit.minX - 1, y: deposit.minY },
      { x: deposit.maxX + 1, y: deposit.minY },
      { x: deposit.minX, y: deposit.minY - 1 },
      { x: deposit.maxX, y: deposit.maxY + 1 },
      { x: deposit.rootX - 1, y: deposit.rootY + 1 },
      { x: deposit.rootX + 1, y: deposit.rootY + 1 },
    ];
    const hostTile = candidates
      .map((candidate) => scene.getTile(candidate.x, candidate.y))
      .find((candidate) => candidate !== 'water' && candidate !== tile) ?? (deposit.maxY > WORLD_H * 0.7 ? 'sand' : 'stone');
    const y = Math.max(0, deposit.rootY);
    const actualGpt = isActualGptOreTile(tile);
    const mid = actualGpt
      ? hostTile === 'sand' ? 0x4c4938 : 0x31434a
      : terrainBodyColor(hostTile, y);
    const dark = hostTile === 'sand' ? 0x211d17 : 0x111a20;
    const rim = actualGpt
      ? hostTile === 'sand' ? 0x7a7354 : 0x60747d
      : hostTile === 'sand' ? 0x5b513b : 0x26343b;
    return { mid, dark, rim, shadow: 0x010306 };
  }

function drawActualGptContactSlot(
  graphics: Phaser.GameObjects.Graphics,
  tile: ActualGptOreTile,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  targetWidth: number,
  targetHeight: number,
  angle: number,
  shadow: number,
  dark: number,
) {
    const artifact = tile === 'precursorEngine'
      || tile === 'relic'
      || tile === 'drownedIdol'
      || tile === 'abyssalCrown'
      || tile === 'alienAlloy'
      || tile === 'ruinCore';
    const profile = actualGptEmbeddingProfile(tile);
    const points = orePocketPoints(
      cx,
      cy,
      targetWidth * (artifact ? 0.46 : 0.43),
      targetHeight * (artifact ? 0.34 : 0.32),
      angle,
      deposit.rootX + 71,
      deposit.rootY - 79,
      tile,
    );
    drawPocketShape(graphics, points, shadow, 0.2 + profile.contact * 0.2, 1.2, 1.5);
    drawPocketShape(graphics, points, dark, 0.1 + profile.contact * 0.12, 0, 0);
  }

function drawActualGptTerrainCaps(
  graphics: Phaser.GameObjects.Graphics,
  tile: ActualGptOreTile,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  targetWidth: number,
  targetHeight: number,
  angle: number,
  hostMid: number,
  hostDark: number,
  hostRim: number,
) {
    const profile = actualGptEmbeddingProfile(tile);
    const capCount = profile.capCount;
    for (let i = 0; i < capCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const centerT = (i / Math.max(1, capCount - 1) - 0.5) * 0.92
        + (hash(deposit.rootX * 541 + i, deposit.rootY, rng.seed + 3501) - 0.5) * 0.22;
      const centerS = side * (0.26 + hash(i, deposit.rootY, rng.seed + 3503) * 0.28);
      const center = stampLocalPoint(cx, cy, angle, centerT * targetWidth, centerS * targetHeight);
      const long = targetWidth * (0.18 + hash(i * 547, deposit.rootX, rng.seed + 3505) * profile.capReach * 0.26);
      const short = targetHeight * (0.13 + hash(deposit.rootY, i * 557, rng.seed + 3507) * 0.14);
      const capAngle = angle + (hash(i * 563, deposit.rootY, rng.seed + 3509) - 0.5) * 0.86;
      drawJaggedRockCap(graphics, center.x, center.y, long, short, capAngle, deposit.rootX + i * 3, deposit.rootY - i * 5, i % 3 ? hostMid : hostDark, hostRim, side);
    }
  }

function drawActualGptCrossBites(
  graphics: Phaser.GameObjects.Graphics,
  tile: ActualGptOreTile,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  targetWidth: number,
  targetHeight: number,
  angle: number,
  hostMid: number,
  hostDark: number,
  hostRim: number,
) {
    const artifact = tile === 'precursorEngine'
      || tile === 'relic'
      || tile === 'drownedIdol'
      || tile === 'abyssalCrown'
      || tile === 'alienAlloy'
      || tile === 'ruinCore';
    const biteCount = artifact ? 5 : 3;
    for (let i = 0; i < biteCount; i += 1) {
      const side = i % 2 === 0 ? 1 : -1;
      const t = (i / Math.max(1, biteCount - 1) - 0.5) * 0.82
        + (hash(deposit.rootX + i * 601, deposit.rootY, rng.seed + 3591) - 0.5) * 0.16;
      const s = side * (0.08 + hash(i, deposit.rootY, rng.seed + 3593) * 0.28);
      const center = stampLocalPoint(cx, cy, angle, t * targetWidth, s * targetHeight);
      const long = targetWidth * (artifact ? 0.18 : 0.12) * (0.82 + hash(i, deposit.rootX, rng.seed + 3595) * 0.5);
      const short = targetHeight * (artifact ? 0.18 : 0.12) * (0.9 + hash(deposit.rootY, i, rng.seed + 3597) * 0.48);
      drawJaggedRockCap(
        graphics,
        center.x,
        center.y,
        long,
        short,
        angle + (hash(i * 607, deposit.rootY, rng.seed + 3599) - 0.5) * 1.1,
        deposit.rootX + i * 17,
        deposit.rootY - i * 19,
        i % 3 === 0 ? hostDark : hostMid,
        hostRim,
        side,
      );
    }
  }

function drawActualGptTargetedEmbedding(
  graphics: Phaser.GameObjects.Graphics,
  tile: ActualGptOreTile,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  targetWidth: number,
  targetHeight: number,
  angle: number,
  hostMid: number,
  hostDark: number,
  hostRim: number,
  glow: number,
) {
    const lowerSide = tile === 'abyssalCrown' || tile === 'drownedIdol' || tile === 'relic' ? 1 : -1;
    if (tile === 'abyssalCrown') {
      const base = stampLocalPoint(cx, cy, angle, 0, targetHeight * 0.28);
      drawJaggedRockCap(graphics, base.x, base.y, targetWidth * 0.54, targetHeight * 0.24, angle, deposit.rootX + 101, deposit.rootY + 103, hostMid, hostRim, 1);
      for (let i = 0; i < 5; i += 1) {
        const t = i / 4 - 0.5;
        const tip = stampLocalPoint(cx, cy, angle, t * targetWidth * 0.58, -targetHeight * (0.12 + Math.abs(t) * 0.18));
        drawOrePlate(graphics, tip.x, tip.y, targetWidth * 0.045, targetHeight * 0.11, angle + Math.PI * 0.5 + t * 0.35, hostDark, hostRim, 0.86);
      }
    } else if (tile === 'drownedIdol') {
      const left = stampLocalPoint(cx, cy, angle, -targetWidth * 0.36, -targetHeight * 0.02);
      const right = stampLocalPoint(cx, cy, angle, targetWidth * 0.36, targetHeight * 0.05);
      drawJaggedRockCap(graphics, left.x, left.y, targetWidth * 0.18, targetHeight * 0.28, angle + Math.PI * 0.48, deposit.rootX + 109, deposit.rootY, hostDark, hostRim, -1);
      drawJaggedRockCap(graphics, right.x, right.y, targetWidth * 0.2, targetHeight * 0.3, angle + Math.PI * 0.48, deposit.rootX - 113, deposit.rootY, hostMid, hostRim, 1);
    } else if (tile === 'ruinCore') {
      for (let i = 0; i < 6; i += 1) {
        const crackAngle = angle + (i - 2.5) * 0.28;
        const start = stampLocalPoint(cx, cy, angle, (hash(i, deposit.rootX, rng.seed + 3561) - 0.5) * targetWidth * 0.5, (hash(deposit.rootY, i, rng.seed + 3563) - 0.5) * targetHeight * 0.5);
        graphics.lineStyle(2.5, 0x010306, 0.38);
        graphics.lineBetween(start.x, start.y, start.x + Math.cos(crackAngle) * targetWidth * 0.28, start.y + Math.sin(crackAngle) * targetWidth * 0.28);
        graphics.lineStyle(0.9, glow, 0.25);
        graphics.lineBetween(start.x, start.y, start.x + Math.cos(crackAngle) * targetWidth * 0.2, start.y + Math.sin(crackAngle) * targetWidth * 0.2);
      }
    } else if (tile === 'precursorEngine') {
      for (let i = 0; i < 5; i += 1) {
        const t = i / 4 - 0.5;
        const p = stampLocalPoint(cx, cy, angle, t * targetWidth * 0.68, (hash(i, deposit.rootY, rng.seed + 3571) - 0.5) * targetHeight * 0.5);
        drawJaggedRockCap(graphics, p.x, p.y, targetWidth * 0.11, targetHeight * 0.15, angle + t * 0.7, deposit.rootX + i * 11, deposit.rootY - i * 13, i % 2 ? hostMid : hostDark, hostRim, i % 2 ? 1 : -1);
      }
    } else if (tile === 'alienAlloy') {
      for (let i = 0; i < 5; i += 1) {
        const t = hash(i, deposit.rootX, rng.seed + 3581) - 0.5;
        const s = hash(deposit.rootY, i, rng.seed + 3583) - 0.5;
        const p = stampLocalPoint(cx, cy, angle, t * targetWidth * 0.68, s * targetHeight * 0.62);
        drawOrePlate(graphics, p.x, p.y, targetWidth * (0.08 + Math.abs(t) * 0.04), targetHeight * 0.065, angle + (hash(i, deposit.rootY, rng.seed + 3585) - 0.5) * 1.2, i % 2 ? hostMid : hostDark, hostRim, 0.8);
      }
    } else if (tile === 'relic') {
      const shelf = stampLocalPoint(cx, cy, angle, -targetWidth * 0.04, targetHeight * 0.18);
      drawJaggedRockCap(graphics, shelf.x, shelf.y, targetWidth * 0.46, targetHeight * 0.18, angle + 0.18, deposit.rootX + 127, deposit.rootY - 131, hostMid, hostRim, lowerSide);
      graphics.lineStyle(1.1, glow, 0.22);
      const a = stampLocalPoint(cx, cy, angle, -targetWidth * 0.22, -targetHeight * 0.08);
      const b = stampLocalPoint(cx, cy, angle, targetWidth * 0.12, targetHeight * 0.12);
      graphics.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

function drawJaggedRockCap(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  seedX: number,
  seedY: number,
  color: number,
  rim: number,
  side: number,
) {
    const points: Array<{ x: number; y: number }> = [];
    const count = 7;
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1) - 0.5;
      const bite = 0.76 + hash(seedX * 569 + i, seedY * 571 - i, rng.seed + 3511) * 0.34;
      const localX = t * longRadius * 2 * bite;
      const localY = side * shortRadius * (i === 0 || i === count - 1 ? 0.2 : 0.82 + hash(i, seedX, rng.seed + 3513) * 0.34);
      points.push(stampLocalPoint(cx, cy, angle, localX, localY));
    }
    points.push(stampLocalPoint(cx, cy, angle, longRadius * 0.56, -side * shortRadius * 0.55));
    points.push(stampLocalPoint(cx, cy, angle, -longRadius * 0.6, -side * shortRadius * 0.46));
    drawPocketShape(graphics, points, 0x010306, 0.44, 1.2, 1.4);
    drawPocketShape(graphics, points, color, 0.92, 0, 0);
    graphics.lineStyle(1.2, rim, 0.46);
    graphics.lineBetween(points[0].x, points[0].y, points[count - 1].x, points[count - 1].y);
  }

function drawStampPlate(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  seedX: number,
  seedY: number,
  color: number,
  facet: number,
  alpha: number,
) {
    const points = orePocketPoints(cx, cy, longRadius, shortRadius, angle, seedX, seedY, 'quartz');
    drawPocketShape(graphics, points, 0x010306, alpha * 0.82, 1.1, 1.4);
    drawPocketShape(graphics, points, color, alpha, 0, 0);
    graphics.lineStyle(1, facet, alpha * 0.42);
    graphics.lineBetween(
      cx - Math.cos(angle) * longRadius * 0.34,
      cy - Math.sin(angle) * longRadius * 0.34,
      cx + Math.cos(angle) * longRadius * 0.24,
      cy + Math.sin(angle) * longRadius * 0.24,
    );
  }

function drawCopperStampOre(
  scene: DeepdiveScene,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  color: number,
  facet: number,
  glow: number,
  dark: number,
) {
    const count = Math.min(22, 10 + deposit.cells.length * 2);
    for (let i = 0; i < count; i += 1) {
      const t = hash(deposit.rootX * 277 + i * 17, deposit.rootY * 281, rng.seed + 3001) - 0.5;
      const s = hash(deposit.rootY * 283, deposit.rootX * 287 + i * 19, rng.seed + 3003) - 0.5;
      const center = stampLocalPoint(cx, cy, angle, t * longRadius * 1.34, s * shortRadius * 1.16);
      const seamAngle = angle + (hash(i * 29, deposit.rootX, rng.seed + 3005) - 0.5) * 1.35;
      const fleckLength = longRadius * (0.08 + hash(i * 31, deposit.rootY, rng.seed + 3007) * 0.18);
      const fleckWidth = 1.2 + hash(deposit.rootY, i * 37, rng.seed + 3009) * 2.1;
      const useOxide = i % 5 === 0 || hash(i, deposit.rootX, rng.seed + 3011) > 0.78;
      drawStampPlate(
        scene.terrainEdges,
        center.x,
        center.y,
        fleckLength,
        fleckWidth,
        seamAngle,
        deposit.rootX + i,
        deposit.rootY - i,
        useOxide ? 0x47724f : (i % 3 === 0 ? facet : color),
        useOxide ? 0x8ed29b : glow,
        useOxide ? 0.24 : 0.32,
      );
    }
    for (let i = 0; i < 7; i += 1) {
      const center = stampLocalPoint(
        cx,
        cy,
        angle,
        (hash(i * 41, deposit.rootX, rng.seed + 3021) - 0.5) * longRadius * 1.12,
        (hash(deposit.rootY, i * 43, rng.seed + 3023) - 0.5) * shortRadius * 1.22,
      );
      scene.terrainEdges.fillStyle(i % 2 ? 0x315f45 : 0x6b3f22, i % 2 ? 0.24 : 0.34);
      scene.terrainEdges.fillEllipse(center.x, center.y, 3.2 + hash(i, deposit.rootX, rng.seed + 3025) * 5.4, 1.4 + hash(deposit.rootY, i, rng.seed + 3027) * 3.1);
    }
    scene.terrainEdges.lineStyle(1.1, glow, 0.12);
    scene.terrainEdges.lineBetween(
      cx - Math.cos(angle) * longRadius * 0.82,
      cy - Math.sin(angle) * longRadius * 0.82,
      cx + Math.cos(angle) * longRadius * 0.42,
      cy + Math.sin(angle) * longRadius * 0.42,
    );
    scene.terrainEdges.fillStyle(dark, 0.18);
    scene.terrainEdges.fillEllipse(cx, cy, longRadius * 0.92, shortRadius * 0.42);
  }

function drawRubyStampOre(
  scene: DeepdiveScene,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  color: number,
  facet: number,
  glow: number,
  dark: number,
) {
    const slivers = Math.min(9, 4 + deposit.cells.length);
    for (let i = 0; i < slivers; i += 1) {
      const center = stampLocalPoint(
        cx,
        cy,
        angle,
        (i / Math.max(1, slivers - 1) - 0.5) * longRadius * 1.38 + (hash(i, deposit.rootX, rng.seed + 3101) - 0.5) * longRadius * 0.24,
        (hash(deposit.rootY, i, rng.seed + 3103) - 0.5) * shortRadius * 1.18,
      );
      const sliverAngle = angle + (hash(i * 47, deposit.rootX, rng.seed + 3105) - 0.5) * 0.74;
      const length = longRadius * (0.24 + hash(i * 53, deposit.rootY, rng.seed + 3107) * 0.42);
      const width = shortRadius * (0.12 + hash(deposit.rootX, i * 59, rng.seed + 3109) * 0.18);
      const p1 = stampLocalPoint(center.x, center.y, sliverAngle, -length * 0.58, -width * 0.22);
      const p2 = stampLocalPoint(center.x, center.y, sliverAngle, -length * 0.12, -width);
      const p3 = stampLocalPoint(center.x, center.y, sliverAngle, length * 0.58, -width * 0.12);
      const p4 = stampLocalPoint(center.x, center.y, sliverAngle, length * 0.22, width * 0.82);
      const p5 = stampLocalPoint(center.x, center.y, sliverAngle, -length * 0.48, width * 0.46);
      drawPocketShape(scene.terrainEdges, [p1, p2, p3, p4, p5], 0x010306, 0.42, 1, 1.2);
      drawPocketShape(scene.terrainEdges, [p1, p2, p3, p4, p5], i % 3 === 0 ? facet : color, 0.34, 0, 0);
      scene.terrainEdges.lineStyle(1.1, glow, i % 3 === 0 ? 0.34 : 0.22);
      scene.terrainEdges.lineBetween(p1.x, p1.y, p3.x, p3.y);
    }
    for (let i = 0; i < 5; i += 1) {
      const offset = (hash(i, deposit.rootY, rng.seed + 3121) - 0.5) * shortRadius * 1.44;
      const start = stampLocalPoint(cx, cy, angle, -longRadius * (0.65 + hash(i, deposit.rootX, rng.seed + 3123) * 0.22), offset);
      const end = stampLocalPoint(cx, cy, angle, longRadius * (0.48 + hash(deposit.rootY, i, rng.seed + 3125) * 0.28), offset + (hash(i * 61, deposit.rootX, rng.seed + 3127) - 0.5) * shortRadius * 0.62);
      scene.terrainEdges.lineStyle(3.8, 0x010306, 0.34);
      scene.terrainEdges.lineBetween(start.x + 1, start.y + 1, end.x + 1, end.y + 1);
      scene.terrainEdges.lineStyle(1.1, i % 2 ? color : glow, 0.26);
      scene.terrainEdges.lineBetween(start.x, start.y, end.x, end.y);
    }
    scene.terrainEdges.fillStyle(dark, 0.18);
    scene.terrainEdges.fillEllipse(cx, cy, longRadius * 0.88, shortRadius * 0.34);
  }

function drawPrecursorEngineStampOre(
  scene: DeepdiveScene,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  color: number,
  facet: number,
  glow: number,
  dark: number,
) {
    const radius = Math.min(longRadius * 0.64, TILE * 0.98);
    const arcCount = 3 + Math.min(2, deposit.cells.length);
    for (let i = 0; i < arcCount; i += 1) {
      const arcRadius = radius * (0.44 + i * 0.18 + hash(i, deposit.rootX, rng.seed + 3201) * 0.1);
      const start = angle + hash(i * 67, deposit.rootY, rng.seed + 3203) * Math.PI * 1.2 - Math.PI * 0.72;
      const end = start + Math.PI * (0.34 + hash(deposit.rootX, i * 71, rng.seed + 3205) * 0.42);
      scene.terrainEdges.lineStyle(5.6, 0x010306, 0.38);
      scene.terrainEdges.beginPath();
      scene.terrainEdges.arc(cx + 1.2, cy + 1.4, arcRadius, start, end, false);
      scene.terrainEdges.strokePath();
      scene.terrainEdges.lineStyle(i % 2 ? 2.2 : 2.8, i % 2 ? glow : color, i % 2 ? 0.28 : 0.34);
      scene.terrainEdges.beginPath();
      scene.terrainEdges.arc(cx, cy, arcRadius, start, end, false);
      scene.terrainEdges.strokePath();
    }
    for (let i = 0; i < 7; i += 1) {
      if (hash(i, deposit.rootX, rng.seed + 3211) < 0.28) continue;
      const spoke = angle + i * Math.PI * 0.31 + (hash(i * 73, deposit.rootY, rng.seed + 3213) - 0.5) * 0.24;
      const inner = radius * (0.16 + hash(deposit.rootX, i, rng.seed + 3215) * 0.18);
      const outer = radius * (0.64 + hash(i, deposit.rootY, rng.seed + 3217) * 0.32);
      scene.terrainEdges.lineStyle(3.4, 0x010306, 0.36);
      scene.terrainEdges.lineBetween(cx + Math.cos(spoke) * inner + 1, cy + Math.sin(spoke) * inner + 1, cx + Math.cos(spoke) * outer + 1, cy + Math.sin(spoke) * outer + 1);
      scene.terrainEdges.lineStyle(1.35, i % 2 ? facet : glow, 0.34);
      scene.terrainEdges.lineBetween(cx + Math.cos(spoke) * inner, cy + Math.sin(spoke) * inner, cx + Math.cos(spoke) * outer, cy + Math.sin(spoke) * outer);
    }
    for (let i = 0; i < 6; i += 1) {
      const chipAngle = angle + i * Math.PI * 0.42 + hash(i, deposit.rootX, rng.seed + 3221) * 0.22;
      const center = stampLocalPoint(cx, cy, chipAngle, radius * (0.58 + hash(i, deposit.rootY, rng.seed + 3223) * 0.34), (hash(deposit.rootX, i, rng.seed + 3225) - 0.5) * shortRadius * 0.28);
      drawStampPlate(
        scene.terrainEdges,
        center.x,
        center.y,
        4.8 + hash(i, deposit.rootX, rng.seed + 3227) * 7.2,
        1.8 + hash(deposit.rootY, i, rng.seed + 3229) * 2.4,
        chipAngle + Math.PI * 0.5,
        deposit.rootX - i,
        deposit.rootY + i,
        i % 2 ? color : dark,
        glow,
        i % 2 ? 0.34 : 0.28,
      );
    }
    scene.terrainEdges.fillStyle(0x11383a, 0.16);
    scene.terrainEdges.fillEllipse(cx, cy, radius * 1.08, shortRadius * 0.58);
    scene.terrainEdges.fillStyle(facet, 0.18);
    scene.terrainEdges.fillCircle(cx - Math.cos(angle) * radius * 0.12, cy - Math.sin(angle) * radius * 0.12, radius * 0.13);
  }

function drawCommonStrataOre(scene: DeepdiveScene, tile: Tile, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, color: number, facet: number, glow: number, dark: number) {
    const strata = tile === 'copper' ? 9 : tile === 'cobalt' ? 7 : tile === 'ruby' ? 5 : 6;
    const widthScale = tile === 'quartz' ? 0.64 : tile === 'ruby' ? 0.36 : tile === 'cobalt' ? 0.48 : 0.78;
    for (let i = 0; i < strata; i += 1) {
      const t = (i / Math.max(1, strata - 1) - 0.5) * 1.5;
      const offset = t * shortRadius;
      const length = longRadius * (0.42 + hash(i * 19, Math.round(cx), rng.seed + 1701) * widthScale);
      const wiggle = (hash(Math.round(cy), i * 23, rng.seed + 1703) - 0.5) * shortRadius * 0.35;
      const px = cx - Math.sin(angle) * offset + Math.cos(angle) * wiggle;
      const py = cy + Math.cos(angle) * offset + Math.sin(angle) * wiggle;
      const alpha = tile === 'copper' ? 0.22 : tile === 'cobalt' ? 0.18 : tile === 'ruby' ? 0.26 : tile === 'quartz' ? 0.32 : 0.28;
      const lineColor = tile === 'quartz' && i % 3 === 0 ? facet : i % 2 === 0 ? color : dark;
      scene.terrainEdges.lineStyle(tile === 'copper' ? 1.2 : tile === 'quartz' ? 2.4 : 1.6, lineColor, alpha);
      scene.terrainEdges.lineBetween(
        px - Math.cos(angle) * length * 0.5,
        py - Math.sin(angle) * length * 0.5,
        px + Math.cos(angle) * length * 0.5,
        py + Math.sin(angle) * length * 0.5,
      );
    }
    if (tile === 'cobalt') {
      scene.terrainEdges.fillStyle(glow, 0.115);
      scene.terrainEdges.fillEllipse(cx, cy, longRadius * 1.18, shortRadius * 1.28);
    }
    const facetCount = tile === 'copper' ? 3 : tile === 'ruby' ? 4 : tile === 'quartz' ? 5 : 4;
    for (let i = 0; i < facetCount; i += 1) {
      const t = hash(i * 31, Math.round(cx), rng.seed + 1711) - 0.5;
      const side = hash(Math.round(cy), i * 37, rng.seed + 1713) - 0.5;
      const px = cx + Math.cos(angle) * t * longRadius * 1.15 - Math.sin(angle) * side * shortRadius * 0.96;
      const py = cy + Math.sin(angle) * t * longRadius * 1.15 + Math.cos(angle) * side * shortRadius * 0.96;
      drawOrePlate(scene.terrainEdges, px, py, tile === 'ruby' ? 6 : 8, tile === 'quartz' ? 3.8 : 2.8, angle + (hash(i, Math.round(cx), rng.seed + 1717) - 0.5) * 0.75, tile === 'copper' ? dark : color, facet, tile === 'quartz' ? 0.46 : 0.34);
    }
  }

function drawShapeFirstEmbeddedOre(
  scene: DeepdiveScene,
  tile: Tile,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  color: number,
  facet: number,
  glow: number,
  dark: number,
) {
    const graphics = scene.terrainEdges;
    const host = hostRockPaletteForDeposit(scene, deposit, tile);
    const readColor = shapeFirstOreReadColor(tile, color);
    const readFacet = shapeFirstOreReadFacet(tile, facet);
    const readGlow = shapeFirstOreReadGlow(tile, glow);
    const readDark = shapeFirstOreReadDark(tile, dark);
    const bodyLong = longRadius * 0.98;
    const bodyShort = shortRadius * 1.06;
    const body = orePocketPoints(cx, cy, bodyLong, bodyShort, angle, deposit.rootX + 211, deposit.rootY - 223, tile);
    drawPocketShape(graphics, body, 0x010306, 0.76, 1.15, 1.35);
    drawPocketShape(graphics, body, host.mid, 0.62, 0.15, 0.05);
    drawPocketShape(graphics, body, host.dark, 0.5, 0, 0);
    graphics.lineStyle(1.3, host.rim, 0.38);
    for (let i = 0; i < body.length; i += 2) {
      const a = body[i];
      const b = body[(i + 1) % body.length];
      graphics.lineBetween(a.x, a.y, b.x, b.y);
    }

    drawOreContactShadows(graphics, deposit, cx, cy, bodyLong, bodyShort, angle, tile);
    drawDeepDiveOreInclusion(graphics, deposit, cx, cy, bodyLong, bodyShort, angle, readColor, readFacet, readGlow, readDark, tile);

    const capCount = 3;
    for (let i = 0; i < capCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const t = (i / Math.max(1, capCount - 1) - 0.5) * 0.72
        + (hash(deposit.rootX * 641 + i, deposit.rootY, rng.seed + 3901) - 0.5) * 0.1;
      const s = side * (0.42 + hash(i, deposit.rootY, rng.seed + 3903) * 0.1);
      const center = stampLocalPoint(cx, cy, angle, t * bodyLong, s * bodyShort);
      const lipLong = bodyLong * (0.12 + hash(i * 647, deposit.rootX, rng.seed + 3905) * 0.06);
      const lipShort = bodyShort * (0.16 + hash(deposit.rootY, i * 653, rng.seed + 3907) * 0.08);
      drawJaggedRockCap(
        graphics,
        center.x,
        center.y,
        lipLong,
        lipShort,
        angle + (hash(i * 659, deposit.rootY, rng.seed + 3909) - 0.5) * 0.92,
        deposit.rootX + i * 5,
        deposit.rootY - i * 7,
        i % 3 === 0 ? host.dark : host.mid,
        host.rim,
        side,
      );
    }
  }

function shapeFirstOreReadColor(tile: Tile, fallback: number) {
    if (tile === 'copper') return 0xff9a35;
    if (tile === 'quartz') return 0xeaffff;
    if (tile === 'ruby') return 0xff2d58;
    if (tile === 'cobalt') return 0x55b8ff;
    if (tile === 'sunstone') return 0xffc33c;
    if (tile === 'relic') return 0xb7ff5d;
    if (tile === 'alienAlloy') return 0x43ffd0;
    if (tile === 'drownedIdol') return 0xc9fff4;
    if (tile === 'precursorEngine') return 0xffd15d;
    if (tile === 'abyssalCrown') return 0xf879ff;
    if (tile === 'ruinCore') return 0xf0d5ff;
    return fallback;
  }

function shapeFirstOreReadFacet(tile: Tile, fallback: number) {
    if (tile === 'copper') return 0xffd37d;
    if (tile === 'quartz') return 0xffffff;
    if (tile === 'ruby') return 0xff9aaf;
    if (tile === 'cobalt') return 0xc6ecff;
    if (tile === 'sunstone') return 0xfff09c;
    if (tile === 'relic') return 0xe6ff9a;
    if (tile === 'alienAlloy') return 0xc4ffef;
    if (tile === 'drownedIdol') return 0xffffff;
    if (tile === 'precursorEngine') return 0x83fff0;
    if (tile === 'abyssalCrown') return 0xffc8ff;
    if (tile === 'ruinCore') return 0xffffff;
    return fallback;
  }

function shapeFirstOreReadGlow(tile: Tile, fallback: number) {
    if (tile === 'copper') return 0xffc15f;
    if (tile === 'quartz') return 0xf7ffff;
    if (tile === 'ruby') return 0xff6b86;
    if (tile === 'cobalt') return 0x8ff4ff;
    if (tile === 'sunstone') return 0xffe26d;
    if (tile === 'relic') return 0xd0ff78;
    if (tile === 'alienAlloy') return 0x73fbd3;
    if (tile === 'drownedIdol') return 0xdffff8;
    if (tile === 'precursorEngine') return 0x63e6d0;
    if (tile === 'abyssalCrown') return 0xff9cff;
    if (tile === 'ruinCore') return 0xe084ff;
    return fallback;
  }

function shapeFirstOreReadDark(tile: Tile, fallback: number) {
    if (tile === 'copper') return 0x321106;
    if (tile === 'quartz') return 0x14363a;
    if (tile === 'ruby') return 0x2c0613;
    if (tile === 'cobalt') return 0x06142d;
    if (tile === 'sunstone') return 0x3c2205;
    if (tile === 'relic') return 0x20350d;
    if (tile === 'alienAlloy') return 0x07372d;
    if (tile === 'drownedIdol') return 0x173333;
    if (tile === 'precursorEngine') return 0x2b240c;
    if (tile === 'abyssalCrown') return 0x351039;
    if (tile === 'ruinCore') return 0x2d163a;
    return fallback;
  }

function drawDeepDiveOreInclusion(
  graphics: Phaser.GameObjects.Graphics,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  color: number,
  facet: number,
  glow: number,
  dark: number,
  tile: Tile,
) {
    const count = tile === 'ruby' ? 4 : tile === 'copper' ? 5 : 5;
    for (let i = 0; i < count; i += 1) {
      const band = i % 3;
      const row = Math.floor(i / 3);
      const t = (band - 1) * 0.34
        + (row ? 0.14 : 0)
        + (hash(deposit.rootX + i * 811, deposit.rootY, rng.seed + 3971) - 0.5) * 0.18;
      const s = (row - 0.35) * 0.48
        + (hash(deposit.rootY, deposit.rootX + i * 823, rng.seed + 3973) - 0.5) * 0.34;
      const center = stampLocalPoint(cx, cy, angle, t * longRadius, s * shortRadius);
      const crystalAngle = angle + (band - 1) * 0.62 + (hash(i * 827, deposit.rootX, rng.seed + 3975) - 0.5) * 0.72;
      const crystalLong = longRadius * (0.18 + hash(i, deposit.rootY, rng.seed + 3977) * 0.14);
      const crystalShort = Math.max(1.8, shortRadius * (tile === 'ruby' ? 0.34 : 0.3));
      const fill = i === 0 ? facet : i % 2 === 0 ? glow : color;
      drawSharpOreSliver(graphics, center.x, center.y, crystalLong, crystalShort, crystalAngle, fill, facet, glow, dark, i);
      if (i % 2 === 1) {
        const chip = stampLocalPoint(center.x, center.y, crystalAngle, crystalLong * 0.14, crystalShort * 0.78);
        drawOreCrystalChip(graphics, chip.x, chip.y, crystalLong * 0.62, crystalShort * 0.82, crystalAngle - 0.78, i % 3 === 0 ? facet : color, glow, dark, i);
      }
    }
    graphics.lineStyle(1.15, glow, tile === 'ruby' ? 0.46 : 0.38);
    for (let i = 0; i < 2; i += 1) {
      const start = stampLocalPoint(cx, cy, angle, (i ? 0.18 : -0.36) * longRadius, (i ? 0.22 : -0.28) * shortRadius);
      const end = stampLocalPoint(start.x, start.y, angle + (i ? 0.95 : -0.72), longRadius * 0.28, 0);
      graphics.lineBetween(start.x, start.y, end.x, end.y);
    }
  }

function drawSharpOreSliver(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, color: number, facet: number, glow: number, dark: number, seed: number) {
    const tail = 0.6 + hash(seed * 829, Math.round(cx), rng.seed + 3981) * 0.18;
    const nose = 0.54 + hash(Math.round(cy), seed * 839, rng.seed + 3983) * 0.16;
    const p1 = stampLocalPoint(cx, cy, angle, -longRadius * tail, shortRadius * 0.2);
    const p2 = stampLocalPoint(cx, cy, angle, -longRadius * 0.22, -shortRadius * 0.95);
    const p3 = stampLocalPoint(cx, cy, angle, longRadius * nose, -shortRadius * 0.18);
    const p4 = stampLocalPoint(cx, cy, angle, longRadius * 0.12, shortRadius * 0.74);
    drawPocketShape(graphics, [p1, p2, p3, p4], 0x010306, 0.88, 1.05, 1.25);
    drawPocketShape(graphics, [p1, p2, p3, p4], dark, 0.46, 0.42, 0.52);
    drawPocketShape(graphics, [p1, p2, p3, p4], color, 0.98, 0, 0);
    graphics.lineStyle(1.08, facet, 0.92);
    graphics.lineBetween(p2.x, p2.y, p4.x, p4.y);
    graphics.lineStyle(0.82, glow, 0.64);
    graphics.lineBetween(p1.x, p1.y, p3.x, p3.y);
  }

function drawOreCrystalChip(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, color: number, glow: number, dark: number, seed: number) {
    const p1 = stampLocalPoint(cx, cy, angle, -longRadius * 0.48, shortRadius * 0.28);
    const p2 = stampLocalPoint(cx, cy, angle, longRadius * (0.1 + hash(seed, Math.round(cx), rng.seed + 3991) * 0.16), -shortRadius * 0.88);
    const p3 = stampLocalPoint(cx, cy, angle, longRadius * 0.54, shortRadius * 0.3);
    drawPocketShape(graphics, [p1, p2, p3], 0x010306, 0.82, 0.8, 1);
    drawPocketShape(graphics, [p1, p2, p3], dark, 0.42, 0.24, 0.28);
    drawPocketShape(graphics, [p1, p2, p3], color, 0.94, 0, 0);
    graphics.lineStyle(0.9, glow, 0.54);
    graphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
  }

function drawOreChunkNodule(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, color: number, facet: number, glow: number, dark: number) {
    const points = orePocketPoints(cx, cy, longRadius, shortRadius, angle, Math.round(cx), Math.round(cy), 'copper');
    drawPocketShape(graphics, points, 0x010306, 0.74, 1.5, 1.8);
    drawPocketShape(graphics, points, dark, 0.38, 0.8, 1);
    drawPocketShape(graphics, points, color, 0.92, 0, 0);
    graphics.lineStyle(Math.max(1.6, shortRadius * 0.22), facet, 0.72);
    graphics.lineBetween(cx - Math.cos(angle) * longRadius * 0.38, cy - Math.sin(angle) * longRadius * 0.38, cx + Math.cos(angle) * longRadius * 0.28, cy + Math.sin(angle) * longRadius * 0.28);
    graphics.fillStyle(glow, 0.58);
    graphics.fillEllipse(cx - Math.sin(angle) * shortRadius * 0.18, cy + Math.cos(angle) * shortRadius * 0.18, longRadius * 0.28, shortRadius * 0.22);
  }

function drawOreCrystalNodule(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, color: number, facet: number, glow: number, dark: number) {
    const p1 = stampLocalPoint(cx, cy, angle, -longRadius * 0.55, shortRadius * 0.28);
    const p2 = stampLocalPoint(cx, cy, angle, -longRadius * 0.18, -shortRadius * 0.72);
    const p3 = stampLocalPoint(cx, cy, angle, longRadius * 0.56, -shortRadius * 0.22);
    const p4 = stampLocalPoint(cx, cy, angle, longRadius * 0.26, shortRadius * 0.7);
    drawPocketShape(graphics, [p1, p2, p3, p4], 0x010306, 0.78, 1.4, 1.8);
    drawPocketShape(graphics, [p1, p2, p3, p4], dark, 0.36, 0.8, 1);
    drawPocketShape(graphics, [p1, p2, p3, p4], color, 0.92, 0, 0);
    graphics.lineStyle(1.35, facet, 0.74);
    graphics.lineBetween(p2.x, p2.y, p4.x, p4.y);
    graphics.lineStyle(0.85, glow, 0.48);
    graphics.lineBetween(p1.x, p1.y, p3.x, p3.y);
  }

function drawOreCoreNodule(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, radius: number, angle: number, color: number, facet: number, glow: number, dark: number) {
    graphics.fillStyle(0x010306, 0.76);
    graphics.fillCircle(cx + 1.4, cy + 1.8, radius * 1.08);
    graphics.fillStyle(dark, 0.72);
    graphics.fillCircle(cx + 0.7, cy + 0.8, radius * 0.96);
    graphics.fillStyle(color, 0.9);
    graphics.fillCircle(cx, cy, radius * 0.78);
    graphics.lineStyle(2.4, facet, 0.74);
    graphics.strokeCircle(cx, cy, radius * 0.46);
    graphics.lineStyle(1.5, glow, 0.68);
    graphics.lineBetween(cx - Math.cos(angle) * radius * 0.48, cy - Math.sin(angle) * radius * 0.48, cx + Math.cos(angle) * radius * 0.42, cy + Math.sin(angle) * radius * 0.42);
  }

function drawOreContactShadows(graphics: Phaser.GameObjects.Graphics, deposit: ReturnType<typeof oreDepositComponent>, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, tile: Tile) {
    for (let i = 0; i < 4; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const t = (hash(deposit.rootX + i * 673, deposit.rootY, rng.seed + 3911) - 0.5) * 1.36;
      const center = stampLocalPoint(cx, cy, angle, t * longRadius, side * shortRadius * (0.54 + hash(i, deposit.rootY, rng.seed + 3913) * 0.34));
      const shadowAngle = angle + (hash(i * 677, deposit.rootX, rng.seed + 3915) - 0.5) * 0.72;
      const length = longRadius * (0.2 + hash(deposit.rootY, i * 683, rng.seed + 3917) * 0.34);
      graphics.lineStyle(tile === 'ruinCore' ? 7.2 : 6.8, 0x010306, tile === 'ruinCore' ? 0.62 : 0.68);
      graphics.lineBetween(
        center.x - Math.cos(shadowAngle) * length * 0.5,
        center.y - Math.sin(shadowAngle) * length * 0.5,
        center.x + Math.cos(shadowAngle) * length * 0.5,
        center.y + Math.sin(shadowAngle) * length * 0.5,
      );
    }
  }

function drawShapeFirstCopper(
  graphics: Phaser.GameObjects.Graphics,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  color: number,
  facet: number,
  glow: number,
  dark: number,
) {
    const seamCount = 4;
    for (let i = 0; i < seamCount; i += 1) {
      const t = (i / Math.max(1, seamCount - 1) - 0.5) * 1.32
        + (hash(deposit.rootX * 691 + i, deposit.rootY, rng.seed + 3921) - 0.5) * 0.18;
      const s = (hash(deposit.rootY, deposit.rootX + i * 701, rng.seed + 3923) - 0.5) * 0.62;
      const center = stampLocalPoint(cx, cy, angle, t * longRadius, s * shortRadius);
      const seamAngle = angle + (hash(i * 709, deposit.rootX, rng.seed + 3925) - 0.5) * 0.42;
      const length = longRadius * (0.48 + hash(deposit.rootY, i * 719, rng.seed + 3927) * 0.2);
      graphics.lineStyle(7.2, 0x130805, 0.74);
      graphics.lineBetween(center.x - Math.cos(seamAngle) * length * 0.5, center.y - Math.sin(seamAngle) * length * 0.5, center.x + Math.cos(seamAngle) * length * 0.5, center.y + Math.sin(seamAngle) * length * 0.5);
      graphics.lineStyle(i % 2 === 0 ? 2.8 : 4.2, i % 2 === 0 ? glow : color, i % 2 === 0 ? 0.68 : 0.86);
      graphics.lineBetween(center.x - Math.cos(seamAngle) * length * 0.38, center.y - Math.sin(seamAngle) * length * 0.38, center.x + Math.cos(seamAngle) * length * 0.36, center.y + Math.sin(seamAngle) * length * 0.36);
    }
    for (let i = 0; i < 2; i += 1) {
      const p = stampLocalPoint(cx, cy, angle, (hash(i, deposit.rootX, rng.seed + 3931) - 0.5) * longRadius * 1.2, (hash(deposit.rootY, i, rng.seed + 3933) - 0.5) * shortRadius);
      graphics.fillStyle(i % 2 ? dark : facet, i % 2 ? 0.48 : 0.5);
      graphics.fillEllipse(p.x, p.y, 10 + hash(i, deposit.rootX, rng.seed + 3935) * 7.2, 3.6 + hash(deposit.rootY, i, rng.seed + 3937) * 3.2);
    }
  }

function drawShapeFirstRuby(
  graphics: Phaser.GameObjects.Graphics,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  color: number,
  facet: number,
  glow: number,
) {
    for (let i = 0; i < 3; i += 1) {
      const offset = (i / 2 - 0.5) * shortRadius * 0.92 + (hash(i, deposit.rootX, rng.seed + 3941) - 0.5) * shortRadius * 0.12;
      const center = stampLocalPoint(cx, cy, angle, (hash(deposit.rootY, i, rng.seed + 3943) - 0.5) * longRadius * 0.18, offset);
      const sliverAngle = angle + (hash(i * 727, deposit.rootX, rng.seed + 3945) - 0.5) * 0.28;
      const length = longRadius * (0.96 + hash(deposit.rootY, i * 733, rng.seed + 3947) * 0.18);
      const width = shortRadius * (0.32 + hash(i, deposit.rootY, rng.seed + 3949) * 0.14);
      const p1 = stampLocalPoint(center.x, center.y, sliverAngle, -length * 0.56, -width * 0.22);
      const p2 = stampLocalPoint(center.x, center.y, sliverAngle, -length * 0.14, -width);
      const p3 = stampLocalPoint(center.x, center.y, sliverAngle, length * 0.56, -width * 0.1);
      const p4 = stampLocalPoint(center.x, center.y, sliverAngle, length * 0.18, width * 0.82);
      const p5 = stampLocalPoint(center.x, center.y, sliverAngle, -length * 0.48, width * 0.48);
      drawPocketShape(graphics, [p1, p2, p3, p4, p5], 0x130309, 0.8, 1.1, 1.3);
      drawPocketShape(graphics, [p1, p2, p3, p4, p5], i === 1 ? facet : color, i === 1 ? 0.92 : 0.82, 0, 0);
      graphics.lineStyle(2.4, glow, i === 1 ? 0.76 : 0.56);
      graphics.lineBetween(p2.x, p2.y, p4.x, p4.y);
    }
  }

function drawShapeFirstRuinCore(
  graphics: Phaser.GameObjects.Graphics,
  deposit: ReturnType<typeof oreDepositComponent>,
  cx: number,
  cy: number,
  longRadius: number,
  shortRadius: number,
  angle: number,
  color: number,
  facet: number,
  glow: number,
  dark: number,
  host: ReturnType<typeof hostRockPaletteForDeposit>,
) {
    const radius = Math.min(longRadius * 0.86, TILE * 1.56);
    graphics.lineStyle(10.2, 0x010306, 0.7);
    graphics.strokeCircle(cx + 1.3, cy + 1.5, radius);
    graphics.lineStyle(5.6, dark, 0.9);
    graphics.strokeCircle(cx, cy, radius * 0.94);
    graphics.lineStyle(3.2, color, 0.86);
    graphics.strokeCircle(cx, cy, radius * 0.62);
    graphics.lineStyle(2.2, facet, 0.76);
    graphics.strokeCircle(cx, cy, radius * 0.3);
    for (let i = 0; i < 6; i += 1) {
      const spoke = angle + i * Math.PI / 3 + (hash(i, deposit.rootX, rng.seed + 3951) - 0.5) * 0.12;
      const inner = radius * (0.28 + hash(deposit.rootY, i, rng.seed + 3953) * 0.14);
      const outer = radius * (0.72 + hash(i, deposit.rootY, rng.seed + 3955) * 0.22);
      graphics.lineStyle(4.2, 0x010306, 0.62);
      graphics.lineBetween(cx + Math.cos(spoke) * inner + 1, cy + Math.sin(spoke) * inner + 1, cx + Math.cos(spoke) * outer + 1, cy + Math.sin(spoke) * outer + 1);
      graphics.lineStyle(2, i % 2 === 0 ? glow : facet, i % 2 === 0 ? 0.66 : 0.5);
      graphics.lineBetween(cx + Math.cos(spoke) * inner, cy + Math.sin(spoke) * inner, cx + Math.cos(spoke) * outer, cy + Math.sin(spoke) * outer);
    }
    for (let i = 0; i < 3; i += 1) {
      const t = i / 4 - 0.5;
      const shard = stampLocalPoint(cx, cy, angle, t * longRadius * 1.08, (hash(i, deposit.rootY, rng.seed + 3961) - 0.5) * shortRadius * 0.72);
      drawJaggedRockCap(graphics, shard.x, shard.y, longRadius * 0.12, shortRadius * 0.22, angle + t * 0.9, deposit.rootX + i * 11, deposit.rootY - i * 13, i % 2 ? host.mid : host.dark, host.rim, i % 2 ? 1 : -1);
    }
    const shelf = stampLocalPoint(cx, cy, angle, 0, shortRadius * 0.58);
    drawJaggedRockCap(graphics, shelf.x, shelf.y, longRadius * 0.58, shortRadius * 0.24, angle + 0.12, deposit.rootX + 137, deposit.rootY - 139, host.mid, host.rim, 1);
  }

function drawBuriedArtifactOre(scene: DeepdiveScene, tile: Tile, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, color: number, facet: number, glow: number, dark: number) {
    const prongs = tile === 'abyssalCrown' ? 5 : tile === 'drownedIdol' ? 3 : 2;
    const arcRadius = Math.min(longRadius * 0.72, TILE * 1.22);
    scene.terrainEdges.lineStyle(4.8, 0x010306, 0.32);
    scene.terrainEdges.strokeEllipse(cx + 1.5, cy + 1.5, arcRadius * 1.35, shortRadius * 1.12);
    scene.terrainEdges.lineStyle(2.4, color, 0.34);
    scene.terrainEdges.strokeEllipse(cx, cy, arcRadius * 1.25, shortRadius * 0.95);
    for (let i = 0; i < prongs; i += 1) {
      const t = i / (prongs - 1) - 0.5;
      const px = cx + Math.cos(angle) * t * arcRadius - Math.sin(angle) * -shortRadius * 0.18;
      const py = cy + Math.sin(angle) * t * arcRadius + Math.cos(angle) * -shortRadius * 0.18;
      const length = tile === 'abyssalCrown' ? shortRadius * (0.76 + Math.abs(t) * 0.55) : shortRadius * 0.62;
      scene.terrainEdges.lineStyle(3.2, 0x010306, 0.36);
      scene.terrainEdges.lineBetween(px + 1, py + 1, px - Math.sin(angle) * length + 1, py + Math.cos(angle) * length + 1);
      scene.terrainEdges.lineStyle(1.5, facet, 0.4);
      scene.terrainEdges.lineBetween(px, py, px - Math.sin(angle) * length, py + Math.cos(angle) * length);
    }
    if (tile === 'drownedIdol') {
      scene.terrainEdges.fillStyle(facet, 0.42);
      scene.terrainEdges.fillCircle(cx - Math.cos(angle) * 4, cy - Math.sin(angle) * 4, 1.5);
      scene.terrainEdges.fillCircle(cx + Math.cos(angle) * 5, cy + Math.sin(angle) * 5, 1.5);
      scene.terrainEdges.lineStyle(1, glow, 0.32);
      scene.terrainEdges.lineBetween(cx - Math.sin(angle) * 5, cy + Math.cos(angle) * 5, cx + Math.sin(angle) * 5, cy - Math.cos(angle) * 5);
    } else if (tile === 'relic') {
      scene.terrainEdges.lineStyle(1.3, glow, 0.34);
      scene.terrainEdges.lineBetween(cx - Math.cos(angle) * 13, cy - Math.sin(angle) * 13, cx + Math.cos(angle) * 8, cy + Math.sin(angle) * 8);
      scene.terrainEdges.lineBetween(cx - Math.sin(angle) * 8, cy + Math.cos(angle) * 8, cx + Math.sin(angle) * 10, cy - Math.cos(angle) * 10);
    } else {
      scene.terrainEdges.fillStyle(glow, 0.12);
      scene.terrainEdges.fillEllipse(cx, cy, arcRadius * 0.62, shortRadius * 0.42);
    }
    scene.terrainEdges.fillStyle(dark, 0.16);
    scene.terrainEdges.fillEllipse(cx - Math.sin(angle) * shortRadius * 0.5, cy + Math.cos(angle) * shortRadius * 0.5, arcRadius * 0.88, shortRadius * 0.42);
  }

function drawEngineOre(scene: DeepdiveScene, tile: Tile, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, color: number, facet: number, glow: number, dark: number) {
    const radius = Math.min(longRadius * 0.62, TILE * (tile === 'ruinCore' ? 1.18 : 0.92));
    scene.terrainEdges.lineStyle(5.2, 0x010306, 0.36);
    scene.terrainEdges.strokeCircle(cx + 1.4, cy + 1.6, radius);
    scene.terrainEdges.lineStyle(2.2, color, tile === 'ruinCore' ? 0.4 : 0.3);
    scene.terrainEdges.strokeCircle(cx, cy, radius * 0.92);
    scene.terrainEdges.strokeCircle(cx, cy, radius * 0.42);
    for (let i = 0; i < 8; i += 1) {
      const spoke = angle + i * Math.PI * 0.25;
      const inner = radius * (tile === 'ruinCore' ? 0.34 : 0.42);
      const outer = radius * (0.74 + hash(i, Math.round(cx), rng.seed + 1801) * 0.16);
      scene.terrainEdges.lineStyle(2.6, 0x010306, 0.28);
      scene.terrainEdges.lineBetween(cx + Math.cos(spoke) * inner + 1, cy + Math.sin(spoke) * inner + 1, cx + Math.cos(spoke) * outer + 1, cy + Math.sin(spoke) * outer + 1);
      scene.terrainEdges.lineStyle(1.1, i % 2 === 0 ? glow : facet, tile === 'ruinCore' ? 0.44 : 0.28);
      scene.terrainEdges.lineBetween(cx + Math.cos(spoke) * inner, cy + Math.sin(spoke) * inner, cx + Math.cos(spoke) * outer, cy + Math.sin(spoke) * outer);
    }
    for (let i = 0; i < 5; i += 1) {
      const cable = angle + (i - 2) * 0.34;
      scene.terrainEdges.lineStyle(1.4, glow, tile === 'ruinCore' ? 0.26 : 0.18);
      scene.terrainEdges.lineBetween(
        cx + Math.cos(cable) * radius * 0.5,
        cy + Math.sin(cable) * radius * 0.5,
        cx + Math.cos(cable) * longRadius * 1.05,
        cy + Math.sin(cable) * longRadius * 1.05,
      );
    }
    scene.terrainEdges.fillStyle(tile === 'ruinCore' ? glow : dark, tile === 'ruinCore' ? 0.2 : 0.14);
    scene.terrainEdges.fillCircle(cx, cy, radius * 0.24);
  }

function drawAlienAlloyOre(scene: DeepdiveScene, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, color: number, facet: number, glow: number) {
    for (let i = 0; i < 4; i += 1) {
      const offset = (i - 1.5) * shortRadius * 0.45;
      const px = cx - Math.sin(angle) * offset + Math.cos(angle) * (hash(i, Math.round(cx), rng.seed + 1901) - 0.5) * longRadius * 0.35;
      const py = cy + Math.cos(angle) * offset + Math.sin(angle) * (hash(Math.round(cy), i, rng.seed + 1903) - 0.5) * longRadius * 0.35;
      drawOrePlate(scene.terrainEdges, px, py, longRadius * 0.36, shortRadius * 0.24, angle + (hash(i * 5, Math.round(cx), rng.seed + 1905) - 0.5) * 0.42, color, facet, 0.42);
    }
    scene.terrainEdges.lineStyle(1.3, glow, 0.48);
    scene.terrainEdges.lineBetween(cx - Math.cos(angle) * longRadius * 0.9, cy - Math.sin(angle) * longRadius * 0.9, cx + Math.cos(angle) * longRadius * 0.88, cy + Math.sin(angle) * longRadius * 0.88);
  }

function drawOrePlate(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, color: number, facet: number, alpha: number) {
    const points = orePocketPoints(cx, cy, longRadius, shortRadius, angle, Math.round(cx), Math.round(cy), 'quartz');
    drawPocketShape(graphics, points, 0x010306, alpha * 0.55, 0.9, 1.2);
    drawPocketShape(graphics, points, color, alpha, 0, 0);
    graphics.lineStyle(1, facet, alpha * 0.72);
    graphics.lineBetween(cx - Math.cos(angle) * longRadius * 0.46, cy - Math.sin(angle) * longRadius * 0.46, cx + Math.cos(angle) * longRadius * 0.32, cy + Math.sin(angle) * longRadius * 0.32);
  }

function drawHostRockOcclusion(scene: DeepdiveScene, deposit: ReturnType<typeof oreDepositComponent>, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, tile: Tile) {
    const actualGptTile = isActualGptOreTile(tile);
    const lips = actualGptTile ? Math.min(4, Math.max(2, deposit.cells.length)) : Math.min(7, Math.max(3, deposit.cells.length + 2));
    const graphics = actualGptTile ? scene.oreOverburden : scene.terrainEdges;
    for (let i = 0; i < lips; i += 1) {
      const t = hash(i * 43, deposit.rootX * 47, rng.seed + 2001) - 0.5;
      const side = (hash(deposit.rootY * 53, i * 59, rng.seed + 2003) > 0.5 ? -1 : 1) * (0.4 + hash(i, deposit.rootY, rng.seed + 2005) * 0.5);
      const px = cx + Math.cos(angle) * t * longRadius * (actualGptTile ? 1.08 : 1.35) - Math.sin(angle) * side * shortRadius;
      const py = cy + Math.sin(angle) * t * longRadius * (actualGptTile ? 1.08 : 1.35) + Math.cos(angle) * side * shortRadius;
      const lipLength = longRadius * ((actualGptTile ? 0.16 : 0.22) + hash(i * 61, deposit.rootX, rng.seed + 2007) * (actualGptTile ? 0.22 : 0.34));
      const lipAngle = angle + (hash(i * 67, deposit.rootY, rng.seed + 2009) - 0.5) * 1.1;
      graphics.lineStyle(actualGptTile ? 2.8 : 4.8, 0x010306, actualGptTile ? 0.34 : 0.38);
      graphics.lineBetween(px - Math.cos(lipAngle) * lipLength * 0.5, py - Math.sin(lipAngle) * lipLength * 0.5, px + Math.cos(lipAngle) * lipLength * 0.5, py + Math.sin(lipAngle) * lipLength * 0.5);
      graphics.lineStyle(actualGptTile ? 1.15 : 2, tile === 'sunstone' ? 0x3c3426 : 0x18242a, actualGptTile ? 0.4 : 0.46);
      graphics.lineBetween(px - Math.cos(lipAngle) * lipLength * 0.42, py - Math.sin(lipAngle) * lipLength * 0.42, px + Math.cos(lipAngle) * lipLength * 0.42, py + Math.sin(lipAngle) * lipLength * 0.42);
    }
    for (let i = 0; i < (actualGptTile ? 4 : 6); i += 1) {
      const chipAngle = hash(i * 71, deposit.rootX, rng.seed + 2011) * Math.PI * 2;
      const r = shortRadius * (0.28 + hash(deposit.rootY, i * 73, rng.seed + 2013) * (actualGptTile ? 0.7 : 1.05));
      const px = cx + Math.cos(chipAngle) * r + Math.cos(angle) * (hash(i, deposit.rootY, rng.seed + 2015) - 0.5) * longRadius * (actualGptTile ? 0.72 : 1);
      const py = cy + Math.sin(chipAngle) * r + Math.sin(angle) * (hash(deposit.rootX, i, rng.seed + 2017) - 0.5) * longRadius * (actualGptTile ? 0.72 : 1);
      graphics.fillStyle(0x111a20, 0.55);
      graphics.fillCircle(px, py, (actualGptTile ? 0.7 : 1.2) + hash(i, deposit.rootX, rng.seed + 2019) * (actualGptTile ? 0.85 : 1.4));
    }
  }

function drawOreDepositGlint(scene: DeepdiveScene, deposit: ReturnType<typeof oreDepositComponent>, cx: number, cy: number, longRadius: number, shortRadius: number, angle: number, glow: number) {
    if (hash(deposit.rootX * 211, deposit.rootY * 223, rng.seed + 2101) < 0.34) return;
    const t = hash(deposit.rootX * 227, deposit.rootY * 229, rng.seed + 2103) - 0.5;
    const s = hash(deposit.rootY * 233, deposit.rootX * 239, rng.seed + 2105) - 0.5;
    const px = cx + Math.cos(angle) * t * longRadius * 0.7 - Math.sin(angle) * s * shortRadius * 0.6;
    const py = cy + Math.sin(angle) * t * longRadius * 0.7 + Math.cos(angle) * s * shortRadius * 0.6;
    scene.terrainEdges.fillStyle(0xf4ffff, 0.58);
    scene.terrainEdges.fillCircle(px, py, 1.05);
    scene.terrainEdges.lineStyle(1, glow, 0.24);
    scene.terrainEdges.lineBetween(px - 2.4, py, px + 2.4, py);
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
    if (tile === 'precursorEngine') return 0xb58c4a;
    if (tile === 'alienAlloy') return 0x80ffd4;
    if (tile === 'ruinCore') return 0xd397ff;
    return 0xb9f27c;
  }

function oreShadowColor(tile: Tile) {
    if (tile === 'copper') return 0x482516;
    if (tile === 'quartz') return 0x315b5e;
    if (tile === 'ruby') return 0x4d1021;
    if (tile === 'cobalt') return 0x17305d;
    if (tile === 'sunstone') return 0x5b3a16;
    if (tile === 'precursorEngine') return 0x132d31;
    if (tile === 'alienAlloy') return 0x174c44;
    if (tile === 'ruinCore') return 0x442159;
    return 0x263f1e;
  }

function oreFacetColor(tile: Tile) {
    if (tile === 'copper') return 0xffbc74;
    if (tile === 'quartz') return 0xffffff;
    if (tile === 'ruby') return 0xff8a9d;
    if (tile === 'cobalt') return 0xa9d9ff;
    if (tile === 'sunstone') return 0xffef9f;
    if (tile === 'precursorEngine') return 0x79d8ca;
    if (tile === 'alienAlloy') return 0xb5ffe7;
    if (tile === 'ruinCore') return 0xf2b6ff;
    return 0xd4ff8c;
  }

function oreGlowColor(tile: Tile) {
    if (tile === 'copper') return 0xffa35f;
    if (tile === 'quartz') return 0xf6fffd;
    if (tile === 'ruby') return 0xff5e78;
    if (tile === 'cobalt') return 0x82d9ff;
    if (tile === 'sunstone') return 0xffdd74;
    if (tile === 'precursorEngine') return 0x63e6d0;
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

export function drawBargeDockingIndicator(this: DeepdiveScene, ) {
    if (!state.started || state.docked || state.lost) return;
    const x = WORLD_W * TILE * 0.5;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, BARGE_DOCK_Y);
    const revealDistance = 250;
    if (distance > revealDistance) return;

    const fade = Phaser.Math.Clamp((revealDistance - distance) / 100, 0.22, 1);
    const pulse = 0.5 + Math.sin(performance.now() * 0.007) * 0.5;
    const alpha = fade * (0.68 + pulse * 0.24);
    const halfGap = BARGE_DOCKING_HALF_WIDTH - 5;
    const throatY = BARGE_DOCK_Y + 3;
    const markerY = BARGE_DOCKING_ZONE_Y + 23 + pulse * 2;

    this.actors.lineStyle(5, 0x001820, alpha * 0.42);
    this.actors.lineBetween(x - halfGap - 14, throatY - 13, x - halfGap - 14, throatY + 21);
    this.actors.lineBetween(x + halfGap + 14, throatY - 13, x + halfGap + 14, throatY + 21);
    this.actors.lineBetween(x - 35, markerY + 13, x - 9, markerY - 5);
    this.actors.lineBetween(x + 35, markerY + 13, x + 9, markerY - 5);
    this.actors.lineBetween(x, markerY + 13, x, throatY + 12);

    this.actors.lineStyle(3, 0xe9ffff, alpha);
    this.actors.lineBetween(x - halfGap - 14, throatY - 13, x - halfGap - 14, throatY + 21);
    this.actors.lineBetween(x + halfGap + 14, throatY - 13, x + halfGap + 14, throatY + 21);
    this.actors.lineStyle(3, 0x6df4ff, alpha);
    this.actors.lineBetween(x - 35, markerY + 13, x - 9, markerY - 5);
    this.actors.lineBetween(x + 35, markerY + 13, x + 9, markerY - 5);
    this.actors.lineStyle(2, 0xe9ffff, alpha * 0.9);
    this.actors.lineBetween(x, markerY + 13, x, throatY + 12);
    this.actors.fillStyle(0xe9ffff, alpha * 0.95);
    this.actors.fillTriangle(x, throatY + 5, x - 6, throatY + 16, x + 6, throatY + 16);
    this.actors.fillStyle(0x6df4ff, alpha * 0.14);
    this.actors.fillEllipse(x, BARGE_DOCKING_ZONE_Y + 14, 82, 18);
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
    for (const hazard of this.hazards) {
      const pulse = (Math.sin(hazard.phase * 1.8) + 1) * 0.5;
      const frame = Math.floor((hazard.phase * 7) % 4);
      const normalX = hazard.surface?.normalX ?? 0;
      const normalY = hazard.surface?.normalY ?? -1;
      const rotation = Math.atan2(normalY, normalX) + Math.PI / 2;
      const damageRadius = hazard.radius * 1.45;
      const plumeX = hazard.x + normalX * hazard.radius * 1.35;
      const plumeY = hazard.y + normalY * hazard.radius * 1.35;
      hazard.sprite
        ?.setTexture(`vent-steam-${frame}`)
        .setVisible(true)
        .setAlpha(0.62 + pulse * 0.25)
        .setPosition(plumeX, plumeY)
        .setRotation(rotation);
      fitImageHeight(hazard.sprite, hazard.radius * 3.2);
      if (pulse > 0.45) {
        this.actors.fillStyle(0xff8a5c, 0.08 + pulse * 0.08);
        this.actors.fillEllipse(plumeX, plumeY, damageRadius * 1.18, damageRadius * 0.56);
        this.actors.lineStyle(2, 0xffc06d, 0.18 + pulse * 0.18);
        this.actors.strokeEllipse(plumeX, plumeY, damageRadius * 1.24, damageRadius * 0.62);
        this.actors.lineStyle(2, 0xfff0c8, 0.22 + pulse * 0.24);
        this.actors.lineBetween(hazard.x, hazard.y, plumeX + normalX * damageRadius * 0.5, plumeY + normalY * damageRadius * 0.5);
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
      const anchored = Boolean(fish.behaviorClass && fish.behaviorClass !== 'legacySwimmer');
      const angle = anchored && fish.surface
        ? fish.behaviorClass === 'benthicWalker'
          ? Math.atan2(fish.surface.tangentY * (fish.facingSign ?? 1), fish.surface.tangentX * (fish.facingSign ?? 1))
          : Math.atan2(fish.surface.normalY, fish.surface.normalX)
        : fish.visualAngle ?? Math.atan2(fish.vy, fish.vx);
      const bodyAlpha = fish.scanned ? Math.max(alpha, 0.9) : alpha;
      const threatDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      const cue = Phaser.Math.Clamp(fish.aggroCue, 0, 1);
      const threat = cue * (1 - Phaser.Math.Clamp((threatDistance - 52) / 168, 0, 0.45));
      const desiredWidth = anchored
        ? fish.radius * (fish.behaviorClass === 'verticalAnchored' ? 2.8 : fish.behaviorClass === 'sessileAttached' ? 2.55 : 3.15)
        : fish.radius * (fish.hostile ? 3.8 : fish.pattern === 'circle' || fish.pattern === 'glide' ? 3.4 : 3);
      const pose = anchored
        ? surfaceFishPose(fish)
        : { ...swimPose(angle, fish.visualFacingSign ?? fish.facingSign), originX: 0.5, originY: 0.5 };
      const frameSpeed = anchored ? (fish.stunned > 0 ? 5 : 24 + Math.abs(Math.sin(fish.phase)) * 12) : fish.stunned > 0 ? 8 : Math.hypot(fish.vx, fish.vy);
      const manifestAnimation = spriteManifests[fish.assetKey]?.animations?.swim;
      const frame = fish.assetKey === 'fauna-shallow-blue-ring-octopus' && manifestAnimation?.frames.length
        ? manifestAnimation.frames[Math.floor(fish.phase * manifestAnimation.frameRate) % manifestAnimation.frames.length] ?? 0
        : animatedFrame(fish.phase, frameSpeed, fishFrameCount(fish.assetKey), fish.hostile ? 3.3 : 4.2);
      if (fish.sprite) {
        if (spriteManifests[fish.assetKey]) fish.sprite.setTexture(fish.assetKey).setFrame(frame);
        else fish.sprite.setTexture(`${fish.assetKey}-${frame}`);
      }
      fish.sprite
        ?.setVisible(true)
        .setAlpha(fish.stunned > 0 ? bodyAlpha * 0.72 : bodyAlpha)
        .setPosition(fish.x, fish.y)
        .setFlipX(pose.flipX)
        .setRotation(pose.rotation)
        .setOrigin(pose.originX, pose.originY);
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

function surfaceFishPose(fish: Fish) {
    const anchor = fish.anchor ?? fish.surface?.anchor ?? 'floor';
    if (fish.behaviorClass === 'benthicWalker') {
      const facing = fish.facingSign ?? 1;
      let tangentX = fish.surface?.tangentX ?? 1;
      let tangentY = fish.surface?.tangentY ?? 0;
      let flipX = facing < 0;
      if (tangentX < -0.01 || (Math.abs(tangentX) <= 0.01 && tangentY < 0)) {
        tangentX *= -1;
        tangentY *= -1;
        flipX = !flipX;
      }
      const tangentAngle = Math.atan2(tangentY, tangentX);
      return {
        flipX,
        rotation: tangentAngle + Math.sin(fish.phase * 5.3) * 0.035,
        originX: 0.5,
        originY: 0.58,
      };
    }
    const normalRotation = fish.surface ? Math.atan2(fish.surface.normalY, fish.surface.normalX) + Math.PI / 2 : floraAnchorRotation(anchor);
    const origin = floraSpriteOrigin(anchor);
    const wobble = fish.behaviorClass === 'verticalAnchored' ? Math.sin(fish.phase * 1.8) * 0.055 : Math.sin(fish.phase * 2.4) * 0.018;
    return {
      flipX: false,
      rotation: normalRotation + wobble,
      originX: origin.x,
      originY: origin.y,
    };
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
      if (flora.sample > 0) {
        this.actors.lineStyle(3, 0x8ee7f4, 0.34 + flora.sample * 0.52);
        this.actors.beginPath();
        this.actors.arc(flora.x, flora.y, flora.radius + scaledEntity(14), Math.PI / 2, Math.PI / 2 + Math.PI * 2 * flora.sample);
        this.actors.strokePath();
      }
      if (flora.samplePulse > 0) {
        this.actors.lineStyle(2, 0x8ee7f4, flora.samplePulse * 0.8);
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + scaledEntity(12 + (1 - flora.samplePulse) * 18));
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
    const subNeedsPartRig = speed > 3
      || sub.boardProgress > 0
      || (state.pilotingSub && sub.tier >= 2 && this.drillingThisFrame)
      || this.sonarPings.length > 0
      || this.player.scanCooldown > 0
      || this.player.sonarCooldown > 0
      || sub.weaponCooldown > 0
      || sub.hull <= def.hull * 0.62
      || state.carrierSub === sub;
    const renderedSubParts = subNeedsPartRig ? renderSubmarineParts(this, this.subPartSprites, sub) : false;
    if (!renderedSubParts) hideSubmarinePartSprites(this.subPartSprites);
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
    const profile = environmentVisualProfileFor(state.biome, state.depth);
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

    drawPostDarknessWaterColumnVeil(this, camera, profile);

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

function drawPostDarknessWaterColumnVeil(scene: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera, profile: ReturnType<typeof environmentVisualProfileFor>) {
    if (waterColumnPassDisabled()) return;
    const veil = profile.background.worldSpaceNoise.postDarknessVeil;
    if (!veil.enabled || veil.alpha <= 0) return;
    const view = camera.worldView;
    const time = scene.time.now / 1000;
    const guardX = scene.player.x;
    const guardY = scene.player.y;
    const guardRadius = veil.guardRadius;
    const brineMid = profile.biome === 2 && profile.activeBand.id === 'mid';
    const midnightLower = profile.biome === 3 && profile.activeBand.id === 'lower';
    const ruinLower = profile.biome === 4 && profile.activeBand.id === 'lower';

    if (brineMid) {
      drawGuardedScreenVeil(scene.lampGloom, view, 0x102823, 0.075, guardX, guardY, guardRadius);
    } else if (ruinLower) {
      drawGuardedScreenVeil(scene.lampGloom, view, 0x06151d, 0.34, guardX, guardY, guardRadius);
    } else if (midnightLower) {
      drawGuardedScreenVeil(scene.lampGloom, view, 0x07182a, 0.075, guardX, guardY, guardRadius);
    }

    if (brineMid || midnightLower || ruinLower) {
      const broadCount = brineMid ? 12 : ruinLower ? 10 : 8;
      for (let i = 0; i < broadCount; i += 1) {
        const roll = hash(i + 271, profile.biome * 47 + profile.activeBand.startDepth, rng.seed + 2381);
        const yT = Phaser.Math.Wrap(roll + time * (brineMid ? 0.011 : midnightLower ? 0.004 : 0.005) * (i % 2 === 0 ? 1 : -0.68) + camera.scrollY * 0.00008, 0, 1);
        const y = view.y + yT * view.height;
        const width = Phaser.Math.Linear(
          brineMid ? 32 : midnightLower ? 28 : 38,
          brineMid ? 104 : midnightLower ? 76 : 132,
          hash(i + 283, profile.activeBand.endDepth, rng.seed + 2387),
        );
        const alpha = veil.alpha * Phaser.Math.Linear(0.42, brineMid ? 1.24 : ruinLower ? 1.02 : 0.94, hash(i + 293, profile.biome, rng.seed + 2393));
        const color = brineMid
          ? (i % 2 === 0 ? 0x6fa491 : 0x244e45)
          : midnightLower
            ? (i % 2 === 0 ? 0x4c6d90 : 0x1d344f)
            : (i % 2 === 0 ? 0x8fb1c5 : 0x27485c);
        drawGuardedHorizontalBand(scene.lampGloom, view, y, width, color, alpha, guardX, guardY, guardRadius);
      }
    }

    for (let i = 0; i < veil.bandCount; i += 1) {
      const roll = hash(i + 307, profile.biome * 37 + profile.activeBand.startDepth, rng.seed + 2411);
      const yT = Phaser.Math.Wrap(roll + time * 0.006 * (i % 2 === 0 ? 1 : -0.7) + camera.scrollY * 0.00006, 0, 1);
      const y = view.y + yT * view.height;
      const width = Phaser.Math.Linear(
        brineMid ? 10 : ruinLower ? 14 : midnightLower ? 7 : 2,
        brineMid ? 34 : ruinLower ? 42 : midnightLower ? 20 : 5,
        hash(i + 331, profile.activeBand.endDepth, rng.seed + 2423),
      );
      const alpha = veil.alpha * Phaser.Math.Linear(0.38, brineMid ? 1.12 : ruinLower ? 0.95 : midnightLower ? 0.92 : 1, hash(i + 347, profile.biome, rng.seed + 2437));
      drawGuardedHorizontalBand(scene.lampGloom, view, y, width, veil.color, alpha, guardX, guardY, guardRadius);
    }

    for (let i = 0; i < veil.particleCount; i += 1) {
      const xRoll = hash(i + 373, profile.biome * 41 + profile.activeBand.endDepth, rng.seed + 2459);
      const yRoll = hash(i + 397, profile.biome * 43 + profile.activeBand.startDepth, rng.seed + 2467);
      const x = view.x + Phaser.Math.Wrap(xRoll + time * veil.driftX * 0.0008, 0, 1) * view.width;
      const y = view.y + Phaser.Math.Wrap(yRoll + time * veil.driftY * 0.003, 0, 1) * view.height;
      const dx = x - guardX;
      const dy = y - guardY;
      if (dx * dx + dy * dy < guardRadius * guardRadius) continue;
      const radius = Phaser.Math.Linear(0.55, brineMid ? 1.85 : ruinLower ? 1.55 : midnightLower ? 1.25 : 1.15, hash(i + 419, profile.biome, rng.seed + 2473));
      const alpha = veil.particleAlpha * Phaser.Math.Linear(0.35, 1, hash(i + 431, profile.activeBand.startDepth, rng.seed + 2477));
      scene.lampGloom.fillStyle(veil.color, alpha);
      scene.lampGloom.fillCircle(x, y, radius);
    }
  }

export function drawBiomeVisibilityCues(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    void camera;
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

function drawSonarBargeLandmark(ctx: CanvasRenderingContext2D, px: number, py: number, cell: number, mode: 'hud' | 'big') {
    const width = mode === 'hud' ? Math.max(22, cell * 10) : Math.max(32, cell * 14);
    const height = mode === 'hud' ? Math.max(5, cell * 2.2) : Math.max(7, cell * 2.6);
    ctx.fillStyle = 'rgba(242, 211, 155, 0.9)';
    ctx.fillRect(px - width * 0.5, py - height * 0.5, width, height);
    ctx.strokeStyle = 'rgba(142, 231, 244, 0.78)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - width * 0.5, py - height * 0.5, width, height);
    ctx.beginPath();
    ctx.moveTo(px - width * 0.18, py - height * 0.5);
    ctx.lineTo(px, py - height * 1.9);
    ctx.lineTo(px + width * 0.18, py - height * 0.5);
    ctx.stroke();
  }

export function drawSonarMap(this: DeepdiveScene, ) {
    measurePerf(this, 'draw.sonarMap', () => drawSonarMapBody.call(this));
  }

function drawSonarMapBody(this: DeepdiveScene) {
    const canvas = document.querySelector<HTMLCanvasElement>('#sonar-map');
    if (!this.world.length) return;
    if (state.sonarMapOpen) measurePerf(this, 'draw.bigSonarMap', () => drawBigSonarMap.call(this));
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
    const bargeX = WORLD_W * TILE * 0.5;
    const bargeY = BARGE_DOCK_Y;
    const bargeTileX = bargeX / TILE;
    const bargeTileY = bargeY / TILE;
    if (bargeTileX >= centerX - viewRadius && bargeTileX <= centerX + viewRadius && bargeTileY >= centerY - viewRadius && bargeTileY <= centerY + viewRadius) {
      const px = (bargeTileX - centerX + viewRadius) * cell;
      const py = (bargeTileY - centerY + viewRadius) * cell;
      drawSonarBargeLandmark(ctx, px, py, cell, 'hud');
    }
    for (const contact of state.sonarContacts) {
      if (contact.kind === 'barge') continue;
      const tx = Math.floor(contact.x / TILE);
      const ty = Math.floor(contact.y / TILE);
      if (tx < centerX - viewRadius || tx > centerX + viewRadius || ty < centerY - viewRadius || ty > centerY + viewRadius) continue;
      const px = (tx - centerX + viewRadius + 0.5) * cell;
      const py = (ty - centerY + viewRadius + 0.5) * cell;
      const alpha = Phaser.Math.Clamp(1 - contact.age / 14, 0.22, 1);
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
    drawSonarBargeLandmark(ctx, originX + (bargeX / TILE) * cell, originY + (bargeY / TILE) * cell, cell, 'big');

    for (const contact of state.sonarContacts) {
      if (contact.kind === 'barge') continue;
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
      if (item.value > 0) {
        const bob = Math.sin(this.time.now * 0.006 + (item.phase ?? 0)) * 1.2;
        const pulse = 0.72 + Math.sin(this.time.now * 0.01 + (item.phase ?? 0)) * 0.18;
        const x = item.x;
        const y = item.y + bob;
        const r = item.radius;
        this.actors.fillStyle(0x02070a, 0.42);
        this.actors.fillCircle(x, y + r * 0.38, r * 1.16);
        this.actors.fillStyle(item.color, 0.12 + pulse * 0.08);
        this.actors.fillCircle(x, y, r * 2.15);
        this.actors.lineStyle(1.4, 0xfff7df, 0.5 + pulse * 0.18);
        this.actors.strokeCircle(x, y, r + 3);
        this.actors.fillStyle(item.color, 0.96);
        this.actors.fillTriangle(x, y - r, x + r * 0.88, y - r * 0.05, x, y + r * 0.95);
        this.actors.fillStyle(0x061016, 0.42);
        this.actors.fillTriangle(x, y + r * 0.95, x - r * 0.9, y + r * 0.04, x, y - r);
        this.actors.lineStyle(1, 0xfff7df, 0.6);
        this.actors.lineBetween(x - r * 0.12, y - r * 0.72, x + r * 0.54, y - r * 0.08);
        this.actors.lineStyle(1, 0x02070a, 0.45);
        this.actors.strokeCircle(x, y, r * 0.96);
        continue;
      }
      const alpha = Phaser.Math.Clamp(item.life / 4, 0, 0.46);
      this.actors.fillStyle(item.color, alpha);
      this.actors.fillCircle(item.x, item.y, item.radius);
    }
  }
