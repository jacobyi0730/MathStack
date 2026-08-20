/**
 * 프레임 계측 (34-성능예산 §3).
 *
 * 측정 없이 "빨라졌다"고 말하지 않는다. 이 모듈이 그 근거를 만든다.
 *
 * **여기서도 할당하지 않는다.** 스냅샷 객체와 링 버퍼를 미리 만들어 두고
 * 매 프레임 같은 것을 덮어쓴다. 계측이 계측 대상을 오염시키면 안 된다.
 */

export const SECTIONS = ['sim', 'collide', 'render'] as const;
export type Section = (typeof SECTIONS)[number];

/** 평균을 낼 프레임 수 */
const WINDOW = 60;

export interface FrameSnapshot {
  /** 최근 WINDOW 프레임 평균 */
  fps: number;
  frameMs: number;
  sim: number;
  collide: number;
  render: number;
  /** 직전 프레임의 시뮬레이션 스텝 수 */
  steps: number;
  entities: number;
  /** 이번 프레임의 신규 할당 수. 목표는 0 (34-성능예산 §1) */
  poolAlloc: number;
}

export interface Timer {
  beginFrame(): void;
  begin(section: Section): void;
  end(section: Section): void;
  endFrame(steps: number, entities: number, poolAlloc: number): void;
  /** 항상 같은 객체를 돌려준다. 보관하지 말고 즉시 읽을 것 */
  snapshot(): Readonly<FrameSnapshot>;
}

export function createTimer(now: () => number = () => performance.now()): Timer {
  const frameRing = new Float64Array(WINDOW);
  const simRing = new Float64Array(WINDOW);
  const collideRing = new Float64Array(WINDOW);
  const renderRing = new Float64Array(WINDOW);

  let cursor = 0;
  let filled = 0;

  let frameStart = 0;
  const openedAt: Record<Section, number> = { sim: 0, collide: 0, render: 0 };
  const elapsed: Record<Section, number> = { sim: 0, collide: 0, render: 0 };

  const snap: FrameSnapshot = {
    fps: 0,
    frameMs: 0,
    sim: 0,
    collide: 0,
    render: 0,
    steps: 0,
    entities: 0,
    poolAlloc: 0,
  };

  function mean(ring: Float64Array): number {
    if (filled === 0) return 0;
    let sum = 0;
    for (let i = 0; i < filled; i += 1) sum += ring[i] ?? 0;
    return sum / filled;
  }

  return {
    beginFrame(): void {
      frameStart = now();
      elapsed.sim = 0;
      elapsed.collide = 0;
      elapsed.render = 0;
    },

    begin(section: Section): void {
      openedAt[section] = now();
    },

    end(section: Section): void {
      elapsed[section] += now() - openedAt[section];
    },

    endFrame(steps: number, entities: number, poolAlloc: number): void {
      frameRing[cursor] = now() - frameStart;
      simRing[cursor] = elapsed.sim;
      collideRing[cursor] = elapsed.collide;
      renderRing[cursor] = elapsed.render;

      cursor = (cursor + 1) % WINDOW;
      if (filled < WINDOW) filled += 1;

      snap.steps = steps;
      snap.entities = entities;
      snap.poolAlloc = poolAlloc;
    },

    snapshot(): Readonly<FrameSnapshot> {
      snap.frameMs = mean(frameRing);
      snap.sim = mean(simRing);
      snap.collide = mean(collideRing);
      snap.render = mean(renderRing);
      snap.fps = snap.frameMs > 0 ? 1000 / snap.frameMs : 0;
      return snap;
    },
  };
}

/** 34-성능예산 §3 의 한 줄 형식으로 만든다 */
export function formatSnapshot(s: Readonly<FrameSnapshot>): string {
  const n = (v: number, d = 1): string => v.toFixed(d);
  return (
    `frame ${n(s.frameMs)}ms (${n(s.fps, 0)}fps)  ` +
    `sim ${n(s.sim)}  collide ${n(s.collide)}  render ${n(s.render)}  ` +
    `steps ${s.steps}  entities ${s.entities}  pool ${s.poolAlloc} alloc`
  );
}
