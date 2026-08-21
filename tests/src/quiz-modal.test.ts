import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import type { Question } from '../../shared/schema.js';
import { createQuizModal } from '../../src/ui/quiz-modal.js';

// 모달은 생성 시 window 에 키보드 리스너를 걸고, 접근성 설정이 matchMedia 를 읽는다.
// vitest 환경이 node 라 window 가 없어 필요한 만큼만 stub 을 둔다
(globalThis as { window?: unknown }).window ??= {
  addEventListener(): void {},
  removeEventListener(): void {},
  matchMedia(): { matches: boolean } {
    return { matches: false };
  },
};

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

const decimalQuestion: Question = {
  ...question,
  id: 'G4-N-002-01',
  unit: '소수',
  stem: '0.5 + 2 를 계산하세요.',
  choices: ['2.5', '0.25', '25', '250'],
  answer: '2.5',
  distractorReason: ['정답', '자릿값 혼동', '소수점 누락', '자릿수 혼동'],
  explanation: '0.5 + 2 = 2.5 입니다.',
  misconceptionTag: 'decimal_place_value',
};

function mount(options?: Parameters<typeof createQuizModal>[1]) {
  const doc = new FakeDocument();
  const host = doc.createElement('main');
  return createQuizModal(host as unknown as HTMLElement, options);
}

describe('quiz modal', () => {
  it('exports_a_dom_factory_api', () => {
    expect(typeof createQuizModal).toBe('function');
  });

  it('renders_choice_buttons_as_a_2x2_touch_grid', () => {
    const modal = mount();

    modal.show({ question, phase: 'first', retry: false });

    const choices = modal.root.querySelector<HTMLElement>('.mathstack-quiz__choices');
    const buttons = modal.root.querySelectorAll<HTMLButtonElement>('button[data-answer]');

    expect(choices?.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(buttons).toHaveLength(4);
    expect(buttons[0].style.minHeight).toBe('56px');

    modal.destroy();
  });

  it('keeps_the_choice_number_out_of_the_answer_text', () => {
    const modal = mount();

    modal.show({ question: decimalQuestion, phase: 'first', retry: false });

    const buttons = modal.root.querySelectorAll<HTMLButtonElement>('button[data-answer]');
    const shortcut = buttons[0].querySelector<HTMLElement>('.mathstack-quiz__shortcut');
    const value = buttons[0].querySelector<HTMLElement>('.mathstack-quiz__choice-value');

    // 번호가 답과 한 덩어리로 읽히면 안 된다 — 1. 2.5 는 어디까지가 번호인지 알 수 없다
    expect(shortcut?.textContent).toBe('1');
    expect(value?.textContent).toBe('2.5');
    expect(buttons[0].dataset.answer).toBe('2.5');
    expect(buttons[1].querySelector('.mathstack-quiz__shortcut')?.textContent).toBe('2');
    expect(buttons[1].querySelector('.mathstack-quiz__choice-value')?.textContent).toBe('0.25');

    modal.destroy();
  });

  it('hides_the_number_badge_from_screen_readers_but_keeps_the_key_shortcut', () => {
    const modal = mount();

    modal.show({ question: decimalQuestion, phase: 'first', retry: false });

    const buttons = modal.root.querySelectorAll<HTMLButtonElement>('button[data-answer]');
    for (let i = 0; i < buttons.length; i += 1) {
      const shortcut = buttons[i].querySelector<HTMLElement>('.mathstack-quiz__shortcut');
      expect(shortcut?.getAttribute('aria-hidden')).toBe('true');
      // 숫자 키 1~4 조작이 이 번호를 가리킨다. 지우면 키보드 조작이 끊긴다
      expect(shortcut?.textContent).toBe(String(i + 1));
    }

    modal.destroy();
  });

  it('renders_the_answer_larger_than_the_number_badge', () => {
    const modal = mount();

    modal.show({ question: decimalQuestion, phase: 'first', retry: false });

    const button = modal.root.querySelectorAll<HTMLButtonElement>('button[data-answer]')[0];
    const shortcutSize = Number.parseInt(
      button.querySelector<HTMLElement>('.mathstack-quiz__shortcut')?.style.fontSize ?? '0',
      10,
    );
    const valueSize = Number.parseInt(
      button.querySelector<HTMLElement>('.mathstack-quiz__choice-value')?.style.fontSize ?? '0',
      10,
    );

    expect(valueSize).toBeGreaterThan(shortcutSize);

    modal.destroy();
  });

  it('renders_number_input_and_feedback_states', () => {
    const numberQuestion: Question = { ...question, format: 'number_input' };
    const modal = mount();

    modal.show({ question: numberQuestion, phase: 'retry', retry: true });
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
    expect(modal.root.querySelector<HTMLElement>('.mathstack-quiz__timer')?.hidden).toBe(true);
    expect(modal.root.querySelector<HTMLElement>('.mathstack-quiz__timer-text')?.textContent).toBe('');
    expect(modal.root.querySelector<HTMLElement>('.mathstack-quiz__feedback')?.textContent).toContain('[X]');
    expect(modal.root.textContent).toContain('체력은 줄지 않습니다');

    modal.destroy();
  });

  it('applies_accessibility_settings_without_quiz_timer', () => {
    const modal = mount({
      settings: {
        slowMode: true,
        effectIntensity: 0,
        textSize: 'large',
        keyboardOnlyHints: true,
      },
    });

    modal.show({ question, phase: 'first', retry: false });
    modal.showResult({
      kind: 'incorrect',
      choicesOffered: 2,
      shouldRetry: false,
      retryConsumed: false,
      healthDelta: 0,
      misconceptionTag: 'fraction_notation',
    });

    expect(modal.root.querySelector<HTMLElement>('.mathstack-quiz__timer')?.hidden).toBe(true);
    expect(modal.root.querySelector<HTMLElement>('.mathstack-quiz__prompt')?.style.fontSize).toBe('32px');
    expect(modal.root.querySelector<HTMLElement>('.mathstack-quiz__panel')?.dataset.result).toBe('');

    modal.destroy();
  });

  it('scales_choice_and_input_text_in_large_text_mode', () => {
    const normal = mount();
    normal.show({ question: decimalQuestion, phase: 'first', retry: false });
    const normalSize = normal.root.querySelector<HTMLElement>('.mathstack-quiz__choice-value')?.style
      .fontSize;
    normal.destroy();

    const large = mount({ settings: { textSize: 'large' } });
    large.show({ question: decimalQuestion, phase: 'first', retry: false });

    expect(normalSize).toBe('22px');
    expect(large.root.querySelector<HTMLElement>('.mathstack-quiz__choice-value')?.style.fontSize).toBe(
      '28px',
    );
    expect(large.root.querySelector<HTMLElement>('.mathstack-quiz__input')?.style.fontSize).toBe('30px');

    large.destroy();
  });
});

/**
 * 이 저장소의 UI 테스트 관행을 따른 최소 DOM 대역 (hud/result/skill-choice 테스트와 같은 방식).
 * vitest 환경이 node 라 실제 document 가 없다. 클래스 선택자와 button[data-answer] 만 지원한다.
 */
class FakeElement {
  readonly style: Record<string, string> = {};
  readonly dataset: Record<string, string> = {};
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly classList = createClassList(
    () => this.className,
    (value) => {
      this.className = value;
    },
  );
  private ownText = '';
  hidden = false;
  className = '';
  id = '';
  type = '';
  value = '';
  inputMode = '';
  autocomplete = '';
  parent: FakeElement | null = null;

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  get textContent(): string {
    return this.ownText + this.children.map((child) => child.textContent).join('');
  }

  set textContent(value: string) {
    this.ownText = value;
    this.children.length = 0;
  }

  append(...children: FakeElement[]): void {
    for (const child of children) this.appendChild(child);
  }

  appendChild(child: FakeElement): FakeElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  replaceChildren(...children: FakeElement[]): void {
    this.children.length = 0;
    this.ownText = '';
    for (const child of children) this.appendChild(child);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const found: FakeElement[] = [];
    for (const child of this.children) {
      if (child.matches(selector)) found.push(child);
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }

  matches(selector: string): boolean {
    if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1));
    if (selector === 'button[data-answer]') {
      return this.tagName === 'button' && this.dataset.answer !== undefined;
    }
    return this.tagName === selector;
  }

  closest(selector: string): FakeElement | null {
    if (this.matches(selector)) return this;
    return this.parent?.closest(selector) ?? null;
  }

  focus(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}

  remove(): void {
    if (!this.parent) return;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) this.parent.children.splice(index, 1);
    this.parent = null;
  }
}

function createClassList(read: () => string, write: (value: string) => void) {
  const names = (): string[] => read().split(/\s+/).filter((name) => name.length > 0);
  return {
    add(name: string): void {
      const current = names();
      if (!current.includes(name)) write([...current, name].join(' '));
    },
    remove(name: string): void {
      write(
        names()
          .filter((candidate) => candidate !== name)
          .join(' '),
      );
    },
    contains(name: string): boolean {
      return names().includes(name);
    },
    toggle(name: string, force?: boolean): boolean {
      const shouldAdd = force ?? !names().includes(name);
      if (shouldAdd) this.add(name);
      else this.remove(name);
      return shouldAdd;
    },
  };
}

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }

  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }

  createTextNode(value: string): FakeElement {
    const node = new FakeElement(this, '#text');
    node.textContent = value;
    return node;
  }

  createDocumentFragment(): FakeElement {
    return new FakeElement(this, '#fragment');
  }
}
