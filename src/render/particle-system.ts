import { Particle } from '../core/types';

const POOL_SIZE = 300;

export class ParticleSystem {
  particles: Particle[] = [];

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.particles.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0, size: 0,
        color: '#fff', active: false,
      });
    }
  }

  emit(x: number, y: number, count: number, color: string, spread = 3, speed = 2, life = 40) {
    let spawned = 0;
    for (const p of this.particles) {
      if (spawned >= count) break;
      if (p.active) continue;
      const angle = Math.random() * Math.PI * 2;
      const vel = (Math.random() * 0.5 + 0.5) * speed;
      p.x = x + (Math.random() - 0.5) * spread;
      p.y = y + (Math.random() - 0.5) * spread;
      p.vx = Math.cos(angle) * vel;
      p.vy = Math.sin(angle) * vel;
      p.life = life + Math.random() * life * 0.5;
      p.maxLife = p.life;
      p.size = 1 + Math.random() * 2.5;
      p.color = color;
      p.active = true;
      spawned++;
    }
  }

  update(dt: number) {
    const step = dt / 16;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= step;
      if (p.life <= 0) p.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      const size = p.size * alpha;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  clear() {
    for (const p of this.particles) p.active = false;
  }
}
