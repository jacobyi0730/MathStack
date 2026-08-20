import { describe, expect, it } from 'vitest';
import {
  applyLevelReward,
  createLevelRewardChoices,
} from '../../src/systems/level-reward.js';
import { createPassiveRuntime, equipPassive } from '../../src/systems/stats.js';
import { createWeaponRuntime, equipWeapon } from '../../src/systems/weapons.js';

describe('level reward choices', () => {
  it('creates_requested_number_of_weapon_and_passive_choices', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();

    const choices = createLevelRewardChoices(weapons, passives, 3, 123);

    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => `${choice.kind}:${choice.id}`)).size).toBe(3);
    expect(choices[0].detail).toMatch(/새 무기 추가|패시브 Lv\.1/);
    expect(choices[0].detail).not.toMatch(/projectile|pierce|orbit|wave/);
  });

  it('prioritizes_ready_evolution_choice', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();
    for (let i = 0; i < 5; i += 1) equipWeapon(weapons, 'hydrogen_arrow');
    for (let i = 0; i < 3; i += 1) equipPassive(passives, 'silicon');

    const choices = createLevelRewardChoices(weapons, passives, 3, 1);

    expect(choices[0]).toMatchObject({
      kind: 'evolution',
      id: 'heavy_hydrogen_storm',
    });
  });

  it('applies_weapon_passive_and_evolution_rewards', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();

    expect(applyLevelReward(weapons, passives, {
      kind: 'weapon',
      id: 'neon_beam',
      name: '네온 광선',
      detail: 'Ne',
      levelAfter: 1,
    }).applied).toBe(true);
    expect(weapons.slots[0].id).toBe('neon_beam');

    expect(applyLevelReward(weapons, passives, {
      kind: 'passive',
      id: 'chlorine',
      name: '염소 정화액',
      detail: 'Cl',
      levelAfter: 1,
    }).applied).toBe(true);
    expect(passives.slots[0].id).toBe('chlorine');

    for (let i = 1; i < 5; i += 1) equipWeapon(weapons, 'neon_beam');
    for (let i = 1; i < 3; i += 1) equipPassive(passives, 'chlorine');

    expect(applyLevelReward(weapons, passives, {
      kind: 'evolution',
      id: 'neon_infinite_beam',
      name: 'Neon Infinite Beam',
      detail: 'beam',
      levelAfter: 1,
    }).applied).toBe(true);
    expect(weapons.slots[0].id).toBe('neon_infinite_beam');
  });
});
