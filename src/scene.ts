import Phaser from 'phaser';
import type { AuxSub,Biome,Bobbit,CargoItem,ControlState,Fish,FishSpecies,Flare,FloatingText,Flora,FloraSpecies,Hazard,Larva,LooseItem,NestEgg,PlaytestCommand,Quest,ScanTarget,ShopItem,SonarContact,SpecialRoom,SubTier,SubVehicle,ThrownUtility,Tile,TileDef,UpgradeId,VeinRule } from './types';
import { audioKeys,audioVolumes,BARGE_DOCKING_HALF_WIDTH,BARGE_DOCKING_ZONE_Y,BARGE_DOCK_Y,BARGE_DRAW_SCALE,BARGE_ENTRY_HALF_WIDTH,BARGE_ENTRY_Y,BARGE_PLATFORM_HEIGHT,BARGE_PLATFORM_WIDTH,BIOLUME_CAVERN_CHANCE,BLEED_DURATION,BLEED_HULL_DRAIN,BLEED_RECENT_WINDOW,BLEED_TRIGGER_BITES,BOBBIT_DETECT_RADIUS,BOBBIT_ESCAPE_SECONDS,BOBBIT_LATCH_RADIUS,CAMERA_ZOOM_MULTIPLIER,deepScale,DYNAMITE_LAND_FUSE,DYNAMITE_LIFE_DAMAGE,DYNAMITE_RADIUS_TILES,EGG_CUTTER_FUEL_COST,EGG_DETECTION_RADIUS,EGG_HATCH_SECONDS,EGG_HP,ENTITY_SCALE,FIRST_AID_REPAIR,FISH_BITE_SFX_GAP_MS,FLARE_DURATION,FLARE_LIGHT_RADIUS,FUEL_REFILL_AMOUNT,FUEL_TANK_REFILL,INJECTOR_KNIFE_DAMAGE,INJECTOR_KNIFE_RANGE,LIFE_CUTTER_DAMAGE,LIFE_CUTTER_FUEL_COST,NEST_CHAMBER_CHANCE,NEST_CLEAR_REWARD,OASIS_OXYGEN_REFILL,OXYGEN_TANK_REFILL,PLAYER_COLLISION_RADIUS,PLAYER_CONTACT_RADIUS,PLAYER_DRAW_SCALE,PLAYER_FORWARD_REACH,PLAYER_PICKUP_RADIUS,SONAR_ATTRACT_RADIUS,SONAR_COOLDOWN,SONAR_FUEL_COST,SONAR_REVEAL_RADIUS_TILES,STUN_GRENADE_DURATION,STUN_GRENADE_RADIUS,SUB_BOARD_SECONDS,SUB_FUEL_CELL,SUB_FUEL_COST,SUB_OXYGEN_CELL,SUB_OXYGEN_COST,SURFACE_Y,TARGET_DEPTH,THROWN_ITEM_GRAVITY,THROWN_ITEM_MAX_FALL_SPEED,THROWN_ITEM_SPEED,TILE,VENOM_HULL_DRAIN,VENOM_TICK_SECONDS,WORLD_H,WORLD_W } from './constants';
import { biomeFish,biomeFlora,tiles,upgrades } from './content';
import { state,ui } from './state';
import { rng } from './rng';
import { activeQuest,ambientDarknessOpacity,animatedFrame,axis,bargeSolidAtWorld,bargeUpgradeCost,cargoCapacity,cargoIconForTile,cargoKindForTile,cargoSaleValue,checkOxygenWarnings,clampSelectedCargoIndex,clearBleed,clearVenom,createConsumableItem,createSubVehicle,currentApexSpecies,darknessAtDepth,darknessOpacity,depthColor,diverAnimation,diverDisplayWidth,diverFrame,diverOrigin,diverPose,fishAssetKey,fishFrameCount,fishMaxHp,fitImageHeight,fitImageWidth,floraAssetKey,floraMaxHp,fuelMax,fuelRefillCost,generateQuestBoard,generateTile,hash,hullMax,isArtifactTile,lightBeamHalfWidth,lightBeamLength,lightRadius,loadGeneratedAssets,mineCooldown,miningFuelCost,miningUpgradeBonus,oxygenDrain,oxygenMax,parallaxAlphas,parallaxPrefix,parallaxSpeeds,pointInRoom,predatorBiteCooldown,questProgressSource,rarityColor,rarityLabel,refillAtBoat,resetOxygenWarnings,restart,scaledDepthPx,scaledEntity,scannableRarity,scanReward,shopItem,sonarKey,sonarTileColor,subCollisionHalfExtents,subDef,subDirectionalReach,subMiningRange,subRepairCost,swimPose,swimTopSpeed,swimUpgradeBonus,tileTextureKey,updateFacingFromVelocity,upgradeCost,upgradeMax,veinRuleAt,veinRulesForBiome,venomousFish } from './helpers';
import { activateMenuButton,activeMenuButtons,advanceRadioDialogue,availableUpgrades,biomeName,canDiveFromBargeShortcut,clearControllerFocus,focusMenuButton,focusUiButton,menuButtonKey,nextMenuButton,openingRadioMessages,renderHud,roundMetric,toggleLogbook,unlockAchievement,updateFpsTracker } from './hud';

export class DeepdiveScene extends Phaser.Scene {
  private parallaxLayers: Phaser.GameObjects.TileSprite[] = [];
  private terrain!: Phaser.GameObjects.Graphics;
  private actors!: Phaser.GameObjects.Graphics;
  private darkness!: Phaser.GameObjects.Graphics;
  private lampGloom!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private bargeSprite!: Phaser.GameObjects.Image;
  private playerSprite!: Phaser.GameObjects.Image;
  private subSprite?: Phaser.GameObjects.Image;
  private cutterBeamSprite?: Phaser.GameObjects.Image;
  private auxSub?: AuxSub;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private world: Tile[][] = [];
  private damage: number[][] = [];
  private tileSprites: Phaser.GameObjects.Image[] = [];
  private fish: Fish[] = [];
  private flora: Flora[] = [];
  private hazards: Hazard[] = [];
  private bobbits: Bobbit[] = [];
  private specialRooms: SpecialRoom[] = [];
  private nestEggs: NestEgg[] = [];
  private larvae: Larva[] = [];
  private looseItems: LooseItem[] = [];
  private floatingTexts: FloatingText[] = [];
  private flares: Flare[] = [];
  private sonarPings: Array<{ x: number; y: number; age: number; life: number }> = [];
  private menuLoop?: Phaser.Sound.BaseSound;
  private ambientLoop?: Phaser.Sound.BaseSound;
  private miningLoop?: Phaser.Sound.BaseSound;
  private oxygenLoop?: Phaser.Sound.BaseSound;
  private creatureCallTimer = 0;
  private drillingThisFrame = false;
  private lastFishBiteSfxAt = -Infinity;
  private terrainBoundsKey = '';
  private terrainDirty = true;
  private gamepadButtonsDown = new Set<number>();
  private menuNavCooldown = 0;
  private player = {
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
  private hudTimer = 0;

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

  private deploySelectedSub() {
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

  private syncSubToPlayer() {
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

  private updateCameraZoom() {
    const baseZoom = this.scale.width < 700 ? 1.35 : 1.85;
    const zoom = baseZoom * CAMERA_ZOOM_MULTIPLIER;
    if (Math.abs(this.cameras.main.zoom - zoom) > 0.01) {
      this.cameras.main.setZoom(zoom);
      this.terrainDirty = true;
    }
  }

  private resetPlayerStart() {
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

  private createEntitySprite(x: number, y: number, key: string) {
    return this.add.image(x, y, key)
      .setDepth(2)
      .setOrigin(0.5)
      .setVisible(false);
  }

  private tileSpriteAt(index: number, textureKey: string) {
    const cached = this.tileSprites[index];
    const tileSprite = cached?.scene ? cached : this.add.image(0, 0, textureKey)
      .setDepth(0.6)
      .setOrigin(0)
      .setDisplaySize(TILE, TILE);
    this.tileSprites[index] = tileSprite;
    return tileSprite;
  }

  private generateWorld() {
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

  private makeVentFields(): Hazard[] {
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

  private injectSpecialRooms(center: number) {
    const bioCenter = this.pickBiolumeCavernCenter(center);
    this.injectBiolumeCavern(bioCenter.x, bioCenter.y);

    const nestCenter = this.pickNestDeadEnd();
    this.injectPredatorNest(nestCenter.x, nestCenter.y);
  }

  private pickBiolumeCavernCenter(center: number) {
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

  private pickNestDeadEnd() {
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

  private denseSolidRatio(cx: number, cy: number, rx: number, ry: number) {
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

  private cardinalWaterNeighbors(x: number, y: number) {
    return [
      this.getTile(x + 1, y),
      this.getTile(x - 1, y),
      this.getTile(x, y + 1),
      this.getTile(x, y - 1),
    ].filter((tile) => tile === 'water').length;
  }

  private injectBiolumeCavern(cx: number, cy: number) {
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

  private injectPredatorNest(cx: number, cy: number) {
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

  private cellularRoomMask(cx: number, cy: number, rx: number, ry: number, fillThreshold: number, iterations: number) {
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

  private openRoomMouths(cx: number, cy: number, rx: number, ry: number, radius: number) {
    this.carveDisc(cx - rx, cy, radius);
    this.carveDisc(cx + rx, cy + Math.floor(Math.sin(rng.seed) * 3), radius);
    this.carveDisc(cx, cy - ry, Math.max(1, radius - 1));
    this.carveDisc(cx, cy + ry, Math.max(1, radius - 1));
  }

  private connectRoomToNearestWater(cx: number, cy: number, rx: number, ry: number) {
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

  private seedBiolumeResources(cx: number, cy: number, rx: number, ry: number) {
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

  private populateOreVeins() {
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

  private growOreVein(startX: number, startY: number, rule: VeinRule) {
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

  private canHostOre(x: number, y: number) {
    const tile = this.getTile(x, y);
    return tile === 'stone' || tile === 'sand';
  }

  private makeBobbits(): Bobbit[] {
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

  private makeSchool(species: FishSpecies): Fish[] {
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

  private makeFloraPatch(species: FloraSpecies): Flora[] {
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

  private populateSpecialRooms() {
    for (const room of this.specialRooms) {
      if (room.kind === 'biolume') this.populateBiolumeRoom(room);
      if (room.kind === 'nest') this.populateNestRoom(room);
    }
  }

  private populateBiolumeRoom(room: SpecialRoom) {
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

  private populateNestRoom(room: SpecialRoom) {
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

  private findRoomFloorAnchor(room: SpecialRoom, salt: number) {
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

  private findFloraAnchorInBand(minY: number, maxY: number) {
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

  private findRockTopAnchorInBand(minY: number, maxY: number) {
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

  private carveDeepTunnelNetwork(center: number) {
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

  private carveTunnelBand(startY: number, endY: number, laneCount: number, tunnelRadius: number, center: number, salt: number) {
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

  private carveDarkBasin(center: number, cy: number, rx: number, ry: number) {
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

  private carveRuinVaults(center: number, basinY: number) {
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

  private pickLanePoint(points: Array<{ x: number; y: number }>, salt: number) {
    if (!points.length) return { x: Math.floor(WORLD_W / 2), y: Math.floor(WORLD_H / 2) };
    return points[Math.floor(hash(salt, points.length, rng.seed) * points.length)];
  }

  private nearestLanePoint(points: Array<{ x: number; y: number }>, targetX: number) {
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

  private carveAnchorstoneStrata() {
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

  private carveWindingTunnel(x0: number, y0: number, x1: number, y1: number, radius = state.biome === 2 ? 2 : 1) {
    const steps = Math.max(8, Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = Math.floor(Phaser.Math.Linear(x0, x1, t) + Math.sin(t * Math.PI * 4 + rng.seed) * 4);
      const y = Math.floor(Phaser.Math.Linear(y0, y1, t));
      this.carveDisc(x, y, radius);
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

  private readControls(): ControlState {
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

  private updateMenuNavigation(delta: number, controls: ControlState) {
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

  private updateDockedAtBarge(delta: number, controls: ControlState) {
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

  private updatePlayer(delta: number, controls: ControlState) {
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

  private updateSubPilot(delta: number, controls: ControlState) {
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

  private updateSubBoarding(delta: number, controls: ControlState) {
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

  private canReturnScoutToCarrier(sub: SubVehicle) {
    const carrier = state.carrierSub;
    if (!carrier || !state.pilotingSub || sub.tier !== 1) return false;
    return Phaser.Math.Distance.Between(sub.x, sub.y, carrier.x, carrier.y) < scaledEntity(92);
  }

  private completeScoutReturn(scout: SubVehicle) {
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

  private completeSubHatch(sub: SubVehicle) {
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

  private updateAuxSub(delta: number) {
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

  private nearestUnscannedLife(x: number, y: number, range: number): ScanTarget | null {
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

  private fireSubWeapon() {
    const sub = state.activeSub;
    if (!sub || sub.tier < 3 || sub.weaponCooldown > 0 || sub.fuel < 4) return;
    sub.weaponCooldown = 1.2;
    sub.fuel = Math.max(0, sub.fuel - 4);
    let hits = 0;
    for (const fish of this.fish) {
      if (fish.dead) continue;
      if (!fish.hostile) continue;
      const distance = Phaser.Math.Distance.Between(sub.x, sub.y, fish.x, fish.y);
      if (distance > scaledEntity(230)) continue;
      const facing = sub.facingSign;
      if ((fish.x - sub.x) * facing < -scaledEntity(20)) continue;
      hits += 1;
      fish.stunned = Math.max(fish.stunned, 4.2);
      fish.aggro = 0;
      fish.vx += facing * scaledEntity(180);
      fish.vy += Phaser.Math.FloatBetween(-80, 80);
    }
    this.actors.lineStyle(3, 0x8ee7f4, 0.85);
    this.actors.lineBetween(sub.x, sub.y, sub.x + sub.facingSign * scaledEntity(230), sub.y);
    this.spawnFloatingText(hits ? `Harpoon stun x${hits}` : 'Harpoon fired', 0x8ee7f4);
  }

  private updatePlayerFacing(horizontalIntent: number) {
    if (horizontalIntent < -0.08) this.player.facingSign = -1;
    if (horizontalIntent > 0.08) this.player.facingSign = 1;
  }

  private latchedBobbit() {
    return this.bobbits.find((bobbit) => bobbit.state === 'latched');
  }

  private updateAudio(delta: number) {
    if (!this.sound) return;
    if (!state.started) {
      if (state.musicEnabled && state.musicVolume > 0) this.ensureLoop('menu');
      else this.stopLoop('menu');
      this.stopLoop('ambient');
      this.stopLoop('mining');
      this.stopLoop('oxygen');
      return;
    }

    this.stopLoop('menu');
    if (state.musicEnabled && state.musicVolume > 0) this.ensureLoop('ambient');
    else this.stopLoop('ambient');

    if (state.lost || state.won || state.paused) {
      this.stopLoop('mining');
      this.stopLoop('oxygen');
      return;
    }

    if (this.drillingThisFrame && state.sfxVolume > 0) this.ensureLoop('mining');
    else this.stopLoop('mining');

    const oxygenCritical = state.oxygen > 0 && state.oxygen / oxygenMax() <= 0.05;
    if (oxygenCritical && state.sfxVolume > 0) this.ensureLoop('oxygen');
    else this.stopLoop('oxygen');

    this.creatureCallTimer -= delta;
    if (this.creatureCallTimer <= 0) {
      this.playDepthCall();
      this.creatureCallTimer = Phaser.Math.Between(120, 240);
    }
  }

  private ensureLoop(kind: 'menu' | 'ambient' | 'mining' | 'oxygen') {
    const key = audioKeys[kind];
    const current = this[`${kind}Loop` as const];
    const volume = this.loopVolume(kind);
    if (current) {
      if (!current.isPlaying) current.play({ loop: true, volume });
      this.setLoopVolume(current, volume);
      return;
    }
    this.sound.stopByKey(key);
    const sound = this.sound.add(key);
    sound.play({ loop: true, volume });
    this[`${kind}Loop` as const] = sound;
  }

  private loopVolume(kind: 'menu' | 'ambient' | 'mining' | 'oxygen') {
    if (kind === 'menu') return state.musicEnabled ? audioVolumes.menuTitle * state.musicVolume : 0;
    if (kind === 'ambient') return state.musicEnabled ? audioVolumes.ambient * state.musicVolume : 0;
    if (kind === 'mining' || kind === 'oxygen') return audioVolumes[kind] * state.sfxVolume;
    return audioVolumes[kind];
  }

  private setLoopVolume(sound: Phaser.Sound.BaseSound, volume: number) {
    const adjustable = sound as Phaser.Sound.BaseSound & {
      setVolume?: (value: number) => Phaser.Sound.BaseSound;
      volume?: number;
    };
    if (adjustable.setVolume) adjustable.setVolume(volume);
    else adjustable.volume = volume;
  }

  private stopLoop(kind: 'menu' | 'ambient' | 'mining' | 'oxygen') {
    const loopKey = `${kind}Loop` as const;
    const sound = this[loopKey];
    if (sound?.isPlaying) sound.stop();
    this[loopKey] = undefined;
  }

  private playDepthCall() {
    if (state.atBoat || state.lost || state.won || state.paused) return;
    let key = 'audio-whale';
    if (state.biome >= 4 || state.depth >= 1450) key = 'audio-alien-growl';
    else if (state.biome >= 2 || state.depth >= 650) key = 'audio-crab-growl';
    this.playSfx(key, 0.58);
    if (Math.random() < 0.42) {
      this.playSfx(Math.random() < 0.5 ? 'audio-water' : 'audio-cavern', 0.18);
    }
  }

  private playSfx(key: string, volume: number, config: Phaser.Types.Sound.SoundConfig = {}) {
    if (state.sfxVolume <= 0) return;
    this.sound.play(key, {
      ...config,
      volume: volume * state.sfxVolume,
    });
  }

  private rotateFacingToward(targetAngle: number, delta: number, turnRate: number) {
    const nextAngle = Phaser.Math.Angle.RotateTo(this.player.facing.angle(), targetAngle, turnRate * delta);
    this.player.facing.set(Math.cos(nextAngle), Math.sin(nextAngle));
  }

  private moveAxis(axisName: 'x' | 'y', amount: number) {
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

  private applyHullDamage(amount: number, status?: string) {
    if (amount <= 0) return;
    const sub = state.pilotingSub ? state.activeSub : null;
    if (sub) {
      sub.hull -= amount;
      if (status) state.status = status.replace('Hull', `${subDef(sub.tier).name}`);
      if (sub.hull <= 0) this.destroyActiveSub();
      return;
    }
    state.hull -= amount;
    if (status) state.status = status;
  }

  private destroyActiveSub() {
    const sub = state.activeSub;
    if (!sub) return;
    const def = subDef(sub.tier);
    const wasScout = Boolean(state.carrierSub && sub.tier === 1);
    if (!wasScout) {
      state.subOwned[sub.tier] = false;
      if (state.selectedSubTier === sub.tier) state.selectedSubTier = null;
    }
    state.activeSub = wasScout ? state.carrierSub : null;
    if (wasScout) state.carrierSub = null;
    state.pilotingSub = false;
    state.auxSubActive = false;
    if (wasScout) {
      state.status = 'Auxiliary Seeker hull failed. The Leviathan is still waiting nearby.';
    }
    this.player.x = sub.x;
    this.player.y = sub.y;
    this.player.vx = sub.vx * 0.2;
    this.player.vy = sub.vy * 0.2;
    this.subSprite?.setVisible(false);
    this.auxSub?.sprite?.setVisible(false);
    this.spawnFloatingText(`${def.name} lost`, 0xff6f7f);
    if (!wasScout) state.status = `${def.name} hull failed. Emergency hatch blew and the sub is gone.`;
    renderHud();
  }

  private collides(x: number, y: number): boolean {
    const points = this.collisionSamplePoints(x, y);
    return points.some(([px, py]) => bargeSolidAtWorld(px, py) || tiles[this.tileAtWorld(px, py)].solid);
  }

  private collisionSamplePoints(x: number, y: number) {
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

  private mineFromSub(sub: SubVehicle) {
    if (sub.tier < 2) {
      this.mineAt(this.player.x, this.player.y);
      return;
    }
    const dir = this.player.facing.clone();
    if (dir.lengthSq() <= 0.001) dir.set(sub.facingSign, 0);
    dir.normalize();
    const target = this.findSubMiningTarget(sub, dir);
    const reach = subMiningRange(sub);
    const fallbackX = this.player.x + dir.x * reach;
    const fallbackY = this.player.y + dir.y * reach;
    this.mineAt(target ? target.x * TILE + TILE * 0.5 : fallbackX, target ? target.y * TILE + TILE * 0.5 : fallbackY);
  }

  private findSubMiningTarget(sub: SubVehicle, dir: Phaser.Math.Vector2) {
    const { halfW, halfH } = subCollisionHalfExtents(sub);
    const noseReach = subDirectionalReach(sub, dir);
    const lateral = new Phaser.Math.Vector2(-dir.y, dir.x);
    const beamHalfWidth = Math.max(scaledEntity(8), Math.min(halfW, halfH) * 0.36);
    const maxDistance = noseReach + 48 + miningUpgradeBonus() * 5;
    const seen = new Set<string>();
    let nearest: { x: number; y: number; distance: number } | null = null;
    for (let distance = Math.max(0, noseReach - TILE * 0.45); distance <= maxDistance; distance += TILE * 0.24) {
      for (const side of [-1, 0, 1]) {
        const px = this.player.x + dir.x * distance + lateral.x * beamHalfWidth * side;
        const py = this.player.y + dir.y * distance + lateral.y * beamHalfWidth * side;
        const x = Math.floor(px / TILE);
        const y = Math.floor(py / TILE);
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const tile = this.getTile(x, y);
        if (!tiles[tile].solid || tile === 'bedrock' || tile === 'anchorstone') continue;
        const candidate = { x, y, distance };
        if (!nearest || candidate.distance < nearest.distance) nearest = candidate;
      }
      if (nearest) return nearest;
    }
    return nearest;
  }

  private mineAt(worldX: number, worldY: number) {
    const sub = state.pilotingSub ? state.activeSub : null;
    if (sub && sub.tier < 2) {
      state.status = `${subDef(sub.tier).name} carries scanners only. Buy a Marlin or Leviathan to mine from a sub.`;
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, worldX, worldY);
    const range = sub ? subMiningRange(sub) : 40 + miningUpgradeBonus() * 6;
    if (distance > range) return;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldX, worldY);
    this.player.facing.set(Math.cos(angle), Math.sin(angle));
    this.updatePlayerFacing(Math.cos(angle));
    if (this.cutNestTarget(worldX, worldY, sub)) return;
    if (this.cutLifeTarget(worldX, worldY, sub)) return;
    const tx = Math.floor(worldX / TILE);
    const ty = Math.floor(worldY / TILE);
    const targets = this.mineTargets(tx, ty);
    if (!targets.length) return;
    const fuelReserve = sub ? sub.fuel : state.fuel;
    if (fuelReserve > 0) this.drillingThisFrame = true;
    if (this.player.mineCooldown > 0) return;
    const fuelCost = miningFuelCost(targets.length);
    if (fuelReserve < fuelCost) {
      this.player.mineCooldown = Math.max(0.16, mineCooldown() * 0.65);
      state.status = sub ? 'Sub fuel reserves are dry. Return to the barge to refuel.' : 'Fuel reserves are dry. Return to the barge to refuel the cutter.';
      renderHud();
      return;
    }

    const power = 8.8 + miningUpgradeBonus() * 2.35;
    if (sub) sub.fuel = Math.max(0, sub.fuel - fuelCost);
    else state.fuel = Math.max(0, state.fuel - fuelCost);
    for (const target of targets) {
      const tile = this.getTile(target.x, target.y);
      const def = tiles[tile];
      if (!def.solid || tile === 'bedrock' || tile === 'anchorstone') continue;
      this.damage[target.y][target.x] += power;
      if (this.damage[target.y][target.x] >= def.hp) {
        this.breakTile(target.x, target.y, tile, def);
      }
    }
    this.terrainDirty = true;
    this.player.mineCooldown = mineCooldown();
    if (sub) sub.oxygen = Math.max(0, sub.oxygen - (0.08 + targets.length * 0.02));
    else state.oxygen -= 0.11 + targets.length * 0.035;
    renderHud();
  }

  private cutNestTarget(worldX: number, worldY: number, sub: SubVehicle | null) {
    const target = this.nearestNestCutTarget(worldX, worldY);
    if (!target) return false;
    const fuelReserve = sub ? sub.fuel : state.fuel;
    if (fuelReserve > 0) this.drillingThisFrame = true;
    if (this.player.mineCooldown > 0) return true;
    if (fuelReserve < EGG_CUTTER_FUEL_COST) {
      this.player.mineCooldown = Math.max(0.14, mineCooldown() * 0.55);
      state.status = 'Not enough fuel to cut nest matter. Back out or switch supplies fast.';
      renderHud();
      return true;
    }
    if (sub) sub.fuel = Math.max(0, sub.fuel - EGG_CUTTER_FUEL_COST);
    else state.fuel = Math.max(0, state.fuel - EGG_CUTTER_FUEL_COST);
    this.player.mineCooldown = mineCooldown() * 0.72;

    if ('hp' in target) {
      target.hp -= 8.5 + miningUpgradeBonus() * 1.4;
      target.state = target.state === 'dormant' ? 'hatching' : target.state;
      target.hatch = Math.min(target.hatch, EGG_HATCH_SECONDS * 0.72);
      if (target.hp <= 0) {
        target.state = 'destroyed';
        target.sprite?.setVisible(false);
        this.spawnFloatingText('Egg destroyed', 0xffd166);
        state.status = 'Nest egg destroyed before the swarm could break free.';
      } else {
        state.status = 'Nest egg shell is cracking under the cutter.';
      }
    } else {
      this.larvae = this.larvae.filter((larva) => larva !== target);
      target.sprite?.setVisible(false);
      this.spawnFloatingText('Larva killed', 0xffd166);
      state.status = 'Larva burned off the suit.';
    }
    this.checkNestRewards();
    renderHud();
    return true;
  }

  private cutLifeTarget(worldX: number, worldY: number, sub: SubVehicle | null) {
    const target = this.nearestLifeDamageTarget(worldX, worldY, scaledEntity(20));
    if (!target) return false;
    const fuelReserve = sub ? sub.fuel : state.fuel;
    if (fuelReserve > 0) this.drillingThisFrame = true;
    if (this.player.mineCooldown > 0) return true;
    if (fuelReserve < LIFE_CUTTER_FUEL_COST) {
      this.player.mineCooldown = Math.max(0.14, mineCooldown() * 0.55);
      state.status = 'Not enough fuel to keep the cutter hot.';
      renderHud();
      return true;
    }
    if (sub) sub.fuel = Math.max(0, sub.fuel - LIFE_CUTTER_FUEL_COST);
    else state.fuel = Math.max(0, state.fuel - LIFE_CUTTER_FUEL_COST);
    this.player.mineCooldown = mineCooldown() * 0.58;
    this.damageLifeTarget(target, LIFE_CUTTER_DAMAGE + miningUpgradeBonus() * 2.8, 'Cutter');
    renderHud();
    return true;
  }

  private nearestLifeDamageTarget(worldX: number, worldY: number, extraRange: number): ScanTarget | null {
    let nearest: { target: ScanTarget; distance: number } | null = null;
    for (const fish of this.fish) {
      if (fish.dead) continue;
      const distance = Phaser.Math.Distance.Between(worldX, worldY, fish.x, fish.y);
      if (distance > fish.radius + extraRange) continue;
      if (!nearest || distance < nearest.distance) nearest = { target: fish, distance };
    }
    for (const flora of this.flora) {
      if (flora.dead) continue;
      const distance = Phaser.Math.Distance.Between(worldX, worldY, flora.x, flora.y);
      if (distance > flora.radius + extraRange) continue;
      if (!nearest || distance < nearest.distance) nearest = { target: flora, distance };
    }
    return nearest?.target ?? null;
  }

  private damageLifeTarget(target: ScanTarget, amount: number, source: string) {
    if (target.dead || amount <= 0) return false;
    target.hp = Math.max(0, target.hp - amount);
    target.hurtFlash = 1;
    if (target.kind === 'fish') {
      target.aggro = target.hostile ? Math.max(target.aggro, 3.2) : target.aggro;
      target.vx += Phaser.Math.FloatBetween(-18, 18);
      target.vy += Phaser.Math.FloatBetween(-18, 18);
    }
    if (target.hp > 0) {
      state.status = `${source} hit ${target.species}.`;
      return true;
    }
    target.dead = true;
    target.scanning = false;
    target.scan = 0;
    target.sprite?.setVisible(false);
    state.status = `${target.species} killed by ${source.toLowerCase()}.`;
    this.spawnFloatingText(`${target.species} killed`, 0xffd166);
    return true;
  }

  private damageLifeInRadius(centerX: number, centerY: number, radius: number, amount: number, source: string) {
    let hits = 0;
    for (const target of [...this.fish, ...this.flora]) {
      if (target.dead) continue;
      const distance = Phaser.Math.Distance.Between(centerX, centerY, target.x, target.y);
      if (distance > radius + target.radius) continue;
      const falloff = Phaser.Math.Clamp(1 - distance / Math.max(1, radius + target.radius), 0.28, 1);
      this.damageLifeTarget(target, amount * falloff, source);
      hits += 1;
    }
    return hits;
  }

  private nearestNestCutTarget(worldX: number, worldY: number): NestEgg | Larva | null {
    let nearest: { target: NestEgg | Larva; distance: number } | null = null;
    for (const egg of this.nestEggs) {
      if (egg.state === 'destroyed' || egg.state === 'hatched') continue;
      const distance = Phaser.Math.Distance.Between(worldX, worldY, egg.x, egg.y);
      if (distance > egg.radius + scaledEntity(18)) continue;
      if (!nearest || distance < nearest.distance) nearest = { target: egg, distance };
    }
    for (const larva of this.larvae) {
      const distance = Phaser.Math.Distance.Between(worldX, worldY, larva.x, larva.y);
      if (distance > larva.radius + scaledEntity(18)) continue;
      if (!nearest || distance < nearest.distance) nearest = { target: larva, distance };
    }
    return nearest?.target ?? null;
  }

  private mineTargets(tx: number, ty: number) {
    const maxBlocks = state.upgrades.laser >= 10 ? 4 : state.upgrades.laser >= 6 ? 3 : state.upgrades.laser >= 3 ? 2 : 1;
    const radius = maxBlocks > 1 ? 1 : 0;
    const targets: Array<{ x: number; y: number; distance: number }> = [];
    for (let y = ty - radius; y <= ty + radius; y += 1) {
      for (let x = tx - radius; x <= tx + radius; x += 1) {
        const gridDistance = Math.abs(x - tx) + Math.abs(y - ty);
        if (gridDistance > 1) continue;
        const tile = this.getTile(x, y);
        if (tiles[tile].solid && tile !== 'bedrock' && tile !== 'anchorstone') {
          const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, x * TILE + TILE * 0.5, y * TILE + TILE * 0.5);
          targets.push({ x, y, distance });
        }
      }
    }
    return targets
      .sort((a, b) => a.distance - b.distance || hash(a.x, a.y, rng.seed) - hash(b.x, b.y, rng.seed))
      .slice(0, maxBlocks);
  }

  private breakTile(tx: number, ty: number, tile: Tile, def: TileDef) {
    const x = tx * TILE + TILE * 0.5;
    const y = ty * TILE + TILE * 0.5;
    this.setTile(tx, ty, 'water');
    this.damage[ty][tx] = 0;
    this.spawnLoose(tile, def, x, y);
    if (def.value > 0) {
      state.status = state.cargo.length < cargoCapacity()
        ? `${def.name} broke loose. Swim near it to collect.`
        : `Cargo full. ${def.name} broke loose and can be picked up later.`;
    } else {
      state.status = `Cut through ${def.name}.`;
    }
  }

  private spawnLoose(tile: Tile, def: TileDef, x: number, y: number) {
    const pieces = def.value > 0 ? 1 : 3;
    for (let i = 0; i < pieces; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(10, 42);
      this.looseItems.push({
        id: def.value > 0 && i === 0 ? tile : 'stone',
        name: def.name,
        value: def.value > 0 && i === 0 ? def.value : 0,
        x: x + Phaser.Math.FloatBetween(-4, 4),
        y: y + Phaser.Math.FloatBetween(-4, 4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: def.color,
        radius: def.value > 0 ? scaledEntity(5) : Phaser.Math.FloatBetween(scaledEntity(2), scaledEntity(3.5)),
        life: def.value > 0 ? Infinity : Phaser.Math.FloatBetween(4, 8),
        kind: def.value > 0 && i === 0 ? cargoKindForTile(tile) : 'rubble',
        icon: def.value > 0 && i === 0 ? cargoIconForTile(tile) : 'item-icon-stone',
      });
    }
    if (this.looseItems.length > 220) {
      this.looseItems = this.looseItems.slice(-220);
    }
  }

  private scanNearbyLife(delta: number, scanningHeld: boolean) {
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

  private updateFish(delta: number) {
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

  private updateFlora(delta: number) {
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

  private updateSpecialRooms(delta: number) {
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

  private updateNestEggs(delta: number) {
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

  private hatchEgg(egg: NestEgg) {
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

  private updateLarvae(delta: number, controls: ControlState) {
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

  private failNestBounty(roomId: string) {
    const room = this.specialRooms.find((candidate) => candidate.id === roomId);
    if (!room || room.failed || room.rewardClaimed) return;
    room.failed = true;
    state.status = 'Nest swarm reached the barge. Corporate hazard bounty voided.';
  }

  private checkNestRewards() {
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

  private updateLooseItems(delta: number) {
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

  private updateThrownUtility(item: LooseItem, delta: number) {
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

  private thrownItemCollides(x: number, y: number, radius: number) {
    const points: Array<[number, number]> = [
      [x, y + radius],
      [x - radius * 0.72, y + radius * 0.55],
      [x + radius * 0.72, y + radius * 0.55],
      [x - radius * 0.55, y],
      [x + radius * 0.55, y],
    ];
    return points.some(([px, py]) => bargeSolidAtWorld(px, py) || tiles[this.tileAtWorld(px, py)].solid);
  }

  private thrownItemLandingY(x: number, previousY: number, nextY: number, radius: number) {
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

  private spawnFloatingText(message: string, color: number) {
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

  private updateFloatingTexts(delta: number) {
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

  private updateSonarPings(delta: number) {
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

  private updateFlares(delta: number) {
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

  useSelectedItem() {
    if (state.lost || state.won || !state.started || state.paused || state.docked) return false;
    clampSelectedCargoIndex();
    const item = state.cargo[state.selectedCargoIndex];
    if (!item) {
      state.status = 'No cargo slot selected. Buy supplies or recover ore first.';
      renderHud();
      return false;
    }
    if (item.kind === 'tool') {
      if (item.id === 'injector-knife') return this.useInjectorKnife();
      state.status = `${item.name} is not ready to use.`;
      renderHud();
      return false;
    }
    if (item.kind !== 'consumable') {
      this.dropCargoItem(state.selectedCargoIndex);
      return true;
    }
    if (item.id === 'oxygen-tank' && !this.consumeOxygenTank()) return false;
    if (item.id === 'fuel-tank' && !this.consumeFuelTank()) return false;
    if (item.id === 'first-aid-kit' && !this.consumeFirstAidKit()) return false;
    if (item.id === 'antivenom' && !this.consumeAntivenom()) return false;
    state.cargo.splice(state.selectedCargoIndex, 1);
    state.selectedCargoIndex = Math.min(state.selectedCargoIndex, Math.max(0, state.cargo.length - 1));
    clampSelectedCargoIndex();
    if (item.id === 'stun-grenade') this.triggerStunPulse();
    else if (item.id === 'dynamite') this.throwUtilityItem(item, 'dynamite');
    else if (item.id === 'flare') this.throwUtilityItem(item, 'flare');
    renderHud();
    return true;
  }

  private consumeOxygenTank() {
    const sub = state.pilotingSub ? state.activeSub : null;
    const max = sub ? subDef(sub.tier).oxygen : oxygenMax();
    const current = sub ? sub.oxygen : state.oxygen;
    const missing = max - current;
    if (missing <= 0) {
      state.status = sub ? `${subDef(sub.tier).name} oxygen is already full.` : 'Suit oxygen is already full.';
      renderHud();
      return false;
    }
    const amount = Math.min(OXYGEN_TANK_REFILL, missing);
    if (sub) sub.oxygen = Math.min(max, sub.oxygen + amount);
    else state.oxygen = Math.min(max, state.oxygen + amount);
    resetOxygenWarnings();
    state.status = `Emergency oxygen tank used. Restored ${Math.round(amount)} O2.`;
    this.spawnFloatingText(`O2 +${Math.round(amount)}`, 0x8ee7f4);
    return true;
  }

  private consumeFuelTank() {
    const sub = state.pilotingSub ? state.activeSub : null;
    const max = sub ? subDef(sub.tier).fuel : fuelMax();
    const current = sub ? sub.fuel : state.fuel;
    const missing = max - current;
    if (missing <= 0) {
      state.status = sub ? `${subDef(sub.tier).name} fuel is already full.` : 'Cutter fuel is already full.';
      renderHud();
      return false;
    }
    const amount = Math.min(FUEL_TANK_REFILL, missing);
    if (sub) sub.fuel = Math.min(max, sub.fuel + amount);
    else state.fuel = Math.min(max, state.fuel + amount);
    state.status = `Portable fuel tank used. Restored ${Math.round(amount)} fuel.`;
    this.spawnFloatingText(`Fuel +${Math.round(amount)}`, 0xffd166);
    return true;
  }

  private consumeFirstAidKit() {
    const sub = state.pilotingSub ? state.activeSub : null;
    const max = sub ? subDef(sub.tier).hull : hullMax();
    const current = sub ? sub.hull : state.hull;
    const missing = max - current;
    const bleeding = state.bleed.active || state.bleed.recentBites > 0;
    if (missing <= 0 && !bleeding) {
      state.status = sub ? `${subDef(sub.tier).name} hull is already stable.` : 'Suit integrity is already stable.';
      renderHud();
      return false;
    }
    const repaired = Math.min(FIRST_AID_REPAIR, Math.max(0, missing));
    if (sub) sub.hull = Math.min(max, sub.hull + repaired);
    else state.hull = Math.min(max, state.hull + repaired);
    if (bleeding) clearBleed();
    state.status = bleeding
      ? `First aid sealed the bleed${repaired > 0 ? ` and restored ${Math.round(repaired)} hull` : ''}.`
      : `First aid restored ${Math.round(repaired)} hull.`;
    this.spawnFloatingText(bleeding ? 'Bleed sealed' : `Hull +${Math.round(repaired)}`, 0xff6f7f);
    return true;
  }

  private consumeAntivenom() {
    if (!state.venom.active) {
      state.status = 'No venom detected in suit seals.';
      renderHud();
      return false;
    }
    const source = state.venom.source;
    clearVenom();
    state.status = `Antivenom purged ${source} toxin from the suit.`;
    this.spawnFloatingText('Venom purged', 0x7bd88f);
    return true;
  }

  private useInjectorKnife() {
    const larva = this.nearestKnifeLarva();
    if (larva) {
      this.larvae = this.larvae.filter((candidate) => candidate !== larva);
      larva.sprite?.setVisible(false);
      state.status = larva.latched ? 'Injector knife cut the larva free.' : 'Injector knife pinned a hatchling.';
      this.spawnFloatingText('Larva cut', 0xd06bff);
      this.checkNestRewards();
      renderHud();
      return true;
    }
    const target = this.nearestKnifeTarget();
    if (!target) {
      state.status = 'Injector knife swiped through open water. Get closer to a predator.';
      this.spawnFloatingText('Miss', 0xa9b8c9);
      renderHud();
      return false;
    }
    const damage = INJECTOR_KNIFE_DAMAGE + state.upgrades.suit * 0.8;
    this.damageLifeTarget(target, damage, 'Injector knife');
    target.stunned = Math.max(target.stunned, 0.45);
    target.aggro = Math.max(target.aggro, 2.4);
    const distance = Math.max(1, Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y));
    target.vx += ((target.x - this.player.x) / distance) * 84;
    target.vy += ((target.y - this.player.y) / distance) * 84;
    this.spawnFloatingText('Stab', 0xd06bff);
    renderHud();
    return true;
  }

  private nearestKnifeLarva() {
    let nearest: { larva: Larva; distance: number } | null = null;
    for (const larva of this.larvae) {
      const distance = larva.latched ? 0 : Phaser.Math.Distance.Between(this.player.x, this.player.y, larva.x, larva.y);
      if (!larva.latched && distance > INJECTOR_KNIFE_RANGE + larva.radius) continue;
      if (!nearest || distance < nearest.distance) nearest = { larva, distance };
    }
    return nearest?.larva ?? null;
  }

  private nearestKnifeTarget() {
    let nearest: { fish: Fish; distance: number } | null = null;
    for (const fish of this.fish) {
      if (!fish.hostile || fish.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance > INJECTOR_KNIFE_RANGE + fish.radius) continue;
      if (!nearest || distance < nearest.distance) nearest = { fish, distance };
    }
    return nearest?.fish ?? null;
  }

  private triggerStunPulse() {
    let stunned = 0;
    for (const fish of this.fish) {
      if (!fish.hostile) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance > STUN_GRENADE_RADIUS) continue;
      fish.stunned = STUN_GRENADE_DURATION;
      fish.aggro = 0;
      fish.vx *= 0.12;
      fish.vy *= 0.12;
      stunned += 1;
    }
    state.status = stunned > 0
      ? `Stun grenade fired. ${stunned} predator${stunned === 1 ? '' : 's'} stunned for ${STUN_GRENADE_DURATION} seconds.`
      : 'Stun grenade fired. No predators were close enough to catch the pulse.';
    this.spawnFloatingText(stunned > 0 ? `Stunned x${stunned}` : 'Stun pulse', 0x8ee7f4);
  }

  private throwUtilityItem(item: CargoItem, utility: ThrownUtility) {
    const facing = this.player.facing.lengthSq() > 0 ? this.player.facing.clone().normalize() : new Phaser.Math.Vector2(this.player.facingSign, 0);
    const sideways = new Phaser.Math.Vector2(-facing.y, facing.x);
    const x = this.player.x + facing.x * (PLAYER_FORWARD_REACH + 14);
    const y = this.player.y + facing.y * (PLAYER_FORWARD_REACH + 14);
    this.looseItems.push({
      ...item,
      x,
      y,
      vx: this.player.vx * 0.18 + facing.x * THROWN_ITEM_SPEED + sideways.x * Phaser.Math.FloatBetween(-8, 8),
      vy: this.player.vy * 0.18 + facing.y * (THROWN_ITEM_SPEED * 0.55) - 18,
      radius: utility === 'dynamite' ? scaledEntity(4.6) : scaledEntity(4),
      life: utility === 'dynamite' ? 90 : 120,
      utility,
      landed: false,
      fuse: utility === 'dynamite' ? DYNAMITE_LAND_FUSE : 0,
    });
    state.status = utility === 'dynamite'
      ? 'Dynamite thrown. It will sink and detonate when it catches on terrain.'
      : 'Flare thrown. It will sink and ignite where it lands.';
    this.spawnFloatingText(utility === 'dynamite' ? 'Dynamite thrown' : 'Flare thrown', item.color);
  }

  private detonateDynamite(centerX: number, centerY: number) {
    const tx = Math.floor(centerX / TILE);
    const ty = Math.floor(centerY / TILE);
    let broken = 0;
    for (let y = ty - DYNAMITE_RADIUS_TILES; y <= ty + DYNAMITE_RADIUS_TILES; y += 1) {
      for (let x = tx - DYNAMITE_RADIUS_TILES; x <= tx + DYNAMITE_RADIUS_TILES; x += 1) {
        const distance = Math.hypot(x - tx, y - ty);
        if (distance > DYNAMITE_RADIUS_TILES + 0.15) continue;
        const tile = this.getTile(x, y);
        const def = tiles[tile];
        if (!def.solid || tile === 'bedrock' || tile === 'anchorstone') continue;
        this.breakTile(x, y, tile, def);
        broken += 1;
      }
    }
    const lifeHits = this.damageLifeInRadius(centerX, centerY, TILE * (DYNAMITE_RADIUS_TILES + 1.2), DYNAMITE_LIFE_DAMAGE, 'Dynamite');
    this.terrainDirty = true;
    this.overlay.fillStyle(0xff6f3c, 0.32);
    this.overlay.fillCircle(centerX, centerY, TILE * (DYNAMITE_RADIUS_TILES + 0.55));
    state.status = broken > 0
      ? `Dynamite blast opened ${broken} block${broken === 1 ? '' : 's'}${lifeHits > 0 ? ` and hit ${lifeHits} lifeform${lifeHits === 1 ? '' : 's'}` : ''}.`
      : lifeHits > 0
        ? `Dynamite shockwave hit ${lifeHits} lifeform${lifeHits === 1 ? '' : 's'}.`
        : 'Dynamite detonated, but the rock here would not give.';
    this.spawnFloatingText(broken > 0 ? `Blast x${broken}` : 'Dynamite', 0xff8a5c);
    renderHud();
  }

  private deployFlare(x: number, y: number) {
    this.flares.push({ x, y, age: 0, life: FLARE_DURATION });
    if (this.flares.length > 8) this.flares.shift();
    this.revealSonarAtWorld(x, y, 7);
    state.status = 'Flare burning. Nearby water is lit for a short while.';
    this.spawnFloatingText('Flare deployed', 0xff8a5c);
    renderHud();
  }

  private dropCargoItem(index: number) {
    const item = state.cargo[index];
    if (!item) return;
    state.cargo.splice(index, 1);
    clampSelectedCargoIndex();
    const angle = this.player.facing.angle();
    const speed = 34;
    this.looseItems.push({
      ...item,
      x: this.player.x + Math.cos(angle) * 22,
      y: this.player.y + Math.sin(angle) * 22,
      vx: this.player.vx * 0.12 + Math.cos(angle) * speed,
      vy: this.player.vy * 0.12 + Math.sin(angle) * speed,
      radius: item.value > 0 ? scaledEntity(5) : scaledEntity(4),
      life: item.value > 0 ? Infinity : 40,
    });
    state.status = `${item.name} dropped from cargo.`;
    this.spawnFloatingText(`Dropped ${item.name}`, item.color);
  }

  private captureSonarContacts() {
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

  private revealSonarAtPlayer(radiusTiles: number) {
    this.revealSonarAtWorld(this.player.x, this.player.y, radiusTiles);
  }

  private revealSonarAtWorld(worldX: number, worldY: number, radiusTiles: number) {
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

  private drawSonarPings() {
    for (const ping of this.sonarPings) {
      const t = Phaser.Math.Clamp(ping.age / ping.life, 0, 1);
      const alpha = 1 - t;
      this.actors.lineStyle(2, 0x73fbd3, alpha * 0.72);
      this.actors.strokeCircle(ping.x, ping.y, Phaser.Math.Linear(16, SONAR_REVEAL_RADIUS_TILES * TILE, t));
      this.actors.lineStyle(1, 0x8ee7f4, alpha * 0.28);
      this.actors.strokeCircle(ping.x, ping.y, Phaser.Math.Linear(8, SONAR_ATTRACT_RADIUS, t));
    }
  }

  private drawFlares(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const flare of this.flares) {
      if (flare.x < view.x - FLARE_LIGHT_RADIUS || flare.x > view.right + FLARE_LIGHT_RADIUS || flare.y < view.y - FLARE_LIGHT_RADIUS || flare.y > view.bottom + FLARE_LIGHT_RADIUS) continue;
      const t = Phaser.Math.Clamp(flare.age / flare.life, 0, 1);
      const alpha = (1 - Phaser.Math.SmoothStep(t, 0.72, 1)) * 0.9;
      const pulse = 1 + Math.sin(flare.age * 11) * 0.05;
      this.actors.fillStyle(0xff8a5c, alpha * 0.18);
      this.actors.fillCircle(flare.x, flare.y, FLARE_LIGHT_RADIUS * pulse);
      this.actors.fillStyle(0xffd166, alpha * 0.72);
      this.actors.fillCircle(flare.x, flare.y, 4);
      this.actors.lineStyle(1, 0xffd166, alpha * 0.48);
      this.actors.strokeCircle(flare.x, flare.y, 8 + Math.sin(flare.age * 8) * 2);
    }
  }

  drawSonarMap() {
    const canvas = document.querySelector<HTMLCanvasElement>('#sonar-map');
    if (!canvas || !this.world.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 224;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#01070d';
    ctx.fillRect(0, 0, size, size);
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(15, 75, 94, 0.22)');
    gradient.addColorStop(0.62, 'rgba(4, 28, 42, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.64)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const centerX = Math.floor(this.player.x / TILE);
    const centerY = Math.floor(this.player.y / TILE);
    const viewRadius = 26;
    const cell = size / (viewRadius * 2 + 1);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    for (let y = centerY - viewRadius; y <= centerY + viewRadius; y += 1) {
      for (let x = centerX - viewRadius; x <= centerX + viewRadius; x += 1) {
        if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) continue;
        if (!state.sonarRevealed.has(sonarKey(x, y))) continue;
        const tile = this.getTile(x, y);
        const px = Math.floor((x - centerX + viewRadius) * cell);
        const py = Math.floor((y - centerY + viewRadius) * cell);
        const drawSize = Math.max(2, Math.ceil(cell) + 1);
        const solid = tiles[tile].solid;
        if (!solid) {
          ctx.fillStyle = 'rgba(12, 88, 111, 0.42)';
          ctx.fillRect(px, py, drawSize, drawSize);
          continue;
        }
        const north = y <= 0 || !tiles[this.getTile(x, y - 1)].solid;
        const south = y >= WORLD_H - 1 || !tiles[this.getTile(x, y + 1)].solid;
        const west = x <= 0 || !tiles[this.getTile(x - 1, y)].solid;
        const east = x >= WORLD_W - 1 || !tiles[this.getTile(x + 1, y)].solid;
        const isEdge = north || south || west || east;
        if (isEdge) {
          ctx.fillStyle = sonarTileColor(tile, true);
          ctx.fillRect(px, py, drawSize, drawSize);
        } else if (tile === 'stone' || tile === 'sand' || tile === 'bedrock' || tile === 'anchorstone') {
          ctx.fillStyle = sonarTileColor(tile, false);
          ctx.fillRect(px, py, drawSize, drawSize);
        } else if (tiles[tile].value > 0 || isArtifactTile(tile)) {
          ctx.fillStyle = sonarTileColor(tile, false);
          ctx.fillRect(px, py, drawSize, drawSize);
        }
      }
    }
    for (const ping of this.sonarPings) {
      const t = Phaser.Math.Clamp(ping.age / ping.life, 0, 1);
      const radius = Phaser.Math.Linear(8, (SONAR_REVEAL_RADIUS_TILES / viewRadius) * (size / 2), t);
      ctx.strokeStyle = `rgba(115, 251, 211, ${0.72 * (1 - t)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const contact of state.sonarContacts) {
      const tx = Math.floor(contact.x / TILE);
      const ty = Math.floor(contact.y / TILE);
      if (tx < centerX - viewRadius || tx > centerX + viewRadius || ty < centerY - viewRadius || ty > centerY + viewRadius) continue;
      const px = (tx - centerX + viewRadius + 0.5) * cell;
      const py = (ty - centerY + viewRadius + 0.5) * cell;
      const alpha = Phaser.Math.Clamp(1 - contact.age / 14, 0.22, 1);
      if (contact.kind === 'barge') {
        const width = Math.max(22, cell * 10);
        const height = Math.max(5, cell * 2.2);
        ctx.fillStyle = `rgba(242, 211, 155, ${alpha * 0.9})`;
        ctx.fillRect(px - width * 0.5, py - height * 0.5, width, height);
        ctx.strokeStyle = `rgba(142, 231, 244, ${alpha * 0.72})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px - width * 0.5, py - height * 0.5, width, height);
        ctx.beginPath();
        ctx.moveTo(px - width * 0.18, py - height * 0.5);
        ctx.lineTo(px, py - height * 1.9);
        ctx.lineTo(px + width * 0.18, py - height * 0.5);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = contact.hostile
        ? `rgba(255, 79, 100, ${alpha})`
        : contact.kind === 'flora'
          ? `rgba(115, 251, 211, ${alpha * 0.82})`
          : `rgba(142, 231, 244, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, contact.hostile ? 4.7 : 3.4, 0, Math.PI * 2);
      ctx.fill();
      if (contact.hostile) {
        ctx.strokeStyle = `rgba(255, 79, 100, ${alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 7.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const nestRoom = this.hasActiveNestLocator() ? this.nearestOpenNestRoom() : null;
    if (nestRoom) {
      const dx = nestRoom.x - this.player.x;
      const dy = nestRoom.y - this.player.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      const rawX = size / 2 + (dx / TILE) * cell;
      const rawY = size / 2 + (dy / TILE) * cell;
      const edgeRadius = size * 0.42;
      const markerX = Phaser.Math.Clamp(rawX, size / 2 - edgeRadius, size / 2 + edgeRadius);
      const markerY = Phaser.Math.Clamp(rawY, size / 2 - edgeRadius, size / 2 + edgeRadius);
      const onMap = Math.abs(dx / TILE) <= viewRadius && Math.abs(dy / TILE) <= viewRadius;
      const px = onMap ? rawX : size / 2 + Math.cos(angle) * edgeRadius;
      const py = onMap ? rawY : size / 2 + Math.sin(angle) * edgeRadius;
      ctx.save();
      ctx.translate(onMap ? markerX : px, onMap ? markerY : py);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(255, 209, 102, 0.94)';
      ctx.strokeStyle = 'rgba(255, 79, 100, 0.72)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(255, 209, 102, 0.82)';
      ctx.font = '700 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(distance / 6)}m`, size / 2, size - 12);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(115, 251, 211, 0.28)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, (size / 2) * (i / 4), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(142, 231, 244, 0.62)';
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    ctx.fillStyle = '#fff7df';
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2 - 6);
    ctx.lineTo(size / 2 + 5, size / 2 + 5);
    ctx.lineTo(size / 2 - 5, size / 2 + 5);
    ctx.closePath();
    ctx.fill();
  }

  private drawLooseItems(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const item of this.looseItems) {
      if (item.x < view.x - 40 || item.x > view.right + 40 || item.y < view.y - 40 || item.y > view.bottom + 40) continue;
      if (item.utility) {
        const flash = item.utility === 'dynamite' && item.landed ? 0.65 + Math.sin(this.time.now * 0.045) * 0.25 : 0.9;
        if (item.utility === 'flare' && !item.landed) {
          this.actors.fillStyle(0xff8a5c, 0.1);
          this.actors.fillCircle(item.x, item.y, FLARE_LIGHT_RADIUS * 0.62);
        }
        this.actors.fillStyle(item.color, flash);
        this.actors.fillCircle(item.x, item.y, item.radius + (item.landed ? 0.8 : 0));
        this.actors.lineStyle(1, item.utility === 'flare' ? 0xffd166 : 0xfff7df, 0.62);
        this.actors.strokeCircle(item.x, item.y, item.radius + 2);
        if (item.utility === 'flare') {
          this.actors.lineStyle(1, 0xffd166, 0.22);
          this.actors.strokeCircle(item.x, item.y, item.radius + 6 + Math.sin(this.time.now * 0.012) * 1.5);
        }
        continue;
      }
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

  private updateBobbits(delta: number, controls: ControlState) {
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

  private resetBobbit(bobbit: Bobbit, cooldown: number) {
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

  private steerFish(fish: Fish, delta: number) {
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

  private applyVenom(fish: Fish) {
    if (state.venom.active) return;
    state.venom.active = true;
    state.venom.source = fish.species;
    state.venom.tick = 0;
    state.status = `${fish.species} venom entered the suit seals. Return to the barge to purge it.`;
    this.spawnFloatingText('Venom', 0xb9f27c);
  }

  private registerPredatorBite(fish: Fish) {
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

  private playFishBite(damage: number) {
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

  private nearestLife(range: number): ScanTarget | null {
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

  private updateQuestProgress() {
    const quest = activeQuest();
    if (!quest || quest.completed || quest.claimed) return;
    quest.progress = Phaser.Math.Clamp(questProgressSource(quest) - quest.startValue, 0, quest.target);
    if (quest.progress < quest.target || quest.kind === 'nest') {
      if (quest.kind === 'nest' && this.hasActiveNestLocator()) this.drawSonarMap();
      return;
    }
    this.completeQuest(quest, `${quest.title} complete. Return to the barge to collect ${quest.reward.toLocaleString()} credits.`);
  }

  private completeQuest(quest: Quest, status: string) {
    if (quest.completed || quest.claimed) return;
    quest.completed = true;
    quest.progress = quest.target;
    state.status = status;
    this.spawnFloatingText('Quest complete', 0xffd166);
    renderHud();
    this.drawSonarMap();
  }

  private completeNestQuest(room: SpecialRoom) {
    const quest = activeQuest();
    if (!quest || quest.kind !== 'nest' || quest.completed || quest.claimed) return;
    quest.progress = 1;
    this.completeQuest(quest, `Nest extermination confirmed near ${Math.round(room.y / 6)} m. Return to the barge for contract payout.`);
  }

  private hasActiveNestLocator() {
    const quest = activeQuest();
    return Boolean(quest && quest.kind === 'nest' && quest.accepted && !quest.completed && !quest.claimed);
  }

  private nearestOpenNestRoom() {
    let nearest: { room: SpecialRoom; distance: number } | null = null;
    for (const room of this.specialRooms) {
      if (room.kind !== 'nest' || room.rewardClaimed || room.failed) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, room.x, room.y);
      if (!nearest || distance < nearest.distance) nearest = { room, distance };
    }
    return nearest?.room ?? null;
  }

  private updateSystems(delta: number) {
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

  private respawnAtBarge() {
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

  private isAtBoat(): boolean {
    return this.player.y < BARGE_ENTRY_Y && Math.abs(this.player.x - WORLD_W * TILE * 0.5) < BARGE_ENTRY_HALF_WIDTH;
  }

  private isInDockingZone(): boolean {
    return this.player.y < BARGE_DOCKING_ZONE_Y && Math.abs(this.player.x - WORLD_W * TILE * 0.5) < BARGE_DOCKING_HALF_WIDTH;
  }

  private draw() {
    const camera = this.cameras.main;
    this.actors.clear();
    this.darkness.clear();
    this.lampGloom.clear();
    this.overlay.clear();
    camera.setBackgroundColor(depthColor(state.depth));
    this.drawParallax(camera);
    this.drawWorld(camera);
    this.drawSpecialRooms(camera);
    this.drawBoat();
    this.drawLooseItems(camera);
    this.drawHazards();
    this.drawBobbits(camera);
    this.drawNestEggs(camera);
    this.drawLarvae(camera);
    this.drawFlora(camera);
    this.drawFish(camera);
    this.drawSub();
    this.drawPlayer();
    this.drawFlares(camera);
    this.drawSonarPings();
    this.drawDarkness(camera);
    this.drawGameOver(camera);
  }

  private drawParallax(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    const prefix = parallaxPrefix();
    const speeds = parallaxSpeeds();
    const alphas = parallaxAlphas();
    const padding = 24;
    for (let i = 0; i < this.parallaxLayers.length; i += 1) {
      const layer = this.parallaxLayers[i];
      const key = `${prefix}-${i}`;
      if (layer.texture.key !== key) layer.setTexture(key);
      const source = this.textures.get(key).getSourceImage();
      const sourceWidth = Math.max(1, source.width);
      const sourceHeight = Math.max(1, source.height);
      const coverScale = Math.max((view.width + padding * 2) / sourceWidth, (view.height + padding * 2) / sourceHeight, 1);
      layer
        .setPosition(view.x - padding, view.y - padding)
        .setSize(view.width + padding * 2, view.height + padding * 2)
        .setAlpha(alphas[i]);
      layer.tilePositionX = camera.scrollX * speeds[i];
      layer.tilePositionY = camera.scrollY * (0.06 + i * 0.02);
      layer.tileScaleX = coverScale;
      layer.tileScaleY = coverScale;
    }
  }

  private drawGameOver(camera: Phaser.Cameras.Scene2D.Camera) {
    if (!state.lost) return;
    const view = camera.worldView;
    const cx = this.player.x;
    const cy = this.player.y;
    this.overlay.fillStyle(0x05070d, 0.62);
    this.overlay.fillRect(view.x, view.y, view.width, view.height);
    this.actors.lineStyle(3, 0xff6f7f, 0.75);
    this.actors.strokeCircle(cx, cy, scaledEntity(28 + Math.sin(performance.now() * 0.006) * 4));
    this.actors.fillStyle(0xff6f7f, 0.25);
    this.actors.fillCircle(cx, cy, scaledEntity(34));
    this.actors.lineStyle(2, 0xfff7df, 0.55);
    this.actors.lineBetween(cx - scaledEntity(16), cy - scaledEntity(14), cx + scaledEntity(16), cy + scaledEntity(14));
    this.actors.lineBetween(cx + scaledEntity(16), cy - scaledEntity(14), cx - scaledEntity(16), cy + scaledEntity(14));
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

    let tileSpriteIndex = 0;
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = this.getTile(x, y);
        if (tile === 'water') {
          if (hash(x, y, rng.seed) > 0.985) {
            this.terrain.lineStyle(1, 0x84dce6, 0.28);
            this.terrain.strokeCircle(x * TILE + 8, y * TILE + 8, 2 + hash(y, x, rng.seed) * 4);
          }
          continue;
        }
        const def = tiles[tile];
        const fracture = this.damage[y][x] / def.hp;
        const textureKey = tileTextureKey(tile, x, y);
        const tileSprite = this.tileSpriteAt(tileSpriteIndex, textureKey);
        tileSprite
          .setTexture(textureKey)
          .setVisible(true)
          .setAlpha(1)
          .setPosition(x * TILE, y * TILE)
          .setDisplaySize(TILE, TILE);
        tileSpriteIndex += 1;
        this.terrain.lineStyle(tile === 'anchorstone' ? 2 : 1, tile === 'anchorstone' ? 0xb9c2d0 : 0x071016, tile === 'anchorstone' ? 0.5 : 0.35);
        this.terrain.strokeRect(x * TILE, y * TILE, TILE, TILE);
        if (tile === 'anchorstone') {
          this.terrain.lineStyle(1, 0x11141c, 0.4);
          this.terrain.lineBetween(x * TILE + 4, y * TILE + 7, x * TILE + 20, y * TILE + 7);
          this.terrain.lineBetween(x * TILE + 6, y * TILE + 16, x * TILE + 18, y * TILE + 16);
        }
        if (fracture > 0) {
          this.terrain.lineStyle(1, 0xeef9f7, 0.2 + fracture * 0.35);
          this.terrain.lineBetween(x * TILE + 5, y * TILE + 6, x * TILE + 17, y * TILE + 18);
        }
        if (isArtifactTile(tile)) {
          const pulse = 0.48 + Math.sin(performance.now() * 0.004 + x * 0.9 + y * 0.2) * 0.12;
          this.terrain.lineStyle(1, 0xfff7df, pulse);
          this.terrain.strokeCircle(x * TILE + 12, y * TILE + 12, 5);
          this.terrain.lineBetween(x * TILE + 12, y * TILE + 5, x * TILE + 17, y * TILE + 12);
          this.terrain.lineBetween(x * TILE + 17, y * TILE + 12, x * TILE + 12, y * TILE + 19);
          this.terrain.lineBetween(x * TILE + 12, y * TILE + 19, x * TILE + 7, y * TILE + 12);
          this.terrain.lineBetween(x * TILE + 7, y * TILE + 12, x * TILE + 12, y * TILE + 5);
        }
      }
    }
    for (let i = tileSpriteIndex; i < this.tileSprites.length; i += 1) {
      this.tileSprites[i].setVisible(false);
    }
  }

  private drawBoat() {
    const x = WORLD_W * TILE * 0.5;
    const s = BARGE_DRAW_SCALE;
    this.bargeSprite
      .setVisible(true)
      .setAlpha(1)
      .setPosition(x, 0)
      .setDisplaySize(BARGE_PLATFORM_WIDTH, BARGE_PLATFORM_HEIGHT);
    this.actors.fillStyle(0x55d7e6, state.atBoat ? 0.14 : 0.06);
    this.actors.fillEllipse(x, SURFACE_Y + 8 * s, 150 * s, 18 * s);
    this.actors.lineStyle(1, 0xb8edf0, state.atBoat ? 0.62 : 0.28);
    this.actors.lineBetween(x - 28 * s, BARGE_DOCK_Y, x + 28 * s, BARGE_DOCK_Y);
    this.actors.lineBetween(x, BARGE_DOCK_Y, x, BARGE_DOCKING_ZONE_Y);
  }

  private drawSpecialRooms(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const room of this.specialRooms) {
      if (room.x + room.rx < view.x || room.x - room.rx > view.right || room.y + room.ry < view.y || room.y - room.ry > view.bottom) continue;
      if (room.kind === 'biolume') {
        const pulse = 0.58 + Math.sin(performance.now() * 0.0024 + room.x * 0.01) * 0.12;
        this.actors.fillStyle(0x1bcbd8, 0.07 * pulse);
        this.actors.fillEllipse(room.x, room.y, room.rx * 1.82, room.ry * 1.72);
        this.actors.lineStyle(2, 0x73fbd3, 0.18 * pulse);
        this.actors.strokeEllipse(room.x, room.y, room.rx * 1.62, room.ry * 1.45);
        for (let i = 0; i < 9; i += 1) {
          const angle = (i / 9) * Math.PI * 2 + performance.now() * 0.0004;
          const x = room.x + Math.cos(angle) * room.rx * (0.26 + (i % 3) * 0.18);
          const y = room.y + Math.sin(angle) * room.ry * (0.28 + (i % 2) * 0.18);
          this.actors.fillStyle(i % 2 === 0 ? 0x73fbd3 : 0xf48cff, 0.22);
          this.actors.fillCircle(x, y, scaledEntity(3 + (i % 3)));
        }
      } else {
        this.actors.fillStyle(0x2a0710, 0.12);
        this.actors.fillEllipse(room.x, room.y, room.rx * 1.45, room.ry * 1.2);
        this.actors.lineStyle(1, 0xff4f64, room.rewardClaimed ? 0.12 : 0.28);
        this.actors.strokeEllipse(room.x, room.y, room.rx * 1.36, room.ry * 1.08);
      }
    }
  }

  private drawHazards() {
    const s = ENTITY_SCALE;
    for (const hazard of this.hazards) {
      const pulse = (Math.sin(hazard.phase * 1.8) + 1) * 0.5;
      const frame = Math.floor((hazard.phase * 7) % 4);
      hazard.sprite
        ?.setTexture(`vent-steam-${frame}`)
        .setVisible(true)
        .setAlpha(0.62 + pulse * 0.25)
        .setPosition(hazard.x, hazard.y + 4 * s);
      fitImageHeight(hazard.sprite, hazard.radius * 3.2);
      if (pulse > 0.45) {
        this.actors.lineStyle(1, 0xff8a5c, pulse * 0.32);
        this.actors.strokeEllipse(hazard.x, hazard.y + 4 * s, hazard.radius * 1.25, hazard.radius * 0.34);
      }
    }
  }

  private drawNestEggs(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const egg of this.nestEggs) {
      if (egg.state === 'destroyed') {
        egg.sprite?.setVisible(false);
        continue;
      }
      if (egg.x < view.x - 80 || egg.x > view.right + 80 || egg.y < view.y - 80 || egg.y > view.bottom + 80) {
        egg.sprite?.setVisible(false);
        continue;
      }
      const frame = egg.state === 'hatched'
        ? 'nest-egg-hatched'
        : egg.state === 'hatching'
          ? 'nest-egg-hatching'
          : `nest-egg-${Math.floor(egg.phase * 1.4) % 4}`;
      const shake = egg.state === 'hatching' ? Math.sin(egg.phase * 42) * scaledEntity(2) : 0;
      const flash = egg.state === 'hatching' ? 0.72 + Math.sin(egg.phase * 24) * 0.24 : 0.92;
      egg.sprite
        ?.setTexture(frame)
        .setVisible(true)
        .setAlpha(flash)
        .setPosition(egg.x + shake, egg.y)
        .setRotation(egg.state === 'hatching' ? Math.sin(egg.phase * 38) * 0.08 : 0);
      fitImageWidth(egg.sprite, egg.radius * 4.2);
      if (egg.state === 'hatching') {
        this.actors.lineStyle(2, 0xff4f64, 0.68);
        this.actors.strokeCircle(egg.x, egg.y - scaledEntity(4), egg.radius + scaledEntity(7 + Math.sin(egg.phase * 18) * 3));
      }
    }
  }

  private drawLarvae(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const larva of this.larvae) {
      if (larva.x < view.x - 60 || larva.x > view.right + 60 || larva.y < view.y - 60 || larva.y > view.bottom + 60) {
        larva.sprite?.setVisible(false);
        continue;
      }
      const frame = Math.floor(larva.phase * 9) % 3;
      larva.sprite
        ?.setTexture(`nest-larva-${frame}`)
        .setVisible(true)
        .setAlpha(larva.latched ? 1 : 0.88)
        .setPosition(larva.x, larva.y)
        .setRotation(Math.atan2(larva.vy, larva.vx));
      fitImageWidth(larva.sprite, larva.radius * (larva.latched ? 7.2 : 6));
      if (larva.latched) {
        this.actors.lineStyle(1, 0xff4f64, 0.45);
        this.actors.strokeCircle(larva.x, larva.y, larva.radius + scaledEntity(4));
      }
    }
  }

  private drawBobbits(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const bobbit of this.bobbits) {
      if (bobbit.x < view.x - 100 || bobbit.x > view.right + 100 || bobbit.y < view.y - 120 || bobbit.y > view.bottom + 120) {
        bobbit.sprite?.setVisible(false);
        continue;
      }
      const frame =
        bobbit.state === 'hidden' ? 0 :
          bobbit.state === 'emerging' ? 1 :
            bobbit.state === 'latched' || bobbit.state === 'lunging' ? 3 :
              0;
      const displayWidth = bobbit.state === 'hidden' || bobbit.state === 'cooldown'
        ? scaledEntity(42)
        : bobbit.state === 'emerging'
          ? scaledEntity(50)
          : scaledEntity(70);
      bobbit.sprite
        ?.setTexture(`bobbit-${frame}`)
        .setVisible(true)
        .setAlpha(bobbit.state === 'cooldown' ? 0.45 : 0.95)
        .setPosition(bobbit.x, bobbit.y)
        .setFlipX(bobbit.facingSign < 0);
      fitImageWidth(bobbit.sprite, displayWidth);
      if (bobbit.state === 'latched') {
        const progress = Phaser.Math.Clamp(bobbit.escapeRemaining / BOBBIT_ESCAPE_SECONDS, 0, 1);
        this.actors.lineStyle(2, 0xff8a6b, 0.72);
        this.actors.strokeCircle(this.player.x, this.player.y, scaledEntity(26 + progress * 14));
      }
    }
  }

  private drawFish(camera: Phaser.Cameras.Scene2D.Camera) {
    for (const fish of this.fish) {
      if (fish.dead) {
        fish.sprite?.setVisible(false);
        continue;
      }
      const alpha = this.fishVisibilityAlpha(fish, camera);
      if (alpha <= 0) {
        fish.sprite?.setVisible(false);
        continue;
      }
      const angle = Math.atan2(fish.vy, fish.vx);
      const bodyAlpha = fish.scanned ? Math.max(alpha, 0.9) : alpha;
      const threatDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      const movingTowardPlayer = (fish.vx * (this.player.x - fish.x) + fish.vy * (this.player.y - fish.y)) > 0;
      const attacking = fish.hostile && fish.aggro > 0 && movingTowardPlayer && threatDistance < 220;
      const threat = attacking ? 1 - Phaser.Math.Clamp((threatDistance - 52) / 118, 0, 1) : 0;
      const desiredWidth = fish.radius * (fish.hostile ? 3.8 : fish.pattern === 'circle' || fish.pattern === 'glide' ? 3.4 : 3);
      const pose = swimPose(angle, fish.facingSign);
      const frameSpeed = fish.stunned > 0 ? 8 : Math.hypot(fish.vx, fish.vy);
      const frame = animatedFrame(fish.phase, frameSpeed, fishFrameCount(fish.assetKey), fish.hostile ? 3.3 : 4.2);
      fish.sprite
        ?.setTexture(`${fish.assetKey}-${frame}`)
        .setVisible(true)
        .setAlpha(fish.stunned > 0 ? bodyAlpha * 0.72 : bodyAlpha)
        .setPosition(fish.x, fish.y)
        .setFlipX(pose.flipX)
        .setRotation(pose.rotation);
      fitImageWidth(fish.sprite, desiredWidth);
      if (fish.hurtFlash > 0) {
        this.actors.lineStyle(2, 0xfff7df, fish.hurtFlash * bodyAlpha);
        this.actors.strokeCircle(fish.x, fish.y, fish.radius + scaledEntity(5));
      }
      if (fish.stunned > 0) {
        const pulse = 0.5 + Math.sin(fish.phase * 9) * 0.18;
        this.actors.lineStyle(2, 0x8ee7f4, bodyAlpha * pulse);
        this.actors.strokeCircle(fish.x, fish.y, fish.radius + scaledEntity(7));
      }
      if (attacking) {
        const markerAlpha = Math.max(0.35, threat) * alpha;
        const markerY = fish.y - fish.radius - scaledEntity(18) - Math.sin(fish.phase * 7) * scaledEntity(2);
        this.actors.fillStyle(0xff4f64, markerAlpha);
        this.actors.fillTriangle(fish.x, markerY, fish.x - scaledEntity(6), markerY - scaledEntity(12), fish.x + scaledEntity(6), markerY - scaledEntity(12));
        this.actors.fillRect(fish.x - scaledEntity(2), markerY - scaledEntity(9), scaledEntity(4), scaledEntity(8));
        this.actors.fillCircle(fish.x, markerY + scaledEntity(1), scaledEntity(2));
        if (threat > 0) {
          this.actors.lineStyle(2, 0xff4f64, threat * 0.72);
          this.actors.strokeCircle(fish.x, fish.y, fish.radius + scaledEntity(11) + Math.sin(fish.phase * 8) * scaledEntity(3));
        }
      }
      if (fish.scan > 0 && !fish.scanned) {
        this.actors.lineStyle(3, 0xb9f27c, 0.35 + fish.scan * 0.5);
        this.actors.beginPath();
        this.actors.arc(fish.x, fish.y, fish.radius + scaledEntity(9), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fish.scan);
        this.actors.strokePath();
      }
      if (fish.scanPulse > 0) {
        this.actors.lineStyle(2, 0xb9f27c, fish.scanPulse * 0.75);
        this.actors.strokeCircle(fish.x, fish.y, fish.radius + scaledEntity(7 + (1 - fish.scanPulse) * 14));
      }
    }
  }

  private drawFlora(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;
    for (const flora of this.flora) {
      if (flora.dead) {
        flora.sprite?.setVisible(false);
        continue;
      }
      if (flora.x < view.x - 60 || flora.x > view.right + 60 || flora.y < view.y - 60 || flora.y > view.bottom + 60) {
        flora.sprite?.setVisible(false);
        continue;
      }
      const alpha = state.depth < 180 || Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y) < lightRadius() + 120
        ? 0.98
        : flora.scanned ? 0.72 : 0.42;
      const sway = Math.sin(flora.phase * 2.1) * scaledEntity(4);
      fitImageHeight(flora.sprite, flora.radius * (flora.rare ? 4.7 : 4));
      flora.sprite
        ?.setTexture(flora.assetKey)
        .setVisible(true)
        .setAlpha(alpha)
        .setPosition(flora.x + sway, flora.y)
        .setRotation(Math.sin(flora.phase * 1.4) * 0.035)
        .setOrigin(0.5, 0.82);
      if (flora.hurtFlash > 0) {
        this.actors.lineStyle(2, 0xfff7df, flora.hurtFlash * alpha);
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + scaledEntity(5));
      }
      if (flora.hazardous) {
        this.actors.lineStyle(1, 0xff4f64, 0.35 + (flora.rare ? 0.25 : 0));
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + scaledEntity(5) + Math.sin(flora.phase * 5) * scaledEntity(2));
      }
      if (flora.scan > 0 && !flora.scanned) {
        this.actors.lineStyle(3, 0xb9f27c, 0.35 + flora.scan * 0.5);
        this.actors.beginPath();
        this.actors.arc(flora.x, flora.y, flora.radius + scaledEntity(9), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * flora.scan);
        this.actors.strokePath();
      }
      if (flora.scanPulse > 0) {
        this.actors.lineStyle(2, 0xb9f27c, flora.scanPulse * 0.75);
        this.actors.strokeCircle(flora.x, flora.y, flora.radius + scaledEntity(7 + (1 - flora.scanPulse) * 14));
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
    if (!onCamera) return fish.scanned ? 0.34 : 0;
    if (state.depth < 180) return fish.scanned ? 1 : 0.96;

    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
    const fullyVisibleAt = lightRadius() * 0.92;
    const goneAt = lightRadius() + 210;
    if (distance <= fullyVisibleAt) return fish.scanned ? 1 : 0.94;
    if (fish.scanned) return 0.7;
    const fade = 1 - Phaser.Math.Clamp((distance - fullyVisibleAt) / (goneAt - fullyVisibleAt), 0, 1);
    return fade * 0.84;
  }

  private drawPlayer() {
    if (state.pilotingSub && state.activeSub) {
      this.playerSprite.setVisible(false);
      return;
    }
    const p = this.player;
    const angle = p.facing.angle();
    const s = PLAYER_DRAW_SCALE;
    const swimSpeed = Math.hypot(p.vx, p.vy);
    const animation = diverAnimation(p.vx, p.vy, swimSpeed, p.mineCooldown, state.lost);
    const pose = diverPose(animation, angle, p.facingSign);
    const origin = diverOrigin(animation, p.facingSign);
    const frame = diverFrame(animation, performance.now() * 0.001, swimSpeed, p.mineCooldown);
    this.playerSprite
      .setTexture(`diver-${animation}-${frame}`)
      .setVisible(true)
      .setPosition(p.x, p.y)
      .setOrigin(origin.x, origin.y)
      .setFlipX(pose.flipX)
      .setRotation(pose.rotation)
      .setAlpha(state.lost ? 0.45 : 1);
    fitImageWidth(this.playerSprite, diverDisplayWidth(animation) * s);
  }

  private drawSub() {
    const sub = state.activeSub;
    if (!sub || state.lost) {
      this.subSprite?.setVisible(false);
      this.auxSub?.sprite?.setVisible(false);
      this.cutterBeamSprite?.setVisible(false);
      return;
    }
    const carrier = state.carrierSub;
    if (carrier && this.auxSub?.sprite) {
      this.auxSub.sprite
        .setTexture(`sub-tier${carrier.tier}`)
        .setVisible(true)
        .setPosition(carrier.x, carrier.y)
        .setFlipX(carrier.facingSign < 0)
        .setRotation(Phaser.Math.Clamp(carrier.vy / Math.max(1, subDef(carrier.tier).speed), -0.28, 0.28) * (carrier.facingSign < 0 ? -1 : 1))
        .setAlpha(0.92);
      fitImageWidth(this.auxSub.sprite, scaledEntity(118));
    } else {
      this.auxSub?.sprite?.setVisible(false);
    }
    const def = subDef(sub.tier);
    const speed = Math.hypot(sub.vx, sub.vy);
    this.subSprite
      ?.setTexture(`sub-tier${sub.tier}`)
      .setVisible(true)
      .setPosition(sub.x, sub.y)
      .setFlipX(sub.facingSign < 0)
      .setRotation(Phaser.Math.Clamp(sub.vy / Math.max(1, def.speed), -0.38, 0.38) * (sub.facingSign < 0 ? -1 : 1))
      .setAlpha(sub.hull <= def.hull * 0.18 ? 0.72 + Math.sin(performance.now() * 0.018) * 0.16 : 1);
    fitImageWidth(this.subSprite, scaledEntity(sub.tier === 3 ? 118 : sub.tier === 2 ? 92 : 72));
    if (sub.boardProgress > 0) {
      const progress = sub.boardProgress / SUB_BOARD_SECONDS;
      this.actors.lineStyle(3, 0x73fbd3, 0.88);
      this.actors.beginPath();
      this.actors.arc(sub.x, sub.y - scaledEntity(34), scaledEntity(18), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      this.actors.strokePath();
    }
    if (speed > 14) {
      this.actors.fillStyle(0x49d8ff, 0.18);
      this.actors.fillEllipse(sub.x - sub.facingSign * scaledEntity(42), sub.y + scaledEntity(8), scaledEntity(28), scaledEntity(10));
    }
    if (state.pilotingSub && sub.tier >= 2 && this.drillingThisFrame) {
      const frame = Math.floor(performance.now() * 0.018) % 4;
      const reach = scaledEntity(112);
      const offset = scaledEntity(sub.tier === 3 ? 44 : 36);
      this.cutterBeamSprite
        ?.setTexture(`sub-cutter-beam-${frame}`)
        .setVisible(true)
        .setPosition(sub.x + this.player.facing.x * offset, sub.y + this.player.facing.y * offset)
        .setRotation(this.player.facing.angle())
        .setAlpha(0.86);
      if (this.cutterBeamSprite) {
        this.cutterBeamSprite.displayWidth = reach;
        this.cutterBeamSprite.displayHeight = scaledEntity(18);
      }
    } else {
      this.cutterBeamSprite?.setVisible(false);
    }
  }

  private drawDarkness(camera: Phaser.Cameras.Scene2D.Camera) {
    const darkness = darknessAtDepth();
    if (darkness <= 0) return;
    const view = camera.worldView;
    const left = view.x;
    const right = view.right;
    const top = view.y;
    const bottom = view.bottom;
    const cx = this.player.x;
    const cy = this.player.y;
    const dir = this.player.facing.clone().normalize();
    const normal = new Phaser.Math.Vector2(-dir.y, dir.x);
    const length = lightBeamLength();
    const nearWidth = 16;
    const farWidth = lightBeamHalfWidth();
    const haloRadius = 23;
    const beam = [
      new Phaser.Math.Vector2(cx + normal.x * nearWidth, cy + normal.y * nearWidth),
      new Phaser.Math.Vector2(cx + dir.x * length + normal.x * farWidth, cy + dir.y * length + normal.y * farWidth),
      new Phaser.Math.Vector2(cx + dir.x * length - normal.x * farWidth, cy + dir.y * length - normal.y * farWidth),
      new Phaser.Math.Vector2(cx - normal.x * nearWidth, cy - normal.y * nearWidth),
    ];

    this.darkness.fillStyle(0x000205, ambientDarknessOpacity(darkness));
    this.darkness.fillRect(left, top, view.width, view.height);

    const occlusion = darknessOpacity(darkness);
    this.darkness.fillStyle(0x000205, occlusion);
    const stripHeight = 4;
    for (let y = top; y < bottom; y += stripHeight) {
      const nextY = Math.min(y + stripHeight, bottom);
      const sampleY = (y + nextY) * 0.5;
      const litIntervals = this.lampIntervalsAtY(sampleY, beam, haloRadius, left, right);
      let cursor = left;
      for (const interval of litIntervals) {
        if (interval.left > cursor) this.darkness.fillRect(cursor, y, interval.left - cursor, nextY - y);
        cursor = Math.max(cursor, interval.right);
      }
      if (cursor < right) this.darkness.fillRect(cursor, y, right - cursor, nextY - y);
    }

    const edgeAlpha = Math.min(0.5, darkness * 0.34);
    this.lampGloom.lineStyle(8, 0x020509, edgeAlpha);
    this.lampGloom.lineBetween(beam[0].x, beam[0].y, beam[1].x, beam[1].y);
    this.lampGloom.lineBetween(beam[3].x, beam[3].y, beam[2].x, beam[2].y);
    this.lampGloom.lineStyle(2, 0x9fb3b8, 0.03 + state.upgrades.lamp * 0.008);
    this.lampGloom.lineBetween(beam[0].x, beam[0].y, beam[1].x, beam[1].y);
    this.lampGloom.lineBetween(beam[3].x, beam[3].y, beam[2].x, beam[2].y);
    this.lampGloom.lineStyle(4, 0x020509, Math.min(0.3, darkness * 0.18));
    this.lampGloom.strokeCircle(cx, cy, haloRadius);
  }

  private lampIntervalsAtY(
    sampleY: number,
    beam: Phaser.Math.Vector2[],
    haloRadius: number,
    left: number,
    right: number,
  ): Array<{ left: number; right: number }> {
    const intervals: Array<{ left: number; right: number }> = [];
    const haloDy = sampleY - this.player.y;
    if (Math.abs(haloDy) < haloRadius) {
      const halfWidth = Math.sqrt(haloRadius * haloRadius - haloDy * haloDy);
      intervals.push({
        left: Phaser.Math.Clamp(this.player.x - halfWidth, left, right),
        right: Phaser.Math.Clamp(this.player.x + halfWidth, left, right),
      });
    }

    for (const flare of this.flares) {
      const flareDy = sampleY - flare.y;
      const t = Phaser.Math.Clamp(flare.age / flare.life, 0, 1);
      const radius = FLARE_LIGHT_RADIUS * (1 - Phaser.Math.SmoothStep(t, 0.72, 1));
      if (radius <= 8 || Math.abs(flareDy) >= radius) continue;
      const halfWidth = Math.sqrt(radius * radius - flareDy * flareDy);
      intervals.push({
        left: Phaser.Math.Clamp(flare.x - halfWidth, left, right),
        right: Phaser.Math.Clamp(flare.x + halfWidth, left, right),
      });
    }

    for (const item of this.looseItems) {
      if (item.utility !== 'flare' || item.landed) continue;
      const flareDy = sampleY - item.y;
      const radius = FLARE_LIGHT_RADIUS * 0.62;
      if (Math.abs(flareDy) >= radius) continue;
      const halfWidth = Math.sqrt(radius * radius - flareDy * flareDy);
      intervals.push({
        left: Phaser.Math.Clamp(item.x - halfWidth, left, right),
        right: Phaser.Math.Clamp(item.x + halfWidth, left, right),
      });
    }

    for (const room of this.specialRooms) {
      if (room.kind !== 'biolume') continue;
      const dy = (sampleY - room.y) / room.ry;
      if (Math.abs(dy) >= 1) continue;
      const halfWidth = room.rx * Math.sqrt(1 - dy * dy) * 1.04;
      intervals.push({
        left: Phaser.Math.Clamp(room.x - halfWidth, left, right),
        right: Phaser.Math.Clamp(room.x + halfWidth, left, right),
      });
    }

    const intersections: number[] = [];
    for (let i = 0; i < beam.length; i += 1) {
      const a = beam[i];
      const b = beam[(i + 1) % beam.length];
      if (a.y === b.y) continue;
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      if (sampleY < minY || sampleY >= maxY) continue;
      const t = (sampleY - a.y) / (b.y - a.y);
      intersections.push(Phaser.Math.Linear(a.x, b.x, t));
    }

    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length - 1; i += 2) {
      const intervalLeft = Phaser.Math.Clamp(intersections[i], left, right);
      const intervalRight = Phaser.Math.Clamp(intersections[i + 1], left, right);
      if (intervalRight > intervalLeft) intervals.push({ left: intervalLeft, right: intervalRight });
    }

    intervals.sort((a, b) => a.left - b.left);
    const merged: Array<{ left: number; right: number }> = [];
    for (const interval of intervals) {
      const previous = merged[merged.length - 1];
      if (previous && interval.left <= previous.right) {
        previous.right = Math.max(previous.right, interval.right);
      } else {
        merged.push(interval);
      }
    }
    return merged;
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

  private playtestWorldSurvey() {
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

  private playtestReachableWater() {
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
