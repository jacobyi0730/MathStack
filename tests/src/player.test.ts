import { describe, expect, it } from 'vitest';
import { CHARACTER_PROFILES } from '../../src/data/player.js';
import { WEAPONS } from '../../src/data/weapons.js';
import { createPlayer } from '../../src/entities/player.js';

describe('플레이어 생성', () => {
  it('무기 슬롯 6칸과 패시브 슬롯 6칸을 만든다', () => {
    const player = createPlayer('actinium');

    expect(player.weaponSlots).toHaveLength(6);
    expect(player.passiveSlots).toHaveLength(6);
  });

  it('악티늄 정령은 패시브 체력 보너스를 받지 않는다', () => {
    const player = createPlayer('actinium');

    expect(player.maxHealth).toBe(100);
    expect(player.health).toBe(100);
  });

  it('토륨 정령은 패시브 이동 속도 보너스를 받지 않는다', () => {
    const player = createPlayer('thorium');

    expect(player.moveSpeed).toBe(260);
  });

  it('란타넘 정령과 세륨 정령은 패시브 전투 특성을 받지 않는다', () => {
    const lanthanum = createPlayer('lanthanum');
    const cerium = createPlayer('cerium');

    expect(lanthanum.projectileCountBonus).toBe(0);
    expect(cerium.attackRangeMultiplier).toBe(1);
    expect(cerium.cooldownMultiplier).toBe(1);
  });

  it('선택 원소는 패시브가 아니라 시작 공격 무기를 가리킨다', () => {
    expect(WEAPONS[CHARACTER_PROFILES.actinium.startingWeaponId].name).toBe('악티늄 창');
    expect(WEAPONS[CHARACTER_PROFILES.thorium.startingWeaponId].pattern).toBe('bomb');
    expect(WEAPONS[CHARACTER_PROFILES.lanthanum.startingWeaponId].damage).toBeGreaterThan(0);
    expect(WEAPONS[CHARACTER_PROFILES.cerium.startingWeaponId].cooldownSec).toBeGreaterThan(0);
  });
});
