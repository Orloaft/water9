import Phaser from 'phaser';
import type { Biome,CargoItem,DiverAnimation,Fish,FishSpecies,FloraSpecies,Hazard,InventoryItemKind,Quest,ScanRarity,ScanTarget,ShopItem,SpecialRoom,SubTier,SubVehicle,Tile,Upgrade,UpgradeId,VeinRule } from './types';
import { audioKeys,BARGE_PLATFORM_ENTRANCE_LEFT,BARGE_PLATFORM_ENTRANCE_RIGHT,BARGE_PLATFORM_ENTRANCE_TOP,BARGE_PLATFORM_GRID_H,BARGE_PLATFORM_GRID_W,BARGE_PLATFORM_HEIGHT,BARGE_PLATFORM_WIDTH,BARGE_UPGRADE_COST,BASE_OXYGEN,deepScale,diverFrameCounts,ENTITY_SCALE,FUEL_REFILL_AMOUNT,FUEL_REFILL_COST,MINE_FUEL_COST,SUB_REPAIR_COST_PER_POINT,TILE,WORLD_H,WORLD_W } from './constants';
import { biomeFish,biomeFlora,shopItems,subDefs,tiles,upgrades } from './content';
import { state,ui } from './state';
import { rng } from './rng';
import { clearFullscreenWarning,meter,renderHud,showFullscreenWarning } from './hud';
import type { DeepdiveScene } from './scene';

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
  const nx = (x - room.x) / (room.rx * scale);
  const ny = (y - room.y) / (room.ry * scale);
  return nx * nx + ny * ny <= 1;
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
  if (quest.kind === 'depth') return state.maxDepth;
  if (quest.kind === 'scan') return state.scannedSpecies.size;
  if (quest.kind === 'ore') return state.oreSoldCredits;
  if (quest.kind === 'nest') return quest.progress;
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

export const faunaFrameCounts: Record<string, number> = {
  'fauna-shallow-lantern-fry': 4,
  'fauna-shallow-snap-shrimp': 4,
  'fauna-shallow-glass-ray': 4,
  'fauna-shallow-comb-jelly': 4,
  'fauna-shallow-squid': 4,
  'fauna-shallow-nautilus': 4,
  'fauna-shallow-jellyfish': 4,
  'fauna-shallow-mantis-shrimp': 5,
  'fauna-shallow-blue-ring-octopus': 4,
  'fauna-shallow-octopus': 4,
  'fauna-deep-ash-minnow': 4,
  'fauna-deep-deep-shrimp': 5,
  'fauna-deep-hatchetfish': 4,
  'fauna-deep-barreleye': 3,
  'fauna-deep-glass-squid': 4,
  'fauna-deep-vampire-squid': 4,
  'fauna-deep-lanternfish': 4,
  'fauna-deep-gulper-eel': 3,
  'fauna-deep-tripodfish': 3,
  'fauna-deep-sea-spider': 4,
  'fauna-abyss-mirror-fry': 3,
  'fauna-abyss-hadal-shrimp': 4,
  'fauna-abyss-abyss-jelly': 4,
  'fauna-abyss-bigfin-squid': 3,
  'fauna-abyss-viperfish': 3,
  'fauna-abyss-hatchet-school': 2,
  'fauna-abyss-lantern-swarm': 2,
  'fauna-abyss-goblin-shark': 3,
  'fauna-abyss-frilled-shark': 3,
  'fauna-abyss-black-swallower': 3,
  'fauna-abyss-static-fry': 4,
  'fauna-abyss-vampire-squid': 4,
  'fauna-abyss-microfish': 3,
  'fauna-abyss-anglerfish': 3,
  'fauna-abyss-snipe-eel': 3,
  'fauna-abyss-medusa': 3,
  'fauna-deep-deep-jelly': 4,
};

export function loadGeneratedAssets(scene: Phaser.Scene) {
  const assetPath = (name: string) => `/assets/generated/${name}.png`;
  const audioPath = (name: string) => `/assets/audio/${name}`;
  for (const [animation, frameCount] of Object.entries(diverFrameCounts)) {
    for (let i = 0; i < frameCount; i += 1) {
      scene.load.image(`diver-${animation}-${i}`, assetPath(`diver-${animation}-${i}`));
    }
  }
  for (let i = 0; i < 4; i += 1) scene.load.image(`sub-cutter-beam-${i}`, assetPath(`sub-cutter-beam-${i}`));
  for (const base of ['fish-shallow-neutral', 'fish-shallow-predator', 'fish-mid-neutral', 'fish-mid-predator', 'fish-abyss-predator']) {
    for (let i = 0; i < fishFrameCount(base); i += 1) scene.load.image(`${base}-${i}`, assetPath(`${base}-${i}`));
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
  for (let i = 0; i < 4; i += 1) scene.load.image(`bobbit-${i}`, assetPath(`bobbit-${i}`));
  for (const key of parallaxTextureKeys()) scene.load.image(key, assetPath(key));
  for (const key of uiTextureKeys()) scene.load.image(key, assetPath(key));
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

export function parallaxPrefix() {
  if (state.biome === 1) return 'parallax-shallow';
  if (state.biome === 2) return 'parallax-brine';
  return 'parallax-deep';
}

export function parallaxSpeeds() {
  if (state.biome === 1) return [1, 0.8, 0.5, 0.16];
  if (state.biome === 2) return [1, 0.8, 0.5, 0.16];
  return [0.76, 0.48, 0.28, 0.12];
}

export function parallaxAlphas() {
  if (state.biome === 1) return [0.72, 0.58, 0.42, 0.52];
  if (state.biome === 2) return [0.82, 0.68, 0.54, 0.46];
  return [0.56, 0.48, 0.42, 0.5];
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

export function tileTextureKey(tile: Tile, x: number, y: number) {
  const variant = terrainTileVariant(x, y);
  if (tile === 'sand') return biomeTerrainTextureKey('sand', variant);
  if (tile === 'stone') {
    return hostRockTextureKey(x, y);
  }
  if (tile === 'bedrock' || tile === 'anchorstone') return biomeTerrainTextureKey('alloy', variant);
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
  return Math.floor(hash(x * 19, y * 23, rng.seed) * 5) % 5;
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
  if (state.biome === 1) return species.hazardous ? 'flora-shallow-anemone' : 'flora-shallow-kelp';
  return species.hazardous || species.rare ? 'flora-deep-coral' : 'flora-deep-tube';
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
  if (faunaFrameCounts[assetKey]) return faunaFrameCounts[assetKey];
  if (assetKey === 'fish-shallow-neutral') return 4;
  if (assetKey === 'fish-shallow-predator') return 4;
  if (assetKey === 'fish-mid-neutral') return 4;
  if (assetKey === 'fish-mid-predator') return 4;
  if (assetKey === 'fish-abyss-predator') return 4;
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
  const dangerBonus = target.kind === 'fish'
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
  if (state.biome === 3) return 'Black Swallower';
  return 'Black Swallower';
}

export function lifeCatalogTotal() {
  return biomeFish[state.biome].length + biomeFlora[state.biome].length;
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
  return 45000;
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
  return Phaser.Math.Clamp(0.05 + darkness * 0.34, 0, 0.38);
}

export function darknessOpacity(darkness: number) {
  return Phaser.Math.Clamp(darkness * 0.95, 0, 1);
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
  state.radioMessages = [];
  state.radioIndex = 0;
  state.radioOpen = false;
  state.selectedSubTier = null;
  state.activeSub = null;
  state.carrierSub = null;
  state.pilotingSub = false;
  state.auxSubActive = false;
  for (const tier of [1, 2, 3] as SubTier[]) state.subOwned[tier] = false;
  state.status = 'A new trench map is ready. Dive again.';
  state.started = true;
  for (const key of Object.keys(state.upgrades) as UpgradeId[]) state.upgrades[key] = 0;
  rng.seed = Math.floor(Math.random() * 1_000_000);
  scene.scene.restart();
  renderHud();
}

