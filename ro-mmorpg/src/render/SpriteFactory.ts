import { RGB, hex, css, shade, makeCanvas, ctx2d, crisp, pxEllipse } from './pixel';
import type { Look } from '../data';

/** Sprite sheet 規格：4 列（下、左、右、上）× 10 格（0~1 待機、2~5 走路、6~9 攻擊） */
export interface Sheet { c: HTMLCanvasElement; fw: number; fh: number; ax: number; ay: number; white?: HTMLCanvasElement; img?: HTMLImageElement }
export const FRAMES = 10, ROWS = 4;
const OUT: RGB = [34, 22, 38];
const OUTC = css(OUT);

// ---------- 描邊繪圖工具 ----------
function oEllipse(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: RGB, shadeIt = true) {
  c.fillStyle = OUTC; pxEllipse(c, cx, cy, rx + 1, ry + 1);
  if (!shadeIt) { c.fillStyle = css(col); pxEllipse(c, cx, cy, rx, ry); return; }
  c.fillStyle = css(shade(col, -0.28)); pxEllipse(c, cx, cy, rx, ry);
  c.fillStyle = css(col); pxEllipse(c, cx - rx * 0.1, cy - ry * 0.12, rx * 0.88, ry * 0.86);
  c.fillStyle = css(shade(col, 0.28)); pxEllipse(c, cx - rx * 0.38, cy - ry * 0.42, rx * 0.32, ry * 0.26);
}
/** 多個橢圓合成一個形狀（共用外框，不會在內部出現分隔線） */
function mEllipses(c: CanvasRenderingContext2D, es: number[][], col: RGB) {
  c.fillStyle = OUTC; for (const e of es) pxEllipse(c, e[0], e[1], e[2] + 1, e[3] + 1);
  c.fillStyle = css(shade(col, -0.28)); for (const e of es) pxEllipse(c, e[0], e[1], e[2], e[3]);
  c.fillStyle = css(col); for (const e of es) pxEllipse(c, e[0] - e[2] * 0.1, e[1] - e[3] * 0.14, e[2] * 0.86, e[3] * 0.82);
  const f = es[0]; c.fillStyle = css(shade(col, 0.3)); pxEllipse(c, f[0] - f[2] * 0.38, f[1] - f[3] * 0.4, f[2] * 0.3, f[3] * 0.24);
}
function oRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: RGB) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  c.fillStyle = OUTC; c.fillRect(x - 1, y - 1, w + 2, h + 2);
  c.fillStyle = css(col); c.fillRect(x, y, w, h);
  c.fillStyle = css(shade(col, 0.22)); c.fillRect(x, y, Math.max(1, Math.round(w * 0.3)), h);
  c.fillStyle = css(shade(col, -0.25)); c.fillRect(x + w - Math.max(1, Math.round(w * 0.25)), y, Math.max(1, Math.round(w * 0.25)), h);
}
function oPoly(c: CanvasRenderingContext2D, pts: number[][], col: RGB) {
  c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath();
  c.strokeStyle = OUTC; c.lineWidth = 2; c.stroke();
  c.fillStyle = css(col); c.fill();
}
function limb(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, col: RGB, end?: RGB) {
  c.lineCap = 'round';
  c.strokeStyle = OUTC; c.lineWidth = w + 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = css(col); c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = css(shade(col, 0.25)); c.lineWidth = Math.max(1, w * 0.3); c.beginPath(); c.moveTo(x0 - w * 0.25, y0); c.lineTo(x1 - w * 0.25, y1); c.stroke();
  if (end) { c.fillStyle = OUTC; pxEllipse(c, x1, y1, 4.5, 4.5); c.fillStyle = css(end); pxEllipse(c, x1, y1, 3.5, 3.5); }
}
function line(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, col: string) {
  c.lineCap = 'round'; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
}

// ---------- 武器 ----------
function weapon(c: CanvasRenderingContext2D, type: string, hx: number, hy: number, ang: number, glow = 0) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  if (type === 'sword' || type === 'dagger' || type === 'axe' || type === 'club') {
    const L = type === 'dagger' ? 20 : type === 'club' ? 26 : 36;
    const bx = hx + dx * 6, by = hy + dy * 6;
    line(c, hx - dx * 6, hy - dy * 6, hx + dx * 4, hy + dy * 4, 5, OUTC); line(c, hx - dx * 6, hy - dy * 6, hx + dx * 4, hy + dy * 4, 3, '#6a4428');
    if (type === 'club') { line(c, bx, by, bx + dx * L, by + dy * L, 9, OUTC); line(c, bx, by, bx + dx * L, by + dy * L, 7, '#8a6038'); line(c, bx, by, bx + dx * L, by + dy * L, 2, '#b08050'); return; }
    line(c, bx, by, bx + dx * L, by + dy * L, 7, OUTC);
    line(c, bx, by, bx + dx * L, by + dy * L, 5, type === 'axe' ? '#9a9aa8' : '#c8d0dc');
    line(c, bx - dy, by + dx, bx + dx * (L - 2) - dy, by + dy * (L - 2) + dx, 1.5, '#ffffff');
    // 護手
    line(c, hx + dx * 4 - dy * 7, hy + dy * 4 + dx * 7, hx + dx * 4 + dy * 7, hy + dy * 4 - dx * 7, 5, OUTC);
    line(c, hx + dx * 4 - dy * 6, hy + dy * 4 + dx * 6, hx + dx * 4 + dy * 6, hy + dy * 4 - dx * 6, 3, '#e0b040');
    if (type === 'axe') { oEllipse(c, bx + dx * (L - 6) - dy * 6, by + dy * (L - 6) + dx * 6, 8, 8, hex('#a8a8b8')); }
  } else if (type === 'staff') {
    const L = 58;
    const tx = hx + dx * 30, ty = hy + dy * 30, bx = hx - dx * (L - 30), by = hy - dy * (L - 30);
    line(c, bx, by, tx, ty, 6, OUTC); line(c, bx, by, tx, ty, 4, '#8a5a30'); line(c, bx - 1, by, tx - 1, ty, 1.5, '#b88050');
    if (glow > 0) { c.fillStyle = `rgba(255,220,120,${0.25 * glow})`; pxEllipse(c, tx + dx * 4, ty + dy * 4, 12 + glow * 4, 12 + glow * 4); }
    c.fillStyle = OUTC; pxEllipse(c, tx + dx * 4, ty + dy * 4, 7, 7);
    c.fillStyle = glow > 0 ? '#fff0a0' : '#e04a8a'; pxEllipse(c, tx + dx * 4, ty + dy * 4, 5.5, 5.5);
    c.fillStyle = '#ffffff'; c.fillRect(Math.round(tx + dx * 4 - 3), Math.round(ty + dy * 4 - 3), 2, 2);
  } else if (type === 'bow') {
    // 弓身垂直於 ang，弦拉向身體
    const px = -dy, py = dx; // 弓身方向
    const pull = glow; // 0~1 拉弓程度
    const R = 24;
    const pts: number[][] = [];
    for (let i = -6; i <= 6; i++) { const t = i / 6; pts.push([hx + px * R * t + dx * (1 - t * t) * 9, hy + py * R * t + dy * (1 - t * t) * 9]); }
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = OUTC; c.lineWidth = 6; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    c.strokeStyle = '#9a6a34'; c.lineWidth = 4; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    const sx = hx - dx * pull * 14, sy = hy - dy * pull * 14;
    line(c, pts[0][0], pts[0][1], sx, sy, 1, '#f0f0e0'); line(c, pts[12][0], pts[12][1], sx, sy, 1, '#f0f0e0');
    if (pull > 0.3) { line(c, sx, sy, hx + dx * 18, hy + dy * 18, 3, OUTC); line(c, sx, sy, hx + dx * 18, hy + dy * 18, 1.5, '#d8c8a0'); }
  }
}

// ---------- 人形 ----------
interface Pose { bob: number; legA: number; armL: number[]; armR: number[]; wAng: number; glow: number; lean: number; weaponFront: boolean }
function pose(dir: number, f: number, wtype: string): Pose {
  const p: Pose = { bob: 0, legA: 0, armL: [0, 0], armR: [0, 0], wAng: 1.3, glow: 0, lean: 0, weaponFront: true };
  if (f < 2) { p.bob = f; }
  else if (f < 6) { const ph = ((f - 2) / 4) * Math.PI * 2; p.legA = Math.sin(ph); p.bob = -Math.round(Math.abs(Math.sin(ph)) * 2); p.armL = [Math.sin(ph) * 3, 0]; p.armR = [-Math.sin(ph) * 3, 0]; }
  else {
    const a = f - 6;
    if (wtype === 'staff') {
      p.wAng = [-1.9, -1.75, -0.6, 0.6][a]; p.glow = [0, 1, 2, 0.5][a]; p.lean = [0, -1, 2, 1][a];
    } else if (wtype === 'bow') {
      p.wAng = 0; p.glow = [0.3, 1, 0, 0][a]; p.lean = [0, -1, 1, 0][a];
    } else {
      p.wAng = [-2.5, -1.5, 0.7, 1.1][a]; p.lean = [-1, 0, 3, 1][a];
    }
    p.bob = a === 2 ? 1 : 0;
  }
  return p;
}

function drawHuman(c: CanvasRenderingContext2D, dir: number, f: number, L: Look) {
  const ax = 96, ay = 186;
  const skin = hex(L.skin || '#f8d8b8'), hair = hex(L.hair || '#7a4a2a'), cloth = hex(L.cloth || '#c8a070'), cloth2 = hex(L.cloth2 || '#8a5a34');
  const pants = hex(L.pants || '#5a4a6a'), shoes = hex('#5a3a2a');
  const wtype = L.weapon || 'none';
  const robe = L.body === 'robe';
  const p = pose(dir, f, wtype);
  const atk = f >= 6;
  const b = p.bob;
  const by = (y: number) => y + b;
  const side = dir === 1;   // 只畫左；右由鏡像產生
  const back = dir === 3;
  const leanX = side ? -p.lean : 0, leanY = dir === 0 ? p.lean * 0.5 : dir === 3 ? -p.lean * 0.5 : 0;

  // ---- 手與武器位置 ----
  let shL: number[], shR: number[], hL: number[], hR: number[];
  if (side) {
    shL = [ax + 2 + leanX, by(134)]; shR = [ax - 4 + leanX, by(134)];
    hL = [ax + 6 + p.armL[0] * 2 + leanX, by(158)]; hR = [ax - 8 + p.armR[0] * 2 + leanX, by(158)];
  } else {
    shL = [ax - 17, by(134) + leanY]; shR = [ax + 17, by(134) + leanY];
    hL = [ax - 22, by(158 + p.armL[0]) + leanY]; hR = [ax + 22, by(158 + p.armR[0]) + leanY];
  }
  if (atk && wtype !== 'none') {
    const a = f - 6;
    if (side) {
      if (wtype === 'bow') { hR = [ax - 26 + leanX, by(140)]; hL = [ax - 26 + 14 * [0.3, 1, 0, 0][a] + leanX, by(140)]; }
      else if (wtype === 'staff') { hR = [[ax - 6, by(124)], [ax - 10, by(118)], [ax - 22, by(138)], [ax - 18, by(150)]][a]; }
      else { hR = [[ax + 8, by(118)], [ax - 6, by(112)], [ax - 24, by(150)], [ax - 20, by(156)]][a]; }
      hR[0] += leanX;
    } else if (!back) {
      if (wtype === 'bow') { hR = [ax + 4, by(146)]; hL = [ax - 6, by(150 - 6 * [0.3, 1, 0, 0][a])]; }
      else if (wtype === 'staff') { hR = [[ax + 22, by(128)], [ax + 18, by(120)], [ax + 14, by(150)], [ax + 20, by(152)]][a]; }
      else { hR = [[ax + 26, by(120)], [ax + 14, by(108)], [ax + 8, by(160)], [ax + 18, by(158)]][a]; }
    } else {
      if (wtype === 'bow') { hR = [ax + 2, by(132)]; hL = [ax + 12, by(140)]; }
      else hR = [[ax + 18, by(124)], [ax + 10, by(110)], [ax + 6, by(132)], [ax + 18, by(150)]][a];
    }
  }
  let wAng = p.wAng;
  if (!atk) wAng = side ? 2.0 : back ? -1.2 : 1.25;
  else if (side) wAng = wtype === 'bow' ? Math.PI : Math.PI - p.wAng;
  else if (back) wAng = wtype === 'bow' ? -Math.PI / 2 : p.wAng - 0.6;
  else if (wtype === 'bow') wAng = Math.PI / 2;
  // 武器在身後或身前
  const weaponBehind = back || (side && !atk) || (!side && !back && atk && wAng < -0.3 && wtype !== 'bow');
  const drawW = () => { if (wtype !== 'none') weapon(c, wtype, side ? hR[0] : hR[0], side ? hR[1] : hR[1], wAng, p.glow); };

  if (weaponBehind) drawW();
  // ---- 後側手臂（側面） ----
  if (side) limb(c, shL[0], shL[1], hL[0], hL[1], 7, shade(cloth, -0.3), shade(skin, -0.15));
  // ---- 腿 ----
  const footY = ay - 2;
  if (side) {
    const s1 = p.legA * 7, s2 = -p.legA * 7;
    oRect(c, ax - 2 + s2 + leanX * 0.5, by(160), 9, footY - by(160) - 4, shade(pants, -0.25));
    oRect(c, ax - 6 + s2 + leanX * 0.5, footY - 5 + Math.min(0, -Math.abs(s2) * 0.3), 12, 6, shade(shoes, -0.2));
    oRect(c, ax - 6 + s1 + leanX * 0.5, by(160), 9, footY - by(160) - 4, pants);
    oRect(c, ax - 10 + s1 + leanX * 0.5, footY - 5 + Math.min(0, -Math.abs(s1) * 0.3), 12, 6, shoes);
  } else {
    const liftL = Math.max(0, p.legA) * 4, liftR = Math.max(0, -p.legA) * 4;
    if (!robe) {
      oRect(c, ax - 12, by(160), 9, footY - by(160) - 4 - liftL, pants);
      oRect(c, ax + 3, by(160), 9, footY - by(160) - 4 - liftR, pants);
    }
    oRect(c, ax - 14, footY - 5 - liftL, 12, 6, shoes);
    oRect(c, ax + 2, footY - 5 - liftR, 12, 6, shoes);
  }
  // ---- 身體 ----
  const tx = side ? ax - 12 + leanX : ax - 17, tw = side ? 24 : 34, ty = by(128) + leanY;
  if (robe) {
    const hem = footY - 6;
    oPoly(c, side ? [[tx, ty], [tx + tw, ty], [tx + tw + 6, hem], [tx - 6, hem]] : [[tx, ty], [tx + tw, ty], [tx + tw + 8, hem], [tx - 8, hem]], cloth);
    c.fillStyle = css(shade(cloth, 0.2)); c.fillRect(tx + 2, ty + 2, 5, hem - ty - 4);
    c.fillStyle = css(shade(cloth, -0.25)); c.fillRect(tx + tw - 4, ty + 2, 4, hem - ty - 4);
    c.fillStyle = css(cloth2); c.fillRect(tx - (side ? 5 : 7), hem - 4, tw + (side ? 10 : 14), 3);
    if (!side && !back) { c.fillStyle = css(cloth2); c.fillRect(ax - 2, ty + 4, 4, hem - ty - 8); }
  } else {
    oRect(c, tx, ty, tw, 34, cloth);
    c.fillStyle = css(cloth2); c.fillRect(tx, ty + 24, tw, 4); // 腰帶
    c.fillStyle = '#e8c050'; if (!back) c.fillRect(side ? tx + 2 : ax - 2, ty + 24, 4, 4);
    if (!side && !back) { c.fillStyle = css(shade(cloth2, 0.1)); c.fillRect(ax - 6, ty, 12, 5); } // 領口
    if (L.body === 'armor') { // 肩甲
      oEllipse(c, side ? tx + 10 : tx - 2, ty + 4, 9, 7, hex('#b8c0d0'));
      if (!side) oEllipse(c, tx + tw + 2, ty + 4, 9, 7, hex('#b8c0d0'));
    }
  }
  // ---- 頭 ----
  const hx = side ? ax - 3 + leanX : ax, hy = by(96) + leanY;
  // 後髮（正面時在頭後）
  if (!side && !back && (L.hairStyle === 1 || L.hairStyle === 3)) mEllipses(c, [[hx, hy + 14, 30, 22]], shade(hair, -0.2));
  // ---- 手臂（正面/背面兩側，側面前手） ----
  if (side) limb(c, shR[0], shR[1], hR[0], hR[1], 8, cloth, skin);
  oEllipse(c, hx, hy, side ? 27 : 30, 27, skin);
  if (!side) { limb(c, shL[0], shL[1], hL[0], hL[1], 8, cloth, skin); limb(c, shR[0], shR[1], hR[0], hR[1], 8, cloth, skin); }
  // ---- 臉 ----
  if (!back) {
    const ex = side ? [hx - 16] : [hx - 11, hx + 11];
    for (const x of ex) {
      c.fillStyle = OUTC; c.fillRect(x - 3, hy + 3, 6, 11);
      c.fillStyle = css(hex(L.eye || '#3a5a9a')); c.fillRect(x - 2, hy + 8, 4, 5);
      c.fillStyle = css(shade(hex(L.eye || '#3a5a9a'), 0.4)); c.fillRect(x - 2, hy + 12, 4, 1);
      c.fillStyle = '#ffffff'; c.fillRect(x - 2, hy + 4, 2, 3);
      c.fillStyle = 'rgba(240,120,120,0.55)'; c.fillRect(x - (side ? 3 : 4), hy + 16, 5, 2);
    }
    c.fillStyle = css(shade(skin, -0.45)); c.fillRect(side ? hx - 22 : hx - 2, hy + 20, side ? 3 : 4, 1);
  }
  // ---- 頭髮（合成一個形狀） ----
  const hs = L.hairStyle || 0;
  if (back) {
    const es = [[hx, hy - 3, 31, 27]];
    if (hs === 1 || hs === 3) es.push([hx, hy + 20, 22, 14]); else es.push([hx, hy + 14, 26, 12]);
    mEllipses(c, es, hair);
    c.fillStyle = css(shade(hair, -0.35)); c.fillRect(hx - 1, hy - 6, 2, 22);
  } else if (side) {
    const es = [[hx + 4, hy - 10, 29, 19], [hx + 15, hy + 3, 16, 20], [hx - 16, hy - 8, 10, 7]];
    if (hs === 1) es.push([hx + 20, hy + 20, 10, 16]);
    mEllipses(c, es, hair);
    if (hs === 2) for (let i = 0; i < 3; i++) oPoly(c, [[hx + 6 + i * 8, hy - 24], [hx + 14 + i * 8, hy - 40 + i * 2], [hx + 18 + i * 8, hy - 22]], hair);
  } else {
    const es = [[hx, hy - 12, 32, 19], [hx - 26, hy + 1, 7, 13], [hx + 26, hy + 1, 7, 13]];
    for (let i = -2; i <= 2; i++) es.push([hx + i * 11, hy - 6 + Math.abs(i) * 2, 7, 5]);
    mEllipses(c, es, hair);
    c.fillStyle = css(shade(hair, -0.3)); for (let i = -1; i <= 1; i++) c.fillRect(hx + i * 11 + 5, hy - 8, 1, 6);
    if (hs === 2) for (let i = -1; i <= 1; i++) oPoly(c, [[hx + i * 14 - 7, hy - 24], [hx + i * 16, hy - 40], [hx + i * 14 + 7, hy - 24]], hair);
    if (hs === 3) { oEllipse(c, hx - 30, hy - 14, 8, 8, shade(hair, 0.1)); oEllipse(c, hx + 30, hy - 14, 8, 8, shade(hair, 0.1)); }
  }
  // ---- 帽子 ----
  if (L.hat === 'wizard') {
    const tilt = side ? 10 : 0;
    oPoly(c, [[hx - 22 + tilt * 0.3, hy - 22], [hx + 22 + tilt * 0.3, hy - 22], [hx + 6 + tilt, hy - 58]], hex('#4a3a8a'));
    oEllipse(c, hx, hy - 22, 34, 6, hex('#5a4a9a'), false);
    c.fillStyle = '#e8c050'; c.fillRect(hx - 22, hy - 25, 44, 3);
  } else if (L.hat === 'band') {
    c.fillStyle = OUTC; c.fillRect(hx - 31, hy - 16, 62, 7); c.fillStyle = css(hex(L.cloth2 || '#c03a3a')); c.fillRect(hx - 30, hy - 15, 60, 5);
  } else if (L.hat === 'helm') {
    oEllipse(c, hx, hy - 12, 33, 20, hex('#b8c0d0'));
    c.fillStyle = OUTC; c.fillRect(hx - 32, hy - 2, 64, 4); c.fillStyle = '#d0d8e8'; c.fillRect(hx - 31, hy - 1, 62, 2);
  } else if (L.hat === 'feather') {
    oEllipse(c, hx, hy - 16, 31, 13, hex('#3a7a3a'));
    oPoly(c, [[hx + 12, hy - 26], [hx + 34, hy - 52], [hx + 20, hy - 22]], hex('#e84a3a'));
  } else if (L.hat === 'ribbon') {
    oEllipse(c, hx + 18, hy - 24, 9, 6, hex('#e85a8a')); oEllipse(c, hx + 30, hy - 26, 9, 6, hex('#e85a8a'));
  } else if (L.hat === 'hood') {
    oEllipse(c, hx, hy - 8, 34, 26, hex(L.cloth2 || '#4a4a5a'));
    if (!back) { c.fillStyle = css(skin); pxEllipse(c, side ? hx - 8 : hx, hy + 6, side ? 16 : 22, 16); }
  }
  if (!weaponBehind) drawW();
}

// ---------- 怪物 ----------
type MonsterDraw = (c: CanvasRenderingContext2D, dir: number, f: number, L: Look, s: number, ax: number, ay: number) => void;
function face(c: CanvasRenderingContext2D, cx: number, cy: number, dir: number, s: number, gap = 8, eye = '#2a1a2a', angry = false) {
  if (dir === 3) return;
  const xs = dir === 1 ? [cx - gap * 1.2 * s] : [cx - gap * s, cx + gap * s];
  for (const x of xs) {
    c.fillStyle = eye; c.fillRect(Math.round(x - 2 * s), Math.round(cy - 3 * s), Math.max(2, Math.round(4 * s)), Math.max(3, Math.round(6 * s)));
    c.fillStyle = '#fff'; c.fillRect(Math.round(x - 2 * s), Math.round(cy - 3 * s), Math.max(1, Math.round(1.6 * s)), Math.max(1, Math.round(1.6 * s)));
    if (angry) { c.fillStyle = eye; c.fillRect(Math.round(x - 3 * s), Math.round(cy - 6 * s), Math.round(6 * s), Math.max(1, Math.round(1.5 * s))); }
  }
}
function anim(f: number, dir: number) {
  // 回傳：跳躍高度、前衝量（朝面向）、拍動相位
  if (f < 2) return { hop: 0, lunge: 0, ph: f * 0.5 };
  if (f < 6) { const t = (f - 2) / 4; return { hop: Math.round(Math.sin(t * Math.PI * 2) ** 2 * 6), lunge: 0, ph: t }; }
  const a = f - 6; return { hop: [2, 4, 0, 0][a], lunge: [-2, -3, 8, 3][a], ph: a / 4 };
}
function lungeXY(dir: number, l: number) { return dir === 0 ? [0, l * 0.6] : dir === 3 ? [0, -l * 0.6] : [-l, 0]; }

const MON: Record<string, MonsterDraw> = {
  slime(c, dir, f, L, s, ax, ay) {
    const { hop, lunge } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#f08aa8');
    const cx = ax + lx * s, cy = ay - 15 * s - hop * s + ly * s;
    oEllipse(c, cx, cy, 20 * s, 15 * s, col);
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(Math.round(cx - 12 * s), Math.round(cy - 9 * s), Math.round(5 * s), Math.round(3 * s));
    face(c, cx + (dir === 1 ? -2 * s : 0), cy, dir, s, 7);
    if (dir !== 3) { c.fillStyle = css(shade(col, -0.5)); c.fillRect(Math.round(cx - 2 * s + (dir === 1 ? -9 * s : 0)), Math.round(cy + 5 * s), Math.round(4 * s), Math.max(1, Math.round(1.5 * s))); }
    if (L.hat === 'crown') { oPoly(c, [[cx - 9 * s, cy - 12 * s], [cx - 9 * s, cy - 22 * s], [cx - 4 * s, cy - 16 * s], [cx, cy - 24 * s], [cx + 4 * s, cy - 16 * s], [cx + 9 * s, cy - 22 * s], [cx + 9 * s, cy - 12 * s]], hex('#f0c040')); c.fillStyle = '#e04a4a'; c.fillRect(Math.round(cx - 1.5 * s), Math.round(cy - 17 * s), Math.round(3 * s), Math.round(3 * s)); }
    if (L.hat === 'leaf') { oEllipse(c, cx + 3 * s, cy - 15 * s, 4 * s, 2.5 * s, hex('#5aa040')); }
  },
  bug(c, dir, f, L, s, ax, ay) {
    const { hop, lunge, ph } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#8ac04a'), col2 = hex(L.color2 || '#e8d070');
    const segs = 4;
    for (let i = segs - 1; i >= 0; i--) {
      const wave = Math.sin(ph * Math.PI * 2 + i) * 2 * s;
      let x = ax + lx * s, y = ay - 9 * s + ly * s;
      if (dir === 1) x += (i * 10 - 12) * s; else if (dir === 0) y -= (segs - 1 - i) * 4 * s - 6 * s; else y -= i * 4 * s;
      oEllipse(c, x, y - wave - (i === 0 ? hop * s * 0.5 : 0), (i === 0 ? 11 : 9) * s, (i === 0 ? 10 : 8) * s, i === 0 ? col : (i % 2 ? col2 : col));
      if (i === 0) { face(c, x - (dir === 1 ? 2 * s : 0), y - 1 * s, dir, s * 0.8, 5); if (dir !== 3) { line(c, x - 4 * s, y - 9 * s, x - 8 * s, y - 16 * s, 2, OUTC); line(c, x + 4 * s, y - 9 * s, x + 6 * s, y - 16 * s, 2, OUTC); } }
    }
  },
  rabbit(c, dir, f, L, s, ax, ay) {
    const { hop, lunge } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#f4f0e8'); const inner = hex(L.color2 || '#f0a0b0');
    const cx = ax + lx * s, cy = ay - 14 * s - hop * 1.4 * s + ly * s;
    const ex = dir === 1 ? 4 * s : 0;
    oEllipse(c, cx - 7 * s + ex, cy - 26 * s, 4 * s, 12 * s, col); oEllipse(c, cx + 7 * s + ex, cy - 27 * s, 4 * s, 12 * s, col);
    c.fillStyle = css(inner); c.fillRect(Math.round(cx - 8 * s + ex), Math.round(cy - 32 * s), Math.round(2 * s), Math.round(10 * s)); c.fillRect(Math.round(cx + 6 * s + ex), Math.round(cy - 33 * s), Math.round(2 * s), Math.round(10 * s));
    oEllipse(c, cx, cy, 15 * s, 13 * s, col);
    if (dir === 3) oEllipse(c, cx, cy + 6 * s, 5 * s, 5 * s, hex('#ffffff'));
    face(c, cx - (dir === 1 ? 3 * s : 0), cy - 2 * s, dir, s, 6, L.eye || '#c02040');
    if (dir !== 3) { c.fillStyle = '#e07080'; c.fillRect(Math.round(cx - 1 * s - (dir === 1 ? 9 * s : 0)), Math.round(cy + 3 * s), Math.round(3 * s), Math.round(2 * s)); }
  },
  plant(c, dir, f, L, s, ax, ay) {
    const { lunge, ph } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge * 0.6);
    const col = hex(L.color || '#5aa040'), bulb = hex(L.color2 || '#e8b070');
    const cx = ax, cy = ay - 10 * s;
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55 + Math.sin(ph * 6.28 + i) * 0.12; oEllipse(c, cx + Math.cos(a) * 16 * s + lx * s * 0.5, cy - 20 * s + Math.sin(a) * 12 * s + ly * s, 6 * s, 11 * s, col); }
    oEllipse(c, cx + lx * s * 0.3, cy, 14 * s, 11 * s, bulb);
    face(c, cx - (dir === 1 ? 3 * s : 0) + lx * s * 0.3, cy - 1 * s, dir, s, 6, '#2a1a1a', true);
  },
  bat(c, dir, f, L, s, ax, ay) {
    const { lunge, ph } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#6a4a8a'); const fl = Math.sin((f * 0.9 + ph) * Math.PI) * 10 * s;
    const cx = ax + lx * s, cy = ay - 46 * s + ly * s + Math.sin(f) * 2 * s;
    for (const sg of [-1, 1]) oPoly(c, [[cx + sg * 6 * s, cy - 2 * s], [cx + sg * 28 * s, cy - 10 * s - fl], [cx + sg * 22 * s, cy + 4 * s - fl * 0.3], [cx + sg * 14 * s, cy + 2 * s], [cx + sg * 8 * s, cy + 6 * s]], shade(col, sg < 0 ? 0.1 : -0.2));
    oEllipse(c, cx, cy, 10 * s, 9 * s, col);
    oPoly(c, [[cx - 7 * s, cy - 6 * s], [cx - 9 * s, cy - 16 * s], [cx - 3 * s, cy - 8 * s]], col); oPoly(c, [[cx + 7 * s, cy - 6 * s], [cx + 9 * s, cy - 16 * s], [cx + 3 * s, cy - 8 * s]], col);
    face(c, cx, cy - 1 * s, dir, s * 0.8, 5, '#ffe040');
  },
  mushroom(c, dir, f, L, s, ax, ay) {
    const { hop, lunge } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const cap = hex(L.color || '#d04a3a'), stem = hex(L.color2 || '#f0e0c0');
    const cx = ax + lx * s, cy = ay + ly * s - hop * s;
    oRect(c, cx - 6 * s - 3 * s, cy - 6 * s, 6 * s, 6 * s, shade(stem, -0.2)); oRect(c, cx + 3 * s, cy - 6 * s, 6 * s, 6 * s, shade(stem, -0.2));
    oEllipse(c, cx, cy - 16 * s, 11 * s, 11 * s, stem);
    face(c, cx - (dir === 1 ? 3 * s : 0), cy - 15 * s, dir, s, 5);
    oEllipse(c, cx, cy - 30 * s, 20 * s, 12 * s, cap);
    c.fillStyle = '#fff'; for (const [dx, dy, r] of [[-10, -32, 3], [4, -36, 3.5], [11, -29, 2.5], [-3, -28, 2]]) pxEllipse(c, cx + dx * s, cy + dy * s, r * s, r * s * 0.8);
  },
  wolf(c, dir, f, L, s, ax, ay) {
    const { lunge, ph } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#8a8a96'); const belly = hex(L.color2 || '#d8d8e0');
    const leg = f >= 2 && f < 6 ? Math.sin(ph * Math.PI * 2) * 5 * s : 0;
    const cx = ax + lx * s, cy = ay + ly * s;
    if (dir === 1) {
      oPoly(c, [[cx + 18 * s, cy - 26 * s], [cx + 32 * s, cy - 36 * s], [cx + 22 * s, cy - 22 * s]], col); // 尾
      for (const [x, o] of [[-12, leg], [10, -leg]]) { oRect(c, cx + (x + o / s) * s - 3 * s, cy - 14 * s, 6 * s, 13 * s, shade(col, -0.25)); }
      oEllipse(c, cx + 2 * s, cy - 22 * s, 20 * s, 10 * s, col);
      for (const [x, o] of [[-8, -leg], [14, leg]]) oRect(c, cx + (x + o / s) * s - 3 * s, cy - 14 * s, 6 * s, 13 * s, col);
      oEllipse(c, cx - 18 * s, cy - 30 * s, 10 * s, 9 * s, col);
      oEllipse(c, cx - 26 * s, cy - 27 * s, 6 * s, 4 * s, belly);
      oPoly(c, [[cx - 20 * s, cy - 36 * s], [cx - 16 * s, cy - 46 * s], [cx - 12 * s, cy - 36 * s]], col);
      face(c, cx - 20 * s, cy - 31 * s, 1, s * 0.8, 5, L.eye || '#e8c030');
    } else {
      const back = dir === 3;
      for (const sg of [-1, 1]) oRect(c, cx + sg * 8 * s - 3 * s, cy - 14 * s - (sg > 0 ? leg : -leg) * 0.4, 6 * s, 13 * s, shade(col, -0.15));
      oEllipse(c, cx, cy - 20 * s, 13 * s, 12 * s, col);
      if (back) oPoly(c, [[cx - 3 * s, cy - 22 * s], [cx + 3 * s, cy - 22 * s], [cx + 8 * s, cy - 40 * s]], col);
      oEllipse(c, cx, cy - (back ? 34 : 30) * s, 11 * s, 10 * s, col);
      for (const sg of [-1, 1]) oPoly(c, [[cx + sg * 9 * s, cy - 34 * s], [cx + sg * 8 * s, cy - 48 * s], [cx + sg * 2 * s, cy - 38 * s]], col);
      if (!back) { oEllipse(c, cx, cy - 25 * s, 6 * s, 4 * s, belly); face(c, cx, cy - 32 * s, 0, s * 0.8, 5, L.eye || '#e8c030', true); }
    }
  },
  golem(c, dir, f, L, s, ax, ay) {
    const { lunge, ph } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#8a8072');
    const step = f >= 2 && f < 6 ? Math.sin(ph * Math.PI * 2) * 3 * s : 0;
    const cx = ax + lx * s * 0.5, cy = ay + ly * s * 0.5;
    oRect(c, cx - 16 * s, cy - 18 * s - Math.max(0, step), 12 * s, 18 * s, shade(col, -0.1));
    oRect(c, cx + 4 * s, cy - 18 * s - Math.max(0, -step), 12 * s, 18 * s, shade(col, -0.1));
    oRect(c, cx - 22 * s, cy - 50 * s, 44 * s, 34 * s, col);
    c.fillStyle = css(hex(L.color2 || '#60e0ff')); if (dir !== 3) c.fillRect(Math.round(cx - 4 * s), Math.round(cy - 38 * s), Math.round(8 * s), Math.round(8 * s));
    const arm = f >= 6 ? [0, -10, 12, 4][f - 6] : 0;
    oRect(c, cx - 34 * s, cy - 48 * s + (dir === 1 ? arm * s : 0), 12 * s, 30 * s, shade(col, 0.05));
    oRect(c, cx + 22 * s, cy - 48 * s + arm * s, 12 * s, 30 * s, shade(col, -0.15));
    oRect(c, cx - 12 * s, cy - 66 * s, 24 * s, 18 * s, col);
    if (dir !== 3) { c.fillStyle = css(hex(L.eye || '#ff5030')); const ex = dir === 1 ? [-7] : [-6, 3]; for (const e of ex) c.fillRect(Math.round(cx + e * s), Math.round(cy - 60 * s), Math.round(4 * s), Math.round(3 * s)); }
    c.fillStyle = '#4a7a3a'; c.fillRect(Math.round(cx - 20 * s), Math.round(cy - 52 * s), Math.round(10 * s), Math.round(3 * s));
  },
  ghost(c, dir, f, L, s, ax, ay) {
    const { lunge } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#e8ecf8');
    const fl = Math.sin(f * 0.8) * 3 * s;
    const cx = ax + lx * s, cy = ay - 34 * s + fl + ly * s;
    const pts: number[][] = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; pts.push([cx + Math.cos(a) * 16 * s, cy + Math.sin(a) * 18 * s]); }
    for (let i = 0; i <= 6; i++) pts.push([cx + 16 * s - (i / 6) * 32 * s, cy + 18 * s + (i % 2 ? -4 : 3) * s]);
    oPoly(c, pts, col);
    c.fillStyle = css(shade(col, 0.4)); pxEllipse(c, cx - 7 * s, cy - 8 * s, 5 * s, 4 * s);
    face(c, cx - (dir === 1 ? 4 * s : 0), cy - 2 * s, dir, s, 6, '#2a2050');
    if (dir !== 3) { c.fillStyle = '#2a2050'; pxEllipse(c, cx - (dir === 1 ? 8 * s : 0), cy + 7 * s, 3 * s, 2.5 * s); }
  },
  crab(c, dir, f, L, s, ax, ay) {
    const { lunge, ph } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#e05a3a');
    const cx = ax + lx * s + (f >= 2 && f < 6 ? Math.sin(ph * 6.28) * 3 * s : 0), cy = ay - 12 * s + ly * s;
    for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) line(c, cx + sg * 8 * s, cy + 2 * s, cx + sg * (16 + k * 3) * s, cy + (8 + k) * s, 3, OUTC);
    const claw = f >= 6 ? [-4, -8, 4, 0][f - 6] : 0;
    for (const sg of [-1, 1]) { oEllipse(c, cx + sg * 20 * s, cy - 12 * s + claw * s, 8 * s, 6 * s, shade(col, sg > 0 ? -0.1 : 0.1)); }
    oEllipse(c, cx, cy, 18 * s, 11 * s, col);
    if (dir !== 3) { line(c, cx - 5 * s, cy - 8 * s, cx - 6 * s, cy - 15 * s, 2, OUTC); line(c, cx + 5 * s, cy - 8 * s, cx + 6 * s, cy - 15 * s, 2, OUTC); c.fillStyle = '#fff'; pxEllipse(c, cx - 6 * s, cy - 16 * s, 2.5 * s, 2.5 * s); pxEllipse(c, cx + 6 * s, cy - 16 * s, 2.5 * s, 2.5 * s); c.fillStyle = '#000'; c.fillRect(Math.round(cx - 6 * s), Math.round(cy - 16 * s), 2, 2); c.fillRect(Math.round(cx + 6 * s), Math.round(cy - 16 * s), 2, 2); }
  },
  bee(c, dir, f, L, s, ax, ay) {
    const { lunge } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#f0c030');
    const cx = ax + lx * s, cy = ay - 42 * s + Math.sin(f * 1.3) * 3 * s + ly * s;
    const fl = f % 2 ? 4 * s : -2 * s;
    c.fillStyle = 'rgba(220,240,255,0.9)'; pxEllipse(c, cx - 8 * s, cy - 14 * s - fl, 7 * s, 10 * s); pxEllipse(c, cx + 8 * s, cy - 14 * s - fl, 7 * s, 10 * s);
    const bx = dir === 1 ? cx + 10 * s : cx, byy = dir === 1 ? cy : cy + 8 * s;
    oEllipse(c, bx, byy, 11 * s, 9 * s, col);
    c.fillStyle = OUTC; c.fillRect(Math.round(bx - 10 * s), Math.round(byy - 2 * s), Math.round(20 * s), Math.round(3 * s)); c.fillRect(Math.round(bx - 8 * s), Math.round(byy + 4 * s), Math.round(16 * s), Math.round(2 * s));
    oPoly(c, dir === 1 ? [[bx + 10 * s, byy - 2 * s], [bx + 18 * s, byy + 2 * s], [bx + 10 * s, byy + 4 * s]] : [[bx - 3 * s, byy + 8 * s], [bx, byy + 15 * s], [bx + 3 * s, byy + 8 * s]], hex('#3a3a3a'));
    oEllipse(c, cx - (dir === 1 ? 4 * s : 0), cy - 4 * s, 9 * s, 8 * s, col);
    face(c, cx - (dir === 1 ? 6 * s : 0), cy - 4 * s, dir, s * 0.8, 5);
  },
  snake(c, dir, f, L, s, ax, ay) {
    const { lunge, ph } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#6ab04a'), belly = hex(L.color2 || '#e8e0a0');
    for (let i = 5; i >= 0; i--) {
      const a = i * 1.1 + ph * 6.28;
      const x = ax + Math.cos(a) * (12 - i) * s + (i === 0 ? lx * s : 0), y = ay - 6 * s - (5 - i) * 0 + Math.sin(a) * 4 * s + (i === 0 ? ly * s : 0);
      oEllipse(c, x, y - (i === 0 ? 14 * s : i * 0.5), (i === 0 ? 8 : 7) * s, (i === 0 ? 7 : 6) * s, i % 2 ? col : shade(col, -0.1));
    }
    const hx = ax + Math.cos(ph * 6.28) * 12 * s + lx * s, hy = ay - 22 * s + ly * s;
    oEllipse(c, hx, hy, 9 * s, 8 * s, col); c.fillStyle = css(belly); if (dir !== 3) pxEllipse(c, hx - (dir === 1 ? 3 * s : 0), hy + 4 * s, 5 * s, 2.5 * s);
    face(c, hx - (dir === 1 ? 2 * s : 0), hy - 2 * s, dir, s * 0.8, 4, '#e03030');
    if (dir !== 3 && f >= 6) { c.fillStyle = '#e03050'; c.fillRect(Math.round(hx - (dir === 1 ? 12 * s : 1)), Math.round(hy + 6 * s), 2, Math.round(5 * s)); }
  },
  flower(c, dir, f, L, s, ax, ay) {
    const { lunge, ph } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge * 0.5);
    const col = hex(L.color || '#f06a9a'), stem = hex('#4a9a3a');
    const cx = ax + lx * s, cy = ay - 34 * s + ly * s;
    line(c, ax, ay - 2, cx, cy + 10 * s, 5 * s, OUTC); line(c, ax, ay - 2, cx, cy + 10 * s, 3 * s, css(stem));
    oEllipse(c, ax - 9 * s, ay - 12 * s, 9 * s, 4 * s, stem); oEllipse(c, ax + 9 * s, ay - 14 * s, 9 * s, 4 * s, stem);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + ph; oEllipse(c, cx + Math.cos(a) * 13 * s, cy + Math.sin(a) * 11 * s, 8 * s, 7 * s, i % 2 ? col : shade(col, 0.15)); }
    oEllipse(c, cx, cy, 10 * s, 9 * s, hex(L.color2 || '#f8e070'));
    face(c, cx - (dir === 1 ? 3 * s : 0), cy, dir, s * 0.8, 5);
  },
  bird(c, dir, f, L, s, ax, ay) {
    const { hop, lunge } = anim(f, dir); const [lx, ly] = lungeXY(dir, lunge);
    const col = hex(L.color || '#e8a040');
    const cx = ax + lx * s, cy = ay - 18 * s - hop * s + ly * s;
    line(c, cx - 4 * s, cy + 10 * s, cx - 4 * s, ay - 1, 2, '#c08020'); line(c, cx + 4 * s, cy + 10 * s, cx + 4 * s, ay - 1, 2, '#c08020');
    oEllipse(c, cx, cy, 15 * s, 13 * s, col);
    const wf = f % 2 ? -5 * s : 0;
    oEllipse(c, cx + (dir === 1 ? 4 * s : 12 * s), cy + wf, 7 * s, 9 * s, shade(col, -0.15));
    if (dir === 0 || dir === 2) oEllipse(c, cx - 12 * s, cy + wf, 7 * s, 9 * s, shade(col, 0.05));
    oEllipse(c, cx - (dir === 1 ? 4 * s : 0), cy - 15 * s, 10 * s, 9 * s, col);
    if (dir !== 3) oPoly(c, dir === 1 ? [[cx - 13 * s, cy - 16 * s], [cx - 22 * s, cy - 13 * s], [cx - 13 * s, cy - 11 * s]] : [[cx - 4 * s, cy - 11 * s], [cx, cy - 6 * s], [cx + 4 * s, cy - 11 * s]], hex('#f0c030'));
    face(c, cx - (dir === 1 ? 7 * s : 0), cy - 17 * s, dir, s * 0.8, 5);
    oPoly(c, [[cx - 2 * s, cy - 24 * s], [cx + 2 * s, cy - 32 * s], [cx + 5 * s, cy - 23 * s]], hex(L.color2 || '#e04a3a'));
  },
};

function drawMonster(c: CanvasRenderingContext2D, dir: number, f: number, L: Look, fw: number) {
  const ax = fw / 2, ay = fw - 6;
  const s = L.scale || 1;
  if (L.body === 'humanoid') {
    // 人形怪物用人物繪製，再依 scale 縮放（只在生成時縮放一次，取整數倍以外的縮放後會二值化）
    const tmp = makeCanvas(192, 192); const t = ctx2d(tmp);
    drawHuman(t, dir, f, L);
    c.drawImage(tmp, 0, 0, 192, 192, Math.round(ax - 96 * s), Math.round(ay - 186 * s), Math.round(192 * s), Math.round(192 * s));
    return;
  }
  (MON[L.body || 'slime'] || MON.slime)(c, dir, f, L, s, ax, ay);
}

// ---------- 生成 sheet ----------
function buildSheet(fw: number, draw: (c: CanvasRenderingContext2D, dir: number, f: number) => void): Sheet {
  const cv = makeCanvas(fw * FRAMES, fw * ROWS);
  const c = ctx2d(cv);
  const cell = makeCanvas(fw, fw); const cc = ctx2d(cell);
  for (const dir of [0, 1, 3]) for (let f = 0; f < FRAMES; f++) {
    cc.clearRect(0, 0, fw, fw);
    draw(cc, dir, f);
    crisp(cc, 0, 0, fw, fw);
    c.drawImage(cell, f * fw, dir * fw);
    if (dir === 1) { // 鏡像產生面向右
      c.save(); c.translate(f * fw + fw, 2 * fw); c.scale(-1, 1); c.drawImage(cell, 0, 0); c.restore();
    }
  }
  return { c: cv, fw, fh: fw, ax: fw / 2, ay: fw - 6 };
}
const sheetCache = new Map<string, Sheet>();
export function humanSheet(L: Look): Sheet {
  const k = 'h:' + JSON.stringify(L);
  let s = sheetCache.get(k);
  if (!s) { s = buildSheet(192, (c, dir, f) => drawHuman(c, dir, f, L)); sheetCache.set(k, s); }
  return s;
}
export function monsterSheet(L: Look, fw: number): Sheet {
  const k = 'm:' + fw + JSON.stringify(L);
  let s = sheetCache.get(k);
  if (!s) { s = buildSheet(fw, (c, dir, f) => drawMonster(c, dir, f, L, fw)); sheetCache.set(k, s); }
  return s;
}
/** 受擊閃白用的白色剪影（需要時才生成） */
export function whiteOf(s: Sheet): HTMLCanvasElement {
  if (s.white) return s.white;
  const cv = makeCanvas(s.c.width, s.c.height); const c = ctx2d(cv);
  c.drawImage(s.c, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#ffffff'; c.fillRect(0, 0, cv.width, cv.height);
  s.white = cv; return cv;
}
export function clearSheetCache(keep: (k: string) => boolean) { for (const k of [...sheetCache.keys()]) if (!keep(k)) sheetCache.delete(k); }
