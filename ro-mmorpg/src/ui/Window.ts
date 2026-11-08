import type { UI } from './UI';
let Z = 10;
/** RO 風格視窗：標題列拖曳、右上關閉、點擊時移到最上層、記住位置 */
export class Win {
  el: HTMLDivElement; body: HTMLDivElement; titleEl: HTMLDivElement; foot: HTMLDivElement | null = null;
  constructor(public ui: UI, public id: string, title: string, opt: { x: number; y: number; w?: number; foot?: boolean; closable?: boolean }) {
    const el = document.createElement('div');
    el.className = 'win hidden'; el.id = 'win-' + id;
    if (opt.w) el.style.width = opt.w + 'px';
    const saved = ui.winPos[id];
    el.style.left = (saved ? saved[0] : opt.x) + 'px'; el.style.top = (saved ? saved[1] : opt.y) + 'px';
    const t = document.createElement('div'); t.className = 'win-title'; t.textContent = ui.mobile ? title.replace(/（[^）]*(Alt|Esc|M)[^）]*）/, '') : title; el.appendChild(t); // 手機不顯示鍵盤快捷鍵
    if (opt.closable !== false) {
      const x = document.createElement('div'); x.className = 'win-x'; x.textContent = '×'; x.title = '關閉';
      x.addEventListener('pointerdown', (e) => e.stopPropagation());
      x.addEventListener('click', () => { this.close(); ui.sfx('close'); }); el.appendChild(x);
    }
    const b = document.createElement('div'); b.className = 'win-body'; el.appendChild(b);
    if (opt.foot) { this.foot = document.createElement('div'); this.foot.className = 'win-foot'; el.appendChild(this.foot); }
    this.el = el; this.body = b; this.titleEl = t;
    el.addEventListener('pointerdown', () => this.front());
    // 拖曳
    t.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
      const mv = (ev: PointerEvent) => {
        const nx = Math.max(-el.offsetWidth + 40, Math.min(window.innerWidth - 40, ox + ev.clientX - sx));
        const ny = Math.max(0, Math.min(window.innerHeight - 20, oy + ev.clientY - sy));
        el.style.left = nx + 'px'; el.style.top = ny + 'px';
      };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); ui.winPos[id] = [el.offsetLeft, el.offsetTop]; ui.savePrefs(); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
    ui.root.appendChild(el);
  }
  get isOpen() { return !this.el.classList.contains('hidden'); }
  setTitle(t: string) { this.titleEl.textContent = t; }
  open() {
    if (!this.isOpen) { this.el.classList.remove('hidden'); this.ui.sfx('open'); }
    this.front(); this.render();
    if (this.ui.mobile && this.id !== 'hud') { // 手機：視窗靠上置中、高度受限，收起基本資訊，讓角色附近保持可見
      this.ui.setFold('hud', true);
      this.ui.m?.close(); this.ui.m?.toggleMenu(false);
      const land = window.innerWidth > window.innerHeight;
      this.el.style.left = (land ? Math.max(6, 6) : Math.max(4, (window.innerWidth - this.el.offsetWidth) / 2)) + 'px';
      this.el.style.top = land ? '44px' : '44px';
    }
    this.keepInside();
  }
  close() { this.el.classList.add('hidden'); this.onClose(); }
  toggle() { this.isOpen ? (this.close(), this.ui.sfx('close')) : this.open(); }
  front() { this.el.style.zIndex = String(++Z); }
  keepInside() {
    const r = this.el.getBoundingClientRect();
    if (r.right > window.innerWidth) this.el.style.left = Math.max(0, window.innerWidth - r.width - 4) + 'px';
    if (r.bottom > window.innerHeight) this.el.style.top = Math.max(0, window.innerHeight - r.height - 4) + 'px';
  }
  render() {}
  onClose() {}
}
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}
export function btn(label: string, fn: () => void, cls = ''): HTMLSpanElement {
  const b = h('span', 'btn ' + cls, label); b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); return b;
}
/** 頁內確認框（不用瀏覽器的 confirm()，有些嵌入環境會直接回傳 false） */
export function ask(msg: string, onYes: () => void, opt: { yes?: string; danger?: boolean } = {}) {
  const wrap = h('div', 'ask-wrap'); const box = h('div', 'win ask-box');
  box.append(h('div', 'win-title', opt.danger ? '請再確認一次' : '確認'), h('div', 'win-body ask-msg', msg));
  const foot = h('div', 'win-foot');
  const born = performance.now();
  // 危險操作：取消在前、「確定」要等 1.2 秒才有效（避免連點、點錯位置時直接通過）
  const yes = btn(opt.yes || '確定', () => { if (opt.danger && performance.now() - born < 1200) return; wrap.remove(); onYes(); }, opt.danger ? 'warn' : '');
  if (opt.danger) { yes.classList.add('dis'); setTimeout(() => yes.classList.remove('dis'), 1200); }
  const no = btn('取消', () => wrap.remove());
  if (opt.danger) foot.append(no, yes); else foot.append(yes, no);
  box.appendChild(foot); wrap.appendChild(box);
  (document.getElementById('ui') || document.body).appendChild(wrap);
}

/** 存檔代碼視窗：匯出（顯示可複製的文字）或匯入（貼上文字、選欄位） */
export function codeBox(opt: { title: string; text?: string; hint: string; slots?: { n: number; label: string }[]; onImport?: (slot: number, code: string) => string | null }) {
  const wrap = h('div', 'ask-wrap'); const box = h('div', 'win ask-box'); box.style.width = 'min(420px, 92vw)';
  box.append(h('div', 'win-title', opt.title));
  const body = h('div', 'win-body ask-msg'); body.appendChild(h('div', 'dim', opt.hint));
  const ta = h('textarea', 'code-ta') as HTMLTextAreaElement; ta.id = 'code-text'; ta.value = opt.text || ''; ta.readOnly = !!opt.text; ta.rows = 5; ta.spellcheck = false;
  ta.addEventListener('keydown', (e) => e.stopPropagation()); body.appendChild(ta);
  let sel: HTMLSelectElement | null = null;
  if (opt.slots) { sel = h('select') as HTMLSelectElement; sel.id = 'code-slot'; for (const s of opt.slots) { const o = h('option', '', s.label) as HTMLOptionElement; o.value = String(s.n); sel.appendChild(o); } body.appendChild(sel); }
  const msg = h('div', 'code-msg'); body.appendChild(msg);
  box.appendChild(body);
  const foot = h('div', 'win-foot');
  if (opt.text) foot.appendChild(btn('複製', () => { ta.select(); let ok = false; try { navigator.clipboard.writeText(ta.value).then(() => { msg.textContent = '已複製。'; }, () => { msg.textContent = '請長按選取文字後複製。'; }); ok = true; } catch { /* */ } if (!ok) msg.textContent = '請長按選取文字後複製。'; }));
  if (opt.onImport) foot.appendChild(btn('匯入', () => { const e = opt.onImport!(+(sel?.value || 1), ta.value); if (e) { msg.textContent = e; msg.style.color = '#c0302a'; } else { wrap.remove(); } }));
  foot.appendChild(btn('關閉', () => wrap.remove()));
  box.appendChild(foot); wrap.appendChild(box);
  (document.getElementById('ui') || document.body).appendChild(wrap);
  if (!opt.text) setTimeout(() => ta.focus(), 50);
}
