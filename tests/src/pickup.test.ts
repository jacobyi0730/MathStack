import { describe, expect, it } from 'vitest';
import { createPickupPool, MAX_ACTIVE_PICKUPS, PICKUPS } from '../../src/entities/pickup.js';
import { createPlayer } from '../../src/entities/player.js';
import {
  BOOSTED_PICKUP_MAGNET_RADIUS,
  consumeCombatRewardsAsPickups,
  createPickupRuntime,
  spawnPickupByKind,
  spawnXpShards,
  updatePickups,
} from '../../src/systems/pickup.js';
import { createLevelState } from '../../src/systems/level.js';

describe('pickup system', () => {
  it('defines_three_proton_shard_values', () => {
    expect(PICKUPS['proton-small'].xp).toBe(1);
    expect(PICKUPS['proton-medium'].xp).toBe(5);
    expect(PICKUPS['proton-large'].xp).toBe(20);
  });

  it('reuses_the_fixed_pickup_pool', () => {
    const pool = createPickupPool();
    const before = pool.allocations;

    for (let i = 0; i < MAX_ACTIVE_PICKUPS; i += 1) {
      spawnPickupByKind(pool, 'proton-small', i, 0);
    }

    expect(pool.activeCount).toBe(MAX_ACTIVE_PICKUPS);
    expect(pool.allocations).toBe(before);
  });

  it('pulls_pickups_inside_magnet_range_and_collects_xp', () => {
    const pool = createPickupPool(4);
    const player = createPlayer('hydrogen');
    const level = createLevelState();
    const runtime = createPickupRuntime();
    spawnPickupByKind(pool, 'proton-medium', 80, 0);

    updatePickups(pool, player, level, runtime, 0.1);
    expect(pool.items[0].x).toBeLessThan(80);

    updatePickups(pool, player, level, runtime, 1);
    expect(pool.activeCount).toBe(0);
    expect(level.totalXp).toBe(5);
  });

  it('applies_heal_magnet_and_meteor_rewards_on_collection', () => {
    const pool = createPickupPool(4);
    const player = createPlayer('hydrogen');
    const level = createLevelState();
    const runtime = createPickupRuntime();
    player.health = 20;

    spawnPickupByKind(pool, 'heal', 0, 0);
    spawnPickupByKind(pool, 'magnet', 0, 0);
    spawnPickupByKind(pool, 'meteor', 0, 0);

    expect(updatePickups(pool, player, level, runtime, 0.016)).toBe(3);
    expect(player.health).toBe(50);
    expect(runtime.magnetBoostSec).toBe(PICKUPS.magnet.magnetSec);
    expect(runtime.pendingMeteorDamage).toBe(PICKUPS.meteor.meteorDamage);
  });

  it('uses_boosted_magnet_range_after_magnet_collection', () => {
    const pool = createPickupPool(4);
    const player = createPlayer('hydrogen');
    const level = createLevelState();
    const runtime = createPickupRuntime();
    runtime.magnetBoostSec = 1;
    spawnPickupByKind(pool, 'proton-small', BOOSTED_PICKUP_MAGNET_RADIUS - 20, 0);

    updatePickups(pool, player, level, runtime, 0.1);

    expect(pool.items[0].x).toBeLessThan(BOOSTED_PICKUP_MAGNET_RADIUS - 20);
  });

  it('converts_pending_combat_rewards_into_xp_shards', () => {
    const pool = createPickupPool(8);
    const combat = { pendingXp: 26, pendingShards: 0 };

    expect(consumeCombatRewardsAsPickups(combat, pool, 4, 8)).toBe(3);
    expect(combat.pendingXp).toBe(0);
    expect(pool.activeCount).toBe(3);
    expect(pool.items[0].pickupKind).toBe('proton-large');
    expect(pool.items[1].pickupKind).toBe('proton-medium');
    expect(pool.items[2].pickupKind).toBe('proton-small');
  });

  it('spawns_large_medium_small_shards_for_xp_amounts', () => {
    const pool = createPickupPool(8);

    expect(spawnXpShards(pool, 46, 0, 0)).toBe(4);
    expect(pool.items[0].xp + pool.items[1].xp + pool.items[2].xp + pool.items[3].xp + pool.items[4].xp).toBe(
      46,
    );
  });
});
