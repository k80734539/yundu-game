import type { Renderer } from '../render/Renderer';
export interface KeyCombo { key: string; code: string; alt: boolean; ctrl: boolean; shift: boolean }
/** 輸入：滑鼠／觸控（pointer events）與鍵盤 */
export class Input {
  mx = -1; my = -1;          // 邏輯像素
  down = false;
  downT = 0;
  over = false;
  keys = new Set<string>();
  private clickQ: { x: number; y: number; button: number }[] = [];
  private keyQ: KeyCombo[] = [];
  wheel = 0;
  constructor(private canvas: HTMLCanvasElement, private r: Renderer) {
    const pos = (e: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mx = ((e.clientX - rect.left) * r.dpr) / r.scale;
      this.my = ((e.clientY - rect.top) * r.dpr) / r.scale;
    };
    canvas.addEventListener('pointermove', (e) => { pos(e); this.over = true; });
    canvas.addEventListener('pointerleave', () => { this.over = false; });
    canvas.addEventListener('pointerdown', (e) => {
      pos(e);
      (document.activeElement as HTMLElement | null)?.blur?.();
      if (e.button === 0) { this.down = true; this.downT = 0; }
      this.clickQ.push({ x: this.mx, y: this.my, button: e.button });
      canvas.setPointerCapture?.(e.pointerId);
    });
    window.addEventListener('pointerup', () => { this.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
      if (typing && !/^F[1-9]$/.test(e.key)) return; // 聊天輸入中仍可用 F1~F9（RO 也是）
      // 阻止瀏覽器預設（F1 說明、F5 重新整理、Alt 選單）
      if (/^F[1-9]$/.test(e.key) || (e.altKey && e.key !== 'Alt') || e.key === 'Insert' || e.key === 'Tab') e.preventDefault();
      if (e.key === 'Alt') e.preventDefault();
      this.keys.add(e.code);
      this.keyQ.push({ key: e.key, code: e.code, alt: e.altKey, ctrl: e.ctrlKey, shift: e.shiftKey });
    }, true); // capture：聊天框 stopPropagation 也收得到 F1~F9
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); if (e.key === 'Alt') e.preventDefault(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.down = false; });
  }
  takeClicks() { const q = this.clickQ; this.clickQ = []; return q; }
  takeKeys() { const q = this.keyQ; this.keyQ = []; return q; }
  takeWheel() { const w = this.wheel; this.wheel = 0; return w; }
}
