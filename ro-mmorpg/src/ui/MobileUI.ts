import type { UI } from './UI';
import { h } from './Window';
import { DB } from '../data';
import { iconURL } from '../render/IconArt';
import type { InvItem } from '../systems/Inventory';

/** 手機專用：右下角大按鈕、全部功能選單、點道具／技能跳出的動作面板 */
export class MobileUI {
  dock: HTMLDivElement; sheet: HTMLDivElement; menu: HTMLDivElement;
  constructor(private ui: UI) {
    // ---- 右下角按鈕（拇指區） ----
    this.dock = h('div'); this.dock.id = 'mdock';
    const b = (label: string, icon: string, fn: () => void, cls = '') => {
      const e = h('button', 'mbtn ' + cls); e.type = 'button';
      if (icon) { const i = h('span', 'mbtn-ic'); i.innerHTML = icon; e.appendChild(i); }
      e.appendChild(h('span', 'mbtn-l', label));
      e.addEventListener('click', (ev) => { ev.stopPropagation(); ui.sfx('click'); fn(); });
      this.dock.appendChild(e); return e;
    };
    const img = (k: string, c: string) => `<img src="${iconURL(k, c)}" alt="">`;
    b('選單', '<span class="mbtn-glyph">≡</span>', () => this.toggleMenu(), 'main');
    b('背包', img('potion', '#e03a3a'), () => ui.toggle('inventory'));
    b('技能', img('sk_magnum', '#ff5a20'), () => ui.toggle('skills'));
    b('坐下', img('sk_endure', '#e0c060'), () => ui.g.toggleSit());
    ui.root.appendChild(this.dock);

    // ---- 全部功能選單 ----
    this.menu = h('div', 'msheet-wrap hidden'); this.menu.id = 'mmenu';
    const panel = h('div', 'win msheet');
    panel.appendChild(h('div', 'win-title', '選單'));
    const x = h('div', 'win-x', '×'); x.addEventListener('click', () => this.toggleMenu(false)); panel.appendChild(x);
    const grid = h('div', 'mmenu-grid');
    const items: [string, string, () => void][] = [
      ['能力值', img('sk_basic', '#f0d080'), () => ui.open('status')],
      ['背包', img('potion', '#e03a3a'), () => ui.open('inventory')],
      ['裝備', img('sword', '#c8d0dc'), () => ui.open('equip')],
      ['技能', img('sk_magnum', '#ff5a20'), () => ui.open('skills')],
      ['任務', img('card', '#e8c050'), () => ui.open('quests')],
      ['世界地圖', img('crystal', '#6ad0f0'), () => ui.open('worldmap')],
      ['聊天', '<span class="mbtn-glyph">…</span>', () => { ui.setFold('chat', false); ui.chat.focus(); }],
      ['設定', img('ring', '#c8c8d0'), () => ui.open('options')],
      ['存檔', img('crown', '#f0c040'), () => ui.g.save.save(true)],
    ];
    for (const [l, ic, fn] of items) {
      const e = h('button', 'mmenu-item'); e.type = 'button'; e.innerHTML = `<span class="mmenu-ic">${ic}</span><span>${l}</span>`;
      e.addEventListener('click', () => { this.toggleMenu(false); ui.sfx('click'); fn(); });
      grid.appendChild(e);
    }
    panel.appendChild(grid);
    this.menu.appendChild(panel);
    this.menu.addEventListener('click', (e) => { if (e.target === this.menu) this.toggleMenu(false); });
    ui.root.appendChild(this.menu);

    // ---- 動作面板 ----
    this.sheet = h('div', 'msheet-wrap hidden'); this.sheet.id = 'msheet';
    this.sheet.addEventListener('click', (e) => { if (e.target === this.sheet) this.close(); });
    ui.root.appendChild(this.sheet);
  }
  toggleMenu(v?: boolean) { const show = v ?? this.menu.classList.contains('hidden'); this.menu.classList.toggle('hidden', !show); if (show) this.close(); }
  close() { this.sheet.classList.add('hidden'); this.sheet.innerHTML = ''; }
  private open(title: string, body: HTMLElement | string, buttons: [string, () => void, string?][]) {
    this.sheet.innerHTML = '';
    const p = h('div', 'win msheet');
    p.appendChild(h('div', 'win-title', title));
    const x = h('div', 'win-x', '×'); x.addEventListener('click', () => this.close()); p.appendChild(x);
    const bd = h('div', 'win-body msheet-body'); if (typeof body === 'string') bd.innerHTML = body; else bd.appendChild(body);
    p.appendChild(bd);
    const bar = h('div', 'msheet-btns');
    for (const [l, fn, cls] of buttons) { const e = h('button', 'mact ' + (cls || '')); e.type = 'button'; e.textContent = l; e.addEventListener('click', () => { this.ui.sfx('click'); fn(); }); bar.appendChild(e); }
    p.appendChild(bar);
    this.sheet.appendChild(p);
    this.sheet.classList.remove('hidden');
  }
  /** 點背包道具：說明＋使用／裝備、放快捷列、丟棄 */
  item(it: InvItem) {
    const g = this.ui.g, d = DB.item[it.id];
    const eq = g.inv.isEquipped(it.uid);
    const btns: [string, () => void, string?][] = [];
    if (d.type === 'use') btns.push(['使用', () => { g.useOrEquip(it.uid); if (g.inv.get(it.uid)) this.item(it); else this.close(); }, 'pri']);
    if (d.type === 'weapon' || d.type === 'armor') btns.push([eq ? '卸下' : '裝備', () => { g.useOrEquip(it.uid); this.close(); }, 'pri']);
    if (d.type === 'card') btns.push(['插入裝備', () => { this.close(); this.ui.open('cards'); }, 'pri']);
    if (d.type === 'use') btns.push(['放到快捷列', () => this.pickSlot({ type: 'item', id: it.id })]);
    if (!eq) btns.push(['丟棄', () => { g.dropItem(it.uid); this.close(); }, 'warn']);
    btns.push(['關閉', () => this.close()]);
    this.open(g.inv.displayName(it) + (it.n > 1 ? ` ×${it.n}` : ''), this.ui.info.html(d, it), btns);
  }
  /** 點技能：說明＋施放、學習、放快捷列 */
  skill(id: string) {
    const g = this.ui.g, s = DB.skill[id], lv = g.player.ch.skills[id] || 0;
    const body = `<div class="ii-head"><img src="${iconURL(s.icon.k, s.icon.c)}"><b>${s.name}</b>　Lv ${lv}/${s.maxLv}</div><div class="ii-desc">${s.desc}</div>` +
      (s.type === 'active' ? `<div class="ii-st">SP ${s.sp[Math.max(0, lv - 1)]}　詠唱 ${s.cast[Math.max(0, lv - 1)]} 秒　冷卻 ${s.cd[Math.max(0, lv - 1)]} 秒</div>` : '<div class="ii-st">被動技能</div>');
    const miss = g.missingReq(id);
    const reqHtml = s.req?.length ? `<div class="ii-st">需要：${s.req.map((r) => `${DB.skill[r.id]?.name} Lv${r.lv}`).join('、')}${miss.length ? `<br><span class="sk-req no">還差：${miss.map((m) => `${m.name} Lv${m.lv}`).join('、')}</span>` : '　✔'}</div>` : '';
    const btns: [string, () => void, string?][] = [];
    if (lv && s.type === 'active') btns.push(['施放', () => { this.close(); this.ui.toggle('skills'); g.useSkill(id); }, 'pri'], ['放到快捷列', () => this.pickSlot({ type: 'skill', id })]);
    if (g.canLearn(id)) btns.push([`學習（剩 ${g.player.ch.skillPts} 點）`, () => { g.learnSkill(id); this.skill(id); }, lv ? '' : 'pri']);
    btns.push(['關閉', () => this.close()]);
    this.open(s.name, body + reqHtml, btns);
  }
  /** 選快捷列的格子 */
  pickSlot(slot: { type: 'item' | 'skill'; id: string }) {
    const g = this.ui.g;
    const wrap = h('div', 'mslot-grid');
    for (let i = 0; i < 9; i++) {
      const cur = g.hotbar[i]; const def = cur ? (cur.type === 'item' ? DB.item[cur.id] : DB.skill[cur.id]) : null;
      const e = h('button', 'mslot'); e.type = 'button';
      e.innerHTML = `<span class="mslot-n">${i + 1}</span>${def ? `<img src="${iconURL(def.icon.k, def.icon.c)}">` : ''}`;
      e.addEventListener('click', () => { g.hotbar[i] = slot; this.ui.hot.render(); g.msg(`已放到快捷列第 ${i + 1} 格`, 'sys'); this.close(); });
      wrap.appendChild(e);
    }
    this.open('放到快捷列哪一格？', wrap, [['取消', () => this.close()]]);
  }
}
