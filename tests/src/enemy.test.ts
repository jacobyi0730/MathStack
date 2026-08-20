import { describe, expect, it } from 'vitest';
import { ENEMIES, MAX_ACTIVE_ENEMIES } from '../../src/data/enemies.js';
import { createEnemyPool, spawnEnemy } from '../../src/entities/enemy.js';

describe('적 엔티티', () => {
  it('라돈 유령 데이터가 기획서 수치와 일치한다', () => {
    const radon = ENEMIES.radon;

    expect(radon.element).toBe('Rn');
    expect(radon.atomicNumber).toBe(86);
    expect(radon.hp).toBe(20);
    expect(radon.speed).toBe(40);
    expect(radon.contactDamage).toBe(4);
    expect(radon.xp).toBe(1);
    expect(radon.ai).toBe('chase');
  });

  it('적은 고정 용량 풀에서 재사용된다', () => {
    const pool = createEnemyPool();
    const before = pool.allocations;

    for (let i = 0; i < MAX_ACTIVE_ENEMIES; i += 1) {
      const enemy = pool.acquire();
      spawnEnemy(enemy, ENEMIES.radon, i, 0, ENEMIES.radon.hp);
    }

    expect(pool.activeCount).toBe(MAX_ACTIVE_ENEMIES);
    expect(pool.allocations).toBe(before);
    expect(pool.recycles).toBe(0);
  });
});
