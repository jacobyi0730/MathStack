export type CharacterId = 'hydrogen' | 'neon' | 'carbon' | 'oxygen';

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
  minX: -960,
  maxX: 960,
  minY: -540,
  maxY: 540,
});

export const CHARACTER_ARCHETYPES = [
  {
    id: 'hydrogen',
    name: '수소 동글이',
    element: 'H',
    atomicNumber: 1,
    bodyColor: '#4CAF50',
    accessoryColor: '#B8F08A',
    moveSpeedMultiplier: 1,
    maxHealthMultiplier: 1.1,
    projectileBonus: 0,
    attackPowerMultiplier: 1,
    rangeMultiplier: 1,
    cooldownMultiplier: 1,
  },
  {
    id: 'neon',
    name: '네온 동글이',
    element: 'Ne',
    atomicNumber: 10,
    bodyColor: '#2196F3',
    accessoryColor: '#8ED5FF',
    moveSpeedMultiplier: 1.15,
    maxHealthMultiplier: 0.9,
    projectileBonus: 0,
    attackPowerMultiplier: 1,
    rangeMultiplier: 1,
    cooldownMultiplier: 1,
  },
  {
    id: 'carbon',
    name: '탄소 동글이',
    element: 'C',
    atomicNumber: 6,
    bodyColor: '#FF9800',
    accessoryColor: '#FFD08A',
    moveSpeedMultiplier: 1,
    maxHealthMultiplier: 1,
    projectileBonus: 1,
    attackPowerMultiplier: 0.9,
    rangeMultiplier: 1,
    cooldownMultiplier: 1,
  },
  {
    id: 'oxygen',
    name: '산소 동글이',
    element: 'O',
    atomicNumber: 8,
    bodyColor: '#9C27B0',
    accessoryColor: '#E4A5FF',
    moveSpeedMultiplier: 1,
    maxHealthMultiplier: 1,
    projectileBonus: 0,
    attackPowerMultiplier: 1,
    rangeMultiplier: 1.2,
    cooldownMultiplier: 1.1,
  },
] as const satisfies readonly CharacterArchetype[];

export const DEFAULT_CHARACTER_ID: CharacterId = 'hydrogen';

export function getCharacterArchetype(id: CharacterId): CharacterArchetype {
  const archetype = CHARACTER_ARCHETYPES.find((candidate) => candidate.id === id);
  if (!archetype) {
    throw new Error(`알 수 없는 캐릭터입니다: ${id}`);
  }
  return archetype;
}
