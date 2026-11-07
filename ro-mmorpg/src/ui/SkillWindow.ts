import type { UI } from './UI';
import { Win, h, btn } from './Window';
import { DB } from '../data';
import { iconURL } from '../render/IconArt';
import { makeDraggable } from './Drag';

/** 技能（Alt+S）：學習技能、拖到快捷列、雙擊施放 */
export class SkillWindow extends Win {
  constructor(ui: UI) { super(ui, 'skills', '技能（Alt+S）', { x: 260, y: 140, w: 330, foot: true }); }
  render() {
    if (!this.isOpen) return;
    const g = this.ui.g, ch = g.player.ch;
    this.body.innerHTML = '';
    const ids = g.skillList();
    for (const id of ids) {
      const s = DB.skill[id]; if (!s) continue;
      const lv = ch.skills[id] || 0;
      const row = h('div', 'sk-row' + (lv ? '' : ' unlearned'));
      const ic = h('img', 'sk-icon') as HTMLImageElement; ic.src = iconURL(s.icon.k, s.icon.c); ic.draggable = false;
      ic.title = s.desc;
      if (lv && s.type === 'active') {
        makeDraggable(ic, () => ({ type: 'skill', id, icon: iconURL(s.icon.k, s.icon.c) }), (t, d) => this.ui.dropOn(t, d));
        ic.addEventListener('dblclick', () => g.useSkill(id));
      }
      const info = h('div', 'sk-info');
      info.innerHTML = `<b>${s.name}</b> <span class="dim">${s.type === 'passive' ? '被動' : 'SP ' + s.sp[Math.max(0, lv - 1)]}</span><br><span class="sk-desc">${s.desc}</span>`;
      const lvEl = h('div', 'sk-lv', `${lv}/${s.maxLv}`);
      const can = g.canLearn(id);
      const b = btn('+', () => g.learnSkill(id), 'sm' + (can ? '' : ' dis')); b.dataset.skill = id;
      row.append(ic, info, lvEl, b);
      this.body.appendChild(row);
    }
    this.foot!.innerHTML = '';
    this.foot!.append(h('span', 'lbl', `${g.player.job.name}　技能點數：`), h('span', 'val', String(ch.skillPts)));
  }
}
