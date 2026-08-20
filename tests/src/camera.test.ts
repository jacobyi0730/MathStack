import { describe, expect, it } from 'vitest';
import {
  createCameraState,
  isCircleVisible,
  screenToWorld,
  worldToScreen,
} from '../../src/engine/camera.js';

describe('카메라 좌표 변환', () => {
  it('월드에서_화면으로_갔다가_다시_월드로_돌아온다', () => {
    const camera = createCameraState(
      { width: 1280, height: 720 },
      { x: 400, y: 240, prevX: 360, prevY: 210 },
      0.5,
    );

    const screen = worldToScreen(camera, 812, -135);
    const world = screenToWorld(camera, screen.x, screen.y);

    expect(world.x).toBeCloseTo(812);
    expect(world.y).toBeCloseTo(-135);
  });
});

describe('컬링 판정', () => {
  const camera = createCameraState(
    { width: 800, height: 600 },
    { x: 0, y: 0, prevX: 0, prevY: 0 },
    1,
  );

  it('화면_안의_원은_보인다', () => {
    expect(isCircleVisible(camera, 10, 10, 20)).toBe(true);
  });

  it('화면_밖의_원은_컬링된다', () => {
    expect(isCircleVisible(camera, 1000, 1000, 20)).toBe(false);
  });

  it('경계에_걸친_원은_보인다', () => {
    expect(isCircleVisible(camera, 400, 0, 20)).toBe(true);
  });
});
