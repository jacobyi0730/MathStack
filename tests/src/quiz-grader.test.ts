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
    expect(session.reviewQueue.entries[0]).toMatchObject({
      misconceptionTag: 'addition_counting',
      misses: 1,
      priority: 1,
    });
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
    expect(session.reviewQueue.entries).toHaveLength(0);
  });

  it('converts_an_active_review_on_correct_answer', () => {
    const session = createQuizSession(3);
    session.reviewQueue.entries.push({
      misconceptionTag: question.misconceptionTag,
      misses: 2,
      priority: 2,
      targetDifficulty: 1,
      sourceQuestionIds: ['source'],
    });
    session.reviewQueue.active = {
      misconceptionTag: question.misconceptionTag,
      questionId: question.id,
    };
    session.reviewQueue.stats.reviewed = 1;

    expect(gradeAnswer(session, { question, selectedAnswer: '2', phase: 'retry' })).toMatchObject({
      kind: 'correct',
      retryConsumed: true,
    });
    expect(session.reviewQueue.entries).toHaveLength(0);
    expect(session.reviewQueue.stats).toEqual({
      reviewed: 1,
      converted: 1,
      conversionRate: 1,
    });
  });

  it('keeps_an_active_review_after_retry_incorrect_answer', () => {
    const session = createQuizSession(3);
    session.reviewQueue.entries.push({
      misconceptionTag: question.misconceptionTag,
      misses: 2,
      priority: 2,
      targetDifficulty: 1,
      sourceQuestionIds: ['source'],
    });
    session.reviewQueue.active = {
      misconceptionTag: question.misconceptionTag,
      questionId: question.id,
    };
    session.reviewQueue.stats.reviewed = 1;

    expect(gradeAnswer(session, { question, selectedAnswer: '3', phase: 'retry' })).toMatchObject({
      kind: 'incorrect',
      retryConsumed: true,
    });
    expect(session.reviewQueue.entries).toHaveLength(1);
    expect(session.retryQueue).toHaveLength(0);
    expect(session.reviewQueue.stats).toEqual({
      reviewed: 1,
      converted: 0,
      conversionRate: 0,
    });
  });
});
