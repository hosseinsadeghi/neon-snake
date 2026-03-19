import { Direction, LevelDef, Point } from '../types';

function border(w: number, h: number): Point[] {
  const walls: Point[] = [];
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  return walls;
}

function makeAStarLevel(
  id: number, name: string, desc: string,
  w: number, h: number, extraWalls: Point[],
  speed: number, foodToWin: number,
  portals: [Point, Point][] = [],
): LevelDef {
  return {
    id, name, description: desc,
    gridWidth: w, gridHeight: h,
    walls: [...border(w, h), ...extraWalls],
    initialSpeed: speed,
    speedIncrement: 1,
    foodToWin,
    specialFoodChance: 0.05,
    portalPairs: portals,
    snakeStart: { x: 3, y: Math.floor(h / 2) },
    snakeStartDir: Direction.RIGHT,
    growAmount: 1,
    rivalAiDifficulty: 1.0, // always max — A* is always optimal
    player2Start: { x: w - 4, y: Math.floor(h / 2) },
    player2StartDir: Direction.LEFT,
  };
}

export const ASTAR_LEVELS: LevelDef[] = [
  makeAStarLevel(1, 'A* Awakens', 'The A* snake finds food optimally. You must be faster!',
    22, 22, [], 150, 8),
  makeAStarLevel(2, 'Optimal Path', 'It always takes the shortest route.',
    22, 22, (() => {
      const w: Point[] = [];
      for (let i = 4; i < 18; i++) w.push({ x: 11, y: i });
      return w;
    })(), 140, 10),
  makeAStarLevel(3, 'Maze Solver', 'Walls mean nothing to an A* solver.',
    24, 24, (() => {
      const w: Point[] = [];
      for (let x = 4; x < 12; x++) w.push({ x, y: 7 });
      for (let x = 12; x < 20; x++) w.push({ x, y: 16 });
      for (let y = 7; y < 16; y++) w.push({ x: 12, y });
      return w;
    })(), 130, 10),
  makeAStarLevel(4, 'Head to Head', 'Same speed. Pure pathfinding vs instinct.',
    24, 24, (() => {
      const w: Point[] = [];
      for (let i = 3; i < 10; i++) w.push({ x: 8, y: i }, { x: 15, y: 24 - 1 - i });
      for (let i = 8; i < 16; i++) w.push({ x: i, y: 12 });
      return w;
    })(), 120, 12),
  makeAStarLevel(5, 'Tight Quarters', 'Narrow corridors where every move counts.',
    26, 26, (() => {
      const w: Point[] = [];
      for (let x = 3; x < 23; x++) { if (x !== 8 && x !== 18) w.push({ x, y: 6 }); }
      for (let x = 3; x < 23; x++) { if (x !== 13) w.push({ x, y: 12 }); }
      for (let x = 3; x < 23; x++) { if (x !== 6 && x !== 20) w.push({ x, y: 19 }); }
      return w;
    })(), 115, 15),
  makeAStarLevel(6, 'Portal Wars', 'A* uses portals perfectly. Can you?',
    26, 26, (() => {
      const w: Point[] = [];
      for (let y = 4; y < 22; y++) { if (y !== 10 && y !== 16) w.push({ x: 13, y }); }
      for (let x = 4; x < 10; x++) w.push({ x, y: 10 });
      for (let x = 16; x < 22; x++) w.push({ x, y: 16 });
      return w;
    })(), 110, 15,
    [[{ x: 3, y: 3 }, { x: 22, y: 22 }], [{ x: 22, y: 3 }, { x: 3, y: 22 }]]),
  makeAStarLevel(7, 'Speed Demon', 'Faster game speed. A* doesn\'t slow down.',
    28, 28, (() => {
      const w: Point[] = [];
      // Scattered 2x2 blocks
      const blocks = [[6,6],[12,4],[20,6],[6,14],[14,14],[22,14],[6,22],[14,22],[22,20]];
      for (const [bx, by] of blocks) {
        for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) w.push({ x: bx+dx, y: by+dy });
      }
      return w;
    })(), 95, 18),
  makeAStarLevel(8, 'The Gauntlet', 'Dense maze + perfect AI = suffering.',
    28, 28, (() => {
      const w: Point[] = [];
      for (let x = 4; x < 14; x++) w.push({ x, y: 6 });
      for (let x = 14; x < 24; x++) w.push({ x, y: 10 });
      for (let x = 4; x < 14; x++) w.push({ x, y: 14 });
      for (let x = 14; x < 24; x++) w.push({ x, y: 18 });
      for (let x = 4; x < 14; x++) w.push({ x, y: 22 });
      // Vertical connectors
      for (let y = 6; y < 11; y++) w.push({ x: 14, y });
      for (let y = 14; y < 19; y++) w.push({ x: 14, y });
      return w;
    })(), 90, 18),
  makeAStarLevel(9, 'No Mercy', 'A* + portals + narrow paths. Nearly impossible.',
    30, 30, (() => {
      const w: Point[] = [];
      // Complex maze
      for (let x = 4; x < 26; x++) { if (x !== 10 && x !== 20) w.push({ x, y: 7 }); }
      for (let x = 4; x < 26; x++) { if (x !== 15) w.push({ x, y: 14 }); }
      for (let x = 4; x < 26; x++) { if (x !== 8 && x !== 22) w.push({ x, y: 22 }); }
      for (let y = 7; y < 15; y++) { if (y !== 10) w.push({ x: 15, y }); }
      for (let y = 14; y < 23; y++) { if (y !== 18) w.push({ x: 15, y }); }
      return w;
    })(), 85, 20,
    [[{ x: 2, y: 2 }, { x: 27, y: 27 }], [{ x: 27, y: 2 }, { x: 2, y: 27 }]]),
  makeAStarLevel(10, 'IMPOSSIBLE', 'Perfect pathfinding. Perfect avoidance. You WILL lose.',
    30, 30, (() => {
      const w: Point[] = [];
      // Dense interlocking walls
      for (let x = 4; x < 26; x++) { if (x % 5 !== 0) w.push({ x, y: 5 }); }
      for (let x = 4; x < 26; x++) { if ((x+2) % 5 !== 0) w.push({ x, y: 10 }); }
      for (let x = 4; x < 26; x++) { if ((x+4) % 5 !== 0) w.push({ x, y: 15 }); }
      for (let x = 4; x < 26; x++) { if ((x+1) % 5 !== 0) w.push({ x, y: 20 }); }
      for (let x = 4; x < 26; x++) { if ((x+3) % 5 !== 0) w.push({ x, y: 25 }); }
      return w;
    })(), 80, 25,
    [[{ x: 2, y: 15 }, { x: 27, y: 15 }], [{ x: 15, y: 2 }, { x: 15, y: 27 }]]),
];
