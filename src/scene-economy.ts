import Phaser from 'phaser';
import type { Biome,Quest,ShopItem,SpecialRoom,UpgradeId } from './types';
import { FUEL_REFILL_AMOUNT,SURFACE_Y,TILE,WORLD_W } from './constants';
import { upgrades } from './content';
import { state } from './state';
import { rng } from './rng';
import { activeQuest,bargeUpgradeCost,cargoCapacity,clearBleed,clearVenom,createConsumableItem,fuelMax,fuelRefillCost,questProgressSource,refillAtBoat,resetOxygenWarnings,restart,shopItem,subDef,upgradeCost,upgradeMax } from './helpers';
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
    this.revealSonarAtPlayer(8);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    renderHud();
  }

export function diveFromBarge(this: DeepdiveScene, ) {
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
    state.status = `${item.name} loaded into cargo slot ${state.selectedCargoIndex + 1}.`;
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
      : `${quest.title} accepted.`;
    renderHud();
    this.drawSonarMap();
  }

export function claimQuest(this: DeepdiveScene, id: string) {
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

export function travelToNextBiome(this: DeepdiveScene, ) {
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

export function updateQuestProgress(this: DeepdiveScene, ) {
    const quest = activeQuest();
    if (!quest || quest.completed || quest.claimed) return;
    quest.progress = Phaser.Math.Clamp(questProgressSource(quest) - quest.startValue, 0, quest.target);
    if (quest.progress < quest.target || quest.kind === 'nest') {
      if (quest.kind === 'nest' && this.hasActiveNestLocator()) this.drawSonarMap();
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
    this.drawSonarMap();
  }

export function completeNestQuest(this: DeepdiveScene, room: SpecialRoom) {
    const quest = activeQuest();
    if (!quest || quest.kind !== 'nest' || quest.completed || quest.claimed) return;
    quest.progress = 1;
    this.completeQuest(quest, `Nest extermination confirmed near ${Math.round(room.y / 6)} m. Return to the barge for contract payout.`);
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

