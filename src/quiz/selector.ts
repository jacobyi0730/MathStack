import {
  DOMAIN_TARGET_COUNTS,
  getDifficultyDistribution,
  getDifficultyExpansionOrder,
  getForcedDomain,
} from '../data/quiz-rules.js';
import { DOMAIN_QUOTA, DOMAINS } from '../../shared/domain.js';
import type { Difficulty, Domain, Semester } from '../../shared/domain.js';
import type { Bank, Question } from '../../shared/schema.js';
import {
  getAskedCount,
  nextRandom,
  rememberQuestion,
  shiftRetryQuestion,
  type QuizSessionState,
} from './session.js';

export type SelectedQuestion = {
  question: Question;
  retry: boolean;
};

export function selectQuestion(
  bank: Bank,
  semester: Semester,
  level: number,
  session: QuizSessionState,
): SelectedQuestion {
  if (level >= 10) {
    const retry = shiftRetryQuestion(session);

    if (retry !== undefined) {
      rememberQuestion(session, retry.question);
      return { question: shuffleQuestionChoices(retry.question, session), retry: true };
    }
  }

  const difficulty = pickDifficulty(level, session);
  const domain = pickDomain(session);
  const question = pickCandidate(bank, semester, domain, difficulty, session);
  rememberQuestion(session, question);

  return { question: shuffleQuestionChoices(question, session), retry: false };
}

export function pickDifficulty(level: number, session: QuizSessionState): Difficulty {
  const distribution = getDifficultyDistribution(level);
  const roll = nextRandom(session);
  let cursor = 0;

  for (const entry of distribution) {
    cursor += entry.weight;

    if (roll < cursor) {
      return entry.difficulty;
    }
  }

  return distribution[distribution.length - 1].difficulty;
}

export function pickDomain(session: QuizSessionState): Domain {
  const forced = getForcedDomain(session.domainCounts, getAskedCount(session));

  if (forced !== undefined) {
    return forced;
  }

  const remainingWeight = DOMAINS.reduce((sum, domain) => {
    const remaining = Math.max(0, DOMAIN_TARGET_COUNTS[domain] - session.domainCounts[domain]);
    return sum + DOMAIN_QUOTA[domain] * (remaining + 1);
  }, 0);
  let roll = nextRandom(session) * remainingWeight;

  for (const domain of DOMAINS) {
    const remaining = Math.max(0, DOMAIN_TARGET_COUNTS[domain] - session.domainCounts[domain]);
    roll -= DOMAIN_QUOTA[domain] * (remaining + 1);

    if (roll <= 0) {
      return domain;
    }
  }

  return DOMAINS[DOMAINS.length - 1];
}

function pickCandidate(
  bank: Bank,
  semester: Semester,
  domain: Domain,
  difficulty: Difficulty,
  session: QuizSessionState,
): Question {
  const seen = new Set(session.askedQuestionIds);
  const difficultyOrder = getDifficultyExpansionOrder(difficulty);

  for (const candidateDifficulty of difficultyOrder) {
    const candidates = bank.questions.filter(
      (question) =>
        question.grade === bank.grade &&
        question.semester <= semester &&
        question.domain === domain &&
        question.difficulty === candidateDifficulty &&
        !seen.has(question.id),
    );

    if (candidates.length > 0) {
      return candidates[Math.floor(nextRandom(session) * candidates.length)];
    }
  }

  const fallbackCandidates = bank.questions.filter(
    (question) =>
      question.grade === bank.grade &&
      question.semester <= semester &&
      question.domain === domain &&
      !seen.has(question.id),
  );

  if (fallbackCandidates.length > 0) {
    return fallbackCandidates[Math.floor(nextRandom(session) * fallbackCandidates.length)];
  }

  const anyUnseen = bank.questions.filter(
    (question) => question.grade === bank.grade && question.semester <= semester && !seen.has(question.id),
  );

  if (anyUnseen.length > 0) {
    return anyUnseen[Math.floor(nextRandom(session) * anyUnseen.length)];
  }

  const reusable = bank.questions.filter(
    (question) => question.grade === bank.grade && question.semester <= semester,
  );

  if (reusable.length === 0) {
    throw new Error(`Question bank has no candidates for grade ${bank.grade}, semester ${semester}`);
  }

  return reusable[Math.floor(nextRandom(session) * reusable.length)];
}

function shuffleQuestionChoices(question: Question, session: QuizSessionState): Question {
  const pairs = question.choices.map((choice, index) => ({
    choice,
    reason: question.distractorReason[index],
  }));

  for (let index = pairs.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom(session) * (index + 1));
    const current = pairs[index];
    pairs[index] = pairs[swapIndex];
    pairs[swapIndex] = current;
  }

  return {
    ...question,
    choices: pairs.map((pair) => pair.choice),
    distractorReason: pairs.map((pair) => pair.reason),
  };
}
