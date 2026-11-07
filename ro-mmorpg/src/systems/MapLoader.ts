import { MapDef, XY } from '../data';
import { T, WALKABLE, TerrainName } from '../render/textures';
import { PROPS } from '../render/PropArt';
import { mulberry32, hash2, vnoise } from '../core/math';

export interface PropInst { type: string; x: number; y: number; v: number; w: number; h: number }
/** 地圖的格資料（純資料，不含繪圖） */
export class GameMap {
  w: number; h: number;
  terrain: Uint8Array; variant: Uint8Array; walk: Uint8Array;
  props: PropInst[] = [];
  /** 每格屬於哪個物件（-1 無） */
  propAt: Int32Array;
  constructor(public def: MapDef) {
    this.w = def.w; this.h = def.h;
    this.terrain = new Uint8Array(this.w * this.h);
    this.variant = new Uint8Array(this.w * this.h);
    this.walk = new Uint8Array(this.w * this.h);
    this.propAt = new Int32Array(this.w * this.h).fill(-1);
  }
  inside(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  t(x: number, y: number) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0) x = 0; if (y < 0) y = 0; if (x >= this.w) x = this.w - 1; if (y >= this.h) y = this.h - 1;
    return this.terrain[y * this.w + x];
  }
  canWalk(x: number, y: number) { x = Math.floor(x); y = Math.floor(y); return this.inside(x, y) && this.walk[y * this.w + x] === 1; }
  /** 最近的可走格 */
  nearestWalkable(x: number, y: number, maxR = 12): XY | null {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (this.canWalk(cx, cy)) return [cx, cy];
    for (let r = 1; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (this.canWalk(cx + dx, cy + dy)) return [cx + dx, cy + dy];
    }
    return null;
  }
  randomWalkable(r: () => number, tries = 300): XY | null {
    for (let i = 0; i < tries; i++) {
      const x = 2 + Math.floor(r() * (this.w - 4)), y = 2 + Math.floor(r() * (this.h - 4));
      if (this.canWalk(x, y)) return [x, y];
    }
    return null;
  }
}

const tid = (n: string) => (T as Record<string, number>)[n] ?? 0;

/** Catmull-Rom 樣條取樣，讓道路自然彎曲 */
function spline(pts: XY[], step = 0.25): XY[] {
  const out: XY[] = [];
  if (pts.length < 2) return pts.slice();
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function buildMap(def: MapDef): GameMap {
  const m = new GameMap(def);
  const { w, h } = m;
  const rnd = mulberry32(def.seed);
  const base = tid(def.base);
  const dungeon = def.type === 'dungeon';
  m.terrain.fill(dungeon ? T.wall : base);
  const stamp = (cx: number, cy: number, r: number, t: number, noisy = 0) => {
    for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++) for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) {
      if (!m.inside(x, y)) continue;
      const rr = r + (noisy ? (vnoise(x * 0.35, y * 0.35, def.seed) - 0.5) * noisy : 0);
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= rr) m.terrain[y * w + x] = t;
    }
  };
  if (dungeon) {
    for (const [x, y, rw, rh] of def.rooms || []) {
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (m.inside(i, j)) {
        // 房間邊緣做一點不規則
        const edge = i === x || j === y || i === x + rw - 1 || j === y + rh - 1;
        if (edge && hash2(i, j, def.seed) < 0.3) continue;
        m.terrain[j * w + i] = base;
      }
    }
    for (const c of def.corridors || []) for (const [x, y] of spline(c.pts, 0.3)) stamp(x, y, c.width / 2, base, 0.8);
  }
  for (const a of def.areas || []) {
    const t = tid(a.t);
    if (a.shape === 'rect') { for (let j = a.y; j < a.y + (a.h || 1); j++) for (let i = a.x; i < a.x + (a.w || 1); i++) if (m.inside(i, j)) m.terrain[j * w + i] = t; }
    else stamp(a.x, a.y, a.r || 3, t, a.shape === 'blob' ? (a.r || 3) * 0.7 : 0);
  }
  for (const r of def.roads || []) {
    const t = tid(r.t);
    for (const [x, y] of spline(r.pts)) stamp(x, y, r.width / 2, t, r.width * 0.25);
  }
  for (let i = 0; i < w * h; i++) {
    m.variant[i] = Math.floor(hash2(i % w, (i / w) | 0, def.seed + 5) * 4);
    m.walk[i] = WALKABLE[m.terrain[i]];
  }
  // 地圖外圈 2 格不可走（邊界由樹林／岩壁裝飾）
  const B = 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < B || y < B || x >= w - B || y >= h - B) m.walk[y * w + x] = 0;

  const reserved = new Set<number>();
  const reserve = (x: number, y: number, r: number) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) reserved.add((y + j) * w + (x + i)); };
  for (const p of def.portals) reserve(p.x, p.y, 2);
  for (const n of def.npcs || []) reserve(n.x, n.y, 1);
  if (def.mvp) reserve(def.mvp.x, def.mvp.y, 1);

  const addProp = (type: string, x: number, y: number, v: number, force = false) => {
    const pd = PROPS[type]; if (!pd) { console.warn('未知物件', type); return false; }
    for (let j = 0; j < pd.h; j++) for (let i = 0; i < pd.w; i++) {
      const xx = x + i, yy = y + j;
      if (!m.inside(xx, yy)) return false;
      if (!force && (m.propAt[yy * w + xx] >= 0)) return false;
    }
    const idx = m.props.length;
    m.props.push({ type, x, y, v, w: pd.w, h: pd.h });
    for (let j = 0; j < pd.h; j++) for (let i = 0; i < pd.w; i++) {
      const k = (y + j) * w + (x + i);
      m.propAt[k] = idx;
      if (pd.block) m.walk[k] = 0;
    }
    return true;
  };
  for (const p of def.props || []) addProp(p.type, p.x, p.y, p.v ?? Math.floor(hash2(p.x, p.y, 3) * 4), true);

  // 邊界裝飾
  if (dungeon) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (m.terrain[y * w + x] !== T.wall) continue;
      let near = false;
      for (let j = -1; j <= 1 && !near; j++) for (let i = -1; i <= 1; i++) { const xx = x + i, yy = y + j; if (m.inside(xx, yy) && m.terrain[yy * w + xx] !== T.wall) { near = true; break; } }
      if (near) addProp('rockwall', x, y, Math.floor(hash2(x, y, 9) * 4));
    }
  } else {
    const types = def.border === 'pine' ? ['pine', 'pine', 'tree'] : def.border === 'palm' ? ['palm', 'palm', 'rock'] : def.border === 'dead' ? ['deadtree', 'deadtree', 'rock'] : def.border === 'rock' ? ['rock', 'rock', 'pine'] : ['tree', 'tree', 'pine'];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ring = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (ring >= B) continue;
      if (reserved.has(y * w + x)) continue;
      const tt = m.terrain[y * w + x];
      if (tt === T.water || tt === T.road) continue;
      const dense = ring === 0 ? 0.75 : 0.5;
      if (hash2(x, y, def.seed + 1) < dense) {
        const ty = types[Math.floor(hash2(x, y, 2) * types.length)];
        addProp(ty, x, y, Math.floor(hash2(x, y, 4) * 4));
      }
    }
  }
  // 散佈物件（樹、石、花草）
  for (const s of def.scatter || []) {
    const on = (s.on || [def.base]).map(tid);
    let placed = 0, tries = 0;
    while (placed < s.n && tries < s.n * 30) {
      tries++;
      const x = B + Math.floor(rnd() * (w - B * 2)), y = B + Math.floor(rnd() * (h - B * 2));
      const k = y * w + x;
      if (reserved.has(k) || !on.includes(m.terrain[k])) continue;
      const pd = PROPS[s.type];
      if (pd.block) {
        // 不要擋住道路與傳送點周圍；擋路物件之間至少留一格
        let ok = true;
        for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1; i++) { const kk = (y + j) * w + (x + i); if (m.propAt[kk] >= 0 && PROPS[m.props[m.propAt[kk]].type].block) { ok = false; break; } if (m.terrain[kk] === T.road) { ok = false; break; } }
        if (!ok) continue;
      }
      const v = s.v ? s.v[Math.floor(rnd() * s.v.length)] : Math.floor(rnd() * 4);
      if (addProp(s.type, x, y, v)) placed++;
    }
  }
  // 確保傳送點、NPC 所在格可走
  for (const p of def.portals) { m.walk[p.y * w + p.x] = 1; }
  for (const n of def.npcs || []) m.walk[n.y * w + n.x] = 0; // NPC 本身擋路（RO 也是）
  return m;
}
