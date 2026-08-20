import './styles.css';
import { createGameState, type GameState } from './engine/state.js';
import { createLoop } from './engine/loop.js';
import { createTimer } from './engine/timing.js';
import { createRenderer, type RenderScene } from './engine/renderer.js';
import { createDebugOverlay } from './ui/debug-overlay.js';
import { createInputController } from './engine/input.js';
import { createPlayer, syncPlayerIntent } from './entities/player.js';
import { movePlayer } from './systems/movement.js';
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
  return createGameState({ player });
}

function updateRuntimeState(state: RuntimeState, dt: number): void {
  syncPlayerIntent(state.player, state.input);
  movePlayer(state.player, dt, state.world);
  state.entityCount = state.entities.length;
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
  const renderer = createRenderer(ctx, { width: size.w, height: size.h, dpr: Math.min(window.devicePixelRatio, 2) });
  window.addEventListener('resize', () => {
    size = resize(canvas);
    renderer.resize({ width: size.w, height: size.h, dpr: Math.min(window.devicePixelRatio, 2) });
  });

  const loop = createLoop(state, {
    update(baseState, dt) {
      timer.begin('sim');
      updateRuntimeState(baseState as RuntimeState, dt);
      timer.end('sim');
    },

    render(baseState, alpha) {
      timer.begin('render');
      renderer.render(baseState as RuntimeState, alpha);
      timer.end('render');
    },

    onFrame(steps) {
      timer.endFrame(steps, state.entityCount, 0);
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
