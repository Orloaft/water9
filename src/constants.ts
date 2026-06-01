import type { DiverAnimation } from './types';

export const TILE = 24;
export const WORLD_W = 104;
export const WORLD_H = 420;
export const SURFACE_Y = TILE * 4;
export const TARGET_DEPTH = 1500;
export const BARGE_UPGRADE_COST = 5000;
export const deepScale = WORLD_H / 156;
export const ENTITY_SCALE = 0.72;
export const CAMERA_ZOOM_MULTIPLIER = 2;
export const PLAYER_COLLISION_RADIUS = 8;
export const PLAYER_CONTACT_RADIUS = 10;
export const PLAYER_PICKUP_RADIUS = 18;
export const PLAYER_FORWARD_REACH = 26;
export const PLAYER_DRAW_SCALE = 0.74;
export const BARGE_DRAW_SCALE = 0.78;
export const BARGE_DOCK_Y = 64;
export const BARGE_PLATFORM_GRID_W = 25;
export const BARGE_PLATFORM_GRID_H = 3;
export const BARGE_PLATFORM_ENTRANCE_LEFT = 11;
export const BARGE_PLATFORM_ENTRANCE_RIGHT = 13;
export const BARGE_PLATFORM_ENTRANCE_TOP = 2;
export const BARGE_PLATFORM_WIDTH = BARGE_PLATFORM_GRID_W * TILE;
export const BARGE_PLATFORM_HEIGHT = BARGE_PLATFORM_GRID_H * TILE;
export const BARGE_ENTRY_Y = BARGE_PLATFORM_HEIGHT - 8;
export const BARGE_ENTRY_HALF_WIDTH = ((BARGE_PLATFORM_ENTRANCE_RIGHT - BARGE_PLATFORM_ENTRANCE_LEFT + 1) * TILE) / 2 + 8;
export const BARGE_DOCKING_ZONE_Y = BARGE_PLATFORM_HEIGHT;
export const BARGE_DOCKING_HALF_WIDTH = BARGE_ENTRY_HALF_WIDTH + 8;
export const FUEL_REFILL_AMOUNT = 50;
export const FUEL_REFILL_COST = 35;
export const MINE_FUEL_COST = 0.18;
export const SONAR_FUEL_COST = 1.5;
export const SONAR_REVEAL_RADIUS_TILES = 16;
export const SONAR_ATTRACT_RADIUS = 390;
export const SONAR_COOLDOWN = 0.75;
export const STUN_GRENADE_COST = 850;
export const STUN_GRENADE_RADIUS = 310;
export const STUN_GRENADE_DURATION = 5;
export const DYNAMITE_COST = 200;
export const DYNAMITE_RADIUS_TILES = 2;
export const DYNAMITE_LAND_FUSE = 0.42;
export const FLARE_COST = 50;
export const FLARE_DURATION = 36;
export const FLARE_LIGHT_RADIUS = 112;
export const OXYGEN_TANK_COST = 900;
export const OXYGEN_TANK_REFILL = 100;
export const FUEL_TANK_COST = 700;
export const FUEL_TANK_REFILL = 50;
export const FIRST_AID_COST = 760;
export const FIRST_AID_REPAIR = 42;
export const ANTIVENOM_COST = 980;
export const INJECTOR_KNIFE_COST = 1600;
export const INJECTOR_KNIFE_RANGE = 42;
export const INJECTOR_KNIFE_DAMAGE = 13;
export const BLEED_RECENT_WINDOW = 9;
export const BLEED_TRIGGER_BITES = 3;
export const BLEED_DURATION = 18;
export const BLEED_HULL_DRAIN = 0.72;
export const LIFE_CUTTER_FUEL_COST = 1.15;
export const LIFE_CUTTER_DAMAGE = 18;
export const DYNAMITE_LIFE_DAMAGE = 85;
export const VENOM_HULL_DRAIN = 2.1;
export const VENOM_TICK_SECONDS = 3.6;
export const BIOLUME_CAVERN_CHANCE = 0.05;
export const NEST_CHAMBER_CHANCE = 0.05;
export const OASIS_OXYGEN_REFILL = 32;
export const EGG_HATCH_SECONDS = 1.25;
export const EGG_DETECTION_RADIUS = 68;
export const EGG_CUTTER_FUEL_COST = 2.6;
export const EGG_HP = 8;
export const NEST_CLEAR_REWARD = 3800;
export const THROWN_ITEM_GRAVITY = 132;
export const THROWN_ITEM_SPEED = 92;
export const THROWN_ITEM_MAX_FALL_SPEED = 130;
export const BOBBIT_DETECT_RADIUS = 132;
export const BOBBIT_LATCH_RADIUS = 32;
export const BOBBIT_ESCAPE_SECONDS = 5;
export const FISH_BITE_SFX_GAP_MS = 320;
export const BASE_OXYGEN = 150;
export const SUB_BOARD_SECONDS = 1.25;
export const SUB_FUEL_CELL = 90;
export const SUB_FUEL_COST = 380;
export const SUB_OXYGEN_CELL = 120;
export const SUB_OXYGEN_COST = 420;
export const SUB_REPAIR_COST_PER_POINT = 6;
export const audioKeys = {
  menu: 'audio-menu-loop',
  ambient: 'audio-ambient-loop',
  mining: 'audio-mining-loop',
  oxygen: 'audio-out-of-oxygen',
  sonar: 'audio-sonar-ping',
} as const;
export const audioVolumes = {
  menuTitle: 0.21,
  ambient: 0.34,
  mining: 0.38,
  oxygen: 0.62,
  sonar: 0.56,
} as const;
export const diverFrameCounts: Record<DiverAnimation, number> = {
  idle: 11,
  walk: 7,
  swim: 7,
  boost: 5,
  descend: 4,
  ascend: 4,
  hover: 4,
  mine: 8,
  recoil: 3,
  damage: 3,
  die: 7,
  revive: 4,
  up: 4,
  down: 4,
  left: 4,
  right: 4,
};
