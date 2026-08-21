import { CHARACTER_ARCHETYPES } from './characters.js';

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

/**
 * 엔티티가 어떤 모양으로 그려지는지 (05-세션-운영 §14.5).
 *
 * 살아 있는 것만 **원 + 눈**이다. 상자는 네모, 주우면 발동하는 아이템과 투사체는 이모지 아이콘,
 * 오라·파동처럼 넓게 퍼지는 것은 반투명 장판 —
 * 적 무리 속에서 "쫓아오는 것 / 주울 것 / 내가 쏜 것"이 한눈에 갈려야 한다.
 */
export const ENTITY_SHAPES = {
  circle: 0,
  box: 1,
  icon: 2,
  field: 3,
} as const;

export type EntityShape = (typeof ENTITY_SHAPES)[keyof typeof ENTITY_SHAPES];

/** 이모지는 본문 글꼴이 아니라 컬러 이모지 글꼴로 그려야 색이 나온다 */
export const ICON_FONT_STACK =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif';

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
  /** 상자 모서리 둥글기. 반지름 대비 비율 */
  boxCornerRadiusRatio: 0.24,
  /** 상자 뚜껑 선 위치. 중심에서 위로 반지름 × 이 값 */
  boxLidOffsetRatio: 0.34,
  boxStrapWidthPx: 3,
  /** 아이콘 글자 크기. 반지름 대비 비율 */
  iconFontSizeRatio: 1.6,
  /** 반지름 5짜리 투사체도 이모지가 읽혀야 한다. 배지 밖으로 넘쳐도 그게 낫다 */
  iconMinFontSizePx: 14,
  /** 마그네슘 폭탄처럼 큰 투사체에서 이모지가 화면을 덮지 않게 막는다 */
  iconMaxFontSizePx: 40,
  /** 장판(오라·파동) 채우기 투명도. 아래 적이 비쳐야 한다 */
  fieldFillAlpha: 0.18,
  fieldRingWidthPx: 3,
} as const;

export interface CharacterPalette {
  readonly body: string;
  readonly symbol: string;
  readonly accessory: string;
}

export const PLAYER_PALETTES = CHARACTER_ARCHETYPES.map((archetype) => ({
  body: archetype.bodyColor,
  symbol: archetype.element,
  accessory: archetype.accessoryColor,
})) satisfies readonly CharacterPalette[];

export const ENEMY_PALETTES = [
  { body: '#E8574A', symbol: 'Rn', accessory: '#FFD700' },
  { body: '#D34235', symbol: 'Og', accessory: '#FFE082' },
  { body: '#8B0000', symbol: 'Po', accessory: '#FFC107' },
] as const satisfies readonly CharacterPalette[];

/**
 * 아이템·상자 팔레트 (paletteGroup 2).
 *
 * 양성자 조각과 즉시 발동 아이템, 원소 램프 상자가 한 그룹을 쓴다.
 * 적(붉은 계열)·플레이어(캐릭터색)와 색으로 먼저 구분되어야 하므로
 * 여기 색은 둘 다와 겹치지 않게 고른다. 인덱스는 아이템 정의가 참조한다.
 */
export const ITEM_PALETTES = [
  { body: '#4FC3F7', symbol: 'p', accessory: '#B3E5FC' },
  { body: '#66BB6A', symbol: 'P', accessory: '#C8E6C9' },
  { body: '#FFB74D', symbol: 'P', accessory: '#FFE0B2' },
  { body: '#EC407A', symbol: 'I', accessory: '#F8BBD0' },
  { body: '#7E57C2', symbol: 'Nd', accessory: '#D1C4E9' },
  { body: '#EF5350', symbol: 'Ir', accessory: '#FFCDD2' },
  { body: '#26C6DA', symbol: 'Cs', accessory: '#B2EBF2' },
  { body: '#FF7043', symbol: 'P', accessory: '#FFCCBC' },
  { body: '#FFCA28', symbol: 'Au', accessory: '#FFF59D' },
  { body: '#FF6E40', symbol: 'Ne', accessory: '#FFD180' },
  { body: '#5C6BC0', symbol: 'Ar', accessory: '#C5CAE9' },
  { body: '#26A69A', symbol: 'Kr', accessory: '#B2DFDB' },
  { body: '#AB47BC', symbol: 'Xe', accessory: '#E1BEE7' },
] as const satisfies readonly CharacterPalette[];
