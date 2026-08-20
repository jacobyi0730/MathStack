import { MAX_ACTIVE_ENEMIES } from '../data/enemies.js';
import { createSpatialHash, type SpatialHash } from '../engine/spatial-hash.js';
import type { GameState } from '../engine/state.js';
import { shortestDeltaX, shortestDeltaY, wrappedDistanceSq } from '../engine/world.js';
import type { EnemyEntity } from '../entities/enemy.js';
import { applyContactDamage } from './damage.js';

export interface CollisionState {
  enemyHash: SpatialHash<EnemyEntity>;
  enemyCandidates: EnemyEntity[];
  playerEnemyContacts: number;
  enemyHashOutside: number;
  enemyHashOverflow: number;
}

export function createCollisionState(): CollisionState {
  return {
    enemyHash: createSpatialHash<EnemyEntity>({ cellSize: 64, cols: 64, rows: 64, maxPerCell: 32 }),
    enemyCandidates: new Array<EnemyEntity>(MAX_ACTIVE_ENEMIES),
    playerEnemyContacts: 0,
    enemyHashOutside: 0,
    enemyHashOverflow: 0,
  };
}

export function updateCollisions(state: GameState, dt: number): void {
  rebuildEnemyHash(state);
  damagePlayerEnemyContacts(state, dt);
}

export function rebuildEnemyHash(state: GameState): void {
  const collision = state.collision;
  const pool = state.enemies;
  collision.enemyHash.clear(state.player.x, state.player.y);

  for (let i = 0; i < pool.activeCount; i += 1) {
    const enemy = pool.items[i] as EnemyEntity;
    collision.enemyHash.insertAt(
      enemy,
      state.player.x + shortestDeltaX(state.player.x, enemy.x, state.world),
      state.player.y + shortestDeltaY(state.player.y, enemy.y, state.world),
    );
  }

  collision.enemyHashOutside = collision.enemyHash.outsideCount;
  collision.enemyHashOverflow = collision.enemyHash.overflowCount;
}

export function damagePlayerEnemyContacts(state: GameState, dt: number): number {
  const player = state.player;
  const candidates = state.collision.enemyCandidates;
  const count = queryNearbyEnemies(state, player.x, player.y, player.radius, candidates);

  let contacts = 0;
  let strongestDamagePerSec = 0;
  for (let i = 0; i < count; i += 1) {
    const enemy = candidates[i] as EnemyEntity;
    const radius = player.radius + enemy.radius;

    if (wrappedDistanceSq(player.x, player.y, enemy.x, enemy.y, state.world) > radius * radius) continue;

    contacts += 1;
    if (enemy.contactDamage > strongestDamagePerSec) {
      strongestDamagePerSec = enemy.contactDamage;
    }
  }

  state.collision.playerEnemyContacts = contacts;
  if (strongestDamagePerSec > 0) applyContactDamage(player, strongestDamagePerSec, dt);
  return contacts;
}

export function findEnemyHit(state: GameState, x: number, y: number, radius: number): EnemyEntity | undefined {
  const candidates = state.collision.enemyCandidates;
  const count = queryNearbyEnemies(state, x, y, radius, candidates);

  for (let i = 0; i < count; i += 1) {
    const enemy = candidates[i] as EnemyEntity;
    const hitRadius = radius + enemy.radius;

    if (wrappedDistanceSq(x, y, enemy.x, enemy.y, state.world) <= hitRadius * hitRadius) return enemy;
  }

  return undefined;
}

export function queryNearbyEnemies(
  state: GameState,
  x: number,
  y: number,
  radius: number,
  out: EnemyEntity[],
): number {
  return state.collision.enemyHash.queryNearby(
    state.player.x + shortestDeltaX(state.player.x, x, state.world),
    state.player.y + shortestDeltaY(state.player.y, y, state.world),
    radius,
    out,
  );
}
