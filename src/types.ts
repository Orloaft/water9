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
export type FishBehaviorClass = 'legacySwimmer' | 'sessileAttached' | 'verticalAnchored' | 'benthicWalker';
export type TerrainAffinity = 'openWater' | 'nearTerrain' | 'bottom' | 'wall' | 'surfaceAttached';
export type Biome = 1 | 2 | 3 | 4;
export type EnvironmentDepthBand = 'surface' | 'upper' | 'mid' | 'lower' | 'transitionDeep';
export type EnvironmentBackgroundRepeatMode = 'repeatXY' | 'repeatXClampY' | 'bandClampY' | 'worldSpaceNoise' | 'anchor';
export type EnvironmentPainterlyBackgroundRole = 'bandPlate' | 'landmark' | 'textureMask' | 'moodReference';
export type EnvironmentReadabilityRisk = 'low' | 'medium' | 'high';
export type BargeTab = 'services' | 'items' | 'upgrades' | 'subs' | 'quests';
export type ScanRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ArticulatedCreatureState = 'patrol' | 'stalk' | 'lunge' | 'grab' | 'recover';
export type TitlePanel = 'main' | 'options' | 'controls';
export type SubTier = 1 | 2 | 3;
export type QuestKind = 'depth' | 'scan' | 'sample' | 'ore' | 'nest' | 'gulperSurvey' | 'forwardOutpost';
export type ToolId = 'drill' | 'scanner' | 'sonar' | 'sampler' | 'flare' | 'stun' | 'charge';
export type StoryMilestoneId = 'b1-first-signal' | 'b2-vent-proof' | 'b3-forward-pocket' | 'b4-reliquary-proof';
export interface StoryProgress {
  activeId: StoryMilestoneId | '';
  completed: StoryMilestoneId[];
  flags: Record<string, boolean>;
  heardRadio: string[];
}
export interface FinaleProgress {
  finalProofRecovered: boolean;
  endingSeen: boolean;
  heardRadio: string[];
  finalProofSpecies: string;
  finalProofDepth: number;
}
export type InventoryItemId =
  | Tile
  | 'stun-grenade'
  | 'dynamite'
  | 'flare'
  | 'oxygen-tank'
  | 'fuel-tank'
  | 'first-aid-kit'
  | 'antivenom'
  | 'injector-knife'
  | 'flora-sample';
export type InventoryItemKind = 'ore' | 'artifact' | 'sample' | 'consumable' | 'tool' | 'rubble';
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
  | 'teleportToReachableDepth'
  | 'teleportToCutoffOpenWater'
  | 'centerCameraOnPlayer'
  | 'clearProofOverlays'
  | 'teleportToFlora'
  | 'teleportToFauna'
  | 'faunaBehaviorReview'
  | 'terrainReview'
  | 'terrainLookReview'
  | 'terrainMiningReview'
  | 'miningPolishReview'
  | 'oreDepositReview'
  | 'backgroundReview'
  | 'lightingVisibilityReview'
  | 'strayOreDropReview'
  | 'interactionEdgeProof'
  | 'terrainMineAt'
  | 'perfGuardrailReview'
  | 'biomeLoadingReview'
  | 'entityLifecycleDiagnostics'
  | 'articulatedContactPolishReview'
  | 'teleportToArticulated'
  | 'teleportToBobbitBurrow'
  | 'forceBobbitTelegraph'
  | 'forceBobbitDrag'
  | 'liveArticulatedReview'
  | 'advanceLiveArticulatedReview'
  | 'largeThreatRippleTurnReview'
  | 'glasshookWallFoldReview'
  | 'articulatedBudgetReview'
  | 'focusArticulatedCamera'
  | 'reviewArticulated'
  | 'advanceArticulatedReview'
  | 'advanceArticulatedDamageReview'
  | 'damageArticulatedPart'
  | 'exerciseArticulatedToolDamage'
  | 'collideArticulated'
  | 'saveGame'
  | 'loadGame'
  | 'corruptSave'
  | 'clearSave'
  | 'acceptForwardOutpostQuest'
  | 'stageForwardOutpostSite'
  | 'establishForwardOutpost'
  | 'tickSystems'
  | 'setOxygen'
  | 'setHull'
  | 'recoverFinalProof'
  | 'completeFinaleAtBarge'
  | 'continueSurvey'
  | 'storyMilestoneSmokeStage'
  | 'progressionRadioQuestSmokeStage'
  | 'progressionRadioBackToBackSmokeStage'
  | 'progressionRadioTravelSmokeStage'
  | 'largeThreatDrillImmunityReview'
  | 'selectTool'
  | 'buyShopItem'
  | 'stageStunToolSmoke'
  | 'stageBargeSaleSmoke'
  | 'sampleQuestBoardsSmoke'
  | 'acceptSampleQuest'
  | 'claimActiveQuest'
  | 'selectedToolSmokeStage'
  | 'floraSamplerSmokeStage'
  | 'stampFloraSmokeStage'
  | 'brushFloraSmokeStage';
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

export interface TerrainBrushPlacement {
  key: string;
  textureKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
  flipX: boolean;
  flipY: boolean;
  alpha: number;
  depth: number;
  rotation?: number;
}

export interface TerrainVisualChunk {
  key: string;
  chunkX: number;
  chunkY: number;
  placements: TerrainBrushPlacement[];
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
  aggroCue: number;
  stunned: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  hurtFlash: number;
  assetKey: string;
  facingSign: 1 | -1;
  visualAngle?: number;
  visualFacingSign?: 1 | -1;
  visualTurnIntentSign?: 1 | -1;
  visualTurnIntentTime?: number;
  behaviorClass?: FishBehaviorClass;
  navTargetX?: number;
  navTargetY?: number;
  navWaypointTimer?: number;
  navReseedCooldown?: number;
  navStuckTimer?: number;
  navLastDistance?: number;
  navLastX?: number;
  navLastY?: number;
  navLastHeadingX?: number;
  navLastHeadingY?: number;
  navAvoidSign?: 1 | -1;
  navTerrainBounces?: number;
  navRecentTerrainBounces?: number;
  navTerrainBounceWindow?: number;
  navBlockedFeelers?: number;
  navLastBlockedFeelers?: number;
  navHeadingFlipCount?: number;
  navReseedCount?: number;
  simAccumulator?: number;
  simSkippedFrames?: number;
  navSpawnValidated?: boolean;
  navSpawnFallback?: boolean;
  terrainAffinity?: TerrainAffinity;
  surface?: TerrainSurfaceAnchor;
  anchor?: TerrainSurfaceAnchor['anchor'];
  anchorOffsetX?: number;
  anchorOffsetY?: number;
  anchorRefreshTimer?: number;
  rootX?: number;
  rootY?: number;
  rootOffsetX?: number;
  rootOffsetY?: number;
  retract?: number;
  tetherRadius?: number;
  walkDir?: 1 | -1;
  walkPause?: number;
  surfaceHopStartX?: number;
  surfaceHopStartY?: number;
  surfaceHopElapsed?: number;
  surfaceHopDuration?: number;
  lungeTimer?: number;
  recoverTimer?: number;
  grounded?: boolean;
  fallbackNoAnchor?: boolean;
  sprite?: Phaser.GameObjects.Image;
}

export interface Flora {
  kind: 'flora';
  species: string;
  source?: 'biome' | 'specialRoom' | 'stamp' | 'brush' | 'playtest';
  propId?: string;
  x: number;
  y: number;
  anchor: 'floor' | 'ceiling' | 'leftWall' | 'rightWall';
  phase: number;
  color: number;
  hazardous: boolean;
  rare: boolean;
  scanned: boolean;
  scan: number;
  scanning: boolean;
  scanPulse: number;
  sample: number;
  sampling: boolean;
  samplePulse: number;
  sampleCooldown: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  hurtFlash: number;
  aggroCue: number;
  radius: number;
  assetKey: string;
  surface?: TerrainSurfaceAnchor;
  sprite?: Phaser.GameObjects.Image;
}

export interface TerrainSurfaceAnchor {
  id: string;
  x: number;
  y: number;
  rootX: number;
  rootY: number;
  normalX: number;
  normalY: number;
  tangentX: number;
  tangentY: number;
  anchor: 'floor' | 'ceiling' | 'leftWall' | 'rightWall';
  tileX: number;
  tileY: number;
  maskSx: number;
  maskSy: number;
  support: number;
  clearance: number;
  source: 'terrain-mask';
}

export interface ArticulatedMotionManifest {
  kind: 'root' | 'body' | 'tail' | 'fin' | 'jaw';
  amplitude?: number;
  frequency?: number;
  phase?: number;
  lag?: number;
}

export type ArticulatedAnatomyRole = 'head' | 'jaw' | 'torso' | 'tail' | 'fin';

export interface ArticulatedAnatomyManifest {
  role: ArticulatedAnatomyRole;
  mass: number;
  drag: number;
  angularDrag: number;
  severable: boolean;
  breakThreshold: number;
  mobilityFactor?: number;
}

export interface ArticulatedPartManifest {
  id: string;
  textureKey: string;
  texture: string;
  detachedTextureKey?: string;
  detachedTexture?: string;
  damagedTextureKey?: string;
  damagedTexture?: string;
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
  anatomy?: ArticulatedAnatomyManifest;
  motion: ArticulatedMotionManifest;
}

export interface ArticulatedSocketStyleManifest {
  alpha?: number;
  bridgeAlpha?: number;
  bridgeStunnedAlpha?: number;
  bridgeCoreAlpha?: number;
  bridgeCoreStunnedAlpha?: number;
  bridgeColor?: number;
  bridgeCoreColor?: number;
  bridgeWidthScale?: number;
  bridgeSleeveScale?: number;
}

export interface ArticulatedMurkTintManifest {
  color: number;
  intensity: number;
  stunnedIntensity?: number;
}

export type ArticulatedBehaviorKind = 'serpent' | 'ambusher' | 'charger' | 'territorial' | 'passive';
export type ArticulatedRuntimeSpawnMode = 'accepted' | 'legacy' | 'prototype' | 'never';

export interface ArticulatedCombatManifest {
  behavior?: ArticulatedBehaviorKind;
  hostile?: boolean;
  detectionRange?: number;
  leashRange?: number;
  attackRange?: number;
  lungeSeconds?: number;
  lungeSpeedScale?: number;
  grabSeconds?: number;
  grabCooldown?: number;
  grabEnabled?: boolean;
  bitePartId?: string;
  biteAnchor?: string;
  contactPadding?: number;
  damageMultiplier?: number;
}

export interface ArticulatedRuntimeManifest {
  spawn?: ArticulatedRuntimeSpawnMode;
  focusSlice?: boolean;
}

export interface ArticulatedSocketOverlayManifest extends ArticulatedSocketStyleManifest {
  id: string;
  textureKey: string;
  texture: string;
  severedTextureKey?: string;
  severedTexture?: string;
  parentId: string;
  childId: string;
  offset: [number, number];
  origin: [number, number];
  size: [number, number];
  depth: number;
  rotationOffset?: number;
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
  combat?: ArticulatedCombatManifest;
  runtime?: ArticulatedRuntimeManifest;
  murkTint?: ArticulatedMurkTintManifest;
  socketStyle?: ArticulatedSocketStyleManifest;
  socketOverlays?: ArticulatedSocketOverlayManifest[];
  quality?: {
    status?: 'prototype' | 'accepted' | string;
    sourceCohesion?: string;
    backgroundKey?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    acceptanceNote?: string;
    sourceCandidateId?: string;
    visualChecklist?: Record<string, boolean>;
    visualScores?: Record<string, number>;
    visualNotes?: Record<string, string>;
    reviewEvidence?: Record<string, boolean>;
  };
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
  softRotation: number;
  softAngularVelocity: number;
  softInitialized: boolean;
  sprite?: Phaser.GameObjects.Image;
}

export interface ArticulatedSocketOverlayState {
  id: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  span: number;
  parentAnchorX: number;
  parentAnchorY: number;
  childAnchorX: number;
  childAnchorY: number;
  bridgeWidth: number;
  bridgeCoverage: number;
  parentCoverage: number;
  childCoverage: number;
  sprite?: Phaser.GameObjects.Image;
}

export interface ArticulatedSpineNodeState {
  partId: string;
  offset: number;
  bend: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  constraintError: number;
  initialized: boolean;
}

export interface ArticulatedTurnHistorySample {
  x: number;
  y: number;
  rotation: number;
  mirrorSide: 1 | -1;
  time: number;
  distance: number;
}

export interface ArticulatedTurnRuntime {
  heading: number;
  angularVelocity: number;
  mirrorSide: 1 | -1;
  mirrorIntentSide: 1 | -1;
  mirrorIntentTime: number;
  time: number;
  distance: number;
  history: ArticulatedTurnHistorySample[];
}

export interface ArticulatedCollisionDebug {
  partId: string;
  frontSign: 1 | -1;
  edgeX: number;
  edgeY: number;
  halfWidth: number;
  halfHeight: number;
  tileX: number;
  tileY: number;
  halfRows: number;
  writtenTiles: { x: number; y: number; tile: Tile }[];
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
  swimEffort: number;
  color: number;
  hostile: boolean;
  scanned: boolean;
  scan: number;
  scanning: boolean;
  scanPulse: number;
  radius: number;
  aggro: number;
  aggroCue: number;
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
  simulationBudget?: {
    accumulator: number;
    lastTier: 'full' | 'near' | 'far' | 'offscreen';
    skippedFrames: number;
    fullSteps: number;
    skippedSteps: number;
  };
  reviewFrozen?: boolean;
  collisionDebug?: ArticulatedCollisionDebug;
  bobbitBurrow?: ArticulatedBobbitRuntime;
  manifest: ArticulatedCreatureManifest;
  parts: ArticulatedPartState[];
  spine: ArticulatedSpineNodeState[];
  socketOverlays: ArticulatedSocketOverlayState[];
  turn?: ArticulatedTurnRuntime;
}

export type ScanTarget = Fish | Flora | ArticulatedCreature;

export type BobbitBurrowPhase = 'burrowed' | 'telegraph' | 'emerge' | 'lunge' | 'drag' | 'release' | 'reset';

export interface BobbitBurrow {
  id: string;
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  shaftTopY: number;
  shaftBottomY: number;
  anchorX: number;
  anchorY: number;
  approachX: number;
  approachY: number;
  approachRadius: number;
  bodySpaceTopY: number;
  bodySpaceBottomY: number;
  spawnCreatureId: 'abyssal-mandible-bobbit';
  occupied: boolean;
  triggered: boolean;
  cooldown: number;
  debugScore: number;
}

export type EncounterReservationRole = 'burrow_ambush' | 'open_water_arena' | 'ruin_route' | 'side_tunnel_ambush';

export interface EncounterReservation {
  id: string;
  role: EncounterReservationRole;
  creatureId: string;
  biome: Biome;
  homeX: number;
  homeY: number;
  tileBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  depthMin: number;
  depthMax: number;
  clearanceRadius: number;
  exclusionRadius: number;
  source?: string;
  score?: number;
  occupied: boolean;
  bobbitBurrowId?: string;
}

export interface ArticulatedBobbitRuntime {
  burrowId: string;
  phase: BobbitBurrowPhase;
  phaseTimer: number;
  escapeRemaining: number;
  dragTimer: number;
  captured: 'player' | 'sub' | null;
  lastSafeX: number;
  lastSafeY: number;
  mouthLatchOffsetX: number;
  mouthLatchOffsetY: number;
  biteRegistered: boolean;
}

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
  behaviorClass?: FishBehaviorClass;
  terrainAffinity?: TerrainAffinity;
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

export type EnvironmentPropKind = 'rock' | 'ore' | 'terrainFlora';

export interface EnvironmentProp {
  id: string;
  kind: EnvironmentPropKind;
  assetKey: string;
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  tile?: Tile;
  width: number;
  height: number;
  rotation: number;
  alpha: number;
  depth: number;
  originX?: number;
  originY?: number;
  flipX?: boolean;
  flipY?: boolean;
}

export interface CargoItem {
  id: InventoryItemId;
  name: string;
  value: number;
  color: number;
  kind: InventoryItemKind;
  icon: string;
  sampleSpecies?: string;
}

export interface Hazard {
  x: number;
  y: number;
  radius: number;
  phase: number;
  heat: number;
  surface?: TerrainSurfaceAnchor;
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
  effectX?: number;
  effectY?: number;
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
  exposed?: boolean;
  pickupDelay?: number;
  collected?: boolean;
  phase?: number;
  sourceTileX?: number;
  sourceTileY?: number;
  sampleSpecies?: string;
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

export interface ForwardOutpost {
  active: boolean;
  x: number;
  y: number;
  biome: Biome;
  depth: number;
  oxygenRadius: number;
  oxygenRate: number;
  charge: number;
  maxCharge: number;
  floraSpecies: string;
}

export interface ControlState {
  move: Phaser.Math.Vector2;
  hasMove: boolean;
  mineHeld: boolean;
  scanHeld: boolean;
  boardHeld: boolean;
  boardPressed: boolean;
  scoutPressed: boolean;
  sonarPressed: boolean;
  sonarMapPressed: boolean;
  useItemPressed: boolean;
  pausePressed: boolean;
  cancelPressed: boolean;
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

export interface ProgressionRadioEvent {
  id: string;
  type: 'quest' | 'arrival';
  biome: Biome;
  questKind?: QuestKind;
  questId?: string;
  target?: number;
  resultDepth?: number;
  floraSpecies?: string;
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
  grantsMarlinVoucher?: boolean;
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
    __AQUA_SANDBOX__?: {
      snapshot: () => unknown;
      setMode: (mode: 'idle' | 'lunge' | 'stunned') => unknown;
    };
  }
}
