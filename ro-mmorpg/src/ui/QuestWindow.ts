import type { UI } from './UI';
import { Win, h, btn, ask } from './Window';
import { DB, QUESTS } from '../data';

/** 任務視窗（Alt+U）＋右側任務追蹤欄 */
export class QuestWindow extends Win {
  constructor(ui: UI) { super(ui, 'quests', '任務（Alt+U）', { x: 300, y: 100, w: 340 }); ui.g.ev.on('quest', () => this.render()); ui.g.ev.on('inv', () => this.render()); }
  render() {
    if (!this.isOpen) return;
    const qs = this.ui.g.quests;
    this.body.innerHTML = '';
    const act = qs.activeList();
    if (!act.length) this.body.appendChild(h('div', 'dim', '目前沒有進行中的任務。找頭上有「!」的 NPC 談談吧。'));
    for (const q of act) {
      const box = h('div', 'q-box');
      const done = qs.complete(q);
      const tgt = q.type === 'kill' ? DB.monster[q.target]?.name : DB.item[q.target]?.name;
      box.innerHTML = `<b>${q.name}</b> ${done ? '<span class="q-ok">可回報</span>' : ''}<br><span class="sk-desc">${q.desc}</span><br>` +
        `<span class="lbl">${q.type === 'kill' ? '擊敗' : '收集'} ${tgt}：</span><span class="val">${qs.progress(q)} / ${q.count}</span>　<span class="dim">回報：${DB.npc[q.npc]?.name}</span>`;
      const b = btn('放棄', () => { ask(`放棄「${q.name}」？`, () => qs.abandon(q.id)); }, 'sm'); b.style.float = 'right';
      box.prepend(b);
      this.body.appendChild(box);
    }
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
    const qs = this.ui.g.quests, list = qs.activeList();
    this.el.style.display = list.length ? 'block' : 'none';
    this.el.innerHTML = '';
    const head = h('div', 'qt-head'); head.append(h('span', 'fold-ic'), h('span', '', `任務追蹤（${list.length}）`)); head.title = '點擊收合／展開';
    head.addEventListener('click', () => this.ui.setFold('qtrack', !this.ui.fold.qtrack, this.el));
    this.el.appendChild(head);
    this.el.classList.toggle('folded', !!this.ui.fold.qtrack);
    for (const q of list) {
      const done = qs.complete(q);
      const tgt = q.type === 'kill' ? DB.monster[q.target]?.name : DB.item[q.target]?.name;
      const d = h('div', 'qt-item' + (done ? ' done' : ''));
      d.addEventListener('click', () => this.ui.toggle('quests'));
      d.innerHTML = `<div class="qt-name">${done ? '✔ ' : ''}${q.name}</div><div class="qt-prog">${tgt} ${qs.progress(q)}/${q.count}${done ? '　→ ' + DB.npc[q.npc]?.name : ''}</div>`;
      this.el.appendChild(d);
    }
  }
}
