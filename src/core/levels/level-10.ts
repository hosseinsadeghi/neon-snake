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
  // Boss level: diamond pattern + inner rooms
  const cx = 15, cy = 15;
  for (let i = 0; i < 8; i++) {
    walls.push({ x: cx - 8 + i, y: cy - i });
    walls.push({ x: cx + 8 - i, y: cy - i });
    walls.push({ x: cx - 8 + i, y: cy + i });
    walls.push({ x: cx + 8 - i, y: cy + i });
  }
  // Inner box
  for (let i = -2; i <= 2; i++) {
    walls.push({ x: cx + i, y: cy - 3 });
    walls.push({ x: cx + i, y: cy + 3 });
  }
  for (let i = -2; i <= 2; i++) {
    walls.push({ x: cx - 3, y: cy + i });
    walls.push({ x: cx + 3, y: cy + i });
  }
  // Corner blocks
  for (let dx = 0; dx < 3; dx++) {
    for (let dy = 0; dy < 3; dy++) {
      walls.push({ x: 3 + dx, y: 3 + dy });
      walls.push({ x: w - 6 + dx, y: 3 + dy });
      walls.push({ x: 3 + dx, y: h - 6 + dy });
      walls.push({ x: w - 6 + dx, y: h - 6 + dy });
    }
  }
  return walls;
}

export const level10: LevelDef = {
  id: 10,
  name: 'Final Form',
  description: 'The ultimate challenge. All mechanics. Good luck!',
  gridWidth: 30,
  gridHeight: 30,
  walls: buildWalls(),
  initialSpeed: 85,
  speedIncrement: 3,
  foodToWin: 25,
  specialFoodChance: 0.2,
  portalPairs: [
    [{ x: 2, y: 15 }, { x: 27, y: 15 }],
    [{ x: 15, y: 2 }, { x: 15, y: 27 }],
  ],
  snakeStart: { x: 8, y: 8 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 2,
};
