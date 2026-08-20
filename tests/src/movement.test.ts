import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/entities/player.js';
import { movePlayer } from '../../src/systems/movement.js';

describe('플레이어 이동', () => {
  it('입력 방향에 따라 이동한다', () => {
    const player = createPlayer('hydrogen');
    player.movementIntent.x = 1;
    player.movementIntent.y = 0;

    movePlayer(player, 0.5, { minX: -999, maxX: 999, minY: -999, maxY: 999 });

    expect(player.x).toBeCloseTo(130);
    expect(player.y).toBe(0);
    expect(player.dx).toBeCloseTo(260);
    expect(player.dy).toBe(0);
  });

  it('맵 경계 밖으로 나가지 않는다', () => {
    const player = createPlayer('hydrogen');
    player.x = 930;
    player.prevX = 930;
    player.movementIntent.x = 1;

    movePlayer(player, 1, { minX: -960, maxX: 960, minY: -540, maxY: 540 });

    expect(player.x).toBe(936);
  });

  it('경계에 막혀도 동공용 방향 값은 유지한다', () => {
    const player = createPlayer('hydrogen');
    player.x = 936;
    player.prevX = 936;
    player.movementIntent.x = 1;

    movePlayer(player, 1 / 60, { minX: -960, maxX: 960, minY: -540, maxY: 540 });

    expect(player.x).toBe(936);
    expect(player.dx).toBeGreaterThan(0);
  });
});
