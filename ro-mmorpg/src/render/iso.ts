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
/** 8 方向（圖片精靈圖用）：回傳列號 0=下(S) 1=左下(SW) 2=左(W) 3=左上(NW) 4=上(N) 5=右上(NE) 6=右(E) 7=右下(SE)。
 *  斜 45 度地圖裡，世界座標 +x 看起來是往右下、+y 往左下，所以世界軸向對應到斜角朝向。 */
export function dir8FromWorldDelta(dx: number, dy: number, prev: number): number {
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return prev;
  const k = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8; // 0=+x … 逆時針（世界座標）
  return (k + 7) % 8;
}
export function dirFromWorldDelta(dx: number, dy: number, prev: number): number {
  const sx = (dx - dy), sy = (dx + dy) * 0.5;
  if (Math.abs(sx) < 1e-6 && Math.abs(sy) < 1e-6) return prev;
  if (Math.abs(sx) > Math.abs(sy) * 1.15) return sx < 0 ? 1 : 2;
  return sy > 0 ? 0 : 3;
}
