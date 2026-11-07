import type { GameMap } from './MapLoader';
import type { XY } from '../data';

/** A*：8 方向、禁止切角（斜走時兩側都要可走）、二元堆積；結果再用視線拉直 */
export class Pathfinder {
  private g: Float32Array; private f: Float32Array; private parent: Int32Array; private stamp: Uint32Array; private closed: Uint32Array;
  private heap: Int32Array; private hn = 0; private gen = 1;
  constructor(private m: GameMap) {
    const n = m.w * m.h;
    this.g = new Float32Array(n); this.f = new Float32Array(n); this.parent = new Int32Array(n);
    this.stamp = new Uint32Array(n); this.closed = new Uint32Array(n); this.heap = new Int32Array(n);
  }
  private push(i: number) {
    let k = this.hn++; const h = this.heap, f = this.f;
    h[k] = i;
    while (k > 0) { const p = (k - 1) >> 1; if (f[h[p]] <= f[h[k]]) break; [h[p], h[k]] = [h[k], h[p]]; k = p; }
  }
  private pop(): number {
    const h = this.heap, f = this.f; const top = h[0];
    h[0] = h[--this.hn];
    let k = 0;
    for (;;) {
      const l = k * 2 + 1, r = l + 1; let m = k;
      if (l < this.hn && f[h[l]] < f[h[m]]) m = l;
      if (r < this.hn && f[h[r]] < f[h[m]]) m = r;
      if (m === k) break; [h[m], h[k]] = [h[k], h[m]]; k = m;
    }
    return top;
  }
  /** 回傳格中心座標的路徑（不含起點）；找不到回傳 null。maxNodes 限制搜尋量 */
  find(sx: number, sy: number, tx: number, ty: number, maxNodes = 6000, stopDist = 0): XY[] | null {
    const m = this.m, W = m.w;
    sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
    if (!m.inside(tx, ty)) return null;
    if (sx === tx && sy === ty) return [];
    this.gen++; if (this.gen > 4e9) { this.gen = 1; this.stamp.fill(0); this.closed.fill(0); }
    const gen = this.gen;
    const start = sy * W + sx, goal = ty * W + tx;
    const h = (i: number) => { const dx = Math.abs((i % W) - tx), dy = Math.abs(((i / W) | 0) - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    this.hn = 0;
    this.stamp[start] = gen; this.g[start] = 0; this.f[start] = h(start); this.parent[start] = -1;
    this.push(start);
    let best = start, bestH = h(start), n = 0;
    while (this.hn > 0) {
      const cur = this.pop();
      if (this.closed[cur] === gen) continue;
      this.closed[cur] = gen;
      const cx = cur % W, cy = (cur / W) | 0;
      const hc = h(cur);
      if (hc < bestH) { bestH = hc; best = cur; }
      if (cur === goal || (stopDist > 0 && Math.max(Math.abs(cx - tx), Math.abs(cy - ty)) <= stopDist && m.walk[cur])) { best = cur; break; }
      if (++n > maxNodes) break;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= m.h) continue;
        const ni = ny * W + nx;
        if (!m.walk[ni] || this.closed[ni] === gen) continue;
        if (dx && dy && (!m.walk[cy * W + nx] || !m.walk[ny * W + cx])) continue; // 禁止切角
        const ng = this.g[cur] + (dx && dy ? 1.414 : 1);
        if (this.stamp[ni] !== gen || ng < this.g[ni]) {
          this.stamp[ni] = gen; this.g[ni] = ng; this.f[ni] = ng + h(ni) * 1.001; this.parent[ni] = cur;
          this.push(ni);
        }
      }
    }
    if (best === start) return null;
    const out: XY[] = [];
    for (let i = best; i !== start && i >= 0; i = this.parent[i]) out.push([(i % W) + 0.5, ((i / W) | 0) + 0.5]);
    out.reverse();
    return this.smooth(sx + 0.5, sy + 0.5, out);
  }
  /** 視線檢查：線段經過的格（含寬度）都可走 */
  los(x0: number, y0: number, x1: number, y1: number): boolean {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 0.2);
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      for (const [ox, oy] of [[0.28, 0.28], [-0.28, 0.28], [0.28, -0.28], [-0.28, -0.28]]) if (!this.m.canWalk(x + ox, y + oy)) return false;
    }
    return true;
  }
  private smooth(sx: number, sy: number, path: XY[]): XY[] {
    if (path.length < 2) return path;
    const out: XY[] = [];
    let ax = sx, ay = sy, i = 0;
    while (i < path.length) {
      let j = path.length - 1;
      while (j > i && !this.los(ax, ay, path[j][0], path[j][1])) j--;
      out.push(path[j]); ax = path[j][0]; ay = path[j][1]; i = j + 1;
    }
    return out;
  }
}
