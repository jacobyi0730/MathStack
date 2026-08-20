import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import type { Question } from '../../shared/schema.js';
import { createQuizModal } from '../../src/ui/quiz-modal.js';

const question: Question = {
  id: 'G4-N-001-01',
  grade: 4,
  semester: 1,
  domain: Domain.Number,
  unit: '분수',
  standard: '4수01-01',
  difficulty: 2,
  format: 'choice',
  stem: '3/5와 같은 값을 고르세요.',
  choices: ['3/5', '2/5', '1과 3/5', '5/3'],
  answer: '3/5',
  distractorReason: ['정답', '분자 혼동', '대분수 혼동', '역수 혼동'],
  explanation: '분자 3, 분모 5인 분수입니다.',
  timeLimitSec: 15,
  misconceptionTag: 'fraction_notation',
};

describe('quiz modal', () => {
  it('exports_a_dom_factory_api', () => {
    expect(typeof createQuizModal).toBe('function');
  });

  it.runIf(typeof document !== 'undefined')('renders_choice_buttons_as_a_2x2_touch_grid', () => {
    const host = document.createElement('div');
    const modal = createQuizModal(host);

    modal.show({
      question,
      phase: 'first',
      retry: false,
      remainingSec: 15,
    });

    const choices = modal.root.querySelector<HTMLElement>('.mathstack-quiz__choices');
    const buttons = modal.root.querySelectorAll<HTMLButtonElement>('button[data-answer]');

    expect(choices?.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(buttons).toHaveLength(4);
    expect(buttons[0].style.minHeight).toBe('56px');
    expect(buttons[0].textContent).not.toContain('3/5');

    modal.destroy();
  });

  it.runIf(typeof document !== 'undefined')('renders_number_input_and_feedback_states', () => {
    const host = document.createElement('div');
    const numberQuestion: Question = { ...question, format: 'number_input' };
    const modal = createQuizModal(host);

    modal.show({
      question: numberQuestion,
      phase: 'retry',
      retry: true,
      remainingSec: 4,
    });
    modal.showResult(
      {
        kind: 'incorrect',
        choicesOffered: 2,
        shouldRetry: false,
        retryConsumed: true,
        healthDelta: 0,
        misconceptionTag: 'fraction_notation',
      },
      numberQuestion.explanation,
    );

    expect(modal.root.querySelector<HTMLElement>('.mathstack-quiz__choices')?.style.display).toBe('none');
    expect(modal.root.querySelector<HTMLElement>('.mathstack-quiz__input-wrap')?.style.display).toBe('flex');
    expect(modal.root.querySelector<HTMLElement>('.mathstack-quiz__timer-text')?.textContent).toBe('4초');
    expect(modal.root.querySelector<HTMLElement>('.mathstack-quiz__feedback')?.textContent).toContain('[X]');
    expect(modal.root.textContent).toContain('체력은 줄지 않습니다');

    modal.destroy();
  });
});
