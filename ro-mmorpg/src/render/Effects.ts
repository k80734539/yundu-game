import { Pool } from '../core/Pool';
import { textImage } from './Font';
import { isoX, isoY } from './iso';

export type DmgKind = 'deal' | 'take' | 'crit' | 'miss' | 'heal' | 'sp' | 'skill';
export class DmgText { alive = false; x = 0; y = 0; t = 0; img: HTMLCanvasElement | null = null; vx = 0; kind: DmgKind = 'deal'; big = false; }
export class Particle {
  alive = false; x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; g = 0; life = 0; max = 1; color = '#fff'; size = 2; kind: 'dot' | 'ring' | 'spark' | 'glow' | 'text' = 'dot'; r = 0;
}
/** 特效：傷害數字、粒子、地面圓環。座標用等角像素（iso），z 為離地高度 */
export class Effects {
  texts = new Pool(() => new DmgText());
  parts = new Pool(() => new Particle());
  dmg(wx: number, wy: number, value: number | string, kind: DmgKind, height = 110) {
    const d = this.texts.get();
    d.x = isoX(wx, wy); d.y = isoY(wx, wy) - height; d.t = 0; d.kind = kind;
    d.vx = (Math.random() * 2 - 1) * 14 + (kind === 'take' ? -10 : 10);
    const col = kind === 'take' ? '#ff6060' : kind === 'crit' ? '#ffe040' : kind === 'heal' ? '#70ff70' : kind === 'sp' ? '#70b0ff' : kind === 'miss' ? '#e0e0ff' : kind === 'skill' ? '#ffb040' : '#ffffff';
    const str = typeof value === 'number' ? String(Math.max(0, Math.round(value))) : value;
    d.big = kind === 'crit' || kind === 'skill';
    d.img = textImage(str, col, d.big ? 3 : 2);
  }
  burst(wx: number, wy: number, z: number, color: string, n = 8, speed = 60, kind: Particle['kind'] = 'spark', life = 0.4, size = 2) {
    const x = isoX(wx, wy), y = isoY(wx, wy);
    for (let i = 0; i < n; i++) {
      const p = this.parts.get();
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.5; p.vz = 40 + Math.random() * speed;
      p.g = 220; p.life = p.max = life * (0.6 + Math.random() * 0.6); p.color = color; p.size = size; p.kind = kind; p.r = 0;
    }
  }
  ring(wx: number, wy: number, color: string, life = 0.5, r = 40, z = 0) {
    const p = this.parts.get();
    p.x = isoX(wx, wy); p.y = isoY(wx, wy); p.z = z; p.vx = p.vy = p.vz = 0; p.g = 0; p.life = p.max = life; p.color = color; p.kind = 'ring'; p.r = r; p.size = 2;
  }
  glow(wx: number, wy: number, z: number, color: string, life = 0.6, size = 3, rise = 30) {
    const p = this.parts.get();
    p.x = isoX(wx, wy) + (Math.random() * 2 - 1) * 14; p.y = isoY(wx, wy) + (Math.random() * 2 - 1) * 6; p.z = z; p.vx = 0; p.vy = 0; p.vz = rise; p.g = 0;
    p.life = p.max = life; p.color = color; p.kind = 'glow'; p.size = size; p.r = 0;
  }
  update(dt: number) {
    this.texts.each((d) => { d.t += dt; d.x += d.vx * dt; if (d.t > 1.1) d.alive = false; });
    this.parts.each((p) => {
      p.life -= dt; if (p.life <= 0) { p.alive = false; return; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.g * dt;
      if (p.z < 0 && p.g > 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; }
    });
  }
  /** 粒子（世界空間，物件之後畫） */
  drawParticles(c: CanvasRenderingContext2D, L: number, Tp: number) {
    this.parts.each((p) => {
      const k = p.life / p.max;
      const x = Math.round(p.x - L), y = Math.round(p.y - Tp - p.z);
      if (p.kind === 'ring') {
        const r = p.r * (1.2 - k * 0.7);
        c.globalAlpha = k; c.strokeStyle = p.color; c.lineWidth = 2;
        c.beginPath(); c.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
      } else if (p.kind === 'glow') {
        c.globalAlpha = Math.min(1, k * 1.5); c.fillStyle = p.color; c.fillRect(x - p.size, y - p.size, p.size * 2, p.size * 2); c.globalAlpha = 1;
      } else {
        c.fillStyle = p.color; const s = p.size; c.fillRect(x, y, s, s);
      }
    });
  }
  drawTexts(c: CanvasRenderingContext2D, L: number, Tp: number) {
    this.texts.each((d) => {
      if (!d.img) return;
      // RO 式：先往上彈，再落下並淡出
      const t = d.t;
      const rise = t < 0.35 ? (t / 0.35) * 46 : 46 - ((t - 0.35) / 0.75) * 30;
      const a = t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.35) : 1;
      c.globalAlpha = a;
      c.drawImage(d.img, Math.round(d.x - L - d.img.width / 2), Math.round(d.y - Tp - rise - d.img.height / 2));
      c.globalAlpha = 1;
    });
  }
  clear() { this.texts.clear(); this.parts.clear(); }
}
