import Phaser from 'phaser';
import type { ArticulatedCreature, ArticulatedCreatureManifest, ArticulatedPartState, Biome } from './types';
import { ENTITY_SCALE } from './constants';

export const ARTICULATED_MANIFEST_KEY = 'articulated-creatures__parts';

interface ArticulatedManifestFile {
  schema: 'asset-forge/sprite-parts@1';
  creatures: ArticulatedCreatureManifest[];
}

const fallbackSerpentManifest: ArticulatedCreatureManifest = {
  id: 'abyssal-serpent',
  species: 'Abyssal Serpent',
  minBiome: 3 as Biome,
  color: 0xd06bff,
  rarity: 'legendary',
  radius: 34,
  hp: 260,
  speed: [34, 64],
  spawn: {
    minDepth: 1320,
    maxDepth: 2600,
    count: 1,
  },
  parts: [
    {
      id: 'tail',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-tail',
      texture: 'fauna-abyssal-serpent-mantle-horror-tail.png',
      offset: [-100, 0],
      origin: [0.78, 0.5],
      size: [76, 48],
      depth: 0,
      hitRadius: 16,
      hpMultiplier: 0.7,
      damageMultiplier: 0.72,
      motion: { kind: 'tail', amplitude: 18, frequency: 2.8, phase: 1.4, lag: 1.6 },
    },
    {
      id: 'body-3',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-body-segment',
      texture: 'fauna-abyssal-serpent-mantle-horror-body-segment.png',
      offset: [-72, 0],
      origin: [0.5, 0.5],
      size: [68, 54],
      depth: 0.01,
      hitRadius: 20,
      hpMultiplier: 0.95,
      damageMultiplier: 0.9,
      motion: { kind: 'body', amplitude: 13, frequency: 2.3, phase: 1.0, lag: 1.1 },
    },
    {
      id: 'body-2',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-body-segment',
      texture: 'fauna-abyssal-serpent-mantle-horror-body-segment.png',
      offset: [-42, 0],
      origin: [0.5, 0.5],
      size: [72, 56],
      depth: 0.02,
      hitRadius: 23,
      hpMultiplier: 1,
      damageMultiplier: 1,
      motion: { kind: 'body', amplitude: 9, frequency: 2.2, phase: 0.6, lag: 0.7 },
    },
    {
      id: 'fin-back',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-fin',
      texture: 'fauna-abyssal-serpent-mantle-horror-fin.png',
      offset: [-20, -18],
      origin: [0.26, 0.72],
      size: [44, 48],
      depth: 0.04,
      hitRadius: 11,
      hpMultiplier: 0.45,
      damageMultiplier: 0.62,
      motion: { kind: 'fin', amplitude: 12, frequency: 3.5, phase: 1.8 },
    },
    {
      id: 'body-1',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-body-segment',
      texture: 'fauna-abyssal-serpent-mantle-horror-body-segment.png',
      offset: [-10, 0],
      origin: [0.5, 0.5],
      size: [76, 58],
      depth: 0.05,
      hitRadius: 25,
      hpMultiplier: 1.08,
      damageMultiplier: 1.05,
      motion: { kind: 'body', amplitude: 5, frequency: 2, phase: 0.2, lag: 0.2 },
    },
    {
      id: 'jaw',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-jaw',
      texture: 'fauna-abyssal-serpent-mantle-horror-jaw.png',
      offset: [42, 10],
      origin: [0.16, 0.18],
      size: [50, 38],
      depth: 0.09,
      hitRadius: 13,
      hpMultiplier: 0.55,
      damageMultiplier: 1.35,
      motion: { kind: 'jaw', amplitude: 21, frequency: 3.2, phase: 0 },
    },
    {
      id: 'head',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-head',
      texture: 'fauna-abyssal-serpent-mantle-horror-head.png',
      offset: [42, 0],
      origin: [0.48, 0.5],
      size: [92, 64],
      depth: 0.1,
      hitRadius: 25,
      hpMultiplier: 1.2,
      damageMultiplier: 1.25,
      motion: { kind: 'root', amplitude: 3, frequency: 1.4, phase: 0 },
    },
    {
      id: 'fin-front',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-fin',
      texture: 'fauna-abyssal-serpent-mantle-horror-fin.png',
      offset: [6, 20],
      origin: [0.26, 0.28],
      size: [44, 48],
      depth: 0.12,
      hitRadius: 11,
      hpMultiplier: 0.45,
      damageMultiplier: 0.62,
      motion: { kind: 'fin', amplitude: 14, frequency: 3.5, phase: 0.3 },
    },
  ],
};

const articulatedManifests = new Map<string, ArticulatedCreatureManifest>();
articulatedManifests.set(fallbackSerpentManifest.id, fallbackSerpentManifest);

export function loadArticulatedAssets(scene: Phaser.Scene) {
  scene.load.json(ARTICULATED_MANIFEST_KEY, '/assets/generated/articulated-creatures.parts.json');
  scene.load.once(`filecomplete-json-${ARTICULATED_MANIFEST_KEY}`, () => {
    const file = scene.cache.json.get(ARTICULATED_MANIFEST_KEY) as ArticulatedManifestFile | undefined;
    if (!file?.creatures?.length) return;
    articulatedManifests.clear();
    for (const manifest of file.creatures) {
      articulatedManifests.set(manifest.id, manifest);
      for (const part of manifest.parts) {
        const path = `/assets/generated/${part.texture}`;
        if (part.texture.endsWith('.svg')) scene.load.svg(part.textureKey, path);
        else scene.load.image(part.textureKey, path);
      }
    }
  });
}

export function articulatedCreatureDefs() {
  return [...articulatedManifests.values()];
}

export function articulatedCreatureDef(id: string) {
  return articulatedManifests.get(id) ?? fallbackSerpentManifest;
}

export function ensureArticulatedTextures(scene: Phaser.Scene) {
  for (const manifest of articulatedCreatureDefs()) {
    for (const part of manifest.parts) {
      if (scene.textures.exists(part.textureKey)) continue;
      const width = Math.max(8, Math.ceil(part.size[0]));
      const height = Math.max(8, Math.ceil(part.size[1]));
      const graphics = scene.add.graphics().setVisible(false);
      graphics.clear();
      graphics.fillStyle(manifest.color, 0.9);
      graphics.fillEllipse(width * 0.5, height * 0.5, width * 0.86, height * 0.68);
      graphics.lineStyle(2, 0x08131c, 0.85);
      graphics.strokeEllipse(width * 0.5, height * 0.5, width * 0.86, height * 0.68);
      if (part.motion.kind === 'jaw' || part.id === 'head') {
        graphics.fillStyle(0x73fbd3, 0.8);
        graphics.fillCircle(width * 0.72, height * 0.42, Math.max(2, height * 0.08));
      }
      graphics.generateTexture(part.textureKey, width, height);
      graphics.destroy();
    }
  }
}

export function createArticulatedCreature(
  scene: Phaser.Scene,
  manifest: ArticulatedCreatureManifest,
  x: number,
  y: number,
): ArticulatedCreature {
  const phase = Math.random() * Math.PI * 2;
  const speed = Phaser.Math.FloatBetween(manifest.speed[0], manifest.speed[1]);
  const creature: ArticulatedCreature = {
    kind: 'articulated',
    id: manifest.id,
    species: manifest.species,
    x,
    y,
    vx: Phaser.Math.FloatBetween(-speed * 0.45, speed * 0.45),
    vy: Phaser.Math.FloatBetween(-speed * 0.2, speed * 0.2),
    homeX: x,
    homeY: y,
    speed,
    phase,
    color: manifest.color,
    hostile: true,
    scanned: false,
    scan: 0,
    scanning: false,
    scanPulse: 0,
    radius: manifest.radius * ENTITY_SCALE,
    aggro: 0,
    bumpCooldown: 0,
    stunned: 0,
    hp: manifest.hp,
    maxHp: manifest.hp,
    dead: false,
    hurtFlash: 0,
    facingSign: 1,
    state: 'patrol',
    stateTimer: 0,
    grabTimer: 0,
    grabCooldown: 0,
    manifest,
    parts: manifest.parts.map<ArticulatedPartState>((part) => ({
      id: part.id,
      hp: Math.max(1, manifest.hp * part.hpMultiplier),
      maxHp: Math.max(1, manifest.hp * part.hpMultiplier),
      hurtFlash: 0,
      x,
      y,
      rotation: 0,
      sprite: scene.add.image(x, y, part.textureKey)
        .setOrigin(part.origin[0], part.origin[1])
        .setDepth(2.1 + part.depth)
        .setVisible(false),
    })),
  };
  return creature;
}

export function partManifest(creature: ArticulatedCreature, part: ArticulatedPartState) {
  return creature.manifest.parts.find((candidate) => candidate.id === part.id) ?? creature.manifest.parts[0];
}
