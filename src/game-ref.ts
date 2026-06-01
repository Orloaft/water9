import Phaser from 'phaser';
import type { DeepdiveScene } from './scene';

let game: Phaser.Game | null = null;

export function setGame(instance: Phaser.Game | null): void {
  game = instance;
}

export function getGame(): Phaser.Game | null {
  return game;
}

export function gameScene(): DeepdiveScene | null {
  return (game?.scene.getScene('DeepdiveScene') as DeepdiveScene | null) ?? null;
}
