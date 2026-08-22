/**
 * 타격 피드백 런타임 (05-세션-운영 §14 보조).
 *
 * 데미지 숫자만으로는 "맞았다"가 전달되지 않는다. 여기 모인 것들은 전부
 * **수치를 바꾸지 않고 감각만 바꾸는** 장치다 — 밸런스에 영향을 주지 않으므로
 * 마음껏 조절해도 되고, 접근성 설정으로 전부 꺼도 게임이 성립해야 한다.
 *
 * | 장치 | 언제 | 무엇을 말하는가 |
 * | --- | --- | --- |
 * | 화면 흔들림 | 큰 사건에만 | "지금 큰 게 터졌다" |
 * | 히트스톱 | 아주 큰 사건에만 | "이 한 방은 무겁다" |
 * | 붉은 비네트 | 주인공 피격 | "내가 맞았다" (적 피격과 헷갈리면 안 된다) |
 * | 백색 섬광 | 보스 처치·운석 | "판이 뒤집혔다" |
 * | 파편·고리 | 파괴가 일어난 자리 | "저기서 죽었다 / 저기까지 위험하다" |
 *
 * **흔들림은 아껴 쓴다.** 적 한 마리가 죽을 때마다 흔들면 10분 내내 흔들려서
 * 정작 보스 스킬이 안 보인다. 잡몹 처치는 파편만, 흔들림은 보스·피격·운석에만 준다.
 */

import {
  createParticlePool,
  releaseAllParticles,
  spawnParticle,
  updateParticles,
  type ParticlePool,
} from '../entities/particle.js';
import {
  createShockwavePool,
  releaseAllShockwaves,
  spawnShockwave,
  updateShockwaves,
  type ShockwavePool,
} from '../entities/shockwave.js';

/** 흔들림 강도 1.0 에서의 최대 화면 이동량(px) */
export const MAX_SHAKE_PX = 22;
/** 흔들림이 0 으로 돌아가는 데 걸리는 시간의 역수. 클수록 빨리 잦아든다 */
export const SHAKE_DECAY_PER_SEC = 2.4;
/** 한 번에 멈출 수 있는 최대 시간. 이보다 길면 랙으로 읽힌다 */
export const MAX_HIT_STOP_SEC = 0.2;
/** 피격 섬광이 사라지는 속도 */
export const FLASH_DECAY_PER_SEC = 2.6;
/** 피격 표시가 켜져 있는 시간. 스프라이트 위에 흰 막을 씌운다 */
export const HIT_FLASH_SEC = 0.09;

export interface EffectsState {
  /** 접근성 배율 0 ~ 1. 0 이면 흔들림·전체 섬광을 아예 끈다 */
  intensity: number;
  /** 0 ~ 1. 실제 이동량은 제곱해서 쓴다 — 작은 타격이 과하게 흔들리지 않게 */
  shakeTrauma: number;
  shakeSeed: number;
  shakeX: number;
  shakeY: number;
  /** 남은 동안 시뮬레이션을 멈춘다. 렌더는 계속 돈다 */
  hitStopSec: number;
  /** 주인공 피격 붉은 비네트 0 ~ 1 */
  damageFlash: number;
  /** 화면 전체 백색 섬광 0 ~ 1 */
  whiteFlash: number;
  particles: ParticlePool;
  shockwaves: ShockwavePool;
}

export function createEffectsState(): EffectsState {
  return {
    intensity: 1,
    shakeTrauma: 0,
    shakeSeed: 0x9e3779b9,
    shakeX: 0,
    shakeY: 0,
    hitStopSec: 0,
    damageFlash: 0,
    whiteFlash: 0,
    particles: createParticlePool(),
    shockwaves: createShockwavePool(),
  };
}

export function resetEffects(effects: EffectsState): void {
  effects.shakeTrauma = 0;
  effects.shakeX = 0;
  effects.shakeY = 0;
  effects.hitStopSec = 0;
  effects.damageFlash = 0;
  effects.whiteFlash = 0;
  releaseAllParticles(effects.particles);
  releaseAllShockwaves(effects.shockwaves);
}

export function addTrauma(effects: EffectsState, amount: number): void {
  if (effects.intensity <= 0) return;
  const next = effects.shakeTrauma + amount * effects.intensity;
  effects.shakeTrauma = next > 1 ? 1 : next;
}

/**
 * 화면을 잠깐 멈춘다.
 *
 * **길게 주지 않는다.** 0.2초를 넘기면 타격감이 아니라 버벅임으로 읽힌다.
 * 잡몹 처치에는 절대 쓰지 않는다 — 초당 열 번 멈추면 게임이 아니다.
 */
export function addHitStop(effects: EffectsState, seconds: number): void {
  if (effects.intensity <= 0) return;
  const next = effects.hitStopSec > seconds ? effects.hitStopSec : seconds;
  effects.hitStopSec = next > MAX_HIT_STOP_SEC ? MAX_HIT_STOP_SEC : next;
}

export function flashDamage(effects: EffectsState, amount: number): void {
  if (effects.intensity <= 0) return;
  const next = effects.damageFlash + amount * effects.intensity;
  effects.damageFlash = next > 1 ? 1 : next;
}

export function flashWhite(effects: EffectsState, amount: number): void {
  if (effects.intensity <= 0) return;
  const next = effects.whiteFlash + amount * effects.intensity;
  effects.whiteFlash = next > 1 ? 1 : next;
}

/**
 * 화면 단위 효과만 진행한다.
 *
 * 히트스톱 중에도 이건 돌아야 한다 — 멈춰 있는 동안 흔들림까지 멈추면
 * 화면이 그냥 얼어붙은 것처럼 보인다. 멈춘 세계를 흔들리는 카메라가 비추는 게 맞다.
 */
export function updateScreenEffects(effects: EffectsState, dt: number): void {
  if (effects.shakeTrauma > 0) {
    effects.shakeTrauma -= SHAKE_DECAY_PER_SEC * dt;
    if (effects.shakeTrauma < 0) effects.shakeTrauma = 0;

    const magnitude = MAX_SHAKE_PX * effects.shakeTrauma * effects.shakeTrauma;
    effects.shakeX = nextShakeNoise(effects) * magnitude;
    effects.shakeY = nextShakeNoise(effects) * magnitude;
  } else {
    effects.shakeX = 0;
    effects.shakeY = 0;
  }

  if (effects.damageFlash > 0) {
    effects.damageFlash -= FLASH_DECAY_PER_SEC * dt;
    if (effects.damageFlash < 0) effects.damageFlash = 0;
  }
  if (effects.whiteFlash > 0) {
    effects.whiteFlash -= FLASH_DECAY_PER_SEC * 1.6 * dt;
    if (effects.whiteFlash < 0) effects.whiteFlash = 0;
  }
}

/** 파편과 고리. 히트스톱 중에는 멈춘다 — 얼어붙는 게 이 연출의 전부다 */
export function updateWorldEffects(effects: EffectsState, dt: number): void {
  updateParticles(effects.particles, dt);
  updateShockwaves(effects.shockwaves, dt);
}

/**
 * 한 점에서 사방으로 파편을 흩뿌린다.
 *
 * 각도는 등분한 뒤 흔든다. 완전 무작위로 뽑으면 한쪽에 뭉쳐서
 * "터졌다"가 아니라 "튀었다"로 보인다.
 */
export function emitBurst(
  effects: EffectsState,
  x: number,
  y: number,
  color: string,
  count: number,
  speed: number,
  radius: number,
  lifeSec: number,
): void {
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i += 1) {
    const angle = step * i + nextShakeNoise(effects) * step * 0.5;
    const scatter = 0.65 + (nextShakeNoise(effects) + 1) * 0.35;
    spawnParticle(
      effects.particles,
      x,
      y,
      Math.cos(angle) * speed * scatter,
      Math.sin(angle) * speed * scatter,
      radius * scatter,
      lifeSec * scatter,
      color,
      0.9,
    );
  }
}

export function emitShockwave(
  effects: EffectsState,
  x: number,
  y: number,
  startRadius: number,
  endRadius: number,
  lifeSec: number,
  color: string,
  width = 3,
  fillAlpha = 0,
): void {
  spawnShockwave(effects.shockwaves, x, y, startRadius, endRadius, lifeSec, color, width, fillAlpha);
}

/** -1 ~ 1. 흔들림은 재현될 필요가 없지만, 전역 난수는 쓰지 않는다 */
function nextShakeNoise(effects: EffectsState): number {
  effects.shakeSeed = (effects.shakeSeed * 1664525 + 1013904223) >>> 0;
  return (effects.shakeSeed / 4294967296) * 2 - 1;
}
