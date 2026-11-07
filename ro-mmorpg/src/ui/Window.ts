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
    const t = document.createElement('div'); t.className = 'win-title'; t.textContent = title; el.appendChild(t);
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
    this.front(); this.render(); this.keepInside();
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
