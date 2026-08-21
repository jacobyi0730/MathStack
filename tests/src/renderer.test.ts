import { describe, expect, it } from 'vitest';
import { CRATES } from '../../src/data/crates.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ENTITY_SHAPES, SPRITE_SPEC } from '../../src/data/palette.js';
import { WEAPONS } from '../../src/data/weapons.js';
import { createRenderer, type RenderScene } from '../../src/engine/renderer.js';
import { createGameState } from '../../src/engine/state.js';
import { spawnCrate } from '../../src/entities/crate.js';
import { spawnEnemy } from '../../src/entities/enemy.js';
import { PICKUPS } from '../../src/entities/pickup.js';
import { configureWaveProjectile, spawnProjectile } from '../../src/entities/projectile.js';
import { spawnPickupByKind } from '../../src/systems/pickup.js';

const VIEWPORT = { width: 800, height: 600, dpr: 1 };

/**
 * 실제 캔버스 없이 렌더 호출을 기록한다.
 * 모양별로 어떤 원시 도형을 쓰는지가 이 테스트의 관심사다.
 */
function createRecordingContext() {
  const calls = {
    arc: 0,
    ellipse: 0,
    quadraticCurveTo: 0,
    fill: 0,
    stroke: 0,
  };
  const texts: string[] = [];
  const fonts: string[] = [];
  const alphas: number[] = [];

  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    set globalAlpha(value: number) {
      alphas.push(value);
    },
    get globalAlpha(): number {
      return 1;
    },
    fillRect(): void {},
    beginPath(): void {},
    closePath(): void {},
    moveTo(): void {},
    lineTo(): void {},
    arc(): void {
      calls.arc += 1;
    },
    ellipse(): void {
      calls.ellipse += 1;
    },
    quadraticCurveTo(): void {
      calls.quadraticCurveTo += 1;
    },
    fill(): void {
      calls.fill += 1;
    },
    stroke(): void {
      calls.stroke += 1;
    },
    fillText(text: string): void {
      texts.push(text);
      fonts.push(this.font);
    },
    strokeText(): void {},
  };

  return { ctx, calls, texts, fonts, alphas };
}

function renderScene(scene: RenderScene, recording: ReturnType<typeof createRecordingContext>): void {
  const renderer = createRenderer(recording.ctx as unknown as CanvasRenderingContext2D, VIEWPORT);
  renderer.render(scene, 1);
}

/** 플레이어는 항상 그려지므로, 플레이어만 있는 장면을 기준선으로 뺀다 */
function baselineArcs(): number {
  const state = createGameState();
  const recording = createRecordingContext();
  renderScene(state, recording);
  return recording.calls.arc;
}

describe('renderer shapes', () => {
  it('draws_crates_as_rounded_squares_without_eyes', () => {
    const state = createGameState();
    const before = baselineArcs();
    spawnCrate(state.crates.acquire(), CRATES.neon, state.player.x + 60, state.player.y);

    const recording = createRecordingContext();
    renderScene(state, recording);

    // 둥근 네모는 모서리 4개 × (테두리 + 몸통) = 8번의 2차 곡선으로 그린다
    expect(recording.calls.quadraticCurveTo).toBe(8);
    // 눈도 몸통 원도 늘지 않는다. 그림자(ellipse)만 하나 붙는다
    expect(recording.calls.arc).toBe(before);
    expect(recording.texts).toContain(CRATES.neon.element);
  });

  it('draws_instant_items_as_emoji_badges', () => {
    const state = createGameState();
    spawnPickupByKind(state.pickups, 'magnet', state.player.x + 70, state.player.y);
    spawnPickupByKind(state.pickups, 'shield', state.player.x - 70, state.player.y);

    const recording = createRecordingContext();
    renderScene(state, recording);

    expect(recording.texts).toContain(PICKUPS.magnet.icon);
    expect(recording.texts).toContain(PICKUPS.shield.icon);
    // 이모지는 본문 글꼴이 아니라 컬러 이모지 글꼴로 나가야 색이 산다
    const iconFont = recording.fonts[recording.texts.indexOf(PICKUPS.magnet.icon)];
    expect(iconFont).toContain('Emoji');
    expect(recording.calls.quadraticCurveTo).toBe(0);
  });

  it('draws_weapon_projectiles_with_their_own_icon', () => {
    const state = createGameState();
    const projectile = state.weapons.projectiles.acquire();
    spawnProjectile(projectile, 'gold_spiral', state.player.x + 40, state.player.y, 1, 0, 10, 1);

    const recording = createRecordingContext();
    renderScene(state, recording);

    expect(projectile.shape).toBe(ENTITY_SHAPES.icon);
    expect(recording.texts).toContain(WEAPONS.gold_spiral.icon);
  });

  it('draws_area_waves_as_translucent_fields', () => {
    const state = createGameState();
    const wave = state.weapons.projectiles.acquire();
    spawnProjectile(wave, 'oxygen_wave', state.player.x, state.player.y, 0, 0, 10, 1);
    configureWaveProjectile(wave, 180, 0.6);

    const recording = createRecordingContext();
    renderScene(state, recording);

    expect(wave.shape).toBe(ENTITY_SHAPES.field);
    expect(recording.alphas).toContain(SPRITE_SPEC.fieldFillAlpha);
    // 장판은 아이콘도 원소 기호도 달지 않는다. 플레이어가 그 안에 서 있다
    expect(recording.texts).not.toContain(WEAPONS.oxygen_wave.icon);
  });

  it('keeps_eyes_on_living_things_only', () => {
    const state = createGameState();
    const before = baselineArcs();
    spawnEnemy(state.enemies.acquire(), ENEMIES.radon, state.player.x + 80, state.player.y, 10);

    const recording = createRecordingContext();
    renderScene(state, recording);

    // 라돈 하나가 늘면 몸통 + 테두리 + 흰자 2 + 눈동자 2 + 후광 액세서리 = 원이 7개 늘어난다
    expect(recording.calls.arc).toBe(before + 7);
    expect(recording.texts).toContain(ENEMIES.radon.element);
  });
});

describe('renderer icon assignments', () => {
  it('gives_every_weapon_a_unique_icon', () => {
    const icons = Object.values(WEAPONS).map((weapon) => weapon.icon);

    for (const icon of icons) expect(icon.length).toBeGreaterThan(0);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('gives_every_instant_item_a_unique_icon_and_leaves_shards_bare', () => {
    const pickups = Object.values(PICKUPS);
    const items = pickups.filter((pickup) => pickup.icon !== '');
    const shards = pickups.filter((pickup) => pickup.icon === '');

    expect(items).toHaveLength(6);
    expect(shards).toHaveLength(3);
    expect(new Set(items.map((item) => item.icon)).size).toBe(items.length);
    // 조각도 아이템도 눈이 없다. 살아 있는 것만 눈을 가진다
    for (const pickup of pickups) expect(pickup.shape).toBe(ENTITY_SHAPES.icon);
  });

  it('never_reuses_a_weapon_icon_for_an_item', () => {
    const weaponIcons = new Set<string>(Object.values(WEAPONS).map((weapon) => weapon.icon));

    for (const pickup of Object.values(PICKUPS)) {
      if (pickup.icon === '') continue;
      expect(weaponIcons.has(pickup.icon)).toBe(false);
    }
  });

  it('marks_every_crate_as_a_box', () => {
    const state = createGameState();

    for (const id of Object.keys(CRATES) as Array<keyof typeof CRATES>) {
      const crate = state.crates.acquire();
      spawnCrate(crate, CRATES[id], 0, 0);
      expect(crate.shape).toBe(ENTITY_SHAPES.box);
      expect(crate.icon).toBe('');
    }
  });
});
