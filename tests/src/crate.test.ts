import { describe, expect, it } from 'vitest';
import {
  CRATES,
  CRATE_HP,
  CRATE_SPAWN_INTERVAL_SEC,
  MAX_ACTIVE_CRATES,
  chooseCrateDropKind,
  chooseCrateId,
} from '../../src/data/crates.js';
import { createGameState } from '../../src/engine/state.js';
import { spawnCrate } from '../../src/entities/crate.js';
import { isInstantPickup } from '../../src/entities/pickup.js';
import { spawnProjectile } from '../../src/entities/projectile.js';
import { breakCrates, spawnCratesOverTime, updateCrates } from '../../src/systems/crate.js';

describe('crate system', () => {
  it('gives_every_lamp_one_hp_so_a_single_touch_breaks_it', () => {
    for (const id of Object.keys(CRATES) as Array<keyof typeof CRATES>) {
      expect(CRATES[id].hp).toBe(CRATE_HP);
      expect(CRATE_HP).toBe(1);
    }
  });

  it('spawns_lamps_on_a_timer_and_stops_at_the_cap', () => {
    const state = createGameState();

    spawnCratesOverTime(state, CRATE_SPAWN_INTERVAL_SEC);
    expect(state.crates.activeCount).toBe(1);

    spawnCratesOverTime(state, CRATE_SPAWN_INTERVAL_SEC * 20);
    expect(state.crates.activeCount).toBe(MAX_ACTIVE_CRATES);
  });

  it('keeps_spawned_lamps_away_from_the_player', () => {
    const state = createGameState();

    spawnCratesOverTime(state, CRATE_SPAWN_INTERVAL_SEC * 6);

    for (let i = 0; i < state.crates.activeCount; i += 1) {
      const crate = state.crates.items[i];
      const dx = crate.x - state.player.x;
      const dy = crate.y - state.player.y;
      expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThan(state.player.radius + crate.radius);
    }
  });

  it('breaks_on_player_contact_and_drops_instant_items', () => {
    const state = createGameState();
    const crate = state.crates.acquire();
    spawnCrate(crate, CRATES.neon, state.player.x + 10, state.player.y);

    expect(breakCrates(state)).toBe(1);
    expect(state.crates.activeCount).toBe(0);
    expect(state.pickups.activeCount).toBe(CRATES.neon.dropCount);

    for (let i = 0; i < state.pickups.activeCount; i += 1) {
      const pickup = state.pickups.items[i];
      expect(isInstantPickup(pickup.pickupKind)).toBe(true);
      expect(pickup.xp).toBe(0);
    }
  });

  it('breaks_when_a_projectile_touches_it', () => {
    const state = createGameState();
    const crate = state.crates.acquire();
    spawnCrate(crate, CRATES.xenon, state.player.x + 600, state.player.y + 600);

    expect(breakCrates(state)).toBe(0);
    expect(state.crates.activeCount).toBe(1);

    const projectile = state.weapons.projectiles.acquire();
    spawnProjectile(projectile, 'hydrogen_arrow', crate.x, crate.y, 1, 0, 10, 1);

    expect(breakCrates(state)).toBe(1);
    expect(state.pickups.activeCount).toBe(CRATES.xenon.dropCount);
  });

  it('spreads_multi_item_drops_so_they_do_not_stack', () => {
    const state = createGameState();
    const crate = state.crates.acquire();
    spawnCrate(crate, CRATES.krypton, state.player.x + 10, state.player.y);

    breakCrates(state);

    expect(state.pickups.activeCount).toBe(2);
    const first = state.pickups.items[0];
    const second = state.pickups.items[1];
    expect(first.x === second.x && first.y === second.y).toBe(false);
  });

  it('picks_common_lamps_first_and_rare_lamps_last', () => {
    expect(chooseCrateId(0)).toBe('neon');
    expect(chooseCrateId(0.99)).toBe('xenon');
  });

  it('rolls_the_drop_table_from_rare_to_common_and_luck_shifts_it', () => {
    expect(chooseCrateDropKind(0, 1)).toBe('shield');
    expect(chooseCrateDropKind(0.99, 1)).toBe('heal');
    // 행운이 4배면 굴림 범위가 1/4로 줄어 표의 희귀한 앞쪽에만 걸린다
    expect(chooseCrateDropKind(0.99, 4)).toBe('clock');
  });

  it('costs_nothing_while_no_lamp_is_on_the_field', () => {
    const state = createGameState();

    expect(breakCrates(state)).toBe(0);

    updateCrates(state, CRATE_SPAWN_INTERVAL_SEC * 0.5);
    expect(state.crates.activeCount).toBe(0);
  });
});
