/**
 * 렌더 수치와 팔레트 정본.
 *
 * 기획서 §5.1, §5.3 의 값을 코드 한 곳에 모아 둔다.
 * 렌더러·스프라이트·테스트는 여기만 본다.
 */

export const WORLD_CELL_SIZE = 48;

export const FIELD_COLORS = {
  background: '#1A1A2E',
  grid: '#252540',
  symbol: '#F4F7FB',
  shadow: 'rgba(0, 0, 0, 0.2)',
} as const;

export const SPRITE_SPEC = {
  minRadiusPx: 10,
  maxRadiusPx: 28,
  outlineWidthPx: 2,
  outlineDarkenRatio: 0.2,
  eyeWhiteRadiusRatio: 0.25,
  pupilRadiusRatio: 0.5,
  pupilMaxOffsetRatio: 0.4,
  eyeOffsetXRatio: 0.38,
  eyeOffsetYRatio: 0.2,
  shadowOffsetYRatio: 0.8,
  shadowRadiusXRatio: 0.92,
  shadowRadiusYRatio: 0.42,
  symbolOffsetYRatio: 1.35,
  symbolFontSizeRatio: 0.7,
  accessoryStrokeWidthPx: 3,
} as const;

export interface CharacterPalette {
  readonly body: string;
  readonly symbol: string;
  readonly accessory: string;
}

export const PLAYER_PALETTES = [
  { body: '#4CAF50', symbol: 'H', accessory: '#B8F08A' },
  { body: '#2196F3', symbol: 'Ne', accessory: '#8ED5FF' },
  { body: '#FF9800', symbol: 'C', accessory: '#FFD08A' },
  { body: '#9C27B0', symbol: 'O', accessory: '#E4A5FF' },
] as const satisfies readonly CharacterPalette[];

export const ENEMY_PALETTES = [
  { body: '#E8574A', symbol: 'Rn', accessory: '#FFD700' },
  { body: '#D34235', symbol: 'Og', accessory: '#FFE082' },
  { body: '#8B0000', symbol: 'Po', accessory: '#FFC107' },
] as const satisfies readonly CharacterPalette[];
