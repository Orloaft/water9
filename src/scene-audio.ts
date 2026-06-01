import Phaser from 'phaser';
import { audioKeys,audioVolumes } from './constants';
import { state } from './state';
import { oxygenMax } from './helpers';
import type { DeepdiveScene } from './scene';

export function updateAudio(this: DeepdiveScene, delta: number) {
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

export function ensureLoop(this: DeepdiveScene, kind: 'menu' | 'ambient' | 'mining' | 'oxygen') {
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

export function loopVolume(this: DeepdiveScene, kind: 'menu' | 'ambient' | 'mining' | 'oxygen') {
    if (kind === 'menu') return state.musicEnabled ? audioVolumes.menuTitle * state.musicVolume : 0;
    if (kind === 'ambient') return state.musicEnabled ? audioVolumes.ambient * state.musicVolume : 0;
    if (kind === 'mining' || kind === 'oxygen') return audioVolumes[kind] * state.sfxVolume;
    return audioVolumes[kind];
  }

export function setLoopVolume(this: DeepdiveScene, sound: Phaser.Sound.BaseSound, volume: number) {
    const adjustable = sound as Phaser.Sound.BaseSound & {
      setVolume?: (value: number) => Phaser.Sound.BaseSound;
      volume?: number;
    };
    if (adjustable.setVolume) adjustable.setVolume(volume);
    else adjustable.volume = volume;
  }

export function stopLoop(this: DeepdiveScene, kind: 'menu' | 'ambient' | 'mining' | 'oxygen') {
    const loopKey = `${kind}Loop` as const;
    const sound = this[loopKey];
    if (sound?.isPlaying) sound.stop();
    this[loopKey] = undefined;
  }

export function playDepthCall(this: DeepdiveScene, ) {
    if (state.atBoat || state.lost || state.won || state.paused) return;
    let key = 'audio-whale';
    if (state.biome >= 4 || state.depth >= 1450) key = 'audio-alien-growl';
    else if (state.biome >= 2 || state.depth >= 650) key = 'audio-crab-growl';
    this.playSfx(key, 0.58);
    if (Math.random() < 0.42) {
      this.playSfx(Math.random() < 0.5 ? 'audio-water' : 'audio-cavern', 0.18);
    }
  }

export function playSfx(this: DeepdiveScene, key: string, volume: number, config: Phaser.Types.Sound.SoundConfig = {}) {
    if (state.sfxVolume <= 0) return;
    this.sound.play(key, {
      ...config,
      volume: volume * state.sfxVolume,
    });
  }

