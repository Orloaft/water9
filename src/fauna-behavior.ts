import type { FishBehaviorClass,FishSpecies,TerrainAffinity,TerrainSurfaceAnchor } from './types';

export type FaunaBehaviorProfile = {
  behaviorClass: FishBehaviorClass;
  terrainAffinity: TerrainAffinity;
  preferredAnchors: TerrainSurfaceAnchor['anchor'][];
  clearance: number;
  tetherRadius: number;
  lungeRange?: number;
};

const FIRST_SLICE_PROFILES: Record<string, FaunaBehaviorProfile> = {
  'Nacre Thorn Clam': {
    behaviorClass: 'sessileAttached',
    terrainAffinity: 'bottom',
    preferredAnchors: ['floor'],
    clearance: 3,
    tetherRadius: 0,
  },
  'Glimmer Spine Urchin': {
    behaviorClass: 'sessileAttached',
    terrainAffinity: 'surfaceAttached',
    preferredAnchors: ['floor', 'leftWall', 'rightWall', 'ceiling'],
    clearance: 7,
    tetherRadius: 0,
  },
  'Cinder Vent Clingfish': {
    behaviorClass: 'sessileAttached',
    terrainAffinity: 'wall',
    preferredAnchors: ['leftWall', 'rightWall', 'ceiling', 'floor'],
    clearance: 5,
    tetherRadius: 0,
  },
  'Shellback Garden Eel': {
    behaviorClass: 'verticalAnchored',
    terrainAffinity: 'bottom',
    preferredAnchors: ['floor'],
    clearance: 8,
    tetherRadius: 2,
  },
  Tripodfish: {
    behaviorClass: 'verticalAnchored',
    terrainAffinity: 'bottom',
    preferredAnchors: ['floor'],
    clearance: 10,
    tetherRadius: 2,
  },
  'Goldcap Tripodfish': {
    behaviorClass: 'verticalAnchored',
    terrainAffinity: 'bottom',
    preferredAnchors: ['floor'],
    clearance: 10,
    tetherRadius: 2,
  },
  'Ember Needle Pipefish': {
    behaviorClass: 'verticalAnchored',
    terrainAffinity: 'nearTerrain',
    preferredAnchors: ['floor', 'leftWall', 'rightWall'],
    clearance: 14,
    tetherRadius: 8,
  },
  'Basalt Lantern Seahorse': {
    behaviorClass: 'verticalAnchored',
    terrainAffinity: 'nearTerrain',
    preferredAnchors: ['floor', 'leftWall', 'rightWall'],
    clearance: 14,
    tetherRadius: 10,
  },
  'Copper Banded Seahorse': {
    behaviorClass: 'verticalAnchored',
    terrainAffinity: 'nearTerrain',
    preferredAnchors: ['floor', 'leftWall', 'rightWall'],
    clearance: 14,
    tetherRadius: 10,
  },
  'Snapping Shrimp': {
    behaviorClass: 'benthicWalker',
    terrainAffinity: 'nearTerrain',
    preferredAnchors: ['floor', 'leftWall', 'rightWall'],
    clearance: 7,
    tetherRadius: 18,
  },
  'Mantis Shrimp': {
    behaviorClass: 'benthicWalker',
    terrainAffinity: 'bottom',
    preferredAnchors: ['floor'],
    clearance: 8,
    tetherRadius: 22,
    lungeRange: 86,
  },
  'Opal Fan Shrimp': {
    behaviorClass: 'benthicWalker',
    terrainAffinity: 'nearTerrain',
    preferredAnchors: ['floor', 'leftWall', 'rightWall'],
    clearance: 7,
    tetherRadius: 18,
  },
  'Silver Hinge Crab': {
    behaviorClass: 'benthicWalker',
    terrainAffinity: 'bottom',
    preferredAnchors: ['floor'],
    clearance: 8,
    tetherRadius: 18,
  },
  'Deep Sea Shrimp': {
    behaviorClass: 'benthicWalker',
    terrainAffinity: 'nearTerrain',
    preferredAnchors: ['floor', 'leftWall', 'rightWall'],
    clearance: 8,
    tetherRadius: 20,
  },
  'Sea Spider': {
    behaviorClass: 'benthicWalker',
    terrainAffinity: 'bottom',
    preferredAnchors: ['floor', 'leftWall', 'rightWall'],
    clearance: 9,
    tetherRadius: 22,
    lungeRange: 82,
  },
  'Chimney Ghost Shrimp': {
    behaviorClass: 'benthicWalker',
    terrainAffinity: 'nearTerrain',
    preferredAnchors: ['floor', 'leftWall', 'rightWall'],
    clearance: 8,
    tetherRadius: 20,
  },
  'Brass Knuckle Prawn': {
    behaviorClass: 'benthicWalker',
    terrainAffinity: 'bottom',
    preferredAnchors: ['floor'],
    clearance: 9,
    tetherRadius: 22,
    lungeRange: 92,
  },
  'Tin Plate Searobin': {
    behaviorClass: 'benthicWalker',
    terrainAffinity: 'bottom',
    preferredAnchors: ['floor'],
    clearance: 8,
    tetherRadius: 20,
  },
  'Hadopelagic Shrimp': {
    behaviorClass: 'benthicWalker',
    terrainAffinity: 'nearTerrain',
    preferredAnchors: ['floor', 'leftWall', 'rightWall'],
    clearance: 8,
    tetherRadius: 20,
  },
};

export function fishBehaviorProfile(species: FishSpecies): FaunaBehaviorProfile {
  return species.behaviorClass
    ? {
        behaviorClass: species.behaviorClass,
        terrainAffinity: species.terrainAffinity ?? 'openWater',
        preferredAnchors: ['floor', 'leftWall', 'rightWall', 'ceiling'],
        clearance: 8,
        tetherRadius: 16,
      }
    : FIRST_SLICE_PROFILES[species.species] ?? legacyFishBehaviorProfile();
}

export function legacyFishBehaviorProfile(): FaunaBehaviorProfile {
  return {
    behaviorClass: 'legacySwimmer',
    terrainAffinity: 'openWater',
    preferredAnchors: ['floor', 'leftWall', 'rightWall', 'ceiling'],
    clearance: 0,
    tetherRadius: 0,
  };
}

export function firstSliceFaunaNames() {
  return Object.keys(FIRST_SLICE_PROFILES);
}

export function behaviorLogbookMotion(profile: FaunaBehaviorProfile) {
  if (profile.behaviorClass === 'sessileAttached') return 'stays attached to exposed terrain and reacts only to close contact';
  if (profile.behaviorClass === 'verticalAnchored') return 'holds a rooted posture near terrain with short sways and retractions';
  if (profile.behaviorClass === 'benthicWalker') return 'walks the bottom and skitters along terrain instead of swimming in open water';
  return '';
}
