import Phaser from 'phaser';
import type { BargeTab,Biome,CargoItem,FishSpecies,Flora,FloraSpecies,Quest,RadioMessage,ScanRarity,ShopItem,SubDef,SubTier,SubVehicle,TitlePanel,Upgrade,UpgradeId } from './types';
import { FUEL_REFILL_AMOUNT,SONAR_FUEL_COST,SUB_FUEL_COST,SUB_OXYGEN_COST } from './constants';
import { biomeFish,biomeFlora,shopItems,subDefs,upgrades } from './content';
import { state,ui } from './state';
import { activeQuest,bargeUpgradeCost,cargoCapacity,clampSelectedCargoIndex,fishAssetKey,fishRarity,floraAssetKey,floraRarity,fuelMax,fuelRefillCost,hullMax,lifeCatalogTotal,oxygenMax,rarityLabel,restart,subDef,subRepairCost,upgradeCost,upgradeMax } from './helpers';
import { gameScene } from './game-ref';

export function renderHud() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  bindUiEvents(app);
  if (!document.querySelector('#game')) {
    app.innerHTML = `
      <main class="shell">
        <section id="game"></section>
        <aside id="fps-tracker" class="fps-tracker">FPS --</aside>
        <aside id="title-screen" class="title-screen"></aside>
        <aside class="hud">
          <div id="gauges"></div>
        </aside>
        <aside id="barge-menu" class="barge-menu"></aside>
        <aside id="logbook" class="logbook"></aside>
        <aside id="pause-menu" class="pause-menu"></aside>
        <aside id="radio-dialogue" class="radio-dialogue"></aside>
      </main>
    `;
  }
  const gauges = document.querySelector<HTMLDivElement>('#gauges');
  const bargeMenu = document.querySelector<HTMLDivElement>('#barge-menu');
  const logbook = document.querySelector<HTMLDivElement>('#logbook');
  const pauseMenu = document.querySelector<HTMLDivElement>('#pause-menu');
  const radioDialogue = document.querySelector<HTMLDivElement>('#radio-dialogue');
  const shell = document.querySelector<HTMLElement>('.shell');
  const titleScreen = document.querySelector<HTMLElement>('#title-screen');
  if (!gauges || !bargeMenu || !logbook || !pauseMenu || !radioDialogue || !shell || !titleScreen) return;
  const logbookScrollTop = logbook.querySelector<HTMLDivElement>('.logbook__list')?.scrollTop ?? 0;
  const radioActive = state.radioOpen && state.started && !state.lost && !state.won;
  if (!canOpenCargoOverlay()) state.cargoOpen = false;
  const cargoActive = state.cargoOpen && canOpenCargoOverlay();
  shell.classList.toggle('is-title', !state.started);
  shell.classList.toggle('is-radio-modal', radioActive);
  shell.classList.toggle('is-cargo-open', cargoActive);
  titleScreen.classList.toggle('is-hidden', state.started);
  titleScreen.classList.toggle('is-options', state.titlePanel === 'options');
  titleScreen.classList.toggle('is-controls', state.titlePanel === 'controls');
  setStableHtml(titleScreen, state.started ? '' : titlePanel());
  const cargoValue = state.cargo.reduce((sum, item) => sum + item.value, 0);
  const sub = state.pilotingSub ? state.activeSub : null;
  const statusFlags = [
    state.venom.active ? `VENOMED: ${state.venom.source} toxin is draining hull integrity.` : '',
    state.bleed.active ? `BLEEDING x${state.bleed.stacks}: suit integrity is leaking for ${Math.ceil(state.bleed.duration)}s.` : '',
  ].filter(Boolean);
  const statusText = statusFlags.length ? `${statusFlags.join(' ')} ${state.status}` : state.status;
  gauges.innerHTML = `
    <div class="readout">
      <div><strong>${state.credits}</strong><span>Credits</span></div>
      <div><strong>${state.depth} m</strong><span>Depth</span></div>
      <div><strong>${state.maxDepth} m</strong><span>Record</span></div>
    </div>
    ${sonarPanel()}
    ${sub ? meter('Sub O2', sub.oxygen, subDef(sub.tier).oxygen, '#8ee7f4') : meter('Oxygen', state.oxygen, oxygenMax(), '#8ee7f4')}
    ${sub ? meter('Sub hull', sub.hull, subDef(sub.tier).hull, '#ff8a6b') : meter('Hull', state.hull, hullMax(), '#ff8a6b')}
    ${sub ? meter('Sub fuel', sub.fuel, subDef(sub.tier).fuel, '#ffd166') : meter('Fuel', state.fuel, fuelMax(), '#ffd166')}
    ${selectedItemChip()}
    ${subHatchControl()}
    ${meter('Cargo', state.cargo.length, cargoCapacity(), '#ffd166', `${state.cargo.length}/${cargoCapacity()} slots, ${cargoValue}c`)}
    ${cargoManifest()}
    <p class="status ${state.venom.active || state.bleed.active ? 'is-venomed' : ''}">${statusText}</p>
  `;
  renderGameOver(app);
  const bargeOpen = state.started && state.atBoat && !radioActive && !state.lost && !state.won;
  bargeMenu.classList.toggle('is-open', bargeOpen);
  setStableHtml(bargeMenu, bargeOpen ? bargeMenuPanel() : '');
  logbook.classList.toggle('is-open', state.logbookOpen && state.started && !radioActive);
  setStableHtml(logbook, state.logbookOpen && state.started && !radioActive ? logbookPanel() : '');
  const logbookList = logbook.querySelector<HTMLDivElement>('.logbook__list');
  if (logbookList) logbookList.scrollTop = logbookScrollTop;
  pauseMenu.classList.toggle('is-open', state.paused && state.started && !radioActive && !state.lost && !state.won);
  setStableHtml(pauseMenu, state.paused && state.started && !radioActive && !state.lost && !state.won ? pauseMenuPanel() : '');
  radioDialogue.classList.toggle('is-open', radioActive);
  setStableHtml(radioDialogue, radioActive ? radioDialoguePanel() : '');
  restoreControllerFocus();
  gameScene()?.drawSonarMap();
}

export let fpsSampleFrames = 0;
export let fpsTrackerTimer = 0;

export function updateFpsTracker(deltaMs: number) {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
  fpsSampleFrames += 1;
  fpsTrackerTimer += deltaMs;
  if (fpsTrackerTimer < 1000) return;
  const fps = Math.round(Math.min(60, (fpsSampleFrames * 1000) / fpsTrackerTimer));
  fpsSampleFrames = 0;
  fpsTrackerTimer = 0;
  const tracker = document.querySelector<HTMLElement>('#fps-tracker');
  if (!tracker) return;
  if (tracker.textContent !== `FPS ${fps}`) tracker.textContent = `FPS ${fps}`;
  tracker.classList.toggle('is-low', fps < 45);
}

export function renderGameOver(app: HTMLDivElement) {
  let modal = app.querySelector<HTMLElement>('#game-over');
  if (!state.lost) {
    modal?.remove();
    return;
  }
  if (!modal) {
    modal = document.createElement('aside');
    modal.id = 'game-over';
    modal.className = 'game-over';
    const shell = app.querySelector('.shell');
    if (!shell) return;
    shell.appendChild(modal);
  }
  modal.innerHTML = `
    <span>Dive failed</span>
    <h2>Helmet breach</h2>
    <p>You reached ${state.maxDepth.toLocaleString()} m in ${biomeName()} before the suit gave out.</p>
    <div class="game-over__stats">
      <strong>${state.credits.toLocaleString()}c</strong><small>credits banked</small>
      <strong>${state.scannedSpecies.size}/${lifeCatalogTotal()}</strong><small>lifeforms scanned</small>
    </div>
    <button data-restart>Restart run</button>
  `;
  gameScene()?.drawSonarMap();
}

export function setStableHtml(element: HTMLElement, html: string) {
  if (element.innerHTML !== html) element.innerHTML = html;
}

export function titlePanel() {
  const logo = `
    <div class="title-mark">
      <img class="title-logo" src="/assets/generated/water-9-title.svg" alt="Water 9">
    </div>
  `;
  if (state.titlePanel === 'options') {
    return `
      ${logo}
      <div class="title-subpanel">
        <div class="setting-row">
          <strong>Background music</strong>
          <button data-toggle-music data-focus-key="title-music">${state.musicEnabled ? 'On' : 'Off'}</button>
        </div>
        ${volumeRow('Music volume', 'music', state.musicVolume)}
        ${volumeRow('SFX volume', 'sfx', state.sfxVolume)}
        <div class="setting-row">
          <strong>Unhardcore</strong>
          <button data-toggle-unhardcore data-focus-key="title-unhardcore">${state.unhardcore ? 'On' : 'Off'}</button>
        </div>
      </div>
      <div class="title-actions">
        <button class="title-button" data-title-panel="main" data-focus-key="title-back">Back</button>
      </div>
    `;
  }
  if (state.titlePanel === 'controls') {
    return `
      ${logo}
      <div class="title-subpanel title-controls">
        <div><strong>Move</strong><span>WASD / arrows / left stick</span></div>
        <div><strong>Dive / mine</strong><span>Space / A / right trigger</span></div>
        <div><strong>Scan</strong><span>Hold E / X</span></div>
        <div><strong>Sonar</strong><span>Q / left bumper</span></div>
        <div><strong>Use item</strong><span>G / right bumper</span></div>
        <div><strong>Logbook</strong><span>L / Y</span></div>
        <div><strong>Pause</strong><span>Esc, P / Start</span></div>
      </div>
      <div class="title-actions">
        <button class="title-button" data-title-panel="main" data-focus-key="title-back">Back</button>
      </div>
    `;
  }
  return `
    ${logo}
    <div class="title-actions title-actions--main">
      <button class="title-button title-play" data-start-game data-focus-key="title-play">Play</button>
      <button class="title-button" data-title-panel="options" data-focus-key="title-options">Options</button>
      <button class="title-button" data-title-panel="controls" data-focus-key="title-controls">Controls</button>
    </div>
  `;
}

export function openingRadioMessages(): RadioMessage[] {
  return [
    {
      speaker: 'Dr. Vale',
      role: 'Geology channel',
      text: 'Barge receiver is live. Bring up any ore, alloy, or strange mineral you cut free and my lab will buy it by weight.',
      from: 'npc',
    },
    {
      speaker: 'You',
      role: 'Diver channel',
      text: 'Copy that. If it shines, crumbles, or hums in a way I do not like, it goes in the cargo grid.',
      from: 'player',
    },
    {
      speaker: 'Dr. Sato',
      role: 'Marine biology channel',
      text: 'I am paying for detailed scans of local fauna and flora. Hold the scanner steady until the catalog confirms the lifeform.',
      from: 'npc',
    },
    {
      speaker: 'You',
      role: 'Diver channel',
      text: 'Understood. I will scan before I poke anything with teeth, tendrils, or suspicious confidence.',
      from: 'player',
    },
    {
      speaker: 'Dr. Vale',
      role: 'Barge uplink',
      text: 'Good. Barge shop is unlocked, oxygen is nominal, and the first trench is yours. Dive when ready.',
      from: 'npc',
    },
  ];
}

export function radioDialoguePanel() {
  const message = state.radioMessages[state.radioIndex];
  if (!message) return '';
  const final = state.radioIndex >= state.radioMessages.length - 1;
  const from = message.from ?? 'npc';
  const portrait = from === 'player'
    ? '<img src="/assets/generated/diver-idle-0.png" alt="">'
    : '<img src="/assets/generated/dialogue-radio-portrait.png" alt="">';
  return `
    <div class="radio-dialogue__panel radio-dialogue__panel--${from}">
      <div class="radio-dialogue__portrait">
        ${portrait}
      </div>
      <div class="radio-dialogue__body">
        <span>${message.role}</span>
        <strong>${message.speaker}</strong>
        <p>${message.text}</p>
      </div>
      <button data-radio-next data-focus-key="radio-next">${final ? 'Resume' : 'Continue'}</button>
    </div>
  `;
}

export function advanceRadioDialogue() {
  if (!state.radioOpen) return;
  state.radioIndex += 1;
  if (state.radioIndex >= state.radioMessages.length) {
    state.radioOpen = false;
    state.radioIndex = 0;
  }
}

export function volumeRow(label: string, kind: 'music' | 'sfx', value: number) {
  return `
    <div class="setting-row">
      <strong>${label}</strong>
      <div class="volume-control">
        <button data-audio-adjust="${kind}" data-delta="-0.1" data-focus-key="title-${kind}-down">-</button>
        <span>${Math.round(value * 100)}%</span>
        <button data-audio-adjust="${kind}" data-delta="0.1" data-focus-key="title-${kind}-up">+</button>
      </div>
    </div>
  `;
}

export function toggleLogbook() {
  const opening = !state.logbookOpen;
  state.logbookOpen = opening;
  if (opening) {
    state.paused = false;
    state.cargoOpen = false;
  }
  renderHud();
}

export let fullscreenWarningTimeout: number | undefined;

export function showFullscreenWarning(title: string, detail: string, severity: 'low' | 'critical') {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  let warning = app.querySelector<HTMLElement>('#fullscreen-warning');
  if (!warning) {
    warning = document.createElement('aside');
    warning.id = 'fullscreen-warning';
    app.appendChild(warning);
  }
  warning.className = `fullscreen-warning fullscreen-warning--${severity}`;
  warning.innerHTML = `
    <span>${detail}</span>
    <strong>${title}</strong>
  `;
  warning.classList.remove('is-fading');
  window.clearTimeout(fullscreenWarningTimeout);
  fullscreenWarningTimeout = window.setTimeout(() => {
    warning?.classList.add('is-fading');
  }, severity === 'critical' ? 4200 : 2600);
}

export function clearFullscreenWarning() {
  window.clearTimeout(fullscreenWarningTimeout);
  fullscreenWarningTimeout = undefined;
  document.querySelector('#fullscreen-warning')?.remove();
}

export function canDiveFromBargeShortcut() {
  return state.started && state.docked && state.atBoat && !state.radioOpen && !state.logbookOpen && !state.paused && !state.lost && !state.won;
}

export function canOpenCargoOverlay() {
  return state.started && !state.atBoat && !state.docked && !state.radioOpen && !state.logbookOpen && !state.paused && !state.lost && !state.won;
}

export function setCargoOverlay(open: boolean) {
  const nextOpen = open && canOpenCargoOverlay();
  if (state.cargoOpen === nextOpen) return;
  state.cargoOpen = nextOpen;
  renderHud();
}

export function moveCargoSelection(delta: number) {
  if (!state.cargoOpen || !canOpenCargoOverlay()) return;
  const capacity = cargoCapacity();
  if (capacity <= 0) return;
  const next = Phaser.Math.Wrap(state.selectedCargoIndex + delta, 0, capacity);
  if (next === state.selectedCargoIndex) return;
  state.selectedCargoIndex = next;
  renderHud();
}

export let achievementTimeout: number | undefined;
export let achievementRemoveTimeout: number | undefined;

export function unlockAchievement(title: string, detail: string) {
  if (state.achievements.has(title)) return;
  state.achievements.add(title);
  showAchievement(title, detail);
}

export function showAchievement(title: string, detail: string) {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  let toast = app.querySelector<HTMLElement>('#achievement-toast');
  if (!toast) {
    toast = document.createElement('aside');
    toast.id = 'achievement-toast';
    toast.className = 'achievement-toast';
    app.appendChild(toast);
  }
  toast.innerHTML = `
    <span>Achievement unlocked</span>
    <strong>${title}</strong>
    <p>${detail}</p>
  `;
  toast.classList.remove('is-fading');
  window.clearTimeout(achievementTimeout);
  window.clearTimeout(achievementRemoveTimeout);
  achievementTimeout = window.setTimeout(() => {
    toast?.classList.add('is-fading');
    achievementRemoveTimeout = window.setTimeout(() => toast?.remove(), 700);
  }, 10000);
}

export function bindUiEvents(app: HTMLDivElement) {
  if (ui.eventsBound) return;
  ui.eventsBound = true;
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Tab') return;
    const buttons = activeMenuButtons();
    event.preventDefault();
    event.stopPropagation();
    if (!buttons.length) {
      setCargoOverlay(true);
      return;
    }
    focusAdjacentMenuButton(event.shiftKey ? -1 : 1, buttons);
  }, true);
  window.addEventListener('keyup', (event) => {
    if (event.code !== 'Tab') return;
    if (!state.cargoOpen) return;
    event.preventDefault();
    event.stopPropagation();
    setCargoOverlay(false);
  }, true);
  window.addEventListener('keydown', (event) => {
    if (!state.cargoOpen || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(event.code)) return;
    let delta = 0;
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') delta = -1;
    else if (event.code === 'ArrowRight' || event.code === 'KeyD') delta = 1;
    else if (event.code === 'ArrowUp' || event.code === 'KeyW') delta = -6;
    else if (event.code === 'ArrowDown' || event.code === 'KeyS') delta = 6;
    else return;
    event.preventDefault();
    event.stopPropagation();
    moveCargoSelection(delta);
  }, true);
  window.addEventListener('keydown', (event) => {
    if ((event.code !== 'Enter' && event.code !== 'Space') || event.repeat) return;
    const buttons = activeMenuButtons();
    if (!buttons.length) return;
    const active = document.activeElement instanceof HTMLButtonElement && buttons.includes(document.activeElement)
      ? document.activeElement
      : focusMenuButton(buttons, ui.focusKey);
    if (!active) return;
    event.preventDefault();
    event.stopPropagation();
    if (state.radioOpen && state.started && !state.lost && !state.won) {
      advanceRadioDialogue();
      renderHud();
      return;
    }
    activateMenuButton(active);
  }, true);
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.repeat || !canDiveFromBargeShortcut()) return;
    event.preventDefault();
    event.stopPropagation();
    gameScene()?.diveFromBarge();
  }, true);
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyG' || event.repeat || state.docked || state.paused || state.logbookOpen || state.radioOpen || !state.started || state.lost || state.won) return;
    event.preventDefault();
    event.stopPropagation();
    gameScene()?.useSelectedItem();
  }, true);
  app.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('.hud, .barge-menu, .logbook, .pause-menu, .radio-dialogue, .title-screen, .game-over')) {
      event.stopPropagation();
    }
    if (state.radioOpen && state.started && !state.lost && !state.won) {
      const radioHit = target.closest<HTMLElement>('#radio-dialogue.is-open');
      if (radioHit) {
        event.preventDefault();
        advanceRadioDialogue();
        renderHud();
      }
      return;
    }
    const upgradeButton = target.closest<HTMLButtonElement>('button[data-upgrade]');
    if (upgradeButton && !upgradeButton.disabled) {
      event.preventDefault();
      gameScene()?.buy(upgradeButton.dataset.upgrade as UpgradeId);
      return;
    }
    const startButton = target.closest<HTMLButtonElement>('button[data-start-game]');
    if (startButton && !startButton.disabled) {
      event.preventDefault();
      gameScene()?.startRun();
      return;
    }
    const titlePanelButton = target.closest<HTMLButtonElement>('button[data-title-panel]');
    if (titlePanelButton && !titlePanelButton.disabled) {
      event.preventDefault();
      state.titlePanel = titlePanelButton.dataset.titlePanel as TitlePanel;
      renderHud();
      return;
    }
    const musicButton = target.closest<HTMLButtonElement>('button[data-toggle-music]');
    if (musicButton) {
      event.preventDefault();
      state.musicEnabled = !state.musicEnabled;
      renderHud();
      return;
    }
    const volumeButton = target.closest<HTMLButtonElement>('button[data-audio-adjust]');
    if (volumeButton) {
      event.preventDefault();
      const key = volumeButton.dataset.audioAdjust === 'music' ? 'musicVolume' : 'sfxVolume';
      const delta = Number(volumeButton.dataset.delta) || 0;
      state[key] = Phaser.Math.Clamp(Math.round((state[key] + delta) * 10) / 10, 0, 1);
      renderHud();
      return;
    }
    const unhardcoreButton = target.closest<HTMLButtonElement>('button[data-toggle-unhardcore]');
    if (unhardcoreButton) {
      event.preventDefault();
      state.unhardcore = !state.unhardcore;
      renderHud();
      return;
    }
    const diveButton = target.closest<HTMLButtonElement>('button[data-dive-from-barge]');
    if (diveButton && !diveButton.disabled) {
      event.preventDefault();
      gameScene()?.diveFromBarge();
      return;
    }
    const restartButton = target.closest<HTMLButtonElement>('button[data-restart]');
    if (restartButton && !restartButton.disabled) {
      event.preventDefault();
      const scene = gameScene();
      if (scene) restart(scene);
      return;
    }
    const pauseButton = target.closest<HTMLButtonElement>('button[data-pause]');
    if (pauseButton) {
      event.preventDefault();
      state.paused = !state.paused;
      if (state.paused) state.logbookOpen = false;
      renderHud();
      return;
    }
    const logbookButton = target.closest<HTMLButtonElement>('button[data-logbook]');
    if (logbookButton) {
      event.preventDefault();
      toggleLogbook();
      return;
    }
    const bargeTabButton = target.closest<HTMLButtonElement>('button[data-barge-tab]');
    if (bargeTabButton) {
      event.preventDefault();
      state.bargeTab = bargeTabButton.dataset.bargeTab as BargeTab;
      renderHud();
      return;
    }
    const buyItemButton = target.closest<HTMLButtonElement>('button[data-buy-item]');
    if (buyItemButton && !buyItemButton.disabled) {
      event.preventDefault();
      gameScene()?.buyShopItem(buyItemButton.dataset.buyItem as ShopItem['id']);
      return;
    }
    const acceptQuestButton = target.closest<HTMLButtonElement>('button[data-accept-quest]');
    if (acceptQuestButton && !acceptQuestButton.disabled) {
      event.preventDefault();
      gameScene()?.acceptQuest(acceptQuestButton.dataset.acceptQuest ?? '');
      return;
    }
    const claimQuestButton = target.closest<HTMLButtonElement>('button[data-claim-quest]');
    if (claimQuestButton && !claimQuestButton.disabled) {
      event.preventDefault();
      gameScene()?.claimQuest(claimQuestButton.dataset.claimQuest ?? '');
      return;
    }
    const subBuyButton = target.closest<HTMLButtonElement>('button[data-buy-sub]');
    if (subBuyButton && !subBuyButton.disabled) {
      event.preventDefault();
      gameScene()?.buySub(Number(subBuyButton.dataset.buySub) as SubTier);
      return;
    }
    const subFuelButton = target.closest<HTMLButtonElement>('button[data-buy-sub-fuel]');
    if (subFuelButton && !subFuelButton.disabled) {
      event.preventDefault();
      gameScene()?.buySubFuel();
      return;
    }
    const subOxygenButton = target.closest<HTMLButtonElement>('button[data-buy-sub-oxygen]');
    if (subOxygenButton && !subOxygenButton.disabled) {
      event.preventDefault();
      gameScene()?.buySubOxygen();
      return;
    }
    const subRepairButton = target.closest<HTMLButtonElement>('button[data-repair-sub]');
    if (subRepairButton && !subRepairButton.disabled) {
      event.preventDefault();
      gameScene()?.repairSubHull();
      return;
    }
    const subHatchButton = target.closest<HTMLButtonElement>('button[data-sub-hatch]');
    if (subHatchButton && !subHatchButton.disabled) {
      event.preventDefault();
      gameScene()?.activateSubHatch();
      return;
    }
    const deployScoutButton = target.closest<HTMLButtonElement>('button[data-deploy-scout]');
    if (deployScoutButton && !deployScoutButton.disabled) {
      event.preventDefault();
      gameScene()?.deployScoutFromCarrier();
      return;
    }
    const sonarButton = target.closest<HTMLButtonElement>('button[data-sonar]');
    if (sonarButton && !sonarButton.disabled) {
      event.preventDefault();
      gameScene()?.sonarPing();
      return;
    }
    const stunButton = target.closest<HTMLButtonElement>('button[data-stun]');
    if (stunButton && !stunButton.disabled) {
      event.preventDefault();
      gameScene()?.useSelectedItem();
      return;
    }
    const fuelButton = target.closest<HTMLButtonElement>('button[data-buy-fuel]');
    if (fuelButton && !fuelButton.disabled) {
      event.preventDefault();
      gameScene()?.buyFuel(fuelButton.dataset.buyFuel === 'full');
      return;
    }
    const goldButton = target.closest<HTMLButtonElement>('button[data-gold]');
    if (goldButton) {
      event.preventDefault();
      state.credits += 1000;
      state.status = 'Debug grant: +1,000 credits.';
      renderHud();
      return;
    }
    const travelButton = target.closest<HTMLButtonElement>('button[data-travel-biome]');
    if (travelButton && !travelButton.disabled) {
      event.preventDefault();
      const nextName = nextBiomeName();
      const ready = window.confirm(`Retrofit the barge for ${bargeUpgradeCost().toLocaleString()} credits and travel to ${nextName}? You will leave the current trench and enter a more dangerous biome.`);
      if (ready) gameScene()?.travelToNextBiome();
      return;
    }
    const discardButton = target.closest<HTMLButtonElement>('button[data-discard-cargo]');
    if (discardButton && !discardButton.disabled) {
      event.preventDefault();
      const index = Number(discardButton.dataset.discardCargo);
      state.selectedCargoIndex = index;
      gameScene()?.useSelectedItem();
      return;
    }
    const selectCargoButton = target.closest<HTMLButtonElement>('button[data-select-cargo]');
    if (selectCargoButton && !selectCargoButton.disabled) {
      event.preventDefault();
      state.selectedCargoIndex = Number(selectCargoButton.dataset.selectCargo) || 0;
      clampSelectedCargoIndex();
      renderHud();
      return;
    }
    const useCargoButton = target.closest<HTMLButtonElement>('button[data-use-selected-item]');
    if (useCargoButton && !useCargoButton.disabled) {
      event.preventDefault();
      gameScene()?.useSelectedItem();
      return;
    }
    const radioButton = target.closest<HTMLButtonElement>('button[data-radio-next]');
    if (radioButton) {
      event.preventDefault();
      advanceRadioDialogue();
      renderHud();
    }
  });
  app.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const buttons = activeMenuButtons();
    if (!buttons.includes(target)) return;
    clearControllerFocus();
    target.classList.add('is-controller-focus');
    ui.focusKey = menuButtonKey(target);
  });
}

export function activeMenuButtons() {
  const scopes = [
    '#title-screen:not(.is-hidden)',
    '.radio-dialogue.is-open',
    '.pause-menu.is-open',
    '.logbook.is-open',
    '.barge-menu.is-open',
    '.game-over',
  ];
  for (const scope of scopes) {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(`${scope} button:not(:disabled)`))
      .filter((button) => button.offsetParent !== null);
    if (buttons.length) return buttons;
  }
  return [];
}

export function focusUiButton(button: HTMLButtonElement) {
  ui.focusKey = menuButtonKey(button);
  if (button.classList.contains('is-controller-focus') && document.activeElement === button) return;
  clearControllerFocus();
  button.classList.add('is-controller-focus');
  if (document.activeElement !== button) button.focus({ preventScroll: true });
}

export function focusAdjacentMenuButton(direction: 1 | -1, buttons = activeMenuButtons()) {
  if (!buttons.length) return;
  const active = document.activeElement instanceof HTMLButtonElement && buttons.includes(document.activeElement)
    ? document.activeElement
    : focusMenuButton(buttons, ui.focusKey);
  const currentIndex = active ? buttons.indexOf(active) : direction > 0 ? -1 : 0;
  const nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
  focusUiButton(buttons[nextIndex]);
}

export function activateMenuButton(button: HTMLButtonElement) {
  button.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'mouse',
  }));
}

export function clearControllerFocus(resetKey = false) {
  document.querySelectorAll<HTMLButtonElement>('button.is-controller-focus').forEach((button) => {
    button.classList.remove('is-controller-focus');
  });
  if (resetKey) ui.focusKey = '';
}

export function restoreControllerFocus() {
  if (!ui.focusKey) return;
  const buttons = activeMenuButtons();
  const button = focusMenuButton(buttons, ui.focusKey);
  if (!button) {
    clearControllerFocus(true);
    return;
  }
  document.querySelectorAll<HTMLButtonElement>('button.is-controller-focus').forEach((focused) => {
    if (focused !== button) focused.classList.remove('is-controller-focus');
  });
  button.classList.add('is-controller-focus');
  if (document.activeElement !== button) button.focus({ preventScroll: true });
}

export function focusMenuButton(buttons: HTMLButtonElement[], key: string) {
  return buttons.find((button) => menuButtonKey(button) === key) ?? null;
}

export function nextMenuButton(buttons: HTMLButtonElement[], active: HTMLButtonElement, move: Phaser.Math.Vector2) {
  if (Math.abs(move.x) < 0.25 && Math.abs(move.y) < 0.25) return active;
  const activeRect = active.getBoundingClientRect();
  const ax = activeRect.left + activeRect.width * 0.5;
  const ay = activeRect.top + activeRect.height * 0.5;
  const horizontal = Math.abs(move.x) > Math.abs(move.y);
  const dirX = horizontal ? Math.sign(move.x) : 0;
  const dirY = horizontal ? 0 : Math.sign(move.y);
  let best = active;
  let bestScore = Infinity;

  for (const button of buttons) {
    if (button === active) continue;
    const rect = button.getBoundingClientRect();
    const bx = rect.left + rect.width * 0.5;
    const by = rect.top + rect.height * 0.5;
    const dx = bx - ax;
    const dy = by - ay;
    if (dirX && Math.sign(dx) !== dirX) continue;
    if (dirY && Math.sign(dy) !== dirY) continue;
    const primary = dirX ? Math.abs(dx) : Math.abs(dy);
    const secondary = dirX ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 2.2;
    if (score < bestScore) {
      best = button;
      bestScore = score;
    }
  }
  return best;
}

export function menuButtonKey(button: HTMLButtonElement) {
  return button.dataset.focusKey ??
    button.dataset.titlePanel ??
    button.dataset.audioAdjust ??
    button.dataset.bargeTab ??
    button.dataset.upgrade ??
    button.dataset.buySub ??
    button.dataset.buyItem ??
    button.dataset.acceptQuest ??
    button.dataset.claimQuest ??
    button.dataset.buyFuel ??
    button.dataset.selectCargo ??
    (button.dataset.subHatch !== undefined ? 'sub-hatch' : undefined) ??
    (button.dataset.deployScout !== undefined ? 'deploy-scout' : undefined) ??
    (button.dataset.useSelectedItem !== undefined ? 'use-selected-item' : undefined) ??
    (button.dataset.radioNext !== undefined ? 'radio-next' : undefined) ??
    button.dataset.discardCargo ??
    button.textContent?.trim() ??
    '';
}

export function availableUpgrades() {
  return upgrades.filter((upgrade) => upgrade.biome <= state.biome);
}

export function bargeMenuPanel() {
  return `
    <div class="barge-tabs">
      <button class="${state.bargeTab === 'services' ? 'is-active' : ''}" data-barge-tab="services" data-focus-key="barge-services">Barge</button>
      <button class="${state.bargeTab === 'items' ? 'is-active' : ''}" data-barge-tab="items" data-focus-key="barge-items">Items</button>
      <button class="${state.bargeTab === 'upgrades' ? 'is-active' : ''}" data-barge-tab="upgrades" data-focus-key="barge-upgrades">Upgrades</button>
      <button class="${state.bargeTab === 'subs' ? 'is-active' : ''}" data-barge-tab="subs" data-focus-key="barge-subs">Subs</button>
      <button class="${state.bargeTab === 'quests' ? 'is-active' : ''}" data-barge-tab="quests" data-focus-key="barge-quests">Quests</button>
      <button class="dive-button" data-dive-from-barge data-focus-key="barge-dive">Dive</button>
    </div>
    <div class="shop-title">
      <div>
        <span>Barge Dock</span>
        <strong>${state.bargeTab === 'upgrades' ? 'Upgrade console' : state.bargeTab === 'subs' ? 'Submersible bay' : state.bargeTab === 'items' ? 'Consumables market' : state.bargeTab === 'quests' ? 'Contract board' : 'Refit and resupply'}</strong>
      </div>
      <span>${state.scannedSpecies.size}/${lifeCatalogTotal()} scans</span>
    </div>
    ${state.bargeTab === 'upgrades' ? upgradeTabPanel() : state.bargeTab === 'subs' ? subShopPanel() : state.bargeTab === 'items' ? itemShopPanel() : state.bargeTab === 'quests' ? questTabPanel() : bargeServicesPanel()}
  `;
}

export function bargeServicesPanel() {
  return `
    <div class="dock-summary">
      <span>O2 and hull refilling</span>
      <span>Cargo sold automatically</span>
      <strong>${state.credits} credits</strong>
    </div>
    ${bargeFuelRow()}
    ${bargeTravelRow()}
  `;
}

export function itemShopPanel() {
  return `
    <section class="item-shop">
      <div class="item-shop__header">
        <div>
          <span>Consumables</span>
          <strong>${state.cargo.length}/${cargoCapacity()} cargo slots used</strong>
        </div>
        <strong>${state.credits.toLocaleString()}c</strong>
      </div>
      <div class="item-shop__grid">
        ${shopItems.map((item) => itemShopCard(item)).join('')}
      </div>
    </section>
  `;
}

export function itemShopCard(item: ShopItem) {
  const owned = state.cargo.filter((cargo) => cargo.id === item.id).length;
  const disabled = state.credits < item.cost || state.cargo.length >= cargoCapacity() || (item.kind === 'tool' && owned > 0);
  return `
    <article class="item-shop-card">
      <div class="item-shop-card__icon">
        <img src="/assets/generated/${item.icon}.png" alt="">
      </div>
      <div>
        <strong>${item.name}</strong>
        <span>${item.text}</span>
      </div>
      <small>${owned} loaded</small>
      <button data-buy-item="${item.id}" data-focus-key="buy-${item.id}" ${disabled ? 'disabled' : ''}>${item.kind === 'tool' && owned > 0 ? 'Loaded' : `${item.cost.toLocaleString()}c`}</button>
    </article>
  `;
}

export function questTabPanel() {
  const active = activeQuest();
  return `
    <section class="quest-board">
      <div class="quest-board__header">
        <div>
          <span>Available contracts</span>
          <strong>${active ? active.title : 'No active contract'}</strong>
        </div>
        <span>${state.questBoard.filter((quest) => quest.claimed).length}/${state.questBoard.length} paid</span>
      </div>
      <div class="quest-list">
        ${state.questBoard.map((quest) => questCard(quest, active)).join('')}
      </div>
    </section>
  `;
}

export function questCard(quest: Quest, active: Quest | null) {
  const isActive = active?.id === quest.id;
  const progress = Math.min(quest.target, quest.progress);
  const progressLabel = quest.kind === 'nest'
    ? quest.completed ? 'Nest cleared' : quest.accepted ? 'Locator active' : 'Not accepted'
    : `${Math.floor(progress).toLocaleString()}/${quest.target.toLocaleString()}`;
  const percent = quest.target > 0 ? Phaser.Math.Clamp(progress / quest.target, 0, 1) : 0;
  const canAccept = !quest.accepted && !quest.claimed && !active;
  const canClaim = quest.completed && !quest.claimed;
  return `
    <article class="quest-card ${quest.rare ? 'is-rare' : ''} ${isActive ? 'is-active' : ''}">
      <div class="quest-card__top">
        <div>
          <span>${quest.rare ? 'Rare contract' : quest.client}</span>
          <strong>${quest.title}</strong>
        </div>
        <em>${quest.reward.toLocaleString()}c</em>
      </div>
      <p>${quest.text}</p>
      <div class="quest-progress" aria-label="${progressLabel}">
        <i style="width: ${Math.round(percent * 100)}%"></i>
      </div>
      <div class="quest-card__actions">
        <span>${progressLabel}</span>
        ${quest.claimed
          ? '<button disabled>Paid</button>'
          : canClaim
            ? `<button data-claim-quest="${quest.id}" data-focus-key="claim-${quest.id}">Claim</button>`
            : `<button data-accept-quest="${quest.id}" data-focus-key="quest-${quest.id}" ${canAccept ? '' : 'disabled'}>${quest.accepted ? 'Active' : 'Accept'}</button>`}
      </div>
    </article>
  `;
}

export function sonarPanel() {
  return `
    <section class="sonar-panel">
      <div>
        <span>Sonar map</span>
        <strong>${state.sonarRevealed.size.toLocaleString()} cells</strong>
      </div>
      <canvas id="sonar-map" width="224" height="224" aria-label="Sonar minimap"></canvas>
      <button data-sonar ${state.fuel < SONAR_FUEL_COST ? 'disabled' : ''}>Ping ${SONAR_FUEL_COST} fuel</button>
    </section>
  `;
}

export function subHatchControl() {
  if (!state.activeSub || state.docked || state.lost || state.won) return '';
  const scene = gameScene();
  const disabled = scene?.canUseSubHatch() ? '' : 'disabled';
  const label = state.carrierSub ? 'Return scout' : state.pilotingSub ? 'Exit sub' : 'Enter sub';
  const scoutButton = state.pilotingSub && state.activeSub.tier === 3 && !state.carrierSub
    ? '<button class="sub-hatch-chip sub-hatch-chip--scout" data-deploy-scout data-focus-key="deploy-scout">Deploy scout</button>'
    : '';
  return `
    <div class="sub-action-stack">
      <button class="sub-hatch-chip" data-sub-hatch data-focus-key="sub-hatch" ${disabled}>${label}</button>
      ${scoutButton}
    </div>
  `;
}

export function logbookPanel() {
  const entries = [
    ...biomeFish[state.biome].map((species) => ({
      species: species.species,
      kind: species.hostile ? 'Predatory fauna' : 'Neutral fauna',
      rarity: fishRarity(species),
      scanned: state.scannedSpecies.has(species.species),
      imageKey: `${fishAssetKey(species)}-0`,
      info: fishLogbookInfo(species),
    })),
    ...biomeFlora[state.biome].map((species) => ({
      species: species.species,
      kind: species.hazardous ? 'Hazardous flora' : 'Flora',
      rarity: floraRarity(species),
      scanned: state.scannedSpecies.has(species.species),
      imageKey: floraAssetKey(species),
      info: floraLogbookInfo(species),
    })),
  ].sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || a.species.localeCompare(b.species));

  return `
    <div class="logbook__header">
      <div>
        <span>Current biome logbook</span>
        <strong>${biomeName()}</strong>
      </div>
      <button data-logbook aria-label="Close logbook">Close</button>
    </div>
    <div class="logbook__summary">
      <strong>${state.scannedSpecies.size}/${lifeCatalogTotal()}</strong>
      <span>cataloged lifeforms</span>
    </div>
    <div class="logbook__list">
      ${entries.map((entry) => `
        <article class="logbook-entry ${entry.scanned ? 'is-scanned' : ''}">
          <div class="logbook-entry__portrait">
            ${entry.scanned ? `<img src="/assets/generated/${entry.imageKey}.png" alt="">` : '<span>?</span>'}
          </div>
          <div>
            <strong>${entry.scanned ? entry.species : 'Unknown lifeform'}</strong>
            <span>${entry.kind}</span>
          </div>
          <i class="rarity rarity-${entry.rarity}">${rarityLabel(entry.rarity)}</i>
          <p>${entry.scanned ? entry.info : 'Scan this signal to reveal field notes and habits.'}</p>
        </article>
      `).join('')}
    </div>
  `;
}

export function pauseMenuPanel() {
  return `
    <div class="pause-menu__header">
      <span>Dive paused</span>
      <strong>${biomeName()}</strong>
    </div>
    <div class="pause-actions">
      <button data-pause>Resume</button>
      <button data-logbook>${state.logbookOpen ? 'Close logbook' : 'Open logbook'}</button>
      <button data-gold data-focus-key="pause-gold">+1k credits</button>
      <button data-restart>Restart run</button>
    </div>
    <section class="pause-controls">
      <h2>Keyboard and mouse</h2>
      <dl>
        <div><dt>Move</dt><dd>WASD / arrow keys</dd></div>
        <div><dt>Mine</dt><dd>Mouse button or Space</dd></div>
        <div><dt>Scan</dt><dd>Hold E</dd></div>
        <div><dt>Sub hatch</dt><dd>Hold F</dd></div>
        <div><dt>Deploy scout</dt><dd>H</dd></div>
        <div><dt>Sonar</dt><dd>Q</dd></div>
        <div><dt>Use item / sub weapon</dt><dd>G</dd></div>
        <div><dt>Logbook</dt><dd>L</dd></div>
        <div><dt>Pause</dt><dd>Esc / P</dd></div>
      </dl>
    </section>
    <section class="pause-controls">
      <h2>Controller</h2>
      <dl>
        <div><dt>Move</dt><dd>Left stick / D-pad</dd></div>
        <div><dt>Dive / Mine</dt><dd>A / right trigger</dd></div>
        <div><dt>Scan</dt><dd>Hold X</dd></div>
        <div><dt>Sub hatch</dt><dd>Hold B</dd></div>
        <div><dt>Deploy scout</dt><dd>Back / Select</dd></div>
        <div><dt>Sonar</dt><dd>Left bumper</dd></div>
        <div><dt>Use item / sub weapon</dt><dd>Right bumper</dd></div>
        <div><dt>Logbook</dt><dd>Y</dd></div>
        <div><dt>Pause</dt><dd>Start</dd></div>
      </dl>
    </section>
  `;
}

export function rarityRank(rarity: ScanRarity) {
  if (rarity === 'legendary') return 5;
  if (rarity === 'epic') return 4;
  if (rarity === 'rare') return 3;
  if (rarity === 'uncommon') return 2;
  return 1;
}

export function fishLogbookInfo(species: FishSpecies) {
  const temperament = species.hostile
    ? 'Will pursue diver noise, light, and close movement even after cataloging.'
    : 'Generally non-aggressive unless startled by close contact.';
  const depth = `${species.minY}-${species.maxY} m survey band`;
  const motion = species.pattern === 'school'
    ? 'travels in loose schools'
    : species.pattern === 'stalk'
      ? 'uses short pursuit bursts'
      : species.pattern === 'circle'
        ? 'patrols in looping territory'
        : species.pattern === 'glide'
          ? 'glides through open water'
          : 'drifts with slow current changes';
  return `${depth}. ${temperament} It ${motion}. ${lifeformQuote(species.species, species.hostile ? 'predator' : 'fauna')}`;
}

export function floraLogbookInfo(species: FloraSpecies) {
  const danger = species.hazardous
    ? 'Contact can damage the suit; approach from a stable hover.'
    : 'Safe to study at close range once anchored in the lamp cone.';
  return `${species.minY}-${species.maxY} m growth band. ${danger} ${lifeformQuote(species.species, species.hazardous ? 'hazard' : 'flora')}`;
}

export function lifeformQuote(species: string, kind: 'fauna' | 'predator' | 'flora' | 'hazard') {
  const speakers = ['Dr. Sato', 'Deckhand Mina', 'Chief Alvarez', 'Archivist Noor', 'Pilot Keene', 'Dr. Vale'];
  const lines = {
    fauna: [
      'It ignores the diver until the lamp gets impolite.',
      'Pretty from a distance, twitchy up close.',
      'The ocean keeps a calmer rhythm around these.',
    ],
    predator: [
      'If it turns with you, it has already chosen a side.',
      'Watch the pauses. The strike comes after the stillness.',
      'Every old helmet dent has a story like this.',
    ],
    flora: [
      'Good shelter for small life, and a fine warning that rock is near.',
      'It grows where the current slows down enough to whisper.',
      'Mark these on the chart. They make the dark feel less empty.',
    ],
    hazard: [
      'Beautiful things down here keep their knives hidden.',
      'Give it a meter more than pride suggests.',
      'The suit sensors hate this one before the diver does.',
    ],
  } satisfies Record<'fauna' | 'predator' | 'flora' | 'hazard', string[]>;
  const lineList = lines[kind];
  const line = lineList[stringIndex(`${species}-${kind}`, lineList.length)];
  const speaker = speakers[stringIndex(`${kind}-${species}`, speakers.length)];
  return `"${line}" - ${speaker}`;
}

export function stringIndex(value: string, modulo: number) {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) total = (total * 31 + value.charCodeAt(i)) >>> 0;
  return total % modulo;
}

export function roundMetric(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function bargeFuelRow() {
  const missing = fuelMax() - state.fuel;
  const fuelCost = fuelRefillCost(false);
  const fullCost = fuelRefillCost(true);
  const refuelDisabled = missing <= 0 || state.credits < fuelCost;
  const fullDisabled = missing <= 0 || state.credits < fullCost;
  return `
    <article class="fuel-card">
      <div>
        <strong>Cutter fuel</strong>
        <span>Mining and sonar consume fuel. Barge pumps sell reserves in measured cells.</span>
      </div>
      <div class="fuel-card__actions">
        <button data-buy-fuel="cell" ${refuelDisabled ? 'disabled' : ''}>+${FUEL_REFILL_AMOUNT} fuel ${fuelCost}c</button>
        <button data-buy-fuel="full" ${fullDisabled ? 'disabled' : ''}>Fill tank ${fullCost}c</button>
      </div>
    </article>
  `;
}

export function bargeTravelRow() {
  if (state.biome >= 4) {
    return `
      <article class="travel-card">
        <strong>Ancient Ruins</strong>
        <span>The drowned architects left vaults below the trench. Catalog the sentinel and escape with proof.</span>
      </article>
    `;
  }
  const cost = bargeUpgradeCost();
  const nextName = nextBiomeName();
  const description = state.biome === 1
    ? 'Unlocks advanced refits, hotter hazards, and richer minerals.'
    : state.biome === 2
      ? 'Adds hazardous flora, stronger vent fields, and anchorstone that cannot be mined.'
      : 'Opens ancient alien ruins, ruin alloys, and sentinel-class predators.';
  const disabled = state.credits < cost;
  return `
    <article class="travel-card">
      <div>
        <strong>Barge Retrofit</strong>
        <span>Travel to ${nextName}. ${description}</span>
      </div>
      <button data-travel-biome ${disabled ? 'disabled' : ''}>${cost.toLocaleString()}c</button>
    </article>
  `;
}

export function upgradeTabPanel() {
  return `
    <section class="upgrade-console is-open">
      <div class="upgrade-console__header">
        <div>
          <span>Upgrade Console</span>
          <strong>Diver refits</strong>
        </div>
        <strong>${state.credits.toLocaleString()}c</strong>
      </div>
      <div class="upgrade-grid">
        ${availableUpgrades().map((upgrade) => upgradeCard(upgrade)).join('')}
      </div>
    </section>
  `;
}

export function upgradeCard(upgrade: Upgrade) {
  const level = state.upgrades[upgrade.id];
  const max = upgradeMax(upgrade);
  const maxed = level >= max;
  const cost = upgradeCost(upgrade);
  const locked = upgrade.biome > state.biome;
  const disabled = locked || maxed || state.credits < cost;
  return `
    <article class="upgrade-card ${maxed ? 'is-maxed' : ''} ${locked ? 'is-locked' : ''}">
      <div class="upgrade-card__image">
        <img src="/assets/generated/${upgradeIconKey(upgrade.id)}.png" alt="">
      </div>
      <div class="upgrade-card__body">
        <strong>${upgrade.name}</strong>
        <span>Biome ${upgrade.biome}</span>
        <div class="upgrade-level" aria-label="${upgrade.name} level ${level} of ${max}">
          ${Array.from({ length: max }, (_, index) => `<i class="${index < level ? 'is-filled' : ''}"></i>`).join('')}
          <em>${level}/${max}</em>
        </div>
        <p>${upgrade.text}</p>
      </div>
      <button data-upgrade="${upgrade.id}" data-focus-key="upgrade-${upgrade.id}" ${disabled ? 'disabled' : ''}>
        ${locked ? 'Locked' : maxed ? 'Max' : `${cost.toLocaleString()}c`}
      </button>
    </article>
  `;
}

export function upgradeIconKey(id: UpgradeId) {
  if (id === 'oxygen') return 'upgrade-icon-oxygen';
  if (id === 'cargo') return 'upgrade-icon-cargo';
  if (id === 'laser') return 'upgrade-icon-laser';
  if (id === 'lamp') return 'upgrade-icon-lamp';
  if (id === 'scanner') return 'upgrade-icon-scanner';
  if (id === 'suit') return 'upgrade-icon-suit';
  if (id === 'speed') return 'upgrade-icon-speed';
  return 'upgrade-icon-thermal';
}

export function subShopPanel() {
  const active = state.activeSub;
  return `
    <section class="sub-shop">
      <div class="sub-shop__header">
        <div>
          <span>Submersibles</span>
          <strong>${active ? `${subDef(active.tier).name} bay status` : 'No active vehicle'}</strong>
        </div>
        <strong>${state.credits.toLocaleString()}c</strong>
      </div>
      <div class="sub-grid">
        ${subDefs.map((def) => subCard(def)).join('')}
      </div>
      ${active ? subServicePanel(active) : '<p class="sub-shop__empty">Buy a submersible to unlock sub oxygen, fuel, hull repair, and launch services.</p>'}
    </section>
  `;
}

export function subCard(def: SubDef) {
  const owned = state.subOwned[def.tier];
  const selected = state.selectedSubTier === def.tier;
  const affordable = state.credits >= def.cost;
  const buttonText = owned ? selected ? 'Selected' : 'Select' : `${def.cost.toLocaleString()}c`;
  return `
    <article class="sub-card ${selected ? 'is-selected' : ''}">
      <img src="/assets/generated/sub-tier${def.tier}.png" alt="">
      <div>
        <span>Tier ${def.tier}</span>
        <strong>${def.name}</strong>
        <p>${def.text}</p>
      </div>
      <dl>
        <div><dt>Hull</dt><dd>${def.hull}</dd></div>
        <div><dt>O2</dt><dd>${def.oxygen}</dd></div>
        <div><dt>Fuel</dt><dd>${def.fuel}</dd></div>
        <div><dt>Cargo</dt><dd>${def.cargo}</dd></div>
      </dl>
      <small>${def.features.join(' / ')}</small>
      <button data-buy-sub="${def.tier}" data-focus-key="sub-${def.tier}" ${!owned && !affordable ? 'disabled' : ''}>${buttonText}</button>
    </article>
  `;
}

export function subServicePanel(sub: SubVehicle) {
  const def = subDef(sub.tier);
  const repairCost = subRepairCost();
  return `
    <div class="sub-service">
      ${meter(`${def.name} hull`, sub.hull, def.hull, '#ff8a6b')}
      ${meter(`${def.name} O2`, sub.oxygen, def.oxygen, '#8ee7f4')}
      ${meter(`${def.name} fuel`, sub.fuel, def.fuel, '#ffd166')}
      <div class="sub-service__actions">
        <button data-buy-sub-oxygen ${sub.oxygen >= def.oxygen || state.credits < SUB_OXYGEN_COST ? 'disabled' : ''}>O2 tank ${SUB_OXYGEN_COST}c</button>
        <button data-buy-sub-fuel ${sub.fuel >= def.fuel || state.credits < SUB_FUEL_COST ? 'disabled' : ''}>Fuel cell ${SUB_FUEL_COST}c</button>
        <button data-repair-sub ${repairCost <= 0 || state.credits < repairCost ? 'disabled' : ''}>Repair ${repairCost.toLocaleString()}c</button>
      </div>
    </div>
  `;
}

export function biomeName() {
  if (state.biome === 1) return 'The Shallows';
  if (state.biome === 2) return 'Brine Vent Shelf';
  if (state.biome === 3) return 'Midnight Trench';
  return 'Ancient Ruins';
}

export function nextBiomeName() {
  if (state.biome === 1) return 'Brine Vent Shelf';
  if (state.biome === 2) return 'Midnight Trench';
  return 'Ancient Ruins';
}

export function meter(label: string, value: number, max: number, color: string, detail = `${Math.ceil(value)} / ${max}`) {
  const pct = Phaser.Math.Clamp((value / max) * 100, 0, 100);
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `
    <div class="meter-block meter-${slug}">
      <div><span>${label}</span><strong>${detail}</strong></div>
      <i><b style="width:${pct}%; background:${color}; color:${color}"></b></i>
    </div>
  `;
}

export function selectedItemChip() {
  clampSelectedCargoIndex();
  const item = state.cargo[state.selectedCargoIndex];
  const disabled = !item || state.docked;
  return `
    <div class="selected-item-chip">
      <div class="selected-item-chip__icon">
        ${item ? `<img src="/assets/generated/${item.icon}.png" alt="">` : '<span></span>'}
      </div>
      <div>
        <span>Selected item</span>
        <strong>${item ? item.name : 'Empty slot'}</strong>
      </div>
      <button data-use-selected-item data-focus-key="use-selected-item" ${disabled ? 'disabled' : ''}>${item ? selectedItemActionLabel(item) : 'Use'}</button>
    </div>
  `;
}

export function selectedItemActionLabel(item: CargoItem) {
  if (item.kind === 'consumable') return 'Use';
  return 'Drop';
}

export function cargoManifest() {
  const emptySlots = Math.max(0, cargoCapacity() - state.cargo.length);
  clampSelectedCargoIndex();
  const slots = Array.from({ length: cargoCapacity() }, (_, index) => inventorySlot(index)).join('');
  return `
    <section class="cargo-manifest ${state.cargoOpen ? 'is-open' : 'is-collapsed'}" aria-hidden="${state.cargoOpen ? 'false' : 'true'}">
      <div class="cargo-title">
        <span>Cargo Grid</span>
        <strong>${state.cargo.length}/${cargoCapacity()}</strong>
      </div>
      <div class="cargo-grid" style="--cargo-rows:${Math.ceil(cargoCapacity() / 6)}">
        ${slots}
      </div>
      <div class="cargo-detail">
        ${cargoDetail()}
        <span>${emptySlots} empty ${emptySlots === 1 ? 'slot' : 'slots'}</span>
      </div>
    </section>
  `;
}

export function inventorySlot(index: number) {
  const item = state.cargo[index];
  const selected = index === state.selectedCargoIndex;
  return `
    <button class="cargo-slot ${selected ? 'is-selected' : ''} ${item ? '' : 'is-empty'}" data-select-cargo="${index}" data-focus-key="cargo-${index}" aria-label="${item ? `${item.name}, slot ${index + 1}` : `Empty cargo slot ${index + 1}`}">
      ${item ? `<img src="/assets/generated/${item.icon}.png" alt="">${item.value > 0 ? `<b>${item.value.toLocaleString()}c</b>` : ''}` : ''}
    </button>
  `;
}

export function cargoDetail() {
  const item = state.cargo[state.selectedCargoIndex];
  if (!item) return '<strong>Empty slot</strong>';
  const kind = item.kind === 'consumable' ? 'Consumable' : item.kind === 'artifact' ? 'Artifact' : item.kind === 'ore' ? 'Ore' : 'Rubble';
  return `
    <strong>${item.name}</strong>
    <em>${kind}${item.value > 0 ? ` / ${item.value.toLocaleString()}c` : ''}</em>
  `;
}

export function upgradeRow(upgrade: Upgrade) {
  const level = state.upgrades[upgrade.id];
  const max = upgradeMax(upgrade);
  const maxed = level >= max;
  const cost = upgradeCost(upgrade);
  const disabled = maxed || state.credits < cost;
  return `
    <article class="upgrade">
      <div>
        <strong>${upgrade.name} Mk ${level}/${max}</strong>
        <span>${upgrade.text}</span>
      </div>
      <button data-upgrade="${upgrade.id}" ${disabled ? 'disabled' : ''}>${maxed ? 'Max' : `${cost}c`}</button>
    </article>
  `;
}

