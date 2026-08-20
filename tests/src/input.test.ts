import { describe, expect, it } from 'vitest';
import {
  normalizeDirection,
  resolveMoveDirection,
  writeDragDirectionFromPoint,
  type DirectionVector,
} from '../../src/engine/input.js';

describe('입력 정규화', () => {
  it('대각선 입력을 정규화한다', () => {
    const direction = normalizeDirection(1, 1);

    expect(direction.x).toBeCloseTo(Math.SQRT1_2);
    expect(direction.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('키보드와 드래그를 같은 방향 벡터로 합친다', () => {
    const keyboard: DirectionVector = { x: 1, y: 0 };
    const pointer: DirectionVector = { x: 0, y: 1 };

    const direction = resolveMoveDirection(keyboard, pointer);

    expect(direction.x).toBeCloseTo(Math.SQRT1_2);
    expect(direction.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('드래그는 화면 중심 대비 상대 방향을 쓴다', () => {
    const out = { x: 0, y: 0 };
    writeDragDirectionFromPoint(out, 150, 50, 0, 0, 200, 100);

    expect(out.x).toBeCloseTo(1);
    expect(out.y).toBeCloseTo(0);
  });
});
