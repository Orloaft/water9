import Phaser from 'phaser';
import type { ArticulatedCreature, ArticulatedCreatureManifest, ArticulatedPartManifest, ArticulatedPartState, ArticulatedSocketOverlayManifest, ArticulatedSocketOverlayState, ArticulatedSocketStyleManifest, ControlState } from './types';
import { BOBBIT_ESCAPE_SECONDS,ENTITY_SCALE,PLAYER_CONTACT_RADIUS,TILE,WORLD_H,WORLD_W } from './constants';
import { state } from './state';
import { articulatedBehaviorFor,articulatedCreatureDef,articulatedCreatureDefs,articulatedPrototypeRuntimeEnabled,articulatedSpawnBudgetForBiome,articulatedSpawnPriority,createArticulatedCreature,partManifest,shouldSpawnArticulatedCreature } from './articulated';
import { darknessAtDepth, largeThreatDynamiteDamageMultiplier, lightRadius, rarityColor, scaledDepthPx } from './helpers';
import { renderHud } from './hud';
import type { DeepdiveScene } from './scene';
import { terrainMaskContactForCapsule } from './terrain-mask';

const PART_WORLD_SCALE = ENTITY_SCALE;
const BODY_SWIM_WAVE_SCALE = 1.32;
const TAIL_SWIM_WAVE_SCALE = 1.45;
const FIN_SWIM_WAVE_SCALE = 1.08;
const ARTICULATED_PITCH_SCALE = 0.4;
const SERPENT_DETECTION_RANGE = 430;
const SERPENT_LEASH_RANGE = 720;
const SERPENT_GRAB_SECONDS = 1.18;
const SERPENT_GRAB_COOLDOWN = 5.5;
const BOBBIT_BURROW_LATERAL_LIMIT = TILE * 1.2;
const BOBBIT_BURROW_VERTICAL_LEAN_LIMIT = 0.14;
const BOBBIT_MOUTH_LATCH_OFFSET_LIMIT = TILE * 1.6;
const ARTICULATED_TERRAIN_CORRECTION_PASSES = 3;
const ARTICULATED_FULL_SIM_RADIUS = 560;
const ARTICULATED_NEAR_SIM_RADIUS = 1180;
const ARTICULATED_OFFSCREEN_MARGIN = 220;
const ARTICULATED_NEAR_STEP_SECONDS = 1 / 30;
const ARTICULATED_FAR_STEP_SECONDS = 1 / 15;
const ARTICULATED_OFFSCREEN_STEP_SECONDS = 1 / 10;
const TURN_HISTORY_MAX_SAMPLES = 96;
const TURN_HISTORY_SAMPLE_SPACING = 18;

const largeRippleTurnIds = new Set([
  'abyssal-serpent',
  'abyssal-gulper',
  'abyssal-crownmaw',
  'abyssal-reliquary-wyrm',
]);

type Vec2 = { x: number; y: number };

type ArticulatedLookupCache = {
  partById: Map<string, ArticulatedPartState>;
  partCount: number;
  manifestById: Map<string, ArticulatedPartManifest>;
  manifestCount: number;
  spineManifests: ArticulatedPartManifest[];
  spineLagById: Map<string, number>;
};

const articulatedLookupCaches = new WeakMap<ArticulatedCreature, ArticulatedLookupCache>();

function articulatedCombatFor(creature: ArticulatedCreature) {
  const behavior = articulatedBehaviorFor(creature.manifest);
  const behaviorDefaults = {
    serpent: { detectionRange: SERPENT_DETECTION_RANGE, leashRange: SERPENT_LEASH_RANGE, attackRange: 172, lungeSeconds: 0.74, lungeSpeedScale: 2.45, grabSeconds: SERPENT_GRAB_SECONDS, grabCooldown: SERPENT_GRAB_COOLDOWN, grabEnabled: true, contactPadding: 22 },
    ambusher: { detectionRange: 360, leashRange: 540, attackRange: 140, lungeSeconds: 0.82, lungeSpeedScale: 2.7, grabSeconds: 0.82, grabCooldown: 6.4, grabEnabled: true, contactPadding: 18 },
    charger: { detectionRange: 520, leashRange: 840, attackRange: 220, lungeSeconds: 0.58, lungeSpeedScale: 3.15, grabSeconds: 0, grabCooldown: 4.8, grabEnabled: false, contactPadding: 28 },
    territorial: { detectionRange: 300, leashRange: 440, attackRange: 118, lungeSeconds: 0.62, lungeSpeedScale: 1.9, grabSeconds: 0, grabCooldown: 5.8, grabEnabled: false, contactPadding: 20 },
    passive: { detectionRange: 0, leashRange: 260, attackRange: 0, lungeSeconds: 0.6, lungeSpeedScale: 1, grabSeconds: 0, grabCooldown: 999, grabEnabled: false, contactPadding: 12 },
  }[behavior];
  const combat = creature.manifest.combat ?? {};
  return {
    behavior,
    hostile: combat.hostile ?? creature.hostile,
    detectionRange: combat.detectionRange ?? behaviorDefaults.detectionRange,
    leashRange: combat.leashRange ?? behaviorDefaults.leashRange,
    attackRange: combat.attackRange ?? behaviorDefaults.attackRange,
    lungeSeconds: combat.lungeSeconds ?? behaviorDefaults.lungeSeconds,
    lungeSpeedScale: combat.lungeSpeedScale ?? behaviorDefaults.lungeSpeedScale,
    grabSeconds: combat.grabSeconds ?? behaviorDefaults.grabSeconds,
    grabCooldown: combat.grabCooldown ?? behaviorDefaults.grabCooldown,
    grabEnabled: combat.grabEnabled ?? behaviorDefaults.grabEnabled,
    bitePartId: combat.bitePartId,
    biteAnchor: combat.biteAnchor ?? 'bite',
    contactPadding: combat.contactPadding ?? behaviorDefaults.contactPadding,
    damageMultiplier: combat.damageMultiplier ?? 1,
  };
}

function facingFor(creature: ArticulatedCreature) {
  return creature.facingSign < 0 ? -1 : 1;
}

export function usesLargeThreatRippleTurning(creature: ArticulatedCreature) {
  if (creature.bobbitBurrow) return false;
  if (largeRippleTurnIds.has(creature.id)) return true;
  return state.biome >= 3
    && creature.radius >= 36
    && articulatedBehaviorFor(creature.manifest) === 'serpent';
}

function mirrorSideForHeading(heading: number): 1 | -1 {
  return Math.cos(heading) < 0 ? -1 : 1;
}

function ensureLargeThreatTurnRuntime(creature: ArticulatedCreature) {
  if (creature.turn) return creature.turn;
  const speed = Math.hypot(creature.vx, creature.vy);
  const fallbackHeading = creature.facingSign < 0 ? Math.PI : 0;
  const heading = speed > 1 ? Math.atan2(creature.vy, creature.vx) : fallbackHeading;
  const mirrorSide = mirrorSideForHeading(heading);
  creature.turn = {
    heading,
    angularVelocity: 0,
    mirrorSide,
    mirrorIntentSide: mirrorSide,
    mirrorIntentTime: 0,
    time: 0,
    distance: 0,
    history: [],
  };
  recordLargeThreatTurnSample(creature, 0, true);
  return creature.turn;
}

function largeThreatTurnTuning(creature: ArticulatedCreature) {
  const behavior = articulatedBehaviorFor(creature.manifest);
  const radiusScale = Phaser.Math.Clamp(creature.radius / 54, 0.75, 1.45);
  return {
    maxAngularVelocity: (behavior === 'charger' ? 1.65 : 1.22) / radiusScale,
    maxAngularAcceleration: (behavior === 'charger' ? 5.8 : 4.25) / radiusScale,
    headingResponsiveness: behavior === 'charger' ? 7.2 : 5.6,
    mirrorHysteresisCos: 0.16,
    mirrorCommitSeconds: creature.aggro > 0 ? 0.1 : 0.15,
  };
}

function updateLargeThreatTurnRuntime(creature: ArticulatedCreature, delta: number) {
  if (!usesLargeThreatRippleTurning(creature)) return;
  const turn = ensureLargeThreatTurnRuntime(creature);
  const speed = Math.hypot(creature.vx, creature.vy);
  const tuning = largeThreatTurnTuning(creature);
  if (speed > 1.5 && delta > 0) {
    const desiredHeading = Math.atan2(creature.vy, creature.vx);
    const angleError = Phaser.Math.Angle.Wrap(desiredHeading - turn.heading);
    const desiredAngularVelocity = Phaser.Math.Clamp(
      angleError * tuning.headingResponsiveness,
      -tuning.maxAngularVelocity,
      tuning.maxAngularVelocity,
    );
    const angularVelocityDelta = Phaser.Math.Clamp(
      desiredAngularVelocity - turn.angularVelocity,
      -tuning.maxAngularAcceleration * delta,
      tuning.maxAngularAcceleration * delta,
    );
    turn.angularVelocity = Phaser.Math.Clamp(
      turn.angularVelocity + angularVelocityDelta,
      -tuning.maxAngularVelocity,
      tuning.maxAngularVelocity,
    );
    turn.heading = Phaser.Math.Angle.Wrap(turn.heading + turn.angularVelocity * delta);
  } else {
    turn.angularVelocity *= Math.exp(-5.5 * delta);
  }

  const verticalAxisDistance = Math.abs(Math.cos(turn.heading));
  const targetMirrorSide = mirrorSideForHeading(turn.heading);
  if (targetMirrorSide === turn.mirrorSide || verticalAxisDistance < tuning.mirrorHysteresisCos) {
    turn.mirrorIntentSide = turn.mirrorSide;
    turn.mirrorIntentTime = 0;
  } else if (turn.mirrorIntentSide !== targetMirrorSide) {
    turn.mirrorIntentSide = targetMirrorSide;
    turn.mirrorIntentTime = delta;
  } else {
    turn.mirrorIntentTime += delta;
    if (turn.mirrorIntentTime >= tuning.mirrorCommitSeconds) {
      turn.mirrorSide = targetMirrorSide;
      turn.mirrorIntentTime = 0;
    }
  }

  creature.facingSign = Math.cos(turn.heading) < 0 ? -1 : 1;
}

function recordLargeThreatTurnSample(creature: ArticulatedCreature, delta: number, force = false) {
  if (!usesLargeThreatRippleTurning(creature)) return;
  const turn = ensureLargeThreatTurnRuntime(creature);
  turn.time += delta;
  const last = turn.history[turn.history.length - 1];
  const stepDistance = last ? Math.hypot(creature.x - last.x, creature.y - last.y) : 0;
  turn.distance += stepDistance;
  if (!force && last && last.mirrorSide === turn.mirrorSide && stepDistance < 2.5 && turn.time - last.time < 0.08) return;
  const sample = {
    x: creature.x,
    y: creature.y,
    rotation: turn.heading,
    mirrorSide: turn.mirrorSide,
    time: turn.time,
    distance: turn.distance,
  };
  turn.history.push(sample);
  while (turn.history.length > TURN_HISTORY_MAX_SAMPLES) turn.history.shift();
}

function sampleLargeThreatTurnHistory(creature: ArticulatedCreature, distanceBehind: number) {
  const turn = creature.turn;
  if (!turn?.history.length) return null;
  const targetDistance = Math.max(0, turn.distance - distanceBehind);
  let older = turn.history[0];
  let newer = turn.history[turn.history.length - 1];
  for (let i = turn.history.length - 1; i >= 0; i -= 1) {
    const sample = turn.history[i];
    if (sample.distance <= targetDistance) {
      older = sample;
      newer = turn.history[Math.min(turn.history.length - 1, i + 1)] ?? sample;
      break;
    }
  }
  const span = Math.max(0.001, newer.distance - older.distance);
  const t = Phaser.Math.Clamp((targetDistance - older.distance) / span, 0, 1);
  return {
    x: Phaser.Math.Linear(older.x, newer.x, t),
    y: Phaser.Math.Linear(older.y, newer.y, t),
    rotation: Phaser.Math.Angle.Wrap(older.rotation + Phaser.Math.Angle.Wrap(newer.rotation - older.rotation) * t),
    mirrorSide: t < 0.5 ? older.mirrorSide : newer.mirrorSide,
    sampleCount: turn.history.length,
  };
}

function historyDistanceForPart(creature: ArticulatedCreature, manifest: ArticulatedPartManifest, spineManifests: ArticulatedPartManifest[]) {
  const index = spineManifests.findIndex((candidate) => candidate.id === manifest.id);
  if (index < 0) return 0;
  return index * TURN_HISTORY_SAMPLE_SPACING + Math.max(0, -manifest.offset[0]) * PART_WORLD_SCALE * 0.36;
}

function manifestById(creature: ArticulatedCreature, id: string) {
  return creature.manifest.parts.find((candidate) => candidate.id === id);
}

function overlayManifestById(creature: ArticulatedCreature, overlay: ArticulatedSocketOverlayState) {
  return creature.manifest.socketOverlays?.find((candidate) => candidate.id === overlay.id);
}

function socketStyleValue(
  creature: ArticulatedCreature,
  overlay: ArticulatedSocketOverlayManifest,
  key: keyof ArticulatedSocketStyleManifest,
  fallback: number,
) {
  return overlay[key] ?? creature.manifest.socketStyle?.[key] ?? fallback;
}

function murkTintFor(creature: ArticulatedCreature) {
  const tint = creature.manifest.murkTint;
  if (!tint) return undefined;
  const target = Phaser.Display.Color.IntegerToColor(tint.color);
  const intensity = Phaser.Math.Clamp(
    creature.stunned > 0 ? (tint.stunnedIntensity ?? tint.intensity) : tint.intensity,
    0,
    1,
  );
  const red = Phaser.Math.Linear(255, target.red, intensity);
  const green = Phaser.Math.Linear(255, target.green, intensity);
  const blue = Phaser.Math.Linear(255, target.blue, intensity);
  return Phaser.Display.Color.GetColor(red, green, blue);
}

function anchorFor(manifest: ArticulatedPartManifest, name: string | undefined) {
  return name && manifest.anchors?.[name] ? manifest.anchors[name] : ([0, 0] as [number, number]);
}

function localVectorOffsetFor(facing: number, rotation: number, local: [number, number]) {
  const localX = local[0] * PART_WORLD_SCALE * facing;
  const localY = local[1] * PART_WORLD_SCALE;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { x: localX * cos - localY * sin, y: localX * sin + localY * cos };
}

function anchoredOffsetFor(manifest: ArticulatedPartManifest, facing: number, rotation: number, local: [number, number]) {
  const originX = (manifest.origin[0] - 0.5) * manifest.size[0];
  const originY = (manifest.origin[1] - 0.5) * manifest.size[1];
  return localVectorOffsetFor(facing, rotation, [local[0] - originX, local[1] - originY]);
}

function anchorWorldFor(part: ArticulatedPartState, manifest: ArticulatedPartManifest, facing: number, local: [number, number]) {
  const offset = anchoredOffsetFor(manifest, facing, part.rotation, local);
  return { x: part.x + offset.x, y: part.y + offset.y };
}

export function articulatedPartHitShape(creature: ArticulatedCreature, part: ArticulatedPartState) {
  const manifest = partManifest(creature, part);
  const facing = facingFor(creature);
  const centerOffset = localVectorOffsetFor(facing, part.rotation, [
    (0.5 - manifest.origin[0]) * manifest.size[0],
    (0.5 - manifest.origin[1]) * manifest.size[1],
  ]);
  const width = manifest.size[0] * PART_WORLD_SCALE;
  const height = manifest.size[1] * PART_WORLD_SCALE;
  const longAxisY = manifest.motion.kind === 'fin' && height > width * 1.05;
  const longSize = longAxisY ? height : width;
  const shortSize = longAxisY ? width : height;
  const radius = Phaser.Math.Clamp(
    Math.max(shortSize * 0.36, manifest.hitRadius * PART_WORLD_SCALE * 0.78),
    5,
    Math.max(6, longSize * 0.42),
  );
  return {
    centerX: part.x + centerOffset.x,
    centerY: part.y + centerOffset.y,
    rotation: part.rotation + (longAxisY ? Math.PI / 2 : 0),
    halfLength: Math.max(0, longSize * 0.5 - radius),
    radius,
  };
}

export function articulatedPartHitDistanceTo(creature: ArticulatedCreature, part: ArticulatedPartState, x: number, y: number) {
  const shape = articulatedPartHitShape(creature, part);
  const dx = x - shape.centerX;
  const dy = y - shape.centerY;
  const cos = Math.cos(-shape.rotation);
  const sin = Math.sin(-shape.rotation);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  const closestX = Phaser.Math.Clamp(localX, -shape.halfLength, shape.halfLength);
  const signedDistance = Math.hypot(localX - closestX, localY) - shape.radius;
  return {
    distance: Math.max(0, signedDistance),
    signedDistance,
    shape,
  };
}

function smoothAngle(current: number, target: number, amount: number) {
  return current + Phaser.Math.Angle.Wrap(target - current) * amount;
}

function spineLagIndexFor(spineManifests: ArticulatedPartManifest[], manifest: ArticulatedPartManifest) {
  const index = spineManifests.findIndex((candidate) => candidate.id === manifest.id);
  if (index < 0 || spineManifests.length <= 1) return 0;
  return (index / (spineManifests.length - 1)) * 3.2;
}

function spineNodeFor(creature: ArticulatedCreature, manifest: ArticulatedPartManifest) {
  let node = creature.spine.find((candidate) => candidate.partId === manifest.id);
  if (!node) {
    node = { partId: manifest.id, offset: 0, bend: 0, x: creature.x, y: creature.y, vx: 0, vy: 0, constraintError: 0, initialized: false };
    creature.spine.push(node);
  }
  return node;
}

function restOffsetFor(creature: ArticulatedCreature, manifest: ArticulatedPartManifest, facing: number, rotation: number) {
  if (!manifest.restOffset) return { x: 0, y: 0 };
  const node = manifest.motion.kind === 'body' || manifest.motion.kind === 'tail'
    ? creature.spine.find((candidate) => candidate.partId === manifest.id)
    : undefined;
  const isMandible = manifest.id === 'upper-mandible' || manifest.id === 'lower-mandible';
  const jawSign = manifest.id === 'upper-mandible' ? -1 : manifest.id === 'lower-mandible' ? 1 : 0;
  const mandibleClose = isMandible
    ? creature.state === 'grab'
      ? 1
      : Phaser.Math.Clamp(creature.attackBlend ?? 0, 0, 1)
    : 0;
  const mandiblePinch = isMandible ? -jawSign * mandibleClose * 30 : 0;
  const restY = manifest.restOffset[1] + mandiblePinch + (node ? node.offset * 0.28 / PART_WORLD_SCALE : 0);
  return localVectorOffsetFor(facing, rotation, [manifest.restOffset[0], restY]);
}

function articulatedLookupCacheFor(creature: ArticulatedCreature) {
  const cached = articulatedLookupCaches.get(creature);
  if (cached && cached.partCount === creature.parts.length && cached.manifestCount === creature.manifest.parts.length) return cached;
  const spineManifests = creature.manifest.parts
    .filter((manifest) => manifest.motion.kind === 'body' || manifest.motion.kind === 'tail')
    .sort((a, b) => b.offset[0] - a.offset[0]);
  const spineLagById = new Map<string, number>();
  spineManifests.forEach((manifest, index) => {
    spineLagById.set(manifest.id, spineManifests.length <= 1 ? 0 : (index / (spineManifests.length - 1)) * 3.2);
  });
  const next = {
    partById: new Map(creature.parts.map((part) => [part.id, part])),
    partCount: creature.parts.length,
    manifestById: new Map(creature.manifest.parts.map((manifest) => [manifest.id, manifest])),
    manifestCount: creature.manifest.parts.length,
    spineManifests,
    spineLagById,
  };
  articulatedLookupCaches.set(creature, next);
  return next;
}

function defaultAnatomyFor(manifest: ArticulatedPartManifest) {
  const role = manifest.motion.kind === 'root' || manifest.motion.kind === 'body'
    ? (manifest.id === 'head' ? 'head' : 'torso')
    : manifest.motion.kind;
  const mobilityFactor = role === 'tail'
    ? 0.54
    : role === 'fin'
      ? 0.76
      : role === 'jaw'
        ? 0.88
        : role === 'torso'
          ? 0.84
          : 0.62;
  return {
    role,
    mass: Math.max(0.25, manifest.hitRadius / 24),
    drag: 0.72,
    angularDrag: 0.28,
    severable: role === 'fin' || role === 'tail' || role === 'jaw',
    breakThreshold: 1,
    mobilityFactor,
  };
}

function anatomyFor(manifest: ArticulatedPartManifest) {
  return { ...defaultAnatomyFor(manifest), ...manifest.anatomy };
}

function canDetachPart(manifest: ArticulatedPartManifest) {
  return anatomyFor(manifest).severable;
}

export function isDangerousArticulatedPart(creature: ArticulatedCreature, part: ArticulatedPartState) {
  if (part.detached || part.hp <= 0) return false;
  const manifest = partManifest(creature, part);
  const anatomy = anatomyFor(manifest);
  const id = manifest.id.toLowerCase();
  const hasBiteAnchor = Boolean(manifest.anchors?.bite || manifest.anchors?.jaw || manifest.anchors?.sting);
  const dangerousName = /\b(jaw|mandible|tooth|teeth|fang|bite|claw|stinger|sting|spike|thorn|saw|razor|hook|harpoon|barb)\b/.test(id);
  const sharpFin = anatomy.role === 'fin' && /\b(sharp|saw|razor|spike|thorn|blade|barb)\b/.test(id);
  return anatomy.role === 'jaw'
    || manifest.motion.kind === 'jaw'
    || hasBiteAnchor
    || dangerousName
    || sharpFin
    || part.id === creature.manifest.combat?.bitePartId;
}

function terrainContactForPart(scene: DeepdiveScene, creature: ArticulatedCreature, part: ArticulatedPartState, _manifest: ArticulatedPartManifest) {
  const shape = articulatedPartHitShape(creature, part);
  const contact = terrainMaskContactForCapsule(scene, shape.centerX, shape.centerY, shape.rotation, shape.halfLength, Math.max(6, shape.radius), { maxSamples: 40 });
  if (!contact) return null;
  return {
    count: contact.count,
    nx: contact.nx,
    ny: contact.ny,
    part,
  };
}

export function articulatedPartTerrainContact(this: DeepdiveScene, creature: ArticulatedCreature, part: ArticulatedPartState) {
  return terrainContactForPart(this, creature, part, partManifest(creature, part));
}

export function articulatedPartAnchorWorld(creature: ArticulatedCreature, partId: string, anchorName: string) {
  const part = creature.parts.find((candidate) => candidate.id === partId);
  const manifest = manifestById(creature, partId);
  if (!part || !manifest || part.detached) return null;
  return anchorWorldFor(part, manifest, facingFor(creature), anchorFor(manifest, anchorName));
}

export function articulatedBitePart(creature: ArticulatedCreature) {
  const combat = articulatedCombatFor(creature);
  const parts = creature.parts;
  const alive = (part: ArticulatedPartState | undefined) => part && part.hp > 0 && !part.detached ? part : null;
  if (combat.bitePartId) return alive(parts.find((part) => part.id === combat.bitePartId));
  const primaryBite = parts.find((part) => part.id === 'jaw')
    ?? parts.find((part) => anatomyFor(partManifest(creature, part)).role === 'jaw')
    ?? parts.find((part) => partManifest(creature, part).motion.kind === 'jaw');
  if (primaryBite) return alive(primaryBite);
  const candidates = [
    parts.find((part) => Boolean(partManifest(creature, part).anchors?.[combat.biteAnchor])),
    parts.find((part) => part.id === 'head'),
  ];
  return candidates.map(alive).find(Boolean) ?? null;
}

export function articulatedBiteAnchorWorld(creature: ArticulatedCreature) {
  const upperMandible = creature.parts.find((candidate) => candidate.id === 'upper-mandible' && candidate.hp > 0 && !candidate.detached);
  const lowerMandible = creature.parts.find((candidate) => candidate.id === 'lower-mandible' && candidate.hp > 0 && !candidate.detached);
  const head = creature.parts.find((candidate) => candidate.id === 'head' && candidate.hp > 0 && !candidate.detached);
  const headManifest = head ? manifestById(creature, head.id) : undefined;
  if (upperMandible && lowerMandible && head && headManifest?.anchors?.bite) {
    return anchorWorldFor(head, headManifest, facingFor(creature), headManifest.anchors.bite);
  }
  const upperManifest = upperMandible ? manifestById(creature, upperMandible.id) : undefined;
  const lowerManifest = lowerMandible ? manifestById(creature, lowerMandible.id) : undefined;
  if (upperMandible && lowerMandible && upperManifest?.anchors?.bite && lowerManifest?.anchors?.bite) {
    const facing = facingFor(creature);
    const upper = anchorWorldFor(upperMandible, upperManifest, facing, upperManifest.anchors.bite);
    const lower = anchorWorldFor(lowerMandible, lowerManifest, facing, lowerManifest.anchors.bite);
    return new Phaser.Math.Vector2((upper.x + lower.x) * 0.5, (upper.y + lower.y) * 0.5);
  }
  const part = articulatedBitePart(creature);
  if (!part) return null;
  const manifest = partManifest(creature, part);
  const combat = articulatedCombatFor(creature);
  const anchorName = manifest.anchors?.[combat.biteAnchor] ? combat.biteAnchor : manifest.anchors?.bite ? 'bite' : undefined;
  return anchorWorldFor(part, manifest, facingFor(creature), anchorFor(manifest, anchorName));
}

function destroyArticulatedCreatureSprites(creature: ArticulatedCreature) {
  creature.parts.forEach((part) => part.sprite?.destroy());
  creature.socketOverlays.forEach((overlay) => overlay.sprite?.destroy());
}

function articulatedSpawnPocketTiles(manifest: ArticulatedCreatureManifest) {
  const extents = manifest.parts.reduce(
    (max, part) => ({
      x: Math.max(max.x, Math.abs(part.offset[0]) * PART_WORLD_SCALE + part.size[0] * PART_WORLD_SCALE * 0.62),
      y: Math.max(max.y, Math.abs(part.offset[1]) * PART_WORLD_SCALE + part.size[1] * PART_WORLD_SCALE * 0.62),
    }),
    { x: manifest.radius * PART_WORLD_SCALE, y: manifest.radius * PART_WORLD_SCALE },
  );
  return {
    x: Math.ceil(extents.x / TILE) + 4,
    y: Math.ceil(extents.y / TILE) + 4,
  };
}

function clampArticulatedSpawnPoint(manifest: ArticulatedCreatureManifest, point: { x: number; y: number }) {
  const pocket = articulatedSpawnPocketTiles(manifest);
  return {
    x: Phaser.Math.Clamp(point.x, (pocket.x + 1) * TILE, (WORLD_W - pocket.x - 1) * TILE),
    y: Phaser.Math.Clamp(point.y, Math.max(8, pocket.y + 1) * TILE, (WORLD_H - pocket.y - 1) * TILE),
  };
}

function carveArticulatedSpawnPocket(scene: DeepdiveScene, manifest: ArticulatedCreatureManifest, point: { x: number; y: number }) {
  const pocket = articulatedSpawnPocketTiles(manifest);
  const cx = Math.floor(point.x / TILE);
  const cy = Math.floor(point.y / TILE);
  for (let y = Math.max(8, cy - pocket.y); y <= Math.min(WORLD_H - 3, cy + pocket.y); y += 1) {
    for (let x = Math.max(2, cx - pocket.x); x <= Math.min(WORLD_W - 3, cx + pocket.x); x += 1) {
      const dx = (x - cx) / Math.max(1, pocket.x);
      const dy = (y - cy) / Math.max(1, pocket.y);
      if (dx * dx + dy * dy <= 1.28) scene.setTile(x, y, 'water');
    }
  }
}

function articulatedSpawnIsClear(scene: DeepdiveScene, creature: ArticulatedCreature) {
  return creature.parts
    .filter((part) => !part.detached && part.hp > 0)
    .every((part) => !terrainContactForPart(scene, creature, part, partManifest(creature, part)));
}

const signatureEncounterCreatureIds = new Set([
  'abyssal-mandible-bobbit',
  'abyssal-gulper',
  'abyssal-reliquary-wyrm',
  'abyssal-glasshook-skulk',
]);

function isBiomeOneGlasshookSkulk(manifest: ArticulatedCreatureManifest) {
  return state.biome === 1 && manifest.id === 'abyssal-glasshook-skulk';
}

function spawnArticulatedAt(scene: DeepdiveScene, manifest: ArticulatedCreatureManifest, point: { x: number; y: number }, phaseOffset = 0) {
  const clamped = clampArticulatedSpawnPoint(manifest, point);
  const creature = createArticulatedCreature(scene, manifest, clamped.x, clamped.y);
  creature.homeX = clamped.x;
  creature.homeY = clamped.y;
  creature.phase += phaseOffset;
  scene.updateArticulatedParts(creature, 0);
  return creature;
}

function spawnReservedArticulated(scene: DeepdiveScene, manifest: ArticulatedCreatureManifest, index: number) {
  const reservation = scene.encounterReservationForCreature(manifest.id);
  if (!reservation) return null;
  let creature = spawnArticulatedAt(scene, manifest, { x: reservation.homeX, y: reservation.homeY }, index * 1.7);
  if (!articulatedSpawnIsClear(scene, creature)) {
    destroyArticulatedCreatureSprites(creature);
    carveArticulatedSpawnPocket(scene, manifest, { x: reservation.homeX, y: reservation.homeY });
    creature = spawnArticulatedAt(scene, manifest, { x: reservation.homeX, y: reservation.homeY }, index * 1.7);
  }
  reservation.occupied = true;
  return creature;
}

function reservedBobbitSpawnCount(scene: DeepdiveScene) {
  if (state.biome < 2 || scene.bobbitBurrows.length <= 0) return 0;
  const manifest = articulatedCreatureDef('abyssal-mandible-bobbit');
  return shouldSpawnArticulatedCreature(manifest) ? scene.bobbitBurrows.length : 0;
}

function isBurrowBobbit(creature: ArticulatedCreature) {
  return creature.id === 'abyssal-mandible-bobbit' && Boolean(creature.bobbitBurrow);
}

function bobbitBurrowFor(scene: DeepdiveScene, creature: ArticulatedCreature) {
  const runtime = creature.bobbitBurrow;
  return runtime ? scene.bobbitBurrows.find((burrow) => burrow.id === runtime.burrowId) ?? null : null;
}

function constrainBurrowBobbitToShaft(creature: ArticulatedCreature, burrow: NonNullable<ReturnType<typeof bobbitBurrowFor>>) {
  creature.facingSign = 1;
  creature.x = Phaser.Math.Clamp(creature.x, burrow.x - BOBBIT_BURROW_LATERAL_LIMIT, burrow.x + BOBBIT_BURROW_LATERAL_LIMIT);
  creature.y = Phaser.Math.Clamp(creature.y, burrow.shaftTopY + TILE * 0.6, burrow.anchorY + TILE * 0.8);
  creature.vx = Phaser.Math.Clamp(creature.vx, -creature.speed * 0.42, creature.speed * 0.42);
  creature.vy = Phaser.Math.Clamp(creature.vy, -creature.speed * 2.2, creature.speed * 1.35);
  creature.posePitch = Phaser.Math.Clamp(creature.posePitch, -BOBBIT_BURROW_VERTICAL_LEAN_LIMIT, BOBBIT_BURROW_VERTICAL_LEAN_LIMIT);
}

export function populateBobbitArticulatedThreats(this: DeepdiveScene) {
  if (!this.bobbitBurrows.length || state.biome < 2) return;
  const manifest = articulatedCreatureDef('abyssal-mandible-bobbit');
  if (manifest.id !== 'abyssal-mandible-bobbit' || !shouldSpawnArticulatedCreature(manifest)) return;
  for (const burrow of this.bobbitBurrows) {
    if (burrow.occupied) continue;
    const creature = createArticulatedCreature(this, manifest, burrow.anchorX, burrow.anchorY);
    creature.homeX = burrow.anchorX;
    creature.homeY = burrow.anchorY;
    creature.x = burrow.anchorX;
    creature.y = burrow.anchorY;
    creature.vx = 0;
    creature.vy = 0;
    creature.facingSign = 1;
    creature.state = 'recover';
    creature.stateTimer = 999;
    creature.grabCooldown = 999;
    creature.bobbitBurrow = {
      burrowId: burrow.id,
      phase: 'burrowed',
      phaseTimer: 0,
      escapeRemaining: BOBBIT_ESCAPE_SECONDS,
      dragTimer: 0,
      captured: null,
      lastSafeX: burrow.x,
      lastSafeY: burrow.y - TILE * 2,
      mouthLatchOffsetX: 0,
      mouthLatchOffsetY: 0,
      biteRegistered: false,
    };
    burrow.occupied = true;
    const reservation = this.encounterReservations.find((candidate) => candidate.bobbitBurrowId === burrow.id);
    if (reservation) reservation.occupied = true;
    this.updateArticulatedParts(creature, 0);
    this.articulatedCreatures.push(creature);
  }
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
      const restOffset = restOffsetFor(creature, manifest, facing, parent.rotation);
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
    const manifest = partManifest(creature, part);
    const anatomy = anatomyFor(manifest);
    part.x += part.detachVx * delta;
    part.y += part.detachVy * delta;
    part.detachVy += 42 * delta;
    part.detachVx *= Math.exp(-anatomy.drag * delta);
    part.detachVy *= Math.exp(-anatomy.drag * 0.48 * delta);
    part.rotation += part.detachAngularVelocity * delta;
    part.detachAngularVelocity *= Math.exp(-anatomy.angularDrag * delta);
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
  const anatomy = anatomyFor(manifest);
  const facing = facingFor(creature);
  const impulseScale = 1 / Math.sqrt(Phaser.Math.Clamp(anatomy.mass, 0.2, 6));
  part.detached = true;
  part.jointStress = 1;
  const impulseX = anatomy.role === 'jaw'
    ? Phaser.Math.FloatBetween(76, 116)
    : anatomy.role === 'fin'
      ? Phaser.Math.FloatBetween(36, 76)
      : Phaser.Math.FloatBetween(24, 62);
  const impulseY = anatomy.role === 'jaw'
    ? Phaser.Math.FloatBetween(28, 58)
    : anatomy.role === 'fin'
      ? -Phaser.Math.FloatBetween(18, 44)
      : -Phaser.Math.FloatBetween(12, 40);
  part.detachVx = creature.vx * 0.35 - facing * impulseX * impulseScale;
  part.detachVy = creature.vy * 0.25 + impulseY * impulseScale;
  const initialSeparation = anatomy.role === 'jaw' ? 0.2 : anatomy.role === 'tail' ? 0.34 : anatomy.role === 'fin' ? 0.14 : 0.12;
  const anatomicalSeparationX = anatomy.role === 'jaw' ? -facing * 28 : anatomy.role === 'tail' ? -facing * 58 : 0;
  const anatomicalSeparationY = anatomy.role === 'jaw' ? 34 : anatomy.role === 'tail' ? 8 : 0;
  part.x += part.detachVx * initialSeparation + anatomicalSeparationX;
  part.y += part.detachVy * initialSeparation + anatomicalSeparationY;
  const tumble = (Phaser.Math.FloatBetween(-1.5, 1.5) + facing * 0.5) * impulseScale;
  const minTumble = anatomy.role === 'fin' ? 0.64 : anatomy.role === 'jaw' ? 0.48 : 0.36;
  part.detachAngularVelocity = Math.abs(tumble) < minTumble ? minTumble * facing : tumble;
  part.hurtFlash = 1;
  this.spawnFloatingText(`${part.id.replace(/-/g, ' ')} severed`, 0xff7a5c);
  state.status = `${source} severed ${creature.species}'s ${part.id.replace(/-/g, ' ')}.`;
  const detachedManifest = partManifest(creature, part);
  const detachedWasBitePart = part.id === (creature.manifest.combat?.bitePartId ?? '')
    || part.id === 'jaw'
    || anatomyFor(detachedManifest).role === 'jaw'
    || detachedManifest.motion.kind === 'jaw'
    || Boolean(detachedManifest.anchors?.bite);
  if (detachedWasBitePart && creature.state === 'grab') {
    creature.state = 'recover';
    creature.grabTimer = 0;
    creature.stateTimer = 1.2;
  }
  if (detachedWasBitePart && creature.bobbitBurrow?.phase === 'drag') {
    this.releaseBurrowBobbit(creature, 'knife');
  }
  return true;
}

export function populateArticulatedCreatures(this: DeepdiveScene) {
  this.articulatedCreatures = [];
  const spawnBudget = articulatedSpawnBudgetForBiome(state.biome, articulatedPrototypeRuntimeEnabled());
  let remainingBudget = Math.max(0, spawnBudget - reservedBobbitSpawnCount(this));
  const manifests = articulatedCreatureDefs()
    .filter((manifest) => state.biome >= manifest.minBiome || isBiomeOneGlasshookSkulk(manifest))
    .filter((manifest) => shouldSpawnArticulatedCreature(manifest))
    .filter((manifest) => manifest.id !== 'abyssal-mandible-bobbit')
    .sort((a, b) => articulatedSpawnPriority(b) - articulatedSpawnPriority(a) || a.id.localeCompare(b.id));
  for (const manifest of manifests) {
    if (remainingBudget <= 0) break;
    const spawnCount = Math.min(isBiomeOneGlasshookSkulk(manifest) ? 1 : manifest.spawn.count, remainingBudget);
    for (let i = 0; i < spawnCount; i += 1) {
      const reservedCreature = signatureEncounterCreatureIds.has(manifest.id)
        ? spawnReservedArticulated(this, manifest, i)
        : null;
      if (reservedCreature) {
        this.articulatedCreatures.push(reservedCreature);
        remainingBudget -= 1;
        continue;
      }
      const minY = scaledDepthPx(manifest.spawn.minDepth);
      const maxY = scaledDepthPx(manifest.spawn.maxDepth);
      let creature: ArticulatedCreature | null = null;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        const point = clampArticulatedSpawnPoint(manifest, this.findOpenWaterInBand(minY, maxY));
        if (this.pointNearEncounterReservation(point.x, point.y, manifest.radius * ENTITY_SCALE)) continue;
        const candidate = createArticulatedCreature(this, manifest, point.x, point.y);
        candidate.homeX = point.x;
        candidate.homeY = point.y;
        candidate.phase += i * 1.7;
        candidate.facingSign = attempt % 2 === 0 ? 1 : -1;
        this.updateArticulatedParts(candidate, 0);
        if (articulatedSpawnIsClear(this, candidate)) {
          creature = candidate;
          break;
        }
        destroyArticulatedCreatureSprites(candidate);
      }
      if (!creature) {
        let point = clampArticulatedSpawnPoint(manifest, this.findOpenWaterInBand(minY, maxY));
        for (let attempt = 0; attempt < 32 && this.pointNearEncounterReservation(point.x, point.y, manifest.radius * ENTITY_SCALE); attempt += 1) {
          point = clampArticulatedSpawnPoint(manifest, this.findOpenWaterInBand(minY, maxY));
        }
        carveArticulatedSpawnPocket(this, manifest, point);
        creature = createArticulatedCreature(this, manifest, point.x, point.y);
        creature.homeX = point.x;
        creature.homeY = point.y;
        creature.phase += i * 1.7;
        this.updateArticulatedParts(creature, 0);
      }
      this.articulatedCreatures.push(creature);
      remainingBudget -= 1;
    }
  }
}

export function updateArticulatedCreatures(this: DeepdiveScene, delta: number, controls?: ControlState) {
  const camera = this.cameras.main;
  const tierStats = { full: 0, near: 0, far: 0, offscreen: 0, fullSteps: 0, skippedSteps: 0, terrainPasses: 0 };
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
      creature.x += creature.vx * delta;
      creature.y += creature.vy * delta;
      creature.vx *= Math.exp(-2.15 * delta);
      creature.vy *= Math.exp(-2.15 * delta);
      updateDetachedArticulatedParts(this, creature, delta);
      this.updateArticulatedParts(creature, delta);
      refreshJointStress(creature);
      continue;
    }
    const swimSpeed = Math.hypot(creature.vx, creature.vy);
    const phaseRate = creature.stunned > 0
      ? 0.25
      : Phaser.Math.Clamp(0.55 + swimSpeed / Math.max(1, creature.speed) * 1.15 + (creature.state === 'lunge' ? 0.28 : 0), 0.45, 2.25);
    creature.phase += delta * phaseRate;
    creature.bumpCooldown = Math.max(0, creature.bumpCooldown - delta);
    creature.stunned = Math.max(0, creature.stunned - delta);
    creature.scanPulse = Math.max(0, creature.scanPulse - delta * 1.2);
    creature.hurtFlash = Math.max(0, creature.hurtFlash - delta * 3.8);
    creature.aggroCue = Math.max(0, creature.aggroCue - delta * 1.2);
    creature.grabCooldown = Math.max(0, creature.grabCooldown - delta);
    creature.parts.forEach((part) => {
      part.hurtFlash = Math.max(0, part.hurtFlash - delta * 4.2);
    });

    if (!creature.scanned && !creature.scanning) {
      creature.scan = Math.max(0, creature.scan - delta * 0.55);
    }
    creature.scanning = false;

    if (isBurrowBobbit(creature)) {
      this.updateBurrowBobbitCreature(creature, delta, controls);
      continue;
    }

    const budget = articulatedSimulationBudgetFor(this, creature, delta, camera);
    tierStats[budget.tier] += 1;
    if (budget.runFullStep) tierStats.fullSteps += 1;
    else tierStats.skippedSteps += 1;
    tierStats.terrainPasses += budget.terrainPasses;
    const simDelta = budget.runFullStep ? budget.delta : delta;

    if (creature.stunned > 0) {
      creature.aggro = 0;
      creature.vx *= Math.exp(-3.5 * simDelta);
      creature.vy *= Math.exp(-3.5 * simDelta);
    } else if (budget.runFullStep) {
      this.steerArticulatedCreature(creature, simDelta);
    }

    creature.x += creature.vx * simDelta;
    creature.y += creature.vy * simDelta;
    if (!budget.runFullStep) {
      creature.vx *= Math.exp(-0.18 * delta);
      creature.vy *= Math.exp(-0.18 * delta);
    }
    if (usesLargeThreatRippleTurning(creature)) {
      updateLargeThreatTurnRuntime(creature, simDelta);
      recordLargeThreatTurnSample(creature, simDelta);
    } else {
      if (creature.vx < -2) creature.facingSign = -1;
      if (creature.vx > 2) creature.facingSign = 1;
    }
    updateDetachedArticulatedParts(this, creature, delta);
    if (!budget.runFullStep) continue;
    this.updateArticulatedParts(creature, simDelta);
    this.keepArticulatedCreatureInWater(creature, { passes: budget.terrainPasses });
    refreshJointStress(creature);
    this.resolveArticulatedGrab(creature, simDelta, controls);

    if (creature.stunned > 0 || this.isAtBoat()) continue;
    const combat = articulatedCombatFor(creature);
    const bitePart = this.articulatedBitePart(creature);
    const biteAnchor = this.articulatedBiteAnchorWorld(creature);
    const biteDistance = biteAnchor ? Phaser.Math.Distance.Between(this.player.x, this.player.y, biteAnchor.x, biteAnchor.y) : Number.POSITIVE_INFINITY;
    if ((creature.state === 'lunge' || creature.state === 'grab') && bitePart && this.isDangerousArticulatedPart(creature, bitePart) && biteDistance < PLAYER_CONTACT_RADIUS + combat.contactPadding && creature.bumpCooldown <= 0) {
      this.bumpArticulatedCreature(creature, bitePart, biteDistance);
      continue;
    }
    const hit = this.closestArticulatedPartTo(creature, this.player.x, this.player.y);
    if (hit && hit.distance < PLAYER_CONTACT_RADIUS && creature.bumpCooldown <= 0 && this.isDangerousArticulatedPart(creature, hit.part)) {
      this.bumpArticulatedCreature(creature, hit.part, hit.distance);
    }
  }
  if (this.perfTelemetry?.enabled) this.perfTelemetry.articulatedTiers = tierStats;
}

export function activeBobbitDrag(this: DeepdiveScene) {
  return this.articulatedCreatures.find((creature) => creature.bobbitBurrow?.phase === 'drag' && creature.bobbitBurrow.captured !== null && !creature.dead) ?? null;
}

function articulatedSimulationBudgetFor(
  scene: DeepdiveScene,
  creature: ArticulatedCreature,
  delta: number,
  camera: Phaser.Cameras.Scene2D.Camera,
) {
  const playerDistance = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, creature.x, creature.y);
  const visible = creatureWithinCamera(creature, camera, ARTICULATED_OFFSCREEN_MARGIN);
  const engaged = visible
    || playerDistance <= ARTICULATED_FULL_SIM_RADIUS
    || creature.aggro > 0
    || creature.state === 'lunge'
    || creature.state === 'grab'
    || creature.stunned > 0
    || creature.hurtFlash > 0
    || creature.grabTimer > 0
    || Boolean(creature.bobbitBurrow?.captured);
  const tier = engaged
    ? 'full'
    : playerDistance <= ARTICULATED_NEAR_SIM_RADIUS
      ? 'near'
      : visible
        ? 'far'
        : 'offscreen';
  const interval = tier === 'full'
    ? 0
    : tier === 'near'
      ? ARTICULATED_NEAR_STEP_SECONDS
      : tier === 'far'
        ? ARTICULATED_FAR_STEP_SECONDS
        : ARTICULATED_OFFSCREEN_STEP_SECONDS;
  const runtime = creature.simulationBudget ?? {
    accumulator: 0,
    lastTier: tier,
    skippedFrames: 0,
    fullSteps: 0,
    skippedSteps: 0,
  };
  if (runtime.lastTier !== tier) {
    runtime.accumulator = 0;
    runtime.skippedFrames = 0;
    runtime.lastTier = tier;
  }
  runtime.fullSteps = runtime.fullSteps || 0;
  runtime.skippedSteps = runtime.skippedSteps || 0;
  creature.simulationBudget = runtime;
  if (tier === 'full') {
    runtime.accumulator = 0;
    runtime.skippedFrames = 0;
    runtime.fullSteps += 1;
    return { tier, runFullStep: true, delta, terrainPasses: ARTICULATED_TERRAIN_CORRECTION_PASSES };
  }
  runtime.accumulator += delta;
  if (runtime.accumulator < interval) {
    runtime.skippedFrames += 1;
    runtime.skippedSteps += 1;
    return { tier, runFullStep: false, delta, terrainPasses: 0 };
  }
  const simDelta = Phaser.Math.Clamp(runtime.accumulator, delta, interval * 2.25);
  runtime.accumulator = 0;
  runtime.skippedFrames = 0;
  runtime.fullSteps += 1;
  return {
    tier,
    runFullStep: true,
    delta: simDelta,
    terrainPasses: tier === 'near' ? 2 : 1,
  };
}

function creatureWithinCamera(
  creature: ArticulatedCreature,
  camera: Phaser.Cameras.Scene2D.Camera,
  margin: number,
) {
  const radius = Math.max(120, creature.radius + 80);
  const view = camera.worldView;
  return creature.x + radius >= view.x - margin
    && creature.x - radius <= view.right + margin
    && creature.y + radius >= view.y - margin
    && creature.y - radius <= view.bottom + margin;
}

export function releaseBurrowBobbit(this: DeepdiveScene, creature: ArticulatedCreature, reason = 'released') {
  const runtime = creature.bobbitBurrow;
  const burrow = bobbitBurrowFor(this, creature);
  if (!runtime) return;
  const target = runtime.captured === 'sub' && state.activeSub ? state.activeSub : this.player;
  runtime.captured = null;
  runtime.phase = 'release';
  runtime.phaseTimer = 0.55;
  runtime.dragTimer = 0;
  runtime.escapeRemaining = BOBBIT_ESCAPE_SECONDS;
  runtime.mouthLatchOffsetX = 0;
  runtime.mouthLatchOffsetY = 0;
  runtime.biteRegistered = false;
  creature.state = 'recover';
  creature.grabTimer = 0;
  creature.bumpCooldown = 1.2;
  creature.grabCooldown = 3.8;
  creature.vx *= 0.25;
  creature.vy = -Math.abs(creature.vy) * 0.12;
  target.vx += (target.x < (burrow?.x ?? creature.x) ? -1 : 1) * 84;
  target.vy -= 118;
  state.status = reason === 'stun'
    ? 'The stun pulse broke the bobbit grip.'
    : reason === 'knife'
      ? 'Injector knife forced the bobbit to release.'
      : reason === 'killed'
        ? 'The bobbit went slack and let go.'
        : 'You tore free of the bobbit drag.';
  this.spawnFloatingText('Released', 0x8ee7f4);
}

export function updateBurrowBobbitCreature(this: DeepdiveScene, creature: ArticulatedCreature, delta: number, controls?: ControlState) {
  const runtime = creature.bobbitBurrow;
  const burrow = bobbitBurrowFor(this, creature);
  if (!runtime || !burrow) return;
  const target = state.pilotingSub && state.activeSub ? state.activeSub : this.player;
  const targetKind = state.pilotingSub && state.activeSub ? 'sub' : 'player';
  const targetDistance = Phaser.Math.Distance.Between(target.x, target.y, burrow.approachX, burrow.approachY);
  const inApproachLane = target.y >= burrow.shaftTopY - TILE * 4 && target.y <= burrow.y - TILE * 1.25;
  const canTrigger = !this.isAtBoat() && burrow.cooldown <= 0 && targetDistance < burrow.approachRadius && inApproachLane;
  burrow.cooldown = Math.max(0, burrow.cooldown - delta);
  runtime.phaseTimer = Math.max(0, runtime.phaseTimer - delta);
  constrainBurrowBobbitToShaft(creature, burrow);

  if (creature.dead || creature.hp <= 0) {
    if (runtime.captured) this.releaseBurrowBobbit(creature, 'killed');
    return;
  }
  const bitePartAlive = Boolean(this.articulatedBitePart(creature));
  if (!bitePartAlive && runtime.captured) this.releaseBurrowBobbit(creature, 'knife');
  if (creature.stunned > 0 && runtime.captured) this.releaseBurrowBobbit(creature, 'stun');

  if (runtime.phase === 'burrowed') {
    burrow.triggered = false;
    runtime.biteRegistered = false;
    creature.x = Phaser.Math.Linear(creature.x, burrow.anchorX, Math.min(1, delta * 4.5));
    creature.y = Phaser.Math.Linear(creature.y, burrow.anchorY, Math.min(1, delta * 4.5));
    creature.vx = 0;
    creature.vy = 0;
    creature.state = 'recover';
    creature.attackBlend = Phaser.Math.Linear(creature.attackBlend, 0, Math.min(1, delta * 8));
    creature.swimEffort = 0.25;
    if (canTrigger && creature.stunned <= 0) {
      runtime.phase = 'telegraph';
      runtime.phaseTimer = 0.72;
      burrow.triggered = true;
      state.status = 'Silt pulses from a deep burrow.';
    }
  } else if (runtime.phase === 'telegraph') {
    creature.x = Phaser.Math.Linear(creature.x, burrow.x, Math.min(1, delta * 3.5));
    creature.y = Phaser.Math.Linear(creature.y, burrow.y - TILE * 1.7, Math.min(1, delta * 3.5));
    creature.vx = 0;
    creature.vy = -28;
    creature.attackBlend = Phaser.Math.Linear(creature.attackBlend, 0.55, Math.min(1, delta * 9));
    creature.swimEffort = 0.7;
    if (!canTrigger) {
      runtime.phase = 'reset';
      runtime.phaseTimer = 0.8;
      burrow.cooldown = 2.6;
    } else if (runtime.phaseTimer <= 0) {
      runtime.phase = 'emerge';
      runtime.phaseTimer = 0.45;
    }
  } else if (runtime.phase === 'emerge') {
    creature.x = Phaser.Math.Linear(creature.x, burrow.x, Math.min(1, delta * 5));
    creature.y = Phaser.Math.Linear(creature.y, Math.max(burrow.shaftTopY + TILE * 1.6, burrow.y - TILE * 4.25), Math.min(1, delta * 5));
    creature.vx = 0;
    creature.vy = -58;
    creature.attackBlend = Phaser.Math.Linear(creature.attackBlend, 0.75, Math.min(1, delta * 10));
    creature.swimEffort = 1;
    if (runtime.phaseTimer <= 0) {
      runtime.phase = 'lunge';
      runtime.phaseTimer = 0.62;
      creature.state = 'lunge';
      state.status = 'Mandibles erupt from the burrow.';
    }
  } else if (runtime.phase === 'lunge') {
    const desiredX = Phaser.Math.Clamp(target.x, burrow.x - BOBBIT_BURROW_LATERAL_LIMIT, burrow.x + BOBBIT_BURROW_LATERAL_LIMIT);
    const desiredY = Phaser.Math.Clamp(target.y, burrow.shaftTopY + TILE * 0.8, burrow.y - TILE * 1.2);
    const dx = desiredX - creature.x;
    const dy = desiredY - creature.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const speed = creature.speed * 2.35;
    creature.vx += (dx / len) * speed * 1.55 * delta;
    creature.vy += (dy / len) * speed * 7.1 * delta - 22 * delta;
    creature.vx *= Math.exp(-6.8 * delta);
    creature.vy *= Math.exp(-1.65 * delta);
    creature.attackBlend = Phaser.Math.Linear(creature.attackBlend, 1, Math.min(1, delta * 14));
    creature.swimEffort = 1.25;
    creature.x += creature.vx * delta;
    creature.y += creature.vy * delta;
    const bite = this.articulatedBiteAnchorWorld(creature);
    const biteDistance = bite ? Phaser.Math.Distance.Between(target.x, target.y, bite.x, bite.y) : Infinity;
    if (bite && biteDistance < PLAYER_CONTACT_RADIUS + 26 && bitePartAlive) {
      runtime.phase = 'drag';
      runtime.phaseTimer = 0;
      runtime.dragTimer = 5.2;
      runtime.escapeRemaining = BOBBIT_ESCAPE_SECONDS;
      runtime.captured = targetKind;
      runtime.lastSafeX = target.x;
      runtime.lastSafeY = target.y;
      const latchLimit = targetKind === 'sub' ? TILE * 2.2 : BOBBIT_MOUTH_LATCH_OFFSET_LIMIT;
      runtime.mouthLatchOffsetX = Phaser.Math.Clamp(target.x - bite.x, -latchLimit, latchLimit);
      runtime.mouthLatchOffsetY = Phaser.Math.Clamp(target.y - bite.y, -latchLimit, latchLimit);
      runtime.biteRegistered = true;
      creature.state = 'grab';
      creature.grabTimer = runtime.dragTimer;
      creature.bumpCooldown = 1.1;
      this.applyHullDamage(13 + state.biome * 2, 'Abyssal bobbit mandibles clamped down.');
      this.registerPredatorBite(creature);
      this.playFishBite(18);
      state.status = 'Bobbit latched. Hold away from the burrow, use the knife, or fire a stun before the timer ends.';
      this.spawnFloatingText('Escape now', 0xff4f64);
    } else if (runtime.phaseTimer <= 0 || creature.y > burrow.y - TILE * 0.5) {
      runtime.phase = 'reset';
      runtime.phaseTimer = 1.05;
      burrow.cooldown = 3.4;
    }
  } else if (runtime.phase === 'drag') {
    if (!runtime.captured || this.isAtBoat() || (runtime.captured === 'sub' && (!state.activeSub || !state.pilotingSub))) {
      this.releaseBurrowBobbit(creature, 'released');
    } else {
      const struggle = controls?.hasMove ? controls.move.length() : 0;
      const upward = controls?.move ? Math.max(0, -controls.move.y) : 0;
      runtime.escapeRemaining -= delta * (0.55 + struggle * 0.72 + upward * 0.42);
      runtime.dragTimer -= delta;
      const subResist = runtime.captured === 'sub' && state.activeSub ? 0.58 + state.activeSub.tier * 0.14 : 1;
      const dragSpeed = (52 + state.biome * 7) * subResist * Math.max(0.42, 1 - upward * 0.28);
      const previousTargetX = target.x;
      const previousTargetY = target.y;
      const mouthGoalX = Phaser.Math.Linear(target.x - runtime.mouthLatchOffsetX, burrow.x, Math.min(1, delta * 2.4));
      const mouthGoalY = Math.min(burrow.anchorY - TILE * 1.2, target.y - runtime.mouthLatchOffsetY + dragSpeed * delta);
      creature.x = Phaser.Math.Linear(creature.x, burrow.x, Math.min(1, delta * 5.5));
      creature.y = Phaser.Math.Linear(creature.y, Math.min(mouthGoalY + TILE * 0.55, burrow.anchorY), Math.min(1, delta * 4));
      creature.vx = 0;
      creature.vy = Math.max(20, dragSpeed * 0.45);
      creature.attackBlend = Phaser.Math.Linear(creature.attackBlend, 1, Math.min(1, delta * 12));
      creature.swimEffort = 1.2;
      this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });
      const currentBite = this.articulatedBiteAnchorWorld(creature);
      if (currentBite) {
        creature.x += Phaser.Math.Clamp(mouthGoalX - currentBite.x, -TILE * 2.4, TILE * 2.4);
        creature.y += Phaser.Math.Clamp(mouthGoalY - currentBite.y, -TILE * 2.4, TILE * 2.4);
        constrainBurrowBobbitToShaft(creature, burrow);
        this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });
      }
      const finalBite = this.articulatedBiteAnchorWorld(creature);
      const desiredX = finalBite ? finalBite.x + runtime.mouthLatchOffsetX : mouthGoalX + runtime.mouthLatchOffsetX;
      const desiredY = finalBite ? finalBite.y + runtime.mouthLatchOffsetY : mouthGoalY + runtime.mouthLatchOffsetY;
      const blocked = runtime.captured === 'player' && this.collides(desiredX, desiredY);
      if (blocked) {
        target.x = runtime.lastSafeX;
        target.y = runtime.lastSafeY;
        this.releaseBurrowBobbit(creature, 'released');
      } else {
        runtime.lastSafeX = target.x;
        runtime.lastSafeY = target.y;
        target.x = desiredX;
        target.y = desiredY;
        const invDelta = 1 / Math.max(0.001, delta);
        target.vx = Phaser.Math.Clamp((target.x - previousTargetX) * invDelta, -160, 160) * 0.38;
        target.vy = Math.max(target.vy, Phaser.Math.Clamp((target.y - previousTargetY) * invDelta, -40, 190) * 0.35);
        this.applyHullDamage((8.5 - struggle * 1.6) * delta, 'Abyssal bobbit is dragging you down.');
        if (runtime.captured === 'player') state.oxygen = Math.max(0, state.oxygen - (2.8 - struggle * 0.55) * delta);
        if (runtime.escapeRemaining <= 0 || runtime.dragTimer <= 0 || target.y >= burrow.anchorY - TILE * 1.4) {
          this.releaseBurrowBobbit(creature, runtime.escapeRemaining <= 0 ? 'released' : 'released');
        } else {
          state.status = `Bobbit dragging downward. Escape ${Math.ceil(runtime.escapeRemaining)}s: hold away, knife the jaws, or stun.`;
        }
      }
    }
  } else if (runtime.phase === 'release') {
    creature.x = Phaser.Math.Linear(creature.x, burrow.x, Math.min(1, delta * 3));
    creature.y = Phaser.Math.Linear(creature.y, burrow.y - TILE * 1.4, Math.min(1, delta * 3));
    creature.attackBlend = Phaser.Math.Linear(creature.attackBlend, 0.25, Math.min(1, delta * 7));
    if (runtime.phaseTimer <= 0) {
      runtime.phase = 'reset';
      runtime.phaseTimer = 1.2;
      burrow.cooldown = 4.8;
    }
  } else if (runtime.phase === 'reset') {
    creature.x = Phaser.Math.Linear(creature.x, burrow.anchorX, Math.min(1, delta * 3.8));
    creature.y = Phaser.Math.Linear(creature.y, burrow.anchorY, Math.min(1, delta * 3.8));
    creature.vx = 0;
    creature.vy = 0;
    creature.attackBlend = Phaser.Math.Linear(creature.attackBlend, 0, Math.min(1, delta * 6));
    creature.swimEffort = 0.32;
    if (runtime.phaseTimer <= 0 || Phaser.Math.Distance.Between(creature.x, creature.y, burrow.anchorX, burrow.anchorY) < 8) {
      runtime.phase = 'burrowed';
      runtime.phaseTimer = 0;
      burrow.triggered = false;
    }
  }

  constrainBurrowBobbitToShaft(creature, burrow);
  updateDetachedArticulatedParts(this, creature, delta);
  this.updateArticulatedParts(creature, delta);
  if (runtime.phase !== 'burrowed' && runtime.phase !== 'reset' && runtime.phase !== 'telegraph') this.keepArticulatedCreatureInWater(creature);
  constrainBurrowBobbitToShaft(creature, burrow);
  this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });
  refreshJointStress(creature);
}

export function steerArticulatedCreature(this: DeepdiveScene, creature: ArticulatedCreature, delta: number) {
  const combat = articulatedCombatFor(creature);
  const dx = this.player.x - creature.x;
  const dy = this.player.y - creature.y;
  const playerDistance = Math.max(1, Math.hypot(dx, dy));
  const homeDistance = Phaser.Math.Distance.Between(creature.x, creature.y, creature.homeX, creature.homeY);
  const canChase = combat.hostile && combat.behavior !== 'passive' && !this.isAtBoat() && playerDistance < combat.detectionRange + state.biome * 24 && homeDistance < combat.leashRange;
  const canBite = Boolean(this.articulatedBitePart(creature));
  const wasAggroed = creature.aggro > 0;

  if (canChase) {
    creature.aggro = Math.max(creature.aggro, 4.5);
    if (!wasAggroed) creature.aggroCue = Math.max(creature.aggroCue, 0.95);
    if (creature.state === 'patrol') creature.state = 'stalk';
  } else {
    creature.aggro = Math.max(0, creature.aggro - delta * 0.7);
    if (creature.aggro <= 0 && creature.state !== 'recover') creature.state = 'patrol';
  }

  if (canBite && creature.aggro > 0 && playerDistance < combat.attackRange && creature.grabCooldown <= 0 && creature.state !== 'lunge' && creature.state !== 'grab') {
    creature.state = 'lunge';
    creature.stateTimer = combat.lungeSeconds;
    creature.grabCooldown = combat.grabCooldown;
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
    speedScale *= combat.lungeSpeedScale;
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
  const maxSpeed = creature.speed * (creature.state === 'lunge' ? Math.max(1.6, combat.lungeSpeedScale + 0.65) : creature.aggro > 0 ? 1.85 : 1.25) * this.articulatedMobilityScale(creature);
  const speed = Math.hypot(creature.vx, creature.vy);
  if (speed > maxSpeed) {
    creature.vx = (creature.vx / speed) * maxSpeed;
    creature.vy = (creature.vy / speed) * maxSpeed;
  }
}

export function keepArticulatedCreatureInWater(this: DeepdiveScene, creature: ArticulatedCreature, options: { passes?: number } = {}) {
  let corrected = false;
  const passes = Phaser.Math.Clamp(Math.floor(options.passes ?? ARTICULATED_TERRAIN_CORRECTION_PASSES), 0, ARTICULATED_TERRAIN_CORRECTION_PASSES);
  for (let pass = 0; pass < passes; pass += 1) {
    const contacts: ReturnType<typeof terrainContactForPart>[] = [];
    for (const part of creature.parts) {
      if (part.detached) continue;
      if (pass === 0) {
        part.terrainContact = 0;
        part.terrainNormalX = 0;
        part.terrainNormalY = 0;
      }
      if (part.hp <= 0) continue;
      const manifest = partManifest(creature, part);
      const contact = terrainContactForPart(this, creature, part, manifest);
      if (!contact) continue;
      part.terrainContact = Math.max(part.terrainContact, Math.min(1, contact.count / 3));
      part.terrainNormalX = contact.nx;
      part.terrainNormalY = contact.ny;
      contacts.push(contact);
    }
    if (!contacts.length) break;
    corrected = true;
    let nx = 0;
    let ny = 0;
    let weightedCount = 0;
    for (const contact of contacts) {
      if (!contact) continue;
      const weight = 1 + contact.count * 0.22;
      nx += contact.nx * weight;
      ny += contact.ny * weight;
      weightedCount += contact.count * weight;
    }
    const len = Math.max(1, Math.hypot(nx, ny));
    nx /= len;
    ny /= len;
    const push = Phaser.Math.Clamp(0.65 + weightedCount / Math.max(1, contacts.length) * 0.24, 0.65, pass === 0 ? 3.2 : 1.7);
    creature.x += nx * push;
    creature.y += ny * push;
    const into = creature.vx * nx + creature.vy * ny;
    if (into < 0) {
      creature.vx -= into * nx * 0.74;
      creature.vy -= into * ny * 0.74;
    } else {
      creature.vx += nx * 1.6;
      creature.vy += ny * 1.6;
    }
    creature.vx *= 0.82;
    creature.vy *= 0.82;
    this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });
  }
  if (!corrected) return false;
  creature.homeX = Phaser.Math.Linear(creature.homeX, creature.x, 0.012);
  creature.homeY = Phaser.Math.Linear(creature.homeY, creature.y, 0.012);
  return true;
}

export function updateArticulatedParts(this: DeepdiveScene, creature: ArticulatedCreature, delta: number, options: { preserveSmoothedPose?: boolean } = {}) {
  const rippleTurning = usesLargeThreatRippleTurning(creature);
  if (rippleTurning) ensureLargeThreatTurnRuntime(creature);
  const speed = Math.hypot(creature.vx, creature.vy);
  const facing = rippleTurning ? 1 : facingFor(creature);
  const visualMirrorSide = rippleTurning ? (creature.turn?.mirrorSide ?? 1) : facingFor(creature);
  const burrowPose = isBurrowBobbit(creature);
  let targetPitch = speed > 3
    ? Phaser.Math.Clamp(Math.atan2(creature.vy, Math.max(1, Math.abs(creature.vx))), -0.62, 0.62) * ARTICULATED_PITCH_SCALE
    : 0;
  if (burrowPose) {
    targetPitch = Phaser.Math.Clamp(creature.vx / Math.max(1, creature.speed * 3.2), -0.18, 0.18);
  }
  const targetAttackBlend = creature.state === 'lunge' || creature.state === 'grab' ? 1 : 0;
  const targetSwimEffort = Phaser.Math.Clamp(
    0.22 + speed / Math.max(1, creature.speed * 1.15) + (creature.state === 'lunge' ? 0.22 : 0),
    0.22,
    creature.state === 'lunge' || creature.state === 'grab' ? 1.28 : 1.05,
  );
  if (options.preserveSmoothedPose) {
    creature.swimEffort = Phaser.Math.Clamp(creature.swimEffort || targetSwimEffort, 0.22, creature.state === 'lunge' || creature.state === 'grab' ? 1.28 : 1.05);
  } else if (delta > 0 && !creature.reviewFrozen) {
    creature.posePitch = smoothAngle(creature.posePitch, targetPitch, 1 - Math.exp(-9 * delta));
    creature.attackBlend = Phaser.Math.Linear(creature.attackBlend, targetAttackBlend, 1 - Math.exp(-12 * delta));
    creature.swimEffort = Phaser.Math.Linear(creature.swimEffort, targetSwimEffort, 1 - Math.exp(-7.5 * delta));
  } else {
    creature.posePitch = targetPitch;
    creature.attackBlend = targetAttackBlend;
    if (!creature.reviewFrozen) creature.swimEffort = targetSwimEffort;
  }
  const swimPitch = creature.posePitch;
  const swimEffort = creature.swimEffort;
  const forward: Vec2 = rippleTurning && !burrowPose && creature.turn
    ? { x: Math.cos(creature.turn.heading), y: Math.sin(creature.turn.heading) }
    : burrowPose
    ? { x: Math.sin(swimPitch), y: -Math.cos(swimPitch) }
    : { x: facing * Math.cos(swimPitch), y: Math.sin(swimPitch) };
  const normal: Vec2 = rippleTurning && !burrowPose && creature.turn
    ? { x: -Math.sin(creature.turn.heading) * visualMirrorSide, y: Math.cos(creature.turn.heading) * visualMirrorSide }
    : burrowPose
    ? { x: facing * Math.cos(swimPitch), y: facing * Math.sin(swimPitch) }
    : { x: -facing * Math.sin(swimPitch), y: Math.cos(swimPitch) };
  const rootRotation = rippleTurning && !burrowPose && creature.turn
    ? creature.turn.heading
    : burrowPose ? Math.atan2(forward.y, forward.x) : facing * swimPitch;
  const lungeOpen = creature.attackBlend;
  const lookupCache = articulatedLookupCacheFor(creature);
  const partById = lookupCache.partById;
  const placed = new Set<string>();
  const placing = new Set<string>();
  const spineMotionCache = new Map<string, { offset: number; bend: number }>();
  const dynamicSpine = delta > 0 && !creature.reviewFrozen && !options.preserveSmoothedPose;
  const manifestById = lookupCache.manifestById;
  const spineManifests = lookupCache.spineManifests;
  const spineLagById = lookupCache.spineLagById;
  const spineLagFor = (manifest: ArticulatedPartManifest) => spineLagById.get(manifest.id) ?? 0;
  const historyDistanceFor = (manifest: ArticulatedPartManifest) => {
    const index = spineManifests.indexOf(manifest);
    if (index < 0) return 0;
    return index * TURN_HISTORY_SAMPLE_SPACING + Math.max(0, -manifest.offset[0]) * PART_WORLD_SCALE * 0.36;
  };
  const historyPoseFor = (manifest: ArticulatedPartManifest) => {
    if (!rippleTurning || manifest.motion.kind !== 'body' && manifest.motion.kind !== 'tail') return null;
    return sampleLargeThreatTurnHistory(creature, historyDistanceFor(manifest));
  };
  const motionLagIndexFor = (manifest: ReturnType<typeof partManifest>) => {
    const direct = spineLagFor(manifest);
    if (direct > 0 || manifest.motion.kind === 'body' || manifest.motion.kind === 'tail') return direct;
    let parent = manifest.parentId ? manifestById.get(manifest.parentId) : undefined;
    while (parent) {
      const parentLag = spineLagFor(parent);
      if (parentLag > 0 || parent.motion.kind === 'body' || parent.motion.kind === 'tail') {
        const attachmentLag = manifest.motion.kind === 'fin' ? 0.68 : manifest.motion.kind === 'jaw' ? 0.34 : 0.18;
        return Phaser.Math.Clamp(parentLag + attachmentLag, 0, 3.2);
      }
      parent = parent.parentId ? manifestById.get(parent.parentId) : undefined;
    }
    return 0;
  };

  const targetWaveFor = (manifest: ReturnType<typeof partManifest>) => {
    const motion = manifest.motion;
    const motionEffort = motion.kind === 'body' || motion.kind === 'tail' || motion.kind === 'fin' ? swimEffort : 1;
    const motionScale = motion.kind === 'tail'
      ? TAIL_SWIM_WAVE_SCALE
      : motion.kind === 'body'
        ? BODY_SWIM_WAVE_SCALE
        : motion.kind === 'fin'
          ? FIN_SWIM_WAVE_SCALE
          : 1;
    const lagIndex = motionLagIndexFor(manifest);
    const swimWave = Math.sin(creature.phase * (motion.frequency ?? 2) + (motion.phase ?? 0) - (motion.lag ?? 0) * lagIndex) * (motion.amplitude ?? 0) * motionEffort * motionScale * PART_WORLD_SCALE;
    if (motion.kind !== 'body' && motion.kind !== 'tail') return swimWave;
    const pitchWake = -swimPitch * Phaser.Math.Clamp(lagIndex, 0, 3.2) * 7.2 * swimEffort;
    const lungeWake = lungeOpen * Math.sin(creature.phase * 2.1 - lagIndex * 0.82) * 4.8 * swimEffort;
    return swimWave + pitchWake + lungeWake;
  };

  const prepareSpineDynamics = () => {
    const targets = spineManifests.map((manifest) => {
      const localX = manifest.offset[0] * PART_WORLD_SCALE;
      const localY = manifest.offset[1] * PART_WORLD_SCALE;
      const lagIndex = spineLagFor(manifest);
      const historyPose = historyPoseFor(manifest);
      const poseForward: Vec2 = historyPose
        ? { x: Math.cos(historyPose.rotation), y: Math.sin(historyPose.rotation) }
        : forward;
      const poseNormal: Vec2 = historyPose
        ? { x: -Math.sin(historyPose.rotation) * historyPose.mirrorSide, y: Math.cos(historyPose.rotation) * historyPose.mirrorSide }
        : normal;
      const baseX = historyPose ? historyPose.x + poseNormal.x * localY : creature.x + poseForward.x * localX + poseNormal.x * localY;
      const baseY = historyPose ? historyPose.y + poseNormal.y * localY : creature.y + poseForward.y * localX + poseNormal.y * localY;
      const targetOffset = targetWaveFor(manifest);
      const targetX = baseX + poseNormal.x * targetOffset;
      const targetY = baseY + poseNormal.y * targetOffset;
      const targetBend = targetOffset * 0.012 + -swimPitch * Phaser.Math.Clamp(lagIndex * 0.09, 0, 0.24);
      const node = spineNodeFor(creature, manifest);
      return { manifest, node, lagIndex, baseX, baseY, targetX, targetY, targetOffset, targetBend };
    });

    for (const target of targets) {
      const { node, lagIndex, targetX, targetY, targetOffset, targetBend } = target;
      node.constraintError = 0;
      if (!node.initialized || creature.reviewFrozen || (delta <= 0 && !options.preserveSmoothedPose)) {
        node.x = targetX;
        node.y = targetY;
        node.vx = 0;
        node.vy = 0;
        node.offset = targetOffset;
        node.bend = targetBend;
        node.initialized = true;
        continue;
      }
      if (dynamicSpine) {
        const spring = 58 / (1 + lagIndex * 0.28);
        node.vx += (targetX - node.x) * spring * delta;
        node.vy += (targetY - node.y) * spring * delta;
        const damping = Math.exp(-(8.2 / (1 + lagIndex * 0.2)) * delta);
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx * delta;
        node.y += node.vy * delta;
      }
    }

    if (dynamicSpine) {
      for (let iteration = 0; iteration < 3; iteration += 1) {
        for (let i = 1; i < targets.length; i += 1) {
          const parent = targets[i - 1];
          const child = targets[i];
          const restDistance = Math.max(10, Math.hypot(child.targetX - parent.targetX, child.targetY - parent.targetY));
          const dx = child.node.x - parent.node.x;
          const dy = child.node.y - parent.node.y;
          const distance = Math.max(0.001, Math.hypot(dx, dy));
          const correction = (distance - restDistance) / distance;
          const parentWeight = parent.manifest.parentId ? 0.28 : 0;
          const childWeight = 1 - parentWeight;
          if (parentWeight > 0) {
            parent.node.x += dx * correction * parentWeight;
            parent.node.y += dy * correction * parentWeight;
          }
          child.node.x -= dx * correction * childWeight;
          child.node.y -= dy * correction * childWeight;
          const error = Math.abs(distance - restDistance) / restDistance;
          parent.node.constraintError = Math.max(parent.node.constraintError, error);
          child.node.constraintError = Math.max(child.node.constraintError, error);
        }
      }
    }

    const forwardAngle = Math.atan2(forward.y, forward.x);
    targets.forEach((target, index) => {
      const { manifest, node, baseX, baseY, targetBend } = target;
      const offset = (node.x - baseX) * normal.x + (node.y - baseY) * normal.y;
      const maxOffset = Math.max(8, Math.min(24, manifest.hitRadius * PART_WORLD_SCALE * 0.92));
      node.offset = Phaser.Math.Clamp(offset, -maxOffset, maxOffset);
      const neighbor = targets[index - 1] ?? targets[index + 1];
      if (dynamicSpine && neighbor) {
        const dx = targets[index - 1] ? node.x - neighbor.node.x : neighbor.node.x - node.x;
        const dy = targets[index - 1] ? node.y - neighbor.node.y : neighbor.node.y - node.y;
        const tangentBend = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - forwardAngle) * facing;
        node.bend = Phaser.Math.Clamp(tangentBend * 0.55 + node.offset * 0.005, -0.42, 0.42);
      } else {
        node.bend = targetBend;
      }
      spineMotionCache.set(manifest.id, { offset: node.offset, bend: node.bend });
    });
  };

  prepareSpineDynamics();

  const spineMotionFor = (manifest: ReturnType<typeof partManifest>) => {
    const motion = manifest.motion;
    if (motion.kind !== 'body' && motion.kind !== 'tail') return { offset: 0, bend: 0 };
    return spineMotionCache.get(manifest.id) ?? { offset: 0, bend: 0 };
  };

  const softRotationFor = (part: ArticulatedPartState, manifest: ReturnType<typeof partManifest>, targetRotation: number) => {
    if (manifest.motion.kind !== 'fin' && manifest.motion.kind !== 'jaw') {
      part.softRotation = targetRotation;
      part.softAngularVelocity = 0;
      part.softInitialized = true;
      return targetRotation;
    }
    if (!part.softInitialized) {
      part.softRotation = targetRotation;
      part.softAngularVelocity = 0;
      part.softInitialized = true;
    }
    const dynamicSoftMotion = delta > 0 && !creature.reviewFrozen && !options.preserveSmoothedPose;
    if (!dynamicSoftMotion) {
      part.softRotation = targetRotation;
      part.softAngularVelocity = 0;
      return targetRotation;
    }
    const stiffness = manifest.motion.kind === 'jaw' ? 48 : 32;
    const damping = manifest.motion.kind === 'jaw' ? 12 : 8.5;
    const error = Phaser.Math.Angle.Wrap(targetRotation - part.softRotation);
    part.softAngularVelocity += error * stiffness * delta;
    part.softAngularVelocity *= Math.exp(-damping * delta);
    part.softRotation = Phaser.Math.Angle.Wrap(part.softRotation + part.softAngularVelocity * delta);
    return part.softRotation;
  };

  const motionRotation = (manifest: ReturnType<typeof partManifest>, parent?: ArticulatedPartState) => {
    const motion = manifest.motion;
    const spineMotion = spineMotionFor(manifest);
    const wave = motion.kind === 'body' || motion.kind === 'tail' ? spineMotion.offset : targetWaveFor(manifest);
    const parentRotation = parent?.rotation ?? rootRotation;
    const rotationOffset = facing * (manifest.rotationOffset ?? 0);
    if (motion.kind === 'jaw') {
      if (manifest.id === 'upper-mandible' || manifest.id === 'lower-mandible') {
        const jawSign = manifest.id === 'upper-mandible' ? -1 : 1;
        const close = creature.state === 'grab'
          ? 1
          : Phaser.Math.Clamp(lungeOpen, 0, 1);
        const openAngle = 0.82;
        const closedAngle = -0.24;
        const angle = openAngle + (closedAngle - openAngle) * close;
        return parentRotation + rotationOffset + facing * jawSign * angle;
      }
      const jawOpenScale = Phaser.Math.Clamp((motion.amplitude ?? 21) / 21, 0.35, 1.25);
      const jawPulse = Math.sin(creature.phase * (motion.frequency ?? 8) + (motion.phase ?? 0) - (motion.lag ?? 0) * 0.6);
      return parentRotation + rotationOffset + facing * ((jawPulse * 0.08 + lungeOpen * 0.44) * jawOpenScale * Math.sign(manifest.offset[1] || 1));
    }
    if (motion.kind === 'fin') {
      return parentRotation + rotationOffset + facing * wave * 0.018;
    }
    if (motion.kind === 'body' || motion.kind === 'tail') {
      const localBend = facing * spineMotion.bend;
      return parent
        ? parentRotation * 0.9 + rootRotation * 0.1 + localBend + rotationOffset
        : rootRotation + localBend + rotationOffset;
    }
    if (parent && manifest.inheritRotation !== false) {
      return parentRotation * 0.88 + rootRotation * 0.12 + rotationOffset;
    }
    return rootRotation + rotationOffset;
  };

  const placeOffsetPart = (part: ArticulatedPartState, manifest: ReturnType<typeof partManifest>) => {
    const motion = manifest.motion;
    const localX = manifest.offset[0] * PART_WORLD_SCALE;
    const localY = manifest.offset[1] * PART_WORLD_SCALE;
    const historyPose = historyPoseFor(manifest);
    const poseForward: Vec2 = historyPose
      ? { x: Math.cos(historyPose.rotation), y: Math.sin(historyPose.rotation) }
      : forward;
    const poseNormal: Vec2 = historyPose
      ? { x: -Math.sin(historyPose.rotation) * historyPose.mirrorSide, y: Math.cos(historyPose.rotation) * historyPose.mirrorSide }
      : normal;
    const poseRotation = historyPose?.rotation ?? rootRotation;
    const poseMirrorSide = historyPose?.mirrorSide ?? visualMirrorSide;
    const spineMotion = spineMotionFor(manifest);
    const wave = motion.kind === 'body' || motion.kind === 'tail' ? spineMotion.offset : targetWaveFor(manifest);
    const bodyWave = motion.kind === 'body' || motion.kind === 'tail' ? wave : 0;
    const finWave = motion.kind === 'fin' ? wave : 0;
    const jawOpenScale = motion.kind === 'jaw' ? Phaser.Math.Clamp((motion.amplitude ?? 21) / 21, 0.35, 1.25) : 1;
    const jawPulse = motion.kind === 'jaw'
      ? Math.sin(creature.phase * (motion.frequency ?? 8) + (motion.phase ?? 0) - (motion.lag ?? 0) * 0.6)
      : 0;
    const jawSign = manifest.id === 'upper-mandible' ? -1 : manifest.id === 'lower-mandible' ? 1 : Math.sign(localY || 1);
    const mandibleClose = manifest.id === 'upper-mandible' || manifest.id === 'lower-mandible'
      ? creature.state === 'grab'
        ? 1
        : Phaser.Math.Clamp(lungeOpen, 0, 1)
      : 0;
    const mandibleOpenAngle = 0.82;
    const mandibleClosedAngle = -0.24;
    const mandibleJawAngle = mandibleOpenAngle + (mandibleClosedAngle - mandibleOpenAngle) * mandibleClose;
    const jawOpen = motion.kind === 'jaw'
      ? manifest.id === 'upper-mandible' || manifest.id === 'lower-mandible'
        ? mandibleJawAngle * jawSign
        : (jawPulse * 0.16 + lungeOpen * 0.42) * jawOpenScale * jawSign
      : 0;
    part.x = (historyPose?.x ?? creature.x + poseForward.x * localX) + poseNormal.x * (localY + bodyWave);
    part.y = (historyPose?.y ?? creature.y + poseForward.y * localX) + poseNormal.y * (localY + bodyWave);
    part.rotation = poseRotation + poseMirrorSide * (bodyWave * 0.012 + finWave * 0.018 + jawOpen);
  };

  const placePart = (part: ArticulatedPartState): void => {
    if (placed.has(part.id)) return;
    if (part.detached) {
      placed.add(part.id);
      return;
    }
    const manifest = partManifest(creature, part);
    const parent = manifest.parentId ? partById.get(manifest.parentId) : undefined;
    if (placing.has(part.id)) {
      placeOffsetPart(part, manifest);
      placed.add(part.id);
      return;
    }
    placing.add(part.id);
    const historyPose = historyPoseFor(manifest);
    if (historyPose) {
      placeOffsetPart(part, manifest);
      part.rotation = softRotationFor(part, manifest, part.rotation);
    } else if (parent) {
      placePart(parent);
      const parentManifest = partManifest(creature, parent);
      part.rotation = softRotationFor(part, manifest, motionRotation(manifest, parent));
      const parentAnchor = anchorWorldFor(parent, parentManifest, facing, anchorFor(parentManifest, manifest.parentAnchor));
      const spineMotion = spineMotionFor(manifest);
      if (manifest.motion.kind === 'body' || manifest.motion.kind === 'tail') {
        const node = spineNodeFor(creature, manifest);
        node.offset = spineMotion.offset;
        node.bend = spineMotion.bend;
      }
      const restOffset = restOffsetFor(creature, manifest, facing, parent.rotation);
      const childAnchorOffset = anchoredOffsetFor(manifest, facing, part.rotation, anchorFor(manifest, manifest.anchor));
      part.x = parentAnchor.x + restOffset.x - childAnchorOffset.x;
      part.y = parentAnchor.y + restOffset.y - childAnchorOffset.y;
    } else {
      placeOffsetPart(part, manifest);
      part.rotation = softRotationFor(part, manifest, part.rotation);
    }
    placing.delete(part.id);
    placed.add(part.id);
  };

  creature.parts.forEach((part) => {
    placePart(part);
  });

  creature.socketOverlays.forEach((overlay) => {
    const manifest = overlayManifestById(creature, overlay);
    const parent = manifest ? partById.get(manifest.parentId) : undefined;
    const child = manifest ? partById.get(manifest.childId) : undefined;
    const parentManifest = parent ? partManifest(creature, parent) : undefined;
    const childManifest = child ? partManifest(creature, child) : undefined;
    if (!manifest || !parent || !child || !parentManifest || !childManifest || parent.detached) {
      overlay.span = 0;
      overlay.parentAnchorX = overlay.x;
      overlay.parentAnchorY = overlay.y;
      overlay.childAnchorX = overlay.x;
      overlay.childAnchorY = overlay.y;
      overlay.bridgeWidth = 0;
      overlay.bridgeCoverage = 0;
      overlay.parentCoverage = 0;
      overlay.childCoverage = 0;
      return;
    }
    const childJointManifest = creature.manifest.parts.find((candidate) => candidate.id === manifest.childId);
    const parentAnchorName = childJointManifest?.parentAnchor;
    const childAnchorName = childJointManifest?.anchor;
    const parentAnchor = anchorWorldFor(parent, parentManifest, facing, anchorFor(parentManifest, parentAnchorName));
    if (child.detached) {
      const stumpOffset = localVectorOffsetFor(facing, parent.rotation, manifest.offset);
      const baseWidth = manifest.size[0] * PART_WORLD_SCALE;
      const baseHeight = manifest.size[1] * PART_WORLD_SCALE;
      overlay.x = parentAnchor.x + stumpOffset.x;
      overlay.y = parentAnchor.y + stumpOffset.y;
      overlay.rotation = parent.rotation + facing * (manifest.rotationOffset ?? 0);
      overlay.width = baseWidth;
      overlay.height = baseHeight;
      overlay.span = 0;
      overlay.parentAnchorX = parentAnchor.x;
      overlay.parentAnchorY = parentAnchor.y;
      overlay.childAnchorX = parentAnchor.x;
      overlay.childAnchorY = parentAnchor.y;
      overlay.bridgeWidth = 0;
      overlay.bridgeCoverage = 0;
      overlay.parentCoverage = 1;
      overlay.childCoverage = 0;
      return;
    }
    const childAnchor = anchorWorldFor(child, childManifest, facing, anchorFor(childManifest, childAnchorName));
    const dx = childAnchor.x - parentAnchor.x;
    const dy = childAnchor.y - parentAnchor.y;
    const span = Math.max(1, Math.hypot(dx, dy));
    const tangentX = dx / span;
    const tangentY = dy / span;
    const normalX = -dy / span;
    const normalY = dx / span;
    const along = manifest.offset[0] * PART_WORLD_SCALE;
    const across = manifest.offset[1] * PART_WORLD_SCALE;
    overlay.x = (parentAnchor.x + childAnchor.x) * 0.5 + tangentX * along + normalX * across;
    overlay.y = (parentAnchor.y + childAnchor.y) * 0.5 + tangentY * along + normalY * across;
    overlay.rotation = Math.atan2(dy, dx) + facing * (manifest.rotationOffset ?? 0);
    const baseWidth = manifest.size[0] * PART_WORLD_SCALE;
    const baseHeight = manifest.size[1] * PART_WORLD_SCALE;
    overlay.width = Math.min(Math.max(baseWidth, span + baseWidth * 0.12), baseWidth * 1.32);
    overlay.height = baseHeight;
    overlay.span = span;
    overlay.parentAnchorX = parentAnchor.x;
    overlay.parentAnchorY = parentAnchor.y;
    overlay.childAnchorX = childAnchor.x;
    overlay.childAnchorY = childAnchor.y;
    overlay.bridgeWidth = Phaser.Math.Clamp(
      baseHeight * 0.62 * socketStyleValue(creature, manifest, 'bridgeWidthScale', 1),
      4,
      Math.max(
        6,
        span * 0.68 * socketStyleValue(creature, manifest, 'bridgeWidthScale', 1),
        baseHeight * socketStyleValue(creature, manifest, 'bridgeSleeveScale', 0),
      ),
    );
    overlay.bridgeCoverage = overlay.bridgeWidth > 0 ? 1 : 0;
    overlay.parentCoverage = overlay.bridgeCoverage;
    overlay.childCoverage = overlay.bridgeCoverage;
  });
}

export function resolveArticulatedGrab(this: DeepdiveScene, creature: ArticulatedCreature, delta: number, controls?: ControlState) {
  if (creature.state !== 'grab') return;
  const combat = articulatedCombatFor(creature);
  creature.grabTimer = Math.max(0, creature.grabTimer - delta);
  const struggle = controls?.hasMove ? controls.move.length() : 0;
  const target = state.pilotingSub && state.activeSub ? state.activeSub : this.player;
  const biteAnchor = this.articulatedBiteAnchorWorld(creature);
  const pullX = biteAnchor?.x ?? creature.x;
  const pullY = biteAnchor?.y ?? creature.y;
  const dx = pullX - target.x;
  const dy = pullY - target.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  target.vx += (dx / distance) * (58 - struggle * 16) * delta;
  target.vy += (dy / distance) * (58 - struggle * 16) * delta;
  this.applyHullDamage((9.2 - struggle * 2.6) * delta, `${creature.species} is dragging you in. Hold away and use the knife or stun.`);
  state.oxygen = Math.max(0, state.oxygen - (2.4 - struggle * 0.7) * delta);
  if (!combat.grabEnabled || creature.grabTimer <= 0 || struggle > 0.82) {
    creature.state = 'recover';
    creature.stateTimer = 1.1;
    state.status = struggle > 0.82 ? `You wrenched free of ${creature.species}.` : `${creature.species} released its grip.`;
    this.spawnFloatingText('Released', 0x8ee7f4);
  }
}

export function bumpArticulatedCreature(this: DeepdiveScene, creature: ArticulatedCreature, part: ArticulatedPartState, distance: number) {
  if (!this.isDangerousArticulatedPart(creature, part)) return;
  const combat = articulatedCombatFor(creature);
  const bitePart = this.articulatedBitePart(creature);
  const biteAnchor = bitePart && part.id === bitePart.id ? this.articulatedBiteAnchorWorld(creature) : null;
  const contactX = biteAnchor?.x ?? part.x;
  const contactY = biteAnchor?.y ?? part.y;
  const contactDistance = Math.max(1, Phaser.Math.Distance.Between(this.player.x, this.player.y, contactX, contactY), distance);
  const nx = (this.player.x - contactX) / contactDistance;
  const ny = (this.player.y - contactY) / contactDistance;
  const impact = Math.hypot(this.player.vx, this.player.vy);
  const strike = creature.state === 'lunge' ? 1.45 : creature.state === 'grab' ? 1.2 : 1;
  const damage = Math.round((12 + state.biome * 2.6 + creature.radius * 0.18 + impact * 0.012) * strike * (combat.damageMultiplier ?? 1));
  const target = state.pilotingSub && state.activeSub ? state.activeSub : this.player;
  target.vx += nx * 88 * strike;
  target.vy += ny * 88 * strike;
  creature.vx -= nx * 38;
  creature.vy -= ny * 38;
  const creatureSpeed = Math.max(1, Math.hypot(creature.vx, creature.vy));
  const maxCreatureSpeed = creature.speed * (creature.state === 'lunge' ? 1.7 : 1.15);
  if (creatureSpeed > maxCreatureSpeed) {
    creature.vx = (creature.vx / creatureSpeed) * maxCreatureSpeed;
    creature.vy = (creature.vy / creatureSpeed) * maxCreatureSpeed;
  }
  creature.bumpCooldown = creature.state === 'lunge' ? 1.55 : 1.9;
  creature.scan = Math.max(0, creature.scan - 0.2);
  this.applyHullDamage(Math.max(5, damage - state.upgrades.suit), `${creature.species} hit ${part.id.replace(/-/g, ' ')} first.`);
  creature.aggroCue = Math.max(creature.aggroCue, 1);
  this.registerPredatorBite(creature);
  this.playFishBite(damage);
  if (combat.grabEnabled && creature.state === 'lunge' && creature.grabTimer <= 0 && !part.detached) {
    creature.state = 'grab';
    creature.grabTimer = combat.grabSeconds;
    state.status = `${creature.species} has you. Hold away, knife the head, or stun to break free.`;
    this.spawnFloatingText('Break free', 0xff4f64);
  }
  renderHud();
}

export function closestArticulatedPartTo(this: DeepdiveScene, creature: ArticulatedCreature, x: number, y: number) {
  let nearest: { part: ArticulatedPartState; distance: number; signedDistance: number; hitShape: ReturnType<typeof articulatedPartHitShape> } | null = null;
  for (const part of creature.parts) {
    if (part.hp <= 0 || part.detached) continue;
    const hit = articulatedPartHitDistanceTo(creature, part, x, y);
    if (!nearest || hit.signedDistance < nearest.signedDistance) {
      nearest = { part, distance: hit.distance, signedDistance: hit.signedDistance, hitShape: hit.shape };
    }
  }
  return nearest;
}

export function nearestArticulatedDamageTarget(this: DeepdiveScene, x: number, y: number, extraRange: number) {
  let nearest: { creature: ArticulatedCreature; part: ArticulatedPartState; distance: number } | null = null;
  for (const creature of this.articulatedCreatures) {
    if (creature.dead) continue;
    const hit = this.closestArticulatedPartTo(creature, x, y);
    if (!hit) continue;
    if (hit.distance > extraRange) continue;
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
  const anatomy = anatomyFor(manifest);
  const damage = amount * manifest.damageMultiplier;
  part.hp = Math.max(0, part.hp - damage);
  part.hurtFlash = 1;
  creature.hp = Math.max(0, creature.hp - damage * (part.id === 'head' ? 0.92 : 0.62));
  creature.hurtFlash = 1;
  const wasAggroed = creature.aggro > 0;
  const dx = part.x - creature.x;
  const dy = part.y - creature.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const impact = Phaser.Math.Clamp((10 + damage * 0.16) / Math.sqrt(Phaser.Math.Clamp(anatomy.mass, 0.25, 8)), 8, 92);
  creature.vx -= (dx / distance) * impact;
  creature.vy -= (dy / distance) * impact * 0.72;
  if (manifest.motion.kind === 'body' || manifest.motion.kind === 'tail') {
    const node = spineNodeFor(creature, manifest);
    node.offset += Phaser.Math.Clamp((dy / distance) * impact * 0.18, -14, 14);
    node.vx -= (dx / distance) * impact * 0.08;
    node.vy -= (dy / distance) * impact * 0.08;
  }
  creature.aggro = Math.max(creature.aggro, 5.5);
  if (!wasAggroed) creature.aggroCue = Math.max(creature.aggroCue, 0.95);
  creature.state = creature.state === 'patrol' ? 'stalk' : creature.state;
  let detached = false;
  if (part.hp <= 0) {
    this.spawnFloatingText(`${part.id.replace(/-/g, ' ')} crippled`, 0xffd166);
    if (!anatomy.severable || damage >= part.maxHp * anatomy.breakThreshold) {
      detached = this.detachArticulatedPart(creature, part, source);
    }
    if (part.id === 'head') creature.hp = 0;
  }
  if (creature.hp > 0) {
    if (!detached) state.status = `${source} hit ${creature.species}'s ${part.id.replace(/-/g, ' ')}.`;
    return true;
  }
  creature.dead = true;
  creature.scanning = false;
  creature.scan = 0;
  if (creature.bobbitBurrow?.captured) this.releaseBurrowBobbit(creature, 'killed');
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
    if (hit.distance > radius) continue;
    const falloff = Phaser.Math.Clamp(1 - hit.distance / Math.max(1, radius), 0.3, 1);
    const largeThreatBlastMultiplier = source === 'Dynamite' ? largeThreatDynamiteDamageMultiplier(creature) : 1;
    this.damageArticulatedPart(creature, hit.part, amount * falloff * largeThreatBlastMultiplier, source);
    hits += 1;
  }
  return hits;
}

export function articulatedMobilityScale(this: DeepdiveScene, creature: ArticulatedCreature) {
  let scale = 1;
  for (const part of creature.parts) {
    if (part.hp > 0 && !part.detached) continue;
    const anatomy = anatomyFor(partManifest(creature, part));
    scale *= Phaser.Math.Clamp(anatomy.mobilityFactor ?? 1, 0.2, 1);
  }
  return Phaser.Math.Clamp(scale, 0.18, 1);
}

export function drawArticulatedCreatures(this: DeepdiveScene, camera: Phaser.Cameras.Scene2D.Camera) {
  for (const creature of this.articulatedCreatures) {
    if (creature.dead) {
      creature.parts.forEach((part) => part.sprite?.setVisible(false));
      creature.socketOverlays.forEach((overlay) => overlay.sprite?.setVisible(false));
      continue;
    }
    const alpha = this.articulatedVisibilityAlpha(creature, camera);
    if (alpha <= 0) {
      creature.parts.forEach((part) => part.sprite?.setVisible(false));
      creature.socketOverlays.forEach((overlay) => overlay.sprite?.setVisible(false));
      continue;
    }
    const attacking = creature.state === 'lunge' || creature.state === 'grab';
    const murkTint = murkTintFor(creature);
    const rippleTurning = usesLargeThreatRippleTurning(creature);
    const spineManifests = rippleTurning
      ? creature.manifest.parts
        .filter((manifest) => manifest.motion.kind === 'body' || manifest.motion.kind === 'tail')
        .sort((a, b) => b.offset[0] - a.offset[0])
      : [];
    const partMirrorSide = (partId: string): 1 | -1 => {
      if (!rippleTurning) return 1;
      let manifest = creature.manifest.parts.find((candidate) => candidate.id === partId);
      if (!manifest || manifest.id === 'head' || manifest.motion.kind === 'root') return creature.turn?.mirrorSide ?? 1;
      while (manifest && manifest.motion.kind !== 'body' && manifest.motion.kind !== 'tail') {
        manifest = manifest.parentId ? creature.manifest.parts.find((candidate) => candidate.id === manifest?.parentId) : undefined;
      }
      const sample = manifest ? sampleLargeThreatTurnHistory(creature, historyDistanceForPart(creature, manifest, spineManifests)) : null;
      return sample?.mirrorSide ?? creature.turn?.mirrorSide ?? 1;
    };
    for (const overlay of creature.socketOverlays) {
      const manifest = overlayManifestById(creature, overlay);
      const parent = manifest ? creature.parts.find((part) => part.id === manifest.parentId) : undefined;
      const child = manifest ? creature.parts.find((part) => part.id === manifest.childId) : undefined;
      if (!manifest || !parent || !child || parent.detached || child.detached || overlay.bridgeWidth <= 0) continue;
      const bridgeAlpha = alpha * (creature.stunned > 0
        ? socketStyleValue(creature, manifest, 'bridgeStunnedAlpha', 0.18)
        : socketStyleValue(creature, manifest, 'bridgeAlpha', 0.32));
      const coreAlpha = alpha * (creature.stunned > 0
        ? socketStyleValue(creature, manifest, 'bridgeCoreStunnedAlpha', 0.09)
        : socketStyleValue(creature, manifest, 'bridgeCoreAlpha', 0.16));
      const bridgeColor = socketStyleValue(creature, manifest, 'bridgeColor', 0x02060c);
      const bridgeCoreColor = socketStyleValue(creature, manifest, 'bridgeCoreColor', creature.color);
      this.articulatedBridges.lineStyle(overlay.bridgeWidth * 0.96, bridgeColor, bridgeAlpha);
      this.articulatedBridges.lineBetween(overlay.parentAnchorX, overlay.parentAnchorY, overlay.childAnchorX, overlay.childAnchorY);
      this.articulatedBridges.fillStyle(bridgeColor, bridgeAlpha);
      this.articulatedBridges.fillCircle(overlay.parentAnchorX, overlay.parentAnchorY, overlay.bridgeWidth * 0.46);
      this.articulatedBridges.fillCircle(overlay.childAnchorX, overlay.childAnchorY, overlay.bridgeWidth * 0.46);
      this.articulatedBridges.lineStyle(Math.max(2, overlay.bridgeWidth * 0.38), bridgeCoreColor, coreAlpha);
      this.articulatedBridges.lineBetween(overlay.parentAnchorX, overlay.parentAnchorY, overlay.childAnchorX, overlay.childAnchorY);
    }
    for (const part of creature.parts) {
      const manifest = partManifest(creature, part);
      const damageAlpha = part.detached ? 0.62 : part.hp <= 0 ? (manifest.damagedTextureKey ? 0.94 : 0.26) : 1;
      const dynamicDepth =
        2.1 +
        manifest.depth +
        (part.id === 'jaw' ? creature.attackBlend * 0.035 : 0) +
        (part.id === 'fin-front' ? 0.018 : part.id === 'fin-back' ? -0.012 : 0) -
        (part.detached ? 0.08 : 0);
      const textureKey = part.detached && manifest.detachedTextureKey
        ? manifest.detachedTextureKey
        : part.hp <= 0 && manifest.damagedTextureKey
          ? manifest.damagedTextureKey
          : manifest.textureKey;
      part.sprite
        ?.setTexture(textureKey)
        .setVisible(true)
        .setPosition(part.x, part.y)
        .setOrigin(manifest.origin[0], manifest.origin[1])
        .setRotation(part.rotation)
        .setAlpha((creature.stunned > 0 ? alpha * 0.68 : alpha) * damageAlpha)
        .setDisplaySize(manifest.size[0] * PART_WORLD_SCALE, manifest.size[1] * PART_WORLD_SCALE)
        .setDepth(dynamicDepth);
      if (part.sprite) {
        part.sprite.scaleX = Math.abs(part.sprite.scaleX) * (rippleTurning ? 1 : creature.facingSign < 0 ? -1 : 1);
        part.sprite.scaleY = Math.abs(part.sprite.scaleY) * partMirrorSide(part.id);
        if (murkTint === undefined) part.sprite.clearTint();
        else part.sprite.setTint(murkTint);
      }
      if (part.hurtFlash > 0) {
        this.actors.lineStyle(2, 0xfff7df, part.hurtFlash * alpha);
        this.actors.strokeCircle(part.x, part.y, manifest.hitRadius * PART_WORLD_SCALE + 4);
      }
    }
    for (const overlay of creature.socketOverlays) {
      const manifest = overlayManifestById(creature, overlay);
      const parent = manifest ? creature.parts.find((part) => part.id === manifest.parentId) : undefined;
      const child = manifest ? creature.parts.find((part) => part.id === manifest.childId) : undefined;
      const severed = Boolean(manifest?.severedTextureKey && parent && child?.detached && !parent.detached);
      if (!manifest || !parent || !child || parent.detached || (child.detached && !severed)) {
        overlay.sprite?.setVisible(false);
        continue;
      }
      const textureKey = severed && manifest.severedTextureKey ? manifest.severedTextureKey : manifest.textureKey;
      overlay.sprite
        ?.setTexture(textureKey)
        .setVisible(true)
        .setPosition(overlay.x, overlay.y)
        .setOrigin(manifest.origin[0], manifest.origin[1])
        .setRotation(overlay.rotation)
        .setAlpha(alpha * (severed ? Math.min(1, socketStyleValue(creature, manifest, 'alpha', 0.82) + 0.12) : socketStyleValue(creature, manifest, 'alpha', 0.82)))
        .setDisplaySize(
          overlay.width || manifest.size[0] * PART_WORLD_SCALE,
          overlay.height || manifest.size[1] * PART_WORLD_SCALE,
        )
        .setDepth(2.1 + manifest.depth);
      if (overlay.sprite) {
        overlay.sprite.scaleX = Math.abs(overlay.sprite.scaleX) * (rippleTurning ? 1 : creature.facingSign < 0 ? -1 : 1);
        overlay.sprite.scaleY = Math.abs(overlay.sprite.scaleY) * partMirrorSide(manifest.parentId);
        if (murkTint === undefined) overlay.sprite.clearTint();
        else overlay.sprite.setTint(murkTint);
      }
    }
    if (creature.stunned > 0) {
      this.actors.lineStyle(2, 0x8ee7f4, alpha * (0.38 + Math.sin(creature.phase * 9) * 0.16));
      this.actors.strokeCircle(creature.x, creature.y, creature.radius + 12);
    }
    const darknessTellAlpha = articulatedDarknessTellAlpha(this, creature, camera);
    if (darknessTellAlpha > 0) {
      drawArticulatedDarknessTell(this, creature, darknessTellAlpha);
    }
    if (creature.aggroCue > 0) {
      const cue = Phaser.Math.Clamp(creature.aggroCue, 0, 1);
      this.actors.lineStyle(2, 0xff4f64, alpha * cue * 0.58);
      this.actors.strokeCircle(creature.x, creature.y, creature.radius + 16 + (1 - cue) * 18);
    }
    if (attacking) {
      const bitePart = this.articulatedBitePart(creature);
      if (bitePart) {
        const biteAnchor = this.articulatedBiteAnchorWorld(creature) ?? bitePart;
        const pulse = 0.65 + Math.sin(creature.phase * 12) * 0.25;
        this.actors.lineStyle(2, 0xff4f64, alpha * pulse * 0.48);
        this.actors.strokeCircle(biteAnchor.x, biteAnchor.y, 8 + creature.attackBlend * 5);
        this.actors.lineStyle(1, 0xffb0bd, alpha * pulse * 0.32);
        this.actors.lineBetween(
          biteAnchor.x - creature.facingSign * 12,
          biteAnchor.y - 3,
          biteAnchor.x + creature.facingSign * 11,
          biteAnchor.y + 2,
        );
      }
    }
    if (creature.scan > 0 && !creature.scanned) {
      this.actors.lineStyle(3, 0xb9f27c, 0.35 + creature.scan * 0.5);
      this.actors.beginPath();
      this.actors.arc(creature.x, creature.y, creature.radius + 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * creature.scan);
      this.actors.strokePath();
    }
    if (creature.scanPulse > 0) {
      this.actors.lineStyle(2, rarityColor(creature.manifest.rarity), creature.scanPulse * 0.38);
      this.actors.strokeCircle(creature.x, creature.y, creature.radius * 0.72 + 8 + (1 - creature.scanPulse) * 12);
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

function articulatedDarknessTellAlpha(scene: DeepdiveScene, creature: ArticulatedCreature, camera: Phaser.Cameras.Scene2D.Camera) {
  if (state.biome < 2 || state.depth < 180 || creature.scanned || creature.dead) return 0;
  const view = camera.worldView;
  if (creature.x < view.x - 120 || creature.x > view.right + 120 || creature.y < view.y - 120 || creature.y > view.bottom + 120) return 0;
  const darkness = darknessAtDepth();
  if (darkness < 0.24) return 0;
  const distance = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, creature.x, creature.y);
  const minRange = lightRadius() * 0.92;
  const maxRange = minRange + 360;
  if (distance < minRange || distance > maxRange) return 0;
  const rangeFade = 1 - Phaser.Math.Clamp((distance - minRange) / (maxRange - minRange), 0, 1);
  const danger = creature.hostile || creature.radius >= 42 || creature.manifest.combat?.behavior === 'ambusher' ? 1 : 0.62;
  return Phaser.Math.Clamp((0.08 + darkness * 0.12) * rangeFade * danger, 0, 0.2);
}

function drawArticulatedDarknessTell(scene: DeepdiveScene, creature: ArticulatedCreature, alpha: number) {
  const color = state.biome === 2 ? 0xffb06a : state.biome === 3 ? 0xb49cff : 0xa8d6ff;
  const dangerousPart = scene.articulatedBitePart(creature)
    ?? creature.parts.find((part) => scene.isDangerousArticulatedPart(creature, part) && !part.detached && part.hp > 0)
    ?? creature.parts.find((part) => !part.detached && part.hp > 0);
  const pulse = 0.65 + Math.sin(creature.phase * 5.5) * 0.22;
  if (dangerousPart) {
    scene.actors.lineStyle(1, color, alpha * pulse);
    scene.actors.strokeEllipse(dangerousPart.x, dangerousPart.y, creature.radius * 0.62, Math.max(6, creature.radius * 0.18));
    scene.actors.fillStyle(color, alpha * 0.42 * pulse);
    scene.actors.fillCircle(
      dangerousPart.x + creature.facingSign * Math.max(8, creature.radius * 0.18),
      dangerousPart.y - Math.max(2, creature.radius * 0.06),
      Math.max(1.4, creature.radius * 0.035),
    );
  }
  if (Math.hypot(creature.vx, creature.vy) > 16 || creature.state === 'lunge' || creature.state === 'grab') {
    const wakeX = creature.x - creature.facingSign * creature.radius * 0.52;
    const wakeY = creature.y + Math.sin(creature.phase * 4) * 4;
    scene.actors.lineStyle(1, color, alpha * 0.62);
    scene.actors.strokeEllipse(wakeX, wakeY, creature.radius * 1.35, creature.radius * 0.28);
    scene.actors.lineStyle(1, 0xe4f5ff, alpha * 0.34);
    scene.actors.lineBetween(wakeX - creature.facingSign * creature.radius * 0.55, wakeY, wakeX - creature.facingSign * creature.radius * 1.05, wakeY + 3);
  }
}
