/**
 * 보스 위험 개체 런타임 (T-054).
 *
 * 탄·장판·유성을 만들고, 옮기고, 플레이어와 부딪히는지 본다.
 *
 * ### 왜 공간 해시를 안 쓰는가
 *
 * 충돌 상대가 **플레이어 하나뿐**이다. 위험 개체 120개를 전수 비교해도 프레임당
 * 120회고, 해시를 세우는 비용이 그보다 크다. 적 300체와는 상황이 다르다.
 *
 * ### 상한에 걸리면 조용히 건너뛴다
 *
 * 풀이 가득 차면 새 패턴을 **버린다**. 오래된 탄을 회수하면 이미 피하는 중이던 탄이
 * 눈앞에서 사라져 조작이 배신당한다. 문서 §9.3.2 의 "상한 초과 시 새 패턴을 건너뛴다"가
 * 그 뜻이다.
 */

import { MAX_BOSS_BULLETS, MAX_BOSS_HAZARDS } from '../data/bosses.js';
import type { GameState } from '../engine/state.js';
import { wrapX, wrapY, wrappedDistanceSq } from '../engine/world.js';
import {
  HAZARD_BULLET,
  HAZARD_METEOR,
  HAZARD_ZONE,
  createHazardPool,
  spawnHazard,
  type HazardEntity,
  type HazardPool,
} from '../entities/hazard.js';
import { applyPlayerDamage } from './damage.js';
import { feedbackHazardBurst, feedbackHazardHit } from './feedback.js';

/** 유성이 착탄하고 나서 아픈 시간. 짧게 터지고 사라진다 (문서 §9.3.2 — 잔류 화염 없음) */
export const METEOR_BURST_SEC = 0.22;

export interface BossHazardRuntime {
  /** 날아다니는 탄 */
  bullets: HazardPool;
  /** 제자리 위험 — 장판과 유성 */
  fields: HazardPool;
  /** 이번 판에서 상한 때문에 버린 패턴 수. 0 이 아니면 상한이 낮다는 신호다 */
  skipped: number;
  /** 보스 패턴 전용 난수 씨앗. 웨이브 스폰 씨앗과 분리해 둔다 */
  seed: number;
}

export function createBossHazardRuntime(): BossHazardRuntime {
  return {
    bullets: createHazardPool(MAX_BOSS_BULLETS),
    fields: createHazardPool(MAX_BOSS_HAZARDS),
    skipped: 0,
    seed: 0xb055ed,
  };
}

export function releaseAllBossHazards(runtime: BossHazardRuntime): void {
  runtime.bullets.releaseAll();
  runtime.fields.releaseAll();
}

export function activeBossHazardCount(runtime: BossHazardRuntime): number {
  return runtime.bullets.activeCount + runtime.fields.activeCount;
}

/* --------------------------------------------------------------- 만들기 */

export function spawnBossBullet(
  state: GameState,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  speed: number,
  damage: number,
  radius: number,
  lifeSec: number,
  colorIndex: number,
): HazardEntity | undefined {
  const runtime = state.bossHazards;
  if (runtime.bullets.activeCount >= runtime.bullets.capacity) {
    runtime.skipped += 1;
    return undefined;
  }

  const bullet = runtime.bullets.acquire();
  // 탄은 전조를 몸으로 대신한다 — 보스에서 튀어나오는 게 보이고, 느려서 보고 피할 수 있다
  spawnHazard(bullet, HAZARD_BULLET, x, y, radius, damage, 0, lifeSec, colorIndex);
  bullet.vx = dirX * speed;
  bullet.vy = dirY * speed;
  return bullet;
}

export function spawnBossZone(
  state: GameState,
  x: number,
  y: number,
  radius: number,
  damage: number,
  warnSec: number,
  activeSec: number,
  colorIndex: number,
): HazardEntity | undefined {
  const runtime = state.bossHazards;
  if (runtime.fields.activeCount >= runtime.fields.capacity) {
    runtime.skipped += 1;
    return undefined;
  }

  const zone = runtime.fields.acquire();
  spawnHazard(zone, HAZARD_ZONE, x, y, radius, damage, warnSec, activeSec, colorIndex);
  return zone;
}

export function spawnBossMeteor(
  state: GameState,
  x: number,
  y: number,
  radius: number,
  damage: number,
  warnSec: number,
  colorIndex: number,
): HazardEntity | undefined {
  const runtime = state.bossHazards;
  if (runtime.fields.activeCount >= runtime.fields.capacity) {
    runtime.skipped += 1;
    return undefined;
  }

  const meteor = runtime.fields.acquire();
  spawnHazard(meteor, HAZARD_METEOR, x, y, radius, damage, warnSec, METEOR_BURST_SEC, colorIndex);
  return meteor;
}

/* ----------------------------------------------------------------- 갱신 */

export function updateBossHazards(state: GameState, dt: number): void {
  updateBullets(state, dt);
  updateFields(state, dt);
}

function updateBullets(state: GameState, dt: number): void {
  const pool = state.bossHazards.bullets;

  for (let i = pool.activeCount - 1; i >= 0; i -= 1) {
    const bullet = pool.items[i] as HazardEntity;
    bullet.prevX = bullet.x;
    bullet.prevY = bullet.y;
    bullet.x = wrapX(bullet.x + bullet.vx * dt, state.world);
    bullet.y = wrapY(bullet.y + bullet.vy * dt, state.world);

    if (bullet.splitRemaining > 0) {
      bullet.splitTimerSec -= dt;
      if (bullet.splitTimerSec <= 0) {
        splitBullet(state, bullet);
        pool.release(bullet);
        continue;
      }
    }

    if (hitsPlayer(state, bullet)) {
      applyPlayerDamage(state, bullet.damage);
      feedbackHazardHit(state, bullet);
      pool.release(bullet);
      continue;
    }

    bullet.lifeSec -= dt;
    if (bullet.lifeSec <= 0) pool.release(bullet);
  }
}

function updateFields(state: GameState, dt: number): void {
  const pool = state.bossHazards.fields;

  for (let i = pool.activeCount - 1; i >= 0; i -= 1) {
    const field = pool.items[i] as HazardEntity;
    field.prevX = field.x;
    field.prevY = field.y;

    if (field.warnSec > 0) {
      field.warnSec -= dt;
      // 전조가 막 끝난 프레임에 터뜨린다. 유성은 이때가 착탄이다
      if (field.warnSec <= 0) {
        field.warnSec = 0;
        feedbackHazardBurst(state, field);
      }
      continue;
    }

    // 무적 시간이 연타를 막아 준다. 장판이 매 프레임 때려도 실제 피해는 0.5초에 한 번이다
    if (field.damage > 0 && hitsPlayer(state, field)) {
      if (applyPlayerDamage(state, field.damage) > 0) feedbackHazardHit(state, field);
    }

    field.lifeSec -= dt;
    if (field.lifeSec <= 0) pool.release(field);
  }
}

function splitBullet(state: GameState, bullet: HazardEntity): void {
  const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) * bullet.splitSpeedMultiplier;
  if (speed <= 0) return;

  const baseAngle = Math.atan2(bullet.vy, bullet.vx);
  const count = bullet.splitInto;
  // 한 갈래는 원래 방향을 유지한다. 전부 비껴 나가면 "갈라졌다"가 아니라 "꺾였다"로 보인다
  const step = count > 1 ? (bullet.splitSpreadRad * 2) / (count - 1) : 0;

  for (let i = 0; i < count; i += 1) {
    const angle = count > 1 ? baseAngle - bullet.splitSpreadRad + step * i : baseAngle;
    const child = spawnBossBullet(
      state,
      bullet.x,
      bullet.y,
      Math.cos(angle),
      Math.sin(angle),
      speed,
      bullet.damage,
      bullet.radius * 0.82,
      bullet.lifeSec,
      bullet.colorIndex,
    );
    if (child === undefined) return;
    child.splitRemaining = bullet.splitRemaining - 1;
    child.splitTimerSec = bullet.splitTimerSec;
    child.splitInto = bullet.splitInto;
    child.splitSpreadRad = bullet.splitSpreadRad;
    child.splitSpeedMultiplier = bullet.splitSpeedMultiplier;
  }
}

function hitsPlayer(state: GameState, hazard: HazardEntity): boolean {
  const player = state.player;
  if (player.health <= 0) return false;

  const reach = hazard.radius + player.radius;
  return wrappedDistanceSq(hazard.x, hazard.y, player.x, player.y, state.world) <= reach * reach;
}
