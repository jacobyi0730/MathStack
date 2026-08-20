import type { MovementBounds } from '../data/characters.js';
import type { PlayerEntity } from '../entities/player.js';
import type { DirectionVector } from '../engine/input.js';
import { wrapX, wrapY } from '../engine/world.js';

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

  player.x = wrapX(player.x + player.dx * dt, bounds);
  player.y = wrapY(player.y + player.dy * dt, bounds);

  if (Math.abs(player.x - player.prevX) > (bounds.maxX - bounds.minX) * 0.5) {
    player.prevX = player.x;
  }
  if (Math.abs(player.y - player.prevY) > (bounds.maxY - bounds.minY) * 0.5) {
    player.prevY = player.y;
  }
}
