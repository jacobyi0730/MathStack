import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import { denominatorAdd, frac, noCarryAdd, positiveDifference } from '../../tools/math.js';
import { defineTemplate, expandTemplate } from '../../tools/template.js';

describe('expandTemplate', () => {
  const template = defineTemplate({
    key: 'fraction-like-denominator',
    standard: '4수01-15',
    grade: 4,
    semester: 2,
    domain: Domain.Number,
    unit: '분수의 덧셈과 뺄셈',
    difficulty: 2,
    misconceptionTag: 'fraction_denominator_add',
    params: (rng) => {
      const d = rng.int(4, 9);
      const a = rng.int(1, d - 1);
      const b = rng.int(1, d - 1);
      return { a, b, d };
    },
    stem: ({ a, b, d }) => `${a}/${d} + ${b}/${d} 는 얼마인가요?`,
    answer: ({ a, b, d }) => frac(a + b, d),
    distractors: [
      ['분모끼리도 더함', ({ a, b, d }) => denominatorAdd(a, d, b, d)],
      ['분자를 뺌', ({ a, b, d }) => frac(positiveDifference(a, b), d)],
      ['분자를 하나 더함', ({ a, b, d }) => frac(a + b + 1, d)],
    ] as const,
    explanation: ({ params }) => `분모 ${params.d}는 그대로 두고 분자만 더합니다.`,
  });

  it('템플릿_하나가_60개_변형을_만든다', () => {
    const questions = expandTemplate(template);
    expect(questions).toHaveLength(60);
  });

  it('같은_템플릿은_매번_같은_결과를_낸다', () => {
    const first = expandTemplate(template);
    const second = expandTemplate(template);
    expect(second).toEqual(first);
  });

  it('모든_변형에서_정답과_오답이_겹치지_않는다', () => {
    const questions = expandTemplate(template);
    for (const question of questions) {
      expect(new Set(question.choices).size).toBe(question.choices.length);
      expect(question.choices.filter((choice) => choice === question.answer)).toHaveLength(1);
    }
  });
});

describe('math helpers', () => {
  it('noCarryAdd는_자리올림을_무시한다', () => {
    expect(noCarryAdd(58, 67)).toBe(15);
  });
});

