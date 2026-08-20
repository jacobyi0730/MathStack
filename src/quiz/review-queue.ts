import type { Difficulty, Semester } from '../../shared/domain.js';
import type { Bank, Question } from '../../shared/schema.js';

export type ReviewFallbackReason = 'difficulty_fallback' | 'same_question_fallback' | 'no_candidate';

export type ReviewFallbackSignal = {
  misconceptionTag: string;
  reason: ReviewFallbackReason;
  targetDifficulty: Difficulty;
};

export type ReviewQueueEntry = {
  misconceptionTag: string;
  misses: number;
  priority: number;
  targetDifficulty: Difficulty;
  sourceQuestionIds: string[];
};

export type ReviewStats = {
  reviewed: number;
  converted: number;
  conversionRate: number;
};

export type ActiveReview = {
  misconceptionTag: string;
  questionId: string;
};

export type ReviewQueueState = {
  entries: ReviewQueueEntry[];
  active?: ActiveReview;
  fallbackSignals: ReviewFallbackSignal[];
  stats: ReviewStats;
};

export type ReviewSelection =
  | {
      entry: ReviewQueueEntry;
      question: Question;
      fallback?: ReviewFallbackSignal;
    }
  | undefined;

export function createReviewQueueState(): ReviewQueueState {
  return {
    entries: [],
    fallbackSignals: [],
    stats: {
      reviewed: 0,
      converted: 0,
      conversionRate: 0,
    },
  };
}

export function recordMisconception(queue: ReviewQueueState, question: Question): ReviewQueueEntry {
  const existing = queue.entries.find((entry) => entry.misconceptionTag === question.misconceptionTag);
  const targetDifficulty = lowerDifficulty(question.difficulty);

  if (existing !== undefined) {
    existing.misses += 1;
    existing.priority = priorityForMisses(existing.misses);
    existing.targetDifficulty = Math.min(existing.targetDifficulty, targetDifficulty) as Difficulty;

    if (!existing.sourceQuestionIds.includes(question.id)) {
      existing.sourceQuestionIds.push(question.id);
    }

    return existing;
  }

  const entry: ReviewQueueEntry = {
    misconceptionTag: question.misconceptionTag,
    misses: 1,
    priority: priorityForMisses(1),
    targetDifficulty,
    sourceQuestionIds: [question.id],
  };
  queue.entries.push(entry);

  return entry;
}

export function selectReviewQuestion(
  queue: ReviewQueueState,
  bank: Bank,
  semester: Semester,
  random: () => number,
): ReviewSelection {
  if (queue.entries.length === 0) {
    return undefined;
  }

  const sorted = [...queue.entries].sort(
    (left, right) => right.priority - left.priority || right.misses - left.misses,
  );

  for (const entry of sorted) {
    const selection = pickReviewCandidate(entry, bank, semester, random);

    if (selection !== undefined) {
      queue.active = {
        misconceptionTag: entry.misconceptionTag,
        questionId: selection.question.id,
      };
      queue.stats.reviewed += 1;
      updateConversionRate(queue.stats);

      if (selection.fallback !== undefined) {
        queue.fallbackSignals.push(selection.fallback);
      }

      return { entry, ...selection };
    }

    const signal: ReviewFallbackSignal = {
      misconceptionTag: entry.misconceptionTag,
      reason: 'no_candidate',
      targetDifficulty: entry.targetDifficulty,
    };
    queue.fallbackSignals.push(signal);
  }

  return undefined;
}

export function completeActiveReview(
  queue: ReviewQueueState,
  question: Question,
  correct: boolean,
): boolean {
  if (queue.active === undefined || queue.active.questionId !== question.id) {
    return false;
  }

  const misconceptionTag = queue.active.misconceptionTag;
  queue.active = undefined;

  if (correct) {
    queue.stats.converted += 1;
    removeTag(queue, misconceptionTag);
  }

  updateConversionRate(queue.stats);

  return true;
}

export function getReviewStats(queue: Readonly<ReviewQueueState>): ReviewStats {
  return { ...queue.stats };
}

export function resetReviewQueue(queue: ReviewQueueState): void {
  queue.entries.length = 0;
  queue.fallbackSignals.length = 0;
  queue.active = undefined;
  queue.stats.reviewed = 0;
  queue.stats.converted = 0;
  queue.stats.conversionRate = 0;
}

function pickReviewCandidate(
  entry: ReviewQueueEntry,
  bank: Bank,
  semester: Semester,
  random: () => number,
): { question: Question; fallback?: ReviewFallbackSignal } | undefined {
  const sameTag = bank.questions.filter(
    (question) =>
      question.grade === bank.grade &&
      question.semester <= semester &&
      question.misconceptionTag === entry.misconceptionTag,
  );
  const otherQuestions = sameTag.filter((question) => !entry.sourceQuestionIds.includes(question.id));
  const exactDifferent = otherQuestions.filter((question) => question.difficulty === entry.targetDifficulty);

  if (exactDifferent.length > 0) {
    return { question: pick(exactDifferent, random) };
  }

  const lowerDifferent = otherQuestions.filter((question) => question.difficulty <= entry.targetDifficulty);

  if (lowerDifferent.length > 0) {
    return {
      question: pick(lowerDifferent, random),
      fallback: {
        misconceptionTag: entry.misconceptionTag,
        reason: 'difficulty_fallback',
        targetDifficulty: entry.targetDifficulty,
      },
    };
  }

  if (otherQuestions.length > 0) {
    return {
      question: pick(otherQuestions, random),
      fallback: {
        misconceptionTag: entry.misconceptionTag,
        reason: 'difficulty_fallback',
        targetDifficulty: entry.targetDifficulty,
      },
    };
  }

  if (sameTag.length > 0) {
    return {
      question: pick(sameTag, random),
      fallback: {
        misconceptionTag: entry.misconceptionTag,
        reason: 'same_question_fallback',
        targetDifficulty: entry.targetDifficulty,
      },
    };
  }

  return undefined;
}

function lowerDifficulty(difficulty: Difficulty): Difficulty {
  return Math.max(1, difficulty - 1) as Difficulty;
}

function priorityForMisses(misses: number): number {
  return misses >= 2 ? 2 : 1;
}

function removeTag(queue: ReviewQueueState, misconceptionTag: string): void {
  const index = queue.entries.findIndex((entry) => entry.misconceptionTag === misconceptionTag);

  if (index >= 0) {
    queue.entries.splice(index, 1);
  }
}

function updateConversionRate(stats: ReviewStats): void {
  stats.conversionRate = stats.reviewed === 0 ? 0 : stats.converted / stats.reviewed;
}

function pick(questions: Question[], random: () => number): Question {
  return questions[Math.floor(random() * questions.length)];
}
