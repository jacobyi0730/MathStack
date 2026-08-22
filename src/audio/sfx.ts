/**
 * 효과음 재생기 (Web Audio).
 *
 * 서버가 없으므로 음원은 `public/audio/` 의 정적 파일이고, 시작 화면이 떠 있는 동안
 * 미리 받아 둔다. 브라우저는 **사용자 조작 전에는 소리를 못 내게 막는다** —
 * `unlock()` 을 첫 클릭·터치·키 입력에서 부르는 것이 이 모듈의 유일한 사용 규칙이다.
 *
 * ### 게임 루프에서 부르지 않는다
 *
 * `AudioBufferSourceNode` 는 한 번 쓰고 버리는 객체라 재생마다 할당이 생긴다.
 * 그래서 시뮬레이션 안에서는 [`SfxQueue`](./queue.ts) 에 **요청만 쌓고**(할당 0),
 * 프레임이 끝날 때 한 번 비운다. 같은 프레임에 같은 소리가 서른 번 요청돼도
 * 실제로 만들어지는 노드는 하나다 — 성능과 청각적 품질이 같은 방향을 본다.
 *
 * @see AGENTS.md §2 규칙 3 — 게임 루프에서 할당 금지
 */

import { SFX_CUES, SFX_CUE_INDEX, SFX_SPECS, getSfxUrl, type SfxCue } from './cues.js';

/** 동시에 울릴 수 있는 총 목소리 수. 넘으면 priority 2 만 통과한다 */
export const MAX_VOICES = 16;

export interface SfxPlayer {
  /** 첫 사용자 조작에서 호출한다. 두 번째부터는 아무 일도 하지 않는다 */
  unlock(): void;
  /** 디코딩이 끝나 실제로 소리가 나는 상태인가 */
  readonly ready: boolean;
  readonly muted: boolean;
  /** 0 ~ 1 */
  readonly volume: number;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  play(cue: SfxCue, gainScale?: number, pan?: number): void;
  destroy(): void;
}

export interface SfxPlayerOptions {
  readonly volume?: number;
  readonly muted?: boolean;
}

type AudioContextCtor = typeof AudioContext;

export function createSfxPlayer(options: SfxPlayerOptions = {}): SfxPlayer {
  const resolved = resolveAudioContextCtor();
  if (resolved === undefined) return createSilentPlayer(options);
  const Ctor: AudioContextCtor = resolved;

  const encoded = new Array<ArrayBuffer | undefined>(SFX_CUES.length);
  const buffers = new Array<AudioBuffer | undefined>(SFX_CUES.length);
  const lastPlayedAt = new Float64Array(SFX_CUES.length);
  const voices = new Int32Array(SFX_CUES.length);

  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let ready = false;
  let destroyed = false;
  let totalVoices = 0;
  let volume = clamp01(options.volume ?? 0.7);
  let muted = options.muted ?? false;

  // 컨텍스트가 없어도 내려받기는 시작할 수 있다. 첫 조작 시점의 대기를 없앤다
  void prefetch();

  async function prefetch(): Promise<void> {
    await Promise.all(
      SFX_CUES.map(async (cue, index) => {
        try {
          const response = await fetch(getSfxUrl(cue));
          if (!response.ok) return;
          encoded[index] = await response.arrayBuffer();
        } catch {
          // 소리는 없어도 게임은 돌아야 한다. 조용히 포기한다
        }
      }),
    );
    if (context !== undefined) await decodeAll();
  }

  async function decodeAll(): Promise<void> {
    const ctx = context;
    if (ctx === undefined) return;

    await Promise.all(
      SFX_CUES.map(async (_cue, index) => {
        const raw = encoded[index];
        if (raw === undefined || buffers[index] !== undefined) return;
        try {
          // decodeAudioData 는 넘긴 ArrayBuffer 를 가져간다. 재시도를 위해 복사본을 준다
          buffers[index] = await ctx.decodeAudioData(raw.slice(0));
        } catch {
          // 이 브라우저가 못 읽는 형식이면 그 큐만 조용해진다
        }
      }),
    );
    if (!destroyed) ready = true;
  }

  function unlock(): void {
    if (destroyed) return;

    if (context === undefined) {
      context = new Ctor();
      master = context.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(context.destination);
      void decodeAll();
    }

    if (context.state === 'suspended') void context.resume();
  }

  function applyMasterGain(): void {
    if (master === undefined || context === undefined) return;
    // 즉시 대입하면 딸깍 소리가 난다. 아주 짧게 램프를 준다
    master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, 0.01);
  }

  return {
    unlock,

    get ready(): boolean {
      return ready;
    },
    get muted(): boolean {
      return muted;
    },
    get volume(): number {
      return volume;
    },

    setMuted(next: boolean): void {
      muted = next;
      applyMasterGain();
    },

    setVolume(next: number): void {
      volume = clamp01(next);
      applyMasterGain();
    },

    play(cue: SfxCue, gainScale = 1, pan = 0): void {
      const ctx = context;
      const out = master;
      if (destroyed || ctx === undefined || out === undefined || muted || volume <= 0) return;

      const index = SFX_CUE_INDEX[cue];
      const buffer = buffers[index];
      if (buffer === undefined) return;

      const spec = SFX_SPECS[cue];
      const now = ctx.currentTime;
      if (now - (lastPlayedAt[index] as number) < spec.minIntervalSec) return;
      if ((voices[index] as number) >= spec.maxConcurrent) return;
      if (totalVoices >= MAX_VOICES && spec.priority < 2) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * spec.pitchJitter;

      const gain = ctx.createGain();
      gain.gain.value = spec.gain * clampGainScale(gainScale);

      source.connect(gain);
      if (pan > 0.05 || pan < -0.05) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = pan > 1 ? 1 : pan < -1 ? -1 : pan;
        gain.connect(panner);
        panner.connect(out);
      } else {
        gain.connect(out);
      }

      lastPlayedAt[index] = now;
      voices[index] = (voices[index] as number) + 1;
      totalVoices += 1;
      source.onended = (): void => {
        voices[index] = Math.max(0, (voices[index] as number) - 1);
        totalVoices = Math.max(0, totalVoices - 1);
        source.disconnect();
        gain.disconnect();
      };
      source.start();
    },

    destroy(): void {
      destroyed = true;
      ready = false;
      void context?.close();
      context = undefined;
      master = undefined;
    },
  };
}

/** 오디오를 못 쓰는 환경(테스트·구형 브라우저)에서도 호출부가 분기하지 않게 한다 */
function createSilentPlayer(options: SfxPlayerOptions): SfxPlayer {
  let muted = options.muted ?? false;
  let volume = clamp01(options.volume ?? 0.7);
  return {
    unlock(): void {},
    ready: false,
    get muted(): boolean {
      return muted;
    },
    get volume(): number {
      return volume;
    },
    setMuted(next: boolean): void {
      muted = next;
    },
    setVolume(next: number): void {
      volume = clamp01(next);
    },
    play(): void {},
    destroy(): void {},
  };
}

function resolveAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const legacy = (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return window.AudioContext ?? legacy;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function clampGainScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return value < 0 ? 0 : value > 2 ? 2 : value;
}
