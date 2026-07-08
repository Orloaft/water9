import Phaser from 'phaser';
import type { ArticulatedCreature,CargoItem,Fish,Flare,Flora,Larva,NestEgg,ScanTarget,SubVehicle,ThrownUtility,Tile,TileDef } from './types';
import { DYNAMITE_LAND_FUSE,DYNAMITE_LIFE_DAMAGE,DYNAMITE_RADIUS_TILES,EGG_CUTTER_FUEL_COST,EGG_HATCH_SECONDS,FIRST_AID_REPAIR,FLARE_DURATION,FUEL_TANK_REFILL,INJECTOR_KNIFE_DAMAGE,INJECTOR_KNIFE_RANGE,LIFE_CUTTER_DAMAGE,LIFE_CUTTER_FUEL_COST,OXYGEN_TANK_REFILL,PLAYER_COLLISION_RADIUS,PLAYER_FORWARD_REACH,STUN_GRENADE_DURATION,STUN_GRENADE_RADIUS,THROWN_ITEM_SPEED,TILE } from './constants';
import { tiles,upgrades } from './content';
import { state } from './state';
import { rng } from './rng';
import { cargoCapacity,cargoIconForTile,cargoKindForTile,clampSelectedCargoIndex,clearBleed,clearVenom,createFloraSampleItem,finaleLocksSurvey,fuelMax,hash,hullMax,isLargeArticulatedThreat,isOreTile,mineCooldown,miningFuelCost,miningUpgradeBonus,oxygenMax,rarityColor,scaledEntity,scannableRarity,subCollisionHalfExtents,subDef,subDirectionalReach,subMiningRange } from './helpers';
import { renderHud } from './hud';
import { TOOL_LABELS } from './tools';
import type { DeepdiveScene } from './scene';
import { subtractTerrainMaskBrush,TERRAIN_MASK_HEIGHT,TERRAIN_MASK_RES,TERRAIN_MASK_SOLID_THRESHOLD,TERRAIN_MASK_WIDTH,terrainMaskDensityAt } from './terrain-mask';

const TERRAIN_BREAK_EFFECT_CAP = 72;
const OPENED_ORE_CORE_RELEASE_RATIO = 0.56;
const OPENED_ORE_SOLID_RELEASE_RATIO = 0.34;
const OPENED_ORE_DAMAGE_RELEASE_RATIO = 0.7;

export function mineFromSub(this: DeepdiveScene, sub: SubVehicle) {
    if (sub.tier < 2) {
      this.mineAt(this.player.x, this.player.y);
      return;
    }
    const dir = this.player.facing.clone();
    if (dir.lengthSq() <= 0.001) dir.set(sub.facingSign, 0);
    dir.normalize();
    const target = this.findSubMiningTarget(sub, dir);
    const reach = subMiningRange(sub);
    const fallbackX = this.player.x + dir.x * reach;
    const fallbackY = this.player.y + dir.y * reach;
    this.mineAt(target ? target.x * TILE + TILE * 0.5 : fallbackX, target ? target.y * TILE + TILE * 0.5 : fallbackY);
  }

export function findSubMiningTarget(this: DeepdiveScene, sub: SubVehicle, dir: Phaser.Math.Vector2) {
    const { halfW, halfH } = subCollisionHalfExtents(sub);
    const noseReach = subDirectionalReach(sub, dir);
    const lateral = new Phaser.Math.Vector2(-dir.y, dir.x);
    const beamHalfWidth = Math.max(scaledEntity(8), Math.min(halfW, halfH) * 0.36);
    const maxDistance = noseReach + 48 + miningUpgradeBonus() * 5;
    const seen = new Set<string>();
    let nearest: { x: number; y: number; distance: number } | null = null;
    for (let distance = Math.max(0, noseReach - TILE * 0.45); distance <= maxDistance; distance += TILE * 0.24) {
      for (const side of [-1, 0, 1]) {
        const px = this.player.x + dir.x * distance + lateral.x * beamHalfWidth * side;
        const py = this.player.y + dir.y * distance + lateral.y * beamHalfWidth * side;
        const x = Math.floor(px / TILE);
        const y = Math.floor(py / TILE);
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const tile = this.getTile(x, y);
        if (!tiles[tile].solid || tile === 'bedrock' || tile === 'anchorstone') continue;
        const candidate = { x, y, distance };
        if (!nearest || candidate.distance < nearest.distance) nearest = candidate;
      }
      if (nearest) return nearest;
    }
    return nearest;
  }

export function mineAt(this: DeepdiveScene, worldX: number, worldY: number) {
    const sub = state.pilotingSub ? state.activeSub : null;
    if (sub && sub.tier < 2) {
      state.status = `${subDef(sub.tier).name} carries scanners only. Buy a Marlin or Leviathan to mine from a sub.`;
      return;
    }
    const range = sub ? subMiningRange(sub) : 40 + miningUpgradeBonus() * 6;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldX, worldY);
    this.player.facing.set(Math.cos(angle), Math.sin(angle));
    this.updatePlayerFacing(Math.cos(angle));
    if (this.cutNestTarget(worldX, worldY, sub)) return;
    if (this.cutLifeTarget(worldX, worldY, sub)) return;
    const impact = miningTunnelTarget(this, angle, range);
    if (!impact) return;
    const aimedTile = this.getTile(Math.floor(worldX / TILE), Math.floor(worldY / TILE));
    const aimedSolidRock = tiles[aimedTile].solid && !isOreTile(aimedTile);
    const targets = this.mineTargets(impact.tx, impact.ty, impact.x, impact.y, !aimedSolidRock, aimedSolidRock, worldX, worldY);
    if (!targets.length) return;
    const fuelReserve = sub ? sub.fuel : state.fuel;
    if (fuelReserve > 0) {
      this.drillingThisFrame = true;
      emitDrillContactFeedback(this, impact, targets);
    }
    if (this.player.mineCooldown > 0) return;
    const fuelCost = miningFuelCost(targets.length);
    if (fuelReserve < fuelCost) {
      this.player.mineCooldown = Math.max(0.16, mineCooldown() * 0.65);
      state.status = sub ? 'Sub fuel reserves are dry. Return to the barge to refuel.' : 'Fuel reserves are dry. Return to the barge to refuel the cutter.';
      renderHud();
      return;
    }

    const power = 8.8 + miningUpgradeBonus() * 2.35;
    if (sub) sub.fuel = Math.max(0, sub.fuel - fuelCost);
    else state.fuel = Math.max(0, state.fuel - fuelCost);
    carveMiningTunnel(this, impact);
    this.refreshFloraAnchorsAround(impact.tx, impact.ty, 7);
    this.refreshFaunaAnchorsAround(impact.tx, impact.ty, 7);
    for (const target of targets) {
      const tile = this.getTile(target.x, target.y);
      const def = tiles[tile];
      if (!def.solid || tile === 'bedrock' || tile === 'anchorstone') continue;
      this.damage[target.y][target.x] += power;
      if (this.damage[target.y][target.x] >= def.hp) {
        this.breakTile(target.x, target.y, tile, def, impact.x, impact.y);
      }
    }
    releaseOpenedOreTiles(this, impact, targets);
    this.terrainDirty = true;
    this.player.mineCooldown = mineCooldown();
    if (sub) sub.oxygen = Math.max(0, sub.oxygen - (0.08 + targets.length * 0.02));
    else state.oxygen -= 0.11 + targets.length * 0.035;
    renderHud();
  }

export function useSelectedToolPrimary(this: DeepdiveScene, delta: number, worldX: number, worldY: number) {
    void delta;
    const tool = state.selectedTool;
    if (!state.unlockedTools[tool]) {
      state.status = `${TOOL_LABELS[tool]} is not fitted yet. Select drill, scanner, or sonar.`;
      renderHud();
      return false;
    }
    if (tool === 'drill') {
      this.mineAt(worldX, worldY);
      return false;
    }
    if (tool === 'scanner') {
      return true;
    }
    if (tool === 'sampler') {
      this.sampleNearbyFlora(delta);
      return false;
    }
    if (tool === 'sonar') {
      this.sonarPing();
      return false;
    }
    if (tool === 'stun') {
      const grenadeIndex = state.cargo.findIndex((item) => item.id === 'stun-grenade' && item.kind === 'consumable');
      if (grenadeIndex < 0) {
        state.status = 'No stun grenade loaded. Buy or recover one before firing the stun tool.';
        renderHud();
        return false;
      }
      state.cargo.splice(grenadeIndex, 1);
      state.selectedCargoIndex = Math.min(state.selectedCargoIndex, Math.max(0, state.cargo.length - 1));
      clampSelectedCargoIndex();
      this.triggerStunPulse();
      renderHud();
      return false;
    }
    state.status = `${TOOL_LABELS[tool]} is coming in a later tool slice. No cargo was consumed.`;
    renderHud();
    return false;
  }

export function sampleNearbyFlora(this: DeepdiveScene, delta: number) {
    const target = this.nearestSampleFlora(scaledEntity(42));
    if (!target) {
      state.status = 'Sampler needs close, anchored gameplay flora. Decorative growth, fauna, ore, and terrain cannot be sampled.';
      renderHud();
      return;
    }
    if (state.cargo.length >= cargoCapacity()) {
      state.status = `Cargo grid is full. Return to the barge or drop cargo before harvesting ${target.species}.`;
      renderHud();
      return;
    }
    target.sampling = true;
    target.sample += delta * (0.72 + Math.min(state.upgrades.scanner, 4) * 0.08);
    if (target.hazardous && !target.scanned) target.aggroCue = Math.max(target.aggroCue, 0.35);
    if (target.sample < 1) return;

    target.sample = 0;
    target.samplePulse = 1;
    target.sampleCooldown = 0;
    target.dead = true;
    target.sprite?.setVisible(false);
    const sampleItem = createFloraSampleItem(target);
    state.cargo.push(sampleItem);
    state.selectedCargoIndex = state.cargo.length - 1;
    const firstSpeciesSample = !state.sampledSpecies.has(target.species);
    if (firstSpeciesSample) state.sampledSpecies.add(target.species);
    const rarity = scannableRarity(target);
    const scanHint = target.scanned
      ? 'scanner ID confirmed clean chemistry'
      : 'unscanned tissue logged at reduced confidence';
    this.spawnFloatingText(`${target.species} sample`, rarityColor(rarity));
    state.status = firstSpeciesSample
      ? `Flora sample harvested: ${target.species}. ${scanHint}; cargo vial worth ${sampleItem.value} credits.`
      : `Duplicate ${target.species} sample harvested for sale. Species research was already logged.`;
    this.updateQuestProgress();
    renderHud();
  }

export function nearestSampleFlora(this: DeepdiveScene, range: number): Flora | null {
    let nearest: Flora | null = null;
    let nearestDistance = range;
    for (const flora of this.flora) {
      if (flora.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y);
      if (distance < nearestDistance) {
        nearest = flora;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

type MiningTunnelTarget = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  dx: number;
  dy: number;
  lateralX: number;
  lateralY: number;
};

function miningTunnelTarget(scene: DeepdiveScene, angle: number, range: number): MiningTunnelTarget | null {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const lateralX = -dy;
    const lateralY = dx;
    const start = state.pilotingSub ? TILE * 0.55 : TILE * 0.48;
    const step = TERRAIN_MASK_RES > 0 ? Math.max(2, TILE / TERRAIN_MASK_RES * 0.62) : 2;
    const halfWidth = state.pilotingSub
      ? TILE * 0.42
      : PLAYER_COLLISION_RADIUS * 1.45 + miningUpgradeBonus() * 0.75;
    const offsets = [0, -halfWidth * 0.58, halfWidth * 0.58, -halfWidth, halfWidth];
    for (let distance = start; distance <= range + step; distance += step) {
      for (const offset of offsets) {
        const x = scene.player.x + dx * distance + lateralX * offset;
        const y = scene.player.y + dy * distance + lateralY * offset;
        const tx = Math.floor(x / TILE);
        const ty = Math.floor(y / TILE);
        const tile = scene.getTile(tx, ty);
        if (!tiles[tile].solid || tile === 'bedrock' || tile === 'anchorstone') continue;
        const sx = Math.floor((x / TILE) * TERRAIN_MASK_RES);
        const sy = Math.floor((y / TILE) * TERRAIN_MASK_RES);
        if (terrainMaskDensityAt(scene, sx, sy) < TERRAIN_MASK_SOLID_THRESHOLD) continue;
        return { x, y, tx, ty, dx, dy, lateralX, lateralY };
      }
    }
    return null;
  }

function carveMiningTunnel(scene: DeepdiveScene, impact: MiningTunnelTarget) {
    const bonus = miningUpgradeBonus();
    const radius = state.pilotingSub
      ? TILE * (0.38 + bonus * 0.012)
      : TILE * (0.42 + bonus * 0.018);
    const lateralSpan = state.pilotingSub
      ? TILE * 0.42
      : PLAYER_COLLISION_RADIUS * 1.72 + bonus * 0.72;
    const upwardBias = state.pilotingSub ? 0 : PLAYER_COLLISION_RADIUS * 1.08;
    const lowerBias = state.pilotingSub ? 0 : PLAYER_COLLISION_RADIUS * 0.34;
    const centers = [
      { along: 0, side: 0, lift: upwardBias },
      { along: 0, side: 0, lift: -lowerBias },
      { along: -radius * 0.7, side: 0, lift: upwardBias },
      { along: -radius * 0.7, side: 0, lift: 0 },
      { along: -radius * 1.4, side: 0, lift: upwardBias * 0.72 },
      { along: -radius * 0.45, side: -lateralSpan, lift: upwardBias * 0.82 },
      { along: -radius * 0.45, side: lateralSpan, lift: upwardBias * 0.82 },
      { along: -radius * 1.05, side: -lateralSpan * 0.74, lift: upwardBias * 0.5 },
      { along: -radius * 1.05, side: lateralSpan * 0.74, lift: upwardBias * 0.5 },
    ];
    for (const center of centers) {
      const x = impact.x + impact.dx * center.along + impact.lateralX * center.side;
      const y = impact.y + impact.dy * center.along + impact.lateralY * center.side - center.lift;
      const edgeSeed = hash(Math.floor(x), Math.floor(y), rng.seed + 7011);
      subtractTerrainMaskBrush(scene, x, y, radius * (0.9 + edgeSeed * 0.16), 0.3);
    }
  }

function releaseOpenedOreTiles(scene: DeepdiveScene, impact: MiningTunnelTarget, targets: Array<{ x: number; y: number }>) {
    const minedTiles = new Set(targets.map((target) => `${target.x},${target.y}`));
    for (let y = impact.ty - 3; y <= impact.ty + 3; y += 1) {
      for (let x = impact.tx - 3; x <= impact.tx + 3; x += 1) {
        if (!minedTiles.has(`${x},${y}`)) continue;
        const tile = scene.getTile(x, y);
        if (!isOreTile(tile)) continue;
        const def = tiles[tile];
        if (!def.solid || def.value <= 0) continue;
        const openCoreRatio = tileMaskOpenCoreRatio(scene, x, y);
        const solidRatio = tileMaskSolidRatio(scene, x, y);
        const damageRatio = Number.isFinite(def.hp) && def.hp > 0
          ? (scene.damage[y]?.[x] ?? 0) / def.hp
          : 0;
        const minedOpenOre = damageRatio >= OPENED_ORE_DAMAGE_RELEASE_RATIO;
        if (!minedOpenOre && openCoreRatio < OPENED_ORE_CORE_RELEASE_RATIO && solidRatio > OPENED_ORE_SOLID_RELEASE_RATIO) continue;
        if (minedOpenOre && openCoreRatio < OPENED_ORE_CORE_RELEASE_RATIO && solidRatio > OPENED_ORE_SOLID_RELEASE_RATIO) {
          clearTerrainMaskTile(scene, x, y);
        }
        scene.breakTile(x, y, tile, def, impact.x, impact.y);
      }
    }
  }

export function cutNestTarget(this: DeepdiveScene, worldX: number, worldY: number, sub: SubVehicle | null) {
    const target = this.nearestNestCutTarget(worldX, worldY);
    if (!target) return false;
    const fuelReserve = sub ? sub.fuel : state.fuel;
    if (fuelReserve > 0) this.drillingThisFrame = true;
    if (this.player.mineCooldown > 0) return true;
    if (fuelReserve < EGG_CUTTER_FUEL_COST) {
      this.player.mineCooldown = Math.max(0.14, mineCooldown() * 0.55);
      state.status = 'Not enough fuel to cut nest matter. Back out or switch supplies fast.';
      renderHud();
      return true;
    }
    if (sub) sub.fuel = Math.max(0, sub.fuel - EGG_CUTTER_FUEL_COST);
    else state.fuel = Math.max(0, state.fuel - EGG_CUTTER_FUEL_COST);
    this.player.mineCooldown = mineCooldown() * 0.72;

    if ('hp' in target) {
      target.hp -= 8.5 + miningUpgradeBonus() * 1.4;
      target.state = target.state === 'dormant' ? 'hatching' : target.state;
      target.hatch = Math.min(target.hatch, EGG_HATCH_SECONDS * 0.72);
      if (target.hp <= 0) {
        target.state = 'destroyed';
        target.sprite?.setVisible(false);
        this.spawnFloatingText('Egg destroyed', 0xffd166);
        state.status = 'Nest egg destroyed before the swarm could break free.';
      } else {
        state.status = 'Nest egg shell is cracking under the cutter.';
      }
    } else {
      this.larvae = this.larvae.filter((larva) => larva !== target);
      target.sprite?.setVisible(false);
      this.spawnFloatingText('Larva killed', 0xffd166);
      state.status = 'Larva burned off the suit.';
    }
    this.checkNestRewards();
    renderHud();
    return true;
  }

export function cutLifeTarget(this: DeepdiveScene, worldX: number, worldY: number, sub: SubVehicle | null) {
    const articulatedTarget = this.nearestArticulatedDamageTarget(worldX, worldY, scaledEntity(26));
    if (articulatedTarget) {
      const fuelReserve = sub ? sub.fuel : state.fuel;
      if (fuelReserve > 0) this.drillingThisFrame = true;
      if (this.player.mineCooldown > 0) return true;
      if (fuelReserve < LIFE_CUTTER_FUEL_COST) {
        this.player.mineCooldown = Math.max(0.14, mineCooldown() * 0.55);
        state.status = 'Not enough fuel to keep the cutter hot.';
        renderHud();
        return true;
      }
      if (sub) sub.fuel = Math.max(0, sub.fuel - LIFE_CUTTER_FUEL_COST);
      else state.fuel = Math.max(0, state.fuel - LIFE_CUTTER_FUEL_COST);
      this.player.mineCooldown = mineCooldown() * 0.58;
      if (isLargeArticulatedThreat(articulatedTarget.creature)) {
        const dx = articulatedTarget.part.x - this.player.x;
        const dy = articulatedTarget.part.y - this.player.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        articulatedTarget.creature.vx += (dx / distance) * 18;
        articulatedTarget.creature.vy += (dy / distance) * 12;
        articulatedTarget.creature.aggro = Math.max(articulatedTarget.creature.aggro, 2.2);
        articulatedTarget.creature.aggroCue = Math.max(articulatedTarget.creature.aggroCue, 0.75);
        state.status = `The cutter skates off ${articulatedTarget.creature.species}'s armored hide. Stun it and run the route.`;
        this.spawnFloatingText('Armored hide', 0x8ee7f4);
        renderHud();
        return true;
      }
      this.damageArticulatedPart(
        articulatedTarget.creature,
        articulatedTarget.part,
        LIFE_CUTTER_DAMAGE + miningUpgradeBonus() * 2.8,
        'Cutter',
      );
      renderHud();
      return true;
    }
    const target = this.nearestLifeDamageTarget(worldX, worldY, scaledEntity(20));
    if (!target) return false;
    const fuelReserve = sub ? sub.fuel : state.fuel;
    if (fuelReserve > 0) this.drillingThisFrame = true;
    if (this.player.mineCooldown > 0) return true;
    if (fuelReserve < LIFE_CUTTER_FUEL_COST) {
      this.player.mineCooldown = Math.max(0.14, mineCooldown() * 0.55);
      state.status = 'Not enough fuel to keep the cutter hot.';
      renderHud();
      return true;
    }
    if (sub) sub.fuel = Math.max(0, sub.fuel - LIFE_CUTTER_FUEL_COST);
    else state.fuel = Math.max(0, state.fuel - LIFE_CUTTER_FUEL_COST);
    this.player.mineCooldown = mineCooldown() * 0.58;
    this.damageLifeTarget(target, LIFE_CUTTER_DAMAGE + miningUpgradeBonus() * 2.8, 'Cutter');
    renderHud();
    return true;
  }

export function nearestLifeDamageTarget(this: DeepdiveScene, worldX: number, worldY: number, extraRange: number): ScanTarget | null {
    let nearest: { target: ScanTarget; distance: number } | null = null;
    for (const fish of this.fish) {
      if (fish.dead) continue;
      const distance = Phaser.Math.Distance.Between(worldX, worldY, fish.x, fish.y);
      if (distance > fish.radius + extraRange) continue;
      if (!nearest || distance < nearest.distance) nearest = { target: fish, distance };
    }
    for (const flora of this.flora) {
      if (flora.dead) continue;
      const distance = Phaser.Math.Distance.Between(worldX, worldY, flora.x, flora.y);
      if (distance > flora.radius + extraRange) continue;
      if (!nearest || distance < nearest.distance) nearest = { target: flora, distance };
    }
    return nearest?.target ?? null;
  }

export function damageLifeTarget(this: DeepdiveScene, target: ScanTarget, amount: number, source: string) {
    if (target.kind === 'articulated') {
      const hit = this.closestArticulatedPartTo(target, this.player.x, this.player.y);
      if (!hit) return false;
      return this.damageArticulatedPart(target, hit.part, amount, source);
    }
    if (target.dead || amount <= 0) return false;
    target.hp = Math.max(0, target.hp - amount);
    target.hurtFlash = 1;
    if (target.kind === 'fish') {
      const wasAggroed = target.aggro > 0;
      if (target.behaviorClass === 'sessileAttached') {
        target.aggroCue = target.hostile ? Math.max(target.aggroCue, 0.9) : target.aggroCue;
      } else {
        target.aggro = target.hostile ? Math.max(target.aggro, 3.2) : target.aggro;
      }
      if (target.hostile && !wasAggroed) target.aggroCue = Math.max(target.aggroCue, 0.9);
      if (target.behaviorClass === 'legacySwimmer' || !target.behaviorClass) {
        target.vx += Phaser.Math.FloatBetween(-18, 18);
        target.vy += Phaser.Math.FloatBetween(-18, 18);
      }
    }
    if (target.hp > 0) {
      state.status = `${source} hit ${target.species}.`;
      return true;
    }
    target.dead = true;
    target.scanning = false;
    target.scan = 0;
    target.sprite?.setVisible(false);
    state.status = `${target.species} killed by ${source.toLowerCase()}.`;
    this.spawnFloatingText(`${target.species} killed`, 0xffd166);
    return true;
  }

export function damageLifeInRadius(this: DeepdiveScene, centerX: number, centerY: number, radius: number, amount: number, source: string) {
    let hits = 0;
    for (const target of [...this.fish, ...this.flora]) {
      if (target.dead) continue;
      const distance = Phaser.Math.Distance.Between(centerX, centerY, target.x, target.y);
      if (distance > radius + target.radius) continue;
      const falloff = Phaser.Math.Clamp(1 - distance / Math.max(1, radius + target.radius), 0.28, 1);
      this.damageLifeTarget(target, amount * falloff, source);
      hits += 1;
    }
    hits += this.damageArticulatedInRadius(centerX, centerY, radius, amount, source);
    return hits;
  }

export function nearestNestCutTarget(this: DeepdiveScene, worldX: number, worldY: number): NestEgg | Larva | null {
    let nearest: { target: NestEgg | Larva; distance: number } | null = null;
    for (const egg of this.nestEggs) {
      if (egg.state === 'destroyed' || egg.state === 'hatched') continue;
      const distance = Phaser.Math.Distance.Between(worldX, worldY, egg.x, egg.y);
      if (distance > egg.radius + scaledEntity(18)) continue;
      if (!nearest || distance < nearest.distance) nearest = { target: egg, distance };
    }
    for (const larva of this.larvae) {
      const distance = Phaser.Math.Distance.Between(worldX, worldY, larva.x, larva.y);
      if (distance > larva.radius + scaledEntity(18)) continue;
      if (!nearest || distance < nearest.distance) nearest = { target: larva, distance };
    }
    return nearest?.target ?? null;
  }

export function mineTargets(this: DeepdiveScene, tx: number, ty: number, impactX = tx * TILE + TILE * 0.5, impactY = ty * TILE + TILE * 0.5, allowVisibleOreTarget = true, allowOreFaceAssist = false, aimX = impactX, aimY = impactY) {
    const maxBlocks = 1;
    const radius = maxBlocks > 1 ? 1 : 0;
    const oreTarget = allowVisibleOreTarget
      ? visibleOreTargetNear(this, tx, ty, impactX, impactY, false)
      : allowOreFaceAssist
        ? visibleOreTargetNear(this, Math.floor(aimX / TILE), Math.floor(aimY / TILE), aimX, aimY, true)
        : null;
    if (oreTarget) return [oreTarget];
    const targets: Array<{ x: number; y: number; distance: number }> = [];
    for (let y = ty - radius; y <= ty + radius; y += 1) {
      for (let x = tx - radius; x <= tx + radius; x += 1) {
        const gridDistance = Math.abs(x - tx) + Math.abs(y - ty);
        if (gridDistance > 1) continue;
        const tile = this.getTile(x, y);
        if (tiles[tile].solid && tile !== 'bedrock' && tile !== 'anchorstone') {
          const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, x * TILE + TILE * 0.5, y * TILE + TILE * 0.5);
          targets.push({ x, y, distance });
        }
      }
    }
    return targets
      .sort((a, b) => a.distance - b.distance || hash(a.x, a.y, rng.seed) - hash(b.x, b.y, rng.seed))
      .slice(0, maxBlocks);
  }

function visibleOreTargetNear(scene: DeepdiveScene, tx: number, ty: number, impactX: number, impactY: number, faceAssistOnly: boolean) {
    let best: { x: number; y: number; distance: number; impactDistance: number } | null = null;
    const searchRadius = faceAssistOnly ? 2 : 1;
    for (let y = ty - searchRadius; y <= ty + searchRadius; y += 1) {
      for (let x = tx - searchRadius; x <= tx + searchRadius; x += 1) {
        const tile = scene.getTile(x, y);
        if (!isOreTile(tile) || !tiles[tile].solid) continue;
        const component = stableOreTargetComponent(scene, x, y, tile);
        const centerX = (component.minX + component.maxX + 1) * TILE * 0.5 + (hash(component.rootX, component.rootY, rng.seed + 71) - 0.5) * TILE * 0.34;
        const centerY = (component.minY + component.maxY + 1) * TILE * 0.5 + (hash(component.rootY, component.rootX, rng.seed + 73) - 0.5) * TILE * 0.28;
        const impactDistance = Phaser.Math.Distance.Between(impactX, impactY, centerX, centerY);
        const hitRadius = TILE * (component.cells.length > 1 ? 0.78 : 0.62);
        if (faceAssistOnly) {
          if (!impactTouchesOreFace(component, impactX, impactY)) continue;
        } else if (impactDistance > hitRadius) continue;
        const distance = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, x * TILE + TILE * 0.5, y * TILE + TILE * 0.5);
        if (!best || impactDistance < best.impactDistance || (impactDistance === best.impactDistance && distance < best.distance)) {
          best = { x, y, distance, impactDistance };
        }
      }
    }
    return best ? { x: best.x, y: best.y, distance: best.distance } : null;
  }

function impactTouchesOreFace(component: ReturnType<typeof stableOreTargetComponent>, impactX: number, impactY: number) {
    const minX = component.minX * TILE;
    const maxX = (component.maxX + 1) * TILE;
    const minY = component.minY * TILE;
    const maxY = (component.maxY + 1) * TILE;
    const insideX = impactX >= minX && impactX <= maxX;
    const insideY = impactY >= minY && impactY <= maxY;
    if (insideX && insideY) return true;
    const dx = impactX < minX ? minX - impactX : impactX > maxX ? impactX - maxX : 0;
    const dy = impactY < minY ? minY - impactY : impactY > maxY ? impactY - maxY : 0;
    const faceMargin = TILE * (component.cells.length > 1 ? 0.48 : 0.36);
    if (dx > faceMargin || dy > faceMargin) return false;
    return Math.hypot(dx, dy) <= faceMargin;
  }

function stableOreTargetComponent(scene: DeepdiveScene, startX: number, startY: number, tile: Tile) {
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

export function breakTile(this: DeepdiveScene, tx: number, ty: number, tile: Tile, def: TileDef, impactX?: number, impactY?: number) {
    const x = tx * TILE + TILE * 0.5;
    const y = ty * TILE + TILE * 0.5;
    const chipX = Number.isFinite(impactX) ? impactX as number : x;
    const chipY = Number.isFinite(impactY) ? impactY as number : y;
    subtractTerrainMaskBrush(this, chipX, chipY, TILE * 0.34, 0.78);
    const forcedOreRelease = def.value > 0 && Number.isFinite(def.hp) && def.hp > 0 && (this.damage[ty]?.[tx] ?? 0) >= def.hp;
    let solidRatio = tileMaskSolidRatio(this, tx, ty);
    const releasedFromOpenOreCore = def.value > 0 && tileMaskOpenCoreRatio(this, tx, ty) >= OPENED_ORE_CORE_RELEASE_RATIO;
    if (forcedOreRelease && solidRatio > OPENED_ORE_SOLID_RELEASE_RATIO) {
      clearTerrainMaskTile(this, tx, ty);
      solidRatio = 0;
    }
    if (solidRatio > OPENED_ORE_SOLID_RELEASE_RATIO && !releasedFromOpenOreCore) {
      this.damage[ty][tx] = def.hp * 0.28;
      this.terrainDirty = true;
      this.terrainBoundsKey = '';
      this.markTerrainVisualDirty(tx, ty);
      this.refreshFloraAnchorsAround(tx, ty, 5);
      this.refreshFaunaAnchorsAround(tx, ty, 5);
      this.terrainBreakEffects.push({ x: chipX, y: chipY, age: 0, life: 0.42, color: def.color, seed: hash(tx, ty, rng.seed), kind: 'break' });
      trimTerrainBreakEffects(this);
      state.status = `Chipped ${def.name}.`;
      return;
    }
    if (releasedFromOpenOreCore && solidRatio > OPENED_ORE_SOLID_RELEASE_RATIO) {
      clearTerrainMaskTile(this, tx, ty);
    }
    this.world[ty][tx] = 'water';
    this.damage[ty][tx] = 0;
    this.terrainDirty = true;
    this.terrainBoundsKey = '';
    this.markTerrainVisualDirty(tx, ty);
    this.refreshEnvironmentPropsAround(tx, ty);
    this.refreshFloraAnchorsAround(tx, ty, 6);
    this.refreshFaunaAnchorsAround(tx, ty, 6);
    this.terrainBreakEffects.push({ x: chipX, y: chipY, age: 0, life: 0.5, color: def.color, seed: hash(tx, ty, rng.seed), kind: def.value > 0 ? 'oreGlint' : 'break' });
    trimTerrainBreakEffects(this);
    this.spawnLoose(tile, def, x, y, tx, ty);
    if (def.value > 0) {
      state.status = state.cargo.length < cargoCapacity()
        ? `${def.name} broke loose. Swim near it to collect.`
        : `Cargo full. ${def.name} broke loose and can be picked up later.`;
    } else {
      state.status = `Cut through ${def.name}.`;
    }
  }

function tileMaskSolidRatio(scene: DeepdiveScene, tx: number, ty: number) {
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

function tileMaskOpenCoreRatio(scene: DeepdiveScene, tx: number, ty: number) {
    let open = 0;
    let samples = 0;
    for (let ly = 2; ly <= 5; ly += 1) {
      for (let lx = 2; lx <= 5; lx += 1) {
        const sx = tx * TERRAIN_MASK_RES + lx;
        const sy = ty * TERRAIN_MASK_RES + ly;
        samples += 1;
        if (terrainMaskDensityAt(scene, sx, sy) < TERRAIN_MASK_SOLID_THRESHOLD) open += 1;
      }
    }
    return samples > 0 ? open / samples : 0;
  }

function clearTerrainMaskTile(scene: DeepdiveScene, tx: number, ty: number) {
    if (scene.terrainMask.length !== TERRAIN_MASK_WIDTH * TERRAIN_MASK_HEIGHT) return;
    for (let ly = 0; ly < TERRAIN_MASK_RES; ly += 1) {
      const sy = ty * TERRAIN_MASK_RES + ly;
      if (sy < 0 || sy >= TERRAIN_MASK_HEIGHT) continue;
      for (let lx = 0; lx < TERRAIN_MASK_RES; lx += 1) {
        const sx = tx * TERRAIN_MASK_RES + lx;
        if (sx < 0 || sx >= TERRAIN_MASK_WIDTH) continue;
        scene.terrainMask[sy * TERRAIN_MASK_WIDTH + sx] = 0;
      }
    }
    scene.terrainDirty = true;
    scene.terrainBoundsKey = '';
  }

function trimTerrainBreakEffects(scene: DeepdiveScene) {
    if (scene.terrainBreakEffects.length > TERRAIN_BREAK_EFFECT_CAP) {
      scene.terrainBreakEffects.splice(0, scene.terrainBreakEffects.length - TERRAIN_BREAK_EFFECT_CAP);
    }
  }

function emitDrillContactFeedback(scene: DeepdiveScene, impact: MiningTunnelTarget, targets: Array<{ x: number; y: number; distance: number }>) {
    const now = scene.time.now;
    const oreTarget = targets.find((target) => tiles[scene.getTile(target.x, target.y)].value > 0);
    const minGap = oreTarget ? 42 : 58;
    if (now < scene.lastMiningFeedbackAt + minGap) return;
    scene.lastMiningFeedbackAt = now;
    const tile = oreTarget ? scene.getTile(oreTarget.x, oreTarget.y) : scene.getTile(impact.tx, impact.ty);
    const def = tiles[tile];
    const seedBase = hash(impact.tx * 17 + Math.floor(now / minGap), impact.ty * 23, rng.seed + 9137);
    const color = def.value > 0 ? def.color : (tile === 'sand' ? 0xb08d66 : def.color);
    const count = def.value > 0 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const side = (hash(impact.tx + i * 11, impact.ty - i * 7, rng.seed + Math.floor(now / minGap)) - 0.5) * TILE * 0.34;
      const along = (hash(impact.ty + i * 13, impact.tx + i * 5, rng.seed + Math.floor(now / minGap) + 3) - 0.5) * TILE * 0.2;
      scene.terrainBreakEffects.push({
        x: impact.x + impact.lateralX * side + impact.dx * along,
        y: impact.y + impact.lateralY * side + impact.dy * along,
        age: 0,
        life: def.value > 0 ? 0.34 : 0.24,
        color,
        seed: seedBase + i * 0.173,
        kind: def.value > 0 ? 'oreGlint' : 'contact',
      });
    }
    trimTerrainBreakEffects(scene);
  }

export function spawnLoose(this: DeepdiveScene, tile: Tile, def: TileDef, x: number, y: number, tx?: number, ty?: number) {
    const pieces = def.value > 0 ? 1 : 3;
    for (let i = 0; i < pieces; i += 1) {
      const valuable = def.value > 0 && i === 0;
      const seedX = tx ?? Math.floor(x / TILE);
      const seedY = ty ?? Math.floor(y / TILE);
      const deterministicRoll = hash(seedX + i * 17, seedY - i * 23, rng.seed + 9901);
      const angle = valuable ? deterministicRoll * Math.PI * 2 : Math.random() * Math.PI * 2;
      const speed = valuable ? 7 + deterministicRoll * 5 : Phaser.Math.FloatBetween(10, 42);
      this.looseItems.push({
        id: valuable ? tile : 'stone',
        name: def.name,
        value: valuable ? def.value : 0,
        x: x + (valuable ? Math.cos(angle) * 3 : Phaser.Math.FloatBetween(-4, 4)),
        y: y + (valuable ? Math.sin(angle) * 3 : Phaser.Math.FloatBetween(-4, 4)),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (valuable ? 5 : 0),
        color: def.color,
        radius: valuable ? scaledEntity(7.5) : Phaser.Math.FloatBetween(scaledEntity(2), scaledEntity(3.5)),
        life: valuable ? Infinity : Phaser.Math.FloatBetween(4, 8),
        kind: valuable ? cargoKindForTile(tile) : 'rubble',
        icon: valuable ? cargoIconForTile(tile) : 'item-icon-stone',
        exposed: valuable,
        pickupDelay: valuable ? 0.22 : 0,
        phase: valuable ? deterministicRoll * Math.PI * 2 : Math.random() * Math.PI * 2,
        sourceTileX: valuable ? seedX : undefined,
        sourceTileY: valuable ? seedY : undefined,
      });
    }
    if (this.looseItems.length > 220) {
      this.looseItems = this.looseItems.slice(-220);
    }
  }

export function detonateDynamite(this: DeepdiveScene, centerX: number, centerY: number) {
    const tx = Math.floor(centerX / TILE);
    const ty = Math.floor(centerY / TILE);
    let broken = 0;
    for (let y = ty - DYNAMITE_RADIUS_TILES; y <= ty + DYNAMITE_RADIUS_TILES; y += 1) {
      for (let x = tx - DYNAMITE_RADIUS_TILES; x <= tx + DYNAMITE_RADIUS_TILES; x += 1) {
        const distance = Math.hypot(x - tx, y - ty);
        if (distance > DYNAMITE_RADIUS_TILES + 0.15) continue;
        const tile = this.getTile(x, y);
        const def = tiles[tile];
        if (!def.solid || tile === 'bedrock' || tile === 'anchorstone') continue;
        this.breakTile(x, y, tile, def);
        broken += 1;
      }
    }
    const lifeHits = this.damageLifeInRadius(centerX, centerY, TILE * (DYNAMITE_RADIUS_TILES + 1.2), DYNAMITE_LIFE_DAMAGE, 'Dynamite');
    this.terrainDirty = true;
    this.overlay.fillStyle(0xff6f3c, 0.32);
    this.overlay.fillCircle(centerX, centerY, TILE * (DYNAMITE_RADIUS_TILES + 0.55));
    state.status = broken > 0
      ? `Dynamite blast opened ${broken} block${broken === 1 ? '' : 's'}${lifeHits > 0 ? ` and hit ${lifeHits} lifeform${lifeHits === 1 ? '' : 's'}` : ''}.`
      : lifeHits > 0
        ? `Dynamite shockwave hit ${lifeHits} lifeform${lifeHits === 1 ? '' : 's'}.`
        : 'Dynamite detonated, but the rock here would not give.';
    this.spawnFloatingText(broken > 0 ? `Blast x${broken}` : 'Dynamite', 0xff8a5c);
    renderHud();
  }

export function deployFlare(this: DeepdiveScene, x: number, y: number) {
    this.flares.push({ x, y, age: 0, life: FLARE_DURATION });
    if (this.flares.length > 8) this.flares.shift();
    this.revealSonarAtWorld(x, y, 7);
    state.status = 'Flare burning. Nearby water is lit for a short while.';
    this.spawnFloatingText('Flare deployed', 0xff8a5c);
    renderHud();
  }

export function triggerStunPulse(this: DeepdiveScene, ) {
    let stunned = 0;
    for (const fish of this.fish) {
      if (!fish.hostile) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance > STUN_GRENADE_RADIUS) continue;
      fish.stunned = STUN_GRENADE_DURATION;
      fish.aggro = 0;
      fish.vx *= 0.12;
      fish.vy *= 0.12;
      stunned += 1;
    }
    for (const creature of this.articulatedCreatures) {
      if (creature.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, creature.x, creature.y);
      if (distance > STUN_GRENADE_RADIUS + creature.radius) continue;
      creature.stunned = STUN_GRENADE_DURATION * 0.72;
      creature.aggro = 0;
      creature.vx *= 0.18;
      creature.vy *= 0.18;
      if (creature.bobbitBurrow?.phase === 'drag') this.releaseBurrowBobbit(creature, 'stun');
      stunned += 1;
    }
    state.status = stunned > 0
      ? `Stun grenade fired. ${stunned} predator${stunned === 1 ? '' : 's'} stunned for ${STUN_GRENADE_DURATION} seconds.`
      : 'Stun grenade fired. No predators were close enough to catch the pulse.';
    this.spawnFloatingText(stunned > 0 ? `Stunned x${stunned}` : 'Stun pulse', 0x8ee7f4);
  }

export function throwUtilityItem(this: DeepdiveScene, item: CargoItem, utility: ThrownUtility) {
    const facing = this.player.facing.lengthSq() > 0 ? this.player.facing.clone().normalize() : new Phaser.Math.Vector2(this.player.facingSign, 0);
    const sideways = new Phaser.Math.Vector2(-facing.y, facing.x);
    const x = this.player.x + facing.x * (PLAYER_FORWARD_REACH + 14);
    const y = this.player.y + facing.y * (PLAYER_FORWARD_REACH + 14);
    this.looseItems.push({
      ...item,
      x,
      y,
      vx: this.player.vx * 0.18 + facing.x * THROWN_ITEM_SPEED + sideways.x * Phaser.Math.FloatBetween(-8, 8),
      vy: this.player.vy * 0.18 + facing.y * (THROWN_ITEM_SPEED * 0.55) - 18,
      radius: utility === 'dynamite' ? scaledEntity(4.6) : scaledEntity(4),
      life: utility === 'dynamite' ? 90 : 120,
      utility,
      landed: false,
      fuse: utility === 'dynamite' ? DYNAMITE_LAND_FUSE : 0,
    });
    state.status = utility === 'dynamite'
      ? 'Dynamite thrown. It will sink and detonate when it catches on terrain.'
      : 'Flare thrown. It will sink and ignite where it lands.';
    this.spawnFloatingText(utility === 'dynamite' ? 'Dynamite thrown' : 'Flare thrown', item.color);
  }

export function useInjectorKnife(this: DeepdiveScene, ) {
    const larva = this.nearestKnifeLarva();
    if (larva) {
      this.larvae = this.larvae.filter((candidate) => candidate !== larva);
      larva.sprite?.setVisible(false);
      state.status = larva.latched ? 'Injector knife cut the larva free.' : 'Injector knife pinned a hatchling.';
      this.spawnFloatingText('Larva cut', 0xd06bff);
      this.checkNestRewards();
      renderHud();
      return true;
    }
    const target = this.nearestKnifeTarget();
    if (!target) {
      state.status = 'Injector knife swiped through open water. Get closer to a predator.';
      this.spawnFloatingText('Miss', 0xa9b8c9);
      renderHud();
      return false;
    }
    const damage = INJECTOR_KNIFE_DAMAGE + state.upgrades.suit * 0.8;
    this.damageLifeTarget(target, damage, 'Injector knife');
    if (target.kind === 'articulated' && target.bobbitBurrow?.phase === 'drag') {
      const bitePart = this.articulatedBitePart(target);
      const hit = this.closestArticulatedPartTo(target, this.player.x, this.player.y);
      if (!bitePart || hit?.part.id === bitePart.id || hit?.part.id === 'head' || hit?.part.id.includes('mandible')) {
        target.bobbitBurrow.escapeRemaining -= 1.7;
        if (target.bobbitBurrow.escapeRemaining <= 0) this.releaseBurrowBobbit(target, 'knife');
      }
    }
    target.stunned = Math.max(target.stunned, 0.45);
    if (target.kind !== 'fish' || target.behaviorClass !== 'sessileAttached') target.aggro = Math.max(target.aggro, 2.4);
    const distance = Math.max(1, Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y));
    if (target.kind !== 'fish' || target.behaviorClass === 'legacySwimmer' || !target.behaviorClass) {
      target.vx += ((target.x - this.player.x) / distance) * 84;
      target.vy += ((target.y - this.player.y) / distance) * 84;
    }
    this.spawnFloatingText('Stab', 0xd06bff);
    renderHud();
    return true;
  }

export function nearestKnifeLarva(this: DeepdiveScene, ) {
    let nearest: { larva: Larva; distance: number } | null = null;
    for (const larva of this.larvae) {
      const distance = larva.latched ? 0 : Phaser.Math.Distance.Between(this.player.x, this.player.y, larva.x, larva.y);
      if (!larva.latched && distance > INJECTOR_KNIFE_RANGE + larva.radius) continue;
      if (!nearest || distance < nearest.distance) nearest = { larva, distance };
    }
    return nearest?.larva ?? null;
  }

export function nearestKnifeTarget(this: DeepdiveScene, ) {
    let nearest: { target: Fish | ArticulatedCreature; distance: number } | null = null;
    for (const fish of this.fish) {
      if (!fish.hostile || fish.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance > INJECTOR_KNIFE_RANGE + fish.radius) continue;
      if (!nearest || distance < nearest.distance) nearest = { target: fish, distance };
    }
    const articulated = this.nearestKnifeArticulatedTarget();
    if (articulated && (!nearest || articulated.distance < nearest.distance)) {
      nearest = { target: articulated.creature, distance: articulated.distance };
    }
    return nearest?.target ?? null;
  }

export function consumeOxygenTank(this: DeepdiveScene, ) {
    const sub = state.pilotingSub ? state.activeSub : null;
    const max = sub ? subDef(sub.tier).oxygen : oxygenMax();
    const current = sub ? sub.oxygen : state.oxygen;
    const missing = max - current;
    if (missing <= 0) {
      state.status = sub ? `${subDef(sub.tier).name} oxygen is already full.` : 'Suit oxygen is already full.';
      renderHud();
      return false;
    }
    const amount = Math.min(OXYGEN_TANK_REFILL, missing);
    if (sub) sub.oxygen = Math.min(max, sub.oxygen + amount);
    else state.oxygen = Math.min(max, state.oxygen + amount);
    resetOxygenWarnings();
    state.status = `Emergency oxygen tank used. Restored ${Math.round(amount)} O2.`;
    this.spawnFloatingText(`O2 +${Math.round(amount)}`, 0x8ee7f4);
    return true;
  }

export function consumeFuelTank(this: DeepdiveScene, ) {
    const sub = state.pilotingSub ? state.activeSub : null;
    const max = sub ? subDef(sub.tier).fuel : fuelMax();
    const current = sub ? sub.fuel : state.fuel;
    const missing = max - current;
    if (missing <= 0) {
      state.status = sub ? `${subDef(sub.tier).name} fuel is already full.` : 'Cutter fuel is already full.';
      renderHud();
      return false;
    }
    const amount = Math.min(FUEL_TANK_REFILL, missing);
    if (sub) sub.fuel = Math.min(max, sub.fuel + amount);
    else state.fuel = Math.min(max, state.fuel + amount);
    state.status = `Portable fuel tank used. Restored ${Math.round(amount)} fuel.`;
    this.spawnFloatingText(`Fuel +${Math.round(amount)}`, 0xffd166);
    return true;
  }

export function consumeFirstAidKit(this: DeepdiveScene, ) {
    const sub = state.pilotingSub ? state.activeSub : null;
    const max = sub ? subDef(sub.tier).hull : hullMax();
    const current = sub ? sub.hull : state.hull;
    const missing = max - current;
    const bleeding = state.bleed.active || state.bleed.recentBites > 0;
    if (missing <= 0 && !bleeding) {
      state.status = sub ? `${subDef(sub.tier).name} hull is already stable.` : 'Suit integrity is already stable.';
      renderHud();
      return false;
    }
    const repaired = Math.min(FIRST_AID_REPAIR, Math.max(0, missing));
    if (sub) sub.hull = Math.min(max, sub.hull + repaired);
    else state.hull = Math.min(max, state.hull + repaired);
    if (bleeding) clearBleed();
    state.status = bleeding
      ? `First aid sealed the bleed${repaired > 0 ? ` and restored ${Math.round(repaired)} hull` : ''}.`
      : `First aid restored ${Math.round(repaired)} hull.`;
    this.spawnFloatingText(bleeding ? 'Bleed sealed' : `Hull +${Math.round(repaired)}`, 0xff6f7f);
    return true;
  }

export function consumeAntivenom(this: DeepdiveScene, ) {
    if (!state.venom.active) {
      state.status = 'No venom detected in suit seals.';
      renderHud();
      return false;
    }
    const source = state.venom.source;
    clearVenom();
    state.status = `Antivenom purged ${source} toxin from the suit.`;
    this.spawnFloatingText('Venom purged', 0x7bd88f);
    return true;
  }

export function useSelectedItem(this: DeepdiveScene, ) {
    if (state.lost || finaleLocksSurvey() || !state.started || state.paused || state.docked) return false;
    clampSelectedCargoIndex();
    const item = state.cargo[state.selectedCargoIndex];
    if (!item) {
      state.status = 'No cargo slot selected. Buy supplies or recover ore first.';
      renderHud();
      return false;
    }
    if (item.kind === 'tool') {
      if (item.id === 'injector-knife') return this.useInjectorKnife();
      state.status = `${item.name} is not ready to use.`;
      renderHud();
      return false;
    }
    if (item.kind !== 'consumable') {
      this.dropCargoItem(state.selectedCargoIndex);
      return true;
    }
    if (item.id === 'oxygen-tank' && !this.consumeOxygenTank()) return false;
    if (item.id === 'fuel-tank' && !this.consumeFuelTank()) return false;
    if (item.id === 'first-aid-kit' && !this.consumeFirstAidKit()) return false;
    if (item.id === 'antivenom' && !this.consumeAntivenom()) return false;
    state.cargo.splice(state.selectedCargoIndex, 1);
    state.selectedCargoIndex = Math.min(state.selectedCargoIndex, Math.max(0, state.cargo.length - 1));
    clampSelectedCargoIndex();
    if (item.id === 'stun-grenade') this.triggerStunPulse();
    else if (item.id === 'dynamite') this.throwUtilityItem(item, 'dynamite');
    else if (item.id === 'flare') this.throwUtilityItem(item, 'flare');
    renderHud();
    return true;
  }

export function dropCargoItem(this: DeepdiveScene, index: number) {
    const item = state.cargo[index];
    if (!item) return;
    state.cargo.splice(index, 1);
    clampSelectedCargoIndex();
    const angle = this.player.facing.angle();
    const speed = 34;
    this.looseItems.push({
      ...item,
      x: this.player.x + Math.cos(angle) * 22,
      y: this.player.y + Math.sin(angle) * 22,
      vx: this.player.vx * 0.12 + Math.cos(angle) * speed,
      vy: this.player.vy * 0.12 + Math.sin(angle) * speed,
      radius: item.value > 0 ? scaledEntity(5) : scaledEntity(4),
      life: item.value > 0 ? Infinity : 40,
    });
    state.status = `${item.name} dropped from cargo.`;
    this.spawnFloatingText(`Dropped ${item.name}`, item.color);
  }

export function applyHullDamage(this: DeepdiveScene, amount: number, status?: string) {
    if (amount <= 0) return;
    const sub = state.pilotingSub ? state.activeSub : null;
    if (sub) {
      sub.hull -= amount;
      if (status) state.status = status.replace('Hull', `${subDef(sub.tier).name}`);
      if (sub.hull <= 0) this.destroyActiveSub();
      return;
    }
    state.hull -= amount;
    if (status) state.status = status;
  }

export function destroyActiveSub(this: DeepdiveScene, ) {
    const sub = state.activeSub;
    if (!sub) return;
    const def = subDef(sub.tier);
    const wasScout = Boolean(state.carrierSub && sub.tier === 1);
    if (!wasScout) {
      state.subOwned[sub.tier] = false;
      if (state.selectedSubTier === sub.tier) state.selectedSubTier = null;
    }
    state.activeSub = wasScout ? state.carrierSub : null;
    if (wasScout) state.carrierSub = null;
    state.pilotingSub = false;
    state.auxSubActive = false;
    if (wasScout) {
      state.status = 'Auxiliary Seeker hull failed. The Leviathan is still waiting nearby.';
    }
    this.player.x = sub.x;
    this.player.y = sub.y;
    this.player.vx = sub.vx * 0.2;
    this.player.vy = sub.vy * 0.2;
    this.subSprite?.setVisible(false);
    this.auxSub?.sprite?.setVisible(false);
    this.spawnFloatingText(`${def.name} lost`, 0xff6f7f);
    if (!wasScout) state.status = `${def.name} hull failed. Emergency hatch blew and the sub is gone.`;
    renderHud();
  }

export function fireSubWeapon(this: DeepdiveScene, ) {
    const sub = state.activeSub;
    if (!sub || sub.tier < 3 || sub.weaponCooldown > 0 || sub.fuel < 4) return;
    sub.weaponCooldown = 1.2;
    sub.fuel = Math.max(0, sub.fuel - 4);
    let hits = 0;
    for (const fish of this.fish) {
      if (fish.dead) continue;
      if (!fish.hostile) continue;
      const distance = Phaser.Math.Distance.Between(sub.x, sub.y, fish.x, fish.y);
      if (distance > scaledEntity(230)) continue;
      const facing = sub.facingSign;
      if ((fish.x - sub.x) * facing < -scaledEntity(20)) continue;
      hits += 1;
      fish.stunned = Math.max(fish.stunned, 4.2);
      fish.aggro = 0;
      if (fish.behaviorClass === 'legacySwimmer' || !fish.behaviorClass) {
        fish.vx += facing * scaledEntity(180);
        fish.vy += Phaser.Math.FloatBetween(-80, 80);
      }
    }
    for (const creature of this.articulatedCreatures) {
      if (creature.dead) continue;
      const distance = Phaser.Math.Distance.Between(sub.x, sub.y, creature.x, creature.y);
      if (distance > scaledEntity(260) + creature.radius) continue;
      const facing = sub.facingSign;
      if ((creature.x - sub.x) * facing < -scaledEntity(20)) continue;
      hits += 1;
      creature.stunned = Math.max(creature.stunned, 3.2);
      creature.aggro = 0;
      creature.vx += facing * scaledEntity(150);
      creature.vy += Phaser.Math.FloatBetween(-70, 70);
      if (creature.bobbitBurrow?.phase === 'drag') this.releaseBurrowBobbit(creature, 'stun');
    }
    this.actors.lineStyle(3, 0x8ee7f4, 0.85);
    this.actors.lineBetween(sub.x, sub.y, sub.x + sub.facingSign * scaledEntity(230), sub.y);
    this.spawnFloatingText(hits ? `Harpoon stun x${hits}` : 'Harpoon fired', 0x8ee7f4);
  }
