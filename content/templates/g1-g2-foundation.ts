import { Domain, type Difficulty, type Grade } from '../../shared/domain.js';
import { defineTemplate, type TemplateDefinition } from '../../tools/template.js';
import type { Rng } from '../../tools/rng.js';

type Params = Record<string, number>;
type Template = TemplateDefinition<Params>;

function choices(answer: number, offsets: readonly number[]): string[] {
  return [answer, ...offsets.map((offset) => answer + offset)].map(String);
}

function template(options: {
  key: string;
  grade: Grade;
  domain: Template['domain'];
  difficulty: Difficulty;
  unit: string;
  standard: string;
  misconceptionTag: string;
  variantCount?: number;
  params: (rng: Rng) => Params;
  stem: (params: Params) => string;
  answer: (params: Params) => number;
  offsets: readonly [number, string][];
  explanation: (params: Params) => string;
}): Template {
  return defineTemplate({
    key: options.key,
    grade: options.grade,
    semester: options.domain === Domain.Data ? 2 : 1,
    domain: options.domain,
    unit: options.unit,
    standard: options.standard,
    difficulty: options.difficulty,
    misconceptionTag: options.misconceptionTag,
    variantCount: options.variantCount,
    params: options.params,
    validateParams: (params) => new Set(choices(options.answer(params), options.offsets.map(([offset]) => offset))).size === 4,
    stem: options.stem,
    answer: options.answer,
    distractors: options.offsets.map(([offset, reason]) => [reason, (params) => options.answer(params) + offset] as const),
    explanation: ({ params }) => options.explanation(params),
  });
}

function numberTemplate(grade: Grade, difficulty: Difficulty, key: string, max: number): Template {
  return template({
    key,
    grade,
    domain: Domain.Number,
    difficulty,
    unit: '덧셈과 뺄셈',
    standard: '4수01-03',
    misconceptionTag: difficulty <= 2 ? 'basic_addition_counting' : 'basic_subtraction_counting',
    params: (rng) => {
      const a = rng.int(1, max);
      const b = rng.int(1, max);
      return difficulty <= 2 ? { a, b } : { a: a + b, b };
    },
    stem: ({ a, b }) => difficulty <= 2 ? `${a} + ${b} = ?` : `${a} - ${b} = ?`,
    answer: ({ a, b }) => difficulty <= 2 ? a + b : a - b,
    offsets: [
      [1, '하나 더 셈'],
      [-1, '하나 덜 셈'],
      [2, '두 칸 더 셈'],
    ],
    explanation: ({ a, b }) => difficulty <= 2 ? `${a}에서 ${b}만큼 더 셉니다.` : `${a}에서 ${b}만큼 덜어 냅니다.`,
  });
}

function relationTemplate(grade: Grade): Template {
  return template({
    key: `g${grade}-equal-balance`,
    grade,
    domain: Domain.Relation,
    difficulty: 3,
    unit: '등호와 동치 관계',
    standard: '4수02-03',
    misconceptionTag: 'equals_balance',
    params: (rng) => {
      const a = rng.int(2, 12);
      const b = rng.int(1, 9);
      return { a, b, c: rng.int(1, a + b - 1) };
    },
    stem: ({ a, b, c }) => `${a} + ${b} = □ + ${c}일 때 □는?`,
    answer: ({ a, b, c }) => a + b - c,
    offsets: [
      [1, '양쪽을 하나 차이 나게 맞춤'],
      [-1, '양쪽을 하나 부족하게 맞춤'],
      [2, '오른쪽 수를 빼지 않음'],
    ],
    explanation: ({ a, b, c }) => `왼쪽 ${a + b}와 같아야 하므로 ${c}에서 시작해 맞춥니다.`,
  });
}

function geometryTemplate(grade: Grade, difficulty: Difficulty, key: string): Template {
  return template({
    key,
    grade,
    domain: Domain.Geometry,
    difficulty,
    unit: '평면도형',
    standard: '4수03-01',
    misconceptionTag: difficulty <= 2 ? 'shape_side_count' : 'shape_vertex_count',
    variantCount: 40,
    params: (rng) => ({ triangles: rng.int(1, 8), squares: rng.int(1, 8) }),
    stem: ({ triangles, squares }) =>
      difficulty <= 2
        ? `삼각형 ${triangles}개와 사각형 ${squares}개의 변은 모두 몇 개인가요?`
        : `삼각형 ${triangles}개와 사각형 ${squares}개의 꼭짓점은 모두 몇 개인가요?`,
    answer: ({ triangles, squares }) => triangles * 3 + squares * 4,
    offsets: [
      [1, '변이나 꼭짓점을 하나 더 셈'],
      [-1, '변이나 꼭짓점을 하나 덜 셈'],
      [3, '삼각형 하나를 더 셈'],
    ],
    explanation: () => '삼각형은 3개씩, 사각형은 4개씩 세어 더합니다.',
  });
}

function geometryCompareTemplate(grade: Grade): Template {
  return template({
    key: `g${grade}-shape-more-less`,
    grade,
    domain: Domain.Geometry,
    difficulty: 2,
    unit: '평면도형',
    standard: '4수03-01',
    misconceptionTag: 'shape_count_comparison',
    variantCount: 40,
    params: (rng) => {
      const circles = rng.int(3, 18);
      return { circles, triangles: circles + rng.int(1, 8) };
    },
    stem: ({ circles, triangles }) => `동그라미가 ${circles}개, 삼각형이 ${triangles}개 있습니다. 삼각형이 몇 개 더 많나요?`,
    answer: ({ circles, triangles }) => triangles - circles,
    offsets: [
      [1, '차이를 하나 크게 셈'],
      [-1, '차이를 하나 작게 셈'],
      [2, '두 도형 수를 더하려 함'],
    ],
    explanation: ({ circles, triangles }) => `${triangles}에서 ${circles}를 빼면 더 많은 수를 알 수 있습니다.`,
  });
}

function dataTemplate(grade: Grade): Template {
  return template({
    key: `g${grade}-picture-graph-count`,
    grade,
    domain: Domain.Data,
    difficulty: 5,
    unit: '그림그래프',
    standard: '4수04-01',
    misconceptionTag: 'picture_graph_counting',
    variantCount: 30,
    params: (rng) => ({ icons: rng.int(2, 12), scale: rng.int(2, 5) }),
    stem: ({ icons, scale }) => `그림 1개가 ${scale}개를 뜻합니다. 그림 ${icons}개는 모두 몇 개인가요?`,
    answer: ({ icons, scale }) => icons * scale,
    offsets: [
      [2, '그림을 하나 더 셈'],
      [-2, '그림을 하나 덜 셈'],
      [1, '묶음 수 대신 하나씩 더 셈'],
    ],
    explanation: ({ icons, scale }) => `${scale}개씩 ${icons}묶음이므로 ${icons * scale}개입니다.`,
  });
}

export default [
  numberTemplate(1, 1, 'g1-add-within-10', 9),
  numberTemplate(1, 2, 'g1-sub-within-10', 9),
  relationTemplate(1),
  geometryTemplate(1, 4, 'g1-shape-count'),
  geometryCompareTemplate(1),
  dataTemplate(1),
  numberTemplate(2, 1, 'g2-add-within-20', 19),
  numberTemplate(2, 2, 'g2-sub-within-20', 19),
  relationTemplate(2),
  geometryTemplate(2, 4, 'g2-shape-count'),
  geometryCompareTemplate(2),
  dataTemplate(2),
];
