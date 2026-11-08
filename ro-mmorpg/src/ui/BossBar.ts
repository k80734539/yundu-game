import type { UI } from './UI';
import { h } from './Window';
import { fightTime, fmtTime } from '../systems/BossFight';

/** 畫面上方的 Boss 名稱與大血條；狂暴時血條變紅，並標出 50% 與 20% 的階段位置 */
export class BossBar {
  el: HTMLDivElement; name: HTMLSpanElement; pct: HTMLSpanElement; time: HTMLSpanElement; fill: HTMLElement; tag: HTMLSpanElement;
  private shown = false;
  constructor(private ui: UI) {
    this.el = h('div'); this.el.id = 'bossbar'; this.el.style.display = 'none';
    const top = h('div', 'bb-top'); this.name = h('span', 'bb-name'); this.tag = h('span', 'bb-tag'); this.time = h('span', 'bb-time'); top.append(this.name, this.tag, this.time);
    const bar = h('div', 'bb-bar'); this.fill = h('i'); this.pct = h('span', 'bb-pct');
    bar.append(this.fill, h('b', 'bb-mark m50'), h('b', 'bb-mark m20'), this.pct);
    this.el.append(top, bar);
    ui.root.appendChild(this.el);
  }
  update() {
    const g = this.ui.g;
    const m = g.monsters.find((x) => x.boss && x.boss.active && !x.dead && x.aggroOn) || null;
    if (!m) { if (this.shown) { this.shown = false; this.el.style.display = 'none'; this.ui.root.classList.remove('bossfight'); } return; }
    if (!this.shown) { this.shown = true; this.el.style.display = 'block'; this.ui.root.classList.add('bossfight'); this.name.textContent = `【MVP】${m.def.name}　Lv${m.def.lv}`; }
    const b = m.boss!, r = Math.max(0, m.hp / m.maxHp);
    this.fill.style.width = r * 100 + '%';
    this.el.classList.toggle('enraged', b.phase === 1); this.el.classList.toggle('frenzy', b.phase === 2);
    this.tag.textContent = b.phase === 2 ? '瀕死狂暴' : b.phase === 1 ? '狂暴' : '';
    this.pct.textContent = `${Math.ceil(m.hp).toLocaleString()} / ${m.maxHp.toLocaleString()}`;
    this.time.textContent = fmtTime(fightTime(m, g));
  }
}
