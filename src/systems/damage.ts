import type { EnemyEntity } from '../entities/enemy.js';
import type { Player } from '../entities/player.js';
import type { GameState } from '../engine/state.js';
import { spawnDamageNumber } from '../entities/damage-number.js';
import { defeatEnemy } from './spawn.js';

export const PLAYER_HIT_INVULNERABLE_SEC = 0.5;

export function updatePlayerInvulnerability(player: Player, dt: number): void {
  if (player.invulnerableSec <= 0) return;
  player.invulnerableSec -= dt;
  if (player.invulnerableSec < 0) player.invulnerableSec = 0;
}

export function applyContactDamage(player: Player, damagePerSec: number, dt: number): number {
  if (player.health <= 0) return 0;
  if (player.invulnerableSec > 0) return 0;

  const damage = damagePerSec * dt;
  player.health -= damage;
  if (player.health < 0) player.health = 0;
  player.invulnerableSec = PLAYER_HIT_INVULNERABLE_SEC;
  return damage;
}

export function applyEnemyDamage(state: GameState, enemy: EnemyEntity, damage: number): boolean {
  if (!enemy.active || damage <= 0) return false;

  enemy.hp -= damage;
  spawnDamageNumber(state.damageNumbers, enemy.x, enemy.y, damage);
  if (enemy.hp > 0) return false;

  defeatEnemy(state, enemy);
  return true;
}
