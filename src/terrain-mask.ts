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
  normalizeTerrainMask(scene, 0, TERRAIN_MASK_WIDTH - 1, 0, TERRAIN_MASK_HEIGHT - 1, 5);
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
  normalizeTerrainMask(
    scene,
    Math.max(0, (tileX - 2) * TERRAIN_MASK_RES),
    Math.min(TERRAIN_MASK_WIDTH - 1, (tileX + 3) * TERRAIN_MASK_RES - 1),
    Math.max(0, (tileY - 2) * TERRAIN_MASK_RES),
    Math.min(TERRAIN_MASK_HEIGHT - 1, (tileY + 3) * TERRAIN_MASK_RES - 1),
    2,
  );
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

function normalizeTerrainMask(
  scene: DeepdiveScene,
  minSx: number,
  maxSx: number,
  minSy: number,
  maxSy: number,
  passes: number,
) {
  if (scene.terrainMask.length !== TERRAIN_MASK_WIDTH * TERRAIN_MASK_HEIGHT) return;
  const margin = 3;
  const fromX = Math.max(1, minSx - margin);
  const toX = Math.min(TERRAIN_MASK_WIDTH - 2, maxSx + margin);
  const fromY = Math.max(1, minSy - margin);
  const toY = Math.min(TERRAIN_MASK_HEIGHT - 2, maxSy + margin);
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(scene.terrainMask);
    for (let sy = fromY; sy <= toY; sy += 1) {
      for (let sx = fromX; sx <= toX; sx += 1) {
        const index = maskIndex(sx, sy);
        const current = scene.terrainMask[index];
        const solid = current >= TERRAIN_MASK_SOLID_THRESHOLD;
        const neighbors = countSolidMaskNeighbors(scene, sx, sy, 1);
        const broad = countSolidMaskNeighbors(scene, sx, sy, 2);
        const horizontalBridge = terrainMaskSolidInArray(scene.terrainMask, sx - 1, sy)
          && terrainMaskSolidInArray(scene.terrainMask, sx + 1, sy);
        const verticalBridge = terrainMaskSolidInArray(scene.terrainMask, sx, sy - 1)
          && terrainMaskSolidInArray(scene.terrainMask, sx, sy + 1);
        const isolatedVoid = !solid && (neighbors >= 7 || (neighbors >= 6 && broad >= 18));
        const thinVoid = !solid && (
          (horizontalBridge && countSolidMaskNeighbors(scene, sx, sy, 2) >= 13)
          || (verticalBridge && countSolidMaskNeighbors(scene, sx, sy, 2) >= 13)
        );
        const unsupportedSolid = solid && (neighbors <= 2 || (neighbors <= 3 && broad <= 10));
        const needleSolid = solid && (
          (!terrainMaskSolidInArray(scene.terrainMask, sx - 1, sy) && !terrainMaskSolidInArray(scene.terrainMask, sx + 1, sy) && neighbors <= 4)
          || (!terrainMaskSolidInArray(scene.terrainMask, sx, sy - 1) && !terrainMaskSolidInArray(scene.terrainMask, sx, sy + 1) && neighbors <= 4)
        );
        const edgeCut = solid && contourErosionAt(scene, sx, sy, pass, neighbors, broad);
        if (isolatedVoid || thinVoid) {
          next[index] = 235;
        } else if (unsupportedSolid || needleSolid || edgeCut) {
          next[index] = 0;
        } else if (solid) {
          const average = averageMaskDensity(scene.terrainMask, sx, sy);
          next[index] = Math.max(TERRAIN_MASK_SOLID_THRESHOLD, Math.round(current * 0.72 + average * 0.28));
        } else if (neighbors >= 5 && broad >= 14) {
          next[index] = Math.max(current, 78);
        }
      }
    }
    scene.terrainMask = next;
  }
}

function contourErosionAt(scene: DeepdiveScene, sx: number, sy: number, pass: number, neighbors: number, broad: number) {
  const northOpen = !terrainMaskSolidInArray(scene.terrainMask, sx, sy - 1);
  const southOpen = !terrainMaskSolidInArray(scene.terrainMask, sx, sy + 1);
  const westOpen = !terrainMaskSolidInArray(scene.terrainMask, sx - 1, sy);
  const eastOpen = !terrainMaskSolidInArray(scene.terrainMask, sx + 1, sy);
  const exposed = [northOpen, southOpen, westOpen, eastOpen].filter(Boolean).length;
  if (exposed === 0 || neighbors < 4 || broad < 9) return false;
  const macroX = Math.floor(sx / 4);
  const macroY = Math.floor(sy / 4);
  const lobe = hash(macroX * 211 + pass * 17, macroY * 223 - pass * 19, rng.seed + 5903);
  const wave = (
    Math.sin(sx * 0.18 + sy * 0.09 + rng.seed * 0.017)
    + Math.sin(sx * 0.07 - sy * 0.16 + rng.seed * 0.011)
  ) * 0.5 + 0.5;
  const cornerBonus = exposed >= 2 ? 0.11 : 0;
  return lobe * 0.72 + wave * 0.28 + cornerBonus > 0.82;
}

function terrainMaskSolidInArray(mask: Uint8Array, sx: number, sy: number) {
  if (sx < 0 || sy < 0 || sx >= TERRAIN_MASK_WIDTH || sy >= TERRAIN_MASK_HEIGHT) return false;
  return mask[maskIndex(sx, sy)] >= TERRAIN_MASK_SOLID_THRESHOLD;
}

function countSolidMaskNeighbors(scene: DeepdiveScene, sx: number, sy: number, radius: number) {
  let solid = 0;
  for (let oy = -radius; oy <= radius; oy += 1) {
    for (let ox = -radius; ox <= radius; ox += 1) {
      if (ox === 0 && oy === 0) continue;
      if (terrainMaskSolidInArray(scene.terrainMask, sx + ox, sy + oy)) solid += 1;
    }
  }
  return solid;
}

function averageMaskDensity(mask: Uint8Array, sx: number, sy: number) {
  let total = 0;
  let count = 0;
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      const x = sx + ox;
      const y = sy + oy;
      if (x < 0 || y < 0 || x >= TERRAIN_MASK_WIDTH || y >= TERRAIN_MASK_HEIGHT) continue;
      total += mask[maskIndex(x, y)];
      count += 1;
    }
  }
  return count > 0 ? total / count : 0;
}

function initialMaskDensity(scene: DeepdiveScene, sx: number, sy: number) {
  const tx = Math.floor(sx / TERRAIN_MASK_RES);
  const ty = Math.floor(sy / TERRAIN_MASK_RES);
  const tile = scene.getTile(tx, ty);
  if (!tiles[tile].solid) return 0;
  const localX = ((sx % TERRAIN_MASK_RES) + 0.5) * TERRAIN_MASK_CELL;
  const localY = ((sy % TERRAIN_MASK_RES) + 0.5) * TERRAIN_MASK_CELL;
  let density = 255;
  density = erodeOpenSide(scene, density, tx, ty, sx, sy, localX, localY, localY, 'north');
  density = erodeOpenSide(scene, density, tx, ty, sx, sy, localX, localY, TILE - localY, 'south');
  density = erodeOpenSide(scene, density, tx, ty, sx, sy, localX, localY, localX, 'west');
  density = erodeOpenSide(scene, density, tx, ty, sx, sy, localX, localY, TILE - localX, 'east');
  density = erodeOpenCorners(scene, density, tx, ty, sx, sy, localX, localY);
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
  sx: number,
  sy: number,
  localX: number,
  localY: number,
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
  const along = side === 'north' || side === 'south' ? localX : localY;
  const largeWave = hash(Math.floor((side === 'north' || side === 'south' ? sx : sy) / 3) * 31 + salt, ty * 37 - tx * 13, rng.seed + salt);
  const fineWave = hash(sx * 43 + salt, sy * 47 - salt, rng.seed + salt + 97);
  const lobe = Math.sin((along / TILE) * Math.PI * 2 + largeWave * Math.PI * 2) * 0.5 + 0.5;
  const inset = 3.5 + largeWave * 11.5 + fineWave * 8.5 + lobe * 5.5;
  if (distanceToSide <= inset) return 0;
  if (distanceToSide <= inset + 5) return Math.min(density, 116);
  return density;
}

function erodeOpenCorners(
  scene: DeepdiveScene,
  density: number,
  tx: number,
  ty: number,
  sx: number,
  sy: number,
  localX: number,
  localY: number,
) {
  const corners: Array<[number, number, number, number]> = [
    [-1, -1, localX, localY],
    [1, -1, TILE - localX, localY],
    [-1, 1, localX, TILE - localY],
    [1, 1, TILE - localX, TILE - localY],
  ];
  let next = density;
  for (const [dx, dy, distX, distY] of corners) {
    const horizontalOpen = !tiles[scene.getTile(tx + dx, ty)].solid;
    const verticalOpen = !tiles[scene.getTile(tx, ty + dy)].solid;
    const diagonalOpen = !tiles[scene.getTile(tx + dx, ty + dy)].solid;
    if (!diagonalOpen && !(horizontalOpen && verticalOpen)) continue;
    const salt = 5600 + (dx < 0 ? 11 : 17) + (dy < 0 ? 23 : 29);
    const radius = 7 + hash(tx * 59 + salt, ty * 61 - salt, rng.seed + salt) * 16;
    const distance = Math.hypot(distX, distY);
    const noise = hash(sx * 67 + salt, sy * 71 - salt, rng.seed + salt + 101);
    if (distance < radius * (0.82 + noise * 0.28)) next = 0;
    else if (distance < radius + 5) next = Math.min(next, 104);
  }
  return next;
}
