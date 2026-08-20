import { describe, expect, it } from 'vitest';
import { PASSIVES } from '../../src/data/passives.js';
import {
  createPassiveRuntime,
  equipPassive,
  hasPassiveAtLevel,
  recalcStats,
  resolvePassiveValue,
  type BasePlayerStats,
} from '../../src/systems/stats.js';

const BASE_STATS = {
  maxHealth: 100,
  moveSpeed: 260,
  projectileCount: 1,
  attackPowerMultiplier: 1,
  attackRangeMultiplier: 1,
  cooldownMultiplier: 1,
  magnetRadius: 96,
  healthRegenPerSec: 0,
  luck: 1,
} as const satisfies BasePlayerStats;

describe('stats', () => {
  it('passive_slots_equip_and_level_to_three', () => {
    const runtime = createPassiveRuntime();

    expect(runtime.slots).toHaveLength(6);
    for (let i = 0; i < 4; i += 1) expect(equipPassive(runtime, 'silicon')).toBe(true);

    expect(runtime.slots[0]).toEqual({ id: 'silicon', level: 3 });
    expect(hasPassiveAtLevel(runtime, 'silicon', 3)).toBe(true);
  });

  it('passive_slots_reject_new_passive_when_full', () => {
    const runtime = createPassiveRuntime();

    expect(equipPassive(runtime, 'neodymium')).toBe(true);
    expect(equipPassive(runtime, 'silicon')).toBe(true);
    expect(equipPassive(runtime, 'helium')).toBe(true);
    expect(equipPassive(runtime, 'chlorine')).toBe(true);
    expect(equipPassive(runtime, 'krypton')).toBe(true);
    expect(equipPassive(runtime, 'calcium')).toBe(true);

    expect(equipPassive(runtime, 'silver')).toBe(false);
  });

  it('recalc_stats_applies_base_times_sum_ratio_order', () => {
    const runtime = createPassiveRuntime();
    equipPassive(runtime, 'silicon');
    equipPassive(runtime, 'silicon');
    equipPassive(runtime, 'helium');
    equipPassive(runtime, 'chlorine');
    equipPassive(runtime, 'krypton');
    equipPassive(runtime, 'neodymium');
    equipPassive(runtime, 'silver');

    const stats = recalcStats(BASE_STATS, runtime);

    expect(stats.attackPowerMultiplier).toBeCloseTo(1.24);
    expect(stats.moveSpeed).toBeCloseTo(286);
    expect(stats.cooldownMultiplier).toBeCloseTo(0.92);
    expect(stats.attackRangeMultiplier).toBeCloseTo(1.15);
    expect(stats.magnetRadius).toBeCloseTo(120);
    expect(stats.luck).toBeCloseTo(1.15);
  });

  it('calcium_adds_max_health_and_regen_as_derived_stats', () => {
    const runtime = createPassiveRuntime();
    equipPassive(runtime, 'calcium');
    equipPassive(runtime, 'calcium');
    equipPassive(runtime, 'calcium');

    const stats = recalcStats(BASE_STATS, runtime);

    expect(stats.maxHealth).toBe(160);
    expect(stats.maxHealthBonus).toBe(60);
    expect(stats.healthRegenPerSec).toBeCloseTo(0.9);
    expect(stats.healthRegenBonusPerSec).toBeCloseTo(0.9);
  });

  it('nickel_only_adds_projectile_count_at_level_two_and_three', () => {
    const runtime = createPassiveRuntime();

    equipPassive(runtime, 'nickel');
    expect(recalcStats(BASE_STATS, runtime).projectileCount).toBe(1);
    expect(resolvePassiveValue(PASSIVES.nickel, 1)).toBe(0);

    equipPassive(runtime, 'nickel');
    expect(recalcStats(BASE_STATS, runtime).projectileCount).toBe(2);
    expect(resolvePassiveValue(PASSIVES.nickel, 2)).toBe(1);

    equipPassive(runtime, 'nickel');
    expect(recalcStats(BASE_STATS, runtime).projectileCount).toBe(2);
    expect(resolvePassiveValue(PASSIVES.nickel, 3)).toBe(1);
  });
});
