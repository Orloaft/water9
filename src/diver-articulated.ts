import Phaser from 'phaser';

export interface ArticulatedDiverPartSpec {
  id: string;
  textureKey: string;
  texture: string;
  offset: [number, number];
  origin: [number, number];
  size: [number, number];
  depth: number;
  rotation?: number;
  role: 'body' | 'head' | 'arm' | 'tool' | 'frontLeg' | 'rearLeg' | 'pack';
}

export const DIVER_ARTICULATED_PART_SPECS: ArticulatedDiverPartSpec[] = [
  {
    id: 'backpack',
    textureKey: 'diver-articulated-suit-backpack',
    texture: 'diver-articulated-suit-backpack.png',
    offset: [-123.5, -87],
    origin: [0.55, 0.48],
    size: [150, 180],
    depth: -0.04,
    role: 'pack',
  },
  {
    id: 'rear-thigh',
    textureKey: 'diver-articulated-suit-rear-thigh',
    texture: 'diver-articulated-suit-rear-thigh.png',
    offset: [-138.5, 88],
    origin: [0.68, 0.24],
    size: [170, 90],
    depth: -0.03,
    role: 'rearLeg',
  },
  {
    id: 'rear-shin',
    textureKey: 'diver-articulated-suit-rear-shin',
    texture: 'diver-articulated-suit-rear-shin.png',
    offset: [-286, 108],
    origin: [0.76, 0.28],
    size: [185, 100],
    depth: -0.02,
    role: 'rearLeg',
  },
  {
    id: 'torso',
    textureKey: 'diver-articulated-suit-torso',
    texture: 'diver-articulated-suit-torso.png',
    offset: [-16, -39.5],
    origin: [0.48, 0.48],
    size: [175, 215],
    depth: 0,
    role: 'body',
  },
  {
    id: 'front-thigh',
    textureKey: 'diver-articulated-suit-front-thigh',
    texture: 'diver-articulated-suit-front-thigh.png',
    offset: [-103.5, 113],
    origin: [0.52, 0.22],
    size: [170, 90],
    depth: 0.02,
    role: 'frontLeg',
  },
  {
    id: 'front-shin',
    textureKey: 'diver-articulated-suit-front-shin',
    texture: 'diver-articulated-suit-front-shin.png',
    offset: [-228.5, 145.5],
    origin: [0.64, 0.22],
    size: [190, 105],
    depth: 0.03,
    role: 'frontLeg',
  },
  {
    id: 'helmet',
    textureKey: 'diver-articulated-suit-helmet',
    texture: 'diver-articulated-suit-helmet.png',
    offset: [114, -79.5],
    origin: [0.42, 0.56],
    size: [145, 135],
    depth: 0.06,
    role: 'head',
  },
  {
    id: 'upper-arm',
    textureKey: 'diver-articulated-suit-upper-arm',
    texture: 'diver-articulated-suit-upper-arm.png',
    offset: [-3.5, -14.5],
    origin: [0.18, 0.35],
    size: [150, 95],
    depth: 0.08,
    role: 'arm',
  },
  {
    id: 'forearm',
    textureKey: 'diver-articulated-suit-forearm',
    texture: 'diver-articulated-suit-forearm.png',
    offset: [134, 3],
    origin: [0.17, 0.42],
    size: [155, 80],
    depth: 0.09,
    role: 'arm',
  },
  {
    id: 'hand',
    textureKey: 'diver-articulated-suit-hand',
    texture: 'diver-articulated-suit-hand.png',
    offset: [201.5, 10.5],
    origin: [0.25, 0.5],
    size: [70, 55],
    depth: 0.1,
    role: 'arm',
  },
  {
    id: 'tool',
    textureKey: 'diver-articulated-suit-tool',
    texture: 'diver-articulated-suit-tool.png',
    offset: [301.5, 28],
    origin: [0.12, 0.48],
    size: [230, 90],
    depth: 0.11,
    role: 'tool',
  },
];

export function loadArticulatedDiverAssets(scene: Phaser.Scene) {
  for (const part of DIVER_ARTICULATED_PART_SPECS) {
    if (scene.textures.exists(part.textureKey)) continue;
    scene.load.image(part.textureKey, `/assets/generated/${part.texture}`);
  }
}
