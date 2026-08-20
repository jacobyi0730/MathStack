import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import type { Question } from '../../shared/schema.js';
import {
  createQuizStatsState,
  describeMisconception,
  recordMisconceptionMiss,
  recordResolvedQuestion,
  recordReviewOutcome,
  summarizeQuizStats,
} from '../../src/quiz/stats.js';

const numberQuestion: Question = question('q-number', Domain.Number, 'decimal_alignment');
const geometryQuestion: Question = question('q-geometry', Domain.Geometry, 'area_perimeter');

describe('quiz stats', () => {
  it('summarizes_first_try_and_all_four_domain_accuracy', () => {
    const stats = createQuizStatsState();

    recordResolvedQuestion(stats, numberQuestion, true);
    recordResolvedQuestion(stats, geometryQuestion, false);
    recordMisconceptionMiss(stats, geometryQuestion.misconceptionTag);
    recordReviewOutcome(stats, geometryQuestion.misconceptionTag, true);

    const summary = summarizeQuizStats(stats);

    expect(summary.attempted).toBe(2);
    expect(summary.firstTryCorrect).toBe(1);
    expect(summary.accuracy).toBe(0.5);
    expect(summary.byDomain.map((item) => item.domain)).toEqual([
      Domain.Number,
      Domain.Relation,
      Domain.Geometry,
      Domain.Data,
    ]);
    expect(summary.byDomain.find((item) => item.domain === Domain.Geometry)).toMatchObject({
      attempted: 1,
      firstTryCorrect: 0,
      accuracy: 0,
    });
    expect(summary.reviewConversionRate).toBe(1);
    expect(summary.frequentMisconceptions[0]).toMatchObject({
      tag: 'area_perimeter',
      wrong: 1,
      converted: 1,
    });
  });

  it('describes_misconceptions_without_exposing_unknown_tags', () => {
    expect(describeMisconception('decimal_alignment')).toBe('소수점 자리 맞추기');
    expect(describeMisconception('unknown_internal_tag')).toBe('문제 풀이 전략 점검');
  });
});

function question(id: string, domain: Domain, misconceptionTag: string): Question {
  return {
    id,
    grade: 3,
    semester: 1,
    domain,
    unit: 'unit',
    standard: '4수01-03',
    difficulty: 1,
    format: 'choice',
    stem: '1 + 1 = ?',
    choices: ['2', '3', '4'],
    answer: '2',
    distractorReason: ['correct', 'wrong', 'wrong'],
    explanation: '1 + 1 = 2',
    timeLimitSec: 10,
    misconceptionTag,
  };
}
