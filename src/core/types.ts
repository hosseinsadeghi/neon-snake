export enum Direction {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

export enum TrackId {
  CLASSIC = 'classic',
  RIVAL = 'rival',
  MULTIPLAYER = 'multiplayer',
  HAZARDS = 'hazards',
  PREDATOR = 'predator',
  ASTAR = 'astar',
  INFINITE = 'infinite',
  ENDLESS = 'endless',
}

export interface TrackDef {
  id: TrackId;
  name: string;
  description: string;
  icon: string;
  color: string;
  levels: LevelDef[];
}

export enum CellType {
  EMPTY,
  WALL,
  FOOD,
  SPECIAL_FOOD,
  PORTAL,
}

export enum GamePhase {
  TITLE,
  TRACK_SELECT,
  LEVEL_SELECT,
  PLAYING,
  PAUSED,
  DYING,
  LEVEL_COMPLETE,
  GAME_WIN,
}

export interface Point {
  x: number;
  y: number;
}

export interface LevelDef {
  id: number;
  name: string;
  gridWidth: number;
  gridHeight: number;
  walls: Point[];
  initialSpeed: number;
  speedIncrement: number;
  foodToWin: number;
  specialFoodChance: number;
  portalPairs: [Point, Point][];
  snakeStart: Point;
  snakeStartDir: Direction;
  growAmount: number;
  description: string;
  // Mode-specific optional fields
  rivalAiDifficulty?: number;
  hazardSpawnInterval?: number;
  hazardMaxActive?: number;
  hazardLifetime?: number;
  player2Start?: Point;
  player2StartDir?: Direction;
  timeLimit?: number; // seconds, for timed modes
}

export interface SpecialFood {
  pos: Point;
  ttl: number;
  maxTtl: number;
}

export interface Hazard {
  pos: Point;
  ttl: number;
  maxTtl: number;
  type: 'skull' | 'bomb' | 'lightning';
  warningTicks: number; // ticks remaining in warning phase (not yet deadly)
}

export interface SnakeState {
  segments: Point[];
  direction: Direction;
  nextDirection: Direction;
  directionQueue: Direction[];
  alive: boolean;
  foodEaten: number;
  score: number;
}

export interface GameState {
  phase: GamePhase;
  trackId: TrackId;
  level: LevelDef;
  levelIndex: number;

  // Player 1 snake
  snake: Point[];
  direction: Direction;
  nextDirection: Direction;
  directionQueue: Direction[];
  food: Point | null;
  specialFood: SpecialFood | null;
  score: number;
  levelScore: number;
  foodEaten: number;
  lives: number;
  currentSpeed: number;
  tickAccumulator: number;
  deathTimer: number;
  levelCompleteTimer: number;
  combo: number;
  comboTimer: number;

  // Rival track
  rivalSnake: Point[] | null;
  rivalDirection: Direction;
  rivalNextDirection: Direction;
  rivalFoodEaten: number;
  rivalAlive: boolean;

  // Multiplayer track
  p2Snake: Point[] | null;
  p2Direction: Direction;
  p2NextDirection: Direction;
  p2DirectionQueue: Direction[];
  p2Score: number;
  p2FoodEaten: number;
  p2Alive: boolean;

  // Hazards track
  hazards: Hazard[];
  hazardSpawnTimer: number;

  // Time limit (for rival mode)
  timeRemaining: number; // ms, 0 = no limit
}

export interface TrackProgress {
  highestLevelUnlocked: number;
  levelScores: Record<number, number>;
  levelStars: Record<number, number>;
}

export interface PlayerProgress {
  tracks: Record<string, TrackProgress>;
  totalScore: number;
}

export enum Action {
  UP,
  DOWN,
  LEFT,
  RIGHT,
  P2_UP,
  P2_DOWN,
  P2_LEFT,
  P2_RIGHT,
  PAUSE,
  CONFIRM,
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active: boolean;
}
