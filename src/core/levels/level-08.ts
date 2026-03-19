import { Direction, LevelDef, Point } from '../types';

function buildWalls(): Point[] {
  const walls: Point[] = [];
  const w = 26, h = 26;
  for (let x = 0; x < w; x++) {
    walls.push({ x, y: 0 }, { x, y: h - 1 });
  }
  for (let y = 1; y < h - 1; y++) {
    walls.push({ x: 0, y }, { x: w - 1, y });
  }
  // Narrow horizontal corridors
  for (let x = 2; x < w - 2; x++) {
    if (x !== 7 && x !== 18) walls.push({ x, y: 5 });
    if (x !== 12) walls.push({ x, y: 9 });
    if (x !== 5 && x !== 20) walls.push({ x, y: 13 });
    if (x !== 15) walls.push({ x, y: 17 });
    if (x !== 8 && x !== 22) walls.push({ x, y: 21 });
  }
  return walls;
}

export const level08: LevelDef = {
  id: 8,
  name: 'Corridors',
  description: 'Narrow passages with portal shortcuts!',
  gridWidth: 26,
  gridHeight: 26,
  walls: buildWalls(),
  initialSpeed: 95,
  speedIncrement: 2,
  foodToWin: 18,
  specialFoodChance: 0.15,
  portalPairs: [
    [{ x: 3, y: 3 }, { x: 22, y: 22 }],
    [{ x: 22, y: 3 }, { x: 3, y: 22 }],
  ],
  snakeStart: { x: 4, y: 2 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 1,
};
