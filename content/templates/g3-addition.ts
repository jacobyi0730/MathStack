import { Domain } from '../../shared/domain.js';
import { misalignAdd, noCarryAdd } from '../../tools/math.js';
import { defineTemplate } from '../../tools/template.js';

export default defineTemplate({
  key: 'g3-two-digit-addition',
  standard: '4수01-03',
  grade: 3,
  semester: 1,
  domain: Domain.Number,
  unit: '덧셈과 뺄셈',
  difficulty: 1,
  misconceptionTag: 'addition_no_carry',
  params: (rng) => {
    const a = rng.int(12, 68);
    const b = rng.int(11, 59);
    return { a, b };
  },
  validateParams: ({ a, b }) => a + b <= 130 && noCarryAdd(a, b) !== a + b && misalignAdd(a, b) !== a + b,
  stem: ({ a, b }) => `${a} + ${b} = ?`,
  answer: ({ a, b }) => a + b,
  distractors: [
    ['자리올림을 하지 않음', ({ a, b }) => noCarryAdd(a, b)],
    ['십의 자리와 일의 자리를 엇갈려 더함', ({ a, b }) => misalignAdd(a, b)],
    ['두 수를 더한 뒤 10을 더함', ({ a, b }) => a + b + 10],
  ] as const,
  explanation: ({ params }) => `${params.a}와 ${params.b}는 일의 자리부터 더하고, 10이 넘으면 십의 자리에 올립니다.`,
});

