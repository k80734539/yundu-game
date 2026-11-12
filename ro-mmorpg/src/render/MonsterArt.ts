import { RGB, hex, css, shade } from './pixel';
import type { Look } from '../data';
import { OUT } from './KnightArt';

/**
 * 新的怪物外型（後期地圖用，讓幽靈系、石像系、Boss 不再只是同一個形狀換顏色）。
 * 每個函式和 SpriteFactory 的 MON 表格同一個簽名：(c, dir, f, L, s, ax, ay)；
 * 座標以「腳底 (ax,ay)」為原點、乘上 s（look.scale）；dir：0 下、1 左、3 上（右由左鏡像）；f：0~1 待機、2~5 走路、6~9 攻擊。
 * 精靈圖會做 alpha 二值化，所以這裡只用不透明的顏色。
 */
type Pt = [number, number];
type Draw = (c: CanvasRenderingContext2D, dir: number, f: number, L: Look, s: number, ax: number, ay: number) => void;

// ---------- 小工具（局部座標 → 畫面座標） ----------
function mk(c: CanvasRenderingContext2D, s: number, ax: number, ay: number) {
  const T = (x: number, y: number): Pt => [ax + x * s, ay + y * s];
  const path = (pts: Pt[]) => { c.beginPath(); const a = T(pts[0][0], pts[0][1]); c.moveTo(a[0], a[1]); for (let i = 1; i < pts.length; i++) { const q = T(pts[i][0], pts[i][1]); c.lineTo(q[0], q[1]); } c.closePath(); };
  return {
    T,
    poly(pts: Pt[], col: RGB) { path(pts); c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); c.fillStyle = css(col); c.fill(); },
    fill(pts: Pt[], col: RGB | string) { path(pts); c.fillStyle = typeof col === 'string' ? col : css(col); c.fill(); },
    ell(x: number, y: number, rx: number, ry: number, col: RGB, rot = 0) {
      const [px, py] = T(x, y);
      c.fillStyle = OUT; c.beginPath(); c.ellipse(px, py, rx * s + 1, ry * s + 1, rot, 0, Math.PI * 2); c.fill();
      c.fillStyle = css(col); c.beginPath(); c.ellipse(px, py, rx * s, ry * s, rot, 0, Math.PI * 2); c.fill();
    },
    dot(x: number, y: number, rx: number, ry: number, col: RGB | string) { const [px, py] = T(x, y); c.fillStyle = typeof col === 'string' ? col : css(col); c.beginPath(); c.ellipse(px, py, Math.max(1, rx * s), Math.max(1, ry * s), 0, 0, Math.PI * 2); c.fill(); },
    line(a: Pt, b: Pt, w: number, col: RGB | string) { const p = T(a[0], a[1]), q = T(b[0], b[1]); c.lineCap = 'round'; c.strokeStyle = typeof col === 'string' ? col : css(col); c.lineWidth = Math.max(1, w * s); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); },
    limb(a: Pt, b: Pt, w: number, col: RGB) { this.line(a, b, w + 2 / s, OUT); this.line(a, b, w, col); },
  };
}
/** 共用動作曲線：bob 上下浮動、lunge 往前衝（攻擊）、ph 走路相位、raise 舉手（攻擊前兩格） */
function motion(f: number) {
  if (f < 2) return { bob: f, lunge: 0, ph: 0, raise: 0, hit: 0 };
  if (f < 6) { const t = (f - 2) / 4; return { bob: Math.abs(Math.sin(t * Math.PI * 2)) * 2, lunge: 0, ph: t, raise: 0, hit: 0 }; }
  const a = f - 6; return { bob: [1, 2, 0, 0][a], lunge: [-2, -3, 8, 3][a], ph: a / 4, raise: [0.6, 1, 0, 0][a], hit: [0, 0, 1, 0.4][a] };
}
/** 依方向把「往前」換成局部座標位移 */
const fwd = (dir: number, l: number): Pt => (dir === 0 ? [0, l * 0.6] : dir === 3 ? [0, -l * 0.6] : [-l, 0]);
/** 發光的眼睛（亮色外圈＋白芯） */
function glowEye(g: ReturnType<typeof mk>, x: number, y: number, col: RGB, r = 2.4) { g.dot(x, y, r * 1.5, r * 1.1, shade(col, -0.2)); g.dot(x, y, r, r * 0.8, col); g.dot(x - r * 0.3, y - r * 0.2, r * 0.45, r * 0.45, '#ffffff'); }

// ---------- 鬼火／風之靈：一團往上竄的火焰，中間有亮芯 ----------
const wisp: Draw = (c, dir, f, L, s, ax, ay) => {
  const g = mk(c, s, ax, ay), m = motion(f), [lx, ly] = fwd(dir, m.lunge), col = hex(L.color || '#b8e8ff');
  const cx = lx, cy = -30 - m.bob * 2 + Math.sin(f * 0.9) * 2 + ly, sw = Math.sin(f * 1.7) * 4, flare = m.hit * 6 + m.raise * 3;
  const flame = (k: number): Pt[] => {
    const r = 13 * k, pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9]); }
    pts.push([cx - r * 0.95, cy - r * 0.6], [cx - r * 0.55 + sw * 0.3, cy - r * 1.5 - flare], [cx - r * 0.2 + sw * 0.6, cy - r * 1.1], [cx + sw, cy - r * 2.3 - flare * 1.4], [cx + r * 0.35 + sw * 0.5, cy - r * 1.2], [cx + r * 0.65 + sw * 0.3, cy - r * 1.6 - flare], [cx + r * 0.95, cy - r * 0.6]);
    return pts;
  };
  // 尾巴的小火苗（往後飄）
  const back = dir === 1 ? 1 : 0;
  for (let i = 0; i < 3; i++) { const t = i / 3, x = cx + (back ? 10 + i * 7 : (i - 1) * 8), y = cy + 10 + i * 3 + Math.sin(f + i) * 2; g.ell(x, y, 3.2 - i * 0.6, 3.6 - i * 0.6, shade(col, -0.1 - t * 0.2)); }
  g.poly(flame(1), shade(col, -0.25));
  g.fill(flame(0.72).map(([x, y]) => [x, y + 2] as Pt), col);
  g.fill(flame(0.42).map(([x, y]) => [x, y + 5] as Pt), shade(col, 0.6));
  if (dir !== 3) { const ex = dir === 1 ? [cx - 6] : [cx - 5, cx + 5]; for (const x of ex) { g.dot(x, cy - 1, 2.2, 3.2, hex('#1a2040')); g.dot(x - 0.6, cy - 2, 0.8, 0.8, '#ffffff'); } g.dot(dir === 1 ? cx - 8 : cx, cy + 5, 2, 1.4, hex('#1a2040')); }
  for (let i = 0; i < 3; i++) { const a = f * 0.9 + i * 2.1, x = cx + Math.cos(a) * 20, y = cy - 4 + Math.sin(a) * 8; g.fill([[x, y - 3], [x + 2, y], [x, y + 3], [x - 2, y]], shade(col, 0.5)); }   // 繞著飛的火星
};

// ---------- 怨靈系：破爛的兜帽斗篷、空洞的臉、發光的眼睛、伸出來的爪子 ----------
const wraith: Draw = (c, dir, f, L, s, ax, ay) => {
  const g = mk(c, s, ax, ay), m = motion(f), [lx, ly] = fwd(dir, m.lunge * 1.2), col = hex(L.color || '#c8a8f0');
  const dk = shade(col, -0.35), hole = hex('#140c1c'), eye = hex(L.color2 || '#ffffff');
  const cx = lx, top = -64 - m.bob * 2 + Math.sin(f * 0.8) * 2 + ly, sw = Math.sin(f * 1.3) * 3;
  // 破爛下襬（越下面越飄）
  const hem: Pt[] = []; for (let i = 0; i <= 6; i++) { const x = cx - 18 + i * 6 + sw * (i / 6), y = top + 58 + (i % 2 ? -7 : 2) + Math.sin(f + i) * 2; hem.push([x, y]); }
  const side = dir === 1, back = dir === 3;
  // 手臂（攻擊時舉起再往前抓）
  const reach = m.hit * 10, up = m.raise * 14;
  const claw = (sx: number, dirX: number, dark: boolean) => {
    const sh: Pt = [cx + sx, top + 24], hd: Pt = side ? [cx + sx - 14 - reach * 1.2, top + 34 - up] : [cx + sx + dirX * 9, top + 38 - up + reach * 0.4];
    g.poly([[sh[0] - 4, sh[1] - 3], [hd[0] - 5, hd[1] - 2], [hd[0] + 5, hd[1] + 3], [sh[0] + 4, sh[1] + 5]], dark ? shade(dk, -0.2) : dk);
    for (const k of [-1, 0, 1]) g.limb(hd, [hd[0] + (side ? -6 : dirX * 3 + k * 3), hd[1] + (side ? k * 3 : 6) - (side ? 0 : up * 0.1)], 1.4, hex('#e8e0f0'));
  };
  if (!back) { if (side) claw(6, 1, true); else { claw(-14, -1, false); } }
  g.poly([[cx - 12, top + 18], [cx + 12, top + 18], [cx + 20 + sw * 0.5, top + 46], ...hem.slice().reverse().map(([x, y]) => [x, y] as Pt).reverse(), [cx - 20 + sw * 0.5, top + 46]], col);
  g.fill([[cx - 9, top + 22], [cx - 5, top + 22], [cx - 12 + sw * 0.4, top + 52], [cx - 16 + sw * 0.4, top + 50]], shade(col, 0.3));
  g.line([cx + 3, top + 26], [cx + 6 + sw * 0.5, top + 54], 1, dk); g.line([cx - 3, top + 30], [cx - 4 + sw * 0.5, top + 56], 1, dk);
  // 兜帽
  if (side) {
    g.poly([[cx + 12, top + 26], [cx + 14, top + 6], [cx + 6, top - 6], [cx - 6, top - 8], [cx - 15, top], [cx - 18, top + 14], [cx - 12, top + 24]], col);
    g.fill([[cx - 16, top + 6], [cx - 9, top + 2], [cx - 6, top + 14], [cx - 9, top + 22], [cx - 15, top + 20]], hole);
    glowEye(g, cx - 12, top + 11, eye, 2);
  } else if (back) {
    g.poly([[cx - 15, top + 26], [cx - 17, top + 6], [cx - 8, top - 8], [cx + 8, top - 8], [cx + 17, top + 6], [cx + 15, top + 26]], col);
    g.line([cx, top - 6], [cx, top + 24], 1, dk);
  } else {
    g.poly([[cx - 16, top + 26], [cx - 18, top + 6], [cx - 9, top - 8], [cx + 9, top - 8], [cx + 18, top + 6], [cx + 16, top + 26]], col);
    g.fill([[cx - 11, top + 22], [cx - 12, top + 8], [cx - 6, top + 1], [cx + 6, top + 1], [cx + 12, top + 8], [cx + 11, top + 22], [cx, top + 26]], hole);
    glowEye(g, cx - 5, top + 12, eye, 2.2); glowEye(g, cx + 5, top + 12, eye, 2.2);
    g.fill([[cx - 16, top + 6], [cx - 9, top - 6], [cx - 6, top - 5], [cx - 12, top + 8]], shade(col, 0.35));
  }
  if (!back && !side) claw(14, 1, false);
  if (side) claw(-4, 1, false);
};

// ---------- 王者（試煉術士、深淵領主）：有角的王冠、斗篷、尖肩甲、兩顆繞著飛的魔球 ----------
const lord: Draw = (c, dir, f, L, s, ax, ay) => {
  const g = mk(c, s, ax, ay), m = motion(f), [lx, ly] = fwd(dir, m.lunge * 0.6), col = hex(L.color || '#7030c0'), acc = hex(L.color2 || '#ff40a0');
  const dk = shade(col, -0.45), gold = hex('#e8c050'), hole = hex('#100818');
  const cx = lx, top = -74 - m.bob * 1.5 + Math.sin(f * 0.7) * 1.5 + ly, sw = Math.sin(f * 1.1) * 2;
  const side = dir === 1, back = dir === 3;
  const orb = (a: number, front: boolean) => { const x = cx + Math.cos(a) * 30, y = top + 40 + Math.sin(a) * 9; if ((Math.sin(a) > 0) !== front) return; g.ell(x, y, 5, 5, acc); g.dot(x - 1.5, y - 1.5, 1.6, 1.6, '#ffffff'); };
  const oa = f * 0.8; orb(oa, false); orb(oa + Math.PI, false);
  // 長袍（下襬破爛）
  const hem: Pt[] = []; for (let i = 0; i <= 8; i++) hem.push([cx + 24 - i * 6 + sw * (1 - i / 8), top + 76 + (i % 2 ? -6 : 1)]);
  g.poly([[cx - 16, top + 24], [cx + 16, top + 24], [cx + 26 + sw, top + 70], ...hem, [cx - 26 + sw, top + 70]], col);
  if (!back) { g.fill([[cx - 5, top + 28], [cx + 5, top + 28], [cx + 8 + sw, top + 74], [cx - 8 + sw, top + 74]], dk); g.line([cx - 6, top + 30], [cx - 9 + sw, top + 72], 1.4, gold); g.line([cx + 6, top + 30], [cx + 9 + sw, top + 72], 1.4, gold); }
  g.fill([[cx - 14, top + 28], [cx - 10, top + 28], [cx - 20 + sw, top + 66], [cx - 24 + sw, top + 64]], shade(col, 0.3));
  // 手：一隻舉起（攻擊時舉高），一隻托著魔力
  const up = m.raise * 16 + m.hit * 6;
  const hand = (sx: number, hy: number) => { g.poly([[cx + sx - 5, top + 26], [cx + sx * 1.6 - 5, hy - 2], [cx + sx * 1.6 + 5, hy + 2], [cx + sx + 5, top + 30]], col); g.ell(cx + sx * 1.6, hy + 2, 3.6, 3.6, hex('#d8d0e8')); };
  if (!side) { hand(-16, top + 46 - up * 0.3); hand(16, top + 46 - up); if (m.raise || m.hit) { g.ell(cx + 26, top + 40 - up, 6 + m.hit * 3, 6 + m.hit * 3, acc); g.dot(cx + 24, top + 38 - up, 2, 2, '#ffffff'); } }
  else { hand(-12, top + 44 - up); if (m.raise || m.hit) { g.ell(cx - 24 - m.hit * 4, top + 42 - up, 6 + m.hit * 3, 6 + m.hit * 3, acc); g.dot(cx - 26 - m.hit * 4, top + 40 - up, 2, 2, '#ffffff'); } }
  // 尖肩甲
  for (const sx of side ? [0.5] : [-1, 1]) g.poly([[cx + sx * 10, top + 18], [cx + sx * 26, top + 16], [cx + sx * 32, top + 6], [cx + sx * 24, top + 26], [cx + sx * 12, top + 28]], dk);
  // 頭：兜帽＋王冠的角
  for (const sx of side ? [1] : [-1, 1]) g.poly([[cx + sx * 9, top + 2], [cx + sx * 18, top - 18], [cx + sx * 15, top - 2]], gold);
  if (back) g.poly([[cx - 14, top + 24], [cx - 15, top + 4], [cx - 6, top - 6], [cx + 6, top - 6], [cx + 15, top + 4], [cx + 14, top + 24]], col);
  else {
    const fx = side ? -4 : 0;
    g.poly([[cx - 14 + fx, top + 24], [cx - 15 + fx, top + 4], [cx - 6 + fx, top - 6], [cx + 6 + fx, top - 6], [cx + 15 + fx, top + 4], [cx + 14 + fx, top + 24]], col);
    g.fill([[cx - 9 + fx * 1.5, top + 21], [cx - 10 + fx * 1.5, top + 8], [cx - 4 + fx * 1.5, top + 2], [cx + 4 + fx * 1.5, top + 2], [cx + 10 + fx * 1.5, top + 8], [cx + 9 + fx * 1.5, top + 21]], hole);
    if (side) glowEye(g, cx - 10, top + 11, acc, 2); else { glowEye(g, cx - 4, top + 11, acc, 2); glowEye(g, cx + 4, top + 11, acc, 2); }
  }
  g.poly([[cx - 10, top - 2], [cx - 8, top - 10], [cx - 4, top - 5], [cx, top - 13], [cx + 4, top - 5], [cx + 8, top - 10], [cx + 10, top - 2]], gold);
  g.dot(cx, top - 6, 1.6, 1.6, acc);
  orb(oa, true); orb(oa + Math.PI, true);
};

// ---------- 岩石巨像（可選紋路：rock 苔蘚與符文、lava 熔岩裂縫、crystal 水晶尖刺） ----------
const rockgolem: Draw = (c, dir, f, L, s, ax, ay) => {
  const g = mk(c, s, ax, ay), m = motion(f), [lx, ly] = fwd(dir, m.lunge * 0.5), col = hex(L.color || '#8a8072'), glow = hex(L.color2 || '#60e0ff');
  const v = L.variant || 'rock', dk = shade(col, -0.3), lt = shade(col, 0.3);
  const side = dir === 1, back = dir === 3;
  const step = f >= 2 && f < 6 ? Math.sin(m.ph * Math.PI * 2) * 3 : 0;
  const cx = lx, by = ly - m.bob, up = m.raise * 16, slam = m.hit * 10;
  // 腿：兩塊粗石柱
  g.poly([[cx - 16, -2 - Math.max(0, step)], [cx - 16, -20 + by], [cx - 4, -20 + by], [cx - 3, -2 - Math.max(0, step)]], dk);
  g.poly([[cx + 3, -2 - Math.max(0, -step)], [cx + 4, -20 + by], [cx + 16, -20 + by], [cx + 16, -2 - Math.max(0, -step)]], dk);
  // 手臂（攻擊：舉起再砸下）
  const armY = -48 + by - up + slam * 1.6;
  const arm = (sx: number, dark: boolean) => {
    const c1 = dark ? shade(col, -0.25) : col;
    g.poly([[cx + sx * 20, -54 + by], [cx + sx * 32, -52 + by - up * 0.5], [cx + sx * 34, armY + 8], [cx + sx * 22, armY + 6]], c1);
    g.poly([[cx + sx * 22, armY + 8], [cx + sx * 36, armY + 6], [cx + sx * 38, armY + 24], [cx + sx * 20, armY + 26]], dark ? shade(dk, -0.1) : dk);   // 拳頭
    g.line([cx + sx * 24, armY + 14], [cx + sx * 34, armY + 13], 0.8, shade(dk, -0.4));
  };
  if (side) arm(0.35, true); else arm(1, true);
  // 身體：一塊上寬下窄的大石頭
  const body: Pt[] = [[cx - 24, -54 + by], [cx - 12, -62 + by], [cx + 12, -62 + by], [cx + 24, -54 + by], [cx + 20, -24 + by], [cx + 8, -18 + by], [cx - 8, -18 + by], [cx - 20, -24 + by]];
  g.poly(body, col);
  g.fill([[cx - 20, -52 + by], [cx - 10, -58 + by], [cx - 4, -58 + by], [cx - 14, -50 + by], [cx - 16, -30 + by], [cx - 19, -30 + by]], lt);
  g.line([cx + 4, -58 + by], [cx + 10, -40 + by], 1, dk); g.line([cx + 10, -40 + by], [cx + 6, -26 + by], 1, dk); g.line([cx - 10, -36 + by], [cx - 2, -32 + by], 1, dk);
  // 紋路
  if (v === 'lava') {
    for (const [a, b] of [[[cx - 14, -48], [cx - 4, -38]], [[cx - 4, -38], [cx - 8, -26]], [[cx + 6, -52], [cx + 14, -36]], [[cx + 14, -36], [cx + 8, -24]]] as [Pt, Pt][]) { g.line([a[0], a[1] + by], [b[0], b[1] + by], 2.6, glow); g.line([a[0], a[1] + by], [b[0], b[1] + by], 1, shade(glow, 0.6)); }
  } else if (v === 'crystal') {
    const cr = shade(glow, -0.1);
    for (const [x, h, w] of [[-18, 20, 5], [-8, 28, 6], [4, 24, 5], [16, 18, 4]] as [number, number, number][]) { const yb = -58 + by; g.poly([[cx + x - w, yb + 2], [cx + x + w * 0.2, yb - h], [cx + x + w, yb + 2]], cr); g.fill([[cx + x - w * 0.6, yb], [cx + x + w * 0.2, yb - h + 3], [cx + x, yb]], '#ffffff'); }
  } else if (!back) { g.fill([[cx - 4, -44 + by], [cx + 4, -44 + by], [cx + 4, -36 + by], [cx - 4, -36 + by]], glow); g.line([cx, -48 + by], [cx, -32 + by], 1, shade(glow, 0.5)); }
  if (v === 'rock') { g.fill([[cx - 22, -54 + by], [cx - 10, -60 + by], [cx + 2, -58 + by], [cx - 8, -54 + by]], hex('#5a8a3a')); g.dot(cx - 14, -56 + by, 2, 1.4, hex('#7ab04a')); }
  // 頭：陷在兩肩之間的小石塊
  if (!back) {
    const hx = side ? cx - 10 : cx;
    g.poly([[hx - 9, -60 + by], [hx - 7, -70 + by], [hx + 7, -70 + by], [hx + 9, -60 + by]], shade(col, 0.1));
    const eye = hex(L.eye || (v === 'lava' ? '#ffd040' : v === 'crystal' ? '#ffffff' : '#ff5030'));
    if (side) glowEye(g, hx - 5, -65 + by, eye, 1.6); else { glowEye(g, hx - 4, -65 + by, eye, 1.6); glowEye(g, hx + 4, -65 + by, eye, 1.6); }
  } else g.poly([[cx - 9, -60 + by], [cx - 7, -70 + by], [cx + 7, -70 + by], [cx + 9, -60 + by]], shade(col, -0.05));
  if (side) arm(-0.6, false); else arm(-1, false);
};

// ---------- 雪怪：毛茸茸的大身體、彎角、獠牙、長手臂 ----------
const yeti: Draw = (c, dir, f, L, s, ax, ay) => {
  const g = mk(c, s, ax, ay), m = motion(f), [lx, ly] = fwd(dir, m.lunge * 0.7), col = hex(L.color || '#e8f0f8'), acc = hex(L.color2 || '#80c0ff');
  const dk = shade(col, -0.3), skin = hex('#7a8aa8'), side = dir === 1, back = dir === 3;
  const step = f >= 2 && f < 6 ? Math.sin(m.ph * Math.PI * 2) * 3 : 0;
  const cx = lx, by = ly - m.bob, up = m.raise * 14, swipe = m.hit;
  const fur = (pts: Pt[], colr: RGB) => { // 外緣加一圈毛的鋸齒
    const out: Pt[] = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; out.push(a); const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1; out.push([mx + (nx / nl) * 3, my + (ny / nl) * 3]); }
    g.poly(out, colr);
  };
  g.poly([[cx - 15, -2 - Math.max(0, step)], [cx - 14, -18 + by], [cx - 4, -18 + by], [cx - 3, -2 - Math.max(0, step)]], dk);
  g.poly([[cx + 3, -2 - Math.max(0, -step)], [cx + 4, -18 + by], [cx + 14, -18 + by], [cx + 15, -2 - Math.max(0, -step)]], dk);
  const arm = (sx: number, back2: boolean) => {
    const hy = -24 + by - up + swipe * 6, hx = cx + sx * (24 + swipe * 6) + (side ? -swipe * 12 : 0);
    fur([[cx + sx * 16, -52 + by], [cx + sx * 26, -50 + by], [hx + sx * 6, hy], [hx - sx * 6, hy + 2], [cx + sx * 14, -36 + by]], back2 ? dk : col);
    for (const k of [-1, 0, 1]) g.limb([hx + k * 3, hy + 3], [hx + k * 4 - (side ? 3 : 0), hy + 8], 1.3, hex('#f0f4ff'));
  };
  if (side) arm(0.4, true); else arm(1, true);
  fur([[cx - 22, -56 + by], [cx - 12, -64 + by], [cx + 12, -64 + by], [cx + 22, -56 + by], [cx + 20, -24 + by], [cx, -16 + by], [cx - 20, -24 + by]], col);
  if (!back) g.fill([[cx - 10, -50 + by], [cx + 10, -50 + by], [cx + 8, -26 + by], [cx - 8, -26 + by]], shade(col, -0.12));
  // 頭
  const hx = side ? cx - 8 : cx, hy = -64 + by;
  for (const sx of side ? [1] : [-1, 1]) { g.poly([[hx + sx * 8, hy - 4], [hx + sx * 18, hy - 12], [hx + sx * 20, hy - 22], [hx + sx * 15, hy - 14], [hx + sx * 6, hy - 9]], acc); }
  fur([[hx - 12, hy + 4], [hx - 13, hy - 8], [hx - 6, hy - 14], [hx + 6, hy - 14], [hx + 13, hy - 8], [hx + 12, hy + 4], [hx, hy + 8]], col);
  if (!back) {
    const fx = side ? hx - 4 : hx;
    g.fill([[fx - 8, hy - 6], [fx + 8, hy - 6], [fx + 7, hy + 4], [fx, hy + 6], [fx - 7, hy + 4]], skin);
    if (side) glowEye(g, fx - 4, hy - 2, acc, 1.6); else { glowEye(g, fx - 4, hy - 2, acc, 1.6); glowEye(g, fx + 4, hy - 2, acc, 1.6); }
    g.fill([[fx - 4, hy + 2], [fx + 4, hy + 2], [fx + 3, hy + 4 + m.hit * 2], [fx - 3, hy + 4 + m.hit * 2]], hex('#3a2030'));
    g.fill([[fx - 3, hy + 2], [fx - 2, hy + 5], [fx - 1, hy + 2]], '#ffffff'); g.fill([[fx + 1, hy + 2], [fx + 2, hy + 5], [fx + 3, hy + 2]], '#ffffff');
  }
  if (side) arm(-0.8, false); else arm(-1, false);
};

// ---------- 神殿石像（天翼侍衛的石像、蒼雷守護者）：石翼、有冠飾的頭盔、石劍、發光的符文 ----------
const statue: Draw = (c, dir, f, L, s, ax, ay) => {
  const g = mk(c, s, ax, ay), m = motion(f), [lx, ly] = fwd(dir, m.lunge * 0.6), col = hex(L.color || '#e8e4d8'), glow = hex(L.color2 || '#ffd860');
  const dk = shade(col, -0.3), lt = shade(col, 0.35), side = dir === 1, back = dir === 3;
  const step = f >= 2 && f < 6 ? Math.sin(m.ph * Math.PI * 2) * 3 : 0;
  const cx = lx, by = ly - m.bob, up = m.raise, hit = m.hit;
  // 石翼（在最後面）
  const wing = (sx: number) => {
    const b: Pt = [cx + sx * 8, -58 + by];
    g.poly([b, [cx + sx * 26, -86 + by - up * 4], [cx + sx * 44, -92 + by - up * 6], [cx + sx * 40, -76 + by], [cx + sx * 46, -66 + by], [cx + sx * 34, -58 + by], [cx + sx * 38, -46 + by], [cx + sx * 20, -44 + by]], dk);
    for (const k of [0, 1, 2]) g.line([cx + sx * (14 + k * 6), -54 + by], [cx + sx * (30 + k * 6), -78 + by + k * 10 - up * 3], 1, shade(dk, -0.35));
  };
  if (side) wing(1); else { wing(-1); wing(1); }
  if (L.hat === 'halo') { const [hx, hy] = g.T(cx, -96 + by); c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.ellipse(hx, hy, 14 * s, 4 * s, 0, 0, Math.PI * 2); c.stroke(); c.strokeStyle = css(glow); c.lineWidth = 3; c.stroke(); }
  // 腿與裙甲
  g.poly([[cx - 12, -2 - Math.max(0, step)], [cx - 12, -22 + by], [cx - 3, -22 + by], [cx - 2, -2 - Math.max(0, step)]], dk);
  g.poly([[cx + 2, -2 - Math.max(0, -step)], [cx + 3, -22 + by], [cx + 12, -22 + by], [cx + 12, -2 - Math.max(0, -step)]], dk);
  g.poly([[cx - 15, -34 + by], [cx + 15, -34 + by], [cx + 18, -18 + by], [cx - 18, -18 + by]], col);
  for (const x of [-9, -3, 3, 9]) g.line([cx + x, -32 + by], [cx + x * 1.2, -19 + by], 1, dk);
  // 劍（攻擊：舉高再劈下）
  const sword = () => {
    const hx = side ? cx - 14 - hit * 10 : cx + 18, hy = -40 + by - up * 22 + hit * 8;
    const ang = side ? (hit ? Math.PI * 0.85 : up ? -Math.PI * 0.45 : Math.PI * 0.6) : hit ? Math.PI * 0.62 : up ? -Math.PI * 0.55 : Math.PI * 0.42;
    const d: Pt = [Math.cos(ang), Math.sin(ang)], n: Pt = [-d[1], d[0]], L2 = 34;
    g.poly([[hx + n[0] * 3, hy + n[1] * 3], [hx + d[0] * L2 + n[0] * 2, hy + d[1] * L2 + n[1] * 2], [hx + d[0] * (L2 + 7), hy + d[1] * (L2 + 7)], [hx + d[0] * L2 - n[0] * 2, hy + d[1] * L2 - n[1] * 2], [hx - n[0] * 3, hy - n[1] * 3]], lt);
    g.line([hx + d[0] * 3, hy + d[1] * 3], [hx + d[0] * (L2 - 2), hy + d[1] * (L2 - 2)], 1, glow);
    g.limb([hx + n[0] * 7, hy + n[1] * 7], [hx - n[0] * 7, hy - n[1] * 7], 2.4, dk);
    g.ell(hx, hy, 3.4, 3.4, col);
  };
  if (back) sword();
  // 身體：胸甲＋肩甲
  g.poly([[cx - 16, -60 + by], [cx + 16, -60 + by], [cx + 13, -34 + by], [cx - 13, -34 + by]], col);
  g.fill([[cx - 13, -58 + by], [cx - 8, -58 + by], [cx - 10, -36 + by], [cx - 12, -36 + by]], lt);
  if (!back) { g.line([cx, -56 + by], [cx, -38 + by], 1, dk); g.fill([[cx - 4, -52 + by], [cx + 4, -52 + by], [cx, -44 + by]], glow); }
  for (const sx of side ? [0.3] : [-1, 1]) g.ell(cx + sx * 17, -58 + by, 7, 5, lt);
  // 頭盔：冠飾＋發光的眼縫
  const hx = side ? cx - 4 : cx;
  g.poly([[hx - 9, -60 + by], [hx - 10, -74 + by], [hx - 4, -80 + by], [hx + 4, -80 + by], [hx + 10, -74 + by], [hx + 9, -60 + by]], col);
  g.poly([[hx - 2, -80 + by], [hx + (side ? 8 : 0), -92 + by], [hx + (side ? 12 : 2), -80 + by]], glow);
  if (!back) { if (side) g.fill([[hx - 10, -71 + by], [hx - 2, -71 + by], [hx - 2, -68 + by], [hx - 10, -68 + by]], glow); else g.fill([[hx - 7, -71 + by], [hx + 7, -71 + by], [hx + 7, -68 + by], [hx - 7, -68 + by]], glow); }
  if (!back) sword();
};

// ---------- 龍（赤焰地龍）：有角的頭、長脖子、張開的翅膀、尾巴；攻擊時張嘴往前咬 ----------
const dragon: Draw = (c, dir, f, L, s, ax, ay) => {
  const g = mk(c, s, ax, ay), m = motion(f), col = hex(L.color || '#d03018'), acc = hex(L.color2 || '#ffb040');
  const dk = shade(col, -0.35), belly = shade(acc, 0.2), horn = hex('#f0e0c0'), side = dir === 1, back = dir === 3;
  const flap = Math.sin(f * 1.4) * 4 - m.raise * 6, by = -m.bob, bite = m.hit, step = f >= 2 && f < 6 ? Math.sin(m.ph * Math.PI * 2) * 2 : 0;
  const wing = (sx: number, dark: boolean) => {
    const b: Pt = [sx * 8, -40 + by];
    g.poly([b, [sx * 22, -66 + by - flap], [sx * 40, -78 + by - flap * 1.4], [sx * 44, -60 + by - flap], [sx * 36, -52 + by], [sx * 40, -40 + by], [sx * 28, -38 + by], [sx * 26, -28 + by]], dark ? shade(dk, -0.15) : dk);
    for (const k of [0, 1, 2]) g.line([sx * 10, -40 + by], [sx * (38 - k * 4), -74 + by + k * 14 - flap], 1.4, shade(dk, -0.45));
    g.fill([[sx * 14, -44 + by], [sx * 36, -70 + by - flap], [sx * 38, -60 + by - flap], [sx * 30, -42 + by]], shade(acc, -0.15));
  };
  if (side) {
    const hx = -24 - bite * 10, hy = -50 + by + bite * 4;
    // 尾巴
    g.poly([[14, -22 + by], [34, -30 + by], [48, -22 + by + Math.sin(f) * 3], [56, -32 + by + Math.sin(f) * 4], [52, -16 + by], [30, -12 + by], [12, -12 + by]], col);
    wing(0.6, true);
    g.poly([[6 + step, 0], [8 + step, -16 + by], [16 + step, -16 + by], [16 + step, 0]], dk);
    g.poly([[-12 - step, 0], [-12 - step, -16 + by], [-4 - step, -16 + by], [-4 - step, 0]], dk);
    g.poly([[-16, -18 + by], [-10, -40 + by], [14, -42 + by], [24, -28 + by], [18, -14 + by], [-10, -12 + by]], col);
    g.fill([[-14, -20 + by], [-8, -34 + by], [6, -30 + by], [8, -16 + by]], belly);
    g.poly([[-6, -38 + by], [hx + 8, hy - 4], [hx + 12, hy + 8], [-2, -28 + by]], col);                                   // 脖子
    g.poly([[hx + 10, hy - 8], [hx - 6, hy - 8], [hx - 16, hy - 3], [hx - 16, hy + 1], [hx - 4, hy + 2], [hx + 12, hy + 6]], col);   // 上顎
    g.poly([[hx + 8, hy + 4], [hx - 4, hy + 4 + bite * 3], [hx - 14, hy + 4 + bite * 6], [hx - 12, hy + 8 + bite * 6], [hx + 6, hy + 10]], dk);   // 下顎
    if (bite) { g.fill([[hx - 14, hy + 1], [hx - 4, hy + 2], [hx - 4, hy + 4 + bite * 3], [hx - 14, hy + 4 + bite * 6]], hex('#5a0a0a')); for (const k of [0, 1]) g.fill([[hx - 12 + k * 5, hy + 1], [hx - 10 + k * 5, hy + 4], [hx - 8 + k * 5, hy + 1]], '#ffffff'); }
    g.poly([[hx + 6, hy - 6], [hx + 16, hy - 18], [hx + 12, hy - 5]], horn); g.poly([[hx + 2, hy - 7], [hx + 8, hy - 16], [hx + 6, hy - 6]], horn);
    glowEye(g, hx - 4, hy - 3, acc, 1.8);
    for (let i = 0; i < 4; i++) g.poly([[-4 + i * 7, -42 + by], [-1 + i * 7, -48 + by], [2 + i * 7, -42 + by]], acc);   // 背棘
    wing(-0.3, false);
    return;
  }
  // 正面／背面
  g.poly([[-6, -14 + by], [6, -14 + by], [18 + Math.sin(f) * 4, -4 + by], [24 + Math.sin(f) * 6, -12 + by], [20, 0], [-2, -4]], col);   // 尾巴（從後面繞出來）
  if (!back) { wing(-1, true); wing(1, true); }
  g.poly([[-18 + step, 0], [-18 + step, -16 + by], [-8 + step, -16 + by], [-8 + step, 0]], dk);
  g.poly([[8 - step, 0], [8 - step, -16 + by], [18 - step, -16 + by], [18 - step, 0]], dk);
  g.poly([[-20, -18 + by], [-16, -42 + by], [16, -42 + by], [20, -18 + by], [12, -10 + by], [-12, -10 + by]], col);
  if (!back) {
    g.fill([[-10, -38 + by], [10, -38 + by], [8, -14 + by], [-8, -14 + by]], belly);
    for (const y of [-32, -26, -20]) g.line([-8, y + by], [8, y + by], 1, shade(belly, -0.3));
    const hy = -54 + by + bite * 6;
    g.poly([[-6, -40 + by], [6, -40 + by], [5, hy + 8], [-5, hy + 8]], col);
    g.poly([[-11, hy - 6], [11, hy - 6], [13, hy + 4], [6, hy + 12], [-6, hy + 12], [-13, hy + 4]], col);
    g.fill([[-8, hy + 6], [8, hy + 6], [5, hy + 12 + bite * 4], [-5, hy + 12 + bite * 4]], bite ? hex('#5a0a0a') : dk);
    if (bite) { g.fill([[-5, hy + 6], [-4, hy + 9], [-3, hy + 6]], '#ffffff'); g.fill([[3, hy + 6], [4, hy + 9], [5, hy + 6]], '#ffffff'); }
    for (const sx of [-1, 1]) { g.poly([[sx * 8, hy - 5], [sx * 18, hy - 18], [sx * 12, hy - 4]], horn); glowEye(g, sx * 6, hy, acc, 1.8); g.dot(sx * 3, hy + 6, 0.9, 0.9, hex('#2a0a0a')); }
  } else {
    for (let i = 0; i < 4; i++) g.poly([[-3, -40 + by + i * 7], [0, -46 + by + i * 7], [3, -40 + by + i * 7]], acc);
    g.poly([[-6, -40 + by], [6, -40 + by], [5, -54 + by], [-5, -54 + by]], col);
    g.ell(0, -58 + by, 11, 8, col);
    for (const sx of [-1, 1]) g.poly([[sx * 7, -62 + by], [sx * 16, -74 + by], [sx * 11, -60 + by]], horn);
    wing(-1, false); wing(1, false);
  }
};

export const MONSTER_ART: Record<string, Draw> = { wisp, wraith, lord, rockgolem, yeti, statue, dragon };
