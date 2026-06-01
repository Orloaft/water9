import Phaser from 'phaser';
import type { SonarContact } from './types';
import { audioKeys,audioVolumes,BARGE_DOCK_Y,SONAR_ATTRACT_RADIUS,SONAR_COOLDOWN,SONAR_FUEL_COST,SONAR_REVEAL_RADIUS_TILES,TILE,WORLD_H,WORLD_W } from './constants';
import { state } from './state';
import { sonarKey } from './helpers';
import { renderHud } from './hud';
import type { DeepdiveScene } from './scene';

export function sonarPing(this: DeepdiveScene, ) {
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

export function captureSonarContacts(this: DeepdiveScene, ) {
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

export function revealSonarAtPlayer(this: DeepdiveScene, radiusTiles: number) {
    this.revealSonarAtWorld(this.player.x, this.player.y, radiusTiles);
  }

export function revealSonarAtWorld(this: DeepdiveScene, worldX: number, worldY: number, radiusTiles: number) {
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

