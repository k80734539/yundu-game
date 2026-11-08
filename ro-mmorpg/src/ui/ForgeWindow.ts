import type { UI } from './UI';
import { Win, h, btn, ask } from './Window';
import { DB, LOOT } from '../data';
import { iconURL } from '../render/IconArt';
import { isGear, colorOf, canUse, RAR } from '../systems/Loot';

/** 精煉師：分解裝備成 Boss 素材／用素材兌換 Boss 專屬武器 */
export class ForgeWindow extends Win {
  tab: 'dismantle' | 'exchange' = 'dismantle';
  constructor(ui: UI) { super(ui, 'forge', '分解與兌換', { x: 320, y: 100, w: 360, foot: true }); ui.g.ev.on('inv', () => this.render()); }
  openTab(t: 'dismantle' | 'exchange') { this.tab = t; this.open(); }
  render() {
    if (!this.isOpen) return;
    const g = this.ui.g, inv = g.inv, job = g.player.ch.job;
    this.body.innerHTML = '';
    const tabs = h('div', 'tabs');
    for (const [k, l] of [['dismantle', '分解'], ['exchange', '兌換']] as const) { const t = h('span', 'tab' + (this.tab === k ? ' on' : ''), l); t.addEventListener('click', () => { this.tab = k; this.render(); }); tabs.appendChild(t); }
    this.body.appendChild(tabs);
    const list = h('div', 'shop-list');
    if (this.tab === 'dismantle') {
      const gear = inv.items.filter((it) => isGear(DB.item[it.id]) && !inv.isEquipped(it.uid)).sort((a, b) => +canUse(DB.item[a.id], job) - +canUse(DB.item[b.id], job));
      if (!gear.length) list.appendChild(h('div', 'dim', '背包裡沒有可以分解的裝備（裝備中的不能分解）。'));
      for (const it of gear) {
        const d = DB.item[it.id], res = g.loot.dismantleResult(it), usable = canUse(d, job);
        const r = h('div', 'shop-row'); const img = h('img') as HTMLImageElement; img.src = iconURL(d.icon.k, d.icon.c);
        const nm = h('div', 'shop-name'); nm.innerHTML = `<span style="color:${colorOf(it)};text-shadow:0 0 1px #000">${inv.displayName(it)}</span>${usable ? '' : ' <span class="tag">用不了</span>'}<br><span class="sk-desc">→ ${DB.item[res.id].name} ×${res.n}</span>`;
        r.append(img, nm, btn('分解', () => ask(`分解「${d.name}」換 ${DB.item[res.id].name} ×${res.n}？`, () => g.loot.dismantle(it.uid))));
        this.ui.info.bind(img, () => [d, it]);
        list.appendChild(r);
      }
    } else {
      for (const rec of LOOT.exchange) {
        const cost = Object.entries(rec.cost).map(([m, n]) => `${DB.item[m].name} ${inv.count(m)}/${n}`).join('、');
        list.appendChild(h('div', 'lbl', `需要：${cost}`));
        for (const id of rec.items) {
          const d = DB.item[id], ok = Object.entries(rec.cost).every(([m, n]) => inv.count(m) >= n);
          const r = h('div', 'shop-row'); const img = h('img') as HTMLImageElement; img.src = iconURL(d.icon.k, d.icon.c);
          const nm = h('div', 'shop-name'); nm.innerHTML = `<span style="color:${RAR.boss.color};text-shadow:0 0 1px #000">${d.name}</span>${canUse(d, job) ? ' <span class="tag ok">可用</span>' : ''}`;
          r.append(img, nm, btn('兌換', () => { const e = g.loot.exchange(id); if (e) g.msg(e, 'warn'); }, ok ? '' : 'dis'));
          this.ui.info.bind(img, () => [d, undefined]);
          list.appendChild(r);
        }
      }
    }
    this.body.appendChild(list);
    this.foot!.innerHTML = '';
    this.foot!.append(h('span', 'dim', this.tab === 'dismantle' ? '稀有度越高，分解得到的素材越多。' : '兌換的 Boss 專屬武器也會隨機擲數值與 3 條詞條。'));
  }
}
