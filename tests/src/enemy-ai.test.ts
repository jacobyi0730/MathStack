import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies.js';
import { createEnemyPool, spawnEnemy } from '../../src/entities/enemy.js';
import { createPlayer } from '../../src/entities/player.js';
import { createGameState } from '../../src/engine/state.js';
import { updateEnemies } from '../../src/systems/enemy-ai.js';

describe('적 AI', () => {
  it('chase AI는 플레이어를 향해 직선 추격한다', () => {
    const player = createPlayer('hydrogen');
    player.x = 100;
    player.y = 0;
    const state = createGameState({ player });
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, 0, 0, ENEMIES.radon.hp);

    updateEnemies(state, 1);

    expect(enemy.x).toBeCloseTo(40);
    expect(enemy.y).toBeCloseTo(0);
    expect(enemy.dx).toBeCloseTo(40);
    expect(enemy.dy).toBeCloseTo(0);
    expect(enemy.prevX).toBe(0);
  });

  it('빈 chase 방향은 정지 상태로 처리한다', () => {
    const state = createGameState();
    const pool = createEnemyPool(1);
    const enemy = pool.acquire();
    spawnEnemy(enemy, ENEMIES.radon, state.player.x, state.player.y, ENEMIES.radon.hp);
    state.enemies = pool;

    updateEnemies(state, 1);

    expect(enemy.x).toBe(state.player.x);
    expect(enemy.dx).toBe(0);
    expect(enemy.dy).toBe(0);
  });
});
