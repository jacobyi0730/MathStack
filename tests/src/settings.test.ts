import { afterEach, describe, expect, it } from 'vitest';
import {
  ACCESSIBILITY_SETTINGS_STORAGE_KEY,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  SETTINGS_CLASS_NAMES,
  createSettingsView,
  effectiveEffectIntensity,
  isHitFeedbackOn,
  normalizeAccessibilitySettings,
  prefersReducedMotion,
  readAccessibilitySettings,
  resolveBgmVolume,
  resolveSfxVolume,
  withHitFeedback,
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
      sfxVolume: 100,
      bgmVolume: 20,
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

  it('settings_migrates_the_legacy_three_step_sound_volume', () => {
    const storage = new MemoryStorage();
    // BGM 이 들어오기 전 저장본. 소리를 껐던 교실이 갑자기 시끄러워지면 안 된다
    storage.setItem(
      ACCESSIBILITY_SETTINGS_STORAGE_KEY,
      JSON.stringify({ slowMode: false, effectIntensity: 100, soundVolume: 0 }),
    );

    const restored = readAccessibilitySettings(storage);
    expect(restored.sfxVolume).toBe(0);
    expect(restored.bgmVolume).toBe(DEFAULT_ACCESSIBILITY_SETTINGS.bgmVolume);
  });

  it('settings_clamps_and_snaps_volume_to_the_slider_step', () => {
    expect(normalizeAccessibilitySettings({ sfxVolume: 999 }).sfxVolume).toBe(100);
    expect(normalizeAccessibilitySettings({ sfxVolume: -20 }).sfxVolume).toBe(0);
    expect(normalizeAccessibilitySettings({ bgmVolume: 42 }).bgmVolume).toBe(40);
    expect(normalizeAccessibilitySettings({ bgmVolume: Number.NaN }).bgmVolume).toBe(
      DEFAULT_ACCESSIBILITY_SETTINGS.bgmVolume,
    );
  });

  it('settings_maps_the_hit_feedback_toggle_onto_effect_intensity', () => {
    const on = normalizeAccessibilitySettings({ effectIntensity: 50 });
    expect(isHitFeedbackOn(on)).toBe(true);

    const off = withHitFeedback(on, false);
    expect(off.effectIntensity).toBe(0);
    expect(isHitFeedbackOn(off)).toBe(false);

    // 껐다 켜면 100 으로 돌아온다. 50 을 골라 뒀던 사람은 설정 화면에서 다시 고른다
    expect(withHitFeedback(off, true).effectIntensity).toBe(100);
  });

  it('settings_converts_volume_to_a_zero_to_one_gain', () => {
    expect(resolveSfxVolume({ sfxVolume: 0 })).toBe(0);
    expect(resolveSfxVolume({ sfxVolume: 50 })).toBe(0.5);
    expect(resolveBgmVolume({ bgmVolume: 35 })).toBeCloseTo(0.35, 6);
  });

  it('settings_never_lets_grid_rows_shrink_below_their_content', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: new FakeDocument(),
    });
    const view = createSettingsView({ storage: new MemoryStorage() });
    const css = (view.element as unknown as FakeElement).style.cssText;

    // 높이가 확정된 그리드에서 암시적 auto 행은 남은 공간을 균등 분배받는다.
    // 내용이 넘치면 분배량이 음수가 되어 카드끼리 겹친다 — 실측으로 확인한 회귀다
    expect(css).toContain('grid-auto-rows:max-content');
    expect(css).toContain('align-content:start');
    // 300px 를 그대로 쓰면 360px 폰에서 칸이 컨테이너를 넘어 가로 스크롤바가 생긴다
    expect(css).toContain('minmax(min(100%,300px),1fr)');

    view.destroy();
  });

  it('settings_drops_its_own_card_and_scroll_when_embedded', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: new FakeDocument(),
    });
    const storage = new MemoryStorage();

    const standalone = createSettingsView({ storage });
    const embedded = createSettingsView({ storage, embedded: true });
    const standaloneCss = (standalone.element as unknown as FakeElement).style.cssText;
    const embeddedCss = (embedded.element as unknown as FakeElement).style.cssText;

    // 바깥이 이미 카드다. 테두리를 겹쳐 그리면 상자 안의 상자가 된다
    expect(standaloneCss).toContain('border:1px solid');
    expect(embeddedCss).not.toContain('border:1px solid');
    // 스크롤은 목록이 가져간다. 바깥에 맡기면 「돌아가기」까지 같이 흘러 나간다
    expect(embeddedCss).toContain('overflow:auto');
    expect(embeddedCss).toContain('min-height:0');
    expect(embeddedCss).not.toContain('max-height:calc(100dvh - 24px)');

    standalone.destroy();
    embedded.destroy();
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
