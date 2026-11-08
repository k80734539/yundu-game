import type { UI } from './UI';
import { Win, h, btn, ask, codeBox } from './Window';

/** 設定（Esc）：縮放、音量（階段 9）、存檔、重新開始 */
export class OptionsWindow extends Win {
  constructor(ui: UI) { super(ui, 'options', '設定（Esc）', { x: 420, y: 120, w: 280 }); }
  render() {
    if (!this.isOpen) return;
    const g = this.ui.g;
    this.body.innerHTML = '';
    const row = (label: string, el: HTMLElement) => { const r = h('div', 'opt-row'); r.append(h('span', 'lbl', label), el); this.body.appendChild(r); };
    const zoom = h('span');
    zoom.append(btn('－', () => { g.r.setZoom(g.r.zoomBias - 1); this.render(); }, 'sm'), h('span', 'val', ` ${g.r.scale}x `), btn('＋', () => { g.r.setZoom(g.r.zoomBias + 1); this.render(); }, 'sm'));
    row('畫面縮放', zoom);
    if (g.audio) {
      for (const [k, l] of [['master', '主音量'], ['bgm', '背景音樂'], ['sfx', '音效']] as const) {
        const s = h('input') as HTMLInputElement; s.type = 'range'; s.min = '0'; s.max = '100'; s.value = String(Math.round(g.audio.vol[k] * 100)); s.className = 'opt-range';
        s.addEventListener('input', () => { g.audio.setVol(k, +s.value / 100); });
        row(l, s);
      }
    }
    const nm = h('span', 'val', g.player.ch.name); row('角色', nm);
    const st = g.save.statusText(); const sd = h('div', 'save-status ' + st.level, st.text); this.body.appendChild(sd);
    const bar = h('div', 'opt-btns');
    bar.append(btn('存檔', () => { g.save?.save(true); }), btn('回到角色選擇', () => { ask('存檔並回到角色選擇畫面？', () => g.save.toTitle()); }));
    this.body.appendChild(bar);
    const bar2 = h('div', 'opt-btns');
    bar2.append(btn('匯出存檔代碼', () => { g.save.save(); const c = g.save.exportCode(g.save.slot); codeBox({ title: '匯出存檔代碼', text: c || '', hint: '把這串文字複製起來，貼到別的瀏覽器或手機的「匯入存檔代碼」就能接著玩。' }); }));
    this.body.appendChild(bar2);
    this.body.appendChild(h('div', 'dim hint', '遊戲每 30 秒與換地圖時自動存檔。'));
  }
}
