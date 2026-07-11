import Phaser from 'phaser';
import type { Biome,Quest,ShopItem,SpecialRoom,UpgradeId } from './types';
import { FORWARD_OUTPOST_FLORA_RADIUS,FORWARD_OUTPOST_MAX_CHARGE,FORWARD_OUTPOST_MIN_DEPTH,FORWARD_OUTPOST_OXYGEN_RADIUS,FORWARD_OUTPOST_OXYGEN_REFILL,FORWARD_OUTPOST_TERRAIN_RADIUS_TILES,FUEL_REFILL_AMOUNT,SURFACE_Y,TILE,WORLD_W } from './constants';
import { upgrades } from './content';
import { state } from './state';
import { rng } from './rng';
import { activeQuest,bargeUpgradeCost,biomeChartingProgress,canTravelToNextBiome,cargoCapacity,clearBleed,clearVenom,createConsumableItem,finaleLocksSurvey,fuelMax,fuelRefillCost,questProgressSource,refillAtBoat,resetOxygenWarnings,restart,shopItem,subDef,syncStoryProgress,upgradeCost,upgradeMax } from './helpers';
import { biomeName,openingRadioMessages,renderHud } from './hud';
import type { DeepdiveScene } from './scene';

export function buy(this: DeepdiveScene, id: UpgradeId) {
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

export function startRun(this: DeepdiveScene, ) {
    state.started = true;
    state.docked = true;
    state.atBoat = true;
    state.status = 'Barge lights are green. Choose Dive when you are ready to leave the deck.';
    state.radioMessages = openingRadioMessages();
    state.radioIndex = 0;
    state.radioOpen = true;
    resetOxygenWarnings();
    this.resetPlayerStart();
    // Generation may now yield between deterministic terrain units. Do not build the
    // terrain mask from a half-carved world; completion performs the same reveal.
    if (this.worldReady) this.revealSonarAtPlayer(8);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    renderHud();
  }

export function diveFromBarge(this: DeepdiveScene, ) {
    if (!state.started || !state.atBoat || state.lost || finaleLocksSurvey()) return;
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

export function buyFuel(this: DeepdiveScene, fullTank = false) {
    if (!state.atBoat) return;
    const missing = fuelMax() - state.fuel;
    if (missing <= 0 || state.credits < fuelRefillCost(fullTank)) return;
    const amount = fullTank ? missing : Math.min(FUEL_REFILL_AMOUNT, missing);
    state.credits -= fuelRefillCost(fullTank);
    state.fuel = Math.min(fuelMax(), state.fuel + amount);
    state.status = `Loaded ${Math.round(amount)} fuel into the cutter reserves.`;
    renderHud();
  }

export function buyShopItem(this: DeepdiveScene, id: ShopItem['id']) {
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
    if (id === 'stun-grenade') state.unlockedTools.stun = true;
    state.status = id === 'stun-grenade'
      ? `${item.name} loaded into cargo slot ${state.selectedCargoIndex + 1}. Stun tool fitted on key 6.`
      : `${item.name} loaded into cargo slot ${state.selectedCargoIndex + 1}.`;
    renderHud();
  }

export function acceptQuest(this: DeepdiveScene, id: string) {
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
      : quest.kind === 'forwardOutpost'
        ? 'Forward outpost kit loaded. In Biome 3, press F near oxygen flora and solid terrain below 900 m to establish a limited air pocket.'
        : `${quest.title} accepted.`;
    renderHud();
    this.requestSonarMapDraw();
  }

export function claimQuest(this: DeepdiveScene, id: string) {
    if (!state.atBoat) return;
    const quest = state.questBoard.find((entry) => entry.id === id);
    if (!quest || !quest.completed || quest.claimed) return;
    quest.claimed = true;
    state.credits += quest.reward;
    if (quest.grantsMarlinVoucher && !state.subOwned[2]) state.marlinVoucherAvailable = true;
    if (state.activeQuestId === quest.id) state.activeQuestId = '';
    state.status = quest.grantsMarlinVoucher && state.marlinVoucherAvailable
      ? `${quest.title} complete. ${quest.reward.toLocaleString()} credits transferred. Marlin fabrication voucher active: 12,000c discount.`
      : `${quest.title} complete. ${quest.reward.toLocaleString()} credits transferred.`;
    renderHud();
    this.requestSonarMapDraw();
  }

export function travelToNextBiome(this: DeepdiveScene, ) {
    const cost = bargeUpgradeCost();
    const charting = biomeChartingProgress();
    if (!state.atBoat || state.biome >= 4) return;
    if (!charting.complete) {
      state.status = `Charting incomplete: finish ${charting.missing} before the barge risks the next route.`;
      renderHud();
      return;
    }
    if (!canTravelToNextBiome()) {
      state.status = `Barge retrofit needs ${cost.toLocaleString()}c plus charting proof.`;
      renderHud();
      return;
    }
    syncStoryProgress(false);
    state.credits -= cost;
    state.depth = 0;
    state.maxDepth = 0;
    state.oreSoldCredits = 0;
    state.cargo = [];
    state.selectedCargoIndex = 0;
    state.fuel = fuelMax();
    state.sonarRevealed.clear();
    state.sonarRevealRevision += 1;
    resetOxygenWarnings();
    clearVenom();
    clearBleed();
    state.scannedSpecies.clear();
    state.sampledSpecies.clear();
    state.atBoat = true;
    state.docked = true;
    state.paused = false;
    state.logbookOpen = false;
    state.cargoOpen = false;
    state.bargeTab = 'services';
    state.activeQuestId = '';
    state.forwardOutpost.active = false;
    state.forwardOutpost.x = 0;
    state.forwardOutpost.y = 0;
    state.forwardOutpost.depth = 0;
    state.forwardOutpost.charge = 0;
    state.forwardOutpost.floraSpecies = '';
    state.carrierSub = null;
    const nextBiome = (state.biome + 1) as Biome;
    state.biome = nextBiome;
    syncStoryProgress();
    state.status = `Barge retrofitted. Welcome to ${biomeName()}.`;
    rng.seed = Math.floor(Math.random() * 1_000_000);
    refillAtBoat();
    this.scene.restart();
    renderHud();
  }

export function updateQuestProgress(this: DeepdiveScene, ) {
    const quest = activeQuest();
    if (!quest || quest.completed || quest.claimed) return;
    quest.progress = Phaser.Math.Clamp(questProgressSource(quest) - quest.startValue, 0, quest.target);
    if (quest.progress < quest.target || quest.kind === 'nest') {
      if (quest.kind === 'nest' && this.hasActiveNestLocator()) this.requestSonarMapDraw();
      return;
    }
    this.completeQuest(quest, `${quest.title} complete. Return to the barge to collect ${quest.reward.toLocaleString()} credits.`);
  }

export function completeQuest(this: DeepdiveScene, quest: Quest, status: string) {
    if (quest.completed || quest.claimed) return;
    quest.completed = true;
    quest.progress = quest.target;
    state.status = status;
    this.spawnFloatingText('Quest complete', 0xffd166);
    renderHud();
    this.requestSonarMapDraw();
  }

export function completeNestQuest(this: DeepdiveScene, room: SpecialRoom) {
    const quest = activeQuest();
    if (!quest || quest.kind !== 'nest' || quest.completed || quest.claimed) return;
    quest.progress = 1;
    this.completeQuest(quest, `Nest extermination confirmed near ${Math.round(room.y / 6)} m. Return to the barge for contract payout.`);
  }

export function canEstablishForwardOutpost(this: DeepdiveScene, ) {
    const quest = activeQuest();
    if (!quest || quest.kind !== 'forwardOutpost' || quest.completed || quest.claimed) return { ok: false, reason: 'Accept the forward outpost contract at the barge first.' };
    if (state.forwardOutpost.active) return { ok: false, reason: 'Only one prototype forward outpost can be active in this slice.' };
    if (state.biome !== 3) return { ok: false, reason: 'The prototype kit is calibrated for Midnight Trench / Biome 3 only.' };
    if (state.depth < FORWARD_OUTPOST_MIN_DEPTH) return { ok: false, reason: `Descend to at least ${FORWARD_OUTPOST_MIN_DEPTH} m before anchoring the air pocket.` };
    if (this.collides(this.player.x, this.player.y)) return { ok: false, reason: 'The module needs open water in front of the drilled pocket.' };
    const flora = this.nearestForwardOutpostFlora();
    if (!flora) return { ok: false, reason: 'Anchor near non-hazardous trench flora so the air tech has an oxygen seed.' };
    if (!this.hasForwardOutpostTerrainSupport()) return { ok: false, reason: 'Anchor beside solid terrain. Future drilling and pump-out rules will use this same support check.' };
    return { ok: true, flora };
  }

export function establishForwardOutpost(this: DeepdiveScene, ) {
    const validation = this.canEstablishForwardOutpost();
    if (!validation.ok) {
      const reason = validation.reason ?? 'Forward outpost cannot be established here.';
      state.status = reason;
      renderHud();
      return { ok: false, reason };
    }
    const flora = validation.flora!;
    state.forwardOutpost = {
      active: true,
      x: this.player.x,
      y: this.player.y,
      biome: state.biome,
      depth: state.depth,
      oxygenRadius: FORWARD_OUTPOST_OXYGEN_RADIUS,
      oxygenRate: FORWARD_OUTPOST_OXYGEN_REFILL,
      charge: FORWARD_OUTPOST_MAX_CHARGE,
      maxCharge: FORWARD_OUTPOST_MAX_CHARGE,
      floraSpecies: flora.species,
    };
    const quest = activeQuest();
    if (quest?.kind === 'forwardOutpost') {
      quest.progress = 1;
      this.completeQuest(quest, 'Forward air pocket established. This outpost can top up oxygen locally, but the barge remains the main base.');
    } else {
      state.status = 'Forward air pocket established.';
      renderHud();
    }
    return { ok: true, outpost: { ...state.forwardOutpost } };
  }

export function nearestForwardOutpostFlora(this: DeepdiveScene, ) {
    let nearest = null as { species: string; distance: number } | null;
    for (const flora of this.flora) {
      if (flora.dead || flora.hazardous) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y);
      if (distance > FORWARD_OUTPOST_FLORA_RADIUS) continue;
      if (!nearest || distance < nearest.distance) nearest = { species: flora.species, distance };
    }
    return nearest;
  }

export function hasForwardOutpostTerrainSupport(this: DeepdiveScene, ) {
    const centerTx = Math.floor(this.player.x / TILE);
    const centerTy = Math.floor(this.player.y / TILE);
    for (let y = centerTy - FORWARD_OUTPOST_TERRAIN_RADIUS_TILES; y <= centerTy + FORWARD_OUTPOST_TERRAIN_RADIUS_TILES; y += 1) {
      for (let x = centerTx - FORWARD_OUTPOST_TERRAIN_RADIUS_TILES; x <= centerTx + FORWARD_OUTPOST_TERRAIN_RADIUS_TILES; x += 1) {
        const distance = Math.hypot(x - centerTx, y - centerTy);
        if (distance <= 1 || distance > FORWARD_OUTPOST_TERRAIN_RADIUS_TILES) continue;
        if (this.getTile(x, y) !== 'water') return true;
      }
    }
    return false;
  }

export function hasActiveNestLocator(this: DeepdiveScene, ) {
    const quest = activeQuest();
    return Boolean(quest && quest.kind === 'nest' && quest.accepted && !quest.completed && !quest.claimed);
  }

export function nearestOpenNestRoom(this: DeepdiveScene, ) {
    let nearest: { room: SpecialRoom; distance: number } | null = null;
    for (const room of this.specialRooms) {
      if (room.kind !== 'nest' || room.rewardClaimed || room.failed) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, room.x, room.y);
      if (!nearest || distance < nearest.distance) nearest = { room, distance };
    }
    return nearest?.room ?? null;
  }
