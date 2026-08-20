import type { EnemyId } from './enemies.js';

export interface WaveEntry {
  readonly startSec: number;
  readonly enemyId: EnemyId;
  readonly baseSpawnPerMinute: number;
}

export const DENSITY_GROWTH_PER_MIN = 0.35;
export const HP_GROWTH_PER_MIN = 0.18;

export const SPAWN_MIN_PLAYER_DISTANCE = 400;
export const SPAWN_RING_MARGIN = 64;

export const WAVES = [
  {
    startSec: 0,
    enemyId: 'radon',
    baseSpawnPerMinute: 36,
  },
] as const satisfies readonly WaveEntry[];

export function getActiveWave(elapsedSec: number): WaveEntry {
  let active = WAVES[0];
  for (let i = 1; i < WAVES.length; i += 1) {
    const wave = WAVES[i];
    if (elapsedSec >= wave.startSec) active = wave;
  }
  return active;
}
