import type { UI } from './UI';
import { Win, h } from './Window';
import { MAPS, DB } from '../data';
import { miniBase, mapData } from '../render/Minimap';

/** 世界地圖（M）：每張地圖的縮圖、連線、建議等級、MVP */
export class WorldMap extends Win {
  cv: HTMLCanvasElement; tip: HTMLDivElement;
  private nodes: { id: string; x: number; y: number; w: number; h: number }[] = [];
  private t = 0;
  constructor(ui: UI) {
    super(ui, 'worldmap', '世界地圖（M）', { x: 280, y: 80, w: 600 });
    this.cv = h('canvas'); this.cv.width = 584; this.cv.height = 400;
    this.tip = h('div', 'wm-tip');
    this.body.append(this.cv, this.tip);
    this.cv.addEventListener('pointermove', (e) => {
      const r = this.cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
      const n = this.nodes.find((n) => x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h);
      this.tip.innerHTML = n ? this.describe(n.id) : '把滑鼠移到地圖上查看資訊。';
    });
  }
  describe(id: string) {
    const d = DB.map[id];
    const lv = d.level ? `建議等級 Lv${d.level[0]}~${d.level[1]}` : '安全區域';
    const mons = (d.spawns || []).map((s) => DB.monster[s.m]?.name).filter(Boolean).join('、');
    const bt = (this.ui.g.flags.bossBest || {})[d.mvp?.m || ''];
    const mvp = d.mvp ? `　<b style="color:#c0302a">MVP：${DB.monster[d.mvp.m]?.name}</b>（${this.ui.g.mvpStatus(id)}${bt !== undefined ? '，最快擊殺 ' + Math.floor(bt / 60) + ':' + (bt % 60).toFixed(1).padStart(4, '0') : ''}）` : '';
    const mk = this.ui.g.guide.mapMarks()[id];
    const qtxt = mk ? `<br><b style="color:#b07a00">任務：${mk.bang ? `有 ${mk.bang} 位 NPC 有任務可接（頭上「!」）` : ''}${mk.bang && mk.ask ? '；' : ''}${mk.ask ? '有任務可以回報（頭上「?」）' : ''}</b>` : '';
    return `<b>${d.name}</b>　${lv}${mvp}${qtxt}<br><span class="dim">${mons ? '出沒：' + mons : d.type === 'town' ? '有商店、旅館、轉職官' : ''}</span>`;
  }
  render() {
    if (!this.isOpen) return;
    const c = this.cv.getContext('2d')!; c.imageSmoothingEnabled = false;
    c.fillStyle = '#e8dcb8'; c.fillRect(0, 0, this.cv.width, this.cv.height);
    // 羊皮紙紋理
    for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(120,90,40,${0.04 + (i % 5) * 0.01})`; c.fillRect((i * 97) % 584, (i * 53) % 400, 2, 1); }
    // 依地圖 pos 自動置中縮放到畫布內
    const xs = MAPS.filter((d) => !d.hidden).map((d) => d.pos[0]), ys = MAPS.filter((d) => !d.hidden).map((d) => d.pos[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const CX = Math.min(80, (this.cv.width - 140) / Math.max(1, maxX - minX)), CY = Math.min(64, (this.cv.height - 130) / Math.max(1, maxY - minY));
    const OX = (this.cv.width - (maxX - minX) * CX - 120) / 2, OY = 22 + (this.cv.height - 130 - (maxY - minY) * CY) / 2;
    const centers: Record<string, [number, number]> = {};
    this.nodes = [];
    for (const d of MAPS.filter((m) => !m.hidden)) {
      const m = mapData(d.id); const img = miniBase(m, 1);
      const x = OX + (d.pos[0] - minX) * CX + (120 - img.width) / 2, y = OY + (d.pos[1] - minY) * CY;
      centers[d.id] = [x + img.width / 2, y + img.height / 2];
      this.nodes.push({ id: d.id, x, y, w: img.width, h: img.height });
    }
    // 連線
    c.strokeStyle = 'rgba(120,80,40,.7)'; c.lineWidth = 2; c.setLineDash([5, 4]);
    for (const d of MAPS.filter((m) => !m.hidden)) for (const p of d.portals) {
      const a = centers[d.id], b = centers[p.to]; if (!a || !b || d.id > p.to) continue;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    c.setLineDash([]);
    const cur = this.ui.g.map.def.id;
    const plv = this.ui.g.player.ch.baseLv;
    const marks = this.ui.g.guide.mapMarks();
    for (const n of this.nodes) {
      const d = DB.map[n.id]; const img = miniBase(mapData(n.id), 1);
      c.drawImage(img, n.x, n.y);
      if (n.id === cur) { const k = Math.floor(performance.now() / 400) % 2; c.strokeStyle = k ? '#ff3030' : '#ffe040'; c.lineWidth = 2; c.strokeRect(n.x - 3, n.y - 3, n.w + 6, n.h + 6); }
      const mk = marks[n.id];
      if (mk) { // 這張地圖有任務 NPC：右上角的徽章（黃「!」可接、綠「?」可回報）
        const bx = n.x + n.w - 4, by = n.y + 2, ask = mk.ask > 0;
        c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(bx, by, 9, 0, Math.PI * 2); c.fill();
        c.fillStyle = ask ? '#50e070' : '#ffd830'; c.beginPath(); c.arc(bx, by, 7.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#3a2a1a'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ask ? '?' : '!', bx, by + 1);
      }
      c.font = 'bold 12px "Noto Sans TC", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top';
      const tx = n.x + n.w / 2, ty = n.y + n.h + 2;
      c.fillStyle = '#fff8e0'; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.fillText(d.name, tx + ox, ty + oy);
      c.fillStyle = '#3a2a1a'; c.fillText(d.name, tx, ty);
      if (d.level) {
        c.font = '11px sans-serif';
        c.fillStyle = plv < d.level[0] - 2 ? '#c0302a' : plv > d.level[1] + 3 ? '#8a8a8a' : '#2a7a2a';
        c.fillText(`Lv${d.level[0]}~${d.level[1]}`, tx, ty + 14);
      }
      if (d.mvp) {
        const cd = this.ui.g.spawner.countdown(d.id), bn = DB.monster[d.mvp.m]?.name || 'MVP';
        c.fillStyle = cd === null ? '#c0302a' : '#6a6a7a'; c.font = 'bold 11px sans-serif';
        c.fillText(cd === null ? `★${bn}` : `☆${bn} ${Math.floor(cd / 60)}:${String(cd % 60).padStart(2, '0')}`, tx, ty + (d.level ? 28 : 14));
      }
      if (n.id === cur) { c.fillStyle = '#c0302a'; c.font = 'bold 11px sans-serif'; c.fillText('你在這裡', tx, n.y - 14); }
    }
  }
  update(dt: number) { if (this.isOpen) { this.t += dt; if (this.t > 0.4) { this.t = 0; this.render(); } } }
}
