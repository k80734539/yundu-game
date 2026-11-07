import type { ItemDef } from '../data';
/** 精煉規則（RO）：安全值內 100%；武器等級越高安全值越低；失敗裝備損毀 */
export function safeLimit(d: ItemDef) { return d.type === 'weapon' ? [7, 6, 5, 4][Math.min(3, (d.wlv || 1) - 1)] : 4; }
export function refineRate(d: ItemDef, cur: number): number {
  const next = cur + 1, safe = safeLimit(d);
  if (next <= safe) return 100;
  const table = d.type === 'weapon' ? [60, 50, 40, 30, 20, 19] : [60, 40, 40, 20, 20, 10];
  return table[Math.min(table.length - 1, next - safe - 1)];
}
export const refineMaterial = (d: ItemDef) => (d.type === 'weapon' ? 'oridecon' : 'elunium');
export const refineFee = (d: ItemDef) => (d.type === 'weapon' ? [50, 200, 5000, 20000][Math.min(3, (d.wlv || 1) - 1)] : 2000);
