import {
  PICKUPS,
  spawnPickup,
  type PickupEntity,
  type PickupKind,
  type PickupPool,
} from '../entities/pickup.js';
import type { Player } from '../entities/player.js';
import type { GameState } from '../engine/state.js';
import { feedbackPickup } from './feedback.js';
import { addExperience, type LevelState } from './level.js';

export const BASE_PICKUP_MAGNET_RADIUS = 96;
export const BOOSTED_PICKUP_MAGNET_RADIUS = 720;
export const PICKUP_COLLECT_RADIUS = 10;
export const PICKUP_ATTRACT_SPEED = 420;
/** 인 점화가 켜져 있는 동안 무기 쿨다운에 곱해지는 값 */
export const HASTE_COOLDOWN_MULTIPLIER = 0.5;

/**
 * 즉시 발동 아이템이 남기는 효과.
 *
 * 픽업을 줍는 순간 값이 바뀌고, 실제 적용은 각 시스템이 자기 차례에 읽어서 한다 —
 * 픽업 시스템이 적 풀이나 무기 풀을 직접 만지지 않게 하려는 분리다.
 */
export interface PickupRuntime {
  magnetBoostSec: number;
  pendingMeteorDamage: number;
  /** 네오디뮴 자석. 이번 프레임에 필드의 조각을 전부 회수한다 */
  pendingVacuum: boolean;
  /** 세슘 시계. 남은 동안 적과 보스가 멈춘다 */
  freezeSec: number;
  /** 인 점화. 남은 동안 무기 쿨다운이 줄어든다 */
  hasteSec: number;
  baseMagnetRadius: number;
  noticeText: string;
  noticeSec: number;
}

export function createPickupRuntime(): PickupRuntime {
  return {
    magnetBoostSec: 0,
    pendingMeteorDamage: 0,
    pendingVacuum: false,
    freezeSec: 0,
    hasteSec: 0,
    baseMagnetRadius: BASE_PICKUP_MAGNET_RADIUS,
    noticeText: '',
    noticeSec: 0,
  };
}

export function isEnemyFrozen(runtime: PickupRuntime): boolean {
  return runtime.freezeSec > 0;
}

export function resolveHasteCooldownMultiplier(runtime: PickupRuntime): number {
  return runtime.hasteSec > 0 ? HASTE_COOLDOWN_MULTIPLIER : 1;
}

/**
 * `state` 는 **효과음에만** 쓴다.
 *
 * 픽업 로직 자체는 풀·플레이어·레벨·런타임만 알면 되고, 테스트도 그 네 개만 넘긴다.
 * 소리를 위해 전체 상태를 필수 인자로 만들면 테스트가 게임 하나를 통째로 세워야 한다.
 */
export function updatePickups(
  pool: PickupPool,
  player: Player,
  level: LevelState,
  runtime: PickupRuntime,
  dt: number,
  state?: GameState,
): number {
  tickPickupTimers(runtime, dt);

  const magnetRadius = runtime.magnetBoostSec > 0 ? BOOSTED_PICKUP_MAGNET_RADIUS : runtime.baseMagnetRadius;
  const magnetRadiusSq = magnetRadius * magnetRadius;
  let collected = 0;

  for (let i = pool.activeCount - 1; i >= 0; i -= 1) {
    const pickup = pool.items[i];
    pickup.prevX = pickup.x;
    pickup.prevY = pickup.y;

    const dx = player.x - pickup.x;
    const dy = player.y - pickup.y;
    const distSq = dx * dx + dy * dy;
    const collectRadius = player.radius + pickup.radius + PICKUP_COLLECT_RADIUS;

    if (distSq <= collectRadius * collectRadius) {
      if (state !== undefined) feedbackPickup(state, pickup.pickupKind);
      collectPickup(pool, pickup, player, level, runtime);
      collected += 1;
      continue;
    }

    if (pickup.xp > 0 && distSq <= magnetRadiusSq && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const step = Math.min(PICKUP_ATTRACT_SPEED * dt, dist);
      pickup.dx = dx / dist;
      pickup.dy = dy / dist;
      pickup.x += pickup.dx * step;
      pickup.y += pickup.dy * step;
    } else {
      pickup.dx = 0;
      pickup.dy = 0;
    }
  }

  return collected + collectVacuumedShards(pool, level, runtime);
}

export function spawnPickupByKind(pool: PickupPool, kind: PickupKind, x: number, y: number): PickupEntity {
  const pickup = pool.acquire();
  spawnPickup(pickup, PICKUPS[kind], x, y);
  return pickup;
}

export function announcePickup(runtime: PickupRuntime, kind: PickupKind): void {
  runtime.noticeText = `${PICKUPS[kind].name}이 나왔습니다`;
  runtime.noticeSec = 2.2;
}

/**
 * 적이 죽은 자리에 양성자 조각 하나를 떨군다.
 *
 * 적 한 마리에 조각 하나다. 경험치 양에 따라 겉모습만 커지고 실제 값은 `xp` 그대로 들어간다 —
 * 여러 개로 쪼개면 300체 웨이브에서 픽업 풀이 먼저 터진다.
 */
export function spawnXpGem(pool: PickupPool, xp: number, x: number, y: number): PickupEntity | undefined {
  if (xp <= 0) return undefined;

  const pickup = spawnPickupByKind(pool, resolveXpGemKind(xp), x, y);
  pickup.xp = xp;
  return pickup;
}

export function resolveXpGemKind(xp: number): PickupKind {
  if (xp >= PICKUPS['proton-large'].xp) return 'proton-large';
  if (xp >= PICKUPS['proton-medium'].xp) return 'proton-medium';
  return 'proton-small';
}

function tickPickupTimers(runtime: PickupRuntime, dt: number): void {
  if (runtime.magnetBoostSec > 0) {
    runtime.magnetBoostSec -= dt;
    if (runtime.magnetBoostSec < 0) runtime.magnetBoostSec = 0;
  }
  if (runtime.freezeSec > 0) {
    runtime.freezeSec -= dt;
    if (runtime.freezeSec < 0) runtime.freezeSec = 0;
  }
  if (runtime.hasteSec > 0) {
    runtime.hasteSec -= dt;
    if (runtime.hasteSec < 0) runtime.hasteSec = 0;
  }
  if (runtime.noticeSec > 0) {
    runtime.noticeSec -= dt;
    if (runtime.noticeSec <= 0) {
      runtime.noticeSec = 0;
      runtime.noticeText = '';
    }
  }
}

/** 네오디뮴 자석: 거리와 무관하게 필드에 남은 조각을 전부 경험치로 바꾼다 */
function collectVacuumedShards(pool: PickupPool, level: LevelState, runtime: PickupRuntime): number {
  if (!runtime.pendingVacuum) return 0;
  runtime.pendingVacuum = false;

  let collected = 0;
  for (let i = pool.activeCount - 1; i >= 0; i -= 1) {
    const pickup = pool.items[i];
    if (pickup.xp <= 0) continue;
    addExperience(level, pickup.xp);
    pool.release(pickup);
    collected += 1;
  }

  return collected;
}

function collectPickup(
  pool: PickupPool,
  pickup: PickupEntity,
  player: Player,
  level: LevelState,
  runtime: PickupRuntime,
): void {
  if (pickup.xp > 0) addExperience(level, pickup.xp);
  if (pickup.heal > 0) player.health = Math.min(player.maxHealth, player.health + pickup.heal);
  if (pickup.magnetSec > 0) runtime.magnetBoostSec = Math.max(runtime.magnetBoostSec, pickup.magnetSec);
  if (pickup.vacuum) runtime.pendingVacuum = true;
  if (pickup.meteorDamage > 0) runtime.pendingMeteorDamage += pickup.meteorDamage;
  if (pickup.freezeSec > 0) runtime.freezeSec = Math.max(runtime.freezeSec, pickup.freezeSec);
  if (pickup.hasteSec > 0) runtime.hasteSec = Math.max(runtime.hasteSec, pickup.hasteSec);
  // 금 보호막은 피격 무적과 같은 타이머를 쓴다. 별도 상태를 만들면 둘이 어긋난다
  if (pickup.shieldSec > 0) player.invulnerableSec = Math.max(player.invulnerableSec, pickup.shieldSec);
  pool.release(pickup);
}
