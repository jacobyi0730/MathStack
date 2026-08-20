export interface DamageNumber {
  active: boolean;
  x: number;
  y: number;
  value: number;
  ageSec: number;
  lifeSec: number;
  vy: number;
}

export interface DamageNumberPool {
  items: DamageNumber[];
  activeCount: number;
  cursor: number;
}

export const DAMAGE_NUMBER_CAPACITY = 96;
export const DAMAGE_NUMBER_LIFE_SEC = 0.65;

export function createDamageNumberPool(capacity: number = DAMAGE_NUMBER_CAPACITY): DamageNumberPool {
  const items = new Array<DamageNumber>(capacity);
  for (let i = 0; i < capacity; i += 1) {
    items[i] = createDamageNumber();
  }
  return {
    items,
    activeCount: 0,
    cursor: 0,
  };
}

export function spawnDamageNumber(pool: DamageNumberPool, x: number, y: number, value: number): void {
  const index = pool.cursor;
  pool.cursor = (pool.cursor + 1) % pool.items.length;
  const item = pool.items[index] as DamageNumber;
  if (!item.active) pool.activeCount += 1;
  item.active = true;
  item.x = x;
  item.y = y - 18;
  item.value = Math.max(1, Math.round(value));
  item.ageSec = 0;
  item.lifeSec = DAMAGE_NUMBER_LIFE_SEC;
  item.vy = -34;
}

export function updateDamageNumbers(pool: DamageNumberPool, dt: number): void {
  for (let i = 0; i < pool.items.length; i += 1) {
    const item = pool.items[i] as DamageNumber;
    if (!item.active) continue;
    item.ageSec += dt;
    item.lifeSec -= dt;
    item.y += item.vy * dt;
    if (item.lifeSec <= 0) {
      item.active = false;
      pool.activeCount -= 1;
    }
  }
}

function createDamageNumber(): DamageNumber {
  return {
    active: false,
    x: 0,
    y: 0,
    value: 0,
    ageSec: 0,
    lifeSec: 0,
    vy: 0,
  };
}
