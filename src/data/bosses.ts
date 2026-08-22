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
    hp: 1200,
    speed: 18,
    contactDamage: 18,
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
    hp: 2800,
    speed: 22,
    contactDamage: 24,
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
    hp: 9000,
    speed: 16,
    contactDamage: 32,
    radius: 48,
    paletteIndex: 2,
    accessoryKind: 1,
    pattern: 'three_phase_decay',
    rewardKind: 'element_capsule',
    mathReason: '118 is the current final square of the periodic table route.',
    elementReason: 'Oganesson has a sub-second half-life, so its fight collapses by phase.',
  },
} as const satisfies Record<BossId, BossDefinition>;

/**
 * 보스 패턴 수치 (03-전투확장 §9.3.1 ~ §9.3.3 정본의 코드 사본).
 *
 * **문서가 정본이다** (AGENTS.md §2 규칙 6). 여기 숫자를 고치기 전에 문서를 먼저 고친다.
 *
 * ### 페이즈는 배열이다
 *
 * `phases[0]` 이 시작 페이즈이고, 그 뒤는 `enterAtHpRatio` 이하로 떨어질 때 순서대로 넘어간다.
 * 테크네튬은 배열 길이가 1이라 **HP 와 무관하게 1페이즈만** 갖는다 —
 * 첫 보스에서 패턴이 늘어나면 플레이어가 전조 문법을 배우기 전에 죽는다.
 *
 * ### 0 은 "이 페이즈에서 안 쓴다"
 *
 * 주기가 0 인 패턴은 그 페이즈에서 발동하지 않는다. 페이즈를 넘어가며 **지우지 않고 더한다** —
 * 2페이즈는 1페이즈 패턴을 그대로 갖고 장판이 얹힌다.
 */
export interface BossPhaseSpec {
  /** 이 비율 **이하**에서 진입한다. 시작 페이즈는 1 */
  readonly enterAtHpRatio: number;
  readonly moveSpeedMultiplier: number;
  readonly cloneEverySec: number;
  readonly cloneCount: number;
  readonly ringEverySec: number;
  readonly ringBullets: number;
  readonly splitEverySec: number;
  readonly splitDirections: number;
  readonly teleportEverySec: number;
  readonly summonEverySec: number;
  readonly summonCount: number;
  readonly zoneEverySec: number;
  readonly zoneCount: number;
  readonly meteorEverySec: number;
  readonly meteorCount: number;
  readonly chargeEverySec: number;
}

export interface BossPatternSpec {
  readonly phases: readonly BossPhaseSpec[];
  readonly bulletDamage: number;
  readonly bulletSpeed: number;
  readonly bulletRadius: number;
  readonly bulletLifeSec: number;
  /** 분할 탄이 갈라지기까지의 시간. 0 이면 안 갈라진다 */
  readonly splitAfterSec: number;
  readonly splitInto: number;
  /** 분열 후 탄속 배율. 문서 §9.3.2 — 분열 후 탄속은 낮춘다 */
  readonly splitSpeedMultiplier: number;
  readonly splitSpreadRad: number;
  readonly zoneDamage: number;
  readonly zoneRadius: number;
  readonly zoneWarnSec: number;
  readonly zoneActiveSec: number;
  /** 장판이 깔리는 최소·최대 거리. 화면 중앙을 통째로 막지 않기 위한 것 */
  readonly zoneMinDistance: number;
  readonly zoneMaxDistance: number;
  readonly meteorDamage: number;
  readonly meteorRadius: number;
  readonly meteorWarnSec: number;
  readonly meteorSpread: number;
  readonly chargeWindupSec: number;
  readonly chargeDashSec: number;
  readonly chargeRecoverSec: number;
  readonly chargeSpeedMultiplier: number;
  /** 돌진 직후 터지는 회전 탄막 발수. 0 이면 안 쏜다 */
  readonly chargeRingBullets: number;
  /** 보스전 중 동시에 살아 있을 수 있는 소환수 상한 */
  readonly summonCap: number;
  /** 페이즈 전환 정지 시간. 이 동안 새 패턴을 시작하지 않는다 */
  readonly phaseFreezeSec: number;
}

/** 모든 위험 패턴이 가져야 하는 최소 전조 (문서 §9.3.1) */
export const MIN_TELEGRAPH_SEC = 0.55;
/** 보스 위험 개체 풀 상한 (문서 §9.3.2). 넘으면 새 패턴을 건너뛴다 */
export const MAX_BOSS_BULLETS = 96;
export const MAX_BOSS_HAZARDS = 24;

const NO_PATTERN = {
  cloneEverySec: 0,
  cloneCount: 0,
  ringEverySec: 0,
  ringBullets: 0,
  splitEverySec: 0,
  splitDirections: 0,
  teleportEverySec: 0,
  summonEverySec: 0,
  summonCount: 0,
  zoneEverySec: 0,
  zoneCount: 0,
  meteorEverySec: 0,
  meteorCount: 0,
  chargeEverySec: 0,
} as const;

export const BOSS_PATTERNS = {
  technetium: {
    phases: [
      {
        ...NO_PATTERN,
        enterAtHpRatio: 1,
        moveSpeedMultiplier: 1,
        cloneEverySec: 3.2,
        cloneCount: 2,
        ringEverySec: 4.5,
        ringBullets: 8,
      },
    ],
    // 플레이어 기본 이동 속도(260)의 약 55%. 걸어서 피할 수 있어야 첫 보스다
    bulletDamage: 6,
    bulletSpeed: 143,
    bulletRadius: 11,
    bulletLifeSec: 4.5,
    splitAfterSec: 0,
    splitInto: 0,
    splitSpeedMultiplier: 1,
    splitSpreadRad: 0,
    zoneDamage: 0,
    zoneRadius: 0,
    zoneWarnSec: 0,
    zoneActiveSec: 0,
    zoneMinDistance: 0,
    zoneMaxDistance: 0,
    meteorDamage: 0,
    meteorRadius: 0,
    meteorWarnSec: 0,
    meteorSpread: 0,
    chargeWindupSec: 0,
    chargeDashSec: 0,
    chargeRecoverSec: 0,
    chargeSpeedMultiplier: 1,
    chargeRingBullets: 0,
    summonCap: 8,
    phaseFreezeSec: 0.8,
  },

  polonium: {
    phases: [
      {
        ...NO_PATTERN,
        enterAtHpRatio: 1,
        moveSpeedMultiplier: 1,
        splitEverySec: 3.8,
        splitDirections: 4,
        teleportEverySec: 5,
      },
      {
        ...NO_PATTERN,
        enterAtHpRatio: 0.45,
        moveSpeedMultiplier: 1,
        splitEverySec: 3.8,
        splitDirections: 6,
        teleportEverySec: 4.2,
        zoneEverySec: 6,
        zoneCount: 3,
      },
    ],
    bulletDamage: 8,
    bulletSpeed: 150,
    bulletRadius: 12,
    bulletLifeSec: 4,
    splitAfterSec: 0.6,
    splitInto: 2,
    splitSpeedMultiplier: 0.75,
    splitSpreadRad: 0.5,
    zoneDamage: 10,
    zoneRadius: 108,
    zoneWarnSec: 0.7,
    zoneActiveSec: 2.2,
    // 최소 거리를 두어 플레이어가 선 자리에 바로 깔리지 않게 한다
    zoneMinDistance: 150,
    zoneMaxDistance: 330,
    meteorDamage: 0,
    meteorRadius: 0,
    meteorWarnSec: 0,
    meteorSpread: 0,
    chargeWindupSec: 0,
    chargeDashSec: 0,
    chargeRecoverSec: 0,
    chargeSpeedMultiplier: 1,
    chargeRingBullets: 0,
    summonCap: 8,
    phaseFreezeSec: 0.8,
  },

  oganesson: {
    phases: [
      {
        ...NO_PATTERN,
        enterAtHpRatio: 1,
        moveSpeedMultiplier: 1,
        summonEverySec: 4,
        summonCount: 4,
        ringEverySec: 5,
        ringBullets: 12,
      },
      {
        ...NO_PATTERN,
        enterAtHpRatio: 2 / 3,
        moveSpeedMultiplier: 0.7,
        summonEverySec: 4,
        summonCount: 3,
        ringEverySec: 5,
        ringBullets: 12,
        meteorEverySec: 4.5,
        meteorCount: 5,
        zoneEverySec: 6,
        zoneCount: 4,
      },
      {
        ...NO_PATTERN,
        enterAtHpRatio: 1 / 3,
        moveSpeedMultiplier: 0.55,
        chargeEverySec: 3.2,
        meteorEverySec: 6,
        meteorCount: 6,
        zoneEverySec: 6,
        zoneCount: 3,
      },
    ],
    bulletDamage: 12,
    bulletSpeed: 165,
    bulletRadius: 13,
    bulletLifeSec: 4,
    splitAfterSec: 0,
    splitInto: 0,
    splitSpeedMultiplier: 1,
    splitSpreadRad: 0,
    zoneDamage: 14,
    zoneRadius: 120,
    zoneWarnSec: 0.7,
    zoneActiveSec: 2.2,
    zoneMinDistance: 170,
    zoneMaxDistance: 380,
    meteorDamage: 16,
    meteorRadius: 92,
    meteorWarnSec: 0.8,
    meteorSpread: 340,
    chargeWindupSec: 0.65,
    chargeDashSec: 0.55,
    chargeRecoverSec: 0.9,
    chargeSpeedMultiplier: 7,
    chargeRingBullets: 16,
    // 2페이즈부터 6체. 1페이즈는 8체 (문서 §9.3.2)
    summonCap: 8,
    phaseFreezeSec: 0.8,
  },
} as const satisfies Record<BossId, BossPatternSpec>;

/** 2페이즈 이후 소환수 상한 (문서 §9.3.3 — 오가네손 2페이즈) */
export const LATE_PHASE_SUMMON_CAP = 6;

/** 오가네손 돌진 피해. 접촉 피해와 별개로 돌진 자체가 아프다 */
export const CHARGE_CONTACT_DAMAGE = 18;
