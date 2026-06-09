import Phaser from 'phaser';
import type { ArticulatedCreature, ArticulatedPartManifest, ArticulatedPartState, ControlState } from './types';
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

function facingFor(creature: ArticulatedCreature) {
  return creature.facingSign < 0 ? -1 : 1;
}

function manifestById(creature: ArticulatedCreature, id: string) {
  return creature.manifest.parts.find((candidate) => candidate.id === id);
}

function anchorFor(manifest: ArticulatedPartManifest, name: string | undefined) {
  return name && manifest.anchors?.[name] ? manifest.anchors[name] : ([0, 0] as [number, number]);
}

function localVectorOffsetFor(facing: number, rotation: number, local: [number, number]) {
  const localX = local[0] * PART_WORLD_SCALE * facing;
  const localY = local[1] * PART_WORLD_SCALE;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return new Phaser.Math.Vector2(localX * cos - localY * sin, localX * sin + localY * cos);
}

function anchoredOffsetFor(manifest: ArticulatedPartManifest, facing: number, rotation: number, local: [number, number]) {
  const originX = (manifest.origin[0] - 0.5) * manifest.size[0];
  const originY = (manifest.origin[1] - 0.5) * manifest.size[1];
  return localVectorOffsetFor(facing, rotation, [local[0] - originX, local[1] - originY]);
}

function anchorWorldFor(part: ArticulatedPartState, manifest: ArticulatedPartManifest, facing: number, local: [number, number]) {
  const offset = anchoredOffsetFor(manifest, facing, part.rotation, local);
  return new Phaser.Math.Vector2(part.x + offset.x, part.y + offset.y);
}

function smoothAngle(current: number, target: number, amount: number) {
  return current + Phaser.Math.Angle.Wrap(target - current) * amount;
}

function canDetachPart(manifest: ArticulatedPartManifest) {
  return manifest.motion.kind === 'fin' || manifest.motion.kind === 'tail' || manifest.motion.kind === 'jaw';
}

function solidAt(scene: DeepdiveScene, x: number, y: number) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 1 || tx >= WORLD_W - 1 || ty < 7 || ty >= WORLD_H - 2) return true;
  return tiles[scene.getTile(tx, ty)].solid;
}

function terrainContactForPart(scene: DeepdiveScene, creature: ArticulatedCreature, part: ArticulatedPartState, manifest: ArticulatedPartManifest) {
  const radius = Math.max(8, manifest.hitRadius * PART_WORLD_SCALE * 0.78);
  const samples = [
    { x: part.x, y: part.y, nx: 0, ny: 0 },
    { x: part.x - radius, y: part.y, nx: 1, ny: 0 },
    { x: part.x + radius, y: part.y, nx: -1, ny: 0 },
    { x: part.x, y: part.y - radius, nx: 0, ny: 1 },
    { x: part.x, y: part.y + radius, nx: 0, ny: -1 },
  ];
  let count = 0;
  let nx = 0;
  let ny = 0;
  for (const sample of samples) {
    if (!solidAt(scene, sample.x, sample.y)) continue;
    count += 1;
    if (sample.nx || sample.ny) {
      nx += sample.nx;
      ny += sample.ny;
    } else {
      const awayX = part.x - creature.x;
      const awayY = part.y - creature.y;
      const len = Math.max(1, Math.hypot(awayX, awayY));
      nx += awayX / len;
      ny += awayY / len;
    }
  }
  const len = Math.hypot(nx, ny);
  if (count <= 0 || len <= 0) return null;
  return {
    count,
    nx: nx / len,
    ny: ny / len,
    part,
  };
}

export function articulatedPartAnchorWorld(creature: ArticulatedCreature, partId: string, anchorName: string) {
  const part = creature.parts.find((candidate) => candidate.id === partId);
  const manifest = manifestById(creature, partId);
  if (!part || !manifest || part.detached) return null;
  return anchorWorldFor(part, manifest, facingFor(creature), anchorFor(manifest, anchorName));
}

export function articulatedJointMetrics(creature: ArticulatedCreature) {
  const facing = facingFor(creature);
  return creature.manifest.parts
    .filter((manifest) => Boolean(manifest.parentId))
    .map((manifest) => {
      const parent = manifest.parentId ? creature.parts.find((part) => part.id === manifest.parentId) : undefined;
      const child = creature.parts.find((part) => part.id === manifest.id);
      const parentManifest = manifest.parentId ? manifestById(creature, manifest.parentId) : undefined;
      if (child?.detached) {
        return { partId: manifest.id, parentId: manifest.parentId ?? '', error: 0, stress: 1, detached: true };
      }
      if (!parent || !child || !parentManifest || parent.detached) {
        return { partId: manifest.id, parentId: manifest.parentId ?? '', error: Number.POSITIVE_INFINITY, stress: 1 };
      }
      const parentAnchor = anchorWorldFor(parent, parentManifest, facing, anchorFor(parentManifest, manifest.parentAnchor));
      const childAnchor = anchorWorldFor(child, manifest, facing, anchorFor(manifest, manifest.anchor));
      const restOffset = manifest.restOffset ? localVectorOffsetFor(facing, parent.rotation, manifest.restOffset) : new Phaser.Math.Vector2();
      const expectedX = parentAnchor.x + restOffset.x;
      const expectedY = parentAnchor.y + restOffset.y;
      const error = Phaser.Math.Distance.Between(expectedX, expectedY, childAnchor.x, childAnchor.y);
      return {
        partId: manifest.id,
        parentId: manifest.parentId ?? '',
        error,
        stress: Phaser.Math.Clamp(error / Math.max(1, manifest.hitRadius * PART_WORLD_SCALE), 0, 1),
        detached: false,
      };
    });
}

function refreshJointStress(creature: ArticulatedCreature) {
  const metrics = articulatedJointMetrics(creature);
  for (const part of creature.parts) {
    const metric = metrics.find((candidate) => candidate.partId === part.id);
    part.jointStress = metric?.stress ?? 0;
  }
}

function updateDetachedArticulatedParts(scene: DeepdiveScene, creature: ArticulatedCreature, delta: number) {
  for (const part of creature.parts) {
    if (!part.detached) continue;
    part.x += part.detachVx * delta;
    part.y += part.detachVy * delta;
    part.detachVy += 42 * delta;
    part.detachVx *= Math.exp(-0.72 * delta);
    part.detachVy *= Math.exp(-0.34 * delta);
    part.rotation += part.detachAngularVelocity * delta;
    part.detachAngularVelocity *= Math.exp(-0.28 * delta);
    const manifest = partManifest(creature, part);
    const contact = terrainContactForPart(scene, creature, part, manifest);
    part.terrainContact = contact ? Math.min(1, contact.count / 3) : 0;
    part.terrainNormalX = contact?.nx ?? 0;
    part.terrainNormalY = contact?.ny ?? 0;
    if (!contact) continue;
    part.x += contact.nx * (4 + contact.count * 1.8);
    part.y += contact.ny * (4 + contact.count * 1.8);
    const into = part.detachVx * contact.nx + part.detachVy * contact.ny;
    if (into < 0) {
      part.detachVx -= into * contact.nx * 1.55;
      part.detachVy -= into * contact.ny * 1.55;
      part.detachAngularVelocity += Phaser.Math.Clamp((part.detachVx * contact.ny - part.detachVy * contact.nx) * 0.008, -0.45, 0.45);
    }
  }
}

export function detachArticulatedPart(this: DeepdiveScene, creature: ArticulatedCreature, part: ArticulatedPartState, source = 'damage') {
  const manifest = partManifest(creature, part);
  if (part.detached || !canDetachPart(manifest)) return false;
  const facing = facingFor(creature);
  part.detached = true;
  part.jointStress = 1;
  part.detachVx = creature.vx * 0.35 - facing * Phaser.Math.FloatBetween(18, 46);
  part.detachVy = creature.vy * 0.25 - Phaser.Math.FloatBetween(10, 34);
  part.detachAngularVelocity = Phaser.Math.FloatBetween(-1.4, 1.4) + facing * 0.45;
  part.hurtFlash = 1;
  this.spawnFloatingText(`${part.id.replace(/-/g, ' ')} severed`, 0xff7a5c);
  state.status = `${source} severed ${creature.species}'s ${part.id.replace(/-/g, ' ')}.`;
  if (part.id === 'jaw' && creature.state === 'grab') {
    creature.state = 'recover';
    creature.grabTimer = 0;
    creature.stateTimer = 1.2;
  }
  return true;
}

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
      updateDetachedArticulatedParts(this, creature, delta);
      this.updateArticulatedParts(creature, delta);
      refreshJointStress(creature);
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
    updateDetachedArticulatedParts(this, creature, delta);
    this.keepArticulatedCreatureInWater(creature);
    this.updateArticulatedParts(creature, delta);
    refreshJointStress(creature);
    this.resolveArticulatedGrab(creature, delta, controls);

    if (creature.stunned > 0 || this.isAtBoat()) continue;
    const jaw = creature.parts.find((part) => part.id === 'jaw' && !part.detached && part.hp > 0);
    const biteAnchor = this.articulatedPartAnchorWorld(creature, 'jaw', 'bite');
    const biteDistance = biteAnchor ? Phaser.Math.Distance.Between(this.player.x, this.player.y, biteAnchor.x, biteAnchor.y) : Number.POSITIVE_INFINITY;
    if ((creature.state === 'lunge' || creature.state === 'grab') && jaw && biteDistance < PLAYER_CONTACT_RADIUS + 22 && creature.bumpCooldown <= 0) {
      this.bumpArticulatedCreature(creature, jaw, biteDistance);
      continue;
    }
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
  const jaw = creature.parts.find((part) => part.id === 'jaw');
  const canBite = Boolean(jaw && jaw.hp > 0 && !jaw.detached);

  if (canChase) {
    creature.aggro = Math.max(creature.aggro, 4.5);
    if (creature.state === 'patrol') creature.state = 'stalk';
  } else {
    creature.aggro = Math.max(0, creature.aggro - delta * 0.7);
    if (creature.aggro <= 0 && creature.state !== 'recover') creature.state = 'patrol';
  }

  if (canBite && creature.aggro > 0 && playerDistance < 172 && creature.grabCooldown <= 0 && creature.state !== 'lunge' && creature.state !== 'grab') {
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
  const contacts: ReturnType<typeof terrainContactForPart>[] = [];
  for (const part of creature.parts) {
    if (part.detached) continue;
    part.terrainContact = 0;
    part.terrainNormalX = 0;
    part.terrainNormalY = 0;
    if (part.hp <= 0) continue;
    const manifest = partManifest(creature, part);
    const contact = terrainContactForPart(this, creature, part, manifest);
    if (!contact) continue;
    part.terrainContact = Math.min(1, contact.count / 3);
    part.terrainNormalX = contact.nx;
    part.terrainNormalY = contact.ny;
    contacts.push(contact);
  }
  if (!contacts.length) return;
  let nx = 0;
  let ny = 0;
  let strongest = 0;
  for (const contact of contacts) {
    if (!contact) continue;
    const weight = 1 + contact.count * 0.35;
    nx += contact.nx * weight;
    ny += contact.ny * weight;
    strongest = Math.max(strongest, contact.count);
  }
  const len = Math.max(1, Math.hypot(nx, ny));
  nx /= len;
  ny /= len;
  const push = 3.5 + strongest * 1.6;
  creature.x += nx * push;
  creature.y += ny * push;
  const into = creature.vx * nx + creature.vy * ny;
  if (into < 0) {
    creature.vx -= into * nx * 1.65;
    creature.vy -= into * ny * 1.65;
  } else {
    creature.vx += nx * 12;
    creature.vy += ny * 12;
  }
  creature.vx *= 0.82;
  creature.vy *= 0.82;
  creature.homeX = Phaser.Math.Linear(creature.homeX, creature.x, 0.08);
  creature.homeY = Phaser.Math.Linear(creature.homeY, creature.y, 0.08);
}

export function updateArticulatedParts(this: DeepdiveScene, creature: ArticulatedCreature, delta: number) {
  const speed = Math.hypot(creature.vx, creature.vy);
  const facing = facingFor(creature);
  const targetPitch = speed > 3
    ? Phaser.Math.Clamp(Math.atan2(creature.vy, Math.max(1, Math.abs(creature.vx))), -0.62, 0.62)
    : 0;
  const targetAttackBlend = creature.state === 'lunge' || creature.state === 'grab' ? 1 : 0;
  if (delta > 0 && !creature.reviewFrozen) {
    creature.posePitch = smoothAngle(creature.posePitch, targetPitch, 1 - Math.exp(-9 * delta));
    creature.attackBlend = Phaser.Math.Linear(creature.attackBlend, targetAttackBlend, 1 - Math.exp(-12 * delta));
  } else {
    creature.posePitch = targetPitch;
    creature.attackBlend = targetAttackBlend;
  }
  const swimPitch = creature.posePitch;
  const forward = new Phaser.Math.Vector2(facing * Math.cos(swimPitch), Math.sin(swimPitch));
  const normal = new Phaser.Math.Vector2(-facing * Math.sin(swimPitch), Math.cos(swimPitch));
  const lungeOpen = creature.attackBlend;
  const partById = new Map(creature.parts.map((part) => [part.id, part]));
  const indexById = new Map(creature.parts.map((part, index) => [part.id, index]));
  const placed = new Set<string>();
  const placing = new Set<string>();

  const motionRotation = (manifest: ReturnType<typeof partManifest>, index: number, parent?: ArticulatedPartState) => {
    const motion = manifest.motion;
    const wave = Math.sin(creature.phase * (motion.frequency ?? 2) + (motion.phase ?? 0) - (motion.lag ?? 0) * index) * (motion.amplitude ?? 0) * PART_WORLD_SCALE;
    const rootRotation = facing * swimPitch;
    const parentRotation = parent?.rotation ?? rootRotation;
    const rotationOffset = facing * (manifest.rotationOffset ?? 0);
    if (motion.kind === 'jaw') {
      return parentRotation + rotationOffset + facing * ((Math.sin(creature.phase * 8) * 0.08 + lungeOpen * 0.44) * Math.sign(manifest.offset[1] || 1));
    }
    if (motion.kind === 'fin') {
      return parentRotation + rotationOffset + facing * wave * 0.018;
    }
    if (motion.kind === 'body' || motion.kind === 'tail') {
      const localBend = facing * wave * 0.012;
      return parent
        ? parentRotation * 0.9 + rootRotation * 0.1 + localBend + rotationOffset
        : rootRotation + localBend + rotationOffset;
    }
    if (parent && manifest.inheritRotation !== false) {
      return parentRotation * 0.88 + rootRotation * 0.12 + rotationOffset;
    }
    return rootRotation + rotationOffset;
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
    if (part.detached) {
      placed.add(part.id);
      return;
    }
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
      const parentAnchor = anchorWorldFor(parent, parentManifest, facing, anchorFor(parentManifest, manifest.parentAnchor));
      const restOffset = manifest.restOffset ? localVectorOffsetFor(facing, parent.rotation, manifest.restOffset) : new Phaser.Math.Vector2();
      const childAnchorOffset = anchoredOffsetFor(manifest, facing, part.rotation, anchorFor(manifest, manifest.anchor));
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
  const biteAnchor = this.articulatedPartAnchorWorld(creature, 'jaw', 'bite');
  const pullX = biteAnchor?.x ?? creature.x;
  const pullY = biteAnchor?.y ?? creature.y;
  const dx = pullX - target.x;
  const dy = pullY - target.y;
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
  const biteAnchor = part.id === 'jaw' ? this.articulatedPartAnchorWorld(creature, 'jaw', 'bite') : null;
  const contactX = biteAnchor?.x ?? part.x;
  const contactY = biteAnchor?.y ?? part.y;
  const contactDistance = Math.max(1, Phaser.Math.Distance.Between(this.player.x, this.player.y, contactX, contactY), distance);
  const nx = (this.player.x - contactX) / contactDistance;
  const ny = (this.player.y - contactY) / contactDistance;
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
  if (creature.state === 'lunge' && creature.grabTimer <= 0 && !part.detached) {
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
    if (part.hp <= 0 || part.detached) continue;
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
  if (creature.dead || amount <= 0 || part.hp <= 0 || part.detached) return false;
  const manifest = partManifest(creature, part);
  const damage = amount * manifest.damageMultiplier;
  part.hp = Math.max(0, part.hp - damage);
  part.hurtFlash = 1;
  creature.hp = Math.max(0, creature.hp - damage * (part.id === 'head' ? 0.92 : 0.62));
  creature.hurtFlash = 1;
  creature.aggro = Math.max(creature.aggro, 5.5);
  creature.state = creature.state === 'patrol' ? 'stalk' : creature.state;
  let detached = false;
  if (part.hp <= 0) {
    this.spawnFloatingText(`${part.id.replace(/-/g, ' ')} crippled`, 0xffd166);
    detached = this.detachArticulatedPart(creature, part, source);
    if (part.id === 'head') creature.hp = 0;
  }
  if (creature.hp > 0) {
    if (!detached) state.status = `${source} hit ${creature.species}'s ${part.id.replace(/-/g, ' ')}.`;
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
  const jaw = creature.parts.find((part) => part.id === 'jaw');
  const tailScale = tail && (tail.hp <= 0 || tail.detached) ? 0.54 : 1;
  const finScale = fins.length ? Phaser.Math.Clamp(fins.filter((part) => part.hp > 0 && !part.detached).length / fins.length, 0.66, 1) : 1;
  const jawScale = jaw && (jaw.hp <= 0 || jaw.detached) ? 0.88 : 1;
  return tailScale * finScale * jawScale;
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
      const damageAlpha = part.detached ? 0.62 : part.hp <= 0 ? 0.26 : 1;
      const dynamicDepth =
        2.1 +
        manifest.depth +
        (part.id === 'jaw' ? creature.attackBlend * 0.035 : 0) +
        (part.id === 'fin-front' ? 0.018 : part.id === 'fin-back' ? -0.012 : 0) -
        (part.detached ? 0.08 : 0);
      part.sprite
        ?.setTexture(manifest.textureKey)
        .setVisible(true)
        .setPosition(part.x, part.y)
        .setOrigin(manifest.origin[0], manifest.origin[1])
        .setRotation(part.rotation)
        .setAlpha((creature.stunned > 0 ? alpha * 0.68 : alpha) * damageAlpha)
        .setDisplaySize(manifest.size[0] * PART_WORLD_SCALE, manifest.size[1] * PART_WORLD_SCALE)
        .setDepth(dynamicDepth);
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
      const jaw = creature.parts.find((part) => part.id === 'jaw');
      if (jaw && !jaw.detached && jaw.hp > 0) {
        const head = creature.parts.find((part) => part.id === 'head') ?? creature.parts[0];
        const markerX = head?.x ?? creature.x;
        const markerY = (head?.y ?? creature.y) - 62 * PART_WORLD_SCALE - Math.sin(creature.phase * 8) * 2;
        this.actors.fillStyle(0xff4f64, alpha * 0.68);
        this.actors.fillTriangle(markerX, markerY, markerX - 8, markerY - 14, markerX + 8, markerY - 14);
      }
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
