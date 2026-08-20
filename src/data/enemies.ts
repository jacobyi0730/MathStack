export type EnemyAiKind = 'chase' | 'charge' | 'tank' | 'split' | 'ranged' | 'flee';
export type EnemyRewardKind = 'none' | 'magnet_or_bomb' | 'heal';
export type EnemyId =
  | 'radon'
  | 'sodium'
  | 'lead'
  | 'uranium'
  | 'caesium'
  | 'iridium'
  | 'iodine';

export interface EnemyDefinition {
  readonly id: EnemyId;
  readonly name: string;
  readonly element: string;
  readonly atomicNumber: number;
  readonly spawnAtSec: number;
  readonly hp: number;
  readonly speed: number;
  readonly contactDamage: number;
  readonly xp: number;
  readonly radius: number;
  readonly paletteIndex: number;
  readonly accessoryKind: number;
  readonly ai: EnemyAiKind;
  readonly rewardKind: EnemyRewardKind;
  readonly rewardAmount: number;
}

export const MAX_ACTIVE_ENEMIES = 300;

export const ENEMIES = {
  radon: {
    id: 'radon',
    name: '라돈 유령',
    element: 'Rn',
    atomicNumber: 86,
    spawnAtSec: 0,
    hp: 20,
    speed: 40,
    contactDamage: 4,
    xp: 1,
    radius: 16,
    paletteIndex: 0,
    accessoryKind: 0,
    ai: 'chase',
    rewardKind: 'none',
    rewardAmount: 0,
  },
  sodium: {
    id: 'sodium',
    name: '소듐 돌격체',
    element: 'Na',
    atomicNumber: 11,
    spawnAtSec: 60,
    hp: 40,
    speed: 55,
    contactDamage: 6,
    xp: 2,
    radius: 15,
    paletteIndex: 1,
    accessoryKind: 1,
    ai: 'charge',
    rewardKind: 'none',
    rewardAmount: 0,
  },
  lead: {
    id: 'lead',
    name: '납 방벽',
    element: 'Pb',
    atomicNumber: 82,
    spawnAtSec: 180,
    hp: 120,
    speed: 22,
    contactDamage: 8,
    xp: 4,
    radius: 22,
    paletteIndex: 2,
    accessoryKind: 1,
    ai: 'tank',
    rewardKind: 'none',
    rewardAmount: 0,
  },
  uranium: {
    id: 'uranium',
    name: '우라늄 분열체',
    element: 'U',
    atomicNumber: 92,
    spawnAtSec: 210,
    hp: 60,
    speed: 35,
    contactDamage: 5,
    xp: 3,
    radius: 18,
    paletteIndex: 0,
    accessoryKind: 2,
    ai: 'split',
    rewardKind: 'none',
    rewardAmount: 0,
  },
  caesium: {
    id: 'caesium',
    name: '세슘 방사체',
    element: 'Cs',
    atomicNumber: 55,
    spawnAtSec: 270,
    hp: 50,
    speed: 25,
    contactDamage: 4,
    xp: 3,
    radius: 16,
    paletteIndex: 1,
    accessoryKind: 2,
    ai: 'ranged',
    rewardKind: 'none',
    rewardAmount: 0,
  },
  iridium: {
    id: 'iridium',
    name: '이리듐 유성',
    element: 'Ir',
    atomicNumber: 77,
    spawnAtSec: 120,
    hp: 30,
    speed: 60,
    contactDamage: 3,
    xp: 5,
    radius: 14,
    paletteIndex: 2,
    accessoryKind: 0,
    ai: 'flee',
    rewardKind: 'magnet_or_bomb',
    rewardAmount: 50,
  },
  iodine: {
    id: 'iodine',
    name: '아이오딘 방울',
    element: 'I',
    atomicNumber: 53,
    spawnAtSec: 120,
    hp: 25,
    speed: 45,
    contactDamage: 0,
    xp: 0,
    radius: 13,
    paletteIndex: 0,
    accessoryKind: 0,
    ai: 'flee',
    rewardKind: 'heal',
    rewardAmount: 50,
  },
} as const satisfies Record<EnemyId, EnemyDefinition>;
