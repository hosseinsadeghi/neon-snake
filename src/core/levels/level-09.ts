import { Direction, LevelDef, Point } from '../types';

function buildWalls(): Point[] {
  const walls: Point[] = [];
  const w = 28, h = 28;
  for (let x = 0; x < w; x++) {
    walls.push({ x, y: 0 }, { x, y: h - 1 });
  }
  for (let y = 1; y < h - 1; y++) {
    walls.push({ x: 0, y }, { x: w - 1, y });
  }
  // Dense maze pattern
  const mazeWalls = [
    // Vertical pillars
    ...Array.from({ length: 6 }, (_, i) => ({ x: 5, y: 3 + i })),
    ...Array.from({ length: 6 }, (_, i) => ({ x: 10, y: 8 + i })),
    ...Array.from({ length: 6 }, (_, i) => ({ x: 15, y: 3 + i })),
    ...Array.from({ length: 6 }, (_, i) => ({ x: 20, y: 10 + i })),
    ...Array.from({ length: 6 }, (_, i) => ({ x: 5, y: 18 + i })),
    ...Array.from({ length: 6 }, (_, i) => ({ x: 12, y: 16 + i })),
    ...Array.from({ length: 6 }, (_, i) => ({ x: 22, y: 18 + i })),
    // Horizontal bars
    ...Array.from({ length: 5 }, (_, i) => ({ x: 6 + i, y: 5 })),
    ...Array.from({ length: 5 }, (_, i) => ({ x: 16 + i, y: 7 })),
    ...Array.from({ length: 5 }, (_, i) => ({ x: 3 + i, y: 14 })),
    ...Array.from({ length: 5 }, (_, i) => ({ x: 14 + i, y: 20 })),
  ];
  walls.push(...mazeWalls);
  return walls;
}

export const level09: LevelDef = {
  id: 9,
  name: 'Labyrinth',
  description: 'A dense maze with portals. Almost there!',
  gridWidth: 28,
  gridHeight: 28,
  walls: buildWalls(),
  initialSpeed: 90,
  speedIncrement: 2,
  foodToWin: 20,
  specialFoodChance: 0.2,
  portalPairs: [
    [{ x: 2, y: 2 }, { x: 25, y: 25 }],
    [{ x: 13, y: 2 }, { x: 13, y: 25 }],
  ],
  snakeStart: { x: 3, y: 3 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 1,
};
