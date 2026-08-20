import { describe, expect, it } from 'vitest';
import { CHARACTER_ARCHETYPES } from '../../src/data/characters.js';
import { DEFAULT_HERO_NAME, formatCharacterTraits, normalizeHeroName } from '../../src/ui/character-select.js';

describe('character select', () => {
  it('normalizes_empty_hero_name_to_default', () => {
    expect(normalizeHeroName('  ')).toBe(DEFAULT_HERO_NAME);
    expect(normalizeHeroName('  Ada  ')).toBe('Ada');
  });

  it('formats_all_four_character_traits', () => {
    const traits = CHARACTER_ARCHETYPES.map((character) => [
      character.id,
      formatCharacterTraits(character),
    ]);

    expect(traits).toEqual([
      ['hydrogen', ['최대 체력 +10%']],
      ['neon', ['최대 체력 -10%', '이동속도 +15%']],
      ['carbon', ['투사체 수 +1', '공격력 -10%']],
      ['oxygen', ['공격 범위 +20%', '쿨타임 +10%']],
    ]);
  });
});
