import type { Question } from '../../shared/schema.js';
import type { QuizAttemptPhase, QuizGradeResult } from '../quiz/grader.js';
import { renderMathText } from './fraction.js';
import {
  DEFAULT_ACCESSIBILITY_SETTINGS,
  effectiveEffectIntensity,
  normalizeAccessibilitySettings,
  type AccessibilitySettings,
} from './settings.js';

export type QuizModalState = {
  question: Question;
  phase: QuizAttemptPhase;
  retry: boolean;
  remainingSec?: number;
  totalSec?: number;
};

export type QuizModalSubmit = {
  answer: string;
  phase: QuizAttemptPhase;
};

export type QuizModalHandlers = {
  onSubmit?: (submission: QuizModalSubmit) => void;
  onHide?: () => void;
};

export type QuizModalOptions = QuizModalHandlers & {
  settings?: Partial<AccessibilitySettings>;
};

export type QuizModal = {
  root: HTMLElement;
  show(state: QuizModalState): void;
  hide(): void;
  updateTimer(remainingSec?: number, totalSec?: number): void;
  showResult(result: QuizGradeResult, explanation?: string): void;
  resetResult(): void;
  getAnswer(): string;
  destroy(): void;
};

type QuizModalElements = {
  root: HTMLElement;
  panel: HTMLElement;
  timer: HTMLElement;
  prompt: HTMLElement;
  meta: HTMLElement;
  timerRing: SVGCircleElement;
  timerText: HTMLElement;
  choices: HTMLElement;
  inputWrap: HTMLElement;
  input: HTMLInputElement;
  submit: HTMLButtonElement;
  feedback: HTMLElement;
  explanation: HTMLElement;
};

const TIMER_CIRCUMFERENCE = 100;
/** 보기 글자 크기. 번호 배지(18px)보다 크게 둬서 눈이 답에 먼저 닿게 한다 */
const CHOICE_FONT_SIZE_PX = 22;
const CHOICE_FONT_SIZE_LARGE_PX = 28;

export function createQuizModal(
  parent: HTMLElement = document.body,
  options: QuizModalOptions = {},
): QuizModal {
  const elements = createElements(parent);
  let currentState: QuizModalState | undefined;
  let currentSettings = normalizeQuizSettings(options.settings);

  const submitAnswer = (answer: string): void => {
    if (currentState === undefined) return;
    options.onSubmit?.({ answer, phase: currentState.phase });
  };

  elements.choices.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest<HTMLButtonElement>('button[data-answer]');
    if (button === null) return;
    submitAnswer(button.dataset.answer ?? '');
  });

  elements.submit.addEventListener('click', () => submitAnswer(elements.input.value.trim()));
  elements.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitAnswer(elements.input.value.trim());
  });

  const keydown = (event: KeyboardEvent): void => {
    if (elements.root.hidden || currentState?.question.format !== 'choice') return;
    const choiceIndex = Number(event.key) - 1;
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) return;

    const button = elements.choices.querySelectorAll<HTMLButtonElement>('button[data-answer]')[choiceIndex];
    if (button !== undefined) {
      event.preventDefault();
      button.focus();
      submitAnswer(button.dataset.answer ?? '');
    }
  };

  window.addEventListener('keydown', keydown);

  return {
    root: elements.root,

    show(state: QuizModalState): void {
      currentState = state;
      renderQuestion(elements, state);
      currentSettings = normalizeQuizSettings(options.settings);
      applyQuizSettings(elements, currentSettings);
      this.resetResult();
      this.updateTimer(state.remainingSec, state.totalSec);
      elements.root.hidden = false;
      elements.root.setAttribute('aria-hidden', 'false');
      elements.root.style.display = 'grid';
    },

    hide(): void {
      elements.root.hidden = true;
      elements.root.setAttribute('aria-hidden', 'true');
      elements.root.style.display = 'none';
      options.onHide?.();
    },

    updateTimer(remainingSec?: number, totalSec = currentState?.totalSec ?? currentState?.question.timeLimitSec ?? 15): void {
      elements.timer.hidden = true;
      elements.timer.setAttribute('aria-hidden', 'true');
      elements.timerRing.style.strokeDashoffset = '0';
      elements.timerText.textContent = '';
      elements.timerRing.classList.remove('mathstack-quiz__timer-ring--danger');
      elements.timerText.classList.remove('mathstack-quiz__timer-text--danger');
      if (remainingSec === undefined) return;

      const safeTotal = Math.max(1, totalSec);
      const clampedRemaining = Math.max(0, Math.min(remainingSec, safeTotal));
      const progress = clampedRemaining / safeTotal;
      elements.timerRing.style.strokeDashoffset = `${TIMER_CIRCUMFERENCE * (1 - progress)}`;
      elements.timerText.textContent = `${Math.ceil(clampedRemaining)}초`;
      elements.timerRing.classList.toggle('mathstack-quiz__timer-ring--danger', clampedRemaining <= 5);
      elements.timerText.classList.toggle('mathstack-quiz__timer-text--danger', clampedRemaining <= 5);
    },

    showResult(result: QuizGradeResult, explanation = currentState?.question.explanation ?? ''): void {
      renderResult(elements, result, explanation, currentSettings);
    },

    resetResult(): void {
      elements.panel.dataset.result = '';
      elements.feedback.textContent = '';
      elements.explanation.hidden = true;
      elements.explanation.replaceChildren();
    },

    getAnswer(): string {
      return elements.input.value.trim();
    },

    destroy(): void {
      window.removeEventListener('keydown', keydown);
      elements.root.remove();
    },
  };
}

function createElements(parent: HTMLElement): QuizModalElements {
  const doc = parent.ownerDocument;
  const root = doc.createElement('section');
  root.className = 'mathstack-quiz';
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'mathstack-quiz-prompt');
  root.style.position = 'fixed';
  root.style.inset = '0';
  root.style.display = 'none';
  root.style.placeItems = 'center';
  root.style.padding = '24px';
  root.style.background = 'rgb(0 0 0 / 40%)';
  root.style.zIndex = '20';

  const panel = doc.createElement('div');
  panel.className = 'mathstack-quiz__panel';
  panel.style.width = 'min(720px, 100%)';
  panel.style.padding = '24px';
  panel.style.borderRadius = '8px';
  panel.style.background = '#f8fbff';
  panel.style.color = '#14213d';
  panel.style.boxShadow = '0 18px 48px rgb(0 0 0 / 28%)';

  const header = doc.createElement('div');
  header.className = 'mathstack-quiz__header';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.gap = '16px';
  header.style.alignItems = 'center';

  const meta = doc.createElement('div');
  meta.className = 'mathstack-quiz__meta';

  const timer = createTimer(doc);
  header.append(meta, timer.wrap);

  const prompt = doc.createElement('h2');
  prompt.id = 'mathstack-quiz-prompt';
  prompt.className = 'mathstack-quiz__prompt';
  prompt.style.margin = '20px 0';
  prompt.style.fontSize = '24px';
  prompt.style.lineHeight = '1.35';

  const choices = doc.createElement('div');
  choices.className = 'mathstack-quiz__choices';
  choices.style.display = 'grid';
  choices.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
  choices.style.gap = '12px';

  const inputWrap = doc.createElement('div');
  inputWrap.className = 'mathstack-quiz__input-wrap';
  inputWrap.style.display = 'none';
  inputWrap.style.gap = '12px';

  const input = doc.createElement('input');
  input.className = 'mathstack-quiz__input';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.style.minHeight = '56px';
  input.style.fontSize = '24px';
  input.style.flex = '1';

  const submit = doc.createElement('button');
  submit.className = 'mathstack-quiz__submit';
  submit.type = 'button';
  submit.textContent = '제출';
  submit.style.minHeight = '56px';
  submit.style.padding = '0 18px';

  inputWrap.append(input, submit);

  const feedback = doc.createElement('div');
  feedback.className = 'mathstack-quiz__feedback';
  feedback.setAttribute('role', 'status');
  feedback.style.marginTop = '16px';
  feedback.style.fontWeight = '700';

  const explanation = doc.createElement('div');
  explanation.className = 'mathstack-quiz__explanation';
  explanation.hidden = true;
  explanation.style.marginTop = '12px';
  explanation.style.padding = '14px';
  explanation.style.borderRadius = '8px';
  explanation.style.background = '#fff3f0';
  explanation.style.border = '2px solid #b83b2d';

  panel.append(header, prompt, choices, inputWrap, feedback, explanation);
  root.appendChild(panel);
  parent.appendChild(root);

  return {
    root,
    panel,
    timer: timer.wrap,
    prompt,
    meta,
    timerRing: timer.ring,
    timerText: timer.text,
    choices,
    inputWrap,
    input,
    submit,
    feedback,
    explanation,
  };
}

function createTimer(doc: Document): {
  wrap: HTMLElement;
  ring: SVGCircleElement;
  text: HTMLElement;
} {
  const wrap = doc.createElement('div');
  wrap.className = 'mathstack-quiz__timer';
  wrap.style.position = 'relative';
  wrap.style.width = '64px';
  wrap.style.height = '64px';

  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 36 36');
  svg.style.width = '64px';
  svg.style.height = '64px';

  const track = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
  track.setAttribute('cx', '18');
  track.setAttribute('cy', '18');
  track.setAttribute('r', '15.9');
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke', '#cad5e2');
  track.setAttribute('stroke-width', '3');

  const ring = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ring.classList.add('mathstack-quiz__timer-ring');
  ring.setAttribute('cx', '18');
  ring.setAttribute('cy', '18');
  ring.setAttribute('r', '15.9');
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', '#146c43');
  ring.setAttribute('stroke-width', '3');
  ring.setAttribute('pathLength', `${TIMER_CIRCUMFERENCE}`);
  ring.style.strokeDasharray = `${TIMER_CIRCUMFERENCE}`;
  ring.style.transform = 'rotate(-90deg)';
  ring.style.transformOrigin = 'center';

  svg.append(track, ring);

  const text = doc.createElement('div');
  text.className = 'mathstack-quiz__timer-text';
  text.style.position = 'absolute';
  text.style.inset = '0';
  text.style.display = 'grid';
  text.style.placeItems = 'center';
  text.style.fontWeight = '700';

  wrap.append(svg, text);
  return { wrap, ring, text };
}

function renderQuestion(elements: QuizModalElements, state: QuizModalState): void {
  const question = state.question;
  elements.meta.textContent = `${question.unit} · 난이도 ${question.difficulty}`;
  elements.prompt.replaceChildren(renderMathText(question.stem, elements.prompt.ownerDocument));
  elements.input.value = '';
  elements.choices.replaceChildren();

  if (question.format === 'number_input') {
    elements.choices.style.display = 'none';
    elements.inputWrap.style.display = 'flex';
    elements.input.focus();
    return;
  }

  elements.choices.style.display = 'grid';
  elements.inputWrap.style.display = 'none';

  question.choices.slice(0, 4).forEach((choice, index) => {
    elements.choices.appendChild(createChoiceButton(elements.root.ownerDocument, choice, index));
  });
}

/**
 * 보기 버튼 하나.
 *
 * 번호는 **답과 같은 줄의 글자가 아니라 원형 배지**로 분리한다. `1. ` 을 답 앞에 이어 붙이면
 * 답이 소수일 때 `2. 2.5` 가 되어 어디까지가 번호인지 읽히지 않는다. 번호 자체는 지우지 않는다 —
 * 숫자 키 1~4 로 고르는 키보드 조작(접근성)이 이 번호를 가리키기 때문이다.
 */
function createChoiceButton(doc: Document, choice: string, index: number): HTMLButtonElement {
  const button = doc.createElement('button');
  button.className = 'mathstack-quiz__choice';
  button.type = 'button';
  button.dataset.answer = choice;
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.gap = '14px';
  button.style.minHeight = '56px';
  button.style.padding = '10px 14px';
  button.style.textAlign = 'left';
  button.style.borderRadius = '8px';
  button.style.border = '2px solid #45617f';
  button.style.background = '#ffffff';
  button.style.color = '#14213d';

  const shortcut = doc.createElement('span');
  shortcut.className = 'mathstack-quiz__shortcut';
  shortcut.textContent = `${index + 1}`;
  shortcut.setAttribute('aria-hidden', 'true');
  shortcut.style.flex = '0 0 34px';
  shortcut.style.width = '34px';
  shortcut.style.height = '34px';
  shortcut.style.display = 'grid';
  shortcut.style.placeItems = 'center';
  shortcut.style.borderRadius = '50%';
  shortcut.style.background = '#45617f';
  shortcut.style.color = '#ffffff';
  shortcut.style.fontSize = '18px';
  shortcut.style.fontWeight = '700';

  const value = doc.createElement('span');
  value.className = 'mathstack-quiz__choice-value';
  value.style.flex = '1';
  value.style.fontSize = `${CHOICE_FONT_SIZE_PX}px`;
  value.style.fontWeight = '700';
  value.appendChild(renderMathText(choice, doc));

  button.append(shortcut, value);
  return button;
}

function renderResult(
  elements: QuizModalElements,
  result: QuizGradeResult,
  explanation: string,
  settings: AccessibilitySettings,
): void {
  const effectsEnabled = effectiveEffectIntensity(settings) > 0;

  if (result.kind === 'correct') {
    elements.panel.dataset.result = effectsEnabled ? 'correct' : '';
    elements.feedback.textContent = '[OK] 정답입니다. 보상을 고를 수 있어요.';
    return;
  }

  if (result.kind === 'try_again') {
    elements.panel.dataset.result = effectsEnabled ? 'try-again' : '';
    elements.feedback.textContent = '[!] 다시 한 번 풀어봅시다.';
    elements.explanation.hidden = false;
    elements.explanation.replaceChildren(renderMathText(explanation, elements.explanation.ownerDocument));
    return;
  }

  elements.panel.dataset.result = effectsEnabled ? 'incorrect' : '';
  elements.feedback.textContent = '[X] 아쉬워요. 그래도 체력은 줄지 않습니다.';
  elements.explanation.hidden = false;
  elements.explanation.replaceChildren(renderMathText(explanation, elements.explanation.ownerDocument));
}

function normalizeQuizSettings(
  settings: Partial<AccessibilitySettings> | undefined,
): AccessibilitySettings {
  return normalizeAccessibilitySettings({
    ...DEFAULT_ACCESSIBILITY_SETTINGS,
    ...settings,
  });
}

function applyQuizSettings(
  elements: QuizModalElements,
  settings: AccessibilitySettings,
): void {
  const large = settings.textSize === 'large';
  elements.prompt.style.fontSize = large ? '32px' : '24px';
  elements.input.style.fontSize = large ? '30px' : '24px';
  applyChoiceFontSize(elements, large ? CHOICE_FONT_SIZE_LARGE_PX : CHOICE_FONT_SIZE_PX);
  elements.timer.hidden = true;
  elements.timer.setAttribute('aria-hidden', 'true');
  elements.root.classList.toggle('mathstack-quiz--slow-mode', settings.slowMode);
  elements.root.classList.toggle('mathstack-quiz--large-text', settings.textSize === 'large');
  elements.root.classList.toggle(
    'mathstack-quiz--no-effects',
    effectiveEffectIntensity(settings) === 0,
  );
}

function applyChoiceFontSize(elements: QuizModalElements, sizePx: number): void {
  const values = elements.choices.querySelectorAll<HTMLElement>('.mathstack-quiz__choice-value');
  for (let i = 0; i < values.length; i += 1) {
    values[i].style.fontSize = `${sizePx}px`;
  }
}
