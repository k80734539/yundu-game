import { h } from './Window';
export interface DragData { type: 'item' | 'skill'; id: string; uid?: number; icon: string }
/** 自製拖曳（滑鼠、觸控都能用）：拖出 4px 才開始；放開時回報落點元素 */
export function makeDraggable(el: HTMLElement, data: () => DragData | null, onDrop: (target: Element | null, d: DragData, ev: PointerEvent) => void) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY;
    let ghost: HTMLImageElement | null = null; let d: DragData | null = null;
    const mv = (ev: PointerEvent) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        d = data(); if (!d) return;
        ghost = h('img', 'drag-ghost') as HTMLImageElement; ghost.src = d.icon; document.body.appendChild(ghost);
      }
      ghost.style.left = ev.clientX - 12 + 'px'; ghost.style.top = ev.clientY - 12 + 'px';
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      if (ghost && d) { ghost.remove(); onDrop(document.elementFromPoint(ev.clientX, ev.clientY), d, ev); (el as any).__dragged = performance.now(); }
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
}
export const justDragged = (el: HTMLElement) => performance.now() - ((el as any).__dragged || 0) < 200;
