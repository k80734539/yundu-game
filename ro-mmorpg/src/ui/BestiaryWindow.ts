import type { UI } from './UI';
import { Win, h, btn } from './Window';
import { BESTIARY, DB, type MonsterDef } from '../data';
import { iconURL } from '../render/IconArt';
import { monsterSheet } from '../render/SpriteFactory';

const T = { title: '怪物圖鑑（Alt+B）', unknown: '？？？', notFound: '尚未發現', claim: '領取', done: '已領取', all: '全部', seen: '已發現', unseen: '未發現', rewards: '收集獎勵', empty: '這個分類沒有怪物。' };
type Filter = 'all' | 'seen' | 'unseen';
const pct = (r: number) => (r * 100 >= 1 ? Math.round(r * 100) : +(r * 100).toFixed(1)) + '%';
/** 怪物圖鑑：打倒就解鎖名稱與地點，累計 10 隻解鎖能力值、25 隻解鎖掉落率；收集數量可領獎勵 */
export class BestiaryWindow extends Win {
  filter: Filter = 'all'; showRewards = true;
  constructor(ui: UI) { super(ui, 'bestiary', T.title, { x: 280, y: 60, w: 430, foot: true }); this.showRewards = !ui.mobile; ui.g.ev.on('kill', () => this.render()); }
  thumb(d: MonsterDef, known: boolean) {
    const c = document.createElement('canvas'); c.width = c.height = 52; c.className = 'dex-thumb';
    const s = monsterSheet(d.look, d.frame), k = Math.min(52 / s.fw, 52 / s.fh), g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false; if (!known) g.filter = 'brightness(0) opacity(0.45)';
    g.drawImage(s.c, 0, 0, s.fw, s.fh, (52 - s.fw * k) / 2, 52 - s.fh * k, s.fw * k, s.fh * k);
    return c;
  }
  render() {
    if (!this.isOpen) return;
    const g = this.ui.g, bs = g.bestiary, list = bs.list();
    this.body.innerHTML = '';
    // 收集獎勵
    const head = h('div', 'dex-sec', `${this.showRewards ? '▾' : '▸'} ${T.rewards}`); head.addEventListener('click', () => { this.showRewards = !this.showRewards; this.render(); });
    this.body.appendChild(head);
    if (this.showRewards) for (const m of BESTIARY.milestones) {
      const need = bs.needOf(m), cur = Math.min(need, bs.progress(m)), ok = bs.claimable(m), got = bs.claimed(m);
      const r = h('div', 'dex-ms' + (got ? ' got' : ''));
      r.append(h('span', 'dex-ms-t', `${m.kind === 'seen' ? '發現' : '熟練'} ${need} 種　${cur}/${need}`), h('span', 'dim', bs.rewardText(m)));
      r.append(got ? h('span', 'dim', T.done) : btn(T.claim, () => { const e = bs.claim(m); if (e) g.msg(e, 'warn'); this.render(); }, ok ? '' : 'dis'));
      this.body.appendChild(r);
    }
    // 篩選
    const chips = h('div', 'st-filter');
    for (const [k, l] of [['all', T.all], ['seen', T.seen], ['unseen', T.unseen]] as [Filter, string][]) { const c = h('span', 'chip' + (this.filter === k ? ' on' : ''), l); c.addEventListener('click', () => { this.filter = k; this.render(); }); chips.appendChild(c); }
    this.body.appendChild(chips);
    const box = h('div', 'dex-list'); let n = 0;
    for (const d of list) {
      const seen = bs.seen(d.id), tier = bs.tier(d.id);
      if ((this.filter === 'seen' && !seen) || (this.filter === 'unseen' && seen)) continue;
      n++;
      const r = h('div', 'dex-row' + (seen ? '' : ' unk')); r.appendChild(this.thumb(d, seen));
      const info = h('div', 'dex-info');
      if (!seen) { info.append(h('div', 'dex-name', T.unknown), h('div', 'dim', T.notFound)); }
      else {
        const el = d.element ? ` ${d.element}` : '';
        const nm = h('div', 'dex-name'); nm.innerHTML = `${d.name}${d.mvp ? ' ★' : ''} <span class="dim">Lv${d.lv}${el}　擊倒 ${bs.kills(d.id)}${bs.mastered(d.id) ? '　<b style="color:#1d7a45">熟練</b>' : ''}</span>`; info.append(nm);
        info.append(h('div', 'dim', `出沒：${bs.places(d.id).join('、') || '—'}`));
        info.append(h('div', 'dim', tier >= 2 ? `HP ${d.hp.toLocaleString()}　ATK ${d.atk[0]}~${d.atk[1]}　DEF ${d.def}　MDEF ${d.mdef}　EXP ${d.exp.toLocaleString()}` : `再打 ${BESTIARY.stats - bs.kills(d.id)} 隻解鎖能力值`));
        const dr = h('div', 'dex-drops');
        for (const x of d.drops) {
          const known = bs.dropSeen(d.id, x.item), it = DB.item[x.item]; if (!it) continue;
          const chip = h('span', 'dex-drop' + (known ? '' : ' unk'));
          if (known) { const im = h('img') as HTMLImageElement; im.src = iconURL(it.icon.k, it.icon.c); chip.append(im); this.ui.info.bind(im, () => [it, undefined]); }
          chip.append(document.createTextNode(`${known ? it.name : T.unknown}${tier >= 3 ? ' ' + pct(x.rate) : ''}`));
          dr.appendChild(chip);
        }
        if (tier < 3) dr.appendChild(h('span', 'dim', `（再打 ${BESTIARY.drops - bs.kills(d.id)} 隻看掉落率）`));
        info.appendChild(dr);
      }
      r.appendChild(info); box.appendChild(r);
    }
    if (!n) box.appendChild(h('div', 'dim', T.empty));
    this.body.appendChild(box);
    this.foot!.innerHTML = '';
    this.foot!.append(h('span', 'lbl', '發現'), h('span', 'val', `${bs.count('seen')}/${list.length}`), h('span', 'lbl', '　熟練'), h('span', 'val', `${bs.count('mastered')}/${list.length}`));
  }
}
