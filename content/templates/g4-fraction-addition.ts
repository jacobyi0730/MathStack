import { Domain } from '../../shared/domain.js';
import { denominatorAdd, frac, genFractionPair, positiveDifference } from '../../tools/math.js';
import { defineTemplate } from '../../tools/template.js';

export default defineTemplate({
  key: 'g4-like-denominator-fractions',
  standard: '4수01-15',
  grade: 4,
  semester: 2,
  domain: Domain.Number,
  unit: '분수의 덧셈과 뺄셈',
  difficulty: 2,
  misconceptionTag: 'fraction_denominator_add',
  params: (rng) => genFractionPair(rng, { minDen: 4, maxDen: 12, improper: true }),
  validateParams: ({ a, b, d: _d }) => a + b + 1 !== 0 && positiveDifference(a, b) !== a + b,
  stem: ({ a, b, d }) => `${a}/${d} + ${b}/${d} 는 얼마인가요?`,
  answer: ({ a, b, d }) => frac(a + b, d),
  distractors: [
    ['분모끼리도 더함', ({ a, b, d }) => denominatorAdd(a, d, b, d)],
    ['분자를 뺌', ({ a, b, d }) => frac(positiveDifference(a, b), d)],
    ['분자를 하나 더함', ({ a, b, d }) => frac(a + b + 1, d)],
  ] as const,
  explanation: ({ params }) => `분모 ${params.d}는 그대로 두고 분자 ${params.a}와 ${params.b}만 더합니다.`,
});
