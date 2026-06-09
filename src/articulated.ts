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
  radius: 54,
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
      offset: [-138, 4],
      origin: [0.78, 0.5],
      size: [112, 72],
      depth: 0,
      hitRadius: 18,
      hpMultiplier: 0.7,
      damageMultiplier: 0.72,
      motion: { kind: 'tail', amplitude: 12, frequency: 2.4, phase: 1.4, lag: 1.4 },
    },
    {
      id: 'body-3',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-body-3',
      texture: 'fauna-abyssal-serpent-mantle-horror-body-3.png',
      offset: [-96, 0],
      origin: [0.5, 0.5],
      size: [112, 66],
      depth: 0.01,
      hitRadius: 26,
      hpMultiplier: 0.95,
      damageMultiplier: 0.9,
      motion: { kind: 'body', amplitude: 8, frequency: 2.1, phase: 1.0, lag: 0.9 },
    },
    {
      id: 'body-2',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-body-2',
      texture: 'fauna-abyssal-serpent-mantle-horror-body-2.png',
      offset: [-55, 0],
      origin: [0.5, 0.5],
      size: [124, 76],
      depth: 0.02,
      hitRadius: 30,
      hpMultiplier: 1,
      damageMultiplier: 1,
      motion: { kind: 'body', amplitude: 6, frequency: 2, phase: 0.6, lag: 0.55 },
    },
    {
      id: 'fin-back',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-fin-back',
      texture: 'fauna-abyssal-serpent-mantle-horror-fin-back.png',
      offset: [-22, -42],
      origin: [0.44, 0.86],
      size: [82, 78],
      depth: 0.04,
      hitRadius: 10,
      hpMultiplier: 0.45,
      damageMultiplier: 0.62,
      motion: { kind: 'fin', amplitude: 8, frequency: 3.2, phase: 1.8 },
    },
    {
      id: 'body-1',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-body-1',
      texture: 'fauna-abyssal-serpent-mantle-horror-body-1.png',
      offset: [-14, 0],
      origin: [0.5, 0.5],
      size: [130, 82],
      depth: 0.05,
      hitRadius: 32,
      hpMultiplier: 1.08,
      damageMultiplier: 1.05,
      motion: { kind: 'body', amplitude: 3, frequency: 1.9, phase: 0.2, lag: 0.2 },
    },
    {
      id: 'jaw',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-jaw',
      texture: 'fauna-abyssal-serpent-mantle-horror-jaw.png',
      offset: [65, 20],
      origin: [0.16, 0.24],
      size: [100, 62],
      depth: 0.09,
      hitRadius: 18,
      hpMultiplier: 0.55,
      damageMultiplier: 1.35,
      motion: { kind: 'jaw', amplitude: 21, frequency: 3.2, phase: 0 },
    },
    {
      id: 'head',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-head',
      texture: 'fauna-abyssal-serpent-mantle-horror-head.png',
      offset: [52, 0],
      origin: [0.48, 0.5],
      size: [140, 88],
      depth: 0.1,
      hitRadius: 34,
      hpMultiplier: 1.2,
      damageMultiplier: 1.25,
      motion: { kind: 'root', amplitude: 3, frequency: 1.4, phase: 0 },
    },
    {
      id: 'fin-front',
      textureKey: 'fauna-abyssal-serpent-mantle-horror-fin-front',
      texture: 'fauna-abyssal-serpent-mantle-horror-fin-front.png',
      offset: [-8, 34],
      origin: [0.32, 0.18],
      size: [94, 82],
      depth: 0.12,
      hitRadius: 12,
      hpMultiplier: 0.45,
      damageMultiplier: 0.62,
      motion: { kind: 'fin', amplitude: 9, frequency: 3.2, phase: 0.3 },
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
