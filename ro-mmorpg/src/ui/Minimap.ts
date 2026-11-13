import type { UI } from './UI';
import { h } from './Window';
import { miniBase, miniPos, MK } from '../render/Minimap';

/** 右上小地圖（DOM + canvas，像素放大） */
export class Minimap {
  el: HTMLDivElement; boss: HTMLDivElement; cv: HTMLCanvasElement; title: HTMLDivElement; coord: HTMLSpanElement;
  private t = 0;
  constructor(private ui: UI) {
    this.el = h('div'); this.el.id = 'minimap';
    const head = h('div', 'mm-head'); head.appendChild(h('span', 'fold-ic')); this.title = h('div', 'mm-name'); this.coord = h('span', 'mm-xy'); head.append(this.title, this.coord);
    this.boss = h('div', 'mm-boss'); this.boss.style.display = 'none';
    this.cv = h('canvas'); this.el.append(head, this.boss, this.cv);
    head.title = '點擊收合／展開小地圖';
    head.addEventListener('click', () => ui.setFold('mini', !ui.fold.mini, this.el));
    ui.root.appendChild(this.el);
  }
  onMap() {
    const m = this.ui.g.map;
    const base = miniBase(m);
    this.cv.width = base.width; this.cv.height = base.height;
    const lv = m.def.level ? `　Lv${m.def.level[0]}~${m.def.level[1]}` : '';
    this.title.textContent = m.def.name + lv;
    this.draw();
  }
  /** 這張地圖的 Boss 重生倒數 */
  private bossText() {
    const g = this.ui.g, d = g.map.def; if (!d.mvp) return '';
    const s = g.spawner.countdown(d.id); if (s === null) return '';
    return `Boss 重生 ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  update(dt: number) { this.t += dt; if (this.t >= 0.1) {
    const bt = this.bossText(); this.boss.style.display = bt ? 'block' : 'none'; if (bt) this.boss.textContent = bt; this.t = 0; if (!this.ui.fold.mini) this.draw(); else this.coord.textContent = `${Math.floor(this.ui.g.player.x)}, ${Math.floor(this.ui.g.player.y)}`; } }
  draw() {
    const g = this.ui.g, m = g.map, c = this.cv.getContext('2d')!;
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.drawImage(miniBase(m), 0, 0);
    const dot = (x: number, y: number, col: string, r = 2, outline = '#000') => {
      const [px, py] = miniPos(m, x, y); const X = Math.round(px) + 2, Y = Math.round(py) + 2;
      c.fillStyle = outline; c.fillRect(X - r - 1, Y - r - 1, r * 2 + 2, r * 2 + 2);
      c.fillStyle = col; c.fillRect(X - r, Y - r, r * 2, r * 2);
    };
    for (const p of m.def.portals) dot(p.x + 0.5, p.y + 0.5, '#ff6ad0', 2);
    const blink = Math.floor(performance.now() / 300) % 2 === 0;
    for (const n of g.npcs) {
      const main = g.story.wantsNpc(n.def.id), mk = main ? '!' : g.quests.mark(n.def.id);
      if (!mk) { dot(n.x, n.y, '#40e070', 1.5); continue; }
      // 有任務的 NPC：黃色「!」（可接）或綠色「?」（可回報），閃爍
      const [px, py] = miniPos(m, n.x, n.y); const X = Math.round(px) + 2, Y = Math.round(py) + 2, col = main ? '#ff9a20' : mk === '!' ? '#ffd830' : '#50ff70';
      c.fillStyle = '#000'; c.fillRect(X - 4, Y - 7, 8, 12); c.fillStyle = blink ? col : '#ffffff'; c.fillRect(X - 3, Y - 6, 6, 10);
      c.fillStyle = '#000';
      if (mk === '!') { c.fillRect(X - 1, Y - 5, 2, 5); c.fillRect(X - 1, Y + 1, 2, 2); } else { c.fillRect(X - 2, Y - 5, 4, 1); c.fillRect(X + 1, Y - 4, 1, 2); c.fillRect(X - 1, Y - 2, 2, 1); c.fillRect(X - 1, Y, 1, 1); c.fillRect(X - 1, Y + 2, 1, 1); }
    }
    { const sp = g.story.spotHere(); if (sp) { const [px, py] = miniPos(m, sp.x! + 0.5, sp.y! + 0.5); const X = Math.round(px) + 2, Y = Math.round(py) + 2; c.fillStyle = '#000'; c.fillRect(X - 4, Y - 4, 8, 8); c.fillStyle = blink ? '#ff9a20' : '#fff2b0'; c.fillRect(X - 3, Y - 3, 6, 6); } } // 主線調查點
    for (const mv of g.monsters) if (mv.isMvp && !mv.dead) { // MVP 標記
      const [px, py] = miniPos(m, mv.x, mv.y); const X = Math.round(px) + 2, Y = Math.round(py) + 2;
      c.fillStyle = '#000'; c.fillRect(X - 5, Y - 5, 10, 10); c.fillStyle = blink ? '#ff3030' : '#ffd040'; c.fillRect(X - 4, Y - 4, 8, 8);
      c.fillStyle = '#000'; c.fillRect(X - 2, Y - 2, 1, 2); c.fillRect(X + 1, Y - 2, 1, 2); c.fillRect(X - 2, Y + 2, 4, 1);
    }
    dot(g.player.x, g.player.y, blink ? '#ffffff' : '#ffe040', 2);
    this.coord.textContent = `${Math.floor(g.player.x)}, ${Math.floor(g.player.y)}`;
  }
}
export { MK };
