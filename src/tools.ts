import type { ToolId } from './types';

export const TOOL_IDS: ToolId[] = ['drill', 'scanner', 'sonar', 'sampler', 'flare', 'stun', 'charge'];
export const DEFAULT_UNLOCKED_TOOLS: ToolId[] = ['drill', 'scanner', 'sonar', 'sampler'];

export const TOOL_LABELS: Record<ToolId, string> = {
  drill: 'Drill',
  scanner: 'Scanner',
  sonar: 'Sonar',
  sampler: 'Sampler',
  flare: 'Flare',
  stun: 'Stun',
  charge: 'Charge',
};

export const TOOL_KEY_HINTS: Record<ToolId, string> = {
  drill: '1',
  scanner: '2',
  sonar: '3',
  sampler: '4',
  flare: '5',
  stun: '6',
  charge: '7',
};

export function isToolId(value: unknown): value is ToolId {
  return typeof value === 'string' && TOOL_IDS.includes(value as ToolId);
}

export function createDefaultUnlockedTools(): Record<ToolId, boolean> {
  return Object.fromEntries(TOOL_IDS.map((id) => [id, DEFAULT_UNLOCKED_TOOLS.includes(id)])) as Record<ToolId, boolean>;
}

export function normalizeUnlockedTools(value: unknown): Record<ToolId, boolean> {
  const defaults = createDefaultUnlockedTools();
  if (!value || typeof value !== 'object') return defaults;
  const source = value as Partial<Record<ToolId, boolean>>;
  for (const id of TOOL_IDS) {
    defaults[id] = DEFAULT_UNLOCKED_TOOLS.includes(id) || source[id] === true;
  }
  return defaults;
}

export function normalizeSelectedTool(value: unknown, unlockedTools: Record<ToolId, boolean>): ToolId {
  return isToolId(value) && unlockedTools[value] ? value : 'drill';
}
