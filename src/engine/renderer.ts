import { ENEMY_PALETTES, FIELD_COLORS, PLAYER_PALETTES, SPRITE_SPEC, WORLD_CELL_SIZE } from '../data/palette.js';
import {
  createSpriteFrameScratch,
  writeSpriteFrame,
  type DirectionLike,
} from '../entities/sprite.js';
import { createCameraState, interpolatePosition, isCircleVisible, worldToScreen, type CameraTarget } from './camera.js';
import { shortestDeltaX, shortestDeltaY, type WorldBounds } from './world.js';

export interface RenderableEntity extends CameraTarget, DirectionLike {
  radius: number;
  paletteGroup: 0 | 1;
  paletteIndex: number;
  symbol: string;
  accessoryKind: number;
}

export interface RenderScene {
  player: RenderableEntity;
  entities: readonly RenderableEntity[];
  world: WorldBounds;
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
  paletteGroup: 0 | 1;
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

  function resolvePalette(group: 0 | 1, index: number): (typeof PLAYER_PALETTES)[number] | (typeof ENEMY_PALETTES)[number] {
    return group === 0 ? PLAYER_PALETTES[index] ?? PLAYER_PALETTES[0] : ENEMY_PALETTES[index] ?? ENEMY_PALETTES[0];
  }

  function findBatch(
    batches: BatchBucket[],
    batchCount: number,
    group: 0 | 1,
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

  function drawGrid(cameraCenterX: number, cameraCenterY: number): void {
    ctx.fillStyle = FIELD_COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const left = cameraCenterX - width * 0.5;
    const top = cameraCenterY - height * 0.5;
    const startX = -((left % WORLD_CELL_SIZE) + WORLD_CELL_SIZE) % WORLD_CELL_SIZE;
    const startY = -((top % WORLD_CELL_SIZE) + WORLD_CELL_SIZE) % WORLD_CELL_SIZE;

    ctx.strokeStyle = FIELD_COLORS.grid;
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

  function drawBodies(batches: BatchBucket[], batchCount: number, outline: boolean): void {
    for (let i = 0; i < batchCount; i += 1) {
      const batch = batches[i];
      if (batch.count === 0) continue;
      const palette = resolvePalette(batch.paletteGroup, batch.paletteIndex);
      ctx.fillStyle = outline ? darkenHex(palette.body) : palette.body;
      ctx.beginPath();
      for (let j = 0; j < visibleCountRef.value; j += 1) {
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
      ctx.beginPath();
      ctx.ellipse(shadowX[i], shadowY[i], shadowRadiusX[i], shadowRadiusY[i], 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEyes(count: number): void {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      ctx.moveTo(eyeLeftX[i] + eyeRadius[i], eyeY[i]);
      ctx.arc(eyeLeftX[i], eyeY[i], eyeRadius[i], 0, Math.PI * 2);
      ctx.moveTo(eyeRightX[i] + eyeRadius[i], eyeY[i]);
      ctx.arc(eyeRightX[i], eyeY[i], eyeRadius[i], 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.fillStyle = '#111111';
    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
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
      const palette = resolvePalette(
        paletteGroupByVisible[i] as 0 | 1,
        paletteIndexByVisible[i] as number,
      );
      ctx.strokeStyle = palette.accessory;
      ctx.beginPath();
      if (accessoryKind[i] === 0) {
        ctx.arc(accessoryX[i], accessoryY[i], accessoryR[i], 0.2, Math.PI * 1.8);
      } else if (accessoryKind[i] === 1) {
        ctx.moveTo(accessoryX[i] - accessoryR[i], accessoryY[i]);
        ctx.lineTo(accessoryX[i] + accessoryR[i], accessoryY[i]);
      } else {
        ctx.moveTo(accessoryX[i], accessoryY[i] - accessoryR[i]);
        ctx.lineTo(accessoryX[i], accessoryY[i] + accessoryR[i]);
      }
      ctx.stroke();
    }
  }

  function drawSymbols(count: number): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < count; i += 1) {
      const palette = resolvePalette(
        paletteGroupByVisible[i] as 0 | 1,
        paletteIndexByVisible[i] as number,
      );
      ctx.fillStyle = palette.accessory || FIELD_COLORS.symbol;
      ctx.font = `700 ${symbolFont[i]}px "Pretendard", "Segoe UI", sans-serif`;
      ctx.fillText(symbolText[i] ?? '', symbolX[i], symbolY[i]);
    }
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
      drawGrid(camera.centerX, camera.centerY);

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
        accessoryX[visibleCount] = screen.x;
        accessoryY[visibleCount] = screen.y - entity.radius * 0.12;
        accessoryR[visibleCount] = entity.radius * 0.8;
        accessoryKind[visibleCount] = entity.accessoryKind;

        const paletteGroup = entity.paletteGroup;
        paletteGroupByVisible[visibleCount] = paletteGroup;
        paletteIndexByVisible[visibleCount] = entity.paletteIndex;
        bodyRadiusByVisible[visibleCount] = entity.radius;
        outlineRadiusByVisible[visibleCount] = entity.radius + sprite.outlineWidth;

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

        visibleCount += 1;
      }

      visibleCountRef.value = visibleCount;
      drawShadows(visibleCount);
      drawBodies(outlineBatches, outlineBatchCount, true);
      drawBodies(bodyBatches, bodyBatchCount, false);
      drawAccessories(visibleCount);
      drawEyes(visibleCount);
      drawSymbols(visibleCount);

      // 고해상도 디스플레이에서도 선 두께가 과하게 흐려지지 않게 유지한다.
      void dpr;
    },
  };
}
