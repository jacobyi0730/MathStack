import type { EnemyEntity } from '../entities/enemy.js';
import type { Player } from '../entities/player.js';
import type { GameState } from '../engine/state.js';
import {
  DAMAGE_NUMBER_KIND_NORMAL,
  DAMAGE_NUMBER_KIND_PLAYER,
  DAMAGE_NUMBER_KIND_STRONG,
  spawnDamageNumber,
} from '../entities/damage-number.js';
import { feedbackEnemyHit, feedbackPlayerHit } from './feedback.js';
import { defeatEnemy } from './spawn.js';

export const PLAYER_HIT_INVULNERABLE_SEC = 0.5;

export function updatePlayerInvulnerability(player: Player, dt: number): void {
  if (player.invulnerableSec <= 0) return;
  player.invulnerableSec -= dt;
  if (player.invulnerableSec < 0) player.invulnerableSec = 0;
}

export function applyContactDamage(player: Player, damagePerHit: number): number {
  if (player.health <= 0) return 0;
  if (player.invulnerableSec > 0) return 0;

  const damage = damagePerHit;
  player.health -= damage;
  if (player.health < 0) player.health = 0;
  player.invulnerableSec = PLAYER_HIT_INVULNERABLE_SEC;
  return damage;
}

/**
 * 주인공이 실제로 피해를 입었을 때의 전부.
 *
 * 접촉·탄막·장판이 각자 피격 연출을 부르면 무적 시간과 어긋나 두 번 흔들린다.
 * **피해가 들어간 경로는 반드시 여기를 지난다.**
 */
export function applyPlayerDamage(state: GameState, damagePerHit: number): number {
  const damage = applyContactDamage(state.player, damagePerHit);
  if (damage <= 0) return 0;

  spawnDamageNumber(
    state.damageNumbers,
    state.player.x,
    state.player.y,
    damage,
    DAMAGE_NUMBER_KIND_PLAYER,
  );
  feedbackPlayerHit(state, damage);
  return damage;
}

export function applyEnemyDamage(state: GameState, enemy: EnemyEntity, damage: number): boolean {
  if (!enemy.active || damage <= 0) return false;

  const strong = damage >= enemy.maxHp * 0.5;
  enemy.hp -= damage;
  spawnDamageNumber(
    state.damageNumbers,
    enemy.x,
    enemy.y,
    damage,
    strong ? DAMAGE_NUMBER_KIND_STRONG : DAMAGE_NUMBER_KIND_NORMAL,
  );

  if (enemy.hp > 0) {
    feedbackEnemyHit(state, enemy, damage);
    return false;
  }

  defeatEnemy(state, enemy);
  return true;
}
