import { Entity } from './Entity';
import type { Actor } from './Actor';
export type ProjKind = 'arrow' | 'orb' | 'fire' | 'ice' | 'soul' | 'charge';
/** 投射物：箭、魔力彈、火焰彈（從天而降）…到達目標時呼叫 onHit */
export class Projectile extends Entity {
  kind = 'projectile' as const;
  z: number; pz: number; t = 0; dur: number;
  sx: number; sy: number; sz: number; tz: number;
  constructor(public pk: ProjKind, x: number, y: number, z: number, public target: Actor, public onHit: (p: Projectile) => void, speed = 14, public fromSky = false, delay = 0) {
    super(x, y);
    this.sx = x; this.sy = y; this.sz = z; this.z = this.pz = z;
    this.tz = Math.max(20, -target.bbox.y0 * 0.5);
    const d = Math.hypot(target.x - x, target.y - y);
    this.dur = fromSky ? 0.32 : Math.max(0.08, d / speed);
    this.t = -delay;
  }
  /** 回傳 true 表示已命中 */
  step(dt: number): boolean {
    this.savePrev(); this.pz = this.z;
    this.t += dt;
    if (this.t < 0) return false;
    const k = Math.min(1, this.t / this.dur);
    const tx = this.target.x, ty = this.target.y;
    if (this.fromSky) { this.x = tx; this.y = ty; this.z = this.tz + (1 - k) * 260; }
    else {
      this.x = this.sx + (tx - this.sx) * k; this.y = this.sy + (ty - this.sy) * k;
      this.z = this.sz + (this.tz - this.sz) * k + Math.sin(k * Math.PI) * (this.pk === 'arrow' ? 18 : 6);
    }
    if (k >= 1) { this.onHit(this); return true; }
    return false;
  }
}
