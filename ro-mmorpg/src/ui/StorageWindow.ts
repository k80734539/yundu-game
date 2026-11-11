import type { UI } from './UI';
import { Win, h, btn } from './Window';
import { DB, STORAGE } from '../data';
import { iconURL } from '../render/IconArt';
import { colorOf, isGear } from '../systems/Loot';

const T = { title: '倉庫', put: '存入', get: '取出', putBtn: '存入', getBtn: '取出', emptyPut: '背包裡沒有可以存入的東西（裝備中的要先脫下來）。', emptyGet: '倉庫裡還沒有東西。', slots: '倉庫格數' };
type Filter = 'all' | 'gear' | 'use' | 'etc';
const FILTERS: [Filter, string][] = [['all', '全部'], ['gear', '裝備'], ['use', '道具'], ['etc', '素材／卡片']];
const pass = (f: Filter, id: string) => { const d = DB.item[id]; return f === 'all' || (f === 'gear' ? isGear(d) : f === 'use' ? d.type === 'use' : d.type === 'etc' || d.type === 'card'); };
/** 倉庫管理員：把背包的東西存起來（不算負重），需要時再取出 */
export class StorageWindow extends Win {
  mode: 'put' | 'get' = 'put'; filter: Filter = 'all';
  constructor(ui: UI) { super(ui, 'storage', T.title, { x: 300, y: 80, w: 380, foot: true }); ui.g.ev.on('inv', () => this.render()); }
  render() {
    if (!this.isOpen) return;
    const g = this.ui.g, inv = g.inv, st = g.storage;
    this.body.innerHTML = '';
    const tabs = h('div', 'tabs');
    for (const [k, l] of [['put', T.put], ['get', T.get]] as const) { const t = h('span', 'tab' + (this.mode === k ? ' on' : ''), l); t.addEventListener('click', () => { this.mode = k; this.render(); }); tabs.appendChild(t); }
    this.body.appendChild(tabs);
    const chips = h('div', 'st-filter');
    for (const [k, l] of FILTERS) { const c = h('span', 'chip' + (this.filter === k ? ' on' : ''), l); c.addEventListener('click', () => { this.filter = k; this.render(); }); chips.appendChild(c); }
    this.body.appendChild(chips);
    const list = h('div', 'shop-list');
    const src = this.mode === 'put' ? inv.items.filter((i) => !inv.isEquipped(i.uid)) : st.items;
    const rows = src.filter((i) => pass(this.filter, i.id)).sort((a, b) => (+isGear(DB.item[b.id]) - +isGear(DB.item[a.id])) || DB.item[a.id].name.localeCompare(DB.item[b.id].name, 'zh-Hant'));
    for (const it of rows) {
      const d = DB.item[it.id], r = h('div', 'shop-row'); const img = h('img') as HTMLImageElement; img.src = iconURL(d.icon.k, d.icon.c);
      const nm = h('div', 'shop-name'); nm.innerHTML = `<span style="color:${colorOf(it)};text-shadow:0 0 1px #000">${inv.displayName(it)}</span>${it.n > 1 ? ` <span class="dim">×${it.n}</span>` : ''}`;
      r.append(img, nm);
      let q: HTMLInputElement | null = null;
      if (it.n > 1) { q = h('input', 'shop-qty') as HTMLInputElement; q.type = 'number'; q.min = '1'; q.max = String(it.n); q.value = String(it.n); q.addEventListener('keydown', (e) => e.stopPropagation()); r.append(q); }
      const act = () => { const n = q ? Math.max(1, Math.min(it.n, Math.floor(+q.value || 1))) : 1; const err = this.mode === 'put' ? st.deposit(inv, it.uid, n) : st.withdraw(inv, it.uid, n); if (err) g.msg(err, 'warn'); else { g.flags.storageSeen = true; g.ui.sfx('equip'); this.render(); g.save.saveSoon(); } };
      r.append(btn(this.mode === 'put' ? T.putBtn : T.getBtn, act));
      this.ui.info.bind(img, () => [d, it]);
      list.appendChild(r);
    }
    if (!rows.length) list.appendChild(h('div', 'dim', this.mode === 'put' ? T.emptyPut : T.emptyGet));
    this.body.appendChild(list);
    this.foot!.innerHTML = '';
    this.foot!.append(h('span', 'lbl', T.slots), h('span', 'val', `${st.used}/${STORAGE.slots}`), h('span', 'dim', `　負重 ${inv.weight()}/${Math.floor(g.player.d.weight / 10)}`));
  }
}
