import { SPRITE_SPEC } from '../data/palette.js';

export interface SpriteMeasurements {
  radius: number;
  outlineWidth: number;
  eyeWhiteRadius: number;
  pupilRadius: number;
  shadowCenterY: number;
  shadowRadiusX: number;
  shadowRadiusY: number;
  eyeOffsetX: number;
  eyeOffsetY: number;
  pupilMaxOffset: number;
  symbolOffsetY: number;
  symbolFontSize: number;
}

export interface SpriteFrame extends SpriteMeasurements {
  leftEyeX: number;
  rightEyeX: number;
  eyeY: number;
  pupilOffsetX: number;
  pupilOffsetY: number;
}

export interface DirectionLike {
  dx: number;
  dy: number;
}

/**
 * 기획서 규격을 그대로 수치화한다.
 * 테스트는 이 값을 기준으로 잡는다.
 */
export function measureSprite(radius: number): SpriteMeasurements {
  const clampedRadius = clampRadius(radius);
  const eyeWhiteRadius = clampedRadius * SPRITE_SPEC.eyeWhiteRadiusRatio;

  return {
    radius: clampedRadius,
    outlineWidth: SPRITE_SPEC.outlineWidthPx,
    eyeWhiteRadius,
    pupilRadius: eyeWhiteRadius * SPRITE_SPEC.pupilRadiusRatio,
    shadowCenterY: clampedRadius * SPRITE_SPEC.shadowOffsetYRatio,
    shadowRadiusX: clampedRadius * SPRITE_SPEC.shadowRadiusXRatio,
    shadowRadiusY: clampedRadius * SPRITE_SPEC.shadowRadiusYRatio,
    eyeOffsetX: clampedRadius * SPRITE_SPEC.eyeOffsetXRatio,
    eyeOffsetY: clampedRadius * SPRITE_SPEC.eyeOffsetYRatio,
    pupilMaxOffset: eyeWhiteRadius * SPRITE_SPEC.pupilMaxOffsetRatio,
    symbolOffsetY: clampedRadius * SPRITE_SPEC.symbolOffsetYRatio,
    symbolFontSize: clampedRadius * SPRITE_SPEC.symbolFontSizeRatio,
  };
}

export function computePupilOffset(
  direction: DirectionLike,
  maxOffset: number,
): { x: number; y: number } {
  const length = Math.hypot(direction.dx, direction.dy);
  if (length <= 0.000001) {
    return { x: 0, y: 0 };
  }

  const scale = maxOffset / length;
  return {
    x: direction.dx * scale,
    y: direction.dy * scale,
  };
}

/**
 * 렌더러가 재사용하는 scratch 객체에 좌표를 덮어쓴다.
 * 렌더 루프 안에서 새 객체를 만들지 않기 위한 형태다.
 */
export function writeSpriteFrame(
  out: SpriteFrame,
  radius: number,
  direction: DirectionLike,
): SpriteFrame {
  const measured = measureSprite(radius);
  out.radius = measured.radius;
  out.outlineWidth = measured.outlineWidth;
  out.eyeWhiteRadius = measured.eyeWhiteRadius;
  out.pupilRadius = measured.pupilRadius;
  out.shadowCenterY = measured.shadowCenterY;
  out.shadowRadiusX = measured.shadowRadiusX;
  out.shadowRadiusY = measured.shadowRadiusY;
  out.eyeOffsetX = measured.eyeOffsetX;
  out.eyeOffsetY = measured.eyeOffsetY;
  out.pupilMaxOffset = measured.pupilMaxOffset;
  out.symbolOffsetY = measured.symbolOffsetY;
  out.symbolFontSize = measured.symbolFontSize;
  out.leftEyeX = -measured.eyeOffsetX;
  out.rightEyeX = measured.eyeOffsetX;
  out.eyeY = -measured.eyeOffsetY;

  const pupilOffset = computePupilOffset(direction, measured.pupilMaxOffset);
  out.pupilOffsetX = pupilOffset.x;
  out.pupilOffsetY = pupilOffset.y;
  return out;
}

export function createSpriteFrameScratch(): SpriteFrame {
  return {
    radius: 0,
    outlineWidth: 0,
    eyeWhiteRadius: 0,
    pupilRadius: 0,
    shadowCenterY: 0,
    shadowRadiusX: 0,
    shadowRadiusY: 0,
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    pupilMaxOffset: 0,
    symbolOffsetY: 0,
    symbolFontSize: 0,
    leftEyeX: 0,
    rightEyeX: 0,
    eyeY: 0,
    pupilOffsetX: 0,
    pupilOffsetY: 0,
  };
}

function clampRadius(radius: number): number {
  if (radius < SPRITE_SPEC.minRadiusPx) return SPRITE_SPEC.minRadiusPx;
  if (radius > SPRITE_SPEC.maxRadiusPx) return SPRITE_SPEC.maxRadiusPx;
  return radius;
}
