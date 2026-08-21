import type { PickupKind } from '../entities/pickup.js';

/**
 * 원소 램프 — 필드에 놓이는 파괴 가능한 상자 (02-게임코어 §10.2).
 *
 * 뱀파이어 서바이버의 촛대(light source)에 대응한다. 이름을 **비활성 기체**로 잡은 것은
 * 우연이 아니다 — 네온·아르곤·크립톤·제논은 실제로 램프를 채우는 원소이고,
 * 반응하지 않아 플레이어를 공격하지 않는다. 체력이 1이라 스치기만 해도 깨진다.
 *
 * 정본 수치는 문서다(AGENTS §2 규칙 6). 여기 값을 고치면 문서도 같이 고친다.
 */

export type CrateId = 'neon' | 'argon' | 'krypton' | 'xenon';

export interface CrateDefinition {
  readonly id: CrateId;
  readonly name: string;
  readonly element: string;
  readonly atomicNumber: number;
  readonly hp: number;
  readonly radius: number;
  readonly paletteIndex: number;
  readonly accessoryKind: number;
  /** 깨질 때 떨어지는 즉시 발동 아이템 개수 */
  readonly dropCount: number;
  /** 등장 가중치. 합이 100이 되도록 맞춘다 */
  readonly weight: number;
}

/** 램프는 전투 부담이 아니라 보상이다. 화면을 덮지 않도록 상한을 낮게 잡는다 */
export const MAX_ACTIVE_CRATES = 6;
export const CRATE_SPAWN_INTERVAL_SEC = 12;
/** 상자 체력은 항상 1이다. "부수러 간다"가 아니라 "지나가며 깬다"가 되어야 한다 */
export const CRATE_HP = 1;
/** 플레이어 위에 바로 뜨지 않도록 하는 최소 거리 */
export const CRATE_MIN_PLAYER_DISTANCE = 180;
/** 최소 거리에 더해지는 산포 폭. 최소~최소+산포 안에 뜬다 */
export const CRATE_SPAWN_SPREAD = 260;
/** 아이템이 2개 이상 떨어질 때 서로 겹치지 않게 벌리는 간격 */
export const CRATE_DROP_SPREAD_PX = 18;

export const CRATES = {
  neon: {
    id: 'neon',
    name: '네온 램프',
    element: 'Ne',
    atomicNumber: 10,
    hp: CRATE_HP,
    radius: 16,
    paletteIndex: 9,
    accessoryKind: 1,
    dropCount: 1,
    weight: 45,
  },
  argon: {
    id: 'argon',
    name: '아르곤 램프',
    element: 'Ar',
    atomicNumber: 18,
    hp: CRATE_HP,
    radius: 17,
    paletteIndex: 10,
    accessoryKind: 1,
    dropCount: 1,
    weight: 30,
  },
  krypton: {
    id: 'krypton',
    name: '크립톤 램프',
    element: 'Kr',
    atomicNumber: 36,
    hp: CRATE_HP,
    radius: 18,
    paletteIndex: 11,
    accessoryKind: 2,
    dropCount: 2,
    weight: 17,
  },
  xenon: {
    id: 'xenon',
    name: '제논 램프',
    element: 'Xe',
    atomicNumber: 54,
    hp: CRATE_HP,
    radius: 20,
    paletteIndex: 12,
    accessoryKind: 2,
    dropCount: 3,
    weight: 8,
  },
} as const satisfies Record<CrateId, CrateDefinition>;

const CRATE_ORDER: readonly CrateId[] = ['neon', 'argon', 'krypton', 'xenon'];

export interface CrateDropEntry {
  readonly kind: PickupKind;
  readonly weight: number;
}

/**
 * 램프가 떨어뜨리는 즉시 발동 아이템 표. **희귀한 것부터** 늘어놓는다.
 *
 * 행운(luck)이 높을수록 굴림값이 작아져 앞쪽(희귀)에 걸린다.
 * 순서가 곧 희귀도이므로 항목을 끼워 넣을 때 위치를 아무 데나 두면 안 된다.
 */
export const CRATE_DROP_TABLE = [
  { kind: 'shield', weight: 5 },
  { kind: 'flare', weight: 10 },
  { kind: 'clock', weight: 10 },
  { kind: 'meteor', weight: 20 },
  { kind: 'magnet', weight: 25 },
  { kind: 'heal', weight: 30 },
] as const satisfies readonly CrateDropEntry[];

const CRATE_DROP_TOTAL_WEIGHT = CRATE_DROP_TABLE.reduce((sum, entry) => sum + entry.weight, 0);
const CRATE_TOTAL_WEIGHT = CRATE_ORDER.reduce((sum, id) => sum + CRATES[id].weight, 0);

/** `roll01` 은 [0, 1). 흔한 램프부터 걸린다 */
export function chooseCrateId(roll01: number): CrateId {
  let cursor = roll01 * CRATE_TOTAL_WEIGHT;
  for (let i = 0; i < CRATE_ORDER.length; i += 1) {
    const id = CRATE_ORDER[i] as CrateId;
    cursor -= CRATES[id].weight;
    if (cursor < 0) return id;
  }
  return 'neon';
}

/**
 * `roll01` 은 [0, 1), `luck` 은 1 이 기본값.
 * 행운이 2배면 굴림 범위가 절반으로 줄어 표의 희귀한 절반 안에서만 나온다.
 */
export function chooseCrateDropKind(roll01: number, luck: number = 1): PickupKind {
  const safeLuck = luck > 0 ? luck : 1;
  let cursor = (roll01 * CRATE_DROP_TOTAL_WEIGHT) / safeLuck;
  for (let i = 0; i < CRATE_DROP_TABLE.length; i += 1) {
    const entry = CRATE_DROP_TABLE[i] as CrateDropEntry;
    cursor -= entry.weight;
    if (cursor < 0) return entry.kind;
  }
  return CRATE_DROP_TABLE[CRATE_DROP_TABLE.length - 1].kind;
}
