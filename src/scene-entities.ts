import Phaser from 'phaser';
import type { ArticulatedCreature,Bobbit,ControlState,Fish,FishPattern,Larva,LooseItem,NestEgg,ScanTarget,TerrainSurfaceAnchor } from './types';
import { BLEED_DURATION,BLEED_RECENT_WINDOW,BLEED_TRIGGER_BITES,BOBBIT_DETECT_RADIUS,BOBBIT_ESCAPE_SECONDS,BOBBIT_LATCH_RADIUS,DYNAMITE_LAND_FUSE,EGG_DETECTION_RADIUS,EGG_HATCH_SECONDS,FISH_BITE_SFX_GAP_MS,NEST_CLEAR_REWARD,OASIS_OXYGEN_REFILL,PLAYER_COLLISION_RADIUS,PLAYER_CONTACT_RADIUS,PLAYER_PICKUP_RADIUS,TARGET_DEPTH,THROWN_ITEM_GRAVITY,THROWN_ITEM_MAX_FALL_SPEED,TILE,WORLD_H } from './constants';
import { tiles,upgrades } from './content';
import { state,ui } from './state';
import { bargeSolidAtWorld,cargoCapacity,currentApexSpecies,oxygenMax,pointInRoom,predatorBiteCooldown,rarityColor,rarityLabel,recoverFinalProof,resetOxygenWarnings,scaledEntity,scannableRarity,scanReward,subDef,updateFacingFromVelocity,updateFishVisualFacing,venomousFish } from './helpers';
import { biomeName,renderHud } from './hud';
import type { DeepdiveScene } from './scene';
import { TERRAIN_MASK_RES,sampleTerrainSurfaceAnchors,terrainMaskContactForAabb,terrainMaskDensityAt,validateTerrainSurfaceAnchor,findNearbyTerrainSurfaceAnchor } from './terrain-mask';

type LegacyNavEnvelope = {
  feelerAngles: number[];
  horizon: number;
  sideBias: number;
  avoidance: number;
  waypointRadius: number;
  reseedCooldown: number;
};

const LEGACY_NAV_ENVELOPES: Record<FishPattern, LegacyNavEnvelope> = {
  school: { feelerAngles: [0, -0.52, 0.52, -0.96, 0.96], horizon: 1.08, sideBias: 0.34, avoidance: 1.15, waypointRadius: 95, reseedCooldown: 2.6 },
  glide: { feelerAngles: [0, -0.36, 0.36, -0.72, 0.72], horizon: 1.45, sideBias: 0.2, avoidance: 0.92, waypointRadius: 130, reseedCooldown: 3.1 },
  stalk: { feelerAngles: [0, -0.48, 0.48, -0.9, 0.9], horizon: 1.28, sideBias: 0.26, avoidance: 1.05, waypointRadius: 120, reseedCooldown: 2.3 },
  circle: { feelerAngles: [0, -0.56, 0.56, -1.05, 1.05], horizon: 1.02, sideBias: 0.42, avoidance: 1.2, waypointRadius: 90, reseedCooldown: 2.4 },
  sway: { feelerAngles: [0, -0.5, 0.5, -0.88, 0.88], horizon: 0.95, sideBias: 0.36, avoidance: 1.1, waypointRadius: 84, reseedCooldown: 2.5 },
};

const FISH_FULL_SIM_CAMERA_MARGIN = 180;
const FISH_FULL_SIM_PLAYER_MARGIN = 280;
const FISH_FAR_SIM_INTERVAL = 0.22;

function legacyFishContact(scene: DeepdiveScene, fish: Fish, x = fish.x, y = fish.y, padding = 1.5) {
  const half = Math.max(6, fish.radius + padding);
  const contact = terrainMaskContactForAabb(scene, x, y, half, half, { maxSamples: 24, includeBounds: true });
  if (contact) return contact;
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (scene.getTile(tx, ty) !== 'water') {
    const centerX = tx * TILE + TILE * 0.5;
    const centerY = ty * TILE + TILE * 0.5;
    const nx = x === centerX && y === centerY ? -(fish.vx || 1) : x - centerX;
    const ny = x === centerX && y === centerY ? -(fish.vy || 0) : y - centerY;
    const len = Math.max(1, Math.hypot(nx, ny));
    return { count: 1, samples: 1, nx: nx / len, ny: ny / len, density: 255 };
  }
  if (bargeSolidAtWorld(x, y)) {
    return { count: 1, samples: 1, nx: 0, ny: 1, density: 255 };
  }
  return null;
}

function legacyFishClearAt(scene: DeepdiveScene, fish: Fish, x: number, y: number, padding = 4) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (scene.getTile(tx, ty) !== 'water' || bargeSolidAtWorld(x, y)) return false;
  return !legacyFishContact(scene, fish, x, y, padding);
}

function legacyDensityNear(scene: DeepdiveScene, x: number, y: number) {
  const sx = Math.floor((x / TILE) * TERRAIN_MASK_RES);
  const sy = Math.floor((y / TILE) * TERRAIN_MASK_RES);
  return terrainMaskDensityAt(scene, sx, sy);
}

function rotateUnit(x: number, y: number, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

export function updateFish(this: DeepdiveScene, delta: number) {
    const camera = this.cameras.main;
    const tiers = { full: 0, throttled: 0, skipped: 0 };
    for (const fish of this.fish) {
      fish.phase += delta;
      fish.bumpCooldown = Math.max(0, fish.bumpCooldown - delta);
      fish.stunned = Math.max(0, fish.stunned - delta);
      fish.scanPulse = Math.max(0, fish.scanPulse - delta * 1.35);
      fish.hurtFlash = Math.max(0, fish.hurtFlash - delta * 4.2);
      fish.aggroCue = Math.max(0, fish.aggroCue - delta * 1.35);
      if (fish.dead) {
        fish.sprite?.setVisible(false);
        continue;
      }
      if (!fish.scanned && !fish.scanning) {
        fish.scan = Math.max(0, fish.scan - delta * 0.9);
      }
      fish.scanning = false;
      const simTier = fishSimulationTier(this, fish, camera);
      if (simTier !== 'full') {
        fish.simAccumulator = (fish.simAccumulator ?? 0) + delta;
        if (fish.simAccumulator < FISH_FAR_SIM_INTERVAL) {
          fish.simSkippedFrames = (fish.simSkippedFrames ?? 0) + 1;
          tiers.skipped += 1;
          continue;
        }
        const simDelta = Math.min(fish.simAccumulator, FISH_FAR_SIM_INTERVAL * 2.5);
        fish.simAccumulator = 0;
        fish.simSkippedFrames = 0;
        tiers.throttled += 1;
        updateDistantInactiveFish(this, fish, simDelta);
        continue;
      }
      tiers.full += 1;
      fish.simAccumulator = 0;
      fish.simSkippedFrames = 0;
      if (fish.stunned > 0) {
        fish.aggro = 0;
        fish.vx *= Math.exp(-4.6 * delta);
        fish.vy *= Math.exp(-4.6 * delta);
        if (fish.behaviorClass && fish.behaviorClass !== 'legacySwimmer') this.updateAnchoredFish(fish, delta);
      } else {
        if (fish.behaviorClass === 'sessileAttached') this.updateSessileFish(fish, delta);
        else if (fish.behaviorClass === 'verticalAnchored') this.updateVerticalAnchoredFish(fish, delta);
        else if (fish.behaviorClass === 'benthicWalker') this.updateBenthicWalkerFish(fish, delta);
        else this.steerFish(fish, delta);
      }
      if (!fish.behaviorClass || fish.behaviorClass === 'legacySwimmer') {
        fish.x += fish.vx * delta;
        fish.y += fish.vy * delta;
        this.keepFishInWater(fish);
        updateFacingFromVelocity(fish);
        updateFishVisualFacing(fish, delta);
      } else {
        this.updateAnchoredFish(fish, delta);
      }
      if (fish.stunned > 0) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance < fish.radius + PLAYER_CONTACT_RADIUS && fish.bumpCooldown <= 0 && !this.isAtBoat()) {
        this.bumpFish(fish, distance);
      }
    }
    if (this.perfTelemetry?.enabled) this.perfTelemetry.fishTiers = tiers;
  }

function fishSimulationTier(scene: DeepdiveScene, fish: Fish, camera: Phaser.Cameras.Scene2D.Camera): 'full' | 'distant' {
    if (fish.stunned > 0 || fish.hurtFlash > 0 || fish.scanning || fish.aggro > 0) return 'full';
    const view = camera.worldView;
    const margin = FISH_FULL_SIM_CAMERA_MARGIN + fish.radius;
    const visible = fish.x >= view.x - margin
      && fish.x <= view.right + margin
      && fish.y >= view.y - margin
      && fish.y <= view.bottom + margin;
    if (visible) return 'full';
    const dx = scene.player.x - fish.x;
    const dy = scene.player.y - fish.y;
    const playerRange = FISH_FULL_SIM_PLAYER_MARGIN + fish.radius + PLAYER_CONTACT_RADIUS;
    if (dx * dx + dy * dy <= playerRange * playerRange) return 'full';
    if (fish.hostile) {
      const detectionRange = (fish.pattern === 'circle' ? 245 : 205) + fish.radius * 3 + state.biome * 8;
      if (dx * dx + dy * dy <= detectionRange * detectionRange) return 'full';
    }
    return 'distant';
  }

function updateDistantInactiveFish(scene: DeepdiveScene, fish: Fish, delta: number) {
    if (fish.stunned > 0) {
      fish.vx *= Math.exp(-4.6 * delta);
      fish.vy *= Math.exp(-4.6 * delta);
      return;
    }
    if (fish.behaviorClass && fish.behaviorClass !== 'legacySwimmer') {
      scene.updateAnchoredFish(fish, delta);
      return;
    }
    const targetX = fish.homeX + Math.sin(fish.phase * 0.55 + fish.radius) * Math.min(80, fish.speed * 0.9);
    const targetY = fish.homeY + Math.cos(fish.phase * 0.42 + fish.radius) * Math.min(42, fish.speed * 0.42);
    const dx = targetX - fish.x;
    const dy = targetY - fish.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const desiredSpeed = fish.speed * 0.42;
    fish.vx += (dx / len) * desiredSpeed * delta * 1.6;
    fish.vy += (dy / len) * desiredSpeed * delta * 1.6;
    const speed = Math.hypot(fish.vx, fish.vy);
    const maxSpeed = Math.max(10, fish.speed * 0.72);
    if (speed > maxSpeed) {
      fish.vx = (fish.vx / speed) * maxSpeed;
      fish.vy = (fish.vy / speed) * maxSpeed;
    }
    fish.x += fish.vx * delta;
    fish.y += fish.vy * delta;
    updateFacingFromVelocity(fish);
    updateFishVisualFacing(fish, delta);
  }

export function updateAnchoredFish(this: DeepdiveScene, fish: Fish, delta: number) {
    fish.anchorRefreshTimer = Math.max(0, (fish.anchorRefreshTimer ?? 0) - delta);
    if (fish.surface && fish.anchorRefreshTimer <= 0) {
      fish.anchorRefreshTimer = Phaser.Math.FloatBetween(2.5, 5.5);
      const validation = validateTerrainSurfaceAnchor(this, fish.surface);
      const next = validation.valid ? validation.anchor : findNearbyTerrainSurfaceAnchor(this, fish.surface, 8, anchoredFishPreferredAnchors(fish));
      if (next) {
        fish.surface = next;
        fish.anchor = next.anchor;
        fish.rootX = next.rootX;
        fish.rootY = next.rootY;
        fish.homeX = next.rootX;
        fish.homeY = next.rootY;
        fish.fallbackNoAnchor = false;
      } else {
        fish.dead = true;
        fish.sprite?.setVisible(false);
      }
    }
    if (fish.behaviorClass === 'sessileAttached') {
      fish.vx = 0;
      fish.vy = 0;
    }
  }

export function updateSessileFish(this: DeepdiveScene, fish: Fish, _delta: number) {
    if (fish.hostile && !this.isAtBoat()) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance < fish.radius + PLAYER_CONTACT_RADIUS + 20) fish.aggroCue = Math.max(fish.aggroCue, 0.55);
    }
    fish.aggro = 0;
    fish.vx = 0;
    fish.vy = 0;
    if (!fish.surface) return;
    fish.rootX = fish.surface.rootX;
    fish.rootY = fish.surface.rootY;
    fish.homeX = fish.surface.rootX;
    fish.homeY = fish.surface.rootY;
    fish.x = fish.surface.rootX + (fish.anchorOffsetX ?? 0);
    fish.y = fish.surface.rootY + (fish.anchorOffsetY ?? 0);
  }

export function updateVerticalAnchoredFish(this: DeepdiveScene, fish: Fish, delta: number) {
    const oldX = fish.x;
    const oldY = fish.y;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, oldX, oldY);
    const targetRetract = !this.isAtBoat() && distance < 92 + fish.radius ? 1 : 0;
    fish.retract = Phaser.Math.Linear(fish.retract ?? 0, targetRetract, 1 - Math.exp(-3.2 * delta));
    fish.aggro = 0;
    if (!fish.surface) {
      fish.vx *= Math.exp(-3 * delta);
      fish.vy *= Math.exp(-3 * delta);
      return;
    }
    const sway = Math.sin(fish.phase * 2.1) * Math.min(scaledEntity(5), fish.tetherRadius ?? scaledEntity(8));
    const retract = (fish.retract ?? 0) * fish.radius * 0.48;
    const baseX = fish.surface.rootX + (fish.anchorOffsetX ?? fish.surface.normalX * fish.radius);
    const baseY = fish.surface.rootY + (fish.anchorOffsetY ?? fish.surface.normalY * fish.radius);
    fish.x = baseX + fish.surface.tangentX * sway - fish.surface.normalX * retract;
    fish.y = baseY + fish.surface.tangentY * sway - fish.surface.normalY * retract;
    fish.vx = (fish.x - oldX) / Math.max(0.001, delta);
    fish.vy = (fish.y - oldY) / Math.max(0.001, delta);
    fish.facingSign = fish.surface.tangentX < 0 ? -1 : 1;
    fish.visualFacingSign = fish.facingSign;
    fish.visualAngle = Math.atan2(fish.surface.normalY, fish.surface.normalX);
  }

export function updateBenthicWalkerFish(this: DeepdiveScene, fish: Fish, delta: number) {
    const oldX = fish.x;
    const oldY = fish.y;
    fish.recoverTimer = Math.max(0, (fish.recoverTimer ?? 0) - delta);
    fish.lungeTimer = Math.max(0, (fish.lungeTimer ?? 0) - delta);
    fish.walkPause = Math.max(0, (fish.walkPause ?? 0) - delta);
    fish.navReseedCooldown = Math.max(0, (fish.navReseedCooldown ?? 0) - delta);
    if (!fish.surface) {
      fish.vx *= Math.exp(-2.5 * delta);
      fish.vy *= Math.exp(-2.5 * delta);
      return;
    }
    const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
    if (fish.hostile && !this.isAtBoat() && playerDistance < 95 + fish.radius && (fish.recoverTimer ?? 0) <= 0 && (fish.lungeTimer ?? 0) <= 0) {
      fish.lungeTimer = 0.28;
      fish.recoverTimer = 1.15;
      fish.aggroCue = Math.max(fish.aggroCue, 0.9);
    }
    const tangent = fish.surface.tangentX * (this.player.x - fish.x) + fish.surface.tangentY * (this.player.y - fish.y);
    if ((fish.lungeTimer ?? 0) > 0) {
      fish.walkDir = tangent < 0 ? -1 : 1;
      fish.rootOffsetX = (fish.rootOffsetX ?? 0) + (fish.walkDir ?? 1) * fish.speed * 1.05 * delta;
      fish.aggro = Math.max(fish.aggro, 0.35);
    } else {
      fish.aggro = Math.max(0, fish.aggro - delta * 1.8);
      if ((fish.walkPause ?? 0) <= 0) {
        fish.rootOffsetX = (fish.rootOffsetX ?? 0) + (fish.walkDir ?? 1) * fish.speed * 0.34 * delta;
        if (Math.random() < delta * 0.55) fish.walkPause = Phaser.Math.FloatBetween(0.25, 1.1);
      }
      if (Math.random() < delta * 0.12) fish.walkDir = fish.walkDir === 1 ? -1 : 1;
    }
    const tether = Math.max(scaledEntity(10), fish.tetherRadius ?? scaledEntity(20));
    fish.rootOffsetX = Phaser.Math.Clamp(fish.rootOffsetX ?? 0, -tether, tether);
    if (Math.abs(fish.rootOffsetX) >= tether - 0.5 && !advanceBenthicWalkerSurface(this, fish, tether)) {
      fish.walkDir = fish.rootOffsetX > 0 ? -1 : 1;
    }
    const bob = Math.sin(fish.phase * 7.4) * (fish.lungeTimer && fish.lungeTimer > 0 ? scaledEntity(3) : scaledEntity(0.55));
    const outward = Math.max(
      fish.radius * 0.58,
      Math.abs(fish.surface.normalX * (fish.anchorOffsetX ?? 0) + fish.surface.normalY * (fish.anchorOffsetY ?? 0)),
    );
    const targetX = fish.surface.rootX + fish.surface.normalX * outward
      + fish.surface.tangentX * (fish.rootOffsetX ?? 0)
      + fish.surface.normalX * bob;
    const targetY = fish.surface.rootY + fish.surface.normalY * outward
      + fish.surface.tangentY * (fish.rootOffsetX ?? 0)
      + fish.surface.normalY * bob;
    if ((fish.surfaceHopDuration ?? 0) > 0 && fish.surfaceHopStartX !== undefined && fish.surfaceHopStartY !== undefined) {
      fish.surfaceHopElapsed = Math.min(fish.surfaceHopDuration ?? 0, (fish.surfaceHopElapsed ?? 0) + delta);
      const hopProgress = Phaser.Math.Clamp((fish.surfaceHopElapsed ?? 0) / Math.max(0.001, fish.surfaceHopDuration ?? 0), 0, 1);
      const hopEase = hopProgress * hopProgress * (3 - 2 * hopProgress);
      const hopArc = Math.sin(hopProgress * Math.PI) * Math.min(fish.radius * 0.45, scaledEntity(10));
      const normalX = fish.surface.normalX;
      const normalY = fish.surface.normalY;
      fish.x = Phaser.Math.Linear(fish.surfaceHopStartX, targetX, hopEase) + normalX * hopArc;
      fish.y = Phaser.Math.Linear(fish.surfaceHopStartY, targetY, hopEase) + normalY * hopArc;
      if (hopProgress >= 1) {
        fish.surfaceHopDuration = 0;
        fish.surfaceHopElapsed = 0;
        fish.surfaceHopStartX = undefined;
        fish.surfaceHopStartY = undefined;
      }
    } else {
      fish.x = targetX;
      fish.y = targetY;
    }
    fish.vx = (fish.x - oldX) / Math.max(0.001, delta);
    fish.vy = (fish.y - oldY) / Math.max(0.001, delta);
    const tangentMotion = fish.surface.tangentX * fish.vx + fish.surface.tangentY * fish.vy;
    fish.facingSign = tangentMotion < -1 ? -1 : tangentMotion > 1 ? 1 : fish.facingSign;
    fish.visualFacingSign = fish.facingSign;
    fish.visualAngle = Math.atan2(fish.surface.tangentY * fish.facingSign, fish.surface.tangentX * fish.facingSign);
    fish.grounded = true;
  }

function anchoredFishPreferredAnchors(fish: Fish): TerrainSurfaceAnchor['anchor'][] | undefined {
  if (fish.species === 'Silver Hinge Crab') return ['floor'];
  if (fish.species === 'Mantis Shrimp') return ['floor', 'leftWall', 'rightWall'];
  return undefined;
}

function advanceBenthicWalkerSurface(scene: DeepdiveScene, fish: Fish, tether: number) {
  if (!fish.surface || (fish.navReseedCooldown ?? 0) > 0) return false;
  const allowed = anchoredFishPreferredAnchors(fish);
  if (allowed && !allowed.includes(fish.surface.anchor)) {
    const corrected = findNearbyTerrainSurfaceAnchor(scene, fish.surface, 12, allowed);
    if (corrected) return moveBenthicWalkerToSurface(fish, corrected, tether, fish.walkDir ?? 1);
  }
  const dir = (fish.rootOffsetX ?? 0) >= 0 ? 1 : -1;
  if (fish.species !== 'Mantis Shrimp') return false;
  const current = fish.surface;
  const candidates = sampleTerrainSurfaceAnchors(scene, {
    minY: Math.max(TILE * 2, current.rootY - TILE * 3.2),
    maxY: Math.min(WORLD_H * TILE - TILE * 2, current.rootY + TILE * 3.2),
    salt: Math.floor(fish.phase * 60) + current.maskSx,
    prefer: allowed,
    minSupport: 8,
    minClearance: 2,
    limit: 140,
  }).filter((candidate) => {
    if (allowed && !allowed.includes(candidate.anchor)) return false;
    if (candidate.id === current.id) return false;
    const dx = candidate.rootX - current.rootX;
    const dy = candidate.rootY - current.rootY;
    const distance = Math.hypot(dx, dy);
    if (distance < fish.radius * 0.45 || distance > TILE * 3.15) return false;
    const forward = dx * current.tangentX * dir + dy * current.tangentY * dir;
    return forward > fish.radius * 0.35;
  });
  let best: { anchor: TerrainSurfaceAnchor; score: number } | null = null;
  for (const candidate of candidates) {
    const dx = candidate.rootX - current.rootX;
    const dy = candidate.rootY - current.rootY;
    const forward = dx * current.tangentX * dir + dy * current.tangentY * dir;
    const lateral = Math.abs(dx * current.normalX + dy * current.normalY);
    const normalShift = Math.abs(candidate.normalX - current.normalX) + Math.abs(candidate.normalY - current.normalY);
    const score = forward * 1.6 - lateral * 0.55 - normalShift * 5 + candidate.clearance * 0.2;
    if (!best || score > best.score) best = { anchor: candidate, score };
  }
  if (!best) return false;
  return moveBenthicWalkerToSurface(fish, best.anchor, tether, dir);
}

function moveBenthicWalkerToSurface(fish: Fish, surface: TerrainSurfaceAnchor, tether: number, dir: 1 | -1) {
  const hopStartX = fish.x;
  const hopStartY = fish.y;
  const fromSurface = fish.surface;
  fish.surface = surface;
  fish.anchor = surface.anchor;
  fish.rootX = surface.rootX;
  fish.rootY = surface.rootY;
  fish.homeX = surface.rootX;
  fish.homeY = surface.rootY;
  fish.rootOffsetX = -dir * Math.min(tether * 0.58, Math.max(fish.radius * 0.45, tether - fish.radius));
  fish.anchorOffsetX = surface.normalX * Math.max(fish.radius * 0.58, 6);
  fish.anchorOffsetY = surface.normalY * Math.max(fish.radius * 0.58, 6);
  fish.walkDir = dir;
  fish.walkPause = 0;
  fish.navReseedCooldown = 0.34;
  fish.lungeTimer = Math.max(fish.lungeTimer ?? 0, fish.species === 'Mantis Shrimp' ? 0.16 : 0);
  if (fish.species === 'Mantis Shrimp' && (!fromSurface || fromSurface.id !== surface.id)) {
    fish.surfaceHopStartX = hopStartX;
    fish.surfaceHopStartY = hopStartY;
    fish.surfaceHopElapsed = 0;
    fish.surfaceHopDuration = 0.22;
  }
  fish.fallbackNoAnchor = false;
  return true;
}

export function updateFlora(this: DeepdiveScene, delta: number) {
    for (const flora of this.flora) {
      flora.phase += delta;
      flora.scanPulse = Math.max(0, flora.scanPulse - delta * 1.35);
      flora.samplePulse = Math.max(0, flora.samplePulse - delta * 1.7);
      flora.sampleCooldown = Math.max(0, flora.sampleCooldown - delta);
      flora.hurtFlash = Math.max(0, flora.hurtFlash - delta * 4.2);
      flora.aggroCue = Math.max(0, flora.aggroCue - delta * 1.6);
      if (flora.dead) {
        flora.sprite?.setVisible(false);
        continue;
      }
      if (!flora.scanned && !flora.scanning) {
        flora.scan = Math.max(0, flora.scan - delta * 0.9);
      }
      if (!flora.sampling) flora.sample = Math.max(0, flora.sample - delta * 0.65);
      flora.scanning = false;
      flora.sampling = false;
      if (flora.hazardous && !this.isAtBoat()) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y);
        if (distance < flora.radius + PLAYER_CONTACT_RADIUS + 4) {
          this.applyHullDamage((flora.rare ? 7 : 3.5) * delta, `${flora.species} stings through the suit.`);
          flora.aggroCue = Math.max(flora.aggroCue, 0.55);
          this.player.vx += ((this.player.x - flora.x) / Math.max(1, distance)) * 24 * delta;
          this.player.vy += ((this.player.y - flora.y) / Math.max(1, distance)) * 24 * delta;
        }
      }
    }
  }

export function steerFish(this: DeepdiveScene, fish: Fish, delta: number) {
    const toPlayerX = this.player.x - fish.x;
    const toPlayerY = this.player.y - fish.y;
    const playerDistance = Math.hypot(toPlayerX, toPlayerY);
    const homeDistance = Phaser.Math.Distance.Between(fish.x, fish.y, fish.homeX, fish.homeY);
    const detectionRange = (fish.pattern === 'circle' ? 245 : 205) + fish.radius * 3 + state.biome * 8;
    const leashRange = (fish.pattern === 'circle' ? 390 : 320) + fish.radius * 5;
    const chaseActive = fish.hostile && !this.isAtBoat() && playerDistance < detectionRange && homeDistance < leashRange;
    const wasAggroed = fish.aggro > 0;
    if (chaseActive) {
      fish.aggro = Math.max(fish.aggro, fish.pattern === 'circle' ? 2.6 : 2);
      if (!wasAggroed) fish.aggroCue = Math.max(fish.aggroCue, 0.9);
    } else {
      fish.aggro = Math.max(0, fish.aggro - delta);
    }

    let targetX = fish.homeX;
    let targetY = fish.homeY;

    if (fish.aggro > 0 && fish.hostile) {
      const lead = Phaser.Math.Clamp(playerDistance / 230, 0.12, 0.75);
      const flank = Math.sin(fish.phase * 5.2) * (fish.pattern === 'circle' ? 28 : 18);
      targetX = this.player.x + this.player.vx * lead - (toPlayerY / Math.max(1, playerDistance)) * flank;
      targetY = this.player.y + this.player.vy * lead + (toPlayerX / Math.max(1, playerDistance)) * flank;
    } else if (fish.pattern === 'school') {
      targetX += Math.sin(fish.phase * 1.8) * 110;
      targetY += Math.cos(fish.phase * 1.25) * 34;
    } else if (fish.pattern === 'sway') {
      targetX += Math.sin(fish.phase * 1.1) * 72;
      targetY += Math.sin(fish.phase * 3.2) * 28;
    } else if (fish.pattern === 'glide') {
      targetX += Math.sin(fish.phase * 0.45) * 180;
      targetY += Math.cos(fish.phase * 0.36) * 70;
    } else if (fish.pattern === 'circle') {
      targetX += Math.cos(fish.phase * 0.52) * 120;
      targetY += Math.sin(fish.phase * 0.52) * 80;
    } else if (fish.pattern === 'stalk') {
      targetX += Math.sin(fish.phase * 0.9) * 130;
      targetY += Math.cos(fish.phase * 0.7) * 44;
    }

    if (!fish.hostile && playerDistance < 72) {
      targetX = fish.x - toPlayerX * 1.4;
      targetY = fish.y - toPlayerY * 1.4;
    }

    updateLegacyNavTimers(fish, delta);
    const sampledTargetX = targetX;
    const sampledTargetY = targetY;
    if ((fish.navWaypointTimer ?? 0) > 0 && fish.navTargetX !== undefined && fish.navTargetY !== undefined) {
      targetX = fish.navTargetX;
      targetY = fish.navTargetY;
      if (Phaser.Math.Distance.Between(fish.x, fish.y, targetX, targetY) < Math.max(18, fish.radius * 1.6)) {
        fish.navWaypointTimer = 0;
        fish.navTargetX = undefined;
        fish.navTargetY = undefined;
        targetX = sampledTargetX;
        targetY = sampledTargetY;
      }
    }

    let dx = targetX - fish.x;
    let dy = targetY - fish.y;
    let len = Math.max(1, Math.hypot(dx, dy));
    const pursuit = fish.aggro > 0 && fish.hostile;
    const adjusted = legacyFishSteeringDirection(this, fish, dx / len, dy / len, pursuit);
    dx = adjusted.x;
    dy = adjusted.y;
    len = Math.max(1, Math.hypot(dx, dy));
    updateLegacyStuckState(this, fish, sampledTargetX, sampledTargetY, dx / len, dy / len, delta);
    const desiredSpeed = fish.speed * (pursuit ? (fish.pattern === 'circle' ? 1.42 : 1.58) : 1);
    const steering = pursuit ? 4.4 : 2.6;
    fish.vx += (dx / len) * desiredSpeed * delta * steering;
    fish.vy += (dy / len) * desiredSpeed * delta * steering;
    const speed = Math.hypot(fish.vx, fish.vy);
    const maxSpeed = fish.speed * (pursuit ? 2.05 : 1.45);
    if (speed > maxSpeed) {
      fish.vx = (fish.vx / speed) * maxSpeed;
      fish.vy = (fish.vy / speed) * maxSpeed;
    }
  }

function updateLegacyNavTimers(fish: Fish, delta: number) {
    fish.navWaypointTimer = Math.max(0, (fish.navWaypointTimer ?? 0) - delta);
    fish.navReseedCooldown = Math.max(0, (fish.navReseedCooldown ?? 0) - delta);
    fish.navTerrainBounceWindow = Math.max(0, (fish.navTerrainBounceWindow ?? 0) - delta);
    if ((fish.navTerrainBounceWindow ?? 0) <= 0) fish.navRecentTerrainBounces = 0;
    fish.navHeadingFlipCount = Math.max(0, (fish.navHeadingFlipCount ?? 0) - delta * 1.4);
    if ((fish.navWaypointTimer ?? 0) <= 0) {
      fish.navTargetX = undefined;
      fish.navTargetY = undefined;
    }
  }

function legacyFishSteeringDirection(scene: DeepdiveScene, fish: Fish, desiredX: number, desiredY: number, pursuit: boolean) {
    const envelope = LEGACY_NAV_ENVELOPES[fish.pattern];
    const speed = Math.hypot(fish.vx, fish.vy);
    const horizon = Math.max(fish.radius * 2.4, fish.radius + speed * 0.34 + fish.speed * envelope.horizon * (pursuit ? 0.85 : 1));
    let avoidX = 0;
    let avoidY = 0;
    let blocked = 0;
    let leftPenalty = 0;
    let rightPenalty = 0;
    for (const angle of envelope.feelerAngles) {
      const dir = rotateUnit(desiredX, desiredY, angle);
      const distance = horizon * (angle === 0 ? 1 : Math.abs(angle) > 0.8 ? 0.82 : 0.92);
      const sampleX = fish.x + dir.x * distance;
      const sampleY = fish.y + dir.y * distance;
      const contact = legacyFishContact(scene, fish, sampleX, sampleY, Math.max(2, fish.radius * 0.35));
      const density = legacyDensityNear(scene, sampleX, sampleY);
      const penalty = contact ? 1 + contact.count / Math.max(1, contact.samples) : density >= 72 ? 0.35 : 0;
      if (angle < 0) leftPenalty += penalty;
      else if (angle > 0) rightPenalty += penalty;
      else {
        leftPenalty += penalty * 0.5;
        rightPenalty += penalty * 0.5;
      }
      if (!contact) continue;
      blocked += 1;
      const weight = (angle === 0 ? 1.3 : 0.82) * envelope.avoidance;
      avoidX += contact.nx * weight;
      avoidY += contact.ny * weight;
    }
    fish.navLastBlockedFeelers = blocked;
    fish.navBlockedFeelers = (fish.navBlockedFeelers ?? 0) + blocked;
    if (blocked <= 0) return { x: desiredX, y: desiredY };
    const sideSign: 1 | -1 = leftPenalty < rightPenalty ? -1 : rightPenalty < leftPenalty ? 1 : fish.navAvoidSign ?? (fish.phase % (Math.PI * 2) > Math.PI ? -1 : 1);
    fish.navAvoidSign = sideSign;
    avoidX += -desiredY * sideSign * envelope.sideBias * Math.min(2, blocked);
    avoidY += desiredX * sideSign * envelope.sideBias * Math.min(2, blocked);
    const blend = Phaser.Math.Clamp(0.28 + blocked * 0.16, 0.3, pursuit ? 0.68 : 0.78);
    const outX = desiredX * (1 - blend) + avoidX * blend;
    const outY = desiredY * (1 - blend) + avoidY * blend;
    const len = Math.max(1, Math.hypot(outX, outY));
    return { x: outX / len, y: outY / len };
  }

function updateLegacyStuckState(
  scene: DeepdiveScene,
  fish: Fish,
  targetX: number,
  targetY: number,
  headingX: number,
  headingY: number,
  delta: number,
) {
    const distance = Phaser.Math.Distance.Between(fish.x, fish.y, targetX, targetY);
    const lastDistance = fish.navLastDistance ?? distance;
    const displacement = fish.navLastX === undefined || fish.navLastY === undefined
      ? fish.speed * delta
      : Phaser.Math.Distance.Between(fish.x, fish.y, fish.navLastX, fish.navLastY);
    const progress = lastDistance - distance;
    const blocked = (fish.navLastBlockedFeelers ?? 0) > 0;
    const poorProgress = progress < Math.max(0.35, fish.radius * 0.018) && displacement < Math.max(0.8, fish.speed * delta * 0.38);
    fish.navStuckTimer = poorProgress || blocked || (fish.navRecentTerrainBounces ?? 0) > 0
      ? (fish.navStuckTimer ?? 0) + delta
      : Math.max(0, (fish.navStuckTimer ?? 0) - delta * 1.8);
    if (fish.navLastHeadingX !== undefined && fish.navLastHeadingY !== undefined) {
      const dot = fish.navLastHeadingX * headingX + fish.navLastHeadingY * headingY;
      if (dot < -0.22 && displacement < Math.max(6, fish.radius * 0.7)) {
        fish.navHeadingFlipCount = (fish.navHeadingFlipCount ?? 0) + 1;
      }
    }
    fish.navLastDistance = distance;
    fish.navLastX = fish.x;
    fish.navLastY = fish.y;
    fish.navLastHeadingX = headingX;
    fish.navLastHeadingY = headingY;
    const repeatedBounce = (fish.navRecentTerrainBounces ?? 0) >= 2;
    const repeatedBlocked = (fish.navLastBlockedFeelers ?? 0) >= 3 && (fish.navStuckTimer ?? 0) > 0.45;
    const flipStuck = (fish.navHeadingFlipCount ?? 0) >= 3 && (fish.navStuckTimer ?? 0) > 0.65;
    if ((fish.navReseedCooldown ?? 0) > 0 || (!repeatedBounce && !repeatedBlocked && !flipStuck)) return;
    const waypoint = sampleLegacyFishWaypoint(scene, fish, targetX, targetY, headingX, headingY);
    const envelope = LEGACY_NAV_ENVELOPES[fish.pattern];
    fish.navReseedCooldown = envelope.reseedCooldown;
    fish.navStuckTimer = 0;
    fish.navHeadingFlipCount = 0;
    fish.navRecentTerrainBounces = 0;
    if (!waypoint) return;
    fish.navTargetX = waypoint.x;
    fish.navTargetY = waypoint.y;
    fish.navWaypointTimer = 1.7 + Math.min(0.9, waypoint.distance / Math.max(90, fish.speed));
    fish.navReseedCount = (fish.navReseedCount ?? 0) + 1;
    if (!fish.hostile || fish.aggro <= 0) {
      fish.homeX = Phaser.Math.Linear(fish.homeX, waypoint.x, 0.18);
      fish.homeY = Phaser.Math.Linear(fish.homeY, waypoint.y, 0.18);
    }
  }

function sampleLegacyFishWaypoint(scene: DeepdiveScene, fish: Fish, targetX: number, targetY: number, headingX: number, headingY: number) {
    const envelope = LEGACY_NAV_ENVELOPES[fish.pattern];
    const signs: Array<1 | -1> = fish.navAvoidSign === -1 ? [-1, 1] : [1, -1];
    let best: { x: number; y: number; score: number; distance: number } | null = null;
    for (const radius of [envelope.waypointRadius * 0.72, envelope.waypointRadius, envelope.waypointRadius * 1.28]) {
      for (const sign of signs) {
        for (const angle of [0.58, 0.92, 1.28, 1.72]) {
          const dir = rotateUnit(headingX, headingY, angle * sign);
          const x = fish.x + dir.x * radius;
          const y = fish.y + dir.y * radius;
          if (!legacyFishClearAt(scene, fish, x, y, 5)) continue;
          const probeX = fish.x + dir.x * Math.min(radius, fish.radius * 3.2);
          const probeY = fish.y + dir.y * Math.min(radius, fish.radius * 3.2);
          if (!legacyFishClearAt(scene, fish, probeX, probeY, 2)) continue;
          const targetDistance = Phaser.Math.Distance.Between(x, y, targetX, targetY);
          const currentDistance = Phaser.Math.Distance.Between(fish.x, fish.y, targetX, targetY);
          const clearAhead = legacyFishClearAt(scene, fish, x + dir.x * fish.radius * 2.2, y + dir.y * fish.radius * 2.2, 3);
          const lateral = Math.abs(dir.x * -headingY + dir.y * headingX);
          const score = (currentDistance - targetDistance) * 0.25 + lateral * 35 + (clearAhead ? 18 : 0) - radius * 0.04;
          if (!best || score > best.score) best = { x, y, score, distance: radius };
        }
      }
    }
    return best;
  }

export function keepFishInWater(this: DeepdiveScene, fish: Fish) {
    const contact = legacyFishContact(this, fish);
    if (!contact) return;
    const push = Math.max(2.2, fish.radius * 0.16) * Math.min(2.5, 1 + contact.count / Math.max(1, contact.samples));
    fish.x += contact.nx * push;
    fish.y += contact.ny * push;
    const secondContact = legacyFishContact(this, fish, fish.x, fish.y, 0.75);
    if (secondContact) {
      fish.x += secondContact.nx * Math.max(1.4, fish.radius * 0.1);
      fish.y += secondContact.ny * Math.max(1.4, fish.radius * 0.1);
    }
    const into = fish.vx * contact.nx + fish.vy * contact.ny;
    if (into < 0) {
      fish.vx -= contact.nx * into * 1.12;
      fish.vy -= contact.ny * into * 1.12;
    }
    fish.vx *= 0.82;
    fish.vy *= 0.82;
    fish.navTerrainBounces = (fish.navTerrainBounces ?? 0) + 1;
    fish.navRecentTerrainBounces = (fish.navRecentTerrainBounces ?? 0) + 1;
    fish.navTerrainBounceWindow = Math.max(fish.navTerrainBounceWindow ?? 0, 1.25);
    if ((fish.navWaypointTimer ?? 0) <= 0 && (fish.navReseedCooldown ?? 0) <= 0) {
      fish.homeX = Phaser.Math.Linear(fish.homeX, fish.x + contact.nx * fish.radius * 1.8, 0.035);
      fish.homeY = Phaser.Math.Linear(fish.homeY, fish.y + contact.ny * fish.radius * 1.8, 0.035);
    }
  }

export function bumpFish(this: DeepdiveScene, fish: Fish, distance: number) {
    const nx = distance > 0 ? (this.player.x - fish.x) / distance : 1;
    const ny = distance > 0 ? (this.player.y - fish.y) / distance : 0;
    const impact = Math.hypot(this.player.vx, this.player.vy);
    if (fish.behaviorClass && fish.behaviorClass !== 'legacySwimmer') {
      this.player.vx += nx * (fish.hostile ? 95 : 42);
      this.player.vy += ny * (fish.hostile ? 95 : 42);
      fish.bumpCooldown = fish.hostile ? predatorBiteCooldown(fish) : 0.42;
      fish.scan = Math.max(0, fish.scan - 0.18);
      if (fish.hostile) {
        const damage = Math.round(3 + fish.radius * 0.3 + state.biome * 1.2 + (fish.behaviorClass === 'benthicWalker' && fish.lungeTimer && fish.lungeTimer > 0 ? 3 : 0));
        const verb = fish.behaviorClass === 'sessileAttached' ? 'spines punctured the suit' : 'struck from the terrain';
        this.applyHullDamage(Math.max(2, damage + impact * 0.012 - state.upgrades.suit), `${fish.species} ${verb}.`);
        fish.aggroCue = Math.max(fish.aggroCue, 1);
        this.registerPredatorBite(fish);
        this.playFishBite(damage);
      } else {
        state.status = `${fish.species} held its terrain position.`;
      }
      renderHud();
      return;
    }
    this.player.vx += nx * (fish.hostile ? 120 : 70);
    this.player.vy += ny * (fish.hostile ? 120 : 70);
    fish.vx -= nx * 140;
    fish.vy -= ny * 140;
    fish.bumpCooldown = fish.hostile ? predatorBiteCooldown(fish) : 0.42;
    fish.scan = Math.max(0, fish.scan - 0.25);
    if (fish.hostile) {
      const damage = Math.round(4 + fish.radius * 0.35 + state.biome * 1.4 + (fish.pattern === 'circle' ? 3 : 0));
      this.applyHullDamage(Math.max(2, damage + impact * 0.018 - state.upgrades.suit), `${fish.species} slammed your helmet.`);
      fish.aggroCue = Math.max(fish.aggroCue, 1);
      if (venomousFish(fish)) this.applyVenom(fish);
      this.registerPredatorBite(fish);
      this.playFishBite(damage);
    } else {
      state.status = `${fish.species} scattered from the collision.`;
    }
    renderHud();
  }

export function applyVenom(this: DeepdiveScene, fish: Fish) {
    if (state.venom.active) return;
    state.venom.active = true;
    state.venom.source = fish.species;
    state.venom.tick = 0;
    state.status = `${fish.species} venom entered the suit seals. Return to the barge to purge it.`;
    this.spawnFloatingText('Venom', 0xb9f27c);
  }

export function registerPredatorBite(this: DeepdiveScene, fish: Fish | ArticulatedCreature) {
    if (state.bleed.recentTimer <= 0) state.bleed.recentBites = 0;
    state.bleed.recentBites += 1;
    state.bleed.recentTimer = BLEED_RECENT_WINDOW;
    if (state.bleed.recentBites < BLEED_TRIGGER_BITES) return;
    state.bleed.active = true;
    state.bleed.source = fish.species;
    state.bleed.duration = BLEED_DURATION;
    state.bleed.stacks = Phaser.Math.Clamp(state.bleed.stacks + 1, 1, 3);
    state.bleed.recentBites = 0;
    state.status = `${fish.species} opened a suit bleed. Patch up or let it clot.`;
    this.spawnFloatingText('Bleeding', 0xff6f7f);
  }

export function playFishBite(this: DeepdiveScene, damage: number) {
    const now = this.time.now;
    if (now - this.lastFishBiteSfxAt < FISH_BITE_SFX_GAP_MS) return;
    this.lastFishBiteSfxAt = now;
    const key = damage <= 10
      ? 'audio-fish-bite-weak'
      : damage <= 14
        ? 'audio-fish-bite-strong'
        : 'audio-fish-bite-heavy';
    const volume = damage <= 10 ? 0.16 : damage <= 14 ? 0.2 : 0.24;
    this.playSfx(key, volume, {
      detune: Phaser.Math.Between(-35, 25),
    });
  }

export function updateBobbits(this: DeepdiveScene, delta: number, controls: ControlState) {
    if (!this.bobbits.length) return;
    if (state.pilotingSub) return;
    const inputStrength = controls.move.length();
    let latchedBobbitActive = this.bobbits.some((bobbit) => bobbit.state === 'latched');
    for (const bobbit of this.bobbits) {
      bobbit.phase += delta;
      bobbit.cooldown = Math.max(0, bobbit.cooldown - delta);
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, bobbit.x, bobbit.y);

      if (bobbit.state === 'hidden') {
        if (!latchedBobbitActive && !this.isAtBoat() && bobbit.cooldown <= 0 && distance < BOBBIT_DETECT_RADIUS) {
          bobbit.state = 'emerging';
          bobbit.timer = 0.45;
          state.status = 'Something is moving under the sediment.';
        }
        continue;
      }

      if (bobbit.state === 'emerging') {
        if (latchedBobbitActive) {
          this.resetBobbit(bobbit, 4);
          continue;
        }
        bobbit.timer -= delta;
        if (distance > BOBBIT_DETECT_RADIUS * 1.35) {
          bobbit.state = 'hidden';
          bobbit.cooldown = 2.5;
          continue;
        }
        if (bobbit.timer <= 0) {
          bobbit.state = 'lunging';
          bobbit.timer = 0.55;
        }
        continue;
      }

      if (bobbit.state === 'lunging') {
        if (latchedBobbitActive) {
          this.resetBobbit(bobbit, 4);
          continue;
        }
        bobbit.timer -= delta;
        const angle = Phaser.Math.Angle.Between(bobbit.x, bobbit.y, this.player.x, this.player.y);
        bobbit.x += Math.cos(angle) * 120 * delta;
        bobbit.y += Math.sin(angle) * 120 * delta;
        if (distance < BOBBIT_LATCH_RADIUS) {
          bobbit.state = 'latched';
          bobbit.escapeRemaining = BOBBIT_ESCAPE_SECONDS;
          bobbit.facingSign = this.player.x < bobbit.x ? -1 : 1;
          bobbit.latchX = this.player.x;
          bobbit.latchY = this.player.y;
          this.player.x = bobbit.latchX;
          this.player.y = bobbit.latchY;
          this.player.vx = 0;
          this.player.vy = 0;
          latchedBobbitActive = true;
          this.spawnFloatingText('Bobbit latched', 0xff8a6b);
          state.status = 'Bobbitworm pinned you. Thrash the movement keys to shake it loose.';
          continue;
        }
        if (bobbit.timer <= 0) {
          this.resetBobbit(bobbit, 5.5);
        }
        continue;
      }

      if (bobbit.state === 'latched') {
        const struggle = inputStrength > 0.65 ? 1 : 0;
        bobbit.escapeRemaining -= delta * struggle;
        this.player.x = bobbit.latchX;
        this.player.y = bobbit.latchY;
        this.player.vx = 0;
        this.player.vy = 0;
        bobbit.x = bobbit.latchX - bobbit.facingSign * scaledEntity(10);
        bobbit.y = bobbit.latchY + scaledEntity(12);
        this.applyHullDamage((2.2 + state.biome * 0.42) * delta, 'Bobbitworm is chewing through the suit.');
        state.oxygen -= (4.8 + state.biome * 0.65) * delta;
        if (bobbit.escapeRemaining <= 0 || this.isAtBoat()) {
          this.spawnFloatingText('Shaken loose', 0x8ee7f4);
          this.resetBobbit(bobbit, 8);
        } else {
          state.status = struggle > 0
            ? `Bobbitworm pinning you. Keep thrashing: ${Math.ceil(bobbit.escapeRemaining)}s.`
            : `Bobbitworm pinning you. Move to wriggle free: ${Math.ceil(bobbit.escapeRemaining)}s.`;
        }
        continue;
      }

      if (bobbit.state === 'cooldown') {
        bobbit.timer -= delta;
        bobbit.x = Phaser.Math.Linear(bobbit.x, bobbit.homeX, Math.min(1, delta * 3));
        bobbit.y = Phaser.Math.Linear(bobbit.y, bobbit.homeY, Math.min(1, delta * 3));
        if (bobbit.timer <= 0) {
          bobbit.state = 'hidden';
          bobbit.cooldown = 1.5;
        }
      }
    }
  }

export function resetBobbit(this: DeepdiveScene, bobbit: Bobbit, cooldown: number) {
    bobbit.state = 'cooldown';
    bobbit.timer = cooldown;
    bobbit.cooldown = cooldown;
    bobbit.x = bobbit.homeX;
    bobbit.y = bobbit.homeY;
    bobbit.latchX = bobbit.homeX;
    bobbit.latchY = bobbit.homeY;
    bobbit.facingSign = 1;
    bobbit.escapeRemaining = BOBBIT_ESCAPE_SECONDS;
  }

export function updateHazards(this: DeepdiveScene, delta: number) {
    if (!this.hazards.length || this.isAtBoat()) return;
    for (const hazard of this.hazards) {
      hazard.phase += delta;
      const active = Math.sin(hazard.phase * 1.8) > -0.18;
      if (!active) continue;
      const plumeX = hazard.x + (hazard.surface?.normalX ?? 0) * hazard.radius * 1.35;
      const plumeY = hazard.y + (hazard.surface?.normalY ?? -1) * hazard.radius * 1.35;
      const plumeRadius = hazard.radius * 1.45;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, plumeX, plumeY);
      if (distance > plumeRadius) continue;
      const heatFactor = 1 - distance / plumeRadius;
      const mitigation = 1 - state.upgrades.thermal * 0.17;
      this.applyHullDamage(9.5 * hazard.heat * heatFactor * Math.max(0.25, mitigation) * delta, 'Thermal vent plume is cooking the suit.');
      const push = 35 * heatFactor * delta;
      this.player.vx += ((this.player.x - plumeX) / Math.max(1, distance)) * push;
      this.player.vy += ((this.player.y - plumeY) / Math.max(1, distance)) * push;
    }
  }

export function updateSpecialRooms(this: DeepdiveScene, delta: number) {
    const oasis = this.specialRooms.find((room) => room.kind === 'biolume' && pointInRoom(this.player.x, this.player.y, room, 0.92));
    if (!oasis || state.atBoat || state.lost || (state.won && !state.finale.endingSeen)) return;
    const sub = state.pilotingSub ? state.activeSub : null;
    if (sub) {
      const max = subDef(sub.tier).oxygen;
      sub.oxygen = Math.min(max, sub.oxygen + OASIS_OXYGEN_REFILL * 0.72 * delta);
    } else {
      state.oxygen = Math.min(oxygenMax(), state.oxygen + OASIS_OXYGEN_REFILL * delta);
    }
    resetOxygenWarnings();
    if (this.hudTimer > 45) {
      state.status = 'Oxygen oasis. Native bioluminescence is holding the dark back and refilling your reserves.';
    }
  }

export function updateNestEggs(this: DeepdiveScene, delta: number) {
    for (const egg of this.nestEggs) {
      if (egg.state === 'destroyed') {
        egg.sprite?.setVisible(false);
        continue;
      }
      egg.phase += delta;
      if (egg.state === 'dormant') {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, egg.x, egg.y);
        if (!state.atBoat && distance < EGG_DETECTION_RADIUS) {
          egg.state = 'hatching';
          egg.hatch = 0;
          state.status = 'Nest eggs are waking. Cut them fast or the larvae will swarm.';
          this.spawnFloatingText('Egg waking', 0xff4f64);
        }
      } else if (egg.state === 'hatching') {
        egg.hatch += delta;
        if (egg.hatch >= EGG_HATCH_SECONDS) this.hatchEgg(egg);
      }
    }
    this.checkNestRewards();
  }

export function hatchEgg(this: DeepdiveScene, egg: NestEgg) {
    if (egg.state === 'hatched' || egg.state === 'destroyed') return;
    egg.state = 'hatched';
    egg.hatch = EGG_HATCH_SECONDS;
    const count = Phaser.Math.Between(2, 3);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      this.larvae.push({
        roomId: egg.roomId,
        x: egg.x + Math.cos(angle) * scaledEntity(12),
        y: egg.y + Math.sin(angle) * scaledEntity(8),
        vx: Math.cos(angle) * scaledEntity(68),
        vy: Math.sin(angle) * scaledEntity(68),
        radius: scaledEntity(4.2),
        phase: Math.random() * Math.PI * 2,
        latched: false,
        latchCooldown: 0.65,
        latchSlot: i,
        life: 3.4,
        sprite: this.createEntitySprite(egg.x, egg.y, 'nest-larva-0').setDepth(2.45),
      });
    }
    state.status = `Egg hatched. ${count} larvae are in the water.`;
    this.spawnFloatingText(`Larvae x${count}`, 0xff4f64);
  }

export function updateLarvae(this: DeepdiveScene, delta: number, controls: ControlState) {
    const latchedCount = this.larvae.filter((larva) => larva.latched).length;
    this.larvae = this.larvae.filter((larva) => {
      larva.phase += delta;
      larva.latchCooldown = Math.max(0, larva.latchCooldown - delta);
      if (larva.latched) {
        if (state.atBoat) {
          this.failNestBounty(larva.roomId);
          larva.sprite?.setVisible(false);
          return false;
        }
        const slot = larva.latchSlot % 5;
        const angle = slot * 1.26 + larva.phase * 0.8;
        larva.x = this.player.x + Math.cos(angle) * scaledEntity(13);
        larva.y = this.player.y + Math.sin(angle) * scaledEntity(10);
        const struggle = controls.hasMove ? controls.move.length() : 0;
        larva.life -= delta * (0.34 + struggle * 1.85);
        this.applyHullDamage(0.08 * delta, 'Larvae are fouling the suit joints.');
        if (larva.life <= 0) {
          larva.latched = false;
          larva.latchCooldown = 2.8;
          larva.life = 3.4;
          const away = new Phaser.Math.Vector2(larva.x - this.player.x, larva.y - this.player.y).normalize();
          larva.vx = away.x * scaledEntity(115) + Phaser.Math.FloatBetween(-18, 18);
          larva.vy = away.y * scaledEntity(115) + Phaser.Math.FloatBetween(-18, 18);
          state.status = 'Larva shaken loose. Burn it before it latches again.';
          this.spawnFloatingText('Larva loose', 0xffd166);
        }
        return true;
      }
      const dx = this.player.x - larva.x;
      const dy = this.player.y - larva.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const chase = distance < scaledEntity(170) && larva.latchCooldown <= 0;
      if (chase && !state.atBoat) {
        larva.vx += (dx / distance) * scaledEntity(92) * delta;
        larva.vy += (dy / distance) * scaledEntity(92) * delta;
      }
      larva.vx *= Math.exp(-1.55 * delta);
      larva.vy *= Math.exp(-1.55 * delta);
      larva.x += larva.vx * delta;
      larva.y += larva.vy * delta;
      if (!state.atBoat && larva.latchCooldown <= 0 && latchedCount < 3 && distance < PLAYER_CONTACT_RADIUS + larva.radius) {
        larva.latched = true;
        larva.life = 2.8 + latchedCount * 0.45;
        state.status = `Larvae latched: ${latchedCount + 1}. Thrust is getting sluggish.`;
      }
      return true;
    });
    this.checkNestRewards();
  }

export function failNestBounty(this: DeepdiveScene, roomId: string) {
    const room = this.specialRooms.find((candidate) => candidate.id === roomId);
    if (!room || room.failed || room.rewardClaimed) return;
    room.failed = true;
    state.status = 'Nest swarm reached the barge. Corporate hazard bounty voided.';
  }

export function checkNestRewards(this: DeepdiveScene, ) {
    for (const room of this.specialRooms) {
      if (room.kind !== 'nest' || room.rewardClaimed || room.failed) continue;
      const eggs = this.nestEggs.filter((egg) => egg.roomId === room.id);
      if (!eggs.length) continue;
      const activeEggs = eggs.some((egg) => egg.state === 'dormant' || egg.state === 'hatching');
      const activeLarvae = this.larvae.some((larva) => larva.roomId === room.id);
      if (activeEggs || activeLarvae) continue;
      room.rewardClaimed = true;
      const reward = Math.round(NEST_CLEAR_REWARD * (state.biome >= 3 ? 1.35 : 1));
      state.credits += reward;
      state.status = `Nest cleared. Corporate hazard bounty paid ${reward.toLocaleString()} credits.`;
      this.spawnFloatingText(`Nest cleared +${reward}c`, 0xffd166);
      this.completeNestQuest(room);
      renderHud();
    }
  }

export function updateLooseItems(this: DeepdiveScene, delta: number) {
    let pickedUp = false;
    this.looseItems = this.looseItems.filter((item) => {
      if (item.utility) {
        return this.updateThrownUtility(item, delta);
      }
      item.x += item.vx * delta;
      item.y += item.vy * delta;
      item.vx *= 1 - Math.min(0.9, delta * 2.8);
      item.vy *= 1 - Math.min(0.9, delta * 2.8);
      item.pickupDelay = Math.max(0, (item.pickupDelay ?? 0) - delta);
      if (Number.isFinite(item.life)) item.life -= delta;
      const miningSubVacuum = Boolean(state.pilotingSub && state.activeSub && state.activeSub.tier >= 2);
      const canPickup = !state.pilotingSub || !state.activeSub || state.activeSub.tier === 1 || miningSubVacuum;
      if (canPickup && item.value > 0 && !item.collected && state.cargo.length < cargoCapacity()) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
        if (miningSubVacuum && distance < Math.max(86, item.radius + subDef(state.activeSub!.tier).cargo * 2.2)) {
          const pull = Math.min(1, delta * 5.2);
          item.vx += ((this.player.x - item.x) / Math.max(1, distance)) * 120 * pull;
          item.vy += ((this.player.y - item.y) / Math.max(1, distance)) * 120 * pull;
        }
        const pickupRadius = miningSubVacuum
          ? Math.max(30, item.radius + scaledEntity(26))
          : Math.max(PLAYER_PICKUP_RADIUS, item.radius + PLAYER_COLLISION_RADIUS + 7);
        if ((item.pickupDelay ?? 0) <= 0 && distance < pickupRadius) {
          item.collected = true;
          state.cargo.push({
            id: item.id,
            name: item.name,
            value: item.value,
            color: item.color,
            kind: item.kind,
            icon: item.icon,
            sampleSpecies: item.sampleSpecies,
          });
          state.selectedCargoIndex = state.cargo.length - 1;
          state.status = miningSubVacuum
            ? `${subDef(state.activeSub!.tier).name} vacuum recovered ${item.name} worth ${item.value} credits.`
            : `Recovered loose ${item.name} worth ${item.value} credits.`;
          this.spawnFloatingText(`${item.name} +${item.value}c`, item.color);
          pickedUp = true;
          return false;
        }
      }
      return item.life > 0;
    });
    if (pickedUp) renderHud();
  }

export function updateThrownUtility(this: DeepdiveScene, item: LooseItem, delta: number) {
    if (Number.isFinite(item.life)) item.life -= delta;

    if (!item.landed) {
      item.vy = Math.min(THROWN_ITEM_MAX_FALL_SPEED, item.vy + THROWN_ITEM_GRAVITY * delta);
      item.vx *= Math.exp(-0.72 * delta);

      const nextX = item.x + item.vx * delta;
      if (this.thrownItemCollides(nextX, item.y, item.radius)) {
        item.vx *= -0.16;
      } else {
        item.x = nextX;
      }

      const nextY = item.y + item.vy * delta;
      if (this.thrownItemCollides(item.x, nextY, item.radius)) {
        if (item.vy >= 0) {
          item.y = this.thrownItemLandingY(item.x, item.y, nextY, item.radius);
          item.vy = 0;
          item.vx *= 0.18;
          item.landed = true;
          if (item.utility === 'flare') {
            this.deployFlare(item.x, item.y);
            return false;
          }
        } else {
          item.vy *= -0.12;
        }
      } else {
        item.y = nextY;
      }
    }

    if (item.utility === 'dynamite' && item.landed) {
      item.fuse = Math.max(0, (item.fuse ?? DYNAMITE_LAND_FUSE) - delta);
      item.radius = scaledEntity(4.6 + Math.sin(this.time.now * 0.035) * 0.7);
      if (item.fuse <= 0) {
        this.detonateDynamite(item.x, item.y);
        return false;
      }
    }

    if (item.life <= 0) {
      if (item.utility === 'dynamite') {
        this.detonateDynamite(item.x, item.y);
      }
      return false;
    }
    return true;
  }

export function thrownItemCollides(this: DeepdiveScene, x: number, y: number, radius: number) {
    const points: Array<[number, number]> = [
      [x, y + radius],
      [x - radius * 0.72, y + radius * 0.55],
      [x + radius * 0.72, y + radius * 0.55],
      [x - radius * 0.55, y],
      [x + radius * 0.55, y],
    ];
    return points.some(([px, py]) => bargeSolidAtWorld(px, py) || tiles[this.tileAtWorld(px, py)].solid);
  }

export function thrownItemLandingY(this: DeepdiveScene, x: number, previousY: number, nextY: number, radius: number) {
    const bottomY = nextY + radius;
    if (bargeSolidAtWorld(x, bottomY)) {
      const gridY = Math.floor(bottomY / TILE);
      return gridY * TILE - radius - 0.5;
    }
    const tileY = Math.floor(bottomY / TILE);
    if (tileY >= 0 && tileY < WORLD_H) {
      return tileY * TILE - radius - 0.5;
    }
    return Math.min(previousY, WORLD_H * TILE - radius - 0.5);
  }

export function spawnFloatingText(this: DeepdiveScene, message: string, color: number) {
    const label = this.add.text(
      this.player.x + Phaser.Math.FloatBetween(-7, 7),
      this.player.y - 21 + Phaser.Math.FloatBetween(-3, 3),
      message,
      {
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontStyle: 'bold',
        stroke: '#020509',
        fontSize: '9px',
        strokeThickness: 3,
        backgroundColor: '#020509',
        padding: { x: 3, y: 2 },
      },
    );
    label.setOrigin(0.5);
    label.setDepth(10);
    label.setResolution(2);
    label.setScale(0.78);
    this.floatingTexts.push({
      label,
      age: 0,
      life: 1.15,
      vx: Phaser.Math.FloatBetween(-8, 8),
      vy: -32,
    });
    if (this.floatingTexts.length > 12) {
      this.floatingTexts.shift()?.label.destroy();
    }
  }

export function updateFloatingTexts(this: DeepdiveScene, delta: number) {
    this.floatingTexts = this.floatingTexts.filter((entry) => {
      entry.age += delta;
      entry.label.x += entry.vx * delta;
      entry.label.y += entry.vy * delta;
      entry.vy += 12 * delta;
      const t = Phaser.Math.Clamp(entry.age / entry.life, 0, 1);
      entry.label.setAlpha(1 - Phaser.Math.SmoothStep(t, 0.62, 1));
      entry.label.setScale(Phaser.Math.Linear(0.78, 1, Phaser.Math.Clamp(t / 0.22, 0, 1)));
      if (entry.age < entry.life) return true;
      entry.label.destroy();
      return false;
    });
  }

export function updateSonarPings(this: DeepdiveScene, delta: number) {
    const hadPings = this.sonarPings.length > 0;
    this.sonarPings = this.sonarPings.filter((ping) => {
      ping.age += delta;
      return ping.age < ping.life;
    });
    for (const contact of state.sonarContacts) {
      contact.age += delta;
    }
    if (hadPings) {
      this.requestSonarMapDraw();
    }
    if (state.sonarContacts.some((contact) => contact.age > 14)) {
      state.sonarContacts = state.sonarContacts.filter((contact) => contact.age <= 14);
      this.requestSonarMapDraw();
    }
  }

export function updateFlares(this: DeepdiveScene, delta: number) {
    this.flares = this.flares.filter((flare) => {
      flare.age += delta;
      return flare.age < flare.life;
    });
  }

export function scanNearbyLife(this: DeepdiveScene, delta: number, scanningHeld: boolean) {
    if (!scanningHeld) {
      this.player.scanTarget = null;
      return;
    }
    const range = 64 + state.upgrades.scanner * 18;
    const target = this.nearestLife(range);
    if (!target) {
      this.player.scanTarget = null;
      return;
    }

    this.player.scanTarget = target;
    target.scanning = true;
    target.scan += delta * (0.85 + state.upgrades.scanner * 0.28);
    if (target.kind === 'fish') {
      target.vx += (target.x - this.player.x) * delta * 0.22;
      target.vy += (target.y - this.player.y) * delta * 0.22;
    } else if (target.kind === 'articulated') {
      target.aggro = Math.max(target.aggro, 1.8);
    }
    if (target.scan < 1) return;

    target.scan = 0;
    target.scanPulse = 1;
    target.scanned = true;
    if (!state.scannedSpecies.has(target.species)) {
      state.scannedSpecies.add(target.species);
      const reward = scanReward(target);
      const rarity = scannableRarity(target);
      state.credits += reward;
      this.spawnFloatingText(`${target.species} scanned +${reward}c`, rarityColor(rarity));
      state.status = `Cataloged ${target.species} (${rarityLabel(rarity)}). Research paid ${reward} credits.`;
      const apexSpecies = currentApexSpecies();
      if (target.species === apexSpecies && state.depth >= TARGET_DEPTH) {
        if (state.biome === 4) {
          recoverFinalProof(target.species, state.depth);
          this.spawnFloatingText('Final proof recovered', 0xffd166);
        } else {
          state.status = `${biomeName()} is charted. The barge has a route deeper still.`;
        }
      }
      renderHud();
    }
  }

export function nearestLife(this: DeepdiveScene, range: number): ScanTarget | null {
    let nearest: ScanTarget | null = null;
    let nearestDistance = range;
    for (const life of [...this.fish, ...this.flora, ...this.articulatedCreatures]) {
      if (life.dead) continue;
      const articulatedHit = life.kind === 'articulated' ? this.closestArticulatedPartTo(life, this.player.x, this.player.y) : null;
      const distance = articulatedHit?.distance ?? Phaser.Math.Distance.Between(this.player.x, this.player.y, life.x, life.y);
      if (distance < nearestDistance) {
        nearest = life;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

export function nearestUnscannedLife(this: DeepdiveScene, x: number, y: number, range: number): ScanTarget | null {
    let nearest: ScanTarget | null = null;
    let nearestDistance = range;
    for (const life of [...this.fish, ...this.flora, ...this.articulatedCreatures]) {
      if (life.scanned) continue;
      const articulatedHit = life.kind === 'articulated' ? this.closestArticulatedPartTo(life, x, y) : null;
      const distance = articulatedHit?.distance ?? Phaser.Math.Distance.Between(x, y, life.x, life.y);
      if (distance < nearestDistance) {
        nearest = life;
        nearestDistance = distance;
      }
    }
    return nearest;
  }
