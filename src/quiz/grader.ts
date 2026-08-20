import type { Question } from '../../shared/schema.js';
import { enqueueRetryQuestion, type QuizSessionState } from './session.js';

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

  if (correct) {
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

  if (input.phase === 'first') {
    return {
      kind: 'try_again',
      choicesOffered: 0,
      shouldRetry: true,
      retryConsumed: false,
      healthDelta: 0,
    };
  }

  enqueueRetryQuestion(session, input.question);

  return {
    kind: 'incorrect',
    choicesOffered: 2,
    shouldRetry: false,
    retryConsumed: true,
    healthDelta: 0,
    misconceptionTag: input.question.misconceptionTag,
  };
}
