export const LEVEL_START = 1;
export const LEVEL_EVENT_QUEUE_CAPACITY = 16;

export type LevelEventKind = 'levelup';

export interface LevelEvent {
  kind: LevelEventKind;
  level: number;
  pendingChoices: number;
}

export function getRequiredXpForLevel(level: number): number {
  if (level < LEVEL_START) {
    throw new Error(`Level must be at least ${LEVEL_START}: ${level}`);
  }

  return Math.round(6 + level * 4 + Math.max(0, level - 1) * 1.5);
}
