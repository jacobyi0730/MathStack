import { describe, expect, it } from 'vitest';
import { createProjectilePool, spawnProjectile, updateProjectileMotion } from '../../src/entities/projectile.js';

describe('projectile', () => {
  it('projectile_pool_preallocates_200_and_reuses_without_extra_allocation', () => {
    const pool = createProjectilePool(200);
    const before = pool.allocations;

    for (let i = 0; i < 200; i += 1) {
      const projectile = pool.acquire();
      spawnProjectile(projectile, 'hydrogen_arrow', 0, 0, 1, 0, 10, 1);
    }

    expect(pool.activeCount).toBe(200);
    expect(pool.allocations).toBe(before);

    pool.release(pool.items[25]);
    const reused = pool.acquire();

    expect(pool.activeCount).toBe(200);
    expect(pool.allocations).toBe(before);
    expect(reused.poolIndex).toBe(199);
  });

  it('projectile_motion_releases_expired_and_out_of_bounds_projectiles', () => {
    const pool = createProjectilePool(4);
    const expired = pool.acquire();
    spawnProjectile(expired, 'hydrogen_arrow', 0, 0, 1, 0, 10, 1);
    expired.lifeSec = 0.01;

    const outside = pool.acquire();
    spawnProjectile(outside, 'hydrogen_arrow', 99, 0, 1, 0, 10, 1);

    updateProjectileMotion(pool, 0.1, { minX: -100, maxX: 100, minY: -100, maxY: 100 });

    expect(expired.active).toBe(false);
    expect(outside.active).toBe(false);
    expect(pool.activeCount).toBe(0);
  });
});
