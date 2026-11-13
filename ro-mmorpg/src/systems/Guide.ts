import { DB, MAPS, QUESTS, QuestDef } from '../data';
import { Monster } from '../entities/Monster';
import type { Game } from '../core/Game';

export interface GuideTarget {
  text: string;            // 顯示在任務追蹤下方的一行說明
  sub?: string;            // 補充（路線）
  x: number; y: number;    // 箭頭指向的世界座標（格）；null 時不畫箭頭
  arrow: boolean;
  main?: boolean;           // 主線（金色）
}

/** 任務引導：告訴玩家「下一步要去哪裡、找誰」，並提供畫面上的方向箭頭 */
export class Guide {
  private cache: GuideTarget | null = null; private t = 99; private key = '';
  constructor(private g: Game) {}
  private mapName(id: string) { return DB.map[id]?.name || id; }
  /** 這個 NPC 站在哪張地圖、哪個座標 */
  npcAt(npc: string): { map: string; x: number; y: number } | null {
    for (const m of MAPS) { const n = (m.npcs || []).find((o) => o.id === npc); if (n) return { map: m.id, x: n.x + 0.5, y: n.y + 0.5 }; }
    return null;
  }
  /** 哪些地圖有這種怪（含 MVP） */
  monsterMaps(mon: string): string[] {
    return MAPS.filter((m) => (m.spawns || []).some((s) => s.m === mon) || m.mvp?.m === mon).map((m) => m.id);
  }
  /** 哪些地圖的怪會掉這個道具 */
  itemMaps(item: string): { maps: string[]; mons: string[] } {
    const mons = Object.values(DB.monster).filter((m) => m.drops.some((d) => d.item === item)).map((m) => m.id);
    const maps = new Set<string>(); for (const mo of mons) for (const mp of this.monsterMaps(mo)) maps.add(mp);
    return { maps: [...maps], mons };
  }
  /** 從 from 走到 to 的地圖路線（BFS，經由傳送點），回傳地圖 id 陣列（含起終點） */
  route(from: string, to: string): string[] | null {
    if (from === to) return [from];
    const prev: Record<string, string> = { [from]: '' }, q = [from];
    while (q.length) {
      const cur = q.shift()!;
      for (const p of DB.map[cur]?.portals || []) {
        if (prev[p.to] !== undefined || DB.map[p.to]?.hidden) continue;
        prev[p.to] = cur; if (p.to === to) { const r = [to]; let c = to; while (prev[c]) { c = prev[c]; r.unshift(c); } return r; }
        q.push(p.to);
      }
    }
    return null;
  }
  /** 往目標地圖的下一步：回傳該傳送點座標與下一張地圖 */
  private hop(to: string): { x: number; y: number; next: string; route: string[] } | null {
    const cur = this.g.map.def.id, r = this.route(cur, to); if (!r || r.length < 2) return null;
    const p = DB.map[cur].portals.find((o) => o.to === r[1]); if (!p) return null;
    return { x: p.x + 0.5, y: p.y + 0.5, next: r[1], route: r };
  }
  private routeText(r: string[]) { return r.map((m) => this.mapName(m)).join(' → '); }
  /** 每張地圖上有幾個「!」（可接）和「?」（可回報）的任務 NPC，世界地圖用 */
  mapMarks(): Record<string, { bang: number; ask: number }> {
    const out: Record<string, { bang: number; ask: number }> = {}, seen = new Set<string>();
    for (const q of QUESTS) {
      if (seen.has(q.npc)) continue; seen.add(q.npc);
      const mk = this.g.story.wantsNpc(q.npc) ? '!' : this.g.quests.mark(q.npc); if (!mk) continue;
      const at = this.npcAt(q.npc); if (!at) continue;
      const o = (out[at.map] ||= { bang: 0, ask: 0 }); if (mk === '!') o.bang++; else o.ask++;
    }
    return out;
  }
  /** 某個任務的接取／回報 NPC 在哪（「名字（地圖）」） */
  whereNpc(npc: string) { const at = this.npcAt(npc); return `${DB.npc[npc]?.name || npc}${at ? `（${this.mapName(at.map)}）` : ''}`; }
  /** 主線的下一步（等級還沒到就回傳 null，留給支線） */
  mainTarget(): GuideTarget | null {
    const g = this.g, t = g.story.target(), cur = g.map.def.id; if (!t || t.wait) return null;
    const go = (map: string, x: number, y: number): GuideTarget => {
      if (map === cur) return { text: t.text, sub: '就在這張地圖', x, y, arrow: true, main: true };
      const h = this.hop(map);
      return { text: t.text, sub: `去 ${this.mapName(map)}` + (h ? '　路線：' + this.routeText(h.route) : ''), x: h?.x ?? 0, y: h?.y ?? 0, arrow: !!h, main: true };
    };
    if (t.npc) { const at = this.npcAt(t.npc); if (at) return go(at.map, at.x, at.y); }
    if (t.map && t.x !== undefined) return go(t.map, t.x, t.y!);
    if (t.mon) {
      const maps = this.monsterMaps(t.mon);
      if (maps.includes(cur)) {
        const m = g.monsters.find((o: Monster) => !o.dead && o.def.id === t.mon);
        const mv = DB.map[cur].mvp;
        const x = m?.x ?? (mv ? mv.x + 0.5 : g.player.x), y = m?.y ?? (mv ? mv.y + 0.5 : g.player.y);
        return { text: t.text, sub: m ? '就在這張地圖' : `就在這張地圖（${g.mvpStatus(t.mon) || '等牠出現'}）`, x, y, arrow: !!(m || mv), main: true };
      }
      const r = maps.map((mp) => this.route(cur, mp)).filter((x): x is string[] => !!x).sort((a, b) => a.length - b.length)[0];
      if (r) return go(r[r.length - 1], 0, 0);
    }
    if (t.map) return go(t.map, g.player.x, g.player.y);
    return { text: t.text, x: 0, y: 0, arrow: false, main: true };
  }
  /** 玩家目前最該做的事 */
  compute(): GuideTarget | null {
    const g = this.g, qs = g.quests, cur = g.map.def.id;
    const mainT = !g.flags.guidePin ? this.mainTarget() : null; if (mainT) return mainT;
    const active = QUESTS.filter((q) => qs.isActive(q.id));
    const ready = active.find((q) => qs.complete(q));
    const toNpc = (q: QuestDef, verb: string): GuideTarget | null => {
      const at = this.npcAt(q.npc), nm = DB.npc[q.npc]?.name || q.npc; if (!at) return null;
      if (at.map === cur) return { text: `${verb}「${q.name}」→ ${nm}`, sub: '就在這張地圖', x: at.x, y: at.y, arrow: true };
      const h = this.hop(at.map);
      return { text: `${verb}「${q.name}」→ ${nm}（${this.mapName(at.map)}）`, sub: h ? '路線：' + this.routeText(h.route) : undefined, x: h?.x ?? 0, y: h?.y ?? 0, arrow: !!h };
    };
    if (ready) return toNpc(ready, '回報');
    const pin = g.flags.guidePin && DB.quest[g.flags.guidePin];                           // 玩家在任務視窗按了「追蹤」的可接任務
    if (pin) { if (qs.canAccept(pin)) return toNpc(pin, '前往接取'); g.flags.guidePin = null; }
    // 進行中的任務：去哪裡打／收集
    for (const q of active) {
      let maps: string[] = [], mons: string[] = [];
      if (q.type === 'kill') { maps = this.monsterMaps(q.target); mons = [q.target]; }
      else if (q.type === 'collect') { const r = this.itemMaps(q.target); maps = r.maps; mons = r.mons; }
      else continue;
      if (!maps.length) continue;
      const what = q.type === 'kill' ? DB.monster[q.target]?.name : `${DB.item[q.target]?.name}（${mons.slice(0, 2).map((m) => DB.monster[m].name).join('、')}掉落）`;
      if (maps.includes(cur)) {
        const m = g.monsters.filter((o: Monster) => !o.dead && mons.includes(o.def.id)).sort((a, b) => Math.hypot(a.x - g.player.x, a.y - g.player.y) - Math.hypot(b.x - g.player.x, b.y - g.player.y))[0];
        return { text: `進行中「${q.name}」：${q.type === 'kill' ? '擊敗' : '收集'} ${what}`, sub: '就在這張地圖', x: m?.x ?? g.player.x, y: m?.y ?? g.player.y, arrow: !!m };
      }
      const routes = maps.map((mp) => this.route(cur, mp)).filter((r): r is string[] => !!r).sort((a, b) => a.length - b.length);
      if (routes[0]) { const h = this.hop(routes[0][routes[0].length - 1]); return { text: `進行中「${q.name}」：去 ${this.mapName(routes[0][routes[0].length - 1])} ${q.type === 'kill' ? '擊敗' : '收集'} ${what}`, sub: '路線：' + this.routeText(routes[0]), x: h?.x ?? 0, y: h?.y ?? 0, arrow: !!h }; }
    }
    // 沒有進行中任務：建議下一個可接的
    const avail = QUESTS.filter((q) => qs.canAccept(q)).sort((a, b) => (a.reqLv || 0) - (b.reqLv || 0));
    if (avail[0]) return toNpc(avail[0], '可接');
    // 還沒解鎖：下一個等級門檻
    const locked = QUESTS.filter((q) => !qs.s[q.id] && (!q.prev || qs.isDone(q.prev)) && (q.reqLv || 0) > g.player.ch.baseLv && !q.trial).sort((a, b) => (a.reqLv || 0) - (b.reqLv || 0))[0];
    const mw = g.story.target();
    if (mw?.wait && (!locked || mw.wait <= (locked.reqLv || 0))) return { text: mw.text, sub: '先去練功吧', x: 0, y: 0, arrow: false, main: true };
    if (locked) return { text: `下一個任務：Lv${locked.reqLv} 解鎖「${locked.name}」（${DB.npc[locked.npc]?.name}）`, sub: '先去練功吧', x: 0, y: 0, arrow: false };
    return null;
  }
  /** 取得（快取的）引導目標；任務／等級／地圖改變或過一小段時間才重算 */
  get(dt = 0): GuideTarget | null {
    const g = this.g, key = `${g.map.def.id}|${g.player.ch.baseLv}|${JSON.stringify(g.quests.s)}|${g.inv.items.length}|${JSON.stringify(g.flags.story || '')}`;
    this.t += dt;
    if (key !== this.key || this.t > 0.6) { this.key = key; this.t = 0; this.cache = this.compute(); }
    return this.cache;
  }
}
