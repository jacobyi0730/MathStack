import { describe, expect, it } from 'vitest';
import {
  BGM_TRACKS,
  createBgmPlayer,
  getBgmUrl,
  resolveBgmTrack,
  type BgmTrack,
} from '../../src/audio/bgm.js';

describe('bgm track selection', () => {
  it('follows_the_chapter_boundaries_used_by_the_background_colours', () => {
    // 3분·6분은 배경색이 바뀌는 경계다. 음악도 같은 곳에서 바뀌어야 한 사건으로 읽힌다
    expect(resolveBgmTrack(0, false)).toBe('chapter1');
    expect(resolveBgmTrack(179, false)).toBe('chapter1');
    expect(resolveBgmTrack(180, false)).toBe('chapter2');
    expect(resolveBgmTrack(359, false)).toBe('chapter2');
    expect(resolveBgmTrack(360, false)).toBe('chapter3');
    expect(resolveBgmTrack(599, false)).toBe('chapter3');
  });

  it('lets_a_boss_override_the_chapter_track', () => {
    for (const elapsed of [0, 200, 400, 560]) {
      expect(resolveBgmTrack(elapsed, true)).toBe('boss');
    }
  });

  it('maps_every_track_to_a_static_file', () => {
    for (const track of BGM_TRACKS) {
      expect(getBgmUrl(track)).toBe(`/audio/bgm-${track}.m4a`);
    }
  });
});

describe('bgm player without an audio element', () => {
  it('keeps_state_without_touching_the_dom', () => {
    const player = createBgmPlayer({ volume: 0.4 });

    expect(player.volume).toBeCloseTo(0.4, 6);
    expect(player.track).toBeNull();

    player.setTrack('chapter2' satisfies BgmTrack);
    expect(player.track).toBe('chapter2');

    player.setVolume(2);
    expect(player.volume).toBe(1);
    player.setVolume(-1);
    expect(player.volume).toBe(0);
    player.setVolume(Number.NaN);
    expect(player.volume).toBe(0);

    player.unlock();
    player.destroy();
  });
});
