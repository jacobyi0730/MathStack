import { describe, expect, it } from 'vitest';
import { ENEMIES, MAX_ACTIVE_ENEMIES } from '../../src/data/enemies.js';
import { HP_GROWTH_PER_MIN, SPAWN_MIN_PLAYER_DISTANCE } from '../../src/data/waves.js';
import { createGameState } from '../../src/engine/state.js';
import { spawnWaveEnemy, updateSpawns } from '../../src/systems/spawn.js';

describe('적 스폰', () => {
  it('화면 밖 링에서 플레이어와 최소 400px 떨어져 스폰한다', () => {
    const state = createGameState();
    state.viewport.width = 320;
    state.viewport.height = 240;

    const enemy = spawnWaveEnemy(state, 'radon', 0);
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;

    expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(SPAWN_MIN_PLAYER_DISTANCE * SPAWN_MIN_PLAYER_DISTANCE);
    expect(Math.abs(enemy.x)).toBeGreaterThanOrEqual(320 * 0.5);
  });

  it('경과 시간 공식으로 HP를 증가시킨다', () => {
    const state = createGameState();
    const elapsedMin = 5;
    const enemy = spawnWaveEnemy(state, 'radon', elapsedMin);

    expect(enemy.maxHp).toBe(Math.ceil(ENEMIES.radon.hp * (1 + elapsedMin * HP_GROWTH_PER_MIN)));
  });

  it('밀도 공식으로 시간이 지날수록 스폰 누적량이 늘어난다', () => {
    const early = createGameState();
    const late = createGameState();
    late.elapsedSec = 60;

    updateSpawns(early, 1);
    updateSpawns(late, 1);

    expect(late.spawn.accumulator).toBeGreaterThan(early.spawn.accumulator);
  });

  it('300체 상한에서 가장 먼 적을 정리한 뒤 새 적을 넣는다', () => {
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
});
