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
    const pf = h('span', 'seg');
    for (const [k, l, tip] of [['smooth', '流暢', '一律 60 幀'], ['auto', '自動', '移動戰鬥時 60 幀，站著不動時降到 30 幀'], ['saver', '省電', '一律 30 幀，手機最不燙']] as const) {
      const b = btn(l, () => { g.setPerf(k); this.render(); }, 'sm' + (g.perf === k ? ' on' : '')); b.title = tip; pf.appendChild(b);
    }
    row('畫面更新', pf);
    const rs = h('span', 'seg');
    for (const [low, l, tip] of [[false, '標準', '用螢幕原生解析度繪製（最清晰）'], [true, '省電', '用較低解析度繪製再放大，手機比較不燙；文字會比較粗']] as const) {
      const b = btn(l, () => { g.r.setLow(low); try { localStorage.setItem('rom.res', low ? 'low' : 'high'); } catch { /* */ } this.render(); }, 'sm' + (g.r.low === low ? ' on' : '')); b.title = tip; rs.appendChild(b);
    }
    row('畫質', rs);
    const at = g.atmos, seg = (items: [string, string, () => boolean, () => void][]) => { const s = h('span', 'seg'); for (const [l, tip, isOn, fn] of items) { const b = btn(l, () => { fn(); this.render(); }, 'sm' + (isOn() ? ' on' : '')); b.title = tip; s.appendChild(b); } return s; };
    row('光影效果', seg([['開', '時間色調、路燈與火光、光暈、光束、落葉與螢火蟲', () => at.cfg.on, () => at.set('on', true as never)], ['關', '回到原本的畫面', () => !at.cfg.on, () => at.set('on', false as never)]]));
    row('景深模糊', seg([['開', '畫面上下緣模糊，像微縮模型（省電畫質時自動關閉）', () => at.cfg.tilt, () => at.set('tilt', true as never)], ['關', '', () => !at.cfg.tilt, () => at.set('tilt', false as never)]]));
    row('時間', seg([['流動', '現實 1 分鐘＝遊戲 1 小時，會有黃昏和夜晚', () => at.cfg.time === 'flow', () => at.set('time', 'flow' as never)], ['固定白天', '', () => at.cfg.time === 'day', () => at.set('time', 'day' as never)]]));
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
