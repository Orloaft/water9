import { TILE,WORLD_H,WORLD_W } from './constants';
import { tiles } from './content';
import { rng } from './rng';
import { hash } from './helpers';
import type { DeepdiveScene } from './scene';

export const TERRAIN_MASK_RES = 8;
export const TERRAIN_MASK_CELL = TILE / TERRAIN_MASK_RES;
export const TERRAIN_MASK_WIDTH = WORLD_W * TERRAIN_MASK_RES;
export const TERRAIN_MASK_HEIGHT = WORLD_H * TERRAIN_MASK_RES;
export const TERRAIN_MASK_SOLID_THRESHOLD = 96;

export function ensureTerrainMask(scene: DeepdiveScene) {
  if (scene.terrainMask.length !== TERRAIN_MASK_WIDTH * TERRAIN_MASK_HEIGHT) {
    rebuildTerrainMask(scene);
  }
}

export function rebuildTerrainMask(scene: DeepdiveScene) {
  const mask = new Uint8Array(TERRAIN_MASK_WIDTH * TERRAIN_MASK_HEIGHT);
  for (let sy = 0; sy < TERRAIN_MASK_HEIGHT; sy += 1) {
    for (let sx = 0; sx < TERRAIN_MASK_WIDTH; sx += 1) {
      mask[maskIndex(sx, sy)] = initialMaskDensity(scene, sx, sy);
    }
  }
  scene.terrainMask = mask;
  scene.terrainDirty = true;
  scene.terrainBoundsKey = '';
}

export function syncTerrainMaskTile(scene: DeepdiveScene, tileX: number, tileY: number) {
  if (scene.terrainMask.length !== TERRAIN_MASK_WIDTH * TERRAIN_MASK_HEIGHT) return;
  for (let ty = tileY - 1; ty <= tileY + 1; ty += 1) {
    for (let tx = tileX - 1; tx <= tileX + 1; tx += 1) {
      if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) continue;
      for (let ly = 0; ly < TERRAIN_MASK_RES; ly += 1) {
        for (let lx = 0; lx < TERRAIN_MASK_RES; lx += 1) {
          const sx = tx * TERRAIN_MASK_RES + lx;
          const sy = ty * TERRAIN_MASK_RES + ly;
          scene.terrainMask[maskIndex(sx, sy)] = initialMaskDensity(scene, sx, sy);
        }
      }
    }
  }
  scene.terrainDirty = true;
  scene.terrainBoundsKey = '';
}

export function subtractTerrainMaskBrush(scene: DeepdiveScene, worldX: number, worldY: number, radius: number, strength = 0.65) {
  ensureTerrainMask(scene);
  const minSx = Math.max(0, Math.floor((worldX - radius - TERRAIN_MASK_CELL) / TERRAIN_MASK_CELL));
  const maxSx = Math.min(TERRAIN_MASK_WIDTH - 1, Math.ceil((worldX + radius + TERRAIN_MASK_CELL) / TERRAIN_MASK_CELL));
  const minSy = Math.max(0, Math.floor((worldY - radius - TERRAIN_MASK_CELL) / TERRAIN_MASK_CELL));
  const maxSy = Math.min(TERRAIN_MASK_HEIGHT - 1, Math.ceil((worldY + radius + TERRAIN_MASK_CELL) / TERRAIN_MASK_CELL));
  for (let sy = minSy; sy <= maxSy; sy += 1) {
    const sampleY = (sy + 0.5) * TERRAIN_MASK_CELL;
    for (let sx = minSx; sx <= maxSx; sx += 1) {
      const index = maskIndex(sx, sy);
      const current = scene.terrainMask[index];
      if (current <= 0) continue;
      const sampleX = (sx + 0.5) * TERRAIN_MASK_CELL;
      const dx = sampleX - worldX;
      const dy = sampleY - worldY;
      const distance = Math.hypot(dx, dy);
      const boundaryNoise = hash(sx * 7, sy * 11, rng.seed + 5011);
      const noisyRadius = radius * (0.72 + boundaryNoise * 0.38);
      if (distance > noisyRadius) continue;
      const falloff = 1 - distance / Math.max(1, noisyRadius);
      const bite = 255 * strength * (0.42 + falloff * 0.72);
      scene.terrainMask[index] = Math.max(0, current - bite);
    }
  }
  scene.terrainDirty = true;
  scene.terrainBoundsKey = '';
}

export function terrainMaskDensityAt(scene: DeepdiveScene, sx: number, sy: number) {
  if (sx < 0 || sy < 0 || sx >= TERRAIN_MASK_WIDTH || sy >= TERRAIN_MASK_HEIGHT) return 0;
  if (scene.terrainMask.length !== TERRAIN_MASK_WIDTH * TERRAIN_MASK_HEIGHT) return 0;
  return scene.terrainMask[maskIndex(sx, sy)];
}

function maskIndex(sx: number, sy: number) {
  return sy * TERRAIN_MASK_WIDTH + sx;
}

function initialMaskDensity(scene: DeepdiveScene, sx: number, sy: number) {
  const tx = Math.floor(sx / TERRAIN_MASK_RES);
  const ty = Math.floor(sy / TERRAIN_MASK_RES);
  const tile = scene.getTile(tx, ty);
  if (!tiles[tile].solid) return 0;
  const localX = ((sx % TERRAIN_MASK_RES) + 0.5) * TERRAIN_MASK_CELL;
  const localY = ((sy % TERRAIN_MASK_RES) + 0.5) * TERRAIN_MASK_CELL;
  let density = 255;
  density = erodeOpenSide(scene, density, tx, ty, localY, 'north');
  density = erodeOpenSide(scene, density, tx, ty, TILE - localY, 'south');
  density = erodeOpenSide(scene, density, tx, ty, localX, 'west');
  density = erodeOpenSide(scene, density, tx, ty, TILE - localX, 'east');
  const edgeSeed = hash(sx * 17, sy * 19, rng.seed + 5051);
  const nearOpen = scene.getTile(tx, ty - 1) === 'water'
    || scene.getTile(tx, ty + 1) === 'water'
    || scene.getTile(tx - 1, ty) === 'water'
    || scene.getTile(tx + 1, ty) === 'water';
  if (nearOpen && edgeSeed > 0.88) density = Math.max(0, density - 90);
  return density;
}

function erodeOpenSide(
  scene: DeepdiveScene,
  density: number,
  tx: number,
  ty: number,
  distanceToSide: number,
  side: 'north' | 'south' | 'west' | 'east',
) {
  const neighbor = side === 'north'
    ? scene.getTile(tx, ty - 1)
    : side === 'south'
      ? scene.getTile(tx, ty + 1)
      : side === 'west'
        ? scene.getTile(tx - 1, ty)
        : scene.getTile(tx + 1, ty);
  if (tiles[neighbor].solid) return density;
  const salt = side === 'north' ? 5101 : side === 'south' ? 5107 : side === 'west' ? 5113 : 5119;
  const inset = 1.5 + hash(tx * 31 + salt, ty * 37 - salt, rng.seed + salt) * 16.5;
  if (distanceToSide <= inset) return 0;
  if (distanceToSide <= inset + 4) return Math.min(density, 150);
  return density;
}
