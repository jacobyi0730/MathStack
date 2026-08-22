/**
 * 보스 엔티티와 패턴 시계 (03-전투확장 §9.3).
 *
 * ### 보스는 신호만 낸다
 *
 * 이 파일은 **탄을 만들지 않는다.** 시간을 세다가 "지금 원형 탄막"이라고 신호를 올릴 뿐이고,
 * 실제로 탄·장판·소환수를 만드는 것은 [`systems/boss-patterns.ts`](../systems/boss-patterns.ts) 다.
 *
 * 그 분리가 있어야 보스 시계를 게임 상태 없이 테스트할 수 있다 — `updateBoss` 는
 * 좌표 두 개와 `dt` 만 받는다. 풀도, 월드도, 플레이어도 모른다.
 *
 * ### 페이즈는 데이터가 정한다
 *
 * 보스마다 `if` 를 쓰지 않는다. [`BOSS_PATTERNS`](../data/bosses.ts) 의 페이즈 배열을
 * 순서대로 읽을 뿐이라, 새 보스는 데이터만 추가하면 된다.
 * 테크네튬이 1페이즈인 것도 배열 길이가 1이라서지 특별 취급이 아니다.
 */

import {
  BOSSES,
  BOSS_PATTERNS,
  CHARGE_CONTACT_DAMAGE,
  MAX_ACTIVE_BOSSES,
  type BossDefinition,
  type BossId,
  type BossPhaseSpec,
} from '../data/bosses.js';
import { ENTITY_SHAPES } from '../data/palette.js';
import { createPool, type Pool, type Poolable } from '../engine/pool.js';
import type { RenderableEntity } from '../engine/renderer.js';

/**
 * 보스가 올릴 수 있는 신호.
 *
 * 배열 인덱스로 쓴다 — 신호가 열 종류라 필드를 스무 개 만드는 대신
 * `Int32Array` 세 개(발행·페이로드·처리)로 관리한다.
 */
export const BOSS_SIGNALS = {
  /** 분신 소환. 페이로드 = 마리 수 */
  clone: 0,
  /** 원형 탄막. 페이로드 = 발수 */
  ring: 1,
  /** 분할 탄막. 페이로드 = 방향 수 */
  split: 2,
  /** 순간이동. 좌표는 `teleportX/Y` 에 이미 반영돼 있다 */
  teleport: 3,
  /** 불안정 원소 소환. 페이로드 = 마리 수 */
  summon: 4,
  /** 붕괴·독성 장판. 페이로드 = 개수 */
  zone: 5,
  /** 유성. 페이로드 = 개수 */
  meteor: 6,
  /** 돌진 준비 시작. 이 순간부터 방향이 고정된다 */
  chargeWindup: 7,
  /** 돌진 개시 */
  chargeDash: 8,
  /** 페이즈 전환. 페이로드 = 새 페이즈 번호(1부터) */
  phase: 9,
} as const;

export type BossSignal = (typeof BOSS_SIGNALS)[keyof typeof BOSS_SIGNALS];
export const BOSS_SIGNAL_COUNT = 10;

/** 패턴별 주기 시계. 신호와 1:1 이 아니다 — 돌진은 자체 상태 기계를 쓴다 */
const TIMER_CLONE = 0;
const TIMER_RING = 1;
const TIMER_SPLIT = 2;
const TIMER_TELEPORT = 3;
const TIMER_SUMMON = 4;
const TIMER_ZONE = 5;
const TIMER_METEOR = 6;
// 돌진은 주기 시계가 아니라 자체 상태 기계(`chargeTimerSec`)를 쓴다
const TIMER_COUNT = 7;

/** 돌진 상태 기계 */
export const CHARGE_IDLE = 0;
export const CHARGE_WINDUP = 1;
export const CHARGE_DASH = 2;
export const CHARGE_RECOVER = 3;

export interface BossEntity extends RenderableEntity, Poolable {
  kind: 'boss';
  active: boolean;
  id: BossId;
  name: string;
  element: string;
  atomicNumber: number;
  hp: number;
  maxHp: number;
  speed: number;
  contactDamage: number;
  /**
   * 정의서의 접촉 피해. 돌진 중에는 `contactDamage` 가 잠시 낮아졌다 여기로 돌아온다.
   *
   * 돌진이 평소보다 **덜 아픈** 것은 의도다 — 피할 수 있게 만든 패턴이 실패했을 때
   * 벌이 가장 크면, 플레이어는 패턴을 배우는 대신 보스를 피해 다니게 된다.
   */
  baseContactDamage: number;
  /** 1부터 센 페이즈 번호. HUD 와 테스트가 읽는다 */
  phase: 1 | 2 | 3;
  /** `BOSS_PATTERNS[id].phases` 의 인덱스 */
  phaseIndex: number;
  /** 페이즈 전환 정지 잔여 시간. 0 보다 크면 새 패턴을 시작하지 않는다 */
  phaseFreezeSec: number;
  patternTimers: Float32Array;
  chargeState: number;
  chargeTimerSec: number;
  chargeDirX: number;
  chargeDirY: number;
  /** 마지막으로 조준한 방향. 부채꼴·분할 탄막이 이 방향을 기준으로 퍼진다 */
  aimX: number;
  aimY: number;
  teleportX: number;
  teleportY: number;
  /** 신호 발행 횟수 (누적) */
  signalSeq: Int32Array;
  /** 신호별 페이로드. 마지막 발행 값만 남는다 */
  signalPayload: Int32Array;
  /** 패턴 시스템이 처리한 횟수. 발행보다 작으면 아직 할 일이 남았다 */
  handledSeq: Int32Array;
  rewardQueued: boolean;
}

export type BossPool = Pool<BossEntity>;
export type BossRewardSignal = 'none' | 'element_capsule';

export function createBossPool(capacity: number = MAX_ACTIVE_BOSSES): BossPool {
  return createPool<BossEntity>(createBoss, resetBoss, capacity);
}

export function spawnBoss(boss: BossEntity, definition: BossDefinition, x: number, y: number): void {
  boss.active = true;
  boss.id = definition.id;
  boss.name = definition.name;
  boss.element = definition.element;
  boss.atomicNumber = definition.atomicNumber;
  boss.x = x;
  boss.y = y;
  boss.prevX = x;
  boss.prevY = y;
  boss.dx = 0;
  boss.dy = 0;
  boss.radius = definition.radius;
  boss.paletteGroup = 1;
  boss.shape = ENTITY_SHAPES.circle;
  boss.paletteIndex = definition.paletteIndex;
  boss.symbol = definition.element;
  boss.accessoryKind = definition.accessoryKind;
  boss.hp = definition.hp;
  boss.maxHp = definition.hp;
  boss.speed = definition.speed;
  boss.contactDamage = definition.contactDamage;
  boss.baseContactDamage = definition.contactDamage;
  resetBossPatternState(boss);
}

export function updateBosses(pool: BossPool, targetX: number, targetY: number, dt: number): void {
  for (let i = 0; i < pool.activeCount; i += 1) {
    updateBoss(pool.items[i] as BossEntity, targetX, targetY, dt);
  }
}

/**
 * 보스 한 마리의 한 스텝.
 *
 * 순서가 중요하다 — **페이즈 확인 → 전환 정지 → 이동 → 패턴 시계**.
 * 전환 정지를 이동보다 뒤에 두면 전환 순간에도 보스가 따라와, "숨 돌릴 틈"이라는
 * 전환의 의미가 사라진다 (문서 §9.3.1).
 */
export function updateBoss(boss: BossEntity, targetX: number, targetY: number, dt: number): void {
  advanceBossPhase(boss);

  if (boss.phaseFreezeSec > 0) {
    boss.phaseFreezeSec -= dt;
    if (boss.phaseFreezeSec < 0) boss.phaseFreezeSec = 0;
    boss.prevX = boss.x;
    boss.prevY = boss.y;
    boss.dx = 0;
    boss.dy = 0;
    return;
  }

  const spec = BOSS_PATTERNS[boss.id];
  const phase = spec.phases[boss.phaseIndex] as BossPhaseSpec;

  writeAim(boss, targetX, targetY);

  if (phase.chargeEverySec > 0) {
    updateCharge(boss, targetX, targetY, phase, dt);
  } else {
    moveToward(boss, targetX, targetY, boss.speed * phase.moveSpeedMultiplier, dt);
  }

  tickPattern(boss, TIMER_CLONE, phase.cloneEverySec, dt, BOSS_SIGNALS.clone, phase.cloneCount);
  tickPattern(boss, TIMER_RING, phase.ringEverySec, dt, BOSS_SIGNALS.ring, phase.ringBullets);
  tickPattern(boss, TIMER_SPLIT, phase.splitEverySec, dt, BOSS_SIGNALS.split, phase.splitDirections);
  tickPattern(boss, TIMER_SUMMON, phase.summonEverySec, dt, BOSS_SIGNALS.summon, phase.summonCount);
  tickPattern(boss, TIMER_ZONE, phase.zoneEverySec, dt, BOSS_SIGNALS.zone, phase.zoneCount);
  tickPattern(boss, TIMER_METEOR, phase.meteorEverySec, dt, BOSS_SIGNALS.meteor, phase.meteorCount);

  if (phase.teleportEverySec > 0) {
    boss.patternTimers[TIMER_TELEPORT] = (boss.patternTimers[TIMER_TELEPORT] as number) + dt;
    if ((boss.patternTimers[TIMER_TELEPORT] as number) >= phase.teleportEverySec) {
      boss.patternTimers[TIMER_TELEPORT] =
        (boss.patternTimers[TIMER_TELEPORT] as number) - phase.teleportEverySec;
      teleport(boss, targetX, targetY);
    }
  }
}

export function applyBossDamage(boss: BossEntity, damage: number): boolean {
  if (damage <= 0 || boss.hp <= 0) return false;
  boss.hp = Math.max(0, boss.hp - damage);
  advanceBossPhase(boss);
  return boss.hp === 0;
}

export function defeatBoss(pool: BossPool, boss: BossEntity): BossRewardSignal {
  if (!boss.active || boss.poolIndex < 0) return 'none';
  if (boss.rewardQueued) return 'none';
  boss.rewardQueued = true;
  pool.release(boss);
  return 'element_capsule';
}

/* ------------------------------------------------------------------ 신호 */

export function emitBossSignal(boss: BossEntity, signal: BossSignal, payload = 0): void {
  boss.signalSeq[signal] = (boss.signalSeq[signal] as number) + 1;
  boss.signalPayload[signal] = payload;
}

/**
 * 아직 처리 안 한 신호를 가져간다.
 *
 * 반환값은 **밀린 횟수**다. 보통 0 또는 1 이고, 프레임이 크게 밀린 뒤에만 2 이상이 된다.
 * 호출한 쪽은 이 값만큼 패턴을 실행하거나, 한 번으로 뭉쳐도 된다.
 */
export function consumeBossSignal(boss: BossEntity, signal: BossSignal): number {
  const pending = (boss.signalSeq[signal] as number) - (boss.handledSeq[signal] as number);
  boss.handledSeq[signal] = boss.signalSeq[signal] as number;
  return pending > 0 ? pending : 0;
}

export function bossSignalPayload(boss: BossEntity, signal: BossSignal): number {
  return boss.signalPayload[signal] as number;
}

export function bossSignalCount(boss: BossEntity, signal: BossSignal): number {
  return boss.signalSeq[signal] as number;
}

/* ------------------------------------------------------------------ 내부 */

/**
 * HP 를 보고 페이즈를 넘긴다.
 *
 * 한 프레임에 두 단계를 건너뛸 수 있다 — 큰 한 방으로 66%에서 33% 아래로 떨어지면
 * `while` 이 두 번 돈다. 그래도 전환 신호는 **단계마다 한 번씩** 나간다.
 */
export function advanceBossPhase(boss: BossEntity): void {
  const spec = BOSS_PATTERNS[boss.id];
  if (boss.maxHp <= 0) return;

  const ratio = boss.hp / boss.maxHp;
  while (boss.phaseIndex + 1 < spec.phases.length) {
    const next = spec.phases[boss.phaseIndex + 1] as BossPhaseSpec;
    if (ratio > next.enterAtHpRatio) break;

    boss.phaseIndex += 1;
    boss.phase = Math.min(3, boss.phaseIndex + 1) as 1 | 2 | 3;
    boss.phaseFreezeSec = spec.phaseFreezeSec;
    boss.chargeState = CHARGE_IDLE;
    boss.chargeTimerSec = 0;
    boss.patternTimers.fill(0);
    emitBossSignal(boss, BOSS_SIGNALS.phase, boss.phase);
  }
}

function tickPattern(
  boss: BossEntity,
  timer: number,
  everySec: number,
  dt: number,
  signal: BossSignal,
  payload: number,
): void {
  if (everySec <= 0) return;

  const next = (boss.patternTimers[timer] as number) + dt;
  if (next < everySec) {
    boss.patternTimers[timer] = next;
    return;
  }

  boss.patternTimers[timer] = next - everySec;
  emitBossSignal(boss, signal, payload);
}

/**
 * 돌진 상태 기계 (문서 §9.3.2 — 0.65초 준비 → 직선 돌진 → 0.9초 후딜).
 *
 * 후딜이 이 패턴의 존재 이유다. 돌진만 있으면 그냥 빨라진 추격이지만,
 * 후딜이 있으면 **피하고 나서 때리는 리듬**이 생긴다.
 */
function updateCharge(
  boss: BossEntity,
  targetX: number,
  targetY: number,
  phase: BossPhaseSpec,
  dt: number,
): void {
  const spec = BOSS_PATTERNS[boss.id];
  boss.prevX = boss.x;
  boss.prevY = boss.y;

  if (boss.chargeState === CHARGE_IDLE) {
    moveToward(boss, targetX, targetY, boss.speed * phase.moveSpeedMultiplier, dt);
    boss.chargeTimerSec += dt;
    if (boss.chargeTimerSec < phase.chargeEverySec) return;

    boss.chargeTimerSec = 0;
    boss.chargeState = CHARGE_WINDUP;
    // 준비에 들어가는 순간 방향이 고정된다. 추적 돌진은 이동만으로 못 피한다
    boss.chargeDirX = boss.aimX;
    boss.chargeDirY = boss.aimY;
    boss.dx = 0;
    boss.dy = 0;
    emitBossSignal(boss, BOSS_SIGNALS.chargeWindup);
    return;
  }

  if (boss.chargeState === CHARGE_WINDUP) {
    boss.dx = 0;
    boss.dy = 0;
    boss.chargeTimerSec += dt;
    if (boss.chargeTimerSec < spec.chargeWindupSec) return;

    boss.chargeTimerSec = 0;
    boss.chargeState = CHARGE_DASH;
    boss.contactDamage = CHARGE_CONTACT_DAMAGE;
    emitBossSignal(boss, BOSS_SIGNALS.chargeDash);
    return;
  }

  if (boss.chargeState === CHARGE_DASH) {
    const speed = boss.speed * spec.chargeSpeedMultiplier;
    boss.dx = boss.chargeDirX * speed;
    boss.dy = boss.chargeDirY * speed;
    boss.x += boss.dx * dt;
    boss.y += boss.dy * dt;

    boss.chargeTimerSec += dt;
    if (boss.chargeTimerSec < spec.chargeDashSec) return;

    boss.chargeTimerSec = 0;
    boss.chargeState = CHARGE_RECOVER;
    boss.contactDamage = boss.baseContactDamage;
    // 돌진이 끝나는 자리에서 회전 탄막이 터진다 (문서 §9.3.3 오가네손 3페이즈)
    if (spec.chargeRingBullets > 0) {
      emitBossSignal(boss, BOSS_SIGNALS.ring, spec.chargeRingBullets);
    }
    return;
  }

  boss.dx = 0;
  boss.dy = 0;
  boss.chargeTimerSec += dt;
  if (boss.chargeTimerSec >= spec.chargeRecoverSec) {
    boss.chargeTimerSec = 0;
    boss.chargeState = CHARGE_IDLE;
  }
}

/** 플레이어 반대편 대각선으로 뛴다. 난수를 쓰지 않아 재현 가능하다 */
function teleport(boss: BossEntity, targetX: number, targetY: number): void {
  const seq = (boss.signalSeq[BOSS_SIGNALS.teleport] as number) + 1;
  boss.teleportX = targetX + (seq % 2 === 0 ? -260 : 260);
  boss.teleportY = targetY + (seq % 3 === 0 ? -180 : 180);
  boss.x = boss.teleportX;
  boss.y = boss.teleportY;
  boss.prevX = boss.x;
  boss.prevY = boss.y;
  emitBossSignal(boss, BOSS_SIGNALS.teleport);
}

function writeAim(boss: BossEntity, targetX: number, targetY: number): void {
  const dx = targetX - boss.x;
  const dy = targetY - boss.y;
  const distSq = dx * dx + dy * dy;
  if (distSq <= 0.0001) return;

  const inv = 1 / Math.sqrt(distSq);
  boss.aimX = dx * inv;
  boss.aimY = dy * inv;
}

function moveToward(
  boss: BossEntity,
  targetX: number,
  targetY: number,
  speed: number,
  dt: number,
): void {
  boss.prevX = boss.x;
  boss.prevY = boss.y;

  const toTargetX = targetX - boss.x;
  const toTargetY = targetY - boss.y;
  const distanceSq = toTargetX * toTargetX + toTargetY * toTargetY;
  if (distanceSq <= 0.0001) {
    boss.dx = 0;
    boss.dy = 0;
    return;
  }

  const invDistance = 1 / Math.sqrt(distanceSq);
  boss.dx = toTargetX * invDistance * speed;
  boss.dy = toTargetY * invDistance * speed;
  boss.x += boss.dx * dt;
  boss.y += boss.dy * dt;
}

function createBoss(): BossEntity {
  return {
    kind: 'boss',
    active: false,
    id: 'technetium',
    name: BOSSES.technetium.name,
    element: BOSSES.technetium.element,
    atomicNumber: BOSSES.technetium.atomicNumber,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    dx: 0,
    dy: 0,
    radius: 0,
    paletteGroup: 1,
    shape: ENTITY_SHAPES.circle,
    icon: '',
    flashSec: 0,
    paletteIndex: BOSSES.technetium.paletteIndex,
    symbol: BOSSES.technetium.element,
    accessoryKind: BOSSES.technetium.accessoryKind,
    hp: 0,
    maxHp: 0,
    speed: 0,
    contactDamage: 0,
    baseContactDamage: 0,
    phase: 1,
    phaseIndex: 0,
    phaseFreezeSec: 0,
    // 풀을 만들 때 한 번만 할당된다. 런타임에는 `fill(0)` 로만 되돌린다
    patternTimers: new Float32Array(TIMER_COUNT),
    chargeState: CHARGE_IDLE,
    chargeTimerSec: 0,
    chargeDirX: 0,
    chargeDirY: 0,
    aimX: 1,
    aimY: 0,
    teleportX: 0,
    teleportY: 0,
    signalSeq: new Int32Array(BOSS_SIGNAL_COUNT),
    signalPayload: new Int32Array(BOSS_SIGNAL_COUNT),
    handledSeq: new Int32Array(BOSS_SIGNAL_COUNT),
    rewardQueued: false,
    poolIndex: -1,
    poolSeq: 0,
  };
}

function resetBoss(boss: BossEntity): void {
  boss.active = false;
  boss.x = 0;
  boss.y = 0;
  boss.prevX = 0;
  boss.prevY = 0;
  boss.dx = 0;
  boss.dy = 0;
  boss.radius = 0;
  boss.hp = 0;
  boss.maxHp = 0;
  boss.speed = 0;
  boss.contactDamage = 0;
  boss.baseContactDamage = 0;
  resetBossPatternState(boss);
}

function resetBossPatternState(boss: BossEntity): void {
  boss.flashSec = 0;
  boss.phase = 1;
  boss.phaseIndex = 0;
  boss.phaseFreezeSec = 0;
  boss.patternTimers.fill(0);
  boss.chargeState = CHARGE_IDLE;
  boss.chargeTimerSec = 0;
  boss.chargeDirX = 0;
  boss.chargeDirY = 0;
  boss.aimX = 1;
  boss.aimY = 0;
  boss.teleportX = 0;
  boss.teleportY = 0;
  boss.signalSeq.fill(0);
  boss.signalPayload.fill(0);
  boss.handledSeq.fill(0);
  boss.rewardQueued = false;
}
