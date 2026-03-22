# Neon Snake

A neon cyberpunk arcade snake game with multiple game modes, procedural level generation, AI opponents, and local multiplayer. Built with TypeScript and HTML5 Canvas.

**[Play Now](https://hosseinsadeghi.github.io/neon-snake/)**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Game Modes

| Mode | Description |
|------|-------------|
| **Classic** | 15 hand-crafted levels of increasing difficulty |
| **Infinite** | Procedurally generated levels that never end. New mechanics unlock every 50 levels up to Chaos Mode at level 1000 |
| **Endless** | One life, no levels. Survive as long as you can while hazards pile up |
| **Rival** | Race an AI snake for food before time runs out |
| **Predator** | A pathfinding AI hunts you down while you collect food |
| **A\* Hunt** | Compete against an A\* pathfinding algorithm for every food item |
| **Versus** | Local 2-player on one screen (P1: WASD, P2: Arrow keys) |
| **Hazards** | Dodge deadly traps (skulls, bombs, lightning) that spawn and vanish |

## Gameplay Features

- **Portals** - teleport between linked pairs on the grid
- **Combo system** - chain food pickups for score multipliers (up to 5x)
- **Star ratings** - earn 1-3 stars per level based on score
- **Special food** - bonus items that appear briefly for extra points
- **Procedural generation** - seeded wall patterns, milestone modifiers, infinite content
- **Particle effects** - 300-particle object pool with death, portal, and hazard visuals

## Controls

| Action | Keys |
|--------|------|
| Move | Arrow keys or WASD |
| Pause | ESC or P |
| Confirm | Enter or Space |
| Player 2 (Versus) | Arrow keys (P1 uses WASD) |
| Touch | Swipe to move, tap to confirm |

## Getting Started

```bash
git clone git@github.com:hosseinsadeghi/neon-snake.git
cd neon-snake
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build    # Output in dist/
npm run preview  # Preview the build locally
```

### Cloud Sync (Optional)

Create a `.env` file with your Firebase credentials to enable Google/Apple sign-in and cloud progress sync:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Without these, the game runs fully offline with localStorage.

### Developer Mode

Append `?dev=1` to the URL or type "devmode" on the title screen to unlock all levels.

## Tech Stack

- **TypeScript** (strict mode) + **Vite 5**
- **HTML5 Canvas 2D** rendering
- **Firebase** Auth & Firestore (optional cloud sync)
- **GitHub Actions** CI/CD to GitHub Pages

## Project Structure

```
src/
├── main.ts                  # Entry point, screen management, game loop
├── style.css                # Neon UI styles
├── core/
│   ├── game-engine.ts       # Game logic, collision, AI, tick system
│   ├── procedural.ts        # Seeded level generation with milestone modifiers
│   ├── types.ts             # TypeScript types and enums
│   └── levels/              # Hand-crafted levels for each track
├── auth/                    # Firebase Auth (Google, Apple)
├── data/                    # Storage (localStorage + Firestore)
├── input/                   # Keyboard and touch input
└── render/                  # Canvas renderer + particle system
```

## License

MIT

## Author

**Hossein Sadeghi** - [GitHub](https://github.com/hosseinsadeghi) - hosseinsadeghiesfahani@gmail.com
