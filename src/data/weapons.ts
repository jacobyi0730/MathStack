export type WeaponPattern = 'projectile' | 'pierce' | 'orbit' | 'wave' | 'aura' | 'bomb' | 'boomerang' | 'spread';
export type WeaponId =
  | 'hydrogen_arrow'
  | 'neon_beam'
  | 'carbon_ring'
  | 'oxygen_wave'
  | 'iron_barrier'
  | 'magnesium_bomb'
  | 'gold_spiral'
  | 'boron_shot';

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
  neon_beam: {
    id: 'neon_beam',
    name: '네온 광선',
    element: 'Ne',
    atomicNumber: 10,
    damage: 14,
    cooldownSec: 2,
    pattern: 'pierce',
    projectileSpeed: 720,
    projectileRadius: 8,
    projectileLifetimeSec: 0.45,
    range: 700,
    evolvesWith: 'chlorine',
    evolvesTo: 'neon_infinite_beam',
  },
  carbon_ring: {
    id: 'carbon_ring',
    name: '탄소 고리',
    element: 'C',
    atomicNumber: 6,
    damage: 8,
    cooldownSec: 0,
    pattern: 'orbit',
    projectileSpeed: 0,
    projectileRadius: 8,
    projectileLifetimeSec: Number.POSITIVE_INFINITY,
    range: 72,
    evolvesWith: 'nickel',
    evolvesTo: 'diamond_orbit',
  },
  oxygen_wave: {
    id: 'oxygen_wave',
    name: '산소 파동',
    element: 'O',
    atomicNumber: 8,
    damage: 12,
    cooldownSec: 2.5,
    pattern: 'wave',
    projectileSpeed: 300,
    projectileRadius: 18,
    projectileLifetimeSec: 0.7,
    range: 260,
    evolvesWith: 'neodymium',
    evolvesTo: 'ozone_shockwave',
  },
  iron_barrier: {
    id: 'iron_barrier',
    name: '철 결계',
    element: 'Fe',
    atomicNumber: 26,
    damage: 6,
    cooldownSec: 0,
    pattern: 'aura',
    projectileSpeed: 0,
    projectileRadius: 48,
    projectileLifetimeSec: Number.POSITIVE_INFINITY,
    range: 48,
    evolvesWith: 'krypton',
    evolvesTo: 'steel_identity_barrier',
  },
  magnesium_bomb: {
    id: 'magnesium_bomb',
    name: '마그네슘 폭탄',
    element: 'Mg',
    atomicNumber: 12,
    damage: 18,
    cooldownSec: 3,
    pattern: 'bomb',
    projectileSpeed: 300,
    projectileRadius: 11,
    projectileLifetimeSec: 1.5,
    range: 460,
    evolvesWith: 'calcium',
    evolvesTo: 'magnesium_chain_flash',
  },
  gold_spiral: {
    id: 'gold_spiral',
    name: '황금 나선',
    element: 'Au',
    atomicNumber: 79,
    damage: 11,
    cooldownSec: 2.2,
    pattern: 'boomerang',
    projectileSpeed: 360,
    projectileRadius: 9,
    projectileLifetimeSec: 1.35,
    range: 420,
    evolvesWith: 'helium',
    evolvesTo: 'golden_ratio_cycle',
  },
  boron_shot: {
    id: 'boron_shot',
    name: '붕소 산탄',
    element: 'B',
    atomicNumber: 5,
    damage: 5,
    cooldownSec: 1.8,
    pattern: 'spread',
    projectileSpeed: 430,
    projectileRadius: 5,
    projectileLifetimeSec: 0.95,
    range: 430,
    evolvesWith: 'silver',
    evolvesTo: 'boron_infinite_barrage',
  },
} as const satisfies Record<WeaponId, WeaponDefinition>;
