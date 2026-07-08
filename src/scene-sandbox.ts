import Phaser from 'phaser';
import type {
  ArticulatedCreature,
  ArticulatedSocketOverlayManifest,
  Biome,
  FishSpecies,
  FloraSpecies,
  ScanRarity,
} from './types';
import { ENTITY_SCALE } from './constants';
import { biomeFish, biomeFlora, shopItems, subDefs, tiles } from './content';
import {
  articulatedCreatureDef,
  articulatedCreatureDefs,
  articulatedManifestInfo,
  createArticulatedCreature,
  ensureArticulatedTextures,
  partManifest,
} from './articulated';
import { animatedFrame, cargoIconForTile, diverFrame, fishAssetKey, fishFrameCount, fishRarity as runtimeFishRarity, loadGeneratedAssets, rarityColor } from './helpers';
import { updateArticulatedParts } from './scene-articulated';

const PART_WORLD_SCALE = ENTITY_SCALE;

type SandboxKind = 'diver' | 'articulated' | 'source' | 'fish' | 'flora' | 'object' | 'item' | 'ore';
type SandboxMode = 'idle' | 'lunge' | 'stunned';
type SandboxCompanion = 'diver' | 'none';

interface SourceCandidateEntry {
  id: string;
  species?: string;
  status?: string;
  source?: string;
}

interface SourceCandidateManifest {
  schema?: string;
  candidates?: SourceCandidateEntry[];
}

interface SandboxIndexEntry {
  id: string;
  kind?: SandboxKind;
  qualityStatus?: string;
  reviewStage?: SandboxEntry['reviewStage'];
  acceptedForContentGate?: boolean;
  sourceCandidateId?: string | null;
  acceptanceNotice?: string;
  productionBoundary?: SandboxProductionBoundary;
}

interface SandboxIndexManifest {
  schema?: string;
  entries?: SandboxIndexEntry[];
}

interface SandboxProductionBoundary {
  schema?: string;
  reviewStage?: SandboxEntry['reviewStage'];
  qualityStatus?: string | null;
  productionReady?: boolean;
  acceptedForContentGate?: boolean;
  previewOnly?: boolean;
  manualReviewRequired?: string | null;
  claim?: string;
}

interface SandboxEntry {
  id: string;
  name: string;
  kind: SandboxKind;
  textureKey?: string;
  frameCount?: number;
  biome?: Biome;
  rarity: ScanRarity;
  radius?: number;
  hostile?: boolean;
  qualityStatus?: string;
  reviewStage?: 'accepted' | 'prototype' | 'source-approved' | 'source-review' | 'reference';
  acceptedForContentGate?: boolean;
  sourceCandidateId?: string | null;
  acceptanceNotice?: string;
  productionBoundary?: SandboxProductionBoundary;
  notes: string;
}

function queryParam(name: string) {
  return new URLSearchParams(window.location.search).get(name);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function socketStyleValue(
  creature: ArticulatedCreature,
  overlay: ArticulatedSocketOverlayManifest,
  key: keyof NonNullable<ArticulatedCreature['manifest']['socketStyle']>,
  fallback: number,
) {
  return overlay[key] ?? creature.manifest.socketStyle?.[key] ?? fallback;
}

function colorValue(value: number | undefined, fallback: number) {
  return typeof value === 'number' ? value : fallback;
}

function floraPreviewKey(biome: Biome, species: FloraSpecies) {
  if (species.species === 'Glass Kelp') return 'terrain-edge-flora-glass-kelp';
  if (species.species === 'Moon Sponge') return 'terrain-edge-flora-moon-sponge';
  if (species.species === 'Sting Anemone') return 'terrain-edge-flora-sting-anemone';
  if (species.species === 'Brine Grass') return 'terrain-edge-flora-brine-grass';
  if (species.species === 'Vent Coral') return 'terrain-edge-flora-vent-coral';
  if (species.species === 'Ember Bloom') return 'terrain-edge-flora-ember-bloom';
  if (species.species === 'Black Fan') return 'terrain-edge-flora-black-fan';
  if (species.species === 'Lumen Fern') return 'terrain-edge-flora-lumen-fern';
  if (species.species === 'Crown Polyp') return 'terrain-edge-flora-crown-polyps';
  if (species.species === 'Oracle Polyp') return 'terrain-edge-flora-oracle-tendrils';
  if (species.species === 'Oxygen Bloom') return 'env-flora-oxygen-bloom';
  if (species.species === 'Lumen Nodule') return 'env-flora-lumen-nodule';
  return biome === 1 ? 'terrain-edge-flora-glass-kelp' : 'terrain-edge-flora-moon-sponge';
}

function floraRarity(species: FloraSpecies): ScanRarity {
  if (species.rare && species.hazardous) return 'epic';
  if (species.rare) return 'rare';
  if (species.hazardous) return 'uncommon';
  return 'common';
}

export class EntitySandboxScene extends Phaser.Scene {
  private stage!: Phaser.GameObjects.Graphics;
  private bridges!: Phaser.GameObjects.Graphics;
  private diver!: Phaser.GameObjects.Image;
  private previewSprite?: Phaser.GameObjects.Image;
  private labels: Phaser.GameObjects.Text[] = [];
  private gatePanel!: Phaser.GameObjects.Graphics;
  private creature?: ArticulatedCreature;
  private creaturePreviewScale = 1;
  private entries: SandboxEntry[] = [];
  private entryIndex = 0;
  private unresolvedRequest?: string;
  private elapsed = 0;
  private attack = false;
  private stunned = false;
  private controls!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('EntitySandboxScene');
  }

  preload() {
    loadGeneratedAssets(this);
    const sourceManifestKey = 'source-candidates__manifest';
    this.load.json(sourceManifestKey, '/review/source-candidates/source-candidates.json');
    this.load.json('sandbox-index__manifest', '/review/sandbox/manifest.json');
    this.load.once(`filecomplete-json-${sourceManifestKey}`, () => {
      const manifest = this.cache.json.get(sourceManifestKey) as SourceCandidateManifest | undefined;
      if (manifest?.schema !== 'water9/source-candidates@1') return;
      for (const candidate of manifest.candidates ?? []) {
        if (!candidate.id || !candidate.source) continue;
        const sourceUrl = `/${candidate.source.replace(/^public\//, '')}`;
        this.load.image(`source-${candidate.id}`, sourceUrl);
      }
    });
  }

  create() {
    ensureArticulatedTextures(this);
    this.cameras.main.setBackgroundColor('#061520');
    this.stage = this.add.graphics().setDepth(-10);
    this.bridges = this.add.graphics().setDepth(1.05);
    this.gatePanel = this.add.graphics().setDepth(19);
    this.diver = this.add.image(0, 0, 'diver-swim-0').setOrigin(0.5).setDepth(3);
    this.controls = this.input.keyboard!.addKeys('LEFT,RIGHT,A,D,SPACE,S,R') as Record<string, Phaser.Input.Keyboard.Key>;
    this.entries = this.buildCatalog();
    window.__AQUA_SANDBOX__ = {
      snapshot: () => this.sandboxSnapshot(),
      setMode: (mode: SandboxMode) => this.setSandboxMode(mode),
    };
    const requested = queryParam('sandbox') ?? queryParam('entity') ?? 'abyssal-gulper';
    const requestedIndex = this.entries.findIndex((entry) => this.entryMatches(entry, requested));
    this.unresolvedRequest = requestedIndex >= 0 ? undefined : requested;
    this.entryIndex = requestedIndex >= 0 ? requestedIndex : 0;
    this.spawnCurrentEntry();
    this.scale.on('resize', this.layout, this);
    this.layout();
  }

  update(_: number, deltaMs: number) {
    const delta = Math.min(0.05, deltaMs / 1000);
    this.elapsed += delta;
    if (Phaser.Input.Keyboard.JustDown(this.controls.RIGHT) || Phaser.Input.Keyboard.JustDown(this.controls.D)) {
      this.unresolvedRequest = undefined;
      this.entryIndex = (this.entryIndex + 1) % Math.max(1, this.entries.length);
      this.spawnCurrentEntry();
    }
    if (Phaser.Input.Keyboard.JustDown(this.controls.LEFT) || Phaser.Input.Keyboard.JustDown(this.controls.A)) {
      this.unresolvedRequest = undefined;
      this.entryIndex = (this.entryIndex - 1 + this.entries.length) % Math.max(1, this.entries.length);
      this.spawnCurrentEntry();
    }
    if (Phaser.Input.Keyboard.JustDown(this.controls.SPACE)) this.attack = !this.attack;
    if (Phaser.Input.Keyboard.JustDown(this.controls.S)) this.stunned = !this.stunned;
    if (Phaser.Input.Keyboard.JustDown(this.controls.R)) this.spawnCurrentEntry();

    this.drawStage();
    this.updateDiver();
    this.updatePreviewSprite();
    this.updateCreature(delta);
    this.drawLabels();
  }

  private buildCatalog(): SandboxEntry[] {
    const entries: SandboxEntry[] = [];
    const seen = new Set<string>();
    const addEntry = (entry: SandboxEntry) => {
      if (seen.has(entry.id)) return;
      seen.add(entry.id);
      entries.push(entry);
    };
    const sandboxManifest = this.cache.json.get('sandbox-index__manifest') as SandboxIndexManifest | undefined;
    const sandboxIndexById = new Map(
      sandboxManifest?.schema === 'water9/sandbox-index@1'
        ? (sandboxManifest.entries ?? []).map((entry) => [entry.id, entry])
        : [],
    );

    addEntry({ id: 'diver', name: 'Diver', kind: 'diver', rarity: 'common', notes: 'Player animation preview' });

    for (const manifest of articulatedCreatureDefs()) {
      const sandboxEntry = sandboxIndexById.get(manifest.id);
      const qualityStatus = manifest.quality?.status ?? 'prototype';
      const acceptedForContentGate = sandboxEntry?.acceptedForContentGate === true;
      addEntry({
        id: manifest.id,
        name: manifest.species,
        kind: 'articulated',
        rarity: manifest.rarity,
        radius: manifest.radius,
        hostile: true,
        qualityStatus: sandboxEntry?.qualityStatus ?? qualityStatus,
        reviewStage: acceptedForContentGate ? 'accepted' : 'prototype',
        acceptedForContentGate,
        sourceCandidateId: sandboxEntry?.sourceCandidateId ?? manifest.quality?.sourceCandidateId ?? null,
        acceptanceNotice: sandboxEntry?.acceptanceNotice,
        productionBoundary: sandboxEntry?.productionBoundary,
        notes: `${manifest.parts.length} parts, ${manifest.socketOverlays?.length ?? 0} sockets`,
      });
    }

    const sourceManifest = this.cache.json.get('source-candidates__manifest') as SourceCandidateManifest | undefined;
    if (sourceManifest?.schema === 'water9/source-candidates@1') {
      for (const candidate of sourceManifest.candidates ?? []) {
        if (!candidate.id || !candidate.source) continue;
        const sandboxEntry = sandboxIndexById.get(`source-${candidate.id}`);
        const qualityStatus = candidate.status ?? 'unknown';
        addEntry({
          id: `source-${candidate.id}`,
          name: `${candidate.species ?? candidate.id} Source`,
          kind: 'source',
          textureKey: `source-${candidate.id}`,
          rarity: candidate.status === 'approved' ? 'legendary' : candidate.status === 'needs-review' ? 'rare' : 'common',
          hostile: true,
          qualityStatus: sandboxEntry?.qualityStatus ?? qualityStatus,
          reviewStage: sandboxEntry?.reviewStage ?? (candidate.status === 'approved' || candidate.status === 'rigged' ? 'source-approved' : 'source-review'),
          acceptedForContentGate: sandboxEntry?.acceptedForContentGate === true,
          sourceCandidateId: sandboxEntry?.sourceCandidateId ?? candidate.id,
          acceptanceNotice: sandboxEntry?.acceptanceNotice,
          productionBoundary: sandboxEntry?.productionBoundary,
          notes: `${candidate.status ?? 'unknown'}; ${candidate.source}`,
        });
      }
    }

    for (const [biomeText, speciesList] of Object.entries(biomeFish) as Array<[`${Biome}`, FishSpecies[]]>) {
      const biome = Number(biomeText) as Biome;
      for (const species of speciesList) {
        const textureKey = species.assetKey ?? fishAssetKey(species);
        addEntry({
          id: textureKey,
          name: species.species,
          kind: 'fish',
          textureKey,
          frameCount: fishFrameCount(textureKey),
          biome,
          rarity: runtimeFishRarity(species),
          radius: species.radius,
          hostile: species.hostile,
          notes: `${species.pattern}${species.hostile ? ', hostile' : ', neutral'}`,
        });
      }
    }

    for (const [biomeText, speciesList] of Object.entries(biomeFlora) as Array<[`${Biome}`, FloraSpecies[]]>) {
      const biome = Number(biomeText) as Biome;
      for (const species of speciesList) {
        addEntry({
          id: `flora-${slug(species.species)}`,
          name: species.species,
          kind: 'flora',
          textureKey: floraPreviewKey(biome, species),
          biome,
          rarity: floraRarity(species),
          radius: species.radius,
          hostile: species.hazardous,
          notes: species.hazardous ? 'hazardous scannable flora' : 'scannable flora',
        });
      }
    }

    for (const item of shopItems) {
      addEntry({
        id: item.id,
        name: item.name,
        kind: 'item',
        textureKey: item.icon,
        rarity: item.kind === 'tool' ? 'rare' : 'uncommon',
        notes: item.text,
      });
    }

    for (const sub of subDefs) {
      addEntry({
        id: `sub-tier${sub.tier}`,
        name: `${sub.name} Sub`,
        kind: 'object',
        textureKey: `sub-tier${sub.tier}`,
        rarity: sub.tier === 3 ? 'legendary' : sub.tier === 2 ? 'epic' : 'rare',
        notes: sub.features.join(', '),
      });
    }

    for (const tile of ['copper', 'quartz', 'ruby', 'cobalt', 'sunstone', 'relic', 'alienAlloy', 'ruinCore'] as const) {
      addEntry({
        id: `ore-${tile}`,
        name: tiles[tile].name,
        kind: 'ore',
        textureKey: cargoIconForTile(tile),
        rarity: tiles[tile].value > 1000 ? 'legendary' : tiles[tile].value > 250 ? 'epic' : 'uncommon',
        notes: `${tiles[tile].value} credits`,
      });
    }

    addEntry({ id: 'barge-platform', name: 'Barge Platform', kind: 'object', textureKey: 'barge-platform', rarity: 'rare', notes: 'Docking-stage object' });
    addEntry({ id: 'vent-base', name: 'Steam Vent', kind: 'object', textureKey: 'vent-base', rarity: 'uncommon', notes: 'Environmental hazard base' });
    addEntry({ id: 'bobbit', name: 'Bobbit Ambusher', kind: 'object', textureKey: 'bobbit-0', frameCount: 4, rarity: 'rare', hostile: true, notes: 'Existing latch enemy frames' });
    addEntry({ id: 'nest-egg', name: 'Predator Nest Egg', kind: 'object', textureKey: 'nest-egg-0', frameCount: 4, rarity: 'epic', hostile: true, notes: 'Nest hatchling trigger' });

    return entries;
  }

  private entryMatches(entry: SandboxEntry, requested: string) {
    const normalized = slug(requested);
    return entry.id === requested || entry.textureKey === requested || slug(entry.id) === normalized || slug(entry.name) === normalized;
  }

  private currentEntry() {
    return this.entries[this.entryIndex] ?? this.entries[0];
  }

  private sandboxSnapshot() {
    const entry = this.currentEntry();
    const companion = this.currentCompanion();
    const catalogByKind = this.entries.reduce<Record<string, number>>((counts, catalogEntry) => {
      counts[catalogEntry.kind] = (counts[catalogEntry.kind] ?? 0) + 1;
      return counts;
    }, {});
    return {
      requested: queryParam('sandbox') ?? queryParam('entity') ?? null,
      unresolvedRequest: this.unresolvedRequest ?? null,
      companion,
      mode: this.currentSandboxMode(),
      entryId: entry.id,
      entryName: entry.name,
      entryKind: entry.kind,
      qualityStatus: entry.qualityStatus ?? null,
      reviewStage: entry.reviewStage ?? 'reference',
      acceptedForContentGate: entry.acceptedForContentGate === true,
      sourceCandidateId: entry.sourceCandidateId ?? null,
      acceptanceNotice: entry.acceptanceNotice ?? null,
      productionBoundary: this.productionBoundaryFor(entry),
      reviewGateLabel: this.reviewGateLabel(entry),
      reviewGateSeverity: this.reviewGateSeverity(entry),
      entryIndex: this.entryIndex,
      catalogSize: this.entries.length,
      catalogIds: this.entries.map((catalogEntry) => catalogEntry.id),
      catalogByKind,
      articulatedCount: articulatedManifestInfo().ids.length,
      labels: this.labels.map((label) => label.text),
      hasDiver: this.diver.visible,
      hasCreature: Boolean(this.creature),
      hasPreviewSprite: Boolean(this.previewSprite),
      previewTexture: this.previewSprite?.texture?.key ?? null,
    };
  }

  private currentCompanion(): SandboxCompanion {
    const companion = (queryParam('companion') ?? queryParam('with') ?? 'diver').toLowerCase();
    return companion === 'none' ? 'none' : 'diver';
  }

  private currentSandboxMode(): SandboxMode {
    if (this.stunned) return 'stunned';
    if (this.attack) return 'lunge';
    return 'idle';
  }

  private setSandboxMode(mode: SandboxMode) {
    this.attack = mode === 'lunge';
    this.stunned = mode === 'stunned';
    return this.sandboxSnapshot();
  }

  private spawnCurrentEntry() {
    this.creature?.parts.forEach((part) => part.sprite?.destroy());
    this.creature?.socketOverlays.forEach((overlay) => overlay.sprite?.destroy());
    this.creature = undefined;
    this.previewSprite?.destroy();
    this.previewSprite = undefined;
    this.bridges?.clear();
    this.attack = false;
    this.stunned = false;

    const entry = this.currentEntry();
    if (entry.kind === 'articulated') {
      const manifest = articulatedCreatureDef(entry.id);
      this.creature = createArticulatedCreature(this, manifest, this.scale.width * 0.5 + 110, this.scale.height * 0.5 + 18);
      this.creaturePreviewScale = this.fitScaleForCreature(manifest);
      this.creature.vx = this.creature.speed * 0.32;
      this.creature.vy = 0;
      this.creature.facingSign = 1;
      this.creature.state = 'patrol';
      this.creature.swimEffort = 0.82;
    } else if (entry.textureKey) {
      const textureKey = this.textureForEntry(entry);
      this.previewSprite = this.add.image(0, 0, this.textures.exists(textureKey) ? textureKey : 'item-icon-stone')
        .setOrigin(0.5)
        .setDepth(2.4);
    }
    this.layout();
  }

  private layout() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setViewport(0, 0, width, height);
    this.diver.setPosition(width * 0.3, height * 0.54);
    this.previewSprite?.setPosition(width * 0.57, height * 0.52);
    if (this.creature) {
      this.creature.x = width * 0.56;
      this.creature.y = height * 0.54;
      this.creaturePreviewScale = this.fitScaleForCreature(this.creature.manifest);
    }
  }

  private fitScaleForCreature(manifest: ArticulatedCreature['manifest']) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const part of manifest.parts) {
      const originX = (part.origin[0] - 0.5) * part.size[0];
      const originY = (part.origin[1] - 0.5) * part.size[1];
      const centerX = part.offset[0] + originX;
      const centerY = part.offset[1] + originY;
      minX = Math.min(minX, centerX - part.size[0] * 0.5);
      maxX = Math.max(maxX, centerX + part.size[0] * 0.5);
      minY = Math.min(minY, centerY - part.size[1] * 0.5);
      maxY = Math.max(maxY, centerY + part.size[1] * 0.5);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return 1;
    const naturalWidth = Math.max(1, (maxX - minX) * PART_WORLD_SCALE);
    const naturalHeight = Math.max(1, (maxY - minY) * PART_WORLD_SCALE);
    const targetWidth = this.scale.width * 0.52;
    const targetHeight = this.scale.height * 0.58;
    return Phaser.Math.Clamp(Math.min(targetWidth / naturalWidth, targetHeight / naturalHeight), 0.32, 1);
  }

  private previewX(creature: ArticulatedCreature, x: number) {
    return creature.x + (x - creature.x) * this.creaturePreviewScale;
  }

  private previewY(creature: ArticulatedCreature, y: number) {
    return creature.y + (y - creature.y) * this.creaturePreviewScale;
  }

  private textureForEntry(entry: SandboxEntry) {
    if (!entry.textureKey) return 'item-icon-stone';
    if (entry.kind === 'fish') return entry.textureKey;
    if ((entry.frameCount ?? 0) > 1) {
      const frame = animatedFrame(this.elapsed, 54, entry.frameCount ?? 1, entry.kind === 'object' ? 5.6 : 4.2);
      return `${entry.textureKey.replace(/-0$/, '')}-${frame}`;
    }
    return entry.textureKey;
  }

  private updateDiver() {
    const entry = this.currentEntry();
    const isPrimary = entry.kind === 'diver';
    const showCompanion = isPrimary || this.currentCompanion() === 'diver';
    const speedPulse = 0.6 + Math.sin(this.elapsed * 2.2) * 0.18;
    this.diver
      .setVisible(showCompanion)
      .setTexture(`diver-swim-${diverFrame('swim', this.elapsed, speedPulse, 0)}`)
      .setPosition(this.scale.width * (isPrimary ? 0.5 : 0.28), this.scale.height * 0.54 + Math.sin(this.elapsed * 1.7) * 8)
      .setRotation(Math.sin(this.elapsed * 1.2) * 0.07)
      .setScale(isPrimary ? 2.8 : 1.65)
      .setAlpha(isPrimary ? 1 : 0.78);
  }

  private updatePreviewSprite() {
    const entry = this.currentEntry();
    if (!this.previewSprite || entry.kind === 'articulated' || entry.kind === 'diver') return;
    const textureKey = this.textureForEntry(entry);
    if (this.textures.exists(textureKey)) this.previewSprite.setTexture(textureKey);
    if (entry.kind === 'source') {
      const sourceWidth = Math.max(1, this.previewSprite.width);
      const sourceHeight = Math.max(1, this.previewSprite.height);
      const maxWidth = this.scale.width * 0.54;
      const maxHeight = this.scale.height * 0.62;
      const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
      this.previewSprite
        .setPosition(this.scale.width * 0.61, this.scale.height * 0.53)
        .setScale(scale)
        .setRotation(0)
        .setAlpha(1);
      return;
    }
    const radius = entry.radius ?? (entry.kind === 'object' ? 30 : entry.kind === 'item' || entry.kind === 'ore' ? 16 : 18);
    const targetWidth = Phaser.Math.Clamp(radius * (entry.kind === 'flora' ? 3.2 : entry.kind === 'object' ? 6.2 : 4.4), 42, 280);
    const sourceWidth = Math.max(1, this.previewSprite.width);
    const sourceHeight = Math.max(1, this.previewSprite.height);
    this.previewSprite
      .setPosition(this.scale.width * 0.58, this.scale.height * 0.52 + Math.sin(this.elapsed * 1.4) * (entry.kind === 'flora' ? 4 : 10))
      .setScale(targetWidth / sourceWidth)
      .setRotation(entry.kind === 'fish' ? Math.sin(this.elapsed * 1.3) * 0.08 : entry.kind === 'flora' ? Math.sin(this.elapsed * 1.1) * 0.025 : 0)
      .setAlpha(entry.hostile ? 1 : 0.92);
    if (entry.kind === 'flora') this.previewSprite.setDisplaySize(targetWidth, Math.max(targetWidth * 1.15, sourceHeight * this.previewSprite.scaleY));
    if (entry.kind === 'fish' && this.previewSprite.scaleX < 0) this.previewSprite.scaleX = Math.abs(this.previewSprite.scaleX);
  }

  private updateCreature(delta: number) {
    const creature = this.creature;
    if (!creature) {
      this.bridges.clear();
      return;
    }
    creature.phase += delta * (this.attack ? 3.2 : 1.65);
    creature.vx = creature.facingSign * creature.speed * (this.attack ? 0.62 : 0.28);
    creature.vy = Math.sin(this.elapsed * 1.3) * 10;
    creature.state = this.attack ? 'lunge' : 'patrol';
    creature.attackBlend = Phaser.Math.Linear(creature.attackBlend, this.attack ? 1 : 0, 1 - Math.exp(-7 * delta));
    creature.stunned = this.stunned ? 1 : 0;
    updateArticulatedParts.call(this as never, creature, delta, { preserveSmoothedPose: false });
    this.drawCreature(creature);
  }

  private drawCreature(creature: ArticulatedCreature) {
    this.bridges.clear();
    for (const overlay of creature.socketOverlays) {
      const manifest = creature.manifest.socketOverlays?.find((candidate) => candidate.id === overlay.id);
      const parent = manifest ? creature.parts.find((part) => part.id === manifest.parentId) : undefined;
      const child = manifest ? creature.parts.find((part) => part.id === manifest.childId) : undefined;
      if (!manifest || !parent || !child || parent.detached || child.detached || overlay.bridgeWidth <= 0) continue;
      const bridgeColor = colorValue(socketStyleValue(creature, manifest, 'bridgeColor', 0x14243a), 0x14243a);
      const coreColor = colorValue(socketStyleValue(creature, manifest, 'bridgeCoreColor', creature.color), creature.color);
      this.bridges.lineStyle(overlay.bridgeWidth * 0.96 * this.creaturePreviewScale, bridgeColor, socketStyleValue(creature, manifest, 'bridgeAlpha', 0.32));
      this.bridges.lineBetween(
        this.previewX(creature, overlay.parentAnchorX),
        this.previewY(creature, overlay.parentAnchorY),
        this.previewX(creature, overlay.childAnchorX),
        this.previewY(creature, overlay.childAnchorY),
      );
      this.bridges.lineStyle(Math.max(1, overlay.bridgeWidth * 0.38 * this.creaturePreviewScale), coreColor, socketStyleValue(creature, manifest, 'bridgeCoreAlpha', 0.14));
      this.bridges.lineBetween(
        this.previewX(creature, overlay.parentAnchorX),
        this.previewY(creature, overlay.parentAnchorY),
        this.previewX(creature, overlay.childAnchorX),
        this.previewY(creature, overlay.childAnchorY),
      );
    }

    for (const part of creature.parts) {
      const manifest = partManifest(creature, part);
      part.sprite
        ?.setTexture(part.hp <= 0 && manifest.damagedTextureKey ? manifest.damagedTextureKey : manifest.textureKey)
        .setVisible(true)
        .setPosition(this.previewX(creature, part.x), this.previewY(creature, part.y))
        .setOrigin(manifest.origin[0], manifest.origin[1])
        .setRotation(part.rotation)
        .setDisplaySize(manifest.size[0] * PART_WORLD_SCALE * this.creaturePreviewScale, manifest.size[1] * PART_WORLD_SCALE * this.creaturePreviewScale)
        .setAlpha(this.stunned ? 0.64 : 0.96)
        .setDepth(2 + manifest.depth + (part.id === 'jaw' ? creature.attackBlend * 0.035 : 0));
      if (part.sprite) part.sprite.scaleX = Math.abs(part.sprite.scaleX) * creature.facingSign;
    }

    for (const overlay of creature.socketOverlays) {
      const manifest = creature.manifest.socketOverlays?.find((candidate) => candidate.id === overlay.id);
      const parent = manifest ? creature.parts.find((part) => part.id === manifest.parentId) : undefined;
      const child = manifest ? creature.parts.find((part) => part.id === manifest.childId) : undefined;
      if (!manifest || !parent || !child || parent.detached || child.detached) {
        overlay.sprite?.setVisible(false);
        continue;
      }
      overlay.sprite
        ?.setTexture(manifest.textureKey)
        .setVisible(true)
        .setPosition(this.previewX(creature, overlay.x), this.previewY(creature, overlay.y))
        .setOrigin(manifest.origin[0], manifest.origin[1])
        .setRotation(overlay.rotation)
        .setDisplaySize(
          (overlay.width || manifest.size[0] * PART_WORLD_SCALE) * this.creaturePreviewScale,
          (overlay.height || manifest.size[1] * PART_WORLD_SCALE) * this.creaturePreviewScale,
        )
        .setAlpha(socketStyleValue(creature, manifest, 'alpha', 0.72))
        .setDepth(2 + manifest.depth);
      if (overlay.sprite) overlay.sprite.scaleX = Math.abs(overlay.sprite.scaleX) * creature.facingSign;
    }
  }

  private drawStage() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.stage.clear();
    this.stage.fillGradientStyle(0x07131e, 0x082838, 0x031018, 0x02070c, 1);
    this.stage.fillRect(0, 0, width, height);
    this.stage.fillStyle(0x0b3140, 0.28);
    for (let i = 0; i < 10; i += 1) {
      const x = (i * 173 + Math.sin(this.elapsed * 0.4 + i) * 28) % (width + 160) - 80;
      this.stage.fillCircle(x, height * (0.18 + (i % 5) * 0.12), 2 + (i % 3));
    }
    this.stage.fillStyle(0x09202b, 1);
    this.stage.fillRect(0, height - 86, width, 86);
    this.stage.fillStyle(0x163848, 0.9);
    for (let i = 0; i < 16; i += 1) {
      const x = i * 92 - 24;
      const rockHeight = 18 + (i % 4) * 10;
      this.stage.fillEllipse(x, height - 70 + (i % 2) * 12, 120, rockHeight);
    }
    this.stage.lineStyle(1, 0x73fbd3, 0.12);
    for (let x = 0; x < width; x += 80) this.stage.lineBetween(x, 0, x + 40, height);
  }

  private drawLabels() {
    for (const label of this.labels) label.destroy();
    const entry = this.currentEntry();
    const manifestInfo = articulatedManifestInfo();
    const color = rarityColor(entry.rarity);
    const companion = this.currentCompanion();
    const gateLine = this.reviewGateLabel(entry);
    const boundary = this.productionBoundaryFor(entry);
    const boundaryLine = boundary.claim ? `boundary: ${boundary.claim}` : '';
    const manualReviewLine = boundary.manualReviewRequired ? `manual review: ${boundary.manualReviewRequired}` : '';
    const unresolvedLine = this.unresolvedRequest
      ? [`UNKNOWN SANDBOX ID: ${this.unresolvedRequest}  /  showing ${entry.id} instead`]
      : [];
    const lines = [
      'WATER 9 ENTITY SANDBOX',
      ...unresolvedLine,
      ...(gateLine ? [gateLine] : []),
      ...(boundaryLine ? [boundaryLine] : []),
      ...(manualReviewLine ? [manualReviewLine] : []),
      `${entry.name}  /  ${entry.id}  /  ${entry.kind}  /  ${entry.rarity}`,
      `${entry.biome ? `biome ${entry.biome}  /  ` : ''}${entry.hostile ? 'threat' : 'neutral'}  /  ${entry.notes}`,
      `catalog ${this.entryIndex + 1}/${this.entries.length}  /  companion: ${companion}  /  articulated: ${manifestInfo.ids.length}`,
      `manifest: ${manifestInfo.source}  /  URL: ?sandbox=abyssal-gulper&companion=diver or ?entity=diver`,
      'Left/Right: entity   Space: lunge   S: stun   R: reset',
    ];
    this.drawGatePanel(entry, lines.length);
    this.labels = lines.map((line, index) => this.add.text(18, 16 + index * 18, line, {
      color: line.startsWith('UNKNOWN SANDBOX ID')
        ? '#f0c16a'
        : line.startsWith('PREVIEW ONLY') || line.startsWith('PROTOTYPE') || line.startsWith('SOURCE REVIEW')
          ? '#ffd389'
          : line.includes(` /  ${entry.id}  / `)
            ? Phaser.Display.Color.IntegerToColor(color).rgba
            : '#c8ecf0',
      fontFamily: 'monospace',
      fontSize: index === 0 ? '14px' : '12px',
    }).setDepth(20).setShadow(0, 1, '#000', 3));
  }

  private drawGatePanel(entry: SandboxEntry, lineCount: number) {
    const severity = this.reviewGateSeverity(entry);
    const width = Math.min(this.scale.width - 24, 690);
    const height = 22 + lineCount * 18;
    const fill = severity === 'accepted' ? 0x09251d : severity === 'reference' ? 0x061b24 : 0x24170a;
    const stroke = severity === 'accepted' ? 0x4cd38a : severity === 'reference' ? 0x4d8fa5 : 0xf0b75a;
    this.gatePanel.clear();
    this.gatePanel.fillStyle(fill, 0.82);
    this.gatePanel.fillRoundedRect(10, 8, width, height, 6);
    this.gatePanel.lineStyle(2, stroke, 0.72);
    this.gatePanel.strokeRoundedRect(10, 8, width, height, 6);
  }

  private reviewGateLabel(entry: SandboxEntry) {
    if (entry.acceptedForContentGate !== true && (entry.kind === 'articulated' || entry.kind === 'source')) {
      const prefix = entry.kind === 'articulated' ? 'PREVIEW ONLY PROTOTYPE' : 'SOURCE REVIEW NEEDED  /  PREVIEW ONLY SOURCE ART';
      const status = entry.qualityStatus ?? (entry.kind === 'articulated' ? 'prototype' : 'unknown');
      const required = entry.kind === 'articulated'
        ? 'needs human source, contact, phase, and sandbox review'
        : 'needs human full-source concept approval before rigging';
      return `${prefix} - NOT ACCEPTED  /  quality: ${status}  /  ${required}`;
    }
    if (entry.kind === 'articulated' && entry.acceptedForContentGate !== true) {
      return `PROTOTYPE - NOT ACCEPTED  /  quality: ${entry.qualityStatus ?? 'prototype'}  /  needs human source, contact, phase, and sandbox review`;
    }
    if (entry.kind === 'source' && entry.reviewStage !== 'source-approved') {
      return `SOURCE REVIEW NEEDED  /  status: ${entry.qualityStatus ?? 'unknown'}  /  not production rig input`;
    }
    if (entry.kind === 'articulated') return 'ACCEPTED THREAT  /  strict gate evidence required';
    if (entry.kind === 'source') return 'SOURCE APPROVED  /  eligible for rigging';
    return '';
  }

  private reviewGateSeverity(entry: SandboxEntry) {
    if (entry.acceptedForContentGate === true || entry.reviewStage === 'source-approved') return 'accepted';
    if (entry.kind === 'articulated' || entry.kind === 'source') return 'preview-only';
    return 'reference';
  }

  private productionBoundaryFor(entry: SandboxEntry): SandboxProductionBoundary {
    if (entry.productionBoundary?.schema === 'water9/sandbox-production-boundary@1') return entry.productionBoundary;
    const accepted = entry.acceptedForContentGate === true;
    const reviewStage = entry.reviewStage ?? (entry.kind === 'articulated' ? (accepted ? 'accepted' : 'prototype') : entry.kind === 'source' ? 'source-review' : 'reference');
    const claim = accepted
      ? 'accepted articulated threat with strict review evidence'
      : entry.kind === 'articulated'
        ? 'preview-only prototype; render/visual pass is not human acceptance'
        : entry.kind === 'source'
          ? 'source-art preview only; source approval and rig acceptance are separate gates'
          : 'reference preview; not counted by the 20-threat content gate';
    const manualReviewRequired = accepted
      ? null
      : entry.kind === 'articulated'
        ? 'approved source art plus strict human rig and sandbox acceptance'
        : entry.kind === 'source'
          ? 'human full-source concept approval before rigging'
          : 'reference preview; not part of the 20-threat production gate';
    return {
      schema: 'water9/sandbox-production-boundary@1',
      reviewStage,
      qualityStatus: entry.qualityStatus ?? null,
      productionReady: accepted,
      acceptedForContentGate: accepted,
      previewOnly: !accepted,
      manualReviewRequired,
      claim,
    };
  }
}
