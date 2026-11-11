import { RGB, hex, css, shade } from './pixel';
import type { Look } from '../data';

/**
 * 劍士系的專用畫法（look.style === 'knight'）。
 * 規格與一般人形相同：格子 192×192、腳底錨點 (96,186)、三個方向（下、左、上；右由左鏡像）、10 格（0~1 待機、2~5 走路、6~9 攻擊）。
 * 攻擊四格：蓄力（劍往後拉）→ 舉到最高 → 揮下（身體前衝）→ 收招。揮砍的刀光不畫在圖裡，由遊戲內特效（Effects.slash）負責。
 */
type P = [number, number];
const OUT = 'rgb(34,22,38)';
const AX = 96, FOOT = 184;

// ---------- 繪圖工具（每個形狀都有深色外框，之後 celLight 會自動打出立體感） ----------
function trace(c: CanvasRenderingContext2D, pts: P[]) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
function poly(c: CanvasRenderingContext2D, pts: P[], col: RGB, lw = 2) { trace(c, pts); c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = lw; c.stroke(); c.fillStyle = css(col); c.fill(); }
function fillPoly(c: CanvasRenderingContext2D, pts: P[], col: RGB) { trace(c, pts); c.fillStyle = css(col); c.fill(); }
/** 多個多邊形合成一個輪廓（先全部描邊、再全部填色，內部不會有分隔線） */
function merged(c: CanvasRenderingContext2D, polys: P[][], col: RGB) {
  c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = 2;
  for (const p of polys) { trace(c, p); c.stroke(); }
  c.fillStyle = css(col); for (const p of polys) { trace(c, p); c.fill(); }
}
function ell(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: RGB, rot = 0) {
  c.fillStyle = OUT; c.beginPath(); c.ellipse(cx, cy, rx + 1, ry + 1, rot, 0, Math.PI * 2); c.fill();
  c.fillStyle = css(col); c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); c.fill();
}
function seg(c: CanvasRenderingContext2D, a: P, b: P, w: number, col: RGB) {
  c.lineCap = 'round';
  c.strokeStyle = OUT; c.lineWidth = w + 2; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  c.strokeStyle = css(col); c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
}
function ln(c: CanvasRenderingContext2D, a: P, b: P, w: number, col: RGB | string) {
  c.lineCap = 'butt'; c.strokeStyle = typeof col === 'string' ? col : css(col); c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
}
function px(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: RGB | string) { c.fillStyle = typeof col === 'string' ? col : css(col); c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------- 姿勢 ----------
interface Pose {
  rx: number; ry: number;      // 上半身的位移（前衝／起伏）；腳留在原地
  tw: number;                  // 肩膀相對臀部的水平位移（扭身／前傾）
  hR: P; hL: P;                // 持武器的手、另一隻手（格子內的絕對座標）
  wa: number;                  // 武器角度（弧度，0 朝右、正值朝下）
  wl: 0 | 1 | 2;               // 武器圖層：0 最後面、1 身體之後頭之前、2 最前面
  armBack: boolean;            // 持武器的手臂畫在身體後面（背面揮砍時手臂在身體另一側）
  fL: P; fR: P;                // 兩腳：[水平位移, 抬高]（側面時 fL＝靠近鏡頭的腳）
  sway: number; flare: number; // 披風擺動（−1~1）與揚起（0~1）
  hy: number;                  // 頭的額外上下位移
}
const WALK = [
  { a: 1, liftL: 0, liftR: 1, bob: 0 },    // 左腳在前
  { a: 0, liftL: 0, liftR: 5, bob: -2 },   // 右腳抬起經過
  { a: -1, liftL: 1, liftR: 0, bob: 0 },   // 右腳在前
  { a: 0, liftL: 5, liftR: 0, bob: -2 },   // 左腳抬起經過
];
function poseOf(dir: number, f: number): Pose {
  const side = dir === 1, back = dir === 3;
  const p: Pose = { rx: 0, ry: 0, tw: 0, hR: [0, 0], hL: [0, 0], wa: 0, wl: 2, armBack: false, fL: [0, 0], fR: [0, 0], sway: 0, flare: 0, hy: 0 };
  if (f < 6) { // 待機與走路
    const w = f >= 2 ? WALK[f - 2] : null;
    const br = f === 1 ? 1 : 0; // 待機的呼吸
    p.ry = w ? w.bob : br; p.sway = w ? w.a * 0.8 : f === 1 ? 0.3 : 0;
    if (side) {
      p.hR = [AX - 7 + (w ? w.a * 5 : 0), 155 + p.ry]; p.hL = [AX + 5 - (w ? w.a * 5 : 0), 156 + p.ry]; p.wa = 2.15 + (w ? w.a * 0.1 : 0); p.wl = 2;
      if (w) { p.fL = [w.a * -9 + (w.liftL ? -1 : 0), w.liftL]; p.fR = [w.a * 9 + (w.liftR ? -1 : 0), w.liftR]; }
      p.sway = w ? 0.6 + Math.abs(w.a) * 0.5 : f === 1 ? 0.15 : 0;
    } else {
      p.hR = [119, 157 + p.ry + (w ? w.a * 3 : 0)]; p.hL = [73, 157 + p.ry - (w ? w.a * 3 : 0)];
      p.wa = back ? -1.08 : 0.86 + (w ? w.a * 0.06 : 0); p.wl = back ? 0 : 2;
      if (back) p.hR = [118, 154 + p.ry + (w ? w.a * 2 : 0)];
      if (w) { p.fL = [0, w.liftL - (w.a > 0 ? 1 : 0)]; p.fR = [0, w.liftR - (w.a < 0 ? 1 : 0)]; }
    }
    return p;
  }
  const a = f - 6;
  if (side) {
    const T = [
      { rx: 4, ry: 0, tw: 2, hR: [AX + 21, 134], hL: [AX - 12, 148], wa: -0.42, wl: 2, fL: [-3, 0], fR: [7, 0], sway: -0.4, flare: 0 },
      { rx: 3, ry: -3, tw: 1, hR: [AX + 19, 103], hL: [AX - 10, 144], wa: -1.3, wl: 2, fL: [-3, 0], fR: [7, 0], sway: -0.2, flare: 0.1 },
      { rx: -9, ry: 3, tw: -4, hR: [AX - 40, 146], hL: [AX + 6, 150], wa: 2.82, wl: 2, fL: [-14, 0], fR: [11, 0], sway: 1, flare: 0.9 },
      { rx: -7, ry: 3, tw: -3, hR: [AX - 31, 159], hL: [AX + 4, 152], wa: 2.42, wl: 2, fL: [-14, 0], fR: [11, 0], sway: 1, flare: 0.5 },
    ][a];
    Object.assign(p, T);
  } else if (!back) {
    const T = [
      { rx: 2, ry: -1, tw: 2, hR: [131, 122], hL: [76, 150], wa: -1.05, wl: 2, fL: [-1, 0], fR: [2, 0], sway: -0.3, flare: 0 },
      { rx: 1, ry: -4, tw: 1, hR: [127, 100], hL: [75, 146], wa: -1.78, wl: 2, fL: [-1, 0], fR: [2, 0], sway: 0, flare: 0.15 },
      { rx: -1, ry: 4, tw: -3, hR: [84, 157], hL: [70, 148], wa: 2.5, wl: 2, fL: [-4, 0], fR: [4, 0], sway: 0.6, flare: 0.9 },
      { rx: -1, ry: 3, tw: -2, hR: [80, 164], hL: [72, 152], wa: 2.95, wl: 2, fL: [-4, 0], fR: [4, 0], sway: 0.4, flare: 0.5 },
    ][a];
    Object.assign(p, T);
  } else {
    const T = [
      { rx: 2, ry: 1, tw: 2, hR: [124, 148], hL: [74, 150], wa: 0.72, wl: 2, fL: [-1, 0], fR: [2, 0], sway: -0.3, flare: 0, armBack: false },
      { rx: 1, ry: -3, tw: 1, hR: [121, 105], hL: [74, 146], wa: -1.22, wl: 2, fL: [-1, 0], fR: [2, 0], sway: 0, flare: 0.1, armBack: false },
      { rx: -1, ry: -4, tw: -3, hR: [76, 124], hL: [72, 150], wa: -2.62, wl: 0, fL: [-4, 0], fR: [4, 0], sway: 0.6, flare: 0.8, armBack: true },
      { rx: -1, ry: -2, tw: -2, hR: [75, 141], hL: [73, 152], wa: -2.88, wl: 0, fL: [-4, 0], fR: [4, 0], sway: 0.4, flare: 0.4, armBack: true },
    ][a];
    Object.assign(p, T);
  }
  return p;
}

// ---------- 顏色 ----------
interface Pal { skin: RGB; hair: RGB; cloth: RGB; pants: RGB; steel: RGB; gold: RGB; cape: RGB | null; band: RGB; leather: RGB; pauldron: RGB; eye: RGB }
function palette(L: Look): Pal {
  const steel = hex(L.armor || '#c6cedd');
  return {
    skin: hex(L.skin || '#f8d8b8'), hair: hex(L.hair || '#7a4a28'), cloth: hex(L.cloth || '#3f62b8'), pants: hex(L.pants || '#3a3a5a'),
    steel, gold: hex(L.trim || '#e8b838'), cape: L.cape ? hex(L.cape) : null, band: hex(L.cloth2 || '#f2f2f8'), leather: hex('#6a4428'),
    pauldron: L.pauldron ? hex(L.pauldron) : steel, eye: hex(L.eye || '#3a5a9a'),
  };
}

// ---------- 武器 ----------
function sword(c: CanvasRenderingContext2D, h: P, ang: number, len: number, C: Pal) {
  const d: P = [Math.cos(ang), Math.sin(ang)], n: P = [-d[1], d[0]];
  const at = (t: number, s = 0): P => [h[0] + d[0] * t + n[0] * s, h[1] + d[1] * t + n[1] * s];
  // 握柄與柄頭
  seg(c, at(-6), at(5), 3, C.leather);
  ln(c, at(-3, -1.5), at(-3, 1.5), 1, shade(C.leather, -0.4)); ln(c, at(0, -1.5), at(0, 1.5), 1, shade(C.leather, -0.4));
  ell(c, at(-8)[0], at(-8)[1], 2.6, 2.6, C.gold);
  // 劍身：根部寬、近劍尖收窄
  const b0 = 8, L = len;
  const blade: P[] = [at(b0, 3.6), at(b0 + L - 9, 3), at(b0 + L, 0), at(b0 + L - 9, -3), at(b0, -3.6)];
  poly(c, blade, hex('#e4eaf4'));
  fillPoly(c, [at(b0, 0), at(b0 + L - 9, 0), at(b0 + L, 0), at(b0 + L - 9, -3), at(b0, -3.6)], hex('#a9b4c9')); // 背光面
  ln(c, at(b0 + 2, 0), at(b0 + L - 14, 0), 1.2, hex('#7f8ba6'));                                              // 血槽
  ln(c, at(b0 + 1, 2.2), at(b0 + L - 10, 1.9), 1, '#ffffff');                                               // 刃口高光
  // 護手：兩端微微上翹
  seg(c, at(6, -8), at(6, 8), 3.6, C.gold);
  ell(c, at(7, -8.5)[0], at(7, -8.5)[1], 2.2, 2.2, C.gold); ell(c, at(7, 8.5)[0], at(7, 8.5)[1], 2.2, 2.2, C.gold);
  px(c, at(6)[0] - 1, at(6)[1] - 1, 2, 2, '#e03a4a');
}
type OldWeapon = (c: CanvasRenderingContext2D, type: string, hx: number, hy: number, ang: number, glow?: number) => void;
function drawWeapon(c: CanvasRenderingContext2D, wtype: string, h: P, ang: number, C: Pal, old: OldWeapon) {
  if (wtype === 'none') return;
  if (wtype === 'sword') sword(c, h, ang, 44, C);
  else if (wtype === 'dagger') sword(c, h, ang, 24, C);
  else old(c, wtype, h[0], h[1], ang, 0);
}

// ---------- 部位 ----------
/** 手臂：上臂（衣服）＋前臂護甲＋拳頭；bend 是手肘往外彎的方向（+1／−1） */
function arm(c: CanvasRenderingContext2D, sh: P, hand: P, bend: number, C: Pal, dark = false) {
  const dx = hand[0] - sh[0], dy = hand[1] - sh[1], len = Math.hypot(dx, dy) || 1;
  const k = Math.max(0, 1 - len / 34) * 9 + 2;                      // 手伸得越直彎得越少
  const el: P = [sh[0] + dx * 0.5 + (-dy / len) * k * bend, sh[1] + dy * 0.5 + (dx / len) * k * bend];
  const cloth = dark ? shade(C.cloth, -0.3) : C.cloth, steel = dark ? shade(C.steel, -0.3) : C.steel;
  seg(c, sh, el, 7, cloth);
  const wrist = lerp(el, hand, 0.82);
  seg(c, el, wrist, 8, steel);
  ln(c, lerp(el, wrist, 0.12), lerp(el, wrist, 0.3), 8, dark ? shade(C.gold, -0.3) : C.gold);     // 護腕上緣的金邊
  ell(c, hand[0], hand[1], 4.6, 4.6, dark ? shade(C.leather, -0.25) : C.leather);
  px(c, hand[0] - 2, hand[1] - 3, 2, 1, shade(C.leather, 0.4));
}
function pauldron(c: CanvasRenderingContext2D, x: number, y: number, C: Pal, flip = 1) {
  ell(c, x + flip * 1, y + 5, 8, 5.5, shade(C.pauldron, -0.12));     // 下層甲片
  ell(c, x, y, 10, 7.5, C.pauldron);                                 // 上層
  c.strokeStyle = css(C.gold); c.lineWidth = 2; c.beginPath(); c.ellipse(x, y + 1, 9, 6.5, 0, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  px(c, x - 5, y - 5, 4, 2, shade(C.pauldron, 0.55)); px(c, x - 1, y - 2, 2, 2, C.gold);
}
/** 一條腿：大腿（褲子）＋膝甲＋脛甲＋鞋；toe 是腳尖方向（0 正面、−1 朝左） */
function leg(c: CanvasRenderingContext2D, hip: P, foot: P, C: Pal, toe: number, dark = false) {
  const knee: P = [hip[0] + (foot[0] - hip[0]) * 0.42 + (toe ? toe * 2 : 0), hip[1] + (foot[1] - 5 - hip[1]) * 0.45];
  const pants = dark ? shade(C.pants, -0.25) : C.pants, steel = dark ? shade(C.steel, -0.3) : C.steel;
  seg(c, hip, knee, 8, pants);
  const ankle: P = [foot[0], foot[1] - 5];
  seg(c, knee, ankle, 8, steel);
  ln(c, lerp(knee, ankle, 0.15), lerp(knee, ankle, 0.85), 2, shade(steel, 0.35));
  ell(c, knee[0], knee[1], 5, 4, steel); px(c, knee[0] - 1, knee[1] - 1, 2, 2, dark ? shade(C.gold, -0.3) : C.gold);
  const y = foot[1];
  if (toe) poly(c, [[foot[0] - 9, y - 4], [foot[0] + 4, y - 6], [foot[0] + 5, y], [foot[0] - 10, y]], shade(steel, -0.12));
  else poly(c, [[foot[0] - 6, y - 5], [foot[0] + 6, y - 5], [foot[0] + 7, y], [foot[0] - 7, y]], shade(steel, -0.12));
  px(c, foot[0] - (toe ? 8 : 5), y - 1, toe ? 12 : 11, 1, shade(steel, -0.5));
}
/** 眼睛（沿用一般人形的大眼畫法，加上往內壓的眉毛） */
function eye(c: CanvasRenderingContext2D, x: number, y0: number, C: Pal, inner: number) {
  px(c, x - 4, y0, 8, 12, OUT);
  px(c, x - 3, y0 + 2, 6, 9, '#ffffff');
  px(c, x - 3, y0 + 3, 5, 8, shade(C.eye, -0.35)); px(c, x - 3, y0 + 6, 5, 5, C.eye); px(c, x - 2, y0 + 9, 3, 2, shade(C.eye, 0.45));
  px(c, x - 2, y0 + 5, 3, 4, '#140c18');
  px(c, x - 3, y0 + 3, 2, 3, '#ffffff'); px(c, x + 1, y0 + 9, 1, 1, '#ffffff');
  px(c, x - 5, y0, 10, 2, OUT);
  // 眉毛：內側低、外側高（有精神的表情）
  const br = css(shade(C.hair, -0.35));
  c.strokeStyle = br; c.lineWidth = 2; c.lineCap = 'butt'; c.beginPath(); c.moveTo(x + inner * 5, y0 - 3); c.lineTo(x - inner * 5, y0 - 6); c.stroke();
}
/** 頭帶的飄帶（從結的位置往外飄） */
function bandTails(c: CanvasRenderingContext2D, k: P, dirX: number, sway: number, flare: number, C: Pal) {
  const lift = flare * 10, s = sway * 3;
  poly(c, [[k[0], k[1] - 2], [k[0] + dirX * (12 + flare * 6), k[1] + 4 - lift + s], [k[0] + dirX * (22 + flare * 8), k[1] + 14 - lift * 1.6 + s * 1.5], [k[0] + dirX * (14 + flare * 6), k[1] + 13 - lift + s], [k[0] + dirX * 6, k[1] + 5]], shade(C.band, -0.12));
  poly(c, [[k[0], k[1] + 1], [k[0] + dirX * (9 + flare * 6), k[1] + 10 - lift * 0.7 - s], [k[0] + dirX * (15 + flare * 8), k[1] + 23 - lift * 1.4 - s * 1.5], [k[0] + dirX * (8 + flare * 5), k[1] + 20 - lift - s], [k[0] + dirX * 3, k[1] + 8]], C.band);
  ell(c, k[0], k[1], 3.2, 3.2, C.band);
}

/** 光翼（聖殿守護者）：d 是往哪一側張開（−1 左、+1 右） */
function wing(c: CanvasRenderingContext2D, sx: number, ty: number, d: number, col: RGB, sw: number) {
  poly(c, [[sx, ty + 4], [sx + d * 30, ty - 34 + sw], [sx + d * 46, ty - 28 + sw], [sx + d * 38, ty - 14], [sx + d * 48, ty - 4], [sx + d * 32, ty + 8], [sx + d * 36, ty + 22], [sx + d * 14, ty + 22]], col);
  ln(c, [sx + d * 6, ty + 6], [sx + d * 34, ty - 24 + sw], 1, shade(col, -0.3)); ln(c, [sx + d * 8, ty + 12], [sx + d * 40, ty - 6], 1, shade(col, -0.3));
}
const helmed = (L: Look) => L.hat === 'helm' || L.hat === 'crownhelm';

// ---------- 正面 ----------
function front(c: CanvasRenderingContext2D, f: number, L: Look, C: Pal, old: OldWeapon) {
  const p = poseOf(0, f), wt = L.weapon || 'none';
  const sh = AX + p.rx + p.tw, hip = AX + p.rx * 0.6, ty = 129 + p.ry;
  const shL: P = [sh - 17, ty + 5], shR: P = [sh + 17, ty + 5];
  const hR: P = p.hR, hL: P = p.hL;
  const W = () => drawWeapon(c, wt, hR, p.wa, C, old);
  if (L.wings) { const wc = hex(L.wings), sw = p.sway * 2 - p.flare * 6; wing(c, sh - 14, ty, -1, wc, sw); wing(c, sh + 14, ty, 1, wc, sw); }
  // 披風（兩側露出來的部分）
  if (C.cape) {
    const s = p.sway, fl = p.flare;
    poly(c, [[sh - 14, ty + 2], [sh - 25 + s * 2 - fl * 9, ty + 24 - fl * 4], [hip - 23 + s * 3 - fl * 13, 177 - fl * 12], [hip - 12 + s * 2, 179 - fl * 3], [hip - 9, ty + 12]], shade(C.cape, -0.15));
    poly(c, [[sh + 14, ty + 2], [sh + 25 + s * 2 + fl * 9, ty + 24 - fl * 4], [hip + 23 + s * 3 + fl * 13, 177 - fl * 12], [hip + 12 + s * 2, 179 - fl * 3], [hip + 9, ty + 12]], shade(C.cape, -0.15));
    ln(c, [sh - 19 + s - fl * 5, ty + 20], [hip - 18 + s * 2 - fl * 9, 172 - fl * 8], 1, shade(C.cape, -0.4)); ln(c, [sh + 19 + s + fl * 5, ty + 20], [hip + 18 + s * 2 + fl * 9, 172 - fl * 8], 1, shade(C.cape, -0.4));
  }
  if (p.wl === 0) W();
  // 腿
  leg(c, [hip - 7, ty + 35], [AX - 8 + p.fL[0], FOOT - p.fL[1]], C, 0);
  leg(c, [hip + 7, ty + 35], [AX + 8 + p.fR[0], FOOT - p.fR[1]], C, 0);
  // 腰裙與腿甲
  poly(c, [[hip - 14, ty + 26], [hip + 14, ty + 26], [hip + 16, ty + 38], [hip - 16, ty + 38]], shade(C.cloth, -0.1));
  ln(c, [hip, ty + 29], [hip, ty + 38], 1, shade(C.cloth, -0.45));
  poly(c, [[hip - 15, ty + 26], [hip - 5, ty + 26], [hip - 7, ty + 37], [hip - 17, ty + 35]], C.steel); poly(c, [[hip + 15, ty + 26], [hip + 5, ty + 26], [hip + 7, ty + 37], [hip + 17, ty + 35]], C.steel);
  px(c, hip - 15, ty + 34, 7, 1, C.gold); px(c, hip + 8, ty + 34, 7, 1, C.gold);
  // 軀幹：內衣＋胸甲
  poly(c, [[sh - 16, ty], [sh + 16, ty], [hip + 13, ty + 25], [hip - 13, ty + 25]], C.cloth);
  poly(c, [[sh - 13, ty + 1], [sh + 13, ty + 1], [sh + 14, ty + 11], [hip + 10, ty + 21], [hip - 10, ty + 21], [sh - 14, ty + 11]], C.steel);
  fillPoly(c, [[sh - 11, ty + 3], [sh - 6, ty + 3], [hip - 5, ty + 19], [hip - 8, ty + 19], [sh - 12, ty + 11]], shade(C.steel, 0.5)); // 左側高光
  ln(c, [(sh + hip) / 2, ty + 7], [hip, ty + 20], 1, shade(C.steel, -0.45));
  ln(c, [sh - 11, ty + 13], [sh + 11, ty + 13], 1, shade(C.steel, -0.35));
  poly(c, [[sh - 7, ty - 1], [sh + 7, ty - 1], [sh, ty + 7]], C.gold);                         // 領口金飾
  px(c, sh - 1, ty + 1, 2, 2, '#e03a4a');
  px(c, hip - 13, ty + 21, 26, 5, OUT); px(c, hip - 12, ty + 22, 24, 3, C.leather); px(c, hip - 4, ty + 21, 8, 5, OUT); px(c, hip - 3, ty + 22, 6, 3, C.gold); px(c, hip - 3, ty + 22, 2, 1, '#fff4b0');
  if (p.wl === 1) W();
  const armOver = hR[1] < ty - 6;     // 手舉過頭：手臂畫在頭後面
  if (armOver) { arm(c, shR, hR, 1, C); pauldron(c, shR[0] + 2, ty + 3, C, 1); }
  // 脖子與頭
  const hx = sh + p.tw * 0.3, hy = 95 + p.ry + p.hy;
  px(c, hx - 6, hy + 21, 12, 12, OUT); px(c, hx - 5, hy + 22, 10, 10, shade(C.skin, -0.18));
  // 後腦的髮尖（在臉後面）
  merged(c, ([
    [[hx - 14, hy - 30], [hx - 23, hy - 50], [hx - 3, hy - 36]], [[hx - 2, hy - 36], [hx + 5, hy - 56], [hx + 15, hy - 34]], [[hx + 12, hy - 34], [hx + 29, hy - 49], [hx + 27, hy - 24]],
    [[hx - 26, hy - 22], [hx - 41, hy - 33], [hx - 31, hy - 8]], [[hx + 27, hy - 20], [hx + 42, hy - 26], [hx + 33, hy - 6]],
    [[hx - 33, hy - 10], [hx - 28, hy - 28], [hx - 12, hy - 36], [hx + 12, hy - 36], [hx + 28, hy - 28], [hx + 33, hy - 10], [hx + 34, hy + 8], [hx - 34, hy + 8]],
  ] as P[][]).slice(helmed(L) ? 5 : 0), shade(C.hair, -0.12));
  ell(c, hx, hy + 2, 29.5, 26.5, C.skin);
  px(c, hx - 21, hy + 4, 4, 2, shade(C.skin, 0.4));
  eye(c, hx - 12, hy + 3, C, 1); eye(c, hx + 12, hy + 3, C, -1);
  px(c, hx - 18, hy + 18, 6, 2, 'rgba(240,110,120,0.45)'); px(c, hx + 12, hy + 18, 6, 2, 'rgba(240,110,120,0.45)');
  px(c, hx, hy + 15, 1, 2, shade(C.skin, -0.25));
  px(c, hx - 3, hy + 21, 6, 1, shade(C.skin, -0.55)); px(c, hx + 2, hy + 20, 2, 1, shade(C.skin, -0.55));   // 微微上揚的嘴角
  // 前髮：一整片髮帽＋長短不一的瀏海
  merged(c, [[
    [hx - 31, hy + 6], [hx - 34, hy - 10], [hx - 28, hy - 27], [hx - 13, hy - 36], [hx + 2, hy - 38], [hx + 18, hy - 34], [hx + 29, hy - 24], [hx + 34, hy - 8], [hx + 31, hy + 6],
    [hx + 27, hy - 4], [hx + 23, hy + 5], [hx + 17, hy - 7], [hx + 11, hy + 2], [hx + 5, hy - 8], [hx - 3, hy + 6], [hx - 9, hy - 7], [hx - 16, hy + 3], [hx - 22, hy - 6], [hx - 27, hy + 3],
  ]], C.hair);
  const dk = shade(C.hair, -0.4), lt = shade(C.hair, 0.45);
  ln(c, [hx + 5, hy - 8], [hx + 8, hy - 20], 1, dk); ln(c, [hx - 9, hy - 7], [hx - 13, hy - 20], 1, dk); ln(c, [hx + 17, hy - 7], [hx + 21, hy - 18], 1, dk); ln(c, [hx - 22, hy - 6], [hx - 25, hy - 16], 1, dk);
  // 頭帶（壓在瀏海上緣）與右側的結
  if (L.hat === 'band' || !L.hat) {
    poly(c, [[hx - 33, hy - 13], [hx - 16, hy - 20], [hx, hy - 22], [hx + 16, hy - 20], [hx + 33, hy - 13], [hx + 33, hy - 7], [hx + 16, hy - 14], [hx, hy - 16], [hx - 16, hy - 14], [hx - 33, hy - 7]], C.band);
    ln(c, [hx - 30, hy - 9], [hx - 14, hy - 15], 1, shade(C.band, -0.3)); px(c, hx - 2, hy - 20, 4, 3, C.gold);
    bandTails(c, [hx + 34, hy - 10], 1, p.sway, p.flare, C);
  }
  c.strokeStyle = css(lt); c.lineWidth = 2; c.beginPath(); c.ellipse(hx - 3, hy - 22, 18, 7, -0.12, 1.12 * Math.PI, 1.72 * Math.PI); c.stroke();   // 髮絲光澤
  hat(c, L, hx, hy, 0);
  // 手臂與護肩
  arm(c, shL, hL, -1, C);
  if (L.shield) shieldFront(c, [hL[0] - 2, hL[1] - 4], C);
  pauldron(c, shL[0] - 2, ty + 3, C, -1);
  if (!armOver) { arm(c, shR, hR, 1, C); pauldron(c, shR[0] + 2, ty + 3, C, 1); }
  if (p.wl === 2) { W(); ell(c, hR[0], hR[1], 4.6, 4.6, C.leather); }
}
function shieldFront(c: CanvasRenderingContext2D, o: P, C: Pal) {
  poly(c, [[o[0] - 11, o[1] - 13], [o[0] + 9, o[1] - 13], [o[0] + 10, o[1] + 4], [o[0] - 1, o[1] + 16], [o[0] - 12, o[1] + 4]], C.steel);
  poly(c, [[o[0] - 7, o[1] - 9], [o[0] + 5, o[1] - 9], [o[0] + 6, o[1] + 3], [o[0] - 1, o[1] + 11], [o[0] - 8, o[1] + 3]], C.cloth, 1.5);
  px(c, o[0] - 2, o[1] - 5, 2, 12, C.gold); px(c, o[0] - 6, o[1] - 2, 10, 2, C.gold);
}

// ---------- 側面（面向左） ----------
function sideView(c: CanvasRenderingContext2D, f: number, L: Look, C: Pal, old: OldWeapon) {
  const p = poseOf(1, f), wt = L.weapon || 'none';
  const cx = AX + p.rx + p.tw, hip = AX + p.rx * 0.7, ty = 129 + p.ry;
  const hR: P = p.hR, hL: P = p.hL;
  const W = () => drawWeapon(c, wt, hR, p.wa, C, old);
  if (L.wings) wing(c, cx + 6, ty, 1, hex(L.wings), p.sway * 2 - p.flare * 6);
  // 披風：往背後飄
  if (C.cape) {
    const s = p.sway, fl = p.flare;
    poly(c, [[cx + 1, ty + 1], [cx + 11, ty + 2], [cx + 21 + s * 4 + fl * 16, ty + 22 - fl * 8], [hip + 25 + s * 5 + fl * 24, 176 - fl * 22], [hip + 16 + s * 3 + fl * 14, 172 - fl * 10], [hip + 9 + s * 2 + fl * 8, 178 - fl * 8], [hip + 6, ty + 22]], C.cape);
    ln(c, [cx + 10, ty + 8], [hip + 17 + s * 3 + fl * 14, 168 - fl * 14], 1, shade(C.cape, -0.4));
    ln(c, [cx + 5, ty + 10], [hip + 10 + s * 2 + fl * 8, 172 - fl * 8], 1, shade(C.cape, 0.3));
  }
  // 遠側的手（與盾）
  arm(c, [cx + 3, ty + 6], hL, 1, C, true);
  if (L.shield) { ell(c, hL[0] - 3, hL[1] - 3, 6, 12, shade(C.steel, -0.2)); px(c, hL[0] - 4, hL[1] - 9, 2, 12, shade(C.gold, -0.2)); }
  if (p.wl === 0) W();
  // 腿：遠側先畫
  leg(c, [hip + 1, ty + 35], [AX + 2 + p.fR[0], FOOT - p.fR[1]], C, -1, true);
  leg(c, [hip - 1, ty + 35], [AX - 2 + p.fL[0], FOOT - p.fL[1]], C, -1);
  // 腰裙
  poly(c, [[hip - 10, ty + 26], [hip + 10, ty + 26], [hip + 12, ty + 38], [hip - 12, ty + 38]], shade(C.cloth, -0.1));
  poly(c, [[hip - 6, ty + 26], [hip + 7, ty + 26], [hip + 8, ty + 37], [hip - 7, ty + 37]], C.steel); px(c, hip - 6, ty + 34, 13, 1, C.gold);
  // 軀幹（胸口朝左）
  poly(c, [[cx - 9, ty], [cx + 10, ty], [hip + 10, ty + 25], [hip - 9, ty + 25], [cx - 12, ty + 11]], C.cloth);
  poly(c, [[cx - 10, ty + 1], [cx + 5, ty + 1], [hip + 5, ty + 21], [hip - 8, ty + 21], [cx - 13, ty + 11]], C.steel);
  fillPoly(c, [[cx - 9, ty + 3], [cx - 5, ty + 3], [hip - 4, ty + 19], [hip - 7, ty + 19], [cx - 11, ty + 11]], shade(C.steel, 0.5));
  ln(c, [cx - 11, ty + 13], [cx + 4, ty + 13], 1, shade(C.steel, -0.35));
  px(c, hip - 10, ty + 21, 21, 5, OUT); px(c, hip - 9, ty + 22, 19, 3, C.leather); px(c, hip - 8, ty + 22, 5, 3, C.gold);
  // 頭
  const hx = cx - 3 + p.tw * 0.3, hy = 95 + p.ry + p.hy;
  px(c, hx - 2, hy + 21, 11, 12, OUT); px(c, hx - 1, hy + 22, 9, 10, shade(C.skin, -0.18));
  // 後腦髮尖
  merged(c, ([
    [[hx - 2, hy - 34], [hx + 6, hy - 54], [hx + 18, hy - 30]], [[hx - 16, hy - 30], [hx - 14, hy - 48], [hx + 2, hy - 34]], [[hx + 14, hy - 26], [hx + 31, hy - 44], [hx + 30, hy - 16]],
    [[hx + 26, hy - 12], [hx + 46, hy - 20], [hx + 34, hy + 2]], [[hx + 28, hy + 2], [hx + 43, hy + 6], [hx + 27, hy + 18]],
    [[hx - 22, hy - 22], [hx - 8, hy - 35], [hx + 14, hy - 34], [hx + 30, hy - 18], [hx + 33, hy + 4], [hx + 24, hy + 22], [hx + 10, hy + 24], [hx + 4, hy + 6], [hx - 20, hy + 2]],
  ] as P[][]).slice(helmed(L) ? 3 : 0), shade(C.hair, -0.12));
  ell(c, hx - 2, hy + 2, 26, 26, C.skin);
  px(c, hx - 30, hy + 12, 3, 4, OUT); px(c, hx - 29, hy + 13, 3, 2, C.skin);                 // 鼻尖
  eye(c, hx - 16, hy + 3, C, 1);
  px(c, hx - 21, hy + 18, 6, 2, 'rgba(240,110,120,0.45)');
  px(c, hx - 25, hy + 21, 4, 1, shade(C.skin, -0.55));
  // 前髮：髮帽＋往前的瀏海＋鬢角
  merged(c, [[
    [hx - 26, hy - 5], [hx - 28, hy - 14], [hx - 20, hy - 28], [hx - 6, hy - 36], [hx + 12, hy - 36], [hx + 26, hy - 24], [hx + 32, hy - 6], [hx + 30, hy + 12], [hx + 20, hy + 22],
    [hx + 10, hy + 20], [hx + 8, hy + 4], [hx + 4, hy + 15], [hx, hy - 1], [hx - 5, hy - 9], [hx - 10, hy - 1], [hx - 15, hy - 10], [hx - 21, hy - 2],
  ]], C.hair);
  const dk = shade(C.hair, -0.4), lt = shade(C.hair, 0.45);
  ln(c, [hx - 5, hy - 9], [hx - 3, hy - 20], 1, dk); ln(c, [hx - 15, hy - 10], [hx - 16, hy - 19], 1, dk); ln(c, [hx + 8, hy + 4], [hx + 14, hy - 8], 1, dk); ln(c, [hx + 20, hy - 4], [hx + 26, hy + 10], 1, dk);
  if (L.hat === 'band' || !L.hat) {
    poly(c, [[hx - 29, hy - 12], [hx - 12, hy - 20], [hx + 10, hy - 20], [hx + 31, hy - 10], [hx + 31, hy - 4], [hx + 10, hy - 14], [hx - 12, hy - 14], [hx - 29, hy - 6]], C.band);
    ln(c, [hx - 26, hy - 8], [hx - 10, hy - 15], 1, shade(C.band, -0.3));
    bandTails(c, [hx + 32, hy - 7], 1, p.sway, Math.max(p.flare, f >= 2 && f < 6 ? 0.45 : 0), C);
  }
  c.strokeStyle = css(lt); c.lineWidth = 2; c.beginPath(); c.ellipse(hx + 2, hy - 22, 17, 7, 0.1, 1.1 * Math.PI, 1.7 * Math.PI); c.stroke();
  hat(c, L, hx, hy, 1);
  // 近側的手：護肩→手臂→武器→拳頭
  const shN: P = [cx + 1, ty + 6];
  arm(c, shN, hR, -1, C);
  pauldron(c, shN[0], ty + 3, C, 1);
  if (p.wl === 2) { W(); ell(c, hR[0], hR[1], 4.6, 4.6, C.leather); }
}

// ---------- 背面 ----------
function backView(c: CanvasRenderingContext2D, f: number, L: Look, C: Pal, old: OldWeapon) {
  const p = poseOf(3, f), wt = L.weapon || 'none';
  const sh = AX + p.rx + p.tw, hip = AX + p.rx * 0.6, ty = 129 + p.ry;
  const shL: P = [sh - 17, ty + 5], shR: P = [sh + 17, ty + 5];
  const hR: P = p.hR, hL: P = p.hL;
  const W = () => drawWeapon(c, wt, hR, p.wa, C, old);
  if (p.wl === 0) W();
  if (p.armBack) { arm(c, shR, hR, -1, C, true); ell(c, hR[0], hR[1], 4.6, 4.6, shade(C.leather, -0.2)); }
  if (L.shield) poly(c, [[hL[0] - 12, hL[1] - 16], [hL[0] - 2, hL[1] - 16], [hL[0] - 2, hL[1] + 10], [hL[0] - 8, hL[1] + 14], [hL[0] - 13, hL[1] + 4]], shade(C.steel, -0.15));
  leg(c, [hip - 7, ty + 35], [AX - 8 + p.fL[0], FOOT - p.fL[1]], C, 0);
  leg(c, [hip + 7, ty + 35], [AX + 8 + p.fR[0], FOOT - p.fR[1]], C, 0);
  poly(c, [[hip - 14, ty + 26], [hip + 14, ty + 26], [hip + 16, ty + 38], [hip - 16, ty + 38]], shade(C.cloth, -0.1));
  poly(c, [[sh - 16, ty], [sh + 16, ty], [hip + 13, ty + 25], [hip - 13, ty + 25]], C.cloth);
  poly(c, [[sh - 13, ty + 1], [sh + 13, ty + 1], [sh + 14, ty + 11], [hip + 10, ty + 21], [hip - 10, ty + 21], [sh - 14, ty + 11]], C.steel);
  px(c, hip - 13, ty + 21, 26, 5, OUT); px(c, hip - 12, ty + 22, 24, 3, C.leather);
  // 手臂在披風外側
  arm(c, shL, hL, 1, C);
  if (!p.armBack) arm(c, shR, hR, -1, C);
  // 披風：蓋住整個背
  if (C.cape) {
    const s = p.sway, fl = p.flare;
    poly(c, [[sh - 15, ty], [sh + 15, ty], [hip + 21 + s * 2 + fl * 6, 174 - fl * 6], [hip + 13 + s * 2, 179 - fl * 2], [hip + 5 + s, 176 - fl * 3], [hip - 4 + s, 180 - fl * 2], [hip - 13 + s * 2, 176 - fl * 3], [hip - 21 + s * 2 - fl * 6, 174 - fl * 6]], C.cape);
    ln(c, [sh - 6, ty + 8], [hip - 8 + s * 2, 174], 1, shade(C.cape, -0.4)); ln(c, [sh + 6, ty + 8], [hip + 8 + s * 2, 174], 1, shade(C.cape, -0.4));
    fillPoly(c, [[sh - 13, ty + 3], [sh - 9, ty + 3], [hip - 14 + s * 2 - fl * 4, 170], [hip - 18 + s * 2 - fl * 5, 170]], shade(C.cape, 0.3));
    px(c, sh - 15, ty - 1, 30, 4, OUT); px(c, sh - 14, ty, 28, 2, C.gold);
  }
  if (L.wings) { const wc = hex(L.wings), sw = p.sway * 2 - p.flare * 6; wing(c, sh - 8, ty + 2, -1, wc, sw); wing(c, sh + 8, ty + 2, 1, wc, sw); }
  pauldron(c, shL[0] - 2, ty + 3, C, -1); pauldron(c, shR[0] + 2, ty + 3, C, 1);
  // 頭（後腦）
  const hx = sh + p.tw * 0.3, hy = 95 + p.ry + p.hy;
  merged(c, ([
    [[hx - 14, hy - 30], [hx - 23, hy - 50], [hx - 3, hy - 36]], [[hx - 2, hy - 36], [hx + 5, hy - 56], [hx + 15, hy - 34]], [[hx + 12, hy - 34], [hx + 29, hy - 49], [hx + 27, hy - 24]],
    [[hx - 26, hy - 22], [hx - 41, hy - 33], [hx - 31, hy - 8]], [[hx + 27, hy - 20], [hx + 42, hy - 26], [hx + 33, hy - 6]],
    [[hx - 33, hy - 8], [hx - 28, hy - 27], [hx - 12, hy - 36], [hx + 12, hy - 36], [hx + 28, hy - 27], [hx + 33, hy - 8], [hx + 33, hy + 12],
      [hx + 26, hy + 30], [hx + 20, hy + 20], [hx + 13, hy + 33], [hx + 6, hy + 22], [hx, hy + 35], [hx - 6, hy + 22], [hx - 13, hy + 33], [hx - 20, hy + 20], [hx - 26, hy + 30], [hx - 33, hy + 12]],
  ] as P[][]).slice(helmed(L) ? 5 : 0), C.hair);
  const dk = shade(C.hair, -0.4), lt = shade(C.hair, 0.45);
  ln(c, [hx, hy - 8], [hx, hy + 30], 1, dk); ln(c, [hx - 13, hy - 4], [hx - 13, hy + 28], 1, dk); ln(c, [hx + 13, hy - 4], [hx + 13, hy + 28], 1, dk);
  if (L.hat === 'band' || !L.hat) {
    poly(c, [[hx - 33, hy - 12], [hx - 16, hy - 17], [hx + 16, hy - 17], [hx + 33, hy - 12], [hx + 33, hy - 6], [hx + 16, hy - 11], [hx - 16, hy - 11], [hx - 33, hy - 6]], C.band);
    bandTails(c, [hx + 8, hy - 12], 1, p.sway, p.flare * 0.6, C);
  }
  c.strokeStyle = css(lt); c.lineWidth = 2; c.beginPath(); c.ellipse(hx - 3, hy - 22, 18, 7, -0.12, 1.12 * Math.PI, 1.72 * Math.PI); c.stroke();
  hat(c, L, hx, hy, 3);
  if (p.wl === 2) { W(); ell(c, hR[0], hR[1], 4.6, 4.6, C.leather); }
}

/** 頭盔類（聖騎士、聖殿守護者）；頭帶已經在各方向畫好 */
function hat(c: CanvasRenderingContext2D, L: Look, hx: number, hy: number, dir: number) {
  if (L.hat !== 'helm' && L.hat !== 'crownhelm') return;
  const st = hex('#d4dae6'), gold = hex('#e8b838');
  if (L.hat === 'crownhelm') { poly(c, [[hx - 28, hy - 14], [hx - 52, hy - 40], [hx - 42, hy - 10]], gold); if (dir !== 1) poly(c, [[hx + 28, hy - 14], [hx + 52, hy - 40], [hx + 42, hy - 10]], gold); }
  poly(c, [[hx - 33, hy - 4], [hx - 31, hy - 24], [hx - 16, hy - 38], [hx, hy - 41], [hx + 16, hy - 38], [hx + 31, hy - 24], [hx + 33, hy - 4]], st);
  fillPoly(c, [[hx - 27, hy - 8], [hx - 25, hy - 24], [hx - 14, hy - 34], [hx - 9, hy - 33], [hx - 20, hy - 22], [hx - 22, hy - 8]], shade(st, 0.5));
  px(c, hx - 1, hy - 40, 2, 34, shade(st, -0.35));
  px(c, hx - 34, hy - 6, 68, 6, OUT); px(c, hx - 33, hy - 5, 66, 4, gold); px(c, hx - 33, hy - 5, 66, 1, shade(gold, 0.5));
  if (L.hat === 'crownhelm') { poly(c, [[hx - 5, hy - 26], [hx + 5, hy - 26], [hx + 6, hy - 42], [hx, hy - 50], [hx - 6, hy - 42]], gold); px(c, hx - 2, hy - 36, 4, 5, '#ff4060'); }
  else if (dir === 0) { px(c, hx - 3, hy - 1, 6, 12, OUT); px(c, hx - 2, hy - 1, 4, 11, st); }   // 鼻樑護條
}

/** 入口：依方向畫一格 */
export function drawKnight(c: CanvasRenderingContext2D, dir: number, f: number, L: Look, old: OldWeapon) {
  const C = palette(L);
  if (dir === 1) sideView(c, f, L, C, old); else if (dir === 3) backView(c, f, L, C, old); else front(c, f, L, C, old);
}
