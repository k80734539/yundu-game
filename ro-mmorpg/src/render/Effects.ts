import { Pool } from '../core/Pool';
import { textImage } from './Font';
import { isoX, isoY } from './iso';

export type DmgKind = 'deal' | 'take' | 'crit' | 'miss' | 'heal' | 'sp' | 'skill';
export class DmgText { alive = false; x = 0; y = 0; t = 0; img: HTMLCanvasElement | null = null; vx = 0; kind: DmgKind = 'deal'; big = false; }
export class Particle {
  alive = false; x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; g = 0; life = 0; max = 1; color = '#fff'; size = 2; kind: 'dot' | 'ring' | 'spark' | 'glow' | 'text' | 'bolt' | 'arrow' | 'slash' | 'star' | 'flame' | 'pillar' | 'anger' | 'wave' = 'dot'; r = 0;
  a = 0; span = 0; flat = 1; sgn = 1; color2 = '#ffffff'; // 刀光／衝擊波用：中心角度、張開角度、壓扁比例（地面上的圓＝0.5）、揮動方向、亮芯顏色
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
  /** 把世界座標上的方向換成畫面上的角度（等角投影） */
  static screenAngle(dx: number, dy: number) { return Math.atan2((dx + dy) * 16, (dx - dy) * 32); }
  private fxp(wx: number, wy: number, z: number, kind: Particle['kind'], life: number) {
    const p = this.parts.get();
    p.x = isoX(wx, wy); p.y = isoY(wx, wy); p.z = z; p.vx = p.vy = p.vz = 0; p.g = 0; p.life = p.max = life; p.kind = kind; p.flat = 1; p.sgn = 1; p.color2 = '#ffffff'; p.a = 0; p.span = 0;
    return p;
  }
  /** 刀光：一道彎月形的弧，從一端掃到另一端後淡出。ang 是畫面上的方向（弧的正中央），r 半徑、th 最厚處的厚度 */
  slash(wx: number, wy: number, z: number, ang: number, o: { r?: number; th?: number; span?: number; color?: string; color2?: string; life?: number; flat?: number; sgn?: number } = {}) {
    const p = this.fxp(wx, wy, z, 'slash', o.life ?? 0.22);
    p.a = ang; p.r = o.r ?? 40; p.size = o.th ?? 12; p.span = o.span ?? 2.3; p.color = o.color ?? '#dff4ff'; p.color2 = o.color2 ?? '#ffffff'; p.flat = o.flat ?? 1; p.sgn = o.sgn ?? 1;
  }
  /** 命中的十字星芒 */
  star(wx: number, wy: number, z: number, color: string, size = 22, life = 0.22) { const p = this.fxp(wx, wy, z, 'star', life); p.color = color; p.size = size; }
  /** 火焰環：一圈往外擴散的火舌（爆裂斬） */
  flameRing(wx: number, wy: number, r: number, life = 0.55) { const p = this.fxp(wx, wy, 0, 'flame', life); p.r = r; p.a = Math.random() * 6.28; }
  /** 光柱：從腳下往上衝的光（霸體、守護類增益） */
  pillar(wx: number, wy: number, color: string, life = 0.7, w = 22, h = 120) { const p = this.fxp(wx, wy, 0, 'pillar', life); p.color = color; p.size = w; p.r = h; }
  /** 怒氣符號（挑釁） */
  anger(wx: number, wy: number, z: number) { this.fxp(wx, wy, z, 'anger', 0.9); }
  /** 聲波：往 ang 方向推出去的弧線 */
  wave(wx: number, wy: number, z: number, ang: number, color: string, r0 = 14, r1 = 70, life = 0.4) { const p = this.fxp(wx, wy, z, 'wave', life); p.a = ang; p.color = color; p.size = r0; p.r = r1; }
  /** 閃電：從天上劈下的鋸齒線 */
  lightning(wx: number, wy: number) {
    const p = this.parts.get();
    p.x = isoX(wx, wy); p.y = isoY(wx, wy); p.z = 0; p.vx = p.vy = p.vz = 0; p.g = 0; p.life = p.max = 0.22; p.kind = 'bolt'; p.color = '#fff8a0'; p.size = 3; p.r = Math.random() * 1000;
    this.burst(wx, wy, 0, '#fff8a0', 10, 120, 'spark', 0.4, 2);
    this.ring(wx, wy, '#f0e060', 0.35, 40);
  }
  /** 隕石：從天而降的火球 */
  meteor(wx: number, wy: number) {
    for (let i = 0; i < 10; i++) {
      const p = this.parts.get();
      p.x = isoX(wx, wy) - 60 + i * 2; p.y = isoY(wx, wy); p.z = 300 + i * 6; p.vx = 200; p.vy = 0; p.vz = -900; p.g = 0; p.life = p.max = 0.32; p.kind = 'glow'; p.color = i < 3 ? '#fff0a0' : i < 6 ? '#ff9030' : '#c03010'; p.size = 6 - Math.floor(i / 3); p.r = 0;
    }
  }
  /** 箭雨：一支從天而降的箭 */
  arrowRain(wx: number, wy: number) {
    const p = this.parts.get();
    p.x = isoX(wx, wy); p.y = isoY(wx, wy); p.z = 220; p.vx = 0; p.vy = 0; p.vz = -900; p.g = 0; p.life = p.max = 0.26; p.kind = 'arrow'; p.color = '#d8c8a0'; p.size = 2; p.r = 0;
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
      if (p.kind === 'slash') {
        const t = 1 - k, ease = (u: number) => 1 - (1 - u) * (1 - u);
        const head = ease(Math.min(1, t / 0.34)), tail = ease(Math.max(0, (t - 0.3) / 0.7));
        if (head - tail < 0.03) return;
        const a0 = p.a - (p.span / 2) * p.sgn, N = 12;
        const at = (u: number, rr: number): [number, number] => { const an = a0 + p.span * u * p.sgn; return [x + Math.cos(an) * rr, y + Math.sin(an) * rr * p.flat]; };
        const crescent = (thick: number) => {
          c.beginPath();
          for (let i = 0; i <= N; i++) { const q = at(tail + (head - tail) * (i / N), p.r); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }
          for (let i = N; i >= 0; i--) { const v = i / N, w = thick * Math.pow(Math.sin(Math.PI * v), 0.8) * (0.35 + 0.65 * v); const q = at(tail + (head - tail) * v, p.r - w); c.lineTo(q[0], q[1]); }
          c.closePath(); c.fill();
        };
        c.globalAlpha = Math.min(1, k * 1.9) * 0.85; c.fillStyle = p.color; crescent(p.size);
        c.globalAlpha = Math.min(1, k * 2.2); c.fillStyle = p.color2; crescent(p.size * 0.42);
        c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'star') {
        const t = 1 - k, s = p.size * (0.35 + 0.65 * Math.sin(Math.min(1, t * 3) * Math.PI / 2));
        c.globalAlpha = Math.min(1, k * 2);
        for (const [len, wid, col] of [[s, s * 0.16, p.color], [s * 0.62, s * 0.1, '#ffffff']] as [number, number, string][]) {
          c.fillStyle = col;
          c.beginPath(); c.moveTo(x - len, y); c.lineTo(x, y - wid); c.lineTo(x + len, y); c.lineTo(x, y + wid); c.closePath(); c.fill();
          c.beginPath(); c.moveTo(x, y - len); c.lineTo(x - wid, y); c.lineTo(x, y + len); c.lineTo(x + wid, y); c.closePath(); c.fill();
        }
        c.fillStyle = '#ffffff'; c.fillRect(x - 2, y - 2, 4, 4); c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'flame') {
        const t = 1 - k, R = p.r * (0.3 + 0.7 * (1 - (1 - Math.min(1, t / 0.5)) ** 2)), n = 20;
        c.globalAlpha = k * 0.35; c.fillStyle = '#ff7a20'; c.beginPath(); c.ellipse(x, y, R, R * 0.5, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = Math.min(1, k * 1.6); c.strokeStyle = '#ffd060'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, R, R * 0.5, 0, 0, Math.PI * 2); c.stroke();
        for (const pass of [0, 1]) for (let i = 0; i < n; i++) { // 先畫後半圈，再畫前半圈
          const an = p.a + (i / n) * Math.PI * 2, sn = Math.sin(an); if ((pass === 0) !== (sn < 0)) continue;
          const bx = x + Math.cos(an) * R, by = y + sn * R * 0.5;
          const h = (12 + ((i * 7) % 5) * 4) * Math.min(1, k * 1.5) * (1 + 0.35 * Math.sin(t * 34 + i * 1.7)), w = 6, tip = Math.sin(t * 22 + i) * 3;
          for (const [kk, col] of [[1, '#e23a10'], [0.68, '#ff9a28'], [0.36, '#fff0a0']] as [number, string][]) {
            c.fillStyle = col; c.beginPath(); c.moveTo(bx - w * kk, by); c.lineTo(bx + w * kk, by); c.lineTo(bx + tip * kk, by - h * kk); c.closePath(); c.fill();
          }
        }
        c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'pillar') {
        const t = 1 - k, h = p.r * Math.min(1, t / 0.22), w = p.size * (0.55 + 0.45 * k);
        const g = c.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, p.color); g.addColorStop(1, '#ffffff');
        c.globalAlpha = Math.min(1, k * 1.5) * 0.55; c.fillStyle = g; c.fillRect(Math.round(x - w), Math.round(y - h), Math.round(w * 2), Math.round(h));
        c.globalAlpha = Math.min(1, k * 1.5) * 0.7; c.fillRect(Math.round(x - w * 0.4), Math.round(y - h), Math.round(w * 0.8), Math.round(h));
        c.globalAlpha = Math.min(1, k * 1.5); c.strokeStyle = p.color; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, w + 6, (w + 6) * 0.5, 0, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'anger') {
        const t = 1 - k, s = 7 * (1 + 0.6 * Math.max(0, 1 - t * 7)), yy = y - Math.min(8, t * 30);
        c.globalAlpha = Math.min(1, k * 3); c.lineCap = 'round';
        for (const [lw, col] of [[5, '#3a0a0a'], [3, '#ff3030']] as [number, string][]) {
          c.strokeStyle = col; c.lineWidth = lw;
          for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { c.beginPath(); c.moveTo(x + sx * s * 1.5, yy + sy * s * 0.45); c.quadraticCurveTo(x + sx * s * 0.45, yy + sy * s * 0.45, x + sx * s * 0.45, yy + sy * s * 1.5); c.stroke(); }
        }
        c.globalAlpha = 1; c.lineCap = 'butt';
        return;
      }
      if (p.kind === 'wave') {
        const t = 1 - k, rr = p.size + (p.r - p.size) * (1 - (1 - t) * (1 - t));
        c.globalAlpha = Math.min(1, k * 1.6); c.lineCap = 'round';
        for (const [lw, col] of [[3 + 5 * k, p.color], [1 + 2 * k, '#ffffff']] as [number, string][]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(x, y, rr, p.a - 0.62, p.a + 0.62); c.stroke(); }
        c.globalAlpha = 1; c.lineCap = 'butt';
        return;
      }
      if (p.kind === 'bolt') {
        c.strokeStyle = k > 0.5 ? '#ffffff' : p.color; c.lineWidth = p.size; c.beginPath();
        let yy = y - 400, xx = x; c.moveTo(xx, yy);
        for (let i = 0; i < 8; i++) { yy += 50; xx = x + Math.sin(p.r + i * 2.3) * 14 * (1 - i / 8); c.lineTo(Math.round(xx), Math.round(yy)); }
        c.lineTo(x, y); c.stroke();
        c.globalAlpha = k * 0.5; c.fillStyle = '#fff8c0'; c.beginPath(); c.ellipse(x, y, 30, 14, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'arrow') {
        if (p.z <= 0) { p.z = 0; p.vz = 0; }
        c.fillStyle = '#5a3a20'; c.fillRect(x, y - 16, 2, 16); c.fillStyle = p.color; c.fillRect(x, y - 2, 2, 3); c.fillStyle = '#ffffff'; c.fillRect(x - 1, y - 18, 4, 3);
        return;
      }
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
