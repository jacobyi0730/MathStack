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
  it('contact_damage_applies_a_visible_hit_once_per_invulnerability_window', () => {
    const player = createPlayer('hydrogen');

    const dealt = applyContactDamage(player, 10);

    expect(dealt).toBe(10);
    expect(player.health).toBe(player.maxHealth - 10);
    expect(player.invulnerableSec).toBe(PLAYER_HIT_INVULNERABLE_SEC);
  });

  it('player_invulnerability_blocks_repeated_contact_hits', () => {
    const player = createPlayer('hydrogen');

    applyContactDamage(player, 10);
    applyContactDamage(player, 10);

    expect(player.health).toBe(player.maxHealth - 10);

    updatePlayerInvulnerability(player, 0.5);
    applyContactDamage(player, 10);

    expect(player.health).toBe(player.maxHealth - 20);
  });

  it('dead_enemy_drops_its_xp_gem_where_it_died', () => {
    const state = createGameState();
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, 120, -80, 3);

    const killed = applyEnemyDamage(state, enemy, 3);

    expect(killed).toBe(true);
    expect(state.damageNumbers.activeCount).toBe(1);
    expect(state.damageNumbers.items[0].value).toBe(3);
    expect(state.enemies.activeCount).toBe(0);
    expect(enemy.active).toBe(false);
    expect(state.pickups.activeCount).toBe(1);
    expect(state.pickups.items[0].xp).toBe(ENEMIES.radon.xp);
    expect(state.pickups.items[0].x).toBe(120);
    expect(state.pickups.items[0].y).toBe(-80);
    expect(state.combat.defeatedEnemies).toBe(1);
  });

  it('enemy_damage_uses_enemy_defeat_rules_for_split_and_heal_rewards', () => {
    const state = createGameState();
    state.player.health = 40;
    const uranium = state.enemies.acquire();
    spawnEnemy(uranium, ENEMIES.uranium, 0, 0, 3);

    expect(applyEnemyDamage(state, uranium, 3)).toBe(true);
    expect(state.enemies.activeCount).toBe(2);
    expect(state.pickups.activeCount).toBe(0);

    const iodine = state.enemies.acquire();
    spawnEnemy(iodine, ENEMIES.iodine, 30, 40, 1);

    expect(applyEnemyDamage(state, iodine, 1)).toBe(true);
    // 회복은 즉시 들어오지 않는다. 죽은 자리에 아이오딘 방울이 떨어질 뿐이다
    expect(state.player.health).toBe(40);
    expect(state.pickups.activeCount).toBe(1);
    expect(state.pickups.items[0].pickupKind).toBe('heal');
    expect(state.pickups.items[0].x).toBe(30);
    expect(state.combat.defeatedEnemies).toBe(1);
  });
});
