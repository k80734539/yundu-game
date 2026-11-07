import type { UI } from './UI';
import { Win, h, btn } from './Window';
import { DB } from '../data';
import { iconURL } from '../render/IconArt';

/** 商店：購買（商品清單）／出售（背包），數量輸入、總價、Zeny 檢查 */
export class ShopWindow extends Win {
  shop = 'tool'; mode: 'buy' | 'sell' = 'buy';
  constructor(ui: UI) { super(ui, 'shop', '商店', { x: 300, y: 90, w: 340, foot: true }); ui.g.ev.on('inv', () => this.render()); }
  openShop(id: string, mode: 'buy' | 'sell') { this.shop = id; this.mode = mode; this.setTitle(DB.shop[id].name); this.open(); }
  render() {
    if (!this.isOpen) return;
    const g = this.ui.g;
    this.body.innerHTML = '';
    const tabs = h('div', 'tabs');
    for (const [k, l] of [['buy', '購買'], ['sell', '出售']] as const) { const t = h('span', 'tab' + (this.mode === k ? ' on' : ''), l); t.addEventListener('click', () => { this.mode = k; this.render(); }); tabs.appendChild(t); }
    this.body.appendChild(tabs);
    const list = h('div', 'shop-list');
    const row = (icon: string, name: string, price: number, max: number, action: (n: number) => void, label: string, tip: () => any, sub = '') => {
      const r = h('div', 'shop-row');
      const img = h('img') as HTMLImageElement; img.src = icon;
      const nm = h('div', 'shop-name'); nm.innerHTML = `${name}${sub ? ` <span class="dim">${sub}</span>` : ''}`;
      const pr = h('div', 'shop-price', `${price.toLocaleString()} Z`);
      const q = h('input', 'shop-qty') as HTMLInputElement; q.type = 'number'; q.min = '1'; q.max = String(Math.max(1, max)); q.value = '1';
      q.addEventListener('keydown', (e) => e.stopPropagation());
      const b = btn(label, () => action(Math.max(1, Math.min(max, Math.floor(+q.value || 1)))), max > 0 ? '' : 'dis');
      r.append(img, nm, pr, q, b);
      this.ui.info.bind(img, tip);
      list.appendChild(r);
    };
    if (this.mode === 'buy') {
      for (const id of DB.shop[this.shop].items) {
        const d = DB.item[id];
        const max = Math.floor(g.player.ch.zeny / d.price);
        row(iconURL(d.icon.k, d.icon.c), d.name, d.price, Math.min(99, max), (n) => g.buy(id, n), '購買', () => [d, undefined]);
      }
    } else {
      for (const it of g.inv.items) {
        if (g.inv.isEquipped(it.uid)) continue;
        const d = DB.item[it.id];
        row(iconURL(d.icon.k, d.icon.c), g.inv.displayName(it), Math.floor(d.price / 2), it.n, (n) => g.sell(it.uid, n), '出售', () => [d, it], it.n > 1 ? '×' + it.n : '');
      }
      if (!list.children.length) list.appendChild(h('div', 'dim', '沒有可以出售的道具。'));
    }
    this.body.appendChild(list);
    this.foot!.innerHTML = '';
    this.foot!.append(h('span', 'lbl', '持有'), h('span', 'val', `${g.player.ch.zeny.toLocaleString()} Zeny`), h('span', 'dim', `　負重 ${g.inv.weight()}/${Math.floor(g.player.d.weight / 10)}`));
  }
}
