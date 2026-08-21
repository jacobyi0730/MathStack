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
import { ENTITY_SHAPES } from '../data/palette.js';
import { applyBossDamage, defeatBoss, type BossEntity } from '../entities/boss.js';
import type { EnemyEntity } from '../entities/enemy.js';
import {
  configureOrbitProjectile,
  configureProjectileHit,
  configureWaveProjectile,
  createProjectilePool,
  spawnProjectile,
  updateProjectileMotion,
  type ProjectileEntity,
  type ProjectilePool,
} from '../entities/projectile.js';
import type { GameState } from '../engine/state.js';
import { shortestDeltaX, shortestDeltaY, wrappedDistanceSq, type WorldBounds } from '../engine/world.js';
import { findEnemyHit, queryNearbyEnemies } from './collision.js';
import { applyEnemyDamage } from './damage.js';
import { resolveHasteCooldownMultiplier } from './pickup.js';

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
  dt: number,
) => boolean;

interface CombatTarget {
  kind: 'enemy' | 'boss';
  active: boolean;
  x: number;
  y: number;
  radius: number;
}

const PATTERNS = {
  projectile: fireProjectilePattern,
  pierce: firePiercePattern,
  orbit: updateOrbitPattern,
  wave: fireWavePattern,
  aura: updateAuraPattern,
  bomb: fireBombPattern,
  boomerang: fireBoomerangPattern,
  spread: fireSpreadPattern,
} as const satisfies Record<WeaponPattern, WeaponPatternHandler>;

const FULL_CIRCLE = Math.PI * 2;
const SPREAD_STEP_RAD = Math.PI / 16;
const ORBIT_BASE_COUNT = 3;
const ORBIT_ANGULAR_SPEED = Math.PI * 1.35;
const DAMAGE_TICK_SEC = 0.2;
const BOMB_EXPLOSION_RADIUS = 86;

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
    if (PATTERNS[definition.pattern](state, runtime, slot, definition, dt)) {
      slot.cooldownRemainingSec +=
        definition.cooldownSec *
        state.player.cooldownMultiplier *
        resolveHasteCooldownMultiplier(state.pickupRuntime);
    }
  }
}

export function updateWeaponProjectiles(state: GameState, runtime: WeaponRuntime, dt: number): void {
  syncPersistentProjectiles(state, runtime);
  updateProjectileMotion(runtime.projectiles, dt, state.world);
  damageProjectileHits(state, runtime.projectiles, dt);
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
  return slot.id !== null && 'evolvesTo' in WEAPONS[slot.id] && slot.level >= WEAPON_EVOLUTION_LEVEL;
}

export function findClosestEnemy(
  x: number,
  y: number,
  radius: number,
  query: EnemyTargetQuery,
  candidates: EnemyEntity[],
  bounds: WorldBounds,
): EnemyEntity | undefined {
  const count = query.queryNearby(x, y, radius, candidates);
  let closest: EnemyEntity | undefined;
  let closestDistSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < count; i += 1) {
    const enemy = candidates[i] as EnemyEntity;
    if (!enemy.active) continue;
    const dx = shortestDeltaX(x, enemy.x, bounds);
    const dy = shortestDeltaY(y, enemy.y, bounds);
    const distSq = dx * dx + dy * dy;
    if (distSq >= closestDistSq) continue;
    closest = enemy;
    closestDistSq = distSq;
  }

  return closest;
}

export function damageProjectileHits(state: GameState, projectiles: ProjectilePool, dt: number = 0): number {
  let hits = 0;
  for (let i = projectiles.activeCount - 1; i >= 0; i -= 1) {
    const projectile = projectiles.items[i];
    if (projectile.hitMode === 'tick') {
      if (projectile.damageTimerSec > 0) continue;
      hits += damageAreaHits(state, projectile.x, projectile.y, projectile.areaRadius, projectile.damage * dt);
      projectile.damageTimerSec = projectile.damageIntervalSec;
    } else if (projectile.hitMode === 'area') {
      hits += damageAreaHits(state, projectile.x, projectile.y, projectile.areaRadius, projectile.damage);
    } else if (projectile.hitMode === 'pierce') {
      if (projectile.damageTimerSec > 0) continue;
      hits += damageAreaHits(state, projectile.x, projectile.y, projectile.areaRadius, projectile.damage);
      projectile.damageTimerSec = projectile.damageIntervalSec;
    } else if (projectile.hitMode === 'bomb') {
      if (findCombatHit(state, projectile.x, projectile.y, projectile.radius)) {
        hits += damageAreaHits(state, projectile.x, projectile.y, projectile.areaRadius, projectile.damage);
        projectiles.release(projectile);
      }
    } else {
      const hit = findCombatHit(state, projectile.x, projectile.y, projectile.radius);
      if (hit) {
        applyCombatTargetDamage(state, hit, projectile.damage);
        projectiles.release(projectile);
        hits += 1;
      }
    }
  }
  return hits;
}

function fireProjectilePattern(
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
  _dt: number,
): boolean {
  return fireAimedProjectiles(state, runtime, slot, definition, 0, 0, 'single');
}

function firePiercePattern(
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
  _dt: number,
): boolean {
  return fireAimedProjectiles(state, runtime, slot, definition, 0, 0, 'pierce');
}

function updateOrbitPattern(
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
  _dt: number,
): boolean {
  const player = state.player;
  const count = definition.projectileCount ?? resolveOrbitProjectileCount(slot.level, player.projectileCount);
  const rangeMultiplier = resolveWeaponRangeMultiplier(slot.level, player.attackRangeMultiplier);
  const orbitRadius = definition.range * rangeMultiplier;
  const damage = resolveWeaponDamage(definition, slot.level, player.attackPowerMultiplier);
  let activeForWeapon = 0;

  for (let i = 0; i < runtime.projectiles.activeCount; i += 1) {
    const projectile = runtime.projectiles.items[i];
    if (projectile.weaponId !== definition.id) continue;
    activeForWeapon += 1;
    projectile.damage = damage;
    projectile.areaRadius = projectile.radius + 5 * rangeMultiplier;
    projectile.damageIntervalSec = DAMAGE_TICK_SEC;
    projectile.ownerX = player.x;
    projectile.ownerY = player.y;
    projectile.orbitRadius = orbitRadius;
    projectile.orbitAngularSpeed = ORBIT_ANGULAR_SPEED;
  }

  for (let i = activeForWeapon; i < count; i += 1) {
    const projectile = runtime.projectiles.acquire();
    const angle = (FULL_CIRCLE * i) / count;
    spawnProjectile(projectile, definition.id, player.x, player.y, 0, 0, damage, rangeMultiplier);
    configureOrbitProjectile(projectile, player.x, player.y, orbitRadius, angle, ORBIT_ANGULAR_SPEED);
    configureProjectileHit(projectile, 'tick', projectile.radius + 5 * rangeMultiplier, DAMAGE_TICK_SEC);
  }

  return false;
}

function fireWavePattern(
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
  _dt: number,
): boolean {
  const player = state.player;
  if (!hasCombatTargetInRange(state, player.x, player.y, definition.range * player.attackRangeMultiplier)) {
    return false;
  }

  const damage = resolveWeaponDamage(definition, slot.level, player.attackPowerMultiplier);
  const rangeMultiplier = resolveWeaponRangeMultiplier(slot.level, player.attackRangeMultiplier);
  const projectile = runtime.projectiles.acquire();
  spawnProjectile(projectile, definition.id, player.x, player.y, 0, 0, damage, rangeMultiplier);
  configureWaveProjectile(projectile, definition.range * rangeMultiplier, definition.projectileLifetimeSec);
  return true;
}

function updateAuraPattern(
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
  _dt: number,
): boolean {
  const player = state.player;
  const damage = resolveWeaponDamage(definition, slot.level, player.attackPowerMultiplier);
  const rangeMultiplier = resolveWeaponRangeMultiplier(slot.level, player.attackRangeMultiplier);
  const radius = definition.range * rangeMultiplier;
  let aura: ProjectileEntity | undefined;

  for (let i = 0; i < runtime.projectiles.activeCount; i += 1) {
    const projectile = runtime.projectiles.items[i];
    if (projectile.weaponId !== definition.id) continue;
    aura = projectile;
    break;
  }

  if (!aura) {
    aura = runtime.projectiles.acquire();
    spawnProjectile(aura, definition.id, player.x, player.y, 0, 0, damage, rangeMultiplier);
    configureProjectileHit(aura, 'tick', radius, DAMAGE_TICK_SEC);
    // 오라는 플레이어를 감싸는 넓은 장판이다. 아이콘으로 그리면 화면을 가린다
    aura.shape = ENTITY_SHAPES.field;
    aura.icon = '';
    aura.lifeSec = Number.POSITIVE_INFINITY;
    aura.maxLifeSec = Number.POSITIVE_INFINITY;
  }

  aura.x = player.x;
  aura.y = player.y;
  aura.prevX = player.x;
  aura.prevY = player.y;
  aura.radius = radius;
  aura.areaRadius = radius;
  aura.damage = damage;
  aura.damageIntervalSec = DAMAGE_TICK_SEC;
  return false;
}

function fireBombPattern(
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
  _dt: number,
): boolean {
  return fireAimedProjectiles(state, runtime, slot, definition, 0, BOMB_EXPLOSION_RADIUS, 'bomb');
}

function fireBoomerangPattern(
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
  _dt: number,
): boolean {
  return fireAimedProjectiles(state, runtime, slot, definition, 0, 0, 'boomerang');
}

function fireSpreadPattern(
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
  _dt: number,
): boolean {
  return fireAimedProjectiles(state, runtime, slot, definition, SPREAD_STEP_RAD, 0, 'single');
}

function fireAimedProjectiles(
  state: GameState,
  runtime: WeaponRuntime,
  slot: WeaponSlotRuntime,
  definition: WeaponDefinition,
  spreadStepRad: number,
  areaRadius: number,
  hitMode: ProjectileEntity['hitMode'],
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

  const dx = shortestDeltaX(player.x, target.x, state.world);
  const dy = shortestDeltaY(player.y, target.y, state.world);
  const len = Math.hypot(dx, dy);
  if (len <= 0.0001) return false;

  const baseDirX = dx / len;
  const baseDirY = dy / len;
  const count = definition.projectileCount ?? resolveWeaponProjectileCount(slot.level, player.projectileCount);
  const damage = resolveWeaponDamage(definition, slot.level, player.attackPowerMultiplier);
  const rangeMultiplier = resolveWeaponRangeMultiplier(slot.level, player.attackRangeMultiplier);
  const patternCount =
    definition.pattern === 'spread' && definition.projectileCount === undefined ? definition.atomicNumber : count;
  const totalCount =
    patternCount + (definition.pattern === 'spread' && definition.projectileCount === undefined ? count - 1 : 0);
  const angleStart = -spreadStepRad * (totalCount - 1) * 0.5;

  for (let i = 0; i < totalCount; i += 1) {
    const angle = angleStart + spreadStepRad * i;
    const dirX = spreadStepRad === 0 ? baseDirX : rotateX(baseDirX, baseDirY, angle);
    const dirY = spreadStepRad === 0 ? baseDirY : rotateY(baseDirX, baseDirY, angle);
    const projectile = runtime.projectiles.acquire();
    spawnProjectile(projectile, definition.id, player.x, player.y, dirX, dirY, damage, rangeMultiplier);
    if (hitMode === 'pierce') {
      configureProjectileHit(projectile, 'pierce', projectile.radius * 1.5, DAMAGE_TICK_SEC);
    } else if (hitMode === 'bomb') {
      configureProjectileHit(projectile, 'bomb', areaRadius * rangeMultiplier, 0);
    } else if (hitMode === 'boomerang') {
      configureProjectileHit(projectile, 'boomerang', projectile.radius, 0);
      projectile.ownerX = player.x;
      projectile.ownerY = player.y;
    }
  }

  return true;
}

function syncPersistentProjectiles(state: GameState, runtime: WeaponRuntime): void {
  const player = state.player;
  for (let i = 0; i < runtime.projectiles.activeCount; i += 1) {
    const projectile = runtime.projectiles.items[i];
    if (projectile.hitMode !== 'tick') continue;
    projectile.ownerX = player.x;
    projectile.ownerY = player.y;
    if (projectile.orbitRadius <= 0) {
      projectile.x = player.x;
      projectile.y = player.y;
      projectile.prevX = player.x;
      projectile.prevY = player.y;
    }
  }
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
  const closest = findClosestEnemyInState(state, x, y, radius, candidates);
  let closestDistSq = closest ? wrappedDistanceSq(x, y, closest.x, closest.y, state.world) : Number.POSITIVE_INFINITY;
  let closestBoss: BossEntity | undefined;

  for (let i = 0; i < state.bosses.activeCount; i += 1) {
    const boss = state.bosses.items[i];
    if (!boss.active) continue;
    const hitRadius = radius + boss.radius;
    const distSq = wrappedDistanceSq(x, y, boss.x, boss.y, state.world);
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
    if (wrappedDistanceSq(x, y, boss.x, boss.y, state.world) <= hitRadius * hitRadius) return boss;
  }
  return undefined;
}

function hasCombatTargetInRange(state: GameState, x: number, y: number, radius: number): boolean {
  if (findClosestEnemyInState(state, x, y, radius, state.collision.enemyCandidates)) {
    return true;
  }
  return findBossHit(state, x, y, radius) !== undefined;
}

function findClosestEnemyInState(
  state: GameState,
  x: number,
  y: number,
  radius: number,
  candidates: EnemyEntity[],
): EnemyEntity | undefined {
  const count = queryNearbyEnemies(state, x, y, radius, candidates);
  let closest: EnemyEntity | undefined;
  let closestDistSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < count; i += 1) {
    const enemy = candidates[i] as EnemyEntity;
    if (!enemy.active) continue;
    const distSq = wrappedDistanceSq(x, y, enemy.x, enemy.y, state.world);
    if (distSq >= closestDistSq) continue;
    closest = enemy;
    closestDistSq = distSq;
  }

  return closest;
}

function findCombatHit(state: GameState, x: number, y: number, radius: number): CombatTarget | undefined {
  const enemy = findEnemyHit(state, x, y, radius);
  if (enemy) return enemy;
  return findBossHit(state, x, y, radius);
}

function damageAreaHits(state: GameState, x: number, y: number, radius: number, damage: number): number {
  if (damage <= 0) return 0;

  let hits = 0;
  const candidates = state.collision.enemyCandidates;
  const count = queryNearbyEnemies(state, x, y, radius, candidates);
  for (let i = 0; i < count; i += 1) {
    const enemy = candidates[i] as EnemyEntity;
    const hitRadius = radius + enemy.radius;
    if (wrappedDistanceSq(x, y, enemy.x, enemy.y, state.world) > hitRadius * hitRadius) continue;
    applyEnemyDamage(state, enemy, damage);
    hits += 1;
  }

  for (let i = state.bosses.activeCount - 1; i >= 0; i -= 1) {
    const boss = state.bosses.items[i];
    const hitRadius = radius + boss.radius;
    if (wrappedDistanceSq(x, y, boss.x, boss.y, state.world) > hitRadius * hitRadius) continue;
    if (applyBossDamage(boss, damage)) defeatBoss(state.bosses, boss);
    hits += 1;
  }

  return hits;
}

function applyCombatTargetDamage(state: GameState, target: CombatTarget, damage: number): void {
  if (target.kind === 'boss') {
    const boss = target as BossEntity;
    if (applyBossDamage(boss, damage)) defeatBoss(state.bosses, boss);
  } else {
    applyEnemyDamage(state, target as EnemyEntity, damage);
  }
}

function rotateX(x: number, y: number, angle: number): number {
  return x * Math.cos(angle) - y * Math.sin(angle);
}


function rotateY(x: number, y: number, angle: number): number {
  return x * Math.sin(angle) + y * Math.cos(angle);
}

function resolveOrbitProjectileCount(level: number, playerProjectileCount: number): number {
  return playerProjectileCount + ORBIT_BASE_COUNT - 1 + Math.floor(level / 2);
}

function findWeaponSlot(runtime: WeaponRuntime, id: WeaponId): WeaponSlotRuntime | undefined {
  for (let i = 0; i < runtime.slots.length; i += 1) {
    const slot = runtime.slots[i] as WeaponSlotRuntime;
    if (slot.id === id) return slot;
  }
  return undefined;
}
