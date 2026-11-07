import type { Game } from '../core/Game';
import type { Monster } from '../entities/Monster';
import { DB, MAPS } from '../data';
import { dist } from '../core/math';

export interface MvpState { alive: boolean; nextAt: number }
/** 出怪與重生、MVP 計時（以真實時間計，存檔保存），全服公告 */
export class Spawner {
  mvp: Record<string, MvpState> = {};
  private q: { m: string; t: number }[] = [];
  private tickT = 0;
  constructor(private g: Game) {}
  /** 讀檔／新遊戲時呼叫；沒有記錄的 MVP 直接出現（第一次進遊戲） */
  init(saved?: Record<string, MvpState>) {
    this.mvp = {};
    for (const d of MAPS) if (d.mvp) this.mvp[d.id] = saved?.[d.id] ? { ...saved[d.id] } : { alive: true, nextAt: 0 };
  }
  announceAlive() {
    for (const d of MAPS) if (d.mvp && this.mvp[d.id]?.alive) this.g.announce(`【公告】MVP「${DB.monster[d.mvp.m].name}」正在 ${d.name} 遊蕩！`);
  }
  onMapLoad() {
    this.q = [];
    const def = this.g.map.def;
    for (const s of def.spawns || []) for (let i = 0; i < s.n; i++) this.spawnAway(s.m, 0);
    if (def.mvp && this.mvp[def.id]?.alive) this.spawnMvp();
  }
  spawnMvp() {
    const def = this.g.map.def; if (!def.mvp) return;
    if (this.g.monsters.some((m) => m.isMvp && !m.dead)) return;
    const m = this.g.spawnMonster(def.mvp.m, [def.mvp.x, def.mvp.y]);
    if (m) { m.homeX = def.mvp.x + 0.5; m.homeY = def.mvp.y + 0.5; }
  }
  /** 盡量離玩家 minD 格以外重生 */
  spawnAway(id: string, minD = 8): Monster | null {
    const g = this.g, p = g.player;
    for (let i = 0; i < 30; i++) {
      const pos = g.map.randomWalkable(g.rnd);
      if (!pos) break;
      if (minD && dist(pos[0], pos[1], p.x, p.y) < minD && i < 25) continue;
      if (g.map.def.portals.some((po) => dist(po.x, po.y, pos[0], pos[1]) < 4)) continue;
      return g.spawnMonster(id, pos);
    }
    return null;
  }
  onKill(m: Monster) {
    const g = this.g;
    if (m.isMvp) {
      const d = g.map.def;
      this.mvp[d.id] = { alive: false, nextAt: Date.now() + (d.mvp?.respawn || 600) * 1000 };
      g.announce(`【公告】${g.player.ch.name} 擊敗了 MVP「${m.def.name}」！`);
      g.save?.saveSoon();
      return;
    }
    if (m.summoned) return;
    this.q.push({ m: m.def.id, t: 5 + g.rnd() * 6 });
  }
  update(dt: number) {
    for (const e of this.q) e.t -= dt;
    const ready = this.q.filter((e) => e.t <= 0);
    if (ready.length) { this.q = this.q.filter((e) => e.t > 0); for (const e of ready) this.spawnAway(e.m); }
    this.tickT += dt;
    if (this.tickT < 1) return;
    this.tickT = 0;
    const now = Date.now();
    for (const d of MAPS) {
      const st = this.mvp[d.id]; if (!st || st.alive || now < st.nextAt) continue;
      st.alive = true;
      this.g.announce(`【公告】MVP「${DB.monster[d.mvp!.m].name}」在 ${d.name} 出現了！`);
      if (this.g.map.def.id === d.id) this.spawnMvp();
      this.g.save?.saveSoon();
    }
  }
  status(id: string) {
    const st = this.mvp[id]; if (!st) return '—';
    if (st.alive) return '存活中';
    const s = Math.max(0, Math.ceil((st.nextAt - Date.now()) / 1000));
    return `約 ${Math.floor(s / 60)} 分 ${s % 60} 秒後重生`;
  }
}
