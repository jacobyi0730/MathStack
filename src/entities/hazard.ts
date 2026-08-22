/**
 * 보스 위험 개체 — 탄, 장판, 유성 (03-전투확장 §9.3.2).
 *
 * 무기 투사체(`projectile.ts`)와 **일부러 분리했다.** 둘은 수명도, 충돌 상대도,
 * 상한도 다르다. 한 풀에 섞으면 보스 탄막이 터질 때 내 무기가 발사되지 않는
 * 최악의 상황이 생긴다. 문서가 정한 상한(`boss_bullet` 96, `boss_hazard` 24)도
 * 각각의 풀에만 걸린다.
 *
 * ### 전조와 피해는 다른 상태다
 *
 * 이 게임은 **이동만** 조작한다. 반사도 방어도 없으니 "보고 비킬 시간"이 유일한
 * 방어 수단이다. 그래서 모든 위험 개체는 `warnSec` 동안 그려지기만 하고
 * **절대 아프지 않다**. 그 시간이 지나야 `damage` 가 살아난다.
 * 전조 없이 아픈 위험 개체를 만들지 않는다 — 문서 §9.3.1 의 0.55초 하한이 그 규칙이다.
 */

import { createPool, type Pool, type Poolable } from '../engine/pool.js';

/** 날아가는 탄. 플레이어에 닿으면 사라진다 */
export const HAZARD_BULLET = 0;
/** 제자리 장판. 지속 시간 내내 남고, 맞아도 사라지지 않는다 */
export const HAZARD_ZONE = 1;
/** 유성. 경고 원만 있다가 착탄 순간 한 번 터진다 */
export const HAZARD_METEOR = 2;

export type HazardKind = typeof HAZARD_BULLET | typeof HAZARD_ZONE | typeof HAZARD_METEOR;

export interface HazardEntity extends Poolable {
  active: boolean;
  hazardKind: HazardKind;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  /** 피해 반경이자 렌더 반경. 보이는 것과 아픈 것이 어긋나면 억울해진다 */
  radius: number;
  damage: number;
  /** 남은 전조 시간. 0 보다 크면 그려지되 아프지 않다 */
  warnSec: number;
  warnMaxSec: number;
  /** 전조가 끝난 뒤 남은 시간 */
  lifeSec: number;
  maxLifeSec: number;
  /** 남은 분열 횟수. 0 이면 안 갈라진다 */
  splitRemaining: number;
  splitTimerSec: number;
  splitInto: number;
  splitSpreadRad: number;
  splitSpeedMultiplier: number;
  /** 몇 번째 색을 쓸지. `HAZARD_COLORS` 인덱스 */
  colorIndex: number;
}

export type HazardPool = Pool<HazardEntity>;

/**
 * 위험 개체 색 (05-세션-운영 §14.5 보조).
 *
 * **무기·적·아이템과 겹치지 않는 색만 쓴다.** 적은 붉은 계열, 아이템은 하늘·초록 계열이므로
 * 보스 위험은 보라·자홍 축을 가져간다. 경고는 유일하게 노란색이다 —
 * "아직 안 아프다"가 색 하나로 읽혀야 한다.
 */
export const HAZARD_COLORS = [
  { fill: '#C084FC', ring: '#F3E8FF' }, // 0 보스 탄
  { fill: '#7CB342', ring: '#DCEDC8' }, // 1 독성 장판 (폴로늄)
  { fill: '#8B5CF6', ring: '#DDD6FE' }, // 2 붕괴 장판 (오가네손)
  { fill: '#FF7043', ring: '#FFCCBC' }, // 3 유성
] as const;

/** 전조 상태의 색. 어떤 위험이든 경고 중에는 이 색이다 */
export const HAZARD_WARNING_COLOR = { fill: '#FFB300', ring: '#FFE082' } as const;

export function createHazardPool(capacity: number): HazardPool {
  return createPool<HazardEntity>(createHazard, resetHazard, capacity);
}

export function spawnHazard(
  hazard: HazardEntity,
  hazardKind: HazardKind,
  x: number,
  y: number,
  radius: number,
  damage: number,
  warnSec: number,
  lifeSec: number,
  colorIndex: number,
): void {
  hazard.active = true;
  hazard.hazardKind = hazardKind;
  hazard.x = x;
  hazard.y = y;
  hazard.prevX = x;
  hazard.prevY = y;
  hazard.vx = 0;
  hazard.vy = 0;
  hazard.radius = radius;
  hazard.damage = damage;
  hazard.warnSec = warnSec;
  hazard.warnMaxSec = warnSec;
  hazard.lifeSec = lifeSec;
  hazard.maxLifeSec = lifeSec;
  hazard.splitRemaining = 0;
  hazard.splitTimerSec = 0;
  hazard.splitInto = 0;
  hazard.splitSpreadRad = 0;
  hazard.splitSpeedMultiplier = 1;
  hazard.colorIndex = colorIndex;
}

/** 전조가 끝나 실제로 아픈 상태인가 */
export function isHazardArmed(hazard: HazardEntity): boolean {
  return hazard.active && hazard.warnSec <= 0 && hazard.damage > 0;
}

/** 0(막 생김) ~ 1(사라짐). 렌더가 알파와 반경 연출에 쓴다 */
export function hazardWarnProgress(hazard: HazardEntity): number {
  if (hazard.warnMaxSec <= 0) return 1;
  const t = 1 - hazard.warnSec / hazard.warnMaxSec;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function createHazard(): HazardEntity {
  return {
    active: false,
    hazardKind: HAZARD_BULLET,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    radius: 0,
    damage: 0,
    warnSec: 0,
    warnMaxSec: 0,
    lifeSec: 0,
    maxLifeSec: 0,
    splitRemaining: 0,
    splitTimerSec: 0,
    splitInto: 0,
    splitSpreadRad: 0,
    splitSpeedMultiplier: 1,
    colorIndex: 0,
    poolIndex: -1,
    poolSeq: 0,
  };
}

function resetHazard(hazard: HazardEntity): void {
  hazard.active = false;
  hazard.x = 0;
  hazard.y = 0;
  hazard.prevX = 0;
  hazard.prevY = 0;
  hazard.vx = 0;
  hazard.vy = 0;
  hazard.radius = 0;
  hazard.damage = 0;
  hazard.warnSec = 0;
  hazard.warnMaxSec = 0;
  hazard.lifeSec = 0;
  hazard.maxLifeSec = 0;
  hazard.splitRemaining = 0;
  hazard.splitTimerSec = 0;
  hazard.splitInto = 0;
  hazard.splitSpreadRad = 0;
  hazard.splitSpeedMultiplier = 1;
  hazard.colorIndex = 0;
}
