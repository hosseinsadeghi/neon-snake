import {
  Action,
  Direction,
  GamePhase,
  GameState,
  Hazard,
  LevelDef,
  Point,
  SpecialFood,
  SwarmSnake,
  TrackId,
} from './types';

// ==================== State creation ====================

export function createInitialState(
  level: LevelDef,
  levelIndex: number,
  lives: number,
  totalScore: number,
  trackId: TrackId,
): GameState {
  const snake = buildSnake(level.snakeStart, level.snakeStartDir, 3);

  const COUNTDOWN_DURATION = 3000; // 3 seconds

  const state: GameState = {
    phase: GamePhase.COUNTDOWN,
    trackId,
    level,
    levelIndex,
    snake,
    direction: level.snakeStartDir,
    nextDirection: level.snakeStartDir,
    directionQueue: [],
    food: null,
    specialFood: null,
    score: totalScore,
    levelScore: 0,
    foodEaten: 0,
    lives,
    currentSpeed: level.initialSpeed,
    tickAccumulator: 0,
    deathTimer: 0,
    levelCompleteTimer: 0,
    combo: 0,
    comboTimer: 0,

    // Rival / A*
    useAstar: false,
    rivalSnake: null,
    rivalDirection: Direction.LEFT,
    rivalNextDirection: Direction.LEFT,
    rivalFoodEaten: 0,
    rivalAlive: false,

    // Hazards
    hazards: [],
    hazardSpawnTimer: 5, // First hazard appears quickly

    // Swarm
    swarmSnakes: [],

    // Time
    timeRemaining: 0,

    // Countdown
    countdownTimer: COUNTDOWN_DURATION,
  };

  // Mode-specific init
  // Init rival snake for tracks that use one, or for procedural levels with rivalAiDifficulty
  if ((trackId === TrackId.RIVAL ||
       (trackId === TrackId.INFINITE && level.rivalAiDifficulty !== undefined)) && level.player2Start) {
    state.rivalSnake = buildSnake(level.player2Start, level.player2StartDir || Direction.LEFT, 3);
    state.rivalDirection = level.player2StartDir || Direction.LEFT;
    state.rivalNextDirection = state.rivalDirection;
    state.rivalAlive = true;
  }

  if (trackId === TrackId.SWARM && level.swarmSpawns) {
    state.swarmSnakes = level.swarmSpawns.map((spawn, i) => ({
      segments: buildSnake(spawn.pos, spawn.dir, 3),
      direction: spawn.dir,
      alive: true,
      respawnTimer: 0,
      colorIndex: i,
    }));
  }

  state.food = spawnFood(state);
  return state;
}

function buildSnake(start: Point, dir: Direction, length: number): Point[] {
  const snake: Point[] = [];
  for (let i = length - 1; i >= 0; i--) {
    const seg = { ...start };
    if (dir === Direction.RIGHT) seg.x -= i;
    else if (dir === Direction.LEFT) seg.x += i;
    else if (dir === Direction.DOWN) seg.y -= i;
    else seg.y += i;
    snake.push(seg);
  }
  return snake;
}

// ==================== Helpers ====================

function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function isOccupied(p: Point, state: GameState): boolean {
  if (state.snake.some(s => pointsEqual(s, p))) return true;
  if (state.level.walls.some(w => pointsEqual(w, p))) return true;
  if (state.food && pointsEqual(state.food, p)) return true;
  if (state.specialFood && pointsEqual(state.specialFood.pos, p)) return true;
  for (const [a, b] of state.level.portalPairs) {
    if (pointsEqual(a, p) || pointsEqual(b, p)) return true;
  }
  if (state.rivalSnake) {
    if (state.rivalSnake.some(s => pointsEqual(s, p))) return true;
  }
  if (state.hazards.some(h => pointsEqual(h.pos, p))) return true;
  if (state.swarmSnakes) {
    for (const sw of state.swarmSnakes) {
      if (sw.alive && sw.segments.some(s => pointsEqual(s, p))) return true;
    }
  }
  return false;
}

function spawnFood(state: GameState): Point {
  const { gridWidth, gridHeight } = state.level;

  let attempts = 0;
  while (attempts < 1000) {
    const p = {
      x: Math.floor(Math.random() * gridWidth),
      y: Math.floor(Math.random() * gridHeight),
    };
    if (!isOccupied(p, state)) return p;
    attempts++;
  }
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const p = { x, y };
      if (!isOccupied(p, state)) return p;
    }
  }
  return { x: 1, y: 1 };
}

function trySpawnSpecialFood(state: GameState): SpecialFood | null {
  if (state.specialFood) return state.specialFood;
  if (Math.random() > state.level.specialFoodChance) return null;
  const { gridWidth, gridHeight } = state.level;
  let attempts = 0;
  while (attempts < 100) {
    const p = {
      x: Math.floor(Math.random() * gridWidth),
      y: Math.floor(Math.random() * gridHeight),
    };
    if (!isOccupied(p, state)) {
      return { pos: p, ttl: 80, maxTtl: 80 };
    }
    attempts++;
  }
  return null;
}

function oppositeDirection(d: Direction): Direction {
  switch (d) {
    case Direction.UP: return Direction.DOWN;
    case Direction.DOWN: return Direction.UP;
    case Direction.LEFT: return Direction.RIGHT;
    case Direction.RIGHT: return Direction.LEFT;
  }
}

function applyDir(p: Point, d: Direction): Point {
  switch (d) {
    case Direction.UP: return { x: p.x, y: p.y - 1 };
    case Direction.DOWN: return { x: p.x, y: p.y + 1 };
    case Direction.LEFT: return { x: p.x - 1, y: p.y };
    case Direction.RIGHT: return { x: p.x + 1, y: p.y };
  }
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// ==================== Actions ====================

export function applyAction(state: GameState, action: Action): GameState {
  if (action === Action.PAUSE && state.phase === GamePhase.PLAYING) {
    return { ...state, phase: GamePhase.PAUSED };
  }
  if (action === Action.PAUSE && state.phase === GamePhase.PAUSED) {
    return { ...state, phase: GamePhase.PLAYING };
  }

  if (state.phase !== GamePhase.PLAYING) return state;

  // Player 1 direction
  let newDir: Direction | null = null;
  switch (action) {
    case Action.UP: newDir = Direction.UP; break;
    case Action.DOWN: newDir = Direction.DOWN; break;
    case Action.LEFT: newDir = Direction.LEFT; break;
    case Action.RIGHT: newDir = Direction.RIGHT; break;
  }

  if (newDir !== null) {
    const queue = state.directionQueue;
    const lastQueued = queue.length > 0 ? queue[queue.length - 1] : state.nextDirection;
    if (newDir !== oppositeDirection(lastQueued) && newDir !== lastQueued) {
      const newQueue = [...queue, newDir];
      if (newQueue.length > 3) newQueue.shift();
      return { ...state, directionQueue: newQueue };
    }
  }
  return state;
}

// ==================== Events ====================

export interface TickResult {
  state: GameState;
  events: GameEvent[];
}

export type GameEvent =
  | { type: 'food_eaten'; pos: Point; player?: string }
  | { type: 'special_food_eaten'; pos: Point }
  | { type: 'death'; pos: Point; player?: string }
  | { type: 'level_complete' }
  | { type: 'portal_used'; from: Point; to: Point }
  | { type: 'game_win' }
  | { type: 'rival_ate_food'; pos: Point }
  | { type: 'hazard_hit'; pos: Point }
  | { type: 'hazard_spawn'; pos: Point };

// ==================== Main Tick ====================

export function tick(state: GameState, dt: number): TickResult {
  const events: GameEvent[] = [];

  if (state.phase === GamePhase.COUNTDOWN) {
    const countdownTimer = state.countdownTimer - dt;
    if (countdownTimer <= 0) {
      return {
        state: { ...state, phase: GamePhase.PLAYING, countdownTimer: 0, tickAccumulator: 0 },
        events,
      };
    }
    return { state: { ...state, countdownTimer }, events };
  }

  if (state.phase === GamePhase.DYING) {
    const deathTimer = state.deathTimer - dt;
    if (deathTimer <= 0) {
      const lives = state.lives - 1;
      if (lives <= 0) {
        return {
          state: { ...state, phase: GamePhase.TITLE, deathTimer: 0, lives: 0 },
          events,
        };
      }
      const newState = createInitialState(state.level, state.levelIndex, lives, state.score - state.levelScore, state.trackId);
      // Preserve food eaten across lives so progress isn't lost
      newState.foodEaten = state.foodEaten;
      newState.levelScore = state.levelScore;
      newState.score = state.score;
      return { state: newState, events };
    }
    return { state: { ...state, deathTimer }, events };
  }

  if (state.phase === GamePhase.LEVEL_COMPLETE) {
    const levelCompleteTimer = state.levelCompleteTimer - dt;
    if (levelCompleteTimer <= 0) {
      return {
        state: { ...state, levelCompleteTimer: 0, phase: GamePhase.LEVEL_SELECT },
        events,
      };
    }
    return { state: { ...state, levelCompleteTimer }, events };
  }

  if (state.phase !== GamePhase.PLAYING) {
    return { state, events };
  }

  let acc = state.tickAccumulator + dt;
  let s = { ...state };

  while (acc >= s.currentSpeed) {
    acc -= s.currentSpeed;
    const result = gameTick(s);
    s = result.state;
    events.push(...result.events);
    if (s.phase !== GamePhase.PLAYING) break;
  }

  s.tickAccumulator = acc;

  // Decay combo
  if (s.comboTimer > 0) {
    s = { ...s, comboTimer: s.comboTimer - dt };
    if (s.comboTimer <= 0) {
      s = { ...s, combo: 0, comboTimer: 0 };
    }
  }

  return { state: s, events };
}

// ==================== Single Game Tick ====================

function gameTick(state: GameState): TickResult {
  const allEvents: GameEvent[] = [];

  // --- Move P1 ---
  let dir = state.nextDirection;
  let queue = state.directionQueue;
  if (queue.length > 0) {
    dir = queue[0];
    queue = queue.slice(1);
    state = { ...state, nextDirection: dir, directionQueue: queue };
  }

  const head = state.snake[state.snake.length - 1];
  let newHead = moveHead(head, dir, state.level);

  // Portal check for P1
  const portalResult = checkPortal(newHead, dir, state.level);
  if (portalResult) {
    allEvents.push({ type: 'portal_used', from: portalResult.from, to: portalResult.to });
    newHead = portalResult.newPos;
  }

  // P1 collision checks
  const p1HitsWall = isWallOrOOB(newHead, state.level);
  const p1HitsSelf = state.snake.slice(1).some(s => pointsEqual(s, newHead));
  const p1HitsRival = state.rivalSnake ? state.rivalSnake.some(s => pointsEqual(s, newHead)) : false;
  const p1HitsHazard = state.hazards.length > 0 && state.hazards.some(h => h.warningTicks <= 0 && pointsEqual(h.pos, newHead));
  const p1HitsSwarm = state.swarmSnakes.length > 0 && state.swarmSnakes.some(sw => sw.alive && sw.segments.some(s => pointsEqual(s, newHead)));

  if (p1HitsWall || p1HitsSelf || p1HitsRival || p1HitsHazard || p1HitsSwarm) {
    allEvents.push({ type: 'death', pos: head, player: 'p1' });
    return {
      state: { ...state, phase: GamePhase.DYING, deathTimer: 1500, direction: dir },
      events: allEvents,
    };
  }

  // Move P1 forward
  let newSnake = [...state.snake, newHead];
  let ate = false;
  let ateSpecial = false;
  let scoreGain = 0;

  if (state.food && pointsEqual(newHead, state.food)) {
    ate = true;
    allEvents.push({ type: 'food_eaten', pos: newHead, player: 'p1' });
    const combo = state.combo + 1;
    scoreGain = 10 * Math.min(combo, 5);
    for (let i = 1; i < state.level.growAmount; i++) {
      newSnake = [newSnake[0], ...newSnake];
    }
  } else if (state.specialFood && pointsEqual(newHead, state.specialFood.pos)) {
    ateSpecial = true;
    ate = true;
    allEvents.push({ type: 'special_food_eaten', pos: newHead });
    scoreGain = 50;
  } else {
    newSnake.shift();
  }

  let foodEaten = state.foodEaten + (ate && !ateSpecial ? 1 : 0);
  let newScore = state.score + scoreGain;
  let newLevelScore = state.levelScore + scoreGain;
  let newSpeed = Math.max(50, state.currentSpeed - (ate ? state.level.speedIncrement : 0));

  // Update state with P1 movement
  state = {
    ...state,
    snake: newSnake,
    direction: dir,
    nextDirection: dir,
    directionQueue: queue,
    score: newScore,
    levelScore: newLevelScore,
    foodEaten,
    currentSpeed: newSpeed,
    combo: ate ? state.combo + 1 : state.combo,
    comboTimer: ate ? 3000 : state.comboTimer,
  };

  // --- Move Rival (for RIVAL track, or INFINITE with rival) ---
  const hasRival = state.rivalSnake && state.rivalAlive;
  if (hasRival) {
    if (state.trackId === TrackId.RIVAL || state.trackId === TrackId.INFINITE) {
      if (state.useAstar) {
        const astarResult = moveAStarSnake(state);
        state = astarResult.state;
        allEvents.push(...astarResult.events);
      } else {
        const rivalResult = moveRival(state);
        state = rivalResult.state;
        allEvents.push(...rivalResult.events);
      }
    }
  }

  // --- Move Swarm ---
  if (state.trackId === TrackId.SWARM && state.swarmSnakes.length > 0) {
    const swarmResult = moveSwarm(state);
    state = swarmResult.state;
    allEvents.push(...swarmResult.events);
  }

  // --- Update Hazards (for HAZARDS track, or any level with hazardSpawnInterval) ---
  if (state.trackId === TrackId.INFINITE && state.level.hazardSpawnInterval !== undefined) {
    const hazResult = updateHazards(state);
    state = hazResult.state;
    allEvents.push(...hazResult.events);
  }

  // --- Respawn food ---
  let food = state.food;
  if (!food || (ate && pointsEqual(newHead, state.food!))) {
    food = spawnFood({ ...state, food: null });
  }

  let specialFood = state.specialFood;
  if (ateSpecial) {
    specialFood = null;
  } else if (specialFood) {
    specialFood = { ...specialFood, ttl: specialFood.ttl - 1 };
    if (specialFood.ttl <= 0) specialFood = null;
  }
  if (!specialFood && ate) {
    specialFood = trySpawnSpecialFood({ ...state, food, specialFood: null });
  }

  state = { ...state, food, specialFood };

  // --- Check level complete ---
  if (foodEaten >= state.level.foodToWin) {
    allEvents.push({ type: 'level_complete' });
    return {
      state: { ...state, phase: GamePhase.LEVEL_COMPLETE, levelCompleteTimer: 2500 },
      events: allEvents,
    };
  }

  // Rival win condition: if rival eats enough before player
  if ((state.trackId === TrackId.RIVAL || state.trackId === TrackId.INFINITE) && state.rivalSnake && state.rivalFoodEaten >= state.level.foodToWin) {
    allEvents.push({ type: 'death', pos: head, player: 'p1' });
    return {
      state: { ...state, phase: GamePhase.DYING, deathTimer: 1500 },
      events: allEvents,
    };
  }

  return { state, events: allEvents };
}

// ==================== Head movement helpers ====================

function moveHead(head: Point, dir: Direction, level: LevelDef): Point {
  let newHead = applyDir(head, dir);
  // Wrap around if no walls
  if (level.walls.length === 0) {
    if (newHead.x < 0) newHead.x = level.gridWidth - 1;
    if (newHead.x >= level.gridWidth) newHead.x = 0;
    if (newHead.y < 0) newHead.y = level.gridHeight - 1;
    if (newHead.y >= level.gridHeight) newHead.y = 0;
  }
  return newHead;
}

function isWallOrOOB(p: Point, level: LevelDef): boolean {
  if (p.x < 0 || p.x >= level.gridWidth || p.y < 0 || p.y >= level.gridHeight) return true;
  return level.walls.some(w => pointsEqual(w, p));
}

function checkPortal(head: Point, dir: Direction, level: LevelDef): { newPos: Point; from: Point; to: Point } | null {
  for (const [a, b] of level.portalPairs) {
    if (pointsEqual(head, a)) {
      const newPos = applyDir(b, dir);
      return { newPos, from: a, to: b };
    }
    if (pointsEqual(head, b)) {
      const newPos = applyDir(a, dir);
      return { newPos, from: b, to: a };
    }
  }
  return null;
}

// ==================== Rival AI ====================

function moveRival(state: GameState): TickResult {
  const events: GameEvent[] = [];
  if (!state.rivalSnake || !state.rivalAlive) return { state, events };

  const rivalDir = computeRivalDirection(state);
  const rHead = state.rivalSnake[state.rivalSnake.length - 1];
  let newRHead = moveHead(rHead, rivalDir, state.level);

  // Portal
  const portal = checkPortal(newRHead, rivalDir, state.level);
  if (portal) newRHead = portal.newPos;

  // Collision: wall, self, player snake
  const hitsWall = isWallOrOOB(newRHead, state.level);
  const hitsSelf = state.rivalSnake.slice(1).some(s => pointsEqual(s, newRHead));
  const hitsPlayer = state.snake.some(s => pointsEqual(s, newRHead));

  if (hitsWall || hitsSelf || hitsPlayer) {
    // Rival dies - player gets bonus
    state = { ...state, rivalAlive: false, score: state.score + 25, levelScore: state.levelScore + 25 };
    events.push({ type: 'death', pos: rHead, player: 'rival' });
    return { state, events };
  }

  let newRSnake = [...state.rivalSnake, newRHead];

  // Check if rival eats food
  let rivalAte = false;
  if (state.food && pointsEqual(newRHead, state.food)) {
    rivalAte = true;
    events.push({ type: 'rival_ate_food', pos: newRHead });
    for (let i = 1; i < state.level.growAmount; i++) {
      newRSnake = [newRSnake[0], ...newRSnake];
    }
  } else {
    newRSnake.shift();
  }

  let food = state.food;
  if (rivalAte) {
    food = spawnFood({ ...state, rivalSnake: newRSnake, food: null });
  }

  state = {
    ...state,
    rivalSnake: newRSnake,
    rivalDirection: rivalDir,
    rivalNextDirection: rivalDir,
    rivalFoodEaten: state.rivalFoodEaten + (rivalAte ? 1 : 0),
    food,
  };

  return { state, events };
}

function computeRivalDirection(state: GameState): Direction {
  const difficulty = state.level.rivalAiDifficulty ?? 0.5;
  const snake = state.rivalSnake!;
  const head = snake[snake.length - 1];
  const food = state.food;
  if (!food) return state.rivalDirection;

  const validDirs = getValidDirections(head, state.rivalDirection, state, snake);

  if (validDirs.length === 0) return state.rivalDirection;

  // Random move chance based on difficulty
  if (Math.random() > difficulty) {
    return validDirs[Math.floor(Math.random() * validDirs.length)];
  }

  // High difficulty: BFS
  if (difficulty >= 0.8) {
    const bfsDir = bfsToFood(head, food, state, snake);
    if (bfsDir !== null && validDirs.includes(bfsDir)) return bfsDir;
  }

  // Greedy: minimize distance to food
  validDirs.sort((a, b) => {
    const pa = applyDir(head, a);
    const pb = applyDir(head, b);
    return manhattan(pa, food) - manhattan(pb, food);
  });
  return validDirs[0];
}

function getValidDirections(head: Point, currentDir: Direction, state: GameState, selfSnake: Point[]): Direction[] {
  const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
  return dirs.filter(d => {
    if (d === oppositeDirection(currentDir)) return false;
    const next = applyDir(head, d);
    if (isWallOrOOB(next, state.level)) return false;
    if (state.snake.some(s => pointsEqual(s, next))) return false;
    if (selfSnake.some(s => pointsEqual(s, next))) return false;
    if (state.hazards.some(h => h.warningTicks <= 0 && pointsEqual(h.pos, next))) return false;
    for (const sw of state.swarmSnakes) {
      if (sw.alive && sw.segments !== selfSnake && sw.segments.some(s => pointsEqual(s, next))) return false;
    }
    return true;
  });
}

function bfsToFood(start: Point, target: Point, state: GameState, selfSnake: Point[]): Direction | null {
  const { gridWidth, gridHeight } = state.level;
  const visited = new Set<string>();
  const queue: { pos: Point; firstDir: Direction }[] = [];

  const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

  for (const d of dirs) {
    const next = applyDir(start, d);
    if (isWallOrOOB(next, state.level)) continue;
    if (state.snake.some(s => pointsEqual(s, next))) continue;
    if (selfSnake.some(s => pointsEqual(s, next))) continue;
    const key = `${next.x},${next.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (pointsEqual(next, target)) return d;
    queue.push({ pos: next, firstDir: d });
  }

  let steps = 0;
  while (queue.length > 0 && steps < 300) {
    const { pos, firstDir } = queue.shift()!;
    steps++;

    for (const d of dirs) {
      const next = applyDir(pos, d);
      if (next.x < 0 || next.x >= gridWidth || next.y < 0 || next.y >= gridHeight) continue;
      const key = `${next.x},${next.y}`;
      if (visited.has(key)) continue;
      if (isWallOrOOB(next, state.level)) continue;
      if (state.snake.some(s => pointsEqual(s, next))) continue;
      if (selfSnake.some(s => pointsEqual(s, next))) continue;
      visited.add(key);
      if (pointsEqual(next, target)) return firstDir;
      queue.push({ pos: next, firstDir });
    }
  }
  return null;
}

// ==================== Hazards ====================

function updateHazards(state: GameState): TickResult {
  const events: GameEvent[] = [];
  let hazards = state.hazards.map(h => ({
    ...h,
    ttl: h.ttl - 1,
    warningTicks: Math.max(0, h.warningTicks - 1),
  }));

  // Remove expired
  hazards = hazards.filter(h => h.ttl > 0);

  // Spawn timer
  let timer = state.hazardSpawnTimer - 1;
  const maxActive = state.level.hazardMaxActive ?? 5;
  const lifetime = state.level.hazardLifetime ?? 150;
  const interval = state.level.hazardSpawnInterval ?? 200;

  if (timer <= 0 && hazards.length < maxActive) {
    const { gridWidth, gridHeight } = state.level;
    let attempts = 0;
    while (attempts < 50) {
      const p = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight),
      };
      const tooClose = manhattan(p, state.snake[state.snake.length - 1]) < 3;
      if (!isOccupied(p, { ...state, hazards: [] }) && !tooClose) {
        const types: Array<'skull' | 'bomb' | 'lightning'> = ['skull', 'bomb', 'lightning'];
        hazards.push({
          pos: p,
          ttl: lifetime,
          maxTtl: lifetime,
          type: types[Math.floor(Math.random() * types.length)],
          warningTicks: 20,
        });
        events.push({ type: 'hazard_spawn', pos: p });
        break;
      }
      attempts++;
    }
    timer = interval;
  }

  // Check if P1 head is on an active hazard
  const p1Head = state.snake[state.snake.length - 1];
  for (const h of hazards) {
    if (h.warningTicks <= 0 && pointsEqual(h.pos, p1Head)) {
      events.push({ type: 'hazard_hit', pos: h.pos });
      events.push({ type: 'death', pos: p1Head, player: 'p1' });
      return {
        state: { ...state, hazards, hazardSpawnTimer: timer, phase: GamePhase.DYING, deathTimer: 1500 },
        events,
      };
    }
  }

  return { state: { ...state, hazards, hazardSpawnTimer: timer }, events };
}

// ==================== A* Snake ====================
// Uses A* search to find the optimal path to food, avoiding all obstacles
// including walls, its own body, and the player's body. After eating, it
// does a safety check (flood fill to own tail) to avoid trapping itself.

function moveAStarSnake(state: GameState): TickResult {
  const events: GameEvent[] = [];
  if (!state.rivalSnake || !state.rivalAlive) return { state, events };

  const food = state.food;
  if (!food) return { state, events };

  const snake = state.rivalSnake;
  const head = snake[snake.length - 1];

  // A* to food
  let dir = aStarSearch(head, food, state, snake);

  // If no path to food, chase our own tail (survival mode)
  if (dir === null) {
    const tail = snake[0];
    dir = aStarSearch(head, tail, state, snake);
  }

  // Last resort: any valid direction
  if (dir === null) {
    const valid = getValidDirections(head, state.rivalDirection, state, snake);
    dir = valid.length > 0 ? valid[0] : state.rivalDirection;
  }

  // Safety check: will this move let us still reach our tail?
  const tentativeHead = applyDir(head, dir);
  const tentativeSnake = [...snake.slice(1), tentativeHead];
  if (!floodFillReachable(tentativeHead, tentativeSnake[0], state, tentativeSnake)) {
    // Unsafe — find a direction that keeps tail reachable
    const safeDirs = getValidDirections(head, state.rivalDirection, state, snake);
    for (const sd of safeDirs) {
      const sHead = applyDir(head, sd);
      const sSnake = [...snake.slice(1), sHead];
      if (floodFillReachable(sHead, sSnake[0], state, sSnake)) {
        dir = sd;
        break;
      }
    }
  }

  let newHead = moveHead(head, dir, state.level);

  const portal = checkPortal(newHead, dir, state.level);
  if (portal) newHead = portal.newPos;

  // Collision check
  const hitsWall = isWallOrOOB(newHead, state.level);
  const hitsSelf = snake.slice(1).some(s => pointsEqual(s, newHead));
  const hitsPlayer = state.snake.some(s => pointsEqual(s, newHead));

  if (hitsWall || hitsSelf || hitsPlayer) {
    events.push({ type: 'death', pos: head, player: 'rival' });
    const respawn = state.level.player2Start;
    if (respawn) {
      const newSn = buildSnake(respawn, state.level.player2StartDir || Direction.LEFT, 3);
      state = {
        ...state, rivalSnake: newSn,
        rivalDirection: state.level.player2StartDir || Direction.LEFT,
        rivalNextDirection: state.level.player2StartDir || Direction.LEFT,
      };
    } else {
      state = { ...state, rivalAlive: false };
    }
    return { state, events };
  }

  let newSnake = [...snake, newHead];
  let ate = false;

  if (pointsEqual(newHead, food)) {
    ate = true;
    events.push({ type: 'rival_ate_food', pos: newHead });
    for (let i = 1; i < state.level.growAmount; i++) {
      newSnake = [newSnake[0], ...newSnake];
    }
  } else {
    newSnake.shift();
  }

  let foodState = state.food;
  if (ate) {
    foodState = spawnFood({ ...state, rivalSnake: newSnake, food: null });
  }

  state = {
    ...state,
    rivalSnake: newSnake,
    rivalDirection: dir,
    rivalNextDirection: dir,
    rivalFoodEaten: state.rivalFoodEaten + (ate ? 1 : 0),
    food: foodState,
  };

  return { state, events };
}

// A* search with Manhattan distance heuristic
function aStarSearch(start: Point, goal: Point, state: GameState, selfSnake: Point[]): Direction | null {
  const { gridWidth, gridHeight } = state.level;

  interface ANode {
    pos: Point;
    g: number;
    f: number;
    firstDir: Direction;
  }

  // Build obstacle set for O(1) lookup
  const obstacles = new Set<string>();
  for (const w of state.level.walls) obstacles.add(`${w.x},${w.y}`);
  for (const s of selfSnake) obstacles.add(`${s.x},${s.y}`);
  for (const s of state.snake) obstacles.add(`${s.x},${s.y}`);
  for (const h of state.hazards) {
    if (h.warningTicks <= 0) obstacles.add(`${h.pos.x},${h.pos.y}`);
  }
  obstacles.delete(`${goal.x},${goal.y}`);
  obstacles.delete(`${start.x},${start.y}`);

  const gScores = new Map<string, number>();
  gScores.set(`${start.x},${start.y}`, 0);

  // Priority queue via sorted array
  const open: ANode[] = [];
  function insertNode(node: ANode) {
    let lo = 0, hi = open.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (open[mid].f < node.f) lo = mid + 1;
      else hi = mid;
    }
    open.splice(lo, 0, node);
  }

  const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

  for (const d of dirs) {
    const next = applyDir(start, d);
    if (next.x < 0 || next.x >= gridWidth || next.y < 0 || next.y >= gridHeight) continue;
    const key = `${next.x},${next.y}`;
    if (obstacles.has(key)) continue;
    if (pointsEqual(next, goal)) return d;
    const g = 1;
    gScores.set(key, g);
    insertNode({ pos: next, g, f: g + manhattan(next, goal), firstDir: d });
  }

  const maxNodes = gridWidth * gridHeight;
  let expanded = 0;

  while (open.length > 0 && expanded < maxNodes) {
    const current = open.shift()!;
    expanded++;
    const curKey = `${current.pos.x},${current.pos.y}`;

    // Skip if we already found a better path
    if (current.g > (gScores.get(curKey) ?? Infinity)) continue;

    for (const d of dirs) {
      const next = applyDir(current.pos, d);
      if (next.x < 0 || next.x >= gridWidth || next.y < 0 || next.y >= gridHeight) continue;
      const key = `${next.x},${next.y}`;
      if (obstacles.has(key)) continue;
      if (pointsEqual(next, goal)) return current.firstDir;

      const tentG = current.g + 1;
      const prevG = gScores.get(key);
      if (prevG !== undefined && tentG >= prevG) continue;

      gScores.set(key, tentG);
      insertNode({ pos: next, g: tentG, f: tentG + manhattan(next, goal), firstDir: current.firstDir });
    }
  }

  return null;
}

// ==================== Swarm Snakes ====================
// Multiple AI snakes that try to block the player rather than eat food.
// They intercept the player's path, move erratically, and collide with each other.

function moveSwarm(state: GameState): TickResult {
  const events: GameEvent[] = [];
  const RESPAWN_TIME = 3000; // ms

  const newSwarm: SwarmSnake[] = state.swarmSnakes.map((sw, idx) => {
    if (!sw.alive) {
      // Handle respawn timer
      const remaining = sw.respawnTimer - state.currentSpeed;
      if (remaining <= 0 && state.level.swarmSpawns) {
        const spawn = state.level.swarmSpawns[idx];
        const newSegs = buildSnake(spawn.pos, spawn.dir, 3);
        // Check spawn area is clear
        const blocked = newSegs.some(seg =>
          state.snake.some(s => pointsEqual(s, seg))
        );
        if (!blocked) {
          return { ...sw, segments: newSegs, direction: spawn.dir, alive: true, respawnTimer: 0 };
        }
        return { ...sw, respawnTimer: 500 }; // retry soon
      }
      return { ...sw, respawnTimer: remaining };
    }

    const head = sw.segments[sw.segments.length - 1];
    const dir = computeSwarmDirection(state, sw, idx);
    let newHead = applyDir(head, dir);

    // Wall / self / player / other swarm collision
    const hitsWall = isWallOrOOB(newHead, state.level);
    const hitsSelf = sw.segments.slice(1).some(s => pointsEqual(s, newHead));
    const hitsPlayer = state.snake.some(s => pointsEqual(s, newHead));
    const hitsOther = state.swarmSnakes.some((other, oi) =>
      oi !== idx && other.alive && other.segments.some(s => pointsEqual(s, newHead))
    );

    if (hitsWall || hitsSelf || hitsOther) {
      events.push({ type: 'death', pos: head, player: 'rival' });
      return { ...sw, alive: false, respawnTimer: RESPAWN_TIME };
    }

    if (hitsPlayer) {
      // Swarm snake dies on contact with player but also kills player
      // (player death is handled by P1 collision check)
      events.push({ type: 'death', pos: head, player: 'rival' });
      return { ...sw, alive: false, respawnTimer: RESPAWN_TIME };
    }

    let newSegs = [...sw.segments, newHead];
    // Swarm snakes don't eat food - they just block. Grow slowly over time.
    const totalMoves = newSegs.length;
    if (totalMoves > 6 || Math.random() > 0.02) {
      newSegs.shift(); // don't grow
    }

    return { ...sw, segments: newSegs, direction: dir };
  });

  return { state: { ...state, swarmSnakes: newSwarm }, events };
}

function computeSwarmDirection(state: GameState, sw: SwarmSnake, _idx: number): Direction {
  const head = sw.segments[sw.segments.length - 1];
  const playerHead = state.snake[state.snake.length - 1];
  const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

  // Valid directions (avoid walls, self, other swarm snakes)
  const validDirs = dirs.filter(d => {
    if (d === oppositeDirection(sw.direction)) return false;
    const next = applyDir(head, d);
    if (isWallOrOOB(next, state.level)) return false;
    if (sw.segments.some(s => pointsEqual(s, next))) return false;
    // Avoid other swarm snakes
    for (const other of state.swarmSnakes) {
      if (other !== sw && other.alive && other.segments.some(s => pointsEqual(s, next))) return false;
    }
    return true;
  });

  if (validDirs.length === 0) return sw.direction;

  // 30% chance of random erratic movement
  if (Math.random() < 0.3) {
    return validDirs[Math.floor(Math.random() * validDirs.length)];
  }

  // Try to intercept: aim for where the player will be
  const predictedPos = predictPos(playerHead, state.nextDirection, state.level, 4);

  // 50% aim at predicted position, 50% aim directly at player
  const target = Math.random() < 0.5 ? predictedPos : playerHead;

  // Greedy: pick direction that minimizes distance to target
  validDirs.sort((a, b) => {
    const pa = applyDir(head, a);
    const pb = applyDir(head, b);
    return manhattan(pa, target) - manhattan(pb, target);
  });

  return validDirs[0];
}

function predictPos(pos: Point, dir: Direction, level: LevelDef, steps: number): Point {
  let p = { ...pos };
  for (let i = 0; i < steps; i++) {
    const next = applyDir(p, dir);
    if (isWallOrOOB(next, level)) break;
    p = next;
  }
  return p;
}

// Flood fill reachability check
function floodFillReachable(from: Point, target: Point, state: GameState, selfSnake: Point[]): boolean {
  const { gridWidth, gridHeight } = state.level;
  const obstacles = new Set<string>();
  for (const w of state.level.walls) obstacles.add(`${w.x},${w.y}`);
  for (const s of selfSnake) obstacles.add(`${s.x},${s.y}`);
  for (const s of state.snake) obstacles.add(`${s.x},${s.y}`);
  obstacles.delete(`${from.x},${from.y}`);
  obstacles.delete(`${target.x},${target.y}`);

  const visited = new Set<string>();
  const queue: Point[] = [from];
  visited.add(`${from.x},${from.y}`);

  const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
  let steps = 0;

  while (queue.length > 0 && steps < 300) {
    const p = queue.shift()!;
    steps++;
    for (const d of dirs) {
      const next = applyDir(p, d);
      if (next.x < 0 || next.x >= gridWidth || next.y < 0 || next.y >= gridHeight) continue;
      const key = `${next.x},${next.y}`;
      if (obstacles.has(key) || visited.has(key)) continue;
      visited.add(key);
      if (pointsEqual(next, target)) return true;
      queue.push(next);
    }
  }
  return false;
}
