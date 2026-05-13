import Phaser from 'phaser';
import './styles.css';

type Tile = 'water' | 'sand' | 'stone' | 'copper' | 'quartz' | 'ruby' | 'cobalt' | 'sunstone' | 'relic' | 'anchorstone' | 'bedrock';
type UpgradeId = 'oxygen' | 'cargo' | 'laser' | 'lamp' | 'scanner' | 'suit' | 'speed' | 'thermal';
type FishPattern = 'school' | 'sway' | 'glide' | 'stalk' | 'circle';
type Biome = 1 | 2 | 3;

interface TileDef {
  color: number;
  hp: number;
  value: number;
  name: string;
  solid: boolean;
}

interface Upgrade {
  id: UpgradeId;
  name: string;
  baseCost: number;
  max: number;
  biome: Biome;
  text: string;
}

interface Fish {
  kind: 'fish';
  species: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  speed: number;
  phase: number;
  color: number;
  hostile: boolean;
  scanned: boolean;
  scan: number;
  scanning: boolean;
  scanPulse: number;
  radius: number;
  pattern: FishPattern;
  bumpCooldown: number;
}

interface Flora {
  kind: 'flora';
  species: string;
  x: number;
  y: number;
  phase: number;
  color: number;
  hazardous: boolean;
  rare: boolean;
  scanned: boolean;
  scan: number;
  scanning: boolean;
  scanPulse: number;
  radius: number;
}

type ScanTarget = Fish | Flora;

interface FishSpecies {
  species: string;
  count: number;
  minY: number;
  maxY: number;
  color: number;
  hostile: boolean;
  pattern: FishPattern;
  radius: number;
  speed: [number, number];
}

interface FloraSpecies {
  species: string;
  count: number;
  minY: number;
  maxY: number;
  color: number;
  hazardous: boolean;
  rare: boolean;
  radius: number;
}

interface CargoItem {
  name: string;
  value: number;
}

interface Hazard {
  x: number;
  y: number;
  radius: number;
  phase: number;
  heat: number;
}

interface LooseItem {
  name: string;
  value: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  radius: number;
  life: number;
}

const TILE = 24;
const WORLD_W = 104;
const WORLD_H = 156;
const SURFACE_Y = TILE * 4;
const TARGET_DEPTH = 900;
const BARGE_UPGRADE_COST = 5000;
let seed = Math.floor(Math.random() * 1_000_000);

const tiles: Record<Tile, TileDef> = {
  water: { color: 0x0b2b38, hp: 0, value: 0, name: 'Water', solid: false },
  sand: { color: 0x745f47, hp: 18, value: 0, name: 'Silt', solid: true },
  stone: { color: 0x4d5564, hp: 42, value: 0, name: 'Basalt', solid: true },
  copper: { color: 0xcf8d55, hp: 34, value: 14, name: 'Copper', solid: true },
  quartz: { color: 0x94e8e3, hp: 40, value: 32, name: 'Quartz', solid: true },
  ruby: { color: 0xe85d75, hp: 52, value: 78, name: 'Ruby', solid: true },
  cobalt: { color: 0x4f8df7, hp: 58, value: 140, name: 'Cobalt Bloom', solid: true },
  sunstone: { color: 0xffb347, hp: 72, value: 310, name: 'Sunstone', solid: true },
  relic: { color: 0xb9f27c, hp: 70, value: 180, name: 'Relic Shard', solid: true },
  anchorstone: { color: 0x11141c, hp: Infinity, value: 0, name: 'Anchorstone', solid: true },
  bedrock: { color: 0x191f2a, hp: Infinity, value: 0, name: 'Bedrock', solid: true },
};

const upgrades: Upgrade[] = [
  { id: 'oxygen', name: 'O2 Tank', baseCost: 80, max: 5, biome: 1, text: 'Longer dives before returning to the boat.' },
  { id: 'cargo', name: 'Cargo Net', baseCost: 70, max: 5, biome: 1, text: 'Carry more minerals per trip.' },
  { id: 'laser', name: 'Cutting Laser', baseCost: 90, max: 5, biome: 1, text: 'Mine tougher terrain faster.' },
  { id: 'lamp', name: 'Headlamp', baseCost: 60, max: 4, biome: 1, text: 'Pushes back the darkness at depth.' },
  { id: 'scanner', name: 'Scanner', baseCost: 75, max: 4, biome: 1, text: 'Earn more from cataloging sea life.' },
  { id: 'suit', name: 'Pressure Suit', baseCost: 100, max: 4, biome: 1, text: 'More hull and less crash damage.' },
  { id: 'speed', name: 'Diver Jets', baseCost: 85, max: 5, biome: 1, text: 'Increase swim speed and handling.' },
  { id: 'thermal', name: 'Thermal Plating', baseCost: 720, max: 4, biome: 2, text: 'Reduces heat damage from vent fields.' },
];

const biomeFish: Record<Biome, FishSpecies[]> = {
  1: [
  { species: 'Lantern Fry', count: 18, minY: 160, maxY: 470, color: 0x8ddcf0, hostile: false, pattern: 'school', radius: 9, speed: [28, 52] },
  { species: 'Ribbon Eel', count: 10, minY: 320, maxY: 760, color: 0xf2b66d, hostile: false, pattern: 'sway', radius: 11, speed: [22, 38] },
  { species: 'Glass Ray', count: 8, minY: 640, maxY: 1160, color: 0xd8f7ff, hostile: false, pattern: 'glide', radius: 15, speed: [18, 32] },
  { species: 'Needlejaw', count: 9, minY: 520, maxY: 1320, color: 0xff6f7f, hostile: true, pattern: 'stalk', radius: 13, speed: [34, 62] },
  { species: 'Abyss Warden', count: 4, minY: 1220, maxY: 1900, color: 0xb9f27c, hostile: true, pattern: 'circle', radius: 20, speed: [16, 29] },
  ],
  2: [
    { species: 'Ash Minnow', count: 20, minY: 160, maxY: 560, color: 0xffc857, hostile: false, pattern: 'school', radius: 8, speed: [34, 58] },
    { species: 'Smoke Ribbon', count: 12, minY: 320, maxY: 880, color: 0xa9b8c9, hostile: false, pattern: 'sway', radius: 12, speed: [24, 42] },
    { species: 'Cinder Ray', count: 8, minY: 660, maxY: 1260, color: 0xff8a5c, hostile: false, pattern: 'glide', radius: 16, speed: [22, 36] },
    { species: 'Vent Snapper', count: 11, minY: 520, maxY: 1480, color: 0xff4f64, hostile: true, pattern: 'stalk', radius: 14, speed: [40, 70] },
    { species: 'Brine Leviathan', count: 3, minY: 1320, maxY: 2100, color: 0xd06bff, hostile: true, pattern: 'circle', radius: 23, speed: [18, 32] },
  ],
  3: [
    { species: 'Mirror Fry', count: 18, minY: 180, maxY: 620, color: 0xb8f7ff, hostile: false, pattern: 'school', radius: 8, speed: [42, 72] },
    { species: 'Ink Ribbon', count: 12, minY: 360, maxY: 980, color: 0x8f8cff, hostile: false, pattern: 'sway', radius: 12, speed: [28, 46] },
    { species: 'Void Manta', count: 8, minY: 680, maxY: 1380, color: 0xbdb2ff, hostile: false, pattern: 'glide', radius: 17, speed: [26, 44] },
    { species: 'Shardjaw', count: 12, minY: 560, maxY: 1640, color: 0xff4f90, hostile: true, pattern: 'stalk', radius: 15, speed: [48, 82] },
    { species: 'Trench Crown', count: 3, minY: 1380, maxY: 2200, color: 0xffd166, hostile: true, pattern: 'circle', radius: 25, speed: [22, 38] },
  ],
};

const biomeFlora: Record<Biome, FloraSpecies[]> = {
  1: [
    { species: 'Glass Kelp', count: 18, minY: 180, maxY: 820, color: 0x7bd88f, hazardous: false, rare: false, radius: 12 },
    { species: 'Moon Sponge', count: 10, minY: 420, maxY: 1180, color: 0x94e8e3, hazardous: false, rare: false, radius: 11 },
    { species: 'Sting Anemone', count: 4, minY: 760, maxY: 1440, color: 0xff6f7f, hazardous: true, rare: true, radius: 14 },
  ],
  2: [
    { species: 'Brine Grass', count: 20, minY: 200, maxY: 900, color: 0xb9f27c, hazardous: false, rare: false, radius: 11 },
    { species: 'Vent Coral', count: 10, minY: 620, maxY: 1560, color: 0xff8a5c, hazardous: true, rare: false, radius: 15 },
    { species: 'Ember Bloom', count: 5, minY: 960, maxY: 1860, color: 0xffd166, hazardous: true, rare: true, radius: 16 },
  ],
  3: [
    { species: 'Black Fan', count: 18, minY: 220, maxY: 980, color: 0x9a8cff, hazardous: false, rare: false, radius: 13 },
    { species: 'Needle Garden', count: 12, minY: 640, maxY: 1680, color: 0xff5d8f, hazardous: true, rare: false, radius: 16 },
    { species: 'Crown Polyp', count: 4, minY: 1200, maxY: 2200, color: 0xffd166, hazardous: true, rare: true, radius: 18 },
  ],
};

const state = {
  biome: 1 as Biome,
  credits: 0,
  oxygen: 100,
  hull: 100,
  depth: 0,
  maxDepth: 0,
  cargo: [] as CargoItem[],
  scannedSpecies: new Set<string>(),
  upgrades: {
    oxygen: 0,
    cargo: 0,
    laser: 0,
    lamp: 0,
    scanner: 0,
    suit: 0,
    speed: 0,
    thermal: 0,
  } satisfies Record<UpgradeId, number>,
  status: 'Launch from the boat, mine minerals, scan fish, then surface to upgrade.',
  atBoat: true,
  paused: false,
  won: false,
  lost: false,
};

let uiEventsBound = false;

class DeepdiveScene extends Phaser.Scene {
  private terrain!: Phaser.GameObjects.Graphics;
  private actors!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private world: Tile[][] = [];
  private damage: number[][] = [];
  private fish: Fish[] = [];
  private flora: Flora[] = [];
  private hazards: Hazard[] = [];
  private looseItems: LooseItem[] = [];
  private terrainBoundsKey = '';
  private terrainDirty = true;
  private player = {
    x: WORLD_W * TILE * 0.5,
    y: SURFACE_Y - 10,
    vx: 0,
    vy: 0,
    facing: new Phaser.Math.Vector2(0, 1),
    mineCooldown: 0,
    scanCooldown: 0,
    scanTarget: null as ScanTarget | null,
  };
  private hudTimer = 0;

  constructor() {
    super('DeepdiveScene');
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_W * TILE, WORLD_H * TILE);
    this.cameras.main.setRoundPixels(true);
    this.updateCameraZoom();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E,SPACE,R') as Record<string, Phaser.Input.Keyboard.Key>;
    this.terrain = this.add.graphics();
    this.actors = this.add.graphics();
    this.overlay = this.add.graphics().setScrollFactor(0);
    this.generateWorld();
    renderHud();
  }

  update(_: number, deltaMs: number) {
    const delta = deltaMs / 1000;
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) restart(this);
    if (state.lost || state.won) {
      this.draw();
      return;
    }
    if (state.paused) {
      this.draw();
      return;
    }

    this.updatePlayer(delta);
    this.updateLooseItems(delta);
    this.updateFlora(delta);
    this.updateFish(delta);
    this.updateHazards(delta);
    this.updateSystems(delta);
    this.updateCameraZoom();
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.draw();
    this.hudTimer += deltaMs;
    if (this.hudTimer > 90) {
      this.hudTimer = 0;
      renderHud();
    }
  }

  buy(id: UpgradeId) {
    if (!state.atBoat) return;
    const upgrade = upgrades.find((item) => item.id === id);
    if (!upgrade) return;
    const level = state.upgrades[id];
    const cost = upgradeCost(upgrade);
    if (level >= upgradeMax(upgrade) || state.credits < cost) return;
    state.credits -= cost;
    state.upgrades[id] += 1;
    refillAtBoat();
    state.status = `${upgrade.name} upgraded to Mk ${state.upgrades[id]}.`;
    renderHud();
  }

  travelToNextBiome() {
    const cost = bargeUpgradeCost();
    if (!state.atBoat || state.biome >= 3 || state.credits < cost) return;
    state.credits -= cost;
    state.depth = 0;
    state.maxDepth = 0;
    state.cargo = [];
    state.scannedSpecies.clear();
    state.atBoat = true;
    state.paused = false;
    const nextBiome = (state.biome + 1) as Biome;
    state.biome = nextBiome;
    state.status = `Barge retrofitted. Welcome to ${biomeName()}.`;
    seed = Math.floor(Math.random() * 1_000_000);
    refillAtBoat();
    this.scene.restart();
    renderHud();
  }

  private updateCameraZoom() {
    const zoom = this.scale.width < 700 ? 1.35 : 1.85;
    if (Math.abs(this.cameras.main.zoom - zoom) > 0.01) {
      this.cameras.main.setZoom(zoom);
      this.terrainDirty = true;
    }
  }

  private generateWorld() {
    this.world = [];
    this.damage = [];
    this.looseItems = [];
    this.flora = [];
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

    this.fish = biomeFish[state.biome].flatMap((species) => this.makeSchool(species));
    this.flora = biomeFlora[state.biome].flatMap((species) => this.makeFloraPatch(species));
    this.hazards = state.biome >= 2 ? this.makeVentFields() : [];
  }

  private makeVentFields(): Hazard[] {
    const vents: Hazard[] = [];
    const count = state.biome === 3 ? 26 : 18;
    for (let i = 0; i < count; i += 1) {
      const point = this.findOpenWaterInBand(340 + i * 42, 1800);
      vents.push({
        x: point.x,
        y: point.y,
        radius: Phaser.Math.Between(34, 58),
        phase: Math.random() * Math.PI * 2,
        heat: Phaser.Math.FloatBetween(0.7, state.biome === 3 ? 1.55 : 1.25),
      });
    }
    return vents;
  }

  private makeSchool(species: FishSpecies): Fish[] {
    const school: Fish[] = [];
    for (let i = 0; i < species.count; i += 1) {
      const point = this.findOpenWaterInBand(species.minY, species.maxY);
      const angle = Math.random() * Math.PI * 2;
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
        radius: species.radius,
        pattern: species.pattern,
        bumpCooldown: 0,
      });
    }
    return school;
  }

  private makeFloraPatch(species: FloraSpecies): Flora[] {
    const patch: Flora[] = [];
    for (let i = 0; i < species.count; i += 1) {
      const point = this.findOpenWaterInBand(species.minY, species.maxY);
      patch.push({
        kind: 'flora',
        species: species.species,
        x: point.x + Phaser.Math.FloatBetween(-8, 8),
        y: point.y + Phaser.Math.FloatBetween(-8, 8),
        phase: Math.random() * Math.PI * 2,
        color: species.color,
        hazardous: species.hazardous,
        rare: species.rare,
        scanned: false,
        scan: 0,
        scanning: false,
        scanPulse: 0,
        radius: species.radius,
      });
    }
    return patch;
  }

  private findOpenWaterInBand(minY: number, maxY: number) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const tx = Phaser.Math.Between(4, WORLD_W - 5);
      const ty = Math.floor(Phaser.Math.Between(minY, maxY) / TILE);
      if (this.getTile(tx, ty) === 'water') {
        return { x: tx * TILE + TILE * 0.5, y: ty * TILE + TILE * 0.5 };
      }
    }
    return { x: WORLD_W * TILE * 0.5 + Phaser.Math.Between(-180, 180), y: Phaser.Math.Between(minY, maxY) };
  }

  private carveStarterCaverns(center: number) {
    const rooms = [
      { x: center - 18, y: 18, rx: 14, ry: 7 },
      { x: center + 17, y: 22, rx: 16, ry: 8 },
      { x: center - 8, y: 34, rx: 18, ry: 9 },
      { x: center + 13, y: 43, rx: 14, ry: 7 },
    ];

    for (let y = 6; y < 58; y += 1) {
      const drift = Math.sin(y * 0.21 + seed) * 6 + Math.sin(y * 0.07) * 4;
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
          if (nx * nx + ny * ny < 1 + hash(x, y, seed) * 0.18) {
            this.setTile(x, y, 'water');
          }
        }
      }
    }
  }

  private carveDeepTunnelNetwork(center: number) {
    const startY = 56;
    const endY = WORLD_H - 10;
    const laneCount = state.biome === 2 ? 9 : 7;
    const lanes: Array<{ y: number; xs: number[] }> = [];

    for (let i = 0; i < laneCount; i += 1) {
      const y = Math.floor(Phaser.Math.Linear(startY, endY, (i + 0.5) / laneCount));
      const xs: number[] = [];
      for (let x = 5; x < WORLD_W - 5; x += 1) {
        const wave = Math.sin(x * 0.16 + i * 1.7 + seed * 0.01) * 5;
        const tunnelY = Math.floor(y + wave + Math.sin(x * 0.05 + seed) * 4);
        this.carveDisc(x, tunnelY, state.biome === 2 ? 2 : 1);
        if (x % 6 === 0) xs.push(x);
      }
      lanes.push({ y, xs });
    }

    for (let i = 0; i < lanes.length - 1; i += 1) {
      const connectors = state.biome === 2 ? 4 : 3;
      for (let c = 0; c < connectors; c += 1) {
        const x = lanes[i].xs[Math.floor(hash(i, c, seed) * lanes[i].xs.length)] ?? center;
        this.carveWindingTunnel(x, lanes[i].y, x + Math.floor((hash(c, i, seed) - 0.5) * 22), lanes[i + 1].y);
      }
    }
  }

  private carveAnchorstoneStrata() {
    if (state.biome < 3) return;
    for (let band = 0; band < 7; band += 1) {
      const baseY = 38 + band * 16;
      for (let x = 4; x < WORLD_W - 4; x += 1) {
        const y = Math.floor(baseY + Math.sin(x * 0.11 + band * 1.3 + seed) * 5);
        if (x % 17 > 3 && x % 17 < 14) {
          this.setTile(x, y, 'anchorstone');
          if (hash(x, y, seed) > 0.62) this.setTile(x, y + 1, 'anchorstone');
        }
      }
    }
  }

  private carveWindingTunnel(x0: number, y0: number, x1: number, y1: number) {
    const steps = Math.max(8, Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = Math.floor(Phaser.Math.Linear(x0, x1, t) + Math.sin(t * Math.PI * 4 + seed) * 4);
      const y = Math.floor(Phaser.Math.Linear(y0, y1, t));
      this.carveDisc(x, y, state.biome === 2 ? 2 : 1);
    }
  }

  private carveDisc(cx: number, cy: number, radius: number) {
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 + 0.35) {
          this.setTile(x, y, 'water');
        }
      }
    }
  }

  private updatePlayer(delta: number) {
    const input = new Phaser.Math.Vector2(
      axis(this.cursors.left, this.keys.A, this.cursors.right, this.keys.D),
      axis(this.cursors.up, this.keys.W, this.cursors.down, this.keys.S),
    );
    if (input.lengthSq() > 0) {
      input.normalize();
      this.player.facing.copy(input);
    }

    const topSpeed = swimTopSpeed();
    const thrust = (this.isAtBoat() ? 780 : 470) + state.upgrades.speed * 62;
    this.player.vx += input.x * thrust * delta;
    this.player.vy += input.y * thrust * delta;
    const drag = input.lengthSq() > 0 ? 1.9 : 3.8;
    const dragFactor = Math.exp(-drag * delta);
    this.player.vx *= dragFactor;
    this.player.vy *= dragFactor;
    const speed = Math.hypot(this.player.vx, this.player.vy);
    if (speed > topSpeed) {
      this.player.vx = (this.player.vx / speed) * topSpeed;
      this.player.vy = (this.player.vy / speed) * topSpeed;
    }

    this.moveAxis('x', this.player.vx * delta);
    this.moveAxis('y', this.player.vy * delta);

    this.player.mineCooldown = Math.max(0, this.player.mineCooldown - delta);
    this.player.scanCooldown = Math.max(0, this.player.scanCooldown - delta);
    const pointer = this.input.activePointer;
    if (pointer.isDown) this.mineAt(pointer.worldX, pointer.worldY);
    if (this.keys.SPACE.isDown) {
      this.mineAt(this.player.x + this.player.facing.x * 34, this.player.y + this.player.facing.y * 34);
    }
    this.scanNearbyLife(delta);
  }

  private moveAxis(axisName: 'x' | 'y', amount: number) {
    if (amount === 0) return;
    const previous = this.player[axisName];
    this.player[axisName] += amount;
    if (this.collides(this.player.x, this.player.y)) {
      this.player[axisName] = previous;
      if (Math.abs(amount) > 1.8 && !this.isInDockingZone()) {
        state.hull -= Math.max(0, Math.abs(amount) - 1.8) * 0.5;
      }
      if (axisName === 'x') this.player.vx *= this.isInDockingZone() ? 0.08 : -0.16;
      if (axisName === 'y') this.player.vy *= this.isInDockingZone() ? 0.08 : -0.16;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, 20, WORLD_W * TILE - 20);
    this.player.y = Phaser.Math.Clamp(this.player.y, 20, WORLD_H * TILE - 20);
  }

  private collides(x: number, y: number): boolean {
    const r = 11;
    const points = [
      [x - r, y - r],
      [x + r, y - r],
      [x - r, y + r],
      [x + r, y + r],
    ];
    return points.some(([px, py]) => tiles[this.tileAtWorld(px, py)].solid);
  }

  private mineAt(worldX: number, worldY: number) {
    if (this.player.mineCooldown > 0) return;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, worldX, worldY);
    const range = 40 + state.upgrades.laser * 9;
    if (distance > range) return;
    const tx = Math.floor(worldX / TILE);
    const ty = Math.floor(worldY / TILE);
    const targets = this.mineTargets(tx, ty);
    if (!targets.length) return;

    const power = 9 + state.upgrades.laser * 3.5;
    let brokeTile = false;
    for (const target of targets) {
      const tile = this.getTile(target.x, target.y);
      const def = tiles[tile];
      if (!def.solid || tile === 'bedrock' || tile === 'anchorstone') continue;
      this.damage[target.y][target.x] += power;
      if (this.damage[target.y][target.x] >= def.hp) {
        this.breakTile(target.x, target.y, def);
        brokeTile = true;
      }
    }
    this.terrainDirty = true;
    this.player.mineCooldown = mineCooldown();
    state.oxygen -= 0.11 + targets.length * 0.035;
    if (brokeTile) {
      renderHud();
    }
  }

  private mineTargets(tx: number, ty: number) {
    const maxBlocks = 1 + Math.floor(state.upgrades.laser / 2);
    const radius = state.upgrades.laser >= 3 ? 1 : 0;
    const targets: Array<{ x: number; y: number; distance: number }> = [];
    for (let y = ty - radius; y <= ty + radius; y += 1) {
      for (let x = tx - radius; x <= tx + radius; x += 1) {
        const distance = Math.abs(x - tx) + Math.abs(y - ty);
        if (distance > 1) continue;
        const tile = this.getTile(x, y);
      if (tiles[tile].solid && tile !== 'bedrock' && tile !== 'anchorstone') {
          targets.push({ x, y, distance });
        }
      }
    }
    return targets
      .sort((a, b) => a.distance - b.distance || hash(a.x, a.y, seed) - hash(b.x, b.y, seed))
      .slice(0, maxBlocks);
  }

  private breakTile(tx: number, ty: number, def: TileDef) {
    const x = tx * TILE + TILE * 0.5;
    const y = ty * TILE + TILE * 0.5;
    this.setTile(tx, ty, 'water');
    this.damage[ty][tx] = 0;
    this.spawnLoose(def, x, y);
    if (def.value > 0) {
      state.status = state.cargo.length < cargoCapacity()
        ? `${def.name} broke loose. Swim near it to collect.`
        : `Cargo full. ${def.name} broke loose and can be picked up later.`;
    } else {
      state.status = `Cut through ${def.name}.`;
    }
  }

  private spawnLoose(def: TileDef, x: number, y: number) {
    const pieces = def.value > 0 ? 1 : 3;
    for (let i = 0; i < pieces; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(10, 42);
      this.looseItems.push({
        name: def.name,
        value: def.value > 0 && i === 0 ? def.value : 0,
        x: x + Phaser.Math.FloatBetween(-4, 4),
        y: y + Phaser.Math.FloatBetween(-4, 4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: def.color,
        radius: def.value > 0 ? 5 : Phaser.Math.FloatBetween(2, 3.5),
        life: def.value > 0 ? Infinity : Phaser.Math.FloatBetween(4, 8),
      });
    }
    if (this.looseItems.length > 220) {
      this.looseItems = this.looseItems.slice(-220);
    }
  }

  private scanNearbyLife(delta: number) {
    const range = 64 + state.upgrades.scanner * 18;
    const target = this.nearestLife(range);
    if (!this.keys.E.isDown || !target) {
      this.player.scanTarget = null;
      return;
    }

    this.player.scanTarget = target;
    target.scanning = true;
    target.scan += delta * (0.85 + state.upgrades.scanner * 0.28);
    target.vx += (target.x - this.player.x) * delta * 0.22;
    target.vy += (target.y - this.player.y) * delta * 0.22;
    if (target.scan < 1) return;

    target.scan = 0;
    target.scanPulse = 1;
    target.scanned = true;
    if (!state.scannedSpecies.has(target.species)) {
      state.scannedSpecies.add(target.species);
      const reward = scanReward(target);
      state.credits += reward;
      state.status = `Cataloged ${target.species}. Research paid ${reward} credits.`;
      const apexSpecies = currentApexSpecies();
      if (target.species === apexSpecies && state.depth >= TARGET_DEPTH) {
        state.won = true;
        state.status = state.biome === 1
          ? 'You scanned the deep signal and returned proof of the abyss.'
          : 'The Brine Vent Shelf is charted. The barge has a route deeper still.';
      }
      renderHud();
    }
  }

  private updateFish(delta: number) {
    for (const fish of this.fish) {
      fish.phase += delta;
      fish.bumpCooldown = Math.max(0, fish.bumpCooldown - delta);
      fish.scanPulse = Math.max(0, fish.scanPulse - delta * 1.35);
      if (!fish.scanned && !fish.scanning) {
        fish.scan = Math.max(0, fish.scan - delta * 0.9);
      }
      fish.scanning = false;
      this.steerFish(fish, delta);
      fish.x += fish.vx * delta;
      fish.y += fish.vy * delta;
      this.keepFishInWater(fish);
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance < fish.radius + 14 && fish.bumpCooldown <= 0 && !this.isAtBoat()) {
        this.bumpFish(fish, distance);
      }
    }
  }

  private updateFlora(delta: number) {
    for (const flora of this.flora) {
      flora.phase += delta;
      flora.scanPulse = Math.max(0, flora.scanPulse - delta * 1.35);
      if (!flora.scanned && !flora.scanning) {
        flora.scan = Math.max(0, flora.scan - delta * 0.9);
      }
      flora.scanning = false;
      if (flora.hazardous && !this.isAtBoat()) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y);
        if (distance < flora.radius + 15) {
          state.hull -= (flora.rare ? 7 : 3.5) * delta;
          this.player.vx += ((this.player.x - flora.x) / Math.max(1, distance)) * 24 * delta;
          this.player.vy += ((this.player.y - flora.y) / Math.max(1, distance)) * 24 * delta;
          state.status = `${flora.species} stings through the suit.`;
        }
      }
    }
  }

  private updateLooseItems(delta: number) {
    let pickedUp = false;
    this.looseItems = this.looseItems.filter((item) => {
      item.x += item.vx * delta;
      item.y += item.vy * delta;
      item.vx *= 1 - Math.min(0.9, delta * 2.8);
      item.vy *= 1 - Math.min(0.9, delta * 2.8);
      if (Number.isFinite(item.life)) item.life -= delta;
      if (item.value > 0 && state.cargo.length < cargoCapacity()) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
        if (distance < 24) {
          state.cargo.push({ name: item.name, value: item.value });
          state.status = `Recovered loose ${item.name} worth ${item.value} credits.`;
          pickedUp = true;
          return false;
        }
      }
      return item.life > 0;
    });
    if (pickedUp) renderHud();
  }

  private drawLooseItems(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const item of this.looseItems) {
      if (item.x < view.x - 40 || item.x > view.right + 40 || item.y < view.y - 40 || item.y > view.bottom + 40) continue;
      const alpha = item.value > 0 ? 0.95 : Phaser.Math.Clamp(item.life / 4, 0, 0.46);
      this.actors.fillStyle(item.color, alpha);
      this.actors.fillCircle(item.x, item.y, item.radius);
      if (item.value > 0) {
        this.actors.lineStyle(1, 0xfff7df, 0.55);
        this.actors.strokeCircle(item.x, item.y, item.radius + 2);
      }
    }
  }

  private updateHazards(delta: number) {
    if (!this.hazards.length || this.isAtBoat()) return;
    for (const hazard of this.hazards) {
      hazard.phase += delta;
      const active = Math.sin(hazard.phase * 1.8) > -0.18;
      if (!active) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y);
      if (distance > hazard.radius) continue;
      const heatFactor = 1 - distance / hazard.radius;
      const mitigation = 1 - state.upgrades.thermal * 0.17;
      state.hull -= 9.5 * hazard.heat * heatFactor * Math.max(0.25, mitigation) * delta;
      const push = 35 * heatFactor * delta;
      this.player.vx += ((this.player.x - hazard.x) / Math.max(1, distance)) * push;
      this.player.vy += ((this.player.y - hazard.y) / Math.max(1, distance)) * push;
      state.status = 'Thermal vent plume is cooking the suit.';
    }
  }

  private steerFish(fish: Fish, delta: number) {
    const toPlayerX = this.player.x - fish.x;
    const toPlayerY = this.player.y - fish.y;
    const playerDistance = Math.hypot(toPlayerX, toPlayerY);
    let targetX = fish.homeX;
    let targetY = fish.homeY;

    if (fish.pattern === 'school') {
      targetX += Math.sin(fish.phase * 1.8) * 110;
      targetY += Math.cos(fish.phase * 1.25) * 34;
    } else if (fish.pattern === 'sway') {
      targetX += Math.sin(fish.phase * 1.1) * 72;
      targetY += Math.sin(fish.phase * 3.2) * 28;
    } else if (fish.pattern === 'glide') {
      targetX += Math.sin(fish.phase * 0.45) * 180;
      targetY += Math.cos(fish.phase * 0.36) * 70;
    } else if (fish.pattern === 'circle') {
      targetX += Math.cos(fish.phase * 0.52) * 120;
      targetY += Math.sin(fish.phase * 0.52) * 80;
    } else if (fish.pattern === 'stalk') {
      if (playerDistance < 170 && !fish.scanned) {
        targetX = this.player.x;
        targetY = this.player.y;
      } else {
        targetX += Math.sin(fish.phase * 0.9) * 130;
        targetY += Math.cos(fish.phase * 0.7) * 44;
      }
    }

    if (!fish.hostile && playerDistance < 72) {
      targetX = fish.x - toPlayerX * 1.4;
      targetY = fish.y - toPlayerY * 1.4;
    }

    const dx = targetX - fish.x;
    const dy = targetY - fish.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const desiredSpeed = fish.speed * (fish.hostile && playerDistance < 170 ? 1.2 : 1);
    fish.vx += (dx / len) * desiredSpeed * delta * 2.6;
    fish.vy += (dy / len) * desiredSpeed * delta * 2.6;
    const speed = Math.hypot(fish.vx, fish.vy);
    const maxSpeed = fish.speed * 1.45;
    if (speed > maxSpeed) {
      fish.vx = (fish.vx / speed) * maxSpeed;
      fish.vy = (fish.vy / speed) * maxSpeed;
    }
  }

  private keepFishInWater(fish: Fish) {
    const tx = Math.floor(fish.x / TILE);
    const ty = Math.floor(fish.y / TILE);
    if (this.getTile(tx, ty) === 'water') return;
    fish.x -= fish.vx * 0.09;
    fish.y -= fish.vy * 0.09;
    fish.vx *= -0.65;
    fish.vy *= -0.65;
    fish.homeX = Phaser.Math.Linear(fish.homeX, fish.x, 0.15);
    fish.homeY = Phaser.Math.Linear(fish.homeY, fish.y, 0.15);
  }

  private bumpFish(fish: Fish, distance: number) {
    const nx = distance > 0 ? (this.player.x - fish.x) / distance : 1;
    const ny = distance > 0 ? (this.player.y - fish.y) / distance : 0;
    const impact = Math.hypot(this.player.vx, this.player.vy);
    this.player.vx += nx * (fish.hostile ? 120 : 70);
    this.player.vy += ny * (fish.hostile ? 120 : 70);
    fish.vx -= nx * 140;
    fish.vy -= ny * 140;
    fish.bumpCooldown = 0.42;
    fish.scan = Math.max(0, fish.scan - 0.25);
    if (fish.hostile) {
      const damage = fish.species === 'Abyss Warden' ? 12 : 6;
      state.hull -= Math.max(2, damage + impact * 0.018 - state.upgrades.suit);
      state.status = `${fish.species} slammed your helmet.`;
    } else {
      state.status = `${fish.species} scattered from the collision.`;
    }
    renderHud();
  }

  private nearestLife(range: number): ScanTarget | null {
    let nearest: ScanTarget | null = null;
    let nearestDistance = range;
    for (const life of [...this.fish, ...this.flora]) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, life.x, life.y);
      if (distance < nearestDistance) {
        nearest = life;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private updateSystems(delta: number) {
    state.depth = Math.max(0, Math.floor((this.player.y - SURFACE_Y) / TILE) * 6);
    state.maxDepth = Math.max(state.maxDepth, state.depth);
    state.atBoat = this.isAtBoat();
    if (state.atBoat) {
      const sale = state.cargo.reduce((sum, item) => sum + item.value, 0);
      if (sale > 0) {
        state.credits += sale;
        state.status = `Sold cargo for ${sale} credits.`;
        state.cargo = [];
      }
      refillAtBoat(delta);
    } else {
      state.oxygen -= oxygenDrain() * delta;
    }

    const apexSpecies = currentApexSpecies();
    if (state.depth > 760 && !state.scannedSpecies.has(apexSpecies)) {
      state.status = state.biome === 1
        ? 'Something huge is moving below. Scan it before your suit gives out.'
        : state.biome === 2
          ? 'A brine giant is circling the vents. Scan it to chart this biome.'
          : 'A crowned predator is threading the anchorstone. Scan it to chart the trench.';
    }
    if (state.oxygen <= 0) {
      state.oxygen = 0;
      state.hull -= 16 * delta;
    }
    if (state.hull <= 0) {
      state.hull = 0;
      state.lost = true;
      state.status = `Helmet breached at ${state.maxDepth} m. Press R to restart.`;
    }
  }

  private isAtBoat(): boolean {
    return this.player.y < SURFACE_Y + 10 && Math.abs(this.player.x - WORLD_W * TILE * 0.5) < 170;
  }

  private isInDockingZone(): boolean {
    return this.player.y < SURFACE_Y + 38 && Math.abs(this.player.x - WORLD_W * TILE * 0.5) < 190;
  }

  private draw() {
    const camera = this.cameras.main;
    this.actors.clear();
    this.overlay.clear();
    camera.setBackgroundColor(depthColor(state.depth));
    this.drawWorld(camera);
    this.drawBoat();
    this.drawLooseItems(camera);
    this.drawHazards();
    this.drawFlora(camera);
    this.drawFish(camera);
    this.drawPlayer();
    this.drawDarkness(camera);
  }

  private drawWorld(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    const startX = Math.max(0, Math.floor(view.x / TILE) - 1);
    const endX = Math.min(WORLD_W - 1, Math.ceil(view.right / TILE) + 1);
    const startY = Math.max(0, Math.floor(view.y / TILE) - 1);
    const endY = Math.min(WORLD_H - 1, Math.ceil(view.bottom / TILE) + 1);
    const boundsKey = `${startX}:${endX}:${startY}:${endY}`;
    if (!this.terrainDirty && boundsKey === this.terrainBoundsKey) return;

    this.terrainDirty = false;
    this.terrainBoundsKey = boundsKey;
    this.terrain.clear();

    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = this.getTile(x, y);
        if (tile === 'water') {
          if (hash(x, y, seed) > 0.985) {
            this.terrain.lineStyle(1, 0x84dce6, 0.28);
            this.terrain.strokeCircle(x * TILE + 8, y * TILE + 8, 2 + hash(y, x, seed) * 4);
          }
          continue;
        }
        const def = tiles[tile];
        const fracture = this.damage[y][x] / def.hp;
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(def.color),
          Phaser.Display.Color.ValueToColor(0x111822),
          100,
          Math.floor(fracture * 36),
        );
        this.terrain.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
        this.terrain.fillRect(x * TILE, y * TILE, TILE, TILE);
        this.terrain.lineStyle(1, 0x071016, 0.35);
        this.terrain.strokeRect(x * TILE, y * TILE, TILE, TILE);
        if (fracture > 0) {
          this.terrain.lineStyle(1, 0xeef9f7, 0.2 + fracture * 0.35);
          this.terrain.lineBetween(x * TILE + 5, y * TILE + 6, x * TILE + 17, y * TILE + 18);
        }
      }
    }
  }

  private drawBoat() {
    const x = WORLD_W * TILE * 0.5;
    this.actors.fillStyle(0xd9824b, 1);
    this.actors.fillRoundedRect(x - 150, 26, 300, 34, 7);
    this.actors.fillStyle(0xf2d39b, 1);
    this.actors.fillTriangle(x - 34, 26, x + 38, 26, x - 10, 0);
    this.actors.lineStyle(2, 0xb8edf0, 0.65);
    this.actors.lineBetween(x, 60, x, SURFACE_Y + 18);
  }

  private drawHazards() {
    for (const hazard of this.hazards) {
      const pulse = (Math.sin(hazard.phase * 1.8) + 1) * 0.5;
      this.actors.fillStyle(0xff6f3c, 0.3 + pulse * 0.24);
      this.actors.fillEllipse(hazard.x, hazard.y + 10, hazard.radius * 0.95, 14);
      this.actors.lineStyle(2, 0xffd166, 0.12 + pulse * 0.34);
      this.actors.lineBetween(hazard.x - 9, hazard.y + 4, hazard.x - 18, hazard.y - hazard.radius * (0.45 + pulse * 0.32));
      this.actors.lineBetween(hazard.x + 2, hazard.y + 2, hazard.x + 5, hazard.y - hazard.radius * (0.58 + pulse * 0.28));
      this.actors.lineBetween(hazard.x + 13, hazard.y + 6, hazard.x + 24, hazard.y - hazard.radius * (0.38 + pulse * 0.3));
      if (pulse > 0.45) {
        this.actors.lineStyle(1, 0xff8a5c, pulse * 0.38);
        this.actors.strokeCircle(hazard.x, hazard.y, hazard.radius * (0.55 + pulse * 0.45));
      }
    }
  }

  private drawFish(camera: Phaser.Cameras.Scene2D.Camera) {
    for (const fish of this.fish) {
      const alpha = this.fishVisibilityAlpha(fish, camera);
      if (alpha <= 0) continue;
      const angle = Math.atan2(fish.vy, fish.vx);
      const bodyAlpha = fish.scanned ? Math.max(alpha, 0.9) : alpha;
      const threatDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      const threat = fish.hostile ? 1 - Phaser.Math.Clamp((threatDistance - 52) / 170, 0, 1) : 0;
      this.actors.save();
      this.actors.translateCanvas(fish.x, fish.y);
      this.actors.rotateCanvas(angle);
      this.actors.fillStyle(fish.color, bodyAlpha);
      if (fish.hostile) {
        this.actors.fillEllipse(0, 0, fish.radius * 2.7, fish.radius * 1.2);
        this.actors.fillTriangle(-fish.radius * 1.2, 0, -fish.radius * 2.45, -fish.radius * 0.85, -fish.radius * 2.45, fish.radius * 0.85);
        this.actors.fillTriangle(fish.radius * 0.4, -fish.radius * 0.45, -fish.radius * 0.2, -fish.radius * 1.35, -fish.radius * 0.9, -fish.radius * 0.34);
        this.actors.fillTriangle(fish.radius * 0.4, fish.radius * 0.45, -fish.radius * 0.2, fish.radius * 1.35, -fish.radius * 0.9, fish.radius * 0.34);
        this.actors.fillStyle(0xfff7df, bodyAlpha * 0.92);
        this.actors.fillTriangle(fish.radius * 0.72, -3, fish.radius * 1.08, -6, fish.radius * 1.08, 0);
      } else if (fish.pattern === 'sway') {
        this.actors.fillEllipse(0, 0, fish.radius * 3.4, fish.radius * 0.92);
        this.actors.fillStyle(0xeef9f7, bodyAlpha * 0.72);
        this.actors.fillCircle(fish.radius * 0.7, -2, 2.2);
        this.actors.lineStyle(2, fish.color, bodyAlpha * 0.75);
        this.actors.lineBetween(-fish.radius * 1.2, 0, -fish.radius * 2.2, Math.sin(fish.phase * 7) * 7);
      } else if (fish.pattern === 'glide' || fish.pattern === 'circle') {
        this.actors.fillTriangle(fish.radius * 1.5, 0, -fish.radius * 0.9, -fish.radius * 0.75, -fish.radius * 0.9, fish.radius * 0.75);
        this.actors.fillStyle(0xeef9f7, bodyAlpha * 0.85);
        this.actors.fillCircle(fish.radius * 0.42, -2, 2.4);
      } else {
        this.actors.fillEllipse(0, 0, fish.radius * 2.5, fish.radius * 1.18);
        this.actors.fillTriangle(-fish.radius * 1.1, 0, -fish.radius * 2.2, -fish.radius * 0.72, -fish.radius * 2.2, fish.radius * 0.72);
        this.actors.fillStyle(0xeef9f7, bodyAlpha * 0.8);
        this.actors.fillCircle(fish.radius * 0.56, -2, 2.5);
      }
      this.actors.restore();
      if (fish.hostile) {
        const markerAlpha = Math.max(0.35, threat) * alpha;
        const markerY = fish.y - fish.radius - 18 - Math.sin(fish.phase * 7) * 2;
        this.actors.fillStyle(0xff4f64, markerAlpha);
        this.actors.fillTriangle(fish.x, markerY, fish.x - 6, markerY - 12, fish.x + 6, markerY - 12);
        this.actors.fillRect(fish.x - 2, markerY - 9, 4, 8);
        this.actors.fillCircle(fish.x, markerY + 1, 2);
        if (threat > 0) {
          this.actors.lineStyle(2, 0xff4f64, threat * 0.72);
          this.actors.strokeCircle(fish.x, fish.y, fish.radius + 11 + Math.sin(fish.phase * 8) * 3);
        }
      }
      if (fish.scan > 0 && !fish.scanned) {
        this.actors.lineStyle(3, 0xb9f27c, 0.35 + fish.scan * 0.5);
        this.actors.beginPath();
        this.actors.arc(fish.x, fish.y, fish.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fish.scan);
        this.actors.strokePath();
      }
      if (fish.scanPulse > 0) {
        this.actors.lineStyle(2, 0xb9f27c, fish.scanPulse * 0.75);
        this.actors.strokeCircle(fish.x, fish.y, fish.radius + 7 + (1 - fish.scanPulse) * 14);
      }
    }
  }

  private drawFlora(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const flora of this.flora) {
      if (flora.x < view.x - 60 || flora.x > view.right + 60 || flora.y < view.y - 60 || flora.y > view.bottom + 60) continue;
      const alpha = state.depth < 180 || Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y) < lightRadius() + 120
        ? 0.82
        : flora.scanned ? 0.42 : 0.18;
      const sway = Math.sin(flora.phase * 2.1) * 4;
      this.actors.lineStyle(2, flora.color, alpha);
      this.actors.lineBetween(flora.x, flora.y + flora.radius, flora.x + sway, flora.y - flora.radius);
      this.actors.lineBetween(flora.x - 4, flora.y + flora.radius * 0.35, flora.x - 9 + sway, flora.y - flora.radius * 0.45);
      this.actors.lineBetween(flora.x + 4, flora.y + flora.radius * 0.2, flora.x + 11 + sway, flora.y - flora.radius * 0.55);
      this.actors.fillStyle(flora.color, alpha * 0.9);
      this.actors.fillCircle(flora.x + sway, flora.y - flora.radius, flora.rare ? 4 : 3);
      if (flora.hazardous) {
        this.actors.lineStyle(1, 0xff4f64, 0.35 + (flora.rare ? 0.25 : 0));
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + 5 + Math.sin(flora.phase * 5) * 2);
      }
      if (flora.scan > 0 && !flora.scanned) {
        this.actors.lineStyle(3, 0xb9f27c, 0.35 + flora.scan * 0.5);
        this.actors.beginPath();
        this.actors.arc(flora.x, flora.y, flora.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * flora.scan);
        this.actors.strokePath();
      }
      if (flora.scanPulse > 0) {
        this.actors.lineStyle(2, 0xb9f27c, flora.scanPulse * 0.75);
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + 7 + (1 - flora.scanPulse) * 14);
      }
    }
  }

  private fishVisibilityAlpha(fish: Fish, camera: Phaser.Cameras.Scene2D.Camera) {
    const margin = 80;
    const view = camera.worldView;
    const onCamera =
      fish.x > view.x - margin &&
      fish.x < view.right + margin &&
      fish.y > view.y - margin &&
      fish.y < view.bottom + margin;
    if (!onCamera) return fish.scanned ? 0.24 : 0;
    if (state.depth < 180) return fish.scanned ? 0.95 : 0.78;

    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
    const fullyVisibleAt = lightRadius() * 0.92;
    const goneAt = lightRadius() + 210;
    if (distance <= fullyVisibleAt) return fish.scanned ? 0.95 : 0.74;
    if (fish.scanned) return 0.42;
    const fade = 1 - Phaser.Math.Clamp((distance - fullyVisibleAt) / (goneAt - fullyVisibleAt), 0, 1);
    return fade * 0.58;
  }

  private drawPlayer() {
    const p = this.player;
    const angle = p.facing.angle();
    this.actors.save();
    this.actors.translateCanvas(p.x, p.y);
    this.actors.rotateCanvas(angle);
    this.actors.fillStyle(0xf4c16d, 1);
    this.actors.fillRoundedRect(-12, -9, 24, 18, 8);
    this.actors.fillStyle(0x97ecf0, 1);
    this.actors.fillCircle(7, -1, 6);
    this.actors.fillStyle(0xeef9f7, 1);
    this.actors.fillTriangle(13, 0, 34 + state.upgrades.laser * 5, -4, 34 + state.upgrades.laser * 5, 4);
    this.actors.restore();
    this.actors.lineStyle(2, 0x9de2da, 0.38);
    this.actors.strokeCircle(p.x, p.y, 18);
  }

  private drawDarkness(camera: Phaser.Cameras.Scene2D.Camera) {
    const darkness = Phaser.Math.Clamp((state.depth - 80) / 700, 0, 0.8);
    if (darkness <= 0) return;
    this.overlay.fillStyle(0x02070b, darkness);
    this.overlay.fillRect(0, 0, camera.width, camera.height);
    const px = (this.player.x - camera.scrollX) * camera.zoom;
    const py = (this.player.y - camera.scrollY) * camera.zoom;
    this.overlay.fillStyle(0xb8edf0, 0.1 + state.upgrades.lamp * 0.035);
    this.overlay.fillCircle(px, py, lightRadius() * camera.zoom);
    this.overlay.lineStyle(2, 0xcdfcff, 0.1 + state.upgrades.lamp * 0.04);
    this.overlay.strokeCircle(px, py, lightRadius() * camera.zoom);
  }

  private tileAtWorld(worldX: number, worldY: number): Tile {
    return this.getTile(Math.floor(worldX / TILE), Math.floor(worldY / TILE));
  }

  private getTile(x: number, y: number): Tile {
    if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return 'bedrock';
    return this.world[y][x];
  }

  private setTile(x: number, y: number, tile: Tile) {
    if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return;
    this.world[y][x] = tile;
    this.terrainDirty = true;
  }
}

function generateTile(x: number, y: number): Tile {
  if (y < 7) return 'water';
  if (x <= 1 || x >= WORLD_W - 2 || y >= WORLD_H - 2) return 'bedrock';
  const depth = y * TILE;
  const shallow = Phaser.Math.Clamp(1 - (y - 7) / 52, 0, 1);
  const cave =
    Math.sin(x * 0.31 + seed) * 0.72 +
    Math.cos(y * 0.21 + seed * 0.01) * 0.64 +
    Math.sin((x + y) * 0.12 + seed * 0.04) * 0.42 +
    (hash(x, y, seed) - 0.5) * 1.35;
  const caveThreshold = Phaser.Math.Linear(0.26, 1.04, 1 - shallow);
  if (cave > caveThreshold && y > 8) return 'water';
  const r = hash(x * 11, y * 17, seed);
  if (state.biome === 3) {
    if (depth > 420 && hash(x * 3, y * 5, seed) > 0.93 && (x + y) % 4 !== 0) return 'anchorstone';
    if (depth > 1350 && r > 0.94) return 'sunstone';
    if (depth > 780 && r > 0.895) return 'cobalt';
    if (depth > 1180 && r > 0.978) return 'relic';
    if (depth > 300 && r > 0.86) return 'ruby';
    return depth > 280 || hash(y, x, seed) > 0.58 ? 'stone' : 'sand';
  }
  if (state.biome === 2) {
    if (depth > 1250 && r > 0.955) return 'sunstone';
    if (depth > 620 && r > 0.915) return 'cobalt';
    if (depth > 1040 && r > 0.982) return 'relic';
    if (depth > 260 && r > 0.88) return 'quartz';
    return depth > 360 || hash(y, x, seed) > 0.66 ? 'stone' : 'sand';
  }
  if (depth > 1300 && r > 0.982) return 'relic';
  if (depth > 950 && r > 0.956) return 'ruby';
  if (depth > 460 && r > 0.925) return 'quartz';
  if (depth > 180 && r > 0.89) return 'copper';
  return depth > 520 || hash(y, x, seed) > 0.74 ? 'stone' : 'sand';
}

function hash(x: number, y: number, s: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 0.013) * 43758.5453123;
  return n - Math.floor(n);
}

function axis(negativeA: Phaser.Input.Keyboard.Key, negativeB: Phaser.Input.Keyboard.Key, positiveA: Phaser.Input.Keyboard.Key, positiveB: Phaser.Input.Keyboard.Key) {
  return (positiveA.isDown || positiveB.isDown ? 1 : 0) - (negativeA.isDown || negativeB.isDown ? 1 : 0);
}

function oxygenMax() {
  return 100 + state.upgrades.oxygen * 48;
}

function hullMax() {
  return 100 + state.upgrades.suit * 32;
}

function cargoCapacity() {
  return 6 + state.upgrades.cargo * 4;
}

function swimTopSpeed() {
  return 150 + state.upgrades.speed * 26;
}

function mineCooldown() {
  return Math.max(0.16, 0.38 * Math.pow(0.92, state.upgrades.laser));
}

function scanReward(target: ScanTarget) {
  const base = target.kind === 'fish'
    ? 30 + (target.hostile ? 28 : 0)
    : 24 + (target.hazardous ? 34 : 0) + (target.rare ? 26 : 0);
  return base + state.upgrades.scanner * 18;
}

function currentApexSpecies() {
  if (state.biome === 1) return 'Abyss Warden';
  if (state.biome === 2) return 'Brine Leviathan';
  return 'Trench Crown';
}

function lifeCatalogTotal() {
  return biomeFish[state.biome].length + biomeFlora[state.biome].length;
}

function bargeUpgradeCost() {
  return state.biome === 1 ? BARGE_UPGRADE_COST : 15000;
}

function oxygenDrain() {
  return 5.4 + Math.max(0, state.depth - 300) / 260;
}

function lightRadius() {
  return 72 + state.upgrades.lamp * 22;
}

function upgradeCost(upgrade: Upgrade) {
  return Math.round(upgrade.baseCost * (1 + state.upgrades[upgrade.id] * 0.72));
}

function upgradeMax(upgrade: Upgrade) {
  if (state.biome === 3 && upgrade.biome === 1) return upgrade.max + 6;
  if (state.biome >= 2 && upgrade.biome === 1) return upgrade.max + 3;
  return upgrade.max;
}

function refillAtBoat(delta = 1) {
  state.oxygen = Math.min(oxygenMax(), state.oxygen + 90 * delta);
  state.hull = Math.min(hullMax(), state.hull + 75 * delta);
}

function depthColor(depth: number) {
  if (state.biome === 3) {
    if (depth < 220) return '#161d32';
    if (depth < 560) return '#111424';
    return '#090913';
  }
  if (state.biome === 2) {
    if (depth < 220) return '#18313a';
    if (depth < 560) return '#171f2b';
    return '#110f18';
  }
  if (depth < 220) return '#0b3741';
  if (depth < 520) return '#092430';
  return '#06111d';
}

function restart(scene: DeepdiveScene) {
  state.biome = 1;
  state.credits = 0;
  state.oxygen = 100;
  state.hull = 100;
  state.depth = 0;
  state.maxDepth = 0;
  state.cargo = [];
  state.scannedSpecies.clear();
  state.won = false;
  state.lost = false;
  state.atBoat = true;
  state.paused = false;
  state.status = 'A new trench map is ready. Dive again.';
  for (const key of Object.keys(state.upgrades) as UpgradeId[]) state.upgrades[key] = 0;
  seed = Math.floor(Math.random() * 1_000_000);
  scene.scene.restart();
  renderHud();
}

function renderHud() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  bindUiEvents(app);
  if (!document.querySelector('#game')) {
    app.innerHTML = `
      <main class="shell">
        <section id="game"></section>
        <aside class="hud">
          <header>
            <span>${biomeName()}</span>
            <h1>Abyss miner</h1>
          </header>
          <div id="gauges"></div>
        </aside>
        <aside id="barge-menu" class="barge-menu"></aside>
        <aside class="controls">
          <strong>Controls</strong>
          <span>WASD / arrows move</span>
          <span>Mouse or Space cuts terrain</span>
          <span>Hold E to scan nearby fish</span>
          <span>Dock at the barge to sell, refill, repair, and upgrade</span>
        </aside>
      </main>
    `;
  }
  const gauges = document.querySelector<HTMLDivElement>('#gauges');
  const bargeMenu = document.querySelector<HTMLDivElement>('#barge-menu');
  if (!gauges || !bargeMenu) return;
  const cargoValue = state.cargo.reduce((sum, item) => sum + item.value, 0);
  gauges.innerHTML = `
    <div class="readout">
      <div><strong>${state.credits}</strong><span>Credits</span></div>
      <div><strong>${state.depth} m</strong><span>Depth</span></div>
      <div><strong>${state.maxDepth} m</strong><span>Record</span></div>
    </div>
    ${meter('Oxygen', state.oxygen, oxygenMax(), '#8ee7f4')}
    ${meter('Hull', state.hull, hullMax(), '#ff8a6b')}
    ${meter('Cargo', state.cargo.length, cargoCapacity(), '#ffd166', `${state.cargo.length}/${cargoCapacity()} slots, ${cargoValue}c`)}
    <p class="status">${state.status}</p>
    <div class="utility-actions">
      <button data-pause>${state.paused ? 'Resume' : 'Pause'}</button>
      <button data-gold>+1,000 credits</button>
    </div>
    ${state.won || state.lost ? '<button data-restart>Restart run</button>' : ''}
  `;
  bargeMenu.classList.toggle('is-open', state.atBoat && !state.lost && !state.won);
  bargeMenu.innerHTML = state.atBoat && !state.lost && !state.won
    ? `
      <div class="shop-title">
        <div>
          <span>Barge Dock</span>
          <strong>Refit and resupply</strong>
        </div>
        <span>${state.scannedSpecies.size}/${lifeCatalogTotal()} scans</span>
      </div>
      <div class="dock-summary">
        <span>O2 and hull refilling</span>
        <span>Cargo sold automatically</span>
        <strong>${state.credits} credits</strong>
      </div>
      ${bargeTravelRow()}
      <div class="upgrade-list">
        ${availableUpgrades().map((upgrade) => upgradeRow(upgrade)).join('')}
      </div>
    `
    : '';
}

function bindUiEvents(app: HTMLDivElement) {
  if (uiEventsBound) return;
  uiEventsBound = true;
  app.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const upgradeButton = target.closest<HTMLButtonElement>('button[data-upgrade]');
    if (upgradeButton && !upgradeButton.disabled) {
      event.preventDefault();
      gameScene()?.buy(upgradeButton.dataset.upgrade as UpgradeId);
      return;
    }
    const restartButton = target.closest<HTMLButtonElement>('button[data-restart]');
    if (restartButton && !restartButton.disabled) {
      event.preventDefault();
      const scene = gameScene();
      if (scene) restart(scene);
      return;
    }
    const pauseButton = target.closest<HTMLButtonElement>('button[data-pause]');
    if (pauseButton) {
      event.preventDefault();
      state.paused = !state.paused;
      renderHud();
      return;
    }
    const goldButton = target.closest<HTMLButtonElement>('button[data-gold]');
    if (goldButton) {
      event.preventDefault();
      state.credits += 1000;
      state.status = 'Debug grant: +1,000 credits.';
      renderHud();
      return;
    }
    const travelButton = target.closest<HTMLButtonElement>('button[data-travel-biome]');
    if (travelButton && !travelButton.disabled) {
      event.preventDefault();
      const nextName = state.biome === 1 ? 'Brine Vent Shelf' : 'Midnight Trench';
      const ready = window.confirm(`Retrofit the barge for ${bargeUpgradeCost().toLocaleString()} credits and travel to ${nextName}? You will leave the current trench and enter a more dangerous biome.`);
      if (ready) gameScene()?.travelToNextBiome();
    }
  });
}

function availableUpgrades() {
  return upgrades.filter((upgrade) => upgrade.biome <= state.biome);
}

function bargeTravelRow() {
  if (state.biome >= 3) {
    return `
      <article class="travel-card">
        <strong>Midnight Trench</strong>
        <span>Anchorstone strata are blocking wide cuts. Chart the deep life and survive the tight routes.</span>
      </article>
    `;
  }
  const cost = bargeUpgradeCost();
  const nextName = state.biome === 1 ? 'Brine Vent Shelf' : 'Midnight Trench';
  const description = state.biome === 1
    ? 'Unlocks advanced refits, hotter hazards, and richer minerals.'
    : 'Adds hazardous flora, stronger vent fields, and anchorstone that cannot be mined.';
  const disabled = state.credits < cost;
  return `
    <article class="travel-card">
      <div>
        <strong>Barge Retrofit</strong>
        <span>Travel to ${nextName}. ${description}</span>
      </div>
      <button data-travel-biome ${disabled ? 'disabled' : ''}>${cost.toLocaleString()}c</button>
    </article>
  `;
}

function biomeName() {
  if (state.biome === 1) return 'Deepwater Claim';
  if (state.biome === 2) return 'Brine Vent Shelf';
  return 'Midnight Trench';
}

function meter(label: string, value: number, max: number, color: string, detail = `${Math.ceil(value)} / ${max}`) {
  const pct = Phaser.Math.Clamp((value / max) * 100, 0, 100);
  return `
    <div class="meter-block">
      <div><span>${label}</span><strong>${detail}</strong></div>
      <i><b style="width:${pct}%; background:${color}"></b></i>
    </div>
  `;
}

function upgradeRow(upgrade: Upgrade) {
  const level = state.upgrades[upgrade.id];
  const max = upgradeMax(upgrade);
  const maxed = level >= max;
  const cost = upgradeCost(upgrade);
  const disabled = maxed || state.credits < cost;
  return `
    <article class="upgrade">
      <div>
        <strong>${upgrade.name} Mk ${level}/${max}</strong>
        <span>${upgrade.text}</span>
      </div>
      <button data-upgrade="${upgrade.id}" ${disabled ? 'disabled' : ''}>${maxed ? 'Max' : `${cost}c`}</button>
    </article>
  `;
}

function gameScene(): DeepdiveScene | null {
  return game.scene.getScene('DeepdiveScene') as DeepdiveScene | null;
}

renderHud();

let game: Phaser.Game;
game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b3741',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: 960,
    height: 640,
  },
  render: {
    antialias: false,
    pixelArt: true,
  },
  scene: DeepdiveScene,
});
