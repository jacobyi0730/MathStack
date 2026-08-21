export type CharacterId = 'actinium' | 'thorium' | 'lanthanum' | 'cerium';

export interface CharacterArchetype {
  readonly id: CharacterId;
  readonly name: string;
  readonly element: string;
  readonly atomicNumber: number;
  readonly bodyColor: string;
  readonly accessoryColor: string;
  readonly moveSpeedMultiplier: number;
  readonly maxHealthMultiplier: number;
  readonly projectileBonus: number;
  readonly attackPowerMultiplier: number;
  readonly rangeMultiplier: number;
  readonly cooldownMultiplier: number;
}

export interface MovementBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export const PLAYER_SLOT_CAPACITY = 6;
export const PLAYER_BASE_MAX_HEALTH = 100;
export const PLAYER_BASE_MOVE_SPEED = 260;
export const PLAYER_BASE_PROJECTILE_COUNT = 1;
export const PLAYER_RADIUS = 24;

export const FIELD_BOUNDS: MovementBounds = Object.freeze({
  minX: -4096,
  maxX: 4096,
  minY: -4096,
  maxY: 4096,
});

export const CHARACTER_ARCHETYPES = [
  {
    id: 'actinium',
    name: '악티늄 동글이',
    element: 'Ac',
    atomicNumber: 89,
    bodyColor: '#4CAF50',
    accessoryColor: '#B8F08A',
    moveSpeedMultiplier: 1,
    maxHealthMultiplier: 1,
    projectileBonus: 0,
    attackPowerMultiplier: 1,
    rangeMultiplier: 1,
    cooldownMultiplier: 1,
  },
  {
    id: 'thorium',
    name: '토륨 동글이',
    element: 'Th',
    atomicNumber: 90,
    bodyColor: '#2196F3',
    accessoryColor: '#8ED5FF',
    moveSpeedMultiplier: 1,
    maxHealthMultiplier: 1,
    projectileBonus: 0,
    attackPowerMultiplier: 1,
    rangeMultiplier: 1,
    cooldownMultiplier: 1,
  },
  {
    id: 'lanthanum',
    name: '란타넘 동글이',
    element: 'La',
    atomicNumber: 57,
    bodyColor: '#FF9800',
    accessoryColor: '#FFD08A',
    moveSpeedMultiplier: 1,
    maxHealthMultiplier: 1,
    projectileBonus: 0,
    attackPowerMultiplier: 1,
    rangeMultiplier: 1,
    cooldownMultiplier: 1,
  },
  {
    id: 'cerium',
    name: '세륨 동글이',
    element: 'Ce',
    atomicNumber: 58,
    bodyColor: '#9C27B0',
    accessoryColor: '#E4A5FF',
    moveSpeedMultiplier: 1,
    maxHealthMultiplier: 1,
    projectileBonus: 0,
    attackPowerMultiplier: 1,
    rangeMultiplier: 1,
    cooldownMultiplier: 1,
  },
] as const satisfies readonly CharacterArchetype[];

export const DEFAULT_CHARACTER_ID: CharacterId = 'actinium';

export function getCharacterArchetype(id: CharacterId): CharacterArchetype {
  const archetype = CHARACTER_ARCHETYPES.find((candidate) => candidate.id === id);
  if (!archetype) {
    throw new Error(`알 수 없는 캐릭터입니다: ${id}`);
  }
  return archetype;
}
