import { describe, expect, it } from 'vitest';
import { SFX_CUES, SFX_SPECS, getSfxUrl, type SfxCue } from '../../src/audio/cues.js';
import {
  clearSfxQueue,
  createSfxQueue,
  distanceGain,
  flushSfxQueue,
  panFromOffset,
  requestSfx,
} from '../../src/audio/queue.js';
import type { SfxPlayer } from '../../src/audio/sfx.js';

interface PlayedCue {
  cue: SfxCue;
  gain: number;
  pan: number;
}

function createRecordingPlayer(): { player: SfxPlayer; played: PlayedCue[] } {
  const played: PlayedCue[] = [];
  const player: SfxPlayer = {
    unlock(): void {},
    ready: true,
    muted: false,
    volume: 1,
    setMuted(): void {},
    setVolume(): void {},
    play(cue: SfxCue, gainScale = 1, pan = 0): void {
      played.push({ cue, gain: gainScale, pan });
    },
    destroy(): void {},
  };
  return { player, played };
}

describe('sfx catalog', () => {
  it('gives every cue a spec and a static file path', () => {
    for (const cue of SFX_CUES) {
      const spec = SFX_SPECS[cue];
      expect(spec.gain).toBeGreaterThan(0);
      expect(spec.gain).toBeLessThanOrEqual(1);
      expect(spec.maxConcurrent).toBeGreaterThan(0);
      expect(getSfxUrl(cue)).toBe(`/audio/${cue}.m4a`);
    }
  });

  it('keeps the sounds that repeat constantly quieter than the rare ones', () => {
    // 잡몹 타격음은 초당 수십 번 난다. 보스 처치음보다 크면 게임이 소음이 된다
    expect(SFX_SPECS.hit.gain).toBeLessThan(SFX_SPECS['boss-death'].gain);
    expect(SFX_SPECS['pickup-xp'].gain).toBeLessThan(SFX_SPECS['level-up'].gain);
    expect(SFX_SPECS['enemy-death'].gain).toBeLessThan(SFX_SPECS['elite-death'].gain);
  });

  it('never lets the player miss being hit', () => {
    expect(SFX_SPECS['player-hurt'].priority).toBe(2);
    expect(SFX_SPECS['boss-phase'].priority).toBe(2);
  });
});

describe('sfx request queue', () => {
  it('collapses many requests of one cue into a single play', () => {
    const queue = createSfxQueue();
    const { player, played } = createRecordingPlayer();

    for (let i = 0; i < 30; i += 1) requestSfx(queue, 'enemy-death');
    flushSfxQueue(queue, player);

    expect(played).toHaveLength(1);
    expect(played[0]?.cue).toBe('enemy-death');
    // 겹친 만큼 조금 커지되 상한이 있다
    expect(played[0]?.gain).toBeGreaterThan(1);
    expect(played[0]?.gain).toBeLessThanOrEqual(1.5);
  });

  it('keeps the loudest request of a cue and empties itself after a flush', () => {
    const queue = createSfxQueue();
    const { player, played } = createRecordingPlayer();

    requestSfx(queue, 'hit', 0.2);
    requestSfx(queue, 'hit', 0.9);
    flushSfxQueue(queue, player);
    expect(played[0]?.gain).toBeCloseTo(0.9 * 1.09, 5);

    played.length = 0;
    flushSfxQueue(queue, player);
    expect(played).toHaveLength(0);
  });

  it('plays distinct cues in the same frame', () => {
    const queue = createSfxQueue();
    const { player, played } = createRecordingPlayer();

    requestSfx(queue, 'hit');
    requestSfx(queue, 'level-up');
    requestSfx(queue, 'boss-skill');
    flushSfxQueue(queue, player);

    expect(played.map((entry) => entry.cue).sort()).toEqual(['boss-skill', 'hit', 'level-up']);
  });

  it('clears without playing', () => {
    const queue = createSfxQueue();
    const { player, played } = createRecordingPlayer();

    requestSfx(queue, 'hit');
    clearSfxQueue(queue);
    flushSfxQueue(queue, player);

    expect(played).toHaveLength(0);
    expect(queue.dirty).toBe(false);
  });
});

describe('positional mixing', () => {
  it('silences anything past the audible radius', () => {
    expect(distanceGain(0, 800)).toBe(1);
    expect(distanceGain(800, 800)).toBe(0);
    expect(distanceGain(1600, 800)).toBe(0);
    expect(distanceGain(400, 800)).toBeCloseTo(0.25, 6);
  });

  it('clamps panning to the stereo field', () => {
    expect(panFromOffset(0, 640)).toBe(0);
    expect(panFromOffset(-2000, 640)).toBe(-1);
    expect(panFromOffset(2000, 640)).toBe(1);
    expect(panFromOffset(320, 640)).toBeCloseTo(0.5, 6);
  });
});
