export const TW = 64, TH = 32, HW = TW / 2, HH = TH / 2;
/** 世界（格）→ 等角像素（未減相機） */
export const isoX = (x: number, y: number) => (x - y) * HW;
export const isoY = (x: number, y: number) => (x + y) * HH;
/** 等角像素 → 世界（格） */
export function unIso(px: number, py: number): { x: number; y: number } {
  const a = px / HW, b = py / HH;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
/** 依螢幕向量決定 4 方向：0 下 1 左 2 右 3 上 */
export function dirFromWorldDelta(dx: number, dy: number, prev: number): number {
  const sx = (dx - dy), sy = (dx + dy) * 0.5;
  if (Math.abs(sx) < 1e-6 && Math.abs(sy) < 1e-6) return prev;
  if (Math.abs(sx) > Math.abs(sy) * 1.15) return sx < 0 ? 1 : 2;
  return sy > 0 ? 0 : 3;
}
