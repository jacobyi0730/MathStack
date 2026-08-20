import { DOMAIN_TARGET_COUNTS } from '../data/quiz-rules.js';
import { DOMAINS, Domain } from '../../shared/domain.js';
import type { Domain as DomainType, Grade } from '../../shared/domain.js';
import type { Question } from '../../shared/schema.js';
import {
  createReviewQueueState,
  recordMisconception,
  resetReviewQueue,
  type ReviewQueueState,
} from './review-queue.js';
import { createQuizStatsState, type QuizStatsState } from './stats.js';

export type QuizRetryEntry = {
  question: Question;
  misconceptionTag: string;
};

export type QuizSessionState = {
  grade: Grade;
  seed: number;
  askedQuestionIds: string[];
  domainCounts: Record<DomainType, number>;
  retryQueue: QuizRetryEntry[];
  reviewQueue: ReviewQueueState;
  stats: QuizStatsState;
};

export function createQuizSession(grade: Grade, seed = 1): QuizSessionState {
  return {
    grade,
    seed: normalizeSeed(seed),
    askedQuestionIds: [],
    domainCounts: createDomainCounts(),
    retryQueue: [],
    reviewQueue: createReviewQueueState(),
    stats: createQuizStatsState(),
  };
}

export function createDomainCounts(): Record<DomainType, number> {
  return {
    [Domain.Number]: 0,
    [Domain.Relation]: 0,
    [Domain.Geometry]: 0,
    [Domain.Data]: 0,
  };
}

export function nextRandom(session: QuizSessionState): number {
  session.seed = (Math.imul(session.seed, 1664525) + 1013904223) >>> 0;
  return session.seed / 0x100000000;
}

export function rememberQuestion(session: QuizSessionState, question: Question): void {
  session.askedQuestionIds.push(question.id);
  session.domainCounts[question.domain] += 1;
}

export function enqueueRetryQuestion(session: QuizSessionState, question: Question): void {
  recordMisconception(session.reviewQueue, question);
  session.retryQueue.push({
    question,
    misconceptionTag: question.misconceptionTag,
  });
}

export function shiftRetryQuestion(session: QuizSessionState): QuizRetryEntry | undefined {
  return session.retryQueue.shift();
}

export function resetQuizSession(session: QuizSessionState, seed = session.seed): void {
  session.seed = normalizeSeed(seed);
  session.askedQuestionIds.length = 0;
  session.retryQueue.length = 0;
  resetReviewQueue(session.reviewQueue);
  const freshStats = createQuizStatsState();
  session.stats.attempted = freshStats.attempted;
  session.stats.firstTryCorrect = freshStats.firstTryCorrect;
  session.stats.misconceptions = freshStats.misconceptions;
  session.stats.review.reviewed = freshStats.review.reviewed;
  session.stats.review.converted = freshStats.review.converted;

  for (const domain of DOMAINS) {
    session.domainCounts[domain] = 0;
    session.stats.byDomain[domain].attempted = 0;
    session.stats.byDomain[domain].firstTryCorrect = 0;
  }
}

export function getAskedCount(session: Readonly<QuizSessionState>): number {
  return session.askedQuestionIds.length;
}

export function getDomainTargetCount(domain: DomainType): number {
  return DOMAIN_TARGET_COUNTS[domain];
}

function normalizeSeed(seed: number): number {
  const normalized = Math.floor(seed) >>> 0;
  return normalized === 0 ? 1 : normalized;
}
