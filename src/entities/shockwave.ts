/**
 * 충격파 고리.
 *
 * "여기서 무슨 일이 벌어졌다"를 한 프레임 안에 알리는 유일한 수단이다.
 * 적이 터진 자리, 보스가 스킬을 쓴 자리, 운석이 떨어진 자리에 깔린다.
 *
 * 파편(`particle.ts`)과 역할이 다르다 — 파편은 **파괴**를, 고리는 **범위**를 말한다.
 * 보스 스킬처럼 "어디까지 위험한가"를 알려야 하는 것은 반드시 고리로 낸다.
 */

export interface Shockwave {
  active: boolean;
  x: number;
  y: number;
  ageSec: number;
  lifeSec: number;
  maxLifeSec: number;
  startRadius: number;
  endRadius: number;
  /** 고리 선 두께(px). 퍼지면서 얇아진다 */
  width: number;
  /** 0 보다 크면 고리 안쪽도 이 알파로 채운다. 보스 장판 예고용 */
  fillAlpha: number;
  color: string;
}

export interface ShockwavePool {
  readonly items: Shockwave[];
  activeCount: number;
  cursor: number;
}

/** 동시에 살아 있을 수 있는 고리 수. 한 화면에 이보다 많으면 읽히지 않는다 */
export const SHOCKWAVE_CAPACITY = 24;

export function createShockwavePool(capacity: number = SHOCKWAVE_CAPACITY): ShockwavePool {
  const items = new Array<Shockwave>(capacity);
  for (let i = 0; i < capacity; i += 1) {
    items[i] = createShockwave();
  }
  return { items, activeCount: 0, cursor: 0 };
}

export function spawnShockwave(
  pool: ShockwavePool,
  x: number,
  y: number,
  startRadius: number,
  endRadius: number,
  lifeSec: number,
  color: string,
  width: number,
  fillAlpha: number,
): void {
  const index = pool.cursor;
  pool.cursor = (pool.cursor + 1) % pool.items.length;
  const item = pool.items[index] as Shockwave;
  if (!item.active) pool.activeCount += 1;

  item.active = true;
  item.x = x;
  item.y = y;
  item.ageSec = 0;
  item.lifeSec = lifeSec;
  item.maxLifeSec = lifeSec;
  item.startRadius = startRadius;
  item.endRadius = endRadius;
  item.color = color;
  item.width = width;
  item.fillAlpha = fillAlpha;
}

export function updateShockwaves(pool: ShockwavePool, dt: number): void {
  if (pool.activeCount === 0) return;

  for (let i = 0; i < pool.items.length; i += 1) {
    const item = pool.items[i] as Shockwave;
    if (!item.active) continue;
    item.ageSec += dt;
    item.lifeSec -= dt;
    if (item.lifeSec <= 0) {
      item.active = false;
      pool.activeCount -= 1;
    }
  }
}

export function releaseAllShockwaves(pool: ShockwavePool): void {
  for (let i = 0; i < pool.items.length; i += 1) {
    (pool.items[i] as Shockwave).active = false;
  }
  pool.activeCount = 0;
  pool.cursor = 0;
}

/** 0(막 생김) ~ 1(사라짐). 반지름과 알파를 여기서 뽑는다 */
export function shockwaveProgress(item: Shockwave): number {
  if (item.maxLifeSec <= 0) return 1;
  const t = item.ageSec / item.maxLifeSec;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function createShockwave(): Shockwave {
  return {
    active: false,
    x: 0,
    y: 0,
    ageSec: 0,
    lifeSec: 0,
    maxLifeSec: 0,
    startRadius: 0,
    endRadius: 0,
    width: 3,
    fillAlpha: 0,
    color: '#FFFFFF',
  };
}
