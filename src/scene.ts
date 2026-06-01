import Phaser from 'phaser';
import type { AuxSub,Biome,Bobbit,CargoItem,ControlState,Fish,FishSpecies,Flare,FloatingText,Flora,FloraSpecies,Hazard,Larva,LooseItem,NestEgg,PlaytestCommand,Quest,ScanTarget,ShopItem,SonarContact,SpecialRoom,SubTier,SubVehicle,ThrownUtility,Tile,TileDef,UpgradeId,VeinRule } from './types';
import { audioKeys,audioVolumes,BARGE_DOCKING_HALF_WIDTH,BARGE_DOCKING_ZONE_Y,BARGE_DOCK_Y,BARGE_DRAW_SCALE,BARGE_ENTRY_HALF_WIDTH,BARGE_ENTRY_Y,BARGE_PLATFORM_HEIGHT,BARGE_PLATFORM_WIDTH,BIOLUME_CAVERN_CHANCE,BLEED_DURATION,BLEED_HULL_DRAIN,BLEED_RECENT_WINDOW,BLEED_TRIGGER_BITES,BOBBIT_DETECT_RADIUS,BOBBIT_ESCAPE_SECONDS,BOBBIT_LATCH_RADIUS,CAMERA_ZOOM_MULTIPLIER,deepScale,DYNAMITE_LAND_FUSE,DYNAMITE_LIFE_DAMAGE,DYNAMITE_RADIUS_TILES,EGG_CUTTER_FUEL_COST,EGG_DETECTION_RADIUS,EGG_HATCH_SECONDS,EGG_HP,ENTITY_SCALE,FIRST_AID_REPAIR,FISH_BITE_SFX_GAP_MS,FLARE_DURATION,FLARE_LIGHT_RADIUS,FUEL_REFILL_AMOUNT,FUEL_TANK_REFILL,INJECTOR_KNIFE_DAMAGE,INJECTOR_KNIFE_RANGE,LIFE_CUTTER_DAMAGE,LIFE_CUTTER_FUEL_COST,NEST_CHAMBER_CHANCE,NEST_CLEAR_REWARD,OASIS_OXYGEN_REFILL,OXYGEN_TANK_REFILL,PLAYER_COLLISION_RADIUS,PLAYER_CONTACT_RADIUS,PLAYER_DRAW_SCALE,PLAYER_FORWARD_REACH,PLAYER_PICKUP_RADIUS,SONAR_ATTRACT_RADIUS,SONAR_COOLDOWN,SONAR_FUEL_COST,SONAR_REVEAL_RADIUS_TILES,STUN_GRENADE_DURATION,STUN_GRENADE_RADIUS,SUB_BOARD_SECONDS,SUB_FUEL_CELL,SUB_FUEL_COST,SUB_OXYGEN_CELL,SUB_OXYGEN_COST,SURFACE_Y,TARGET_DEPTH,THROWN_ITEM_GRAVITY,THROWN_ITEM_MAX_FALL_SPEED,THROWN_ITEM_SPEED,TILE,VENOM_HULL_DRAIN,VENOM_TICK_SECONDS,WORLD_H,WORLD_W } from './constants';
import { biomeFish,biomeFlora,tiles,upgrades } from './content';
import { state,ui } from './state';
import { rng } from './rng';
import { activeQuest,ambientDarknessOpacity,animatedFrame,axis,bargeSolidAtWorld,bargeUpgradeCost,cargoCapacity,cargoIconForTile,cargoKindForTile,cargoSaleValue,checkOxygenWarnings,clampSelectedCargoIndex,clearBleed,clearVenom,createConsumableItem,createSubVehicle,currentApexSpecies,darknessAtDepth,darknessOpacity,depthColor,diverAnimation,diverDisplayWidth,diverFrame,diverOrigin,diverPose,fishAssetKey,fishFrameCount,fishMaxHp,fitImageHeight,fitImageWidth,floraAssetKey,floraMaxHp,fuelMax,fuelRefillCost,generateQuestBoard,generateTile,hash,hullMax,isArtifactTile,lightBeamHalfWidth,lightBeamLength,lightRadius,loadGeneratedAssets,mineCooldown,miningFuelCost,miningUpgradeBonus,oxygenDrain,oxygenMax,parallaxAlphas,parallaxPrefix,parallaxSpeeds,pointInRoom,predatorBiteCooldown,questProgressSource,rarityColor,rarityLabel,refillAtBoat,resetOxygenWarnings,restart,scaledDepthPx,scaledEntity,scannableRarity,scanReward,shopItem,sonarKey,sonarTileColor,subCollisionHalfExtents,subDef,subDirectionalReach,subMiningRange,subRepairCost,swimPose,swimTopSpeed,swimUpgradeBonus,tileTextureKey,updateFacingFromVelocity,upgradeCost,upgradeMax,veinRuleAt,veinRulesForBiome,venomousFish } from './helpers';
import { activateMenuButton,activeMenuButtons,advanceRadioDialogue,availableUpgrades,biomeName,canDiveFromBargeShortcut,clearControllerFocus,focusMenuButton,focusUiButton,menuButtonKey,nextMenuButton,openingRadioMessages,renderHud,roundMetric,toggleLogbook,unlockAchievement,updateFpsTracker } from './hud';
import * as combatNs from './scene-combat';
import * as renderingNs from './scene-rendering';
import * as worldgenNs from './scene-worldgen';
import * as audioNs from './scene-audio';

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

  startRun() {
    state.started = true;
    state.docked = true;
    state.atBoat = true;
    state.status = 'Barge lights are green. Choose Dive when you are ready to leave the deck.';
    state.radioMessages = openingRadioMessages();
    state.radioIndex = 0;
    state.radioOpen = true;
    resetOxygenWarnings();
    this.resetPlayerStart();
    this.revealSonarAtPlayer(8);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    renderHud();
  }

  diveFromBarge() {
    if (!state.started || !state.atBoat || state.lost || state.won) return;
    state.docked = false;
    state.atBoat = false;
    state.paused = false;
    state.cargoOpen = false;
    this.player.x = WORLD_W * TILE * 0.5;
    this.player.y = SURFACE_Y + 54;
    this.player.vx = 0;
    this.player.vy = 22;
    this.player.facing.set(0, 1);
    this.player.facingSign = 1;
    const sub = this.deploySelectedSub();
    state.status = sub
      ? `${subDef(sub.tier).name} released from the barge cradle. Hold F to disembark.`
      : 'Dive started. The barge winch releases you into the claim.';
    this.revealSonarAtPlayer(8);
    renderHud();
  }

  buySub(tier: SubTier) {
    if (!state.atBoat) return;
    const def = subDef(tier);
    if (state.subOwned[tier]) {
      state.selectedSubTier = tier;
      state.status = `${def.name} selected for the next dive.`;
      renderHud();
      return;
    }
    if (state.credits < def.cost) return;
    state.credits -= def.cost;
    state.subOwned[tier] = true;
    state.selectedSubTier = tier;
    state.activeSub = createSubVehicle(tier, WORLD_W * TILE * 0.5, BARGE_DOCK_Y);
    state.status = `${def.name} purchased and craned into the barge bay.`;
    this.syncSubToPlayer();
    renderHud();
  }

  buySubFuel() {
    const sub = state.activeSub;
    if (!state.atBoat || !sub) return;
    const max = subDef(sub.tier).fuel;
    const missing = max - sub.fuel;
    if (missing <= 0 || state.credits < SUB_FUEL_COST) return;
    const amount = Math.min(SUB_FUEL_CELL, missing);
    state.credits -= SUB_FUEL_COST;
    sub.fuel = Math.min(max, sub.fuel + amount);
    state.status = `Loaded ${Math.round(amount)} sub fuel.`;
    renderHud();
  }

  buySubOxygen() {
    const sub = state.activeSub;
    if (!state.atBoat || !sub) return;
    const max = subDef(sub.tier).oxygen;
    const missing = max - sub.oxygen;
    if (missing <= 0 || state.credits < SUB_OXYGEN_COST) return;
    const amount = Math.min(SUB_OXYGEN_CELL, missing);
    state.credits -= SUB_OXYGEN_COST;
    sub.oxygen = Math.min(max, sub.oxygen + amount);
    state.status = `Loaded ${Math.round(amount)} sub oxygen.`;
    renderHud();
  }

  repairSubHull() {
    const sub = state.activeSub;
    if (!state.atBoat || !sub) return;
    const missing = subDef(sub.tier).hull - sub.hull;
    const cost = subRepairCost();
    if (missing <= 0 || state.credits < cost) return;
    state.credits -= cost;
    sub.hull = subDef(sub.tier).hull;
    state.status = `${subDef(sub.tier).name} hull fully repaired.`;
    renderHud();
  }

  canUseSubHatch() {
    const sub = state.activeSub;
    if (!sub || state.docked || state.lost || state.won) return false;
    if (state.carrierSub && state.pilotingSub && sub.tier === 1) return this.canReturnScoutToCarrier(sub);
    if (state.pilotingSub) return true;
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, sub.x, sub.y) < scaledEntity(70);
  }

  activateSubHatch() {
    const sub = state.activeSub;
    if (!sub || !this.canUseSubHatch()) {
      state.status = state.carrierSub ? 'Bring the scout close to the Leviathan hatch.' : 'Move close to the sub hatch to enter.';
      renderHud();
      return;
    }
    sub.boardProgress = 0;
    if (this.canReturnScoutToCarrier(sub)) {
      this.completeScoutReturn(sub);
      return;
    }
    this.completeSubHatch(sub);
  }

  deployScoutFromCarrier() {
    const host = state.activeSub;
    if (!host || !state.pilotingSub || host.tier < 3 || state.carrierSub) return;
    const scout = createSubVehicle(1, host.x - host.facingSign * scaledEntity(68), host.y + scaledEntity(4));
    scout.facingSign = host.facingSign;
    scout.vx = host.vx * 0.4;
    scout.vy = host.vy * 0.4;
    state.carrierSub = host;
    state.activeSub = scout;
    state.pilotingSub = true;
    state.auxSubActive = true;
    this.syncSubToPlayer();
    state.status = 'Seeker deployed. Pilot it back to the Leviathan hatch and hold F to return.';
    renderHud();
  }

  deploySelectedSub() {
    if (!state.selectedSubTier || !state.subOwned[state.selectedSubTier]) {
      state.pilotingSub = false;
      return null;
    }
    const tier = state.selectedSubTier;
    const sub = state.activeSub?.tier === tier
      ? state.activeSub
      : createSubVehicle(tier, this.player.x, this.player.y);
    sub.x = this.player.x;
    sub.y = this.player.y;
    sub.vx = 0;
    sub.vy = this.player.vy;
    sub.facingSign = 1;
    sub.boardProgress = 0;
    state.activeSub = sub;
    state.carrierSub = null;
    state.pilotingSub = true;
    state.auxSubActive = false;
    this.syncSubToPlayer();
    return sub;
  }

  syncSubToPlayer() {
    const sub = state.activeSub;
    if (!sub) return;
    this.player.x = sub.x;
    this.player.y = sub.y;
    this.player.vx = sub.vx;
    this.player.vy = sub.vy;
    this.player.facingSign = sub.facingSign;
  }

  buyFuel(fullTank = false) {
    if (!state.atBoat) return;
    const missing = fuelMax() - state.fuel;
    if (missing <= 0 || state.credits < fuelRefillCost(fullTank)) return;
    const amount = fullTank ? missing : Math.min(FUEL_REFILL_AMOUNT, missing);
    state.credits -= fuelRefillCost(fullTank);
    state.fuel = Math.min(fuelMax(), state.fuel + amount);
    state.status = `Loaded ${Math.round(amount)} fuel into the cutter reserves.`;
    renderHud();
  }

  buyShopItem(id: ShopItem['id']) {
    if (!state.atBoat) return;
    const item = shopItem(id);
    if (state.credits < item.cost) return;
    if (item.kind === 'tool' && state.cargo.some((cargo) => cargo.id === id)) {
      state.status = `${item.name} is already loaded.`;
      renderHud();
      return;
    }
    if (state.cargo.length >= cargoCapacity()) {
      state.status = `Cargo grid is full. Drop or sell something before buying ${item.name}.`;
      renderHud();
      return;
    }
    state.credits -= item.cost;
    state.cargo.push(createConsumableItem(item));
    state.selectedCargoIndex = state.cargo.length - 1;
    state.status = `${item.name} loaded into cargo slot ${state.selectedCargoIndex + 1}.`;
    renderHud();
  }

  acceptQuest(id: string) {
    if (!state.atBoat) return;
    const quest = state.questBoard.find((entry) => entry.id === id);
    if (!quest || quest.claimed) return;
    const active = activeQuest();
    if (active && active.id !== quest.id && !active.claimed) {
      state.status = `Finish or claim ${active.title} before taking another contract.`;
      renderHud();
      return;
    }
    quest.accepted = true;
    quest.completed = false;
    quest.progress = 0;
    quest.startValue = questProgressSource(quest);
    state.activeQuestId = quest.id;
    state.status = quest.kind === 'nest'
      ? `${quest.client} issued a nest locator. The sonar will point toward the nearest predator nest while this contract is active.`
      : `${quest.title} accepted.`;
    renderHud();
    this.drawSonarMap();
  }

  claimQuest(id: string) {
    if (!state.atBoat) return;
    const quest = state.questBoard.find((entry) => entry.id === id);
    if (!quest || !quest.completed || quest.claimed) return;
    quest.claimed = true;
    state.credits += quest.reward;
    if (state.activeQuestId === quest.id) state.activeQuestId = '';
    state.status = `${quest.title} complete. ${quest.reward.toLocaleString()} credits transferred.`;
    renderHud();
    this.drawSonarMap();
  }

  playtestSnapshot() {
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
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        vx: Math.round(this.player.vx),
        vy: Math.round(this.player.vy),
      },
      world: this.playtestWorldSurvey(),
    };
  }

  playtestCommand(command: PlaytestCommand, value?: unknown) {
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
    } else if (command === 'setOxygen') {
      state.oxygen = Phaser.Math.Clamp(Number(value) || 0, 0, oxygenMax());
    } else if (command === 'setHull') {
      state.hull = Phaser.Math.Clamp(Number(value) || 0, 0, 100 + state.upgrades.suit * 25);
    }
    renderHud();
    return this.playtestSnapshot();
  }

  travelToNextBiome() {
    const cost = bargeUpgradeCost();
    if (!state.atBoat || state.biome >= 4 || state.credits < cost) return;
    state.credits -= cost;
    state.depth = 0;
    state.maxDepth = 0;
    state.oreSoldCredits = 0;
    state.cargo = [];
    state.selectedCargoIndex = 0;
    state.fuel = fuelMax();
    state.sonarRevealed.clear();
    resetOxygenWarnings();
    clearVenom();
    clearBleed();
    state.scannedSpecies.clear();
    state.atBoat = true;
    state.docked = true;
    state.paused = false;
    state.logbookOpen = false;
    state.cargoOpen = false;
    state.bargeTab = 'services';
    state.activeQuestId = '';
    state.carrierSub = null;
    const nextBiome = (state.biome + 1) as Biome;
    state.biome = nextBiome;
    state.status = `Barge retrofitted. Welcome to ${biomeName()}.`;
    rng.seed = Math.floor(Math.random() * 1_000_000);
    refillAtBoat();
    this.scene.restart();
    renderHud();
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

  updateSubPilot(delta: number, controls: ControlState) {
    const sub = state.activeSub;
    if (!sub) return;
    const def = subDef(sub.tier);
    const input = controls.move.clone();
    if (input.lengthSq() > 1) input.normalize();
    const hasInput = input.lengthSq() > 0;
    const thrust = def.speed * 5.2;
    sub.vx += input.x * thrust * delta;
    sub.vy += input.y * thrust * delta;
    const drag = hasInput ? 1.2 : 2.25;
    sub.vx *= Math.exp(-drag * delta);
    sub.vy *= Math.exp(-drag * delta);
    const speed = Math.hypot(sub.vx, sub.vy);
    if (speed > def.speed) {
      sub.vx = (sub.vx / speed) * def.speed;
      sub.vy = (sub.vy / speed) * def.speed;
    }
    if (hasInput) {
      sub.facingSign = input.x < -0.08 ? -1 : input.x > 0.08 ? 1 : sub.facingSign;
      this.player.facingSign = sub.facingSign;
      this.rotateFacingToward(input.angle(), delta, 4.6);
    }
    this.player.vx = sub.vx;
    this.player.vy = sub.vy;
    this.moveAxis('x', sub.vx * delta);
    this.moveAxis('y', sub.vy * delta);
    sub.x = this.player.x;
    sub.y = this.player.y;
    sub.vx = this.player.vx;
    sub.vy = this.player.vy;
    sub.facingSign = this.player.facingSign;
    sub.weaponCooldown = Math.max(0, sub.weaponCooldown - delta);
    this.player.mineCooldown = Math.max(0, this.player.mineCooldown - delta);
    this.player.scanCooldown = Math.max(0, this.player.scanCooldown - delta);
    this.player.sonarCooldown = Math.max(0, this.player.sonarCooldown - delta);
    sub.fuel = Math.max(0, sub.fuel - (hasInput ? 0.16 : 0.035) * delta);

    if (controls.scoutPressed && sub.tier >= 3) this.deployScoutFromCarrier();
    if (controls.sonarPressed) this.sonarPing();
    if (controls.useItemPressed) {
      if (!this.useSelectedItem() && sub.tier >= 3) this.fireSubWeapon();
    }
    if (controls.mineHeld) {
      this.mineFromSub(sub);
    }
    this.scanNearbyLife(delta, controls.scanHeld);
  }

  updateSubBoarding(delta: number, controls: ControlState) {
    const sub = state.activeSub;
    if (!sub || state.atBoat) {
      if (sub) sub.boardProgress = 0;
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, sub.x, sub.y);
    const canBoard = state.pilotingSub || distance < scaledEntity(62);
    if (controls.boardHeld && canBoard) {
      if (this.canReturnScoutToCarrier(sub)) {
        sub.boardProgress = Math.min(SUB_BOARD_SECONDS, sub.boardProgress + delta);
        state.status = `Docking scout: ${Math.ceil(SUB_BOARD_SECONDS - sub.boardProgress)}s.`;
        if (sub.boardProgress >= SUB_BOARD_SECONDS) this.completeScoutReturn(sub);
        return;
      }
      if (state.carrierSub && state.pilotingSub && sub.tier === 1) {
        state.status = 'Return to the Leviathan hatch to exit the scout.';
        sub.boardProgress = 0;
        return;
      }
      sub.boardProgress = Math.min(SUB_BOARD_SECONDS, sub.boardProgress + delta);
      state.status = `${state.pilotingSub ? 'Disembarking' : 'Boarding'} ${subDef(sub.tier).name}: ${Math.ceil(SUB_BOARD_SECONDS - sub.boardProgress)}s.`;
      if (sub.boardProgress >= SUB_BOARD_SECONDS) {
        this.completeSubHatch(sub);
      }
    } else {
      sub.boardProgress = Math.max(0, sub.boardProgress - delta * 1.8);
    }
  }

  canReturnScoutToCarrier(sub: SubVehicle) {
    const carrier = state.carrierSub;
    if (!carrier || !state.pilotingSub || sub.tier !== 1) return false;
    return Phaser.Math.Distance.Between(sub.x, sub.y, carrier.x, carrier.y) < scaledEntity(92);
  }

  completeScoutReturn(scout: SubVehicle) {
    const carrier = state.carrierSub;
    if (!carrier) return;
    carrier.vx = scout.vx * 0.12;
    carrier.vy = scout.vy * 0.12;
    carrier.facingSign = scout.facingSign;
    state.activeSub = carrier;
    state.carrierSub = null;
    state.pilotingSub = true;
    state.auxSubActive = false;
    this.syncSubToPlayer();
    state.status = 'Scout recovered. Back inside the Leviathan.';
    renderHud();
  }

  completeSubHatch(sub: SubVehicle) {
    state.pilotingSub = !state.pilotingSub;
    sub.boardProgress = 0;
    if (state.pilotingSub) {
      this.syncSubToPlayer();
      state.status = `Inside ${subDef(sub.tier).name}. Hold F or use Hatch to disembark.`;
    } else {
      this.player.x = sub.x - sub.facingSign * scaledEntity(34);
      this.player.y = sub.y + scaledEntity(4);
      this.player.vx = 0;
      this.player.vy = 0;
      state.status = `Exited ${subDef(sub.tier).name}. Hold F or use Hatch near the sub to re-enter.`;
    }
    renderHud();
  }

  updateAuxSub(delta: number) {
    const host = state.activeSub;
    if (!this.auxSub || !host || !state.auxSubActive || host.tier < 3 || state.docked || state.lost || state.carrierSub) {
      this.auxSub?.sprite?.setVisible(false);
      return;
    }
    const aux = this.auxSub;
    aux.phase += delta;
    const targetX = host.x - host.facingSign * scaledEntity(70);
    const targetY = host.y + Math.sin(aux.phase * 1.8) * scaledEntity(12);
    aux.vx += (targetX - aux.x) * delta * 2.2;
    aux.vy += (targetY - aux.y) * delta * 2.2;
    aux.vx *= Math.exp(-3.1 * delta);
    aux.vy *= Math.exp(-3.1 * delta);
    aux.x += aux.vx * delta;
    aux.y += aux.vy * delta;
    const target = this.nearestUnscannedLife(aux.x, aux.y, scaledEntity(82));
    if (target) {
      target.scan = Math.min(1, target.scan + delta * 0.32);
      target.scanning = true;
      if (target.scan >= 1 && !target.scanned) {
        target.scanned = true;
        target.scanPulse = 1;
        state.scannedSpecies.add(target.species);
        state.credits += Math.round(scanReward(target) * 0.45);
        this.spawnFloatingText(`Aux scanned ${target.species}`, 0x73fbd3);
      }
    }
  }

  nearestUnscannedLife(x: number, y: number, range: number): ScanTarget | null {
    let nearest: ScanTarget | null = null;
    let nearestDistance = range;
    for (const life of [...this.fish, ...this.flora]) {
      if (life.scanned) continue;
      const distance = Phaser.Math.Distance.Between(x, y, life.x, life.y);
      if (distance < nearestDistance) {
        nearest = life;
        nearestDistance = distance;
      }
    }
    return nearest;
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

  scanNearbyLife(delta: number, scanningHeld: boolean) {
    const range = 64 + state.upgrades.scanner * 18;
    const target = this.nearestLife(range);
    if (!scanningHeld || !target) {
      this.player.scanTarget = null;
      return;
    }

    this.player.scanTarget = target;
    target.scanning = true;
    target.scan += delta * (0.85 + state.upgrades.scanner * 0.28);
    if (target.kind === 'fish') {
      target.vx += (target.x - this.player.x) * delta * 0.22;
      target.vy += (target.y - this.player.y) * delta * 0.22;
    }
    if (target.scan < 1) return;

    target.scan = 0;
    target.scanPulse = 1;
    target.scanned = true;
    if (!state.scannedSpecies.has(target.species)) {
      state.scannedSpecies.add(target.species);
      const reward = scanReward(target);
      const rarity = scannableRarity(target);
      state.credits += reward;
      this.spawnFloatingText(`${target.species} scanned +${reward}c`, rarityColor(rarity));
      state.status = `Cataloged ${target.species} (${rarityLabel(rarity)}). Research paid ${reward} credits.`;
      const apexSpecies = currentApexSpecies();
      if (target.species === apexSpecies && state.depth >= TARGET_DEPTH) {
        if (state.biome === 4) {
          state.won = true;
          state.status = 'The ruin sentinel is cataloged. Humanity finally has proof of the drowned architects.';
        } else {
          state.status = `${biomeName()} is charted. The barge has a route deeper still.`;
        }
      }
      renderHud();
    }
  }

  updateFish(delta: number) {
    for (const fish of this.fish) {
      fish.phase += delta;
      fish.bumpCooldown = Math.max(0, fish.bumpCooldown - delta);
      fish.stunned = Math.max(0, fish.stunned - delta);
      fish.scanPulse = Math.max(0, fish.scanPulse - delta * 1.35);
      fish.hurtFlash = Math.max(0, fish.hurtFlash - delta * 4.2);
      if (fish.dead) {
        fish.sprite?.setVisible(false);
        continue;
      }
      if (!fish.scanned && !fish.scanning) {
        fish.scan = Math.max(0, fish.scan - delta * 0.9);
      }
      fish.scanning = false;
      if (fish.stunned > 0) {
        fish.aggro = 0;
        fish.vx *= Math.exp(-4.6 * delta);
        fish.vy *= Math.exp(-4.6 * delta);
      } else {
        this.steerFish(fish, delta);
      }
      fish.x += fish.vx * delta;
      fish.y += fish.vy * delta;
      updateFacingFromVelocity(fish);
      this.keepFishInWater(fish);
      if (fish.stunned > 0) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance < fish.radius + PLAYER_CONTACT_RADIUS && fish.bumpCooldown <= 0 && !this.isAtBoat()) {
        this.bumpFish(fish, distance);
      }
    }
  }

  updateFlora(delta: number) {
    for (const flora of this.flora) {
      flora.phase += delta;
      flora.scanPulse = Math.max(0, flora.scanPulse - delta * 1.35);
      flora.hurtFlash = Math.max(0, flora.hurtFlash - delta * 4.2);
      if (flora.dead) {
        flora.sprite?.setVisible(false);
        continue;
      }
      if (!flora.scanned && !flora.scanning) {
        flora.scan = Math.max(0, flora.scan - delta * 0.9);
      }
      flora.scanning = false;
      if (flora.hazardous && !this.isAtBoat()) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y);
        if (distance < flora.radius + PLAYER_CONTACT_RADIUS + 4) {
          this.applyHullDamage((flora.rare ? 7 : 3.5) * delta, `${flora.species} stings through the suit.`);
          this.player.vx += ((this.player.x - flora.x) / Math.max(1, distance)) * 24 * delta;
          this.player.vy += ((this.player.y - flora.y) / Math.max(1, distance)) * 24 * delta;
        }
      }
    }
  }

  updateSpecialRooms(delta: number) {
    const oasis = this.specialRooms.find((room) => room.kind === 'biolume' && pointInRoom(this.player.x, this.player.y, room, 0.92));
    if (!oasis || state.atBoat || state.lost || state.won) return;
    const sub = state.pilotingSub ? state.activeSub : null;
    if (sub) {
      const max = subDef(sub.tier).oxygen;
      sub.oxygen = Math.min(max, sub.oxygen + OASIS_OXYGEN_REFILL * 0.72 * delta);
    } else {
      state.oxygen = Math.min(oxygenMax(), state.oxygen + OASIS_OXYGEN_REFILL * delta);
    }
    resetOxygenWarnings();
    if (this.hudTimer > 45) {
      state.status = 'Oxygen oasis. Native bioluminescence is holding the dark back and refilling your reserves.';
    }
  }

  updateNestEggs(delta: number) {
    for (const egg of this.nestEggs) {
      if (egg.state === 'destroyed') {
        egg.sprite?.setVisible(false);
        continue;
      }
      egg.phase += delta;
      if (egg.state === 'dormant') {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, egg.x, egg.y);
        if (!state.atBoat && distance < EGG_DETECTION_RADIUS) {
          egg.state = 'hatching';
          egg.hatch = 0;
          state.status = 'Nest eggs are waking. Cut them fast or the larvae will swarm.';
          this.spawnFloatingText('Egg waking', 0xff4f64);
        }
      } else if (egg.state === 'hatching') {
        egg.hatch += delta;
        if (egg.hatch >= EGG_HATCH_SECONDS) this.hatchEgg(egg);
      }
    }
    this.checkNestRewards();
  }

  hatchEgg(egg: NestEgg) {
    if (egg.state === 'hatched' || egg.state === 'destroyed') return;
    egg.state = 'hatched';
    egg.hatch = EGG_HATCH_SECONDS;
    const count = Phaser.Math.Between(2, 3);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      this.larvae.push({
        roomId: egg.roomId,
        x: egg.x + Math.cos(angle) * scaledEntity(12),
        y: egg.y + Math.sin(angle) * scaledEntity(8),
        vx: Math.cos(angle) * scaledEntity(68),
        vy: Math.sin(angle) * scaledEntity(68),
        radius: scaledEntity(4.2),
        phase: Math.random() * Math.PI * 2,
        latched: false,
        latchCooldown: 0.65,
        latchSlot: i,
        life: 3.4,
        sprite: this.createEntitySprite(egg.x, egg.y, 'nest-larva-0').setDepth(2.45),
      });
    }
    state.status = `Egg hatched. ${count} larvae are in the water.`;
    this.spawnFloatingText(`Larvae x${count}`, 0xff4f64);
  }

  updateLarvae(delta: number, controls: ControlState) {
    const latchedCount = this.larvae.filter((larva) => larva.latched).length;
    this.larvae = this.larvae.filter((larva) => {
      larva.phase += delta;
      larva.latchCooldown = Math.max(0, larva.latchCooldown - delta);
      if (larva.latched) {
        if (state.atBoat) {
          this.failNestBounty(larva.roomId);
          larva.sprite?.setVisible(false);
          return false;
        }
        const slot = larva.latchSlot % 5;
        const angle = slot * 1.26 + larva.phase * 0.8;
        larva.x = this.player.x + Math.cos(angle) * scaledEntity(13);
        larva.y = this.player.y + Math.sin(angle) * scaledEntity(10);
        const struggle = controls.hasMove ? controls.move.length() : 0;
        larva.life -= delta * (0.34 + struggle * 1.85);
        this.applyHullDamage(0.08 * delta, 'Larvae are fouling the suit joints.');
        if (larva.life <= 0) {
          larva.latched = false;
          larva.latchCooldown = 2.8;
          larva.life = 3.4;
          const away = new Phaser.Math.Vector2(larva.x - this.player.x, larva.y - this.player.y).normalize();
          larva.vx = away.x * scaledEntity(115) + Phaser.Math.FloatBetween(-18, 18);
          larva.vy = away.y * scaledEntity(115) + Phaser.Math.FloatBetween(-18, 18);
          state.status = 'Larva shaken loose. Burn it before it latches again.';
          this.spawnFloatingText('Larva loose', 0xffd166);
        }
        return true;
      }
      const dx = this.player.x - larva.x;
      const dy = this.player.y - larva.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const chase = distance < scaledEntity(170) && larva.latchCooldown <= 0;
      if (chase && !state.atBoat) {
        larva.vx += (dx / distance) * scaledEntity(92) * delta;
        larva.vy += (dy / distance) * scaledEntity(92) * delta;
      }
      larva.vx *= Math.exp(-1.55 * delta);
      larva.vy *= Math.exp(-1.55 * delta);
      larva.x += larva.vx * delta;
      larva.y += larva.vy * delta;
      if (!state.atBoat && larva.latchCooldown <= 0 && latchedCount < 3 && distance < PLAYER_CONTACT_RADIUS + larva.radius) {
        larva.latched = true;
        larva.life = 2.8 + latchedCount * 0.45;
        state.status = `Larvae latched: ${latchedCount + 1}. Thrust is getting sluggish.`;
      }
      return true;
    });
    this.checkNestRewards();
  }

  failNestBounty(roomId: string) {
    const room = this.specialRooms.find((candidate) => candidate.id === roomId);
    if (!room || room.failed || room.rewardClaimed) return;
    room.failed = true;
    state.status = 'Nest swarm reached the barge. Corporate hazard bounty voided.';
  }

  checkNestRewards() {
    for (const room of this.specialRooms) {
      if (room.kind !== 'nest' || room.rewardClaimed || room.failed) continue;
      const eggs = this.nestEggs.filter((egg) => egg.roomId === room.id);
      if (!eggs.length) continue;
      const activeEggs = eggs.some((egg) => egg.state === 'dormant' || egg.state === 'hatching');
      const activeLarvae = this.larvae.some((larva) => larva.roomId === room.id);
      if (activeEggs || activeLarvae) continue;
      room.rewardClaimed = true;
      const reward = Math.round(NEST_CLEAR_REWARD * (state.biome >= 3 ? 1.35 : 1));
      state.credits += reward;
      state.status = `Nest cleared. Corporate hazard bounty paid ${reward.toLocaleString()} credits.`;
      this.spawnFloatingText(`Nest cleared +${reward}c`, 0xffd166);
      this.completeNestQuest(room);
      renderHud();
    }
  }

  updateLooseItems(delta: number) {
    let pickedUp = false;
    this.looseItems = this.looseItems.filter((item) => {
      if (item.utility) {
        return this.updateThrownUtility(item, delta);
      }
      item.x += item.vx * delta;
      item.y += item.vy * delta;
      item.vx *= 1 - Math.min(0.9, delta * 2.8);
      item.vy *= 1 - Math.min(0.9, delta * 2.8);
      if (Number.isFinite(item.life)) item.life -= delta;
      const subCanPickup = !state.pilotingSub || !state.activeSub || state.activeSub.tier === 1;
      if (subCanPickup && item.value > 0 && state.cargo.length < cargoCapacity()) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
        if (distance < Math.max(PLAYER_PICKUP_RADIUS, item.radius + PLAYER_COLLISION_RADIUS + 7)) {
          state.cargo.push({
            id: item.id,
            name: item.name,
            value: item.value,
            color: item.color,
            kind: item.kind,
            icon: item.icon,
          });
          state.selectedCargoIndex = state.cargo.length - 1;
          state.status = `Recovered loose ${item.name} worth ${item.value} credits.`;
          this.spawnFloatingText(`${item.name} +${item.value}c`, item.color);
          pickedUp = true;
          return false;
        }
      }
      return item.life > 0;
    });
    if (pickedUp) renderHud();
  }

  updateThrownUtility(item: LooseItem, delta: number) {
    if (Number.isFinite(item.life)) item.life -= delta;

    if (!item.landed) {
      item.vy = Math.min(THROWN_ITEM_MAX_FALL_SPEED, item.vy + THROWN_ITEM_GRAVITY * delta);
      item.vx *= Math.exp(-0.72 * delta);

      const nextX = item.x + item.vx * delta;
      if (this.thrownItemCollides(nextX, item.y, item.radius)) {
        item.vx *= -0.16;
      } else {
        item.x = nextX;
      }

      const nextY = item.y + item.vy * delta;
      if (this.thrownItemCollides(item.x, nextY, item.radius)) {
        if (item.vy >= 0) {
          item.y = this.thrownItemLandingY(item.x, item.y, nextY, item.radius);
          item.vy = 0;
          item.vx *= 0.18;
          item.landed = true;
          if (item.utility === 'flare') {
            this.deployFlare(item.x, item.y);
            return false;
          }
        } else {
          item.vy *= -0.12;
        }
      } else {
        item.y = nextY;
      }
    }

    if (item.utility === 'dynamite' && item.landed) {
      item.fuse = Math.max(0, (item.fuse ?? DYNAMITE_LAND_FUSE) - delta);
      item.radius = scaledEntity(4.6 + Math.sin(this.time.now * 0.035) * 0.7);
      if (item.fuse <= 0) {
        this.detonateDynamite(item.x, item.y);
        return false;
      }
    }

    if (item.life <= 0) {
      if (item.utility === 'dynamite') {
        this.detonateDynamite(item.x, item.y);
      }
      return false;
    }
    return true;
  }

  thrownItemCollides(x: number, y: number, radius: number) {
    const points: Array<[number, number]> = [
      [x, y + radius],
      [x - radius * 0.72, y + radius * 0.55],
      [x + radius * 0.72, y + radius * 0.55],
      [x - radius * 0.55, y],
      [x + radius * 0.55, y],
    ];
    return points.some(([px, py]) => bargeSolidAtWorld(px, py) || tiles[this.tileAtWorld(px, py)].solid);
  }

  thrownItemLandingY(x: number, previousY: number, nextY: number, radius: number) {
    const bottomY = nextY + radius;
    if (bargeSolidAtWorld(x, bottomY)) {
      const gridY = Math.floor(bottomY / TILE);
      return gridY * TILE - radius - 0.5;
    }
    const tileY = Math.floor(bottomY / TILE);
    if (tileY >= 0 && tileY < WORLD_H) {
      return tileY * TILE - radius - 0.5;
    }
    return Math.min(previousY, WORLD_H * TILE - radius - 0.5);
  }

  spawnFloatingText(message: string, color: number) {
    const label = this.add.text(
      this.player.x + Phaser.Math.FloatBetween(-7, 7),
      this.player.y - 21 + Phaser.Math.FloatBetween(-3, 3),
      message,
      {
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontStyle: 'bold',
        stroke: '#020509',
        fontSize: '9px',
        strokeThickness: 3,
      },
    );
    label.setOrigin(0.5);
    label.setDepth(10);
    label.setResolution(2);
    label.setScale(0.78);
    this.floatingTexts.push({
      label,
      age: 0,
      life: 1.15,
      vx: Phaser.Math.FloatBetween(-8, 8),
      vy: -32,
    });
    if (this.floatingTexts.length > 12) {
      this.floatingTexts.shift()?.label.destroy();
    }
  }

  updateFloatingTexts(delta: number) {
    this.floatingTexts = this.floatingTexts.filter((entry) => {
      entry.age += delta;
      entry.label.x += entry.vx * delta;
      entry.label.y += entry.vy * delta;
      entry.vy += 12 * delta;
      const t = Phaser.Math.Clamp(entry.age / entry.life, 0, 1);
      entry.label.setAlpha(1 - Phaser.Math.SmoothStep(t, 0.62, 1));
      entry.label.setScale(Phaser.Math.Linear(0.78, 1, Phaser.Math.Clamp(t / 0.22, 0, 1)));
      if (entry.age < entry.life) return true;
      entry.label.destroy();
      return false;
    });
  }

  updateSonarPings(delta: number) {
    const hadPings = this.sonarPings.length > 0;
    this.sonarPings = this.sonarPings.filter((ping) => {
      ping.age += delta;
      return ping.age < ping.life;
    });
    for (const contact of state.sonarContacts) {
      contact.age += delta;
    }
    if (hadPings) {
      this.drawSonarMap();
    }
    if (state.sonarContacts.some((contact) => contact.age > 14)) {
      state.sonarContacts = state.sonarContacts.filter((contact) => contact.age <= 14);
      this.drawSonarMap();
    }
  }

  updateFlares(delta: number) {
    this.flares = this.flares.filter((flare) => {
      flare.age += delta;
      return flare.age < flare.life;
    });
  }

  sonarPing() {
    if (this.player.sonarCooldown > 0 || state.lost || state.won || !state.started) return;
    const sub = state.pilotingSub ? state.activeSub : null;
    const fuelReserve = sub ? sub.fuel : state.fuel;
    if (fuelReserve < SONAR_FUEL_COST) {
      state.status = 'Not enough fuel for a sonar pulse.';
      renderHud();
      return;
    }
    if (sub) sub.fuel = Math.max(0, sub.fuel - SONAR_FUEL_COST);
    else state.fuel = Math.max(0, state.fuel - SONAR_FUEL_COST);
    this.player.sonarCooldown = SONAR_COOLDOWN;
    this.playSfx(audioKeys.sonar, audioVolumes.sonar);
    this.sonarPings.push({ x: this.player.x, y: this.player.y, age: 0, life: 0.9 });
    this.revealSonarAtPlayer(SONAR_REVEAL_RADIUS_TILES);
    this.captureSonarContacts();
    let attracted = 0;
    for (const fish of this.fish) {
      if (!fish.hostile) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance > SONAR_ATTRACT_RADIUS) continue;
      fish.aggro = Math.max(fish.aggro, 4.4);
      fish.homeX = Phaser.Math.Linear(fish.homeX, this.player.x, 0.12);
      fish.homeY = Phaser.Math.Linear(fish.homeY, this.player.y, 0.12);
      attracted += 1;
    }
    this.drawSonarMap();
    state.status = attracted > 0
      ? `Sonar ping mapped nearby stone and drew ${attracted} hostile signal${attracted === 1 ? '' : 's'} closer.`
      : 'Sonar ping mapped nearby stone. No hostile signals answered.';
    renderHud();
    this.drawSonarMap();
  }

  captureSonarContacts() {
    const contacts: SonarContact[] = [];
    const bargeX = WORLD_W * TILE * 0.5;
    const bargeY = BARGE_DOCK_Y;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, bargeX, bargeY) <= SONAR_REVEAL_RADIUS_TILES * TILE) {
      contacts.push({ x: bargeX, y: bargeY, kind: 'barge', hostile: false, age: 0 });
    }
    for (const fish of this.fish) {
      if (fish.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance > SONAR_ATTRACT_RADIUS) continue;
      contacts.push({ x: fish.x, y: fish.y, kind: 'fish', hostile: fish.hostile, age: 0 });
    }
    for (const flora of this.flora) {
      if (flora.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y);
      if (distance > SONAR_REVEAL_RADIUS_TILES * TILE) continue;
      contacts.push({ x: flora.x, y: flora.y, kind: 'flora', hostile: flora.hazardous, age: 0 });
    }
    state.sonarContacts = contacts.slice(-48);
  }

  revealSonarAtPlayer(radiusTiles: number) {
    this.revealSonarAtWorld(this.player.x, this.player.y, radiusTiles);
  }

  revealSonarAtWorld(worldX: number, worldY: number, radiusTiles: number) {
    const cx = Math.floor(worldX / TILE);
    const cy = Math.floor(worldY / TILE);
    for (let y = cy - radiusTiles; y <= cy + radiusTiles; y += 1) {
      for (let x = cx - radiusTiles; x <= cx + radiusTiles; x += 1) {
        if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 > radiusTiles ** 2) continue;
        state.sonarRevealed.add(sonarKey(x, y));
      }
    }
    this.drawSonarMap();
  }

  updateHazards(delta: number) {
    if (!this.hazards.length || this.isAtBoat()) return;
    for (const hazard of this.hazards) {
      hazard.phase += delta;
      const active = Math.sin(hazard.phase * 1.8) > -0.18;
      if (!active) continue;
      const plumeX = hazard.x;
      const plumeY = hazard.y - hazard.radius * 1.35;
      const plumeRadius = hazard.radius * 1.45;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, plumeX, plumeY);
      if (distance > plumeRadius) continue;
      const heatFactor = 1 - distance / plumeRadius;
      const mitigation = 1 - state.upgrades.thermal * 0.17;
      this.applyHullDamage(9.5 * hazard.heat * heatFactor * Math.max(0.25, mitigation) * delta, 'Thermal vent plume is cooking the suit.');
      const push = 35 * heatFactor * delta;
      this.player.vx += ((this.player.x - plumeX) / Math.max(1, distance)) * push;
      this.player.vy += ((this.player.y - plumeY) / Math.max(1, distance)) * push;
    }
  }

  updateBobbits(delta: number, controls: ControlState) {
    if (!this.bobbits.length) return;
    if (state.pilotingSub) return;
    const inputStrength = controls.move.length();
    let latchedBobbitActive = this.bobbits.some((bobbit) => bobbit.state === 'latched');
    for (const bobbit of this.bobbits) {
      bobbit.phase += delta;
      bobbit.cooldown = Math.max(0, bobbit.cooldown - delta);
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, bobbit.x, bobbit.y);

      if (bobbit.state === 'hidden') {
        if (!latchedBobbitActive && !this.isAtBoat() && bobbit.cooldown <= 0 && distance < BOBBIT_DETECT_RADIUS) {
          bobbit.state = 'emerging';
          bobbit.timer = 0.45;
          state.status = 'Something is moving under the sediment.';
        }
        continue;
      }

      if (bobbit.state === 'emerging') {
        if (latchedBobbitActive) {
          this.resetBobbit(bobbit, 4);
          continue;
        }
        bobbit.timer -= delta;
        if (distance > BOBBIT_DETECT_RADIUS * 1.35) {
          bobbit.state = 'hidden';
          bobbit.cooldown = 2.5;
          continue;
        }
        if (bobbit.timer <= 0) {
          bobbit.state = 'lunging';
          bobbit.timer = 0.55;
        }
        continue;
      }

      if (bobbit.state === 'lunging') {
        if (latchedBobbitActive) {
          this.resetBobbit(bobbit, 4);
          continue;
        }
        bobbit.timer -= delta;
        const angle = Phaser.Math.Angle.Between(bobbit.x, bobbit.y, this.player.x, this.player.y);
        bobbit.x += Math.cos(angle) * 120 * delta;
        bobbit.y += Math.sin(angle) * 120 * delta;
        if (distance < BOBBIT_LATCH_RADIUS) {
          bobbit.state = 'latched';
          bobbit.escapeRemaining = BOBBIT_ESCAPE_SECONDS;
          bobbit.facingSign = this.player.x < bobbit.x ? -1 : 1;
          bobbit.latchX = this.player.x;
          bobbit.latchY = this.player.y;
          this.player.x = bobbit.latchX;
          this.player.y = bobbit.latchY;
          this.player.vx = 0;
          this.player.vy = 0;
          latchedBobbitActive = true;
          this.spawnFloatingText('Bobbit latched', 0xff8a6b);
          state.status = 'Bobbitworm pinned you. Thrash the movement keys to shake it loose.';
          continue;
        }
        if (bobbit.timer <= 0) {
          this.resetBobbit(bobbit, 5.5);
        }
        continue;
      }

      if (bobbit.state === 'latched') {
        const struggle = inputStrength > 0.65 ? 1 : 0;
        bobbit.escapeRemaining -= delta * struggle;
        this.player.x = bobbit.latchX;
        this.player.y = bobbit.latchY;
        this.player.vx = 0;
        this.player.vy = 0;
        bobbit.x = bobbit.latchX - bobbit.facingSign * scaledEntity(10);
        bobbit.y = bobbit.latchY + scaledEntity(12);
        this.applyHullDamage((2.2 + state.biome * 0.42) * delta, 'Bobbitworm is chewing through the suit.');
        state.oxygen -= (4.8 + state.biome * 0.65) * delta;
        if (bobbit.escapeRemaining <= 0 || this.isAtBoat()) {
          this.spawnFloatingText('Shaken loose', 0x8ee7f4);
          this.resetBobbit(bobbit, 8);
        } else {
          state.status = struggle > 0
            ? `Bobbitworm pinning you. Keep thrashing: ${Math.ceil(bobbit.escapeRemaining)}s.`
            : `Bobbitworm pinning you. Move to wriggle free: ${Math.ceil(bobbit.escapeRemaining)}s.`;
        }
        continue;
      }

      if (bobbit.state === 'cooldown') {
        bobbit.timer -= delta;
        bobbit.x = Phaser.Math.Linear(bobbit.x, bobbit.homeX, Math.min(1, delta * 3));
        bobbit.y = Phaser.Math.Linear(bobbit.y, bobbit.homeY, Math.min(1, delta * 3));
        if (bobbit.timer <= 0) {
          bobbit.state = 'hidden';
          bobbit.cooldown = 1.5;
        }
      }
    }
  }

  resetBobbit(bobbit: Bobbit, cooldown: number) {
    bobbit.state = 'cooldown';
    bobbit.timer = cooldown;
    bobbit.cooldown = cooldown;
    bobbit.x = bobbit.homeX;
    bobbit.y = bobbit.homeY;
    bobbit.latchX = bobbit.homeX;
    bobbit.latchY = bobbit.homeY;
    bobbit.facingSign = 1;
    bobbit.escapeRemaining = BOBBIT_ESCAPE_SECONDS;
  }

  steerFish(fish: Fish, delta: number) {
    const toPlayerX = this.player.x - fish.x;
    const toPlayerY = this.player.y - fish.y;
    const playerDistance = Math.hypot(toPlayerX, toPlayerY);
    const homeDistance = Phaser.Math.Distance.Between(fish.x, fish.y, fish.homeX, fish.homeY);
    const detectionRange = (fish.pattern === 'circle' ? 245 : 205) + fish.radius * 3 + state.biome * 8;
    const leashRange = (fish.pattern === 'circle' ? 390 : 320) + fish.radius * 5;
    const chaseActive = fish.hostile && !this.isAtBoat() && playerDistance < detectionRange && homeDistance < leashRange;
    if (chaseActive) {
      fish.aggro = Math.max(fish.aggro, fish.pattern === 'circle' ? 2.6 : 2);
    } else {
      fish.aggro = Math.max(0, fish.aggro - delta);
    }

    let targetX = fish.homeX;
    let targetY = fish.homeY;

    if (fish.aggro > 0 && fish.hostile) {
      const lead = Phaser.Math.Clamp(playerDistance / 230, 0.12, 0.75);
      const flank = Math.sin(fish.phase * 5.2) * (fish.pattern === 'circle' ? 28 : 18);
      targetX = this.player.x + this.player.vx * lead - (toPlayerY / Math.max(1, playerDistance)) * flank;
      targetY = this.player.y + this.player.vy * lead + (toPlayerX / Math.max(1, playerDistance)) * flank;
    } else if (fish.pattern === 'school') {
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
      targetX += Math.sin(fish.phase * 0.9) * 130;
      targetY += Math.cos(fish.phase * 0.7) * 44;
    }

    if (!fish.hostile && playerDistance < 72) {
      targetX = fish.x - toPlayerX * 1.4;
      targetY = fish.y - toPlayerY * 1.4;
    }

    const dx = targetX - fish.x;
    const dy = targetY - fish.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const pursuit = fish.aggro > 0 && fish.hostile;
    const desiredSpeed = fish.speed * (pursuit ? (fish.pattern === 'circle' ? 1.42 : 1.58) : 1);
    const steering = pursuit ? 4.4 : 2.6;
    fish.vx += (dx / len) * desiredSpeed * delta * steering;
    fish.vy += (dy / len) * desiredSpeed * delta * steering;
    const speed = Math.hypot(fish.vx, fish.vy);
    const maxSpeed = fish.speed * (pursuit ? 2.05 : 1.45);
    if (speed > maxSpeed) {
      fish.vx = (fish.vx / speed) * maxSpeed;
      fish.vy = (fish.vy / speed) * maxSpeed;
    }
  }

  keepFishInWater(fish: Fish) {
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

  bumpFish(fish: Fish, distance: number) {
    const nx = distance > 0 ? (this.player.x - fish.x) / distance : 1;
    const ny = distance > 0 ? (this.player.y - fish.y) / distance : 0;
    const impact = Math.hypot(this.player.vx, this.player.vy);
    this.player.vx += nx * (fish.hostile ? 120 : 70);
    this.player.vy += ny * (fish.hostile ? 120 : 70);
    fish.vx -= nx * 140;
    fish.vy -= ny * 140;
    fish.bumpCooldown = fish.hostile ? predatorBiteCooldown(fish) : 0.42;
    fish.scan = Math.max(0, fish.scan - 0.25);
    if (fish.hostile) {
      const damage = Math.round(4 + fish.radius * 0.35 + state.biome * 1.4 + (fish.pattern === 'circle' ? 3 : 0));
      this.applyHullDamage(Math.max(2, damage + impact * 0.018 - state.upgrades.suit), `${fish.species} slammed your helmet.`);
      if (venomousFish(fish)) this.applyVenom(fish);
      this.registerPredatorBite(fish);
      this.playFishBite(damage);
    } else {
      state.status = `${fish.species} scattered from the collision.`;
    }
    renderHud();
  }

  applyVenom(fish: Fish) {
    if (state.venom.active) return;
    state.venom.active = true;
    state.venom.source = fish.species;
    state.venom.tick = 0;
    state.status = `${fish.species} venom entered the suit seals. Return to the barge to purge it.`;
    this.spawnFloatingText('Venom', 0xb9f27c);
  }

  registerPredatorBite(fish: Fish) {
    if (state.bleed.recentTimer <= 0) state.bleed.recentBites = 0;
    state.bleed.recentBites += 1;
    state.bleed.recentTimer = BLEED_RECENT_WINDOW;
    if (state.bleed.recentBites < BLEED_TRIGGER_BITES) return;
    state.bleed.active = true;
    state.bleed.source = fish.species;
    state.bleed.duration = BLEED_DURATION;
    state.bleed.stacks = Phaser.Math.Clamp(state.bleed.stacks + 1, 1, 3);
    state.bleed.recentBites = 0;
    state.status = `${fish.species} opened a suit bleed. Patch up or let it clot.`;
    this.spawnFloatingText('Bleeding', 0xff6f7f);
  }

  playFishBite(damage: number) {
    const now = this.time.now;
    if (now - this.lastFishBiteSfxAt < FISH_BITE_SFX_GAP_MS) return;
    this.lastFishBiteSfxAt = now;
    const key = damage <= 10
      ? 'audio-fish-bite-weak'
      : damage <= 14
        ? 'audio-fish-bite-strong'
        : 'audio-fish-bite-heavy';
    const volume = damage <= 10 ? 0.16 : damage <= 14 ? 0.2 : 0.24;
    this.playSfx(key, volume, {
      detune: Phaser.Math.Between(-35, 25),
    });
  }

  nearestLife(range: number): ScanTarget | null {
    let nearest: ScanTarget | null = null;
    let nearestDistance = range;
    for (const life of [...this.fish, ...this.flora]) {
      if (life.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, life.x, life.y);
      if (distance < nearestDistance) {
        nearest = life;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  updateQuestProgress() {
    const quest = activeQuest();
    if (!quest || quest.completed || quest.claimed) return;
    quest.progress = Phaser.Math.Clamp(questProgressSource(quest) - quest.startValue, 0, quest.target);
    if (quest.progress < quest.target || quest.kind === 'nest') {
      if (quest.kind === 'nest' && this.hasActiveNestLocator()) this.drawSonarMap();
      return;
    }
    this.completeQuest(quest, `${quest.title} complete. Return to the barge to collect ${quest.reward.toLocaleString()} credits.`);
  }

  completeQuest(quest: Quest, status: string) {
    if (quest.completed || quest.claimed) return;
    quest.completed = true;
    quest.progress = quest.target;
    state.status = status;
    this.spawnFloatingText('Quest complete', 0xffd166);
    renderHud();
    this.drawSonarMap();
  }

  completeNestQuest(room: SpecialRoom) {
    const quest = activeQuest();
    if (!quest || quest.kind !== 'nest' || quest.completed || quest.claimed) return;
    quest.progress = 1;
    this.completeQuest(quest, `Nest extermination confirmed near ${Math.round(room.y / 6)} m. Return to the barge for contract payout.`);
  }

  hasActiveNestLocator() {
    const quest = activeQuest();
    return Boolean(quest && quest.kind === 'nest' && quest.accepted && !quest.completed && !quest.claimed);
  }

  nearestOpenNestRoom() {
    let nearest: { room: SpecialRoom; distance: number } | null = null;
    for (const room of this.specialRooms) {
      if (room.kind !== 'nest' || room.rewardClaimed || room.failed) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, room.x, room.y);
      if (!nearest || distance < nearest.distance) nearest = { room, distance };
    }
    return nearest?.room ?? null;
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

  playtestWorldSurvey() {
    if (this.world.length < WORLD_H || !this.world[0]) {
      return {
        ready: false,
        width: WORLD_W,
        height: WORLD_H,
        bands: [],
        reachable: { cells: 0, waterCoverage: 0, deepestTileY: 0, deepestMeters: 0 },
        entities: { fish: 0, hostileFish: 0, flora: 0, hazardousFlora: 0, vents: 0, bobbits: 0, rooms: 0, eggs: 0, larvae: 0 },
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

  playtestReachableWater() {
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
