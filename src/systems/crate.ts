import {
  CRATES,
  CRATE_DROP_SCATTER_MAX_PX,
  CRATE_DROP_SCATTER_MIN_PX,
  CRATE_MIN_PLAYER_DISTANCE,
  CRATE_SPAWN_INTERVAL_SEC,
  CRATE_SPAWN_SPREAD,
  MAX_ACTIVE_CRATES,
  chooseCrateDropKind,
  chooseCrateId,
} from '../data/crates.js';
import type { GameState } from '../engine/state.js';
import { wrapX, wrapY, wrappedDistanceSq } from '../engine/world.js';
import { applyCrateDamage, spawnCrate, type CrateEntity } from '../entities/crate.js';
import type { ProjectileEntity } from '../entities/projectile.js';
import { spawnPickupByKind } from './pickup.js';

/**
 * 원소 램프의 등장과 파괴 (02-게임코어 §10.2).
 *
 * 램프는 적이 아니다 — 공간 해시에 넣지 않고 여기서만 다룬다. 동시 6개가 상한이라
 * 투사체 전수 비교로도 프레임 예산 안에 들어오고, 램프가 없으면 비용이 0이다.
 */
export function updateCrates(state: GameState, dt: number): void {
  spawnCratesOverTime(state, dt);
  breakCrates(state);
}

export function spawnCratesOverTime(state: GameState, dt: number): void {
  state.crateSpawn.accumulator += dt;

  while (state.crateSpawn.accumulator >= CRATE_SPAWN_INTERVAL_SEC) {
    state.crateSpawn.accumulator -= CRATE_SPAWN_INTERVAL_SEC;
    if (state.crates.activeCount >= MAX_ACTIVE_CRATES) continue;
    spawnCrateNearPlayer(state);
  }
}

export function spawnCrateNearPlayer(state: GameState): CrateEntity {
  const angle = nextCrateRandom(state) * Math.PI * 2;
  const distance = CRATE_MIN_PLAYER_DISTANCE + nextCrateRandom(state) * CRATE_SPAWN_SPREAD;
  const definition = CRATES[chooseCrateId(nextCrateRandom(state))];
  const crate = state.crates.acquire();

  spawnCrate(
    crate,
    definition,
    wrapX(state.player.x + Math.cos(angle) * distance, state.world),
    wrapY(state.player.y + Math.sin(angle) * distance, state.world),
  );
  return crate;
}

/** 플레이어가 스치거나 투사체가 닿으면 깨진다. 체력이 1이라 무엇이 닿았는지는 중요하지 않다 */
export function breakCrates(state: GameState): number {
  const pool = state.crates;
  if (pool.activeCount === 0) return 0;

  let broken = 0;
  for (let i = pool.activeCount - 1; i >= 0; i -= 1) {
    const crate = pool.items[i] as CrateEntity;
    crate.prevX = crate.x;
    crate.prevY = crate.y;

    if (!isCrateHit(state, crate)) continue;
    if (!applyCrateDamage(crate, crate.hp)) continue;

    dropCrateItems(state, crate);
    pool.release(crate);
    broken += 1;
  }

  return broken;
}

/**
 * 램프가 깨진 자리 **주변에** 아이템을 흩뿌린다.
 *
 * 램프 자리에 그대로 놓으면 깬 순간 플레이어가 이미 그 위에 있어 즉시 발동된다.
 * 흩어진 아이템을 보고 어느 것부터 주울지 고르는 순간이 이 게임의 재미다.
 */
export function dropCrateItems(state: GameState, crate: CrateEntity): void {
  const luck = state.stats.luck;
  const scatterSpan = CRATE_DROP_SCATTER_MAX_PX - CRATE_DROP_SCATTER_MIN_PX;
  // 같은 방향으로 몰리지 않게 원을 등분하고, 그 안에서만 흔든다
  const baseAngle = nextCrateRandom(state) * Math.PI * 2;
  const step = (Math.PI * 2) / Math.max(1, crate.dropCount);

  for (let i = 0; i < crate.dropCount; i += 1) {
    const kind = chooseCrateDropKind(nextCrateRandom(state), luck);
    const angle = baseAngle + step * i + (nextCrateRandom(state) - 0.5) * step * 0.6;
    const distance = CRATE_DROP_SCATTER_MIN_PX + nextCrateRandom(state) * scatterSpan;
    spawnPickupByKind(
      state.pickups,
      kind,
      wrapX(crate.x + Math.cos(angle) * distance, state.world),
      wrapY(crate.y + Math.sin(angle) * distance, state.world),
    );
  }
}

function isCrateHit(state: GameState, crate: CrateEntity): boolean {
  const contactRadius = state.player.radius + crate.radius;
  if (
    wrappedDistanceSq(state.player.x, state.player.y, crate.x, crate.y, state.world) <=
    contactRadius * contactRadius
  ) {
    return true;
  }

  const projectiles = state.weapons.projectiles;
  for (let i = projectiles.activeCount - 1; i >= 0; i -= 1) {
    const projectile = projectiles.items[i] as ProjectileEntity;
    const hitRadius = Math.max(projectile.radius, projectile.areaRadius) + crate.radius;
    if (
      wrappedDistanceSq(projectile.x, projectile.y, crate.x, crate.y, state.world) <=
      hitRadius * hitRadius
    ) {
      return true;
    }
  }

  return false;
}

function nextCrateRandom(state: GameState): number {
  state.crateSpawn.seed = (state.crateSpawn.seed * 1664525 + 1013904223) >>> 0;
  return state.crateSpawn.seed / 4294967296;
}
