/** 像素工具 */
export type RGB = [number, number, number];
export function hex(h: string): RGB {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function css(c: RGB, a = 1) { return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
export function shade(c: RGB, f: number): RGB {
  // f>0 變亮（往白），f<0 變暗；暗部偏冷、亮部偏暖，像素畫常見做法
  if (f >= 0) return [c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f * 0.95, c[2] + (255 - c[2]) * f * 0.85];
  const k = 1 + f;
  return [c[0] * k * 0.96, c[1] * k * 0.98, c[2] * k + 12 * -f];
}
export function mix(a: RGB, b: RGB, t: number): RGB { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
export const shadeHex = (h: string, f: number) => css(shade(hex(h), f));

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
export function ctx2d(c: HTMLCanvasElement) { const x = c.getContext('2d', { willReadFrequently: true })!; x.imageSmoothingEnabled = false; return x; }

/** alpha 二值化（去掉反鋸齒的半透明邊）＋ 1px 深色外框 */
export function crispOutline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, outline: RGB = [28, 20, 30], thr = 110) {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3];
    if (a >= thr) {
      solid[i] = 1;
      if (a < 255) { const k = 255 / a; d[i * 4] = Math.min(255, d[i * 4] * k); d[i * 4 + 1] = Math.min(255, d[i * 4 + 1] * k); d[i * 4 + 2] = Math.min(255, d[i * 4 + 2] * k); }
      d[i * 4 + 3] = 255;
    } else d[i * 4 + 3] = 0;
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i;
    if (solid[k]) continue;
    if ((i > 0 && solid[k - 1]) || (i < w - 1 && solid[k + 1]) || (j > 0 && solid[k - w]) || (j < h - 1 && solid[k + w])) {
      d[k * 4] = outline[0]; d[k * 4 + 1] = outline[1]; d[k * 4 + 2] = outline[2]; d[k * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, x, y);
}

/** 只做 alpha 二值化 */
export function crisp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, thr = 110) {
  const img = ctx.getImageData(x, y, w, h); const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= thr ? 255 : 0;
  ctx.putImageData(img, x, y);
}

/** 像素橢圓（不反鋸齒） */
export function pxEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const hw = Math.round(rx * Math.sqrt(t));
    ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1);
  }
}

/** 接地陰影圖（快取） */
const shadowCache = new Map<string, HTMLCanvasElement>();
export function shadowSprite(rx: number, ry: number): HTMLCanvasElement {
  const key = rx + 'x' + ry;
  let c = shadowCache.get(key);
  if (c) return c;
  c = makeCanvas(rx * 2 + 2, ry * 2 + 2);
  const x = ctx2d(c);
  x.fillStyle = 'rgba(10,8,20,0.18)'; pxEllipse(x, rx + 1, ry + 1, rx, ry);
  x.fillStyle = 'rgba(10,8,20,0.16)'; pxEllipse(x, rx + 1, ry + 1, rx * 0.72, ry * 0.7);
  shadowCache.set(key, c);
  return c;
}
