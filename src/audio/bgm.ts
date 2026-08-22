/**
 * 배경음 재생기.
 *
 * 효과음(`sfx.ts`)과 **완전히 다른 방식**으로 튼다.
 *
 * | | 효과음 | 배경음 |
 * | --- | --- | --- |
 * | 길이 | 0.1 ~ 2초 | 70 ~ 80초 |
 * | 재생 방식 | `AudioBuffer` 로 디코딩해 메모리에 상주 | `<audio>` 로 **스트리밍** |
 * | 언제 받나 | 타이틀 화면에서 전부 미리 | 그 트랙이 필요해진 순간에 하나만 |
 *
 * 이유는 메모리다. 80초 스테레오를 `decodeAudioData` 로 풀면 44.1kHz × 2채널 ×
 * 4바이트 = **28MB** 다. 네 트랙이면 100MB 를 넘는다. 교실 크롬북에서 감당할 수 없다.
 * `<audio loop>` 는 디스크에서 흘려보내므로 상주 비용이 거의 없다.
 *
 * **볼륨이 0 이면 아무것도 내려받지 않는다.** 안 들을 음악에 2MB 를 쓰지 않는다 —
 * 학교 네트워크에서는 이게 예의다.
 */

/** 트랙은 챕터와 보스전에 대응한다. 배경색이 바뀌는 지점(3분·6분)과 같은 경계다 */
export type BgmTrack = 'chapter1' | 'chapter2' | 'chapter3' | 'boss';

export const BGM_TRACKS: readonly BgmTrack[] = ['chapter1', 'chapter2', 'chapter3', 'boss'];

/** 트랙을 바꿀 때 겹치는 시간(초). 뚝 끊으면 챕터 전환이 사고처럼 들린다 */
export const BGM_FADE_SEC = 0.9;
const FADE_TICK_MS = 50;

export interface BgmPlayer {
  /** 첫 사용자 조작에서 호출한다. 브라우저가 자동 재생을 막기 때문이다 */
  unlock(): void;
  /** 같은 트랙이면 아무 일도 하지 않는다. 매 프레임 불러도 안전하다 */
  setTrack(track: BgmTrack | null): void;
  /** 0 ~ 1. 0 이면 재생을 멈추고 다음 트랙도 받지 않는다 */
  setVolume(volume: number): void;
  readonly volume: number;
  readonly track: BgmTrack | null;
  destroy(): void;
}

export interface BgmPlayerOptions {
  readonly volume?: number;
}

export function getBgmUrl(track: BgmTrack): string {
  return `/audio/bgm-${track}.m4a`;
}

/**
 * 지금 틀어야 할 트랙.
 *
 * **보스전이 최우선이다.** 보스가 떠 있는 동안 챕터 음악이 계속 흐르면
 * "판이 바뀌었다"가 소리로 전달되지 않는다.
 */
export function resolveBgmTrack(elapsedSec: number, bossActive: boolean): BgmTrack {
  if (bossActive) return 'boss';
  if (elapsedSec >= 360) return 'chapter3';
  if (elapsedSec >= 180) return 'chapter2';
  return 'chapter1';
}

export function createBgmPlayer(options: BgmPlayerOptions = {}): BgmPlayer {
  if (typeof document === 'undefined' || typeof Audio === 'undefined') {
    return createSilentBgmPlayer(options);
  }

  let volume = clamp01(options.volume ?? 0);
  let track: BgmTrack | null = null;
  let unlocked = false;
  let destroyed = false;

  let current: HTMLAudioElement | undefined;
  let previous: HTMLAudioElement | undefined;
  let fadeHandle = 0;

  function createElement(next: BgmTrack): HTMLAudioElement {
    const element = new Audio(getBgmUrl(next));
    element.loop = true;
    // 브라우저가 알아서 앞부분만 받고 흘려보낸다. 통째로 받으면 첫 재생이 늦다
    element.preload = 'auto';
    element.volume = 0;
    return element;
  }

  /** 이전 트랙을 서서히 지우고 새 트랙을 서서히 올린다 */
  function startFade(): void {
    if (fadeHandle !== 0) return;

    const stepPerTick = FADE_TICK_MS / 1000 / BGM_FADE_SEC;
    fadeHandle = window.setInterval(() => {
      let settled = true;

      if (previous !== undefined) {
        const next = previous.volume - stepPerTick;
        if (next <= 0) {
          previous.pause();
          previous.src = '';
          previous = undefined;
        } else {
          previous.volume = next;
          settled = false;
        }
      }

      if (current !== undefined) {
        const target = volume;
        const diff = target - current.volume;
        if (Math.abs(diff) <= stepPerTick) {
          current.volume = target;
        } else {
          current.volume = clamp01(current.volume + Math.sign(diff) * stepPerTick);
          settled = false;
        }
      }

      if (!settled) return;
      window.clearInterval(fadeHandle);
      fadeHandle = 0;
    }, FADE_TICK_MS);
  }

  function stopCurrent(): void {
    if (current === undefined) return;
    current.pause();
    current.src = '';
    current = undefined;
  }

  function play(): void {
    if (current === undefined || !unlocked || volume <= 0) return;
    // 자동 재생이 막히면 조용히 실패한다. 게임은 그대로 돌아가야 한다
    void current.play().catch(() => undefined);
  }

  function applyTrack(): void {
    if (destroyed) return;

    if (track === null || volume <= 0) {
      stopCurrent();
      return;
    }

    if (current !== undefined && current.dataset.track === track) {
      play();
      return;
    }

    if (current !== undefined) {
      previous?.pause();
      previous = current;
    }

    current = createElement(track);
    current.dataset.track = track;
    play();
    startFade();
  }

  return {
    unlock(): void {
      if (destroyed || unlocked) return;
      unlocked = true;
      applyTrack();
    },

    setTrack(next: BgmTrack | null): void {
      if (destroyed || next === track) return;
      track = next;
      applyTrack();
    },

    setVolume(next: number): void {
      if (destroyed) return;
      const previousVolume = volume;
      volume = clamp01(next);
      if (volume <= 0) {
        stopCurrent();
        return;
      }
      // 0 에서 올라온 순간에는 아직 요소가 없다. 여기서 처음 내려받는다
      if (previousVolume <= 0) applyTrack();
      else startFade();
    },

    get volume(): number {
      return volume;
    },
    get track(): BgmTrack | null {
      return track;
    },

    destroy(): void {
      destroyed = true;
      if (fadeHandle !== 0) {
        window.clearInterval(fadeHandle);
        fadeHandle = 0;
      }
      previous?.pause();
      previous = undefined;
      stopCurrent();
    },
  };
}

/** 브라우저가 아닌 곳(테스트·SSR)에서도 호출부가 분기하지 않게 한다 */
function createSilentBgmPlayer(options: BgmPlayerOptions): BgmPlayer {
  let volume = clamp01(options.volume ?? 0);
  let track: BgmTrack | null = null;
  return {
    unlock(): void {},
    setTrack(next: BgmTrack | null): void {
      track = next;
    },
    setVolume(next: number): void {
      volume = clamp01(next);
    },
    get volume(): number {
      return volume;
    },
    get track(): BgmTrack | null {
      return track;
    },
    destroy(): void {},
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
