import Phaser from 'phaser';
import './styles.css';
import { DeepdiveScene } from './scene';
import { setGame, gameScene } from './game-ref';
import { renderHud } from './hud';

function installPlaytestApi() {
  const isDev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV;
  if (!isDev) return;
  window.__AQUA_PLAYTEST__ = {
    snapshot: () => gameScene()?.playtestSnapshot() ?? null,
    command: (command, value) => gameScene()?.playtestCommand(command, value) ?? null,
    grantCredits: (amount) => gameScene()?.playtestCommand('grantCredits', amount) ?? null,
  };
}

renderHud();

const forceCanvasRenderer = new URLSearchParams(window.location.search).has('playtest');

const game = new Phaser.Game({
  type: forceCanvasRenderer ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b3741',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: 960,
    height: 640,
  },
  render: {
    antialias: false,
    pixelArt: true,
  },
  input: {
    gamepad: true,
  },
  scene: DeepdiveScene,
});

setGame(game);
installPlaytestApi();
