import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_GRADE_SELECTION,
  createGradeSelectView,
  normalizeGradeSelection,
  termIncludesSemester,
} from '../../src/ui/grade-select.js';

const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
});

describe('grade select', () => {
  it('normalizes_invalid_selection_to_defaults', () => {
    expect(normalizeGradeSelection({ grade: 9, term: 'summer' as never })).toEqual(
      DEFAULT_GRADE_SELECTION,
    );
  });

  it('keeps_valid_grade_and_term', () => {
    expect(normalizeGradeSelection({ grade: 6, term: 'all' })).toEqual({
      grade: 6,
      term: 'all',
    });
  });

  it('maps_term_options_to_semester_scope', () => {
    expect(termIncludesSemester(1, 1)).toBe(true);
    expect(termIncludesSemester(1, 2)).toBe(false);
    expect(termIncludesSemester(2, 1)).toBe(true);
    expect(termIncludesSemester(2, 2)).toBe(true);
    expect(termIncludesSemester('all', 1)).toBe(true);
    expect(termIncludesSemester('all', 2)).toBe(true);
  });

  it('uses_a_scroll_safe_compact_mobile_layout', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: new FakeDocument(),
    });

    const view = createGradeSelectView({
      loadBank: async () => ({ version: 1, grade: 3, questions: [] }),
    });
    const root = view.element as unknown as FakeElement;
    const buttons = findByTag(root, 'button');

    expect(root.style.cssText).toContain('max-height:calc(100dvh - 24px)');
    expect(root.style.cssText).toContain('overflow:auto');
    expect(buttons[0].style.cssText).toContain('min-height:58px');

    view.destroy();
  });
});

class FakeElement {
  readonly style = { cssText: '' } as CSSStyleDeclaration;
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  innerHTML = '';
  textContent = '';
  type = '';
  disabled = false;
  parent: FakeElement | null = null;

  constructor(readonly tagName: string) {}

  appendChild(child: FakeElement): FakeElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  addEventListener(): void {}

  remove(): void {
    if (!this.parent) return;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) this.parent.children.splice(index, 1);
  }
}

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName);
  }
}

function findByTag(root: FakeElement, tagName: string): FakeElement[] {
  const matches: FakeElement[] = [];
  visit(root, (element) => {
    if (element.tagName === tagName) matches.push(element);
  });
  return matches;
}

function visit(root: FakeElement, visitor: (element: FakeElement) => void): void {
  visitor(root);
  for (let i = 0; i < root.children.length; i += 1) {
    visit(root.children[i], visitor);
  }
}
