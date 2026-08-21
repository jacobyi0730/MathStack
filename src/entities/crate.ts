import { CRATES, MAX_ACTIVE_CRATES, type CrateDefinition, type CrateId } from '../data/crates.js';
import { ENTITY_SHAPES } from '../data/palette.js';
import { createPool, type Pool, type Poolable } from '../engine/pool.js';
import type { RenderableEntity } from '../engine/renderer.js';

export interface CrateEntity extends RenderableEntity, Poolable {
  kind: 'crate';
  active: boolean;
  id: CrateId;
  name: string;
  element: string;
  atomicNumber: number;
  hp: number;
  dropCount: number;
}

export type CratePool = Pool<CrateEntity>;

export function createCratePool(capacity: number = MAX_ACTIVE_CRATES): CratePool {
  return createPool<CrateEntity>(createCrate, resetCrate, capacity);
}

export function spawnCrate(crate: CrateEntity, definition: CrateDefinition, x: number, y: number): void {
  crate.active = true;
  crate.id = definition.id;
  crate.name = definition.name;
  crate.element = definition.element;
  crate.atomicNumber = definition.atomicNumber;
  crate.x = x;
  crate.y = y;
  crate.prevX = x;
  crate.prevY = y;
  crate.dx = 0;
  crate.dy = 0;
  crate.radius = definition.radius;
  crate.paletteGroup = 2;
  crate.shape = ENTITY_SHAPES.box;
  crate.paletteIndex = definition.paletteIndex;
  crate.symbol = definition.element;
  crate.accessoryKind = definition.accessoryKind;
  crate.hp = definition.hp;
  crate.dropCount = definition.dropCount;
}

/** 체력 1이라 어떤 피해든 한 방이지만, 판정은 적과 같은 모양으로 둔다 */
export function applyCrateDamage(crate: CrateEntity, damage: number): boolean {
  if (!crate.active || damage <= 0) return false;
  crate.hp -= damage;
  return crate.hp <= 0;
}

function createCrate(): CrateEntity {
  return {
    kind: 'crate',
    active: false,
    id: 'neon',
    name: CRATES.neon.name,
    element: CRATES.neon.element,
    atomicNumber: CRATES.neon.atomicNumber,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    dx: 0,
    dy: 0,
    radius: 0,
    paletteGroup: 2,
    shape: ENTITY_SHAPES.box,
    icon: '',
    paletteIndex: CRATES.neon.paletteIndex,
    symbol: CRATES.neon.element,
    accessoryKind: CRATES.neon.accessoryKind,
    hp: 0,
    dropCount: 0,
    poolIndex: -1,
    poolSeq: 0,
  };
}

function resetCrate(crate: CrateEntity): void {
  crate.active = false;
  crate.x = 0;
  crate.y = 0;
  crate.prevX = 0;
  crate.prevY = 0;
  crate.dx = 0;
  crate.dy = 0;
  crate.radius = 0;
  crate.hp = 0;
  crate.dropCount = 0;
}
