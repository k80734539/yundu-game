import type { EquipInfo } from './Stats';
import { rarityOf, RAR } from './Loot';

/** 裝備發光：依「精煉等級」「稀有度」「高階裝備（需 Lv85、MVP 專屬）」算出角色身上的光。數字都在這個檔案最上面。 */
export const GLOW = {
  refine: [[5, 1, '#9ad8ff'], [7, 2, '#4aa8ff'], [9, 3, '#ffd040'], [10, 4, '#ffffff']] as [number, number, string][],  // [精煉等級≥, 光的等級, 顏色]
  rarity: { rare: 1, legend: 2, boss: 3 } as Record<string, number>,                                                       // 稀有度 → 光的等級（顏色用稀有度色）
  highTierReqLv: 85,                                                                                                       // 需求等級 ≥ 這個值算高階裝備
  highTierColor: '#ffe9a0',
  highTierSetLevel: [[2, 2], [4, 3]] as [number, number][],                                                                // [高階件數≥, 光的等級]
  rainbow: ['#ff6a6a', '#ffb060', '#ffe860', '#70f090', '#70c8ff', '#c090ff'],                                             // 等級 4（精煉 +10）輪流換色
};
export interface GlowInfo { lv: number; color: string; rainbow: boolean }
/** 從身上的裝備算出光；沒有就回傳 null */
export function equipGlow(infos: EquipInfo[]): GlowInfo | null {
  let lv = 0, color = '#ffffff', rainbow = false;
  const take = (l: number, col: string, rb = false) => { if (l > lv) { lv = l; color = col; rainbow = rb; } };
  let high = 0;
  for (const e of infos) {
    for (const [r, l, col] of GLOW.refine) if (e.refine >= r) take(l, col, l === 4);
    const inst = (e.inst as { rar?: string } | undefined) || {};
    const rar = rarityOf({ id: e.item.id, rar: inst.rar as never });
    const rl = GLOW.rarity[rar]; if (rl) take(rl, RAR[rar].color);
    if (e.item.bossEx) take(2, e.item.icon.c || '#ffd860');                                  // MVP 專屬武器：用武器本身的顏色
    if ((e.item.reqLv || 0) >= GLOW.highTierReqLv) high++;
  }
  for (const [n, l] of GLOW.highTierSetLevel) if (high >= n) take(l, GLOW.highTierColor);
  return lv ? { lv, color, rainbow } : null;
}
