import { afterEach, describe, expect, it } from 'vitest';
import {
  createTitleFlow,
  readTitleSelection,
  TITLE_SELECTION_STORAGE_KEY,
  writeTitleSelection,
  type StorageLike,
  type TitleSelection,
} from '../../src/ui/title.js';

const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
});

class MemoryStorage implements StorageLike {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

describe('title flow storage', () => {
  it('restores_saved_selection', () => {
    const storage = new MemoryStorage();
    const selection: TitleSelection = {
      grade: 5,
      term: 'all',
      characterId: 'cerium',
      heroName: 'Nova',
    };
    writeTitleSelection(storage, selection);

    expect(readTitleSelection(storage)).toEqual(selection);
  });

  it('falls_back_when_storage_payload_is_invalid', () => {
    const storage = new MemoryStorage();
    storage.setItem(TITLE_SELECTION_STORAGE_KEY, '{bad json');

    expect(readTitleSelection(storage)).toMatchObject({
      grade: 3,
      term: 2,
      characterId: 'actinium',
    });
  });

  it('sanitizes_unknown_values', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      TITLE_SELECTION_STORAGE_KEY,
      JSON.stringify({
        grade: 2,
        term: 'winter',
        characterId: 'argon',
        heroName: '  ',
      }),
    );

    expect(readTitleSelection(storage)).toEqual({
      grade: 2,
      term: 2,
      characterId: 'actinium',
      heroName: '원소 용사',
    });
  });

  it('uses_a_scrollable_mobile_safe_title_flow', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: new FakeDocument(),
    });
    const storage = new MemoryStorage();

    const flow = createTitleFlow({ storage });
    const root = flow.element as unknown as FakeElement;
    const section = root.children[0];

    expect(root.style.cssText).toContain('height:100dvh');
    expect(root.style.cssText).toContain('overflow:auto');
    expect(root.style.cssText).toContain('place-items:start center');
    expect(section.style.cssText).toContain('max-height:calc(100dvh - 24px)');

    flow.destroy();
  });

  it('gives_the_settings_screen_a_scrolling_body_and_a_fixed_footer', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: new FakeDocument(),
    });
    const flow = createTitleFlow({ storage: new MemoryStorage() });
    const root = flow.element as unknown as FakeElement;
    const settingsButton = root.children[0].children.find(
      (child) => child.textContent === '설정',
    );
    settingsButton?.click();

    const section = root.children[0];
    // 목록만 흐르고 「돌아가기」는 바닥에 남는다. 둘 다 흐르면 나갈 길이 화면 밖으로 나간다
    expect(section.style.overflow).toBe('hidden');
    expect(section.style.gridTemplateRows).toBe('minmax(0,1fr) auto');
    // 설정만 항목이 많다. PC 에서 두 줄로 흘릴 수 있게 넓게 쓴다
    expect(section.style.width).toBe('min(960px,100%)');

    flow.destroy();
  });

  it('offers_a_settings_entry_point_from_the_title', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: new FakeDocument(),
    });
    const storage = new MemoryStorage();

    const flow = createTitleFlow({ storage });
    const section = (flow.element as unknown as FakeElement).children[0];
    const labels = section.children.map((child) => child.textContent);

    // 여기 말고는 소리와 효과 강도를 끌 방법이 없다. 교실에서 쓰려면 반드시 열려 있어야 한다
    expect(labels).toContain('설정');

    flow.destroy();
  });
});

class FakeElement {
  readonly style = { cssText: '', display: '', overflow: '', width: '', gridTemplateRows: '' } as CSSStyleDeclaration;
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly dataset: Record<string, string> = {};
  textContent = '';
  innerHTML = '';
  type = '';
  disabled = false;
  hidden = false;
  className = '';
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

  replaceChildren(...children: FakeElement[]): void {
    this.children.length = 0;
    for (const child of children) this.appendChild(child);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  /** 설정 뷰가 "선택됨" 배지를 찾을 때 쓴다. 이 테스트는 배지를 보지 않는다 */
  querySelector(): null {
    return null;
  }

  private readonly listeners = new Map<string, (() => void)[]>();

  addEventListener(type: string, handler: () => void): void {
    const bucket = this.listeners.get(type) ?? [];
    bucket.push(handler);
    this.listeners.set(type, bucket);
  }

  click(): void {
    for (const handler of this.listeners.get('click') ?? []) handler();
  }

  focus(): void {}

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
