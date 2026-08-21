import { ENEMIES } from '../data/enemies.js';
import {
  DENSITY_GROWTH_PER_MIN,
  HP_GROWTH_PER_MIN,
  SPAWN_MIN_PLAYER_DISTANCE,
  SPAWN_RING_MARGIN,
  chooseActiveEnemyId,
  getActiveSpawnPerMinute,
} from '../data/waves.js';
import { resolveEnemyReward, spawnEnemy, type EnemyEntity } from '../entities/enemy.js';
import type { GameState } from '../engine/state.js';
import { spawnPickupByKind, spawnXpGem } from './pickup.js';

const MIN_DISTANCE_SQ = SPAWN_MIN_PLAYER_DISTANCE * SPAWN_MIN_PLAYER_DISTANCE;

export function updateSpawns(state: GameState, dt: number): void {
  const elapsedMin = state.elapsedSec / 60;
  const baseSpawnPerMinute = getActiveSpawnPerMinute(state.elapsedSec);
  const spawnPerSec = (baseSpawnPerMinute * (1 + elapsedMin * DENSITY_GROWTH_PER_MIN)) / 60;

  state.spawn.accumulator += spawnPerSec * dt;

  while (state.spawn.accumulator >= 1) {
    state.spawn.accumulator -= 1;
    spawnWaveEnemy(state, chooseActiveEnemyId(state.elapsedSec, nextRandom(state)), elapsedMin);
  }
}

export function spawnWaveEnemy(state: GameState, enemyId: keyof typeof ENEMIES, elapsedMin: number): EnemyEntity {
  if (state.enemies.activeCount >= state.enemies.capacity) {
    releaseFarthestEnemy(state);
  }

  const definition = ENEMIES[enemyId];
  const enemy = state.enemies.acquire();
  const hp = Math.ceil(definition.hp * (1 + elapsedMin * HP_GROWTH_PER_MIN));
  writeSpawnPosition(state);
  spawnEnemy(enemy, definition, state.spawn.nextX, state.spawn.nextY, hp);
  return enemy;
}

/**
 * 적을 처치한다. **보상은 즉시 주지 않는다** — 죽은 자리에 떨어뜨린다.
 *
 * 경험치도 회복도 픽업으로 나가므로, 플레이어가 위험 지역까지 주우러 가는 판단이 생긴다.
 * 이게 없으면 "죽이면 곧 성장"이라 이동에 의미가 사라진다.
 */
export function defeatEnemy(state: GameState, enemy: EnemyEntity): void {
  if (enemy.ai === 'split' && !enemy.hasSplit) {
    splitEnemy(state, enemy);
    return;
  }

  const dropX = enemy.x;
  const dropY = enemy.y;
  const xp = enemy.xp;
  const reward = resolveEnemyReward(enemy, nextDropSeed(state));

  state.combat.defeatedEnemies += 1;
  state.enemies.release(enemy);

  spawnXpGem(state.pickups, xp, dropX, dropY);
  if (reward === 'heal') spawnPickupByKind(state.pickups, 'heal', dropX, dropY);
  else if (reward === 'magnet') spawnPickupByKind(state.pickups, 'magnet', dropX, dropY);
  else if (reward === 'bomb') spawnPickupByKind(state.pickups, 'meteor', dropX, dropY);
}

function splitEnemy(state: GameState, enemy: EnemyEntity): void {
  const x = enemy.x;
  const y = enemy.y;
  const hp = Math.max(1, Math.ceil(enemy.maxHp * 0.5));
  const childRadius = Math.max(10, enemy.radius * 0.5);
  const offset = Math.max(childRadius + 2, enemy.radius * 0.6);
  state.enemies.release(enemy);

  const left = spawnWaveEnemyAt(state, 'uranium', x - offset, y, hp);
  left.radius = childRadius;
  left.hasSplit = true;

  const right = spawnWaveEnemyAt(state, 'uranium', x + offset, y, hp);
  right.radius = childRadius;
  right.hasSplit = true;
}

function spawnWaveEnemyAt(
  state: GameState,
  enemyId: keyof typeof ENEMIES,
  x: number,
  y: number,
  hp: number,
): EnemyEntity {
  if (state.enemies.activeCount >= state.enemies.capacity) {
    releaseFarthestEnemy(state);
  }

  const enemy = state.enemies.acquire();
  spawnEnemy(enemy, ENEMIES[enemyId], x, y, hp);
  return enemy;
}

function releaseFarthestEnemy(state: GameState): void {
  const pool = state.enemies;
  let farthest = pool.items[0] as EnemyEntity;
  let farthestDistSq = distanceSqToPlayer(farthest, state);

  for (let i = 1; i < pool.activeCount; i += 1) {
    const enemy = pool.items[i] as EnemyEntity;
    const distSq = distanceSqToPlayer(enemy, state);
    if (distSq > farthestDistSq) {
      farthest = enemy;
      farthestDistSq = distSq;
    }
  }

  pool.release(farthest);
}

function distanceSqToPlayer(enemy: EnemyEntity, state: GameState): number {
  const dx = enemy.x - state.player.x;
  const dy = enemy.y - state.player.y;
  return dx * dx + dy * dy;
}

function writeSpawnPosition(state: GameState): void {
  const halfWidth = state.viewport.width * 0.5;
  const halfHeight = state.viewport.height * 0.5;
  const left = state.player.x - halfWidth - SPAWN_RING_MARGIN;
  const right = state.player.x + halfWidth + SPAWN_RING_MARGIN;
  const top = state.player.y - halfHeight - SPAWN_RING_MARGIN;
  const bottom = state.player.y + halfHeight + SPAWN_RING_MARGIN;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const side = state.spawn.sideCursor & 3;
    state.spawn.sideCursor += 1;
    const t = nextRandom(state);

    if (side === 0) {
      state.spawn.nextX = left;
      state.spawn.nextY = top + (bottom - top) * t;
    } else if (side === 1) {
      state.spawn.nextX = right;
      state.spawn.nextY = top + (bottom - top) * t;
    } else if (side === 2) {
      state.spawn.nextX = left + (right - left) * t;
      state.spawn.nextY = top;
    } else {
      state.spawn.nextX = left + (right - left) * t;
      state.spawn.nextY = bottom;
    }

    const dx = state.spawn.nextX - state.player.x;
    const dy = state.spawn.nextY - state.player.y;
    if (dx * dx + dy * dy >= MIN_DISTANCE_SQ) return;
  }

  state.spawn.nextX = state.player.x + SPAWN_MIN_PLAYER_DISTANCE + SPAWN_RING_MARGIN;
  state.spawn.nextY = state.player.y;
}

/** 드롭 굴림은 스폰 위치와 다른 씨앗을 쓴다. 처치 수가 스폰 패턴을 흔들면 안 된다 */
function nextDropSeed(state: GameState): number {
  state.combat.dropSeed = (state.combat.dropSeed * 1664525 + 1013904223) >>> 0;
  return state.combat.dropSeed;
}

function nextRandom(state: GameState): number {
  state.spawn.seed = (state.spawn.seed * 1664525 + 1013904223) >>> 0;
  return state.spawn.seed / 4294967296;
}
