import { describe, expect, it, vi } from 'vitest';
import { createGameState, type GameState } from '../../src/engine/state.js';
import {
  createLoop,
  FIXED_DT,
  MAX_FRAME_DELTA,
  MAX_STEPS_PER_FRAME,
  type Loop,
  type LoopClock,
} from '../../src/engine/loop.js';

/**
 * T-003 의 DoD 를 그대로 테스트로 옮긴 것.
 * 여기 실패하면 이 루프 위에 올라갈 모든 시스템이 같이 틀어진다.
 */

/** rAF 없이 프레임을 손으로 먹이는 하네스 */
function harness(): {
  state: GameState;
  loop: Loop;
  updates: () => number;
  renders: () => number;
  lastAlpha: () => number;
  advance: (ms: number) => void;
} {
  const state = createGameState();
  let updates = 0;
  let renders = 0;
  let lastAlpha = 0;
  let timeMs = 0;

  const clock: LoopClock = {
    now: () => timeMs,
    schedule: () => 0,
    cancel: () => {},
  };

  const loop = createLoop(
    state,
    {
      update: () => {
        updates += 1;
      },
      render: (_s, alpha) => {
        renders += 1;
        lastAlpha = alpha;
      },
    },
    clock,
  );

  loop.start();
  // start() 직후 첫 프레임의 델타는 버려진다 (needsResync)
  loop.tick(timeMs);

  return {
    state,
    loop,
    updates: () => updates,
    renders: () => renders,
    lastAlpha: () => lastAlpha,
    advance: (ms: number) => {
      timeMs += ms;
      loop.tick(timeMs);
    },
  };
}

describe('고정 타임스텝', () => {
  it('주사율이_달라도_1초에_같은_스텝을_돈다', () => {
    // DoD: 60FPS·144Hz 양쪽에서 시뮬레이션 속도가 동일하다
    const at60 = harness();
    for (let i = 0; i < 60; i += 1) at60.advance(1000 / 60);

    const at144 = harness();
    for (let i = 0; i < 144; i += 1) at144.advance(1000 / 144);

    const at30 = harness();
    for (let i = 0; i < 30; i += 1) at30.advance(1000 / 30);

    // 셋이 서로 같아야 한다. 이게 이 루프의 존재 이유다
    expect(at144.updates()).toBe(at60.updates());
    expect(at30.updates()).toBe(at60.updates());

    // 부동소수점 누산 때문에 경계 스텝 하나가 다음 프레임으로 밀릴 수 있다.
    // 누산기가 나머지를 이월하므로 누적 오차는 아니다 (아래 장시간 테스트가 증명)
    expect(at60.updates()).toBeGreaterThanOrEqual(59);
    expect(at60.updates()).toBeLessThanOrEqual(60);
  });

  it('10분을_돌려도_시뮬레이션_시간이_밀리지_않는다', () => {
    // 경계에서 스텝이 밀리는 게 누적 오차라면 10분 뒤 크게 벌어진다.
    // 누산기가 나머지를 이월하므로 실제로는 ±1스텝 안에 머문다
    const h = harness();
    const frames = 60 * 600; // 60fps × 10분
    for (let i = 0; i < frames; i += 1) h.advance(1000 / 60);

    expect(h.updates()).toBeGreaterThanOrEqual(frames - 1);
    expect(h.updates()).toBeLessThanOrEqual(frames);
    // 게임 시간과 실제 시간의 차이가 1스텝 이내
    expect(Math.abs(h.state.elapsedSec - 600)).toBeLessThanOrEqual(FIXED_DT);
  });

  it('렌더는_프레임마다_시뮬레이션은_고정으로_돈다', () => {
    const h = harness();
    for (let i = 0; i < 144; i += 1) h.advance(1000 / 144);

    // 렌더는 144회(+ 초기 1회), 업데이트는 60회
    expect(h.renders()).toBe(145);
    expect(h.updates()).toBe(60);
  });

  it('update_에_넘어오는_dt_는_항상_FIXED_DT_다', () => {
    const state = createGameState();
    const seen = new Set<number>();
    let timeMs = 0;
    const clock: LoopClock = { now: () => timeMs, schedule: () => 0, cancel: () => {} };

    const loop = createLoop(
      state,
      {
        update: (_s, dt) => {
          seen.add(dt);
        },
        render: () => {},
      },
      clock,
    );
    loop.start();
    loop.tick(timeMs);

    for (const step of [7, 33, 16, 120]) {
      timeMs += step;
      loop.tick(timeMs);
    }

    expect([...seen]).toEqual([FIXED_DT]);
  });

  it('alpha_는_0에서_1_사이다', () => {
    const h = harness();
    for (let i = 0; i < 30; i += 1) {
      h.advance(7);
      expect(h.lastAlpha()).toBeGreaterThanOrEqual(0);
      expect(h.lastAlpha()).toBeLessThan(1);
    }
  });
});

describe('폭주 방지', () => {
  it('탭을_30초_비웠다_돌아와도_한_프레임에_몰아치지_않는다', () => {
    // DoD: 탭 복귀 시 시뮬레이션이 폭주하지 않는다
    const h = harness();
    h.advance(30_000);

    expect(h.updates()).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
  });

  it('큰_델타_뒤에도_밀린_시간이_쌓이지_않는다', () => {
    const h = harness();
    h.advance(30_000);
    const afterSpike = h.updates();

    // 이후 정상 프레임이 이어져도 밀린 backlog 를 토해내지 않는다
    for (let i = 0; i < 10; i += 1) h.advance(1000 / 60);
    expect(h.updates() - afterSpike).toBeLessThanOrEqual(10);
  });

  it('델타는_MAX_FRAME_DELTA_로_잘린다', () => {
    const h = harness();
    h.advance(MAX_FRAME_DELTA * 1000 * 10);
    // 상한 0.25초 → 최대 15스텝이지만 MAX_STEPS_PER_FRAME 이 먼저 걸린다
    expect(h.updates()).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
  });

  it('resync_한_프레임의_델타는_버려진다', () => {
    const h = harness();
    for (let i = 0; i < 10; i += 1) h.advance(1000 / 60);
    const before = h.updates();

    h.loop.resync();
    h.advance(5_000);

    expect(h.updates()).toBe(before);
  });
});

describe('일시정지', () => {
  it('pause_중에는_시뮬레이션이_진행되지_않는다', () => {
    // DoD: pause() 중 시뮬레이션이 진행되지 않는다
    const h = harness();
    for (let i = 0; i < 10; i += 1) h.advance(1000 / 60);
    const before = h.updates();
    const elapsedBefore = h.state.elapsedSec;

    h.loop.pause();
    for (let i = 0; i < 60; i += 1) h.advance(1000 / 60);

    expect(h.updates()).toBe(before);
    expect(h.state.elapsedSec).toBe(elapsedBefore);
  });

  it('pause_중에도_렌더는_계속된다', () => {
    // 퀴즈 모달 뒤로 게임 화면이 그대로 보여야 한다 (기획서 §14.3)
    const h = harness();
    const before = h.renders();

    h.loop.pause();
    for (let i = 0; i < 10; i += 1) h.advance(1000 / 60);

    expect(h.renders()).toBe(before + 10);
  });

  it('resume_직후_밀린_시간을_토해내지_않는다', () => {
    const h = harness();
    h.loop.pause();
    for (let i = 0; i < 60; i += 1) h.advance(1000 / 60);

    const before = h.updates();
    h.loop.resume();
    h.advance(1000 / 60);

    expect(h.updates() - before).toBeLessThanOrEqual(1);
  });

  it('paused_플래그가_상태를_반영한다', () => {
    const h = harness();
    expect(h.loop.paused).toBe(false);
    h.loop.pause();
    expect(h.loop.paused).toBe(true);
    h.loop.resume();
    expect(h.loop.paused).toBe(false);
  });
});

describe('수명 주기', () => {
  it('stop_하면_스케줄을_취소한다', () => {
    const cancel = vi.fn();
    const clock: LoopClock = { now: () => 0, schedule: () => 42, cancel };
    const loop = createLoop(createGameState(), { update: () => {}, render: () => {} }, clock);

    loop.start();
    expect(loop.running).toBe(true);
    loop.stop();

    expect(loop.running).toBe(false);
    expect(cancel).toHaveBeenCalledWith(42);
  });

  it('start_를_두_번_불러도_스케줄이_겹치지_않는다', () => {
    const schedule = vi.fn(() => 1);
    const clock: LoopClock = { now: () => 0, schedule, cancel: () => {} };
    const loop = createLoop(createGameState(), { update: () => {}, render: () => {} }, clock);

    loop.start();
    loop.start();

    expect(schedule).toHaveBeenCalledTimes(1);
  });
});
