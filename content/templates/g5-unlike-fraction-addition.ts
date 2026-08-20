import { Domain } from '../../shared/domain.js';
import {
  denominatorAdd,
  frac,
  genUnlikeFractionPair,
  lcm,
  naiveCommonDenominatorAdd,
} from '../../tools/math.js';
import { defineTemplate } from '../../tools/template.js';

export default defineTemplate({
  key: 'g5-unlike-fraction-addition',
  standard: '6수01-08',
  grade: 5,
  semester: 1,
  domain: Domain.Number,
  unit: '분수의 덧셈과 뺄셈 (분모 다름)',
  difficulty: 3,
  misconceptionTag: 'fraction_skip_common_denominator',
  params: (rng) => genUnlikeFractionPair(rng, { minDen: 3, maxDen: 8 }),
  stem: ({ a, b, d1, d2 }) => `${a}/${d1} + ${b}/${d2} 는 얼마인가요?`,
  answer: ({ a, b, d1, d2 }) => frac(a, d1).add(frac(b, d2)),
  distractors: [
    ['분자와 분모를 각각 더함', ({ a, b, d1, d2 }) => denominatorAdd(a, d1, b, d2)],
    ['통분하지 않고 분자만 더함', ({ a, b, d1, d2 }) => naiveCommonDenominatorAdd(a, b, lcm(d1, d2))],
    ['첫 번째 분수의 분모만 사용함', ({ a, b, d1 }) => frac(a + b, d1)],
  ] as const,
  explanation: ({ params }) => {
    const common = lcm(params.d1, params.d2);
    return `${params.d1}와 ${params.d2}의 공배수인 ${common}으로 통분한 뒤 분자를 더합니다.`;
  },
});

