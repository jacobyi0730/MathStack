import { ENEMIES, MAX_ACTIVE_ENEMIES, type EnemyAiKind, type EnemyDefinition, type EnemyId } from '../data/enemies.js';
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
}

export type EnemyPool = Pool<EnemyEntity>;

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
}
