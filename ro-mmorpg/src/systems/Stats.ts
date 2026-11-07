import { DB, JOBS, ItemDef } from '../data';

export const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'] as const;
export type StatKey = typeof STAT_KEYS[number];
export type Stats6 = Record<StatKey, number>;
export const STAT_NAMES: Record<StatKey, string> = { str: '力量', agi: '敏捷', vit: '體力', int: '智力', dex: '靈巧', luk: '幸運' };
export const MAX_STAT = 99;

/** 加點花費：RO 公式 floor((x-1)/10)+2 */
export const statCost = (x: number) => Math.floor((x - 1) / 10) + 2;
/** 升級獲得的能力點數 */
export const statPointsForLevel = (lv: number) => Math.floor(lv / 5) + 3;
export function expNeed(lv: number) { return JOBS.expBase[lv - 1] ?? Infinity; }
export function jobExpNeed(job: string, jlv: number) { const t = DB.job[job].tier === 0 ? JOBS.expJob : JOBS.expJob1; return t[jlv - 1] ?? Infinity; }

export interface Derived {
  maxHp: number; maxSp: number;
  statusAtk: number; weaponAtk: number; atkMin: number; atkMax: number;
  matkMin: number; matkMax: number;
  hit: number; flee: number; crit: number; pdodge: number;
  def: number; softDef: number; mdef: number; softMdef: number;
  aspd: number; delay: number;
  total: Stats6; bonus: Stats6;
  hpRegen: number; spRegen: number; weight: number;
}
/** 角色成長資料（存檔的主體） */
export interface CharData {
  name: string; job: string; baseLv: number; jobLv: number; baseExp: number; jobExp: number;
  stats: Stats6; statPts: number; skillPts: number; skills: Record<string, number>;
  zeny: number;
}
export interface EquipInfo { item: ItemDef; refine: number; cards: ItemDef[] }

const zero = (): Stats6 => ({ str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 });
/** 依職業、等級、六圍、裝備計算衍生數值（RO 前期公式的簡化版） */
export function derive(ch: CharData, equips: EquipInfo[], buffs: Record<string, number> = {}): Derived {
  const job = DB.job[ch.job];
  const bonus = zero();
  // 職業加成（依職業等級）
  for (const [lv, k] of job.bonus) if (ch.jobLv >= lv) bonus[k as StatKey]++;
  let atkB = 0, matkB = 0, defB = 0, mdefB = 0, hitB = 0, fleeB = 0, critB = 0, hpB = 0, spB = 0, aspdB = 0;
  let weaponAtk = 0, wlv = 1, wtype = 'none', matkPct = 0;
  for (const e of equips) {
    const it = e.item;
    const add = (src: ItemDef['bonus']) => {
      if (!src) return;
      for (const k of STAT_KEYS) if (src[k]) bonus[k] += src[k]!;
      atkB += src.atk || 0; matkB += src.matk || 0; defB += src.def || 0; hitB += src.hit || 0; fleeB += src.flee || 0;
      critB += src.crit || 0; hpB += src.hp || 0; spB += src.sp || 0; aspdB += src.aspd || 0;
    };
    add(it.bonus);
    for (const c of e.cards) add(c.bonus);
    if (it.slot === 'weapon') {
      weaponAtk = (it.atk || 0) + e.refine * [2, 3, 5, 7][Math.min(3, (it.wlv || 1) - 1)];
      wlv = it.wlv || 1; wtype = it.wtype || 'none'; matkPct = it.matk || 0;
    } else {
      defB += (it.def || 0) + Math.floor(e.refine * 0.7 + (e.refine > 0 ? 0.3 : 0)); mdefB += it.mdef || 0;
    }
  }
  // 增益
  if (buffs.concentration) { bonus.agi += buffs.concentration; bonus.dex += buffs.concentration; }
  if (buffs.blessing) { bonus.str += buffs.blessing; bonus.int += buffs.blessing; bonus.dex += buffs.blessing; }
  if (buffs.agiup) bonus.agi += buffs.agiup;
  const t = zero();
  for (const k of STAT_KEYS) t[k] = ch.stats[k] + bonus[k];
  const lv = ch.baseLv;
  const ranged = wtype === 'bow';
  const main = ranged ? t.dex : t.str, sub = ranged ? t.str : t.dex;
  const statusAtk = main + Math.floor(main / 10) ** 2 + Math.floor(sub / 5) + Math.floor(t.luk / 5) + atkB;
  // 武器傷害下限受靈巧影響（RO：DEX 越高越穩定）
  const wMin = Math.min(weaponAtk, Math.floor(t.dex * (0.8 + 0.2 * wlv)));
  const matkMin = t.int + Math.floor(t.int / 7) ** 2 + matkB, matkMax = t.int + Math.floor(t.int / 5) ** 2 + matkB;
  let baseHp = 35 + lv * job.hpB;
  for (let i = 2; i <= lv; i++) baseHp += Math.round(job.hpK * i);
  const baseSp = 10 + lv * job.spK;
  const maxHp = Math.floor(baseHp * (1 + t.vit / 100)) + hpB;
  const maxSp = Math.floor(baseSp * (1 + t.int / 100)) + spB;
  const baseAspd = job.aspd[wtype] ?? job.aspd.none ?? 150;
  let aspd = 200 - (200 - baseAspd) * (1 - (t.agi * 4 + t.dex) / 1000) + aspdB;
  if (buffs.endure) aspd += 0;
  aspd = Math.min(190, Math.round(aspd * 10) / 10);
  return {
    maxHp, maxSp, statusAtk, weaponAtk,
    atkMin: statusAtk + wMin, atkMax: statusAtk + weaponAtk,
    matkMin: Math.round(matkMin * (1 + matkPct / 100)), matkMax: Math.round(matkMax * (1 + matkPct / 100)),
    hit: lv + t.dex + hitB + (buffs.concentration ? 0 : 0),
    flee: lv + t.agi + fleeB,
    crit: 1 + Math.floor(t.luk * 0.3) + critB,
    pdodge: 1 + Math.floor(t.luk / 10),
    def: Math.min(90, defB), softDef: Math.floor(t.vit / 2) + Math.floor(t.vit * t.vit / 150),
    mdef: Math.min(90, mdefB), softMdef: t.int,
    aspd, delay: (200 - aspd) / 50,
    total: t, bonus,
    hpRegen: Math.max(1, Math.floor(maxHp / 200)) + Math.floor(t.vit / 5),
    spRegen: 1 + Math.floor(maxSp / 100) + Math.floor(t.int / 6),
    weight: 2000 + t.str * 30,
  };
}
