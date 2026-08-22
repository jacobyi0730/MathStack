export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type EffectIntensity = 0 | 50 | 100;
export type AccessibilityTextSize = 'normal' | 'large';

export interface AccessibilitySettings {
  readonly slowMode: boolean;
  /**
   * 타격감 강도.
   *
   * 화면 흔들림·히트스톱·비네트·백색 섬광을 함께 조절한다. 파편과 고리는 여기 안 걸린다 —
   * 그건 연출이 아니라 "저기서 뭔가 일어났다"는 정보다 (37-사운드-피드백 §6).
   *
   * 일시정지 메뉴의 **타격감 효과 on/off** 도 이 값을 쓴다. 두 벌로 두면 조용히 어긋난다.
   */
  readonly effectIntensity: EffectIntensity;
  readonly textSize: AccessibilityTextSize;
  readonly keyboardOnlyHints: boolean;
  /**
   * 효과음 크기(0~100).
   *
   * 기본값을 50 으로 둔 것은 **교실을 염두에 둔 타협**이다 (01-기반 §18 #4).
   * 0 을 기본으로 하면 소리가 없는 게임으로 보이고, 100 은 여러 대가 같이 켜졌을 때 시끄럽다.
   */
  readonly sfxVolume: number;
  /**
   * 배경음 크기(0~100).
   *
   * 효과음보다 **낮게** 시작한다. 배경음이 타격음을 덮으면 피드백이 먼저 죽는다.
   * 0 이면 트랙을 아예 내려받지 않는다 — 안 들을 음악에 2MB 를 쓰지 않는다.
   */
  readonly bgmVolume: number;
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
  readonly sfxVolume: HTMLInputElement;
  readonly sfxVolumeValue: HTMLElement;
  readonly bgmVolume: HTMLInputElement;
  readonly bgmVolumeValue: HTMLElement;
  readonly keyboardOnlyHints: HTMLInputElement;
  readonly status: HTMLElement;
}

export const ACCESSIBILITY_SETTINGS_STORAGE_KEY = 'mathstack.accessibilitySettings.v1';

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = Object.freeze({
  slowMode: false,
  effectIntensity: 100,
  textSize: 'normal',
  keyboardOnlyHints: true,
  sfxVolume: 50,
  bgmVolume: 35,
});

export const SETTINGS_CLASS_NAMES = {
  root: 'mathstack-settings',
  option: 'mathstack-settings__option',
  segment: 'mathstack-settings__segment',
  selectedText: 'mathstack-settings__selected-text',
  sliderValue: 'mathstack-settings__slider-value',
  focusable: 'mathstack-settings__focusable',
} as const;

const EFFECT_OPTIONS = [0, 50, 100] as const;
const TEXT_SIZE_OPTIONS = ['normal', 'large'] as const;
/** 슬라이더가 움직이는 단위(%). 5 보다 잘게 쪼개도 귀로 구분되지 않는다 */
const VOLUME_STEP = 5;

export function readAccessibilitySettings(
  storage: StorageLike | undefined,
): AccessibilitySettings {
  if (!storage) return DEFAULT_ACCESSIBILITY_SETTINGS;
  const raw = storage.getItem(ACCESSIBILITY_SETTINGS_STORAGE_KEY);
  if (!raw) return DEFAULT_ACCESSIBILITY_SETTINGS;

  try {
    return normalizeAccessibilitySettings(JSON.parse(raw) as LegacyAccessibilitySettings);
  } catch {
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }
}

/**
 * 예전 저장본.
 *
 * `soundVolume` 은 3단(0/50/100) 효과음 설정이었다. BGM 이 들어오면서 이름을
 * `sfxVolume` 으로 바꿨으므로, 이미 저장된 값은 읽어서 옮겨 준다 —
 * 설정을 초기화시키면 소리를 껐던 교실이 다음 접속에 갑자기 소리가 난다.
 */
export type LegacyAccessibilitySettings = Partial<AccessibilitySettings> & {
  readonly soundVolume?: unknown;
};

export function writeAccessibilitySettings(
  storage: StorageLike | undefined,
  settings: AccessibilitySettings,
): void {
  if (!storage) return;
  storage.setItem(ACCESSIBILITY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function normalizeAccessibilitySettings(
  settings: LegacyAccessibilitySettings,
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
    sfxVolume: clampVolume(
      settings.sfxVolume ?? settings.soundVolume,
      DEFAULT_ACCESSIBILITY_SETTINGS.sfxVolume,
    ),
    bgmVolume: clampVolume(settings.bgmVolume, DEFAULT_ACCESSIBILITY_SETTINGS.bgmVolume),
  };
}

/** 0 ~ 1 의 마스터 볼륨. 재생기는 이 값만 안다 */
export function resolveSfxVolume(settings: Pick<AccessibilitySettings, 'sfxVolume'>): number {
  return settings.sfxVolume / 100;
}

export function resolveBgmVolume(settings: Pick<AccessibilitySettings, 'bgmVolume'>): number {
  return settings.bgmVolume / 100;
}

/**
 * 타격감 효과가 켜져 있는가.
 *
 * 일시정지 메뉴는 on/off 두 칸만 보여 준다. 전투 중에 세 단계를 고르게 하면
 * 판단이 길어지고, 그 사이 게임은 멈춰 있다. 50% 는 설정 화면에서 고른다.
 */
export function isHitFeedbackOn(settings: Pick<AccessibilitySettings, 'effectIntensity'>): boolean {
  return settings.effectIntensity > 0;
}

/** on 은 100 으로 되돌린다. 50 을 골라 뒀던 사람이 껐다 켜면 100 이 되는 건 감수한다 */
export function withHitFeedback(
  settings: AccessibilitySettings,
  on: boolean,
): AccessibilitySettings {
  return { ...settings, effectIntensity: on ? 100 : 0 };
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

  elements.sfxVolume.addEventListener('input', () => {
    update({ sfxVolume: Number(elements.sfxVolume.value) });
  });
  elements.bgmVolume.addEventListener('input', () => {
    update({ bgmVolume: Number(elements.bgmVolume.value) });
  });

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

  const sfx = appendSlider(root, '효과음 크기', '타격·처치·문제 결과 소리');
  const bgm = appendSlider(root, '배경음 크기', '0 이면 음악을 아예 내려받지 않습니다');

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
    sfxVolume: sfx.input,
    sfxVolumeValue: sfx.value,
    bgmVolume: bgm.input,
    bgmVolumeValue: bgm.value,
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

/**
 * 볼륨 슬라이더.
 *
 * 3단 버튼에서 슬라이더로 바꿨다 — "조금만 줄이고 싶다"가 3단에서는 표현되지 않는다.
 * 대신 `VOLUME_STEP` 만큼만 움직여 아이가 손을 떨어도 값이 튀지 않는다.
 */
function appendSlider(
  root: HTMLElement,
  label: string,
  detail: string,
): { input: HTMLInputElement; value: HTMLElement } {
  const group = document.createElement('section');
  group.className = SETTINGS_CLASS_NAMES.option;
  group.style.cssText = optionStyle();

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:12px;';

  const title = document.createElement('h2');
  title.textContent = label;
  title.style.cssText = 'margin:0;font-size:18px;color:#ffffff;';

  const value = document.createElement('output');
  value.className = SETTINGS_CLASS_NAMES.sliderValue;
  value.style.cssText = 'font-size:18px;font-weight:700;color:#ffc107;min-width:56px;text-align:right;';

  header.append(title, value);
  group.appendChild(header);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.step = String(VOLUME_STEP);
  input.className = SETTINGS_CLASS_NAMES.focusable;
  input.setAttribute('aria-label', label);
  // 터치 타깃 44px 이상 (05-세션-운영 §14.4)
  input.style.cssText =
    'width:100%;height:44px;accent-color:#ffc107;cursor:pointer;outline:2px solid transparent;outline-offset:4px;';
  group.appendChild(input);

  const hint = document.createElement('span');
  hint.textContent = detail;
  hint.style.cssText = 'color:#dbe4ff;font-size:14px;';
  group.appendChild(hint);

  root.appendChild(group);
  return { input, value };
}

function renderSlider(input: HTMLInputElement, value: HTMLElement, volume: number): void {
  input.value = String(volume);
  value.textContent = volume === 0 ? '끄기' : `${volume}%`;
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
  renderSlider(elements.sfxVolume, elements.sfxVolumeValue, settings.sfxVolume);
  renderSlider(elements.bgmVolume, elements.bgmVolumeValue, settings.bgmVolume);
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

function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value / VOLUME_STEP) * VOLUME_STEP;
  return rounded < 0 ? 0 : rounded > 100 ? 100 : rounded;
}

function getWindow(): (Window & typeof globalThis) | undefined {
  return typeof window === 'undefined' ? undefined : window;
}

function screenStyle(): string {
  return [
    'display:grid',
    'gap:12px',
    'max-width:760px',
    'width:100%',
    'max-height:calc(100dvh - 24px)',
    'overflow:auto',
    'margin:0 auto',
    'padding:18px',
    'box-sizing:border-box',
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
