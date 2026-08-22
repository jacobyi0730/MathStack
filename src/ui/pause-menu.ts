/**
 * 일시정지 메뉴 (05-세션-운영 §14.6).
 *
 * 전투 중에 열 수 있는 유일한 화면이다. 열리는 순간 **게임이 완전히 멈춘다** —
 * 문제 모달과 같은 규칙이다. 소리를 줄이려고 손을 뻗은 사이에 맞아 죽으면
 * 설정을 여는 것 자체가 벌이 된다.
 *
 * ### 왜 여기 항목이 넷뿐인가
 *
 * 전투 중에 여는 화면이다. 고를 것이 많으면 판단이 길어지고, 그 사이 게임은 멈춰 있다.
 * 자주 바꾸는 것(소리 둘, 타격감)과 나가는 길(계속·그만)만 둔다.
 * 글자 크기·천천히 풀기처럼 한 번 정하면 안 바꾸는 것은 타이틀의 설정 화면에 남긴다.
 *
 * ### 되돌릴 수 없는 것은 한 번 더 묻는다
 *
 * `그만하기` 는 판을 끝낸다. 실수로 눌렀을 때 10분이 날아가므로 확인을 한 번 받는다.
 */

import {
  isHitFeedbackOn,
  withHitFeedback,
  type AccessibilitySettings,
} from './settings.js';

export const PAUSE_MENU_CLASS_NAMES = {
  root: 'mathstack-pause',
  panel: 'mathstack-pause__panel',
  action: 'mathstack-pause__action',
  slider: 'mathstack-pause__slider',
  toggle: 'mathstack-pause__toggle',
  confirm: 'mathstack-pause__confirm',
} as const;

export interface PauseMenuHandlers {
  /** 계속하기 */
  readonly onResume: () => void;
  /** 그만하기 — 확인을 거친 뒤에만 불린다 */
  readonly onQuit: () => void;
  /** 슬라이더나 토글이 움직일 때마다. 저장은 호출한 쪽이 한다 */
  readonly onSettingsChange: (settings: AccessibilitySettings) => void;
}

export interface PauseMenu {
  readonly element: HTMLElement;
  readonly open: boolean;
  show(settings: AccessibilitySettings): void;
  hide(): void;
  destroy(): void;
}

interface PauseMenuElements {
  readonly root: HTMLElement;
  readonly panel: HTMLElement;
  readonly resume: HTMLButtonElement;
  readonly quit: HTMLButtonElement;
  readonly quitConfirm: HTMLElement;
  readonly quitYes: HTMLButtonElement;
  readonly quitNo: HTMLButtonElement;
  readonly bgm: HTMLInputElement;
  readonly bgmValue: HTMLElement;
  readonly sfx: HTMLInputElement;
  readonly sfxValue: HTMLElement;
  readonly hitFeedback: HTMLButtonElement;
}

const VOLUME_STEP = 5;

export function createPauseMenu(
  parent: HTMLElement = document.body,
  handlers: PauseMenuHandlers,
): PauseMenu {
  const doc = parent.ownerDocument;
  const elements = createElements(doc);
  parent.appendChild(elements.root);

  let current: AccessibilitySettings | null = null;
  let open = false;

  function apply(next: AccessibilitySettings): void {
    current = next;
    render(elements, next);
    handlers.onSettingsChange(next);
  }

  /**
   * 확인 블록을 접는다.
   *
   * `hidden` 만으로는 안 사라진다 — 인라인 `display:grid` 가 브라우저 기본
   * `[hidden] { display: none }` 을 이긴다. 둘 다 손대야 한다.
   */
  function closeConfirm(): void {
    elements.quitConfirm.hidden = true;
    elements.quitConfirm.style.display = 'none';
    elements.quit.hidden = false;
  }

  function openConfirm(): void {
    elements.quit.hidden = true;
    elements.quitConfirm.hidden = false;
    elements.quitConfirm.style.display = 'grid';
    // 짧은 화면에서는 확인 블록이 접힌 곳 아래에 생긴다. 안 보이면 물어본 게 아니다
    elements.panel.scrollTop = elements.panel.scrollHeight;
  }

  elements.resume.addEventListener('click', () => {
    handlers.onResume();
  });

  elements.quit.addEventListener('click', () => {
    openConfirm();
    elements.quitYes.focus();
  });

  elements.quitNo.addEventListener('click', closeConfirm);
  elements.quitYes.addEventListener('click', () => {
    closeConfirm();
    handlers.onQuit();
  });

  elements.bgm.addEventListener('input', () => {
    if (current === null) return;
    apply({ ...current, bgmVolume: Number(elements.bgm.value) });
  });

  elements.sfx.addEventListener('input', () => {
    if (current === null) return;
    apply({ ...current, sfxVolume: Number(elements.sfx.value) });
  });

  elements.hitFeedback.addEventListener('click', () => {
    if (current === null) return;
    apply(withHitFeedback(current, !isHitFeedbackOn(current)));
  });

  return {
    element: elements.root,

    get open(): boolean {
      return open;
    },

    show(settings: AccessibilitySettings): void {
      current = settings;
      render(elements, settings);
      closeConfirm();
      elements.root.hidden = false;
      elements.root.style.display = 'grid';
      open = true;
      elements.resume.focus();
    },

    hide(): void {
      elements.root.hidden = true;
      elements.root.style.display = 'none';
      closeConfirm();
      open = false;
    },

    destroy(): void {
      elements.root.remove();
      open = false;
    },
  };
}

function createElements(doc: Document): PauseMenuElements {
  const root = doc.createElement('section');
  root.className = PAUSE_MENU_CLASS_NAMES.root;
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', '일시정지');
  root.style.cssText = rootStyle();

  const panel = doc.createElement('div');
  panel.className = PAUSE_MENU_CLASS_NAMES.panel;
  panel.style.cssText = panelStyle();
  root.appendChild(panel);

  const title = doc.createElement('h1');
  title.textContent = '일시정지';
  title.style.cssText = 'margin:0;font-size:32px;color:#ffffff;';
  panel.appendChild(title);

  const hint = doc.createElement('p');
  hint.textContent = '게임이 멈춰 있습니다. 천천히 골라도 됩니다.';
  hint.style.cssText = 'margin:0;color:#dbe4ff;font-size:16px;';
  panel.appendChild(hint);

  const bgm = appendSlider(doc, panel, '배경음', '0 이면 음악을 내려받지 않습니다');
  const sfx = appendSlider(doc, panel, '효과음', '타격·처치·문제 결과 소리');

  const hitFeedback = doc.createElement('button');
  hitFeedback.type = 'button';
  hitFeedback.className = PAUSE_MENU_CLASS_NAMES.toggle;
  hitFeedback.setAttribute('role', 'switch');
  hitFeedback.style.cssText = toggleStyle(true);
  panel.appendChild(hitFeedback);

  const resume = doc.createElement('button');
  resume.type = 'button';
  resume.className = PAUSE_MENU_CLASS_NAMES.action;
  resume.textContent = '계속하기';
  resume.style.cssText = primaryStyle();
  panel.appendChild(resume);

  const quit = doc.createElement('button');
  quit.type = 'button';
  quit.className = PAUSE_MENU_CLASS_NAMES.action;
  quit.textContent = '그만하기';
  quit.style.cssText = dangerStyle();
  panel.appendChild(quit);

  const quitConfirm = doc.createElement('div');
  quitConfirm.className = PAUSE_MENU_CLASS_NAMES.confirm;
  quitConfirm.hidden = true;
  quitConfirm.style.cssText = confirmStyle();
  quitConfirm.style.display = 'none';

  const confirmText = doc.createElement('p');
  confirmText.textContent = '정말 그만할까요? 지금까지의 점수는 기록됩니다.';
  confirmText.style.cssText = 'margin:0;color:#ffe082;font-size:16px;';
  quitConfirm.appendChild(confirmText);

  const quitYes = doc.createElement('button');
  quitYes.type = 'button';
  quitYes.textContent = '네, 그만할래요';
  quitYes.style.cssText = dangerStyle();
  quitConfirm.appendChild(quitYes);

  const quitNo = doc.createElement('button');
  quitNo.type = 'button';
  quitNo.textContent = '아니요';
  quitNo.style.cssText = secondaryStyle();
  quitConfirm.appendChild(quitNo);

  panel.appendChild(quitConfirm);

  return {
    root,
    panel,
    resume,
    quit,
    quitConfirm,
    quitYes,
    quitNo,
    bgm: bgm.input,
    bgmValue: bgm.value,
    sfx: sfx.input,
    sfxValue: sfx.value,
    hitFeedback,
  };
}

function appendSlider(
  doc: Document,
  panel: HTMLElement,
  label: string,
  detail: string,
): { input: HTMLInputElement; value: HTMLElement } {
  const group = doc.createElement('section');
  group.className = PAUSE_MENU_CLASS_NAMES.slider;
  group.style.cssText = 'display:grid;gap:6px;';

  const header = doc.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:12px;';

  const title = doc.createElement('h2');
  title.textContent = label;
  title.style.cssText = 'margin:0;font-size:18px;color:#ffffff;';

  const value = doc.createElement('output');
  value.style.cssText =
    'font-size:18px;font-weight:700;color:#ffc107;min-width:56px;text-align:right;';

  header.append(title, value);
  group.appendChild(header);

  const input = doc.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.step = String(VOLUME_STEP);
  input.setAttribute('aria-label', label);
  // 터치 타깃 44px 이상 (05-세션-운영 §14.4)
  input.style.cssText =
    'width:100%;height:44px;accent-color:#ffc107;cursor:pointer;outline:2px solid transparent;outline-offset:4px;';
  group.appendChild(input);

  const hint = doc.createElement('span');
  hint.textContent = detail;
  hint.style.cssText = 'color:#94a3b8;font-size:13px;';
  group.appendChild(hint);

  panel.appendChild(group);
  return { input, value };
}

function render(elements: PauseMenuElements, settings: AccessibilitySettings): void {
  elements.bgm.value = String(settings.bgmVolume);
  elements.bgmValue.textContent = settings.bgmVolume === 0 ? '끄기' : `${settings.bgmVolume}%`;
  elements.sfx.value = String(settings.sfxVolume);
  elements.sfxValue.textContent = settings.sfxVolume === 0 ? '끄기' : `${settings.sfxVolume}%`;

  const on = isHitFeedbackOn(settings);
  elements.hitFeedback.setAttribute('aria-checked', on ? 'true' : 'false');
  // 색만으로 알리지 않는다 (§14.4). 켬/끔을 글자로도 쓴다
  elements.hitFeedback.textContent = on ? '타격감 효과 · 켬' : '타격감 효과 · 끔';
  elements.hitFeedback.style.cssText = toggleStyle(on);
}

function rootStyle(): string {
  return [
    'position:fixed',
    'inset:0',
    'z-index:60',
    'display:none',
    'place-items:center',
    'padding:16px',
    'box-sizing:border-box',
    'background:rgba(10, 14, 26, 0.82)',
    'backdrop-filter:blur(3px)',
    'font-family:system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  ].join(';');
}

function panelStyle(): string {
  return [
    'display:grid',
    'gap:14px',
    'width:min(420px, 100%)',
    // 세로 모바일에서 잘리지 않게 패널 안에서 스크롤한다 (§14.3)
    'max-height:calc(100dvh - 32px)',
    'overflow:auto',
    'overscroll-behavior:contain',
    'box-sizing:border-box',
    'padding:22px',
    'border-radius:18px',
    'background:#1f2937',
    'box-shadow:0 24px 60px rgba(0,0,0,0.5)',
  ].join(';');
}

function primaryStyle(): string {
  return buttonStyle('#ffc107', '#1a1a2e');
}

function dangerStyle(): string {
  return buttonStyle('#ef4444', '#ffffff');
}

function secondaryStyle(): string {
  return buttonStyle('#334155', '#f8fafc');
}

function toggleStyle(on: boolean): string {
  return buttonStyle(on ? '#22c55e' : '#475569', on ? '#052e16' : '#e2e8f0');
}

function buttonStyle(background: string, color: string): string {
  return [
    'width:100%',
    'min-height:56px',
    'padding:14px 18px',
    'border:none',
    'border-radius:12px',
    `background:${background}`,
    `color:${color}`,
    'font-size:18px',
    'font-weight:700',
    'cursor:pointer',
  ].join(';');
}

function confirmStyle(): string {
  return [
    'display:grid',
    'gap:10px',
    'padding:14px',
    'border-radius:12px',
    'background:rgba(239, 68, 68, 0.12)',
    'border:1px solid rgba(239, 68, 68, 0.5)',
  ].join(';');
}
