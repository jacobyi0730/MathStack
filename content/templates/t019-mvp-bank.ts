import { Domain, type Difficulty, type Grade, type Semester } from '../../shared/domain.js';
import { defineTemplate, type TemplateDefinition } from '../../tools/template.js';
import type { Rng } from '../../tools/rng.js';

type Template = TemplateDefinition<Record<string, number>>;

function sortedChoices(answer: number, offsets: readonly [number, string][]): number[] {
  return [answer, ...offsets.map(([offset]) => answer + offset)];
}

function arithmeticTemplate(options: {
  key: string;
  grade: Grade;
  semester: Semester;
  domain: Template['domain'];
  standard: string;
  unit: string;
  difficulty: Difficulty;
  misconceptionTag: string;
  variantCount?: number;
  params: (rng: Rng) => Record<string, number>;
  stem: (params: Record<string, number>) => string;
  answer: (params: Record<string, number>) => number;
  offsets: readonly [offset: number, reason: string][];
  explanation: (params: Record<string, number>) => string;
}): Template {
  return defineTemplate({
    key: options.key,
    grade: options.grade,
    semester: options.semester,
    domain: options.domain,
    standard: options.standard,
    unit: options.unit,
    difficulty: options.difficulty,
    misconceptionTag: options.misconceptionTag,
    variantCount: options.variantCount,
    params: options.params,
    validateParams: (params) => new Set(sortedChoices(options.answer(params), options.offsets)).size === 4,
    stem: options.stem,
    answer: options.answer,
    distractors: options.offsets.map(([offset, reason]) => [reason, (params) => options.answer(params) + offset] as const),
    explanation: ({ params }) => options.explanation(params),
  });
}

function divisionTemplate(options: {
  key: string;
  grade: Grade;
  semester: Semester;
  standard: string;
  unit: string;
  difficulty: Difficulty;
  params: (rng: Rng) => Record<string, number>;
  stem: (params: Record<string, number>) => string;
  answer: (params: Record<string, number>) => number;
  misconceptionTag: string;
  explanation: (params: Record<string, number>) => string;
}): Template {
  return arithmeticTemplate({
    ...options,
    domain: Domain.Number,
    offsets: [
      [1, '나머지를 몫에 1로 더함'],
      [-1, '몫을 하나 작게 셈'],
      [10, '십의 자리 계산을 빠뜨림'],
    ],
  });
}

function numberTemplate(options: Omit<Parameters<typeof arithmeticTemplate>[0], 'domain'>): Template {
  return arithmeticTemplate({ ...options, domain: Domain.Number });
}

function geometryTemplate(options: Omit<Parameters<typeof arithmeticTemplate>[0], 'domain'>): Template {
  return arithmeticTemplate({ ...options, domain: Domain.Geometry });
}

function relationTemplate(options: Omit<Parameters<typeof arithmeticTemplate>[0], 'domain' | 'variantCount'>): Template {
  return arithmeticTemplate({ ...options, domain: Domain.Relation, variantCount: 120 });
}

function dataTemplate(options: Omit<Parameters<typeof arithmeticTemplate>[0], 'domain'>): Template {
  return arithmeticTemplate({ ...options, domain: Domain.Data });
}

const templates: Template[] = [
  numberTemplate({
    key: 't019-g3-multiplication-one-digit',
    grade: 3,
    semester: 1,
    standard: '4수01-04',
    unit: '곱셈',
    difficulty: 2,
    misconceptionTag: 'multiplication_place_value',
    params: (rng) => ({ a: rng.int(21, 98), b: rng.int(2, 8) }),
    stem: ({ a, b }) => `${a} x ${b} = ?`,
    answer: ({ a, b }) => a * b,
    offsets: [
      [10, '십의 자리 올림을 한 번 더함'],
      [-10, '십의 자리 올림을 빠뜨림'],
      [1, '일의 자리 곱을 1 크게 계산함'],
    ],
    explanation: ({ a, b }) => `${a}를 ${b}번 더하거나 자리별로 곱해 합합니다.`,
  }),
  divisionTemplate({
    key: 't019-g3-division-basic',
    grade: 3,
    semester: 1,
    standard: '4수01-05',
    unit: '나눗셈',
    difficulty: 3,
    misconceptionTag: 'division_multiplication_inverse',
    params: (rng) => {
      const q = rng.int(3, 12);
      const d = rng.int(2, 9);
      return { q, d, n: q * d };
    },
    stem: ({ n, d }) => `${n} / ${d} = ?`,
    answer: ({ q }) => q,
    explanation: ({ n, d, q }) => `${d} x ${q} = ${n}이므로 몫은 ${q}입니다.`,
  }),
  numberTemplate({
    key: 't019-g3-fraction-unit',
    grade: 3,
    semester: 1,
    standard: '4수01-09',
    unit: '분수와 소수',
    difficulty: 1,
    misconceptionTag: 'fraction_denominator_meaning',
    params: (rng) => {
      const whole = rng.int(3, 30);
      return { whole, shaded: rng.int(1, whole - 1) };
    },
    stem: ({ whole, shaded }) => `전체를 ${whole}칸으로 똑같이 나누고 ${shaded}칸을 색칠했습니다. 분모는 무엇인가요?`,
    answer: ({ whole }) => whole,
    offsets: [
      [-1, '전체 칸을 하나 적게 셈'],
      [1, '전체 칸을 하나 많게 셈'],
      [-2, '색칠한 칸과 전체 칸을 섞어 셈'],
    ],
    explanation: ({ whole }) => `분모는 전체를 똑같이 나눈 칸 수인 ${whole}입니다.`,
  }),
  numberTemplate({
    key: 't019-g3-mixed-fraction',
    grade: 3,
    semester: 2,
    standard: '4수01-10',
    unit: '분수',
    difficulty: 4,
    misconceptionTag: 'mixed_fraction_whole_part',
    params: (rng) => {
      const denominator = rng.int(3, 12);
      return { whole: rng.int(1, 9), numerator: rng.int(1, denominator - 1), denominator };
    },
    stem: ({ whole, numerator, denominator }) =>
      `${whole}과 ${numerator}/${denominator}는 ${denominator}분의 몇인가요?`,
    answer: ({ whole, numerator, denominator }) => whole * denominator + numerator,
    offsets: [
      [-5, '자연수 1을 분수 한 묶음으로 바꾸지 않음'],
      [1, '분자를 하나 더 크게 셈'],
      [-1, '분자를 하나 작게 셈'],
    ],
    explanation: ({ whole, numerator, denominator }) =>
      `${whole}은 ${denominator}분의 ${whole * denominator}이고, ${numerator}를 더합니다.`,
  }),
  relationTemplate({
    key: 't019-g3-equality-missing-number',
    grade: 3,
    semester: 1,
    standard: '4수02-03',
    unit: '등호와 동치 관계',
    difficulty: 5,
    misconceptionTag: 'equals_as_answer_signal',
    params: (rng) => ({ a: rng.int(12, 49), b: rng.int(8, 37), c: rng.int(5, 25) }),
    stem: ({ a, b, c }) => `${a} + ${b} = □ + ${c}일 때 □에 알맞은 수는?`,
    answer: ({ a, b, c }) => a + b - c,
    offsets: [
      [10, '등호 오른쪽의 수를 빼지 않고 크게 봄'],
      [-10, '등호 오른쪽의 수를 한 번 더 뺌'],
      [1, '양쪽 합을 1 차이 나게 맞춤'],
    ],
    explanation: ({ a, b, c }) => `왼쪽 합 ${a + b}와 같아야 하므로 ${a + b} - ${c}을 계산합니다.`,
  }),
  geometryTemplate({
    key: 't019-g3-right-angle-count',
    grade: 3,
    semester: 1,
    standard: '4수03-02',
    unit: '평면도형',
    difficulty: 2,
    misconceptionTag: 'right_angle_count',
    params: (rng) => ({ rectangles: rng.int(1, 12), triangles: rng.int(1, 10) }),
    stem: ({ rectangles, triangles }) =>
      `직사각형 ${rectangles}개와 직각삼각형 ${triangles}개에는 직각이 모두 몇 개 있나요?`,
    answer: ({ rectangles, triangles }) => rectangles * 4 + triangles,
    offsets: [
      [-1, '직각삼각형의 직각을 하나 빠뜨림'],
      [-2, '두 직각을 빠뜨림'],
      [1, '직각이 아닌 각을 하나 더 셈'],
    ],
    explanation: () => '직사각형은 4개씩, 직각삼각형은 1개씩 직각이 있습니다.',
  }),
];

const moreTemplates: Template[] = [
  geometryTemplate({
    key: 't019-g3-length-conversion',
    grade: 3,
    semester: 1,
    standard: '4수03-13',
    unit: '길이와 시간',
    difficulty: 3,
    misconceptionTag: 'length_unit_conversion',
    params: (rng) => ({ m: rng.int(2, 9), cm: rng.int(10, 90) }),
    stem: ({ m, cm }) => `${m}m ${cm}cm는 모두 몇 cm인가요?`,
    answer: ({ m, cm }) => m * 100 + cm,
    offsets: [
      [-90, '1m를 10cm로 바꿈'],
      [-50, 'cm 부분을 빠뜨림'],
      [10, 'cm 부분을 10 크게 계산함'],
    ],
    explanation: ({ m, cm }) => `1m는 100cm이므로 ${m * 100}cm에 ${cm}cm를 더합니다.`,
  }),
  geometryTemplate({
    key: 't019-g3-time-elapsed',
    grade: 3,
    semester: 1,
    standard: '4수03-15',
    unit: '길이와 시간',
    difficulty: 4,
    misconceptionTag: 'elapsed_time_minutes',
    params: (rng) => ({ hour: rng.int(1, 3), minute: rng.int(10, 45), add: rng.int(12, 40) }),
    stem: ({ hour, minute, add }) => `${hour}시 ${minute}분에서 ${add}분 뒤는 몇 분인가요?`,
    answer: ({ minute, add }) => minute + add,
    offsets: [
      [-10, '10분을 적게 더함'],
      [10, '10분을 많이 더함'],
      [-20, '처음 분만 읽음'],
    ],
    explanation: ({ minute, add }) => `분끼리 먼저 더하면 ${minute} + ${add} = ${minute + add}분입니다.`,
  }),
  geometryTemplate({
    key: 't019-g3-weight-total',
    grade: 3,
    semester: 2,
    standard: '4수03-19',
    unit: '들이와 무게',
    difficulty: 5,
    misconceptionTag: 'mass_kg_g_conversion',
    params: (rng) => ({ kg: rng.int(1, 4), g: rng.int(100, 850) }),
    stem: ({ kg, g }) => `${kg}kg ${g}g은 모두 몇 g인가요?`,
    answer: ({ kg, g }) => kg * 1000 + g,
    offsets: [
      [-900, '1kg을 100g으로 바꿈'],
      [-100, 'g 부분을 빠뜨림'],
      [100, '100g을 더 세어 넣음'],
    ],
    explanation: ({ kg, g }) => `1kg은 1000g이므로 ${kg * 1000}g에 ${g}g을 더합니다.`,
  }),
  dataTemplate({
    key: 't019-g3-picture-graph',
    grade: 3,
    semester: 2,
    standard: '4수04-01',
    unit: '그림그래프',
    difficulty: 1,
    misconceptionTag: 'picture_graph_scale',
    params: (rng) => ({ icons: rng.int(2, 20), scale: rng.int(2, 9) }),
    stem: ({ icons, scale }) => `그림그래프에서 그림 1개가 ${scale}명을 뜻합니다. 그림 ${icons}개는 몇 명인가요?`,
    answer: ({ icons, scale }) => icons * scale,
    offsets: [
      [2, '그림을 하나 더 세어 곱함'],
      [-2, '그림을 하나 덜 세어 곱함'],
      [1, '그림 수와 사람 수를 1 차이로 셈'],
    ],
    explanation: ({ icons, scale }) => `${scale}명씩 ${icons}개이므로 ${icons * scale}명입니다.`,
  }),
  numberTemplate({
    key: 't019-g4-large-number-place',
    grade: 4,
    semester: 1,
    standard: '4수01-01',
    unit: '큰 수',
    difficulty: 1,
    misconceptionTag: 'large_number_place_value',
    params: (rng) => ({ tenThousands: rng.int(2, 20), hundreds: rng.int(2, 9) }),
    stem: ({ tenThousands, hundreds }) => `${tenThousands}만 ${hundreds}백은 모두 얼마인가요?`,
    answer: ({ tenThousands, hundreds }) => tenThousands * 10000 + hundreds * 100,
    offsets: [
      [-90, '백을 십으로 잘못 봄'],
      [1000, '천의 자리를 하나 더 넣음'],
      [-1000, '천의 자리를 하나 빠뜨림'],
    ],
    explanation: ({ tenThousands, hundreds }) =>
      `${tenThousands}만은 ${tenThousands * 10000}, ${hundreds}백은 ${hundreds * 100}입니다.`,
  }),
  divisionTemplate({
    key: 't019-g4-two-digit-division',
    grade: 4,
    semester: 1,
    standard: '4수01-07',
    unit: '곱셈과 나눗셈',
    difficulty: 2,
    params: (rng) => {
      const d = rng.int(12, 24);
      const q = rng.int(11, 35);
      return { d, q, n: d * q };
    },
    stem: ({ n, d }) => `${n} / ${d} = ?`,
    answer: ({ q }) => q,
    misconceptionTag: 'division_two_digit_divisor',
    explanation: ({ d, q, n }) => `${d} x ${q} = ${n}이므로 몫은 ${q}입니다.`,
  }),
  numberTemplate({
    key: 't019-g4-decimal-addition',
    grade: 4,
    semester: 2,
    standard: '4수01-13',
    unit: '소수의 덧셈과 뺄셈',
    difficulty: 3,
    misconceptionTag: 'decimal_tenths_addition',
    params: (rng) => ({ a: rng.int(12, 89), b: rng.int(11, 79) }),
    stem: ({ a, b }) => `${Math.floor(a / 10)}.${a % 10} + ${Math.floor(b / 10)}.${b % 10} = ? (답은 소수 첫째 자리 수로 고르세요)`,
    answer: ({ a, b }) => a + b,
    offsets: [
      [10, '소수점 위치를 한 자리 크게 봄'],
      [-10, '소수점 위치를 한 자리 작게 봄'],
      [1, '소수 첫째 자리 계산을 1 크게 함'],
    ],
    explanation: ({ a, b }) => `소수 첫째 자리 수는 10배하여 ${a} + ${b}처럼 계산한 뒤 소수점을 되돌립니다.`,
  }),
  numberTemplate({
    key: 't019-g4-decimal-subtraction',
    grade: 4,
    semester: 2,
    standard: '4수01-16',
    unit: '소수의 덧셈과 뺄셈',
    difficulty: 4,
    misconceptionTag: 'decimal_subtraction_alignment',
    params: (rng) => {
      const b = rng.int(12, 69);
      return { a: b + rng.int(12, 40), b };
    },
    stem: ({ a, b }) => `${Math.floor(a / 10)}.${a % 10} - ${Math.floor(b / 10)}.${b % 10} = ? (답은 소수 첫째 자리 수로 고르세요)`,
    answer: ({ a, b }) => a - b,
    offsets: [
      [10, '받아내림을 빠뜨림'],
      [-1, '소수 첫째 자리를 1 작게 계산함'],
      [1, '소수 첫째 자리를 1 크게 계산함'],
    ],
    explanation: ({ a, b }) => `소수점을 맞추어 ${a} - ${b}처럼 계산합니다.`,
  }),
  relationTemplate({
    key: 't019-g4-pattern-add',
    grade: 4,
    semester: 1,
    standard: '4수02-01',
    unit: '규칙 찾기',
    difficulty: 5,
    misconceptionTag: 'pattern_difference_error',
    params: (rng) => ({ start: rng.int(3, 30), step: rng.int(3, 12), index: rng.int(4, 7) }),
    stem: ({ start, step, index }) => `${start}, ${start + step}, ${start + step * 2}, ... 규칙에서 ${index}번째 수는?`,
    answer: ({ start, step, index }) => start + step * (index - 1),
    offsets: [
      [5, '첫째 수에도 한 번 더 더함'],
      [-5, '더하는 횟수를 하나 적게 셈'],
      [1, '규칙을 1 크게 적용함'],
    ],
    explanation: ({ step, index }) => `${index}번째는 ${step}을 ${index - 1}번 더한 수입니다.`,
  }),
  geometryTemplate({
    key: 't019-g4-angle-sum',
    grade: 4,
    semester: 1,
    standard: '4수03-24',
    unit: '각도',
    difficulty: 1,
    misconceptionTag: 'angle_addition',
    params: (rng) => ({ a: rng.int(20, 70), b: rng.int(15, 80) }),
    stem: ({ a, b }) => `${a}도와 ${b}도를 이어 붙이면 모두 몇 도인가요?`,
    answer: ({ a, b }) => a + b,
    offsets: [
      [-10, '10도를 적게 더함'],
      [10, '10도를 많이 더함'],
      [-20, '첫 각만 읽음'],
    ],
    explanation: ({ a, b }) => `이어 붙인 각의 크기는 ${a} + ${b}입니다.`,
  }),
  geometryTemplate({
    key: 't019-g4-shape-translation',
    grade: 4,
    semester: 1,
    standard: '4수03-04',
    unit: '평면도형의 이동',
    difficulty: 2,
    misconceptionTag: 'translation_distance',
    params: (rng) => ({ right: rng.int(2, 60), up: rng.int(1, 50) }),
    stem: ({ right, up }) => `점이 오른쪽 ${right}칸, 위쪽 ${up}칸 이동했습니다. 모두 몇 칸 이동했나요?`,
    answer: ({ right, up }) => right + up,
    offsets: [
      [-3, '가로 이동만 셈'],
      [-5, '세로 이동만 셈'],
      [1, '시작 칸을 함께 셈'],
    ],
    explanation: ({ right, up }) => `가로 ${right}칸과 세로 ${up}칸을 더해 셉니다.`,
  }),
  geometryTemplate({
    key: 't019-g4-triangle-angle',
    grade: 4,
    semester: 2,
    standard: '4수03-08',
    unit: '삼각형',
    difficulty: 3,
    misconceptionTag: 'triangle_angle_sum',
    params: (rng) => {
      const a = rng.int(35, 75);
      const b = rng.int(35, 75);
      return { a, b };
    },
    stem: ({ a, b }) => `삼각형의 두 각이 ${a}도, ${b}도입니다. 나머지 한 각은 몇 도인가요?`,
    answer: ({ a, b }) => 180 - a - b,
    offsets: [
      [10, '삼각형 각의 합에서 10도를 덜 뺌'],
      [-10, '삼각형 각의 합에서 10도를 더 뺌'],
      [20, '두 각 중 하나를 다시 더함'],
    ],
    explanation: ({ a, b }) => `삼각형의 세 각의 합은 180도이므로 ${a}와 ${b}를 뺍니다.`,
  }),
  geometryTemplate({
    key: 't019-g4-polygon-sides',
    grade: 4,
    semester: 2,
    standard: '4수03-11',
    unit: '다각형',
    difficulty: 4,
    misconceptionTag: 'polygon_side_count',
    params: (rng) => ({ sides: rng.int(5, 18), add: rng.int(1, 8) }),
    stem: ({ sides, add }) => `${sides}각형보다 변이 ${add}개 더 많은 다각형은 몇 각형인가요?`,
    answer: ({ sides, add }) => sides + add,
    offsets: [
      [-2, '처음 다각형의 변 수만 읽음'],
      [1, '꼭짓점 하나를 더 셈'],
      [-1, '변 하나를 빠뜨림'],
    ],
    explanation: ({ sides, add }) => `다각형 이름의 수는 변의 수이므로 ${sides} + ${add}입니다.`,
  }),
  dataTemplate({
    key: 't019-g4-line-graph-change',
    grade: 4,
    semester: 2,
    standard: '4수04-02',
    unit: '꺾은선그래프',
    difficulty: 5,
    misconceptionTag: 'line_graph_difference',
    params: (rng) => ({ first: rng.int(12, 45), change: rng.int(5, 28) }),
    stem: ({ first, change }) => `월요일 값이 ${first}, 화요일 값이 ${first + change}입니다. 얼마나 늘었나요?`,
    answer: ({ change }) => change,
    offsets: [
      [10, '두 값을 더하는 방식으로 생각함'],
      [-1, '차이를 1 작게 셈'],
      [1, '차이를 1 크게 셈'],
    ],
    explanation: ({ first, change }) => `${first + change}에서 ${first}를 빼 변화량을 구합니다.`,
  }),
  numberTemplate({
    key: 't019-g5-mixed-operation',
    grade: 5,
    semester: 1,
    standard: '6수01-01',
    unit: '자연수의 혼합 계산',
    difficulty: 1,
    misconceptionTag: 'operation_order',
    params: (rng) => ({ a: rng.int(12, 45), b: rng.int(2, 9), c: rng.int(3, 12) }),
    stem: ({ a, b, c }) => `${a} + ${b} x ${c} = ?`,
    answer: ({ a, b, c }) => a + b * c,
    offsets: [
      [10, '곱셈 뒤 덧셈에서 10을 더 셈'],
      [-10, '곱셈 뒤 덧셈에서 10을 덜 셈'],
      [1, '곱셈 결과를 1 크게 계산함'],
    ],
    explanation: ({ a, b, c }) => `곱셈 ${b} x ${c}를 먼저 하고 ${a}를 더합니다.`,
  }),
  numberTemplate({
    key: 't019-g5-common-factor',
    grade: 5,
    semester: 1,
    standard: '6수01-04',
    unit: '약수와 배수',
    difficulty: 2,
    misconceptionTag: 'greatest_common_factor',
    params: (rng) => ({ base: rng.int(3, 9), left: rng.int(2, 5), right: rng.int(6, 10) }),
    stem: ({ base, left, right }) => `${base * left}와 ${base * right}의 공약수 중 ${base}는 몇의 배수인가요?`,
    answer: ({ base }) => base,
    offsets: [
      [1, '공약수를 하나 크게 고름'],
      [-1, '공약수를 하나 작게 고름'],
      [2, '두 수의 차이를 섞어 고름'],
    ],
    explanation: ({ base, left, right }) => `${base * left}와 ${base * right}는 모두 ${base}로 나누어떨어집니다.`,
  }),
  numberTemplate({
    key: 't019-g5-simplify-fraction',
    grade: 5,
    semester: 1,
    standard: '6수01-06',
    unit: '약분과 통분',
    difficulty: 3,
    misconceptionTag: 'fraction_simplification_factor',
    params: (rng) => ({ numerator: rng.int(2, 7), denominator: rng.int(8, 12), factor: rng.int(2, 5) }),
    stem: ({ numerator, denominator, factor }) =>
      `${numerator * factor}/${denominator * factor}를 약분할 때 나누어야 하는 수는?`,
    answer: ({ factor }) => factor,
    offsets: [
      [1, '공약수를 하나 크게 봄'],
      [-1, '공약수를 하나 작게 봄'],
      [2, '분자 쪽 수와 섞어 봄'],
    ],
    explanation: ({ factor }) => `분자와 분모에 공통으로 곱해진 ${factor}로 나누면 됩니다.`,
  }),
  numberTemplate({
    key: 't019-g5-fraction-multiplication-numerator',
    grade: 5,
    semester: 2,
    standard: '6수01-09',
    unit: '분수의 곱셈',
    difficulty: 4,
    misconceptionTag: 'fraction_multiplication_numerator',
    params: (rng) => ({ a: rng.int(1, 5), b: rng.int(2, 7), c: rng.int(2, 6), d: rng.int(3, 9) }),
    stem: ({ a, b, c, d }) => `${a}/${b} x ${c}/${d}의 분자는 얼마인가요?`,
    answer: ({ a, c }) => a * c,
    offsets: [
      [1, '분자 곱을 1 크게 계산함'],
      [-1, '분자 곱을 1 작게 계산함'],
      [2, '분모 수를 하나 섞어 곱함'],
    ],
    explanation: ({ a, c }) => `분수의 곱셈에서 분자는 분자끼리 곱해 ${a * c}입니다.`,
  }),
  relationTemplate({
    key: 't019-g5-correspondence',
    grade: 5,
    semester: 1,
    standard: '6수02-01',
    unit: '규칙과 대응',
    difficulty: 5,
    misconceptionTag: 'correspondence_rule',
    params: (rng) => ({ boxes: rng.int(3, 12), perBox: rng.int(2, 8), extra: rng.int(1, 5) }),
    stem: ({ boxes, perBox, extra }) => `상자 수를 □라 할 때 사탕 수는 □ x ${perBox} + ${extra}입니다. 상자 ${boxes}개면 사탕은?`,
    answer: ({ boxes, perBox, extra }) => boxes * perBox + extra,
    offsets: [
      [-3, '마지막에 더하는 수를 빠뜨림'],
      [4, '상자를 하나 더 있다고 봄'],
      [-4, '상자를 하나 적게 있다고 봄'],
    ],
    explanation: ({ boxes, perBox, extra }) => `${boxes} x ${perBox}에 ${extra}를 더합니다.`,
  }),
  geometryTemplate({
    key: 't019-g5-rectangle-perimeter',
    grade: 5,
    semester: 1,
    standard: '6수03-11',
    unit: '다각형의 둘레와 넓이',
    difficulty: 1,
    misconceptionTag: 'perimeter_area_confusion',
    params: (rng) => ({ w: rng.int(3, 15), h: rng.int(2, 12) }),
    stem: ({ w, h }) => `가로 ${w}cm, 세로 ${h}cm인 직사각형의 둘레는 몇 cm인가요?`,
    answer: ({ w, h }) => (w + h) * 2,
    offsets: [
      [-6, '가로와 세로를 한 번씩만 더함'],
      [2, '두 변을 1cm씩 크게 봄'],
      [-2, '두 변을 1cm씩 작게 봄'],
    ],
    explanation: ({ w, h }) => `직사각형 둘레는 (${w} + ${h}) x 2입니다.`,
  }),
  geometryTemplate({
    key: 't019-g5-rectangle-area',
    grade: 5,
    semester: 1,
    standard: '6수03-12',
    unit: '다각형의 둘레와 넓이',
    difficulty: 2,
    misconceptionTag: 'rectangle_area_multiply',
    params: (rng) => ({ w: rng.int(3, 14), h: rng.int(3, 12) }),
    stem: ({ w, h }) => `가로 ${w}cm, 세로 ${h}cm인 직사각형의 넓이는 몇 cm2인가요?`,
    answer: ({ w, h }) => w * h,
    offsets: [
      [5, '둘레처럼 더해서 계산함'],
      [1, '칸을 하나 더 셈'],
      [-1, '칸을 하나 덜 셈'],
    ],
    explanation: ({ w, h }) => `직사각형 넓이는 가로 x 세로, ${w} x ${h}입니다.`,
  }),
  geometryTemplate({
    key: 't019-g5-line-symmetry',
    grade: 5,
    semester: 2,
    standard: '6수03-01',
    unit: '합동과 대칭',
    difficulty: 3,
    misconceptionTag: 'line_symmetry_count',
    params: (rng) => ({ sides: rng.int(3, 20), count: rng.int(1, 20) }),
    stem: ({ sides, count }) => `정${sides}각형 ${count}개의 대칭축은 모두 몇 개라고 볼 수 있나요?`,
    answer: ({ sides, count }) => sides * count,
    offsets: [
      [1, '대칭축을 하나 더 그림'],
      [-1, '대칭축을 하나 덜 그림'],
      [2, '변과 꼭짓점을 각각 세어 섞음'],
    ],
    explanation: ({ sides, count }) => `정${sides}각형은 ${sides}개의 대칭축을 가지므로 ${count}개에 곱합니다.`,
  }),
  geometryTemplate({
    key: 't019-g5-cuboid-edges',
    grade: 5,
    semester: 2,
    standard: '6수03-03',
    unit: '직육면체',
    difficulty: 4,
    misconceptionTag: 'cuboid_edge_count',
    params: (rng) => ({ boxes: rng.int(1, 600) }),
    stem: ({ boxes }) => `직육면체 ${boxes}개에는 모서리가 모두 몇 개 있나요?`,
    answer: ({ boxes }) => boxes * 12,
    offsets: [
      [-4, '한 면의 모서리를 빠뜨림'],
      [4, '한 면의 모서리를 한 번 더 셈'],
      [-2, '직육면체마다 하나씩 덜 셈'],
    ],
    explanation: ({ boxes }) => `직육면체 하나의 모서리는 12개이므로 ${boxes} x 12입니다.`,
  }),
  dataTemplate({
    key: 't019-g5-average',
    grade: 5,
    semester: 2,
    standard: '6수04-01',
    unit: '평균과 가능성',
    difficulty: 5,
    misconceptionTag: 'average_sum_count',
    params: (rng) => ({ avg: rng.int(3, 50), count: rng.int(2, 10) }),
    stem: ({ avg, count }) => `${count}명의 평균 점수가 ${avg}점이면 점수의 합은?`,
    answer: ({ avg, count }) => avg * count,
    offsets: [
      [-10, '한 명을 빠뜨리고 곱함'],
      [10, '한 명을 더 넣어 곱함'],
      [5, '평균과 사람 수를 더함'],
    ],
    explanation: ({ avg, count }) => `평균 x 자료 수가 전체 합이므로 ${avg} x ${count}입니다.`,
  }),
  numberTemplate({
    key: 't019-g6-fraction-division-whole',
    grade: 6,
    semester: 1,
    standard: '6수01-11',
    unit: '분수의 나눗셈',
    difficulty: 1,
    misconceptionTag: 'fraction_division_by_whole',
    params: (rng) => ({ numerator: rng.int(2, 9), denominator: rng.int(3, 10), divisor: rng.int(2, 5) }),
    stem: ({ numerator, denominator, divisor }) => `${numerator}/${denominator} / ${divisor}의 새 분모는?`,
    answer: ({ denominator, divisor }) => denominator * divisor,
    offsets: [
      [-2, '나누는 수를 분모에 곱하지 않음'],
      [2, '나누는 수를 한 번 더 곱함'],
      [1, '분모를 1 크게 계산함'],
    ],
    explanation: ({ denominator, divisor }) => `분수 나누기 자연수는 분모에 ${divisor}를 곱해 ${denominator * divisor}가 됩니다.`,
  }),
  numberTemplate({
    key: 't019-g6-decimal-fraction',
    grade: 6,
    semester: 2,
    standard: '6수01-12',
    unit: '분수와 소수의 관계',
    difficulty: 2,
    misconceptionTag: 'decimal_fraction_hundredths',
    params: (rng) => ({ hundredths: rng.int(11, 99) }),
    stem: ({ hundredths }) => `0.${String(hundredths).padStart(2, '0')}는 100분의 몇인가요?`,
    answer: ({ hundredths }) => hundredths,
    offsets: [
      [-10, '십분의 자리로만 봄'],
      [10, '백분의 자리 수를 10 크게 봄'],
      [1, '백분의 자리 수를 1 크게 봄'],
    ],
    explanation: ({ hundredths }) => `소수 둘째 자리까지 있으므로 100분의 ${hundredths}입니다.`,
  }),
  divisionTemplate({
    key: 't019-g6-decimal-division-natural',
    grade: 6,
    semester: 1,
    standard: '6수01-14',
    unit: '소수의 나눗셈',
    difficulty: 3,
    params: (rng) => {
      const q = rng.int(12, 89);
      const d = rng.int(2, 9);
      return { q, d, n: q * d };
    },
    stem: ({ n, d }) => `${Math.floor(n / 10)}.${n % 10} / ${d} = ? (답은 소수 첫째 자리 수로 고르세요)`,
    answer: ({ q }) => q,
    misconceptionTag: 'decimal_division_place_value',
    explanation: ({ n, d, q }) => `${n} / ${d} = ${q}로 계산한 뒤 소수점을 되돌립니다.`,
  }),
  divisionTemplate({
    key: 't019-g6-decimal-division-decimal',
    grade: 6,
    semester: 1,
    standard: '6수01-15',
    unit: '소수의 나눗셈',
    difficulty: 4,
    params: (rng) => {
      const q = rng.int(11, 70);
      const d = rng.int(2, 8);
      return { q, d, n: q * d };
    },
    stem: ({ n, d }) => `${Math.floor(n / 10)}.${n % 10} / 0.${d} = ? (답은 자연수로 고르세요)`,
    answer: ({ q }) => q,
    misconceptionTag: 'decimal_divisor_scaling',
    explanation: ({ n, d, q }) => `나누는 수와 나누어지는 수를 10배하면 ${n} / ${d} = ${q}입니다.`,
  }),
  relationTemplate({
    key: 't019-g6-ratio',
    grade: 6,
    semester: 1,
    standard: '6수02-02',
    unit: '비와 비율',
    difficulty: 5,
    misconceptionTag: 'ratio_part_total_confusion',
    params: (rng) => ({ left: rng.int(2, 9), right: rng.int(2, 9), scale: rng.int(2, 7) }),
    stem: ({ left, right, scale }) => `${left}:${right}과 같은 비에서 앞항이 ${left * scale}이면 뒤항은?`,
    answer: ({ right, scale }) => right * scale,
    offsets: [
      [-3, '배율을 하나 적게 적용함'],
      [3, '배율을 하나 더 적용함'],
      [1, '뒤항을 1 크게 계산함'],
    ],
    explanation: ({ scale }) => `앞항이 ${scale}배 되었으므로 뒤항도 ${scale}배 합니다.`,
  }),
  geometryTemplate({
    key: 't019-g6-prism-vertices',
    grade: 6,
    semester: 1,
    standard: '6수03-05',
    unit: '각기둥과 각뿔',
    difficulty: 1,
    misconceptionTag: 'prism_vertex_count',
    params: (rng) => ({ sides: rng.int(3, 30), count: rng.int(1, 40) }),
    stem: ({ sides, count }) => `${sides}각기둥 ${count}개의 꼭짓점은 모두 몇 개입니까?`,
    answer: ({ sides, count }) => sides * 2 * count,
    offsets: [
      [-3, '밑면 하나의 꼭짓점만 셈'],
      [3, '밑면을 하나 더 셈'],
      [1, '꼭짓점을 하나 더 셈'],
    ],
    explanation: ({ sides, count }) => `각기둥 하나의 꼭짓점은 ${sides} x 2개이고, ${count}개에 곱합니다.`,
  }),
  geometryTemplate({
    key: 't019-g6-cubes-front-view',
    grade: 6,
    semester: 2,
    standard: '6수03-09',
    unit: '공간과 입체',
    difficulty: 2,
    misconceptionTag: 'stacked_cube_layer_count',
    params: (rng) => ({ bottom: rng.int(3, 30), top: rng.int(1, 20) }),
    stem: ({ bottom, top }) => `아래층 ${bottom}개, 위층 ${top}개로 쌓은 쌓기나무는 모두 몇 개인가요?`,
    answer: ({ bottom, top }) => bottom + top,
    offsets: [
      [-2, '위층을 빠뜨림'],
      [2, '위층을 한 번 더 셈'],
      [1, '보이지 않는 한 개를 있다고 봄'],
    ],
    explanation: ({ bottom, top }) => `층별 개수를 더해 ${bottom} + ${top}입니다.`,
  }),
  geometryTemplate({
    key: 't019-g6-circle-circumference',
    grade: 6,
    semester: 2,
    standard: '6수03-15',
    unit: '원주율과 원의 넓이',
    difficulty: 3,
    misconceptionTag: 'circumference_diameter_radius',
    params: (rng) => ({ diameter: rng.int(4, 600) }),
    stem: ({ diameter }) => `원주율을 3으로 볼 때 지름 ${diameter}cm인 원의 둘레는 몇 cm인가요?`,
    answer: ({ diameter }) => diameter * 3,
    offsets: [
      [-3, '반지름처럼 한 번 적게 곱함'],
      [3, '지름을 한 번 더 곱함'],
      [1, '원주를 1cm 크게 어림함'],
    ],
    explanation: ({ diameter }) => `원의 둘레는 지름 x 원주율이므로 ${diameter} x 3입니다.`,
  }),
  geometryTemplate({
    key: 't019-g6-cuboid-volume',
    grade: 6,
    semester: 1,
    standard: '6수03-17',
    unit: '직육면체의 부피와 겉넓이',
    difficulty: 4,
    misconceptionTag: 'cuboid_volume',
    params: (rng) => ({ w: rng.int(2, 8), h: rng.int(2, 7), d: rng.int(2, 6) }),
    stem: ({ w, h, d }) => `가로 ${w}, 세로 ${h}, 높이 ${d}인 직육면체의 부피는?`,
    answer: ({ w, h, d }) => w * h * d,
    offsets: [
      [-4, '높이를 빠뜨리고 넓이만 구함'],
      [1, '단위 정육면체를 하나 더 셈'],
      [-1, '단위 정육면체를 하나 덜 셈'],
    ],
    explanation: ({ w, h, d }) => `직육면체 부피는 가로 x 세로 x 높이, ${w} x ${h} x ${d}입니다.`,
  }),
  dataTemplate({
    key: 't019-g6-circle-graph-percent',
    grade: 6,
    semester: 1,
    standard: '6수04-02',
    unit: '여러 가지 그래프',
    difficulty: 5,
    misconceptionTag: 'percent_total_amount',
    params: (rng) => ({ total: rng.int(4, 20) * 10, percent: rng.pick([10, 20, 30, 40, 50]) }),
    stem: ({ total, percent }) => `전체 ${total}명 중 ${percent}%는 몇 명인가요?`,
    answer: ({ total, percent }) => (total * percent) / 100,
    offsets: [
      [1, '백분율 계산을 1명 크게 함'],
      [-1, '백분율 계산을 1명 작게 함'],
      [10, '10명을 더해 계산함'],
    ],
    explanation: ({ percent }) => `${percent}%는 100분의 ${percent}이므로 전체에 곱해 구합니다.`,
  }),
];

export default [...templates, ...moreTemplates];
