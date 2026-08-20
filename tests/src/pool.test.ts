import { describe, expect, it } from 'vitest';
import { createPool, type Poolable } from '../../src/engine/pool.js';

interface Bullet extends Poolable {
  x: number;
  alive: boolean;
}

function makePool(capacity: number): ReturnType<typeof createPool<Bullet>> {
  let created = 0;
  return createPool<Bullet>(
    () => {
      created += 1;
      return { poolIndex: -1, poolSeq: 0, x: created, alive: false };
    },
    (b) => {
      b.x = 0;
      b.alive = false;
    },
    capacity,
  );
}

describe('오브젝트 풀', () => {
  it('생성_시_용량만큼_미리_만들고_이후_늘지_않는다', () => {
    const pool = makePool(8);
    expect(pool.allocations).toBe(8);
    expect(pool.activeCount).toBe(0);

    for (let i = 0; i < 8; i += 1) pool.acquire();
    expect(pool.allocations).toBe(8); // 런타임 할당 0
  });

  it('acquire_한_객체는_서로_다르다', () => {
    const pool = makePool(16);
    const seen = new Set<Bullet>();
    for (let i = 0; i < 16; i += 1) seen.add(pool.acquire());
    expect(seen.size).toBe(16);
  });

  it('release_하면_reset_이_불리고_재사용된다', () => {
    const pool = makePool(4);
    const a = pool.acquire();
    a.x = 999;
    a.alive = true;

    pool.release(a);
    expect(a.alive).toBe(false);
    expect(a.x).toBe(0);
    expect(pool.activeCount).toBe(0);

    const b = pool.acquire();
    expect(b).toBe(a); // 같은 객체가 돌아온다
  });

  it('활성_구간이_항상_조밀하다', () => {
    // items[0, activeCount) 순회가 유효해야 시스템이 매 프레임 돌 수 있다
    const pool = makePool(8);
    const acquired: Bullet[] = [];
    for (let i = 0; i < 8; i += 1) acquired.push(pool.acquire());

    // 가운데를 골라 반납
    pool.release(acquired[3] as Bullet);
    pool.release(acquired[1] as Bullet);
    pool.release(acquired[6] as Bullet);

    expect(pool.activeCount).toBe(5);
    for (let i = 0; i < pool.activeCount; i += 1) {
      const item = pool.items[i] as Bullet;
      expect(item.poolIndex).toBe(i);
    }
  });

  it('고갈되면_예외_대신_가장_오래된_것을_회수한다', () => {
    // DoD: 풀 고갈 상황에서 크래시 없이 동작한다
    const pool = makePool(3);
    const first = pool.acquire();
    pool.acquire();
    pool.acquire();
    expect(pool.activeCount).toBe(3);

    const extra = pool.acquire(); // 고갈

    expect(pool.activeCount).toBe(3);
    expect(pool.recycles).toBe(1);
    expect(extra).toBe(first); // 가장 먼저 얻었던 것이 돌아왔다
  });

  it('고갈이_반복돼도_용량을_넘지_않는다', () => {
    const pool = makePool(4);
    for (let i = 0; i < 100; i += 1) pool.acquire();

    expect(pool.activeCount).toBe(4);
    expect(pool.allocations).toBe(4);
    expect(pool.recycles).toBe(96);
  });

  it('이중_반납을_무시한다', () => {
    const pool = makePool(4);
    const a = pool.acquire();
    pool.release(a);
    pool.release(a); // 두 번째는 조용히 무시
    expect(pool.activeCount).toBe(0);

    pool.acquire();
    expect(pool.activeCount).toBe(1);
  });

  it('다른_풀의_객체를_반납해도_망가지지_않는다', () => {
    const a = makePool(4);
    const b = makePool(4);
    const item = b.acquire();

    a.acquire();
    a.release(item as Bullet);

    expect(a.activeCount).toBe(1);
    expect(b.activeCount).toBe(1);
  });

  it('releaseAll_이_전부_비운다', () => {
    const pool = makePool(8);
    for (let i = 0; i < 8; i += 1) pool.acquire();
    pool.releaseAll();

    expect(pool.activeCount).toBe(0);
    for (const item of pool.items) expect(item.poolIndex).toBe(-1);
  });

  it('resetFrameStats_가_recycles_를_되돌린다', () => {
    const pool = makePool(2);
    for (let i = 0; i < 5; i += 1) pool.acquire();
    expect(pool.recycles).toBeGreaterThan(0);

    pool.resetFrameStats();
    expect(pool.recycles).toBe(0);
  });

  it('적_300체_투사체_200개_시나리오에서_런타임_할당이_0이다', () => {
    // DoD: pool alloc = 0
    const enemies = makePool(300);
    const bullets = makePool(200);
    const before = enemies.allocations + bullets.allocations;

    // 60초 분량: 매 프레임 일부를 죽이고 다시 스폰
    for (let frame = 0; frame < 3600; frame += 1) {
      while (enemies.activeCount < 300) enemies.acquire();
      while (bullets.activeCount < 200) bullets.acquire();

      for (let i = 0; i < 5 && enemies.activeCount > 0; i += 1) {
        enemies.release(enemies.items[0] as Bullet);
      }
      for (let i = 0; i < 20 && bullets.activeCount > 0; i += 1) {
        bullets.release(bullets.items[0] as Bullet);
      }
    }

    expect(enemies.allocations + bullets.allocations).toBe(before);
    expect(enemies.recycles).toBe(0);
    expect(bullets.recycles).toBe(0);
  });
});
