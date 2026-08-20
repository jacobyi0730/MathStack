/**
 * 오브젝트 풀 (34-성능예산 §2.3).
 *
 * 적·투사체·양성자 조각·데미지 텍스트·파티클처럼 **초당 수십 개가 나고 죽는**
 * 것들을 여기서 재사용한다. 매 프레임 만들고 버리면 GC 가 프레임을 끊는다.
 *
 * 구조는 **스왑 파티션**이다. 하나의 배열을 활성/비활성 두 구간으로 나누고
 * 경계(activeCount)만 움직인다. 별도 프리 리스트가 없어 획득·반납이 모두 O(1)
 * 이고, 활성 구간이 항상 조밀해 순회가 빠르다.
 *
 * ```
 * items: [ A  B  C  D | E  F  G ]      activeCount = 4
 *          └── 활성 ──┘ └ 비활성 ┘
 * ```
 *
 * **런타임에 절대 할당하지 않는다.** 용량은 생성 시 고정이고, 고갈되면
 * 가장 오래된 활성 항목을 강제로 회수해 재사용한다 — 예외를 던지지 않는다.
 * 게임이 멈추느니 가장 오래된 적 하나가 사라지는 편이 낫다.
 */

export interface Poolable {
  /** 풀 내부용. 활성 구간에서의 위치, 비활성이면 -1. 사용자 코드가 건드리지 않는다 */
  poolIndex: number;
  /** 풀 내부용. 획득 순번. 고갈 시 가장 오래된 것을 고르는 데 쓴다 */
  poolSeq: number;
}

export interface Pool<T extends Poolable> {
  /** 항상 살아있는 객체를 돌려준다. 고갈되면 가장 오래된 것을 회수해 준다 */
  acquire(): T;
  release(item: T): void;
  releaseAll(): void;

  /** 활성 항목. **`[0, activeCount)` 구간만 유효하다** */
  readonly items: readonly T[];
  readonly activeCount: number;
  readonly capacity: number;

  /** 생성 시 factory 호출 수. 런타임에는 늘지 않는다 */
  readonly allocations: number;
  /** 고갈로 강제 회수한 횟수. **0이 아니면 풀이 작다는 신호다** */
  readonly recycles: number;
  resetFrameStats(): void;
}

export function createPool<T extends Poolable>(
  factory: () => T,
  reset: (item: T) => void,
  capacity: number,
): Pool<T> {
  if (capacity <= 0) throw new Error(`풀 용량은 1 이상이어야 합니다: ${capacity}`);

  // 유일한 할당 지점. 이후로는 여기 있는 객체만 돌려 쓴다
  const items: T[] = new Array<T>(capacity);
  for (let i = 0; i < capacity; i += 1) {
    const item = factory();
    item.poolIndex = -1;
    item.poolSeq = 0;
    items[i] = item;
  }

  let activeCount = 0;
  let seq = 0;
  let recycles = 0;

  /** i 번 슬롯과 j 번 슬롯을 맞바꾸고 poolIndex 를 갱신한다 */
  function swap(i: number, j: number): void {
    if (i === j) return;
    const a = items[i] as T;
    const b = items[j] as T;
    items[i] = b;
    items[j] = a;
    b.poolIndex = i;
    a.poolIndex = j;
  }

  /** 활성 구간에서 가장 오래된(poolSeq 최소) 슬롯 */
  function oldestActiveIndex(): number {
    let best = 0;
    let bestSeq = (items[0] as T).poolSeq;
    for (let i = 1; i < activeCount; i += 1) {
      const s = (items[i] as T).poolSeq;
      if (s < bestSeq) {
        bestSeq = s;
        best = i;
      }
    }
    return best;
  }

  function releaseAt(index: number): void {
    const item = items[index] as T;
    reset(item);
    item.poolIndex = -1;
    activeCount -= 1;
    // 비운 자리에 마지막 활성 항목을 끌어와 구간을 조밀하게 유지한다
    swap(index, activeCount);
  }

  return {
    acquire(): T {
      if (activeCount >= capacity) {
        // 고갈. 가장 오래된 것을 회수해 재사용한다.
        // 스폰 상한(T-007)이 제대로 동작하면 여기 오지 않는다 — 안전망이다
        releaseAt(oldestActiveIndex());
        recycles += 1;
      }

      const item = items[activeCount] as T;
      item.poolIndex = activeCount;
      seq += 1;
      item.poolSeq = seq;
      activeCount += 1;
      return item;
    },

    release(item: T): void {
      const index = item.poolIndex;
      // 이미 반납됐거나 이 풀 소속이 아니면 조용히 무시한다.
      // 이중 반납으로 게임이 멈추는 것보다 낫다
      if (index < 0 || index >= activeCount || items[index] !== item) return;
      releaseAt(index);
    },

    releaseAll(): void {
      for (let i = activeCount - 1; i >= 0; i -= 1) releaseAt(i);
    },

    resetFrameStats(): void {
      recycles = 0;
    },

    items,
    get activeCount(): number {
      return activeCount;
    },
    get capacity(): number {
      return capacity;
    },
    get allocations(): number {
      return capacity;
    },
    get recycles(): number {
      return recycles;
    },
  };
}
