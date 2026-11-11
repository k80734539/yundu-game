import { DB, STORAGE } from '../data';
import { stackable, type Inventory, type InvItem } from './Inventory';

/** 倉庫（純資料邏輯）：存入／取出都走 Inventory 的 add／remove，所以裝備的精煉、卡片、稀有度、詞條都會原樣保留 */
export class Warehouse {
  items: InvItem[] = [];
  private nextUid = 1;
  get slots() { return STORAGE.slots; }
  get used() { return this.items.length; }
  count(id: string) { let n = 0; for (const i of this.items) if (i.id === id) n += i.n; return n; }
  /** 存入背包裡的道具；回傳錯誤訊息或 null */
  deposit(inv: Inventory, uid: number, n: number, pay?: (fee: number) => boolean): string | null {
    const it = inv.get(uid); if (!it) return '找不到道具';
    if (inv.isEquipped(uid)) return '裝備中的道具要先脫下來才能存放。';
    const d = DB.item[it.id]; n = Math.max(1, Math.min(n, it.n));
    const stack = stackable(d) ? this.items.find((x) => x.id === it.id) : undefined;
    if (!stack && this.used >= this.slots) return `倉庫滿了（${this.slots} 格）。`;
    const fee = STORAGE.fee > 0 ? STORAGE.fee * (stack ? 0 : 1) : 0;
    if (fee > 0 && pay && !pay(fee)) return `Zeny 不足（手續費 ${fee}）。`;
    if (stack) stack.n += n; else this.items.push({ ...it, uid: this.nextUid++, n, cards: [...it.cards], ...(it.roll ? { roll: { ...it.roll } } : {}), ...(it.aff ? { aff: it.aff.map((a) => ({ ...a })) } : {}) });
    inv.remove(uid, n);
    return null;
  }
  /** 取出到背包；超重會失敗（東西留在倉庫） */
  withdraw(inv: Inventory, uid: number, n: number): string | null {
    const it = this.items.find((x) => x.uid === uid); if (!it) return '找不到道具';
    n = Math.max(1, Math.min(n, it.n));
    if (!inv.add(it.id, n, { refine: it.refine, cards: it.cards, rar: it.rar, roll: it.roll, aff: it.aff, src: it.src })) return '負重不足，拿不動這麼多。';
    it.n -= n; if (it.n <= 0) this.items = this.items.filter((x) => x !== it);
    return null;
  }
  toJSON() { return { items: this.items }; }
  load(o?: { items?: InvItem[] }) {
    this.items = (o?.items || []).filter((i) => DB.item[i.id]).map((i, k) => ({ ...i, uid: k + 1, cards: i.cards || [], refine: i.refine || 0 }));
    this.nextUid = this.items.length + 1;
  }
}
