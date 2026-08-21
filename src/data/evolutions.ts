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
  doomsday_nuclear_bomb: {
    id: 'doomsday_nuclear_bomb',
    baseWeapon: 'plutonium_core',
    passive: 'uranium',
    name: '종말의 핵폭탄',
    transformReason: 'Uranium and plutonium combine into a catastrophic nuclear blast.',
    effect: 'A chain of large bombs clears dense waves.',
    signal: 'chain_flash',
  },
  permanent_reactor_fuel: {
    id: 'permanent_reactor_fuel',
    baseWeapon: 'thorium_hammer',
    passive: 'uranium',
    name: '영구의 원전 연료',
    transformReason: 'Thorium fuel cycles are stabilized by uranium breeding.',
    effect: 'A permanent reactor aura burns nearby enemies.',
    signal: 'reflect_barrier',
  },
  night_vision_scope: {
    id: 'night_vision_scope',
    baseWeapon: 'samarium_fan',
    passive: 'europium',
    name: '암시의 야간 투시경',
    transformReason: 'Europium phosphors and samarium filters turn darkness into sight.',
    effect: 'A wide fan of night shots searches targets.',
    signal: 'lucky_barrage',
  },
  deep_sea_sonar: {
    id: 'deep_sea_sonar',
    baseWeapon: 'terbium_pulse',
    passive: 'gadolinium',
    name: '심해의 음파 탐지기',
    transformReason: 'Gadolinium and terbium make a stronger detection pulse.',
    effect: 'Four deep sonar waves expand through enemies.',
    signal: 'ozone_burst',
  },
  ignition_flint_lighter: {
    id: 'ignition_flint_lighter',
    baseWeapon: 'cerium_spark',
    passive: 'praseodymium',
    name: '점화의 라이터 부싯돌',
    transformReason: 'Cerium-rich flint ignites when struck with praseodymium alloy.',
    effect: 'Ignition sparks spread faster and wider.',
    signal: 'isotope_storm',
  },
  precision_cancer_sensor: {
    id: 'precision_cancer_sensor',
    baseWeapon: 'lanthanum_lance',
    passive: 'lutetium',
    name: '정밀의 암 진단 센서',
    transformReason: 'Lutetium tracers guide lanthanum precision detection.',
    effect: 'Precision beams lock onto distant targets.',
    signal: 'infinite_beam',
  },
  industrial_cutting_laser: {
    id: 'industrial_cutting_laser',
    baseWeapon: 'ytterbium_star',
    passive: 'neodymium',
    name: '절단의 산업 레이저',
    transformReason: 'Nd:Yb lasers cut industrial materials.',
    effect: 'Long cutting lasers pierce across the field.',
    signal: 'infinite_beam',
  },
  infinite_atomic_battery: {
    id: 'infinite_atomic_battery',
    baseWeapon: 'promethium_burst',
    passive: 'neodymium',
    name: '무한의 원자력 전지',
    transformReason: 'Promethium batteries gain stable output from neodymium control.',
    effect: 'Atomic battery bursts chain into repeated blasts.',
    signal: 'chain_flash',
  },
  cryogenic_mri_magnet: {
    id: 'cryogenic_mri_magnet',
    baseWeapon: 'dysprosium_guard',
    passive: 'holmium',
    name: '극저온의 MRI 자석',
    transformReason: 'Holmium and dysprosium strengthen extreme magnetic fields.',
    effect: 'A cold magnetic field grinds enemies nearby.',
    signal: 'crystal_orbit',
  },
  cautery_laser: {
    id: 'cautery_laser',
    baseWeapon: 'thulium_thread',
    passive: 'erbium',
    name: '작열의 소작 레이저',
    transformReason: 'Erbium and thulium medical lasers cauterize with heat.',
    effect: 'Hot surgical beams pierce twice.',
    signal: 'infinite_beam',
  },
  anticancer_annihilator: {
    id: 'anticancer_annihilator',
    baseWeapon: 'actinium_spear',
    passive: 'protactinium',
    name: '궤멸의 항암 치료제',
    transformReason: 'Actinium therapy is guided into destructive precision.',
    effect: 'Four precise treatment shots erase priority targets.',
    signal: 'isotope_storm',
  },
  fire_alarm_guard: {
    id: 'fire_alarm_guard',
    baseWeapon: 'neptunium_tide',
    passive: 'americium',
    name: '경계의 화재경보기',
    transformReason: 'Americium smoke detectors raise an alarm around neptunium waves.',
    effect: 'Alarm waves repeatedly sweep the field.',
    signal: 'ozone_burst',
  },
  synthetic_element_target: {
    id: 'synthetic_element_target',
    baseWeapon: 'berkelium_arc',
    passive: 'curium',
    name: '창조의 인공원소 타깃',
    transformReason: 'Curium and berkelium become targets for creating heavier elements.',
    effect: 'Target beams pierce through lined-up enemies.',
    signal: 'ratio_cycle',
  },
  neutron_probe: {
    id: 'neutron_probe',
    baseWeapon: 'californium_ray',
    passive: 'einsteinium',
    name: '투과의 중성자 탐사기',
    transformReason: 'Californium neutron sources probe what ordinary light cannot see.',
    effect: 'Neutron probes fire three penetrating rays.',
    signal: 'infinite_beam',
  },
  particle_collider: {
    id: 'particle_collider',
    baseWeapon: 'mendelevium_mine',
    passive: 'fermium',
    name: '가속의 입자 충돌기',
    transformReason: 'Fermium and mendelevium belong to the accelerator-made frontier.',
    effect: 'Accelerated mines split into collider blasts.',
    signal: 'chain_flash',
  },
  ultimate_quantum_sensor: {
    id: 'ultimate_quantum_sensor',
    baseWeapon: 'nobelium_nova',
    passive: 'lawrencium',
    name: '궁극의 양자 센서',
    transformReason: 'Lawrencium and nobelium close the actinide path at the quantum edge.',
    effect: 'Fourteen quantum shots scan every direction.',
    signal: 'lucky_barrage',
  },
} as const satisfies Record<EvolutionWeaponId, EvolutionDefinition>;

export const EVOLUTION_IDS = Object.keys(EVOLUTIONS) as EvolutionWeaponId[];
