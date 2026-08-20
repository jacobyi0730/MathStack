import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import {
  MATHSTACK_STORAGE_KEY,
  recordSessionResult,
  readMathStackStorage,
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
      quiz,
      lastChoice: { grade: 4, semester: 2, character: 'neon' },
    });
    const saved = recordSessionResult(storage, {
      survivalSec: 90,
      kills: 40,
      quiz: { ...quiz, accuracy: 0.75 },
    });

    expect(saved.sessions).toBe(2);
    expect(saved.best).toEqual({ survivalSec: 120, kills: 40, accuracy: 0.75 });
    expect(saved.lastChoice).toEqual({ grade: 4, semester: 2, character: 'neon' });
    expect(saved.misconceptions.decimal_alignment).toEqual({ wrong: 4, converted: 2 });
  });
});
