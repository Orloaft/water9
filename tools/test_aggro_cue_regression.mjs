import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = Object.fromEntries(await Promise.all([
  'src/scene-entities.ts',
  'src/scene-rendering.ts',
  'src/scene-articulated.ts',
  'src/hud.ts',
].map(async (path) => [path, await readFile(new URL(path, root), 'utf8')])));

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(
  /const wasAggroed = fish\.aggro > 0;[\s\S]*if \(!wasAggroed\) fish\.aggroCue = Math\.max\(fish\.aggroCue, 0\.9\);/.test(source['src/scene-entities.ts']),
  'fish acquisition must trigger aggroCue only on the transition from calm to aggroed',
);
assert(
  !/const attacking = fish\.hostile && fish\.aggro > 0/.test(source['src/scene-rendering.ts']),
  'fish warning marker must not render from sustained fish.aggro',
);
assert(
  /if \(cue > 0\) \{[\s\S]*strokeCircle\(fish\.x, fish\.y/.test(source['src/scene-rendering.ts']),
  'fish warning marker must render from the short-lived cue timer',
);
assert(
  /flora\.aggroCue = Math\.max\(flora\.aggroCue, 0\.55\);/.test(source['src/scene-entities.ts']),
  'hazardous flora must trigger the red cue when it deals contact damage',
);
assert(
  !/if \(flora\.hazardous\) \{[\s\S]{0,180}0xff4f64[\s\S]{0,180}strokeCircle\(flora\.x/.test(source['src/scene-rendering.ts']),
  'hazardous flora must not draw the red aggro circle just because it is hazardous',
);
assert(
  /const wasAggroed = creature\.aggro > 0;[\s\S]*if \(!wasAggroed\) creature\.aggroCue = Math\.max\(creature\.aggroCue, 0\.95\);/.test(source['src/scene-articulated.ts']),
  'articulated predator acquisition must trigger aggroCue only on the transition from calm to aggroed',
);
assert(
  /const diagnostic = debugUi\s+\? `/.test(source['src/hud.ts']),
  'controller diagnostic rows should stay hidden unless presentation debug UI is explicitly enabled',
);

if (failures.length) {
  console.error('Water9 aggro cue regression failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Water9 aggro cue regression passed.');
