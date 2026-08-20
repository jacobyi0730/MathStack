import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/entities/player.js';

describe('플레이어 생성', () => {
  it('무기 슬롯 6칸과 패시브 슬롯 6칸을 만든다', () => {
    const player = createPlayer('hydrogen');

    expect(player.weaponSlots).toHaveLength(6);
    expect(player.passiveSlots).toHaveLength(6);
  });

  it('수소 정령은 최대 체력 10퍼센트 보너스를 받는다', () => {
    const player = createPlayer('hydrogen');

    expect(player.maxHealth).toBe(110);
    expect(player.health).toBe(110);
  });

  it('네온 정령은 이동 속도 15퍼센트 보너스를 받는다', () => {
    const player = createPlayer('neon');

    expect(player.moveSpeed).toBeCloseTo(299);
  });

  it('탄소 정령과 산소 정령의 전투 특성이 반영된다', () => {
    const carbon = createPlayer('carbon');
    const oxygen = createPlayer('oxygen');

    expect(carbon.projectileCountBonus).toBe(1);
    expect(oxygen.attackRangeMultiplier).toBeCloseTo(1.2);
    expect(oxygen.cooldownMultiplier).toBeCloseTo(1.1);
  });
});
