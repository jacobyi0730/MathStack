import type { EnemyEntity } from '../entities/enemy.js';
import type { GameState } from '../engine/state.js';
import { shortestDeltaX, shortestDeltaY, wrapX, wrapY } from '../engine/world.js';

type EnemyAiHandler = (enemy: EnemyEntity, state: GameState, dt: number) => void;

const AI: Record<EnemyEntity['ai'], EnemyAiHandler> = {
  chase,
  charge,
  tank: chase,
  split: chase,
  ranged,
  flee,
};

const CHARGE_PREPARE_SEC = 0.5;
const CHARGE_PERIOD_SEC = 4;
const CHARGE_SPEED_MULTIPLIER = 2.4;
const RANGED_MIN_DISTANCE = 220;
const RANGED_MAX_DISTANCE = 300;
const RANGED_FIRE_DISTANCE = 340;
const RANGED_COOLDOWN_SEC = 2;

export function updateEnemies(state: GameState, dt: number): void {
  const pool = state.enemies;
  for (let i = 0; i < pool.activeCount; i += 1) {
    const enemy = pool.items[i] as EnemyEntity;
    AI[enemy.ai](enemy, state, dt);
  }
}

function chase(enemy: EnemyEntity, state: GameState, dt: number): void {
  moveToward(enemy, state.player.x, state.player.y, enemy.speed, dt, state);
}

function charge(enemy: EnemyEntity, state: GameState, dt: number): void {
  enemy.prevX = enemy.x;
  enemy.prevY = enemy.y;

  const toPlayerX = shortestDeltaX(enemy.x, state.player.x, state.world);
  const toPlayerY = shortestDeltaY(enemy.y, state.player.y, state.world);
  const distanceSq = toPlayerX * toPlayerX + toPlayerY * toPlayerY;

  if (distanceSq <= 0.0001) {
    enemy.dx = 0;
    enemy.dy = 0;
    return;
  }

  const invDistance = 1 / Math.sqrt(distanceSq);
  enemy.aiTimerSec += dt;
  if (enemy.aiTimerSec >= CHARGE_PERIOD_SEC) {
    enemy.aiTimerSec -= CHARGE_PERIOD_SEC;
    enemy.aiPhase = 1;
    enemy.chargeDirX = toPlayerX * invDistance;
    enemy.chargeDirY = toPlayerY * invDistance;
  }

  if (enemy.aiPhase === 1) {
    enemy.dx = 0;
    enemy.dy = 0;
    if (enemy.aiTimerSec >= CHARGE_PREPARE_SEC) enemy.aiPhase = 2;
    return;
  }

  if (enemy.aiPhase === 2) {
    const chargeSpeed = enemy.speed * CHARGE_SPEED_MULTIPLIER;
    enemy.dx = enemy.chargeDirX * chargeSpeed;
    enemy.dy = enemy.chargeDirY * chargeSpeed;
    enemy.x = wrapX(enemy.x + enemy.dx * dt, state.world);
    enemy.y = wrapY(enemy.y + enemy.dy * dt, state.world);
    if (enemy.aiTimerSec >= CHARGE_PREPARE_SEC * 2) enemy.aiPhase = 0;
    return;
  }

  enemy.dx = toPlayerX * invDistance * enemy.speed;
  enemy.dy = toPlayerY * invDistance * enemy.speed;
  enemy.x = wrapX(enemy.x + enemy.dx * dt, state.world);
  enemy.y = wrapY(enemy.y + enemy.dy * dt, state.world);
}

function ranged(enemy: EnemyEntity, state: GameState, dt: number): void {
  enemy.prevX = enemy.x;
  enemy.prevY = enemy.y;

  const toPlayerX = shortestDeltaX(enemy.x, state.player.x, state.world);
  const toPlayerY = shortestDeltaY(enemy.y, state.player.y, state.world);
  const distanceSq = toPlayerX * toPlayerX + toPlayerY * toPlayerY;
  if (distanceSq <= 0.0001) {
    enemy.dx = 0;
    enemy.dy = 0;
    return;
  }

  const distance = Math.sqrt(distanceSq);
  const invDistance = 1 / distance;
  enemy.rangedCooldownSec -= dt;
  if (distance <= RANGED_FIRE_DISTANCE && enemy.rangedCooldownSec <= 0) {
    enemy.rangedCooldownSec = RANGED_COOLDOWN_SEC;
    enemy.rangedShotSeq += 1;
    enemy.rangedAimX = toPlayerX * invDistance;
    enemy.rangedAimY = toPlayerY * invDistance;
  }

  if (distance < RANGED_MIN_DISTANCE) {
    enemy.dx = -toPlayerX * invDistance * enemy.speed;
    enemy.dy = -toPlayerY * invDistance * enemy.speed;
  } else if (distance > RANGED_MAX_DISTANCE) {
    enemy.dx = toPlayerX * invDistance * enemy.speed;
    enemy.dy = toPlayerY * invDistance * enemy.speed;
  } else {
    enemy.dx = 0;
    enemy.dy = 0;
  }
  enemy.x = wrapX(enemy.x + enemy.dx * dt, state.world);
  enemy.y = wrapY(enemy.y + enemy.dy * dt, state.world);
}

function flee(enemy: EnemyEntity, state: GameState, dt: number): void {
  moveToward(enemy, state.player.x, state.player.y, -enemy.speed, dt, state);
}

function moveToward(
  enemy: EnemyEntity,
  targetX: number,
  targetY: number,
  speed: number,
  dt: number,
  state: GameState,
): void {
  enemy.prevX = enemy.x;
  enemy.prevY = enemy.y;

  const toTargetX = shortestDeltaX(enemy.x, targetX, state.world);
  const toTargetY = shortestDeltaY(enemy.y, targetY, state.world);
  const distanceSq = toTargetX * toTargetX + toTargetY * toTargetY;

  if (distanceSq <= 0.0001) {
    enemy.dx = 0;
    enemy.dy = 0;
    return;
  }

  const invDistance = 1 / Math.sqrt(distanceSq);
  enemy.dx = toTargetX * invDistance * speed;
  enemy.dy = toTargetY * invDistance * speed;
  enemy.x = wrapX(enemy.x + enemy.dx * dt, state.world);
  enemy.y = wrapY(enemy.y + enemy.dy * dt, state.world);
}
