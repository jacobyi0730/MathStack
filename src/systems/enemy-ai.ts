import type { EnemyEntity } from '../entities/enemy.js';
import type { GameState } from '../engine/state.js';

type EnemyAiHandler = (enemy: EnemyEntity, state: GameState, dt: number) => void;

const AI: Record<EnemyEntity['ai'], EnemyAiHandler> = {
  chase,
  charge: noop,
  tank: noop,
  split: noop,
  ranged: noop,
  flee: noop,
};

export function updateEnemies(state: GameState, dt: number): void {
  const pool = state.enemies;
  for (let i = 0; i < pool.activeCount; i += 1) {
    const enemy = pool.items[i] as EnemyEntity;
    AI[enemy.ai](enemy, state, dt);
  }
}

function chase(enemy: EnemyEntity, state: GameState, dt: number): void {
  enemy.prevX = enemy.x;
  enemy.prevY = enemy.y;

  const toPlayerX = state.player.x - enemy.x;
  const toPlayerY = state.player.y - enemy.y;
  const distanceSq = toPlayerX * toPlayerX + toPlayerY * toPlayerY;

  if (distanceSq <= 0.0001) {
    enemy.dx = 0;
    enemy.dy = 0;
    return;
  }

  const invDistance = 1 / Math.sqrt(distanceSq);
  enemy.dx = toPlayerX * invDistance * enemy.speed;
  enemy.dy = toPlayerY * invDistance * enemy.speed;
  enemy.x += enemy.dx * dt;
  enemy.y += enemy.dy * dt;
}

function noop(enemy: EnemyEntity): void {
  enemy.prevX = enemy.x;
  enemy.prevY = enemy.y;
  enemy.dx = 0;
  enemy.dy = 0;
}
