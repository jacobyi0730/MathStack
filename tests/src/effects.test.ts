import { describe, expect, it } from 'vitest';
import {
  HIT_FLASH_SEC,
  MAX_HIT_STOP_SEC,
  addHitStop,
  addTrauma,
  createEffectsState,
  emitBurst,
  emitShockwave,
  flashDamage,
  resetEffects,
  updateScreenEffects,
  updateWorldEffects,
} from '../../src/engine/effects.js';
import { PARTICLE_CAPACITY } from '../../src/entities/particle.js';
import { SHOCKWAVE_CAPACITY } from '../../src/entities/shockwave.js';
import { createGameState } from '../../src/engine/state.js';
import { BOSSES } from '../../src/data/bosses.js';
import { spawnBoss } from '../../src/entities/boss.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { spawnEnemy } from '../../src/entities/enemy.js';
import { applyEnemyDamage, applyPlayerDamage } from '../../src/systems/damage.js';
import { feedbackBossDeath, feedbackEnemyHit } from '../../src/systems/feedback.js';

const STEP = 1 / 60;

describe('screen effects', () => {
  it('decays shake to zero and stops moving the camera', () => {
    const effects = createEffectsState();
    addTrauma(effects, 1);

    updateScreenEffects(effects, STEP);
    expect(Math.abs(effects.shakeX) + Math.abs(effects.shakeY)).toBeGreaterThan(0);

    for (let i = 0; i < 120; i += 1) updateScreenEffects(effects, STEP);
    expect(effects.shakeTrauma).toBe(0);
    expect(effects.shakeX).toBe(0);
    expect(effects.shakeY).toBe(0);
  });

  it('never freezes the game longer than the documented ceiling', () => {
    const effects = createEffectsState();
    addHitStop(effects, 5);
    expect(effects.hitStopSec).toBe(MAX_HIT_STOP_SEC);
  });

  it('turns every screen effect off at intensity 0', () => {
    const effects = createEffectsState();
    effects.intensity = 0;

    addTrauma(effects, 1);
    addHitStop(effects, 0.2);
    flashDamage(effects, 1);

    expect(effects.shakeTrauma).toBe(0);
    expect(effects.hitStopSec).toBe(0);
    expect(effects.damageFlash).toBe(0);
  });

  it('halves shake at intensity 50%', () => {
    const full = createEffectsState();
    const half = createEffectsState();
    half.intensity = 0.5;

    addTrauma(full, 0.4);
    addTrauma(half, 0.4);
    expect(half.shakeTrauma).toBeCloseTo(full.shakeTrauma * 0.5, 6);
  });
});

describe('particle and shockwave pools', () => {
  it('recycles the oldest particle instead of allocating', () => {
    const effects = createEffectsState();

    for (let i = 0; i < 40; i += 1) {
      emitBurst(effects, 0, 0, '#FFFFFF', 8, 100, 3, 0.3);
    }

    expect(effects.particles.items).toHaveLength(PARTICLE_CAPACITY);
    expect(effects.particles.activeCount).toBeLessThanOrEqual(PARTICLE_CAPACITY);
  });

  it('expires particles and shockwaves on schedule', () => {
    const effects = createEffectsState();
    emitBurst(effects, 0, 0, '#FFFFFF', 6, 100, 3, 0.2);
    emitShockwave(effects, 0, 0, 10, 60, 0.2, '#FFFFFF', 3, 0);

    for (let i = 0; i < 30; i += 1) updateWorldEffects(effects, STEP);

    expect(effects.particles.activeCount).toBe(0);
    expect(effects.shockwaves.activeCount).toBe(0);
    expect(effects.shockwaves.items).toHaveLength(SHOCKWAVE_CAPACITY);
  });

  it('clears everything on reset', () => {
    const effects = createEffectsState();
    emitBurst(effects, 0, 0, '#FFFFFF', 6, 100, 3, 0.4);
    emitShockwave(effects, 0, 0, 10, 60, 0.4, '#FFFFFF', 3, 0);
    addTrauma(effects, 1);

    resetEffects(effects);

    expect(effects.particles.activeCount).toBe(0);
    expect(effects.shockwaves.activeCount).toBe(0);
    expect(effects.shakeTrauma).toBe(0);
  });
});

describe('combat feedback wiring', () => {
  it('flashes and knocks back an enemy that survives a hit', () => {
    const state = createGameState();
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.lead, 120, 0, ENEMIES.lead.hp);

    feedbackEnemyHit(state, enemy, 5);

    expect(enemy.flashSec).toBeCloseTo(HIT_FLASH_SEC, 6);
    // 밀림은 주인공 반대 방향이다 — 적이 오른쪽에 있으니 더 오른쪽으로 밀린다
    expect(enemy.knockbackX).toBeGreaterThan(0);
  });

  it('does not shake the screen when an ordinary enemy dies', () => {
    const state = createGameState();
    const enemy = state.enemies.acquire();
    spawnEnemy(enemy, ENEMIES.radon, 120, 0, 5);

    applyEnemyDamage(state, enemy, 99);

    expect(state.combat.defeatedEnemies).toBe(1);
    expect(state.effects.particles.activeCount).toBeGreaterThan(0);
    // 잡몹 처치에 흔들림을 주면 10분 내내 흔들려서 보스 스킬이 안 보인다
    expect(state.effects.shakeTrauma).toBe(0);
    expect(state.effects.hitStopSec).toBe(0);
  });

  it('shakes, freezes and reddens the screen when the player is hit', () => {
    const state = createGameState();

    const dealt = applyPlayerDamage(state, 12);

    expect(dealt).toBe(12);
    expect(state.effects.shakeTrauma).toBeGreaterThan(0);
    expect(state.effects.hitStopSec).toBeGreaterThan(0);
    expect(state.effects.damageFlash).toBeGreaterThan(0);
    expect(state.damageNumbers.activeCount).toBe(1);
  });

  it('ignores repeat hits during invulnerability', () => {
    const state = createGameState();
    applyPlayerDamage(state, 12);
    const health = state.player.health;

    expect(applyPlayerDamage(state, 12)).toBe(0);
    expect(state.player.health).toBe(health);
  });

  it('gives the boss death the loudest treatment in the game', () => {
    const state = createGameState();
    const boss = state.bosses.acquire();
    spawnBoss(boss, BOSSES.oganesson, 0, 0);

    feedbackBossDeath(state, boss);

    expect(state.effects.shakeTrauma).toBe(1);
    expect(state.effects.hitStopSec).toBeGreaterThan(0.1);
    expect(state.effects.whiteFlash).toBeGreaterThan(0);
    expect(state.effects.shockwaves.activeCount).toBeGreaterThanOrEqual(2);
  });
});
