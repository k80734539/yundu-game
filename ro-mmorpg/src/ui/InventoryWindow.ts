import type { UI } from './UI';
import { Win, h } from './Window';
import { iconURL } from '../render/IconArt';
import { makeDraggable, justDragged } from './Drag';

/** 背包（Alt+E）：道具／裝備／其他分頁，雙擊使用或裝備，拖到快捷列，拖到地上丟棄 */
export class InventoryWindow extends Win {
  tab: 'use' | 'equip' | 'etc' = 'use';
  constructor(ui: UI) { super(ui, 'inventory', '物品欄（Alt+E）', { x: 0, y: 200, w: 290, foot: true }); this.el.style.left = (this.ui.winPos.inventory?.[0] ?? window.innerWidth - 310) + 'px'; ui.g.ev.on('inv', () => this.render()); }
  render() {
    if (!this.isOpen) return;
    const g = this.ui.g, inv = g.inv;
    this.body.innerHTML = '';
    const tabs = h('div', 'tabs');
    for (const [k, l] of [['use', '道具'], ['equip', '裝備'], ['etc', '其他']] as const) {
      const t = h('span', 'tab' + (this.tab === k ? ' on' : ''), l); t.addEventListener('click', () => { this.tab = k; this.render(); }); tabs.appendChild(t);
    }
    this.body.appendChild(tabs);
    const grid = h('div', 'inv-grid');
    const list = inv.items.filter((it) => {
      const d = inv.def(it.id);
      return this.tab === 'use' ? d.type === 'use' : this.tab === 'equip' ? d.type === 'weapon' || d.type === 'armor' : d.type === 'etc' || d.type === 'card';
    });
    for (const it of list) {
      const d = inv.def(it.id);
      const cell = h('div', 'inv-cell' + (inv.isEquipped(it.uid) ? ' eq' : ''));
      const img = h('img') as HTMLImageElement; img.src = iconURL(d.icon.k, d.icon.c); img.draggable = false;
      cell.appendChild(img);
      if (it.n > 1) cell.appendChild(h('span', 'cnt', String(it.n)));
      if (it.refine) cell.appendChild(h('span', 'ref', '+' + it.refine));
      cell.dataset.uid = String(it.uid);
      cell.addEventListener('dblclick', () => g.useOrEquip(it.uid));
      cell.addEventListener('click', () => { if (justDragged(cell)) return; if (window.matchMedia('(pointer: coarse)').matches) g.useOrEquip(it.uid); });
      cell.addEventListener('contextmenu', (e) => { e.preventDefault(); g.useOrEquip(it.uid); });
      this.ui.info.bind(cell, () => [d, it]);
      makeDraggable(cell, () => ({ type: 'item', id: it.id, uid: it.uid, icon: iconURL(d.icon.k, d.icon.c) }), (t, dd) => this.ui.dropOn(t, dd));
      grid.appendChild(cell);
    }
    for (let i = list.length; i < Math.max(24, Math.ceil(list.length / 8) * 8); i++) grid.appendChild(h('div', 'inv-cell empty'));
    this.body.appendChild(grid);
    this.body.appendChild(h('div', 'dim hint', '雙擊／右鍵：使用或裝備　拖曳：放到快捷列或丟在地上'));
    this.foot!.innerHTML = '';
    this.foot!.append(h('span', 'lbl', `負重 ${inv.weight()} / ${Math.floor(g.player.d.weight / 10)}`), h('span', '', '　'), h('span', 'val', `${g.player.ch.zeny.toLocaleString()} Zeny`));
  }
}
