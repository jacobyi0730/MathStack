import { WEAPONS, type WeaponId } from '../data/weapons.js';
import { createPool, type Pool, type Poolable } from '../engine/pool.js';
import type { RenderableEntity } from '../engine/renderer.js';

export const MAX_ACTIVE_PROJECTILES = 200;

export interface ProjectileEntity extends RenderableEntity, Poolable {
  kind: 'projectile';
  active: boolean;
  weaponId: WeaponId;
  damage: number;
  lifeSec: number;
  ownerX: number;
  ownerY: number;
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
  projectile.x = x;
  projectile.y = y;
  projectile.prevX = x;
  projectile.prevY = y;
  projectile.dx = dirX * speed;
  projectile.dy = dirY * speed;
  projectile.radius = definition.projectileRadius * rangeMultiplier;
  projectile.damage = damage;
  projectile.lifeSec = lifeSec;
  projectile.ownerX = x;
  projectile.ownerY = y;
  projectile.symbol = definition.element;
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
    projectile.x += projectile.dx * dt;
    projectile.y += projectile.dy * dt;
    projectile.lifeSec -= dt;

    if (projectile.lifeSec <= 0 || isOutside(projectile, bounds)) {
      pool.release(projectile);
    }
  }
}

function createProjectile(): ProjectileEntity {
  return {
    kind: 'projectile',
    active: false,
    weaponId: 'hydrogen_arrow',
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    dx: 0,
    dy: 0,
    radius: 0,
    paletteGroup: 0,
    paletteIndex: 0,
    symbol: 'H',
    accessoryKind: 1,
    damage: 0,
    lifeSec: 0,
    ownerX: 0,
    ownerY: 0,
    poolIndex: -1,
    poolSeq: 0,
  };
}

function resetProjectile(projectile: ProjectileEntity): void {
  projectile.active = false;
  projectile.x = 0;
  projectile.y = 0;
  projectile.prevX = 0;
  projectile.prevY = 0;
  projectile.dx = 0;
  projectile.dy = 0;
  projectile.radius = 0;
  projectile.damage = 0;
  projectile.lifeSec = 0;
  projectile.ownerX = 0;
  projectile.ownerY = 0;
}

function isOutside(projectile: ProjectileEntity, bounds: ProjectileBounds): boolean {
  return (
    projectile.x + projectile.radius < bounds.minX ||
    projectile.x - projectile.radius > bounds.maxX ||
    projectile.y + projectile.radius < bounds.minY ||
    projectile.y - projectile.radius > bounds.maxY
  );
}
