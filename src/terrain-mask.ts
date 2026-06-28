import { TILE,WORLD_H,WORLD_W } from './constants';
import { tiles } from './content';
import { rng } from './rng';
import { hash } from './helpers';
import type { DeepdiveScene } from './scene';
import type { TerrainSurfaceAnchor } from './types';

export const TERRAIN_MASK_RES = 8;
export const TERRAIN_MASK_CELL = TILE / TERRAIN_MASK_RES;
export const TERRAIN_MASK_WIDTH = WORLD_W * TERRAIN_MASK_RES;
export const TERRAIN_MASK_HEIGHT = WORLD_H * TERRAIN_MASK_RES;
export const TERRAIN_MASK_SOLID_THRESHOLD = 96;

export function terrainMaskWorldReady(scene: DeepdiveScene) {
  if (scene.world.length < WORLD_H) return false;
  for (let y = 0; y < WORLD_H; y += 1) {
    if (!scene.world[y] || scene.world[y].length < WORLD_W) return false;
  }
  return true;
}

export function ensureTerrainMask(scene: DeepdiveScene) {
  if (!terrainMaskWorldReady(scene)) return false;
  if (scene.terrainMask.length !== TERRAIN_MASK_WIDTH * TERRAIN_MASK_HEIGHT) {
    rebuildTerrainMask(scene);
  }
  return scene.terrainMask.length === TERRAIN_MASK_WIDTH * TERRAIN_MASK_HEIGHT;
}

export function rebuildTerrainMask(scene: DeepdiveScene) {
  if (!terrainMaskWorldReady(scene)) {
    scene.terrainMask = new Uint8Array();
    scene.terrainDirty = true;
    scene.terrainBoundsKey = '';
    return false;
  }
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
  return true;
}

export function syncTerrainMaskTile(scene: DeepdiveScene, tileX: number, tileY: number) {
  if (!terrainMaskWorldReady(scene)) return;
  if (scene.terrainMask.length !== TERRAIN_MASK_WIDTH * TERRAIN_MASK_HEIGHT) return;
  if (scene.perfTelemetry?.enabled) scene.perfTelemetry.terrainMaskMutations += 1;
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
  if (!ensureTerrainMask(scene)) return;
  if (scene.perfTelemetry?.enabled) scene.perfTelemetry.terrainMaskMutations += 1;
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

export type TerrainMaskContact = {
  count: number;
  samples: number;
  nx: number;
  ny: number;
  density: number;
};

export function terrainMaskContactForAabb(
  scene: DeepdiveScene,
  centerX: number,
  centerY: number,
  halfW: number,
  halfH: number,
  options: { maxSamples?: number; includeBounds?: boolean } = {},
): TerrainMaskContact | null {
  if (!ensureTerrainMask(scene)) return null;
  const maxSamples = Math.max(8, options.maxSamples ?? 28);
  const perimeter = Math.max(1, (halfW + halfH) * 4);
  const step = Math.max(TERRAIN_MASK_CELL * 1.5, perimeter / maxSamples);
  const points: Array<{ x: number; y: number; nx: number; ny: number }> = [
    { x: centerX - halfW, y: centerY - halfH, nx: -0.7, ny: -0.7 },
    { x: centerX + halfW, y: centerY - halfH, nx: 0.7, ny: -0.7 },
    { x: centerX - halfW, y: centerY + halfH, nx: -0.7, ny: 0.7 },
    { x: centerX + halfW, y: centerY + halfH, nx: 0.7, ny: 0.7 },
    { x: centerX, y: centerY, nx: 0, ny: 0 },
  ];
  for (let ox = -halfW; ox <= halfW + 0.01; ox += step) {
    points.push({ x: centerX + ox, y: centerY - halfH, nx: 0, ny: -1 });
    points.push({ x: centerX + ox, y: centerY + halfH, nx: 0, ny: 1 });
  }
  for (let oy = -halfH; oy <= halfH + 0.01; oy += step) {
    points.push({ x: centerX - halfW, y: centerY + oy, nx: -1, ny: 0 });
    points.push({ x: centerX + halfW, y: centerY + oy, nx: 1, ny: 0 });
  }
  return terrainMaskContactForSamples(scene, points.slice(0, maxSamples + 5), options.includeBounds ?? true);
}

export function terrainMaskContactForCapsule(
  scene: DeepdiveScene,
  centerX: number,
  centerY: number,
  rotation: number,
  halfLength: number,
  radius: number,
  options: { maxSamples?: number; includeBounds?: boolean } = {},
): TerrainMaskContact | null {
  if (!ensureTerrainMask(scene)) return null;
  const maxSamples = Math.max(10, options.maxSamples ?? 24);
  const axisX = Math.cos(rotation);
  const axisY = Math.sin(rotation);
  const normalX = -axisY;
  const normalY = axisX;
  const sideSteps = Math.max(2, Math.ceil(Math.min(7, halfLength / Math.max(6, TERRAIN_MASK_CELL * 2))));
  const capSteps = Math.max(4, Math.ceil(Math.min(8, radius / Math.max(3, TERRAIN_MASK_CELL))));
  const points: Array<{ x: number; y: number; nx: number; ny: number }> = [
    { x: centerX, y: centerY, nx: 0, ny: 0 },
  ];
  for (let i = -sideSteps; i <= sideSteps; i += 1) {
    const t = i / sideSteps;
    const ax = centerX + axisX * halfLength * t;
    const ay = centerY + axisY * halfLength * t;
    points.push({ x: ax + normalX * radius, y: ay + normalY * radius, nx: normalX, ny: normalY });
    points.push({ x: ax - normalX * radius, y: ay - normalY * radius, nx: -normalX, ny: -normalY });
    points.push({ x: ax + normalX * radius * 0.55, y: ay + normalY * radius * 0.55, nx: normalX, ny: normalY });
    points.push({ x: ax - normalX * radius * 0.55, y: ay - normalY * radius * 0.55, nx: -normalX, ny: -normalY });
  }
  for (const end of [-1, 1]) {
    const capX = centerX + axisX * halfLength * end;
    const capY = centerY + axisY * halfLength * end;
    for (let i = -capSteps; i <= capSteps; i += 1) {
      const theta = (i / capSteps) * Math.PI * 0.5;
      const outwardX = axisX * end * Math.cos(theta) + normalX * Math.sin(theta);
      const outwardY = axisY * end * Math.cos(theta) + normalY * Math.sin(theta);
      points.push({ x: capX + outwardX * radius, y: capY + outwardY * radius, nx: outwardX, ny: outwardY });
      points.push({ x: capX + outwardX * radius * 0.58, y: capY + outwardY * radius * 0.58, nx: outwardX, ny: outwardY });
    }
  }
  for (let i = -sideSteps; i <= sideSteps; i += 1) {
    const t = i / sideSteps;
    points.push({
      x: centerX + axisX * halfLength * t,
      y: centerY + axisY * halfLength * t,
      nx: 0,
      ny: 0,
    });
  }
  const stride = Math.max(1, Math.ceil(points.length / maxSamples));
  return terrainMaskContactForSamples(scene, points.filter((_, index) => index === 0 || index % stride === 0), options.includeBounds ?? true);
}

function terrainMaskContactForSamples(
  scene: DeepdiveScene,
  points: Array<{ x: number; y: number; nx: number; ny: number }>,
  includeBounds: boolean,
): TerrainMaskContact | null {
  let count = 0;
  let samples = 0;
  let densitySum = 0;
  let nx = 0;
  let ny = 0;
  for (const point of points) {
    samples += 1;
    const tx = Math.floor(point.x / TILE);
    const ty = Math.floor(point.y / TILE);
    let solid = false;
    let density = 0;
    if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) {
      solid = includeBounds;
      density = solid ? 255 : 0;
    } else {
      const sx = Math.floor(point.x / TERRAIN_MASK_CELL);
      const sy = Math.floor(point.y / TERRAIN_MASK_CELL);
      density = terrainMaskDensityAt(scene, sx, sy);
      solid = density >= TERRAIN_MASK_SOLID_THRESHOLD;
    }
    if (!solid) continue;
    count += 1;
    densitySum += density;
    if (point.nx || point.ny) {
      const len = Math.max(1, Math.hypot(point.nx, point.ny));
      nx += -point.nx / len;
      ny += -point.ny / len;
    } else {
      nx += point.x < scene.player.x ? 1 : -1;
      ny += point.y < scene.player.y ? 1 : -1;
    }
  }
  if (scene.perfTelemetry?.enabled) scene.perfTelemetry.terrainContactSamples += samples;
  const len = Math.hypot(nx, ny);
  if (count <= 0 || len <= 0) return null;
  return {
    count,
    samples,
    nx: nx / len,
    ny: ny / len,
    density: densitySum / count,
  };
}

export function terrainMaskSolid(scene: DeepdiveScene, sx: number, sy: number) {
  return terrainMaskDensityAt(scene, sx, sy) >= TERRAIN_MASK_SOLID_THRESHOLD;
}

export function terrainMaskExposureVector(scene: DeepdiveScene, sx: number, sy: number) {
  const north = !terrainMaskSolid(scene, sx, sy - 1);
  const south = !terrainMaskSolid(scene, sx, sy + 1);
  const west = !terrainMaskSolid(scene, sx - 1, sy);
  const east = !terrainMaskSolid(scene, sx + 1, sy);
  return {
    x: (east ? 1 : 0) - (west ? 1 : 0),
    y: (south ? 1 : 0) - (north ? 1 : 0),
    count: [north, south, west, east].filter(Boolean).length,
  };
}

export function terrainLocalSolidSupport(scene: DeepdiveScene, sx: number, sy: number, radius: number) {
  let solid = 0;
  for (let oy = -radius; oy <= radius; oy += 1) {
    for (let ox = -radius; ox <= radius; ox += 1) {
      if (terrainMaskSolid(scene, sx + ox, sy + oy)) solid += 1;
    }
  }
  return solid;
}

export function terrainMaskBoundaryCell(scene: DeepdiveScene, sx: number, sy: number) {
  if (!terrainMaskSolid(scene, sx, sy)) return false;
  for (let oy = -2; oy <= 2; oy += 1) {
    for (let ox = -2; ox <= 2; ox += 1) {
      if (ox === 0 && oy === 0) continue;
      if (Math.abs(ox) + Math.abs(oy) > 3) continue;
      if (!terrainMaskSolid(scene, sx + ox, sy + oy)) return true;
    }
  }
  return false;
}

export function terrainBoundarySupported(scene: DeepdiveScene, sx: number, sy: number) {
  let solid = 0;
  for (let oy = -2; oy <= 2; oy += 1) {
    for (let ox = -2; ox <= 2; ox += 1) {
      if (ox === 0 && oy === 0) continue;
      if (terrainMaskSolid(scene, sx + ox, sy + oy)) solid += 1;
    }
  }
  const horizontal = terrainMaskSolid(scene, sx - 1, sy) || terrainMaskSolid(scene, sx + 1, sy);
  const vertical = terrainMaskSolid(scene, sx, sy - 1) || terrainMaskSolid(scene, sx, sy + 1);
  return solid >= 4 && (horizontal || vertical);
}

export function terrainMaskInteriorFillCell(scene: DeepdiveScene, sx: number, sy: number) {
  for (let oy = -2; oy <= 2; oy += 1) {
    for (let ox = -2; ox <= 2; ox += 1) {
      if (!terrainMaskSolid(scene, sx + ox, sy + oy)) return false;
    }
  }
  return true;
}

export type TerrainSurfaceAnchorOptions = {
  minY: number;
  maxY: number;
  salt?: number;
  prefer?: TerrainSurfaceAnchor['anchor'][];
  minSupport?: number;
  minClearance?: number;
  limit?: number;
};

export function sampleTerrainSurfaceAnchors(scene: DeepdiveScene, options: TerrainSurfaceAnchorOptions) {
  if (!ensureTerrainMask(scene)) return [];
  const minSy = Math.max(1, Math.floor(options.minY / TERRAIN_MASK_CELL));
  const maxSy = Math.min(TERRAIN_MASK_HEIGHT - 2, Math.ceil(options.maxY / TERRAIN_MASK_CELL));
  const minSupport = options.minSupport ?? 12;
  const minClearance = options.minClearance ?? 3;
  const preferred = new Set(options.prefer ?? []);
  const salt = options.salt ?? 0;
  const anchors: Array<TerrainSurfaceAnchor & { score: number }> = [];
  for (let sy = minSy; sy <= maxSy; sy += 1) {
    for (let sx = 2; sx < TERRAIN_MASK_WIDTH - 2; sx += 1) {
      const anchor = terrainSurfaceAnchorAt(scene, sx, sy);
      if (!anchor) continue;
      if (anchor.support < minSupport || anchor.clearance < minClearance) continue;
      const preference = preferred.size === 0 || preferred.has(anchor.anchor) ? 0.22 : 0;
      const depthBias = 1 - Math.abs(((anchor.rootY - options.minY) / Math.max(1, options.maxY - options.minY)) - 0.5) * 0.12;
      const score = hash(sx * 431 + salt * 17, sy * 439 - salt * 23, rng.seed + 9029) + preference + anchor.clearance * 0.012 + depthBias * 0.03;
      anchors.push({ ...anchor, score });
    }
  }
  anchors.sort((a, b) => b.score - a.score);
  const limited = anchors.slice(0, options.limit ?? anchors.length);
  return limited.map(({ score: _score, ...anchor }) => anchor);
}

export function findTerrainSurfaceAnchorInBand(scene: DeepdiveScene, minY: number, maxY: number, salt = 0, prefer?: TerrainSurfaceAnchor['anchor'][]) {
  const primary = sampleTerrainSurfaceAnchors(scene, { minY, maxY, salt, prefer, limit: 80 });
  if (primary.length) return primary[salt % primary.length];
  const widened = sampleTerrainSurfaceAnchors(scene, {
    minY: Math.max(TILE * 4, minY - TILE * 10),
    maxY: Math.min(WORLD_H * TILE - TILE * 2, maxY + TILE * 10),
    salt: salt + 1009,
    prefer,
    minSupport: 9,
    minClearance: 2,
    limit: 80,
  });
  return widened.length ? widened[salt % widened.length] : null;
}

export function validateTerrainSurfaceAnchor(scene: DeepdiveScene, anchor: TerrainSurfaceAnchor) {
  if (!ensureTerrainMask(scene)) return { valid: false, anchor: null };
  const current = terrainSurfaceAnchorAt(scene, anchor.maskSx, anchor.maskSy);
  if (!current) return { valid: false, anchor: null };
  if (current.support < 9 || current.clearance < 2) return { valid: false, anchor: current };
  return { valid: true, anchor: current };
}

export function findNearbyTerrainSurfaceAnchor(scene: DeepdiveScene, anchor: TerrainSurfaceAnchor, radiusCells = 8) {
  let best: TerrainSurfaceAnchor | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let sy = Math.max(1, anchor.maskSy - radiusCells); sy <= Math.min(TERRAIN_MASK_HEIGHT - 2, anchor.maskSy + radiusCells); sy += 1) {
    for (let sx = Math.max(1, anchor.maskSx - radiusCells); sx <= Math.min(TERRAIN_MASK_WIDTH - 2, anchor.maskSx + radiusCells); sx += 1) {
      const candidate = terrainSurfaceAnchorAt(scene, sx, sy);
      if (!candidate || candidate.support < 9 || candidate.clearance < 2) continue;
      const dx = candidate.rootX - anchor.rootX;
      const dy = candidate.rootY - anchor.rootY;
      const normalPenalty = Math.abs(candidate.normalX - anchor.normalX) + Math.abs(candidate.normalY - anchor.normalY);
      const score = dx * dx + dy * dy + normalPenalty * TERRAIN_MASK_CELL * TERRAIN_MASK_CELL * 2;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }
  return best;
}

function terrainSurfaceAnchorAt(scene: DeepdiveScene, sx: number, sy: number): TerrainSurfaceAnchor | null {
  if (!terrainMaskBoundaryCell(scene, sx, sy) || !terrainBoundarySupported(scene, sx, sy)) return null;
  const exposed = terrainMaskExposureVector(scene, sx, sy);
  if (exposed.count === 0) return null;
  const length = Math.hypot(exposed.x, exposed.y);
  if (length <= 0) return null;
  const normalX = exposed.x / length;
  const normalY = exposed.y / length;
  const support = terrainLocalSolidSupport(scene, sx, sy, 3);
  const clearance = terrainOutwardClearance(scene, sx, sy, normalX, normalY, 7);
  const anchor = normalToCardinalAnchor(normalX, normalY);
  const rootX = (sx + 0.5) * TERRAIN_MASK_CELL + normalX * TERRAIN_MASK_CELL * 0.62;
  const rootY = (sy + 0.5) * TERRAIN_MASK_CELL + normalY * TERRAIN_MASK_CELL * 0.62;
  return {
    id: `mask:${sx}:${sy}:${anchor}`,
    x: rootX,
    y: rootY,
    rootX,
    rootY,
    normalX,
    normalY,
    tangentX: -normalY,
    tangentY: normalX,
    anchor,
    tileX: Math.floor(sx / TERRAIN_MASK_RES),
    tileY: Math.floor(sy / TERRAIN_MASK_RES),
    maskSx: sx,
    maskSy: sy,
    support,
    clearance,
    source: 'terrain-mask',
  };
}

function terrainOutwardClearance(scene: DeepdiveScene, sx: number, sy: number, normalX: number, normalY: number, maxSteps: number) {
  let clear = 0;
  for (let step = 1; step <= maxSteps; step += 1) {
    const sampleX = Math.round(sx + normalX * step);
    const sampleY = Math.round(sy + normalY * step);
    if (terrainMaskSolid(scene, sampleX, sampleY)) break;
    clear += 1;
  }
  return clear;
}

function normalToCardinalAnchor(normalX: number, normalY: number): TerrainSurfaceAnchor['anchor'] {
  if (Math.abs(normalY) >= Math.abs(normalX)) return normalY < 0 ? 'floor' : 'ceiling';
  return normalX < 0 ? 'leftWall' : 'rightWall';
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
