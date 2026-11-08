import type { Game } from '../core/Game';
import { DB, LOOT, ITEMS, ItemDef, Rarity } from '../data';
import type { Affix, InvItem } from './Inventory';

/** 打寶系統：稀有度、隨機主數值與詞條、Boss 掉落表與保底、分解與兌換。數字全部在 data/loot.json */
export const RAR = Object.fromEntries(LOOT.rarities.map((r) => [r.id, r])) as Record<Rarity, { id: Rarity; name: string; color: string; affixes: number }>;
export const RANK: Record<Rarity, number> = { common: 0, magic: 1, rare: 2, legend: 3, boss: 4 };
export const isGear = (d: ItemDef) => d.type === 'weapon' || d.type === 'armor';
export function rarityOf(it: { id: string; rar?: Rarity }): Rarity {
  const d = DB.item[it.id];
  if (it.rar) return it.rar;
  if (d?.bossEx) return 'boss';
  if (d?.type === 'card') return LOOT.cardRarity;
  return 'common';
}
export const colorOf = (it: { id: string; rar?: Rarity }) => RAR[rarityOf(it)].color;
function weighted(r: () => number, w: Record<string, number>): string {
  const tot = Object.values(w).reduce((a, b) => a + b, 0); let x = r() * tot;
  for (const [k, v] of Object.entries(w)) { x -= v; if (x < 0) return k; }
  return Object.keys(w)[0];
}
const rnd = (r: () => number, a: number, b: number) => a + r() * (b - a);
/** 主數值範圍：itemRanges 指定的優先，否則用基礎值 × 稀有度倍率 */
export function mainRange(d: ItemDef, rar: Rarity): [number, number] | null {
  const base = d.type === 'weapon' ? d.atk : d.def;
  if (!base) return null;
  if (LOOT.itemRanges[d.id]) return LOOT.itemRanges[d.id];
  const f = LOOT.mainStatRange[rar];
  return [Math.max(1, Math.round(base * f[0])), Math.max(1, Math.round(base * f[1]))];
}
export function affixRange(k: string, rar: Rarity): [number, number] {
  const a = LOOT.affixes[k].range, m = rar === 'boss' ? LOOT.affixBossBonus : 1;
  return [Math.round(a[0] * m), Math.round(a[1] * m)];
}
/** 撿到時才擲數值 */
export function rollGear(d: ItemDef, rar: Rarity, r: () => number): Partial<InvItem> {
  const out: Partial<InvItem> = { rar };
  const rg = mainRange(d, rar);
  if (rg) { const v = Math.round(rnd(r, rg[0], rg[1] + 0.999) - 0.5); const key = d.type === 'weapon' ? 'atk' : 'def'; out.roll = { [key]: Math.max(rg[0], Math.min(rg[1], v)) }; }
  const n = RAR[rar].affixes; const keys = Object.keys(LOOT.affixes); const aff: Affix[] = [];
  for (let i = 0; i < n && keys.length; i++) {
    const k = keys.splice(Math.floor(r() * keys.length), 1)[0];
    const [a, b] = affixRange(k, rar);
    const a2: Affix = { k, v: Math.round(rnd(r, a, b + 0.999) - 0.5) }; a2.v = Math.max(a, Math.min(b, a2.v));
    if (k === 'elem') { const els = Object.keys(LOOT.affixes.elem.elements || {}); a2.el = els[Math.floor(r() * els.length)]; }
    aff.push(a2);
  }
  if (aff.length) out.aff = aff;
  return out;
}
/** 在範圍中的位置 0~1 */
export const quality = (v: number, rg: [number, number]) => (rg[1] === rg[0] ? 1 : (v - rg[0]) / (rg[1] - rg[0]));
export const canUse = (d: ItemDef, job: string) => !d.jobs || d.jobs.includes(job);

export class Loot {
  constructor(private g: Game) {}
  /** 一般怪掉落：裝備才擲稀有度 */
  monsterRarity(d: ItemDef): Rarity { if (d.bossEx) return 'boss'; if (!isGear(d)) return d.type === 'card' ? LOOT.cardRarity : 'common'; return weighted(this.g.rnd, LOOT.monsterRarityWeights) as Rarity; }
  /** Boss 掉落表：必掉 Zeny 與素材、30% 通用裝備、8% 專屬武器（70% 自己職業、10 次保底）、1% 卡片 */
  bossDrops(bossId: string): { id: string; n: number; rar?: Rarity }[] {
    const t = LOOT.boss[bossId]; if (!t) return [];
    const g = this.g, r = g.rnd, out: { id: string; n: number; rar?: Rarity }[] = [];
    out.push({ id: 'zeny', n: Math.round(rnd(r, t.zeny[0], t.zeny[1])) });
    out.push({ id: t.material, n: Math.round(rnd(r, t.materialCount[0], t.materialCount[1])) });
    if (r() < t.equipChance) {
      const pool = ITEMS.filter((i) => isGear(i) && !i.bossEx);
      out.push({ id: pool[Math.floor(r() * pool.length)].id, n: 1, rar: weighted(r, LOOT.bossRarityWeights) as Rarity });
    }
    const pity = (g.flags.pity ||= {});
    pity[bossId] = (pity[bossId] || 0) + 1;
    if (r() < t.exclusiveChance || pity[bossId] >= LOOT.pity) {
      const job = g.player.ch.job;
      const mine = t.exclusives.filter((id) => canUse(DB.item[id], job)), others = t.exclusives.filter((id) => !mine.includes(id));
      const list = mine.length && (r() < LOOT.ownJobChance || !others.length) ? mine : others;
      out.push({ id: list[Math.floor(r() * list.length)], n: 1, rar: 'boss' });
      if (pity[bossId] >= LOOT.pity) g.msg(`保底觸發：${DB.monster[bossId]?.name} 第 ${pity[bossId]} 次必掉專屬武器！`, 'quest');
      pity[bossId] = 0;
    }
    if (r() < t.cardChance) out.push({ id: t.card, n: 1 });
    return out;
  }
  /** 分解：得到 Boss 素材（Boss 專屬回原 Boss 素材，其他依武器等級） */
  dismantleResult(it: InvItem): { id: string; n: number } {
    const d = DB.item[it.id], rar = rarityOf(it);
    let mat = LOOT.dismantle.materialByWeaponLevel[String(d.wlv || 1)] || LOOT.dismantle.defaultMaterial;
    if (d.bossEx && LOOT.boss[d.bossEx]) mat = LOOT.boss[d.bossEx].material;
    return { id: mat, n: (LOOT.dismantle[rar] as number) || 1 };
  }
  dismantle(uid: number): boolean {
    const g = this.g, it = g.inv.get(uid); if (!it || g.inv.isEquipped(uid) || !isGear(DB.item[it.id])) return false;
    const res = this.dismantleResult(it);
    g.inv.remove(uid, 1); g.inv.add(res.id, res.n);
    g.msg(`分解了 ${DB.item[it.id].name}，得到 ${DB.item[res.id].name} ×${res.n}`, 'item'); g.audio.sfx('refine_fail');
    g.save.saveSoon(); return true;
  }
  exchange(itemId: string): string | null {
    const g = this.g, rec = LOOT.exchange.find((e) => e.items.includes(itemId)); if (!rec) return '沒有這個兌換項目';
    for (const [m, n] of Object.entries(rec.cost)) if (g.inv.count(m) < n) return `${DB.item[m].name} 不足（需要 ${n}）`;
    for (const [m, n] of Object.entries(rec.cost)) g.inv.removeId(m, n);
    const roll = rollGear(DB.item[itemId], 'boss', g.rnd);
    if (!g.inv.add(itemId, 1, roll)) return '負重不足';
    g.msg(`兌換了 ${DB.item[itemId].name}！`, 'quest'); g.audio.sfx('loot_legend'); g.save.saveSoon();
    return null;
  }
}
