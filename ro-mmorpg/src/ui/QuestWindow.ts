import type { UI } from './UI';
import { Win, h, btn, ask } from './Window';
import { DB, QUESTS, STORY } from '../data';
import type { Game } from '../core/Game';

/** 主線目前的任務名稱與下一步（任務視窗、任務欄共用） */
export function mainLine(g: Game): { chapter: string; name: string; hint: string; wait?: number } | null {
  const st = g.story, q = st.quest; if (!q) return null;
  const ch = st.chapter(q.chapter)?.name || '';
  if (!st.st.started) return { chapter: ch, name: q.name, hint: `Lv${q.reqLv} 開始`, wait: q.reqLv };
  const s = st.step; const n = s?.type === 'kill' && (s.count || 1) > 1 ? `（${st.st.n}/${s.count}）` : '';
  return { chapter: ch, name: q.name, hint: (s?.hint || '') + n };
}

/** 任務視窗（Alt+U）＋右側任務追蹤欄 */
export class QuestWindow extends Win {
  constructor(ui: UI) { super(ui, 'quests', '任務（Alt+U）', { x: 300, y: 100, w: 340 }); ui.g.ev.on('quest', () => this.render()); ui.g.ev.on('inv', () => this.render()); ui.g.ev.on('stats', () => this.render()); }
  render() {
    if (!this.isOpen) return;
    const qs = this.ui.g.quests;
    this.body.innerHTML = '';
    const g0 = this.ui.g, ml = mainLine(g0);
    // 主線：目前進度＋看過的章節摘要
    this.body.appendChild(h('div', 'lbl q-main-lbl', '★ 主線'));
    const mb = h('div', 'q-box q-main');
    if (ml) mb.innerHTML = `<span class="dim">${ml.chapter}</span><br><b>${ml.name}</b>${ml.wait ? ` <span class="dim">Lv${ml.wait}</span>` : ''}<br><span class="sk-desc">${ml.hint}</span>`;
    else { const todo = STORY.chapters.find((c) => c.todo); mb.innerHTML = `<b>主線待續</b><br><span class="sk-desc">${todo ? todo.name + '——製作中，敬請期待！' : '你已經看完所有主線了。'}</span>`; }
    this.body.appendChild(mb);
    const read = STORY.chapters.filter((c) => !c.todo && STORY.quests.filter((q) => q.chapter === c.id).every((q) => g0.story.isDone(q.id)));
    if (read.length) {
      const det = h('details', 'q-recap') as HTMLDetailsElement; det.appendChild(h('summary', '', `劇情回顧（${read.length} 章）`));
      for (const c of read) { const d = h('div', 'q-box'); d.innerHTML = `<b>${c.name}</b><br><span class="sk-desc">${c.summary}</span>`; det.appendChild(d); }
      this.body.appendChild(det);
    }
    this.body.appendChild(h('div', 'lbl q-side-lbl', '◆ 支線任務'));
    const act = qs.activeList();
    if (!act.length) this.body.appendChild(h('div', 'dim', '目前沒有進行中的任務。看下面「可以接的任務」，或找頭上有「!」的 NPC。'));
    for (const q of act) {
      const box = h('div', 'q-box q-side');
      const done = qs.complete(q);
      const tgt = q.type === 'kill' ? DB.monster[q.target]?.name : DB.item[q.target]?.name;
      box.innerHTML = `<b>${q.name}</b> ${done ? '<span class="q-ok">可回報</span>' : ''}<br><span class="sk-desc">${q.desc}</span><br>` +
        `<span class="lbl">${q.type === 'kill' ? '擊敗' : '收集'} ${tgt}：</span><span class="val">${qs.progress(q)} / ${q.count}</span>　<span class="dim">回報：${DB.npc[q.npc]?.name}</span>`;
      const b = btn('放棄', () => { ask(`放棄「${q.name}」？`, () => qs.abandon(q.id)); }, 'sm'); b.style.float = 'right';
      box.prepend(b);
      this.body.appendChild(box);
    }
    const g = this.ui.g;
    // 可以接的任務：在哪裡、找誰；「追蹤」會讓📍指向它
    const avail = QUESTS.filter((q) => !q.trial && qs.canAccept(q)).sort((a, b) => (a.reqLv || 0) - (b.reqLv || 0));
    this.body.appendChild(h('div', 'lbl', `可以接的任務（${avail.length}）`));
    if (!avail.length) this.body.appendChild(h('div', 'dim', '目前沒有可以接的任務。升級或完成任務後會有新的。'));
    for (const q of avail) {
      const box = h('div', 'q-box q-avail');
      const pinned = g.flags.guidePin === q.id;
      const b = btn(pinned ? '追蹤中' : '📍追蹤', () => { g.flags.guidePin = pinned ? null : q.id; g.flags.guideSeen = true; this.render(); this.ui.qtrack.render(); }, 'sm' + (pinned ? ' dis' : '')); b.style.float = 'right';
      box.innerHTML = `<b>${q.name}</b>${q.reqLv ? ` <span class="dim">Lv${q.reqLv}</span>` : ''}<br><span class="sk-desc">${q.desc}</span><br><span class="lbl">找：</span><span class="val">${g.guide.whereNpc(q.npc)}</span>`;
      box.prepend(b); this.body.appendChild(box);
    }
    // 還沒解鎖的（只差等級）：預告
    const soon = QUESTS.filter((q) => !q.trial && !qs.s[q.id] && (!q.prev || qs.isDone(q.prev)) && (q.reqLv || 0) > g.player.ch.baseLv).sort((a, b) => (a.reqLv || 0) - (b.reqLv || 0)).slice(0, 4);
    if (soon.length) { this.body.appendChild(h('div', 'lbl', '快解鎖的任務')); for (const q of soon) this.body.appendChild(h('div', 'dim', `Lv${q.reqLv}　${q.name}（${g.guide.whereNpc(q.npc)}）`)); }
    const done = QUESTS.filter((q) => qs.isDone(q.id));
    if (done.length) { this.body.appendChild(h('div', 'lbl', `已完成（${done.length}/${QUESTS.length}）`)); this.body.appendChild(h('div', 'dim', done.map((q) => q.name).join('、'))); }
  }
}
export class QuestTracker {
  el: HTMLDivElement;
  constructor(private ui: UI) {
    this.el = h('div'); this.el.id = 'qtrack';

    ui.root.appendChild(this.el);
    ui.g.ev.on('quest', () => this.render()); ui.g.ev.on('inv', () => this.render());
  }
  render() {
    const qs = this.ui.g.quests, list = qs.activeList(), gd = this.ui.g.inTitle ? null : this.ui.g.guide.get();
    const ml = this.ui.g.inTitle ? null : mainLine(this.ui.g), showMain = !!ml && !ml.wait && !gd?.main; // 引導已經在講主線就不重複
    this.sig = (gd ? gd.text + (gd.sub || '') : '') + (ml ? ml.name + ml.hint : '');
    this.el.style.display = list.length || gd || showMain ? 'block' : 'none';
    this.el.innerHTML = '';
    const head = h('div', 'qt-head'); head.append(h('span', 'fold-ic'), h('span', '', `任務追蹤（${list.length}）${ml && !ml.wait ? ' ★' : ''}${gd ? ' 📍' : ''}`)); head.title = '點擊收合／展開';
    head.addEventListener('click', () => this.ui.setFold('qtrack', !this.ui.fold.qtrack, this.el));
    this.el.appendChild(head);
    this.el.classList.toggle('folded', !!this.ui.fold.qtrack);
    if (showMain && ml) {
      const d = h('div', 'qt-item qt-main');
      d.addEventListener('click', () => this.ui.toggle('quests'));
      d.innerHTML = `<div class="qt-name">★ ${ml.name}</div><div class="qt-prog">${ml.hint}</div>`;
      this.el.appendChild(d);
    }
    for (const q of list) {
      const done = qs.complete(q);
      const tgt = q.type === 'kill' ? DB.monster[q.target]?.name : DB.item[q.target]?.name;
      const d = h('div', 'qt-item' + (done ? ' done' : ''));
      d.addEventListener('click', () => this.ui.toggle('quests'));
      d.innerHTML = `<div class="qt-name">${done ? '✔ ' : ''}${q.name}</div><div class="qt-prog">${tgt} ${qs.progress(q)}/${q.count}${done ? '　→ ' + DB.npc[q.npc]?.name : ''}</div>`;
      this.el.appendChild(d);
    }
    if (gd) { // 下一步：去哪裡、找誰；點一下可開關畫面上的方向箭頭
      const off = !!this.ui.g.flags.guideOff;
      const b = h('div', 'qt-guide' + (off ? ' off' : '') + (gd.main ? ' main' : '')); b.title = '點一下開關畫面上的方向箭頭';
      b.innerHTML = `<div class="qt-gt">📍 ${gd.text}</div>${gd.sub ? `<div class="qt-sub">${gd.sub}</div>` : ''}<div class="qt-sub">${gd.arrow ? (off ? '箭頭：關' : '箭頭：開') : ''}</div>`;
      b.addEventListener('click', () => { this.ui.g.flags.guideSeen = true; this.ui.g.flags.guideOff = !this.ui.g.flags.guideOff; this.render(); });
      this.el.appendChild(b);
    }
  }
  sig = ''; private t = 0;
  /** 每秒檢查引導內容有沒有變（升級、換地圖、進度）才重畫 */
  update(dt: number) {
    this.t += dt; if (this.t < 1) return; this.t = 0;
    const gd = this.ui.g.inTitle ? null : this.ui.g.guide.get(1), ml = this.ui.g.inTitle ? null : mainLine(this.ui.g);
    const sig = (gd ? gd.text + (gd.sub || '') : '') + (ml ? ml.name + ml.hint : '');
    if (sig !== this.sig) this.render();
  }
}
