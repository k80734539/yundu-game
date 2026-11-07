import type { GameMap, PropInst } from '../systems/MapLoader';
import { PROPS, propSprite, Sprite, PropDef } from './PropArt';
import { isoX, isoY, HW, HH } from './iso';
import { shadowSprite } from './pixel';

const STRIP = 16;
export interface PropR {
  p: PropInst; def: PropDef; spr: Sprite;
  dx: number; dy: number;          // 精靈左上角（等角像素）
  depth: number;
  strips: { sx: number; key: number }[] | null;
  alpha: number; fade: boolean;
  fx: number; fy: number;          // 腳底（等角像素）
}
/** 把地圖物件轉成可繪製資料（建築切成直條） */
export function buildPropRenders(m: GameMap): PropR[] {
  const out: PropR[] = [];
  for (const p of m.props) {
    const def = PROPS[p.type]; if (!def) continue;
    const spr = propSprite(p.type, p.v);
    let ox: number, oy: number;
    if (def.origin) { ox = isoX(p.x, p.y); oy = isoY(p.x, p.y); }
    else { ox = isoX(p.x + p.w / 2, p.y + p.h / 2); oy = isoY(p.x + p.w / 2, p.y + p.h / 2); }
    const r: PropR = { p, def, spr, dx: ox - spr.ax, dy: oy - spr.ay, depth: p.x + p.w / 2 + p.y + p.h / 2 - 0.01, strips: null, alpha: 1, fade: false, fx: ox, fy: oy };
    if (p.w > 1 || p.h > 1) {
      r.strips = [];
      const bx = p.x, by = p.y, w = p.w, h = p.h;
      const sMinS = bx - by - h, sMaxS = bx + w - by - h, sMinE = bx + w - by - h, sMaxE = bx + w - by;
      for (let sx = 0; sx < spr.c.width; sx += STRIP) {
        const X0 = r.dx + sx, X1 = X0 + STRIP;
        const s0 = X0 / HW, s1 = X1 / HW;
        let key = Infinity;
        if (s1 >= sMinS && s0 <= sMaxS) key = Math.min(key, Math.max(s0, sMinS) + 2 * (by + h));
        if (s1 >= sMinE && s0 <= sMaxE) key = Math.min(key, 2 * (bx + w) - Math.min(s1, sMaxE));
        if (key === Infinity) key = s1 < sMinS ? bx + by + h : bx + w + by;
        r.strips.push({ sx, key: key - 0.02 });
      }
    }
    out.push(r);
  }
  return out;
}

export interface Drawable { depth: number; kind: number; ref: any; aux: number }
/** 共用的排序清單（避免每幀配置） */
export class DrawList {
  items: Drawable[] = []; n = 0;
  reset() { this.n = 0; }
  add(depth: number, kind: number, ref: any, aux = 0) {
    let d = this.items[this.n];
    if (!d) { d = { depth: 0, kind: 0, ref: null, aux: 0 }; this.items[this.n] = d; }
    d.depth = depth; d.kind = kind; d.ref = ref; d.aux = aux; this.n++;
  }
  sort() {
    // 插入排序對「幾乎已排序」的資料很快；元素多時用內建排序
    const a = this.items, n = this.n;
    if (n > 600) { const sub = a.slice(0, n).sort((p, q) => p.depth - q.depth); for (let i = 0; i < n; i++) a[i] = sub[i]; return; }
    for (let i = 1; i < n; i++) { const v = a[i]; let j = i - 1; while (j >= 0 && a[j].depth > v.depth) { a[j + 1] = a[j]; j--; } a[j + 1] = v; }
  }
}

export function drawPropShadow(c: CanvasRenderingContext2D, r: PropR, L: number, T: number) {
  if (!r.def.shadow) return;
  const s = shadowSprite(r.def.shadow[0], r.def.shadow[1]);
  c.drawImage(s, Math.round(r.fx - L - s.width / 2), Math.round(r.fy - T - s.height / 2));
}
export function drawProp(c: CanvasRenderingContext2D, r: PropR, L: number, T: number, strip = -1) {
  if (r.alpha < 1) c.globalAlpha = r.alpha;
  if (strip >= 0 && r.strips) {
    const st = r.strips[strip];
    const w = Math.min(STRIP, r.spr.c.width - st.sx);
    c.drawImage(r.spr.c, st.sx, 0, w, r.spr.c.height, Math.round(r.dx - L) + st.sx, Math.round(r.dy - T), w, r.spr.c.height);
  } else c.drawImage(r.spr.c, Math.round(r.dx - L), Math.round(r.dy - T));
  if (r.alpha < 1) c.globalAlpha = 1;
}
export const ISO_HH = HH;
