import { afterEach, describe, expect, it } from 'vitest';
import { CHARACTER_ARCHETYPES } from '../../src/data/characters.js';
import {
  DEFAULT_HERO_NAME,
  createCharacterSelectView,
  formatCharacterTraits,
  normalizeHeroName,
} from '../../src/ui/character-select.js';

const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
});

describe('character select', () => {
  it('normalizes_empty_hero_name_to_default', () => {
    expect(normalizeHeroName('  ')).toBe(DEFAULT_HERO_NAME);
    expect(normalizeHeroName('  Ada  ')).toBe('Ada');
  });

  it('formats_all_four_starting_weapons_as_attacks', () => {
    const traits = CHARACTER_ARCHETYPES.map((character) => [
      character.id,
      formatCharacterTraits(character),
    ]);

    expect(traits).toEqual([
      [
        'actinium',
        [
          '시작 공격: 악티늄 창',
          '직선 투사체 / 피해 15 / 쿨타임 1.55초',
          '각성 짝꿍: 프로트악티늄 방패 보유 + 무기 Lv.5 → 궤멸의 항암 치료제',
        ],
      ],
      [
        'thorium',
        [
          '시작 공격: 토륨 망치',
          '폭발 공격 / 피해 22 / 쿨타임 3.1초',
          '각성 짝꿍: 우라늄 분열핵 보유 + 무기 Lv.5 → 영구의 원전 연료',
        ],
      ],
      [
        'lanthanum',
        [
          '시작 공격: 란타넘 창',
          '직선 투사체 / 피해 13 / 쿨타임 1.6초',
          '각성 짝꿍: 루테튬 종결석 보유 + 무기 Lv.5 → 정밀의 암 진단 센서',
        ],
      ],
      [
        'cerium',
        [
          '시작 공격: 세륨 섬광',
          '산탄 공격 / 피해 9 / 쿨타임 1.7초',
          '각성 짝꿍: 프라세오디뮴 증폭기 보유 + 무기 Lv.5 → 점화의 라이터 부싯돌',
        ],
      ],
    ]);
  });

  it('uses_a_scroll_safe_compact_mobile_layout', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: new FakeDocument(),
    });

    const view = createCharacterSelectView();
    const root = view.element as unknown as FakeElement;
    const buttons = findByTag(root, 'button');

    expect(root.style.cssText).toContain('max-height:calc(100dvh - 24px)');
    expect(root.style.cssText).toContain('overflow:auto');
    expect(buttons[0].style.cssText).toContain('padding:12px');

    view.destroy();
  });
});

class FakeElement {
  readonly style = { cssText: '', borderColor: '' } as CSSStyleDeclaration;
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  value = '';
  maxLength = 0;
  textContent = '';
  type = '';
  parent: FakeElement | null = null;

  constructor(readonly tagName: string) {}

  append(...children: FakeElement[]): void {
    for (const child of children) this.appendChild(child);
  }

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
