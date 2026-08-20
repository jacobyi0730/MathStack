import { describe, expect, it } from 'vitest';
import { WEAPON_MAX_LEVEL, WEAPON_SLOT_CAPACITY } from '../../src/data/weapons.js';
import { createGameState } from '../../src/engine/state.js';
import {
  assessBundleGzipBudget,
  BANK_GZIP_BUDGET_BYTES,
  createEmptyStressSnapshot,
  GAME_BUNDLE_GZIP_BUDGET_BYTES,
  setupStressMode,
  STRESS_ENEMY_COUNT,
  STRESS_PROJECTILE_COUNT,
  stressModeEnabled,
  writeStressSnapshot,
  writeStressWeaponSignals,
  type StressWeaponSlotSignal,
} from '../../src/engine/stress.js';

describe('stress mode', () => {
  it('reads_the_stress_query_param_explicitly', () => {
    expect(stressModeEnabled('?stress=1')).toBe(true);
    expect(stressModeEnabled('?debug=1&stress=1')).toBe(true);
    expect(stressModeEnabled('?stress=0')).toBe(false);
    expect(stressModeEnabled('?debug=1')).toBe(false);
  });

  it('sets_up_the_worst_case_entity_preset_without_pool_churn', () => {
    const state = createGameState();
    const result = setupStressMode(state);

    expect(result).toMatchObject({
      enemies: STRESS_ENEMY_COUNT,
      projectiles: STRESS_PROJECTILE_COUNT,
      bosses: 3,
      maxedWeaponSlots: WEAPON_SLOT_CAPACITY,
      awakenedWeaponSlots: WEAPON_SLOT_CAPACITY,
      finalBossPhase: 3,
    });
    expect(state.enemies.activeCount).toBe(STRESS_ENEMY_COUNT);
    expect(state.weapons.projectiles.activeCount).toBe(STRESS_PROJECTILE_COUNT);
    expect(state.bosses.activeCount).toBe(3);
    expect(state.entityCount).toBe(STRESS_ENEMY_COUNT + STRESS_PROJECTILE_COUNT + 3 + 1);
    expect(state.enemies.recycles).toBe(0);
    expect(state.weapons.projectiles.recycles).toBe(0);
    expect(state.pickups.recycles).toBe(0);
    expect(state.bosses.recycles).toBe(0);
  });

  it('marks_six_weapon_slots_as_max_level_and_evolution_ready', () => {
    const state = createGameState();
    setupStressMode(state);

    const signals = new Array<StressWeaponSlotSignal>(WEAPON_SLOT_CAPACITY);
    const count = writeStressWeaponSignals(signals, state);

    expect(count).toBe(WEAPON_SLOT_CAPACITY);
    for (let i = 0; i < count; i += 1) {
      expect(signals[i]).toMatchObject({
        level: WEAPON_MAX_LEVEL,
        evolutionReady: true,
        awakenedSignal: true,
      });
    }
    expect(new Set(signals.slice(0, count).map((signal) => signal.id)).size).toBe(WEAPON_SLOT_CAPACITY);
  });

  it('writes_reusable_measurement_snapshots_for_the_debug_overlay', () => {
    const state = createGameState();
    setupStressMode(state);
    const out = createEmptyStressSnapshot();

    writeStressSnapshot(
      out,
      {
        fps: 60,
        frameMs: 16,
        sim: 5,
        collide: 4,
        render: 3,
        stepsPerSec: 60,
        entities: state.entityCount,
        poolAlloc: 0,
      },
      state,
    );

    expect(out).toMatchObject({
      frameMs: 16,
      simMs: 5,
      collideMs: 4,
      renderMs: 3,
      entities: state.entityCount,
      poolAlloc: 0,
      pool: {
        enemies: 0,
        projectiles: 0,
        pickups: 0,
        bosses: 0,
        total: 0,
      },
    });
  });

  it('checks_gzip_bundle_budgets_from_measured_byte_counts', () => {
    expect(assessBundleGzipBudget(99 * 1024)).toMatchObject({
      budgetBytes: GAME_BUNDLE_GZIP_BUDGET_BYTES,
      withinBudget: true,
      remainingBytes: 1024,
    });
    expect(assessBundleGzipBudget(151 * 1024, BANK_GZIP_BUDGET_BYTES)).toMatchObject({
      budgetBytes: BANK_GZIP_BUDGET_BYTES,
      withinBudget: false,
      remainingBytes: -1024,
    });
  });
});
