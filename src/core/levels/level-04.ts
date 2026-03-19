import { Direction, LevelDef, Point } from '../types';

function buildWalls(): Point[] {
  const walls: Point[] = [];
  const w = 22, h = 22;
  for (let x = 0; x < w; x++) {
    walls.push({ x, y: 0 }, { x, y: h - 1 });
  }
  for (let y = 1; y < h - 1; y++) {
    walls.push({ x: 0, y }, { x: w - 1, y });
  }
  // L-shaped corridors
  for (let i = 2; i < 10; i++) {
    walls.push({ x: 6, y: i });
    walls.push({ x: w - 7, y: h - 1 - i });
  }
  for (let i = 6; i < 14; i++) {
    walls.push({ x: i, y: 10 });
    walls.push({ x: w - 1 - i, y: h - 11 });
  }
  return walls;
}

export const level04: LevelDef = {
  id: 4,
  name: 'L-Corridors',
  description: 'Navigate tight L-shaped passages.',
  gridWidth: 22,
  gridHeight: 22,
  walls: buildWalls(),
  initialSpeed: 120,
  speedIncrement: 2,
  foodToWin: 12,
  specialFoodChance: 0.1,
  portalPairs: [],
  snakeStart: { x: 3, y: 3 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 1,
};
