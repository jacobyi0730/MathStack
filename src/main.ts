import './styles.css';
import { createGameState, type GameState } from './engine/state.js';
import { createLoop, FIXED_DT } from './engine/loop.js';
import { createTimer } from './engine/timing.js';
import { createDebugOverlay } from './ui/debug-overlay.js';

/**
 * T-003 부트스트랩.
 *
 * 고정 타임스텝 루프를 붙이고, 그것이 실제로 도는지 눈으로 보이게 한다.
 * 실제 렌더러·캐릭터는 T-004, 입력은 T-006 에서 붙는다.
 */

const CELL = 48; // 주기율표 칸 (기획서 §5.3)
const COLORS = {
  field: '#1A1A2E',
  grid: '#252540',
  accent: '#FFC107',
  probe: '#00E5FF',
  muted: '#8888AA',
} as const;

/** 고정 타임스텝이 도는지 눈으로 확인하는 지표. 6초에 한 바퀴 */
const PROBE_PERIOD_SEC = 6;
const PROBE_RADIUS = 90;

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

function drawField(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = COLORS.field;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += CELL) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = 0; y <= h; y += CELL) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();
}

function drawProbe(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  alpha: number,
  cx: number,
  cy: number,
): void {
  // alpha 로 보간해 60Hz·144Hz 어디서든 같은 속도로 매끄럽게 돈다
  const t = state.elapsedSec + alpha * FIXED_DT;
  const angle = (t / PROBE_PERIOD_SEC) * Math.PI * 2;

  ctx.beginPath();
  ctx.arc(cx, cy, PROBE_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + Math.cos(angle) * PROBE_RADIUS, cy + Math.sin(angle) * PROBE_RADIUS, 9, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.probe;
  ctx.fill();
}

function drawLabels(ctx: CanvasRenderingContext2D, state: GameState, cx: number, cy: number): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = COLORS.accent;
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillText('MathStack', cx, cy - 8);

  ctx.fillStyle = COLORS.muted;
  ctx.font = '400 14px ui-monospace, monospace';
  ctx.fillText(`${state.elapsedSec.toFixed(2)}s · ${state.ticks} ticks`, cx, cy + 20);
  ctx.fillText('Space 일시정지 · D 계측 표시', cx, cy + PROBE_RADIUS + 40);
}

function bootstrap(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) throw new Error('#game 캔버스를 찾을 수 없습니다.');

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D 컨텍스트를 만들 수 없습니다.');

  const state = createGameState();
  const timer = createTimer();
  const overlay = createDebugOverlay();

  let size = resize(canvas);
  window.addEventListener('resize', () => {
    size = resize(canvas);
  });

  const loop = createLoop(state, {
    update(_state, _dt) {
      timer.begin('sim');
      // T-006 부터 이동·스폰·충돌 시스템이 여기 들어온다
      timer.end('sim');
    },

    render(s, alpha) {
      timer.begin('render');
      const cx = size.w / 2;
      const cy = size.h / 2;
      drawField(ctx, size.w, size.h);
      drawProbe(ctx, s, alpha, cx, cy);
      drawLabels(ctx, s, cx, cy);
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
