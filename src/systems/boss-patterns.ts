/**
 * 보스 패턴 실행기 (T-055 ~ T-057).
 *
 * [`entities/boss.ts`](../entities/boss.ts) 가 올린 신호를 받아 **실제로 탄을 만들고,
 * 장판을 깔고, 소환수를 부른다.** 보스는 시계, 여기는 손이다.
 *
 * ### 이동만으로 피할 수 있어야 한다
 *
 * 이 게임에는 회피기도 방어도 없다. 그래서 여기서 만드는 모든 위험은 아래를 지킨다.
 *
 * - **추적하지 않는다.** 조준은 발사 순간의 위치로만 한다 (문서 §9.3.2).
 * - **발밑에 깔지 않는다.** 장판과 유성은 플레이어에게서 최소 거리를 띄운다.
 * - **원형 탄막에는 큰 구멍이 하나 있다.** 균등 배치에서 한 칸을 비워 둔다.
 *
 * ### 난수는 보스 전용 씨앗을 쓴다
 *
 * 스폰 씨앗을 같이 쓰면 보스 패턴 횟수가 일반 웨이브 순서를 흔든다.
 * 처치 보상 씨앗을 분리한 것과 같은 이유다.
 */

import { BOSS_PATTERNS, LATE_PHASE_SUMMON_CAP, type BossId } from '../data/bosses.js';
import { ENEMIES, type EnemyId } from '../data/enemies.js';
import type { GameState } from '../engine/state.js';
import { wrapX, wrapY } from '../engine/world.js';
import {
  BOSS_SIGNALS,
  bossSignalPayload,
  consumeBossSignal,
  type BossEntity,
} from '../entities/boss.js';
import { spawnBossBullet, spawnBossMeteor, spawnBossZone } from './boss-hazard.js';
import { feedbackBossSkill } from './feedback.js';
import { spawnEnemyAt } from './spawn.js';

/** 보스별 소환수 종류. 분신은 약한 추격자, 최종보스 소환은 돌격형이다 */
const SUMMON_ENEMY: Readonly<Record<BossId, EnemyId>> = {
  technetium: 'radon',
  polonium: 'radon',
  oganesson: 'sodium',
};

/** 보스별 장판 색 (`HAZARD_COLORS` 인덱스). 독성은 초록, 붕괴는 보라 */
const ZONE_COLOR: Readonly<Record<BossId, number>> = {
  technetium: 1,
  polonium: 1,
  oganesson: 2,
};

const BULLET_COLOR = 0;
const METEOR_COLOR = 3;

/** 원형 탄막이 매번 조금씩 돌아간다. 같은 각도로 반복되면 외워서 서 있게 된다 */
const RING_ROTATION_RAD = 0.37;
/** 소환수가 보스에게서 떨어져 나오는 거리 */
const SUMMON_OFFSET_PX = 70;

export function updateBossPatterns(state: GameState, dt: number): void {
  void dt;
  const pool = state.bosses;
  for (let i = 0; i < pool.activeCount; i += 1) {
    runBossSignals(state, pool.items[i] as BossEntity);
  }
}

function runBossSignals(state: GameState, boss: BossEntity): void {
  if (consumeBossSignal(boss, BOSS_SIGNALS.phase) > 0) {
    feedbackBossSkill(state, boss, 'phase');
  }

  if (consumeBossSignal(boss, BOSS_SIGNALS.teleport) > 0) {
    feedbackBossSkill(state, boss, 'teleport');
  }

  if (consumeBossSignal(boss, BOSS_SIGNALS.clone) > 0) {
    summonAdds(state, boss, bossSignalPayload(boss, BOSS_SIGNALS.clone));
    feedbackBossSkill(state, boss, 'clone');
  }

  if (consumeBossSignal(boss, BOSS_SIGNALS.summon) > 0) {
    summonAdds(state, boss, bossSignalPayload(boss, BOSS_SIGNALS.summon));
    feedbackBossSkill(state, boss, 'summon');
  }

  if (consumeBossSignal(boss, BOSS_SIGNALS.ring) > 0) {
    fireRing(state, boss, bossSignalPayload(boss, BOSS_SIGNALS.ring));
    feedbackBossSkill(state, boss, 'barrage');
  }

  if (consumeBossSignal(boss, BOSS_SIGNALS.split) > 0) {
    fireSplitBarrage(state, boss, bossSignalPayload(boss, BOSS_SIGNALS.split));
    feedbackBossSkill(state, boss, 'barrage');
  }

  if (consumeBossSignal(boss, BOSS_SIGNALS.zone) > 0) {
    layZones(state, boss, bossSignalPayload(boss, BOSS_SIGNALS.zone));
    feedbackBossSkill(state, boss, 'area');
  }

  if (consumeBossSignal(boss, BOSS_SIGNALS.meteor) > 0) {
    dropMeteors(state, boss, bossSignalPayload(boss, BOSS_SIGNALS.meteor));
    feedbackBossSkill(state, boss, 'area');
  }

  if (consumeBossSignal(boss, BOSS_SIGNALS.chargeWindup) > 0) {
    // 준비 동작에 전조를 준다. 돌진 자체는 이미 빠르게 보이므로 여기서만 예고한다
    feedbackBossSkill(state, boss, 'charge');
  }

  if (consumeBossSignal(boss, BOSS_SIGNALS.chargeDash) > 0) {
    feedbackBossSkill(state, boss, 'charge');
  }
}

/**
 * 원형 탄막.
 *
 * 균등 배치에서 **한 칸을 비운다.** 그 자리가 문서 §9.3.2 가 요구하는 "큰 안전각"이고,
 * 비운 칸은 발사할 때마다 돌아가므로 한 자리에 서서 버틸 수는 없다.
 */
function fireRing(state: GameState, boss: BossEntity, bullets: number): void {
  if (bullets <= 0) return;

  const spec = BOSS_PATTERNS[boss.id];
  const step = (Math.PI * 2) / bullets;
  const shot = nextBossSeed(state);
  const rotation = (shot % 16) * RING_ROTATION_RAD;
  const gapSlot = bullets > 2 ? shot % bullets : -1;

  for (let i = 0; i < bullets; i += 1) {
    if (i === gapSlot) continue;
    const angle = rotation + step * i;
    fireBullet(state, boss, Math.cos(angle), Math.sin(angle), spec.bulletSpeed, 0);
  }
}

/**
 * 분할 탄막 (폴로늄).
 *
 * 발사 순간의 플레이어 방향을 기준으로 원을 등분해 쏜다. 각 탄은
 * `splitAfterSec` 뒤에 갈라지고, 갈라진 탄은 느려진다 — 안 그러면 피할 시간이 사라진다.
 */
function fireSplitBarrage(state: GameState, boss: BossEntity, directions: number): void {
  if (directions <= 0) return;

  const spec = BOSS_PATTERNS[boss.id];
  const base = Math.atan2(boss.aimY, boss.aimX);
  const step = (Math.PI * 2) / directions;

  for (let i = 0; i < directions; i += 1) {
    const angle = base + step * i;
    fireBullet(state, boss, Math.cos(angle), Math.sin(angle), spec.bulletSpeed, spec.splitAfterSec);
  }
}

function fireBullet(
  state: GameState,
  boss: BossEntity,
  dirX: number,
  dirY: number,
  speed: number,
  splitAfterSec: number,
): void {
  const spec = BOSS_PATTERNS[boss.id];
  const offset = boss.radius + spec.bulletRadius + 2;
  const bullet = spawnBossBullet(
    state,
    wrapX(boss.x + dirX * offset, state.world),
    wrapY(boss.y + dirY * offset, state.world),
    dirX,
    dirY,
    speed,
    spec.bulletDamage,
    spec.bulletRadius,
    spec.bulletLifeSec,
    BULLET_COLOR,
  );
  if (bullet === undefined || splitAfterSec <= 0) return;

  bullet.splitRemaining = 1;
  bullet.splitTimerSec = splitAfterSec;
  bullet.splitInto = spec.splitInto;
  bullet.splitSpreadRad = spec.splitSpreadRad;
  bullet.splitSpeedMultiplier = spec.splitSpeedMultiplier;
}

/**
 * 장판을 깐다.
 *
 * **플레이어가 서 있는 자리에는 절대 깔지 않는다.** 최소 거리를 두는 것이
 * "전조를 보고 비킨다"를 성립시키는 조건이다 — 발밑에 깔리면 전조가 있어도 소용없다.
 */
function layZones(state: GameState, boss: BossEntity, count: number): void {
  if (count <= 0) return;

  const spec = BOSS_PATTERNS[boss.id];
  const span = spec.zoneMaxDistance - spec.zoneMinDistance;
  const step = (Math.PI * 2) / count;
  const base = nextBossRandom(state) * Math.PI * 2;

  for (let i = 0; i < count; i += 1) {
    const angle = base + step * i + (nextBossRandom(state) - 0.5) * step * 0.5;
    const distance = spec.zoneMinDistance + nextBossRandom(state) * span;
    spawnBossZone(
      state,
      wrapX(state.player.x + Math.cos(angle) * distance, state.world),
      wrapY(state.player.y + Math.sin(angle) * distance, state.world),
      spec.zoneRadius,
      spec.zoneDamage,
      spec.zoneWarnSec,
      spec.zoneActiveSec,
      ZONE_COLOR[boss.id],
    );
  }
}

function dropMeteors(state: GameState, boss: BossEntity, count: number): void {
  if (count <= 0) return;

  const spec = BOSS_PATTERNS[boss.id];
  for (let i = 0; i < count; i += 1) {
    const angle = nextBossRandom(state) * Math.PI * 2;
    // 유성은 장판보다 반경이 작아 발밑에 떨어져도 비킬 수 있다. 그래도 절반은 띄운다
    const distance = spec.meteorRadius * 0.5 + nextBossRandom(state) * spec.meteorSpread;
    spawnBossMeteor(
      state,
      wrapX(state.player.x + Math.cos(angle) * distance, state.world),
      wrapY(state.player.y + Math.sin(angle) * distance, state.world),
      spec.meteorRadius,
      spec.meteorDamage,
      spec.meteorWarnSec,
      METEOR_COLOR,
    );
  }
}

/**
 * 분신·소환.
 *
 * 보스전 중에는 일반 스폰이 멈춰 있으므로, 여기서 나온 것들이 필드의 전부다.
 * 상한을 넘으면 **조용히 건너뛴다** — 넘겨서 부르면 보스가 안 보인다.
 */
function summonAdds(state: GameState, boss: BossEntity, count: number): void {
  if (count <= 0) return;

  const spec = BOSS_PATTERNS[boss.id];
  const cap = boss.phaseIndex >= 1 ? LATE_PHASE_SUMMON_CAP : spec.summonCap;
  const room = cap - state.enemies.activeCount;
  if (room <= 0) return;

  const spawnCount = Math.min(count, room);
  const step = (Math.PI * 2) / spawnCount;
  const base = nextBossRandom(state) * Math.PI * 2;
  const definition = ENEMIES[SUMMON_ENEMY[boss.id]];
  const distance = boss.radius + SUMMON_OFFSET_PX;

  for (let i = 0; i < spawnCount; i += 1) {
    const angle = base + step * i;
    spawnEnemyAt(
      state,
      definition.id,
      wrapX(boss.x + Math.cos(angle) * distance, state.world),
      wrapY(boss.y + Math.sin(angle) * distance, state.world),
      definition.hp,
    );
  }
}

/** 0 ~ 1. 보스 전용 씨앗이라 웨이브 스폰 순서를 흔들지 않는다 */
function nextBossRandom(state: GameState): number {
  return nextBossSeed(state) / 4294967296;
}

function nextBossSeed(state: GameState): number {
  state.bossHazards.seed = (state.bossHazards.seed * 1664525 + 1013904223) >>> 0;
  return state.bossHazards.seed;
}
