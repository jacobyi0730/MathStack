import { describe, expect, it } from 'vitest';
import {
  applyLevelReward,
  createLevelRewardChoices,
} from '../../src/systems/level-reward.js';
import { describeEvolutionPairForWeapon, describeEvolutionPairsForPassive } from '../../src/systems/evolution.js';
import { createPassiveRuntime, equipPassive } from '../../src/systems/stats.js';
import { createWeaponRuntime, equipWeapon } from '../../src/systems/weapons.js';

describe('level reward choices', () => {
  it('creates_requested_number_of_weapon_and_passive_choices', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();

    const choices = createLevelRewardChoices(weapons, passives, 3, 123);

    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => `${choice.kind}:${choice.id}`)).size).toBe(3);
    expect(choices[0].detail).toMatch(/새 무기 추가|보조무기 Lv\.1/);
    expect(choices[0].detail).not.toMatch(/projectile|pierce|orbit|wave/);
  });

  it('describes_evolution_pairs_for_weapon_and_passive_choices', () => {
    expect(describeEvolutionPairForWeapon('hydrogen_arrow')).toBe(
      '각성 짝꿍: 규소 연산칩 보유 + 무기 Lv.5 → Heavy Hydrogen Storm',
    );

    const neodymium = describeEvolutionPairsForPassive('neodymium');
    expect(neodymium).toContain('산소 파동 Lv.5 → Ozone Shockwave');
    expect(neodymium).toContain('프로메튬 폭렬 Lv.5 → 무한의 원자력 전지');
    expect(neodymium).toContain('이터븀 별 Lv.5 → 절단의 산업 레이저');
  });

  it('uses_one_random_choice_and_two_current_build_guided_choices', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();
    equipWeapon(weapons, 'hydrogen_arrow');
    equipWeapon(weapons, 'neon_beam');

    const choices = createLevelRewardChoices(weapons, passives, 3, 123);
    const guidedIds = new Set(['hydrogen_arrow', 'neon_beam', 'silicon', 'chlorine']);

    expect(choices).toHaveLength(3);
    expect(choices.slice(1).every((choice) => guidedIds.has(choice.id))).toBe(true);
  });

  it('prioritizes_ready_evolution_choice', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();
    for (let i = 0; i < 5; i += 1) equipWeapon(weapons, 'hydrogen_arrow');
    equipPassive(passives, 'silicon');

    const choices = createLevelRewardChoices(weapons, passives, 3, 1);

    expect(choices[0]).toMatchObject({
      kind: 'evolution',
      id: 'heavy_hydrogen_storm',
    });
  });

  it('does_not_offer_base_weapon_again_after_it_evolved', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();
    for (let i = 0; i < 5; i += 1) equipWeapon(weapons, 'hydrogen_arrow');
    equipPassive(passives, 'silicon');
    applyLevelReward(weapons, passives, {
      kind: 'evolution',
      id: 'heavy_hydrogen_storm',
      name: 'Heavy Hydrogen Storm',
      detail: 'storm',
      levelAfter: 1,
    });

    const choices = createLevelRewardChoices(weapons, passives, 20, 999);

    expect(choices.some((choice) => choice.kind === 'weapon' && choice.id === 'hydrogen_arrow')).toBe(false);
    expect(choices.some((choice) => choice.kind === 'evolution' && choice.id === 'heavy_hydrogen_storm')).toBe(false);
  });

  it('does_not_offer_new_weapons_or_passives_when_their_slots_are_full', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();
    for (const id of ['hydrogen_arrow', 'neon_beam', 'carbon_ring', 'oxygen_wave', 'iron_barrier', 'magnesium_bomb'] as const) {
      equipWeapon(weapons, id);
    }
    for (const id of ['neodymium', 'silicon', 'helium', 'chlorine', 'krypton', 'calcium'] as const) {
      equipPassive(passives, id);
    }

    const choices = createLevelRewardChoices(weapons, passives, 12, 1);
    const weaponIds = new Set(weapons.slots.map((slot) => slot.id));
    const passiveIds = new Set(passives.slots.map((slot) => slot.id));

    expect(choices.length).toBeGreaterThan(0);
    for (const choice of choices) {
      if (choice.kind === 'weapon') expect(weaponIds.has(choice.id)).toBe(true);
      if (choice.kind === 'passive') expect(passiveIds.has(choice.id)).toBe(true);
    }
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
