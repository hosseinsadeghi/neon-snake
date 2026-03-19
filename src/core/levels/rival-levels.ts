import { Direction, LevelDef, Point } from '../types';

function border(w: number, h: number): Point[] {
  const walls: Point[] = [];
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  return walls;
}

function makeRivalLevel(
  id: number, name: string, desc: string,
  w: number, h: number, extraWalls: Point[],
  speed: number, foodToWin: number, difficulty: number,
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
    rivalAiDifficulty: difficulty,
    player2Start: { x: w - 4, y: Math.floor(h / 2) },
    player2StartDir: Direction.LEFT,
  };
}

export const RIVAL_LEVELS: LevelDef[] = [
  makeRivalLevel(1, 'Easy Pickings', 'A slow rival. Grab food first!', 22, 22, [], 150, 8, 0.2),
  makeRivalLevel(2, 'Getting Warmer', 'The rival is learning...', 22, 22, [], 140, 10, 0.3),
  makeRivalLevel(3, 'Even Match', 'You\'re evenly matched now.', 24, 24, (() => {
    const w: Point[] = [];
    for (let i = 5; i < 19; i++) w.push({ x: 12, y: i });
    return w;
  })(), 130, 10, 0.4),
  makeRivalLevel(4, 'Tricky', 'The rival plans ahead.', 24, 24, (() => {
    const w: Point[] = [];
    for (let i = 3; i < 10; i++) w.push({ x: 8, y: i }, { x: 15, y: 24 - 1 - i });
    return w;
  })(), 120, 12, 0.5),
  makeRivalLevel(5, 'Hungry Rival', 'It really wants that food!', 26, 26, (() => {
    const w: Point[] = [];
    for (let i = 4; i < 12; i++) w.push({ x: i, y: 8 });
    for (let i = 14; i < 22; i++) w.push({ x: i, y: 17 });
    return w;
  })(), 110, 15, 0.55),
  makeRivalLevel(6, 'Aggressive', 'The rival is getting aggressive!', 26, 26, (() => {
    const w: Point[] = [];
    const cx = 13;
    for (let i = -3; i <= 3; i++) w.push({ x: cx, y: cx + i });
    return w;
  })(), 105, 15, 0.65),
  makeRivalLevel(7, 'Smart Snake', 'It knows shortcuts now.', 28, 28, (() => {
    const w: Point[] = [];
    for (let i = 3; i < 12; i++) w.push({ x: 7, y: i }, { x: 20, y: 28 - 1 - i });
    for (let i = 7; i < 14; i++) w.push({ x: i, y: 14 });
    return w;
  })(), 100, 18, 0.7),
  makeRivalLevel(8, 'Expert Rival', 'Near-perfect pathfinding.', 28, 28, (() => {
    const w: Point[] = [];
    for (let x = 5; x < 23; x++) { if (x !== 10 && x !== 17) w.push({ x, y: 9 }); }
    for (let x = 5; x < 23; x++) { if (x !== 14) w.push({ x, y: 18 }); }
    return w;
  })(), 95, 18, 0.8),
  makeRivalLevel(9, 'Rival Master', 'Almost unbeatable!', 30, 30, (() => {
    const w: Point[] = [];
    for (let i = 3; i < 14; i++) w.push({ x: 10, y: i });
    for (let i = 16; i < 27; i++) w.push({ x: 19, y: i });
    for (let i = 10; i < 20; i++) w.push({ x: i, y: 14 });
    return w;
  })(), 90, 20, 0.9),
  makeRivalLevel(10, 'The Nemesis', 'Perfect AI. Can you beat it?', 30, 30, (() => {
    const w: Point[] = [];
    for (let i = 4; i < 12; i++) w.push({ x: 7, y: i }, { x: 22, y: 30 - 1 - i });
    for (let i = 4; i < 12; i++) w.push({ x: i, y: 7 }, { x: 30 - 1 - i, y: 22 });
    return w;
  })(), 85, 20, 1.0),
];
