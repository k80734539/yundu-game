import type { Game } from '../core/Game';
import { isoX, isoY } from './iso';
import { makeCanvas } from './pixel';

/**
 * 氛圍渲染（HD-2D 風格的 2D 版）：只用在城鎮與野外（地城有自己的黑暗遮罩）。
 * 1. 時間色調：一天 24 小時（預設現實 1 分鐘＝遊戲 1 小時），清晨偏粉、白天偏暖、黃昏偏橘、夜晚偏藍。
 * 2. 光照遮罩：1/4 解析度的光照圖，環境光＋路燈／火焰／窗戶／主角身邊的光，用「乘法」蓋到畫面上。
 * 3. 光暈：光源周圍加一圈「疊加」的柔光（假的泛光）。
 * 4. 光束：白天從左上斜射下來的幾道光。
 * 5. 移軸模糊：畫面上下緣模糊，做出微縮模型感（iOS 不支援 ctx.filter，所以用縮小再放大）。
 * 6. 環境粒子：落葉／花瓣、白天的浮塵、夜晚的螢火蟲。
 * 設定存在 localStorage 'rom.atmos'；網址 ?hour=18 可固定時間（測試用）。
 */
export interface AtmosCfg { on: boolean; tilt: boolean; time: 'flow' | 'day' }
interface Mote { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number; life: number; kind: 'leaf' | 'dust' | 'fly'; col: string; ph: number }
const KEYS: [number, number[], number[], number][] = [ // 時、環境光 RGB、光束／色調 RGB、光束強度
  [0, [62, 72, 128], [120, 140, 220], 0], [4.5, [66, 74, 130], [140, 140, 220], 0], [6, [210, 170, 190], [255, 170, 150], 0.5],
  [8, [250, 236, 220], [255, 230, 190], 0.9], [12, [255, 252, 246], [255, 246, 220], 1], [16, [255, 240, 218], [255, 220, 170], 0.95],
  [18, [255, 178, 128], [255, 150, 90], 0.85], [19.5, [168, 128, 160], [240, 120, 120], 0.25], [21, [70, 80, 136], [120, 140, 220], 0], [24, [62, 72, 128], [120, 140, 220], 0],
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class Atmos {
  cfg: AtmosCfg = { on: true, tilt: true, time: 'flow' };
  private lightCv: HTMLCanvasElement | null = null;
  private blurA: HTMLCanvasElement | null = null; private blurB: HTMLCanvasElement | null = null;
  private motes: Mote[] = [];
  private fixedHour: number | null = null;
  constructor(private g: Game) {
    try { const s = JSON.parse(localStorage.getItem('rom.atmos') || 'null'); if (s) Object.assign(this.cfg, s); } catch { /* */ }
    const h = new URLSearchParams(location.search).get('hour'); if (h !== null && h !== '') this.fixedHour = +h;
  }
  set(k: keyof AtmosCfg, v: never) { (this.cfg as unknown as Record<string, unknown>)[k] = v; try { localStorage.setItem('rom.atmos', JSON.stringify(this.cfg)); } catch { /* */ } }
  /** 現在幾點（0~24） */
  hour(): number {
    if (this.fixedHour !== null) return this.fixedHour;
    if (this.cfg.time === 'day') return 13;
    return ((Date.now() / 60000) + 10) % 24; // 現實 1 分鐘＝遊戲 1 小時
  }
  /** 夜晚程度 0~1（給其他系統用，例如之後讓怪物在夜晚變強） */
  night(h = this.hour()) { return Math.max(0, Math.min(1, h < 12 ? (6 - h) / 1.5 : (h - 19) / 1.5)); }
  active() { const d = this.g.map.def; return this.cfg.on && d.type !== 'dungeon' && !d.dark; }
  private sample(h: number) {
    let i = 0; while (i < KEYS.length - 2 && h > KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = (h - a[0]) / (b[0] - a[0]);
    return { amb: a[1].map((v, k) => lerp(v, b[1][k], t)), tint: a[2].map((v, k) => lerp(v, b[2][k], t)), beam: lerp(a[3], b[3], t) };
  }
  /** 世界畫完、頭上文字畫之前呼叫 */
  draw(c: CanvasRenderingContext2D, L: number, T: number, W: number, H: number, dt: number) {
    if (!this.active()) return;
    const g = this.g, h = this.hour(), s = this.sample(h), night = this.night(h), town = g.map.def.type === 'town';
    // 野外夜晚不要太暗（怪物和預警圈要看得清楚）
    const floor = town ? 0 : 0.22, amb = s.amb.map((v) => v + (255 - v) * floor * night);
    this.updateMotes(dt, night, L, T, W, H);
    this.drawMotes(c, L, T, false);
    if (s.beam > 0.05) this.drawBeams(c, W, H, s.beam, s.tint);
    // ---- 光照遮罩（乘法）----
    const q = 4, w = Math.ceil(W / q), hh = Math.ceil(H / q);
    if (!this.lightCv || this.lightCv.width !== w || this.lightCv.height !== hh) this.lightCv = makeCanvas(w, hh);
    const d = this.lightCv.getContext('2d')!;
    d.globalCompositeOperation = 'source-over'; d.fillStyle = `rgb(${amb[0] | 0},${amb[1] | 0},${amb[2] | 0})`; d.fillRect(0, 0, w, hh);
    const lights = this.lightList(L, T, W, H, night);
    if (lights.length) {
      d.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const gr = d.createRadialGradient(l.x / q, l.y / q, 0, l.x / q, l.y / q, l.r / q);
        gr.addColorStop(0, `rgba(${l.c},${0.9 * l.a})`); gr.addColorStop(0.45, `rgba(${l.c},${0.45 * l.a})`); gr.addColorStop(1, `rgba(${l.c},0)`);
        d.fillStyle = gr; d.fillRect((l.x - l.r) / q, (l.y - l.r) / q, (l.r * 2) / q, (l.r * 2) / q);
      }
    }
    c.save(); c.imageSmoothingEnabled = true;
    c.globalCompositeOperation = 'multiply'; c.drawImage(this.lightCv, 0, 0, w * q, hh * q);
    // ---- 光暈（疊加）----
    if (night > 0.05) {
      c.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        if (!l.glow) continue;
        const r = l.r * 0.42, gr = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
        gr.addColorStop(0, `rgba(${l.c},${0.35 * night * l.a})`); gr.addColorStop(1, `rgba(${l.c},0)`);
        c.fillStyle = gr; c.fillRect(l.x - r, l.y - r, r * 2, r * 2);
      }
    }
    c.restore();
    this.drawMotes(c, L, T, true); // 螢火蟲在光照之後畫，才會亮
    if (this.cfg.tilt && !g.r.low) this.tiltShift(c, W, H);
    // 暗角
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(10,6,20,${0.22 + night * 0.18})`); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  }
  private lightList(L: number, T: number, W: number, H: number, night: number) {
    const g = this.g, out: { x: number; y: number; r: number; c: string; a: number; glow: boolean }[] = [];
    const on = (x: number, y: number, r: number) => x > -r && y > -r && x < W + r && y < H + r;
    const fl = 1 + Math.sin(g.time * 9) * 0.05 + Math.sin(g.time * 23) * 0.03;
    if (night > 0.02) {
      for (const p of g.props) {
        const x = p.fx - L, y = p.fy - T, ty = p.p.type;
        if (ty === 'lamp') { if (on(x, y - 80, 260)) out.push({ x, y: y - 76, r: 140 * fl, c: '255,190,110', a: night * 0.85, glow: true }); }
        else if (p.def.anim === 'flame') { if (on(x, y - 50, 240)) out.push({ x, y: y - 50, r: 140 * fl, c: '255,150,70', a: night * 0.9, glow: true }); }
        else if (p.def.anim === 'crystal') { if (on(x, y, 150)) out.push({ x, y: y - 20, r: 130, c: '140,200,255', a: night, glow: true }); }
        else if (p.def.origin && ['house', 'house2', 'shop', 'inn', 'smith', 'church'].includes(ty)) { // 窗戶透出的暖光
          if (on(x, y, 200)) out.push({ x: x + (p.p.w - p.p.h) * 16, y: y - 26, r: 80, c: '255,190,110', a: night * 0.7, glow: true });
        } else if (ty === 'fountain') { if (on(x, y, 200)) out.push({ x, y: y - 30, r: 110, c: '150,200,255', a: night * 0.5, glow: true }); }
      }
      for (const po of g.map.def.portals) { const x = isoX(po.x + 0.5, po.y + 0.5) - L, y = isoY(po.x + 0.5, po.y + 0.5) - T; if (on(x, y, 200)) out.push({ x, y: y - 20, r: 120, c: '140,190,255', a: night * 0.8, glow: true }); }
      const p = g.player, a = g.alpha; // 主角身邊一圈光（提燈的感覺），夜晚才看得到周圍
      out.push({ x: isoX(p.ix(a), p.iy(a)) - L, y: isoY(p.ix(a), p.iy(a)) - T - 40, r: 150, c: '255,230,190', a: night * 0.5, glow: false });
    }
    for (const pr of g.projectiles as { x: number; y: number; color?: string }[]) { const x = isoX(pr.x, pr.y) - L, y = isoY(pr.x, pr.y) - T - 40; if (on(x, y, 120)) out.push({ x, y, r: 110, c: '255,220,160', a: 0.4 + night * 0.6, glow: night > 0.1 }); }
    return out;
  }
  private drawBeams(c: CanvasRenderingContext2D, W: number, H: number, k: number, tint: number[]) {
    const t = this.g.time, col = `${tint[0] | 0},${tint[1] | 0},${tint[2] | 0}`;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const x0 = ((i * 0.27 + t * 0.006 * (1 + i * 0.3)) % 1.3 - 0.15) * W, wdt = W * (0.05 + (i % 2) * 0.04), a = (0.07 + 0.03 * Math.sin(t * 0.5 + i * 2)) * k;
      const gr = c.createLinearGradient(x0, 0, x0 + H * 0.6, H); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = gr; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + wdt, 0); c.lineTo(x0 + wdt + H * 0.6, H); c.lineTo(x0 + H * 0.6, H); c.closePath(); c.fill();
    }
    c.restore();
  }
  /** 上下緣模糊：先縮到 1/4、再縮到 1/8 放回來（等於模糊），用漸層遮罩只留上下兩條，再放大蓋回去 */
  private tiltShift(c: CanvasRenderingContext2D, W: number, H: number) {
    const src = this.g.r.canvas, w = Math.ceil(W / 4), h = Math.ceil(H / 4), w2 = Math.ceil(w / 2), h2 = Math.ceil(h / 2);
    if (!this.blurA || this.blurA.width !== w || this.blurA.height !== h) { this.blurA = makeCanvas(w, h); this.blurB = makeCanvas(w2, h2); }
    const a = this.blurA.getContext('2d')!, b = this.blurB!.getContext('2d')!;
    a.imageSmoothingEnabled = b.imageSmoothingEnabled = true;
    a.globalCompositeOperation = 'source-over'; a.clearRect(0, 0, w, h); a.drawImage(src, 0, 0, src.width, src.height, 0, 0, w, h);
    b.clearRect(0, 0, w2, h2); b.drawImage(this.blurA, 0, 0, w2, h2); a.clearRect(0, 0, w, h); a.drawImage(this.blurB!, 0, 0, w, h);
    const m = a.createLinearGradient(0, 0, 0, h); m.addColorStop(0, 'rgba(0,0,0,0.95)'); m.addColorStop(0.24, 'rgba(0,0,0,0)'); m.addColorStop(0.72, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,0.95)');
    a.globalCompositeOperation = 'destination-in'; a.fillStyle = m; a.fillRect(0, 0, w, h);
    c.save(); c.imageSmoothingEnabled = true; c.drawImage(this.blurA, 0, 0, w * 4, h * 4); c.restore();
  }
  private updateMotes(dt: number, night: number, L: number, T: number, W: number, H: number) {
    const g = this.g, town = g.map.def.type === 'town', p = g.player;
    const want = night > 0.5 ? 26 : 34;
    for (const m of this.motes) {
      m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
      if (m.kind === 'leaf') { m.x += Math.sin(g.time * 1.7 + m.ph) * dt * 0.5; if (m.z < 0) m.t = m.life; }
      if (m.kind === 'fly') { m.x += Math.sin(g.time * 0.8 + m.ph) * dt * 0.4; m.y += Math.cos(g.time * 0.6 + m.ph) * dt * 0.4; m.z = 20 + Math.sin(g.time * 1.3 + m.ph) * 14; }
    }
    this.motes = this.motes.filter((m) => m.t < m.life && Math.abs(m.x - p.x) < 22 && Math.abs(m.y - p.y) < 22);
    while (this.motes.length < want) {
      const kind: Mote['kind'] = night > 0.5 ? (Math.random() < 0.8 ? 'fly' : 'leaf') : Math.random() < 0.55 ? 'leaf' : 'dust';
      const x = p.x + (Math.random() - 0.5) * 30, y = p.y + (Math.random() - 0.5) * 30;
      const leafCol = town ? (Math.random() < 0.5 ? '#ffc8d8' : '#ffe0ea') : (Math.random() < 0.5 ? '#9ad060' : '#d8c050');
      this.motes.push({ x, y, z: kind === 'leaf' ? 120 + Math.random() * 120 : 10 + Math.random() * 60, vx: kind === 'leaf' ? 0.6 + Math.random() * 0.5 : (Math.random() - 0.5) * 0.2, vy: kind === 'leaf' ? -0.2 + Math.random() * 0.4 : (Math.random() - 0.5) * 0.2, vz: kind === 'leaf' ? -(18 + Math.random() * 16) : (Math.random() - 0.5) * 4, t: 0, life: kind === 'fly' ? 6 + Math.random() * 6 : 8 + Math.random() * 6, kind, col: kind === 'leaf' ? leafCol : kind === 'fly' ? '#fff2a0' : '#fff8e0', ph: Math.random() * 6 });
    }
    void L; void T; void W; void H;
  }
  private drawMotes(c: CanvasRenderingContext2D, L: number, T: number, glowPass: boolean) {
    const t = this.g.time;
    for (const m of this.motes) {
      if ((m.kind === 'fly') !== glowPass) continue;
      const x = Math.round(isoX(m.x, m.y) - L), y = Math.round(isoY(m.x, m.y) - T - m.z), fade = Math.min(1, m.t, (m.life - m.t));
      if (m.kind === 'leaf') { c.globalAlpha = 0.9 * fade; c.fillStyle = m.col; const s = Math.sin(t * 5 + m.ph) > 0 ? 3 : 2; c.fillRect(x, y, s, 2); }
      else if (m.kind === 'dust') { c.globalAlpha = 0.45 * fade * (0.5 + 0.5 * Math.sin(t * 2 + m.ph)); c.fillStyle = m.col; c.fillRect(x, y, 1, 1); }
      else { const k = fade * (0.5 + 0.5 * Math.sin(t * 3 + m.ph)); c.globalAlpha = 0.25 * k; c.fillStyle = m.col; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill(); c.globalAlpha = k; c.fillRect(x - 1, y - 1, 2, 2); }
    }
    c.globalAlpha = 1;
  }
}
