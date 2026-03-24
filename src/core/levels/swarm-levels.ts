import { Direction, LevelDef, Point } from '../types';

function border(w: number, h: number): Point[] {
  const walls: Point[] = [];
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  return walls;
}

function makeSwarmLevel(
  id: number, name: string, desc: string,
  w: number, h: number, extraWalls: Point[],
  speed: number, foodToWin: number,
  spawns: { pos: Point; dir: Direction }[],
): LevelDef {
  return {
    id, name, description: desc,
    gridWidth: w, gridHeight: h,
    walls: [...border(w, h), ...extraWalls],
    initialSpeed: speed,
    speedIncrement: 2,
    foodToWin,
    specialFoodChance: 0.15,
    portalPairs: [],
    snakeStart: { x: Math.floor(w / 2), y: Math.floor(h / 2) },
    snakeStartDir: Direction.RIGHT,
    growAmount: 1,
    swarmSpawns: spawns,
  };
}

export const SWARM_LEVELS: LevelDef[] = [
  // Level 1: 3 snakes in corners
  makeSwarmLevel(1, 'Ambush', 'Three snakes close in!', 26, 26, [], 140, 10, [
    { pos: { x: 3, y: 3 }, dir: Direction.RIGHT },
    { pos: { x: 22, y: 3 }, dir: Direction.LEFT },
    { pos: { x: 3, y: 22 }, dir: Direction.RIGHT },
  ]),

  // Level 2: 4 snakes + pillars
  makeSwarmLevel(2, 'Surrounded', 'Nowhere to hide.', 28, 28, (() => {
    const w: Point[] = [];
    for (const p of [{ x: 7, y: 7 }, { x: 20, y: 7 }, { x: 7, y: 20 }, { x: 20, y: 20 }]) {
      for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) w.push({ x: p.x + dx, y: p.y + dy });
    }
    return w;
  })(), 130, 12, [
    { pos: { x: 3, y: 3 }, dir: Direction.DOWN },
    { pos: { x: 24, y: 3 }, dir: Direction.DOWN },
    { pos: { x: 3, y: 24 }, dir: Direction.UP },
    { pos: { x: 24, y: 24 }, dir: Direction.UP },
  ]),

  // Level 3: 5 snakes in a cross pattern, corridors
  makeSwarmLevel(3, 'Gauntlet', 'Run the gauntlet!', 30, 30, (() => {
    const w: Point[] = [];
    for (let x = 5; x < 25; x++) { if (x !== 12 && x !== 18) w.push({ x, y: 10 }); }
    for (let x = 5; x < 25; x++) { if (x !== 10 && x !== 20) w.push({ x, y: 20 }); }
    return w;
  })(), 120, 15, [
    { pos: { x: 3, y: 5 }, dir: Direction.RIGHT },
    { pos: { x: 26, y: 5 }, dir: Direction.LEFT },
    { pos: { x: 3, y: 15 }, dir: Direction.RIGHT },
    { pos: { x: 26, y: 15 }, dir: Direction.LEFT },
    { pos: { x: 15, y: 26 }, dir: Direction.UP },
  ]),

  // Level 4: 6 snakes, open arena, pure chaos
  makeSwarmLevel(4, 'Swarm', 'Six against one. Good luck.', 32, 32, [], 115, 15, [
    { pos: { x: 3, y: 3 }, dir: Direction.RIGHT },
    { pos: { x: 28, y: 3 }, dir: Direction.LEFT },
    { pos: { x: 3, y: 28 }, dir: Direction.RIGHT },
    { pos: { x: 28, y: 28 }, dir: Direction.LEFT },
    { pos: { x: 16, y: 3 }, dir: Direction.DOWN },
    { pos: { x: 16, y: 28 }, dir: Direction.UP },
  ]),

  // Level 5: 8 snakes, scattered blocks - absolute mayhem
  makeSwarmLevel(5, 'Mayhem', 'Total chaos. Survive!', 34, 34, (() => {
    const w: Point[] = [];
    const blocks = [
      8, 8, 25, 8, 8, 25, 25, 25, 16, 16,
    ];
    for (let i = 0; i < blocks.length; i += 2) {
      for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 3; dy++) {
        w.push({ x: blocks[i] + dx, y: blocks[i + 1] + dy });
      }
    }
    return w;
  })(), 110, 20, [
    { pos: { x: 3, y: 3 }, dir: Direction.RIGHT },
    { pos: { x: 30, y: 3 }, dir: Direction.LEFT },
    { pos: { x: 3, y: 30 }, dir: Direction.RIGHT },
    { pos: { x: 30, y: 30 }, dir: Direction.LEFT },
    { pos: { x: 17, y: 3 }, dir: Direction.DOWN },
    { pos: { x: 17, y: 30 }, dir: Direction.UP },
    { pos: { x: 3, y: 17 }, dir: Direction.RIGHT },
    { pos: { x: 30, y: 17 }, dir: Direction.LEFT },
  ]),
];
