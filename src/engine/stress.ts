import { BOSSES, BOSS_PATTERNS, MAX_BOSS_BULLETS, MAX_BOSS_HAZARDS } from '../data/bosses.js';
import { ENEMIES, type EnemyId } from '../data/enemies.js';
import {
  WEAPON_EVOLUTION_LEVEL,
  WEAPON_MAX_LEVEL,
  WEAPON_SLOT_CAPACITY,
  type WeaponId,
} from '../data/weapons.js';
import { advanceBossPhase, spawnBoss } from '../entities/boss.js';
import { spawnEnemy } from '../entities/enemy.js';
import { spawnProjectile } from '../entities/projectile.js';
import { spawnBossBullet, spawnBossMeteor, spawnBossZone } from '../systems/boss-hazard.js';
import { rebuildEnemyHash } from '../systems/collision.js';
import type { GameState } from './state.js';
import type { FrameSnapshot } from './timing.js';

export const STRESS_QUERY_PARAM = 'stress';
export const STRESS_ENEMY_COUNT = 300;
export const STRESS_PROJECTILE_COUNT = 200;
export const GAME_BUNDLE_GZIP_BUDGET_BYTES = 100 * 1024;
export const BANK_GZIP_BUDGET_BYTES = 150 * 1024;

export interface StressWeaponSlotSignal {
  id: WeaponId;
  level: number;
  evolutionReady: boolean;
  awakenedSignal: boolean;
}

export interface StressSetupResult {
  enemies: number;
  projectiles: number;
  bosses: number;
  /** 보스 탄 + 장판·유성. 최종보스 3페이즈에서 실제로 깔리는 최악값을 재현한다 */
  bossHazards: number;
  maxedWeaponSlots: number;
  awakenedWeaponSlots: number;
  finalBossPhase: 1 | 2 | 3;
}

export interface StressPoolSnapshot {
  enemies: number;
  projectiles: number;
  pickups: number;
  crates: number;
  bosses: number;
  bossHazards: number;
  total: number;
}

export interface StressSnapshot {
  frameMs: number;
  simMs: number;
  collideMs: number;
  renderMs: number;
  entities: number;
  poolAlloc: number;
  pool: StressPoolSnapshot;
}

export interface BundleGzipBudgetResult {
  bytes: number;
  budgetBytes: number;
  withinBudget: boolean;
  remainingBytes: number;
}

const STRESS_ENEMY_IDS: readonly EnemyId[] = [
  'radon',
  'sodium',
  'lead',
  'uranium',
  'caesium',
  'iridium',
  'iodine',
];
const STRESS_WEAPON_IDS: readonly WeaponId[] = [
  'hydrogen_arrow',
  'neon_beam',
  'carbon_ring',
  'oxygen_wave',
  'iron_barrier',
  'magnesium_bomb',
];

export function stressModeEnabled(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get(STRESS_QUERY_PARAM) === '1';
}

export function setupStressMode(state: GameState): StressSetupResult {
  state.elapsedSec = 540;
  state.spawn.accumulator = 0;
  state.crateSpawn.accumulator = 0;
  state.combat.defeatedEnemies = 0;
  state.player.x = 0;
  state.player.y = 0;
  state.player.prevX = 0;
  state.player.prevY = 0;
  state.player.projectileCount = 2;
  state.player.attackPowerMultiplier = 2;
  state.player.attackRangeMultiplier = 1.5;
  state.player.cooldownMultiplier = 0.5;

  state.enemies.releaseAll();
  state.weapons.projectiles.releaseAll();
  state.pickups.releaseAll();
  state.crates.releaseAll();
  state.bosses.releaseAll();
  state.bossHazards.bullets.releaseAll();
  state.bossHazards.fields.releaseAll();
  state.bossHazards.skipped = 0;

  fillStressEnemies(state);
  fillStressProjectiles(state);
  fillStressBosses(state);
  fillStressBossHazards(state);
  writeStressWeaponSlots(state);
  resetStressPoolFrameStats(state);
  rebuildEnemyHash(state);

  state.entityCount =
    state.enemies.activeCount +
    state.weapons.projectiles.activeCount +
    state.pickups.activeCount +
    state.crates.activeCount +
    state.bosses.activeCount +
    state.bossHazards.bullets.activeCount +
    state.bossHazards.fields.activeCount +
    1;

  return {
    enemies: state.enemies.activeCount,
    projectiles: state.weapons.projectiles.activeCount,
    bosses: state.bosses.activeCount,
    bossHazards: state.bossHazards.bullets.activeCount + state.bossHazards.fields.activeCount,
    maxedWeaponSlots: WEAPON_SLOT_CAPACITY,
    awakenedWeaponSlots: WEAPON_SLOT_CAPACITY,
    finalBossPhase: 3,
  };
}

export function writeStressSnapshot(
  out: StressSnapshot,
  timer: Readonly<FrameSnapshot>,
  state: GameState,
): StressSnapshot {
  out.frameMs = timer.frameMs;
  out.simMs = timer.sim;
  out.collideMs = timer.collide;
  out.renderMs = timer.render;
  out.entities = state.entityCount;
  writeStressPoolSnapshot(out.pool, state);
  out.poolAlloc = out.pool.total;
  return out;
}

export function createStressSnapshot(
  timer: Readonly<FrameSnapshot>,
  state: GameState,
): StressSnapshot {
  return writeStressSnapshot(createEmptyStressSnapshot(), timer, state);
}

export function createEmptyStressSnapshot(): StressSnapshot {
  return {
    frameMs: 0,
    simMs: 0,
    collideMs: 0,
    renderMs: 0,
    entities: 0,
    poolAlloc: 0,
    pool: {
      enemies: 0,
      projectiles: 0,
      pickups: 0,
      crates: 0,
      bosses: 0,
      bossHazards: 0,
      total: 0,
    },
  };
}

export function writeStressPoolSnapshot(out: StressPoolSnapshot, state: GameState): StressPoolSnapshot {
  out.enemies = state.enemies.recycles;
  out.projectiles = state.weapons.projectiles.recycles;
  out.pickups = state.pickups.recycles;
  out.crates = state.crates.recycles;
  out.bosses = state.bosses.recycles;
  out.bossHazards = state.bossHazards.bullets.recycles + state.bossHazards.fields.recycles;
  out.total =
    out.enemies + out.projectiles + out.pickups + out.crates + out.bosses + out.bossHazards;
  return out;
}

export function resetStressPoolFrameStats(state: GameState): void {
  state.enemies.resetFrameStats();
  state.weapons.projectiles.resetFrameStats();
  state.pickups.resetFrameStats();
  state.crates.resetFrameStats();
  state.bosses.resetFrameStats();
  state.bossHazards.bullets.resetFrameStats();
  state.bossHazards.fields.resetFrameStats();
}

export function writeStressWeaponSignals(
  out: StressWeaponSlotSignal[],
  state: GameState,
): number {
  let count = 0;
  for (let i = 0; i < state.weapons.slots.length; i += 1) {
    const slot = state.weapons.slots[i];
    if (slot.id === null || count >= out.length) continue;
    let signal = out[count];
    if (!signal) {
      signal = { id: slot.id, level: 0, evolutionReady: false, awakenedSignal: false };
      out[count] = signal;
    }
    signal.id = slot.id;
    signal.level = slot.level;
    signal.evolutionReady = slot.level >= WEAPON_EVOLUTION_LEVEL;
    signal.awakenedSignal = signal.evolutionReady;
    count += 1;
  }
  return count;
}

export function assessBundleGzipBudget(
  bytes: number,
  budgetBytes: number = GAME_BUNDLE_GZIP_BUDGET_BYTES,
): BundleGzipBudgetResult {
  return {
    bytes,
    budgetBytes,
    withinBudget: bytes <= budgetBytes,
    remainingBytes: budgetBytes - bytes,
  };
}

function fillStressEnemies(state: GameState): void {
  const cols = 20;
  const spacing = 42;
  const startX = -((cols - 1) * spacing) * 0.5;
  const startY = -320;

  for (let i = 0; i < STRESS_ENEMY_COUNT; i += 1) {
    const enemy = state.enemies.acquire();
    const id = STRESS_ENEMY_IDS[i % STRESS_ENEMY_IDS.length] as EnemyId;
    const x = startX + (i % cols) * spacing;
    const y = startY + Math.floor(i / cols) * spacing;
    spawnEnemy(enemy, ENEMIES[id], x, y, ENEMIES[id].hp);
    enemy.aiTimerSec = (i % 4) * 0.25;
    enemy.rangedCooldownSec = i % 2 === 0 ? 0 : 0.1;
  }
}

function fillStressProjectiles(state: GameState): void {
  const cols = 25;
  const spacing = 28;
  const startX = -((cols - 1) * spacing) * 0.5;
  const startY = -180;

  for (let i = 0; i < STRESS_PROJECTILE_COUNT; i += 1) {
    const projectile = state.weapons.projectiles.acquire();
    const angle = (i * 2.399963229728653) % (Math.PI * 2);
    const x = startX + (i % cols) * spacing;
    const y = startY + Math.floor(i / cols) * spacing;
    spawnProjectile(projectile, 'hydrogen_arrow', x, y, Math.cos(angle), Math.sin(angle), 18, 1.2);
  }
}

/**
 * 세 보스를 **패턴 발동 직전**에 세운다.
 *
 * 시계를 주기에 거의 닿게 밀어 두면 첫 몇 프레임 안에 세 보스의 패턴이 한꺼번에
 * 터진다 — 실제 플레이에서 가장 무거운 순간이 측정 구간 안에 들어온다.
 */
function fillStressBosses(state: GameState): void {
  const technetium = state.bosses.acquire();
  spawnBoss(technetium, BOSSES.technetium, -260, -180);
  primeBossTimers(technetium, 0.99);

  const polonium = state.bosses.acquire();
  spawnBoss(polonium, BOSSES.polonium, 260, -180);
  // 45% 이하 = 2페이즈. 분할 탄막 6방향과 장판이 같이 나온다
  polonium.hp = Math.floor(BOSSES.polonium.hp * 0.4);
  advanceBossPhase(polonium);
  polonium.phaseFreezeSec = 0;
  primeBossTimers(polonium, 0.99);

  const oganesson = state.bosses.acquire();
  spawnBoss(oganesson, BOSSES.oganesson, 0, 260);
  oganesson.hp = Math.floor(BOSSES.oganesson.hp / 4);
  advanceBossPhase(oganesson);
  oganesson.phaseFreezeSec = 0;
  primeBossTimers(oganesson, 0.99);
}

/** 모든 주기 시계를 "주기 - `headroom`" 지점에 둔다 */
function primeBossTimers(boss: { patternTimers: Float32Array; id: keyof typeof BOSS_PATTERNS; phaseIndex: number }, headroom: number): void {
  const phase = BOSS_PATTERNS[boss.id].phases[boss.phaseIndex];
  if (phase === undefined) return;

  const periods = [
    phase.cloneEverySec,
    phase.ringEverySec,
    phase.splitEverySec,
    phase.teleportEverySec,
    phase.summonEverySec,
    phase.zoneEverySec,
    phase.meteorEverySec,
  ];
  for (let i = 0; i < boss.patternTimers.length && i < periods.length; i += 1) {
    const period = periods[i] as number;
    boss.patternTimers[i] = period > headroom ? period - headroom : 0;
  }
}

/**
 * 위험 개체 풀을 문서 상한까지 채운다 (T-058).
 *
 * 실제 플레이에서 96발이 동시에 뜨는 일은 드물지만, **상한에서 프레임이 무너지지 않는지**를
 * 재는 것이 스트레스 모드의 존재 이유다.
 */
function fillStressBossHazards(state: GameState): void {
  const spec = BOSS_PATTERNS.oganesson;
  const ring = 24;

  for (let i = 0; i < MAX_BOSS_BULLETS; i += 1) {
    const angle = (i * 2.399963229728653) % (Math.PI * 2);
    const distance = 120 + Math.floor(i / ring) * 90;
    spawnBossBullet(
      state,
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      Math.cos(angle + Math.PI),
      Math.sin(angle + Math.PI),
      spec.bulletSpeed,
      spec.bulletDamage,
      spec.bulletRadius,
      spec.bulletLifeSec,
      0,
    );
  }

  const half = Math.floor(MAX_BOSS_HAZARDS / 2);
  for (let i = 0; i < MAX_BOSS_HAZARDS; i += 1) {
    const angle = (i / MAX_BOSS_HAZARDS) * Math.PI * 2;
    const x = Math.cos(angle) * 260;
    const y = Math.sin(angle) * 260;
    if (i < half) {
      spawnBossZone(state, x, y, spec.zoneRadius, spec.zoneDamage, spec.zoneWarnSec, spec.zoneActiveSec, 2);
    } else {
      spawnBossMeteor(state, x, y, spec.meteorRadius, spec.meteorDamage, spec.meteorWarnSec, 3);
    }
  }
}

function writeStressWeaponSlots(state: GameState): void {
  for (let i = 0; i < state.weapons.slots.length; i += 1) {
    const slot = state.weapons.slots[i];
    slot.id = STRESS_WEAPON_IDS[i % STRESS_WEAPON_IDS.length] as WeaponId;
    slot.level = WEAPON_MAX_LEVEL;
    slot.cooldownRemainingSec = 0;
  }
}
