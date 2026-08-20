export type BossId = 'technetium' | 'polonium' | 'oganesson';
export type BossPatternKind = 'clone' | 'split_barrage' | 'three_phase_decay';
export type BossRewardKind = 'element_capsule';

export interface BossDefinition {
  readonly id: BossId;
  readonly name: string;
  readonly element: string;
  readonly atomicNumber: number;
  readonly spawnAtSec: number;
  readonly hp: number;
  readonly speed: number;
  readonly contactDamage: number;
  readonly radius: number;
  readonly paletteIndex: number;
  readonly accessoryKind: number;
  readonly pattern: BossPatternKind;
  readonly rewardKind: BossRewardKind;
  readonly mathReason: string;
  readonly elementReason: string;
}

export const MAX_ACTIVE_BOSSES = 3;
export const FINAL_BOSS_ID: BossId = 'oganesson';

export const BOSSES = {
  technetium: {
    id: 'technetium',
    name: 'Technetium Duplicator',
    element: 'Tc',
    atomicNumber: 43,
    spawnAtSec: 180,
    hp: 800,
    speed: 18,
    contactDamage: 14,
    radius: 30,
    paletteIndex: 2,
    accessoryKind: 1,
    pattern: 'clone',
    rewardKind: 'element_capsule',
    mathReason: '43 is prime, making the first boss a single irreducible target.',
    elementReason: 'Technetium is the first artificial element, so it creates copies.',
  },
  polonium: {
    id: 'polonium',
    name: 'Polonium Divider',
    element: 'Po',
    atomicNumber: 84,
    spawnAtSec: 360,
    hp: 1800,
    speed: 22,
    contactDamage: 18,
    radius: 36,
    paletteIndex: 1,
    accessoryKind: 2,
    pattern: 'split_barrage',
    rewardKind: 'element_capsule',
    mathReason: '84 is highly composite with 12 divisors, matching split attacks.',
    elementReason: 'Polonium is highly toxic, so it fights from a dangerous radius.',
  },
  oganesson: {
    id: 'oganesson',
    name: 'Oganesson, King of Decay',
    element: 'Og',
    atomicNumber: 118,
    spawnAtSec: 540,
    hp: 6000,
    speed: 16,
    contactDamage: 24,
    radius: 48,
    paletteIndex: 2,
    accessoryKind: 1,
    pattern: 'three_phase_decay',
    rewardKind: 'element_capsule',
    mathReason: '118 is the current final square of the periodic table route.',
    elementReason: 'Oganesson has a sub-second half-life, so its fight collapses by phase.',
  },
} as const satisfies Record<BossId, BossDefinition>;
