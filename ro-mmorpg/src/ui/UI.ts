import type { Game } from '../core/Game';
import type { KeyCombo } from '../core/Input';
import { Win, h, btn, ask, codeBox } from './Window';
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
import { MobileUI } from './MobileUI';
import { DB } from '../data';
import { iconURL } from '../render/IconArt';
import { QuestWindow, QuestTracker } from './QuestWindow';
import { RefineWindow, CardWindow } from './RefineWindow';
import { ForgeWindow } from './ForgeWindow';
import { BossBar } from './BossBar';

/** UI 管理器：DOM 視窗、快捷鍵、訊息、橫幅 */
export class UI {
  winPos: Record<string, [number, number]> = {};
  /** 收合狀態（hud/mini/qtrack/chat/tut）；手機預設全部收合 */
  fold: Record<string, boolean> = {};
  mobile = false;
  m: MobileUI | null = null;
  wins: Record<string, Win> = {};
  hud: Hud; chat: Chat; mini: Minimap; world: WorldMap; info: ItemInfo; hot: Hotbar; shop: ShopWindow; dialog: Dialog; qtrack: QuestTracker;
  banner: HTMLDivElement;
  private bannerT = 0;
  buffEl!: HTMLDivElement;
  death!: HTMLDivElement;
  forge!: ForgeWindow;
  bossbar!: BossBar;
  tut!: HTMLDivElement;
  private buffKey = '';
  constructor(public g: Game, public root: HTMLElement) {
    try { this.winPos = JSON.parse(localStorage.getItem('rom.ui') || '{}'); } catch { this.winPos = {}; }
    this.mobile = isMobile();
    root.classList.toggle('mobile', this.mobile);
    const def = this.mobile ? { hud: true, mini: true, qtrack: true, chat: true, tut: true } : { hud: false, mini: false, qtrack: false, chat: false, tut: false };
    let saved: Record<string, boolean> = {};
    try { saved = JSON.parse(localStorage.getItem(this.mobile ? 'rom.fold.m' : 'rom.fold') || '{}'); } catch { /* */ }
    this.fold = { ...def, ...saved };
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
    this.bossbar = new BossBar(this);
    this.forge = this.add(new ForgeWindow(this)) as ForgeWindow;
    this.death = h('div'); this.death.id = 'death';
    const box = h('div', 'win box'); box.style.position = 'static'; this.death.appendChild(box); root.appendChild(this.death);
    this.buffEl = h('div'); this.buffEl.id = 'buffs'; root.appendChild(this.buffEl);
    this.tut = h('div'); this.tut.id = 'tuthint'; root.appendChild(this.tut);
    if (this.mobile) this.m = new MobileUI(this);
    this.applyFolds();
    g.ev.on('stats', () => this.refresh());
  }
  add(w: Win) { this.wins[w.id] = w; return w; }
  toggle(id: string) { const w = this.wins[id]; if (w) w.toggle(); }
  open(id: string) { this.wins[id]?.open(); }
  refresh() { for (const w of Object.values(this.wins)) if (w.isOpen) w.render(); this.hud.update(); }
  /** 切換收合；el 為要加 folded class 的元素 */
  setFold(id: string, v: boolean, el?: HTMLElement | null) {
    this.fold[id] = v;
    (el || document.getElementById(id === 'mini' ? 'minimap' : id))?.classList.toggle('folded', v);
    try { localStorage.setItem(this.mobile ? 'rom.fold.m' : 'rom.fold', JSON.stringify(this.fold)); } catch { /* */ }
    if (id === 'tut') this.tutorialHint();
  }
  applyFolds() { for (const [k, v] of Object.entries(this.fold)) this.setFold(k, v); }
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
    this.bossbar.update();
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
    if (k.key === 'Enter') { if (this.fold.chat) this.setFold('chat', false); this.chat.focus(); return true; }
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
  /** 標題畫面：3 個角色欄位（開始／刪除／建立） */
  refreshTitle() { if (this.root.querySelector('#title')) { this.root.querySelector('#title')!.remove(); this.showTitle(); } }
  showTitle() {
    const t = h('div'); t.id = 'title';
    const pending = this.g.save.cloud.state === 'pending';
    const box = h('div', 'tbox');
    box.innerHTML = '<h1>晨曦物語</h1><div class="sub">選擇角色</div>';
    const list = h('div', 'slots');
    const go = (cont: boolean, slot: number, name = '') => { t.remove(); this.audio(); this.g.begin(cont, name || '冒險者', slot); };
    const mapName = (id: string) => DB.map[id]?.name || '';
    this.g.save.list().forEach((info, i) => {
      const slot = i + 1;
      const card = h('div', 'slot' + (info ? '' : ' empty'));
      card.appendChild(h('div', 'slot-n', `欄位 ${slot}`));
      if (info) {
        const face = h('canvas', 'slot-face') as HTMLCanvasElement; face.width = 72; face.height = 72;
        const look = { ...DB.job[info.job]?.look };
        import('../render/SpriteFactory').then(({ humanSheet }) => { const sh = humanSheet(look); const c = face.getContext('2d')!; c.imageSmoothingEnabled = false; c.drawImage(sh.c, 60, 66, 72, 72, 0, 0, 72, 72); });
        const tx = h('div', 'slot-info');
        tx.innerHTML = `<b>${info.name}</b><br>${DB.job[info.job]?.name || ''}　Lv ${info.baseLv}／Job ${info.jobLv}<br><span class="dim">${mapName(info.map)}${info.t ? '　' + new Date(info.t).toLocaleDateString() : ''}</span>`;
        const bs = h('div', 'slot-btns');
        bs.append(btn(pending ? '連線中…' : '開始', () => { if (!pending) go(true, slot); }, pending ? 'dis' : ''), btn('刪除', () => ask(`確定要刪除「${info.name}」嗎？刪除後無法復原。`, () => { this.g.save.deleteSlot(slot); t.remove(); this.showTitle(); }), 'warn'));
        card.append(face, tx, bs);
      } else {
        const name = h('input') as HTMLInputElement; name.placeholder = '角色名稱'; name.maxLength = 10; name.id = 'slot-name-' + slot;
        name.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(false, slot, name.value.trim()); });
        const bs = h('div', 'slot-btns'); bs.append(btn('建立角色', () => { if (!pending) go(false, slot, name.value.trim()); }, pending ? 'dis' : ''));
        card.append(h('div', 'slot-info dim', '空欄位'), name, bs);
      }
      list.appendChild(card);
    });
    box.appendChild(list);
    const stt = this.g.save.statusText(); box.appendChild(h('div', 'save-status ' + stt.level, stt.text));
    const imp = h('div', 'btns'); imp.appendChild(btn('匯入存檔代碼', () => codeBox({ title: '匯入存檔代碼', hint: '貼上從別的瀏覽器或手機「匯出存檔代碼」得到的文字，選一個欄位匯入（會覆蓋該欄位）。', slots: [1, 2, 3].map((n) => ({ n, label: `存到欄位 ${n}` })), onImport: (n, code) => { const e = this.g.save.importCode(n, code); if (!e) { this.refreshTitle(); } return e; } }))); box.appendChild(imp);
    box.appendChild(h('div', 'note', this.mobile ? '點地面移動、點怪物攻擊；右下角按鈕開背包、技能、選單' : '點擊移動／攻擊　Alt+E 背包　Alt+A 能力值　Alt+S 技能　F1~F9 快捷列　M 世界地圖'));
    t.appendChild(box);
    this.root.appendChild(t);
  }
  audio() { this.g.audio?.unlock(); }
  /** 擊敗 Boss：「擊敗！」＋戰鬥時間（首殺、新紀錄會標出） */
  bossDown(name: string, time: string, first: boolean, record: boolean, best: string) {
    this.root.querySelector('#bossdown')?.remove();
    const el = h('div'); el.id = 'bossdown';
    el.innerHTML = `<div class="bd-t">擊敗！</div><div class="bd-n">${name}</div><div class="bd-time">戰鬥時間　${time}</div>` +
      (first ? '<div class="bd-tag">首殺獎勵</div>' : '') + (record ? '<div class="bd-tag rec">新的最快紀錄</div>' : best ? `<div class="bd-best">最快紀錄　${best}</div>` : '');
    this.root.appendChild(el);
    setTimeout(() => el.classList.add('out'), 3200); setTimeout(() => el.remove(), 3900);
  }
  /** 全螢幕寶物提示（傳說／Boss 專屬） */
  bigLoot(title: string, name: string, color: string) {
    const el = h('div'); el.id = 'bigloot'; el.style.setProperty('--rc', color);
    el.innerHTML = `<div class="bl-t">${title}</div><div class="bl-n">${name}</div>`;
    this.root.querySelector('#bigloot')?.remove();
    this.root.appendChild(el);
    setTimeout(() => el.classList.add('out'), 1700); setTimeout(() => el.remove(), 2300);
  }
  tutorialHint() {
    const t = this.g.inTitle ? null : this.g.tutorial.text();
    this.tut.style.display = t ? 'block' : 'none';
    if (!t) return;
    this.tut.innerHTML = '';
    this.tut.classList.toggle('folded', !!this.fold.tut);
    if (this.fold.tut) { const ic = h('span', 'tut-icon', '?'); this.tut.title = t; this.tut.onclick = () => this.setFold('tut', false); this.tut.append(ic); return; }
    this.tut.onclick = null;
    const mn = h('span', 'tut-x tut-min', '－'); mn.title = '縮成圖示'; mn.addEventListener('click', (e) => { e.stopPropagation(); this.setFold('tut', true); });
    this.tut.appendChild(mn);
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

export function isMobile() {
  return window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 820 || window.innerHeight < 500;
}
