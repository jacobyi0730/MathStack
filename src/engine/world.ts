export interface WorldBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export function worldWidth(bounds: WorldBounds): number {
  return bounds.maxX - bounds.minX;
}

export function worldHeight(bounds: WorldBounds): number {
  return bounds.maxY - bounds.minY;
}

export function wrapCoordinate(value: number, min: number, max: number): number {
  const size = max - min;
  if (size <= 0) return min;
  return ((((value - min) % size) + size) % size) + min;
}

export function wrapX(value: number, bounds: WorldBounds): number {
  return wrapCoordinate(value, bounds.minX, bounds.maxX);
}

export function wrapY(value: number, bounds: WorldBounds): number {
  return wrapCoordinate(value, bounds.minY, bounds.maxY);
}

export function shortestDeltaX(from: number, to: number, bounds: WorldBounds): number {
  return shortestDelta(from, to, worldWidth(bounds));
}

export function shortestDeltaY(from: number, to: number, bounds: WorldBounds): number {
  return shortestDelta(from, to, worldHeight(bounds));
}

export function wrappedDistanceSq(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  bounds: WorldBounds,
): number {
  const dx = shortestDeltaX(fromX, toX, bounds);
  const dy = shortestDeltaY(fromY, toY, bounds);
  return dx * dx + dy * dy;
}

function shortestDelta(from: number, to: number, size: number): number {
  if (size <= 0) return to - from;
  let delta = to - from;
  const half = size * 0.5;
  if (delta > half) delta -= size;
  if (delta < -half) delta += size;
  return delta;
}
