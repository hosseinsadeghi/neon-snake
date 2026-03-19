import { Direction, LevelDef, Point } from '../types';

function buildWalls(): Point[] {
  const walls: Point[] = [];
  const w = 35, h = 35;
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  // Grand finale: concentric rectangles with gaps
  const rects = [
    { x1: 4, y1: 4, x2: 30, y2: 30, gaps: [10, 24] },
    { x1: 8, y1: 8, x2: 26, y2: 26, gaps: [14, 20] },
    { x1: 12, y1: 12, x2: 22, y2: 22, gaps: [17] },
  ];
  for (const r of rects) {
    for (let x = r.x1; x <= r.x2; x++) {
      if (!r.gaps.includes(x)) {
        walls.push({ x, y: r.y1 });
        walls.push({ x, y: r.y2 });
      }
    }
    for (let y = r.y1 + 1; y < r.y2; y++) {
      if (!r.gaps.includes(y)) {
        walls.push({ x: r.x1, y });
        walls.push({ x: r.x2, y });
      }
    }
  }
  // Corner blocks
  for (let d = 0; d < 2; d++) {
    for (let e = 0; e < 2; e++) {
      walls.push({ x: 2 + d, y: 2 + e });
      walls.push({ x: w - 3 + d, y: 2 + e });
      walls.push({ x: 2 + d, y: h - 3 + e });
      walls.push({ x: w - 3 + d, y: h - 3 + e });
    }
  }
  return walls;
}

export const level15: LevelDef = {
  id: 15,
  name: 'Grand Finale',
  description: 'The ultimate maze. Concentric rings of death!',
  gridWidth: 35,
  gridHeight: 35,
  walls: buildWalls(),
  initialSpeed: 75,
  speedIncrement: 3,
  foodToWin: 30,
  specialFoodChance: 0.2,
  portalPairs: [
    [{ x: 2, y: 17 }, { x: 32, y: 17 }],
    [{ x: 17, y: 2 }, { x: 17, y: 32 }],
  ],
  snakeStart: { x: 6, y: 6 },
  snakeStartDir: Direction.RIGHT,
  growAmount: 3,
};
