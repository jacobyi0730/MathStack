export type EnemyAiKind = 'chase' | 'charge' | 'tank' | 'split' | 'ranged' | 'flee';
export type EnemyId = 'radon';

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
  },
} as const satisfies Record<EnemyId, EnemyDefinition>;
