import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies.js';
import { spawnEnemy } from '../../src/entities/enemy.js';
import { createPlayer } from '../../src/entities/player.js';
import { createGameState } from '../../src/engine/state.js';
import { updateEnemies } from '../../src/systems/enemy-ai.js';

describe('enemy AI', () => {
  it('chase AI moves directly toward the player', () => {
    const player = createPlayer('actinium');
    player.x = 100;
    player.y = 0;
    const state = createGameState({ player });
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, 0, 0, ENEMIES.radon.hp);

    updateEnemies(state, 1);

    expect(enemy.x).toBeCloseTo(36);
    expect(enemy.y).toBeCloseTo(0);
    expect(enemy.dx).toBeCloseTo(36);
    expect(enemy.dy).toBeCloseTo(0);
    expect(enemy.prevX).toBe(0);
  });

  it('non-moving chase direction is handled as idle', () => {
    const state = createGameState();
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, state.player.x, state.player.y, ENEMIES.radon.hp);

    updateEnemies(state, 1);

    expect(enemy.x).toBe(state.player.x);
    expect(enemy.dx).toBe(0);
    expect(enemy.dy).toBe(0);
  });

  it('charge AI pauses before rushing in a locked direction', () => {
    const player = createPlayer('actinium');
    player.x = 100;
    const state = createGameState({ player });
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.sodium, 0, 0, ENEMIES.sodium.hp);

    updateEnemies(state, 4);
    expect(enemy.aiPhase).toBe(1);
    expect(enemy.x).toBe(0);

    updateEnemies(state, 0.5);
    expect(enemy.aiPhase).toBe(2);
    expect(enemy.x).toBe(0);

    updateEnemies(state, 0.25);
    expect(enemy.x).toBeGreaterThan(ENEMIES.sodium.speed * 0.25);
    expect(enemy.chargeDirX).toBeCloseTo(1);
  });

  it('flee AI moves away from the player', () => {
    const player = createPlayer('actinium');
    player.x = 0;
    const state = createGameState({ player });
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.iridium, 100, 0, ENEMIES.iridium.hp);

    updateEnemies(state, 1);

    expect(enemy.x).toBeCloseTo(160);
    expect(enemy.dx).toBeCloseTo(60);
  });

  it('ranged AI keeps distance and records a projectile handoff signal', () => {
    const player = createPlayer('actinium');
    player.x = 0;
    const state = createGameState({ player });
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.caesium, 260, 0, ENEMIES.caesium.hp);

    updateEnemies(state, 1);

    expect(enemy.x).toBeCloseTo(260);
    expect(enemy.rangedShotSeq).toBe(1);
    expect(enemy.rangedAimX).toBeCloseTo(-1);
    expect(enemy.rangedAimY).toBeCloseTo(0);
  });
});

