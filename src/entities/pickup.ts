import { createPool, type Pool, type Poolable } from '../engine/pool.js';
import type { RenderableEntity } from '../engine/renderer.js';

export type PickupKind = 'proton-small' | 'proton-medium' | 'proton-large' | 'heal' | 'magnet' | 'meteor';

export interface PickupDefinition {
  readonly kind: PickupKind;
  readonly xp: number;
  readonly heal: number;
  readonly magnetSec: number;
  readonly meteorDamage: number;
  readonly radius: number;
  readonly symbol: string;
  readonly paletteIndex: number;
  readonly accessoryKind: number;
}

export interface PickupEntity extends RenderableEntity, Poolable {
  kind: 'pickup';
  active: boolean;
  pickupKind: PickupKind;
  xp: number;
  heal: number;
  magnetSec: number;
  meteorDamage: number;
}

export type PickupPool = Pool<PickupEntity>;

export const MAX_ACTIVE_PICKUPS = 512;

export const PICKUPS = {
  'proton-small': {
    kind: 'proton-small',
    xp: 1,
    heal: 0,
    magnetSec: 0,
    meteorDamage: 0,
    radius: 7,
    symbol: 'p',
    paletteIndex: 0,
    accessoryKind: 0,
  },
  'proton-medium': {
    kind: 'proton-medium',
    xp: 5,
    heal: 0,
    magnetSec: 0,
    meteorDamage: 0,
    radius: 9,
    symbol: 'P',
    paletteIndex: 1,
    accessoryKind: 1,
  },
  'proton-large': {
    kind: 'proton-large',
    xp: 20,
    heal: 0,
    magnetSec: 0,
    meteorDamage: 0,
    radius: 12,
    symbol: '20',
    paletteIndex: 2,
    accessoryKind: 2,
  },
  heal: {
    kind: 'heal',
    xp: 0,
    heal: 30,
    magnetSec: 0,
    meteorDamage: 0,
    radius: 11,
    symbol: '+',
    paletteIndex: 0,
    accessoryKind: 1,
  },
  magnet: {
    kind: 'magnet',
    xp: 0,
    heal: 0,
    magnetSec: 6,
    meteorDamage: 0,
    radius: 11,
    symbol: 'M',
    paletteIndex: 1,
    accessoryKind: 2,
  },
  meteor: {
    kind: 'meteor',
    xp: 0,
    heal: 0,
    magnetSec: 0,
    meteorDamage: 999,
    radius: 12,
    symbol: '*',
    paletteIndex: 2,
    accessoryKind: 0,
  },
} as const satisfies Record<PickupKind, PickupDefinition>;

export function createPickupPool(capacity: number = MAX_ACTIVE_PICKUPS): PickupPool {
  return createPool<PickupEntity>(createPickup, resetPickup, capacity);
}

export function spawnPickup(
  pickup: PickupEntity,
  definition: PickupDefinition,
  x: number,
  y: number,
): void {
  pickup.active = true;
  pickup.pickupKind = definition.kind;
  pickup.x = x;
  pickup.y = y;
  pickup.prevX = x;
  pickup.prevY = y;
  pickup.dx = 0;
  pickup.dy = 0;
  pickup.radius = definition.radius;
  pickup.paletteGroup = 1;
  pickup.paletteIndex = definition.paletteIndex;
  pickup.symbol = definition.symbol;
  pickup.accessoryKind = definition.accessoryKind;
  pickup.xp = definition.xp;
  pickup.heal = definition.heal;
  pickup.magnetSec = definition.magnetSec;
  pickup.meteorDamage = definition.meteorDamage;
}

function createPickup(): PickupEntity {
  return {
    kind: 'pickup',
    active: false,
    pickupKind: 'proton-small',
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    dx: 0,
    dy: 0,
    radius: 0,
    paletteGroup: 1,
    paletteIndex: 0,
    symbol: 'p',
    accessoryKind: 0,
    xp: 0,
    heal: 0,
    magnetSec: 0,
    meteorDamage: 0,
    poolIndex: -1,
    poolSeq: 0,
  };
}

function resetPickup(pickup: PickupEntity): void {
  pickup.active = false;
  pickup.x = 0;
  pickup.y = 0;
  pickup.prevX = 0;
  pickup.prevY = 0;
  pickup.dx = 0;
  pickup.dy = 0;
  pickup.radius = 0;
  pickup.pickupKind = 'proton-small';
  pickup.xp = 0;
  pickup.heal = 0;
  pickup.magnetSec = 0;
  pickup.meteorDamage = 0;
}
