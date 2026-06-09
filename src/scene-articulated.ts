import Phaser from 'phaser';
import type { ArticulatedCreature, ArticulatedPartState, ControlState } from './types';
import { ENTITY_SCALE,PLAYER_CONTACT_RADIUS,TILE,WORLD_H,WORLD_W } from './constants';
import { tiles } from './content';
import { state } from './state';
import { articulatedCreatureDefs, createArticulatedCreature, partManifest } from './articulated';
import { rarityColor, scaledDepthPx } from './helpers';
import { renderHud } from './hud';
import type { DeepdiveScene } from './scene';

const PART_WORLD_SCALE = ENTITY_SCALE;
const SERPENT_DETECTION_RANGE = 430;
const SERPENT_LEASH_RANGE = 720;
const SERPENT_GRAB_SECONDS = 1.18;
const SERPENT_GRAB_COOLDOWN = 5.5;

export function populateArticulatedCreatures(this: DeepdiveScene) {
  this.articulatedCreatures = [];
  for (const manifest of articulatedCreatureDefs()) {
    if (state.biome < manifest.minBiome) continue;
    for (let i = 0; i < manifest.spawn.count; i += 1) {
      const point = this.findOpenWaterInBand(scaledDepthPx(manifest.spawn.minDepth), scaledDepthPx(manifest.spawn.maxDepth));
      const creature = createArticulatedCreature(this, manifest, point.x, point.y);
      creature.homeX = point.x;
      creature.homeY = point.y;
      creature.phase += i * 1.7;
      this.updateArticulatedParts(creature, 0);
      this.articulatedCreatures.push(creature);
    }
  }
}

export function updateArticulatedCreatures(this: DeepdiveScene, delta: number, controls?: ControlState) {
  for (const creature of this.articulatedCreatures) {
    if (creature.dead) {
      creature.parts.forEach((part) => part.sprite?.setVisible(false));
      continue;
    }
    if (creature.reviewFrozen) {
      creature.bumpCooldown = 0;
      creature.scanPulse = 0;
      creature.hurtFlash = 0;
      creature.parts.forEach((part) => {
        part.hurtFlash = 0;
      });
      this.updateArticulatedParts(creature, delta);
      continue;
    }
    creature.phase += delta;
    creature.bumpCooldown = Math.max(0, creature.bumpCooldown - delta);
    creature.stunned = Math.max(0, creature.stunned - delta);
    creature.scanPulse = Math.max(0, creature.scanPulse - delta * 1.2);
    creature.hurtFlash = Math.max(0, creature.hurtFlash - delta * 3.8);
    creature.grabCooldown = Math.max(0, creature.grabCooldown - delta);
    creature.parts.forEach((part) => {
      part.hurtFlash = Math.max(0, part.hurtFlash - delta * 4.2);
    });

    if (!creature.scanned && !creature.scanning) {
      creature.scan = Math.max(0, creature.scan - delta * 0.55);
    }
    creature.scanning = false;

    if (creature.stunned > 0) {
      creature.aggro = 0;
      creature.vx *= Math.exp(-3.5 * delta);
      creature.vy *= Math.exp(-3.5 * delta);
    } else {
      this.steerArticulatedCreature(creature, delta);
    }

    creature.x += creature.vx * delta;
    creature.y += creature.vy * delta;
    if (creature.vx < -2) creature.facingSign = -1;
    if (creature.vx > 2) creature.facingSign = 1;
    this.keepArticulatedCreatureInWater(creature);
    this.updateArticulatedParts(creature, delta);
    this.resolveArticulatedGrab(creature, delta, controls);

    if (creature.stunned > 0 || this.isAtBoat()) continue;
    const hit = this.closestArticulatedPartTo(creature, this.player.x, this.player.y);
    if (hit && hit.distance < partManifest(creature, hit.part).hitRadius * PART_WORLD_SCALE + PLAYER_CONTACT_RADIUS && creature.bumpCooldown <= 0) {
      this.bumpArticulatedCreature(creature, hit.part, hit.distance);
    }
  }
}

export function steerArticulatedCreature(this: DeepdiveScene, creature: ArticulatedCreature, delta: number) {
  const dx = this.player.x - creature.x;
  const dy = this.player.y - creature.y;
  const playerDistance = Math.max(1, Math.hypot(dx, dy));
  const homeDistance = Phaser.Math.Distance.Between(creature.x, creature.y, creature.homeX, creature.homeY);
  const canChase = !this.isAtBoat() && playerDistance < SERPENT_DETECTION_RANGE + state.biome * 24 && homeDistance < SERPENT_LEASH_RANGE;

  if (canChase) {
    creature.aggro = Math.max(creature.aggro, 4.5);
    if (creature.state === 'patrol') creature.state = 'stalk';
  } else {
    creature.aggro = Math.max(0, creature.aggro - delta * 0.7);
    if (creature.aggro <= 0 && creature.state !== 'recover') creature.state = 'patrol';
  }

  if (creature.aggro > 0 && playerDistance < 172 && creature.grabCooldown <= 0 && creature.state !== 'lunge' && creature.state !== 'grab') {
    creature.state = 'lunge';
    creature.stateTimer = 0.74;
    creature.grabCooldown = SERPENT_GRAB_COOLDOWN;
    state.status = `${creature.species} is coiling for a strike.`;
  }

  let targetX = creature.homeX + Math.sin(creature.phase * 0.34) * 150;
  let targetY = creature.homeY + Math.cos(creature.phase * 0.28) * 62;
  let steering = 2.2;
  let speedScale = this.articulatedMobilityScale(creature);

  if (creature.state === 'stalk' || creature.aggro > 0) {
    const lead = Phaser.Math.Clamp(playerDistance / 260, 0.1, 0.72);
    const flank = Math.sin(creature.phase * 1.55) * 86;
    targetX = this.player.x + this.player.vx * lead - (dy / playerDistance) * flank;
    targetY = this.player.y + this.player.vy * lead + (dx / playerDistance) * flank;
    steering = 3.8;
    speedScale *= 1.1;
  }

  if (creature.state === 'lunge') {
    creature.stateTimer -= delta;
    targetX = this.player.x + this.player.vx * 0.16;
    targetY = this.player.y + this.player.vy * 0.16;
    steering = 8.2;
    speedScale *= 2.45;
    if (creature.stateTimer <= 0) {
      creature.state = 'recover';
      creature.stateTimer = 0.8;
    }
  } else if (creature.state === 'recover') {
    creature.stateTimer -= delta;
    steering = 1.7;
    speedScale *= 0.65;
    if (creature.stateTimer <= 0) creature.state = creature.aggro > 0 ? 'stalk' : 'patrol';
  } else if (creature.state === 'grab') {
    targetX = this.player.x;
    targetY = this.player.y;
    steering = 5.5;
    speedScale *= 0.72;
  }

  const tx = targetX - creature.x;
  const ty = targetY - creature.y;
  const len = Math.max(1, Math.hypot(tx, ty));
  const desiredSpeed = creature.speed * speedScale;
  creature.vx += (tx / len) * desiredSpeed * steering * delta;
  creature.vy += (ty / len) * desiredSpeed * steering * delta;
  creature.vx *= Math.exp(-1.05 * delta);
  creature.vy *= Math.exp(-1.05 * delta);
  const maxSpeed = creature.speed * (creature.state === 'lunge' ? 3.1 : creature.aggro > 0 ? 1.85 : 1.25) * this.articulatedMobilityScale(creature);
  const speed = Math.hypot(creature.vx, creature.vy);
  if (speed > maxSpeed) {
    creature.vx = (creature.vx / speed) * maxSpeed;
    creature.vy = (creature.vy / speed) * maxSpeed;
  }
}

export function keepArticulatedCreatureInWater(this: DeepdiveScene, creature: ArticulatedCreature) {
  const samples = [
    [creature.x, creature.y],
    ...creature.parts.filter((_, index) => index % 2 === 0).map((part) => [part.x, part.y] as [number, number]),
  ];
  const collided = samples.some(([x, y]) => {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return tx < 1 || tx >= WORLD_W - 1 || ty < 7 || ty >= WORLD_H - 2 || tiles[this.getTile(tx, ty)].solid;
  });
  if (!collided) return;
  creature.x -= creature.vx * 0.13;
  creature.y -= creature.vy * 0.13;
  creature.vx *= -0.45;
  creature.vy *= -0.45;
  creature.homeX = Phaser.Math.Linear(creature.homeX, creature.x, 0.08);
  creature.homeY = Phaser.Math.Linear(creature.homeY, creature.y, 0.08);
}

export function updateArticulatedParts(this: DeepdiveScene, creature: ArticulatedCreature, _delta: number) {
  const speed = Math.hypot(creature.vx, creature.vy);
  const facing = creature.facingSign < 0 ? -1 : 1;
  const swimPitch = speed > 3
    ? Phaser.Math.Clamp(Math.atan2(creature.vy, Math.max(1, Math.abs(creature.vx))), -0.62, 0.62)
    : 0;
  const forward = new Phaser.Math.Vector2(facing * Math.cos(swimPitch), Math.sin(swimPitch));
  const normal = new Phaser.Math.Vector2(-facing * Math.sin(swimPitch), Math.cos(swimPitch));
  const lungeOpen = creature.state === 'lunge' || creature.state === 'grab' ? 1 : 0;
  const partById = new Map(creature.parts.map((part) => [part.id, part]));
  const indexById = new Map(creature.parts.map((part, index) => [part.id, index]));
  const placed = new Set<string>();
  const placing = new Set<string>();

  const localVectorOffset = (rotation: number, local: [number, number]) => {
    const localX = local[0] * PART_WORLD_SCALE * facing;
    const localY = local[1] * PART_WORLD_SCALE;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return new Phaser.Math.Vector2(localX * cos - localY * sin, localX * sin + localY * cos);
  };

  const anchoredOffset = (manifest: ReturnType<typeof partManifest>, rotation: number, local: [number, number]) => {
    const originX = (manifest.origin[0] - 0.5) * manifest.size[0];
    const originY = (manifest.origin[1] - 0.5) * manifest.size[1];
    return localVectorOffset(rotation, [local[0] - originX, local[1] - originY]);
  };

  const anchorWorld = (part: ArticulatedPartState, manifest: ReturnType<typeof partManifest>, local: [number, number]) => {
    const offset = anchoredOffset(manifest, part.rotation, local);
    return new Phaser.Math.Vector2(part.x + offset.x, part.y + offset.y);
  };

  const anchorFor = (manifest: ReturnType<typeof partManifest>, name: string | undefined) => (
    name && manifest.anchors?.[name] ? manifest.anchors[name] : ([0, 0] as [number, number])
  );

  const motionRotation = (manifest: ReturnType<typeof partManifest>, index: number, parent?: ArticulatedPartState) => {
    const motion = manifest.motion;
    const wave = Math.sin(creature.phase * (motion.frequency ?? 2) + (motion.phase ?? 0) - (motion.lag ?? 0) * index) * (motion.amplitude ?? 0) * PART_WORLD_SCALE;
    const parentRotation = parent?.rotation ?? 0;
    if (motion.kind === 'jaw') {
      return parentRotation + facing * ((Math.sin(creature.phase * 8) * 0.16 + lungeOpen * 0.42) * Math.sign(manifest.offset[1] || 1));
    }
    if (motion.kind === 'fin') {
      return parentRotation + facing * wave * 0.018;
    }
    if (motion.kind === 'body' || motion.kind === 'tail') {
      return facing * (swimPitch + wave * 0.012);
    }
    return facing * swimPitch;
  };

  const placeOffsetPart = (part: ArticulatedPartState, manifest: ReturnType<typeof partManifest>, index: number) => {
    const motion = manifest.motion;
    const localX = manifest.offset[0] * PART_WORLD_SCALE;
    const localY = manifest.offset[1] * PART_WORLD_SCALE;
    const wave = Math.sin(creature.phase * (motion.frequency ?? 2) + (motion.phase ?? 0) - (motion.lag ?? 0) * index) * (motion.amplitude ?? 0) * PART_WORLD_SCALE;
    const bodyWave = motion.kind === 'body' || motion.kind === 'tail' ? wave : 0;
    const finWave = motion.kind === 'fin' ? wave : 0;
    const jawOpen = motion.kind === 'jaw' ? (Math.sin(creature.phase * 8) * 0.16 + lungeOpen * 0.42) * Math.sign(localY || 1) : 0;
    part.x = creature.x + forward.x * localX + normal.x * (localY + bodyWave);
    part.y = creature.y + forward.y * localX + normal.y * (localY + bodyWave);
    part.rotation = facing * (swimPitch + bodyWave * 0.012 + finWave * 0.018 + jawOpen);
  };

  const placePart = (part: ArticulatedPartState, index: number): void => {
    if (placed.has(part.id)) return;
    const manifest = partManifest(creature, part);
    const parent = manifest.parentId ? partById.get(manifest.parentId) : undefined;
    if (placing.has(part.id)) {
      placeOffsetPart(part, manifest, index);
      placed.add(part.id);
      return;
    }
    placing.add(part.id);
    if (parent) {
      placePart(parent, indexById.get(parent.id) ?? index);
      const parentManifest = partManifest(creature, parent);
      part.rotation = motionRotation(manifest, index, parent);
      const parentAnchor = anchorWorld(parent, parentManifest, anchorFor(parentManifest, manifest.parentAnchor));
      const restOffset = manifest.restOffset ? localVectorOffset(parent.rotation, manifest.restOffset) : new Phaser.Math.Vector2();
      const childAnchorOffset = anchoredOffset(manifest, part.rotation, anchorFor(manifest, manifest.anchor));
      part.x = parentAnchor.x + restOffset.x - childAnchorOffset.x;
      part.y = parentAnchor.y + restOffset.y - childAnchorOffset.y;
    } else {
      placeOffsetPart(part, manifest, index);
    }
    placing.delete(part.id);
    placed.add(part.id);
  };

  creature.parts.forEach((part, index) => {
    placePart(part, index);
  });
}

export function resolveArticulatedGrab(this: DeepdiveScene, creature: ArticulatedCreature, delta: number, controls?: ControlState) {
  if (creature.state !== 'grab') return;
  creature.grabTimer = Math.max(0, creature.grabTimer - delta);
  const struggle = controls?.hasMove ? controls.move.length() : 0;
  const target = state.pilotingSub && state.activeSub ? state.activeSub : this.player;
  const dx = creature.x - target.x;
  const dy = creature.y - target.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  target.vx += (dx / distance) * (58 - struggle * 16) * delta;
  target.vy += (dy / distance) * (58 - struggle * 16) * delta;
  this.applyHullDamage((9.2 - struggle * 2.6) * delta, `${creature.species} is dragging you in its jaws.`);
  state.oxygen = Math.max(0, state.oxygen - (2.4 - struggle * 0.7) * delta);
  if (creature.grabTimer <= 0 || struggle > 0.82) {
    creature.state = 'recover';
    creature.stateTimer = 1.1;
    state.status = struggle > 0.82 ? `You wrenched free of ${creature.species}.` : `${creature.species} released its grip.`;
    this.spawnFloatingText('Released', 0x8ee7f4);
  }
}

export function bumpArticulatedCreature(this: DeepdiveScene, creature: ArticulatedCreature, part: ArticulatedPartState, distance: number) {
  const nx = distance > 0 ? (this.player.x - part.x) / distance : 1;
  const ny = distance > 0 ? (this.player.y - part.y) / distance : 0;
  const impact = Math.hypot(this.player.vx, this.player.vy);
  const strike = creature.state === 'lunge' ? 1.45 : creature.state === 'grab' ? 1.2 : 1;
  const damage = Math.round((12 + state.biome * 2.6 + creature.radius * 0.18 + impact * 0.012) * strike);
  const target = state.pilotingSub && state.activeSub ? state.activeSub : this.player;
  target.vx += nx * 138 * strike;
  target.vy += ny * 138 * strike;
  creature.vx -= nx * 94;
  creature.vy -= ny * 94;
  creature.bumpCooldown = creature.state === 'lunge' ? 1.55 : 1.9;
  creature.scan = Math.max(0, creature.scan - 0.2);
  this.applyHullDamage(Math.max(5, damage - state.upgrades.suit), `${creature.species} hit ${part.id.replace(/-/g, ' ')} first.`);
  this.registerPredatorBite(creature);
  this.playFishBite(damage);
  if (creature.state === 'lunge' && creature.grabTimer <= 0) {
    creature.state = 'grab';
    creature.grabTimer = SERPENT_GRAB_SECONDS;
    state.status = `${creature.species} has you. Thrash hard to break free.`;
    this.spawnFloatingText('Grabbed', 0xff4f64);
  }
  renderHud();
}

export function closestArticulatedPartTo(this: DeepdiveScene, creature: ArticulatedCreature, x: number, y: number) {
  let nearest: { part: ArticulatedPartState; distance: number } | null = null;
  for (const part of creature.parts) {
    if (part.hp <= 0) continue;
    const distance = Phaser.Math.Distance.Between(x, y, part.x, part.y);
    if (!nearest || distance < nearest.distance) nearest = { part, distance };
  }
  return nearest;
}

export function nearestArticulatedDamageTarget(this: DeepdiveScene, x: number, y: number, extraRange: number) {
  let nearest: { creature: ArticulatedCreature; part: ArticulatedPartState; distance: number } | null = null;
  for (const creature of this.articulatedCreatures) {
    if (creature.dead) continue;
    const hit = this.closestArticulatedPartTo(creature, x, y);
    if (!hit) continue;
    const manifest = partManifest(creature, hit.part);
    if (hit.distance > manifest.hitRadius * PART_WORLD_SCALE + extraRange) continue;
    if (!nearest || hit.distance < nearest.distance) nearest = { creature, part: hit.part, distance: hit.distance };
  }
  return nearest;
}

export function nearestKnifeArticulatedTarget(this: DeepdiveScene) {
  return this.nearestArticulatedDamageTarget(this.player.x, this.player.y, 42);
}

export function damageArticulatedPart(this: DeepdiveScene, creature: ArticulatedCreature, part: ArticulatedPartState, amount: number, source: string) {
  if (creature.dead || amount <= 0 || part.hp <= 0) return false;
  const manifest = partManifest(creature, part);
  const damage = amount * manifest.damageMultiplier;
  part.hp = Math.max(0, part.hp - damage);
  part.hurtFlash = 1;
  creature.hp = Math.max(0, creature.hp - damage * (part.id === 'head' ? 0.92 : 0.62));
  creature.hurtFlash = 1;
  creature.aggro = Math.max(creature.aggro, 5.5);
  creature.state = creature.state === 'patrol' ? 'stalk' : creature.state;
  if (part.hp <= 0) {
    this.spawnFloatingText(`${part.id.replace(/-/g, ' ')} crippled`, 0xffd166);
    if (part.id === 'head') creature.hp = 0;
  }
  if (creature.hp > 0) {
    state.status = `${source} hit ${creature.species}'s ${part.id.replace(/-/g, ' ')}.`;
    return true;
  }
  creature.dead = true;
  creature.scanning = false;
  creature.scan = 0;
  creature.parts.forEach((candidate) => candidate.sprite?.setVisible(false));
  state.status = `${creature.species} killed by ${source.toLowerCase()}.`;
  this.spawnFloatingText(`${creature.species} killed`, 0xffd166);
  return true;
}

export function damageArticulatedInRadius(this: DeepdiveScene, centerX: number, centerY: number, radius: number, amount: number, source: string) {
  let hits = 0;
  for (const creature of this.articulatedCreatures) {
    if (creature.dead) continue;
    const hit = this.closestArticulatedPartTo(creature, centerX, centerY);
    if (!hit) continue;
    if (hit.distance > radius + partManifest(creature, hit.part).hitRadius * PART_WORLD_SCALE) continue;
    const falloff = Phaser.Math.Clamp(1 - hit.distance / Math.max(1, radius), 0.3, 1);
    this.damageArticulatedPart(creature, hit.part, amount * falloff, source);
    hits += 1;
  }
  return hits;
}

export function articulatedMobilityScale(this: DeepdiveScene, creature: ArticulatedCreature) {
  const tail = creature.parts.find((part) => part.id === 'tail');
  const fins = creature.parts.filter((part) => part.id.includes('fin'));
  const tailScale = tail && tail.hp <= 0 ? 0.62 : 1;
  const finScale = fins.length ? Phaser.Math.Clamp(fins.filter((part) => part.hp > 0).length / fins.length, 0.72, 1) : 1;
  return tailScale * finScale;
}

export function drawArticulatedCreatures(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
  for (const creature of this.articulatedCreatures) {
    if (creature.dead) {
      creature.parts.forEach((part) => part.sprite?.setVisible(false));
      continue;
    }
    const alpha = this.articulatedVisibilityAlpha(creature, camera);
    if (alpha <= 0) {
      creature.parts.forEach((part) => part.sprite?.setVisible(false));
      continue;
    }
    const attacking = creature.state === 'lunge' || creature.state === 'grab';
    for (const part of creature.parts) {
      const manifest = partManifest(creature, part);
      const damageAlpha = part.hp <= 0 ? 0.26 : 1;
      part.sprite
        ?.setTexture(manifest.textureKey)
        .setVisible(true)
        .setPosition(part.x, part.y)
        .setOrigin(manifest.origin[0], manifest.origin[1])
        .setRotation(part.rotation)
        .setAlpha((creature.stunned > 0 ? alpha * 0.68 : alpha) * damageAlpha)
        .setDisplaySize(manifest.size[0] * PART_WORLD_SCALE, manifest.size[1] * PART_WORLD_SCALE);
      if (part.sprite) part.sprite.scaleX = Math.abs(part.sprite.scaleX) * (creature.facingSign < 0 ? -1 : 1);
      if (part.hurtFlash > 0) {
        this.actors.lineStyle(2, 0xfff7df, part.hurtFlash * alpha);
        this.actors.strokeCircle(part.x, part.y, manifest.hitRadius * PART_WORLD_SCALE + 4);
      }
    }
    if (creature.stunned > 0) {
      this.actors.lineStyle(2, 0x8ee7f4, alpha * (0.38 + Math.sin(creature.phase * 9) * 0.16));
      this.actors.strokeCircle(creature.x, creature.y, creature.radius + 12);
    }
    if (attacking) {
      const head = creature.parts.find((part) => part.id === 'head') ?? creature.parts[0];
      const markerX = head?.x ?? creature.x;
      const markerY = (head?.y ?? creature.y) - 62 * PART_WORLD_SCALE - Math.sin(creature.phase * 8) * 2;
      this.actors.fillStyle(0xff4f64, alpha * 0.68);
      this.actors.fillTriangle(markerX, markerY, markerX - 8, markerY - 14, markerX + 8, markerY - 14);
    }
    if (creature.scan > 0 && !creature.scanned) {
      this.actors.lineStyle(3, 0xb9f27c, 0.35 + creature.scan * 0.5);
      this.actors.beginPath();
      this.actors.arc(creature.x, creature.y, creature.radius + 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * creature.scan);
      this.actors.strokePath();
    }
    if (creature.scanPulse > 0) {
      this.actors.lineStyle(2, rarityColor(creature.manifest.rarity), creature.scanPulse * 0.75);
      this.actors.strokeCircle(creature.x, creature.y, creature.radius + 10 + (1 - creature.scanPulse) * 18);
    }
  }
}

export function articulatedVisibilityAlpha(this: DeepdiveScene, creature: ArticulatedCreature, camera: Phaser.Cameras.Scene2D.Camera) {
  const margin = 180;
  const view = camera.worldView;
  const onCamera =
    creature.x > view.x - margin &&
    creature.x < view.right + margin &&
    creature.y > view.y - margin &&
    creature.y < view.bottom + margin;
  if (!onCamera) return creature.scanned ? 0.28 : 0;
  if (state.depth < 180) return creature.scanned ? 1 : 0.94;
  const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, creature.x, creature.y);
  const fullyVisibleAt = 170 + state.upgrades.lamp * 32;
  const goneAt = fullyVisibleAt + 270;
  if (distance <= fullyVisibleAt) return creature.scanned ? 1 : 0.95;
  if (creature.scanned) return 0.64;
  const fade = 1 - Phaser.Math.Clamp((distance - fullyVisibleAt) / (goneAt - fullyVisibleAt), 0, 1);
  return fade * 0.84;
}
