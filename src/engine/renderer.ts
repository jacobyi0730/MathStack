import {
  ENEMY_PALETTES,
  ENTITY_SHAPES,
  FIELD_COLORS,
  FIELD_CHAPTER_COLORS,
  ICON_FONT_STACK,
  ITEM_PALETTES,
  PLAYER_PALETTES,
  SPRITE_SPEC,
  WORLD_CELL_SIZE,
  type CharacterPalette,
  type EntityShape,
} from '../data/palette.js';
import {
  createSpriteFrameScratch,
  writeSpriteFrame,
  type DirectionLike,
} from '../entities/sprite.js';
import {
  DAMAGE_NUMBER_KIND_PLAYER,
  DAMAGE_NUMBER_KIND_STRONG,
  damageNumberScale,
  type DamageNumberPool,
} from '../entities/damage-number.js';
import {
  HAZARD_COLORS,
  HAZARD_METEOR,
  HAZARD_WARNING_COLOR,
  hazardWarnProgress,
  type HazardEntity,
  type HazardPool,
} from '../entities/hazard.js';
import type { Particle } from '../entities/particle.js';
import { shockwaveProgress, type Shockwave } from '../entities/shockwave.js';
import { HIT_FLASH_SEC, type EffectsState } from './effects.js';
import { createCameraState, interpolatePosition, isCircleVisible, worldToScreen, type CameraTarget } from './camera.js';
import { shortestDeltaX, shortestDeltaY, type WorldBounds } from './world.js';

export interface RenderableEntity extends CameraTarget, DirectionLike {
  radius: number;
  paletteGroup: 0 | 1 | 2;
  paletteIndex: number;
  symbol: string;
  accessoryKind: number;
  /** 원(생물) / 네모(상자) / 아이콘(아이템·투사체) / 장판(오라·파동) */
  shape: EntityShape;
  /** `shape` 가 icon 일 때 몸통 한가운데 얹을 이모지. 그 외에는 빈 문자열 */
  icon: string;
  /**
   * 피격 섬광 잔여 시간(초). 0 보다 크면 몸통 위에 흰 막이 덮인다.
   *
   * 적 300체가 뒤엉킨 화면에서 **내 공격이 닿았는지**를 알려 주는 유일한 신호다.
   * 데미지 숫자는 겹치면 읽히지 않지만 흰 섬광은 겹쳐도 읽힌다.
   */
  flashSec: number;
}

export interface RenderScene {
  player: RenderableEntity;
  entities: readonly RenderableEntity[];
  damageNumbers: DamageNumberPool;
  /** 화면 흔들림·파편·섬광. 없으면 아무것도 그리지 않는다 */
  effects: EffectsState;
  /** 보스 탄과 장판. 엔티티 목록에 넣지 않고 전용 패스로 그린다 */
  bossHazards: { readonly bullets: HazardPool; readonly fields: HazardPool };
  world: WorldBounds;
  elapsedSec: number;
}

export interface RendererViewport {
  width: number;
  height: number;
  dpr: number;
}

interface BatchBucket {
  paletteIndex: number;
  radius: number;
  count: number;
  paletteGroup: 0 | 1 | 2;
}

/** 아이콘도 몸통은 원이다. 배지를 배치에서 빼면 투사체 200개에서 드로우콜이 터진다 */
function hasCircleBody(shape: number): boolean {
  return shape === ENTITY_SHAPES.circle || shape === ENTITY_SHAPES.icon;
}

const MAX_BATCHES = 64;
const MAX_VISIBLE = 1024;
/** 피격 섬광 알파 단계 수. 늘릴수록 부드럽고 드로우콜이 는다 */
const FLASH_BUCKETS = 4;
const MAX_FLASH_ALPHA = 0.78;

function quantizeFlash(flashSec: number): number {
  const t = flashSec / HIT_FLASH_SEC;
  const bucket = Math.ceil((t > 1 ? 1 : t) * FLASH_BUCKETS);
  return bucket < 1 ? 1 : bucket;
}

export interface Renderer {
  resize(viewport: RendererViewport): void;
  render(scene: RenderScene, alpha: number): void;
}

export function createRenderer(ctx: CanvasRenderingContext2D, viewport: RendererViewport): Renderer {
  const bodyBatches: BatchBucket[] = new Array<BatchBucket>(MAX_BATCHES);
  const outlineBatches: BatchBucket[] = new Array<BatchBucket>(MAX_BATCHES);
  for (let i = 0; i < MAX_BATCHES; i += 1) {
    bodyBatches[i] = { paletteIndex: -1, radius: 0, count: 0, paletteGroup: 0 };
    outlineBatches[i] = { paletteIndex: -1, radius: 0, count: 0, paletteGroup: 0 };
  }

  const centersX = new Float32Array(MAX_VISIBLE);
  const centersY = new Float32Array(MAX_VISIBLE);
  const shadowX = new Float32Array(MAX_VISIBLE);
  const shadowY = new Float32Array(MAX_VISIBLE);
  const shadowRadiusX = new Float32Array(MAX_VISIBLE);
  const shadowRadiusY = new Float32Array(MAX_VISIBLE);
  const eyeLeftX = new Float32Array(MAX_VISIBLE);
  const eyeRightX = new Float32Array(MAX_VISIBLE);
  const eyeY = new Float32Array(MAX_VISIBLE);
  const eyeRadius = new Float32Array(MAX_VISIBLE);
  const pupilLeftX = new Float32Array(MAX_VISIBLE);
  const pupilRightX = new Float32Array(MAX_VISIBLE);
  const pupilY = new Float32Array(MAX_VISIBLE);
  const pupilRadius = new Float32Array(MAX_VISIBLE);
  const symbolX = new Float32Array(MAX_VISIBLE);
  const symbolY = new Float32Array(MAX_VISIBLE);
  const symbolFont = new Float32Array(MAX_VISIBLE);
  const accessoryX = new Float32Array(MAX_VISIBLE);
  const accessoryY = new Float32Array(MAX_VISIBLE);
  const accessoryR = new Float32Array(MAX_VISIBLE);
  const accessoryKind = new Int8Array(MAX_VISIBLE);
  const symbolText = new Array<string>(MAX_VISIBLE);
  const iconText = new Array<string>(MAX_VISIBLE);
  const shapeByVisible = new Int8Array(MAX_VISIBLE);
  const paletteGroupByVisible = new Int8Array(MAX_VISIBLE);
  const paletteIndexByVisible = new Int8Array(MAX_VISIBLE);
  const bodyRadiusByVisible = new Float32Array(MAX_VISIBLE);
  const outlineRadiusByVisible = new Float32Array(MAX_VISIBLE);
  const flashByVisible = new Float32Array(MAX_VISIBLE);

  let width = viewport.width;
  let height = viewport.height;
  let dpr = viewport.dpr;
  const sprite = createSpriteFrameScratch();
  const emptyDirection: DirectionLike = { dx: 0, dy: 0 };
  const hazardScratch = { x: 0, y: 0 };
  let vignette: CanvasGradient | undefined;
  let vignetteWidth = 0;
  let vignetteHeight = 0;

  function resetBatches(batches: BatchBucket[]): void {
    for (let i = 0; i < MAX_BATCHES; i += 1) {
      batches[i].count = 0;
      batches[i].paletteIndex = -1;
      batches[i].radius = 0;
      batches[i].paletteGroup = 0;
    }
  }

  function resolvePalette(group: 0 | 1 | 2, index: number): CharacterPalette {
    if (group === 0) return PLAYER_PALETTES[index] ?? PLAYER_PALETTES[0];
    if (group === 2) return ITEM_PALETTES[index] ?? ITEM_PALETTES[0];
    return ENEMY_PALETTES[index] ?? ENEMY_PALETTES[0];
  }

  function findBatch(
    batches: BatchBucket[],
    batchCount: number,
    group: 0 | 1 | 2,
    paletteIndex: number,
    radius: number,
  ): number {
    for (let i = 0; i < batchCount; i += 1) {
      const batch = batches[i];
      if (batch.paletteGroup === group && batch.paletteIndex === paletteIndex && batch.radius === radius) {
        return i;
      }
    }

    const batch = batches[batchCount];
    if (!batch) return -1;
    batch.paletteGroup = group;
    batch.paletteIndex = paletteIndex;
    batch.radius = radius;
    batch.count = 0;
    return batchCount;
  }

  function darkenHex(hex: string): string {
    const rgb = hex.slice(1);
    const r = Math.round(parseInt(rgb.slice(0, 2), 16) * (1 - SPRITE_SPEC.outlineDarkenRatio));
    const g = Math.round(parseInt(rgb.slice(2, 4), 16) * (1 - SPRITE_SPEC.outlineDarkenRatio));
    const b = Math.round(parseInt(rgb.slice(4, 6), 16) * (1 - SPRITE_SPEC.outlineDarkenRatio));
    return `rgb(${r} ${g} ${b})`;
  }

  function drawGrid(cameraCenterX: number, cameraCenterY: number, elapsedSec: number): void {
    const chapter = resolveChapterIndex(elapsedSec);
    const colors = FIELD_CHAPTER_COLORS[chapter];
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    const left = cameraCenterX - width * 0.5;
    const top = cameraCenterY - height * 0.5;
    const startX = -((left % WORLD_CELL_SIZE) + WORLD_CELL_SIZE) % WORLD_CELL_SIZE;
    const startY = -((top % WORLD_CELL_SIZE) + WORLD_CELL_SIZE) % WORLD_CELL_SIZE;

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x <= width; x += WORLD_CELL_SIZE) {
      ctx.moveTo(Math.floor(x) + 0.5, 0);
      ctx.lineTo(Math.floor(x) + 0.5, height);
    }
    for (let y = startY; y <= height; y += WORLD_CELL_SIZE) {
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(width, Math.floor(y) + 0.5);
    }
    ctx.stroke();
  }

  function resolveChapterIndex(elapsedSec: number): 0 | 1 | 2 {
    if (elapsedSec >= 360) return 2;
    if (elapsedSec >= 180) return 1;
    return 0;
  }

  function drawBodies(batches: BatchBucket[], batchCount: number, outline: boolean): void {
    for (let i = 0; i < batchCount; i += 1) {
      const batch = batches[i];
      if (batch.count === 0) continue;
      const palette = resolvePalette(batch.paletteGroup, batch.paletteIndex);
      ctx.fillStyle = outline ? darkenHex(palette.body) : palette.body;
      ctx.beginPath();
      for (let j = 0; j < visibleCountRef.value; j += 1) {
        if (!hasCircleBody(shapeByVisible[j] as number)) continue;
        if (paletteGroupByVisible[j] !== batch.paletteGroup) continue;
        if (paletteIndexByVisible[j] !== batch.paletteIndex) continue;
        const radius = outline ? outlineRadiusByVisible[j] : bodyRadiusByVisible[j];
        if (radius !== batch.radius) continue;
        ctx.moveTo(centersX[j] + batch.radius, centersY[j]);
        ctx.arc(centersX[j], centersY[j], batch.radius, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  /**
   * 피격 섬광.
   *
   * 알파를 **네 단계로 양자화**해 경로 네 개로 그린다. 개별 알파를 그대로 쓰면
   * 운석 한 방에 적 300체가 동시에 반짝일 때 `fill()` 이 300번 나간다.
   */
  function drawHitFlashes(count: number): void {
    ctx.fillStyle = '#FFFFFF';
    for (let bucket = FLASH_BUCKETS; bucket >= 1; bucket -= 1) {
      const alpha = (bucket / FLASH_BUCKETS) * MAX_FLASH_ALPHA;
      let opened = false;
      for (let i = 0; i < count; i += 1) {
        const flash = flashByVisible[i] as number;
        if (flash <= 0) continue;
        if (quantizeFlash(flash) !== bucket) continue;
        if (!opened) {
          ctx.beginPath();
          opened = true;
        }
        const radius = bodyRadiusByVisible[i] as number;
        ctx.moveTo(centersX[i] + radius, centersY[i]);
        ctx.arc(centersX[i], centersY[i], radius, 0, Math.PI * 2);
      }
      if (!opened) continue;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShadows(count: number): void {
    ctx.fillStyle = FIELD_COLORS.shadow;
    for (let i = 0; i < count; i += 1) {
      if (shapeByVisible[i] === ENTITY_SHAPES.field) continue;
      ctx.beginPath();
      ctx.ellipse(shadowX[i], shadowY[i], shadowRadiusX[i], shadowRadiusY[i], 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 눈은 **살아 있는 것에만** 붙인다. 상자와 아이템에 눈이 붙으면 적으로 읽힌다 */
  function drawEyes(count: number): void {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      if (shapeByVisible[i] !== ENTITY_SHAPES.circle) continue;
      ctx.moveTo(eyeLeftX[i] + eyeRadius[i], eyeY[i]);
      ctx.arc(eyeLeftX[i], eyeY[i], eyeRadius[i], 0, Math.PI * 2);
      ctx.moveTo(eyeRightX[i] + eyeRadius[i], eyeY[i]);
      ctx.arc(eyeRightX[i], eyeY[i], eyeRadius[i], 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.fillStyle = '#111111';
    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      if (shapeByVisible[i] !== ENTITY_SHAPES.circle) continue;
      ctx.moveTo(pupilLeftX[i] + pupilRadius[i], pupilY[i]);
      ctx.arc(pupilLeftX[i], pupilY[i], pupilRadius[i], 0, Math.PI * 2);
      ctx.moveTo(pupilRightX[i] + pupilRadius[i], pupilY[i]);
      ctx.arc(pupilRightX[i], pupilY[i], pupilRadius[i], 0, Math.PI * 2);
    }
    ctx.fill();
  }

  function drawAccessories(count: number): void {
    ctx.lineWidth = SPRITE_SPEC.accessoryStrokeWidthPx;
    for (let i = 0; i < count; i += 1) {
      if (shapeByVisible[i] !== ENTITY_SHAPES.circle) continue;
      const palette = resolvePalette(
        paletteGroupByVisible[i] as 0 | 1 | 2,
        paletteIndexByVisible[i] as number,
      );
      ctx.strokeStyle = palette.accessory;
      ctx.beginPath();
      if (accessoryKind[i] === 0) {
        ctx.arc(accessoryX[i], accessoryY[i], accessoryR[i], 0.2, Math.PI * 1.8);
      } else if (accessoryKind[i] === 1) {
        ctx.moveTo(accessoryX[i] - accessoryR[i], accessoryY[i]);
        ctx.lineTo(accessoryX[i] + accessoryR[i], accessoryY[i]);
      } else if (accessoryKind[i] === 2) {
        ctx.moveTo(accessoryX[i], accessoryY[i] - accessoryR[i]);
        ctx.lineTo(accessoryX[i], accessoryY[i] + accessoryR[i]);
      } else if (accessoryKind[i] === 3) {
        ctx.moveTo(accessoryX[i] - accessoryR[i], accessoryY[i]);
        ctx.lineTo(accessoryX[i] + accessoryR[i], accessoryY[i]);
        ctx.moveTo(accessoryX[i], accessoryY[i] - accessoryR[i]);
        ctx.lineTo(accessoryX[i], accessoryY[i] + accessoryR[i]);
      } else if (accessoryKind[i] === 4) {
        ctx.rect(
          accessoryX[i] - accessoryR[i] * 0.6,
          accessoryY[i] - accessoryR[i] * 0.6,
          accessoryR[i] * 1.2,
          accessoryR[i] * 1.2,
        );
      } else if (accessoryKind[i] === 5) {
        ctx.moveTo(accessoryX[i], accessoryY[i] - accessoryR[i]);
        ctx.lineTo(accessoryX[i] + accessoryR[i] * 0.86, accessoryY[i] + accessoryR[i] * 0.5);
        ctx.lineTo(accessoryX[i] - accessoryR[i] * 0.86, accessoryY[i] + accessoryR[i] * 0.5);
        ctx.closePath();
      } else if (accessoryKind[i] === 6) {
        ctx.arc(accessoryX[i], accessoryY[i], accessoryR[i] * 0.55, 0, Math.PI * 2);
        ctx.moveTo(accessoryX[i] - accessoryR[i], accessoryY[i]);
        ctx.lineTo(accessoryX[i] + accessoryR[i], accessoryY[i]);
      } else {
        ctx.moveTo(accessoryX[i] - accessoryR[i], accessoryY[i] - accessoryR[i]);
        ctx.lineTo(accessoryX[i] + accessoryR[i], accessoryY[i] + accessoryR[i]);
        ctx.moveTo(accessoryX[i] + accessoryR[i], accessoryY[i] - accessoryR[i]);
        ctx.lineTo(accessoryX[i] - accessoryR[i], accessoryY[i] + accessoryR[i]);
      }
      ctx.stroke();
    }
  }

  /** 상자: 둥근 네모 + 뚜껑선 + 세로 끈. 눈이 없어 "살아 있지 않은 것"으로 읽힌다 */
  function drawBoxes(count: number): void {
    for (let i = 0; i < count; i += 1) {
      if (shapeByVisible[i] !== ENTITY_SHAPES.box) continue;
      const palette = resolvePalette(
        paletteGroupByVisible[i] as 0 | 1 | 2,
        paletteIndexByVisible[i] as number,
      );
      const radius = bodyRadiusByVisible[i] as number;
      const outline = SPRITE_SPEC.outlineWidthPx;
      const corner = radius * SPRITE_SPEC.boxCornerRadiusRatio;

      ctx.fillStyle = darkenHex(palette.body);
      traceRoundedSquare(centersX[i], centersY[i], radius + outline, corner + outline);
      ctx.fill();

      ctx.fillStyle = palette.body;
      traceRoundedSquare(centersX[i], centersY[i], radius, corner);
      ctx.fill();

      const lidY = centersY[i] - radius * SPRITE_SPEC.boxLidOffsetRatio;
      ctx.strokeStyle = palette.accessory;
      ctx.lineWidth = SPRITE_SPEC.boxStrapWidthPx;
      ctx.beginPath();
      ctx.moveTo(centersX[i] - radius, lidY);
      ctx.lineTo(centersX[i] + radius, lidY);
      ctx.moveTo(centersX[i], lidY);
      ctx.lineTo(centersX[i], centersY[i] + radius);
      ctx.stroke();
    }
  }

  /** 장판: 반투명 채우기 + 밝은 테두리. 아래 적이 비쳐야 조준이 된다 */
  function drawFields(count: number): void {
    for (let i = 0; i < count; i += 1) {
      if (shapeByVisible[i] !== ENTITY_SHAPES.field) continue;
      const palette = resolvePalette(
        paletteGroupByVisible[i] as 0 | 1 | 2,
        paletteIndexByVisible[i] as number,
      );
      const radius = bodyRadiusByVisible[i] as number;

      ctx.globalAlpha = SPRITE_SPEC.fieldFillAlpha;
      ctx.fillStyle = palette.body;
      ctx.beginPath();
      ctx.arc(centersX[i], centersY[i], radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = palette.accessory;
      ctx.lineWidth = SPRITE_SPEC.fieldRingWidthPx;
      ctx.beginPath();
      ctx.arc(centersX[i], centersY[i], radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /**
   * 아이콘 위에 얹는 이모지.
   *
   * 배지(원)는 일반 원과 같은 배치 경로에서 이미 그려졌다 — 투사체가 200개까지 가므로
   * 여기서 개별로 원을 그리면 배치가 통째로 무너진다. 이 패스는 글자만 얹는다.
   */
  function drawIcons(count: number): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 캔버스에서 `font` 대입은 비싸다. 크기를 정수로 맞추고 바뀔 때만 갈아 끼운다
    let lastFontSize = -1;
    for (let i = 0; i < count; i += 1) {
      if (shapeByVisible[i] !== ENTITY_SHAPES.icon) continue;
      const icon = iconText[i];
      if (!icon) continue;
      const size = clampIconFontSize((bodyRadiusByVisible[i] as number) * SPRITE_SPEC.iconFontSizeRatio);
      if (size !== lastFontSize) {
        ctx.font = String(size) + 'px ' + ICON_FONT_STACK;
        lastFontSize = size;
      }
      ctx.fillText(icon, centersX[i], centersY[i]);
    }
  }

  function clampIconFontSize(size: number): number {
    if (size < SPRITE_SPEC.iconMinFontSizePx) return SPRITE_SPEC.iconMinFontSizePx;
    if (size > SPRITE_SPEC.iconMaxFontSizePx) return SPRITE_SPEC.iconMaxFontSizePx;
    return Math.round(size);
  }

  /** `roundRect` 가 없는 환경에서도 그려지도록 경로를 직접 만든다 */
  function traceRoundedSquare(centerX: number, centerY: number, half: number, corner: number): void {
    const clamped = Math.min(corner, half);
    ctx.beginPath();
    ctx.moveTo(centerX - half + clamped, centerY - half);
    ctx.lineTo(centerX + half - clamped, centerY - half);
    ctx.quadraticCurveTo(centerX + half, centerY - half, centerX + half, centerY - half + clamped);
    ctx.lineTo(centerX + half, centerY + half - clamped);
    ctx.quadraticCurveTo(centerX + half, centerY + half, centerX + half - clamped, centerY + half);
    ctx.lineTo(centerX - half + clamped, centerY + half);
    ctx.quadraticCurveTo(centerX - half, centerY + half, centerX - half, centerY + half - clamped);
    ctx.lineTo(centerX - half, centerY - half + clamped);
    ctx.quadraticCurveTo(centerX - half, centerY - half, centerX - half + clamped, centerY - half);
    ctx.closePath();
  }

  function drawSymbols(count: number): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < count; i += 1) {
      if (shapeByVisible[i] === ENTITY_SHAPES.field) continue;
      const label = symbolText[i];
      if (!label) continue;
      const palette = resolvePalette(
        paletteGroupByVisible[i] as 0 | 1 | 2,
        paletteIndexByVisible[i] as number,
      );
      ctx.fillStyle = palette.accessory || FIELD_COLORS.symbol;
      ctx.font = `700 ${symbolFont[i]}px "Pretendard", "Segoe UI", sans-serif`;
      ctx.fillText(label, symbolX[i], symbolY[i]);
    }
  }

  /**
   * 충격파 고리.
   *
   * 동시에 24개가 상한이라 배치하지 않는다 — 색과 두께가 제각각이라
   * 묶어도 얻는 게 없다.
   */
  function drawShockwaves(scene: RenderScene, camera: ReturnType<typeof createCameraState>): void {
    const pool = scene.effects.shockwaves;
    if (pool.activeCount === 0) return;

    for (let i = 0; i < pool.items.length; i += 1) {
      const item = pool.items[i] as Shockwave;
      if (!item.active) continue;

      const t = shockwaveProgress(item);
      const radius = item.startRadius + (item.endRadius - item.startRadius) * t;
      const renderX = camera.centerX + shortestDeltaX(camera.centerX, item.x, scene.world);
      const renderY = camera.centerY + shortestDeltaY(camera.centerY, item.y, scene.world);
      if (!isCircleVisible(camera, renderX, renderY, radius)) continue;

      const screen = worldToScreen(camera, renderX, renderY);
      const fade = 1 - t;

      if (item.fillAlpha > 0) {
        ctx.globalAlpha = item.fillAlpha * fade;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = fade;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = Math.max(1, item.width * fade);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** 파편은 색이 몇 종류 안 된다. 같은 색끼리 하나의 경로로 묶는다 */
  function drawParticles(scene: RenderScene, camera: ReturnType<typeof createCameraState>, alpha: number): void {
    const pool = scene.effects.particles;
    if (pool.activeCount === 0) return;

    let lastColor = '';
    let opened = false;
    for (let i = 0; i < pool.items.length; i += 1) {
      const item = pool.items[i] as Particle;
      if (!item.active) continue;

      const world = interpolatePosition(item.prevX, item.prevY, item.x, item.y, alpha);
      const renderX = camera.centerX + shortestDeltaX(camera.centerX, world.x, scene.world);
      const renderY = camera.centerY + shortestDeltaY(camera.centerY, world.y, scene.world);
      if (!isCircleVisible(camera, renderX, renderY, item.radius)) continue;

      const fade = item.maxLifeSec > 0 ? item.lifeSec / item.maxLifeSec : 0;
      const radius = Math.max(0.6, item.radius * (0.4 + fade * 0.6));
      const screen = worldToScreen(camera, renderX, renderY);

      if (item.color !== lastColor) {
        if (opened) ctx.fill();
        ctx.fillStyle = item.color;
        ctx.beginPath();
        lastColor = item.color;
        opened = true;
      }
      ctx.moveTo(screen.x + radius, screen.y);
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    }
    if (opened) ctx.fill();
  }

  /**
   * 장판과 유성 — 엔티티 **아래**에 깔린다.
   *
   * 전조 중에는 노란 경고색이고, 채워지는 안쪽 원이 남은 시간을 보여 준다.
   * 발동하면 자기 색으로 바뀐다 — **색이 바뀌는 순간이 곧 아파지는 순간**이다.
   */
  function drawHazardFields(scene: RenderScene, camera: ReturnType<typeof createCameraState>): void {
    const pool = scene.bossHazards.fields;
    if (pool.activeCount === 0) return;

    for (let i = 0; i < pool.activeCount; i += 1) {
      const field = pool.items[i] as HazardEntity;
      const screen = projectHazard(scene, camera, field);
      if (screen === undefined) continue;

      const warning = field.warnSec > 0;
      const colors = warning
        ? HAZARD_WARNING_COLOR
        : (HAZARD_COLORS[field.colorIndex] ?? HAZARD_COLORS[0]);

      if (warning) {
        const progress = hazardWarnProgress(field);
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = colors.fill;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, field.radius, 0, Math.PI * 2);
        ctx.fill();

        // 안쪽 원이 바깥과 만나는 순간 터진다. 남은 시간이 눈으로 세어진다
        ctx.globalAlpha = 0.38;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, field.radius * progress, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const fade = field.maxLifeSec > 0 ? field.lifeSec / field.maxLifeSec : 1;
        ctx.globalAlpha = 0.3 * (field.hazardKind === HAZARD_METEOR ? 1 : 0.6 + fade * 0.4);
        ctx.fillStyle = colors.fill;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, field.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors.ring;
      ctx.lineWidth = warning ? 4 : 3;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, field.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** 보스 탄 — 엔티티 **위**다. 적 뒤에 숨은 탄은 피할 수 없다 */
  function drawHazardBullets(
    scene: RenderScene,
    camera: ReturnType<typeof createCameraState>,
    alpha: number,
  ): void {
    const pool = scene.bossHazards.bullets;
    if (pool.activeCount === 0) return;

    const colors = HAZARD_COLORS[0];
    ctx.fillStyle = colors.fill;
    ctx.beginPath();
    for (let i = 0; i < pool.activeCount; i += 1) {
      const bullet = pool.items[i] as HazardEntity;
      const screen = projectHazard(scene, camera, bullet, alpha);
      if (screen === undefined) continue;
      ctx.moveTo(screen.x + bullet.radius, screen.y);
      ctx.arc(screen.x, screen.y, bullet.radius, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.strokeStyle = colors.ring;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < pool.activeCount; i += 1) {
      const bullet = pool.items[i] as HazardEntity;
      const screen = projectHazard(scene, camera, bullet, alpha);
      if (screen === undefined) continue;
      ctx.moveTo(screen.x + bullet.radius, screen.y);
      ctx.arc(screen.x, screen.y, bullet.radius, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  /** 화면 밖이면 `undefined`. 반환 객체는 스크래치라 다음 호출이 덮어쓴다 */
  function projectHazard(
    scene: RenderScene,
    camera: ReturnType<typeof createCameraState>,
    hazard: HazardEntity,
    alpha = 1,
  ): { x: number; y: number } | undefined {
    const worldX = hazard.prevX + (hazard.x - hazard.prevX) * alpha;
    const worldY = hazard.prevY + (hazard.y - hazard.prevY) * alpha;
    const renderX = camera.centerX + shortestDeltaX(camera.centerX, worldX, scene.world);
    const renderY = camera.centerY + shortestDeltaY(camera.centerY, worldY, scene.world);
    if (!isCircleVisible(camera, renderX, renderY, hazard.radius)) return undefined;

    const screen = worldToScreen(camera, renderX, renderY);
    hazardScratch.x = screen.x;
    hazardScratch.y = screen.y;
    return hazardScratch;
  }

  /**
   * 주인공 피격 비네트와 전체 백색 섬광.
   *
   * 흔들림과 달리 **화면 좌표**에 그린다 — 흔들리는 비네트는 멀미를 만든다.
   */
  function drawScreenFlashes(effects: EffectsState): void {
    if (effects.whiteFlash > 0) {
      ctx.globalAlpha = effects.whiteFlash * 0.65;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    if (effects.damageFlash > 0) {
      ctx.globalAlpha = Math.min(1, effects.damageFlash);
      ctx.fillStyle = resolveVignette();
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }

  /** 그라디언트 생성은 비싸다. 크기가 바뀔 때만 다시 만든다 */
  function resolveVignette(): CanvasGradient {
    if (vignette !== undefined && vignetteWidth === width && vignetteHeight === height) {
      return vignette;
    }
    const radius = Math.max(width, height) * 0.72;
    const gradient = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      radius * 0.35,
      width * 0.5,
      height * 0.5,
      radius,
    );
    gradient.addColorStop(0, 'rgba(220, 38, 38, 0)');
    gradient.addColorStop(0.65, 'rgba(220, 38, 38, 0.35)');
    gradient.addColorStop(1, 'rgba(185, 28, 28, 0.85)');
    vignette = gradient;
    vignetteWidth = width;
    vignetteHeight = height;
    return gradient;
  }

  /**
   * 데미지 숫자.
   *
   * 종류마다 색과 크기가 다르다 — 노랑은 평범한 타격, 주황은 큰 한 방,
   * 붉은색은 **내가 맞은 것**이다. 셋이 같은 색이면 화면에서 아무 정보도 나오지 않는다.
   */
  function drawDamageNumbers(scene: RenderScene, camera: ReturnType<typeof createCameraState>): void {
    if (scene.damageNumbers.activeCount === 0) return;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#111827';

    let lastFontSize = -1;
    for (let i = 0; i < scene.damageNumbers.items.length; i += 1) {
      const item = scene.damageNumbers.items[i];
      if (!item.active) continue;

      const renderX = camera.centerX + shortestDeltaX(camera.centerX, item.x, scene.world);
      const renderY = camera.centerY + shortestDeltaY(camera.centerY, item.y, scene.world);
      if (!isCircleVisible(camera, renderX, renderY, 32)) continue;

      const screen = worldToScreen(camera, renderX, renderY);
      const life = item.maxLifeSec > 0 ? item.lifeSec / item.maxLifeSec : 0;
      const base =
        item.kind === DAMAGE_NUMBER_KIND_PLAYER ? 24 : item.kind === DAMAGE_NUMBER_KIND_STRONG ? 26 : 18;
      // `font` 대입은 비싸다. 정수로 반올림해 같은 크기끼리 붙여 그린다
      const size = Math.round(base * damageNumberScale(item));
      if (size !== lastFontSize) {
        ctx.font = '800 ' + String(size) + 'px "Pretendard", "Segoe UI", sans-serif';
        lastFontSize = size;
      }

      ctx.globalAlpha = life < 0 ? 0 : life > 1 ? 1 : life;
      ctx.fillStyle =
        item.kind === DAMAGE_NUMBER_KIND_PLAYER
          ? '#FF6B6B'
          : item.kind === DAMAGE_NUMBER_KIND_STRONG
            ? '#FFA726'
            : '#FFE082';
      const text = String(item.value);
      ctx.strokeText(text, screen.x, screen.y);
      ctx.fillText(text, screen.x, screen.y);
    }
    ctx.globalAlpha = 1;
  }

  const visibleCountRef = { value: 0 };

  return {
    resize(nextViewport: RendererViewport): void {
      width = nextViewport.width;
      height = nextViewport.height;
      dpr = nextViewport.dpr;
    },

    render(scene: RenderScene, alpha: number): void {
      const camera = createCameraState({ width, height }, scene.player, alpha);
      // 흔들림은 카메라 중심을 옮기는 것으로 끝난다. 이 아래 모든 월드 좌표가 함께 흔들린다
      camera.centerX += scene.effects.shakeX;
      camera.centerY += scene.effects.shakeY;
      drawGrid(camera.centerX, camera.centerY, scene.elapsedSec);

      resetBatches(bodyBatches);
      resetBatches(outlineBatches);

      let visibleCount = 0;
      let bodyBatchCount = 0;
      let outlineBatchCount = 0;
      const total = scene.entities.length;

      for (let i = 0; i < total; i += 1) {
        const entity = scene.entities[i];
        if (!entity) continue;
        if (entity.radius <= 0) continue;

        const world = interpolatePosition(entity.prevX, entity.prevY, entity.x, entity.y, alpha);
        const renderX = camera.centerX + shortestDeltaX(camera.centerX, world.x, scene.world);
        const renderY = camera.centerY + shortestDeltaY(camera.centerY, world.y, scene.world);
        if (!isCircleVisible(camera, renderX, renderY, entity.radius + SPRITE_SPEC.outlineWidthPx)) {
          continue;
        }

        const screen = worldToScreen(camera, renderX, renderY);
        writeSpriteFrame(sprite, entity.radius, entity.radius > 0 ? entity : emptyDirection);

        centersX[visibleCount] = screen.x;
        centersY[visibleCount] = screen.y;
        shadowX[visibleCount] = screen.x;
        shadowY[visibleCount] = screen.y + sprite.shadowCenterY;
        shadowRadiusX[visibleCount] = sprite.shadowRadiusX;
        shadowRadiusY[visibleCount] = sprite.shadowRadiusY;
        eyeLeftX[visibleCount] = screen.x + sprite.leftEyeX;
        eyeRightX[visibleCount] = screen.x + sprite.rightEyeX;
        eyeY[visibleCount] = screen.y + sprite.eyeY;
        eyeRadius[visibleCount] = sprite.eyeWhiteRadius;
        pupilLeftX[visibleCount] = screen.x + sprite.leftEyeX + sprite.pupilOffsetX;
        pupilRightX[visibleCount] = screen.x + sprite.rightEyeX + sprite.pupilOffsetX;
        pupilY[visibleCount] = screen.y + sprite.eyeY + sprite.pupilOffsetY;
        pupilRadius[visibleCount] = sprite.pupilRadius;
        symbolX[visibleCount] = screen.x;
        symbolY[visibleCount] = screen.y - sprite.symbolOffsetY;
        symbolFont[visibleCount] = sprite.symbolFontSize;
        symbolText[visibleCount] = entity.symbol;
        iconText[visibleCount] = entity.icon;
        shapeByVisible[visibleCount] = entity.shape;
        accessoryX[visibleCount] = screen.x;
        accessoryY[visibleCount] = screen.y - entity.radius * 0.12;
        accessoryR[visibleCount] = entity.radius * 0.8;
        accessoryKind[visibleCount] = entity.accessoryKind;

        const paletteGroup = entity.paletteGroup;
        paletteGroupByVisible[visibleCount] = paletteGroup;
        paletteIndexByVisible[visibleCount] = entity.paletteIndex;
        bodyRadiusByVisible[visibleCount] = entity.radius;
        outlineRadiusByVisible[visibleCount] = entity.radius + sprite.outlineWidth;
        flashByVisible[visibleCount] = entity.flashSec;

        // 상자와 장판만 배치에서 뺀다. 둘 다 동시에 몇 개 안 뜬다
        if (hasCircleBody(entity.shape)) {
          const bodyBucket = findBatch(
            bodyBatches,
            bodyBatchCount,
            paletteGroup,
            entity.paletteIndex,
            entity.radius,
          );
          if (bodyBucket === bodyBatchCount) bodyBatchCount += 1;
          bodyBatches[bodyBucket].count += 1;

          const outlineBucket = findBatch(
            outlineBatches,
            outlineBatchCount,
            paletteGroup,
            entity.paletteIndex,
            entity.radius + sprite.outlineWidth,
          );
          if (outlineBucket === outlineBatchCount) outlineBatchCount += 1;
          outlineBatches[outlineBucket].count += 1;
        }

        visibleCount += 1;
      }

      visibleCountRef.value = visibleCount;
      // 고리는 엔티티 **아래**다. 위에 그리면 적이 고리에 가려 조준이 안 된다
      drawShockwaves(scene, camera);
      drawHazardFields(scene, camera);
      drawShadows(visibleCount);
      drawFields(visibleCount);
      drawBodies(outlineBatches, outlineBatchCount, true);
      drawBodies(bodyBatches, bodyBatchCount, false);
      drawHitFlashes(visibleCount);
      drawBoxes(visibleCount);
      drawIcons(visibleCount);
      drawAccessories(visibleCount);
      drawEyes(visibleCount);
      drawSymbols(visibleCount);
      // 탄과 파편은 위다. 적 뒤에 숨은 탄은 피할 수 없고,
      // 잔해가 몸통 뒤로 숨으면 터진 게 아니라 사라진 걸로 보인다
      drawHazardBullets(scene, camera, alpha);
      drawParticles(scene, camera, alpha);
      drawDamageNumbers(scene, camera);
      // 화면 효과는 흔들리지 않는 좌표에 마지막으로 얹는다
      drawScreenFlashes(scene.effects);

      // 고해상도 디스플레이에서도 선 두께가 과하게 흐려지지 않게 유지한다.
      void dpr;
    },
  };
}
