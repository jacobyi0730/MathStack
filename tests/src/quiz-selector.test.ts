import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, DOMAIN_QUOTA, DOMAINS, Domain } from '../../shared/domain.js';
import { BANK_VERSION, type Bank, type Question } from '../../shared/schema.js';
import { QUIZ_SESSION_TARGET_QUESTIONS, getDifficultyDistribution } from '../../src/data/quiz-rules.js';
import { selectQuestion } from '../../src/quiz/selector.js';
import { createQuizSession, enqueueRetryQuestion } from '../../src/quiz/session.js';

function makeQuestion(domain: Domain, difficulty: Question['difficulty'], index: number): Question {
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
    misconceptionTag: `tag-${domain}-${difficulty}`,
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
  it('uses_retry_queue_from_level_ten', () => {
    const bank = makeBank();
    const session = createQuizSession(3, 1);
    const retryQuestion = makeQuestion(Domain.Number, 1, 999);
    enqueueRetryQuestion(session, retryQuestion);

    expect(selectQuestion(bank, 2, 9, session).question.id).not.toBe(retryQuestion.id);
    expect(session.retryQueue).toHaveLength(1);
    expect(selectQuestion(bank, 2, 10, session)).toMatchObject({
      question: { id: retryQuestion.id },
      retry: true,
    });
    expect(session.retryQueue).toHaveLength(0);
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
});
