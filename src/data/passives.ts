export type PassiveId =
  | 'neodymium'
  | 'silicon'
  | 'helium'
  | 'chlorine'
  | 'krypton'
  | 'calcium'
  | 'nickel'
  | 'silver';

export type PairedWeaponId =
  | 'oxygen_wave'
  | 'hydrogen_arrow'
  | 'gold_spiral'
  | 'neon_beam'
  | 'iron_barrier'
  | 'magnesium_bomb'
  | 'carbon_ring'
  | 'boron_shot';

export type PassiveEffectKind =
  | 'magnetRadius'
  | 'attackPower'
  | 'moveSpeed'
  | 'cooldown'
  | 'attackRange'
  | 'maxHealthAndRegen'
  | 'projectileCount'
  | 'luck';

export interface PassiveDefinition {
  readonly id: PassiveId;
  readonly name: string;
  readonly element: string;
  readonly atomicNumber: number;
  readonly mathReason: string;
  readonly effect: PassiveEffectKind;
  readonly pairedWeapon: PairedWeaponId;
  readonly valuePerLevel: number;
  readonly secondaryValuePerLevel: number;
}

export const PASSIVE_SLOT_CAPACITY = 6;
export const PASSIVE_MAX_LEVEL = 3;

export const PASSIVES = {
  neodymium: {
    id: 'neodymium',
    name: '네오디뮴 자석',
    element: 'Nd',
    atomicNumber: 60,
    mathReason: '60진법(시간·각도), 약수 12개',
    effect: 'magnetRadius',
    pairedWeapon: 'oxygen_wave',
    valuePerLevel: 0.25,
    secondaryValuePerLevel: 0,
  },
  silicon: {
    id: 'silicon',
    name: '규소 연산칩',
    element: 'Si',
    atomicNumber: 14,
    mathReason: '반도체 = 계산 그 자체',
    effect: 'attackPower',
    pairedWeapon: 'hydrogen_arrow',
    valuePerLevel: 0.12,
    secondaryValuePerLevel: 0,
  },
  helium: {
    id: 'helium',
    name: '헬륨 부츠',
    element: 'He',
    atomicNumber: 2,
    mathReason: '최소 소수, 가장 가벼운 기체',
    effect: 'moveSpeed',
    pairedWeapon: 'gold_spiral',
    valuePerLevel: 0.1,
    secondaryValuePerLevel: 0,
  },
  chlorine: {
    id: 'chlorine',
    name: '염소 정화액',
    element: 'Cl',
    atomicNumber: 17,
    mathReason: '소수, 표백 = 지우는 성질',
    effect: 'cooldown',
    pairedWeapon: 'neon_beam',
    valuePerLevel: 0.08,
    secondaryValuePerLevel: 0,
  },
  krypton: {
    id: 'krypton',
    name: '크립톤 렌즈',
    element: 'Kr',
    atomicNumber: 36,
    mathReason: '6² 제곱수 - 넓이의 수',
    effect: 'attackRange',
    pairedWeapon: 'iron_barrier',
    valuePerLevel: 0.15,
    secondaryValuePerLevel: 0,
  },
  calcium: {
    id: 'calcium',
    name: '칼슘 결정',
    element: 'Ca',
    atomicNumber: 20,
    mathReason: '뼈와 성장의 원소',
    effect: 'maxHealthAndRegen',
    pairedWeapon: 'magnesium_bomb',
    valuePerLevel: 20,
    secondaryValuePerLevel: 0.3,
  },
  nickel: {
    id: 'nickel',
    name: '니켈 코일',
    element: 'Ni',
    atomicNumber: 28,
    mathReason: '완전수 (1+2+4+7+14=28)',
    effect: 'projectileCount',
    pairedWeapon: 'carbon_ring',
    valuePerLevel: 1,
    secondaryValuePerLevel: 0,
  },
  silver: {
    id: 'silver',
    name: '은빛 행운석',
    element: 'Ag',
    atomicNumber: 47,
    mathReason: '소수, 예로부터 행운의 금속',
    effect: 'luck',
    pairedWeapon: 'boron_shot',
    valuePerLevel: 0.15,
    secondaryValuePerLevel: 0,
  },
} as const satisfies Record<PassiveId, PassiveDefinition>;
