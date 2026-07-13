import { state } from './state';
import type { Biome, ProgressionRadioEvent, Quest, QuestKind, RadioMessage } from './types';

export const PROGRESSION_RADIO_PREFIX = 'progression-v1:';

const questKinds: QuestKind[] = ['depth', 'scan', 'sample', 'ore', 'nest', 'gulperSurvey', 'forwardOutpost'];

export function progressionQuestRadioId(questId: string) {
  return `${PROGRESSION_RADIO_PREFIX}quest:${questId}`;
}

export function progressionArrivalRadioId(biome: 2 | 3 | 4) {
  return `${PROGRESSION_RADIO_PREFIX}arrival:biome-${biome}`;
}

export function queueQuestCompletionRadio(quest: Quest) {
  return queueProgressionRadio({
    id: progressionQuestRadioId(quest.id),
    type: 'quest',
    biome: state.biome,
    questKind: quest.kind,
    questId: quest.id,
    target: quest.target,
    resultDepth: state.depth,
    floraSpecies: quest.kind === 'forwardOutpost' ? state.forwardOutpost.floraSpecies : undefined,
  });
}

export function queueBiomeArrivalRadio(biome: 2 | 3 | 4) {
  return queueProgressionRadio({
    id: progressionArrivalRadioId(biome),
    type: 'arrival',
    biome,
  });
}

export function queueProgressionRadio(event: ProgressionRadioEvent) {
  const heardRadio = state.story.heardRadio as string[];
  if (heardRadio.includes(event.id)) return false;
  if (state.progressionRadioActiveId === event.id) return false;
  if (state.progressionRadioQueue.some((queued) => queued.id === event.id)) return false;
  state.progressionRadioQueue.push(event);
  return true;
}

export function tryPresentProgressionRadio() {
  if (!state.started || state.radioOpen || state.paused || state.logbookOpen || state.cargoOpen || state.sonarMapOpen) return false;
  if (state.lost || (state.won && !state.finale.endingSeen) || state.biomeLoading.active) return false;

  while (state.progressionRadioQueue.length > 0) {
    const event = state.progressionRadioQueue[0];
    const heardRadio = state.story.heardRadio as string[];
    if (heardRadio.includes(event.id)) {
      state.progressionRadioQueue.shift();
      continue;
    }
    if (event.type === 'arrival' && (event.biome !== state.biome || !state.atBoat || !state.docked)) return false;

    const messages = progressionRadioMessages(event);
    state.progressionRadioQueue.shift();
    if (messages.length === 0) continue;
    state.progressionRadioActiveId = event.id;
    state.radioMessages = messages;
    state.radioIndex = 0;
    state.radioOpen = true;
    heardRadio.push(event.id);
    return true;
  }
  return false;
}

export function finishActiveProgressionRadio() {
  state.progressionRadioActiveId = '';
}

export function resetProgressionRadio() {
  state.progressionRadioQueue = [];
  state.progressionRadioActiveId = '';
}

export function normalizeProgressionRadioQueue(value: unknown, heardRadio: string[] = []) {
  if (!Array.isArray(value)) return [];
  const normalized: ProgressionRadioEvent[] = [];
  const ids = new Set<string>();
  for (const candidate of value) {
    const event = normalizeProgressionRadioEvent(candidate);
    if (!event || heardRadio.includes(event.id) || ids.has(event.id)) continue;
    normalized.push(event);
    ids.add(event.id);
  }
  return normalized;
}

function normalizeProgressionRadioEvent(value: unknown): ProgressionRadioEvent | null {
  if (!value || typeof value !== 'object') return null;
  const saved = value as Partial<ProgressionRadioEvent>;
  if (typeof saved.id !== 'string' || !saved.id.startsWith(PROGRESSION_RADIO_PREFIX) || saved.id.length > 240) return null;
  if (!isBiome(saved.biome)) return null;
  if (saved.type === 'arrival') {
    if (saved.biome !== 2 && saved.biome !== 3 && saved.biome !== 4) return null;
    if (saved.id !== progressionArrivalRadioId(saved.biome)) return null;
    return { id: saved.id, type: 'arrival', biome: saved.biome };
  }
  if (saved.type !== 'quest' || !isQuestKind(saved.questKind) || typeof saved.questId !== 'string') return null;
  if (saved.id !== progressionQuestRadioId(saved.questId)) return null;
  return {
    id: saved.id,
    type: 'quest',
    biome: saved.biome,
    questKind: saved.questKind,
    questId: saved.questId.slice(0, 180),
    target: safeNumber(saved.target),
    resultDepth: safeNumber(saved.resultDepth),
    floraSpecies: safeText(saved.floraSpecies),
  };
}

export function progressionRadioMessages(event: ProgressionRadioEvent): RadioMessage[] {
  if (event.type === 'arrival') return arrivalMessages(event.biome);
  if (!event.questKind) return [];
  return questMessages(event.questKind, event);
}

function questMessages(kind: QuestKind, event: ProgressionRadioEvent): RadioMessage[] {
  const target = Math.max(0, Math.round(event.target ?? 0));
  const biome = biomeName(event.biome);
  if (kind === 'depth') {
    return [
      vale(`Pressure line received from ${biome}. The curve holds through ${target.toLocaleString()} metres; that is a real route, not a hopeful pencil mark.`),
      diver('Good. My helmet called it a route too, though the creaking sounded less academic.'),
      alvarez('Chief Alvarez here. I am matching that load against the winch and submersible seals before the next descent.'),
    ];
  }
  if (kind === 'scan') {
    return [
      sato(`Catalog sweep is clean: ${target} new lifeform${target === 1 ? '' : 's'} from ${biome}, with movement and threat responses intact.`),
      diver('Intact is my favorite condition for both field notes and field researchers.'),
      sato('The differences matter. I can separate local residents from animals merely passing through the pressure lane.'),
    ];
  }
  if (kind === 'sample') {
    return [
      sato(`Wet lab has the flora sample from ${biome}. The tissue stayed viable through the ascent.`),
      diver('It objected to the vial less than it objected to me.'),
      vale('I will cross-check the mineral grains in its holdfast. Living things down there keep excellent geological records.'),
    ];
  }
  if (kind === 'ore') {
    return [
      vale(`Assay order filled: ${target.toLocaleString()} credits of ${biome} ore, sorted well enough that the spectrometer did not swear at us.`),
      diver('The cargo grid and I have reached a professional understanding about sharp rocks.'),
      alvarez('Alvarez confirms the barge took the load cleanly. I am clearing the bins before your next haul.'),
    ];
  }
  if (kind === 'nest') {
    return [
      sato('Nest telemetry just went quiet. Eggs, larvae, and the chamber heat signature are all accounted for.'),
      diver('I would like the record to show that the larvae were very committed to customer retention.'),
      sato('Recorded. So is the cleared migration lane; smaller fauna should reclaim it quickly.'),
      alvarez('Locator is back on barge power. No second nest signal hiding under the first.'),
    ];
  }
  if (kind === 'gulperSurvey') {
    return [
      sato(`Wake trace confirmed at ${target.toLocaleString()} metres. The Gulper lane follows pressure, not prey density, which explains the empty water around it.`),
      diver('Empty except for the part with the gulper in it.'),
      alvarez('Trace is good enough for the Marlin fabrication voucher. Heavy cargo is optional; surviving the route is not.'),
      vale('That wake also follows the drowned-architect signal toward the ruins. We finally know the detour is deliberate.'),
    ];
  }
  return [
    alvarez(`Forward pocket is stable at ${Math.max(0, Math.round(event.resultDepth ?? 0)).toLocaleString()} metres beside ${event.floraSpecies || 'safe trench flora'}. Pump, anchor, and reserve charge all answered.`),
    diver('It is a comforting little circle of air in a very large argument against breathing.'),
    sato(`The ${event.floraSpecies || 'local flora'} is tolerating the draw. Keep the intake clear and the pocket should not strip its shelter zone.`),
    alvarez('Remember: limited charge, local top-up. The barge is still home, and I still want the submersible returned in one piece.'),
  ];
}

function arrivalMessages(biome: Biome): RadioMessage[] {
  if (biome === 2) {
    return [
      alvarez('Chief Alvarez on deck. Barge anchors are holding above Brine Vent Shelf, and I have recalibrated the submersible seals for heat and salt.'),
      vale('Those vents are laying fresh mineral crust over older drowned-architect geometry. Bring me clean ore and a chemistry line, not just something shiny.'),
      sato('Brine Grass marks the calmer water. Vent Coral and Ember Bloom do not; sample their edges and watch for the Gulper Eel route.'),
      diver('So the grass is a signpost, the flowers burn, and the local eel is mostly mouth. Clear briefing.'),
      vale('Next we need vent chemistry, sonar lanes, and proof that the signal continues below the shelf.'),
    ];
  }
  if (biome === 3) {
    return [
      alvarez('Midnight Trench anchorage is live. The anchorstone will stop your drill cold, so use it for bearings and save fuel.'),
      sato('The Gulper wake descends here, but the Abyssal Serpent owns the deeper water. Scan its route; do not try to make it a trophy.'),
      diver('I had already placed “do not wrestle the serpent” fairly high on today’s list.'),
      vale('The trench walls carry the same signal as the vent shelf, now cut into deliberate lines. The Ancient Ruins are no longer a guess.'),
      alvarez('Before that jump, chart the trench and establish the forward air pocket. I want one tested refuge between you and the barge.'),
    ];
  }
  if (biome === 4) {
    return [
      vale('Ancient Ruins anchorage confirmed. Glass Obelisks and Circuit Kelp are following structures, not geology; the drowned architects built this place.'),
      sato('And life has occupied every seam. The Crownmaw reads like a sentinel adapted to the vault, so observation comes before heroics.'),
      diver('Understood. I will collect proof and avoid being filed under “intruder, processed.”'),
      alvarez('Alvarez here. Sonar, seals, and recovery cradle are ready. Bring the proof back to the barge; no machine down there is worth your air.'),
      sato('One clean ruins clue, one Crownmaw record, and a safe return. Then the expedition can finally say what it learned.'),
    ];
  }
  return [];
}

function vale(text: string): RadioMessage {
  return { speaker: 'Dr. Vale', role: 'Geology channel', text, from: 'npc' };
}

function sato(text: string): RadioMessage {
  return { speaker: 'Dr. Sato', role: 'Marine biology channel', text, from: 'npc' };
}

function alvarez(text: string): RadioMessage {
  return { speaker: 'Chief Alvarez', role: 'Barge engineering channel', text, from: 'npc' };
}

function diver(text: string): RadioMessage {
  return { speaker: 'You', role: 'Diver channel', text, from: 'player' };
}

function biomeName(biome: Biome) {
  if (biome === 1) return 'the Shallows';
  if (biome === 2) return 'Brine Vent Shelf';
  if (biome === 3) return 'Midnight Trench';
  return 'Ancient Ruins';
}

function isBiome(value: unknown): value is Biome {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function isQuestKind(value: unknown): value is QuestKind {
  return typeof value === 'string' && (questKinds as string[]).includes(value);
}

function safeText(value: unknown) {
  return typeof value === 'string' ? value.slice(0, 180) : undefined;
}

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
