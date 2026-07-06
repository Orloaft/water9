import Phaser from 'phaser';
import type { Bobbit,BobbitBurrow,EncounterReservation,EncounterReservationRole,EnvironmentProp,Fish,FishSpecies,Flora,FloraSpecies,Hazard,SpecialRoom,TerrainSurfaceAnchor,Tile,VeinRule } from './types';
import { BIOLUME_CAVERN_CHANCE,BOBBIT_ESCAPE_SECONDS,deepScale,EGG_HP,NEST_CHAMBER_CHANCE,SURFACE_Y,TILE,WORLD_H,WORLD_W } from './constants';
import { biomeFish,biomeFlora,tiles } from './content';
import { state } from './state';
import { rng } from './rng';
import { fishAssetKey,fishMaxHp,floraAssetKey,floraMaxHp,generateQuestBoard,generateTile,hash,isOreTile,oreEnvironmentAssetKey,scaledDepthPx,scaledEntity,terrainLookForBiome,veinRuleAt,veinRulesForBiome } from './helpers';
import { fishBehaviorProfile,type FaunaBehaviorProfile } from './fauna-behavior';
import type { DeepdiveScene } from './scene';
import { ensureTerrainMask,findNearbyTerrainSurfaceAnchor,findTerrainSurfaceAnchorInBand,rebuildTerrainMask,sampleTerrainSurfaceAnchors,TERRAIN_MASK_RES,TERRAIN_MASK_SOLID_THRESHOLD,terrainMaskDensityAt,validateTerrainSurfaceAnchor } from './terrain-mask';
import { markTerrainDirty,measurePerf } from './perf';

export function generateWorld(this: DeepdiveScene, ) {
	    this.world = [];
	    this.damage = [];
	    // Scene restarts reuse this instance; invalidate the previous biome's mask until the new world is fully carved.
	    this.terrainMask = new Uint8Array();
		    this.looseItems = [];
	    this.environmentProps = [];
	    this.articulatedCreatures = [];
    this.bobbitBurrows = [];
    this.encounterReservations = [];
    this.sideTunnelPocketCandidates = [];
    this.flora = [];
    this.bobbits = [];
    this.specialRooms = [];
    this.nestEggs = [];
    this.larvae = [];
    state.sonarRevealed.clear();
    state.sonarContacts = [];
    state.sonarMapOpen = false;
    state.sonarMapPanX = 0;
    state.sonarMapPanY = 0;
    state.sonarMapZoom = 1;
    for (let y = 0; y < WORLD_H; y += 1) {
      const row: Tile[] = [];
      const damageRow: number[] = [];
      for (let x = 0; x < WORLD_W; x += 1) {
        row.push(generateTile(x, y));
        damageRow.push(0);
      }
      this.world.push(row);
      this.damage.push(damageRow);
    }

    const center = Math.floor(WORLD_W / 2);
    for (let y = 0; y < 12; y += 1) {
      for (let x = center - 5; x <= center + 5; x += 1) {
        this.setTile(x, y, 'water');
      }
    }
	    this.carveStarterCaverns(center);
	    this.carveDeepTunnelNetwork(center);
		    this.carveAnchorstoneStrata();
		    this.injectSpecialRooms(center);
	    this.smoothTerrainSilhouette();
	    this.reserveBobbitBurrows();
	    this.reserveSignatureEncounters();
		    this.populateOreVeins();
	    rebuildTerrainMask(this);
		    this.populateEnvironmentProps();

	    this.fish = biomeFish[state.biome].flatMap((species) => this.makeSchool(species));
	    this.flora = biomeFlora[state.biome].flatMap((species) => this.makeFloraPatch(species));
	    this.populateSpecialRooms();
	    this.populateArticulatedCreatures();
	    this.populateBobbitArticulatedThreats();
	    state.questBoard = generateQuestBoard(this.specialRooms.some((room) => room.kind === 'nest'));
	      state.activeQuestId = '';
	    state.forwardOutpost.active = false;
	    state.forwardOutpost.x = 0;
	    state.forwardOutpost.y = 0;
	    state.forwardOutpost.depth = 0;
	    state.forwardOutpost.charge = 0;
	    state.forwardOutpost.floraSpecies = '';
	    this.hazards = state.biome >= 2 ? this.makeVentFields() : [];
	    this.bobbits = [];
	  }

export function makeVentFields(this: DeepdiveScene, ): Hazard[] {
    const vents: Hazard[] = [];
    const count = state.biome === 4 ? 32 : state.biome === 3 ? 26 : 18;
    for (let i = 0; i < count; i += 1) {
      const point = this.findVentAnchorInBand(scaledDepthPx(340 + i * 42), scaledDepthPx(2200), i);
      if (!point) continue;
      const offset = ventSurfaceOffset(point);
      const x = point.rootX + offset.x;
      const y = point.rootY + offset.y;
      vents.push({
        x,
        y,
        radius: scaledEntity(Phaser.Math.Between(34, 58) * 0.5),
        phase: Math.random() * Math.PI * 2,
        heat: Phaser.Math.FloatBetween(0.7, state.biome >= 3 ? 1.55 : 1.25),
        surface: point,
        sprite: this.createEntitySprite(x, y, 'vent-steam-0').setDepth(1.5).setOrigin(0.5, 1),
      });
    }
    return vents;
  }

function ventSurfaceOffset(anchor: TerrainSurfaceAnchor) {
    return {
      x: anchor.normalX * 4,
      y: anchor.normalY * 4,
    };
  }

export function injectSpecialRooms(this: DeepdiveScene, center: number) {
    const bioCenter = this.pickBiolumeCavernCenter(center);
    this.injectBiolumeCavern(bioCenter.x, bioCenter.y);

    const nestCenter = this.pickNestDeadEnd();
    this.injectPredatorNest(nestCenter.x, nestCenter.y);
  }

export function pickBiolumeCavernCenter(this: DeepdiveScene, center: number) {
    const candidates = 16;
    for (let i = 0; i < candidates; i += 1) {
      const y = Math.floor(Phaser.Math.Linear(WORLD_H * 0.48, WORLD_H * 0.88, (i + 0.5) / candidates));
      const x = Phaser.Math.Clamp(center + Math.floor((hash(i, 713, rng.seed) - 0.5) * 72), 18, WORLD_W - 19);
      if (hash(x, y, rng.seed + 9081) > BIOLUME_CAVERN_CHANCE) continue;
      if (this.denseSolidRatio(x, y, 18, 12) < 0.58) continue;
      return { x, y };
    }
    return {
      x: Phaser.Math.Clamp(center + Math.floor((hash(31, state.biome, rng.seed) - 0.5) * 54), 18, WORLD_W - 19),
      y: Math.floor(WORLD_H * (0.58 + hash(41, state.biome, rng.seed) * 0.22)),
    };
  }

export function pickNestDeadEnd(this: DeepdiveScene, ) {
    const candidates: Array<{ x: number; y: number; score: number }> = [];
    for (let y = Math.floor(WORLD_H * 0.52); y < WORLD_H - 14; y += 1) {
      for (let x = 6; x < WORLD_W - 6; x += 1) {
        if (this.getTile(x, y) !== 'water') continue;
        if (this.specialRooms.some((room) => Math.hypot(room.x / TILE - x, room.y / TILE - y) < 26)) continue;
        const neighbors = this.cardinalWaterNeighbors(x, y);
        if (neighbors > 1) continue;
        const solidRatio = this.denseSolidRatio(x, y, 8, 6);
        if (solidRatio < 0.48) continue;
        candidates.push({ x, y, score: y + solidRatio * 20 + hash(x, y, rng.seed) * 12 });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    for (let i = 0; i < Math.min(18, candidates.length); i += 1) {
      const candidate = candidates[i];
      if (hash(candidate.x, candidate.y, rng.seed + 11003) <= NEST_CHAMBER_CHANCE || i === 0) {
        return candidate;
      }
    }
    const bio = this.specialRooms.find((room) => room.kind === 'biolume');
    const side = (bio?.x ?? WORLD_W * TILE * 0.5) < WORLD_W * TILE * 0.5 ? 1 : -1;
    return {
      x: Phaser.Math.Clamp(Math.floor(WORLD_W * (0.5 + side * 0.28 + (hash(77, state.biome, rng.seed) - 0.5) * 0.12)), 12, WORLD_W - 13),
      y: Math.floor(WORLD_H * (0.68 + hash(83, state.biome, rng.seed) * 0.18)),
    };
  }

export function denseSolidRatio(this: DeepdiveScene, cx: number, cy: number, rx: number, ry: number) {
    let solid = 0;
    let cells = 0;
    for (let y = cy - ry; y <= cy + ry; y += 1) {
      for (let x = cx - rx; x <= cx + rx; x += 1) {
        if (x < 2 || x >= WORLD_W - 2 || y < 8 || y >= WORLD_H - 2) continue;
        cells += 1;
        if (tiles[this.getTile(x, y)].solid) solid += 1;
      }
    }
    return cells > 0 ? solid / cells : 0;
  }

export function cardinalWaterNeighbors(this: DeepdiveScene, x: number, y: number) {
    return [
      this.getTile(x + 1, y),
      this.getTile(x - 1, y),
      this.getTile(x, y + 1),
      this.getTile(x, y - 1),
    ].filter((tile) => tile === 'water').length;
  }

export function injectBiolumeCavern(this: DeepdiveScene, cx: number, cy: number) {
    const rx = state.biome >= 3 ? 18 : 15;
    const ry = state.biome >= 3 ? 12 : 10;
    const open = this.cellularRoomMask(cx, cy, rx, ry, 0.54, 4);
    for (const cell of open) this.setTile(cell.x, cell.y, 'water');
    this.openRoomMouths(cx, cy, rx, ry, 2);
    this.connectRoomToNearestWater(cx, cy, rx, ry);
    const room: SpecialRoom = {
      id: `bio-${this.specialRooms.length}`,
      kind: 'biolume',
      x: cx * TILE + TILE * 0.5,
      y: cy * TILE + TILE * 0.5,
      rx: rx * TILE,
      ry: ry * TILE,
      rewardClaimed: false,
    };
    this.specialRooms.push(room);
    this.seedBiolumeResources(cx, cy, rx, ry);
  }

export function injectPredatorNest(this: DeepdiveScene, cx: number, cy: number) {
    const rx = 10;
    const ry = 7;
    const chamberX = Phaser.Math.Clamp(cx + (cx < WORLD_W / 2 ? -4 : 4), 12, WORLD_W - 13);
    const chamberY = Phaser.Math.Clamp(cy + 2, Math.floor(WORLD_H * 0.52), WORLD_H - 12);
    const open = this.cellularRoomMask(chamberX, chamberY, rx, ry, 0.48, 3);
    for (const cell of open) this.setTile(cell.x, cell.y, 'water');
    this.carveWindingTunnel(cx, cy, chamberX, chamberY, 2);
    const room: SpecialRoom = {
      id: `nest-${this.specialRooms.length}`,
      kind: 'nest',
      x: chamberX * TILE + TILE * 0.5,
      y: chamberY * TILE + TILE * 0.5,
      rx: rx * TILE,
      ry: ry * TILE,
      rewardClaimed: false,
    };
    this.specialRooms.push(room);
  }

export function cellularRoomMask(this: DeepdiveScene, cx: number, cy: number, rx: number, ry: number, fillThreshold: number, iterations: number) {
    const width = rx * 2 + 1;
    const height = ry * 2 + 1;
    let cells = Array.from({ length: height }, (_, yy) =>
      Array.from({ length: width }, (_, xx) => {
        const gx = cx - rx + xx;
        const gy = cy - ry + yy;
        const nx = (gx - cx) / rx;
        const ny = (gy - cy) / ry;
        const ellipse = nx * nx + ny * ny;
        if (ellipse > 1.14) return false;
        return ellipse < 0.62 || hash(gx * 7, gy * 11, rng.seed) > fillThreshold;
      }),
    );
    for (let i = 0; i < iterations; i += 1) {
      cells = cells.map((row, yy) => row.map((cell, xx) => {
        let neighbors = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (ox === 0 && oy === 0) continue;
            if (cells[yy + oy]?.[xx + ox]) neighbors += 1;
          }
        }
        return neighbors >= 4 || (cell && neighbors >= 3);
      }));
    }
    const open: Array<{ x: number; y: number }> = [];
    for (let yy = 0; yy < height; yy += 1) {
      for (let xx = 0; xx < width; xx += 1) {
        if (!cells[yy][xx]) continue;
        const x = cx - rx + xx;
        const y = cy - ry + yy;
        if (x > 2 && x < WORLD_W - 3 && y > 8 && y < WORLD_H - 2) open.push({ x, y });
      }
    }
    return open;
  }

export function openRoomMouths(this: DeepdiveScene, cx: number, cy: number, rx: number, ry: number, radius: number) {
    this.carveDisc(cx - rx, cy, radius);
    this.carveDisc(cx + rx, cy + Math.floor(Math.sin(rng.seed) * 3), radius);
    this.carveDisc(cx, cy - ry, Math.max(1, radius - 1));
    this.carveDisc(cx, cy + ry, Math.max(1, radius - 1));
  }

export function connectRoomToNearestWater(this: DeepdiveScene, cx: number, cy: number, rx: number, ry: number) {
    let best: { x: number; y: number; distance: number } | null = null;
    const radius = Math.max(rx, ry) + 38;
    for (let y = Math.max(8, cy - radius); y <= Math.min(WORLD_H - 3, cy + radius); y += 1) {
      for (let x = Math.max(3, cx - radius); x <= Math.min(WORLD_W - 4, cx + radius); x += 1) {
        if (this.getTile(x, y) !== 'water') continue;
        const insideRoom = Math.abs((x - cx) / rx) < 1.05 && Math.abs((y - cy) / ry) < 1.05;
        if (insideRoom) continue;
        const distance = Math.hypot(x - cx, y - cy);
        if (!best || distance < best.distance) best = { x, y, distance };
      }
    }
    if (best) this.carveWindingTunnel(cx, cy, best.x, best.y, 2);
  }

export function seedBiolumeResources(this: DeepdiveScene, cx: number, cy: number, rx: number, ry: number) {
    const rareTiles: Tile[] = state.biome >= 4
      ? ['alienAlloy', 'ruinCore', 'sunstone']
      : state.biome >= 3
        ? ['sunstone', 'cobalt', 'ruby']
        : ['quartz', 'ruby', 'cobalt'];
    let placed = 0;
    for (let i = 0; i < 42 && placed < 14; i += 1) {
      const angle = hash(i, cy, rng.seed) * Math.PI * 2;
      const r = 0.72 + hash(cx, i, rng.seed) * 0.28;
      const x = Math.floor(cx + Math.cos(angle) * rx * r);
      const y = Math.floor(cy + Math.sin(angle) * ry * r);
      const tile = this.getTile(x, y);
      if (tile !== 'stone' && tile !== 'sand' && tile !== 'anchorstone') continue;
      this.setTile(x, y, rareTiles[placed % rareTiles.length]);
      placed += 1;
    }
  }

export function populateOreVeins(this: DeepdiveScene, ) {
    const rules = veinRulesForBiome();
    for (let y = 8; y < WORLD_H - 2; y += 1) {
      for (let x = 2; x < WORLD_W - 2; x += 1) {
        if (!this.canHostOre(x, y)) continue;
        const rule = veinRuleAt(x, y, rules);
        if (!rule) continue;
        this.growOreVein(x, y, rule);
      }
    }
  }

export function growOreVein(this: DeepdiveScene, startX: number, startY: number, rule: VeinRule) {
    const span = rule.maxSize - rule.minSize + 1;
    const targetSize = rule.minSize + Math.floor(hash(startX * 53, startY * 59, rng.seed) * span);
    const frontier = [{ x: startX, y: startY }];
    let placed = 0;

    while (frontier.length > 0 && placed < targetSize) {
      const index = Math.floor(hash(startX + placed * 17, startY + frontier.length * 23, rng.seed) * frontier.length) % frontier.length;
      const current = frontier.splice(index, 1)[0];
      if (!this.canHostOre(current.x, current.y)) continue;

      this.world[current.y][current.x] = rule.tile;
      this.damage[current.y][current.x] = 0;
      placed += 1;

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];
      if (hash(current.x * 31, current.y * 37, rng.seed) > 0.62) {
        neighbors.push({ x: current.x + 1, y: current.y + (hash(current.x, current.y, rng.seed) > 0.5 ? 1 : -1) });
      }

      for (const neighbor of neighbors) {
        if (!this.canHostOre(neighbor.x, neighbor.y)) continue;
        if (hash(neighbor.x * 41 + placed, neighbor.y * 43 + targetSize, rng.seed) < 0.22) continue;
        frontier.push(neighbor);
      }
    }
  }

export function reserveBobbitBurrows(this: DeepdiveScene, ) {
    this.bobbitBurrows = [];
    if (state.biome < 2) return;
    const count = state.biome >= 4 ? 2 : 1;
    const minTileY = Math.max(Math.floor(scaledDepthPx(1020) / TILE), Math.floor(WORLD_H * 0.5));
    const maxTileY = Math.min(WORLD_H - 22, Math.floor(scaledDepthPx(state.biome >= 4 ? 2550 : 2250) / TILE));
    for (let i = 0; i < count; i += 1) {
      const site = this.findBobbitBurrowSiteInBand(minTileY, maxTileY, i);
      if (!site) continue;
      const burrow = carveBobbitBurrow(this, site, i);
      this.bobbitBurrows.push(burrow);
    }
  }

export function findBobbitBurrowSiteInBand(this: DeepdiveScene, minTileY: number, maxTileY: number, salt: number) {
    const candidates: Array<{ x: number; y: number; score: number }> = [];
    for (let y = minTileY; y <= maxTileY; y += 1) {
      for (let x = 8; x < WORLD_W - 8; x += 1) {
        const score = bobbitBurrowSiteScore(this, x, y, salt);
        if (score <= 0) continue;
        candidates.push({ x, y, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    for (const candidate of candidates.slice(0, 28)) {
      if (this.bobbitBurrows.some((burrow) => Math.hypot(burrow.tileX - candidate.x, burrow.tileY - candidate.y) < 26)) continue;
      return candidate;
    }
    return null;
  }

function bobbitBurrowSiteScore(scene: DeepdiveScene, x: number, y: number, salt: number) {
    if (scene.getTile(x, y) !== 'water') return 0;
    if (scene.pointNearBobbitSpecialRoom(x, y, 17)) return 0;
    let approachWater = 0;
    let approachCells = 0;
    for (let oy = -5; oy <= 0; oy += 1) {
      for (let ox = -5; ox <= 5; ox += 1) {
        approachCells += 1;
        if (!tiles[scene.getTile(x + ox, y + oy)].solid) approachWater += 1;
      }
    }
    const approachRatio = approachWater / approachCells;
    if (approachRatio < 0.72) return 0;
    let laneWater = 0;
    let lateralWater = 0;
    for (let oy = -8; oy <= -2; oy += 1) {
      if (!tiles[scene.getTile(x, y + oy)].solid) laneWater += 1;
      if (!tiles[scene.getTile(x - 1, y + oy)].solid) lateralWater += 1;
      if (!tiles[scene.getTile(x + 1, y + oy)].solid) lateralWater += 1;
    }
    if (laneWater < 4 || lateralWater < 5) return 0;
    let shaftSolid = 0;
    let shaftCells = 0;
    for (let oy = 2; oy <= 17; oy += 1) {
      for (let ox = -2; ox <= 2; ox += 1) {
        shaftCells += 1;
        if (tiles[scene.getTile(x + ox, y + oy)].solid) shaftSolid += 1;
      }
    }
    if (shaftSolid / shaftCells < 0.68) return 0;
    const sideSolid = scene.denseSolidRatio(x, y + 11, 6, 12);
    if (sideSolid < 0.62) return 0;
    const lowerPlugSolid = scene.denseSolidRatio(x, y + 17, 4, 4);
    if (lowerPlugSolid < 0.68) return 0;
    const bottomAnchorScore = Phaser.Math.Clamp((y - Math.floor(WORLD_H * 0.5)) / Math.max(1, WORLD_H * 0.34), 0, 1) * 28;
    return bottomAnchorScore + sideSolid * 24 + lowerPlugSolid * 14 + approachRatio * 8 + hash(x * 337 + salt * 19, y * 347, rng.seed + 16001) * 4;
  }

export function pointNearBobbitSpecialRoom(this: DeepdiveScene, tileX: number, tileY: number, margin: number) {
    return this.specialRooms.some((room) => {
      const rx = room.rx / TILE + margin;
      const ry = room.ry / TILE + margin;
      const dx = tileX - room.x / TILE;
      const dy = tileY - room.y / TILE;
      return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1;
    });
  }

function carveBobbitBurrow(scene: DeepdiveScene, site: { x: number; y: number; score: number }, index: number): BobbitBurrow {
    const shaftDepth = state.biome >= 4 ? 18 : 16;
    const mouthRx = 3;
    const mouthRy = 2;
    const shaftHalf = 1;
    const bottomY = Math.min(WORLD_H - 6, site.y + shaftDepth);
    const supportTile: Tile = state.biome >= 3 ? 'anchorstone' : 'stone';
    for (let y = site.y - 2; y <= bottomY + 4; y += 1) {
      for (let x = site.x - 4; x <= site.x + 4; x += 1) {
        if (x < 2 || x >= WORLD_W - 2 || y < 8 || y >= WORLD_H - 2) continue;
        const mouth = ((x - site.x) / mouthRx) ** 2 + ((y - site.y) / mouthRy) ** 2 <= 1.15;
        const shaft = Math.abs(x - site.x) <= shaftHalf && y >= site.y && y <= bottomY;
        const pocket = ((x - site.x) / 3.2) ** 2 + ((y - bottomY) / 2.8) ** 2 <= 1.08;
        const approach = Math.abs(x - site.x) <= 5 && y >= site.y - 5 && y <= site.y - 1;
        if (mouth || shaft || pocket || approach) {
          scene.setTile(x, y, 'water');
        } else if (Math.abs(x - site.x) <= 4 && y >= site.y + 1 && y <= bottomY + 2 && scene.getTile(x, y) !== 'bedrock') {
          scene.setTile(x, y, supportTile);
        }
      }
    }
    const mouthX = site.x * TILE + TILE * 0.5;
    const mouthY = site.y * TILE + TILE * 0.54;
    const anchorY = bottomY * TILE + TILE * 0.5;
    return {
      id: `bobbit-burrow-${index}-${site.x}-${site.y}`,
      x: mouthX,
      y: anchorY,
      tileX: site.x,
      tileY: site.y,
      shaftTopY: site.y * TILE,
      shaftBottomY: (bottomY + 1) * TILE,
      anchorX: mouthX,
      anchorY,
      approachX: mouthX,
      approachY: (site.y - 3) * TILE,
      approachRadius: TILE * 7,
      bodySpaceTopY: mouthY - TILE * 1.5,
      bodySpaceBottomY: (bottomY + 3) * TILE,
      spawnCreatureId: 'abyssal-mandible-bobbit',
      occupied: false,
      triggered: false,
      cooldown: 0,
      debugScore: site.score,
    };
  }

export function reserveSignatureEncounters(this: DeepdiveScene) {
    this.encounterReservations = this.bobbitBurrows.map((burrow) => bobbitBurrowReservation(burrow));
    if (state.biome >= 3) {
      const gulper = reserveGulperArena(this);
      if (gulper) this.encounterReservations.push(gulper);
    }
    if (state.biome >= 4) {
      const wyrm = reserveReliquaryRoute(this);
      if (wyrm) this.encounterReservations.push(wyrm);
    }
    if (state.biome >= 3) {
      this.encounterReservations.push(...reserveSkulkSideTunnels(this));
    }
  }

function bobbitBurrowReservation(burrow: BobbitBurrow): EncounterReservation {
    const minTileY = Math.floor(burrow.bodySpaceTopY / TILE);
    const maxTileY = Math.floor(burrow.bodySpaceBottomY / TILE);
    return {
      id: `encounter-${burrow.id}`,
      role: 'burrow_ambush',
      creatureId: burrow.spawnCreatureId,
      biome: state.biome,
      homeX: burrow.anchorX,
      homeY: burrow.anchorY,
      tileBounds: {
        x: burrow.tileX - 6,
        y: minTileY,
        width: 13,
        height: Math.max(1, maxTileY - minTileY + 1),
      },
      depthMin: Math.max(0, (burrow.bodySpaceTopY - SURFACE_Y) / 6),
      depthMax: Math.max(0, (burrow.bodySpaceBottomY - SURFACE_Y) / 6),
      clearanceRadius: TILE * 4,
      exclusionRadius: TILE * 9,
      source: 'bobbit_burrow',
      score: burrow.debugScore,
      occupied: burrow.occupied,
      bobbitBurrowId: burrow.id,
    };
  }

function reserveGulperArena(scene: DeepdiveScene): EncounterReservation | null {
    const center = Math.floor(WORLD_W / 2);
    const minTileY = Math.floor(scaledDepthPx(1500) / TILE);
    const maxTileY = Math.floor(scaledDepthPx(2600) / TILE);
    const basinY = Math.floor(WORLD_H * 0.58);
    const homeTileY = Phaser.Math.Clamp(basinY + 8, minTileY + 10, Math.min(WORLD_H - 18, maxTileY - 10));
    const homeTileX = Phaser.Math.Clamp(center + Math.floor((hash(901, state.biome, rng.seed) - 0.5) * 18), 24, WORLD_W - 25);
    const rx = 24;
    const ry = 15;
    carveEncounterEllipse(scene, homeTileX, homeTileY, rx, ry);
    return encounterReservationFromTiles('encounter-gulper-arena-0', 'open_water_arena', 'abyssal-gulper', homeTileX, homeTileY, rx, ry, TILE * 10, TILE * 22, 'dark_basin_arena', 1);
  }

function reserveReliquaryRoute(scene: DeepdiveScene): EncounterReservation | null {
    const center = Math.floor(WORLD_W / 2);
    const minTileY = Math.floor(scaledDepthPx(1650) / TILE);
    const maxTileY = Math.floor(scaledDepthPx(2900) / TILE);
    const floors = [Math.floor(WORLD_H * 0.58) - 16, Math.floor(WORLD_H * 0.58), Math.floor(WORLD_H * 0.58) + 16, Math.floor(WORLD_H * 0.78), Math.floor(WORLD_H * 0.9)];
    const eligible = floors
      .map((y, index) => ({ y: Phaser.Math.Clamp(y, 12, WORLD_H - 12), index }))
      .filter((floor) => floor.y >= minTileY && floor.y <= maxTileY);
    const floor = eligible[eligible.length - 1] ?? { y: Phaser.Math.Clamp(Math.floor(WORLD_H * 0.78), minTileY + 8, maxTileY - 8), index: 0 };
    const side = hash(floor.index, 1907, rng.seed) > 0.5 ? 1 : -1;
    const homeTileX = Phaser.Math.Clamp(center + side * 18, 24, WORLD_W - 25);
    const homeTileY = floor.y;
    scene.carveWindingTunnel(center - 30, homeTileY, center + 30, homeTileY + (side > 0 ? 5 : -5), 4);
    carveEncounterEllipse(scene, homeTileX, homeTileY, 18, 10);
    return encounterReservationFromTiles('encounter-reliquary-route-0', 'ruin_route', 'abyssal-reliquary-wyrm', homeTileX, homeTileY, 30, 11, TILE * 11, TILE * 24, 'ruin_vault_route', floor.index);
  }

function reserveSkulkSideTunnels(scene: DeepdiveScene): EncounterReservation[] {
    const minTileY = Math.floor(scaledDepthPx(920) / TILE);
    const maxTileY = Math.floor(scaledDepthPx(2100) / TILE);
    const candidates = scene.sideTunnelPocketCandidates
      .filter((candidate) => candidate.y >= minTileY && candidate.y <= maxTileY)
      .filter((candidate) => !scene.encounterReservations.some((reservation) => pointNearReservation(reservation, candidate.x * TILE, candidate.y * TILE, reservation.exclusionRadius * 0.7)))
      .sort((a, b) => b.score - a.score);
    const reservations: EncounterReservation[] = [];
    for (const candidate of candidates) {
      if (reservations.length >= 2) break;
      if (reservations.some((reservation) => Math.hypot(reservation.homeX / TILE - candidate.x, reservation.homeY / TILE - candidate.y) < 28)) continue;
      scene.carveDisc(candidate.x, candidate.y, 5);
      reservations.push(encounterReservationFromTiles(
        `encounter-skulk-side-tunnel-${reservations.length}-${candidate.x}-${candidate.y}`,
        'side_tunnel_ambush',
        'abyssal-glasshook-skulk',
        candidate.x,
        candidate.y,
        9,
        7,
        TILE * 5.5,
        TILE * 14,
        candidate.source,
        candidate.score,
      ));
    }
    return reservations;
  }

function carveEncounterEllipse(scene: DeepdiveScene, cx: number, cy: number, rx: number, ry: number) {
    for (let y = cy - ry; y <= cy + ry; y += 1) {
      for (let x = cx - rx; x <= cx + rx; x += 1) {
        if (x < 2 || x >= WORLD_W - 2 || y < 8 || y >= WORLD_H - 2) continue;
        const nx = (x - cx) / Math.max(1, rx);
        const ny = (y - cy) / Math.max(1, ry);
        const edge = 1 + (hash(x * 271, y * 277, rng.seed + 17011) - 0.5) * 0.14;
        if (nx * nx + ny * ny <= edge) scene.setTile(x, y, 'water');
      }
    }
  }

function encounterReservationFromTiles(
    id: string,
    role: EncounterReservationRole,
    creatureId: string,
    tileX: number,
    tileY: number,
    rx: number,
    ry: number,
    clearanceRadius: number,
    exclusionRadius: number,
    source: string,
    score: number,
  ): EncounterReservation {
    return {
      id,
      role,
      creatureId,
      biome: state.biome,
      homeX: tileX * TILE + TILE * 0.5,
      homeY: tileY * TILE + TILE * 0.5,
      tileBounds: {
        x: tileX - rx,
        y: tileY - ry,
        width: rx * 2 + 1,
        height: ry * 2 + 1,
      },
      depthMin: Math.max(0, ((tileY - ry) * TILE - SURFACE_Y) / 6),
      depthMax: Math.max(0, ((tileY + ry) * TILE - SURFACE_Y) / 6),
      clearanceRadius,
      exclusionRadius,
      source,
      score,
      occupied: false,
    };
  }

export function encounterReservationForCreature(this: DeepdiveScene, creatureId: string) {
    return this.encounterReservations.find((reservation) => reservation.creatureId === creatureId && !reservation.occupied) ?? null;
  }

export function tileNearEncounterReservation(this: DeepdiveScene, reservation: EncounterReservation, x: number, y: number, margin: number) {
    return x >= reservation.tileBounds.x - margin
      && x < reservation.tileBounds.x + reservation.tileBounds.width + margin
      && y >= reservation.tileBounds.y - margin
      && y < reservation.tileBounds.y + reservation.tileBounds.height + margin;
  }

function pointNearReservation(reservation: EncounterReservation, x: number, y: number, extraRadius = 0) {
    return x >= reservation.homeX - reservation.exclusionRadius - extraRadius
      && x <= reservation.homeX + reservation.exclusionRadius + extraRadius
      && y >= reservation.homeY - reservation.exclusionRadius - extraRadius
      && y <= reservation.homeY + reservation.exclusionRadius + extraRadius
      && Phaser.Math.Distance.Between(x, y, reservation.homeX, reservation.homeY) <= reservation.exclusionRadius + extraRadius;
  }

export function pointNearEncounterReservation(this: DeepdiveScene, x: number, y: number, extraRadius = 0, exceptReservationId?: string) {
    return this.encounterReservations.some((reservation) => reservation.id !== exceptReservationId && pointNearReservation(reservation, x, y, extraRadius));
  }

function tileNearBobbitBurrow(burrow: BobbitBurrow, x: number, y: number, margin: number) {
    return x >= burrow.tileX - 6 - margin
      && x <= burrow.tileX + 6 + margin
      && y >= Math.floor(burrow.bodySpaceTopY / TILE) - margin
      && y <= Math.floor(burrow.bodySpaceBottomY / TILE) + margin;
  }

export function canHostOre(this: DeepdiveScene, x: number, y: number) {
	    const tile = this.getTile(x, y);
	    if (this.bobbitBurrows.some((burrow) => tileNearBobbitBurrow(burrow, x, y, 1))) return false;
      if (this.encounterReservations.some((reservation) => this.tileNearEncounterReservation(reservation, x, y, 1))) return false;
	    return tile === 'stone' || tile === 'sand';
	  }

export function populateEnvironmentProps(this: DeepdiveScene) {
    if (this.perfTelemetry?.enabled) {
      this.perfTelemetry.propRefresh.fullScans += 1;
      this.perfTelemetry.propRefresh.lastReason = 'full-populate';
    }
    this.environmentProps = [];
    ensureTerrainMask(this);
    const props = environmentPropsInTileBounds(this, 2, WORLD_W - 3, 8, WORLD_H - 4);
    this.environmentProps = props.slice(0, 420);
  }

export function refreshEnvironmentPropsAround(this: DeepdiveScene, cx: number, cy: number) {
    const radius = 10;
    this.environmentPropRefreshQueue.push({
      minX: Math.max(2, cx - radius),
      maxX: Math.min(WORLD_W - 3, cx + radius),
      minY: Math.max(8, cy - radius),
      maxY: Math.min(WORLD_H - 4, cy + radius),
      reason: `tile:${cx},${cy}`,
    });
    if (this.perfTelemetry?.enabled) {
      this.perfTelemetry.propRefresh.queued = this.environmentPropRefreshQueue.length;
      this.perfTelemetry.propRefresh.lastReason = `queued:${cx},${cy}`;
    }
  }

export function processEnvironmentPropRefreshQueue(this: DeepdiveScene) {
    if (!this.environmentPropRefreshQueue.length) return;
    measurePerf(this, 'props.refresh', () => {
      const queue = this.environmentPropRefreshQueue.splice(0);
      const bounds = queue.reduce((acc, entry) => ({
        minX: Math.min(acc.minX, entry.minX),
        maxX: Math.max(acc.maxX, entry.maxX),
        minY: Math.min(acc.minY, entry.minY),
        maxY: Math.max(acc.maxY, entry.maxY),
      }), { minX: WORLD_W, maxX: 0, minY: WORLD_H, maxY: 0 });
      const before = this.environmentProps.length;
      const retained = this.environmentProps.filter((prop) => (
        prop.tileX < bounds.minX || prop.tileX > bounds.maxX || prop.tileY < bounds.minY || prop.tileY > bounds.maxY
      ));
      const rebuilt = environmentPropsInTileBounds(this, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY);
      const byId = new Map<string, EnvironmentProp>();
      for (const prop of retained) byId.set(prop.id, prop);
      for (const prop of rebuilt) byId.set(prop.id, prop);
      this.environmentProps = [...byId.values()]
        .sort((a, b) => a.tileY - b.tileY || a.tileX - b.tileX || a.id.localeCompare(b.id))
        .slice(0, 420);
      if (this.perfTelemetry?.enabled) {
        this.perfTelemetry.propRefresh.queued = this.environmentPropRefreshQueue.length;
        this.perfTelemetry.propRefresh.processed += queue.length;
        this.perfTelemetry.propRefresh.removed += before - retained.length;
        this.perfTelemetry.propRefresh.added += rebuilt.length;
        this.perfTelemetry.propRefresh.lastReason = queue.length === 1 ? queue[0].reason : `merged:${queue.length}`;
      }
      markTerrainDirty(this, this.perfTelemetry?.propRefresh.lastReason ?? 'props.refresh');
    }, {
      queue: this.environmentPropRefreshQueue.length,
      props: this.environmentProps.length,
    });
  }

function environmentPropsInTileBounds(scene: DeepdiveScene, minX: number, maxX: number, minY: number, maxY: number) {
    const props: EnvironmentProp[] = [];
    const look = terrainLookForBiome();
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const tile = scene.getTile(x, y);
        if (!tiles[tile].solid || tile === 'bedrock') continue;
        if (scene.bobbitBurrows.some((burrow) => tileNearBobbitBurrow(burrow, x, y, 2))) continue;
        if (scene.encounterReservations.some((reservation) => scene.tileNearEncounterReservation(reservation, x, y, 2))) continue;
        const anchor = terrainEdgeAnchor(scene, x, y);
        if (!anchor) continue;
        const seed = hash(x * 149, y * 157, rng.seed + 8011);
        if (isOreTile(tile)) continue;
        const baseChance = anchor.kind === 'ceiling' ? 0.015 : anchor.kind === 'floor' ? 0.095 : 0.05;
        const floraChance = 1 - Phaser.Math.Clamp(baseChance * look.edgeStampDensity, 0.01, 0.14);
        if (seed > floraChance && maskTileHasStableFloraFooting(scene, x, y, anchor)) {
          props.push(edgeFloraProp(scene, x, y, anchor));
        }
      }
    }
    return props;
  }

export function refreshFloraAnchorsAround(this: DeepdiveScene, cx: number, cy: number, radiusTiles = 5) {
    const worldX = cx * TILE + TILE * 0.5;
    const worldY = cy * TILE + TILE * 0.5;
    const radius = radiusTiles * TILE;
    for (const flora of this.flora) {
      if (flora.dead || !flora.surface) continue;
      if (Phaser.Math.Distance.Between(worldX, worldY, flora.surface.rootX, flora.surface.rootY) > radius + flora.radius) continue;
      const validation = validateTerrainSurfaceAnchor(this, flora.surface);
      const next = validation.valid ? validation.anchor : findNearbyTerrainSurfaceAnchor(this, flora.surface, 8);
      if (!next) {
        flora.dead = true;
        flora.sprite?.setVisible(false);
        continue;
      }
      const offset = floraSurfaceOffset(next);
      flora.surface = next;
      flora.anchor = next.anchor;
      flora.x = next.rootX + offset.x;
      flora.y = next.rootY + offset.y;
      flora.sprite?.setPosition(flora.x, flora.y);
    }
  }

export function refreshFaunaAnchorsAround(this: DeepdiveScene, cx: number, cy: number, radiusTiles = 5) {
    const worldX = cx * TILE + TILE * 0.5;
    const worldY = cy * TILE + TILE * 0.5;
    const radius = radiusTiles * TILE;
    for (const fish of this.fish) {
      if (fish.dead || fish.behaviorClass === 'legacySwimmer' || !fish.surface) continue;
      if (Phaser.Math.Distance.Between(worldX, worldY, fish.surface.rootX, fish.surface.rootY) > radius + fish.radius) continue;
      const validation = validateTerrainSurfaceAnchor(this, fish.surface);
      const next = validation.valid ? validation.anchor : findNearbyTerrainSurfaceAnchor(this, fish.surface, 8);
      if (!next) {
        fish.dead = true;
        fish.sprite?.setVisible(false);
        continue;
      }
      fish.surface = next;
      fish.anchor = next.anchor;
      fish.fallbackNoAnchor = false;
      positionFaunaOnSurface(fish, next);
    }
  }

type EdgeAnchor = {
  kind: 'floor' | 'ceiling' | 'leftWall' | 'rightWall';
  x: number;
  y: number;
  rotation: number;
};

function terrainEdgeAnchor(scene: DeepdiveScene, tileX: number, tileY: number): EdgeAnchor | null {
    const baseX = tileX * TERRAIN_MASK_RES;
    const baseY = tileY * TERRAIN_MASK_RES;
    const open = {
      floor: 0,
      ceiling: 0,
      leftWall: 0,
      rightWall: 0,
    };
    for (let i = 0; i < TERRAIN_MASK_RES; i += 1) {
      if (terrainMaskDensityAt(scene, baseX + i, baseY - 1) < TERRAIN_MASK_SOLID_THRESHOLD) open.floor += 1;
      if (terrainMaskDensityAt(scene, baseX + i, baseY + TERRAIN_MASK_RES) < TERRAIN_MASK_SOLID_THRESHOLD) open.ceiling += 1;
      if (terrainMaskDensityAt(scene, baseX - 1, baseY + i) < TERRAIN_MASK_SOLID_THRESHOLD) open.leftWall += 1;
      if (terrainMaskDensityAt(scene, baseX + TERRAIN_MASK_RES, baseY + i) < TERRAIN_MASK_SOLID_THRESHOLD) open.rightWall += 1;
    }
    const entries = Object.entries(open) as Array<[EdgeAnchor['kind'], number]>;
    const [kind, score] = entries.sort((a, b) => b[1] - a[1])[0];
    if (score < Math.ceil(TERRAIN_MASK_RES * 0.72)) return null;
    const jitterX = (hash(tileX, tileY, rng.seed + 8021) - 0.5) * 10;
    const jitterY = (hash(tileY, tileX, rng.seed + 8023) - 0.5) * 10;
    if (kind === 'floor') return { kind, x: tileX * TILE + TILE * 0.5 + jitterX, y: tileY * TILE + 4 + jitterY * 0.3, rotation: (hash(tileX, tileY, rng.seed + 8025) - 0.5) * 0.16 };
    if (kind === 'ceiling') return { kind, x: tileX * TILE + TILE * 0.5 + jitterX, y: (tileY + 1) * TILE - 4 + jitterY * 0.3, rotation: Math.PI + (hash(tileX, tileY, rng.seed + 8027) - 0.5) * 0.16 };
    if (kind === 'leftWall') return { kind, x: tileX * TILE + 3 + jitterX * 0.3, y: tileY * TILE + TILE * 0.5 + jitterY, rotation: -Math.PI * 0.5 + (hash(tileX, tileY, rng.seed + 8029) - 0.5) * 0.22 };
    return { kind, x: (tileX + 1) * TILE - 3 + jitterX * 0.3, y: tileY * TILE + TILE * 0.5 + jitterY, rotation: Math.PI * 0.5 + (hash(tileX, tileY, rng.seed + 8031) - 0.5) * 0.22 };
  }

function edgeFloraProp(scene: DeepdiveScene, x: number, y: number, anchor: EdgeAnchor): EnvironmentProp {
    const keys = floraAccentKeys();
    const variant = Math.floor(hash(x * 163, y * 167, rng.seed + 8051) * keys.length) % keys.length;
    const isMat = keys[variant].includes('-fringe-');
    const size = (isMat ? 19 : 22) + hash(y, x, rng.seed + 8053) * (state.biome >= 3 ? 12 : 10);
    const orientation = edgePropOrientation(anchor);
    const insetX = anchor.kind === 'leftWall' ? 8 : anchor.kind === 'rightWall' ? -8 : 0;
    const insetY = anchor.kind === 'floor' ? 11 : anchor.kind === 'ceiling' ? -11 : 0;
    const floorScale = anchor.kind === 'floor' || anchor.kind === 'ceiling' ? 1 : 0.78;
    return {
      id: `edge-flora:${x}:${y}:${variant}`,
      kind: 'flora',
      assetKey: keys[variant],
      x: anchor.x + insetX,
      y: anchor.y + insetY,
      tileX: x,
      tileY: y,
      tile: scene.getTile(x, y),
      width: size * (isMat ? 1.45 : anchor.kind === 'floor' ? 1.16 : 0.94) * floorScale,
      height: size * (isMat ? 0.62 : anchor.kind === 'floor' ? 0.98 : 0.9) * floorScale,
      rotation: anchor.rotation + (hash(x, y, rng.seed + 8057) - 0.5) * (isMat ? 0.08 : 0.16),
      alpha: isMat ? 0.74 : state.biome >= 3 ? 0.86 : 0.82,
      depth: 0.94,
      originX: orientation.originX,
      originY: orientation.originY,
      flipX: hash(x, y, rng.seed + 8055) > 0.5,
      flipY: orientation.flipY,
    };
  }

function edgePropOrientation(anchor: EdgeAnchor) {
    if (anchor.kind === 'floor') return { originX: 0.5, originY: 0.82, flipY: false };
    if (anchor.kind === 'ceiling') return { originX: 0.5, originY: 0.18, flipY: true };
    if (anchor.kind === 'leftWall') return { originX: 0.78, originY: 0.5, flipY: false };
    return { originX: 0.22, originY: 0.5, flipY: false };
  }

function floraAccentKeys() {
    const look = terrainLookForBiome();
    return [...look.fringeStampPool, ...look.floraStampPool];
  }

function maskTileHasStableFloraFooting(scene: DeepdiveScene, tileX: number, tileY: number, anchor: EdgeAnchor) {
    const baseX = tileX * TERRAIN_MASK_RES;
    const baseY = tileY * TERRAIN_MASK_RES;
    let solid = 0;
    const centerStart = Math.floor(TERRAIN_MASK_RES * 0.25);
    const centerEnd = Math.ceil(TERRAIN_MASK_RES * 0.75);
    for (let i = centerStart; i < centerEnd; i += 1) {
      const sx = anchor.kind === 'leftWall' ? baseX + 1 : anchor.kind === 'rightWall' ? baseX + TERRAIN_MASK_RES - 2 : baseX + i;
      const sy = anchor.kind === 'floor' ? baseY + 1 : anchor.kind === 'ceiling' ? baseY + TERRAIN_MASK_RES - 2 : baseY + i;
      if (terrainMaskDensityAt(scene, sx, sy) >= TERRAIN_MASK_SOLID_THRESHOLD) solid += 1;
    }
    return solid >= Math.max(2, Math.floor((centerEnd - centerStart) * 0.62));
  }

export function makeBobbits(this: DeepdiveScene, ): Bobbit[] {
    const bobbits: Bobbit[] = [];
    const count = state.biome === 4 ? 16 : state.biome === 3 ? 12 : 8;
    for (let i = 0; i < count; i += 1) {
      const point = this.findRockTopAnchorInBand(scaledDepthPx(360 + i * 86), scaledDepthPx(2380));
      bobbits.push({
        x: point.x,
        y: point.y + 2,
        homeX: point.x,
        homeY: point.y + 2,
        latchX: point.x,
        latchY: point.y + 2,
        facingSign: 1,
        phase: Math.random() * Math.PI * 2,
        state: 'hidden',
        timer: 0,
        escapeRemaining: BOBBIT_ESCAPE_SECONDS,
        cooldown: Phaser.Math.FloatBetween(0, 2.5),
        sprite: this.createEntitySprite(point.x, point.y + 2, 'bobbit-0').setDepth(2.2).setOrigin(0.5, 1),
      });
    }
    return bobbits;
  }

export function makeSchool(this: DeepdiveScene, species: FishSpecies): Fish[] {
    const school: Fish[] = [];
    const profile = fishBehaviorProfile(species);
    for (let i = 0; i < species.count; i += 1) {
      const point = profile.behaviorClass === 'legacySwimmer'
        ? this.findOpenWaterInBand(scaledDepthPx(species.minY), scaledDepthPx(species.maxY))
        : this.findFaunaAnchorInBand(scaledDepthPx(species.minY), scaledDepthPx(species.maxY), i, species);
      const faunaPoint = point as { x: number; y: number; surface?: TerrainSurfaceAnchor; rootOffsetX?: number; rootOffsetY?: number };
      const angle = Math.random() * Math.PI * 2;
      const assetKey = fishAssetKey(species);
      const facingSign = Math.cos(angle) < 0 ? -1 : 1;
      const radius = scaledEntity(species.radius);
      const surface = faunaPoint.surface;
      const x = faunaPoint.x;
      const y = faunaPoint.y;
      school.push({
        kind: 'fish',
        species: species.species,
        x,
        y,
        vx: profile.behaviorClass === 'legacySwimmer' ? Math.cos(angle) * species.speed[0] : 0,
        vy: profile.behaviorClass === 'legacySwimmer' ? Math.sin(angle) * species.speed[0] : 0,
        homeX: surface ? surface.rootX : point.x,
        homeY: surface ? surface.rootY : point.y,
        speed: Phaser.Math.FloatBetween(species.speed[0], species.speed[1]),
        phase: Math.random() * Math.PI * 2,
        color: species.color,
        hostile: species.hostile,
        scanned: false,
        scan: 0,
        scanning: false,
        scanPulse: 0,
        radius,
        pattern: species.pattern,
        bumpCooldown: 0,
        aggro: 0,
        aggroCue: 0,
        stunned: 0,
        hp: fishMaxHp(species),
        maxHp: fishMaxHp(species),
        dead: false,
        hurtFlash: 0,
        assetKey,
        facingSign,
        visualAngle: angle,
        visualFacingSign: facingSign,
        behaviorClass: profile.behaviorClass,
        terrainAffinity: profile.terrainAffinity,
        surface,
        anchor: surface?.anchor,
        anchorOffsetX: surface ? x - surface.rootX : 0,
        anchorOffsetY: surface ? y - surface.rootY : 0,
        anchorRefreshTimer: Phaser.Math.FloatBetween(2, 5),
        rootX: surface?.rootX ?? x,
        rootY: surface?.rootY ?? y,
        rootOffsetX: surface ? faunaPoint.rootOffsetX ?? 0 : 0,
        rootOffsetY: surface ? faunaPoint.rootOffsetY ?? 0 : 0,
        retract: 0,
        tetherRadius: scaledEntity(profile.tetherRadius),
        walkDir: hash(i * 37, species.species.length * 53, rng.seed + 8501) > 0.5 ? 1 : -1,
        walkPause: profile.behaviorClass === 'benthicWalker' ? Phaser.Math.FloatBetween(0.2, 1.6) : 0,
        lungeTimer: 0,
        recoverTimer: 0,
        grounded: Boolean(surface),
        fallbackNoAnchor: !surface && profile.behaviorClass !== 'legacySwimmer',
        sprite: this.createEntitySprite(x, y, assetKey),
      });
    }
    return school;
  }

function positionFaunaOnSurface(fish: Fish, anchor: TerrainSurfaceAnchor) {
    const offsetX = fish.anchorOffsetX ?? anchor.normalX * (fish.radius * 0.55);
    const offsetY = fish.anchorOffsetY ?? anchor.normalY * (fish.radius * 0.55);
    fish.rootX = anchor.rootX;
    fish.rootY = anchor.rootY;
    fish.homeX = anchor.rootX;
    fish.homeY = anchor.rootY;
    fish.x = anchor.rootX + offsetX;
    fish.y = anchor.rootY + offsetY;
    fish.vx = 0;
    fish.vy = 0;
    fish.sprite?.setPosition(fish.x, fish.y);
  }

export function makeFloraPatch(this: DeepdiveScene, species: FloraSpecies): Flora[] {
    const patch: Flora[] = [];
    for (let i = 0; i < species.count; i += 1) {
      const point = this.findFloraAnchorInBand(scaledDepthPx(species.minY), scaledDepthPx(species.maxY), i, species);
      if (!point) continue;
      const offset = floraSurfaceOffset(point);
      const x = point.rootX + offset.x;
      const y = point.rootY + offset.y;
      const assetKey = floraGameplayAssetKey(species);
      this.environmentProps = this.environmentProps.filter((prop) => prop.kind !== 'flora' || prop.tileX !== point.tileX || prop.tileY !== point.tileY);
      patch.push({
        kind: 'flora',
        species: species.species,
        x,
        y,
        anchor: point.anchor,
        phase: hash(point.maskSx + i * 31, point.maskSy, rng.seed + 9111) * Math.PI * 2,
        color: species.color,
        hazardous: species.hazardous,
        rare: species.rare,
        scanned: false,
        scan: 0,
        scanning: false,
        scanPulse: 0,
        hp: floraMaxHp(species),
        maxHp: floraMaxHp(species),
        dead: false,
        hurtFlash: 0,
        aggroCue: 0,
        radius: scaledEntity(species.radius),
        assetKey,
        surface: point,
        sprite: this.createEntitySprite(x, y, assetKey),
      });
    }
    return patch;
  }

function floraSurfaceOffset(anchor: TerrainSurfaceAnchor) {
    const tangentJitter = (hash(anchor.maskSx * 23, anchor.maskSy * 29, rng.seed + 9101) - 0.5) * 10;
    const outward = 5 + hash(anchor.maskSy, anchor.maskSx, rng.seed + 9103) * 4;
    return {
      x: anchor.normalX * outward + anchor.tangentX * tangentJitter,
      y: anchor.normalY * outward + anchor.tangentY * tangentJitter,
    };
  }

function floraGameplayAssetKey(species: FloraSpecies) {
    if (species.species === 'Glass Kelp') return 'terrain-edge-flora-glass-kelp';
    if (species.species === 'Brine Grass') return 'terrain-edge-flora-brine-grass';
    if (species.species === 'Black Fan') return 'terrain-edge-flora-black-fan';
    if (species.species === 'Lumen Fern') return 'terrain-edge-flora-lumen-fern';
    if (species.species === 'Crown Polyp') return 'terrain-edge-flora-crown-polyps';
    if (species.species === 'Oracle Polyp') return 'terrain-edge-flora-oracle-tendrils';
    return floraAssetKey(species);
  }

export function populateSpecialRooms(this: DeepdiveScene, ) {
    for (const room of this.specialRooms) {
      if (room.kind === 'biolume') this.populateBiolumeRoom(room);
      if (room.kind === 'nest') this.populateNestRoom(room);
    }
  }

export function populateBiolumeRoom(this: DeepdiveScene, room: SpecialRoom) {
    const count = state.biome >= 3 ? 18 : 12;
    let primaryOxygenPlant: { x: number; y: number } | null = null;
    for (let i = 0; i < count; i += 1) {
      const anchor = this.findRoomFloraAnchor(room, i);
      if (!anchor) continue;
      const offset = floraSurfaceOffset(anchor);
      const x = anchor.rootX + offset.x;
      const y = anchor.rootY + offset.y;
      const oxygen = i % 3 !== 2;
      if (oxygen && !primaryOxygenPlant) primaryOxygenPlant = { x, y };
      const assetKey = oxygen
        ? (i % 2 === 0 ? 'flora-oxygen-kelp' : 'flora-oxygen-bulb')
        : 'terrain-edge-flora-lumen-fern';
      this.flora.push({
        kind: 'flora',
        species: oxygen ? 'Oxygen Bloom' : 'Lumen Fern',
        x,
        y,
        anchor: anchor.anchor,
        phase: hash(anchor.maskSx + i * 37, anchor.maskSy, rng.seed + 9121) * Math.PI * 2,
        color: oxygen ? 0x8ee7f4 : 0xb9f27c,
        hazardous: false,
        rare: true,
        scanned: false,
        scan: 0,
        scanning: false,
        scanPulse: 0,
        hp: floraMaxHp({ species: oxygen ? 'Oxygen Bloom' : 'Lumen Fern', count, minY: 0, maxY: 0, color: oxygen ? 0x8ee7f4 : 0xb9f27c, hazardous: false, rare: true, radius: oxygen ? 15 : 13 }),
        maxHp: floraMaxHp({ species: oxygen ? 'Oxygen Bloom' : 'Lumen Fern', count, minY: 0, maxY: 0, color: oxygen ? 0x8ee7f4 : 0xb9f27c, hazardous: false, rare: true, radius: oxygen ? 15 : 13 }),
        dead: false,
        hurtFlash: 0,
        aggroCue: 0,
        radius: scaledEntity(oxygen ? 15 : 13),
        assetKey,
        surface: anchor,
        sprite: this.createEntitySprite(x, y, assetKey).setDepth(2.05),
      });
    }
    if (primaryOxygenPlant) {
      room.effectX = primaryOxygenPlant.x;
      room.effectY = primaryOxygenPlant.y;
    }
    for (let i = 0; i < 6; i += 1) {
      const anchor = this.findRoomFloraAnchor(room, i + 120);
      if (!anchor) continue;
      const offset = floraSurfaceOffset(anchor);
      const assetKey = i % 3 === 2 ? 'biolume-crystal' : `biolume-rock-${i % 2}`;
      this.flora.push({
        kind: 'flora',
        species: 'Lumen Nodule',
        x: anchor.rootX + offset.x,
        y: anchor.rootY + offset.y,
        anchor: anchor.anchor,
        phase: hash(anchor.maskSx + i * 41, anchor.maskSy, rng.seed + 9127) * Math.PI * 2,
        color: 0x73fbd3,
        hazardous: false,
        rare: true,
        scanned: false,
        scan: 0,
        scanning: false,
        scanPulse: 0,
        hp: floraMaxHp({ species: 'Lumen Nodule', count: 6, minY: 0, maxY: 0, color: 0x73fbd3, hazardous: false, rare: true, radius: 11 }),
        maxHp: floraMaxHp({ species: 'Lumen Nodule', count: 6, minY: 0, maxY: 0, color: 0x73fbd3, hazardous: false, rare: true, radius: 11 }),
        dead: false,
        hurtFlash: 0,
        aggroCue: 0,
        radius: scaledEntity(11),
        assetKey,
        surface: anchor,
        sprite: this.createEntitySprite(anchor.rootX + offset.x, anchor.rootY + offset.y, assetKey).setDepth(2.02),
      });
    }
  }

export function findRoomFloraAnchor(this: DeepdiveScene, room: SpecialRoom, salt: number) {
    const candidates = roomFloraAnchorCandidates(this, room, salt);
    if (candidates.length) return candidates[salt % candidates.length];
    if (!createRoomFloraSupport(this, room, salt)) return null;
    const repaired = roomFloraAnchorCandidates(this, room, salt + 911);
    return repaired.length ? repaired[salt % repaired.length] : null;
  }

function roomFloraAnchorCandidates(scene: DeepdiveScene, room: SpecialRoom, salt: number) {
    const candidates = sampleTerrainSurfaceAnchors(scene, {
      minY: room.y - room.ry - TILE,
      maxY: room.y + room.ry + TILE,
      salt: salt + Math.floor(room.x) * 3 + Math.floor(room.y) * 5,
      prefer: ['floor', 'leftWall', 'rightWall', 'ceiling'],
      minSupport: 9,
      minClearance: 2,
      limit: 160,
    }).filter((anchor) => {
      const nx = (anchor.rootX - room.x) / Math.max(1, room.rx + TILE);
      const ny = (anchor.rootY - room.y) / Math.max(1, room.ry + TILE);
      return nx * nx + ny * ny <= 1.28;
    });
    return candidates;
  }

function createRoomFloraSupport(scene: DeepdiveScene, room: SpecialRoom, salt: number) {
    const cx = Math.floor(room.x / TILE);
    const cy = Math.floor(room.y / TILE);
    const rx = Math.max(4, Math.floor(room.rx / TILE));
    const ry = Math.max(3, Math.floor(room.ry / TILE));
    const candidates: Array<{ x: number; y: number; score: number }> = [];
    for (let y = Math.max(8, cy - ry + 1); y <= Math.min(WORLD_H - 3, cy + ry - 1); y += 1) {
      for (let x = Math.max(3, cx - rx + 1); x <= Math.min(WORLD_W - 4, cx + rx - 1); x += 1) {
        if (scene.getTile(x, y) !== 'water') continue;
        if (scene.getTile(x, y - 1) !== 'water') continue;
        if (scene.getTile(x, y + 1) !== 'water') continue;
        const nx = (x - cx) / Math.max(1, rx);
        const ny = (y - cy) / Math.max(1, ry);
        if (nx * nx + ny * ny > 0.94) continue;
        const lowerRoomBias = Phaser.Math.Clamp((ny + 0.35) * 0.5, 0, 1);
        candidates.push({ x, y, score: hash(x + salt * 53, y + salt * 59, rng.seed + 9341) + lowerRoomBias });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const pick = candidates[0];
    if (!pick) return false;
    scene.setTile(pick.x, pick.y, 'water');
    scene.setTile(pick.x, pick.y - 1, 'water');
    for (let ox = -1; ox <= 1; ox += 1) {
      scene.setTile(pick.x + ox, pick.y + 1, 'stone');
      scene.setTile(pick.x + ox, pick.y + 2, 'stone');
    }
    rebuildTerrainMask(scene);
    return true;
  }

export function populateNestRoom(this: DeepdiveScene, room: SpecialRoom) {
    const adultCount = state.biome >= 3 ? 2 : 1;
    for (let i = 0; i < adultCount; i += 1) {
      const angle = (i / Math.max(1, adultCount)) * Math.PI * 2 + hash(i, 991, rng.seed);
      const species: FishSpecies = {
        species: i === 0 ? 'Abyssal Thresher' : 'Mantle Crawler',
        count: 1,
        minY: 0,
        maxY: 0,
        color: i === 0 ? 0xff4f64 : 0xd06bff,
        hostile: true,
        pattern: i === 0 ? 'stalk' : 'circle',
        radius: state.biome >= 3 ? 24 : 20,
        speed: state.biome >= 3 ? [44, 78] : [36, 66],
        assetKey: i === 0 ? 'fauna-abyss-viperfish' : 'fish-abyss-predator',
      };
      const assetKey = fishAssetKey(species);
      const x = room.x + Math.cos(angle) * room.rx * 0.42;
      const y = room.y + Math.sin(angle) * room.ry * 0.35;
      const facingSign = Math.cos(angle) < 0 ? -1 : 1;
      this.fish.push({
        kind: 'fish',
        species: species.species,
        x,
        y,
        vx: Math.cos(angle) * species.speed[0],
        vy: Math.sin(angle) * species.speed[0],
        homeX: x,
        homeY: y,
        speed: Phaser.Math.FloatBetween(species.speed[0], species.speed[1]),
        phase: Math.random() * Math.PI * 2,
        color: species.color,
        hostile: true,
        scanned: false,
        scan: 0,
        scanning: false,
        scanPulse: 0,
        radius: scaledEntity(species.radius),
        pattern: species.pattern,
        bumpCooldown: 0,
        aggro: 2.5,
        aggroCue: 0.9,
        stunned: 0,
        hp: fishMaxHp(species) * 1.25,
        maxHp: fishMaxHp(species) * 1.25,
        dead: false,
        hurtFlash: 0,
        assetKey,
        facingSign,
        visualAngle: angle,
        visualFacingSign: facingSign,
        sprite: this.createEntitySprite(x, y, assetKey).setDepth(2.15),
      });
    }

    const eggs = Phaser.Math.Between(5, 8);
    for (let i = 0; i < eggs; i += 1) {
      const anchor = this.findRoomFloorAnchor(room, i + 50);
      this.nestEggs.push({
        roomId: room.id,
        x: anchor.x + Phaser.Math.FloatBetween(-6, 6),
        y: anchor.y - scaledEntity(5),
        radius: scaledEntity(14),
        state: 'dormant',
        hatch: 0,
        hp: EGG_HP,
        phase: Math.random() * Math.PI * 2,
        sprite: this.createEntitySprite(anchor.x, anchor.y, 'nest-egg-0').setDepth(2.05).setOrigin(0.5, 0.82),
      });
    }
  }

export function findRoomFloorAnchor(this: DeepdiveScene, room: SpecialRoom, salt: number) {
    const cx = Math.floor(room.x / TILE);
    const cy = Math.floor(room.y / TILE);
    const rx = Math.max(4, Math.floor(room.rx / TILE));
    const ry = Math.max(3, Math.floor(room.ry / TILE));
    const candidates: Array<{ x: number; y: number; score: number }> = [];
    for (let y = Math.max(8, cy - ry); y <= Math.min(WORLD_H - 3, cy + ry); y += 1) {
      for (let x = Math.max(3, cx - rx); x <= Math.min(WORLD_W - 4, cx + rx); x += 1) {
        if (this.getTile(x, y) !== 'water') continue;
        if (!tiles[this.getTile(x, y + 1)].solid) continue;
        const nx = (x - cx) / Math.max(1, rx);
        const ny = (y - cy) / Math.max(1, ry);
        if (nx * nx + ny * ny > 1.08) continue;
        const lowerRoomBias = Phaser.Math.Clamp((ny + 0.25) * 0.5, 0, 1);
        candidates.push({ x, y, score: hash(x + salt * 17, y + salt * 31, rng.seed) + lowerRoomBias });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length) {
      const pick = candidates[salt % candidates.length];
      return { x: pick.x * TILE + TILE * 0.5, y: (pick.y + 1) * TILE + 2 };
    }
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const x = Phaser.Math.Clamp(cx + Math.floor((hash(salt + attempt, cx, rng.seed) - 0.5) * rx * 1.6), 3, WORLD_W - 4);
      const y = Phaser.Math.Clamp(cy + Math.floor((0.1 + hash(cy, salt + attempt, rng.seed) * 0.82) * ry), 8, WORLD_H - 3);
      if (this.getTile(x, y) !== 'water' || this.getTile(x, y - 1) !== 'water') continue;
      this.setTile(x, y + 1, 'stone');
      if (hash(x, y, rng.seed) > 0.35) this.setTile(x - 1, y + 1, 'stone');
      if (hash(y, x, rng.seed) > 0.35) this.setTile(x + 1, y + 1, 'stone');
      this.setTile(x, y, 'water');
      return { x: x * TILE + TILE * 0.5, y: (y + 1) * TILE + 2 };
    }
    const x = Phaser.Math.Clamp(cx, 3, WORLD_W - 4);
    const y = Phaser.Math.Clamp(cy + Math.floor(ry * 0.45), 8, WORLD_H - 3);
    this.setTile(x, y, 'water');
    this.setTile(x, y + 1, 'stone');
    return { x: x * TILE + TILE * 0.5, y: (y + 1) * TILE + 2 };
  }

export function findFloraAnchorInBand(this: DeepdiveScene, minY: number, maxY: number, salt = 0, species?: FloraSpecies) {
    const prefer = floraSurfacePreferences(species);
    return findTerrainSurfaceAnchorInBand(this, minY, maxY, salt, prefer);
  }

export function findFaunaAnchorInBand(this: DeepdiveScene, minY: number, maxY: number, salt = 0, species: FishSpecies): { x: number; y: number; surface?: TerrainSurfaceAnchor; rootOffsetX: number; rootOffsetY: number } {
    const profile = fishBehaviorProfile(species);
    const strictCandidates = sampleTerrainSurfaceAnchors(this, {
      minY,
      maxY,
      salt: salt + 7301,
      prefer: profile.preferredAnchors,
      limit: 120,
    }).filter((anchor) => profile.preferredAnchors.includes(anchor.anchor));
    const surface = strictCandidates.length
      ? strictCandidates[salt % strictCandidates.length]
      : findTerrainSurfaceAnchorInBand(this, minY, maxY, salt + 7301, profile.preferredAnchors);
    if (!surface) {
      const fallback = this.findOpenWaterInBand(minY, maxY);
      return { x: fallback.x, y: fallback.y, rootOffsetX: 0, rootOffsetY: 0 };
    }
    const offset = faunaSurfaceOffset(surface, profile, salt, species.radius);
    return {
      x: surface.rootX + offset.x,
      y: surface.rootY + offset.y,
      surface,
      rootOffsetX: offset.rootOffset,
      rootOffsetY: 0,
    };
  }

function faunaSurfaceOffset(anchor: TerrainSurfaceAnchor, profile: FaunaBehaviorProfile, salt: number, speciesRadius: number) {
    const tangentJitter = (hash(anchor.maskSx * 19 + salt * 11, anchor.maskSy * 23, rng.seed + 9211) - 0.5) * scaledEntity(profile.tetherRadius * 0.75);
    const outward = scaledEntity(profile.clearance + speciesRadius * (profile.behaviorClass === 'verticalAnchored' ? 0.95 : 0.58));
    return {
      x: anchor.normalX * outward + anchor.tangentX * tangentJitter,
      y: anchor.normalY * outward + anchor.tangentY * tangentJitter,
      rootOffset: tangentJitter,
    };
  }

export function findVentAnchorInBand(this: DeepdiveScene, minY: number, maxY: number, salt = 0) {
    return findTerrainSurfaceAnchorInBand(this, minY, maxY, salt + 3301, ['floor', 'leftWall', 'rightWall', 'ceiling']);
  }

function floraSurfacePreferences(species?: FloraSpecies): TerrainSurfaceAnchor['anchor'][] {
    if (!species) return ['floor', 'leftWall', 'rightWall', 'ceiling'];
    if (species.species.includes('Kelp') || species.species.includes('Grass') || species.species.includes('Bloom')) {
      return ['floor', 'leftWall', 'rightWall'];
    }
    if (species.species.includes('Sponge') || species.species.includes('Fan') || species.species.includes('Coral') || species.species.includes('Polyp')) {
      return ['leftWall', 'rightWall', 'ceiling', 'floor'];
    }
    return ['floor', 'leftWall', 'rightWall', 'ceiling'];
  }

export function findRockTopAnchorInBand(this: DeepdiveScene, minY: number, maxY: number) {
    for (let attempt = 0; attempt < 220; attempt += 1) {
      const tx = Phaser.Math.Between(4, WORLD_W - 5);
      const ty = Math.floor(Phaser.Math.Between(minY, maxY) / TILE);
      if (ty < 2 || ty >= WORLD_H - 3) continue;
      if (this.getTile(tx, ty) !== 'water') continue;
      if (this.getTile(tx, ty - 1) !== 'water') continue;
      if (!tiles[this.getTile(tx, ty + 1)].solid) continue;
      return { x: tx * TILE + TILE * 0.5, y: (ty + 1) * TILE + 2 };
    }
    return this.findFloraAnchorInBand(minY, maxY) ?? this.findOpenWaterInBand(minY, maxY);
  }

export function findOpenWaterInBand(this: DeepdiveScene, minY: number, maxY: number) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const tx = Phaser.Math.Between(4, WORLD_W - 5);
      const ty = Math.floor(Phaser.Math.Between(minY, maxY) / TILE);
      if (this.getTile(tx, ty) === 'water') {
        return { x: tx * TILE + TILE * 0.5, y: ty * TILE + TILE * 0.5 };
      }
    }
    return { x: WORLD_W * TILE * 0.5 + Phaser.Math.Between(-180, 180), y: Phaser.Math.Between(minY, maxY) };
  }

export function carveStarterCaverns(this: DeepdiveScene, center: number) {
    const rooms = [
      { x: center - 18, y: 18, rx: 14, ry: 7 },
      { x: center + 17, y: 22, rx: 16, ry: 8 },
      { x: center - 8, y: 34, rx: 18, ry: 9 },
      { x: center + 13, y: 43, rx: 14, ry: 7 },
    ];

    for (let y = 6; y < 58; y += 1) {
      const drift = Math.sin(y * 0.21 + rng.seed) * 6 + Math.sin(y * 0.07) * 4;
      const halfWidth = Math.max(4, 10 - y * 0.08);
      for (let x = Math.floor(center + drift - halfWidth); x <= Math.ceil(center + drift + halfWidth); x += 1) {
        this.setTile(x, y, 'water');
      }
    }

    for (const room of rooms) {
      for (let y = Math.floor(room.y - room.ry); y <= Math.ceil(room.y + room.ry); y += 1) {
        for (let x = Math.floor(room.x - room.rx); x <= Math.ceil(room.x + room.rx); x += 1) {
          const nx = (x - room.x) / room.rx;
          const ny = (y - room.y) / room.ry;
          if (nx * nx + ny * ny < 1 + hash(x, y, rng.seed) * 0.18) {
            this.setTile(x, y, 'water');
          }
        }
      }
    }
  }

export function carveDeepTunnelNetwork(this: DeepdiveScene, center: number) {
    const startY = Math.floor(56 * deepScale);
    const endY = WORLD_H - 10;
    const basinY = Math.floor(WORLD_H * 0.58);
    const basinRy = state.biome >= 3 ? 24 : 20;
    const tunnelRadius = state.biome >= 2 ? 2 : 1;
    const upperLanes = this.carveTunnelBand(startY, basinY - basinRy - 6, state.biome >= 3 ? 5 : 4, tunnelRadius, center, 0);
    this.carveDarkBasin(center, basinY, state.biome >= 3 ? 34 : 30, basinRy);
    const lowerLanes = this.carveTunnelBand(basinY + basinRy + 6, endY, state.biome === 4 ? 7 : state.biome === 3 ? 6 : 5, tunnelRadius, center, 100);

    for (let i = 0; i < 5; i += 1) {
      const upper = upperLanes[Math.max(0, upperLanes.length - 1)];
      const lower = lowerLanes[0];
      const from = this.pickLanePoint(upper.points, 300 + i * 13);
      const basinX = Phaser.Math.Clamp(center + Math.floor((hash(i, 302, rng.seed) - 0.5) * 48), 8, WORLD_W - 9);
      this.carveWindingTunnel(from.x, from.y, basinX, basinY - basinRy + 4, tunnelRadius);
      const to = this.pickLanePoint(lower.points, 420 + i * 17);
      this.carveWindingTunnel(basinX, basinY + basinRy - 4, to.x, to.y, tunnelRadius);
    }

    if (state.biome === 4) {
      this.carveRuinVaults(center, basinY);
    }
  }

export function carveTunnelBand(this: DeepdiveScene, startY: number, endY: number, laneCount: number, tunnelRadius: number, center: number, salt: number) {
    const lanes: Array<{ points: Array<{ x: number; y: number }> }> = [];
    if (endY <= startY) return lanes;

    for (let i = 0; i < laneCount; i += 1) {
      const y = Math.floor(Phaser.Math.Linear(startY, endY, (i + 0.5) / laneCount));
      const points: Array<{ x: number; y: number }> = [];
      for (let x = 5; x < WORLD_W - 5; x += 1) {
        const wave = Math.sin(x * 0.16 + i * 1.7 + rng.seed * 0.01 + salt) * 5;
        const tunnelY = Math.floor(y + wave + Math.sin(x * 0.05 + rng.seed + salt) * 4);
        this.carveDisc(x, tunnelY, tunnelRadius);
        if (x % 4 === 0) points.push({ x, y: tunnelY });
      }
      lanes.push({ points });
    }

    for (let i = 0; i < lanes.length - 1; i += 1) {
      const connectors = state.biome === 4 ? 7 : state.biome === 3 ? 6 : state.biome === 2 ? 5 : 4;
      for (let c = 0; c < connectors; c += 1) {
        const from = this.pickLanePoint(lanes[i].points, salt + i * 17 + c * 5);
        const targetX = from.x + Math.floor((hash(c + salt, i, rng.seed) - 0.5) * 30);
        const to = this.nearestLanePoint(lanes[i + 1].points, targetX) ?? { x: center, y: lanes[i + 1].points[0]?.y ?? startY };
        this.carveWindingTunnel(from.x, from.y, to.x, to.y, tunnelRadius);
      }
    }

    const branches = Math.max(8, laneCount * (state.biome === 4 ? 5 : state.biome >= 2 ? 4 : 3));
    for (let i = 0; i < branches; i += 1) {
      const lane = lanes[Math.floor(hash(i + salt, 91, rng.seed) * lanes.length)];
      const from = this.pickLanePoint(lane.points, salt + i * 11 + 3);
      const length = Phaser.Math.Between(12, state.biome >= 2 ? 28 : 22);
      const angle = Phaser.Math.FloatBetween(-0.85, 0.85) + (hash(i + salt, 33, rng.seed) > 0.5 ? 0 : Math.PI);
      const toX = Phaser.Math.Clamp(Math.floor(from.x + Math.cos(angle) * length), 4, WORLD_W - 5);
      const toY = Phaser.Math.Clamp(Math.floor(from.y + Math.sin(angle) * length * 0.6), startY, endY);
      this.carveWindingTunnel(from.x, from.y, toX, toY, tunnelRadius);
      this.carveDisc(toX, toY, state.biome >= 2 ? 4 : 3);
      if (state.biome >= 3) {
        const branchDistance = Math.hypot(toX - from.x, toY - from.y);
        const score = branchDistance + toY * 0.18 + hash(toX * 229 + salt, toY * 233, rng.seed + 17137) * 24;
        this.sideTunnelPocketCandidates.push({ x: toX, y: toY, score, source: `tunnel_band_${salt}_branch` });
      }
    }

    return lanes;
  }

export function carveDarkBasin(this: DeepdiveScene, center: number, cy: number, rx: number, ry: number) {
    for (let y = cy - ry; y <= cy + ry; y += 1) {
      for (let x = center - rx; x <= center + rx; x += 1) {
        const nx = (x - center) / rx;
        const ny = (y - cy) / ry;
        const ragged = 1 + Math.sin(x * 0.31 + rng.seed) * 0.08 + Math.cos(y * 0.23 + rng.seed) * 0.08;
        if (nx * nx + ny * ny < ragged) this.setTile(x, y, 'water');
      }
    }
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2;
      const x = Math.floor(center + Math.cos(angle) * (rx + Phaser.Math.Between(-5, 7)));
      const y = Math.floor(cy + Math.sin(angle) * (ry + Phaser.Math.Between(-4, 6)));
      this.carveDisc(x, y, Phaser.Math.Between(3, 6));
    }
  }

export function carveRuinVaults(this: DeepdiveScene, center: number, basinY: number) {
    const floors = [basinY - 16, basinY, basinY + 16, Math.floor(WORLD_H * 0.78), Math.floor(WORLD_H * 0.9)];
    for (const y of floors) {
      const halfWidth = Phaser.Math.Between(16, 28);
      for (let x = center - halfWidth; x <= center + halfWidth; x += 1) {
        this.setTile(x, y, 'water');
        if (x % 7 !== 0) this.setTile(x, y + 1, 'water');
      }
      this.carveDisc(center - halfWidth, y, 4);
      this.carveDisc(center + halfWidth, y, 4);
    }
    for (let i = 0; i < floors.length - 1; i += 1) {
      const x = center + (i % 2 === 0 ? -18 : 18);
      this.carveWindingTunnel(x, floors[i], -x + WORLD_W, floors[i + 1], 2);
    }
  }

export function smoothTerrainSilhouette(this: DeepdiveScene) {
    carveTerrainEdgeLobes(this, 0.32);
    carveTerrainEdgeScallops(this, 0.18);
    for (let pass = 0; pass < 2; pass += 1) {
      const next = this.world.map((row) => [...row]);
      for (let y = 8; y < WORLD_H - 2; y += 1) {
        for (let x = 2; x < WORLD_W - 2; x += 1) {
          const tile = this.getTile(x, y);
          if (tile === 'bedrock') continue;
          const solid = tiles[tile].solid;
          const neighborSolids = countSolidNeighbors(this, x, y);
          const northWater = this.getTile(x, y - 1) === 'water';
          const southWater = this.getTile(x, y + 1) === 'water';
          const westWater = this.getTile(x - 1, y) === 'water';
          const eastWater = this.getTile(x + 1, y) === 'water';
          if (solid) {
            const unsupportedColumn = (northWater || southWater) && westWater && eastWater;
            const unsupportedShelf = (westWater || eastWater) && northWater && southWater;
            const exposedSides = [northWater, southWater, westWater, eastWater].filter(Boolean).length;
            const scallop = exposedSides >= 2
              && neighborSolids <= 4
              && hash(x * 149 + pass * 17, y * 151 - pass * 19, rng.seed + 13001) > 0.34;
            if (unsupportedColumn || unsupportedShelf || neighborSolids <= 2 || scallop) {
              next[y][x] = 'water';
            }
            continue;
          }
          if (neighborSolids >= 7 && hash(x * 157 + pass, y * 163 - pass, rng.seed + 13033) > 0.18) {
            next[y][x] = 'stone';
          }
        }
      }
      this.world = next;
    }
    carveTerrainEdgeLobes(this, 0.16);
    carveTerrainEdgeScallops(this, 0.12);
  }

function carveTerrainEdgeScallops(scene: DeepdiveScene, chance = 0.1) {
    const cuts: Array<{ x: number; y: number; radius: number }> = [];
    for (let y = 9; y < WORLD_H - 3; y += 1) {
      for (let x = 3; x < WORLD_W - 3; x += 1) {
        const tile = scene.getTile(x, y);
        if (tile === 'bedrock' || !tiles[tile].solid) continue;
        const northWater = scene.getTile(x, y - 1) === 'water';
        const southWater = scene.getTile(x, y + 1) === 'water';
        const westWater = scene.getTile(x - 1, y) === 'water';
        const eastWater = scene.getTile(x + 1, y) === 'water';
        const exposed = [northWater, southWater, westWater, eastWater].filter(Boolean).length;
        if (exposed === 0) continue;
        const broadFace = (northWater && scene.getTile(x - 1, y - 1) === 'water' && scene.getTile(x + 1, y - 1) === 'water')
          || (southWater && scene.getTile(x - 1, y + 1) === 'water' && scene.getTile(x + 1, y + 1) === 'water')
          || (westWater && scene.getTile(x - 1, y - 1) === 'water' && scene.getTile(x - 1, y + 1) === 'water')
          || (eastWater && scene.getTile(x + 1, y - 1) === 'water' && scene.getTile(x + 1, y + 1) === 'water');
        if (!broadFace) continue;
        const wave = Math.sin(x * 0.37 + y * 0.19 + rng.seed * 0.03) * 0.5 + 0.5;
        const seed = hash(x * 181, y * 191, rng.seed + 13111);
        if (seed + wave * 0.18 < 1 - chance) continue;
        cuts.push({ x, y, radius: seed > 0.82 ? 2 : 1 });
      }
    }
    for (const cut of cuts) {
      for (let y = cut.y - cut.radius; y <= cut.y + cut.radius; y += 1) {
        for (let x = cut.x - cut.radius; x <= cut.x + cut.radius; x += 1) {
          if ((x - cut.x) ** 2 + (y - cut.y) ** 2 <= cut.radius ** 2 + 0.35) {
            if (scene.getTile(x, y) !== 'bedrock') scene.setTile(x, y, 'water');
          }
        }
      }
    }
  }

function carveTerrainEdgeLobes(scene: DeepdiveScene, chance: number) {
    const cuts: Array<{ x: number; y: number; radius: number }> = [];
    for (let y = 10; y < WORLD_H - 4; y += 1) {
      for (let x = 4; x < WORLD_W - 4; x += 1) {
        const tile = scene.getTile(x, y);
        if (tile === 'bedrock' || !tiles[tile].solid) continue;
        const northOpen = scene.getTile(x, y - 1) === 'water';
        const southOpen = scene.getTile(x, y + 1) === 'water';
        const westOpen = scene.getTile(x - 1, y) === 'water';
        const eastOpen = scene.getTile(x + 1, y) === 'water';
        if (!northOpen && !southOpen && !westOpen && !eastOpen) continue;
        const broadOpen =
          (northOpen && scene.getTile(x - 2, y - 1) === 'water' && scene.getTile(x + 2, y - 1) === 'water')
          || (southOpen && scene.getTile(x - 2, y + 1) === 'water' && scene.getTile(x + 2, y + 1) === 'water')
          || (westOpen && scene.getTile(x - 1, y - 2) === 'water' && scene.getTile(x - 1, y + 2) === 'water')
          || (eastOpen && scene.getTile(x + 1, y - 2) === 'water' && scene.getTile(x + 1, y + 2) === 'water');
        if (!broadOpen) continue;
        const solidSupport = countSolidNeighbors(scene, x, y);
        if (solidSupport < 4) continue;
        const seed = hash(x * 197, y * 199, rng.seed + 13277);
        const wave = Math.sin(x * 0.23 + y * 0.17 + rng.seed * 0.021) * 0.5 + 0.5;
        if (seed * 0.72 + wave * 0.28 < 1 - chance) continue;
        cuts.push({
          x: x + (eastOpen ? -1 : westOpen ? 1 : 0),
          y: y + (southOpen ? -1 : northOpen ? 1 : 0),
          radius: seed > 0.9 ? 4 : seed > 0.72 ? 3 : 2,
        });
      }
    }
    for (const cut of cuts) {
      for (let y = cut.y - cut.radius; y <= cut.y + cut.radius; y += 1) {
        for (let x = cut.x - cut.radius; x <= cut.x + cut.radius; x += 1) {
          if (x < 3 || x >= WORLD_W - 3 || y < 8 || y >= WORLD_H - 2) continue;
          const nx = (x - cut.x) / cut.radius;
          const ny = (y - cut.y) / Math.max(1.4, cut.radius * 0.78);
          const ragged = 0.86 + hash(x * 211, y * 223, rng.seed + 13291) * 0.24;
          if (nx * nx + ny * ny < ragged && scene.getTile(x, y) !== 'bedrock') scene.setTile(x, y, 'water');
        }
      }
    }
  }

function countSolidNeighbors(scene: DeepdiveScene, x: number, y: number) {
    let solid = 0;
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        if (ox === 0 && oy === 0) continue;
        if (tiles[scene.getTile(x + ox, y + oy)].solid) solid += 1;
      }
    }
    return solid;
  }

export function pickLanePoint(this: DeepdiveScene, points: Array<{ x: number; y: number }>, salt: number) {
    if (!points.length) return { x: Math.floor(WORLD_W / 2), y: Math.floor(WORLD_H / 2) };
    return points[Math.floor(hash(salt, points.length, rng.seed) * points.length)];
  }

export function nearestLanePoint(this: DeepdiveScene, points: Array<{ x: number; y: number }>, targetX: number) {
    let best = points[0];
    let bestDistance = Infinity;
    for (const point of points) {
      const distance = Math.abs(point.x - targetX);
      if (distance < bestDistance) {
        best = point;
        bestDistance = distance;
      }
    }
    return best;
  }

export function carveAnchorstoneStrata(this: DeepdiveScene, ) {
    if (state.biome < 3) return;
    for (let band = 0; band < 7; band += 1) {
      const baseY = Math.floor((38 + band * 32) * deepScale);
      for (let x = 4; x < WORLD_W - 4; x += 1) {
        const y = Math.floor(baseY + Math.sin(x * 0.11 + band * 1.3 + rng.seed) * 5);
        if (x % 17 > 3 && x % 17 < 14) {
          this.setTile(x, y, 'anchorstone');
          if (hash(x, y, rng.seed) > 0.62) this.setTile(x, y + 1, 'anchorstone');
        }
      }
    }
  }

export function carveWindingTunnel(this: DeepdiveScene, x0: number, y0: number, x1: number, y1: number, radius = state.biome === 2 ? 2 : 1) {
    const steps = Math.max(8, Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = Math.floor(Phaser.Math.Linear(x0, x1, t) + Math.sin(t * Math.PI * 4 + rng.seed) * 4);
      const y = Math.floor(Phaser.Math.Linear(y0, y1, t));
      this.carveDisc(x, y, radius);
    }
  }

export function carveDisc(this: DeepdiveScene, cx: number, cy: number, radius: number) {
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 + 0.35) {
          this.setTile(x, y, 'water');
        }
      }
    }
  }
