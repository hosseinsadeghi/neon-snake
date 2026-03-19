import { Direction, LevelDef, Point } from '../types';

function buildWalls(): Point[] {
  const walls: Point[] = [];
  const w = 35, h = 22;
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  // Wide arena with pillars
  const pillars = [
    { x: 6, y: 5 }, { x: 12, y: 5 }, { x: 22, y: 5 }, { x: 28, y: 5 },
    { x: 6, y: 11 }, { x: 17, y: 11 }, { x: 28, y: 11 },
    { x: 6, y: 16 }, { x: 12, y: 16 }, { x: 22, y: 16 }, { x: 28, y: 16 },
  ];
  for (const p of pillars) {
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        walls.push({ x: p.x + dx, y: p.y + dy });
      }
    }
  }
  return walls;
}

export const level13: LevelDef = {
  id: 13,
  name: 'Wide Arena',
  description: 'A wide battlefield with scattered pillars.',
  gridWidth: 35,
  gridHeight: 22,
  walls: buildWalls(),
  initialSpeed: 80,
  speedIncrement: 2,
  foodToWin: 25,
  specialFoodChance: 0.2,
  portalPairs: [],
  snakeStart: { x: 3, y: 3 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 2,
};
