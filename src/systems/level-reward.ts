import { EVOLUTIONS } from '../data/evolutions.js';
import {
  PASSIVES,
  PASSIVE_MAX_LEVEL,
  type PassiveDefinition,
  type PassiveId,
} from '../data/passives.js';
import {
  WEAPON_MAX_LEVEL,
  WEAPONS,
  type BaseWeaponId,
  type EvolutionWeaponId,
  type WeaponId,
} from '../data/weapons.js';
import {
  applyEvolution,
  describeEvolutionPairForWeapon,
  describeEvolutionPairsForPassive,
  getReadyEvolutionForBaseWeapon,
  isEvolutionWeaponId,
} from './evolution.js';
import { equipPassive, type PassiveRuntime } from './stats.js';
import { equipWeapon, type WeaponRuntime } from './weapons.js';

export type LevelRewardChoice =
  | {
      readonly kind: 'weapon';
      readonly id: BaseWeaponId;
      readonly name: string;
      readonly detail: string;
      readonly evolutionPairDetail?: string;
      readonly levelAfter: number;
    }
  | {
      readonly kind: 'passive';
      readonly id: PassiveId;
      readonly name: string;
      readonly detail: string;
      readonly evolutionPairDetail?: string;
      readonly levelAfter: number;
    }
  | {
      readonly kind: 'evolution';
      readonly id: EvolutionWeaponId;
      readonly name: string;
      readonly detail: string;
      readonly evolutionPairDetail?: string;
      readonly levelAfter: 1;
    };

export interface LevelRewardResult {
  readonly applied: boolean;
  readonly choice: LevelRewardChoice;
}

const BASE_WEAPON_IDS = Object.keys(WEAPONS).filter(
  (id): id is BaseWeaponId => !('evolutionOf' in WEAPONS[id as WeaponId]),
);

const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];

export function createLevelRewardChoices(
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  count: number,
  seed: number,
): LevelRewardChoice[] {
  const choices: LevelRewardChoice[] = [];
  appendReadyEvolution(choices, weapons, passives);

  let cursor = seed >>> 0;
  cursor = appendRandomChoice(choices, weapons, passives, cursor, count);
  cursor = appendGuidedChoices(choices, weapons, passives, cursor, count);
  appendFallbackChoices(choices, weapons, passives, cursor, count);

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

function appendRandomChoice(
  choices: LevelRewardChoice[],
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  seed: number,
  count: number,
): number {
  let cursor = seed;
  if (choices.length >= count) return cursor;

  for (let attempt = 0; attempt < (BASE_WEAPON_IDS.length + PASSIVE_IDS.length) * 3; attempt += 1) {
    cursor = nextSeed(cursor);
    const useWeapon = (cursor & 1) === 0;
    const choice = useWeapon
      ? createWeaponChoice(BASE_WEAPON_IDS[cursor % BASE_WEAPON_IDS.length], weapons)
      : createPassiveChoice(PASSIVE_IDS[cursor % PASSIVE_IDS.length], passives);
    if (choice === undefined || hasChoice(choices, choice)) continue;
    choices.push(choice);
    break;
  }

  return cursor;
}

function appendGuidedChoices(
  choices: LevelRewardChoice[],
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  seed: number,
  count: number,
): number {
  let cursor = seed;
  while (choices.length < count) {
    cursor = nextSeed(cursor);
    const before = choices.length;
    const useWeaponUpgrade = (cursor & 1) === 0;

    if (useWeaponUpgrade) {
      appendOwnedWeaponUpgrade(choices, weapons, cursor);
      if (choices.length === before) appendPairedPassiveChoice(choices, weapons, passives, cursor);
    } else {
      appendPairedPassiveChoice(choices, weapons, passives, cursor);
      if (choices.length === before) appendOwnedWeaponUpgrade(choices, weapons, cursor);
    }

    if (choices.length === before) break;
  }

  return cursor;
}

function appendFallbackChoices(
  choices: LevelRewardChoice[],
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  seed: number,
  count: number,
): void {
  let cursor = seed;
  let attempts = 0;
  const maxAttempts = (BASE_WEAPON_IDS.length + PASSIVE_IDS.length) * 3;
  while (choices.length < count) {
    attempts += 1;
    if (attempts > maxAttempts) break;
    cursor = nextSeed(cursor);
    const useWeapon = (cursor & 1) === 0;
    const choice = useWeapon
      ? createWeaponChoice(BASE_WEAPON_IDS[cursor % BASE_WEAPON_IDS.length], weapons)
      : createPassiveChoice(PASSIVE_IDS[cursor % PASSIVE_IDS.length], passives);

    if (choice === undefined || hasChoice(choices, choice)) continue;
    choices.push(choice);
  }
}

function appendOwnedWeaponUpgrade(
  choices: LevelRewardChoice[],
  weapons: WeaponRuntime,
  seed: number,
): void {
  const start = seed % weapons.slots.length;
  for (let offset = 0; offset < weapons.slots.length; offset += 1) {
    const slot = weapons.slots[(start + offset) % weapons.slots.length];
    if (slot.id === null || isEvolutionWeaponId(slot.id)) continue;
    const choice = createWeaponChoice(slot.id, weapons);
    if (choice === undefined || hasChoice(choices, choice)) continue;
    choices.push(choice);
    return;
  }
}

function appendPairedPassiveChoice(
  choices: LevelRewardChoice[],
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  seed: number,
): void {
  const start = seed % weapons.slots.length;
  for (let offset = 0; offset < weapons.slots.length; offset += 1) {
    const slot = weapons.slots[(start + offset) % weapons.slots.length];
    if (slot.id === null || isEvolutionWeaponId(slot.id)) continue;
    const definition = WEAPONS[slot.id];
    if (!('evolvesWith' in definition) || definition.evolvesWith === undefined) continue;
    const choice = createPassiveChoice(definition.evolvesWith, passives);
    if (choice === undefined || hasChoice(choices, choice)) continue;
    choices.push(choice);
    return;
  }
}

function createWeaponChoice(id: BaseWeaponId, weapons: WeaponRuntime): LevelRewardChoice | undefined {
  if (!canOfferWeapon(weapons, id)) return undefined;
  const definition = WEAPONS[id];
  const levelAfter = getWeaponLevelAfter(weapons, id);
  return {
    kind: 'weapon',
    id,
    name: definition.name,
    detail: describeWeapon(definition, levelAfter),
    evolutionPairDetail: describeEvolutionPairForWeapon(id) ?? undefined,
    levelAfter,
  };
}

function createPassiveChoice(id: PassiveId, passives: PassiveRuntime): LevelRewardChoice | undefined {
  if (!canOfferPassive(passives, id)) return undefined;
  const definition = PASSIVES[id];
  const levelAfter = getPassiveLevelAfter(passives, id);
  return {
    kind: 'passive',
    id,
    name: definition.name,
    detail: describePassive(definition, levelAfter),
    evolutionPairDetail: describeEvolutionPairsForPassive(id) ?? undefined,
    levelAfter,
  };
}

function canOfferWeapon(weapons: WeaponRuntime, id: WeaponId): boolean {
  let hasEmpty = false;
  for (let i = 0; i < weapons.slots.length; i += 1) {
    const slot = weapons.slots[i];
    if (slot.id === id) return slot.level < WEAPON_MAX_LEVEL;
    if (slot.id !== null && isEvolutionWeaponId(slot.id) && WEAPONS[slot.id].evolutionOf === id) {
      return false;
    }
    if (slot.id === null) hasEmpty = true;
  }
  return hasEmpty;
}

function canOfferPassive(passives: PassiveRuntime, id: PassiveId): boolean {
  let hasEmpty = false;
  for (let i = 0; i < passives.slots.length; i += 1) {
    const slot = passives.slots[i];
    if (slot.id === id) return slot.level < PASSIVE_MAX_LEVEL;
    if (slot.id === null) hasEmpty = true;
  }
  return hasEmpty;
}

function describeWeapon(definition: typeof WEAPONS[BaseWeaponId], levelAfter: number): string {
  const action = levelAfter === 1 ? '새 무기 추가' : `무기 Lv.${levelAfter} 강화`;
  const range = levelAfter >= 3 ? ', 발사 수/범위 추가 강화' : '';
  return `${action}: ${weaponPatternText(definition.pattern)}. 피해 ${definition.damage} 기준, 레벨당 공격력 +20%${range}`;
}

function describePassive(definition: PassiveDefinition, levelAfter: number): string {
  return `보조무기 Lv.${levelAfter}: ${passiveEffectText(definition, levelAfter)}`;
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
    if (slot.id === id) return Math.min(slot.level + 1, WEAPON_MAX_LEVEL);
  }
  return 1;
}

function getPassiveLevelAfter(passives: PassiveRuntime, id: PassiveId): number {
  for (let i = 0; i < passives.slots.length; i += 1) {
    const slot = passives.slots[i];
    if (slot.id === id) return Math.min(slot.level + 1, PASSIVE_MAX_LEVEL);
  }
  return 1;
}

function hasChoice(choices: readonly LevelRewardChoice[], choice: LevelRewardChoice): boolean {
  return choices.some((item) => item.kind === choice.kind && item.id === choice.id);
}

function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}
