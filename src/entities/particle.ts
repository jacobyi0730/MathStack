/**
 * 타격 파편 (05-세션-운영 §14.5 보조).
 *
 * 적이 터질 때 사방으로 흩어지는 작은 원들이다. 눈도 기호도 없다 —
 * **살아 있는 것이 아니라 방금 살아 있던 것의 잔해**로 읽혀야 한다.
 *
 * 풀은 링 버퍼다. 오브젝트 풀(`engine/pool.ts`)과 달리 여기서는
 * 가장 오래된 것을 덮어써도 아무도 아쉬워하지 않는다 — 어차피 0.4초 뒤에 사라진다.
 * 적 300체가 동시에 죽어도 할당은 0이고, 화면에는 가장 최근 것만 남는다.
 */

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  ageSec: number;
  lifeSec: number;
  maxLifeSec: number;
  radius: number;
  /** 매 초 속도에 곱해지는 감쇠. 1 이면 감속 없음 */
  drag: number;
  color: string;
}

export interface ParticlePool {
  readonly items: Particle[];
  activeCount: number;
  cursor: number;
}

/** 동시에 살아 있을 수 있는 파편 수. 초과분은 가장 오래된 것을 덮는다 */
export const PARTICLE_CAPACITY = 192;

export function createParticlePool(capacity: number = PARTICLE_CAPACITY): ParticlePool {
  const items = new Array<Particle>(capacity);
  for (let i = 0; i < capacity; i += 1) {
    items[i] = createParticle();
  }
  return { items, activeCount: 0, cursor: 0 };
}

export function spawnParticle(
  pool: ParticlePool,
  x: number,
  y: number,
  vx: number,
  vy: number,
  radius: number,
  lifeSec: number,
  color: string,
  drag: number,
): void {
  const index = pool.cursor;
  pool.cursor = (pool.cursor + 1) % pool.items.length;
  const item = pool.items[index] as Particle;
  if (!item.active) pool.activeCount += 1;

  item.active = true;
  item.x = x;
  item.y = y;
  item.prevX = x;
  item.prevY = y;
  item.vx = vx;
  item.vy = vy;
  item.ageSec = 0;
  item.lifeSec = lifeSec;
  item.maxLifeSec = lifeSec;
  item.radius = radius;
  item.color = color;
  item.drag = drag;
}

export function updateParticles(pool: ParticlePool, dt: number): void {
  if (pool.activeCount === 0) return;

  for (let i = 0; i < pool.items.length; i += 1) {
    const item = pool.items[i] as Particle;
    if (!item.active) continue;

    item.prevX = item.x;
    item.prevY = item.y;
    item.x += item.vx * dt;
    item.y += item.vy * dt;

    // 감쇠는 프레임률과 무관해야 한다. dt 가 고정이라 지수화까지는 필요 없다
    const decay = 1 - (1 - item.drag) * dt * 60;
    item.vx *= decay > 0 ? decay : 0;
    item.vy *= decay > 0 ? decay : 0;

    item.ageSec += dt;
    item.lifeSec -= dt;
    if (item.lifeSec <= 0) {
      item.active = false;
      pool.activeCount -= 1;
    }
  }
}

export function releaseAllParticles(pool: ParticlePool): void {
  for (let i = 0; i < pool.items.length; i += 1) {
    (pool.items[i] as Particle).active = false;
  }
  pool.activeCount = 0;
  pool.cursor = 0;
}

function createParticle(): Particle {
  return {
    active: false,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    ageSec: 0,
    lifeSec: 0,
    maxLifeSec: 0,
    radius: 0,
    drag: 1,
    color: '#FFFFFF',
  };
}
