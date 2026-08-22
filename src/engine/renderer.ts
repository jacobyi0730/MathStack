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
import type { DamageNumberPool } from '../entities/damage-number.js';
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
}

export interface RenderScene {
  player: RenderableEntity;
  entities: readonly RenderableEntity[];
  damageNumbers: DamageNumberPool;
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

  let width = viewport.width;
  let height = viewport.height;
  let dpr = viewport.dpr;
  const sprite = createSpriteFrameScratch();
  const emptyDirection: DirectionLike = { dx: 0, dy: 0 };

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

  function drawDamageNumbers(scene: RenderScene, camera: ReturnType<typeof createCameraState>): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 18px "Pretendard", "Segoe UI", sans-serif';
    ctx.lineWidth = 3;
    for (let i = 0; i < scene.damageNumbers.items.length; i += 1) {
      const item = scene.damageNumbers.items[i];
      if (!item.active) continue;
      const renderX = camera.centerX + shortestDeltaX(camera.centerX, item.x, scene.world);
      const renderY = camera.centerY + shortestDeltaY(camera.centerY, item.y, scene.world);
      if (!isCircleVisible(camera, renderX, renderY, 24)) continue;
      const screen = worldToScreen(camera, renderX, renderY);
      const alpha = Math.max(0, Math.min(1, item.lifeSec / 0.65));
      const text = `${item.value}`;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#111827';
      ctx.fillStyle = '#ffe082';
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
      drawShadows(visibleCount);
      drawFields(visibleCount);
      drawBodies(outlineBatches, outlineBatchCount, true);
      drawBodies(bodyBatches, bodyBatchCount, false);
      drawBoxes(visibleCount);
      drawIcons(visibleCount);
      drawAccessories(visibleCount);
      drawEyes(visibleCount);
      drawSymbols(visibleCount);
      drawDamageNumbers(scene, camera);

      // 고해상도 디스플레이에서도 선 두께가 과하게 흐려지지 않게 유지한다.
      void dpr;
    },
  };
}
