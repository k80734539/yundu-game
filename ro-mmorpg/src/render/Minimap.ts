import { GameMap, buildMap } from '../systems/MapLoader';
import { MINI, T } from './textures';
import { PROPS } from './PropArt';
import { makeCanvas } from './pixel';
import { DB } from '../data';

/** 小地圖：菱形方向與畫面一致，每格 4×2 像素 */
export const MK = 2;
export function miniPos(m: { w: number; h: number }, x: number, y: number, k = MK) { return [(x - y + m.h) * k, (x + y) * k * 0.5]; }
const baseCache = new Map<string, HTMLCanvasElement>();
export function miniBase(m: GameMap, k = MK): HTMLCanvasElement {
  const key = m.def.id + ':' + k;
  const hit = baseCache.get(key); if (hit) return hit;
  const W = (m.w + m.h) * k + 4, H = (m.w + m.h) * k * 0.5 + 4;
  const cv = makeCanvas(W, H); const c = cv.getContext('2d')!;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const t = m.terrain[y * m.w + x];
    let col = MINI[t];
    const pi = m.propAt[y * m.w + x];
    if (pi >= 0) {
      const pd = PROPS[m.props[pi].type];
      if (pd.block) col = pd.origin ? '#a0603a' : m.props[pi].type === 'rockwall' ? '#3a3238' : t === T.sand ? '#5a8a3a' : '#2f5a2a';
    }
    if (m.def.type === 'dungeon' && t === T.wall && pi < 0) continue;
    const [px, py] = miniPos(m, x, y, k);
    c.fillStyle = col; c.fillRect(Math.round(px - k) + 2, Math.round(py) + 2, k * 2, Math.max(1, k));
  }
  baseCache.set(key, cv);
  return cv;
}
const mapCache = new Map<string, GameMap>();
/** 世界地圖用：只建地形，不建繪圖資料 */
export function mapData(id: string): GameMap { let m = mapCache.get(id); if (!m) { m = buildMap(DB.map[id]); mapCache.set(id, m); } return m; }
