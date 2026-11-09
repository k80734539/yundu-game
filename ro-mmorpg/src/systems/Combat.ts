import type { Derived } from './Stats';
import type { MonsterDef } from '../data';

export interface HitResult { dmg: number; kind: 'deal' | 'crit' | 'miss'; lucky?: boolean }
const rint = (r: () => number, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
export const clampRate = (v: number) => Math.max(5, Math.min(95, v));

/** 玩家物理攻擊怪物：命中 = 80 + HIT - 怪物FLEE；爆擊無視迴避與防禦 */
export function playerVsMonster(d: Derived, m: MonsterDef, r: () => number, mult = 1, noCrit = false, forceHit = false): HitResult {
  const mFlee = m.lv + m.agi;
  const critRate = d.crit - Math.floor(m.luk / 5);
  if (!noCrit && r() * 100 < critRate) {
    return { dmg: Math.max(1, Math.round(d.atkMax * 1.4 * mult)), kind: 'crit' };
  }
  if (!forceHit && r() * 100 >= clampRate(80 + d.hit - mFlee)) return { dmg: 0, kind: 'miss' };
  const atk = rint(r, d.atkMin, Math.max(d.atkMin, d.atkMax));
  const dmg = Math.round(atk * mult * (100 - m.def * (1 - (d.pierce || 0) / 100)) / 100) - m.vit; // 穿甲：無視部分防禦
  return { dmg: Math.max(1, dmg), kind: 'deal' };
}
/** 玩家魔法攻擊：必中，MATK 隨機 × 倍率，扣魔防 */
export function magicVsMonster(d: Derived, m: MonsterDef, r: () => number, mult = 1): HitResult {
  const matk = rint(r, d.matkMin, Math.max(d.matkMin, d.matkMax));
  const dmg = Math.round(matk * mult * (100 - m.mdef) / 100) - m.int;
  return { dmg: Math.max(1, dmg), kind: 'deal' };
}
/** 怪物攻擊玩家：命中 = 80 + 怪HIT - 玩家FLEE；完全迴避看 LUK */
export function monsterVsPlayer(m: MonsterDef, d: Derived, r: () => number, mult = 1): HitResult {
  if (r() * 100 < d.pdodge) return { dmg: 0, kind: 'miss', lucky: true };
  if (r() * 100 >= clampRate(80 + m.lv + m.dex - d.flee)) return { dmg: 0, kind: 'miss' };
  const atk = rint(r, m.atk[0], m.atk[1]) * mult;
  const dmg = Math.round(atk * (100 - d.def) / 100) - d.softDef;
  return { dmg: Math.max(1, dmg), kind: 'deal' };
}
