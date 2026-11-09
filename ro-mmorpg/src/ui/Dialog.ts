import type { UI } from './UI';
import { h } from './Window';
import type { Npc } from '../entities/Npc';
import { DB, MAPS, MERCS } from '../data';

export interface Choice { label: string; fn: () => void; cls?: string }
/** NPC 對話框：打字機效果、分頁、選項（點擊或數字鍵選擇） */
export class Dialog {
  el: HTMLDivElement; nameEl: HTMLDivElement; textEl: HTMLDivElement; optsEl: HTMLDivElement; hint: HTMLDivElement; face: HTMLCanvasElement;
  npc: Npc | null = null;
  private pages: string[] = []; private page = 0; private shown = 0; private full = ''; private then: (() => void) | null = null;
  private choices: Choice[] = [];
  constructor(private ui: UI) {
    this.el = h('div', 'win hidden'); this.el.id = 'dialog';
    this.nameEl = h('div', 'win-title');
    const body = h('div', 'dlg-body');
    this.face = h('canvas', 'dlg-face'); this.face.width = 72; this.face.height = 72;
    this.textEl = h('div', 'dlg-text');
    body.append(this.face, this.textEl);
    this.optsEl = h('div', 'dlg-opts');
    this.hint = h('div', 'dlg-hint', '▼ 點擊或按 Enter 繼續');
    const x = h('div', 'win-x', '×'); x.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    this.el.append(this.nameEl, x, body, this.optsEl, this.hint);
    this.el.addEventListener('click', () => this.advance());
    ui.root.appendChild(this.el);
  }
  get isOpen() { return !this.el.classList.contains('hidden'); }
  open(npc: Npc) {
    this.npc = npc;
    this.nameEl.textContent = npc.def.name + (npc.def.title ? `（${npc.def.title}）` : '');
    const c = this.face.getContext('2d')!; c.imageSmoothingEnabled = false; c.clearRect(0, 0, 72, 72);
    c.fillStyle = '#dde6f6'; c.fillRect(0, 0, 72, 72);
    c.drawImage(npc.sheet.c, 60, 66, 72, 72, 0, 0, 72, 72);
    this.el.classList.remove('hidden'); this.el.style.zIndex = '5000';
    this.runNode('start');
  }
  close() { this.el.classList.add('hidden'); this.npc = null; this.choices = []; this.then = null; this.ui.g.dialogClosed(); }
  /** 顯示幾頁文字，結束後呼叫 then */
  say(lines: string | string[], then?: () => void) {
    this.pages = Array.isArray(lines) ? lines : [lines]; this.page = 0; this.then = then || (() => this.close());
    this.choices = []; this.optsEl.innerHTML = '';
    this.startPage();
  }
  private startPage() { this.full = this.pages[this.page]; this.shown = 0; this.textEl.textContent = ''; this.hint.style.visibility = 'hidden'; this.ui.sfx('talk'); }
  choose(list: Choice[]) {
    this.choices = list; this.optsEl.innerHTML = ''; this.hint.style.visibility = 'hidden';
    list.forEach((c, i) => {
      const b = h('div', 'dlg-opt ' + (c.cls || ''), `${i + 1}. ${c.label}`);
      b.addEventListener('click', (e) => { e.stopPropagation(); this.pick(i); });
      this.optsEl.appendChild(b);
    });
  }
  private pick(i: number) { const c = this.choices[i]; if (!c) return; this.choices = []; this.optsEl.innerHTML = ''; this.ui.sfx('click'); c.fn(); }
  advance() {
    if (this.choices.length) return;
    if (this.shown < this.full.length) { this.shown = this.full.length; this.textEl.textContent = this.full; this.hint.style.visibility = 'visible'; return; }
    if (this.page < this.pages.length - 1) { this.page++; this.startPage(); return; }
    const t = this.then; this.then = null; if (t) t();
  }
  update(dt: number) {
    if (!this.isOpen || this.shown >= this.full.length) return;
    this.shown = Math.min(this.full.length, this.shown + dt * 45);
    this.textEl.textContent = this.full.slice(0, Math.floor(this.shown));
    if (this.shown >= this.full.length && !this.choices.length) this.hint.style.visibility = 'visible';
  }
  onKey(key: string): boolean {
    if (!this.isOpen) return false;
    if (key === 'Escape') { this.close(); return true; }
    if (key === 'Enter' || key === ' ') { this.advance(); return true; }
    if (/^[1-9]$/.test(key) && this.choices.length) { this.pick(+key - 1); return true; }
    return true; // 對話中吞掉其他按鍵
  }
  // ---------------- 腳本 ----------------
  runNode(id: string) {
    const npc = this.npc!; const node = npc.def.dialog[id];
    if (!node) { this.close(); return; }
    this.say(node.text, () => {
      if (node.opts) this.choose(node.opts.map((o) => ({ label: o.label, fn: () => (o.go ? this.runNode(o.go) : this.act(o.act || 'close', o.arg)) })));
      else if (node.go) this.runNode(node.go);
      else if (node.act) this.act(node.act, node.arg);
      else this.close();
    });
  }
  act(a: string, arg?: string) {
    const g = this.ui.g, npc = this.npc!;
    switch (a) {
      case 'close': this.close(); break;
      case 'shop': this.close(); this.ui.shop.openShop(arg || npc.def.shop || 'tool', 'buy'); break;
      case 'sell': this.close(); this.ui.shop.openShop(arg || npc.def.shop || 'tool', 'sell'); break;
      case 'heal': {
        const cost = +(arg || 0);
        if (g.player.ch.zeny < cost) { this.say('啊……Zeny 好像不太夠呢。'); break; }
        g.player.ch.zeny -= cost; g.fullHeal(); this.say('好好休息吧。祝你旅途順利！'); break;
      }
      case 'save': g.savePoint = { map: g.map.def.id, x: Math.floor(npc.x), y: Math.floor(npc.y) + 2 }; g.save?.saveSoon(); this.say('已經幫你設定好儲存點了。'); g.msg('儲存點已設定在 ' + g.map.def.name + '。', 'sys'); break;
      case 'quests': this.questMenu(); break;
      case 'warpmenu': this.warpMenu(); break;
      case 'mercmenu': this.mercMenu(); break;
      case 'jobmenu': g.jobMenu(this); break;
      case 'refine': this.close(); this.ui.open('refine'); break;
      case 'cards': this.close(); this.ui.open('cards'); break;
      case 'forge': this.close(); this.ui.forge.openTab(arg === 'exchange' ? 'exchange' : 'dismantle'); break;
      case 'reset': {
        const cost = g.resetCost();
        this.say([`可以把技能點或能力點全部收回來重新分配。`, cost ? `你已經超過 Lv20，每次收費 ${cost} Zeny。` : 'Lv20 以下免費喔！'], () => this.choose([
          { label: '重置技能點（保留基本技能）', fn: () => this.say(g.resetSkills()) },
          { label: '重置能力點（六項回到 5）', fn: () => this.say(g.resetStats()) },
          { label: '算了', fn: () => this.close() },
        ]));
        break;
      }
      case 'tutorial': g.flags.tutOff = !g.flags.tutOff; this.ui.tutorialHint(); this.say(g.flags.tutOff ? '好的，先把提示收起來。想看的時候再來找我吧！' : '畫面上方會一步一步提示你該做什麼喔！'); break;
      default: this.close();
    }
  }
  questMenu() {
    const g = this.ui.g, qs = g.quests, npc = this.npc!;
    const f = qs.forNpc(npc.def.id);
    const list: Choice[] = [];
    for (const q of f.active) {
      if (qs.complete(q)) list.push({ label: `【可回報】${q.name}`, cls: 'done', fn: () => { qs.turnIn(q.id); this.say(q.done, () => this.questMenu()); } });
      else list.push({ label: `【進行中】${q.name}（${qs.progress(q)}/${q.count}）`, fn: () => { this.say([q.desc, `目前進度：${qs.progress(q)} / ${q.count}`], () => this.choose([{ label: '繼續努力', fn: () => this.close() }, { label: '放棄任務', fn: () => { qs.abandon(q.id); this.close(); } }])); } });
    }
    for (const q of f.avail) list.push({ label: `【新任務】${q.name}`, cls: 'new', fn: () => this.offer(q.id) });
    if (!list.length) {
      const next = f.locked.find((q) => !q.prev || qs.isDone(q.prev));
      this.say(next && next.reqLv ? `等你成長到 Lv${next.reqLv} 再來找我吧。` : '目前沒有需要你幫忙的事，謝謝你！');
      return;
    }
    list.push({ label: '離開', fn: () => this.close() });
    this.say('有什麼需要我說明的嗎？', () => this.choose(list));
  }
  offer(id: string) {
    const g = this.ui.g, q = DB.quest[id];
    const r = q.reward, rw: string[] = [];
    if (r.exp) rw.push(`經驗 ${r.exp}`); if (r.jexp) rw.push(`職業經驗 ${r.jexp}`); if (r.zeny) rw.push(`${r.zeny} Zeny`);
    for (const [it, n] of r.items || []) rw.push(`${DB.item[it].name}×${n}`);
    this.say([q.desc, `報酬：${rw.join('、')}`], () => this.choose([
      { label: '接受', fn: () => { g.quests.accept(id); this.say('拜託你了！', () => this.close()); } },
      { label: '再考慮一下', fn: () => this.close() },
    ]));
  }
  mercMenu() {
    const g = this.ui.g, ms = g.mercs, list: Choice[] = [];
    if (ms.active) {
      const m = ms.merc!;
      this.say([`${m.name}的契約還剩約 ${Math.ceil(ms.left / 60)} 分鐘。`, m.type.desc], () => this.choose([
        { label: '續約（重新計算 30 分鐘）', fn: () => { const t = m.type, price = ms.cost(); if (g.player.ch.zeny < price) { this.say('Zeny 不足喔。'); return; } g.player.ch.zeny -= price; g.ev.emit('stats'); ms.left = MERCS.contractSec; this.say(`續約完成（${price.toLocaleString()} Zeny）。${t.title}會繼續跟著你。`); } },
        { label: '解雇傭兵', fn: () => { ms.dismiss(); this.say('好的，契約已經解除。'); } },
        { label: '再見', fn: () => this.close() },
      ]));
      return;
    }
    const price = ms.cost();
    for (const t of MERCS.types) list.push({ label: `${t.title}：${t.desc}`, fn: () => { const err = ms.hire(t.id); this.say(err || `${t.name}跟你簽約了！契約三十分鐘，她會一直跟著你。`.replace('她', t.id === 'alchemist' ? '他' : '她')); } });
    list.push({ label: '再見', fn: () => this.close() });
    this.say([`目前沒有雇用任何傭兵。雇用一位需要 ${price.toLocaleString()} Zeny（依你的等級計算）。`, '傭兵不會被怪物攻擊，不吃經驗，也不會搶你的掉落物。打大型 Boss 時效果會減弱。'], () => this.choose(list));
  }
  warpMenu() {
    const g = this.ui.g;
    const list: Choice[] = [];
    for (const d of MAPS) {
      if (d.type === 'town' || !g.flags.visited?.[d.id]) continue;
      const price = 100 + (d.level?.[0] || 1) * 50;
      const arrive = d.portals[0];
      list.push({ label: `${d.name}（${price} Zeny）`, fn: () => {
        if (g.player.ch.zeny < price) { this.say('Zeny 不足喔。'); return; }
        g.player.ch.zeny -= price; this.close(); g.ev.emit('stats');
        const p = g.map; void p;
        g.warpTo(d.id, arrive.x + (arrive.x < d.w / 2 ? 3 : -3), arrive.y + (arrive.y < d.h / 2 ? 3 : -3));
      } });
    }
    if (!list.length) { this.say('您還沒有去過其他地方。走過的地圖才能使用傳送服務喔。'); return; }
    list.push({ label: '取消', fn: () => this.close() });
    this.say('要傳送到哪裡呢？（只能傳送到去過的地方）', () => this.choose(list));
  }
}
