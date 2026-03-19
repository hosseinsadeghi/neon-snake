import { Direction, LevelDef, Point } from '../types';

function border(w: number, h: number): Point[] {
  const walls: Point[] = [];
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  return walls;
}

function makeMPLevel(
  id: number, name: string, desc: string,
  w: number, h: number, extraWalls: Point[],
  speed: number, foodToWin: number,
): LevelDef {
  return {
    id, name, description: desc,
    gridWidth: w, gridHeight: h,
    walls: [...border(w, h), ...extraWalls],
    initialSpeed: speed,
    speedIncrement: 2,
    foodToWin,
    specialFoodChance: 0.1,
    portalPairs: [],
    snakeStart: { x: 3, y: Math.floor(h / 2) },
    snakeStartDir: Direction.RIGHT,
    growAmount: 1,
    player2Start: { x: w - 4, y: Math.floor(h / 2) },
    player2StartDir: Direction.LEFT,
  };
}

export const MULTIPLAYER_LEVELS: LevelDef[] = [
  makeMPLevel(1, 'Duel', 'First to eat wins!', 24, 24, [], 140, 8),
  makeMPLevel(2, 'Divided', 'A wall divides the arena... mostly.', 26, 26, (() => {
    const w: Point[] = [];
    for (let y = 3; y < 23; y++) { if (y !== 10 && y !== 16) w.push({ x: 13, y }); }
    return w;
  })(), 130, 10),
  makeMPLevel(3, 'Pillars', 'Navigate the pillars!', 28, 28, (() => {
    const w: Point[] = [];
    for (const pos of [{ x: 7, y: 7 }, { x: 20, y: 7 }, { x: 7, y: 20 }, { x: 20, y: 20 }, { x: 14, y: 14 }]) {
      for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) w.push({ x: pos.x + dx, y: pos.y + dy });
    }
    return w;
  })(), 125, 12),
  makeMPLevel(4, 'Corridors', 'Tight spaces. Don\'t crash!', 28, 28, (() => {
    const w: Point[] = [];
    for (let x = 3; x < 25; x++) { if (x !== 10 && x !== 18) w.push({ x, y: 9 }); }
    for (let x = 3; x < 25; x++) { if (x !== 7 && x !== 20) w.push({ x, y: 18 }); }
    return w;
  })(), 120, 12),
  makeMPLevel(5, 'The X', 'Cross-shaped arena.', 30, 30, (() => {
    const w: Point[] = [];
    for (let i = 3; i < 13; i++) {
      w.push({ x: i, y: i }, { x: 30 - 1 - i, y: i });
      w.push({ x: i, y: 30 - 1 - i }, { x: 30 - 1 - i, y: 30 - 1 - i });
    }
    return w;
  })(), 115, 15),
  makeMPLevel(6, 'Maze Race', 'Race through the maze!', 30, 30, (() => {
    const w: Point[] = [];
    for (let x = 5; x < 25; x++) { if (x !== 12 && x !== 20) w.push({ x, y: 7 }); }
    for (let x = 5; x < 25; x++) { if (x !== 8 && x !== 17) w.push({ x, y: 14 }); }
    for (let x = 5; x < 25; x++) { if (x !== 10 && x !== 22) w.push({ x, y: 22 }); }
    return w;
  })(), 110, 15),
  makeMPLevel(7, 'Cramped', 'Tiny arena. No room for error!', 20, 20, (() => {
    const w: Point[] = [];
    for (let i = 4; i < 10; i++) w.push({ x: 10, y: i });
    for (let i = 10; i < 16; i++) w.push({ x: 10, y: i });
    return w;
  })(), 105, 10),
  makeMPLevel(8, 'Symmetry', 'Perfectly mirrored arena.', 32, 32, (() => {
    const w: Point[] = [];
    const half = 16;
    for (let i = 5; i < 12; i++) {
      w.push({ x: half - 5, y: i }, { x: half + 4, y: i });
      w.push({ x: half - 5, y: 32 - 1 - i }, { x: half + 4, y: 32 - 1 - i });
    }
    return w;
  })(), 100, 18),
  makeMPLevel(9, 'Chaos', 'Scattered blocks everywhere!', 32, 32, (() => {
    const w: Point[] = [];
    const blocks = [
      5, 5, 10, 5, 21, 5, 26, 5,
      5, 12, 15, 10, 26, 12,
      5, 19, 10, 26, 15, 21, 21, 26, 26, 19,
    ];
    for (let i = 0; i < blocks.length; i += 2) {
      for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) {
        w.push({ x: blocks[i] + dx, y: blocks[i + 1] + dy });
      }
    }
    return w;
  })(), 95, 18),
  makeMPLevel(10, 'Ultimate Duel', 'The final showdown!', 34, 34, (() => {
    const w: Point[] = [];
    // Diamond
    const cx = 17, cy = 17;
    for (let i = 0; i < 7; i++) {
      w.push({ x: cx - 7 + i, y: cy - i }, { x: cx + 7 - i, y: cy - i });
      w.push({ x: cx - 7 + i, y: cy + i }, { x: cx + 7 - i, y: cy + i });
    }
    return w;
  })(), 90, 20),
];
