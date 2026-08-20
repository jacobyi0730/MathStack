import { describe, expect, it } from 'vitest';
import { createSpatialHash, type SpatialEntity } from '../../src/engine/spatial-hash.js';

interface Blob extends SpatialEntity {
  id: number;
}

function blob(id: number, x: number, y: number, radius = 14): Blob {
  return { id, x, y, radius };
}

describe('공간 해시', () => {
  it('같은_셀의_항목을_찾는다', () => {
    const hash = createSpatialHash<Blob>();
    hash.clear(0, 0);
    const a = blob(1, 10, 10);
    hash.insert(a);

    const out: Blob[] = [];
    const n = hash.queryNearby(12, 12, 20, out);

    expect(n).toBe(1);
    expect(out[0]).toBe(a);
  });

  it('먼_항목은_후보에_넣지_않는다', () => {
    const hash = createSpatialHash<Blob>({ cellSize: 64 });
    hash.clear(0, 0);
    hash.insert(blob(1, 0, 0));
    hash.insert(blob(2, 1500, 1500));

    const out: Blob[] = [];
    const n = hash.queryNearby(0, 0, 30, out);

    expect(n).toBe(1);
    expect(out[0]?.id).toBe(1);
  });

  it('셀_경계에_걸친_항목을_놓치지_않는다', () => {
    // 중심 셀에만 넣으므로, 질의 반경을 최대 반지름만큼 넓히는지 확인한다
    const hash = createSpatialHash<Blob>({ cellSize: 64 });
    hash.clear(0, 0);

    // 셀 경계(64의 배수) 바로 안쪽에 큰 항목을 둔다
    const big = blob(1, 63, 63, 30);
    hash.insert(big);

    // 이웃 셀에서 질의 — 원끼리는 닿지만 중심 셀은 다르다
    const out: Blob[] = [];
    const n = hash.queryNearby(80, 80, 10, out);

    expect(n).toBe(1);
    expect(out[0]).toBe(big);
  });

  it('clear_하면_이전_프레임_항목이_사라진다', () => {
    const hash = createSpatialHash<Blob>();
    hash.clear(0, 0);
    hash.insert(blob(1, 0, 0));

    hash.clear(0, 0);
    const out: Blob[] = [];
    expect(hash.queryNearby(0, 0, 100, out)).toBe(0);
    expect(hash.count).toBe(0);
  });

  it('격자가_플레이어를_따라_다시_놓인다', () => {
    const hash = createSpatialHash<Blob>({ cellSize: 64, cols: 16, rows: 16 });

    // 원점 근처에서는 멀리 있는 항목이 격자 밖
    hash.clear(0, 0);
    expect(hash.insert(blob(1, 10_000, 10_000))).toBe(false);
    expect(hash.outsideCount).toBe(1);

    // 플레이어가 그쪽으로 가면 들어온다
    hash.clear(10_000, 10_000);
    expect(hash.insert(blob(1, 10_000, 10_000))).toBe(true);
    expect(hash.outsideCount).toBe(0);
  });

  it('셀_상한을_넘으면_버리되_세어_둔다', () => {
    const hash = createSpatialHash<Blob>({ maxPerCell: 4 });
    hash.clear(0, 0);

    for (let i = 0; i < 10; i += 1) hash.insert(blob(i, 5, 5));

    expect(hash.count).toBe(4);
    expect(hash.overflowCount).toBe(6);
  });

  it('queryNearby_가_배열을_새로_만들지_않는다', () => {
    // DoD: out 을 인자로 받아 채운다
    const hash = createSpatialHash<Blob>();
    const out: Blob[] = [];

    for (let frame = 0; frame < 100; frame += 1) {
      hash.clear(0, 0);
      hash.insert(blob(frame, 0, 0));
      const returned = hash.queryNearby(0, 0, 50, out);
      expect(returned).toBe(1);
    }

    // 같은 배열이 계속 재사용됐다
    expect(out[0]?.id).toBe(99);
  });

  it('반환값은_out_length_와_다를_수_있다', () => {
    // 배열을 줄이지 않으므로 반환값까지만 읽어야 한다는 계약
    const hash = createSpatialHash<Blob>();
    const out: Blob[] = [];

    hash.clear(0, 0);
    for (let i = 0; i < 5; i += 1) hash.insert(blob(i, i * 10, 0));
    expect(hash.queryNearby(0, 0, 200, out)).toBe(5);

    hash.clear(0, 0);
    hash.insert(blob(99, 0, 0));
    const n = hash.queryNearby(0, 0, 10, out);

    expect(n).toBe(1);
    expect(out.length).toBeGreaterThanOrEqual(n); // 낡은 값이 뒤에 남아 있다
  });
});

describe('후보 축소 효과', () => {
  it('적_300체에서_충돌_후보가_전체보다_한_자릿수_이상_작다', () => {
    // DoD: 충돌 후보 수가 전체 엔티티 수보다 한 자릿수 이상 작다
    const hash = createSpatialHash<Blob>({ cellSize: 64 });
    const TOTAL = 300;

    // 1920×1080 화면에 흩뿌린다
    let seed = 12345;
    const rand = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    hash.clear(960, 540);
    const all: Blob[] = [];
    for (let i = 0; i < TOTAL; i += 1) {
      const b = blob(i, rand() * 1920, rand() * 1080, 14);
      all.push(b);
      hash.insert(b);
    }
    expect(hash.count).toBe(TOTAL);

    // 투사체 200발이 각자 근처를 질의한다
    const out: Blob[] = [];
    let totalCandidates = 0;
    const PROJECTILES = 200;
    for (let i = 0; i < PROJECTILES; i += 1) {
      totalCandidates += hash.queryNearby(rand() * 1920, rand() * 1080, 8, out);
    }

    const avg = totalCandidates / PROJECTILES;
    const bruteForce = TOTAL;

    // 전수 비교 대비 10배 이상 적어야 한다
    expect(avg).toBeLessThan(bruteForce / 10);
  });

  it('적300_투사체200_broad_phase_가_프레임당_2ms_를_넘지_않는다', () => {
    // 회귀 감지용. 실측은 0.023ms/frame 이라 80배 여유를 두고 건다 —
    // O(n²) 로 되돌아가는 것 같은 구조적 퇴행만 잡는 것이 목적이다
    const hash = createSpatialHash<Blob>({ cellSize: 64 });
    let seed = 42;
    const rand = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    const enemies: Blob[] = [];
    for (let i = 0; i < 300; i += 1) enemies.push(blob(i, rand() * 1920, rand() * 1080, 14));

    const out: Blob[] = [];
    const FRAMES = 120;
    const start = performance.now();

    for (let f = 0; f < FRAMES; f += 1) {
      hash.clear(960, 540);
      for (const e of enemies) hash.insert(e);
      for (let p = 0; p < 200; p += 1) {
        hash.queryNearby(rand() * 1920, rand() * 1080, 4, out);
      }
    }

    const perFrame = (performance.now() - start) / FRAMES;
    expect(perFrame).toBeLessThan(2);
  });

  it('전수_비교와_같은_결과를_준다', () => {
    // 후보를 줄이면서 놓치는 것이 없어야 한다
    const hash = createSpatialHash<Blob>({ cellSize: 64 });
    let seed = 777;
    const rand = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    const all: Blob[] = [];
    hash.clear(500, 500);
    for (let i = 0; i < 400; i += 1) {
      const b = blob(i, rand() * 1000, rand() * 1000, 6 + rand() * 20);
      all.push(b);
      hash.insert(b);
    }

    const out: Blob[] = [];
    for (let t = 0; t < 50; t += 1) {
      const qx = rand() * 1000;
      const qy = rand() * 1000;
      const qr = 12;

      const expected = new Set(
        all.filter((b) => (b.x - qx) ** 2 + (b.y - qy) ** 2 <= (b.radius + qr) ** 2).map((b) => b.id),
      );

      const n = hash.queryNearby(qx, qy, qr, out);
      const got = new Set<number>();
      for (let i = 0; i < n; i += 1) {
        const b = out[i] as Blob;
        if ((b.x - qx) ** 2 + (b.y - qy) ** 2 <= (b.radius + qr) ** 2) got.add(b.id);
      }

      expect(got).toEqual(expected);
    }
  });
});
