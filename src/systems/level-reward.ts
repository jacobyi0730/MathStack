import { EVOLUTIONS } from '../data/evolutions.js';
import { PASSIVES, type PassiveDefinition, type PassiveId } from '../data/passives.js';
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
  const levelAfter = getWeaponLevelAfter(weapons, id);
  return {
    kind: 'weapon',
    id,
    name: definition.name,
    detail: describeWeapon(definition, levelAfter),
    levelAfter,
  };
}

function createPassiveChoice(id: PassiveId, passives: PassiveRuntime): LevelRewardChoice {
  const definition = PASSIVES[id];
  const levelAfter = getPassiveLevelAfter(passives, id);
  return {
    kind: 'passive',
    id,
    name: definition.name,
    detail: describePassive(definition, levelAfter),
    levelAfter,
  };
}

function describeWeapon(definition: typeof WEAPONS[BaseWeaponId], levelAfter: number): string {
  const action = levelAfter === 1 ? '새 무기 추가' : `무기 Lv.${levelAfter} 강화`;
  const range = levelAfter >= 3 ? ', 발사 수/범위 추가 강화' : '';
  return `${action}: ${weaponPatternText(definition.pattern)}. 피해 ${definition.damage} 기준, 레벨당 공격력 +20%${range}`;
}

function describePassive(definition: PassiveDefinition, levelAfter: number): string {
  return `패시브 Lv.${levelAfter}: ${passiveEffectText(definition, levelAfter)}`;
}

function weaponPatternText(pattern: typeof WEAPONS[BaseWeaponId]['pattern']): string {
  if (pattern === 'projectile') return '가장 가까운 적에게 단일 투사체 발사';
  if (pattern === 'pierce') return '직선 관통 광선 발사';
  if (pattern === 'orbit') return '플레이어 주변 회전 공격 추가';
  if (pattern === 'wave') return '원형으로 퍼지는 파동 공격';
  if (pattern === 'aura') return '근접 적에게 지속 피해를 주는 결계';
  if (pattern === 'bomb') return '적에게 날아가 폭발하는 투사체';
  if (pattern === 'boomerang') return '왕복하는 부메랑 투사체';
  return '여러 발을 부채꼴로 발사';
}

function passiveEffectText(definition: PassiveDefinition, levelAfter: number): string {
  const total = definition.valuePerLevel * levelAfter;
  if (definition.effect === 'magnetRadius') return `경험치 획득 범위 +${Math.round(total * 100)}%`;
  if (definition.effect === 'attackPower') return `모든 무기 공격력 +${Math.round(total * 100)}%`;
  if (definition.effect === 'moveSpeed') return `이동속도 +${Math.round(total * 100)}%`;
  if (definition.effect === 'cooldown') return `모든 무기 쿨타임 -${Math.round(total * 100)}%`;
  if (definition.effect === 'attackRange') return `무기 사거리/범위 +${Math.round(total * 100)}%`;
  if (definition.effect === 'maxHealthAndRegen') {
    return `최대 체력 +${definition.valuePerLevel * levelAfter}, 초당 회복 +${(definition.secondaryValuePerLevel * levelAfter).toFixed(1)}`;
  }
  if (definition.effect === 'projectileCount') {
    return levelAfter >= 2 ? '투사체 수 +1' : 'Lv.2부터 투사체 수 +1 준비';
  }
  return `행운 +${Math.round(total * 100)}%`;
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
