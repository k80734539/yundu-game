import { DB, ItemDef } from '../data';
import type { EquipInfo } from './Stats';

export type EquipSlot = 'weapon' | 'head' | 'armor' | 'shield' | 'garment' | 'shoes' | 'acc1' | 'acc2';
export const EQUIP_SLOTS: EquipSlot[] = ['head', 'armor', 'weapon', 'shield', 'garment', 'shoes', 'acc1', 'acc2'];
export const SLOT_NAMES: Record<EquipSlot, string> = { head: '頭飾', armor: '鎧甲', weapon: '武器', shield: '盾牌', garment: '披風', shoes: '鞋子', acc1: '飾品', acc2: '飾品' };
export interface InvItem { uid: number; id: string; n: number; refine: number; cards: string[] }
let UID = 1;
export const stackable = (it: ItemDef) => it.type === 'use' || it.type === 'etc' || it.type === 'card';

/** 背包與裝備（純資料邏輯，UI 另外處理） */
export class Inventory {
  items: InvItem[] = [];
  equip: Partial<Record<EquipSlot, number>> = {};
  constructor(private maxWeight: () => number, private onChange: () => void) {}
  def(id: string) { return DB.item[id]; }
  get(uid: number) { return this.items.find((i) => i.uid === uid); }
  count(id: string) { let n = 0; for (const i of this.items) if (i.id === id) n += i.n; return n; }
  weight() { let w = 0; for (const i of this.items) w += (this.def(i.id)?.weight || 0) * i.n; return Math.round(w / 10); }
  /** 加入道具；超重回傳 false */
  add(id: string, n = 1, extra?: Partial<InvItem>): boolean {
    const d = this.def(id); if (!d) return false;
    if (this.weight() + Math.round((d.weight * n) / 10) > this.maxWeight()) return false;
    if (stackable(d)) {
      const ex = this.items.find((i) => i.id === id);
      if (ex) ex.n += n; else this.items.push({ uid: UID++, id, n, refine: 0, cards: [] });
    } else for (let k = 0; k < n; k++) this.items.push({ uid: UID++, id, n: 1, refine: extra?.refine || 0, cards: extra?.cards ? [...extra.cards] : [] });
    this.onChange();
    return true;
  }
  remove(uid: number, n = 1) {
    const it = this.get(uid); if (!it) return;
    it.n -= n;
    if (it.n <= 0) { this.items = this.items.filter((i) => i !== it); for (const s of EQUIP_SLOTS) if (this.equip[s] === uid) delete this.equip[s]; }
    this.onChange();
  }
  removeId(id: string, n: number) {
    for (const it of [...this.items]) { if (n <= 0) break; if (it.id !== id) continue; const k = Math.min(n, it.n); this.remove(it.uid, k); n -= k; }
  }
  isEquipped(uid: number) { return EQUIP_SLOTS.some((s) => this.equip[s] === uid); }
  slotOf(uid: number): EquipSlot | null { for (const s of EQUIP_SLOTS) if (this.equip[s] === uid) return s; return null; }
  /** 穿上裝備；回傳錯誤訊息或 null */
  equipItem(uid: number, job: string, lv: number): string | null {
    const it = this.get(uid); if (!it) return '找不到道具';
    const d = this.def(it.id);
    if (d.type !== 'weapon' && d.type !== 'armor') return '這個道具不能裝備';
    if (d.jobs && !d.jobs.includes(job)) return '你的職業無法裝備';
    if (d.reqLv && lv < d.reqLv) return `需要等級 ${d.reqLv}`;
    let slot: EquipSlot = d.slot === 'acc' ? (this.equip.acc1 ? (this.equip.acc2 ? 'acc1' : 'acc2') : 'acc1') : (d.slot as EquipSlot);
    if (this.isEquipped(uid)) return null;
    this.equip[slot] = uid;
    if (d.wtype === 'bow') delete this.equip.shield;               // 弓是雙手武器
    if (slot === 'shield') { const w = this.equip.weapon !== undefined ? this.get(this.equip.weapon) : null; if (w && this.def(w.id).wtype === 'bow') delete this.equip.weapon; }
    this.onChange();
    return null;
  }
  unequip(slot: EquipSlot) { delete this.equip[slot]; this.onChange(); }
  equipInfos(): EquipInfo[] {
    const out: EquipInfo[] = [];
    for (const s of EQUIP_SLOTS) {
      const uid = this.equip[s]; if (uid === undefined) continue;
      const it = this.get(uid); if (!it) continue;
      out.push({ item: this.def(it.id), refine: it.refine, cards: it.cards.map((c) => this.def(c)).filter(Boolean) });
    }
    return out;
  }
  displayName(it: InvItem) {
    const d = this.def(it.id);
    let n = (it.refine ? `+${it.refine} ` : '') + d.name;
    if (d.slots) n += ` [${d.slots}]`;
    return n;
  }
  toJSON() { return { items: this.items, equip: this.equip }; }
  load(o: { items: InvItem[]; equip: Partial<Record<EquipSlot, number>> }) {
    this.items = (o.items || []).filter((i) => DB.item[i.id]).map((i) => ({ ...i, cards: i.cards || [], refine: i.refine || 0 }));
    this.equip = o.equip || {};
    UID = Math.max(UID, ...this.items.map((i) => i.uid + 1), 1);
  }
}
