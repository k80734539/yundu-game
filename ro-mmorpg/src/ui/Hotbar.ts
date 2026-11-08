import type { UI } from './UI';
import { h } from './Window';
import { DB } from '../data';
import { iconURL } from '../render/IconArt';
import { makeDraggable } from './Drag';

export interface HotSlot { type: 'item' | 'skill'; id: string }
/** 畫面下方 F1~F9 快捷列 */
export class Hotbar {
  el: HTMLDivElement; cells: HTMLDivElement[] = [];
  constructor(private ui: UI) {
    this.el = h('div'); this.el.id = 'hotbar';
    for (let i = 0; i < 9; i++) {
      const c = h('div', 'hot'); c.dataset.hot = String(i);
      c.addEventListener('click', () => ui.g.useHot(i));
      c.addEventListener('contextmenu', (e) => { e.preventDefault(); ui.g.hotbar[i] = null; this.render(); });
      makeDraggable(c, () => { const s = ui.g.hotbar[i]; if (!s) return null; const ic = s.type === 'item' ? DB.item[s.id].icon : DB.skill[s.id].icon; return { type: s.type, id: s.id, icon: iconURL(ic.k, ic.c) }; },
        (t, d) => { const tgt = (t as HTMLElement | null)?.closest?.('[data-hot]') as HTMLElement | null; if (tgt) { const j = +tgt.dataset.hot!; const a = ui.g.hotbar[j]; ui.g.hotbar[j] = { type: d.type, id: d.id }; ui.g.hotbar[i] = a && j !== i ? a : j === i ? ui.g.hotbar[i] : null; } else ui.g.hotbar[i] = null; this.render(); });
      this.cells.push(c); this.el.appendChild(c);
    }
    ui.root.appendChild(this.el);
    ui.g.ev.on('inv', () => this.render());
    ui.g.ev.on('stats', () => this.render());
  }
  render() {
    const g = this.ui.g;
    for (let i = 0; i < 9; i++) {
      const c = this.cells[i]; const s = g.hotbar[i];
      c.innerHTML = ''; c.appendChild(h('span', 'key', this.ui.mobile ? String(i + 1) : 'F' + (i + 1)));
      if (!s) continue;
      const def = s.type === 'item' ? DB.item[s.id] : DB.skill[s.id]; if (!def) continue;
      const img = h('img') as HTMLImageElement; img.src = iconURL(def.icon.k, def.icon.c); img.draggable = false; c.appendChild(img);
      if (s.type === 'item') { const n = g.inv.count(s.id); c.appendChild(h('span', 'cnt', String(n))); c.classList.toggle('none', n === 0); }
      else { c.appendChild(h('span', 'cnt', 'Lv' + (g.player.ch.skills[s.id] || 0))); c.classList.remove('none'); }
      c.title = def.name;
      const cd = h('div', 'cd'); cd.style.height = '0%'; c.appendChild(cd);
    }
  }
  /** 每幀更新冷卻遮罩 */
  update() {
    const g = this.ui.g;
    for (let i = 0; i < 9; i++) {
      const s = g.hotbar[i]; if (!s || s.type !== 'skill') continue;
      const cd = this.cells[i].querySelector('.cd') as HTMLElement | null; if (!cd) continue;
      const k = g.skillCdRatio(s.id);
      cd.style.height = Math.round(k * 100) + '%';
    }
  }
}
