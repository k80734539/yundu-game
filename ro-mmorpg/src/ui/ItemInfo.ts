import type { UI } from './UI';
import { h } from './Window';
import { DB, ItemDef } from '../data';
import type { InvItem } from '../systems/Inventory';
import { iconURL } from '../render/IconArt';

const TYPE: Record<string, string> = { use: '消耗品', etc: '收集品', weapon: '武器', armor: '防具', card: '卡片' };
const WT: Record<string, string> = { dagger: '短劍', sword: '單手劍', staff: '法杖', bow: '弓' };
const SLOT: Record<string, string> = { head: '頭飾', armor: '鎧甲', shield: '盾牌', garment: '披風', shoes: '鞋子', acc: '飾品', weapon: '武器' };
const JOBN: Record<string, string> = { novice: '初心者', swordsman: '劍士', mage: '法師', archer: '弓箭手' };
/** 滑鼠移到道具上顯示的資訊卡 */
export class ItemInfo {
  el: HTMLDivElement;
  constructor(private ui: UI) { this.el = h('div'); this.el.id = 'iteminfo'; this.el.style.display = 'none'; ui.root.appendChild(this.el); }
  html(d: ItemDef, it?: InvItem): string {
    const lines: string[] = [];
    const name = (it?.refine ? `+${it.refine} ` : '') + d.name + (d.slots ? ` [${d.slots}]` : '');
    lines.push(`<div class="ii-head"><img src="${iconURL(d.icon.k, d.icon.c)}"><b>${name}</b></div>`);
    lines.push(`<div class="ii-desc">${d.desc}</div>`);
    const st: string[] = [`類型：${TYPE[d.type]}${d.wtype ? '（' + WT[d.wtype] + '）' : d.slot && d.type === 'armor' ? '（' + SLOT[d.slot] + '）' : ''}`];
    if (d.atk) st.push(`攻擊：${d.atk}${it?.refine ? ` <span class="g">+${it.refine * [2, 3, 5, 7][(d.wlv || 1) - 1]}</span>` : ''}`);
    if (d.wlv) st.push(`武器等級：${d.wlv}`);
    if (d.def !== undefined && d.type === 'armor') st.push(`防禦：${d.def}${it?.refine ? ` <span class="g">+${Math.floor(it.refine * 0.7 + 0.3)}</span>` : ''}`);
    if (d.matk) st.push(`MATK +${d.matk}%`);
    if (d.cardFor) st.push(`插入：${SLOT[d.cardFor]}`);
    if (d.heal) st.push(`恢復 HP：${d.heal}`); if (d.healSp) st.push(`恢復 SP：${d.healSp}`);
    st.push(`重量：${d.weight / 10}`);
    if (d.jobs && d.jobs.length < 4) st.push(`職業：${d.jobs.map((j) => JOBN[j]).join('、')}`);
    st.push(`價格：${d.price} Z（賣 ${Math.floor(d.price / 2)} Z）`);
    lines.push(`<div class="ii-st">${st.join('<br>')}</div>`);
    if (it && d.slots) {
      const cs = []; for (let i = 0; i < d.slots; i++) cs.push(it.cards[i] ? `<span class="card">${DB.item[it.cards[i]]?.name}</span>` : '<span class="dim">（空插槽）</span>');
      lines.push(`<div class="ii-st">${cs.join('<br>')}</div>`);
    }
    return lines.join('');
  }
  show(d: ItemDef, x: number, y: number, it?: InvItem) {
    this.el.innerHTML = this.html(d, it); this.el.style.display = 'block';
    const w = this.el.offsetWidth, hh = this.el.offsetHeight;
    this.el.style.left = Math.min(window.innerWidth - w - 4, x + 14) + 'px';
    this.el.style.top = Math.min(window.innerHeight - hh - 4, y + 10) + 'px';
  }
  hide() { this.el.style.display = 'none'; }
  private hideT = 0;
  bind(el: HTMLElement, get: () => [ItemDef, InvItem | undefined] | null) {
    if (this.ui.mobile) { // 觸控：點圖示顯示說明，3 秒後或再點一次收起
      el.addEventListener('click', (e) => { const r = get(); if (!r) return; e.stopPropagation(); if (this.el.style.display === 'block') { this.hide(); return; } this.show(r[0], e.clientX, e.clientY, r[1]); clearTimeout(this.hideT); this.hideT = window.setTimeout(() => this.hide(), 3000); });
      return;
    }
    el.addEventListener('pointerenter', (e) => { const r = get(); if (r) this.show(r[0], e.clientX, e.clientY, r[1]); });
    el.addEventListener('pointermove', (e) => { if (this.el.style.display === 'block') { this.el.style.left = Math.min(window.innerWidth - this.el.offsetWidth - 4, e.clientX + 14) + 'px'; this.el.style.top = Math.min(window.innerHeight - this.el.offsetHeight - 4, e.clientY + 10) + 'px'; } });
    el.addEventListener('pointerleave', () => this.hide());
    el.addEventListener('pointerdown', () => this.hide());
  }
}
