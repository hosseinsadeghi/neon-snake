import { GameState, GamePhase, Point, TrackId, Direction } from '../core/types';
import { ParticleSystem } from './particle-system';

const NEON_CYAN = '#00f5ff';
const NEON_PINK = '#ff00ff';
const NEON_GREEN = '#39ff14';
const NEON_YELLOW = '#ffff00';
const NEON_ORANGE = '#ff6600';
const PORTAL_BLUE = '#4488ff';
const PORTAL_PURPLE = '#aa44ff';
const BG_COLOR = '#0a0a12';
const GRID_COLOR = 'rgba(30, 30, 60, 0.4)';
const WALL_COLOR = '#2a1a4a';
const WALL_BORDER = '#aa55ff';
const WALL_INNER = '#8844dd';

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  fontSize: number;
}

const DEATH_MESSAGES = [
  'OUCH!', 'BONK!', 'SPLAT!', 'NOPE!', 'RIP!', 'OOF!',
  'WASTED!', 'YIKES!', 'BYE BYE!', 'OH NO!', 'CRUNCH!',
  '*CHOMP*', 'WALL: 1\nYOU: 0', 'THAT HURT!', 'NOT AGAIN!',
];

const EAT_MESSAGES = [
  'YUM!', 'NOM!', 'TASTY!', 'NICE!', 'MUNCH!', 'DELISH!',
  'GULP!', 'SNACK!', '\u{1F60B}', 'CRUNCH!',
];

const SPECIAL_EAT_MESSAGES = [
  'JACKPOT!', 'BONUS!', 'SWEET!', 'MEGA!', 'WOW!',
  '\u{1F929}', 'LEGENDARY!', 'EPIC!',
];

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: ParticleSystem;
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private animTime = 0;
  private screenShake = 0;
  private screenShakeX = 0;
  private screenShakeY = 0;
  private floatingTexts: FloatingText[] = [];
  private headSquash = 0; // >0 means currently squashing
  private headSquashDir: 'x' | 'y' = 'x';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.particles = new ParticleSystem();
  }

  getParticles(): ParticleSystem {
    return this.particles;
  }

  /** Returns the top-left corner of the top HUD panel (for aligning the menu button) */
  getMenuButtonPosition(): { x: number; y: number } {
    return {
      x: this.offsetX - 4 + 4,
      y: this.offsetY - Renderer.HUD_GAP - Renderer.HUD_TOP_H + 6,
    };
  }

  clearFloatingTexts() {
    this.floatingTexts = [];
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private static readonly HUD_TOP_H = 44;    // space above grid for top panel
  private static readonly HUD_BOTTOM_H = 36;  // space below grid for bottom panel
  private static readonly HUD_GAP = 6;        // gap between panel and grid

  private computeLayout(state: GameState) {
    const rect = this.canvas.getBoundingClientRect();
    const reservedV = Renderer.HUD_TOP_H + Renderer.HUD_BOTTOM_H + Renderer.HUD_GAP * 2 + 20;
    const maxW = rect.width - 20;
    const maxH = rect.height - reservedV;
    const cellW = Math.floor(maxW / state.level.gridWidth);
    const cellH = Math.floor(maxH / state.level.gridHeight);
    this.cellSize = Math.min(cellW, cellH, 24);
    const gridPxW = this.cellSize * state.level.gridWidth;
    const gridPxH = this.cellSize * state.level.gridHeight;
    this.offsetX = Math.floor((rect.width - gridPxW) / 2);
    // Center the grid+panels vertically, then offset the grid below the top panel
    const totalH = Renderer.HUD_TOP_H + Renderer.HUD_GAP + gridPxH + Renderer.HUD_GAP + Renderer.HUD_BOTTOM_H;
    const startY = Math.floor((rect.height - totalH) / 2);
    this.offsetY = startY + Renderer.HUD_TOP_H + Renderer.HUD_GAP;
  }

  private toPixel(p: Point): { x: number; y: number } {
    return {
      x: this.offsetX + p.x * this.cellSize + this.cellSize / 2,
      y: this.offsetY + p.y * this.cellSize + this.cellSize / 2,
    };
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, fontSize = 14, life = 60) {
    this.floatingTexts.push({ x, y, text, color, life, maxLife: life, fontSize });
  }

  private randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  emitFoodParticles(pos: Point) {
    const px = this.toPixel(pos);
    this.particles.emit(px.x, px.y, 15, NEON_GREEN, 5, 3, 30);
    // Funny eat text
    const msg = this.randomFrom(EAT_MESSAGES);
    this.spawnFloatingText(px.x, px.y - 10, msg, NEON_GREEN, 13, 50);
    // Squash-stretch on head
    this.headSquash = 1;
  }

  emitSpecialFoodParticles(pos: Point) {
    const px = this.toPixel(pos);
    this.particles.emit(px.x, px.y, 30, NEON_YELLOW, 8, 4, 40);
    this.particles.emit(px.x, px.y, 15, NEON_ORANGE, 6, 3, 35);
    // Big text
    const msg = this.randomFrom(SPECIAL_EAT_MESSAGES);
    this.spawnFloatingText(px.x, px.y - 10, msg, NEON_YELLOW, 18, 70);
    this.headSquash = 1;
    this.screenShake = 5;
  }

  emitDeathParticles(pos: Point) {
    const px = this.toPixel(pos);
    this.particles.emit(px.x, px.y, 50, NEON_PINK, 12, 5, 50);
    this.particles.emit(px.x, px.y, 25, NEON_CYAN, 8, 3, 60);
    this.particles.emit(px.x, px.y, 15, '#ffffff', 6, 6, 30);
    this.screenShake = 20;
    // Funny death message
    const msg = this.randomFrom(DEATH_MESSAGES);
    this.spawnFloatingText(px.x, px.y - 15, msg, NEON_PINK, 20, 80);
  }

  emitRivalDeathParticles(pos: Point) {
    const px = this.toPixel(pos);
    this.particles.emit(px.x, px.y, 30, NEON_ORANGE, 10, 4, 40);
    this.spawnFloatingText(px.x, px.y - 15, 'RIVAL DOWN!', NEON_ORANGE, 18, 70);
  }

  emitRivalAteParticles(pos: Point) {
    const px = this.toPixel(pos);
    this.particles.emit(px.x, px.y, 10, NEON_ORANGE, 5, 2, 20);
    this.spawnFloatingText(px.x, px.y - 10, 'STOLEN!', '#ff4444', 14, 50);
  }

  emitP2DeathParticles(pos: Point) {
    const px = this.toPixel(pos);
    this.particles.emit(px.x, px.y, 30, NEON_GREEN, 10, 4, 40);
    this.spawnFloatingText(px.x, px.y - 15, 'P2 DOWN!', NEON_GREEN, 18, 70);
  }

  emitHazardSpawnParticles(pos: Point) {
    const px = this.toPixel(pos);
    this.particles.emit(px.x, px.y, 8, '#ff0044', 4, 1.5, 20);
  }

  emitHazardHitParticles(pos: Point) {
    const px = this.toPixel(pos);
    this.particles.emit(px.x, px.y, 40, '#ff0044', 10, 5, 50);
    this.particles.emit(px.x, px.y, 20, NEON_ORANGE, 8, 4, 40);
    this.screenShake = 25;
    this.spawnFloatingText(px.x, px.y - 15, 'HAZARD!', '#ff0044', 22, 80);
  }

  emitPortalParticles(pos: Point) {
    const px = this.toPixel(pos);
    this.particles.emit(px.x, px.y, 12, PORTAL_PURPLE, 6, 2, 25);
    this.spawnFloatingText(px.x, px.y - 10, 'WHOOSH!', PORTAL_BLUE, 12, 40);
  }

  draw(state: GameState, dt: number) {
    this.animTime += dt;
    this.computeLayout(state);
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();

    // Screen shake
    if (this.screenShake > 0) {
      this.screenShakeX = (Math.random() - 0.5) * this.screenShake;
      this.screenShakeY = (Math.random() - 0.5) * this.screenShake;
      this.screenShake *= 0.9;
      if (this.screenShake < 0.5) this.screenShake = 0;
    } else {
      this.screenShakeX = 0;
      this.screenShakeY = 0;
    }

    ctx.save();
    ctx.translate(this.screenShakeX, this.screenShakeY);

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(-10, -10, rect.width + 20, rect.height + 20);

    // Subtle radial gradient behind grid
    const gridCenterX = this.offsetX + (state.level.gridWidth * this.cellSize) / 2;
    const gridCenterY = this.offsetY + (state.level.gridHeight * this.cellSize) / 2;
    const bgGrad = ctx.createRadialGradient(gridCenterX, gridCenterY, 0, gridCenterX, gridCenterY, state.level.gridWidth * this.cellSize * 0.7);
    bgGrad.addColorStop(0, 'rgba(20, 10, 40, 0.5)');
    bgGrad.addColorStop(1, 'rgba(10, 10, 18, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    this.drawGrid(state);
    this.drawWalls(state);
    this.drawPortals(state);
    this.drawHazards(state);
    this.drawFood(state);
    this.drawSpecialFood(state);
    this.drawSnake(state);
    this.drawRivalSnake(state);
    this.drawSwarmSnakes(state);

    // Particles
    this.particles.update(dt);
    this.particles.draw(ctx);

    // Floating texts
    this.updateAndDrawFloatingTexts(dt);

    // Decay head squash
    if (this.headSquash > 0) {
      this.headSquash -= dt / 200;
      if (this.headSquash < 0) this.headSquash = 0;
    }

    this.drawHUD(state, rect.width);

    // Phase overlays (pause is handled by DOM menu now)
    if (state.phase === GamePhase.COUNTDOWN) {
      this.drawCountdownOverlay(state, rect);
    } else if (state.phase === GamePhase.DYING) {
      this.drawDeathOverlay(state, rect);
    } else if (state.phase === GamePhase.LEVEL_COMPLETE) {
      this.drawLevelCompleteOverlay(state, rect);
    }

    ctx.restore();
  }

  private drawGrid(state: GameState) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const gw = state.level.gridWidth * cs;
    const gh = state.level.gridHeight * cs;
    const ox = this.offsetX;
    const oy = this.offsetY;

    // Grid lines
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= state.level.gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(ox + x * cs, oy);
      ctx.lineTo(ox + x * cs, oy + gh);
      ctx.stroke();
    }
    for (let y = 0; y <= state.level.gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + y * cs);
      ctx.lineTo(ox + gw, oy + y * cs);
      ctx.stroke();
    }

    // Play area boundary
    const hasWalls = state.level.walls.length > 0;
    if (hasWalls) {
      // Solid bright border for walled levels
      ctx.strokeStyle = WALL_BORDER;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = WALL_BORDER;
      ctx.shadowBlur = 10;
      ctx.strokeRect(ox - 1, oy - 1, gw + 2, gh + 2);
      ctx.shadowBlur = 0;
    } else {
      // Animated dashed border for wrap-around levels
      const dashOffset = (this.animTime / 30) % 20;
      ctx.strokeStyle = NEON_CYAN;
      ctx.lineWidth = 2;
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 8;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -dashOffset;
      ctx.strokeRect(ox - 1, oy - 1, gw + 2, gh + 2);
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Wrap arrows in corners
      ctx.globalAlpha = 0.4 + Math.sin(this.animTime / 400) * 0.2;
      ctx.fillStyle = NEON_CYAN;
      ctx.font = `${Math.max(10, cs * 0.6)}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const arrowInset = cs * 0.8;
      ctx.fillText('\u21C4', ox + arrowInset, oy - arrowInset);           // top-left
      ctx.fillText('\u21C4', ox + gw - arrowInset, oy - arrowInset);      // top-right
      ctx.fillText('\u21C5', ox - arrowInset, oy + gh / 2);               // left-mid
      ctx.fillText('\u21C5', ox + gw + arrowInset, oy + gh / 2);          // right-mid
      ctx.globalAlpha = 1;
    }
  }

  private drawWalls(state: GameState) {
    const ctx = this.ctx;
    const cs = this.cellSize;

    for (const w of state.level.walls) {
      const x = this.offsetX + w.x * cs;
      const y = this.offsetY + w.y * cs;

      // Outer glow halo
      ctx.shadowColor = WALL_BORDER;
      ctx.shadowBlur = 8;

      // Wall body - brighter gradient fill
      const grad = ctx.createLinearGradient(x, y, x + cs, y + cs);
      grad.addColorStop(0, WALL_COLOR);
      grad.addColorStop(0.5, WALL_INNER);
      grad.addColorStop(1, WALL_COLOR);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, cs, cs);

      // Bright neon border
      ctx.strokeStyle = WALL_BORDER;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);

      // Inner highlight for depth
      ctx.strokeStyle = 'rgba(200, 150, 255, 0.25)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 2, y + 2, cs - 4, cs - 4);

      ctx.shadowBlur = 0;
    }
  }

  private drawPortals(state: GameState) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const pulse = Math.sin(this.animTime / 300) * 0.3 + 0.7;

    const colors = [PORTAL_BLUE, PORTAL_PURPLE];
    for (let i = 0; i < state.level.portalPairs.length; i++) {
      const [a, b] = state.level.portalPairs[i];
      const color = colors[i % colors.length];

      for (const p of [a, b]) {
        const px = this.offsetX + p.x * cs + cs / 2;
        const py = this.offsetY + p.y * cs + cs / 2;
        const r = cs * 0.4 * pulse;

        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(px, py, cs * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    }
  }

  private drawFood(state: GameState) {
    if (!state.food) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const px = this.offsetX + state.food.x * cs + cs / 2;
    const py = this.offsetY + state.food.y * cs + cs / 2;

    const pulse = Math.sin(this.animTime / 200) * 0.15 + 0.85;
    const r = cs * 0.35 * pulse;

    const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, NEON_GREEN);
    grad.addColorStop(1, 'rgba(57, 255, 20, 0)');

    ctx.fillStyle = grad;
    ctx.shadowColor = NEON_GREEN;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Orbit ring
    ctx.strokeStyle = NEON_GREEN;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, cs * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawSpecialFood(state: GameState) {
    if (!state.specialFood) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const sf = state.specialFood;
    const px = this.offsetX + sf.pos.x * cs + cs / 2;
    const py = this.offsetY + sf.pos.y * cs + cs / 2;

    const ttlRatio = sf.ttl / sf.maxTtl;
    const pulse = Math.sin(this.animTime / 120) * 0.2 + 0.8;
    const r = cs * 0.38 * pulse;

    const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, NEON_YELLOW);
    grad.addColorStop(1, 'rgba(255, 255, 0, 0)');

    ctx.globalAlpha = Math.max(0.3, ttlRatio);
    ctx.fillStyle = grad;
    ctx.shadowColor = NEON_YELLOW;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Star shape
    ctx.strokeStyle = NEON_ORANGE;
    ctx.lineWidth = 1.5;
    this.drawStar(px, py, cs * 0.18, cs * 0.38, 5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawStar(cx: number, cy: number, innerR: number, outerR: number, points: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private drawSnake(state: GameState) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const snake = state.snake;
    const len = snake.length;

    if (len === 0) return;

    const isDying = state.phase === GamePhase.DYING;
    const deathProgress = isDying ? 1 - state.deathTimer / 1500 : 0;

    // Draw body segments with gradient
    for (let i = 0; i < len; i++) {
      const seg = snake[i];
      const t = i / (len - 1 || 1);
      let x = this.offsetX + seg.x * cs;
      let y = this.offsetY + seg.y * cs;

      // Death scatter animation: segments drift apart
      if (isDying && deathProgress > 0.05) {
        const scatter = deathProgress * cs * 1.5;
        const angle = (i / len) * Math.PI * 6 + i;
        x += Math.sin(angle) * scatter;
        y += Math.cos(angle) * scatter * 0.7;
      }

      // Interpolate color from cyan (tail) to bright pink (head)
      const r = Math.round(0 + t * 255);
      const g = Math.round(245 - t * 245);
      const b = Math.round(255);
      const color = `rgb(${r}, ${g}, ${b})`;

      const isHead = i === len - 1;
      let inset = isHead ? 1 : 2;
      let w = cs - inset * 2;
      let h = cs - inset * 2;

      // Squash-stretch on the head when eating
      if (isHead && this.headSquash > 0) {
        const squashAmount = Math.sin(this.headSquash * Math.PI) * 0.3;
        const isVertical = state.direction === 0 || state.direction === 1;
        if (isVertical) {
          w *= (1 + squashAmount);
          h *= (1 - squashAmount * 0.5);
          x -= (w - (cs - inset * 2)) / 2;
        } else {
          h *= (1 + squashAmount);
          w *= (1 - squashAmount * 0.5);
          y -= (h - (cs - inset * 2)) / 2;
        }
      }

      // Death fade
      if (isDying) {
        ctx.globalAlpha = Math.max(0, 1 - deathProgress * 1.2 + t * 0.3);
      }

      const radius = isHead ? cs * 0.15 : cs * 0.1;

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = isHead ? 12 : 6;

      this.roundRect(x + inset, y + inset, w, h, radius);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Don't draw eyes/face if dying
    if (isDying && deathProgress > 0.15) {
      // Draw X eyes during death
      const head = snake[len - 1];
      const hx = this.offsetX + head.x * cs + cs / 2;
      const hy = this.offsetY + head.y * cs + cs / 2;
      ctx.globalAlpha = Math.max(0, 1 - deathProgress * 1.5);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      const xSize = cs * 0.1;
      // Left X eye
      ctx.beginPath();
      ctx.moveTo(hx - cs * 0.2 - xSize, hy - xSize);
      ctx.lineTo(hx - cs * 0.2 + xSize, hy + xSize);
      ctx.moveTo(hx - cs * 0.2 + xSize, hy - xSize);
      ctx.lineTo(hx - cs * 0.2 - xSize, hy + xSize);
      ctx.stroke();
      // Right X eye
      ctx.beginPath();
      ctx.moveTo(hx + cs * 0.2 - xSize, hy - xSize);
      ctx.lineTo(hx + cs * 0.2 + xSize, hy + xSize);
      ctx.moveTo(hx + cs * 0.2 + xSize, hy - xSize);
      ctx.lineTo(hx + cs * 0.2 - xSize, hy + xSize);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      return;
    }

    // Head details - normal eyes
    const head = snake[len - 1];
    const hx = this.offsetX + head.x * cs + cs / 2;
    const hy = this.offsetY + head.y * cs + cs / 2;

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    const eyeOffset = cs * 0.15;
    const eyeSize = cs * 0.1;
    let ex1 = 0, ey1 = 0, ex2 = 0, ey2 = 0;

    switch (state.direction) {
      case 0: // UP
        ex1 = hx - eyeOffset; ey1 = hy - eyeOffset;
        ex2 = hx + eyeOffset; ey2 = hy - eyeOffset;
        break;
      case 1: // DOWN
        ex1 = hx - eyeOffset; ey1 = hy + eyeOffset;
        ex2 = hx + eyeOffset; ey2 = hy + eyeOffset;
        break;
      case 2: // LEFT
        ex1 = hx - eyeOffset; ey1 = hy - eyeOffset;
        ex2 = hx - eyeOffset; ey2 = hy + eyeOffset;
        break;
      case 3: // RIGHT
        ex1 = hx + eyeOffset; ey1 = hy - eyeOffset;
        ex2 = hx + eyeOffset; ey2 = hy + eyeOffset;
        break;
    }

    // Bigger googly eyes
    ctx.beginPath();
    ctx.arc(ex1, ey1, eyeSize * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex2, ey2, eyeSize * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Pupils that look in movement direction
    ctx.fillStyle = '#000';
    const pupilShift = eyeSize * 0.3;
    let pdx = 0, pdy = 0;
    switch (state.direction) {
      case 0: pdy = -pupilShift; break;
      case 1: pdy = pupilShift; break;
      case 2: pdx = -pupilShift; break;
      case 3: pdx = pupilShift; break;
    }
    ctx.beginPath();
    ctx.arc(ex1 + pdx, ey1 + pdy, eyeSize * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex2 + pdx, ey2 + pdy, eyeSize * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Mouth when eating (squash active)
    if (this.headSquash > 0.3) {
      ctx.fillStyle = '#000';
      ctx.beginPath();
      const mouthOpen = Math.sin(this.headSquash * Math.PI) * cs * 0.12;
      switch (state.direction) {
        case 0: ctx.arc(hx, hy - cs * 0.3, mouthOpen, 0, Math.PI * 2); break;
        case 1: ctx.arc(hx, hy + cs * 0.3, mouthOpen, 0, Math.PI * 2); break;
        case 2: ctx.arc(hx - cs * 0.3, hy, mouthOpen, 0, Math.PI * 2); break;
        case 3: ctx.arc(hx + cs * 0.3, hy, mouthOpen, 0, Math.PI * 2); break;
      }
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }

  private updateAndDrawFloatingTexts(dt: number) {
    const ctx = this.ctx;
    const step = dt / 16;

    this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);

    for (const ft of this.floatingTexts) {
      ft.y -= 1.2 * step;
      ft.life -= step;

      const progress = 1 - ft.life / ft.maxLife;
      const alpha = progress < 0.2 ? progress / 0.2 : Math.max(0, 1 - (progress - 0.5) * 2);
      const scale = progress < 0.15 ? 0.5 + progress / 0.15 * 0.5 : 1 + Math.sin(progress * Math.PI) * 0.1;
      const wobble = Math.sin(progress * Math.PI * 4) * 3 * (1 - progress);

      ctx.save();
      ctx.translate(ft.x + wobble, ft.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${ft.fontSize}px "Orbitron", "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = ft.color;

      // Handle multiline
      const lines = ft.text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 0, i * (ft.fontSize + 2));
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ==================== Panel helpers ====================

  /** Draws a rounded-rect panel with a dark translucent fill and neon border */
  private drawPanel(x: number, y: number, w: number, h: number, borderColor: string) {
    const ctx = this.ctx;
    const r = 6;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = 'rgba(8, 6, 18, 0.85)';
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /** Draws a small food progress bar */
  private drawProgressBar(x: number, y: number, w: number, h: number, ratio: number, fillColor: string, glowColor: string) {
    const ctx = this.ctx;
    const r = h / 2;
    const clamped = Math.min(Math.max(ratio, 0), 1);

    // Background track
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();

    // Fill
    if (clamped > 0) {
      const fw = Math.max(h, w * clamped); // min width = pill shape
      ctx.beginPath();
      ctx.roundRect(x, y, fw, h, r);
      ctx.fillStyle = fillColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // ==================== HUD ====================

  private drawHUD(state: GameState, _width: number) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const gridW = state.level.gridWidth * cs;
    const ox = this.offsetX;
    const oy = this.offsetY;
    const topH = Renderer.HUD_TOP_H;
    const botH = Renderer.HUD_BOTTOM_H;
    const gap = Renderer.HUD_GAP;

    // Panel boundaries
    const panelX = ox - 4;
    const panelW = gridW + 8;
    const topY = oy - gap - topH;
    const botY = oy + state.level.gridHeight * cs + gap;

    // ---- TOP PANEL ----
    this.drawPanel(panelX, topY, panelW, topH, 'rgba(100, 50, 200, 0.45)');

    const topMidY = topY + topH / 2;
    ctx.textBaseline = 'middle';

    // Level name (left, leave room for hamburger)
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = NEON_CYAN;
    ctx.shadowColor = NEON_CYAN;
    ctx.shadowBlur = 4;
    ctx.textAlign = 'left';
    ctx.fillText(`LV.${state.level.id}  ${state.level.name.toUpperCase()}`, panelX + 38, topMidY);
    ctx.shadowBlur = 0;

    // Mode-specific right side of top panel
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right';
    const rx = panelX + panelW - 12;

    if (state.trackId === TrackId.RIVAL) {
      if (state.useAstar) {
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 4;
        ctx.fillText(`A\u2605  ${state.rivalFoodEaten}/${state.level.foodToWin}`, rx, topMidY);
      } else {
        ctx.fillStyle = NEON_ORANGE;
        ctx.shadowColor = NEON_ORANGE;
        ctx.shadowBlur = 4;
        ctx.fillText(`RIVAL  ${state.rivalFoodEaten}/${state.level.foodToWin}`, rx, topMidY);
      }
      ctx.shadowBlur = 0;
    } else if (state.trackId === TrackId.SWARM) {
      const alive = state.swarmSnakes.filter(s => s.alive).length;
      ctx.fillStyle = '#ff2266';
      ctx.shadowColor = '#ff2266';
      ctx.shadowBlur = 4;
      ctx.fillText(`SWARM  ${alive}/${state.swarmSnakes.length}`, rx, topMidY);
      ctx.shadowBlur = 0;
    } else if (state.hazards.length > 0) {
      ctx.fillStyle = '#ff0044';
      ctx.shadowColor = '#ff0044';
      ctx.shadowBlur = 4;
      ctx.fillText(`\u26A0 ${state.hazards.filter(h => h.warningTicks <= 0).length} active`, rx, topMidY);
      ctx.shadowBlur = 0;
    }

    // ---- BOTTOM PANEL ----
    this.drawPanel(panelX, botY, panelW, botH, 'rgba(100, 50, 200, 0.35)');

    const botMidY = botY + botH / 2;

    // Hearts for lives (left) — not shown in multiplayer/swarm
    if (state.trackId !== TrackId.SWARM) {
      ctx.font = '15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'left';
      const maxLives = 3;
      const heartX = panelX + 12;
      for (let i = 0; i < maxLives; i++) {
        const alive = i < state.lives;
        ctx.fillStyle = alive ? NEON_PINK : 'rgba(255,255,255,0.12)';
        if (alive) {
          ctx.shadowColor = NEON_PINK;
          ctx.shadowBlur = 6;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fillText('\u2665', heartX + i * 18, botMidY);
      }
      ctx.shadowBlur = 0;
    }

    // Food progress bar (center)
    const barW = Math.min(panelW * 0.35, 140);
    const barH = 10;
    const barX = panelX + (panelW - barW) / 2;
    const barY = botMidY - barH / 2;
    const eaten = state.foodEaten;
    const goal = state.level.foodToWin;
    this.drawProgressBar(barX, barY, barW, barH, eaten / goal, NEON_GREEN, NEON_GREEN);

    // Food text on top of bar
    ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${eaten} / ${goal}`, barX + barW / 2, botMidY);

    // Score (right)
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = NEON_YELLOW;
    ctx.shadowColor = NEON_YELLOW;
    ctx.shadowBlur = 4;
    ctx.fillText(`\u2605 ${state.score}`, panelX + panelW - 12, botMidY);
    ctx.shadowBlur = 0;

    // Combo indicator (floats above bottom panel)
    if (state.combo > 1) {
      ctx.fillStyle = NEON_YELLOW;
      ctx.shadowColor = NEON_YELLOW;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.combo}`, panelX + panelW / 2, botY - 10);
      ctx.shadowBlur = 0;
    }
  }

  private drawCountdownOverlay(state: GameState, rect: DOMRect) {
    const ctx = this.ctx;
    const total = 3000;
    const remaining = state.countdownTimer;
    const elapsed = total - remaining;

    // Dim overlay
    const dimAlpha = Math.min(elapsed / 300, 0.5);
    ctx.fillStyle = `rgba(0, 0, 0, ${dimAlpha})`;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const cx = rect.width / 2;
    const cy = rect.height / 2;

    // Which number to show: 3, 2, 1, or "GO!"
    const secondsLeft = Math.ceil(remaining / 1000);
    const text = secondsLeft > 0 ? String(secondsLeft) : 'GO!';

    // Pulse animation within each second
    const withinSecond = remaining % 1000;
    const pulse = withinSecond / 1000; // 1 at start of second, 0 at end
    const scale = 1 + pulse * 0.4;

    // Color transitions: 3=cyan, 2=yellow, 1=pink, GO=green
    const colors: Record<string, string> = { '3': NEON_CYAN, '2': NEON_YELLOW, '1': NEON_PINK, 'GO!': NEON_GREEN };
    const color = colors[text] || NEON_CYAN;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 30 + pulse * 20;

    ctx.fillStyle = color;
    ctx.font = `bold ${text === 'GO!' ? 64 : 80}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = Math.min(1, 0.5 + pulse * 0.5);
    ctx.fillText(text, 0, 0);

    // Level name below
    ctx.globalAlpha = 0.7;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(state.level.name, 0, 55);

    ctx.restore();
  }

  private drawDeathOverlay(state: GameState, rect: DOMRect) {
    const ctx = this.ctx;
    const progress = 1 - state.deathTimer / 1500;
    ctx.fillStyle = `rgba(255, 0, 50, ${progress * 0.3})`;
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (progress > 0.3) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = NEON_PINK;
      ctx.shadowBlur = 15;
      if (state.lives <= 1) {
        ctx.fillText('GAME OVER', rect.width / 2, rect.height / 2);
      } else {
        ctx.fillText(`LIVES: ${state.lives - 1}`, rect.width / 2, rect.height / 2);
      }
      ctx.shadowBlur = 0;
    }
  }

  private drawLevelCompleteOverlay(state: GameState, rect: DOMRect) {
    const ctx = this.ctx;
    const progress = 1 - state.levelCompleteTimer / 2500;

    ctx.fillStyle = `rgba(0, 255, 100, ${Math.min(progress * 0.3, 0.2)})`;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = NEON_GREEN;
    ctx.shadowBlur = 20;
    ctx.fillText('LEVEL COMPLETE!', rect.width / 2, rect.height / 2 - 20);

    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = NEON_YELLOW;
    ctx.shadowColor = NEON_YELLOW;
    ctx.fillText(`Score: ${state.levelScore}`, rect.width / 2, rect.height / 2 + 20);
    ctx.shadowBlur = 0;
  }

  private drawPausedOverlay(rect: DOMRect) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = NEON_CYAN;
    ctx.shadowBlur = 15;
    ctx.fillText('PAUSED', rect.width / 2, rect.height / 2);
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText('Press ESC or P to resume', rect.width / 2, rect.height / 2 + 35);
  }

  // ============ Rival Snake ============

  private drawRivalSnake(state: GameState) {
    if (!state.rivalSnake || !state.rivalAlive) return;
    if (state.useAstar) {
      this.drawSecondarySnake(state.rivalSnake, state.rivalDirection, '#ffaa00', '#ff6600', false);
    } else {
      this.drawSecondarySnake(state.rivalSnake, state.rivalDirection, '#ff6600', '#ff2200', state.phase === GamePhase.DYING);
    }
  }

  // ============ Player 2 Snake ============

  private drawP2Snake(_state: GameState) {
    // No-op: multiplayer track removed
  }

  // ============ Swarm Snakes ============

  private static readonly SWARM_COLORS: [string, string][] = [
    ['#ff2266', '#cc0044'],
    ['#ff6600', '#cc4400'],
    ['#ff00ff', '#aa00aa'],
    ['#ffaa00', '#cc8800'],
    ['#00ccff', '#0088cc'],
    ['#ff4488', '#cc2266'],
    ['#aa44ff', '#7722cc'],
    ['#44ff88', '#22cc66'],
  ];

  private drawSwarmSnakes(state: GameState) {
    if (state.trackId !== TrackId.SWARM || !state.swarmSnakes) return;
    for (const sw of state.swarmSnakes) {
      if (!sw.alive) continue;
      const colors = Renderer.SWARM_COLORS[sw.colorIndex % Renderer.SWARM_COLORS.length];
      this.drawSecondarySnake(sw.segments, sw.direction, colors[0], colors[1], false);
    }
  }

  private drawSecondarySnake(snake: Point[], dir: Direction, colorA: string, colorB: string, faded: boolean) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const len = snake.length;
    if (len === 0) return;

    for (let i = 0; i < len; i++) {
      const seg = snake[i];
      const t = i / (len - 1 || 1);
      const x = this.offsetX + seg.x * cs;
      const y = this.offsetY + seg.y * cs;

      // Interpolate between colorA (tail) and colorB (head)
      const isHead = i === len - 1;
      const color = isHead ? colorB : colorA;
      const inset = isHead ? 1 : 2;
      const radius = isHead ? cs * 0.15 : cs * 0.1;

      ctx.globalAlpha = faded ? 0.4 : 0.9;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = isHead ? 10 : 4;

      this.roundRect(x + inset, y + inset, cs - inset * 2, cs - inset * 2, radius);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Head eyes
    const head = snake[len - 1];
    const hx = this.offsetX + head.x * cs + cs / 2;
    const hy = this.offsetY + head.y * cs + cs / 2;
    ctx.shadowBlur = 0;

    // Eyes
    ctx.fillStyle = '#ffffff';
    const eyeOff = cs * 0.15;
    const eyeSize = cs * 0.1;
    let ex1 = hx, ey1 = hy, ex2 = hx, ey2 = hy;
    switch (dir) {
      case Direction.UP: ex1 = hx - eyeOff; ey1 = hy - eyeOff; ex2 = hx + eyeOff; ey2 = hy - eyeOff; break;
      case Direction.DOWN: ex1 = hx - eyeOff; ey1 = hy + eyeOff; ex2 = hx + eyeOff; ey2 = hy + eyeOff; break;
      case Direction.LEFT: ex1 = hx - eyeOff; ey1 = hy - eyeOff; ex2 = hx - eyeOff; ey2 = hy + eyeOff; break;
      case Direction.RIGHT: ex1 = hx + eyeOff; ey1 = hy - eyeOff; ex2 = hx + eyeOff; ey2 = hy + eyeOff; break;
    }
    ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2); ctx.fill();
    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ============ Hazards ============

  private drawHazards(state: GameState) {
    if (state.hazards.length === 0) return;
    const ctx = this.ctx;
    const cs = this.cellSize;

    for (const h of state.hazards) {
      const x = this.offsetX + h.pos.x * cs + cs / 2;
      const y = this.offsetY + h.pos.y * cs + cs / 2;
      const ttlRatio = h.ttl / h.maxTtl;

      // Warning phase: blink
      if (h.warningTicks > 0) {
        const blink = Math.sin(h.warningTicks * 0.8) > 0;
        if (!blink) continue;
        ctx.globalAlpha = 0.3;
      } else {
        // Near-expiry: fade and blink
        if (ttlRatio < 0.2) {
          const blink = Math.sin(this.animTime / 60) > 0;
          ctx.globalAlpha = blink ? ttlRatio * 3 : ttlRatio;
        } else {
          ctx.globalAlpha = Math.min(1, ttlRatio * 1.5);
        }
      }

      const r = cs * 0.38;
      const color = h.type === 'skull' ? '#ff0044' : h.type === 'bomb' ? '#ff6600' : '#ffff00';

      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      // Background circle
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Icon
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(10, cs * 0.55)}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = h.type === 'skull' ? '\u{1F480}' : h.type === 'bomb' ? '\u{1F4A3}' : '\u{26A1}';
      ctx.fillText(icon, x, y);

      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
}
