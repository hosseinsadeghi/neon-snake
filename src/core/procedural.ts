import { Direction, LevelDef, Point, TrackId } from './types';

// Seeded PRNG for reproducible level generation
// Same level number always generates the same layout
class SeededRNG {
  private s: number;
  constructor(seed: number) {
    this.s = seed;
  }
  next(): number {
    this.s = (this.s * 1664525 + 1013904223) & 0xffffffff;
    return (this.s >>> 0) / 0xffffffff;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
}

// ==================== Wall Pattern Generators ====================

function borderWalls(w: number, h: number): Point[] {
  const walls: Point[] = [];
  for (let x = 0; x < w; x++) walls.push({ x, y: 0 }, { x, y: h - 1 });
  for (let y = 1; y < h - 1; y++) walls.push({ x: 0, y }, { x: w - 1, y });
  return walls;
}

function horizontalBars(w: number, h: number, rng: SeededRNG, count: number): Point[] {
  const walls: Point[] = [];
  const spacing = Math.floor((h - 4) / (count + 1));
  for (let i = 0; i < count; i++) {
    const y = 2 + spacing * (i + 1);
    const gapCount = rng.nextInt(1, 3);
    const gaps = new Set<number>();
    for (let g = 0; g < gapCount; g++) gaps.add(rng.nextInt(2, w - 3));
    // Widen gaps to 2 cells
    const wideGaps = new Set<number>();
    for (const g of gaps) { wideGaps.add(g); wideGaps.add(g + 1); }
    for (let x = 2; x < w - 2; x++) {
      if (!wideGaps.has(x)) walls.push({ x, y });
    }
  }
  return walls;
}

function scatteredBlocks(w: number, h: number, rng: SeededRNG, count: number): Point[] {
  const walls: Point[] = [];
  const occupied = new Set<string>();
  // Keep center and edges clear
  for (let i = 0; i < count; i++) {
    const bx = rng.nextInt(3, w - 5);
    const by = rng.nextInt(3, h - 5);
    const size = rng.nextInt(1, 2);
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        const key = `${bx + dx},${by + dy}`;
        if (!occupied.has(key)) {
          occupied.add(key);
          walls.push({ x: bx + dx, y: by + dy });
        }
      }
    }
  }
  return walls;
}

function mazeCorridors(w: number, h: number, rng: SeededRNG): Point[] {
  const walls: Point[] = [];
  const verticals = rng.nextInt(1, 3);
  const horizontals = rng.nextInt(1, 3);
  for (let i = 0; i < verticals; i++) {
    const x = rng.nextInt(4, w - 5);
    const startY = rng.nextInt(2, Math.floor(h / 3));
    const endY = rng.nextInt(Math.floor(h * 2 / 3), h - 3);
    const gap = rng.nextInt(startY + 2, endY - 2);
    for (let y = startY; y <= endY; y++) {
      if (Math.abs(y - gap) > 1) walls.push({ x, y });
    }
  }
  for (let i = 0; i < horizontals; i++) {
    const y = rng.nextInt(4, h - 5);
    const startX = rng.nextInt(2, Math.floor(w / 3));
    const endX = rng.nextInt(Math.floor(w * 2 / 3), w - 3);
    const gap = rng.nextInt(startX + 2, endX - 2);
    for (let x = startX; x <= endX; x++) {
      if (Math.abs(x - gap) > 1) walls.push({ x, y });
    }
  }
  return walls;
}

function concentricRings(w: number, h: number, rng: SeededRNG, rings: number): Point[] {
  const walls: Point[] = [];
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let r = 0; r < rings; r++) {
    const dist = 3 + r * 4;
    if (dist >= Math.min(cx, cy) - 2) break;
    const gapAngle = rng.next() * Math.PI * 2;
    const gapSize = 2 + rng.nextInt(0, 2);
    for (let angle = 0; angle < 360; angle += 5) {
      const rad = (angle * Math.PI) / 180;
      const x = Math.round(cx + Math.cos(rad) * dist);
      const y = Math.round(cy + Math.sin(rad) * dist);
      if (x < 1 || x >= w - 1 || y < 1 || y >= h - 1) continue;
      const angleDiff = Math.abs(rad - gapAngle);
      if (angleDiff < gapSize * 0.15 || (Math.PI * 2 - angleDiff) < gapSize * 0.15) continue;
      walls.push({ x, y });
    }
  }
  // Deduplicate
  const seen = new Set<string>();
  return walls.filter(p => {
    const key = `${p.x},${p.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function diamondWalls(w: number, h: number, rng: SeededRNG): Point[] {
  const walls: Point[] = [];
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const size = rng.nextInt(4, Math.min(cx, cy) - 3);
  const gaps = rng.nextInt(2, 4);
  const gapPositions = new Set<number>();
  for (let i = 0; i < gaps; i++) gapPositions.add(rng.nextInt(0, size * 4));

  let idx = 0;
  for (let i = 0; i <= size; i++) {
    const points = [
      { x: cx - size + i, y: cy - i },
      { x: cx + size - i, y: cy - i },
      { x: cx - size + i, y: cy + i },
      { x: cx + size - i, y: cy + i },
    ];
    for (const p of points) {
      if (!gapPositions.has(idx % (size * 4 + 4)) && p.x > 0 && p.x < w - 1 && p.y > 0 && p.y < h - 1) {
        walls.push(p);
      }
      idx++;
    }
  }
  return walls;
}

// ==================== Milestone Challenges ====================
// Every 50 levels, a new mechanic is introduced

export interface ProceduralModifiers {
  hasPortals: boolean;          // from level 50
  hasHazards: boolean;          // from level 100
  extraGrowth: boolean;         // from level 150 (growAmount 2)
  foodTimer: boolean;           // from level 200 (special food more common but short-lived)
  hasRival: boolean;            // from level 250 (AI rival competes for food)
  denseWalls: boolean;          // from level 300
  fastStart: boolean;           // from level 350 (starts at higher speed)
  portalMaze: boolean;          // from level 400 (many portals)
  aggressiveRival: boolean;     // from level 450 (smarter rival)
  multiFood: boolean;           // from level 500 (more food to collect)
  tinyArena: boolean;           // from level 550
  extremeHazards: boolean;      // from level 600
  maxGrowth: boolean;           // from level 650 (growAmount 3)
  hyperSpeed: boolean;          // from level 700
  wallHell: boolean;            // from level 750
  portalHell: boolean;          // from level 800
  rivalHell: boolean;           // from level 850
  hazardHell: boolean;          // from level 900
  everythingHell: boolean;      // from level 950
  chaos: boolean;               // from level 1000
}

function getModifiers(level: number): ProceduralModifiers {
  return {
    hasPortals: level >= 50,
    hasHazards: level >= 100,
    extraGrowth: level >= 150 && level < 650,
    foodTimer: level >= 200,
    hasRival: level >= 250,
    denseWalls: level >= 300,
    fastStart: level >= 350,
    portalMaze: level >= 400,
    aggressiveRival: level >= 450,
    multiFood: level >= 500,
    tinyArena: level >= 550,
    extremeHazards: level >= 600,
    maxGrowth: level >= 650,
    hyperSpeed: level >= 700,
    wallHell: level >= 750,
    portalHell: level >= 800,
    rivalHell: level >= 850,
    hazardHell: level >= 900,
    everythingHell: level >= 950,
    chaos: level >= 1000,
  };
}

// Track-specific modifiers: each track always has its signature mechanic,
// then adds variation as levels progress.
function getTrackModifiers(trackId: TrackId, level: number): ProceduralModifiers {
  const base: ProceduralModifiers = {
    hasPortals: false, hasHazards: false, extraGrowth: false, foodTimer: false,
    hasRival: false, denseWalls: false, fastStart: false, portalMaze: false,
    aggressiveRival: false, multiFood: false, tinyArena: false, extremeHazards: false,
    maxGrowth: false, hyperSpeed: false, wallHell: false, portalHell: false,
    rivalHell: false, hazardHell: false, everythingHell: false, chaos: false,
  };

  // All tracks get portals after a while and gradually more walls
  base.hasPortals = level >= 20;
  base.denseWalls = level >= 40;
  base.extraGrowth = level >= 60 && level < 120;
  base.maxGrowth = level >= 120;
  base.fastStart = level >= 50;
  base.multiFood = level >= 80;

  switch (trackId) {
    case TrackId.CLASSIC:
      // Classic stays pure snake — walls and portals only, gradual ramp
      base.tinyArena = level >= 100;
      base.hyperSpeed = level >= 150;
      base.wallHell = level >= 200;
      base.portalMaze = level >= 60;
      base.chaos = level >= 300;
      break;

    case TrackId.RIVAL:
      // Rival always present, gets smarter
      base.hasRival = true;
      base.aggressiveRival = level >= 20;
      base.rivalHell = level >= 60;
      base.hasHazards = level >= 40;
      base.hyperSpeed = level >= 100;
      base.chaos = level >= 200;
      break;
  }

  return base;
}

// Milestone names for every 50th level
const MILESTONE_NAMES: Record<number, string> = {
  50: 'Portal Awakening',
  100: 'Hazard Zone',
  150: 'Growth Spurt',
  200: 'Fleeting Feast',
  250: 'Enter the Rival',
  300: 'Wall Surge',
  350: 'Turbo Start',
  400: 'Portal Labyrinth',
  450: 'Smart Rival',
  500: 'Feast Mode',
  550: 'Claustrophobia',
  600: 'Danger Overload',
  650: 'Mega Growth',
  700: 'Hyperdrive',
  750: 'Wall Hell',
  800: 'Portal Hell',
  850: 'Rival Hell',
  900: 'Hazard Hell',
  950: 'Everything Hell',
  1000: 'CHAOS',
};

const LEVEL_ADJECTIVES = [
  'Twisted', 'Narrow', 'Winding', 'Jagged', 'Broken', 'Dark', 'Sharp',
  'Curved', 'Angular', 'Sprawling', 'Cramped', 'Open', 'Divided',
  'Fractured', 'Tangled', 'Shifting', 'Hidden', 'Deep', 'Hollow',
];

const LEVEL_NOUNS = [
  'Path', 'Maze', 'Arena', 'Corridor', 'Chamber', 'Tunnel', 'Pit',
  'Grid', 'Passage', 'Crossing', 'Gauntlet', 'Labyrinth', 'Circuit',
  'Den', 'Void', 'Nexus', 'Zone', 'Field', 'Cage', 'Run',
];

// ==================== Main Generator ====================

export function generateLevel(levelNum: number, trackId: TrackId = TrackId.INFINITE): LevelDef {
  // Seed varies by track so the same level number gives different layouts per track
  const trackSeed: Record<string, number> = {
    [TrackId.INFINITE]: 104729,
    [TrackId.CLASSIC]: 208631,
    [TrackId.RIVAL]: 416459,
  };
  const rng = new SeededRNG(levelNum * 7919 + (trackSeed[trackId] || 104729));

  // For track-specific generation, only use the INFINITE milestones for the INFINITE track.
  // Other tracks get their own track-specific modifiers applied from level 1.
  const isInfiniteTrack = trackId === TrackId.INFINITE;
  const mods = isInfiniteTrack ? getModifiers(levelNum) : getTrackModifiers(trackId, levelNum);
  const isMilestone = isInfiniteTrack && levelNum % 50 === 0 && levelNum <= 1000;

  // Grid size: starts at 22, grows slowly, caps based on modifiers
  let baseSize = 22 + Math.floor(Math.sqrt(levelNum) * 0.8);
  if (mods.tinyArena) baseSize = Math.max(18, baseSize - 8);
  if (mods.chaos) baseSize += rng.nextInt(-4, 4);
  const gridW = Math.min(40, Math.max(18, baseSize + rng.nextInt(-2, 2)));
  const gridH = Math.min(40, Math.max(18, baseSize + rng.nextInt(-2, 2)));

  // Walls
  let walls = borderWalls(gridW, gridH);
  const pattern = rng.nextInt(0, 5);
  switch (pattern) {
    case 0: walls.push(...horizontalBars(gridW, gridH, rng, rng.nextInt(2, mods.denseWalls ? 5 : 3))); break;
    case 1: walls.push(...scatteredBlocks(gridW, gridH, rng, rng.nextInt(4, mods.wallHell ? 20 : 10))); break;
    case 2: walls.push(...mazeCorridors(gridW, gridH, rng)); break;
    case 3: walls.push(...concentricRings(gridW, gridH, rng, rng.nextInt(1, mods.denseWalls ? 4 : 2))); break;
    case 4: walls.push(...diamondWalls(gridW, gridH, rng)); break;
    case 5: {
      // Combo: mix two patterns
      walls.push(...scatteredBlocks(gridW, gridH, rng, rng.nextInt(3, 6)));
      walls.push(...horizontalBars(gridW, gridH, rng, rng.nextInt(1, 2)));
      break;
    }
  }

  if (mods.wallHell) {
    walls.push(...scatteredBlocks(gridW, gridH, rng, rng.nextInt(8, 15)));
  }

  // Speed: gradual decrease, with variation
  let speed = 140 - Math.min(60, Math.floor(levelNum * 0.06));
  if (mods.fastStart) speed -= 10;
  if (mods.hyperSpeed) speed -= 15;
  speed = Math.max(45, speed + rng.nextInt(-5, 5));

  // Food to win: slow ramp with variation
  let foodToWin = 8 + Math.floor(levelNum * 0.02) + rng.nextInt(0, 3);
  if (mods.multiFood) foodToWin += 5;
  foodToWin = Math.min(40, foodToWin);

  // Grow amount
  let growAmount = 1;
  if (mods.extraGrowth) growAmount = 2;
  if (mods.maxGrowth) growAmount = 3;

  // Portals
  const portalPairs: [Point, Point][] = [];
  if (mods.hasPortals) {
    const portalCount = mods.portalMaze ? rng.nextInt(2, 4) : (mods.portalHell ? rng.nextInt(3, 6) : rng.nextInt(1, 2));
    for (let i = 0; i < portalCount; i++) {
      let a: Point, b: Point;
      let tries = 0;
      do {
        a = { x: rng.nextInt(2, gridW - 3), y: rng.nextInt(2, gridH - 3) };
        b = { x: rng.nextInt(2, gridW - 3), y: rng.nextInt(2, gridH - 3) };
        tries++;
      } while (tries < 20 && (
        walls.some(w => (w.x === a.x && w.y === a.y) || (w.x === b.x && w.y === b.y)) ||
        manhattan(a, b) < 6
      ));
      if (tries < 20) portalPairs.push([a, b]);
    }
  }

  // Special food chance
  let specialFoodChance = 0.1 + Math.min(0.2, levelNum * 0.0002);
  if (mods.foodTimer) specialFoodChance += 0.1;

  // Hazards
  let hazardSpawnInterval: number | undefined;
  let hazardMaxActive: number | undefined;
  let hazardLifetime: number | undefined;
  if (mods.hasHazards) {
    hazardSpawnInterval = mods.hazardHell ? rng.nextInt(3, 5) : (mods.extremeHazards ? rng.nextInt(5, 8) : rng.nextInt(12, 20));
    hazardMaxActive = mods.hazardHell ? rng.nextInt(8, 12) : (mods.extremeHazards ? rng.nextInt(5, 8) : rng.nextInt(2, 4));
    hazardLifetime = mods.hazardHell ? rng.nextInt(10, 15) : rng.nextInt(20, 35);
  }

  // Rival
  let rivalAiDifficulty: number | undefined;
  let player2Start: Point | undefined;
  let player2StartDir: Direction | undefined;
  if (mods.hasRival) {
    rivalAiDifficulty = mods.rivalHell ? 1.0 : (mods.aggressiveRival ? rng.next() * 0.3 + 0.7 : rng.next() * 0.3 + 0.3);
    player2Start = { x: gridW - 4, y: Math.floor(gridH / 2) };
    player2StartDir = Direction.LEFT;
  }

  // Find a safe start position
  const wallSet = new Set(walls.map(w => `${w.x},${w.y}`));
  let snakeStart = { x: 3, y: Math.floor(gridH / 2) };
  // Ensure start position isn't in a wall
  for (let attempts = 0; attempts < 50; attempts++) {
    if (!wallSet.has(`${snakeStart.x},${snakeStart.y}`) &&
        !wallSet.has(`${snakeStart.x - 1},${snakeStart.y}`) &&
        !wallSet.has(`${snakeStart.x - 2},${snakeStart.y}`)) break;
    snakeStart = { x: rng.nextInt(3, Math.floor(gridW / 2)), y: rng.nextInt(3, gridH - 4) };
  }

  // Name
  let name: string;
  let description: string;
  if (isMilestone) {
    name = MILESTONE_NAMES[levelNum] || `Milestone ${levelNum}`;
    description = getMilestoneDescription(levelNum);
  } else if (levelNum > 1000) {
    name = `Chaos ${levelNum}`;
    description = `Pure chaos. Level ${levelNum}. Everything is maxed.`;
  } else {
    const adj = rng.pick(LEVEL_ADJECTIVES);
    const noun = rng.pick(LEVEL_NOUNS);
    name = `${adj} ${noun}`;
    description = getDescription(mods, levelNum);
  }

  return {
    id: levelNum,
    name,
    description,
    gridWidth: gridW,
    gridHeight: gridH,
    walls,
    initialSpeed: speed,
    speedIncrement: mods.chaos ? 3 : 2,
    foodToWin,
    specialFoodChance,
    portalPairs,
    snakeStart,
    snakeStartDir: Direction.RIGHT,
    growAmount,
    rivalAiDifficulty,
    hazardSpawnInterval,
    hazardMaxActive,
    hazardLifetime,
    player2Start,
    player2StartDir,
  };
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getMilestoneDescription(level: number): string {
  switch (level) {
    case 50: return 'NEW: Portals appear! Step in, teleport out.';
    case 100: return 'NEW: Deadly hazards spawn on the field!';
    case 150: return 'NEW: Snake grows 2 segments per food!';
    case 200: return 'NEW: Bonus food appears more often but vanishes fast!';
    case 250: return 'NEW: An AI rival snake now competes for your food!';
    case 300: return 'NEW: Wall density increases significantly!';
    case 350: return 'NEW: Base speed is faster from the start!';
    case 400: return 'NEW: Multiple portal pairs create a labyrinth!';
    case 450: return 'NEW: The rival snake gets smarter!';
    case 500: return 'NEW: More food required to clear each level!';
    case 550: return 'NEW: Arenas shrink. Less room to maneuver!';
    case 600: return 'NEW: Hazards spawn faster and in greater numbers!';
    case 650: return 'NEW: Snake grows 3 segments per food!';
    case 700: return 'NEW: Hyperspeed! Everything moves faster!';
    case 750: return 'NEW: Walls everywhere. Find the gaps!';
    case 800: return 'NEW: Portals cover the map. Dizzying!';
    case 850: return 'NEW: Rival is nearly perfect. Outplay the algorithm!';
    case 900: return 'NEW: Hazards fill the arena. Dodge everything!';
    case 950: return 'NEW: ALL challenge modifiers active simultaneously!';
    case 1000: return 'CHAOS MODE. Everything is maxed. Good luck.';
    default: return `Milestone level ${level}`;
  }
}

function getDescription(mods: ProceduralModifiers, level: number): string {
  const parts: string[] = [];
  if (mods.hasPortals) parts.push('portals');
  if (mods.hasHazards) parts.push('hazards');
  if (mods.hasRival) parts.push('rival');
  if (mods.extraGrowth || mods.maxGrowth) parts.push('extra growth');
  if (parts.length === 0) return `Level ${level}. Stay focused!`;
  return `Level ${level}. Features: ${parts.join(', ')}.`;
}

