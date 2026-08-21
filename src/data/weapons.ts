import type { PassiveId } from './passives.js';

export type WeaponPattern = 'projectile' | 'pierce' | 'orbit' | 'wave' | 'aura' | 'bomb' | 'boomerang' | 'spread';
export type BaseWeaponId =
  | 'hydrogen_arrow'
  | 'neon_beam'
  | 'carbon_ring'
  | 'oxygen_wave'
  | 'iron_barrier'
  | 'magnesium_bomb'
  | 'gold_spiral'
  | 'boron_shot';
export type EvolutionWeaponId =
  | 'heavy_hydrogen_storm'
  | 'neon_infinite_beam'
  | 'diamond_orbit'
  | 'ozone_shockwave'
  | 'steel_identity_barrier'
  | 'magnesium_chain_flash'
  | 'golden_ratio_cycle'
  | 'boron_infinite_barrage';
export type WeaponId = BaseWeaponId | EvolutionWeaponId;

export interface WeaponDefinition {
  readonly id: WeaponId;
  readonly name: string;
  readonly element: string;
  readonly atomicNumber: number;
  readonly damage: number;
  readonly cooldownSec: number;
  readonly pattern: WeaponPattern;
  /** 투사체에 그릴 이모지. 원소 기호만으로는 적과 구분되지 않는다 (05-세션-운영 §14.5) */
  readonly icon: string;
  readonly projectileSpeed: number;
  readonly projectileRadius: number;
  readonly projectileLifetimeSec: number;
  readonly range: number;
  readonly projectileCount?: number;
  readonly evolvesWith?: PassiveId;
  readonly evolvesTo?: EvolutionWeaponId;
  readonly evolutionOf?: BaseWeaponId;
}

export const WEAPON_SLOT_CAPACITY = 6;
export const WEAPON_MAX_LEVEL = 5;
export const WEAPON_DAMAGE_BONUS_PER_LEVEL = 0.2;
export const WEAPON_PROJECTILE_RANGE_LEVEL = 3;
export const WEAPON_EVOLUTION_LEVEL = 5;

export const WEAPONS = {
  hydrogen_arrow: {
    id: 'hydrogen_arrow',
    icon: '🏹',
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
    icon: '⚡',
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
    icon: '💠',
    name: '탄소 고리',
    element: 'C',
    atomicNumber: 6,
    damage: 8,
    cooldownSec: 0,
    pattern: 'orbit',
    projectileSpeed: 0,
    projectileRadius: 8,
    projectileLifetimeSec: Number.POSITIVE_INFINITY,
    range: 144,
    evolvesWith: 'nickel',
    evolvesTo: 'diamond_orbit',
  },
  oxygen_wave: {
    id: 'oxygen_wave',
    icon: '🌊',
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
    icon: '⚙️',
    name: '철 결계',
    element: 'Fe',
    atomicNumber: 26,
    damage: 6,
    cooldownSec: 0,
    pattern: 'aura',
    projectileSpeed: 0,
    projectileRadius: 48,
    projectileLifetimeSec: Number.POSITIVE_INFINITY,
    range: 96,
    evolvesWith: 'krypton',
    evolvesTo: 'steel_identity_barrier',
  },
  magnesium_bomb: {
    id: 'magnesium_bomb',
    icon: '💥',
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
    icon: '🌀',
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
    icon: '✨',
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
  heavy_hydrogen_storm: {
    id: 'heavy_hydrogen_storm',
    icon: '☄️',
    name: 'Heavy Hydrogen Storm',
    element: 'D',
    atomicNumber: 1,
    damage: 12,
    cooldownSec: 1.1,
    pattern: 'spread',
    projectileSpeed: 520,
    projectileRadius: 5,
    projectileLifetimeSec: 1.25,
    range: 560,
    projectileCount: 8,
    evolutionOf: 'hydrogen_arrow',
  },
  neon_infinite_beam: {
    id: 'neon_infinite_beam',
    icon: '🔆',
    name: 'Neon Infinite Beam',
    element: 'Ne',
    atomicNumber: 10,
    damage: 22,
    cooldownSec: 0.7,
    pattern: 'pierce',
    projectileSpeed: 860,
    projectileRadius: 10,
    projectileLifetimeSec: 0.7,
    range: 900,
    projectileCount: 2,
    evolutionOf: 'neon_beam',
  },
  diamond_orbit: {
    id: 'diamond_orbit',
    icon: '💎',
    name: 'Diamond Orbit',
    element: 'C',
    atomicNumber: 6,
    damage: 13,
    cooldownSec: 0,
    pattern: 'orbit',
    projectileSpeed: 0,
    projectileRadius: 9,
    projectileLifetimeSec: Number.POSITIVE_INFINITY,
    range: 184,
    projectileCount: 6,
    evolutionOf: 'carbon_ring',
  },
  ozone_shockwave: {
    id: 'ozone_shockwave',
    icon: '🌪️',
    name: 'Ozone Shockwave',
    element: 'O3',
    atomicNumber: 8,
    damage: 20,
    cooldownSec: 2.1,
    pattern: 'wave',
    projectileSpeed: 360,
    projectileRadius: 22,
    projectileLifetimeSec: 0.8,
    range: 330,
    projectileCount: 3,
    evolutionOf: 'oxygen_wave',
  },
  steel_identity_barrier: {
    id: 'steel_identity_barrier',
    icon: '🔰',
    name: 'Steel Identity Barrier',
    element: 'FeC',
    atomicNumber: 26,
    damage: 10,
    cooldownSec: 0,
    pattern: 'aura',
    projectileSpeed: 0,
    projectileRadius: 68,
    projectileLifetimeSec: Number.POSITIVE_INFINITY,
    range: 136,
    evolutionOf: 'iron_barrier',
  },
  magnesium_chain_flash: {
    id: 'magnesium_chain_flash',
    icon: '🌋',
    name: 'Magnesium Chain Flash',
    element: 'Mg',
    atomicNumber: 12,
    damage: 26,
    cooldownSec: 2.4,
    pattern: 'bomb',
    projectileSpeed: 340,
    projectileRadius: 12,
    projectileLifetimeSec: 1.55,
    range: 520,
    projectileCount: 4,
    evolutionOf: 'magnesium_bomb',
  },
  golden_ratio_cycle: {
    id: 'golden_ratio_cycle',
    icon: '🌟',
    name: 'Golden Ratio Cycle',
    element: 'Au',
    atomicNumber: 79,
    damage: 17,
    cooldownSec: 1.8,
    pattern: 'boomerang',
    projectileSpeed: 420,
    projectileRadius: 10,
    projectileLifetimeSec: 1.45,
    range: 520,
    projectileCount: 3,
    evolutionOf: 'gold_spiral',
  },
  boron_infinite_barrage: {
    id: 'boron_infinite_barrage',
    icon: '🎆',
    name: 'Boron Infinite Barrage',
    element: 'B',
    atomicNumber: 5,
    damage: 8,
    cooldownSec: 1.35,
    pattern: 'spread',
    projectileSpeed: 470,
    projectileRadius: 5,
    projectileLifetimeSec: 1,
    range: 470,
    projectileCount: 12,
    evolutionOf: 'boron_shot',
  },
} as const satisfies Record<WeaponId, WeaponDefinition>;
