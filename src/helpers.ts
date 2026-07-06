import Phaser from 'phaser';
import type { Biome,CargoItem,DiverAnimation,EnvironmentBackgroundRepeatMode,EnvironmentDepthBand,EnvironmentPainterlyBackgroundRole,EnvironmentReadabilityRisk,Fish,FishSpecies,FloraSpecies,Hazard,InventoryItemKind,Quest,ScanRarity,ScanTarget,ShopItem,SpecialRoom,SubTier,SubVehicle,Tile,Upgrade,UpgradeId,VeinRule } from './types';
import { audioKeys,BARGE_DOCK_Y,BARGE_PLATFORM_ENTRANCE_LEFT,BARGE_PLATFORM_ENTRANCE_RIGHT,BARGE_PLATFORM_ENTRANCE_TOP,BARGE_PLATFORM_GRID_H,BARGE_PLATFORM_GRID_W,BARGE_PLATFORM_HEIGHT,BARGE_PLATFORM_WIDTH,BARGE_UPGRADE_COST,BASE_OXYGEN,deepScale,diverFrameCounts,ENTITY_SCALE,FUEL_REFILL_AMOUNT,FUEL_REFILL_COST,MARLIN_VOUCHER_DISCOUNT,MINE_FUEL_COST,SUB_REPAIR_COST_PER_POINT,SURFACE_Y,TILE,WORLD_H,WORLD_W } from './constants';
import { biomeFish,biomeFlora,shopItems,subDefs,tiles,upgrades } from './content';
import { state,ui } from './state';
import { rng } from './rng';
import { articulatedCreatureDefs, loadArticulatedAssets, shouldSpawnArticulatedCreature } from './articulated';
import { loadArticulatedDiverAssets } from './diver-articulated';
import { clearFullscreenWarning,meter,renderHud,showFullscreenWarning } from './hud';
import type { DeepdiveScene } from './scene';
import phase3BackgroundManifestFile from '../public/assets/generated/background-phase3/background-phase3.manifest.json';

export function generateTile(x: number, y: number): Tile {
  if (y < 7) return 'water';
  if (x <= 1 || x >= WORLD_W - 2 || y >= WORLD_H - 2) return 'bedrock';
  const depth = y * TILE;
  const shallow = Phaser.Math.Clamp(1 - (y - 7) / (52 * deepScale), 0, 1);
  const cave =
    Math.sin(x * 0.31 + rng.seed) * 0.72 +
    Math.cos(y * 0.21 + rng.seed * 0.01) * 0.64 +
    Math.sin((x + y) * 0.12 + rng.seed * 0.04) * 0.42 +
    (hash(x, y, rng.seed) - 0.5) * 1.35;
  const caveThreshold = Phaser.Math.Linear(0.26, 1.04, 1 - shallow);
  if (cave > caveThreshold && y > 8) return 'water';
  if (state.biome === 4) {
    if (depth > scaledDepthPx(360) && hash(x * 5, y * 7, rng.seed) > 0.94 && (x + y) % 5 !== 0) return 'anchorstone';
    return depth > scaledDepthPx(260) || hash(y, x, rng.seed) > 0.55 ? 'stone' : 'sand';
  }
  if (state.biome === 3) {
    if (depth > scaledDepthPx(420) && hash(x * 3, y * 5, rng.seed) > 0.93 && (x + y) % 4 !== 0) return 'anchorstone';
    return depth > scaledDepthPx(280) || hash(y, x, rng.seed) > 0.58 ? 'stone' : 'sand';
  }
  if (state.biome === 2) {
    return depth > scaledDepthPx(360) || hash(y, x, rng.seed) > 0.66 ? 'stone' : 'sand';
  }
  return depth > scaledDepthPx(520) || hash(y, x, rng.seed) > 0.74 ? 'stone' : 'sand';
}

export function veinRuleAt(x: number, y: number, rules: VeinRule[]) {
  const depth = y * TILE;
  const depthMeters = Math.max(0, (y - 4) * 6);
  const darkness = darknessForDepth(depthMeters, state.biome);
  for (const rule of rules) {
    if (depth < scaledDepthPx(rule.minDepth)) continue;
    if (rule.minDarkness !== undefined && darkness < rule.minDarkness) continue;
    const r = hash(x * rule.salt + 11, y * (rule.salt + 6) + 17, rng.seed);
    if (r > 1 - rule.chance) return rule;
  }
  return null;
}

export function veinRulesForBiome(): VeinRule[] {
  if (state.biome === 4) {
    return [
      { tile: 'ruinCore', minDepth: 1560, minDarkness: 0.88, chance: 0.0009, minSize: 1, maxSize: 2, salt: 97 },
      { tile: 'abyssalCrown', minDepth: 1180, minDarkness: 0.82, chance: 0.0035, minSize: 2, maxSize: 4, salt: 89 },
      { tile: 'sunstone', minDepth: 960, minDarkness: 0.78, chance: 0.007, minSize: 3, maxSize: 6, salt: 83 },
      { tile: 'alienAlloy', minDepth: 540, minDarkness: 0.62, chance: 0.010, minSize: 4, maxSize: 9, salt: 79 },
      { tile: 'cobalt', minDepth: 340, chance: 0.009, minSize: 4, maxSize: 8, salt: 73 },
    ];
  }
  if (state.biome === 3) {
    return [
      { tile: 'abyssalCrown', minDepth: 1440, minDarkness: 0.84, chance: 0.0012, minSize: 1, maxSize: 2, salt: 71 },
      { tile: 'relic', minDepth: 1120, chance: 0.003, minSize: 2, maxSize: 4, salt: 67 },
      { tile: 'sunstone', minDepth: 1260, chance: 0.006, minSize: 3, maxSize: 6, salt: 61 },
      { tile: 'cobalt', minDepth: 760, chance: 0.009, minSize: 4, maxSize: 8, salt: 59 },
      { tile: 'ruby', minDepth: 300, chance: 0.008, minSize: 5, maxSize: 9, salt: 53 },
    ];
  }
  if (state.biome === 2) {
    return [
      { tile: 'precursorEngine', minDepth: 1320, minDarkness: 0.78, chance: 0.0009, minSize: 1, maxSize: 2, salt: 47 },
      { tile: 'relic', minDepth: 1040, chance: 0.0028, minSize: 2, maxSize: 4, salt: 43 },
      { tile: 'sunstone', minDepth: 1220, chance: 0.004, minSize: 3, maxSize: 5, salt: 41 },
      { tile: 'cobalt', minDepth: 620, chance: 0.008, minSize: 4, maxSize: 8, salt: 37 },
      { tile: 'quartz', minDepth: 260, chance: 0.009, minSize: 5, maxSize: 10, salt: 31 },
    ];
  }
  return [
    { tile: 'drownedIdol', minDepth: 1420, minDarkness: 0.72, chance: 0.0006, minSize: 1, maxSize: 2, salt: 29 },
    { tile: 'relic', minDepth: 1240, chance: 0.0022, minSize: 2, maxSize: 4, salt: 23 },
    { tile: 'ruby', minDepth: 900, chance: 0.0045, minSize: 3, maxSize: 6, salt: 19 },
    { tile: 'quartz', minDepth: 460, chance: 0.0065, minSize: 4, maxSize: 8, salt: 17 },
    { tile: 'copper', minDepth: 180, chance: 0.008, minSize: 5, maxSize: 10, salt: 13 },
  ];
}

export function hash(x: number, y: number, s: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 0.013) * 43758.5453123;
  return n - Math.floor(n);
}

export function scaledEntity(value: number) {
  return value * ENTITY_SCALE;
}

export function pointInRoom(x: number, y: number, room: SpecialRoom, scale = 1) {
  const center = specialRoomEffectCenter(room);
  const nx = (x - center.x) / (room.rx * scale);
  const ny = (y - center.y) / (room.ry * scale);
  return nx * nx + ny * ny <= 1;
}

export function specialRoomEffectCenter(room: SpecialRoom) {
  return {
    x: room.effectX ?? room.x,
    y: room.effectY ?? room.y,
  };
}

export function venomousFish(fish: Fish) {
  return fish.species === 'Blue-ring Octopus';
}

export function clearVenom() {
  state.venom.active = false;
  state.venom.source = '';
  state.venom.tick = 0;
}

export function clearBleed() {
  state.bleed.active = false;
  state.bleed.source = '';
  state.bleed.duration = 0;
  state.bleed.stacks = 0;
  state.bleed.recentBites = 0;
  state.bleed.recentTimer = 0;
}

export function shopItem(id: ShopItem['id']) {
  return shopItems.find((item) => item.id === id)!;
}

export function activeQuest() {
  return state.questBoard.find((quest) => quest.id === state.activeQuestId && quest.accepted && !quest.claimed) ?? null;
}

export function questProgressSource(quest: Quest) {
  if (quest.kind === 'depth' || quest.kind === 'gulperSurvey') return state.maxDepth;
  if (quest.kind === 'scan') return state.scannedSpecies.size;
  if (quest.kind === 'ore') return state.oreSoldCredits;
  if (quest.kind === 'nest') return quest.progress;
  if (quest.kind === 'forwardOutpost') return state.forwardOutpost.active && state.forwardOutpost.biome === 3 ? 1 : 0;
  return 0;
}

export function generateQuestBoard(hasNest: boolean): Quest[] {
  const biome = state.biome;
  const depthTarget = Math.round(Phaser.Math.Linear(360, 1380, biome / 4) + hash(3, biome, rng.seed) * 220);
  const scanTarget = 2 + biome + Math.floor(hash(5, biome, rng.seed) * 3);
  const oreTarget = Math.round((620 + biome * 520 + hash(7, biome, rng.seed) * 380) / 50) * 50;
  const quests: Quest[] = [
    {
      id: `depth-${rng.seed}-${biome}`,
      kind: 'depth',
      title: 'Pressure Line Survey',
      client: 'Barge Cartography',
      text: `Reach ${depthTarget} m and transmit a pressure profile from this trench.`,
      reward: 520 + biome * 420,
      target: depthTarget,
      progress: 0,
      startValue: 0,
      accepted: false,
      completed: false,
      claimed: false,
    },
    {
      id: `scan-${rng.seed}-${biome}`,
      kind: 'scan',
      title: 'Live Catalog Sweep',
      client: 'Marine Biology Desk',
      text: `Scan ${scanTarget} new lifeform${scanTarget === 1 ? '' : 's'} before leaving the claim.`,
      reward: 640 + biome * 460,
      target: scanTarget,
      progress: 0,
      startValue: 0,
      accepted: false,
      completed: false,
      claimed: false,
    },
    {
      id: `ore-${rng.seed}-${biome}`,
      kind: 'ore',
      title: 'Ore Purchase Order',
      client: 'Geology Buyer',
      text: `Sell ${oreTarget.toLocaleString()} credits of recovered ore to satisfy an urgent assay order.`,
      reward: 780 + biome * 520,
      target: oreTarget,
      progress: 0,
      startValue: 0,
      accepted: false,
      completed: false,
      claimed: false,
    },
  ];
  if (hasNest && hash(11, biome, rng.seed) < 0.46 + biome * 0.08) {
    quests.push({
      id: `nest-${rng.seed}-${biome}`,
      kind: 'nest',
      title: 'Rare: Nest Extermination',
      client: 'Corporate Hazard Office',
      text: 'Accept a nest locator, find the nearest predator nest on sonar, and destroy or burn out every egg and larva.',
      reward: 2400 + biome * 1350,
      target: 1,
      progress: 0,
      startValue: 0,
      accepted: false,
      completed: false,
      claimed: false,
      rare: true,
    });
  }
  if (biome === 3) {
    quests.push({
      id: `forward-outpost-${rng.seed}-${biome}`,
      kind: 'forwardOutpost',
      title: 'Rare: Forward Air Pocket',
      client: 'Barge Expedition Office',
      text: 'Establish one prototype forward outpost in Midnight Trench: depth 900 m or deeper, beside solid terrain, and close to non-hostile oxygen flora.',
      reward: 4800,
      target: 1,
      progress: 0,
      startValue: 0,
      accepted: false,
      completed: false,
      claimed: false,
      rare: true,
    });
    quests.push({
      id: `gulper-wake-${rng.seed}-${biome}`,
      kind: 'gulperSurvey',
      title: 'Rare: Gulper Wake Survey',
      client: 'Barge Cartography',
      text: 'Track the wake beacon into Midnight Trench, confirm the gulper pressure lane at 1,350 m, and return with a trace.',
      reward: 6000,
      target: 1350,
      progress: 0,
      startValue: 0,
      accepted: false,
      completed: false,
      claimed: false,
      rare: true,
      grantsMarlinVoucher: true,
    });
  }
  return quests.sort((a, b) => hash(a.id.length, b.id.length, rng.seed) - 0.5);
}

export function createConsumableItem(item: ShopItem): CargoItem {
  return {
    id: item.id,
    name: item.name,
    value: 0,
    color: item.color,
    kind: item.kind ?? 'consumable',
    icon: item.icon,
  };
}

export function cargoKindForTile(tile: Tile): InventoryItemKind {
  const value = tiles[tile].value;
  if (value <= 0) return 'rubble';
  if (value >= 1000 || tile === 'relic' || tile === 'drownedIdol' || tile === 'precursorEngine' || tile === 'abyssalCrown' || tile === 'ruinCore') {
    return 'artifact';
  }
  return 'ore';
}

export function cargoIconForTile(tile: Tile) {
  if (tile === 'copper' || tile === 'sunstone') return 'item-icon-copper';
  if (tile === 'quartz') return 'item-icon-quartz';
  if (tile === 'ruby') return 'item-icon-ruby';
  if (tile === 'cobalt') return 'item-icon-cobalt';
  if (tile === 'relic') return 'item-icon-relic';
  if (tile === 'drownedIdol' || tile === 'abyssalCrown' || tile === 'precursorEngine') return 'item-icon-idol';
  if (tile === 'alienAlloy') return 'item-icon-alloy';
  if (tile === 'ruinCore') return 'item-icon-core';
  return 'item-icon-stone';
}

export function cargoSaleValue() {
  return state.cargo.reduce((sum, item) => sum + Math.max(0, item.value), 0);
}

export function clampSelectedCargoIndex() {
  const capacity = cargoCapacity();
  if (capacity <= 0) {
    state.selectedCargoIndex = 0;
    return;
  }
  state.selectedCargoIndex = Phaser.Math.Clamp(Math.floor(state.selectedCargoIndex) || 0, 0, capacity - 1);
}

// Fauna that still ship as loose per-frame PNGs. All current fauna have been
// migrated to Asset Forge spritesheets (see SPRITESHEET_BASES), so this is
// empty; add a base here only when introducing fauna whose frames aren't packed
// yet — fishFrameCount falls back to this and loadGeneratedAssets loads the
// loose `<base>-<i>.png` frames for anything listed.
export const faunaFrameCounts: Record<string, number> = {};

export interface SpriteManifest {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  anchor: { x: number; y: number };
  animations: Record<string, { frames: number[]; frameRate: number; loop: boolean }>;
}

// Populated at load time from Asset Forge `*.frames.json` manifests.
export const spriteManifests: Record<string, SpriteManifest> = {};

const SPRITESHEET_BASES = [
  // Generic depth-band fish
  'fish-shallow-neutral',
  'fish-shallow-predator',
  'fish-mid-neutral',
  'fish-mid-predator',
  'fish-abyss-predator',
  // Shallows fauna
  'fauna-shallow-lantern-fry',
  'fauna-shallow-snap-shrimp',
  'fauna-shallow-glass-ray',
  'fauna-shallow-comb-jelly',
  'fauna-shallow-squid',
  'fauna-shallow-nautilus',
  'fauna-shallow-jellyfish',
  'fauna-shallow-mantis-shrimp',
  'fauna-shallow-blue-ring-octopus',
  'fauna-shallow-octopus',
  // Deep fauna
  'fauna-deep-ash-minnow',
  'fauna-deep-deep-shrimp',
  'fauna-deep-hatchetfish',
  'fauna-deep-barreleye',
  'fauna-deep-glass-squid',
  'fauna-deep-vampire-squid',
  'fauna-deep-lanternfish',
  'fauna-deep-gulper-eel',
  'fauna-deep-tripodfish',
  'fauna-deep-sea-spider',
  'fauna-deep-deep-jelly',
  // Abyss fauna
  'fauna-abyss-mirror-fry',
  'fauna-abyss-hadal-shrimp',
  'fauna-abyss-abyss-jelly',
  'fauna-abyss-bigfin-squid',
  'fauna-abyss-viperfish',
  'fauna-abyss-hatchet-school',
  'fauna-abyss-lantern-swarm',
  'fauna-abyss-goblin-shark',
  'fauna-abyss-frilled-shark',
  'fauna-abyss-black-swallower',
  'fauna-abyss-static-fry',
  'fauna-abyss-vampire-squid',
  'fauna-abyss-microfish',
  'fauna-abyss-anglerfish',
  'fauna-abyss-snipe-eel',
  'fauna-abyss-medusa',
];

export function loadGeneratedAssets(scene: Phaser.Scene) {
  const assetPath = (name: string) => `/assets/generated/${name}.png`;
  const audioPath = (name: string) => `/assets/audio/${name}`;
  loadArticulatedAssets(scene);
  loadArticulatedDiverAssets(scene);
  for (const [animation, frameCount] of Object.entries(diverFrameCounts)) {
    for (let i = 0; i < frameCount; i += 1) {
      scene.load.image(`diver-${animation}-${i}`, assetPath(`diver-${animation}-${i}`));
    }
  }
  for (let i = 0; i < 4; i += 1) scene.load.image(`sub-cutter-beam-${i}`, assetPath(`sub-cutter-beam-${i}`));
  // Asset Forge spritesheets: load the manifest, then the packed sheet using
  // the frame size it declares (Phaser processes the chained load in the same run).
  for (const base of SPRITESHEET_BASES) {
    const manifestKey = `${base}__manifest`;
    scene.load.json(manifestKey, `/assets/generated/${base}.frames.json`);
    scene.load.once(`filecomplete-json-${manifestKey}`, () => {
      const manifest = scene.cache.json.get(manifestKey) as SpriteManifest;
      spriteManifests[base] = manifest;
      scene.load.spritesheet(base, assetPath(base), {
        frameWidth: manifest.frameWidth,
        frameHeight: manifest.frameHeight,
      });
    });
  }
  for (const [base, frameCount] of Object.entries(faunaFrameCounts)) {
    for (let i = 0; i < frameCount; i += 1) scene.load.image(`${base}-${i}`, assetPath(`${base}-${i}`));
  }
  scene.load.image('flora-shallow-kelp', assetPath('flora-shallow-kelp'));
  scene.load.image('flora-shallow-anemone', assetPath('flora-shallow-anemone'));
  scene.load.image('flora-deep-tube', assetPath('flora-deep-tube'));
  scene.load.image('flora-deep-coral', assetPath('flora-deep-coral'));
  scene.load.image('flora-oxygen-kelp', assetPath('flora-oxygen-kelp'));
  scene.load.image('flora-oxygen-bulb', assetPath('flora-oxygen-bulb'));
  scene.load.image('flora-biolume-tall', assetPath('flora-biolume-tall'));
  scene.load.image('biolume-rock-0', assetPath('biolume-rock-0'));
  scene.load.image('biolume-rock-1', assetPath('biolume-rock-1'));
  scene.load.image('biolume-crystal', assetPath('biolume-crystal'));
  for (let i = 0; i < 4; i += 1) scene.load.image(`nest-egg-${i}`, assetPath(`nest-egg-${i}`));
  scene.load.image('nest-egg-hatching', assetPath('nest-egg-hatching'));
  scene.load.image('nest-egg-hatched', assetPath('nest-egg-hatched'));
  for (let i = 0; i < 3; i += 1) scene.load.image(`nest-larva-${i}`, assetPath(`nest-larva-${i}`));
  scene.load.image('barge-side', assetPath('barge-side'));
  scene.load.image('barge-platform', assetPath('barge-platform'));
  scene.load.image('vent-base', assetPath('vent-base'));
  for (let i = 0; i < 4; i += 1) scene.load.image(`vent-steam-${i}`, assetPath(`vent-steam-${i}`));
  for (const key of parallaxTextureKeys()) scene.load.image(key, assetPath(key));
  for (const asset of painterlyBackgroundManifest.filter((entry) => entry.availableInRuntime)) {
    scene.load.image(asset.textureKey, asset.path);
  }
  for (const key of uiTextureKeys()) scene.load.image(key, assetPath(key));
  for (const key of environmentTextureKeys()) scene.load.image(key, assetPath(key));
  for (const key of actualGptOreTextureKeys()) scene.load.image(key, assetPath(key));
  for (const key of terrainTextureKeys()) {
    scene.load.image(key, assetPath(key));
  }
  scene.load.audio(audioKeys.menu, audioPath('menuloop.mp3'));
  scene.load.audio(audioKeys.ambient, audioPath('ambienceloop.mp3'));
  scene.load.audio(audioKeys.mining, audioPath('mining.mp3'));
  scene.load.audio(audioKeys.oxygen, audioPath('outofoxygen.mp3'));
  scene.load.audio(audioKeys.sonar, audioPath('sonarping.mp3'));
  scene.load.audio('audio-fish-bite-weak', audioPath('fishbite1.mp3'));
  scene.load.audio('audio-fish-bite-strong', audioPath('fishbite2.mp3'));
  scene.load.audio('audio-fish-bite-heavy', audioPath('fishbite3.mp3'));
  scene.load.audio('audio-whale', audioPath('whale.mp3'));
  scene.load.audio('audio-crab-growl', audioPath('crabmonstergrowl.mp3'));
  scene.load.audio('audio-alien-growl', audioPath('aliengrowl.mp3'));
  scene.load.audio('audio-water', audioPath('mavopix-underwater-159894.mp3'));
  scene.load.audio('audio-cavern', audioPath('mavopix-underwater-cavern-159985.mp3'));
}

export function parallaxTextureKeys() {
  return [
    'parallax-shallow-0',
    'parallax-shallow-1',
    'parallax-shallow-2',
    'parallax-shallow-3',
    'parallax-brine-0',
    'parallax-brine-1',
    'parallax-brine-2',
    'parallax-brine-3',
    'parallax-deep-0',
    'parallax-deep-1',
    'parallax-deep-2',
    'parallax-deep-3',
  ];
}

export interface ParallaxLayerProfile {
  texturePrefix: string;
  fallbackPrefix: string;
  repeatMode: EnvironmentBackgroundRepeatMode;
  horizontalSpeed: number;
  verticalSpeed: number;
  phaseX: number;
  phaseY: number;
  alpha: number;
  tint: number;
  scale: number;
  painterlyAssetId?: string;
  painterlyAssetStatus?: 'available' | 'expected' | 'fallback';
}

export interface ParallaxProfile {
  id: string;
  biome: Biome;
  depthBand: 'upper' | 'mid' | 'lower';
  overlay: {
    alpha: number;
    color: number;
    density: number;
    drift: number;
  };
  layers: ParallaxLayerProfile[];
}

export interface EnvironmentBandProfile {
  id: EnvironmentDepthBand;
  startDepth: number;
  endDepth: number;
  blendPx: number;
  topColor: number;
  bottomColor: number;
  hazeColor: number;
  hazeAlpha: number;
  sedimentAlpha: number;
  causticAlpha: number;
  silhouetteAlpha: number;
  anchorDensity: number;
}

export type WaterColumnLayerKind = 'haze' | 'sediment' | 'plankton' | 'caustic';
export type WaterColumnBlendModeName = 'normal' | 'add';

export interface WaterColumnLayerProfile {
  id: string;
  kind: WaterColumnLayerKind;
  assetId: string;
  textureKey: string;
  repeatMode: EnvironmentBackgroundRepeatMode;
  alpha: number;
  color: number;
  blendMode: WaterColumnBlendModeName;
  scale: number;
  tileScaleX: number;
  tileScaleY: number;
  parallaxX: number;
  parallaxY: number;
  driftX: number;
  driftY: number;
  phaseX: number;
  phaseY: number;
  depthGate: number;
  sourceAlpha: number;
  bandScale: number;
  biomeScale: number;
}

export interface WaterColumnPostDarknessVeilProfile {
  enabled: boolean;
  layers: string[];
  alpha: number;
  particleAlpha: number;
  color: number;
  blendMode: WaterColumnBlendModeName;
  driftX: number;
  driftY: number;
  guardRadius: number;
  bandCount: number;
  particleCount: number;
}

export interface EnvironmentAnchorSilhouette {
  id: string;
  kind: 'reef' | 'kelp' | 'wreck-rib' | 'vent-stone' | 'cable-chain' | 'brine-curtain';
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
  color: number;
  depthBand: EnvironmentDepthBand;
  parallaxFactor: number;
  textureKey?: string;
  assetId?: string;
  assetStatus?: 'available';
  textureCrop?: [number, number, number, number];
}

export interface PainterlyBackgroundManifestEntry {
  id: string;
  label: string;
  textureKey: string;
  path: string;
  sourcePath: string;
  sourceStatus: string;
  role: EnvironmentPainterlyBackgroundRole;
  band: EnvironmentDepthBand | 'all';
  repeatMode: EnvironmentBackgroundRepeatMode;
  safeOpacity: number;
  scaleRange: [number, number];
  parallaxRange: [number, number];
  readabilityRisk: EnvironmentReadabilityRisk;
  trimCrop?: [number, number, number, number];
  availableInRuntime: boolean;
  fallbackTexturePrefix?: string;
  notes: string;
}

interface GeneratedPainterlyBackgroundAsset {
  id: string;
  role: EnvironmentPainterlyBackgroundRole;
  band?: EnvironmentDepthBand;
  label?: string;
  repeatMode: EnvironmentBackgroundRepeatMode;
  path: string;
  status: string;
  safeOpacity: number;
  scaleRange: [number, number];
  parallaxRange: [number, number];
  readabilityRisk: EnvironmentReadabilityRisk;
  trimCrop?: [number, number, number, number];
}

const phase3LandmarkBands: Record<string, EnvironmentDepthBand> = {
  'kelp-curtain-cluster': 'upper',
  'reef-arch-distance': 'upper',
  'cable-buoy-chain': 'upper',
  'drowned-mine-structure': 'mid',
  'vent-brine-curtain': 'transitionDeep',
  'biome-brine-vent-sulfide-shelf': 'mid',
  'biome-midnight-black-coral-ribs': 'lower',
  'biome-ruins-vault-causeway-lattice': 'lower',
};

const phase4SharedLandmarkBands: Partial<Record<EnvironmentDepthBand, string[]>> = {
  lower: ['drowned-mine-structure', 'cable-buoy-chain', 'vent-brine-curtain'],
  transitionDeep: ['vent-brine-curtain', 'drowned-mine-structure'],
};

const normalBiome1OrganicBands: EnvironmentDepthBand[] = ['upper', 'mid', 'lower', 'transitionDeep'];
const normalBiome1SignatureLandmarkId = 'biome-shallows-living-coral-terrace';
const normalBiome1OrganicLandmarkId = normalBiome1SignatureLandmarkId;
const normalBiome1OrganicBandPlateId = 'biome1-organic-shallow-reef-band';

const biomeLandmarkPools: Record<Biome, Partial<Record<EnvironmentDepthBand, string[]>>> = {
  1: {
    surface: [
      normalBiome1OrganicLandmarkId,
    ],
    upper: [
      normalBiome1OrganicLandmarkId,
    ],
    mid: [
      normalBiome1OrganicLandmarkId,
    ],
    lower: [
      normalBiome1OrganicLandmarkId,
    ],
    transitionDeep: [
      normalBiome1OrganicLandmarkId,
    ],
  },
  2: {
    surface: [],
    upper: [
      'biome-brine-vent-sulfide-shelf',
    ],
    mid: [
      'biome-brine-vent-sulfide-shelf',
      'biome-brine-vent-sulfide-shelf',
    ],
    lower: [
      'biome-brine-vent-sulfide-shelf',
    ],
    transitionDeep: [
      'phase11-transition-near-pipe-cable-cathedral',
      'phase11-transition-mid-collapsed-gantry-brine-reef',
      'phase8-transition-brine-curtain-ruin',
      'phase9-transition-organic-vent-garden',
    ],
  },
  3: {
    surface: [],
    upper: [],
    mid: [],
    lower: [
      'biome-midnight-black-coral-ribs',
    ],
    transitionDeep: [
      'phase11-transition-far-drowned-signal-station',
      'phase8-transition-rib-field',
      'phase9-transition-organic-rib-reef',
      'phase5-transition-pressure-ribs-wide',
    ],
  },
  4: {
    surface: [
      'biome-ruins-vault-causeway-lattice',
    ],
    upper: [
      'biome-ruins-vault-causeway-lattice',
    ],
    mid: [
      'biome-ruins-vault-causeway-lattice',
    ],
    lower: [
      'biome-ruins-vault-causeway-lattice',
      'biome-ruins-vault-causeway-lattice',
    ],
    transitionDeep: [
      'biome-ruins-vault-causeway-lattice',
      'phase10-transition-drowned-signal-station',
      'phase8-transition-collapsed-sub-elevator',
    ],
  },
};

function runtimeAssetPath(sourcePath: string) {
  return sourcePath.startsWith('public/') ? `/${sourcePath.slice('public/'.length)}` : sourcePath;
}

function textureKeyFromPath(sourcePath: string) {
  return sourcePath.split('/').pop()?.replace(/\.png$/i, '') ?? sourcePath;
}

function generatedAssetBand(asset: GeneratedPainterlyBackgroundAsset): EnvironmentDepthBand | 'all' {
  if (asset.band) return asset.band;
  if (asset.role === 'landmark') return phase3LandmarkBands[asset.id] ?? 'mid';
  return 'all';
}

function generatedAssetFallbackPrefix(asset: GeneratedPainterlyBackgroundAsset) {
  const band = generatedAssetBand(asset);
  return band === 'lower' || band === 'transitionDeep' ? 'parallax-deep' : 'parallax-shallow';
}

function generatedAssetNotes(asset: GeneratedPainterlyBackgroundAsset) {
  if (asset.role === 'bandPlate') return 'Generated Phase 3 band plate from the painterly source atlas; rendered with bandClampY over the Phase 2 compositor.';
  if (asset.role === 'landmark') return 'Generated Phase 3 chroma-key cutout; rendered only as sparse anchored background scenery.';
  return 'Generated Phase 3 atmospheric mask; rendered as a low-alpha world-space water-column layer when the active depth band allows it.';
}

export const painterlyBackgroundManifest: PainterlyBackgroundManifestEntry[] = (
  phase3BackgroundManifestFile.assets as unknown as GeneratedPainterlyBackgroundAsset[]
).map((asset) => ({
  id: asset.id,
  label: asset.label ?? asset.id,
  textureKey: textureKeyFromPath(asset.path),
  path: runtimeAssetPath(asset.path),
  sourcePath: asset.path,
  sourceStatus: asset.status,
  role: asset.role,
  band: generatedAssetBand(asset),
  repeatMode: asset.repeatMode,
  safeOpacity: asset.safeOpacity,
  scaleRange: asset.scaleRange,
  parallaxRange: asset.parallaxRange,
  readabilityRisk: asset.readabilityRisk,
  trimCrop: asset.trimCrop,
  availableInRuntime: asset.status === 'ready',
  fallbackTexturePrefix: generatedAssetFallbackPrefix(asset),
  notes: generatedAssetNotes(asset),
}));

function painterlyAssetsFor(role: EnvironmentPainterlyBackgroundRole, band: EnvironmentDepthBand | 'all') {
  return painterlyBackgroundManifest.filter((asset) => (
    asset.role === role
    && (asset.band === band || asset.band === 'all' || band === 'all')
  ));
}

function painterlyLandmarksForBand(band: EnvironmentDepthBand) {
  const direct = painterlyAssetsFor('landmark', band);
  const sharedIds = phase4SharedLandmarkBands[band] ?? [];
  if (!sharedIds.length) return direct;
  const shared = painterlyBackgroundManifest.filter((asset) => (
    asset.role === 'landmark'
    && sharedIds.includes(asset.id)
    && !direct.some((directAsset) => directAsset.id === asset.id)
  ));
  return [...direct, ...shared];
}

function genericPainterlyLandmarksForBand(band: EnvironmentDepthBand) {
  return painterlyLandmarksForBand(band).filter((asset) => !asset.id.startsWith('biome-'));
}

function painterlyLandmarksById(ids: string[]) {
  return ids
    .map((id) => painterlyBackgroundManifest.find((asset) => asset.id === id && asset.role === 'landmark' && asset.availableInRuntime))
    .filter((asset): asset is PainterlyBackgroundManifestEntry => Boolean(asset));
}

function biomeLandmarksFor(biome: Biome, band: EnvironmentDepthBand) {
  return painterlyLandmarksById(biomeLandmarkPools[biome]?.[band] ?? []);
}

function isAuthoredRuntimeLandmark(asset: PainterlyBackgroundManifestEntry) {
  return asset.id.startsWith('biome-') || asset.id.startsWith('phase11-transition-');
}

function pickWeightedPainterlyLandmark(assets: PainterlyBackgroundManifestEntry[], slot: number, band: EnvironmentBandProfile, seedOffset: number) {
  if (!assets.length) return null;
  return assets[Math.floor(hash(slot + 3, band.startDepth + 11, rng.seed + seedOffset) * assets.length)];
}

function normalBiome1OrganicLandmarksFor(biome: Biome, band: EnvironmentDepthBand) {
  if (biome !== 1 || !normalBiome1OrganicBands.includes(band)) return [];
  return [normalBiome1OrganicLandmarkId]
    .map((id) => painterlyBackgroundManifest.find((asset) => asset.id === id && asset.role === 'landmark' && asset.availableInRuntime))
    .filter((asset): asset is PainterlyBackgroundManifestEntry => Boolean(asset));
}

function normalBiome1OrganicBandPlateFor(biome: Biome, band: EnvironmentDepthBand): PainterlyBackgroundManifestEntry | null {
  if (biome !== 1 || band === 'surface' || !normalBiome1OrganicBands.includes(band)) return null;
  const organicBand = painterlyBackgroundManifest.find((asset) => (
    asset.id === normalBiome1OrganicBandPlateId
    && asset.role === 'bandPlate'
    && asset.availableInRuntime
  ));
  if (!organicBand) return null;
  const safeOpacity = band === 'upper' ? 0.42 : band === 'mid' ? 0.34 : band === 'lower' ? 0.28 : 0.22;
  return {
    ...organicBand,
    id: `biome1-organic-${band}-reef-band`,
    band,
    safeOpacity,
    notes: `${organicBand.notes} Reused at tuned opacity for B1 ${band} without Phase 11 industrial silhouettes.`,
  };
}

function authoredBiomeLandmarkAlpha(biome: Biome, band: EnvironmentDepthBand) {
  if (band === 'surface') return biome === 1 ? 0.34 : biome === 3 ? 0.98 : 1;
  if (biome === 2) return 0.74;
  if (biome === 3) return 0.34;
  if (biome === 4) return 0.74;
  return 1;
}

function authoredBiomeLandmarkHeightMultiplier(biome: Biome, band: EnvironmentDepthBand) {
  if (band === 'surface') {
    return biome === 1 ? 0.44 : biome === 2 ? 1.62 : biome === 3 ? 1.58 : biome === 4 ? 1.64 : 1.48;
  }
  return biome === 1 ? 0.92 : biome === 2 ? 1 : biome === 3 ? 1.24 : biome === 4 ? 1.14 : 1.2;
}

function authoredBiomeLandmarkWidthMultiplier(biome: Biome, band: EnvironmentDepthBand) {
  if (band === 'surface') {
    return biome === 1 ? 2.95 : biome === 2 ? 1.98 : biome === 3 ? 1.86 : biome === 4 ? 2.42 : 2.4;
  }
  return biome === 1 ? 1.48 : biome === 2 ? 3.85 : biome === 3 ? 1.48 : biome === 4 ? 2.05 : 2.05;
}

function mergePainterlyAssets(...groups: PainterlyBackgroundManifestEntry[][]) {
  const merged: PainterlyBackgroundManifestEntry[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const asset of group) {
      if (seen.has(asset.id)) continue;
      seen.add(asset.id);
      merged.push(asset);
    }
  }
  return merged;
}

function smoothstep(value: number) {
  const t = Phaser.Math.Clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function bandLayerVisibility(activeBand: EnvironmentDepthBand, layerBand: EnvironmentDepthBand) {
  if (activeBand === 'transitionDeep') return layerBand === 'transitionDeep' ? 1 : layerBand === 'lower' ? 0.2 : 0.05;
  if (activeBand === 'lower') return layerBand === 'lower' ? 1 : layerBand === 'transitionDeep' ? 0.16 : layerBand === 'mid' ? 0.18 : 0.06;
  if (activeBand === 'mid') return layerBand === 'mid' ? 1 : layerBand === 'upper' ? 0.22 : layerBand === 'lower' ? 0.2 : 0.08;
  if (activeBand === 'upper') return layerBand === 'upper' ? 1 : layerBand === 'surface' ? 0.35 : layerBand === 'mid' ? 0.18 : 0.06;
  return layerBand === 'surface' ? 1 : layerBand === 'upper' ? 0.2 : 0.05;
}

function painterlyBandPlateFor(band: EnvironmentDepthBand, biome: Biome = state.biome) {
  const normalBiome1OrganicBand = normalBiome1OrganicBandPlateFor(biome, band);
  if (normalBiome1OrganicBand) return normalBiome1OrganicBand;
  const assets = painterlyAssetsFor('bandPlate', band);
  if (band === 'transitionDeep') {
    return assets.find((asset) => asset.availableInRuntime && asset.id === 'phase11-transition-deep-gpt-band')
      ?? assets.find((asset) => asset.availableInRuntime)
      ?? assets[0]
      ?? null;
  }
  return assets[0] ?? null;
}

export interface EnvironmentVisualProfile {
  id: string;
  biome: Biome;
  depthBand: EnvironmentDepthBand;
  activeBand: EnvironmentBandProfile;
  activeBandBlend: {
    from: EnvironmentDepthBand;
    to: EnvironmentDepthBand;
    progress: number;
  };
  bands: EnvironmentBandProfile[];
  cameraClearColor: string;
  background: {
    layers: Array<ParallaxLayerProfile & {
      index: number;
      intendedRepeatMode: EnvironmentBackgroundRepeatMode;
      layerKind: 'scenic' | 'procedural';
      seamless: boolean;
      band: EnvironmentDepthBand | 'all';
    }>;
    worldSpaceNoise: {
      repeatMode: EnvironmentBackgroundRepeatMode;
      cellSize: number;
      alpha: number;
      color: number;
      assets: PainterlyBackgroundManifestEntry[];
      layers: WaterColumnLayerProfile[];
      postDarknessVeil: WaterColumnPostDarknessVeilProfile;
    };
    anchors: {
      repeatMode: EnvironmentBackgroundRepeatMode;
      count: number;
      assets: PainterlyBackgroundManifestEntry[];
    };
    manifest: PainterlyBackgroundManifestEntry[];
  };
  surface: {
    waterlineY: number;
    fadeDistancePx: number;
    skyTopColor: number;
    skyBottomColor: number;
    waterTopColor: number;
    waterBottomColor: number;
    stripeAlphas: [number, number, number];
  };
  overlay: ParallaxProfile['overlay'] & {
    mistStepPx: number;
  };
  darkness: {
    value: number;
    ambientOpacity: number;
    maskOpacity: number;
  };
}

const parallaxBaseProfiles: Record<Biome, Omit<ParallaxProfile, 'biome' | 'depthBand' | 'layers'> & { layers: Omit<ParallaxLayerProfile, 'alpha' | 'tint' | 'scale' | 'repeatMode'>[]; tint: [number, number, number]; alpha: [number, number, number, number] }> = {
  1: {
    id: 'shallow-sunlit',
    overlay: { alpha: 0.13, color: 0xb5fff5, density: 0.78, drift: 14 },
    tint: [0xffffff, 0xcdf7ed, 0x8ed9d4],
    alpha: [0.7, 0.52, 0.34, 0.38],
    layers: [
      { texturePrefix: 'parallax-shallow', fallbackPrefix: 'parallax-shallow', horizontalSpeed: 0.96, verticalSpeed: 0.022, phaseX: 0, phaseY: 0 },
      { texturePrefix: 'parallax-shallow', fallbackPrefix: 'parallax-shallow', horizontalSpeed: 0.64, verticalSpeed: 0.016, phaseX: 173, phaseY: 331 },
      { texturePrefix: 'parallax-shallow', fallbackPrefix: 'parallax-shallow', horizontalSpeed: 0.36, verticalSpeed: 0.011, phaseX: 419, phaseY: 97 },
      { texturePrefix: 'parallax-shallow', fallbackPrefix: 'parallax-shallow', horizontalSpeed: 0.1, verticalSpeed: 0.007, phaseX: 71, phaseY: 619 },
    ],
  },
  2: {
    id: 'brine-cavern',
    overlay: { alpha: 0.16, color: 0x9affd8, density: 0.86, drift: 10 },
    tint: [0xd8fff0, 0x9ecbc0, 0x678f9a],
    alpha: [0.76, 0.6, 0.44, 0.4],
    layers: [
      { texturePrefix: 'parallax-brine', fallbackPrefix: 'parallax-brine', horizontalSpeed: 0.9, verticalSpeed: 0.02, phaseX: 83, phaseY: 227 },
      { texturePrefix: 'parallax-brine', fallbackPrefix: 'parallax-brine', horizontalSpeed: 0.56, verticalSpeed: 0.014, phaseX: 311, phaseY: 43 },
      { texturePrefix: 'parallax-brine', fallbackPrefix: 'parallax-brine', horizontalSpeed: 0.31, verticalSpeed: 0.01, phaseX: 29, phaseY: 503 },
      { texturePrefix: 'parallax-brine', fallbackPrefix: 'parallax-brine', horizontalSpeed: 0.09, verticalSpeed: 0.006, phaseX: 557, phaseY: 149 },
    ],
  },
  3: {
    id: 'abyssal-deep',
    overlay: { alpha: 0.12, color: 0x8bb3ff, density: 0.66, drift: 7 },
    tint: [0xb8c8ff, 0x7b89b5, 0x4c5677],
    alpha: [0.52, 0.43, 0.34, 0.38],
    layers: [
      { texturePrefix: 'parallax-deep', fallbackPrefix: 'parallax-deep', horizontalSpeed: 0.62, verticalSpeed: 0.016, phaseX: 211, phaseY: 367 },
      { texturePrefix: 'parallax-deep', fallbackPrefix: 'parallax-deep', horizontalSpeed: 0.38, verticalSpeed: 0.011, phaseX: 467, phaseY: 53 },
      { texturePrefix: 'parallax-deep', fallbackPrefix: 'parallax-deep', horizontalSpeed: 0.2, verticalSpeed: 0.007, phaseX: 101, phaseY: 601 },
      { texturePrefix: 'parallax-deep', fallbackPrefix: 'parallax-deep', horizontalSpeed: 0.07, verticalSpeed: 0.004, phaseX: 653, phaseY: 193 },
    ],
  },
  4: {
    id: 'cold-ruin-trench',
    overlay: { alpha: 0.14, color: 0xbfd7ff, density: 0.58, drift: 5 },
    tint: [0xcedcff, 0x8998b6, 0x556070],
    alpha: [0.44, 0.38, 0.31, 0.36],
    layers: [
      { texturePrefix: 'parallax-deep', fallbackPrefix: 'parallax-deep', horizontalSpeed: 0.52, verticalSpeed: 0.014, phaseX: 359, phaseY: 127 },
      { texturePrefix: 'parallax-deep', fallbackPrefix: 'parallax-deep', horizontalSpeed: 0.3, verticalSpeed: 0.009, phaseX: 41, phaseY: 431 },
      { texturePrefix: 'parallax-deep', fallbackPrefix: 'parallax-deep', horizontalSpeed: 0.15, verticalSpeed: 0.006, phaseX: 587, phaseY: 229 },
      { texturePrefix: 'parallax-deep', fallbackPrefix: 'parallax-deep', horizontalSpeed: 0.05, verticalSpeed: 0.003, phaseX: 137, phaseY: 701 },
    ],
  },
};

const shallowsBands: EnvironmentBandProfile[] = [
  {
    id: 'surface',
    startDepth: 0,
    endDepth: 140,
    blendPx: 190,
    topColor: 0x2f93a4,
    bottomColor: 0x0d6071,
    hazeColor: 0xbffbf0,
    hazeAlpha: 0.045,
    sedimentAlpha: 0.018,
    causticAlpha: 0.115,
    silhouetteAlpha: 0.035,
    anchorDensity: 0.35,
  },
  {
    id: 'upper',
    startDepth: 90,
    endDepth: 520,
    blendPx: 220,
    topColor: 0x0c7180,
    bottomColor: 0x0b4b62,
    hazeColor: 0x9deee4,
    hazeAlpha: 0.055,
    sedimentAlpha: 0.03,
    causticAlpha: 0.075,
    silhouetteAlpha: 0.06,
    anchorDensity: 0.56,
  },
  {
    id: 'mid',
    startDepth: 430,
    endDepth: 980,
    blendPx: 250,
    topColor: 0x0a465f,
    bottomColor: 0x092f4b,
    hazeColor: 0x83cfd2,
    hazeAlpha: 0.07,
    sedimentAlpha: 0.045,
    causticAlpha: 0.038,
    silhouetteAlpha: 0.075,
    anchorDensity: 0.68,
  },
  {
    id: 'lower',
    startDepth: 880,
    endDepth: 1380,
    blendPx: 270,
    topColor: 0x082d49,
    bottomColor: 0x061d36,
    hazeColor: 0x668ea8,
    hazeAlpha: 0.085,
    sedimentAlpha: 0.055,
    causticAlpha: 0.015,
    silhouetteAlpha: 0.078,
    anchorDensity: 0.76,
  },
  {
    id: 'transitionDeep',
    startDepth: 1260,
    endDepth: 1720,
    blendPx: 300,
    topColor: 0x1e5272,
    bottomColor: 0x13314e,
    hazeColor: 0xa8cfe2,
    hazeAlpha: 0.026,
    sedimentAlpha: 0.012,
    causticAlpha: 0.006,
    silhouetteAlpha: 0.165,
    anchorDensity: 0.88,
  },
];

function lerpColor(a: number, b: number, t: number) {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(Phaser.Math.Linear(ar, br, t)) << 16)
    | (Math.round(Phaser.Math.Linear(ag, bg, t)) << 8)
    | Math.round(Phaser.Math.Linear(ab, bb, t))
  );
}

function blendBands(from: EnvironmentBandProfile, to: EnvironmentBandProfile, progress: number): EnvironmentBandProfile {
  const t = Phaser.Math.Clamp(progress, 0, 1);
  return {
    ...to,
    topColor: lerpColor(from.topColor, to.topColor, t),
    bottomColor: lerpColor(from.bottomColor, to.bottomColor, t),
    hazeColor: lerpColor(from.hazeColor, to.hazeColor, t),
    hazeAlpha: Phaser.Math.Linear(from.hazeAlpha, to.hazeAlpha, t),
    sedimentAlpha: Phaser.Math.Linear(from.sedimentAlpha, to.sedimentAlpha, t),
    causticAlpha: Phaser.Math.Linear(from.causticAlpha, to.causticAlpha, t),
    silhouetteAlpha: Phaser.Math.Linear(from.silhouetteAlpha, to.silhouetteAlpha, t),
    anchorDensity: Phaser.Math.Linear(from.anchorDensity, to.anchorDensity, t),
  };
}

function shallowsBandForDepth(depth: number) {
  const index = depth < 120
    ? 0
    : depth < 520
      ? 1
      : depth < 1040
        ? 2
        : depth < 1440
          ? 3
          : 4;
  const active = shallowsBands[index];
  const previous = shallowsBands[Math.max(0, index - 1)];
  const blendPx = Math.max(1, active.blendPx / 6);
  const blendProgress = index === 0 ? 1 : Phaser.Math.Clamp((depth - active.startDepth) / blendPx, 0, 1);
  return {
    band: index === 0 ? active : blendBands(previous, active, blendProgress),
    blend: {
      from: previous.id,
      to: active.id,
      progress: blendProgress,
    },
  };
}

type WaterColumnAlphaMetric = 'hazeAlpha' | 'sedimentAlpha' | 'causticAlpha';

const waterColumnTextureMaskIds = [
  'broad-fog-mottle',
  'sediment-flecks',
  'plankton-speckle',
  'soft-caustic-ribbons',
  'lamp-scattering-bloom',
];

const waterColumnBiomeIntensity: Record<Biome, number> = {
  1: 1.18,
  2: 1.08,
  3: 0.68,
  4: 0.92,
};

const waterColumnBiomeBandScales: Record<Biome, Record<EnvironmentDepthBand, Record<WaterColumnLayerKind, number>>> = {
  1: {
    surface: { haze: 1.08, sediment: 0.78, plankton: 1.08, caustic: 0.58 },
    upper: { haze: 0.96, sediment: 0.86, plankton: 0.92, caustic: 0.42 },
    mid: { haze: 0.42, sediment: 0.62, plankton: 0.34, caustic: 0.08 },
    lower: { haze: 0.32, sediment: 0.48, plankton: 0.24, caustic: 0.02 },
    transitionDeep: { haze: 0.16, sediment: 0.22, plankton: 0.14, caustic: 0 },
  },
  2: {
    surface: { haze: 0.56, sediment: 0.45, plankton: 0.68, caustic: 0.42 },
    upper: { haze: 0.62, sediment: 0.72, plankton: 0.55, caustic: 0.24 },
    mid: { haze: 0.18, sediment: 0.16, plankton: 0.28, caustic: 0 },
    lower: { haze: 0.22, sediment: 0.24, plankton: 0.12, caustic: 0 },
    transitionDeep: { haze: 0.22, sediment: 0.28, plankton: 0.12, caustic: 0 },
  },
  3: {
    surface: { haze: 0.42, sediment: 0.3, plankton: 0.4, caustic: 0.28 },
    upper: { haze: 0.42, sediment: 0.38, plankton: 0.35, caustic: 0.16 },
    mid: { haze: 0.56, sediment: 0.66, plankton: 0.28, caustic: 0.03 },
    lower: { haze: 0.72, sediment: 0.78, plankton: 0.34, caustic: 0 },
    transitionDeep: { haze: 0.34, sediment: 0.42, plankton: 0.24, caustic: 0 },
  },
  4: {
    surface: { haze: 0.38, sediment: 0.24, plankton: 0.3, caustic: 0.18 },
    upper: { haze: 0.4, sediment: 0.32, plankton: 0.28, caustic: 0.1 },
    mid: { haze: 0.5, sediment: 0.52, plankton: 0.22, caustic: 0.02 },
    lower: { haze: 1.24, sediment: 1.08, plankton: 0.42, caustic: 0 },
    transitionDeep: { haze: 0.72, sediment: 0.62, plankton: 0.24, caustic: 0 },
  },
};

const waterColumnBiomeTints: Record<Biome, Record<WaterColumnLayerKind, number>> = {
  1: { haze: 0x9ff6ea, sediment: 0x89d7ca, plankton: 0xd1fff2, caustic: 0xe8fff2 },
  2: { haze: 0x8ed7bd, sediment: 0xb5d6a4, plankton: 0x98f0c7, caustic: 0xc9fff0 },
  3: { haze: 0x6f8dbb, sediment: 0x98acc8, plankton: 0xd9eaff, caustic: 0x9fc4e6 },
  4: { haze: 0xaec7da, sediment: 0xb7c4cf, plankton: 0xd5e9f6, caustic: 0xacc9dd },
};

const waterColumnLayerRecipes: Array<{
  assetId: string;
  kind: WaterColumnLayerKind;
  alphaMetric: WaterColumnAlphaMetric;
  alphaMultiplier: number;
  alphaCap: number;
  blendMode: WaterColumnBlendModeName;
  scaleT: number;
  scaleMultiplier: number;
  tileScaleX: number;
  tileScaleY: number;
  parallaxX: number;
  parallaxY: number;
  driftX: number;
  driftY: number;
  phaseX: number;
  phaseY: number;
}> = [
  {
    assetId: 'broad-fog-mottle',
    kind: 'haze',
    alphaMetric: 'hazeAlpha',
    alphaMultiplier: 0.58,
    alphaCap: 0.032,
    blendMode: 'normal',
    scaleT: 0.94,
    scaleMultiplier: 1.9,
    tileScaleX: 1.34,
    tileScaleY: 0.86,
    parallaxX: 0.18,
    parallaxY: 0.06,
    driftX: 1.9,
    driftY: 0.16,
    phaseX: 97,
    phaseY: 311,
  },
  {
    assetId: 'sediment-flecks',
    kind: 'sediment',
    alphaMetric: 'sedimentAlpha',
    alphaMultiplier: 0.62,
    alphaCap: 0.019,
    blendMode: 'normal',
    scaleT: 0.56,
    scaleMultiplier: 1.25,
    tileScaleX: 1.72,
    tileScaleY: 0.72,
    parallaxX: 0.34,
    parallaxY: 0.15,
    driftX: -3.1,
    driftY: 0.52,
    phaseX: 421,
    phaseY: 73,
  },
  {
    assetId: 'plankton-speckle',
    kind: 'plankton',
    alphaMetric: 'sedimentAlpha',
    alphaMultiplier: 0.56,
    alphaCap: 0.012,
    blendMode: 'add',
    scaleT: 0.34,
    scaleMultiplier: 1.05,
    tileScaleX: 1.18,
    tileScaleY: 1.06,
    parallaxX: 0.48,
    parallaxY: 0.22,
    driftX: 2.25,
    driftY: -0.42,
    phaseX: 733,
    phaseY: 197,
  },
  {
    assetId: 'soft-caustic-ribbons',
    kind: 'caustic',
    alphaMetric: 'causticAlpha',
    alphaMultiplier: 0.28,
    alphaCap: 0.018,
    blendMode: 'add',
    scaleT: 0.8,
    scaleMultiplier: 2.05,
    tileScaleX: 1.36,
    tileScaleY: 0.82,
    parallaxX: 0.25,
    parallaxY: 0.05,
    driftX: 7.4,
    driftY: 0.12,
    phaseX: 251,
    phaseY: 587,
  },
];

function waterColumnTextureMaskAssets() {
  return waterColumnTextureMaskIds
    .map((id) => painterlyBackgroundManifest.find((asset) => asset.id === id && asset.role === 'textureMask' && asset.availableInRuntime))
    .filter((asset): asset is PainterlyBackgroundManifestEntry => Boolean(asset));
}

function waterColumnDepthGate(kind: WaterColumnLayerKind, depth: number, activeBand: EnvironmentDepthBand) {
  if (kind === 'caustic') {
    if (activeBand === 'surface') return Phaser.Math.Clamp((620 - depth) / 620, 0, 1);
    if (activeBand === 'upper') return Phaser.Math.Clamp((560 - depth) / 520, 0, 0.72);
    return 0;
  }
  if (kind === 'plankton' && (activeBand === 'lower' || activeBand === 'transitionDeep')) return 0.72;
  if (activeBand === 'transitionDeep') return 0.62;
  return 1;
}

function waterColumnMaskLayersFor(biome: Biome, depth: number, activeBand: EnvironmentBandProfile): WaterColumnLayerProfile[] {
  const assets = waterColumnTextureMaskAssets();
  const biomeScale = waterColumnBiomeIntensity[biome];
  const bandScales = waterColumnBiomeBandScales[biome][activeBand.id];
  const tintSet = waterColumnBiomeTints[biome];
  return waterColumnLayerRecipes
    .map((recipe) => {
      const asset = assets.find((candidate) => candidate.id === recipe.assetId);
      if (!asset) return null;
      const sourceAlpha = activeBand[recipe.alphaMetric];
      const bandScale = bandScales[recipe.kind];
      const depthGate = waterColumnDepthGate(recipe.kind, depth, activeBand.id);
      const rectangularPaneGuard = biome === 2 && (activeBand.id === 'mid' || activeBand.id === 'lower')
        ? recipe.kind === 'haze' || recipe.kind === 'sediment'
          ? 0.14
          : recipe.kind === 'plankton'
            ? 0.42
            : 0
        : 1;
      const alpha = Phaser.Math.Clamp(
        Math.min(recipe.alphaCap, asset.safeOpacity * 0.28, sourceAlpha * recipe.alphaMultiplier * bandScale * biomeScale * rectangularPaneGuard) * depthGate,
        0,
        recipe.alphaCap,
      );
      const scale = Phaser.Math.Linear(asset.scaleRange[0], asset.scaleRange[1], recipe.scaleT) * recipe.scaleMultiplier;
      return {
        id: `${activeBand.id}-${recipe.assetId}`,
        kind: recipe.kind,
        assetId: asset.id,
        textureKey: asset.textureKey,
        repeatMode: asset.repeatMode,
        alpha,
        color: lerpColor(tintSet[recipe.kind], activeBand.hazeColor, recipe.kind === 'caustic' ? 0.35 : 0.55),
        blendMode: recipe.blendMode,
        scale,
        tileScaleX: recipe.tileScaleX,
        tileScaleY: recipe.tileScaleY,
        parallaxX: Phaser.Math.Linear(asset.parallaxRange[0], asset.parallaxRange[1], recipe.parallaxX),
        parallaxY: recipe.parallaxY,
        driftX: recipe.driftX,
        driftY: recipe.driftY,
        phaseX: recipe.phaseX + biome * 41,
        phaseY: recipe.phaseY + shallowsBands.findIndex((band) => band.id === activeBand.id) * 67,
        depthGate,
        sourceAlpha,
        bandScale,
        biomeScale,
      };
    })
    .filter((layer): layer is WaterColumnLayerProfile => Boolean(layer));
}

function waterColumnPostDarknessVeilFor(biome: Biome, activeBand: EnvironmentBandProfile): WaterColumnPostDarknessVeilProfile {
  if (biome === 2 && activeBand.id === 'mid') {
    return {
      enabled: false,
      layers: ['horizontal-brine-ribbons', 'suspended-sediment-flecks'],
      alpha: 0,
      particleAlpha: 0,
      color: 0x86bca9,
      blendMode: 'normal',
      driftX: -7.4,
      driftY: 0.22,
      guardRadius: 176,
      bandCount: 0,
      particleCount: 0,
    };
  }
  if (biome === 3 && activeBand.id === 'lower') {
    return {
      enabled: true,
      layers: ['midnight-cold-water-haze', 'sparse-marine-snow'],
      alpha: 0.052,
      particleAlpha: 0.014,
      color: 0x6f8dbb,
      blendMode: 'normal',
      driftX: -2.1,
      driftY: 0.1,
      guardRadius: 118,
      bandCount: 10,
      particleCount: 60,
    };
  }
  if (biome === 4 && activeBand.id === 'lower') {
    return {
      enabled: true,
      layers: ['cold-ruin-veil', 'fine-abyssal-particulate'],
      alpha: 0.066,
      particleAlpha: 0.02,
      color: 0xa4bfd0,
      blendMode: 'normal',
      driftX: -2.6,
      driftY: 0.12,
      guardRadius: 130,
      bandCount: 17,
      particleCount: 108,
    };
  }
  return {
    enabled: false,
    layers: [],
    alpha: 0,
    particleAlpha: 0,
    color: activeBand.hazeColor,
    blendMode: 'normal',
    driftX: 0,
    driftY: 0,
    guardRadius: 0,
    bandCount: 0,
    particleCount: 0,
  };
}

export function environmentAnchorSilhouettesFor(
  profile: Pick<EnvironmentVisualProfile, 'activeBand' | 'depthBand'> & { biome?: Biome },
  viewLeft: number,
  viewRight: number,
  viewTop?: number,
  viewBottom?: number,
): EnvironmentAnchorSilhouette[] {
  const band = profile.activeBand;
  const biome = profile.biome ?? state.biome;
  const biomeLandmarks = biomeLandmarksFor(biome, band.id);
  const authoredBiomeLandmarks = biomeLandmarks.filter(isAuthoredRuntimeLandmark);
  if (band.id === 'surface' && authoredBiomeLandmarks.length === 0) return [];
  const normalBiome1OrganicLandmarks = normalBiome1OrganicLandmarksFor(biome, band.id);
  const strictBiome1OrganicLandmark = biome === 1 && band.id !== 'surface' && normalBiome1OrganicLandmarks.length > 0;
  const strictBiomeNormalLandmarks = band.id !== 'transitionDeep' && biome !== 1 && authoredBiomeLandmarks.length > 0;
  const brineBiomeNormalLandmark = biome === 2 && strictBiomeNormalLandmarks;
  const midnightBiomeNormalLandmark = biome === 3 && strictBiomeNormalLandmarks;
  const normalGameplayLandmarkBudget = brineBiomeNormalLandmark || midnightBiomeNormalLandmark || (biome === 4 && strictBiomeNormalLandmarks)
    ? 1
    : Number.POSITIVE_INFINITY;
  const phase7TransitionPlanes = band.id === 'transitionDeep'
    ? painterlyLandmarksForBand(band.id).filter((asset) => asset.availableInRuntime && asset.id.startsWith('phase7-transition-'))
    : [];
  const phase8TransitionLandmarks = band.id === 'transitionDeep'
    ? painterlyLandmarksForBand(band.id).filter((asset) => asset.availableInRuntime && asset.id.startsWith('phase8-transition-'))
    : [];
  const phase9TransitionLandmarks = band.id === 'transitionDeep'
    ? painterlyLandmarksForBand(band.id).filter((asset) => asset.availableInRuntime && asset.id.startsWith('phase9-transition-'))
    : [];
  const phase10TransitionLandmarks = band.id === 'transitionDeep'
    ? painterlyLandmarksForBand(band.id).filter((asset) => asset.availableInRuntime && asset.id.startsWith('phase10-transition-'))
    : [];
  const phase11TransitionLandmarks = band.id === 'transitionDeep' && biome !== 1
    ? painterlyLandmarksForBand(band.id).filter((asset) => asset.availableInRuntime && asset.id.startsWith('phase11-transition-'))
    : [];
  const spacing = strictBiome1OrganicLandmark
    ? 980
    : strictBiomeNormalLandmarks
    ? (biome === 2 ? 2600 : biome === 3 ? 940 : biome === 4 ? 820 : 1120)
    : band.id === 'lower' ? 360 : band.id === 'transitionDeep' ? (phase11TransitionLandmarks.length ? 620 : phase10TransitionLandmarks.length ? 1240 : 680) : 560;
  const startSlot = Math.floor(viewLeft / spacing) - 1;
  const endSlot = Math.ceil(viewRight / spacing) + 1;
  const anchors: EnvironmentAnchorSilhouette[] = [];
  const genericBandLandmarks = genericPainterlyLandmarksForBand(band.id);
  const landmarkCandidates = biome === 1 && band.id !== 'surface'
    ? normalBiome1OrganicLandmarks
    : strictBiomeNormalLandmarks
      ? authoredBiomeLandmarks
      : mergePainterlyAssets(biomeLandmarks, genericBandLandmarks, normalBiome1OrganicLandmarks);
  const availableLandmarks = landmarkCandidates.filter((asset) => asset.availableInRuntime);
  if (band.id === 'surface' && authoredBiomeLandmarks.length > 0 && viewTop !== undefined && viewBottom !== undefined) {
    const landmark = authoredBiomeLandmarks[0];
    const viewWidth = viewRight - viewLeft;
    const viewHeight = viewBottom - viewTop;
    const parallaxFactor = Phaser.Math.Linear(landmark.parallaxRange[0], landmark.parallaxRange[1], 0.56);
    const yParallaxFactor = Phaser.Math.Clamp(parallaxFactor + 0.08, 0.06, 0.32);
    const height = viewHeight * authoredBiomeLandmarkHeightMultiplier(biome, band.id);
    const widthScale = authoredBiomeLandmarkWidthMultiplier(biome, band.id);
    const localX = viewWidth * 0.5;
    const localY = viewHeight * (biome === 1 ? 0.42 : biome === 2 ? 0.52 : biome === 3 ? 0.54 : biome === 4 ? 0.54 : 0.53);
    anchors.push({
      id: `${band.id}-biome-${biome}-immediate`,
      kind: 'reef',
      x: viewLeft * parallaxFactor + localX,
      y: viewTop * yParallaxFactor + localY,
      width: height * widthScale,
      height,
      alpha: authoredBiomeLandmarkAlpha(biome, band.id),
      color: biome === 1 ? 0xbfe7dc : biome === 2 ? 0xb0895e : biome === 3 ? 0x4c95a2 : 0x79aab8,
      depthBand: band.id,
      parallaxFactor,
      textureKey: landmark.textureKey,
      assetId: landmark.id,
      assetStatus: 'available',
      textureCrop: landmark.trimCrop,
    });
    return anchors;
  }
  for (let slot = startSlot; slot <= endSlot; slot += 1) {
    if (!phase10TransitionLandmarks.length && phase7TransitionPlanes.length) {
      const slotRoll = hash(slot, band.startDepth + band.endDepth, rng.seed + 9031);
      for (const plane of phase7TransitionPlanes) {
        const planeIndex = phase7TransitionPlanes.findIndex((candidate) => candidate.id === plane.id);
        const isFar = plane.id.includes('-far-');
        const isMid = plane.id.includes('-mid-');
        const planeRoll = hash(slot + planeIndex * 19, band.endDepth + planeIndex * 37, rng.seed + 9043);
        if (isFar && slotRoll < 0.16) continue;
        if (isMid && planeRoll < 0.23) continue;
        if (!isFar && !isMid && planeRoll < 0.34) continue;
        const planeParallax = Phaser.Math.Linear(plane.parallaxRange[0], plane.parallaxRange[1], 0.62);
        const yBase = isFar
          ? Phaser.Math.Linear(0.22, 0.46, hash(slot, planeIndex, rng.seed + 9059))
          : isMid
            ? Phaser.Math.Linear(0.38, 0.72, hash(slot, planeIndex, rng.seed + 9071))
            : Phaser.Math.Linear(0.18, 0.86, hash(slot, planeIndex, rng.seed + 9083));
        const height = isFar
          ? Phaser.Math.Linear(260, 430, planeRoll)
          : isMid
            ? Phaser.Math.Linear(220, 360, planeRoll)
            : Phaser.Math.Linear(145, 260, planeRoll);
        const widthScale = isFar
          ? Phaser.Math.Linear(2.2, 3.3, hash(slot + 7, planeIndex, rng.seed + 9097))
          : isMid
            ? Phaser.Math.Linear(1.9, 2.75, hash(slot + 11, planeIndex, rng.seed + 9109))
            : Phaser.Math.Linear(1.35, 2.1, hash(slot + 13, planeIndex, rng.seed + 9121));
        anchors.push({
          id: `${band.id}-phase7-${plane.id}-${slot}`,
          kind: isMid ? 'wreck-rib' : isFar ? 'brine-curtain' : 'cable-chain',
          x: slot * spacing + Phaser.Math.Linear(0.08, 0.92, hash(slot + planeIndex, band.endDepth, rng.seed + 9133)) * spacing,
          y: SURFACE_Y + Phaser.Math.Linear(band.startDepth, band.endDepth, yBase) * 6,
          width: height * widthScale,
          height,
          alpha: plane.safeOpacity * Phaser.Math.Linear(0.82, 1.24, planeRoll),
          color: isFar ? 0x27415f : isMid ? 0x102a49 : 0x6e91a6,
          depthBand: band.id,
          parallaxFactor: planeParallax,
          textureKey: plane.textureKey,
          assetId: plane.id,
          assetStatus: 'available',
          textureCrop: plane.trimCrop,
        });
      }
    }
    const roll = hash(slot, band.startDepth + band.endDepth, rng.seed + 8039);
    if ((strictBiome1OrganicLandmark || (strictBiomeNormalLandmarks && (biome === 2 || biome === 3 || biome === 4))) && Math.abs(slot) % 2 === 1) continue;
    if (strictBiomeNormalLandmarks && anchors.length >= normalGameplayLandmarkBudget) continue;
    if (!strictBiome1OrganicLandmark && !strictBiomeNormalLandmarks && !phase8TransitionLandmarks.length && !phase9TransitionLandmarks.length && !phase10TransitionLandmarks.length && !phase11TransitionLandmarks.length && roll > band.anchorDensity) continue;
    const xRoll = hash(slot + 17, band.endDepth, rng.seed + 8093);
    const yRoll = hash(slot - 23, band.startDepth, rng.seed + 8123);
    const sizeRoll = hash(slot + 41, band.startDepth + band.endDepth, rng.seed + 8171);
    const kindRoll = hash(slot - 59, band.endDepth - band.startDepth, rng.seed + 8209);
    const kind: EnvironmentAnchorSilhouette['kind'] = kindRoll < 0.27
      ? 'reef'
      : kindRoll < 0.5
        ? 'kelp'
        : kindRoll < 0.72
          ? 'wreck-rib'
          : kindRoll < 0.88
            ? 'cable-chain'
            : band.id === 'transitionDeep'
              ? 'brine-curtain'
              : 'vent-stone';
    const landmark = availableLandmarks.length
      ? (() => {
          if (strictBiomeNormalLandmarks) {
            const picked = pickWeightedPainterlyLandmark(authoredBiomeLandmarks, slot, band, 12431);
            if (picked) return picked;
          }
          if (strictBiome1OrganicLandmark) {
            const picked = pickWeightedPainterlyLandmark(normalBiome1OrganicLandmarks, slot, band, 12431);
            if (picked) return picked;
          }
          if (biomeLandmarks.length && hash(slot + 97, band.startDepth + band.endDepth, rng.seed + 12403) < 0.84) {
            const picked = pickWeightedPainterlyLandmark(biomeLandmarks, slot, band, 12431);
            if (picked) return picked;
          }
          const phase8Landmarks = band.id === 'transitionDeep'
            ? availableLandmarks.filter((asset) => asset.id.startsWith('phase8-transition-'))
            : [];
          const phase9Landmarks = band.id === 'transitionDeep'
            ? availableLandmarks.filter((asset) => asset.id.startsWith('phase9-transition-'))
            : [];
          const phase10Landmarks = band.id === 'transitionDeep'
            ? availableLandmarks.filter((asset) => asset.id.startsWith('phase10-transition-'))
            : [];
          const phase11Landmarks = phase11TransitionLandmarks;
          if (phase11Landmarks.length) {
            return phase11Landmarks[Math.floor(hash(slot + 13, band.startDepth + 31, rng.seed + 11311) * phase11Landmarks.length)];
          }
          if (phase10Landmarks.length) {
            return phase10Landmarks[Math.floor(hash(slot + 13, band.startDepth + 31, rng.seed + 10311) * phase10Landmarks.length)];
          }
          if (phase9Landmarks.length) {
            return phase9Landmarks[Math.floor(hash(slot + 13, band.startDepth + 31, rng.seed + 9311) * phase9Landmarks.length)];
          }
          if (phase8Landmarks.length) {
            return phase8Landmarks[Math.floor(hash(slot + 13, band.startDepth + 31, rng.seed + 8311) * phase8Landmarks.length)];
          }
          const phase5Landmarks = band.id === 'lower' || band.id === 'transitionDeep'
            ? availableLandmarks.filter((asset) => asset.id.startsWith('phase5-'))
            : [];
          const selectionPool = phase5Landmarks.length && hash(slot - 31, band.endDepth + 17, rng.seed + 8287) < 0.82
            ? phase5Landmarks
            : availableLandmarks;
          return pickWeightedPainterlyLandmark(selectionPool, slot, band, 8269);
        })()
      : null;
    if (!landmark) continue;
    const phase5DeepAsset = landmark.id.startsWith('phase5-');
    const phase7DeepAsset = landmark.id.startsWith('phase7-transition-');
    const phase8DeepAsset = landmark.id.startsWith('phase8-transition-');
    const phase9DeepAsset = landmark.id.startsWith('phase9-transition-');
    const phase10DeepAsset = landmark.id.startsWith('phase10-transition-');
    const phase11DeepAsset = landmark.id.startsWith('phase11-transition-');
    const normalPhase11Asset = phase11DeepAsset && band.id !== 'transitionDeep';
    const phase11FarAsset = Boolean(landmark?.id.includes('-far-'));
    const phase11NearAsset = Boolean(landmark?.id.includes('-near-'));
    const biomeLandmarkAsset = landmark.id.startsWith('biome-');
    const surfaceBiomeLandmarkAsset = biomeLandmarkAsset && band.id === 'surface';
    const heightBoost = band.id === 'lower' ? 1.12 : band.id === 'transitionDeep' ? 1.2 : 1;
    const authoredBiomeBoost = biomeLandmarkAsset
      ? authoredBiomeLandmarkHeightMultiplier(biome, band.id)
      : 1;
    const authoredDeepBoost = phase11DeepAsset
      ? normalPhase11Asset
        ? (phase11FarAsset ? 1.82 : phase11NearAsset ? 2.04 : 1.94)
        : (phase11FarAsset ? 2.15 : phase11NearAsset ? 2.34 : 2.28)
      : biomeLandmarkAsset ? authoredBiomeBoost : phase10DeepAsset ? 2.18 : phase9DeepAsset ? 1.74 : phase8DeepAsset ? 1.72 : phase7DeepAsset ? 1.55 : phase5DeepAsset ? (band.id === 'transitionDeep' ? 1.36 : 1.24) : 1;
    const surfaceBiomeSizeBoost = surfaceBiomeLandmarkAsset
      ? (biome === 4 ? 1.34 : biome === 1 ? 1.42 : biome === 2 ? 1.55 : 1.5)
      : 1;
    const height = Phaser.Math.Linear(110, 260, sizeRoll) * heightBoost * authoredDeepBoost * surfaceBiomeSizeBoost;
    const widthScale = phase11DeepAsset
      ? (phase11FarAsset
        ? Phaser.Math.Linear(3.15, 4.05, hash(slot + 71, band.startDepth, rng.seed + 11243))
        : phase11NearAsset
          ? Phaser.Math.Linear(2.62, 3.45, hash(slot + 71, band.startDepth, rng.seed + 11247))
          : Phaser.Math.Linear(2.82, 3.78, hash(slot + 71, band.startDepth, rng.seed + 11245)))
      : biomeLandmarkAsset
      ? authoredBiomeLandmarkWidthMultiplier(biome, band.id)
      : phase10DeepAsset
      ? Phaser.Math.Linear(3.6, 4.45, hash(slot + 71, band.startDepth, rng.seed + 10243))
      : phase9DeepAsset
      ? Phaser.Math.Linear(2.0, 3.2, hash(slot + 71, band.startDepth, rng.seed + 9243))
      : phase8DeepAsset
      ? Phaser.Math.Linear(1.95, 3.15, hash(slot + 71, band.startDepth, rng.seed + 8243))
      : phase7DeepAsset
      ? Phaser.Math.Linear(1.75, 2.9, hash(slot + 71, band.startDepth, rng.seed + 8243))
      : phase5DeepAsset
      ? Phaser.Math.Linear(1.55, 2.45, hash(slot + 71, band.startDepth, rng.seed + 8243))
      : Phaser.Math.Linear(0.38, 0.76, hash(slot + 71, band.startDepth, rng.seed + 8243));
    const width = height * widthScale;
    const alphaScale = phase11DeepAsset
      ? normalPhase11Asset
        ? Phaser.Math.Linear(5.4, 7.2, sizeRoll)
        : Phaser.Math.Linear(6.8, 8.8, sizeRoll)
      : biomeLandmarkAsset ? (biome === 2
        ? Phaser.Math.Linear(5.1, 6.3, sizeRoll)
        : biome === 3
          ? Phaser.Math.Linear(3.4, 4.4, sizeRoll)
          : biome === 4
            ? Phaser.Math.Linear(1.25, 1.75, sizeRoll)
            : Phaser.Math.Linear(3.6, 4.8, sizeRoll)) : phase10DeepAsset ? Phaser.Math.Linear(10.4, 12.2, sizeRoll) : phase9DeepAsset ? Phaser.Math.Linear(2.42, 3.12, sizeRoll) : phase8DeepAsset ? Phaser.Math.Linear(2.35, 3.08, sizeRoll) : phase7DeepAsset ? Phaser.Math.Linear(2.25, 2.95, sizeRoll) : phase5DeepAsset ? Phaser.Math.Linear(2.05, 2.7, sizeRoll) : 1;
    const normalPhase11EntryRamp = 1;
    const parallaxFactor = Phaser.Math.Linear(landmark.parallaxRange[0], landmark.parallaxRange[1], 0.56);
    const rawX = slot * spacing + xRoll * spacing;
    const rawY = SURFACE_Y + Phaser.Math.Linear(band.startDepth, band.endDepth, yRoll) * 6;
    const yParallaxFactor = Phaser.Math.Clamp(parallaxFactor + 0.08, 0.06, 0.32);
    const viewWidth = viewRight - viewLeft;
    const viewHeight = viewTop !== undefined && viewBottom !== undefined ? viewBottom - viewTop : 0;
    const authoredLocalX = viewWidth > 0
      ? Phaser.Math.Linear(
        normalPhase11Asset
          ? (phase11FarAsset ? viewWidth * 0.42 : phase11NearAsset ? viewWidth * 0.46 : viewWidth * 0.36)
          : phase11DeepAsset ? (phase11FarAsset ? viewWidth * 0.1 : phase11NearAsset ? viewWidth * 0.42 : viewWidth * 0.24) : surfaceBiomeLandmarkAsset && (biome === 1 || biome === 4) ? viewWidth * 0.32 : brineBiomeNormalLandmark ? viewWidth * 0.42 : midnightBiomeNormalLandmark ? viewWidth * 0.18 : biome === 4 ? viewWidth * 0.22 : viewWidth * 0.18,
        normalPhase11Asset
          ? (phase11FarAsset ? viewWidth * 0.66 : phase11NearAsset ? viewWidth * 0.78 : viewWidth * 0.7)
          : phase11DeepAsset ? (phase11FarAsset ? viewWidth * 0.52 : phase11NearAsset ? viewWidth * 0.9 : viewWidth * 0.78) : surfaceBiomeLandmarkAsset && (biome === 1 || biome === 4) ? viewWidth * 0.68 : brineBiomeNormalLandmark ? viewWidth * 0.58 : midnightBiomeNormalLandmark ? viewWidth * 0.74 : biome === 4 ? viewWidth * 0.62 : viewWidth * 0.68,
        hash(slot + 29, band.startDepth, rng.seed + (phase11DeepAsset ? 11443 : 10443)),
      )
      : 0;
    const normalPhase11MinVisibleWidth = Math.min(width * 0.7, viewWidth);
    const normalPhase11MinScreenX = (normalPhase11MinVisibleWidth - width * 0.5);
    const normalPhase11MaxScreenX = viewWidth - normalPhase11MinVisibleWidth + width * 0.5;
    const framedAuthoredLandmark = normalPhase11Asset || biomeLandmarkAsset;
    const clampedAuthoredLocalX = framedAuthoredLandmark && viewWidth > 0
      ? Phaser.Math.Clamp(authoredLocalX, normalPhase11MinScreenX, normalPhase11MaxScreenX)
      : authoredLocalX;
    const authoredScreenX = viewWidth > 0
      ? viewLeft * parallaxFactor + clampedAuthoredLocalX
      : rawX;
    const authoredLocalY = viewTop !== undefined && viewBottom !== undefined && viewHeight > 0
      ? Phaser.Math.Linear(
        normalPhase11Asset
          ? (phase11FarAsset ? viewHeight * 0.4 : phase11NearAsset ? viewHeight * 0.58 : viewHeight * 0.46)
          : phase11DeepAsset ? (phase11FarAsset ? viewHeight * 0.22 : phase11NearAsset ? viewHeight * 0.5 : viewHeight * 0.34) : surfaceBiomeLandmarkAsset ? (biome === 4 ? viewHeight * 0.36 : biome === 3 ? viewHeight * 0.3 : biome === 2 ? viewHeight * 0.34 : viewHeight * 0.36) : brineBiomeNormalLandmark ? viewHeight * 0.42 : midnightBiomeNormalLandmark ? viewHeight * 0.06 : biome === 4 ? viewHeight * 0.2 : viewHeight * 0.22,
        normalPhase11Asset
          ? (phase11FarAsset ? viewHeight * 0.62 : phase11NearAsset ? viewHeight * 0.84 : viewHeight * 0.76)
          : phase11DeepAsset ? (phase11FarAsset ? viewHeight * 0.5 : phase11NearAsset ? viewHeight * 0.86 : viewHeight * 0.72) : surfaceBiomeLandmarkAsset ? (biome === 4 ? viewHeight * 0.66 : biome === 3 ? viewHeight * 0.68 : biome === 2 ? viewHeight * 0.68 : viewHeight * 0.66) : brineBiomeNormalLandmark ? viewHeight * 0.62 : midnightBiomeNormalLandmark ? viewHeight * 0.5 : biome === 4 ? viewHeight * 0.42 : viewHeight * 0.56,
        hash(slot + 37, band.endDepth, rng.seed + (phase11DeepAsset ? 11471 : 10471)),
      )
      : 0;
    const normalPhase11MinVisibleHeight = Math.min(height * 0.72, viewHeight);
    const normalPhase11MinScreenY = (normalPhase11MinVisibleHeight - height * 0.5);
    const normalPhase11MaxScreenY = viewHeight - normalPhase11MinVisibleHeight + height * 0.5;
    const clampedAuthoredLocalY = framedAuthoredLandmark && viewHeight > 0
      ? Phaser.Math.Clamp(authoredLocalY, normalPhase11MinScreenY, normalPhase11MaxScreenY)
      : authoredLocalY;
    const authoredScreenY = viewTop !== undefined && viewBottom !== undefined && viewHeight > 0
      ? viewTop * yParallaxFactor + clampedAuthoredLocalY
      : rawY;
    const surfaceBiomeLandmarkAlphaBoost = biomeLandmarkAsset && band.id === 'surface'
      ? (biome === 2 ? 3.2 : biome === 3 ? 4.7 : biome === 4 ? 18.5 : 12.5)
      : 1;
    const anchorAlpha = band.silhouetteAlpha * Phaser.Math.Linear(0.62, 1.16, roll) * alphaScale * normalPhase11EntryRamp * surfaceBiomeLandmarkAlphaBoost;
    const brineGameplayAlphaCap = biome === 2 && band.id !== 'transitionDeep'
      ? (biomeLandmarkAsset ? 1 : normalPhase11Asset ? 0.38 : Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;
    const biomeLandmarkAlphaCap = biomeLandmarkAsset
      ? band.id === 'surface'
        ? authoredBiomeLandmarkAlpha(biome, band.id)
        : authoredBiomeLandmarkAlpha(biome, band.id)
      : Number.POSITIVE_INFINITY;
    anchors.push({
      id: `${band.id}-${slot}`,
      kind,
      x: (phase10DeepAsset || phase11DeepAsset || biomeLandmarkAsset) ? authoredScreenX : rawX,
      y: (phase10DeepAsset || phase11DeepAsset || biomeLandmarkAsset) ? authoredScreenY : rawY,
      width,
      height,
      alpha: Math.min(anchorAlpha, brineGameplayAlphaCap, biomeLandmarkAlphaCap),
      color: phase11DeepAsset ? 0xe0f4ee : biomeLandmarkAsset ? (biome === 1 ? 0xbfe7dc : biome === 2 ? 0xb0895e : biome === 3 ? 0x4c95a2 : 0x79aab8) : phase10DeepAsset ? 0xb8d7d2 : phase9DeepAsset ? 0x2e6a73 : phase8DeepAsset ? 0x28597a : phase7DeepAsset ? 0x244966 : phase5DeepAsset ? (band.id === 'transitionDeep' ? 0x1d4c6e : 0x17647a) : band.id === 'transitionDeep' ? 0x0a1830 : band.id === 'lower' ? 0x08304a : 0x06283a,
      depthBand: band.id,
      parallaxFactor,
      textureKey: landmark.textureKey,
      assetId: landmark.id,
      assetStatus: 'available',
      textureCrop: landmark.trimCrop,
    });
  }
  return anchors;
}

export function parallaxProfileFor(biome: Biome = state.biome, depth: number = state.depth): ParallaxProfile {
  const base = parallaxBaseProfiles[biome] ?? parallaxBaseProfiles[3];
  const descent = Phaser.Math.Clamp(depth / 1500, 0, 1);
  const depthBand: ParallaxProfile['depthBand'] = descent < 0.34 ? 'upper' : descent < 0.72 ? 'mid' : 'lower';
  const bandIndex = depthBand === 'upper' ? 0 : depthBand === 'mid' ? 1 : 2;
  const murk = Phaser.Math.Linear(1, 0.72, descent);
  return {
    id: `${base.id}-${depthBand}`,
    biome,
    depthBand,
    overlay: {
      ...base.overlay,
      alpha: base.overlay.alpha * Phaser.Math.Linear(0.72, 1.18, descent),
      density: base.overlay.density * Phaser.Math.Linear(0.85, 1.08, descent),
    },
    layers: base.layers.map((layer, index) => ({
      ...layer,
      repeatMode: 'repeatXY',
      alpha: base.alpha[index] * murk,
      tint: base.tint[bandIndex],
      scale: 1 + descent * (0.05 + index * 0.012),
    })),
  };
}

export function environmentVisualProfileFor(biome: Biome = state.biome, depth: number = state.depth): EnvironmentVisualProfile {
  const parallax = parallaxProfileFor(biome, depth);
  const darkness = darknessForDepth(depth, biome);
  const activeBandState = shallowsBandForDepth(depth);
  const activeBand = activeBandState.band;
  const descent = Phaser.Math.Clamp(depth / 1720, 0, 1);
  const layerBands: EnvironmentDepthBand[] = ['surface', 'upper', 'mid', 'lower', 'transitionDeep'];
  const layerModes: EnvironmentBackgroundRepeatMode[] = ['bandClampY', 'bandClampY', 'bandClampY', 'bandClampY', 'bandClampY'];
  const layerAlphaScale = activeBand.id === 'surface'
    ? 0.46
    : activeBand.id === 'upper'
      ? 0.54
      : activeBand.id === 'mid'
        ? 0.42
        : activeBand.id === 'lower'
          ? 0.43
          : 1.18;
  const biomeLayerAlphaScale = activeBand.id === 'lower'
    ? biome === 3
      ? 1
      : biome === 4
        ? 0.52
        : 1
    : activeBand.id === 'mid' && biome === 2
      ? 0.82
      : 1;
  const waterColumnAssets = waterColumnTextureMaskAssets();
  const waterColumnLayers = waterColumnMaskLayersFor(biome, depth, activeBand);
  const waterColumnAlpha = waterColumnLayers.reduce((maxAlpha, layer) => Math.max(maxAlpha, layer.alpha), 0);
  const waterColumnPostDarknessVeil = waterColumnPostDarknessVeilFor(biome, activeBand);
  return {
    id: `environment-shallows-column-${activeBand.id}`,
    biome,
    depthBand: activeBand.id,
    activeBand,
    activeBandBlend: activeBandState.blend,
    bands: shallowsBands,
    cameraClearColor: depthColor(depth),
    background: {
      layers: layerBands.map((layerBand, index) => {
        const layer = parallax.layers[Math.min(index, parallax.layers.length - 1)];
        const suppressUpperMidnightBandPlate = biome === 3 && (activeBand.id === 'surface' || activeBand.id === 'upper');
        const asset = suppressUpperMidnightBandPlate ? null : painterlyBandPlateFor(layerBand, biome);
        const layerBandVisibility = bandLayerVisibility(activeBand.id, layerBand);
        const fallbackPrefix = asset?.fallbackTexturePrefix ?? layer.fallbackPrefix;
        const parallaxSpeed = asset
          ? Phaser.Math.Linear(asset.parallaxRange[0], asset.parallaxRange[1], 0.45 + index * 0.08)
          : layer.horizontalSpeed;
        return ({
        ...layer,
        texturePrefix: asset?.availableInRuntime ? asset.textureKey : '',
        fallbackPrefix,
        repeatMode: asset?.repeatMode ?? layerModes[index] ?? 'bandClampY',
        horizontalSpeed: parallaxSpeed,
        painterlyAssetId: asset?.id,
        painterlyAssetStatus: asset ? (asset.availableInRuntime ? 'available' as const : 'expected' as const) : 'fallback' as const,
        verticalSpeed: 0,
        alpha: asset
          ? asset.safeOpacity * layerAlphaScale * biomeLayerAlphaScale * layerBandVisibility * Phaser.Math.Linear(0.96, activeBand.id === 'transitionDeep' ? 1.2 : 0.78, descent)
          : layer.alpha * layerAlphaScale * biomeLayerAlphaScale * layerBandVisibility * Phaser.Math.Linear(1, 0.78, descent),
        tint: activeBand.id === 'surface'
          ? 0xd7fff5
          : activeBand.id === 'upper'
            ? 0xaee6da
            : activeBand.id === 'mid'
              ? 0x6fa6aa
              : activeBand.id === 'lower'
                ? 0x486f86
                : 0xd7f4ee,
        scale: (asset ? Phaser.Math.Linear(asset.scaleRange[0], asset.scaleRange[1], 0.4 + index * 0.06) : layer.scale) * Phaser.Math.Linear(1.05, 1.16, descent),
        index,
        intendedRepeatMode: layerModes[index] ?? 'bandClampY',
        layerKind: 'scenic' as const,
        seamless: false,
        band: layerBand,
        });
      }),
      worldSpaceNoise: {
        repeatMode: 'worldSpaceNoise',
        cellSize: 192,
        alpha: waterColumnAlpha,
        color: activeBand.hazeColor,
        assets: waterColumnAssets,
        layers: waterColumnLayers,
        postDarknessVeil: waterColumnPostDarknessVeil,
      },
      anchors: {
        repeatMode: 'anchor',
        count: environmentAnchorSilhouettesFor({ activeBand, depthBand: activeBand.id, biome }, 0, WORLD_W * TILE).length,
        assets: mergePainterlyAssets(biomeLandmarksFor(biome, activeBand.id), genericPainterlyLandmarksForBand(activeBand.id), normalBiome1OrganicLandmarksFor(biome, activeBand.id)),
      },
      manifest: painterlyBackgroundManifest,
    },
    surface: {
      waterlineY: BARGE_DOCK_Y + 4,
      fadeDistancePx: 360,
      skyTopColor: 0x8fcbdc,
      skyBottomColor: 0x356f82,
      waterTopColor: shallowsBands[0].topColor,
      waterBottomColor: shallowsBands[1].bottomColor,
      stripeAlphas: [0.11, 0.06, 0.025],
    },
    overlay: {
      ...parallax.overlay,
      alpha: parallax.overlay.alpha * (activeBand.id === 'transitionDeep' ? 0.09 : 0.5),
      density: parallax.overlay.density * (activeBand.id === 'transitionDeep' ? 0.22 : 0.68),
      drift: parallax.overlay.drift * 0.7,
      color: activeBand.hazeColor,
      mistStepPx: 340,
    },
    darkness: {
      value: darkness,
      ambientOpacity: activeBand.id === 'transitionDeep' ? ambientDarknessOpacity(darkness) * 0.2 : ambientDarknessOpacity(darkness),
      maskOpacity: activeBand.id === 'transitionDeep' ? darknessOpacity(darkness) * 0.24 : darknessOpacity(darkness),
    },
  };
}

export function parallaxPrefix() {
  return parallaxProfileFor().layers[0].texturePrefix;
}

export function parallaxSpeeds() {
  return parallaxProfileFor().layers.map((layer) => layer.horizontalSpeed);
}

export function parallaxAlphas() {
  return parallaxProfileFor().layers.map((layer) => layer.alpha);
}

export function uiTextureKeys() {
  return [
    'ui-title-logo',
    'ui-title-decor',
    'ui-title-button',
    'ui-title-divider',
    'ui-panel-wide',
    'ui-button-frame',
    'ui-meter-blue',
    'ui-meter-red',
    'ui-slot-frame',
    'ui-radar',
    'sub-tier1',
    'sub-tier2',
    'sub-tier3',
    'sub-shop-panel',
  ];
}

export function terrainTextureKeys() {
  const biomeTerrainKeys = biomeTerrainPrefixes().flatMap((prefix) =>
    ['sand', 'stone', 'deep', 'abyss', 'alloy'].flatMap((role) =>
      Array.from({ length: 5 }, (_, index) => `tile-${prefix}-${role}-${index}`),
    ),
  );
  return [
    ...biomeTerrainKeys,
    'tile-sand-0',
    'tile-sand-1',
    'tile-sand-2',
    'tile-stone-0',
    'tile-stone-1',
    'tile-stone-2',
    'tile-deep-0',
    'tile-deep-1',
    'tile-deep-2',
    'tile-abyss-0',
    'tile-abyss-1',
    'tile-abyss-2',
    'tile-alloy-0',
    'tile-alloy-1',
    'tile-alloy-2',
    'tile-copper',
    'tile-quartz',
    'tile-ruby',
    'tile-cobalt',
    'tile-gold',
    'tile-relic',
    'tile-idol',
    'tile-precursor',
    'tile-crown',
    'tile-alien-alloy',
    'tile-ruin-core',
  ];
}

export function environmentTextureKeys() {
  return [
    'env-rock-floor-lip-0',
    'env-rock-floor-lip-1',
    'env-rock-ceiling-lip-0',
    'env-rock-wall-left-0',
    'env-rock-wall-right-0',
    'env-ore-copper',
    'env-ore-quartz',
    'env-ore-ruby',
    'env-ore-cobalt',
    'env-ore-sunstone',
    'env-ore-relic',
    'env-ore-idol',
    'env-ore-alien-alloy',
    'env-ore-ruin-core',
    ...terrainBrushTextureKeys(),
    ...terrainEdgeAccentTextureKeys(),
    'env-flora-glass-kelp',
    'env-flora-moon-sponge',
    'env-flora-sting-anemone',
    'env-flora-brine-grass',
    'env-flora-vent-coral',
    'env-flora-ember-bloom',
    'env-flora-black-fan',
    'env-flora-needle-garden',
    'env-flora-crown-polyp',
    'env-flora-circuit-kelp',
    'env-flora-glass-obelisk',
    'env-flora-oracle-polyp',
    'env-flora-oxygen-bloom',
    'env-flora-lumen-fern',
    'env-flora-lumen-nodule',
    'env-hazard-ice-spike',
  ];
}

export function actualGptOreTextureKeys() {
  const actualGptOreTiles = [
    'copper',
    'quartz',
    'ruby',
    'cobalt',
    'sunstone',
    'relic',
    'drownedIdol',
    'precursorEngine',
    'abyssalCrown',
    'alienAlloy',
    'ruinCore',
  ];
  return [
    ...actualGptOreTiles.flatMap((tile) => Array.from({ length: 5 }, (_, index) => `ore-actual-gpt-${tile}-${index + 1}`)),
  ];
}

export function terrainBrushTextureKeys() {
  return [
    ...Array.from({ length: 4 }, (_, index) => `terrain-brush-ledge-${index}`),
    ...Array.from({ length: 4 }, (_, index) => `terrain-brush-wall-${index}`),
    ...Array.from({ length: 6 }, (_, index) => `terrain-brush-corner-${index}`),
    ...Array.from({ length: 4 }, (_, index) => `terrain-brush-fill-${index}`),
    ...Array.from({ length: 6 }, (_, index) => `terrain-brush-ore-${index}`),
    ...Array.from({ length: 8 }, (_, index) => `terrain-brush-flora-${index}`),
  ];
}

export function terrainEdgeAccentTextureKeys() {
  return [
    'terrain-edge-ore-copper',
    'terrain-edge-ore-quartz',
    'terrain-edge-ore-cobalt',
    'terrain-edge-ore-ruby',
    'terrain-edge-seam-gold',
    'terrain-edge-nodule-green',
    'terrain-edge-fossil-shell',
    'terrain-edge-nodule-blue',
    'terrain-edge-flora-glass-kelp',
    'terrain-edge-flora-brine-grass',
    'terrain-edge-flora-black-fan',
    'terrain-edge-flora-lumen-fern',
    'terrain-edge-flora-abyss-sacs',
    'terrain-edge-flora-lumen-stalks',
    'terrain-edge-flora-crown-polyps',
    'terrain-edge-flora-oracle-tendrils',
    ...terrainMaterialStampTextureKeys(),
  ];
}

export function terrainMaterialStampTextureKeys() {
  return [
    'terrain-stamp-ore-copper',
    'terrain-stamp-ore-quartz',
    'terrain-stamp-ore-cobalt',
    'terrain-stamp-ore-ruby',
    'terrain-stamp-seam-gold',
    'terrain-stamp-seam-green',
    'terrain-stamp-fossil-shell',
    'terrain-stamp-nodule-blue',
    'terrain-stamp-fringe-teal',
    'terrain-stamp-fringe-brine',
    'terrain-stamp-fringe-purple',
    'terrain-stamp-fringe-cyan',
    'terrain-stamp-plant-glass',
    'terrain-stamp-plant-brine',
    'terrain-stamp-plant-lumen',
    'terrain-stamp-plant-purple',
  ];
}

export function terrainLookForBiome(biome: Biome = state.biome) {
  const looks = {
    1: {
      id: 'reef-shelf',
      body: {
        stone: [0x010609, 0x02090c, 0x020b0e, 0x030d11],
        sand: [0x03100d, 0x04120f, 0x04140f, 0x05150f],
        anchorstone: [0x051016, 0x06131a, 0x06151c, 0x071820],
      },
      palette: { rim: 0x3b5f65, sandRim: 0x293b3a, growth: 0x24806f, glow: 0x72d5dc, moss: 0x1c4642, shadow: 0x010306 },
      fringeStampPool: ['terrain-stamp-fringe-teal', 'terrain-stamp-fringe-teal', 'terrain-stamp-fringe-brine'],
      floraStampPool: ['terrain-stamp-plant-glass', 'terrain-stamp-plant-brine'],
      materialAccentStampPool: ['terrain-stamp-fossil-shell', 'terrain-stamp-seam-green', 'terrain-stamp-nodule-blue'],
      edgeStampDensity: 1,
      proceduralFringeAlpha: 1,
    },
    2: {
      id: 'brine-vents',
      body: {
        stone: [0x030506, 0x050706, 0x070807, 0x080907],
        sand: [0x070706, 0x090807, 0x0a0907, 0x0b0a07],
        anchorstone: [0x0a0e10, 0x0d1112, 0x101312, 0x121411],
      },
      palette: { rim: 0x776252, sandRim: 0x4b3f36, growth: 0xe6844f, glow: 0xff9f52, moss: 0x344538, shadow: 0x020303 },
      fringeStampPool: ['terrain-stamp-fringe-brine', 'terrain-stamp-fringe-brine', 'terrain-stamp-fringe-teal'],
      floraStampPool: ['terrain-stamp-plant-brine'],
      materialAccentStampPool: ['terrain-stamp-seam-gold', 'terrain-stamp-fossil-shell', 'terrain-stamp-nodule-blue'],
      edgeStampDensity: 0.9,
      proceduralFringeAlpha: 1.05,
    },
    3: {
      id: 'abyssal-garden',
      body: {
        stone: [0x02030a, 0x03040d, 0x040411, 0x050313],
        sand: [0x05050f, 0x060513, 0x070617, 0x080719],
        anchorstone: [0x070a13, 0x080c17, 0x090e1b, 0x0a1020],
      },
      palette: { rim: 0x73649d, sandRim: 0x3c3558, growth: 0xb26bd2, glow: 0xa981ff, moss: 0x2b3654, shadow: 0x020208 },
      fringeStampPool: ['terrain-stamp-fringe-purple', 'terrain-stamp-fringe-purple', 'terrain-stamp-fringe-brine'],
      floraStampPool: ['terrain-stamp-plant-lumen', 'terrain-stamp-plant-purple'],
      materialAccentStampPool: ['terrain-stamp-nodule-blue', 'terrain-stamp-seam-green', 'terrain-stamp-fossil-shell'],
      edgeStampDensity: 1.12,
      proceduralFringeAlpha: 1.16,
    },
    4: {
      id: 'ruin-trench',
      body: {
        stone: [0x01040a, 0x02060d, 0x020710, 0x030812],
        sand: [0x040a10, 0x050d14, 0x061018, 0x07101a],
        anchorstone: [0x07101a, 0x081521, 0x091927, 0x0a1d2e],
      },
      palette: { rim: 0x819ab8, sandRim: 0x405468, growth: 0x8ee9ec, glow: 0x9ec7ff, moss: 0x22484d, shadow: 0x01040a },
      fringeStampPool: ['terrain-stamp-fringe-cyan', 'terrain-stamp-fringe-cyan', 'terrain-stamp-fringe-purple'],
      floraStampPool: ['terrain-stamp-plant-lumen', 'terrain-stamp-plant-purple'],
      materialAccentStampPool: ['terrain-stamp-seam-green', 'terrain-stamp-nodule-blue', 'terrain-stamp-fossil-shell'],
      edgeStampDensity: 0.96,
      proceduralFringeAlpha: 1.08,
    },
  } as const;
  return looks[biome] ?? looks[1];
}

export function terrainLookDepthBandForTileY(tileY: number) {
  const depthMeters = Math.max(0, (tileY * TILE - SURFACE_Y) / 6);
  if (depthMeters >= 2000) return { id: 'trench', index: 3, depthMeters };
  if (depthMeters >= 1200) return { id: 'abyss', index: 2, depthMeters };
  if (depthMeters >= 600) return { id: 'mid', index: 1, depthMeters };
  return { id: 'upper', index: 0, depthMeters };
}

export function terrainBodyColorForTile(tile: Tile, tileY: number, biome: Biome = state.biome) {
  const look = terrainLookForBiome(biome);
  const band = terrainLookDepthBandForTileY(tileY);
  const colors = tile === 'sand'
    ? look.body.sand
    : tile === 'bedrock' || tile === 'anchorstone'
      ? look.body.anchorstone
      : look.body.stone;
  return colors[band.index] ?? colors[colors.length - 1];
}

export function isOreTile(tile: Tile) {
  return tiles[tile].value > 0;
}

export function oreEnvironmentAssetKey(tile: Tile) {
  if (tile === 'copper') return 'env-ore-copper';
  if (tile === 'quartz') return 'env-ore-quartz';
  if (tile === 'ruby') return 'env-ore-ruby';
  if (tile === 'cobalt') return 'env-ore-cobalt';
  if (tile === 'sunstone') return 'env-ore-sunstone';
  if (tile === 'relic') return 'env-ore-relic';
  if (tile === 'drownedIdol' || tile === 'precursorEngine' || tile === 'abyssalCrown') return 'env-ore-idol';
  if (tile === 'alienAlloy') return 'env-ore-alien-alloy';
  if (tile === 'ruinCore') return 'env-ore-ruin-core';
  return 'env-ore-copper';
}

export function tileTextureKey(tile: Tile, x: number, y: number) {
  const variant = terrainTileVariant(x, y);
  if (tile === 'sand') return biomeTerrainTextureKey('sand', variant);
  if (tile === 'stone') {
    return hostRockTextureKey(x, y);
  }
  if (tile === 'bedrock' || tile === 'anchorstone') return biomeTerrainTextureKey('alloy', variant);
  if (isOreTile(tile)) return hostRockTextureKey(x, y);
  if (tile === 'copper') return 'tile-copper';
  if (tile === 'quartz') return 'tile-quartz';
  if (tile === 'ruby') return 'tile-ruby';
  if (tile === 'cobalt') return 'tile-cobalt';
  if (tile === 'sunstone') return 'tile-gold';
  if (tile === 'relic') return 'tile-relic';
  if (tile === 'drownedIdol') return 'tile-idol';
  if (tile === 'precursorEngine') return 'tile-precursor';
  if (tile === 'abyssalCrown') return 'tile-crown';
  if (tile === 'alienAlloy') return 'tile-alien-alloy';
  if (tile === 'ruinCore') return 'tile-ruin-core';
  return biomeTerrainTextureKey('stone', variant);
}

export function hostRockTextureKey(x: number, y: number) {
  const variant = terrainTileVariant(x, y);
  if (y > WORLD_H * 0.76) return biomeTerrainTextureKey('abyss', variant);
  if (state.biome >= 3 || y > WORLD_H * 0.52) return biomeTerrainTextureKey('deep', variant);
  return biomeTerrainTextureKey('stone', variant);
}

export function biomeTerrainTextureKey(role: 'sand' | 'stone' | 'deep' | 'abyss' | 'alloy', variant: number) {
  return `tile-${biomeTerrainPrefix()}-${role}-${variant}`;
}

export function biomeTerrainPrefix() {
  if (state.biome === 1) return 'reef';
  if (state.biome === 2) return 'thermal';
  if (state.biome === 3) return 'abyssal';
  return 'ruin';
}

export function biomeTerrainPrefixes() {
  return ['reef', 'thermal', 'abyssal', 'ruin'];
}

export function terrainTileVariant(x: number, y: number) {
  const patchX = Math.floor(x / 3);
  const patchY = Math.floor(y / 3);
  return Math.floor(hash(patchX * 19, patchY * 23, rng.seed) * 5) % 5;
}

export function tileVariant(x: number, y: number) {
  return Math.floor(hash(x * 19, y * 23, rng.seed) * 3) % 3;
}

export function sonarKey(x: number, y: number) {
  return `${x}:${y}`;
}

export function sonarTileColor(tile: Tile, edge: boolean) {
  if (tile === 'water') return 'rgba(12, 88, 111, 0.5)';
  if (tile === 'sand') return edge ? 'rgba(213, 176, 103, 0.98)' : 'rgba(185, 148, 88, 0.34)';
  if (tile === 'stone') return edge ? 'rgba(151, 172, 191, 0.98)' : 'rgba(92, 111, 128, 0.38)';
  if (tile === 'bedrock' || tile === 'anchorstone') return edge ? 'rgba(203, 218, 232, 0.98)' : 'rgba(122, 143, 164, 0.42)';
  if (isArtifactTile(tile) || tile === 'alienAlloy') return 'rgba(115, 251, 211, 0.95)';
  if (tiles[tile].value > 0) return 'rgba(255, 209, 102, 0.95)';
  return 'rgba(140, 180, 190, 0.8)';
}

export function fishAssetKey(species: FishSpecies) {
  if (species.assetKey) return species.assetKey;
  if (!species.hostile) return state.biome === 1 ? 'fish-shallow-neutral' : 'fish-mid-neutral';
  if (state.biome >= 3 || species.radius >= 24) return 'fish-abyss-predator';
  if (state.biome === 2 || species.radius >= 18) return 'fish-mid-predator';
  return 'fish-shallow-predator';
}

export function floraAssetKey(species: FloraSpecies) {
  if (species.species === 'Glass Kelp') return 'env-flora-glass-kelp';
  if (species.species === 'Moon Sponge') return 'env-flora-moon-sponge';
  if (species.species === 'Sting Anemone') return 'env-flora-sting-anemone';
  if (species.species === 'Brine Grass') return 'env-flora-brine-grass';
  if (species.species === 'Vent Coral') return 'env-flora-vent-coral';
  if (species.species === 'Ember Bloom') return 'env-flora-ember-bloom';
  if (species.species === 'Black Fan') return 'env-flora-black-fan';
  if (species.species === 'Needle Garden') return 'env-flora-needle-garden';
  if (species.species === 'Crown Polyp') return 'env-flora-crown-polyp';
  if (species.species === 'Circuit Kelp') return 'env-flora-circuit-kelp';
  if (species.species === 'Glass Obelisk') return 'env-flora-glass-obelisk';
  if (species.species === 'Oracle Polyp') return 'env-flora-oracle-polyp';
  if (species.species === 'Oxygen Bloom') return 'env-flora-oxygen-bloom';
  if (species.species === 'Lumen Fern') return 'env-flora-lumen-fern';
  if (species.species === 'Lumen Nodule') return 'env-flora-lumen-nodule';
  if (state.biome === 1) return species.hazardous ? 'env-flora-sting-anemone' : 'env-flora-glass-kelp';
  return species.hazardous || species.rare ? 'env-flora-vent-coral' : 'env-flora-moon-sponge';
}

export function fitImageWidth(image: Phaser.GameObjects.Image | undefined, width: number) {
  if (!image || image.width <= 0) return;
  image.setScale(width / image.width);
}

export function fitImageHeight(image: Phaser.GameObjects.Image | undefined, height: number) {
  if (!image || image.height <= 0) return;
  image.setScale(height / image.height);
}

export function updateFacingFromVelocity(entity: Fish) {
  if (entity.vx < -2) entity.facingSign = -1;
  if (entity.vx > 2) entity.facingSign = 1;
}

export function updateFishVisualFacing(fish: Fish, delta: number) {
  const speed = Math.hypot(fish.vx, fish.vy);
  const fallbackAngle = fish.facingSign < 0 ? Math.PI : 0;
  if (fish.visualFacingSign !== -1 && fish.visualFacingSign !== 1) fish.visualFacingSign = fish.facingSign;
  const currentAngle = typeof fish.visualAngle === 'number' && Number.isFinite(fish.visualAngle)
    ? fish.visualAngle
    : speed > 0.01 ? Math.atan2(fish.vy, fish.vx) : fallbackAngle;
  fish.visualAngle = currentAngle;

  if (speed >= 6) {
    const targetAngle = Math.atan2(fish.vy, fish.vx);
    const turnRate = fish.radius <= scaledEntity(12) ? 4.6 : 5.4;
    const angleDelta = Phaser.Math.Angle.Wrap(targetAngle - fish.visualAngle);
    const maxStep = turnRate * delta;
    fish.visualAngle = Phaser.Math.Angle.Wrap(
      fish.visualAngle + Phaser.Math.Clamp(angleDelta, -maxStep, maxStep),
    );
  }

  const intentThreshold = Math.max(8, fish.speed * 0.18);
  const desiredSign: 1 | -1 | 0 = fish.vx < -intentThreshold ? -1 : fish.vx > intentThreshold ? 1 : 0;
  if (desiredSign === 0 || desiredSign === fish.visualFacingSign) {
    fish.visualTurnIntentSign = undefined;
    fish.visualTurnIntentTime = 0;
    return;
  }

  if (fish.visualTurnIntentSign !== desiredSign) {
    fish.visualTurnIntentSign = desiredSign;
    fish.visualTurnIntentTime = 0;
  }
  fish.visualTurnIntentTime = (fish.visualTurnIntentTime ?? 0) + delta;
  const commitDelay = fish.hostile && fish.aggro > 0 ? 0.08 : 0.13;
  if (fish.visualTurnIntentTime >= commitDelay) {
    fish.visualFacingSign = desiredSign;
    fish.visualTurnIntentSign = undefined;
    fish.visualTurnIntentTime = 0;
  }
}

export function predatorBiteCooldown(fish: Fish) {
  const strength = fish.radius + (fish.pattern === 'circle' ? scaledEntity(7) : 0) + state.biome * 1.7;
  return Phaser.Math.Clamp(1.62 - strength * 0.018, 1.05, 1.48);
}

export function animatedFrame(phase: number, speed: number, frames: number, fps = 4.5) {
  const rate = Phaser.Math.Clamp(speed / 95, 0.55, 1.18);
  return Math.floor((phase * rate * fps) % frames);
}

export function diverAnimation(vx: number, vy: number, speed: number, mineCooldownRemaining: number, lost: boolean): DiverAnimation {
  if (lost) return 'die';
  if (mineCooldownRemaining > 0.04) return 'mine';
  if (speed < 9) return 'idle';
  return speed > swimTopSpeed() * 0.78 ? 'boost' : 'swim';
}

export function diverFrame(animation: DiverAnimation, timeSeconds: number, speed: number, mineCooldownRemaining: number) {
  const frameCount = diverFrameCounts[animation];
  if (animation === 'die') {
    return Math.min(frameCount - 1, Math.floor((timeSeconds * 4.5) % (frameCount + 3)));
  }
  if (animation === 'mine') {
    const progress = 1 - Phaser.Math.Clamp(mineCooldownRemaining / Math.max(0.01, mineCooldown()), 0, 1);
    return Math.min(frameCount - 1, Math.floor(progress * frameCount));
  }
  const baseFps =
    animation === 'idle' ? 1.9 :
      animation === 'hover' || animation === 'ascend' || animation === 'descend' ? 3.2 :
        animation === 'boost' ? 5.6 :
          4.25;
  const rate = animation === 'idle'
    ? 1
    : Phaser.Math.Clamp(speed / 100, 0.76, animation === 'boost' ? 1.12 : 1.04);
  return Math.floor(timeSeconds * baseFps * rate) % frameCount;
}

export function diverPose(animation: DiverAnimation, angle: number, facingSign: 1 | -1) {
  if (animation === 'swim' || animation === 'boost') return swimPose(angle, facingSign);
  if (animation === 'mine' || animation === 'recoil' || animation === 'damage') {
    return swimPose(angle, facingSign, 1.35);
  }
  return { flipX: false, rotation: 0 };
}

export function diverDisplayWidth(animation: DiverAnimation) {
  if (animation === 'swim') return 58;
  if (animation === 'boost') return 62;
  if (animation === 'mine') return 48;
  if (animation === 'recoil' || animation === 'damage') return 42;
  if (animation === 'die' || animation === 'revive') return 39;
  if (animation === 'idle') return 40;
  return 32;
}

export function diverOrigin(animation: DiverAnimation, facingSign: 1 | -1) {
  let x = 0.5;
  let y = 0.55;
  if (animation === 'swim') {
    x = 45 / 104;
    y = 38 / 82;
  } else if (animation === 'boost') {
    x = 48 / 112;
    y = 39 / 86;
  } else if (animation === 'mine') {
    x = 44 / 94;
    y = 40 / 76;
  } else if (animation === 'idle') {
    x = 33 / 66;
    y = 44 / 80;
  }
  return {
    x: facingSign < 0 && (animation === 'swim' || animation === 'boost') ? 1 - x : x,
    y,
  };
}

export function fishFrameCount(assetKey: string) {
  const manifest = spriteManifests[assetKey];
  if (manifest) return manifest.frameCount;
  if (faunaFrameCounts[assetKey]) return faunaFrameCounts[assetKey];
  return 1;
}

export function swimPose(angle: number, facingSign: 1 | -1, maxPitch = 0.72) {
  const flipX = facingSign < 0;
  const localPitch = Math.atan2(Math.sin(angle), Math.abs(Math.cos(angle)));
  return {
    flipX,
    rotation: Phaser.Math.Clamp(localPitch * facingSign, -maxPitch, maxPitch),
  };
}

export function isArtifactTile(tile: Tile) {
  return tile === 'drownedIdol' || tile === 'precursorEngine' || tile === 'abyssalCrown' || tile === 'ruinCore';
}

export function axis(negativeA: Phaser.Input.Keyboard.Key, negativeB: Phaser.Input.Keyboard.Key, positiveA: Phaser.Input.Keyboard.Key, positiveB: Phaser.Input.Keyboard.Key) {
  return (positiveA.isDown || positiveB.isDown ? 1 : 0) - (negativeA.isDown || negativeB.isDown ? 1 : 0);
}

export function oxygenMax() {
  return BASE_OXYGEN + state.upgrades.oxygen * 48;
}

export function hullMax() {
  return 100 + state.upgrades.suit * 32;
}

export function fuelMax() {
  return 100;
}

export function fuelRefillCost(fullTank: boolean) {
  if (!fullTank) return FUEL_REFILL_COST;
  const cells = Math.ceil(Math.max(0, fuelMax() - state.fuel) / FUEL_REFILL_AMOUNT);
  return Math.max(0, cells * FUEL_REFILL_COST);
}

export function miningFuelCost(targetCount: number) {
  return MINE_FUEL_COST + targetCount * 0.07 + miningUpgradeBonus() * 0.015;
}

export function cargoCapacity() {
  const subCargo = state.activeSub && state.activeSub.tier >= 2 ? subDef(state.activeSub.tier).cargo : 0;
  return 6 + state.upgrades.cargo * 4 + subCargo;
}

export function upgradeDiminishing(level: number) {
  return Math.sqrt(Math.max(0, level));
}

export function swimUpgradeBonus() {
  return upgradeDiminishing(state.upgrades.speed);
}

export function miningUpgradeBonus() {
  return upgradeDiminishing(state.upgrades.laser);
}

export function swimTopSpeed() {
  return 106 + swimUpgradeBonus() * 20;
}

export function mineCooldown() {
  return Math.max(0.24, 0.48 - miningUpgradeBonus() * 0.055);
}

export function scanReward(target: ScanTarget) {
  const rarity = scannableRarity(target);
  const base = scanRarityCredits(rarity);
  const dangerBonus = target.kind === 'articulated'
    ? 720
    : target.kind === 'fish'
      ? target.hostile ? 180 : 0
      : target.hazardous ? 220 : 0;
  const scannerBonus = 1 + state.upgrades.scanner * 0.16;
  return Math.round((base + dangerBonus) * scannerBonus);
}

export function scanRarityCredits(rarity: ScanRarity) {
  if (rarity === 'legendary') return 3600;
  if (rarity === 'epic') return 2100;
  if (rarity === 'rare') return 1150;
  if (rarity === 'uncommon') return 620;
  return 320;
}

export function rarityLabel(rarity: ScanRarity) {
  return rarity[0].toUpperCase() + rarity.slice(1);
}

export function rarityColor(rarity: ScanRarity) {
  if (rarity === 'legendary') return 0xffd166;
  if (rarity === 'epic') return 0xd06bff;
  if (rarity === 'rare') return 0x8ee7f4;
  if (rarity === 'uncommon') return 0x7bd88f;
  return 0xa9b8c9;
}

export function scannableRarity(target: ScanTarget) {
  if (target.kind === 'articulated') return target.manifest.rarity;
  return target.kind === 'fish'
    ? fishRarity(fishSpeciesByName(target.species))
    : floraRarity(floraSpeciesByName(target.species));
}

export function fishRarity(species?: FishSpecies): ScanRarity {
  if (!species) return 'common';
  if (species.count <= 4 || species.radius >= 29) return 'legendary';
  if (species.count <= 5 || species.radius >= 24 || species.minY >= 1500) return 'epic';
  if (species.count <= 7 || species.hostile || species.minY >= 980) return 'rare';
  if (species.count <= 10 || species.minY >= 520) return 'uncommon';
  return 'common';
}

export function floraRarity(species?: FloraSpecies): ScanRarity {
  if (!species) return 'common';
  if (species.rare && species.hazardous) return 'epic';
  if (species.rare || species.count <= 5) return 'rare';
  if (species.hazardous || species.count <= 10 || species.minY >= 760) return 'uncommon';
  return 'common';
}

export function fishMaxHp(species: FishSpecies) {
  return Math.round(18 + species.radius * (species.hostile ? 2.45 : 1.25) + state.biome * (species.hostile ? 6 : 2.5));
}

export function floraMaxHp(species: FloraSpecies) {
  return Math.round(12 + species.radius * (species.hazardous ? 2.1 : 1.25) + (species.rare ? 18 : 0));
}

export function fishSpeciesByName(name: string) {
  const current = biomeFish[state.biome].find((species) => species.species === name);
  if (current) return current;
  for (const entries of Object.values(biomeFish)) {
    const match = entries.find((species) => species.species === name);
    if (match) return match;
  }
  return undefined;
}

export function floraSpeciesByName(name: string) {
  const current = biomeFlora[state.biome].find((species) => species.species === name);
  if (current) return current;
  for (const entries of Object.values(biomeFlora)) {
    const match = entries.find((species) => species.species === name);
    if (match) return match;
  }
  return undefined;
}

export function currentApexSpecies() {
  if (state.biome === 1) return 'Blue-ring Octopus';
  if (state.biome === 2) return 'Gulper Eel';
  if (state.biome === 4) return 'Abyssal Crownmaw';
  return 'Abyssal Serpent';
}

export function lifeCatalogTotal() {
  const articulatedCount = articulatedCreatureDefs().filter((manifest) => state.biome >= manifest.minBiome && shouldSpawnArticulatedCreature(manifest)).length;
  return biomeFish[state.biome].length + biomeFlora[state.biome].length + articulatedCount;
}

export function subDef(tier: SubTier) {
  return subDefs.find((def) => def.tier === tier) ?? subDefs[0];
}

export function createSubVehicle(tier: SubTier, x: number, y: number): SubVehicle {
  const def = subDef(tier);
  return {
    tier,
    x,
    y,
    vx: 0,
    vy: 0,
    facingSign: 1,
    hull: def.hull,
    oxygen: def.oxygen,
    fuel: def.fuel,
    boardProgress: 0,
    weaponCooldown: 0,
  };
}

export function subMiningRange(sub: SubVehicle) {
  const { halfW, halfH } = subCollisionHalfExtents(sub);
  return Math.hypot(halfW, halfH) + 50 + miningUpgradeBonus() * 5;
}

export function subCollisionHalfExtents(sub: SubVehicle) {
  const width = sub.tier === 3 ? 118 : sub.tier === 2 ? 92 : 72;
  return {
    halfW: scaledEntity(width * 0.52),
    halfH: scaledEntity(sub.tier === 3 ? 41 : sub.tier === 2 ? 35 : 30),
  };
}

export function subDirectionalReach(sub: SubVehicle, dir: Phaser.Math.Vector2) {
  const { halfW, halfH } = subCollisionHalfExtents(sub);
  return Math.abs(dir.x) * halfW + Math.abs(dir.y) * halfH;
}

export function bargeSolidAtWorld(worldX: number, worldY: number) {
  if (worldY < 0 || worldY >= BARGE_PLATFORM_HEIGHT) return false;
  const left = WORLD_W * TILE * 0.5 - BARGE_PLATFORM_WIDTH * 0.5;
  const gridX = Math.floor((worldX - left) / TILE);
  const gridY = Math.floor(worldY / TILE);
  if (gridX < 0 || gridX >= BARGE_PLATFORM_GRID_W || gridY < 0 || gridY >= BARGE_PLATFORM_GRID_H) return false;
  return bargeSolidCell(gridX, gridY);
}

export function bargeSolidCell(gridX: number, gridY: number) {
  const inBay =
    gridX >= BARGE_PLATFORM_ENTRANCE_LEFT &&
    gridX <= BARGE_PLATFORM_ENTRANCE_RIGHT &&
    gridY >= BARGE_PLATFORM_ENTRANCE_TOP;
  if (inBay) return false;
  const topMass = gridY <= 1;
  const frameSide =
    (gridX === BARGE_PLATFORM_ENTRANCE_LEFT - 1 || gridX === BARGE_PLATFORM_ENTRANCE_RIGHT + 1) &&
    gridY >= BARGE_PLATFORM_ENTRANCE_TOP;
  const sideMass = gridY >= BARGE_PLATFORM_ENTRANCE_TOP && (gridX <= 5 || gridX >= BARGE_PLATFORM_GRID_W - 6);
  const shoulderMass =
    gridY === BARGE_PLATFORM_ENTRANCE_TOP &&
    (gridX <= BARGE_PLATFORM_ENTRANCE_LEFT - 2 || gridX >= BARGE_PLATFORM_ENTRANCE_RIGHT + 2);
  const lowerShoulderMass =
    gridY > BARGE_PLATFORM_ENTRANCE_TOP &&
    (gridX <= BARGE_PLATFORM_ENTRANCE_LEFT - 4 || gridX >= BARGE_PLATFORM_ENTRANCE_RIGHT + 4);
  return topMass || frameSide || sideMass || shoulderMass || lowerShoulderMass;
}

export function subRepairCost() {
  const sub = state.activeSub;
  if (!sub) return 0;
  return Math.ceil(Math.max(0, subDef(sub.tier).hull - sub.hull) * SUB_REPAIR_COST_PER_POINT);
}

export function bargeUpgradeCost() {
  if (state.biome === 1) return BARGE_UPGRADE_COST;
  if (state.biome === 2) return 15000;
  return 36000;
}

export function marlinVoucherDiscount() {
  return state.marlinVoucherAvailable && !state.subOwned[2] ? MARLIN_VOUCHER_DISCOUNT : 0;
}

export function subEffectiveCost(tier: SubTier) {
  const def = subDef(tier);
  return Math.max(0, def.cost - (tier === 2 ? marlinVoucherDiscount() : 0));
}

export function biomeChartingRequirement(biome = state.biome) {
  if (biome === 1) return { requiredScans: 4, requiredDepth: 900, requiredSonarCells: 2400, requireApexScan: false, allowHostileScanFallback: true };
  if (biome === 2) return { requiredScans: 5, requiredDepth: 1100, requiredSonarCells: 3200, requireApexScan: true, allowHostileScanFallback: false };
  if (biome === 3) return { requiredScans: 6, requiredDepth: 1250, requiredSonarCells: 4200, requireApexScan: true, allowHostileScanFallback: false };
  return null;
}

export function hasScannedHostileInCurrentBiome() {
  return biomeFish[state.biome].some((species) => species.hostile && state.scannedSpecies.has(species.species))
    || biomeFlora[state.biome].some((species) => species.hazardous && state.scannedSpecies.has(species.species));
}

export function biomeChartingProgress() {
  const requirement = biomeChartingRequirement();
  const apex = currentApexSpecies();
  const apexScanned = state.scannedSpecies.has(apex);
  const hostileScanned = hasScannedHostileInCurrentBiome();
  if (!requirement) {
    return {
      scanned: state.scannedSpecies.size,
      requiredScans: 0,
      depth: state.maxDepth,
      requiredDepth: 0,
      sonarCells: state.sonarRevealed.size,
      requiredSonarCells: 0,
      apex,
      apexScanned,
      hostileScanned,
      threatOk: true,
      complete: true,
      missing: '',
    };
  }
  const threatOk = requirement.requireApexScan
    ? apexScanned
    : apexScanned || (requirement.allowHostileScanFallback ? hostileScanned : true);
  const missing = state.scannedSpecies.size < requirement.requiredScans
    ? 'survey scans'
    : state.maxDepth < requirement.requiredDepth
      ? 'depth record'
      : state.sonarRevealed.size < requirement.requiredSonarCells
        ? 'sonar chart'
        : !threatOk
          ? requirement.requireApexScan ? 'apex scan' : 'hostile scan'
          : '';
  return {
    scanned: state.scannedSpecies.size,
    requiredScans: requirement.requiredScans,
    depth: state.maxDepth,
    requiredDepth: requirement.requiredDepth,
    sonarCells: state.sonarRevealed.size,
    requiredSonarCells: requirement.requiredSonarCells,
    apex,
    apexScanned,
    hostileScanned,
    threatOk,
    complete: !missing,
    missing,
  };
}

export function canTravelToNextBiome() {
  return state.biome < 4 && state.credits >= bargeUpgradeCost() && biomeChartingProgress().complete;
}

export function oxygenDrain() {
  return (4.2 + Math.max(0, state.depth - 500) / 520) * 0.5;
}

export function lightRadius() {
  return 72 + state.upgrades.lamp * 22;
}

export function lightBeamLength() {
  return 150 + state.upgrades.lamp * 42;
}

export function lightBeamHalfWidth() {
  return 32 + state.upgrades.lamp * 9;
}

export function darknessAtDepth() {
  return darknessForDepth(state.depth, state.biome);
}

export function darknessForDepth(depth: number, biome: Biome) {
  if (biome === 1) return Phaser.Math.Clamp((depth - 140) / 1180, 0, 0.9);
  if (biome === 2) return Phaser.Math.Clamp((depth - 95) / 900, 0, 1);
  if (biome === 3) return Phaser.Math.Clamp((depth - 45) / 680, 0, 1);
  return Phaser.Math.Clamp((depth - 20) / 540, 0, 1);
}

export function ambientDarknessOpacity(darkness: number) {
  return Phaser.Math.Clamp(0.045 + darkness * 0.28, 0, 0.32);
}

export function darknessOpacity(darkness: number) {
  return Phaser.Math.Clamp(darkness * 0.82, 0, 0.84);
}

export function upgradeCost(upgrade: Upgrade) {
  return Math.round(upgrade.baseCost * (1 + state.upgrades[upgrade.id] * 0.72));
}

export function upgradeMax(upgrade: Upgrade) {
  if (state.biome === 4 && upgrade.biome === 1) return upgrade.max + 8;
  if (state.biome === 3 && upgrade.biome === 1) return upgrade.max + 6;
  if (state.biome >= 2 && upgrade.biome === 1) return upgrade.max + 3;
  if (state.biome === 4 && upgrade.biome === 2) return upgrade.max + 3;
  return upgrade.max;
}

export function refillAtBoat(delta = 1) {
  state.oxygen = Math.min(oxygenMax(), state.oxygen + 90 * delta);
  state.hull = Math.min(hullMax(), state.hull + 75 * delta);
  if (state.oxygen >= oxygenMax() * 0.96) resetOxygenWarnings();
}

export function checkOxygenWarnings() {
  if (!state.started || state.lost || state.won || state.atBoat) return;
  const pct = state.oxygen / oxygenMax();
  if (pct <= 0.25 && !state.oxygenWarnings.quarter) {
    state.oxygenWarnings.quarter = true;
    showFullscreenWarning('Oxygen critical', '25% reserve remaining', 'critical');
    state.status = 'Oxygen critical. Surface immediately or find the barge.';
    renderHud();
  } else if (pct <= 0.5 && !state.oxygenWarnings.half) {
    state.oxygenWarnings.half = true;
    showFullscreenWarning('Oxygen low', '50% reserve remaining', 'low');
    state.status = 'Oxygen reserves at half. Plan your return route.';
    renderHud();
  }
}

export function resetOxygenWarnings() {
  state.oxygenWarnings.half = false;
  state.oxygenWarnings.quarter = false;
  clearFullscreenWarning();
}

export function depthColor(depth: number) {
  if (state.biome === 4) {
    if (depth < 440) return '#12242b';
    if (depth < 1120) return '#101923';
    return '#06070d';
  }
  if (state.biome === 3) {
    if (depth < 440) return '#161d32';
    if (depth < 1120) return '#111424';
    return '#090913';
  }
  if (state.biome === 2) {
    if (depth < 440) return '#18313a';
    if (depth < 1120) return '#171f2b';
    return '#110f18';
  }
  if (depth < 440) return '#0b3741';
  if (depth < 1040) return '#092430';
  return '#06111d';
}

export function scaledDepthPx(value: number) {
  return value * deepScale;
}

export function restart(scene: DeepdiveScene) {
  state.biome = 1;
  state.credits = 0;
  state.oxygen = BASE_OXYGEN;
  state.hull = 100;
  state.fuel = fuelMax();
  state.depth = 0;
  state.maxDepth = 0;
  state.oreSoldCredits = 0;
  state.cargo = [];
  state.selectedCargoIndex = 0;
  state.sonarRevealed.clear();
  state.sonarContacts = [];
  resetOxygenWarnings();
  clearVenom();
  clearBleed();
  state.scannedSpecies.clear();
  state.won = false;
  state.lost = false;
  state.atBoat = true;
  state.docked = true;
  state.paused = false;
  state.logbookOpen = false;
  state.cargoOpen = false;
  state.bargeTab = 'services';
  state.questBoard = [];
  state.activeQuestId = '';
  state.forwardOutpost.active = false;
  state.forwardOutpost.x = 0;
  state.forwardOutpost.y = 0;
  state.forwardOutpost.depth = 0;
  state.forwardOutpost.charge = 0;
  state.forwardOutpost.floraSpecies = '';
  state.radioMessages = [];
  state.radioIndex = 0;
  state.radioOpen = false;
  state.selectedSubTier = null;
  state.activeSub = null;
  state.carrierSub = null;
  state.pilotingSub = false;
  state.auxSubActive = false;
  state.marlinVoucherAvailable = false;
  for (const tier of [1, 2, 3] as SubTier[]) state.subOwned[tier] = false;
  state.status = 'A new trench map is ready. Dive again.';
  state.started = true;
  for (const key of Object.keys(state.upgrades) as UpgradeId[]) state.upgrades[key] = 0;
  rng.seed = Math.floor(Math.random() * 1_000_000);
  scene.scene.restart();
  renderHud();
}
