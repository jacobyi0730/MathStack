import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import {
  MATHSTACK_CONTINUE_KEY,
  MATHSTACK_STORAGE_KEY,
  clearContinueRun,
  recordSessionResult,
  readContinueRun,
  readMathStackStorage,
  writeContinueRun,
  type StorageLike,
} from '../../src/storage.js';

class MemoryStorage implements StorageLike {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

describe('mathstack storage', () => {
  it('recovers_from_missing_corrupt_or_wrong_version_data', () => {
    const storage = new MemoryStorage();

    expect(readMathStackStorage(storage).version).toBe(1);
    storage.setItem(MATHSTACK_STORAGE_KEY, '{broken');
    expect(readMathStackStorage(storage).sessions).toBe(0);
    storage.setItem(MATHSTACK_STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(readMathStackStorage(storage).best).toEqual({
      survivalSec: 0,
      kills: 0,
      accuracy: 0,
      score: 0,
    });
  });

  it('records_best_values_and_accumulates_misconceptions_without_personal_data', () => {
    const storage = new MemoryStorage();
    const quiz = {
      attempted: 2,
      firstTryCorrect: 1,
      accuracy: 0.5,
      byDomain: [
        { domain: Domain.Number, attempted: 2, firstTryCorrect: 1, accuracy: 0.5 },
        { domain: Domain.Relation, attempted: 0, firstTryCorrect: 0, accuracy: 0 },
        { domain: Domain.Geometry, attempted: 0, firstTryCorrect: 0, accuracy: 0 },
        { domain: Domain.Data, attempted: 0, firstTryCorrect: 0, accuracy: 0 },
      ],
      reviewConversionRate: 0.5,
      frequentMisconceptions: [{ tag: 'decimal_alignment', wrong: 2, converted: 1 }],
    };

    recordSessionResult(storage, {
      survivalSec: 120,
      kills: 30,
      score: 500,
      level: 6,
      heroName: '리나',
      quiz,
      lastChoice: { grade: 4, semester: 2, character: 'thorium' },
    });
    const saved = recordSessionResult(storage, {
      survivalSec: 90,
      kills: 40,
      score: 800,
      level: 7,
      heroName: '도윤',
      quiz: { ...quiz, accuracy: 0.75 },
    });

    expect(saved.sessions).toBe(2);
    expect(saved.best).toEqual({ survivalSec: 120, kills: 40, accuracy: 0.75, score: 800 });
    expect(saved.lastChoice).toEqual({ grade: 4, semester: 2, character: 'thorium' });
    expect(saved.rankings.map((entry) => entry.score)).toEqual([800, 500]);
    expect(saved.rankings.map((entry) => entry.heroName)).toEqual(['도윤', '리나']);
    expect(saved.misconceptions.decimal_alignment).toEqual({ wrong: 4, converted: 2 });
  });

  it('keeps_only_each_hero_best_ranking_entry', () => {
    const storage = new MemoryStorage();
    const quiz = {
      attempted: 0,
      firstTryCorrect: 0,
      accuracy: 0,
      byDomain: [
        { domain: Domain.Number, attempted: 0, firstTryCorrect: 0, accuracy: 0 },
        { domain: Domain.Relation, attempted: 0, firstTryCorrect: 0, accuracy: 0 },
        { domain: Domain.Geometry, attempted: 0, firstTryCorrect: 0, accuracy: 0 },
        { domain: Domain.Data, attempted: 0, firstTryCorrect: 0, accuracy: 0 },
      ],
      reviewConversionRate: 0,
      frequentMisconceptions: [],
    };

    recordSessionResult(storage, {
      survivalSec: 100,
      kills: 4,
      score: 300,
      level: 4,
      heroName: '  Nova ',
      quiz,
      lastChoice: { grade: 3, semester: 1, character: 'actinium' },
    });
    recordSessionResult(storage, {
      survivalSec: 80,
      kills: 9,
      score: 700,
      level: 6,
      heroName: 'nova',
      quiz,
      lastChoice: { grade: 4, semester: 1, character: 'thorium' },
    });
    const saved = recordSessionResult(storage, {
      survivalSec: 120,
      kills: 8,
      score: 600,
      level: 5,
      heroName: '리나',
      quiz,
      lastChoice: { grade: 5, semester: 2, character: 'cerium' },
    });

    expect(saved.rankings).toHaveLength(2);
    expect(saved.rankings.map((entry) => entry.heroName)).toEqual(['nova', '리나']);
    expect(saved.rankings.map((entry) => entry.score)).toEqual([700, 600]);
  });

  it('stores_reads_and_clears_continue_run_data', () => {
    const storage = new MemoryStorage();
    writeContinueRun(storage, {
      version: 1,
      selection: { grade: 4, term: 'all', characterId: 'cerium', heroName: 'Nova' },
      elapsedSec: 245.5,
      playerHealth: 88,
      level: 7,
      xp: 12,
      totalXp: 180,
      weapons: [{ id: 'heavy_hydrogen_storm', level: 5 }],
      passives: [{ id: 'silicon', level: 2 }],
      firedBossMask: 1,
      trial: {
        phase: 'pending',
        questionsAsked: 0,
        correctAnswers: 0,
        firstTryCorrectAnswers: 0,
        rewardClaimed: false,
      },
      activeBosses: [{ id: 'technetium', hp: 700, x: 10, y: -20 }],
    });

    expect(readContinueRun(storage)).toMatchObject({
      elapsedSec: 245.5,
      playerHealth: 88,
      level: 7,
      weapons: [{ id: 'heavy_hydrogen_storm', level: 5 }],
      activeBosses: [{ id: 'technetium', hp: 700 }],
    });

    clearContinueRun(storage);
    expect(storage.getItem(MATHSTACK_CONTINUE_KEY)).toBeNull();
    expect(readContinueRun(storage)).toBeNull();
  });
});
