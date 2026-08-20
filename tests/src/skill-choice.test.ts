import { describe, expect, it } from 'vitest';
import type { LevelRewardChoice } from '../../src/systems/level-reward.js';
import { createSkillChoiceView } from '../../src/ui/skill-choice.js';

describe('skill choice view', () => {
  it('renders_choices_and_notifies_selected_reward', () => {
    const doc = new FakeDocument();
    const parent = doc.createElement('main');
    let selected: LevelRewardChoice | undefined;
    const choice: LevelRewardChoice = {
      kind: 'weapon',
      id: 'hydrogen_arrow',
      name: '수소 화살',
      detail: 'H',
      levelAfter: 2,
    };

    const view = createSkillChoiceView(parent as unknown as HTMLElement, {
      onChoose(next) {
        selected = next;
      },
    });
    expect(view.element.hidden).toBe(true);
    expect(view.element.style.cssText).toContain('display:none');
    view.show([choice]);

    expect(view.element.hidden).toBe(false);
    expect(view.element.style.display).toBe('grid');
    expect(parent.textContent).toContain('스킬 선택');
    expect(parent.textContent).toContain('수소 화살');
    expect(parent.textContent).toContain('Lv.2');
    findByTag(parent, 'button')[0]?.click();
    expect(selected).toBe(choice);

    view.hide();
    expect(view.element.hidden).toBe(true);
    expect(view.element.style.display).toBe('none');
    view.destroy();
  });
});

class FakeElement {
  readonly style = createStyle();
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, () => void>();
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

  addEventListener(name: string, listener: () => void): void {
    this.listeners.set(name, listener);
  }

  click(): void {
    this.listeners.get('click')?.();
  }

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
    visit(root.children[i] as FakeElement, visitor);
  }
}
