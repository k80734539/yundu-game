import { RGB, hex, css, shade } from './pixel';
import type { Look } from '../data';
import { P, OUT, AX, FOOT, WALK, poly, fillPoly, merged, ell, seg, ln, px } from './KnightArt';

/**
 * 法師系的專用畫法（look.style === 'mage'）：大巫師帽、長髮、斗篷披肩、長袍、有寶珠的法杖。
 * 規格與一般人形相同（192×192、腳底 (96,186)、下／左／上三方向、10 格）。
 * 攻擊四格同時也是詠唱動作（詠唱中在第 6、7 格之間來回）：舉杖 → 舉到最高、寶珠發光 → 法杖往前指（放出魔法）→ 收回。
 */
interface MPal { skin: RGB; hair: RGB; cloth: RGB; trim: RGB; cape: RGB; hat: RGB; gem: RGB; wood: RGB; eye: RGB; boot: RGB }
function mpal(L: Look): MPal {
  const cloth = hex(L.cloth || '#6a4ab0');
  return { skin: hex(L.skin || '#f8e0c8'), hair: hex(L.hair || '#c87ad0'), cloth, trim: hex(L.cloth2 || '#e8c050'), cape: L.cape ? hex(L.cape) : shade(cloth, -0.28),
    hat: shade(cloth, -0.12), gem: hex(L.gem || '#ff6ab0'), wood: hex('#8a5a30'), eye: hex(L.eye || '#7a4ab8'), boot: hex('#5a3a2a') };
}
interface MPose {
  rx: number; ry: number; tw: number;
  hR: P; hL: P;            // 拿法杖的手、另一隻手
  sa: number;              // 法杖方向（從手指向寶珠）
  sl: 0 | 2;               // 法杖圖層：0 在身體後面、2 在最前面
  armBack: boolean;
  hem: number;             // 袍子下襬的擺動
  lift: number;            // 詠唱時頭髮與帽子被魔力吹起（0~1）
  glow: number;            // 寶珠發光（0~2）
  fL: number; fR: number;  // 兩腳抬高
}
const UP = -Math.PI / 2;
function mpose(dir: number, f: number): MPose {
  const side = dir === 1, back = dir === 3;
  const p: MPose = { rx: 0, ry: 0, tw: 0, hR: [0, 0], hL: [0, 0], sa: UP, sl: 2, armBack: false, hem: 0, lift: 0, glow: 0, fL: 0, fR: 0 };
  if (f < 6) {
    const w = f >= 2 ? WALK[f - 2] : null;
    p.ry = w ? w.bob : f === 1 ? 1 : 0; p.hem = w ? w.a * 2.2 : f === 1 ? 0.5 : 0;
    if (w) { p.fL = w.liftL; p.fR = w.liftR; }
    if (side) { p.hR = [AX - 18 + (w ? w.a * 2 : 0), 157 + p.ry]; p.hL = [AX + 3, 152 + p.ry]; p.sa = UP - 0.3; p.hem = w ? 1 + Math.abs(w.a) * 1.5 : p.hem; }
    else { p.hR = [125, 150 + p.ry + (w ? w.a : 0)]; p.hL = [71, 152 + p.ry - (w ? w.a * 2 : 0)]; p.sa = UP + 0.06; }
    return p;
  }
  const a = f - 6;
  if (side) Object.assign(p, [
    { ry: -1, hR: [AX - 30, 145], hL: [AX - 9, 146], sa: UP - 0.25, lift: 0.4, glow: 1, hem: 0.5 },
    { ry: -2, hR: [AX - 31, 135], hL: [AX - 11, 138], sa: UP - 0.2, lift: 1, glow: 2, hem: 1.5 },
    { rx: -4, ry: 2, tw: -3, hR: [AX - 28, 144], hL: [AX + 2, 150], sa: 2.9, lift: 0.3, glow: 1.4, hem: 3 },
    { rx: -2, ry: 1, tw: -1, hR: [AX - 19, 148], hL: [AX + 2, 152], sa: -2.25, lift: 0, glow: 0.4, hem: 2 },
  ][a]);
  else if (!back) Object.assign(p, [
    { ry: -1, hR: [125, 139], hL: [69, 141], sa: UP + 0.04, lift: 0.4, glow: 1, hem: 0.5 },
    { ry: -2, hR: [126, 129], hL: [67, 131], sa: UP - 0.06, lift: 1, glow: 2, hem: 1 },
    { rx: -1, ry: 2, tw: -2, hR: [106, 149], hL: [70, 147], sa: 2.38, lift: 0.3, glow: 1.4, hem: -2 },
    { ry: 1, tw: -1, hR: [119, 150], hL: [71, 151], sa: -1.15, lift: 0, glow: 0.4, hem: -1 },
  ][a]);
  else Object.assign(p, [
    { ry: -1, hR: [125, 139], hL: [69, 141], sa: UP + 0.04, lift: 0.4, glow: 1, hem: 0.5 },
    { ry: -2, hR: [126, 129], hL: [67, 131], sa: UP - 0.06, lift: 1, glow: 2, hem: 1 },
    { rx: -1, ry: -2, tw: -2, hR: [82, 133], hL: [70, 148], sa: -2.5, sl: 0, armBack: true, lift: 0.3, glow: 1.4, hem: -2 },
    { ry: -1, tw: -1, hR: [118, 146], hL: [71, 151], sa: UP - 0.5, lift: 0, glow: 0.4, hem: -1 },
  ][a]);
  return p;
}

// ---------- 部位 ----------
/** 法杖：木柄＋金色托座＋寶珠；glow 越大寶珠越亮，並畫出星芒 */
function staff(c: CanvasRenderingContext2D, h: P, ang: number, C: MPal, glow: number) {
  const d: P = [Math.cos(ang), Math.sin(ang)], n: P = [-d[1], d[0]];
  const at = (t: number, s = 0): P => [h[0] + d[0] * t + n[0] * s, h[1] + d[1] * t + n[1] * s];
  seg(c, at(-28), at(30), 3.4, C.wood);
  ln(c, at(-26, -1), at(28, -1), 1, shade(C.wood, 0.4));
  ln(c, at(-18, -2), at(-18, 2), 1.5, shade(C.wood, -0.45)); ln(c, at(10, -2), at(10, 2), 1.5, shade(C.wood, -0.45));
  // 托座：兩支往外彎的爪
  seg(c, at(28, 0), at(34, 6.5), 3, C.trim); seg(c, at(28, 0), at(34, -6.5), 3, C.trim);
  seg(c, at(34, 6.5), at(41, 6), 2.4, C.trim); seg(c, at(34, -6.5), at(41, -6), 2.4, C.trim);
  ell(c, at(28)[0], at(28)[1], 3, 3, C.trim);
  // 寶珠
  const o = at(38), gem = glow > 0.8 ? shade(C.gem, 0.3 * Math.min(2, glow)) : C.gem;
  if (glow >= 1) { // 星芒（不透明的亮色，因為精靈圖不能有半透明）
    const r = 9 + glow * 3, lt = shade(C.gem, 0.6);
    for (const [ax, ay] of [[1, 0], [0, 1], [0.7, 0.7], [0.7, -0.7]]) ln(c, [o[0] - ax * r, o[1] - ay * r], [o[0] + ax * r, o[1] + ay * r], ax && ay ? 1.5 : 2, lt);
  }
  ell(c, o[0], o[1], 6.2, 6.2, gem);
  c.fillStyle = css(shade(C.gem, -0.3)); c.beginPath(); c.ellipse(o[0] + 1.5, o[1] + 1.8, 4, 3.6, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = css(gem); c.beginPath(); c.ellipse(o[0] - 0.6, o[1] - 0.8, 4.4, 4, 0, 0, Math.PI * 2); c.fill();
  px(c, o[0] - 3, o[1] - 4, 3, 2, '#ffffff'); px(c, o[0] + 2, o[1] + 2, 1, 1, '#ffffff');
}
/** 喇叭袖：肩膀窄、手腕寬，袖口有金邊；最後畫手 */
function sleeve(c: CanvasRenderingContext2D, sh: P, hand: P, C: MPal, dark = false) {
  const dx = hand[0] - sh[0], dy = hand[1] - sh[1], len = Math.hypot(dx, dy) || 1, d: P = [dx / len, dy / len], n: P = [-d[1], d[0]];
  const wr: P = [hand[0] - d[0] * 4, hand[1] - d[1] * 4], col = dark ? shade(C.cloth, -0.3) : C.cloth;
  poly(c, [[sh[0] + n[0] * 4, sh[1] + n[1] * 4], [wr[0] + n[0] * 7.5, wr[1] + n[1] * 7.5], [wr[0] - n[0] * 7.5, wr[1] - n[1] * 7.5], [sh[0] - n[0] * 4, sh[1] - n[1] * 4]], col);
  ln(c, [wr[0] + n[0] * 6.5 - d[0] * 1.5, wr[1] + n[1] * 6.5 - d[1] * 1.5], [wr[0] - n[0] * 6.5 - d[0] * 1.5, wr[1] - n[1] * 6.5 - d[1] * 1.5], 2.4, dark ? shade(C.trim, -0.3) : C.trim);
  ln(c, [sh[0] + d[0] * 4, sh[1] + d[1] * 4], [wr[0] - d[0] * 5, wr[1] - d[1] * 5], 1, shade(col, -0.35));
  ell(c, hand[0], hand[1], 4.2, 4.2, dark ? shade(C.skin, -0.2) : C.skin);
}
/** 大眼睛（比劍士柔和：平的細眉、長睫毛） */
function eyeSoft(c: CanvasRenderingContext2D, x: number, y0: number, C: MPal, out: number) {
  px(c, x - 4, y0, 8, 12, OUT); px(c, x - 3, y0 + 2, 6, 9, '#ffffff');
  px(c, x - 3, y0 + 3, 5, 8, shade(C.eye, -0.35)); px(c, x - 3, y0 + 6, 5, 5, C.eye); px(c, x - 2, y0 + 9, 3, 2, shade(C.eye, 0.5));
  px(c, x - 2, y0 + 5, 3, 4, '#140c18'); px(c, x - 3, y0 + 3, 2, 3, '#ffffff'); px(c, x + 1, y0 + 9, 1, 1, '#ffffff');
  px(c, x - 5, y0, 10, 2, OUT); px(c, x + out * 5 - 1, y0 - 2, 2, 3, OUT);                        // 上睫毛與眼尾
  px(c, x - 4, y0 - 6, 8, 1, shade(C.hair, -0.4));                                                // 細眉
}
/** 巫師帽：寬帽簷＋往一邊折的帽尖；tipDir 是帽尖倒向哪一邊 */
function wizardHat(c: CanvasRenderingContext2D, L: Look, hx: number, hy: number, C: MPal, tipDir: number, wide = 43) {
  const t = tipDir, arch = L.hat === 'archwizard';
  ell(c, hx, hy - 18, wide, 10, shade(C.hat, -0.2));                                                               // 帽簷
  c.fillStyle = css(C.hat); c.beginPath(); c.ellipse(hx, hy - 20, wide - 2, 8, 0, 0, Math.PI * 2); c.fill();
  const top = arch ? 8 : 0;
  poly(c, [[hx - 24, hy - 21], [hx - 18, hy - 44], [hx - 6 * t - 2, hy - 60 - top], [hx + 10 * t, hy - 69 - top], [hx + 24 * t, hy - 66 - top], [hx + 32 * t, hy - 56 - top],
    [hx + 22 * t, hy - 59 - top], [hx + 13 * t, hy - 52 - top], [hx + 19, hy - 38], [hx + 24, hy - 21]], C.hat);
  fillPoly(c, [[hx - 19, hy - 26], [hx - 14, hy - 44], [hx - 4 * t - 2, hy - 57 - top], [hx - 1, hy - 55 - top], [hx - 9, hy - 42], [hx - 13, hy - 26]], shade(C.hat, 0.3));       // 左側亮面
  ln(c, [hx + 12 * t, hy - 52 - top], [hx + 4 * t, hy - 44], 1, shade(C.hat, -0.4));                                // 帽尖的摺痕
  poly(c, [[hx - 25, hy - 22], [hx - 22, hy - 31], [hx, hy - 34], [hx + 22, hy - 31], [hx + 25, hy - 22], [hx, hy - 25]], C.trim);    // 帽帶
  px(c, hx - 20, hy - 30, 10, 1, shade(C.trim, 0.5));
  if (arch) { ell(c, hx, hy - 28, 4, 4, C.gem); px(c, hx - 2, hy - 30, 2, 2, '#ffffff'); poly(c, [[hx + 32 * t, hy - 66 - top], [hx + 37 * t, hy - 58 - top], [hx + 32 * t, hy - 50 - top], [hx + 27 * t, hy - 58 - top]], C.trim, 1.5); }
  else { poly(c, [[hx - 4, hy - 33], [hx + 4, hy - 33], [hx + 5, hy - 25], [hx - 5, hy - 25]], shade(C.trim, 0.35), 1.5); px(c, hx - 2, hy - 31, 4, 4, C.hat); }
}
/** 披肩（斗篷）：蓋住肩膀，下緣是波浪形 */
function capelet(c: CanvasRenderingContext2D, x: number, ty: number, w: number, C: MPal) {
  const k = w / 22;
  poly(c, [[x - 18 * k, ty - 1], [x + 18 * k, ty - 1], [x + 22 * k, ty + 12], [x + 14 * k, ty + 17], [x + 7 * k, ty + 13], [x, ty + 18], [x - 7 * k, ty + 13], [x - 14 * k, ty + 17], [x - 22 * k, ty + 12]], C.cape);
  ln(c, [x - 19 * k, ty + 10], [x - 14 * k, ty + 14], 1.6, C.trim); ln(c, [x + 19 * k, ty + 10], [x + 14 * k, ty + 14], 1.6, C.trim);
  fillPoly(c, [[x - 15 * k, ty + 1], [x - 10 * k, ty + 1], [x - 15 * k, ty + 11], [x - 19 * k, ty + 10]], shade(C.cape, 0.3));
}

// ---------- 正面 ----------
function front(c: CanvasRenderingContext2D, f: number, L: Look, C: MPal) {
  const p = mpose(0, f), sh = AX + p.rx + p.tw, ty = 129 + p.ry, s = p.hem, bx = AX + p.rx * 0.5;
  const hx = sh + p.tw * 0.3, hy = 95 + p.ry, lf = p.lift;
  const S = () => staff(c, p.hR, p.sa, C, p.glow);
  // 後面的長髮（披在肩膀後面，尾端分岔）
  merged(c, [
    [[hx - 27, hy - 6], [hx - 36, hy + 20], [hx - 34 - lf * 3, ty + 27 - lf * 5], [hx - 26 - lf * 2, ty + 19 - lf * 3], [hx - 20, ty + 29 - lf * 4], [hx - 12, hy + 22]],
    [[hx + 27, hy - 6], [hx + 36, hy + 20], [hx + 34 + lf * 3, ty + 27 - lf * 5], [hx + 26 + lf * 2, ty + 19 - lf * 3], [hx + 20, ty + 29 - lf * 4], [hx + 12, hy + 22]],
  ], shade(C.hair, -0.18));
  if (p.sl === 0) S();
  // 靴子尖（從袍子下面露出來）
  ell(c, bx - 8 + s * 0.4, FOOT - 1 - p.fL, 6, 3.4, C.boot); ell(c, bx + 8 + s * 0.4, FOOT - 1 - p.fR, 6, 3.4, C.boot);
  // 長袍：上窄下寬，下襬是波浪形
  poly(c, [[sh - 14, ty], [sh + 14, ty], [bx + 22 + s, 178], [bx + 15 + s, 182], [bx + 7 + s, 178], [bx + s, 182], [bx - 7 + s, 178], [bx - 15 + s, 182], [bx - 22 + s, 178]], C.cloth);
  fillPoly(c, [[sh - 4, ty + 10], [sh + 4, ty + 10], [bx + 6 + s, 177], [bx - 6 + s, 177]], shade(C.cloth, 0.2));                        // 中央的亮色襟片
  ln(c, [sh - 4, ty + 10], [bx - 6 + s, 177], 1.4, C.trim); ln(c, [sh + 4, ty + 10], [bx + 6 + s, 177], 1.4, C.trim);
  ln(c, [sh - 10, ty + 26], [bx - 15 + s, 176], 1, shade(C.cloth, -0.4)); ln(c, [sh + 10, ty + 26], [bx + 15 + s, 176], 1, shade(C.cloth, -0.4));
  fillPoly(c, [[bx - 20 + s * 0.9, 170], [bx + 20 + s * 0.9, 170], [bx + 21 + s, 174], [bx - 21 + s, 174]], C.trim);                      // 下襬金邊
  fillPoly(c, [[sh - 12, ty + 3], [sh - 8, ty + 3], [bx - 14 + s, 168], [bx - 19 + s, 168]], shade(C.cloth, 0.25));
  px(c, sh - 13, ty + 22, 26, 5, OUT); px(c, sh - 12, ty + 23, 24, 3, shade(C.cloth, -0.45)); ell(c, sh, ty + 24.5, 3, 3, C.gem); px(c, sh - 1, ty + 23, 1, 1, '#ffffff');
  capelet(c, sh, ty, 22, C);
  ell(c, sh, ty + 3, 3.2, 3.2, C.trim); px(c, sh - 1, ty + 2, 2, 2, C.gem);                                                              // 領口的寶石扣
  // 頭
  px(c, hx - 5, hy + 22, 10, 9, OUT); px(c, hx - 4, hy + 22, 8, 8, shade(C.skin, -0.18));
  ell(c, hx, hy + 2, 29.5, 26.5, C.skin);
  px(c, hx - 21, hy + 4, 4, 2, shade(C.skin, 0.4));
  eyeSoft(c, hx - 12, hy + 4, C, -1); eyeSoft(c, hx + 12, hy + 4, C, 1);
  px(c, hx - 19, hy + 19, 7, 2, 'rgba(245,120,140,0.5)'); px(c, hx + 12, hy + 19, 7, 2, 'rgba(245,120,140,0.5)');
  px(c, hx, hy + 16, 1, 2, shade(C.skin, -0.25));
  px(c, hx - 2, hy + 22, 4, 1, shade(C.skin, -0.55)); px(c, hx - 3, hy + 21, 1, 1, shade(C.skin, -0.55)); px(c, hx + 2, hy + 21, 1, 1, shade(C.skin, -0.55));   // 微笑
  // 前髮：齊瀏海＋兩側垂到臉頰的髮束
  merged(c, [[
    [hx - 31, hy + 15 - lf], [hx - 34, hy - 8], [hx - 27, hy - 26], [hx - 12, hy - 35], [hx + 12, hy - 35], [hx + 27, hy - 26], [hx + 34, hy - 8], [hx + 31, hy + 15 - lf],
    [hx + 25, hy + 18 - lf], [hx + 23, hy - 1], [hx + 16, hy + 3], [hx + 9, hy - 4], [hx + 1, hy + 3], [hx - 7, hy - 4], [hx - 15, hy + 3], [hx - 23, hy - 1], [hx - 25, hy + 18 - lf],
  ]], C.hair);
  const dk = shade(C.hair, -0.4);
  ln(c, [hx + 9, hy - 4], [hx + 11, hy - 14], 1, dk); ln(c, [hx - 7, hy - 4], [hx - 9, hy - 14], 1, dk); ln(c, [hx + 23, hy - 1], [hx + 26, hy + 12], 1, dk); ln(c, [hx - 23, hy - 1], [hx - 26, hy + 12], 1, dk);
  wizardHat(c, L, hx, hy - lf * 2, C, 1);
  // 手與法杖
  sleeve(c, [sh - 16, ty + 5], p.hL, C);
  sleeve(c, [sh + 16, ty + 5], p.hR, C);
  if (p.sl === 2) { S(); ell(c, p.hR[0], p.hR[1], 4.2, 4.2, C.skin); }
}

// ---------- 側面（面向左） ----------
function sideView(c: CanvasRenderingContext2D, f: number, L: Look, C: MPal) {
  const p = mpose(1, f), cx = AX + p.rx + p.tw, ty = 129 + p.ry, s = p.hem, bx = AX + p.rx * 0.6;
  const hx = cx - 3 + p.tw * 0.3, hy = 95 + p.ry, lf = p.lift;
  // 後面的長髮：往背後飄
  merged(c, [[[hx + 6, hy - 22], [hx + 30, hy - 8], [hx + 35, hy + 22], [hx + 33 + s * 2 + lf * 6, ty + 30 - lf * 8], [hx + 24 + s + lf * 4, ty + 21 - lf * 5], [hx + 17 + s + lf * 2, ty + 33 - lf * 6], [hx + 8, hy + 26]]], shade(C.hair, -0.18));
  sleeve(c, [cx + 2, ty + 6], p.hL, C, true);
  ell(c, bx + 6 + s * 0.5, FOOT - 1 - p.fR, 7, 3.4, shade(C.boot, -0.2)); ell(c, bx - 7 + s * 0.3, FOOT - 1 - p.fL, 7, 3.4, C.boot);
  poly(c, [[cx - 9, ty], [cx + 9, ty], [bx + 17 + s, 178], [bx + 9 + s, 182], [bx + s, 178], [bx - 9 + s * 0.6, 182], [bx - 15 + s * 0.4, 178]], C.cloth);
  ln(c, [cx + 4, ty + 26], [bx + 9 + s, 176], 1, shade(C.cloth, -0.4));
  fillPoly(c, [[bx - 14 + s * 0.4, 170], [bx + 15 + s * 0.9, 170], [bx + 16 + s, 174], [bx - 15 + s * 0.4, 174]], C.trim);
  fillPoly(c, [[cx - 7, ty + 3], [cx - 3, ty + 3], [bx - 9 + s * 0.4, 168], [bx - 13 + s * 0.4, 168]], shade(C.cloth, 0.25));
  px(c, cx - 10, ty + 22, 20, 5, OUT); px(c, cx - 9, ty + 23, 18, 3, shade(C.cloth, -0.45)); px(c, cx - 8, ty + 23, 4, 3, C.gem);
  capelet(c, cx, ty, 15, C);
  // 頭
  px(c, hx - 2, hy + 22, 10, 9, OUT); px(c, hx - 1, hy + 22, 8, 8, shade(C.skin, -0.18));
  ell(c, hx - 2, hy + 2, 26, 26, C.skin);
  px(c, hx - 30, hy + 13, 3, 4, OUT); px(c, hx - 29, hy + 14, 3, 2, C.skin);
  eyeSoft(c, hx - 16, hy + 4, C, -1);
  px(c, hx - 22, hy + 19, 7, 2, 'rgba(245,120,140,0.5)'); px(c, hx - 25, hy + 22, 3, 1, shade(C.skin, -0.55));
  merged(c, [[
    [hx - 26, hy - 4], [hx - 28, hy - 14], [hx - 20, hy - 28], [hx - 6, hy - 35], [hx + 12, hy - 35], [hx + 26, hy - 24], [hx + 32, hy - 6], [hx + 31, hy + 14], [hx + 22, hy + 24],
    [hx + 10, hy + 22], [hx + 9, hy + 6], [hx + 5, hy + 20 - lf], [hx - 1, hy + 19 - lf], [hx - 2, hy - 2], [hx - 9, hy + 2], [hx - 15, hy - 5], [hx - 22, hy],
  ]], C.hair);
  const dk = shade(C.hair, -0.4);
  ln(c, [hx - 2, hy - 2], [hx, hy - 14], 1, dk); ln(c, [hx - 15, hy - 5], [hx - 15, hy - 15], 1, dk); ln(c, [hx + 9, hy + 6], [hx + 14, hy - 8], 1, dk);
  wizardHat(c, L, hx + 2, hy - lf * 2, C, 1, 40);
  // 近側的手與法杖
  sleeve(c, [cx, ty + 6], p.hR, C);
  staff(c, p.hR, p.sa, C, p.glow); ell(c, p.hR[0], p.hR[1], 4.2, 4.2, C.skin);
}

// ---------- 背面 ----------
function backView(c: CanvasRenderingContext2D, f: number, L: Look, C: MPal) {
  const p = mpose(3, f), sh = AX + p.rx + p.tw, ty = 129 + p.ry, s = p.hem, bx = AX + p.rx * 0.5;
  const hx = sh + p.tw * 0.3, hy = 95 + p.ry, lf = p.lift;
  const S = () => staff(c, p.hR, p.sa, C, p.glow);
  if (p.sl === 0) S();
  if (p.armBack) sleeve(c, [sh + 16, ty + 5], p.hR, C, true);
  ell(c, bx - 8 + s * 0.4, FOOT - 1 - p.fL, 6, 3.4, C.boot); ell(c, bx + 8 + s * 0.4, FOOT - 1 - p.fR, 6, 3.4, C.boot);
  poly(c, [[sh - 14, ty], [sh + 14, ty], [bx + 22 + s, 178], [bx + 15 + s, 182], [bx + 7 + s, 178], [bx + s, 182], [bx - 7 + s, 178], [bx - 15 + s, 182], [bx - 22 + s, 178]], C.cloth);
  ln(c, [sh, ty + 22], [bx + s, 178], 1, shade(C.cloth, -0.4)); ln(c, [sh - 10, ty + 26], [bx - 15 + s, 176], 1, shade(C.cloth, -0.4)); ln(c, [sh + 10, ty + 26], [bx + 15 + s, 176], 1, shade(C.cloth, -0.4));
  fillPoly(c, [[bx - 20 + s * 0.9, 170], [bx + 20 + s * 0.9, 170], [bx + 21 + s, 174], [bx - 21 + s, 174]], C.trim);
  fillPoly(c, [[sh - 12, ty + 3], [sh - 8, ty + 3], [bx - 14 + s, 168], [bx - 19 + s, 168]], shade(C.cloth, 0.25));
  capelet(c, sh, ty, 22, C);
  sleeve(c, [sh - 16, ty + 5], p.hL, C);
  if (!p.armBack) sleeve(c, [sh + 16, ty + 5], p.hR, C);
  // 長髮蓋住背部，尾端分岔
  merged(c, [[
    [hx - 28, hy - 6], [hx + 28, hy - 6], [hx + 31, hy + 20], [hx + 25 + s * 0.6 + lf * 4, ty + 17 - lf * 7], [hx + 17 + s * 0.6, ty + 9 - lf * 4], [hx + 9 + s * 0.6, ty + 23 - lf * 7], [hx + s * 0.6, ty + 13 - lf * 4],
    [hx - 9 + s * 0.6, ty + 23 - lf * 7], [hx - 17 + s * 0.6, ty + 9 - lf * 4], [hx - 25 + s * 0.6 - lf * 4, ty + 17 - lf * 7], [hx - 31, hy + 20],
  ], [[hx - 33, hy - 8], [hx - 27, hy - 26], [hx - 12, hy - 35], [hx + 12, hy - 35], [hx + 27, hy - 26], [hx + 33, hy - 8], [hx + 33, hy + 10], [hx - 33, hy + 10]]], C.hair);
  const dk = shade(C.hair, -0.4), lt = shade(C.hair, 0.4);
  ln(c, [hx - 9, hy + 6], [hx - 9 + s * 0.6, ty + 18], 1, dk); ln(c, [hx + 9, hy + 6], [hx + 9 + s * 0.6, ty + 18], 1, dk); ln(c, [hx, hy + 10], [hx + s * 0.6, ty + 10], 1, dk);
  ln(c, [hx - 21, hy + 4], [hx - 22, hy + 22], 2, lt);
  wizardHat(c, L, hx, hy - lf * 2, C, 1);
  if (p.sl === 2) { S(); ell(c, p.hR[0], p.hR[1], 4.2, 4.2, C.skin); }
}

export function drawMage(c: CanvasRenderingContext2D, dir: number, f: number, L: Look) {
  const C = mpal(L);
  if (dir === 1) sideView(c, f, L, C); else if (dir === 3) backView(c, f, L, C); else front(c, f, L, C);
}
