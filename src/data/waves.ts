import type { EnemyId } from './enemies.js';

export interface WaveEntry {
  readonly startSec: number;
  readonly enemyId: EnemyId;
  readonly baseSpawnPerMinute: number;
}

export const DENSITY_GROWTH_PER_MIN = 0.28;
export const HP_GROWTH_PER_MIN = 0.12;

export const SPAWN_MIN_PLAYER_DISTANCE = 400;
export const SPAWN_RING_MARGIN = 64;

export const WAVES = [
  {
    startSec: 0,
    enemyId: 'radon',
    baseSpawnPerMinute: 36,
  },
  {
    startSec: 60,
    enemyId: 'sodium',
    baseSpawnPerMinute: 18,
  },
  {
    startSec: 120,
    enemyId: 'iridium',
    baseSpawnPerMinute: 6,
  },
  {
    startSec: 120,
    enemyId: 'iodine',
    baseSpawnPerMinute: 6,
  },
  {
    startSec: 180,
    enemyId: 'lead',
    baseSpawnPerMinute: 10,
  },
  {
    startSec: 210,
    enemyId: 'uranium',
    baseSpawnPerMinute: 10,
  },
  {
    startSec: 270,
    enemyId: 'caesium',
    baseSpawnPerMinute: 8,
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
