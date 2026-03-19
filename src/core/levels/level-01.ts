import { Direction, LevelDef } from '../types';

export const level01: LevelDef = {
  id: 1,
  name: 'First Steps',
  description: 'Learn the basics. No walls, just eat!',
  gridWidth: 20,
  gridHeight: 20,
  walls: [],
  initialSpeed: 150,
  speedIncrement: 2,
  foodToWin: 5,
  specialFoodChance: 0,
  portalPairs: [],
  snakeStart: { x: 10, y: 10 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 1,
};
