import { PICKUPS, spawnPickup, type PickupKind, type PickupPool } from '../entities/pickup.js';
import type { Player } from '../entities/player.js';
import { addExperience, type LevelState } from './level.js';

export const BASE_PICKUP_MAGNET_RADIUS = 96;
export const BOOSTED_PICKUP_MAGNET_RADIUS = 720;
export const PICKUP_COLLECT_RADIUS = 10;
export const PICKUP_ATTRACT_SPEED = 420;

export interface PickupRuntime {
  magnetBoostSec: number;
  pendingMeteorDamage: number;
}

export interface CombatRewardSource {
  pendingXp: number;
  pendingShards: number;
}

export function createPickupRuntime(): PickupRuntime {
  return {
    magnetBoostSec: 0,
    pendingMeteorDamage: 0,
  };
}

export function updatePickups(
  pool: PickupPool,
  player: Player,
  level: LevelState,
  runtime: PickupRuntime,
  dt: number,
): number {
  if (runtime.magnetBoostSec > 0) {
    runtime.magnetBoostSec -= dt;
    if (runtime.magnetBoostSec < 0) runtime.magnetBoostSec = 0;
  }

  const magnetRadius = runtime.magnetBoostSec > 0 ? BOOSTED_PICKUP_MAGNET_RADIUS : BASE_PICKUP_MAGNET_RADIUS;
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
      collectPickup(pool, pickup, player, level, runtime);
      collected += 1;
      continue;
    }

    if (distSq <= magnetRadiusSq && distSq > 0.0001) {
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

  return collected;
}

export function spawnPickupByKind(pool: PickupPool, kind: PickupKind, x: number, y: number): void {
  spawnPickup(pool.acquire(), PICKUPS[kind], x, y);
}

export function spawnXpShards(pool: PickupPool, xp: number, x: number, y: number): number {
  let remaining = xp;
  let spawned = 0;

  while (remaining >= PICKUPS['proton-large'].xp) {
    spawnPickupByKind(pool, 'proton-large', x, y);
    remaining -= PICKUPS['proton-large'].xp;
    spawned += 1;
  }

  while (remaining >= PICKUPS['proton-medium'].xp) {
    spawnPickupByKind(pool, 'proton-medium', x, y);
    remaining -= PICKUPS['proton-medium'].xp;
    spawned += 1;
  }

  while (remaining > 0) {
    spawnPickupByKind(pool, 'proton-small', x, y);
    remaining -= PICKUPS['proton-small'].xp;
    spawned += 1;
  }

  return spawned;
}

export function consumeCombatRewardsAsPickups(
  combat: CombatRewardSource,
  pool: PickupPool,
  x: number,
  y: number,
): number {
  const xp = combat.pendingXp;
  const shards = combat.pendingShards;
  if (xp <= 0 && shards <= 0) return 0;

  combat.pendingXp = 0;
  combat.pendingShards = 0;
  return spawnXpShards(pool, xp + shards, x, y);
}

function collectPickup(
  pool: PickupPool,
  pickup: (typeof pool.items)[number],
  player: Player,
  level: LevelState,
  runtime: PickupRuntime,
): void {
  if (pickup.xp > 0) addExperience(level, pickup.xp);
  if (pickup.heal > 0) player.health = Math.min(player.maxHealth, player.health + pickup.heal);
  if (pickup.magnetSec > 0) runtime.magnetBoostSec = Math.max(runtime.magnetBoostSec, pickup.magnetSec);
  if (pickup.meteorDamage > 0) runtime.pendingMeteorDamage += pickup.meteorDamage;
  pool.release(pickup);
}
