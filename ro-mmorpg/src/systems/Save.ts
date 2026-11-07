import type { Game } from '../core/Game';
import { DB } from '../data';

export const SAVE_KEY = 'rom.save', BAK_KEY = 'rom.save.bak';
/** 目前存檔版本；改存檔格式時 +1 並在 migrations 補一個升級函式 */
export const SAVE_V = 3;
type Data = Record<string, any>;
/** migrations[v]：把第 v 版的資料升到 v+1 */
export const migrations: Record<number, (d: Data) => Data> = {
  // v1 → v2：v1 沒有快捷列與造訪紀錄
  1: (d) => ({ ...d, hotbar: d.hotbar || [{ type: 'item', id: 'red_potion' }, null, null, null, null, null, null, null, null], flags: { visited: {}, ...(d.flags || {}) } }),
  // v2 → v3：儲存點從字串改成物件，新增 MVP 計時
  2: (d) => ({ ...d, savePoint: typeof d.savePoint === 'string' ? { map: d.savePoint, x: 25, y: 30 } : d.savePoint || { map: 'aurora', x: 25, y: 30 }, mvp: d.mvp || {} }),
};
/** FNV-1a 校驗碼：偵測存檔被截斷或手動改壞 */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}
export function pack(data: Data): string {
  const body = JSON.stringify(data);
  return JSON.stringify({ v: SAVE_V, t: Date.now(), sum: checksum(body), data: body });
}
/** 解析＋驗證＋遷移；失敗回傳 null */
export function unpack(raw: string | null): Data | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (typeof o !== 'object' || typeof o.data !== 'string' || typeof o.v !== 'number') return null;
    if (checksum(o.data) !== o.sum) return null;
    let d = JSON.parse(o.data);
    let v = o.v;
    if (v > SAVE_V) return null;
    while (v < SAVE_V) { const m = migrations[v]; if (!m) return null; d = m(d); v++; }
    if (!d.ch || !d.ch.job || !DB.job[d.ch.job]) return null;
    return d;
  } catch { return null; }
}

/** localStorage 存檔：版本號、遷移、校驗碼、寫入前把上一份好的存檔備份 */
export class Save {
  private soonT = -1; private autoT = 0;
  loadedFrom: 'main' | 'backup' | 'new' = 'new';
  constructor(private g: Game) {}
  snapshot(): Data {
    const g = this.g, p = g.player;
    return {
      ch: p.ch, hp: Math.ceil(p.hp), sp: Math.ceil(p.sp), inv: g.inv.toJSON(), hotbar: g.hotbar,
      map: g.map.def.id, x: Math.floor(p.x), y: Math.floor(p.y), savePoint: g.savePoint,
      quests: g.quests.s, flags: g.flags, mvp: g.spawner.mvp, audio: g.audio?.vol || null,
    };
  }
  save(manual = false) {
    try {
      const prev = localStorage.getItem(SAVE_KEY);
      if (prev && unpack(prev)) localStorage.setItem(BAK_KEY, prev); // 只備份「驗證通過」的舊存檔
      localStorage.setItem(SAVE_KEY, pack(this.snapshot()));
      if (manual) this.g.msg('已存檔。', 'sys');
    } catch (e) { if (manual) this.g.msg('存檔失敗（瀏覽器儲存空間不可用）。', 'warn'); }
  }
  saveSoon() { this.soonT = 1; }
  update(dt: number) {
    if (this.soonT > 0) { this.soonT -= dt; if (this.soonT <= 0) { this.soonT = -1; this.save(); } }
    this.autoT += dt; if (this.autoT >= 30) { this.autoT = 0; this.save(); }
  }
  /** 讀取：主存檔壞了就用備份 */
  read(): Data | null {
    let main: string | null = null, bak: string | null = null;
    try { main = localStorage.getItem(SAVE_KEY); bak = localStorage.getItem(BAK_KEY); } catch { return null; }
    const d = unpack(main);
    if (d) { this.loadedFrom = 'main'; return d; }
    const b = unpack(bak);
    if (b) { this.loadedFrom = 'backup'; console.warn('主存檔損壞，已改用備份'); return b; }
    return null;
  }
  hasSave() { return !!this.read(); }
  apply(d: Data) {
    const g = this.g, p = g.player;
    p.ch = { ...p.ch, ...d.ch, stats: { ...p.ch.stats, ...d.ch.stats }, skills: { ...(d.ch.skills || {}) } };
    g.inv.load(d.inv || { items: [], equip: {} });
    g.hotbar = (d.hotbar || []).slice(0, 9); while (g.hotbar.length < 9) g.hotbar.push(null);
    g.savePoint = d.savePoint || g.savePoint;
    g.quests.s = d.quests || {};
    g.flags = { visited: {}, ...(d.flags || {}) };
    g.spawner.init(d.mvp);
    if (d.audio && g.audio) g.audio.loadVol(d.audio);
    p.recalc(); p.refreshLook();
    p.hp = Math.max(1, Math.min(p.maxHp, d.hp ?? p.maxHp)); p.sp = Math.min(p.maxSp, d.sp ?? p.maxSp);
    return { map: DB.map[d.map] ? d.map : 'aurora', x: d.x, y: d.y };
  }
  reset() { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(BAK_KEY); } catch { /* */ } location.reload(); }
}
