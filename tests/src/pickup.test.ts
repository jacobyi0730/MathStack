import { describe, expect, it } from 'vitest';
import {
  createPickupPool,
  isInstantPickup,
  MAX_ACTIVE_PICKUPS,
  PICKUPS,
} from '../../src/entities/pickup.js';
import { createPlayer } from '../../src/entities/player.js';
import {
  BOOSTED_PICKUP_MAGNET_RADIUS,
  createPickupRuntime,
  resolveHasteCooldownMultiplier,
  resolveXpGemKind,
  spawnPickupByKind,
  spawnXpGem,
  updatePickups,
} from '../../src/systems/pickup.js';
import { createLevelState } from '../../src/systems/level.js';

describe('pickup system', () => {
  it('defines_three_proton_shard_values', () => {
    expect(PICKUPS['proton-small'].xp).toBe(1);
    expect(PICKUPS['proton-medium'].xp).toBe(5);
    expect(PICKUPS['proton-large'].xp).toBe(20);
  });

  it('separates_xp_shards_from_instant_items', () => {
    expect(isInstantPickup('proton-small')).toBe(false);
    expect(isInstantPickup('heal')).toBe(true);
    expect(isInstantPickup('magnet')).toBe(true);
    expect(isInstantPickup('meteor')).toBe(true);
    expect(isInstantPickup('clock')).toBe(true);
    expect(isInstantPickup('flare')).toBe(true);
    expect(isInstantPickup('shield')).toBe(true);
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

  it('drops_one_gem_per_kill_and_sizes_it_by_xp', () => {
    const pool = createPickupPool(8);

    expect(resolveXpGemKind(1)).toBe('proton-small');
    expect(resolveXpGemKind(5)).toBe('proton-medium');
    expect(resolveXpGemKind(20)).toBe('proton-large');

    const gem = spawnXpGem(pool, 7, 40, -12);

    expect(pool.activeCount).toBe(1);
    expect(gem?.pickupKind).toBe('proton-medium');
    expect(gem?.xp).toBe(7);
    expect(gem?.x).toBe(40);
    expect(gem?.y).toBe(-12);
    expect(spawnXpGem(pool, 0, 0, 0)).toBeUndefined();
    expect(pool.activeCount).toBe(1);
  });

  it('pulls_pickups_inside_magnet_range_and_collects_xp', () => {
    const pool = createPickupPool(4);
    const player = createPlayer('actinium');
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
    const player = createPlayer('actinium');
    const level = createLevelState();
    const runtime = createPickupRuntime();
    player.health = 20;

    spawnPickupByKind(pool, 'heal', 0, 0);
    spawnPickupByKind(pool, 'magnet', 0, 0);
    spawnPickupByKind(pool, 'meteor', 0, 0);

    expect(updatePickups(pool, player, level, runtime, 0.016)).toBe(3);
    expect(player.health).toBe(20 + PICKUPS.heal.heal);
    expect(runtime.magnetBoostSec).toBeGreaterThan(0);
    expect(runtime.pendingMeteorDamage).toBe(PICKUPS.meteor.meteorDamage);
  });

  it('applies_clock_flare_and_shield_rewards_on_collection', () => {
    const pool = createPickupPool(4);
    const player = createPlayer('actinium');
    const level = createLevelState();
    const runtime = createPickupRuntime();

    spawnPickupByKind(pool, 'clock', 0, 0);
    spawnPickupByKind(pool, 'flare', 0, 0);
    spawnPickupByKind(pool, 'shield', 0, 0);

    expect(updatePickups(pool, player, level, runtime, 0.016)).toBe(3);
    expect(runtime.freezeSec).toBe(PICKUPS.clock.freezeSec);
    expect(runtime.hasteSec).toBe(PICKUPS.flare.hasteSec);
    expect(resolveHasteCooldownMultiplier(runtime)).toBeLessThan(1);
    expect(player.invulnerableSec).toBe(PICKUPS.shield.shieldSec);
  });

  it('lets_effect_timers_expire', () => {
    const pool = createPickupPool(4);
    const player = createPlayer('actinium');
    const level = createLevelState();
    const runtime = createPickupRuntime();
    runtime.freezeSec = 0.2;
    runtime.hasteSec = 0.2;

    updatePickups(pool, player, level, runtime, 1);

    expect(runtime.freezeSec).toBe(0);
    expect(runtime.hasteSec).toBe(0);
    expect(resolveHasteCooldownMultiplier(runtime)).toBe(1);
  });

  it('magnet_sweeps_every_shard_left_on_the_field', () => {
    const pool = createPickupPool(8);
    const player = createPlayer('actinium');
    const level = createLevelState();
    const runtime = createPickupRuntime();

    spawnXpGem(pool, 4, 4000, 4000);
    spawnXpGem(pool, 3, -4000, -4000);
    spawnPickupByKind(pool, 'magnet', 0, 0);

    expect(updatePickups(pool, player, level, runtime, 0.016)).toBe(3);
    expect(pool.activeCount).toBe(0);
    expect(level.totalXp).toBe(7);
  });

  it('uses_boosted_magnet_range_after_magnet_collection', () => {
    const pool = createPickupPool(4);
    const player = createPlayer('actinium');
    const level = createLevelState();
    const runtime = createPickupRuntime();
    runtime.magnetBoostSec = 1;
    spawnPickupByKind(pool, 'proton-small', BOOSTED_PICKUP_MAGNET_RADIUS - 20, 0);

    updatePickups(pool, player, level, runtime, 0.1);

    expect(pool.items[0].x).toBeLessThan(BOOSTED_PICKUP_MAGNET_RADIUS - 20);
  });
});

