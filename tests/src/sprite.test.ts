import { describe, expect, it } from 'vitest';
import {
  computePupilOffset,
  measureSprite,
  writeSpriteFrame,
  createSpriteFrameScratch,
} from '../../src/entities/sprite.js';

describe('동공 오프셋', () => {
  it('최대치를_넘지_않는다', () => {
    const measured = measureSprite(20);
    const offset = computePupilOffset({ dx: 999, dy: -321 }, measured.pupilMaxOffset);
    const length = Math.hypot(offset.x, offset.y);

    expect(length).toBeLessThanOrEqual(measured.pupilMaxOffset + 0.000001);
  });
});

describe('스프라이트 규격', () => {
  it('눈과_그림자_수치가_기획서_규격과_일치한다', () => {
    const measured = measureSprite(20);

    expect(measured.eyeWhiteRadius).toBe(5);
    expect(measured.pupilRadius).toBe(2.5);
    expect(measured.shadowCenterY).toBe(16);
  });

  it('프레임_계산이_눈_배치와_동공_이동을_반영한다', () => {
    const scratch = createSpriteFrameScratch();
    const frame = writeSpriteFrame(scratch, 24, { dx: 3, dy: 4 });

    expect(frame.leftEyeX).toBeCloseTo(-24 * 0.38);
    expect(frame.rightEyeX).toBeCloseTo(24 * 0.38);
    expect(frame.eyeY).toBeCloseTo(-24 * 0.2);
    expect(Math.hypot(frame.pupilOffsetX, frame.pupilOffsetY)).toBeCloseTo(frame.pupilMaxOffset);
  });
});
