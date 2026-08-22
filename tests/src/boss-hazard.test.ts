import { describe, expect, it } from 'vitest';
import { BOSSES, BOSS_PATTERNS, MAX_BOSS_BULLETS, MAX_BOSS_HAZARDS } from '../../src/data/bosses.js';
import { createGameState } from '../../src/engine/state.js';
import { spawnBoss } from '../../src/entities/boss.js';
import { HAZARD_METEOR, HAZARD_ZONE, isHazardArmed } from '../../src/entities/hazard.js';
import {
  METEOR_BURST_SEC,
  spawnBossBullet,
  spawnBossMeteor,
  spawnBossZone,
  updateBossHazards,
} from '../../src/systems/boss-hazard.js';
import { updateBossPatterns } from '../../src/systems/boss-patterns.js';

const STEP = 1 / 60;

function step(state: ReturnType<typeof createGameState>, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += STEP) {
    updateBossHazards(state, STEP);
  }
}

describe('boss hazard pools (T-054)', () => {
  it('reuses fixed pools and skips new hazards at the documented cap', () => {
    const state = createGameState();
    const before = state.bossHazards.bullets.allocations;

    for (let i = 0; i < MAX_BOSS_BULLETS + 12; i += 1) {
      spawnBossBullet(state, 900 + i, 900, 1, 0, 100, 5, 8, 3, 0);
    }

    expect(state.bossHazards.bullets.activeCount).toBe(MAX_BOSS_BULLETS);
    expect(state.bossHazards.bullets.allocations).toBe(before);
    // 상한을 넘으면 오래된 탄을 회수하지 않고 새 패턴을 버린다
    expect(state.bossHazards.bullets.recycles).toBe(0);
    expect(state.bossHazards.skipped).toBe(12);
  });

  it('caps fields separately from bullets', () => {
    const state = createGameState();
    for (let i = 0; i < MAX_BOSS_HAZARDS + 5; i += 1) {
      spawnBossZone(state, 900 + i * 40, 900, 60, 8, 0.7, 2.2, 1);
    }

    expect(state.bossHazards.fields.activeCount).toBe(MAX_BOSS_HAZARDS);
    expect(state.bossHazards.bullets.activeCount).toBe(0);
    expect(state.bossHazards.skipped).toBe(5);
  });
});

describe('전조와 피해 (03-전투확장 §9.3.1)', () => {
  it('does not damage the player while a zone is still warning', () => {
    const state = createGameState();
    state.player.x = 0;
    state.player.y = 0;
    const health = state.player.health;

    const zone = spawnBossZone(state, 0, 0, 120, 10, 0.7, 2.2, 1);
    expect(zone).toBeDefined();
    expect(isHazardArmed(zone!)).toBe(false);

    step(state, 0.6);
    expect(state.player.health).toBe(health);
    expect(zone!.hazardKind).toBe(HAZARD_ZONE);
  });

  it('damages the player once the warning ends', () => {
    const state = createGameState();
    state.player.x = 0;
    state.player.y = 0;
    const health = state.player.health;

    spawnBossZone(state, 0, 0, 120, 10, 0.7, 2.2, 1);
    step(state, 0.9);

    expect(state.player.health).toBeLessThan(health);
  });

  it('lets a meteor burst briefly and then disappear', () => {
    const state = createGameState();
    state.player.x = 5000;
    state.player.y = 5000;

    const meteor = spawnBossMeteor(state, 0, 0, 90, 16, 0.8, 3);
    expect(meteor!.hazardKind).toBe(HAZARD_METEOR);

    step(state, 0.7);
    expect(state.bossHazards.fields.activeCount).toBe(1);

    step(state, 0.2 + METEOR_BURST_SEC + 0.05);
    expect(state.bossHazards.fields.activeCount).toBe(0);
  });
});

describe('탄 이동과 분열', () => {
  it('consumes a bullet when it reaches the player', () => {
    const state = createGameState();
    state.player.x = 0;
    state.player.y = 0;
    const health = state.player.health;

    spawnBossBullet(state, 0, 0, 1, 0, 0, 6, 12, 3, 0);
    updateBossHazards(state, STEP);

    expect(state.bossHazards.bullets.activeCount).toBe(0);
    expect(state.player.health).toBe(health - 6);
  });

  it('splits one bullet into the documented number of slower children', () => {
    const state = createGameState();
    state.player.x = 5000;
    state.player.y = 5000;
    const spec = BOSS_PATTERNS.polonium;

    const bullet = spawnBossBullet(state, 0, 0, 1, 0, spec.bulletSpeed, 8, 12, 4, 0);
    bullet!.splitRemaining = 1;
    bullet!.splitTimerSec = spec.splitAfterSec;
    bullet!.splitInto = spec.splitInto;
    bullet!.splitSpreadRad = spec.splitSpreadRad;
    bullet!.splitSpeedMultiplier = spec.splitSpeedMultiplier;

    step(state, spec.splitAfterSec + 0.05);

    expect(state.bossHazards.bullets.activeCount).toBe(spec.splitInto);
    const child = state.bossHazards.bullets.items[0];
    const childSpeed = Math.sqrt(child.vx * child.vx + child.vy * child.vy);
    expect(childSpeed).toBeLessThan(spec.bulletSpeed);
    expect(child.splitRemaining).toBe(0);
  });
});

describe('boss pattern execution (T-055 ~ T-057)', () => {
  it('turns a technetium ring signal into bullets with one safe gap', () => {
    const state = createGameState();
    const boss = state.bosses.acquire();
    spawnBoss(boss, BOSSES.technetium, 0, 0);
    state.player.x = 5000;
    state.player.y = 5000;

    // 원형 탄막 신호 하나를 직접 올린다. 시계는 boss.test.ts 가 따로 본다
    boss.signalSeq[1] = 1;
    boss.signalPayload[1] = 8;
    updateBossPatterns(state, STEP);

    // 여덟 칸 중 한 칸은 비운다 — 그 자리가 문서가 요구하는 큰 안전각이다
    expect(state.bossHazards.bullets.activeCount).toBe(7);
  });

  it('keeps oganesson summons under the late-phase cap', () => {
    const state = createGameState();
    const boss = state.bosses.acquire();
    spawnBoss(boss, BOSSES.oganesson, 0, 0);
    boss.phaseIndex = 1;
    boss.phase = 2;

    for (let i = 0; i < 6; i += 1) {
      boss.signalSeq[4] += 1;
      boss.signalPayload[4] = 4;
      updateBossPatterns(state, STEP);
    }

    expect(state.enemies.activeCount).toBeLessThanOrEqual(6);
  });

  it('never lays a zone on top of the player', () => {
    const state = createGameState();
    const boss = state.bosses.acquire();
    spawnBoss(boss, BOSSES.polonium, 0, 0);
    boss.phaseIndex = 1;
    boss.phase = 2;
    state.player.x = 0;
    state.player.y = 0;

    boss.signalSeq[5] = 1;
    boss.signalPayload[5] = 3;
    updateBossPatterns(state, STEP);

    const spec = BOSS_PATTERNS.polonium;
    for (let i = 0; i < state.bossHazards.fields.activeCount; i += 1) {
      const zone = state.bossHazards.fields.items[i];
      const distance = Math.sqrt(zone.x * zone.x + zone.y * zone.y);
      expect(distance).toBeGreaterThanOrEqual(spec.zoneMinDistance - 1);
    }
  });

  it('runs a full boss fight frame budget without pool churn', () => {
    const state = createGameState();
    const boss = state.bosses.acquire();
    spawnBoss(boss, BOSSES.oganesson, 200, 0);

    for (let i = 0; i < 900; i += 1) {
      updateBossPatterns(state, STEP);
      updateBossHazards(state, STEP);
    }

    expect(state.bossHazards.bullets.recycles).toBe(0);
    expect(state.bossHazards.fields.recycles).toBe(0);
    expect(state.bossHazards.bullets.allocations).toBe(MAX_BOSS_BULLETS);
  });
});
