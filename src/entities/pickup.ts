import { ENTITY_SHAPES, type EntityShape } from '../data/palette.js';
import { createPool, type Pool, type Poolable } from '../engine/pool.js';
import type { RenderableEntity } from '../engine/renderer.js';

/**
 * 필드에 떨어지는 것들 (02-게임코어 §10).
 *
 * 두 종류뿐이다 — **모아서 자라는 것**(양성자 조각)과 **주우면 그 자리에서 터지는 것**
 * (즉시 발동 아이템). 조각은 적이 죽은 자리에 떨어지고, 즉시 발동 아이템은
 * 원소 램프(`data/crates.ts`)를 깨거나 보상 몬스터를 잡아야 나온다.
 *
 * 즉시 발동 아이템은 뱀파이어 서바이버의 촛대 드롭(Floor Chicken / Attractorb /
 * Rosary / Orologion / Nduja Fritta / Barrier)에 대응하되 이름은 원소로 잡았다.
 */

export type PickupKind =
  | 'proton-small'
  | 'proton-medium'
  | 'proton-large'
  | 'heal'
  | 'magnet'
  | 'meteor'
  | 'clock'
  | 'flare'
  | 'shield';

export interface PickupDefinition {
  readonly kind: PickupKind;
  readonly name: string;
  readonly element: string;
  readonly atomicNumber: number;
  readonly xp: number;
  readonly heal: number;
  /** 자력 반경이 커지는 시간(초) */
  readonly magnetSec: number;
  /** 필드에 남은 양성자 조각을 즉시 전부 끌어당기는가 */
  readonly vacuum: boolean;
  /** 화면 안 모든 적에게 즉시 들어가는 피해 */
  readonly meteorDamage: number;
  /** 모든 적이 멈추는 시간(초) */
  readonly freezeSec: number;
  /** 무기 쿨다운이 짧아지는 시간(초) */
  readonly hasteSec: number;
  /** 무적 시간(초) */
  readonly shieldSec: number;
  readonly radius: number;
  readonly symbol: string;
  readonly paletteIndex: number;
  readonly accessoryKind: number;
  readonly shape: EntityShape;
  /** 즉시 발동 아이템은 효과가 한눈에 읽히는 이모지를 쓴다. 조각은 빈 문자열 */
  readonly icon: string;
}

export interface PickupEntity extends RenderableEntity, Poolable {
  kind: 'pickup';
  active: boolean;
  pickupKind: PickupKind;
  xp: number;
  heal: number;
  magnetSec: number;
  vacuum: boolean;
  meteorDamage: number;
  freezeSec: number;
  hasteSec: number;
  shieldSec: number;
}

export type PickupPool = Pool<PickupEntity>;

/** 조각이 필드에 남아 있게 되면서 동시 활성 수가 늘었다. 적 상한(300)보다 넉넉해야 한다 */
export const MAX_ACTIVE_PICKUPS = 512;

/**
 * 조각도 아이템도 **배지**(눈 없는 원)다. 살아 있지 않으니 눈이 없다 (05-세션-운영 §14.5).
 * 다른 점은 이모지뿐 — 조각은 색과 크기로만 말하고, 아이템은 기능을 이모지로 말한다.
 */
const SHARD_SHAPE = { shape: ENTITY_SHAPES.icon, icon: '' } as const;
const ITEM_SHAPE = { shape: ENTITY_SHAPES.icon } as const;

const EMPTY_EFFECTS = {
  xp: 0,
  heal: 0,
  magnetSec: 0,
  vacuum: false,
  meteorDamage: 0,
  freezeSec: 0,
  hasteSec: 0,
  shieldSec: 0,
} as const;

export const PICKUPS = {
  'proton-small': {
    ...EMPTY_EFFECTS,
    ...SHARD_SHAPE,
    kind: 'proton-small',
    name: '양성자 조각',
    element: 'p',
    atomicNumber: 1,
    xp: 1,
    radius: 7,
    symbol: 'p',
    paletteIndex: 0,
    accessoryKind: 0,
  },
  'proton-medium': {
    ...EMPTY_EFFECTS,
    ...SHARD_SHAPE,
    kind: 'proton-medium',
    name: '양성자 덩이',
    element: 'p',
    atomicNumber: 1,
    xp: 5,
    radius: 9,
    symbol: 'P',
    paletteIndex: 1,
    accessoryKind: 1,
  },
  'proton-large': {
    ...EMPTY_EFFECTS,
    ...SHARD_SHAPE,
    kind: 'proton-large',
    name: '양성자 결정',
    element: 'p',
    atomicNumber: 1,
    xp: 20,
    radius: 12,
    symbol: '20',
    paletteIndex: 2,
    accessoryKind: 2,
  },
  heal: {
    ...EMPTY_EFFECTS,
    ...ITEM_SHAPE,
    icon: '❤️',
    kind: 'heal',
    name: '아이오딘 방울',
    element: 'I',
    atomicNumber: 53,
    heal: 50,
    radius: 11,
    symbol: 'I',
    paletteIndex: 3,
    accessoryKind: 1,
  },
  magnet: {
    ...EMPTY_EFFECTS,
    ...ITEM_SHAPE,
    icon: '🧲',
    kind: 'magnet',
    name: '네오디뮴 자석',
    element: 'Nd',
    atomicNumber: 60,
    magnetSec: 6,
    vacuum: true,
    radius: 11,
    symbol: 'Nd',
    paletteIndex: 4,
    accessoryKind: 2,
  },
  meteor: {
    ...EMPTY_EFFECTS,
    ...ITEM_SHAPE,
    icon: '💣',
    kind: 'meteor',
    name: '이리듐 운석',
    element: 'Ir',
    atomicNumber: 77,
    meteorDamage: 200,
    radius: 12,
    symbol: 'Ir',
    paletteIndex: 5,
    accessoryKind: 0,
  },
  clock: {
    ...EMPTY_EFFECTS,
    ...ITEM_SHAPE,
    icon: '⏱️',
    kind: 'clock',
    name: '세슘 시계',
    element: 'Cs',
    atomicNumber: 55,
    freezeSec: 5,
    radius: 11,
    symbol: 'Cs',
    paletteIndex: 6,
    accessoryKind: 0,
  },
  flare: {
    ...EMPTY_EFFECTS,
    ...ITEM_SHAPE,
    icon: '🔥',
    kind: 'flare',
    name: '인 점화',
    element: 'P',
    atomicNumber: 15,
    hasteSec: 8,
    radius: 11,
    symbol: 'P',
    paletteIndex: 7,
    accessoryKind: 1,
  },
  shield: {
    ...EMPTY_EFFECTS,
    ...ITEM_SHAPE,
    icon: '🛡️',
    kind: 'shield',
    name: '금 보호막',
    element: 'Au',
    atomicNumber: 79,
    shieldSec: 5,
    radius: 11,
    symbol: 'Au',
    paletteIndex: 8,
    accessoryKind: 2,
  },
} as const satisfies Record<PickupKind, PickupDefinition>;

/** 주우면 그 자리에서 발동하는 아이템인가. 조각은 게이지를 채울 뿐이라 제외된다 */
export function isInstantPickup(kind: PickupKind): boolean {
  return PICKUPS[kind].xp <= 0;
}

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
  pickup.paletteGroup = 2;
  pickup.shape = definition.shape;
  pickup.icon = definition.icon;
  pickup.paletteIndex = definition.paletteIndex;
  pickup.symbol = definition.symbol;
  pickup.accessoryKind = definition.accessoryKind;
  pickup.xp = definition.xp;
  pickup.heal = definition.heal;
  pickup.magnetSec = definition.magnetSec;
  pickup.vacuum = definition.vacuum;
  pickup.meteorDamage = definition.meteorDamage;
  pickup.freezeSec = definition.freezeSec;
  pickup.hasteSec = definition.hasteSec;
  pickup.shieldSec = definition.shieldSec;
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
    paletteGroup: 2,
    shape: ENTITY_SHAPES.circle,
    icon: '',
    paletteIndex: 0,
    symbol: 'p',
    accessoryKind: 0,
    xp: 0,
    heal: 0,
    magnetSec: 0,
    vacuum: false,
    meteorDamage: 0,
    freezeSec: 0,
    hasteSec: 0,
    shieldSec: 0,
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
  pickup.vacuum = false;
  pickup.meteorDamage = 0;
  pickup.freezeSec = 0;
  pickup.hasteSec = 0;
  pickup.shieldSec = 0;
}
