/**
 * 공간 해시 (34-성능예산 §2.4).
 *
 * 적 300체 + 투사체 200개를 전수 비교하면 6만 번이다. 격자로 나눠
 * 근처 셀만 보면 수십 번으로 줄어든다. **O(n²) 전수 비교는 금지다.**
 *
 * 월드는 무한하지만 충돌이 의미 있는 범위는 화면 주변뿐이다. 그래서
 * **플레이어를 중심으로 매 프레임 다시 놓는 고정 격자**를 쓴다.
 * Map 을 쓰면 플레이어가 움직일 때마다 새 셀 키가 생겨 무한히 자란다.
 *
 * 항목은 **중심 셀에만** 넣고, 질의 반경을 이번 프레임 최대 반지름만큼
 * 넓힌다. 항목마다 여러 셀에 중복 삽입하는 것보다 싸고 결과는 같다
 * (보수적으로 더 많은 후보를 주되 놓치지 않는다).
 */

export interface SpatialEntity {
  x: number;
  y: number;
  radius: number;
}

export interface SpatialHashOptions {
  /** 셀 한 변(px). 가장 흔한 적 지름의 2배 정도가 좋다 */
  cellSize?: number;
  /** 격자 가로·세로 셀 수. cellSize × cols 가 커버 범위다 */
  cols?: number;
  rows?: number;
  /** 셀 하나에 담을 수 있는 최대 항목 수 */
  maxPerCell?: number;
}

export interface SpatialHash<T extends SpatialEntity> {
  /** 프레임 시작 시 호출. 격자를 (centerX, centerY) 중심으로 다시 놓는다 */
  clear(centerX: number, centerY: number): void;

  /** 격자 밖이거나 셀이 꽉 찼으면 false */
  insert(item: T): boolean;

  /** item 은 그대로 돌려주되, 격자 좌표만 별도 위치로 넣는다 */
  insertAt(item: T, x: number, y: number): boolean;

  /**
   * 근처 후보를 `out` 에 채우고 **개수를 돌려준다.**
   *
   * `out.length` 가 아니라 **반환값까지만 읽어야 한다.** 배열을 재사용하기
   * 위해 길이를 줄이지 않기 때문이다. `out` 은 호출부에서 한 번만 만들어
   * 매 프레임 돌려 쓴다 — 여기서 새 배열을 만들면 이 자료구조의 의미가 없다.
   */
  queryNearby(x: number, y: number, radius: number, out: T[]): number;

  readonly cellSize: number;
  readonly count: number;
  /** 격자 밖이라 버려진 수. 크면 격자를 넓혀야 한다 */
  readonly outsideCount: number;
  /** 셀 상한 초과로 버려진 수. 크면 maxPerCell 을 올려야 한다 */
  readonly overflowCount: number;
}

export function createSpatialHash<T extends SpatialEntity>(
  options: SpatialHashOptions = {},
): SpatialHash<T> {
  const cellSize = options.cellSize ?? 64;
  const cols = options.cols ?? 64;
  const rows = options.rows ?? 64;
  const maxPerCell = options.maxPerCell ?? 32;

  const cellCount = cols * rows;
  const counts = new Int32Array(cellCount);
  // 유일한 큰 할당. 이후 프레임마다 counts 만 0으로 되돌린다
  const cells: (T | undefined)[] = new Array<T | undefined>(cellCount * maxPerCell);

  const halfW = (cols * cellSize) / 2;
  const halfH = (rows * cellSize) / 2;

  let originX = -halfW;
  let originY = -halfH;
  let maxRadius = 0;
  let count = 0;
  let outsideCount = 0;
  let overflowCount = 0;

  return {
    clear(centerX: number, centerY: number): void {
      counts.fill(0);
      originX = centerX - halfW;
      originY = centerY - halfH;
      maxRadius = 0;
      count = 0;
      outsideCount = 0;
      overflowCount = 0;
      // cells 의 낡은 참조는 지우지 않는다. counts 가 0 이면 읽히지 않고,
      // 13만 칸을 매 프레임 비우는 비용이 이득보다 크다. 객체 수명은 풀이 쥔다
    },

    insert(item: T): boolean {
      return this.insertAt(item, item.x, item.y);
    },

    insertAt(item: T, x: number, y: number): boolean {
      const cx = Math.floor((x - originX) / cellSize);
      const cy = Math.floor((y - originY) / cellSize);

      if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) {
        outsideCount += 1;
        return false;
      }

      const cell = cy * cols + cx;
      const n = counts[cell] as number;
      if (n >= maxPerCell) {
        overflowCount += 1;
        return false;
      }

      cells[cell * maxPerCell + n] = item;
      counts[cell] = n + 1;
      count += 1;
      if (item.radius > maxRadius) maxRadius = item.radius;
      return true;
    },

    queryNearby(x: number, y: number, radius: number, out: T[]): number {
      // 중심 셀에만 넣었으므로, 담길 수 있었던 최대 반지름만큼 넓혀 본다
      const reach = radius + maxRadius;

      let minCx = Math.floor((x - reach - originX) / cellSize);
      let maxCx = Math.floor((x + reach - originX) / cellSize);
      let minCy = Math.floor((y - reach - originY) / cellSize);
      let maxCy = Math.floor((y + reach - originY) / cellSize);

      if (minCx < 0) minCx = 0;
      if (minCy < 0) minCy = 0;
      if (maxCx >= cols) maxCx = cols - 1;
      if (maxCy >= rows) maxCy = rows - 1;

      let found = 0;
      for (let cy = minCy; cy <= maxCy; cy += 1) {
        const rowBase = cy * cols;
        for (let cx = minCx; cx <= maxCx; cx += 1) {
          const cell = rowBase + cx;
          const n = counts[cell] as number;
          const base = cell * maxPerCell;
          for (let k = 0; k < n; k += 1) {
            out[found] = cells[base + k] as T;
            found += 1;
          }
        }
      }
      return found;
    },

    get cellSize(): number {
      return cellSize;
    },
    get count(): number {
      return count;
    },
    get outsideCount(): number {
      return outsideCount;
    },
    get overflowCount(): number {
      return overflowCount;
    },
  };
}
