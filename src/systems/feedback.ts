/**
 * 타격 피드백의 정본 (05-세션-운영 §14 보조).
 *
 * "적이 죽었다 / 내가 맞았다 / 보스가 뭘 한다"를 눈과 귀로 알리는 모든 처리를
 * 여기 한 곳에 모았다. 전투 시스템은 **무엇이 일어났는지만** 알리고,
 * 그것이 어떻게 보이고 들릴지는 전부 이 파일이 정한다.
 *
 * ### 왜 한 곳인가
 *
 * 피드백 수치는 서로를 기준으로만 조절할 수 있다. 잡몹 처치음이 얼마나 커야 하는지는
 * 보스 처치음이 얼마나 큰지를 봐야 정해진다. 흩어 두면 두 달 뒤에 아무도 못 고친다.
 *
 * ### 규칙 셋
 *
 * 1. **여기서 게임 수치를 바꾸지 않는다.** 체력·데미지·쿨다운을 건드리는 줄이 생기면
 *    그건 밸런스 변경이고, 문서(정본)를 먼저 고쳐야 한다 (AGENTS.md §2 규칙 6).
 * 2. **흔들림과 멈춤은 큰 사건에만.** 잡몹 처치에 주면 10분 내내 흔들려서
 *    정작 보스 스킬이 안 보인다.
 * 3. **소리는 요청만 한다.** 실제 재생은 프레임이 끝난 뒤 한 번에 일어난다
 *    (`audio/queue.ts`). 게임 루프에서 오디오 노드를 만들지 않기 위한 것이다.
 */

import type { SfxCue } from '../audio/cues.js';
import { distanceGain, panFromOffset, requestSfx } from '../audio/queue.js';
import { ENEMY_PALETTES, ITEM_PALETTES, PLAYER_PALETTES } from '../data/palette.js';
import {
  HIT_FLASH_SEC,
  addHitStop,
  addTrauma,
  emitBurst,
  emitShockwave,
  flashDamage,
  flashWhite,
} from '../engine/effects.js';
import type { GameState } from '../engine/state.js';
import { shortestDeltaX, shortestDeltaY } from '../engine/world.js';
import type { BossEntity } from '../entities/boss.js';
import type { CrateEntity } from '../entities/crate.js';
import type { EnemyEntity } from '../entities/enemy.js';
import { HAZARD_COLORS, HAZARD_METEOR, HAZARD_ZONE, type HazardEntity } from '../entities/hazard.js';
import type { PickupKind } from '../entities/pickup.js';

/** 피격 시 적이 뒤로 밀리는 속도(px/s). 아주 짧게만 유효하다 */
export const KNOCKBACK_SPEED = 170;
/** 밀림이 매 스텝 남는 비율. 0.72 면 세 스텝(0.05초) 만에 사실상 0 이 된다 */
export const KNOCKBACK_DECAY = 0.72;
/** 화면 대각선의 이 배율을 넘어가면 소리가 들리지 않는다. 화면 밖 학살은 조용해야 한다 */
const AUDIBLE_RADIUS_RATIO = 0.8;

/* ------------------------------------------------------------------ 잡몹 */

/**
 * 적이 맞았다.
 *
 * **흔들지 않는다.** 초당 수십 번 일어나는 일이다. 흰 섬광과 밀림, 아주 작은 소리만.
 */
export function feedbackEnemyHit(state: GameState, enemy: EnemyEntity, damage: number): void {
  enemy.flashSec = HIT_FLASH_SEC;
  applyKnockback(state, enemy);

  const heavy = damage >= enemy.maxHp * 0.5;
  playAt(state, heavy ? 'hit-heavy' : 'hit', enemy.x, enemy.y);
}

/**
 * 적이 죽었다.
 *
 * 파편만 낸다. 여기에 흔들림이나 히트스톱을 주면 웨이브가 몰릴 때 게임이 멈춘다.
 */
export function feedbackEnemyDeath(state: GameState, enemy: EnemyEntity): void {
  const color = ENEMY_PALETTES[enemy.paletteIndex]?.body ?? ENEMY_PALETTES[0].body;
  const big = enemy.radius >= 20;

  emitBurst(state.effects, enemy.x, enemy.y, color, big ? 8 : 5, 130, enemy.radius * 0.24, 0.34);
  emitShockwave(state.effects, enemy.x, enemy.y, enemy.radius * 0.6, enemy.radius * 1.9, 0.22, color, 2, 0);
  playAt(state, 'enemy-death', enemy.x, enemy.y);
}

/** 자석·폭탄을 떨구는 특별 적. 잡몹과 소리부터 달라야 "저건 다르다"가 전달된다 */
export function feedbackEliteDeath(state: GameState, enemy: EnemyEntity): void {
  const color = ENEMY_PALETTES[enemy.paletteIndex]?.body ?? ENEMY_PALETTES[0].body;

  emitBurst(state.effects, enemy.x, enemy.y, color, 14, 190, enemy.radius * 0.3, 0.45);
  emitShockwave(state.effects, enemy.x, enemy.y, enemy.radius * 0.6, enemy.radius * 3.4, 0.34, '#FFE082', 3, 0);
  addTrauma(state.effects, 0.22);
  playAt(state, 'elite-death', enemy.x, enemy.y);
}

/* ------------------------------------------------------------------- 보스 */

export function feedbackBossHit(state: GameState, boss: BossEntity, damage: number): void {
  boss.flashSec = HIT_FLASH_SEC;
  const heavy = damage >= boss.maxHp * 0.04;
  playAt(state, heavy ? 'hit-heavy' : 'hit', boss.x, boss.y, heavy ? 1 : 0.8);
}

/**
 * 보스가 죽었다. 이 게임에서 가장 큰 사건이다.
 *
 * 화면을 멈추고(0.18초), 흔들고, 하얗게 태운다. 10분에 세 번뿐이라 마음껏 줘도 된다.
 */
export function feedbackBossDeath(state: GameState, boss: BossEntity): void {
  const color = ENEMY_PALETTES[boss.paletteIndex]?.body ?? ENEMY_PALETTES[0].body;

  emitBurst(state.effects, boss.x, boss.y, color, 22, 260, boss.radius * 0.22, 0.65);
  emitBurst(state.effects, boss.x, boss.y, '#FFE082', 12, 150, boss.radius * 0.16, 0.9);
  emitShockwave(state.effects, boss.x, boss.y, boss.radius, boss.radius * 6, 0.6, '#FFFFFF', 5, 0);
  emitShockwave(state.effects, boss.x, boss.y, boss.radius * 0.4, boss.radius * 3.2, 0.4, color, 4, 0);
  addTrauma(state.effects, 1);
  addHitStop(state.effects, 0.18);
  flashWhite(state.effects, 0.55);
  requestSfx(state.sfx, 'boss-death');
}

export function feedbackBossSpawn(state: GameState, boss: BossEntity): void {
  const color = ENEMY_PALETTES[boss.paletteIndex]?.body ?? ENEMY_PALETTES[0].body;

  emitShockwave(state.effects, boss.x, boss.y, boss.radius * 0.5, boss.radius * 7, 0.7, color, 5, 0);
  addTrauma(state.effects, 0.55);
  requestSfx(state.sfx, 'boss-spawn');
}

/** 보스 스킬 종류. 화면에 나가는 모양과 소리가 여기서 갈린다 */
export type BossSkillFeedback =
  | 'clone'
  | 'barrage'
  | 'teleport'
  | 'summon'
  | 'area'
  | 'charge'
  | 'phase';

/**
 * 보스가 스킬을 썼다.
 *
 * 스킬마다 **다른 모양의 고리**를 낸다. 전부 같은 연출이면 "보스가 뭔가 했다"까지만
 * 전달되고 "무엇을 했다"는 사라진다. 페이즈 전환만 화면을 멈춘다 — 그때 판이 바뀌기 때문이다.
 */
export function feedbackBossSkill(
  state: GameState,
  boss: BossEntity,
  skill: BossSkillFeedback,
): void {
  const color = ENEMY_PALETTES[boss.paletteIndex]?.body ?? ENEMY_PALETTES[0].body;
  const radius = boss.radius;

  if (skill === 'phase') {
    emitShockwave(state.effects, boss.x, boss.y, radius, radius * 8, 0.55, '#FFFFFF', 6, 0);
    emitBurst(state.effects, boss.x, boss.y, color, 16, 220, radius * 0.2, 0.5);
    addTrauma(state.effects, 0.7);
    addHitStop(state.effects, 0.1);
    flashWhite(state.effects, 0.3);
    requestSfx(state.sfx, 'boss-phase');
    return;
  }

  if (skill === 'teleport') {
    // 사라진 자리를 안쪽으로 빨려드는 고리로 표시한다. 없으면 순간이동이 순간삭제로 보인다
    emitBurst(state.effects, boss.x, boss.y, color, 12, 170, radius * 0.18, 0.4);
    emitShockwave(state.effects, boss.x, boss.y, radius * 2.2, radius * 0.4, 0.3, '#F0ABFC', 4, 0);
    addTrauma(state.effects, 0.25);
    playAt(state, 'boss-skill', boss.x, boss.y);
    return;
  }

  if (skill === 'charge') {
    // 진행 방향 앞쪽에 고리를 깐다. "이쪽으로 온다"가 먼저 읽혀야 피할 수 있다
    const aheadX = boss.x + boss.dx * 0.35;
    const aheadY = boss.y + boss.dy * 0.35;
    emitShockwave(state.effects, aheadX, aheadY, radius * 2.6, radius * 0.8, 0.28, '#FF7043', 5, 0.1);
    addTrauma(state.effects, 0.4);
    playAt(state, 'boss-charge', boss.x, boss.y);
    return;
  }

  if (skill === 'area') {
    // 장판은 **안쪽까지 채운다**. 테두리만 그리면 어디까지 위험한지 읽히지 않는다
    emitShockwave(state.effects, boss.x, boss.y, radius * 0.8, radius * 5.5, 0.5, color, 4, 0.14);
    addTrauma(state.effects, 0.35);
    playAt(state, 'boss-skill', boss.x, boss.y);
    return;
  }

  // clone / summon / barrage — 보스에서 뭔가가 튀어나오는 모양
  emitBurst(state.effects, boss.x, boss.y, color, skill === 'barrage' ? 10 : 8, 210, radius * 0.16, 0.42);
  emitShockwave(state.effects, boss.x, boss.y, radius * 0.6, radius * 3, 0.32, color, 3, 0);
  addTrauma(state.effects, 0.3);
  playAt(state, 'boss-skill', boss.x, boss.y);
}

/* ----------------------------------------------------- 보스 위험 개체 */

/**
 * 위험 개체가 플레이어에 닿았다.
 *
 * 화면 연출(흔들림·비네트)은 `feedbackPlayerHit` 이 이미 했다 — 여기서는
 * **어느 것에 맞았는지**만 색으로 남긴다. 탄과 장판이 같은 자국을 남기면
 * 죽고 나서 원인을 복기할 수 없다.
 */
export function feedbackHazardHit(state: GameState, hazard: HazardEntity): void {
  const color = HAZARD_COLORS[hazard.colorIndex]?.fill ?? HAZARD_COLORS[0].fill;
  emitBurst(state.effects, hazard.x, hazard.y, color, 7, 140, Math.max(3, hazard.radius * 0.16), 0.3);
}

/**
 * 전조가 끝나고 위험이 살아났다.
 *
 * 이 순간이 **전조 문법의 핵심**이다. 경고 원이 그냥 사라지면 플레이어는
 * "언제부터 아픈지"를 배우지 못한다. 발동하는 순간 반드시 눈에 띄어야 한다.
 */
export function feedbackHazardBurst(state: GameState, hazard: HazardEntity): void {
  const color = HAZARD_COLORS[hazard.colorIndex]?.fill ?? HAZARD_COLORS[0].fill;

  if (hazard.hazardKind === HAZARD_METEOR) {
    emitBurst(state.effects, hazard.x, hazard.y, color, 14, 220, hazard.radius * 0.12, 0.45);
    emitShockwave(state.effects, hazard.x, hazard.y, hazard.radius * 0.4, hazard.radius * 1.6, 0.32, color, 5, 0);
    addTrauma(state.effects, 0.3);
    playAt(state, 'meteor', hazard.x, hazard.y, 0.7);
    return;
  }

  if (hazard.hazardKind === HAZARD_ZONE) {
    emitShockwave(state.effects, hazard.x, hazard.y, hazard.radius * 0.5, hazard.radius, 0.3, color, 4, 0);
    playAt(state, 'boss-skill', hazard.x, hazard.y, 0.55);
  }
}

/* --------------------------------------------------------------- 주인공 */

/**
 * 내가 맞았다.
 *
 * 다른 어떤 피드백보다 세게 준다. 뱀서라이크에서 죽는 순간의 가장 흔한 불만은
 * "언제 맞았는지 몰랐다"이고, 그건 전부 이 함수가 약해서 생긴다.
 * 붉은 비네트는 **주인공 피격에만** 쓴다 — 다른 데 쓰는 순간 신호가 아니게 된다.
 */
export function feedbackPlayerHit(state: GameState, damage: number): void {
  const player = state.player;
  const color = PLAYER_PALETTES[player.paletteIndex]?.body ?? PLAYER_PALETTES[0].body;
  const severity = Math.min(1, damage / Math.max(1, player.maxHealth * 0.25));

  player.flashSec = HIT_FLASH_SEC * 2;
  emitBurst(state.effects, player.x, player.y, color, 10, 150, player.radius * 0.22, 0.4);
  emitShockwave(state.effects, player.x, player.y, player.radius * 2.4, player.radius * 0.6, 0.24, '#FF5252', 4, 0);
  addTrauma(state.effects, 0.45 + severity * 0.3);
  addHitStop(state.effects, 0.06);
  flashDamage(state.effects, 0.55 + severity * 0.45);
  requestSfx(state.sfx, 'player-hurt');
}

export function feedbackPlayerDown(state: GameState): void {
  addTrauma(state.effects, 0.8);
  flashDamage(state.effects, 1);
  requestSfx(state.sfx, 'player-down');
}

/* ------------------------------------------------------- 램프·아이템·운석 */

export function feedbackCrateBreak(state: GameState, crate: CrateEntity): void {
  const color = ITEM_PALETTES[crate.paletteIndex]?.body ?? ITEM_PALETTES[0].body;

  emitBurst(state.effects, crate.x, crate.y, color, 9, 160, crate.radius * 0.26, 0.4);
  emitShockwave(state.effects, crate.x, crate.y, crate.radius * 0.5, crate.radius * 2.6, 0.26, '#FFE0A3', 3, 0);
  addTrauma(state.effects, 0.12);
  playAt(state, 'crate-break', crate.x, crate.y);
}

export function feedbackPickup(state: GameState, kind: PickupKind): void {
  const cue = resolvePickupCue(kind);
  requestSfx(state.sfx, cue);
}

/** 이리듐 운석은 맵 전체를 친다. 화면 전체가 반응해야 그 규모가 전달된다 */
export function feedbackMeteor(state: GameState): void {
  const player = state.player;
  const reach = Math.max(state.viewport.width, state.viewport.height);

  emitShockwave(state.effects, player.x, player.y, 40, reach, 0.65, '#FF7043', 6, 0);
  addTrauma(state.effects, 0.85);
  addHitStop(state.effects, 0.09);
  flashWhite(state.effects, 0.4);
  requestSfx(state.sfx, 'meteor');
}

export function feedbackLevelUp(state: GameState): void {
  const player = state.player;
  const color = PLAYER_PALETTES[player.paletteIndex]?.body ?? PLAYER_PALETTES[0].body;

  emitShockwave(state.effects, player.x, player.y, player.radius, player.radius * 7, 0.5, color, 4, 0);
  emitBurst(state.effects, player.x, player.y, '#FFE082', 12, 130, 4, 0.6);
  requestSfx(state.sfx, 'level-up');
}

/* ------------------------------------------------------------------ 내부 */

/**
 * 밀림을 준다.
 *
 * 방향은 **주인공 반대쪽**이다. 실제 타격원(투사체·장판)은 여러 곳에 있지만,
 * 화면에서 읽히는 건 "내가 밀어냈다"이므로 이쪽이 더 옳게 보인다.
 */
function applyKnockback(state: GameState, enemy: EnemyEntity): void {
  const dx = shortestDeltaX(state.player.x, enemy.x, state.world);
  const dy = shortestDeltaY(state.player.y, enemy.y, state.world);
  const distSq = dx * dx + dy * dy;
  if (distSq <= 0.0001) return;

  const inv = 1 / Math.sqrt(distSq);
  enemy.knockbackX = dx * inv * KNOCKBACK_SPEED;
  enemy.knockbackY = dy * inv * KNOCKBACK_SPEED;
}

/** 월드 좌표를 거리 감쇠와 좌우 위치로 바꿔 소리를 요청한다 */
function playAt(state: GameState, cue: SfxCue, x: number, y: number, scale = 1): void {
  const dx = shortestDeltaX(state.player.x, x, state.world);
  const dy = shortestDeltaY(state.player.y, y, state.world);
  const halfWidth = state.viewport.width * 0.5;
  const audible = Math.max(state.viewport.width, state.viewport.height) * AUDIBLE_RADIUS_RATIO;

  const gain = distanceGain(Math.sqrt(dx * dx + dy * dy), audible);
  if (gain <= 0.02) return;

  requestSfx(state.sfx, cue, gain * scale, panFromOffset(dx, halfWidth));
}

function resolvePickupCue(kind: PickupKind): SfxCue {
  if (kind === 'heal') return 'heal';
  if (kind === 'magnet') return 'magnet';
  if (kind === 'clock') return 'freeze';
  if (kind === 'proton-small' || kind === 'proton-medium' || kind === 'proton-large') {
    return 'pickup-xp';
  }
  return 'pickup-item';
}
