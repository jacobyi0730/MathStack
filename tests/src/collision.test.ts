import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies.js';
import { createGameState } from '../../src/engine/state.js';
import { spawnEnemy } from '../../src/entities/enemy.js';
import { damagePlayerEnemyContacts, findEnemyHit, rebuildEnemyHash } from '../../src/systems/collision.js';

describe('collision', () => {
  it('player_enemy_contact_applies_damage_once_during_invulnerability', () => {
    const state = createGameState();
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, state.player.x + state.player.radius, state.player.y, 20);

    rebuildEnemyHash(state);
    const contacts = damagePlayerEnemyContacts(state, 0.25);

    expect(contacts).toBe(1);
    expect(state.collision.playerEnemyContacts).toBe(1);
    expect(state.player.health).toBeCloseTo(state.player.maxHealth - ENEMIES.radon.contactDamage);

    damagePlayerEnemyContacts(state, 0.25);

    expect(state.player.health).toBeCloseTo(state.player.maxHealth - ENEMIES.radon.contactDamage);
  });

  it('nearby_query_reduces_candidates_below_full_enemy_count', () => {
    const state = createGameState();

    for (let i = 0; i < 299; i += 1) {
      const enemy = state.enemies.acquire();
      spawnEnemy(enemy, ENEMIES.radon, 1000 + i * 40, 1000, 20);
    }

    const close = state.enemies.acquire();
    spawnEnemy(close, ENEMIES.radon, state.player.x + 4, state.player.y, 20);

    rebuildEnemyHash(state);
    const candidates = state.collision.enemyHash.queryNearby(
      state.player.x,
      state.player.y,
      state.player.radius,
      state.collision.enemyCandidates,
    );

    expect(candidates).toBeLessThan(state.enemies.activeCount / 10);
    expect(damagePlayerEnemyContacts(state, 1 / 60)).toBe(1);
  });

  it('projectile_sized_circle_can_find_enemy_hit_without_new_result_arrays', () => {
    const state = createGameState();
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, 64, 0, 20);

    rebuildEnemyHash(state);

    expect(findEnemyHit(state, 64 + enemy.radius + 3, 0, 4)).toBe(enemy);
    expect(findEnemyHit(state, 64 + enemy.radius + 12, 0, 4)).toBeUndefined();
  });
});
