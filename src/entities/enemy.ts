import {
  ENEMIES,
  MAX_ACTIVE_ENEMIES,
  type EnemyAiKind,
  type EnemyDefinition,
  type EnemyId,
  type EnemyRewardKind,
} from '../data/enemies.js';
import { createPool, type Pool, type Poolable } from '../engine/pool.js';
import type { RenderableEntity } from '../engine/renderer.js';

export interface EnemyEntity extends RenderableEntity, Poolable {
  kind: 'enemy';
  active: boolean;
  id: EnemyId;
  name: string;
  element: string;
  atomicNumber: number;
  hp: number;
  maxHp: number;
  speed: number;
  contactDamage: number;
  xp: number;
  ai: EnemyAiKind;
  rewardKind: EnemyRewardKind;
  rewardAmount: number;
  aiTimerSec: number;
  aiPhase: number;
  chargeDirX: number;
  chargeDirY: number;
  hasSplit: boolean;
  rangedCooldownSec: number;
  rangedShotSeq: number;
  rangedAimX: number;
  rangedAimY: number;
}

export type EnemyPool = Pool<EnemyEntity>;
export type ResolvedEnemyRewardKind = 'none' | 'magnet' | 'bomb' | 'heal';

export function createEnemyPool(capacity: number = MAX_ACTIVE_ENEMIES): EnemyPool {
  return createPool<EnemyEntity>(createEnemy, resetEnemy, capacity);
}

export function spawnEnemy(enemy: EnemyEntity, definition: EnemyDefinition, x: number, y: number, hp: number): void {
  enemy.active = true;
  enemy.id = definition.id;
  enemy.name = definition.name;
  enemy.element = definition.element;
  enemy.atomicNumber = definition.atomicNumber;
  enemy.x = x;
  enemy.y = y;
  enemy.prevX = x;
  enemy.prevY = y;
  enemy.dx = 0;
  enemy.dy = 0;
  enemy.radius = definition.radius;
  enemy.paletteIndex = definition.paletteIndex;
  enemy.symbol = definition.element;
  enemy.accessoryKind = definition.accessoryKind;
  enemy.maxHp = hp;
  enemy.hp = hp;
  enemy.speed = definition.speed;
  enemy.contactDamage = definition.contactDamage;
  enemy.xp = definition.xp;
  enemy.ai = definition.ai;
  enemy.rewardKind = definition.rewardKind;
  enemy.rewardAmount = definition.rewardAmount;
  resetEnemyAiState(enemy);
}

export function resetEnemyAiState(enemy: EnemyEntity): void {
  enemy.aiTimerSec = 0;
  enemy.aiPhase = 0;
  enemy.chargeDirX = 0;
  enemy.chargeDirY = 0;
  enemy.hasSplit = false;
  enemy.rangedCooldownSec = 0;
  enemy.rangedShotSeq = 0;
  enemy.rangedAimX = 0;
  enemy.rangedAimY = 0;
}

export function getIncomingDamageMultiplier(
  enemy: EnemyEntity,
  sourceX: number,
  sourceY: number,
): number {
  if (enemy.ai !== 'tank') return 1;

  const directionLenSq = enemy.dx * enemy.dx + enemy.dy * enemy.dy;
  if (directionLenSq <= 0.0001) return 1;

  const sourceXFromEnemy = sourceX - enemy.x;
  const sourceYFromEnemy = sourceY - enemy.y;
  const sourceLenSq = sourceXFromEnemy * sourceXFromEnemy + sourceYFromEnemy * sourceYFromEnemy;
  if (sourceLenSq <= 0.0001) return 1;

  const dot = enemy.dx * sourceXFromEnemy + enemy.dy * sourceYFromEnemy;
  return dot > 0 ? 0.5 : 1;
}

export function resolveEnemyReward(enemy: EnemyEntity, seed: number): ResolvedEnemyRewardKind {
  if (enemy.rewardKind === 'heal') return 'heal';
  if (enemy.rewardKind === 'magnet_or_bomb') return (seed & 1) === 0 ? 'magnet' : 'bomb';
  return 'none';
}

function createEnemy(): EnemyEntity {
  return {
    kind: 'enemy',
    active: false,
    id: 'radon',
    name: ENEMIES.radon.name,
    element: ENEMIES.radon.element,
    atomicNumber: ENEMIES.radon.atomicNumber,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    dx: 0,
    dy: 0,
    radius: 0,
    paletteGroup: 1,
    paletteIndex: ENEMIES.radon.paletteIndex,
    symbol: ENEMIES.radon.element,
    accessoryKind: ENEMIES.radon.accessoryKind,
    hp: 0,
    maxHp: 0,
    speed: 0,
    contactDamage: 0,
    xp: 0,
    ai: 'chase',
    rewardKind: 'none',
    rewardAmount: 0,
    aiTimerSec: 0,
    aiPhase: 0,
    chargeDirX: 0,
    chargeDirY: 0,
    hasSplit: false,
    rangedCooldownSec: 0,
    rangedShotSeq: 0,
    rangedAimX: 0,
    rangedAimY: 0,
    poolIndex: -1,
    poolSeq: 0,
  };
}

function resetEnemy(enemy: EnemyEntity): void {
  enemy.active = false;
  enemy.x = 0;
  enemy.y = 0;
  enemy.prevX = 0;
  enemy.prevY = 0;
  enemy.dx = 0;
  enemy.dy = 0;
  enemy.radius = 0;
  enemy.hp = 0;
  enemy.maxHp = 0;
  enemy.speed = 0;
  enemy.contactDamage = 0;
  enemy.xp = 0;
  enemy.ai = 'chase';
  enemy.rewardKind = 'none';
  enemy.rewardAmount = 0;
  resetEnemyAiState(enemy);
}
