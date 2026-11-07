import type { Game } from '../core/Game';
import type { KeyCombo } from '../core/Input';
import { Win, h } from './Window';
import { Hud } from './Hud';
import { Chat, MsgKind } from './Chat';
import { StatusWindow } from './StatusWindow';
import { Minimap } from './Minimap';
import { WorldMap } from './WorldMap';

/** UI 管理器：DOM 視窗、快捷鍵、訊息、橫幅 */
export class UI {
  winPos: Record<string, [number, number]> = {};
  wins: Record<string, Win> = {};
  hud: Hud; chat: Chat; mini: Minimap; world: WorldMap;
  banner: HTMLDivElement;
  private bannerT = 0;
  constructor(public g: Game, public root: HTMLElement) {
    try { this.winPos = JSON.parse(localStorage.getItem('rom.ui') || '{}'); } catch { this.winPos = {}; }
    const exp = h('div'); exp.id = 'expline'; exp.appendChild(h('i')); root.appendChild(exp);
    this.banner = h('div'); this.banner.id = 'banner'; root.appendChild(this.banner);
    this.hud = new Hud(this);
    this.chat = new Chat(this);
    this.add(new StatusWindow(this));
    this.mini = new Minimap(this);
    this.world = this.add(new WorldMap(this)) as WorldMap;
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
  onMap() { this.mini.onMap(); this.world.render(); }
  update(dt: number) {
    this.hud.update();
    this.mini.update(dt);
    this.world.update(dt);
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.banner.querySelector('.b')?.classList.remove('show'); }
  }
  /** 回傳 true 表示按鍵已被 UI 處理 */
  onKey(k: KeyCombo): boolean {
    const key = k.key.toLowerCase();
    if (k.alt) {
      const map: Record<string, string> = { a: 'status', e: 'inventory', q: 'equip', s: 'skills', u: 'quests' };
      if (map[key]) { this.toggle(map[key]); return true; }
    }
    if (k.key === 'Enter') { this.chat.focus(); return true; }
    if (k.key === 'Escape') {
      const open = Object.values(this.wins).filter((w) => w.isOpen).sort((a, b) => +b.el.style.zIndex - +a.el.style.zIndex);
      if (open.length) { open[0].close(); this.sfx('close'); } else this.toggle('options');
      return true;
    }
    if (key === 'm' && !k.alt && !k.ctrl) { this.toggle('worldmap'); return true; }
    return false;
  }
  command(t: string) {
    if (!t.startsWith('/')) { this.msg(`${this.g.player.ch.name}：${t}`, 'me'); return; }
    const [cmd, ...args] = t.slice(1).split(/\s+/);
    this.g.command(cmd, args);
  }
}
