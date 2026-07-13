export type SwimMotionPhase = 'idle' | 'acceleration' | 'cruise' | 'coast' | 'brake';
export type SwimVerticalIntent = 'level' | 'ascend' | 'descend';

export interface SwimAnimationIntent {
  phase: SwimMotionPhase;
  vertical: SwimVerticalIntent;
  direction: 'idle' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest' | 'north' | 'northeast';
}

export interface CameraLeadSpring {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
}

export const SWIM_FEEL = Object.freeze({
  baseTopSpeed: 106,
  baseThrust: 285,
  dockThrust: 620,
  upgradeThrust: 34,
  propulsiveDrag: 1.35,
  coastDrag: 2.55,
  cruiseThreshold: 0.78,
  idleThreshold: 9,
  verticalIntentThreshold: 0.72,
  reversalDotThreshold: -0.08,
});

export const CAMERA_FEEL = Object.freeze({
  leadViewportFraction: 0.05,
  minLeadViewportFraction: 0.03,
  maxLeadViewportFraction: 0.07,
  fullLeadSpeedRatio: 0.9,
  leadStartSpeedRatio: 0.15,
  springAngularFrequency: 32,
  restPositionEpsilon: 0.04,
  restVelocityEpsilon: 0.04,
});

export function normalizeMotionInput(x: number, y: number) {
  const magnitude = Math.hypot(x, y);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return { x: 0, y: 0, magnitude: 0 };
  const divisor = Math.max(1, magnitude);
  return { x: x / divisor, y: y / divisor, magnitude: Math.min(1, magnitude) };
}

export function swimVelocityStep(
  velocityX: number,
  velocityY: number,
  inputX: number,
  inputY: number,
  deltaSeconds: number,
  topSpeed: number,
  thrust: number,
) {
  const input = normalizeMotionInput(inputX, inputY);
  const delta = Math.max(0, deltaSeconds);
  let vx = velocityX + input.x * thrust * delta;
  let vy = velocityY + input.y * thrust * delta;
  const drag = input.magnitude > 0 ? SWIM_FEEL.propulsiveDrag : SWIM_FEEL.coastDrag;
  const dragFactor = Math.exp(-drag * delta);
  vx *= dragFactor;
  vy *= dragFactor;
  const speed = Math.hypot(vx, vy);
  if (speed > topSpeed) {
    vx = vx / speed * topSpeed;
    vy = vy / speed * topSpeed;
  }
  return { vx, vy, speed: Math.min(speed, topSpeed), input };
}

export function classifySwimAnimationIntent(
  inputX: number,
  inputY: number,
  velocityX: number,
  velocityY: number,
  topSpeed: number,
): SwimAnimationIntent {
  const input = normalizeMotionInput(inputX, inputY);
  const speed = Math.hypot(velocityX, velocityY);
  const hasInput = input.magnitude > 0;
  const direction = directionFor(input.x, input.y, hasInput);
  const vertical = hasInput && Math.abs(input.y) >= SWIM_FEEL.verticalIntentThreshold
    ? input.y < 0 ? 'ascend' : 'descend'
    : 'level';
  if (!hasInput) {
    return {
      phase: speed < SWIM_FEEL.idleThreshold ? 'idle' : 'coast',
      vertical: 'level',
      direction,
    };
  }
  const velocityAlongInput = velocityX * input.x + velocityY * input.y;
  const phase = velocityAlongInput < topSpeed * SWIM_FEEL.reversalDotThreshold
    ? 'brake'
    : speed >= topSpeed * SWIM_FEEL.cruiseThreshold
      ? 'cruise'
      : 'acceleration';
  return { phase, vertical, direction };
}

export function cameraLeadTarget(
  inputX: number,
  inputY: number,
  speed: number,
  topSpeed: number,
  viewWidth: number,
  viewHeight: number,
  enabled: boolean,
) {
  const input = normalizeMotionInput(inputX, inputY);
  if (!enabled || input.magnitude <= 0 || topSpeed <= 0) return { x: 0, y: 0, strength: 0 };
  const ratio = clamp((speed / topSpeed - CAMERA_FEEL.leadStartSpeedRatio)
    / (CAMERA_FEEL.fullLeadSpeedRatio - CAMERA_FEEL.leadStartSpeedRatio), 0, 1);
  const strength = ratio * ratio * (3 - 2 * ratio);
  return {
    x: input.x * viewWidth * CAMERA_FEEL.leadViewportFraction * strength,
    y: input.y * viewHeight * CAMERA_FEEL.leadViewportFraction * strength,
    strength,
  };
}

export function cameraLeadSpringStep(
  spring: CameraLeadSpring,
  targetX: number,
  targetY: number,
  deltaSeconds: number,
): CameraLeadSpring {
  const delta = Math.max(0, deltaSeconds);
  const x = criticalDampedAxis(spring.x, spring.vx, targetX, delta);
  const y = criticalDampedAxis(spring.y, spring.vy, targetY, delta);
  const next = { x: x.position, y: y.position, vx: x.velocity, vy: y.velocity, targetX, targetY };
  if (
    targetX === 0 && targetY === 0
    && Math.hypot(next.x, next.y) <= CAMERA_FEEL.restPositionEpsilon
    && Math.hypot(next.vx, next.vy) <= CAMERA_FEEL.restVelocityEpsilon
  ) return zeroCameraLeadSpring();
  return next;
}

export function zeroCameraLeadSpring(): CameraLeadSpring {
  return { x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0 };
}

export function cameraLeadViewportFraction(spring: Pick<CameraLeadSpring, 'x' | 'y'>, viewWidth: number, viewHeight: number) {
  if (viewWidth <= 0 || viewHeight <= 0) return 0;
  return Math.hypot(spring.x / viewWidth, spring.y / viewHeight);
}

function criticalDampedAxis(position: number, velocity: number, target: number, delta: number) {
  if (delta <= 0) return { position, velocity };
  const omega = CAMERA_FEEL.springAngularFrequency;
  const displacement = position - target;
  const c = velocity + omega * displacement;
  const decay = Math.exp(-omega * delta);
  const nextDisplacement = (displacement + c * delta) * decay;
  const nextVelocity = (velocity - omega * c * delta) * decay;
  const nextPosition = target + nextDisplacement;
  if ((position - target) * (nextPosition - target) < 0) return { position: target, velocity: 0 };
  return { position: nextPosition, velocity: nextVelocity };
}

function directionFor(x: number, y: number, hasInput: boolean): SwimAnimationIntent['direction'] {
  if (!hasInput) return 'idle';
  const labels: SwimAnimationIntent['direction'][] = [
    'east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast',
  ];
  const angle = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);
  return labels[Math.round(angle / (Math.PI * 0.25)) % labels.length];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
