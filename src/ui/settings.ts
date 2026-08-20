export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type EffectIntensity = 0 | 50 | 100;
export type AccessibilityTextSize = 'normal' | 'large';

export interface AccessibilitySettings {
  readonly slowMode: boolean;
  readonly effectIntensity: EffectIntensity;
  readonly textSize: AccessibilityTextSize;
  readonly keyboardOnlyHints: boolean;
}

export interface SettingsViewOptions {
  readonly initialSettings?: Partial<AccessibilitySettings>;
  readonly storage?: StorageLike;
  readonly onChange?: (settings: AccessibilitySettings) => void;
}

export interface SettingsView {
  readonly element: HTMLElement;
  getSettings(): AccessibilitySettings;
  setSettings(settings: Partial<AccessibilitySettings>): void;
  save(): void;
  destroy(): void;
}

interface SettingsElements {
  readonly root: HTMLElement;
  readonly slowMode: HTMLInputElement;
  readonly effectButtons: readonly HTMLButtonElement[];
  readonly textSizeButtons: readonly HTMLButtonElement[];
  readonly keyboardOnlyHints: HTMLInputElement;
  readonly status: HTMLElement;
}

export const ACCESSIBILITY_SETTINGS_STORAGE_KEY = 'mathstack.accessibilitySettings.v1';

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = Object.freeze({
  slowMode: false,
  effectIntensity: 100,
  textSize: 'normal',
  keyboardOnlyHints: true,
});

export const SETTINGS_CLASS_NAMES = {
  root: 'mathstack-settings',
  option: 'mathstack-settings__option',
  segment: 'mathstack-settings__segment',
  selectedText: 'mathstack-settings__selected-text',
  focusable: 'mathstack-settings__focusable',
} as const;

const EFFECT_OPTIONS = [0, 50, 100] as const;
const TEXT_SIZE_OPTIONS = ['normal', 'large'] as const;

export function readAccessibilitySettings(
  storage: StorageLike | undefined,
): AccessibilitySettings {
  if (!storage) return DEFAULT_ACCESSIBILITY_SETTINGS;
  const raw = storage.getItem(ACCESSIBILITY_SETTINGS_STORAGE_KEY);
  if (!raw) return DEFAULT_ACCESSIBILITY_SETTINGS;

  try {
    return normalizeAccessibilitySettings(JSON.parse(raw) as Partial<AccessibilitySettings>);
  } catch {
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }
}

export function writeAccessibilitySettings(
  storage: StorageLike | undefined,
  settings: AccessibilitySettings,
): void {
  if (!storage) return;
  storage.setItem(ACCESSIBILITY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function normalizeAccessibilitySettings(
  settings: Partial<AccessibilitySettings>,
): AccessibilitySettings {
  return {
    slowMode:
      typeof settings.slowMode === 'boolean'
        ? settings.slowMode
        : DEFAULT_ACCESSIBILITY_SETTINGS.slowMode,
    effectIntensity: isEffectIntensity(settings.effectIntensity)
      ? settings.effectIntensity
      : DEFAULT_ACCESSIBILITY_SETTINGS.effectIntensity,
    textSize: isTextSize(settings.textSize)
      ? settings.textSize
      : DEFAULT_ACCESSIBILITY_SETTINGS.textSize,
    keyboardOnlyHints:
      typeof settings.keyboardOnlyHints === 'boolean'
        ? settings.keyboardOnlyHints
        : DEFAULT_ACCESSIBILITY_SETTINGS.keyboardOnlyHints,
  };
}

export function prefersReducedMotion(
  win: Pick<Window, 'matchMedia'> | undefined = getWindow(),
): boolean {
  return win?.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
}

export function effectiveEffectIntensity(
  settings: Pick<AccessibilitySettings, 'effectIntensity'>,
  win: Pick<Window, 'matchMedia'> | undefined = getWindow(),
): EffectIntensity {
  return prefersReducedMotion(win) ? 0 : settings.effectIntensity;
}

export function createSettingsView(options: SettingsViewOptions = {}): SettingsView {
  const storage = options.storage ?? getWindow()?.localStorage;
  let current = normalizeAccessibilitySettings({
    ...readAccessibilitySettings(storage),
    ...options.initialSettings,
  });
  const elements = createElements();

  const update = (next: Partial<AccessibilitySettings>): void => {
    current = normalizeAccessibilitySettings({ ...current, ...next });
    render(elements, current);
    writeAccessibilitySettings(storage, current);
    options.onChange?.(current);
  };

  elements.slowMode.addEventListener('change', () => {
    update({ slowMode: elements.slowMode.checked });
  });
  elements.keyboardOnlyHints.addEventListener('change', () => {
    update({ keyboardOnlyHints: elements.keyboardOnlyHints.checked });
  });

  for (const button of elements.effectButtons) {
    button.addEventListener('click', () => {
      const value = Number(button.dataset.value);
      if (isEffectIntensity(value)) update({ effectIntensity: value });
    });
  }

  for (const button of elements.textSizeButtons) {
    button.addEventListener('click', () => {
      const value = button.dataset.value;
      if (isTextSize(value)) update({ textSize: value });
    });
  }

  render(elements, current);

  return {
    element: elements.root,

    getSettings(): AccessibilitySettings {
      return current;
    },

    setSettings(settings: Partial<AccessibilitySettings>): void {
      update(settings);
    },

    save(): void {
      writeAccessibilitySettings(storage, current);
      elements.status.textContent = '설정 저장됨';
    },

    destroy(): void {
      elements.root.remove();
    },
  };
}

function createElements(): SettingsElements {
  const root = document.createElement('section');
  root.className = SETTINGS_CLASS_NAMES.root;
  root.setAttribute('aria-label', '접근성 설정');
  root.style.cssText = screenStyle();

  const title = document.createElement('h1');
  title.textContent = '설정';
  title.style.cssText = 'margin:0;font-size:28px;color:#ffffff;';
  root.appendChild(title);

  const slowMode = appendCheckbox(
    root,
    '천천히 풀기',
    '문제 제한 시간을 숨기고 같은 보상을 유지합니다.',
  );

  const effectButtons = appendSegmentedControl(root, '효과 강도', [
    { value: '0', label: '0%', detail: '흔들림과 섬광 끄기' },
    { value: '50', label: '50%', detail: '효과 줄이기' },
    { value: '100', label: '100%', detail: '기본 효과' },
  ]);

  const textSizeButtons = appendSegmentedControl(root, '글자 크기', [
    { value: 'normal', label: '보통', detail: '문제 본문 24px' },
    { value: 'large', label: '크게', detail: '문제 본문 32px' },
  ]);

  const keyboardOnlyHints = appendCheckbox(
    root,
    '키보드 전용 조작 표시',
    '선택지 1-4, 확인 Enter 힌트를 표시합니다.',
  );

  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.style.cssText = 'min-height:24px;margin:0;color:#f8fafc;font-size:15px;';
  root.appendChild(status);

  return {
    root,
    slowMode,
    effectButtons,
    textSizeButtons,
    keyboardOnlyHints,
    status,
  };
}

function appendCheckbox(root: HTMLElement, label: string, detail: string): HTMLInputElement {
  const wrap = document.createElement('label');
  wrap.className = SETTINGS_CLASS_NAMES.option;
  wrap.style.cssText = optionStyle();

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = SETTINGS_CLASS_NAMES.focusable;
  input.style.cssText = checkboxStyle();

  const text = document.createElement('span');
  text.innerHTML = `<strong>${label}</strong><span>${detail}</span>`;
  text.style.cssText = 'display:grid;gap:4px;';

  wrap.append(input, text);
  root.appendChild(wrap);
  return input;
}

function appendSegmentedControl(
  root: HTMLElement,
  label: string,
  options: readonly { readonly value: string; readonly label: string; readonly detail: string }[],
): HTMLButtonElement[] {
  const group = document.createElement('section');
  group.className = SETTINGS_CLASS_NAMES.option;
  group.style.cssText = optionStyle();

  const title = document.createElement('h2');
  title.textContent = label;
  title.style.cssText = 'margin:0;font-size:18px;color:#ffffff;';
  group.appendChild(title);

  const buttonsWrap = document.createElement('div');
  buttonsWrap.className = SETTINGS_CLASS_NAMES.segment;
  buttonsWrap.setAttribute('role', 'group');
  buttonsWrap.setAttribute('aria-label', label);
  buttonsWrap.style.cssText =
    'display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px;';
  group.appendChild(buttonsWrap);

  const buttons = options.map((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.value = option.value;
    button.dataset.label = option.label;
    button.className = SETTINGS_CLASS_NAMES.focusable;
    button.style.cssText = segmentButtonStyle(false);
    button.innerHTML = [
      `<strong>${option.label}</strong>`,
      `<span>${option.detail}</span>`,
      `<span class="${SETTINGS_CLASS_NAMES.selectedText}"></span>`,
    ].join('');
    buttonsWrap.appendChild(button);
    return button;
  });

  root.appendChild(group);
  return buttons;
}

function render(elements: SettingsElements, settings: AccessibilitySettings): void {
  elements.slowMode.checked = settings.slowMode;
  elements.keyboardOnlyHints.checked = settings.keyboardOnlyHints;
  renderButtons(elements.effectButtons, `${settings.effectIntensity}`);
  renderButtons(elements.textSizeButtons, settings.textSize);
  elements.status.textContent = '설정이 적용되었습니다.';
}

function renderButtons(buttons: readonly HTMLButtonElement[], selectedValue: string): void {
  for (const button of buttons) {
    const selected = button.dataset.value === selectedValue;
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    button.setAttribute(
      'aria-label',
      `${button.dataset.label ?? ''} ${selected ? '선택됨' : '선택 안 됨'}`,
    );
    button.style.cssText = segmentButtonStyle(selected);
    const selectedText = button.querySelector<HTMLElement>(`.${SETTINGS_CLASS_NAMES.selectedText}`);
    if (selectedText) selectedText.textContent = selected ? '선택됨' : '';
  }
}

function isEffectIntensity(value: unknown): value is EffectIntensity {
  return EFFECT_OPTIONS.includes(value as EffectIntensity);
}

function isTextSize(value: unknown): value is AccessibilityTextSize {
  return TEXT_SIZE_OPTIONS.includes(value as AccessibilityTextSize);
}

function getWindow(): (Window & typeof globalThis) | undefined {
  return typeof window === 'undefined' ? undefined : window;
}

function screenStyle(): string {
  return [
    'display:grid',
    'gap:18px',
    'max-width:760px',
    'margin:0 auto',
    'padding:28px',
    'color:#ffffff',
    'background:#151827',
    'border:1px solid #2d334a',
    'border-radius:8px',
  ].join(';');
}

function optionStyle(): string {
  return [
    'display:grid',
    'gap:10px',
    'min-height:56px',
    'padding:14px',
    'box-sizing:border-box',
    'border:1px solid #3c435f',
    'border-radius:8px',
    'background:#1d2234',
    'color:#ffffff',
  ].join(';');
}

function checkboxStyle(): string {
  return [
    'width:24px',
    'height:24px',
    'accent-color:#ffc107',
    'outline:2px solid transparent',
    'outline-offset:4px',
  ].join(';');
}

function segmentButtonStyle(selected: boolean): string {
  const border = selected ? '#ffc107' : '#65708f';
  const background = selected ? '#273047' : '#101522';
  return [
    'min-height:56px',
    'padding:12px',
    'display:grid',
    'gap:4px',
    'text-align:left',
    `border:2px solid ${border}`,
    'border-radius:8px',
    `background:${background}`,
    'color:#ffffff',
    'cursor:pointer',
    'outline:2px solid transparent',
    'outline-offset:4px',
  ].join(';');
}
