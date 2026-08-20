import {
  WEAPON_DAMAGE_BONUS_PER_LEVEL,
  WEAPON_EVOLUTION_LEVEL,
  WEAPON_MAX_LEVEL,
  WEAPON_PROJECTILE_RANGE_LEVEL,
  WEAPON_SLOT_CAPACITY,
  WEAPONS,
  type WeaponDefinition,
  type WeaponId,
  type WeaponPattern,
} from '../data/weapons.js';
import { applyBossDamage, defeatBoss, type BossEntity } from '../entities/boss.js';
import type { EnemyEntity } from '../entities/enemy.js';
import {
  createProjectilePool,
  spawnProjectile,
  updateProjectileMotion,
  type ProjectilePool,
} from '../entities/projectile.js';
import type { GameState } from '../engine/state.js';
import { findEnemyHit } from './collision.js';
import { applyEnemyDamage } from './damage.js';

export interface WeaponSlotRuntime {
  id: WeaponId | null;
  level: number;
  cooldownRemainingSec: number;
}

export interface WeaponRuntime {
  slots: WeaponSlotRuntime[];
  projectiles: ProjectilePool;
  targetCandidates: EnemyEntity[];
}

export interface EnemyTargetQuery {
  queryNearby(x: number, y: number, radius: number, out: EnemyEntity[]): number;
}

type WeaponPatternHandler = (
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
) => boolean;

interface CombatTarget {
  active: boolean;
  x: number;
  y: number;
  radius: number;
}

const PATTERNS = {
  projectile: fireProjectilePattern,
  pierce: noopPattern,
  orbit: noopPattern,
  wave: noopPattern,
  aura: noopPattern,
  bomb: noopPattern,
  boomerang: noopPattern,
  spread: noopPattern,
} as const satisfies Record<WeaponPattern, WeaponPatternHandler>;

export function createWeaponRuntime(): WeaponRuntime {
  const slots = new Array<WeaponSlotRuntime>(WEAPON_SLOT_CAPACITY);
  for (let i = 0; i < WEAPON_SLOT_CAPACITY; i += 1) {
    slots[i] = { id: null, level: 0, cooldownRemainingSec: 0 };
  }

  return {
    slots,
    projectiles: createProjectilePool(),
    targetCandidates: new Array<EnemyEntity>(300),
  };
}

export function equipWeapon(runtime: WeaponRuntime, id: WeaponId): boolean {
  const existing = findWeaponSlot(runtime, id);
  if (existing) {
    levelWeapon(existing);
    return true;
  }

  for (let i = 0; i < runtime.slots.length; i += 1) {
    const slot = runtime.slots[i] as WeaponSlotRuntime;
    if (slot.id !== null) continue;
    slot.id = id;
    slot.level = 1;
    slot.cooldownRemainingSec = 0;
    return true;
  }

  return false;
}

export function updateWeapons(state: GameState, runtime: WeaponRuntime, dt: number): void {
  updateWeaponProjectiles(state, runtime, dt);

  for (let i = 0; i < runtime.slots.length; i += 1) {
    const slot = runtime.slots[i] as WeaponSlotRuntime;
    if (slot.id === null || slot.level <= 0) continue;

    slot.cooldownRemainingSec -= dt;
    if (slot.cooldownRemainingSec > 0) continue;
    slot.cooldownRemainingSec = 0;

    const definition = WEAPONS[slot.id];
    if (PATTERNS[definition.pattern](state, runtime, slot, definition)) {
      slot.cooldownRemainingSec += definition.cooldownSec * state.player.cooldownMultiplier;
    }
  }
}

export function updateWeaponProjectiles(state: GameState, runtime: WeaponRuntime, dt: number): void {
  updateProjectileMotion(runtime.projectiles, dt, state.world);
  damageProjectileHits(state, runtime.projectiles);
}

export function resolveWeaponDamage(
  definition: WeaponDefinition,
  level: number,
  attackPowerMultiplier: number,
): number {
  const levelBonus = 1 + (level - 1) * WEAPON_DAMAGE_BONUS_PER_LEVEL;
  return definition.damage * levelBonus * attackPowerMultiplier;
}

export function resolveWeaponRangeMultiplier(level: number, attackRangeMultiplier: number): number {
  return attackRangeMultiplier + (level >= WEAPON_PROJECTILE_RANGE_LEVEL ? 0.2 : 0);
}

export function resolveWeaponProjectileCount(level: number, playerProjectileCount: number): number {
  return playerProjectileCount + (level >= WEAPON_PROJECTILE_RANGE_LEVEL ? 1 : 0);
}

export function canEvolveWeapon(slot: WeaponSlotRuntime): boolean {
  return slot.id !== null && slot.level >= WEAPON_EVOLUTION_LEVEL;
}

export function findClosestEnemy(
  x: number,
  y: number,
  radius: number,
  query: EnemyTargetQuery,
  candidates: EnemyEntity[],
): EnemyEntity | undefined {
  const count = query.queryNearby(x, y, radius, candidates);
  let closest: EnemyEntity | undefined;
  let closestDistSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < count; i += 1) {
    const enemy = candidates[i] as EnemyEntity;
    if (!enemy.active) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= closestDistSq) continue;
    closest = enemy;
    closestDistSq = distSq;
  }

  return closest;
}

export function damageProjectileHits(state: GameState, projectiles: ProjectilePool): number {
  let hits = 0;
  for (let i = projectiles.activeCount - 1; i >= 0; i -= 1) {
    const projectile = projectiles.items[i];
    const enemy = findEnemyHit(state, projectile.x, projectile.y, projectile.radius);
    if (enemy) {
      applyEnemyDamage(state, enemy, projectile.damage);
      projectiles.release(projectile);
      hits += 1;
      continue;
    }

    const boss = findBossHit(state, projectile.x, projectile.y, projectile.radius);
    if (boss) {
      if (applyBossDamage(boss, projectile.damage)) defeatBoss(state.bosses, boss);
      projectiles.release(projectile);
      hits += 1;
    }
  }
  return hits;
}

function fireProjectilePattern(
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
): boolean {
  const player = state.player;
  const target = findClosestCombatTarget(
    state,
    player.x,
    player.y,
    definition.range * player.attackRangeMultiplier,
    runtime.targetCandidates,
  );
  if (!target) return false;

  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const len = Math.hypot(dx, dy);
  if (len <= 0.0001) return false;

  const baseDirX = dx / len;
  const baseDirY = dy / len;
  const count = resolveWeaponProjectileCount(slot.level, player.projectileCount);
  const damage = resolveWeaponDamage(definition, slot.level, player.attackPowerMultiplier);
  const rangeMultiplier = resolveWeaponRangeMultiplier(slot.level, player.attackRangeMultiplier);

  for (let i = 0; i < count; i += 1) {
    const projectile = runtime.projectiles.acquire();
    spawnProjectile(projectile, definition.id, player.x, player.y, baseDirX, baseDirY, damage, rangeMultiplier);
  }

  return true;
}

function levelWeapon(slot: WeaponSlotRuntime): void {
  if (slot.level < WEAPON_MAX_LEVEL) slot.level += 1;
}

function findClosestCombatTarget(
  state: GameState,
  x: number,
  y: number,
  radius: number,
  candidates: EnemyEntity[],
): CombatTarget | undefined {
  const closest = findClosestEnemy(x, y, radius, state.collision.enemyHash, candidates);
  let closestDistSq = closest ? distanceSq(x, y, closest) : Number.POSITIVE_INFINITY;
  let closestBoss: BossEntity | undefined;

  for (let i = 0; i < state.bosses.activeCount; i += 1) {
    const boss = state.bosses.items[i];
    if (!boss.active) continue;
    const hitRadius = radius + boss.radius;
    const distSq = distanceSq(x, y, boss);
    if (distSq > hitRadius * hitRadius || distSq >= closestDistSq) continue;
    closestBoss = boss;
    closestDistSq = distSq;
  }

  return closestBoss ?? closest;
}

function findBossHit(state: GameState, x: number, y: number, radius: number): BossEntity | undefined {
  for (let i = 0; i < state.bosses.activeCount; i += 1) {
    const boss = state.bosses.items[i];
    const hitRadius = radius + boss.radius;
    if (distanceSq(x, y, boss) <= hitRadius * hitRadius) return boss;
  }
  return undefined;
}

function distanceSq(x: number, y: number, target: CombatTarget): number {
  const dx = target.x - x;
  const dy = target.y - y;
  return dx * dx + dy * dy;
}

function findWeaponSlot(runtime: WeaponRuntime, id: WeaponId): WeaponSlotRuntime | undefined {
  for (let i = 0; i < runtime.slots.length; i += 1) {
    const slot = runtime.slots[i] as WeaponSlotRuntime;
    if (slot.id === id) return slot;
  }
  return undefined;
}

function noopPattern(): boolean {
  return false;
}
