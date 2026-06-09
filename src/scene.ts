import Phaser from 'phaser';
import type { ArticulatedCreature,AuxSub,Biome,Bobbit,CargoItem,ControlState,Fish,FishSpecies,Flare,FloatingText,Flora,FloraSpecies,Hazard,Larva,LooseItem,NestEgg,PlaytestCommand,Quest,ScanTarget,ShopItem,SonarContact,SpecialRoom,SubTier,SubVehicle,ThrownUtility,Tile,TileDef,UpgradeId,VeinRule } from './types';
import { audioKeys,audioVolumes,BARGE_DOCKING_HALF_WIDTH,BARGE_DOCKING_ZONE_Y,BARGE_DOCK_Y,BARGE_DRAW_SCALE,BARGE_ENTRY_HALF_WIDTH,BARGE_ENTRY_Y,BARGE_PLATFORM_HEIGHT,BARGE_PLATFORM_WIDTH,BIOLUME_CAVERN_CHANCE,BLEED_DURATION,BLEED_HULL_DRAIN,BLEED_RECENT_WINDOW,BLEED_TRIGGER_BITES,BOBBIT_DETECT_RADIUS,BOBBIT_ESCAPE_SECONDS,BOBBIT_LATCH_RADIUS,CAMERA_ZOOM_MULTIPLIER,deepScale,DYNAMITE_LAND_FUSE,DYNAMITE_LIFE_DAMAGE,DYNAMITE_RADIUS_TILES,EGG_CUTTER_FUEL_COST,EGG_DETECTION_RADIUS,EGG_HATCH_SECONDS,EGG_HP,ENTITY_SCALE,FIRST_AID_REPAIR,FISH_BITE_SFX_GAP_MS,FLARE_DURATION,FLARE_LIGHT_RADIUS,FUEL_REFILL_AMOUNT,FUEL_TANK_REFILL,INJECTOR_KNIFE_DAMAGE,INJECTOR_KNIFE_RANGE,LIFE_CUTTER_DAMAGE,LIFE_CUTTER_FUEL_COST,NEST_CHAMBER_CHANCE,NEST_CLEAR_REWARD,OASIS_OXYGEN_REFILL,OXYGEN_TANK_REFILL,PLAYER_COLLISION_RADIUS,PLAYER_CONTACT_RADIUS,PLAYER_DRAW_SCALE,PLAYER_FORWARD_REACH,PLAYER_PICKUP_RADIUS,SONAR_ATTRACT_RADIUS,SONAR_COOLDOWN,SONAR_FUEL_COST,SONAR_REVEAL_RADIUS_TILES,STUN_GRENADE_DURATION,STUN_GRENADE_RADIUS,SUB_BOARD_SECONDS,SUB_FUEL_CELL,SUB_FUEL_COST,SUB_OXYGEN_CELL,SUB_OXYGEN_COST,SURFACE_Y,TARGET_DEPTH,THROWN_ITEM_GRAVITY,THROWN_ITEM_MAX_FALL_SPEED,THROWN_ITEM_SPEED,TILE,VENOM_HULL_DRAIN,VENOM_TICK_SECONDS,WORLD_H,WORLD_W } from './constants';
import { biomeFish,biomeFlora,tiles,upgrades } from './content';
import { state,ui } from './state';
import { rng } from './rng';
import { activeQuest,ambientDarknessOpacity,animatedFrame,axis,bargeSolidAtWorld,bargeUpgradeCost,cargoCapacity,cargoIconForTile,cargoKindForTile,cargoSaleValue,checkOxygenWarnings,clampSelectedCargoIndex,clearBleed,clearVenom,createConsumableItem,createSubVehicle,currentApexSpecies,darknessAtDepth,darknessOpacity,depthColor,diverAnimation,diverDisplayWidth,diverFrame,diverOrigin,diverPose,fishAssetKey,fishFrameCount,fishMaxHp,fitImageHeight,fitImageWidth,floraAssetKey,floraMaxHp,fuelMax,fuelRefillCost,generateQuestBoard,generateTile,hash,hullMax,isArtifactTile,lightBeamHalfWidth,lightBeamLength,lightRadius,loadGeneratedAssets,mineCooldown,miningFuelCost,miningUpgradeBonus,oxygenDrain,oxygenMax,parallaxAlphas,parallaxPrefix,parallaxSpeeds,pointInRoom,predatorBiteCooldown,questProgressSource,rarityColor,rarityLabel,refillAtBoat,resetOxygenWarnings,restart,scaledDepthPx,scaledEntity,scannableRarity,scanReward,shopItem,sonarKey,sonarTileColor,subCollisionHalfExtents,subDef,subDirectionalReach,subMiningRange,subRepairCost,swimPose,swimTopSpeed,swimUpgradeBonus,tileTextureKey,updateFacingFromVelocity,upgradeCost,upgradeMax,veinRuleAt,veinRulesForBiome,venomousFish } from './helpers';
import { activateMenuButton,activeMenuButtons,advanceRadioDialogue,availableUpgrades,biomeName,canDiveFromBargeShortcut,clearControllerFocus,focusMenuButton,focusUiButton,menuButtonKey,nextMenuButton,openingRadioMessages,renderHud,roundMetric,toggleLogbook,unlockAchievement,updateFpsTracker } from './hud';
import * as sonarNs from './scene-sonar';
import * as economyNs from './scene-economy';
import * as playtestNs from './scene-playtest';
import * as subNs from './scene-sub';
import * as entitiesNs from './scene-entities';
import * as combatNs from './scene-combat';
import * as renderingNs from './scene-rendering';
import * as worldgenNs from './scene-worldgen';
import * as audioNs from './scene-audio';
import * as articulatedNs from './scene-articulated';
import { ensureArticulatedTextures } from './articulated';

export class DeepdiveScene extends Phaser.Scene {
  parallaxLayers: Phaser.GameObjects.TileSprite[] = [];
  terrain!: Phaser.GameObjects.Graphics;
  actors!: Phaser.GameObjects.Graphics;
  darkness!: Phaser.GameObjects.Graphics;
  lampGloom!: Phaser.GameObjects.Graphics;
  overlay!: Phaser.GameObjects.Graphics;
  bargeSprite!: Phaser.GameObjects.Image;
  playerSprite!: Phaser.GameObjects.Image;
  subSprite?: Phaser.GameObjects.Image;
  cutterBeamSprite?: Phaser.GameObjects.Image;
  auxSub?: AuxSub;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  world: Tile[][] = [];
  damage: number[][] = [];
  tileSprites: Phaser.GameObjects.Image[] = [];
  fish: Fish[] = [];
  articulatedCreatures: ArticulatedCreature[] = [];
  flora: Flora[] = [];
  hazards: Hazard[] = [];
  bobbits: Bobbit[] = [];
  specialRooms: SpecialRoom[] = [];
  nestEggs: NestEgg[] = [];
  larvae: Larva[] = [];
  looseItems: LooseItem[] = [];
  floatingTexts: FloatingText[] = [];
  flares: Flare[] = [];
  sonarPings: Array<{ x: number; y: number; age: number; life: number }> = [];
  menuLoop?: Phaser.Sound.BaseSound;
  ambientLoop?: Phaser.Sound.BaseSound;
  miningLoop?: Phaser.Sound.BaseSound;
  oxygenLoop?: Phaser.Sound.BaseSound;
  creatureCallTimer = 0;
  drillingThisFrame = false;
  lastFishBiteSfxAt = -Infinity;
  terrainBoundsKey = '';
  terrainDirty = true;
  gamepadButtonsDown = new Set<number>();
  menuNavCooldown = 0;
  player = {
    x: WORLD_W * TILE * 0.5,
    y: BARGE_DOCK_Y,
    vx: 0,
    vy: 0,
    facing: new Phaser.Math.Vector2(0, 1),
    facingSign: 1 as 1 | -1,
    mineCooldown: 0,
    scanCooldown: 0,
    sonarCooldown: 0,
    scanTarget: null as ScanTarget | null,
  };
  hudTimer = 0;

  constructor() {
    super('DeepdiveScene');
  }

  preload() {
    loadGeneratedAssets(this);
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_W * TILE, WORLD_H * TILE);
    this.cameras.main.setRoundPixels(true);
    this.tileSprites = [];
    this.resetPlayerStart();
    this.updateCameraZoom();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E,F,G,H,Q,L,P,ESC,SPACE,R,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;
    this.parallaxLayers = [0, 1, 2, 3].map((index) => this.add
      .tileSprite(0, 0, 1, 1, `parallax-shallow-${index}`)
      .setOrigin(0)
      .setDepth(-12 + index)
      .setScrollFactor(1));
    this.terrain = this.add.graphics().setDepth(0);
    this.bargeSprite = this.add.image(WORLD_W * TILE * 0.5, SURFACE_Y + 24, 'barge-platform')
      .setDepth(2.6)
      .setOrigin(0.5, 0);
    this.playerSprite = this.add.image(this.player.x, this.player.y, 'diver-swim-0').setDepth(2).setOrigin(0.5);
    this.subSprite = this.add.image(this.player.x, this.player.y, 'sub-tier1').setDepth(2.25).setOrigin(0.5).setVisible(false);
    this.cutterBeamSprite = this.add.image(this.player.x, this.player.y, 'sub-cutter-beam-0').setDepth(3.25).setOrigin(0, 0.5).setVisible(false);
    this.auxSub = {
      x: this.player.x - 36,
      y: this.player.y + 18,
      vx: 0,
      vy: 0,
      phase: 0,
      sprite: this.add.image(this.player.x, this.player.y, 'sub-tier1').setDepth(2.15).setOrigin(0.5).setVisible(false),
    };
    this.actors = this.add.graphics().setDepth(3);
    this.darkness = this.add.graphics().setDepth(5);
    this.lampGloom = this.add.graphics().setDepth(6);
    this.overlay = this.add.graphics().setDepth(7);
    ensureArticulatedTextures(this);
    this.generateWorld();
    if (state.started) this.revealSonarAtPlayer(8);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.creatureCallTimer = Phaser.Math.Between(95, 175);
    this.updateAudio(0);
    renderHud();
  }

  update(_: number, deltaMs: number) {
    updateFpsTracker(deltaMs);
    const delta = deltaMs / 1000;
    const controls = this.readControls();
    if (canDiveFromBargeShortcut() && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.diveFromBarge();
      return;
    }
    if (this.updateMenuNavigation(delta, controls)) return;
    if (state.radioOpen && state.started && !state.lost && !state.won) {
      this.draw();
      this.updateAudio(delta);
      return;
    }
    if (!state.started) {
      if (controls.confirmPressed) {
        this.startRun();
        return;
      }
      this.updateAudio(delta);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      restart(this);
      return;
    }
    if (controls.logbookPressed) {
      toggleLogbook();
    }
    if (controls.pausePressed) {
      state.paused = !state.paused;
      if (state.paused) state.logbookOpen = false;
      if (state.paused) state.cargoOpen = false;
      renderHud();
    }
    if (state.lost || state.won) {
      if (controls.confirmPressed) restart(this);
      this.draw();
      this.updateAudio(delta);
      return;
    }
    if (state.paused) {
      this.draw();
      this.updateAudio(delta);
      return;
    }
    if (state.docked) {
      this.updateDockedAtBarge(delta, controls);
      this.updateFish(delta * 0.35);
      this.updateArticulatedCreatures(delta * 0.25);
      this.updateFlora(delta * 0.35);
      this.updateAuxSub(delta * 0.35);
      this.updateFloatingTexts(delta);
      this.updateFlares(delta);
      this.updateSystems(delta);
      this.updateQuestProgress();
      this.updateCameraZoom();
      this.cameras.main.centerOn(this.player.x, this.player.y);
      this.draw();
      this.updateAudio(delta);
      this.hudTimer += deltaMs;
      if (this.hudTimer > 90) {
        this.hudTimer = 0;
        renderHud();
      }
      return;
    }

    this.drillingThisFrame = false;
    this.updatePlayer(delta, controls);
    this.updateLooseItems(delta);
    this.updateFlora(delta);
    this.updateFish(delta);
    this.updateArticulatedCreatures(delta, controls);
    this.updateSpecialRooms(delta);
    this.updateNestEggs(delta);
    this.updateLarvae(delta, controls);
    this.updateAuxSub(delta);
    this.updateHazards(delta);
    this.updateBobbits(delta, controls);
    this.updateSystems(delta);
    this.updateQuestProgress();
    this.updateFloatingTexts(delta);
    this.updateFlares(delta);
    this.updateSonarPings(delta);
    this.updateCameraZoom();
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.draw();
    this.updateAudio(delta);
    this.hudTimer += deltaMs;
    if (this.hudTimer > 90) {
      this.hudTimer = 0;
      renderHud();
    }
  }

  updateCameraZoom() {
    const baseZoom = this.scale.width < 700 ? 1.35 : 1.85;
    const zoom = baseZoom * CAMERA_ZOOM_MULTIPLIER;
    if (Math.abs(this.cameras.main.zoom - zoom) > 0.01) {
      this.cameras.main.setZoom(zoom);
      this.terrainDirty = true;
    }
  }

  resetPlayerStart() {
    this.player.x = WORLD_W * TILE * 0.5;
    this.player.y = BARGE_DOCK_Y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.facing.set(0, 1);
    this.player.facingSign = 1;
    this.player.mineCooldown = 0;
    this.player.scanCooldown = 0;
    this.player.sonarCooldown = 0;
    this.player.scanTarget = null;
    state.docked = true;
    this.sonarPings = [];
    this.hudTimer = 0;
    this.floatingTexts.forEach((entry) => entry.label.destroy());
    this.floatingTexts = [];
    this.terrainBoundsKey = '';
    this.terrainDirty = true;
  }

  createEntitySprite(x: number, y: number, key: string) {
    return this.add.image(x, y, key)
      .setDepth(2)
      .setOrigin(0.5)
      .setVisible(false);
  }

  tileSpriteAt(index: number, textureKey: string) {
    const cached = this.tileSprites[index];
    const tileSprite = cached?.scene ? cached : this.add.image(0, 0, textureKey)
      .setDepth(0.6)
      .setOrigin(0)
      .setDisplaySize(TILE, TILE);
    this.tileSprites[index] = tileSprite;
    return tileSprite;
  }

  readControls(): ControlState {
    const phaserPad = this.input.gamepad?.getPad(0) as {
      axes?: Array<{ getValue?: () => number; value?: number } | number>;
      buttons?: Array<{ pressed?: boolean; value?: number } | number>;
    } | undefined;
    const gamepad = navigator.getGamepads?.().find((pad): pad is Gamepad => Boolean(pad?.connected));
    const pressed = new Set<number>();
    const buttonCount = Math.max(phaserPad?.buttons?.length ?? 0, gamepad?.buttons.length ?? 0);
    for (let index = 0; index < buttonCount; index += 1) {
      const phaserButton = phaserPad?.buttons?.[index];
      const phaserValue = typeof phaserButton === 'number' ? phaserButton : phaserButton?.value ?? (phaserButton?.pressed ? 1 : 0);
      const rawButton = gamepad?.buttons[index];
      if ((phaserButton && phaserValue > 0.5) || rawButton?.pressed || (rawButton?.value ?? 0) > 0.5) pressed.add(index);
    }
    const padJustPressed = (index: number) => pressed.has(index) && !this.gamepadButtonsDown.has(index);
    const axisValue = (index: number) => {
      const phaserAxis = phaserPad?.axes?.[index];
      const phaserValue = typeof phaserAxis === 'number' ? phaserAxis : phaserAxis?.getValue?.() ?? phaserAxis?.value;
      const value = phaserValue ?? gamepad?.axes[index] ?? 0;
      return Math.abs(value) > 0.18 ? value : 0;
    };
    const padX = axisValue(0) + (pressed.has(15) ? 1 : 0) - (pressed.has(14) ? 1 : 0);
    const padY = axisValue(1) + (pressed.has(13) ? 1 : 0) - (pressed.has(12) ? 1 : 0);
    const cargoSelecting = state.cargoOpen && !state.paused && !state.logbookOpen && !state.radioOpen && state.started && !state.atBoat;
    const move = new Phaser.Math.Vector2(
      cargoSelecting ? 0 : axis(this.cursors.left, this.keys.A, this.cursors.right, this.keys.D) + Phaser.Math.Clamp(padX, -1, 1),
      cargoSelecting ? 0 : axis(this.cursors.up, this.keys.W, this.cursors.down, this.keys.S) + Phaser.Math.Clamp(padY, -1, 1),
    );
    if (move.lengthSq() > 1) move.normalize();

    const controls = {
      move,
      hasMove: move.lengthSq() > 0,
      mineHeld: !cargoSelecting && (this.keys.SPACE.isDown || pressed.has(0) || pressed.has(7)),
      scanHeld: this.keys.E.isDown || pressed.has(2),
      boardHeld: this.keys.F.isDown || pressed.has(1),
      scoutPressed: Phaser.Input.Keyboard.JustDown(this.keys.H) || padJustPressed(8),
      sonarPressed: Phaser.Input.Keyboard.JustDown(this.keys.Q) || padJustPressed(4),
      useItemPressed: Phaser.Input.Keyboard.JustDown(this.keys.G) || padJustPressed(5),
      pausePressed: Phaser.Input.Keyboard.JustDown(this.keys.ESC) || Phaser.Input.Keyboard.JustDown(this.keys.P) || padJustPressed(9),
      logbookPressed: Phaser.Input.Keyboard.JustDown(this.keys.L) || padJustPressed(3),
      confirmPressed: Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || padJustPressed(0),
    };
    this.gamepadButtonsDown = pressed;
    return controls;
  }

  updateMenuNavigation(delta: number, controls: ControlState) {
    this.menuNavCooldown = Math.max(0, this.menuNavCooldown - delta);
    const buttons = activeMenuButtons();
    if (!buttons.length) {
      clearControllerFocus(true);
      return false;
    }

    let active = document.activeElement instanceof HTMLButtonElement && buttons.includes(document.activeElement)
      ? document.activeElement
      : null;
    if (!active) {
      active = focusMenuButton(buttons, ui.focusKey) ?? buttons[0];
      focusUiButton(active);
      ui.focusKey = menuButtonKey(active);
    }

    if (controls.hasMove && this.menuNavCooldown <= 0) {
      const next = nextMenuButton(buttons, active, controls.move);
      if (next && next !== active) {
        focusUiButton(next);
        ui.focusKey = menuButtonKey(next);
        this.menuNavCooldown = 0.18;
      }
    }

    if (controls.confirmPressed) {
      if (state.radioOpen && state.started && !state.lost && !state.won) {
        advanceRadioDialogue();
        renderHud();
        return true;
      }
      activateMenuButton(active);
      return true;
    }
    return false;
  }

  updateDockedAtBarge(delta: number, controls: ControlState) {
    this.drillingThisFrame = false;
    this.player.x = WORLD_W * TILE * 0.5;
    this.player.y = BARGE_DOCK_Y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.mineCooldown = Math.max(0, this.player.mineCooldown - delta);
    this.player.scanCooldown = Math.max(0, this.player.scanCooldown - delta);
    this.player.sonarCooldown = Math.max(0, this.player.sonarCooldown - delta);
    if (controls.confirmPressed && !state.logbookOpen && !state.radioOpen) this.diveFromBarge();
  }

  updatePlayer(delta: number, controls: ControlState) {
    if (state.activeSub) {
      this.updateSubBoarding(delta, controls);
      if (state.pilotingSub) {
        this.updateSubPilot(delta, controls);
        return;
      }
    }

    const input = new Phaser.Math.Vector2(
      controls.move.x,
      controls.move.y,
    );
    const hasInput = controls.hasMove;
    if (hasInput) {
      input.normalize();
    }

    const latchedBobbit = this.latchedBobbit();
    if (latchedBobbit) {
      this.player.x = latchedBobbit.latchX;
      this.player.y = latchedBobbit.latchY;
      this.player.vx = 0;
      this.player.vy = 0;
      if (hasInput) {
        this.rotateFacingToward(input.angle(), delta, 7.2);
        this.updatePlayerFacing(input.x);
      }
      this.player.mineCooldown = Math.max(0, this.player.mineCooldown - delta);
      this.player.scanCooldown = Math.max(0, this.player.scanCooldown - delta);
      this.player.sonarCooldown = Math.max(0, this.player.sonarCooldown - delta);
      if (controls.useItemPressed) {
        this.useSelectedItem();
      }
      return;
    }

    const topSpeed = swimTopSpeed();
    const thrust = (this.isAtBoat() ? 620 : 300) + swimUpgradeBonus() * 34;
    this.player.vx += input.x * thrust * delta;
    this.player.vy += input.y * thrust * delta;
    const drag = input.lengthSq() > 0 ? 1.45 : 2.65;
    const dragFactor = Math.exp(-drag * delta);
    this.player.vx *= dragFactor;
    this.player.vy *= dragFactor;
    const speed = Math.hypot(this.player.vx, this.player.vy);
    if (speed > topSpeed) {
      this.player.vx = (this.player.vx / speed) * topSpeed;
      this.player.vy = (this.player.vy / speed) * topSpeed;
    }
    const latchedLarvae = this.larvae.filter((larva) => larva.latched).length;
    if (latchedLarvae > 0) {
      const drag = Math.max(0.66, 1 - latchedLarvae * 0.08);
      this.player.vx *= drag;
      this.player.vy *= drag;
    }
    if (hasInput) {
      this.rotateFacingToward(input.angle(), delta, 6.2 + swimUpgradeBonus() * 0.18);
      this.updatePlayerFacing(input.x);
    } else if (speed > 12) {
      this.rotateFacingToward(Math.atan2(this.player.vy, this.player.vx), delta, 2.8);
      this.updatePlayerFacing(this.player.vx / Math.max(1, speed));
    }

    this.moveAxis('x', this.player.vx * delta);
    this.moveAxis('y', this.player.vy * delta);

    this.player.mineCooldown = Math.max(0, this.player.mineCooldown - delta);
    this.player.scanCooldown = Math.max(0, this.player.scanCooldown - delta);
    this.player.sonarCooldown = Math.max(0, this.player.sonarCooldown - delta);
    if (controls.sonarPressed) {
      this.sonarPing();
    }
    if (controls.useItemPressed) {
      this.useSelectedItem();
    }
    const pointer = this.input.activePointer;
    if (pointer.isDown) this.mineAt(pointer.worldX, pointer.worldY);
    if (controls.mineHeld) {
      this.mineAt(this.player.x + this.player.facing.x * PLAYER_FORWARD_REACH, this.player.y + this.player.facing.y * PLAYER_FORWARD_REACH);
    }
    this.scanNearbyLife(delta, controls.scanHeld);
  }

  updatePlayerFacing(horizontalIntent: number) {
    if (horizontalIntent < -0.08) this.player.facingSign = -1;
    if (horizontalIntent > 0.08) this.player.facingSign = 1;
  }

  latchedBobbit() {
    return this.bobbits.find((bobbit) => bobbit.state === 'latched');
  }

  rotateFacingToward(targetAngle: number, delta: number, turnRate: number) {
    const nextAngle = Phaser.Math.Angle.RotateTo(this.player.facing.angle(), targetAngle, turnRate * delta);
    this.player.facing.set(Math.cos(nextAngle), Math.sin(nextAngle));
  }

  moveAxis(axisName: 'x' | 'y', amount: number) {
    if (amount === 0) return;
    const previous = this.player[axisName];
    this.player[axisName] += amount;
    if (this.collides(this.player.x, this.player.y)) {
      this.player[axisName] = previous;
      if (Math.abs(amount) > 1.8 && !this.isInDockingZone()) {
        this.applyHullDamage(Math.max(0, Math.abs(amount) - 1.8) * 0.5, 'Hull scraped against rock.');
      }
      if (axisName === 'x') this.player.vx *= this.isInDockingZone() ? 0.08 : -0.16;
      if (axisName === 'y') this.player.vy *= this.isInDockingZone() ? 0.08 : -0.16;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, 20, WORLD_W * TILE - 20);
    this.player.y = Phaser.Math.Clamp(this.player.y, 20, WORLD_H * TILE - 20);
  }

  collides(x: number, y: number): boolean {
    const points = this.collisionSamplePoints(x, y);
    return points.some(([px, py]) => bargeSolidAtWorld(px, py) || tiles[this.tileAtWorld(px, py)].solid);
  }

  collisionSamplePoints(x: number, y: number) {
    const sub = state.pilotingSub ? state.activeSub : null;
    if (!sub) {
      const r = PLAYER_COLLISION_RADIUS;
      return [
        [x - r, y - r],
        [x + r, y - r],
        [x - r, y + r],
        [x + r, y + r],
      ];
    }
    const { halfW, halfH } = subCollisionHalfExtents(sub);
    const points: Array<[number, number]> = [];
    const step = TILE * 0.32;
    for (let ox = -halfW; ox <= halfW + 0.01; ox += step) {
      points.push([x + ox, y - halfH], [x + ox, y + halfH]);
    }
    for (let oy = -halfH; oy <= halfH + 0.01; oy += step) {
      points.push([x - halfW, y + oy], [x + halfW, y + oy]);
    }
    points.push(
      [x - halfW, y - halfH],
      [x + halfW, y - halfH],
      [x - halfW, y + halfH],
      [x + halfW, y + halfH],
      [x, y - halfH * 0.58],
      [x, y + halfH * 0.58],
    );
    return points;
  }

  updateSystems(delta: number) {
    state.depth = Math.max(0, Math.floor((this.player.y - SURFACE_Y) / TILE) * 6);
    state.maxDepth = Math.max(state.maxDepth, state.depth);
    const wasAtBoat = state.atBoat;
    state.atBoat = state.docked || this.isAtBoat();
    if (state.atBoat) {
      if (state.venom.active) {
        clearVenom();
        state.status = 'Barge medics purged the venom from your suit seals.';
      }
      if (state.bleed.active || state.bleed.recentBites > 0) {
        clearBleed();
        state.status = 'Barge medics sealed the suit bleed.';
      }
      if (!wasAtBoat && state.started) {
        state.docked = true;
        this.player.x = WORLD_W * TILE * 0.5;
        this.player.y = BARGE_DOCK_Y;
        this.player.vx = 0;
        this.player.vy = 0;
        if (state.activeSub && state.pilotingSub) {
          state.activeSub.x = this.player.x;
          state.activeSub.y = this.player.y;
          state.activeSub.vx = 0;
          state.activeSub.vy = 0;
        }
        state.status = 'Docked at the barge. Refit, review the logbook, then press Dive.';
      }
      const sale = cargoSaleValue();
      if (sale > 0) {
        state.credits += sale;
        state.oreSoldCredits += sale;
        state.status = `Sold cargo for ${sale} credits.`;
        state.cargo = state.cargo.filter((item) => item.value <= 0);
        clampSelectedCargoIndex();
      }
      refillAtBoat(delta);
    } else {
      if (state.pilotingSub && state.activeSub) {
        state.activeSub.oxygen = Math.max(0, state.activeSub.oxygen - oxygenDrain() * 0.55 * delta);
        if (state.activeSub.oxygen <= 0) state.oxygen -= oxygenDrain() * 0.8 * delta;
      } else {
        state.oxygen -= oxygenDrain() * delta;
      }
      if (state.venom.active) {
        state.venom.tick += delta;
        this.applyHullDamage(VENOM_HULL_DRAIN * delta, `${state.venom.source} venom is draining suit integrity.`);
        if (state.venom.tick >= VENOM_TICK_SECONDS) {
          state.venom.tick = 0;
          this.spawnFloatingText('Venom damage', 0xb9f27c);
        }
      }
      if (state.bleed.recentTimer > 0) {
        state.bleed.recentTimer = Math.max(0, state.bleed.recentTimer - delta);
        if (state.bleed.recentTimer <= 0) state.bleed.recentBites = 0;
      }
      if (state.bleed.active) {
        state.bleed.duration = Math.max(0, state.bleed.duration - delta);
        this.applyHullDamage(BLEED_HULL_DRAIN * Math.max(1, state.bleed.stacks) * delta, `${state.bleed.source} bite wound is bleeding.`);
        if (state.bleed.duration <= 0) {
          clearBleed();
          state.status = 'Suit bleed clotted. Hull loss stabilized.';
          this.spawnFloatingText('Bleed clotted', 0xffd166);
        }
      }
    }
    checkOxygenWarnings();

    const apexSpecies = currentApexSpecies();
    if (state.depth > 1520 && !state.scannedSpecies.has(apexSpecies)) {
      state.status = state.biome === 1
        ? 'Something huge is moving below. Scan it before your suit gives out.'
        : state.biome === 2
          ? 'A brine giant is circling the vents. Scan it to chart this biome.'
          : state.biome === 3
            ? 'A crowned predator is threading the anchorstone. Scan it to chart the trench.'
            : 'Something engineered is patrolling the ruin vaults. Scan it before it finds you first.';
    }
    if (state.oxygen <= 0) {
      state.oxygen = 0;
      this.applyHullDamage(16 * delta, 'Oxygen starvation is damaging the suit.');
    }
    if (state.hull <= 0) {
      if (state.unhardcore) {
        this.respawnAtBarge();
        return;
      }
      state.hull = 0;
      state.lost = true;
      state.paused = false;
      state.logbookOpen = false;
      state.cargoOpen = false;
      state.radioOpen = false;
      state.status = `Helmet breached at ${state.maxDepth} m. Press R to restart.`;
      renderHud();
    }
  }

  respawnAtBarge() {
    const sale = cargoSaleValue();
    if (sale > 0) {
      state.credits += sale;
      state.oreSoldCredits += sale;
      state.cargo = state.cargo.filter((item) => item.value <= 0);
      clampSelectedCargoIndex();
    }
    state.hull = hullMax();
    state.oxygen = oxygenMax();
    state.fuel = Math.max(state.fuel, Math.min(fuelMax(), FUEL_REFILL_AMOUNT));
    state.atBoat = true;
    state.docked = true;
    state.paused = false;
    state.cargoOpen = false;
    state.lost = false;
    this.player.x = WORLD_W * TILE * 0.5;
    this.player.y = BARGE_DOCK_Y;
    this.player.vx = 0;
    this.player.vy = 0;
    resetOxygenWarnings();
    clearVenom();
    clearBleed();
    state.status = sale > 0
      ? `Unhardcore recovery. Cargo banked for ${sale} credits.`
      : 'Unhardcore recovery. The barge winch dragged you back breathing.';
    unlockAchievement('weak...', 'Respawn at the barge with Unhardcore enabled.');
    renderHud();
  }

  isAtBoat(): boolean {
    return this.player.y < BARGE_ENTRY_Y && Math.abs(this.player.x - WORLD_W * TILE * 0.5) < BARGE_ENTRY_HALF_WIDTH;
  }

  isInDockingZone(): boolean {
    return this.player.y < BARGE_DOCKING_ZONE_Y && Math.abs(this.player.x - WORLD_W * TILE * 0.5) < BARGE_DOCKING_HALF_WIDTH;
  }

  tileAtWorld(worldX: number, worldY: number): Tile {
    return this.getTile(Math.floor(worldX / TILE), Math.floor(worldY / TILE));
  }

  getTile(x: number, y: number): Tile {
    if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return 'bedrock';
    return this.world[y][x];
  }

  setTile(x: number, y: number, tile: Tile) {
    if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return;
    this.world[y][x] = tile;
    this.terrainDirty = true;
  }

}

Object.assign(DeepdiveScene.prototype, audioNs);
export interface DeepdiveScene {
  updateAudio: OmitThisParameter<typeof audioNs.updateAudio>;
  ensureLoop: OmitThisParameter<typeof audioNs.ensureLoop>;
  loopVolume: OmitThisParameter<typeof audioNs.loopVolume>;
  setLoopVolume: OmitThisParameter<typeof audioNs.setLoopVolume>;
  stopLoop: OmitThisParameter<typeof audioNs.stopLoop>;
  playDepthCall: OmitThisParameter<typeof audioNs.playDepthCall>;
  playSfx: OmitThisParameter<typeof audioNs.playSfx>;
}

Object.assign(DeepdiveScene.prototype, worldgenNs);
export interface DeepdiveScene {
  generateWorld: OmitThisParameter<typeof worldgenNs.generateWorld>;
  makeVentFields: OmitThisParameter<typeof worldgenNs.makeVentFields>;
  injectSpecialRooms: OmitThisParameter<typeof worldgenNs.injectSpecialRooms>;
  pickBiolumeCavernCenter: OmitThisParameter<typeof worldgenNs.pickBiolumeCavernCenter>;
  pickNestDeadEnd: OmitThisParameter<typeof worldgenNs.pickNestDeadEnd>;
  denseSolidRatio: OmitThisParameter<typeof worldgenNs.denseSolidRatio>;
  cardinalWaterNeighbors: OmitThisParameter<typeof worldgenNs.cardinalWaterNeighbors>;
  injectBiolumeCavern: OmitThisParameter<typeof worldgenNs.injectBiolumeCavern>;
  injectPredatorNest: OmitThisParameter<typeof worldgenNs.injectPredatorNest>;
  cellularRoomMask: OmitThisParameter<typeof worldgenNs.cellularRoomMask>;
  openRoomMouths: OmitThisParameter<typeof worldgenNs.openRoomMouths>;
  connectRoomToNearestWater: OmitThisParameter<typeof worldgenNs.connectRoomToNearestWater>;
  seedBiolumeResources: OmitThisParameter<typeof worldgenNs.seedBiolumeResources>;
  populateOreVeins: OmitThisParameter<typeof worldgenNs.populateOreVeins>;
  growOreVein: OmitThisParameter<typeof worldgenNs.growOreVein>;
  canHostOre: OmitThisParameter<typeof worldgenNs.canHostOre>;
  makeBobbits: OmitThisParameter<typeof worldgenNs.makeBobbits>;
  makeSchool: OmitThisParameter<typeof worldgenNs.makeSchool>;
  makeFloraPatch: OmitThisParameter<typeof worldgenNs.makeFloraPatch>;
  populateSpecialRooms: OmitThisParameter<typeof worldgenNs.populateSpecialRooms>;
  populateBiolumeRoom: OmitThisParameter<typeof worldgenNs.populateBiolumeRoom>;
  populateNestRoom: OmitThisParameter<typeof worldgenNs.populateNestRoom>;
  findRoomFloorAnchor: OmitThisParameter<typeof worldgenNs.findRoomFloorAnchor>;
  findFloraAnchorInBand: OmitThisParameter<typeof worldgenNs.findFloraAnchorInBand>;
  findRockTopAnchorInBand: OmitThisParameter<typeof worldgenNs.findRockTopAnchorInBand>;
  findOpenWaterInBand: OmitThisParameter<typeof worldgenNs.findOpenWaterInBand>;
  carveStarterCaverns: OmitThisParameter<typeof worldgenNs.carveStarterCaverns>;
  carveDeepTunnelNetwork: OmitThisParameter<typeof worldgenNs.carveDeepTunnelNetwork>;
  carveTunnelBand: OmitThisParameter<typeof worldgenNs.carveTunnelBand>;
  carveDarkBasin: OmitThisParameter<typeof worldgenNs.carveDarkBasin>;
  carveRuinVaults: OmitThisParameter<typeof worldgenNs.carveRuinVaults>;
  pickLanePoint: OmitThisParameter<typeof worldgenNs.pickLanePoint>;
  nearestLanePoint: OmitThisParameter<typeof worldgenNs.nearestLanePoint>;
  carveAnchorstoneStrata: OmitThisParameter<typeof worldgenNs.carveAnchorstoneStrata>;
  carveWindingTunnel: OmitThisParameter<typeof worldgenNs.carveWindingTunnel>;
  carveDisc: OmitThisParameter<typeof worldgenNs.carveDisc>;
}

Object.assign(DeepdiveScene.prototype, renderingNs);
export interface DeepdiveScene {
  draw: OmitThisParameter<typeof renderingNs.draw>;
  drawParallax: OmitThisParameter<typeof renderingNs.drawParallax>;
  drawGameOver: OmitThisParameter<typeof renderingNs.drawGameOver>;
  drawWorld: OmitThisParameter<typeof renderingNs.drawWorld>;
  drawBoat: OmitThisParameter<typeof renderingNs.drawBoat>;
  drawSpecialRooms: OmitThisParameter<typeof renderingNs.drawSpecialRooms>;
  drawHazards: OmitThisParameter<typeof renderingNs.drawHazards>;
  drawNestEggs: OmitThisParameter<typeof renderingNs.drawNestEggs>;
  drawLarvae: OmitThisParameter<typeof renderingNs.drawLarvae>;
  drawBobbits: OmitThisParameter<typeof renderingNs.drawBobbits>;
  drawFish: OmitThisParameter<typeof renderingNs.drawFish>;
  drawFlora: OmitThisParameter<typeof renderingNs.drawFlora>;
  fishVisibilityAlpha: OmitThisParameter<typeof renderingNs.fishVisibilityAlpha>;
  drawPlayer: OmitThisParameter<typeof renderingNs.drawPlayer>;
  drawSub: OmitThisParameter<typeof renderingNs.drawSub>;
  drawDarkness: OmitThisParameter<typeof renderingNs.drawDarkness>;
  lampIntervalsAtY: OmitThisParameter<typeof renderingNs.lampIntervalsAtY>;
  drawSonarPings: OmitThisParameter<typeof renderingNs.drawSonarPings>;
  drawFlares: OmitThisParameter<typeof renderingNs.drawFlares>;
  drawSonarMap: OmitThisParameter<typeof renderingNs.drawSonarMap>;
  drawLooseItems: OmitThisParameter<typeof renderingNs.drawLooseItems>;
}

Object.assign(DeepdiveScene.prototype, articulatedNs);
export interface DeepdiveScene {
  populateArticulatedCreatures: OmitThisParameter<typeof articulatedNs.populateArticulatedCreatures>;
  updateArticulatedCreatures: OmitThisParameter<typeof articulatedNs.updateArticulatedCreatures>;
  steerArticulatedCreature: OmitThisParameter<typeof articulatedNs.steerArticulatedCreature>;
  keepArticulatedCreatureInWater: OmitThisParameter<typeof articulatedNs.keepArticulatedCreatureInWater>;
  updateArticulatedParts: OmitThisParameter<typeof articulatedNs.updateArticulatedParts>;
  resolveArticulatedGrab: OmitThisParameter<typeof articulatedNs.resolveArticulatedGrab>;
  bumpArticulatedCreature: OmitThisParameter<typeof articulatedNs.bumpArticulatedCreature>;
  closestArticulatedPartTo: OmitThisParameter<typeof articulatedNs.closestArticulatedPartTo>;
  nearestArticulatedDamageTarget: OmitThisParameter<typeof articulatedNs.nearestArticulatedDamageTarget>;
  nearestKnifeArticulatedTarget: OmitThisParameter<typeof articulatedNs.nearestKnifeArticulatedTarget>;
  damageArticulatedPart: OmitThisParameter<typeof articulatedNs.damageArticulatedPart>;
  damageArticulatedInRadius: OmitThisParameter<typeof articulatedNs.damageArticulatedInRadius>;
  articulatedMobilityScale: OmitThisParameter<typeof articulatedNs.articulatedMobilityScale>;
  drawArticulatedCreatures: OmitThisParameter<typeof articulatedNs.drawArticulatedCreatures>;
  articulatedVisibilityAlpha: OmitThisParameter<typeof articulatedNs.articulatedVisibilityAlpha>;
}

Object.assign(DeepdiveScene.prototype, combatNs);
export interface DeepdiveScene {
  mineFromSub: OmitThisParameter<typeof combatNs.mineFromSub>;
  findSubMiningTarget: OmitThisParameter<typeof combatNs.findSubMiningTarget>;
  mineAt: OmitThisParameter<typeof combatNs.mineAt>;
  cutNestTarget: OmitThisParameter<typeof combatNs.cutNestTarget>;
  cutLifeTarget: OmitThisParameter<typeof combatNs.cutLifeTarget>;
  nearestLifeDamageTarget: OmitThisParameter<typeof combatNs.nearestLifeDamageTarget>;
  damageLifeTarget: OmitThisParameter<typeof combatNs.damageLifeTarget>;
  damageLifeInRadius: OmitThisParameter<typeof combatNs.damageLifeInRadius>;
  nearestNestCutTarget: OmitThisParameter<typeof combatNs.nearestNestCutTarget>;
  mineTargets: OmitThisParameter<typeof combatNs.mineTargets>;
  breakTile: OmitThisParameter<typeof combatNs.breakTile>;
  spawnLoose: OmitThisParameter<typeof combatNs.spawnLoose>;
  detonateDynamite: OmitThisParameter<typeof combatNs.detonateDynamite>;
  deployFlare: OmitThisParameter<typeof combatNs.deployFlare>;
  triggerStunPulse: OmitThisParameter<typeof combatNs.triggerStunPulse>;
  throwUtilityItem: OmitThisParameter<typeof combatNs.throwUtilityItem>;
  useInjectorKnife: OmitThisParameter<typeof combatNs.useInjectorKnife>;
  nearestKnifeLarva: OmitThisParameter<typeof combatNs.nearestKnifeLarva>;
  nearestKnifeTarget: OmitThisParameter<typeof combatNs.nearestKnifeTarget>;
  consumeOxygenTank: OmitThisParameter<typeof combatNs.consumeOxygenTank>;
  consumeFuelTank: OmitThisParameter<typeof combatNs.consumeFuelTank>;
  consumeFirstAidKit: OmitThisParameter<typeof combatNs.consumeFirstAidKit>;
  consumeAntivenom: OmitThisParameter<typeof combatNs.consumeAntivenom>;
  useSelectedItem: OmitThisParameter<typeof combatNs.useSelectedItem>;
  dropCargoItem: OmitThisParameter<typeof combatNs.dropCargoItem>;
  applyHullDamage: OmitThisParameter<typeof combatNs.applyHullDamage>;
  destroyActiveSub: OmitThisParameter<typeof combatNs.destroyActiveSub>;
  fireSubWeapon: OmitThisParameter<typeof combatNs.fireSubWeapon>;
}

Object.assign(DeepdiveScene.prototype, entitiesNs);
export interface DeepdiveScene {
  updateFish: OmitThisParameter<typeof entitiesNs.updateFish>;
  updateFlora: OmitThisParameter<typeof entitiesNs.updateFlora>;
  steerFish: OmitThisParameter<typeof entitiesNs.steerFish>;
  keepFishInWater: OmitThisParameter<typeof entitiesNs.keepFishInWater>;
  bumpFish: OmitThisParameter<typeof entitiesNs.bumpFish>;
  applyVenom: OmitThisParameter<typeof entitiesNs.applyVenom>;
  registerPredatorBite: OmitThisParameter<typeof entitiesNs.registerPredatorBite>;
  playFishBite: OmitThisParameter<typeof entitiesNs.playFishBite>;
  updateBobbits: OmitThisParameter<typeof entitiesNs.updateBobbits>;
  resetBobbit: OmitThisParameter<typeof entitiesNs.resetBobbit>;
  updateHazards: OmitThisParameter<typeof entitiesNs.updateHazards>;
  updateSpecialRooms: OmitThisParameter<typeof entitiesNs.updateSpecialRooms>;
  updateNestEggs: OmitThisParameter<typeof entitiesNs.updateNestEggs>;
  hatchEgg: OmitThisParameter<typeof entitiesNs.hatchEgg>;
  updateLarvae: OmitThisParameter<typeof entitiesNs.updateLarvae>;
  failNestBounty: OmitThisParameter<typeof entitiesNs.failNestBounty>;
  checkNestRewards: OmitThisParameter<typeof entitiesNs.checkNestRewards>;
  updateLooseItems: OmitThisParameter<typeof entitiesNs.updateLooseItems>;
  updateThrownUtility: OmitThisParameter<typeof entitiesNs.updateThrownUtility>;
  thrownItemCollides: OmitThisParameter<typeof entitiesNs.thrownItemCollides>;
  thrownItemLandingY: OmitThisParameter<typeof entitiesNs.thrownItemLandingY>;
  spawnFloatingText: OmitThisParameter<typeof entitiesNs.spawnFloatingText>;
  updateFloatingTexts: OmitThisParameter<typeof entitiesNs.updateFloatingTexts>;
  updateSonarPings: OmitThisParameter<typeof entitiesNs.updateSonarPings>;
  updateFlares: OmitThisParameter<typeof entitiesNs.updateFlares>;
  scanNearbyLife: OmitThisParameter<typeof entitiesNs.scanNearbyLife>;
  nearestLife: OmitThisParameter<typeof entitiesNs.nearestLife>;
  nearestUnscannedLife: OmitThisParameter<typeof entitiesNs.nearestUnscannedLife>;
}

Object.assign(DeepdiveScene.prototype, subNs);
export interface DeepdiveScene {
  buySub: OmitThisParameter<typeof subNs.buySub>;
  buySubFuel: OmitThisParameter<typeof subNs.buySubFuel>;
  buySubOxygen: OmitThisParameter<typeof subNs.buySubOxygen>;
  repairSubHull: OmitThisParameter<typeof subNs.repairSubHull>;
  canUseSubHatch: OmitThisParameter<typeof subNs.canUseSubHatch>;
  activateSubHatch: OmitThisParameter<typeof subNs.activateSubHatch>;
  deployScoutFromCarrier: OmitThisParameter<typeof subNs.deployScoutFromCarrier>;
  deploySelectedSub: OmitThisParameter<typeof subNs.deploySelectedSub>;
  syncSubToPlayer: OmitThisParameter<typeof subNs.syncSubToPlayer>;
  updateSubPilot: OmitThisParameter<typeof subNs.updateSubPilot>;
  updateSubBoarding: OmitThisParameter<typeof subNs.updateSubBoarding>;
  canReturnScoutToCarrier: OmitThisParameter<typeof subNs.canReturnScoutToCarrier>;
  completeScoutReturn: OmitThisParameter<typeof subNs.completeScoutReturn>;
  completeSubHatch: OmitThisParameter<typeof subNs.completeSubHatch>;
  updateAuxSub: OmitThisParameter<typeof subNs.updateAuxSub>;
}

Object.assign(DeepdiveScene.prototype, playtestNs);
export interface DeepdiveScene {
  playtestSnapshot: OmitThisParameter<typeof playtestNs.playtestSnapshot>;
  playtestCommand: OmitThisParameter<typeof playtestNs.playtestCommand>;
  playtestWorldSurvey: OmitThisParameter<typeof playtestNs.playtestWorldSurvey>;
  playtestReachableWater: OmitThisParameter<typeof playtestNs.playtestReachableWater>;
}

Object.assign(DeepdiveScene.prototype, economyNs);
export interface DeepdiveScene {
  buy: OmitThisParameter<typeof economyNs.buy>;
  startRun: OmitThisParameter<typeof economyNs.startRun>;
  diveFromBarge: OmitThisParameter<typeof economyNs.diveFromBarge>;
  buyFuel: OmitThisParameter<typeof economyNs.buyFuel>;
  buyShopItem: OmitThisParameter<typeof economyNs.buyShopItem>;
  acceptQuest: OmitThisParameter<typeof economyNs.acceptQuest>;
  claimQuest: OmitThisParameter<typeof economyNs.claimQuest>;
  travelToNextBiome: OmitThisParameter<typeof economyNs.travelToNextBiome>;
  updateQuestProgress: OmitThisParameter<typeof economyNs.updateQuestProgress>;
  completeQuest: OmitThisParameter<typeof economyNs.completeQuest>;
  completeNestQuest: OmitThisParameter<typeof economyNs.completeNestQuest>;
  hasActiveNestLocator: OmitThisParameter<typeof economyNs.hasActiveNestLocator>;
  nearestOpenNestRoom: OmitThisParameter<typeof economyNs.nearestOpenNestRoom>;
}

Object.assign(DeepdiveScene.prototype, sonarNs);
export interface DeepdiveScene {
  sonarPing: OmitThisParameter<typeof sonarNs.sonarPing>;
  captureSonarContacts: OmitThisParameter<typeof sonarNs.captureSonarContacts>;
  revealSonarAtPlayer: OmitThisParameter<typeof sonarNs.revealSonarAtPlayer>;
  revealSonarAtWorld: OmitThisParameter<typeof sonarNs.revealSonarAtWorld>;
}
