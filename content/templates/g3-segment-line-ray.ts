import { Domain } from '../../shared/domain.js';
import { defineTemplate } from '../../tools/template.js';

const TYPES = ['선분', '직선', '반직선'] as const;

export default defineTemplate({
  key: 'g3-segment-line-ray',
  standard: '4수03-01',
  grade: 3,
  semester: 1,
  domain: Domain.Geometry,
  unit: '평면도형',
  difficulty: 1,
  misconceptionTag: 'segment_line_ray_confusion',
  variantCount: 30,
  params: (rng) => {
    const answer = TYPES[rng.int(0, TYPES.length - 1)];
    const label = String.fromCharCode(65 + rng.int(0, 5)) + String.fromCharCode(75 + rng.int(0, 5));
    return { answer, label };
  },
  stem: ({ answer, label }) => {
    if (answer === '선분') return `양 끝점이 모두 있는 도형 ${label}의 이름은 무엇인가요?`;
    if (answer === '직선') return `양쪽으로 끝없이 이어지는 도형 ${label}의 이름은 무엇인가요?`;
    return `한 끝점에서 시작해 한쪽으로 끝없이 이어지는 도형 ${label}의 이름은 무엇인가요?`;
  },
  answer: ({ answer }) => answer,
  distractors: [
    ['선분과 직선을 혼동함', ({ answer }) => (answer === '선분' ? '직선' : '선분')],
    ['반직선과 직선을 혼동함', ({ answer }) => (answer === '반직선' ? '직선' : '반직선')],
    ['각을 도형 이름으로 잘못 고름', () => '각'],
  ] as const,
  explanation: ({ params }) => {
    if (params.answer === '선분') return '선분은 양 끝점이 모두 있는 곧은 선입니다.';
    if (params.answer === '직선') return '직선은 양쪽으로 끝없이 이어지는 곧은 선입니다.';
    return '반직선은 한 끝점에서 시작해 한쪽으로 끝없이 이어지는 곧은 선입니다.';
  },
});
