/**
 * 게임 상태. **전역 상태를 만들지 않는다** (36-코딩컨벤션 §4).
 *
 * 시스템은 이 객체를 인자로 받는 순수 함수 `update(state, dt)` 로 작성한다.
 * 여기 필드는 태스크가 진행되며 늘어나되, 항상 이 한 객체 안에 모인다.
 */
export interface GameState {
  /** 세션 경과 시간(초). 일시정지 중에는 멈춘다 */
  elapsedSec: number;

  /** 누적 시뮬레이션 스텝 수. 1스텝 = 1/60초 */
  ticks: number;

  /** 계측 표시용 엔티티 수. T-007 부터 스폰 시스템이 채운다 */
  entityCount: number;
}

export function createGameState(): GameState {
  return {
    elapsedSec: 0,
    ticks: 0,
    entityCount: 0,
  };
}
