import { Direction, LevelDef, Point } from '../types';

function buildWalls(): Point[] {
  const walls: Point[] = [];
  const w = 24, h = 24;
  for (let x = 0; x < w; x++) {
    walls.push({ x, y: 0 }, { x, y: h - 1 });
  }
  for (let y = 1; y < h - 1; y++) {
    walls.push({ x: 0, y }, { x: w - 1, y });
  }
  // Spiral pattern
  const cx = 12, cy = 12;
  for (let i = 0; i < 8; i++) walls.push({ x: cx - 4 + i, y: cy - 4 });
  for (let i = 0; i < 8; i++) walls.push({ x: cx + 4, y: cy - 4 + i });
  for (let i = 0; i < 7; i++) walls.push({ x: cx + 3 - i, y: cy + 4 });
  for (let i = 0; i < 6; i++) walls.push({ x: cx - 3, y: cy + 3 - i });
  for (let i = 0; i < 4; i++) walls.push({ x: cx - 2 + i, y: cy - 2 });
  return walls;
}

export const level06: LevelDef = {
  id: 6,
  name: 'Spiral',
  description: 'A spiral trap. Snake grows faster here!',
  gridWidth: 24,
  gridHeight: 24,
  walls: buildWalls(),
  initialSpeed: 110,
  speedIncrement: 3,
  foodToWin: 15,
  specialFoodChance: 0.1,
  portalPairs: [],
  snakeStart: { x: 4, y: 4 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 2,
};
