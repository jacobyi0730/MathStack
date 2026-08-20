import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import type { Question } from '../../shared/schema.js';
import {
  createQuizSession,
  enqueueRetryQuestion,
  nextRandom,
  rememberQuestion,
  resetQuizSession,
  shiftRetryQuestion,
} from '../../src/quiz/session.js';

const question: Question = {
  id: 'G3-N-001-01',
  grade: 3,
  semester: 1,
  domain: Domain.Number,
  unit: 'addition',
  standard: '4수01-03',
  difficulty: 1,
  format: 'choice',
  stem: '1 + 1 = ?',
  choices: ['2', '3', '4'],
  answer: '2',
  distractorReason: ['correct', 'plus one', 'plus two'],
  explanation: '1 + 1 = 2',
  timeLimitSec: 10,
  misconceptionTag: 'addition_counting',
};

describe('quiz session', () => {
  it('tracks_history_domain_counts_retry_queue_and_seed', () => {
    const session = createQuizSession(3, 123);

    const first = nextRandom(session);
    rememberQuestion(session, question);
    enqueueRetryQuestion(session, question);

    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
    expect(session.askedQuestionIds).toEqual(['G3-N-001-01']);
    expect(session.domainCounts[Domain.Number]).toBe(1);
    expect(shiftRetryQuestion(session)?.misconceptionTag).toBe('addition_counting');
    expect(session.reviewQueue.entries[0]).toMatchObject({
      misconceptionTag: 'addition_counting',
      misses: 1,
      priority: 1,
    });
  });

  it('can_reset_for_a_new_run', () => {
    const session = createQuizSession(3, 123);
    rememberQuestion(session, question);
    enqueueRetryQuestion(session, question);

    resetQuizSession(session, 456);

    expect(session.askedQuestionIds).toHaveLength(0);
    expect(session.retryQueue).toHaveLength(0);
    expect(session.reviewQueue.entries).toHaveLength(0);
    expect(session.domainCounts[Domain.Number]).toBe(0);
    expect(session.seed).toBe(456);
  });
});
