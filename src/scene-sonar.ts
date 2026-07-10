import Phaser from 'phaser';
import type { SonarContact } from './types';
import { audioKeys,audioVolumes,SONAR_ATTRACT_RADIUS,SONAR_COOLDOWN,SONAR_FUEL_COST,SONAR_REVEAL_RADIUS_TILES,TILE,WORLD_H,WORLD_W } from './constants';
import { state } from './state';
import { finaleLocksSurvey,sonarKey } from './helpers';
import { openSonarMapFromTool,renderHud } from './hud';
import type { DeepdiveScene } from './scene';

export function sonarPing(this: DeepdiveScene, ) {
    if (state.lost || finaleLocksSurvey() || !state.started) return;
    if (state.unlockedTools.sonar) state.selectedTool = 'sonar';
    const openedChart = openSonarMapFromTool();
    if (this.player.sonarCooldown > 0) return;
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
      if (fish.behaviorClass === 'sessileAttached') {
        fish.aggroCue = Math.max(fish.aggroCue, 0.9);
        attracted += 1;
        continue;
      }
      fish.aggro = Math.max(fish.aggro, 4.4);
      if (fish.behaviorClass === 'legacySwimmer' || !fish.behaviorClass) {
        fish.homeX = Phaser.Math.Linear(fish.homeX, this.player.x, 0.12);
        fish.homeY = Phaser.Math.Linear(fish.homeY, this.player.y, 0.12);
      }
      attracted += 1;
    }
    for (const creature of this.articulatedCreatures) {
      if (creature.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, creature.x, creature.y);
      if (distance > SONAR_ATTRACT_RADIUS + creature.radius) continue;
      creature.aggro = Math.max(creature.aggro, 5.2);
      creature.homeX = Phaser.Math.Linear(creature.homeX, this.player.x, 0.08);
      creature.homeY = Phaser.Math.Linear(creature.homeY, this.player.y, 0.08);
      if (creature.state === 'patrol') creature.state = 'stalk';
      attracted += 1;
    }
    this.requestSonarMapDraw();
    state.status = attracted > 0
      ? `Sonar ping mapped nearby stone and drew ${attracted} hostile signal${attracted === 1 ? '' : 's'} closer.`
      : 'Sonar ping mapped nearby stone. No hostile signals answered.';
    if (openedChart) state.sonarMapOpen = true;
    renderHud();
    this.requestSonarMapDraw();
  }

export function captureSonarContacts(this: DeepdiveScene, ) {
    const contacts: SonarContact[] = [];
    for (const fish of this.fish) {
      if (fish.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, fish.x, fish.y);
      if (distance > SONAR_ATTRACT_RADIUS) continue;
      contacts.push({ x: fish.x, y: fish.y, kind: 'fish', hostile: fish.hostile, age: 0 });
    }
    for (const creature of this.articulatedCreatures) {
      if (creature.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, creature.x, creature.y);
      if (distance > SONAR_ATTRACT_RADIUS + creature.radius) continue;
      contacts.push({ x: creature.x, y: creature.y, kind: 'predator', hostile: true, age: 0 });
    }
    for (const flora of this.flora) {
      if (flora.dead) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, flora.x, flora.y);
      if (distance > SONAR_REVEAL_RADIUS_TILES * TILE) continue;
      contacts.push({ x: flora.x, y: flora.y, kind: 'flora', hostile: flora.hazardous, age: 0 });
    }
    state.sonarContacts = contacts.slice(-48);
  }

export function revealSonarAtPlayer(this: DeepdiveScene, radiusTiles: number) {
    this.revealSonarAtWorld(this.player.x, this.player.y, radiusTiles);
  }

export function revealSonarAtWorld(this: DeepdiveScene, worldX: number, worldY: number, radiusTiles: number) {
    const cx = Math.floor(worldX / TILE);
    const cy = Math.floor(worldY / TILE);
    let changed = false;
    for (let y = cy - radiusTiles; y <= cy + radiusTiles; y += 1) {
      for (let x = cx - radiusTiles; x <= cx + radiusTiles; x += 1) {
        if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 > radiusTiles ** 2) continue;
        const key = sonarKey(x, y);
        if (state.sonarRevealed.has(key)) continue;
        state.sonarRevealed.add(key);
        changed = true;
      }
    }
    if (changed) state.sonarRevealRevision += 1;
    this.requestSonarMapDraw();
  }
