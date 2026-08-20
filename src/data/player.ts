import {
  CHARACTER_ARCHETYPES,
  FIELD_BOUNDS,
  PLAYER_BASE_MAX_HEALTH,
  PLAYER_BASE_MOVE_SPEED,
  PLAYER_BASE_PROJECTILE_COUNT,
  PLAYER_RADIUS,
  PLAYER_SLOT_CAPACITY,
  type CharacterId,
} from './characters.js';

export { PLAYER_SLOT_CAPACITY };
export const WORLD_BOUNDS = FIELD_BOUNDS;

export const PLAYER_BASE_STATS = {
  radius: PLAYER_RADIUS,
  maxHealth: PLAYER_BASE_MAX_HEALTH,
  moveSpeed: PLAYER_BASE_MOVE_SPEED,
  projectileCountBonus: PLAYER_BASE_PROJECTILE_COUNT - 1,
  attackRangeMultiplier: 1,
  cooldownMultiplier: 1,
} as const;

export interface CharacterProfile {
  readonly id: CharacterId;
  readonly name: string;
  readonly element: string;
  readonly atomicNumber: number;
  readonly paletteIndex: 0 | 1 | 2 | 3;
  readonly accessoryKind: 0 | 1 | 2;
  readonly bodyColor: string;
  readonly accessoryColor: string;
  readonly startingWeaponId: string;
  readonly maxHealthMultiplier: number;
  readonly moveSpeedMultiplier: number;
  readonly projectileCountBonus: number;
  readonly attackRangeMultiplier: number;
  readonly cooldownMultiplier: number;
}

export const CHARACTER_PROFILES = Object.freeze({
  hydrogen: fromArchetype(CHARACTER_ARCHETYPES[0], 0, 0, 'hydrogen_arrow'),
  neon: fromArchetype(CHARACTER_ARCHETYPES[1], 1, 1, 'neon_beam'),
  carbon: fromArchetype(CHARACTER_ARCHETYPES[2], 2, 2, 'carbon_ring'),
  oxygen: fromArchetype(CHARACTER_ARCHETYPES[3], 3, 0, 'oxygen_wave'),
}) satisfies Record<CharacterId, CharacterProfile>;

export function isCharacterId(value: string): value is CharacterId {
  return value in CHARACTER_PROFILES;
}

function fromArchetype(
  archetype: (typeof CHARACTER_ARCHETYPES)[number],
  paletteIndex: 0 | 1 | 2 | 3,
  accessoryKind: 0 | 1 | 2,
  startingWeaponId: string,
): CharacterProfile {
  return {
    id: archetype.id,
    name: archetype.name,
    element: archetype.element,
    atomicNumber: archetype.atomicNumber,
    paletteIndex,
    accessoryKind,
    bodyColor: archetype.bodyColor,
    accessoryColor: archetype.accessoryColor,
    startingWeaponId,
    maxHealthMultiplier: archetype.maxHealthMultiplier,
    moveSpeedMultiplier: archetype.moveSpeedMultiplier,
    projectileCountBonus: archetype.projectileBonus,
    attackRangeMultiplier: archetype.rangeMultiplier,
    cooldownMultiplier: archetype.cooldownMultiplier,
  };
}
