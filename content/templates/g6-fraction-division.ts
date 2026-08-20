import { Domain } from '../../shared/domain.js';
import {
  divideNumeratorsOnly,
  frac,
  genDivisionFractions,
  invertWholeResult,
  multiplyStraightAcross,
} from '../../tools/math.js';
import { defineTemplate } from '../../tools/template.js';

export default defineTemplate({
  key: 'g6-fraction-division',
  standard: '6수01-10',
  grade: 6,
  semester: 1,
  domain: Domain.Number,
  unit: '분수의 나눗셈',
  difficulty: 3,
  misconceptionTag: 'fraction_division_no_reciprocal',
  params: (rng) => genDivisionFractions(rng),
  stem: ({ a, b, c, d }) => `${a}/${b} ÷ ${c}/${d} 는 얼마인가요?`,
  answer: ({ a, b, c, d }) => frac(a, b).div(frac(c, d)),
  distractors: [
    ['뒤 분수를 뒤집지 않고 곱함', ({ a, b, c, d }) => multiplyStraightAcross(a, b, c, d)],
    ['결과 전체를 뒤집음', ({ a, b, c, d }) => invertWholeResult(a, b, c, d)],
    ['분자만 나누고 분모는 그대로 둠', ({ a, b, c }) => divideNumeratorsOnly(a, b, c)],
  ] as const,
  explanation: ({ params }) => `${params.c}/${params.d} 를 뒤집어 ${params.d}/${params.c} 로 만든 뒤 곱합니다.`,
});

