import { BOSSES, FINAL_BOSS_ID, type BossId } from '../data/bosses.js';

export type TimelineEventKind = 'none' | 'spawn_boss' | 'result';
export type TimelineResultKind = 'none' | 'victory' | 'defeat' | 'timeout';

export interface BossTimelineState {
  firedBossMask: number;
  resultFired: boolean;
  eventSeq: number;
  latestEventKind: TimelineEventKind;
  latestBossId: BossId;
  latestResultKind: TimelineResultKind;
}

const BOSS_ORDER = ['technetium', 'polonium', 'oganesson'] as const satisfies readonly BossId[];
const RESULT_AT_SEC = 600;
const NO_BOSS_ID: BossId = 'technetium';

export function createBossTimelineState(): BossTimelineState {
  return {
    firedBossMask: 0,
    resultFired: false,
    eventSeq: 0,
    latestEventKind: 'none',
    latestBossId: NO_BOSS_ID,
    latestResultKind: 'none',
  };
}

export function updateBossTimeline(
  timeline: BossTimelineState,
  elapsedSec: number,
  playerHealth: number,
  oganessonDefeated: boolean,
): TimelineEventKind {
  timeline.latestEventKind = 'none';
  timeline.latestResultKind = 'none';

  if (playerHealth <= 0) return publishResult(timeline, 'defeat');

  for (let i = 0; i < BOSS_ORDER.length; i += 1) {
    const bossId = BOSS_ORDER[i];
    const bossBit = 1 << i;
    if ((timeline.firedBossMask & bossBit) !== 0) continue;
    if (elapsedSec < BOSSES[bossId].spawnAtSec) continue;
    timeline.firedBossMask |= bossBit;
    timeline.latestBossId = bossId;
    timeline.latestEventKind = 'spawn_boss';
    timeline.eventSeq += 1;
    return 'spawn_boss';
  }

  if (elapsedSec >= RESULT_AT_SEC) {
    return publishResult(timeline, oganessonDefeated ? 'victory' : 'timeout');
  }

  return 'none';
}

export function hasBossSpawned(timeline: BossTimelineState, bossId: BossId): boolean {
  const index = bossIndex(bossId);
  return (timeline.firedBossMask & (1 << index)) !== 0;
}

export function isVictory(elapsedSec: number, playerHealth: number, oganessonDefeated: boolean): boolean {
  return playerHealth > 0 && elapsedSec >= RESULT_AT_SEC && oganessonDefeated;
}

export function isDefeat(playerHealth: number): boolean {
  return playerHealth <= 0;
}

export function isFinalBoss(bossId: BossId): boolean {
  return bossId === FINAL_BOSS_ID;
}

function publishResult(
  timeline: BossTimelineState,
  resultKind: Exclude<TimelineResultKind, 'none'>,
): TimelineEventKind {
  if (timeline.resultFired) return 'none';
  timeline.resultFired = true;
  timeline.latestEventKind = 'result';
  timeline.latestResultKind = resultKind;
  timeline.eventSeq += 1;
  return 'result';
}

function bossIndex(bossId: BossId): number {
  if (bossId === 'technetium') return 0;
  if (bossId === 'polonium') return 1;
  return 2;
}
