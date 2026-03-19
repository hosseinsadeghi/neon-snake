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
  // Maze chambers - horizontal walls with gaps
  for (let x = 2; x < w - 2; x++) {
    if (x !== 8 && x !== 16) walls.push({ x, y: 6 });
    if (x !== 6 && x !== 14) walls.push({ x, y: 12 });
    if (x !== 10 && x !== 18) walls.push({ x, y: 18 });
  }
  return walls;
}

export const level05: LevelDef = {
  id: 5,
  name: 'Chambers',
  description: 'Three chambers. Find the gaps!',
  gridWidth: 24,
  gridHeight: 24,
  walls: buildWalls(),
  initialSpeed: 115,
  speedIncrement: 2,
  foodToWin: 15,
  specialFoodChance: 0.15,
  portalPairs: [],
  snakeStart: { x: 4, y: 3 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 1,
};
