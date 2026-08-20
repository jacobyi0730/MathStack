import { describe, expect, it } from 'vitest';
import { EVOLUTIONS } from '../../src/data/evolutions.js';
import { PASSIVES } from '../../src/data/passives.js';
import { WEAPON_EVOLUTION_LEVEL, WEAPONS, type WeaponId } from '../../src/data/weapons.js';
import {
  applyEvolution,
  collectAvailableEvolutions,
  getEvolutionStatus,
  insertGuaranteedEvolutionChoice,
  isEvolutionReady,
  isEvolutionWeaponId,
} from '../../src/systems/evolution.js';
import { createPassiveRuntime, equipPassive } from '../../src/systems/stats.js';
import { createWeaponRuntime, equipWeapon } from '../../src/systems/weapons.js';

describe('evolution', () => {
  it('evolution_data_matches_fixed_weapon_passive_pairs', () => {
    expect(Object.keys(EVOLUTIONS)).toEqual([
      'heavy_hydrogen_storm',
      'neon_infinite_beam',
      'diamond_orbit',
      'ozone_shockwave',
      'steel_identity_barrier',
      'magnesium_chain_flash',
      'golden_ratio_cycle',
      'boron_infinite_barrage',
    ]);

    for (const evolution of Object.values(EVOLUTIONS)) {
      expect(WEAPONS[evolution.baseWeapon].evolvesTo).toBe(evolution.id);
      expect(WEAPONS[evolution.baseWeapon].evolvesWith).toBe(evolution.passive);
      expect(PASSIVES[evolution.passive].pairedWeapon).toBe(evolution.baseWeapon);
      expect(WEAPONS[evolution.id].evolutionOf).toBe(evolution.baseWeapon);
      expect(isEvolutionWeaponId(evolution.id)).toBe(true);
    }
  });

  it('requires_weapon_level_five_and_paired_passive_level_three', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();

    for (let i = 0; i < WEAPON_EVOLUTION_LEVEL; i += 1) {
      expect(equipWeapon(weapons, 'hydrogen_arrow')).toBe(true);
    }
    for (let i = 0; i < 2; i += 1) {
      expect(equipPassive(passives, 'silicon')).toBe(true);
    }

    expect(isEvolutionReady(weapons, passives, 'heavy_hydrogen_storm')).toBe(false);

    expect(equipPassive(passives, 'silicon')).toBe(true);
    expect(isEvolutionReady(weapons, passives, 'heavy_hydrogen_storm')).toBe(true);
  });

  it('collects_ready_evolutions_without_including_unmet_pairs', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();
    const available = new Array<(typeof EVOLUTIONS)[keyof typeof EVOLUTIONS]>(8);

    levelWeaponToFive(weapons, 'hydrogen_arrow');
    levelPassiveToThree(passives, 'silicon');
    levelWeaponToFive(weapons, 'neon_beam');

    const count = collectAvailableEvolutions(weapons, passives, available);

    expect(count).toBe(1);
    expect(available[0].id).toBe('heavy_hydrogen_storm');
  });

  it('inserts_ready_evolution_as_guaranteed_next_level_choice', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();
    const choices: Array<WeaponId | null> = ['boron_shot', 'neon_beam', null];

    levelWeaponToFive(weapons, 'hydrogen_arrow');
    levelPassiveToThree(passives, 'silicon');

    const count = insertGuaranteedEvolutionChoice(weapons, passives, choices, 2);

    expect(count).toBe(2);
    expect(choices).toEqual(['heavy_hydrogen_storm', 'neon_beam', null]);
  });

  it('apply_evolution_replaces_base_weapon_slot_and_keeps_passive', () => {
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();

    levelWeaponToFive(weapons, 'hydrogen_arrow');
    levelPassiveToThree(passives, 'silicon');

    const result = applyEvolution(weapons, 'heavy_hydrogen_storm');
    const status = getEvolutionStatus(weapons, passives, 'heavy_hydrogen_storm');

    expect(result).toEqual({
      applied: true,
      baseWeapon: 'hydrogen_arrow',
      evolution: 'heavy_hydrogen_storm',
      signal: 'isotope_storm',
    });
    expect(weapons.slots[0]).toMatchObject({
      id: 'heavy_hydrogen_storm',
      level: WEAPON_EVOLUTION_LEVEL,
      cooldownRemainingSec: 0,
    });
    expect(passives.slots[0]).toMatchObject({ id: 'silicon', level: 3 });
    expect(status.ready).toBe(false);
    expect(status.alreadyEvolved).toBe(true);
  });
});

function levelWeaponToFive(weapons: ReturnType<typeof createWeaponRuntime>, id: WeaponId): void {
  for (let i = 0; i < WEAPON_EVOLUTION_LEVEL; i += 1) {
    equipWeapon(weapons, id);
  }
}

function levelPassiveToThree(passives: ReturnType<typeof createPassiveRuntime>, id: keyof typeof PASSIVES): void {
  for (let i = 0; i < 3; i += 1) {
    equipPassive(passives, id);
  }
}
