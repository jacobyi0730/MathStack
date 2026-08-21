import { describe, expect, it } from 'vitest';
import { CHARACTER_ARCHETYPES } from '../../src/data/characters.js';
import { DEFAULT_HERO_NAME, formatCharacterTraits, normalizeHeroName } from '../../src/ui/character-select.js';

describe('character select', () => {
  it('normalizes_empty_hero_name_to_default', () => {
    expect(normalizeHeroName('  ')).toBe(DEFAULT_HERO_NAME);
    expect(normalizeHeroName('  Ada  ')).toBe('Ada');
  });

  it('formats_all_four_starting_weapons_as_attacks', () => {
    const traits = CHARACTER_ARCHETYPES.map((character) => [
      character.id,
      formatCharacterTraits(character),
    ]);

    expect(traits).toEqual([
      [
        'actinium',
        [
          '시작 공격: 악티늄 창',
          '직선 투사체 / 피해 15 / 쿨타임 1.55초',
          '각성 짝꿍: 프로트악티늄 방패 보유 + 무기 Lv.5 → 궤멸의 항암 치료제',
        ],
      ],
      [
        'thorium',
        [
          '시작 공격: 토륨 망치',
          '폭발 공격 / 피해 22 / 쿨타임 3.1초',
          '각성 짝꿍: 우라늄 분열핵 보유 + 무기 Lv.5 → 영구의 원전 연료',
        ],
      ],
      [
        'lanthanum',
        [
          '시작 공격: 란타넘 창',
          '직선 투사체 / 피해 13 / 쿨타임 1.6초',
          '각성 짝꿍: 루테튬 종결석 보유 + 무기 Lv.5 → 정밀의 암 진단 센서',
        ],
      ],
      [
        'cerium',
        [
          '시작 공격: 세륨 섬광',
          '산탄 공격 / 피해 9 / 쿨타임 1.7초',
          '각성 짝꿍: 프라세오디뮴 증폭기 보유 + 무기 Lv.5 → 점화의 라이터 부싯돌',
        ],
      ],
    ]);
  });
});
