import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import { DEFAULT_STORAGE_DATA } from '../../src/storage.js';
import { createResultScreen } from '../../src/ui/result.js';

describe('result screen', () => {
  it('renders_combat_learning_best_records_and_korean_misconceptions', () => {
    const doc = new FakeDocument();
    const parent = doc.createElement('main');
    const view = createResultScreen(parent as unknown as HTMLElement);

    expect(view.element.hidden).toBe(true);
    expect(view.element.style.cssText).toContain('display:none');
    view.show({
      result: 'victory',
      survivalSec: 600,
      score: 1234,
      kills: 42,
      level: 9,
      weapons: [{ id: 'hydrogen_arrow', label: '수소 화살', level: 3, element: 'H' }],
      passives: [{ id: 'silicon', label: '규소 연산칩', level: 2, element: 'Si' }],
      evolutions: [{ id: 'heavy_hydrogen_storm', label: '중수소 폭풍', level: 1, element: 'D' }],
      quiz: {
        attempted: 4,
        firstTryCorrect: 3,
        accuracy: 0.75,
        byDomain: [
          { domain: Domain.Number, attempted: 2, firstTryCorrect: 1, accuracy: 0.5 },
          { domain: Domain.Relation, attempted: 1, firstTryCorrect: 1, accuracy: 1 },
          { domain: Domain.Geometry, attempted: 1, firstTryCorrect: 1, accuracy: 1 },
          { domain: Domain.Data, attempted: 0, firstTryCorrect: 0, accuracy: 0 },
        ],
        reviewConversionRate: 0.5,
        frequentMisconceptions: [{ tag: 'decimal_alignment', wrong: 3, converted: 1 }],
      },
      storage: {
        ...DEFAULT_STORAGE_DATA,
        best: { survivalSec: 600, kills: 42, accuracy: 0.75, score: 1234 },
        rankings: [{ heroName: '리나', score: 1234, survivalSec: 600, kills: 42, level: 9, grade: 4 }],
      },
    });

    expect(view.element.hidden).toBe(false);
    expect(view.element.style.display).toBe('grid');
    const text = parent.textContent;
    expect(text).toContain('안정화 성공');
    expect(text).toContain('1234');
    expect(text).toContain('리나');
    expect(text).toContain('랭킹 TOP 5');
    expect(text).toContain('수와 연산: 50%');
    expect(text).toContain('자료와 가능성: 0%');
    expect(text).toContain('소수점 자리 맞추기');
    expect(text).not.toContain('decimal_alignment');
    expect(text).toContain('다시 하기');
    expect(text).toContain('학년 바꾸기');

    view.hide();
    expect(view.element.hidden).toBe(true);
    expect(view.element.style.display).toBe('none');
  });
});

class FakeElement {
  readonly style = createStyle();
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  private ownText = '';
  hidden = false;
  className = '';
  type = '';
  parent: FakeElement | null = null;

  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}

  get textContent(): string {
    return this.ownText + this.children.map((child) => child.textContent).join('');
  }

  set textContent(value: string) {
    this.ownText = value;
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

  addEventListener(): void {}

  remove(): void {
    if (!this.parent) return;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) this.parent.children.splice(index, 1);
    this.parent = null;
  }
}

function createStyle(): CSSStyleDeclaration {
  return {
    cssText: '',
    display: '',
  } as CSSStyleDeclaration;
}

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}
