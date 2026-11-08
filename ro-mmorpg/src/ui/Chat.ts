import type { UI } from './UI';
import { h } from './Window';
export type MsgKind = 'sys' | 'exp' | 'item' | 'warn' | 'quest' | 'ann' | 'me' | 'npc';
/** 左下聊天框：系統訊息＋輸入（Enter 開始輸入） */
export class Chat {
  el: HTMLDivElement; log: HTMLDivElement; input: HTMLInputElement; last: HTMLSpanElement;
  constructor(private ui: UI) {
    this.el = h('div'); this.el.id = 'chat';
    this.log = h('div', 'log'); this.input = h('input'); this.input.placeholder = '按 Enter 聊天，輸入 /help 查看指令';
    this.input.maxLength = 80;
    const head = h('div', 'chat-head'); head.append(h('span', 'fold-ic'), h('span', '', '聊天')); this.last = h('span', 'chat-last');
    head.appendChild(this.last); head.title = '點擊收合／展開聊天框';
    head.addEventListener('click', () => ui.setFold('chat', !ui.fold.chat, this.el));
    this.el.append(head, this.log, this.input);
    ui.root.appendChild(this.el);
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const t = this.input.value.trim(); this.input.value = ''; this.input.blur(); if (t) ui.command(t); e.preventDefault(); }
      if (e.key === 'Escape') { this.input.blur(); }
      e.stopPropagation();
    });
  }
  add(text: string, kind: MsgKind = 'sys') {
    const d = h('div', kind, text);
    this.last.textContent = text; this.last.className = 'chat-last ' + kind;
    this.log.appendChild(d);
    while (this.log.children.length > 120) this.log.firstChild!.remove();
    this.log.scrollTop = this.log.scrollHeight;
  }
  focus() { this.input.focus(); }
}
