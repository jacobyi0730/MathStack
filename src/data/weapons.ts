export type WeaponPattern = 'projectile' | 'pierce' | 'orbit' | 'wave' | 'aura' | 'bomb' | 'boomerang' | 'spread';
export type WeaponId = 'hydrogen_arrow';

export interface WeaponDefinition {
  readonly id: WeaponId;
  readonly name: string;
  readonly element: string;
  readonly atomicNumber: number;
  readonly damage: number;
  readonly cooldownSec: number;
  readonly pattern: WeaponPattern;
  readonly projectileSpeed: number;
  readonly projectileRadius: number;
  readonly projectileLifetimeSec: number;
  readonly range: number;
  readonly evolvesWith: string;
  readonly evolvesTo: string;
}

export const WEAPON_SLOT_CAPACITY = 6;
export const WEAPON_MAX_LEVEL = 5;
export const WEAPON_DAMAGE_BONUS_PER_LEVEL = 0.2;
export const WEAPON_PROJECTILE_RANGE_LEVEL = 3;
export const WEAPON_EVOLUTION_LEVEL = 5;

export const WEAPONS = {
  hydrogen_arrow: {
    id: 'hydrogen_arrow',
    name: '수소 화살',
    element: 'H',
    atomicNumber: 1,
    damage: 10,
    cooldownSec: 1.2,
    pattern: 'projectile',
    projectileSpeed: 460,
    projectileRadius: 5,
    projectileLifetimeSec: 1.2,
    range: 520,
    evolvesWith: 'silicon',
    evolvesTo: 'heavy_hydrogen_storm',
  },
} as const satisfies Record<WeaponId, WeaponDefinition>;
