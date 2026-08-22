import { describe, expect, it } from 'vitest';
import { BOSSES, MAX_ACTIVE_BOSSES, type BossId } from '../../src/data/bosses.js';
import {
  applyBossDamage,
  createBossPool,
  defeatBoss,
  spawnBoss,
  updateBoss,
  updateBosses,
} from '../../src/entities/boss.js';

const EXPECTED_BOSSES = {
  technetium: ['Tc', 43, 180, 1200, 'clone'],
  polonium: ['Po', 84, 360, 2800, 'split_barrage'],
  oganesson: ['Og', 118, 540, 9000, 'three_phase_decay'],
} as const satisfies Record<BossId, readonly [string, number, number, number, string]>;

describe('boss entities', () => {
  it('defines the three T-015 bosses with document stats and reasons', () => {
    for (const id of Object.keys(EXPECTED_BOSSES) as BossId[]) {
      const [element, atomicNumber, spawnAtSec, hp, pattern] = EXPECTED_BOSSES[id];
      const boss = BOSSES[id];

      expect(boss.element).toBe(element);
      expect(boss.atomicNumber).toBe(atomicNumber);
      expect(boss.spawnAtSec).toBe(spawnAtSec);
      expect(boss.hp).toBe(hp);
      expect(boss.pattern).toBe(pattern);
      expect(boss.mathReason.length).toBeGreaterThan(0);
      expect(boss.elementReason.length).toBeGreaterThan(0);
    }
  });

  it('reuses the fixed boss pool and resets pattern state', () => {
    const pool = createBossPool();
    const before = pool.allocations;

    for (const id of Object.keys(BOSSES) as BossId[]) {
      const boss = pool.acquire();
      spawnBoss(boss, BOSSES[id], 0, 0);
      boss.cloneSignalSeq = 3;
      boss.phase = 3;
      boss.rewardQueued = true;
    }

    expect(pool.activeCount).toBe(MAX_ACTIVE_BOSSES);
    expect(pool.allocations).toBe(before);
    expect(pool.recycles).toBe(0);

    const released = pool.items[0];
    pool.release(released);
    const reused = pool.acquire();
    spawnBoss(reused, BOSSES.technetium, 0, 0);

    expect(reused.cloneSignalSeq).toBe(0);
    expect(reused.phase).toBe(1);
    expect(reused.rewardQueued).toBe(false);
  });

  it('technetium records clone handoff signals every three seconds', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.technetium, 0, 0);

    updateBoss(boss, 100, 0, 2.9);
    expect(boss.cloneSignalSeq).toBe(0);

    updateBoss(boss, 100, 0, 0.1);
    expect(boss.cloneSignalSeq).toBe(1);
    expect(boss.cloneCount).toBe(2);
  });

  it('polonium records four-way barrage and deterministic teleport signals', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.polonium, 0, 0);

    updateBoss(boss, 10, 20, 2);
    expect(boss.barrageSignalSeq).toBe(1);
    expect(boss.barrageSplitCount).toBe(4);

    updateBoss(boss, 10, 20, 3);
    expect(boss.teleportSignalSeq).toBe(1);
    expect(boss.x).toBe(270);
    expect(boss.y).toBe(200);
  });

  it('oganesson changes phases by hp thresholds and emits phase pattern signals', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.oganesson, 0, 0);

    expect(applyBossDamage(boss, 3100)).toBe(false);
    expect(boss.phase).toBe(2);
    expect(boss.phaseChangeSignalSeq).toBe(1);
    updateBoss(boss, 100, 0, 3);
    expect(boss.areaSignalSeq).toBe(1);

    expect(applyBossDamage(boss, 3100)).toBe(false);
    expect(boss.phase).toBe(3);
    expect(boss.phaseChangeSignalSeq).toBe(2);
    updateBoss(boss, 100, 0, 2.5);
    expect(boss.chargeSignalSeq).toBe(1);
  });

  it('boss defeat queues exactly one element capsule signal', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.technetium, 0, 0);

    expect(applyBossDamage(boss, BOSSES.technetium.hp)).toBe(true);
    expect(defeatBoss(pool, boss)).toBe('element_capsule');
    expect(defeatBoss(pool, boss)).toBe('none');
    expect(pool.activeCount).toBe(0);
  });

  it('updates 300 boss pattern frames without pool churn', () => {
    const pool = createBossPool(3);
    spawnBoss(pool.acquire(), BOSSES.technetium, -100, 0);
    spawnBoss(pool.acquire(), BOSSES.polonium, 0, 0);
    spawnBoss(pool.acquire(), BOSSES.oganesson, 100, 0);

    for (let i = 0; i < 300; i += 1) {
      updateBosses(pool, 0, 0, 1 / 60);
    }

    expect(pool.recycles).toBe(0);
    expect(pool.allocations).toBe(3);
  });
});
