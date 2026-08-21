import { describe, expect, it } from 'vitest';
import { LEVEL_EVENT_QUEUE_CAPACITY, getRequiredXpForLevel } from '../../src/data/level.js';
import { addExperience, createLevelState, shiftLevelEvent } from '../../src/systems/level.js';

describe('level system', () => {
  it('uses_the_documented_xp_curve', () => {
    expect(getRequiredXpForLevel(1)).toBe(10);
    expect(getRequiredXpForLevel(5)).toBe(32);
    expect(getRequiredXpForLevel(10)).toBe(60);
    expect(getRequiredXpForLevel(18)).toBe(104);
  });

  it('queues_levelup_events_with_three_pending_choices', () => {
    const level = createLevelState();

    const gained = addExperience(level, 10);

    expect(gained).toBe(1);
    expect(level.level).toBe(2);
    expect(level.xp).toBe(0);
    expect(level.queuedCount).toBe(1);
    expect(level.events[0]).toEqual({ kind: 'levelup', level: 2, pendingChoices: 3 });
  });

  it('keeps_leftover_xp_after_multiple_levelups', () => {
    const level = createLevelState();

    addExperience(level, 30);

    expect(level.level).toBe(3);
    expect(level.xp).toBe(4);
    expect(level.xpForNextLevel).toBe(getRequiredXpForLevel(3));
    expect(level.queuedCount).toBe(2);
  });

  it('uses_a_fixed_level_event_queue', () => {
    const level = createLevelState();

    addExperience(level, 100000);

    expect(level.queuedCount).toBe(LEVEL_EVENT_QUEUE_CAPACITY);
    expect(level.droppedEvents).toBeGreaterThan(0);
    expect(shiftLevelEvent(level)?.level).toBe(2);
    expect(level.queuedCount).toBe(LEVEL_EVENT_QUEUE_CAPACITY - 1);
  });
});
