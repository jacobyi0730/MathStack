import { describe, expect, it } from 'vitest';
import {
  readTitleSelection,
  TITLE_SELECTION_STORAGE_KEY,
  writeTitleSelection,
  type StorageLike,
  type TitleSelection,
} from '../../src/ui/title.js';

class MemoryStorage implements StorageLike {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

describe('title flow storage', () => {
  it('restores_saved_selection', () => {
    const storage = new MemoryStorage();
    const selection: TitleSelection = {
      grade: 5,
      term: 'all',
      characterId: 'oxygen',
      heroName: 'Nova',
    };
    writeTitleSelection(storage, selection);

    expect(readTitleSelection(storage)).toEqual(selection);
  });

  it('falls_back_when_storage_payload_is_invalid', () => {
    const storage = new MemoryStorage();
    storage.setItem(TITLE_SELECTION_STORAGE_KEY, '{bad json');

    expect(readTitleSelection(storage)).toMatchObject({
      grade: 3,
      term: 2,
      characterId: 'hydrogen',
    });
  });

  it('sanitizes_unknown_values', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      TITLE_SELECTION_STORAGE_KEY,
      JSON.stringify({
        grade: 2,
        term: 'winter',
        characterId: 'argon',
        heroName: '  ',
      }),
    );

    expect(readTitleSelection(storage)).toEqual({
      grade: 3,
      term: 2,
      characterId: 'hydrogen',
      heroName: '원소 용사',
    });
  });
});
