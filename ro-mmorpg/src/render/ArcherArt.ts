import { RGB, hex, css, shade } from './pixel';
import type { Look } from '../data';
import { P, OUT, AX, FOOT, WALK, poly, fillPoly, merged, ell, seg, ln, px, lerp } from './KnightArt';

/**
 * 弓箭手系的專用畫法（look.style === 'archer'）：羽毛帽（或頭帶／兜帽）、馬尾、短披風、皮背心與箭筒、長靴、反曲弓。
 * 規格與一般人形相同（192×192、腳底 (96,186)、下／左／上三方向、10 格）。
 * 攻擊四格：舉弓搭箭 → 拉滿弓 → 放箭（弦彈回、箭已離弦）→ 放下。箭本身由遊戲內的投射物畫，不畫在圖裡。
 */
interface APal { skin: RGB; hair: RGB; cloth: RGB; leather: RGB; pants: RGB; cape: RGB | null; boot: RGB; wood: RGB; eye: RGB; accent: RGB; scarf: RGB | null }
function apal(L: Look): APal {
  return { skin: hex(L.skin || '#f8d8b8'), hair: hex(L.hair || '#e0b050'), cloth: hex(L.cloth || '#4a8a4a'), leather: hex('#8a5a30'), pants: hex(L.pants || '#5a4a3a'),
    cape: L.cape ? hex(L.cape) : null, boot: hex('#6a4426'), wood: hex('#a8743a'), eye: hex(L.eye || '#3a8a5a'), accent: hex(L.cloth2 || '#e84a3a'), scarf: L.scarf ? hex(L.scarf) : null };
}
interface APose {
  rx: number; ry: number; tw: number;
  hB: P;                   // 握弓的手（弓的中心）
  hD: P | null;            // 拉弦的手；null 表示就在搭箭點上
  aim: number;             // 弓瞄準的方向（箭的方向）
  pull: number;            // 拉弓程度 0~1
  arrow: boolean;          // 弦上有沒有箭
  bl: 0 | 2;               // 弓的圖層：0 在身體後面、2 在最前面
  fL: P; fR: P; sway: number; flare: number;
}
function apose(dir: number, f: number): APose {
  const side = dir === 1, back = dir === 3;
  const p: APose = { rx: 0, ry: 0, tw: 0, hB: [0, 0], hD: [0, 0], aim: 0, pull: 0, arrow: false, bl: 2, fL: [0, 0], fR: [0, 0], sway: 0, flare: 0 };
  if (f < 6) {
    const w = f >= 2 ? WALK[f - 2] : null;
    p.ry = w ? w.bob : f === 1 ? 1 : 0; p.sway = w ? w.a * 0.8 : f === 1 ? 0.3 : 0;
    if (side) {
      p.hB = [AX - 12 + (w ? w.a * 4 : 0), 157 + p.ry]; p.hD = [AX + 5 - (w ? w.a * 4 : 0), 156 + p.ry]; p.aim = Math.PI * 0.62;
      if (w) { p.fL = [w.a * -9 + (w.liftL ? -1 : 0), w.liftL]; p.fR = [w.a * 9 + (w.liftR ? -1 : 0), w.liftR]; }
      p.sway = w ? 0.6 + Math.abs(w.a) * 0.5 : p.sway;
    } else {
      p.hB = [123, 153 + p.ry + (w ? w.a * 2 : 0)]; p.hD = [72, 156 + p.ry - (w ? w.a * 3 : 0)]; p.aim = back ? 0.18 : 0.22;
      if (w) { p.fL = [0, w.liftL - (w.a > 0 ? 1 : 0)]; p.fR = [0, w.liftR - (w.a < 0 ? 1 : 0)]; }
    }
    return p;
  }
  const a = f - 6, DN = Math.PI / 2;
  if (side) Object.assign(p, [
    { rx: 1, hB: [AX - 23, 144], hD: null, aim: Math.PI, pull: 0.35, arrow: true, fL: [-4, 0], fR: [6, 0] },
    { rx: 2, tw: 1, hB: [AX - 26, 141], hD: null, aim: Math.PI, pull: 1, arrow: true, fL: [-5, 0], fR: [7, 0], sway: -0.3 },
    { rx: 1, hB: [AX - 28, 141], hD: [AX + 8, 136], aim: Math.PI, pull: 0, arrow: false, fL: [-5, 0], fR: [7, 0], sway: 0.8, flare: 0.6 },
    { hB: [AX - 20, 149], hD: [AX + 5, 148], aim: Math.PI * 0.8, pull: 0, arrow: false, fL: [-4, 0], fR: [6, 0], sway: 0.5, flare: 0.2 },
  ][a]);
  else if (!back) Object.assign(p, [
    { ry: -1, hB: [98, 151], hD: null, aim: DN, pull: 0.35, arrow: true, fL: [-2, 0], fR: [2, 0] },
    { ry: -1, hB: [97, 156], hD: null, aim: DN, pull: 1, arrow: true, fL: [-3, 0], fR: [3, 0] },
    { ry: 1, hB: [97, 158], hD: [108, 136], aim: DN, pull: 0, arrow: false, fL: [-3, 0], fR: [3, 0], sway: 0.5, flare: 0.6 },
    { hB: [112, 154], hD: [76, 150], aim: 1.0, pull: 0, arrow: false, fL: [-2, 0], fR: [2, 0], sway: 0.3, flare: 0.2 },
  ][a]);
  else Object.assign(p, [
    { ry: -1, hB: [118, 134], hD: null, aim: -1.1, pull: 0.35, arrow: true, bl: 0, fL: [-2, 0], fR: [2, 0] },
    { ry: -2, hB: [119, 131], hD: null, aim: -1.1, pull: 1, arrow: true, bl: 0, fL: [-3, 0], fR: [3, 0] },
    { ry: -2, hB: [120, 130], hD: [106, 150], aim: -1.1, pull: 0, arrow: false, bl: 0, fL: [-3, 0], fR: [3, 0], sway: 0.5, flare: 0.6 },
    { hB: [121, 146], hD: [74, 150], aim: -0.3, pull: 0, arrow: false, fL: [-2, 0], fR: [2, 0], sway: 0.3, flare: 0.2 },
  ][a]);
  return p;
}

// ---------- 弓 ----------
/** 搭箭點（拉弦的手所在的位置） */
function nock(h: P, aim: number, pull: number): P { return [h[0] - Math.cos(aim) * (3 + pull * 14), h[1] - Math.sin(aim) * (3 + pull * 14)]; }
/** 反曲弓：弓身垂直於瞄準方向，兩端往前翹；拉弓時弓身更彎、弦往後 */
let HAS_BOW = true; // 沒裝弓（空手或拿匕首）時不畫弓，只留姿勢
function bow(c: CanvasRenderingContext2D, h: P, aim: number, pull: number, arrow: boolean, C: APal) {
  if (!HAS_BOW) return;
  const d: P = [Math.cos(aim), Math.sin(aim)], n: P = [-d[1], d[0]], R = 25 - pull * 2;
  const pt = (t: number): P => { const curve = (1 - t * t) * (7 + pull * 3) + Math.max(0, Math.abs(t) - 0.78) * 22; return [h[0] + n[0] * R * t + d[0] * (curve - 7), h[1] + n[1] * R * t + d[1] * (curve - 7)]; };
  const pts: P[] = []; for (let i = -10; i <= 10; i++) pts.push(pt(i / 10));
  const path = () => { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke(); };
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = OUT; c.lineWidth = 6; path(); c.strokeStyle = css(C.wood); c.lineWidth = 4; path();
  c.strokeStyle = css(shade(C.wood, 0.45)); c.lineWidth = 1; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0] + d[0], q[1] + d[1]) : c.moveTo(q[0] + d[0], q[1] + d[1]))); c.stroke();
  seg(c, pt(-0.14), pt(0.14), 4.5, shade(C.leather, -0.15));                                   // 握把的皮革
  ell(c, pts[0][0], pts[0][1], 2, 2, hex('#e8b838')); ell(c, pts[20][0], pts[20][1], 2, 2, hex('#e8b838'));
  const k = nock(h, aim, pull);
  ln(c, pts[0], k, 1.2, '#f4f0e0'); ln(c, pts[20], k, 1.2, '#f4f0e0');                         // 弦
  if (arrow) {
    const tip: P = [h[0] + d[0] * 22, h[1] + d[1] * 22];
    ln(c, k, tip, 3.4, OUT); ln(c, k, tip, 1.6, hex('#e8d8b0'));
    poly(c, [[tip[0] + n[0] * 3.4, tip[1] + n[1] * 3.4], [tip[0] + d[0] * 8, tip[1] + d[1] * 8], [tip[0] - n[0] * 3.4, tip[1] - n[1] * 3.4]], hex('#dfe6f2'), 1.5);
    for (const s of [1, -1]) poly(c, [[k[0] + d[0] * 1, k[1] + d[1] * 1], [k[0] - d[0] * 3 + n[0] * 4 * s, k[1] - d[1] * 3 + n[1] * 4 * s], [k[0] + d[0] * 6, k[1] + d[1] * 6]], C.accent, 1.2);
  }
}

// ---------- 部位 ----------
function arm(c: CanvasRenderingContext2D, sh: P, hand: P, bend: number, C: APal, dark = false) {
  const dx = hand[0] - sh[0], dy = hand[1] - sh[1], len = Math.hypot(dx, dy) || 1, k = Math.max(0, 1 - len / 34) * 9 + 2;
  const el: P = [sh[0] + dx * 0.5 + (-dy / len) * k * bend, sh[1] + dy * 0.5 + (dx / len) * k * bend];
  const sk = dark ? shade(C.skin, -0.2) : C.skin;
  seg(c, el, hand, 5.5, sk);
  seg(c, sh, el, 7, dark ? shade(C.cloth, -0.3) : C.cloth);
  ln(c, lerp(el, hand, 0.25), lerp(el, hand, 0.72), 6.5, dark ? shade(C.leather, -0.3) : C.leather);       // 皮護腕
  ln(c, lerp(el, hand, 0.25), lerp(el, hand, 0.33), 6.5, shade(C.leather, 0.35));
  ell(c, hand[0], hand[1], 4.2, 4.2, sk);
}
/** 腿：褲子＋翻邊長靴；toe 腳尖方向（0 正面、−1 朝左） */
function leg(c: CanvasRenderingContext2D, hip: P, foot: P, C: APal, toe: number, dark = false) {
  const knee: P = [hip[0] + (foot[0] - hip[0]) * 0.42 + toe * 2, hip[1] + (foot[1] - 5 - hip[1]) * 0.42];
  const boot = dark ? shade(C.boot, -0.25) : C.boot;
  seg(c, hip, knee, 7.5, dark ? shade(C.pants, -0.25) : C.pants);
  seg(c, knee, [foot[0], foot[1] - 5], 7.5, boot);
  ln(c, [knee[0] - 4.5, knee[1]], [knee[0] + 4.5, knee[1]], 3, shade(boot, 0.4));                           // 靴口翻邊
  const y = foot[1];
  if (toe) poly(c, [[foot[0] - 9, y - 4], [foot[0] + 4, y - 6], [foot[0] + 5, y], [foot[0] - 10, y]], boot);
  else poly(c, [[foot[0] - 6, y - 5], [foot[0] + 6, y - 5], [foot[0] + 7, y], [foot[0] - 7, y]], boot);
  px(c, foot[0] - (toe ? 8 : 5), y - 1, toe ? 12 : 11, 1, shade(boot, -0.5));
}
function eyeA(c: CanvasRenderingContext2D, x: number, y0: number, C: APal, inner: number) {
  px(c, x - 4, y0, 8, 12, OUT); px(c, x - 3, y0 + 2, 6, 9, '#ffffff');
  px(c, x - 3, y0 + 3, 5, 8, shade(C.eye, -0.35)); px(c, x - 3, y0 + 6, 5, 5, C.eye); px(c, x - 2, y0 + 9, 3, 2, shade(C.eye, 0.5));
  px(c, x - 2, y0 + 5, 3, 4, '#140c18'); px(c, x - 3, y0 + 3, 2, 3, '#ffffff'); px(c, x + 1, y0 + 9, 1, 1, '#ffffff');
  px(c, x - 5, y0, 10, 2, OUT);
  c.strokeStyle = css(shade(C.hair, -0.45)); c.lineWidth = 1.6; c.lineCap = 'butt'; c.beginPath(); c.moveTo(x + inner * 5, y0 - 4); c.lineTo(x - inner * 5, y0 - 6); c.stroke();
}
/** 箭筒露出來的箭羽（正面看是從肩膀後面冒出來） */
function fletch(c: CanvasRenderingContext2D, x: number, y: number, C: APal) {
  for (const [dx, dy] of [[0, 0], [5, -3], [-4, -2]]) { ln(c, [x + dx, y + dy + 8], [x + dx, y + dy - 2], 2.4, OUT); ln(c, [x + dx, y + dy + 8], [x + dx, y + dy - 2], 1, hex('#e8d8b0')); poly(c, [[x + dx - 3, y + dy + 2], [x + dx, y + dy - 6], [x + dx + 3, y + dy + 2]], dx ? shade(C.accent, 0.5) : C.accent, 1.2); }
}
/** 頭上的東西：羽毛帽（弓箭手）、頭帶（遊俠）、兜帽＋發光護目帶（狙擊手）。dir：0 正面、1 側面、3 背面 */
function headgear(c: CanvasRenderingContext2D, L: Look, hx: number, hy: number, dir: number, C: APal, sway: number) {
  if (L.hat === 'huntmask') {
    const hood = shade(C.cloth, -0.1);
    if (dir === 1) poly(c, [[hx - 22, hy - 16], [hx - 12, hy - 34], [hx + 8, hy - 38], [hx + 28, hy - 26], [hx + 36, hy - 4], [hx + 30, hy + 20], [hx + 14, hy + 28], [hx + 6, hy + 14], [hx + 2, hy - 8], [hx - 10, hy - 12]], hood);
    else if (dir === 3) poly(c, [[hx - 34, hy + 14], [hx - 35, hy - 10], [hx - 26, hy - 30], [hx - 8, hy - 39], [hx + 8, hy - 39], [hx + 26, hy - 30], [hx + 35, hy - 10], [hx + 34, hy + 14], [hx + 22, hy + 30], [hx, hy + 36], [hx - 22, hy + 30]], hood);
    else { poly(c, [[hx - 30, hy + 20], [hx - 36, hy - 8], [hx - 27, hy - 29], [hx - 8, hy - 39], [hx + 8, hy - 39], [hx + 27, hy - 29], [hx + 36, hy - 8], [hx + 30, hy + 20], [hx + 25, hy + 6], [hx + 22, hy - 12], [hx, hy - 20], [hx - 22, hy - 12], [hx - 25, hy + 6]], hood); }
    if (dir === 3) { ln(c, [hx, hy - 36], [hx, hy + 32], 1, shade(hood, -0.4)); return; }
    const x0 = dir === 1 ? hx - 28 : hx - 30, x1 = dir === 1 ? hx + 4 : hx + 30;
    px(c, x0, hy - 13, x1 - x0, 6, OUT); px(c, x0 + 1, hy - 12, x1 - x0 - 2, 4, C.accent); px(c, x0 + 1, hy - 12, x1 - x0 - 2, 1, '#ffffff');
    return;
  }
  if (L.hat === 'band') {
    if (dir === 1) poly(c, [[hx - 29, hy - 12], [hx - 12, hy - 19], [hx + 10, hy - 19], [hx + 31, hy - 10], [hx + 31, hy - 5], [hx + 10, hy - 14], [hx - 12, hy - 14], [hx - 29, hy - 7]], C.accent);
    else poly(c, [[hx - 33, hy - 12], [hx - 16, hy - 18], [hx + 16, hy - 18], [hx + 33, hy - 12], [hx + 33, hy - 7], [hx + 16, hy - 13], [hx - 16, hy - 13], [hx - 33, hy - 7]], C.accent);
    return;
  }
  // 羽毛帽：帽身往後收尖，帽簷前端翹起，旁邊插一根羽毛
  const cap = shade(C.cloth, -0.08), fx = dir === 1 ? hx + 12 : hx + 16, fy = hy - 30;
  poly(c, [[fx - 3, fy + 4], [fx + 6 + sway * 2, fy - 16], [fx + 18 + sway * 3, fy - 30], [fx + 22 + sway * 3, fy - 20], [fx + 14 + sway * 2, fy - 4], [fx + 6, fy + 6]], C.accent);      // 羽毛
  ln(c, [fx, fy + 3], [fx + 18 + sway * 3, fy - 26], 1, shade(C.accent, 0.5));
  if (dir === 1) {
    poly(c, [[hx - 34, hy - 12], [hx - 22, hy - 24], [hx - 6, hy - 38], [hx + 14, hy - 42], [hx + 36, hy - 34], [hx + 44, hy - 24], [hx + 30, hy - 14], [hx + 6, hy - 12], [hx - 14, hy - 10]], cap);
    poly(c, [[hx - 38, hy - 9], [hx - 14, hy - 17], [hx + 14, hy - 17], [hx + 30, hy - 14], [hx + 12, hy - 9], [hx - 16, hy - 8]], shade(cap, -0.25));
  } else {
    poly(c, [[hx - 31, hy - 14], [hx - 26, hy - 30], [hx - 10, hy - 42], [hx + 8, hy - 44], [hx + 24, hy - 36], [hx + 32, hy - 22], [hx + 31, hy - 14], [hx, hy - 19]], cap);
    if (dir === 0) poly(c, [[hx - 36, hy - 10], [hx - 30, hy - 18], [hx, hy - 23], [hx + 30, hy - 18], [hx + 36, hy - 10], [hx + 16, hy - 13], [hx, hy - 15], [hx - 16, hy - 13]], shade(cap, -0.25));
    else poly(c, [[hx - 34, hy - 10], [hx - 30, hy - 17], [hx + 30, hy - 17], [hx + 34, hy - 10], [hx, hy - 13]], shade(cap, -0.25));
  }
  fillPoly(c, dir === 1 ? [[hx - 18, hy - 24], [hx - 6, hy - 34], [hx + 2, hy - 35], [hx - 10, hy - 24]] : [[hx - 24, hy - 22], [hx - 20, hy - 31], [hx - 9, hy - 38], [hx - 4, hy - 37], [hx - 15, hy - 28], [hx - 18, hy - 21]], shade(cap, 0.35));
}

// ---------- 正面 ----------
function front(c: CanvasRenderingContext2D, f: number, L: Look, C: APal) {
  const p = apose(0, f), sh = AX + p.rx + p.tw, hip = AX + p.rx * 0.6, ty = 129 + p.ry;
  const hD: P = p.hD || nock(p.hB, p.aim, p.pull), hooded = L.hat === 'huntmask';
  if (C.cape) { // 短披風：只到腰下
    const s = p.sway, fl = p.flare;
    poly(c, [[sh - 14, ty + 2], [sh - 23 + s * 2 - fl * 8, ty + 22 - fl * 4], [hip - 20 + s * 3 - fl * 11, 166 - fl * 10], [hip - 11 + s * 2, 168 - fl * 3], [hip - 9, ty + 12]], shade(C.cape, -0.12));
    poly(c, [[sh + 14, ty + 2], [sh + 23 + s * 2 + fl * 8, ty + 22 - fl * 4], [hip + 20 + s * 3 + fl * 11, 166 - fl * 10], [hip + 11 + s * 2, 168 - fl * 3], [hip + 9, ty + 12]], shade(C.cape, -0.12));
  }
  fletch(c, sh - 17, ty - 4, C);
  leg(c, [hip - 7, ty + 33], [AX - 8 + p.fL[0], FOOT - p.fL[1]], C, 0);
  leg(c, [hip + 7, ty + 33], [AX + 8 + p.fR[0], FOOT - p.fR[1]], C, 0);
  // 上衣：下襬是鋸齒形
  poly(c, [[sh - 15, ty], [sh + 15, ty], [hip + 13, ty + 22], [hip + 16, ty + 36], [hip + 9, ty + 32], [hip + 4, ty + 38], [hip - 2, ty + 32], [hip - 8, ty + 38], [hip - 12, ty + 32], [hip - 16, ty + 36], [hip - 13, ty + 22]], C.cloth);
  fillPoly(c, [[sh - 12, ty + 3], [sh - 8, ty + 3], [hip - 9, ty + 20], [hip - 12, ty + 20]], shade(C.cloth, 0.3));
  poly(c, [[sh - 12, ty + 1], [sh - 4, ty + 1], [sh, ty + 9], [sh + 4, ty + 1], [sh + 12, ty + 1], [hip + 11, ty + 21], [hip - 11, ty + 21]], C.leather);            // 皮背心（V 領）
  ln(c, [sh, ty + 10], [hip, ty + 20], 1, shade(C.leather, -0.45)); px(c, sh - 1, ty + 12, 2, 2, hex('#e8b838')); px(c, sh - 1, ty + 16, 2, 2, hex('#e8b838'));
  ln(c, [sh - 12, ty + 2], [hip + 10, ty + 20], 3, shade(C.leather, -0.35)); ln(c, [sh - 12, ty + 1.5], [hip + 10, ty + 19.5], 1, shade(C.leather, 0.3));             // 箭筒的背帶
  px(c, hip - 13, ty + 21, 26, 5, OUT); px(c, hip - 12, ty + 22, 24, 3, shade(C.leather, -0.3)); px(c, hip - 3, ty + 21, 6, 5, OUT); px(c, hip - 2, ty + 22, 4, 3, hex('#e8b838'));
  poly(c, [[hip + 6, ty + 25], [hip + 13, ty + 25], [hip + 13, ty + 33], [hip + 6, ty + 33]], shade(C.leather, 0.1), 1.5);                                             // 腰包
  if (C.scarf) poly(c, [[sh - 13, ty - 3], [sh + 13, ty - 3], [sh + 14, ty + 5], [sh + 22 + p.sway * 3 + p.flare * 6, ty + 18 - p.flare * 8], [sh + 14 + p.sway * 2, ty + 20 - p.flare * 4], [sh + 6, ty + 7], [sh - 14, ty + 5]], C.scarf);
  if (p.bl === 0) bow(c, p.hB, p.aim, p.pull, p.arrow, C);
  // 頭
  const hx = sh + p.tw * 0.3, hy = 95 + p.ry;
  px(c, hx - 5, hy + 22, 10, 9, OUT); px(c, hx - 4, hy + 22, 8, 8, shade(C.skin, -0.18));
  // 後面的馬尾（從右後方垂下來）
  if (!hooded) merged(c, [[[hx + 20, hy - 14], [hx + 36 + p.sway * 2 + p.flare * 4, hy - 4], [hx + 40 + p.sway * 3 + p.flare * 6, hy + 16 - p.flare * 6], [hx + 34 + p.sway * 3, hy + 30 - p.flare * 6], [hx + 28 + p.sway * 2, hy + 18], [hx + 24, hy + 4]]], shade(C.hair, -0.15));
  if (!hooded) merged(c, [[[hx - 33, hy - 10], [hx - 28, hy - 28], [hx - 12, hy - 36], [hx + 12, hy - 36], [hx + 28, hy - 28], [hx + 33, hy - 10], [hx + 34, hy + 8], [hx - 34, hy + 8]]], shade(C.hair, -0.12));
  ell(c, hx, hy + 2, 29.5, 26.5, C.skin);
  px(c, hx - 21, hy + 4, 4, 2, shade(C.skin, 0.4));
  eyeA(c, hx - 12, hy + 4, C, 1); eyeA(c, hx + 12, hy + 4, C, -1);
  px(c, hx - 18, hy + 19, 6, 2, 'rgba(240,110,120,0.45)'); px(c, hx + 12, hy + 19, 6, 2, 'rgba(240,110,120,0.45)');
  px(c, hx, hy + 16, 1, 2, shade(C.skin, -0.25)); px(c, hx - 3, hy + 22, 6, 1, shade(C.skin, -0.55)); px(c, hx + 3, hy + 21, 1, 1, shade(C.skin, -0.55));
  // 前髮：往一邊撥的瀏海＋兩側鬢角
  merged(c, [[
    [hx - 31, hy + 10], [hx - 34, hy - 8], [hx - 27, hy - 26], [hx - 12, hy - 35], [hx + 12, hy - 35], [hx + 27, hy - 26], [hx + 34, hy - 8], [hx + 31, hy + 10],
    [hx + 26, hy + 12], [hx + 24, hy - 3], [hx + 16, hy + 4], [hx + 10, hy - 5], [hx + 2, hy + 2], [hx - 8, hy - 6], [hx - 18, hy + 5], [hx - 24, hy - 3], [hx - 26, hy + 12],
  ]], C.hair);
  const dk = shade(C.hair, -0.4);
  ln(c, [hx + 10, hy - 5], [hx + 13, hy - 16], 1, dk); ln(c, [hx - 8, hy - 6], [hx - 12, hy - 17], 1, dk); ln(c, [hx + 24, hy - 3], [hx + 27, hy + 8], 1, dk);
  headgear(c, L, hx, hy, 0, C, p.sway + p.flare);
  // 手與弓
  arm(c, [sh - 16, ty + 5], hD, -1, C);
  arm(c, [sh + 16, ty + 5], p.hB, 1, C);
  if (p.bl === 2) { bow(c, p.hB, p.aim, p.pull, p.arrow, C); ell(c, p.hB[0], p.hB[1], 4.2, 4.2, C.skin); if (p.arrow) ell(c, hD[0], hD[1], 3.8, 3.8, C.skin); }
}

// ---------- 側面（面向左） ----------
function sideView(c: CanvasRenderingContext2D, f: number, L: Look, C: APal) {
  const p = apose(1, f), cx = AX + p.rx + p.tw, hip = AX + p.rx * 0.7, ty = 129 + p.ry;
  const hD: P = p.hD || nock(p.hB, p.aim, p.pull), hooded = L.hat === 'huntmask';
  if (C.cape) { const s = p.sway, fl = p.flare; poly(c, [[cx + 1, ty + 1], [cx + 11, ty + 2], [cx + 19 + s * 4 + fl * 14, ty + 20 - fl * 8], [hip + 21 + s * 5 + fl * 20, 164 - fl * 18], [hip + 12 + s * 3 + fl * 10, 168 - fl * 8], [hip + 6, ty + 20]], C.cape); }
  // 箭筒：斜背在背後
  poly(c, [[cx + 6, ty + 2], [cx + 14, ty - 2], [cx + 20, ty + 22], [cx + 12, ty + 26]], C.leather);
  fletch(c, cx + 11, ty - 8, C);
  // 遠側的手：射箭時是握弓的手（往前伸），其餘時候垂在身後
  const drawing = p.arrow || f === 8;
  arm(c, [cx + 3, ty + 6], drawing ? p.hB : hD, 1, C, true);
  leg(c, [hip + 1, ty + 33], [AX + 2 + p.fR[0], FOOT - p.fR[1]], C, -1, true);
  leg(c, [hip - 1, ty + 33], [AX - 2 + p.fL[0], FOOT - p.fL[1]], C, -1);
  poly(c, [[cx - 9, ty], [cx + 10, ty], [hip + 10, ty + 22], [hip + 12, ty + 36], [hip + 5, ty + 32], [hip, ty + 38], [hip - 6, ty + 32], [hip - 12, ty + 36], [hip - 9, ty + 22], [cx - 12, ty + 11]], C.cloth);
  poly(c, [[cx - 10, ty + 1], [cx + 6, ty + 1], [hip + 6, ty + 21], [hip - 8, ty + 21], [cx - 12, ty + 11]], C.leather);
  ln(c, [cx - 8, ty + 3], [cx + 8, ty + 18], 3, shade(C.leather, -0.35));
  px(c, hip - 10, ty + 21, 21, 5, OUT); px(c, hip - 9, ty + 22, 19, 3, shade(C.leather, -0.3)); px(c, hip - 8, ty + 22, 4, 3, hex('#e8b838'));
  if (C.scarf) poly(c, [[cx - 11, ty - 3], [cx + 10, ty - 3], [cx + 24 + p.sway * 4 + p.flare * 10, ty + 8 - p.flare * 8], [cx + 28 + p.sway * 5 + p.flare * 12, ty + 20 - p.flare * 12], [cx + 16 + p.sway * 3, ty + 14 - p.flare * 4], [cx + 8, ty + 6], [cx - 12, ty + 5]], C.scarf);
  // 頭
  const hx = cx - 3 + p.tw * 0.3, hy = 95 + p.ry;
  px(c, hx - 2, hy + 22, 10, 9, OUT); px(c, hx - 1, hy + 22, 8, 8, shade(C.skin, -0.18));
  if (!hooded) merged(c, [
    [[hx + 24, hy - 14], [hx + 44 + p.sway * 3 + p.flare * 8, hy - 8 - p.flare * 6], [hx + 50 + p.sway * 4 + p.flare * 10, hy + 12 - p.flare * 12], [hx + 44 + p.sway * 4 + p.flare * 6, hy + 30 - p.flare * 14], [hx + 36 + p.sway * 2, hy + 14], [hx + 28, hy + 2]],
    [[hx - 22, hy - 22], [hx - 8, hy - 35], [hx + 14, hy - 34], [hx + 30, hy - 18], [hx + 33, hy + 4], [hx + 24, hy + 20], [hx + 10, hy + 22], [hx + 4, hy + 6], [hx - 20, hy + 2]],
  ], shade(C.hair, -0.12));
  ell(c, hx - 2, hy + 2, 26, 26, C.skin);
  px(c, hx - 30, hy + 13, 3, 4, OUT); px(c, hx - 29, hy + 14, 3, 2, C.skin);
  eyeA(c, hx - 16, hy + 4, C, 1);
  px(c, hx - 21, hy + 19, 6, 2, 'rgba(240,110,120,0.45)'); px(c, hx - 25, hy + 22, 4, 1, shade(C.skin, -0.55));
  merged(c, [[
    [hx - 26, hy - 5], [hx - 28, hy - 14], [hx - 20, hy - 28], [hx - 6, hy - 35], [hx + 12, hy - 35], [hx + 26, hy - 24], [hx + 32, hy - 6], [hx + 30, hy + 12], [hx + 20, hy + 20],
    [hx + 10, hy + 18], [hx + 8, hy + 4], [hx + 4, hy + 14], [hx, hy - 1], [hx - 6, hy - 8], [hx - 12, hy], [hx - 17, hy - 9], [hx - 22, hy - 1],
  ]], C.hair);
  const dk = shade(C.hair, -0.4);
  ln(c, [hx - 6, hy - 8], [hx - 4, hy - 19], 1, dk); ln(c, [hx - 17, hy - 9], [hx - 17, hy - 19], 1, dk); ln(c, [hx + 8, hy + 4], [hx + 14, hy - 8], 1, dk);
  if (!hooded) ell(c, hx + 27, hy - 10, 4, 4, C.accent);                                              // 綁馬尾的髮圈
  headgear(c, L, hx, hy, 1, C, p.sway + p.flare);
  // 近側的手：射箭時是拉弦的手
  if (drawing) { bow(c, p.hB, p.aim, p.pull, p.arrow, C); ell(c, p.hB[0], p.hB[1], 4.2, 4.2, shade(C.skin, -0.2)); arm(c, [cx, ty + 6], hD, -1, C); }
  else { arm(c, [cx, ty + 6], p.hB, -1, C); bow(c, p.hB, p.aim, p.pull, p.arrow, C); ell(c, p.hB[0], p.hB[1], 4.2, 4.2, C.skin); }
}

// ---------- 背面 ----------
function backView(c: CanvasRenderingContext2D, f: number, L: Look, C: APal) {
  const p = apose(3, f), sh = AX + p.rx + p.tw, hip = AX + p.rx * 0.6, ty = 129 + p.ry;
  const hD: P = p.hD || nock(p.hB, p.aim, p.pull), hooded = L.hat === 'huntmask';
  if (p.bl === 0) bow(c, p.hB, p.aim, p.pull, p.arrow, C);
  leg(c, [hip - 7, ty + 33], [AX - 8 + p.fL[0], FOOT - p.fL[1]], C, 0);
  leg(c, [hip + 7, ty + 33], [AX + 8 + p.fR[0], FOOT - p.fR[1]], C, 0);
  poly(c, [[sh - 15, ty], [sh + 15, ty], [hip + 13, ty + 22], [hip + 16, ty + 36], [hip + 9, ty + 32], [hip + 4, ty + 38], [hip - 2, ty + 32], [hip - 8, ty + 38], [hip - 12, ty + 32], [hip - 16, ty + 36], [hip - 13, ty + 22]], C.cloth);
  px(c, hip - 13, ty + 21, 26, 5, OUT); px(c, hip - 12, ty + 22, 24, 3, shade(C.leather, -0.3));
  arm(c, [sh - 16, ty + 5], p.bl === 0 ? [sh - 22, ty + 28] : hD, 1, C);
  arm(c, [sh + 16, ty + 5], p.hB, -1, C);
  if (C.cape) { // 短披風蓋住上半身
    const s = p.sway, fl = p.flare;
    poly(c, [[sh - 15, ty], [sh + 15, ty], [hip + 19 + s * 2 + fl * 6, 163 - fl * 6], [hip + 10 + s * 2, 168 - fl * 2], [hip + s, 164 - fl * 3], [hip - 10 + s * 2, 168 - fl * 2], [hip - 19 + s * 2 - fl * 6, 163 - fl * 6]], C.cape);
    ln(c, [sh - 5, ty + 8], [hip - 6 + s * 2, 162], 1, shade(C.cape, -0.4)); ln(c, [sh + 6, ty + 8], [hip + 7 + s * 2, 162], 1, shade(C.cape, -0.4));
    fillPoly(c, [[sh - 13, ty + 3], [sh - 9, ty + 3], [hip - 13 + s * 2, 160], [hip - 17 + s * 2, 160]], shade(C.cape, 0.3));
  }
  // 箭筒：斜背在背上，箭羽從右肩露出來
  poly(c, [[sh - 4, ty + 26], [sh + 5, ty + 30], [sh + 17, ty + 4], [sh + 8, ty]], C.leather);
  ln(c, [sh - 2, ty + 22], [sh + 6, ty + 25], 2, shade(C.leather, 0.35)); ln(c, [sh + 4, ty + 10], [sh + 12, ty + 13], 2, shade(C.leather, 0.35));
  fletch(c, sh + 15, ty - 6, C);
  if (C.scarf) poly(c, [[sh - 14, ty - 3], [sh + 14, ty - 3], [sh + 15, ty + 5], [sh - 4, ty + 6], [sh - 14 - p.sway * 3 - p.flare * 6, ty + 22 - p.flare * 8], [sh - 22 - p.sway * 3 - p.flare * 8, ty + 18 - p.flare * 8], [sh - 15, ty + 5]], C.scarf);
  if (p.bl === 0 && p.hD === null) arm(c, [sh + 16, ty + 5], hD, 1, C);                                     // 拉弦的手在背後看得到
  // 頭
  const hx = sh + p.tw * 0.3, hy = 95 + p.ry;
  if (!hooded) {
    merged(c, [
      [[hx - 33, hy - 8], [hx - 28, hy - 27], [hx - 12, hy - 36], [hx + 12, hy - 36], [hx + 28, hy - 27], [hx + 33, hy - 8], [hx + 32, hy + 8], [hx + 24, hy + 18], [hx + 10, hy + 21], [hx - 10, hy + 21], [hx - 24, hy + 18], [hx - 32, hy + 8]],
      [[hx - 5, hy - 2], [hx + 5, hy - 2], [hx + 7 + p.sway * 2, hy + 20], [hx + 6 + p.sway * 4 + p.flare * 6, hy + 36 - p.flare * 8], [hx + p.sway * 4 + p.flare * 5, hy + 43 - p.flare * 10], [hx - 6 + p.sway * 3, hy + 34 - p.flare * 6], [hx - 7 + p.sway * 2, hy + 20]],
    ], C.hair);
    const dk = shade(C.hair, -0.4);
    ln(c, [hx - 15, hy - 2], [hx - 15, hy + 16], 1, dk); ln(c, [hx + 15, hy - 2], [hx + 15, hy + 16], 1, dk); ln(c, [hx, hy + 8], [hx + p.sway * 3, hy + 38], 1, dk);
    ell(c, hx, hy - 1, 4.5, 4, C.accent);
  }
  headgear(c, L, hx, hy, 3, C, p.sway + p.flare);
  if (p.bl === 2) { bow(c, p.hB, p.aim, p.pull, p.arrow, C); ell(c, p.hB[0], p.hB[1], 4.2, 4.2, C.skin); }
}

export function drawArcher(c: CanvasRenderingContext2D, dir: number, f: number, L: Look) {
  const C = apal(L); HAS_BOW = (L.weapon || 'none') === 'bow';
  if (dir === 1) sideView(c, f, L, C); else if (dir === 3) backView(c, f, L, C); else front(c, f, L, C);
}
