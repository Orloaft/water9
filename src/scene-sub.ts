import Phaser from 'phaser';
import type { ControlState,SubTier,SubVehicle } from './types';
import { BARGE_DOCK_Y,SUB_BOARD_SECONDS,SUB_FUEL_CELL,SUB_FUEL_COST,SUB_OXYGEN_CELL,SUB_OXYGEN_COST,TILE,WORLD_W } from './constants';
import { state } from './state';
import { createSubVehicle,mineCooldown,scaledEntity,scanReward,subDef,subRepairCost } from './helpers';
import { renderHud } from './hud';
import type { DeepdiveScene } from './scene';

export function buySub(this: DeepdiveScene, tier: SubTier) {
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

export function buySubFuel(this: DeepdiveScene, ) {
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

export function buySubOxygen(this: DeepdiveScene, ) {
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

export function repairSubHull(this: DeepdiveScene, ) {
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

export function canUseSubHatch(this: DeepdiveScene, ) {
    const sub = state.activeSub;
    if (!sub || state.docked || state.lost || state.won) return false;
    if (state.carrierSub && state.pilotingSub && sub.tier === 1) return this.canReturnScoutToCarrier(sub);
    if (state.pilotingSub) return true;
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, sub.x, sub.y) < scaledEntity(70);
  }

export function activateSubHatch(this: DeepdiveScene, ) {
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

export function deployScoutFromCarrier(this: DeepdiveScene, ) {
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

export function deploySelectedSub(this: DeepdiveScene, ) {
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

export function syncSubToPlayer(this: DeepdiveScene, ) {
    const sub = state.activeSub;
    if (!sub) return;
    this.player.x = sub.x;
    this.player.y = sub.y;
    this.player.vx = sub.vx;
    this.player.vy = sub.vy;
    this.player.facingSign = sub.facingSign;
  }

export function updateSubPilot(this: DeepdiveScene, delta: number, controls: ControlState) {
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

export function updateSubBoarding(this: DeepdiveScene, delta: number, controls: ControlState) {
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

export function canReturnScoutToCarrier(this: DeepdiveScene, sub: SubVehicle) {
    const carrier = state.carrierSub;
    if (!carrier || !state.pilotingSub || sub.tier !== 1) return false;
    return Phaser.Math.Distance.Between(sub.x, sub.y, carrier.x, carrier.y) < scaledEntity(92);
  }

export function completeScoutReturn(this: DeepdiveScene, scout: SubVehicle) {
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

export function completeSubHatch(this: DeepdiveScene, sub: SubVehicle) {
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

export function updateAuxSub(this: DeepdiveScene, delta: number) {
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

