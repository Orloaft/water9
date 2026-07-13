import Phaser from 'phaser';
import type { Biome,CargoItem,FinaleProgress,ForwardOutpost,ProgressionRadioEvent,Quest,StoryProgress,SubTier,SubVehicle,Tile,ToolId,UpgradeId } from './types';
import { BASE_OXYGEN,FORWARD_OUTPOST_MAX_CHARGE,FORWARD_OUTPOST_OXYGEN_RADIUS,FORWARD_OUTPOST_OXYGEN_REFILL,SURFACE_Y,TILE,WORLD_H,WORLD_W } from './constants';
import { state } from './state';
import { rng } from './rng';
import { clampSelectedCargoIndex,clearBleed,clearVenom,createDefaultStoryProgress,createSubVehicle,fuelMax,hullMax,normalizeStoryProgress,oxygenMax,resetOxygenWarnings,syncStoryProgress } from './helpers';
import { normalizeSelectedTool, normalizeUnlockedTools } from './tools';
import type { DeepdiveScene } from './scene';
import { rebuildTerrainMask,syncTerrainMaskTile,TERRAIN_MASK_HEIGHT,TERRAIN_MASK_WIDTH } from './terrain-mask';
import { normalizeProgressionRadioQueue } from './progression-radio';

export const SAVE_STORAGE_KEY = 'water9.save.v1';
export const SAVE_VERSION = 1;

const tileToCode: Record<Tile, string> = {
  water: '0',
  sand: '1',
  stone: '2',
  copper: '3',
  quartz: '4',
  ruby: '5',
  cobalt: '6',
  sunstone: '7',
  relic: '8',
  drownedIdol: '9',
  precursorEngine: 'a',
  abyssalCrown: 'b',
  alienAlloy: 'c',
  ruinCore: 'd',
  anchorstone: 'e',
  bedrock: 'f',
};
const codeToTile = Object.fromEntries(Object.entries(tileToCode).map(([tile, code]) => [code, tile])) as Record<string, Tile>;
const upgradeIds: UpgradeId[] = ['oxygen', 'cargo', 'laser', 'lamp', 'scanner', 'suit', 'speed', 'thermal'];
const subTiers: SubTier[] = [1, 2, 3];

interface SavedSub {
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

interface SavedGame {
  schema: 'water9/save';
  version: typeof SAVE_VERSION;
  savedAt: string;
  seed: number;
  biome: Biome;
  state: {
    credits: number;
    oxygen: number;
    hull: number;
    fuel: number;
    depth: number;
    maxDepth: number;
    oreSoldCredits: number;
    cargo: CargoItem[];
    selectedCargoIndex: number;
    selectedTool?: ToolId;
    unlockedTools?: Partial<Record<ToolId, boolean>>;
    sonarRevealed: string[];
    scannedSpecies: string[];
    sampledSpecies?: string[];
    upgrades: Record<UpgradeId, number>;
    achievements: string[];
    questBoard: Quest[];
    activeQuestId: string;
    forwardOutpost?: ForwardOutpost;
    subOwned: Record<SubTier, boolean>;
    selectedSubTier: SubTier | null;
    activeSub: SavedSub | null;
    carrierSub: SavedSub | null;
    pilotingSub: boolean;
    auxSubActive: boolean;
    marlinVoucherAvailable?: boolean;
    story?: StoryProgress;
    progressionRadioQueue?: ProgressionRadioEvent[];
    finale?: FinaleProgress;
    won: boolean;
    lost: boolean;
    started: boolean;
    atBoat: boolean;
    docked: boolean;
  };
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    facingX: number;
    facingY: number;
    facingSign: 1 | -1;
  };
  world?: {
    width: number;
    height: number;
    tiles: string[];
    damage: Array<[number, number, number]>;
  };
}

let pendingLoad: SavedGame | null = null;

export function hasSavedGame() {
  return readRawSave() !== null;
}

export function saveGame(this: DeepdiveScene) {
  const payload = buildSave(this);
  const raw = JSON.stringify(payload);
  try {
    storage()?.setItem(SAVE_STORAGE_KEY, raw);
  } catch {
    state.saveLoad = {
      phase: 'error',
      requestId: state.saveLoad.requestId,
      completedId: state.saveLoad.completedId,
      message: 'Save failed. Browser storage is unavailable or full.',
    };
    state.status = state.saveLoad.message;
    return { ok: false, reason: state.saveLoad.message };
  }
  state.saveLoad = {
    phase: 'complete',
    requestId: state.saveLoad.requestId,
    completedId: state.saveLoad.completedId,
    message: 'Game saved.',
  };
  state.status = `Game saved at ${new Date(payload.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
  return { ok: true, version: payload.version, savedAt: payload.savedAt, bytes: raw.length };
}

export function loadGame(this: DeepdiveScene) {
  const parsed = parseSavedGame(readRawSave());
  if (!parsed.ok) {
    state.saveLoad = {
      phase: 'error',
      requestId: state.saveLoad.requestId,
      completedId: state.saveLoad.completedId,
      message: parsed.reason,
    };
    state.status = parsed.reason;
    return parsed;
  }
  const requestId = state.saveLoad.requestId + 1;
  pendingLoad = parsed.save;
  applySavedState(parsed.save);
  state.saveLoad = {
    phase: 'loading',
    requestId,
    completedId: state.saveLoad.completedId,
    message: 'Loading saved dive...',
  };
  state.status = 'Loading saved dive...';
  state.biomeLoading = {
    active: true,
    biome: parsed.save.biome,
    title: 'Loading save',
    status: 'Restoring diver position, cargo, and world state...',
    progress: 0.2,
    phase: 'staging',
    startedAt: performance.now(),
    completedAt: 0,
  };
  // Keep the active scene and its loader intact. A scene restart while preload is
  // still settling can requeue partial texture sets, and restoring terrain alone
  // leaves the restarted scene without generated fauna/flora GameObjects.
  if (this.sceneInitialized) this.beginBiomeGenerationTransition(0);
  return { ok: true, version: parsed.save.version, savedAt: parsed.save.savedAt, loadId: requestId };
}

export function clearSavedGame() {
  storage()?.removeItem(SAVE_STORAGE_KEY);
}

export function writeCorruptSaveForSmoke() {
  storage()?.setItem(SAVE_STORAGE_KEY, '{"schema":"water9/save","version":1,"state":');
}

export function applyPendingLoad(this: DeepdiveScene, options: { worldApplied?: boolean } = {}) {
  const save = pendingLoad;
  if (!save) return false;
  pendingLoad = null;
  applySavedState(save);
  if (!options.worldApplied) applySavedWorld(this, save);
  applySavedPlayer(this, save);
  this.terrainBoundsKey = '';
  this.terrainDirty = true;
  this.terrainVisualChunks.clear();
  this.terrainVisualDirtyChunks.clear();
  this.revealSonarAtPlayer(8);
  this.cameras.main.centerOn(this.player.x, this.player.y);
  const message = `Loaded save from ${new Date(save.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`;
  state.saveLoad = {
    phase: 'complete',
    requestId: state.saveLoad.requestId,
    completedId: state.saveLoad.requestId,
    message,
  };
  state.status = message;
  return true;
}

export function hasPendingLoadWorld() {
  return Boolean(pendingLoad?.world && savedWorldMatchesRuntime(pendingLoad.world));
}

export function applyPendingLoadWorld(this: DeepdiveScene) {
  const save = pendingLoad;
  if (!save || !savedWorldMatchesRuntime(save.world)) return false;
  applySavedState(save);
  applySavedWorld(this, save);
  return true;
}

function buildSave(scene: DeepdiveScene): SavedGame {
  return {
    schema: 'water9/save',
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    seed: rng.seed,
    biome: state.biome,
    state: {
      credits: finiteInt(state.credits, 0),
      oxygen: finiteNumber(state.oxygen, BASE_OXYGEN),
      hull: finiteNumber(state.hull, 100),
      fuel: finiteNumber(state.fuel, fuelMax()),
      depth: finiteInt(state.depth, 0),
      maxDepth: finiteInt(state.maxDepth, 0),
      oreSoldCredits: finiteInt(state.oreSoldCredits, 0),
      cargo: state.cargo.map((item) => ({ ...item })),
      selectedCargoIndex: finiteInt(state.selectedCargoIndex, 0),
      selectedTool: state.selectedTool,
      unlockedTools: { ...state.unlockedTools },
      sonarRevealed: [...state.sonarRevealed],
      scannedSpecies: [...state.scannedSpecies],
      sampledSpecies: [...state.sampledSpecies],
      upgrades: { ...state.upgrades },
      achievements: [...state.achievements],
      questBoard: state.questBoard.map((quest) => ({ ...quest })),
      activeQuestId: state.activeQuestId,
      forwardOutpost: { ...state.forwardOutpost },
      subOwned: { ...state.subOwned },
      selectedSubTier: state.selectedSubTier,
      activeSub: state.activeSub ? saveSub(state.activeSub) : null,
      carrierSub: state.carrierSub ? saveSub(state.carrierSub) : null,
      pilotingSub: state.pilotingSub,
      auxSubActive: state.auxSubActive,
      marlinVoucherAvailable: state.marlinVoucherAvailable,
      story: {
        activeId: state.story.activeId,
        completed: [...state.story.completed],
        flags: { ...state.story.flags },
        heardRadio: [...state.story.heardRadio],
      },
      progressionRadioQueue: state.progressionRadioQueue.map((event) => ({ ...event })),
      finale: {
        finalProofRecovered: state.finale.finalProofRecovered,
        endingSeen: state.finale.endingSeen,
        heardRadio: [...state.finale.heardRadio],
        finalProofSpecies: state.finale.finalProofSpecies,
        finalProofDepth: state.finale.finalProofDepth,
      },
      won: state.won,
      lost: state.lost,
      started: state.started,
      atBoat: state.atBoat,
      docked: state.docked,
    },
    player: {
      x: finiteNumber(scene.player.x, WORLD_W * TILE * 0.5),
      y: finiteNumber(scene.player.y, SURFACE_Y + 54),
      vx: finiteNumber(scene.player.vx, 0),
      vy: finiteNumber(scene.player.vy, 0),
      facingX: finiteNumber(scene.player.facing.x, 0),
      facingY: finiteNumber(scene.player.facing.y, 1),
      facingSign: scene.player.facingSign,
    },
    world: encodeWorld(scene),
  };
}

function saveSub(sub: SubVehicle): SavedSub {
  return {
    tier: sub.tier,
    x: finiteNumber(sub.x, WORLD_W * TILE * 0.5),
    y: finiteNumber(sub.y, SURFACE_Y + 54),
    vx: finiteNumber(sub.vx, 0),
    vy: finiteNumber(sub.vy, 0),
    facingSign: sub.facingSign,
    hull: finiteNumber(sub.hull, 0),
    oxygen: finiteNumber(sub.oxygen, 0),
    fuel: finiteNumber(sub.fuel, 0),
    boardProgress: finiteNumber(sub.boardProgress, 0),
    weaponCooldown: finiteNumber(sub.weaponCooldown, 0),
  };
}

function restoreSub(saved: SavedSub | null): SubVehicle | null {
  if (!saved || !subTiers.includes(saved.tier)) return null;
  const sub = createSubVehicle(saved.tier, saved.x, saved.y);
  sub.vx = finiteNumber(saved.vx, 0);
  sub.vy = finiteNumber(saved.vy, 0);
  sub.facingSign = saved.facingSign === -1 ? -1 : 1;
  sub.hull = Math.max(0, finiteNumber(saved.hull, sub.hull));
  sub.oxygen = Math.max(0, finiteNumber(saved.oxygen, sub.oxygen));
  sub.fuel = Math.max(0, finiteNumber(saved.fuel, sub.fuel));
  sub.boardProgress = Phaser.Math.Clamp(finiteNumber(saved.boardProgress, 0), 0, 1);
  sub.weaponCooldown = Math.max(0, finiteNumber(saved.weaponCooldown, 0));
  return sub;
}

function applySavedState(save: SavedGame) {
  rng.seed = finiteInt(save.seed, rng.seed);
  state.biome = save.biome;
  state.credits = Math.max(0, finiteInt(save.state.credits, 0));
  state.oxygen = Phaser.Math.Clamp(finiteNumber(save.state.oxygen, BASE_OXYGEN), 0, oxygenMax());
  state.hull = Phaser.Math.Clamp(finiteNumber(save.state.hull, 100), 0, hullMax());
  state.fuel = Phaser.Math.Clamp(finiteNumber(save.state.fuel, fuelMax()), 0, fuelMax());
  state.depth = Math.max(0, finiteInt(save.state.depth, 0));
  state.maxDepth = Math.max(0, finiteInt(save.state.maxDepth, state.depth));
  state.oreSoldCredits = Math.max(0, finiteInt(save.state.oreSoldCredits, 0));
  state.cargo = Array.isArray(save.state.cargo) ? save.state.cargo.map((item) => ({ ...item })) : [];
  state.selectedCargoIndex = finiteInt(save.state.selectedCargoIndex, 0);
  clampSelectedCargoIndex();
  state.unlockedTools = normalizeUnlockedTools(save.state.unlockedTools);
  state.selectedTool = normalizeSelectedTool(save.state.selectedTool, state.unlockedTools);
  state.sonarRevealed = new Set(save.state.sonarRevealed.filter((entry) => typeof entry === 'string'));
  state.sonarRevealRevision += 1;
  state.sonarContacts = [];
  state.scannedSpecies = new Set(save.state.scannedSpecies.filter((entry) => typeof entry === 'string'));
  state.sampledSpecies = new Set((save.state.sampledSpecies ?? []).filter((entry) => typeof entry === 'string'));
  for (const id of upgradeIds) state.upgrades[id] = Math.max(0, finiteInt(save.state.upgrades[id], 0));
  state.achievements = new Set(save.state.achievements.filter((entry) => typeof entry === 'string'));
  state.questBoard = Array.isArray(save.state.questBoard) ? save.state.questBoard.map((quest) => ({ ...quest })) : [];
  state.activeQuestId = typeof save.state.activeQuestId === 'string' ? save.state.activeQuestId : '';
  state.forwardOutpost = restoreForwardOutpost(save.state.forwardOutpost);
  for (const tier of subTiers) state.subOwned[tier] = Boolean(save.state.subOwned[tier]);
  state.selectedSubTier = save.state.selectedSubTier && subTiers.includes(save.state.selectedSubTier) ? save.state.selectedSubTier : null;
  state.activeSub = restoreSub(save.state.activeSub);
  state.carrierSub = restoreSub(save.state.carrierSub);
  state.pilotingSub = Boolean(save.state.pilotingSub && state.activeSub);
  state.auxSubActive = Boolean(save.state.auxSubActive);
  state.marlinVoucherAvailable = Boolean(save.state.marlinVoucherAvailable && !state.subOwned[2]);
  state.story = normalizeStoryProgress(save.state.story ?? createDefaultStoryProgress());
  state.progressionRadioQueue = normalizeProgressionRadioQueue(save.state.progressionRadioQueue, state.story.heardRadio);
  state.progressionRadioActiveId = '';
  state.finale = restoreFinaleProgress(save.state.finale, Boolean(save.state.won));
  state.won = Boolean(save.state.won);
  state.lost = Boolean(save.state.lost);
  state.started = Boolean(save.state.started);
  state.atBoat = Boolean(save.state.atBoat);
  state.docked = Boolean(save.state.docked || state.atBoat);
  syncStoryProgress();
  state.paused = false;
  state.sonarMapOpen = false;
  state.sonarMapPanX = 0;
  state.sonarMapPanY = 0;
  state.sonarMapZoom = 1;
  state.logbookOpen = false;
  state.cargoOpen = false;
  state.radioOpen = false;
  state.radioIndex = 0;
  state.radioMessages = [];
  state.bargeTab = 'services';
  state.biomeLoading.active = false;
  state.biomeLoading.phase = 'idle';
  resetOxygenWarnings();
  clearVenom();
  clearBleed();
}

function restoreFinaleProgress(saved: FinaleProgress | undefined, won: boolean): FinaleProgress {
  const heardRadio = Array.isArray(saved?.heardRadio)
    ? saved.heardRadio.filter((entry) => typeof entry === 'string')
    : [];
  return {
    finalProofRecovered: Boolean(saved?.finalProofRecovered || won),
    endingSeen: Boolean(saved?.endingSeen),
    heardRadio,
    finalProofSpecies: typeof saved?.finalProofSpecies === 'string' ? saved.finalProofSpecies : '',
    finalProofDepth: Math.max(0, finiteInt(saved?.finalProofDepth, 0)),
  };
}

function restoreForwardOutpost(saved: ForwardOutpost | undefined): ForwardOutpost {
  if (!saved || !saved.active) {
    return {
      active: false,
      x: 0,
      y: 0,
      biome: 3,
      depth: 0,
      oxygenRadius: FORWARD_OUTPOST_OXYGEN_RADIUS,
      oxygenRate: FORWARD_OUTPOST_OXYGEN_REFILL,
      charge: 0,
      maxCharge: FORWARD_OUTPOST_MAX_CHARGE,
      floraSpecies: '',
    };
  }
  const biome = saved.biome === 1 || saved.biome === 2 || saved.biome === 3 || saved.biome === 4 ? saved.biome : 3;
  const maxCharge = Math.max(1, finiteNumber(saved.maxCharge, FORWARD_OUTPOST_MAX_CHARGE));
  return {
    active: true,
    x: finiteNumber(saved.x, WORLD_W * TILE * 0.5),
    y: finiteNumber(saved.y, SURFACE_Y + TILE * 150),
    biome,
    depth: Math.max(0, finiteInt(saved.depth, 0)),
    oxygenRadius: Math.max(24, finiteNumber(saved.oxygenRadius, FORWARD_OUTPOST_OXYGEN_RADIUS)),
    oxygenRate: Math.max(1, finiteNumber(saved.oxygenRate, FORWARD_OUTPOST_OXYGEN_REFILL)),
    charge: Phaser.Math.Clamp(finiteNumber(saved.charge, maxCharge), 0, maxCharge),
    maxCharge,
    floraSpecies: typeof saved.floraSpecies === 'string' ? saved.floraSpecies : '',
  };
}

function applySavedWorld(scene: DeepdiveScene, save: SavedGame) {
  const savedWorld = save.world;
  if (!savedWorldMatchesRuntime(savedWorld)) return;
  const rows = savedWorld.tiles.map((row) => [...row].map((code) => codeToTile[code] ?? 'water'));
  if (rows.some((row) => row.length !== WORLD_W)) return;
  const canPatchMask = scene.world.length === WORLD_H
    && scene.terrainMask.length === TERRAIN_MASK_WIDTH * TERRAIN_MASK_HEIGHT;
  const changedTiles: Array<[number, number]> = [];
  if (canPatchMask) {
    for (let y = 0; y < WORLD_H; y += 1) {
      for (let x = 0; x < WORLD_W; x += 1) {
        if (scene.world[y]?.[x] !== rows[y][x]) changedTiles.push([x, y]);
      }
    }
  }
  scene.world = rows;
  scene.damage = Array.from({ length: WORLD_H }, () => Array.from({ length: WORLD_W }, () => 0));
  for (const [x, y, amount] of savedWorld.damage) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) continue;
    scene.damage[y][x] = Math.max(0, finiteNumber(amount, 0));
  }
  if (canPatchMask && changedTiles.length <= 640) {
    for (const [x, y] of changedTiles) syncTerrainMaskTile(scene, x, y);
  } else {
    rebuildTerrainMask(scene);
  }
  scene.environmentProps = [];
  scene.populateEnvironmentProps();
}

function savedWorldMatchesRuntime(savedWorld: SavedGame['world'] | undefined) {
  return Boolean(
    savedWorld
    && savedWorld.width === WORLD_W
    && savedWorld.height === WORLD_H
    && savedWorld.tiles.length === WORLD_H
    && savedWorld.tiles.every((row) => typeof row === 'string' && row.length === WORLD_W)
  );
}

function applySavedPlayer(scene: DeepdiveScene, save: SavedGame) {
  scene.player.x = Phaser.Math.Clamp(finiteNumber(save.player.x, WORLD_W * TILE * 0.5), 20, WORLD_W * TILE - 20);
  scene.player.y = Phaser.Math.Clamp(finiteNumber(save.player.y, SURFACE_Y + 54), 20, WORLD_H * TILE - 20);
  scene.player.vx = finiteNumber(save.player.vx, 0);
  scene.player.vy = finiteNumber(save.player.vy, 0);
  scene.player.facing.set(finiteNumber(save.player.facingX, 0), finiteNumber(save.player.facingY, 1));
  if (scene.player.facing.lengthSq() < 0.01) scene.player.facing.set(0, 1);
  else scene.player.facing.normalize();
  scene.player.facingSign = save.player.facingSign === -1 ? -1 : 1;
  scene.player.mineCooldown = 0;
  scene.player.scanCooldown = 0;
  scene.player.sonarCooldown = 0;
  scene.player.scanTarget = null;
  if (state.activeSub && state.pilotingSub) {
    state.activeSub.x = scene.player.x;
    state.activeSub.y = scene.player.y;
  }
}

function encodeWorld(scene: DeepdiveScene): SavedGame['world'] | undefined {
  if (scene.world.length !== WORLD_H || scene.damage.length !== WORLD_H) return undefined;
  const tiles = scene.world.map((row) => row.map((tile) => tileToCode[tile] ?? tileToCode.water).join(''));
  const damage: Array<[number, number, number]> = [];
  for (let y = 0; y < WORLD_H; y += 1) {
    for (let x = 0; x < WORLD_W; x += 1) {
      const amount = scene.damage[y]?.[x] ?? 0;
      if (amount > 0) damage.push([x, y, Math.round(amount * 100) / 100]);
    }
  }
  return { width: WORLD_W, height: WORLD_H, tiles, damage };
}

function parseSavedGame(raw: string | null): { ok: true; save: SavedGame } | { ok: false; reason: string } {
  if (!raw) return { ok: false, reason: 'No saved game found.' };
  try {
    const value = JSON.parse(raw) as Partial<SavedGame>;
    if (value.schema !== 'water9/save') return { ok: false, reason: 'Saved game is not a Water9 save.' };
    if (value.version !== SAVE_VERSION) return { ok: false, reason: `Save version ${String(value.version)} is not supported by this build.` };
    if (!isBiome(value.biome) || typeof value.seed !== 'number' || !value.state || !value.player) {
      return { ok: false, reason: 'Saved game is missing required run data.' };
    }
    return { ok: true, save: value as SavedGame };
  } catch {
    return { ok: false, reason: 'Saved game is corrupt. Current run was left unchanged.' };
  }
}

function readRawSave() {
  return storage()?.getItem(SAVE_STORAGE_KEY) ?? null;
}

function storage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isBiome(value: unknown): value is Biome {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function finiteInt(value: unknown, fallback: number) {
  return Math.floor(finiteNumber(value, fallback));
}
