import { Direction, LevelDef, Point } from '../types';

function buildWalls(): Point[] {
  const walls: Point[] = [];
  const w = 28, h = 28;
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  // Four rooms with doorways
  const mx = 14, my = 14;
  for (let x = 1; x < w - 1; x++) {
    if (x !== 6 && x !== 21) walls.push({ x, y: my });
  }
  for (let y = 1; y < h - 1; y++) {
    if (y !== 6 && y !== 21) walls.push({ x: mx, y });
  }
  // Inner walls per room
  for (let i = 4; i < 10; i++) {
    walls.push({ x: i, y: 5 });
    walls.push({ x: w - 1 - i, y: h - 6 });
  }
  return walls;
}

export const level12: LevelDef = {
  id: 12,
  name: 'Four Rooms',
  description: 'Four chambers connected by doorways.',
  gridWidth: 28,
  gridHeight: 28,
  walls: buildWalls(),
  initialSpeed: 85,
  speedIncrement: 2,
  foodToWin: 22,
  specialFoodChance: 0.15,
  portalPairs: [
    [{ x: 3, y: 3 }, { x: 24, y: 24 }],
    [{ x: 24, y: 3 }, { x: 3, y: 24 }],
  ],
  snakeStart: { x: 5, y: 5 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 1,
};
