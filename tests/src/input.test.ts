import { describe, expect, it } from 'vitest';
import {
  normalizeDirection,
  resolveMoveDirection,
  writeDragDirectionFromPoint,
  writeTouchDirectionFromAnchor,
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

  it('터치 드래그는 처음 터치한 위치를 기준으로 움직인다', () => {
    const out = { x: 0, y: 0 };
    writeTouchDirectionFromAnchor(out, 160, 100, 100, 100, 12, 64);

    expect(out.x).toBeCloseTo((60 - 12) / (64 - 12));
    expect(out.y).toBeCloseTo(0);
  });

  it('터치 기준점 주변의 작은 흔들림은 이동으로 처리하지 않는다', () => {
    const out = { x: 0, y: 0 };
    writeTouchDirectionFromAnchor(out, 108, 106, 100, 100, 12, 64);

    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
  });

  it('터치 드래그가 충분히 멀어지면 최대 속도 방향으로 제한된다', () => {
    const out = { x: 0, y: 0 };
    writeTouchDirectionFromAnchor(out, 100, 220, 100, 100, 12, 64);

    expect(out.x).toBeCloseTo(0);
    expect(out.y).toBeCloseTo(1);
  });
});
