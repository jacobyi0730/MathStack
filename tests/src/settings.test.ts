import { afterEach, describe, expect, it } from 'vitest';
import {
  ACCESSIBILITY_SETTINGS_STORAGE_KEY,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  SETTINGS_CLASS_NAMES,
  createSettingsView,
  effectiveEffectIntensity,
  prefersReducedMotion,
  readAccessibilitySettings,
  writeAccessibilitySettings,
  type AccessibilitySettings,
  type StorageLike,
} from '../../src/ui/settings.js';

class MemoryStorage implements StorageLike {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

class FakeElement {
  readonly style = { cssText: '' } as CSSStyleDeclaration;
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, () => void>();
  className = '';
  textContent = '';
  innerHTML = '';
  type = '';
  checked = false;
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

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(name: string, listener: () => void): void {
    this.listeners.set(name, listener);
  }

  click(): void {
    this.listeners.get('click')?.();
  }

  querySelector(selector: string): FakeElement | null {
    const className = selector.startsWith('.') ? selector.slice(1) : selector;
    return findByClass(this, className)[0] ?? null;
  }

  remove(): void {
    if (!this.parent) return;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) this.parent.children.splice(index, 1);
    this.parent = null;
  }
}

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName);
  }
}

const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
});

describe('accessibility settings', () => {
  it('settings_storage_round_trips_and_sanitizes_values', () => {
    const storage = new MemoryStorage();
    const settings: AccessibilitySettings = {
      slowMode: true,
      effectIntensity: 50,
      textSize: 'large',
      keyboardOnlyHints: false,
      soundVolume: 100,
    };

    writeAccessibilitySettings(storage, settings);
    expect(readAccessibilitySettings(storage)).toEqual(settings);

    storage.setItem(
      ACCESSIBILITY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        slowMode: 'yes',
        effectIntensity: 75,
        textSize: 'huge',
        keyboardOnlyHints: 1,
      }),
    );

    expect(readAccessibilitySettings(storage)).toEqual(DEFAULT_ACCESSIBILITY_SETTINGS);
  });

  it('settings_respects_prefers_reduced_motion_for_effects', () => {
    const reduce = {
      matchMedia: (query: string) => ({ matches: query.includes('prefers-reduced-motion') }),
    } as unknown as Pick<Window, 'matchMedia'>;
    const noReduce = {
      matchMedia: () => ({ matches: false }),
    } as unknown as Pick<Window, 'matchMedia'>;

    expect(prefersReducedMotion(reduce)).toBe(true);
    expect(effectiveEffectIntensity({ effectIntensity: 100 }, reduce)).toBe(0);
    expect(effectiveEffectIntensity({ effectIntensity: 50 }, noReduce)).toBe(50);
  });

  it('settings_dom_contract_exposes_touch_targets_focus_and_non_color_selection', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: new FakeDocument(),
    });

    const storage = new MemoryStorage();
    const changes: AccessibilitySettings[] = [];
    const view = createSettingsView({
      storage,
      initialSettings: { slowMode: true, effectIntensity: 0, textSize: 'large' },
      onChange(settings) {
        changes.push(settings);
      },
    });
    const root = view.element as unknown as FakeElement;
    const buttons = findByTag(root, 'button');
    const inputs = findByTag(root, 'input');

    expect(root.className).toBe(SETTINGS_CLASS_NAMES.root);
    expect(root.getAttribute('aria-label')).toBe('접근성 설정');
    expect(buttons.every((button) => button.style.cssText.includes('min-height:56px'))).toBe(
      true,
    );
    expect(buttons.every((button) => button.style.cssText.includes('outline-offset:4px'))).toBe(
      true,
    );
    expect(inputs.every((input) => input.style.cssText.includes('outline-offset:4px'))).toBe(true);
    expect(
      buttons.some(
        (button) =>
          button.dataset.value === '0' &&
          button.getAttribute('aria-pressed') === 'true' &&
          button.getAttribute('aria-label')?.includes('선택됨') === true,
      ),
    ).toBe(true);

    const normalText = buttons.find((button) => button.dataset.value === 'normal');
    normalText?.click();

    expect(view.getSettings().textSize).toBe('normal');
    expect(changes.at(-1)?.textSize).toBe('normal');
    expect(readAccessibilitySettings(storage).textSize).toBe('normal');

    view.destroy();
  });
});

function findByClass(root: FakeElement, className: string): FakeElement[] {
  const matches: FakeElement[] = [];
  visit(root, (element) => {
    if (element.className.split(' ').includes(className)) matches.push(element);
  });
  return matches;
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
