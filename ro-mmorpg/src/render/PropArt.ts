import { RGB, hex, css, shade, makeCanvas, ctx2d, crispOutline, pxEllipse } from './pixel';
import { mulberry32 } from '../core/math';
import { HW, HH } from './iso';

export interface Sprite { c: HTMLCanvasElement; ax: number; ay: number }
export interface PropDef {
  w: number; h: number;          // 佔地（格）
  block: boolean;                // 是否擋路
  tall: boolean;                 // 角色在後方時淡出
  shadow?: [number, number];     // 接地陰影半徑（像素）
  anim?: 'flame' | 'water' | 'portal' | 'crystal';
  origin?: boolean;              // 錨點是佔地原點（建築）而非中心
  make: (v: number) => Sprite;
}

// ---------- 小工具 ----------
function blob(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: RGB, light = 0.22) {
  c.fillStyle = css(shade(col, -0.32)); pxEllipse(c, cx, cy, rx, ry);
  c.fillStyle = css(col); pxEllipse(c, cx - rx * 0.12, cy - ry * 0.13, rx * 0.85, ry * 0.85);
  c.fillStyle = css(shade(col, light)); pxEllipse(c, cx - rx * 0.36, cy - ry * 0.4, rx * 0.4, ry * 0.34);
}
function speckle(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: RGB, n: number, r: () => number) {
  c.fillStyle = css(col);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    c.fillRect(Math.round(cx + Math.cos(a) * rx * d), Math.round(cy + Math.sin(a) * ry * d), 2, 1);
  }
}
function poly(c: CanvasRenderingContext2D, pts: number[][], fill: string) {
  c.fillStyle = fill; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fill();
}
function canvasFor(w: number, h: number) { const cv = makeCanvas(w, h); return { cv, c: ctx2d(cv) }; }
function finish(cv: HTMLCanvasElement, ax: number, ay: number, outline = true): Sprite {
  if (outline) crispOutline(ctx2d(cv), 0, 0, cv.width, cv.height);
  return { c: cv, ax, ay };
}

// ---------- 樹木 ----------
function tree(v: number): Sprite {
  const { cv, c } = canvasFor(112, 150);
  const r = mulberry32(100 + v);
  const ax = 56, ay = 142;
  const leaf: RGB = [hex('#3f8a35'), hex('#4a9a3c'), hex('#5f9a2e'), hex('#3d7f3f')][v % 4];
  // 樹幹（左亮右暗）
  c.fillStyle = css(hex('#5a3d24')); c.fillRect(ax - 7, ay - 50, 14, 50);
  c.fillStyle = css(hex('#7a5533')); c.fillRect(ax - 7, ay - 50, 6, 50);
  c.fillStyle = css(hex('#4a3020')); c.fillRect(ax + 4, ay - 50, 3, 50);
  c.fillStyle = css(hex('#5a3d24')); c.fillRect(ax - 11, ay - 6, 22, 6); // 樹根
  c.fillStyle = css(hex('#7a5533')); c.fillRect(ax - 11, ay - 6, 7, 3);
  // 樹冠：數個橢圓團塊
  const blobs = [[0, -88, 40, 30], [-24, -72, 26, 22], [24, -70, 27, 22], [-10, -104, 28, 22], [14, -100, 24, 20], [0, -66, 30, 18]];
  for (const b of blobs) blob(c, ax + b[0], ay + b[1], b[2], b[3], leaf);
  speckle(c, ax - 6, ay - 92, 34, 28, shade(leaf, 0.35), 40, r);
  speckle(c, ax + 8, ay - 76, 34, 24, shade(leaf, -0.4), 40, r);
  if (v === 2) { c.fillStyle = '#e04a3a'; for (let i = 0; i < 8; i++) { const x = ax - 26 + r() * 52, y = ay - 106 + r() * 46; c.fillRect(x | 0, y | 0, 3, 3); c.fillStyle = '#ff9a80'; c.fillRect(x | 0, y | 0, 1, 1); c.fillStyle = '#e04a3a'; } }
  return finish(cv, ax, ay);
}
function pine(v: number): Sprite {
  const { cv, c } = canvasFor(96, 160);
  const ax = 48, ay = 152;
  const col: RGB = v % 2 ? hex('#2f6e45') : hex('#2d6338');
  c.fillStyle = '#5a3d24'; c.fillRect(ax - 5, ay - 26, 10, 26); c.fillStyle = '#7a5533'; c.fillRect(ax - 5, ay - 26, 4, 26);
  for (let i = 0; i < 4; i++) {
    const y0 = ay - 22 - i * 28, hw = 40 - i * 8, top = y0 - 44;
    poly(c, [[ax, top], [ax + hw, y0], [ax - hw, y0]], css(shade(col, -0.3)));
    poly(c, [[ax, top], [ax + hw * 0.25, y0 - 4], [ax - hw, y0]], css(col));
    poly(c, [[ax - 2, top + 6], [ax - hw * 0.25, y0 - 8], [ax - hw * 0.8, y0 - 2]], css(shade(col, 0.2)));
  }
  if (v === 4) { c.fillStyle = '#f4f8ff'; for (let i = 0; i < 4; i++) { const y0 = ay - 22 - i * 28; c.fillRect(ax - 30 + i * 8, y0 - 3, 40 - i * 10, 3); } }
  return finish(cv, ax, ay);
}
function palm(v: number): Sprite {
  const { cv, c } = canvasFor(120, 150);
  const ax = 60, ay = 144;
  const r = mulberry32(300 + v);
  for (let i = 0; i < 14; i++) { // 彎曲樹幹
    const t = i / 13, x = ax + Math.sin(t * 1.6) * 16 * (v % 2 ? 1 : -1), y = ay - t * 92;
    c.fillStyle = css(hex(i % 2 ? '#8a6a40' : '#a07c4c')); c.fillRect(Math.round(x - 5), Math.round(y - 7), 10, 8);
    c.fillStyle = '#c09a64'; c.fillRect(Math.round(x - 5), Math.round(y - 7), 3, 8);
  }
  const tx = ax + Math.sin(1.6) * 16 * (v % 2 ? 1 : -1), ty = ay - 94;
  const leaf = hex('#3f9a3a');
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI + (k / 6) * Math.PI + (r() - 0.5) * 0.3;
    for (let s = 0; s < 18; s++) {
      const d = s * 2.6, x = tx + Math.cos(a) * d, y = ty + Math.sin(a) * d * 0.6 + (s * s) * 0.08;
      c.fillStyle = css(shade(leaf, a < -Math.PI / 2 ? 0.15 : -0.15)); c.fillRect(Math.round(x - 3), Math.round(y - 2), 6, 3);
    }
  }
  c.fillStyle = '#6a4a2a'; pxEllipse(c, tx, ty + 4, 6, 4);
  return finish(cv, ax, ay);
}
function deadtree(v: number): Sprite {
  const { cv, c } = canvasFor(100, 130);
  const ax = 50, ay = 124;
  const col = hex(v % 2 ? '#5a5048' : '#4a4038');
  const branch = (x: number, y: number, a: number, len: number, w: number) => {
    for (let i = 0; i < len; i += 2) {
      const px = x + Math.cos(a) * i, py = y + Math.sin(a) * i;
      c.fillStyle = css(col); c.fillRect(Math.round(px - w / 2), Math.round(py), Math.max(2, Math.round(w)), 3);
      c.fillStyle = css(shade(col, 0.25)); c.fillRect(Math.round(px - w / 2), Math.round(py), 1, 3);
    }
  };
  branch(ax, ay, -Math.PI / 2, 80, 12);
  branch(ax, ay - 50, -Math.PI / 2 - 0.8, 34, 6); branch(ax, ay - 60, -Math.PI / 2 + 0.7, 30, 6);
  branch(ax - 18, ay - 72, -Math.PI / 2 - 0.3, 18, 3); branch(ax + 20, ay - 80, -Math.PI / 2 + 0.2, 16, 3);
  return finish(cv, ax, ay);
}
function bush(v: number): Sprite {
  const { cv, c } = canvasFor(64, 48);
  const ax = 32, ay = 42, col = [hex('#4a9a3c'), hex('#3d8a3a'), hex('#5aa040'), hex('#4a8a3a')][v];
  blob(c, ax - 10, ay - 12, 14, 11, col); blob(c, ax + 10, ay - 12, 14, 11, col); blob(c, ax, ay - 20, 16, 12, col);
  if (v === 1) { c.fillStyle = '#e85a7a'; c.fillRect(ax - 8, ay - 24, 3, 3); c.fillRect(ax + 6, ay - 18, 3, 3); c.fillRect(ax - 2, ay - 14, 3, 3); }
  if (v === 2) { c.fillStyle = '#5a6ae8'; c.fillRect(ax - 10, ay - 20, 3, 3); c.fillRect(ax + 8, ay - 22, 3, 3); }
  return finish(cv, ax, ay);
}
function rock(v: number): Sprite {
  const big = v >= 2;
  const { cv, c } = canvasFor(big ? 72 : 44, big ? 60 : 34);
  const ax = big ? 36 : 22, ay = big ? 54 : 30;
  const col = hex(v % 2 ? '#8a8a8e' : '#9a9184');
  if (big) { blob(c, ax - 8, ay - 18, 22, 17, col, 0.3); blob(c, ax + 12, ay - 12, 16, 12, shade(col, -0.05), 0.3); }
  else blob(c, ax, ay - 9, 14, 9, col, 0.3);
  c.fillStyle = css(shade(col, -0.45)); c.fillRect(ax - 2, ay - (big ? 22 : 10), 1, big ? 8 : 4);
  return finish(cv, ax, ay);
}
function flowers(v: number): Sprite {
  const { cv, c } = canvasFor(40, 24);
  const r = mulberry32(500 + v), cols = ['#f4e46a', '#f48aa0', '#ffffff', '#b09af0'];
  for (let i = 0; i < 7; i++) {
    const x = 6 + r() * 28 | 0, y = 8 + r() * 12 | 0;
    c.fillStyle = '#3d7f2f'; c.fillRect(x, y, 1, 4);
    c.fillStyle = cols[(v + i) % 4]; c.fillRect(x - 1, y - 1, 3, 1); c.fillRect(x, y - 2, 1, 3);
  }
  return finish(cv, 20, 20, false);
}
function tuft(v: number): Sprite {
  const { cv, c } = canvasFor(32, 22);
  const col = hex(['#5aa040', '#4a8f34', '#76b04a', '#8a9a3a'][v]);
  for (let i = 0; i < 6; i++) {
    const x = 8 + i * 3, h = 6 + ((i * 7 + v) % 5) * 2;
    c.fillStyle = css(shade(col, i % 2 ? -0.2 : 0.15)); c.fillRect(x, 20 - h, 2, h);
  }
  return finish(cv, 16, 19);
}
function reeds(v: number): Sprite {
  const { cv, c } = canvasFor(40, 48);
  for (let i = 0; i < 7; i++) {
    const x = 6 + i * 4 + (v % 2), h = 24 + ((i * 5 + v) % 4) * 5;
    c.fillStyle = i % 2 ? '#6a8a3a' : '#89a24a'; c.fillRect(x, 44 - h, 2, h);
    if (i % 3 === 0) { c.fillStyle = '#7a5a34'; c.fillRect(x - 1, 44 - h - 6, 4, 8); }
  }
  return finish(cv, 20, 44);
}
function mushroom(v: number): Sprite {
  const { cv, c } = canvasFor(40, 40);
  const cap = hex(['#d04a3a', '#c08a3a', '#8a5ac0', '#4ab0a0'][v]);
  c.fillStyle = '#e8dcc0'; c.fillRect(17, 22, 6, 14); c.fillStyle = '#fff6e0'; c.fillRect(17, 22, 2, 14);
  blob(c, 20, 20, 13, 8, cap, 0.3);
  c.fillStyle = '#fff'; c.fillRect(13, 16, 3, 2); c.fillRect(22, 14, 3, 2); c.fillRect(25, 19, 2, 2);
  return finish(cv, 20, 36);
}
function crystal(v: number): Sprite {
  const { cv, c } = canvasFor(48, 64);
  const col = hex(['#6ad0f0', '#c070f0', '#70f0a0', '#f0a050'][v]);
  const sh = (x: number, h: number, w: number) => {
    poly(c, [[x, 58 - h], [x + w, 58 - h * 0.7], [x + w, 58], [x - w, 58], [x - w, 58 - h * 0.7]], css(shade(col, -0.25)));
    poly(c, [[x, 58 - h], [x, 58], [x - w, 58], [x - w, 58 - h * 0.7]], css(shade(col, 0.2)));
    c.fillStyle = '#ffffff'; c.fillRect(x - w + 2, 58 - h * 0.6, 1, h * 0.3);
  };
  sh(16, 30, 6); sh(32, 24, 5); sh(24, 46, 8);
  return finish(cv, 24, 58);
}
function stump(v: number): Sprite {
  const { cv, c } = canvasFor(40, 32);
  c.fillStyle = '#5a3d24'; c.fillRect(10, 12, 20, 14); c.fillStyle = '#7a5533'; c.fillRect(10, 12, 7, 14);
  c.fillStyle = '#c8a070'; pxEllipse(c, 20, 12, 10, 4); c.fillStyle = '#a07a4a'; pxEllipse(c, 20, 12, 5, 2);
  return finish(cv, 20, 26);
}
function log(v: number): Sprite {
  const { cv, c } = canvasFor(64, 32);
  for (let i = 0; i < 36; i++) { const x = 12 + i, y = 20 - i * 0.3; c.fillStyle = '#6a4a2a'; c.fillRect(x, y | 0, 1, 9); c.fillStyle = '#8a6a40'; c.fillRect(x, y | 0, 1, 3); }
  c.fillStyle = '#c8a070'; pxEllipse(c, 48, 13, 4, 5);
  return finish(cv, 32, 26);
}

// ---------- 城鎮物件 ----------
function lamp(v: number): Sprite {
  const { cv, c } = canvasFor(32, 96);
  c.fillStyle = '#2c2a34'; c.fillRect(14, 22, 4, 70); c.fillStyle = '#4c4a58'; c.fillRect(14, 22, 1, 70);
  c.fillStyle = '#2c2a34'; c.fillRect(10, 88, 12, 4);
  c.fillStyle = '#3a3846'; c.fillRect(9, 8, 14, 16); c.fillStyle = '#ffe9a0'; c.fillRect(11, 10, 10, 12); c.fillStyle = '#fff8d8'; c.fillRect(11, 10, 4, 5);
  c.fillStyle = '#2c2a34'; poly(c, [[8, 8], [16, 2], [24, 8]], '#2c2a34');
  return finish(cv, 16, 92);
}
function well(v: number): Sprite {
  const { cv, c } = canvasFor(80, 96);
  const ax = 40, ay = 84;
  c.fillStyle = '#7a7470'; pxEllipse(c, ax, ay - 12, 28, 14); c.fillStyle = '#9a948c'; pxEllipse(c, ax - 2, ay - 14, 26, 12);
  c.fillStyle = '#25466a'; pxEllipse(c, ax, ay - 16, 18, 8); c.fillStyle = '#3a6a9a'; pxEllipse(c, ax - 3, ay - 17, 8, 3);
  c.fillStyle = '#5a3d24'; c.fillRect(ax - 26, ay - 64, 5, 48); c.fillRect(ax + 21, ay - 64, 5, 48);
  c.fillStyle = '#7a5533'; c.fillRect(ax - 26, ay - 64, 2, 48);
  poly(c, [[ax - 34, ay - 60], [ax, ay - 82], [ax + 34, ay - 60], [ax, ay - 50]], '#a04a3a');
  poly(c, [[ax - 34, ay - 60], [ax, ay - 82], [ax, ay - 50]], '#c0604a');
  c.fillStyle = '#4a3a2a'; c.fillRect(ax - 1, ay - 58, 2, 20); c.fillStyle = '#6a5a4a'; c.fillRect(ax - 4, ay - 40, 8, 6);
  return finish(cv, ax, ay);
}
function fountain(v: number): Sprite {
  const { cv, c } = canvasFor(160, 120);
  const ax = 80, ay = 104;
  c.fillStyle = '#7f7a74'; pxEllipse(c, ax, ay - 22, 70, 34); c.fillStyle = '#a8a198'; pxEllipse(c, ax - 2, ay - 26, 68, 31);
  c.fillStyle = '#2f6aa0'; pxEllipse(c, ax, ay - 28, 58, 25); c.fillStyle = '#4a8ac0'; pxEllipse(c, ax - 8, ay - 32, 36, 14);
  c.fillStyle = '#8f8a84'; c.fillRect(ax - 8, ay - 76, 16, 48); c.fillStyle = '#b8b0a6'; c.fillRect(ax - 8, ay - 76, 6, 48);
  c.fillStyle = '#a8a198'; pxEllipse(c, ax, ay - 76, 22, 8); c.fillStyle = '#4a8ac0'; pxEllipse(c, ax, ay - 78, 16, 5);
  c.fillStyle = '#c0d8f0'; c.fillRect(ax - 2, ay - 96, 4, 18);
  return finish(cv, ax, ay);
}
function fence(v: number): Sprite {
  const { cv, c } = canvasFor(72, 48);
  // v0：沿 x 軸（往右下），v1：沿 y 軸（往左下）
  const dx = v % 2 ? -32 : 32;
  for (let i = 0; i < 3; i++) {
    const x = 36 - dx / 2 + (dx / 2) * i, y = 36 - 8 + 8 * i;
    c.fillStyle = '#6a4a2a'; c.fillRect(Math.round(x - 2), Math.round(y - 22), 5, 24); c.fillStyle = '#9a7448'; c.fillRect(Math.round(x - 2), Math.round(y - 22), 2, 24);
  }
  for (let k = 0; k < 2; k++) for (let i = 0; i <= 32; i++) {
    const x = 36 - dx / 2 + (dx / 32) * i, y = 28 + i / 2 - 16 + k * 9;
    c.fillStyle = k ? '#7a5533' : '#a07a4a'; c.fillRect(Math.round(x), Math.round(y), 1, 4);
  }
  return finish(cv, 36, 38);
}
function crate(v: number): Sprite {
  const { cv, c } = canvasFor(48, 52);
  const ax = 24, ay = 46;
  const top = [[ax, ay - 40], [ax + 16, ay - 32], [ax, ay - 24], [ax - 16, ay - 32]];
  poly(c, [[ax - 16, ay - 32], [ax, ay - 24], [ax, ay], [ax - 16, ay - 8]], '#b08048');
  poly(c, [[ax + 16, ay - 32], [ax, ay - 24], [ax, ay], [ax + 16, ay - 8]], '#7a5530');
  poly(c, top, '#c89a5c');
  c.fillStyle = '#5a3d24'; c.fillRect(ax - 9, ay - 26, 2, 22); c.fillRect(ax + 8, ay - 26, 2, 22);
  if (v === 1) { c.fillStyle = '#e8c070'; c.fillRect(ax - 4, ay - 36, 8, 3); }
  return finish(cv, ax, ay);
}
function barrel(v: number): Sprite {
  const { cv, c } = canvasFor(40, 52);
  const ax = 20, ay = 46;
  c.fillStyle = '#6a4626'; pxEllipse(c, ax, ay - 6, 12, 5); c.fillRect(ax - 12, ay - 34, 24, 28);
  c.fillStyle = '#946a3c'; c.fillRect(ax - 12, ay - 34, 9, 28);
  c.fillStyle = '#3a3a40'; c.fillRect(ax - 12, ay - 30, 24, 3); c.fillRect(ax - 12, ay - 14, 24, 3);
  c.fillStyle = '#a07a4a'; pxEllipse(c, ax, ay - 34, 12, 5); c.fillStyle = '#7a5530'; pxEllipse(c, ax, ay - 34, 8, 3);
  return finish(cv, ax, ay);
}
function sign(v: number): Sprite {
  const { cv, c } = canvasFor(48, 64);
  c.fillStyle = '#5a3d24'; c.fillRect(22, 20, 4, 40); c.fillStyle = '#7a5533'; c.fillRect(22, 20, 1, 40);
  c.fillStyle = '#9a7448'; c.fillRect(6, 12, 36, 16); c.fillStyle = '#c0965c'; c.fillRect(6, 12, 36, 4);
  c.fillStyle = '#4a3020'; c.fillRect(12, 19, 20, 2); c.fillRect(12, 23, 14, 2);
  return finish(cv, 24, 60);
}
function torch(v: number): Sprite {
  const { cv, c } = canvasFor(24, 64);
  c.fillStyle = '#3a3036'; c.fillRect(10, 20, 4, 40); c.fillStyle = '#5a5058'; c.fillRect(10, 20, 1, 40);
  c.fillStyle = '#4a3a2a'; c.fillRect(7, 16, 10, 6);
  return finish(cv, 12, 60);
}
function pillar(v: number): Sprite {
  const { cv, c } = canvasFor(48, 112);
  const ax = 24, ay = 104;
  const col = hex(v % 2 ? '#8a8680' : '#7a7680');
  c.fillStyle = css(shade(col, -0.3)); c.fillRect(ax - 14, ay - 92, 28, 92);
  c.fillStyle = css(col); c.fillRect(ax - 14, ay - 92, 18, 92);
  c.fillStyle = css(shade(col, 0.25)); c.fillRect(ax - 14, ay - 92, 5, 92);
  c.fillStyle = css(shade(col, 0.1)); c.fillRect(ax - 18, ay - 100, 36, 10); c.fillRect(ax - 18, ay - 8, 36, 8);
  if (v >= 2) { c.fillStyle = '#3c6a34'; c.fillRect(ax - 14, ay - 40, 6, 20); c.fillRect(ax + 4, ay - 60, 5, 12); }
  return finish(cv, ax, ay);
}
function statue(v: number): Sprite {
  const { cv, c } = canvasFor(64, 128);
  const ax = 32, ay = 120;
  const st = hex('#a8a29a');
  poly(c, [[ax - 22, ay - 20], [ax, ay - 30], [ax + 22, ay - 20], [ax + 22, ay - 6], [ax, ay + 4], [ax - 22, ay - 6]], css(shade(st, -0.2)));
  poly(c, [[ax - 22, ay - 20], [ax, ay - 30], [ax + 22, ay - 20], [ax, ay - 10]], css(shade(st, 0.15)));
  blob(c, ax, ay - 52, 12, 22, st, 0.3); blob(c, ax, ay - 84, 10, 10, st, 0.3);
  c.fillStyle = css(shade(st, -0.25)); c.fillRect(ax + 10, ay - 100, 3, 60); c.fillStyle = '#d8d0c0'; c.fillRect(ax + 8, ay - 104, 7, 6);
  return finish(cv, ax, ay);
}
function stall(v: number): Sprite {
  const { cv, c } = canvasFor(112, 104);
  const ax = 56, ay = 92;
  const cols = [['#d04a4a', '#f0e8d8'], ['#3a7ad0', '#f0e8d8'], ['#3aa060', '#f8f0c0'], ['#d0a03a', '#fff']][v];
  c.fillStyle = '#5a3d24'; c.fillRect(ax - 40, ay - 60, 4, 54); c.fillRect(ax + 36, ay - 60, 4, 54);
  poly(c, [[ax - 44, ay - 24], [ax, ay - 2], [ax + 44, ay - 24], [ax, ay - 46]], '#a07a4a');
  poly(c, [[ax - 44, ay - 24], [ax, ay - 2], [ax, ay + 6], [ax - 44, ay - 16]], '#7a5530');
  poly(c, [[ax + 44, ay - 24], [ax, ay - 2], [ax, ay + 6], [ax + 44, ay - 16]], '#5a3d24');
  for (let i = 0; i < 6; i++) { c.fillStyle = ['#e8c050', '#d06040', '#70b050'][i % 3]; c.fillRect(ax - 26 + i * 9, ay - 30 + (i % 2) * 6, 6, 5); }
  for (let i = 0; i < 8; i++) {
    const x0 = ax - 50 + i * 12.5;
    poly(c, [[x0, ay - 62 + i * 0], [x0 + 12.5, ay - 62], [x0 + 12.5, ay - 52], [x0, ay - 52]], cols[i % 2]);
  }
  poly(c, [[ax - 50, ay - 62], [ax + 50, ay - 62], [ax + 40, ay - 80], [ax - 40, ay - 80]], css(shade(hex(cols[0]), -0.15)));
  return finish(cv, ax, ay);
}
function tent(v: number): Sprite {
  const { cv, c } = canvasFor(128, 100);
  const ax = 64, ay = 88, col = hex(['#c8a878', '#a87858', '#8a9a70', '#b0b8c8'][v]);
  poly(c, [[ax - 56, ay - 14], [ax - 6, ay - 80], [ax + 6, ay + 4]], css(shade(col, 0.15)));
  poly(c, [[ax + 6, ay + 4], [ax - 6, ay - 80], [ax + 52, ay - 22]], css(shade(col, -0.25)));
  poly(c, [[ax - 20, ay - 6], [ax - 6, ay - 44], [ax + 6, ay + 2]], '#3a2a20');
  return finish(cv, ax, ay);
}
function rockwall(v: number): Sprite {
  // 地城牆：1 格的等角石塊，高 40
  const { cv, c } = canvasFor(68, 84);
  const ax = 34, ay = 66, Hh = 44;
  const col = hex(['#5a5248', '#524a44', '#5e564c', '#4c4640'][v]);
  const L = [ax - HW, ay - HH], R = [ax + HW, ay - HH], B = [ax, ay], Tp = [ax, ay - HH * 2];
  poly(c, [[L[0], L[1] - Hh], [B[0], B[1] - Hh], B, L], css(shade(col, 0.05)));
  poly(c, [[R[0], R[1] - Hh], [B[0], B[1] - Hh], B, R], css(shade(col, -0.3)));
  poly(c, [[L[0], L[1] - Hh], [Tp[0], Tp[1] - Hh], [R[0], R[1] - Hh], [B[0], B[1] - Hh]], css(shade(col, 0.22)));
  const r = mulberry32(900 + v);
  for (let i = 0; i < 14; i++) { // 石紋
    const side = r() < 0.5; const t = r(), h = 6 + r() * (Hh - 10);
    const x = side ? L[0] + (B[0] - L[0]) * t : B[0] + (R[0] - B[0]) * t;
    const y = (side ? L[1] + (B[1] - L[1]) * t : B[1] + (R[1] - B[1]) * t) - h;
    c.fillStyle = css(shade(col, side ? -0.25 : -0.5)); c.fillRect(x | 0, y | 0, 5, 1);
  }
  if (v === 2) { c.fillStyle = '#3c6a3a'; c.fillRect(ax - 20, ay - Hh - 6, 8, 3); c.fillRect(ax + 4, ay - Hh - 2, 6, 3); }
  return finish(cv, ax, ay);
}
function portal(v: number): Sprite {
  const { cv, c } = canvasFor(80, 48);
  const ax = 40, ay = 26;
  c.fillStyle = 'rgba(80,160,255,0.35)'; pxEllipse(c, ax, ay, 30, 15);
  c.fillStyle = 'rgba(140,210,255,0.55)'; pxEllipse(c, ax, ay, 22, 11);
  c.fillStyle = 'rgba(230,250,255,0.8)'; pxEllipse(c, ax, ay, 10, 5);
  return { c: cv, ax, ay };
}

// ---------- 建築 ----------
function building(fw: number, fh: number, v: number, kind: string): Sprite {
  const wallH = kind === 'church' ? 84 : 58, roofH = kind === 'church' ? 56 : 40, pad = 10, over = 0.18;
  const offX = fh * HW + pad + 12, offY = wallH + roofH + pad + (kind === 'church' ? 50 : 10);
  const W = (fw + fh) * HW + pad * 2 + 24, H = (fw + fh) * HH + offY + pad;
  const { cv, c } = canvasFor(W, H);
  const P = (x: number, y: number, z = 0) => [(x - y) * HW + offX, (x + y) * HH - z + offY];
  const pal = [
    { wall: '#e8dcc0', trim: '#8a5a34', roof: '#c0503a' },
    { wall: '#d8c8a8', trim: '#6a4a2a', roof: '#3a6ab0' },
    { wall: '#e0d0d0', trim: '#7a5040', roof: '#4a8a4a' },
    { wall: '#c8c0b0', trim: '#5a4a3a', roof: '#8a5ab0' },
  ][v % 4];
  if (kind === 'church') { pal.wall = '#e8e4dc'; pal.roof = '#4a5a8a'; }
  const wall = hex(pal.wall), roof = hex(pal.roof), trim = hex(pal.trim);
  // 南面牆（受光）
  poly(c, [P(0, fh, wallH), P(fw, fh, wallH), P(fw, fh), P(0, fh)], css(shade(wall, 0.02)));
  // 東面牆（背光）
  poly(c, [P(fw, fh, wallH), P(fw, 0, wallH), P(fw, 0), P(fw, fh)], css(shade(wall, -0.22)));
  // 木框
  c.fillStyle = css(trim);
  for (const x of [0, fw / 2, fw]) { const a = P(x, fh, wallH), b = P(x, fh); c.fillRect(Math.round(a[0]) - 1, Math.round(a[1]), 3, Math.round(b[1] - a[1])); }
  for (const y of [0, fh]) { const a = P(fw, y, wallH), b = P(fw, y); c.fillRect(Math.round(a[0]) - 1, Math.round(a[1]), 3, Math.round(b[1] - a[1])); }
  for (let i = 0; i <= 32; i++) { // 牆頂、牆腳橫樑
    for (const z of [wallH, 4]) {
      const a = P((fw * i) / 32, fh, z); c.fillRect(Math.round(a[0]), Math.round(a[1]) - 1, 2, 3);
      const b = P(fw, (fh * i) / 32, z); c.fillStyle = css(shade(trim, -0.3)); c.fillRect(Math.round(b[0]), Math.round(b[1]) - 1, 2, 3); c.fillStyle = css(trim);
    }
  }
  // 門（南面中央）
  const dx = fw / 2 - 0.35;
  poly(c, [P(dx, fh, 34), P(dx + 0.7, fh, 34), P(dx + 0.7, fh), P(dx, fh)], '#5a3a22');
  poly(c, [P(dx + 0.08, fh, 30), P(dx + 0.62, fh, 30), P(dx + 0.62, fh), P(dx + 0.08, fh)], '#7a5030');
  { const k = P(dx + 0.52, fh, 14); c.fillStyle = '#e8c050'; c.fillRect(Math.round(k[0]), Math.round(k[1]), 2, 2); }
  // 窗
  const win = (x0: number, y0: number, alongX: boolean, lit: boolean) => {
    const q = (t: number, z: number) => alongX ? P(x0 + t, y0, z) : P(x0, y0 - t, z);
    poly(c, [q(0, 44), q(0.5, 44), q(0.5, 22), q(0, 22)], css(trim));
    poly(c, [q(0.06, 41), q(0.44, 41), q(0.44, 25), q(0.06, 25)], lit ? '#9ad0f0' : '#6a90b0');
    poly(c, [q(0.06, 41), q(0.2, 41), q(0.2, 33), q(0.06, 33)], '#d8f0ff');
  };
  if (fw >= 3) { win(0.4, fh, true, true); win(fw - 0.9, fh, true, true); }
  win(fw, fh - 0.5, false, false); if (fh >= 3) win(fw, 1.0, false, false);
  // 屋頂：屋脊沿 x 軸，南坡受光，東側山牆
  const ry = fh / 2;
  const eS = fh + over, eN = -over, x0 = -over, x1 = fw + over;
  // 東山牆
  poly(c, [P(fw, fh, wallH), P(fw, ry, wallH + roofH), P(fw, 0, wallH)], css(shade(wall, -0.28)));
  // 南坡
  poly(c, [P(x0, eS, wallH - 6), P(x1, eS, wallH - 6), P(x1, ry, wallH + roofH), P(x0, ry, wallH + roofH)], css(roof));
  // 瓦片紋
  for (let k = 1; k < 6; k++) {
    const t = k / 6, yy = eS + (ry - eS) * t, zz = wallH - 6 + (roofH + 6) * t;
    for (let i = 0; i <= 40; i++) { const a = P(x0 + ((x1 - x0) * i) / 40, yy, zz); c.fillStyle = css(shade(roof, -0.22)); c.fillRect(Math.round(a[0]), Math.round(a[1]), 2, 1); }
  }
  for (let i = 0; i <= Math.round((x1 - x0) * 5); i++) {
    const a = P(x0 + i / 5, eS, wallH - 6), b = P(x0 + i / 5, ry, wallH + roofH);
    for (let s = 0; s < 1; s += 0.05) { const px = a[0] + (b[0] - a[0]) * s, py = a[1] + (b[1] - a[1]) * s; if (((s * 20) | 0) % 2 === 0) { c.fillStyle = css(shade(roof, -0.12)); c.fillRect(Math.round(px), Math.round(py), 1, 1); } }
  }
  // 屋脊亮線、屋簷暗線
  for (let i = 0; i <= 40; i++) {
    const a = P(x0 + ((x1 - x0) * i) / 40, ry, wallH + roofH); c.fillStyle = css(shade(roof, 0.35)); c.fillRect(Math.round(a[0]), Math.round(a[1]) - 1, 2, 2);
    const b = P(x0 + ((x1 - x0) * i) / 40, eS, wallH - 6); c.fillStyle = css(shade(roof, -0.4)); c.fillRect(Math.round(b[0]), Math.round(b[1]), 2, 2);
  }
  // 東側屋簷（山牆上的斜邊）
  for (let s = 0; s <= 1; s += 0.02) {
    const a = P(x1, eS + (ry - eS) * s, wallH - 6 + (roofH + 6) * s), b = P(x1, eN + (ry - eN) * s, wallH - 6 + (roofH + 6) * s);
    c.fillStyle = css(shade(roof, -0.3)); c.fillRect(Math.round(a[0]), Math.round(a[1]), 2, 3); c.fillRect(Math.round(b[0]), Math.round(b[1]), 2, 3);
  }
  // 煙囪 / 鐘樓
  if (kind === 'church') {
    const bx = fw * 0.5, by = ry;
    const bw = 0.5;
    poly(c, [P(bx - bw, by + bw, wallH + roofH - 10), P(bx + bw, by + bw, wallH + roofH - 10), P(bx + bw, by + bw, wallH + roofH + 40), P(bx - bw, by + bw, wallH + roofH + 40)], css(wall));
    poly(c, [P(bx + bw, by + bw, wallH + roofH - 10), P(bx + bw, by - bw, wallH + roofH - 10), P(bx + bw, by - bw, wallH + roofH + 40), P(bx + bw, by + bw, wallH + roofH + 40)], css(shade(wall, -0.25)));
    const top = P(bx, by, wallH + roofH + 80);
    poly(c, [P(bx - bw - 0.1, by + bw + 0.1, wallH + roofH + 40), P(bx + bw + 0.1, by + bw + 0.1, wallH + roofH + 40), top], css(roof));
    poly(c, [P(bx + bw + 0.1, by + bw + 0.1, wallH + roofH + 40), P(bx + bw + 0.1, by - bw - 0.1, wallH + roofH + 40), top], css(shade(roof, -0.3)));
    const bell = P(bx, by + bw, wallH + roofH + 22); c.fillStyle = '#e8c050'; c.fillRect(Math.round(bell[0]) - 4, Math.round(bell[1]) - 6, 8, 8);
  } else {
    const ch = P(fw * 0.75, ry - 0.3, wallH + roofH * 0.6);
    c.fillStyle = '#6a5a5a'; c.fillRect(Math.round(ch[0]) - 6, Math.round(ch[1]) - 26, 12, 26); c.fillStyle = '#8a7a7a'; c.fillRect(Math.round(ch[0]) - 6, Math.round(ch[1]) - 26, 5, 26);
    c.fillStyle = '#4a3a3a'; c.fillRect(Math.round(ch[0]) - 7, Math.round(ch[1]) - 28, 14, 3);
  }
  // 招牌
  if (kind === 'shop' || kind === 'inn' || kind === 'smith') {
    const s = P(fw / 2 + 0.55, fh, 44);
    c.fillStyle = '#5a3d24'; c.fillRect(Math.round(s[0]), Math.round(s[1]) - 2, 14, 2);
    c.fillStyle = kind === 'shop' ? '#e8c050' : kind === 'inn' ? '#e07060' : '#a0a8b8';
    c.fillRect(Math.round(s[0]) + 4, Math.round(s[1]), 12, 10);
    c.fillStyle = '#3a2a1a'; c.fillRect(Math.round(s[0]) + 7, Math.round(s[1]) + 3, 6, 4);
  }
  const ax = P(0, 0)[0], ay = P(0, 0)[1];
  return finish(cv, ax, ay);
}

// ---------- 登錄表 ----------
export const PROPS: Record<string, PropDef> = {
  tree: { w: 1, h: 1, block: true, tall: true, shadow: [26, 11], make: tree },
  pine: { w: 1, h: 1, block: true, tall: true, shadow: [22, 10], make: pine },
  palm: { w: 1, h: 1, block: true, tall: true, shadow: [24, 10], make: palm },
  deadtree: { w: 1, h: 1, block: true, tall: true, shadow: [16, 7], make: deadtree },
  bush: { w: 1, h: 1, block: true, tall: false, shadow: [22, 9], make: bush },
  rock: { w: 1, h: 1, block: true, tall: false, shadow: [20, 8], make: rock },
  flowers: { w: 1, h: 1, block: false, tall: false, make: flowers },
  tuft: { w: 1, h: 1, block: false, tall: false, make: tuft },
  reeds: { w: 1, h: 1, block: false, tall: false, make: reeds },
  mushroom: { w: 1, h: 1, block: false, tall: false, shadow: [10, 4], make: mushroom },
  crystal: { w: 1, h: 1, block: true, tall: false, shadow: [16, 7], anim: 'crystal', make: crystal },
  stump: { w: 1, h: 1, block: true, tall: false, shadow: [12, 5], make: stump },
  log: { w: 1, h: 1, block: true, tall: false, shadow: [22, 6], make: log },
  lamp: { w: 1, h: 1, block: true, tall: true, shadow: [8, 4], make: lamp },
  well: { w: 1, h: 1, block: true, tall: true, shadow: [30, 13], make: well },
  fountain: { w: 3, h: 3, block: true, tall: false, shadow: [72, 34], anim: 'water', make: fountain },
  fence: { w: 1, h: 1, block: true, tall: false, make: fence },
  crate: { w: 1, h: 1, block: true, tall: false, shadow: [16, 7], make: crate },
  barrel: { w: 1, h: 1, block: true, tall: false, shadow: [13, 6], make: barrel },
  sign: { w: 1, h: 1, block: true, tall: false, shadow: [10, 4], make: sign },
  torch: { w: 1, h: 1, block: true, tall: false, shadow: [6, 3], anim: 'flame', make: torch },
  pillar: { w: 1, h: 1, block: true, tall: true, shadow: [18, 8], make: pillar },
  statue: { w: 1, h: 1, block: true, tall: true, shadow: [22, 10], make: statue },
  stall: { w: 2, h: 2, block: true, tall: false, make: stall },
  tent: { w: 2, h: 2, block: true, tall: true, make: tent },
  rockwall: { w: 1, h: 1, block: true, tall: true, make: rockwall },
  portal: { w: 1, h: 1, block: false, tall: false, anim: 'portal', make: portal },
  house: { w: 4, h: 3, block: true, tall: true, origin: true, make: (v) => building(4, 3, v, 'house') },
  house2: { w: 3, h: 3, block: true, tall: true, origin: true, make: (v) => building(3, 3, v, 'house') },
  shop: { w: 4, h: 3, block: true, tall: true, origin: true, make: (v) => building(4, 3, v, 'shop') },
  inn: { w: 5, h: 4, block: true, tall: true, origin: true, make: (v) => building(5, 4, v, 'inn') },
  smith: { w: 4, h: 3, block: true, tall: true, origin: true, make: (v) => building(4, 3, v, 'smith') },
  church: { w: 5, h: 4, block: true, tall: true, origin: true, make: (v) => building(5, 4, v, 'church') },
};
const cache = new Map<string, Sprite>();
export function propSprite(type: string, v: number): Sprite {
  const k = type + ':' + v;
  let s = cache.get(k);
  if (!s) { s = PROPS[type].make(v); cache.set(k, s); }
  return s;
}
