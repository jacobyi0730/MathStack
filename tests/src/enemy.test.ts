import { describe, expect, it } from 'vitest';
import { ENEMIES, MAX_ACTIVE_ENEMIES, type EnemyId } from '../../src/data/enemies.js';
import {
  createEnemyPool,
  getIncomingDamageMultiplier,
  resolveEnemyReward,
  spawnEnemy,
} from '../../src/entities/enemy.js';

const EXPECTED_ENEMIES = {
  radon: ['Rn', 86, 0, 10, 40, 2, 'chase'],
  sodium: ['Na', 11, 60, 24, 55, 4, 'charge'],
  lead: ['Pb', 82, 180, 90, 22, 6, 'tank'],
  uranium: ['U', 92, 210, 42, 35, 4, 'split'],
  caesium: ['Cs', 55, 270, 35, 25, 3, 'ranged'],
  iridium: ['Ir', 77, 120, 18, 60, 3, 'flee'],
  iodine: ['I', 53, 120, 16, 45, 0, 'flee'],
} as const satisfies Record<EnemyId, readonly [string, number, number, number, number, number, string]>;

describe('enemy entities', () => {
  it('defines the seven T-014 enemies with document stats', () => {
    for (const id of Object.keys(EXPECTED_ENEMIES) as EnemyId[]) {
      const [element, atomicNumber, spawnAtSec, hp, speed, contactDamage, ai] = EXPECTED_ENEMIES[id];
      const enemy = ENEMIES[id];

      expect(enemy.element).toBe(element);
      expect(enemy.atomicNumber).toBe(atomicNumber);
      expect(enemy.spawnAtSec).toBe(spawnAtSec);
      expect(enemy.hp).toBe(hp);
      expect(enemy.speed).toBe(speed);
      expect(enemy.contactDamage).toBe(contactDamage);
      expect(enemy.ai).toBe(ai);
    }
  });

  it('reuses the fixed enemy pool without runtime allocation', () => {
    const pool = createEnemyPool();
    const before = pool.allocations;

    for (let i = 0; i < MAX_ACTIVE_ENEMIES; i += 1) {
      const enemy = pool.acquire();
      spawnEnemy(enemy, ENEMIES.radon, i, 0, ENEMIES.radon.hp);
    }

    expect(pool.activeCount).toBe(MAX_ACTIVE_ENEMIES);
    expect(pool.allocations).toBe(before);
    expect(pool.recycles).toBe(0);
  });

  it('resets AI state when enemies are released and acquired again', () => {
    const pool = createEnemyPool(1);
    const enemy = pool.acquire();
    spawnEnemy(enemy, ENEMIES.uranium, 0, 0, ENEMIES.uranium.hp);
    enemy.aiTimerSec = 3;
    enemy.aiPhase = 2;
    enemy.chargeDirX = 1;
    enemy.hasSplit = true;
    enemy.rangedShotSeq = 4;

    pool.release(enemy);
    const reused = pool.acquire();
    spawnEnemy(reused, ENEMIES.sodium, 0, 0, ENEMIES.sodium.hp);

    expect(reused.aiTimerSec).toBe(0);
    expect(reused.aiPhase).toBe(0);
    expect(reused.chargeDirX).toBe(0);
    expect(reused.hasSplit).toBe(false);
    expect(reused.rangedShotSeq).toBe(0);
  });

  it('reduces frontal damage for tank enemies only', () => {
    const pool = createEnemyPool(1);
    const enemy = pool.acquire();
    spawnEnemy(enemy, ENEMIES.lead, 0, 0, ENEMIES.lead.hp);
    enemy.dx = 1;
    enemy.dy = 0;

    expect(getIncomingDamageMultiplier(enemy, 10, 0)).toBe(0.5);
    expect(getIncomingDamageMultiplier(enemy, -10, 0)).toBe(1);
  });

  it('resolves reward enemies into follow-up reward signals', () => {
    const pool = createEnemyPool(2);
    const iridium = pool.acquire();
    const iodine = pool.acquire();
    spawnEnemy(iridium, ENEMIES.iridium, 0, 0, ENEMIES.iridium.hp);
    spawnEnemy(iodine, ENEMIES.iodine, 0, 0, ENEMIES.iodine.hp);

    expect(resolveEnemyReward(iridium, 2)).toBe('magnet');
    expect(resolveEnemyReward(iridium, 3)).toBe('bomb');
    expect(resolveEnemyReward(iodine, 2)).toBe('heal');
  });
});
