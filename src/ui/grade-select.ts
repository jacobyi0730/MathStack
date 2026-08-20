import { GRADES, type Grade, type Semester } from '../../shared/domain.js';
import type { Bank } from '../../shared/schema.js';
import { loadQuestionBank } from '../quiz/loader.js';

export type GradeTerm = Semester | 'all';

export interface GradeSelection {
  readonly grade: Grade;
  readonly term: GradeTerm;
}

export type GradeLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

export interface GradeSelectViewOptions {
  readonly initialSelection?: GradeSelection;
  readonly loadBank?: (grade: Grade) => Promise<Bank>;
  readonly onLoaded?: (selection: GradeSelection, bank: Bank) => void;
  readonly onFailed?: (selection: GradeSelection, error: unknown) => void;
}

export interface GradeSelectView {
  readonly element: HTMLElement;
  getSelection(): GradeSelection;
  getStatus(): GradeLoadStatus;
  confirm(): Promise<void>;
  destroy(): void;
}

export const DEFAULT_GRADE_SELECTION: GradeSelection = Object.freeze({
  grade: 3,
  term: 2,
});

export const TERM_OPTIONS = [
  { value: 1, label: '1학기', detail: '1학기 문제만' },
  { value: 2, label: '2학기', detail: '현재 학기까지' },
  { value: 'all', label: '전 범위', detail: '학년 전체' },
] as const satisfies readonly {
  readonly value: GradeTerm;
  readonly label: string;
  readonly detail: string;
}[];

export function isGrade(value: number): value is Grade {
  return (GRADES as readonly number[]).includes(value);
}

export function isGradeTerm(value: unknown): value is GradeTerm {
  return value === 1 || value === 2 || value === 'all';
}

export function normalizeGradeSelection(value: {
  readonly grade?: unknown;
  readonly term?: unknown;
}): GradeSelection {
  const grade = Number(value.grade);
  return {
    grade: isGrade(grade) ? grade : DEFAULT_GRADE_SELECTION.grade,
    term: isGradeTerm(value.term) ? value.term : DEFAULT_GRADE_SELECTION.term,
  };
}

export function termIncludesSemester(term: GradeTerm, semester: Semester): boolean {
  if (term === 'all') return true;
  if (term === 2) return semester <= 2;
  return semester === 1;
}

export function createGradeSelectView(options: GradeSelectViewOptions = {}): GradeSelectView {
  const loadBank = options.loadBank ?? loadQuestionBank;
  let selection = normalizeGradeSelection(options.initialSelection ?? DEFAULT_GRADE_SELECTION);
  let status: GradeLoadStatus = 'idle';
  let lastError = '';

  const root = document.createElement('section');
  root.className = 'mathstack-grade-select';
  root.style.cssText = screenStyle();

  const title = document.createElement('h1');
  title.textContent = '학년과 범위 선택';
  title.style.cssText = 'margin:0;font-size:28px;color:#ffffff;';
  root.appendChild(title);

  const gradeGrid = document.createElement('div');
  gradeGrid.style.cssText = gridStyle();
  root.appendChild(gradeGrid);

  const termGrid = document.createElement('div');
  termGrid.style.cssText = gridStyle();
  root.appendChild(termGrid);

  const statusEl = document.createElement('p');
  statusEl.setAttribute('role', 'status');
  statusEl.style.cssText = 'min-height:24px;margin:0;color:#f8fafc;font-size:15px;';
  root.appendChild(statusEl);

  const action = document.createElement('button');
  action.type = 'button';
  action.textContent = '문항 준비';
  action.style.cssText = primaryButtonStyle();
  root.appendChild(action);

  const gradeButtons = GRADES.map((grade) => {
    const button = createChoiceButton(`${grade}학년`, `${grade}학년 문항 뱅크`);
    button.addEventListener('click', () => {
      selection = { ...selection, grade };
      render();
    });
    gradeGrid.appendChild(button);
    return { grade, button };
  });

  const termButtons = TERM_OPTIONS.map((term) => {
    const button = createChoiceButton(term.label, term.detail);
    button.addEventListener('click', () => {
      selection = { ...selection, term: term.value };
      render();
    });
    termGrid.appendChild(button);
    return { term: term.value, button };
  });

  async function confirm(): Promise<void> {
    status = 'loading';
    lastError = '';
    render();

    try {
      const bank = await loadBank(selection.grade);
      status = 'loaded';
      render();
      options.onLoaded?.(selection, bank);
    } catch (error) {
      status = 'failed';
      lastError = error instanceof Error ? error.message : '문항을 불러오지 못했습니다.';
      render();
      options.onFailed?.(selection, error);
    }
  }

  action.addEventListener('click', () => {
    void confirm();
  });

  function render(): void {
    for (const item of gradeButtons) {
      applyPressed(item.button, item.grade === selection.grade);
    }
    for (const item of termButtons) {
      applyPressed(item.button, item.term === selection.term);
    }

    action.disabled = status === 'loading';
    action.textContent =
      status === 'loading' ? '불러오는 중...' : status === 'failed' ? '다시 시도' : '문항 준비';
    statusEl.textContent = statusMessage(status, selection, lastError);
  }

  render();

  return {
    element: root,
    getSelection(): GradeSelection {
      return selection;
    },
    getStatus(): GradeLoadStatus {
      return status;
    },
    confirm,
    destroy(): void {
      root.remove();
    },
  };
}

function statusMessage(
  status: GradeLoadStatus,
  selection: GradeSelection,
  lastError: string,
): string {
  if (status === 'loading') return `${selection.grade}학년 문항을 준비하고 있습니다.`;
  if (status === 'loaded') return '문항 준비 완료';
  if (status === 'failed') return lastError || '문항을 불러오지 못했습니다.';
  return '학년을 확정하면 해당 학년 문항만 불러옵니다.';
}

function createChoiceButton(label: string, detail: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.style.cssText = choiceButtonStyle(false);
  button.innerHTML = `<strong>${label}</strong><span>${detail}</span>`;
  return button;
}

function applyPressed(button: HTMLButtonElement, pressed: boolean): void {
  button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  button.style.cssText = choiceButtonStyle(pressed);
}

function screenStyle(): string {
  return [
    'display:grid',
    'gap:18px',
    'max-width:720px',
    'margin:0 auto',
    'padding:28px',
    'color:#ffffff',
    'background:#151827',
    'border:1px solid #2d334a',
    'border-radius:8px',
  ].join(';');
}

function gridStyle(): string {
  return 'display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px;';
}

function choiceButtonStyle(pressed: boolean): string {
  const border = pressed ? '#ffc107' : '#3c435f';
  const background = pressed ? '#273047' : '#1d2234';
  return [
    'min-height:76px',
    'padding:12px',
    'display:grid',
    'gap:4px',
    'text-align:left',
    `border:2px solid ${border}`,
    'border-radius:8px',
    `background:${background}`,
    'color:#ffffff',
    'cursor:pointer',
  ].join(';');
}

function primaryButtonStyle(): string {
  return [
    'min-height:52px',
    'border:0',
    'border-radius:8px',
    'background:#ffc107',
    'color:#1a1a2e',
    'font-weight:700',
    'cursor:pointer',
  ].join(';');
}
