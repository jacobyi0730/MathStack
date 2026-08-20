import { DOMAINS, Domain, type Domain as DomainType } from '../../shared/domain.js';
import type { Question } from '../../shared/schema.js';

export interface DomainAccuracy {
  readonly domain: DomainType;
  readonly attempted: number;
  readonly firstTryCorrect: number;
  readonly accuracy: number;
}

export interface MisconceptionStat {
  readonly tag: string;
  wrong: number;
  converted: number;
}

export interface QuizStatsState {
  attempted: number;
  firstTryCorrect: number;
  byDomain: Record<DomainType, { attempted: number; firstTryCorrect: number }>;
  misconceptions: Record<string, MisconceptionStat>;
  review: {
    reviewed: number;
    converted: number;
  };
}

export interface QuizStatsSummary {
  readonly attempted: number;
  readonly firstTryCorrect: number;
  readonly accuracy: number;
  readonly byDomain: readonly DomainAccuracy[];
  readonly reviewConversionRate: number;
  readonly frequentMisconceptions: readonly MisconceptionStat[];
}

export function createQuizStatsState(): QuizStatsState {
  return {
    attempted: 0,
    firstTryCorrect: 0,
    byDomain: createDomainStats(),
    misconceptions: {},
    review: {
      reviewed: 0,
      converted: 0,
    },
  };
}

export function recordResolvedQuestion(
  stats: QuizStatsState,
  question: Question,
  firstTryCorrect: boolean,
): void {
  stats.attempted += 1;
  const domain = stats.byDomain[question.domain];
  domain.attempted += 1;

  if (firstTryCorrect) {
    stats.firstTryCorrect += 1;
    domain.firstTryCorrect += 1;
  }
}

export function recordMisconceptionMiss(stats: QuizStatsState, tag: string): void {
  getMisconception(stats, tag).wrong += 1;
}

export function recordReviewOutcome(stats: QuizStatsState, tag: string, converted: boolean): void {
  stats.review.reviewed += 1;
  if (converted) {
    stats.review.converted += 1;
    getMisconception(stats, tag).converted += 1;
  }
}

export function summarizeQuizStats(stats: Readonly<QuizStatsState>): QuizStatsSummary {
  const misconceptions = Object.values(stats.misconceptions)
    .map((item) => ({ ...item }))
    .sort((left, right) => right.wrong - left.wrong || right.converted - left.converted)
    .slice(0, 3);

  return {
    attempted: stats.attempted,
    firstTryCorrect: stats.firstTryCorrect,
    accuracy: ratio(stats.firstTryCorrect, stats.attempted),
    byDomain: DOMAINS.map((domain) => {
      const item = stats.byDomain[domain];
      return {
        domain,
        attempted: item.attempted,
        firstTryCorrect: item.firstTryCorrect,
        accuracy: ratio(item.firstTryCorrect, item.attempted),
      };
    }),
    reviewConversionRate: ratio(stats.review.converted, stats.review.reviewed),
    frequentMisconceptions: misconceptions,
  };
}

export function describeMisconception(tag: string): string {
  return MISCONCEPTION_LABELS[tag] ?? '문제 풀이 전략 점검';
}

function createDomainStats(): QuizStatsState['byDomain'] {
  return {
    [Domain.Number]: { attempted: 0, firstTryCorrect: 0 },
    [Domain.Relation]: { attempted: 0, firstTryCorrect: 0 },
    [Domain.Geometry]: { attempted: 0, firstTryCorrect: 0 },
    [Domain.Data]: { attempted: 0, firstTryCorrect: 0 },
  };
}

function getMisconception(stats: QuizStatsState, tag: string): MisconceptionStat {
  stats.misconceptions[tag] ??= {
    tag,
    wrong: 0,
    converted: 0,
  };
  return stats.misconceptions[tag];
}

function ratio(numerator: number, denominator: number): number {
  return denominator <= 0 ? 0 : numerator / denominator;
}

const MISCONCEPTION_LABELS: Record<string, string> = {
  addition_counting: '덧셈 세기 과정',
  subtraction_borrowing: '받아내림 처리',
  multiplication_table: '곱셈구구 연결',
  division_remainder: '나눗셈 몫과 나머지',
  fraction_equal_parts: '분수의 같은 크기 나누기',
  fraction_denominator: '분모의 의미',
  decimal_alignment: '소수점 자리 맞추기',
  decimal_place_value: '소수의 자리값',
  area_perimeter: '넓이와 둘레 구분',
  angle_measure: '각도 재기',
  graph_reading: '그래프 값 읽기',
  pattern_rule: '규칙 찾기',
};
