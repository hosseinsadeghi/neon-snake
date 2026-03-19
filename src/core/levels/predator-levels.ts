import { Direction, LevelDef, Point } from '../types';

function border(w: number, h: number): Point[] {
  const walls: Point[] = [];
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  return walls;
}

function makePredatorLevel(
  id: number, name: string, desc: string,
  w: number, h: number, extraWalls: Point[],
  speed: number, foodToWin: number, aiSpeed: number,
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
    // Reuse rivalAiDifficulty for predator speed/intelligence
    rivalAiDifficulty: aiSpeed,
    player2Start: { x: w - 4, y: Math.floor(h / 2) },
    player2StartDir: Direction.LEFT,
  };
}

export const PREDATOR_LEVELS: LevelDef[] = [
  makePredatorLevel(1, 'The Hunt Begins', 'A slow predator stalks you...', 24, 24, [], 140, 8, 0.3),
  makePredatorLevel(2, 'Getting Closer', 'It\'s getting faster.', 24, 24, [], 135, 10, 0.4),
  makePredatorLevel(3, 'No Escape', 'Walls limit your escape routes.', 26, 26, (() => {
    const w: Point[] = [];
    for (let i = 5; i < 12; i++) w.push({ x: 13, y: i });
    for (let i = 14; i < 21; i++) w.push({ x: 13, y: i });
    return w;
  })(), 130, 10, 0.5),
  makePredatorLevel(4, 'Cornered', 'The predator learns your tricks.', 26, 26, (() => {
    const w: Point[] = [];
    for (let i = 4; i < 12; i++) w.push({ x: 8, y: i });
    for (let i = 14; i < 22; i++) w.push({ x: 17, y: i });
    return w;
  })(), 125, 12, 0.6),
  makePredatorLevel(5, 'Smart Hunter', 'It predicts your movement!', 28, 28, (() => {
    const w: Point[] = [];
    for (let x = 5; x < 12; x++) w.push({ x, y: 9 });
    for (let x = 16; x < 23; x++) w.push({ x, y: 18 });
    return w;
  })(), 120, 12, 0.7),
  makePredatorLevel(6, 'Relentless', 'It never stops. Neither should you.', 28, 28, (() => {
    const w: Point[] = [];
    const cx = 14;
    for (let i = -4; i <= 4; i++) w.push({ x: cx + i, y: cx });
    for (let i = -4; i <= 4; i++) w.push({ x: cx, y: cx + i });
    return w;
  })(), 115, 15, 0.75),
  makePredatorLevel(7, 'Maze Runner', 'Navigate the maze while being hunted!', 30, 30, (() => {
    const w: Point[] = [];
    for (let x = 4; x < 14; x++) w.push({ x, y: 7 });
    for (let x = 16; x < 26; x++) w.push({ x, y: 14 });
    for (let x = 4; x < 14; x++) w.push({ x, y: 22 });
    for (let y = 7; y < 15; y++) w.push({ x: 14, y });
    for (let y = 14; y < 23; y++) w.push({ x: 16, y });
    return w;
  })(), 110, 15, 0.8),
  makePredatorLevel(8, 'Death Chase', 'The predator is nearly perfect.', 30, 30, (() => {
    const w: Point[] = [];
    for (let i = 4; i < 14; i++) w.push({ x: 10, y: i }, { x: 19, y: 30 - 1 - i });
    return w;
  })(), 100, 18, 0.85),
  makePredatorLevel(9, 'Nightmare', 'BFS pathfinding. It always finds you.', 32, 32, (() => {
    const w: Point[] = [];
    for (let x = 5; x < 27; x++) { if (x !== 12 && x !== 20) w.push({ x, y: 10 }); }
    for (let x = 5; x < 27; x++) { if (x !== 8 && x !== 24) w.push({ x, y: 21 }); }
    for (let y = 10; y < 22; y++) { if (y !== 15) w.push({ x: 16, y }); }
    return w;
  })(), 95, 18, 0.9),
  makePredatorLevel(10, 'Terminator', 'It cannot be bargained with. It cannot be reasoned with.', 32, 32, (() => {
    const w: Point[] = [];
    // Sparse obstacles
    for (let i = 5; i < 12; i++) w.push({ x: 8, y: i }, { x: 23, y: 32 - 1 - i });
    for (let i = 5; i < 12; i++) w.push({ x: i, y: 8 }, { x: 32 - 1 - i, y: 23 });
    return w;
  })(), 90, 20, 1.0),
];
