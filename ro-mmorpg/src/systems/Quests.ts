import type { Game } from '../core/Game';
import { DB, QUESTS, QuestDef } from '../data';
import { gainExp } from './Exp';

export interface QState { st: 'active' | 'done'; n: number }
/** 任務：接取、進度（擊殺計數、收集看背包數量）、回報獎勵 */
export class Quests {
  s: Record<string, QState> = {};
  constructor(private g: Game) {}
  def(id: string) { return DB.quest[id]; }
  isActive(id: string) { return this.s[id]?.st === 'active'; }
  isDone(id: string) { return this.s[id]?.st === 'done'; }
  canAccept(q: QuestDef) {
    const ch = this.g.player.ch;
    if (this.s[q.id]) return false;
    if (q.prev && !this.isDone(q.prev)) return false;
    if (q.reqLv && ch.baseLv < q.reqLv) return false;
    if (q.job && ch.job !== q.job) return false;
    return true;
  }
  progress(q: QuestDef) { return q.type === 'collect' ? Math.min(q.count, this.g.inv.count(q.target)) : Math.min(q.count, this.s[q.id]?.n || 0); }
  complete(q: QuestDef) { return this.isActive(q.id) && this.progress(q) >= q.count; }
  forNpc(npc: string) {
    const list = QUESTS.filter((q) => q.npc === npc);
    return { avail: list.filter((q) => this.canAccept(q)), active: list.filter((q) => this.isActive(q.id)), locked: list.filter((q) => !this.s[q.id] && !this.canAccept(q)) };
  }
  /** NPC 頭上標記：'?' 可回報、'!' 可接取 */
  mark(npc: string): '' | '!' | '?' {
    const f = this.forNpc(npc);
    if (f.active.some((q) => this.complete(q))) return '?';
    if (f.avail.length) return '!';
    return '';
  }
  accept(id: string) {
    const q = this.def(id); if (!q || !this.canAccept(q)) return;
    this.s[id] = { st: 'active', n: 0 };
    this.g.msg(`接受任務：${q.name}`, 'quest');
    this.g.audio?.sfx('quest');
    this.g.ev.emit('quest');
  }
  turnIn(id: string): boolean {
    const q = this.def(id); if (!q || !this.complete(q)) return false;
    if (q.type === 'collect' && q.consume !== false) this.g.inv.removeId(q.target, q.count);
    this.s[id] = { st: 'done', n: q.count };
    const r = q.reward;
    this.g.msg(`完成任務：${q.name}！`, 'quest');
    if (r.zeny) { this.g.player.ch.zeny += r.zeny; this.g.msg(`獲得 ${r.zeny} Zeny`, 'item'); }
    for (const [it, n] of r.items || []) { if (this.g.inv.add(it, n)) this.g.msg(`獲得 ${DB.item[it].name} ×${n}`, 'item'); else this.g.msg(`負重已滿，${DB.item[it].name} 掉在地上了`, 'warn'); }
    gainExp(this.g, r.exp || 0, r.jexp || 0);
    this.g.audio?.sfx('questdone');
    this.g.fx.dmg(this.g.player.x, this.g.player.y, 'CLEAR', 'skill', 150);
    this.g.ev.emit('quest'); this.g.ev.emit('stats');
    return true;
  }
  abandon(id: string) { if (this.isActive(id)) { delete this.s[id]; this.g.msg(`放棄任務：${this.def(id).name}`, 'warn'); this.g.ev.emit('quest'); } }
  onKill(mid: string) {
    for (const [id, st] of Object.entries(this.s)) {
      if (st.st !== 'active') continue;
      const q = this.def(id);
      if (q.type !== 'kill' || q.target !== mid || st.n >= q.count) continue;
      st.n++;
      this.g.msg(`[${q.name}] ${DB.monster[mid].name} ${st.n}/${q.count}`, 'quest');
      if (st.n >= q.count) this.g.msg(`[${q.name}] 目標達成！回去找 ${DB.npc[q.npc].name} 回報。`, 'quest');
      this.g.ev.emit('quest');
    }
  }
  onPickup(item: string) {
    for (const [id, st] of Object.entries(this.s)) {
      if (st.st !== 'active') continue;
      const q = this.def(id);
      if (q.type !== 'collect' || q.target !== item) continue;
      const n = this.progress(q);
      if (n <= q.count) this.g.msg(`[${q.name}] ${DB.item[item].name} ${n}/${q.count}`, 'quest');
      this.g.ev.emit('quest');
    }
  }
  activeList() { return Object.entries(this.s).filter(([, v]) => v.st === 'active').map(([k]) => this.def(k)).filter(Boolean); }
}
