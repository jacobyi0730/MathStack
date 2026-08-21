import { Domain, type Grade, type Semester, bandOf } from './domain.js';

export interface StandardInfo {
  grade: Grade;
  semester: Semester;
  grades: readonly Grade[];
  semesters: Readonly<Partial<Record<Grade, Semester>>>;
  domain: Domain;
  unit: string;
  fitness: '◎' | '○' | '△' | '✕';
}

export interface StandardEntry extends StandardInfo {
  code: string;
}

function info(
  grade: Grade,
  semester: Semester,
  domain: Domain,
  unit: string,
  fitness: StandardInfo['fitness'],
): StandardInfo {
  return { grade, semester, grades: [grade], semesters: { [grade]: semester }, domain, unit, fitness };
}

function multiGrade(
  base: StandardInfo,
  semesters: Readonly<Partial<Record<Grade, Semester>>>,
): StandardInfo {
  return {
    ...base,
    grades: Object.keys(semesters).map((grade) => Number(grade) as Grade),
    semesters,
  };
}

export const CURRICULUM: Record<string, StandardInfo> = {
  '4수01-01': info(4, 1, Domain.Number, '큰 수', '◎'),
  '4수01-02': info(4, 1, Domain.Number, '큰 수', '◎'),
  '4수01-03': multiGrade(info(3, 1, Domain.Number, '덧셈과 뺄셈', '◎'), { 1: 1, 2: 1, 3: 1 }),
  // 같은 코드가 3학년 2학기 표에도 다시 나오므로 첫 도입 학기로 고정한다.
  '4수01-04': info(3, 1, Domain.Number, '곱셈 (두 자리 × 한 자리)', '◎'),
  '4수01-05': info(3, 1, Domain.Number, '나눗셈', '◎'),
  // 같은 코드가 3학년 2학기 표에도 다시 나오므로 첫 도입 학기로 고정한다.
  '4수01-06': info(3, 1, Domain.Number, '나눗셈', '◎'),
  '4수01-07': info(4, 1, Domain.Number, '곱셈과 나눗셈 (÷ 두 자리 수)', '◎'),
  '4수01-08': info(4, 1, Domain.Number, '곱셈과 나눗셈 (÷ 두 자리 수)', '◎'),
  '4수01-09': info(3, 1, Domain.Number, '분수와 소수', '◎'),
  '4수01-10': info(3, 2, Domain.Number, '분수 (진분수·가분수·대분수)', '◎'),
  '4수01-11': info(3, 2, Domain.Number, '분수 (진분수·가분수·대분수)', '◎'),
  '4수01-12': info(3, 1, Domain.Number, '분수와 소수', '◎'),
  '4수01-13': info(4, 2, Domain.Number, '소수의 덧셈과 뺄셈', '◎'),
  '4수01-14': info(4, 2, Domain.Number, '소수의 덧셈과 뺄셈', '◎'),
  '4수01-15': info(4, 2, Domain.Number, '분수의 덧셈과 뺄셈', '◎'),
  '4수01-16': info(4, 2, Domain.Number, '소수의 덧셈과 뺄셈', '◎'),

  '4수02-01': info(4, 1, Domain.Relation, '규칙 찾기', '◎'),
  '4수02-02': info(4, 1, Domain.Relation, '규칙 찾기', '◎'),
  // 등호의 동치 관계는 두 자리 수 범위에서 다루므로 3학년 덧셈·뺄셈 이후에도 출제 가능하다.
  '4수02-03': multiGrade(info(3, 1, Domain.Relation, '등호와 동치 관계', '◎'), { 1: 1, 2: 1, 3: 1, 4: 1 }),

  '4수03-01': multiGrade(info(3, 1, Domain.Geometry, '평면도형 (선분·직선·반직선, 각, 직각)', '○'), { 1: 1, 2: 1, 3: 1 }),
  '4수03-02': info(3, 1, Domain.Geometry, '평면도형 (선분·직선·반직선, 각, 직각)', '○'),
  '4수03-03': info(4, 2, Domain.Geometry, '사각형 (수직·평행 포함)', '○'),
  '4수03-04': info(4, 1, Domain.Geometry, '평면도형의 이동', '○'),
  '4수03-05': info(4, 1, Domain.Geometry, '평면도형의 이동', '○'),
  '4수03-06': info(3, 2, Domain.Geometry, '원', '○'),
  '4수03-07': info(3, 2, Domain.Geometry, '원', '✕'), // §13.5에서 컴퍼스로 원 그리기를 출제 제외로 못 박았다.
  '4수03-08': info(4, 2, Domain.Geometry, '삼각형', '○'),
  '4수03-09': info(4, 2, Domain.Geometry, '삼각형', '○'),
  '4수03-10': info(4, 2, Domain.Geometry, '사각형 (수직·평행 포함)', '○'),
  '4수03-11': info(4, 2, Domain.Geometry, '다각형', '○'),
  '4수03-12': info(4, 2, Domain.Geometry, '다각형', '○'),
  '4수03-13': info(3, 1, Domain.Geometry, '길이와 시간', '◎'),
  '4수03-14': info(3, 1, Domain.Geometry, '길이와 시간', '◎'),
  '4수03-15': info(3, 1, Domain.Geometry, '길이와 시간', '◎'),
  '4수03-16': info(3, 1, Domain.Geometry, '길이와 시간', '◎'),
  '4수03-17': info(3, 2, Domain.Geometry, '들이와 무게', '◎'),
  '4수03-18': info(3, 2, Domain.Geometry, '들이와 무게', '◎'),
  '4수03-19': info(3, 2, Domain.Geometry, '들이와 무게', '◎'),
  '4수03-20': info(3, 2, Domain.Geometry, '들이와 무게', '◎'),
  '4수03-21': info(3, 2, Domain.Geometry, '들이와 무게', '◎'),
  '4수03-22': info(3, 2, Domain.Geometry, '들이와 무게', '◎'),
  '4수03-23': info(3, 2, Domain.Geometry, '들이와 무게', '◎'),
  '4수03-24': info(4, 1, Domain.Geometry, '각도', '○'),
  '4수03-25': info(4, 1, Domain.Geometry, '각도', '○'),

  // 3학년 표와 4학년 표에 모두 보이지만, 실제 학년은 기획서의 첫 명시인 3학년 2학기로 둔다.
  '4수04-01': multiGrade(info(3, 2, Domain.Data, '그림그래프', '○'), { 1: 2, 2: 2, 3: 2, 4: 1 }),
  '4수04-02': info(4, 2, Domain.Data, '꺾은선그래프', '○'),
  '4수04-03': info(4, 2, Domain.Data, '꺾은선그래프', '✕'), // §13.5에만 따로 나온 제외 코드라서 같은 자료 단원 흐름에 묶어 보수적으로 배정했다.

  '6수01-01': info(5, 1, Domain.Number, '자연수의 혼합 계산', '◎'),
  '6수01-02': info(5, 2, Domain.Number, '수의 범위와 어림하기', '◎'),
  '6수01-03': info(5, 2, Domain.Number, '수의 범위와 어림하기', '◎'),
  '6수01-04': info(5, 1, Domain.Number, '약수와 배수', '◎'),
  '6수01-05': info(5, 1, Domain.Number, '약수와 배수', '◎'),
  '6수01-06': info(5, 1, Domain.Number, '약분과 통분', '◎'),
  '6수01-07': info(5, 1, Domain.Number, '약분과 통분', '◎'),
  '6수01-08': info(5, 1, Domain.Number, '분수의 덧셈과 뺄셈 (분모 다름)', '◎'),
  '6수01-09': info(5, 2, Domain.Number, '분수의 곱셈', '◎'),
  '6수01-10': info(6, 1, Domain.Number, '분수의 나눗셈', '◎'),
  '6수01-11': info(6, 1, Domain.Number, '분수의 나눗셈', '◎'),
  '6수01-12': info(6, 2, Domain.Number, '분수와 소수의 관계', '◎'),
  '6수01-13': info(5, 2, Domain.Number, '소수의 곱셈', '◎'),
  '6수01-14': info(6, 1, Domain.Number, '소수의 나눗셈', '◎'),
  '6수01-15': info(6, 1, Domain.Number, '소수의 나눗셈', '◎'),

  '6수02-01': info(5, 1, Domain.Relation, '규칙과 대응', '◎'),
  '6수02-02': info(6, 1, Domain.Relation, '비와 비율', '◎'),
  '6수02-03': info(6, 1, Domain.Relation, '비와 비율', '◎'),
  '6수02-04': info(6, 2, Domain.Relation, '비례식과 비례배분', '◎'),
  '6수02-05': info(6, 2, Domain.Relation, '비례식과 비례배분', '◎'),

  '6수03-01': info(5, 2, Domain.Geometry, '합동과 대칭', '○'),
  '6수03-02': info(5, 2, Domain.Geometry, '합동과 대칭', '○'),
  '6수03-03': info(5, 2, Domain.Geometry, '직육면체', '○'),
  '6수03-04': info(5, 2, Domain.Geometry, '직육면체', '✕'),
  '6수03-05': info(6, 1, Domain.Geometry, '각기둥과 각뿔', '○'),
  '6수03-06': info(6, 1, Domain.Geometry, '각기둥과 각뿔', '✕'),
  '6수03-07': info(6, 2, Domain.Geometry, '원기둥, 원뿔, 구', '○'),
  '6수03-08': info(6, 2, Domain.Geometry, '원기둥, 원뿔, 구', '✕'),
  '6수03-09': info(6, 2, Domain.Geometry, '공간과 입체 (쌓기나무)', '○'),
  '6수03-10': info(6, 2, Domain.Geometry, '공간과 입체 (쌓기나무)', '○'),
  '6수03-11': info(5, 1, Domain.Geometry, '다각형의 둘레와 넓이', '○'),
  '6수03-12': info(5, 1, Domain.Geometry, '다각형의 둘레와 넓이', '○'),
  '6수03-13': info(5, 1, Domain.Geometry, '다각형의 둘레와 넓이', '○'),
  '6수03-14': info(5, 1, Domain.Geometry, '다각형의 둘레와 넓이', '○'),
  '6수03-15': info(6, 2, Domain.Geometry, '원주율과 원의 넓이', '◎'),
  '6수03-16': info(6, 2, Domain.Geometry, '원주율과 원의 넓이', '◎'),
  '6수03-17': info(6, 1, Domain.Geometry, '직육면체의 부피와 겉넓이', '◎'),
  '6수03-18': info(6, 1, Domain.Geometry, '직육면체의 부피와 겉넓이', '◎'),
  '6수03-19': info(6, 1, Domain.Geometry, '직육면체의 부피와 겉넓이', '◎'),

  '6수04-01': info(5, 2, Domain.Data, '평균과 가능성', '◎'),
  '6수04-02': info(6, 1, Domain.Data, '여러 가지 그래프 (띠·원그래프)', '○'),
  '6수04-03': info(6, 1, Domain.Data, '여러 가지 그래프 (띠·원그래프)', '✕'), // §13.5에서 탐구 문제 설정·자료 수집은 실시간 퀴즈 부적합으로 제외했다.
  '6수04-04': info(5, 2, Domain.Data, '평균과 가능성', '◎'),
  '6수04-05': info(5, 2, Domain.Data, '평균과 가능성', '◎'),
  '6수04-06': info(5, 2, Domain.Data, '평균과 가능성', '◎'),
};

export const EXCLUDED_STANDARDS = Object.freeze(
  Object.entries(CURRICULUM)
    .filter(([, info]) => info.fitness === '✕')
    .map(([code]) => code),
);

export function lookupStandard(code: string): StandardInfo | undefined {
  return CURRICULUM[code];
}

export function standardsFor(grade: Grade, semester?: Semester): string[] {
  return Object.entries(CURRICULUM)
    .filter(
      ([, info]) =>
        info.grades.includes(grade) &&
        (semester === undefined || (info.semesters[grade] !== undefined && info.semesters[grade] <= semester)),
    )
    .map(([code]) => code);
}

export function isExcluded(code: string): boolean {
  return lookupStandard(code)?.fitness === '✕';
}

export function assertCurriculumBand(code: string, grade: Grade): boolean {
  return code.startsWith(`${bandOf(grade)}수`);
}

export function isStandardForGrade(info: StandardInfo, grade: Grade): boolean {
  return info.grades.includes(grade);
}

export function isStandardForSemester(info: StandardInfo, grade: Grade, semester: Semester): boolean {
  const firstSemester = info.semesters[grade];
  return firstSemester !== undefined && semester >= firstSemester;
}
