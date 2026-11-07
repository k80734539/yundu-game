import type { UI } from './UI';
import { Win, h, btn } from './Window';
import { STAT_KEYS, STAT_NAMES, statCost, MAX_STAT } from '../systems/Stats';

/** 能力值視窗（Alt+A）：加點、衍生數值 */
export class StatusWindow extends Win {
  constructor(ui: UI) { super(ui, 'status', '能力值', { x: 250, y: 60, w: 300 }); }
  render() {
    if (!this.isOpen) return;
    const p = this.ui.g.player, ch = p.ch, d = p.d;
    this.body.innerHTML = '';
    const g = h('div', 'stat-grid');
    for (const k of STAT_KEYS) {
      const cost = statCost(ch.stats[k]);
      g.append(h('span', 'k', STAT_NAMES[k]), h('span', 'val', String(ch.stats[k])), h('span', 'b', d.bonus[k] ? `+${d.bonus[k]}` : ''));
      const can = ch.statPts >= cost && ch.stats[k] < MAX_STAT;
      const b = btn('+', () => this.ui.g.raiseStat(k), 'sm' + (can ? '' : ' dis')); b.title = `需要 ${cost} 點`; b.dataset.stat = k;
      g.append(b, h('span', 'c', String(cost)));
    }
    this.body.appendChild(g);
    const dv = h('div', 'derived');
    const add = (l: string, v: string, tip = '') => { const a = h('span', 'lbl', l); a.title = tip; dv.append(a, h('span', 'val', v)); };
    add('ATK', `${d.statusAtk} + ${d.weaponAtk}`, '素質攻擊 + 武器攻擊');
    add('MATK', `${d.matkMin}~${d.matkMax}`);
    add('HIT', String(d.hit), '命中 = 等級 + 靈巧');
    add('FLEE', `${d.flee} + ${d.pdodge}`, '迴避 = 等級 + 敏捷；完全迴避 = 1 + 幸運/10');
    add('DEF', `${d.def} + ${d.softDef}`, '裝備防禦(%) + 體力防禦');
    add('MDEF', `${d.mdef} + ${d.softMdef}`);
    add('CRIT', String(d.crit), '爆擊率 = 1 + 幸運×0.3');
    add('ASPD', `${Math.floor(d.aspd)}`, `攻擊間隔 ${d.delay.toFixed(2)} 秒`);
    add('點數', String(ch.statPts));
    add('負重', `${this.ui.weightNow()}/${d.weight / 10 | 0}`);
    this.body.appendChild(dv);
  }
}
