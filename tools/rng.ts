export interface Rng {
  readonly seed: number;
  nextUint32(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(values: readonly T[]): T;
}

class XorShift32 implements Rng {
  private state: number;

  public constructor(public readonly seed: number) {
    this.state = seed === 0 ? 0x6d2b79f5 : seed >>> 0;
  }

  public nextUint32(): number {
    let value = this.state >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  public int(minInclusive: number, maxInclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
      throw new Error('Rng.int 는 정수 범위만 받습니다.');
    }
    if (maxInclusive < minInclusive) {
      throw new Error(`잘못된 범위입니다: ${minInclusive}..${maxInclusive}`);
    }

    const span = maxInclusive - minInclusive + 1;
    return minInclusive + (this.nextUint32() % span);
  }

  public pick<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new Error('Rng.pick 대상이 비어 있습니다.');
    }
    return values[this.int(0, values.length - 1)];
  }
}

export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function createRng(seed: number): Rng {
  return new XorShift32(seed >>> 0);
}

