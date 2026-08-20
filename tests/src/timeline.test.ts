import { describe, expect, it } from 'vitest';
import {
  createBossTimelineState,
  hasBossSpawned,
  isDefeat,
  isFinalBoss,
  isVictory,
  updateBossTimeline,
} from '../../src/systems/timeline.js';

describe('boss timeline', () => {
  it('publishes boss spawn events at 3, 6, and 9 minutes only once', () => {
    const timeline = createBossTimelineState();

    expect(updateBossTimeline(timeline, 179.9, 100, false)).toBe('none');

    expect(updateBossTimeline(timeline, 180, 100, false)).toBe('spawn_boss');
    expect(timeline.latestBossId).toBe('technetium');
    expect(updateBossTimeline(timeline, 180, 100, false)).toBe('none');

    expect(updateBossTimeline(timeline, 360, 100, false)).toBe('spawn_boss');
    expect(timeline.latestBossId).toBe('polonium');

    expect(updateBossTimeline(timeline, 540, 100, false)).toBe('spawn_boss');
    expect(timeline.latestBossId).toBe('oganesson');
    expect(hasBossSpawned(timeline, 'oganesson')).toBe(true);
  });

  it('publishes defeat immediately and prevents duplicate results', () => {
    const timeline = createBossTimelineState();

    expect(updateBossTimeline(timeline, 20, 0, false)).toBe('result');
    expect(timeline.latestResultKind).toBe('defeat');
    expect(updateBossTimeline(timeline, 21, 0, false)).toBe('none');
  });

  it('publishes victory only after ten minutes and final boss defeat', () => {
    const timeline = createBossTimelineState();

    updateBossTimeline(timeline, 180, 100, false);
    updateBossTimeline(timeline, 360, 100, false);
    updateBossTimeline(timeline, 540, 100, false);

    expect(updateBossTimeline(timeline, 599.9, 100, true)).toBe('none');
    expect(updateBossTimeline(timeline, 600, 100, true)).toBe('result');
    expect(timeline.latestResultKind).toBe('victory');
    expect(isVictory(600, 100, true)).toBe(true);
  });

  it('publishes timeout when ten minutes pass before oganesson is defeated', () => {
    const timeline = createBossTimelineState();

    updateBossTimeline(timeline, 180, 100, false);
    updateBossTimeline(timeline, 360, 100, false);
    updateBossTimeline(timeline, 540, 100, false);

    expect(updateBossTimeline(timeline, 600, 100, false)).toBe('result');
    expect(timeline.latestResultKind).toBe('timeout');
    expect(isVictory(600, 100, false)).toBe(false);
    expect(isDefeat(0)).toBe(true);
    expect(isFinalBoss('oganesson')).toBe(true);
  });
});
