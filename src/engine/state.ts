import { FIELD_BOUNDS } from '../data/characters.js';
import { MAX_ACTIVE_ENEMIES } from '../data/enemies.js';
import { createBossPool, type BossPool } from '../entities/boss.js';
import { createEnemyPool, type EnemyPool } from '../entities/enemy.js';
import { createPickupPool, type PickupPool } from '../entities/pickup.js';
import { createPlayer, type Player } from '../entities/player.js';
import { createLevelState, type LevelState } from '../systems/level.js';
import { createCollisionState, type CollisionState } from '../systems/collision.js';
import { createPickupRuntime, type PickupRuntime } from '../systems/pickup.js';
import { createBossTimelineState, type BossTimelineState } from '../systems/timeline.js';
import { createWeaponRuntime, type WeaponRuntime } from '../systems/weapons.js';
import { createInputState, type InputState } from './input.js';
import type { RenderableEntity, RenderScene } from './renderer.js';

export interface GameState {
  elapsedSec: number;
  ticks: number;
  entityCount: number;
  world: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  input: InputState;
  player: Player;
  enemies: EnemyPool;
  pickups: PickupPool;
  weapons: WeaponRuntime;
  bosses: BossPool;
  level: LevelState;
  pickupRuntime: PickupRuntime;
  timeline: BossTimelineState;
  viewport: {
    width: number;
    height: number;
  };
  spawn: {
    accumulator: number;
    seed: number;
    sideCursor: number;
    nextX: number;
    nextY: number;
  };
  collision: CollisionState;
  combat: {
    pendingXp: number;
    pendingShards: number;
    defeatedEnemies: number;
  };
  entities: RenderableEntity[];
}

export interface GameStateOptions {
  player: Player;
  entities?: RenderableEntity[];
}

export function createGameState(options?: GameStateOptions): GameState & RenderScene {
  const player = options?.player ?? createPlayer('hydrogen');
  const enemies = createEnemyPool(MAX_ACTIVE_ENEMIES);
  const pickups = createPickupPool();
  const weapons = createWeaponRuntime();
  const bosses = createBossPool();
  const entities = options?.entities ?? createEntityList(player, enemies, pickups, weapons, bosses);
  return {
    elapsedSec: 0,
    ticks: 0,
    entityCount: entities.length,
    world: { ...FIELD_BOUNDS },
    input: createInputState(),
    player,
    enemies,
    pickups,
    weapons,
    bosses,
    level: createLevelState(),
    pickupRuntime: createPickupRuntime(),
    timeline: createBossTimelineState(),
    viewport: {
      width: 1280,
      height: 720,
    },
    spawn: {
      accumulator: 0,
      seed: 0x5eed007,
      sideCursor: 0,
      nextX: 0,
      nextY: 0,
    },
    collision: createCollisionState(),
    combat: {
      pendingXp: 0,
      pendingShards: 0,
      defeatedEnemies: 0,
    },
    entities,
  };
}

function createEntityList(
  player: Player,
  enemies: EnemyPool,
  pickups: PickupPool,
  weapons: WeaponRuntime,
  bosses: BossPool,
): RenderableEntity[] {
  const entities = new Array<RenderableEntity>(
    enemies.capacity + pickups.capacity + weapons.projectiles.capacity + bosses.capacity + 1,
  );
  entities[0] = player;
  let cursor = 1;
  for (let i = 0; i < enemies.capacity; i += 1) {
    entities[cursor] = enemies.items[i] as RenderableEntity;
    cursor += 1;
  }
  for (let i = 0; i < weapons.projectiles.capacity; i += 1) {
    entities[cursor] = weapons.projectiles.items[i] as RenderableEntity;
    cursor += 1;
  }
  for (let i = 0; i < pickups.capacity; i += 1) {
    entities[cursor] = pickups.items[i] as RenderableEntity;
    cursor += 1;
  }
  for (let i = 0; i < bosses.capacity; i += 1) {
    entities[cursor] = bosses.items[i] as RenderableEntity;
    cursor += 1;
  }
  return entities;
}
