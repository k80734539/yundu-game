import type { UI } from './UI';
import { Win, h, btn } from './Window';
import { expNeed, jobExpNeed } from '../systems/Stats';

/** 左上角基本資訊視窗（RO 的 Basic Info） */
export class Hud extends Win {
  private cache = '';
  private els: Record<string, HTMLElement> = {};
  constructor(ui: UI) {
    super(ui, 'hud', '基本資訊', { x: 6, y: 6, w: 232, closable: false });
    this.el.id = 'hud';
    const b = this.body;
    const top = h('div', 'row'); this.els.name = h('span', 'val'); this.els.job = h('span', 'dim'); top.append(this.els.name, this.els.job); b.appendChild(top);
    const g = h('div', 'hud-grid');
    const bar = (cls: string, key: string) => { const d = h('div', 'bar ' + cls); const i = h('i'); const s = h('span'); d.append(i, s); this.els[key] = d; return d; };
    g.append(h('span', 'lbl', 'HP'), bar('hp', 'hp'), h('span', 'lbl', 'SP'), bar('sp', 'sp'));
    this.els.blv = h('span', 'lbl'); this.els.jlv = h('span', 'lbl');
    g.append(this.els.blv, bar('exp', 'exp'), this.els.jlv, bar('jexp', 'jexp'));
    b.appendChild(g);
    const info = h('div', 'row'); this.els.zeny = h('span', 'val'); this.els.weight = h('span', 'dim'); this.els.pts = h('span'); info.append(h('span', 'lbl', 'Zeny'), this.els.zeny, this.els.weight, this.els.pts); b.appendChild(info);
    const mb = h('div', 'menubar');
    const items: [string, string, string][] = [['能力', 'status', 'Alt+A'], ['道具', 'inventory', 'Alt+E'], ['裝備', 'equip', 'Alt+Q'], ['技能', 'skills', 'Alt+S'], ['任務', 'quests', 'Alt+U'], ['地圖', 'worldmap', 'M'], ['設定', 'options', 'Esc']];
    for (const [l, w, k] of items) { const bb = btn(l, () => ui.toggle(w)); bb.title = `${l}（${k}）`; bb.dataset.win = w; mb.appendChild(bb); }
    b.appendChild(mb);
    this.el.classList.remove('hidden');
  }
  update() {
    const g = this.ui.g, p = g.player, ch = p.ch;
    const wt = this.ui.weightNow();
    const key = [ch.name, ch.job, ch.baseLv, ch.jobLv, Math.ceil(p.hp), p.maxHp, Math.ceil(p.sp), p.maxSp, ch.baseExp, ch.jobExp, ch.zeny, ch.statPts, ch.skillPts, wt].join('|');
    if (key === this.cache) return;
    this.cache = key;
    const e = this.els;
    e.name.textContent = ch.name; e.job.textContent = p.job.name;
    const set = (el: HTMLElement, v: number, max: number, text: string) => { (el.firstChild as HTMLElement).style.width = Math.max(0, Math.min(100, (v / max) * 100)) + '%'; (el.lastChild as HTMLElement).textContent = text; };
    set(e.hp, p.hp, p.maxHp, `${Math.ceil(p.hp)} / ${p.maxHp}`); e.hp.classList.toggle('low', p.hp < p.maxHp * 0.25);
    set(e.sp, p.sp, p.maxSp, `${Math.ceil(p.sp)} / ${p.maxSp}`);
    const en = expNeed(ch.baseLv), jn = jobExpNeed(ch.job, ch.jobLv);
    e.blv.textContent = `Lv ${ch.baseLv}`; set(e.exp, ch.baseExp, en, '');
    e.jlv.textContent = `Job ${ch.jobLv}`; set(e.jexp, ch.jobExp, jn, '');
    e.exp.title = `Base 經驗 ${ch.baseExp} / ${en}（${((ch.baseExp / en) * 100).toFixed(1)}%）`;
    e.jexp.title = `Job 經驗 ${ch.jobExp} / ${jn}（${isFinite(jn) ? ((ch.jobExp / jn) * 100).toFixed(1) : 100}%）`;
    e.zeny.textContent = ch.zeny.toLocaleString();
    e.weight.textContent = `　負重 ${wt}/${p.d.weight / 10 | 0}`;
    e.pts.innerHTML = (ch.statPts ? ` <span style="color:#d05a20">點數${ch.statPts}</span>` : '') + (ch.skillPts ? ` <span style="color:#7a3ad0">技能${ch.skillPts}</span>` : '');
    const expBar = document.querySelector('#expline i') as HTMLElement | null;
    if (expBar) expBar.style.width = (ch.baseExp / en) * 100 + '%';
  }
}
