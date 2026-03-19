import { Direction, LevelDef, Point } from '../types';

function border(w: number, h: number): Point[] {
  const walls: Point[] = [];
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  return walls;
}

// spawnInterval = game ticks between hazard spawns (lower = faster)
// At speed 140ms, 10 ticks = ~1.4 seconds
function makeHazardLevel(
  id: number, name: string, desc: string,
  w: number, h: number, extraWalls: Point[],
  speed: number, foodToWin: number,
  spawnInterval: number, maxActive: number, lifetime: number,
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
    snakeStart: { x: Math.floor(w / 2), y: Math.floor(h / 2) },
    snakeStartDir: Direction.RIGHT,
    growAmount: 1,
    hazardSpawnInterval: spawnInterval,
    hazardMaxActive: maxActive,
    hazardLifetime: lifetime,
  };
}

export const HAZARD_LEVELS: LevelDef[] = [
  //                                                          speed  food  interval max  life
  makeHazardLevel(1, 'Watch Out', 'Hazards appear. Stay alert!', 22, 22, [], 140, 8, 20, 2, 40),
  makeHazardLevel(2, 'More Danger', 'Hazards spawn faster now.', 22, 22, [], 135, 10, 16, 3, 35),
  makeHazardLevel(3, 'Dodge City', 'Lots to dodge!', 24, 24, (() => {
    const w: Point[] = [];
    for (let i = 5; i < 19; i++) w.push({ x: 12, y: i });
    return w;
  })(), 125, 10, 14, 3, 30),
  makeHazardLevel(4, 'Danger Zone', 'Hazards everywhere!', 24, 24, (() => {
    const w: Point[] = [];
    for (let i = 4; i < 10; i++) w.push({ x: 8, y: i }, { x: 15, y: 24 - 1 - i });
    return w;
  })(), 120, 12, 12, 4, 30),
  makeHazardLevel(5, 'Minefield', 'The field is packed with traps.', 26, 26, [], 115, 15, 10, 5, 28),
  makeHazardLevel(6, 'Panic Room', 'Walls AND hazards. Fun times!', 26, 26, (() => {
    const w: Point[] = [];
    for (let x = 5; x < 21; x++) { if (x !== 10 && x !== 16) w.push({ x, y: 8 }); }
    for (let x = 5; x < 21; x++) { if (x !== 8 && x !== 18) w.push({ x, y: 17 }); }
    return w;
  })(), 110, 15, 9, 5, 25),
  makeHazardLevel(7, 'Lightning Round', 'Fast hazards, short lives!', 28, 28, [], 105, 18, 7, 6, 20),
  makeHazardLevel(8, 'Survival', 'Can you survive this?', 28, 28, (() => {
    const w: Point[] = [];
    for (let i = 5; i < 14; i++) w.push({ x: 9, y: i }, { x: 18, y: 28 - 1 - i });
    return w;
  })(), 100, 18, 6, 7, 18),
  makeHazardLevel(9, 'Inferno', 'The screen is on fire!', 30, 30, [], 95, 20, 5, 8, 16),
  makeHazardLevel(10, 'Impossible?', 'Maximum hazards. Maximum speed. Good luck.', 30, 30, (() => {
    const w: Point[] = [];
    for (let i = 4; i < 13; i++) w.push({ x: 10, y: i }, { x: 19, y: 30 - 1 - i });
    for (let i = 10; i < 20; i++) w.push({ x: i, y: 14 });
    return w;
  })(), 85, 20, 4, 10, 14),
];
