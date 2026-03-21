# Neon Snake

A level-based arcade snake game with a neon cyberpunk aesthetic, built with TypeScript and rendered on HTML5 Canvas. Features multiple game tracks, procedural level generation, local multiplayer, AI rivals, and optional Firebase cloud sync.

## Features

### Game Tracks

The game is organized into distinct tracks, each with its own gameplay twist:

- **Classic** -- The original snake experience with 15 hand-crafted levels of increasing difficulty.
- **Infinite** -- Procedurally generated levels that continue indefinitely. New challenge modifiers are introduced every 50 levels, escalating all the way to level 1000+ ("Chaos Mode").
- **Endless** -- A single-life survival mode with no levels. The arena spawns hazards over time; survive as long as possible.
- **Rival** -- Race an AI-controlled snake for food. Outsmart and outeat your opponent before time runs out.
- **Predator** -- A pathfinding AI snake actively hunts the player. Evade the predator while collecting food.
- **A\* Hunt** -- An A\* pathfinding snake finds the optimal path to every food item. Beat the algorithm.
- **Versus** -- Local 2-player mode on a single screen. Player 1 uses WASD, Player 2 uses arrow keys.
- **Hazards** -- Deadly traps (skulls, bombs, lightning) spawn and vanish on the field. Eat fast, dodge faster.

### Procedural Level Generation

Beyond the hand-crafted levels, a seeded procedural generator creates unlimited content. Wall patterns include horizontal bars, scattered blocks, maze corridors, concentric rings, diamond formations, and combination layouts. Every 50 levels (in the Infinite track), a new game mechanic is unlocked -- portals, hazards, rival snakes, speed boosts, shrinking arenas, and more -- culminating in full chaos mode at level 1000.

### Gameplay Mechanics

- **Portals** -- Teleport between linked portal pairs on the grid.
- **Special food** -- Bonus items that appear briefly for extra points.
- **Combo system** -- Chain food pickups for score multipliers.
- **Star ratings** -- Earn 1 to 3 stars per level based on score performance.
- **Lives system** -- 3 lives per level in standard tracks.
- **Hazards** -- Timed dangers with a warning phase before becoming deadly.

### Rendering and Visual Effects

- Neon cyberpunk art style with glowing walls, snake segments, and food items.
- Particle system (300-particle object pool) for food collection, death, portal usage, hazard spawns, and rival events.
- Floating text feedback ("YUM!", "BONK!", "JACKPOT!") on game events.
- Screen shake on death.
- Squash-and-stretch animation on the snake head.
- Smooth CSS animations on all UI screens.

### Authentication and Cloud Sync

- **Guest play** -- Works fully offline with localStorage for progress persistence.
- **Google sign-in** -- Optional Firebase Authentication via Google popup.
- **Apple sign-in** -- Optional Firebase Authentication via Apple OAuth.
- **Cloud storage** -- When signed in, progress syncs to Firebase Firestore. Local and cloud progress are merged on sign-in, keeping the best scores from each.
- **Graceful degradation** -- If no Firebase config is provided (no `.env` file), the game runs entirely in guest/local mode without errors.

### Input Support

- **Keyboard** -- Arrow keys or WASD for movement. ESC or P to pause. Enter or Space to confirm.
- **Touch** -- Swipe gestures for direction, tap to confirm. Mobile-optimized viewport with no zoom.
- **Multiplayer controls** -- In Versus mode, WASD controls Player 1 and arrow keys control Player 2.

### Developer Mode

Activate by appending `?dev=1` to the URL or typing "devmode" on the title screen. Dev mode unlocks all levels across all tracks and reveals hidden tracks (Versus).

## Tech Stack

- **Language:** TypeScript (ES2020 target, strict mode)
- **Build tool:** Vite 5
- **Rendering:** HTML5 Canvas 2D
- **Authentication:** Firebase Auth (Google, Apple)
- **Database:** Firebase Firestore (cloud progress sync)
- **Fonts:** Orbitron (headings), Inter (body)
- **Deployment:** GitHub Pages via GitHub Actions

## Prerequisites

- Node.js 20 or later
- npm

## Installation

```bash
git clone git@github.com:hosseinsadeghi/neon-snake.git
cd neon-snake
npm install
```

## Usage

### Development Server

```bash
npm run dev
```

This starts the Vite dev server with hot module replacement. Open the URL shown in the terminal (typically `http://localhost:5173`).

### Production Build

```bash
npm run build
```

Compiles TypeScript and bundles the project into the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

Serves the built `dist/` folder locally for testing before deployment.

### Firebase Configuration (Optional)

To enable authentication and cloud save, create a `.env` or `.env.local` file in the project root with your Firebase project credentials:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Without these variables, the game runs in guest-only mode with local storage.

## Project Structure

```
neon-snake/
├── index.html                  # Main HTML with all UI screens (title, tracks, levels, pause, game over)
├── package.json                # Project metadata and scripts
├── tsconfig.json               # TypeScript configuration (ES2020, strict)
├── vite.config.ts              # Vite bundler configuration
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow for GitHub Pages deployment
├── src/
│   ├── main.ts                 # Application entry point, screen management, game loop
│   ├── style.css               # Neon-themed UI styles (Orbitron font, glow effects, animations)
│   ├── vite-env.d.ts           # Vite type declarations
│   ├── auth/
│   │   └── auth-service.ts     # Firebase Auth wrapper (Google, Apple sign-in)
│   ├── core/
│   │   ├── game-engine.ts      # Core game logic: state creation, tick updates, collision, AI
│   │   ├── procedural.ts       # Seeded procedural level generator with milestone modifiers
│   │   ├── types.ts            # TypeScript types and enums (GameState, LevelDef, TrackId, etc.)
│   │   └── levels/
│   │       ├── index.ts        # Track definitions and level registry
│   │       ├── level-01.ts     # Hand-crafted classic levels (01 through 15)
│   │       ├── ...
│   │       ├── level-15.ts
│   │       ├── rival-levels.ts       # Rival track levels
│   │       ├── predator-levels.ts    # Predator track levels
│   │       ├── astar-levels.ts       # A* Hunt track levels
│   │       ├── hazard-levels.ts      # Hazards track levels
│   │       └── multiplayer-levels.ts # Versus (local multiplayer) levels
│   ├── data/
│   │   ├── storage-interface.ts  # StorageService interface, default progress, migration logic
│   │   ├── local-storage.ts      # localStorage-based progress persistence
│   │   └── cloud-storage.ts      # Firestore-based cloud progress persistence
│   ├── input/
│   │   └── input-manager.ts      # Keyboard and touch input handling with action queue
│   └── render/
│       ├── renderer.ts           # Canvas 2D renderer (grid, snake, food, walls, HUD, effects)
│       └── particle-system.ts    # Object-pooled particle system for visual effects
├── dist/                         # Production build output (generated)
└── public/                       # Static assets served by Vite
```

## Deployment

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on every push to the `master` branch. Firebase secrets should be configured as GitHub repository secrets for the build to include authentication support.

## Contact

**Hossein Sadeghi**
Email: hosseinsadeghiesfahani@gmail.com
GitHub: [hosseinsadeghi](https://github.com/hosseinsadeghi)
