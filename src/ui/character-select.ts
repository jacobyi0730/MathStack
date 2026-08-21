import {
  CHARACTER_ARCHETYPES,
  DEFAULT_CHARACTER_ID,
  type CharacterArchetype,
  type CharacterId,
} from '../data/characters.js';
import { CHARACTER_PROFILES } from '../data/player.js';
import { WEAPONS, type WeaponPattern } from '../data/weapons.js';
import { describeEvolutionPairForWeapon } from '../systems/evolution.js';

export interface CharacterSelection {
  readonly characterId: CharacterId;
  readonly heroName: string;
}

export interface CharacterSelectViewOptions {
  readonly initialCharacterId?: CharacterId;
  readonly initialHeroName?: string;
  readonly onStart?: (selection: CharacterSelection) => void;
}

export interface CharacterSelectView {
  readonly element: HTMLElement;
  getSelection(): CharacterSelection;
  setHeroName(name: string): void;
  destroy(): void;
}

export const DEFAULT_HERO_NAME = '원소 용사';

export function normalizeHeroName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_HERO_NAME;
}

export function formatCharacterTraits(character: CharacterArchetype): readonly string[] {
  const weapon = WEAPONS[CHARACTER_PROFILES[character.id].startingWeaponId];
  return [
    `시작 공격: ${weapon.name}`,
    `${formatWeaponPattern(weapon.pattern)} / 피해 ${weapon.damage} / 쿨타임 ${weapon.cooldownSec}초`,
    describeEvolutionPairForWeapon(weapon.id) ?? '각성 없음',
  ];
}

export function createCharacterSelectView(
  options: CharacterSelectViewOptions = {},
): CharacterSelectView {
  let selected = options.initialCharacterId ?? DEFAULT_CHARACTER_ID;

  const root = document.createElement('section');
  root.className = 'mathstack-character-select';
  root.style.cssText = screenStyle();

  const title = document.createElement('h1');
  title.textContent = '시작 무기 선택';
  title.style.cssText = 'margin:0;font-size:28px;color:#ffffff;';
  root.appendChild(title);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;';
  root.appendChild(grid);

  const cards = CHARACTER_ARCHETYPES.map((character) => {
    const button = createCharacterCard(character);
    button.addEventListener('click', () => {
      selected = character.id;
      render();
    });
    grid.appendChild(button);
    return { id: character.id, button };
  });

  const label = document.createElement('label');
  label.textContent = '용사 이름';
  label.style.cssText = 'display:grid;gap:6px;color:#f8fafc;font-weight:700;';
  root.appendChild(label);

  const input = document.createElement('input');
  input.value = options.initialHeroName ?? DEFAULT_HERO_NAME;
  input.maxLength = 16;
  input.style.cssText = [
    'min-height:44px',
    'padding:0 12px',
    'border:1px solid #4b5578',
    'border-radius:8px',
    'background:#101522',
    'color:#ffffff',
    'font-size:16px',
  ].join(';');
  label.appendChild(input);

  const start = document.createElement('button');
  start.type = 'button';
  start.textContent = '시작';
  start.style.cssText = primaryButtonStyle();
  start.addEventListener('click', () => {
    options.onStart?.({ characterId: selected, heroName: normalizeHeroName(input.value) });
  });
  root.appendChild(start);

  function render(): void {
    for (const card of cards) {
      const pressed = card.id === selected;
      card.button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      card.button.style.borderColor = pressed ? '#ffc107' : '#3c435f';
    }
  }

  render();

  return {
    element: root,
    getSelection(): CharacterSelection {
      return { characterId: selected, heroName: normalizeHeroName(input.value) };
    },
    setHeroName(name: string): void {
      input.value = name;
    },
    destroy(): void {
      root.remove();
    },
  };
}

function createCharacterCard(character: CharacterArchetype): HTMLButtonElement {
  const weapon = WEAPONS[CHARACTER_PROFILES[character.id].startingWeaponId];
  const card = document.createElement('button');
  card.type = 'button';
  card.style.cssText = [
    'padding:14px',
    'display:grid',
    'gap:10px',
    'text-align:left',
    'border:2px solid #3c435f',
    'border-radius:8px',
    'background:#1d2234',
    'color:#ffffff',
    'cursor:pointer',
  ].join(';');

  const swatch = document.createElement('span');
  swatch.textContent = character.element;
  swatch.style.cssText = [
    'width:48px',
    'height:48px',
    'display:grid',
    'place-items:center',
    'border-radius:50%',
    `background:${character.bodyColor}`,
    `box-shadow:0 0 0 4px ${character.accessoryColor}`,
    'color:#111827',
    'font-weight:800',
  ].join(';');
  card.appendChild(swatch);

  const name = document.createElement('strong');
  name.textContent = `${weapon.name} (${weapon.element} ${weapon.atomicNumber})`;
  card.appendChild(name);

  const hero = document.createElement('span');
  hero.textContent = character.name;
  hero.style.cssText = 'color:#c9d4ff;font-size:13px;';
  card.appendChild(hero);

  const traits = document.createElement('span');
  traits.textContent = formatCharacterTraits(character).join(' / ');
  traits.style.cssText = 'color:#dbe4ff;font-size:14px;';
  card.appendChild(traits);

  return card;
}

function formatWeaponPattern(pattern: WeaponPattern): string {
  switch (pattern) {
    case 'projectile':
      return '직선 투사체';
    case 'pierce':
      return '관통 광선';
    case 'orbit':
      return '회전 공격';
    case 'wave':
      return '파동 공격';
    case 'aura':
      return '범위 지속 공격';
    case 'bomb':
      return '폭발 공격';
    case 'boomerang':
      return '왕복 투사체';
    case 'spread':
      return '산탄 공격';
  }
}

function screenStyle(): string {
  return [
    'display:grid',
    'gap:18px',
    'max-width:860px',
    'margin:0 auto',
    'padding:28px',
    'color:#ffffff',
    'background:#151827',
    'border:1px solid #2d334a',
    'border-radius:8px',
  ].join(';');
}

function primaryButtonStyle(): string {
  return [
    'min-height:52px',
    'border:0',
    'border-radius:8px',
    'background:#ffc107',
    'color:#1a1a2e',
    'font-weight:700',
    'cursor:pointer',
  ].join(';');
}
