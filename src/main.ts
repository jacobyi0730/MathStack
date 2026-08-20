import './styles.css';
import { createGameState, type GameState } from './engine/state.js';
import { createLoop } from './engine/loop.js';
import { createTimer } from './engine/timing.js';
import { createRenderer, type RenderableEntity, type RenderScene } from './engine/renderer.js';
import { createDebugOverlay } from './ui/debug-overlay.js';
import { ENEMY_PALETTES, PLAYER_PALETTES } from './data/palette.js';

interface DemoState extends GameState, RenderScene {
  drift: number;
}

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

function createEntity(
  x: number,
  y: number,
  radius: number,
  paletteGroup: 0 | 1,
  paletteIndex: number,
  symbol: string,
  accessoryKind: number,
): RenderableEntity {
  return {
    x,
    y,
    prevX: x,
    prevY: y,
    radius,
    paletteGroup,
    paletteIndex,
    symbol,
    accessoryKind,
    dx: 0,
    dy: 0,
  };
}

function createDemoState(): DemoState {
  const player = createEntity(0, 0, 24, 0, 0, PLAYER_PALETTES[0].symbol, 0);
  const entities: RenderableEntity[] = [
    player,
    createEntity(-90, -56, 22, 0, 1, PLAYER_PALETTES[1].symbol, 1),
    createEntity(88, 44, 20, 0, 2, PLAYER_PALETTES[2].symbol, 2),
    createEntity(0, 112, 26, 0, 3, PLAYER_PALETTES[3].symbol, 0),
  ];

  for (let i = 0; i < 36; i += 1) {
    const angle = (i / 36) * Math.PI * 2;
    const radius = 260 + (i % 6) * 45;
    const paletteIndex = i % ENEMY_PALETTES.length;
    const enemyRadius = 12 + (i % 4) * 3;
    entities.push(
      createEntity(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        enemyRadius,
        1,
        paletteIndex,
        ENEMY_PALETTES[paletteIndex].symbol,
        i % 3,
      ),
    );
  }

  return {
    ...createGameState(),
    player,
    entities,
    drift: 0,
    entityCount: entities.length,
  };
}

function updateDemoState(state: DemoState, dt: number): void {
  state.drift += dt;

  for (let i = 0; i < state.entities.length; i += 1) {
    const entity = state.entities[i];
    entity.prevX = entity.x;
    entity.prevY = entity.y;
  }

  const t = state.elapsedSec + dt;
  const player = state.player;
  player.x = Math.cos(t * 0.65) * 140;
  player.y = Math.sin(t * 0.5) * 110;
  player.dx = player.x - player.prevX;
  player.dy = player.y - player.prevY;

  for (let i = 1; i < 4; i += 1) {
    const ally = state.entities[i] as RenderableEntity;
    const angle = t * 0.8 + i * 1.7;
    const radius = 78 + i * 18;
    ally.x = player.x + Math.cos(angle) * radius;
    ally.y = player.y + Math.sin(angle) * radius * 0.7;
    ally.dx = ally.x - ally.prevX;
    ally.dy = ally.y - ally.prevY;
  }

  for (let i = 4; i < state.entities.length; i += 1) {
    const enemy = state.entities[i] as RenderableEntity;
    const swarmIndex = i - 4;
    const angle = t * (0.25 + (swarmIndex % 5) * 0.05) + swarmIndex * 0.4;
    const ring = 220 + (swarmIndex % 6) * 52 + Math.sin(t + swarmIndex) * 18;
    enemy.x = player.x + Math.cos(angle) * ring;
    enemy.y = player.y + Math.sin(angle * 1.1) * ring * 0.82;
    enemy.dx = enemy.x - enemy.prevX;
    enemy.dy = enemy.y - enemy.prevY;
  }

  state.entityCount = state.entities.length;
}

function bootstrap(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) throw new Error('#game 캔버스를 찾을 수 없습니다.');

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D 컨텍스트를 만들 수 없습니다.');

  const state = createDemoState();
  const timer = createTimer();
  const overlay = createDebugOverlay();

  let size = resize(canvas);
  const renderer = createRenderer(ctx, { width: size.w, height: size.h, dpr: Math.min(window.devicePixelRatio, 2) });
  window.addEventListener('resize', () => {
    size = resize(canvas);
    renderer.resize({ width: size.w, height: size.h, dpr: Math.min(window.devicePixelRatio, 2) });
  });

  const loop = createLoop(state, {
    update(baseState, dt) {
      timer.begin('sim');
      updateDemoState(baseState as DemoState, dt);
      timer.end('sim');
    },

    render(baseState, alpha) {
      timer.begin('render');
      renderer.render(baseState as DemoState, alpha);
      timer.end('render');
    },

    onFrame(steps) {
      timer.endFrame(steps, state.entityCount, 0);
      overlay.update(timer);
      timer.beginFrame();
    },
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (loop.paused) loop.resume();
      else loop.pause();
    }
    if (e.code === 'KeyD') overlay.toggle();
  });

  // 탭이 백그라운드로 갔다 오면 델타가 크게 튄다. 그 프레임은 버린다
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loop.resync();
  });

  timer.beginFrame();
  loop.start();
}

bootstrap();
