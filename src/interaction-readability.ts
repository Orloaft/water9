export type ReadabilityTargetKind = 'diver' | 'threat' | 'actionable' | 'prompt';

export type ReadabilityTarget = {
  kind: ReadabilityTargetKind;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  alpha: number;
};

export type InteractionCorridor = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  radius: number;
};

export const LOCAL_SEPARATION_POLICY = Object.freeze({
  maxTargets: 6,
  falloffSteps: 8,
  threatRange: 300,
  actionableRange: 190,
  threatAlpha: 0.48,
  actionableAlpha: 0.38,
  promptBacking: 0x020509,
  promptText: 0xfff7df,
  promptContrastFloor: 4.5,
  corridorRadius: 54,
  focalPointFloor: 0.08,
  priorityEdgeColor: 0xd8f0ec,
  diverEdgeAlpha: 0.84,
  threatEdgeAlpha: 0.82,
});

export function smoothUnit(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function targetSeparationAlpha(kind: ReadabilityTargetKind, distance: number, range: number) {
  if (kind === 'diver') return 0.28;
  const peak = kind === 'threat'
    ? LOCAL_SEPARATION_POLICY.threatAlpha
    : kind === 'prompt'
      ? 0.52
      : LOCAL_SEPARATION_POLICY.actionableAlpha;
  return peak * (1 - smoothUnit(distance / Math.max(1, range)));
}

export function distanceToCorridor(x: number, y: number, corridor: InteractionCorridor) {
  const dx = corridor.toX - corridor.fromX;
  const dy = corridor.toY - corridor.fromY;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq > 0
    ? Math.max(0, Math.min(1, ((x - corridor.fromX) * dx + (y - corridor.fromY) * dy) / lengthSq))
    : 0;
  const closestX = corridor.fromX + dx * t;
  const closestY = corridor.fromY + dy * t;
  return Math.hypot(x - closestX, y - closestY);
}

export function landmarkFocalAlphaScale(x: number, y: number, corridors: readonly InteractionCorridor[]) {
  let scale = 1;
  for (const corridor of corridors) {
    const distance = distanceToCorridor(x, y, corridor);
    const feather = Math.max(18, corridor.radius * 0.72);
    const t = smoothUnit((distance - corridor.radius) / feather);
    scale = Math.min(scale, LOCAL_SEPARATION_POLICY.focalPointFloor + (1 - LOCAL_SEPARATION_POLICY.focalPointFloor) * t);
  }
  return scale;
}

function channelLuminance(channel: number) {
  const normalized = Math.max(0, Math.min(255, channel)) / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: number, background: number) {
  const luminance = (color: number) => (
    channelLuminance((color >> 16) & 255) * 0.2126
    + channelLuminance((color >> 8) & 255) * 0.7152
    + channelLuminance(color & 255) * 0.0722
  );
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function largeThreatPartAlpha(distance: number, role: 'danger' | 'root' | 'body' | 'tail') {
  const close = 1 - smoothUnit((distance - 150) / 180);
  const floor = role === 'danger' ? 1 : role === 'root' ? 0.88 : role === 'body' ? 0.72 : 0.56;
  return 1 - close * (1 - floor);
}

export function largeThreatPartScale(distance: number, role: 'danger' | 'root' | 'body' | 'tail') {
  if (role === 'danger') return 1;
  const close = 1 - smoothUnit((distance - 105) / 210);
  const floor = role === 'root' ? 0.74 : role === 'body' ? 0.64 : 0.58;
  return 1 - close * (1 - floor);
}

export function priorityEdgeAlpha(kind: 'diver' | 'threat', distance = 0, range: number = LOCAL_SEPARATION_POLICY.actionableRange) {
  const peak = kind === 'diver' ? LOCAL_SEPARATION_POLICY.diverEdgeAlpha : LOCAL_SEPARATION_POLICY.threatEdgeAlpha;
  if (kind === 'diver') return peak;
  return peak * (0.82 + 0.18 * (1 - smoothUnit(distance / Math.max(1, range))));
}
