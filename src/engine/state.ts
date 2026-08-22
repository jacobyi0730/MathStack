import { FIELD_BOUNDS } from '../data/characters.js';
import { MAX_ACTIVE_ENEMIES } from '../data/enemies.js';
import { createBossPool, type BossPool } from '../entities/boss.js';
import { createCratePool, type CratePool } from '../entities/crate.js';
import { createDamageNumberPool, type DamageNumberPool } from '../entities/damage-number.js';
import { createEnemyPool, type EnemyPool } from '../entities/enemy.js';
import { createPickupPool, type PickupPool } from '../entities/pickup.js';
import type { PickupKind } from '../entities/pickup.js';
import { createPlayer, type Player } from '../entities/player.js';
import { createLevelState, type LevelState } from '../systems/level.js';
import { createCollisionState, type CollisionState } from '../systems/collision.js';
import { BASE_PICKUP_MAGNET_RADIUS, createPickupRuntime, type PickupRuntime } from '../systems/pickup.js';
import {
  createPassiveRuntime,
  recalcStats,
  type BasePlayerStats,
  type PassiveRuntime,
  type ResolvedPlayerStats,
} from '../systems/stats.js';
import { createBossTimelineState, type BossTimelineState } from '../systems/timeline.js';
import { createTrialState, type TrialState } from '../systems/trial.js';
import { createWeaponRuntime, type WeaponRuntime } from '../systems/weapons.js';
import { createQuizSession, type QuizSessionState } from '../quiz/session.js';
import { createSfxQueue, type SfxQueue } from '../audio/queue.js';
import { createBossHazardRuntime, type BossHazardRuntime } from '../systems/boss-hazard.js';
import { createEffectsState, type EffectsState } from './effects.js';
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
  crates: CratePool;
  pickups: PickupPool;
  weapons: WeaponRuntime;
  passives: PassiveRuntime;
  baseStats: BasePlayerStats;
  stats: ResolvedPlayerStats;
  bosses: BossPool;
  /** 보스 탄·장판·유성. 무기 투사체와 별도 풀이다 (03-전투확장 §9.3.2) */
  bossHazards: BossHazardRuntime;
  damageNumbers: DamageNumberPool;
  level: LevelState;
  pickupRuntime: PickupRuntime;
  timeline: BossTimelineState;
  trial: TrialState;
  quizSession: QuizSessionState;
  /** 화면 흔들림·히트스톱·파편. 수치가 아니라 감각만 바꾼다 */
  effects: EffectsState;
  /** 이번 프레임의 효과음 요청. 루프 밖에서 한 번에 비운다 */
  sfx: SfxQueue;
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
  crateSpawn: {
    accumulator: number;
    seed: number;
  };
  collision: CollisionState;
  combat: {
    defeatedEnemies: number;
    /** 처치 보상 굴림용 씨앗. 스폰 씨앗과 분리해 둔다 */
    dropSeed: number;
  };
  specialRewards: {
    pendingQuizRewards: SpecialRewardQuiz[];
  };
  entities: RenderableEntity[];
}

export interface SpecialRewardQuiz {
  readonly pickupKind: Extract<PickupKind, 'magnet' | 'meteor'>;
  readonly x: number;
  readonly y: number;
}

export interface GameStateOptions {
  player: Player;
  entities?: RenderableEntity[];
}

export function createGameState(options?: GameStateOptions): GameState & RenderScene {
  const player = options?.player ?? createPlayer('actinium');
  const enemies = createEnemyPool(MAX_ACTIVE_ENEMIES);
  const crates = createCratePool();
  const pickups = createPickupPool();
  const weapons = createWeaponRuntime();
  const passives = createPassiveRuntime();
  const baseStats = createBasePlayerStats(player);
  const stats = recalcStats(baseStats, passives);
  const bosses = createBossPool();
  const entities = options?.entities ?? createEntityList(player, enemies, crates, pickups, weapons, bosses);
  return {
    elapsedSec: 0,
    ticks: 0,
    entityCount: entities.length,
    world: { ...FIELD_BOUNDS },
    input: createInputState(),
    player,
    enemies,
    crates,
    pickups,
    weapons,
    passives,
    baseStats,
    stats,
    bosses,
    bossHazards: createBossHazardRuntime(),
    damageNumbers: createDamageNumberPool(),
    level: createLevelState(),
    pickupRuntime: createPickupRuntime(),
    timeline: createBossTimelineState(),
    trial: createTrialState(),
    quizSession: createQuizSession(3),
    effects: createEffectsState(),
    sfx: createSfxQueue(),
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
    crateSpawn: {
      accumulator: 0,
      seed: 0x1a3b5c7,
    },
    collision: createCollisionState(),
    combat: {
      defeatedEnemies: 0,
      dropSeed: 0xc0ffee,
    },
    specialRewards: {
      pendingQuizRewards: [],
    },
    entities,
  };
}

function createBasePlayerStats(player: Player): BasePlayerStats {
  return {
    maxHealth: player.maxHealth,
    moveSpeed: player.moveSpeed,
    projectileCount: player.projectileCount,
    attackPowerMultiplier: player.attackPowerMultiplier,
    attackRangeMultiplier: player.attackRangeMultiplier,
    cooldownMultiplier: player.cooldownMultiplier,
    magnetRadius: BASE_PICKUP_MAGNET_RADIUS,
    healthRegenPerSec: 0,
    luck: 1,
  };
}

function createEntityList(
  player: Player,
  enemies: EnemyPool,
  crates: CratePool,
  pickups: PickupPool,
  weapons: WeaponRuntime,
  bosses: BossPool,
): RenderableEntity[] {
  const entities = new Array<RenderableEntity>(
    enemies.capacity +
      crates.capacity +
      pickups.capacity +
      weapons.projectiles.capacity +
      bosses.capacity +
      1,
  );
  entities[0] = player;
  let cursor = 1;
  for (let i = 0; i < enemies.capacity; i += 1) {
    entities[cursor] = enemies.items[i] as RenderableEntity;
    cursor += 1;
  }
  for (let i = 0; i < crates.capacity; i += 1) {
    entities[cursor] = crates.items[i] as RenderableEntity;
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
