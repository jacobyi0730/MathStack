/**
 * 데미지 숫자.
 *
 * 적 300체가 뒤엉킨 화면에서 숫자는 **금방 서로를 가린다**. 그래서 세 가지를 한다.
 *
 * 1. 뜨는 순간 튀어오른다(팝). 정지한 숫자는 배경으로 읽힌다.
 * 2. 좌우로 흩어진다. 같은 자리에 여러 번 맞아도 숫자가 겹쳐 뭉개지지 않는다.
 * 3. 큰 한 방은 크고 붉게 뜬다. 어떤 무기가 실제로 세게 때리는지가 눈으로 보여야
 *    레벨업 때 무엇을 고를지 판단할 수 있다.
 */

/** 평범한 타격 */
export const DAMAGE_NUMBER_KIND_NORMAL = 0;
/** 남은 체력의 절반 이상을 깎은 한 방 */
export const DAMAGE_NUMBER_KIND_STRONG = 1;
/** 주인공이 입은 피해. 유일하게 붉고 아래로 떨어진다 */
export const DAMAGE_NUMBER_KIND_PLAYER = 2;

export type DamageNumberKind =
  | typeof DAMAGE_NUMBER_KIND_NORMAL
  | typeof DAMAGE_NUMBER_KIND_STRONG
  | typeof DAMAGE_NUMBER_KIND_PLAYER;

export interface DamageNumber {
  active: boolean;
  x: number;
  y: number;
  value: number;
  ageSec: number;
  lifeSec: number;
  maxLifeSec: number;
  vx: number;
  vy: number;
  kind: DamageNumberKind;
}

export interface DamageNumberPool {
  items: DamageNumber[];
  activeCount: number;
  cursor: number;
  /** 좌우 흩뿌림을 번갈아 주기 위한 회전 커서. 난수를 쓸 만한 일이 아니다 */
  scatterCursor: number;
}

export const DAMAGE_NUMBER_CAPACITY = 96;
export const DAMAGE_NUMBER_LIFE_SEC = 0.65;
/** 주인공 피해 숫자는 더 오래 남긴다. 놓치면 왜 죽었는지 모른다 */
export const PLAYER_DAMAGE_NUMBER_LIFE_SEC = 0.9;
/** 팝 애니메이션 길이. 이 시간 동안 0.6 → 1.15 → 1.0 배로 커졌다 잦아든다 */
export const DAMAGE_NUMBER_POP_SEC = 0.12;

const SCATTER_STEPS = 5;
const SCATTER_SPREAD_PX_PER_SEC = 26;

export function createDamageNumberPool(capacity: number = DAMAGE_NUMBER_CAPACITY): DamageNumberPool {
  const items = new Array<DamageNumber>(capacity);
  for (let i = 0; i < capacity; i += 1) {
    items[i] = createDamageNumber();
  }
  return {
    items,
    activeCount: 0,
    cursor: 0,
    scatterCursor: 0,
  };
}

export function spawnDamageNumber(
  pool: DamageNumberPool,
  x: number,
  y: number,
  value: number,
  kind: DamageNumberKind = DAMAGE_NUMBER_KIND_NORMAL,
): void {
  const index = pool.cursor;
  pool.cursor = (pool.cursor + 1) % pool.items.length;
  const item = pool.items[index] as DamageNumber;
  if (!item.active) pool.activeCount += 1;

  const isPlayer = kind === DAMAGE_NUMBER_KIND_PLAYER;
  const lane = pool.scatterCursor % SCATTER_STEPS;
  pool.scatterCursor = (pool.scatterCursor + 1) % (SCATTER_STEPS * 2);

  item.active = true;
  item.x = x;
  item.y = y - 18;
  item.value = Math.max(1, Math.round(value));
  item.ageSec = 0;
  item.lifeSec = isPlayer ? PLAYER_DAMAGE_NUMBER_LIFE_SEC : DAMAGE_NUMBER_LIFE_SEC;
  item.maxLifeSec = item.lifeSec;
  item.vx = (lane - (SCATTER_STEPS - 1) * 0.5) * SCATTER_SPREAD_PX_PER_SEC;
  // 내가 입은 피해는 위가 아니라 아래로 흐른다. 적 피해와 한눈에 갈려야 한다
  item.vy = isPlayer ? 46 : -34;
  item.kind = kind;
}

export function updateDamageNumbers(pool: DamageNumberPool, dt: number): void {
  if (pool.activeCount === 0) return;

  for (let i = 0; i < pool.items.length; i += 1) {
    const item = pool.items[i] as DamageNumber;
    if (!item.active) continue;
    item.ageSec += dt;
    item.lifeSec -= dt;
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    // 위로 뜬 숫자는 서서히 멈춘다. 끝까지 같은 속도로 날아가면 시선을 끌고 간다
    item.vy *= 1 - 1.8 * dt;
    item.vx *= 1 - 3.2 * dt;
    if (item.lifeSec <= 0) {
      item.active = false;
      pool.activeCount -= 1;
    }
  }
}

/** 뜨는 순간의 크기 배율. 렌더러가 글자 크기에 곱한다 */
export function damageNumberScale(item: DamageNumber): number {
  if (item.ageSec >= DAMAGE_NUMBER_POP_SEC) return 1;
  const t = item.ageSec / DAMAGE_NUMBER_POP_SEC;
  // 0.6 → 1.15 → 1.0. 살짝 넘겼다 돌아오는 게 "튀었다"로 읽힌다
  return t < 0.6 ? 0.6 + (1.15 - 0.6) * (t / 0.6) : 1.15 - 0.15 * ((t - 0.6) / 0.4);
}

function createDamageNumber(): DamageNumber {
  return {
    active: false,
    x: 0,
    y: 0,
    value: 0,
    ageSec: 0,
    lifeSec: 0,
    maxLifeSec: 0,
    vx: 0,
    vy: 0,
    kind: DAMAGE_NUMBER_KIND_NORMAL,
  };
}
