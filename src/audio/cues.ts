/**
 * 효과음 카탈로그 (정본).
 *
 * 음원은 Kenney 의 CC0 팩에서 골라 `public/audio/` 에 넣었다 — 출처와 라이선스는
 * [public/audio/CREDITS.md](../../public/audio/CREDITS.md).
 *
 * **볼륨은 빈도의 역수로 잡는다.** 잡몹 타격음은 초당 수십 번 울리므로
 * 보스 처치음보다 다섯 배 작아야 겨우 같은 크기로 들린다. 여기 `gain` 이
 * 제각각인 건 실수가 아니라 그 이유다.
 *
 * 교실에서 쓰는 게임이다. 기본 볼륨을 낮게 잡고, 어떤 소리도 놀라게 하지 않는다 —
 * 특히 `quiz-wrong` 은 부저가 아니라 부드럽게 내려가는 음이다.
 * **오답은 처벌이 아니다**(AGENTS.md 설계 원칙 3).
 */

export const SFX_CUES = [
  'hit',
  'hit-heavy',
  'enemy-death',
  'elite-death',
  'player-hurt',
  'player-down',
  'crate-break',
  'pickup-xp',
  'pickup-item',
  'heal',
  'level-up',
  'boss-spawn',
  'boss-skill',
  'boss-charge',
  'boss-phase',
  'boss-death',
  'meteor',
  'freeze',
  'magnet',
  'quiz-open',
  'quiz-correct',
  'quiz-wrong',
  'ui-click',
  'victory',
] as const;

export type SfxCue = (typeof SFX_CUES)[number];

export interface SfxCueSpec {
  /** 0 ~ 1. 이 큐의 기본 크기 */
  readonly gain: number;
  /** 재생 속도를 흔드는 폭. 0.14 면 0.86 ~ 1.14 배. 같은 소리의 반복을 덜 지겹게 한다 */
  readonly pitchJitter: number;
  /** 이 간격 안에 같은 큐가 다시 오면 버린다. 잡몹 타격음이 소음이 되는 걸 막는 유일한 장치 */
  readonly minIntervalSec: number;
  /** 동시에 울릴 수 있는 최대 개수 */
  readonly maxConcurrent: number;
  /** 2 = 목소리가 꽉 차도 반드시 울린다. 놓치면 안 되는 사건에만 준다 */
  readonly priority: 0 | 1 | 2;
}

export const SFX_SPECS: Readonly<Record<SfxCue, SfxCueSpec>> = {
  // 초당 수십 번 울린다. 여기 숫자를 키우면 게임 전체가 시끄러워진다
  hit: { gain: 0.16, pitchJitter: 0.16, minIntervalSec: 0.045, maxConcurrent: 4, priority: 0 },
  'hit-heavy': { gain: 0.38, pitchJitter: 0.08, minIntervalSec: 0.09, maxConcurrent: 3, priority: 1 },
  'enemy-death': { gain: 0.22, pitchJitter: 0.18, minIntervalSec: 0.05, maxConcurrent: 5, priority: 0 },
  'elite-death': { gain: 0.5, pitchJitter: 0.06, minIntervalSec: 0.2, maxConcurrent: 2, priority: 1 },

  // 내가 맞은 소리는 무엇에도 묻히면 안 된다
  'player-hurt': { gain: 0.75, pitchJitter: 0.04, minIntervalSec: 0.25, maxConcurrent: 1, priority: 2 },
  'player-down': { gain: 0.8, pitchJitter: 0, minIntervalSec: 1, maxConcurrent: 1, priority: 2 },

  'crate-break': { gain: 0.42, pitchJitter: 0.1, minIntervalSec: 0.06, maxConcurrent: 3, priority: 1 },
  'pickup-xp': { gain: 0.09, pitchJitter: 0.2, minIntervalSec: 0.055, maxConcurrent: 4, priority: 0 },
  'pickup-item': { gain: 0.42, pitchJitter: 0.05, minIntervalSec: 0.08, maxConcurrent: 2, priority: 1 },
  heal: { gain: 0.48, pitchJitter: 0.04, minIntervalSec: 0.15, maxConcurrent: 2, priority: 1 },
  'level-up': { gain: 0.6, pitchJitter: 0, minIntervalSec: 0.3, maxConcurrent: 1, priority: 2 },

  'boss-spawn': { gain: 0.85, pitchJitter: 0, minIntervalSec: 0.5, maxConcurrent: 1, priority: 2 },
  'boss-skill': { gain: 0.48, pitchJitter: 0.08, minIntervalSec: 0.15, maxConcurrent: 2, priority: 2 },
  'boss-charge': { gain: 0.55, pitchJitter: 0.06, minIntervalSec: 0.2, maxConcurrent: 2, priority: 2 },
  'boss-phase': { gain: 0.7, pitchJitter: 0, minIntervalSec: 0.4, maxConcurrent: 1, priority: 2 },
  'boss-death': { gain: 0.9, pitchJitter: 0, minIntervalSec: 1, maxConcurrent: 1, priority: 2 },

  meteor: { gain: 0.85, pitchJitter: 0.03, minIntervalSec: 0.3, maxConcurrent: 1, priority: 2 },
  freeze: { gain: 0.5, pitchJitter: 0, minIntervalSec: 0.2, maxConcurrent: 1, priority: 1 },
  magnet: { gain: 0.5, pitchJitter: 0, minIntervalSec: 0.2, maxConcurrent: 1, priority: 1 },

  'quiz-open': { gain: 0.4, pitchJitter: 0, minIntervalSec: 0.3, maxConcurrent: 1, priority: 2 },
  'quiz-correct': { gain: 0.6, pitchJitter: 0, minIntervalSec: 0.2, maxConcurrent: 1, priority: 2 },
  'quiz-wrong': { gain: 0.38, pitchJitter: 0, minIntervalSec: 0.2, maxConcurrent: 1, priority: 2 },
  'ui-click': { gain: 0.32, pitchJitter: 0.05, minIntervalSec: 0.05, maxConcurrent: 2, priority: 1 },
  victory: { gain: 0.8, pitchJitter: 0, minIntervalSec: 1, maxConcurrent: 1, priority: 2 },
};

/** 큐 이름 → 배열 인덱스. 요청 큐가 무할당으로 돌기 위해 필요하다 */
export const SFX_CUE_INDEX: Readonly<Record<SfxCue, number>> = createCueIndex();

export function getSfxUrl(cue: SfxCue): string {
  return `/audio/${cue}.m4a`;
}

function createCueIndex(): Record<SfxCue, number> {
  const index = {} as Record<SfxCue, number>;
  for (let i = 0; i < SFX_CUES.length; i += 1) {
    index[SFX_CUES[i] as SfxCue] = i;
  }
  return index;
}
