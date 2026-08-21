import type { Grade } from '../../shared/domain.js';
import type { Bank } from '../../shared/schema.js';
import type { CharacterId } from '../data/characters.js';
import {
  createCharacterSelectView,
  DEFAULT_HERO_NAME,
  type CharacterSelection,
} from './character-select.js';
import {
  createGradeSelectView,
  DEFAULT_GRADE_SELECTION,
  isGrade,
  isGradeTerm,
  type GradeSelection,
  type GradeTerm,
} from './grade-select.js';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface TitleSelection extends GradeSelection, CharacterSelection {}

export interface TitleFlowOptions {
  readonly storage?: StorageLike;
  readonly loadBank?: (grade: Grade) => Promise<Bank>;
  readonly onStart?: (selection: TitleSelection, bank: Bank) => void;
}

export interface TitleFlow {
  readonly element: HTMLElement;
  getSelection(): TitleSelection;
  destroy(): void;
}

export const TITLE_SELECTION_STORAGE_KEY = 'mathstack.titleSelection.v1';

const FALLBACK_SELECTION: TitleSelection = Object.freeze({
  ...DEFAULT_GRADE_SELECTION,
  characterId: 'actinium',
  heroName: DEFAULT_HERO_NAME,
});

export function readTitleSelection(storage: StorageLike | undefined): TitleSelection {
  if (!storage) return FALLBACK_SELECTION;
  const raw = storage.getItem(TITLE_SELECTION_STORAGE_KEY);
  if (!raw) return FALLBACK_SELECTION;

  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof TitleSelection, unknown>>;
    return normalizeTitleSelection(parsed);
  } catch {
    return FALLBACK_SELECTION;
  }
}

export function writeTitleSelection(storage: StorageLike | undefined, selection: TitleSelection): void {
  if (!storage) return;
  storage.setItem(TITLE_SELECTION_STORAGE_KEY, JSON.stringify(selection));
}

export function createTitleFlow(options: TitleFlowOptions = {}): TitleFlow {
  const saved = readTitleSelection(options.storage ?? window.localStorage);
  let current: TitleSelection = saved;
  let loadedBank: Bank | null = null;
  let child: { destroy(): void } | null = null;

  const root = document.createElement('div');
  root.className = 'mathstack-title-flow';
  root.style.cssText = [
    'min-height:100vh',
    'box-sizing:border-box',
    'padding:32px 18px',
    'display:grid',
    'place-items:center',
    'background:#1a1a2e',
    'color:#ffffff',
  ].join(';');

  function mount(element: HTMLElement, controller: { destroy(): void }): void {
    child?.destroy();
    child = controller;
    root.replaceChildren(element);
  }

  function showTitle(): void {
    const section = document.createElement('section');
    section.style.cssText = titleScreenStyle();

    const heading = document.createElement('h1');
    heading.textContent = 'MathStack';
    heading.style.cssText = 'margin:0;font-size:48px;line-height:1;color:#ffffff;';
    section.appendChild(heading);

    const sub = document.createElement('p');
    sub.textContent = '주기율표 왕국의 10분 수학 생존전';
    sub.style.cssText = 'margin:0;color:#dbe4ff;font-size:18px;';
    section.appendChild(sub);

    const start = document.createElement('button');
    start.type = 'button';
    start.textContent = '시작';
    start.style.cssText = primaryButtonStyle();
    start.addEventListener('click', showGradeSelect);
    section.appendChild(start);

    mount(section, { destroy: () => section.remove() });
  }

  function showGradeSelect(): void {
    const view = createGradeSelectView({
      initialSelection: current,
      loadBank: options.loadBank,
      onLoaded(selection, bank) {
        current = { ...current, ...selection };
        loadedBank = bank;
        writeTitleSelection(options.storage ?? window.localStorage, current);
        showCharacterSelect();
      },
    });
    mount(view.element, view);
  }

  function showCharacterSelect(): void {
    const view = createCharacterSelectView({
      initialCharacterId: current.characterId,
      initialHeroName: current.heroName,
      onStart(selection) {
        current = { ...current, ...selection };
        writeTitleSelection(options.storage ?? window.localStorage, current);
        if (loadedBank) options.onStart?.(current, loadedBank);
      },
    });
    mount(view.element, view);
  }

  showTitle();

  return {
    element: root,
    getSelection(): TitleSelection {
      return current;
    },
    destroy(): void {
      child?.destroy();
      root.remove();
    },
  };
}

function normalizeTitleSelection(
  value: Partial<Record<keyof TitleSelection, unknown>>,
): TitleSelection {
  const grade = Number(value.grade);
  const term = parseTerm(value.term);
  return {
    grade: isGrade(grade) ? grade : FALLBACK_SELECTION.grade,
    term: isGradeTerm(term) ? term : FALLBACK_SELECTION.term,
    characterId: parseCharacterId(value.characterId),
    heroName: typeof value.heroName === 'string' && value.heroName.trim() ? value.heroName.trim() : DEFAULT_HERO_NAME,
  };
}

function parseTerm(value: unknown): GradeTerm | undefined {
  if (value === 'all') return 'all';
  if (value === 1 || value === '1') return 1;
  if (value === 2 || value === '2') return 2;
  return undefined;
}

function parseCharacterId(value: unknown): CharacterId {
  if (value === 'actinium' || value === 'thorium' || value === 'lanthanum' || value === 'cerium') {
    return value;
  }
  return FALLBACK_SELECTION.characterId;
}

function titleScreenStyle(): string {
  return [
    'display:grid',
    'gap:18px',
    'width:min(640px,100%)',
    'padding:32px',
    'box-sizing:border-box',
    'background:#151827',
    'border:1px solid #2d334a',
    'border-radius:8px',
  ].join(';');
}

function primaryButtonStyle(): string {
  return [
    'min-height:56px',
    'border:0',
    'border-radius:8px',
    'background:#ffc107',
    'color:#1a1a2e',
    'font-weight:800',
    'font-size:18px',
    'cursor:pointer',
  ].join(';');
}
