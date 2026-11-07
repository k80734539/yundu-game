import type { UI } from './UI';
import { Win, h, btn, ask } from './Window';
import { DB } from '../data';
import { iconURL } from '../render/IconArt';
import { refineRate, refineMaterial, refineFee, safeLimit } from '../systems/Refine';

/** 精煉（精煉師）：選裝備 → 顯示成功率、材料、費用 → 精煉 */
export class RefineWindow extends Win {
  constructor(ui: UI) { super(ui, 'refine', '精煉', { x: 320, y: 110, w: 330, foot: true }); ui.g.ev.on('inv', () => this.render()); }
  render() {
    if (!this.isOpen) return;
    const g = this.ui.g, inv = g.inv;
    this.body.innerHTML = '';
    const list = inv.items.filter((it) => { const d = DB.item[it.id]; return d.type === 'weapon' || d.type === 'armor'; });
    if (!list.length) this.body.appendChild(h('div', 'dim', '背包裡沒有可以精煉的裝備。'));
    for (const it of list) {
      const d = DB.item[it.id];
      const r = h('div', 'shop-row');
      const img = h('img') as HTMLImageElement; img.src = iconURL(d.icon.k, d.icon.c);
      const max = it.refine >= 10;
      const rate = max ? 0 : refineRate(d, it.refine);
      const mat = refineMaterial(d), fee = refineFee(d);
      const nm = h('div', 'shop-name'); nm.innerHTML = `${inv.displayName(it)}${inv.isEquipped(it.uid) ? ' <span class="dim">(裝備中)</span>' : ''}<br><span class="sk-desc">${max ? '已達 +10' : `+${it.refine + 1}：成功率 <b style="color:${rate === 100 ? '#2a8a3a' : rate >= 50 ? '#b07a10' : '#c0302a'}">${rate}%</b>　${DB.item[mat].name}×1（有 ${inv.count(mat)}）＋${fee}Z`}</span>`;
      const can = !max && inv.count(mat) > 0 && g.player.ch.zeny >= fee;
      r.append(img, nm, btn('精煉', () => { if (rate < 100) ask(`超過安全值（+${safeLimit(d)}），失敗會損毀裝備！確定精煉嗎？`, () => g.refine(it.uid)); else g.refine(it.uid); }, can ? '' : 'dis'));
      this.ui.info.bind(img, () => [d, it]);
      this.body.appendChild(r);
    }
    this.foot!.innerHTML = '';
    this.foot!.append(h('span', 'dim', '武器用鍛造礦石、防具用強化礦石。'), h('span', 'val', `${g.player.ch.zeny.toLocaleString()} Z`));
  }
}
export class CardWindow extends Win {
  card: number | null = null;
  constructor(ui: UI) { super(ui, 'cards', '插入卡片', { x: 340, y: 130, w: 320 }); ui.g.ev.on('inv', () => this.render()); }
  render() {
    if (!this.isOpen) return;
    const g = this.ui.g, inv = g.inv;
    this.body.innerHTML = '';
    const cards = inv.items.filter((it) => DB.item[it.id].type === 'card');
    if (!cards.length) { this.body.appendChild(h('div', 'dim', '背包裡沒有卡片。打倒怪物有機會掉落卡片！')); return; }
    if (this.card === null || !inv.get(this.card)) this.card = cards[0].uid;
    const sel = h('div', 'card-sel');
    for (const c of cards) {
      const d = DB.item[c.id];
      const b = h('div', 'card-opt' + (c.uid === this.card ? ' on' : '')); const img = h('img') as HTMLImageElement; img.src = iconURL(d.icon.k, d.icon.c);
      b.append(img, h('span', '', d.name + (c.n > 1 ? ` ×${c.n}` : ''))); b.addEventListener('click', () => { this.card = c.uid; this.render(); });
      this.ui.info.bind(b, () => [d, c]);
      sel.appendChild(b);
    }
    this.body.appendChild(sel);
    const cd = DB.item[inv.get(this.card)!.id];
    this.body.appendChild(h('div', 'lbl', `可插入：${cd.desc.split('。')[0]}`));
    const targets = inv.items.filter((it) => {
      const d = DB.item[it.id];
      if (d.type !== 'weapon' && d.type !== 'armor') return false;
      const slot = d.slot === 'acc' ? 'acc' : d.slot;
      return slot === cd.cardFor && (d.slots || 0) > it.cards.length && !inv.isEquipped(it.uid);
    });
    if (!targets.length) this.body.appendChild(h('div', 'dim', '沒有可插入的裝備（需要有空插槽、且未裝備中）。'));
    for (const it of targets) {
      const d = DB.item[it.id];
      const r = h('div', 'shop-row'); const img = h('img') as HTMLImageElement; img.src = iconURL(d.icon.k, d.icon.c);
      r.append(img, h('div', 'shop-name', `${inv.displayName(it)}（空插槽 ${(d.slots || 0) - it.cards.length}）`), btn('插入', () => { const cu = this.card!; ask('卡片插入後無法取出，確定嗎？', () => g.insertCard(cu, it.uid)); }));
      this.body.appendChild(r);
    }
  }
}
