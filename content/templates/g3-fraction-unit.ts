import { Domain } from '../../shared/domain.js';
import { frac } from '../../tools/math.js';
import { defineTemplate } from '../../tools/template.js';

export default defineTemplate({
  key: 'g3-fraction-unit',
  standard: '4수01-09',
  grade: 3,
  semester: 1,
  domain: Domain.Number,
  unit: '분수와 소수',
  difficulty: 1,
  misconceptionTag: 'fraction_part_whole_confusion',
  variantCount: 40,
  params: (rng) => {
    const denominator = rng.int(3, 12);
    const numerator = rng.int(1, denominator - 1);
    return { numerator, denominator };
  },
  validateParams: ({ numerator, denominator }) => numerator * 2 !== denominator && numerator !== 1,
  stem: ({ numerator, denominator }) =>
    `같은 크기 ${denominator}조각 중 ${numerator}조각을 색칠했습니다. 색칠한 부분은 전체의 얼마인가요?`,
  answer: ({ numerator, denominator }) => frac(numerator, denominator),
  distractors: [
    ['분자와 분모를 바꿈', ({ numerator, denominator }) => frac(denominator, numerator)],
    ['색칠하지 않은 조각을 분자로 씀', ({ numerator, denominator }) => frac(denominator - numerator, denominator)],
    ['전체 조각 수에서 색칠한 조각 수를 더함', ({ numerator, denominator }) => frac(numerator, numerator + denominator)],
  ] as const,
  explanation: ({ params }) =>
    `전체를 똑같이 ${params.denominator}조각으로 나눈 것 중 ${params.numerator}조각이므로 ${params.numerator}/${params.denominator}입니다.`,
});
