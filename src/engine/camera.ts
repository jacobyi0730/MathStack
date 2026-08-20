export interface CameraViewport {
  width: number;
  height: number;
}

export interface CameraTarget {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
}

export interface CameraState extends CameraViewport {
  centerX: number;
  centerY: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export function interpolatePosition(
  prevX: number,
  prevY: number,
  nextX: number,
  nextY: number,
  alpha: number,
): ScreenPoint {
  return {
    x: prevX + (nextX - prevX) * alpha,
    y: prevY + (nextY - prevY) * alpha,
  };
}

export function createCameraState(viewport: CameraViewport, target: CameraTarget, alpha: number): CameraState {
  const center = interpolatePosition(target.prevX, target.prevY, target.x, target.y, alpha);
  return {
    width: viewport.width,
    height: viewport.height,
    centerX: center.x,
    centerY: center.y,
  };
}

export function worldToScreen(camera: CameraState, worldX: number, worldY: number): ScreenPoint {
  return {
    x: worldX - camera.centerX + camera.width * 0.5,
    y: worldY - camera.centerY + camera.height * 0.5,
  };
}

export function screenToWorld(camera: CameraState, screenX: number, screenY: number): ScreenPoint {
  return {
    x: screenX + camera.centerX - camera.width * 0.5,
    y: screenY + camera.centerY - camera.height * 0.5,
  };
}

export function isCircleVisible(
  camera: CameraState,
  worldX: number,
  worldY: number,
  radius: number,
): boolean {
  const screen = worldToScreen(camera, worldX, worldY);
  return !(
    screen.x + radius < 0 ||
    screen.y + radius < 0 ||
    screen.x - radius > camera.width ||
    screen.y - radius > camera.height
  );
}
