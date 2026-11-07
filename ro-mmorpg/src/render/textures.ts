import { hash2, vnoise, fbm } from '../core/math';
/** 地形種類（maps.json 用字串名稱） */
export const T = { grass: 0, dirt: 1, road: 2, sand: 3, water: 4, floor: 5, cave: 6, mud: 7, wall: 8, deepgrass: 9, snow: 10 } as const;
export type TerrainName = keyof typeof T;
export const TERRAIN_NAMES = Object.keys(T) as TerrainName[];
/** 交界時誰蓋在誰上面 */
export const PRIO = [6, 3, 4, 2, 0, 4, 3, 1, 9, 7, 5];
export const WALKABLE = [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1];
/** 小地圖顏色 */
export const MINI = ['#5f9a3e', '#9b7a4a', '#b8ab92', '#e3d39a', '#3b78b8', '#8a8f9c', '#6a5a48', '#55603a', '#2a2430', '#4a8a34', '#e8eef4'];

type Pal = number[][];
const P = (...h: string[]): Pal => h.map((s) => { const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
const PAL: Pal[] = [
  P('3f7a2c', '4f8f34', '62a23e', '78b64a', '96c95c'),          // grass
  P('6e5134', '83633f', '9a7a4e', 'b0915f', 'c4a874'),          // dirt
  P('6f6a64', '8a847a', 'a29b8e', 'b9b2a3', 'd1cab9'),          // road cobble
  P('c9b27a', 'd8c28a', 'e4d29d', 'efe0b0', 'f8eecb'),          // sand
  P('22558e', '2a66a3', '3479b8', '4b92cc', '8cc4ea'),          // water
  P('4c4f5a', '5d616d', '6f7480', '838896', '9ea3b0'),          // floor
  P('3a3029', '4a3d33', '5b4c3f', '6c5c4c', '7f6e5c'),          // cave
  P('343b25', '414a2d', '505a35', '616b40', '7b7a52'),          // mud
  P('1c1820', '241f29', '2c2633', '35303d', '403a48'),          // wall
  P('2f6a26', '3b7c2c', '4a8f33', '5ca33e', '74b84c'),          // deepgrass
  P('a9b6c6', 'c2cdd9', 'd6dfe8', 'e7edf3', 'f7fbff'),          // snow
];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const out = [0, 0, 0];
function set(c: number[], k = 0) { out[0] = c[0] + k; out[1] = c[1] + k; out[2] = c[2] + k; return out; }
/** 依連續明度值 v∈[0,1) 取色，帶 4x4 有序抖色 */
function tone(pal: Pal, v: number, px: number, py: number) {
  const n = pal.length - 1;
  let f = Math.max(0, Math.min(0.999, v)) * n;
  const i = Math.floor(f); f -= i;
  const th = BAYER[(py & 3) * 4 + (px & 3)];
  return pal[Math.min(n, i + (f > th ? 1 : 0))];
}

/** 回傳像素顏色（共用陣列 out），px/py 為等角像素，x/y 為世界格座標，variant 0..3 */
export function terrainColor(t: number, px: number, py: number, x: number, y: number, variant: number): number[] {
  const pal = PAL[t] || PAL[0];
  const lx = x - Math.floor(x), ly = y - Math.floor(y);
  const tx = Math.floor(x), ty = Math.floor(y);
  const low = fbm(x * 0.35, y * 0.35, 7, 2); // 大範圍明暗
  switch (t) {
    case 0: case 9: { // 草地
      let v = 0.25 + low * 0.45 + (vnoise(px * 0.5, py * 0.9, 3) - 0.5) * 0.25;
      const h = hash2(px >> 1, py, 11);
      if (h > (variant === 2 ? 0.88 : 0.93)) v += 0.35; else if (h < 0.05) v -= 0.3;
      // 草葉：亮點下方一格暗點
      if (hash2(px >> 1, py - 1, 11) > 0.93) v -= 0.25;
      if (variant === 1) { // 小花
        for (let k = 0; k < 3; k++) {
          const fx = 0.15 + hash2(tx, ty, 40 + k) * 0.7, fy = 0.15 + hash2(tx, ty, 50 + k) * 0.7;
          const dx = (lx - fx) * 64, dy = (ly - fy) * 64;
          const d = Math.abs(dx - dy) * 0.5 + Math.abs(dx + dy) * 0.25;
          if (d < 1.6) { const cs = [[250, 246, 230], [250, 214, 90], [240, 140, 170], [170, 160, 245]][Math.floor(hash2(tx, ty, 60 + k) * 4)]; return set(d < 0.6 ? [255, 236, 120] : cs); }
        }
      }
      if (variant === 3 && hash2(px >> 2, py >> 1, 21) > 0.97) return set(pal[4]);
      return set(tone(pal, v, px, py));
    }
    case 1: case 6: { // 泥土／洞窟地
      let v = 0.3 + low * 0.35 + (vnoise(px * 0.3, py * 0.6, 5) - 0.5) * 0.3;
      const cx = px >> 2, cy = py >> 1;
      const h = hash2(cx, cy, 13 + variant);
      if (h > (variant === 1 ? 0.9 : 0.955)) { // 小石子：左上亮、右下暗
        const sx = px & 3, sy = py & 1;
        v = sx < 2 && sy === 0 ? 0.95 : 0.15;
      }
      if (variant === 2) v += (vnoise(px * 0.08, py * 0.16, 9) - 0.5) * 0.4;
      if (variant === 3 && Math.abs(Math.sin((x - y) * 5 + vnoise(x, y, 4) * 3)) < 0.06) v -= 0.3;
      return set(tone(pal, v, px, py));
    }
    case 2: { // 石板路：每格切成 2×2 石塊，交錯排列
      const size = variant === 3 ? 1 : 0.5;
      let u = x / size, w = y / size;
      const row = Math.floor(w);
      if (row & 1) u += 0.5;
      const su = u - Math.floor(u), sw = w - Math.floor(w);
      const sid = hash2(Math.floor(u), row, 77);
      const m = 0.08 / size * 0.5;
      if (su < m || sw < m) return set(pal[0], -12);              // 石縫
      let v = 0.35 + sid * 0.35 + (vnoise(px * 0.4, py * 0.8, 6) - 0.5) * 0.15;
      if (su < m + 0.12 || sw < m + 0.12) v += 0.25;               // 左上亮邊
      if (su > 0.88 || sw > 0.88) v -= 0.22;                       // 右下暗邊
      if (variant === 1 && Math.abs(su - sw * 0.7 - 0.2) < 0.03 && sid > 0.5) v = 0.05; // 裂痕
      if (variant === 2 && vnoise(x * 3, y * 3, 31) > 0.62) { const g = tone(PAL[0], 0.3 + sid * 0.3, px, py); return set(g); } // 青苔
      return set(tone(pal, v, px, py));
    }
    case 3: { // 沙地：風紋
      let v = 0.35 + low * 0.3;
      const rip = Math.sin((x * 2.2 + y * 1.1) * 3 + vnoise(x * 0.8, y * 0.8, 2) * 4);
      if (rip > 0.86) v += 0.25; else if (rip < -0.9) v -= 0.18;
      if (hash2(px, py, 17) > 0.985) v += 0.4;
      if (variant === 1 && hash2(px >> 2, py >> 1, 19) > 0.985) return set([238, 180, 160]); // 貝殼
      if (variant === 2) v -= 0.08;
      return set(tone(pal, v, px, py));
    }
    case 4: { // 水
      let v = 0.3 + low * 0.25 + (vnoise(px * 0.05, py * 0.2, 8) - 0.5) * 0.3;
      const hl = hash2(px >> 3, py, 23 + variant);
      if (hl > 0.94) v += 0.45;
      return set(tone(pal, v, px, py));
    }
    case 5: { // 地城石板：每格一塊大石板
      const sid = hash2(tx, ty, 91);
      let v = 0.3 + sid * 0.3 + (vnoise(px * 0.3, py * 0.6, 4) - 0.5) * 0.2;
      if (lx < 0.04 || ly < 0.04) return set(pal[0], -10);
      if (lx < 0.12 || ly < 0.12) v += 0.22;
      if (lx > 0.9 || ly > 0.9) v -= 0.2;
      if (variant === 1 && Math.abs(lx - ly * 0.5 - 0.3) < 0.025) v = 0.0;
      if (variant === 2 && vnoise(x * 4, y * 4, 3) > 0.7) v -= 0.25;
      if (variant === 3 && hash2(px >> 1, py, 5) > 0.97) v += 0.4;
      return set(tone(pal, v, px, py));
    }
    case 7: { // 沼澤泥
      const n = fbm(x * 0.9, y * 0.9, 12, 2);
      if (n > 0.64) { // 水窪
        const wv = n > 0.7 ? 0.4 : 0.2;
        return set(tone(P('2c3a3a', '35484a', '3f5a5a', '6a8a86'), wv + (hash2(px >> 2, py, 3) > 0.93 ? 0.5 : 0), px, py));
      }
      let v = 0.3 + low * 0.4 + (vnoise(px * 0.4, py * 0.8, 6) - 0.5) * 0.25;
      if (hash2(px >> 1, py, 33) > 0.95) v += 0.35;
      return set(tone(pal, v, px, py));
    }
    case 10: {
      let v = 0.45 + low * 0.35 + (vnoise(px * 0.2, py * 0.4, 2) - 0.5) * 0.2;
      if (hash2(px, py, 7) > 0.99) v = 0.99;
      return set(tone(pal, v, px, py));
    }
    default: {
      const v = 0.3 + (vnoise(px * 0.2, py * 0.4, 1) - 0.5) * 0.3;
      return set(tone(pal, v, px, py));
    }
  }
}
