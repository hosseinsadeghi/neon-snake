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
  // Scattered blocks (seeded pattern)
  const blockPositions = [
    { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 6 },
    { x: 12, y: 3 }, { x: 13, y: 3 }, { x: 13, y: 4 },
    { x: 20, y: 7 }, { x: 21, y: 7 }, { x: 20, y: 8 },
    { x: 8, y: 13 }, { x: 9, y: 13 }, { x: 8, y: 14 }, { x: 9, y: 14 },
    { x: 17, y: 15 }, { x: 18, y: 15 }, { x: 17, y: 16 },
    { x: 4, y: 20 }, { x: 5, y: 20 }, { x: 4, y: 21 },
    { x: 14, y: 20 }, { x: 15, y: 20 }, { x: 14, y: 21 }, { x: 15, y: 21 },
    { x: 22, y: 18 }, { x: 23, y: 18 }, { x: 22, y: 19 },
  ];
  walls.push(...blockPositions);
  return walls;
}

export const level07: LevelDef = {
  id: 7,
  name: 'Minefield',
  description: 'Random blocks everywhere. Stay sharp!',
  gridWidth: 26,
  gridHeight: 26,
  walls: buildWalls(),
  initialSpeed: 100,
  speedIncrement: 2,
  foodToWin: 18,
  specialFoodChance: 0.15,
  portalPairs: [],
  snakeStart: { x: 2, y: 2 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 1,
};
