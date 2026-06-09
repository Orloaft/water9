import Phaser from 'phaser';
import type { ArticulatedCreature,CargoItem,Fish,Flare,Larva,NestEgg,ScanTarget,SubVehicle,ThrownUtility,Tile,TileDef } from './types';
import { DYNAMITE_LAND_FUSE,DYNAMITE_LIFE_DAMAGE,DYNAMITE_RADIUS_TILES,EGG_CUTTER_FUEL_COST,EGG_HATCH_SECONDS,FIRST_AID_REPAIR,FLARE_DURATION,FUEL_TANK_REFILL,INJECTOR_KNIFE_DAMAGE,INJECTOR_KNIFE_RANGE,LIFE_CUTTER_DAMAGE,LIFE_CUTTER_FUEL_COST,OXYGEN_TANK_REFILL,PLAYER_FORWARD_REACH,STUN_GRENADE_DURATION,STUN_GRENADE_RADIUS,THROWN_ITEM_SPEED,TILE } from './constants';
import { tiles,upgrades } from './content';
import { state } from './state';
import { rng } from './rng';
import { cargoCapacity,cargoIconForTile,cargoKindForTile,clampSelectedCargoIndex,clearBleed,clearVenom,fuelMax,hash,hullMax,mineCooldown,miningFuelCost,miningUpgradeBonus,oxygenMax,resetOxygenWarnings,scaledEntity,subCollisionHalfExtents,subDef,subDirectionalReach,subMiningRange } from './helpers';
import { renderHud } from './hud';
import type { DeepdiveScene } from './scene';

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
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, worldX, worldY);
    const range = sub ? subMiningRange(sub) : 40 + miningUpgradeBonus() * 6;
    if (distance > range) return;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldX, worldY);
    this.player.facing.set(Math.cos(angle), Math.sin(angle));
    this.updatePlayerFacing(Math.cos(angle));
    if (this.cutNestTarget(worldX, worldY, sub)) return;
    if (this.cutLifeTarget(worldX, worldY, sub)) return;
    const tx = Math.floor(worldX / TILE);
    const ty = Math.floor(worldY / TILE);
    const targets = this.mineTargets(tx, ty);
    if (!targets.length) return;
    const fuelReserve = sub ? sub.fuel : state.fuel;
    if (fuelReserve > 0) this.drillingThisFrame = true;
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
    for (const target of targets) {
      const tile = this.getTile(target.x, target.y);
      const def = tiles[tile];
      if (!def.solid || tile === 'bedrock' || tile === 'anchorstone') continue;
      this.damage[target.y][target.x] += power;
      if (this.damage[target.y][target.x] >= def.hp) {
        this.breakTile(target.x, target.y, tile, def);
      }
    }
    this.terrainDirty = true;
    this.player.mineCooldown = mineCooldown();
    if (sub) sub.oxygen = Math.max(0, sub.oxygen - (0.08 + targets.length * 0.02));
    else state.oxygen -= 0.11 + targets.length * 0.035;
    renderHud();
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
      target.aggro = target.hostile ? Math.max(target.aggro, 3.2) : target.aggro;
      target.vx += Phaser.Math.FloatBetween(-18, 18);
      target.vy += Phaser.Math.FloatBetween(-18, 18);
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

export function mineTargets(this: DeepdiveScene, tx: number, ty: number) {
    const maxBlocks = state.upgrades.laser >= 10 ? 4 : state.upgrades.laser >= 6 ? 3 : state.upgrades.laser >= 3 ? 2 : 1;
    const radius = maxBlocks > 1 ? 1 : 0;
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

export function breakTile(this: DeepdiveScene, tx: number, ty: number, tile: Tile, def: TileDef) {
    const x = tx * TILE + TILE * 0.5;
    const y = ty * TILE + TILE * 0.5;
    this.setTile(tx, ty, 'water');
    this.damage[ty][tx] = 0;
    this.spawnLoose(tile, def, x, y);
    if (def.value > 0) {
      state.status = state.cargo.length < cargoCapacity()
        ? `${def.name} broke loose. Swim near it to collect.`
        : `Cargo full. ${def.name} broke loose and can be picked up later.`;
    } else {
      state.status = `Cut through ${def.name}.`;
    }
  }

export function spawnLoose(this: DeepdiveScene, tile: Tile, def: TileDef, x: number, y: number) {
    const pieces = def.value > 0 ? 1 : 3;
    for (let i = 0; i < pieces; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(10, 42);
      this.looseItems.push({
        id: def.value > 0 && i === 0 ? tile : 'stone',
        name: def.name,
        value: def.value > 0 && i === 0 ? def.value : 0,
        x: x + Phaser.Math.FloatBetween(-4, 4),
        y: y + Phaser.Math.FloatBetween(-4, 4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: def.color,
        radius: def.value > 0 ? scaledEntity(5) : Phaser.Math.FloatBetween(scaledEntity(2), scaledEntity(3.5)),
        life: def.value > 0 ? Infinity : Phaser.Math.FloatBetween(4, 8),
        kind: def.value > 0 && i === 0 ? cargoKindForTile(tile) : 'rubble',
        icon: def.value > 0 && i === 0 ? cargoIconForTile(tile) : 'item-icon-stone',
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
    target.stunned = Math.max(target.stunned, 0.45);
    target.aggro = Math.max(target.aggro, 2.4);
    const distance = Math.max(1, Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y));
    target.vx += ((target.x - this.player.x) / distance) * 84;
    target.vy += ((target.y - this.player.y) / distance) * 84;
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
    if (state.lost || state.won || !state.started || state.paused || state.docked) return false;
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
      fish.vx += facing * scaledEntity(180);
      fish.vy += Phaser.Math.FloatBetween(-80, 80);
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
    }
    this.actors.lineStyle(3, 0x8ee7f4, 0.85);
    this.actors.lineBetween(sub.x, sub.y, sub.x + sub.facingSign * scaledEntity(230), sub.y);
    this.spawnFloatingText(hits ? `Harpoon stun x${hits}` : 'Harpoon fired', 0x8ee7f4);
  }
