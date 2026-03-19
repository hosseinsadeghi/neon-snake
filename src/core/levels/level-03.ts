import { Direction, LevelDef, Point } from '../types';

function buildWalls(): Point[] {
  const walls: Point[] = [];
  const w = 22, h = 22;
  // Border
  for (let x = 0; x < w; x++) {
    walls.push({ x, y: 0 }, { x, y: h - 1 });
  }
  for (let y = 1; y < h - 1; y++) {
    walls.push({ x: 0, y }, { x: w - 1, y });
  }
  // Center cross
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  for (let i = -3; i <= 3; i++) {
    walls.push({ x: cx + i, y: cy });
    walls.push({ x: cx, y: cy + i });
  }
  return walls;
}

export const level03: LevelDef = {
  id: 3,
  name: 'The Cross',
  description: 'A cross-shaped obstacle blocks the center.',
  gridWidth: 22,
  gridHeight: 22,
  walls: buildWalls(),
  initialSpeed: 130,
  speedIncrement: 2,
  foodToWin: 10,
  specialFoodChance: 0.05,
  portalPairs: [],
  snakeStart: { x: 5, y: 5 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 1,
};
