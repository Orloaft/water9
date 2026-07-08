import Phaser from 'phaser';
import type { ArticulatedCreature,Biome,CargoItem,Fish,Flora,PlaytestCommand,ShopItem,SubTier,TerrainSurfaceAnchor,Tile } from './types';
import { BOBBIT_ESCAPE_SECONDS,ENTITY_SCALE,FORWARD_OUTPOST_MIN_DEPTH,PLAYER_FORWARD_REACH,SURFACE_Y,TILE,WORLD_H,WORLD_W } from './constants';
import { biomeFish,biomeFlora,tiles,upgrades } from './content';
import { state } from './state';
import { rng } from './rng';
import { LARGE_THREAT_DYNAMITE_DAMAGE_MULTIPLIER,activeQuest,biomeChartingProgress,canTravelToNextBiome,cargoCapacity,clearBleed,clearVenom,completeFinaleAtBarge,continueSurveyAfterEnding,createDefaultStoryProgress,createConsumableItem,createSubVehicle,currentPinnedStoryObjective,darknessAtDepth,environmentAnchorSilhouettesFor,environmentVisualProfileFor,fishAssetKey,fishMaxHp,floraAssetKey,floraMaxHp,fuelMax,generateQuestBoard,hash,isLargeArticulatedThreat,isOreTile,oxygenMax,parallaxProfileFor,recoverFinalProof,refillAtBoat,resetFinaleProgress,resetToolState,restart,scaledDepthPx,scaledEntity,selectTool,shopItem,specialRoomEffectCenter,subDef,subEffectiveCost,syncStoryProgress,terrainLookDepthBandForTileY,terrainLookForBiome,upgradeMax } from './helpers';
import { availableUpgrades,biomeName,renderHud,roundMetric } from './hud';
import { hasSavedGame } from './save-load';
import { articulatedCreatureDefs,articulatedManifestInfo,articulatedPlaceholderTextureKeys,articulatedPrototypeRuntimeEnabled,articulatedRuntimeSpawnMode,articulatedSpawnBudgetForBiome,createArticulatedCreature,partManifest,shouldSpawnArticulatedCreature } from './articulated';
import { usesLargeThreatRippleTurning } from './scene-articulated';
import type { DeepdiveScene } from './scene';
import { rebuildTerrainMask,sampleTerrainSurfaceAnchors,subtractTerrainMaskBrush,TERRAIN_MASK_RES,TERRAIN_MASK_SOLID_THRESHOLD,terrainMaskDensityAt,validateTerrainSurfaceAnchor } from './terrain-mask';
import { perfSnapshot } from './perf';

function refreshPlaytestCamera(scene: DeepdiveScene) {
  scene.cameras.main.preRender();
}

function clearPlaytestFloatingText(scene: DeepdiveScene) {
  scene.floatingTexts.forEach((entry) => entry.label.destroy());
  scene.floatingTexts = [];
}

function stageSelectedToolSmoke(scene: DeepdiveScene, mode: 'terrain' | 'life') {
  if (scene.world.length < WORLD_H || scene.world.some((row) => !row || row.length < WORLD_W)) {
    scene.generateWorld();
    scene.worldReady = true;
  }
  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.won = false;
  state.radioOpen = false;
  state.logbookOpen = false;
  state.cargoOpen = false;
  state.activeSub = null;
  state.pilotingSub = false;
  state.fuel = fuelMax();
  state.oxygen = oxygenMax();
  clearPlaytestFloatingText(scene);
  const centerX = Math.floor(WORLD_W * 0.5);
  const centerY = Math.floor((SURFACE_Y + 360) / TILE);
  scene.player.x = centerX * TILE + TILE * 0.5;
  scene.player.y = centerY * TILE + TILE * 0.5;
  scene.player.vx = 0;
  scene.player.vy = 0;
  scene.player.facing.set(1, 0);
  scene.player.facingSign = 1;
  scene.player.mineCooldown = 0;
  scene.player.scanCooldown = 0;
  scene.player.sonarCooldown = 0;
  state.depth = Math.max(0, Math.round((scene.player.y - SURFACE_Y) / 6));
  if (mode === 'terrain') {
    const targetX = Math.floor((scene.player.x + PLAYER_FORWARD_REACH) / TILE);
    const targetY = Math.floor(scene.player.y / TILE);
    for (let y = targetY - 3; y <= targetY + 3; y += 1) {
      for (let x = targetX - 4; x <= targetX + 5; x += 1) {
        scene.setTile(x, y, x >= targetX ? 'stone' : 'water');
        if (scene.damage[y]?.[x] !== undefined) scene.damage[y][x] = 0;
      }
    }
    scene.setTile(targetX, targetY, 'copper');
    rebuildTerrainMask(scene);
    scene.fish = [];
    scene.flora = [];
    scene.articulatedCreatures = [];
    scene.bobbits = [];
    scene.hazards = [];
    scene.larvae = [];
    scene.nestEggs = [];
    scene.looseItems = [];
    scene.terrainBreakEffects = [];
    scene.terrainBoundsKey = '';
    scene.terrainDirty = true;
    renderHud();
    scene.draw();
    return { ok: true, mode, target: { tileX: targetX, tileY: targetY, worldX: targetX * TILE + TILE * 0.5, worldY: targetY * TILE + TILE * 0.5 } };
  }
  scene.flora = [];
  scene.articulatedCreatures = [];
  const species = biomeFish[state.biome][0];
  const assetKey = fishAssetKey(species);
  scene.fish = [{
    kind: 'fish',
    species: species.species,
    x: scene.player.x + 28,
    y: scene.player.y,
    vx: 0,
    vy: 0,
    homeX: scene.player.x + 28,
    homeY: scene.player.y,
    speed: 0,
    phase: 0,
    color: species.color,
    hostile: false,
    scanned: false,
    scan: 0,
    scanning: false,
    scanPulse: 0,
    radius: 16,
    pattern: species.pattern,
    bumpCooldown: 0,
    aggro: 0,
    aggroCue: 0,
    stunned: 0,
    hp: fishMaxHp(species),
    maxHp: fishMaxHp(species),
    dead: false,
    hurtFlash: 0,
    assetKey,
    facingSign: -1,
    sprite: scene.createEntitySprite(scene.player.x + 28, scene.player.y, assetKey),
  }];
  const target = scene.fish[0];
  if (!target) return { ok: false, reason: 'missing-life-target' };
  target.x = scene.player.x + 28;
  target.y = scene.player.y;
  target.scan = 0;
  target.scanned = false;
  state.scannedSpecies.delete(target.species);
  if (target.kind === 'fish') {
    target.vx = 0;
    target.vy = 0;
    target.homeX = target.x;
    target.homeY = target.y;
  } else if (target.kind === 'articulated') {
    target.vx = 0;
    target.vy = 0;
    target.homeX = target.x;
    target.homeY = target.y;
    target.reviewFrozen = true;
  }
  renderHud();
  scene.draw();
  return { ok: true, mode, species: target.species, kind: target.kind };
}

function stageStunToolSmoke(scene: DeepdiveScene) {
  const stage = prepSamplerStage(scene);
  const species = biomeFish[state.biome].find((candidate) => candidate.hostile) ?? biomeFish[state.biome][0];
  if (!species) return { ok: false, reason: 'missing-fish-species' };
  const assetKey = fishAssetKey(species);
  const fish: Fish = {
    kind: 'fish',
    species: species.species,
    x: scene.player.x + 54,
    y: scene.player.y,
    vx: 0,
    vy: 0,
    homeX: scene.player.x + 54,
    homeY: scene.player.y,
    speed: 0,
    phase: 0,
    color: species.color,
    hostile: true,
    scanned: false,
    scan: 0,
    scanning: false,
    scanPulse: 0,
    radius: 16,
    pattern: species.pattern,
    bumpCooldown: 0,
    aggro: 2,
    aggroCue: 0,
    stunned: 0,
    hp: fishMaxHp(species),
    maxHp: fishMaxHp(species),
    dead: false,
    hurtFlash: 0,
    assetKey,
    facingSign: -1,
    sprite: scene.createEntitySprite(scene.player.x + 54, scene.player.y, assetKey),
  };
  scene.fish = [fish];
  state.cargo = state.cargo.filter((item) => item.id !== 'stun-grenade');
  state.cargo.push(createConsumableItem(shopItem('stun-grenade')));
  state.selectedCargoIndex = state.cargo.length - 1;
  state.unlockedTools.stun = true;
  state.selectedTool = 'stun';
  scene.cameras.main.setZoom(3);
  scene.cameras.main.centerOn(stage.centerX * TILE, stage.centerY * TILE);
  renderHud();
  scene.draw();
  return { ok: true, species: fish.species, grenades: state.cargo.filter((item) => item.id === 'stun-grenade').length };
}

function consumableCargo(id: ShopItem['id']) {
  return createConsumableItem(shopItem(id));
}

function stageBargeSaleSmoke(scene: DeepdiveScene) {
  const saleCargo: CargoItem[] = [
    { id: 'copper', name: 'Copper Ore', value: 90, color: tiles.copper.color, kind: 'ore', icon: 'item-icon-copper' },
    { id: 'relic', name: 'Relic Cache', value: 1250, color: tiles.relic.color, kind: 'artifact', icon: 'item-icon-relic' },
    { id: 'flora-sample', name: 'Glass Kelp Sample', value: 55, color: 0x8ee7f4, kind: 'sample', icon: 'item-icon-unknown', sampleSpecies: 'Glass Kelp' },
  ];
  state.started = true;
  state.atBoat = false;
  state.docked = false;
  state.cargo = [
    ...saleCargo,
    consumableCargo('stun-grenade'),
    consumableCargo('dynamite'),
    consumableCargo('flare'),
    consumableCargo('oxygen-tank'),
    consumableCargo('fuel-tank'),
    consumableCargo('first-aid-kit'),
    consumableCargo('antivenom'),
    consumableCargo('injector-knife'),
  ];
  state.unlockedTools.stun = true;
  state.selectedCargoIndex = 0;
  state.credits = 0;
  state.oreSoldCredits = 0;
  scene.player.x = WORLD_W * TILE * 0.5;
  scene.player.y = SURFACE_Y + 54;
  scene.player.vx = 0;
  scene.player.vy = 0;
  renderHud();
  scene.draw();
  return { ok: true, saleCargoValue: saleCargo.reduce((sum, item) => sum + item.value, 0), oreSaleValue: saleCargo[0].value + saleCargo[1].value, cargoBefore: state.cargo.map((item) => ({ id: item.id, kind: item.kind, value: item.value })) };
}

function prepSamplerStage(scene: DeepdiveScene) {
  if (scene.world.length < WORLD_H || scene.world.some((row) => !row || row.length < WORLD_W)) {
    scene.generateWorld();
    scene.worldReady = true;
  }
  const centerX = Math.floor(WORLD_W * 0.5);
  const centerY = Math.floor((SURFACE_Y + 420) / TILE);
  for (let y = centerY - 6; y <= centerY + 6; y += 1) {
    for (let x = centerX - 8; x <= centerX + 12; x += 1) {
      scene.setTile(x, y, 'water');
      if (scene.damage[y]?.[x] !== undefined) scene.damage[y][x] = 0;
    }
  }
  for (let y = centerY + 3; y <= centerY + 5; y += 1) {
    for (let x = centerX - 8; x <= centerX + 12; x += 1) scene.setTile(x, y, 'stone');
  }
  rebuildTerrainMask(scene);
  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.won = false;
  state.radioOpen = false;
  state.logbookOpen = false;
  state.cargoOpen = false;
  state.activeSub = null;
  state.pilotingSub = false;
  state.fuel = fuelMax();
  state.oxygen = oxygenMax();
  state.depth = Math.max(0, Math.round((centerY * TILE - SURFACE_Y) / 6));
  scene.player.x = centerX * TILE + TILE * 0.5;
  scene.player.y = centerY * TILE + TILE * 0.5;
  scene.player.vx = 0;
  scene.player.vy = 0;
  scene.player.facing.set(1, 0);
  scene.player.facingSign = 1;
  scene.player.mineCooldown = 0;
  scene.player.scanCooldown = 0;
  scene.player.sonarCooldown = 0;
  scene.fish = [];
  scene.flora = [];
  scene.articulatedCreatures = [];
  scene.bobbits = [];
  scene.hazards = [];
  scene.larvae = [];
  scene.nestEggs = [];
  scene.looseItems = [];
  scene.terrainBreakEffects = [];
  scene.environmentProps = [];
  clearPlaytestFloatingText(scene);
  scene.terrainBoundsKey = '';
  scene.terrainDirty = true;
  return { centerX, centerY };
}

function stagedSamplerFlora(scene: DeepdiveScene, scanned = false): Flora {
  const species = biomeFlora[state.biome][0];
  const x = scene.player.x + 28;
  const y = scene.player.y;
  const assetKey = floraAssetKey(species);
  return {
    kind: 'flora',
    species: species.species,
    x,
    y,
    anchor: 'floor',
    phase: 0,
    color: species.color,
    hazardous: species.hazardous,
    rare: species.rare,
    scanned,
    scan: 0,
    scanning: false,
    scanPulse: 0,
    sample: 0,
    sampling: false,
    samplePulse: 0,
    sampleCooldown: 0,
    hp: floraMaxHp(species),
    maxHp: floraMaxHp(species),
    dead: false,
    hurtFlash: 0,
    aggroCue: 0,
    radius: scaledEntity(species.radius),
    assetKey,
    sprite: scene.createEntitySprite(x, y, assetKey),
  };
}

function stageFloraSamplerSmoke(scene: DeepdiveScene, mode: 'flora' | 'scannedFlora' | 'fish' | 'articulated' | 'terrain') {
  const stage = prepSamplerStage(scene);
  const beforeSampled = state.sampledSpecies.size;
  if (mode === 'flora' || mode === 'scannedFlora') {
    const flora = stagedSamplerFlora(scene, mode === 'scannedFlora');
    scene.flora = [flora];
    scene.player.facing.set(1, 0);
    scene.cameras.main.setZoom(3);
    scene.cameras.main.centerOn(flora.x, flora.y);
    renderHud();
    scene.draw();
    return { ok: true, mode, species: flora.species, kind: flora.kind, scanned: flora.scanned, sampledSpeciesBefore: beforeSampled };
  }
  if (mode === 'fish') {
    const species = biomeFish[state.biome][0];
    const assetKey = fishAssetKey(species);
    scene.fish = [{
      kind: 'fish',
      species: species.species,
      x: scene.player.x + 28,
      y: scene.player.y,
      vx: 0,
      vy: 0,
      homeX: scene.player.x + 28,
      homeY: scene.player.y,
      speed: 0,
      phase: 0,
      color: species.color,
      hostile: false,
      scanned: false,
      scan: 0,
      scanning: false,
      scanPulse: 0,
      radius: 16,
      pattern: species.pattern,
      bumpCooldown: 0,
      aggro: 0,
      aggroCue: 0,
      stunned: 0,
      hp: fishMaxHp(species),
      maxHp: fishMaxHp(species),
      dead: false,
      hurtFlash: 0,
      assetKey,
      facingSign: -1,
      sprite: scene.createEntitySprite(scene.player.x + 28, scene.player.y, assetKey),
    }];
    scene.cameras.main.centerOn(scene.fish[0].x, scene.fish[0].y);
  } else if (mode === 'articulated') {
    const manifest = articulatedCreatureDefs().find((candidate) => candidate.minBiome <= state.biome) ?? articulatedCreatureDefs()[0];
    if (!manifest) return { ok: false, reason: 'missing-articulated-manifest' };
    const creature = createArticulatedCreature(scene, manifest, scene.player.x + 42, scene.player.y);
    creature.vx = 0;
    creature.vy = 0;
    creature.aggro = 0;
    creature.reviewFrozen = true;
    scene.articulatedCreatures = [creature];
    scene.updateArticulatedParts(creature, 0);
    scene.cameras.main.centerOn(creature.x, creature.y);
  } else {
    const oreX = Math.floor((scene.player.x + PLAYER_FORWARD_REACH) / TILE);
    const oreY = Math.floor(scene.player.y / TILE);
    scene.setTile(oreX, oreY, 'copper');
    scene.cameras.main.centerOn(oreX * TILE + TILE * 0.5, oreY * TILE + TILE * 0.5);
  }
  renderHud();
  scene.draw();
  return { ok: true, mode, sampledSpeciesBefore: beforeSampled, stagedTile: scene.getTile(stage.centerX + 1, stage.centerY) };
}

function stageGeneratedFloraSmoke(scene: DeepdiveScene, source: 'stamp' | 'brush', payload: { assetKey?: string; species?: string; index?: number } = {}) {
  const candidates = scene.flora.filter((flora) => {
    if (flora.source !== source || flora.dead || !flora.surface) return false;
    if (payload.assetKey && flora.assetKey !== payload.assetKey) return false;
    if (payload.species && flora.species !== payload.species) return false;
    return true;
  });
  const flora = candidates[Phaser.Math.Clamp(Math.floor(Number(payload.index) || 0), 0, Math.max(0, candidates.length - 1))];
  if (!flora?.surface) {
    return {
      ok: false,
      reason: source === 'stamp' ? 'no-stamp-flora' : 'no-brush-flora',
      requested: { assetKey: payload.assetKey ?? '', species: payload.species ?? '' },
      available: scene.flora
        .filter((candidate) => candidate.source === source)
        .map((candidate) => ({ species: candidate.species, assetKey: candidate.assetKey, dead: candidate.dead })),
    };
  }
  flora.dead = false;
  flora.hp = flora.maxHp;
  flora.scanned = false;
  flora.scan = 0;
  flora.scanning = false;
  flora.sample = 0;
  flora.sampling = false;
  flora.samplePulse = 0;
  flora.sampleCooldown = 0;
  state.scannedSpecies.delete(flora.species);
  state.sampledSpecies.delete(flora.species);
  state.cargo = state.cargo.filter((item) => item.sampleSpecies !== flora.species);
  state.selectedCargoIndex = Math.min(state.selectedCargoIndex, Math.max(0, state.cargo.length - 1));
  state.upgrades.scanner = Math.max(state.upgrades.scanner, 3);
  state.fuel = Math.max(state.fuel, 100);
  state.oxygen = Math.max(state.oxygen, oxygenMax());
  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.radioOpen = false;
  state.logbookOpen = false;
  state.cargoOpen = false;
  state.sonarMapOpen = false;
  scene.player.x = Phaser.Math.Clamp(flora.surface.rootX + flora.surface.normalX * 15, 20, WORLD_W * TILE - 20);
  scene.player.y = Phaser.Math.Clamp(flora.surface.rootY + flora.surface.normalY * 15, 20, WORLD_H * TILE - 20);
  scene.player.vx = 0;
  scene.player.vy = 0;
  scene.player.facing.set(-flora.surface.normalX, -flora.surface.normalY);
  scene.player.facingSign = scene.player.facing.x < 0 ? -1 : 1;
  state.depth = Math.max(0, Math.round((scene.player.y - SURFACE_Y) / 6));
  scene.cameras.main.centerOn(scene.player.x, scene.player.y);
  refreshPlaytestCamera(scene);
  renderHud();
  return {
    ok: true,
    species: flora.species,
    assetKey: flora.assetKey,
    propId: flora.propId ?? '',
    x: roundMetric(flora.x),
    y: roundMetric(flora.y),
    surface: {
      rootX: roundMetric(flora.surface.rootX),
      rootY: roundMetric(flora.surface.rootY),
      normalX: roundMetric(flora.surface.normalX),
      normalY: roundMetric(flora.surface.normalY),
      tileX: flora.surface.tileX,
      tileY: flora.surface.tileY,
      supportMineX: roundMetric(flora.surface.rootX - flora.surface.normalX * TILE * 1.7),
      supportMineY: roundMetric(flora.surface.rootY - flora.surface.normalY * TILE * 1.7),
    },
    snapshot: scene.playtestSnapshot(),
  };
}

function stageStampFloraSmoke(scene: DeepdiveScene, payload: { assetKey?: string; species?: string; index?: number } = {}) {
  return stageGeneratedFloraSmoke(scene, 'stamp', payload);
}

function stageBrushFloraSmoke(scene: DeepdiveScene, payload: { assetKey?: string; species?: string; index?: number } = {}) {
  return stageGeneratedFloraSmoke(scene, 'brush', payload);
}

function reachableOpenWaterPoint(scene: DeepdiveScene, targetDepthMeters: number) {
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [];
  const queued = new Set<string>();
  const enqueue = (x: number, y: number) => {
    if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return;
    const key = `${x},${y}`;
    if (queued.has(key)) return;
    if (tiles[scene.getTile(x, y)].solid) return;
    queued.add(key);
    queue.push({ x, y });
  };
  const center = Math.floor(WORLD_W / 2);
  const playerTileX = Math.floor(scene.player.x / TILE);
  const playerTileY = Math.floor(scene.player.y / TILE);
  for (let y = Math.max(1, playerTileY - 4); y <= Math.min(WORLD_H - 2, playerTileY + 8); y += 1) {
    for (let x = playerTileX - 12; x <= playerTileX + 12; x += 1) enqueue(x, y);
  }
  for (let y = 1; y <= 10; y += 1) {
    for (let x = center - 18; x <= center + 18; x += 1) enqueue(x, y);
  }
  const targetY = Phaser.Math.Clamp(Math.round((SURFACE_Y + (targetDepthMeters / 6) * TILE) / TILE), 4, WORLD_H - 2);
  let best: { x: number; y: number; score: number; localWaterRatio: number } | null = null;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    let localWater = 0;
    let localCells = 0;
    for (let y = current.y - 8; y <= current.y + 8; y += 1) {
      for (let x = current.x - 13; x <= current.x + 13; x += 1) {
        if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) continue;
        localCells += 1;
        if (!tiles[scene.getTile(x, y)].solid) localWater += 1;
      }
    }
    const localWaterRatio = localCells > 0 ? localWater / localCells : 0;
    const depthPenalty = Math.abs(current.y - targetY) * 9;
    const centerPenalty = Math.abs(current.x - center) * 0.08;
    const surfacePenalty = current.y < 8 ? 120 : 0;
    const score = localWaterRatio * 120 - depthPenalty - centerPenalty - surfacePenalty;
    if (!best || score > best.score) best = { ...current, score, localWaterRatio };

    for (const next of [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ]) {
      if (next.x < 0 || next.x >= WORLD_W || next.y < 0 || next.y >= WORLD_H) continue;
      if (visited.has(`${next.x},${next.y}`)) continue;
      if (tiles[scene.getTile(next.x, next.y)].solid) continue;
      queue.push(next);
    }
  }
  return best;
}

function colorHex(value: number) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function textureSourceDimensions(scene: DeepdiveScene, key: string) {
  if (!scene.textures.exists(key)) return { width: 0, height: 0 };
  const source = scene.textures.get(key).getSourceImage();
  return {
    width: Math.max(0, source.width),
    height: Math.max(0, source.height),
  };
}

function renderedBackgroundAnchorSprites(scene: DeepdiveScene) {
  const camera = scene.cameras.main;
  return scene.backgroundAnchorSprites
    .filter((sprite) => sprite.active && sprite.visible && sprite.texture?.key)
    .map((sprite, index) => {
      const key = sprite.texture.key;
      const bounds = sprite.getBounds();
      return {
        index,
        textureKey: key,
        sourceDimensions: textureSourceDimensions(scene, key),
        x: roundMetric(sprite.x),
        y: roundMetric(sprite.y),
        width: roundMetric(sprite.displayWidth),
        height: roundMetric(sprite.displayHeight),
        alpha: roundMetric(sprite.alpha),
        tint: `#${sprite.tintTopLeft.toString(16).padStart(6, '0')}`,
        blendMode: sprite.blendMode,
        crop: sprite.isCropped ? {
          x: roundMetric(sprite.frame.cutX),
          y: roundMetric(sprite.frame.cutY),
          width: roundMetric(sprite.frame.cutWidth),
          height: roundMetric(sprite.frame.cutHeight),
        } : null,
        bounds: {
          x: roundMetric(bounds.x),
          y: roundMetric(bounds.y),
          width: roundMetric(bounds.width),
          height: roundMetric(bounds.height),
        },
        screenBounds: {
          x: roundMetric((bounds.x - camera.worldView.x) * camera.zoom),
          y: roundMetric((bounds.y - camera.worldView.y) * camera.zoom),
          width: roundMetric(bounds.width * camera.zoom),
          height: roundMetric(bounds.height * camera.zoom),
        },
        generatedBackgroundTexture: key.startsWith('water9-') && (
          key.includes('biome-landmark')
          || key.includes('phase3-landmark')
          || key.includes('phase5-')
          || key.includes('phase7-')
          || key.includes('phase8-')
          || key.includes('phase9-')
          || key.includes('phase10-')
          || key.includes('phase11-')
        ),
      };
    });
}

function backgroundReviewSnapshot(scene: DeepdiveScene, label = 'snapshot', stagedWaterWindow = false) {
  refreshPlaytestCamera(scene);
  const camera = scene.cameras.main;
  const view = camera.worldView;
  const profile = environmentVisualProfileFor(state.biome, state.depth);
  const padding = 24;
  const anchors = environmentAnchorSilhouettesFor(profile, view.x, view.right, view.y, view.bottom);
  return {
    label,
    activeProfile: {
      id: profile.id,
      biome: profile.biome,
      depthBand: profile.depthBand,
      activeBand: profile.activeBand.id,
      activeBandBlend: {
        from: profile.activeBandBlend.from,
        to: profile.activeBandBlend.to,
        progress: roundMetric(profile.activeBandBlend.progress),
        lowerToTransitionDeep: profile.activeBandBlend.from === 'lower' && profile.activeBandBlend.to === 'transitionDeep',
      },
      cameraClearColor: profile.cameraClearColor,
    },
    activeBand: {
      id: profile.activeBand.id,
      topColor: colorHex(profile.activeBand.topColor),
      bottomColor: colorHex(profile.activeBand.bottomColor),
      hazeColor: colorHex(profile.activeBand.hazeColor),
      hazeAlpha: roundMetric(profile.activeBand.hazeAlpha),
      sedimentAlpha: roundMetric(profile.activeBand.sedimentAlpha),
      causticAlpha: roundMetric(profile.activeBand.causticAlpha),
      silhouetteAlpha: roundMetric(profile.activeBand.silhouetteAlpha),
      anchorDensity: roundMetric(profile.activeBand.anchorDensity),
    },
    repeatModes: {
      layers: profile.background.layers.map((layer) => layer.repeatMode),
      worldSpaceNoise: profile.background.worldSpaceNoise.repeatMode,
      anchors: profile.background.anchors.repeatMode,
    },
    bands: profile.bands.map((band) => ({
      id: band.id,
      startDepth: band.startDepth,
      endDepth: band.endDepth,
      blendPx: band.blendPx,
      hazeAlpha: roundMetric(band.hazeAlpha),
      sedimentAlpha: roundMetric(band.sedimentAlpha),
      causticAlpha: roundMetric(band.causticAlpha),
      silhouetteAlpha: roundMetric(band.silhouetteAlpha),
      anchorDensity: roundMetric(band.anchorDensity),
    })),
    world: {
      biome: state.biome,
      biomeName: biomeName(),
      depth: state.depth,
      playerX: roundMetric(scene.player.x),
      playerY: roundMetric(scene.player.y),
      stagedWaterWindow,
    },
    camera: {
      x: roundMetric(view.x),
      y: roundMetric(view.y),
      right: roundMetric(view.right),
      bottom: roundMetric(view.bottom),
      width: roundMetric(view.width),
      height: roundMetric(view.height),
      zoom: roundMetric(camera.zoom),
    },
    surface: {
      ...profile.surface,
      skyTopColor: colorHex(profile.surface.skyTopColor),
      skyBottomColor: colorHex(profile.surface.skyBottomColor),
      waterTopColor: colorHex(profile.surface.waterTopColor),
      waterBottomColor: colorHex(profile.surface.waterBottomColor),
    },
    overlay: {
      alpha: roundMetric(profile.overlay.alpha),
      color: colorHex(profile.overlay.color),
      density: roundMetric(profile.overlay.density),
      drift: roundMetric(profile.overlay.drift),
      mistStepPx: profile.overlay.mistStepPx,
    },
    darkness: {
      value: roundMetric(profile.darkness.value),
      ambientOpacity: roundMetric(profile.darkness.ambientOpacity),
      maskOpacity: roundMetric(profile.darkness.maskOpacity),
    },
    worldSpaceNoise: {
      ...profile.background.worldSpaceNoise,
      alpha: roundMetric(profile.background.worldSpaceNoise.alpha),
      color: colorHex(profile.background.worldSpaceNoise.color),
      postDarknessVeil: {
        ...profile.background.worldSpaceNoise.postDarknessVeil,
        alpha: roundMetric(profile.background.worldSpaceNoise.postDarknessVeil.alpha),
        particleAlpha: roundMetric(profile.background.worldSpaceNoise.postDarknessVeil.particleAlpha),
        color: colorHex(profile.background.worldSpaceNoise.postDarknessVeil.color),
      },
      assets: profile.background.worldSpaceNoise.assets.map((asset) => ({
        id: asset.id,
        label: asset.label,
        role: asset.role,
        band: asset.band,
        repeatMode: asset.repeatMode,
        safeOpacity: asset.safeOpacity,
        scaleRange: asset.scaleRange,
        parallaxRange: asset.parallaxRange,
        readabilityRisk: asset.readabilityRisk,
        availableInRuntime: asset.availableInRuntime,
        path: asset.path,
        sourcePath: asset.sourcePath,
        sourceStatus: asset.sourceStatus,
      })),
      layers: profile.background.worldSpaceNoise.layers.map((layer) => ({
        id: layer.id,
        kind: layer.kind,
        assetId: layer.assetId,
        textureKey: layer.textureKey,
        repeatMode: layer.repeatMode,
        alpha: roundMetric(layer.alpha),
        color: colorHex(layer.color),
        blendMode: layer.blendMode,
        scale: roundMetric(layer.scale),
        tileScaleX: roundMetric(layer.tileScaleX),
        tileScaleY: roundMetric(layer.tileScaleY),
        parallaxX: roundMetric(layer.parallaxX),
        parallaxY: roundMetric(layer.parallaxY),
        driftX: roundMetric(layer.driftX),
        driftY: roundMetric(layer.driftY),
        phaseX: roundMetric(layer.phaseX),
        phaseY: roundMetric(layer.phaseY),
        depthGate: roundMetric(layer.depthGate),
        sourceAlpha: roundMetric(layer.sourceAlpha),
        bandScale: roundMetric(layer.bandScale),
        biomeScale: roundMetric(layer.biomeScale),
        loaded: scene.textures.exists(layer.textureKey),
      })),
    },
    waterColumnLayers: {
      poolSize: scene.waterColumnLayers.length,
      visibleCount: profile.background.worldSpaceNoise.layers.filter((layer) => layer.alpha > 0.0008 && scene.textures.exists(layer.textureKey)).length,
      items: profile.background.worldSpaceNoise.layers.map((layer) => {
        const poolIndex = scene.waterColumnLayers.findIndex((sprite) => (
          sprite.visible
          && (sprite.texture.key === layer.textureKey || sprite.getData('waterColumnSourceTextureKey') === layer.textureKey)
        ));
        const sprite = poolIndex >= 0 ? scene.waterColumnLayers[poolIndex] : null;
        return {
          id: layer.id,
          kind: layer.kind,
          assetId: layer.assetId,
          textureKey: layer.textureKey,
          runtimeTextureKey: sprite?.getData('waterColumnRuntimeTextureKey') ?? null,
          loaded: scene.textures.exists(layer.textureKey),
          visible: Boolean(sprite?.visible) && layer.alpha > 0.0008,
          poolIndex,
          alpha: roundMetric(layer.alpha),
          spriteAlpha: sprite ? roundMetric(sprite.alpha) : 0,
          color: colorHex(layer.color),
          blendMode: layer.blendMode,
          spriteBlendMode: sprite?.getData('waterColumnBlendMode') ?? null,
          scale: roundMetric(layer.scale),
          tileScaleX: sprite ? roundMetric(sprite.tileScaleX) : null,
          tileScaleY: sprite ? roundMetric(sprite.tileScaleY) : null,
          tilePositionX: sprite ? roundMetric(sprite.tilePositionX) : null,
          tilePositionY: sprite ? roundMetric(sprite.tilePositionY) : null,
          parallaxX: roundMetric(layer.parallaxX),
          parallaxY: roundMetric(layer.parallaxY),
          driftX: roundMetric(layer.driftX),
          driftY: roundMetric(layer.driftY),
          phaseX: roundMetric(layer.phaseX),
          phaseY: roundMetric(layer.phaseY),
          depthGate: roundMetric(layer.depthGate),
          sourceAlpha: roundMetric(layer.sourceAlpha),
          bandScale: roundMetric(layer.bandScale),
          biomeScale: roundMetric(layer.biomeScale),
        };
      }),
    },
    anchors: {
      repeatMode: profile.background.anchors.repeatMode,
      profileCount: profile.background.anchors.count,
      visibleCount: anchors.length,
      transitionBlendCounts: {
        outgoingLower: anchors.filter((anchor) => anchor.transitionBlendRole === 'outgoingLower').length,
        incomingTransition: anchors.filter((anchor) => anchor.transitionBlendRole === 'incomingTransition').length,
      },
      assets: profile.background.anchors.assets.map((asset) => ({
        id: asset.id,
        label: asset.label,
        role: asset.role,
        band: asset.band,
        repeatMode: asset.repeatMode,
        safeOpacity: asset.safeOpacity,
        scaleRange: asset.scaleRange,
        parallaxRange: asset.parallaxRange,
        readabilityRisk: asset.readabilityRisk,
        availableInRuntime: asset.availableInRuntime,
        path: asset.path,
        sourcePath: asset.sourcePath,
        sourceStatus: asset.sourceStatus,
      })),
      items: anchors.map((anchor) => ({
        id: anchor.id,
        kind: anchor.kind,
        depthBand: anchor.depthBand,
        x: roundMetric(anchor.x),
        y: roundMetric(anchor.y),
        width: roundMetric(anchor.width),
        height: roundMetric(anchor.height),
        alpha: roundMetric(anchor.alpha),
        color: colorHex(anchor.color),
        parallaxFactor: roundMetric(anchor.parallaxFactor),
        assetId: anchor.assetId ?? null,
        assetStatus: anchor.assetStatus ?? null,
        textureKey: anchor.textureKey ?? null,
        transitionBlendRole: anchor.transitionBlendRole ?? null,
        transitionBlendAlpha: anchor.transitionBlendAlpha !== undefined ? roundMetric(anchor.transitionBlendAlpha) : null,
      })),
    },
    renderedBitmapAnchors: renderedBackgroundAnchorSprites(scene),
    manifest: profile.background.manifest.map((asset) => ({
      id: asset.id,
      label: asset.label,
      textureKey: asset.textureKey,
      path: asset.path,
      sourcePath: asset.sourcePath,
      sourceStatus: asset.sourceStatus,
      role: asset.role,
      band: asset.band,
      repeatMode: asset.repeatMode,
      safeOpacity: asset.safeOpacity,
      scaleRange: asset.scaleRange,
      parallaxRange: asset.parallaxRange,
      readabilityRisk: asset.readabilityRisk,
      availableInRuntime: asset.availableInRuntime,
      fallbackTexturePrefix: asset.fallbackTexturePrefix ?? null,
    })),
    layers: profile.background.layers.map((layer) => {
      const exactKey = scene.textures.exists(layer.texturePrefix) ? layer.texturePrefix : '';
      const key = exactKey;
      const source = textureSourceDimensions(scene, key);
      const coverScale = Math.max((view.width + padding * 2) / Math.max(1, source.width), (view.height + padding * 2) / Math.max(1, source.height), 1) * layer.scale;
      const scaledHeight = source.height * coverScale;
      const verticalRepeatsInView = scaledHeight > 0 ? (view.height + padding * 2) / scaledHeight : null;
      return {
        index: layer.index,
        textureKey: key,
        texturePrefix: layer.texturePrefix,
        fallbackPrefix: layer.fallbackPrefix,
        painterlyAssetId: layer.painterlyAssetId ?? null,
        painterlyAssetStatus: layer.painterlyAssetStatus ?? null,
        sourceDimensions: source,
        intendedRepeatMode: layer.intendedRepeatMode,
        activeRepeatMode: layer.repeatMode,
        layerKind: layer.layerKind,
        seamless: layer.seamless,
        band: layer.band,
        horizontalSpeed: roundMetric(layer.horizontalSpeed),
        verticalSpeed: roundMetric(layer.verticalSpeed),
        phaseX: roundMetric(layer.phaseX),
        phaseY: roundMetric(layer.phaseY),
        alpha: roundMetric(layer.alpha),
        tint: colorHex(layer.tint),
        scale: roundMetric(layer.scale),
        tileScale: roundMetric(coverScale),
        scaledSourceHeight: roundMetric(scaledHeight),
        verticalRepeatsInView: verticalRepeatsInView === null ? null : roundMetric(verticalRepeatsInView),
        repeatYEnabled: layer.repeatMode === 'repeatXY',
        shortSourceForViewport: source.height > 0 && source.height < view.height * 0.5,
        obviousSingleViewportYRepeat: layer.repeatMode === 'repeatXY' && verticalRepeatsInView !== null && verticalRepeatsInView > 1.15,
        yRepeatRiskFromMetadata: layer.repeatMode === 'repeatXY' && !layer.seamless && source.height > 0 && source.height < view.height * 0.5 && Math.abs(layer.verticalSpeed) > 0,
        scenicRepeatYViolation: layer.layerKind === 'scenic' && !layer.seamless && layer.repeatMode === 'repeatXY',
      };
    }),
  };
}

function stageBackgroundReview(scene: DeepdiveScene, value?: unknown) {
  const payload = typeof value === 'object' && value !== null ? value as { label?: string; depth?: number; reviewX?: number; clearWaterWindow?: boolean; zoom?: number } : {};
  const reviewDepth = Phaser.Math.Clamp(Number(payload.depth) || 0, 0, Math.floor((WORLD_H * TILE - SURFACE_Y - TILE) / 6));
  const reviewX = Phaser.Math.Clamp(Number.isFinite(payload.reviewX) ? Number(payload.reviewX) : WORLD_W * TILE * 0.5, 760, WORLD_W * TILE - 760);
  const reviewY = Phaser.Math.Clamp(SURFACE_Y + reviewDepth * 6, 40, WORLD_H * TILE - 40);
  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.won = false;
  state.radioOpen = false;
  state.logbookOpen = false;
  state.cargoOpen = false;
  state.controller = {
    ...state.controller,
    connected: false,
    name: '',
    index: -1,
    message: '',
    hint: '',
    buttons: [],
    axes: [],
    lastAction: '',
  };
  state.biomeLoading.active = false;
  state.biomeLoading.phase = 'idle';
  state.biomeLoading.progress = 0;
  state.depth = Math.max(0, Math.round((reviewY - SURFACE_Y) / 6));
  state.oxygen = oxygenMax();
  state.fuel = fuelMax();
  scene.player.x = reviewX;
  scene.player.y = reviewY;
  scene.player.vx = 0;
  scene.player.vy = 0;
  const brineReviewFacing = Number(state.biome) === 2;
  scene.player.facing.set(brineReviewFacing ? 0.08 : 1, brineReviewFacing ? 1 : 0).normalize();
  scene.player.facingSign = 1;
  scene.backgroundReviewNoBeam = brineReviewFacing;
  scene.fish = [];
  scene.flora = [];
  scene.articulatedCreatures = [];
  scene.bobbits = [];
  scene.hazards = [];
  scene.larvae = [];
  scene.nestEggs = [];
  scene.looseItems = [];
  scene.environmentProps = [];
  scene.terrainBreakEffects = [];
  clearPlaytestFloatingText(scene);
  scene.cameras.main.setZoom(Phaser.Math.Clamp(Number(payload.zoom) || 1, 0.75, 1.65));
  scene.cameras.main.centerOn(reviewX, reviewY);
  refreshPlaytestCamera(scene);
  const stagedWaterWindow = payload.clearWaterWindow !== false;
  if (stagedWaterWindow) {
    const view = scene.cameras.main.worldView;
    const startX = Math.max(1, Math.floor(view.x / TILE) - 1);
    const endX = Math.min(WORLD_W - 2, Math.ceil(view.right / TILE) + 1);
    const startY = Math.max(7, Math.floor(view.y / TILE) - 1);
    const endY = Math.min(WORLD_H - 2, Math.ceil(view.bottom / TILE) + 1);
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) scene.setTile(x, y, 'water');
    }
    const floorY = Math.max(startY + 2, endY - 2);
    if (state.biome !== 2) {
      for (let y = floorY; y <= endY; y += 1) {
        for (let x = startX; x <= endX; x += 1) {
          const noise = hash(x * 17, y * 19, rng.seed + 9911);
          const capNoise = hash(x * 23, y * 29, rng.seed + 9917);
          if (y === floorY && capNoise < 0.72) {
            scene.setTile(x, y, 'water');
          } else {
            scene.setTile(x, y, noise > 0.78 ? 'anchorstone' : 'stone');
          }
        }
      }
      for (let y = startY; y <= endY; y += 1) {
        for (let x = startX; x <= Math.min(startX + 2, endX); x += 1) scene.setTile(x, y, 'stone');
        for (let x = Math.max(endX - 2, startX); x <= endX; x += 1) scene.setTile(x, y, 'stone');
      }
    }
    if (state.biome !== 2) {
      const oreX = Phaser.Math.Clamp(startX + 9, startX + 4, endX - 8);
      const oreY = Phaser.Math.Clamp(floorY - 1, startY + 2, endY - 2);
      const edgeAnchorTiles: Array<[number, number, Tile]> = [
        [0, 0, 'stone'],
        [1, 0, 'anchorstone'],
        [0, 1, 'anchorstone'],
        [2, 1, 'stone'],
      ];
      for (const [dx, dy, tile] of edgeAnchorTiles) scene.setTile(oreX + dx, oreY + dy, tile);
      const playerTileX = Math.floor(scene.player.x / TILE);
      const playerTileY = Math.floor(scene.player.y / TILE);
      const faceX = Phaser.Math.Clamp(playerTileX + 9, startX + 6, endX - 10);
      const faceTop = Phaser.Math.Clamp(playerTileY - 5, startY + 2, endY - 9);
      for (let y = faceTop; y <= faceTop + 10; y += 1) {
        for (let x = faceX; x <= faceX + 6; x += 1) {
          const edge = x === faceX || y === faceTop || y === faceTop + 10;
          const n = hash(x * 29, y * 31, rng.seed + 9931);
          scene.setTile(x, y, edge || n > 0.64 ? 'stone' : 'sand');
        }
      }
      const reviewOre: Array<[number, number, Tile]> = [
        [0, 0, 'copper'],
        [1, 0, 'quartz'],
        [0, 1, 'quartz'],
        [2, 1, 'copper'],
        [1, 2, 'copper'],
      ];
      for (const [dx, dy, tile] of reviewOre) scene.setTile(faceX + dx, faceTop + 3 + dy, tile);
    }
    rebuildTerrainMask(scene);
    scene.terrainBoundsKey = '';
    scene.terrainDirty = true;
  }
  renderHud();
  scene.draw();
  return backgroundReviewSnapshot(scene, String(payload.label ?? 'background-review'), stagedWaterWindow);
}

type TerrainReviewStage = 'intact' | 'damage' | 'break' | 'after';
type MiningPolishReviewStage = 'setup' | 'drill' | 'collect';
type ShapeFirstOreProofDeposit = { tile: Tile; x: number; y: number; width: number; height: number };
type ShapeFirstOreProofScene = DeepdiveScene & { shapeFirstOreProofDeposits?: ShapeFirstOreProofDeposit[] };
const SHAPE_FIRST_ORE_TIERS: Tile[] = ['copper', 'quartz', 'ruby', 'cobalt', 'sunstone', 'relic', 'alienAlloy', 'drownedIdol', 'precursorEngine', 'abyssalCrown', 'ruinCore'];

function shapeFirstOrePocketShape(tile: Tile): Array<[number, number]> {
  if (tile === 'ruby') return [[0, 0], [1, -1], [1, 0], [0, 1]];
  if (tile === 'cobalt') return [[0, 0], [1, 0], [0, 1], [1, 2]];
  if (tile === 'quartz') return [[0, 0], [1, 0], [0, 1], [2, 1]];
  if (tile === 'sunstone') return [[0, 0], [1, -1], [1, 0], [2, 0]];
  if (tile === 'relic') return [[0, 0], [1, 0], [0, 1], [1, 2]];
  if (tile === 'alienAlloy') return [[0, 0], [1, -1], [1, 0], [2, 1]];
  if (tile === 'drownedIdol') return [[0, 0], [1, 0], [0, 1], [1, 1]];
  if (tile === 'precursorEngine') return [[0, 0], [1, 0], [2, 0], [1, 1]];
  if (tile === 'abyssalCrown') return [[0, 0], [1, -1], [2, 0], [1, 1]];
  if (tile === 'ruinCore') return [[0, 0], [1, 0], [0, 1], [1, 1]];
  return [[0, 0], [1, -1], [1, 0], [0, 1]];
}

function shapeFirstOreDepositBounds(deposit: { tile: Tile; x: number; y: number }) {
  const shape = shapeFirstOrePocketShape(deposit.tile);
  const xs = shape.map(([dx]) => deposit.x + dx);
  const ys = shape.map(([, dy]) => deposit.y + dy);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function stageTerrainReview(scene: DeepdiveScene, stage: TerrainReviewStage = 'intact') {
  const centerX = Math.floor(WORLD_W * 0.5);
  const floorY = Math.floor((SURFACE_Y + 780) / TILE);
  const left = centerX - 42;
  const right = centerX + 42;
  const top = floorY - 8;
  const bottom = floorY + 8;
  const surfaceAt = (x: number) => {
    const local = x - left;
    const wave = Math.sin(local * 0.22) * 2.6
      + Math.sin(local * 0.09 + 1.8) * 1.7
      + Math.sin(local * 0.47 + rng.seed * 0.013) * 1.2;
    return floorY + Math.round(wave);
  };
  const organicCutout = (x: number, y: number, surface: number) => {
    if (Math.abs(x - centerX) < 3 && y <= surface + 2) return false;
    const cavities = [
      { x: centerX - 31, y: floorY + 3, rx: 8.5, ry: 4.6 },
      { x: centerX - 18, y: floorY + 6, rx: 6.5, ry: 3.4 },
      { x: centerX + 21, y: floorY + 1, rx: 7.8, ry: 4.2 },
      { x: centerX + 35, y: floorY - 2, rx: 5.8, ry: 3.2 },
    ];
    for (const cavity of cavities) {
      const nx = (x - cavity.x) / cavity.rx;
      const ny = (y - cavity.y) / cavity.ry;
      const ragged = 0.88 + hash(x * 31, y * 37, rng.seed + 2271) * 0.26;
      if (nx * nx + ny * ny < ragged) return true;
    }
    if (y <= surface + 2) {
      const lobe = hash(Math.floor(x / 4) * 41, Math.floor(y / 3) * 43, rng.seed + 2297);
      const wave = Math.sin((x - left) * 0.31 + y * 0.17 + rng.seed * 0.019) * 0.5 + 0.5;
      return lobe * 0.68 + wave * 0.32 > 0.82;
    }
    return false;
  };
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const surface = surfaceAt(x);
      const orePocket = x >= centerX + 2 && x <= centerX + 8 && y >= surface && y <= surface + 3;
      const undercut = x >= centerX - 15 && x <= centerX - 10 && y >= surface && y <= surface + 1 && hash(x, y, rng.seed + 233) > 0.72;
      const tile: Tile = y < surface || undercut || organicCutout(x, y, surface)
        ? 'water'
        : orePocket
          ? (x + y) % 3 === 0 ? 'quartz' : 'copper'
          : y < surface + 4 ? 'stone' : 'sand';
      scene.setTile(x, y, tile);
      if (scene.damage[y]?.[x] !== undefined) scene.damage[y][x] = 0;
    }
  }
  rebuildTerrainMask(scene);

  const targetX = centerX;
  const targetY = surfaceAt(centerX);
  const targetTile = scene.getTile(targetX, targetY);
  const targetDef = tiles[targetTile];
  scene.terrainBreakEffects = [];
  if (stage === 'damage' && scene.damage[targetY]?.[targetX] !== undefined) {
    scene.damage[targetY][targetX] = targetDef.hp * 0.72;
  } else if (stage === 'break' || stage === 'after') {
    const cutX = targetX * TILE + TILE * 0.5;
    const cutY = targetY * TILE + TILE * 0.5;
    for (let i = 0; i < 4; i += 1) {
      subtractTerrainMaskBrush(
        scene,
        cutX + (hash(targetX + i, targetY, rng.seed + 541) - 0.5) * TILE * 0.5,
        cutY + (hash(targetY, targetX + i, rng.seed + 547) - 0.5) * TILE * 0.45,
        TILE * 0.3,
        0.72,
      );
    }
    if (scene.damage[targetY]?.[targetX] !== undefined) scene.damage[targetY][targetX] = 0;
    if (stage === 'break') {
      scene.terrainBreakEffects.push({
        x: cutX,
        y: cutY,
        age: 0.08,
        life: 0.62,
        color: targetDef.color,
        seed: hash(targetX, targetY, rng.seed),
      });
    }
  }

  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.radioOpen = false;
  state.depth = Math.max(0, Math.round((targetY * TILE - SURFACE_Y) / 6));
  state.fuel = Math.max(state.fuel, 60);
  state.oxygen = Math.max(state.oxygen, 80);
  scene.player.x = centerX * TILE;
  scene.player.y = targetY * TILE - 24;
  scene.player.vx = 0;
  scene.player.vy = 0;
  scene.player.mineCooldown = 0;
  scene.player.facing.set(0.38, 0.92);
  scene.player.facingSign = 1;
  scene.fish = [];
  scene.flora = [];
  scene.articulatedCreatures = [];
  scene.bobbits = [];
  scene.hazards = [];
  scene.larvae = [];
  scene.nestEggs = [];
  scene.looseItems = [];
  clearPlaytestFloatingText(scene);
  scene.populateEnvironmentProps();
  scene.terrainBreakEffects = stage === 'after' ? [] : scene.terrainBreakEffects.slice(-12);
  scene.terrainBoundsKey = '';
  scene.terrainDirty = true;
  state.status = stage === 'intact'
    ? 'Terrain mining review: intact rock face.'
    : stage === 'damage'
      ? 'Terrain mining review: damaged rock wound.'
      : stage === 'break'
        ? 'Terrain mining review: fresh break event.'
        : 'Terrain mining review: settled mined opening.';
  renderHud();
}

function stageMiningPolishReview(scene: DeepdiveScene, stage: MiningPolishReviewStage = 'setup') {
  const centerX = Math.floor(WORLD_W * 0.5);
  const centerY = Math.floor((SURFACE_Y + 360) / TILE);
  const oreX = centerX + 4;
  const oreY = centerY;
  const target = {
    tileX: oreX,
    tileY: oreY,
    worldX: oreX * TILE + TILE * 0.5,
    worldY: oreY * TILE + TILE * 0.5,
  };
  if (stage === 'drill') {
    const beforeCargo = state.cargo.length;
    const repeats = 1;
    state.fuel = Math.max(state.fuel, 80);
    state.oxygen = Math.max(state.oxygen, 80);
    state.upgrades.laser = Math.max(state.upgrades.laser, 3);
    for (let i = 0; i < repeats; i += 1) {
      scene.player.mineCooldown = 0;
      scene.mineAt(target.worldX, target.worldY);
    }
    scene.draw();
    const sx = Math.floor((target.worldX / TILE) * TERRAIN_MASK_RES);
    const sy = Math.floor((target.worldY / TILE) * TERRAIN_MASK_RES);
    return {
      stage,
      target: { ...target, tile: scene.getTile(oreX, oreY) },
      damage: scene.damage[oreY]?.[oreX] ?? null,
      centerMaskDensity: terrainMaskDensityAt(scene, sx, sy),
      terrainBreakEffects: scene.terrainBreakEffects.length,
      looseItems: scene.looseItems.filter((item) => item.value > 0).length,
      beforeCargo,
      afterCargo: state.cargo.length,
      status: state.status,
    };
  }
  if (stage === 'collect') {
    const beforeCargo = state.cargo.length;
    const beforeValue = state.cargo.reduce((sum, item) => sum + item.value, 0);
    const item = scene.looseItems.find((candidate) => candidate.value > 0 && !candidate.collected) ?? null;
    if (item) {
      item.pickupDelay = 0;
      scene.player.x = item.x;
      scene.player.y = item.y;
      scene.player.vx = 0;
      scene.player.vy = 0;
      scene.updateLooseItems(1 / 60);
      scene.updateLooseItems(1 / 60);
    }
    const afterCargo = state.cargo.length;
    const afterValue = state.cargo.reduce((sum, cargo) => sum + cargo.value, 0);
    renderHud();
    scene.draw();
    return {
      stage,
      beforeCargo,
      afterCargo,
      beforeValue,
      afterValue,
      collectedOnce: afterCargo === beforeCargo + (item ? 1 : 0),
      remainingValuableLooseItems: scene.looseItems.filter((candidate) => candidate.value > 0 && !candidate.collected).length,
    };
  }

  if (scene.world.length < WORLD_H || scene.world.some((row) => !row || row.length < WORLD_W)) {
    scene.generateWorld();
    scene.worldReady = true;
  }
  const left = centerX - 10;
  const right = centerX + 12;
  const top = centerY - 7;
  const bottom = centerY + 7;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const wall = x >= oreX - 1 && x <= oreX + 6 && y >= oreY - 4 && y <= oreY + 4;
      scene.setTile(x, y, wall ? 'stone' : 'water');
      if (scene.damage[y]?.[x] !== undefined) scene.damage[y][x] = 0;
    }
  }
  scene.setTile(oreX, oreY, 'copper');
  scene.setTile(oreX + 1, oreY, 'quartz');
  scene.setTile(oreX, oreY - 1, 'stone');
  scene.setTile(oreX, oreY + 1, 'stone');
  rebuildTerrainMask(scene);
  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.won = false;
  state.radioOpen = false;
  state.logbookOpen = false;
  state.cargoOpen = true;
  state.activeSub = null;
  state.pilotingSub = false;
  state.depth = Math.max(0, Math.round((oreY * TILE - SURFACE_Y) / 6));
  state.fuel = fuelMax();
  state.oxygen = oxygenMax();
  state.cargo = [];
  state.selectedCargoIndex = 0;
  state.upgrades.laser = Math.max(state.upgrades.laser, 3);
  scene.player.x = oreX * TILE - 36;
  scene.player.y = oreY * TILE + TILE * 0.5;
  scene.player.vx = 0;
  scene.player.vy = 0;
  scene.player.mineCooldown = 0;
  scene.player.facing.set(1, 0);
  scene.player.facingSign = 1;
  scene.fish = [];
  scene.flora = [];
  scene.articulatedCreatures = [];
  scene.bobbits = [];
  scene.hazards = [];
  scene.larvae = [];
  scene.nestEggs = [];
  scene.looseItems = [];
  scene.environmentProps = [];
  scene.terrainBreakEffects = [];
  scene.lastMiningFeedbackAt = 0;
  clearPlaytestFloatingText(scene);
  scene.terrainBoundsKey = '';
  scene.terrainDirty = true;
  scene.cameras.main.setZoom(3);
  scene.cameras.main.centerOn(oreX * TILE - 6, oreY * TILE + TILE * 0.5);
  refreshPlaytestCamera(scene);
  state.status = 'Mining polish proof: ore is embedded in the cut face.';
  renderHud();
  scene.draw();
  return {
    stage,
    target: {
      tileX: oreX,
      tileY: oreY,
      worldX: target.worldX,
      worldY: target.worldY,
      tile: scene.getTile(oreX, oreY),
    },
    player: {
      x: Math.round(scene.player.x),
      y: Math.round(scene.player.y),
    },
  };
}

type LooseCollectibleSummary = {
  total: number;
  byKind: Record<string, number>;
  byId: Record<string, number>;
  byValue: Record<string, number>;
  items: Array<{
    id: string;
    kind: string;
    value: number;
    sourceTileX: number | null;
    sourceTileY: number | null;
  }>;
};

function looseCollectibleSummary(scene: DeepdiveScene): LooseCollectibleSummary {
  const items = scene.looseItems
    .filter((item) => !item.collected && (item.kind === 'ore' || item.kind === 'artifact'))
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      value: item.value,
      sourceTileX: item.sourceTileX ?? null,
      sourceTileY: item.sourceTileY ?? null,
    }));
  const increment = (bucket: Record<string, number>, key: string) => {
    bucket[key] = (bucket[key] ?? 0) + 1;
  };
  const byKind: Record<string, number> = {};
  const byId: Record<string, number> = {};
  const byValue: Record<string, number> = {};
  for (const item of items) {
    increment(byKind, item.kind);
    increment(byId, item.id);
    increment(byValue, String(item.value));
  }
  return { total: items.length, byKind, byId, byValue, items };
}

function stageStrayOreDropCase(scene: DeepdiveScene, targetTile: Tile, repeats: number) {
  if (scene.world.length < WORLD_H || scene.world.some((row) => !row || row.length < WORLD_W)) {
    scene.generateWorld();
    scene.worldReady = true;
  }
  const centerX = Math.floor(WORLD_W * 0.5);
  const centerY = Math.floor((SURFACE_Y + 520) / TILE);
  const targetX = centerX + 4;
  const targetY = centerY;
  const left = centerX - 8;
  const right = centerX + 12;
  const top = centerY - 7;
  const bottom = centerY + 7;
  const actualOreTarget = isOreTile(targetTile);
  const wallStartX = targetX;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const wall = x >= wallStartX && x <= targetX + 6 && y >= targetY - 4 && y <= targetY + 4;
      scene.setTile(x, y, wall ? 'stone' : 'water');
      if (scene.damage[y]?.[x] !== undefined) scene.damage[y][x] = 0;
    }
  }
  const nearbyOre: Array<[number, number, Tile]> = actualOreTarget
    ? [
        [targetX, targetY - 1, 'quartz'],
        [targetX, targetY + 1, 'ruby'],
        [targetX + 1, targetY - 2, 'cobalt'],
      ]
    : [
        [targetX, targetY - 1, 'copper'],
        [targetX, targetY + 1, 'quartz'],
        [targetX + 1, targetY - 2, 'ruby'],
      ];
  for (const [x, y, tile] of nearbyOre) scene.setTile(x, y, tile);
  scene.setTile(targetX, targetY, targetTile);
  if (actualOreTarget && scene.damage[targetY]?.[targetX] !== undefined) {
    scene.damage[targetY][targetX] = tiles[targetTile].hp * 0.68;
  }
  rebuildTerrainMask(scene);

  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.won = false;
  state.radioOpen = false;
  state.logbookOpen = false;
  state.cargoOpen = true;
  state.activeSub = null;
  state.pilotingSub = false;
  state.depth = Math.max(0, Math.round((targetY * TILE - SURFACE_Y) / 6));
  state.fuel = fuelMax();
  state.oxygen = oxygenMax();
  state.cargo = [];
  state.selectedCargoIndex = 0;
  state.upgrades.laser = Math.max(state.upgrades.laser, 5);
  scene.player.x = targetX * TILE - 20;
  scene.player.y = targetY * TILE + TILE * 0.5;
  scene.player.vx = 0;
  scene.player.vy = 0;
  scene.player.mineCooldown = 0;
  scene.player.facing.set(1, 0);
  scene.player.facingSign = 1;
  scene.fish = [];
  scene.flora = [];
  scene.articulatedCreatures = [];
  scene.bobbits = [];
  scene.hazards = [];
  scene.larvae = [];
  scene.nestEggs = [];
  scene.looseItems = [];
  scene.environmentProps = [];
  scene.terrainBreakEffects = [];
  scene.lastMiningFeedbackAt = 0;
  clearPlaytestFloatingText(scene);
  scene.terrainBoundsKey = '';
  scene.terrainDirty = true;
  scene.cameras.main.setZoom(3);
  scene.cameras.main.centerOn(targetX * TILE - 6, targetY * TILE + TILE * 0.5);
  refreshPlaytestCamera(scene);

  const before = looseCollectibleSummary(scene);
  const worldX = targetX * TILE + TILE * 0.5;
  const worldY = targetY * TILE + TILE * 0.5;
  const probeTargets = scene.mineTargets(targetX, targetY, worldX, worldY).map((target) => ({
    ...target,
    tile: scene.getTile(target.x, target.y),
  }));
  const centerSx = Math.floor((worldX / TILE) * TERRAIN_MASK_RES);
  const centerSy = Math.floor((worldY / TILE) * TERRAIN_MASK_RES);
  const probe = {
    tileAtTarget: scene.getTile(targetX, targetY),
    centerMaskDensity: terrainMaskDensityAt(scene, centerSx, centerSy),
    mineTargets: probeTargets,
  };
  for (let i = 0; i < repeats; i += 1) {
    scene.player.mineCooldown = 0;
    scene.mineAt(worldX, worldY);
  }
  scene.draw();
  const after = looseCollectibleSummary(scene);
  return {
    target: {
      tileX: targetX,
      tileY: targetY,
      requestedTile: targetTile,
      currentTile: scene.getTile(targetX, targetY),
      worldX,
      worldY,
    },
    nearbyOre: nearbyOre.map(([x, y, tile]) => ({ x, y, tile, currentTile: scene.getTile(x, y) })),
    repeats,
    probe,
    targetDamage: scene.damage[targetY]?.[targetX] ?? null,
    fuelAfter: state.fuel,
    before,
    after,
    status: state.status,
  };
}

function stageStrayOreDropReview(scene: DeepdiveScene) {
  const plainStone = stageStrayOreDropCase(scene, 'stone', 1);
  const plainSand = stageStrayOreDropCase(scene, 'sand', 1);
  const actualOre = stageStrayOreDropCase(scene, 'copper', 1);
  renderHud();
  return { plainStone, plainSand, actualOre };
}

function stageInteractionEdgeProof(scene: DeepdiveScene, value: unknown) {
  const payload = typeof value === 'object' && value !== null
    ? value as { kind?: string; species?: string; action?: string; seconds?: number }
    : {};
  if (payload.kind === 'ore') return stageInteractionOreProof(scene, payload.action);
  if (payload.kind === 'fauna') return stageInteractionFaunaProof(scene, payload.species === 'Silver Hinge Crab' ? 'Silver Hinge Crab' : 'Mantis Shrimp', payload.action, payload.seconds);
  return { ok: false, reason: 'unknown-interaction-edge-proof-kind' };
}

function stageInteractionOreProof(scene: DeepdiveScene, action = 'setup') {
  const centerX = Math.floor(WORLD_W * 0.5);
  const centerY = Math.floor((SURFACE_Y + 520) / TILE);
  const oreX = centerX + 5;
  const oreY = centerY;
  const target = {
    ore: { x: oreX, y: oreY, worldX: oreX * TILE + TILE * 0.5, worldY: oreY * TILE + TILE * 0.5 },
    oreFace: { x: oreX * TILE - 6, y: oreY * TILE + TILE * 0.5 },
    rockControl: { x: (oreX - 1) * TILE + TILE * 0.5, y: (oreY + 2) * TILE + TILE * 0.5 },
  };
  if (action === 'mineOre' || action === 'mineRockControl') {
    const before = looseCollectibleSummary(scene);
    const mine = action === 'mineOre'
      ? { x: target.ore.worldX, y: target.ore.worldY }
      : target.rockControl;
    state.fuel = fuelMax();
    state.oxygen = oxygenMax();
    state.upgrades.laser = Math.max(state.upgrades.laser, 5);
    for (let i = 0; i < (action === 'mineOre' ? 1 : 2); i += 1) {
      scene.player.mineCooldown = 0;
      scene.mineAt(mine.x, mine.y);
    }
    let fallbackBreakTile = false;
    if (action === 'mineOre' && scene.getTile(oreX, oreY) === 'copper') {
      scene.damage[oreY][oreX] = tiles.copper.hp;
      scene.breakTile(oreX, oreY, 'copper', tiles.copper, target.ore.worldX, target.ore.worldY);
      fallbackBreakTile = true;
    }
    scene.draw();
    return {
      ok: true,
      action,
      target,
      before,
      after: looseCollectibleSummary(scene),
      oreTile: scene.getTile(oreX, oreY),
      rockControlTile: scene.getTile(oreX - 1, oreY + 2),
      oreDamage: scene.damage[oreY]?.[oreX] ?? null,
      fallbackBreakTile,
      status: state.status,
    };
  }

  if (scene.world.length < WORLD_H || scene.world.some((row) => !row || row.length < WORLD_W)) {
    scene.generateWorld();
    scene.worldReady = true;
  }
  for (let y = centerY - 7; y <= centerY + 7; y += 1) {
    for (let x = centerX - 8; x <= centerX + 13; x += 1) {
      scene.setTile(x, y, 'water');
      if (scene.damage[y]?.[x] !== undefined) scene.damage[y][x] = 0;
    }
  }
  for (let y = oreY - 4; y <= oreY + 4; y += 1) {
    for (let x = oreX; x <= oreX + 5; x += 1) scene.setTile(x, y, 'stone');
  }
  scene.setTile(oreX, oreY, 'copper');
  scene.setTile(oreX + 1, oreY, 'quartz');
  scene.setTile(oreX - 1, oreY + 2, 'stone');
  scene.damage[oreY][oreX] = tiles.copper.hp * 0.72;
  rebuildTerrainMask(scene);
  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.won = false;
  state.radioOpen = false;
  state.logbookOpen = false;
  state.cargoOpen = true;
  state.activeSub = null;
  state.pilotingSub = false;
  state.depth = Math.max(0, Math.round((oreY * TILE - SURFACE_Y) / 6));
  state.fuel = fuelMax();
  state.oxygen = oxygenMax();
  state.cargo = [];
  state.selectedCargoIndex = 0;
  state.upgrades.laser = Math.max(state.upgrades.laser, 5);
  scene.player.x = oreX * TILE - 42;
  scene.player.y = oreY * TILE + TILE * 0.5;
  scene.player.vx = 0;
  scene.player.vy = 0;
  scene.player.mineCooldown = 0;
  scene.player.facing.set(1, 0);
  scene.player.facingSign = 1;
  scene.fish = [];
  scene.flora = [];
  scene.articulatedCreatures = [];
  scene.bobbits = [];
  scene.hazards = [];
  scene.larvae = [];
  scene.nestEggs = [];
  scene.looseItems = [];
  scene.environmentProps = [];
  scene.terrainBreakEffects = [];
  clearPlaytestFloatingText(scene);
  scene.terrainBoundsKey = '';
  scene.terrainDirty = true;
  scene.cameras.main.setZoom(3);
  scene.cameras.main.centerOn(oreX * TILE + 8, oreY * TILE + TILE * 0.5);
  refreshPlaytestCamera(scene);
  state.status = 'Interaction proof: visible copper face and adjacent rock control staged.';
  renderHud();
  scene.draw();
  return { ok: true, action: 'setup', target, oreTile: scene.getTile(oreX, oreY), status: state.status };
}

function stageInteractionFaunaProof(scene: DeepdiveScene, species: 'Mantis Shrimp' | 'Silver Hinge Crab', action = 'setup', seconds = 0) {
  if (action === 'advance') {
    const fish = scene.fish.find((candidate) => candidate.species === species && !candidate.dead);
    const before = fish ? faunaProofFishSnapshot(scene, fish) : null;
    const steps = Math.ceil(Phaser.Math.Clamp(Number(seconds) || 2.8, 0.2, 8) / (1 / 30));
    for (let i = 0; i < steps; i += 1) scene.updateFish(1 / 30);
    scene.draw();
    const after = fish ? faunaProofFishSnapshot(scene, fish) : null;
    return { ok: Boolean(fish), action, species, before, after, status: state.status };
  }
  if (scene.world.length < WORLD_H || scene.world.some((row) => !row || row.length < WORLD_W)) {
    scene.generateWorld();
    scene.worldReady = true;
  }
  if (!scene.fish.some((candidate) => candidate.species === species)) {
    scene.generateWorld();
    scene.worldReady = true;
  }
  let fish = scene.fish.find((candidate) => candidate.species === species);
  if (!fish) return { ok: false, reason: 'missing-proof-fauna', species };
  const centerX = Math.floor(WORLD_W * 0.5);
  const centerY = Math.floor((SURFACE_Y + (species === 'Mantis Shrimp' ? 980 : 620)) / TILE);
  for (let y = centerY - 8; y <= centerY + 8; y += 1) {
    for (let x = centerX - 10; x <= centerX + 14; x += 1) scene.setTile(x, y, 'water');
  }
  for (let x = centerX - 8; x <= centerX + 12; x += 1) {
    for (let y = centerY + 2; y <= centerY + 5; y += 1) scene.setTile(x, y, 'stone');
  }
  for (let y = centerY - 3; y <= centerY + 2; y += 1) scene.setTile(centerX + 4, y, 'stone');
  for (let y = centerY - 3; y <= centerY - 1; y += 1) scene.setTile(centerX + 5, y, 'stone');
  rebuildTerrainMask(scene);
  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.won = false;
  state.radioOpen = false;
  state.logbookOpen = false;
  state.cargoOpen = false;
  state.activeSub = null;
  state.pilotingSub = false;
  state.depth = Math.max(0, Math.round((centerY * TILE - SURFACE_Y) / 6));
  state.fuel = fuelMax();
  state.oxygen = oxygenMax();
  scene.fish = [fish];
  fish.dead = false;
  fish.stunned = 0;
  fish.aggro = 0;
  fish.vx = 0;
  fish.vy = 0;
  fish.walkDir = 1;
  fish.walkPause = 0;
  fish.navReseedCooldown = 0;
  fish.tetherRadius = species === 'Mantis Shrimp' ? 34 : 18;
  const anchors = sampleTerrainSurfaceAnchors(scene, {
    minY: (centerY - 5) * TILE,
    maxY: (centerY + 4) * TILE,
    salt: species === 'Mantis Shrimp' ? 41 : 17,
    prefer: ['floor'],
    limit: 80,
  }).filter((anchor) => anchor.anchor === 'floor' && anchor.rootX < (centerX + 3) * TILE);
  const anchor = anchors[0];
  if (!anchor) return { ok: false, reason: 'missing-proof-anchor', species };
  placeProofWalkerOnAnchor(fish, anchor, species === 'Mantis Shrimp' ? 33 : -14);
  scene.player.x = fish.x - 70;
  scene.player.y = fish.y - 20;
  scene.player.vx = 0;
  scene.player.vy = 0;
  scene.player.facing.set(1, 0);
  scene.player.facingSign = 1;
  scene.flora = [];
  scene.articulatedCreatures = [];
  scene.bobbits = [];
  scene.hazards = [];
  scene.larvae = [];
  scene.nestEggs = [];
  scene.looseItems = [];
  clearPlaytestFloatingText(scene);
  scene.cameras.main.setZoom(2.6);
  scene.cameras.main.centerOn(fish.x + 44, fish.y);
  refreshPlaytestCamera(scene);
  state.status = species === 'Mantis Shrimp'
    ? 'Interaction proof: mantis shrimp facing a destructible lip.'
    : 'Interaction proof: neutral crab edge walk orientation.';
  renderHud();
  scene.draw();
  return { ok: true, action: 'setup', species, fish: faunaProofFishSnapshot(scene, fish), status: state.status };
}

function placeProofWalkerOnAnchor(fish: Fish, anchor: TerrainSurfaceAnchor, rootOffsetX: number) {
  const outward = Math.max(fish.radius * 0.58, 7);
  fish.surface = anchor;
  fish.anchor = anchor.anchor;
  fish.rootX = anchor.rootX;
  fish.rootY = anchor.rootY;
  fish.homeX = anchor.rootX;
  fish.homeY = anchor.rootY;
  fish.rootOffsetX = rootOffsetX;
  fish.anchorOffsetX = anchor.normalX * outward;
  fish.anchorOffsetY = anchor.normalY * outward;
  fish.x = anchor.rootX + anchor.normalX * outward + anchor.tangentX * rootOffsetX;
  fish.y = anchor.rootY + anchor.normalY * outward + anchor.tangentY * rootOffsetX;
  fish.facingSign = rootOffsetX >= 0 ? 1 : -1;
  fish.visualFacingSign = fish.facingSign;
  fish.visualAngle = Math.atan2(anchor.tangentY, anchor.tangentX);
  fish.grounded = true;
  fish.fallbackNoAnchor = false;
}

function faunaProofFishSnapshot(scene: DeepdiveScene, fish: Fish) {
  return {
    species: fish.species,
    x: roundMetric(fish.x),
    y: roundMetric(fish.y),
    anchor: fish.anchor ?? fish.surface?.anchor ?? 'none',
    rootX: roundMetric(fish.surface?.rootX ?? fish.homeX),
    rootY: roundMetric(fish.surface?.rootY ?? fish.homeY),
    rootOffsetX: roundMetric(fish.rootOffsetX ?? 0),
    walkDir: fish.walkDir ?? null,
    facingSign: fish.facingSign,
    visualFacingSign: fish.visualFacingSign ?? null,
    visualAngle: roundMetric(fish.visualAngle ?? 0),
    supported: fish.surface ? validateTerrainSurfaceAnchor(scene, fish.surface).valid : false,
  };
}

function stageOreDepositReview(scene: DeepdiveScene, focusTile: Tile = 'sunstone', focusCamera = false, shapeFirstSlice = false, shapeFirstGroup = -1, shapeFirstCameraOffsetY = 0) {
  if (scene.world.length < WORLD_H || scene.world.some((row) => !row || row.length < WORLD_W)) {
    scene.generateWorld();
    scene.worldReady = true;
  }
  const centerX = Math.floor(WORLD_W * 0.5);
  const floorY = Math.floor((SURFACE_Y + 840) / TILE);
  const left = centerX - 22;
  const top = floorY - 12;
  const shapeFirstWallFaceAt = (y: number) => left + 6 + Math.round(Math.sin((y - top) * 0.55) * 1.1 + Math.sin((y - top) * 0.19 + 0.7) * 1.4);
  const shapeFirstRows = [top + 12, top + 13, top + 15];
  const shapeFirstGroupTiles = shapeFirstGroup >= 0
    ? SHAPE_FIRST_ORE_TIERS.slice(shapeFirstGroup * 4, shapeFirstGroup * 4 + 4)
    : SHAPE_FIRST_ORE_TIERS;
  const allOreTiles: Tile[] = shapeFirstSlice
    ? shapeFirstGroupTiles.length ? shapeFirstGroupTiles : SHAPE_FIRST_ORE_TIERS
    : ['copper', 'quartz', 'ruby', 'cobalt', 'sunstone', 'relic', 'alienAlloy', 'drownedIdol', 'precursorEngine', 'abyssalCrown', 'ruinCore'];
  const allTierShapeX = (index: number, rowY: number) => {
    if (shapeFirstGroup >= 0) {
      const column = index % 2;
      return shapeFirstWallFaceAt(rowY) + 2 + column * 3;
    }
    const column = index % 4;
    const row = Math.floor(index / 4);
    const face = shapeFirstWallFaceAt(rowY);
    return face + 2 + column * 5 + (row % 2 ? 1 : 0);
  };
  const allTierShapeY = (index: number) => shapeFirstGroup >= 0
    ? top + 10 + Math.floor(index / 2) * 5 + (index % 2)
    : top + 6 + Math.floor(index / 4) * 6 + (index % 2 ? 1 : 0);
  const deposits = allOreTiles.map((tile, index) => ({
    x: shapeFirstSlice && allOreTiles.length > 3
      ? allTierShapeX(index, allTierShapeY(index))
      : shapeFirstSlice ? shapeFirstWallFaceAt(shapeFirstRows[index] ?? top + 13) + (index === 1 ? 1 : 0) : left + 7 + (index % 4) * 9 + (index >= 8 ? 4 : 0),
    y: shapeFirstSlice && allOreTiles.length > 3
      ? allTierShapeY(index)
      : shapeFirstSlice ? shapeFirstRows[index] ?? top + 13 : top + 6 + Math.floor(index / 4) * 6,
    tile,
    focus: tile === focusTile,
  }));
  for (let y = top - 4; y <= top + 22; y += 1) {
    for (let x = left - 6; x <= left + 43; x += 1) {
      const relX = x - left;
      const wallFace = left + (shapeFirstSlice
        ? 6 + Math.round(Math.sin((y - top) * 0.55) * 1.1 + Math.sin((y - top) * 0.19 + 0.7) * 1.4)
        : 2 + Math.round(Math.sin(relX * 0.27) * 1.2 + Math.sin(relX * 0.09 + 1.4) * 1.4));
      const ceiling = top + 2 + (shapeFirstSlice ? Math.round(Math.sin(relX * 0.2) * 0.45) : Math.round(Math.sin(relX * 0.18) * 0.9));
      const outside = x < wallFace || y < ceiling || x > left + (shapeFirstSlice ? 39 : 41) || y > top + (shapeFirstSlice && allOreTiles.length > 3 ? 24 : 21);
      const sidePocket = !shapeFirstSlice && ((x - (left + 39)) / 2.8) ** 2 + ((y - (top + 18)) / 2.6) ** 2 < 1;
      scene.setTile(x, y, outside || sidePocket ? 'water' : y > top + 18 ? 'sand' : 'stone');
      if (scene.damage[y]?.[x] !== undefined) scene.damage[y][x] = 0;
    }
  }
  for (const deposit of deposits) {
    const pocketShape = shapeFirstSlice
      ? shapeFirstOrePocketShape(deposit.tile)
      : deposit.focus
      ? [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [-1, 0], [3, 0]]
      : [[0, 0], [1, 0], [0, 1], [1, 1]];
    for (const [dx, dy] of pocketShape) {
        scene.setTile(deposit.x + dx, deposit.y + dy, deposit.tile);
        if (scene.damage[deposit.y + dy]?.[deposit.x + dx] !== undefined) scene.damage[deposit.y + dy][deposit.x + dx] = 0;
    }
    const chipTiles: Array<[number, number, Tile]> = shapeFirstSlice
      ? [
        [-1, 0, 'water'],
        [-1, 1, 'water'],
        [2, 0, 'stone'],
        [2, 1, 'stone'],
        [0, -1, 'stone'],
        [1, 1, 'stone'],
        [2, -1, 'stone'],
        [0, 2, 'stone'],
        [1, 3, 'stone'],
      ]
      : [
        [-1, -1, 'stone'],
        [2, -1, 'stone'],
        [-1, 1, 'stone'],
        [2, 2, deposit.y > top + 17 ? 'sand' : 'stone'],
      ];
    for (const [dx, dy, tile] of chipTiles) {
      const x = deposit.x + dx;
      const y = deposit.y + dy;
      if (scene.getTile(x, y) === 'water') scene.setTile(x, y, tile);
      if (scene.damage[y]?.[x] !== undefined) scene.damage[y][x] = 0;
    }
  }
  rebuildTerrainMask(scene);

  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.radioOpen = false;
  state.depth = Math.max(0, Math.round(((top - 1) * TILE - SURFACE_Y) / 6));
  state.fuel = Math.max(state.fuel, 80);
  state.oxygen = Math.max(state.oxygen, 100);
  const lampUpgrade = upgrades.find((upgrade) => upgrade.id === 'lamp');
  if (lampUpgrade) state.upgrades.lamp = Math.max(state.upgrades.lamp, upgradeMax(lampUpgrade));
  const focusDeposit = deposits.find((deposit) => deposit.focus);
  const groupedShapeFirst = shapeFirstSlice && shapeFirstGroup >= 0;
  const shapeFirstCameraX = deposits.reduce((sum, deposit) => sum + (deposit.x + 1) * TILE, 0) / Math.max(1, deposits.length);
  const shapeFirstCameraY = deposits.reduce((sum, deposit) => sum + (deposit.y + 0.5) * TILE, 0) / Math.max(1, deposits.length);
  const cameraX = shapeFirstSlice
    ? shapeFirstCameraX + TILE * 0.55
    : focusCamera && focusDeposit ? (focusDeposit.x - 1.8) * TILE : (left + 21.2) * TILE;
  const cameraY = shapeFirstSlice
    ? shapeFirstCameraY + shapeFirstCameraOffsetY
    : focusCamera && focusDeposit ? (focusDeposit.y + 0.5) * TILE : (top + 11.2) * TILE;
  scene.player.x = shapeFirstSlice
    ? cameraX + TILE * (groupedShapeFirst ? 4.6 : deposits.length > 3 ? 1.2 : 4.6)
    : focusCamera && focusDeposit ? (focusDeposit.x - 2.4) * TILE : (left + 21.2) * TILE;
  scene.player.y = shapeFirstSlice
    ? cameraY + TILE * (groupedShapeFirst ? 0.35 : deposits.length > 3 ? 3.2 : 0.35)
    : focusCamera && focusDeposit ? (focusDeposit.y + 0.5) * TILE : (top + 11.2) * TILE;
  scene.player.vx = 0;
  scene.player.vy = 0;
  scene.player.mineCooldown = 0;
  scene.player.facing.set(
    shapeFirstSlice ? -1 : focusCamera && focusDeposit ? 1 : 0.08,
    shapeFirstSlice ? -0.02 : focusCamera && focusDeposit ? 0.06 : 1,
  ).normalize();
  scene.player.facingSign = 1;
  scene.fish = [];
  scene.flora = [];
  scene.articulatedCreatures = [];
  scene.bobbits = [];
  scene.hazards = [];
  scene.larvae = [];
  scene.nestEggs = [];
  scene.looseItems = [];
  clearPlaytestFloatingText(scene);
  scene.environmentProps = [];
  scene.terrainBreakEffects = [];
  scene.terrainBoundsKey = '';
  scene.terrainDirty = true;
  if (shapeFirstSlice) (scene as ShapeFirstOreProofScene).shapeFirstOreProofDeposits = deposits.map((deposit) => ({
    tile: deposit.tile,
    ...shapeFirstOreDepositBounds(deposit),
  }));
  else delete (scene as ShapeFirstOreProofScene).shapeFirstOreProofDeposits;
  scene.cameras.main.setZoom(shapeFirstSlice && deposits.length > 4 ? 1.25 : 1.85);
  scene.cameras.main.centerOn(cameraX, cameraY);
  refreshPlaytestCamera(scene);
  state.status = shapeFirstSlice
    ? ''
    : `Ore review: embedded strata pockets, focus ${tiles[focusTile].name}.`;
  renderHud();
  scene.draw();
  refreshPlaytestCamera(scene);
}

function stagePerfGuardrailReview(scene: DeepdiveScene, cleanupVisualActors = false) {
  const centerX = Math.floor(WORLD_W * 0.5);
  const centerY = Math.floor((SURFACE_Y + 720) / TILE);
  for (let y = centerY - 8; y <= centerY + 8; y += 1) {
    for (let x = centerX - 14; x <= centerX + 14; x += 1) {
      scene.setTile(x, y, y >= centerY ? 'stone' : 'water');
      if (scene.damage[y]?.[x] !== undefined) scene.damage[y][x] = 0;
    }
  }
  rebuildTerrainMask(scene);
  const rockX = centerX * TILE + TILE * 0.5;
  const rockY = centerY * TILE + TILE * 0.5;
  let creature = scene.articulatedCreatures.find((candidate) => !candidate.dead && !candidate.bobbitBurrow) ?? scene.articulatedCreatures.find((candidate) => !candidate.dead) ?? null;
  if (!creature) {
    const manifest = articulatedCreatureDefs().find((candidate) => candidate.id !== 'abyssal-mandible-bobbit' && state.biome >= candidate.minBiome) ?? articulatedCreatureDefs()[0];
    creature = createArticulatedCreature(scene, manifest, rockX, rockY);
    scene.articulatedCreatures.push(creature);
  }
  let articulatedContact = null;
  if (creature) {
    creature.x = rockX;
    creature.y = rockY;
    creature.vx = 0;
    creature.vy = 0;
    creature.homeX = rockX;
    creature.homeY = rockY;
    creature.reviewFrozen = true;
    scene.updateArticulatedParts(creature, 0);
    const part = creature.parts.find((candidate) => !candidate.detached && candidate.hp > 0) ?? creature.parts[0];
    const contact = part ? scene.articulatedPartTerrainContact(creature, part) : null;
    articulatedContact = contact ? {
      creatureId: creature.id,
      partId: part.id,
      count: contact.count,
      nx: roundMetric(contact.nx),
      ny: roundMetric(contact.ny),
    } : null;
  }
  const refreshBefore = scene.perfTelemetry?.propRefresh.processed ?? 0;
  const fullBefore = scene.perfTelemetry?.propRefresh.fullScans ?? 0;
  for (let i = 0; i < 8; i += 1) {
    const tx = centerX - 4 + i;
    scene.setTile(tx, centerY, 'water');
    scene.refreshEnvironmentPropsAround(tx, centerY);
  }
  scene.processEnvironmentPropRefreshQueue();
  state.activeSub = createSubVehicle(2, rockX, rockY);
  state.activeSub.fuel = subDef(2).fuel;
  state.activeSub.oxygen = subDef(2).oxygen;
  state.activeSub.hull = subDef(2).hull;
  state.pilotingSub = true;
  state.subOwned[2] = true;
  state.selectedSubTier = 2;
  scene.player.x = rockX;
  scene.player.y = rockY;
  scene.player.vx = 0;
  scene.player.vy = 0;
  const subCollision = scene.collides(rockX, rockY);
  scene.processEnvironmentPropRefreshQueue();
  scene.cameras.main.centerOn(rockX, rockY);
  refreshPlaytestCamera(scene);
  scene.draw();
  const result = {
    articulatedContact,
    subCollision,
    localPropRefreshes: (scene.perfTelemetry?.propRefresh.processed ?? 0) - refreshBefore,
    fullScansDuringLocalRefresh: (scene.perfTelemetry?.propRefresh.fullScans ?? 0) - fullBefore,
    propRefresh: scene.perfTelemetry?.propRefresh ?? null,
    perf: perfSnapshot(scene),
  };
  if (cleanupVisualActors) {
    for (const item of scene.articulatedCreatures) {
      item.parts.forEach((part) => part.sprite?.setVisible(false));
      item.socketOverlays.forEach((overlay) => overlay.sprite?.setVisible(false));
    }
    scene.articulatedCreatures = [];
    scene.articulatedBridges.clear();
    scene.actors.clear();
    scene.draw();
  }
  return result;
}

function stageArticulatedContactPolishReview(scene: DeepdiveScene) {
  const reviewX = WORLD_W * TILE * 0.5;
  const reviewY = SURFACE_Y + 520;
  for (let ty = Math.max(7, Math.floor((reviewY - 260) / TILE)); ty <= Math.min(WORLD_H - 2, Math.ceil((reviewY + 260) / TILE)); ty += 1) {
    for (let tx = Math.max(1, Math.floor((reviewX - 620) / TILE)); tx <= Math.min(WORLD_W - 2, Math.ceil((reviewX + 620) / TILE)); tx += 1) {
      scene.setTile(tx, ty, 'water');
    }
  }
  rebuildTerrainMask(scene);
  let creature = scene.articulatedCreatures.find((candidate) => !candidate.dead && !candidate.bobbitBurrow && candidate.parts.some((part) => scene.isDangerousArticulatedPart(candidate, part)))
    ?? scene.articulatedCreatures.find((candidate) => !candidate.dead && candidate.parts.some((part) => scene.isDangerousArticulatedPart(candidate, part)))
    ?? null;
  if (!creature) {
    const manifest = articulatedCreatureDefs().find((candidate) => state.biome >= candidate.minBiome && candidate.parts.some((part) => part.motion.kind === 'jaw' || part.anchors?.bite)) ?? articulatedCreatureDefs()[0];
    creature = createArticulatedCreature(scene, manifest, reviewX, reviewY);
    scene.articulatedCreatures.push(creature);
  }
  creature.reviewFrozen = false;
  creature.dead = false;
  creature.hp = Math.max(creature.hp, creature.maxHp);
  creature.x = reviewX;
  creature.y = reviewY;
  creature.homeX = reviewX;
  creature.homeY = reviewY;
  creature.vx = creature.speed * 0.8;
  creature.vy = 0;
  creature.facingSign = 1;
  creature.state = 'lunge';
  creature.stateTimer = 0.7;
  creature.grabTimer = 0;
  creature.grabCooldown = 0;
  creature.bumpCooldown = 0;
  creature.stunned = 0;
  creature.parts.forEach((part) => {
    part.detached = false;
    part.hp = Math.max(1, part.hp);
  });
  scene.updateArticulatedParts(creature, 0);
  const dangerousPart = scene.articulatedBitePart(creature)
    ?? creature.parts.find((part) => scene.isDangerousArticulatedPart(creature, part))
    ?? creature.parts[0];
  const nonDangerousPart = creature.parts.find((part) => part.id !== dangerousPart.id && !scene.isDangerousArticulatedPart(creature, part) && !part.detached && part.hp > 0)
    ?? creature.parts.find((part) => part.id !== dangerousPart.id && !part.detached && part.hp > 0)
    ?? dangerousPart;
  clearVenom();
  clearBleed();
  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.won = false;
  state.hull = 180;
  state.oxygen = oxygenMax();
  scene.player.x = dangerousPart.x;
  scene.player.y = dangerousPart.y;
  scene.player.vx = 0;
  scene.player.vy = 0;
  const hullBeforeDangerous = state.hull;
  scene.bumpArticulatedCreature(creature, dangerousPart, 0);
  const dangerousDamage = hullBeforeDangerous - state.hull;
  const afterDangerous = { x: creature.x, y: creature.y, vx: creature.vx, vy: creature.vy };
  state.hull = 180;
  creature.bumpCooldown = 0;
  scene.player.x = nonDangerousPart.x;
  scene.player.y = nonDangerousPart.y;
  scene.player.vx = 0;
  scene.player.vy = 0;
  const hullBeforeNonDangerous = state.hull;
  scene.bumpArticulatedCreature(creature, nonDangerousPart, 0);
  const nonDangerousDamage = hullBeforeNonDangerous - state.hull;
  const startX = creature.x;
  const startY = creature.y;
  for (let i = 0; i < 8; i += 1) {
    creature.bumpCooldown = 0;
    scene.player.x = dangerousPart.x;
    scene.player.y = dangerousPart.y;
    scene.updateArticulatedCreatures(0.04);
  }
  const repeatedDisplacement = Phaser.Math.Distance.Between(startX, startY, creature.x, creature.y);
  scene.cameras.main.centerOn(creature.x, creature.y);
  refreshPlaytestCamera(scene);
  scene.draw();
  return {
    creatureId: creature.id,
    dangerousPart: dangerousPart.id,
    dangerousPartIsDangerous: scene.isDangerousArticulatedPart(creature, dangerousPart),
    nonDangerousPart: nonDangerousPart.id,
    nonDangerousPartIsDangerous: scene.isDangerousArticulatedPart(creature, nonDangerousPart),
    dangerousDamage: roundMetric(dangerousDamage),
    nonDangerousDamage: roundMetric(nonDangerousDamage),
    afterDangerous: {
      x: roundMetric(afterDangerous.x),
      y: roundMetric(afterDangerous.y),
      vx: roundMetric(afterDangerous.vx),
      vy: roundMetric(afterDangerous.vy),
    },
    repeatedDisplacement: roundMetric(repeatedDisplacement),
    finalVelocity: {
      vx: roundMetric(creature.vx),
      vy: roundMetric(creature.vy),
    },
  };
}

function stageLightingVisibilityReview(scene: DeepdiveScene) {
  const reviewX = WORLD_W * TILE * 0.5;
  const reviewDepth = state.biome === 2 ? 820 : state.biome === 3 ? 700 : 620;
  const reviewY = SURFACE_Y + reviewDepth * 6;
  const centerTileX = Math.floor(reviewX / TILE);
  const centerTileY = Math.floor(reviewY / TILE);
  for (let ty = Math.max(7, centerTileY - 16); ty <= Math.min(WORLD_H - 2, centerTileY + 16); ty += 1) {
    for (let tx = Math.max(1, centerTileX - 34); tx <= Math.min(WORLD_W - 2, centerTileX + 34); tx += 1) {
      const dx = tx - centerTileX;
      const dy = ty - centerTileY;
      const tunnel = Math.abs(dy + Math.sin(dx * 0.23) * 2.6) < 5.8;
      const pocket = ((dx + 13) / 10) ** 2 + ((dy - 1) / 5.2) ** 2 < 1
        || ((dx - 18) / 8.4) ** 2 + ((dy + 3) / 4.4) ** 2 < 1;
      const notch = Math.abs(dx) < 3 && dy > -8 && dy < 2;
      const ribOpen = Math.abs(dx % 9) <= 1 && dy > -9 && dy < 8;
      const tile: Tile = tunnel || pocket || notch || ribOpen
        ? 'water'
        : state.biome === 4 && dy > 7 && Math.abs(dx) % 11 === 0
          ? 'anchorstone'
          : ty < centerTileY
            ? 'stone'
            : 'sand';
      scene.setTile(tx, ty, tile);
      if (scene.damage[ty]?.[tx] !== undefined) scene.damage[ty][tx] = 0;
    }
  }
  rebuildTerrainMask(scene);

  const creatureManifest = articulatedCreatureDefs().find((candidate) =>
    state.biome >= candidate.minBiome
    && candidate.combat?.hostile !== false
    && candidate.id !== 'abyssal-mandible-bobbit'
  ) ?? articulatedCreatureDefs().find((candidate) => state.biome >= candidate.minBiome) ?? articulatedCreatureDefs()[0];
  let creature = scene.articulatedCreatures.find((candidate) => candidate.id === creatureManifest.id && !candidate.bobbitBurrow) ?? null;
  if (!creature) {
    creature = createArticulatedCreature(scene, creatureManifest, reviewX + 260, reviewY - 8);
    scene.articulatedCreatures.push(creature);
  }
  creature.dead = false;
  creature.scanned = false;
  creature.state = 'lunge';
  creature.stateTimer = 0.45;
  creature.attackBlend = 0.55;
  creature.aggro = 1;
  creature.x = reviewX + 260;
  creature.y = reviewY - 8;
  creature.homeX = creature.x;
  creature.homeY = creature.y;
  creature.vx = -creature.speed * 0.65;
  creature.vy = 0;
  creature.facingSign = -1;
  creature.parts.forEach((part) => {
    part.detached = false;
    part.hp = Math.max(1, part.hp);
  });
  scene.updateArticulatedParts(creature, 0);

  clearVenom();
  clearBleed();
  state.started = true;
  state.docked = false;
  state.atBoat = false;
  state.paused = false;
  state.lost = false;
  state.won = false;
  state.oxygen = oxygenMax();
  state.fuel = fuelMax();
  state.hull = 100 + state.upgrades.suit * 25;
  state.upgrades.lamp = Math.max(1, Math.min(state.upgrades.lamp, 2));
  scene.player.x = reviewX;
  scene.player.y = reviewY;
  scene.player.vx = 0;
  scene.player.vy = 0;
  scene.player.facing.set(1, 0.05).normalize();
  scene.player.facingSign = 1;
  state.depth = Math.max(0, Math.round((scene.player.y - SURFACE_Y) / 6));
  scene.cameras.main.centerOn(scene.player.x + 80, scene.player.y);
  scene.terrainBoundsKey = '';
  scene.terrainDirty = true;
  refreshPlaytestCamera(scene);
  scene.draw();

  const look = terrainLookForBiome();
  const visibleEdgeTiles = countVisibleEdgeTiles(scene);
  return {
    biome: state.biome,
    depth: state.depth,
    darkness: roundMetric(darknessAtDepth()),
    lookId: look.id,
    palette: { ...look.palette },
    terrainVisibilityTreatment: 'softened-wash',
    hardBlockOutlineAlpha: 0,
    visibleEdgeTiles,
    creature: {
      id: creature.id,
      species: creature.species,
      distance: roundMetric(Phaser.Math.Distance.Between(scene.player.x, scene.player.y, creature.x, creature.y)),
      hostile: creature.hostile,
      state: creature.state,
      parts: creature.parts.filter((part) => !part.detached && part.hp > 0).length,
    },
    camera: {
      x: roundMetric(scene.cameras.main.worldView.x),
      y: roundMetric(scene.cameras.main.worldView.y),
      width: roundMetric(scene.cameras.main.worldView.width),
      height: roundMetric(scene.cameras.main.worldView.height),
    },
  };
}

function countVisibleEdgeTiles(scene: DeepdiveScene) {
  const view = scene.cameras.main.worldView;
  const startX = Math.max(0, Math.floor(view.x / TILE));
  const endX = Math.min(WORLD_W - 1, Math.ceil(view.right / TILE));
  const startY = Math.max(0, Math.floor(view.y / TILE));
  const endY = Math.min(WORLD_H - 1, Math.ceil(view.bottom / TILE));
  let count = 0;
  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (scene.getTile(x, y) === 'water') continue;
      if (scene.getTile(x, y - 1) === 'water'
        || scene.getTile(x, y + 1) === 'water'
        || scene.getTile(x - 1, y) === 'water'
        || scene.getTile(x + 1, y) === 'water') {
        count += 1;
      }
    }
  }
  return count;
}

function playtestOreMaskSolidRatio(scene: DeepdiveScene, tx: number, ty: number) {
  let solid = 0;
  for (let ly = 0; ly < TERRAIN_MASK_RES; ly += 1) {
    for (let lx = 0; lx < TERRAIN_MASK_RES; lx += 1) {
      const sx = tx * TERRAIN_MASK_RES + lx;
      const sy = ty * TERRAIN_MASK_RES + ly;
      if (terrainMaskDensityAt(scene, sx, sy) >= TERRAIN_MASK_SOLID_THRESHOLD) solid += 1;
    }
  }
  return solid / (TERRAIN_MASK_RES * TERRAIN_MASK_RES);
}

function playtestStableOreComponent(scene: DeepdiveScene, startX: number, startY: number, tile: Tile) {
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

function gameplayOreSnapshot(scene: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
  const view = camera.worldView;
  const startX = Math.max(0, Math.floor(view.x / TILE) - 1);
  const endX = Math.min(WORLD_W - 1, Math.ceil(view.right / TILE) + 1);
  const startY = Math.max(0, Math.floor(view.y / TILE) - 1);
  const endY = Math.min(WORLD_H - 1, Math.ceil(view.bottom / TILE) + 1);
  const seen = new Set<string>();
  const deposits = [];
  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const tile = scene.getTile(x, y);
      if (!isOreTile(tile)) continue;
      const component = playtestStableOreComponent(scene, x, y, tile);
      const key = `${tile}:${component.rootX}:${component.rootY}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const worldX = (component.minX + component.maxX + 1) * TILE * 0.5 + (hash(component.rootX, component.rootY, rng.seed + 71) - 0.5) * TILE * 0.34;
      const worldY = (component.minY + component.maxY + 1) * TILE * 0.5 + (hash(component.rootY, component.rootX, rng.seed + 73) - 0.5) * TILE * 0.28;
      deposits.push({
        key,
        tile,
        anchor: {
          tileX: component.rootX,
          tileY: component.rootY,
          worldX: roundMetric(worldX),
          worldY: roundMetric(worldY),
        },
        position: {
          worldX: roundMetric(worldX),
          worldY: roundMetric(worldY),
          screenX: roundMetric((worldX - view.x) * camera.zoom),
          screenY: roundMetric((worldY - view.y) * camera.zoom),
        },
        tileBounds: {
          minX: component.minX,
          maxX: component.maxX,
          minY: component.minY,
          maxY: component.maxY,
        },
        cells: component.cells.map((cell) => ({
          x: cell.x,
          y: cell.y,
          maskSolidRatio: roundMetric(playtestOreMaskSolidRatio(scene, cell.x, cell.y)),
        })),
      });
    }
  }
  return {
    visibleCount: deposits.length,
    oreTileCells: deposits.reduce((sum, deposit) => sum + deposit.cells.length, 0),
    deposits,
  };
}

function terrainLookReviewSnapshot(scene: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const look = terrainLookForBiome();
    if (scene.world.length < WORLD_H || !scene.world[0]) {
      return {
        ready: false,
        biome: state.biome,
        depthBand: 'unknown',
        depthMeters: state.depth,
        lookId: look.id,
        palette: { ...look.palette },
        stampPools: {
          fringe: [...look.fringeStampPool],
          flora: [...look.floraStampPool],
          materialAccent: [...look.materialAccentStampPool],
          activeEnvironment: [],
        },
        density: {
          edgeStamp: roundMetric(look.edgeStampDensity),
          proceduralFringeAlpha: roundMetric(look.proceduralFringeAlpha),
        },
        cameraSlice: {
          tileBounds: null,
          visibleOreCount: 0,
          anchorstoneCount: 0,
          destructibleCount: 0,
          bobbitBurrowCount: 0,
          encounterReservationCount: 0,
        },
      };
    }
    const view = camera.worldView;
    const startX = Math.max(0, Math.floor(view.x / TILE));
    const endX = Math.min(WORLD_W - 1, Math.ceil(view.right / TILE));
    const startY = Math.max(0, Math.floor(view.y / TILE));
    const endY = Math.min(WORLD_H - 1, Math.ceil(view.bottom / TILE));
    let visibleOreCount = 0;
    let anchorstoneCount = 0;
    let destructibleCount = 0;
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = scene.getTile(x, y);
        if (isOreTile(tile)) visibleOreCount += 1;
        if (tile === 'anchorstone' || tile === 'bedrock') anchorstoneCount += 1;
        if (tiles[tile].solid && Number.isFinite(tiles[tile].hp)) destructibleCount += 1;
      }
    }
    const bobbitBurrowCount = scene.bobbitBurrows.filter((burrow) => (
      burrow.x >= view.x && burrow.x <= view.right && burrow.y >= view.y && burrow.y <= view.bottom
    )).length;
    const encounterReservationCount = scene.encounterReservations.filter((reservation) => {
      const left = reservation.tileBounds.x * TILE;
      const right = (reservation.tileBounds.x + reservation.tileBounds.width) * TILE;
      const top = reservation.tileBounds.y * TILE;
      const bottom = (reservation.tileBounds.y + reservation.tileBounds.height) * TILE;
      return right >= view.x && left <= view.right && bottom >= view.y && top <= view.bottom;
    }).length;
    const centerBand = terrainLookDepthBandForTileY(Math.floor((view.centerY ?? (view.y + view.height * 0.5)) / TILE));
    const activeEnvironmentStampPools = Array.from(new Set(scene.environmentProps
      .filter((prop) => prop.x >= view.x - 32 && prop.x <= view.right + 32 && prop.y >= view.y - 32 && prop.y <= view.bottom + 32)
      .map((prop) => prop.assetKey)
      .filter((key) => key.startsWith('terrain-stamp-'))));
    return {
      biome: state.biome,
      depthBand: centerBand.id,
      depthMeters: roundMetric(centerBand.depthMeters),
      lookId: look.id,
      palette: { ...look.palette },
      stampPools: {
        fringe: [...look.fringeStampPool],
        flora: [...look.floraStampPool],
        materialAccent: [...look.materialAccentStampPool],
        activeEnvironment: activeEnvironmentStampPools,
      },
      density: {
        edgeStamp: roundMetric(look.edgeStampDensity),
        proceduralFringeAlpha: roundMetric(look.proceduralFringeAlpha),
      },
      cameraSlice: {
        tileBounds: { startX, endX, startY, endY },
        visibleOreCount,
        anchorstoneCount,
        destructibleCount,
        bobbitBurrowCount,
        encounterReservationCount,
      },
    };
  }

function shapeFirstOreProofSnapshot(scene: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
    const deposits = (scene as ShapeFirstOreProofScene).shapeFirstOreProofDeposits ?? [];
    const view = camera.worldView;
    const items = deposits.map((deposit) => {
      let oreTileCells = 0;
      for (let y = deposit.y; y < deposit.y + deposit.height; y += 1) {
        for (let x = deposit.x; x < deposit.x + deposit.width; x += 1) {
          if (scene.getTile(x, y) === deposit.tile) oreTileCells += 1;
        }
      }
      const worldX = (deposit.x + deposit.width * 0.5) * TILE;
      const worldY = (deposit.y + deposit.height * 0.5) * TILE;
      const screenX = (worldX - view.x) * camera.zoom;
      const screenY = (worldY - view.y) * camera.zoom;
      const inFrame = worldX >= view.x && worldX <= view.right && worldY >= view.y && worldY <= view.bottom
        && screenX >= 40 && screenX <= 1240 && screenY >= 55 && screenY <= 735;
      return {
        tile: deposit.tile,
        tileBounds: { x: deposit.x, y: deposit.y, width: deposit.width, height: deposit.height },
        oreTileCells,
        worldX: roundMetric(worldX),
        worldY: roundMetric(worldY),
        screenX: roundMetric(screenX),
        screenY: roundMetric(screenY),
        inFrame,
      };
    });
    return {
      active: deposits.length > 0,
      expectedDeposits: deposits.length,
      inFrameDeposits: items.filter((item) => item.inFrame).length,
      oreTileCells: items.reduce((sum, item) => sum + item.oreTileCells, 0),
      items,
    };
  }

export function playtestSnapshot(this: DeepdiveScene, ) {
    refreshPlaytestCamera(this);
    syncStoryProgress();
    const camera = this.cameras.main;
    const parallaxProfile = parallaxProfileFor(state.biome, state.depth);
    const screenFor = (x: number, y: number) => ({
      screenX: roundMetric((x - camera.worldView.x) * camera.zoom),
      screenY: roundMetric((y - camera.worldView.y) * camera.zoom),
    });
    const activeSub = state.activeSub
      ? {
        tier: state.activeSub.tier,
        name: subDef(state.activeSub.tier).name,
        hull: Math.round(state.activeSub.hull),
        oxygen: Math.round(state.activeSub.oxygen),
        fuel: Math.round(state.activeSub.fuel),
        cargoBonus: subDef(state.activeSub.tier).cargo,
        weaponCooldown: roundMetric(state.activeSub.weaponCooldown),
        piloting: state.pilotingSub,
      }
      : null;
    const carrierSub = state.carrierSub
      ? {
        tier: state.carrierSub.tier,
        name: subDef(state.carrierSub.tier).name,
        hull: Math.round(state.carrierSub.hull),
        oxygen: Math.round(state.carrierSub.oxygen),
        fuel: Math.round(state.carrierSub.fuel),
      }
      : null;
    return {
      seed: rng.seed,
      state: {
        biome: state.biome,
        biomeName: biomeName(),
        credits: state.credits,
        oreSoldCredits: state.oreSoldCredits,
        depth: state.depth,
        maxDepth: state.maxDepth,
        oxygen: Math.round(state.oxygen),
        oxygenMax: oxygenMax(),
        hull: Math.round(state.hull),
        fuel: Math.round(state.fuel),
        fuelMax: fuelMax(),
        cargo: state.cargo.length,
        cargoItems: state.cargo.map((item) => ({ id: item.id, name: item.name, kind: item.kind, value: item.value, sampleSpecies: item.sampleSpecies ?? '' })),
        cargoCapacity: cargoCapacity(),
        selectedTool: state.selectedTool,
        unlockedTools: { ...state.unlockedTools },
        scannedSpecies: [...state.scannedSpecies],
        sampledSpecies: [...state.sampledSpecies],
        sonarRevealed: state.sonarRevealed.size,
        sonarContacts: state.sonarContacts.map((contact) => ({
          x: roundMetric(contact.x),
          y: roundMetric(contact.y),
          kind: contact.kind,
          hostile: contact.hostile,
          age: roundMetric(contact.age),
        })),
        chartingProgress: biomeChartingProgress(),
        canTravelToNextBiome: canTravelToNextBiome(),
        atBoat: state.atBoat,
        docked: state.docked,
        started: state.started,
        lost: state.lost,
        won: state.won,
        story: { ...state.story, completed: [...state.story.completed], flags: { ...state.story.flags }, heardRadio: [...state.story.heardRadio] },
        pinnedStoryObjective: currentPinnedStoryObjective(),
        finale: { ...state.finale, heardRadio: [...state.finale.heardRadio] },
        venom: { ...state.venom },
        bleed: { ...state.bleed },
        activeQuestId: state.activeQuestId,
        questBoard: state.questBoard.map((quest) => ({ ...quest })),
        forwardOutpost: { ...state.forwardOutpost },
        upgrades: { ...state.upgrades },
        subOwned: { ...state.subOwned },
        selectedSubTier: state.selectedSubTier,
        marlinVoucherAvailable: state.marlinVoucherAvailable,
        marlinEffectiveCost: subEffectiveCost(2),
        activeSub,
        carrierSub,
        hasSavedGame: hasSavedGame(),
        saveLoad: { ...state.saveLoad },
      },
      ui: {
        paused: state.paused,
        sonarMapOpen: state.sonarMapOpen,
        sonarMapPanX: state.sonarMapPanX,
        sonarMapPanY: state.sonarMapPanY,
        sonarMapZoom: state.sonarMapZoom,
        radioOpen: state.radioOpen,
        logbookOpen: state.logbookOpen,
        cargoOpen: state.cargoOpen,
        floatingTextCount: this.floatingTexts.length,
        status: state.status,
        controller: { ...state.controller },
        biomeLoading: { ...state.biomeLoading },
        sonarPings: this.sonarPings.length,
        terrainBreakEffects: this.terrainBreakEffects.length,
      },
      legacySwimmerNavigation: {
        reachableWaterTiles: this.legacySwimmerReachableWater.reduce((sum, value) => sum + value, 0),
        spawnValidated: this.legacySwimmerSpawnValidated,
        spawnFallbacks: this.legacySwimmerSpawnFallbacks,
      },
      camera: {
        x: roundMetric(camera.worldView.x),
        y: roundMetric(camera.worldView.y),
        width: roundMetric(camera.worldView.width),
        height: roundMetric(camera.worldView.height),
        zoom: roundMetric(camera.zoom),
      },
      parallax: {
        profile: parallaxProfile.id,
        depthBand: parallaxProfile.depthBand,
        overlay: {
          alpha: roundMetric(parallaxProfile.overlay.alpha),
          color: `#${parallaxProfile.overlay.color.toString(16).padStart(6, '0')}`,
          density: roundMetric(parallaxProfile.overlay.density),
          drift: roundMetric(parallaxProfile.overlay.drift),
        },
        layers: parallaxProfile.layers.map((layer, index) => ({
          index,
          texturePrefix: layer.texturePrefix,
          fallbackPrefix: layer.fallbackPrefix,
          horizontalSpeed: roundMetric(layer.horizontalSpeed),
          verticalSpeed: roundMetric(layer.verticalSpeed),
          phaseX: roundMetric(layer.phaseX),
          phaseY: roundMetric(layer.phaseY),
          alpha: roundMetric(layer.alpha),
          tint: `#${layer.tint.toString(16).padStart(6, '0')}`,
          scale: roundMetric(layer.scale),
        })),
      },
      environmentVisualProfile: backgroundReviewSnapshot(this, 'snapshot', false),
      sceneDepths: {
        articulatedBridges: roundMetric(this.articulatedBridges?.depth ?? null),
        actors: roundMetric(this.actors?.depth ?? null),
        darkness: roundMetric(this.darkness?.depth ?? null),
        overlay: roundMetric(this.overlay?.depth ?? null),
      },
      foregroundLayers: {
        terrainAlpha: roundMetric(this.terrain?.alpha ?? null),
        terrainDepth: roundMetric(this.terrain?.depth ?? null),
        terrainEdgesAlpha: roundMetric(this.terrainEdges?.alpha ?? null),
        terrainEdgesDepth: roundMetric(this.terrainEdges?.depth ?? null),
        oreOverburdenAlpha: roundMetric(this.oreOverburden?.alpha ?? null),
        oreOverburdenDepth: roundMetric(this.oreOverburden?.depth ?? null),
      },
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        vx: Math.round(this.player.vx),
        vy: Math.round(this.player.vy),
        mineCooldown: roundMetric(this.player.mineCooldown),
        scanTarget: this.player.scanTarget ? this.player.scanTarget.species : '',
      },
      gameplayOre: gameplayOreSnapshot(this, camera),
      looseItems: this.looseItems.map((item) => ({
        id: item.id,
        name: item.name,
        value: item.value,
        kind: item.kind,
        x: roundMetric(item.x),
        y: roundMetric(item.y),
        radius: roundMetric(item.radius),
        life: Number.isFinite(item.life) ? roundMetric(item.life) : 'infinite',
        exposed: Boolean(item.exposed),
        pickupDelay: roundMetric(item.pickupDelay ?? 0),
        collected: Boolean(item.collected),
        sourceTileX: item.sourceTileX ?? null,
        sourceTileY: item.sourceTileY ?? null,
        ...screenFor(item.x, item.y),
      })),
      fish: this.fish.map((fish) => ({
        species: fish.species,
        x: roundMetric(fish.x),
        y: roundMetric(fish.y),
        ...screenFor(fish.x, fish.y),
        hostile: fish.hostile,
        pattern: fish.pattern,
        behaviorClass: fish.behaviorClass ?? 'legacySwimmer',
        terrainAffinity: fish.terrainAffinity ?? 'openWater',
        radius: roundMetric(fish.radius),
        velocityMagnitude: roundMetric(Math.hypot(fish.vx, fish.vy)),
        vx: roundMetric(fish.vx),
        vy: roundMetric(fish.vy),
        centerTile: this.getTile(Math.floor(fish.x / TILE), Math.floor(fish.y / TILE)),
        navTargetX: fish.navTargetX === undefined ? null : roundMetric(fish.navTargetX),
        navTargetY: fish.navTargetY === undefined ? null : roundMetric(fish.navTargetY),
        navWaypointTimer: roundMetric(fish.navWaypointTimer ?? 0),
        navReseedCooldown: roundMetric(fish.navReseedCooldown ?? 0),
        navStuckTimer: roundMetric(fish.navStuckTimer ?? 0),
        navTerrainBounces: fish.navTerrainBounces ?? 0,
        navRecentTerrainBounces: fish.navRecentTerrainBounces ?? 0,
        navBlockedFeelers: fish.navBlockedFeelers ?? 0,
        navLastBlockedFeelers: fish.navLastBlockedFeelers ?? 0,
        navHeadingFlipCount: roundMetric(fish.navHeadingFlipCount ?? 0),
        navReseedCount: fish.navReseedCount ?? 0,
        navSpawnValidated: Boolean(fish.navSpawnValidated),
        navSpawnFallback: Boolean(fish.navSpawnFallback),
        aggro: roundMetric(fish.aggro),
        aggroCue: roundMetric(fish.aggroCue),
        stunned: roundMetric(fish.stunned),
        hp: Math.round(fish.hp),
        maxHp: Math.round(fish.maxHp),
        assetKey: fish.assetKey,
        scanned: fish.scanned,
        dead: fish.dead,
        hasSurface: Boolean(fish.surface),
        supported: fish.surface ? validateTerrainSurfaceAnchor(this, fish.surface).valid : false,
        fallbackNoAnchor: Boolean(fish.fallbackNoAnchor),
        anchor: fish.anchor ?? fish.surface?.anchor ?? 'none',
        surface: fish.surface ? {
          rootX: roundMetric(fish.surface.rootX),
          rootY: roundMetric(fish.surface.rootY),
          normalX: roundMetric(fish.surface.normalX),
          normalY: roundMetric(fish.surface.normalY),
          tangentX: roundMetric(fish.surface.tangentX),
          tangentY: roundMetric(fish.surface.tangentY),
          support: roundMetric(fish.surface.support),
          clearance: roundMetric(fish.surface.clearance),
        } : null,
        distanceFromSurface: fish.surface
          ? roundMetric(Math.abs((fish.x - fish.surface.rootX) * fish.surface.normalX + (fish.y - fish.surface.rootY) * fish.surface.normalY))
          : null,
        distanceFromRoot: fish.surface ? roundMetric(Phaser.Math.Distance.Between(fish.x, fish.y, fish.surface.rootX, fish.surface.rootY)) : null,
        rootDisplacement: fish.surface ? roundMetric(Phaser.Math.Distance.Between(fish.homeX, fish.homeY, fish.surface.rootX, fish.surface.rootY)) : null,
        walkDir: fish.walkDir ?? null,
        lungeTimer: roundMetric(fish.lungeTimer ?? 0),
        recoverTimer: roundMetric(fish.recoverTimer ?? 0),
        retract: roundMetric(fish.retract ?? 0),
        screenVisible: fish.x >= camera.worldView.x && fish.x <= camera.worldView.right && fish.y >= camera.worldView.y && fish.y <= camera.worldView.bottom,
      })),
      hazards: this.hazards.map((hazard) => {
        const validation = hazard.surface ? validateTerrainSurfaceAnchor(this, hazard.surface) : { valid: false, anchor: null };
        return {
          x: roundMetric(hazard.x),
          y: roundMetric(hazard.y),
          radius: roundMetric(hazard.radius),
          plumeX: roundMetric(hazard.x + (hazard.surface?.normalX ?? 0) * hazard.radius * 1.35),
          plumeY: roundMetric(hazard.y + (hazard.surface?.normalY ?? -1) * hazard.radius * 1.35),
          hasSurface: Boolean(hazard.surface),
          anchorSource: hazard.surface?.source ?? 'none',
          supported: validation.valid,
          support: validation.anchor?.support ?? hazard.surface?.support ?? 0,
          clearance: validation.anchor?.clearance ?? hazard.surface?.clearance ?? 0,
          tileX: hazard.surface?.tileX ?? Math.floor(hazard.x / TILE),
          tileY: hazard.surface?.tileY ?? Math.floor(hazard.y / TILE),
          maskSx: hazard.surface?.maskSx ?? null,
          maskSy: hazard.surface?.maskSy ?? null,
          normalX: roundMetric(hazard.surface?.normalX ?? 0),
          normalY: roundMetric(hazard.surface?.normalY ?? 0),
          fakeOpenWaterAnchor: !hazard.surface,
        };
      }),
      specialRooms: this.specialRooms.map((room) => {
        const center = specialRoomEffectCenter(room);
        return {
          id: room.id,
          kind: room.kind,
          x: roundMetric(room.x),
          y: roundMetric(room.y),
          effectX: roundMetric(center.x),
          effectY: roundMetric(center.y),
          rx: roundMetric(room.rx),
          ry: roundMetric(room.ry),
        };
      }),
      floraAnchors: {
        terrainSurfaceSamples: sampleTerrainSurfaceAnchors(this, {
          minY: Math.max(SURFACE_Y, camera.worldView.y),
          maxY: Math.min(WORLD_H * TILE, camera.worldView.bottom),
          salt: 7,
          limit: 32,
        }).map((anchor) => ({
          id: anchor.id,
          x: roundMetric(anchor.x),
          y: roundMetric(anchor.y),
          anchor: anchor.anchor,
          tileX: anchor.tileX,
          tileY: anchor.tileY,
          maskSx: anchor.maskSx,
          maskSy: anchor.maskSy,
          normalX: roundMetric(anchor.normalX),
          normalY: roundMetric(anchor.normalY),
          support: anchor.support,
          clearance: anchor.clearance,
          source: anchor.source,
        })),
        gameplay: this.flora.map((flora) => {
          const validation = flora.surface ? validateTerrainSurfaceAnchor(this, flora.surface) : { valid: false, anchor: null };
          return {
            species: flora.species,
            source: flora.source ?? 'biome',
            propId: flora.propId ?? '',
            assetKey: flora.assetKey,
            x: roundMetric(flora.x),
            y: roundMetric(flora.y),
            anchor: flora.anchor,
            scanned: flora.scanned,
            sampled: state.sampledSpecies.has(flora.species),
            sample: roundMetric(flora.sample),
            sampling: flora.sampling,
            samplePulse: roundMetric(flora.samplePulse),
            sampleCooldown: roundMetric(flora.sampleCooldown),
            hazardous: flora.hazardous,
            dead: flora.dead,
            hasSurface: Boolean(flora.surface),
            anchorSource: flora.surface?.source ?? 'none',
            supported: validation.valid,
            support: validation.anchor?.support ?? flora.surface?.support ?? 0,
            clearance: validation.anchor?.clearance ?? flora.surface?.clearance ?? 0,
            tileX: flora.surface?.tileX ?? Math.floor(flora.x / TILE),
            tileY: flora.surface?.tileY ?? Math.floor(flora.y / TILE),
            maskSx: flora.surface?.maskSx ?? null,
            maskSy: flora.surface?.maskSy ?? null,
            normalX: roundMetric(flora.surface?.normalX ?? 0),
            normalY: roundMetric(flora.surface?.normalY ?? 0),
            fakeOpenWaterAnchor: !flora.surface,
          };
        }),
      },
      terrainLookReview: terrainLookReviewSnapshot(this, camera),
      shapeFirstOreProof: shapeFirstOreProofSnapshot(this, camera),
      encounterReservations: this.encounterReservations.map((reservation) => ({
        id: reservation.id,
        role: reservation.role,
        creatureId: reservation.creatureId,
        biome: reservation.biome,
        home: {
          x: roundMetric(reservation.homeX),
          y: roundMetric(reservation.homeY),
          tileX: Math.floor(reservation.homeX / TILE),
          tileY: Math.floor(reservation.homeY / TILE),
          tile: this.getTile(Math.floor(reservation.homeX / TILE), Math.floor(reservation.homeY / TILE)),
        },
        depth: {
          min: roundMetric(reservation.depthMin),
          max: roundMetric(reservation.depthMax),
          homeMeters: roundMetric(Math.max(0, (reservation.homeY - SURFACE_Y) / 6)),
        },
        tileBounds: { ...reservation.tileBounds },
        clearanceRadius: roundMetric(reservation.clearanceRadius),
        exclusionRadius: roundMetric(reservation.exclusionRadius),
        source: reservation.source ?? null,
        score: roundMetric(reservation.score ?? 0),
        occupied: reservation.occupied,
        bobbitBurrowId: reservation.bobbitBurrowId ?? null,
      })),
      articulatedManifestRoster: articulatedCreatureDefs().map((manifest) => ({
        id: manifest.id,
        species: manifest.species,
        minBiome: manifest.minBiome,
        rarity: manifest.rarity,
        spawn: { ...manifest.spawn },
        runtimeSpawnMode: articulatedRuntimeSpawnMode(manifest),
        spawnableInCurrentBiome: state.biome >= manifest.minBiome && shouldSpawnArticulatedCreature(manifest),
        scannableInCurrentBiome: state.biome >= manifest.minBiome,
        hp: Math.round(manifest.hp),
        combat: {
          behavior: manifest.combat?.behavior ?? null,
          hostile: manifest.combat?.hostile ?? null,
          damageMultiplier: roundMetric(manifest.combat?.damageMultiplier ?? 1),
        },
      })),
      bobbitBurrows: this.bobbitBurrows.map((burrow) => {
        const creature = this.articulatedCreatures.find((candidate) => candidate.bobbitBurrow?.burrowId === burrow.id);
        return {
          id: burrow.id,
          tileX: burrow.tileX,
          tileY: burrow.tileY,
          depthMeters: roundMetric(Math.max(0, (burrow.y - SURFACE_Y) / 6)),
          mouth: { x: roundMetric(burrow.x), y: roundMetric(burrow.y), tile: this.getTile(burrow.tileX, burrow.tileY) },
          shaft: {
            topY: roundMetric(burrow.shaftTopY),
            bottomY: roundMetric(burrow.shaftBottomY),
            anchorX: roundMetric(burrow.anchorX),
            anchorY: roundMetric(burrow.anchorY),
          },
          approach: {
            x: roundMetric(burrow.approachX),
            y: roundMetric(burrow.approachY),
            radius: roundMetric(burrow.approachRadius),
          },
          occupied: burrow.occupied,
          triggered: burrow.triggered,
          cooldown: roundMetric(burrow.cooldown),
          debugScore: roundMetric(burrow.debugScore),
          creatureId: creature?.id ?? null,
          creaturePhase: creature?.bobbitBurrow?.phase ?? null,
          captured: creature?.bobbitBurrow?.captured ?? null,
          escapeRemaining: roundMetric(creature?.bobbitBurrow?.escapeRemaining ?? 0),
          dragTimer: roundMetric(creature?.bobbitBurrow?.dragTimer ?? 0),
        };
      }),
      articulatedCreatures: this.articulatedCreatures.map((creature) => {
        const joints = this.articulatedJointMetrics(creature).map((joint) => ({
          partId: joint.partId,
          parentId: joint.parentId,
          error: roundMetric(joint.error),
          stress: roundMetric(joint.stress),
          detached: Boolean(joint.detached),
        }));
        const maxJointError = joints.reduce((max, joint) => Math.max(max, joint.error), 0);
        const maxJointStress = joints.reduce((max, joint) => Math.max(max, joint.stress), 0);
        const biteAnchor = this.articulatedBiteAnchorWorld(creature);
        return {
          id: creature.id,
          species: creature.species,
          x: roundMetric(creature.x),
          y: roundMetric(creature.y),
          vx: roundMetric(creature.vx),
          vy: roundMetric(creature.vy),
          facingSign: creature.facingSign,
          turn: creature.turn
            ? {
              heading: roundMetric(creature.turn.heading),
              angularVelocity: roundMetric(creature.turn.angularVelocity),
              mirrorSide: creature.turn.mirrorSide,
              mirrorIntentSide: creature.turn.mirrorIntentSide,
              mirrorIntentTime: roundMetric(creature.turn.mirrorIntentTime),
              historySamples: creature.turn.history.length,
              historyMaxSamples: 96,
              distance: roundMetric(creature.turn.distance),
            }
            : null,
          aggro: roundMetric(creature.aggro),
          phase: roundMetric(creature.phase),
          posePitch: roundMetric(creature.posePitch),
          attackBlend: roundMetric(creature.attackBlend),
          swimEffort: roundMetric(creature.swimEffort),
          stunned: roundMetric(creature.stunned),
          mobilityScale: roundMetric(this.articulatedMobilityScale(creature)),
          maxHp: Math.round(creature.maxHp),
          combat: {
            behavior: creature.manifest.combat?.behavior ?? null,
            hostile: creature.hostile,
            damageMultiplier: roundMetric(creature.manifest.combat?.damageMultiplier ?? 1),
            contactDamageAtCurrentBiome: Math.round((12 + state.biome * 2.6 + creature.radius * 0.18) * (creature.manifest.combat?.damageMultiplier ?? 1)),
            lungeContactDamageAtCurrentBiome: Math.round((12 + state.biome * 2.6 + creature.radius * 0.18) * 1.45 * (creature.manifest.combat?.damageMultiplier ?? 1)),
          },
          collisionDebug: creature.collisionDebug
            ? {
              ...creature.collisionDebug,
              edgeX: roundMetric(creature.collisionDebug.edgeX),
              edgeY: roundMetric(creature.collisionDebug.edgeY),
              halfWidth: roundMetric(creature.collisionDebug.halfWidth),
              halfHeight: roundMetric(creature.collisionDebug.halfHeight),
            }
            : null,
          naturalSpawn: {
            spawn: { ...creature.manifest.spawn },
            runtimeBand: {
              minDepthMeters: roundMetric(Math.max(0, (scaledDepthPx(creature.manifest.spawn.minDepth) - SURFACE_Y) / 6)),
              maxDepthMeters: roundMetric(Math.max(0, (scaledDepthPx(creature.manifest.spawn.maxDepth) - SURFACE_Y) / 6)),
            },
            depthMeters: roundMetric(Math.max(0, (creature.y - SURFACE_Y) / 6)),
            centerTile: {
              x: Math.floor(creature.x / TILE),
              y: Math.floor(creature.y / TILE),
              tile: this.getTile(Math.floor(creature.x / TILE), Math.floor(creature.y / TILE)),
            },
            partContacts: creature.parts
              .filter((part) => !part.detached && part.hp > 0)
              .map((part) => {
                const contact = this.articulatedPartTerrainContact(creature, part);
                return {
                  id: part.id,
                  contact: roundMetric(contact ? Math.min(1, contact.count / 3) : 0),
                  nx: roundMetric(contact?.nx ?? 0),
                  ny: roundMetric(contact?.ny ?? 0),
                };
              }),
          },
          hp: Math.round(creature.hp),
          state: creature.state,
          bobbitBurrow: creature.bobbitBurrow ? { ...creature.bobbitBurrow } : null,
          scanned: creature.scanned,
          dead: creature.dead,
          jointSummary: {
            count: joints.length,
            missing: joints.filter((joint) => !Number.isFinite(joint.error)).length,
            maxError: roundMetric(maxJointError),
            maxStress: roundMetric(maxJointStress),
          },
          biteAnchor: biteAnchor ? { x: roundMetric(biteAnchor.x), y: roundMetric(biteAnchor.y) } : null,
          joints,
          spine: creature.spine.map((node) => ({
            partId: node.partId,
            offset: roundMetric(node.offset),
            bend: roundMetric(node.bend),
            x: roundMetric(node.x),
            y: roundMetric(node.y),
            vx: roundMetric(node.vx),
            vy: roundMetric(node.vy),
            constraintError: roundMetric(node.constraintError),
            initialized: node.initialized,
          })),
          parts: creature.parts.map((part) => {
            const manifest = partManifest(creature, part);
            const hit = this.articulatedPartHitDistanceTo(creature, part, this.player.x, this.player.y);
            const terrainProbe = this.articulatedPartTerrainContact(creature, part);
            const centerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, hit.shape.centerX, hit.shape.centerY);
            return {
              id: part.id,
              anatomy: manifest.anatomy ?? null,
              dangerousContact: this.isDangerousArticulatedPart(creature, part),
              x: roundMetric(part.x),
              y: roundMetric(part.y),
              rotation: roundMetric(part.rotation),
              hp: Math.round(part.hp),
              maxHp: Math.round(part.maxHp),
              jointStress: roundMetric(part.jointStress),
              detached: part.detached,
              detachVx: roundMetric(part.detachVx),
              detachVy: roundMetric(part.detachVy),
              detachAngularVelocity: roundMetric(part.detachAngularVelocity),
              terrainContact: roundMetric(part.terrainContact),
              terrainNormalX: roundMetric(part.terrainNormalX),
              terrainNormalY: roundMetric(part.terrainNormalY),
              terrainProbeContact: terrainProbe ? roundMetric(Math.min(1, terrainProbe.count / 3)) : 0,
              terrainProbeNormalX: roundMetric(terrainProbe?.nx ?? 0),
              terrainProbeNormalY: roundMetric(terrainProbe?.ny ?? 0),
              hitShape: {
                centerX: roundMetric(hit.shape.centerX),
                centerY: roundMetric(hit.shape.centerY),
                rotation: roundMetric(hit.shape.rotation),
                halfLength: roundMetric(hit.shape.halfLength),
                radius: roundMetric(hit.shape.radius),
              },
              playerHitDistance: roundMetric(hit.distance),
              playerSignedHitDistance: roundMetric(hit.signedDistance),
              playerCenterDistance: roundMetric(centerDistance),
              sprite: part.sprite
                ? {
                  visible: part.sprite.visible,
                  textureKey: part.sprite.texture.key,
                  alpha: roundMetric(part.sprite.alpha),
                  scaleX: roundMetric(part.sprite.scaleX),
                  scaleY: roundMetric(part.sprite.scaleY),
                  displayWidth: roundMetric(part.sprite.displayWidth),
                  displayHeight: roundMetric(part.sprite.displayHeight),
                  depth: roundMetric(part.sprite.depth),
                  ...screenFor(part.x, part.y),
                }
                : null,
            };
          }),
          socketOverlays: creature.socketOverlays.map((overlay) => {
            const socketManifest = creature.manifest.socketOverlays?.find((candidate) => candidate.id === overlay.id);
            const parentAnchorScreen = screenFor(overlay.parentAnchorX, overlay.parentAnchorY);
            const childAnchorScreen = screenFor(overlay.childAnchorX, overlay.childAnchorY);
            return {
              id: overlay.id,
              parentId: socketManifest?.parentId,
              childId: socketManifest?.childId,
              x: roundMetric(overlay.x),
              y: roundMetric(overlay.y),
              rotation: roundMetric(overlay.rotation),
              width: roundMetric(overlay.width),
              height: roundMetric(overlay.height),
              span: roundMetric(overlay.span),
              spanScreen: roundMetric(overlay.span * camera.zoom),
              parentAnchorX: roundMetric(overlay.parentAnchorX),
              parentAnchorY: roundMetric(overlay.parentAnchorY),
              childAnchorX: roundMetric(overlay.childAnchorX),
              childAnchorY: roundMetric(overlay.childAnchorY),
              parentAnchorScreenX: parentAnchorScreen.screenX,
              parentAnchorScreenY: parentAnchorScreen.screenY,
              childAnchorScreenX: childAnchorScreen.screenX,
              childAnchorScreenY: childAnchorScreen.screenY,
              bridgeWidth: roundMetric(overlay.bridgeWidth),
              bridgeWidthScreen: roundMetric(overlay.bridgeWidth * camera.zoom),
              bridgeCoverage: roundMetric(overlay.bridgeCoverage),
              parentCoverage: roundMetric(overlay.parentCoverage),
              childCoverage: roundMetric(overlay.childCoverage),
              socketStyle: {
                alpha: roundMetric(socketManifest?.alpha ?? creature.manifest.socketStyle?.alpha ?? 0.82),
                bridgeAlpha: roundMetric(socketManifest?.bridgeAlpha ?? creature.manifest.socketStyle?.bridgeAlpha ?? 0.32),
                bridgeCoreAlpha: roundMetric(socketManifest?.bridgeCoreAlpha ?? creature.manifest.socketStyle?.bridgeCoreAlpha ?? 0.16),
                bridgeWidthScale: roundMetric(socketManifest?.bridgeWidthScale ?? creature.manifest.socketStyle?.bridgeWidthScale ?? 1),
              },
              sprite: overlay.sprite
                ? {
                  visible: overlay.sprite.visible,
                  textureKey: overlay.sprite.texture.key,
                  alpha: roundMetric(overlay.sprite.alpha),
                  scaleX: roundMetric(overlay.sprite.scaleX),
                  scaleY: roundMetric(overlay.sprite.scaleY),
                  displayWidth: roundMetric(overlay.sprite.displayWidth),
                  displayHeight: roundMetric(overlay.sprite.displayHeight),
                  depth: roundMetric(overlay.sprite.depth),
                  ...screenFor(overlay.x, overlay.y),
                }
                : null,
            };
          }),
        };
      }),
      articulatedManifest: {
        ...articulatedManifestInfo(),
        spawnBudget: articulatedSpawnBudgetForBiome(state.biome, articulatedPrototypeRuntimeEnabled()),
        prototypeRuntime: articulatedPrototypeRuntimeEnabled(),
      },
      articulatedPlaceholders: articulatedPlaceholderTextureKeys(),
      perf: perfSnapshot(this),
      world: this.playtestWorldSurvey(),
    };
  }

function revealStorySmokeSonarCells(count: number) {
    for (let i = 0; i < count; i += 1) state.sonarRevealed.add(`story:${state.biome}:${i}`);
  }

function stageStoryMilestoneSmoke(this: DeepdiveScene, value?: unknown) {
    const request = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const milestone = String(request.milestone ?? request.id ?? value ?? 'b1');
    const mode = String(request.mode ?? 'ready');
    const reset = request.reset !== false;
    if (reset) state.story = createDefaultStoryProgress();
    state.started = true;
    state.lost = false;
    state.paused = false;
    state.radioOpen = false;
    state.cargoOpen = false;
    state.logbookOpen = false;
    state.sonarMapOpen = false;
    state.scannedSpecies.clear();
    state.sonarRevealed.clear();
    state.sampledSpecies.clear();
    state.forwardOutpost.active = false;
    state.forwardOutpost.charge = 0;
    state.won = false;
    resetFinaleProgress();
    const atBoat = mode === 'complete' || mode === 'atBoat';
    state.atBoat = atBoat;
    state.docked = atBoat;
    if (!atBoat) {
      this.player.y = SURFACE_Y + scaledDepthPx(180);
      state.depth = 180;
    }

    if (milestone === 'b2' || milestone === 'b2-vent-proof') {
      state.biome = 2;
      state.maxDepth = 1100;
      ['Brine Grass', 'Vent Coral', 'Gulper Eel', 'Ash Minnow', 'Barreleye'].forEach((species) => state.scannedSpecies.add(species));
      ['Brine Grass', 'Vent Coral'].forEach((species) => state.sampledSpecies.add(species));
      revealStorySmokeSonarCells(3200);
    } else if (milestone === 'b3' || milestone === 'b3-forward-pocket') {
      state.biome = 3;
      state.maxDepth = 1250;
      ['Black Fan', 'Needle Garden', 'Abyssal Serpent', 'Mirror Fry', 'Abyssal Jelly', 'Goblin Shark'].forEach((species) => state.scannedSpecies.add(species));
      state.sampledSpecies.add('Black Fan');
      revealStorySmokeSonarCells(4200);
      state.forwardOutpost = {
        ...state.forwardOutpost,
        active: true,
        biome: 3,
        x: this.player.x,
        y: SURFACE_Y + scaledDepthPx(940),
        depth: 940,
        charge: Math.max(1, state.forwardOutpost.maxCharge),
        floraSpecies: 'Black Fan',
      };
      state.story.flags['b3-gulper-wake-proof'] = true;
    } else if (milestone === 'b4' || milestone === 'b4-reliquary-proof') {
      state.biome = 4;
      state.maxDepth = Math.max(state.maxDepth, 1600);
      state.scannedSpecies.add('Circuit Kelp');
      state.sampledSpecies.add('Circuit Kelp');
      if (mode === 'proof' || mode === 'complete' || mode === 'atBoat') recoverFinalProof('Abyssal Crownmaw', 1600);
      if (mode === 'complete' || mode === 'atBoat') completeFinaleAtBarge();
    } else {
      state.biome = 1;
      state.maxDepth = 900;
      ['Glass Kelp', 'Moon Sponge', 'Sting Anemone', 'Blue-ring Octopus'].forEach((species) => state.scannedSpecies.add(species));
      state.sampledSpecies.add('Glass Kelp');
      revealStorySmokeSonarCells(2400);
    }
    syncStoryProgress(false);
    renderHud();
    return { ok: true, milestone, mode, snapshot: this.playtestSnapshot() };
  }

export function playtestCommand(this: DeepdiveScene, command: PlaytestCommand, value?: unknown) {
    if (command !== 'reviewArticulated' && command !== 'advanceArticulatedReview' && command !== 'advanceArticulatedDamageReview') {
      this.articulatedCreatures.forEach((creature) => {
        creature.reviewFrozen = false;
      });
    }
    if (command === 'start') {
      if (!state.started) this.startRun();
    } else if (command === 'dive') {
      this.diveFromBarge();
    } else if (command === 'dock') {
      state.docked = true;
      state.atBoat = true;
      this.resetPlayerStart();
      clearVenom();
      clearBleed();
      refillAtBoat();
      completeFinaleAtBarge();
    } else if (command === 'setBiome') {
      const biome = Phaser.Math.Clamp(Number(value) || 1, 1, 4) as Biome;
      state.biome = biome;
      state.depth = 0;
      state.maxDepth = 0;
      state.oreSoldCredits = 0;
      state.cargo = [];
      state.selectedCargoIndex = 0;
      resetToolState();
      state.sonarRevealed.clear();
      state.sonarContacts = [];
      state.scannedSpecies.clear();
      state.sampledSpecies.clear();
      state.carrierSub = null;
      state.atBoat = true;
      state.docked = true;
      state.paused = false;
      state.sonarMapOpen = false;
      state.sonarMapPanX = 0;
      state.sonarMapPanY = 0;
      state.sonarMapZoom = 1;
      state.cargoOpen = false;
      state.lost = false;
      state.won = false;
      resetFinaleProgress();
      clearVenom();
      clearBleed();
      state.started = true;
      state.bargeTab = 'services';
      state.activeQuestId = '';
      state.forwardOutpost.active = false;
      state.forwardOutpost.x = 0;
      state.forwardOutpost.y = 0;
      state.forwardOutpost.depth = 0;
      state.forwardOutpost.charge = 0;
      state.forwardOutpost.floraSpecies = '';
      rng.seed = Math.floor(Math.random() * 1_000_000);
      this.scene.restart();
      renderHud();
      return { restarting: true, biome };
    } else if (command === 'grantCredits') {
      state.credits += Math.max(0, Math.floor(Number(value) || 0));
    } else if (command === 'setCredits') {
      state.credits = Math.max(0, Math.floor(Number(value) || 0));
    } else if (command === 'maxUpgrades') {
      for (const upgrade of availableUpgrades()) state.upgrades[upgrade.id] = upgradeMax(upgrade);
      state.oxygen = oxygenMax();
      state.fuel = fuelMax();
    } else if (command === 'buySub') {
      this.buySub(Phaser.Math.Clamp(Number(value) || 1, 1, 3) as SubTier);
    } else if (command === 'refill') {
      state.oxygen = oxygenMax();
      state.hull = 100 + state.upgrades.suit * 25;
      state.fuel = fuelMax();
      clearVenom();
      clearBleed();
      if (state.activeSub) {
        const def = subDef(state.activeSub.tier);
        state.activeSub.hull = def.hull;
        state.activeSub.oxygen = def.oxygen;
        state.activeSub.fuel = def.fuel;
      }
      if (state.carrierSub) {
        const def = subDef(state.carrierSub.tier);
        state.carrierSub.hull = def.hull;
        state.carrierSub.oxygen = def.oxygen;
        state.carrierSub.fuel = def.fuel;
      }
    } else if (command === 'teleportDepth') {
      const depth = Phaser.Math.Clamp(Number(value) || 0, 0, WORLD_H * TILE - SURFACE_Y - TILE);
      this.player.x = WORLD_W * TILE * 0.5;
      this.player.y = SURFACE_Y + depth;
      this.player.vx = 0;
      this.player.vy = 0;
      state.docked = false;
      state.atBoat = false;
      state.paused = false;
      state.radioOpen = false;
      state.depth = Math.max(0, Math.floor((this.player.y - SURFACE_Y) / TILE) * 6);
      if (state.activeSub && state.pilotingSub) {
        state.activeSub.x = this.player.x;
        state.activeSub.y = this.player.y;
        state.activeSub.vx = 0;
        state.activeSub.vy = 0;
      }
      if (state.carrierSub) {
        state.carrierSub.x = this.player.x;
        state.carrierSub.y = this.player.y;
        state.carrierSub.vx = 0;
        state.carrierSub.vy = 0;
      }
    } else if (command === 'teleportToReachableDepth') {
      const targetDepthMeters = Phaser.Math.Clamp(Number(value) || 0, 0, Math.floor((WORLD_H * TILE - SURFACE_Y - TILE) / 6));
      const point = reachableOpenWaterPoint(this, targetDepthMeters);
      if (!point) return { ok: false, reason: 'no-reachable-water' };
      this.player.x = point.x * TILE + TILE * 0.5;
      this.player.y = point.y * TILE + TILE * 0.5;
      this.player.vx = 0;
      this.player.vy = 0;
      state.docked = false;
      state.atBoat = false;
      state.paused = false;
      state.radioOpen = false;
      state.logbookOpen = false;
      state.cargoOpen = false;
      state.sonarMapOpen = false;
      state.controller.message = '';
      state.depth = Math.max(0, Math.floor((this.player.y - SURFACE_Y) / TILE) * 6);
      this.cameras.main.centerOn(this.player.x, this.player.y);
      refreshPlaytestCamera(this);
      return {
        ok: true,
        targetDepthMeters: Math.round(targetDepthMeters),
        depthMeters: state.depth,
        tileX: point.x,
        tileY: point.y,
        localWaterRatio: roundMetric(point.localWaterRatio),
      };
    } else if (command === 'centerCameraOnPlayer') {
      this.cameras.main.centerOn(this.player.x, this.player.y);
      refreshPlaytestCamera(this);
      return { ok: true, x: Math.round(this.player.x), y: Math.round(this.player.y) };
    } else if (command === 'clearProofOverlays') {
      state.radioOpen = false;
      state.radioIndex = 0;
      state.paused = false;
      state.logbookOpen = false;
      state.cargoOpen = false;
      state.sonarMapOpen = false;
      state.biomeLoading.active = false;
      state.biomeLoading.phase = 'idle';
      state.controller.connected = false;
      state.controller.name = '';
      state.controller.message = '';
      state.controller.hint = '';
      state.controller.connectedPadCount = 0;
      clearPlaytestFloatingText(this);
      renderHud();
      return { ok: true };
    } else if (command === 'teleportToFlora') {
      const payload = typeof value === 'object' && value !== null ? value as { index?: number } : {};
      const candidates = this.flora.filter((flora) => !flora.dead && flora.surface);
      const flora = candidates[Phaser.Math.Clamp(Math.floor(Number(payload.index) || 0), 0, Math.max(0, candidates.length - 1))];
      if (flora?.surface) {
        this.player.x = Phaser.Math.Clamp(flora.surface.rootX + flora.surface.normalX * 34, 20, WORLD_W * TILE - 20);
        this.player.y = Phaser.Math.Clamp(flora.surface.rootY + flora.surface.normalY * 34, 20, WORLD_H * TILE - 20);
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing.set(-flora.surface.normalX, -flora.surface.normalY);
        this.player.facingSign = this.player.facing.x < 0 ? -1 : 1;
        state.docked = false;
        state.atBoat = false;
        state.paused = false;
        state.radioOpen = false;
        state.logbookOpen = false;
        state.cargoOpen = false;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        if (state.activeSub && state.pilotingSub) {
          state.activeSub.x = this.player.x;
          state.activeSub.y = this.player.y;
          state.activeSub.vx = 0;
          state.activeSub.vy = 0;
        }
        if (state.carrierSub) {
          state.carrierSub.x = this.player.x;
          state.carrierSub.y = this.player.y;
          state.carrierSub.vx = 0;
          state.carrierSub.vy = 0;
        }
      }
    } else if (command === 'teleportToFauna') {
      const payload = typeof value === 'object' && value !== null
        ? value as { index?: number; species?: string; assetKey?: string; behaviorClass?: string; distance?: number }
        : {};
      const candidates = this.fish.filter((fish) => {
        if (fish.dead) return false;
        if (payload.species && fish.species !== payload.species) return false;
        if (payload.assetKey && fish.assetKey !== payload.assetKey) return false;
        if (payload.behaviorClass && (fish.behaviorClass ?? 'legacySwimmer') !== payload.behaviorClass) return false;
        return true;
      });
      const fish = candidates[Phaser.Math.Clamp(Math.floor(Number(payload.index) || 0), 0, Math.max(0, candidates.length - 1))];
      if (!fish) return { ok: false, reason: 'no-fauna-target' };
      const distance = Number.isFinite(payload.distance) ? Number(payload.distance) : 54;
      const normalX = fish.surface?.normalX ?? (this.player.x < fish.x ? -1 : 1);
      const normalY = fish.surface?.normalY ?? 0;
      this.player.x = Phaser.Math.Clamp(fish.x + normalX * distance, 20, WORLD_W * TILE - 20);
      this.player.y = Phaser.Math.Clamp(fish.y + normalY * distance, 20, WORLD_H * TILE - 20);
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.facing.set(-normalX, -normalY);
      this.player.facingSign = this.player.facing.x < 0 ? -1 : 1;
      state.docked = false;
      state.atBoat = false;
      state.paused = false;
      state.radioOpen = false;
      state.logbookOpen = false;
      state.cargoOpen = false;
      state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
      if (state.activeSub && state.pilotingSub) {
        state.activeSub.x = this.player.x;
        state.activeSub.y = this.player.y;
        state.activeSub.vx = 0;
        state.activeSub.vy = 0;
      }
      if (state.carrierSub) {
        state.carrierSub.x = this.player.x;
        state.carrierSub.y = this.player.y;
        state.carrierSub.vx = 0;
        state.carrierSub.vy = 0;
      }
      this.cameras.main.centerOn(fish.x, fish.y);
      refreshPlaytestCamera(this);
      return { ok: true, species: fish.species, behaviorClass: fish.behaviorClass ?? 'legacySwimmer', x: roundMetric(fish.x), y: roundMetric(fish.y) };
    } else if (command === 'faunaBehaviorReview') {
      const payload = typeof value === 'object' && value !== null
        ? value as { species?: string; assetKey?: string; behaviorClass?: string }
        : {};
      const camera = this.cameras.main;
      const targets = this.fish.filter((fish) => {
        if (fish.dead) return false;
        if (payload.species && fish.species !== payload.species) return false;
        if (payload.assetKey && fish.assetKey !== payload.assetKey) return false;
        if (payload.behaviorClass && (fish.behaviorClass ?? 'legacySwimmer') !== payload.behaviorClass) return false;
        return true;
      }).map((fish) => {
        const validation = fish.surface ? validateTerrainSurfaceAnchor(this, fish.surface) : { valid: false };
        const tangentSpeed = fish.surface ? Math.abs(fish.vx * fish.surface.tangentX + fish.vy * fish.surface.tangentY) : 0;
        const normalSpeed = fish.surface ? Math.abs(fish.vx * fish.surface.normalX + fish.vy * fish.surface.normalY) : 0;
        return {
          species: fish.species,
          assetKey: fish.assetKey,
          behaviorClass: fish.behaviorClass ?? 'legacySwimmer',
          terrainAffinity: fish.terrainAffinity ?? 'openWater',
          x: roundMetric(fish.x),
          y: roundMetric(fish.y),
          hasSurface: Boolean(fish.surface),
          supported: validation.valid,
          fallbackNoAnchor: Boolean(fish.fallbackNoAnchor),
          anchor: fish.anchor ?? fish.surface?.anchor ?? 'none',
          rootX: roundMetric(fish.surface?.rootX ?? fish.homeX),
          rootY: roundMetric(fish.surface?.rootY ?? fish.homeY),
          distanceFromSurface: fish.surface ? roundMetric(Math.abs((fish.x - fish.surface.rootX) * fish.surface.normalX + (fish.y - fish.surface.rootY) * fish.surface.normalY)) : null,
          distanceFromRoot: fish.surface ? roundMetric(Phaser.Math.Distance.Between(fish.x, fish.y, fish.surface.rootX, fish.surface.rootY)) : null,
          velocityMagnitude: roundMetric(Math.hypot(fish.vx, fish.vy)),
          vx: roundMetric(fish.vx),
          vy: roundMetric(fish.vy),
          centerTile: this.getTile(Math.floor(fish.x / TILE), Math.floor(fish.y / TILE)),
          navTargetX: fish.navTargetX === undefined ? null : roundMetric(fish.navTargetX),
          navTargetY: fish.navTargetY === undefined ? null : roundMetric(fish.navTargetY),
          navWaypointTimer: roundMetric(fish.navWaypointTimer ?? 0),
          navReseedCooldown: roundMetric(fish.navReseedCooldown ?? 0),
          navStuckTimer: roundMetric(fish.navStuckTimer ?? 0),
          navTerrainBounces: fish.navTerrainBounces ?? 0,
          navRecentTerrainBounces: fish.navRecentTerrainBounces ?? 0,
          navBlockedFeelers: fish.navBlockedFeelers ?? 0,
          navLastBlockedFeelers: fish.navLastBlockedFeelers ?? 0,
          navHeadingFlipCount: roundMetric(fish.navHeadingFlipCount ?? 0),
          navReseedCount: fish.navReseedCount ?? 0,
          navSpawnValidated: Boolean(fish.navSpawnValidated),
          navSpawnFallback: Boolean(fish.navSpawnFallback),
          tangentSpeed: roundMetric(tangentSpeed),
          normalSpeed: roundMetric(normalSpeed),
          aggro: roundMetric(fish.aggro),
          aggroCue: roundMetric(fish.aggroCue),
          lungeTimer: roundMetric(fish.lungeTimer ?? 0),
          recoverTimer: roundMetric(fish.recoverTimer ?? 0),
          retract: roundMetric(fish.retract ?? 0),
          screenVisible: fish.x >= camera.worldView.x && fish.x <= camera.worldView.right && fish.y >= camera.worldView.y && fish.y <= camera.worldView.bottom,
        };
      });
      return { ok: true, count: targets.length, targets };
	    } else if (command === 'terrainLookReview') {
      refreshPlaytestCamera(this);
      this.draw();
      return this.playtestSnapshot();
	    } else if (command === 'terrainReview') {
	      stageTerrainReview(this, 'intact');
    } else if (command === 'terrainMiningReview') {
	      const payload = typeof value === 'object' && value !== null ? value as { stage?: TerrainReviewStage } : {};
	      const stage = payload.stage === 'damage' || payload.stage === 'break' || payload.stage === 'after'
	        ? payload.stage
	        : 'intact';
	      stageTerrainReview(this, stage);
    } else if (command === 'miningPolishReview') {
      const payload = typeof value === 'object' && value !== null ? value as { stage?: MiningPolishReviewStage } : {};
      const stage = payload.stage === 'collect' || payload.stage === 'drill' ? payload.stage : 'setup';
      return stageMiningPolishReview(this, stage);
    } else if (command === 'oreDepositReview') {
      const payload = typeof value === 'object' && value !== null ? value as { focusTile?: Tile; focusCamera?: boolean; shapeFirstSlice?: boolean; shapeFirstGroup?: number; shapeFirstCameraOffsetY?: number } : {};
      const focusTile = payload.focusTile && isOreTile(payload.focusTile) ? payload.focusTile : 'sunstone';
      stageOreDepositReview(
        this,
        focusTile,
        payload.focusCamera === true,
        payload.shapeFirstSlice === true,
        Number.isFinite(payload.shapeFirstGroup) ? Number(payload.shapeFirstGroup) : -1,
        Number.isFinite(payload.shapeFirstCameraOffsetY) ? Number(payload.shapeFirstCameraOffsetY) : 0,
      );
    } else if (command === 'backgroundReview') {
      return stageBackgroundReview(this, value);
    } else if (command === 'lightingVisibilityReview') {
      return stageLightingVisibilityReview(this);
    } else if (command === 'strayOreDropReview') {
      return stageStrayOreDropReview(this);
    } else if (command === 'interactionEdgeProof') {
      return stageInteractionEdgeProof(this, value);
	    } else if (command === 'terrainMineAt') {
	      const payload = typeof value === 'object' && value !== null ? value as { worldX?: number; worldY?: number; repeats?: number } : {};
	      const repeats = Phaser.Math.Clamp(Math.floor(Number(payload.repeats) || 1), 1, 12);
	      state.fuel = Math.max(state.fuel, 80);
	      state.oxygen = Math.max(state.oxygen, 80);
	      state.upgrades.laser = Math.max(state.upgrades.laser, 3);
	      for (let i = 0; i < repeats; i += 1) {
	        this.player.mineCooldown = 0;
	        this.mineAt(Number(payload.worldX) || this.player.x, Number(payload.worldY) || this.player.y + 36);
	      }
    } else if (command === 'acceptForwardOutpostQuest') {
      const quest = state.questBoard.find((entry) => entry.kind === 'forwardOutpost');
      if (!quest) return { ok: false, reason: 'forward outpost quest missing' };
      this.acceptQuest(quest.id);
      return { ok: state.activeQuestId === quest.id, quest: { ...quest } };
    } else if (command === 'stageForwardOutpostSite') {
      const targetDepth = Math.max(FORWARD_OUTPOST_MIN_DEPTH + 60, Number(value) || 0);
      const targetY = SURFACE_Y + (targetDepth / 6) * TILE;
      let flora = this.flora.find((candidate) => !candidate.dead && !candidate.hazardous && candidate.y >= targetY - 220);
      if (!flora) flora = this.flora.find((candidate) => !candidate.dead && !candidate.hazardous);
      const x = Phaser.Math.Clamp((flora?.x ?? WORLD_W * TILE * 0.5) + 34, 72, WORLD_W * TILE - 72);
      const y = Phaser.Math.Clamp(flora?.y ?? targetY, targetY, WORLD_H * TILE - 72);
      if (flora) {
        flora.x = x - 34;
        flora.y = y;
      }
      this.player.x = x;
      this.player.y = y;
      this.player.vx = 0;
      this.player.vy = 0;
      state.docked = false;
      state.atBoat = false;
      state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
      const tx = Math.floor(this.player.x / TILE);
      const ty = Math.floor(this.player.y / TILE);
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          this.setTile(tx + ox, ty + oy, 'water');
        }
      }
      this.setTile(tx + 2, ty, 'stone');
      this.setTile(tx + 2, ty + 1, 'stone');
      this.setTile(tx + 2, ty - 1, 'stone');
      this.revealSonarAtWorld(this.player.x, this.player.y, 10);
      return { ok: true, flora: flora?.species ?? '', player: { x: Math.round(this.player.x), y: Math.round(this.player.y), depth: state.depth } };
    } else if (command === 'establishForwardOutpost') {
      return this.establishForwardOutpost();
    } else if (command === 'tickSystems') {
      this.updateSystems(Phaser.Math.Clamp(Number(value) || 0.25, 0, 5));
    } else if (command === 'perfGuardrailReview') {
      const payload = typeof value === 'object' && value !== null ? value as { cleanupVisualActors?: boolean } : {};
      return stagePerfGuardrailReview(this, payload.cleanupVisualActors === true);
    } else if (command === 'biomeLoadingReview') {
      return { ...state.biomeLoading, worldReady: this.worldReady };
    } else if (command === 'teleportToArticulated') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string } : {};
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        this.player.x = Phaser.Math.Clamp(creature.x - 120, 20, WORLD_W * TILE - 20);
        this.player.y = Phaser.Math.Clamp(creature.y, 20, WORLD_H * TILE - 20);
        this.player.vx = 0;
        this.player.vy = 0;
        state.docked = false;
        state.atBoat = false;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.revealSonarAtWorld(creature.x, creature.y, 12);
      }
    } else if (command === 'teleportToBobbitBurrow') {
      const payload = typeof value === 'object' && value !== null ? value as { index?: number; burrowId?: string } : {};
      const burrow = payload.burrowId
        ? this.bobbitBurrows.find((candidate) => candidate.id === payload.burrowId)
        : this.bobbitBurrows[Phaser.Math.Clamp(Math.floor(Number(payload.index) || 0), 0, Math.max(0, this.bobbitBurrows.length - 1))];
      if (burrow) {
        this.player.x = burrow.approachX;
        this.player.y = burrow.approachY;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing.set(0, 1);
        state.started = true;
        state.docked = false;
        state.atBoat = false;
        state.paused = false;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.revealSonarAtWorld(burrow.x, burrow.y, 10);
        this.cameras.main.centerOn(burrow.x, burrow.y);
        return this.playtestSnapshot();
      }
    } else if (command === 'forceBobbitTelegraph') {
      const payload = typeof value === 'object' && value !== null ? value as { burrowId?: string } : {};
      const creature = this.articulatedCreatures.find((candidate) => candidate.bobbitBurrow && (!payload.burrowId || candidate.bobbitBurrow.burrowId === payload.burrowId));
      const burrow = creature ? this.bobbitBurrows.find((candidate) => candidate.id === creature.bobbitBurrow?.burrowId) : undefined;
      if (creature?.bobbitBurrow && burrow) {
        this.player.x = burrow.approachX;
        this.player.y = burrow.approachY;
        this.player.vx = 0;
        this.player.vy = 0;
        creature.bobbitBurrow.phase = 'telegraph';
        creature.bobbitBurrow.phaseTimer = 0.72;
        burrow.triggered = true;
        state.started = true;
        state.docked = false;
        state.atBoat = false;
        state.paused = false;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.updateArticulatedCreatures(0.016, { move: new Phaser.Math.Vector2(0, 0), hasMove: false, mineHeld: false, scanHeld: false, sonarPressed: false, sonarMapPressed: false, useItemPressed: false, boardHeld: false, boardPressed: false, scoutPressed: false, pausePressed: false, cancelPressed: false, logbookPressed: false, confirmPressed: false });
        return this.playtestSnapshot();
      }
    } else if (command === 'forceBobbitDrag') {
      const payload = typeof value === 'object' && value !== null ? value as { burrowId?: string; target?: 'player' | 'sub' } : {};
      const creature = this.articulatedCreatures.find((candidate) => candidate.bobbitBurrow && (!payload.burrowId || candidate.bobbitBurrow.burrowId === payload.burrowId));
      const burrow = creature ? this.bobbitBurrows.find((candidate) => candidate.id === creature.bobbitBurrow?.burrowId) : undefined;
      if (creature?.bobbitBurrow && burrow) {
        const useSub = payload.target === 'sub' && state.activeSub;
        const target = useSub && state.activeSub ? state.activeSub : this.player;
        target.x = burrow.x + 8;
        target.y = burrow.y - TILE * 2;
        target.vx = 0;
        target.vy = 0;
        creature.x = burrow.x;
        creature.y = burrow.y - TILE;
        creature.vx = 0;
        creature.vy = 0;
        creature.state = 'grab';
        creature.grabTimer = 5.2;
        creature.bobbitBurrow.phase = 'drag';
        creature.bobbitBurrow.phaseTimer = 0;
        creature.bobbitBurrow.dragTimer = 5.2;
        creature.bobbitBurrow.escapeRemaining = BOBBIT_ESCAPE_SECONDS;
        creature.bobbitBurrow.captured = useSub ? 'sub' : 'player';
        creature.bobbitBurrow.lastSafeX = target.x;
        creature.bobbitBurrow.lastSafeY = target.y;
        creature.bobbitBurrow.biteRegistered = true;
        state.started = true;
        state.docked = false;
        state.atBoat = false;
        state.paused = false;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.updateArticulatedParts(creature, 0);
        return this.playtestSnapshot();
      }
    } else if (command === 'liveArticulatedReview') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string; mode?: string } : {};
      const mode = String(payload.mode ?? 'turn');
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        const facing = mode.includes('left') ? -1 : 1;
        const stunnedReview = mode.includes('stunned');
        const attackReview = mode.includes('attack');
        const reviewX = WORLD_W * TILE * 0.5;
        const reviewY = SURFACE_Y + 330;
        clearPlaytestFloatingText(this);
        for (let ty = Math.max(7, Math.floor((reviewY - 280) / TILE)); ty <= Math.min(WORLD_H - 2, Math.ceil((reviewY + 280) / TILE)); ty += 1) {
          for (let tx = Math.max(1, Math.floor((reviewX - 680) / TILE)); tx <= Math.min(WORLD_W - 2, Math.ceil((reviewX + 680) / TILE)); tx += 1) {
            this.setTile(tx, ty, 'water');
          }
        }
        this.articulatedCreatures.forEach((candidate) => {
          candidate.reviewFrozen = false;
          if (candidate === creature) return;
          candidate.x = reviewX - facing * 2400;
          candidate.y = reviewY + 1600;
          candidate.homeX = candidate.x;
          candidate.homeY = candidate.y;
          candidate.vx = 0;
          candidate.vy = 0;
          candidate.reviewFrozen = true;
          this.updateArticulatedParts(candidate, 0);
        });
        const playerGap = Math.max(230, creature.radius + 150);
        this.player.x = reviewX + facing * playerGap;
        this.player.y = reviewY + (mode.includes('dive') ? 92 : -82);
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing.set(-facing, 0);
        this.player.facingSign = facing < 0 ? 1 : -1;
        creature.x = reviewX - facing * 130;
        creature.y = reviewY + 48;
        creature.homeX = creature.x;
        creature.homeY = creature.y;
        creature.vx = facing * creature.speed * (attackReview ? 2.2 : stunnedReview ? 1.35 : 0.68);
        creature.vy = attackReview ? 0 : mode.includes('dive') ? creature.speed * 0.45 : -creature.speed * (stunnedReview ? 0.72 : 0.34);
        creature.facingSign = facing;
        creature.aggro = stunnedReview ? 5.6 : 4.8;
        creature.phase = 0.4;
        creature.swimEffort = attackReview ? 1.15 : 0.85;
        creature.posePitch = 0;
        creature.attackBlend = attackReview ? 1 : mode.includes('lunge') ? 0.5 : stunnedReview ? 0.12 : 0;
        creature.state = attackReview || mode.includes('lunge') ? 'lunge' : 'stalk';
        creature.stateTimer = attackReview ? 0.85 : mode.includes('lunge') ? 0.8 : 2.5;
        creature.grabTimer = 0;
        creature.grabCooldown = attackReview ? 0 : 999;
        creature.bumpCooldown = attackReview ? 0 : 999;
        creature.stunned = stunnedReview ? 3.2 : 0;
        creature.parts.forEach((part) => {
          part.hp = Math.max(1, part.hp);
          part.hurtFlash = 0;
          part.detached = false;
          part.detachVx = 0;
          part.detachVy = 0;
          part.detachAngularVelocity = 0;
        });
        creature.spine.forEach((node) => {
          node.offset = 0;
          node.bend = 0;
        });
        clearVenom();
        clearBleed();
        state.hull = attackReview ? 180 : 100 + state.upgrades.suit * 25;
        state.oxygen = oxygenMax();
        state.started = true;
        state.docked = false;
        state.atBoat = false;
        state.paused = true;
        state.radioOpen = false;
        state.logbookOpen = false;
        state.cargoOpen = false;
        state.lost = false;
        state.won = false;
        state.status = '';
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.updateArticulatedParts(creature, 0);
        if (attackReview) {
          const biteAnchor = this.articulatedBiteAnchorWorld(creature);
          if (biteAnchor) {
            this.player.x = biteAnchor.x + facing * 6;
            this.player.y = biteAnchor.y;
            this.player.vx = 0;
            this.player.vy = 0;
            state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
          }
        }
        this.cameras.main.centerOn(reviewX, reviewY);
        refreshPlaytestCamera(this);
        this.draw();
      }
    } else if (command === 'advanceLiveArticulatedReview') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string; seconds?: number; attack?: boolean } : {};
      const seconds = Phaser.Math.Clamp(Number(payload.seconds) || 0.16, 0, 1);
      state.started = true;
      state.docked = false;
      state.atBoat = false;
      state.paused = false;
      state.radioOpen = false;
      state.logbookOpen = false;
      state.cargoOpen = false;
      state.lost = false;
      state.won = false;
      state.status = '';
      if (!payload.attack) {
        clearVenom();
        clearBleed();
        state.hull = 100 + state.upgrades.suit * 25;
        state.oxygen = oxygenMax();
      }
      this.updateArticulatedCreatures(seconds);
      if (payload.attack) clearPlaytestFloatingText(this);
      const focus = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      if (focus) {
        if (!payload.attack) {
          const playerGap = Math.max(230, focus.radius + 150);
          this.player.x = Phaser.Math.Clamp(focus.x + focus.facingSign * playerGap, 20, WORLD_W * TILE - 20);
          this.player.y = Phaser.Math.Clamp(focus.y - 82, 20, WORLD_H * TILE - 20);
          this.player.vx = 0;
          this.player.vy = 0;
          this.player.facing.set(-focus.facingSign, 0);
          this.player.facingSign = focus.facingSign < 0 ? 1 : -1;
        }
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.cameras.main.centerOn(focus.x, focus.y);
      }
      if (payload.attack) {
        renderHud();
      } else {
        state.paused = true;
      }
      refreshPlaytestCamera(this);
      this.draw();
    } else if (command === 'articulatedBudgetReview') {
      const manifest = articulatedCreatureDefs().find((candidate) => candidate.id !== 'abyssal-mandible-bobbit' && state.biome >= candidate.minBiome)
        ?? articulatedCreatureDefs().find((candidate) => candidate.id !== 'abyssal-mandible-bobbit')
        ?? articulatedCreatureDefs()[0];
      while (this.articulatedCreatures.filter((candidate) => !candidate.bobbitBurrow).length < 2) {
        const spawned = createArticulatedCreature(this, manifest, WORLD_W * TILE * 0.5, SURFACE_Y + 420);
        this.articulatedCreatures.push(spawned);
      }
      const candidates = this.articulatedCreatures.filter((candidate) => !candidate.bobbitBurrow);
      const visible = candidates[0];
      const offscreen = candidates[1];
      const visibleX = WORLD_W * TILE * 0.5;
      const visibleY = SURFACE_Y + 520;
      const offscreenX = Phaser.Math.Clamp(visibleX + 1700, 60, WORLD_W * TILE - 60);
      const offscreenY = Phaser.Math.Clamp(visibleY + 980, 60, WORLD_H * TILE - 60);
      state.started = true;
      state.docked = false;
      state.atBoat = false;
      state.paused = false;
      state.radioOpen = false;
      state.lost = false;
      state.won = false;
      this.player.x = visibleX - 180;
      this.player.y = visibleY;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.facing.set(1, 0);
      this.cameras.main.centerOn(visibleX, visibleY);
      for (const creature of [visible, offscreen]) {
        creature.x = creature === visible ? visibleX : offscreenX;
        creature.y = creature === visible ? visibleY : offscreenY;
        creature.homeX = creature.x;
        creature.homeY = creature.y;
        creature.vx = creature === visible ? 24 : 18;
        creature.vy = 0;
        creature.aggro = 0;
        creature.stunned = 0;
        creature.hurtFlash = 0;
        creature.state = 'patrol';
        creature.stateTimer = 0;
        creature.grabTimer = 0;
        creature.grabCooldown = 999;
        creature.bumpCooldown = 999;
        creature.reviewFrozen = false;
        creature.simulationBudget = {
          accumulator: 0,
          lastTier: 'full',
          skippedFrames: 0,
          fullSteps: 0,
          skippedSteps: 0,
        };
        this.updateArticulatedParts(creature, 0);
      }
      refreshPlaytestCamera(this);
      for (let i = 0; i < 60; i += 1) this.updateArticulatedCreatures(1 / 60);
      return {
        visible: {
          id: visible.id,
          tier: visible.simulationBudget?.lastTier,
          fullSteps: visible.simulationBudget?.fullSteps ?? 0,
          skippedSteps: visible.simulationBudget?.skippedSteps ?? 0,
          x: roundMetric(visible.x),
        },
        offscreen: {
          id: offscreen.id,
          tier: offscreen.simulationBudget?.lastTier,
          fullSteps: offscreen.simulationBudget?.fullSteps ?? 0,
          skippedSteps: offscreen.simulationBudget?.skippedSteps ?? 0,
          x: roundMetric(offscreen.x),
        },
      };
    } else if (command === 'largeThreatRippleTurnReview') {
      const manifest = articulatedCreatureDefs().find((candidate) => ['abyssal-gulper', 'abyssal-serpent', 'abyssal-crownmaw', 'abyssal-reliquary-wyrm', 'abyssal-glasshook-skulk'].includes(candidate.id) && state.biome >= candidate.minBiome)
        ?? articulatedCreatureDefs().find((candidate) => candidate.id !== 'abyssal-mandible-bobbit' && state.biome >= candidate.minBiome)
        ?? articulatedCreatureDefs()[0];
      const reviewX = WORLD_W * TILE * 0.5;
      const reviewY = SURFACE_Y + 460;
      let creature = this.articulatedCreatures.find((candidate) => candidate.id === manifest.id && !candidate.bobbitBurrow);
      if (!creature) {
        creature = createArticulatedCreature(this, manifest, reviewX, reviewY);
        this.articulatedCreatures.push(creature);
      }
      this.articulatedCreatures.forEach((candidate) => {
        if (candidate === creature) return;
        candidate.reviewFrozen = true;
        candidate.x = reviewX + 2400;
        candidate.y = reviewY + 1600;
        candidate.vx = 0;
        candidate.vy = 0;
        this.updateArticulatedParts(candidate, 0);
      });
      for (let ty = Math.max(7, Math.floor((reviewY - 320) / TILE)); ty <= Math.min(WORLD_H - 2, Math.ceil((reviewY + 320) / TILE)); ty += 1) {
        for (let tx = Math.max(1, Math.floor((reviewX - 780) / TILE)); tx <= Math.min(WORLD_W - 2, Math.ceil((reviewX + 780) / TILE)); tx += 1) {
          this.setTile(tx, ty, 'water');
        }
      }
      clearVenom();
      clearBleed();
      clearPlaytestFloatingText(this);
      state.started = true;
      state.docked = false;
      state.atBoat = false;
      state.paused = false;
      state.radioOpen = false;
      state.logbookOpen = false;
      state.cargoOpen = false;
      state.lost = false;
      state.won = false;
      state.hull = 100 + state.upgrades.suit * 25;
      state.oxygen = oxygenMax();
      this.player.x = reviewX - 360;
      this.player.y = reviewY;
      this.player.vx = 0;
      this.player.vy = 0;
      creature.reviewFrozen = false;
      creature.x = reviewX;
      creature.y = reviewY;
      creature.homeX = reviewX;
      creature.homeY = reviewY;
      creature.vx = creature.speed * 1.15;
      creature.vy = 0;
      creature.facingSign = 1;
      creature.turn = undefined;
      creature.aggro = 4.5;
      creature.state = 'stalk';
      creature.stateTimer = 2;
      creature.grabCooldown = 999;
      creature.bumpCooldown = 999;
      creature.stunned = 0;
      creature.parts.forEach((part) => {
        part.hp = Math.max(1, part.maxHp);
        part.detached = false;
        part.hurtFlash = 0;
      });
      this.updateArticulatedParts(creature, 0);
      const snapshots = [];
      const capture = (label: string) => ({
        label,
        x: roundMetric(creature.x),
        vx: roundMetric(creature.vx),
        facingSign: creature.facingSign,
        heading: roundMetric(creature.turn?.heading ?? 0),
        angularVelocity: roundMetric(creature.turn?.angularVelocity ?? 0),
        mirrorSide: creature.turn?.mirrorSide ?? null,
        historySamples: creature.turn?.history.length ?? 0,
        scaleYByPart: Object.fromEntries(creature.parts.map((part) => [part.id, roundMetric(part.sprite?.scaleY ?? 0)])),
      });
      snapshots.push(capture('initial'));
      this.cameras.main.centerOn(reviewX, reviewY);
      for (let i = 0; i < 18; i += 1) {
        this.player.x = creature.x + 360;
        this.player.y = creature.y - 120;
        this.updateArticulatedCreatures(1 / 60);
        this.draw();
      }
      snapshots.push(capture('right-approach'));
      for (let i = 0; i < 72; i += 1) {
        this.player.x = creature.x - 420;
        this.player.y = creature.y + (i < 36 ? 150 : -150);
        this.updateArticulatedCreatures(1 / 60);
        this.draw();
      }
      snapshots.push(capture('after-cross'));
      for (let i = 0; i < 160; i += 1) {
        this.player.x = creature.x + (i % 2 === 0 ? -460 : 460);
        this.player.y = creature.y + Math.sin(i * 0.2) * 190;
        this.updateArticulatedCreatures(1 / 60);
      }
      this.cameras.main.centerOn(creature.x, creature.y);
      refreshPlaytestCamera(this);
      this.draw();
      snapshots.push(capture('bounded-history'));
      return {
        id: creature.id,
        species: creature.species,
        minBiome: creature.manifest.minBiome,
        usesRippleTurning: usesLargeThreatRippleTurning(creature),
        snapshots,
        smallFishUsesLegacyFacing: !this.fish.some((fish) => 'turn' in fish),
      };
    } else if (command === 'focusArticulatedCamera') {
      const payload = typeof value === 'object' && value !== null
        ? value as { creatureId?: string; preserveVitals?: boolean; freeze?: boolean; unpaused?: boolean; maxZoom?: number; includePlayer?: boolean }
        : {};
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        if (payload.freeze) {
          creature.reviewFrozen = true;
          creature.vx = 0;
          creature.vy = 0;
          creature.parts.forEach((part) => {
            part.hurtFlash = 0;
          });
          clearPlaytestFloatingText(this);
          this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });
        }
        const activeParts = creature.parts.filter((part) => !part.detached);
        const extents = activeParts.map((part) => {
          const manifest = partManifest(creature, part);
          const halfW = manifest.size[0] * ENTITY_SCALE * 0.56;
          const halfH = manifest.size[1] * ENTITY_SCALE * 0.56;
          return { minX: part.x - halfW, maxX: part.x + halfW, minY: part.y - halfH, maxY: part.y + halfH };
        });
        if (payload.includePlayer) {
          const biteAnchor = this.articulatedBiteAnchorWorld(creature);
          const playerPadX = 180;
          const playerPadY = 140;
          extents.push({
            minX: this.player.x - playerPadX,
            maxX: this.player.x + playerPadX,
            minY: this.player.y - playerPadY,
            maxY: this.player.y + playerPadY,
          });
          if (biteAnchor) {
            extents.push({
              minX: biteAnchor.x - playerPadX,
              maxX: biteAnchor.x + playerPadX,
              minY: biteAnchor.y - playerPadY,
              maxY: biteAnchor.y + playerPadY,
            });
          }
        }
        const minX = Math.min(...extents.map((part) => part.minX));
        const maxX = Math.max(...extents.map((part) => part.maxX));
        const minY = Math.min(...extents.map((part) => part.minY));
        const maxY = Math.max(...extents.map((part) => part.maxY));
        const maxZoom = Phaser.Math.Clamp(Number(payload.maxZoom) || 1.15, 0.22, 1.15);
        const fitZoom = Phaser.Math.Clamp(Math.min(980 / Math.max(1, maxX - minX), 560 / Math.max(1, maxY - minY)), 0.22, maxZoom);
        if (!payload.preserveVitals) {
          clearVenom();
          clearBleed();
          state.hull = 100 + state.upgrades.suit * 25;
          state.oxygen = oxygenMax();
        }
        state.lost = false;
        state.won = false;
        state.status = '';
        state.paused = false;
        state.radioOpen = false;
        state.logbookOpen = false;
        state.cargoOpen = false;
        renderHud();
        state.paused = !payload.unpaused;
        this.cameras.main.setZoom(fitZoom);
        this.cameras.main.centerOn((minX + maxX) * 0.5, (minY + maxY) * 0.5 - 42);
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'reviewArticulated') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string; mode?: string } : {};
      const mode = typeof value === 'string' ? value : String(payload.mode ?? 'right');
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        const facing = mode.includes('left') ? -1 : 1;
        const pitched = mode.includes('rise') || mode.includes('dive');
        const reviewX = WORLD_W * TILE * 0.5 + facing * 140;
        const reviewY = SURFACE_Y + 220;
        const playerGap = 130;
        for (let ty = Math.max(7, Math.floor((reviewY - 230) / TILE)); ty <= Math.min(WORLD_H - 2, Math.ceil((reviewY + 230) / TILE)); ty += 1) {
          for (let tx = Math.max(1, Math.floor((reviewX - 560) / TILE)); tx <= Math.min(WORLD_W - 2, Math.ceil((reviewX + 560) / TILE)); tx += 1) {
            this.setTile(tx, ty, 'water');
          }
        }
        clearPlaytestFloatingText(this);
        this.articulatedCreatures.forEach((candidate) => {
          const isTarget = candidate === creature;
          candidate.reviewFrozen = true;
          candidate.collisionDebug = undefined;
          candidate.stunned = 0;
          candidate.aggro = 0;
          candidate.state = 'recover';
          candidate.stateTimer = 999;
          candidate.grabTimer = 0;
          candidate.grabCooldown = 999;
          candidate.bumpCooldown = 999;
          candidate.hp = candidate.maxHp;
          candidate.dead = false;
          candidate.scanning = false;
          candidate.scan = 0;
          candidate.hurtFlash = 0;
          candidate.parts.forEach((part) => {
            part.hp = part.maxHp;
            part.hurtFlash = 0;
            part.jointStress = 0;
            part.detached = false;
            part.detachVx = 0;
            part.detachVy = 0;
            part.detachAngularVelocity = 0;
            part.terrainContact = 0;
            part.terrainNormalX = 0;
            part.terrainNormalY = 0;
          });
          candidate.socketOverlays.forEach((overlay) => {
            overlay.span = 0;
            overlay.bridgeWidth = 0;
            overlay.bridgeCoverage = 0;
            overlay.parentCoverage = 0;
            overlay.childCoverage = 0;
          });
          if (isTarget) return;
          candidate.x = reviewX - facing * 2600;
          candidate.y = reviewY + 1800;
          candidate.homeX = candidate.x;
          candidate.homeY = candidate.y;
          candidate.vx = 0;
          candidate.vy = 0;
          this.updateArticulatedParts(candidate, 0);
        });
        this.player.x = reviewX - facing * playerGap;
        this.player.y = reviewY;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing.set(facing, 0);
        this.player.facingSign = facing;
        creature.x = reviewX;
        creature.y = reviewY;
        creature.homeX = reviewX;
        creature.homeY = reviewY;
        creature.vx = pitched ? facing * 48 : 0;
        creature.vy = mode.includes('rise') ? -42 : mode.includes('dive') ? 42 : 0;
        creature.facingSign = facing;
        creature.aggro = 0;
        creature.stunned = mode.includes('stunned') ? 5 : 0;
        creature.phase = mode.includes('lunge') ? 0.5 : 1.1;
        creature.swimEffort = 1;
        creature.state = mode.includes('lunge') ? 'lunge' : 'recover';
        creature.stateTimer = 999;
        creature.grabTimer = 0;
        creature.grabCooldown = 999;
        creature.collisionDebug = undefined;
        state.paused = false;
        state.radioOpen = false;
        state.logbookOpen = false;
        state.cargoOpen = false;
        state.lost = false;
        state.won = false;
        state.status = '';
        state.docked = false;
        state.atBoat = false;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.updateArticulatedParts(creature, 0);
        renderHud();
        state.paused = true;
        this.cameras.main.setZoom(1.15);
        this.cameras.main.centerOn(reviewX, reviewY);
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'advanceArticulatedReview') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string; seconds?: number; phaseRate?: number } : {};
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && candidate.reviewFrozen && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        const seconds = Phaser.Math.Clamp(Number(payload.seconds) || 0.16, 0, 2);
        const phaseRate = Phaser.Math.Clamp(Number(payload.phaseRate) || 1.35, 0.1, 4);
        creature.phase += seconds * phaseRate;
        creature.swimEffort = Phaser.Math.Clamp(creature.swimEffort || 1, 0.22, 1.28);
        this.updateArticulatedParts(creature, 0);
        state.paused = true;
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'advanceArticulatedDamageReview') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string; seconds?: number } : {};
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && candidate.reviewFrozen && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        const seconds = Phaser.Math.Clamp(Number(payload.seconds) || 0.16, 0, 1.5);
        this.updateArticulatedCreatures(seconds);
        state.paused = true;
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'damageArticulatedPart') {
      const payload = (value ?? {}) as { creatureId?: string; partId?: string; amount?: number; source?: string; quietReview?: boolean };
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      const part = payload.partId
        ? creature?.parts.find((candidate) => candidate.id === payload.partId)
        : creature ? this.articulatedBitePart(creature) : undefined;
      if (creature && part) {
        const amount = Number(payload.amount) || part.maxHp + 5;
        this.damageArticulatedPart(creature, part, amount, payload.source ?? 'Playtest');
        if (payload.quietReview) {
          clearPlaytestFloatingText(this);
          creature.hurtFlash = 0;
          creature.parts.forEach((candidate) => {
            candidate.hurtFlash = 0;
          });
        }
        this.updateArticulatedParts(creature, 0);
        creature.reviewFrozen = true;
        state.paused = true;
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'exerciseArticulatedToolDamage') {
      const payload = (value ?? {}) as { creatureId?: string; partId?: string; tool?: 'cutter' | 'knife' | 'dynamite' };
      const tool = payload.tool ?? 'cutter';
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      const part = creature?.parts.find((candidate) => candidate.id === (payload.partId ?? 'body-2'));
      if (creature && part) {
        clearPlaytestFloatingText(this);
        creature.reviewFrozen = false;
        creature.aggro = 0;
        creature.state = 'recover';
        creature.stateTimer = 999;
        creature.grabTimer = 0;
        creature.grabCooldown = 999;
        creature.bumpCooldown = 999;
        this.player.x = part.x;
        this.player.y = part.y;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing.set(creature.facingSign, 0);
        this.player.facingSign = creature.facingSign;
        this.player.mineCooldown = 0;
        state.started = true;
        state.docked = false;
        state.atBoat = false;
        state.paused = false;
        state.radioOpen = false;
        state.logbookOpen = false;
        state.cargoOpen = false;
        state.lost = false;
        state.won = false;
        state.fuel = fuelMax();
        state.oxygen = oxygenMax();
        state.hull = 100 + state.upgrades.suit * 25;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        if (tool === 'knife') {
          state.cargo = [createConsumableItem(shopItem('injector-knife'))];
          state.selectedCargoIndex = 0;
          this.useSelectedItem();
        } else if (tool === 'dynamite') {
          this.detonateDynamite(part.x, part.y);
        } else {
          this.mineAt(part.x, part.y);
        }
        clearPlaytestFloatingText(this);
        this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });
        creature.reviewFrozen = true;
        state.paused = true;
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'largeThreatDrillImmunityReview') {
      const payload = (value ?? {}) as { creatureId?: string };
      const manifest = articulatedCreatureDefs().find((candidate) => candidate.id === (payload.creatureId ?? 'abyssal-crownmaw'))
        ?? articulatedCreatureDefs().find((candidate) => candidate.id === 'abyssal-serpent')
        ?? articulatedCreatureDefs().find((candidate) => candidate.minBiome >= 3);
      if (!manifest) return { ok: false, reason: 'missing-articulated-manifest' };
      let creature = this.articulatedCreatures.find((candidate) => candidate.id === manifest.id && !candidate.bobbitBurrow);
      if (!creature) {
        creature = createArticulatedCreature(this, manifest, WORLD_W * TILE * 0.5, SURFACE_Y + scaledDepthPx(840));
        this.articulatedCreatures.push(creature);
      }
      const targetX = WORLD_W * TILE * 0.5;
      const targetY = SURFACE_Y + scaledDepthPx(840);
      const resetCreature = (target: ArticulatedCreature) => {
        target.x = targetX;
        target.y = targetY;
        target.homeX = targetX;
        target.homeY = targetY;
        target.vx = 0;
        target.vy = 0;
        target.facingSign = 1;
        target.hp = target.maxHp;
        target.dead = false;
        target.stunned = 0;
        target.aggro = 0;
        target.aggroCue = 0;
        target.state = 'recover';
        target.stateTimer = 999;
        target.grabTimer = 0;
        target.grabCooldown = 999;
        target.bumpCooldown = 999;
        target.parts.forEach((part) => {
          part.hp = part.maxHp;
          part.hurtFlash = 0;
          part.jointStress = 0;
          part.detached = false;
          part.detachVx = 0;
          part.detachVy = 0;
          part.detachAngularVelocity = 0;
        });
        this.updateArticulatedParts(target, 0);
        return target.parts.find((part) => part.id === 'body-2') ?? target.parts.find((part) => part.id.includes('body')) ?? target.parts[0];
      };
      const prepPlayerAt = (x: number, y: number) => {
        this.player.x = x - 8;
        this.player.y = y;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing.set(1, 0);
        this.player.facingSign = 1;
        this.player.mineCooldown = 0;
        state.started = true;
        state.docked = false;
        state.atBoat = false;
        state.paused = false;
        state.radioOpen = false;
        state.logbookOpen = false;
        state.cargoOpen = false;
        state.lost = false;
        state.won = false;
        state.pilotingSub = false;
        state.fuel = fuelMax();
        state.oxygen = oxygenMax();
        state.hull = 100 + state.upgrades.suit * 25;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
      };

      const cutterPart = resetCreature(creature);
      prepPlayerAt(cutterPart.x, cutterPart.y);
      const cutterBefore = { hp: creature.hp, partHp: cutterPart.hp, fuel: state.fuel };
      this.mineAt(cutterPart.x, cutterPart.y);
      const cutterAfter = { hp: creature.hp, partHp: cutterPart.hp, fuel: state.fuel, status: state.status };

      const stunPart = resetCreature(creature);
      prepPlayerAt(creature.x, creature.y);
      this.triggerStunPulse();
      const stunAfter = { stunned: creature.stunned, aggro: creature.aggro, status: state.status, partId: stunPart.id };

      const dynamitePart = resetCreature(creature);
      prepPlayerAt(dynamitePart.x, dynamitePart.y);
      const dynamiteBefore = { hp: creature.hp, partHp: dynamitePart.hp };
      this.detonateDynamite(dynamitePart.x, dynamitePart.y);
      const dynamiteAfter = { hp: creature.hp, partHp: dynamitePart.hp, status: state.status };

      creature.x = targetX - 2200;
      creature.y = targetY + 1200;
      creature.homeX = creature.x;
      creature.homeY = creature.y;
      this.updateArticulatedParts(creature, 0);

      const fish = this.fish.find((candidate) => !candidate.dead && candidate.hostile && candidate.radius <= 26)
        ?? this.fish.find((candidate) => !candidate.dead && candidate.radius <= 26)
        ?? this.fish.find((candidate) => !candidate.dead);
      if (!fish) return { ok: false, reason: 'missing-normal-fauna', largeThreat: { id: creature.id, species: creature.species } };
      fish.x = targetX;
      fish.y = targetY;
      fish.homeX = fish.x;
      fish.homeY = fish.y;
      fish.vx = 0;
      fish.vy = 0;
      fish.hp = fish.maxHp;
      fish.dead = false;
      fish.stunned = 0;
      fish.sprite?.setPosition(fish.x, fish.y).setVisible(true);
      prepPlayerAt(fish.x, fish.y);
      const fishBefore = { hp: fish.hp, maxHp: fish.maxHp };
      this.mineAt(fish.x, fish.y);
      const fishAfter = { hp: fish.hp, dead: fish.dead, status: state.status };

      clearPlaytestFloatingText(this);
      state.paused = true;
      refreshPlaytestCamera(this);
      this.draw();
      return {
        ok: true,
        largeThreat: {
          id: creature.id,
          species: creature.species,
          classified: isLargeArticulatedThreat(creature),
          rule: 'large articulated threat: signature apex ID or B3+ epic/legendary articulated creature with manifest radius >= 58 and non-passive behavior',
          cutter: { before: cutterBefore, after: cutterAfter },
          stun: stunAfter,
          dynamite: {
            before: dynamiteBefore,
            after: dynamiteAfter,
            largeThreatDamageMultiplier: LARGE_THREAT_DYNAMITE_DAMAGE_MULTIPLIER,
          },
        },
        normalFauna: {
          species: fish.species,
          hostile: fish.hostile,
          radius: roundMetric(fish.radius),
          cutter: { before: fishBefore, after: fishAfter },
        },
      };
    } else if (command === 'selectTool') {
      const toolId = typeof value === 'string' ? value : '';
      if (toolId === 'drill' || toolId === 'scanner' || toolId === 'sonar' || toolId === 'sampler' || toolId === 'flare' || toolId === 'stun' || toolId === 'charge') {
        return { ok: selectTool(toolId), snapshot: this.playtestSnapshot() };
      }
      return { ok: false, reason: 'unknown-tool', snapshot: this.playtestSnapshot() };
    } else if (command === 'buyShopItem') {
      const id = typeof value === 'string' ? value as ShopItem['id'] : 'stun-grenade';
      const beforeCargo = state.cargo.length;
      const beforeCredits = state.credits;
      this.buyShopItem(id);
      return {
        ok: state.cargo.length > beforeCargo || beforeCredits !== state.credits,
        id,
        cargoCount: state.cargo.filter((item) => item.id === id).length,
        unlockedTools: { ...state.unlockedTools },
        status: state.status,
      };
    } else if (command === 'stageStunToolSmoke') {
      return stageStunToolSmoke(this);
    } else if (command === 'stageBargeSaleSmoke') {
      return stageBargeSaleSmoke(this);
    } else if (command === 'sampleQuestBoardsSmoke') {
      const originalBiome = state.biome;
      const boards: Record<number, string[]> = {};
      for (const biome of [1, 2, 3, 4] as Biome[]) {
        state.biome = biome;
        boards[biome] = generateQuestBoard(false).map((quest) => quest.kind);
      }
      state.biome = 1;
      state.questBoard = generateQuestBoard(false);
      state.activeQuestId = '';
      state.sampledSpecies.clear();
      state.cargo = [];
      state.selectedCargoIndex = 0;
      state.started = true;
      state.atBoat = true;
      state.docked = true;
      state.paused = false;
      state.cargoOpen = false;
      renderHud();
      return { ok: Object.values(boards).every((kinds) => kinds.includes('sample')), originalBiome, boards, activeBoard: state.questBoard.map((quest) => ({ ...quest })) };
    } else if (command === 'acceptSampleQuest') {
      const quest = state.questBoard.find((entry) => entry.kind === 'sample');
      if (!quest) return { ok: false, reason: 'sample quest missing', questKinds: state.questBoard.map((entry) => entry.kind) };
      this.acceptQuest(quest.id);
      return { ok: state.activeQuestId === quest.id, quest: { ...quest }, snapshot: this.playtestSnapshot() };
    } else if (command === 'claimActiveQuest') {
      const quest = activeQuest();
      if (!quest) return { ok: false, reason: 'no active quest' };
      this.claimQuest(quest.id);
      return { ok: quest.claimed, quest: { ...quest }, snapshot: this.playtestSnapshot() };
    } else if (command === 'selectedToolSmokeStage') {
      const payload = typeof value === 'object' && value !== null ? value as { mode?: string } : {};
      const mode = payload.mode === 'life' ? 'life' : 'terrain';
      return stageSelectedToolSmoke(this, mode);
    } else if (command === 'floraSamplerSmokeStage') {
      const payload = typeof value === 'object' && value !== null ? value as { mode?: string } : {};
      const mode = payload.mode === 'scannedFlora'
        ? 'scannedFlora'
        : payload.mode === 'fish' || payload.mode === 'articulated' || payload.mode === 'terrain'
          ? payload.mode
          : 'flora';
      return stageFloraSamplerSmoke(this, mode);
    } else if (command === 'stampFloraSmokeStage') {
      const payload = typeof value === 'object' && value !== null ? value as { assetKey?: string; species?: string; index?: number } : {};
      return stageStampFloraSmoke(this, payload);
    } else if (command === 'brushFloraSmokeStage') {
      const payload = typeof value === 'object' && value !== null ? value as { assetKey?: string; species?: string; index?: number } : {};
      return stageBrushFloraSmoke(this, payload);
    } else if (command === 'collideArticulated') {
      const payload = (value ?? {}) as { creatureId?: string; partId?: string };
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      const part = creature?.parts.find((candidate) => candidate.id === (payload.partId ?? 'head'));
      if (creature && part) {
        creature.reviewFrozen = false;
        let frontSign = part.x < creature.x ? -1 : 1;
        creature.vx = frontSign * 90;
        creature.vy = 0;
        this.updateArticulatedParts(creature, 0);
        let shape = this.articulatedPartHitShape(creature, part);
        const edgeFor = () => {
          const axisX = Math.cos(shape.rotation);
          const axisY = Math.sin(shape.rotation);
          return {
            halfWidth: Math.abs(axisX) * shape.halfLength + shape.radius,
            halfHeight: Math.abs(axisY) * shape.halfLength + shape.radius,
          };
        };
        frontSign = shape.centerX < creature.x ? -1 : 1;
        let projected = edgeFor();
        let edgeX = shape.centerX + frontSign * projected.halfWidth;
        const targetColumn = Phaser.Math.Clamp(Math.floor(edgeX / TILE) + frontSign, 1, WORLD_W - 3);
        const desiredEdgeX = frontSign > 0 ? targetColumn * TILE + 42 : (targetColumn + 1) * TILE - 42;
        creature.x += desiredEdgeX - edgeX;
        creature.vx = frontSign * 90;
        this.updateArticulatedParts(creature, 0);
        shape = this.articulatedPartHitShape(creature, part);
        frontSign = shape.centerX < creature.x ? -1 : 1;
        projected = edgeFor();
        edgeX = shape.centerX + frontSign * projected.halfWidth;
        const tx = Phaser.Math.Clamp(Math.floor(edgeX / TILE), 1, WORLD_W - 3);
        const ty = Phaser.Math.Clamp(Math.floor(shape.centerY / TILE), 7, WORLD_H - 2);
        const halfRows = Phaser.Math.Clamp(Math.ceil(projected.halfHeight / TILE) + 2, 3, 7);
        const writtenTiles: { x: number; y: number; tile: Tile }[] = [];
        for (let ox = 0; ox <= 1; ox += 1) {
          for (let oy = -halfRows; oy <= halfRows; oy += 1) {
            const wallX = Phaser.Math.Clamp(tx + ox * frontSign, 1, WORLD_W - 2);
            const wallY = Phaser.Math.Clamp(ty + oy, 7, WORLD_H - 2);
            this.setTile(wallX, wallY, 'stone');
            writtenTiles.push({ x: wallX, y: wallY, tile: this.getTile(wallX, wallY) });
          }
        }
        creature.collisionDebug = {
          partId: part.id,
          frontSign: frontSign as 1 | -1,
          edgeX,
          edgeY: shape.centerY,
          halfWidth: projected.halfWidth,
          halfHeight: projected.halfHeight,
          tileX: tx,
          tileY: ty,
          halfRows,
          writtenTiles,
        };
        this.keepArticulatedCreatureInWater(creature);
        this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });
        creature.reviewFrozen = true;
        state.paused = true;
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'articulatedContactPolishReview') {
      return stageArticulatedContactPolishReview(this);
    } else if (command === 'saveGame') {
      return this.saveGame();
    } else if (command === 'loadGame') {
      return this.loadGame();
    } else if (command === 'corruptSave') {
      this.writeCorruptSaveForSmoke();
      return { ok: true, hasSavedGame: hasSavedGame() };
    } else if (command === 'clearSave') {
      this.clearSavedGame();
      return { ok: true, hasSavedGame: hasSavedGame() };
    } else if (command === 'setOxygen') {
      state.oxygen = Phaser.Math.Clamp(Number(value) || 0, 0, oxygenMax());
    } else if (command === 'setHull') {
      state.hull = Phaser.Math.Clamp(Number(value) || 0, 0, 100 + state.upgrades.suit * 25);
    } else if (command === 'recoverFinalProof') {
      const depth = typeof value === 'number' ? value : state.depth;
      const ok = recoverFinalProof('Abyssal Crownmaw', depth);
      renderHud();
      return { ok, snapshot: this.playtestSnapshot() };
    } else if (command === 'completeFinaleAtBarge') {
      state.atBoat = true;
      state.docked = true;
      const ok = completeFinaleAtBarge();
      renderHud();
      return { ok, snapshot: this.playtestSnapshot() };
    } else if (command === 'continueSurvey') {
      const ok = continueSurveyAfterEnding();
      renderHud();
      return { ok, snapshot: this.playtestSnapshot() };
    } else if (command === 'storyMilestoneSmokeStage') {
      return stageStoryMilestoneSmoke.call(this, value);
    }
    renderHud();
    return this.playtestSnapshot();
  }

export function playtestWorldSurvey(this: DeepdiveScene, ) {
    if (this.world.length < WORLD_H || !this.world[0]) {
      return {
        ready: false,
        width: WORLD_W,
        height: WORLD_H,
        bands: [],
        reachable: { cells: 0, waterCoverage: 0, deepestTileY: 0, deepestMeters: 0 },
        entities: { fish: 0, hostileFish: 0, articulated: 0, flora: 0, hazardousFlora: 0, vents: 0, bobbits: 0, bobbitBurrows: 0, rooms: 0, eggs: 0, larvae: 0 },
      };
    }
    const bandDefs = [
      { name: 'starter', from: 0, to: 0.18 },
      { name: 'upper tunnels', from: 0.18, to: 0.45 },
      { name: 'dark basin', from: 0.45, to: 0.68 },
      { name: 'lower tunnels', from: 0.68, to: 0.88 },
      { name: 'floor', from: 0.88, to: 1 },
    ];
    const bands = bandDefs.map((band) => {
      const startY = Math.floor(WORLD_H * band.from);
      const endY = Math.max(startY + 1, Math.floor(WORLD_H * band.to));
      const counts: Partial<Record<Tile, number>> = {};
      let cells = 0;
      let water = 0;
      let mineable = 0;
      let oreBlocks = 0;
      let oreValue = 0;
      let unmineable = 0;
      for (let y = startY; y < Math.min(WORLD_H, endY); y += 1) {
        for (let x = 0; x < WORLD_W; x += 1) {
          const tile = this.world[y][x];
          counts[tile] = (counts[tile] ?? 0) + 1;
          cells += 1;
          if (!tiles[tile].solid) water += 1;
          if (tiles[tile].solid && Number.isFinite(tiles[tile].hp)) mineable += 1;
          if (tiles[tile].value > 0) {
            oreBlocks += 1;
            oreValue += tiles[tile].value;
          }
          if (tile === 'anchorstone' || tile === 'bedrock') unmineable += 1;
        }
      }
      return {
        name: band.name,
        depthMeters: [
          Math.round(Math.max(0, (startY - 4) * 6)),
          Math.round(Math.max(0, (endY - 4) * 6)),
        ],
        waterRatio: roundMetric(water / cells),
        mineableRatio: roundMetric(mineable / cells),
        oreBlocks,
        oreValue,
        unmineableRatio: roundMetric(unmineable / cells),
        counts,
      };
    });
    const oasisSpecies = new Set(['Oxygen Bloom', 'Lumen Fern', 'Lumen Nodule']);
    const floatingOasisProps = this.flora.filter((flora) => {
      if (!oasisSpecies.has(flora.species)) return false;
      const tx = Math.floor(flora.x / TILE);
      const ty = Math.floor(flora.y / TILE);
      return !tiles[this.getTile(tx, ty)].solid && !tiles[this.getTile(tx, ty + 1)].solid;
    }).length;
    return {
      width: WORLD_W,
      height: WORLD_H,
      bands,
      reachable: this.playtestReachableWater(),
      entities: {
        fish: this.fish.length,
        hostileFish: this.fish.filter((fish) => fish.hostile).length,
        articulated: this.articulatedCreatures.length,
        flora: this.flora.length,
        hazardousFlora: this.flora.filter((flora) => flora.hazardous).length,
        vents: this.hazards.length,
        bobbits: this.bobbits.length,
        bobbitBurrows: this.bobbitBurrows.length,
        articulatedBobbits: this.articulatedCreatures.filter((creature) => creature.id === 'abyssal-mandible-bobbit').length,
        rooms: this.specialRooms.length,
        biolumeRooms: this.specialRooms.filter((room) => room.kind === 'biolume').length,
        nestRooms: this.specialRooms.filter((room) => room.kind === 'nest').length,
        floatingOasisProps,
        eggs: this.nestEggs.filter((egg) => egg.state !== 'destroyed').length,
        larvae: this.larvae.length,
      },
    };
  }

export function playtestReachableWater(this: DeepdiveScene, ) {
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number }> = [];
    const center = Math.floor(WORLD_W / 2);
    for (let x = center - 5; x <= center + 5; x += 1) {
      if (!tiles[this.getTile(x, 4)].solid) queue.push({ x, y: 4 });
    }
    let deepestY = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      deepestY = Math.max(deepestY, current.y);
      for (const next of [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ]) {
        if (next.x < 0 || next.x >= WORLD_W || next.y < 0 || next.y >= WORLD_H) continue;
        if (visited.has(`${next.x},${next.y}`)) continue;
        if (tiles[this.getTile(next.x, next.y)].solid) continue;
        queue.push(next);
      }
    }
    return {
      cells: visited.size,
      waterCoverage: roundMetric(visited.size / (WORLD_W * WORLD_H)),
      deepestTileY: deepestY,
      deepestMeters: Math.round(Math.max(0, (deepestY - 4) * 6)),
    };
  }
