/**
 * 무할당 효과음 요청 큐.
 *
 * 시뮬레이션은 `requestSfx` 로 **요청만 남긴다**. 실제 재생은 프레임이 끝난 뒤
 * `flushSfxQueue` 한 번에 일어난다. 이 분리가 두 가지를 동시에 해결한다.
 *
 * 1. 게임 루프 안에서 오디오 노드를 만들지 않는다 (AGENTS.md §2 규칙 3).
 * 2. 같은 프레임에 적 서른 마리가 죽어도 처치음은 한 번만 난다 —
 *    서른 번 겹쳐 울리면 소리가 아니라 잡음이다.
 *
 * 겹친 요청은 버려지지 않고 **볼륨으로 합쳐진다.** 한꺼번에 많이 죽었으면
 * 그만큼 조금 더 크게 들린다.
 */

import { SFX_CUES, SFX_CUE_INDEX, type SfxCue } from './cues.js';
import type { SfxPlayer } from './sfx.js';

/** 요청이 겹칠 때 볼륨이 커질 수 있는 상한. 이보다 키우면 귀가 아프다 */
const MAX_STACK_BOOST = 1.45;
const STACK_BOOST_PER_HIT = 0.09;

export interface SfxQueue {
  /** 큐별 이번 프레임 최대 게인 배율. 0 이면 요청 없음 */
  readonly gain: Float32Array;
  /** 큐별 좌우 위치 -1 ~ 1. 마지막 요청 것을 쓴다 */
  readonly pan: Float32Array;
  /** 큐별 요청 횟수 */
  readonly hits: Int32Array;
  /** 요청이 하나라도 있으면 true. 조용한 프레임에서 순회 자체를 건너뛴다 */
  dirty: boolean;
}

export function createSfxQueue(): SfxQueue {
  return {
    gain: new Float32Array(SFX_CUES.length),
    pan: new Float32Array(SFX_CUES.length),
    hits: new Int32Array(SFX_CUES.length),
    dirty: false,
  };
}

export function requestSfx(queue: SfxQueue, cue: SfxCue, gainScale = 1, pan = 0): void {
  const index = SFX_CUE_INDEX[cue];
  const current = queue.gain[index] as number;
  if (gainScale > current) queue.gain[index] = gainScale;
  queue.pan[index] = pan;
  queue.hits[index] = (queue.hits[index] as number) + 1;
  queue.dirty = true;
}

export function flushSfxQueue(queue: SfxQueue, player: SfxPlayer): void {
  if (!queue.dirty) return;

  for (let i = 0; i < SFX_CUES.length; i += 1) {
    const hits = queue.hits[i] as number;
    if (hits === 0) continue;

    const boost = Math.min(MAX_STACK_BOOST, 1 + (hits - 1) * STACK_BOOST_PER_HIT);
    player.play(SFX_CUES[i] as SfxCue, (queue.gain[i] as number) * boost, queue.pan[i] as number);

    queue.gain[i] = 0;
    queue.pan[i] = 0;
    queue.hits[i] = 0;
  }

  queue.dirty = false;
}

export function clearSfxQueue(queue: SfxQueue): void {
  queue.gain.fill(0);
  queue.pan.fill(0);
  queue.hits.fill(0);
  queue.dirty = false;
}

/**
 * 화면 밖 사건은 조용해야 한다.
 *
 * 월드는 감기므로 화면 좌표 계산 없이 대략만 본다 — 소리는 픽셀 단위 정확도가 필요 없다.
 * 반환값은 게인 배율이고, `pan` 은 두 번째 반환이 필요해 따로 계산한다.
 */
export function distanceGain(distancePx: number, audibleRadiusPx: number): number {
  if (distancePx <= 0) return 1;
  if (distancePx >= audibleRadiusPx) return 0;
  const t = 1 - distancePx / audibleRadiusPx;
  return t * t;
}

/** -1(왼쪽) ~ 1(오른쪽). 화면 절반을 넘어가면 완전히 한쪽으로 붙는다 */
export function panFromOffset(offsetX: number, halfWidthPx: number): number {
  if (halfWidthPx <= 0) return 0;
  const t = offsetX / halfWidthPx;
  return t < -1 ? -1 : t > 1 ? 1 : t;
}
