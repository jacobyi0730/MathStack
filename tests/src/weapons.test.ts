import { describe, expect, it } from 'vitest';
import { BOSSES } from '../../src/data/bosses.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { WEAPONS } from '../../src/data/weapons.js';
import { createGameState } from '../../src/engine/state.js';
import { spawnBoss } from '../../src/entities/boss.js';
import { spawnEnemy } from '../../src/entities/enemy.js';
import { spawnProjectile } from '../../src/entities/projectile.js';
import { rebuildEnemyHash } from '../../src/systems/collision.js';
import {
  canEvolveWeapon,
  createWeaponRuntime,
  damageProjectileHits,
  equipWeapon,
  findClosestEnemy,
  resolveWeaponDamage,
  resolveWeaponProjectileCount,
  resolveWeaponRangeMultiplier,
  updateWeaponProjectiles,
  updateWeapons,
} from '../../src/systems/weapons.js';

describe('weapons', () => {
  it('hydrogen_arrow_data_matches_design_values', () => {
    expect(WEAPONS.hydrogen_arrow).toMatchObject({
      id: 'hydrogen_arrow',
      element: 'H',
      atomicNumber: 1,
      damage: 10,
      cooldownSec: 1.2,
      pattern: 'projectile',
    });
  });

  it('early_radon_dies_to_one_base_hydrogen_arrow_for_onboarding_pace', () => {
    expect(ENEMIES.radon.hp).toBeLessThanOrEqual(WEAPONS.hydrogen_arrow.damage);
    expect(ENEMIES.sodium.hp).toBeLessThanOrEqual(WEAPONS.hydrogen_arrow.damage * 3);
  });

  it('all_weapon_data_matches_design_values', () => {
    expect(Object.keys(WEAPONS)).toEqual([
      'hydrogen_arrow',
      'neon_beam',
      'carbon_ring',
      'oxygen_wave',
      'iron_barrier',
      'magnesium_bomb',
      'gold_spiral',
      'boron_shot',
      'heavy_hydrogen_storm',
      'neon_infinite_beam',
      'diamond_orbit',
      'ozone_shockwave',
      'steel_identity_barrier',
      'magnesium_chain_flash',
      'golden_ratio_cycle',
      'boron_infinite_barrage',
    ]);
    expect(WEAPONS.neon_beam).toMatchObject({
      element: 'Ne',
      atomicNumber: 10,
      damage: 14,
      cooldownSec: 2,
      pattern: 'pierce',
    });
    expect(WEAPONS.carbon_ring).toMatchObject({
      element: 'C',
      atomicNumber: 6,
      damage: 8,
      cooldownSec: 0,
      pattern: 'orbit',
    });
    expect(WEAPONS.oxygen_wave).toMatchObject({
      element: 'O',
      atomicNumber: 8,
      damage: 12,
      cooldownSec: 2.5,
      pattern: 'wave',
    });
    expect(WEAPONS.iron_barrier).toMatchObject({
      element: 'Fe',
      atomicNumber: 26,
      damage: 6,
      cooldownSec: 0,
      pattern: 'aura',
    });
    expect(WEAPONS.magnesium_bomb).toMatchObject({
      element: 'Mg',
      atomicNumber: 12,
      damage: 18,
      cooldownSec: 3,
      pattern: 'bomb',
    });
    expect(WEAPONS.gold_spiral).toMatchObject({
      element: 'Au',
      atomicNumber: 79,
      damage: 11,
      cooldownSec: 2.2,
      pattern: 'boomerang',
    });
    expect(WEAPONS.boron_shot).toMatchObject({
      element: 'B',
      atomicNumber: 5,
      damage: 5,
      cooldownSec: 1.8,
      pattern: 'spread',
    });
    expect(WEAPONS.heavy_hydrogen_storm).toMatchObject({
      element: 'D',
      atomicNumber: 1,
      projectileCount: 8,
      evolutionOf: 'hydrogen_arrow',
    });
    expect(WEAPONS.diamond_orbit).toMatchObject({
      element: 'C',
      atomicNumber: 6,
      projectileCount: 6,
      evolutionOf: 'carbon_ring',
    });
    expect(WEAPONS.boron_infinite_barrage).toMatchObject({
      element: 'B',
      atomicNumber: 5,
      projectileCount: 12,
      evolutionOf: 'boron_shot',
    });
  });

  it('weapon_slots_equip_and_level_to_five_for_evolution', () => {
    const runtime = createWeaponRuntime();

    for (let i = 0; i < 5; i += 1) expect(equipWeapon(runtime, 'hydrogen_arrow')).toBe(true);

    const slot = runtime.slots[0];
    expect(runtime.slots).toHaveLength(6);
    expect(slot.id).toBe('hydrogen_arrow');
    expect(slot.level).toBe(5);
    expect(canEvolveWeapon(slot)).toBe(true);

    equipWeapon(runtime, 'hydrogen_arrow');
    expect(slot.level).toBe(5);
  });

  it('weapon_level_growth_applies_damage_projectile_and_range_rules', () => {
    const weapon = WEAPONS.hydrogen_arrow;

    expect(resolveWeaponDamage(weapon, 1, 1)).toBe(10);
    expect(resolveWeaponDamage(weapon, 5, 1)).toBe(18);
    expect(resolveWeaponProjectileCount(2, 1)).toBe(1);
    expect(resolveWeaponProjectileCount(3, 1)).toBe(2);
    expect(resolveWeaponRangeMultiplier(2, 1)).toBe(1);
    expect(resolveWeaponRangeMultiplier(3, 1)).toBe(1.2);
  });

  it('find_closest_enemy_uses_query_candidates', () => {
    const state = createGameState();
    const far = state.enemies.acquire();
    spawnEnemy(far, ENEMIES.radon, 80, 0, 10);
    const near = state.enemies.acquire();
    spawnEnemy(near, ENEMIES.radon, 30, 0, 10);
    rebuildEnemyHash(state);

    const candidates = new Array<typeof near>(300);
    const closest = findClosestEnemy(0, 0, 200, state.collision.enemyHash, candidates, state.world);

    expect(closest).toBe(near);
  });

  it('update_weapons_fires_at_closest_enemy_and_starts_cooldown', () => {
    const state = createGameState();
    state.player.x = 0;
    state.player.y = 0;
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, 100, 0, 20);
    rebuildEnemyHash(state);

    const runtime = createWeaponRuntime();
    equipWeapon(runtime, 'hydrogen_arrow');

    updateWeapons(state, runtime, 1 / 60);

    expect(runtime.projectiles.activeCount).toBe(1);
    expect(runtime.slots[0].cooldownRemainingSec).toBeGreaterThan(1);
    const projectile = runtime.projectiles.items[0];
    expect(projectile.dx).toBeGreaterThan(0);
    expect(projectile.dy).toBe(0);
  });

  it('update_weapons_targets_enemy_across_wrapped_world_edge', () => {
    const state = createGameState();
    state.world = { minX: -100, maxX: 100, minY: -100, maxY: 100 };
    state.player.x = 95;
    state.player.y = 0;
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, -95, 0, 20);
    rebuildEnemyHash(state);

    const runtime = createWeaponRuntime();
    equipWeapon(runtime, 'hydrogen_arrow');

    updateWeapons(state, runtime, 1 / 60);

    expect(runtime.projectiles.activeCount).toBe(1);
    expect(runtime.projectiles.items[0].dx).toBeGreaterThan(0);
  });

  it('update_weapons_keeps_attack_ready_when_no_enemy_is_available', () => {
    const state = createGameState();
    rebuildEnemyHash(state);

    const runtime = createWeaponRuntime();
    equipWeapon(runtime, 'hydrogen_arrow');

    updateWeapons(state, runtime, 1 / 60);

    expect(runtime.projectiles.activeCount).toBe(0);
    expect(runtime.slots[0].cooldownRemainingSec).toBe(0);
  });

  it('projectile_hits_apply_enemy_damage_and_release_projectile', () => {
    const state = createGameState();
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, 20, 0, 10);
    rebuildEnemyHash(state);

    const runtime = createWeaponRuntime();
    const projectile = runtime.projectiles.acquire();
    spawnProjectile(projectile, 'hydrogen_arrow', 20, 0, 0, 0, 10, 1);

    updateWeaponProjectiles(state, runtime, 0);

    expect(runtime.projectiles.activeCount).toBe(0);
    expect(enemy.active).toBe(false);
    expect(state.combat.defeatedEnemies).toBe(1);
  });

  it('projectile_hits_enemy_across_wrapped_world_edge', () => {
    const state = createGameState();
    state.world = { minX: -100, maxX: 100, minY: -100, maxY: 100 };
    state.player.x = 95;
    state.player.y = 0;
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, -95, 0, 10);
    rebuildEnemyHash(state);

    const runtime = createWeaponRuntime();
    const projectile = runtime.projectiles.acquire();
    spawnProjectile(projectile, 'hydrogen_arrow', 95, 0, 1, 0, 10, 1);
    projectile.x = -97;
    projectile.y = 0;

    updateWeaponProjectiles(state, runtime, 0);

    expect(runtime.projectiles.activeCount).toBe(0);
    expect(enemy.active).toBe(false);
  });

  it('update_weapons_targets_and_damages_bosses_when_they_are_closest', () => {
    const state = createGameState();
    const boss = state.bosses.acquire();
    spawnBoss(boss, BOSSES.technetium, 80, 0);
    rebuildEnemyHash(state);

    const runtime = createWeaponRuntime();
    equipWeapon(runtime, 'hydrogen_arrow');

    updateWeapons(state, runtime, 1 / 60);

    expect(runtime.projectiles.activeCount).toBe(1);
    expect(runtime.projectiles.items[0].dx).toBeGreaterThan(0);

    const projectile = runtime.projectiles.items[0];
    projectile.x = boss.x;
    projectile.y = boss.y;
    updateWeaponProjectiles(state, runtime, 0);

    expect(runtime.projectiles.activeCount).toBe(0);
    expect(boss.hp).toBe(BOSSES.technetium.hp - WEAPONS.hydrogen_arrow.damage);
  });

  it('weapon_patterns_spawn_distinct_projectile_modes', () => {
    const state = createGameState();
    state.player.x = 0;
    state.player.y = 0;
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, 100, 0, 200);
    rebuildEnemyHash(state);

    const runtime = createWeaponRuntime();
    equipWeapon(runtime, 'neon_beam');
    equipWeapon(runtime, 'oxygen_wave');
    equipWeapon(runtime, 'magnesium_bomb');
    equipWeapon(runtime, 'gold_spiral');
    equipWeapon(runtime, 'boron_shot');

    updateWeapons(state, runtime, 1 / 60);

    expect(runtime.projectiles.activeCount).toBe(9);
    expect(runtime.projectiles.items[0].weaponId).toBe('neon_beam');
    expect(runtime.projectiles.items[0].hitMode).toBe('pierce');
    expect(runtime.projectiles.items[1].weaponId).toBe('oxygen_wave');
    expect(runtime.projectiles.items[1].hitMode).toBe('area');
    expect(runtime.projectiles.items[2].weaponId).toBe('magnesium_bomb');
    expect(runtime.projectiles.items[2].hitMode).toBe('bomb');
    expect(runtime.projectiles.items[3].weaponId).toBe('gold_spiral');
    expect(runtime.projectiles.items[3].hitMode).toBe('boomerang');
    expect(runtime.projectiles.items[4].weaponId).toBe('boron_shot');
    expect(runtime.projectiles.items[8].weaponId).toBe('boron_shot');
  });

  it('orbit_and_aura_apply_frame_rate_independent_tick_damage', () => {
    const state = createGameState();
    state.player.x = 0;
    state.player.y = 0;
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, 48, 0, 100);
    rebuildEnemyHash(state);

    const runtime = createWeaponRuntime();
    equipWeapon(runtime, 'carbon_ring');
    equipWeapon(runtime, 'iron_barrier');

    updateWeapons(state, runtime, 1 / 60);
    expect(runtime.projectiles.activeCount).toBe(4);

    damageProjectileHits(state, runtime.projectiles, 0.5);

    expect(enemy.hp).toBe(100 - WEAPONS.carbon_ring.damage * 0.5 - WEAPONS.iron_barrier.damage * 0.5);
  });
});
