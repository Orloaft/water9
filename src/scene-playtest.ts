import Phaser from 'phaser';
import type { Biome,PlaytestCommand,SubTier,Tile } from './types';
import { ENTITY_SCALE,SURFACE_Y,TILE,WORLD_H,WORLD_W } from './constants';
import { tiles,upgrades } from './content';
import { state } from './state';
import { rng } from './rng';
import { cargoCapacity,clearBleed,clearVenom,createConsumableItem,fuelMax,oxygenMax,refillAtBoat,restart,scaledDepthPx,shopItem,subDef,upgradeMax } from './helpers';
import { availableUpgrades,biomeName,renderHud,roundMetric } from './hud';
import { articulatedManifestInfo,articulatedPlaceholderTextureKeys,partManifest } from './articulated';
import type { DeepdiveScene } from './scene';

function refreshPlaytestCamera(scene: DeepdiveScene) {
  scene.cameras.main.preRender();
}

function clearPlaytestFloatingText(scene: DeepdiveScene) {
  scene.floatingTexts.forEach((entry) => entry.label.destroy());
  scene.floatingTexts = [];
}

export function playtestSnapshot(this: DeepdiveScene, ) {
    refreshPlaytestCamera(this);
    const camera = this.cameras.main;
    const screenFor = (x: number, y: number) => ({
      screenX: roundMetric((x - camera.worldView.x) * camera.zoom),
      screenY: roundMetric((y - camera.worldView.y) * camera.zoom),
    });
    const activeSub = state.activeSub
      ? {
        tier: state.activeSub.tier,
        name: subDef(state.activeSub.tier).name,
        hull: Math.round(state.activeSub.hull),
        oxygen: Math.round(state.activeSub.oxygen),
        fuel: Math.round(state.activeSub.fuel),
        cargoBonus: subDef(state.activeSub.tier).cargo,
        piloting: state.pilotingSub,
      }
      : null;
    const carrierSub = state.carrierSub
      ? {
        tier: state.carrierSub.tier,
        name: subDef(state.carrierSub.tier).name,
        hull: Math.round(state.carrierSub.hull),
        oxygen: Math.round(state.carrierSub.oxygen),
        fuel: Math.round(state.carrierSub.fuel),
      }
      : null;
    return {
      seed: rng.seed,
      state: {
        biome: state.biome,
        biomeName: biomeName(),
        credits: state.credits,
        depth: state.depth,
        maxDepth: state.maxDepth,
        oxygen: Math.round(state.oxygen),
        oxygenMax: oxygenMax(),
        hull: Math.round(state.hull),
        fuel: Math.round(state.fuel),
        fuelMax: fuelMax(),
        cargo: state.cargo.length,
        cargoCapacity: cargoCapacity(),
        atBoat: state.atBoat,
        docked: state.docked,
        lost: state.lost,
        won: state.won,
        venom: { ...state.venom },
        bleed: { ...state.bleed },
        activeQuestId: state.activeQuestId,
        questBoard: state.questBoard.map((quest) => ({ ...quest })),
        upgrades: { ...state.upgrades },
        subOwned: { ...state.subOwned },
        selectedSubTier: state.selectedSubTier,
        activeSub,
        carrierSub,
      },
      ui: {
        paused: state.paused,
        radioOpen: state.radioOpen,
        logbookOpen: state.logbookOpen,
        cargoOpen: state.cargoOpen,
        floatingTextCount: this.floatingTexts.length,
        status: state.status,
      },
      camera: {
        x: roundMetric(camera.worldView.x),
        y: roundMetric(camera.worldView.y),
        width: roundMetric(camera.worldView.width),
        height: roundMetric(camera.worldView.height),
        zoom: roundMetric(camera.zoom),
      },
      sceneDepths: {
        articulatedBridges: roundMetric(this.articulatedBridges?.depth ?? null),
        actors: roundMetric(this.actors?.depth ?? null),
        darkness: roundMetric(this.darkness?.depth ?? null),
        overlay: roundMetric(this.overlay?.depth ?? null),
      },
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        vx: Math.round(this.player.vx),
        vy: Math.round(this.player.vy),
      },
      articulatedCreatures: this.articulatedCreatures.map((creature) => {
        const joints = this.articulatedJointMetrics(creature).map((joint) => ({
          partId: joint.partId,
          parentId: joint.parentId,
          error: roundMetric(joint.error),
          stress: roundMetric(joint.stress),
          detached: Boolean(joint.detached),
        }));
        const maxJointError = joints.reduce((max, joint) => Math.max(max, joint.error), 0);
        const maxJointStress = joints.reduce((max, joint) => Math.max(max, joint.stress), 0);
        const biteAnchor = this.articulatedBiteAnchorWorld(creature);
        return {
          id: creature.id,
          species: creature.species,
          x: roundMetric(creature.x),
          y: roundMetric(creature.y),
          vx: roundMetric(creature.vx),
          vy: roundMetric(creature.vy),
          facingSign: creature.facingSign,
          aggro: roundMetric(creature.aggro),
          phase: roundMetric(creature.phase),
          posePitch: roundMetric(creature.posePitch),
          attackBlend: roundMetric(creature.attackBlend),
          swimEffort: roundMetric(creature.swimEffort),
          stunned: roundMetric(creature.stunned),
          mobilityScale: roundMetric(this.articulatedMobilityScale(creature)),
          maxHp: Math.round(creature.maxHp),
          collisionDebug: creature.collisionDebug
            ? {
              ...creature.collisionDebug,
              edgeX: roundMetric(creature.collisionDebug.edgeX),
              edgeY: roundMetric(creature.collisionDebug.edgeY),
              halfWidth: roundMetric(creature.collisionDebug.halfWidth),
              halfHeight: roundMetric(creature.collisionDebug.halfHeight),
            }
            : null,
          naturalSpawn: {
            spawn: { ...creature.manifest.spawn },
            runtimeBand: {
              minDepthMeters: roundMetric(Math.max(0, (scaledDepthPx(creature.manifest.spawn.minDepth) - SURFACE_Y) / 6)),
              maxDepthMeters: roundMetric(Math.max(0, (scaledDepthPx(creature.manifest.spawn.maxDepth) - SURFACE_Y) / 6)),
            },
            depthMeters: roundMetric(Math.max(0, (creature.y - SURFACE_Y) / 6)),
            centerTile: {
              x: Math.floor(creature.x / TILE),
              y: Math.floor(creature.y / TILE),
              tile: this.getTile(Math.floor(creature.x / TILE), Math.floor(creature.y / TILE)),
            },
            partContacts: creature.parts
              .filter((part) => !part.detached && part.hp > 0)
              .map((part) => {
                const contact = this.articulatedPartTerrainContact(creature, part);
                return {
                  id: part.id,
                  contact: roundMetric(contact ? Math.min(1, contact.count / 3) : 0),
                  nx: roundMetric(contact?.nx ?? 0),
                  ny: roundMetric(contact?.ny ?? 0),
                };
              }),
          },
          hp: Math.round(creature.hp),
          state: creature.state,
          scanned: creature.scanned,
          dead: creature.dead,
          jointSummary: {
            count: joints.length,
            missing: joints.filter((joint) => !Number.isFinite(joint.error)).length,
            maxError: roundMetric(maxJointError),
            maxStress: roundMetric(maxJointStress),
          },
          biteAnchor: biteAnchor ? { x: roundMetric(biteAnchor.x), y: roundMetric(biteAnchor.y) } : null,
          joints,
          spine: creature.spine.map((node) => ({
            partId: node.partId,
            offset: roundMetric(node.offset),
            bend: roundMetric(node.bend),
            x: roundMetric(node.x),
            y: roundMetric(node.y),
            vx: roundMetric(node.vx),
            vy: roundMetric(node.vy),
            constraintError: roundMetric(node.constraintError),
            initialized: node.initialized,
          })),
          parts: creature.parts.map((part) => {
            const manifest = partManifest(creature, part);
            const hit = this.articulatedPartHitDistanceTo(creature, part, this.player.x, this.player.y);
            const terrainProbe = this.articulatedPartTerrainContact(creature, part);
            const centerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, hit.shape.centerX, hit.shape.centerY);
            return {
              id: part.id,
              anatomy: manifest.anatomy ?? null,
              x: roundMetric(part.x),
              y: roundMetric(part.y),
              rotation: roundMetric(part.rotation),
              hp: Math.round(part.hp),
              maxHp: Math.round(part.maxHp),
              jointStress: roundMetric(part.jointStress),
              detached: part.detached,
              detachVx: roundMetric(part.detachVx),
              detachVy: roundMetric(part.detachVy),
              detachAngularVelocity: roundMetric(part.detachAngularVelocity),
              terrainContact: roundMetric(part.terrainContact),
              terrainNormalX: roundMetric(part.terrainNormalX),
              terrainNormalY: roundMetric(part.terrainNormalY),
              terrainProbeContact: terrainProbe ? roundMetric(Math.min(1, terrainProbe.count / 3)) : 0,
              terrainProbeNormalX: roundMetric(terrainProbe?.nx ?? 0),
              terrainProbeNormalY: roundMetric(terrainProbe?.ny ?? 0),
              hitShape: {
                centerX: roundMetric(hit.shape.centerX),
                centerY: roundMetric(hit.shape.centerY),
                rotation: roundMetric(hit.shape.rotation),
                halfLength: roundMetric(hit.shape.halfLength),
                radius: roundMetric(hit.shape.radius),
              },
              playerHitDistance: roundMetric(hit.distance),
              playerSignedHitDistance: roundMetric(hit.signedDistance),
              playerCenterDistance: roundMetric(centerDistance),
              sprite: part.sprite
                ? {
                  visible: part.sprite.visible,
                  textureKey: part.sprite.texture.key,
                  alpha: roundMetric(part.sprite.alpha),
                  scaleX: roundMetric(part.sprite.scaleX),
                  scaleY: roundMetric(part.sprite.scaleY),
                  displayWidth: roundMetric(part.sprite.displayWidth),
                  displayHeight: roundMetric(part.sprite.displayHeight),
                  depth: roundMetric(part.sprite.depth),
                  ...screenFor(part.x, part.y),
                }
                : null,
            };
          }),
          socketOverlays: creature.socketOverlays.map((overlay) => {
            const socketManifest = creature.manifest.socketOverlays?.find((candidate) => candidate.id === overlay.id);
            const parentAnchorScreen = screenFor(overlay.parentAnchorX, overlay.parentAnchorY);
            const childAnchorScreen = screenFor(overlay.childAnchorX, overlay.childAnchorY);
            return {
              id: overlay.id,
              parentId: socketManifest?.parentId,
              childId: socketManifest?.childId,
              x: roundMetric(overlay.x),
              y: roundMetric(overlay.y),
              rotation: roundMetric(overlay.rotation),
              width: roundMetric(overlay.width),
              height: roundMetric(overlay.height),
              span: roundMetric(overlay.span),
              spanScreen: roundMetric(overlay.span * camera.zoom),
              parentAnchorX: roundMetric(overlay.parentAnchorX),
              parentAnchorY: roundMetric(overlay.parentAnchorY),
              childAnchorX: roundMetric(overlay.childAnchorX),
              childAnchorY: roundMetric(overlay.childAnchorY),
              parentAnchorScreenX: parentAnchorScreen.screenX,
              parentAnchorScreenY: parentAnchorScreen.screenY,
              childAnchorScreenX: childAnchorScreen.screenX,
              childAnchorScreenY: childAnchorScreen.screenY,
              bridgeWidth: roundMetric(overlay.bridgeWidth),
              bridgeWidthScreen: roundMetric(overlay.bridgeWidth * camera.zoom),
              bridgeCoverage: roundMetric(overlay.bridgeCoverage),
              parentCoverage: roundMetric(overlay.parentCoverage),
              childCoverage: roundMetric(overlay.childCoverage),
              socketStyle: {
                alpha: roundMetric(socketManifest?.alpha ?? creature.manifest.socketStyle?.alpha ?? 0.82),
                bridgeAlpha: roundMetric(socketManifest?.bridgeAlpha ?? creature.manifest.socketStyle?.bridgeAlpha ?? 0.32),
                bridgeCoreAlpha: roundMetric(socketManifest?.bridgeCoreAlpha ?? creature.manifest.socketStyle?.bridgeCoreAlpha ?? 0.16),
                bridgeWidthScale: roundMetric(socketManifest?.bridgeWidthScale ?? creature.manifest.socketStyle?.bridgeWidthScale ?? 1),
              },
              sprite: overlay.sprite
                ? {
                  visible: overlay.sprite.visible,
                  textureKey: overlay.sprite.texture.key,
                  alpha: roundMetric(overlay.sprite.alpha),
                  scaleX: roundMetric(overlay.sprite.scaleX),
                  scaleY: roundMetric(overlay.sprite.scaleY),
                  displayWidth: roundMetric(overlay.sprite.displayWidth),
                  displayHeight: roundMetric(overlay.sprite.displayHeight),
                  depth: roundMetric(overlay.sprite.depth),
                  ...screenFor(overlay.x, overlay.y),
                }
                : null,
            };
          }),
        };
      }),
      articulatedManifest: articulatedManifestInfo(),
      articulatedPlaceholders: articulatedPlaceholderTextureKeys(),
      world: this.playtestWorldSurvey(),
    };
  }

export function playtestCommand(this: DeepdiveScene, command: PlaytestCommand, value?: unknown) {
    if (command !== 'reviewArticulated' && command !== 'advanceArticulatedReview' && command !== 'advanceArticulatedDamageReview') {
      this.articulatedCreatures.forEach((creature) => {
        creature.reviewFrozen = false;
      });
    }
    if (command === 'start') {
      if (!state.started) this.startRun();
    } else if (command === 'dive') {
      this.diveFromBarge();
    } else if (command === 'dock') {
      state.docked = true;
      state.atBoat = true;
      this.resetPlayerStart();
      clearVenom();
      clearBleed();
      refillAtBoat();
    } else if (command === 'setBiome') {
      const biome = Phaser.Math.Clamp(Number(value) || 1, 1, 4) as Biome;
      state.biome = biome;
      state.depth = 0;
      state.maxDepth = 0;
      state.oreSoldCredits = 0;
      state.cargo = [];
      state.selectedCargoIndex = 0;
      state.sonarRevealed.clear();
      state.sonarContacts = [];
      state.scannedSpecies.clear();
      state.carrierSub = null;
      state.atBoat = true;
      state.docked = true;
      state.paused = false;
      state.cargoOpen = false;
      state.lost = false;
      state.won = false;
      clearVenom();
      clearBleed();
      state.started = true;
      state.bargeTab = 'services';
      state.activeQuestId = '';
      rng.seed = Math.floor(Math.random() * 1_000_000);
      this.scene.restart();
      renderHud();
      return { restarting: true, biome };
    } else if (command === 'grantCredits') {
      state.credits += Math.max(0, Math.floor(Number(value) || 0));
    } else if (command === 'setCredits') {
      state.credits = Math.max(0, Math.floor(Number(value) || 0));
    } else if (command === 'maxUpgrades') {
      for (const upgrade of availableUpgrades()) state.upgrades[upgrade.id] = upgradeMax(upgrade);
      state.oxygen = oxygenMax();
      state.fuel = fuelMax();
    } else if (command === 'buySub') {
      this.buySub(Phaser.Math.Clamp(Number(value) || 1, 1, 3) as SubTier);
    } else if (command === 'refill') {
      state.oxygen = oxygenMax();
      state.hull = 100 + state.upgrades.suit * 25;
      state.fuel = fuelMax();
      clearVenom();
      clearBleed();
      if (state.activeSub) {
        const def = subDef(state.activeSub.tier);
        state.activeSub.hull = def.hull;
        state.activeSub.oxygen = def.oxygen;
        state.activeSub.fuel = def.fuel;
      }
      if (state.carrierSub) {
        const def = subDef(state.carrierSub.tier);
        state.carrierSub.hull = def.hull;
        state.carrierSub.oxygen = def.oxygen;
        state.carrierSub.fuel = def.fuel;
      }
    } else if (command === 'teleportDepth') {
      const depth = Phaser.Math.Clamp(Number(value) || 0, 0, WORLD_H * TILE - SURFACE_Y - TILE);
      this.player.x = WORLD_W * TILE * 0.5;
      this.player.y = SURFACE_Y + depth;
      this.player.vx = 0;
      this.player.vy = 0;
      state.docked = false;
      state.atBoat = false;
      state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
      if (state.activeSub && state.pilotingSub) {
        state.activeSub.x = this.player.x;
        state.activeSub.y = this.player.y;
        state.activeSub.vx = 0;
        state.activeSub.vy = 0;
      }
      if (state.carrierSub) {
        state.carrierSub.x = this.player.x;
        state.carrierSub.y = this.player.y;
        state.carrierSub.vx = 0;
        state.carrierSub.vy = 0;
      }
    } else if (command === 'terrainReview') {
      const centerX = Math.floor(WORLD_W * 0.5);
      const floorY = Math.floor((SURFACE_Y + 780) / TILE);
      const left = centerX - 18;
      const right = centerX + 18;
      const top = floorY - 8;
      const bottom = floorY + 8;
      for (let y = top; y <= bottom; y += 1) {
        for (let x = left; x <= right; x += 1) {
          const tile: Tile = y < floorY
            ? 'water'
            : y === floorY && x >= centerX + 7 && x <= centerX + 11
              ? x % 2 === 0 ? 'copper' : 'quartz'
              : y === floorY + 1 && x >= centerX + 9 && x <= centerX + 12
                ? 'copper'
                : y < floorY + 3 ? 'stone' : 'sand';
          this.setTile(x, y, tile);
          if (this.damage[y]?.[x] !== undefined) this.damage[y][x] = 0;
        }
      }
      state.started = true;
      state.docked = false;
      state.atBoat = false;
      state.paused = false;
      state.lost = false;
      state.radioOpen = false;
      state.depth = Math.max(0, Math.round((floorY * TILE - SURFACE_Y) / 6));
      this.player.x = centerX * TILE;
      this.player.y = floorY * TILE - 22;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.facing.set(0, 1);
      this.player.facingSign = 1;
      this.fish = [];
      this.flora = [];
      this.articulatedCreatures = [];
      this.bobbits = [];
      this.hazards = [];
      this.larvae = [];
      this.nestEggs = [];
      this.looseItems = [];
      clearPlaytestFloatingText(this);
      this.populateEnvironmentProps();
      this.terrainBoundsKey = '';
      this.terrainDirty = true;
      state.status = 'Terrain review: clean cave face and exposed ore seam.';
      renderHud();
    } else if (command === 'teleportToArticulated') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string } : {};
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        this.player.x = Phaser.Math.Clamp(creature.x - 120, 20, WORLD_W * TILE - 20);
        this.player.y = Phaser.Math.Clamp(creature.y, 20, WORLD_H * TILE - 20);
        this.player.vx = 0;
        this.player.vy = 0;
        state.docked = false;
        state.atBoat = false;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.revealSonarAtWorld(creature.x, creature.y, 12);
      }
    } else if (command === 'liveArticulatedReview') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string; mode?: string } : {};
      const mode = String(payload.mode ?? 'turn');
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        const facing = mode.includes('left') ? -1 : 1;
        const stunnedReview = mode.includes('stunned');
        const attackReview = mode.includes('attack');
        const reviewX = WORLD_W * TILE * 0.5;
        const reviewY = SURFACE_Y + 330;
        clearPlaytestFloatingText(this);
        for (let ty = Math.max(7, Math.floor((reviewY - 280) / TILE)); ty <= Math.min(WORLD_H - 2, Math.ceil((reviewY + 280) / TILE)); ty += 1) {
          for (let tx = Math.max(1, Math.floor((reviewX - 680) / TILE)); tx <= Math.min(WORLD_W - 2, Math.ceil((reviewX + 680) / TILE)); tx += 1) {
            this.setTile(tx, ty, 'water');
          }
        }
        this.articulatedCreatures.forEach((candidate) => {
          candidate.reviewFrozen = false;
          if (candidate === creature) return;
          candidate.x = reviewX - facing * 2400;
          candidate.y = reviewY + 1600;
          candidate.homeX = candidate.x;
          candidate.homeY = candidate.y;
          candidate.vx = 0;
          candidate.vy = 0;
          candidate.reviewFrozen = true;
          this.updateArticulatedParts(candidate, 0);
        });
        const playerGap = Math.max(230, creature.radius + 150);
        this.player.x = reviewX + facing * playerGap;
        this.player.y = reviewY + (mode.includes('dive') ? 92 : -82);
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing.set(-facing, 0);
        this.player.facingSign = facing < 0 ? 1 : -1;
        creature.x = reviewX - facing * 130;
        creature.y = reviewY + 48;
        creature.homeX = creature.x;
        creature.homeY = creature.y;
        creature.vx = facing * creature.speed * (attackReview ? 2.2 : stunnedReview ? 1.35 : 0.68);
        creature.vy = attackReview ? 0 : mode.includes('dive') ? creature.speed * 0.45 : -creature.speed * (stunnedReview ? 0.72 : 0.34);
        creature.facingSign = facing;
        creature.aggro = stunnedReview ? 5.6 : 4.8;
        creature.phase = 0.4;
        creature.swimEffort = attackReview ? 1.15 : 0.85;
        creature.posePitch = 0;
        creature.attackBlend = attackReview ? 1 : mode.includes('lunge') ? 0.5 : stunnedReview ? 0.12 : 0;
        creature.state = attackReview || mode.includes('lunge') ? 'lunge' : 'stalk';
        creature.stateTimer = attackReview ? 0.85 : mode.includes('lunge') ? 0.8 : 2.5;
        creature.grabTimer = 0;
        creature.grabCooldown = attackReview ? 0 : 999;
        creature.bumpCooldown = attackReview ? 0 : 999;
        creature.stunned = stunnedReview ? 3.2 : 0;
        creature.parts.forEach((part) => {
          part.hp = Math.max(1, part.hp);
          part.hurtFlash = 0;
          part.detached = false;
          part.detachVx = 0;
          part.detachVy = 0;
          part.detachAngularVelocity = 0;
        });
        creature.spine.forEach((node) => {
          node.offset = 0;
          node.bend = 0;
        });
        clearVenom();
        clearBleed();
        state.hull = attackReview ? 180 : 100 + state.upgrades.suit * 25;
        state.oxygen = oxygenMax();
        state.started = true;
        state.docked = false;
        state.atBoat = false;
        state.paused = true;
        state.radioOpen = false;
        state.logbookOpen = false;
        state.cargoOpen = false;
        state.lost = false;
        state.won = false;
        state.status = '';
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.updateArticulatedParts(creature, 0);
        if (attackReview) {
          const biteAnchor = this.articulatedBiteAnchorWorld(creature);
          if (biteAnchor) {
            this.player.x = biteAnchor.x + facing * 6;
            this.player.y = biteAnchor.y;
            this.player.vx = 0;
            this.player.vy = 0;
            state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
          }
        }
        this.cameras.main.centerOn(reviewX, reviewY);
        refreshPlaytestCamera(this);
        this.draw();
      }
    } else if (command === 'advanceLiveArticulatedReview') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string; seconds?: number; attack?: boolean } : {};
      const seconds = Phaser.Math.Clamp(Number(payload.seconds) || 0.16, 0, 1);
      state.started = true;
      state.docked = false;
      state.atBoat = false;
      state.paused = false;
      state.radioOpen = false;
      state.logbookOpen = false;
      state.cargoOpen = false;
      state.lost = false;
      state.won = false;
      state.status = '';
      if (!payload.attack) {
        clearVenom();
        clearBleed();
        state.hull = 100 + state.upgrades.suit * 25;
        state.oxygen = oxygenMax();
      }
      this.updateArticulatedCreatures(seconds);
      if (payload.attack) clearPlaytestFloatingText(this);
      const focus = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      if (focus) {
        if (!payload.attack) {
          const playerGap = Math.max(230, focus.radius + 150);
          this.player.x = Phaser.Math.Clamp(focus.x + focus.facingSign * playerGap, 20, WORLD_W * TILE - 20);
          this.player.y = Phaser.Math.Clamp(focus.y - 82, 20, WORLD_H * TILE - 20);
          this.player.vx = 0;
          this.player.vy = 0;
          this.player.facing.set(-focus.facingSign, 0);
          this.player.facingSign = focus.facingSign < 0 ? 1 : -1;
        }
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.cameras.main.centerOn(focus.x, focus.y);
      }
      if (payload.attack) {
        renderHud();
      } else {
        state.paused = true;
      }
      refreshPlaytestCamera(this);
      this.draw();
    } else if (command === 'focusArticulatedCamera') {
      const payload = typeof value === 'object' && value !== null
        ? value as { creatureId?: string; preserveVitals?: boolean; freeze?: boolean; unpaused?: boolean; maxZoom?: number; includePlayer?: boolean }
        : {};
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        if (payload.freeze) {
          creature.reviewFrozen = true;
          creature.vx = 0;
          creature.vy = 0;
          creature.parts.forEach((part) => {
            part.hurtFlash = 0;
          });
          clearPlaytestFloatingText(this);
          this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });
        }
        const activeParts = creature.parts.filter((part) => !part.detached);
        const extents = activeParts.map((part) => {
          const manifest = partManifest(creature, part);
          const halfW = manifest.size[0] * ENTITY_SCALE * 0.56;
          const halfH = manifest.size[1] * ENTITY_SCALE * 0.56;
          return { minX: part.x - halfW, maxX: part.x + halfW, minY: part.y - halfH, maxY: part.y + halfH };
        });
        if (payload.includePlayer) {
          const biteAnchor = this.articulatedBiteAnchorWorld(creature);
          const playerPadX = 180;
          const playerPadY = 140;
          extents.push({
            minX: this.player.x - playerPadX,
            maxX: this.player.x + playerPadX,
            minY: this.player.y - playerPadY,
            maxY: this.player.y + playerPadY,
          });
          if (biteAnchor) {
            extents.push({
              minX: biteAnchor.x - playerPadX,
              maxX: biteAnchor.x + playerPadX,
              minY: biteAnchor.y - playerPadY,
              maxY: biteAnchor.y + playerPadY,
            });
          }
        }
        const minX = Math.min(...extents.map((part) => part.minX));
        const maxX = Math.max(...extents.map((part) => part.maxX));
        const minY = Math.min(...extents.map((part) => part.minY));
        const maxY = Math.max(...extents.map((part) => part.maxY));
        const maxZoom = Phaser.Math.Clamp(Number(payload.maxZoom) || 1.15, 0.22, 1.15);
        const fitZoom = Phaser.Math.Clamp(Math.min(980 / Math.max(1, maxX - minX), 560 / Math.max(1, maxY - minY)), 0.22, maxZoom);
        if (!payload.preserveVitals) {
          clearVenom();
          clearBleed();
          state.hull = 100 + state.upgrades.suit * 25;
          state.oxygen = oxygenMax();
        }
        state.lost = false;
        state.won = false;
        state.status = '';
        state.paused = false;
        state.radioOpen = false;
        state.logbookOpen = false;
        state.cargoOpen = false;
        renderHud();
        state.paused = !payload.unpaused;
        this.cameras.main.setZoom(fitZoom);
        this.cameras.main.centerOn((minX + maxX) * 0.5, (minY + maxY) * 0.5 - 42);
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'reviewArticulated') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string; mode?: string } : {};
      const mode = typeof value === 'string' ? value : String(payload.mode ?? 'right');
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        const facing = mode.includes('left') ? -1 : 1;
        const pitched = mode.includes('rise') || mode.includes('dive');
        const reviewX = WORLD_W * TILE * 0.5 + facing * 140;
        const reviewY = SURFACE_Y + 220;
        const playerGap = 130;
        for (let ty = Math.max(7, Math.floor((reviewY - 230) / TILE)); ty <= Math.min(WORLD_H - 2, Math.ceil((reviewY + 230) / TILE)); ty += 1) {
          for (let tx = Math.max(1, Math.floor((reviewX - 560) / TILE)); tx <= Math.min(WORLD_W - 2, Math.ceil((reviewX + 560) / TILE)); tx += 1) {
            this.setTile(tx, ty, 'water');
          }
        }
        clearPlaytestFloatingText(this);
        this.articulatedCreatures.forEach((candidate) => {
          const isTarget = candidate === creature;
          candidate.reviewFrozen = true;
          candidate.collisionDebug = undefined;
          candidate.stunned = 0;
          candidate.aggro = 0;
          candidate.state = 'recover';
          candidate.stateTimer = 999;
          candidate.grabTimer = 0;
          candidate.grabCooldown = 999;
          candidate.bumpCooldown = 999;
          candidate.hp = candidate.maxHp;
          candidate.dead = false;
          candidate.scanning = false;
          candidate.scan = 0;
          candidate.hurtFlash = 0;
          candidate.parts.forEach((part) => {
            part.hp = part.maxHp;
            part.hurtFlash = 0;
            part.jointStress = 0;
            part.detached = false;
            part.detachVx = 0;
            part.detachVy = 0;
            part.detachAngularVelocity = 0;
            part.terrainContact = 0;
            part.terrainNormalX = 0;
            part.terrainNormalY = 0;
          });
          candidate.socketOverlays.forEach((overlay) => {
            overlay.span = 0;
            overlay.bridgeWidth = 0;
            overlay.bridgeCoverage = 0;
            overlay.parentCoverage = 0;
            overlay.childCoverage = 0;
          });
          if (isTarget) return;
          candidate.x = reviewX - facing * 2600;
          candidate.y = reviewY + 1800;
          candidate.homeX = candidate.x;
          candidate.homeY = candidate.y;
          candidate.vx = 0;
          candidate.vy = 0;
          this.updateArticulatedParts(candidate, 0);
        });
        this.player.x = reviewX - facing * playerGap;
        this.player.y = reviewY;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing.set(facing, 0);
        this.player.facingSign = facing;
        creature.x = reviewX;
        creature.y = reviewY;
        creature.homeX = reviewX;
        creature.homeY = reviewY;
        creature.vx = pitched ? facing * 48 : 0;
        creature.vy = mode.includes('rise') ? -42 : mode.includes('dive') ? 42 : 0;
        creature.facingSign = facing;
        creature.aggro = 0;
        creature.stunned = mode.includes('stunned') ? 5 : 0;
        creature.phase = mode.includes('lunge') ? 0.5 : 1.1;
        creature.swimEffort = 1;
        creature.state = mode.includes('lunge') ? 'lunge' : 'recover';
        creature.stateTimer = 999;
        creature.grabTimer = 0;
        creature.grabCooldown = 999;
        creature.collisionDebug = undefined;
        state.paused = false;
        state.radioOpen = false;
        state.logbookOpen = false;
        state.cargoOpen = false;
        state.lost = false;
        state.won = false;
        state.status = '';
        state.docked = false;
        state.atBoat = false;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        this.updateArticulatedParts(creature, 0);
        renderHud();
        state.paused = true;
        this.cameras.main.setZoom(1.15);
        this.cameras.main.centerOn(reviewX, reviewY);
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'advanceArticulatedReview') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string; seconds?: number; phaseRate?: number } : {};
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && candidate.reviewFrozen && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        const seconds = Phaser.Math.Clamp(Number(payload.seconds) || 0.16, 0, 2);
        const phaseRate = Phaser.Math.Clamp(Number(payload.phaseRate) || 1.35, 0.1, 4);
        creature.phase += seconds * phaseRate;
        creature.swimEffort = Phaser.Math.Clamp(creature.swimEffort || 1, 0.22, 1.28);
        this.updateArticulatedParts(creature, 0);
        state.paused = true;
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'advanceArticulatedDamageReview') {
      const payload = typeof value === 'object' && value !== null ? value as { creatureId?: string; seconds?: number } : {};
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && candidate.reviewFrozen && (!payload.creatureId || candidate.id === payload.creatureId));
      if (creature) {
        const seconds = Phaser.Math.Clamp(Number(payload.seconds) || 0.16, 0, 1.5);
        this.updateArticulatedCreatures(seconds);
        state.paused = true;
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'damageArticulatedPart') {
      const payload = (value ?? {}) as { creatureId?: string; partId?: string; amount?: number; source?: string; quietReview?: boolean };
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      const part = payload.partId
        ? creature?.parts.find((candidate) => candidate.id === payload.partId)
        : creature ? this.articulatedBitePart(creature) : undefined;
      if (creature && part) {
        const amount = Number(payload.amount) || part.maxHp + 5;
        this.damageArticulatedPart(creature, part, amount, payload.source ?? 'Playtest');
        if (payload.quietReview) {
          clearPlaytestFloatingText(this);
          creature.hurtFlash = 0;
          creature.parts.forEach((candidate) => {
            candidate.hurtFlash = 0;
          });
        }
        this.updateArticulatedParts(creature, 0);
        creature.reviewFrozen = true;
        state.paused = true;
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'exerciseArticulatedToolDamage') {
      const payload = (value ?? {}) as { creatureId?: string; partId?: string; tool?: 'cutter' | 'knife' | 'dynamite' };
      const tool = payload.tool ?? 'cutter';
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      const part = creature?.parts.find((candidate) => candidate.id === (payload.partId ?? 'body-2'));
      if (creature && part) {
        clearPlaytestFloatingText(this);
        creature.reviewFrozen = false;
        creature.aggro = 0;
        creature.state = 'recover';
        creature.stateTimer = 999;
        creature.grabTimer = 0;
        creature.grabCooldown = 999;
        creature.bumpCooldown = 999;
        this.player.x = part.x;
        this.player.y = part.y;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing.set(creature.facingSign, 0);
        this.player.facingSign = creature.facingSign;
        this.player.mineCooldown = 0;
        state.started = true;
        state.docked = false;
        state.atBoat = false;
        state.paused = false;
        state.radioOpen = false;
        state.logbookOpen = false;
        state.cargoOpen = false;
        state.lost = false;
        state.won = false;
        state.fuel = fuelMax();
        state.oxygen = oxygenMax();
        state.hull = 100 + state.upgrades.suit * 25;
        state.depth = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 6));
        if (tool === 'knife') {
          state.cargo = [createConsumableItem(shopItem('injector-knife'))];
          state.selectedCargoIndex = 0;
          this.useSelectedItem();
        } else if (tool === 'dynamite') {
          this.detonateDynamite(part.x, part.y);
        } else {
          this.mineAt(part.x, part.y);
        }
        clearPlaytestFloatingText(this);
        this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });
        creature.reviewFrozen = true;
        state.paused = true;
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'collideArticulated') {
      const payload = (value ?? {}) as { creatureId?: string; partId?: string };
      const creature = this.articulatedCreatures.find((candidate) => !candidate.dead && (!payload.creatureId || candidate.id === payload.creatureId));
      const part = creature?.parts.find((candidate) => candidate.id === (payload.partId ?? 'head'));
      if (creature && part) {
        creature.reviewFrozen = false;
        let frontSign = part.x < creature.x ? -1 : 1;
        creature.vx = frontSign * 90;
        creature.vy = 0;
        this.updateArticulatedParts(creature, 0);
        let shape = this.articulatedPartHitShape(creature, part);
        const edgeFor = () => {
          const axisX = Math.cos(shape.rotation);
          const axisY = Math.sin(shape.rotation);
          return {
            halfWidth: Math.abs(axisX) * shape.halfLength + shape.radius,
            halfHeight: Math.abs(axisY) * shape.halfLength + shape.radius,
          };
        };
        frontSign = shape.centerX < creature.x ? -1 : 1;
        let projected = edgeFor();
        let edgeX = shape.centerX + frontSign * projected.halfWidth;
        const targetColumn = Phaser.Math.Clamp(Math.floor(edgeX / TILE) + frontSign, 1, WORLD_W - 3);
        const desiredEdgeX = frontSign > 0 ? targetColumn * TILE + 42 : (targetColumn + 1) * TILE - 42;
        creature.x += desiredEdgeX - edgeX;
        creature.vx = frontSign * 90;
        this.updateArticulatedParts(creature, 0);
        shape = this.articulatedPartHitShape(creature, part);
        frontSign = shape.centerX < creature.x ? -1 : 1;
        projected = edgeFor();
        edgeX = shape.centerX + frontSign * projected.halfWidth;
        const tx = Phaser.Math.Clamp(Math.floor(edgeX / TILE), 1, WORLD_W - 3);
        const ty = Phaser.Math.Clamp(Math.floor(shape.centerY / TILE), 7, WORLD_H - 2);
        const halfRows = Phaser.Math.Clamp(Math.ceil(projected.halfHeight / TILE) + 2, 3, 7);
        const writtenTiles: { x: number; y: number; tile: Tile }[] = [];
        for (let ox = 0; ox <= 1; ox += 1) {
          for (let oy = -halfRows; oy <= halfRows; oy += 1) {
            const wallX = Phaser.Math.Clamp(tx + ox * frontSign, 1, WORLD_W - 2);
            const wallY = Phaser.Math.Clamp(ty + oy, 7, WORLD_H - 2);
            this.setTile(wallX, wallY, 'stone');
            writtenTiles.push({ x: wallX, y: wallY, tile: this.getTile(wallX, wallY) });
          }
        }
        creature.collisionDebug = {
          partId: part.id,
          frontSign: frontSign as 1 | -1,
          edgeX,
          edgeY: shape.centerY,
          halfWidth: projected.halfWidth,
          halfHeight: projected.halfHeight,
          tileX: tx,
          tileY: ty,
          halfRows,
          writtenTiles,
        };
        this.keepArticulatedCreatureInWater(creature);
        this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });
        creature.reviewFrozen = true;
        state.paused = true;
        refreshPlaytestCamera(this);
        this.draw();
        return this.playtestSnapshot();
      }
    } else if (command === 'setOxygen') {
      state.oxygen = Phaser.Math.Clamp(Number(value) || 0, 0, oxygenMax());
    } else if (command === 'setHull') {
      state.hull = Phaser.Math.Clamp(Number(value) || 0, 0, 100 + state.upgrades.suit * 25);
    }
    renderHud();
    return this.playtestSnapshot();
  }

export function playtestWorldSurvey(this: DeepdiveScene, ) {
    if (this.world.length < WORLD_H || !this.world[0]) {
      return {
        ready: false,
        width: WORLD_W,
        height: WORLD_H,
        bands: [],
        reachable: { cells: 0, waterCoverage: 0, deepestTileY: 0, deepestMeters: 0 },
        entities: { fish: 0, hostileFish: 0, articulated: 0, flora: 0, hazardousFlora: 0, vents: 0, bobbits: 0, rooms: 0, eggs: 0, larvae: 0 },
      };
    }
    const bandDefs = [
      { name: 'starter', from: 0, to: 0.18 },
      { name: 'upper tunnels', from: 0.18, to: 0.45 },
      { name: 'dark basin', from: 0.45, to: 0.68 },
      { name: 'lower tunnels', from: 0.68, to: 0.88 },
      { name: 'floor', from: 0.88, to: 1 },
    ];
    const bands = bandDefs.map((band) => {
      const startY = Math.floor(WORLD_H * band.from);
      const endY = Math.max(startY + 1, Math.floor(WORLD_H * band.to));
      const counts: Partial<Record<Tile, number>> = {};
      let cells = 0;
      let water = 0;
      let mineable = 0;
      let oreBlocks = 0;
      let oreValue = 0;
      let unmineable = 0;
      for (let y = startY; y < Math.min(WORLD_H, endY); y += 1) {
        for (let x = 0; x < WORLD_W; x += 1) {
          const tile = this.world[y][x];
          counts[tile] = (counts[tile] ?? 0) + 1;
          cells += 1;
          if (!tiles[tile].solid) water += 1;
          if (tiles[tile].solid && Number.isFinite(tiles[tile].hp)) mineable += 1;
          if (tiles[tile].value > 0) {
            oreBlocks += 1;
            oreValue += tiles[tile].value;
          }
          if (tile === 'anchorstone' || tile === 'bedrock') unmineable += 1;
        }
      }
      return {
        name: band.name,
        depthMeters: [
          Math.round(Math.max(0, (startY - 4) * 6)),
          Math.round(Math.max(0, (endY - 4) * 6)),
        ],
        waterRatio: roundMetric(water / cells),
        mineableRatio: roundMetric(mineable / cells),
        oreBlocks,
        oreValue,
        unmineableRatio: roundMetric(unmineable / cells),
        counts,
      };
    });
    const oasisSpecies = new Set(['Oxygen Bloom', 'Lumen Fern', 'Lumen Nodule']);
    const floatingOasisProps = this.flora.filter((flora) => {
      if (!oasisSpecies.has(flora.species)) return false;
      const tx = Math.floor(flora.x / TILE);
      const ty = Math.floor(flora.y / TILE);
      return !tiles[this.getTile(tx, ty)].solid && !tiles[this.getTile(tx, ty + 1)].solid;
    }).length;
    return {
      width: WORLD_W,
      height: WORLD_H,
      bands,
      reachable: this.playtestReachableWater(),
      entities: {
        fish: this.fish.length,
        hostileFish: this.fish.filter((fish) => fish.hostile).length,
        articulated: this.articulatedCreatures.length,
        flora: this.flora.length,
        hazardousFlora: this.flora.filter((flora) => flora.hazardous).length,
        vents: this.hazards.length,
        bobbits: this.bobbits.length,
        rooms: this.specialRooms.length,
        biolumeRooms: this.specialRooms.filter((room) => room.kind === 'biolume').length,
        nestRooms: this.specialRooms.filter((room) => room.kind === 'nest').length,
        floatingOasisProps,
        eggs: this.nestEggs.filter((egg) => egg.state !== 'destroyed').length,
        larvae: this.larvae.length,
      },
    };
  }

export function playtestReachableWater(this: DeepdiveScene, ) {
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number }> = [];
    const center = Math.floor(WORLD_W / 2);
    for (let x = center - 5; x <= center + 5; x += 1) {
      if (!tiles[this.getTile(x, 4)].solid) queue.push({ x, y: 4 });
    }
    let deepestY = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      deepestY = Math.max(deepestY, current.y);
      for (const next of [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ]) {
        if (next.x < 0 || next.x >= WORLD_W || next.y < 0 || next.y >= WORLD_H) continue;
        if (visited.has(`${next.x},${next.y}`)) continue;
        if (tiles[this.getTile(next.x, next.y)].solid) continue;
        queue.push(next);
      }
    }
    return {
      cells: visited.size,
      waterCoverage: roundMetric(visited.size / (WORLD_W * WORLD_H)),
      deepestTileY: deepestY,
      deepestMeters: Math.round(Math.max(0, (deepestY - 4) * 6)),
    };
  }
