import { Direction, LevelDef, Point } from '../types';

function buildWalls(): Point[] {
  const walls: Point[] = [];
  const w = 30, h = 30;
  for (let x = 0; x < w; x++) {
    walls.push({ x, y: 0 }, { x, y: h - 1 });
  }
  for (let y = 1; y < h - 1; y++) {
    walls.push({ x: 0, y }, { x: w - 1, y });
  }
  // Zigzag corridors
  for (let x = 3; x < 15; x++) walls.push({ x, y: 5 });
  for (let x = 15; x < 27; x++) walls.push({ x, y: 10 });
  for (let x = 3; x < 15; x++) walls.push({ x, y: 15 });
  for (let x = 15; x < 27; x++) walls.push({ x, y: 20 });
  for (let x = 3; x < 15; x++) walls.push({ x, y: 25 });
  return walls;
}

export const level11: LevelDef = {
  id: 11,
  name: 'Zigzag',
  description: 'Zigzag corridors. Speed is everything!',
  gridWidth: 30,
  gridHeight: 30,
  walls: buildWalls(),
  initialSpeed: 80,
  speedIncrement: 2,
  foodToWin: 20,
  specialFoodChance: 0.15,
  portalPairs: [],
  snakeStart: { x: 5, y: 3 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 1,
};
