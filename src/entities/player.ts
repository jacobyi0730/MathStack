import {
  CHARACTER_ARCHETYPES,
  DEFAULT_CHARACTER_ID,
  PLAYER_BASE_MAX_HEALTH,
  PLAYER_BASE_MOVE_SPEED,
  PLAYER_BASE_PROJECTILE_COUNT,
  PLAYER_RADIUS,
  PLAYER_SLOT_CAPACITY,
  getCharacterArchetype,
  type CharacterArchetype,
  type CharacterId,
} from '../data/characters.js';
import type { InputState } from '../engine/input.js';
import type { RenderableEntity } from '../engine/renderer.js';

export interface PlayerEntity extends RenderableEntity {
  kind: 'player';
  characterId: CharacterId;
  name: string;
  element: string;
  atomicNumber: number;
  maxHealth: number;
  health: number;
  moveSpeed: number;
  projectileCount: number;
  projectileCountBonus: number;
  attackPowerMultiplier: number;
  attackRangeMultiplier: number;
  rangeMultiplier: number;
  cooldownMultiplier: number;
  invulnerableSec: number;
  movementIntent: { x: number; y: number };
  weaponSlots: Array<string | null>;
  passiveSlots: Array<string | null>;
}

export type Player = PlayerEntity;

export function createPlayer(characterId: CharacterId = DEFAULT_CHARACTER_ID): PlayerEntity {
  const paletteIndex = CHARACTER_ARCHETYPES.findIndex((candidate) => candidate.id === characterId);
  if (paletteIndex === -1) {
    throw new Error(`캐릭터 팔레트를 찾을 수 없습니다: ${characterId}`);
  }

  const archetype = getCharacterArchetype(characterId);
  return createPlayerFromArchetype(archetype, paletteIndex);
}

export function syncPlayerIntent(player: PlayerEntity, input: InputState): void {
  player.movementIntent.x = input.move.x;
  player.movementIntent.y = input.move.y;
}

function createPlayerFromArchetype(archetype: CharacterArchetype, paletteIndex: number): PlayerEntity {
  const maxHealth = Math.round(PLAYER_BASE_MAX_HEALTH * archetype.maxHealthMultiplier);
  const projectileCountBonus = archetype.projectileBonus;
  const attackRangeMultiplier = archetype.rangeMultiplier;

  return {
    kind: 'player',
    characterId: archetype.id,
    name: archetype.name,
    element: archetype.element,
    atomicNumber: archetype.atomicNumber,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    dx: 0,
    dy: 0,
    radius: PLAYER_RADIUS,
    paletteGroup: 0,
    paletteIndex,
    symbol: archetype.element,
    accessoryKind: paletteIndex % 3,
    maxHealth,
    health: maxHealth,
    moveSpeed: PLAYER_BASE_MOVE_SPEED * archetype.moveSpeedMultiplier,
    projectileCount: PLAYER_BASE_PROJECTILE_COUNT + projectileCountBonus,
    projectileCountBonus,
    attackPowerMultiplier: archetype.attackPowerMultiplier,
    attackRangeMultiplier,
    rangeMultiplier: attackRangeMultiplier,
    cooldownMultiplier: archetype.cooldownMultiplier,
    invulnerableSec: 0,
    movementIntent: { x: 0, y: 0 },
    weaponSlots: new Array<string | null>(PLAYER_SLOT_CAPACITY).fill(null),
    passiveSlots: new Array<string | null>(PLAYER_SLOT_CAPACITY).fill(null),
  };
}
