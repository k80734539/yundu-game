import type { UI } from './UI';
import { Win, h } from './Window';
import { EQUIP_SLOTS, SLOT_NAMES, EquipSlot } from '../systems/Inventory';
import { iconURL } from '../render/IconArt';

/** 裝備（Alt+Q）：左右兩排欄位，中間角色預覽；雙擊卸下 */
export class EquipWindow extends Win {
  cv: HTMLCanvasElement;
  constructor(ui: UI) { super(ui, 'equip', '裝備（Alt+Q）', { x: 250, y: 120, w: 330 }); this.cv = h('canvas'); this.cv.width = 96; this.cv.height = 140; ui.g.ev.on('inv', () => this.render()); }
  render() {
    if (!this.isOpen) return;
    const g = this.ui.g, inv = g.inv;
    this.body.innerHTML = '';
    const wrap = h('div', 'eq-wrap');
    const col = (slots: EquipSlot[]) => {
      const c = h('div', 'eq-col');
      for (const s of slots) {
        const uid = inv.equip[s]; const it = uid !== undefined ? inv.get(uid) : undefined; const d = it ? inv.def(it.id) : null;
        const row = h('div', 'eq-slot' + (d ? '' : ' empty'));
        const ic = h('div', 'eq-icon'); if (d) { const img = h('img') as HTMLImageElement; img.src = iconURL(d.icon.k, d.icon.c); ic.appendChild(img); }
        const tx = h('div', 'eq-name'); tx.innerHTML = `<span class="dim">${SLOT_NAMES[s]}</span><br>${d && it ? inv.displayName(it) : '—'}`;
        row.append(ic, tx);
        if (d && it && this.ui.m) { const m = this.ui.m; row.addEventListener('click', () => m.item(it)); }
        else if (d && it) { this.ui.info.bind(row, () => [d, it]); row.addEventListener('dblclick', () => { inv.unequip(s); this.ui.sfx('equip'); }); row.addEventListener('contextmenu', (e) => { e.preventDefault(); inv.unequip(s); }); row.title = '雙擊卸下'; }
        c.appendChild(row);
      }
      return c;
    };
    const mid = h('div', 'eq-mid'); mid.appendChild(this.cv);
    wrap.append(col(['head', 'armor', 'garment', 'acc1']), mid, col(['weapon', 'shield', 'shoes', 'acc2']));
    this.body.appendChild(wrap);
    const d = g.player.d;
    this.body.appendChild(h('div', 'dim hint', `ATK ${d.statusAtk}+${d.weaponAtk}　MATK ${d.matkMin}~${d.matkMax}　DEF ${d.def}+${d.softDef}　ASPD ${Math.floor(d.aspd)}`));
    // 角色預覽
    const c = this.cv.getContext('2d')!; c.imageSmoothingEnabled = false; c.clearRect(0, 0, 96, 140);
    const s = g.player.sheet, fr = Math.floor(performance.now() / 600) % 2;
    c.drawImage(s.c, fr * s.fw + 48, 40, 96, 150, 0, -6, 96, 150);
  }
}
export { EQUIP_SLOTS };
