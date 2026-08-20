import { EVOLUTIONS } from '../data/evolutions.js';
import { PASSIVES, type PassiveId } from '../data/passives.js';
import {
  WEAPONS,
  type BaseWeaponId,
  type EvolutionWeaponId,
  type WeaponId,
} from '../data/weapons.js';
import { applyEvolution, getReadyEvolutionForBaseWeapon, isEvolutionWeaponId } from './evolution.js';
import { equipPassive, type PassiveRuntime } from './stats.js';
import { equipWeapon, type WeaponRuntime } from './weapons.js';

export type LevelRewardChoice =
  | {
      readonly kind: 'weapon';
      readonly id: BaseWeaponId;
      readonly name: string;
      readonly detail: string;
      readonly levelAfter: number;
    }
  | {
      readonly kind: 'passive';
      readonly id: PassiveId;
      readonly name: string;
      readonly detail: string;
      readonly levelAfter: number;
    }
  | {
      readonly kind: 'evolution';
      readonly id: EvolutionWeaponId;
      readonly name: string;
      readonly detail: string;
      readonly levelAfter: 1;
    };

export interface LevelRewardResult {
  readonly applied: boolean;
  readonly choice: LevelRewardChoice;
}

const BASE_WEAPON_IDS = [
  'hydrogen_arrow',
  'neon_beam',
  'carbon_ring',
  'oxygen_wave',
  'iron_barrier',
  'magnesium_bomb',
  'gold_spiral',
  'boron_shot',
] as const satisfies readonly BaseWeaponId[];

const PASSIVE_IDS = [
  'neodymium',
  'silicon',
  'helium',
  'chlorine',
  'krypton',
  'calcium',
  'nickel',
  'silver',
] as const satisfies readonly PassiveId[];

export function createLevelRewardChoices(
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  count: number,
  seed: number,
): LevelRewardChoice[] {
  const choices: LevelRewardChoice[] = [];
  appendReadyEvolution(choices, weapons, passives);

  let cursor = seed >>> 0;
  while (choices.length < count) {
    cursor = nextSeed(cursor);
    const useWeapon = (cursor & 1) === 0;
    const choice = useWeapon
      ? createWeaponChoice(BASE_WEAPON_IDS[cursor % BASE_WEAPON_IDS.length], weapons)
      : createPassiveChoice(PASSIVE_IDS[cursor % PASSIVE_IDS.length], passives);

    if (!hasChoice(choices, choice)) choices.push(choice);
    if (choices.length >= BASE_WEAPON_IDS.length + PASSIVE_IDS.length) break;
  }

  return choices.slice(0, count);
}

export function applyLevelReward(
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  choice: LevelRewardChoice,
): LevelRewardResult {
  if (choice.kind === 'weapon') {
    return { choice, applied: equipWeapon(weapons, choice.id) };
  }
  if (choice.kind === 'passive') {
    return { choice, applied: equipPassive(passives, choice.id) };
  }
  return { choice, applied: applyEvolution(weapons, choice.id).applied };
}

function appendReadyEvolution(
  choices: LevelRewardChoice[],
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
): void {
  for (let i = 0; i < weapons.slots.length; i += 1) {
    const slot = weapons.slots[i];
    if (slot.id === null || isEvolutionWeaponId(slot.id)) continue;
    const ready = getReadyEvolutionForBaseWeapon(weapons, passives, slot.id);
    if (ready === undefined) continue;
    choices.push({
      kind: 'evolution',
      id: ready.id,
      name: ready.name,
      detail: EVOLUTIONS[ready.id].effect,
      levelAfter: 1,
    });
    return;
  }
}

function createWeaponChoice(id: BaseWeaponId, weapons: WeaponRuntime): LevelRewardChoice {
  const definition = WEAPONS[id];
  return {
    kind: 'weapon',
    id,
    name: definition.name,
    detail: `${definition.element} · ${definition.pattern}`,
    levelAfter: getWeaponLevelAfter(weapons, id),
  };
}

function createPassiveChoice(id: PassiveId, passives: PassiveRuntime): LevelRewardChoice {
  const definition = PASSIVES[id];
  return {
    kind: 'passive',
    id,
    name: definition.name,
    detail: `${definition.element} · ${definition.mathReason}`,
    levelAfter: getPassiveLevelAfter(passives, id),
  };
}

function getWeaponLevelAfter(weapons: WeaponRuntime, id: WeaponId): number {
  for (let i = 0; i < weapons.slots.length; i += 1) {
    const slot = weapons.slots[i];
    if (slot.id === id) return Math.min(slot.level + 1, 5);
  }
  return 1;
}

function getPassiveLevelAfter(passives: PassiveRuntime, id: PassiveId): number {
  for (let i = 0; i < passives.slots.length; i += 1) {
    const slot = passives.slots[i];
    if (slot.id === id) return Math.min(slot.level + 1, 3);
  }
  return 1;
}

function hasChoice(choices: readonly LevelRewardChoice[], choice: LevelRewardChoice): boolean {
  return choices.some((item) => item.kind === choice.kind && item.id === choice.id);
}

function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}
