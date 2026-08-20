import {
  PASSIVES,
  PASSIVE_MAX_LEVEL,
  PASSIVE_SLOT_CAPACITY,
  type PassiveDefinition,
  type PassiveId,
} from '../data/passives.js';

export interface PassiveSlotRuntime {
  id: PassiveId | null;
  level: number;
}

export interface PassiveRuntime {
  slots: PassiveSlotRuntime[];
}

export interface BasePlayerStats {
  readonly maxHealth: number;
  readonly moveSpeed: number;
  readonly projectileCount: number;
  readonly attackPowerMultiplier: number;
  readonly attackRangeMultiplier: number;
  readonly cooldownMultiplier: number;
  readonly magnetRadius: number;
  readonly healthRegenPerSec: number;
  readonly luck: number;
}

export interface ResolvedPlayerStats extends BasePlayerStats {
  readonly maxHealthBonus: number;
  readonly moveSpeedBonusRatio: number;
  readonly projectileCountBonus: number;
  readonly attackPowerBonusRatio: number;
  readonly attackRangeBonusRatio: number;
  readonly cooldownReductionRatio: number;
  readonly magnetRadiusBonusRatio: number;
  readonly healthRegenBonusPerSec: number;
  readonly luckBonusRatio: number;
}

export function createPassiveRuntime(): PassiveRuntime {
  const slots = new Array<PassiveSlotRuntime>(PASSIVE_SLOT_CAPACITY);
  for (let i = 0; i < PASSIVE_SLOT_CAPACITY; i += 1) {
    slots[i] = { id: null, level: 0 };
  }
  return { slots };
}

export function equipPassive(runtime: PassiveRuntime, id: PassiveId): boolean {
  const existing = findPassiveSlot(runtime, id);
  if (existing) {
    levelPassive(existing);
    return true;
  }

  for (let i = 0; i < runtime.slots.length; i += 1) {
    const slot = runtime.slots[i] as PassiveSlotRuntime;
    if (slot.id !== null) continue;
    slot.id = id;
    slot.level = 1;
    return true;
  }

  return false;
}

export function canLevelPassive(slot: PassiveSlotRuntime): boolean {
  return slot.id !== null && slot.level < PASSIVE_MAX_LEVEL;
}

export function hasPassiveAtLevel(runtime: PassiveRuntime, id: PassiveId, level: number): boolean {
  const slot = findPassiveSlot(runtime, id);
  return slot !== undefined && slot.level >= level;
}

export function recalcStats(base: BasePlayerStats, runtime: PassiveRuntime): ResolvedPlayerStats {
  let maxHealthBonus = 0;
  let moveSpeedBonusRatio = 0;
  let projectileCountBonus = 0;
  let attackPowerBonusRatio = 0;
  let attackRangeBonusRatio = 0;
  let cooldownReductionRatio = 0;
  let magnetRadiusBonusRatio = 0;
  let healthRegenBonusPerSec = 0;
  let luckBonusRatio = 0;

  for (let i = 0; i < runtime.slots.length; i += 1) {
    const slot = runtime.slots[i] as PassiveSlotRuntime;
    if (slot.id === null || slot.level <= 0) continue;

    const passive = PASSIVES[slot.id];
    const level = Math.min(slot.level, PASSIVE_MAX_LEVEL);

    switch (passive.effect) {
      case 'magnetRadius':
        magnetRadiusBonusRatio += passive.valuePerLevel * level;
        break;
      case 'attackPower':
        attackPowerBonusRatio += passive.valuePerLevel * level;
        break;
      case 'moveSpeed':
        moveSpeedBonusRatio += passive.valuePerLevel * level;
        break;
      case 'cooldown':
        cooldownReductionRatio += passive.valuePerLevel * level;
        break;
      case 'attackRange':
        attackRangeBonusRatio += passive.valuePerLevel * level;
        break;
      case 'maxHealthAndRegen':
        maxHealthBonus += passive.valuePerLevel * level;
        healthRegenBonusPerSec += passive.secondaryValuePerLevel * level;
        break;
      case 'projectileCount':
        projectileCountBonus += resolveNickelProjectileBonus(level);
        break;
      case 'luck':
        luckBonusRatio += passive.valuePerLevel * level;
        break;
    }
  }

  return {
    maxHealth: base.maxHealth + maxHealthBonus,
    moveSpeed: base.moveSpeed * (1 + moveSpeedBonusRatio),
    projectileCount: base.projectileCount + projectileCountBonus,
    attackPowerMultiplier: base.attackPowerMultiplier * (1 + attackPowerBonusRatio),
    attackRangeMultiplier: base.attackRangeMultiplier * (1 + attackRangeBonusRatio),
    cooldownMultiplier: base.cooldownMultiplier * Math.max(0, 1 - cooldownReductionRatio),
    magnetRadius: base.magnetRadius * (1 + magnetRadiusBonusRatio),
    healthRegenPerSec: base.healthRegenPerSec + healthRegenBonusPerSec,
    luck: base.luck * (1 + luckBonusRatio),
    maxHealthBonus,
    moveSpeedBonusRatio,
    projectileCountBonus,
    attackPowerBonusRatio,
    attackRangeBonusRatio,
    cooldownReductionRatio,
    magnetRadiusBonusRatio,
    healthRegenBonusPerSec,
    luckBonusRatio,
  };
}

export function resolvePassiveValue(passive: PassiveDefinition, level: number): number {
  const clampedLevel = Math.min(Math.max(level, 0), PASSIVE_MAX_LEVEL);
  if (passive.effect === 'projectileCount') return resolveNickelProjectileBonus(clampedLevel);
  return passive.valuePerLevel * clampedLevel;
}

function levelPassive(slot: PassiveSlotRuntime): void {
  if (slot.level < PASSIVE_MAX_LEVEL) slot.level += 1;
}

function resolveNickelProjectileBonus(level: number): number {
  return level >= 2 ? 1 : 0;
}

function findPassiveSlot(runtime: PassiveRuntime, id: PassiveId): PassiveSlotRuntime | undefined {
  for (let i = 0; i < runtime.slots.length; i += 1) {
    const slot = runtime.slots[i] as PassiveSlotRuntime;
    if (slot.id === id) return slot;
  }
  return undefined;
}
