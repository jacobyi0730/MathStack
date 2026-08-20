import { FIELD_BOUNDS } from '../data/characters.js';
import { createPlayer, type Player } from '../entities/player.js';
import { createInputState, type InputState } from './input.js';
import type { RenderableEntity, RenderScene } from './renderer.js';

export interface GameState {
  elapsedSec: number;
  ticks: number;
  entityCount: number;
  world: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  input: InputState;
  player: Player;
  entities: RenderableEntity[];
}

export interface GameStateOptions {
  player: Player;
  entities?: RenderableEntity[];
}

export function createGameState(options?: GameStateOptions): GameState & RenderScene {
  const player = options?.player ?? createPlayer('hydrogen');
  const entities = options?.entities ?? [player];
  return {
    elapsedSec: 0,
    ticks: 0,
    entityCount: entities.length,
    world: { ...FIELD_BOUNDS },
    input: createInputState(),
    player,
    entities,
  };
}
