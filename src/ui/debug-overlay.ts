import { formatSnapshot, type Timer } from '../engine/timing.js';

/**
 * 계측 오버레이. DOM 은 `src/ui/` 에서만 만진다 (36-코딩컨벤션 §4).
 *
 * **매 프레임 갱신하지 않는다** (34-성능예산 §2.7).
 * 사람 눈에는 5Hz 면 충분하고, 계측이 프레임을 갉아먹으면 본말이 전도된다.
 */

/** 12프레임(60fps 기준 약 5Hz)마다 한 번 */
const UPDATE_EVERY = 12;

/**
 * 개발 중에는 기본으로 켜고, 배포본에서는 `?debug=1` 일 때만 켠다.
 * 아이가 보는 화면에 `frame 4.2ms sim 0.0` 이 떠 있으면 안 된다.
 */
export function debugEnabled(search: string = window.location.search): boolean {
  const params = new URLSearchParams(search);
  if (params.get('debug') === '0') return false;
  if (params.get('debug') === '1') return true;
  return import.meta.env.DEV;
}

export interface DebugOverlay {
  update(timer: Timer): void;
  setVisible(visible: boolean): void;
  toggle(): void;
  destroy(): void;
}

export function createDebugOverlay(
  parent: HTMLElement = document.body,
  initiallyVisible: boolean = debugEnabled(),
): DebugOverlay {
  const el = document.createElement('pre');
  el.className = 'debug-overlay';
  el.setAttribute('aria-hidden', 'true');
  el.style.display = initiallyVisible ? 'block' : 'none';
  parent.appendChild(el);

  let counter = 0;
  let visible = initiallyVisible;

  return {
    update(timer: Timer): void {
      counter += 1;
      if (counter < UPDATE_EVERY) return;
      counter = 0;
      if (!visible) return;
      el.textContent = formatSnapshot(timer.snapshot());
    },

    setVisible(next: boolean): void {
      visible = next;
      el.style.display = next ? 'block' : 'none';
    },

    toggle(): void {
      this.setVisible(!visible);
    },

    destroy(): void {
      el.remove();
    },
  };
}
