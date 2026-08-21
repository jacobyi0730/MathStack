import { BOSSES, MAX_ACTIVE_BOSSES, type BossDefinition, type BossId } from '../data/bosses.js';
import { ENTITY_SHAPES } from '../data/palette.js';
import { createPool, type Pool, type Poolable } from '../engine/pool.js';
import type { RenderableEntity } from '../engine/renderer.js';

export interface BossEntity extends RenderableEntity, Poolable {
  kind: 'boss';
  active: boolean;
  id: BossId;
  name: string;
  element: string;
  atomicNumber: number;
  hp: number;
  maxHp: number;
  speed: number;
  contactDamage: number;
  phase: 1 | 2 | 3;
  patternTimerSec: number;
  movementTimerSec: number;
  cloneSignalSeq: number;
  cloneCount: number;
  barrageSignalSeq: number;
  barrageSplitCount: number;
  teleportSignalSeq: number;
  teleportX: number;
  teleportY: number;
  summonSignalSeq: number;
  areaSignalSeq: number;
  chargeSignalSeq: number;
  phaseChangeSignalSeq: number;
  rewardQueued: boolean;
}

export type BossPool = Pool<BossEntity>;
export type BossRewardSignal = 'none' | 'element_capsule';

const TC_CLONE_PERIOD_SEC = 3;
const TC_CLONE_COUNT = 2;
const PO_BARRAGE_PERIOD_SEC = 2;
const PO_TELEPORT_PERIOD_SEC = 5;
const PO_BARRAGE_SPLITS = 4;
const OG_SUMMON_PERIOD_SEC = 4;
const OG_AREA_PERIOD_SEC = 3;
const OG_CHARGE_PERIOD_SEC = 2.5;

export function createBossPool(capacity: number = MAX_ACTIVE_BOSSES): BossPool {
  return createPool<BossEntity>(createBoss, resetBoss, capacity);
}

export function spawnBoss(boss: BossEntity, definition: BossDefinition, x: number, y: number): void {
  boss.active = true;
  boss.id = definition.id;
  boss.name = definition.name;
  boss.element = definition.element;
  boss.atomicNumber = definition.atomicNumber;
  boss.x = x;
  boss.y = y;
  boss.prevX = x;
  boss.prevY = y;
  boss.dx = 0;
  boss.dy = 0;
  boss.radius = definition.radius;
  boss.paletteGroup = 1;
  boss.shape = ENTITY_SHAPES.circle;
  boss.paletteIndex = definition.paletteIndex;
  boss.symbol = definition.element;
  boss.accessoryKind = definition.accessoryKind;
  boss.hp = definition.hp;
  boss.maxHp = definition.hp;
  boss.speed = definition.speed;
  boss.contactDamage = definition.contactDamage;
  resetBossPatternState(boss);
}

export function updateBosses(
  pool: BossPool,
  targetX: number,
  targetY: number,
  dt: number,
): void {
  for (let i = 0; i < pool.activeCount; i += 1) {
    const boss = pool.items[i] as BossEntity;
    updateBoss(boss, targetX, targetY, dt);
  }
}

export function updateBoss(boss: BossEntity, targetX: number, targetY: number, dt: number): void {
  if (boss.id === 'technetium') {
    updateTechnetium(boss, targetX, targetY, dt);
  } else if (boss.id === 'polonium') {
    updatePolonium(boss, targetX, targetY, dt);
  } else {
    updateOganesson(boss, targetX, targetY, dt);
  }
}

export function applyBossDamage(boss: BossEntity, damage: number): boolean {
  if (damage <= 0 || boss.hp <= 0) return false;
  boss.hp = Math.max(0, boss.hp - damage);
  updateOganessonPhaseSignal(boss);
  return boss.hp === 0;
}

export function defeatBoss(pool: BossPool, boss: BossEntity): BossRewardSignal {
  if (!boss.active || boss.poolIndex < 0) return 'none';
  if (boss.rewardQueued) return 'none';
  boss.rewardQueued = true;
  pool.release(boss);
  return 'element_capsule';
}

function updateTechnetium(boss: BossEntity, targetX: number, targetY: number, dt: number): void {
  moveToward(boss, targetX, targetY, boss.speed, dt);
  boss.patternTimerSec += dt;
  if (boss.patternTimerSec >= TC_CLONE_PERIOD_SEC) {
    boss.patternTimerSec -= TC_CLONE_PERIOD_SEC;
    boss.cloneSignalSeq += 1;
    boss.cloneCount = TC_CLONE_COUNT;
  }
}

function updatePolonium(boss: BossEntity, targetX: number, targetY: number, dt: number): void {
  moveToward(boss, targetX, targetY, boss.speed, dt);
  boss.patternTimerSec += dt;
  boss.movementTimerSec += dt;

  if (boss.patternTimerSec >= PO_BARRAGE_PERIOD_SEC) {
    boss.patternTimerSec -= PO_BARRAGE_PERIOD_SEC;
    boss.barrageSignalSeq += 1;
    boss.barrageSplitCount = PO_BARRAGE_SPLITS;
  }

  if (boss.movementTimerSec >= PO_TELEPORT_PERIOD_SEC) {
    boss.movementTimerSec -= PO_TELEPORT_PERIOD_SEC;
    boss.teleportSignalSeq += 1;
    boss.teleportX = targetX + (boss.teleportSignalSeq % 2 === 0 ? -260 : 260);
    boss.teleportY = targetY + (boss.teleportSignalSeq % 3 === 0 ? -180 : 180);
    boss.x = boss.teleportX;
    boss.y = boss.teleportY;
    boss.prevX = boss.x;
    boss.prevY = boss.y;
  }
}

function updateOganesson(boss: BossEntity, targetX: number, targetY: number, dt: number): void {
  updateOganessonPhaseSignal(boss);

  if (boss.phase === 1) {
    moveToward(boss, targetX, targetY, boss.speed, dt);
    boss.patternTimerSec += dt;
    if (boss.patternTimerSec >= OG_SUMMON_PERIOD_SEC) {
      boss.patternTimerSec -= OG_SUMMON_PERIOD_SEC;
      boss.summonSignalSeq += 1;
    }
  } else if (boss.phase === 2) {
    moveToward(boss, targetX, targetY, boss.speed * 0.7, dt);
    boss.patternTimerSec += dt;
    if (boss.patternTimerSec >= OG_AREA_PERIOD_SEC) {
      boss.patternTimerSec -= OG_AREA_PERIOD_SEC;
      boss.areaSignalSeq += 1;
    }
  } else {
    boss.patternTimerSec += dt;
    if (boss.patternTimerSec >= OG_CHARGE_PERIOD_SEC) {
      boss.patternTimerSec -= OG_CHARGE_PERIOD_SEC;
      boss.chargeSignalSeq += 1;
    }
    moveToward(boss, targetX, targetY, boss.speed * 2.8, dt);
  }
}

function updateOganessonPhaseSignal(boss: BossEntity): void {
  if (boss.id !== 'oganesson') return;
  const nextPhase = resolveOganessonPhase(boss);
  if (nextPhase === boss.phase) return;
  boss.phase = nextPhase;
  boss.patternTimerSec = 0;
  boss.phaseChangeSignalSeq += 1;
}

function resolveOganessonPhase(boss: BossEntity): 1 | 2 | 3 {
  if (boss.hp > boss.maxHp * (2 / 3)) return 1;
  if (boss.hp > boss.maxHp * (1 / 3)) return 2;
  return 3;
}

function moveToward(
  boss: BossEntity,
  targetX: number,
  targetY: number,
  speed: number,
  dt: number,
): void {
  boss.prevX = boss.x;
  boss.prevY = boss.y;

  const toTargetX = targetX - boss.x;
  const toTargetY = targetY - boss.y;
  const distanceSq = toTargetX * toTargetX + toTargetY * toTargetY;
  if (distanceSq <= 0.0001) {
    boss.dx = 0;
    boss.dy = 0;
    return;
  }

  const invDistance = 1 / Math.sqrt(distanceSq);
  boss.dx = toTargetX * invDistance * speed;
  boss.dy = toTargetY * invDistance * speed;
  boss.x += boss.dx * dt;
  boss.y += boss.dy * dt;
}

function createBoss(): BossEntity {
  return {
    kind: 'boss',
    active: false,
    id: 'technetium',
    name: BOSSES.technetium.name,
    element: BOSSES.technetium.element,
    atomicNumber: BOSSES.technetium.atomicNumber,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    dx: 0,
    dy: 0,
    radius: 0,
    paletteGroup: 1,
    shape: ENTITY_SHAPES.circle,
    icon: '',
    paletteIndex: BOSSES.technetium.paletteIndex,
    symbol: BOSSES.technetium.element,
    accessoryKind: BOSSES.technetium.accessoryKind,
    hp: 0,
    maxHp: 0,
    speed: 0,
    contactDamage: 0,
    phase: 1,
    patternTimerSec: 0,
    movementTimerSec: 0,
    cloneSignalSeq: 0,
    cloneCount: 0,
    barrageSignalSeq: 0,
    barrageSplitCount: 0,
    teleportSignalSeq: 0,
    teleportX: 0,
    teleportY: 0,
    summonSignalSeq: 0,
    areaSignalSeq: 0,
    chargeSignalSeq: 0,
    phaseChangeSignalSeq: 0,
    rewardQueued: false,
    poolIndex: -1,
    poolSeq: 0,
  };
}

function resetBoss(boss: BossEntity): void {
  boss.active = false;
  boss.x = 0;
  boss.y = 0;
  boss.prevX = 0;
  boss.prevY = 0;
  boss.dx = 0;
  boss.dy = 0;
  boss.radius = 0;
  boss.hp = 0;
  boss.maxHp = 0;
  boss.speed = 0;
  boss.contactDamage = 0;
  resetBossPatternState(boss);
}

function resetBossPatternState(boss: BossEntity): void {
  boss.phase = 1;
  boss.patternTimerSec = 0;
  boss.movementTimerSec = 0;
  boss.cloneSignalSeq = 0;
  boss.cloneCount = 0;
  boss.barrageSignalSeq = 0;
  boss.barrageSplitCount = 0;
  boss.teleportSignalSeq = 0;
  boss.teleportX = 0;
  boss.teleportY = 0;
  boss.summonSignalSeq = 0;
  boss.areaSignalSeq = 0;
  boss.chargeSignalSeq = 0;
  boss.phaseChangeSignalSeq = 0;
  boss.rewardQueued = false;
}
