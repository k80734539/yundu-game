import { Pool } from '../core/Pool';
import { textImage } from './Font';
import { isoX, isoY } from './iso';

export type DmgKind = 'deal' | 'take' | 'crit' | 'miss' | 'heal' | 'sp' | 'skill';
export class DmgText { alive = false; x = 0; y = 0; t = 0; img: HTMLCanvasElement | null = null; vx = 0; kind: DmgKind = 'deal'; big = false; }
export class Particle {
  alive = false; x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; g = 0; life = 0; max = 1; color = '#fff'; size = 2; kind: 'dot' | 'ring' | 'spark' | 'glow' | 'text' | 'bolt' | 'arrow' | 'slash' | 'star' | 'flame' | 'pillar' | 'anger' | 'wave' | 'circle' | 'shard' | 'ice' | 'bubble' | 'meteor' | 'beam' | 'reticle' | 'trap' | 'stuck' = 'dot'; r = 0;
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
  /** 魔法陣：詠唱時腳下旋轉的圓陣（兩圈圓＋六芒星＋符文刻度） */
  magicCircle(wx: number, wy: number, color: string, life: number, r = 44) { const p = this.fxp(wx, wy, 0, 'circle', life); p.color = color; p.r = r; }
  /** 冰刺：一圈從地面竄出的冰晶（冰封大地） */
  iceSpikes(wx: number, wy: number, r: number, life = 0.9) { const p = this.fxp(wx, wy, 0, 'ice', life); p.r = r; p.a = Math.random() * 6.28; }
  /** 魔力屏障：罩住身體的半透明光罩 */
  bubble(wx: number, wy: number, color: string, life = 1.1) { const p = this.fxp(wx, wy, 44, 'bubble', life); p.color = color; }
  /** 碎冰：往外飛散的小三角形 */
  shards(wx: number, wy: number, z: number, color: string, n = 8) { this.burst(wx, wy, z, color, n, 110, 'shard', 0.5, 3); }
  /** 隕石：帶火尾的火球斜斜砸下來（命中時間＝life） */
  meteor(wx: number, wy: number, life = 0.32) { const p = this.fxp(wx, wy, 0, 'meteor', life); p.a = Math.random() * 6.28; }
  /** 閃電：從天上劈下的鋸齒線（color 可換成紫色等） */
  lightning(wx: number, wy: number, color = '#fff8a0') {
    const p = this.parts.get();
    p.x = isoX(wx, wy); p.y = isoY(wx, wy); p.z = 0; p.vx = p.vy = p.vz = 0; p.g = 0; p.life = p.max = 0.26; p.kind = 'bolt'; p.color = color; p.size = 3; p.r = Math.random() * 1000;
    this.burst(wx, wy, 0, color, 12, 130, 'spark', 0.4, 2);
    this.ring(wx, wy, color, 0.35, 40); this.star(wx, wy, 6, color, 26, 0.22);
  }
  /** 箭雨：一支斜斜射下來的箭（帶殘影），落地後插在地上一下子 */
  arrowRain(wx: number, wy: number, color = '#e8d8b0') {
    const p = this.parts.get();
    p.x = isoX(wx, wy) + 40; p.y = isoY(wx, wy); p.z = 240; p.vx = -150; p.vy = 0; p.vz = -900; p.g = 0; p.life = p.max = 0.266; p.kind = 'arrow'; p.color = color; p.size = 2; p.r = 0;
    const q = this.fxp(wx, wy, 0, 'stuck', 0.75); q.color = color; q.a = 0.266;
  }
  /** 狙擊的彈道：從 (x0,y0) 到 (x1,y1) 的一道光，很快變細消失 */
  beam(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: string, life = 0.28, w = 7) {
    const p = this.fxp(x0, y0, z0, 'beam', life); p.color = color; p.size = w; p.vx = 0; p.a = isoX(x1, y1); p.span = isoY(x1, y1) - z1;
  }
  /** 準星：往內縮的十字瞄準圈（獵魔印記、集中） */
  reticle(wx: number, wy: number, z: number, color: string, r = 40, life = 0.6) { const p = this.fxp(wx, wy, z, 'reticle', life); p.color = color; p.r = r; }
  /** 捕獸夾：兩排鋸齒從兩側合起來 */
  trapSnap(wx: number, wy: number, r: number, life = 0.7) { const p = this.fxp(wx, wy, 0, 'trap', life); p.r = r; }
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
      if (p.kind === 'bolt') { // 閃電：寬的光暈＋亮芯＋兩條分岔
        const pts: [number, number][] = [[x + Math.sin(p.r) * 20, y - 420]];
        for (let i = 1; i <= 8; i++) pts.push([Math.round(x + Math.sin(p.r + i * 2.3) * 16 * (1 - i / 8)), y - 420 + i * 52]);
        pts[8] = [x, y];
        const path = (q: [number, number][]) => { c.beginPath(); c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); c.stroke(); };
        c.lineJoin = 'miter'; c.lineCap = 'butt';
        c.globalAlpha = k * 0.45; c.strokeStyle = p.color; c.lineWidth = 9; path(pts);
        c.globalAlpha = Math.min(1, k * 1.8); c.strokeStyle = p.color; c.lineWidth = 4; path(pts);
        c.strokeStyle = '#ffffff'; c.lineWidth = 2; path(pts);
        c.strokeStyle = p.color; c.lineWidth = 2;
        for (const j of [3, 5]) { const b = pts[j], dir = Math.sin(p.r + j) > 0 ? 1 : -1; path([b, [b[0] + dir * 14, b[1] + 22], [b[0] + dir * 10, b[1] + 40], [b[0] + dir * 24, b[1] + 58]]); }
        c.globalAlpha = k * 0.6; c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(x, y, 34, 15, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'circle') {
        const t = 1 - k, al = Math.min(1, t / 0.12, k / 0.18), R = p.r * Math.min(1, 0.5 + t * 6), rot = t * p.max * 2.2;
        const E = (rr: number, lw: number) => { c.lineWidth = lw; c.beginPath(); c.ellipse(x, y, rr, rr * 0.5, 0, 0, Math.PI * 2); c.stroke(); };
        const V = (an: number, rr: number): [number, number] => [x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.5];
        c.globalAlpha = al * 0.22; c.fillStyle = p.color; c.beginPath(); c.ellipse(x, y, R, R * 0.5, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = al * 0.95; c.strokeStyle = p.color; E(R, 2.5); E(R * 0.74, 1.5);
        c.strokeStyle = '#ffffff'; E(R * 0.97, 1);
        c.strokeStyle = p.color; c.lineWidth = 1.5;
        for (const off of [0, Math.PI]) { c.beginPath(); for (let i = 0; i <= 3; i++) { const q = V(rot + off + (i * Math.PI * 2) / 3, R * 0.72); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); } c.stroke(); }
        c.strokeStyle = '#ffffff'; c.lineWidth = 2;
        for (let i = 0; i < 8; i++) { const an = -rot * 1.4 + (i * Math.PI) / 4, q0 = V(an, R * 0.8), q1 = V(an, R * 0.93); c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke(); }
        c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'shard') {
        const s2 = p.size * (0.6 + k), an = p.r + (1 - k) * 9 + p.vx * 0.05;
        c.globalAlpha = Math.min(1, k * 2); c.fillStyle = p.color;
        c.beginPath(); for (let i = 0; i < 3; i++) { const q = an + (i * Math.PI * 2) / 3; c.lineTo(x + Math.cos(q) * s2 * (i ? 1 : 2), y + Math.sin(q) * s2 * (i ? 1 : 2)); } c.closePath(); c.fill();
        c.fillStyle = '#ffffff'; c.fillRect(x - 1, y - 1, 2, 2); c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'ice') {
        const t = 1 - k, grow = 1 - (1 - Math.min(1, t / 0.16)) ** 3, al = Math.min(1, k / 0.3), n = 14;
        c.globalAlpha = al * 0.4; c.fillStyle = '#c8f0ff'; c.beginPath(); c.ellipse(x, y, p.r, p.r * 0.5, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = al * 0.9; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, p.r, p.r * 0.5, 0, 0, Math.PI * 2); c.stroke();
        const spike = (bx: number, by: number, h: number, w: number, lean: number) => {
          c.globalAlpha = al;
          c.fillStyle = '#3a78c0'; c.beginPath(); c.moveTo(bx - w - 1, by + 1); c.lineTo(bx + lean, by - h - 2); c.lineTo(bx + w + 1, by + 1); c.closePath(); c.fill();
          c.fillStyle = '#a8dcff'; c.beginPath(); c.moveTo(bx - w, by); c.lineTo(bx + lean, by - h); c.lineTo(bx + w, by); c.closePath(); c.fill();
          c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(bx - w, by); c.lineTo(bx + lean, by - h); c.lineTo(bx - w * 0.2, by); c.closePath(); c.fill();
        };
        for (const pass of [0, 1]) for (let i = 0; i < n + 5; i++) {
          const inner = i >= n, an = p.a + (i / (inner ? 5 : n)) * Math.PI * 2, rr = p.r * (inner ? 0.45 : 0.92), sn = Math.sin(an); if ((pass === 0) !== (sn < 0)) continue;
          spike(x + Math.cos(an) * rr, y + sn * rr * 0.5, (16 + ((i * 7) % 5) * 5 + (inner ? 10 : 0)) * grow, 5 + (i % 3), Math.cos(an) * 5);
        }
        c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'bubble') {
        const t = 1 - k, al = Math.min(1, t / 0.15, k / 0.4), pul = 1 + Math.sin(t * 20) * 0.03 + Math.max(0, 0.25 - t) * 0.8;
        const rx = 36 * pul, ry = 50 * pul;
        c.globalAlpha = al * 0.22; c.fillStyle = p.color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = al * 0.9; c.strokeStyle = p.color; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, rx - 3, ry - 3, 0, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
        c.globalAlpha = al * 0.5; c.strokeStyle = p.color; c.lineWidth = 1;
        for (let i = -1; i <= 1; i++) { c.beginPath(); c.ellipse(x, y, rx * (0.35 + Math.abs(i) * 0.4), ry, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(x, y + i * ry * 0.4, rx * Math.sqrt(1 - (i * 0.4) ** 2), ry * 0.12, 0, 0, Math.PI * 2); c.stroke(); }
        c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'meteor') { // 火球從右上斜斜砸下，後面拖著火尾
        const t = 1 - k, hx2 = x + (1 - t) * 90, hy2 = y - (1 - t) * 330, dx = -90 / 342, dy = 330 / 342, nx = -dy, ny = dx;
        for (const [len, w, col] of [[70, 13, '#c82a0c'], [52, 9, '#ff8a20'], [30, 5, '#fff0a0']] as [number, number, string][]) {
          const wob = Math.sin(p.a + t * 40 + len) * 2;
          c.fillStyle = col; c.beginPath(); c.moveTo(hx2 + nx * w, hy2 + ny * w); c.lineTo(hx2 - dx * len + nx * wob, hy2 - dy * len + ny * wob); c.lineTo(hx2 - nx * w, hy2 - ny * w); c.closePath(); c.fill();
          c.beginPath(); c.arc(hx2, hy2, w, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = '#5a2a1a'; c.beginPath(); c.arc(hx2 + dx * 2, hy2 + dy * 2, 5, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 0.25 + t * 0.4; c.fillStyle = '#1a0a0a'; c.beginPath(); c.ellipse(x, y, 10 + t * 18, 5 + t * 9, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;   // 落點的影子
        return;
      }
      if (p.kind === 'arrow') { // 箭雨的箭：斜斜落下，後面拖一道殘影
        const dx = -150 / 912, dy = 900 / 912;
        c.globalAlpha = 0.35; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - dx * 46, y - dy * 46); c.lineTo(x, y); c.stroke(); c.globalAlpha = 1;
        c.strokeStyle = '#2a1a10'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - dx * 20, y - dy * 20); c.lineTo(x, y); c.stroke();
        c.strokeStyle = p.color; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - dx * 20, y - dy * 20); c.lineTo(x, y); c.stroke();
        c.fillStyle = '#e8eef8'; c.fillRect(x - 1, y - 2, 3, 4); c.fillStyle = '#e84a3a'; c.fillRect(Math.round(x - dx * 20) - 1, Math.round(y - dy * 20) - 2, 3, 4);
        return;
      }
      if (p.kind === 'stuck') { // 落地後插在地上的箭（先等箭飛到）
        const t = p.max - p.life; if (t < p.a) return;
        const al = Math.min(1, p.life / 0.25), dx = 150 / 912 * 16, dy = 14;
        c.globalAlpha = al; c.strokeStyle = '#2a1a10'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y - dy); c.stroke();
        c.strokeStyle = p.color; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y - dy); c.stroke();
        c.fillStyle = '#e84a3a'; c.fillRect(Math.round(x + dx) - 1, Math.round(y - dy) - 2, 3, 4);
        if (t - p.a < 0.1) { c.globalAlpha = (1 - (t - p.a) / 0.1) * 0.7; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 4 + (t - p.a) * 120, 2 + (t - p.a) * 60, 0, 0, Math.PI * 2); c.stroke(); }
        c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'beam') {
        const x1 = Math.round(p.a - L), y1 = Math.round(p.span - Tp);
        c.lineCap = 'round';
        c.globalAlpha = k * 0.4; c.strokeStyle = p.color; c.lineWidth = p.size * 2.2 * k + 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.stroke();
        c.globalAlpha = Math.min(1, k * 1.6); c.lineWidth = p.size * k + 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, p.size * 0.4 * k); c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.stroke();
        c.globalAlpha = 1; c.lineCap = 'butt';
        return;
      }
      if (p.kind === 'reticle') {
        const t = 1 - k, rr = p.r * (1.9 - 0.9 * (1 - (1 - Math.min(1, t / 0.45)) ** 2)), al = Math.min(1, t / 0.1, k / 0.3), rot = (1 - Math.min(1, t / 0.45)) * 1.2;
        c.globalAlpha = al; c.strokeStyle = p.color; c.lineWidth = 2;
        c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.stroke();
        c.lineWidth = 1; c.beginPath(); c.arc(x, y, rr * 0.55, 0, Math.PI * 2); c.stroke();
        c.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) { const an = rot + (i * Math.PI) / 2; c.beginPath(); c.moveTo(x + Math.cos(an) * rr * 0.7, y + Math.sin(an) * rr * 0.7); c.lineTo(x + Math.cos(an) * rr * 1.25, y + Math.sin(an) * rr * 1.25); c.stroke(); }
        c.fillStyle = '#ffffff'; c.fillRect(x - 1, y - 1, 3, 3); c.globalAlpha = 1;
        return;
      }
      if (p.kind === 'trap') {
        const t = 1 - k, close = 1 - (1 - Math.min(1, t / 0.14)) ** 2, al = Math.min(1, k / 0.3), R = p.r;
        c.globalAlpha = al * 0.5; c.fillStyle = '#3a2a1a'; c.beginPath(); c.ellipse(x, y, R, R * 0.5, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = al;
        for (const sgn of [-1, 1]) { // 兩排鋸齒：從攤平到豎起來合上
          const lift = close * R * 0.9, n = 6;
          c.fillStyle = '#5a6068'; c.beginPath(); c.moveTo(x - R, y);
          for (let i = 0; i <= n; i++) { const u = i / n, bx = x - R + u * R * 2, by = y + sgn * Math.sqrt(Math.max(0, 1 - (u * 2 - 1) ** 2)) * R * 0.5 * (1 - close); c.lineTo(bx, by - (i % 2 ? lift : lift * 0.55) * Math.sin(u * Math.PI)); }
          c.lineTo(x + R, y); c.closePath(); c.fill();
          c.strokeStyle = '#e8eef8'; c.lineWidth = 1.5; c.stroke();
        }
        c.globalAlpha = 1;
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
