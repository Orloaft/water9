import Phaser from 'phaser';

export type Tile =
  | 'water'
  | 'sand'
  | 'stone'
  | 'copper'
  | 'quartz'
  | 'ruby'
  | 'cobalt'
  | 'sunstone'
  | 'relic'
  | 'drownedIdol'
  | 'precursorEngine'
  | 'abyssalCrown'
  | 'alienAlloy'
  | 'ruinCore'
  | 'anchorstone'
  | 'bedrock';
export type UpgradeId = 'oxygen' | 'cargo' | 'laser' | 'lamp' | 'scanner' | 'suit' | 'speed' | 'thermal';
export type FishPattern = 'school' | 'sway' | 'glide' | 'stalk' | 'circle';
export type Biome = 1 | 2 | 3 | 4;
export type BargeTab = 'services' | 'items' | 'upgrades' | 'subs' | 'quests';
export type ScanRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ArticulatedCreatureState = 'patrol' | 'stalk' | 'lunge' | 'grab' | 'recover';
export type TitlePanel = 'main' | 'options' | 'controls';
export type SubTier = 1 | 2 | 3;
export type QuestKind = 'depth' | 'scan' | 'ore' | 'nest';
export type InventoryItemId =
  | Tile
  | 'stun-grenade'
  | 'dynamite'
  | 'flare'
  | 'oxygen-tank'
  | 'fuel-tank'
  | 'first-aid-kit'
  | 'antivenom'
  | 'injector-knife';
export type InventoryItemKind = 'ore' | 'artifact' | 'consumable' | 'tool' | 'rubble';
export type ThrownUtility = 'dynamite' | 'flare';
export type PlaytestCommand =
  | 'start'
  | 'dive'
  | 'dock'
  | 'setBiome'
  | 'grantCredits'
  | 'setCredits'
  | 'maxUpgrades'
  | 'buySub'
  | 'refill'
  | 'teleportDepth'
  | 'teleportToArticulated'
  | 'reviewArticulated'
  | 'damageArticulatedPart'
  | 'collideArticulated'
  | 'setOxygen'
  | 'setHull';
export type DiverAnimation =
  | 'idle'
  | 'walk'
  | 'swim'
  | 'boost'
  | 'descend'
  | 'ascend'
  | 'hover'
  | 'mine'
  | 'recoil'
  | 'damage'
  | 'die'
  | 'revive'
  | 'up'
  | 'down'
  | 'left'
  | 'right';

export interface TileDef {
  color: number;
  hp: number;
  value: number;
  name: string;
  solid: boolean;
}

export interface VeinRule {
  tile: Tile;
  minDepth: number;
  chance: number;
  minDarkness?: number;
  minSize: number;
  maxSize: number;
  salt: number;
}

export interface Upgrade {
  id: UpgradeId;
  name: string;
  baseCost: number;
  max: number;
  biome: Biome;
  text: string;
}

export interface Fish {
  kind: 'fish';
  species: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  speed: number;
  phase: number;
  color: number;
  hostile: boolean;
  scanned: boolean;
  scan: number;
  scanning: boolean;
  scanPulse: number;
  radius: number;
  pattern: FishPattern;
  bumpCooldown: number;
  aggro: number;
  stunned: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  hurtFlash: number;
  assetKey: string;
  facingSign: 1 | -1;
  sprite?: Phaser.GameObjects.Image;
}

export interface Flora {
  kind: 'flora';
  species: string;
  x: number;
  y: number;
  phase: number;
  color: number;
  hazardous: boolean;
  rare: boolean;
  scanned: boolean;
  scan: number;
  scanning: boolean;
  scanPulse: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  hurtFlash: number;
  radius: number;
  assetKey: string;
  sprite?: Phaser.GameObjects.Image;
}

export interface ArticulatedMotionManifest {
  kind: 'root' | 'body' | 'tail' | 'fin' | 'jaw';
  amplitude?: number;
  frequency?: number;
  phase?: number;
  lag?: number;
}

export interface ArticulatedPartManifest {
  id: string;
  textureKey: string;
  texture: string;
  parentId?: string;
  parentAnchor?: string;
  anchor?: string;
  anchors?: Record<string, [number, number]>;
  restOffset?: [number, number];
  inheritRotation?: boolean;
  rotationOffset?: number;
  offset: [number, number];
  origin: [number, number];
  size: [number, number];
  depth: number;
  hitRadius: number;
  hpMultiplier: number;
  damageMultiplier: number;
  motion: ArticulatedMotionManifest;
}

export interface ArticulatedCreatureManifest {
  id: string;
  species: string;
  minBiome: Biome;
  color: number;
  rarity: ScanRarity;
  radius: number;
  hp: number;
  speed: [number, number];
  spawn: {
    minDepth: number;
    maxDepth: number;
    count: number;
  };
  parts: ArticulatedPartManifest[];
}

export interface ArticulatedPartState {
  id: string;
  hp: number;
  maxHp: number;
  hurtFlash: number;
  jointStress: number;
  detached: boolean;
  detachVx: number;
  detachVy: number;
  detachAngularVelocity: number;
  terrainContact: number;
  terrainNormalX: number;
  terrainNormalY: number;
  x: number;
  y: number;
  rotation: number;
  sprite?: Phaser.GameObjects.Image;
}

export interface ArticulatedCreature {
  kind: 'articulated';
  id: string;
  species: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  speed: number;
  phase: number;
  posePitch: number;
  attackBlend: number;
  color: number;
  hostile: boolean;
  scanned: boolean;
  scan: number;
  scanning: boolean;
  scanPulse: number;
  radius: number;
  aggro: number;
  bumpCooldown: number;
  stunned: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  hurtFlash: number;
  facingSign: 1 | -1;
  state: ArticulatedCreatureState;
  stateTimer: number;
  grabTimer: number;
  grabCooldown: number;
  reviewFrozen?: boolean;
  manifest: ArticulatedCreatureManifest;
  parts: ArticulatedPartState[];
}

export type ScanTarget = Fish | Flora | ArticulatedCreature;

export interface FishSpecies {
  species: string;
  count: number;
  minY: number;
  maxY: number;
  color: number;
  hostile: boolean;
  pattern: FishPattern;
  radius: number;
  speed: [number, number];
  assetKey?: string;
}

export interface FloraSpecies {
  species: string;
  count: number;
  minY: number;
  maxY: number;
  color: number;
  hazardous: boolean;
  rare: boolean;
  radius: number;
}

export interface CargoItem {
  id: InventoryItemId;
  name: string;
  value: number;
  color: number;
  kind: InventoryItemKind;
  icon: string;
}

export interface Hazard {
  x: number;
  y: number;
  radius: number;
  phase: number;
  heat: number;
  sprite?: Phaser.GameObjects.Image;
}

export type BobbitState = 'hidden' | 'emerging' | 'lunging' | 'latched' | 'cooldown';

export interface Bobbit {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  latchX: number;
  latchY: number;
  facingSign: 1 | -1;
  phase: number;
  state: BobbitState;
  timer: number;
  escapeRemaining: number;
  cooldown: number;
  sprite?: Phaser.GameObjects.Image;
}

export type SpecialRoomKind = 'biolume' | 'nest';
export type NestEggState = 'dormant' | 'hatching' | 'hatched' | 'destroyed';

export interface SpecialRoom {
  id: string;
  kind: SpecialRoomKind;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rewardClaimed: boolean;
  failed?: boolean;
}

export interface NestEgg {
  roomId: string;
  x: number;
  y: number;
  radius: number;
  state: NestEggState;
  hatch: number;
  hp: number;
  phase: number;
  sprite?: Phaser.GameObjects.Image;
}

export interface Larva {
  roomId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  latched: boolean;
  latchCooldown: number;
  latchSlot: number;
  life: number;
  sprite?: Phaser.GameObjects.Image;
}

export interface LooseItem {
  id: InventoryItemId;
  name: string;
  value: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  radius: number;
  life: number;
  kind: InventoryItemKind;
  icon: string;
  utility?: ThrownUtility;
  landed?: boolean;
  fuse?: number;
}

export interface FloatingText {
  label: Phaser.GameObjects.Text;
  age: number;
  life: number;
  vx: number;
  vy: number;
}

export interface Flare {
  x: number;
  y: number;
  age: number;
  life: number;
}

export interface ControlState {
  move: Phaser.Math.Vector2;
  hasMove: boolean;
  mineHeld: boolean;
  scanHeld: boolean;
  boardHeld: boolean;
  scoutPressed: boolean;
  sonarPressed: boolean;
  useItemPressed: boolean;
  pausePressed: boolean;
  logbookPressed: boolean;
  confirmPressed: boolean;
}

export interface SonarContact {
  x: number;
  y: number;
  kind: 'fish' | 'flora' | 'predator' | 'barge';
  hostile: boolean;
  age: number;
}

export interface ShopItem {
  id: 'stun-grenade' | 'dynamite' | 'flare' | 'oxygen-tank' | 'fuel-tank' | 'first-aid-kit' | 'antivenom' | 'injector-knife';
  name: string;
  cost: number;
  icon: string;
  color: number;
  text: string;
  kind?: InventoryItemKind;
}

export interface RadioMessage {
  speaker: string;
  role: string;
  text: string;
  from?: 'npc' | 'player';
}

export interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  client: string;
  text: string;
  reward: number;
  target: number;
  progress: number;
  startValue: number;
  accepted: boolean;
  completed: boolean;
  claimed: boolean;
  rare?: boolean;
}

export interface SubDef {
  tier: SubTier;
  name: string;
  cost: number;
  hull: number;
  oxygen: number;
  fuel: number;
  cargo: number;
  speed: number;
  text: string;
  features: string[];
}

export interface SubVehicle {
  tier: SubTier;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingSign: 1 | -1;
  hull: number;
  oxygen: number;
  fuel: number;
  boardProgress: number;
  weaponCooldown: number;
}

export interface AuxSub {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  sprite?: Phaser.GameObjects.Image;
}

declare global {
  interface Window {
    __AQUA_PLAYTEST__?: {
      snapshot: () => unknown;
      command: (command: PlaytestCommand, value?: unknown) => unknown;
      grantCredits: (amount: number) => unknown;
    };
  }
}
