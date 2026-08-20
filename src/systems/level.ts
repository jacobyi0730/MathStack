import {
  LEVEL_EVENT_QUEUE_CAPACITY,
  LEVEL_START,
  getRequiredXpForLevel,
  type LevelEvent,
} from '../data/level.js';

export interface LevelState {
  level: number;
  xp: number;
  xpForNextLevel: number;
  totalXp: number;
  queuedCount: number;
  droppedEvents: number;
  events: LevelEvent[];
}

export interface CombatXpSource {
  pendingXp: number;
}

export function createLevelState(): LevelState {
  return {
    level: LEVEL_START,
    xp: 0,
    xpForNextLevel: getRequiredXpForLevel(LEVEL_START),
    totalXp: 0,
    queuedCount: 0,
    droppedEvents: 0,
    events: createLevelEventQueue(),
  };
}

export function addExperience(level: LevelState, xp: number): number {
  if (xp <= 0) return 0;

  level.xp += xp;
  level.totalXp += xp;

  let gainedLevels = 0;
  while (level.xp >= level.xpForNextLevel) {
    level.xp -= level.xpForNextLevel;
    level.level += 1;
    level.xpForNextLevel = getRequiredXpForLevel(level.level);
    queueLevelUp(level, level.level);
    gainedLevels += 1;
  }

  return gainedLevels;
}

export function consumeCombatPendingXp(level: LevelState, combat: CombatXpSource): number {
  const xp = combat.pendingXp;
  if (xp <= 0) return 0;

  combat.pendingXp = 0;
  addExperience(level, xp);
  return xp;
}

export function shiftLevelEvent(level: LevelState): LevelEvent | undefined {
  if (level.queuedCount <= 0) return undefined;

  const event = level.events[0];
  const result = { kind: event.kind, level: event.level, pendingChoices: event.pendingChoices };
  for (let i = 1; i < level.queuedCount; i += 1) {
    const current = level.events[i] as LevelEvent;
    level.events[i - 1].kind = current.kind;
    level.events[i - 1].level = current.level;
    level.events[i - 1].pendingChoices = current.pendingChoices;
  }

  level.queuedCount -= 1;
  return result;
}

function createLevelEventQueue(): LevelEvent[] {
  const events = new Array<LevelEvent>(LEVEL_EVENT_QUEUE_CAPACITY);
  for (let i = 0; i < LEVEL_EVENT_QUEUE_CAPACITY; i += 1) {
    events[i] = { kind: 'levelup', level: 0, pendingChoices: 0 };
  }
  return events;
}

function queueLevelUp(level: LevelState, nextLevel: number): void {
  if (level.queuedCount >= LEVEL_EVENT_QUEUE_CAPACITY) {
    level.droppedEvents += 1;
    return;
  }

  const event = level.events[level.queuedCount] as LevelEvent;
  event.kind = 'levelup';
  event.level = nextLevel;
  event.pendingChoices = 3;
  level.queuedCount += 1;
}
