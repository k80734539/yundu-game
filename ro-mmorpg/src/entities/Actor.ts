import { Entity } from './Entity';
import type { Sheet } from '../render/SpriteFactory';
import type { XY } from '../data';
import { dirFromWorldDelta, dir8FromWorldDelta } from '../render/iso';

export type ActorState = 'idle' | 'walk' | 'attack' | 'cast' | 'sit' | 'dead';
export interface BBox { x0: number; y0: number; x1: number; y1: number }
const bboxCache = new WeakMap<Sheet, BBox>();
/** sheet 第一格的不透明範圍（相對腳底錨點），用於點選與血條高度 */
export function sheetBBox(s: Sheet): BBox {
  let b = bboxCache.get(s);
  if (b) return b;
  const c = s.c.getContext('2d', { willReadFrequently: true })!;
  const d = c.getImageData(0, 0, s.fw, s.fh).data;
  let x0 = s.fw, y0 = s.fh, x1 = 0, y1 = 0;
  for (let y = 0; y < s.fh; y++) for (let x = 0; x < s.fw; x++) if (d[(y * s.fw + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  b = { x0: x0 - s.ax, y0: y0 - s.ay, x1: x1 - s.ax, y1: y1 - s.ay };
  bboxCache.set(s, b);
  return b;
}

/** 會動、有血量的實體 */
export abstract class Actor extends Entity {
  name = '';
  sheet!: Sheet;
  dir = 0;
  dir8 = 0;             // 8 方向圖片精靈圖用的朝向列（0=下，順時針看是 下、左下、左、左上、上、右上、右、右下）
  state: ActorState = 'idle';
  animT = 0;
  path: XY[] = [];
  speed = 4;            // 格/秒
  hp = 100; maxHp = 100; sp = 0; maxSp = 0;
  flashT = 0;           // 受擊閃白
  deadT = 0;            // 死亡淡出計時
  atkAnimT = -1; atkAnimDur = 0.4; atkHit = false;
  atkCd = 0;            // 距離下次可攻擊的秒數
  target: Actor | null = null;
  hurtT = 0;            // 受擊僵直（畫面上的後仰）
  get dead() { return this.state === 'dead'; }
  get bbox() { return sheetBBox(this.sheet); }

  setPath(p: XY[] | null) { this.path = p || []; }
  stop() { this.path = []; if (this.state === 'walk') this.state = 'idle'; }
  face(tx: number, ty: number) { this.dir = dirFromWorldDelta(tx - this.x, ty - this.y, this.dir); this.dir8 = dir8FromWorldDelta(tx - this.x, ty - this.y, this.dir8); }

  /** 沿路徑移動，回傳是否還在移動 */
  stepPath(dt: number): boolean {
    if (!this.path.length) return false;
    let move = this.speed * dt;
    while (move > 0 && this.path.length) {
      const [tx, ty] = this.path[0];
      const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
      if (d > 1e-4) { this.dir = dirFromWorldDelta(dx, dy, this.dir); this.dir8 = dir8FromWorldDelta(dx, dy, this.dir8); }
      if (d <= move) { this.x = tx; this.y = ty; move -= d; this.path.shift(); }
      else { this.x += (dx / d) * move; this.y += (dy / d) * move; move = 0; }
    }
    return true;
  }
  /** 開始攻擊動畫；命中判定在動畫 55% 時（onHit） */
  startAttack(dur: number) { this.atkAnimT = 0; this.atkAnimDur = dur; this.atkHit = false; this.state = 'attack'; this.animT = 0; }
  /** 回傳 true 表示這一幀到了命中點 */
  tickAttack(dt: number): boolean {
    if (this.atkAnimT < 0) return false;
    this.atkAnimT += dt;
    let hit = false;
    if (!this.atkHit && this.atkAnimT >= this.atkAnimDur * 0.55) { this.atkHit = true; hit = true; }
    if (this.atkAnimT >= this.atkAnimDur) { this.atkAnimT = -1; if (this.state === 'attack') this.state = 'idle'; }
    return hit;
  }
  /** 目前要畫的格 */
  frameIndex(): number {
    switch (this.state) {
      case 'walk': return 2 + (Math.floor(this.animT * this.speed * 2.1) % 4);
      case 'attack': return this.atkAnimT < 0 ? 0 : 6 + Math.min(3, Math.floor((this.atkAnimT / this.atkAnimDur) * 4));
      case 'cast': return 6 + (Math.floor(this.animT * 4) % 2);
      case 'sit': return 1;
      case 'dead': return 0;
      default: return Math.floor(this.animT * 1.6) % 2;
    }
  }
  updateAnim(dt: number) {
    this.animT += dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.atkCd > 0) this.atkCd -= dt;
  }
}
