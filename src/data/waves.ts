import type { EnemyId } from './enemies.js';

export interface WaveEntry {
  readonly startSec: number;
  readonly enemyId: EnemyId;
  readonly baseSpawnPerMinute: number;
}

export const DENSITY_GROWTH_PER_MIN = 0.22;
export const HP_GROWTH_PER_MIN = 0.08;

export const SPAWN_MIN_PLAYER_DISTANCE = 400;
export const SPAWN_RING_MARGIN = 64;

export const SPECIAL_REWARD_ENEMY_SPAWN_PER_MINUTE = 1;

export const WAVES = [
  {
    startSec: 0,
    enemyId: 'radon',
    baseSpawnPerMinute: 12,
  },
  {
    startSec: 60,
    enemyId: 'sodium',
    baseSpawnPerMinute: 12,
  },
  {
    startSec: 120,
    enemyId: 'iridium',
    baseSpawnPerMinute: SPECIAL_REWARD_ENEMY_SPAWN_PER_MINUTE,
  },
  {
    startSec: 120,
    enemyId: 'iodine',
    baseSpawnPerMinute: SPECIAL_REWARD_ENEMY_SPAWN_PER_MINUTE,
  },
  {
    startSec: 180,
    enemyId: 'lead',
    baseSpawnPerMinute: 7,
  },
  {
    startSec: 210,
    enemyId: 'uranium',
    baseSpawnPerMinute: 7,
  },
  {
    startSec: 270,
    enemyId: 'caesium',
    baseSpawnPerMinute: 6,
  },
] as const satisfies readonly WaveEntry[];

export function getActiveWave(elapsedSec: number): WaveEntry {
  let active: WaveEntry = WAVES[0];
  for (let i = 1; i < WAVES.length; i += 1) {
    const wave = WAVES[i];
    if (elapsedSec >= wave.startSec) active = wave;
  }
  return active;
}

export function getActiveSpawnPerMinute(elapsedSec: number): number {
  let total = 0;
  for (let i = 0; i < WAVES.length; i += 1) {
    const wave = WAVES[i];
    if (elapsedSec >= wave.startSec) total += wave.baseSpawnPerMinute;
  }
  return total;
}

export function chooseActiveEnemyId(elapsedSec: number, roll: number): EnemyId {
  const total = getActiveSpawnPerMinute(elapsedSec);
  let cursor = roll * total;

  for (let i = 0; i < WAVES.length; i += 1) {
    const wave = WAVES[i];
    if (elapsedSec < wave.startSec) continue;
    cursor -= wave.baseSpawnPerMinute;
    if (cursor <= 0) return wave.enemyId;
  }

  return WAVES[0].enemyId;
}

export function chooseActiveRegularEnemyId(elapsedSec: number, roll: number): EnemyId {
  const total = getActiveRegularSpawnPerMinute(elapsedSec);
  if (total <= 0) return WAVES[0].enemyId;

  let cursor = roll * total;
  for (let i = 0; i < WAVES.length; i += 1) {
    const wave = WAVES[i];
    if (elapsedSec < wave.startSec || isSpecialRewardEnemyId(wave.enemyId)) continue;
    cursor -= wave.baseSpawnPerMinute;
    if (cursor <= 0) return wave.enemyId;
  }

  return WAVES[0].enemyId;
}

export function getSpecialRewardEnemyLimit(elapsedSec: number): number {
  if (elapsedSec >= 540) return 5;
  if (elapsedSec >= 420) return 4;
  if (elapsedSec >= 300) return 3;
  if (elapsedSec >= 180) return 2;
  return 1;
}

export function isSpecialRewardEnemyId(enemyId: EnemyId): boolean {
  return enemyId === 'iridium' || enemyId === 'iodine';
}

function getActiveRegularSpawnPerMinute(elapsedSec: number): number {
  let total = 0;
  for (let i = 0; i < WAVES.length; i += 1) {
    const wave = WAVES[i];
    if (elapsedSec >= wave.startSec && !isSpecialRewardEnemyId(wave.enemyId)) {
      total += wave.baseSpawnPerMinute;
    }
  }
  return total;
}
