export type PassiveId =
  | 'neodymium'
  | 'silicon'
  | 'helium'
  | 'chlorine'
  | 'krypton'
  | 'calcium'
  | 'nickel'
  | 'silver'
  | 'praseodymium'
  | 'europium'
  | 'gadolinium'
  | 'holmium'
  | 'erbium'
  | 'lutetium'
  | 'protactinium'
  | 'uranium'
  | 'americium'
  | 'curium'
  | 'einsteinium'
  | 'fermium'
  | 'lawrencium';

export type PairedWeaponId =
  | 'oxygen_wave'
  | 'hydrogen_arrow'
  | 'gold_spiral'
  | 'neon_beam'
  | 'iron_barrier'
  | 'magnesium_bomb'
  | 'carbon_ring'
  | 'boron_shot'
  | 'lanthanum_lance'
  | 'cerium_spark'
  | 'promethium_burst'
  | 'samarium_fan'
  | 'terbium_pulse'
  | 'dysprosium_guard'
  | 'thulium_thread'
  | 'ytterbium_star'
  | 'actinium_spear'
  | 'thorium_hammer'
  | 'neptunium_tide'
  | 'plutonium_core'
  | 'berkelium_arc'
  | 'californium_ray'
  | 'mendelevium_mine'
  | 'nobelium_nova';

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
  praseodymium: {
    id: 'praseodymium',
    name: '프라세오디뮴 증폭기',
    element: 'Pr',
    atomicNumber: 59,
    mathReason: '소수 59, 한 방향 힘을 또렷하게 모음',
    effect: 'attackPower',
    pairedWeapon: 'cerium_spark',
    valuePerLevel: 0.1,
    secondaryValuePerLevel: 0,
  },
  europium: {
    id: 'europium',
    name: '유로퓸 형광체',
    element: 'Eu',
    atomicNumber: 63,
    mathReason: '7×9, 격자처럼 빛을 나눔',
    effect: 'attackRange',
    pairedWeapon: 'samarium_fan',
    valuePerLevel: 0.12,
    secondaryValuePerLevel: 0,
  },
  gadolinium: {
    id: 'gadolinium',
    name: '가돌리늄 공명판',
    element: 'Gd',
    atomicNumber: 64,
    mathReason: '8² 제곱수, 넓이와 공명의 수',
    effect: 'projectileCount',
    pairedWeapon: 'terbium_pulse',
    valuePerLevel: 1,
    secondaryValuePerLevel: 0,
  },
  holmium: {
    id: 'holmium',
    name: '홀뮴 렌즈',
    element: 'Ho',
    atomicNumber: 67,
    mathReason: '소수 67, 빛을 한 점에 모음',
    effect: 'cooldown',
    pairedWeapon: 'dysprosium_guard',
    valuePerLevel: 0.06,
    secondaryValuePerLevel: 0,
  },
  erbium: {
    id: 'erbium',
    name: '어븀 섬유',
    element: 'Er',
    atomicNumber: 68,
    mathReason: '광섬유 증폭 원소',
    effect: 'moveSpeed',
    pairedWeapon: 'thulium_thread',
    valuePerLevel: 0.08,
    secondaryValuePerLevel: 0,
  },
  lutetium: {
    id: 'lutetium',
    name: '루테튬 종결석',
    element: 'Lu',
    atomicNumber: 71,
    mathReason: '란타넘족의 끝, 마무리 보정',
    effect: 'luck',
    pairedWeapon: 'lanthanum_lance',
    valuePerLevel: 0.12,
    secondaryValuePerLevel: 0,
  },
  protactinium: {
    id: 'protactinium',
    name: '프로트악티늄 방패',
    element: 'Pa',
    atomicNumber: 91,
    mathReason: '7×13, 두 소수가 겹친 보호',
    effect: 'maxHealthAndRegen',
    pairedWeapon: 'neptunium_tide',
    valuePerLevel: 16,
    secondaryValuePerLevel: 0.2,
  },
  uranium: {
    id: 'uranium',
    name: '우라늄 분열핵',
    element: 'U',
    atomicNumber: 92,
    mathReason: '핵분열, 하나가 여럿으로 갈라짐',
    effect: 'projectileCount',
    pairedWeapon: 'plutonium_core',
    valuePerLevel: 1,
    secondaryValuePerLevel: 0,
  },
  americium: {
    id: 'americium',
    name: '아메리슘 감지기',
    element: 'Am',
    atomicNumber: 95,
    mathReason: '5×19, 탐지와 확률의 보조',
    effect: 'magnetRadius',
    pairedWeapon: 'actinium_spear',
    valuePerLevel: 0.18,
    secondaryValuePerLevel: 0,
  },
  curium: {
    id: 'curium',
    name: '퀴륨 연구노트',
    element: 'Cm',
    atomicNumber: 96,
    mathReason: '12×8, 실험 반복의 수',
    effect: 'attackPower',
    pairedWeapon: 'berkelium_arc',
    valuePerLevel: 0.1,
    secondaryValuePerLevel: 0,
  },
  einsteinium: {
    id: 'einsteinium',
    name: '아인슈타이늄 시계',
    element: 'Es',
    atomicNumber: 99,
    mathReason: '9×11, 시간과 규칙의 보정',
    effect: 'cooldown',
    pairedWeapon: 'californium_ray',
    valuePerLevel: 0.06,
    secondaryValuePerLevel: 0,
  },
  fermium: {
    id: 'fermium',
    name: '페르뮴 가속기',
    element: 'Fm',
    atomicNumber: 100,
    mathReason: '10², 십진법의 큰 제곱',
    effect: 'attackRange',
    pairedWeapon: 'mendelevium_mine',
    valuePerLevel: 0.12,
    secondaryValuePerLevel: 0,
  },
  lawrencium: {
    id: 'lawrencium',
    name: '로렌슘 마침표',
    element: 'Lr',
    atomicNumber: 103,
    mathReason: '악티늄족의 끝, 완성 보정',
    effect: 'luck',
    pairedWeapon: 'nobelium_nova',
    valuePerLevel: 0.12,
    secondaryValuePerLevel: 0,
  },
} as const satisfies Record<PassiveId, PassiveDefinition>;
