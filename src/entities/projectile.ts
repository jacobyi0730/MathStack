import { WEAPONS, type WeaponId } from '../data/weapons.js';
import { ENTITY_SHAPES } from '../data/palette.js';
import { createPool, type Pool, type Poolable } from '../engine/pool.js';
import type { RenderableEntity } from '../engine/renderer.js';
import { wrapX, wrapY } from '../engine/world.js';

export const MAX_ACTIVE_PROJECTILES = 200;
export type ProjectileHitMode = 'single' | 'pierce' | 'area' | 'tick' | 'bomb' | 'boomerang';

export interface ProjectileEntity extends RenderableEntity, Poolable {
  kind: 'projectile';
  active: boolean;
  weaponId: WeaponId;
  hitMode: ProjectileHitMode;
  damage: number;
  damageIntervalSec: number;
  damageTimerSec: number;
  lifeSec: number;
  maxLifeSec: number;
  ageSec: number;
  ownerX: number;
  ownerY: number;
  orbitRadius: number;
  orbitAngleRad: number;
  orbitAngularSpeed: number;
  radiusGrowthPerSec: number;
  areaRadius: number;
  boomerangTurned: boolean;
}

export type ProjectilePool = Pool<ProjectileEntity>;

export interface ProjectileBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function createProjectilePool(capacity: number = MAX_ACTIVE_PROJECTILES): ProjectilePool {
  return createPool<ProjectileEntity>(createProjectile, resetProjectile, capacity);
}

export function spawnProjectile(
  projectile: ProjectileEntity,
  weaponId: WeaponId,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  damage: number,
  rangeMultiplier: number,
): void {
  const definition = WEAPONS[weaponId];
  const speed = definition.projectileSpeed;
  const lifeSec = definition.projectileLifetimeSec * rangeMultiplier;

  projectile.active = true;
  projectile.weaponId = weaponId;
  projectile.hitMode = 'single';
  projectile.x = x;
  projectile.y = y;
  projectile.prevX = x;
  projectile.prevY = y;
  projectile.dx = dirX * speed;
  projectile.dy = dirY * speed;
  projectile.radius = definition.projectileRadius * rangeMultiplier;
  // 투사체는 기본이 아이콘이다. 넓게 퍼지는 파동·오라만 장판으로 바꾼다
  projectile.shape = ENTITY_SHAPES.icon;
  projectile.icon = definition.icon;
  projectile.damage = damage;
  projectile.damageIntervalSec = 0;
  projectile.damageTimerSec = 0;
  projectile.lifeSec = lifeSec;
  projectile.maxLifeSec = lifeSec;
  projectile.ageSec = 0;
  projectile.ownerX = x;
  projectile.ownerY = y;
  projectile.orbitRadius = 0;
  projectile.orbitAngleRad = 0;
  projectile.orbitAngularSpeed = 0;
  projectile.radiusGrowthPerSec = 0;
  projectile.areaRadius = projectile.radius;
  projectile.boomerangTurned = false;
  projectile.symbol = definition.element;
}

export function configureProjectileHit(
  projectile: ProjectileEntity,
  hitMode: ProjectileHitMode,
  areaRadius: number,
  damageIntervalSec: number,
): void {
  projectile.hitMode = hitMode;
  projectile.areaRadius = areaRadius;
  projectile.damageIntervalSec = damageIntervalSec;
  projectile.damageTimerSec = 0;
}

export function configureOrbitProjectile(
  projectile: ProjectileEntity,
  ownerX: number,
  ownerY: number,
  orbitRadius: number,
  angleRad: number,
  angularSpeed: number,
): void {
  projectile.hitMode = 'tick';
  projectile.ownerX = ownerX;
  projectile.ownerY = ownerY;
  projectile.orbitRadius = orbitRadius;
  projectile.orbitAngleRad = angleRad;
  projectile.orbitAngularSpeed = angularSpeed;
  projectile.lifeSec = Number.POSITIVE_INFINITY;
  projectile.maxLifeSec = Number.POSITIVE_INFINITY;
  projectile.dx = 0;
  projectile.dy = 0;
  syncOrbitProjectile(projectile, 0);
}

export function configureWaveProjectile(
  projectile: ProjectileEntity,
  maxRadius: number,
  lifetimeSec: number,
): void {
  projectile.hitMode = 'area';
  projectile.shape = ENTITY_SHAPES.field;
  projectile.icon = '';
  projectile.maxLifeSec = lifetimeSec;
  projectile.lifeSec = lifetimeSec;
  projectile.radiusGrowthPerSec = (maxRadius - projectile.radius) / lifetimeSec;
  projectile.areaRadius = projectile.radius;
  projectile.dx = 0;
  projectile.dy = 0;
}

export function updateProjectileMotion(
  pool: ProjectilePool,
  dt: number,
  bounds: ProjectileBounds,
): void {
  for (let i = pool.activeCount - 1; i >= 0; i -= 1) {
    const projectile = pool.items[i] as ProjectileEntity;
    projectile.prevX = projectile.x;
    projectile.prevY = projectile.y;
    projectile.ageSec += dt;

    if (projectile.hitMode === 'tick' && projectile.orbitRadius > 0) {
      syncOrbitProjectile(projectile, dt);
      projectile.x = wrapX(projectile.x, bounds);
      projectile.y = wrapY(projectile.y, bounds);
    } else {
      if (projectile.hitMode === 'boomerang' && !projectile.boomerangTurned) {
        if (projectile.ageSec >= projectile.maxLifeSec * 0.5) {
          projectile.dx = -projectile.dx;
          projectile.dy = -projectile.dy;
          projectile.boomerangTurned = true;
        }
      }
      projectile.x = wrapX(projectile.x + projectile.dx * dt, bounds);
      projectile.y = wrapY(projectile.y + projectile.dy * dt, bounds);
    }

    if (Math.abs(projectile.x - projectile.prevX) > (bounds.maxX - bounds.minX) * 0.5) {
      projectile.prevX = projectile.x;
    }
    if (Math.abs(projectile.y - projectile.prevY) > (bounds.maxY - bounds.minY) * 0.5) {
      projectile.prevY = projectile.y;
    }

    if (projectile.radiusGrowthPerSec !== 0) {
      projectile.radius += projectile.radiusGrowthPerSec * dt;
      projectile.areaRadius = projectile.radius;
    }

    if (projectile.damageTimerSec > 0) {
      projectile.damageTimerSec -= dt;
      if (projectile.damageTimerSec < 0) projectile.damageTimerSec = 0;
    }

    projectile.lifeSec -= dt;

    if (projectile.lifeSec <= 0) {
      pool.release(projectile);
    }
  }
}

function createProjectile(): ProjectileEntity {
  return {
    kind: 'projectile',
    active: false,
    weaponId: 'hydrogen_arrow',
    hitMode: 'single',
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    dx: 0,
    dy: 0,
    radius: 0,
    paletteGroup: 0,
    shape: ENTITY_SHAPES.icon,
    icon: WEAPONS.hydrogen_arrow.icon,
    paletteIndex: 0,
    symbol: 'H',
    accessoryKind: 1,
    damage: 0,
    damageIntervalSec: 0,
    damageTimerSec: 0,
    lifeSec: 0,
    maxLifeSec: 0,
    ageSec: 0,
    ownerX: 0,
    ownerY: 0,
    orbitRadius: 0,
    orbitAngleRad: 0,
    orbitAngularSpeed: 0,
    radiusGrowthPerSec: 0,
    areaRadius: 0,
    boomerangTurned: false,
    poolIndex: -1,
    poolSeq: 0,
  };
}

function resetProjectile(projectile: ProjectileEntity): void {
  projectile.active = false;
  projectile.hitMode = 'single';
  projectile.x = 0;
  projectile.y = 0;
  projectile.prevX = 0;
  projectile.prevY = 0;
  projectile.dx = 0;
  projectile.dy = 0;
  projectile.radius = 0;
  projectile.damage = 0;
  projectile.damageIntervalSec = 0;
  projectile.damageTimerSec = 0;
  projectile.lifeSec = 0;
  projectile.maxLifeSec = 0;
  projectile.ageSec = 0;
  projectile.ownerX = 0;
  projectile.ownerY = 0;
  projectile.orbitRadius = 0;
  projectile.orbitAngleRad = 0;
  projectile.orbitAngularSpeed = 0;
  projectile.radiusGrowthPerSec = 0;
  projectile.areaRadius = 0;
  projectile.boomerangTurned = false;
}

function syncOrbitProjectile(projectile: ProjectileEntity, dt: number): void {
  projectile.orbitAngleRad += projectile.orbitAngularSpeed * dt;
  projectile.x = projectile.ownerX + Math.cos(projectile.orbitAngleRad) * projectile.orbitRadius;
  projectile.y = projectile.ownerY + Math.sin(projectile.orbitAngleRad) * projectile.orbitRadius;
}
