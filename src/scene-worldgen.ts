import Phaser from 'phaser';
import type { Bobbit,Fish,FishSpecies,Flora,FloraSpecies,Hazard,SpecialRoom,Tile,VeinRule } from './types';
import { BIOLUME_CAVERN_CHANCE,BOBBIT_ESCAPE_SECONDS,deepScale,EGG_HP,NEST_CHAMBER_CHANCE,TILE,WORLD_H,WORLD_W } from './constants';
import { biomeFish,biomeFlora,tiles } from './content';
import { state } from './state';
import { rng } from './rng';
import { fishAssetKey,fishMaxHp,floraAssetKey,floraMaxHp,generateQuestBoard,generateTile,hash,scaledDepthPx,scaledEntity,veinRuleAt,veinRulesForBiome } from './helpers';
import type { DeepdiveScene } from './scene';

export function generateWorld(this: DeepdiveScene, ) {
    this.world = [];
    this.damage = [];
    this.looseItems = [];
    this.flora = [];
    this.bobbits = [];
    this.specialRooms = [];
    this.nestEggs = [];
    this.larvae = [];
    state.sonarRevealed.clear();
    state.sonarContacts = [];
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
    this.populateOreVeins();

    this.fish = biomeFish[state.biome].flatMap((species) => this.makeSchool(species));
    this.flora = biomeFlora[state.biome].flatMap((species) => this.makeFloraPatch(species));
    this.populateSpecialRooms();
    state.questBoard = generateQuestBoard(this.specialRooms.some((room) => room.kind === 'nest'));
      state.activeQuestId = '';
    this.hazards = state.biome >= 2 ? this.makeVentFields() : [];
    this.bobbits = state.biome >= 2 ? this.makeBobbits() : [];
  }

export function makeVentFields(this: DeepdiveScene, ): Hazard[] {
    const vents: Hazard[] = [];
    const count = state.biome === 4 ? 32 : state.biome === 3 ? 26 : 18;
    for (let i = 0; i < count; i += 1) {
      const point = this.findRockTopAnchorInBand(scaledDepthPx(340 + i * 42), scaledDepthPx(2200));
      vents.push({
        x: point.x,
        y: point.y,
        radius: scaledEntity(Phaser.Math.Between(34, 58)),
        phase: Math.random() * Math.PI * 2,
        heat: Phaser.Math.FloatBetween(0.7, state.biome >= 3 ? 1.55 : 1.25),
        sprite: this.createEntitySprite(point.x, point.y, 'vent-steam-0').setDepth(1.5).setOrigin(0.5, 1),
      });
    }
    return vents;
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

export function canHostOre(this: DeepdiveScene, x: number, y: number) {
    const tile = this.getTile(x, y);
    return tile === 'stone' || tile === 'sand';
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
    for (let i = 0; i < species.count; i += 1) {
      const point = this.findOpenWaterInBand(scaledDepthPx(species.minY), scaledDepthPx(species.maxY));
      const angle = Math.random() * Math.PI * 2;
      const assetKey = fishAssetKey(species);
      school.push({
        kind: 'fish',
        species: species.species,
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * species.speed[0],
        vy: Math.sin(angle) * species.speed[0],
        homeX: point.x,
        homeY: point.y,
        speed: Phaser.Math.FloatBetween(species.speed[0], species.speed[1]),
        phase: Math.random() * Math.PI * 2,
        color: species.color,
        hostile: species.hostile,
        scanned: false,
        scan: 0,
        scanning: false,
        scanPulse: 0,
        radius: scaledEntity(species.radius),
        pattern: species.pattern,
        bumpCooldown: 0,
        aggro: 0,
        stunned: 0,
        hp: fishMaxHp(species),
        maxHp: fishMaxHp(species),
        dead: false,
        hurtFlash: 0,
        assetKey,
        facingSign: Math.cos(angle) < 0 ? -1 : 1,
        sprite: this.createEntitySprite(point.x, point.y, assetKey),
      });
    }
    return school;
  }

export function makeFloraPatch(this: DeepdiveScene, species: FloraSpecies): Flora[] {
    const patch: Flora[] = [];
    for (let i = 0; i < species.count; i += 1) {
      const point = this.findFloraAnchorInBand(scaledDepthPx(species.minY), scaledDepthPx(species.maxY));
      const assetKey = floraAssetKey(species);
      patch.push({
        kind: 'flora',
        species: species.species,
        x: point.x + Phaser.Math.FloatBetween(-5, 5),
        y: point.y,
        phase: Math.random() * Math.PI * 2,
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
        radius: scaledEntity(species.radius),
        assetKey,
        sprite: this.createEntitySprite(point.x, point.y, assetKey),
      });
    }
    return patch;
  }

export function populateSpecialRooms(this: DeepdiveScene, ) {
    for (const room of this.specialRooms) {
      if (room.kind === 'biolume') this.populateBiolumeRoom(room);
      if (room.kind === 'nest') this.populateNestRoom(room);
    }
  }

export function populateBiolumeRoom(this: DeepdiveScene, room: SpecialRoom) {
    const count = state.biome >= 3 ? 18 : 12;
    for (let i = 0; i < count; i += 1) {
      const anchor = this.findRoomFloorAnchor(room, i);
      const oxygen = i % 3 !== 2;
      const assetKey = oxygen
        ? (i % 2 === 0 ? 'flora-oxygen-kelp' : 'flora-oxygen-bulb')
        : 'flora-biolume-tall';
      this.flora.push({
        kind: 'flora',
        species: oxygen ? 'Oxygen Bloom' : 'Lumen Fern',
        x: anchor.x + Phaser.Math.FloatBetween(-4, 4),
        y: anchor.y,
        phase: Math.random() * Math.PI * 2,
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
        radius: scaledEntity(oxygen ? 15 : 13),
        assetKey,
        sprite: this.createEntitySprite(anchor.x, anchor.y, assetKey).setDepth(2.05),
      });
    }
    for (let i = 0; i < 6; i += 1) {
      const anchor = this.findRoomFloorAnchor(room, i + 120);
      const assetKey = i % 3 === 2 ? 'biolume-crystal' : `biolume-rock-${i % 2}`;
      this.flora.push({
        kind: 'flora',
        species: 'Lumen Nodule',
        x: anchor.x + Phaser.Math.FloatBetween(-5, 5),
        y: anchor.y,
        phase: Math.random() * Math.PI * 2,
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
        radius: scaledEntity(11),
        assetKey,
        sprite: this.createEntitySprite(anchor.x, anchor.y, assetKey).setDepth(2.02),
      });
    }
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
        stunned: 0,
        hp: fishMaxHp(species) * 1.25,
        maxHp: fishMaxHp(species) * 1.25,
        dead: false,
        hurtFlash: 0,
        assetKey,
        facingSign: Math.cos(angle) < 0 ? -1 : 1,
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

export function findFloraAnchorInBand(this: DeepdiveScene, minY: number, maxY: number) {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const tx = Phaser.Math.Between(4, WORLD_W - 5);
      const ty = Math.floor(Phaser.Math.Between(minY, maxY) / TILE);
      if (ty < 1 || ty >= WORLD_H - 2) continue;
      if (this.getTile(tx, ty) !== 'water') continue;
      if (!tiles[this.getTile(tx, ty + 1)].solid) continue;
      if (this.getTile(tx, ty - 1) !== 'water') continue;
      return { x: tx * TILE + TILE * 0.5, y: (ty + 1) * TILE + 2 };
    }
    const fallback = this.findOpenWaterInBand(minY, maxY);
    return { x: fallback.x, y: fallback.y + TILE * 0.35 };
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
    return this.findFloraAnchorInBand(minY, maxY);
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

