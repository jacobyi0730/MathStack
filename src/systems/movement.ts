import type { MovementBounds } from '../data/characters.js';
import type { PlayerEntity } from '../entities/player.js';
import type { DirectionVector } from '../engine/input.js';

export function movePlayer(player: PlayerEntity, dt: number, bounds: MovementBounds): void {
  updatePlayerMovement(player, player.movementIntent, dt, bounds);
}

export function updatePlayerMovement(
  player: PlayerEntity,
  direction: DirectionVector,
  dt: number,
  bounds: MovementBounds,
): void {
  player.prevX = player.x;
  player.prevY = player.y;

  player.dx = direction.x === 0 ? 0 : direction.x * player.moveSpeed;
  player.dy = direction.y === 0 ? 0 : direction.y * player.moveSpeed;

  player.x = clamp(player.x + player.dx * dt, bounds.minX + player.radius, bounds.maxX - player.radius);
  player.y = clamp(player.y + player.dy * dt, bounds.minY + player.radius, bounds.maxY - player.radius);
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
