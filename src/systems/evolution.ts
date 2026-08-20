import {
  EVOLUTION_IDS,
  EVOLUTIONS,
  type EvolutionDefinition,
  type EvolutionSignalKind,
} from '../data/evolutions.js';
import { PASSIVE_MAX_LEVEL, type PassiveId } from '../data/passives.js';
import {
  WEAPON_EVOLUTION_LEVEL,
  WEAPONS,
  type BaseWeaponId,
  type EvolutionWeaponId,
  type WeaponId,
} from '../data/weapons.js';
import type { PassiveRuntime } from './stats.js';
import type { WeaponRuntime, WeaponSlotRuntime } from './weapons.js';

export interface EvolutionStatus {
  readonly baseWeapon: BaseWeaponId;
  readonly passive: PassiveId;
  readonly evolution: EvolutionWeaponId;
  readonly weaponLevel: number;
  readonly passiveLevel: number;
  readonly ready: boolean;
  readonly alreadyEvolved: boolean;
  readonly signal: EvolutionSignalKind;
}

export interface EvolutionApplyResult {
  readonly applied: boolean;
  readonly baseWeapon: BaseWeaponId | null;
  readonly evolution: EvolutionWeaponId;
  readonly signal: EvolutionSignalKind | null;
}

export function collectAvailableEvolutions(
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  out: EvolutionDefinition[],
): number {
  let count = 0;
  for (let i = 0; i < EVOLUTION_IDS.length; i += 1) {
    const evolution = EVOLUTIONS[EVOLUTION_IDS[i] as EvolutionWeaponId];
    if (!isEvolutionReady(weapons, passives, evolution.id)) continue;
    out[count] = evolution;
    count += 1;
  }
  return count;
}

export function getEvolutionStatus(
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  evolutionId: EvolutionWeaponId,
): EvolutionStatus {
  const evolution = EVOLUTIONS[evolutionId];
  const weaponLevel = getWeaponLevel(weapons, evolution.baseWeapon);
  const passiveLevel = getPassiveLevel(passives, evolution.passive);
  const alreadyEvolved = hasWeapon(weapons, evolution.id);
  return {
    baseWeapon: evolution.baseWeapon,
    passive: evolution.passive,
    evolution: evolution.id,
    weaponLevel,
    passiveLevel,
    ready:
      !alreadyEvolved &&
      weaponLevel >= WEAPON_EVOLUTION_LEVEL &&
      passiveLevel >= PASSIVE_MAX_LEVEL,
    alreadyEvolved,
    signal: evolution.signal,
  };
}

export function isEvolutionReady(
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  evolutionId: EvolutionWeaponId,
): boolean {
  return getEvolutionStatus(weapons, passives, evolutionId).ready;
}

export function getReadyEvolutionForBaseWeapon(
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  baseWeapon: BaseWeaponId,
): EvolutionDefinition | undefined {
  const definition = WEAPONS[baseWeapon];
  const evolutionId = definition.evolvesTo;
  if (evolutionId === undefined || !isEvolutionReady(weapons, passives, evolutionId)) {
    return undefined;
  }
  return EVOLUTIONS[evolutionId];
}

export function insertGuaranteedEvolutionChoice(
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  choices: Array<WeaponId | null>,
  choiceCount: number,
): number {
  const available = firstAvailableEvolution(weapons, passives);
  if (available === undefined || choices.length === 0) return choiceCount;

  choices[0] = available.id;
  return Math.max(1, choiceCount);
}

export function applyEvolution(
  weapons: WeaponRuntime,
  evolutionId: EvolutionWeaponId,
): EvolutionApplyResult {
  const evolution = EVOLUTIONS[evolutionId];
  const baseSlot = findWeaponSlot(weapons, evolution.baseWeapon);
  if (baseSlot === undefined) {
    return { applied: false, baseWeapon: null, evolution: evolution.id, signal: null };
  }

  baseSlot.id = evolution.id;
  baseSlot.level = WEAPON_EVOLUTION_LEVEL;
  baseSlot.cooldownRemainingSec = 0;
  return {
    applied: true,
    baseWeapon: evolution.baseWeapon,
    evolution: evolution.id,
    signal: evolution.signal,
  };
}

export function isEvolutionWeaponId(id: WeaponId): id is EvolutionWeaponId {
  return 'evolutionOf' in WEAPONS[id];
}

function firstAvailableEvolution(
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
): EvolutionDefinition | undefined {
  for (let i = 0; i < EVOLUTION_IDS.length; i += 1) {
    const evolution = EVOLUTIONS[EVOLUTION_IDS[i] as EvolutionWeaponId];
    if (isEvolutionReady(weapons, passives, evolution.id)) return evolution;
  }
  return undefined;
}

function getWeaponLevel(weapons: WeaponRuntime, id: WeaponId): number {
  const slot = findWeaponSlot(weapons, id);
  return slot?.level ?? 0;
}

function getPassiveLevel(passives: PassiveRuntime, id: PassiveId): number {
  for (let i = 0; i < passives.slots.length; i += 1) {
    const slot = passives.slots[i];
    if (slot.id === id) return slot.level;
  }
  return 0;
}

function hasWeapon(weapons: WeaponRuntime, id: WeaponId): boolean {
  return findWeaponSlot(weapons, id) !== undefined;
}

function findWeaponSlot(weapons: WeaponRuntime, id: WeaponId): WeaponSlotRuntime | undefined {
  for (let i = 0; i < weapons.slots.length; i += 1) {
    const slot = weapons.slots[i];
    if (slot.id === id) return slot;
  }
  return undefined;
}
