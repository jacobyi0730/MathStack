import type { GameState } from './state.js';

/**
 * 고정 타임스텝 루프 (34-성능예산 §2.1).
 *
 * 시뮬레이션은 1/60초 고정, 렌더는 매 프레임. 이 분리가 없으면
 * 모니터 주사율에 따라 게임 속도가 달라진다.
 *
 * 루프 안에서 객체를 만들지 않는다. 여기서 새는 할당은 초당 60번 샌다.
 */

/** 시뮬레이션 1스텝 = 1/60초 */
export const FIXED_DT = 1 / 60;

/** 프레임 델타 상한. 탭 복귀 시 한 번에 몰아치는 것을 막는다 */
export const MAX_FRAME_DELTA = 0.25;

/** 한 프레임에 돌릴 수 있는 최대 스텝. 넘으면 밀린 시간을 버린다 */
export const MAX_STEPS_PER_FRAME = 5;

export interface LoopCallbacks {
  /** dt 는 항상 FIXED_DT. 초 단위다 */
  update: (state: GameState, dt: number) => void;
  /** alpha 는 다음 스텝까지의 보간 계수 0~1 (T-004 렌더러가 쓴다) */
  render: (state: GameState, alpha: number) => void;
  /** 한 프레임이 끝날 때. 계측용 */
  onFrame?: (steps: number, frameMs: number) => void;
}

/** 시간·스케줄러 주입. 테스트에서 rAF 없이 돌리기 위한 것 */
export interface LoopClock {
  now: () => number;
  schedule: (cb: (timeMs: number) => void) => number;
  cancel: (handle: number) => void;
}

export interface Loop {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  /** 탭 복귀처럼 시간이 크게 튄 뒤, 다음 프레임의 델타를 버린다 */
  resync(): void;
  /** 한 프레임을 수동으로 진행한다. 테스트·스텝 디버깅용 */
  tick(timeMs: number): void;
  readonly paused: boolean;
  readonly running: boolean;
}

const browserClock: LoopClock = {
  now: () => performance.now(),
  schedule: (cb) => requestAnimationFrame(cb),
  cancel: (h) => {
    cancelAnimationFrame(h);
  },
};

export function createLoop(
  state: GameState,
  callbacks: LoopCallbacks,
  clock: LoopClock = browserClock,
): Loop {
  const { update, render, onFrame } = callbacks;

  let accumulator = 0;
  let lastTimeMs = 0;
  let handle = 0;
  let running = false;
  let paused = false;
  let needsResync = true;

  function tick(timeMs: number): void {
    const frameStart = clock.now();

    let delta = (timeMs - lastTimeMs) / 1000;
    lastTimeMs = timeMs;

    if (needsResync) {
      // 시작·재개·탭 복귀 직후의 델타는 의미가 없다
      needsResync = false;
      delta = 0;
    }

    if (delta > MAX_FRAME_DELTA) delta = MAX_FRAME_DELTA;
    if (delta < 0) delta = 0;

    let steps = 0;
    if (!paused) {
      accumulator += delta;

      while (accumulator >= FIXED_DT) {
        update(state, FIXED_DT);
        state.ticks += 1;
        state.elapsedSec += FIXED_DT;
        accumulator -= FIXED_DT;
        steps += 1;

        if (steps >= MAX_STEPS_PER_FRAME) {
          // 밀린 시간을 버린다. 안 버리면 다음 프레임이 더 밀려 죽음의 나선이 된다
          accumulator = 0;
          break;
        }
      }
    }

    render(state, paused ? 0 : accumulator / FIXED_DT);

    onFrame?.(steps, clock.now() - frameStart);
  }

  function frame(timeMs: number): void {
    if (!running) return;
    tick(timeMs);
    handle = clock.schedule(frame);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      paused = false;
      accumulator = 0;
      needsResync = true;
      lastTimeMs = clock.now();
      handle = clock.schedule(frame);
    },

    stop(): void {
      if (!running) return;
      running = false;
      clock.cancel(handle);
      handle = 0;
    },

    pause(): void {
      paused = true;
    },

    resume(): void {
      if (!paused) return;
      paused = false;
      accumulator = 0;
      needsResync = true;
    },

    resync(): void {
      needsResync = true;
    },

    tick,

    get paused(): boolean {
      return paused;
    },
    get running(): boolean {
      return running;
    },
  };
}
