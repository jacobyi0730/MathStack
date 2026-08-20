import { FIELD_BOUNDS } from '../data/characters.js';
import { MAX_ACTIVE_ENEMIES } from '../data/enemies.js';
import { createEnemyPool, type EnemyPool } from '../entities/enemy.js';
import { createPlayer, type Player } from '../entities/player.js';
import { createCollisionState, type CollisionState } from '../systems/collision.js';
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
  const entities = options?.entities ?? createEntityList(player, enemies);
  return {
    elapsedSec: 0,
    ticks: 0,
    entityCount: entities.length,
    world: { ...FIELD_BOUNDS },
    input: createInputState(),
    player,
    enemies,
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

function createEntityList(player: Player, enemies: EnemyPool): RenderableEntity[] {
  const entities = new Array<RenderableEntity>(enemies.capacity + 1);
  entities[0] = player;
  for (let i = 0; i < enemies.capacity; i += 1) {
    entities[i + 1] = enemies.items[i] as RenderableEntity;
  }
  return entities;
}
