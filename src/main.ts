import './styles.css';
import { createGameState, type GameState } from './engine/state.js';
import { createLoop } from './engine/loop.js';
import { setupStressMode, stressModeEnabled } from './engine/stress.js';
import { createTimer } from './engine/timing.js';
import { createRenderer, type RenderScene } from './engine/renderer.js';
import { createDebugOverlay } from './ui/debug-overlay.js';
import { createInputController } from './engine/input.js';
import { createPlayer, syncPlayerIntent } from './entities/player.js';
import { BOSSES } from './data/bosses.js';
import { spawnBoss, updateBosses } from './entities/boss.js';
import { updateEnemies } from './systems/enemy-ai.js';
import { movePlayer } from './systems/movement.js';
import { updateSpawns } from './systems/spawn.js';
import { updateCollisions } from './systems/collision.js';
import { applyEnemyDamage, updatePlayerInvulnerability } from './systems/damage.js';
import { consumeCombatRewardsAsPickups, updatePickups } from './systems/pickup.js';
import { updateBossTimeline } from './systems/timeline.js';
import { equipWeapon, updateWeapons } from './systems/weapons.js';
import { recalcStats } from './systems/stats.js';
import { DEFAULT_CHARACTER_ID, getCharacterArchetype, type CharacterId } from './data/characters.js';

type RuntimeState = GameState & RenderScene;

function resize(canvas: HTMLCanvasElement): { w: number; h: number } {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h };
}

function readCharacterFromUrl(): CharacterId {
  const params = new URLSearchParams(window.location.search);
  const selected = params.get('character');
  if (selected === null) return DEFAULT_CHARACTER_ID;

  try {
    return getCharacterArchetype(selected as CharacterId).id;
  } catch {
    return DEFAULT_CHARACTER_ID;
  }
}

function createRuntimeState(): RuntimeState {
  const player = createPlayer(readCharacterFromUrl());
  const state = createGameState({ player });
  equipWeapon(state.weapons, 'hydrogen_arrow');
  applyResolvedStats(state);
  if (stressModeEnabled(window.location.search)) setupStressMode(state);
  return state;
}

function updateRuntimeState(state: RuntimeState, dt: number): void {
  syncPlayerIntent(state.player, state.input);
  movePlayer(state.player, dt, state.world);
  updateSpawns(state, dt);
  updateEnemies(state, dt);
  updateBossTimelineAndSpawns(state);
  updateBosses(state.bosses, state.player.x, state.player.y, dt);
  updatePlayerInvulnerability(state.player, dt);
  applyHealthRegen(state, dt);
}

function updateAfterCollisions(state: RuntimeState, dt: number): void {
  updateWeapons(state, state.weapons, dt);
  consumeCombatRewardsAsPickups(state.combat, state.pickups, state.player.x, state.player.y);
  updatePickups(state.pickups, state.player, state.level, state.pickupRuntime, dt);
  applyPendingMeteorDamage(state);
  state.entityCount =
    state.enemies.activeCount +
    state.weapons.projectiles.activeCount +
    state.pickups.activeCount +
    state.bosses.activeCount +
    1;
}

function applyResolvedStats(state: RuntimeState): void {
  state.stats = recalcStats(state.baseStats, state.passives);
  state.player.maxHealth = state.stats.maxHealth;
  if (state.player.health > state.player.maxHealth) state.player.health = state.player.maxHealth;
  state.player.moveSpeed = state.stats.moveSpeed;
  state.player.projectileCount = state.stats.projectileCount;
  state.player.attackPowerMultiplier = state.stats.attackPowerMultiplier;
  state.player.attackRangeMultiplier = state.stats.attackRangeMultiplier;
  state.player.rangeMultiplier = state.stats.attackRangeMultiplier;
  state.player.cooldownMultiplier = state.stats.cooldownMultiplier;
  state.pickupRuntime.baseMagnetRadius = state.stats.magnetRadius;
}

function applyHealthRegen(state: RuntimeState, dt: number): void {
  if (state.stats.healthRegenPerSec <= 0 || state.player.health <= 0) return;
  state.player.health = Math.min(
    state.player.maxHealth,
    state.player.health + state.stats.healthRegenPerSec * dt,
  );
}

function updateBossTimelineAndSpawns(state: RuntimeState): void {
  const event = updateBossTimeline(
    state.timeline,
    state.elapsedSec,
    state.player.health,
    state.timeline.resultFired && state.timeline.latestResultKind === 'victory',
  );
  if (event !== 'spawn_boss') return;

  const boss = state.bosses.acquire();
  const definition = BOSSES[state.timeline.latestBossId];
  spawnBoss(
    boss,
    definition,
    state.player.x + state.viewport.width * 0.35,
    state.player.y - state.viewport.height * 0.25,
  );
}

function applyPendingMeteorDamage(state: RuntimeState): void {
  const damage = state.pickupRuntime.pendingMeteorDamage;
  if (damage <= 0) return;
  state.pickupRuntime.pendingMeteorDamage = 0;

  for (let i = state.enemies.activeCount - 1; i >= 0; i -= 1) {
    applyEnemyDamage(state, state.enemies.items[i], damage);
  }
}

function bootstrap(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) throw new Error('#game 캔버스를 찾을 수 없습니다.');

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D 컨텍스트를 만들 수 없습니다.');

  const state = createRuntimeState();
  const timer = createTimer();
  const overlay = createDebugOverlay();
  const input = createInputController(canvas, state.input);

  let size = resize(canvas);
  state.viewport.width = size.w;
  state.viewport.height = size.h;
  const renderer = createRenderer(ctx, { width: size.w, height: size.h, dpr: Math.min(window.devicePixelRatio, 2) });
  window.addEventListener('resize', () => {
    size = resize(canvas);
    state.viewport.width = size.w;
    state.viewport.height = size.h;
    renderer.resize({ width: size.w, height: size.h, dpr: Math.min(window.devicePixelRatio, 2) });
  });

  const loop = createLoop(state, {
    update(baseState, dt) {
      timer.begin('sim');
      updateRuntimeState(baseState as RuntimeState, dt);
      timer.end('sim');
      timer.begin('collide');
      updateCollisions(baseState as RuntimeState, dt);
      updateAfterCollisions(baseState as RuntimeState, dt);
      timer.end('collide');
      if (state.level.queuedCount > 0) loop.pause();
    },

    render(baseState, alpha) {
      timer.begin('render');
      renderer.render(baseState as RuntimeState, alpha);
      timer.end('render');
    },

    onFrame(steps) {
      timer.endFrame(steps, state.entityCount, state.enemies.recycles);
      state.enemies.resetFrameStats();
      overlay.update(timer);
      timer.beginFrame();
    },
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (loop.paused) loop.resume();
      else loop.pause();
    }
    if (event.code === 'Backquote') overlay.toggle();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loop.resync();
  });

  window.addEventListener('beforeunload', () => {
    input.destroy();
  });

  timer.beginFrame();
  loop.start();
}

bootstrap();
