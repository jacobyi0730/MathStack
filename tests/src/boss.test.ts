import { describe, expect, it } from 'vitest';
import {
  BOSSES,
  BOSS_PATTERNS,
  MAX_ACTIVE_BOSSES,
  MIN_TELEGRAPH_SEC,
  type BossId,
} from '../../src/data/bosses.js';
import {
  BOSS_SIGNALS,
  CHARGE_DASH,
  CHARGE_RECOVER,
  CHARGE_WINDUP,
  applyBossDamage,
  bossSignalCount,
  bossSignalPayload,
  consumeBossSignal,
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

/** 고정 스텝으로 시간을 흘린다. `updateBoss` 는 큰 dt 를 한 번 받는 걸 전제하지 않는다 */
function advance(
  boss: Parameters<typeof updateBoss>[0],
  seconds: number,
  targetX = 400,
  targetY = 0,
): void {
  const step = 1 / 60;
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += step) {
    updateBoss(boss, targetX, targetY, step);
  }
}

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
      boss.signalSeq[BOSS_SIGNALS.clone] = 3;
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

    expect(bossSignalCount(reused, BOSS_SIGNALS.clone)).toBe(0);
    expect(reused.phase).toBe(1);
    expect(reused.phaseIndex).toBe(0);
    expect(reused.rewardQueued).toBe(false);
  });
});

describe('boss phase rules (03-전투확장 §9.3.1)', () => {
  it('keeps technetium at one phase regardless of hp', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.technetium, 0, 0);

    applyBossDamage(boss, BOSSES.technetium.hp - 1);

    expect(BOSS_PATTERNS.technetium.phases).toHaveLength(1);
    expect(boss.phase).toBe(1);
    expect(bossSignalCount(boss, BOSS_SIGNALS.phase)).toBe(0);
  });

  it('moves polonium to phase 2 at 45% hp exactly once', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.polonium, 0, 0);

    applyBossDamage(boss, BOSSES.polonium.hp * 0.5);
    expect(boss.phase).toBe(1);

    applyBossDamage(boss, BOSSES.polonium.hp * 0.1);
    expect(boss.phase).toBe(2);
    expect(bossSignalCount(boss, BOSS_SIGNALS.phase)).toBe(1);

    applyBossDamage(boss, BOSSES.polonium.hp * 0.1);
    expect(bossSignalCount(boss, BOSS_SIGNALS.phase)).toBe(1);
  });

  it('moves oganesson through 66% and 33% once each', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.oganesson, 0, 0);

    applyBossDamage(boss, BOSSES.oganesson.hp * 0.34);
    expect(boss.phase).toBe(2);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.phase)).toBe(2);

    applyBossDamage(boss, BOSSES.oganesson.hp * 0.34);
    expect(boss.phase).toBe(3);
    expect(bossSignalCount(boss, BOSS_SIGNALS.phase)).toBe(2);
  });

  it('freezes the boss while a phase transition plays out', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.polonium, 0, 0);

    applyBossDamage(boss, BOSSES.polonium.hp * 0.6);
    expect(boss.phaseFreezeSec).toBeCloseTo(BOSS_PATTERNS.polonium.phaseFreezeSec, 5);

    const startX = boss.x;
    advance(boss, 0.5);
    expect(boss.x).toBe(startX);
    // 전환 정지 중에는 새 패턴이 시작되지 않는다
    expect(bossSignalCount(boss, BOSS_SIGNALS.split)).toBe(0);

    advance(boss, 0.5);
    expect(boss.phaseFreezeSec).toBe(0);
  });
});

describe('technetium 1페이즈 패턴 (T-055)', () => {
  it('emits clones every 3.2s and an eight-bullet ring every 4.5s', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.technetium, 0, 0);

    advance(boss, 3.1);
    expect(bossSignalCount(boss, BOSS_SIGNALS.clone)).toBe(0);

    advance(boss, 0.2);
    expect(bossSignalCount(boss, BOSS_SIGNALS.clone)).toBe(1);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.clone)).toBe(2);

    advance(boss, 1.4);
    expect(bossSignalCount(boss, BOSS_SIGNALS.ring)).toBe(1);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.ring)).toBe(8);
  });

  it('fires bullets slower than the player walks', () => {
    // 문서 §9.3.3 — 탄속은 플레이어 기본 속도(260)의 약 55%
    expect(BOSS_PATTERNS.technetium.bulletSpeed).toBeLessThan(260 * 0.6);
  });
});

describe('폴로늄 2페이즈 패턴 (T-056)', () => {
  it('splits four ways in phase 1 and six ways in phase 2', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.polonium, 0, 0);

    advance(boss, 3.9);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.split)).toBe(4);
    expect(bossSignalCount(boss, BOSS_SIGNALS.zone)).toBe(0);

    applyBossDamage(boss, BOSSES.polonium.hp * 0.6);
    advance(boss, BOSS_PATTERNS.polonium.phaseFreezeSec + 4);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.split)).toBe(6);
  });

  it('lays three warned zones in phase 2', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.polonium, 0, 0);
    applyBossDamage(boss, BOSSES.polonium.hp * 0.6);

    advance(boss, BOSS_PATTERNS.polonium.phaseFreezeSec + 6.1);
    expect(bossSignalCount(boss, BOSS_SIGNALS.zone)).toBeGreaterThan(0);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.zone)).toBe(3);
  });

  it('teleports to the far diagonal deterministically', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.polonium, 0, 0);

    advance(boss, 5.1, 10, 20);
    expect(bossSignalCount(boss, BOSS_SIGNALS.teleport)).toBe(1);
    // 도착 지점을 본다. `x` 는 도착 뒤 남은 프레임 동안 이미 다시 걷기 시작했다
    expect(boss.teleportX).toBe(270);
    expect(boss.teleportY).toBe(200);
  });
});

describe('오가네손 3페이즈 패턴 (T-057)', () => {
  it('summons and rings in phase 1', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.oganesson, 0, 0);

    advance(boss, 5.1);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.summon)).toBe(4);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.ring)).toBe(12);
    expect(bossSignalCount(boss, BOSS_SIGNALS.meteor)).toBe(0);
  });

  it('adds meteors and zones in phase 2', () => {
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.oganesson, 0, 0);
    applyBossDamage(boss, BOSSES.oganesson.hp * 0.4);

    advance(boss, BOSS_PATTERNS.oganesson.phaseFreezeSec + 6.1);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.meteor)).toBe(5);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.zone)).toBe(4);
  });

  it('runs windup → dash → recover and ends the dash with a spinning ring', () => {
    const spec = BOSS_PATTERNS.oganesson;
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.oganesson, 0, 0);
    applyBossDamage(boss, BOSSES.oganesson.hp * 0.7);
    expect(boss.phase).toBe(3);

    advance(boss, spec.phaseFreezeSec + 3.3);
    expect(consumeBossSignal(boss, BOSS_SIGNALS.chargeWindup)).toBe(1);
    expect(boss.chargeState).toBe(CHARGE_WINDUP);

    // 준비 동작 동안에는 제자리다. 그 정지가 곧 회피 신호다
    const beforeDash = boss.x;
    advance(boss, spec.chargeWindupSec * 0.5);
    expect(boss.chargeState).toBe(CHARGE_WINDUP);
    expect(boss.x).toBe(beforeDash);

    advance(boss, spec.chargeWindupSec);
    expect(boss.chargeState).toBe(CHARGE_DASH);

    advance(boss, spec.chargeDashSec);
    expect(boss.chargeState).toBe(CHARGE_RECOVER);
    expect(boss.x).not.toBe(beforeDash);
    expect(bossSignalPayload(boss, BOSS_SIGNALS.ring)).toBe(spec.chargeRingBullets);
  });

  it('softens contact damage during the dash and restores it afterwards', () => {
    const spec = BOSS_PATTERNS.oganesson;
    const pool = createBossPool(1);
    const boss = pool.acquire();
    spawnBoss(boss, BOSSES.oganesson, 0, 0);
    applyBossDamage(boss, BOSSES.oganesson.hp * 0.7);

    advance(boss, spec.phaseFreezeSec + 3.3 + spec.chargeWindupSec);
    expect(boss.chargeState).toBe(CHARGE_DASH);
    expect(boss.contactDamage).toBeLessThan(boss.baseContactDamage);

    advance(boss, spec.chargeDashSec);
    expect(boss.contactDamage).toBe(boss.baseContactDamage);
  });
});

describe('boss telegraph and pool guarantees', () => {
  it('gives every warned pattern at least the documented telegraph', () => {
    for (const id of Object.keys(BOSS_PATTERNS) as BossId[]) {
      const spec = BOSS_PATTERNS[id];
      if (spec.zoneWarnSec > 0) expect(spec.zoneWarnSec).toBeGreaterThanOrEqual(MIN_TELEGRAPH_SEC);
      if (spec.meteorWarnSec > 0) expect(spec.meteorWarnSec).toBeGreaterThanOrEqual(MIN_TELEGRAPH_SEC);
      if (spec.chargeWindupSec > 0) {
        expect(spec.chargeWindupSec).toBeGreaterThanOrEqual(MIN_TELEGRAPH_SEC);
      }
    }
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
