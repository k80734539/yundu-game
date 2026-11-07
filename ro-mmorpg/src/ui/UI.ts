import type { Game } from '../core/Game';
import type { KeyCombo } from '../core/Input';
import { Win, h, btn, ask } from './Window';
import { Hud } from './Hud';
import { Chat, MsgKind } from './Chat';
import { StatusWindow } from './StatusWindow';
import { Minimap } from './Minimap';
import { WorldMap } from './WorldMap';
import { InventoryWindow } from './InventoryWindow';
import { EquipWindow } from './EquipWindow';
import { SkillWindow } from './SkillWindow';
import { Hotbar } from './Hotbar';
import { ShopWindow } from './ShopWindow';
import { OptionsWindow } from './OptionsWindow';
import { ItemInfo } from './ItemInfo';
import type { DragData } from './Drag';
import { Dialog } from './Dialog';
import { DB } from '../data';
import { iconURL } from '../render/IconArt';
import { QuestWindow, QuestTracker } from './QuestWindow';
import { RefineWindow, CardWindow } from './RefineWindow';

/** UI 管理器：DOM 視窗、快捷鍵、訊息、橫幅 */
export class UI {
  winPos: Record<string, [number, number]> = {};
  wins: Record<string, Win> = {};
  hud: Hud; chat: Chat; mini: Minimap; world: WorldMap; info: ItemInfo; hot: Hotbar; shop: ShopWindow; dialog: Dialog; qtrack: QuestTracker;
  banner: HTMLDivElement;
  private bannerT = 0;
  buffEl!: HTMLDivElement;
  death!: HTMLDivElement;
  tut!: HTMLDivElement;
  private buffKey = '';
  constructor(public g: Game, public root: HTMLElement) {
    try { this.winPos = JSON.parse(localStorage.getItem('rom.ui') || '{}'); } catch { this.winPos = {}; }
    const exp = h('div'); exp.id = 'expline'; exp.appendChild(h('i')); root.appendChild(exp);
    this.banner = h('div'); this.banner.id = 'banner'; root.appendChild(this.banner);
    this.hud = new Hud(this);
    this.chat = new Chat(this);
    this.add(new StatusWindow(this));
    this.info = new ItemInfo(this);
    this.mini = new Minimap(this);
    this.world = this.add(new WorldMap(this)) as WorldMap;
    this.add(new InventoryWindow(this));
    this.add(new EquipWindow(this));
    this.add(new SkillWindow(this));
    this.shop = this.add(new ShopWindow(this)) as ShopWindow;
    this.add(new OptionsWindow(this));
    this.hot = new Hotbar(this);
    this.add(new QuestWindow(this));
    this.qtrack = new QuestTracker(this);
    this.dialog = new Dialog(this);
    this.add(new RefineWindow(this));
    this.add(new CardWindow(this));
    this.death = h('div'); this.death.id = 'death';
    const box = h('div', 'win box'); box.style.position = 'static'; this.death.appendChild(box); root.appendChild(this.death);
    this.buffEl = h('div'); this.buffEl.id = 'buffs'; root.appendChild(this.buffEl);
    this.tut = h('div'); this.tut.id = 'tuthint'; root.appendChild(this.tut);
    g.ev.on('stats', () => this.refresh());
  }
  add(w: Win) { this.wins[w.id] = w; return w; }
  toggle(id: string) { const w = this.wins[id]; if (w) w.toggle(); }
  open(id: string) { this.wins[id]?.open(); }
  refresh() { for (const w of Object.values(this.wins)) if (w.isOpen) w.render(); this.hud.update(); }
  savePrefs() { try { localStorage.setItem('rom.ui', JSON.stringify(this.winPos)); } catch { /* 私密模式 */ } }
  sfx(_name: string) { this.g.audio?.ui(_name); }
  weightNow(): number { return this.g.inv ? this.g.inv.weight() : 0; }
  msg(text: string, kind: MsgKind = 'sys') { this.chat.add(text, kind); }
  showBanner(title: string, sub = '', cls = '', dur = 2.6) {
    this.banner.innerHTML = '';
    const b = h('div', 'b ' + cls); b.textContent = title;
    if (sub) { const s = h('small'); s.textContent = sub; b.appendChild(s); }
    this.banner.appendChild(b);
    requestAnimationFrame(() => b.classList.add('show'));
    this.bannerT = dur;
  }
  onMap() { this.mini.onMap(); this.world.render(); this.qtrack.render(); }
  /** 拖曳放開：快捷列 → 設定；遊戲畫面 → 丟到地上 */
  dropOn(t: Element | null, d: DragData) {
    const hot = (t as HTMLElement | null)?.closest?.('[data-hot]') as HTMLElement | null;
    if (hot) { this.g.hotbar[+hot.dataset.hot!] = { type: d.type, id: d.id }; this.hot.render(); this.sfx('click'); return; }
    if (t === this.g.r.canvas && d.type === 'item' && d.uid !== undefined) this.g.dropItem(d.uid);
  }
  update(dt: number) {
    this.hud.update();
    this.hot.update();
    this.dialog.update(dt);
    const bt = this.g.buffT, keys = Object.keys(bt);
    const bk = keys.map((k) => k + Math.ceil(bt[k])).join(',');
    if (bk !== this.buffKey) {
      this.buffKey = bk; this.buffEl.innerHTML = '';
      for (const k of keys) {
        const sk = DB.skill[k]; if (!sk) continue;
        const d = h('div', 'buff'); const img = h('img') as HTMLImageElement; img.src = iconURL(sk.icon.k, sk.icon.c); d.append(img, h('span', '', String(Math.ceil(bt[k])))); d.title = sk.name;
        this.buffEl.appendChild(d);
      }
    }
    this.mini.update(dt);
    this.world.update(dt);
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.banner.querySelector('.b')?.classList.remove('show'); }
  }
  /** 回傳 true 表示按鍵已被 UI 處理 */
  onKey(k: KeyCombo): boolean {
    if (this.dialog.onKey(k.key)) return true;
    const key = k.key.toLowerCase();
    if (k.alt) {
      const map: Record<string, string> = { a: 'status', e: 'inventory', q: 'equip', s: 'skills', u: 'quests' };
      if (map[key]) { this.toggle(map[key]); return true; }
    }
    if (k.key === 'Enter') { this.chat.focus(); return true; }
    if (k.key === 'Insert') { this.g.toggleSit(); return true; }
    const fm = /^F([1-9])$/.exec(k.key);
    if (fm) { this.g.useHot(+fm[1] - 1); return true; }
    if (k.key === 'Escape') {
      const open = Object.values(this.wins).filter((w) => w.isOpen).sort((a, b) => +b.el.style.zIndex - +a.el.style.zIndex);
      if (open.length) { open[0].close(); this.sfx('close'); } else this.toggle('options');
      return true;
    }
    if (key === 'm' && !k.alt && !k.ctrl) { this.toggle('worldmap'); return true; }
    return false;
  }
  /** 和 NPC 說話（階段 6 換成對話框） */
  showDeath(lb: number, lj: number) {
    const box = this.death.firstChild as HTMLElement;
    box.innerHTML = `<b>你倒下了</b><div>${lb || lj ? `損失經驗 ${lb}／職業經驗 ${lj}` : '初心者不會損失經驗。'}</div><br>`;
    const b = btn('回到儲存點', () => { this.death.style.display = 'none'; this.g.respawn(); });
    box.appendChild(b);
    this.death.style.display = 'flex';
  }
  /** 標題畫面：新角色／繼續 */
  showTitle() {
    const t = h('div'); t.id = 'title';
    const box = h('div', 'tbox');
    box.innerHTML = '<h1>晨曦物語</h1><div class="sub">RO 風格單機網頁 MMORPG</div>';
    const save = this.g.save.read();
    const btns = h('div', 'btns');
    const name = h('input') as HTMLInputElement; name.placeholder = '輸入角色名稱'; name.maxLength = 10; name.value = '';
    name.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(false); });
    const go = (cont: boolean) => {
      const start = () => { t.remove(); this.audio(); this.g.begin(cont, name.value.trim() || '冒險者'); };
      if (!cont && save) ask('開始新的冒險會覆蓋現有存檔，確定嗎？', start); else start();
    };
    if (save) {
      const jn = DB.job[save.ch.job]?.name || '';
      btns.appendChild(btn(`繼續冒險（${save.ch.name}　${jn} Lv${save.ch.baseLv}）`, () => go(true)));
    }
    const nb = h('div', 'btns'); nb.append(name, btn('新的冒險', () => go(false)));
    box.append(btns, nb);
    box.appendChild(h('div', 'note', '點擊移動／攻擊　Alt+E 背包　Alt+A 能力值　Alt+S 技能　F1~F9 快捷列　M 世界地圖'));
    t.appendChild(box);
    this.root.appendChild(t);
    setTimeout(() => name.focus(), 50);
  }
  audio() { this.g.audio?.unlock(); }
  tutorialHint() {
    const t = this.g.inTitle ? null : this.g.tutorial.text();
    this.tut.style.display = t ? 'block' : 'none';
    if (!t) return;
    this.tut.innerHTML = '';
    const x = h('span', 'tut-x', '×'); x.title = '關閉教學提示（可以找導覽員重新打開）';
    x.addEventListener('click', () => { this.g.flags.tutOff = true; this.tutorialHint(); });
    this.tut.append(h('span', 'tut-icon', '?'), h('span', '', t), x);
  }
  talk(npc: import('../entities/Npc').Npc) { this.dialog.open(npc); }
  command(t: string) {
    if (!t.startsWith('/')) { this.msg(`${this.g.player.ch.name}：${t}`, 'me'); return; }
    const [cmd, ...args] = t.slice(1).split(/\s+/);
    this.g.command(cmd, args);
  }
}
