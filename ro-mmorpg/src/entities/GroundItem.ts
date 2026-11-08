import { Entity } from './Entity';
import type { ItemDef, Rarity } from '../data';
/** 地上的掉落物：彈跳落地、60 秒後消失 */
export class GroundItem extends Entity {
  kind = 'item' as const;
  t = 0; life = 60;
  sx: number; sy: number;  // 掉落起點（彈跳動畫）
  constructor(public def: ItemDef, public n: number, x: number, y: number, fromX: number, fromY: number, public extra: { refine?: number; cards?: string[]; rar?: Rarity; roll?: { atk?: number; def?: number }; aff?: { k: string; v: number; el?: string }[]; src?: string } = {}) {
    super(x, y); this.sx = fromX; this.sy = fromY;
  }
  get z() { const k = Math.min(1, this.t / 0.45); return Math.sin(k * Math.PI) * 26 * (1 - k * 0.3); }
  get ox() { const k = Math.min(1, this.t / 0.45); return this.sx + (this.x - this.sx) * k; }
  get oy() { const k = Math.min(1, this.t / 0.45); return this.sy + (this.y - this.sy) * k; }
}
