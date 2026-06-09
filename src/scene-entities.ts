import Phaser from 'phaser';
import type { ArticulatedCreature,Bobbit,ControlState,Fish,Larva,LooseItem,NestEgg,ScanTarget } from './types';
import { BLEED_DURATION,BLEED_RECENT_WINDOW,BLEED_TRIGGER_BITES,BOBBIT_DETECT_RADIUS,BOBBIT_ESCAPE_SECONDS,BOBBIT_LATCH_RADIUS,DYNAMITE_LAND_FUSE,EGG_DETECTION_RADIUS,EGG_HATCH_SECONDS,FISH_BITE_SFX_GAP_MS,NEST_CLEAR_REWARD,OASIS_OXYGEN_REFILL,PLAYER_COLLISION_RADIUS,PLAYER_CONTACT_RADIUS,PLAYER_PICKUP_RADIUS,TARGET_DEPTH,THROWN_ITEM_GRAVITY,THROWN_ITEM_MAX_FALL_SPEED,TILE,WORLD_H } from './constants';
import { tiles,upgrades } from './content';
import { state,ui } from './state';
import { bargeSolidAtWorld,cargoCapacity,currentApexSpecies,oxygenMax,pointInRoom,predatorBiteCooldown,rarityColor,rarityLabel,resetOxygenWarnings,scaledEntity,scannableRarity,scanReward,subDef,updateFacingFromVelocity,venomousFish } from './helpers';
import { biomeName,renderHud } from './hud';
import type { DeepdiveScene } from './scene';

export function updateFish(this: DeepdiveScene, delta: number) {
    for (const fish of this.fish) {
      fish.phase += delta;
      fish.bumpCooldown = Math.max(0, fish.bumpCooldown - delta);
      fish.stunned = Math.max(0, fish.stunned - delta);
      fish.scanPulse = Math.max(0, fish.scanPulse - delta * 1.35);
      fish.hurtFlash = Math.max(0, fish.hurtFlash - delta * 4.2);
      if (fish.dead) {
        fish.sprite?.setVisible(false);
        continue;
      }
      if (!fish.scanned && !fish.scanning) {
        fish.scan = Math.max(0, fish.scan - delta * 0.9);
      }
      fish.scanning = false;
      if (fish.stunned > 0) {
        fish.aggro = 0;
        fish.vx *= Math.exp(-4.6 * delta);
        fish.vy *= Math.exp(-4.6 * delta);
      } else {
        this.steerFish(fish, delta);
      }
      fish.x += fish.vx * delta;
      fish.y += fish.vy * delta;
      updateFacingFromVelocity(fish);
      this.keepFishInWater(fish);
      if (fish.stunned > 0) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance < fish.radius + PLAYER_CONTACT_RADIUS && fish.bumpCooldown <= 0 && !this.isAtBoat()) {
        this.bumpFish(fish, distance);
      }
    }
  }

export function updateFlora(this: DeepdiveScene, delta: number) {
    for (const flora of this.flora) {
      flora.phase += delta;
      flora.scanPulse = Math.max(0, flora.scanPulse - delta * 1.35);
      flora.hurtFlash = Math.max(0, flora.hurtFlash - delta * 4.2);
      if (flora.dead) {
        flora.sprite?.setVisible(false);
        continue;
      }
      if (!flora.scanned && !flora.scanning) {
        flora.scan = Math.max(0, flora.scan - delta * 0.9);
      }
      flora.scanning = false;
      if (flora.hazardous && !this.isAtBoat()) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y);
        if (distance < flora.radius + PLAYER_CONTACT_RADIUS + 4) {
          this.applyHullDamage((flora.rare ? 7 : 3.5) * delta, `${flora.species} stings through the suit.`);
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
    if (chaseActive) {
      fish.aggro = Math.max(fish.aggro, fish.pattern === 'circle' ? 2.6 : 2);
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

    const dx = targetX - fish.x;
    const dy = targetY - fish.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const pursuit = fish.aggro > 0 && fish.hostile;
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

export function keepFishInWater(this: DeepdiveScene, fish: Fish) {
    const tx = Math.floor(fish.x / TILE);
    const ty = Math.floor(fish.y / TILE);
    if (this.getTile(tx, ty) === 'water') return;
    fish.x -= fish.vx * 0.09;
    fish.y -= fish.vy * 0.09;
    fish.vx *= -0.65;
    fish.vy *= -0.65;
    fish.homeX = Phaser.Math.Linear(fish.homeX, fish.x, 0.15);
    fish.homeY = Phaser.Math.Linear(fish.homeY, fish.y, 0.15);
  }

export function bumpFish(this: DeepdiveScene, fish: Fish, distance: number) {
    const nx = distance > 0 ? (this.player.x - fish.x) / distance : 1;
    const ny = distance > 0 ? (this.player.y - fish.y) / distance : 0;
    const impact = Math.hypot(this.player.vx, this.player.vy);
    this.player.vx += nx * (fish.hostile ? 120 : 70);
    this.player.vy += ny * (fish.hostile ? 120 : 70);
    fish.vx -= nx * 140;
    fish.vy -= ny * 140;
    fish.bumpCooldown = fish.hostile ? predatorBiteCooldown(fish) : 0.42;
    fish.scan = Math.max(0, fish.scan - 0.25);
    if (fish.hostile) {
      const damage = Math.round(4 + fish.radius * 0.35 + state.biome * 1.4 + (fish.pattern === 'circle' ? 3 : 0));
      this.applyHullDamage(Math.max(2, damage + impact * 0.018 - state.upgrades.suit), `${fish.species} slammed your helmet.`);
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
      const plumeX = hazard.x;
      const plumeY = hazard.y - hazard.radius * 1.35;
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
    if (!oasis || state.atBoat || state.lost || state.won) return;
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
      if (Number.isFinite(item.life)) item.life -= delta;
      const subCanPickup = !state.pilotingSub || !state.activeSub || state.activeSub.tier === 1;
      if (subCanPickup && item.value > 0 && state.cargo.length < cargoCapacity()) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
        if (distance < Math.max(PLAYER_PICKUP_RADIUS, item.radius + PLAYER_COLLISION_RADIUS + 7)) {
          state.cargo.push({
            id: item.id,
            name: item.name,
            value: item.value,
            color: item.color,
            kind: item.kind,
            icon: item.icon,
          });
          state.selectedCargoIndex = state.cargo.length - 1;
          state.status = `Recovered loose ${item.name} worth ${item.value} credits.`;
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
      this.drawSonarMap();
    }
    if (state.sonarContacts.some((contact) => contact.age > 14)) {
      state.sonarContacts = state.sonarContacts.filter((contact) => contact.age <= 14);
      this.drawSonarMap();
    }
  }

export function updateFlares(this: DeepdiveScene, delta: number) {
    this.flares = this.flares.filter((flare) => {
      flare.age += delta;
      return flare.age < flare.life;
    });
  }

export function scanNearbyLife(this: DeepdiveScene, delta: number, scanningHeld: boolean) {
    const range = 64 + state.upgrades.scanner * 18;
    const target = this.nearestLife(range);
    if (!scanningHeld || !target) {
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
          state.won = true;
          state.status = 'The ruin sentinel is cataloged. Humanity finally has proof of the drowned architects.';
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
