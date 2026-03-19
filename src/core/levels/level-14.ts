import { Direction, LevelDef, Point } from '../types';

function buildWalls(): Point[] {
  const walls: Point[] = [];
  const w = 30, h = 30;
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  // Double spiral
  const cx = 15, cy = 15;
  // Outer spiral
  for (let i = 0; i < 10; i++) walls.push({ x: cx - 6 + i, y: cy - 6 });
  for (let i = 0; i < 12; i++) walls.push({ x: cx + 5, y: cy - 6 + i });
  for (let i = 0; i < 10; i++) walls.push({ x: cx + 4 - i, y: cy + 6 });
  for (let i = 0; i < 10; i++) walls.push({ x: cx - 5, y: cy + 5 - i });
  // Inner spiral
  for (let i = 0; i < 5; i++) walls.push({ x: cx - 3 + i, y: cy - 3 });
  for (let i = 0; i < 6; i++) walls.push({ x: cx + 2, y: cy - 3 + i });
  for (let i = 0; i < 4; i++) walls.push({ x: cx + 1 - i, y: cy + 3 });
  return walls;
}

export const level14: LevelDef = {
  id: 14,
  name: 'Double Spiral',
  description: 'A double spiral maze with 3 portal pairs!',
  gridWidth: 30,
  gridHeight: 30,
  walls: buildWalls(),
  initialSpeed: 80,
  speedIncrement: 3,
  foodToWin: 22,
  specialFoodChance: 0.2,
  portalPairs: [
    [{ x: 2, y: 2 }, { x: 27, y: 27 }],
    [{ x: 27, y: 2 }, { x: 2, y: 27 }],
    [{ x: 14, y: 2 }, { x: 14, y: 27 }],
  ],
  snakeStart: { x: 8, y: 8 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 2,
};
