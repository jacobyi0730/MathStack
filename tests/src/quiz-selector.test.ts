import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, DOMAIN_QUOTA, DOMAINS, Domain } from '../../shared/domain.js';
import { BANK_VERSION, type Bank, type Question } from '../../shared/schema.js';
import { QUIZ_SESSION_TARGET_QUESTIONS, getDifficultyDistribution } from '../../src/data/quiz-rules.js';
import { selectQuestion } from '../../src/quiz/selector.js';
import { createQuizSession, enqueueRetryQuestion } from '../../src/quiz/session.js';

function makeQuestion(
  domain: Domain,
  difficulty: Question['difficulty'],
  index: number,
  tag = `tag-${domain}-${difficulty}`,
): Question {
  return {
    id: `G3-${domain}-${difficulty}-${index}`,
    grade: 3,
    semester: index % 2 === 0 ? 1 : 2,
    domain,
    unit: `unit-${index}`,
    standard: '4수01-03',
    difficulty,
    format: 'choice',
    stem: `${domain} ${difficulty} ${index}`,
    choices: ['a', 'b', 'c'],
    answer: 'a',
    distractorReason: ['correct', 'near miss', 'misread'],
    explanation: 'because',
    timeLimitSec: 10,
    misconceptionTag: tag,
  };
}

function makeBank(perBucket = 80): Bank {
  const questions: Question[] = [];

  for (const domain of DOMAINS) {
    for (const difficulty of DIFFICULTIES) {
      for (let index = 0; index < perBucket; index += 1) {
        questions.push(makeQuestion(domain, difficulty, index + difficulty * 100));
      }
    }
  }

  return { version: BANK_VERSION, grade: 3, questions };
}

describe('quiz selector', () => {
  it('uses_review_queue_from_level_ten_with_a_different_same_tag_question', () => {
    const retryQuestion = makeQuestion(Domain.Number, 3, 999, 'addition_counting');
    const reviewQuestion = makeQuestion(Domain.Number, 2, 1000, 'addition_counting');
    const bank = makeBank();
    bank.questions.push(reviewQuestion);
    const session = createQuizSession(3, 1);
    enqueueRetryQuestion(session, retryQuestion);

    expect(selectQuestion(bank, 2, 9, session).question.id).not.toBe(retryQuestion.id);
    expect(session.retryQueue).toHaveLength(1);
    expect(selectQuestion(bank, 2, 10, session)).toMatchObject({
      question: { id: reviewQuestion.id },
      retry: true,
      review: { misconceptionTag: 'addition_counting' },
    });
    expect(session.reviewQueue.entries).toHaveLength(1);
  });

  it('avoids_duplicate_questions_in_a_session', () => {
    const bank = makeBank();
    const session = createQuizSession(3, 7);
    const seen = new Set<string>();

    for (let count = 0; count < QUIZ_SESSION_TARGET_QUESTIONS; count += 1) {
      const selected = selectQuestion(bank, 2, 8, session).question;
      expect(seen.has(selected.id)).toBe(false);
      seen.add(selected.id);
    }
  });

  it('expands_to_nearby_difficulty_when_the_exact_bucket_is_empty', () => {
    const bank: Bank = {
      version: BANK_VERSION,
      grade: 3,
      questions: [makeQuestion(Domain.Number, 2, 1)],
    };
    const session = createQuizSession(3, 1);

    expect(selectQuestion(bank, 2, 1, session).question.difficulty).toBe(2);
  });

  it('matches_domain_targets_over_simulated_sessions', () => {
    const bank = makeBank();
    const totals: Record<Domain, number> = {
      [Domain.Number]: 0,
      [Domain.Relation]: 0,
      [Domain.Geometry]: 0,
      [Domain.Data]: 0,
    };
    const sessions = 1000;

    for (let run = 0; run < sessions; run += 1) {
      const session = createQuizSession(3, run + 1);

      for (let count = 0; count < QUIZ_SESSION_TARGET_QUESTIONS; count += 1) {
        const selected = selectQuestion(bank, 2, 8, session).question;
        totals[selected.domain] += 1;
      }
    }

    const totalQuestions = sessions * QUIZ_SESSION_TARGET_QUESTIONS;

    for (const domain of DOMAINS) {
      const actual = totals[domain] / totalQuestions;
      expect(Math.abs(actual - DOMAIN_QUOTA[domain])).toBeLessThanOrEqual(0.05);
    }
  });

  it('matches_difficulty_distribution_over_simulated_draws', () => {
    const bank = makeBank();
    const totals = new Map<Question['difficulty'], number>();
    const sessions = 1000;

    for (let run = 0; run < sessions; run += 1) {
      const session = createQuizSession(3, run + 10000);

      for (let count = 0; count < QUIZ_SESSION_TARGET_QUESTIONS; count += 1) {
        const selected = selectQuestion(bank, 2, 12, session).question;
        totals.set(selected.difficulty, (totals.get(selected.difficulty) ?? 0) + 1);
      }
    }

    const totalQuestions = sessions * QUIZ_SESSION_TARGET_QUESTIONS;

    for (const entry of getDifficultyDistribution(12)) {
      const actual = (totals.get(entry.difficulty) ?? 0) / totalQuestions;
      expect(Math.abs(actual - entry.weight)).toBeLessThanOrEqual(0.05);
    }
  });

  it('can_calculate_review_conversion_rate_over_a_simulation', () => {
    const bank = makeBank();
    const session = createQuizSession(3, 3);
    const sources = [
      makeQuestion(Domain.Number, 4, 800, 'decimal_alignment'),
      makeQuestion(Domain.Number, 4, 801, 'decimal_alignment'),
      makeQuestion(Domain.Geometry, 3, 802, 'area_perimeter_swap'),
      makeQuestion(Domain.Geometry, 3, 803, 'area_perimeter_swap'),
    ];
    bank.questions.push(
      ...sources,
      makeQuestion(Domain.Number, 3, 900, 'decimal_alignment'),
      makeQuestion(Domain.Number, 3, 901, 'decimal_alignment'),
      makeQuestion(Domain.Geometry, 2, 902, 'area_perimeter_swap'),
      makeQuestion(Domain.Geometry, 2, 903, 'area_perimeter_swap'),
    );

    for (const source of sources) {
      enqueueRetryQuestion(session, source);
    }

    for (let count = 0; count < 4; count += 1) {
      const selected = selectQuestion(bank, 2, 10, session);
      expect(selected.retry).toBe(true);

      if (count < 3) {
        session.reviewQueue.stats.converted += 1;
      }
    }

    session.reviewQueue.stats.conversionRate =
      session.reviewQueue.stats.converted / session.reviewQueue.stats.reviewed;

    expect(session.reviewQueue.stats).toEqual({
      reviewed: 4,
      converted: 3,
      conversionRate: 0.75,
    });
  });
});
