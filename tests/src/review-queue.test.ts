import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import { BANK_VERSION, type Bank, type Question } from '../../shared/schema.js';
import {
  completeActiveReview,
  createReviewQueueState,
  getReviewStats,
  recordMisconception,
  selectReviewQuestion,
} from '../../src/quiz/review-queue.js';

function makeQuestion(id: string, difficulty: Question['difficulty'], tag = 'borrow_omission'): Question {
  return {
    id,
    grade: 3,
    semester: 1,
    domain: Domain.Number,
    unit: 'subtraction',
    standard: '4??1-03',
    difficulty,
    format: 'choice',
    stem: `${id}?`,
    choices: ['1', '2', '3'],
    answer: '1',
    distractorReason: ['correct', 'borrow omitted', 'misread'],
    explanation: 'because',
    timeLimitSec: 10,
    misconceptionTag: tag,
  };
}

describe('review queue', () => {
  it('raises_priority_when_the_same_misconception_is_confirmed_twice', () => {
    const queue = createReviewQueueState();
    const first = makeQuestion('q1', 4);
    const second = makeQuestion('q2', 3);

    recordMisconception(queue, first);
    const entry = recordMisconception(queue, second);

    expect(entry).toMatchObject({
      misconceptionTag: 'borrow_omission',
      misses: 2,
      priority: 2,
      targetDifficulty: 2,
    });
    expect(entry.sourceQuestionIds).toEqual(['q1', 'q2']);
  });

  it('selects_a_different_same_tag_question_at_one_lower_difficulty', () => {
    const queue = createReviewQueueState();
    const source = makeQuestion('source', 4);
    const review = makeQuestion('review', 3);
    const bank: Bank = { version: BANK_VERSION, grade: 3, questions: [source, review] };

    recordMisconception(queue, source);

    const selected = selectReviewQuestion(queue, bank, 1, () => 0);

    expect(selected?.question.id).toBe('review');
    expect(selected?.question.difficulty).toBe(3);
    expect(selected?.fallback).toBeUndefined();
    expect(getReviewStats(queue)).toEqual({ reviewed: 1, converted: 0, conversionRate: 0 });
  });

  it('records_a_signal_when_it_must_fall_back_to_the_same_question', () => {
    const queue = createReviewQueueState();
    const source = makeQuestion('source', 2);
    const bank: Bank = { version: BANK_VERSION, grade: 3, questions: [source] };

    recordMisconception(queue, source);

    const selected = selectReviewQuestion(queue, bank, 1, () => 0);

    expect(selected?.question.id).toBe('source');
    expect(selected?.fallback).toMatchObject({
      misconceptionTag: 'borrow_omission',
      reason: 'same_question_fallback',
      targetDifficulty: 1,
    });
    expect(queue.fallbackSignals).toHaveLength(1);
  });

  it('removes_the_queue_entry_only_after_a_converted_review_answer', () => {
    const queue = createReviewQueueState();
    const source = makeQuestion('source', 3);
    const review = makeQuestion('review', 2);
    const bank: Bank = { version: BANK_VERSION, grade: 3, questions: [source, review] };

    recordMisconception(queue, source);
    selectReviewQuestion(queue, bank, 1, () => 0);
    expect(completeActiveReview(queue, review, false)).toBe(true);
    expect(queue.entries).toHaveLength(1);

    selectReviewQuestion(queue, bank, 1, () => 0);
    expect(completeActiveReview(queue, review, true)).toBe(true);

    expect(queue.entries).toHaveLength(0);
    expect(getReviewStats(queue)).toEqual({ reviewed: 2, converted: 1, conversionRate: 0.5 });
  });
});
