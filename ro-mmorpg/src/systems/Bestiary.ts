import type { Game } from '../core/Game';
import { BESTIARY, DB, MAPS, MONSTERS, type DexMilestone, type MonsterDef } from '../data';

interface DexData { k: Record<string, number>; d: Record<string, string[]>; claimed: Record<string, boolean> }
/** 怪物圖鑑：資料存在 flags.dex（跟著存檔，舊存檔沒有就是空的） */
export class Bestiary {
  constructor(private g: Game) {}
  private get dex(): DexData { const f = this.g.flags; if (!f.dex) f.dex = { k: {}, d: {}, claimed: {} }; return f.dex; }
  /** 圖鑑列得出來的怪物：出現在某張地圖（含 MVP、試煉 Boss）的才算 */
  list(): MonsterDef[] {
    const ids = new Set<string>();
    for (const m of MAPS) { for (const s of m.spawns || []) ids.add(s.m); if (m.mvp) ids.add(m.mvp.m); }
    return MONSTERS.filter((d) => ids.has(d.id)).sort((a, b) => a.lv - b.lv || a.id.localeCompare(b.id));
  }
  kills(id: string) { return this.dex.k[id] || 0; }
  seen(id: string) { return this.kills(id) >= 1; }
  mastered(id: string) { return this.kills(id) >= BESTIARY.mastered; }
  tier(id: string) { const k = this.kills(id); return k >= BESTIARY.drops ? 3 : k >= BESTIARY.stats ? 2 : k >= 1 ? 1 : 0; }
  dropSeen(mon: string, item: string) { return (this.dex.d[mon] || []).includes(item); }
  count(kind: 'seen' | 'mastered') { return this.list().filter((d) => (kind === 'seen' ? this.seen(d.id) : this.mastered(d.id))).length; }
  /** 出沒地點（地圖名稱） */
  places(id: string): string[] { return MAPS.filter((m) => (m.spawns || []).some((s) => s.m === id) || m.mvp?.m === id).map((m) => m.name); }
  record(id: string) { this.dex.k[id] = (this.dex.k[id] || 0) + 1; this.g.save.saveSoon(); }
  recordDrop(mon: string, item: string) { if (item === 'zeny') return; const a = (this.dex.d[mon] ||= []); if (!a.includes(item)) a.push(item); }
  needOf(m: DexMilestone) { return m.need === 'all' ? this.list().length : m.need; }
  progress(m: DexMilestone) { return this.count(m.kind); }
  claimed(m: DexMilestone) { return !!this.dex.claimed[m.id]; }
  claimable(m: DexMilestone) { return !this.claimed(m) && this.progress(m) >= this.needOf(m); }
  /** 領取收集獎勵；背包放不下道具時整筆不給 */
  claim(m: DexMilestone): string | null {
    if (!this.claimable(m)) return '還沒達成。';
    const g = this.g, ch = g.player.ch, r = m.reward;
    const items = r.items || [];
    if (items.some(([id, n]) => g.inv.weight() + Math.round((DB.item[id].weight * n) / 10) > Math.floor(g.player.d.weight / 10))) return '負重不足，先整理一下背包（可以放進倉庫）。';
    this.dex.claimed[m.id] = true;
    if (r.statPts) ch.statPts += r.statPts;
    if (r.zeny) ch.zeny += r.zeny;
    for (const [id, n] of items) g.inv.add(id, n);
    g.ev.emit('stats'); g.ui.sfx('quest');
    g.msg(`圖鑑獎勵：${this.rewardText(m)}`, 'quest'); g.save.saveSoon();
    return null;
  }
  rewardText(m: DexMilestone) {
    const r = m.reward, a: string[] = [];
    if (r.statPts) a.push(`能力點數 +${r.statPts}`); if (r.zeny) a.push(`${r.zeny.toLocaleString()} Zeny`);
    for (const [id, n] of r.items || []) a.push(`${DB.item[id].name} ×${n}`);
    return a.join('、');
  }
}
