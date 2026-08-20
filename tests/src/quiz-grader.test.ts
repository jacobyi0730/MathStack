import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import type { Question } from '../../shared/schema.js';
import { gradeAnswer } from '../../src/quiz/grader.js';
import { createQuizSession } from '../../src/quiz/session.js';

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

describe('quiz grader', () => {
  it('offers_three_choices_for_first_try_correct_answers', () => {
    const session = createQuizSession(3);

    expect(gradeAnswer(session, { question, selectedAnswer: '2', phase: 'first' })).toEqual({
      kind: 'correct',
      choicesOffered: 3,
      shouldRetry: false,
      retryConsumed: false,
      healthDelta: 0,
    });
  });

  it('offers_three_choices_for_retry_correct_answers', () => {
    const session = createQuizSession(3);

    expect(gradeAnswer(session, { question, selectedAnswer: '2', phase: 'retry' })).toEqual({
      kind: 'correct',
      choicesOffered: 3,
      shouldRetry: false,
      retryConsumed: true,
      healthDelta: 0,
    });
  });

  it('queues_the_misconception_after_retry_incorrect_answers', () => {
    const session = createQuizSession(3);

    const result = gradeAnswer(session, { question, selectedAnswer: '3', phase: 'retry' });

    expect(result).toEqual({
      kind: 'incorrect',
      choicesOffered: 2,
      shouldRetry: false,
      retryConsumed: true,
      healthDelta: 0,
      misconceptionTag: 'addition_counting',
    });
    expect(session.retryQueue[0]).toEqual({ question, misconceptionTag: 'addition_counting' });
  });

  it('treats_timeout_as_wrong_without_consuming_retry', () => {
    const session = createQuizSession(3);

    expect(gradeAnswer(session, { question, timedOut: true, phase: 'retry' })).toEqual({
      kind: 'try_again',
      choicesOffered: 0,
      shouldRetry: true,
      retryConsumed: false,
      healthDelta: 0,
    });
    expect(session.retryQueue).toHaveLength(0);
  });
});
