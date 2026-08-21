/**
 * 도메인 상수 — 빌드 타임과 런타임이 함께 쓴다 (31-아키텍처 §3).
 *
 * 여기 있는 값은 2022 개정 교육과정에서 온 것이며 임의로 늘리지 않는다.
 * 특히 Domain 은 4개뿐이다. 옛 영역명("규칙성" 등)이 섞이면
 * 영역 균형 출제가 조용히 깨진다 (33-데이터스키마 §2).
 */

export const Domain = {
  Number: '수와 연산',
  Relation: '변화와 관계',
  Geometry: '도형과 측정',
  Data: '자료와 가능성',
} as const;

export type Domain = (typeof Domain)[keyof typeof Domain];

export const DOMAINS = Object.values(Domain);

/** 성취기준 코드의 영역 자리(01~04) → 영역 */
export const DOMAIN_BY_CODE: Record<string, Domain> = {
  '01': Domain.Number,
  '02': Domain.Relation,
  '03': Domain.Geometry,
  '04': Domain.Data,
};

/** 한 세션 18문항 기준 목표 비중 (기획서 §12.5) */
export const DOMAIN_QUOTA: Record<Domain, number> = {
  [Domain.Number]: 0.45,
  [Domain.Geometry]: 0.3,
  [Domain.Relation]: 0.15,
  [Domain.Data]: 0.1,
};

export const GRADES = [1, 2, 3, 4, 5, 6] as const;
export type Grade = (typeof GRADES)[number];

export const SEMESTERS = [1, 2] as const;
export type Semester = (typeof SEMESTERS)[number];

export const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** 학년 → 성취기준 학년군 접두 (3·4학년 = 4수, 5·6학년 = 6수) */
export function bandOf(grade: Grade): '4' | '6' {
  return grade <= 4 ? '4' : '6';
}

/** 성취기준 코드 형식. 예: 4수01-15 */
export const STANDARD_PATTERN = /^[46]수0[1-4]-\d{2}$/;
