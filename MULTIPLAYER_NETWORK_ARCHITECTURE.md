# Network Multiplayer Architecture

## Overview

Real-time snake requires **authoritative server** architecture. The server owns game state and runs the tick loop. Clients send inputs and receive state updates. This prevents cheating and ensures consistency across players.

---

## Architecture: Client-Authoritative Server with Input Prediction

```
┌──────────┐         WebSocket          ┌──────────────┐         WebSocket         ┌──────────┐
│ Client A │  ──── input actions ────▶  │              │  ◀── input actions ────  │ Client B │
│ (Browser)│  ◀── state snapshots ───  │    Server    │  ──── state snapshots ──▶ │ (Browser)│
│          │                            │ (Game Loop)  │                            │          │
│ Renderer │                            │ Tick Engine  │                            │ Renderer │
│ Input    │                            │ Room Manager │                            │ Input    │
│ Predictor│                            │ Matchmaking  │                            │ Predictor│
└──────────┘                            └──────────────┘                            └──────────┘
```

---

## Server Stack

### Option A: Node.js + Colyseus (Recommended)
- **Colyseus** is a Node.js multiplayer framework with built-in room management, state sync, and matchmaking
- Reuse existing TypeScript game engine (`core/game-engine.ts`) directly on the server — zero rewrite of game logic
- Colyseus handles WebSocket connections, room lifecycle, reconnection, and binary state serialization
- Deploy on any VPS, Railway, Fly.io, or a container service

### Option B: Node.js + raw `ws` + custom rooms
- More control, less abstraction
- Must build room management, state sync protocol, and reconnection yourself
- Same engine reuse advantage

### Option C: Cloudflare Durable Objects
- Serverless, edge-deployed, persistent WebSocket connections
- Each game room is a Durable Object with its own state
- Low latency globally, scales to zero
- More complex deployment, vendor lock-in

**Recommendation: Option A (Colyseus)**. Fastest path from current codebase to working multiplayer.

---

## Protocol Design

### Client → Server Messages

```typescript
// Client sends only inputs, never state
type ClientMessage =
  | { type: 'input'; action: Action; seq: number; timestamp: number }
  | { type: 'join'; roomId?: string; playerName: string }
  | { type: 'ready' }
  | { type: 'leave' };
```

### Server → Client Messages

```typescript
// Server sends authoritative state snapshots
type ServerMessage =
  | { type: 'state'; state: NetGameState; tick: number; timestamp: number }
  | { type: 'joined'; roomId: string; playerId: 'p1' | 'p2'; opponent: string }
  | { type: 'countdown'; seconds: number }
  | { type: 'start'; level: LevelDef; tick: number }
  | { type: 'input_ack'; seq: number; tick: number }
  | { type: 'game_over'; winner: 'p1' | 'p2' | 'draw'; scores: { p1: number; p2: number } }
  | { type: 'opponent_disconnected'; timeout: number }
  | { type: 'error'; message: string };

// Minimal state sent over wire (delta-compressed)
interface NetGameState {
  p1Snake: Point[];
  p2Snake: Point[];
  p1Dir: Direction;
  p2Dir: Direction;
  food: Point | null;
  specialFood: { pos: Point; ttl: number } | null;
  p1Score: number;
  p2Score: number;
  p1FoodEaten: number;
  p2FoodEaten: number;
  p1Alive: boolean;
  p2Alive: boolean;
  phase: GamePhase;
}
```

### Tick Rate & Bandwidth

- Server tick rate: **10-15 ticks/sec** (matching game speed ~66-100ms per tick)
- State snapshot size: ~200-400 bytes per tick (snake positions + metadata)
- Delta compression: only send changed fields — drops to ~50-100 bytes/tick for most frames
- At 15 ticks/sec × 400 bytes = **6 KB/sec** per client (very low)

---

## Client-Side Prediction & Reconciliation

Without prediction, the game feels laggy (round-trip delay before your snake responds). The solution:

### 1. Input Prediction
- When player presses a key, **immediately apply it locally** and render the result
- Simultaneously send the input to the server with a sequence number
- The client runs its own local copy of `gameTick()` to predict the next state

### 2. Server Reconciliation
- When the server sends an authoritative state snapshot, compare it with the predicted state
- If they match: do nothing (prediction was correct)
- If they differ: **snap to server state**, then replay all unacknowledged inputs on top of it
- This re-prediction happens in one frame — the player sees a small correction, not a freeze

### 3. Opponent Interpolation
- The opponent's snake is always slightly behind (one network round-trip)
- Buffer 2-3 server snapshots and **interpolate** the opponent's position between them
- This makes the opponent's movement look smooth even with 50-100ms latency

```
Timeline:
  Client A presses RIGHT at t=100ms
  → Locally applies RIGHT immediately (prediction)
  → Sends { action: RIGHT, seq: 42, timestamp: 100 } to server
  Server receives at t=150ms, applies to authoritative state
  → Broadcasts state snapshot at t=160ms
  Client A receives at t=210ms
  → Compares predicted state with server state
  → If mismatch: rollback to server state, replay inputs 42+ on top
```

---

## Room & Matchmaking System

### Room Lifecycle

```
1. LOBBY       Player creates or joins a room. Waiting for opponent.
2. COUNTDOWN   Both players connected. 3-2-1 countdown.
3. PLAYING     Server runs game loop. Both clients send inputs.
4. GAME_OVER   Winner determined. Show results. Option to rematch.
5. CLOSED      Both players leave or timeout. Room destroyed.
```

### Matchmaking Options

- **Room codes**: Player A creates a room, gets a 4-6 character code, shares it with Player B. Simple, works for friends.
- **Quick match**: Player joins a queue. Server pairs two players with similar latency. Requires a small matchmaking service.
- **Both**: Room codes for friends, quick match for strangers.

### Reconnection

- If a player disconnects, hold the room open for 15-30 seconds
- Pause the game (or let the other player keep eating)
- On reconnect, send full state snapshot + resume
- After timeout, opponent wins by forfeit

---

## Required Changes to Current Codebase

### New Package: `server/`

```
server/
├── package.json              # colyseus, @colyseus/ws-transport
├── tsconfig.json
├── src/
│   ├── index.ts              # HTTP + WebSocket server entry point
│   ├── rooms/
│   │   └── snake-room.ts     # Game room: manages 2 players, runs tick loop
│   ├── state/
│   │   └── game-schema.ts    # Colyseus Schema classes for auto-serialization
│   ├── matchmaking.ts        # Quick match queue logic
│   └── config.ts             # Tick rate, room settings, timeouts
```

### Changes to `src/core/` (shared between client & server)

| File | Change |
|------|--------|
| `core/types.ts` | Add `TrackId.ONLINE` enum value. Add `NetGameState` interface. |
| `core/game-engine.ts` | **No changes needed.** The existing `createInitialState()`, `applyAction()`, and `tick()` already support 2-snake gameplay via the MULTIPLAYER track. The server calls these same functions. |
| `core/levels/` | Add `online-levels.ts` — curated symmetrical levels designed for fair competitive play. |

### Changes to `src/` (client)

| File | Change |
|------|--------|
| `src/net/` (new) | |
| `src/net/client.ts` | WebSocket connection manager. Connect, send inputs, receive state. Auto-reconnect. |
| `src/net/prediction.ts` | Client-side prediction engine. Local tick simulation, input buffer, server reconciliation. |
| `src/net/interpolation.ts` | Opponent state interpolation. Buffers snapshots, lerps between them. |
| `src/net/lobby-ui.ts` | DOM-based lobby UI: create room, enter code, quick match, waiting screen. |
| `src/input/input-manager.ts` | Add `ONLINE` mode: only send P1 actions (WASD or Arrows), never P2. Attach sequence numbers to each input. |
| `src/render/renderer.ts` | Add network status indicator (ping, connection quality). Add opponent name label above their snake. |
| `src/main.ts` | Add ONLINE track flow: Title → Track Select → Lobby → Matchmaking → Playing. Wire `net/client.ts` into the game loop. In online mode, the game loop receives state from the server instead of running `tick()` locally (except for prediction). |
| `src/ui/screens/` | Add `lobby-screen.ts` (create/join room UI), `waiting-screen.ts` (waiting for opponent). |
| `index.html` | Add lobby screen HTML: room code input, create/join buttons, quick match button, connection status. |
| `src/style.css` | Lobby screen styles, ping indicator, opponent name label. |

### Changes to `src/data/` (persistence)

| File | Change |
|------|--------|
| `storage-interface.ts` | Add `TrackId.ONLINE` to `defaultProgress()`. |
| Online leaderboard (new) | Server stores match results in a database (Firestore, Postgres, or Redis). Client fetches leaderboard via REST API. |

---

## Latency Handling

| Latency | Experience | Mitigation |
|---------|-----------|------------|
| < 50ms | Perfect — feels local | None needed |
| 50-100ms | Good — slight input delay masked by prediction | Client prediction + interpolation |
| 100-200ms | Playable — occasional corrections visible | Increase interpolation buffer to 3 frames |
| 200-400ms | Degraded — frequent rubberbanding | Show warning icon. Consider pausing game. |
| > 400ms | Unplayable | Disconnect and show "connection lost" |

### Measuring Latency
- Client sends periodic `ping` messages with timestamps
- Server responds with `pong` + server timestamp
- Client computes RTT and one-way latency estimate
- Display as a colored dot in the HUD (green/yellow/red)

---

## Security Considerations

- **Server is authoritative**: clients cannot modify game state, only send inputs
- **Rate limit inputs**: max 10 inputs per second per client (prevents input flooding)
- **Validate inputs**: server rejects invalid actions (e.g., 180-degree turns, inputs during death)
- **Room access**: room codes should be short-lived, unguessable (6 alphanumeric chars = 2 billion combinations)
- **Anti-cheat**: server controls tick rate, food spawns, and collision — client has no power to cheat on these
- **DDoS**: use Cloudflare or similar in front of the WebSocket server

---

## Deployment Topology

```
                    ┌─────────────┐
                    │  Cloudflare  │  ← CDN for static client assets
                    │  (or Vercel) │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐     ┌─────────▼─────────┐
     │  Static Client  │     │  Game Server(s)    │
     │  (Vite build)   │     │  (Colyseus on      │
     │  HTML/JS/CSS    │     │   Fly.io/Railway)  │
     └─────────────────┘     │                    │
                              │  WebSocket :2567   │
                              │  REST API  :2567   │
                              └────────┬──────────┘
                                       │
                              ┌────────▼──────────┐
                              │  Database          │
                              │  (Firestore/Redis) │
                              │  Match history,    │
                              │  leaderboards      │
                              └───────────────────┘
```

### Scaling
- Each Colyseus server handles ~1000-2000 concurrent rooms (2000-4000 players)
- Horizontal scaling: run multiple server instances behind a load balancer
- Colyseus has built-in multi-process support via `@colyseus/cluster`
- For global low-latency: deploy game servers in multiple regions (US, EU, Asia) and route players to the nearest one

---

## Implementation Order

1. **Server scaffold**: Set up `server/` with Colyseus, import `core/` game engine
2. **Room logic**: Create `SnakeRoom` that runs the game loop and manages 2 players
3. **Client networking**: `net/client.ts` — WebSocket connection, send/receive messages
4. **Lobby UI**: Create/join room screens, room code flow
5. **Basic play**: Server sends full state each tick, client renders it (no prediction yet)
6. **Client prediction**: Add local tick simulation and server reconciliation
7. **Interpolation**: Smooth opponent rendering between server snapshots
8. **Quick match**: Add matchmaking queue
9. **Leaderboard**: Store results server-side, display in client
10. **Polish**: Ping display, reconnection, disconnect handling, countdown

---

## Cost Estimate

| Service | Cost |
|---------|------|
| Game server (Fly.io, 1 shared CPU) | ~$5-10/mo |
| Static hosting (Vercel/Cloudflare Pages) | Free |
| Database (Firestore free tier) | Free up to 50K reads/day |
| Domain | ~$10/year |
| **Total for small scale** | **~$5-10/mo** |

Scales linearly: each additional server instance adds ~$5-10/mo and handles another ~2000 concurrent players.
