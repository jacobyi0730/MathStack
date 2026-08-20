import { describe, expect, it } from 'vitest';
import { ENEMIES, MAX_ACTIVE_ENEMIES, type EnemyId } from '../../src/data/enemies.js';
import {
  HP_GROWTH_PER_MIN,
  SPAWN_MIN_PLAYER_DISTANCE,
  WAVES,
  chooseActiveEnemyId,
} from '../../src/data/waves.js';
import { createGameState } from '../../src/engine/state.js';
import { defeatEnemy, spawnWaveEnemy, updateSpawns } from '../../src/systems/spawn.js';

describe('enemy spawning', () => {
  it('spawns enemies outside the player safe ring near the viewport edge', () => {
    const state = createGameState();
    state.viewport.width = 320;
    state.viewport.height = 240;

    const enemy = spawnWaveEnemy(state, 'radon', 0);
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;

    expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(SPAWN_MIN_PLAYER_DISTANCE * SPAWN_MIN_PLAYER_DISTANCE);
    expect(Math.abs(enemy.x)).toBeGreaterThanOrEqual(320 * 0.5);
  });

  it('scales enemy HP from elapsed time', () => {
    const state = createGameState();
    const elapsedMin = 5;
    const enemy = spawnWaveEnemy(state, 'radon', elapsedMin);

    expect(enemy.maxHp).toBe(Math.ceil(ENEMIES.radon.hp * (1 + elapsedMin * HP_GROWTH_PER_MIN)));
  });

  it('increases spawn pressure over time', () => {
    const early = createGameState();
    const late = createGameState();
    late.elapsedSec = 60;

    updateSpawns(early, 0.25);
    updateSpawns(late, 0.25);

    expect(late.spawn.accumulator).toBeGreaterThan(early.spawn.accumulator);
  });

  it('releases the farthest enemy at the 300 enemy cap', () => {
    const state = createGameState();
    state.viewport.width = 320;
    state.viewport.height = 240;

    for (let i = 0; i < MAX_ACTIVE_ENEMIES; i += 1) {
      spawnWaveEnemy(state, 'radon', 0);
    }

    const farthest = state.enemies.items[0];
    farthest.x = 10000;
    farthest.y = 10000;

    spawnWaveEnemy(state, 'radon', 0);

    expect(state.enemies.activeCount).toBe(MAX_ACTIVE_ENEMIES);
    expect(farthest.x).not.toBe(10000);
    expect(state.enemies.recycles).toBe(0);
  });

  it('makes all T-014 enemies eligible after their wave start time', () => {
    const seen = new Set<EnemyId>();
    const activeTotal = WAVES.reduce((total, wave) => total + wave.baseSpawnPerMinute, 0);
    let cursor = 0;

    for (const wave of WAVES) {
      seen.add(chooseActiveEnemyId(270, (cursor + wave.baseSpawnPerMinute * 0.5) / activeTotal));
      cursor += wave.baseSpawnPerMinute;
    }

    expect(seen).toEqual(new Set(Object.keys(ENEMIES) as EnemyId[]));
  });

  it('splits uranium exactly once into two smaller children', () => {
    const state = createGameState();
    const enemy = spawnWaveEnemy(state, 'uranium', 0);
    const originalRadius = enemy.radius;

    defeatEnemy(state, enemy);

    expect(state.enemies.activeCount).toBe(2);
    const left = state.enemies.items[0];
    const right = state.enemies.items[1];
    expect(left.id).toBe('uranium');
    expect(right.id).toBe('uranium');
    expect(left.radius).toBe(Math.max(10, originalRadius * 0.5));
    expect(left.hasSplit).toBe(true);

    defeatEnemy(state, left);
    expect(state.enemies.activeCount).toBe(1);
  });

  it('applies flee enemy rewards without touching health penalties', () => {
    const state = createGameState();
    state.player.health = 40;
    const iodine = spawnWaveEnemy(state, 'iodine', 0);

    defeatEnemy(state, iodine);

    expect(state.player.health).toBe(90);
    expect(state.enemies.activeCount).toBe(0);
  });
});
