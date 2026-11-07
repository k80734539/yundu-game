import { GameMap } from '../systems/MapLoader';
import { terrainColor, PRIO, T } from './textures';
import { HW, HH } from './iso';
import { vnoise } from '../core/math';
import { makeCanvas } from './pixel';

const CW = 256, CH = 256;
/** 地板：等角像素空間切成 256×256 的 chunk，逐像素生成後快取；只畫可見的 chunk */
export class Ground {
  private cache = new Map<number, HTMLCanvasElement>();
  private seed: number;
  minX: number; maxX: number; minY: number; maxY: number;
  dark: boolean;
  generatedThisFrame = 0;
  constructor(private m: GameMap) {
    this.seed = m.def.seed;
    const pad = 6;
    this.minX = (-m.h - pad) * HW; this.maxX = (m.w + pad) * HW;
    this.minY = -pad * HH * 2; this.maxY = (m.w + m.h + pad * 2) * HH;
    this.dark = m.def.type === 'dungeon';
  }
  private key(cx: number, cy: number) { return (cx + 512) * 4096 + (cy + 512); }
  private gen(cx: number, cy: number): HTMLCanvasElement {
    const cv = makeCanvas(CW, CH);
    const c = cv.getContext('2d')!;
    const img = c.createImageData(CW, CH);
    const d = img.data;
    const m = this.m, s = this.seed;
    const x0 = cx * CW, y0 = cy * CH;
    for (let j = 0; j < CH; j++) {
      const py = y0 + j;
      for (let i = 0; i < CW; i++) {
        const px = x0 + i;
        const a = (px + 0.5) / HW, b = (py + 0.5) / HH;
        const x = (a + b) / 2, y = (b - a) / 2;
        // 座標擾動 → 地形交界呈自然的不規則曲線
        const nx = vnoise(x * 1.15, y * 1.15, s + 101) - 0.5, ny = vnoise(x * 1.15 + 9.3, y * 1.15, s + 202) - 0.5;
        const wx = x + nx * 0.75, wy = y + ny * 0.75;
        const t = m.t(wx, wy);
        const vx = Math.min(m.w - 1, Math.max(0, Math.floor(x))), vy = Math.min(m.h - 1, Math.max(0, Math.floor(y)));
        const col = terrainColor(t, px, py, x, y, m.variant[vy * m.w + vx]);
        let r = col[0], g = col[1], bl = col[2];
        // 邊緣：較高的地形在交界投下 2~3px 陰影；較高地形邊緣亮線
        const t2 = m.t(wx - 0.1, wy - 0.1);
        if (t2 !== t) {
          if (PRIO[t2] > PRIO[t]) { r *= 0.72; g *= 0.74; bl *= 0.8; }
          else if (t === T.water) { r = 200; g = 230; bl = 245; }
        } else {
          const t3 = m.t(wx + 0.07, wy + 0.07);
          if (t3 !== t && PRIO[t] > PRIO[t3]) { r = r * 1.12 + 10; g = g * 1.12 + 10; bl = bl * 1.1 + 8; }
        }
        // 地圖外漸暗
        const out = Math.max(-x, -y, x - m.w, y - m.h);
        if (out > -0.5) { const f = Math.max(0, 1 - (out + 0.5) / 4); r *= f; g *= f; bl *= f; }
        if (this.dark && t === T.wall) { r *= 0.5; g *= 0.5; bl *= 0.55; }
        const k = (j * CW + i) * 4;
        d[k] = r; d[k + 1] = g; d[k + 2] = bl; d[k + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    return cv;
  }
  /** 每幀最多生成 maxGen 個新 chunk（避免卡頓）；force 時全部生成 */
  draw(ctx: CanvasRenderingContext2D, left: number, top: number, vw: number, vh: number, maxGen = 3) {
    this.generatedThisFrame = 0;
    const cx0 = Math.floor(left / CW), cx1 = Math.floor((left + vw) / CW);
    const cy0 = Math.floor(top / CH), cy1 = Math.floor((top + vh) / CH);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const px = cx * CW, py = cy * CH;
      if (px + CW < this.minX || px > this.maxX || py + CH < this.minY || py > this.maxY) continue;
      const k = this.key(cx, cy);
      let cv = this.cache.get(k);
      if (!cv) {
        if (this.generatedThisFrame >= maxGen) continue;
        cv = this.gen(cx, cy); this.cache.set(k, cv); this.generatedThisFrame++;
        // LRU：超過上限時丟掉最久沒用的 chunk（Map 依插入順序）
        if (this.cache.size > 96) { const first = this.cache.keys().next().value!; this.cache.delete(first); }
      } else { this.cache.delete(k); this.cache.set(k, cv); }
      ctx.drawImage(cv, px - left, py - top);
    }
  }
  /** 預先生成某區域 */
  warm(left: number, top: number, vw: number, vh: number) {
    const cx0 = Math.floor(left / CW), cx1 = Math.floor((left + vw) / CW);
    const cy0 = Math.floor(top / CH), cy1 = Math.floor((top + vh) / CH);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const k = this.key(cx, cy);
      if (!this.cache.has(k)) this.cache.set(k, this.gen(cx, cy));
    }
  }
  get chunkCount() { return this.cache.size; }
}
