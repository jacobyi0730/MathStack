import { describe, expect, it } from 'vitest';
import {
  PASSIVES,
  PASSIVE_MAX_LEVEL,
  PASSIVE_SLOT_CAPACITY,
  type PairedWeaponId,
} from '../../src/data/passives.js';

describe('passives', () => {
  it('passive_data_matches_design_values', () => {
    expect(PASSIVES.neodymium).toMatchObject({
      id: 'neodymium',
      element: 'Nd',
      atomicNumber: 60,
      mathReason: '60진법(시간·각도), 약수 12개',
      effect: 'magnetRadius',
      pairedWeapon: 'oxygen_wave',
      valuePerLevel: 0.25,
    });
    expect(PASSIVES.silicon).toMatchObject({
      element: 'Si',
      atomicNumber: 14,
      effect: 'attackPower',
      pairedWeapon: 'hydrogen_arrow',
      valuePerLevel: 0.12,
    });
    expect(PASSIVES.calcium).toMatchObject({
      element: 'Ca',
      atomicNumber: 20,
      effect: 'maxHealthAndRegen',
      pairedWeapon: 'magnesium_bomb',
      valuePerLevel: 20,
      secondaryValuePerLevel: 0.3,
    });
    expect(PASSIVES.nickel).toMatchObject({
      element: 'Ni',
      atomicNumber: 28,
      effect: 'projectileCount',
      pairedWeapon: 'carbon_ring',
    });
  });

  it('passive_pairing_is_fixed_one_to_one', () => {
    const pairedWeapons = new Set<PairedWeaponId>();

    for (const passive of Object.values(PASSIVES)) {
      pairedWeapons.add(passive.pairedWeapon);
    }

    expect(Object.keys(PASSIVES)).toHaveLength(21);
    expect(pairedWeapons.size).toBe(21);
    expect(PASSIVE_SLOT_CAPACITY).toBe(6);
    expect(PASSIVE_MAX_LEVEL).toBe(3);
  });
});
