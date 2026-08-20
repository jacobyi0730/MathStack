import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies.js';
import { createGameState } from '../../src/engine/state.js';
import { spawnEnemy } from '../../src/entities/enemy.js';
import { createPlayer } from '../../src/entities/player.js';
import {
  PLAYER_HIT_INVULNERABLE_SEC,
  applyContactDamage,
  applyEnemyDamage,
  updatePlayerInvulnerability,
} from '../../src/systems/damage.js';

describe('damage', () => {
  it('contact_damage_uses_damage_per_second_and_dt', () => {
    const player = createPlayer('hydrogen');

    const dealt = applyContactDamage(player, 10, 0.25);

    expect(dealt).toBe(2.5);
    expect(player.health).toBe(player.maxHealth - 2.5);
    expect(player.invulnerableSec).toBe(PLAYER_HIT_INVULNERABLE_SEC);
  });

  it('player_invulnerability_blocks_repeated_contact_hits', () => {
    const player = createPlayer('hydrogen');

    applyContactDamage(player, 10, 0.1);
    applyContactDamage(player, 10, 0.1);

    expect(player.health).toBe(player.maxHealth - 1);

    updatePlayerInvulnerability(player, 0.5);
    applyContactDamage(player, 10, 0.1);

    expect(player.health).toBe(player.maxHealth - 2);
  });

  it('dead_enemy_returns_to_pool_and_queues_future_rewards', () => {
    const state = createGameState();
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, 0, 0, 3);

    const killed = applyEnemyDamage(state, enemy, 3);

    expect(killed).toBe(true);
    expect(state.damageNumbers.activeCount).toBe(1);
    expect(state.damageNumbers.items[0].value).toBe(3);
    expect(state.enemies.activeCount).toBe(0);
    expect(enemy.active).toBe(false);
    expect(state.combat.pendingXp).toBe(ENEMIES.radon.xp);
    expect(state.combat.defeatedEnemies).toBe(1);
  });

  it('enemy_damage_uses_enemy_defeat_rules_for_split_and_heal_rewards', () => {
    const state = createGameState();
    state.player.health = 40;
    const uranium = state.enemies.acquire();
    spawnEnemy(uranium, ENEMIES.uranium, 0, 0, 3);

    expect(applyEnemyDamage(state, uranium, 3)).toBe(true);
    expect(state.enemies.activeCount).toBe(2);
    expect(state.combat.pendingXp).toBe(0);

    const iodine = state.enemies.acquire();
    spawnEnemy(iodine, ENEMIES.iodine, 0, 0, 1);

    expect(applyEnemyDamage(state, iodine, 1)).toBe(true);
    expect(state.player.health).toBe(90);
    expect(state.combat.defeatedEnemies).toBe(1);
  });
});
