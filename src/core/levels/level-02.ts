import { Direction, LevelDef, Point } from '../types';

function borderWalls(w: number, h: number): Point[] {
  const walls: Point[] = [];
  for (let x = 0; x < w; x++) {
    walls.push({ x, y: 0 });
    walls.push({ x, y: h - 1 });
  }
  for (let y = 1; y < h - 1; y++) {
    walls.push({ x: 0, y });
    walls.push({ x: w - 1, y });
  }
  return walls;
}

export const level02: LevelDef = {
  id: 2,
  name: 'Walled In',
  description: 'Border walls appear. Watch your edges!',
  gridWidth: 20,
  gridHeight: 20,
  walls: borderWalls(20, 20),
  initialSpeed: 140,
  speedIncrement: 2,
  foodToWin: 8,
  specialFoodChance: 0,
  portalPairs: [],
  snakeStart: { x: 10, y: 10 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 1,
};
