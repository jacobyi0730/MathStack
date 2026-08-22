import { afterEach, describe, expect, it } from 'vitest';
import {
  createPauseMenu,
  PAUSE_MENU_CLASS_NAMES,
} from '../../src/ui/pause-menu.js';
import {
  DEFAULT_ACCESSIBILITY_SETTINGS,
  type AccessibilitySettings,
} from '../../src/ui/settings.js';

const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
});

interface Harness {
  readonly menu: ReturnType<typeof createPauseMenu>;
  readonly root: FakeElement;
  readonly resumed: number[];
  readonly quits: number[];
  readonly changes: AccessibilitySettings[];
}

function mount(settings: AccessibilitySettings = DEFAULT_ACCESSIBILITY_SETTINGS): Harness {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: new FakeDocument(),
  });

  const resumed: number[] = [];
  const quits: number[] = [];
  const changes: AccessibilitySettings[] = [];
  const body = new FakeElement('body');

  const menu = createPauseMenu(body as unknown as HTMLElement, {
    onResume: () => resumed.push(1),
    onQuit: () => quits.push(1),
    onSettingsChange: (next) => changes.push(next),
  });
  menu.show(settings);

  return { menu, root: menu.element as unknown as FakeElement, resumed, quits, changes };
}

function findByTag(root: FakeElement, tagName: string): FakeElement[] {
  const found: FakeElement[] = [];
  const visit = (node: FakeElement): void => {
    if (node.tagName === tagName) found.push(node);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return found;
}

function buttonByText(root: FakeElement, text: string): FakeElement {
  const match = findByTag(root, 'button').find((button) => button.textContent.includes(text));
  if (!match) throw new Error(`버튼을 찾을 수 없습니다: ${text}`);
  return match;
}

describe('pause menu', () => {
  it('opens_as_a_modal_dialog_with_the_four_documented_entries', () => {
    const { menu, root } = mount();

    expect(root.className).toBe(PAUSE_MENU_CLASS_NAMES.root);
    expect(root.getAttribute('role')).toBe('dialog');
    expect(root.getAttribute('aria-modal')).toBe('true');
    expect(menu.open).toBe(true);

    const labels = findByTag(root, 'button').map((button) => button.textContent);
    expect(labels.some((label) => label.includes('계속하기'))).toBe(true);
    expect(labels.some((label) => label.includes('그만하기'))).toBe(true);
    expect(labels.some((label) => label.includes('타격감 효과'))).toBe(true);

    const sliders = findByTag(root, 'input');
    expect(sliders).toHaveLength(2);
    expect(sliders.every((slider) => slider.type === 'range')).toBe(true);
  });

  it('keeps_every_control_within_the_touch_target_floor', () => {
    const { root } = mount();

    // 초등학생 손가락 기준. 05-세션-운영 §14.4
    for (const button of findByTag(root, 'button')) {
      expect(button.style.cssText).toContain('min-height:56px');
    }
    for (const slider of findByTag(root, 'input')) {
      expect(slider.style.cssText).toContain('height:44px');
    }
  });

  it('reports_volume_changes_without_saving_by_itself', () => {
    const { root, changes } = mount();
    const [bgm, sfx] = findByTag(root, 'input');

    bgm.value = '0';
    bgm.dispatch('input');
    sfx.value = '80';
    sfx.dispatch('input');

    expect(changes).toHaveLength(2);
    expect(changes[0]?.bgmVolume).toBe(0);
    expect(changes[1]?.sfxVolume).toBe(80);
    // 저장은 호출한 쪽 몫이다. 메뉴는 storage 를 모른다
    expect(changes[1]?.bgmVolume).toBe(0);
  });

  it('shows_the_volume_as_text_so_colour_is_not_the_only_signal', () => {
    const { root } = mount({ ...DEFAULT_ACCESSIBILITY_SETTINGS, bgmVolume: 0, sfxVolume: 60 });
    const outputs = findByTag(root, 'output').map((node) => node.textContent);

    expect(outputs).toContain('끄기');
    expect(outputs).toContain('60%');
  });

  it('toggles_hit_feedback_through_effect_intensity', () => {
    const { root, changes } = mount();
    const toggle = buttonByText(root, '타격감 효과');

    expect(toggle.getAttribute('aria-checked')).toBe('true');
    toggle.dispatch('click');

    expect(changes.at(-1)?.effectIntensity).toBe(0);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(toggle.textContent).toContain('끔');

    toggle.dispatch('click');
    expect(changes.at(-1)?.effectIntensity).toBe(100);
  });

  it('asks_once_before_ending_the_run', () => {
    const { root, quits } = mount();

    buttonByText(root, '그만하기').dispatch('click');
    // 확인을 거치기 전에는 판이 끝나지 않는다. 10분이 걸린 실수다
    expect(quits).toHaveLength(0);

    buttonByText(root, '아니요').dispatch('click');
    expect(quits).toHaveLength(0);

    buttonByText(root, '그만하기').dispatch('click');
    buttonByText(root, '네, 그만할래요').dispatch('click');
    expect(quits).toHaveLength(1);
  });

  it('scrolls_the_confirmation_into_view_on_short_screens', () => {
    const { root } = mount();
    const panel = findByTag(root, 'div').find(
      (node) => node.className === PAUSE_MENU_CLASS_NAMES.panel,
    );
    if (!panel) throw new Error('패널을 찾을 수 없습니다');
    panel.scrollHeight = 900;

    buttonByText(root, '그만하기').dispatch('click');

    // 확인 블록이 접힌 곳 아래에 생기면 물어본 게 아니다
    expect(panel.scrollTop).toBe(900);
  });

  it('forgets_a_half_finished_confirmation_when_reopened', () => {
    const { menu, root, quits } = mount();

    buttonByText(root, '그만하기').dispatch('click');
    menu.hide();
    expect(menu.open).toBe(false);

    menu.show(DEFAULT_ACCESSIBILITY_SETTINGS);
    const confirm = findByTag(root, 'div').find(
      (node) => node.className === PAUSE_MENU_CLASS_NAMES.confirm,
    );
    expect(confirm?.hidden).toBe(true);
    // `hidden` 만으로는 안 사라진다. 인라인 display 를 같이 꺼야 한다
    expect(confirm?.style.display).toBe('none');
    expect(quits).toHaveLength(0);
  });

  it('resumes_through_the_handler_rather_than_touching_the_loop', () => {
    const { root, resumed } = mount();

    buttonByText(root, '계속하기').dispatch('click');
    expect(resumed).toHaveLength(1);
  });
});

class FakeElement {
  readonly style = { cssText: '', display: '' } as CSSStyleDeclaration;
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, (() => void)[]>();
  textContent = '';
  className = '';
  type = '';
  value = '';
  min = '';
  max = '';
  step = '';
  hidden = false;
  scrollTop = 0;
  scrollHeight = 0;
  parent: FakeElement | null = null;

  constructor(readonly tagName: string) {}

  get ownerDocument(): FakeDocument {
    return sharedDocument;
  }

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

  addEventListener(type: string, handler: () => void): void {
    const bucket = this.listeners.get(type) ?? [];
    bucket.push(handler);
    this.listeners.set(type, bucket);
  }

  dispatch(type: string): void {
    for (const handler of this.listeners.get(type) ?? []) handler();
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

const sharedDocument = new FakeDocument();
