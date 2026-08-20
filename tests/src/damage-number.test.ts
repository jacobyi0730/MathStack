import { describe, expect, it } from 'vitest';
import {
  createDamageNumberPool,
  spawnDamageNumber,
  updateDamageNumbers,
} from '../../src/entities/damage-number.js';

describe('damage numbers', () => {
  it('spawns_rounded_floating_damage_numbers_and_reuses_pool_slots', () => {
    const pool = createDamageNumberPool(2);

    spawnDamageNumber(pool, 10, 20, 9.6);
    spawnDamageNumber(pool, 30, 40, 3.2);
    spawnDamageNumber(pool, 50, 60, 7.8);

    expect(pool.activeCount).toBe(2);
    expect(pool.items[0]).toMatchObject({
      active: true,
      x: 50,
      value: 8,
    });
  });

  it('expires_after_lifetime', () => {
    const pool = createDamageNumberPool(1);
    spawnDamageNumber(pool, 0, 0, 10);

    updateDamageNumbers(pool, 1);

    expect(pool.activeCount).toBe(0);
    expect(pool.items[0].active).toBe(false);
  });
});
