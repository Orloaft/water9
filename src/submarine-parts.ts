import Phaser from 'phaser';
import submarinePartsFile from '../public/assets/generated/submarines.parts.json';
import type { SubTier,SubVehicle } from './types';
import { SUB_BOARD_SECONDS } from './constants';
import { state } from './state';
import { scaledEntity,subDef } from './helpers';
import type { DeepdiveScene } from './scene';

type SubmarinePartRole =
  | 'hull'
  | 'thruster'
  | 'thrusterGlow'
  | 'fin'
  | 'hatch'
  | 'scanner'
  | 'lamp'
  | 'ballast'
  | 'engine'
  | 'cargo'
  | 'drillUpper'
  | 'drillLower'
  | 'drillHead'
  | 'turretYoke'
  | 'turretBarrel'
  | 'bayDoor'
  | 'dockedScout'
  | 'damage';

type SubmarinePartShape =
  | 'arm'
  | 'barrel'
  | 'bay'
  | 'cargo'
  | 'damage'
  | 'docked'
  | 'dome'
  | 'drill'
  | 'engine'
  | 'finBottom'
  | 'finTop'
  | 'glow'
  | 'hull'
  | 'lamp'
  | 'nozzle'
  | 'ring'
  | 'tank'
  | 'turret';

export interface SubmarinePartSpec {
  id: string;
  role: SubmarinePartRole;
  shape: SubmarinePartShape;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  color: string;
  accent?: string;
}

export interface SubmarinePartManifest {
  tier: SubTier;
  id: string;
  name: string;
  designWidth: number;
  parts: SubmarinePartSpec[];
}

interface SubmarinePartsFile {
  schema: string;
  tiers: SubmarinePartManifest[];
}

export type SubmarinePartSpriteMap = Record<string, Phaser.GameObjects.Image>;

const file = submarinePartsFile as SubmarinePartsFile;
const manifests = new Map<SubTier, SubmarinePartManifest>(file.tiers.map((manifest) => [manifest.tier, manifest]));

function partTextureKey(tier: SubTier, part: SubmarinePartSpec) {
  return `sub-part-tier${tier}-${part.id}`;
}

function colorValue(hex: string) {
  return Number.parseInt(hex, 16);
}

function drawPanelLines(g: Phaser.GameObjects.Graphics, width: number, height: number, color: number, alpha = 0.38) {
  g.lineStyle(1, color, alpha);
  for (let x = width * 0.34; x < width * 0.78; x += width * 0.22) {
    g.lineBetween(x, height * 0.24, x - width * 0.04, height * 0.78);
  }
}

function drawPartTexture(g: Phaser.GameObjects.Graphics, part: SubmarinePartSpec) {
  const width = Math.ceil(part.w + 10);
  const height = Math.ceil(part.h + 10);
  const cx = width * 0.5;
  const cy = height * 0.5;
  const body = colorValue(part.color);
  const accent = colorValue(part.accent ?? part.color);
  g.clear();
  if (part.shape === 'glow') {
    g.fillStyle(body, 0.36);
    g.fillEllipse(cx, cy, part.w, part.h);
    g.fillStyle(0xffffff, 0.2);
    g.fillEllipse(cx + part.w * 0.15, cy, part.w * 0.42, part.h * 0.45);
    return;
  }
  if (part.shape === 'hull') {
    g.fillStyle(0x0b1821, 0.62);
    g.fillEllipse(cx - 1, cy + 2, part.w + 5, part.h + 5);
    g.fillStyle(body, 1);
    g.fillEllipse(cx, cy, part.w, part.h);
    g.lineStyle(2, accent, 0.78);
    g.strokeEllipse(cx, cy, part.w, part.h);
    drawPanelLines(g, width, height, accent);
    return;
  }
  if (part.shape === 'tank' || part.shape === 'engine' || part.shape === 'cargo' || part.shape === 'bay') {
    g.fillStyle(0x07131a, 0.48);
    g.fillRoundedRect(cx - part.w * 0.5 - 1, cy - part.h * 0.5 + 2, part.w + 2, part.h, Math.max(3, part.h * 0.35));
    g.fillStyle(body, 1);
    g.fillRoundedRect(cx - part.w * 0.5, cy - part.h * 0.5, part.w, part.h, Math.max(3, part.h * 0.35));
    g.lineStyle(1, accent, 0.5);
    g.strokeRoundedRect(cx - part.w * 0.5, cy - part.h * 0.5, part.w, part.h, Math.max(3, part.h * 0.35));
    if (part.shape === 'bay') {
      g.lineStyle(2, accent, 0.65);
      g.lineBetween(cx - part.w * 0.35, cy, cx + part.w * 0.35, cy);
    }
    return;
  }
  if (part.shape === 'nozzle') {
    g.fillStyle(body, 1);
    g.fillTriangle(cx - part.w * 0.48, cy, cx + part.w * 0.35, cy - part.h * 0.5, cx + part.w * 0.35, cy + part.h * 0.5);
    g.lineStyle(2, accent, 0.72);
    g.strokeEllipse(cx + part.w * 0.25, cy, part.w * 0.5, part.h * 0.7);
    return;
  }
  if (part.shape === 'finTop' || part.shape === 'finBottom') {
    const sign = part.shape === 'finTop' ? -1 : 1;
    g.fillStyle(body, 0.95);
    g.fillTriangle(cx - part.w * 0.5, cy - sign * part.h * 0.4, cx + part.w * 0.42, cy, cx - part.w * 0.28, cy + sign * part.h * 0.45);
    g.lineStyle(1, 0xb5c7c7, 0.35);
    g.lineBetween(cx - part.w * 0.36, cy, cx + part.w * 0.26, cy);
    return;
  }
  if (part.shape === 'ring') {
    g.lineStyle(3, body, 0.9);
    g.strokeEllipse(cx, cy, part.w, part.h);
    g.lineStyle(1, 0xffffff, 0.55);
    g.strokeEllipse(cx, cy, part.w * 0.62, part.h * 0.56);
    return;
  }
  if (part.shape === 'dome') {
    g.fillStyle(0x092531, 0.86);
    g.fillEllipse(cx, cy, part.w, part.h);
    g.fillStyle(body, 0.78);
    g.fillEllipse(cx + part.w * 0.06, cy - part.h * 0.1, part.w * 0.68, part.h * 0.62);
    g.lineStyle(1, accent, 0.7);
    g.strokeEllipse(cx, cy, part.w, part.h);
    return;
  }
  if (part.shape === 'lamp') {
    g.fillStyle(0x2a3335, 1);
    g.fillRoundedRect(cx - part.w * 0.5, cy - part.h * 0.5, part.w, part.h, 3);
    g.fillStyle(body, 0.86);
    g.fillEllipse(cx + part.w * 0.12, cy, part.w * 0.55, part.h * 0.58);
    return;
  }
  if (part.shape === 'arm' || part.shape === 'barrel') {
    g.fillStyle(0x07131a, 0.42);
    g.fillRoundedRect(cx - part.w * 0.5, cy - part.h * 0.5 + 1, part.w, part.h, 3);
    g.fillStyle(body, 1);
    g.fillRoundedRect(cx - part.w * 0.5, cy - part.h * 0.5, part.w, part.h, 3);
    g.lineStyle(1, accent, 0.55);
    g.lineBetween(cx - part.w * 0.35, cy, cx + part.w * 0.35, cy);
    return;
  }
  if (part.shape === 'drill') {
    g.fillStyle(body, 1);
    g.fillTriangle(cx - part.w * 0.45, cy - part.h * 0.38, cx - part.w * 0.45, cy + part.h * 0.38, cx + part.w * 0.5, cy);
    g.lineStyle(2, accent, 0.8);
    g.lineBetween(cx - part.w * 0.28, cy - part.h * 0.25, cx + part.w * 0.25, cy);
    g.lineBetween(cx - part.w * 0.28, cy + part.h * 0.25, cx + part.w * 0.25, cy);
    return;
  }
  if (part.shape === 'turret') {
    g.fillStyle(body, 1);
    g.fillRoundedRect(cx - part.w * 0.5, cy - part.h * 0.5, part.w, part.h, 5);
    g.lineStyle(2, accent, 0.72);
    g.strokeCircle(cx, cy, Math.min(part.w, part.h) * 0.32);
    return;
  }
  if (part.shape === 'docked') {
    g.fillStyle(accent, 0.86);
    g.fillEllipse(cx, cy, part.w, part.h);
    g.fillStyle(body, 0.75);
    g.fillEllipse(cx + part.w * 0.24, cy - 1, part.w * 0.34, part.h * 0.58);
    return;
  }
  if (part.shape === 'damage') {
    g.lineStyle(2, body, 0.92);
    g.lineBetween(cx - part.w * 0.32, cy - part.h * 0.22, cx - part.w * 0.12, cy - part.h * 0.04);
    g.lineBetween(cx - part.w * 0.12, cy - part.h * 0.04, cx - part.w * 0.2, cy + part.h * 0.2);
    g.lineBetween(cx + part.w * 0.12, cy - part.h * 0.26, cx + part.w * 0.28, cy - part.h * 0.08);
    g.lineBetween(cx + part.w * 0.28, cy - part.h * 0.08, cx + part.w * 0.18, cy + part.h * 0.18);
    g.fillStyle(0x8ee7f4, 0.2);
    g.fillCircle(cx + part.w * 0.35, cy + part.h * 0.12, 3);
  }
}

export function submarinePartManifest(tier: SubTier) {
  return manifests.get(tier);
}

export function submarinePartManifests() {
  return [...manifests.values()];
}

export function ensureSubmarinePartTextures(scene: Phaser.Scene) {
  const graphics = scene.add.graphics().setVisible(false);
  for (const manifest of submarinePartManifests()) {
    for (const part of manifest.parts) {
      const key = partTextureKey(manifest.tier, part);
      if (scene.textures.exists(key)) continue;
      drawPartTexture(graphics, part);
      graphics.generateTexture(key, Math.ceil(part.w + 10), Math.ceil(part.h + 10));
    }
  }
  graphics.destroy();
}

export function createSubmarinePartSprites(scene: Phaser.Scene, slot: string, depthBase: number): SubmarinePartSpriteMap {
  const sprites: SubmarinePartSpriteMap = {};
  for (const manifest of submarinePartManifests()) {
    for (const part of manifest.parts) {
      const id = `${slot}-tier${manifest.tier}-${part.id}`;
      sprites[id] = scene.add.image(0, 0, partTextureKey(manifest.tier, part))
        .setDepth(depthBase + part.depth)
        .setOrigin(0.5)
        .setVisible(false);
    }
  }
  return sprites;
}

export function hideSubmarinePartSprites(sprites?: SubmarinePartSpriteMap) {
  if (!sprites) return;
  for (const sprite of Object.values(sprites)) sprite.setVisible(false);
}

function transformPoint(x: number, y: number, rotation: number, facing: 1 | -1) {
  const localX = x * facing;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: localX * cos - y * sin,
    y: localX * sin + y * cos,
  };
}

function partMotion(scene: DeepdiveScene, part: SubmarinePartSpec, sub: SubVehicle, bodyRotation: number, scale: number, options: { carrier: boolean }) {
  const def = subDef(sub.tier);
  const speedBlend = Phaser.Math.Clamp(Math.hypot(sub.vx, sub.vy) / Math.max(1, def.speed), 0, 1);
  const verticalBlend = Phaser.Math.Clamp(sub.vy / Math.max(1, def.speed), -1, 1);
  const boardBlend = Phaser.Math.Clamp(sub.boardProgress / SUB_BOARD_SECONDS, 0, 1);
  const hullPct = Phaser.Math.Clamp(sub.hull / Math.max(1, def.hull), 0, 1);
  const time = performance.now() * 0.001;
  const actionMining = state.pilotingSub && state.activeSub === sub && sub.tier >= 2;
  const drilling = actionMining && (sceneDrillingThisFrame() ?? false);
  const weaponBlend = sub.tier >= 3 ? Phaser.Math.Clamp(sub.weaponCooldown / 1.2, 0, 1) : 0;
  const scanPulse = state.pilotingSub && state.activeSub === sub && (scene.sonarPings.length > 0 || scene.player.scanCooldown > 0 || scene.player.sonarCooldown > 0);
  const lowPower = Math.min(sub.fuel / Math.max(1, def.fuel), sub.oxygen / Math.max(1, def.oxygen));
  let x = part.x * scale;
  let y = part.y * scale;
  let rotation = 0;
  let alpha = 1;
  let scaleX = 1;
  let scaleY = 1;
  if (part.role === 'thrusterGlow') {
    alpha = 0.12 + speedBlend * 0.68 + Math.max(0, Math.sin(time * 20)) * speedBlend * 0.12;
    scaleX = 0.75 + speedBlend * 0.65;
    scaleY = 0.8 + speedBlend * 0.28;
  } else if (part.role === 'thruster') {
    rotation = -verticalBlend * 0.18;
    x -= speedBlend * scale * 2.5;
  } else if (part.role === 'fin') {
    rotation = verticalBlend * (part.y < 0 ? -0.26 : 0.26) + Math.sin(time * 5 + part.y) * speedBlend * 0.035;
  } else if (part.role === 'hatch') {
    alpha = 0.72 + boardBlend * 0.28 + Math.sin(time * 18) * boardBlend * 0.12;
    scaleX = 1 + boardBlend * 0.18;
    scaleY = 1 + boardBlend * 0.18;
  } else if (part.role === 'scanner') {
    const pulse = scanPulse ? Math.max(0, Math.sin(time * 16)) : Math.max(0, Math.sin(time * 2.2)) * 0.28;
    alpha = 0.72 + pulse * 0.28;
  } else if (part.role === 'lamp') {
    alpha = lowPower < 0.16 ? 0.45 + Math.max(0, Math.sin(time * 19)) * 0.38 : 0.82 + Math.sin(time * 3.5) * 0.08;
  } else if (part.role === 'drillUpper') {
    const drill = drilling ? 1 : 0;
    x += drill * scale * 7;
    y += drill * scale * 2;
    rotation = -0.12 + drill * (-0.18 + Math.sin(time * 18) * 0.04);
    alpha = sub.tier >= 2 ? 1 : 0;
  } else if (part.role === 'drillLower') {
    const drill = drilling ? 1 : 0;
    x += drill * scale * 13;
    y += drill * scale * 3;
    rotation = 0.08 + drill * (0.2 + Math.sin(time * 21) * 0.05);
  } else if (part.role === 'drillHead') {
    const drill = drilling ? 1 : 0;
    x += drill * scale * (sub.tier === 3 ? 8 : 18);
    y += drill * scale * 3;
    rotation = drill ? Math.sin(time * 36) * 0.2 : 0.05;
    alpha = sub.tier >= 2 ? (drilling || sub.tier === 2 ? 1 : 0.72) : 0;
  } else if (part.role === 'turretYoke') {
    rotation = verticalBlend * 0.12 - weaponBlend * 0.08;
  } else if (part.role === 'turretBarrel') {
    rotation = verticalBlend * 0.12 - weaponBlend * 0.08;
    x -= weaponBlend * scale * 6;
    alpha = 0.9 + weaponBlend * 0.1;
  } else if (part.role === 'bayDoor') {
    const open = state.carrierSub === sub ? 1 : 0;
    y += open * scale * 5;
    rotation = open * 0.18;
    alpha = 0.78 + open * 0.22;
  } else if (part.role === 'dockedScout') {
    alpha = state.carrierSub === sub ? 0.12 : 0.92;
  } else if (part.role === 'damage') {
    alpha = hullPct < 0.62 ? Phaser.Math.Clamp((0.62 - hullPct) / 0.44, 0, 1) * (0.62 + Math.sin(time * 17) * 0.16) : 0;
  }
  return { x, y, rotation: bodyRotation + rotation * sub.facingSign, alpha, scaleX, scaleY };
}

let drillingFrameProvider: (() => boolean) | null = null;

export function setSubmarineDrillingFrameProvider(provider: (() => boolean) | null) {
  drillingFrameProvider = provider;
}

function sceneDrillingThisFrame() {
  return drillingFrameProvider?.() ?? false;
}

export function renderSubmarineParts(
  scene: DeepdiveScene,
  sprites: SubmarinePartSpriteMap | undefined,
  sub: SubVehicle,
  options: { carrier?: boolean } = {},
) {
  const manifest = submarinePartManifest(sub.tier);
  if (!manifest || !sprites) return false;
  const def = subDef(sub.tier);
  const designWidth = manifest.designWidth;
  const targetWidth = scaledEntity(sub.tier === 3 ? 118 : sub.tier === 2 ? 92 : 72);
  const scale = targetWidth / designWidth;
  const bodyRotation = Phaser.Math.Clamp(sub.vy / Math.max(1, def.speed), -0.38, 0.38) * (sub.facingSign < 0 ? -1 : 1);
  const bodyAlpha = sub.hull <= def.hull * 0.18 ? 0.72 + Math.sin(performance.now() * 0.018) * 0.16 : 1;
  const visibleIds = new Set<string>();
  for (const part of manifest.parts) {
    const sprite = sprites[`${options.carrier ? 'carrier' : 'active'}-tier${manifest.tier}-${part.id}`];
    if (!sprite || !scene.textures.exists(partTextureKey(manifest.tier, part))) return false;
    visibleIds.add(sprite.name || `${options.carrier ? 'carrier' : 'active'}-tier${manifest.tier}-${part.id}`);
    const motion = partMotion(scene, part, sub, bodyRotation, scale, { carrier: options.carrier === true });
    const point = transformPoint(motion.x, motion.y, bodyRotation, sub.facingSign);
    sprite
      .setVisible(motion.alpha > 0.02)
      .setPosition(sub.x + point.x, sub.y + point.y)
      .setRotation(motion.rotation)
      .setFlipX(sub.facingSign < 0)
      .setAlpha(bodyAlpha * motion.alpha)
      .setScale(scale * motion.scaleX, scale * motion.scaleY);
    if (!sprite.name) sprite.name = `${options.carrier ? 'carrier' : 'active'}-tier${manifest.tier}-${part.id}`;
  }
  for (const sprite of Object.values(sprites)) {
    if (sprite.visible && !visibleIds.has(sprite.name)) sprite.setVisible(false);
  }
  return true;
}
