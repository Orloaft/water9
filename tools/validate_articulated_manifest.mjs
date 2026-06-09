import { access, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(root, 'public/assets/generated/articulated-creatures.parts.json');
const assetsDir = join(root, 'public/assets/generated');
const validMotionKinds = new Set(['root', 'body', 'tail', 'fin', 'jaw']);
const validRarities = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
const validBiomes = new Set([1, 2, 3, 4]);
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function numberTuple(value, length) {
  return Array.isArray(value) && value.length === length && value.every(finiteNumber);
}

function positiveNumber(value) {
  return finiteNumber(value) && value > 0;
}

function validateNumberTuple(owner, key, value, length) {
  if (!numberTuple(value, length)) fail(`${owner}.${key} must be a ${length}-number tuple`);
}

function anchorExists(part, anchorName) {
  return Boolean(anchorName && isPlainObject(part.anchors) && numberTuple(part.anchors[anchorName], 2));
}

async function imageSize(path) {
  const buffer = await readFile(path);
  if (path.endsWith('.png')) {
    if (buffer.length < 24 || !buffer.subarray(0, 8).equals(pngSignature)) {
      throw new Error('not a valid PNG');
    }
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (path.endsWith('.svg')) {
    const source = buffer.toString('utf8');
    const viewBox = source.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
    if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
    const width = source.match(/\bwidth=["']([\d.]+)["']/i);
    const height = source.match(/\bheight=["']([\d.]+)["']/i);
    if (width && height) return { width: Number(width[1]), height: Number(height[1]) };
    throw new Error('SVG has no readable width/height');
  }
  throw new Error('unsupported texture type');
}

function detectCycles(creature, partsById) {
  const visiting = new Set();
  const visited = new Set();

  function visit(part, stack) {
    if (visited.has(part.id)) return;
    if (visiting.has(part.id)) {
      const cycleStart = stack.indexOf(part.id);
      const cycle = [...stack.slice(Math.max(0, cycleStart)), part.id].join(' -> ');
      fail(`${creature.id}: parent cycle detected: ${cycle}`);
      return;
    }
    visiting.add(part.id);
    if (part.parentId) {
      const parent = partsById.get(part.parentId);
      if (parent) visit(parent, [...stack, part.id]);
    }
    visiting.delete(part.id);
    visited.add(part.id);
  }

  for (const part of partsById.values()) visit(part, []);
}

async function validateTexture(creature, part) {
  const owner = `${creature.id}.${part.id}`;
  if (typeof part.texture !== 'string' || !part.texture) {
    fail(`${owner}.texture must be a non-empty filename`);
    return;
  }
  const texturePath = join(assetsDir, basename(part.texture));
  try {
    await access(texturePath);
  } catch {
    fail(`${owner}.texture missing file: ${part.texture}`);
    return;
  }
  try {
    const size = await imageSize(texturePath);
    if (numberTuple(part.size, 2)) {
      const [expectedW, expectedH] = part.size;
      if (Math.round(size.width) !== Math.round(expectedW) || Math.round(size.height) !== Math.round(expectedH)) {
        fail(`${owner}.size ${expectedW}x${expectedH} does not match ${part.texture} ${size.width}x${size.height}`);
      }
    }
  } catch (error) {
    fail(`${owner}.texture could not be inspected: ${error.message}`);
  }
}

async function validatePart(creature, part, index, partsById) {
  const owner = `${creature.id}.parts[${index}]`;
  if (!isPlainObject(part)) {
    fail(`${owner} must be an object`);
    return;
  }
  if (typeof part.id !== 'string' || !part.id.trim()) fail(`${owner}.id must be a non-empty string`);
  if (typeof part.textureKey !== 'string' || !part.textureKey.trim()) fail(`${owner}.textureKey must be a non-empty string`);
  validateNumberTuple(owner, 'offset', part.offset, 2);
  validateNumberTuple(owner, 'origin', part.origin, 2);
  validateNumberTuple(owner, 'size', part.size, 2);
  if (numberTuple(part.size, 2) && (!positiveNumber(part.size[0]) || !positiveNumber(part.size[1]))) {
    fail(`${owner}.size must be positive`);
  }
  if (!finiteNumber(part.depth)) fail(`${owner}.depth must be a finite number`);
  if (!positiveNumber(part.hitRadius)) fail(`${owner}.hitRadius must be positive`);
  if (!positiveNumber(part.hpMultiplier)) fail(`${owner}.hpMultiplier must be positive`);
  if (!positiveNumber(part.damageMultiplier)) fail(`${owner}.damageMultiplier must be positive`);
  if (!isPlainObject(part.motion)) {
    fail(`${owner}.motion must be an object`);
  } else if (!validMotionKinds.has(part.motion.kind)) {
    fail(`${owner}.motion.kind ${String(part.motion.kind)} is not supported`);
  }
  if (part.anchors !== undefined) {
    if (!isPlainObject(part.anchors)) {
      fail(`${owner}.anchors must be an object`);
    } else {
      for (const [anchorName, anchor] of Object.entries(part.anchors)) {
        if (!numberTuple(anchor, 2)) fail(`${owner}.anchors.${anchorName} must be a 2-number tuple`);
      }
    }
  }
  if (part.parentId) {
    const parent = partsById.get(part.parentId);
    if (!parent) {
      fail(`${creature.id}.${part.id}.parentId references missing part ${part.parentId}`);
    } else {
      if (!anchorExists(parent, part.parentAnchor)) {
        fail(`${creature.id}.${part.id}.parentAnchor ${String(part.parentAnchor)} is missing on ${parent.id}`);
      }
      if (!anchorExists(part, part.anchor)) {
        fail(`${creature.id}.${part.id}.anchor ${String(part.anchor)} is missing on child`);
      }
      if (!numberTuple(part.restOffset, 2)) {
        fail(`${creature.id}.${part.id}.restOffset must be a 2-number tuple for anchored children`);
      }
    }
  }
  await validateTexture(creature, part);
}

async function validateCreature(creature, index) {
  const owner = `creatures[${index}]`;
  if (!isPlainObject(creature)) {
    fail(`${owner} must be an object`);
    return { parts: 0, joints: 0 };
  }
  if (typeof creature.id !== 'string' || !creature.id.trim()) fail(`${owner}.id must be a non-empty string`);
  if (typeof creature.species !== 'string' || !creature.species.trim()) fail(`${owner}.species must be a non-empty string`);
  if (!validBiomes.has(creature.minBiome)) fail(`${creature.id}.minBiome must be 1-4`);
  if (!validRarities.has(creature.rarity)) fail(`${creature.id}.rarity ${String(creature.rarity)} is not supported`);
  if (!positiveNumber(creature.radius)) fail(`${creature.id}.radius must be positive`);
  if (!positiveNumber(creature.hp)) fail(`${creature.id}.hp must be positive`);
  validateNumberTuple(creature.id, 'speed', creature.speed, 2);
  if (numberTuple(creature.speed, 2) && creature.speed[1] < creature.speed[0]) fail(`${creature.id}.speed max is below min`);
  if (!isPlainObject(creature.spawn)) {
    fail(`${creature.id}.spawn must be an object`);
  } else {
    if (!finiteNumber(creature.spawn.minDepth)) fail(`${creature.id}.spawn.minDepth must be finite`);
    if (!finiteNumber(creature.spawn.maxDepth)) fail(`${creature.id}.spawn.maxDepth must be finite`);
    if (!Number.isInteger(creature.spawn.count) || creature.spawn.count < 0) fail(`${creature.id}.spawn.count must be a non-negative integer`);
    if (finiteNumber(creature.spawn.minDepth) && finiteNumber(creature.spawn.maxDepth) && creature.spawn.maxDepth < creature.spawn.minDepth) {
      fail(`${creature.id}.spawn.maxDepth is below minDepth`);
    }
  }
  if (!Array.isArray(creature.parts) || !creature.parts.length) {
    fail(`${creature.id}.parts must contain at least one part`);
    return { parts: 0, joints: 0 };
  }

  const partsById = new Map();
  const textureKeys = new Map();
  for (const part of creature.parts) {
    if (!isPlainObject(part)) continue;
    if (partsById.has(part.id)) fail(`${creature.id}: duplicate part id ${part.id}`);
    partsById.set(part.id, part);
    if (textureKeys.has(part.textureKey)) {
      warn(`${creature.id}: textureKey ${part.textureKey} is shared by ${textureKeys.get(part.textureKey)} and ${part.id}`);
    } else {
      textureKeys.set(part.textureKey, part.id);
    }
  }

  const roots = creature.parts.filter((part) => isPlainObject(part) && !part.parentId);
  if (roots.length !== 1) fail(`${creature.id}: expected exactly one root part, saw ${roots.length}`);
  detectCycles(creature, partsById);

  for (let partIndex = 0; partIndex < creature.parts.length; partIndex += 1) {
    await validatePart(creature, creature.parts[partIndex], partIndex, partsById);
  }
  return {
    parts: creature.parts.length,
    joints: creature.parts.filter((part) => isPlainObject(part) && part.parentId).length,
  };
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.schema !== 'asset-forge/sprite-parts@1') fail('manifest.schema must be asset-forge/sprite-parts@1');
  if (!Array.isArray(manifest.creatures) || !manifest.creatures.length) {
    fail('manifest.creatures must contain at least one creature');
  }

  let partCount = 0;
  let jointCount = 0;
  const creatureIds = new Set();
  if (Array.isArray(manifest.creatures)) {
    for (let index = 0; index < manifest.creatures.length; index += 1) {
      const creature = manifest.creatures[index];
      if (isPlainObject(creature)) {
        if (creatureIds.has(creature.id)) fail(`duplicate creature id ${creature.id}`);
        creatureIds.add(creature.id);
      }
      const summary = await validateCreature(creature, index);
      partCount += summary.parts;
      jointCount += summary.joints;
    }
  }

  for (const message of warnings) console.warn(`Articulated manifest warning: ${message}`);
  if (failures.length) {
    for (const message of failures) console.error(`Articulated manifest failure: ${message}`);
    process.exitCode = 1;
    return;
  }

  const creatureLabel = creatureIds.size === 1 ? 'creature' : 'creatures';
  console.log(`Validated ${creatureIds.size} articulated ${creatureLabel}, ${partCount} parts, ${jointCount} anchored joints.`);
}

main().catch((error) => {
  console.error(`Articulated manifest failure: ${error.message}`);
  process.exitCode = 1;
});
