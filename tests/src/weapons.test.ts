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
    const closest = findClosestEnemy(0, 0, 200, state.collision.enemyHash, candidates);

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
});
