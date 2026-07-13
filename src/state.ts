import type { BargeTab, Biome, CargoItem, FinaleProgress, ProgressionRadioEvent, Quest, RadioMessage, SonarContact, StoryProgress, SubTier, SubVehicle, TitlePanel, ToolId, UpgradeId } from './types';
import { BASE_OXYGEN,FORWARD_OUTPOST_MAX_CHARGE,FORWARD_OUTPOST_OXYGEN_RADIUS,FORWARD_OUTPOST_OXYGEN_REFILL } from './constants';
import { createDefaultUnlockedTools } from './tools';

export const ACCESSIBILITY_STORAGE_KEY = 'water9.accessibility.v1';

function initialCameraLeadEnabled() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY) : null;
    if (!raw) return true;
    const value = JSON.parse(raw) as { cameraLeadEnabled?: unknown };
    return value.cameraLeadEnabled !== false;
  } catch {
    return true;
  }
}

export const state = {
  biome: 1 as Biome,
  credits: 0,
  oxygen: BASE_OXYGEN,
  hull: 100,
  fuel: 100,
  depth: 0,
  maxDepth: 0,
  oreSoldCredits: 0,
  cargo: [] as CargoItem[],
  selectedCargoIndex: 0,
  selectedTool: 'drill' as ToolId,
  unlockedTools: createDefaultUnlockedTools(),
  sonarRevealed: new Set<string>(),
  sonarRevealRevision: 0,
  sonarContacts: [] as SonarContact[],
  scannedSpecies: new Set<string>(),
  sampledSpecies: new Set<string>(),
  upgrades: {
    oxygen: 0,
    cargo: 0,
    laser: 0,
    lamp: 0,
    scanner: 0,
    suit: 0,
    speed: 0,
    thermal: 0,
  } satisfies Record<UpgradeId, number>,
  status: 'Launch from the boat, mine minerals, scan fish, then surface to upgrade.',
  atBoat: true,
  docked: true,
  paused: false,
  sonarMapOpen: false,
  sonarMapPanX: 0,
  sonarMapPanY: 0,
  sonarMapZoom: 1,
  logbookOpen: false,
  cargoOpen: false,
  bargeTab: 'services' as BargeTab,
  questBoard: [] as Quest[],
  activeQuestId: '',
  forwardOutpost: {
    active: false,
    x: 0,
    y: 0,
    biome: 3 as Biome,
    depth: 0,
    oxygenRadius: FORWARD_OUTPOST_OXYGEN_RADIUS,
    oxygenRate: FORWARD_OUTPOST_OXYGEN_REFILL,
    charge: 0,
    maxCharge: FORWARD_OUTPOST_MAX_CHARGE,
    floraSpecies: '',
  },
  titlePanel: 'main' as TitlePanel,
  radioMessages: [] as RadioMessage[],
  radioIndex: 0,
  radioOpen: false,
  progressionRadioQueue: [] as ProgressionRadioEvent[],
  progressionRadioActiveId: '',
  musicEnabled: true,
  musicVolume: 1,
  sfxVolume: 1,
  unhardcore: false,
  cameraLeadEnabled: initialCameraLeadEnabled(),
  achievements: new Set<string>(),
  subOwned: {
    1: false,
    2: false,
    3: false,
  } as Record<SubTier, boolean>,
  selectedSubTier: null as SubTier | null,
  activeSub: null as SubVehicle | null,
  carrierSub: null as SubVehicle | null,
  pilotingSub: false,
  auxSubActive: false,
  marlinVoucherAvailable: false,
  story: {
    activeId: 'b1-first-signal',
    completed: [],
    flags: {},
    heardRadio: [],
  } satisfies StoryProgress,
  finale: {
    finalProofRecovered: false,
    endingSeen: false,
    heardRadio: [] as string[],
    finalProofSpecies: '',
    finalProofDepth: 0,
  } satisfies FinaleProgress,
  won: false,
  lost: false,
  started: false,
  biomeLoading: {
    active: false,
    biome: 1 as Biome,
    title: '',
    status: '',
    progress: 0,
    phase: 'idle' as 'idle' | 'staging' | 'generating' | 'complete',
    startedAt: 0,
    completedAt: 0,
  },
  saveLoad: {
    phase: 'idle' as 'idle' | 'loading' | 'complete' | 'error',
    requestId: 0,
    completedId: 0,
    message: '',
  },
  controller: {
    connected: false,
    name: '',
    index: -1,
    lastSeenAt: 0,
    lastInputAt: 0,
    message: '',
    apiSupported: false,
    secureContext: false,
    hasFocus: false,
    lastPollAt: 0,
    lastGestureAt: 0,
    rawPadCount: 0,
    connectedPadCount: 0,
    buttons: [] as number[],
    axes: [] as number[],
    lastAction: '',
    lastActionAt: 0,
    hint: 'Click the game, then press any controller button.',
  },
  oxygenWarnings: {
    half: false,
    quarter: false,
  },
  venom: {
    active: false,
    source: '',
    tick: 0,
  },
  bleed: {
    active: false,
    source: '',
    duration: 0,
    stacks: 0,
    recentBites: 0,
    recentTimer: 0,
  },
};

export function setCameraLeadEnabled(enabled: boolean) {
  state.cameraLeadEnabled = Boolean(enabled);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify({
        schema: 'water9/accessibility',
        version: 1,
        cameraLeadEnabled: state.cameraLeadEnabled,
      }));
    }
  } catch {
    // The option remains active for this session when persistence is unavailable.
  }
}

export const ui = { eventsBound: false, focusKey: '' };
