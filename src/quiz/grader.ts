import type { Question } from '../../shared/schema.js';
import { completeActiveReview } from './review-queue.js';
import { enqueueRetryQuestion, type QuizSessionState } from './session.js';
import {
  recordMisconceptionMiss,
  recordResolvedQuestion,
  recordReviewOutcome,
} from './stats.js';

export type QuizAttemptPhase = 'first' | 'retry';
export type QuizGradeInput = {
  question: Question;
  selectedAnswer?: string;
  timedOut?: boolean;
  phase: QuizAttemptPhase;
};

export type QuizGradeResult =
  | {
      kind: 'correct';
      choicesOffered: 3;
      shouldRetry: false;
      retryConsumed: boolean;
      healthDelta: 0;
    }
  | {
      kind: 'try_again';
      choicesOffered: 0;
      shouldRetry: true;
      retryConsumed: false;
      healthDelta: 0;
    }
  | {
      kind: 'incorrect';
      choicesOffered: 2;
      shouldRetry: false;
      retryConsumed: boolean;
      healthDelta: 0;
      misconceptionTag: string;
    };

export function gradeAnswer(
  session: QuizSessionState,
  input: QuizGradeInput,
): QuizGradeResult {
  const timedOut = input.timedOut === true;
  const correct = !timedOut && input.selectedAnswer === input.question.answer;
  const activeReviewTag = session.reviewQueue.active?.questionId === input.question.id
    ? session.reviewQueue.active.misconceptionTag
    : undefined;

  if (correct) {
    completeActiveReview(session.reviewQueue, input.question, true);
    recordResolvedQuestion(session.stats, input.question, input.phase === 'first');
    if (activeReviewTag !== undefined) {
      recordReviewOutcome(session.stats, activeReviewTag, true);
    }

    return {
      kind: 'correct',
      choicesOffered: 3,
      shouldRetry: false,
      retryConsumed: input.phase === 'retry',
      healthDelta: 0,
    };
  }

  if (timedOut) {
    return {
      kind: 'try_again',
      choicesOffered: 0,
      shouldRetry: true,
      retryConsumed: false,
      healthDelta: 0,
    };
  }

  const activeReviewCompleted = input.phase === 'retry'
    ? completeActiveReview(session.reviewQueue, input.question, false)
    : false;

  if (input.phase === 'first') {
    return {
      kind: 'try_again',
      choicesOffered: 0,
      shouldRetry: true,
      retryConsumed: false,
      healthDelta: 0,
    };
  }

  if (!activeReviewCompleted) {
    enqueueRetryQuestion(session, input.question);
  }
  recordResolvedQuestion(session.stats, input.question, false);
  recordMisconceptionMiss(session.stats, input.question.misconceptionTag);
  if (activeReviewCompleted && activeReviewTag !== undefined) {
    recordReviewOutcome(session.stats, activeReviewTag, false);
  }

  return {
    kind: 'incorrect',
    choicesOffered: 2,
    shouldRetry: false,
    retryConsumed: true,
    healthDelta: 0,
    misconceptionTag: input.question.misconceptionTag,
  };
}
