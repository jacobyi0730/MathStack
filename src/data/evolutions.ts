import type { PassiveId } from './passives.js';
import type { BaseWeaponId, EvolutionWeaponId } from './weapons.js';

export interface EvolutionDefinition {
  readonly id: EvolutionWeaponId;
  readonly baseWeapon: BaseWeaponId;
  readonly passive: PassiveId;
  readonly name: string;
  readonly transformReason: string;
  readonly effect: string;
  readonly signal: EvolutionSignalKind;
}

export type EvolutionSignalKind =
  | 'isotope_storm'
  | 'infinite_beam'
  | 'crystal_orbit'
  | 'ozone_burst'
  | 'reflect_barrier'
  | 'chain_flash'
  | 'ratio_cycle'
  | 'lucky_barrage';

export const EVOLUTIONS = {
  heavy_hydrogen_storm: {
    id: 'heavy_hydrogen_storm',
    baseWeapon: 'hydrogen_arrow',
    passive: 'silicon',
    name: 'Heavy Hydrogen Storm',
    transformReason: 'Hydrogen becomes its heavier isotope.',
    effect: 'Eight piercing arrows fire together.',
    signal: 'isotope_storm',
  },
  neon_infinite_beam: {
    id: 'neon_infinite_beam',
    baseWeapon: 'neon_beam',
    passive: 'chlorine',
    name: 'Neon Infinite Beam',
    transformReason: 'A neon sign keeps glowing.',
    effect: 'Long piercing beams cross the screen.',
    signal: 'infinite_beam',
  },
  diamond_orbit: {
    id: 'diamond_orbit',
    baseWeapon: 'carbon_ring',
    passive: 'nickel',
    name: 'Diamond Orbit',
    transformReason: 'Carbon becomes diamond.',
    effect: 'Six orbitals grind nearby enemies.',
    signal: 'crystal_orbit',
  },
  ozone_shockwave: {
    id: 'ozone_shockwave',
    baseWeapon: 'oxygen_wave',
    passive: 'neodymium',
    name: 'Ozone Shockwave',
    transformReason: 'Oxygen gathers into ozone.',
    effect: 'A larger three-part shockwave erupts.',
    signal: 'ozone_burst',
  },
  steel_identity_barrier: {
    id: 'steel_identity_barrier',
    baseWeapon: 'iron_barrier',
    passive: 'krypton',
    name: 'Steel Identity Barrier',
    transformReason: 'Iron strengthened by carbon becomes steel.',
    effect: 'A wider barrier holds the identity line.',
    signal: 'reflect_barrier',
  },
  magnesium_chain_flash: {
    id: 'magnesium_chain_flash',
    baseWeapon: 'magnesium_bomb',
    passive: 'calcium',
    name: 'Magnesium Chain Flash',
    transformReason: 'Burning magnesium flashes white.',
    effect: 'Four chain bombs split the blast.',
    signal: 'chain_flash',
  },
  golden_ratio_cycle: {
    id: 'golden_ratio_cycle',
    baseWeapon: 'gold_spiral',
    passive: 'helium',
    name: 'Golden Ratio Cycle',
    transformReason: 'Gold follows the golden ratio.',
    effect: 'Three boomerangs cycle around the player.',
    signal: 'ratio_cycle',
  },
  boron_infinite_barrage: {
    id: 'boron_infinite_barrage',
    baseWeapon: 'boron_shot',
    passive: 'silver',
    name: 'Boron Infinite Barrage',
    transformReason: 'Five shots unfold into a wider barrage.',
    effect: 'Twelve spreading shots gain lucky impact.',
    signal: 'lucky_barrage',
  },
} as const satisfies Record<EvolutionWeaponId, EvolutionDefinition>;

export const EVOLUTION_IDS = Object.keys(EVOLUTIONS) as EvolutionWeaponId[];
